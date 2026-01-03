export interface PowerIndicatorOptions {
  x: number;
  y: number;
  currentPower: number;
  minPower: number;
  maxPower: number;
}

export interface PowerIndicatorRendererOptions {
  ctx: CanvasRenderingContext2D;
}

export class PowerIndicatorRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(options: PowerIndicatorRendererOptions) {
    this.ctx = options.ctx;
  }

  render(options: PowerIndicatorOptions): void {
    const { x, y, currentPower, minPower, maxPower } = options;
    const barWidth = 60;
    const barHeight = 8;
    const barX = x - barWidth / 2;
    const barY = y;
    
    // Calculate power percentage
    const powerRange = maxPower - minPower;
    const powerPercent = (currentPower - minPower) / powerRange;
    
    // Draw background
    this.ctx.fillStyle = '#333333';
    this.ctx.fillRect(barX, barY, barWidth, barHeight);
    
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
    
    this.ctx.fillStyle = color;
    this.ctx.fillRect(barX, barY, barWidth * powerPercent, barHeight);
    
    // Draw border
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(barX, barY, barWidth, barHeight);
  }
}

