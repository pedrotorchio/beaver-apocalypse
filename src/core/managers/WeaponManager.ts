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
  private options: WeaponManagerOptions;
  private currentPower: number;

  constructor(options: WeaponManagerOptions) {
    this.options = options;
    this.currentPower = options.minPower;
  }

  updatePower(charging: boolean, justFired: boolean): void {
    if (charging) {
      this.currentPower = Math.min(
        this.options.maxPower,
        this.currentPower + this.options.powerAccumulationRate
      );
    } else {
      // Reset power when not charging (but don't reset if we just fired)
      if (!justFired) {
        this.currentPower = this.options.minPower;
      }
    }
  }

  getCurrentPower(): number {
    return this.currentPower;
  }

  resetPower(): void {
    this.currentPower = this.options.minPower;
  }

  calculateFireAngle(aimAngle: number, facing: number): number {
    // Adjust aim angle based on facing direction
    let fireAngle = aimAngle;
    if (facing === -1) {
      fireAngle = Math.PI - fireAngle;
    }
    return fireAngle;
  }

  calculateVelocity(fireAngle: number): { x: number; y: number } {
    return {
      x: Math.cos(fireAngle) * this.currentPower,
      y: Math.sin(fireAngle) * this.currentPower,
    };
  }

  calculateSpawnOffset(fireAngle: number, offsetDistance: number = 15): { x: number; y: number } {
    return {
      x: Math.cos(fireAngle) * offsetDistance,
      y: Math.sin(fireAngle) * offsetDistance,
    };
  }

  getPowerConfig(): { minPower: number; maxPower: number; currentPower: number } {
    return {
      minPower: this.options.minPower,
      maxPower: this.options.maxPower,
      currentPower: this.currentPower,
    };
  }
}
