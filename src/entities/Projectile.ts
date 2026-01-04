import * as planck from "planck-js";
import { Terrain } from "../terrain/Terrain";

export class Projectile {
  private body: planck.Body;
  private active: boolean = true;
  private radius: number = 4;
  private world: planck.World;
  private terrain: Terrain;
  private explosionRadius: number = 30;
  private damage: number = 50;

  constructor(
    world: planck.World,
    terrain: Terrain,
    x: number,
    y: number,
    velocityX: number,
    velocityY: number
  ) {
    this.world = world;
    this.terrain = terrain;

    const bodyDef: planck.BodyDef = {
      type: "dynamic",
      position: planck.Vec2(x, y),
      bullet: true, // Continuous collision detection
    };

    this.body = world.createBody(bodyDef);

    const shape = planck.Circle(this.radius);
    const fixtureDef: planck.FixtureDef = {
      shape: shape,
      density: 0.1,
      friction: 0.0,
      restitution: 0.5,
    };

    this.body.createFixture(fixtureDef);
    this.body.setLinearVelocity(planck.Vec2(velocityX, velocityY));
  }

  getBody(): planck.Body {
    return this.body;
  }

  getPosition(): planck.Vec2 {
    return this.body.getPosition();
  }

  isActive(): boolean {
    return this.active;
  }

  update(beavers: any[]): boolean {
    if (!this.active) return false;

    const pos = this.body.getPosition();

    // Check terrain collision via pixel sampling
    if (this.terrain.isSolid(pos.x, pos.y)) {
      this.explode(beavers);
      return false;
    }

    // Also check a few points around the projectile for better detection
    const checkOffsets = [
      { x: this.radius, y: 0 },
      { x: -this.radius, y: 0 },
      { x: 0, y: this.radius },
      { x: 0, y: -this.radius },
    ];

    for (const offset of checkOffsets) {
      if (this.terrain.isSolid(pos.x + offset.x, pos.y + offset.y)) {
        this.explode(beavers);
        return false;
      }
    }

    // Check if out of bounds
    if (
      pos.x < 0 ||
      pos.x > this.terrain.getWidth() ||
      pos.y < 0 ||
      pos.y > this.terrain.getHeight()
    ) {
      this.active = false;
      this.destroy();
      return false;
    }

    return true;
  }

  explode(beavers: any[]): void {
    if (!this.active) return;

    const pos = this.body.getPosition();

    // Destroy terrain
    this.terrain.destroyCircle(pos.x, pos.y, this.explosionRadius);

    // Damage and knockback beavers
    for (const beaver of beavers) {
      const beaverPos = beaver.getPosition();
      const dx = beaverPos.x - pos.x;
      const dy = beaverPos.y - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < this.explosionRadius + 10) {
        const damage = this.damage * (1 - distance / (this.explosionRadius + 10));
        beaver.applyDamage(damage);

        const knockback = 10;
        const impulseX = (dx / distance) * knockback;
        const impulseY = (dy / distance) * knockback;
        beaver.applyKnockback(impulseX, impulseY);
      }
    }

    this.active = false;
    this.destroy();
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    const pos = this.body.getPosition();
    ctx.fillStyle = "#FFA500";
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw trail
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, this.radius + 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  destroy(): void {
    if (this.body) {
      this.world.destroyBody(this.body);
    }
  }
}
