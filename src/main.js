import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

class MansionMystery {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.controls = null;
        this.rooms = {};
        this.currentRoom = 'entrance_hall';
        this.inventory = [];
        this.turns = 0;
        this.maxTurns = 20;

        this.init();
        this.setupLighting();
        this.loadRooms();
        this.setupControls();
        this.animate();
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        // Set initial camera position
        this.camera.position.set(0, 2, 5);
        this.camera.lookAt(0, 0, 0);

        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Setup raycaster for interaction
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Add click event listener
        window.addEventListener('click', (event) => this.onMouseClick(event));
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 1);
        this.scene.add(ambientLight);

        // Directional light (simulates sunlight)
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(5, 5, 5);
        dirLight.castShadow = true;
        this.scene.add(dirLight);

        // Point lights for atmosphere
        const pointLight1 = new THREE.PointLight(0xff9900, 1, 10);
        pointLight1.position.set(2, 2, 2);
        this.scene.add(pointLight1);
    }

    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2;
    }

    loadRooms() {
        const loader = new GLTFLoader();

        // Load room models
        // Note: These are placeholder paths - you'll need to create actual 3D models
        const roomsToLoad = {
            'entrance_hall': '/models/entrance_hall.glb',
            'library': '/models/library.glb',
            'dining_room': '/models/dining_room.glb',
            'kitchen': '/models/kitchen.glb',
            'grand_staircase': '/models/grand_staircase.glb',
            'master_bedroom': '/models/master_bedroom.glb'
        };

        Object.entries(roomsToLoad).forEach(([roomName, modelPath]) => {
            // For now, create placeholder geometry
            const geometry = new THREE.BoxGeometry(10, 8, 10);
            const material = new THREE.MeshStandardMaterial({ 
                color: 0x808080,
                wireframe: true
            });
            const room = new THREE.Mesh(geometry, material);
            this.rooms[roomName] = room;

            // Hide all rooms except the current one
            room.visible = roomName === this.currentRoom;
            this.scene.add(room);

            // TODO: Replace with actual model loading when available
            /*
            loader.load(modelPath, (gltf) => {
                this.rooms[roomName] = gltf.scene;
                this.rooms[roomName].visible = roomName === this.currentRoom;
                this.scene.add(this.rooms[roomName]);
            });
            */
        });
    }

    changeRoom(newRoom) {
        if (this.rooms[this.currentRoom]) {
            this.rooms[this.currentRoom].visible = false;
        }
        this.currentRoom = newRoom;
        if (this.rooms[this.currentRoom]) {
            this.rooms[this.currentRoom].visible = true;
        }
        document.getElementById('location-name').textContent = this.currentRoom.replace('_', ' ').toUpperCase();
    }

    onMouseClick(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
            const clickedObject = intersects[0].object;
            // Handle object interaction
            this.showInteractionMenu(clickedObject);
        }
    }

    showInteractionMenu(object) {
        const menu = document.getElementById('interaction-menu');
        menu.style.display = 'block';
        // Populate menu options based on the clicked object
        // TODO: Implement specific interactions based on object type
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    // Game mechanics methods
    lookAround() {
        // Implement look around functionality
        this.turns++;
        this.updateTurnsDisplay();
    }

    checkInventory() {
        // Implement inventory check
        const inventoryPanel = document.getElementById('inventory-items');
        inventoryPanel.innerHTML = this.inventory.map(item => `<div>${item}</div>`).join('');
    }

    talkToSuspect() {
        // Implement suspect interaction
        this.turns++;
        this.updateTurnsDisplay();
    }

    makeAccusation() {
        // Implement accusation system
        this.turns++;
        this.updateTurnsDisplay();
    }

    updateTurnsDisplay() {
        document.getElementById('turns-remaining').textContent = `Turns remaining: ${this.maxTurns - this.turns}`;
        if (this.turns >= this.maxTurns) {
            this.gameOver();
        }
    }

    gameOver() {
        alert('Game Over! You ran out of turns.');
        // Implement game over logic
    }
}

// Start the game
const game = new MansionMystery();
window.game = game; // Make it accessible globally for debugging 