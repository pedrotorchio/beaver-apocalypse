import { Beaver } from "../entities/Beaver";
import { TurnPhase } from "../core/managers/TurnManager";
import type { GameModules } from "../core/types/GameModules.type";
import type { Renders } from "../core/types/Renders.type";

/**
 * Renders the Heads-Up Display (HUD) overlay showing game state information.
 *
 * This class is responsible for:
 * - Drawing the HUD background and border at the top of the screen
 * - Displaying the current player's turn indicator
 * - Showing the current turn phase name
 * - Rendering health bars for all beavers with color coding
 * - Highlighting the active player's health bar
 * - Positioning HUD elements with proper spacing and layout
 *
 * The HUDRenderer provides visual feedback about game state to players.
 * It displays turn information, phase status, and health for all beavers
 * in a consistent overlay format. This renderer should be called each frame
 * to keep the HUD information current.
 */
export class HUDRenderer implements Renders {
  constructor(private game: GameModules) {}

  render(): void {
    const beavers = this.game.core.entityManager.getBeavers();
    const ctx = this.game.canvas;
    const canvas = ctx.canvas;
    const hudHeight = 70;
    const padding = 15;
    const sectionSpacing = 20;

    // Draw HUD background with semi-transparent overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(0, 0, canvas.width, hudHeight);

    // Draw border
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, hudHeight);

    // Get current player and phase
    const turnManager = this.game.core.turnManager;
    const currentPlayer = turnManager.getCurrentPlayerIndex();
    const phase = turnManager.getPhase();

    // Phase names for display
    const phaseNames: Record<TurnPhase, string> = {
      [TurnPhase.PlayerInput]: "Player Turn",
      [TurnPhase.ProjectileFlying]: "Projectile Flying",
      [TurnPhase.PhysicsSettling]: "Physics Settling",
      [TurnPhase.EndTurn]: "Ending Turn",
    };

    let xPos = padding;

    // Left section: Beaver turn indicator
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 22px Arial";
    const beaverText = `Beaver ${currentPlayer + 1}'s Turn`;
    ctx.fillText(beaverText, xPos, 28);
    xPos += ctx.measureText(beaverText).width + sectionSpacing;

    // Middle section: Phase indicator
    ctx.font = "18px Arial";
    ctx.fillStyle = "#CCCCCC";
    const phaseLabel = "Phase:";
    ctx.fillText(phaseLabel, xPos, 28);
    xPos += ctx.measureText(phaseLabel).width + 8;

    ctx.fillStyle = "#FFFF00";
    const phaseText = phaseNames[phase] || "Unknown";
    ctx.fillText(phaseText, xPos, 28);
    const leftSectionEnd = xPos + ctx.measureText(phaseText).width + sectionSpacing;

    // Right section: Health for all beavers (positioned from right)
    const barWidth = 100;
    const barHeight = 10;
    const barY = 30;
    
    // Calculate total space needed for health bars (width of all bars + spacing between them)
    const totalHealthBarWidth = beavers.length * barWidth + (beavers.length - 1) * sectionSpacing;
    const minLeftEdge = leftSectionEnd + padding; // Minimum left edge to avoid overlap with left section
    
    // Start from right edge of canvas
    let rightX = canvas.width - padding;
    
    // Check if health bars would overlap with left section
    // Calculate where the leftmost bar would start if we position from the right edge
    const leftmostBarLeftEdge = rightX - totalHealthBarWidth;
    
    // If bars would overlap with left section, adjust starting position
    // Ensure bars stay within canvas bounds
    if (leftmostBarLeftEdge < minLeftEdge) {
      // Position bars so they start at minimum left edge, but clamp to canvas
      const adjustedRightX = Math.min(minLeftEdge + totalHealthBarWidth, canvas.width - padding);
      rightX = adjustedRightX;
    }

    for (let i = beavers.length - 1; i >= 0; i--) {
      const beaver = beavers[i];
      const health = beaver.getHealth();
      const maxHealth = beaver.getMaxHealth();
      const healthPercent = health / maxHealth;

      rightX -= barWidth;
      
      // Skip if health bar would overlap with left section or go off left edge of canvas
      if (rightX < minLeftEdge || rightX < 0) {
        break;
      }

      // Draw health bar background
      ctx.fillStyle = "rgba(100, 100, 100, 0.5)";
      ctx.fillRect(rightX, barY, barWidth, barHeight);

      // Draw health bar
      if (i === currentPlayer) {
        ctx.fillStyle = "#FFFF00";
      } else if (healthPercent > 0.6) {
        ctx.fillStyle = "#00FF00";
      } else if (healthPercent > 0.3) {
        ctx.fillStyle = "#FFAA00";
      } else {
        ctx.fillStyle = "#FF0000";
      }
      ctx.fillRect(rightX, barY, barWidth * healthPercent, barHeight);

      // Draw health bar border
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 1;
      ctx.strokeRect(rightX, barY, barWidth, barHeight);

      // Draw health text above bar
      ctx.font = "14px Arial";
      if (i === currentPlayer) {
        ctx.fillStyle = "#FFFF00";
      } else {
        ctx.fillStyle = "#FFFFFF";
      }
      const healthText = `B${i + 1}: ${Math.ceil(health)}/${maxHealth}`;
      const textWidth = ctx.measureText(healthText).width;
      ctx.fillText(healthText, rightX + (barWidth - textWidth) / 2, barY - 2);

      rightX -= sectionSpacing;
    }
  }
}
