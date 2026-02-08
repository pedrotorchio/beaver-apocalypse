import { AssetLoader } from "../general/AssetLoader";
import { SpriteDefinition, StatesField, TileSheet } from "../general/TileSheet";
import * as tilesheets from "../tilesheets";

type Tilesheets = typeof tilesheets;
type TilesheetName = keyof Tilesheets;
type TilesheetSpec<K extends TilesheetName> = ReturnType<Tilesheets[K]>;
type CreateTilesheetParams<K extends TilesheetName> = Parameters<(typeof tilesheets)[K]>[0];
type InferStates<K extends TilesheetName> =
    TilesheetSpec<K>['states'][number] extends infer S
    ? S extends readonly [infer StateKey, ...unknown[]]
    ? StateKey
    : S extends SpriteDefinition<infer StateKey>
    ? StateKey
    : S extends string
    ? S
    : never
    : never

export function createTilesheet<K extends TilesheetName>(
    key: K,
    args: CreateTilesheetParams<K>
): TileSheet<InferStates<K>> {
    type States = InferStates<K>;
    const spec = tilesheets[key](args);
    const image = AssetLoader.getAsset<HTMLImageElement>(spec.image);
    const states = [...spec.states] as StatesField<States>;
    return new TileSheet({ ...spec, states, image })
}
