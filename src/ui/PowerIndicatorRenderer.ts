import type { GameModules } from "../core/GameModules.type";

export interface PowerIndicatorOptions {
  x: number;
  y: number;
  currentPower: number;
  minPower: number;
  maxPower: number;
}

/**
 * Renders the weapon power charging indicator bar.
 *
 * This class is responsible for:
 * - Drawing a power bar showing current weapon charge level
 * - Displaying a color gradient (green to yellow to red) based on power level
 * - Positioning the bar above the beaver during charging
 * - Providing visual feedback for weapon power accumulation
 *
 * The PowerIndicatorRenderer displays a horizontal bar that fills as the
 * weapon charges. The bar changes color from green (low power) through
 * yellow (medium) to red (high power) to give players visual feedback
 * about their shot strength. This renderer is only active when the weapon
 * is being charged.
 */
export class PowerIndicatorRenderer {
  constructor(private game: GameModules) {}

  render(options: PowerIndicatorOptions): void {
    const ctx = this.game.canvas;
    const { x, y, currentPower, minPower, maxPower } = options;
    const barWidth = 60;
    const barHeight = 8;
    const barX = x - barWidth / 2;
    const barY = y;

    // Calculate power percentage
    const powerRange = maxPower - minPower;
    const powerPercent = (currentPower - minPower) / powerRange;

    // Draw background
    ctx.fillStyle = "#333333";
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Draw power bar with color gradient (green to yellow to red)
    let color: string;
    if (powerPercent < 0.5) {
      // Green to yellow
      const t = powerPercent * 2;
      const r = Math.floor(0 + t * 255);
      const g = 255;
      const b = 0;
      color = `rgb(${r}, ${g}, ${b})`;
    } else {
      // Yellow to red
      const t = (powerPercent - 0.5) * 2;
      const r = 255;
      const g = Math.floor(255 - t * 255);
      const b = 0;
      color = `rgb(${r}, ${g}, ${b})`;
    }

    ctx.fillStyle = color;
    ctx.fillRect(barX, barY, barWidth * powerPercent, barHeight);

    // Draw border
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
  }
}
