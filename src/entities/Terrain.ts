import { CoreModules } from "../core/GameInitializer";
import { throwError } from "../general/errors";

export interface TerrainOptions {
  core: CoreModules;
  canvas: HTMLCanvasElement;
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
  private terrainCanvas: HTMLCanvasElement;
  private terrainCtx: CanvasRenderingContext2D;

  constructor(options: TerrainOptions) {
    this.options = options;
    
    // Create a separate canvas for terrain
    this.terrainCanvas = document.createElement("canvas");
    this.terrainCanvas.width = options.canvas.width;
    this.terrainCanvas.height = options.canvas.height;
    this.terrainCtx =
      this.terrainCanvas.getContext("2d", { willReadFrequently: true }) ?? throwError("Failed to get 2d context for terrain canvas");
    
    this.generateDefaultTerrain();
  }

  get ctx(): CanvasRenderingContext2D {
    return this.terrainCtx;
  }

  private generateDefaultTerrain(): void {
    const { width, height } = this.options.canvas;
    // Clear canvas (transparent = air, not solid)
    this.terrainCtx.clearRect(0, 0, width, height);

    // Draw solid terrain: everything below the surface curve is solid
    const baseGroundY = height * 0.7;

    // Generate surface curve points
    const surfaceY: number[] = [];
    for (let x = 0; x <= width; x += 2) {
      surfaceY.push(baseGroundY + Math.sin(x / 100) * 30 + Math.cos(x / 150) * 15);
    }

    // Brown terrain body (everything below surface)
    this.terrainCtx.fillStyle = "#8B4513";
    this.terrainCtx.beginPath();
    this.terrainCtx.moveTo(0, surfaceY[0]);
    for (let i = 0; i < surfaceY.length; i++) {
      this.terrainCtx.lineTo(i * 2, surfaceY[i]);
    }
    this.terrainCtx.lineTo(width, height);
    this.terrainCtx.lineTo(0, height);
    this.terrainCtx.closePath();
    this.terrainCtx.fill();

    // Green surface layer (follows terrain shape, 8 pixels thick)
    this.terrainCtx.fillStyle = "#228B22";
    this.terrainCtx.beginPath();
    this.terrainCtx.moveTo(0, surfaceY[0]);
    for (let i = 0; i < surfaceY.length; i++) {
      this.terrainCtx.lineTo(i * 2, surfaceY[i]);
    }
    for (let i = surfaceY.length - 1; i >= 0; i--) {
      this.terrainCtx.lineTo(i * 2, surfaceY[i] + 8);
    }
    this.terrainCtx.closePath();
    this.terrainCtx.fill();
  }

  isSolid(x: number, y: number): boolean {
    const { width, height } = this.options.canvas;
    if (x < 0 || x >= width || y < 0 || y >= height) {
      return true; // Out of bounds is solid
    }
    const imageData = this.terrainCtx.getImageData(Math.floor(x), Math.floor(y), 1, 1);
    const alpha = imageData.data[3];
    return alpha > 0; // Consider it solid if alpha > 128
  }

  destroyCircle(centerX: number, centerY: number, radius: number): void {
    this.terrainCtx.save();
    this.terrainCtx.globalCompositeOperation = "destination-out";
    this.terrainCtx.beginPath();
    this.terrainCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    this.terrainCtx.fill();
    this.terrainCtx.restore();
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(this.terrainCanvas, 0, 0);
  }

  getWidth(): number {
    return this.options.canvas.width;
  }

  getHeight(): number {
    return this.options.canvas.height;
  }
}
