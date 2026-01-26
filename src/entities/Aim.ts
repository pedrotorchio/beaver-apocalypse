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
  #angle: number = 0; // Aim angle in radians (0 = right, PI/2 = down, -PI/2 = up)
  #power: number;
  readonly #game: GameModules;
  readonly #args: AimArguments;

  constructor(game: GameModules, args: AimArguments) {
    this.#game = game;
    this.#args = args;
    this.#power = args.minPower;
  }

  getAngle(): number {
    return this.#angle;
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
    this.#angle += delta;
    // Clamp angle to reasonable range: -2*PI/3 to 2*PI/3
    // This allows aiming from up-left to down-right when facing right
    const maxAngle = (2 * Math.PI) / 3;
    this.#angle = Math.max(-maxAngle, Math.min(maxAngle, this.#angle));
  }

  charge(): void {
    this.#power = Math.min(this.#args.maxPower, this.#power + this.#args.powerAccumulationRate);
  }
  resetPower(): void {
    this.#power = this.#args.minPower;
  }
}
