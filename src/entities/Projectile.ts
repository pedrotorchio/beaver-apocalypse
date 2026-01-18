import * as planck from "planck-js";
import { Terrain } from "./Terrain";
import { CoreModules } from "../core/GameInitializer";
import { Beaver } from "./Beaver";
import * as vec from "../general/vector";
import { useObservable } from "../general/observable";

export interface GameModules {
  world: planck.World;
  terrain: Terrain;
  core: CoreModules;
  canvas: CanvasRenderingContext2D;
}

export interface ProjectileOptions {
  position: planck.Vec2;
  velocity: planck.Vec2;
  radius: number;
  damage: number;
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
export abstract class Projectile {
  private body: planck.Body;
  private active: boolean = true;
  public static bounceOffMode = false;
  public readonly on = useObservable({
    collision: () => null,
  });

  constructor(
    protected modules: GameModules,
    protected options: ProjectileOptions
  ) {
    const bodyDef: planck.BodyDef = {
      type: "dynamic",
      position: options.position,
      bullet: true, // Continuous collision detection
    };

    this.body = modules.world.createBody(bodyDef);
    const shape = planck.Circle(this.options.radius);
    const fixtureDef: planck.FixtureDef = {
      shape: shape,
      density: 0.1,
      friction: 0.0,
      restitution: 0.5,
    };

    this.body.createFixture(fixtureDef);
    this.body.setLinearVelocity(options.velocity);
    
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

  get explosionRadius(): number {
    return this.options.radius * 8 + this.options.damage * 0.3;
  }

  get beaverKnockback(): number {
    return this.options.damage * 0.25 + this.options.radius * 0.75;
  }

  get maxDamageDistance(): number {
    return this.explosionRadius * 1.1;
  }

  alertCollision() {
    this.on.notify("collision");
  }

  update(beavers: Beaver[]): boolean {
    if (!this.active) return false;

    const hitBeaver = !Projectile.bounceOffMode && this.checkBeaverCollisions(beavers);
    if (hitBeaver) {
      this.explode(beavers, hitBeaver);
      this.alertCollision();
      this.destroy();
      return false;
    }

    if (this.checkTerrainCollision()) {
      this.explode(beavers);
      this.alertCollision();
      this.destroy();
      return false;
    }

    if (this.checkOutOfBounds()) {
      this.active = false;
      this.alertCollision();
      this.destroy();
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
    let contact = this.modules.world.getContactList();
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
      const directHitThreshold = beaverRadius + this.options.radius;
      const distance = vec.distance(pos, beaverPos);
      if (distance > directHitThreshold) continue;

      return beaver;
    }

    return null;
  }

  private checkTerrainCollision(): boolean {
    const pos = this.body.getPosition();
    
    // Check terrain collision via pixel sampling at center
    if (this.modules.terrain.isSolid(pos.x, pos.y)) {
      return true;
    }

    // Also check a few points around the projectile for better detection
    const checkOffsets = [
      { x: this.options.radius, y: 0 },
      { x: -this.options.radius, y: 0 },
      { x: 0, y: this.options.radius },
      { x: 0, y: -this.options.radius },
    ];

    for (const offset of checkOffsets) {
      if (this.modules.terrain.isSolid(pos.x + offset.x, pos.y + offset.y)) {
        return true;
      }
    }

    return false;
  }

  private checkOutOfBounds(): boolean {
    const pos = this.body.getPosition();
    return (
      pos.x < 0 ||
      pos.x > this.modules.terrain.getWidth() ||
      pos.y < 0 ||
      pos.y > this.modules.terrain.getHeight()
    );
  }

  explode(beavers: Beaver[], directHitBeaver?: Beaver): void {
    const pos = this.body.getPosition();
    this.modules.terrain.destroyCircle(pos.x, pos.y, this.explosionRadius);
    this.damageBeavers(beavers, pos, directHitBeaver);

    this.active = false;
  }

  private damageBeavers(beavers: Beaver[], explosionPos: planck.Vec2, directHitBeaver?: Beaver): void {
    const maxDistance = this.maxDamageDistance;

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
    let damage = this.options.damage * (1 - distance / maxDistance);
    if (isDirectHit) {
      damage *= 1.2;
    }
    return damage;
  }

  private applyKnockback(beaver: Beaver, beaverPos: planck.Vec2, explosionPos: planck.Vec2): void {
    const direction = vec.normalize(vec.subtract(beaverPos, explosionPos));
    const impulse = vec.scale(direction, this.beaverKnockback);
    beaver.applyKnockback(impulse.x, impulse.y);
  }

  abstract render(): void;
  

  destroy(): void {
    if (this.body) {
      this.modules.world.destroyBody(this.body);
    }
    this.on.destroy();
  }
}
