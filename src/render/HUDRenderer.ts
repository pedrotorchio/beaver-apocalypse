import { Beaver } from '../entities/Beaver';
import { TurnManager, TurnPhase } from '../core/TurnManager';

export interface HUDRendererOptions {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  beavers: Beaver[];
  turnManager: TurnManager;
}

export class HUDRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private beavers: Beaver[];
  private turnManager: TurnManager;

  constructor(options: HUDRendererOptions) {
    this.ctx = options.ctx;
    this.canvas = options.canvas;
    this.beavers = options.beavers;
    this.turnManager = options.turnManager;
  }

  render(): void {
    const hudHeight = 70;
    const padding = 15;
    const sectionSpacing = 20;
    
    // Draw HUD background with semi-transparent overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    this.ctx.fillRect(0, 0, this.canvas.width, hudHeight);
    
    // Draw border
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(0, 0, this.canvas.width, hudHeight);
    
    // Get current player and phase
    const currentPlayer = this.turnManager.getCurrentPlayerIndex();
    const phase = this.turnManager.getPhase();
    
    // Phase names for display
    const phaseNames: Record<TurnPhase, string> = {
      [TurnPhase.StartTurn]: 'Initializing...',
      [TurnPhase.PlayerInput]: 'Player Turn',
      [TurnPhase.ProjectileFlying]: 'Projectile Flying',
      [TurnPhase.Explosion]: 'Explosion!',
      [TurnPhase.PhysicsSettling]: 'Physics Settling',
      [TurnPhase.EndTurn]: 'Ending Turn'
    };
    
    let xPos = padding;
    
    // Left section: Beaver turn indicator
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 22px Arial';
    const beaverText = `Beaver ${currentPlayer + 1}'s Turn`;
    this.ctx.fillText(beaverText, xPos, 28);
    xPos += this.ctx.measureText(beaverText).width + sectionSpacing;
    
    // Middle section: Phase indicator
    this.ctx.font = '18px Arial';
    this.ctx.fillStyle = '#CCCCCC';
    const phaseLabel = 'Phase:';
    this.ctx.fillText(phaseLabel, xPos, 28);
    xPos += this.ctx.measureText(phaseLabel).width + 8;
    
    this.ctx.fillStyle = '#FFFF00';
    const phaseText = phaseNames[phase] || 'Unknown';
    this.ctx.fillText(phaseText, xPos, 28);
    xPos += this.ctx.measureText(phaseText).width + sectionSpacing;
    
    // Right section: Health for all beavers (positioned from right)
    const barWidth = 100;
    const barHeight = 10;
    const barY = 30;
    let rightX = this.canvas.width - padding;
    
    for (let i = this.beavers.length - 1; i >= 0; i--) {
      const beaver = this.beavers[i];
      const health = beaver.getHealth();
      const maxHealth = beaver.getMaxHealth();
      const healthPercent = health / maxHealth;
      
      rightX -= barWidth;
      
      // Draw health bar background
      this.ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
      this.ctx.fillRect(rightX, barY, barWidth, barHeight);
      
      // Draw health bar
      if (i === currentPlayer) {
        this.ctx.fillStyle = '#FFFF00';
      } else if (healthPercent > 0.6) {
        this.ctx.fillStyle = '#00FF00';
      } else if (healthPercent > 0.3) {
        this.ctx.fillStyle = '#FFAA00';
      } else {
        this.ctx.fillStyle = '#FF0000';
      }
      this.ctx.fillRect(rightX, barY, barWidth * healthPercent, barHeight);
      
      // Draw health bar border
      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(rightX, barY, barWidth, barHeight);
      
      // Draw health text above bar
      this.ctx.font = '14px Arial';
      if (i === currentPlayer) {
        this.ctx.fillStyle = '#FFFF00';
      } else {
        this.ctx.fillStyle = '#FFFFFF';
      }
      const healthText = `B${i + 1}: ${Math.ceil(health)}/${maxHealth}`;
      const textWidth = this.ctx.measureText(healthText).width;
      this.ctx.fillText(healthText, rightX + (barWidth - textWidth) / 2, barY - 2);
      
      rightX -= sectionSpacing;
    }
  }
}

