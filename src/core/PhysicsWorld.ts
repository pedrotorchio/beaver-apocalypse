import * as planck from "planck-js";
import { DevtoolsTab, useDevtoolsStore } from "../devtools/store";

/**
 * Wrapper class for the Planck.js physics simulation world.
 *
 * This class is responsible for:
 * - Creating and managing the Planck.js physics world instance
 * - Stepping the physics simulation forward in time
 * - Detecting when physics bodies have settled (stopped moving)
 * - Providing access to the underlying physics world for entity creation
 * - Clearing all physics bodies when needed
 *
 * All physics-based entities (Beavers, Projectiles) must be created using
 * the world instance provided by this class. The step() method must be called
 * regularly (typically each frame) to advance the simulation.
 */
export class PhysicsWorld {
  public static readonly GRAVITY = 50;
  #world: planck.World;
  #velocityIterations: number = 8;
  #positionIterations: number = 3;
  #timeStep: number = 1 / 60;
  readonly #devtoolsTab: DevtoolsTab;

  constructor() {
    this.#world = planck.World({
      gravity: planck.Vec2(0, PhysicsWorld.GRAVITY),
    });
    this.#devtoolsTab = useDevtoolsStore().addTab("Physics");
  }

  getWorld(): planck.World {
    return this.#world;
  }
  
  step(): void {
    this.#world.step(this.#timeStep, this.#velocityIterations, this.#positionIterations);
  }

  isSettled(): boolean {
    const threshold = 0.5;
    const bodyList = this.#world.getBodyList();
    let isSettled = true;
    for (let body = bodyList; body; body = body.getNext()) {
      const vel = body.getLinearVelocity();
      const velMagnitude = Math.hypot(vel.x, vel.y);
      if (velMagnitude > threshold) isSettled = false;
    }
    this.#devtoolsTab.update('bodyCount', this.#world.getBodyCount());
    this.#devtoolsTab.update('isSettled', isSettled);
    return isSettled;
  }

  clear(): void {
    // Clear all bodies from the world
    for (let body = this.#world.getBodyList(); body; ) {
      const next = body.getNext();
      this.#world.destroyBody(body);
      body = next;
    }
  }
}
