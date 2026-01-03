import { TurnManager, TurnPhase } from './TurnManager';
import { PhysicsWorld } from './PhysicsWorld';
import { Terrain } from '../terrain/Terrain';
import { Beaver } from '../entities/Beaver';
import { GameLoop } from './GameLoop';
import { GameInitializer } from './GameInitializer';
import { EntityManager } from '../managers/EntityManager';
import { InputManager } from '../managers/InputManager';
import { InputService } from '../services/InputService';
import { WeaponService } from '../services/WeaponService';
import { ProjectileService } from '../services/ProjectileService';
import { PhaseService } from '../services/PhaseService';
import { RenderService } from '../services/RenderService';

export class Game {
  private canvas: HTMLCanvasElement;
  private turnManager: TurnManager;
  private physicsWorld: PhysicsWorld;
  private terrain: Terrain;
  private entityManager: EntityManager;
  private renderService: RenderService;
  private gameLoop: GameLoop;
  private inputManager: InputManager;
  
  // Services
  private inputService: InputService;
  private weaponService: WeaponService;
  private projectileService: ProjectileService;
  private phaseService: PhaseService;
  
  // Weapon configuration
  private readonly minPower: number = 10;
  private readonly maxPower: number = 1000;
  private readonly powerAccumulationRate: number = 10;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    
    // Initialize game systems
    const initResult = GameInitializer.initialize({ canvas });
    this.turnManager = initResult.turnManager;
    this.physicsWorld = initResult.physicsWorld;
    this.terrain = initResult.terrain;
    this.entityManager = initResult.entityManager;
    this.renderService = initResult.renderService;
    this.inputManager = initResult.inputManager;
    
    // Create services
    this.inputService = new InputService({
      inputManager: this.inputManager
    });
    
    this.weaponService = new WeaponService({
      minPower: this.minPower,
      maxPower: this.maxPower,
      powerAccumulationRate: this.powerAccumulationRate
    });
    
    this.projectileService = new ProjectileService({
      world: this.physicsWorld.getWorld(),
      terrain: this.terrain,
      entityManager: this.entityManager
    });
    
    this.phaseService = new PhaseService({
      turnManager: this.turnManager,
      physicsWorld: this.physicsWorld,
      getAliveBeavers: () => this.entityManager.getAliveBeavers(),
      onPowerReset: () => this.weaponService.resetPower()
    });
    
    // Create game loop
    this.gameLoop = new GameLoop({
      onUpdate: () => this.update(),
      onRender: () => this.render()
    });
  }

  start(): void {
    this.weaponService.resetPower();
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
    const currentBeaver = this.entityManager.getCurrentBeaver(currentPlayerIndex);
    
    if (phase === TurnPhase.PlayerInput && this.turnManager.canAcceptInput()) {
      if (!currentBeaver || !currentBeaver.isAlive()) {
        this.phaseService.handleDeadBeaver();
        return;
      }
      
      this.handlePlayerInput(currentBeaver);
    }
    
    // Update projectiles
    this.entityManager.updateProjectiles(this.entityManager.getBeavers());
    
    // Handle phase transitions
    this.phaseService.handlePhaseTransitions(
      this.entityManager.hasActiveProjectiles()
    );
  }

  private handlePlayerInput(beaver: Beaver): void {
    // Process input
    this.inputService.processInput(beaver);
    
    // Update power
    const justFired = this.inputService.shouldFire();
    this.weaponService.updatePower(
      this.inputService.isCharging(),
      justFired
    );
    
    // Handle firing
    if (justFired) {
      this.fireWeapon(beaver);
    }
  }

  private fireWeapon(beaver: Beaver): void {
    const beaverPos = beaver.getPosition();
    const facing = beaver.getFacing();
    const aimAngle = beaver.getAimAngle();
    
    // Calculate fire angle and velocity
    const fireAngle = this.weaponService.calculateFireAngle(aimAngle, facing);
    const velocity = this.weaponService.calculateVelocity(fireAngle);
    const offset = this.weaponService.calculateSpawnOffset(fireAngle);
    
    // Create projectile
    this.projectileService.createProjectile(
      beaverPos.x + offset.x,
      beaverPos.y + offset.y,
      velocity.x,
      velocity.y
    );
    
    this.turnManager.fireWeapon();
    this.weaponService.resetPower();
  }

  private render(): void {
    // Render game entities
    this.renderService.renderGameEntities(
      this.terrain,
      this.entityManager.getBeavers(),
      this.entityManager.getProjectiles()
    );
    
    // Draw aim indicator if in input phase
    if (this.turnManager.canAcceptInput()) {
      const currentBeaver = this.entityManager.getCurrentBeaver(
        this.turnManager.getCurrentPlayerIndex()
      );
      
      if (currentBeaver && currentBeaver.isAlive()) {
        this.renderService.renderAimIndicator(
          currentBeaver,
          this.inputManager,
          this.weaponService
        );
      }
    }
  }
}
