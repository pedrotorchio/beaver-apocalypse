# Beaver Apocalypse

A Worms-like turn-based game MVP built with TypeScript, Canvas 2D, and Planck.js.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

3. Serve the game:
```bash
npm run serve
# Then open http://localhost:8000 in your browser
```

## Controls

- **Movement**: A (left), D (right), W (jump)
- **Aim**: Arrow keys (← → ↑ ↓)
- **Fire**: Spacebar

## Gameplay

- Two players alternate turns
- Each player controls one beaver
- Aim and fire your bazooka to destroy terrain and damage opponents
- Turns end when physics settles after projectile impact
- First player to eliminate the opponent wins

## Architecture

The game uses a class-based, object-oriented architecture:

- `Game`: Main game loop and coordination
- `TurnManager`: Turn-based state machine
- `InputManager`: Keyboard input handling
- `PhysicsWorld`: Planck.js physics wrapper
- `Terrain`: Destructible terrain using bitmap mask
- `Beaver`: Player-controlled entities
- `Projectile`: Bazooka projectiles
- `Renderer`: Canvas rendering

## Development

Watch mode:
```bash
npm run dev
```

