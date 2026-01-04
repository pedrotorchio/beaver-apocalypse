export class Terrain {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.canvas = document.createElement("canvas");
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get 2d context for terrain canvas");
    }
    this.ctx = ctx;
    this.generateDefaultTerrain();
  }

  private generateDefaultTerrain(): void {
    // Clear canvas (transparent = air, not solid)
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Draw solid terrain: everything below the surface curve is solid
    const baseGroundY = this.height * 0.7;

    // Generate surface curve points
    const surfaceY: number[] = [];
    for (let x = 0; x <= this.width; x += 2) {
      surfaceY.push(baseGroundY + Math.sin(x / 100) * 30 + Math.cos(x / 150) * 15);
    }

    // Brown terrain body (everything below surface)
    this.ctx.fillStyle = "#8B4513";
    this.ctx.beginPath();
    this.ctx.moveTo(0, surfaceY[0]);
    for (let i = 0; i < surfaceY.length; i++) {
      this.ctx.lineTo(i * 2, surfaceY[i]);
    }
    this.ctx.lineTo(this.width, this.height);
    this.ctx.lineTo(0, this.height);
    this.ctx.closePath();
    this.ctx.fill();

    // Green surface layer (follows terrain shape, 8 pixels thick)
    this.ctx.fillStyle = "#228B22";
    this.ctx.beginPath();
    this.ctx.moveTo(0, surfaceY[0]);
    for (let i = 0; i < surfaceY.length; i++) {
      this.ctx.lineTo(i * 2, surfaceY[i]);
    }
    for (let i = surfaceY.length - 1; i >= 0; i--) {
      this.ctx.lineTo(i * 2, surfaceY[i] + 8);
    }
    this.ctx.closePath();
    this.ctx.fill();
  }

  isSolid(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return true; // Out of bounds is solid
    }
    const imageData = this.ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1);
    const alpha = imageData.data[3];
    return alpha > 128; // Consider it solid if alpha > 128
  }

  destroyCircle(centerX: number, centerY: number, radius: number): void {
    this.ctx.save();
    this.ctx.globalCompositeOperation = "destination-out";
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(this.canvas, 0, 0);
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}
