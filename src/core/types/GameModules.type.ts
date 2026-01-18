import * as planck from "planck-js";
import { Terrain } from "../../entities/Terrain";
import { CoreModules } from "../GameInitializer";

export interface GameModules {
  world: planck.World;
  terrain: Terrain;
  core: CoreModules;
  canvas: CanvasRenderingContext2D;
}
