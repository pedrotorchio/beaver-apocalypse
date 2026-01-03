import { Projectile } from '../entities/Projectile';
import { Beaver } from '../entities/Beaver';
import * as planck from 'planck-js';
import { Terrain } from '../terrain/Terrain';

export interface ProjectileServiceOptions {
  world: planck.World;
  terrain: Terrain;
  entityManager: { addProjectile: (projectile: Projectile) => void };
}

export class ProjectileService {
  private world: planck.World;
  private terrain: Terrain;
  private entityManager: { addProjectile: (projectile: Projectile) => void };

  constructor(options: ProjectileServiceOptions) {
    this.world = options.world;
    this.terrain = options.terrain;
    this.entityManager = options.entityManager;
  }

  createProjectile(
    x: number,
    y: number,
    velocityX: number,
    velocityY: number
  ): Projectile {
    const projectile = new Projectile(
      this.world,
      this.terrain,
      x,
      y,
      velocityX,
      velocityY
    );
    
    this.entityManager.addProjectile(projectile);
    return projectile;
  }
}

