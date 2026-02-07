import { Direction } from '../../../core/types/Entity.type';
import { CCWRad } from '../../../general/coordinateSystem';

export type ActionType = Action['type']
export type Action =
    | {
        type: 'wait',
        reason: string
    }
    | {
        type: 'move',
        target?: [number, number]
        direction?: Direction
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
