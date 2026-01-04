export interface WeaponServiceOptions {
  minPower: number;
  maxPower: number;
  powerAccumulationRate: number;
}

export class WeaponService {
  private currentPower: number;
  private minPower: number;
  private maxPower: number;
  private powerAccumulationRate: number;

  constructor(options: WeaponServiceOptions) {
    this.minPower = options.minPower;
    this.maxPower = options.maxPower;
    this.powerAccumulationRate = options.powerAccumulationRate;
    this.currentPower = options.minPower;
  }

  updatePower(charging: boolean, justFired: boolean): void {
    if (charging) {
      this.currentPower = Math.min(this.maxPower, this.currentPower + this.powerAccumulationRate);
    } else {
      // Reset power when not charging (but don't reset if we just fired)
      if (!justFired) {
        this.currentPower = this.minPower;
      }
    }
  }

  getCurrentPower(): number {
    return this.currentPower;
  }

  resetPower(): void {
    this.currentPower = this.minPower;
  }

  calculateFireAngle(aimAngle: number, facing: number): number {
    // Adjust aim angle based on facing direction
    let fireAngle = aimAngle;
    if (facing === -1) {
      fireAngle = Math.PI - fireAngle;
    }
    return fireAngle;
  }

  calculateVelocity(fireAngle: number): { x: number; y: number } {
    return {
      x: Math.cos(fireAngle) * this.currentPower,
      y: Math.sin(fireAngle) * this.currentPower,
    };
  }

  calculateSpawnOffset(fireAngle: number, offsetDistance: number = 15): { x: number; y: number } {
    return {
      x: Math.cos(fireAngle) * offsetDistance,
      y: Math.sin(fireAngle) * offsetDistance,
    };
  }

  getPowerConfig(): { minPower: number; maxPower: number; currentPower: number } {
    return {
      minPower: this.minPower,
      maxPower: this.maxPower,
      currentPower: this.currentPower,
    };
  }
}
