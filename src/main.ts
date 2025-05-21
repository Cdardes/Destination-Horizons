import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { GUI } from 'dat.gui';
import { RectAreaLightHelper } from 'three/examples/jsm/helpers/RectAreaLightHelper.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { SoundManager } from './SoundManager';
import { generateSoundFiles } from './generateSounds';

// Add sound generation to window object
declare global {
    interface Window {
        generateSounds: () => Promise<void>;
    }
}

window.generateSounds = generateSoundFiles;

interface GameSettings {
    movementSpeed: number;
    damping: number;
    ambientIntensity: number;
    fogDensity: number;
    masterVolume: number;
    footstepsVolume: number;
    ambientVolume: number;
}

interface Room {
    name: string;
    position: THREE.Vector3;
    connections: string[];
    items?: InteractiveItem[];
}

interface InteractiveItem {
    name: string;
    mesh: THREE.Mesh;
    description: string;
    isCollected: boolean;
}

class Game {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: PointerLockControls;
    private moveForward: boolean = false;
    private moveBackward: boolean = false;
    private moveLeft: boolean = false;
    private moveRight: boolean = false;
    private velocity: THREE.Vector3;
    private direction: THREE.Vector3;
    private clock: THREE.Clock;
    private settings: GameSettings;
    private gui: GUI = new GUI();
    private soundManager: SoundManager;
    private raycaster: THREE.Raycaster;
    private currentRoom: string = 'entrance_hall';
    private rooms: Map<string, Room> = new Map();
    private interactiveObjects: THREE.Mesh[] = [];
    private inventory: string[] = [];

    constructor() {
        console.log('Initializing game...');
        
        // Initialize settings
        this.settings = {
            movementSpeed: 100.0,
            damping: 5.0,
            ambientIntensity: 0.5,
            fogDensity: 0.03,
            masterVolume: 0.7,
            footstepsVolume: 0.5,
            ambientVolume: 0.3
        };

        // Initialize rooms
        this.initializeRooms();

        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a);
        this.scene.fog = new THREE.FogExp2(0x1a1a1a, this.settings.fogDensity);

        // Initialize RectAreaLight
        RectAreaLightUniformsLib.init();

        // Create camera with audio listener
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.y = 1.6;
        this.camera.position.z = 5;

        // Initialize raycaster for interactions
        this.raycaster = new THREE.Raycaster();

        // Initialize audio
        const listener = new THREE.AudioListener();
        this.camera.add(listener);
        this.soundManager = new SoundManager(listener);

        // Set initial volumes
        this.soundManager.setVolume('ambient', this.settings.masterVolume * this.settings.ambientVolume);
        this.soundManager.setVolume('footstep', this.settings.masterVolume * this.settings.footstepsVolume);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        
        const appElement = document.querySelector('#app');
        if (!appElement) {
            throw new Error('#app element not found');
        }
        appElement.appendChild(this.renderer.domElement);

        // Create controls
        this.controls = new PointerLockControls(this.camera, document.body);

        // Initialize vectors and clock
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.clock = new THREE.Clock();

        // Setup GUI
        this.setupGUI();

        // Add event listeners
        this.setupEventListeners();

        // Create basic scene
        this.createScene();

        // Start animation loop
        this.animate();
        
