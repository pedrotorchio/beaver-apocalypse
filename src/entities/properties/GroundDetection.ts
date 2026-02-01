import { signal } from "@preact/signals";
import * as planck from "planck-js";
import { PhysicsWorld } from "../../core/PhysicsWorld";
import { GameModules } from "../../core/types/GameModules.type";
import { Renders } from "../../core/types/Renders.type";
import { Updates } from "../../core/types/Updates.type";
import { CCWRad } from "../../general/coordinateSystem";
import { iterate, makeEnumArray } from "../../general/utils";
import * as vec from "../../general/vector";
import { Vec2Like } from "../../general/vector";

export class GroundDetection implements Updates, Renders {
  // Private properties
  #isGrounded = signal(false);
  get isGrounded(): boolean {
    return this.#isGrounded.value;
  }

  readonly #velocityStopThreshold = 10;
  #groundTouchPoints: Vec2Like[] = [];
  #groundNormalDirection: planck.Vec2 = vec.ZERO();
  #collisionCheckPoints: Vec2Like[] = [];
  readonly #game: GameModules;
  readonly #body: planck.Body;
  readonly #radius: number;

  constructor(game: GameModules, body: planck.Body, radius: number) {
    this.#game = game;
    this.#body = body;
    this.#radius = radius;
  }

  // Updates implementation
  update(): void {
    this.updateCollisionCheckPoints();
    this.#groundTouchPoints = [];
    // Check if grounded by checking bottom points
    const pos = this.#body.getPosition();
    this.#isGrounded.value = false;
    this.#groundNormalDirection = vec.ZERO();
    for (const point of this.#collisionCheckPoints) {
      const isGround = point.y >= pos.y && this.checkPointTouchesGround(point);
      if (!isGround) continue;

      this.#isGrounded.value = true;
      this.#groundTouchPoints.push(point);
      const normalVector = planck.Vec2.sub(pos, planck.Vec2(point));
      this.#groundNormalDirection = planck.Vec2.add(this.#groundNormalDirection, normalVector);
    }
    const len = planck.Vec2.lengthOf(this.#groundNormalDirection);
    this.#groundNormalDirection = len < 1e-9 ? vec.ZERO() : planck.Vec2.mul(this.#groundNormalDirection, 1 / len);
    if (!this.#isGrounded.value) return;
    const velocity = this.#body.getLinearVelocity();
    const velocityInGroundNormalDirection = vec.project(velocity, this.#groundNormalDirection);
    const mass = this.#body.getMass()
    const gravity = PhysicsWorld.GRAVITY;
    const weight = gravity * mass;
    const normalForce = planck.Vec2.mul(this.#groundNormalDirection, weight);
    const newVelocity = planck.Vec2.sub(velocity, velocityInGroundNormalDirection);
    this.#body.setLinearVelocity(newVelocity);
    this.#body.applyForce(normalForce, pos);

    // Apply velocity stop threshold when grounded
    if (Math.abs(newVelocity.x) < this.#velocityStopThreshold) {
      this.#body.setLinearVelocity(planck.Vec2(0, newVelocity.y));
    }
  }

  // Renders implementation
  render(): void {
    const position = this.#body.getPosition();
    // Draw collision circle border for debugging
    this.#game.core.shapes.with({
      strokeWidth: 1,
      strokeColor: this.#isGrounded.value ? 'red' : 'grey'
    }).circle(position, this.#radius);

    for (const point of this.#collisionCheckPoints) {
      const isGrounded = this.checkPointTouchesGround(point);
      const color = isGrounded ? 'red' : 'grey';
      this.#game.core.shapes.with({ strokeColor: color, strokeWidth: 1 }).line(position, point);
    }
    this.#game.core.shapes.with({ strokeColor: "orange", strokeWidth: 1 }).arrow(position, planck.Vec2.add(position, planck.Vec2.mul(this.#groundNormalDirection, 50)));
  }

  // Private methods
  private checkPointTouchesGround(point: Vec2Like): boolean {
    return this.#game.terrain.isSolid(point.x, point.y);
  }

  private updateCollisionCheckPoints() {
    // Check multiple points around the circle, with extra points in movement direction
    // Focus on bottom half for ground collision
    // Calculate check points dynamically based on current position
    const pos = this.#body.getPosition();
    const radius = this.#radius;
    // Check bottom points only, for ground collision
    const checkPoints = makeEnumArray(iterate(13, (i) => {
      // Visit 12 points along the bottom arc (CCW: 0=right, -π/2=down, -π=left)
      const fractionOf180 = i / 12;
      const angle = CCWRad(-Math.PI * fractionOf180);
      const dir = vec.fromAngle(angle);
      const scaledDir = planck.Vec2.mul(planck.Vec2(dir.x, dir.y), radius);
      const enumValue = `${fractionOf180 * 180}deg`;
      return [enumValue, {
        x: pos.x + scaledDir.x,
        y: pos.y + scaledDir.y,
      }];
    }));
    this.#collisionCheckPoints = checkPoints;
  }
}
