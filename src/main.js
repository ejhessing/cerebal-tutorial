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

        // Camera controls
        this.isDragging = false;
        this.dragStart = new THREE.Vector2();
        this.cameraTarget = new THREE.Vector3(0, 0, 0);
        this.cameraVelocity = new THREE.Vector3(0, 0, 0);

        // Event listeners
        this.setupEventListeners();

        // Store instance globally for modal buttons
        window.gameInstance = this;

        // Don't start game yet - wait for user to click start button
        // Animation loop
        this.animate();
    }

    startGame() {
        // Hide start modal
        document.getElementById('start-modal').classList.add('hidden');

        // Initialize game
        this.gameState.initialize();
        this.hexGrid.generate();
        this.uiManager.update();
    }

    restartGame() {
        // Hide game over modal
        document.getElementById('gameover-modal').classList.add('hidden');

        // Reset game state
        this.gameState = new GameState();

        // Clear scene
        while(this.scene.children.length > 0) {
            this.scene.remove(this.scene.children[0]);
        }

        // Re-add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        this.scene.add(directionalLight);

        // Reset camera
        this.camera.position.set(0, 25, 20);
        this.camera.lookAt(0, 0, 0);

        // Recreate game components
        this.hexGrid = new HexGrid(this.scene, this.gameState);
        this.uiManager = new UIManager(this.gameState, this.hexGrid);

        // Start new game
        this.startGame();
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
        this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.renderer.domElement.addEventListener('click', (e) => this.onMouseClick(e));
        this.renderer.domElement.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.renderer.domElement.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.renderer.domElement.addEventListener('wheel', (e) => this.onMouseWheel(e));

        // Disable right-click context menu
        this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

        // Camera controls (arrow keys)
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onMouseMove(event) {
        // Handle camera dragging
        if (this.isDragging) {
            const deltaX = event.clientX - this.dragStart.x;
            const deltaY = event.clientY - this.dragStart.y;

            this.camera.position.x -= deltaX * 0.02;
            this.camera.position.z -= deltaY * 0.02;

            this.dragStart.set(event.clientX, event.clientY);
            return;
        }

        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.hexGrid.hexMeshes);

        // Update hover state
        this.hexGrid.clearHover();
        if (intersects.length > 0) {
            const hexData = intersects[0].object.userData;
            const showPreview = this.uiManager && this.uiManager.selectedBuilding !== null;
            this.hexGrid.setHover(hexData.q, hexData.r, showPreview);
            this.uiManager.showTooltip(event.clientX, event.clientY, hexData);
        } else {
            this.uiManager.hideTooltip();
        }
    }

    onMouseDown(event) {
        // Right click or middle click for dragging
        if (event.button === 2 || event.button === 1) {
            event.preventDefault();
            this.isDragging = true;
            this.dragStart.set(event.clientX, event.clientY);
            this.renderer.domElement.style.cursor = 'grabbing';
        }
    }

    onMouseUp(event) {
        if (event.button === 2 || event.button === 1) {
            this.isDragging = false;
            this.renderer.domElement.style.cursor = 'default';
        }
    }

    onMouseWheel(event) {
        event.preventDefault();
        const zoomSpeed = 0.1;
        const delta = event.deltaY > 0 ? 1 : -1;

        // Zoom by moving camera closer/farther
        this.camera.position.y += delta * zoomSpeed * this.camera.position.y * 0.1;
        this.camera.position.y = Math.max(10, Math.min(50, this.camera.position.y));
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
        // Don't handle keys if typing in an input field
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }

        const moveSpeed = 2;
        switch(event.key) {
            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.camera.position.x -= moveSpeed;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.camera.position.x += moveSpeed;
                break;
            case 'ArrowUp':
            case 'w':
            case 'W':
                this.camera.position.z -= moveSpeed;
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                this.camera.position.z += moveSpeed;
                break;
            case 'r':
            case 'R':
                // Reset camera
                this.camera.position.set(0, 25, 20);
                this.camera.lookAt(0, 0, 0);
                break;
            case 'h':
            case 'H':
            case '?':
                // Toggle help
                if (this.uiManager) {
                    this.uiManager.toggleHelp();
                }
                break;
            case 'Tab':
                // Toggle stats
                event.preventDefault();
                if (this.uiManager) {
                    this.uiManager.toggleStats();
                }
                break;
            case 'Escape':
                // Close all panels
                document.getElementById('help-panel').classList.remove('visible');
                document.getElementById('stats-panel').classList.remove('visible');
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