        console.log('Game initialized successfully');
    }

    private initializeRooms(): void {
        this.rooms = new Map([
            ['entrance_hall', {
                name: 'Entrance Hall',
                position: new THREE.Vector3(0, 0, 0),
                connections: ['library', 'dining_room'],
                items: []
            }],
            ['library', {
                name: 'Library',
                position: new THREE.Vector3(-10, 0, 0),
                connections: ['entrance_hall', 'study'],
                items: []
            }],
            ['dining_room', {
                name: 'Dining Room',
                position: new THREE.Vector3(10, 0, 0),
                connections: ['entrance_hall', 'kitchen'],
                items: []
            }]
        ]);
    }

    private setupGUI(): void {
        this.gui = new GUI();
        this.gui.width = 300;

        const movementFolder = this.gui.addFolder('Movement Settings');
        movementFolder.add(this.settings, 'movementSpeed', 50, 200).name('Movement Speed');
        movementFolder.add(this.settings, 'damping', 1, 10).name('Movement Damping');
        movementFolder.open();

        const visualsFolder = this.gui.addFolder('Visual Settings');
        visualsFolder.add(this.settings, 'ambientIntensity', 0, 1)
            .name('Ambient Light')
            .onChange((value: number) => {
                const ambientLight = this.scene.children.find(child => child instanceof THREE.AmbientLight) as THREE.AmbientLight;
                if (ambientLight) {
                    ambientLight.intensity = value;
                }
            });
        visualsFolder.add(this.settings, 'fogDensity', 0, 0.1)
            .name('Fog Density')
            .onChange((value: number) => {
                if (this.scene.fog instanceof THREE.FogExp2) {
                    this.scene.fog.density = value;
                }
            });
        visualsFolder.open();

        const audioFolder = this.gui.addFolder('Audio Settings');
        audioFolder.add(this.settings, 'masterVolume', 0, 1)
            .name('Master Volume')
            .onChange((value: number) => {
                this.soundManager.setVolume('ambient', value * this.settings.ambientVolume);
                this.soundManager.setVolume('footstep', value * this.settings.footstepsVolume);
            });
        audioFolder.add(this.settings, 'footstepsVolume', 0, 1)
            .name('Footsteps Volume')
            .onChange((value: number) => {
                this.soundManager.setVolume('footstep', value * this.settings.masterVolume);
            });
        audioFolder.add(this.settings, 'ambientVolume', 0, 1)
            .name('Ambient Volume')
            .onChange((value: number) => {
                this.soundManager.setVolume('ambient', value * this.settings.masterVolume);
            });
        audioFolder.open();

        // Hide GUI when game starts
        document.addEventListener('pointerlockchange', () => {
            this.gui.domElement.style.display = this.controls.isLocked ? 'none' : 'block';
        });
    }

    private setupEventListeners(): void {
        // Lock controls on click
        const startPrompt = document.querySelector('.click-to-start');
        if (!startPrompt) {
            throw new Error('.click-to-start element not found');
        }
        
        startPrompt.addEventListener('click', () => {
            console.log('Starting game...');
            this.controls.lock();
        });

        // Handle pointer lock change
        document.addEventListener('pointerlockchange', () => {
            const prompt = document.querySelector('.click-to-start') as HTMLElement;
            if (prompt) {
                prompt.style.display = this.controls.isLocked ? 'none' : 'block';
            }
            
            // Handle ambient sound
            if (this.controls.isLocked) {
                this.soundManager.playSound('ambient');
            } else {
                this.soundManager.stopAll();
            }
        });

        // Handle movement
        document.addEventListener('keydown', (event) => {
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
            }
            
            // Update footstep sounds
            this.updateFootstepSounds();
        });

        document.addEventListener('keyup', (event) => {
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
            
            // Update footstep sounds
            this.updateFootstepSounds();
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Add interaction key (E)
        document.addEventListener('keydown', (event) => {
            if (event.code === 'KeyE') {
                this.interact();
            }
        });

        // Add room transition key (Space)
        document.addEventListener('keydown', (event) => {
            if (event.code === 'Space') {
                this.checkRoomTransition();
            }
        });
    }

    private updateFootstepSounds(): void {
        const isWalking = this.moveForward || this.moveBackward || this.moveLeft || this.moveRight;
        this.soundManager.playFootsteps(isWalking);
    }

    private interact(): void {
        if (!this.controls.isLocked) return;

        const center = new THREE.Vector2(0, 0);
        this.raycaster.setFromCamera(center, this.camera);

        const intersects = this.raycaster.intersectObjects(this.interactiveObjects);
        
        if (intersects.length > 0) {
            const object = intersects[0].object;
            if (object.userData.type === 'item') {
                this.collectItem(object);
            } else if (object.userData.type === 'door') {
                this.tryDoorTransition(object);
            }
        }
    }

    private collectItem(object: THREE.Object3D): void {
        if (!object.userData.isCollected) {
            object.userData.isCollected = true;
            this.inventory.push(object.userData.name);
            this.soundManager.playSound('pickup');
            object.visible = false;

            // Update inventory display
            this.updateInventoryDisplay();
        }
    }

    private updateInventoryDisplay(): void {
        const inventoryItems = document.querySelector('.inventory-items');
        if (inventoryItems) {
            inventoryItems.innerHTML = this.inventory
                .map(item => `<div class="inventory-item">${item}</div>`)
                .join('');
        }
    }

    private checkRoomTransition(): void {
        const currentRoom = this.rooms.get(this.currentRoom);
        if (!currentRoom) return;

        // Check if we're near any room connections
        for (const connection of currentRoom.connections) {
            const targetRoom = this.rooms.get(connection);
            if (targetRoom) {
                const distance = this.camera.position.distanceTo(targetRoom.position);
                if (distance < 3) { // Within 3 units of the door
                    this.transitionToRoom(connection);
                    break;
                }
            }
        }
    }

    private transitionToRoom(roomId: string): void {
        const targetRoom = this.rooms.get(roomId);
        if (!targetRoom) return;

        this.currentRoom = roomId;
        this.soundManager.playSound('door');

        // Update location display
        const locationDisplay = document.getElementById('location-display');
        if (locationDisplay) {
            locationDisplay.textContent = `Current Location: ${targetRoom.name}`;
            locationDisplay.style.display = 'block';
        }

        // Teleport player to new room
        this.camera.position.copy(targetRoom.position);
        this.camera.position.y = 1.6; // Maintain eye level
    }

    private createScene(): void {
        console.log('Creating scene...');
        
        // Add floor
        const floorGeometry = new THREE.PlaneGeometry(20, 20, 40, 40);
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8b4513,
            roughness: 0.8,
            metalness: 0.2,
            bumpScale: 0.02
        });
        
        // Add noise to the floor vertices for more detail
        const vertices = floorGeometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            vertices[i + 1] += Math.random() * 0.05; // Slight height variation
        }
        floorGeometry.computeVertexNormals();

        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, this.settings.ambientIntensity);
        this.scene.add(ambientLight);

        // Add point lights
        const createPointLight = (x: number, y: number, z: number, intensity: number, color: number, distance: number = 10) => {
            const light = new THREE.PointLight(color, intensity, distance);
            light.position.set(x, y, z);
            light.castShadow = true;
            light.shadow.mapSize.width = 512;
            light.shadow.mapSize.height = 512;
            light.shadow.radius = 3;
            this.scene.add(light);

            // Add subtle animation to lights
            const initialY = y;
            setInterval(() => {
                light.position.y = initialY + Math.sin(Date.now() * 0.001) * 0.1;
            }, 16);
        };

        createPointLight(2, 2, 2, 1, 0xff9966, 15); // Warm light
        createPointLight(-2, 2, -2, 1, 0x6699ff, 15); // Cool light

        // Add rect area lights for more realistic indoor lighting
        const createRectLight = (width: number, height: number, intensity: number, color: number, x: number, y: number, z: number, rotationY: number) => {
            const rectLight = new THREE.RectAreaLight(color, intensity, width, height);
            rectLight.position.set(x, y, z);
            rectLight.rotation.y = rotationY;
            this.scene.add(rectLight);
            const rectLightHelper = new RectAreaLightHelper(rectLight);
            rectLight.add(rectLightHelper);
        };

        createRectLight(4, 2, 5, 0xffffff, -5, 3, 0, Math.PI / 2);
        createRectLight(4, 2, 5, 0xffffff, 5, 3, 0, -Math.PI / 2);

        // Add walls with more detailed materials
        const wallMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8b4513,
            roughness: 0.9,
            metalness: 0.1,
            bumpScale: 0.02
        });

        const createWall = (width: number, height: number, depth: number, x: number, y: number, z: number) => {
            const wallGeometry = new THREE.BoxGeometry(width, height, depth, 1, 10, 1);
            // Add subtle variation to wall vertices
            const vertices = wallGeometry.attributes.position.array;
            for (let i = 0; i < vertices.length; i += 3) {
                vertices[i] += (Math.random() - 0.5) * 0.02;
                vertices[i + 1] += (Math.random() - 0.5) * 0.02;
                vertices[i + 2] += (Math.random() - 0.5) * 0.02;
            }
            wallGeometry.computeVertexNormals();

            const wall = new THREE.Mesh(wallGeometry, wallMaterial);
            wall.position.set(x, y, z);
            wall.castShadow = true;
            wall.receiveShadow = true;
            this.scene.add(wall);
        };

        // Create room walls
        createWall(20, 4, 0.2, 0, 2, -10);
        createWall(20, 4, 0.2, 0, 2, 10);
        createWall(0.2, 4, 20, -10, 2, 0);
        createWall(0.2, 4, 20, 10, 2, 0);

        // Add detailed furniture
        const createFurniture = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, scale: number = 1) => {
            const furniture = new THREE.Mesh(geometry, material);
            furniture.position.set(x, y, z);
            furniture.scale.set(scale, scale, scale);
            furniture.castShadow = true;
            furniture.receiveShadow = true;
            this.scene.add(furniture);
            return furniture;
        };

        // Create a table
        const tableGeometry = new THREE.BoxGeometry(2, 0.1, 1);
        const tableMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x5c4033,
            roughness: 0.7,
            metalness: 0.3
        });
        const table = createFurniture(tableGeometry, tableMaterial, -3, 1, -3, 1);

        // Add table legs
        const legGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 8);
        const legMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x5c4033,
            roughness: 0.7,
            metalness: 0.3
        });

        const legPositions = [
            [-0.9, -0.45, -0.4],
            [-0.9, -0.45, 0.4],
            [0.9, -0.45, -0.4],
            [0.9, -0.45, 0.4]
        ];

        legPositions.forEach(pos => {
            const leg = createFurniture(legGeometry, legMaterial, 
                table.position.x + pos[0],
                table.position.y + pos[1],
                table.position.z + pos[2]
            );
        });

        // Add some decorative items
        const vaseGeometry = new THREE.CylinderGeometry(0.2, 0.1, 0.4, 12);
        const vaseMaterial = new THREE.MeshStandardMaterial({
            color: 0x4169e1,
            roughness: 0.4,
            metalness: 0.6
        });
        createFurniture(vaseGeometry, vaseMaterial, -3, 1.3, -3);

        // Add interactive objects
        this.createInteractiveObjects();

        console.log('Scene created successfully');
    }

    private createInteractiveObjects(): void {
        // Create a door mesh
        const doorGeometry = new THREE.BoxGeometry(1, 2, 0.1);
        const doorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8b4513,
            roughness: 0.8,
            metalness: 0.2
        });

        // Add doors for room connections
        this.rooms.forEach((room, roomId) => {
            room.connections.forEach(connectionId => {
                const targetRoom = this.rooms.get(connectionId);
                if (targetRoom) {
                    const direction = targetRoom.position.clone().sub(room.position).normalize();
                    const doorPosition = room.position.clone().add(direction.multiplyScalar(5));
                    
                    const door = new THREE.Mesh(doorGeometry, doorMaterial);
                    door.position.copy(doorPosition);
                    door.position.y = 1; // Door height
                    door.lookAt(targetRoom.position);
                    
                    door.userData = {
                        type: 'door',
                        targetRoom: connectionId
                    };

                    this.scene.add(door);
                    this.interactiveObjects.push(door);
                }
            });
        });

        // Add some collectible items
        const itemGeometry = new THREE.SphereGeometry(0.2);
        const itemMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffd700,
            roughness: 0.3,
            metalness: 0.7
        });

        const addItem = (position: THREE.Vector3, name: string) => {
            const item = new THREE.Mesh(itemGeometry, itemMaterial);
            item.position.copy(position);
            item.userData = {
                type: 'item',
                name: name,
                isCollected: false
            };
            this.scene.add(item);
            this.interactiveObjects.push(item);
        };

        // Add some example items
        addItem(new THREE.Vector3(2, 1, -2), 'Strange Key');
        addItem(new THREE.Vector3(-2, 1, 2), 'Mysterious Note');
    }

    private animate(): void {
        requestAnimationFrame(() => this.animate());

        if (this.controls.isLocked) {
            const delta = this.clock.getDelta();

            // Apply damping to velocity
            this.velocity.x -= this.velocity.x * this.settings.damping * delta;
            this.velocity.z -= this.velocity.z * this.settings.damping * delta;

            // Calculate movement direction
            this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
            this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
            this.direction.normalize();

            // Apply movement forces
            if (this.moveForward || this.moveBackward) {
                this.velocity.z -= this.direction.z * this.settings.movementSpeed * delta;
            }
            if (this.moveLeft || this.moveRight) {
                this.velocity.x -= this.direction.x * this.settings.movementSpeed * delta;
            }

            // Apply movement
            this.controls.moveRight(-this.velocity.x * delta);
            this.controls.moveForward(-this.velocity.z * delta);

            // Check for nearby interactive objects
            this.checkNearbyObjects();
        }

        this.renderer.render(this.scene, this.camera);
    }

    private checkNearbyObjects(): void {
        const center = new THREE.Vector2(0, 0);
        this.raycaster.setFromCamera(center, this.camera);

        const intersects = this.raycaster.intersectObjects(this.interactiveObjects);
        
        // Update crosshair and interaction prompt
        const crosshair = document.querySelector('.crosshair') as HTMLElement;
        const prompt = document.querySelector('.interaction-prompt') as HTMLElement;
        
        if (intersects.length > 0) {
            const object = intersects[0].object;
            if (crosshair) {
                crosshair.style.backgroundColor = '#ffd700';
            }
            if (prompt) {
                prompt.textContent = object.userData.type === 'item' 
                    ? `${object.userData.name.replace(/_/g, ' ')}`
                    : 'Door';
                prompt.style.opacity = '1';
            }
        } else {
            if (crosshair) {
                crosshair.style.backgroundColor = 'white';
            }
            if (prompt) {
                prompt.style.opacity = '0';
            }
        }
    }

    private tryDoorTransition(object: THREE.Object3D): void {
        if (object.userData.targetRoom) {
            this.transitionToRoom(object.userData.targetRoom);
        }
    }
}

// Start the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('Starting game initialization...');
        new Game();
    } catch (error) {
        console.error('Failed to initialize game:', error);
    }
}); 