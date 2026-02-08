// type SpriteDefinitionSpec<StateKey extends string> = {
//     key: StateKey;
//     x: number;
//     y: number;
//     width: number;
//     height: number;
// };

// export interface TileSheetSpec<StateKey extends string> {
//     image: string;
//     tileWidth: number;
//     tileHeight: number;
//     states: (StateKey | SpriteDefinitionSpec<StateKey> | [key: StateKey, aliasFor: StateKey])[];
//     renderHeight?: number;
//     renderWidth?: number;
// }

// type Beaver1StateKey = "idle" | "walking" | "jumping" | "attacking" | "dead" | "hit";

export function beaver1(args: { size: number }) {
    return {
        image: "beaver1_sprites",
        renderHeight: args.size,
        renderWidth: args.size,
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
    } as const;
}

export function smallRock(args: { size: number }) {
    return {
        image: "small_rock",
        tileWidth: 419,
        tileHeight: 366,
        states: ["rock"],
        renderWidth: args.size,
        renderHeight: args.size,
    } as const;
}
