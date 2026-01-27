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
        const direction = Vec2({ x: enemyPosition.x - characterPos.x, y: enemyPosition.y - characterPos.y });
        const distance = direction.length();

        const moveDistance = Math.min(distance - this.EFFECTIVE_ATTACK_RANGE + 20, 50);
        const normalizedDirection = direction.clone();
        normalizedDirection.mul(1 / distance);
        normalizedDirection.mul(moveDistance);

        const targetX = characterPos.x + normalizedDirection.x;
        const targetY = characterPos.y;

        return [targetX, targetY];
    }
}
