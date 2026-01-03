import { Terrain } from '../terrain/Terrain';
import { Beaver } from '../entities/Beaver';
import { Projectile } from '../entities/Projectile';
import { TurnManager, TurnPhase } from '../core/TurnManager';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2d context');
    }
    this.ctx = ctx;
  }

  clear(): void {
    this.ctx.fillStyle = '#87CEEB'; // Sky blue
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  render(
    terrain: Terrain,
    beavers: Beaver[],
    projectiles: Projectile[],
    turnManager: TurnManager
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
    
    // Draw UI
    this.renderUI(beavers, turnManager);
  }

  renderAimIndicator(x: number, y: number, angle: number, length: number = 40): void {
    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length;
    
    this.ctx.strokeStyle = '#FFFF00';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(endX, endY);
    this.ctx.stroke();
  }

  renderPowerIndicator(x: number, y: number, currentPower: number, minPower: number, maxPower: number): void {
    const barWidth = 60;
    const barHeight = 8;
    const barX = x - barWidth / 2;
    const barY = y;
    
    // Calculate power percentage
    const powerRange = maxPower - minPower;
    const powerPercent = (currentPower - minPower) / powerRange;
    
    // Draw background
    this.ctx.fillStyle = '#333333';
    this.ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Draw power bar with color gradient (green to yellow to red)
    let color: string;
    if (powerPercent < 0.5) {
      // Green to yellow
      const t = powerPercent * 2;
      const r = Math.floor(0 + t * 255);
      const g = 255;
      const b = 0;
      color = `rgb(${r}, ${g}, ${b})`;
    } else {
      // Yellow to red
      const t = (powerPercent - 0.5) * 2;
      const r = 255;
      const g = Math.floor(255 - t * 255);
      const b = 0;
      color = `rgb(${r}, ${g}, ${b})`;
    }
    
    this.ctx.fillStyle = color;
    this.ctx.fillRect(barX, barY, barWidth * powerPercent, barHeight);
    
    // Draw border
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(barX, barY, barWidth, barHeight);
  }

  private renderUI(beavers: Beaver[], turnManager: TurnManager): void {
    const currentPlayer = turnManager.getCurrentPlayerIndex();
    const currentBeaver = beavers[currentPlayer];
    
    // Draw current player indicator
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '20px Arial';
    this.ctx.fillText(`Player ${currentPlayer + 1}`, 10, 30);
    
    // Draw phase indicator
    const phaseNames: Record<TurnPhase, string> = {
      [TurnPhase.StartTurn]: 'Starting Turn',
      [TurnPhase.PlayerInput]: 'Your Turn',
      [TurnPhase.ProjectileFlying]: 'Projectile Flying',
      [TurnPhase.Explosion]: 'Explosion!',
      [TurnPhase.PhysicsSettling]: 'Settling...',
      [TurnPhase.EndTurn]: 'Ending Turn'
    };
    this.ctx.fillText(
      `Phase: ${phaseNames[turnManager.getPhase()] || 'Unknown'}`,
      10,
      60
    );
    
    // Draw player health
    for (let i = 0; i < beavers.length; i++) {
      const beaver = beavers[i];
      const y = 90 + i * 30;
      const color = i === currentPlayer ? '#FFFF00' : '#FFFFFF';
      this.ctx.fillStyle = color;
      this.ctx.fillText(
        `P${i + 1} Health: ${Math.ceil(beaver.getHealth())}/${beaver.getMaxHealth()}`,
        10,
        y
      );
    }
  }
}

