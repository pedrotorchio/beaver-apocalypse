import { Beaver } from "../entities/Beaver";
import { InputManager } from "../core/managers/InputManager";
import { WeaponManager } from "../core/managers/WeaponManager";
import { PowerIndicatorRenderer } from "./PowerIndicatorRenderer";

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
    const pos = beaver.getPosition();
    const facing = beaver.getFacing();
    const aim = beaver.getAim();
    let aimAngle = aim.getAngle();
    if (facing === -1) {
      aimAngle = Math.PI - aimAngle;
    }

    const input = this.inputManager.getState();
    const power = aim.getPower();

    this.render({
      x: pos.x,
      y: pos.y,
      angle: aimAngle,
      length: input.charging ? power * 0.1 : 40,
    });

    // Render power indicator if charging
    if (input.charging) {
      this.powerIndicator.render({
        x: pos.x,
        y: pos.y - 30,
        currentPower: power,
        minPower: aim.getMinPower(),
        maxPower: aim.getMaxPower(),
      });
    }
  }

  render(options: AimIndicatorOptions): void {
    const { x, y, angle, length = 40 } = options;
    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length;

    this.ctx.strokeStyle = "#FFFF00";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(endX, endY);
    this.ctx.stroke();
  }
}
