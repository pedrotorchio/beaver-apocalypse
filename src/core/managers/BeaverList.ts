import * as planck from 'planck-js';
import { Vec2 } from 'planck-js';
import { Beaver } from '../../entities/beaver/Beaver';

export class BeaverList implements Iterable<Beaver> {
    private beavers: Beaver[];

    constructor(beavers: Beaver[] = []) {
        this.beavers = beavers;
    }

    [Symbol.iterator](): Iterator<Beaver> {
        return this.beavers[Symbol.iterator]();
    }

    get length(): number {
        return this.beavers.length;
    }

    isEmpty(): boolean {
        return this.beavers.length === 0;
    }

    toArray(): Beaver[] {
        return [...this.beavers];
    }

    toDataArray(): Array<{ id: string, hp: number, position: { x: number, y: number } }> {
        return this.beavers.map(beaver => ({
            id: beaver.name,
            hp: beaver.health.health / beaver.health.maxHealth,
            position: beaver.body.getPosition(),
        }));
    }

    findClosest(position: Vec2): Beaver | null {
        if (this.beavers.length === 0) return null;

        let closest = this.beavers[0];
        const closestPos = closest.body.getPosition();
        let closestDistance = planck.Vec2.distance(position, closestPos);

        for (const beaver of this.beavers.slice(1)) {
            const beaverPos = beaver.body.getPosition();
            const distance = planck.Vec2.distance(position, beaverPos);
            if (distance < closestDistance) {
                closest = beaver;
                closestDistance = distance;
            }
        }

        return closest;
    }

    getAlive(): BeaverList {
        const aliveBeavers = this.beavers.filter((b) => b.health.isAlive());
        return new BeaverList(aliveBeavers);
    }

    getEnemies(beaver: Beaver): BeaverList {
        const enemies = this.beavers.filter(b => b !== beaver);
        return new BeaverList(enemies);
    }

    push(beaver: Beaver): void {
        this.beavers.push(beaver);
    }

    get(index: number): Beaver | undefined {
        return this.beavers[index];
    }
}
