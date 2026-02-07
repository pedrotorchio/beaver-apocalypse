import * as planck from "planck-js";
import { CCWRad, mirrorRadians } from "../../general/coordinateSystem";
import * as vec from "../../general/vector";

export interface WeaponManagerOptions {
  minPower: number;
  maxPower: number;
  powerAccumulationRate: number;
}

/**
 * Manages weapon power charging and firing calculations.
 *
 * This class is responsible for:
 * - Tracking and updating weapon power based on charging state
 * - Calculating fire angle based on beaver's aim angle and facing direction
 * - Computing projectile velocity from fire angle and current power
 * - Determining projectile spawn offset from beaver position
 * - Resetting power to minimum when not charging or after firing
 * - Providing power configuration (min, max, current) for UI display
 *
 * The WeaponManager handles all weapon-related calculations. It manages
 * the power accumulation system where holding the fire button increases
 * power up to a maximum. When firing, it converts the accumulated power
 * and aim angle into projectile trajectory parameters.
 */
export class WeaponManager {
  #options: WeaponManagerOptions;
  #currentPower: number;

  constructor(options: WeaponManagerOptions) {
    this.#options = options;
    this.#currentPower = options.minPower;
  }

  updatePower(charging: boolean, justFired: boolean): void {
    if (charging) {
      this.#currentPower = Math.min(
        this.#options.maxPower,
        this.#currentPower + this.#options.powerAccumulationRate
      );
    } else {
      if (!justFired) {
        this.#currentPower = this.#options.minPower;
      }
    }
  }

  getCurrentPower(): number {
    return this.#currentPower;
  }

  resetPower(): void {
    this.#currentPower = this.#options.minPower;
  }

  calculateFireAngle(aimAngle: CCWRad, facing: number): CCWRad {
    return facing === -1 ? CCWRad(mirrorRadians(aimAngle)) : aimAngle;
  }

  calculateVelocity(fireAngle: CCWRad): { x: number; y: number } {
    const direction = vec.fromAngle(fireAngle);
    const velocity = planck.Vec2.mul(planck.Vec2(direction.x, direction.y), this.#currentPower);
    return { x: velocity.x, y: velocity.y };
  }

  calculateSpawnOffset(fireAngle: CCWRad, offsetDistance: number = 15): { x: number; y: number } {
    const direction = vec.fromAngle(fireAngle);
    const offset = planck.Vec2.mul(planck.Vec2(direction.x, direction.y), offsetDistance);
    return { x: offset.x, y: offset.y };
  }

  getPowerConfig(): { minPower: number; maxPower: number; currentPower: number } {
    return {
      minPower: this.#options.minPower,
      maxPower: this.#options.maxPower,
      currentPower: this.#currentPower,
    };
  }
}
