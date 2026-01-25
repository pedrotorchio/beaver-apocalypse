import { Destroys } from "./Destroys.type";
import { Renders } from "./Renders.type";
import { Updates } from "./Updates.type";

export type Entity = Updates & Renders & Destroys;