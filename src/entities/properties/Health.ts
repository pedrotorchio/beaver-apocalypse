import * as planck from "planck-js";
import type { GameModules } from "../../core/types/GameModules.type";
import type { Renders } from "../../core/types/Renders.type";
import type { Updates } from "../../core/types/Updates.type";

export interface HealthArguments {
  maxHealth: number;
  radius: number;
  body: planck.Body;
  game: GameModules;
}

export class Health implements Updates, Renders {
  // Private properties
  #health: number;
  get health(): number {
    return this.#health;
  }

  readonly #maxHealth: number;
  get maxHealth(): number {
    return this.#maxHealth;
  }

  readonly #radius: number;
  readonly #body: planck.Body;
  readonly #game: GameModules;

  constructor(args: HealthArguments) {
    this.#maxHealth = args.maxHealth;
    this.#health = args.maxHealth;
    this.#radius = args.radius;
    this.#body = args.body;
    this.#game = args.game;
  }

  // Updates implementation
  update(): void {
    // Health-specific updates can be added here if needed
  }

  // Renders implementation
  render(): void {
    const pos = this.#body.getPosition();
    const pixelX = pos.x;
    const pixelY = pos.y;

    const barWidth = this.#radius * 2;
    const barHeight = 4;
    const barX = pixelX - barWidth / 2;
    const barY = pixelY - this.#radius - 8;

    this.#game.core.shapes.with({ bgColor: "#FF0000" }).rect(barX, barY, barWidth, barHeight);
    this.#game.core.shapes.with({ bgColor: "#00FF00" }).rect(barX, barY, barWidth * (this.#health / this.#maxHealth), barHeight);
  }

  // Public methods
  isAlive(): boolean {
    return this.#health > 0;
  }

  kill(): void {
    this.#health = 0;
  }

  damage(amount: number): void {
    this.#health = Math.max(0, this.#health - amount);
  }
}
