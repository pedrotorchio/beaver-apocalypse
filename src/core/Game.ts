import beaverSpriteUrl from "../assets/beaver1_sprites.png";
import smallRockUrl from "../assets/small_rock.png";
import { initDevtools } from "../devtools/index";
import { Aim } from "../entities/Aim";
import { Terrain } from "../entities/Terrain";
import { Beaver } from "../entities/beaver/Beaver";
import flags from "../flags";
import { AssetLoader } from "../general/AssetLoader";
import { iterate } from "../general/utils";
import { AimIndicatorRenderer } from "../ui/AimIndicatorRenderer";
import { HUDRenderer } from "../ui/HUDRenderer";
import { PowerIndicatorRenderer } from "../ui/PowerIndicatorRenderer";
import { CoreModules, GameInitializer } from "./GameInitializer";
import { GameLoop } from "./GameLoop";
import { PhysicsWorld } from "./PhysicsWorld";
import { EntityManager } from "./managers/EntityManager";
import { InputManager, InputStateManager } from "./managers/InputManager";
import { TurnManager, TurnPhase } from "./managers/TurnManager";
import type { GameModules } from "./types/GameModules.type";

/**
 * Main game coordinator class responsible for orchestrating all game systems.
 *
 * This class serves as the central hub that:
 * - Initializes core systems via GameInitializer
 * - Initializes non-core systems (terrain, beavers, renderers)
 * - Coordinates the game loop (update and render cycles)
 * - Handles turn-based gameplay flow and player input processing
 * - Manages weapon firing, projectile creation, and phase transitions
 * - Delegates specific responsibilities to specialized services and managers
 *
 * The Game class should be instantiated once per game session and controls the
 * entire lifecycle from initialization through gameplay execution.
 */
export class Game {
  #canvas: HTMLCanvasElement;
  #ctx: CanvasRenderingContext2D;
  #turnManager: TurnManager;
  #physicsWorld: PhysicsWorld;
  #terrain: Terrain;
  #entityManager: EntityManager;
  #gameLoop: GameLoop;
  #inputManager: InputManager;

  #aimIndicator: AimIndicatorRenderer;
  #hudRenderer: HUDRenderer;
  #powerIndicator: PowerIndicatorRenderer;

  readonly #minPower: number = 10;
  readonly #maxPower: number = 1000;
  readonly #powerAccumulationRate: number = 10;

  constructor(canvas: HTMLCanvasElement) {
    this.#canvas = canvas;

    const core: CoreModules = GameInitializer.initialize({
      beaverCount: flags.beaverCount,
      canvas,
      minPower: this.#minPower,
      maxPower: this.#maxPower,
      powerAccumulationRate: this.#powerAccumulationRate,
    });

    this.#physicsWorld = core.physicsWorld;
    this.#ctx = core.canvasContext;

    this.#turnManager = core.turnManager;
    this.#entityManager = core.entityManager;
    this.#inputManager = core.inputManager;

    // Load assets
    AssetLoader.loadImage("beaver1_sprites", beaverSpriteUrl);
    AssetLoader.loadImage("small_rock", smallRockUrl);
    // Create base game modules for terrain and renderers (without terrain reference)
    const baseModules: Omit<GameModules, 'terrain'> = {
      world: this.#physicsWorld.getWorld(),
      core,
      canvas: this.#ctx,
    };

    this.#terrain = new Terrain(baseModules);

    const gameModules: GameModules = {
      ...baseModules,
      terrain: this.#terrain,
    };

    const beavers = iterate(flags.beaverCount, (i) => {
      const x = Math.max(100, Math.min(canvas.width - 100, canvas.width * Math.random()));
      const y = canvas.height * 0.3;
      const aim = new Aim(gameModules, {
        minPower: this.#minPower,
        maxPower: this.#maxPower,
        powerAccumulationRate: this.#powerAccumulationRate,
      });
      return new Beaver(`Beaver ${i + 1}`, gameModules, {
        x,
        y,
        aim,
        onDeath: b => this.processDeadBeaver(b),
      });
    });

    beavers.forEach((b) => this.#entityManager.addBeaver(b));

    this.#powerIndicator = new PowerIndicatorRenderer(gameModules);
    this.#hudRenderer = new HUDRenderer(gameModules);
    this.#aimIndicator = new AimIndicatorRenderer(gameModules, {
      powerIndicator: this.#powerIndicator,
    });

