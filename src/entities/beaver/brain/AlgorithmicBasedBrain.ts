import * as planck from 'planck-js';
import { DIRECTION_LEFT, DIRECTION_NONE, DIRECTION_RIGHT, Direction } from '../../../core/types/Entity.type';
import { GameModules } from '../../../core/types/GameModules.type';
import { CCWRad, normalizeRadians } from '../../../general/coordinateSystem';
import { Beaver } from '../Beaver';
import { BallisticAdvisor } from './BallisticAdvisor';
import { Action, ActionList, BaseBrain } from "./BaseBrain";
import { ShotMemory } from './ShotMemory';

export class AlgorithmicBasedBrain extends BaseBrain {
    private readonly ballisticAdvisor: BallisticAdvisor;
    private readonly EFFECTIVE_ATTACK_RANGE = 200;

    constructor(game: GameModules, character: Beaver) {
        super(game, character)
        const shotMemory = new ShotMemory();
        this.ballisticAdvisor = new BallisticAdvisor(game, { character, shotMemory });
    }

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

    calculateMove(enemyPosition: planck.Vec2): () => Direction {
        return (): Direction => {
            const characterPos = this.character.body.getPosition();
            const delta = planck.Vec2.sub(enemyPosition, characterPos);
            const enemyDirection = delta.x > 0 ? DIRECTION_RIGHT : DIRECTION_LEFT;
            const TOLERANCE = this.EFFECTIVE_ATTACK_RANGE * .2;
            const absoluteDelta = Math.abs(delta.x);

            const isTooFar = absoluteDelta > this.EFFECTIVE_ATTACK_RANGE + TOLERANCE;
            const isTooClose = absoluteDelta < this.EFFECTIVE_ATTACK_RANGE - TOLERANCE;
            if (isTooFar) return <Direction>enemyDirection;
            if (isTooClose) return <Direction>-enemyDirection;

            this.character.direction = enemyDirection;
            return <Direction>DIRECTION_NONE;
        }
    }
    render(): void {
        if (this.lookingAt) {
            this.game.core.shapes.with({ strokeColor: 'purple' }).line(this.character.body.getPosition(), this.lookingAt);
        }
        this.lookingAt = null;
    }
    lookingAt: planck.Vec2 | null = null;
    protected createAttackAction(enemy: Beaver): Action {
        const characterPos = this.character.body.getPosition();
        const enemyPos = enemy.body.getPosition();
        const direction = planck.Vec2.sub(enemyPos, characterPos);
        const angle = normalizeRadians(CCWRad(Math.atan2(-direction.y, direction.x)));
        const power = this.ballisticAdvisor.suggest(enemy).power;
        this.lookingAt = enemyPos;
        return {
            type: 'attack',
            target: enemy.name,
            angle,
            power
        };
    }

}
