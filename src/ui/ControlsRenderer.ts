import type { GameModules } from "../core/types/GameModules.type";
import type { Renders } from "../core/types/Renders.type";

/**
 * Renders a visual representation of control inputs in real-time.
 *
 * This class displays a 3x3 grid showing:
 * - Top middle: Jump (W key)
 * - Left middle: Move left (A key)
 * - Right middle: Move right (D key)
 * - Bottom row (all 3 positions): Fire (Space key)
 *
 * Keys are displayed as grey squares when not pressed, and desaturated
 * bloody red when pressed. This provides visual feedback for player inputs.
 */
export class ControlsRenderer implements Renders {

  // Colors
  private readonly inactiveColor = "#808080"; // Grey
  private readonly activeColor = "#8B4A4A"; // Desaturated bloody red

  // Grid configuration
  private readonly gridSize = 3; // 3x3 grid
  private readonly squareSize = 30;
  private readonly squareSpacing = 5;
  private readonly gridPadding = 10;

  private get totalGridSize(): number {
    return this.gridSize * this.squareSize + (this.gridSize - 1) * this.squareSpacing;
  }

  private get startX(): number {
    const canvas = this.game.canvas.canvas;
    return canvas.width - 2 * this.totalGridSize - this.gridPadding;
  }
  private get startY(): number {
    const canvas = this.game.canvas.canvas;
    return canvas.height - this.totalGridSize - this.gridPadding - 20;
  }

  constructor(private game: GameModules) { }

  render(): void {
    const input = this.game.core.inputManager.getInputState();

    // Draw Up (top middle) - grid position (1, 0), 1 square wide
    this.drawRectangle(1, 0, 1, 1, input.jump);

    // Draw Left (from left edge to middle) - grid position (0, 1), 1.5 squares wide
    this.drawRectangle(0, 1, 1.5, 1, input.moveLeft);

    // Draw Right (from middle to right edge) - grid position (1.5, 1), 1.5 squares wide
    this.drawRectangle(1.5, 1, 1.5, 1, input.moveRight);

    // Draw Fire (bottom row - all 3 positions) - grid position (0, 2), 3 squares wide
    this.drawRectangle(0, 2, 3, 1, input.fire || input.charging);

    const currentBeaver = this.game.core.entityManager.getBeaver(this.game.core.turnManager.getCurrentPlayerIndex());
    this.writeText(currentBeaver?.isGrounded ? "Grounded" : "In the air");

  }

  /**
   * Draws a rectangle at the specified grid position.
   * @param gridCol - Grid column (0-based, e.g., 0 = first column, 1 = second column). Can be fractional (e.g., 1.5).
   * @param gridRow - Grid row (0-based, e.g., 0 = first row, 1 = second row)
   * @param width - Width in number of squares (1 = one square, 2 = two squares including spacing, etc.)
   * @param height - Height in number of squares (1 = one square, 2 = two squares including spacing, etc.)
   * @param isActive - Whether the control is currently active/pressed
   */
  private drawRectangle(gridCol: number, gridRow: number, width: number, height: number, isActive: boolean): void {

    // Convert grid coordinates to pixel coordinates
    const pixelX = this.startX + gridCol * (this.squareSize + this.squareSpacing);
    const pixelY = this.startY + gridRow * (this.squareSize + this.squareSpacing);

    // Calculate pixel width: width squares + (width - 1) spacings
    const pixelWidth = width * this.squareSize + (width - 1) * this.squareSpacing;
    // Calculate pixel height: height squares + (height - 1) spacings
    const pixelHeight = height * this.squareSize + (height - 1) * this.squareSpacing;

    // Draw the rectangle
    const ctx = this.game.canvas;
    ctx.fillStyle = isActive ? this.activeColor : this.inactiveColor;
    ctx.fillRect(pixelX, pixelY, pixelWidth, pixelHeight);

    // Draw border
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1;
    ctx.strokeRect(pixelX, pixelY, pixelWidth, pixelHeight);
  }

  /**
   * Writes text just below the grid.
   * @param text - The text to display
   */
  private writeText(text: string): void {
    const textY = this.startY + this.totalGridSize + 10; // Position just below the grid

    const ctx = this.game.canvas;
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const textX = this.startX + this.totalGridSize / 2;
    ctx.fillText(text, textX, textY);
  }
}

