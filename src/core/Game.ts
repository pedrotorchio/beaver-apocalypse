import { TurnManager, TurnPhase } from "./managers/TurnManager";
import { PhysicsWorld } from "./PhysicsWorld";
import { Terrain } from "../entities/Terrain";
import { Beaver } from "../entities/Beaver";
import { Aim } from "../entities/Aim";
import { GameLoop } from "./GameLoop";
import { GameInitializer, CoreModules } from "./GameInitializer";
import { WeaponManager } from "./managers/WeaponManager";
import { EntityManager } from "./managers/EntityManager";
import { InputManager } from "./managers/InputManager";
import { AimIndicatorRenderer } from "../ui/AimIndicatorRenderer";
import { PowerIndicatorRenderer } from "../ui/PowerIndicatorRenderer";
import { HUDRenderer } from "../ui/HUDRenderer";
import { ControlsRenderer } from "../ui/ControlsRenderer";
import { iterate } from "../general/utils";

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
  private controlsRenderer: ControlsRenderer;

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

    // Initialize non-core systems: terrain
    this.terrain = new Terrain({
      width: canvas.width,
      height: canvas.height,
      core,
    });

    // Initialize non-core systems: beavers
    const beaverCount = 2;
    const beavers = iterate(beaverCount, (i) => {
      const x = canvas.width * (0.25 + i * 0.5);
      const y = canvas.height * 0.3;
      const aim = new Aim({
        minPower: this.minPower,
        maxPower: this.maxPower,
        powerAccumulationRate: this.powerAccumulationRate,
        core,
      });
      return new Beaver({
        world: this.physicsWorld.getWorld(),
        terrain: this.terrain,
        aim,
        core,
        x,
        y,
      });
    });

    // Add beavers to entity manager
    beavers.forEach((b) => this.entityManager.addBeaver(b));

    // Initialize non-core systems: renderers
    this.powerIndicator = new PowerIndicatorRenderer({ ctx: this.ctx });
    this.hudRenderer = new HUDRenderer({
      ctx: this.ctx,
      canvas,
      turnManager: this.turnManager,
    });
    this.aimIndicator = new AimIndicatorRenderer({
      ctx: this.ctx,
      inputManager: this.inputManager,
      weaponService: this.weaponManager,
      powerIndicator: this.powerIndicator,
    });
    this.controlsRenderer = new ControlsRenderer({
      ctx: this.ctx,
      canvas,
      inputManager: this.inputManager,
    });

    // Create game loop (needs Game-specific callbacks)
    this.gameLoop = new GameLoop({
      onUpdate: () => this.update(),
      onRender: () => this.render(),
    });

    // Start first turn
    this.turnManager.beginPhysicsSettling();
  }

  start(): void {
    // Reset power for all beavers' aims
    for (const beaver of this.entityManager.getBeavers()) {
      beaver.getAim().resetPower();
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
  checkAndRun(phase: TurnPhase): boolean {
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

    if (this.checkAndRun(TurnPhase.PlayerInput)) return;
    if (this.checkAndRun(TurnPhase.ProjectileFlying)) return;
    if (this.checkAndRun(TurnPhase.PhysicsSettling)) return;
    if (this.checkAndRun(TurnPhase.EndTurn)) return;

    // Update projectiles
    this.entityManager.updateProjectiles(this.entityManager.getBeavers());

    // Update entities
    this.entityManager.getBeavers().forEach(beaver => beaver.update());
    this.entityManager.getProjectiles().forEach(projectile => projectile.update(this.entityManager.getBeavers()));  
  }

  private updatePlayerInputPhase(): boolean {
    const currentPlayerIndex = this.turnManager.getCurrentPlayerIndex();
    const currentBeaver = this.entityManager.getBeaver(currentPlayerIndex);
    const isCurrentBeaverDead = !currentBeaver || !currentBeaver.isAlive();

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
      beaver.getAim().resetPower();
    }

    return false;
  }

  private handlePlayerInput(beaver: Beaver): void {
    if (!beaver.isAlive()) {
      return;
    }

    const input = this.inputManager.getState();
    const aim = beaver.getAim();

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
    // The angle is stored relative to "facing right" (0 = forward/right) and will be transformed when facing left
    // Angle convention: 0 = right, PI/2 = down, -PI/2 = up, PI = left
    const angleStep = 0.05;

    // Adjust angle based on arrow key inputs
    // Left/Up: decrease angle (rotate counter-clockwise / aim higher)
    // Right/Down: increase angle (rotate clockwise / aim lower)
    if (input.aimLeft || input.aimUp) {
      aim.adjustAngle(-angleStep);
    }
    if (input.aimRight || input.aimDown) {
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
    this.terrain.render(this.ctx);

    // Draw beavers
    for (const beaver of this.entityManager.getBeavers()) {
      beaver.render(this.ctx);
    }

    // Draw projectiles
    for (const projectile of this.entityManager.getProjectiles()) {
      projectile.render(this.ctx);
    }

    // Draw HUD
    this.hudRenderer.render(this.entityManager.getBeavers());

    // Draw aim indicator if in input phase
    const currentBeaver = this.entityManager.getBeaver(this.turnManager.getCurrentPlayerIndex());
    if (currentBeaver?.isAlive() && this.turnManager.canAcceptInput()) {
      this.aimIndicator.renderForBeaver(currentBeaver);
    }

    // Draw controls indicator
    this.controlsRenderer.render();
  }
}
