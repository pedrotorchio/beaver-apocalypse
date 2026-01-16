import { Beaver } from "../entities/Beaver";
import { InputManager } from "../core/managers/InputManager";
import { WeaponManager } from "../core/managers/WeaponManager";
import { PowerIndicatorRenderer } from "./PowerIndicatorRenderer";
import * as vec from "../general/vector";

export interface AimIndicatorOptions {
  x: number;
  y: number;
  angle: number;
  length?: number;
}

export interface AimIndicatorRendererOptions {
  ctx: CanvasRenderingContext2D;
  inputManager: InputManager;
  weaponService: WeaponManager;
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
  private ctx: CanvasRenderingContext2D;
  private inputManager: InputManager;
  private weaponService: WeaponManager;
  private powerIndicator: PowerIndicatorRenderer;

  constructor(options: AimIndicatorRendererOptions) {
    this.ctx = options.ctx;
    this.inputManager = options.inputManager;
    this.weaponService = options.weaponService;
    this.powerIndicator = options.powerIndicator;
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
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(spawnPoint.x, spawnPoint.y, 5, 0, Math.PI * 2);
    this.ctx.fill();

    // Render power indicator if charging
    const input = this.inputManager.getState();
    if (input.charging) {
      this.powerIndicator.render({
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

    this.ctx.strokeStyle = "#FFFF00";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.stroke();
  }
}
