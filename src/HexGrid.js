import * as THREE from 'three';
import { TerrainGenerator } from './TerrainGenerator.js';

export class HexGrid {
    constructor(scene, gameState) {
        this.scene = scene;
        this.gameState = gameState;
        this.hexMeshes = [];
        this.hexSize = 1;
        this.terrainGenerator = new TerrainGenerator(gameState);

        // Hex geometry (flat-top orientation)
        this.hexGeometry = this.createHexGeometry();

        // Selected and hovered hex
        this.selectedHex = null;
        this.hoveredHex = null;

        // Capital marker
        this.capitalMarker = null;

        // Selection ring
        this.selectionRing = null;
        this.selectionRingScale = 1.0;
        this.selectionRingAnimationId = null;

        // Building preview
        this.buildingPreview = null;

        // Exit markers tracking
        this.exitMarkers = [];
        this.exitMarkerAnimationId = null;

        // Building visuals tracking
        this.buildingVisuals = new Map(); // key: "q,r", value: {building, roof}
    }

    createHexGeometry() {
        const geometry = new THREE.CylinderGeometry(this.hexSize, this.hexSize, 0.2, 6);
        geometry.rotateY(Math.PI / 6);
        return geometry;
    }

    generate() {
        // Generate terrain data
        this.terrainGenerator.generate();

        // Place exit
        const startPos = this.gameState.startHex;
        const exitPos = this.terrainGenerator.placeExit(startPos.q, startPos.r);
        this.gameState.setExitPosition(exitPos.q, exitPos.r);

        // Create hex meshes
        this.createHexMeshes();

        // Add capital marker
        this.updateCapitalMarker();
    }

    createHexMeshes() {
        const mapSize = this.gameState.mapSize;
        const radius = Math.floor(mapSize / 2);

        for (let q = -radius; q <= radius; q++) {
            for (let r = -radius; r <= radius; r++) {
                if (!this.gameState.isValidHex(q, r)) continue;

                const hexData = this.gameState.getHex(q, r);
                if (!hexData) continue;

                const position = this.axialToWorld(q, r);
                const material = this.createHexMaterial(hexData);

                const mesh = new THREE.Mesh(this.hexGeometry, material);
                mesh.position.set(position.x, 0, position.z);
                mesh.userData = { q, r, ...hexData };

                this.hexMeshes.push(mesh);
                this.scene.add(mesh);

                // Add exit marker if this is the exit hex
                if (q === this.gameState.exitHex.q && r === this.gameState.exitHex.r) {
                    // Only show if explored
                    if (this.gameState.isExplored(q, r)) {
                        this.addExitMarker(position);
                    }
                }
            }
        }
    }

