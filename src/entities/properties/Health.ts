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
  private health: number;
  private readonly maxHealth: number;
  private readonly radius: number;
  private readonly body: planck.Body;
  private readonly game: GameModules;

  constructor(args: HealthArguments) {
    this.maxHealth = args.maxHealth;
    this.health = args.maxHealth;
    this.radius = args.radius;
    this.body = args.body;
    this.game = args.game;
  }

  getHealth(): number {
    return this.health;
  }

  getMaxHealth(): number {
    return this.maxHealth;
  }

  isAlive(): boolean {
    return this.health > 0;
  }

  kill(): void {
    this.health = 0;
  }

  damage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
  }

  update(): void {
    // Health-specific updates can be added here if needed
  }

  render(): void {
    const pos = this.body.getPosition();
    const pixelX = pos.x;
    const pixelY = pos.y;

    const barWidth = this.radius * 2;
    const barHeight = 4;
    const barX = pixelX - barWidth / 2;
    const barY = pixelY - this.radius - 8;

    this.game.core.shapes.with({ bgColor: "#FF0000" }).rect(barX, barY, barWidth, barHeight);
    this.game.core.shapes.with({ bgColor: "#00FF00" }).rect(barX, barY, barWidth * (this.health / this.maxHealth), barHeight);
  }
}
