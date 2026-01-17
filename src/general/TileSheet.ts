import { Asset } from "./AssetLoader";

type SpriteDefinition<StateKey extends string = string> = {
  key: StateKey;
  x: number;
  y: number;
  width: number;
  height: number;
}
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
  states: (StateKey | SpriteDefinition<StateKey> | [key: StateKey, aliasFor: StateKey])[];
  renderHeight?: number;
  renderWidth?: number;
}

export class TileSheet<const StateKey extends string> {
  private imageAsset: Asset<HTMLImageElement>;
  private tileWidth: number;
  private tileHeight: number;
  private renderWidth: number;
  private renderHeight: number;
  private readonly tileDefinitions: Record<StateKey, SpriteDefinition<StateKey>>;

  constructor(options: TileSheetOptions<StateKey>) {
    this.imageAsset = options.image;
    this.tileWidth = options.tileWidth;
    this.tileHeight = options.tileHeight;
    this.renderWidth = options.renderWidth ?? this.tileWidth;
    this.renderHeight = options.renderHeight ?? this.tileHeight;
    this.tileDefinitions = this.resolveTileDefinitions(options.states);
  }

  private resolveTileDefinitions(states: TileSheetOptions<StateKey>['states']): Record<StateKey, SpriteDefinition<StateKey>> {
    const applyDefaultsFor = (index: number, partial: Partial<SpriteDefinition<StateKey>>) => ({
      x: index * this.tileWidth,
      y: 0,
      width: this.tileWidth,
      height: this.tileHeight,
      key: '',
      ...partial
    }) as SpriteDefinition<StateKey>;
    const set = (acc: Record<StateKey, SpriteDefinition<StateKey>>, key: StateKey, value: SpriteDefinition<StateKey>) => {
      acc[key] = value;
      return acc;
    }
    return states.reduce((acc, state, index, originalArray) => {
      if (typeof state === 'string') return set(acc, state, applyDefaultsFor(index, { key: state }));
      if (typeof state === 'object' && 'key' in state) return set(acc, state.key, applyDefaultsFor(index, state));
      if (Array.isArray(state) && acc[state[1]]) return set(acc, state[0], applyDefaultsFor(index, acc[state[1]]));
      // Postpone resolution of alias definitions until all states are resolved
      if(Array.isArray(state)) originalArray.push(state);
      
      return acc;
    }, {} as Record<StateKey, SpriteDefinition<StateKey>>);
  }

  setRenderSize(width: number, height: number): this {
    this.renderWidth = width;
    this.renderHeight = height;
    return this;
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
    direction: 1 | -1 = 1
  ): void { 
    if (!this.tileDefinitions[state]) throw new Error(`Unknown state: ${state}`);
    const definition = this.tileDefinitions[state];
    const sx = definition.x;
    const sy = definition.y;
    const sw = definition.width;
    const sh = definition.height;
    const dx = x - this.renderWidth / 2;
    const dy = y - this.renderHeight / 2;

    ctx.save();

    if (direction === -1) {
      ctx.translate(x, y);
      ctx.scale(-1, 1);
      ctx.translate(-x, -y);
    }
    try {
      ctx.drawImage(
        this.imageAsset.value,
        sx,
        sy,
        sw,
        sh,
        dx,
        dy,
        this.renderWidth,
        this.renderHeight
      );
    } catch (error) {
      console.error(error);
      ctx.strokeStyle = 'red';
      ctx.strokeRect(dx, dy, this.renderWidth, this.renderHeight);
    }


    ctx.restore();
  }
}
