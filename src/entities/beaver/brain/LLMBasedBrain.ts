import ollama from 'ollama';
import { InputState } from '../../../core/managers/InputManager';
import { GameModules } from '../../../core/types/GameModules.type';
import { Beaver } from "../Beaver";
import prompt from "./llmprompt";

type Getter<T> = () => T;
type GetterDictionary<D extends Record<string, unknown>> = {
    [K in keyof D]: Getter<D[K]>;
}
type BrainGetterArgs = {
    character: Beaver,
    getEnemies: () => Beaver[]
}
export class LLMBasedBrain {
    #isThinking: boolean = false;
    get isThinking(): boolean {
        return this.#isThinking;
    }
    #hasCommands: boolean = false;
    get hasCommands(): boolean {
        return this.#hasCommands;
    }
    #commands: InputState = resetCommands();
    get commands(): InputState {
        return this.#commands;
    }
    #actions: Action[] = [];
    #logarea = document.getElementById("thinking") as HTMLDivElement;
    constructor(private game: GameModules, private args: BrainGetterArgs) { }

    async think() {
        if (this.#isThinking) return;
        this.#commands = resetCommands();
        this.#actions = [];

        const character = this.args.character;
        const enemies = this.args.getEnemies();
        this.#logarea.innerHTML = "";
        this.#isThinking = true;
        const response = await ollama.generate({
            model: 'deepseek-r1:1.5b',
            stream: true,
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
        for await (const part of response) {
            if (part.response) console.log(part.response)
            if (part.thinking) this.#logarea.innerHTML += part.thinking;
        }
        this.#hasCommands = true;
        this.#commands.yield = true;
        this.#isThinking = false;
    }


}

function resetCommands(): InputState {
    return {
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
    }
}

type Action = MoveAction | AttackAction | WaitAction;

type WaitAction = {
    "type": "wait",
    "reason": string
}
type MoveAction = {
    "type": "move",
    "direction": "left" | "right"
    "distance": number
}
type AttackAction = {
    "type": "attack",
    "target": string,
    "angle": number,
    "power": number
}