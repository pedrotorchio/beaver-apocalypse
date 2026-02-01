import * as planck from "planck-js";
import { tilesheet } from "../../assets";
import { PhysicsWorld } from "../../core/PhysicsWorld";
import { DIRECTION_RIGHT, Direction } from "../../core/types/Entity.type";
import type { GameModules } from "../../core/types/GameModules.type";
import type { Renders } from "../../core/types/Renders.type";
import type { Updates } from "../../core/types/Updates.type";
import { CCWRad, mirrorRadians } from "../../general/coordinateSystem";
import * as vec from "../../general/vector";
import { Aim } from "../Aim";
import { Projectile } from "../Projectile";
import { RockProjectile, RockProjectileArguments } from "../projectiles/RockProjectile";
import { EntityState } from "../properties/EntityState";
import { GroundDetection } from "../properties/GroundDetection";
import { Health } from "../properties/Health";
import { AlgorithmicBasedBrain } from "./brain/AlgorithmicBasedBrain";
import { BaseBrain } from "./brain/BaseBrain";

export interface BeaverArguments {
  x: number;
  y: number;
  aim: Aim;
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
export class Beaver implements Updates, Renders {
  // Private properties
  #name: string;
  get name(): string {
    return this.#name;
  }

  #body: planck.Body;
  get body(): planck.Body {
    return this.#body;
  }

  #radius: number = 20;
  get radius(): number {
    return this.#radius;
  }

  #health: Health;
  get health(): Health {
    return this.#health;
  }

  get aim(): Aim {
    return this.#args.aim;
  }

  #brain: BaseBrain;
  get brain(): BaseBrain {
    return this.#brain;
  }

