import { Beaver } from '../entities/Beaver';
import { Projectile } from '../entities/Projectile';

export interface EntityManagerOptions {
  beavers: Beaver[];
  projectiles: Projectile[];
}

export class EntityManager {
  private beavers: Beaver[];
  private projectiles: Projectile[];

  constructor(options: EntityManagerOptions) {
    this.beavers = options.beavers;
    this.projectiles = options.projectiles;
  }

  getBeavers(): Beaver[] {
    return this.beavers;
  }

  getProjectiles(): Projectile[] {
    return this.projectiles;
  }

  getCurrentBeaver(currentPlayerIndex: number): Beaver | undefined {
    return this.beavers[currentPlayerIndex];
  }

  getAliveBeavers(): Beaver[] {
    return this.beavers.filter(b => b.isAlive());
  }

  addProjectile(projectile: Projectile): void {
    this.projectiles.push(projectile);
  }

  updateProjectiles(beavers: Beaver[]): void {
    const activeProjectiles: Projectile[] = [];
    for (const projectile of this.projectiles) {
      if (projectile.isActive()) {
        const stillActive = projectile.update(beavers);
        if (stillActive) {
          activeProjectiles.push(projectile);
        }
      }
    }
    this.projectiles = activeProjectiles;
  }

  hasActiveProjectiles(): boolean {
    return this.projectiles.length > 0;
  }
}

