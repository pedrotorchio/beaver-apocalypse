import { Vec2 } from 'planck-js';
import { InputState, InputStateManager } from '../../../core/managers/InputManager';
import { DIRECTION_LEFT, DIRECTION_NONE, DIRECTION_RIGHT, Direction } from '../../../core/types/Entity.type';
import { GameModules } from '../../../core/types/GameModules.type';
import { Renders } from '../../../core/types/Renders.type';
import { Updates } from '../../../core/types/Updates.type';
import { CCWRad } from '../../../general/coordinateSystem';
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
        power: number,
    }
export type ActionGenerator = () => Action
export type ActionList = (Action | ActionGenerator)[]
export type ActionDetails<T extends ActionType> = Action & { type: T }
export type Behaviour<K extends ActionType = ActionType> = (action: ActionDetails<K>, plan: BrainActionPlan) => boolean;
export type Behaviours = {
    [K in ActionType]: Behaviour<K>
}

/** Angle tolerance in radians (≈2°) for attack aim alignment. */
const ANGLE_TOLERANCE_RAD: number = (5 * Math.PI) / 180;

export class BrainActionPlan {
    #actionList: ActionList = [];
    set actions(actions: ActionList) {
        this.#actionList = actions;
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
        return this.#currentActionInExecution >= 0 && this.#currentActionInExecution < this.#actionList.length;
    }

    actionCount(): number {
        return this.#actionList.length;
    }

    getActiveAction(): ActionList[number] | null {
        return this.#actionList[this.#currentActionInExecution] ?? null;
    }

    nextAction(): Action | null {
        this.#currentActionInExecution++;
        const actionOrGenerator = this.getActiveAction();
        const action = typeof actionOrGenerator === 'function' ? actionOrGenerator() : actionOrGenerator;
        console.log(action?.type, action);
        return action;
    }

    clear(): void {
        this.#actionList = [];
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
        if (!this.#actionPlan.hasActiveAction()) this.#actionPlan.nextAction();
        if (!this.#actionPlan.hasActiveAction()) {
            this.#actionPlan.clear();
            this.resetCommands();
        }
        else if (this.#actionPlan.doAction()) this.#actionPlan.nextAction();
    }

    render(): void { }

    wait() {
        this.resetCommands();
        this.setCommand('yield');
        return true;
    }
    move({ target, until }: ActionDetails<'move'>) {
        if (!target && !until) throw new Error('Move action must have a target or until function');
        this.resetCommands();
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
        else if (theMove === DIRECTION_RIGHT) this.setCommand('moveRight');
        else if (theMove === DIRECTION_LEFT) this.setCommand('moveLeft');
        return false;
    }
    attack({ angle, power }: ActionDetails<'attack'>) {
        // After firing, complete the action
        if (this.#commands.fire) {
            this.resetCommands();
            return true;
        }

        const currentAngle = this.character.aim.getAngle();
        let deltaAngle: CCWRad = CCWRad(angle - currentAngle);
        if (deltaAngle > Math.PI) deltaAngle = CCWRad(deltaAngle - 2 * Math.PI);
        if (deltaAngle < -Math.PI) deltaAngle = CCWRad(deltaAngle + 2 * Math.PI);

        const createDirectionCommands = (dir: 'up' | 'down') => {
            return {
                aimUp: dir === 'up',
                aimDown: dir === 'down',
            }
        }
        const { aimUp, aimDown } = createDirectionCommands(this.character.direction * deltaAngle > 0 ? 'up' : 'down');
        const isWithinAngleTolerance = Math.abs(deltaAngle) < ANGLE_TOLERANCE_RAD;
        this.resetCommands();
        if (isWithinAngleTolerance && this.character.aim.getPower() >= power) this.setCommand('fire');
        else if (isWithinAngleTolerance && this.character.aim.getPower() < power) this.setCommand('charging');
        else if (aimUp) this.setCommand('aimUp');
        else if (aimDown) this.setCommand('aimDown');
        return false;
    }

    async think(): Promise<void> {
        if (this.#isThinking || this.#actionPlan.actionCount()) return;
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

    setCommand(key: keyof InputState) {
        this.#hasCommands = true;
        Object.assign(this.#commands, { [key]: true });
    }
    resetCommands(): InputState {
        this.#hasCommands = false;
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
