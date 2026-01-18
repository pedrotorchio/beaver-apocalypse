import type { GameModules } from "../core/GameModules.type";

export interface AimArguments {
  minPower: number;
  maxPower: number;
  powerAccumulationRate: number;
}

/**
 * Represents the aiming state of a beaver, including direction and power.
 *
 * This entity is responsible for:
 * - Storing the aim angle (direction) in radians
 * - Storing the current weapon power level
 * - Providing methods to adjust the aim angle
 * - Managing power accumulation and reset
 *
 * The Aim entity is owned by a Beaver and can be modified externally
 * through input handling. The aim angle is relative to the beaver's facing
 * direction, and power accumulates when the weapon is charging.
 */
export class Aim {
  private angle: number = 0; // Aim angle in radians (0 = right, PI/2 = down, -PI/2 = up)
  private power: number;

  constructor(private game: GameModules, private args: AimArguments) {
    this.power = args.minPower;
  }

  getAngle(): number {
    return this.angle;
  }

  getPower(): number {
    return this.power;
  }

  getMinPower(): number {
    return this.args.minPower;
  }

  getMaxPower(): number {
    return this.args.maxPower;
  }

  adjustAngle(delta: number): void {
    this.angle += delta;
    // Clamp angle to reasonable range: -2*PI/3 to 2*PI/3
    // This allows aiming from up-left to down-right when facing right
    const maxAngle = (2 * Math.PI) / 3;
    this.angle = Math.max(-maxAngle, Math.min(maxAngle, this.angle));
  }

  updatePower(charging: boolean, justFired: boolean): void {
    if (charging) {
      this.power = Math.min(this.args.maxPower, this.power + this.args.powerAccumulationRate);
    } else {
      // Reset power when not charging (but don't reset if we just fired)
      if (!justFired) {
        this.power = this.args.minPower;
      }
    }
  }

  resetPower(): void {
    this.power = this.args.minPower;
  }
}
