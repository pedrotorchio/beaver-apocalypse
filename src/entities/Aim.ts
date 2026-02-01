import { DIRECTION_RIGHT, Direction } from "../core/types/Entity.type";
import type { GameModules } from "../core/types/GameModules.type";
import { CCWRad, RelativeRad, relativerad2ccwrad } from "../general/coordinateSystem";

export interface AimArguments {
  minPower: number;
  maxPower: number;
  powerAccumulationRate: number;
}

/** Max aim angle in radians (≈90°). */
const MAX_ANGLE_RADIANS = RelativeRad(90 * Math.PI / 180, DIRECTION_RIGHT);
/** Min aim angle in radians (-90°). */
const MIN_ANGLE_RADIANS = RelativeRad(-90 * Math.PI / 180, DIRECTION_RIGHT);
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
  #maxAngle: RelativeRad = MAX_ANGLE_RADIANS;
  #minAngle: RelativeRad = MIN_ANGLE_RADIANS;

  #angle = RelativeRad(0, DIRECTION_RIGHT); // Aim angle (0 = right, π/2 = up, -π/2 = down)
  set facing(facing: Direction) {
    if (facing === this.#angle.facing) return;
    this.#angle.facing = facing;
    this.#maxAngle.facing = facing;
    this.#minAngle.facing = facing;
  }
  set angle(angle: number) {
    this.#angle.angle = angle;
  }

  #power: number;
  readonly #game: GameModules;
  readonly #args: AimArguments;

  constructor(game: GameModules, args: AimArguments) {
    this.#game = game;
    this.#args = args;
    this.#power = args.minPower;
  }

  getAngle(): CCWRad {
    return relativerad2ccwrad(this.#angle);
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
    // clamp angle to min and max
    this.#angle.angle = Math.min(this.#maxAngle.angle, Math.max(this.#minAngle.angle, this.#angle.angle + delta));
  }

  angleUp(delta: number): void {
    this.adjustAngle(delta)
  }

  angleDown(delta: number): void {
    this.adjustAngle(-delta)
  }

  charge(): void {
    this.#power = Math.min(this.#args.maxPower, this.#power + this.#args.powerAccumulationRate);
  }
  resetPower(): void {
    this.#power = this.#args.minPower;
  }
  resetAngle(): void {
    this.#angle.angle = 0;
  }
}
