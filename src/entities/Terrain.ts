import type { GameModules } from "../core/types/GameModules.type";
import type { Renders } from "../core/types/Renders.type";

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
export class Terrain implements Renders {
  #terrainCanvas: HTMLCanvasElement;
  #terrainCtx: CanvasRenderingContext2D;
  readonly #game: Omit<GameModules, 'terrain'>;

  constructor(game: Omit<GameModules, 'terrain'>) {
    this.#game = game;
    this.#terrainCanvas = document.createElement("canvas");
    const canvas = game.canvas.canvas;
    this.#terrainCanvas.width = canvas.width;
    this.#terrainCanvas.height = canvas.height;
    this.#terrainCtx = this.#terrainCanvas.getContext("2d", { willReadFrequently: true })!;
    this.generateDefaultTerrain();
  }

  get ctx(): CanvasRenderingContext2D {
    return this.#terrainCtx;
  }

  private generateDefaultTerrain(): void {
    const canvas = this.#game.canvas.canvas;
    const { width, height } = canvas;
    // Clear canvas (transparent = air, not solid)
    this.#terrainCtx.clearRect(0, 0, width, height);

    // Draw solid terrain: everything below the surface curve is solid
    const baseGroundY = height * 0.7;

    // Generate surface curve points
    const surfaceY: number[] = [];
    for (let x = 0; x <= width; x += 2) {
      surfaceY.push(baseGroundY + Math.sin(x / 100) * 30 + Math.cos(x / 150) * 15);
    }

    // Brown terrain body (everything below surface)
    this.#terrainCtx.fillStyle = "#8B4513";
    this.#terrainCtx.beginPath();
    this.#terrainCtx.moveTo(0, surfaceY[0]);
    for (let i = 0; i < surfaceY.length; i++) {
      this.#terrainCtx.lineTo(i * 2, surfaceY[i]);
    }
    this.#terrainCtx.lineTo(width, height);
    this.#terrainCtx.lineTo(0, height);
    this.#terrainCtx.closePath();
    this.#terrainCtx.fill();

    // Green surface layer (follows terrain shape, 8 pixels thick)
    this.#terrainCtx.fillStyle = "#228B22";
    this.#terrainCtx.beginPath();
    this.#terrainCtx.moveTo(0, surfaceY[0]);
    for (let i = 0; i < surfaceY.length; i++) {
      this.#terrainCtx.lineTo(i * 2, surfaceY[i]);
    }
    for (let i = surfaceY.length - 1; i >= 0; i--) {
      this.#terrainCtx.lineTo(i * 2, surfaceY[i] + 8);
    }
    this.#terrainCtx.closePath();
    this.#terrainCtx.fill();
  }

  isSolid(x: number, y: number): boolean {
    const canvas = this.#game.canvas.canvas;
    const { width, height } = canvas;
    if (x < 0 || x >= width || y < 0 || y >= height) {
      return true; // Out of bounds is solid
    }
    const imageData = this.#terrainCtx.getImageData(Math.floor(x), Math.floor(y), 1, 1);
    const alpha = imageData.data[3];
    return alpha > 128; // Consider it solid if alpha > 128
  }

  destroyCircle(centerX: number, centerY: number, radius: number): void {
    this.#terrainCtx.save();
    this.#terrainCtx.globalCompositeOperation = "destination-out";
    this.#terrainCtx.beginPath();
    this.#terrainCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    this.#terrainCtx.fill();
    this.#terrainCtx.restore();
  }

  render(): void {
    const ctx = this.#game.canvas;
    ctx.drawImage(this.#terrainCanvas, 0, 0);
  }

  getWidth(): number {
    return this.#game.canvas.canvas.width;
  }

  getHeight(): number {
    return this.#game.canvas.canvas.height;
  }
}
