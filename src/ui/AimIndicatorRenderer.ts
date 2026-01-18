import { Beaver } from "../entities/Beaver";
import { PowerIndicatorRenderer } from "./PowerIndicatorRenderer";
import * as vec from "../general/vector";
import type { GameModules } from "../core/GameModules.type";

export interface AimIndicatorOptions {
  x: number;
  y: number;
  angle: number;
  length?: number;
}

export interface AimIndicatorRendererArgs {
  powerIndicator: PowerIndicatorRenderer;
}

/**
 * Renders the aim indicator line showing where the beaver is aiming.
 *
 * This class is responsible for:
 * - Drawing a line from the beaver's position in the direction of aim
 * - Adjusting the line length based on weapon charging state (longer when charging)
 * - Rendering the power indicator when the weapon is charging
 * - Providing visual feedback for aim direction and power level
 *
 * The AimIndicatorRenderer displays a yellow line extending from the beaver
 * in the direction they are aiming. The line length increases when the weapon
 * is charging to indicate power level. This visual aid helps players aim
 * their shots accurately.
 */
export class AimIndicatorRenderer {
  private gameModules: GameModules;
  private args: AimIndicatorRendererArgs;

  constructor(gameModules: GameModules, args: AimIndicatorRendererArgs) {
    this.gameModules = gameModules;
    this.args = args;
  }

  /**
   * Renders the aim indicator and power indicator for a beaver.
   * This method handles all the logic for displaying aim direction and power level.
   */
  renderForBeaver(beaver: Beaver): void {
    const aim = beaver.getAim();
    const power = aim.getPower();
    const minPower = aim.getMinPower();
    const maxPower = aim.getMaxPower();
    
    // Calculate spawn point with current power
    const spawnPoint = beaver.getProjectileSpawnPoint(power);
    const pos = beaver.getPosition();

    // Interpolate color from yellow (#FFFF00) to red (#FF0000) based on power
    const powerRatio = (power - minPower) / (maxPower - minPower);
    const red = 255;
    const green = Math.round(255 * (1 - powerRatio));
    const blue = 0;
    const color = `rgb(${red}, ${green}, ${blue})`;

    // Draw circle at spawn point
    const ctx = this.gameModules.canvas;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(spawnPoint.x, spawnPoint.y, 5, 0, Math.PI * 2);
    ctx.fill();

    // Render power indicator if charging
    const input = this.gameModules.core.inputManager.getState();
    if (input.charging) {
      this.args.powerIndicator.render({
        x: pos.x,
        y: pos.y - 30,
        currentPower: power,
        minPower: minPower,
        maxPower: maxPower,
      });
    }
  }

  render(options: AimIndicatorOptions): void {
    const { x, y, angle, length = 40 } = options;
    const direction = vec.fromAngle(angle);
    const offset = vec.scale(direction, length);
    const end = { x: x + offset.x, y: y + offset.y };

    const ctx = this.gameModules.canvas;
    ctx.strokeStyle = "#FFFF00";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }
}
