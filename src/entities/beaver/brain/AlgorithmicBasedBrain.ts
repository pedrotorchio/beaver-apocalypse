import * as planck from 'planck-js';
import { DIRECTION_LEFT, DIRECTION_NONE, DIRECTION_RIGHT } from '../../../core/types/Entity.type';
import { CCWRad, normalizeRadians } from '../../../general/coordinateSystem';
import { Beaver } from '../Beaver';
import { Action, ActionList, BaseBrain } from "./BaseBrain";

export class AlgorithmicBasedBrain extends BaseBrain {
    private readonly EFFECTIVE_ATTACK_RANGE = 200;

    protected async executeThink(): Promise<ActionList> {
        const enemies = this.game.core.entityManager.getBeavers().getEnemies(this.character);
        if (enemies.isEmpty()) return [this.createWaitAction('No enemies to target')];

        const characterPos = this.character.body.getPosition();
        const closestEnemy = enemies.findClosest(characterPos);
        if (!closestEnemy) return [this.createWaitAction('No valid enemy found')];

        const moveTarget = this.calculateMove(closestEnemy.body.getPosition());
        return [
            this.createMoveAction(moveTarget),
            () => this.createAttackAction(closestEnemy)
        ];
    }

    calculateMove(enemyPosition: planck.Vec2) {
        return () => {
            const characterPos = this.character.body.getPosition();
            const delta = planck.Vec2.sub(enemyPosition, characterPos);
            const enemyDirection = delta.x > 0 ? DIRECTION_RIGHT : DIRECTION_LEFT;

            if (enemyDirection !== this.character.direction) return enemyDirection;
            if (delta.x > this.EFFECTIVE_ATTACK_RANGE) return DIRECTION_RIGHT;
            if (delta.x < -this.EFFECTIVE_ATTACK_RANGE) return DIRECTION_LEFT;
            return DIRECTION_NONE;
        }
    }
    render(): void {
        if (this.lookingAt) {
            this.game.core.shapes.with({ strokeColor: 'purple' }).line(this.character.body.getPosition(), this.lookingAt);
        }
    }
    lookingAt: planck.Vec2 | null = null;
    protected createAttackAction(enemy: Beaver): Action {
        const characterPos = this.character.body.getPosition();
        const enemyPos = enemy.body.getPosition();
        const direction = planck.Vec2.sub(enemyPos, characterPos);
        const angle = normalizeRadians(CCWRad(Math.atan2(-direction.y, direction.x)));
        this.lookingAt = enemyPos;
        return {
            type: 'attack',
            target: enemy.name,
            angle,
        };
    }

}
