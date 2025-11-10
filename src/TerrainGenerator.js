export class TerrainGenerator {
    constructor(gameState) {
        this.gameState = gameState;

        // Terrain distribution percentages
        this.terrainTypes = [
            { type: 'grassland', weight: 35 },
            { type: 'forest', weight: 25 },
            { type: 'mountain', weight: 15 },
            { type: 'water', weight: 10 },
            { type: 'desert', weight: 10 },
            { type: 'cave', weight: 5 }
        ];

        // Resource capacity by terrain
        this.resourceCapacity = {
            grassland: { food: 15 },
            forest: { wood: 12 },
            mountain: { stone: 20 },
            water: {},
            desert: { food: 5, stone: 8 },
            cave: { stone: 25 }
        };
    }

    generate() {
        const mapSize = this.gameState.mapSize;
        const radius = Math.floor(mapSize / 2);

        // Generate random starting position near edge
        const startPos = this.generateStartPosition(radius);
        this.gameState.setStartPosition(startPos.q, startPos.r);

        // Generate terrain for all hexes
        for (let q = -radius; q <= radius; q++) {
            for (let r = -radius; r <= radius; r++) {
                if (!this.gameState.isValidHex(q, r)) continue;

                const terrain = this.selectTerrain(q, r);
                const hexData = {
                    q,
                    r,
                    terrain,
                    resources: { ...this.resourceCapacity[terrain] },
                    maxResources: { ...this.resourceCapacity[terrain] },
                    depleted: false
                };

                this.gameState.setHex(q, r, hexData);
            }
        }
    }

    generateStartPosition(radius) {
        // Pick random edge
        const edges = [
            // Top edge
            () => ({ q: this.randomInt(-radius, radius), r: -radius }),
            // Bottom edge
            () => ({ q: this.randomInt(-radius, radius), r: radius }),
            // Left edge
            () => ({ q: -radius, r: this.randomInt(-radius, radius) }),
            // Right edge
            () => ({ q: radius, r: this.randomInt(-radius, radius) })
        ];

        const edgeFunc = edges[Math.floor(Math.random() * edges.length)];
        let pos = edgeFunc();

        // Ensure it's valid
        while (!this.gameState.isValidHex(pos.q, pos.r)) {
            pos = edgeFunc();
        }

        return pos;
    }

    placeExit(startQ, startR) {
        const mapSize = this.gameState.mapSize;
        const radius = Math.floor(mapSize / 2);
        const minDistance = 12;

        let attempts = 0;
        let exitPos;

        while (attempts < 100) {
            // Place in opposite quadrant
            const q = startQ > 0 ?
                this.randomInt(-radius, -Math.floor(radius / 2)) :
                this.randomInt(Math.floor(radius / 2), radius);

            const r = startR > 0 ?
                this.randomInt(-radius, -Math.floor(radius / 2)) :
                this.randomInt(Math.floor(radius / 2), radius);

            if (!this.gameState.isValidHex(q, r)) {
                attempts++;
                continue;
            }

            const distance = this.gameState.hexDistance(startQ, startR, q, r);

            if (distance >= minDistance) {
                // Ensure it's not water
                const hexData = this.gameState.getHex(q, r);
                if (hexData.terrain !== 'water') {
                    exitPos = { q, r };
                    break;
                }
            }

            attempts++;
        }

        // Fallback if no position found
        if (!exitPos) {
            exitPos = {
                q: -startQ,
                r: -startR
            };
        }

        return exitPos;
    }

    selectTerrain(q, r) {
        // Use simple noise-like patterns for clustering
        const noise = this.simpleNoise(q, r);

        // Convert noise to terrain type
        let cumulative = 0;
        for (const terrainType of this.terrainTypes) {
            cumulative += terrainType.weight;
            if (noise * 100 < cumulative) {
                return terrainType.type;
            }
        }

        return 'grassland'; // Default fallback
    }

    simpleNoise(q, r) {
        // Simple pseudo-random noise based on coordinates
        const x = q * 12.9898 + r * 78.233;
        const frac = Math.abs(Math.sin(x) * 43758.5453);
        return frac - Math.floor(frac);
    }

    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}
