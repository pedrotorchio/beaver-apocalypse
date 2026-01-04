import { TurnManager, TurnPhase } from "./managers/TurnManager";
import { PhysicsWorld } from "./PhysicsWorld";
import { Terrain } from "../entities/Terrain";
import { Beaver } from "../entities/Beaver";
import { Aim } from "../entities/Aim";
import { GameLoop } from "./GameLoop";
import { GameInitializer, CoreModules } from "./GameInitializer";
import { ActionManager } from "./managers/ActionManager";
import { WeaponManager } from "./managers/WeaponManager";
import { PhaseManager } from "./managers/PhaseManager";
import { EntityManager } from "./managers/EntityManager";
import { InputManager } from "./managers/InputManager";
import { AimIndicatorRenderer } from "../ui/AimIndicatorRenderer";
import { PowerIndicatorRenderer } from "../ui/PowerIndicatorRenderer";
import { HUDRenderer } from "../ui/HUDRenderer";

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
  private actionManager: ActionManager;
  private weaponManager: WeaponManager;
  private phaseManager: PhaseManager;

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
    this.actionManager = core.actionManager;
    this.weaponManager = core.weaponManager;
    this.phaseManager = core.phaseManager;

    // Initialize non-core systems: terrain
    this.terrain = new Terrain({
      width: canvas.width,
      height: canvas.height,
      core,
    });

    // Initialize non-core systems: beavers
    const beavers: Beaver[] = [];
    const beaverCount = 2;

    for (let i = 0; i < beaverCount; i++) {
      const x = canvas.width * (0.25 + i * 0.5);
      const y = canvas.height * 0.3;
      const aim = new Aim({
        minPower: this.minPower,
        maxPower: this.maxPower,
        powerAccumulationRate: this.powerAccumulationRate,
        core,
      });
      beavers.push(
        new Beaver({
          world: this.physicsWorld.getWorld(),
          terrain: this.terrain,
          aim,
          core,
          x,
          y,
        })
      );
    }

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

    // Create game loop (needs Game-specific callbacks)
    this.gameLoop = new GameLoop({
      onUpdate: () => this.update(),
      onRender: () => this.render(),
    });

    // Start first turn
    this.turnManager.startTurn();
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

  private update(): void {
    // Update physics
    this.physicsWorld.step();

    // Update beavers
    for (const beaver of this.entityManager.getBeavers()) {
      beaver.update();
    }

    // Handle turn logic
    const phase = this.turnManager.getPhase();
    const currentPlayerIndex = this.turnManager.getCurrentPlayerIndex();
    const currentBeaver = this.entityManager.getBeaver(currentPlayerIndex);

    const isTakingInput = phase === TurnPhase.PlayerInput && this.turnManager.canAcceptInput();
    const hasNoLiveCurrentBeaver = !currentBeaver || !currentBeaver.isAlive();
    if (isTakingInput && hasNoLiveCurrentBeaver) {
      this.phaseManager.handleDeadBeaver();
      return;
    }

    if (currentBeaver && isTakingInput) {
      this.handlePlayerInput(currentBeaver);
    }

    // Update projectiles
    this.entityManager.updateProjectiles(this.entityManager.getBeavers());

    // Handle phase transitions
    this.phaseManager.handlePhaseTransitions(this.entityManager.hasActiveProjectiles());

    // Reset power for all beavers when turn ends
    if (phase === TurnPhase.EndTurn) {
      for (const beaver of this.entityManager.getBeavers()) {
        beaver.getAim().resetPower();
      }
    }
  }

  private handlePlayerInput(beaver: Beaver): void {
    // Process input (handles movement and aiming)
    this.actionManager.processInput(beaver);

    // Update aim power
    const aim = beaver.getAim();
    const justFired = this.actionManager.shouldFire();
    aim.updatePower(this.actionManager.isCharging(), justFired);

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
  }
}
