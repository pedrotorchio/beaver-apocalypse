import { TurnManager, TurnPhase } from '../core/TurnManager';
import { PhysicsWorld } from '../core/PhysicsWorld';
import { Beaver } from '../entities/Beaver';

export interface PhaseServiceOptions {
  turnManager: TurnManager;
  physicsWorld: PhysicsWorld;
  getAliveBeavers: () => Beaver[];
  onPowerReset: () => void;
}

export class PhaseService {
  private turnManager: TurnManager;
  private physicsWorld: PhysicsWorld;
  private getAliveBeavers: () => Beaver[];
  private onPowerReset: () => void;

  constructor(options: PhaseServiceOptions) {
    this.turnManager = options.turnManager;
    this.physicsWorld = options.physicsWorld;
    this.getAliveBeavers = options.getAliveBeavers;
    this.onPowerReset = options.onPowerReset;
  }

  handlePhaseTransitions(hasActiveProjectiles: boolean): void {
    const phase = this.turnManager.getPhase();

    // Check if projectile phase is complete
    if (phase === TurnPhase.ProjectileFlying && !hasActiveProjectiles) {
      this.turnManager.beginPhysicsSettling();
    }

    // Check if physics has settled
    if (phase === TurnPhase.PhysicsSettling) {
      if (this.physicsWorld.isSettled(0.5)) {
        this.handleTurnEnd();
      }
    }
  }

  handleDeadBeaver(): void {
    this.turnManager.endTurn();
    this.turnManager.beginPlayerInput();
  }

  private handleTurnEnd(): void {
    // Check for game over
    const aliveBeavers = this.getAliveBeavers();
    if (aliveBeavers.length <= 1) {
      // Game over logic could go here
    }
    
    this.turnManager.endTurn();
    this.turnManager.beginPlayerInput();
    this.onPowerReset();
  }
}

