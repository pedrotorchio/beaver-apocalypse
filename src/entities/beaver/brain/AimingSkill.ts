import * as planck from "planck-js";
import type { GameModules } from "../../../core/types/GameModules.type";
import { CCWDeg, CCWRad, RelativeRad, relativerad2ccwrad, toRadians } from "../../../general/coordinateSystem";
import type { Beaver } from "../Beaver";
import type { ShotMemory, ShotSample } from "./ShotMemory";

export interface AimConstraints {
  minPower: number;
  maxPower: number;
  minAngle: CCWRad;
  maxAngle: CCWRad;
}

export interface ShotSuggestion {
  angle: CCWRad;
  power: number;
}

/** Linearly interpolate between a and b. t=0 returns a, t=1 returns b. */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Estimate the power needed to reach targetDistance by interpolating
 * between two past shots that bracket it.
 *
 * Example: if shot A reached distance 100 with power 5, and shot B
 * reached distance 200 with power 9, then to reach 150 we estimate
 * power ≈ lerp(5, 9, 0.5) = 7.
 */
function interpolatePower(lower: ShotSample, upper: ShotSample, targetDistance: number): number {
  const distanceRange = upper.distance - lower.distance;
  if (distanceRange === 0) return lower.power;
  // t = where targetDistance falls between the two samples (0.0 to 1.0)
  const t = (targetDistance - lower.distance) / distanceRange;
  return lerp(lower.power, upper.power, t);
}

/**
 * Scale a past shot's power to reach a new distance.
 * Assumes distance is roughly proportional to power (a simplification
 * of parabolic trajectories that works for small adjustments).
 *
 * Example: if power 5 reached distance 100, then to reach 120
 * we estimate power ≈ 5 × (120 / 100) = 6.
 */
function scalePowerForDistance(samplePower: number, sampleDistance: number, targetDistance: number): number {
  if (sampleDistance <= 0) return samplePower;
  return samplePower * (targetDistance / sampleDistance);
}

export class AimingSkill {

  #BEST_GUESS_MAX_DISTANCE = 250;

  constructor(private readonly game: GameModules, private readonly args: { character: Beaver, shotMemory: ShotMemory }) { }

  aimAt(enemy: Beaver): ShotSuggestion {
    if (this.args.shotMemory.sampleCount === 0) return this.suggestInitialShot({ enemy });
    return this.suggestFromMemory({ enemy });
  }

  getRequiredApproachDistance(enemyPos: planck.Vec2): number {
    const { character, shotMemory } = this.args;
    const samples = shotMemory.getSamples();
    const minDistance = character.radius * 4;
    const hitList = samples.filter(s => s.target);
    const maxHitDistance = hitList.length > 0 ? Math.max(...hitList.map(s => s.distance)) : undefined;
    const maxAchievedDistance = Math.max(minDistance, maxHitDistance ?? this.#BEST_GUESS_MAX_DISTANCE);
    const shooterPos = character.body.getPosition();
    const delta = planck.Vec2.sub(enemyPos, shooterPos);
    const currentDistance = Math.hypot(delta.x, delta.y);

    const excessDistance = currentDistance - maxAchievedDistance;

    return excessDistance > 0 ? excessDistance : 0;
  }

  private suggestInitialShot(args: { enemy: Beaver }): ShotSuggestion {
    const { enemy } = args;
    const shooterPos = this.args.character.body.getPosition();
    const enemyPos = enemy.body.getPosition();
    const distance = planck.Vec2.distance(shooterPos, enemyPos);

    // Assume max effective range is about 20% of the map width
    const terrainWidth = this.game.terrain.getWidth();
    const maxHeuristicDistance = terrainWidth * 0.2;
    const power = this.computeHeuristicPower(distance, maxHeuristicDistance);
    const angle = this.computeAngleToEnemy(shooterPos, enemyPos);

    return { power, angle };
  }

  private suggestFromMemory(args: { enemy: Beaver }): ShotSuggestion {
    const { shotMemory } = this.args;
    const { enemy } = args;

    const shooterPos = this.args.character.body.getPosition();
    const enemyPos = enemy.body.getPosition();
    const targetDistance = planck.Vec2.distance(shooterPos, enemyPos);

    // Look up past shots that traveled a similar distance
    const { closest, lower, upper } = shotMemory.findNearest(targetDistance);
    if (!closest) return this.suggestInitialShot(args);

    // Always aim directly at the enemy with gravity compensation,
    // rather than reusing angles from past shots (positions may differ)
    const angle = this.computeAngleToEnemy(shooterPos, enemyPos);

    // Two bracketing samples available → interpolate power between them
    if (lower && upper) {
      const power = interpolatePower(lower, upper, targetDistance);
      return { power: this.clampPower(power), angle };
    }

    // Single reference sample → scale its power proportionally
    const power = scalePowerForDistance(closest.power, closest.distance, targetDistance);
    return { power: this.clampPower(power), angle };
  }

  /**
   * Compute the aim angle from shooter to enemy with gravity compensation.
   * Returns a world-space angle (CCWRad).
   */
  private computeAngleToEnemy(shooterPos: planck.Vec2, enemyPos: planck.Vec2): CCWRad {
    const delta = planck.Vec2.sub(enemyPos, shooterPos);

    // atan2(-y, x) gives the CCW angle from the +X axis to the enemy.
    // Y is negated because screen-Y points down but CCW angles point up.
    const directAngle = CCWRad(Math.atan2(-delta.y, delta.x));

    // Convert to an angle relative to the beaver's facing direction
    const relativeAngle = RelativeRad(directAngle, this.args.character.direction);

    // Add upward offset to compensate for gravity pulling the projectile down mid-flight
    const GRAVITY_OFFSET = toRadians(CCWDeg(10));
    relativeAngle.angle += GRAVITY_OFFSET;

    return relativerad2ccwrad(relativeAngle);
  }

  private clampPower(power: number): number {
    const min = this.args.character.aim.getMinPower();
    const max = this.args.character.aim.getMaxPower();
    return Math.max(min, Math.min(max, power));
  }

  private computeHeuristicPower(
    distance: number,
    maxHeuristicDistance: number,
  ): number {
    const { character } = this.args;
    const minPower = character.aim.getMinPower();
    const maxPower = character.aim.getMaxPower();

    if (distance >= maxHeuristicDistance) return maxPower;
    if (distance <= 0) return minPower;

    // Scale linearly: farther enemy → more power
    const fractionOfDistance = distance / maxHeuristicDistance;
    const range = maxPower - minPower;
    return minPower + range * fractionOfDistance;
  }
}

