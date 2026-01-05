import { Beaver } from "../../entities/Beaver";
import { Projectile } from "../../entities/Projectile";

/**
 * Manages collections of game entities (beavers and projectiles).
 *
 * This class is responsible for:
 * - Maintaining lists of all beavers and projectiles in the game
 * - Providing access to entities by index or filtering (e.g., alive beavers)
 * - Adding new projectiles to the collection
 * - Updating all projectiles and removing inactive ones
 * - Determining whether any active projectiles exist
 *
 * The EntityManager serves as the central repository for game entities.
 * Other systems should use this class to query entities rather than
 * maintaining their own collections. This ensures a single source of truth
 * for entity state.
 */
export class EntityManager {
  private beavers: Beaver[] = [];
  private projectiles: Projectile[] = [];

  addBeaver(beaver: Beaver): void {
    this.beavers.push(beaver);
  }

  getBeavers(): Beaver[] {
    return this.beavers;
  }

  getProjectiles(): Projectile[] {
    return this.projectiles;
  }

  getBeaver(currentPlayerIndex: number): Beaver | undefined {
    return this.beavers[currentPlayerIndex];
  }

  getAliveBeavers(): Beaver[] {
    return this.beavers.filter((b) => b.isAlive());
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


