import * as planck from "planck-js";
import type { GameModules } from "../../../core/types/GameModules.type";
import { CCWDeg, CCWRad, RelativeRad, relativerad2ccwrad, toRadians } from "../../../general/coordinateSystem";
import type { Beaver } from "../Beaver";
import type { ShotMemory } from "./ShotMemory";

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

export class AimingSkill {


  #BEST_GUESS_MAX_DISTANCE = 500;

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
    const { character } = this.args;
    const { enemy } = args;

    const shooterPos = character.body.getPosition();
    const enemyPos = enemy.body.getPosition();

    const distance = planck.Vec2.sub(enemyPos, shooterPos);
    const terrainWidth = this.game.terrain.getWidth();
    const maxHeuristicDistance = terrainWidth * 0.2;
    const power = this.computeHeuristicPower(distance.length(), maxHeuristicDistance);

    const angle = CCWRad(Math.atan2(-distance.y, distance.x));
    const relativeAngle = RelativeRad(angle, character.direction);
    // Add 15 degrees to combat gravity. TODO: This needs to be calculated somehow
    relativeAngle.angle += toRadians(CCWDeg(10))

    return {
      angle: relativerad2ccwrad(relativeAngle),
      power
    };
  }

  private suggestFromMemory(args: { enemy: Beaver }): ShotSuggestion {
    return this.suggestInitialShot(args);
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

    const fractionOfDistance = distance / maxHeuristicDistance;
    const range = maxPower - minPower;
    return minPower + range * fractionOfDistance;
  }
}

