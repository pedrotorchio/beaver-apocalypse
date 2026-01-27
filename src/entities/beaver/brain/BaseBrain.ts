import { Vec2 } from 'planck-js';
import { InputState } from '../../../core/managers/InputManager';
import { GameModules } from '../../../core/types/GameModules.type';
import { Renders } from '../../../core/types/Renders.type';
import { Updates } from '../../../core/types/Updates.type';
import { Beaver } from "../Beaver";

export type ActionType = Action['type']
export type Action =
    | {
        type: 'wait',
        reason: string
    }
    | {
        type: 'move',
        target: [number, number]
    }
    | {
        type: 'attack',
        target: string,
        angle: number,
    }
export type ActionDetails<T extends ActionType> = Action & { type: T }
export type Behaviour<K extends ActionType = ActionType> = (action: ActionDetails<K>, plan: BrainActionPlan) => boolean;
export type Behaviours = {
    [K in ActionType]: Behaviour<K>
}

export class BrainActionPlan {
    #actions: Action[] = [];
    set actions(actions: Action[]) {
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
        const action = this.getActiveAction()!;
        const behaviour = this.behaviours[action.type].bind(this.behaviours) as Behaviour;
        return behaviour(action, this);
    }

    hasActiveAction(): this is { getActiveAction: () => Action } {
        return this.#currentActionInExecution >= 0 && this.#currentActionInExecution < this.#actions.length;
    }

    getActiveAction(): Action | null {
        return this.#actions[this.#currentActionInExecution] ?? null;
    }

    nextAction(): Action | null {
        this.#currentActionInExecution++;
        const action = this.getActiveAction();
        console.log(action?.type, action);
        return action;
    }

    clear(): void {
        this.#actions = [];
        this.#currentActionInExecution = -1;
    }
}

export abstract class BaseBrain implements Updates, Renders, Behaviours {
    #isThinking: boolean = false;
    get isThinking(): boolean {
        return this.#isThinking;
    }
    #hasCommands: boolean = false;
    get hasCommands(): boolean {
        return this.#hasCommands;
    }
    #commands: InputState;
    get commands(): InputState {
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

    render(): void {
        const pos = this.character.body.getPosition().clone();
        if (this.#isThinking) this.game.core.shapes.with({ strokeColor: 'black' }).text(pos.x, pos.y - this.character.radius - 16, 16, 'Hmm...');
        if (!this.#actionPlan.hasActiveAction()) return;
        const action = this.#actionPlan.getActiveAction()!;
        if (action.type === 'move') {
            const [x, y] = action.target;
            this.game.core.shapes.with({ strokeColor: 'purple' }).arrow(pos, Vec2({ x, y }));
        }
    }

    wait() {
        this.commands.yield = true;
        return true;
    }
    move({ target }: ActionDetails<'move'>) {
        const targetPosition = Vec2({ x: target[0], y: target[1] });
        const currentPosition = this.character.body.getPosition().clone();
        const direction = targetPosition.sub(currentPosition);

        if (direction.x >= 0 && direction.x <= 5) return true;
        else if (direction.x > 0) this.commands.moveRight = true;
        else if (direction.x < 0) this.commands.moveLeft = true;
        return false;
    }
    attack({ angle }: ActionDetails<'attack'>) {
        if (this.commands.fire) {
            this.commands.fire = false;
            return true;
        }

        const currentAngle = this.character.aim.getAngle();
        const deltaAngle = currentAngle - angle;

        if (Math.abs(deltaAngle) < 2) this.commands.fire = true;
        else if (deltaAngle > 0) this.commands.aimUp = true;
        else if (deltaAngle < 0) this.commands.aimDown = true;
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

    protected abstract executeThink(): Promise<Action[]>;

    protected createWaitAction(reason: string): Action {
        return {
            type: 'wait',
            reason,
        };
    }

    protected createMoveAction(target: [number, number]): Action {
        return {
            type: 'move',
            target,
        };
    }

    protected createAttackAction(enemy: Beaver): Action {
        const characterPos = this.character.body.getPosition();
        const enemyPos = enemy.body.getPosition();
        const direction = enemyPos.sub(characterPos);
        const angle = Math.atan2(-direction.y, direction.x);
        const angleDegrees = (angle * 180) / Math.PI;

        return {
            type: 'attack',
            target: enemy.name,
            angle: angleDegrees,
        };
    }

    resetCommands(): InputState {
        this.#commands = {
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
