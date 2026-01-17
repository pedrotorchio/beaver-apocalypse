import * as planck from "planck-js";
import { DevtoolsTab, useDevtoolsStore } from "../devtools/store";
import { useObservable } from "../general/observable";

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
  private world: planck.World;
  private velocityIterations: number = 8;
  private positionIterations: number = 3;
  private timeStep: number = 1 / 60;
  private readonly devtoolsTab: DevtoolsTab;
  public readonly on = useObservable({
    isSettled: () => this.isSettled(),
  });

  constructor() {
    this.world = planck.World({
      gravity: planck.Vec2(0, 50),
    });
    this.devtoolsTab = useDevtoolsStore().addTab("Physics");
  }

  getWorld(): planck.World {
    return this.world;
  }
  
  step(): void {
    this.world.step(this.timeStep, this.velocityIterations, this.positionIterations);
  }

  isSettled(): boolean {
    const threshold = 0.5;
    const bodyList = this.world.getBodyList();
    let isSettled = true;
    for (let body = bodyList; body; body = body.getNext()) {
      const vel = body.getLinearVelocity();
      const velMagnitude = Math.hypot(vel.x, vel.y);
      if (velMagnitude > threshold) isSettled = false;
    }
    this.devtoolsTab.update('bodyCount', this.world.getBodyCount());
    this.devtoolsTab.update('isSettled', isSettled);
    this.on.notify('isSettled', 'changed');
    return isSettled;
  }

  clear(): void {
    // Clear all bodies from the world
    for (let body = this.world.getBodyList(); body; ) {
      const next = body.getNext();
      this.world.destroyBody(body);
      body = next;
    }
  }
}
