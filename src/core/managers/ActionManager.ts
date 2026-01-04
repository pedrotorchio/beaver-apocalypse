import { InputManager } from "./InputManager";
import { Beaver } from "../../entities/Beaver";
import { Aim } from "../../entities/Aim";

export interface ActionManagerOptions {
  inputManager: InputManager;
}

/**
 * Processes player input and translates it into beaver actions.
 *
 * This class is responsible for:
 * - Reading input state from InputManager and applying it to beavers
 * - Translating movement keys (A/D/W) into beaver movement commands (walk, jump)
 * - Converting aiming keys (arrow keys) into aim angle adjustments
 * - Determining whether the weapon is currently charging
 * - Detecting when the weapon should fire (spacebar release)
 *
 * The ActionManager acts as the bridge between raw input state and game actions.
 * It interprets input in the context of the current beaver's state and applies
 * the appropriate movement, aiming, and firing commands. This class does not
 * handle input event listening (that's InputManager's responsibility).
 */
export class ActionManager {
  private options: ActionManagerOptions;

  constructor(options: ActionManagerOptions) {
    this.options = options;
  }

  processInput(beaver: Beaver): void {
    if (!beaver.isAlive()) {
      return;
    }

    const input = this.options.inputManager.getState();
    const aim = beaver.getAim();

    // Movement
    if (input.moveLeft) {
      beaver.walk(-1);
    }
    if (input.moveRight) {
      beaver.walk(1);
    }
    if (input.jump) {
      beaver.jump();
    }

    // Aiming: arrow keys adjust the aim angle
    // The angle is stored relative to "facing right" (0 = forward/right) and will be transformed when facing left
    // Angle convention: 0 = right, PI/2 = down, -PI/2 = up, PI = left
    const angleStep = 0.05;

    // Adjust angle based on arrow key inputs
    // Left/Up: decrease angle (rotate counter-clockwise / aim higher)
    // Right/Down: increase angle (rotate clockwise / aim lower)
    if (input.aimLeft || input.aimUp) {
      aim.adjustAngle(-angleStep);
    }
    if (input.aimRight || input.aimDown) {
      aim.adjustAngle(angleStep);
    }
  }

  isCharging(): boolean {
    return this.options.inputManager.getState().charging;
  }

  shouldFire(): boolean {
    return this.options.inputManager.consumeFire();
  }

  getInputState() {
    return this.options.inputManager.getState();
  }
}
