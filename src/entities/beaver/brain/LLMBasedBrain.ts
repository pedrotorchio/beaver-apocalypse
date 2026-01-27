import ollama from 'ollama';
import { Action, BaseBrain } from "./BaseBrain";
import prompt from "./llmprompt";

export class LLMBasedBrain extends BaseBrain {
    #logarea = document.getElementById("thinking") as HTMLDivElement;

    protected async executeThink(): Promise<Action[]> {
        const character = this.character;
        const enemies = this.game.core.entityManager.getBeavers().getEnemies(character);
        this.#logarea.innerHTML = "";
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
                enemies: enemies.toDataArray(),
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
            return reply.actions ?? [];
        } catch (error) {
            console.error("Error parsing commands:", error);
            console.log(replyString);
            return [this.createWaitAction('Error parsing commands')];
        }
    }
}