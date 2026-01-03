import * as planck from 'planck-js';

export class PhysicsWorld {
  private world: planck.World;
  private velocityIterations: number = 8;
  private positionIterations: number = 3;
  private timeStep: number = 1 / 60;

  constructor() {
    this.world = planck.World({
      gravity: planck.Vec2(0, 50)
    });
  }

  getWorld(): planck.World {
    return this.world;
  }

  step(): void {
    this.world.step(this.timeStep, this.velocityIterations, this.positionIterations);
  }

  isSettled(threshold: number = 0.1): boolean {
    for (let body = this.world.getBodyList(); body; body = body.getNext()) {
      const vel = body.getLinearVelocity();
      if (Math.abs(vel.x) > threshold || Math.abs(vel.y) > threshold) {
        return false;
      }
    }
    return true;
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

