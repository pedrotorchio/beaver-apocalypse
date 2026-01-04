import { onDestruct } from "../../general/destructor";

export interface InputState {
  moveLeft: boolean;
  moveRight: boolean;
  jump: boolean;
  aimLeft: boolean;
  aimRight: boolean;
  aimUp: boolean;
  aimDown: boolean;
  fire: boolean;
  charging: boolean;
}

/**
 * Manages keyboard input state and event handling.
 *
 * This class is responsible for:
 * - Listening to keyboard events (keydown/keyup) and maintaining input state
 * - Mapping keyboard codes to game actions (movement, aiming, firing)
 * - Tracking charging state (when spacebar is held down)
 * - Providing a snapshot of current input state
 * - Consuming fire events (to prevent multiple fires from a single key release)
 * - Cleaning up event listeners when the manager is destroyed
 *
 * The InputManager maintains the raw input state but does not interpret
 * what actions should be taken. Other systems (like InputService) query
 * this manager to determine what the player is currently pressing.
 */
export class InputManager {
  private state: InputState = {
    moveLeft: false,
    moveRight: false,
    jump: false,
    aimLeft: false,
    aimRight: false,
    aimUp: false,
    aimDown: false,
    fire: false,
    charging: false,
  };

  private keyMap: Map<string, keyof InputState> = new Map([
    ["KeyA", "moveLeft"],
    ["KeyD", "moveRight"],
    ["KeyW", "jump"],
    ["ArrowLeft", "aimLeft"],
    ["ArrowRight", "aimRight"],
    ["ArrowUp", "aimUp"],
    ["ArrowDown", "aimDown"],
    ["Space", "fire"],
  ]);

  constructor() {
    const keydownHandler = this.handleKeyDown.bind(this);
    const keyupHandler = this.handleKeyUp.bind(this);
    window.addEventListener("keydown", keydownHandler);
    window.addEventListener("keyup", keyupHandler);

    onDestruct(this, () => {
      window.removeEventListener("keydown", keydownHandler);
      window.removeEventListener("keyup", keyupHandler);
    });
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const action = this.keyMap.get(event.code);
    if (action && action !== "fire") {
      this.state[action] = true;
    } else if (action === "fire") {
      // Start charging when space is pressed
      this.state.charging = true;
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    const action = this.keyMap.get(event.code);
    if (action && action !== "fire") {
      this.state[action] = false;
    } else if (action === "fire") {
      // Fire when space is released
      if (this.state.charging) {
        this.state.fire = true;
        this.state.charging = false;
      }
    }
  }

  getState(): InputState {
    return { ...this.state };
  }

  consumeFire(): boolean {
    const fired = this.state.fire;
    this.state.fire = false;
    return fired;
  }

  clear(): void {
    this.state = {
      moveLeft: false,
      moveRight: false,
      jump: false,
      aimLeft: false,
      aimRight: false,
      aimUp: false,
      aimDown: false,
      fire: false,
      charging: false,
    };
  }
}
