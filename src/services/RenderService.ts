import { Terrain } from '../terrain/Terrain';
import { Beaver } from '../entities/Beaver';
import { Projectile } from '../entities/Projectile';
import { TurnManager } from '../core/TurnManager';
import { AimIndicatorRenderer } from '../render/AimIndicatorRenderer';
import { PowerIndicatorRenderer } from '../render/PowerIndicatorRenderer';
import { HUDRenderer } from '../render/HUDRenderer';
import { InputManager } from '../managers/InputManager';
import { WeaponService } from './WeaponService';

export interface RenderServiceOptions {
  canvas: HTMLCanvasElement;
  aimIndicator: AimIndicatorRenderer;
  powerIndicator: PowerIndicatorRenderer;
  hudRenderer: HUDRenderer;
}

export class RenderService {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public readonly aimIndicator: AimIndicatorRenderer;
  public readonly powerIndicator: PowerIndicatorRenderer;
  private hudRenderer: HUDRenderer;

  constructor(options: RenderServiceOptions) {
    this.canvas = options.canvas;
    const ctx = options.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2d context');
    }
    this.ctx = ctx;
    this.aimIndicator = options.aimIndicator;
    this.powerIndicator = options.powerIndicator;
    this.hudRenderer = options.hudRenderer;
  }

  clear(): void {
    this.ctx.fillStyle = '#87CEEB'; // Sky blue
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  renderGameEntities(
    terrain: Terrain,
    beavers: Beaver[],
    projectiles: Projectile[]
  ): void {
    this.clear();
    
    // Draw terrain
    terrain.render(this.ctx);
    
    // Draw beavers
    for (const beaver of beavers) {
      beaver.render(this.ctx);
    }
    
    // Draw projectiles
    for (const projectile of projectiles) {
      projectile.render(this.ctx);
    }
    
    // Draw HUD
    this.hudRenderer.render();
  }

  renderAimIndicator(
    beaver: Beaver,
    inputManager: InputManager,
    weaponService: WeaponService
  ): void {
    const pos = beaver.getPosition();
    const facing = beaver.getFacing();
    let aimAngle = beaver.getAimAngle();
    if (facing === -1) {
      aimAngle = Math.PI - aimAngle;
    }
    
    const input = inputManager.getState();
    const powerConfig = weaponService.getPowerConfig();
    
    this.aimIndicator.render({
      x: pos.x,
      y: pos.y,
      angle: aimAngle,
      length: input.charging ? powerConfig.currentPower * 0.1 : 40
    });
    
    // Render power indicator if charging
    if (input.charging) {
      this.powerIndicator.render({
        x: pos.x,
        y: pos.y - 30,
        currentPower: powerConfig.currentPower,
        minPower: powerConfig.minPower,
        maxPower: powerConfig.maxPower
      });
    }
  }
}

