export interface GameLoopOptions {
  onUpdate: () => void;
  onRender: () => void;
}

/**
 * Manages the game's main update and render loop using requestAnimationFrame.
 *
 * This class is responsible for:
 * - Starting and stopping the game loop execution
 * - Coordinating the timing of update and render callbacks
 * - Ensuring smooth frame-based execution synchronized with the browser's refresh rate
 *
 * The loop continues running until explicitly stopped, calling the update callback
 * followed by the render callback on each frame. This class does not contain game
 * logic itself, but provides the timing infrastructure for game execution.
 */
export class GameLoop {
  private options: GameLoopOptions;
  private running: boolean = false;

  constructor(options: GameLoopOptions) {
    this.options = options;
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

    this.options.onUpdate();
    this.options.onRender();

    requestAnimationFrame(() => this.loop());
  }
}
