import { Destroys } from "./Destroys.type";
import { Renders } from "./Renders.type";
import { Updates } from "./Updates.type";

export type Entity = Updates & Renders & Destroys;

export type Direction = typeof DIRECTION_RIGHT | typeof DIRECTION_LEFT | typeof DIRECTION_NONE;
export const DIRECTION_RIGHT = (1);
export const DIRECTION_LEFT = (-1);
export const DIRECTION_NONE = (0);
