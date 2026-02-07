export enum TurnPhase {
  PlayerInput,
  ProjectileFlying,
  PhysicsSettling,
  EndTurn,
}

/**
 * Manages turn-based gameplay state and phase transitions.
 *
 * This class is responsible for:
 * - Tracking the current active player index
 * - Managing the turn phase state machine (PlayerInput, ProjectileFlying, etc.)
 * - Providing methods to transition between phases
 * - Determining when player input is allowed
 * - Rotating turns between players
 * - Indicating when projectiles are active (flying, exploding, or physics settling)
 *
 * The TurnManager acts as the authoritative source for turn and phase state.
 * Other systems should query this class to determine the current game phase
 * and whether certain actions (like input processing) are permitted.
 */
export class TurnManager {
  #currentPlayerIndex: number = 0;
  #phase: TurnPhase = TurnPhase.PlayerInput;
  #playerCount: number;

  constructor(playerCount: number = 2) {
    this.#playerCount = playerCount;
  }

  getCurrentPlayerIndex(): number {
    return this.#currentPlayerIndex;
  }

  getPhase(): TurnPhase {
    return this.#phase;
  }

  setPhase(phase: TurnPhase): void {
    this.#phase = phase;
  }

  startTurn(): void {
    this.beginPlayerInput();
  }

  beginPlayerInput(): void {
    this.#phase = TurnPhase.PlayerInput;
  }

  fireWeapon(): void {
    this.#phase = TurnPhase.ProjectileFlying;
  }

  beginPhysicsSettling(): void {
    this.#phase = TurnPhase.PhysicsSettling;
  }

  endTurn(): void {
    this.#currentPlayerIndex = (this.#currentPlayerIndex + 1) % this.#playerCount;
  }

  canAcceptInput(): boolean {
    return this.#phase === TurnPhase.PlayerInput;
  }

  isProjectileActive(): boolean {
    return (
      this.#phase === TurnPhase.ProjectileFlying ||
      this.#phase === TurnPhase.PhysicsSettling
    );
  }
}
