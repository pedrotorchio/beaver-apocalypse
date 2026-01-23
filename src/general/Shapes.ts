import type { Vec2Like } from "./vector";

export class Shapes {
  constructor(
    private ctx: CanvasRenderingContext2D,
    private strokeWidth: number = 1,
    private strokeColor: string = "black",
    private bgColor?: string
  ) {}

  with(args: { strokeWidth?: number; strokeColor?: string; bgColor?: string }): Shapes {
    return new Shapes(
      this.ctx,
      args.strokeWidth ?? this.strokeWidth,
      args.strokeColor ?? this.strokeColor,
      args.bgColor ?? this.bgColor
    );
  }

  circle(center: Vec2Like, radius: number): void {
    this.ctx.beginPath();
    this.ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    if (this.bgColor) {
      this.ctx.fillStyle = this.bgColor;
      this.ctx.fill();
    }
    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.lineWidth = this.strokeWidth;
    this.ctx.stroke();
  }

  arrow(start: Vec2Like, end: Vec2Like): void {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = Math.atan2(dy, dx);
    const arrowLength = Math.sqrt(dx * dx + dy * dy);
    const arrowheadSize = Math.min(arrowLength * 0.2, 10);
    const arrowheadAngle = Math.PI / 6;

    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.lineWidth = this.strokeWidth;
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(end.x, end.y);
    this.ctx.lineTo(end.x - arrowheadSize * Math.cos(angle - arrowheadAngle), end.y - arrowheadSize * Math.sin(angle - arrowheadAngle));
    this.ctx.lineTo(end.x - arrowheadSize * Math.cos(angle + arrowheadAngle), end.y - arrowheadSize * Math.sin(angle + arrowheadAngle));
    this.ctx.closePath();
    if (this.bgColor) {
      this.ctx.fillStyle = this.bgColor;
      this.ctx.fill();
    }
    this.ctx.stroke();
  }

  rect(center: Vec2Like, width: number, height?: number): void {
    const h = height ?? width;
    const x = center.x - width / 2;
    const y = center.y - h / 2;

    this.ctx.beginPath();
    this.ctx.rect(x, y, width, h);
    if (this.bgColor) {
      this.ctx.fillStyle = this.bgColor;
      this.ctx.fill();
    }
    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.lineWidth = this.strokeWidth;
    this.ctx.stroke();
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    if (this.bgColor) {
      this.ctx.fillStyle = this.bgColor;
      this.ctx.fillRect(x, y, width, height);
    }
  }

  line(start: Vec2Like, end: Vec2Like): void {
    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.lineWidth = this.strokeWidth;
    this.ctx.stroke();
  }
}
