import type { GameModules } from "../../core/types/GameModules.type";
import { COLOR_COLLISION_INACTIVE } from "../../constants";
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
        this.game.core.shapes.with({ strokeWidth: 2, strokeColor: COLOR_COLLISION_INACTIVE, bgColor: COLOR_COLLISION_INACTIVE }).circle(pos, this.args.radius);
        this.game.core.shapes.with({ strokeWidth: 2, strokeColor: COLOR_COLLISION_INACTIVE }).circle(pos, this.args.radius + 2);
    }
}