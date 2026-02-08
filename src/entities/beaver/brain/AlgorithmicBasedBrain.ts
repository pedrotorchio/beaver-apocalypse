import * as planck from 'planck-js';
import { DIRECTION_LEFT, DIRECTION_NONE, DIRECTION_RIGHT, Direction } from '../../../core/types/Entity.type';
import { GameModules } from '../../../core/types/GameModules.type';
import { COLOR_AI_TARGETING } from '../../../constants';
import { throwError } from '../../../general/errors';
import { Beaver } from '../Beaver';
import { AimingSkill } from './AimingSkill';
import { Action, ActionList, BaseBrain } from "./BaseBrain";
import { ShotMemory } from './ShotMemory';

export class AlgorithmicBasedBrain extends BaseBrain {
    #aimingSkill: AimingSkill;
    #EFFECTIVE_ATTACK_RANGE = 200;
    #lookingAt: planck.Vec2 | null = null;

    constructor(game: GameModules, character: Beaver) {
        super(game, character)
        const shotMemory = new ShotMemory();
        this.#aimingSkill = new AimingSkill(game, { character, shotMemory });
    }
    render(): void {
        if (this.#lookingAt) {
            this.game.core.shapes.with({ strokeColor: COLOR_AI_TARGETING }).line(this.character.body.getPosition(), this.#lookingAt);
        }
        this.#lookingAt = null;
    }
    protected async executeThink(): Promise<ActionList> {
        const getEnemies = () => this.game.core.entityManager.getBeavers().getEnemies(this.character);
        const enemies = getEnemies();
        if (enemies.isEmpty()) return [{ type: 'wait', reason: 'No enemies to target' }];

        const getClosestEnemy = () => (
            getEnemies().findClosest(this.character.body.getPosition())
        ) ?? throwError('No closest enemy found');

        return [
            () => this.createMoveAction(getClosestEnemy()),
            () => this.createAttackAction(getClosestEnemy())
        ];
    }

    private createMoveAction(enemy: Beaver): Action {
        const enemyPosition = enemy.body.getPosition();
        const characterPos = this.character.body.getPosition();
        const delta = planck.Vec2.sub(enemyPosition, characterPos);
        const enemyDirection: Direction = delta.x > 0 ? DIRECTION_RIGHT : DIRECTION_LEFT;
        const TOLERANCE = this.#EFFECTIVE_ATTACK_RANGE * .2;
        const absoluteDelta = Math.abs(delta.x);

        const isTooFar = absoluteDelta > this.#EFFECTIVE_ATTACK_RANGE + TOLERANCE;
        const isTooClose = absoluteDelta < this.#EFFECTIVE_ATTACK_RANGE - TOLERANCE;
        if (isTooFar) return { type: 'move', direction: enemyDirection };
        if (isTooClose) return { type: 'move', direction: <Direction>-enemyDirection };
        // If already at the right distance, simply turn towards the enemy, but don't move
        this.character.direction = enemyDirection;
        return { type: 'move', direction: DIRECTION_NONE };
    }
    protected createAttackAction(enemy: Beaver): Action {
        const enemyPos = enemy.body.getPosition();
        const { power, angle } = this.#aimingSkill.aimAt(enemy);
        this.#lookingAt = enemyPos;
        return {
            type: 'attack',
            target: enemy.name,
            angle,
            power
        };
    }

}
