import { Updates } from "../../core/types/Updates.type";

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
type Configuration<Default extends string, C extends Record<string, StateConfig>> = {
  'defaultState': Default
  'states': Partial<C>
};
type StateKey<Default extends string, C extends Record<string, StateConfig>> = Default | keyof C;

export class EntityState<Default extends string, C extends Record<string, StateConfig>> implements Updates {

  #currentState: StateKey<Default, C>;
  #stateFramesCount: number = 0;
  constructor(private readonly config: Configuration<Default, C>) {
    this.#currentState = this.defaultState;
  }

  get defaultState(): Default {
    return this.config['defaultState'];
  }

  get states(): Partial<C> {
    return this.config['states'];
  }

  getState(): StateKey<Default, C> {
    return this.#currentState;
  }
  setState(state: StateKey<Default, C>): void {
    this.#currentState = state;
    this.#stateFramesCount = 0;
  }

  getStateFramesCount(): number {
    return this.#stateFramesCount;
  }

  private detectState(): StateKey<Default, C> {
    const entries = Object.entries(this.states) as [StateKey<Default, C>, StateConfig][];
    const [key] = entries.find(([, config]) => config.autoDetect?.()) ?? [];
    return key ?? this.defaultState;
  }

  private isStateLocked(): boolean {
    const currentStateKey = this.getState();
    const config = this.states[currentStateKey];

    if (!config) return false;
    if (config.persist) return true;
    if (!config.frameCountCooldown) return false
    if (this.#stateFramesCount < config.frameCountCooldown) return true;

    return false;
  }

  update(): void {
    this.#stateFramesCount++;

    if (this.isStateLocked()) return;

    const newState = this.detectState();
    this.setState(newState);
  }
}