import * as planck from "planck-js";
import { Aim } from "./Aim";
import { Projectile } from "./Projectile";
import type { GameModules } from "../core/types/GameModules.type";
import type { Updates } from "../core/types/Updates.type";
import type { Renders } from "../core/types/Renders.type";
import * as vec from "../general/vector";
import type { Vec2Like } from "../general/vector";
import { DevtoolsTab, useDevtoolsStore } from "../devtools/store";
import { TileSheet } from "../general/TileSheet";
import { RockProjectile, RockProjectileArguments } from "./projectiles/RockProjectile";
import { AssetLoader } from "../general/AssetLoader";

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
  private facing: number = 1; // 1 for right, -1 for left
  private jumpForce: number = -50;
  private moveSpeed: number = 20;
  private devtoolsTab: DevtoolsTab;
  private tilesheet = new TileSheet({
    image: AssetLoader.getAsset<HTMLImageElement>("beaver1_sprites"),
    tileWidth: 223,
    tileHeight: 223,
    states: [
      { key: "idle", x: 0, y: 18, width: 210, height: 220},
      { key: "walking", x: 261, y: 25, width: 235, height: 209},  
      { key: "jumping", x: 526, y: 10, width: 241, height: 224},
      { key: "attacking", x: 786, y: 0, width: 296, height: 229},
      { key: "dead", x: 1078, y: 110, width: 366, height: 138},
      ["hit", "idle"],
    ]
  })
  private state: BeaverState = "idle";
  private stateFramesCount: number = 0;
  setState(state: BeaverState): void {
    this.state = state;
    this.stateFramesCount = 0;
  }
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

  set isGrounded(value: boolean) {
    this.#isGrounded = value;
  }

  get isGrounded(): boolean {
    return this.#isGrounded;
  }

  get checkPointsArray(): { x: number; y: number }[] {
    return Object.values(this.checkPoints);
  }

  constructor(private readonly name: string, private game: GameModules, private args: BeaverArguments) {
    this.tilesheet.setRenderSize(2*this.radius, 2*this.radius);
    const bodyDef: planck.BodyDef = {
      type: "dynamic",
      position: planck.Vec2(args.x, args.y),
      fixedRotation: false,
      linearDamping: 0.5,
    };

    this.body = game.world.createBody(bodyDef);

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

  resolveBeaverState(): BeaverState {
    const SPEED_THRESHOLD = 0.2;
    const isGrounded = this.#isGrounded;
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

    // Resolve terrain collision via pixel sampling
    // This also sets isGrounded based on bottom check points
    this.resolveTerrainCollision();
    const isMovingUpward = this.body.getLinearVelocity().y < 0;

    // Apply friction and stop sliding when grounded
    // Don't apply friction if jumping (upward velocity)
    if (this.#isGrounded && !isMovingUpward) {
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
    if (!this.isAlive() || !this.#isGrounded) return;
    const vel = this.body.getLinearVelocity();
    this.body.setLinearVelocity(planck.Vec2(vel.x, this.jumpForce));
    this.isGrounded = false;
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
    const fireDir = vec.fromAngle(fireAngle);
    const velocityVec = vec.scale(fireDir, power * powerMultiplier);
    const velocity = planck.Vec2(velocityVec.x, velocityVec.y);


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
    const fireDir = vec.fromAngle(fireAngle);
    const baseOffsetDistance = this.radius + projectileRadius;
    
    // Scale distance based on power (normalized between min and max power)
    const currentPower = power ?? aim.getPower();
    const minPower = aim.getMinPower();
    const maxPower = aim.getMaxPower();
    const powerRatio = (currentPower - minPower) / (maxPower - minPower);
    const minDistance = baseOffsetDistance * 1.2;
    const maxDistance = baseOffsetDistance * 2.5;
    const offsetDistance = minDistance + (maxDistance - minDistance) * powerRatio;
    
    const offset = vec.scale(fireDir, offsetDistance);

    return planck.Vec2(pos.x + offset.x, pos.y + offset.y);
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

  // ========== UTILITY METHODS ==========
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
    const drawLineTo = (point: { x: number; y: number }) => {
      const ctx = this.game.canvas;
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
    // Check if grounded by checking bottom points
    this.isGrounded = false;
    for (const point of checkPoints) {
      // Draw lines from center (pos) to each point (checkPoints) (DEBUG)
      drawLineTo(point);
      if (!this.game.terrain.isSolid(point.x, point.y)) continue;
      // Check isGrounded
      // this is a bottom point (y >= pos.y) and if it's on solid ground
      if (point.y >= pos.y && this.game.terrain.isSolid(point.x, point.y)) {
        this.isGrounded = true;
      }

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

  render(): void {
    const ctx = this.game.canvas;
    const pos = this.body.getPosition();
    const pixelX = pos.x;
    const pixelY = pos.y;

    // Draw beaver sprite using tilesheet
    this.tilesheet.drawImage(ctx, this.state, pixelX, pixelY, this.facing as 1 | -1);

    // Draw collision circle border for debugging
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(pixelX, pixelY, this.radius, 0, Math.PI * 2);
    ctx.stroke();

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
      this.game.world.destroyBody(this.body);
    }
  }
}
