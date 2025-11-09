# Hex Escape

A turn-based hex grid survival strategy game built with Three.js.

## Game Overview

Survive deadly winters, explore a fog-covered hex island, and find the randomly-placed exit before your colony dies. Manage resources, build structures, and make strategic decisions to keep your population alive.

## Features

- **Hex Grid Map**: 15x15 procedurally generated hex map with 6 terrain types
- **Fog of War**: Explore the map to reveal hidden hexes
- **Resource Management**: Manage Food, Wood, Stone, and Population
- **Building System**: 11 different buildings across 3 tiers
- **Seasonal System**: 4 seasons with unique effects and challenges
- **Winter Escalation**: Each year, winters become more deadly
- **Dice-Based Production**: Buildings use dice rolls for production
- **Random Events**: Encounter traders, discoveries, attacks, and more
- **Resource Depletion**: Terrain resources deplete over time

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

- **Mouse**: Hover over hexes to see information
- **Click**: Select a hex or building
- **Arrow Keys**: Pan the camera
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

1. Build farms and lumber camps early on preferred terrain for bonuses
2. Explore aggressively to find the exit
3. Build heaters before year 2 to survive escalating winters
4. Scout towers reveal large areas quickly
5. Watchtowers protect against animal attacks
6. Watch resource depletion - move to fresh hexes when needed

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Tech Stack

- Three.js for 3D rendering
- Vite for build tooling
- Vanilla JavaScript (ES modules)

## License

MIT
