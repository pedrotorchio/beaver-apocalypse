import { Vec2 } from 'planck-js';
import { InputState, InputStateManager } from '../../../core/managers/InputManager';
import { DIRECTION_LEFT, DIRECTION_NONE, DIRECTION_RIGHT, Direction } from '../../../core/types/Entity.type';
import { GameModules } from '../../../core/types/GameModules.type';
import { Renders } from '../../../core/types/Renders.type';
import { Updates } from '../../../core/types/Updates.type';
import type { CCWRad } from '../../../general/coordinateSystem';
import { Beaver } from "../Beaver";

export type ActionType = Action['type']
export type Action =
    | {
        type: 'wait',
        reason: string
    }
    | {
        type: 'move',
        target?: [number, number]
        until?: () => Direction
    }
    | {
        type: 'attack',
        target: string,
        angle: CCWRad,
    }
export type ActionGenerator = () => Action
export type ActionList = (Action | ActionGenerator)[]
export type ActionDetails<T extends ActionType> = Action & { type: T }
export type Behaviour<K extends ActionType = ActionType> = (action: ActionDetails<K>, plan: BrainActionPlan) => boolean;
export type Behaviours = {
    [K in ActionType]: Behaviour<K>
}

/** Angle tolerance in radians (≈2°) for attack aim alignment. */
const ANGLE_TOLERANCE_RAD: number = (2 * Math.PI) / 180;

export class BrainActionPlan {
    #actions: ActionList = [];
    set actions(actions: ActionList) {
        this.#actions = actions;
        this.#currentActionInExecution = -1;
    }
    #currentActionInExecution = -1;

    /**
     * @param behaviours a dictionary of action types and their corresponding functions. The function should return true if the action was completed, false otherwise.
     */
    constructor(private behaviours: Behaviours) { }

    doAction() {
        if (!this.hasActiveAction()) return false;
        const actionOrGenerator = this.getActiveAction()!;
        const action = typeof actionOrGenerator === 'function' ? actionOrGenerator() : actionOrGenerator;
        const behaviour = this.behaviours[action.type].bind(this.behaviours) as Behaviour;
        return behaviour(action, this);
    }

    hasActiveAction(): this is { getActiveAction: () => Action } {
        return this.#currentActionInExecution >= 0 && this.#currentActionInExecution < this.#actions.length;
    }

    getActiveAction(): ActionList[number] | null {
        return this.#actions[this.#currentActionInExecution] ?? null;
    }

    nextAction(): Action | null {
        this.#currentActionInExecution++;
        const actionOrGenerator = this.getActiveAction();
        const action = typeof actionOrGenerator === 'function' ? actionOrGenerator() : actionOrGenerator;
        console.log(action?.type, action);
        return action;
    }

    clear(): void {
        this.#actions = [];
        this.#currentActionInExecution = -1;
    }
}

export abstract class BaseBrain implements Updates, Renders, Behaviours, InputStateManager {
    #isThinking: boolean = false;
    get isThinking(): boolean {
        return this.#isThinking;
    }
    #hasCommands: boolean = false;
    get hasCommands(): boolean {
        return this.#hasCommands;
    }
    #commands: InputState;
    getInputState(): InputState {
        return this.#commands;
    }

    #actionPlan: BrainActionPlan;

    constructor(protected game: GameModules, protected character: Beaver) {
        this.#actionPlan = new BrainActionPlan(this);
        this.#commands = this.resetCommands();
    }

    update(): void {
        if (!this.#hasCommands) return;
        this.resetCommands();
        if (!this.#actionPlan.hasActiveAction()) this.#actionPlan.nextAction();
        if (!this.#actionPlan.hasActiveAction()) this.#hasCommands = false;
        if (this.#actionPlan.doAction()) this.#actionPlan.nextAction();
    }

    render(): void { }

    wait() {
        this.#commands.yield = true;
        return true;
    }
    move({ target, until }: ActionDetails<'move'>) {
        if (!target && !until) throw new Error('Move action must have a target or until function');
        const targetX = target?.[0] ?? 0;
        const targetY = target?.[1] ?? 0;
        until ??= (): Direction => {
            const position = this.character.body.getPosition();
            const targetPosition = Vec2({ x: targetX, y: targetY });
            const direction = Vec2.sub(targetPosition, position);
            if (direction.x > 5) return DIRECTION_RIGHT;
            else if (direction.x < -5) return DIRECTION_LEFT;
            return DIRECTION_NONE;
        }
        const theMove = until();
        if (theMove === DIRECTION_NONE) return true;
        else if (theMove === DIRECTION_RIGHT) this.#commands.moveRight = true;
        else if (theMove === DIRECTION_LEFT) this.#commands.moveLeft = true;
        return false;
    }
    attack({ angle }: ActionDetails<'attack'>) {
        if (this.#commands.fire) {
            this.#commands.fire = false;
            return true;
        }

        const currentAngle = this.character.aim.getAngle();
        const deltaAngle = currentAngle - angle;

        const aimUp = angle > 0 && angle < Math.PI;
        const aimDown = angle > -Math.PI && angle < 0;

        if (Math.abs(deltaAngle) < ANGLE_TOLERANCE_RAD) this.#commands.fire = true;
        else if (aimDown) this.#commands.aimDown = true;
        else if (aimUp) this.#commands.aimUp = true;
        return false;
    }

    async think(): Promise<void> {
        if (this.#isThinking) return;
        this.resetCommands();
        this.#actionPlan.clear();
        this.#isThinking = true;
        this.#actionPlan.actions = await this.executeThink();
        this.#hasCommands = true;
        this.#isThinking = false;
    }

    protected abstract executeThink(): Promise<ActionList>;

    protected createWaitAction(reason: string): Action {
        return {
            type: 'wait',
            reason,
        };
    }

    protected createMoveAction(target: [number, number] | (() => Direction)): Action {
        if (typeof target === 'function') {
            return {
                type: 'move',
                until: target,
            };
        }
        return {
            type: 'move',
            target: target,
        };
    }

    resetCommands(): InputState {
        this.#commands = {
            wait: false,
            charging: false,
            pause: false,
            stop: false,
            aimDown: false,
            aimUp: false,
            fire: false,
            jump: false,
            moveLeft: false,
            moveRight: false,
            yield: false
        };
        return this.#commands;
    }
}
