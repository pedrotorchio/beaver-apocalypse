import { RockProjectile, RockProjectileArguments } from "./RockProjectile";
import type { GameModules } from "../../core/types/GameModules.type";

export class PowerRockProjectile extends RockProjectile {
    constructor(game: GameModules, args: RockProjectileArguments) {
        super(game, args);
    }

    render(): void {
        super.render();
        const pos = this.getPosition();
        
        // Draw main projectile body
        this.game.core.shapes.with({ strokeWidth: 2, strokeColor: "#FFD700", bgColor: "#FFA500" }).circle(pos, this.args.radius);

        // Draw border
        this.game.core.shapes.with({ strokeWidth: 2, strokeColor: "#FFD700" }).circle(pos, this.args.radius + 2);
    }
}