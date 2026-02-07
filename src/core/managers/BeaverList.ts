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
        return this.beavers.map(beaver => {
            const p = beaver.body.getPosition();
            return {
                id: beaver.name,
                hp: beaver.health.health / beaver.health.maxHealth,
                position: { x: p.x, y: p.y },
            };
        });
    }

    findClosest(position: Vec2): Beaver | null {
        if (this.beavers.length === 0) return null;

        const [closestBeaver] = this.getAlive().toArray().reduce<[Beaver, number]>((closest: [Beaver, number], nextBeaver: Beaver) => {
            const newDistance = Vec2.sub(position, nextBeaver.body.getPosition()).length();
            const [closestBeaver, closestDistance] = closest;

            if (newDistance < closestDistance) return [nextBeaver, newDistance];
            return [closestBeaver, closestDistance];
        }, [this.beavers[0], Infinity]);

        return closestBeaver;
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
