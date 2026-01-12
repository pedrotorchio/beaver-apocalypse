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
  private radius: number = 4;
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
    // Check for direct beaver collision via physics contacts
    // This catches collisions that happen during the physics step
    const pos = this.body.getPosition();
    const contactList = this.options.world.getContactList();
    for (let contact = contactList; contact; contact = contact.getNext()) {
      if (!contact.isTouching()) continue;
      
      const fixtureA = contact.getFixtureA();
      const fixtureB = contact.getFixtureB();
      const bodyA = fixtureA.getBody();
      const bodyB = fixtureB.getBody();
      
      // Check if this projectile is involved in the contact
      let projectileBody: planck.Body | null = null;
      let beaverBody: planck.Body | null = null;
      
      const userDataA = bodyA.getUserData() as { type?: string; instance?: unknown } | null;
      const userDataB = bodyB.getUserData() as { type?: string; instance?: unknown } | null;
      
      if (userDataA && userDataA.type === 'projectile' && userDataA.instance === this) {
        projectileBody = bodyA;
        if (userDataB && userDataB.type === 'beaver') {
          beaverBody = bodyB;
        }
      } else if (userDataB && userDataB.type === 'projectile' && userDataB.instance === this) {
        projectileBody = bodyB;
        if (userDataA && userDataA.type === 'beaver') {
          beaverBody = bodyA;
        }
      }
      
      if (projectileBody && beaverBody) {
        // Direct hit detected - find the beaver instance
        const hitBeaver = beavers.find(b => b.getBody() === beaverBody);
        if (hitBeaver && hitBeaver.isAlive()) {
          return hitBeaver;
        }
      }
    }

    // Also check distance as fallback (in case contact wasn't detected yet)
    const beaverRadius = 10;
    const directHitThreshold = beaverRadius + this.radius;
    for (const beaver of beavers) {
      if (!beaver.isAlive()) continue;
      const beaverPos = beaver.getPosition();
      const distance = vec.distance(pos, beaverPos);
      if (distance <= directHitThreshold) {
        return beaver;
      }
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

    // Destroy terrain
    this.options.terrain.destroyCircle(pos.x, pos.y, this.explosionRadius);

    // Damage and knockback beavers
    for (const beaver of beavers) {
      const beaverPos = beaver.getPosition();
      const distance = vec.distance(pos, beaverPos);

      if (distance < this.explosionRadius + 10) {
        let damage = this.damage * (1 - distance / (this.explosionRadius + 10));
        
        // Apply 1.2x damage multiplier for direct hits
        if (directHitBeaver === beaver) {
          damage *= 1.2;
        }
        
        beaver.applyDamage(damage);

        const knockback = 10;
        const direction = vec.normalize(vec.subtract(beaverPos, pos));
        const impulse = vec.scale(direction, knockback);
        beaver.applyKnockback(impulse.x, impulse.y);
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
      this.options.world.destroyBody(this.body);
    }
  }
}
