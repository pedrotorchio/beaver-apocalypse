import { InputManager } from '../managers/InputManager';
import { Beaver } from '../entities/Beaver';

export interface InputServiceOptions {
  inputManager: InputManager;
}

export class InputService {
  private inputManager: InputManager;

  constructor(options: InputServiceOptions) {
    this.inputManager = options.inputManager;
  }

  processInput(beaver: Beaver): void {
    if (!beaver.isAlive()) {
      return;
    }

    const input = this.inputManager.getState();

    // Movement
    if (input.moveLeft) {
      beaver.moveLeft();
    }
    if (input.moveRight) {
      beaver.moveRight();
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
      beaver.adjustAimAngle(-angleStep);
    }
    if (input.aimRight || input.aimDown) {
      beaver.adjustAimAngle(angleStep);
    }
  }

  isCharging(): boolean {
    return this.inputManager.getState().charging;
  }

  shouldFire(): boolean {
    return this.inputManager.consumeFire();
  }

  getInputState() {
    return this.inputManager.getState();
  }
}


