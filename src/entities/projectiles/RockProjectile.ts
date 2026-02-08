import { createTilesheet } from "../../assets";
import { COLOR_COLLISION_INACTIVE } from "../../constants";
import type { GameModules } from "../../core/types/GameModules.type";
import type { Renders } from "../../core/types/Renders.type";
import flags from "../../flags";
import { TileSheet } from "../../general/TileSheet";
import { Projectile } from "../Projectile";

export type RockProjectileArguments = {
    position: planck.Vec2;
    velocity: planck.Vec2;
    damage: number;
}
export class RockProjectile extends Projectile implements Renders {
    #tilesheet: TileSheet<"rock">;
    constructor(game: GameModules, args: RockProjectileArguments) {
        super(game, {
            position: args.position,
            velocity: args.velocity,
            damage: args.damage,
            radius: 5,
        });
        this.#tilesheet = createTilesheet('smallRock', { size: this.args.radius * 2 });
    }

    get explosionRadius(): number {
        return this.args.radius * 2 + this.args.damage * 0.5;
    }

    get beaverKnockback(): number {
        return 0;
    }

    get maxDamageDistance(): number {
        return this.explosionRadius * 1.5;
    }

    render(): void {
        const pos = this.getPosition();
        this.#tilesheet.drawImage(this.game.canvas, "rock", pos.x, pos.y);

        if (flags.renderCollisionBoundaries) {
            this.game.core.shapes.with({ strokeWidth: 1, strokeColor: COLOR_COLLISION_INACTIVE }).circle(pos, this.args.radius + 2);
        }
    }
}