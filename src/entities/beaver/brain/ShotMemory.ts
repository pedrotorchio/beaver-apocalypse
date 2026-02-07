import * as planck from "planck-js";
import type { CCWRad } from "../../../general/coordinateSystem";

export interface ShotSample {
  distance: number;
  power: number;
  angle: CCWRad;
}

export class ShotMemory {

  readonly #samples: ShotSample[] = [];
  get sampleCount(): number {
    return this.#samples.length;
  }
  constructor(private readonly maxSamples: number = 32) { }

  addSample(shooterPos: planck.Vec2, impactPos: planck.Vec2, power: number, angle: CCWRad): void {
    const delta = planck.Vec2.sub(impactPos, shooterPos);
    const distance = Math.hypot(delta.x, delta.y);
    const sample: ShotSample = { distance, power, angle };
    const index = this.findInsertIndex(distance);
    this.#samples.splice(index, 0, sample);
    if (this.#samples.length > this.maxSamples) this.#samples.pop();
  }

  getSamples(): readonly ShotSample[] {
    return this.#samples;
  }

  findNearest(targetDistance: number): {
    closest: ShotSample | null;
    lower: ShotSample | null;
    upper: ShotSample | null;
  } {
    if (!this.#samples.length) {
      return {
        closest: null,
        lower: null,
        upper: null,
      };
    }

    const index = this.findInsertIndex(targetDistance);
    const lowerIndex = index - 1;
    const upperIndex = index;

    let lower: ShotSample | null = null;
    let upper: ShotSample | null = null;

    if (lowerIndex >= 0) lower = this.#samples[lowerIndex];
    if (upperIndex < this.#samples.length) upper = this.#samples[upperIndex];

    if (!lower && !upper) {
      return {
        closest: null,
        lower: null,
        upper: null,
      };
    }

    if (!lower) {
      return {
        closest: upper,
        lower: null,
        upper,
      };
    }

    if (!upper) {
      return {
        closest: lower,
        lower,
        upper: null,
      };
    }

    const lowerDiff = Math.abs(lower.distance - targetDistance);
    const upperDiff = Math.abs(upper.distance - targetDistance);
    const closest = lowerDiff <= upperDiff ? lower : upper;

    return {
      closest,
      lower,
      upper,
    };
  }

  private findInsertIndex(distance: number): number {
    let low = 0;
    let high = this.#samples.length;

    while (low < high) {
      const mid = (low + high) >> 1;
      const midDistance = this.#samples[mid].distance;
      if (midDistance < distance) low = mid + 1;
      else high = mid;
    }

    return low;
  }
}

