import type { GameModules } from "../core/types/GameModules.type";

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
  #radiansAngle: number = 0; // Aim angle in radians (0 = right, PI/2 = up, -PI/2 = down)
  #power: number;
  readonly #game: GameModules;
  readonly #args: AimArguments;
  /** Max aim angle in radians (≈120°). */
  static readonly MAX_ANGLE_RADIANS = 90 * Math.PI / 180;
  /** Min aim angle in radians (-90°). */
  static readonly MIN_ANGLE_RADIANS = -90 * Math.PI / 180;

  constructor(game: GameModules, args: AimArguments) {
    this.#game = game;
    this.#args = args;
    this.#power = args.minPower;
  }

  getAngle(): number {
    return this.#radiansAngle;
  }

  getPower(): number {
    return this.#power;
  }

  getMinPower(): number {
    return this.#args.minPower;
  }

  getMaxPower(): number {
    return this.#args.maxPower;
  }

  adjustAngle(delta: number): void {
    // Clamp: angle increases = up (capped by -MIN_ANGLE), decreases = down (capped by -MAX_ANGLE); limits negated vs canvas y
    this.#radiansAngle = Math.max(-Aim.MAX_ANGLE_RADIANS, Math.min(-Aim.MIN_ANGLE_RADIANS, this.#radiansAngle + delta));
  }

  angleUp(delta: number): void {
    this.adjustAngle(-delta)
  }

  angleDown(delta: number): void {
    this.adjustAngle(delta)
  }

  charge(): void {
    this.#power = Math.min(this.#args.maxPower, this.#power + this.#args.powerAccumulationRate);
  }
  resetPower(): void {
    this.#power = this.#args.minPower;
  }
  resetAngle(): void {
    this.#radiansAngle = 0;
  }
}
