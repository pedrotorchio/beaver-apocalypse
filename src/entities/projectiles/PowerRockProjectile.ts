import { RockProjectile } from "./RockProjectile";

export class PowerRockProjectile extends RockProjectile {

    render(): void {
        super.render();
        const pos = this.getPosition();
        const ctx = this.game.canvas;
        
        // Draw main projectile body
        ctx.fillStyle = "#FFA500";
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, this.args.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw border
        ctx.strokeStyle = "#FFD700";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, this.args.radius + 2, 0, Math.PI * 2);
        ctx.stroke();

    }
}