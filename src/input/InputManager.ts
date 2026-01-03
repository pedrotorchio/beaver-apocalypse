export interface InputState {
  moveLeft: boolean;
  moveRight: boolean;
  jump: boolean;
  aimLeft: boolean;
  aimRight: boolean;
  aimUp: boolean;
  aimDown: boolean;
  fire: boolean;
}

export class InputManager {
  private state: InputState = {
    moveLeft: false,
    moveRight: false,
    jump: false,
    aimLeft: false,
    aimRight: false,
    aimUp: false,
    aimDown: false,
    fire: false
  };

  private keyMap: Map<string, keyof InputState> = new Map([
    ['KeyA', 'moveLeft'],
    ['KeyD', 'moveRight'],
    ['KeyW', 'jump'],
    ['ArrowLeft', 'aimLeft'],
    ['ArrowRight', 'aimRight'],
    ['ArrowUp', 'aimUp'],
    ['ArrowDown', 'aimDown'],
    ['Space', 'fire']
  ]);

  constructor() {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const action = this.keyMap.get(event.code);
    if (action && action !== 'fire') {
      this.state[action] = true;
    } else if (action === 'fire') {
      // Fire should trigger on press, not hold
      this.state.fire = true;
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    const action = this.keyMap.get(event.code);
    if (action && action !== 'fire') {
      this.state[action] = false;
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
      fire: false
    };
  }
}

