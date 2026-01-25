import { Updates } from "../../core/types/Updates.type";

export const DEFAULT_STATE = Symbol('ENTITY_DEFAULT_STATE');
export type StateConfig = {
  autoDetect?: () => boolean;
  frameCountCooldown?: number;
  persist?: boolean;
}
type StateKey<T extends Configuration> = string & Exclude<keyof T, typeof DEFAULT_STATE> | (T extends { [DEFAULT_STATE]: infer U } ? U : never);
type Configuration = Record<string, StateConfig> & { [DEFAULT_STATE]: string };

export class EntityState<const Config extends Configuration> implements Updates {

  #currentState: StateKey<Config>;
  #stateFramesCount: number = 0;
  constructor(private readonly config: Config) {
    this.#currentState = this.defaultState;
  }

  get defaultState(): StateKey<Config> {
    return this.config[DEFAULT_STATE] as StateKey<Config>;
  }
  
  getState(): StateKey<Config> {
    return this.#currentState;
  }
  setState(state: StateKey<Config>): void {
    this.#currentState = state;
    this.#stateFramesCount = 0;
  }
  
  getStateFramesCount(): number {
    return this.#stateFramesCount;
  }
  
  private detectState(): StateKey<Config> {
    for (const [stateKey, config] of Object.entries(this.config)) {
      if (config.autoDetect?.()) {
        return stateKey as StateKey<Config>;
      }
    }
    return this.defaultState;
  }

  private isStateLocked(): boolean {
    const currentStateKey = this.#currentState;
    const config = this.config[currentStateKey];
    
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