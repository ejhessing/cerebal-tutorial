import * as THREE from 'three';
import { HexGrid } from './HexGrid.js';
import { GameState } from './GameState.js';
import { UIManager } from './UIManager.js';

class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);

        // Game components
        this.gameState = new GameState();
        this.hexGrid = new HexGrid(this.scene, this.gameState);
        this.uiManager = new UIManager(this.gameState, this.hexGrid);

        // Camera setup
        this.camera.position.set(0, 25, 20);
        this.camera.lookAt(0, 0, 0);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        this.scene.add(directionalLight);

        // Raycaster for mouse interaction
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Event listeners
        this.setupEventListeners();

        // Start game
        this.gameState.initialize();
        this.hexGrid.generate();
        this.uiManager.update();

        // Animation loop
        this.animate();
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
        this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.renderer.domElement.addEventListener('click', (e) => this.onMouseClick(e));

        // Camera controls (simple pan with middle mouse or arrow keys)
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onMouseMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.hexGrid.hexMeshes);

        // Update hover state
        this.hexGrid.clearHover();
        if (intersects.length > 0) {
            const hexData = intersects[0].object.userData;
            this.hexGrid.setHover(hexData.q, hexData.r);
            this.uiManager.showTooltip(event.clientX, event.clientY, hexData);
        } else {
            this.uiManager.hideTooltip();
        }
    }

    onMouseClick(event) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.hexGrid.hexMeshes);

        if (intersects.length > 0) {
            const hexData = intersects[0].object.userData;

            // Only allow interaction with explored hexes
            if (this.gameState.isExplored(hexData.q, hexData.r)) {
                this.hexGrid.selectHex(hexData.q, hexData.r);
                this.uiManager.onHexSelected(hexData.q, hexData.r);
            }
        }
    }

    onKeyDown(event) {
        const moveSpeed = 2;
        switch(event.key) {
            case 'ArrowLeft':
                this.camera.position.x -= moveSpeed;
                break;
            case 'ArrowRight':
                this.camera.position.x += moveSpeed;
                break;
            case 'ArrowUp':
                this.camera.position.z -= moveSpeed;
                break;
            case 'ArrowDown':
                this.camera.position.z += moveSpeed;
                break;
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game
new Game();
