export class BuildingManager {
    constructor(gameState, hexGrid) {
        this.gameState = gameState;
        this.hexGrid = hexGrid;

        this.buildingDefinitions = {
            // Tier 1
            farm: {
                name: 'Farm',
                type: 'farm',
                tier: 1,
                cost: { wood: 2 },
                effect: 'Produces 1-3 food/turn (+1 on grassland)',
                productionType: 'food',
                diceRolls: 1,
                preferredTerrain: 'grassland'
            },
            lumberCamp: {
                name: 'Lumber Camp',
                type: 'lumberCamp',
                tier: 1,
                cost: { food: 2 },
                effect: 'Produces 1-3 wood/turn (+1 on forest)',
                productionType: 'wood',
                diceRolls: 1,
                preferredTerrain: 'forest'
            },
            house: {
                name: 'House',
                type: 'house',
                tier: 1,
                cost: { wood: 3, stone: 1 },
                effect: '+1 population capacity',
                productionType: 'maxPopulation',
                diceRolls: 0
            },
            warehouse: {
                name: 'Warehouse',
                type: 'warehouse',
                tier: 1,
                cost: { wood: 4 },
                effect: '+10 storage capacity',
                productionType: 'storageCapacity',
                diceRolls: 0
            },

            // Tier 2
            quarry: {
                name: 'Quarry',
                type: 'quarry',
                tier: 2,
                cost: { wood: 3, food: 2 },
                effect: 'Produces 1-3 stone/turn (+1 on mountain)',
                productionType: 'stone',
                diceRolls: 1,
                preferredTerrain: 'mountain'
            },
            scoutTower: {
                name: 'Scout Tower',
                type: 'scoutTower',
                tier: 2,
                cost: { wood: 3, stone: 2 },
                effect: 'Reveals 2-hex radius permanently',
                productionType: null,
                diceRolls: 0
            },
            huntingLodge: {
                name: 'Hunting Lodge',
                type: 'huntingLodge',
                tier: 2,
                cost: { wood: 4 },
                effect: 'Produces 1-2 food, no terrain requirement',
                productionType: 'food',
                diceRolls: 1,
                preferredTerrain: null
            },
            heater: {
                name: 'Heater',
                type: 'heater',
                tier: 2,
                cost: { wood: 5, stone: 3 },
                effect: 'Reduces winter wood consumption by 50%',
                productionType: null,
                diceRolls: 0
            },

            // Tier 3
            watchtower: {
                name: 'Watchtower',
                type: 'watchtower',
                tier: 3,
                cost: { wood: 5, stone: 5 },
                effect: 'Prevents animal attacks in 2-hex radius',
                productionType: null,
                diceRolls: 0
            },
            advancedFarm: {
                name: 'Advanced Farm',
                type: 'advancedFarm',
                tier: 3,
                cost: { wood: 5, stone: 3 },
                effect: 'Produces 2-4 food (+2 on grassland)',
                productionType: 'food',
                diceRolls: 1,
                preferredTerrain: 'grassland',
                advanced: true
            },
            supplyDepot: {
                name: 'Supply Depot',
                type: 'supplyDepot',
                tier: 3,
                cost: { wood: 8, stone: 5 },
                effect: 'Can relocate with resources intact',
                productionType: null,
                diceRolls: 0
            }
        };
    }

    getTier1Buildings() {
        return Object.values(this.buildingDefinitions).filter(b => b.tier === 1);
    }

    getTier2Buildings() {
        return Object.values(this.buildingDefinitions).filter(b => b.tier === 2);
    }

    getTier3Buildings() {
        return Object.values(this.buildingDefinitions).filter(b => b.tier === 3);
    }

