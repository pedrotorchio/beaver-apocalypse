import * as planck from "planck-js";
import { Terrain } from "./Terrain";
import { CoreModules } from "../core/GameInitializer";
import { Beaver } from "./Beaver";
import * as vec from "../general/vector";

export interface ProjectileOptions {
  world: planck.World;
  terrain: Terrain;
  core: CoreModules;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
}

/**
 * Represents a weapon projectile (bazooka shell) fired by a beaver.
 *
 * This class is responsible for:
 * - Managing the projectile's physics body and flight trajectory
 * - Detecting collisions with terrain using pixel sampling
 * - Triggering explosions when colliding with terrain or going out of bounds
 * - Destroying terrain in a circular area upon explosion
 * - Applying damage and knockback to nearby beavers based on explosion radius
 * - Rendering the projectile's visual representation (body and trail)
 *
 * Projectiles are created when a beaver fires a weapon and become inactive
 * after exploding. The projectile continuously checks for terrain collisions
 * and automatically triggers its explosion effect when contact is detected.
 */
export class Projectile {
  private options: ProjectileOptions;
  private body: planck.Body;
  private active: boolean = true;
  public static readonly radius: number = 4;
  private explosionRadius: number = 30;
  private damage: number = 50;

  constructor(options: ProjectileOptions) {
    this.options = options;

    const bodyDef: planck.BodyDef = {
      type: "dynamic",
      position: planck.Vec2(options.x, options.y),
      bullet: true, // Continuous collision detection
    };

    this.body = options.world.createBody(bodyDef);

    const shape = planck.Circle(this.radius);
    const fixtureDef: planck.FixtureDef = {
      shape: shape,
      density: 0.1,
      friction: 0.0,
      restitution: 0.5,
    };

    this.body.createFixture(fixtureDef);
    this.body.setLinearVelocity(planck.Vec2(options.velocityX, options.velocityY));
    
    // Store reference to this projectile on the body for contact detection
    this.body.setUserData({ type: 'projectile', instance: this });
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

  update(beavers: Beaver[]): boolean {
    if (!this.active) return false;

    const hitBeaver = this.checkBeaverCollisions(beavers);
    if (hitBeaver) {
      this.handleBeaverCollision(beavers, hitBeaver);
      return false;
    }

    if (this.checkTerrainCollision()) {
      this.handleTerrainCollision(beavers);
      return false;
    }

    if (this.checkOutOfBounds()) {
      this.handleOutOfBounds();
      return false;
    }

    return true;
  }

  private checkBeaverCollisions(beavers: Beaver[]): Beaver | null {
    const hitBeaver = this.checkPhysicsContactCollisions(beavers);
    if (hitBeaver) return hitBeaver;

    return this.checkDistanceCollisions(beavers);
  }

  private checkPhysicsContactCollisions(beavers: Beaver[]): Beaver | null {
    let contact = this.options.world.getContactList();
    while (contact !== null) {
      if (contact.isTouching()) {
        const beaverBody = this.findBeaverBodyInContact(contact);
        if (beaverBody) {
          const hitBeaver = beavers.find(b => b.getBody() === beaverBody);
          if (hitBeaver && hitBeaver.isAlive()) {
            return hitBeaver;
          }
        }
      }
      contact = contact.getNext();
    }

    return null;
  }

  private findBeaverBodyInContact(contact: planck.Contact): planck.Body | null {
    const fixtureA = contact.getFixtureA();
    const fixtureB = contact.getFixtureB();
    const bodyA = fixtureA.getBody();
    const bodyB = fixtureB.getBody();
    
    const userDataA = bodyA.getUserData() as { type?: string; instance?: unknown } | null;
    const userDataB = bodyB.getUserData() as { type?: string; instance?: unknown } | null;

    const isThisProjectile = (userData: { type?: string; instance?: unknown } | null): boolean => {
      return userData?.type === 'projectile' && userData?.instance === this;
    };

    const isBeaver = (userData: { type?: string; instance?: unknown } | null): boolean => {
      return userData?.type === 'beaver';
    };

    if (isThisProjectile(userDataA) && isBeaver(userDataB)) {
      return bodyB;
    }

    if (isThisProjectile(userDataB) && isBeaver(userDataA)) {
      return bodyA;
    }

    return null;
  }

  private checkDistanceCollisions(beavers: Beaver[]): Beaver | null {
    const pos = this.body.getPosition();

    for (const beaver of beavers) {
      if (!beaver.isAlive()) continue;

      const beaverPos = beaver.getPosition();
      const beaverRadius = beaver.getRadius();
      const directHitThreshold = beaverRadius + this.radius;
      const distance = vec.distance(pos, beaverPos);
      if (distance > directHitThreshold) continue;

      return beaver;
    }

    return null;
  }

  private handleBeaverCollision(beavers: Beaver[], hitBeaver: Beaver): void {
    this.explode(beavers, hitBeaver);
  }

  private checkTerrainCollision(): boolean {
    const pos = this.body.getPosition();
    
    // Check terrain collision via pixel sampling at center
    if (this.options.terrain.isSolid(pos.x, pos.y)) {
      return true;
    }

    // Also check a few points around the projectile for better detection
    const checkOffsets = [
      { x: this.radius, y: 0 },
      { x: -this.radius, y: 0 },
      { x: 0, y: this.radius },
      { x: 0, y: -this.radius },
    ];

    for (const offset of checkOffsets) {
      if (this.options.terrain.isSolid(pos.x + offset.x, pos.y + offset.y)) {
        return true;
      }
    }

    return false;
  }

  private handleTerrainCollision(beavers: Beaver[]): void {
    this.explode(beavers);
  }

  private checkOutOfBounds(): boolean {
    const pos = this.body.getPosition();
    return (
      pos.x < 0 ||
      pos.x > this.options.terrain.getWidth() ||
      pos.y < 0 ||
      pos.y > this.options.terrain.getHeight()
    );
  }

  private handleOutOfBounds(): void {
    this.active = false;
    this.destroy();
  }

  explode(beavers: Beaver[], directHitBeaver?: Beaver): void {
    if (!this.active) return;

    const pos = this.body.getPosition();
    this.options.terrain.destroyCircle(pos.x, pos.y, this.explosionRadius);
    this.damageBeavers(beavers, pos, directHitBeaver);

    this.active = false;
    this.destroy();
  }

  private damageBeavers(beavers: Beaver[], explosionPos: planck.Vec2, directHitBeaver?: Beaver): void {
    const maxDistance = this.explosionRadius * 1.1;

    for (const beaver of beavers) {
      const beaverPos = beaver.getPosition();
      const distance = vec.distance(explosionPos, beaverPos);
      if (distance >= maxDistance) continue;

      const damage = this.calculateDamage(distance, maxDistance, directHitBeaver === beaver);
      beaver.applyDamage(damage);
      this.applyKnockback(beaver, beaverPos, explosionPos);
    }
  }

  private calculateDamage(distance: number, maxDistance: number, isDirectHit: boolean): number {
    let damage = this.damage * (1 - distance / maxDistance);
    if (isDirectHit) {
      damage *= 1.2;
    }
    return damage;
  }

  private applyKnockback(beaver: Beaver, beaverPos: planck.Vec2, explosionPos: planck.Vec2): void {
    const knockback = 10;
    const direction = vec.normalize(vec.subtract(beaverPos, explosionPos));
    const impulse = vec.scale(direction, knockback);
    beaver.applyKnockback(impulse.x, impulse.y);
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    const pos = this.body.getPosition();

    // Draw main projectile body
    ctx.fillStyle = "#FFA500";
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw trail/border
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, this.radius + 2, 0, Math.PI * 2);
    ctx.stroke();

  }

  destroy(): void {
    if (this.body) {
      this.options.world.destroyBody(this.body);
    }
  }
}
