import * as planck from "planck-js";
import { Terrain } from "./Terrain";
import { Aim } from "./Aim";
import { Projectile } from "./Projectile";
import { CoreModules } from "../core/GameInitializer";

export interface BeaverOptions {
  world: planck.World;
  terrain: Terrain;
  aim: Aim;
  core: CoreModules;
  x: number;
  y: number;
}

/**
 * Represents a player-controlled beaver entity in the game.
 *
 * This class is responsible for:
 * - Managing the beaver's physics body (position, velocity, collisions)
 * - Tracking health, facing direction, and aiming state
 * - Handling movement (walk, jump) and ground detection
 * - Resolving collisions with destructible terrain using pixel sampling
 * - Applying damage and knockback from explosions
 * - Firing projectiles using the aim state
 * - Rendering the beaver's visual representation (body, facing indicator, health bar)
 *
 * Beavers are the primary player entities that can move, aim, and fire weapons.
 * Each beaver has a physics body that interacts with the terrain and can be
 * damaged by projectile explosions. The beaver's state (alive/dead, position,
 * health) is managed internally and queried by other systems.
 */
export class Beaver {
  private options: BeaverOptions;
  private body: planck.Body;
  private health: number = 100;
  private maxHealth: number = 100;
  private radius: number = 10;
  private facing: number = 1; // 1 for right, -1 for left
  private jumpForce: number = -50;
  private moveSpeed: number = 20;
  #isGrounded: boolean = false;

  get isGrounded(): boolean {
    return this.#isGrounded;
  }

