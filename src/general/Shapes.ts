import { CCWRad } from "./coordinateSystem";
import type { Vec2Like } from "./vector";

export class Shapes {
  #styles: {
    strokeWidth: number;
    strokeColor: string;
    bgColor?: string;
  }
  #ctx: CanvasRenderingContext2D;
  constructor(
    ctx: CanvasRenderingContext2D,
    styles?: { strokeWidth?: number; strokeColor?: string; bgColor?: string },
  ) {
    this.#ctx = ctx;
    this.#styles = Object.assign({
      strokeWidth: 1,
      strokeColor: "black",
    }, styles)
  }

  with(args: Partial<{ strokeWidth: number; strokeColor: string; bgColor?: string }>): Shapes {
    return new Shapes(
      this.#ctx,
      Object.assign({}, this.#styles, args)
    );
  }

  circle(center: Vec2Like, radius: number): void {
    this.#ctx.beginPath();
    this.#ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    if (this.#styles.bgColor) {
      this.#ctx.fillStyle = this.#styles.bgColor;
      this.#ctx.fill();
    }
    this.#ctx.strokeStyle = this.#styles.strokeColor;
    this.#ctx.lineWidth = this.#styles.strokeWidth;
    this.#ctx.stroke();
  }

  arrow(start: Vec2Like, end: Vec2Like): void {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = CCWRad(Math.atan2(dy, dx));
    const arrowLength = Math.sqrt(dx * dx + dy * dy);
    const arrowheadSize = Math.min(arrowLength * 0.2, 10);
    const arrowheadAngle = CCWRad(Math.PI / 6);

    this.#ctx.beginPath();
    this.#ctx.moveTo(start.x, start.y);
    this.#ctx.lineTo(end.x, end.y);
    this.#ctx.strokeStyle = this.#styles.strokeColor;
    this.#ctx.lineWidth = this.#styles.strokeWidth;
    this.#ctx.stroke();

    this.#ctx.beginPath();
    this.#ctx.moveTo(end.x, end.y);
    this.#ctx.lineTo(end.x - arrowheadSize * Math.cos(angle - arrowheadAngle), end.y - arrowheadSize * Math.sin(angle - arrowheadAngle));
    this.#ctx.lineTo(end.x - arrowheadSize * Math.cos(angle + arrowheadAngle), end.y - arrowheadSize * Math.sin(angle + arrowheadAngle));
    this.#ctx.closePath();
    if (this.#styles.bgColor) {
      this.#ctx.fillStyle = this.#styles.bgColor;
      this.#ctx.fill();
    }
    this.#ctx.stroke();
  }

  // Overload for absolute coordinates: rect(x, y, width, height)
  rect(x: number, y: number, width: number, height: number): void;
  // Overload for center-based coordinates: rect(center, width, height?)
  rect(center: Vec2Like, width: number, height?: number): void;
  rect(centerOrX: Vec2Like | number, widthOrY: number, width?: number, height?: number): void {
    let x: number;
    let y: number;
    let w: number;
    let h: number;

    // Check if first argument is a number (absolute coordinates) or object (center point)
    if (typeof centerOrX === 'number') {
      // Absolute coordinates: rect(x, y, width, height)
      x = centerOrX;
      y = widthOrY;
      w = width!; // width is required for absolute coordinates
      h = height!; // height is required for absolute coordinates
    } else {
      // Center-based coordinates: rect(center, width, height?)
      const center = centerOrX;
      w = widthOrY;
      h = width ?? widthOrY; // If height not provided, use width as height (square)
      x = center.x - w / 2;
      y = center.y - h / 2;
    }

    this.#ctx.beginPath();
    this.#ctx.rect(x, y, w, h);
    if (this.#styles.bgColor) {
      this.#ctx.fillStyle = this.#styles.bgColor;
      this.#ctx.fill();
    }
    this.#ctx.strokeStyle = this.#styles.strokeColor;
    this.#ctx.lineWidth = this.#styles.strokeWidth;
    this.#ctx.stroke();
  }

  line(start: Vec2Like, end: Vec2Like): void {
    this.#ctx.beginPath();
    this.#ctx.moveTo(start.x, start.y);
    this.#ctx.lineTo(end.x, end.y);
    this.#ctx.strokeStyle = this.#styles.strokeColor;
    this.#ctx.lineWidth = this.#styles.strokeWidth;
    this.#ctx.stroke();
  }

  text(x: number, y: number, fontSize: number, content: string): void {
    this.#ctx.font = `${fontSize}px sans-serif`;
    this.#ctx.fillStyle = this.#styles.strokeColor;
    this.#ctx.fillText(content, x, y);
  }
}
