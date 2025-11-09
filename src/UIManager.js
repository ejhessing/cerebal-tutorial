import { BuildingManager } from './BuildingManager.js';
import { TurnManager } from './TurnManager.js';

export class UIManager {
    constructor(gameState, hexGrid) {
        this.gameState = gameState;
        this.hexGrid = hexGrid;
        this.buildingManager = new BuildingManager(gameState, hexGrid);
        this.turnManager = new TurnManager(gameState, hexGrid, this);

        this.selectedBuilding = null;
        this.selectedHexPos = null;
        this.movingCapital = false;

        this.setupEventListeners();
        this.renderBuildingMenu();
    }

    setupEventListeners() {
        // End turn button
        document.getElementById('end-turn-btn').addEventListener('click', () => {
            this.turnManager.endTurn();
            this.update();
        });

        // Move capital button
        document.getElementById('move-capital-btn').addEventListener('click', () => {
            this.toggleMoveCapital();
        });

        // Building menu clicks
        document.getElementById('building-list').addEventListener('click', (e) => {
            const buildingItem = e.target.closest('.building-item');
            if (buildingItem && !buildingItem.classList.contains('locked') &&
                !buildingItem.classList.contains('disabled')) {
                this.selectBuilding(buildingItem.dataset.buildingType);
            }
        });
    }

    update() {
        this.updateResourceDisplay();
        this.updateSeasonDisplay();
        this.renderBuildingMenu();
        this.updateMoveCapitalButton();
    }

    updateMoveCapitalButton() {
        const btn = document.getElementById('move-capital-btn');
        const canMove = this.gameState.canMoveCapital();
        const canAfford = this.gameState.canAfford({ wood: 5, food: 3 });

        btn.disabled = !canMove || !canAfford;

        if (this.movingCapital) {
            btn.classList.add('active');
            btn.textContent = 'Cancel Move';
        } else {
            btn.classList.remove('active');
            btn.textContent = 'Move Capital (5🪵 3🌾)';
        }
    }

    toggleMoveCapital() {
        this.movingCapital = !this.movingCapital;

        if (this.movingCapital) {
            this.selectedBuilding = null;
            this.addLog('Select a hex within 3 spaces to move capital', 'log-info');
        }

        this.updateMoveCapitalButton();
        this.renderBuildingMenu();
    }

    updateResourceDisplay() {
        const res = this.gameState.resources;
        document.getElementById('food-count').textContent = res.food;
        document.getElementById('wood-count').textContent = res.wood;
        document.getElementById('stone-count').textContent = res.stone;
        document.getElementById('population-count').textContent =
            `${res.population}/${res.maxPopulation}`;
    }

    updateSeasonDisplay() {
        const season = this.gameState.getCurrentSeason();
        document.getElementById('season-name').textContent = season.name;
        document.getElementById('turn-number').textContent = season.turn;
        document.getElementById('year-number').textContent = season.year;
    }

    renderBuildingMenu() {
        const container = document.getElementById('building-list');
        container.innerHTML = '';

        // Group buildings by tier
        const tier1 = this.buildingManager.getTier1Buildings();
        const tier2 = this.buildingManager.getTier2Buildings();
        const tier3 = this.buildingManager.getTier3Buildings();

        this.renderBuildingTier(container, 'Tier 1', tier1, false);
        this.renderBuildingTier(container, 'Tier 2', tier2, !this.gameState.isTier2Unlocked());
        this.renderBuildingTier(container, 'Tier 3', tier3, !this.gameState.isTier3Unlocked());
    }

    renderBuildingTier(container, tierName, buildings, locked) {
        const tierDiv = document.createElement('div');
        tierDiv.className = 'building-tier';

        const tierTitle = document.createElement('h3');
        tierTitle.textContent = locked ? `${tierName} (Locked)` : tierName;
        tierDiv.appendChild(tierTitle);

        buildings.forEach(building => {
            const item = document.createElement('div');
            item.className = 'building-item';
            item.dataset.buildingType = building.type;

            if (locked) {
                item.classList.add('locked');
            }

            const canAfford = this.gameState.canAfford(building.cost);
            if (!canAfford && !locked) {
                item.classList.add('disabled');
            }

            if (this.selectedBuilding === building.type) {
                item.classList.add('selected');
            }

            item.innerHTML = `
                <div class="building-name">${building.name}</div>
                <div class="building-cost">${this.formatCost(building.cost)}</div>
                <div class="building-effect">${building.effect}</div>
            `;

            tierDiv.appendChild(item);
        });

        container.appendChild(tierDiv);
    }