  constructor(options: BeaverOptions) {
    this.options = options;

    const bodyDef: planck.BodyDef = {
      type: "dynamic",
      position: planck.Vec2(options.x, options.y),
      fixedRotation: false,
      linearDamping: 0.5,
    };

    this.body = options.world.createBody(bodyDef);

    const shape = planck.Circle(this.radius);
    const fixtureDef: planck.FixtureDef = {
      shape: shape,
      density: 1.0,
      friction: 0.5,
      restitution: 0.3,
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

  getAim(): Aim {
    return this.options.aim;
  }

  setPhysicsActive(active: boolean): void {
    this.body.setActive(active);
  }

  isAlive(): boolean {
    return this.health > 0;
  }

  /**
   * Makes the beaver walk in the specified direction.
   * @param direction -1 for left, 1 for right
   */
  walk(direction: number): void {
    if (!this.isAlive()) return;
    const vel = this.body.getLinearVelocity();
    this.body.setLinearVelocity(planck.Vec2(direction * this.moveSpeed, vel.y));
    this.facing = direction;
  }

  /**
   * Makes the beaver jump if it is grounded.
   */
  jump(): void {
    if (!this.isAlive() || !this.#isGrounded) return;
    const vel = this.body.getLinearVelocity();
    this.body.setLinearVelocity(planck.Vec2(vel.x, this.jumpForce));
    this.#isGrounded = false;
  }

  /**
   * Makes the beaver attack by firing a projectile using the current aim state.
   * @param aim - The aim object containing direction and power
   * @returns The created projectile
   */
  attack(aim: Aim): Projectile {
    if (!this.isAlive()) {
      throw new Error("Cannot attack when beaver is dead");
    }

    const pos = this.body.getPosition();
    const aimAngle = aim.getAngle();

    // Adjust aim angle based on facing direction
    let fireAngle = aimAngle;
    if (this.facing === -1) {
      fireAngle = Math.PI - fireAngle;
    }

    // Calculate velocity from fire angle and power
    const power = aim.getPower();
    const powerMultiplier = 10; // Increase projectile velocity
    const velocityX = Math.cos(fireAngle) * power * powerMultiplier;
    const velocityY = Math.sin(fireAngle) * power * powerMultiplier;

    // Calculate spawn offset
    const offsetDistance = 15;
    const offsetX = Math.cos(fireAngle) * offsetDistance;
    const offsetY = Math.sin(fireAngle) * offsetDistance;

    // Create projectile
    const projectile = new Projectile({
      world: this.options.world,
      terrain: this.options.terrain,
      core: this.options.core,
      x: pos.x + offsetX,
      y: pos.y + offsetY,
      velocityX,
      velocityY,
    });

    return projectile;
  }

  /**
   * Kills the beaver by setting health to 0.
   */
  die(): void {
    this.health = 0;
  }

  applyDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
  }

  applyKnockback(impulseX: number, impulseY: number): void {
    this.body.applyLinearImpulse(planck.Vec2(impulseX, impulseY), this.body.getWorldCenter(), true);
  }

  update(): void {
    // Resolve terrain collision via pixel sampling
    // This also sets isGrounded based on bottom check points
    this.resolveTerrainCollision();

    // Apply friction when grounded
    if (this.#isGrounded) {
      const vel = this.body.getLinearVelocity();
      this.body.setLinearVelocity(planck.Vec2(vel.x * 0.8, vel.y));
    }
  }

  private resolveTerrainCollision(): void {
    const pos = this.body.getPosition();
    const radius = this.radius;
    const vel = this.body.getLinearVelocity();

    // Check multiple points around the circle, with extra points in movement direction
    // Focus on bottom half for ground collision
    const checkPoints: { x: number; y: number }[] = [
      { x: pos.x, y: pos.y }, // Center
      { x: pos.x + radius, y: pos.y }, // Right
      { x: pos.x - radius, y: pos.y }, // Left
      { x: pos.x, y: pos.y + radius }, // Bottom
      { x: pos.x, y: pos.y - radius }, // Top
      { x: pos.x + radius * 0.7, y: pos.y + radius * 0.7 }, // Bottom-right
      { x: pos.x - radius * 0.7, y: pos.y + radius * 0.7 }, // Bottom-left
      { x: pos.x + radius * 0.7, y: pos.y - radius * 0.7 }, // Top-right
      { x: pos.x - radius * 0.7, y: pos.y - radius * 0.7 }, // Top-left
    ];

    // Add more points along the bottom arc for better ground detection
    for (let angle = -Math.PI * 0.75; angle <= -Math.PI * 0.25; angle += Math.PI / 8) {
      checkPoints.push({
        x: pos.x + Math.cos(angle) * radius,
        y: pos.y + Math.sin(angle) * radius,
      });
    }

    // Add check points in the direction of movement to catch terrain ahead
    if (Math.abs(vel.x) > 0.1 || Math.abs(vel.y) > 0.1) {
      const moveDirX = vel.x !== 0 ? vel.x / Math.abs(vel.x) : 0;
      const moveDirY = vel.y !== 0 ? vel.y / Math.abs(vel.y) : 0;

      // Check ahead in movement direction
      checkPoints.push(
        { x: pos.x + moveDirX * radius * 1.2, y: pos.y + moveDirY * radius * 1.2 },
        { x: pos.x + moveDirX * radius * 0.8, y: pos.y },
        { x: pos.x, y: pos.y + moveDirY * radius * 0.8 }
      );
    }

    let pushX = 0;
    let pushY = 0;
    let collisionCount = 0;
    let maxPenetration = 0;
    
    // Check if grounded by checking bottom points
    this.#isGrounded = false;
    for (const point of checkPoints) {
      // Check if this is a bottom point (y >= pos.y) and if it's on solid ground
      if (point.y >= pos.y && this.options.terrain.isSolid(point.x, point.y)) {
        this.#isGrounded = true;
      }
      
      if (!this.options.terrain.isSolid(point.x, point.y)) continue;

      const dx = point.x - pos.x;
      const dy = point.y - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= 0) continue;

      // Calculate penetration depth
      const penetration = radius - dist;
      if (penetration > maxPenetration) maxPenetration = penetration;

      // Push away from terrain (stronger push for deeper penetration)
      const pushStrength = Math.max(penetration, radius * 0.1);
      pushX += (-dx / dist) * pushStrength;
      pushY += (-dy / dist) * pushStrength;
      collisionCount++;
    }

    if (collisionCount > 0) {
      // Average push vector and apply
      pushX /= collisionCount;
      pushY /= collisionCount;

      // Normalize push direction
      const pushDist = Math.sqrt(pushX * pushX + pushY * pushY);
      if (pushDist > 0) {
        // Use actual penetration depth, but cap it to prevent over-correction
        const pushMagnitude = Math.min(maxPenetration + radius * 0.1, radius * 0.5);
        pushX = (pushX / pushDist) * pushMagnitude;
        pushY = (pushY / pushDist) * pushMagnitude;
      }

      // Apply smooth correction
      const correctionFactor = Math.min(maxPenetration / radius + 0.2, 1.2);
      this.body.setPosition(
        planck.Vec2(pos.x + pushX * correctionFactor, pos.y + pushY * correctionFactor)
      );

      // Smoothly cancel velocity component going into terrain
      const currentVel = this.body.getLinearVelocity();
      const pushDirX = pushDist > 0 ? pushX / pushDist : 0;
      const pushDirY = pushDist > 0 ? pushY / pushDist : 0;

      // Calculate velocity component in push direction
      const velInPushDir = currentVel.x * pushDirX + currentVel.y * pushDirY;

      if (velInPushDir < 0) {
        // Velocity is going into terrain, cancel it smoothly
        const cancelX = -velInPushDir * pushDirX;
        const cancelY = -velInPushDir * pushDirY;
        this.body.setLinearVelocity(planck.Vec2(currentVel.x + cancelX, currentVel.y + cancelY));
      } else {
        // Just reduce velocity when colliding (but not too much to allow sliding)
        this.body.setLinearVelocity(planck.Vec2(currentVel.x * 0.6, currentVel.y * 0.6));
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const pos = this.body.getPosition();
    const pixelX = pos.x;
    const pixelY = pos.y;

    if (!this.isAlive()) {
      ctx.fillStyle = "#666";
    } else {
      ctx.fillStyle = "#FF6B6B";
    }

    ctx.beginPath();
    ctx.arc(pixelX, pixelY, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw facing indicator
    if (this.isAlive()) {
      ctx.strokeStyle = "#000";
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

    ctx.fillStyle = "#FF0000";
    ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.fillStyle = "#00FF00";
    ctx.fillRect(barX, barY, barWidth * (this.health / this.maxHealth), barHeight);
  }

  destroy(): void {
    if (this.body) {
      this.options.world.destroyBody(this.body);
    }
  }
}
