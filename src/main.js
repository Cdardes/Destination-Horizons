import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import { RoomBuilder } from './models/RoomBuilder';
import { GameState } from './gameState';

export class MansionMystery {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.controls = null;
        this.rooms = {};
        this.currentRoom = 'entrance_hall';
        this.gameState = new GameState();
        this.roomBuilder = new RoomBuilder();
        
        // Movement
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.canMove = true;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.prevTime = performance.now();

        this.init();
        this.setupLighting();
        this.loadRooms();
        this.setupControls();
        this.setupEventListeners();
        this.animate();
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        // Set initial camera position
        this.camera.position.set(0, 1.7, 5); // Average human height
        this.camera.lookAt(0, 1.7, 0);

        // Setup raycaster for interaction
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Create interaction highlight material
        this.highlightMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            opacity: 0.5,
            transparent: true
        });
        
        // Store original materials for highlighted objects
        this.originalMaterials = new WeakMap();
    }

    setupControls() {
        this.controls = new PointerLockControls(this.camera, document.body);

        // Setup pointer lock
        const blocker = document.getElementById('blocker');
        const instructions = document.getElementById('instructions');

        this.controls.addEventListener('lock', () => {
            instructions.style.display = 'none';
            blocker.style.display = 'none';
            this.canMove = true;
        });

        this.controls.addEventListener('unlock', () => {
            blocker.style.display = 'block';
            instructions.style.display = '';
            this.canMove = false;
        });
    }

    setupEventListeners() {
        // Movement controls
        const onKeyDown = (event) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    this.moveForward = true;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.moveBackward = true;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    this.moveLeft = true;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.moveRight = true;
                    break;
                case 'KeyE':
                    this.toggleInventory();
                    break;
                case 'Escape':
                    this.toggleMenu();
                    break;
            }
        };

        const onKeyUp = (event) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    this.moveForward = false;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.moveBackward = false;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    this.moveLeft = false;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.moveRight = false;
                    break;
            }
        };

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        document.addEventListener('click', (event) => this.onMouseClick(event));
        document.addEventListener('mousemove', (event) => this.onMouseMove(event));
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    loadRooms() {
        const roomTypes = [
            'entrance_hall',
            'library',
            'dining_room',
            'kitchen',
            'grand_staircase',
            'master_bedroom'
        ];

        roomTypes.forEach(type => {
            const room = this.roomBuilder.createRoom(type);
            this.rooms[type] = room;
            room.visible = type === this.currentRoom;
            this.scene.add(room);
        });
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 1);
        this.scene.add(ambientLight);

        // Directional light (simulates sunlight)
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
        dirLight.position.set(5, 5, 5);
        dirLight.castShadow = true;
        this.scene.add(dirLight);

        // Improve shadow quality
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 50;
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.canMove) {
            const time = performance.now();
            const delta = (time - this.prevTime) / 1000;

            this.velocity.x -= this.velocity.x * 10.0 * delta;
            this.velocity.z -= this.velocity.z * 10.0 * delta;

            this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
            this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
            this.direction.normalize();

            const speed = 5.0;
            if (this.moveForward || this.moveBackward) {
                this.velocity.z -= this.direction.z * speed * delta;
            }
            if (this.moveLeft || this.moveRight) {
                this.velocity.x -= this.direction.x * speed * delta;
            }

            this.controls.moveRight(-this.velocity.x * delta);
            this.controls.moveForward(-this.velocity.z * delta);

            this.prevTime = time;
        }

        this.checkInteractions();
        this.renderer.render(this.scene, this.camera);
    }

    checkInteractions() {
        // Cast a ray from the camera
        this.raycaster.setFromCamera(new THREE.Vector2(), this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        // Reset all previously highlighted objects
        this.originalMaterials.forEach((material, object) => {
            object.material = material;
        });
        this.originalMaterials.clear();

        // Highlight the first interactive object found
        for (const intersect of intersects) {
            const object = intersect.object;
            if (object.userData.interactive) {
                // Store original material and apply highlight
                this.originalMaterials.set(object, object.material);
                object.material = this.highlightMaterial;
                break;
            }
        }
    }

    onMouseClick(event) {
        if (!this.controls.isLocked) {
            this.controls.lock();
            return;
        }

        // Create a ray from the camera center
        const raycaster = new THREE.Raycaster();
        const center = new THREE.Vector2(0, 0);
        raycaster.setFromCamera(center, this.camera);
        
        const intersects = raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
            const object = intersects[0].object;
            if (object.userData.interactive) {
                this.handleInteraction(object);
            }
        }
    }

    handleInteraction(object) {
        if (object.userData.type === 'clue') {
            this.collectClue(object);
        }
        // Add other interaction types as needed
    }

    collectClue(object) {
        const clueName = object.userData.name;
        if (this.gameState.addClue(clueName)) {
            // Remove the clue from the scene
            object.parent.remove(object);
            this.updateInventoryDisplay();
            this.showNotification(`Found clue: ${clueName.replace('_', ' ')}`);
        }
    }

    updateInventoryDisplay() {
        const inventoryPanel = document.getElementById('inventory-items');
        inventoryPanel.innerHTML = this.gameState.inventory
            .map(item => `<div class="inventory-item">${item.replace('_', ' ')}</div>`)
            .join('');
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    toggleInventory() {
        const inventory = document.getElementById('inventory-panel');
        inventory.style.display = inventory.style.display === 'none' ? 'block' : 'none';
    }

    toggleMenu() {
        const menu = document.getElementById('interaction-menu');
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
}

// Start the game
const game = new MansionMystery();
window.game = game; // Make it accessible globally for debugging 