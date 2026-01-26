import ollama from 'ollama';
import { Vec2 } from 'planck-js';
import { InputState } from '../../../core/managers/InputManager';
import { GameModules } from '../../../core/types/GameModules.type';
import { Renders } from '../../../core/types/Renders.type';
import { Updates } from '../../../core/types/Updates.type';
import { Beaver } from "../Beaver";
import prompt from "./llmprompt";

export class LLMBasedBrain implements Updates, Renders, Behaviours {
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

    #logarea = document.getElementById("thinking") as HTMLDivElement;
    constructor(private game: GameModules, private character: Beaver) {
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

    wait(action: ActionDetails<'wait'>) {
        console.log("Waiting:", action.reason);
        this.commands.yield = true;
        return true;
    }
    move({ target }: ActionDetails<'move'>) {
        console.log("Moving to:", target);
        const targetPosition = Vec2({ x: target[0], y: target[1] });
        const currentPosition = this.character.body.getPosition().clone();
        const direction = targetPosition.sub(currentPosition);

        if (direction.x >= 0 && direction.x <= 5) return true;
        else if (direction.x > 0) this.commands.moveRight = true;
        else if (direction.x < 0) this.commands.moveLeft = true;
        return false;
    }
    attack({ target, angle }: ActionDetails<'attack'>) {
        if (this.commands.fire) {
            this.commands.fire = false;
            return true;
        }

        console.log("Attacking:", target, angle);
        const currentAngle = this.character.aim.getAngle();
        const deltaAngle = currentAngle - angle;


        if (deltaAngle === 0) this.commands.fire = true;
        else if (deltaAngle > 0) this.commands.aimUp = true;
        else if (deltaAngle < 0) this.commands.aimDown = true;
        return false;
    }
    async think() {
        if (this.#isThinking) return;
        // Keeping same reference to the original object
        this.resetCommands();
        this.#actionPlan.clear();

        const character = this.character;
        const enemies = this.game.core.entityManager
            .getBeavers()
            .filter(b => b !== character)
        this.#logarea.innerHTML = "";
        this.#isThinking = true;
        const response = await ollama.generate({
            model: 'deepseek-r1:1.5b',
            stream: true,
            options: {
                temperature: 0
            },
            prompt: prompt({
                terrainWidth: this.game.terrain.getWidth(),
                character: {
                    id: character.name,
                    hp: character.health.health / character.health.maxHealth,
                    position: character.body.getPosition(),
                },
                enemies: enemies.map(enemy => ({
                    id: enemy.name,
                    hp: enemy.health.health / enemy.health.maxHealth,
                    position: enemy.body.getPosition(),
                })),
            }),
        })
        let replyString = "";
        for await (const part of response) {
            if (part.response) replyString += part.response;
            if (part.thinking) this.#logarea.innerHTML += part.thinking;
        }
        try {
            const jsonResponseString = replyString.substring(replyString.indexOf('{'), replyString.lastIndexOf('}') + 1);
            const reply = JSON.parse(jsonResponseString) as { actions: Action[] };
            console.dir(reply);
            this.#actionPlan.actions = reply.actions ?? [];
        } catch (error) {
            console.error("Error parsing commands:", error);
            console.log(replyString);
            this.#commands.yield = true;
        }
        this.#hasCommands = true;
        this.#isThinking = false;
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

type ActionType = Action['type']
type Action =
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
type ActionDetails<T extends ActionType> = Action & { type: T }
type Behaviour<K extends ActionType = ActionType> = (action: ActionDetails<K>, plan: BrainActionPlan) => boolean;
type Behaviours = {
    [K in ActionType]: Behaviour<K>
}
class BrainActionPlan {
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
        return this.getActiveAction();
    }

    clear(): void {
        this.#actions = [];
        this.#currentActionInExecution = -1;
    }
}