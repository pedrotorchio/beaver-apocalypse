import { AssetLoader } from "../general/AssetLoader";
import { TileSheet } from "../general/TileSheet";

export const tilesheet = Object.freeze({
    breaver1: () => new TileSheet({
        image: AssetLoader.getAsset<HTMLImageElement>("beaver1_sprites"),
        tileWidth: 223,
        tileHeight: 223,
        states: [
            { key: "idle", x: 0, y: 18, width: 210, height: 220 },
            { key: "walking", x: 261, y: 25, width: 235, height: 209 },
            { key: "jumping", x: 526, y: 10, width: 241, height: 224 },
            { key: "attacking", x: 786, y: 0, width: 296, height: 229 },
            { key: "dead", x: 1078, y: 110, width: 366, height: 138 },
            ["hit", "idle"],
        ]
    }),
    smallRock: (args: {radius: number}) => new TileSheet({
        image: AssetLoader.getAsset("small_rock"),
        tileWidth: 419,
        tileHeight: 366,
        states: ["rock"],
        renderWidth: args.radius,
        renderHeight: args.radius,
    })
})