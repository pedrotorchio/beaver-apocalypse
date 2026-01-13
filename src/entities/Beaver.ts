import * as planck from "planck-js";
import { Terrain } from "./Terrain";
import { Aim } from "./Aim";
import { Projectile } from "./Projectile";
import { CoreModules } from "../core/GameInitializer";
import * as vec from "../general/vector";
import type { Vec2Like } from "../general/vector";
import { DevtoolsTab, useDevtoolsStore } from "../devtools/store";
import { useObservable } from "../general/observable";
import { TileSheet } from "../general/TileSheet";

export interface BeaverOptions {
  world: planck.World;
  terrain: Terrain;
  aim: Aim;
  core: CoreModules;
  x: number;
  y: number;
  tilesheet: TileSheet<"idle" | "walking" | "jumping" | "attacking" | "dead">;
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
  private devtoolsTab: DevtoolsTab;
  private readonly checkPoints = {
    center: { x: 0, y: 0 },
    right: { x: 0, y: 0 },
    left: { x: 0, y: 0 },
    bottom: { x: 0, y: 0 },
    top: { x: 0, y: 0 },
    bottomRight: { x: 0, y: 0 },
    bottomLeft: { x: 0, y: 0 },
    topRight: { x: 0, y: 0 },
    topLeft: { x: 0, y: 0 },
  };
  #isGrounded: boolean = false;

  public readonly on = useObservable({
    isGrounded: () => this.#isGrounded,
  });

  set isGrounded(value: boolean) {
    const oldValue = this.#isGrounded;
    this.#isGrounded = value;
    if (oldValue !== value) this.on.notify("isGrounded", 'changed');
  }

  get isGrounded(): boolean {
    return this.#isGrounded;
  }

  get checkPointsArray(): { x: number; y: number }[] {
    return Object.values(this.checkPoints);
  }

