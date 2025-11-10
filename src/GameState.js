export class GameState {
    constructor() {
        // Resources
        this.resources = {
            food: 8,
            wood: 8,
            stone: 3,
            population: 2,
            maxPopulation: 2,
            storageCapacity: 20
        };

        // Map data
        this.mapSize = 15;
        this.hexes = new Map(); // key: "q,r", value: hex data
        this.exploredHexes = new Set(); // Set of "q,r" strings
        this.buildings = new Map(); // key: "q,r", value: building data

        // Game state
        this.turn = 1;
        this.year = 1;
        this.season = 0; // 0=Spring, 1=Summer, 2=Fall, 3=Winter
        this.seasonNames = ['Spring', 'Summer', 'Fall', 'Winter'];

        // Starting position
        this.startHex = null;
        this.exitHex = null;
        this.capitalPosition = null;

        // Game status
        this.gameOver = false;
        this.won = false;
        this.score = 0;

        // Building unlock progress
        this.totalBuildings = 0;

        // Capital movement tracking
        this.lastCapitalMoveYear = 0; // Track last year capital was moved

        // Statistics tracking
        this.stats = {
            foodProduced: 0,
            woodProduced: 0,
            stoneProduced: 0,
            capitalRelocations: 0,
            populationPeak: 2
        };
    }

    initialize() {
        // Will be called after map generation to set starting position
        console.log('GameState initialized');
    }

    setStartPosition(q, r) {
        this.startHex = { q, r };
        this.capitalPosition = { q, r };

        // Explore starting hex and adjacent hexes
        this.exploreHex(q, r);
        const neighbors = this.getNeighbors(q, r);
        neighbors.forEach(neighbor => {
            this.exploreHex(neighbor.q, neighbor.r);
        });
    }

    setExitPosition(q, r) {
        this.exitHex = { q, r };
    }

    exploreHex(q, r) {
        this.exploredHexes.add(`${q},${r}`);
    }

    isExplored(q, r) {
        return this.exploredHexes.has(`${q},${r}`);
    }

    getHex(q, r) {
        return this.hexes.get(`${q},${r}`);
    }

    setHex(q, r, data) {
        this.hexes.set(`${q},${r}`, data);
    }

    getBuilding(q, r) {
        return this.buildings.get(`${q},${r}`);
    }

    placeBuilding(q, r, building) {
        this.buildings.set(`${q},${r}`, building);
        this.totalBuildings++;
    }

    removeBuilding(q, r) {
        this.buildings.delete(`${q},${r}`);
        this.totalBuildings--;
    }

    // Get neighboring hexes (axial coordinates)
    getNeighbors(q, r) {
        const directions = [
            [+1, 0], [+1, -1], [0, -1],
            [-1, 0], [-1, +1], [0, +1]
        ];

        return directions
            .map(([dq, dr]) => ({ q: q + dq, r: r + dr }))
            .filter(({ q, r }) => this.isValidHex(q, r));
    }

    isValidHex(q, r) {
        // Check if hex is within map bounds
        const x = q;
        const z = r;
        const y = -q - r;

        const maxCoord = Math.floor(this.mapSize / 2);
        return Math.abs(x) <= maxCoord &&
               Math.abs(z) <= maxCoord &&
               Math.abs(y) <= maxCoord;
    }

    // Calculate Manhattan distance between two hexes
    hexDistance(q1, r1, q2, r2) {
        return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
    }

    // Get current season info
    getCurrentSeason() {
        return {
            name: this.seasonNames[this.season],
            index: this.season,
            turn: this.turn,
            year: this.year,
            turnInSeason: ((this.turn - 1) % 3) + 1
        };
    }

    // Advance to next turn
    advanceTurn() {
        this.turn++;

        // Check if season changes (every 3 turns)
        if (this.turn % 3 === 1 && this.turn > 1) {
            this.season = (this.season + 1) % 4;

            // New year after winter
            if (this.season === 0) {
                this.year++;
            }
        }
    }

    // Check if building tier is unlocked
    isTier2Unlocked() {
        return this.totalBuildings >= 5;
    }

    isTier3Unlocked() {
        return this.totalBuildings >= 10;
    }

    // Add resources
    addResource(type, amount) {
        if (type === 'population') {
            this.resources[type] = Math.min(
                this.resources[type] + amount,
                this.resources.maxPopulation
            );
            // Track population peak
            if (this.resources[type] > this.stats.populationPeak) {
                this.stats.populationPeak = this.resources[type];
            }
        } else if (type === 'maxPopulation') {
            this.resources[type] += amount;
        } else if (type === 'storageCapacity') {
            this.resources[type] += amount;
        } else {
            const max = this.resources.storageCapacity;
            this.resources[type] = Math.min(this.resources[type] + amount, max);

            // Track production
            if (type === 'food') this.stats.foodProduced += amount;
            else if (type === 'wood') this.stats.woodProduced += amount;
            else if (type === 'stone') this.stats.stoneProduced += amount;
        }
    }

    // Remove resources
    removeResource(type, amount) {
        this.resources[type] = Math.max(0, this.resources[type] - amount);
    }

    // Check if can afford cost
    canAfford(cost) {
        return Object.entries(cost).every(([resource, amount]) => {
            return this.resources[resource] >= amount;
        });
    }

    // Pay cost
    payCost(cost) {
        Object.entries(cost).forEach(([resource, amount]) => {
            this.removeResource(resource, amount);
        });
    }

    // Check win condition
    checkWinCondition() {
        // Defensive check: ensure game is initialized
        if (!this.capitalPosition || !this.exitHex) {
            return false;
        }

        if (this.capitalPosition.q === this.exitHex.q &&
            this.capitalPosition.r === this.exitHex.r &&
            this.resources.population > 0) {
            this.won = true;
            this.gameOver = true;
            this.calculateScore();
            return true;
        }
        return false;
    }

    // Check loss condition
    checkLossCondition() {
        if (this.resources.population <= 0) {
            this.won = false;
            this.gameOver = true;
            this.calculateScore();
            return true;
        }
        return false;
    }

    calculateScore() {
        this.score = 1000 - (this.turn * 10) +
                     (this.resources.food + this.resources.wood + this.resources.stone) +
                     (this.resources.population * 50);
    }

    // Capital movement
    canMoveCapital() {
        // Can only move once per year
        return this.lastCapitalMoveYear < this.year;
    }

    moveCapital(q, r) {
        // Defensive check: ensure game is initialized
        if (!this.capitalPosition) {
            return { success: false, message: 'Game not initialized' };
        }

        if (!this.canMoveCapital()) {
            return { success: false, message: 'Can only relocate once per year' };
        }

        // Check if hex is explored
        if (!this.isExplored(q, r)) {
            return { success: false, message: 'Cannot move to unexplored hex' };
        }

        // Check if within 3 hex range
        const distance = this.hexDistance(this.capitalPosition.q, this.capitalPosition.r, q, r);
        if (distance > 3) {
            return { success: false, message: 'Too far! Max 3 hexes away' };
        }

        // Check cost
        const cost = { wood: 5, food: 3 };
        if (!this.canAfford(cost)) {
            return { success: false, message: 'Not enough resources (need 5 wood, 3 food)' };
        }

        // Check if hex exists and is not water
        const hexData = this.getHex(q, r);
        if (!hexData) {
            return { success: false, message: 'Invalid hex' };
        }
        if (hexData.terrain === 'water') {
            return { success: false, message: 'Cannot move to water' };
        }

        // Pay cost
        this.payCost(cost);

        // Move capital
        this.capitalPosition = { q, r };
        this.lastCapitalMoveYear = this.year;
        this.stats.capitalRelocations++;

        // Explore adjacent hexes
        const neighbors = this.getNeighbors(q, r);
        neighbors.forEach(neighbor => {
            this.exploreHex(neighbor.q, neighbor.r);
        });

        return { success: true, message: `Capital relocated to (${q}, ${r})` };
    }
}

