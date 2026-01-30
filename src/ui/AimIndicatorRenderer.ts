import type { GameModules } from "../core/types/GameModules.type";
import type { Renders } from "../core/types/Renders.type";
import { PowerIndicatorRenderer } from "./PowerIndicatorRenderer";

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
  constructor(private game: GameModules, private args: AimIndicatorRendererArguments) { }

  /**
   * Renders the aim indicator and power indicator for a beaver.
   * This method handles all the logic for displaying aim direction and power level.
   */
  render(): void {
    const currentBeaver = this.game.core.entityManager.getBeaver(
      this.game.core.turnManager.getCurrentPlayerIndex()
    );
    if (!currentBeaver?.health.isAlive() || !this.game.core.turnManager.canAcceptInput()) {
      return;
    }

    const aim = currentBeaver.aim;
    const power = aim.getPower();
    const minPower = aim.getMinPower();
    const maxPower = aim.getMaxPower();

    // Calculate spawn point with current power
    const spawnPoint = currentBeaver.getProjectileSpawnPoint(power);
    const pos = currentBeaver.body.getPosition();

    // Interpolate color from yellow (#FFFF00) to red (#FF0000) based on power
    const powerRatio = (power - minPower) / (maxPower - minPower);
    const red = 255;
    const green = Math.round(255 * (1 - powerRatio));
    const blue = 0;
    const color = `rgb(${red}, ${green}, ${blue})`;

    // Draw circle at spawn point
    this.game.core.shapes.with({ bgColor: color }).circle(spawnPoint, 5);

    // Degree indicator ring (dashes every 30° within [MIN_ANGLE, MAX_ANGLE]); mirrored when facing left
    const dashInner = 30;
    const dashOuter = 40;
    const labelRadius = 46;
    const facing = currentBeaver.facing;
    const dashDegrees = [0, 45, 90, 120, -45, -90];
    const shapes = this.game.core.shapes.with({ strokeColor: "rgba(0,0,0,0.6)", strokeWidth: 1 });
    for (const deg of dashDegrees) {
      const rad = (deg * Math.PI) / 180;
      const cos = Math.cos(rad) * facing;
      const sin = Math.sin(rad);
      shapes.line(
        { x: pos.x + dashInner * cos, y: pos.y - dashInner * sin },
        { x: pos.x + dashOuter * cos, y: pos.y - dashOuter * sin }
      );
    }
    const labelShapes = this.game.core.shapes.with({ strokeColor: "rgba(0,0,0,0.8)" });
    const labelFontSize = 10;
    ([
      { deg: 0, text: "0" },
      { deg: 45, text: "45" },
      { deg: 90, text: "90" },
      { deg: 120, text: "120" },
      { deg: -45, text: "-45" },
      { deg: -90, text: "-90" },
    ]).forEach(({ deg, text }) => {
      const rad = (deg * Math.PI) / 180;
      const lx = pos.x + labelRadius * Math.cos(rad) * facing;
      const ly = pos.y - labelRadius * Math.sin(rad);
      labelShapes.text(lx, ly, labelFontSize, text);
    });

    // Render power indicator if charging
    const input = this.game.core.inputManager.getInputState();
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