  constructor(private readonly name: string, options: BeaverOptions) {
    this.options = options;
    this.options.tilesheet.setRenderSize(2*this.radius, 2*this.radius);
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
    
    // Store reference to this beaver on the body for contact detection
    this.body.setUserData({ type: 'beaver', instance: this });
    
    this.devtoolsTab = useDevtoolsStore().addTab(this.name);
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
    this.isGrounded = false;
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
    const fireDir = vec.fromAngle(fireAngle);
    const velocity = vec.scale(fireDir, power * powerMultiplier);

    // Calculate spawn offset
    const offsetDistance = 15;
    const offset = vec.scale(fireDir, offsetDistance);

    // Create projectile
    const projectile = new Projectile({
      world: this.options.world,
      terrain: this.options.terrain,
      core: this.options.core,
      x: pos.x + offset.x,
      y: pos.y + offset.y,
      velocityX: velocity.x,
      velocityY: velocity.y,
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

    // Apply friction and stop sliding when grounded
    // Don't apply friction if jumping (upward velocity)
    const isJumping = this.body.getLinearVelocity().y < 0;
    if (this.#isGrounded && !isJumping) {
      const MIN_VELOCITY = .2;
      const DESCELERATION_FACTOR = .2; 
      const vel = this.body.getLinearVelocity();
      const roundToZero = (v: number) => Math.sign(v) * (Math.abs(v) < MIN_VELOCITY ? 0 : v);
      this.body.setLinearVelocity(planck.Vec2(roundToZero(vel.x * DESCELERATION_FACTOR), roundToZero(vel.y * DESCELERATION_FACTOR)));
    }
    this.devtoolsTab.update("", {
      health: this.health,
      facing: this.facing,
      isGrounded: this.#isGrounded,
      position: this.body.getPosition(),
      velocity: this.body.getLinearVelocity()
    });
  }

  private createCollisionCheckPoints(
    pos: planck.Vec2,
    radius: number,
    vel: planck.Vec2
  ): { x: number; y: number }[] {
    // Check multiple points around the circle, with extra points in movement direction
    // Focus on bottom half for ground collision
    // Calculate check points dynamically based on current position
    const checkPoints: { x: number; y: number }[] = [
      { x: pos.x, y: pos.y + radius }, // bottom
      { x: pos.x, y: pos.y - radius }, // top
      { x: pos.x + radius, y: pos.y }, // right
      { x: pos.x - radius, y: pos.y }, // left
      { x: pos.x + radius * 0.7, y: pos.y + radius * 0.7 }, // bottomRight
      { x: pos.x - radius * 0.7, y: pos.y + radius * 0.7 }, // bottomLeft
      { x: pos.x + radius * 0.7, y: pos.y - radius * 0.7 }, // topRight
      { x: pos.x - radius * 0.7, y: pos.y - radius * 0.7 }, // topLeft
    ];

    // Add more points along the bottom arc for better ground detection
    for (let angle = -Math.PI * 0.75; angle <= -Math.PI * 0.25; angle += Math.PI / 8) {
      const dir = vec.fromAngle(angle);
      const scaledDir = vec.scale(dir, radius);
      checkPoints.push({
        x: pos.x + scaledDir.x,
        y: pos.y + scaledDir.y,
      });
    }

    // Add check points in the direction of movement to catch terrain ahead
    // Only check at exactly the radius to avoid false collisions outside the circle
    if (Math.abs(vel.x) > 0.1 || Math.abs(vel.y) > 0.1) {
      const moveDirX = vel.x !== 0 ? vel.x / Math.abs(vel.x) : 0;
      const moveDirY = vel.y !== 0 ? vel.y / Math.abs(vel.y) : 0;

      // Check ahead in movement direction at exactly the radius
      checkPoints.push(
        { x: pos.x + moveDirX * radius, y: pos.y + moveDirY * radius }
      );
      
      // Add perpendicular checks for better side collision detection
      if (Math.abs(vel.x) > 0.1) {
        checkPoints.push(
          { x: pos.x + moveDirX * radius, y: pos.y + radius * 0.7 },
          { x: pos.x + moveDirX * radius, y: pos.y - radius * 0.7 }
        );
      }
      if (Math.abs(vel.y) > 0.1) {
        checkPoints.push(
          { x: pos.x + radius * 0.7, y: pos.y + moveDirY * radius },
          { x: pos.x - radius * 0.7, y: pos.y + moveDirY * radius }
        );
      }
    }

    return checkPoints;
  }

  private resolveTerrainCollision(): void {
    const pos = this.body.getPosition();
    const radius = this.radius;
    const vel = this.body.getLinearVelocity();

    const checkPoints = this.createCollisionCheckPoints(pos, radius, vel);

    let pushX = 0;
    let pushY = 0;
    let collisionCount = 0;
    let maxPenetration = 0;
    
    // Check if grounded by checking bottom points
    // Don't consider grounded if moving upward (jumping)
    const currentVel = this.body.getLinearVelocity();
    this.isGrounded = false;
    if (currentVel.y < -1) {
      // Moving upward significantly, not grounded
      this.isGrounded = false;
    } else {
      for (const point of checkPoints) {
        // Check if this is a bottom point (y >= pos.y) and if it's on solid ground
        if (point.y >= pos.y && this.options.terrain.isSolid(point.x, point.y)) {
          this.isGrounded = true;
          break;
        }
      }
    }
    
    for (const point of checkPoints) {
      if (!this.options.terrain.isSolid(point.x, point.y)) continue;

      const dist = vec.distance(pos, point);

      if (dist <= 0) continue;

      // Only process if the point is actually inside or on the circle (penetration >= 0)
      // If dist > radius, the terrain is outside the circle and we shouldn't push
      const penetration = radius - dist;
      if (penetration <= 0) continue; // Skip points outside the circle

      if (penetration > maxPenetration) maxPenetration = penetration;

      // Push away from terrain (stronger push for deeper penetration)
      const pushStrength = Math.max(penetration, radius * 0.1);
      const direction = vec.normalize(vec.subtract(pos, point));
      const pushVector = vec.scale(direction, pushStrength);
      pushX += pushVector.x;
      pushY += pushVector.y;
      collisionCount++;
    }

    if (collisionCount > 0) {
      // Average push vector
      pushX /= collisionCount;
      pushY /= collisionCount;
      this.applyCollisionPush(
        { x: pushX, y: pushY },
        maxPenetration,
        pos
      );
    }
  }

  private applyCollisionPush(
    averagedPush: Vec2Like,
    maxPenetration: number,
    currentPos: planck.Vec2
  ): void {
    // Normalize and scale push vector
    const normalizePushVector = (avgPush: Vec2Like, maxPen: number, rad: number) => {
      const pushMagnitude = Math.min(maxPen + rad * 0.1, rad * 0.5);
      const normalized = vec.normalize(avgPush);
      return vec.scale(normalized, pushMagnitude);
    };

    // Calculate push direction from averaged push (before normalization)
    const pushDir = vec.normalize(averagedPush);
    const normalizedPush = normalizePushVector(averagedPush, maxPenetration, this.radius);

    // Calculate correction factor for position
    const calculateCorrectionFactor = (maxPen: number, rad: number) => {
      return Math.min(maxPen / rad + 0.1, 0.8);
    };

    const correctionFactor = calculateCorrectionFactor(maxPenetration, this.radius);

    // Calculate corrected position
    const scaledPush = vec.scale(normalizedPush, correctionFactor);
    const correctedPos = vec.add(currentPos, scaledPush);
    this.body.setPosition(planck.Vec2(correctedPos.x, correctedPos.y));

    // Calculate adjusted velocity based on collision
    const calculateAdjustedVelocity = (
      currentVel: planck.Vec2,
      pushDirection: { x: number; y: number },
      isGrounded: boolean
    ) => {
      const velInPushDir = vec.dot(currentVel, pushDirection);

      if (velInPushDir < 0) {
        // Velocity is going into terrain, cancel it smoothly
        const cancelVector = vec.scale(pushDirection, -velInPushDir);
        const adjustedVel = vec.add(currentVel, cancelVector);
        return planck.Vec2(adjustedVel.x, adjustedVel.y);
      }
      
      if (isGrounded) {
        // When grounded, prevent downward velocity to stop sliding
        // Apply slight horizontal friction to prevent excessive sliding
        return planck.Vec2(currentVel.x * 0.9, Math.max(0, currentVel.y));
      }
      
      // Just reduce velocity when colliding (but not too much to allow sliding)
      return planck.Vec2(currentVel.x * 0.8, currentVel.y * 0.8);
    };

    const currentVel = this.body.getLinearVelocity();
    const adjustedVel = calculateAdjustedVelocity(currentVel, pushDir, this.#isGrounded);
    this.body.setLinearVelocity(adjustedVel);
  }

  render(ctx: CanvasRenderingContext2D): void {
    const pos = this.body.getPosition();
    const pixelX = pos.x;
    const pixelY = pos.y;

    // Draw beaver sprite using tilesheet
    this.options.tilesheet.drawImage(ctx, "idle", pixelX, pixelY, this.facing as 1 | -1);

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
