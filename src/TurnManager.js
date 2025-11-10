export class TurnManager {
    constructor(gameState, hexGrid, uiManager, buildingManager) {
        this.gameState = gameState;
        this.hexGrid = hexGrid;
        this.uiManager = uiManager;
        this.buildingManager = buildingManager;

        this.heaterCount = 0;
        this.watchtowerPositions = [];
    }

    endTurn() {
        if (this.gameState.gameOver) {
            this.uiManager.addLog('Game is over!', 'log-event');
            return;
        }

        // Phase 1: Production
        this.productionPhase();

        // Phase 2: Consumption
        this.consumptionPhase();

        // Phase 3: Events
        this.eventPhase();

        // Phase 4: Advance turn
        this.gameState.advanceTurn();

        // Check win/loss
        if (this.gameState.checkWinCondition()) {
            this.uiManager.showGameOver();
            return;
        }

        if (this.gameState.checkLossCondition()) {
            this.uiManager.showGameOver();
            return;
        }

        const season = this.gameState.getCurrentSeason();
        this.uiManager.addLog(
            `Turn ${season.turn} - ${season.name} ${season.year}`,
            'log-info'
        );
    }

    productionPhase() {
        let totalFood = 0;
        let totalWood = 0;
        let totalStone = 0;

        this.heaterCount = 0;
        this.watchtowerPositions = [];

        this.gameState.buildings.forEach((building, key) => {
            const [q, r] = key.split(',').map(Number);
            const hexData = this.gameState.getHex(q, r);

            // Count special buildings
            if (building.type === 'heater') {
                this.heaterCount++;
            }
            if (building.type === 'watchtower') {
                this.watchtowerPositions.push({ q, r });
            }

            // Skip if no production
            if (building.diceRolls === 0) return;

            // Calculate production using BuildingManager
            let production = this.buildingManager.rollProduction(building, hexData);

            // Apply season modifiers
            production = this.applySeasonModifiers(production, building);

            // Update depletion using BuildingManager
            const becameDepleted = this.buildingManager.updateDepletion(hexData, building, production);
            if (becameDepleted) {
                this.uiManager.addLog(
                    `Hex (${hexData.q}, ${hexData.r}) depleted! Production -50%`,
                    'log-event'
                );
            }

            // Add to totals
            if (building.productionType === 'food') {
                totalFood += production;
                this.gameState.addResource('food', production);
            } else if (building.productionType === 'wood') {
                totalWood += production;
                this.gameState.addResource('wood', production);
            } else if (building.productionType === 'stone') {
                totalStone += production;
                this.gameState.addResource('stone', production);
            }
        });

        // Log production
        if (totalFood > 0) {
            this.uiManager.addLog(`+${totalFood} food produced`, 'log-production');
        }
        if (totalWood > 0) {
            this.uiManager.addLog(`+${totalWood} wood produced`, 'log-production');
        }
        if (totalStone > 0) {
            this.uiManager.addLog(`+${totalStone} stone produced`, 'log-production');
        }
    }

    applySeasonModifiers(production, building) {
        const season = this.gameState.season;

        // Summer: +1 food
        if (season === 1 && building.productionType === 'food') {
            return production + 1;
        }

        // Winter: reduce food production
        if (season === 3 && building.productionType === 'food') {
            const year = this.gameState.year;
            let penalty = 0.5; // Year 1: -50%

            if (year === 2) penalty = 0.4; // -60%
            else if (year === 3) penalty = 0.3; // -70%
            else if (year >= 4) penalty = 0.2; // -80%

            return Math.ceil(production * penalty);
        }

        return production;
    }

    consumptionPhase() {
        const season = this.gameState.season;
        const year = this.gameState.year;
        const pop = this.gameState.resources.population;

        // Food consumption (always)
        let foodNeeded = pop;

        // Winter escalation
        if (season === 3) {
            if (year >= 3) {
                foodNeeded = pop * 2;
            }
        }

        this.gameState.removeResource('food', foodNeeded);
        this.uiManager.addLog(`-${foodNeeded} food consumed`, 'log-consumption');

        // Check starvation
        if (this.gameState.resources.food < 0) {
            const deficit = Math.abs(this.gameState.resources.food);
            this.gameState.resources.food = 0;

            const popLoss = Math.min(pop, Math.ceil(deficit / 2));
            this.gameState.removeResource('population', popLoss);
            this.uiManager.addLog(
                `⚠ Starvation! Lost ${popLoss} population`,
                'log-event'
            );
        }

        // Wood consumption in winter
        if (season === 3) {
            let woodNeeded = 2;

            if (year === 2) woodNeeded = 3;
            else if (year >= 3) woodNeeded = 4;

            // Heater reduction
            if (this.heaterCount > 0) {
                woodNeeded = Math.ceil(woodNeeded * 0.5);
                this.uiManager.addLog(
                    `Heaters active! Wood need reduced to ${woodNeeded}`,
                    'log-info'
                );
            }

            this.gameState.removeResource('wood', woodNeeded);
            this.uiManager.addLog(`-${woodNeeded} wood consumed (winter)`, 'log-consumption');

            // Check freezing
            if (this.gameState.resources.wood < 0) {
                const deficit = Math.abs(this.gameState.resources.wood);
                this.gameState.resources.wood = 0;

                const popLoss = Math.min(pop, Math.ceil(deficit / 3));
                this.gameState.removeResource('population', popLoss);
                this.uiManager.addLog(
                    `⚠ Freezing! Lost ${popLoss} population`,
                    'log-event'
                );
            }
        }
    }

    eventPhase() {
        const season = this.gameState.season;

        // Random event (10% chance)
        if (Math.random() < 0.1) {
            this.triggerRandomEvent();
            return;
        }

        // Animal attacks in fall/winter
        let attackChance = 0;
        if (season === 2) attackChance = 0.2;
        if (season === 3) attackChance = 0.4;

        if (Math.random() < attackChance) {
            this.triggerAnimalAttack();
        }
    }

    triggerRandomEvent() {
        const events = [
            {
                name: 'Abundance',
                effect: () => {
                    this.uiManager.addLog('🌟 Abundance! +50% production next turn', 'log-event');
                    // Would need to implement next turn modifier
                }
            },
            {
                name: 'Blight',
                effect: () => {
                    const loss = Math.floor(this.gameState.resources.food * 0.3);
                    this.gameState.removeResource('food', loss);
                    this.uiManager.addLog(`🦠 Blight! Lost ${loss} food`, 'log-event');
                }
            },
            {
                name: 'Discovery',
                effect: () => {
                    // Reveal random unexplored hex
                    const unexplored = [];
                    this.gameState.hexes.forEach((hex, key) => {
                        if (!this.gameState.isExplored(hex.q, hex.r)) {
                            unexplored.push(hex);
                        }
                    });

                    if (unexplored.length > 0) {
                        const hex = unexplored[Math.floor(Math.random() * unexplored.length)];
                        this.gameState.exploreHex(hex.q, hex.r);
                        this.hexGrid.updateHexVisuals(hex.q, hex.r);
                        this.uiManager.addLog(
                            `🗺 Discovery! Revealed hex (${hex.q}, ${hex.r})`,
                            'log-event'
                        );
                    }
                }
            },
            {
                name: 'Traders',
                effect: () => {
                    this.gameState.addResource('food', 5);
                    this.gameState.addResource('wood', 5);
                    this.uiManager.addLog('🛒 Traders arrived! +5 food, +5 wood', 'log-event');
                }
            },
            {
                name: 'Harsh Weather',
                effect: () => {
                    const loss = Math.min(3, this.gameState.resources.wood);
                    this.gameState.removeResource('wood', loss);
                    this.uiManager.addLog(`❄ Harsh weather! Lost ${loss} wood`, 'log-event');
                }
            }
        ];

        const event = events[Math.floor(Math.random() * events.length)];
        event.effect();
    }

    triggerAnimalAttack() {
        const capitalPos = this.gameState.capitalPosition;

        // Check if protected by watchtower
        const isProtected = this.watchtowerPositions.some(tower => {
            const distance = this.gameState.hexDistance(
                capitalPos.q, capitalPos.r, tower.q, tower.r
            );
            return distance <= 2;
        });

        if (isProtected) {
            this.uiManager.addLog('🛡 Animal attack repelled by watchtower!', 'log-event');
            return;
        }

        // Roll damage
        const damage = Math.floor(Math.random() * 3) + 1;

        if (this.gameState.resources.food >= damage) {
            this.gameState.removeResource('food', damage);
            this.uiManager.addLog(`🐺 Animal attack! Lost ${damage} food`, 'log-event');
        } else {
            const foodLoss = this.gameState.resources.food;
            this.gameState.resources.food = 0;

            const popLoss = 1;
            this.gameState.removeResource('population', popLoss);
            this.uiManager.addLog(
                `🐺 Animal attack! Lost ${foodLoss} food and ${popLoss} population`,
                'log-event'
            );
        }
    }
}