    buildBuilding(q, r, buildingType) {
        const building = this.buildingDefinitions[buildingType];

        if (!building) {
            return { success: false, message: 'Unknown building type' };
        }

        // Check if hex is explored
        if (!this.gameState.isExplored(q, r)) {
            return { success: false, message: 'Cannot build on unexplored hex' };
        }

        // Check if hex already has a building
        if (this.gameState.getBuilding(q, r)) {
            return { success: false, message: 'Hex already has a building' };
        }

        // Check if can afford
        if (!this.gameState.canAfford(building.cost)) {
            return { success: false, message: 'Not enough resources' };
        }

        // Check if water
        const hexData = this.gameState.getHex(q, r);
        if (hexData.terrain === 'water') {
            return { success: false, message: 'Cannot build on water' };
        }

        // Check tier unlock
        if (building.tier === 2 && !this.gameState.isTier2Unlocked()) {
            return { success: false, message: 'Tier 2 locked (need 5 buildings)' };
        }

        if (building.tier === 3 && !this.gameState.isTier3Unlocked()) {
            return { success: false, message: 'Tier 3 locked (need 10 buildings)' };
        }

        // Pay cost
        this.gameState.payCost(building.cost);

        // Place building
        const buildingData = {
            ...building,
            position: { q, r }
        };

        this.gameState.placeBuilding(q, r, buildingData);

        // Add visual
        this.hexGrid.addBuildingVisual(q, r, buildingType);

        // Special building effects
        if (buildingType === 'house') {
            this.gameState.addResource('maxPopulation', 1);
        } else if (buildingType === 'warehouse') {
            this.gameState.addResource('storageCapacity', 10);
        } else if (buildingType === 'scoutTower') {
            this.revealArea(q, r, 2);
        }

        return {
            success: true,
            message: `Built ${building.name} at (${q}, ${r})`
        };
    }

    revealArea(centerQ, centerR, radius) {
        // Reveal all hexes within radius
        const mapSize = this.gameState.mapSize;
        const mapRadius = Math.floor(mapSize / 2);

        for (let q = -mapRadius; q <= mapRadius; q++) {
            for (let r = -mapRadius; r <= mapRadius; r++) {
                if (!this.gameState.isValidHex(q, r)) continue;

                const distance = this.gameState.hexDistance(centerQ, centerR, q, r);
                if (distance <= radius) {
                    if (!this.gameState.isExplored(q, r)) {
                        this.gameState.exploreHex(q, r);
                        this.hexGrid.updateHexVisuals(q, r);
                    }
                }
            }
        }
    }

    // Production logic
    rollProduction(building, hexData) {
        if (building.diceRolls === 0) return 0;

        let total = 0;

        for (let i = 0; i < building.diceRolls; i++) {
            let roll = this.rollDice();

            // Apply terrain bonus/penalty
            if (building.preferredTerrain) {
                if (hexData.terrain === building.preferredTerrain) {
                    roll += 1;
                } else if (building.type !== 'huntingLodge') {
                    roll -= 1;
                }
            }

            // Advanced farm bonus
            if (building.advanced && hexData.terrain === building.preferredTerrain) {
                roll += 1;
            }

            roll = Math.max(0, roll);

            // Convert roll to production
            let production = 0;
            if (building.productionType === 'stone') {
                // Quarry: 1-3=1, 4-5=2, 6+=3
                if (roll <= 3) production = 1;
                else if (roll <= 5) production = 2;
                else production = 3;
            } else if (building.type === 'huntingLodge') {
                // Hunting lodge: 1-3=1, 4+=2
                if (roll <= 3) production = 1;
                else production = 2;
            } else if (building.advanced) {
                // Advanced farm: 1-2=2, 3-4=3, 5+=4
                if (roll <= 2) production = 2;
                else if (roll <= 4) production = 3;
                else production = 4;
            } else {
                // Regular: 1-2=1, 3-4=2, 5+=3
                if (roll <= 2) production = 1;
                else if (roll <= 4) production = 2;
                else production = 3;
            }

            total += production;
        }

        // Apply depletion penalty
        if (hexData.depleted) {
            total = Math.floor(total * 0.5);
        }

        return total;
    }

    rollDice() {
        return Math.floor(Math.random() * 6) + 1;
    }

    // Check and update resource depletion
    updateDepletion(hexData, building, production) {
        if (!building.productionType || building.productionType === 'maxPopulation' ||
            building.productionType === 'storageCapacity') {
            return;
        }

        const resourceType = building.productionType;

        if (hexData.resources[resourceType] !== undefined) {
            hexData.resources[resourceType] -= production;

            if (hexData.resources[resourceType] <= 0 && !hexData.depleted) {
                hexData.depleted = true;
                hexData.resources[resourceType] = 0;
            }
        }
    }
}
