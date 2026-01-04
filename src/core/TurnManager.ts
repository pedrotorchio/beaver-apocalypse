export enum TurnPhase {
  StartTurn,
  PlayerInput,
  ProjectileFlying,
  Explosion,
  PhysicsSettling,
  EndTurn,
}

export class TurnManager {
  private currentPlayerIndex: number = 0;
  private phase: TurnPhase = TurnPhase.StartTurn;
  private playerCount: number;

  constructor(playerCount: number = 2) {
    this.playerCount = playerCount;
  }

  getCurrentPlayerIndex(): number {
    return this.currentPlayerIndex;
  }

  getPhase(): TurnPhase {
    return this.phase;
  }

  setPhase(phase: TurnPhase): void {
    this.phase = phase;
  }

  startTurn(): void {
    this.phase = TurnPhase.StartTurn;
  }

  beginPlayerInput(): void {
    this.phase = TurnPhase.PlayerInput;
  }

  fireWeapon(): void {
    this.phase = TurnPhase.ProjectileFlying;
  }

  beginExplosion(): void {
    this.phase = TurnPhase.Explosion;
  }

  beginPhysicsSettling(): void {
    this.phase = TurnPhase.PhysicsSettling;
  }

  endTurn(): void {
    this.phase = TurnPhase.EndTurn;
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.playerCount;
    this.phase = TurnPhase.StartTurn;
  }

  canAcceptInput(): boolean {
    return this.phase === TurnPhase.PlayerInput;
  }

  isProjectileActive(): boolean {
    return (
      this.phase === TurnPhase.ProjectileFlying ||
      this.phase === TurnPhase.Explosion ||
      this.phase === TurnPhase.PhysicsSettling
    );
  }
}