  #mass: number = 125;
  #direction: Direction = DIRECTION_RIGHT;
  get direction(): Direction {
    return this.#direction;
  }
  set direction(direction: Direction) {
    if (this.#direction === direction) return;
    this.#direction = direction;
    this.aim.facing = direction;
  }

  #jumpStrength: number = -PhysicsWorld.GRAVITY * this.#mass;
  #moveSpeed: number = 20;
  #groundDetection: GroundDetection;
  #entityState = new EntityState({
    defaultState: 'idle',
    tilesheet: tilesheet.breaver1({ size: this.#radius * 2 }),
    states: {
      dead: {
        persist: true,
      },
      walking: {
        autoDetect: () => {
          const isGrounded = this.#groundDetection.isGrounded;
          const isMovingSideways = Math.abs(this.#body.getLinearVelocity().x) > SPEED_THRESHOLD;
          return isMovingSideways && isGrounded;
        },
      },
      attacking: {
        frameCountCooldown: 30,
      },
      hit: {
        frameCountCooldown: 30,
      },
    }
  });
  readonly #game: GameModules;
  readonly #args: BeaverArguments;

  constructor(name: string, game: GameModules, args: BeaverArguments) {
    window.beavers ??= {}
    window.beavers[name] = this;
    this.#name = name;
    this.#game = game;
    this.#args = args;
    this.#body = game.world.createBody({
      type: "dynamic",
      position: planck.Vec2(args.x, args.y),
      fixedRotation: false,
      linearDamping: 1,
    });

    this.#body.createFixture({
      shape: planck.Circle(this.#radius),
      density: this.#mass / (Math.PI * this.#radius ** 2),
      friction: 1,
      restitution: 0,
    });
    // Store reference to this beaver on the body for contact detection
    this.#body.setUserData({ type: 'beaver', instance: this });
    this.#groundDetection = new GroundDetection(this.#game, this.#body, this.#radius);
    this.#health = new Health({
      maxHealth: 100,
      radius: this.#radius,
      body: this.#body,
      game: this.#game,
    });
    this.#brain = new AlgorithmicBasedBrain(this.#game, this);
  }

  // Updates implementation
  update(): void {
    this.#brain.update();
    this.#groundDetection.update();
    this.#entityState.update();
    this.#health.update();
  }

  // Renders implementation
  render(): void {
    const ctx = this.#game.canvas;
    const pos = this.#body.getPosition();

    // Draw beaver sprite using tilesheet
    this.#entityState.draw(ctx, pos, this.#direction);

    // Draw health bar
    this.#health.render();

    // Draw velocity arrow
    const velocity = this.#body.getLinearVelocity();
    if (velocity.length() > 0) {
      const velocityEnd = planck.Vec2.add(pos, velocity);
      this.#game.core.shapes
        .with({ strokeColor: "green" })
        .arrow(pos, velocityEnd);
    }

    // Other
    this.#groundDetection.render();
    this.#brain.render();
  }

  // Public methods
  /**
   * Makes the beaver walk in the specified direction.
   * @param direction -1 for left, 1 for right
   */
  walk(direction: Direction): void {
    if (!this.health.isAlive()) return;
    const vel = this.#body.getLinearVelocity();
    this.#body.setLinearVelocity(planck.Vec2(direction * this.#moveSpeed, vel.y));
    this.direction = direction;
  }

  /**
   * Makes the beaver jump if it is grounded.
   */
  jump(): void {
    if (!this.health.isAlive() || !this.#groundDetection.isGrounded) return;
    const point = planck.Vec2.clone(this.#body.getPosition());
    this.#body.applyLinearImpulse(planck.Vec2(0, this.#jumpStrength), point);
  }

  /**
   * Makes the beaver attack by firing a projectile using the current aim state.
   * @param aim - The aim object containing direction and power
   * @returns The created projectile
   */
  attack(aim: Aim): Projectile {
    if (!this.health.isAlive()) throw new Error("Cannot attack when beaver is dead");

    this.#entityState.setState("attacking");
    const spawnPoint = this.getProjectileSpawnPoint();
    const aimAngle = aim.getAngle();

    // Adjust aim angle based on facing direction
    const fireAngle: CCWRad = this.#direction === -1 ? CCWRad(mirrorRadians(aimAngle)) : aimAngle;

    // Calculate velocity from fire angle and power
    const power = aim.getPower();
    const powerMultiplier = 10; // Increase projectile velocity
    const direction = vec.fromAngle(fireAngle);
    const velocity = planck.Vec2.mul(planck.Vec2(direction.x, direction.y), power * powerMultiplier);

    // Create projectile
    const projectile = this.createProjectile(spawnPoint, velocity);
    projectile.on('collision', () => this.#entityState.setState('idle'));

    return projectile;
  }

  getProjectileSpawnPoint(power?: number): planck.Vec2 {
    const pos = this.#body.getPosition();
    const aim = this.#args.aim;
    const aimAngle = aim.getAngle();

    // Adjust aim angle based on facing direction
    const fireAngle: CCWRad = this.#direction === -1 ? CCWRad(mirrorRadians(aimAngle)) : aimAngle;

    // Calculate spawn offset - spawn outside beaver circle (beaver radius + projectile radius + buffer)
    const projectileRadius = 4; // Projectile.radius
    const baseOffsetDistance = this.#radius + projectileRadius;

    // Scale distance based on power (normalized between min and max power)
    const currentPower = power ?? aim.getPower();
    const minPower = aim.getMinPower();
    const maxPower = aim.getMaxPower();
    const powerRatio = (currentPower - minPower) / (maxPower - minPower);
    const minDistance = baseOffsetDistance * 1.2;
    const maxDistance = baseOffsetDistance * 2.5;
    const offsetDistance = minDistance + (maxDistance - minDistance) * powerRatio;

    const direction = vec.fromAngle(fireAngle);
    const offset = planck.Vec2(direction.x, direction.y);
    return planck.Vec2.add(pos, planck.Vec2.mul(offset, offsetDistance));
  }

  hit(amount: number, direction: planck.Vec2): void {
    this.#health.damage(amount);
    this.#entityState.setState("hit");
    this.#body.applyLinearImpulse(planck.Vec2.clone(direction), planck.Vec2.clone(this.#body.getWorldCenter()), true);
  }

  // Private methods
  private kill(): void {
    this.#entityState.setState("dead");
    this.#health.kill();
  }

  private destroy(): void {
    if (this.#body) {
      this.#game.world.destroyBody(this.#body);
    }
  }

  // Private methods
  private createProjectile(position: planck.Vec2, velocity: planck.Vec2): Projectile {
    // Create GameModules for projectile
    const projectileModules: GameModules = {
      world: this.#game.world,
      terrain: this.#game.terrain,
      core: this.#game.core,
      canvas: this.#game.canvas,
    };
    const args: RockProjectileArguments = {
      position,
      velocity,
      damage: 10
    }
    return new RockProjectile(projectileModules, args);
  }
}

const SPEED_THRESHOLD = 0.2;
