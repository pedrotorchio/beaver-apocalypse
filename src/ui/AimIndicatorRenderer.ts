import { PowerIndicatorRenderer } from "./PowerIndicatorRenderer";
import type { GameModules } from "../core/types/GameModules.type";
import type { Renders } from "../core/types/Renders.type";

export interface AimIndicatorRendererArguments {
  powerIndicator: PowerIndicatorRenderer;
}

/**
 * Renders the aim indicator line showing where the beaver is aiming.
 *
 * This class is responsible for:
 * - Drawing a line from the beaver's position in the direction of aim
 * - Adjusting the line length based on weapon charging state (longer when charging)
 * - Rendering the power indicator when the weapon is charging
 * - Providing visual feedback for aim direction and power level
 *
 * The AimIndicatorRenderer displays a yellow line extending from the beaver
 * in the direction they are aiming. The line length increases when the weapon
 * is charging to indicate power level. This visual aid helps players aim
 * their shots accurately.
 */
export class AimIndicatorRenderer implements Renders {
  constructor(private game: GameModules, private args: AimIndicatorRendererArguments) {}

  /**
   * Renders the aim indicator and power indicator for a beaver.
   * This method handles all the logic for displaying aim direction and power level.
   */
  render(): void {
    const currentBeaver = this.game.core.entityManager.getBeaver(
      this.game.core.turnManager.getCurrentPlayerIndex()
    );
    if (!currentBeaver?.isAlive() || !this.game.core.turnManager.canAcceptInput()) {
      return;
    }

    const aim = currentBeaver.getAim();
    const power = aim.getPower();
    const minPower = aim.getMinPower();
    const maxPower = aim.getMaxPower();
    
    // Calculate spawn point with current power
    const spawnPoint = currentBeaver.getProjectileSpawnPoint(power);
    const pos = currentBeaver.getPosition();

    // Interpolate color from yellow (#FFFF00) to red (#FF0000) based on power
    const powerRatio = (power - minPower) / (maxPower - minPower);
    const red = 255;
    const green = Math.round(255 * (1 - powerRatio));
    const blue = 0;
    const color = `rgb(${red}, ${green}, ${blue})`;

    // Draw circle at spawn point
    this.game.core.shapes.with({ bgColor: color }).circle(spawnPoint, 5);

    // Render power indicator if charging
    const input = this.game.core.inputManager.getState();
    if (input.charging) {
      this.args.powerIndicator.render({
        x: pos.x,
        y: pos.y - 30,
        currentPower: power,
        minPower: minPower,
        maxPower: maxPower,
      });
    }
  }
}
