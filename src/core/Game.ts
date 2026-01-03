import { TurnManager, TurnPhase } from './TurnManager';
import { InputManager } from '../input/InputManager';
import { PhysicsWorld } from './PhysicsWorld';
import { Terrain } from '../terrain/Terrain';
import { Beaver } from '../entities/Beaver';
import { Projectile } from '../entities/Projectile';
import { Renderer } from '../render/Renderer';
import * as planck from 'planck-js';

export class Game {
  private canvas: HTMLCanvasElement;
  private turnManager: TurnManager;
  private inputManager: InputManager;
  private physicsWorld: PhysicsWorld;
  private terrain: Terrain;
  private beavers: Beaver[] = [];
  private projectiles: Projectile[] = [];
  private renderer: Renderer;
  private running: boolean = false;
  private aimPower: number = 15; // Base projectile speed (deprecated, using currentPower now)
  private currentPower: number = 10; // Current accumulated power
  private maxPower: number = 100; // Maximum power
  private minPower: number = 10; // Minimum power
  private powerAccumulationRate: number = 1; // Power increase per frame (at 60fps)

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.turnManager = new TurnManager(2);
    this.inputManager = new InputManager();
    this.physicsWorld = new PhysicsWorld();
    this.terrain = new Terrain(canvas.width, canvas.height);
    this.renderer = new Renderer(canvas);
    
    this.initializeGame();
  }

  private initializeGame(): void {
    // Create two beavers at different positions
    const beaver1 = new Beaver(
      this.physicsWorld.getWorld(),
      this.terrain,
      this.canvas.width * 0.25,
      this.canvas.height * 0.3
    );
    
    const beaver2 = new Beaver(
      this.physicsWorld.getWorld(),
      this.terrain,
      this.canvas.width * 0.75,
      this.canvas.height * 0.3
    );
    
    this.beavers.push(beaver1, beaver2);
    
        // Start first turn
    this.turnManager.startTurn();
    this.turnManager.beginPlayerInput();
    this.currentPower = this.minPower;
  }

  start(): void {
    this.running = true;
    this.currentPower = this.minPower;
    this.gameLoop();
  }

  private gameLoop(): void {
    if (!this.running) return;
    
    this.update();
    this.render();
    
    requestAnimationFrame(() => this.gameLoop());
  }

  private update(): void {
    // Update physics
    this.physicsWorld.step();
    
    // Update beavers
    for (const beaver of this.beavers) {
      beaver.update();
    }
    
    // Handle turn logic
    const phase = this.turnManager.getPhase();
    const currentPlayerIndex = this.turnManager.getCurrentPlayerIndex();
    const currentBeaver = this.beavers[currentPlayerIndex];
    
    if (phase === TurnPhase.PlayerInput && this.turnManager.canAcceptInput()) {
      this.handlePlayerInput(currentBeaver);
    }
    
    // Update projectiles
    const activeProjectiles: Projectile[] = [];
    for (const projectile of this.projectiles) {
      if (projectile.isActive()) {
        const stillActive = projectile.update(this.beavers);
        if (stillActive) {
          activeProjectiles.push(projectile);
        }
      }
    }
    this.projectiles = activeProjectiles;
    
    // Check if projectile phase is complete
    if (phase === TurnPhase.ProjectileFlying && this.projectiles.length === 0) {
      this.turnManager.beginPhysicsSettling();
    }
    
    // Check if physics has settled
    if (phase === TurnPhase.PhysicsSettling) {
      if (this.physicsWorld.isSettled(0.5)) {
        // Check for game over
        const aliveBeavers = this.beavers.filter(b => b.isAlive());
        if (aliveBeavers.length <= 1) {
          // Game over logic could go here
        }
        this.turnManager.endTurn();
        this.turnManager.beginPlayerInput();
        this.currentPower = this.minPower;
      }
    }
  }

  private handlePlayerInput(beaver: Beaver): void {
    if (!beaver.isAlive()) {
      this.turnManager.endTurn();
      this.turnManager.beginPlayerInput();
      return;
    }
    
    const input = this.inputManager.getState();
    
    // Movement
    if (input.moveLeft) {
      beaver.moveLeft();
    }
    if (input.moveRight) {
      beaver.moveRight();
    }
    if (input.jump) {
      beaver.jump();
    }
    
    // Aiming: arrow keys adjust the aim angle
    // The angle is stored relative to "facing right" (0 = forward/right) and will be transformed when facing left
    // Angle convention: 0 = right, PI/2 = down, -PI/2 = up, PI = left
    const angleStep = 0.05;
    
    // Adjust angle based on arrow key inputs
    // Left/Up: decrease angle (rotate counter-clockwise / aim higher)
    // Right/Down: increase angle (rotate clockwise / aim lower)
    if (input.aimLeft || input.aimUp) {
      beaver.adjustAimAngle(-angleStep);
    }
    if (input.aimRight || input.aimDown) {
      beaver.adjustAimAngle(angleStep);
    }
    
    // Power accumulation while charging
    if (input.charging) {
      this.currentPower = Math.min(
        this.maxPower,
        this.currentPower + this.powerAccumulationRate
      );
    } else {
      // Reset power when not charging (but don't reset if we just fired)
      if (!this.inputManager.getState().fire) {
        this.currentPower = this.minPower;
      }
    }
    
    // Firing (on space release)
    if (this.inputManager.consumeFire()) {
      this.fireWeapon(beaver);
    }
  }

  private fireWeapon(beaver: Beaver): void {
    const beaverPos = beaver.getPosition();
    const facing = beaver.getFacing();
    const aimAngle = beaver.getAimAngle();
    
    // Adjust aim angle based on facing direction
    let fireAngle = aimAngle;
    if (facing === -1) {
      fireAngle = Math.PI - fireAngle;
    }
    
    // Use accumulated power for velocity
    const velocityX = Math.cos(fireAngle) * this.currentPower;
    const velocityY = Math.sin(fireAngle) * this.currentPower;
    
    // Spawn projectile slightly in front of beaver
    const offsetX = Math.cos(fireAngle) * 15;
    const offsetY = Math.sin(fireAngle) * 15;
    
    const projectile = new Projectile(
      this.physicsWorld.getWorld(),
      this.terrain,
      beaverPos.x + offsetX,
      beaverPos.y + offsetY,
      velocityX,
      velocityY
    );
    
    this.projectiles.push(projectile);
    this.turnManager.fireWeapon();
    
    // Reset power for next turn (aim angle persists)
    this.currentPower = this.minPower;
  }

  private render(): void {
    this.renderer.render(
      this.terrain,
      this.beavers,
      this.projectiles,
      this.turnManager
    );
    
    // Draw aim indicator
    if (this.turnManager.canAcceptInput()) {
      const currentBeaver = this.beavers[this.turnManager.getCurrentPlayerIndex()];
      if (currentBeaver.isAlive()) {
        const pos = currentBeaver.getPosition();
        const facing = currentBeaver.getFacing();
        let aimAngle = currentBeaver.getAimAngle();
        if (facing === -1) {
          aimAngle = Math.PI - aimAngle;
        }
        
        const input = this.inputManager.getState();
        this.renderer.renderAimIndicator(
          pos.x, 
          pos.y, 
          aimAngle, 
          input.charging ? this.currentPower * 2 : 40
        );
        
        // Render power indicator if charging
        if (input.charging) {
          this.renderer.renderPowerIndicator(pos.x, pos.y - 30, this.currentPower, this.minPower, this.maxPower);
        }
      }
    }
  }

  stop(): void {
    this.running = false;
  }
}

