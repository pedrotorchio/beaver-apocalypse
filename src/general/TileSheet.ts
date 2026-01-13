import { Asset } from "./AssetLoader";

/**
 * Utility class for rendering sprite sheets with multiple animation states.
 * 
 * This class provides:
 * - Type-safe state key mapping
 * - Automatic tile coordinate calculation
 * - Built-in sprite flipping for direction changes
 * - Configurable default render dimensions
 * 
 * The sprite sheet is assumed to be a horizontal strip of tiles.
 * Each state maps to a tile index (0-based from left to right).
 */
export interface TileSheetOptions<StateKey extends string> {
  image: Asset<HTMLImageElement>;
  tileWidth: number;
  tileHeight: number;
  states: StateKey[];
}

export class TileSheet<const StateKey extends string> {
  private imageAsset: Asset<HTMLImageElement>;
  private tileWidth: number;
  private tileHeight: number;
  private states: StateKey[];
  private renderWidth: number;
  private renderHeight: number;

  constructor(options: TileSheetOptions<StateKey>) {
    this.imageAsset = options.image;
    this.tileWidth = options.tileWidth;
    this.tileHeight = options.tileHeight;
    this.states = options.states;
    this.renderWidth = options.tileWidth
    this.renderHeight = options.tileHeight
  }

  setRenderSize(width: number, height: number): void {
    this.renderWidth = width;
    this.renderHeight = height;
  }

  /**
   * Draws a tile from the sprite sheet onto the canvas.
   * @param ctx - Canvas rendering context
   * @param state - The animation state to draw
   * @param x - X position to draw at (center of sprite)
   * @param y - Y position to draw at (center of sprite)
   * @param direction - 1 for right-facing, -1 for left-facing (flips sprite)
   */
  drawImage(
    ctx: CanvasRenderingContext2D,
    state: StateKey,
    x: number,
    y: number,
    direction: 1 | -1
  ): void { 
    const tileIndex = this.states.findIndex((s) => s === state);
    if (tileIndex === -1) throw new Error(`Unknown state: ${state}`);

    const sx = tileIndex * this.tileWidth;
    const sy = 0;
    const dx = x - this.renderWidth / 2;
    const dy = y - this.renderHeight / 2;

    ctx.save();

    if (direction === -1) {
      ctx.translate(x, y);
      ctx.scale(-1, 1);
      ctx.translate(-x, -y);
    }

    ctx.drawImage(
      this.imageAsset.value,
      sx,
      sy,
      this.tileWidth,
      this.tileHeight,
      dx,
      dy,
      this.renderWidth,
      this.renderHeight
    );

    ctx.strokeStyle = 'red';
    ctx.strokeRect(dx, dy, this.renderWidth, this.renderHeight);

    ctx.restore();
  }
}
