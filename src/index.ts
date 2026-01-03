import { Game } from './core/Game';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  
  if (!canvas) {
    throw new Error('Canvas element not found');
  }
  
  // Set canvas size
  canvas.width = 1200;
  canvas.height = 600;
  
  const game = new Game(canvas);
  game.start();
});

