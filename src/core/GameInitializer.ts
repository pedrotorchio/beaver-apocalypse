import { TurnManager } from "./managers/TurnManager";
import { InputManager } from "./managers/InputManager";
import { WeaponManager } from "./managers/WeaponManager";
import { EntityManager } from "./managers/EntityManager";
import { PhysicsWorld } from "./PhysicsWorld";
import { throwError } from "../general/errors";

export interface GameInitializerOptions {
  canvas: HTMLCanvasElement;
  beaverCount?: number;
  minPower?: number;
  maxPower?: number;
  powerAccumulationRate?: number;
}

/**
 * Container for all core game modules.
 *
 * This interface provides access to all core systems including managers,
 * physics world, and canvas context. This is what GameInitializer
 * returns and what the Game class uses to initialize all non-core modules.
 * All entities and systems receive a CoreModules instance in their constructor
 * to access any core module they require.
 */
export interface CoreModules {
  turnManager: TurnManager;
  weaponManager: WeaponManager;
  entityManager: EntityManager;
  inputManager: InputManager;
  physicsWorld: PhysicsWorld;
  canvasContext: CanvasRenderingContext2D;
}

/**
 * Static factory class responsible for initializing all core game systems.
 *
 * This class provides a centralized initialization process that:
 * - Creates and configures core game systems (managers, PhysicsWorld)
 * - Extracts canvas context from the DOM
 * - Returns only core modules that Game.ts uses to initialize all non-core systems
 *
 * Use this class to bootstrap the core systems needed for a Game instance.
 * All non-core initialization (terrain, beavers, renderers) happens in Game.ts.
 */
export class GameInitializer {
  static initialize(options: GameInitializerOptions): CoreModules {
    const {
      canvas,
      beaverCount = 2,
      minPower = 10,
      maxPower = 1000,
      powerAccumulationRate = 10,
    } = options;
    // Extract canvas context from DOM
    const canvasContext = canvas.getContext("2d", { willReadFrequently: true }) ?? throwError("Failed to get 2d context");

    // Create core systems
    const physicsWorld = new PhysicsWorld();

    // Create managers
    const turnManager = new TurnManager(beaverCount);
    const inputManager = new InputManager();
    const entityManager = new EntityManager();
    const weaponManager = new WeaponManager({
      minPower,
      maxPower,
      powerAccumulationRate,
    });

    return {
      turnManager,
      weaponManager,
      entityManager,
      inputManager,
      physicsWorld,
      canvasContext,
    };
  }
}
