# Hex Escape

A turn-based hex grid survival strategy game built with Three.js.

## Game Overview

Survive deadly winters, explore a fog-covered hex island, and find the randomly-placed exit before your colony dies. Manage resources, build structures, and make strategic decisions to keep your population alive.

## Features

### Core Gameplay
- **Hex Grid Map**: 15x15 procedurally generated hex map with 6 terrain types
- **Fog of War**: Explore the map to reveal hidden hexes
- **Resource Management**: Manage Food, Wood, Stone, and Population
- **Building System**: 11 different buildings across 3 tiers
- **Seasonal System**: 4 seasons with unique effects and challenges
- **Winter Escalation**: Each year, winters become more deadly
- **Dice-Based Production**: Buildings use dice rolls for production
- **Random Events**: Encounter traders, discoveries, attacks, and more
- **Resource Depletion**: Terrain resources deplete over time
- **Capital Movement**: Relocate your capital once per year (costs resources)

### Visual Polish & UX
- **Animated Hex Selection**: Pulsing gold ring highlights selected hexes
- **Building Placement Preview**: Ghost buildings appear when hovering with a building selected
- **Smooth Camera Controls**: Mouse drag to pan, scroll to zoom, keyboard movement
- **Professional UI**: Glass-morphism design with backdrop blur and smooth transitions
- **Start/End Screens**: Beautiful modals for game start and victory/defeat states
- **Visual Feedback**: Resource counters pulse on changes, smooth animations throughout
- **In-Game Help System**: Press H or ? to view comprehensive game guide
- **Statistics Tracking**: Press Tab to view detailed gameplay statistics

## How to Play

### Starting the Game

```bash
npm install
npm run dev
```

Then open your browser to the URL shown (typically http://localhost:5173)

### Goal

Find and reach the exit hex (marked with a yellow flag) with at least 1 population alive before winter kills your colony.

### Controls

#### Mouse Controls
- **Left Click**: Select hex / Place building
- **Right Click + Drag**: Pan camera around the map
- **Mouse Wheel**: Zoom in and out (10-50 units)

#### Keyboard Shortcuts
- **Arrow Keys / WASD**: Move camera
- **R Key**: Reset camera to default view
- **H or ? Key**: Toggle help panel
- **Tab Key**: Toggle statistics panel
- **Escape Key**: Close all panels

#### UI Buttons
- **? Button** (top-left): Open in-game help guide
- **📊 Statistics Button** (right side): View gameplay statistics
- **Move Capital Button**: Relocate your capital (once per year, costs 5 wood + 3 food)
- **End Turn Button**: Advance to the next turn

### Turn Structure

1. **Action Phase**: Build structures on explored hexes
2. **Production Phase**: Buildings automatically generate resources
3. **Consumption Phase**: Population consumes food, wood in winter
4. **Event Phase**: Random events and animal attacks
5. **Season Advance**: Move to next season (3 turns per season)

### Buildings

**Tier 1** (Available from start):
- **Farm** (2 wood): Produces 1-3 food/turn
- **Lumber Camp** (2 food): Produces 1-3 wood/turn
- **House** (3 wood, 1 stone): +1 population capacity
- **Warehouse** (4 wood): +10 storage capacity

**Tier 2** (Unlocks after 5 buildings):
- **Quarry** (3 wood, 2 food): Produces 1-3 stone/turn
- **Scout Tower** (3 wood, 2 stone): Reveals 2-hex radius
- **Hunting Lodge** (4 wood): Produces 1-2 food, any terrain
- **Heater** (5 wood, 3 stone): -50% winter wood consumption

**Tier 3** (Unlocks after 10 buildings):
- **Watchtower** (5 wood, 5 stone): Prevents animal attacks in 2-hex radius
- **Advanced Farm** (5 wood, 3 stone): Produces 2-4 food
- **Supply Depot** (8 wood, 5 stone): Relocate with resources intact

### Seasons

- **Spring**: Normal production
- **Summer**: +1 bonus to food production
- **Fall**: 20% animal attack chance
- **Winter**: -50% food production, requires wood for heating, 40% animal attack chance, no exploration

### Tips

1. **Press H or ?** to view the in-game help guide at any time
2. Build farms and lumber camps early on preferred terrain for bonuses
3. Explore aggressively to find the exit - it's randomly placed far from your start
4. Build heaters before year 2 to survive escalating winters
5. Scout towers reveal large areas quickly (2-hex radius)
6. Watchtowers protect against animal attacks within 2 hexes
7. Watch resource depletion - move capital to fresh hexes when tiles deplete
8. Use the building placement preview to plan your layout
9. Pan the camera with right-click to explore the map efficiently
10. Keep food and wood stockpiled before each winter
11. Advanced farms on grassland are very efficient (2-4 food per turn)
12. **Press Tab** to view your statistics and track progress

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Tech Stack

- **Three.js** (v0.160.0) for 3D hex grid rendering and animations
- **Vite** (v5.0.0) for fast build tooling and development
- **Vanilla JavaScript** (ES modules) - No framework dependencies
- **CSS3** for UI animations and glassmorphism effects

## License

MIT
