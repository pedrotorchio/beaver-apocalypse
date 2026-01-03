import * as planck from 'planck-js';
import { Terrain } from '../terrain/Terrain';

export class Beaver {
  private body: planck.Body;
  private health: number = 100;
  private maxHealth: number = 100;
  private radius: number = 10;
  private facing: number = 1; // 1 for right, -1 for left
  private isGrounded: boolean = false;
  private jumpForce: number = -15;
  private moveSpeed: number = 20;
  private aimAngle: number = 0; // Aim angle in radians (0 = right, PI/2 = down, -PI/2 = up)
  private world: planck.World;
  private terrain: Terrain;

  constructor(
    world: planck.World,
    terrain: Terrain,
    x: number,
    y: number
  ) {
    this.world = world;
    this.terrain = terrain;

    const bodyDef: planck.BodyDef = {
      type: 'dynamic',
      position: planck.Vec2(x, y),
      fixedRotation: false,
      linearDamping: 0.5
    };

    this.body = world.createBody(bodyDef);
    
    const shape = planck.Circle(this.radius);
    const fixtureDef: planck.FixtureDef = {
      shape: shape,
      density: 1.0,
      friction: 0.5,
      restitution: 0.3
    };

    this.body.createFixture(fixtureDef);
  }

  getBody(): planck.Body {
    return this.body;
  }

  getPosition(): planck.Vec2 {
    return this.body.getPosition();
  }

  getHealth(): number {
    return this.health;
  }

  getMaxHealth(): number {
    return this.maxHealth;
  }

  getFacing(): number {
    return this.facing;
  }

  getAimAngle(): number {
    return this.aimAngle;
  }

  adjustAimAngle(delta: number): void {
    this.aimAngle += delta;
    // Clamp angle to reasonable range: -2*PI/3 to 2*PI/3
    // This allows aiming from up-left to down-right when facing right
    const maxAngle = (2 * Math.PI) / 3;
    this.aimAngle = Math.max(-maxAngle, Math.min(maxAngle, this.aimAngle));
  }

  setPhysicsActive(active: boolean): void {
    this.body.setActive(active);
  }

  isAlive(): boolean {
    return this.health > 0;
  }

  moveLeft(): void {
    if (!this.isAlive()) return;
    const vel = this.body.getLinearVelocity();
    this.body.setLinearVelocity(planck.Vec2(-this.moveSpeed, vel.y));
    this.facing = -1;
  }

  moveRight(): void {
    if (!this.isAlive()) return;
    const vel = this.body.getLinearVelocity();
    this.body.setLinearVelocity(planck.Vec2(this.moveSpeed, vel.y));
    this.facing = 1;
  }

  jump(): void {
    if (!this.isAlive() || !this.isGrounded) return;
    const vel = this.body.getLinearVelocity();
    this.body.setLinearVelocity(planck.Vec2(vel.x, this.jumpForce));
    this.isGrounded = false;
  }

  applyDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
  }

  applyKnockback(impulseX: number, impulseY: number): void {
    this.body.applyLinearImpulse(planck.Vec2(impulseX, impulseY), this.body.getWorldCenter(), true);
  }

  update(): void {
    // Resolve terrain collision via pixel sampling
    this.resolveTerrainCollision();
    
    // Check if grounded by checking position below
    const pos = this.body.getPosition();
    const checkY = pos.y + this.radius + 2;
    this.isGrounded = this.terrain.isSolid(pos.x, checkY);
    
    // Apply friction when grounded
    if (this.isGrounded) {
      const vel = this.body.getLinearVelocity();
      this.body.setLinearVelocity(planck.Vec2(vel.x * 0.8, vel.y));
    }
  }

  private resolveTerrainCollision(): void {
    const pos = this.body.getPosition();
    const radius = this.radius;
    
    // Check multiple points around the circle
    const checkPoints = [
      { x: pos.x, y: pos.y }, // Center
      { x: pos.x + radius, y: pos.y }, // Right
      { x: pos.x - radius, y: pos.y }, // Left
      { x: pos.x, y: pos.y + radius }, // Bottom
      { x: pos.x, y: pos.y - radius }, // Top
      { x: pos.x + radius * 0.7, y: pos.y + radius * 0.7 }, // Bottom-right
      { x: pos.x - radius * 0.7, y: pos.y + radius * 0.7 }, // Bottom-left
    ];
    
    let pushX = 0;
    let pushY = 0;
    let collisionCount = 0;
    
    for (const point of checkPoints) {
      if (this.terrain.isSolid(point.x, point.y)) {
        const dx = point.x - pos.x;
        const dy = point.y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          // Push away from terrain
          const pushDist = radius - dist;
          pushX += (-dx / dist) * pushDist;
          pushY += (-dy / dist) * pushDist;
          collisionCount++;
        }
      }
    }
    
    if (collisionCount > 0) {
      // Average push vector and apply
      pushX /= collisionCount;
      pushY /= collisionCount;
      this.body.setPosition(planck.Vec2(pos.x + pushX, pos.y + pushY));
      
      // Also reduce velocity when colliding
      const vel = this.body.getLinearVelocity();
      this.body.setLinearVelocity(planck.Vec2(vel.x * 0.5, vel.y * 0.5));
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const pos = this.body.getPosition();
    const pixelX = pos.x;
    const pixelY = pos.y;

    if (!this.isAlive()) {
      ctx.fillStyle = '#666';
    } else {
      ctx.fillStyle = '#FF6B6B';
    }

    ctx.beginPath();
    ctx.arc(pixelX, pixelY, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw facing indicator
    if (this.isAlive()) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pixelX, pixelY);
      ctx.lineTo(pixelX + this.facing * this.radius * 1.5, pixelY);
      ctx.stroke();
    }

    // Draw health bar
    const barWidth = this.radius * 2;
    const barHeight = 4;
    const barX = pixelX - barWidth / 2;
    const barY = pixelY - this.radius - 8;

    ctx.fillStyle = '#FF0000';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(barX, barY, barWidth * (this.health / this.maxHealth), barHeight);
  }

  destroy(): void {
    if (this.body) {
      this.world.destroyBody(this.body);
    }
  }
}

