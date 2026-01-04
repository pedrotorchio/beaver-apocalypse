import { Game } from "./core/Game";
import { throwError } from "./general/errors";

window.addEventListener("DOMContentLoaded", () => {
  const canvas =
    (document.getElementById("gameCanvas") as HTMLCanvasElement) ??
    throwError("Canvas element not found");

  // Set canvas size
  canvas.width = 1200;
  canvas.height = 600;

  const game = new Game(canvas);
  game.start();
});