    initDevtools(core);

    this.#gameLoop = new GameLoop({
      onUpdate: () => this.update(),
      onRender: () => this.render(),
    });
    this.#inputManager.eventHub.addListener?.((state) => {
      if (state.pause && this.#gameLoop.isRunning) this.#gameLoop.stop();
      else if (state.pause && !this.#gameLoop.isRunning) this.#gameLoop.start();
    });

    this.#turnManager.beginPhysicsSettling();
  }

  async start(): Promise<void> {
    // Wait for all assets to load before starting the game
    await AssetLoader.areAllAssetsLoaded();
    // Reset power for all beavers' aims
    for (const beaver of this.#entityManager.getBeavers()) {
      beaver.aim.resetPower();
    }
    this.#gameLoop.start();
  }

  stop(): void {
    this.#gameLoop.stop();
  }

  // Handle turn logic based on current phase
  #phaseUpdateMap: Record<TurnPhase, () => boolean> = {
    [TurnPhase.PlayerInput]: () => this.updatePlayerInputPhase(),
    [TurnPhase.ProjectileFlying]: () => this.updateProjectileFlyingPhase(),
    [TurnPhase.PhysicsSettling]: () => this.updatePhysicsSettlingPhase(),
    [TurnPhase.EndTurn]: () => this.updateEndTurnPhase(),
  };
  /**
   * @param phase - The phase to check and run
   * @returns True if the update cycle should be skipped, false otherwise
   */
  private checkAndRun(phase: TurnPhase): boolean {
    return this.#turnManager.checkPhase(phase) && this.#phaseUpdateMap[phase]();
  }

  private update(): void {
    /**
     * Phase transitions:
     * - PlayerInput -> ProjectileFlying: When player fires weapon (fireWeapon())
     * - PlayerInput -> PlayerInput (next player): When current beaver is dead (endTurn() + startTurn())
     * - ProjectileFlying -> PhysicsSettling: When no active projectiles remain (beginPhysicsSettling())
     * - PhysicsSettling -> PlayerInput (next player): When physics has settled (endTurn() + beginPlayerInput())
     * - EndTurn: Resets power for all beavers / any other cleanup logic
     */

    // Update physics
    this.#physicsWorld.step();
    this.skipDeadBeaversTurn()

    // Update entities
    this.#entityManager.updateBeavers();
    this.#entityManager.updateProjectiles();

    if (this.checkAndRun(TurnPhase.PlayerInput)) return;
    if (this.checkAndRun(TurnPhase.ProjectileFlying)) return;
    if (this.checkAndRun(TurnPhase.PhysicsSettling)) return;
    if (this.checkAndRun(TurnPhase.EndTurn)) {
      this.#gameLoop.stop();
    };

  }

  private processDeadBeaver(beaver: Beaver): void {
    const ctx = this.#terrain.ctx;
    const position = beaver.body.getPosition();
    beaver.getTilesheet().drawImage(ctx, 'dead', position.x, position.y, beaver.direction);
    beaver.destroy();
    this.#entityManager.removeBeaver(beaver);
    this.#turnManager.playerCount--;
  }

  private getCurrentBeaver(): Beaver | null {
    const currentPlayerIndex: number = this.#turnManager.getCurrentPlayerIndex();
    const currentBeaver = this.#entityManager.getBeaver(currentPlayerIndex);
    return currentBeaver ?? null;
  }
  private skipDeadBeaversTurn() {
    const isCurrentBeaverDead = () => {
      const currentBeaver = this.getCurrentBeaver();
      return !currentBeaver || !currentBeaver.health.isAlive();
    }
    // Handle dead beaver: end turn and start next turn
    while (isCurrentBeaverDead()) {
      this.#turnManager.endTurn();
      this.#turnManager.startTurn();
    }

    if (this.#entityManager.getBeavers().getAlive().length === 0) throw new Error("No beavers left to play. This shouldn't have happened.");
  }

  private updatePlayerInputPhase(): boolean {

    const currentPlayerIndex = this.#turnManager.getCurrentPlayerIndex();
    const currentBeaver = this.#entityManager.getBeaver(currentPlayerIndex);
    if (!currentBeaver) return true;
    // Handle player input
    if (currentPlayerIndex === flags.playerIndex || flags.playerIndex === Infinity) this.handlePlayerInput(this.#inputManager, currentBeaver);
    else this.handleBrainInput(currentBeaver);
    return false;
  }

  private updateProjectileFlyingPhase(): boolean {
    const hasActiveProjectiles = this.#entityManager.hasActiveProjectiles();

    // Check if projectile phase is complete
    if (!hasActiveProjectiles) {
      this.#turnManager.beginPhysicsSettling();
    }

    return false;
  }

  private updatePhysicsSettlingPhase(): boolean {
    // Skip checking other phases until physics is settled
    if (flags.waitPhysicsSettling && !this.#physicsWorld.isSettled()) return true;
    this.#turnManager.setPhase(TurnPhase.EndTurn);
    return false;
  }

  private updateEndTurnPhase(): boolean {
    this.#turnManager.endTurn();
    this.#turnManager.beginPlayerInput();
    // Reset power for all beavers when turn ends
    for (const beaver of this.#entityManager.getBeavers()) {
      beaver.aim.resetPower();
    }

    // Handle turn end: check for game over, end turn, and begin player input
    const aliveBeavers = this.#entityManager.getBeavers().getAlive();
    if (aliveBeavers.length === 1) {
      alert(aliveBeavers.get(0)?.name + " wins!");
      return true;
    }
    if (aliveBeavers.length === 0) {
      alert("Everyone died... :(");
      return true;
    }

    return false;
  }

  private handleBrainInput(beaver: Beaver): void {
    const brain = beaver.brain;
    if (brain.isThinking) return;
    else if (brain.hasCommands) this.handlePlayerInput(brain, beaver);
    else brain.think();
  }

  private handlePlayerInput(inputManager: InputStateManager, beaver: Beaver): void {
    const aim = beaver.aim;
    const input = inputManager.getInputState();

    // Movement
    if (input.moveLeft) {
      beaver.walk(-1);
    }
    if (input.moveRight) {
      beaver.walk(1);
    }
    if (input.jump) {
      beaver.jump();
    }
    // Aiming: arrow keys adjust the aim angle (CCWRad delta)
    // The angle is stored relative to "facing right" and will be transformed when facing left.
    const angleStep = 0.02;

    if (input.aimUp) aim.angleUp(angleStep);
    if (input.aimDown) aim.angleDown(angleStep);

    if (input.charging) aim.charge();

    // Handle firing
    if (input.fire) {
      const projectile = beaver.attack(aim);
      this.#entityManager.addProjectile(projectile);
      this.#turnManager.fireWeapon();
      aim.resetAngle();
      aim.resetPower();
    }

    if (input.yield) {
      this.#turnManager.endTurn();
      this.#turnManager.startTurn();
    }
  }

  /**
   * Clears the canvas and renders the game background.
   */
  private clearRender(): void {
    this.#ctx.fillStyle = "#87CEEB"; // Sky blue
    this.#ctx.fillRect(0, 0, this.#canvas.width, this.#canvas.height);
  }

  private render(): void {
    // Clear canvas
    this.clearRender();

    // Draw terrain
    this.#terrain.render();

    // Draw beavers
    for (const beaver of this.#entityManager.getBeavers()) {
      beaver.render();
    }

    // Draw projectiles
    for (const projectile of this.#entityManager.getProjectiles()) {
      projectile.render();
    }

    // Draw HUD
    this.#hudRenderer.render();

    // Draw aim indicator if in input phase
    this.#aimIndicator.render();

  }
}
