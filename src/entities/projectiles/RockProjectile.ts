import { tilesheet } from "../../assets";
import type { GameModules } from "../../core/types/GameModules.type";
import type { Renders } from "../../core/types/Renders.type";
import { TileSheet } from "../../general/TileSheet";
import { Projectile } from "../Projectile";

export type RockProjectileArguments = {
    position: planck.Vec2;
    velocity: planck.Vec2;
    damage: number;
}
export class RockProjectile extends Projectile implements Renders {
    public static renderRadius = true
    #tilesheet: TileSheet<"rock">;
    constructor(game: GameModules, args: RockProjectileArguments) {
        super(game, {
            position: args.position,
            velocity: args.velocity,
            damage: args.damage,
            radius: 5,
        });
        this.#tilesheet = tilesheet.smallRock({ size: this.args.radius * 2 });
    }

    render(): void {
        const pos = this.getPosition();
        this.#tilesheet.drawImage(this.game.canvas, "rock", pos.x, pos.y);

        if (RockProjectile.renderRadius) {
            this.game.core.shapes.with({ strokeWidth: 1, strokeColor: "#FFD700" }).circle(pos, this.args.radius + 2);
        }
    }
}