import * as planck from "planck-js";
import type { GameModules } from "../core/types/GameModules.type";
import type { Renders } from "../core/types/Renders.type";
import type { Updates } from "../core/types/Updates.type";
import flags from "../flags";
import { EventHub } from "../general/eventHub";
import { ZERO } from "../general/vector";
import { Beaver } from "./beaver/Beaver";
import { GroundDetection } from "./properties/GroundDetection";

export interface ProjectileArguments {
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
export abstract class Projectile implements Renders, Updates {
  #body: planck.Body;
  #active: boolean = true;
  public readonly events = new EventHub<{
    "projectile:exploded": { projectile: Projectile; damagedEnemies: Beaver[]; directHitEnemy?: Beaver };
  }>();
  readonly #groundDetection: GroundDetection;

  constructor(
    protected game: GameModules,
    protected args: ProjectileArguments
  ) {
    const bodyDef: planck.BodyDef = {
      type: "dynamic",
      position: args.position,
      bullet: false,
    };

    this.#body = game.world.createBody(bodyDef);
    const shape = planck.Circle(this.args.radius);
    const fixtureDef: planck.FixtureDef = {
      shape: shape,
      density: 0.1,
      friction: 0.0,
      restitution: 0.5,
    };

    this.#body.createFixture(fixtureDef);
    this.#body.setLinearVelocity(args.velocity);

    this.#body.setUserData({ type: 'projectile', instance: this });
    this.#groundDetection = new GroundDetection(this.game, this.#body, this.args.radius);
  }

  getBody(): planck.Body {
    return this.#body;
  }

  getPosition(): planck.Vec2 {
    return this.#body.getPosition();
  }

  isActive(): boolean {
    return this.#active;
  }

  abstract get explosionRadius(): number;
  abstract get beaverKnockback(): number;
  abstract get maxDamageDistance(): number;

  private checkBeaverCollisions(beavers: Beaver[]): Beaver | null {
    let contact = this.game.world.getContactList();
    while (contact !== null) {
      if (contact.isTouching()) {
        const hitBeaver = this.findBeaverInContact(contact);
        if (hitBeaver && hitBeaver.health.isAlive()) {
          return hitBeaver;
        }
      }
      contact = contact.getNext();
    }

    return this.checkDistanceCollisions(beavers);
  }

  private findBeaverInContact(contact: planck.Contact): Beaver | null {
    const fixtureA = contact.getFixtureA();
    const fixtureB = contact.getFixtureB();
    const bodyA = fixtureA.getBody();
    const bodyB = fixtureB.getBody();

    const userDataA = bodyA.getUserData() as { type?: string; instance?: unknown } | null;
    const userDataB = bodyB.getUserData() as { type?: string; instance?: unknown } | null;

    const isThisProjectile = (userData: { type?: string; instance?: unknown } | null): boolean => {
      return userData?.type === 'projectile' && userData?.instance === this;
    };

    if (isThisProjectile(userDataA) && userDataB?.type === 'beaver') {
      return userDataB.instance as Beaver;
    }

    if (isThisProjectile(userDataB) && userDataA?.type === 'beaver') {
      return userDataA.instance as Beaver;
    }

    return null;
  }

  private checkDistanceCollisions(beavers: Beaver[]): Beaver | null {
    const pos = this.#body.getPosition();

    for (const beaver of beavers) {
      if (!beaver.health.isAlive()) continue;

      const beaverPos = beaver.body.getPosition();
      const beaverRadius = beaver.radius;
      const directHitThreshold = beaverRadius + this.args.radius;
      const distance = planck.Vec2.distance(pos, beaverPos);
      if (distance > directHitThreshold) continue;

      return beaver;
    }

    return null;
  }

  private checkOutOfBounds(): boolean {
    const pos = this.#body.getPosition();
    return (
      pos.x < 0 ||
      pos.x > this.game.terrain.getWidth() ||
      pos.y < 0 ||
      pos.y > this.game.terrain.getHeight()
    );
  }

  private explode(beavers: Beaver[], directHitBeaver?: Beaver): void {
    const pos = this.#body.getPosition();
    this.game.terrain.destroyCircle(pos.x, pos.y, this.explosionRadius);
    const damagedEnemies = this.damageBeavers(beavers, pos, directHitBeaver);

    this.events.emit("projectile:exploded", { projectile: this, damagedEnemies, directHitEnemy: directHitBeaver });

    this.#active = false;
  }

  private damageBeavers(beavers: Beaver[], explosionPos: planck.Vec2, directHitBeaver?: Beaver): Beaver[] {
    const maxDistance = this.maxDamageDistance;
    const damagedEnemies: Beaver[] = [];

    for (const beaver of beavers) {
      const beaverPos = beaver.body.getPosition();
      const distance = planck.Vec2.distance(explosionPos, beaverPos);
      // If distance is greater than affectingDistance, and the beaver is not directly hit, skip the damage calculation
      if (distance >= maxDistance && directHitBeaver !== beaver) continue;

      const damage = this.calculateDamage(distance, maxDistance, directHitBeaver === beaver);
      const explosionDistanceDirection = planck.Vec2.sub(beaverPos, explosionPos);
      const explosionDistance = explosionDistanceDirection.normalize();
      // Knockback strength drops linearly with the distance from the explosion
      const direction = explosionDistance < this.explosionRadius
        ? planck.Vec2.mul(explosionDistanceDirection, this.beaverKnockback / explosionDistance)
        : ZERO();
      beaver.hit(damage, direction);
      damagedEnemies.push(beaver);
    }

    return damagedEnemies;
  }

  private calculateDamage(distance: number, maxDistance: number, isDirectHit: boolean): number {
    if (isDirectHit) return this.args.damage;
    else if (distance >= maxDistance) return 0;
    else return this.args.damage * (1 - distance / maxDistance)
  }

  update(): void {
    if (!this.#active) return;

    this.#groundDetection.update();

    const beavers = this.game.core.entityManager.getBeavers();
    const beaversArray = beavers.toArray();
    const hitBeaver = !flags.bounceOffMode && this.checkBeaverCollisions(beaversArray);

    if (hitBeaver) {
      this.explode(beaversArray, hitBeaver);
      this.destroy();
      return;
    }

    if (this.#groundDetection.isGrounded) {
      this.explode(beaversArray);
      this.destroy();
      return;
    }

    if (this.checkOutOfBounds()) {
      this.#active = false;
      this.destroy();
      return;
    }
  }
  abstract render(): void;

  destroy(): void {
    if (this.#body) {
      this.game.world.destroyBody(this.#body);
    }
    this.events.destroy();
  }
}
