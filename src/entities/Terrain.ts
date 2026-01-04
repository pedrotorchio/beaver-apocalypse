import { throwError } from "../general/errors";
import { CoreModules } from "../core/GameInitializer";

export interface TerrainOptions {
  width: number;
  height: number;
  core: CoreModules;
}

/**
 * Manages destructible terrain using a canvas-based bitmap representation.
 *
 * This class is responsible for:
 * - Generating initial terrain geometry (hills, valleys, surface layer)
 * - Maintaining a canvas bitmap representing solid (terrain) and empty (air) areas
 * - Detecting whether a given point is solid using pixel sampling
 * - Destroying terrain in circular areas (for explosion effects)
 * - Rendering the terrain to the main game canvas
 *
 * The Terrain uses a canvas-based approach where solid terrain is represented
 * by opaque pixels and air is represented by transparent pixels. This allows
 * for pixel-perfect collision detection and dynamic terrain destruction.
 * All entities (Beavers, Projectiles) query this class to determine if
 * their position intersects with solid terrain.
 */
export class Terrain {
  private options: TerrainOptions;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(options: TerrainOptions) {
    this.options = options;
    this.canvas = document.createElement("canvas");
    this.canvas.width = options.width;
    this.canvas.height = options.height;
    this.ctx =
      this.canvas.getContext("2d") ?? throwError("Failed to get 2d context for terrain canvas");
    this.generateDefaultTerrain();
  }

  private generateDefaultTerrain(): void {
    // Clear canvas (transparent = air, not solid)
    this.ctx.clearRect(0, 0, this.options.width, this.options.height);

    // Draw solid terrain: everything below the surface curve is solid
    const baseGroundY = this.options.height * 0.7;

    // Generate surface curve points
    const surfaceY: number[] = [];
    for (let x = 0; x <= this.options.width; x += 2) {
      surfaceY.push(baseGroundY + Math.sin(x / 100) * 30 + Math.cos(x / 150) * 15);
    }

    // Brown terrain body (everything below surface)
    this.ctx.fillStyle = "#8B4513";
    this.ctx.beginPath();
    this.ctx.moveTo(0, surfaceY[0]);
    for (let i = 0; i < surfaceY.length; i++) {
      this.ctx.lineTo(i * 2, surfaceY[i]);
    }
    this.ctx.lineTo(this.options.width, this.options.height);
    this.ctx.lineTo(0, this.options.height);
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
    if (x < 0 || x >= this.options.width || y < 0 || y >= this.options.height) {
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
    return this.options.width;
  }

  getHeight(): number {
    return this.options.height;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}