    createHexMaterial(hexData) {
        let color = this.getTerrainColor(hexData.terrain);

        // Check if explored
        if (!this.gameState.isExplored(hexData.q, hexData.r)) {
            // Fog of war - dark color
            color = new THREE.Color(0x111122);
        }

        const material = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.8,
            metalness: 0.2
        });

        return material;
    }

    getTerrainColor(terrain) {
        const colors = {
            grassland: 0x4a9a4a,
            forest: 0x2d5a2d,
            mountain: 0x666666,
            water: 0x3a5f9a,
            desert: 0xc4a64a,
            cave: 0x3a3a3a
        };

        return new THREE.Color(colors[terrain] || 0x888888);
    }

    addExitMarker(position) {
        // Check if marker already exists at this position
        const existingMarker = this.exitMarkers.find(m =>
            m.position.x === position.x && m.position.z === position.z
        );
        if (existingMarker) return;

        const geometry = new THREE.ConeGeometry(0.3, 1.5, 4);
        const material = new THREE.MeshStandardMaterial({
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 0.5
        });

        const marker = new THREE.Mesh(geometry, material);
        marker.position.set(position.x, 1, position.z);
        marker.userData.baseY = 1;
        marker.userData.basePosition = { x: position.x, z: position.z };
        this.scene.add(marker);
        this.exitMarkers.push(marker);

        // Start animation loop only if not already running
        if (!this.exitMarkerAnimationId) {
            this.animateExitMarkers();
        }
    }

    animateExitMarkers() {
        this.exitMarkers.forEach(marker => {
            marker.position.y = marker.userData.baseY + Math.sin(Date.now() * 0.003) * 0.2;
            marker.rotation.y += 0.02;
        });

        this.exitMarkerAnimationId = requestAnimationFrame(() => this.animateExitMarkers());
    }

    stopExitMarkerAnimation() {
        if (this.exitMarkerAnimationId) {
            cancelAnimationFrame(this.exitMarkerAnimationId);
            this.exitMarkerAnimationId = null;
        }
    }

    // Convert axial coordinates to world position
    axialToWorld(q, r) {
        const x = this.hexSize * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
        const z = this.hexSize * (3 / 2 * r);
        return { x, z };
    }

    // Update hex visuals (for fog of war updates)
    updateHexVisuals(q, r) {
        const mesh = this.hexMeshes.find(m => m.userData.q === q && m.userData.r === r);
        if (!mesh) return;

        const hexData = this.gameState.getHex(q, r);
        const isExplored = this.gameState.isExplored(q, r);

        if (isExplored) {
            mesh.material.color = this.getTerrainColor(hexData.terrain);

            // Show exit marker if this is the exit
            if (q === this.gameState.exitHex.q && r === this.gameState.exitHex.r) {
                const position = this.axialToWorld(q, r);
                this.addExitMarker(position);
            }
        } else {
            mesh.material.color = new THREE.Color(0x111122);
        }
    }

    // Explore adjacent hexes
    exploreAdjacent(q, r) {
        const neighbors = this.gameState.getNeighbors(q, r);
        neighbors.forEach(neighbor => {
            if (!this.gameState.isExplored(neighbor.q, neighbor.r)) {
                this.gameState.exploreHex(neighbor.q, neighbor.r);
                this.updateHexVisuals(neighbor.q, neighbor.r);
            }
        });
    }

    selectHex(q, r) {
        // Clear previous selection
        if (this.selectedHex) {
            const prevMesh = this.hexMeshes.find(
                m => m.userData.q === this.selectedHex.q && m.userData.r === this.selectedHex.r
            );
            if (prevMesh && this.gameState.isExplored(this.selectedHex.q, this.selectedHex.r)) {
                const hexData = this.gameState.getHex(this.selectedHex.q, this.selectedHex.r);
                prevMesh.material.color = this.getTerrainColor(hexData.terrain);
            }
        }

        // Remove old selection ring
        if (this.selectionRing) {
            this.stopSelectionRingAnimation();
            this.scene.remove(this.selectionRing);
            this.selectionRing.geometry.dispose();
            this.selectionRing.material.dispose();
            this.selectionRing = null;
        }

        // Set new selection
        this.selectedHex = { q, r };
        const mesh = this.hexMeshes.find(m => m.userData.q === q && m.userData.r === r);
        if (mesh) {
            mesh.material.color = new THREE.Color(0xffaa00);

            // Add animated selection ring
            const position = this.axialToWorld(q, r);
            const ringGeometry = new THREE.RingGeometry(this.hexSize * 0.9, this.hexSize * 1.1, 6);
            ringGeometry.rotateX(-Math.PI / 2);
            ringGeometry.rotateZ(Math.PI / 6);

            const ringMaterial = new THREE.MeshBasicMaterial({
                color: 0xffd700,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.6
            });

            this.selectionRing = new THREE.Mesh(ringGeometry, ringMaterial);
            this.selectionRing.position.set(position.x, 0.15, position.z);
            this.scene.add(this.selectionRing);

            // Animate the ring
            this.animateSelectionRing();
        }
    }

    animateSelectionRing() {
        if (!this.selectionRing) {
            this.stopSelectionRingAnimation();
            return;
        }

        this.selectionRingScale = 1.0 + Math.sin(Date.now() * 0.003) * 0.1;
        this.selectionRing.scale.set(this.selectionRingScale, 1, this.selectionRingScale);
        this.selectionRing.material.opacity = 0.4 + Math.sin(Date.now() * 0.003) * 0.2;

        this.selectionRingAnimationId = requestAnimationFrame(() => this.animateSelectionRing());
    }

    stopSelectionRingAnimation() {
        if (this.selectionRingAnimationId) {
            cancelAnimationFrame(this.selectionRingAnimationId);
            this.selectionRingAnimationId = null;
        }
    }

    setHover(q, r, showBuildingPreview = false) {
        this.hoveredHex = { q, r };
        const mesh = this.hexMeshes.find(m => m.userData.q === q && m.userData.r === r);

        if (mesh && this.gameState.isExplored(q, r)) {
            // Don't change color if selected
            if (!this.selectedHex || this.selectedHex.q !== q || this.selectedHex.r !== r) {
                const hexData = this.gameState.getHex(q, r);
                const baseColor = this.getTerrainColor(hexData.terrain);
                mesh.material.color = new THREE.Color(baseColor).multiplyScalar(1.3);
            }

            // Show building preview
            if (showBuildingPreview && !this.gameState.getBuilding(q, r)) {
                const hexData = this.gameState.getHex(q, r);
                if (hexData.terrain !== 'water') {
                    this.showBuildingPreview(q, r);
                }
            }
        }
    }

    showBuildingPreview(q, r) {
        // Remove old preview
        this.clearBuildingPreview();

        const position = this.axialToWorld(q, r);
        const geometry = new THREE.BoxGeometry(0.8, 0.6, 0.8);
        const material = new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            roughness: 0.9,
            transparent: true,
            opacity: 0.5
        });

        this.buildingPreview = new THREE.Mesh(geometry, material);
        this.buildingPreview.position.set(position.x, 0.4, position.z);
        this.scene.add(this.buildingPreview);

        // Add roof preview
        const roofGeometry = new THREE.ConeGeometry(0.6, 0.4, 4);
        const roofMaterial = new THREE.MeshStandardMaterial({
            color: 0x654321,
            roughness: 0.9,
            transparent: true,
            opacity: 0.5
        });
        const roofPreview = new THREE.Mesh(roofGeometry, roofMaterial);
        roofPreview.position.set(position.x, 0.9, position.z);
        roofPreview.rotation.y = Math.PI / 4;
        this.scene.add(roofPreview);

        // Store both parts
        this.buildingPreview.userData.roof = roofPreview;
    }

    clearBuildingPreview() {
        if (this.buildingPreview) {
            this.scene.remove(this.buildingPreview);
            if (this.buildingPreview.userData.roof) {
                this.scene.remove(this.buildingPreview.userData.roof);
            }
            this.buildingPreview = null;
        }
    }

    clearHover() {
        if (this.hoveredHex) {
            const mesh = this.hexMeshes.find(
                m => m.userData.q === this.hoveredHex.q && m.userData.r === this.hoveredHex.r
            );

            if (mesh && this.gameState.isExplored(this.hoveredHex.q, this.hoveredHex.r)) {
                // Don't change color if selected
                if (!this.selectedHex || this.selectedHex.q !== this.hoveredHex.q ||
                    this.selectedHex.r !== this.hoveredHex.r) {
                    const hexData = this.gameState.getHex(this.hoveredHex.q, this.hoveredHex.r);
                    mesh.material.color = this.getTerrainColor(hexData.terrain);
                }
            }
        }
        this.hoveredHex = null;
        this.clearBuildingPreview();
    }

    // Add building visual to hex
    addBuildingVisual(q, r, buildingType) {
        const position = this.axialToWorld(q, r);
        const geometry = new THREE.BoxGeometry(0.8, 0.6, 0.8);
        const material = new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            roughness: 0.9
        });

        const building = new THREE.Mesh(geometry, material);
        building.position.set(position.x, 0.4, position.z);
        building.userData = { q, r, buildingType };
        this.scene.add(building);

        // Add roof
        const roofGeometry = new THREE.ConeGeometry(0.6, 0.4, 4);
        const roofMaterial = new THREE.MeshStandardMaterial({
            color: 0x654321,
            roughness: 0.9
        });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.set(position.x, 0.9, position.z);
        roof.rotation.y = Math.PI / 4;
        this.scene.add(roof);

        // Track building visuals for cleanup
        this.buildingVisuals.set(`${q},${r}`, { building, roof });
    }

    // Cleanup method for disposing Three.js resources
    dispose() {
        // Stop all animations
        this.stopSelectionRingAnimation();
        this.stopExitMarkerAnimation();

        // Dispose hex meshes
        this.hexMeshes.forEach(mesh => {
            mesh.geometry.dispose();
            mesh.material.dispose();
            this.scene.remove(mesh);
        });
        this.hexMeshes = [];

        // Dispose hex geometry
        if (this.hexGeometry) {
            this.hexGeometry.dispose();
        }

        // Dispose selection ring
        if (this.selectionRing) {
            this.selectionRing.geometry.dispose();
            this.selectionRing.material.dispose();
            this.scene.remove(this.selectionRing);
            this.selectionRing = null;
        }

        // Dispose building preview
        if (this.buildingPreview) {
            this.buildingPreview.geometry.dispose();
            this.buildingPreview.material.dispose();
            this.scene.remove(this.buildingPreview);
            if (this.buildingPreview.userData.roof) {
                this.buildingPreview.userData.roof.geometry.dispose();
                this.buildingPreview.userData.roof.material.dispose();
                this.scene.remove(this.buildingPreview.userData.roof);
            }
            this.buildingPreview = null;
        }

        // Dispose building visuals
        this.buildingVisuals.forEach(({ building, roof }) => {
            building.geometry.dispose();
            building.material.dispose();
            this.scene.remove(building);
            roof.geometry.dispose();
            roof.material.dispose();
            this.scene.remove(roof);
        });
        this.buildingVisuals.clear();

        // Dispose exit markers
        this.exitMarkers.forEach(marker => {
            marker.geometry.dispose();
            marker.material.dispose();
            this.scene.remove(marker);
        });
        this.exitMarkers = [];

        // Dispose capital marker
        if (this.capitalMarker) {
            this.capitalMarker.children.forEach(child => {
                child.geometry.dispose();
                child.material.dispose();
            });
            this.scene.remove(this.capitalMarker);
            this.capitalMarker = null;
        }
    }

    // Add/update capital marker visual
    updateCapitalMarker() {
        // Remove old marker if exists
        if (this.capitalMarker) {
            this.scene.remove(this.capitalMarker);
            this.capitalMarker = null;
        }

        // Add new marker at capital position
        const capitalPos = this.gameState.capitalPosition;
        if (capitalPos) {
            const position = this.axialToWorld(capitalPos.q, capitalPos.r);

            // Create a flag-like marker
            const poleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.2);
            const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
            const pole = new THREE.Mesh(poleGeometry, poleMaterial);
            pole.position.set(position.x, 0.7, position.z);

            const flagGeometry = new THREE.BoxGeometry(0.4, 0.3, 0.05);
            const flagMaterial = new THREE.MeshStandardMaterial({
                color: 0x4a90e2,
                emissive: 0x4a90e2,
                emissiveIntensity: 0.3
            });
            const flag = new THREE.Mesh(flagGeometry, flagMaterial);
            flag.position.set(position.x + 0.2, 1.1, position.z);

            this.capitalMarker = new THREE.Group();
            this.capitalMarker.add(pole);
            this.capitalMarker.add(flag);
            this.scene.add(this.capitalMarker);
        }
    }
}

