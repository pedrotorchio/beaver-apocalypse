export interface GameLoopOptions {
  onUpdate: () => void;
  onRender: () => void;
}

export class GameLoop {
  private running: boolean = false;
  private onUpdate: () => void;
  private onRender: () => void;

  constructor(options: GameLoopOptions) {
    this.onUpdate = options.onUpdate;
    this.onRender = options.onRender;
  }

  start(): void {
    this.running = true;
    this.loop();
  }

  stop(): void {
    this.running = false;
  }

  private loop(): void {
    if (!this.running) return;
    
    this.onUpdate();
    this.onRender();
    
    requestAnimationFrame(() => this.loop());
  }
}

