import { useDevtoolsStore } from "../../devtools/store";

export interface InputState {
  moveLeft: boolean;
  moveRight: boolean;
  jump: boolean;
  aimUp: boolean;
  aimDown: boolean;
  fire: boolean;
  charging: boolean;
}

/**
 * Manages keyboard input state for the game.
 *
 * This class is responsible for:
 * - Tracking keyboard key states (pressed/released)
 * - Providing current input state to game systems
 * - Detecting fire events (spacebar press)
 * - Tracking charging state (spacebar held)
 *
 * The InputManager listens to keyboard events and maintains the current
 * state of all game controls. It provides methods to query input state
 * and detect specific events like firing.
 */
export class InputManager {
  private keys: Set<string> = new Set();
  private justFired: boolean = false;
  private wasSpacePressed: boolean = false;
  private listeners: EventTarget[] = [];
  private devtools = useDevtoolsStore();
  private controlsTab = this.devtools.addTab("controls");

  constructor() {
    window.addEventListener("keydown", (e) => this.handleKeyDown(e));
    window.addEventListener("keyup", (e) => this.handleKeyUp(e));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    e.preventDefault();
    this.keys.add(e.key.toLowerCase());
    
    // Detect fire event (spacebar just pressed)
    if (e.key.toLowerCase() === " " && !this.wasSpacePressed) {
      this.justFired = true;
      this.wasSpacePressed = true;
    }
    this.alert();
  }

  private handleKeyUp(e: KeyboardEvent): void {
    e.preventDefault();
    this.keys.delete(e.key.toLowerCase());
    
    if (e.key.toLowerCase() === " ") {
      this.wasSpacePressed = false;
    }
    this.alert();
  }

  private alert(): void {
    this.controlsTab.update("", this.getState());
    this.listeners.forEach(listener => listener.dispatchEvent(new CustomEvent("input-state-changed", { detail: this.getState() })));
  }

  addListener(listener: EventTarget): void {
    this.listeners.push(listener);
  }

  getState(): InputState {
    return {
      moveLeft: this.keys.has("a"),
      moveRight: this.keys.has("d"),
      jump: this.keys.has("w"),
      aimUp: this.keys.has("arrowup"),
      aimDown: this.keys.has("arrowdown"),
      fire: this.keys.has(" "),
      charging: this.keys.has(" "),
    };
  }

  shouldFire(): boolean {
    const fired = this.justFired;
    this.justFired = false; // Reset after reading
    return fired;
  }

  isCharging(): boolean {
    return this.keys.has(" ");
  }
}
