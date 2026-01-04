import { TurnManager } from './TurnManager';
import { InputManager } from '../managers/InputManager';
import { PhysicsWorld } from './PhysicsWorld';
import { Terrain } from '../terrain/Terrain';
import { Beaver } from '../entities/Beaver';
import { AimIndicatorRenderer } from '../render/AimIndicatorRenderer';
import { PowerIndicatorRenderer } from '../render/PowerIndicatorRenderer';
import { HUDRenderer } from '../render/HUDRenderer';
import { RenderService } from '../services/RenderService';
import { EntityManager } from '../managers/EntityManager';

export interface GameInitializerOptions {
  canvas: HTMLCanvasElement;
  beaverCount?: number;
}

export interface GameInitializationResult {
  turnManager: TurnManager;
  inputManager: InputManager;
  physicsWorld: PhysicsWorld;
  terrain: Terrain;
  entityManager: EntityManager;
  renderService: RenderService;
}

export class GameInitializer {
  static initialize(options: GameInitializerOptions): GameInitializationResult {
    const { canvas, beaverCount = 2 } = options;
    
    // Create core systems
    const turnManager = new TurnManager(beaverCount);
    const inputManager = new InputManager();
    const physicsWorld = new PhysicsWorld();
    const terrain = new Terrain(canvas.width, canvas.height);
    
    // Create beavers
    const beavers: Beaver[] = [];
    for (let i = 0; i < beaverCount; i++) {
      const x = canvas.width * (0.25 + i * 0.5);
      const y = canvas.height * 0.3;
      const beaver = new Beaver(
        physicsWorld.getWorld(),
        terrain,
        x,
        y
      );
      beavers.push(beaver);
    }
    
    // Create entity manager
    const entityManager = new EntityManager({
      beavers,
      projectiles: []
    });
    
    // Create renderer dependencies
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2d context');
    }
    const aimIndicator = new AimIndicatorRenderer({ ctx });
    const powerIndicator = new PowerIndicatorRenderer({ ctx });
    const hudRenderer = new HUDRenderer({ 
      ctx, 
      canvas, 
      beavers, 
      turnManager 
    });
    
    const renderService = new RenderService({
      canvas,
      aimIndicator,
      powerIndicator,
      hudRenderer
    });
    
    // Start first turn
    turnManager.startTurn();
    turnManager.beginPhysicsSettling();
    
    return {
      turnManager,
      inputManager,
      physicsWorld,
      terrain,
      entityManager,
      renderService
    };
  }
}

