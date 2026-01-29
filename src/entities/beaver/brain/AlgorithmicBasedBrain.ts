import * as planck from 'planck-js';
import { DIRECTION_LEFT, DIRECTION_NONE, DIRECTION_RIGHT } from '../../../core/types/Entity.type';
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
        const moveTarget = this.calculateMove(enemyPosition);
        return [
            this.createMoveAction(moveTarget),
            this.createAttackAction(closestEnemy)
        ];
    }

    calculateMove(enemyPosition: planck.Vec2) {
        return () => {
            const characterPos = this.character.body.getPosition().clone();
            const distance = enemyPosition.clone().sub(characterPos);
            if (distance.x > this.EFFECTIVE_ATTACK_RANGE) return DIRECTION_RIGHT;
            else if (distance.x < -this.EFFECTIVE_ATTACK_RANGE) return DIRECTION_LEFT;
            return DIRECTION_NONE;
        }
    }

}
