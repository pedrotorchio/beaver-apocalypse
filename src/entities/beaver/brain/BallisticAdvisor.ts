import * as planck from "planck-js";
import type { GameModules } from "../../../core/types/GameModules.type";
import { CCWRad } from "../../../general/coordinateSystem";
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

export class BallisticAdvisor {

  constructor(private readonly game: GameModules, private readonly args: { character: Beaver, shotMemory: ShotMemory }) { }

  suggest(enemy: Beaver): ShotSuggestion {
    if (this.args.shotMemory.sampleCount === 0) return this.suggestInitialShot({ enemy });
    return this.suggestFromMemory({ enemy });
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
    const angle = CCWRad(Math.atan2(distance.y, distance.x));

    return { angle, power };
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