    formatCost(cost) {
        return Object.entries(cost)
            .map(([resource, amount]) => {
                const icons = {
                    food: '🌾',
                    wood: '🪵',
                    stone: '🪨'
                };
                return `${icons[resource] || ''} ${amount}`;
            })
            .join(', ');
    }

    selectBuilding(buildingType) {
        this.selectedBuilding = buildingType;
        this.renderBuildingMenu();
        this.addLog(`Selected ${buildingType}. Click on an explored hex to build.`, 'log-info');
    }

    onHexSelected(q, r) {
        this.selectedHexPos = { q, r };

        // If moving capital, try to move
        if (this.movingCapital) {
            const result = this.gameState.moveCapital(q, r);

            if (result.success) {
                this.addLog(result.message, 'log-info');
                this.movingCapital = false;

                // Update exploration visuals
                const neighbors = this.gameState.getNeighbors(q, r);
                neighbors.forEach(neighbor => {
                    this.hexGrid.updateHexVisuals(neighbor.q, neighbor.r);
                });

                // Add visual marker for capital
                this.hexGrid.updateCapitalMarker();

                this.update();
            } else {
                this.addLog(result.message, 'log-event');
            }
            return;
        }

        // If building selected, try to build
        if (this.selectedBuilding) {
            const result = this.buildingManager.buildBuilding(q, r, this.selectedBuilding);

            if (result.success) {
                this.addLog(result.message, 'log-info');
                this.selectedBuilding = null;
                this.update();
            } else {
                this.addLog(result.message, 'log-event');
            }
        }
    }

    showTooltip(x, y, hexData) {
        const tooltip = document.getElementById('tooltip');

        if (!this.gameState.isExplored(hexData.q, hexData.r)) {
            tooltip.innerHTML = `
                <div class="tooltip-title">Unexplored</div>
                <div class="tooltip-line">Move here or build a Scout Tower to reveal.</div>
            `;
        } else {
            const building = this.gameState.getBuilding(hexData.q, hexData.r);
            const isExit = hexData.q === this.gameState.exitHex.q &&
                          hexData.r === this.gameState.exitHex.r;

            let content = `
                <div class="tooltip-title">${this.capitalize(hexData.terrain)}</div>
                <div class="tooltip-line">Position: (${hexData.q}, ${hexData.r})</div>
            `;

            if (hexData.resources) {
                const resources = Object.entries(hexData.resources)
                    .map(([type, amount]) => `${this.capitalize(type)}: ${amount}`)
                    .join(', ');
                if (resources) {
                    content += `<div class="tooltip-line">${resources}</div>`;
                }
            }

            if (hexData.depleted) {
                content += `<div class="tooltip-line" style="color: #f88;">⚠ Depleted (-50% production)</div>`;
            }

            if (building) {
                content += `<div class="tooltip-line" style="color: #8af;">🏠 ${building.name}</div>`;
            }

            if (isExit) {
                content += `<div class="tooltip-line" style="color: #ff0;">🚩 EXIT - Move capital here to win!</div>`;
            }

            tooltip.innerHTML = content;
        }

        tooltip.style.left = (x + 15) + 'px';
        tooltip.style.top = (y + 15) + 'px';
        tooltip.classList.add('visible');
    }

    hideTooltip() {
        document.getElementById('tooltip').classList.remove('visible');
    }

    addLog(message, className = 'log-info') {
        const log = document.getElementById('action-log');
        const entry = document.createElement('div');
        entry.className = `log-entry ${className}`;
        entry.textContent = message;

        log.insertBefore(entry, log.firstChild);

        // Keep only last 20 entries
        while (log.children.length > 20) {
            log.removeChild(log.lastChild);
        }
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    showGameOver() {
        const message = this.gameState.won ?
            `🎉 Victory! You escaped with ${this.gameState.resources.population} survivors!\nScore: ${this.gameState.score}` :
            `💀 Game Over! Your colony perished.\nScore: ${this.gameState.score}`;

        setTimeout(() => {
            alert(message);
        }, 100);
    }
}
