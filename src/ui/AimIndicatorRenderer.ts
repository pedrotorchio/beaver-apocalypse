import type { GameModules } from "../core/types/GameModules.type";
import type { Renders } from "../core/types/Renders.type";
import type { Aim } from "../entities/Aim";
import { CCWDeg, CCWRad, ccwdeg2rad, mirrorRadians } from "../general/coordinateSystem";
import { PowerIndicatorRenderer } from "./PowerIndicatorRenderer";

export interface AimIndicatorRendererArguments {
  powerIndicator: PowerIndicatorRenderer;
}

/**
 * Renders the aim indicator around the beaver.
 *
 * This class is responsible for:
 * - Drawing degree indicator dashes and labels around the beaver
 * - Drawing a circle at the aim position (no line from center)
 * - Rendering the power indicator when the weapon is charging
 */
export class AimIndicatorRenderer implements Renders {
  constructor(private game: GameModules, private args: AimIndicatorRendererArguments) { }

  /**
   * Renders the aim indicator and power indicator for a beaver.
   */
  render(): void {
    const currentBeaver = this.getRenderableBeaver();
    if (!currentBeaver) return;

    const pos = currentBeaver.body.getPosition();
    const aim = currentBeaver.aim;
    this.drawDegreeIndicator(pos, currentBeaver.direction);
    this.drawAimCircle(pos, aim, currentBeaver.direction, currentBeaver.radius);
    this.drawDegreeLabels(pos, currentBeaver.direction);
    this.maybeRenderPowerIndicator(pos, aim.getPower(), aim.getMinPower(), aim.getMaxPower());
  }

  private getRenderableBeaver() {
    const currentBeaver = this.game.core.entityManager.getBeaver(
      this.game.core.turnManager.getCurrentPlayerIndex()
    );
    if (!currentBeaver?.health.isAlive() || !this.game.core.turnManager.canAcceptInput()) return null;
    return currentBeaver;
  }

  private drawDegreeIndicator(pos: { x: number; y: number }, facing: number): void {
    const dashInner = 30;
    const dashOuter = 40;
    const dashDegrees: CCWDeg[] = [0, 45, 90, 120, -45, -90].map(CCWDeg);
    const shapes = this.game.core.shapes.with({ strokeColor: "rgba(0,0,0,0.6)", strokeWidth: 1 });
    for (const deg of dashDegrees) {
      const rad = ccwdeg2rad(deg);
      const cos = Math.cos(rad) * facing;
      const sin = Math.sin(rad);
      shapes.line(
        { x: pos.x + dashInner * cos, y: pos.y - dashInner * sin },
        { x: pos.x + dashOuter * cos, y: pos.y - dashOuter * sin }
      );
    }
  }

  private drawAimCircle(pos: { x: number; y: number }, aim: Aim, facing: number, beaverRadius: number): void {
    const aimAngle = aim.getAngle();
    const fireAngle: CCWRad = facing === -1 ? CCWRad(mirrorRadians(aimAngle)) : aimAngle;
    const power = aim.getPower();
    const minPower = aim.getMinPower();
    const maxPower = aim.getMaxPower();
    const powerRatio = (power - minPower) / (maxPower - minPower);
    const projectileRadius = 4;
    const baseOffsetDistance = beaverRadius + projectileRadius;
    const minDistance = baseOffsetDistance * 1.2;
    const maxDistance = baseOffsetDistance * 2.5;
    const offsetDistance = minDistance + (maxDistance - minDistance) * powerRatio;
    const indicatorEnd = {
      x: pos.x + offsetDistance * Math.cos(fireAngle),
      y: pos.y - offsetDistance * Math.sin(fireAngle),
    };
    const red = 255;
    const green = Math.round(255 * (1 - powerRatio));
    const color = `rgb(${red}, ${green}, 0)`;
    this.game.core.shapes.with({ bgColor: color }).circle(indicatorEnd, 5);
  }

  private drawDegreeLabels(pos: { x: number; y: number }, facing: number): void {
    const labelRadius = 46;
    const labelFontSize = 10;
    const labelShapes = this.game.core.shapes.with({ strokeColor: "rgba(0,0,0,0.8)" });
    const labels = [
      { deg: CCWDeg(0), text: "0" },
      { deg: CCWDeg(45), text: "45" },
      { deg: CCWDeg(90), text: "90" },
      { deg: CCWDeg(120), text: "120" },
      { deg: CCWDeg(-45), text: "-45" },
      { deg: CCWDeg(-90), text: "-90" },
    ];
    labels.forEach(({ deg, text }) => {
      const rad = ccwdeg2rad(deg);
      const lx = pos.x + labelRadius * Math.cos(rad) * facing;
      const ly = pos.y - labelRadius * Math.sin(rad);
      labelShapes.text(lx, ly, labelFontSize, text);
    });
  }

  private maybeRenderPowerIndicator(pos: { x: number; y: number }, power: number, minPower: number, maxPower: number): void {
    const input = this.game.core.inputManager.getInputState();
    if (!input.charging) return;
    this.args.powerIndicator.render({
      x: pos.x,
      y: pos.y - 30,
      currentPower: power,
      minPower,
      maxPower,
    });
  }
}
