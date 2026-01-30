import * as planck from "planck-js";
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
  constructor(private game: GameModules) { }

  render(): void {
    const beavers = this.game.core.entityManager.getBeavers().toArray();
    const ctx = this.game.canvas;
    const canvas = ctx.canvas;
    const hudHeight = 70;
    const padding = 15;
    const sectionSpacing = 20;

    // Draw HUD background with semi-transparent overlay and border
    this.game.core.shapes.with({ bgColor: "rgba(0, 0, 0, 0.75)" }).rect(0, 0, canvas.width, hudHeight);
    this.game.core.shapes.with({ strokeWidth: 2, strokeColor: "#FFFFFF" }).rect({ x: canvas.width / 2, y: hudHeight / 2 }, canvas.width, hudHeight);

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
      const health = beaver.health.health;
      const maxHealth = beaver.health.maxHealth;
      const healthPercent = health / maxHealth;

      rightX -= barWidth;

      // Skip if health bar would overlap with left section or go off left edge of canvas
      if (rightX < minLeftEdge || rightX < 0) {
        break;
      }

      // Draw health bar background
      this.game.core.shapes.with({ bgColor: "rgba(100, 100, 100, 0.5)" }).rect(rightX, barY, barWidth, barHeight);

      // Draw health bar
      let healthColor: string;
      if (i === currentPlayer) {
        healthColor = "#FFFF00";
      } else if (healthPercent > 0.6) {
        healthColor = "#00FF00";
      } else if (healthPercent > 0.3) {
        healthColor = "#FFAA00";
      } else {
        healthColor = "#FF0000";
      }
      this.game.core.shapes.with({ bgColor: healthColor }).rect(rightX, barY, barWidth * healthPercent, barHeight);

      // Draw health bar border
      this.game.core.shapes.with({ strokeWidth: 1, strokeColor: "#FFFFFF" }).rect({ x: rightX + barWidth / 2, y: barY + barHeight / 2 }, barWidth, barHeight);

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

    this.renderRulers(canvas, ctx);
    this.renderAngleReference(canvas, ctx);
  }

  private renderAngleReference(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
    const centerX = canvas.width - 100;
    const centerY = 200;
    const radius = 50;
    const dashLen = 8;
    const labelRadius = radius + 14;
    const baseVec = planck.Vec2(1, 0);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 1;
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    this.game.core.shapes.with({ strokeColor: "rgba(255, 255, 255, 0.8)" }).circle({ x: centerX, y: centerY }, radius);

    for (let deg = 0; deg < 360; deg += 30) {
      const angleRad = (deg * Math.PI) / 180;
      const rot = planck.Rot(angleRad);
      const dir = planck.Rot.mulVec2(rot, baseVec);
      const inner = planck.Vec2.mul(dir, radius - dashLen);
      const outer = planck.Vec2.mul(dir, radius);
      ctx.beginPath();
      ctx.moveTo(centerX + inner.x, centerY + inner.y);
      ctx.lineTo(centerX + outer.x, centerY + outer.y);
      ctx.stroke();
    }

    const labelAngles = [0, 90, 180, 270];
    for (const deg of labelAngles) {
      const angleRad = (deg * Math.PI) / 180;
      const rot = planck.Rot(angleRad);
      const dir = planck.Rot.mulVec2(rot, baseVec);
      const labelPos = planck.Vec2.mul(dir, labelRadius);
      ctx.fillText(`${deg}°`, centerX + labelPos.x, centerY + labelPos.y);
    }
    ctx.fillText("Planck", centerX, centerY);
    const signDistance = radius * 0.55;
    ctx.fillText("-", centerX - signDistance, centerY);
    ctx.fillText("+", centerX + signDistance, centerY);
    ctx.fillText("-", centerX, centerY - signDistance);
    ctx.fillText("+", centerX, centerY + signDistance);
    ctx.fillText("-", centerX - signDistance, centerY);
    ctx.fillText("+", centerX + signDistance, centerY);
    ctx.fillText("-", centerX, centerY - signDistance);
    ctx.fillText("+", centerX, centerY + signDistance);
  }

  private renderRulers(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
    const width = this.game.terrain.getWidth();
    const height = this.game.terrain.getHeight();
    const dashInterval = 10;
    const longDashInterval = 100;
    const shortDashLen = 4;
    const longDashLen = 10;
    const labelSkipNearEnd = 20;

    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 1;
    ctx.font = "10px sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";

    // Horizontal ruler at bottom: vertical dashes
    const hRulerY = height - 1;
    for (let x = 0; x <= width; x += dashInterval) {
      const isLong = x % longDashInterval === 0;
      const len = isLong ? longDashLen : shortDashLen;
      ctx.beginPath();
      ctx.moveTo(x, hRulerY);
      ctx.lineTo(x, hRulerY - len);
      ctx.stroke();
    }
    for (let x = longDashInterval; x < width; x += longDashInterval) {
      if (x >= width - labelSkipNearEnd) continue;
      ctx.fillText(String(x), x - ctx.measureText(String(x)).width / 2, hRulerY - longDashLen - 2);
    }

    // Vertical ruler on left: horizontal dashes
    const vRulerX = 0;
    for (let y = 0; y <= height; y += dashInterval) {
      const isLong = y % longDashInterval === 0;
      const len = isLong ? longDashLen : shortDashLen;
      ctx.beginPath();
      ctx.moveTo(vRulerX, y);
      ctx.lineTo(vRulerX + len, y);
      ctx.stroke();
    }
    for (let y = longDashInterval; y < height; y += longDashInterval) {
      if (y >= height - labelSkipNearEnd) continue;
      ctx.fillText(String(y), vRulerX + longDashLen + 2, y + 4);
    }
  }
}
