import { TurnManager, TurnPhase } from "./TurnManager";
import { PhysicsWorld } from "../PhysicsWorld";
import { EntityManager } from "./EntityManager";

export interface PhaseManagerOptions {
  turnManager: TurnManager;
  physicsWorld: PhysicsWorld;
  entityManager: EntityManager;
}

/**
 * Manages turn phase transitions and turn-ending logic.
 *
 * This class is responsible for:
 * - Monitoring projectile activity and transitioning from ProjectileFlying to PhysicsSettling
 * - Detecting when physics has settled and ending the current turn
 * - Handling cases where the current player's beaver dies during their turn
 * - Checking for game over conditions (only one beaver alive)
 * - Coordinating turn end transitions
 *
 * The PhaseManager automates the progression through turn phases based on
 * game state. It monitors physics settling and projectile activity to determine
 * when it's safe to transition between phases and end turns. This class should
 * be called each frame to check for phase transition conditions.
 */
export class PhaseManager {
  private options: PhaseManagerOptions;

  constructor(options: PhaseManagerOptions) {
    this.options = options;
  }

  handlePhaseTransitions(hasActiveProjectiles: boolean): void {
    const phase = this.options.turnManager.getPhase();

    // Check if projectile phase is complete
    if (phase === TurnPhase.ProjectileFlying && !hasActiveProjectiles) {
      this.options.turnManager.beginPhysicsSettling();
    }

    // Check if physics has settled
    if (phase === TurnPhase.PhysicsSettling) {
      if (this.options.physicsWorld.isSettled(0.5)) {
        this.handleTurnEnd();
      }
    }
  }

  handleDeadBeaver(): void {
    this.options.turnManager.endTurn();
    this.options.turnManager.beginPlayerInput();
  }

  private handleTurnEnd(): void {
    // Check for game over
    const aliveBeavers = this.options.entityManager.getAliveBeavers();
    if (aliveBeavers.length <= 1) {
      // Game over logic could go here
    }

    this.options.turnManager.endTurn();
    this.options.turnManager.beginPlayerInput();
  }
}
