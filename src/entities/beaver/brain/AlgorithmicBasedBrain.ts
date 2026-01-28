import * as planck from 'planck-js';
import { Vec2 } from 'planck-js';
import { Action, BaseBrain } from "./BaseBrain";

export class AlgorithmicBasedBrain extends BaseBrain {
    private readonly EFFECTIVE_ATTACK_RANGE = 100;

    protected async executeThink(): Promise<Action[]> {
        const enemies = this.game.core.entityManager.getBeavers().getEnemies(this.character);
        if (enemies.isEmpty()) return [this.createWaitAction('No enemies to target')];

        const characterPos = this.character.body.getPosition();
        const closestEnemy = enemies.findClosest(characterPos);
        if (!closestEnemy) return [this.createWaitAction('No valid enemy found')];

        const enemyPosition = closestEnemy.body.getPosition();
        const distance = planck.Vec2.distance(characterPos, enemyPosition);
        const isInRange = distance <= this.EFFECTIVE_ATTACK_RANGE;

        if (isInRange) return [this.createAttackAction(closestEnemy)];
        const moveTarget = this.calculateMoveTarget(enemyPosition);
        return [
            this.createMoveAction(moveTarget),
            this.createAttackAction(closestEnemy)
        ];
    }

    private calculateMoveTarget(enemyPosition: Vec2): [number, number] {
        const characterPos = this.character.body.getPosition();
        // Calculate vector from character to enemy
        const distanceVector = enemyPosition.clone().sub(characterPos);
        // Get the straight-line distance to enemy
        const scalarDistance = distanceVector.length();

        // Move close enough to attack (within range) but cap at 50 units per turn
        const closeEnoughDistance = scalarDistance - this.EFFECTIVE_ATTACK_RANGE;
        // Convert direction vector to unit vector (length 1) pointing toward enemy
        const normalizedDirection = distanceVector.clone();
        normalizedDirection.normalize();
        // Scale unit vector by desired move distance to get movement vector
        normalizedDirection.mul(closeEnoughDistance);
        // Calculate target X by moving in enemy direction


        return [normalizedDirection.x, normalizedDirection.y];
    }
}
