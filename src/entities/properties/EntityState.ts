import * as planck from "planck-js";
import { Updates } from "../../core/types/Updates.type";
import { TileSheet } from "../../general/TileSheet";

export type StateConfig = {
  /** 
   * Auto detect the state based on the current context.
   * If the function returns true, the state will be set to the current state.
   * If the function returns false, another state will be checked.
   */
  autoDetect?: () => boolean;
  /** The number of frames to wait before checking the next state. */
  frameCountCooldown?: number;
  /** If the state is permanent. Once set, state changes will no longer be auto detected. */
  persist?: boolean;
}
type Configuration<StateKey extends string> = {
  'defaultState': StateKey
  'tilesheet': TileSheet<StateKey>
  'states': Partial<Record<StateKey, StateConfig>>
};
export class EntityState<StateKey extends string> implements Updates {
  // Private properties
  #currentState: StateKey;
  get state(): StateKey {
    return this.#currentState;
  }
  setState(state: StateKey): void {
    this.#currentState = state;
    this.#stateFramesCount = 0;
  }

  #stateFramesCount: number = 0;
  readonly #config: Configuration<StateKey>;

  constructor(config: Configuration<StateKey>) {
    this.#config = config;
    this.#currentState = this.#config['defaultState'];
  }

  // Updates implementation
  update(): void {
    this.#stateFramesCount++;

    if (this.isStateLocked()) return;

    const newState = this.detectState();
    this.setState(newState);
  }

  // Public methods
  draw(ctx: CanvasRenderingContext2D, position: planck.Vec2, facing: 1 | -1) {
    this.#config.tilesheet.drawImage(ctx, this.state, position.x, position.y, facing);
  }

  // Private methods
  private detectState(): StateKey {
    const entries = Object.entries(this.#config.states) as [StateKey, StateConfig][];
    const [key] = entries.find(([, config]) => config.autoDetect?.()) ?? [];
    return key ?? this.#config.defaultState;
  }

  private isStateLocked(): boolean {
    const currentStateKey = this.state;
    const config = this.#config.states[currentStateKey];

    if (!config) return false;
    if (config.persist) return true;
    if (!config.frameCountCooldown) return false
    if (this.#stateFramesCount < config.frameCountCooldown) return true;

    return false;
  }
}