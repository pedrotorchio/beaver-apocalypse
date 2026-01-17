import { AssetLoader } from "../../general/AssetLoader";
import { TileSheet } from "../../general/TileSheet";
import { Projectile, GameModules } from "../Projectile";

export type RockProjectileOptions = {
    position: planck.Vec2;
    velocity: planck.Vec2;
    damage: number;
}
export class RockProjectile extends Projectile {
    public static renderRadius = true
    private tilesheet: TileSheet<"rock">;
    constructor(modules: GameModules, options: RockProjectileOptions) {
        super(modules, {
            position: options.position,
            velocity: options.velocity,
            damage: options.damage,
            radius: 5,
        });
        this.tilesheet = new TileSheet({
            image: AssetLoader.getAsset("small_rock"),
            tileWidth: 419,
            tileHeight: 366,
            states: ["rock"],
            renderWidth: this.options.radius,
            renderHeight: this.options.radius,
        });
    }

    render(): void {
        const pos = this.getPosition();
        this.tilesheet.drawImage(this.modules.canvas, "rock", pos.x, pos.y);

        if (RockProjectile.renderRadius) {
            const ctx = this.modules.canvas;
            ctx.strokeStyle = "#FFD700";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, this.options.radius + 2, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}