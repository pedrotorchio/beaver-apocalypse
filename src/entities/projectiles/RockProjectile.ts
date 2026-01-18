import { AssetLoader } from "../../general/AssetLoader";
import { TileSheet } from "../../general/TileSheet";
import { Projectile } from "../Projectile";
import type { GameModules } from "../../core/GameModules.type";

export type RockProjectileArguments = {
    position: planck.Vec2;
    velocity: planck.Vec2;
    damage: number;
}
export class RockProjectile extends Projectile {
    public static renderRadius = true
    private tilesheet: TileSheet<"rock">;
    constructor(game: GameModules, args: RockProjectileArguments) {
        super(game, {
            position: args.position,
            velocity: args.velocity,
            damage: args.damage,
            radius: 5,
        });
        this.tilesheet = new TileSheet({
            image: AssetLoader.getAsset("small_rock"),
            tileWidth: 419,
            tileHeight: 366,
            states: ["rock"],
            renderWidth: this.args.radius,
            renderHeight: this.args.radius,
        });
    }

    render(): void {
        const pos = this.getPosition();
        this.tilesheet.drawImage(this.game.canvas, "rock", pos.x, pos.y);

        if (RockProjectile.renderRadius) {
            const ctx = this.game.canvas;
            ctx.strokeStyle = "#FFD700";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, this.args.radius + 2, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}