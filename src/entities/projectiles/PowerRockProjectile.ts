import type { GameModules } from "../../core/types/GameModules.type";
import flags from "../../flags";
import { RockProjectile, RockProjectileArguments } from "./RockProjectile";

export class PowerRockProjectile extends RockProjectile {
    constructor(game: GameModules, args: RockProjectileArguments) {
        super(game, args);
    }

    render(): void {
        super.render();
        if (!flags.renderCollisionBoundaries) return;
        const pos = this.getPosition();
        this.game.core.shapes.with({ strokeWidth: 2, strokeColor: "#FFD700", bgColor: "#FFA500" }).circle(pos, this.args.radius);
        this.game.core.shapes.with({ strokeWidth: 2, strokeColor: "#FFD700" }).circle(pos, this.args.radius + 2);
    }
}