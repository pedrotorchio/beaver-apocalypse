export interface AimIndicatorOptions {
  x: number;
  y: number;
  angle: number;
  length?: number;
}

export interface AimIndicatorRendererOptions {
  ctx: CanvasRenderingContext2D;
}

export class AimIndicatorRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(options: AimIndicatorRendererOptions) {
    this.ctx = options.ctx;
  }

  render(options: AimIndicatorOptions): void {
    const { x, y, angle, length = 40 } = options;
    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length;
    
    this.ctx.strokeStyle = '#FFFF00';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(endX, endY);
    this.ctx.stroke();
  }
}

