import { Game } from "./core/Game";
import { throwError } from "./general/errors";

window.addEventListener("DOMContentLoaded", async () => {
  const canvas = (document.getElementById("game-canvas") as HTMLCanvasElement) ?? throwError("Canvas element not found");

  // Set canvas size
  canvas.width = 1200;
  canvas.height = 600;

  new Game(canvas).start();
});
