import * as planck from "planck-js";
import { tilesheet } from "../assets";
import { PhysicsWorld } from "../core/PhysicsWorld";
import type { GameModules } from "../core/types/GameModules.type";
import type { Renders } from "../core/types/Renders.type";
import type { Updates } from "../core/types/Updates.type";
import { DevtoolsTab, useDevtoolsStore } from "../devtools/store";
import * as vec from "../general/vector";
import { Aim } from "./Aim";
import { Projectile } from "./Projectile";
import { RockProjectile, RockProjectileArguments } from "./projectiles/RockProjectile";
import { GroundDetection } from "./properties/GroundDetection";

export interface BeaverArguments {
  x: number;
  y: number;
  aim: Aim;
}
type BeaverState = "idle" | "walking" | "jumping" | "attacking" | "dead" | "hit";

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
  private body: planck.Body;
  private health: number = 100;
  private maxHealth: number = 100;
  private radius: number = 20;
  private mass: number = 125;
  private facing: number = 1; // 1 for right, -1 for left
  private jumpStrength: number = -PhysicsWorld.GRAVITY*this.mass;
  private moveSpeed: number = 20;
  private devtoolsTab: DevtoolsTab;
  private tilesheet = tilesheet.breaver1();
  private state: BeaverState = "idle";
  private stateFramesCount: number = 0;
  setState(state: BeaverState): void {
    this.state = state;
    this.stateFramesCount = 0;
  }

  private readonly groundDetection: GroundDetection;

  constructor(private readonly name: string, private game: GameModules, private args: BeaverArguments) {
    this.tilesheet.setRenderSize(2*this.radius, 2*this.radius);
    this.body = game.world.createBody({
      type: "dynamic",
      position: planck.Vec2(args.x, args.y),
      fixedRotation: false,
      linearDamping: 0.5,
    });

    const shape = planck.Circle(this.radius);
    this.body.createFixture({
      shape: shape,
      density: this.mass/(Math.PI*this.radius**2),
      friction: 0.5,
      restitution: 0.3,
    });
    // Store reference to this beaver on the body for contact detection
    this.body.setUserData({ type: 'beaver', instance: this });
    
    this.devtoolsTab = useDevtoolsStore().addTab(this.name);
    this.groundDetection = new GroundDetection(this.game, this.body, this.radius);
  }

  resolveBeaverState(): BeaverState {
    const SPEED_THRESHOLD = 0.2;
    const isGrounded = this.groundDetection.getIsGrounded();
    const isMovingDownward = this.body.getLinearVelocity().y > SPEED_THRESHOLD
    const isMovingUpward = this.body.getLinearVelocity().y < -SPEED_THRESHOLD;

    const isMovingSideways = Math.abs(this.body.getLinearVelocity().x) > SPEED_THRESHOLD;
    const isDead = this.state === 'dead';

    if (isMovingUpward && !isGrounded) return 'jumping';
    if (isMovingDownward && !isGrounded) return 'jumping';
    if (isDead) return 'dead';
    if (isMovingSideways && isGrounded) return 'walking';
    return 'idle';
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

  getRadius(): number {
    return this.radius;
  }

  getAim(): Aim {
    return this.args.aim;
  }

  setPhysicsActive(active: boolean): void {
    this.body.setActive(active);
  }

  isAlive(): boolean {
    return this.health > 0;
  }

  // ========== IDLE STATE ==========
  update(): void {

    this.stateFramesCount++;
    const newState = this.resolveBeaverState()
    const currentState = this.state;
    // Hit always takes over any other state
    if (
      (currentState === 'hit' && this.stateFramesCount < 30) ||
      (currentState === 'attacking' && this.stateFramesCount < 30)
    ) {/* Do nothing */}
    else this.setState(newState); 

    this.groundDetection.update();
    
    this.devtoolsTab.update("", {
      health: this.health,
      facing: this.facing,
      isGrounded: this.groundDetection.getIsGrounded(),
      position: this.body.getPosition(),
      velocity: this.body.getLinearVelocity()
    });
  }

  // ========== WALKING ACTION ==========
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

  // ========== JUMPING ACTION ==========
  /**
   * Makes the beaver jump if it is grounded.
   */
  jump(): void {
    if (!this.isAlive() || !this.groundDetection.getIsGrounded()) return;
    const point = this.body.getPosition();
    this.body.applyLinearImpulse(planck.Vec2(0, this.jumpStrength), point);
    // this.isGrounded = false;
  }

  // ========== ATTACKING ACTION ==========
  /**
   * Makes the beaver attack by firing a projectile using the current aim state.
   * @param aim - The aim object containing direction and power
   * @returns The created projectile
   */
  attack(aim: Aim): Projectile {
    if (!this.isAlive()) throw new Error("Cannot attack when beaver is dead");

    this.setState("attacking");
    const spawnPoint = this.getProjectileSpawnPoint();
    const aimAngle = aim.getAngle();

    // Adjust aim angle based on facing direction
    let fireAngle = aimAngle;
    if (this.facing === -1) {
      fireAngle = Math.PI - fireAngle;
    }

    // Calculate velocity from fire angle and power
    const power = aim.getPower();
    const powerMultiplier = 10; // Increase projectile velocity
    const direction = vec.fromAngle(fireAngle);
    const velocity = planck.Vec2(direction.x, direction.y);
    velocity.mul(power * powerMultiplier);


    // Create projectile
    const projectile = this.getProjectile(spawnPoint, velocity);
    projectile.on('collision', () => this.setState('idle'));

    return projectile;
  }

  getProjectile(position: planck.Vec2, velocity: planck.Vec2): Projectile {
    // Create GameModules for projectile
    const projectileModules: GameModules = {
      world: this.game.world,
      terrain: this.game.terrain,
      core: this.game.core,
      canvas: this.game.canvas,
    };
    const args: RockProjectileArguments = {
      position,
      velocity,
      damage: 10
    }
    return new RockProjectile(projectileModules, args);
  }

  getProjectileSpawnPoint(power?: number): planck.Vec2 {
    const pos = this.body.getPosition();
    const aim = this.args.aim;
    const aimAngle = aim.getAngle();

    // Adjust aim angle based on facing direction
    let fireAngle = aimAngle;
    if (this.facing === -1) {
      fireAngle = Math.PI - fireAngle;
    }

    // Calculate spawn offset - spawn outside beaver circle (beaver radius + projectile radius + buffer)
    const projectileRadius = 4; // Projectile.radius
    const baseOffsetDistance = this.radius + projectileRadius;
    
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
    offset.mul(offsetDistance);
    const result = pos.clone();
    result.add(offset);
    return result;
  }

  // ========== DEAD STATE ==========
  /**
   * Kills the beaver by setting health to 0.
   */
  die(): void {
    this.setState("dead");
    this.health = 0;
  }

  applyDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
  }

  applyKnockback(impulseX: number, impulseY: number): void {
    this.setState("hit");
    this.body.applyLinearImpulse(planck.Vec2(impulseX, impulseY), this.body.getWorldCenter(), true);
  }

  render(): void {
    const ctx = this.game.canvas;
    const pos = this.body.getPosition();
    const pixelX = pos.x;
    const pixelY = pos.y;

    // Draw beaver sprite using tilesheet
    this.tilesheet.drawImage(ctx, this.state, pixelX, pixelY, this.facing as 1 | -1);
    // Draw health bar
    const barWidth = this.radius * 2;
    const barHeight = 4;
    const barX = pixelX - barWidth / 2;
    const barY = pixelY - this.radius - 8;

    this.game.core.shapes.with({ bgColor: "#FF0000" }).rect(barX, barY, barWidth, barHeight);
    this.game.core.shapes.with({ bgColor: "#00FF00" }).rect(barX, barY, barWidth * (this.health / this.maxHealth), barHeight);
    const velocity = this.body.getLinearVelocity();
    if (velocity.length() > 0) {
      const velocityEnd = pos.clone();
      velocityEnd.add(velocity);
      this.game.core.shapes
        .with({ strokeColor: "green" })
        .arrow(pos, velocityEnd);
    }

    this.groundDetection.render();
  }

  destroy(): void {     
    if (this.body) {
      this.game.world.destroyBody(this.body);
    }
  }
}
