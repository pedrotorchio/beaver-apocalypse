import { TurnManager, TurnPhase } from "./managers/TurnManager";
import { PhysicsWorld } from "./PhysicsWorld";
import { Terrain } from "../entities/Terrain";
import { Beaver } from "../entities/beaver/Beaver";
import type { GameModules } from "./types/GameModules.type";
import { Aim } from "../entities/Aim";
import { GameLoop } from "./GameLoop";
import { GameInitializer, CoreModules } from "./GameInitializer";
import { WeaponManager } from "./managers/WeaponManager";
import { EntityManager } from "./managers/EntityManager";
import { InputManager } from "./managers/InputManager";
import { AimIndicatorRenderer } from "../ui/AimIndicatorRenderer";
import { PowerIndicatorRenderer } from "../ui/PowerIndicatorRenderer";
import { HUDRenderer } from "../ui/HUDRenderer";
import { initDevtools } from "../devtools/index";
import { iterate } from "../general/utils";
import { AssetLoader } from "../general/AssetLoader";
import beaverSpriteUrl from "../assets/beaver1_sprites.png";
import smallRockUrl from "../assets/small_rock.png";

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
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private turnManager: TurnManager;
  private physicsWorld: PhysicsWorld;
  private terrain: Terrain;
  private entityManager: EntityManager;
  private gameLoop: GameLoop;
  private inputManager: InputManager;

  // Renderers
  private aimIndicator: AimIndicatorRenderer;
  private hudRenderer: HUDRenderer;
  private powerIndicator: PowerIndicatorRenderer;

  // Managers
  private weaponManager: WeaponManager;

  // Weapon configuration
  private readonly minPower: number = 10;
  private readonly maxPower: number = 1000;
  private readonly powerAccumulationRate: number = 10;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // Initialize core systems
    const core: CoreModules = GameInitializer.initialize({
      canvas,
      minPower: this.minPower,
      maxPower: this.maxPower,
      powerAccumulationRate: this.powerAccumulationRate,
    });

    // Extract core modules
    this.physicsWorld = core.physicsWorld;
    this.ctx = core.canvasContext;

    // Extract managers
    this.turnManager = core.turnManager;
    this.entityManager = core.entityManager;
    this.inputManager = core.inputManager;
    this.weaponManager = core.weaponManager;

    // Load assets
    AssetLoader.loadImage("beaver1_sprites", beaverSpriteUrl);
    AssetLoader.loadImage("small_rock", smallRockUrl);
    // Create base game modules for terrain and renderers (without terrain reference)
    const baseModules: Omit<GameModules, 'terrain'> = {
      world: this.physicsWorld.getWorld(), // Will be set after terrain creation
      core,
      canvas: this.ctx,
    };

    // Initialize non-core systems: terrain
    this.terrain = new Terrain(baseModules);

    // Update base modules with terrain reference
    const gameModules: GameModules = {
      ...baseModules,
      terrain: this.terrain,
    };

    // Initialize non-core systems: beavers
    const beaverCount = 2;
    const beavers = iterate(beaverCount, (i) => {
      const x = canvas.width * (0.25 + i * 0.5);
      const y = canvas.height * 0.3;
      const aim = new Aim(gameModules, {
        minPower: this.minPower,
        maxPower: this.maxPower,
        powerAccumulationRate: this.powerAccumulationRate,
      });
      return new Beaver(`Beaver ${i + 1}`, gameModules, {
        x,
        y,
        aim,
      });
    });

    // Add beavers to entity manager
    beavers.forEach((b) => this.entityManager.addBeaver(b));

    // Initialize non-core systems: renderers
    this.powerIndicator = new PowerIndicatorRenderer(gameModules);
    this.hudRenderer = new HUDRenderer(gameModules);
    this.aimIndicator = new AimIndicatorRenderer(gameModules, {
      powerIndicator: this.powerIndicator,
    });

    // Initialize Vue devtools/controls UI
    initDevtools(core);

    // Create game loop (needs Game-specific callbacks)
    this.gameLoop = new GameLoop({
      onUpdate: () => this.update(),
      onRender: () => this.render(),
    });
    this.inputManager.addListener((state) => {
      if (state.pause && this.gameLoop.isRunning) this.gameLoop.stop();
      else if (state.pause && !this.gameLoop.isRunning) this.gameLoop.start();
    });

    // Start first turn
    this.turnManager.beginPhysicsSettling();
  }

  async start(): Promise<void> {
    // Wait for all assets to load before starting the game
    await AssetLoader.areAllAssetsLoaded();
    // Reset power for all beavers' aims
    for (const beaver of this.entityManager.getBeavers()) {
      beaver.aim.resetPower();
    }
    this.gameLoop.start();
  }

  stop(): void {
    this.gameLoop.stop();
  }

  // Handle turn logic based on current phase
  private phaseUpdateMap: Record<TurnPhase, () => boolean> = {
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
    return this.turnManager.checkPhase(phase) && this.phaseUpdateMap[phase]();
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
    this.physicsWorld.step();
    
    // Update entities
    this.entityManager.getBeavers().forEach(beaver => beaver.update());
    this.entityManager.updateProjectiles(this.entityManager.getBeavers());  

    if (this.checkAndRun(TurnPhase.PlayerInput)) return;
    if (this.checkAndRun(TurnPhase.ProjectileFlying)) return;
    if (this.checkAndRun(TurnPhase.PhysicsSettling)) return;
    if (this.checkAndRun(TurnPhase.EndTurn)) return;


    
  }

  private updatePlayerInputPhase(): boolean {
    const currentPlayerIndex = this.turnManager.getCurrentPlayerIndex();
    const currentBeaver = this.entityManager.getBeaver(currentPlayerIndex);
    const isCurrentBeaverDead = !currentBeaver || !currentBeaver.health.isAlive();

    // Handle dead beaver: end turn and start next turn
    if (isCurrentBeaverDead) {
      this.turnManager.endTurn();
      this.turnManager.startTurn();
      return true;
    }

    // Handle player input
    if (currentBeaver && this.turnManager.checkPhase(TurnPhase.PlayerInput)) {
      this.handlePlayerInput(currentBeaver);
    }

    return false;
  }

  private updateProjectileFlyingPhase(): boolean {
    const hasActiveProjectiles = this.entityManager.hasActiveProjectiles();

    // Check if projectile phase is complete
    if (!hasActiveProjectiles) {
      this.turnManager.beginPhysicsSettling();
    }

    return false;
  }

  private updatePhysicsSettlingPhase(): boolean {
    // If the physics are still settling, skip the update until it is settled
    if (!this.physicsWorld.isSettled()) return true;
    // Handle turn end: check for game over, end turn, and begin player input
    const aliveBeavers = this.entityManager.getAliveBeavers();
    if (aliveBeavers.length <= 1) alert("Beaver wins!");

    this.turnManager.endTurn();
    this.turnManager.beginPlayerInput();

    return false;
  }

  private updateEndTurnPhase(): boolean {
    // Reset power for all beavers when turn ends
    for (const beaver of this.entityManager.getBeavers()) {
      beaver.aim.resetPower();
    }

    return false;
  }

  private handlePlayerInput(beaver: Beaver): void {
    if (!beaver.health.isAlive()) {
      return;
    }

    const input = this.inputManager.getState();
    const aim = beaver.aim;

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

    // Aiming: arrow keys adjust the aim angle
    // The angle is stored relative to "facing right" (0 = fo
    // rward/right) and will be transformed when facing left
    // Angle convention: 0 = right, PI/2 = down, -PI/2 = up, PI = left
    const angleStep = 0.02;

    // Adjust angle based on arrow key inputs
    // Left/Up: decrease angle (rotate counter-clockwise / aim higher)
    // Right/Down: increase angle (rotate clockwise / aim lower)
    if (input.aimUp) {
      aim.adjustAngle(-angleStep);
    }
    if (input.aimDown) {
      aim.adjustAngle(angleStep);
    }

    // Update aim power
    const justFired = this.inputManager.shouldFire();
    aim.updatePower(this.inputManager.isCharging(), justFired);

    // Handle firing
    if (justFired) {
      const projectile = beaver.attack(aim);
      this.entityManager.addProjectile(projectile);
      this.turnManager.fireWeapon();
      aim.resetPower();
    }
  }

  /**
   * Clears the canvas and renders the game background.
   */
  private clearRender(): void {
    this.ctx.fillStyle = "#87CEEB"; // Sky blue
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private render(): void {
    // Clear canvas
    this.clearRender();

    // Draw terrain
    this.terrain.render();

    // Draw beavers
    for (const beaver of this.entityManager.getBeavers()) {
      beaver.render();
    }

    // Draw projectiles
    for (const projectile of this.entityManager.getProjectiles()) {
      projectile.render();
    }

    // Draw HUD
    this.hudRenderer.render();

    // Draw aim indicator if in input phase
    this.aimIndicator.render();

  }
}
