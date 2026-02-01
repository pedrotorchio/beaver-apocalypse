import { EventHub, useEventHub } from "../../general/eventHub";

export type InputKey = "moveLeft" | "moveRight" | "jump" | "aimUp" | "aimDown" | "fire" | "charging" | "pause" | "stop" | "yield" | "wait";
export type InputState = Record<InputKey, boolean>
export type InputStateManager = {
  getInputState: () => InputState;
}
/**
 * Manages keyboard input state for the game.
 *
 * This class is responsible for:
 * - Tracking keyboard key states (pressed/released)
 * - Providing current input state to game systems
 * - Detecting fire events (spacebar release)
 * - Tracking charging state (spacebar held)
 *
 * The InputManager listens to keyboard events and maintains the current
 * state of all game controls. It provides methods to query input state
 * and detect specific events like firing.
 */
export class InputManager implements InputStateManager {
  private down: Set<string> = new Set();
  private up: Set<string> = new Set(); // up states only lasts for one update and gets removed after reading
  #eventHub = useEventHub<InputState>();
  get eventHub(): EventHub<InputState> {
    return this.#eventHub;
  }

  constructor() {
    window.addEventListener("keydown", (e) => this.handleKeyDown(e));
    window.addEventListener("keyup", (e) => this.handleKeyUp(e));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.repeat) return;
    this.down.add(e.key.toLowerCase());
    this.#eventHub.notify(this.getInputState(false));
  }

  private handleKeyUp(e: KeyboardEvent): void {
    if (e.repeat) return;
    this.up.add(e.key.toLowerCase());
    this.down.delete(e.key.toLowerCase());
    this.#eventHub.notify(this.getInputState(false));
  }

  getInputState(clear: boolean = true): InputState {

    const releasedState = {
      fire: this.up.has(" "),
    }
    const activeState = {
      moveLeft: this.down.has("a"),
      moveRight: this.down.has("d"),
      jump: this.down.has("w"),
      aimUp: this.down.has("arrowup"),
      aimDown: this.down.has("arrowdown"),
      charging: this.down.has(" "),
      pause: this.down.has("p"),
      stop: this.down.has("enter"),
    }
    if (clear) this.up.clear();
    return {
      ...releasedState,
      ...activeState,
      wait: false,
      yield: false,
    };
  }
}
