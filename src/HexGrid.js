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
        const geometry = new THREE.ConeGeometry(0.3, 1.5, 4);
        const material = new THREE.MeshStandardMaterial({
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 0.5
        });

        const marker = new THREE.Mesh(geometry, material);
        marker.position.set(position.x, 1, position.z);
        this.scene.add(marker);

        // Add pulsing animation
        const animate = () => {
            marker.position.y = 1 + Math.sin(Date.now() * 0.003) * 0.2;
            marker.rotation.y += 0.02;
            requestAnimationFrame(animate);
        };
        animate();
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

        // Set new selection
        this.selectedHex = { q, r };
        const mesh = this.hexMeshes.find(m => m.userData.q === q && m.userData.r === r);
        if (mesh) {
            mesh.material.color = new THREE.Color(0xffaa00);
        }
    }

    setHover(q, r) {
        this.hoveredHex = { q, r };
        const mesh = this.hexMeshes.find(m => m.userData.q === q && m.userData.r === r);

        if (mesh && this.gameState.isExplored(q, r)) {
            // Don't change color if selected
            if (!this.selectedHex || this.selectedHex.q !== q || this.selectedHex.r !== r) {
                const hexData = this.gameState.getHex(q, r);
                const baseColor = this.getTerrainColor(hexData.terrain);
                mesh.material.color = new THREE.Color(baseColor).multiplyScalar(1.3);
            }
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

