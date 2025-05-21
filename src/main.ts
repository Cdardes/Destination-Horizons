import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { GUI } from 'dat.gui';
import { RectAreaLightHelper } from 'three/examples/jsm/helpers/RectAreaLightHelper.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { SoundManager } from './SoundManager';
import { generateSoundFiles } from './generateSounds';
import { EffectComposer, RenderPass, UnrealBloomPass, SSAOPass, ShaderPass } from 'three/examples/jsm/postprocessing';

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

class ResourceManager {
    private static instance: ResourceManager;
    private geometries: Map<string, THREE.BufferGeometry>;
    private materials: Map<string, THREE.Material>;
    private objectPool: Map<string, THREE.Object3D[]>;

    private constructor() {
        this.geometries = new Map();
        this.materials = new Map();
        this.objectPool = new Map();
        this.initializeCommonResources();
    }

    static getInstance(): ResourceManager {
        if (!ResourceManager.instance) {
            ResourceManager.instance = new ResourceManager();
        }
        return ResourceManager.instance;
    }

    private initializeCommonResources(): void {
        // Common geometries
        this.geometries.set('box', new THREE.BoxGeometry(1, 1, 1));
        this.geometries.set('sphere', new THREE.SphereGeometry(1, 16, 16));
        this.geometries.set('cylinder', new THREE.CylinderGeometry(1, 1, 1, 8));
        this.geometries.set('plane', new THREE.PlaneGeometry(1, 1));

        // Common materials
        this.materials.set('wood', new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            roughness: 0.8,
            metalness: 0.2
        }));
        this.materials.set('metal', new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            roughness: 0.3,
            metalness: 0.8
        }));
        this.materials.set('glass', new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            transmission: 0.9,
            opacity: 0.3,
            metalness: 0,
            roughness: 0,
            ior: 1.5,
            transparent: true
        }));
    }

    getGeometry(key: string): THREE.BufferGeometry {
        return this.geometries.get(key)?.clone() || new THREE.BoxGeometry(1, 1, 1);
    }

    getMaterial(key: string): THREE.Material {
        return this.materials.get(key)?.clone() || new THREE.MeshBasicMaterial();
    }

    acquireObject(type: string): THREE.Object3D | null {
        const pool = this.objectPool.get(type) || [];
        return pool.pop() || null;
    }

    releaseObject(type: string, object: THREE.Object3D): void {
        if (!this.objectPool.has(type)) {
            this.objectPool.set(type, []);
        }
        this.objectPool.get(type)?.push(object);
    }

    dispose(): void {
        this.geometries.forEach(geometry => geometry.dispose());
        this.materials.forEach(material => material.dispose());
        this.objectPool.clear();
    }
}

class Game {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;
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
    private composer: EffectComposer | null = null;

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

        // Initialize vectors and clock
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.clock = new THREE.Clock();

        // Initialize rooms first
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

        // Initialize renderer before using it
        this.initializeRenderer();
        
        const appElement = document.querySelector('#app');
        if (!appElement) {
            throw new Error('#app element not found');
        }
        appElement.appendChild(this.renderer.domElement);

        // Create controls
        this.controls = new PointerLockControls(this.camera, document.body);

        // Setup GUI
        this.setupGUI();

        // Add event listeners
        this.setupEventListeners();

        // Create basic scene
        this.createScene();
        
        console.log('Game initialized successfully');

        // Start animation loop
        this.animate();
    }

    private initializeRooms(): void {
        this.rooms = new Map([
            ['entrance_hall', {
                name: 'Entrance Hall',
                position: new THREE.Vector3(0, 0, 0),
                connections: ['library', 'dining_room', 'grand_staircase'],
                items: []
            }],
            ['library', {
                name: 'Library',
                position: new THREE.Vector3(-15, 0, 0),
                connections: ['entrance_hall', 'study'],
                items: []
            }],
            ['dining_room', {
                name: 'Dining Room',
                position: new THREE.Vector3(15, 0, 0),
                connections: ['entrance_hall', 'kitchen'],
                items: []
            }],
            ['kitchen', {
                name: 'Kitchen',
                position: new THREE.Vector3(30, 0, 0),
                connections: ['dining_room', 'servant_quarters'],
                items: []
            }],
            ['servant_quarters', {
                name: 'Servant Quarters',
                position: new THREE.Vector3(30, 0, 15),
                connections: ['kitchen'],
                items: []
            }],
            ['study', {
                name: 'Study',
                position: new THREE.Vector3(-30, 0, 0),
                connections: ['library'],
                items: []
            }],
            ['grand_staircase', {
                name: 'Grand Staircase',
                position: new THREE.Vector3(0, 0, -15),
                connections: ['entrance_hall', 'master_bedroom'],
                items: []
            }],
            ['master_bedroom', {
                name: 'Master Bedroom',
                position: new THREE.Vector3(0, 0, -30),
                connections: ['grand_staircase'],
                items: []
            }],
            ['conservatory', {
                name: 'Conservatory',
                position: new THREE.Vector3(15, 0, -15),
                connections: ['dining_room', 'garden'],
                items: []
            }],
            ['garden', {
                name: 'Garden',
                position: new THREE.Vector3(15, 0, -30),
                connections: ['conservatory'],
                items: []
            }],
            ['wine_cellar', {
                name: 'Wine Cellar',
                position: new THREE.Vector3(-15, -5, 0),
                connections: ['library'],
                items: []
            }],
            ['attic', {
                name: 'Attic',
                position: new THREE.Vector3(0, 5, -30),
                connections: ['master_bedroom'],
                items: []
            }],
            ['secret_passage', {
                name: 'Secret Passage',
                position: new THREE.Vector3(-30, 0, -15),
                connections: ['study', 'wine_cellar'],
                items: []
            }]
        ]);

        // Add new items to rooms
        this.initializeNewItems();
    }

    private initializeNewItems(): void {
        const addItemToRoom = (roomId: string, itemName: string, itemMesh: THREE.Object3D, position: THREE.Vector3) => {
            const room = this.rooms.get(roomId);
            if (room) {
                itemMesh.position.copy(position);
                itemMesh.userData = {
                    type: 'item',
                    name: itemName,
                    isCollected: false
                };
                this.scene.add(itemMesh);
                this.interactiveObjects.push(itemMesh as THREE.Mesh);
                room.items = room.items || [];
                room.items.push({ name: itemName, mesh: itemMesh as THREE.Mesh, description: '', isCollected: false });
            }
        };

        // Add new items
        addItemToRoom('conservatory', 'Gardening Shears', this.createGardeningShears(), new THREE.Vector3(14, 1, -14));
        addItemToRoom('garden', 'Mysterious Plant', this.createMysteriousPlant(), new THREE.Vector3(14, 0, -29));
        addItemToRoom('wine_cellar', 'Old Wine Bottle', this.createWineBottle(), new THREE.Vector3(-14, -4, 1));
        addItemToRoom('attic', 'Dusty Photograph', this.createPhotograph(), new THREE.Vector3(1, 6, -29));
        addItemToRoom('secret_passage', 'Hidden Key', this.createKey(), new THREE.Vector3(-29, 1, -14));
    }

    private createGardeningShears(): THREE.Group {
        const shears = new THREE.Group();
        const resourceManager = ResourceManager.getInstance();

        // Blades
        const bladeGeometry = resourceManager.getGeometry('box');
        const bladeMaterial = resourceManager.getMaterial('metal');
        bladeGeometry.scale(0.05, 0.3, 0.02);

        const blade1 = new THREE.Mesh(bladeGeometry, bladeMaterial);
        blade1.rotation.z = Math.PI / 6;
        shears.add(blade1);

        const blade2 = blade1.clone();
        blade2.rotation.z = -Math.PI / 6;
        shears.add(blade2);

        return shears;
    }

    private createMysteriousPlant(): THREE.Group {
        const plant = new THREE.Group();
        const resourceManager = ResourceManager.getInstance();

        // Pot
        const potGeometry = resourceManager.getGeometry('cylinder');
        const potMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
        potGeometry.scale(0.2, 0.3, 0.2);
        const pot = new THREE.Mesh(potGeometry, potMaterial);
        plant.add(pot);

        // Plant leaves
        const leafGeometry = resourceManager.getGeometry('sphere');
        const leafMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x355E3B,
            roughness: 0.8
        });
        leafGeometry.scale(0.15, 0.15, 0.15);

        for (let i = 0; i < 5; i++) {
            const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
            leaf.position.y = 0.3;
            leaf.position.x = Math.sin(i * Math.PI * 0.4) * 0.1;
            leaf.position.z = Math.cos(i * Math.PI * 0.4) * 0.1;
            plant.add(leaf);
        }

        return plant;
    }

    private createWineBottle(): THREE.Group {
        const bottle = new THREE.Group();
        const resourceManager = ResourceManager.getInstance();

        // Bottle body
        const bodyGeometry = resourceManager.getGeometry('cylinder');
        const glassMaterial = resourceManager.getMaterial('glass');
        bodyGeometry.scale(0.1, 0.4, 0.1);
        const body = new THREE.Mesh(bodyGeometry, glassMaterial);
        bottle.add(body);

        // Neck
        const neckGeometry = resourceManager.getGeometry('cylinder');
        neckGeometry.scale(0.05, 0.2, 0.05);
        const neck = new THREE.Mesh(neckGeometry, glassMaterial);
        neck.position.y = 0.3;
        bottle.add(neck);

        return bottle;
    }

    private createPhotograph(): THREE.Mesh {
        const resourceManager = ResourceManager.getInstance();
        const geometry = resourceManager.getGeometry('plane');
        const material = new THREE.MeshStandardMaterial({
            color: 0xffffee,
            roughness: 0.9,
            metalness: 0.1
        });
        geometry.scale(0.3, 0.2, 1);
        return new THREE.Mesh(geometry, material);
    }

    private createKey(): THREE.Group {
        const key = new THREE.Group();
        const resourceManager = ResourceManager.getInstance();

        // Key head
        const headGeometry = resourceManager.getGeometry('cylinder');
        const metalMaterial = resourceManager.getMaterial('metal');
        headGeometry.scale(0.1, 0.02, 0.1);
        const head = new THREE.Mesh(headGeometry, metalMaterial);
        key.add(head);

        // Key shaft
        const shaftGeometry = resourceManager.getGeometry('box');
        shaftGeometry.scale(0.03, 0.02, 0.2);
        const shaft = new THREE.Mesh(shaftGeometry, metalMaterial);
        shaft.position.z = 0.1;
        key.add(shaft);

        return key;
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
            } else if (object.userData.type === 'character') {
                this.talkToCharacter(object);
            }
        }
    }

    private collectItem(object: THREE.Object3D): void {
        try {
            if (!object.userData.isCollected) {
                // Play sound first
                this.soundManager.playSound('pickup');

                // Update object state
                object.userData.isCollected = true;
                this.inventory.push(object.userData.name);

                // Remove from scene and interactive objects
                this.scene.remove(object);
                const index = this.interactiveObjects.indexOf(object as THREE.Mesh);
                if (index > -1) {
                    this.interactiveObjects.splice(index, 1);
                }

                // Update inventory display
                this.updateInventoryDisplay();

                // Show collection message
                const locationDisplay = document.getElementById('location-display');
                if (locationDisplay) {
                    const originalText = locationDisplay.textContent;
                    locationDisplay.textContent = `Collected: ${object.userData.name}`;
                    setTimeout(() => {
                        if (locationDisplay) {
                            locationDisplay.textContent = originalText;
                        }
                    }, 2000);
                }
            }
        } catch (error) {
            console.error('Error collecting item:', error);
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

        // Play door sound
        this.soundManager.playSound('door');

        // Update current room
        this.currentRoom = roomId;

        // Update location display
        const locationDisplay = document.getElementById('location-display');
        if (locationDisplay) {
            locationDisplay.textContent = `Current Location: ${targetRoom.name}`;
            locationDisplay.style.display = 'block';
        }

        // Clear existing scene objects except camera and lights
        const objectsToRemove: THREE.Object3D[] = [];
        this.scene.traverse((object) => {
            if ((object instanceof THREE.Mesh || object instanceof THREE.Group) &&
                !object.userData.isLight &&
                !(object instanceof THREE.PerspectiveCamera)) {
                objectsToRemove.push(object);
            }
        });
        objectsToRemove.forEach(obj => this.scene.remove(obj));
        this.interactiveObjects = [];

        // Reset player position
        this.camera.position.copy(targetRoom.position);
        this.camera.position.y = 1.6; // Eye level

        // Create new room
        this.createScene();
    }

    private createScene(): void {
        console.log('Creating scene for room:', this.currentRoom);
        
        // Create rooms based on current location
        const currentRoom = this.rooms.get(this.currentRoom);
        if (!currentRoom) {
            console.error('Current room not found:', this.currentRoom);
            return;
        }

        // Add floor with room-specific textures
        const floorGeometry = new THREE.PlaneGeometry(20, 20, 40, 40);
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: this.getRoomFloorColor(this.currentRoom),
            roughness: 0.8,
            metalness: 0.2,
            bumpScale: 0.02
        });
        
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Add walls
        this.createWalls();

        // Add room-specific lighting
        this.addRoomLighting(this.currentRoom);

        // Add room-specific furniture and decorations
        this.addRoomFurniture(this.currentRoom);

        // Add characters
        this.addRoomCharacters(this.currentRoom);

        // Add interactive objects
        this.initializeInteractiveObjects();

        console.log('Scene created successfully for room:', this.currentRoom);
    }

    private createWalls(): void {
        const wallMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8b4513,
            roughness: 0.9,
            metalness: 0.1,
            bumpScale: 0.02
        });

        // Create room walls
        interface WallConfig {
            size: [number, number, number];
            position: [number, number, number];
        }

        const walls: WallConfig[] = [
            { size: [20, 4, 0.2], position: [0, 2, -10] }, // North wall
            { size: [20, 4, 0.2], position: [0, 2, 10] },  // South wall
            { size: [0.2, 4, 20], position: [-10, 2, 0] }, // West wall
            { size: [0.2, 4, 20], position: [10, 2, 0] }   // East wall
        ];

        walls.forEach(wall => {
            const wallGeometry = new THREE.BoxGeometry(wall.size[0], wall.size[1], wall.size[2]);
            const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
            wallMesh.position.set(wall.position[0], wall.position[1], wall.position[2]);
            wallMesh.castShadow = true;
            wallMesh.receiveShadow = true;
            this.scene.add(wallMesh);
        });
    }

    private getRoomFloorColor(roomId: string): number {
        const colors: { [key: string]: number } = {
            'entrance_hall': 0x8b4513,
            'library': 0x654321,
            'dining_room': 0x8b4513,
            'kitchen': 0xd3d3d3,
            'servant_quarters': 0x8b7355,
            'study': 0x654321,
            'grand_staircase': 0x8b4513,
            'master_bedroom': 0x8b7355
        };
        return colors[roomId] || 0x8b4513;
    }

    private addRoomLighting(roomId: string): void {
        // Add basic lighting first
        this.addBasicLighting(roomId);
        
        // Add dynamic lighting effects
        this.addDynamicLighting(roomId);
    }

    private addBasicLighting(roomId: string): void {
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, this.settings.ambientIntensity);
        this.scene.add(ambientLight);

        // Add room-specific lighting
        switch (roomId) {
            case 'library':
                // Warm, focused lighting for reading
                this.addPointLight(0, 3, 0, 1.5, 0xff9966);
                this.addRectAreaLight(4, 2, 5, 0xffd700, -5, 3, 0);
                // Add window light
                this.addWindowLight(-9, 2, 0, 0xadd8e6, 2);
                break;
            case 'dining_room':
                // Elegant chandelier effect
                this.addChandelierLight(0, 4, 0);
                break;
            case 'kitchen':
                // Bright, functional lighting
                this.addPointLight(0, 3, 0, 2, 0xffffff);
                this.addRectAreaLight(8, 1, 3, 0xffffff, 0, 3, -8);
                break;
            case 'master_bedroom':
                // Soft, intimate lighting
                this.addPointLight(0, 2, 0, 1, 0xffe4c4);
                this.addWindowLight(9, 2, 0, 0xadd8e6, 1.5);
                break;
            case 'conservatory':
                // Bright natural lighting with slight green tint
                this.addPointLight(0, 4, 0, 2, 0xc8e6c9);
                this.addWindowLight(14, 2, -14, 0xadd8e6, 2);
                this.addWindowLight(16, 2, -16, 0xadd8e6, 2);
                break;
            case 'garden':
                // Outdoor lighting with moonlight
                this.addPointLight(15, 10, -30, 3, 0x6897bb);
                this.addPointLight(15, 1, -30, 1, 0xc8e6c9);
                break;
            case 'wine_cellar':
                // Dark, moody lighting with warm spots
                this.addPointLight(-15, -3, 0, 1, 0xff9966, 5);
                this.addPointLight(-14, -3, 2, 0.5, 0xff9966, 3);
                break;
            case 'attic':
                // Dusty light through small window
                this.addPointLight(0, 6, -30, 0.5, 0xffd700);
                this.addWindowLight(1, 6, -31, 0x666666, 0.5);
                break;
            case 'secret_passage':
                // Mysterious flickering light
                const flickeringLight = this.addPointLight(-30, 2, -15, 1, 0xff9966, 5);
                setInterval(() => {
                    if (flickeringLight) {
                        flickeringLight.intensity = 0.5 + Math.random() * 0.5;
                    }
                }, 100);
                break;
            default:
                // Standard room lighting
                this.addPointLight(2, 2, 2, 1, 0xff9966);
                this.addPointLight(-2, 2, -2, 1, 0x6699ff);
        }
    }

    private addPointLight(x: number, y: number, z: number, intensity: number, color: number, distance: number = 10): void {
        const light = new THREE.PointLight(color, intensity, distance);
        light.position.set(x, y, z);
        light.castShadow = true;
        light.shadow.mapSize.width = 512;
        light.shadow.mapSize.height = 512;
        light.shadow.radius = 3;
        this.scene.add(light);

        // Add subtle animation
        const initialY = y;
        setInterval(() => {
            light.position.y = initialY + Math.sin(Date.now() * 0.001) * 0.1;
        }, 16);
    }

    private addRectAreaLight(width: number, height: number, intensity: number, color: number, x: number, y: number, z: number): void {
        const rectLight = new THREE.RectAreaLight(color, intensity, width, height);
        rectLight.position.set(x, y, z);
        this.scene.add(rectLight);
        const rectLightHelper = new RectAreaLightHelper(rectLight);
        rectLight.add(rectLightHelper);
    }

    private addWindowLight(x: number, y: number, z: number, color: number, intensity: number): void {
        const windowLight = new THREE.RectAreaLight(color, intensity, 2, 3);
        windowLight.position.set(x, y, z);
        windowLight.lookAt(x < 0 ? x + 1 : x - 1, y, z);
        this.scene.add(windowLight);

        // Add window frame
        const windowFrame = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 3, 2),
            new THREE.MeshStandardMaterial({
                color: 0x8b4513,
                roughness: 0.8,
                metalness: 0.2
            })
        );
        windowFrame.position.set(x, y, z);
        this.scene.add(windowFrame);

        // Add window glass
        const windowGlass = new THREE.Mesh(
            new THREE.PlaneGeometry(1.8, 2.8),
            new THREE.MeshPhysicalMaterial({
                color: 0xffffff,
                transmission: 0.9,
                opacity: 0.3,
                metalness: 0,
                roughness: 0,
                ior: 1.5,
                transparent: true,
                side: THREE.DoubleSide
            })
        );
        windowGlass.position.set(x, y, z);
        windowGlass.lookAt(x < 0 ? x + 1 : x - 1, y, z);
        this.scene.add(windowGlass);
    }

    private addChandelierLight(x: number, y: number, z: number): void {
        // Create chandelier structure
        const chandelier = new THREE.Group();
        chandelier.position.set(x, y, z);

        // Add central structure
        const center = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8),
            new THREE.MeshStandardMaterial({
                color: 0xb87333,
                roughness: 0.3,
                metalness: 0.8
            })
        );
        chandelier.add(center);

        // Add arms and lights
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const radius = 1;

            // Create arm
            const arm = new THREE.Mesh(
                new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4),
                new THREE.MeshStandardMaterial({
                    color: 0xb87333,
                    roughness: 0.3,
                    metalness: 0.8
                })
            );
            arm.position.set(
                Math.cos(angle) * radius,
                -0.25,
                Math.sin(angle) * radius
            );
            arm.rotation.z = Math.PI / 4;
            arm.rotation.y = angle;
            chandelier.add(arm);

            // Add light
            const light = new THREE.PointLight(0xfff0e6, 0.3, 5);
            light.position.set(
                Math.cos(angle) * radius,
                -0.5,
                Math.sin(angle) * radius
            );
            chandelier.add(light);

            // Add decorative bulb
            const bulb = new THREE.Mesh(
                new THREE.SphereGeometry(0.05, 8, 8),
                new THREE.MeshPhysicalMaterial({
                    color: 0xffffff,
                    emissive: 0xfff0e6,
                    emissiveIntensity: 1,
                    transparent: true,
                    opacity: 0.9,
                    metalness: 0,
                    roughness: 0
                })
            );
            bulb.position.copy(light.position);
            chandelier.add(bulb);
        }

        this.scene.add(chandelier);
    }

    private addRoomFurniture(roomId: string): void {
        switch (roomId) {
            case 'library':
                this.addLibraryFurniture();
                break;
            case 'dining_room':
                this.addDiningRoomFurniture();
                break;
            case 'kitchen':
                this.addKitchenFurniture();
                break;
            case 'study':
                this.addStudyFurniture();
                break;
            case 'master_bedroom':
                this.addBedroomFurniture();
                break;
            case 'entrance_hall':
                this.addEntranceHallFurniture();
                break;
            case 'conservatory':
                this.addConservatoryFurniture();
                break;
            case 'garden':
                this.addGardenFurniture();
                break;
            case 'wine_cellar':
                this.addWineCellarFurniture();
                break;
            case 'attic':
                this.addAtticFurniture();
                break;
            case 'secret_passage':
                this.addSecretPassageFurniture();
                break;
        }
    }

    private addRoomCharacters(roomId: string): void {
        const characters: { [key: string]: { name: string, position: THREE.Vector3 } } = {
            'entrance_hall': { name: 'Butler', position: new THREE.Vector3(3, 0, 3) },
            'library': { name: 'Professor', position: new THREE.Vector3(-3, 0, -3) },
            'dining_room': { name: 'Maid', position: new THREE.Vector3(2, 0, 2) },
            'kitchen': { name: 'Chef', position: new THREE.Vector3(2, 0, -2) },
            'master_bedroom': { name: 'Heir', position: new THREE.Vector3(-2, 0, -2) }
        };

        const character = characters[roomId];
        if (character) {
            const characterMesh = this.createCharacterMesh(character.name);
            characterMesh.position.copy(character.position);
            characterMesh.userData = {
                type: 'character',
                name: character.name,
                canTalk: true
            };
            this.scene.add(characterMesh);
            this.interactiveObjects.push(characterMesh);
        }
    }

    private createCharacterMesh(characterName: string): THREE.Mesh {
        // Create a simple character representation
        const geometry = new THREE.CylinderGeometry(0.3, 0.3, 1.8, 8);
        const material = new THREE.MeshStandardMaterial({
            color: this.getCharacterColor(characterName),
            roughness: 0.7,
            metalness: 0.3
        });
        const character = new THREE.Mesh(geometry, material);
        character.position.y = 0.9; // Half height to stand on floor
        return character;
    }

    private getCharacterColor(characterName: string): number {
        const colors: { [key: string]: number } = {
            'Butler': 0x000000,
            'Professor': 0x8b4513,
            'Maid': 0x4169e1,
            'Chef': 0xffffff,
            'Heir': 0x800020
        };
        return colors[characterName] || 0x808080;
    }

    private tryDoorTransition(object: THREE.Object3D): void {
        if (object.userData.targetRoom) {
            const targetRoom = this.rooms.get(object.userData.targetRoom);
            if (targetRoom) {
                this.transitionToRoom(object.userData.targetRoom);
            }
        }
    }

    private talkToCharacter(character: THREE.Object3D): void {
        if (!character.userData.canTalk) return;

        // Prevent rapid-fire conversations
        character.userData.canTalk = false;
        setTimeout(() => { character.userData.canTalk = true; }, 2000);

        // Show dialogue
        const dialogueElement = document.getElementById('dialogue-box');
        if (dialogueElement) {
            dialogueElement.innerHTML = this.getCharacterDialogue(character.userData.name);
            dialogueElement.style.display = 'block';
            setTimeout(() => { dialogueElement.style.display = 'none'; }, 5000);
        }

        // Play sound effect
        this.soundManager.playSound('talk');
    }

    private getCharacterDialogue(characterName: string): string {
        const dialogues: { [key: string]: string } = {
            'Butler': "I was polishing silver in the dining room all evening.",
            'Professor': "I was in the library, researching my next book.",
            'Maid': "I was turning down the beds upstairs.",
            'Chef': "I was preparing tomorrow's menu in my quarters.",
            'Heir': "Uncle was planning to change his will. Not that it matters now."
        };
        return dialogues[characterName] || "...";
    }

    private animate(): void {
        requestAnimationFrame(() => this.animate());

        if (this.controls.isLocked) {
            const delta = this.clock.getDelta();

            // Update physics and movement
            this.updateMovement(delta);
            
            // Update matrices for frustum culling
            this.camera.updateMatrix();
            this.camera.updateMatrixWorld();
            
            // Update visible objects
            const frustum = new THREE.Frustum().setFromProjectionMatrix(
                new THREE.Matrix4().multiplyMatrices(
                    this.camera.projectionMatrix,
                    this.camera.matrixWorldInverse
                )
            );
            
            this.scene.traverse((object) => {
                if (object instanceof THREE.Mesh) {
                    if (!object.geometry.boundingSphere) {
                        object.geometry.computeBoundingSphere();
                    }
                    const sphere = object.geometry.boundingSphere!.clone();
                    sphere.applyMatrix4(object.matrixWorld);
                    object.visible = frustum.intersectsSphere(sphere);
                }
            });

            // Check for nearby interactive objects
            this.checkNearbyObjects();
        }

        // Render with post-processing
        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
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
                if (object.userData.type === 'door') {
                    const targetRoom = this.rooms.get(object.userData.targetRoom);
                    prompt.textContent = targetRoom ? `Door to ${targetRoom.name}` : 'Door';
                } else {
                    prompt.textContent = object.userData.name.replace(/_/g, ' ');
                }
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

    private addLibraryFurniture(): void {
        // Add bookshelves
        const bookshelfGeometry = new THREE.BoxGeometry(4, 2, 0.5);
        const bookshelfMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            roughness: 0.8,
            metalness: 0.2
        });

        const positions = [
            { x: -8, z: -8, rotation: 0 },
            { x: 8, z: -8, rotation: 0 },
            { x: -8, z: 8, rotation: Math.PI },
            { x: 8, z: 8, rotation: Math.PI }
        ];

        positions.forEach(pos => {
            const bookshelf = new THREE.Mesh(bookshelfGeometry, bookshelfMaterial);
            bookshelf.position.set(pos.x, 1, pos.z);
            bookshelf.rotation.y = pos.rotation;
            this.scene.add(bookshelf);
        });

        // Add reading area
        const chairGeometry = new THREE.BoxGeometry(1, 1, 1);
        const chairMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            roughness: 0.8,
            metalness: 0.2
        });

        const chair = new THREE.Mesh(chairGeometry, chairMaterial);
        chair.position.set(0, 0.5, 0);
        this.scene.add(chair);

        // Add reading table
        const tableGeometry = new THREE.BoxGeometry(2, 0.2, 1);
        const tableMaterial = chairMaterial;
        const table = new THREE.Mesh(tableGeometry, tableMaterial);
        table.position.set(0, 1, 1);
        this.scene.add(table);
    }

    private addDiningRoomFurniture(): void {
        // Add large dining table
        const tableGeometry = new THREE.BoxGeometry(6, 0.2, 2);
        const tableMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            roughness: 0.8,
            metalness: 0.2
        });

        const table = new THREE.Mesh(tableGeometry, tableMaterial);
        table.position.set(0, 1, 0);
        this.scene.add(table);

        // Add chairs
        const chairGeometry = new THREE.BoxGeometry(0.8, 1.2, 0.8);
        const chairMaterial = tableMaterial;

        for (let x = -2; x <= 2; x += 1) {
            for (let z = -1.5; z <= 1.5; z += 3) {
                const chair = new THREE.Mesh(chairGeometry, chairMaterial);
                chair.position.set(x * 2, 0.6, z);
                this.scene.add(chair);
            }
        }
    }

    private addKitchenFurniture(): void {
        // Add counters
        const counterGeometry = new THREE.BoxGeometry(8, 1, 1);
        const counterMaterial = new THREE.MeshStandardMaterial({
            color: 0xd3d3d3,
            roughness: 0.8,
            metalness: 0.2
        });

        const counter = new THREE.Mesh(counterGeometry, counterMaterial);
        counter.position.set(0, 0.5, -8);
        this.scene.add(counter);

        // Add stove
        const stoveGeometry = new THREE.BoxGeometry(2, 1, 1);
        const stoveMaterial = new THREE.MeshStandardMaterial({
            color: 0x2f2f2f,
            roughness: 0.8,
            metalness: 0.5
        });

        const stove = new THREE.Mesh(stoveGeometry, stoveMaterial);
        stove.position.set(-3, 0.5, -8);
        this.scene.add(stove);
    }

    private addStudyFurniture(): void {
        // Add desk
        const deskGeometry = new THREE.BoxGeometry(2, 0.2, 1);
        const deskMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            roughness: 0.8,
            metalness: 0.2
        });

        const desk = new THREE.Mesh(deskGeometry, deskMaterial);
        desk.position.set(0, 1, -8);
        this.scene.add(desk);

        // Add chair
        const chairGeometry = new THREE.BoxGeometry(0.8, 1.2, 0.8);
        const chair = new THREE.Mesh(chairGeometry, deskMaterial);
        chair.position.set(0, 0.6, -6.5);
        this.scene.add(chair);
    }

    private addBedroomFurniture(): void {
        // Add bed
        const bedGeometry = new THREE.BoxGeometry(2, 0.5, 3);
        const bedMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            roughness: 0.8,
            metalness: 0.2
        });

        const bed = new THREE.Mesh(bedGeometry, bedMaterial);
        bed.position.set(0, 0.25, -8);
        this.scene.add(bed);

        // Add nightstand
        const nightstandGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const nightstand = new THREE.Mesh(nightstandGeometry, bedMaterial);
        nightstand.position.set(2, 0.4, -8);
        this.scene.add(nightstand);
    }

    private addEntranceHallFurniture(): void {
        // Add console table
        const tableGeometry = new THREE.BoxGeometry(2, 0.2, 0.8);
        const tableMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            roughness: 0.8,
            metalness: 0.2
        });

        const table = new THREE.Mesh(tableGeometry, tableMaterial);
        table.position.set(0, 1, -8);
        this.scene.add(table);

        // Add mirror
        const mirrorGeometry = new THREE.PlaneGeometry(1.5, 2);
        const mirrorMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0.9,
            roughness: 0.1,
            reflectivity: 1.0
        });

        const mirror = new THREE.Mesh(mirrorGeometry, mirrorMaterial);
        mirror.position.set(0, 2, -8.1);
        this.scene.add(mirror);
    }

    private addConservatoryFurniture(): void {
        const resourceManager = ResourceManager.getInstance();

        // Add plant stands
        const standGeometry = resourceManager.getGeometry('cylinder');
        const woodMaterial = resourceManager.getMaterial('wood');
        standGeometry.scale(0.2, 0.5, 0.2);

        const positions = [
            { x: 13, z: -13 },
            { x: 17, z: -17 },
            { x: 13, z: -17 },
            { x: 17, z: -13 }
        ];

        positions.forEach(pos => {
            const stand = new THREE.Mesh(standGeometry, woodMaterial);
            stand.position.set(pos.x, 0.25, pos.z);
            this.scene.add(stand);

            // Add decorative plants
            const plant = this.createMysteriousPlant();
            plant.position.set(pos.x, 0.5, pos.z);
            this.scene.add(plant);
        });
    }

    private addGardenFurniture(): void {
        const resourceManager = ResourceManager.getInstance();

        // Add stone path
        const pathGeometry = resourceManager.getGeometry('plane');
        const stoneMaterial = new THREE.MeshStandardMaterial({
            color: 0x808080,
            roughness: 0.9,
            metalness: 0.1
        });
        pathGeometry.scale(1, 1, 1);

        for (let i = 0; i < 5; i++) {
            const stone = new THREE.Mesh(pathGeometry, stoneMaterial);
            stone.position.set(15, 0.01, -25 - i);
            stone.rotation.x = -Math.PI / 2;
            this.scene.add(stone);
        }

        // Add garden bench
        const benchGeometry = resourceManager.getGeometry('box');
        const woodMaterial = resourceManager.getMaterial('wood');
        benchGeometry.scale(2, 0.4, 0.6);
        const bench = new THREE.Mesh(benchGeometry, woodMaterial);
        bench.position.set(17, 0.2, -28);
        this.scene.add(bench);
    }

    private addWineCellarFurniture(): void {
        const resourceManager = ResourceManager.getInstance();

        // Add wine racks
        const rackGeometry = resourceManager.getGeometry('box');
        const woodMaterial = resourceManager.getMaterial('wood');
        rackGeometry.scale(2, 2, 0.3);

        const positions = [
            { x: -16, z: -2, rotation: 0 },
            { x: -14, z: -2, rotation: 0 },
            { x: -16, z: 2, rotation: Math.PI },
            { x: -14, z: 2, rotation: Math.PI }
        ];

        positions.forEach(pos => {
            const rack = new THREE.Mesh(rackGeometry, woodMaterial);
            rack.position.set(pos.x, -4, pos.z);
            rack.rotation.y = pos.rotation;
            this.scene.add(rack);

            // Add wine bottles
            for (let i = 0; i < 6; i++) {
                const bottle = this.createWineBottle();
                bottle.position.set(
                    pos.x + (Math.random() - 0.5) * 1.5,
                    -4 + (i % 3) * 0.5,
                    pos.z + (pos.rotation ? -0.2 : 0.2)
                );
                this.scene.add(bottle);
            }
        });
    }

    private addAtticFurniture(): void {
        const resourceManager = ResourceManager.getInstance();

        // Add old furniture covered with sheets
        const createCoveredFurniture = (width: number, height: number, depth: number, position: THREE.Vector3) => {
            const geometry = resourceManager.getGeometry('box');
            const material = new THREE.MeshStandardMaterial({
                color: 0xdddddd,
                roughness: 0.9,
                metalness: 0.1
            });
            geometry.scale(width, height, depth);
            const furniture = new THREE.Mesh(geometry, material);
            furniture.position.copy(position);
            this.scene.add(furniture);
        };

        createCoveredFurniture(2, 1.5, 1, new THREE.Vector3(-2, 5.75, -28));
        createCoveredFurniture(1, 1, 1, new THREE.Vector3(2, 5.5, -28));
        createCoveredFurniture(1.5, 0.8, 1.5, new THREE.Vector3(0, 5.4, -31));
    }

    private addSecretPassageFurniture(): void {
        const resourceManager = ResourceManager.getInstance();

        // Add wall sconces
        const sconceGeometry = resourceManager.getGeometry('cylinder');
        const metalMaterial = resourceManager.getMaterial('metal');
        sconceGeometry.scale(0.1, 0.3, 0.1);

        const positions = [
            { x: -29, z: -13 },
            { x: -29, z: -17 },
            { x: -31, z: -13 },
            { x: -31, z: -17 }
        ];

        positions.forEach(pos => {
            const sconce = new THREE.Mesh(sconceGeometry, metalMaterial);
            sconce.position.set(pos.x, 2, pos.z);
            sconce.rotation.x = Math.PI / 2;
            this.scene.add(sconce);

            // Add flickering light
            const light = new THREE.PointLight(0xff9966, 0.5, 3);
            light.position.set(pos.x, 2, pos.z);
            this.scene.add(light);

            setInterval(() => {
                light.intensity = 0.3 + Math.random() * 0.4;
            }, 100 + Math.random() * 100);
        });
    }

    private initializeInteractiveObjects(): void {
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

        // Add items to rooms
        this.initializeRoomItems();
    }

    private initializeRoomItems(): void {
        // Add items to their respective rooms
        const addItemToRoom = (roomId: string, itemName: string, itemMesh: THREE.Object3D, position: THREE.Vector3) => {
            const room = this.rooms.get(roomId);
            if (room) {
                itemMesh.position.copy(position);
                itemMesh.userData = {
                    type: 'item',
                    name: itemName,
                    isCollected: false
                };
                this.scene.add(itemMesh);
                this.interactiveObjects.push(itemMesh as THREE.Mesh);
                room.items = room.items || [];
                room.items.push({ name: itemName, mesh: itemMesh as THREE.Mesh, description: '', isCollected: false });
            }
        };

        // Add all items to their respective rooms
        addItemToRoom('entrance_hall', 'Muddy Footprint', this.createFootprint(), new THREE.Vector3(-1, 0.01, 0));
        addItemToRoom('library', 'Torn Page', this.createTornPage(), new THREE.Vector3(-14, 1, 1));
        addItemToRoom('library', 'Strange Letter', this.createLetter(), new THREE.Vector3(-16, 1, -1));
        addItemToRoom('dining_room', 'Wine Glass', this.createWineGlass(), new THREE.Vector3(14, 1, 1));
        addItemToRoom('dining_room', 'Napkin Note', this.createNapkinNote(), new THREE.Vector3(16, 1, -1));
        addItemToRoom('kitchen', 'Knife', this.createKnife(), new THREE.Vector3(29, 1, 1));
        addItemToRoom('kitchen', 'Recipe Book', this.createRecipeBook(), new THREE.Vector3(31, 1, -1));
        addItemToRoom('grand_staircase', 'Dropped Key', this.createKnife(), new THREE.Vector3(0, 0.01, -14));
        addItemToRoom('master_bedroom', 'Broken Glasses', this.createBrokenGlasses(), new THREE.Vector3(-1, 1, -29));
        addItemToRoom('master_bedroom', 'Secret Diary', this.createDiary(), new THREE.Vector3(1, 1, -31));
    }

    private createFootprint(): THREE.Mesh {
        const footprintGeometry = new THREE.PlaneGeometry(0.3, 0.6);
        const footprintMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x4a3c2a,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        const footprint = new THREE.Mesh(footprintGeometry, footprintMaterial);
        footprint.rotation.x = -Math.PI / 2;
        footprint.rotation.z = Math.PI / 6;
        return footprint;
    }

    private createTornPage(): THREE.Mesh {
        const pageGeometry = new THREE.PlaneGeometry(0.2, 0.3);
        const pageMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffcc,
            roughness: 0.9,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        const page = new THREE.Mesh(pageGeometry, pageMaterial);
        page.rotation.x = -Math.PI / 3;
        return page;
    }

    private createLetter(): THREE.Mesh {
        const letterGeometry = new THREE.PlaneGeometry(0.2, 0.3);
        const letterMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffee,
            roughness: 0.9,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        const letter = new THREE.Mesh(letterGeometry, letterMaterial);
        letter.rotation.x = -Math.PI / 4;
        return letter;
    }

    private createWineGlass(): THREE.Group {
        const glass = new THREE.Group();
        
        // Base
        const baseGeometry = new THREE.CylinderGeometry(0.1, 0.15, 0.05, 16);
        const baseMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            transmission: 0.9,
            opacity: 0.3,
            metalness: 0,
            roughness: 0,
            ior: 1.5,
            transparent: true
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        glass.add(base);

        // Stem
        const stemGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8);
        const stem = new THREE.Mesh(stemGeometry, baseMaterial);
        stem.position.y = 0.125;
        glass.add(stem);

        // Bowl
        const bowlGeometry = new THREE.SphereGeometry(0.1, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const bowl = new THREE.Mesh(bowlGeometry, baseMaterial);
        bowl.position.y = 0.3;
        bowl.scale.y = 1.5;
        glass.add(bowl);

        return glass;
    }

    private createNapkinNote(): THREE.Mesh {
        const noteGeometry = new THREE.PlaneGeometry(0.2, 0.2);
        const noteMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffee,
            roughness: 0.9,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        const note = new THREE.Mesh(noteGeometry, noteMaterial);
        note.rotation.x = -Math.PI / 2;
        return note;
    }

    private createKnife(): THREE.Group {
        const knife = new THREE.Group();

        // Blade
        const bladeGeometry = new THREE.BoxGeometry(0.05, 0.3, 0.02);
        const bladeMaterial = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            roughness: 0.3,
            metalness: 0.8
        });
        const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        knife.add(blade);

        // Handle
        const handleGeometry = new THREE.BoxGeometry(0.06, 0.15, 0.03);
        const handleMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a3c2a,
            roughness: 0.8,
            metalness: 0.2
        });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.position.y = -0.2;
        knife.add(handle);

        return knife;
    }

    private createRecipeBook(): THREE.Group {
        const book = new THREE.Group();

        // Cover
        const coverGeometry = new THREE.BoxGeometry(0.2, 0.02, 0.3);
        const coverMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b0000,
            roughness: 0.8,
            metalness: 0.2
        });
        const cover = new THREE.Mesh(coverGeometry, coverMaterial);
        book.add(cover);

        // Pages
        const pagesGeometry = new THREE.BoxGeometry(0.19, 0.1, 0.28);
        const pagesMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffee,
            roughness: 0.9,
            metalness: 0.1
        });
        const pages = new THREE.Mesh(pagesGeometry, pagesMaterial);
        pages.position.y = 0.05;
        book.add(pages);

        return book;
    }

    private createBrokenGlasses(): THREE.Group {
        const glasses = new THREE.Group();

        // Frame
        const frameGeometry = new THREE.TorusGeometry(0.1, 0.01, 8, 16, Math.PI);
        const frameMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a3c2a,
            roughness: 0.7,
            metalness: 0.3
        });
        const leftFrame = new THREE.Mesh(frameGeometry, frameMaterial);
        leftFrame.position.x = -0.1;
        glasses.add(leftFrame);

        const rightFrame = new THREE.Mesh(frameGeometry, frameMaterial);
        rightFrame.position.x = 0.1;
        rightFrame.rotation.z = Math.PI;
        glasses.add(rightFrame);

        // Bridge
        const bridgeGeometry = new THREE.BoxGeometry(0.1, 0.01, 0.01);
        const bridge = new THREE.Mesh(bridgeGeometry, frameMaterial);
        glasses.add(bridge);

        // Broken lens (shattered effect)
        const createShard = () => {
            const shardGeometry = new THREE.PlaneGeometry(0.05, 0.05);
            const shardMaterial = new THREE.MeshPhysicalMaterial({
                color: 0xffffff,
                transmission: 0.9,
                opacity: 0.3,
                metalness: 0,
                roughness: 0,
                ior: 1.5,
                transparent: true
            });
            return new THREE.Mesh(shardGeometry, shardMaterial);
        };

        for (let i = 0; i < 5; i++) {
            const shard = createShard();
            shard.position.x = 0.1 + (Math.random() - 0.5) * 0.1;
            shard.position.y = (Math.random() - 0.5) * 0.1;
            shard.rotation.z = Math.random() * Math.PI;
            glasses.add(shard);
        }

        return glasses;
    }

    private createDiary(): THREE.Group {
        const diary = new THREE.Group();

        // Cover
        const coverGeometry = new THREE.BoxGeometry(0.15, 0.03, 0.2);
        const coverMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a1810,
            roughness: 0.8,
            metalness: 0.2
        });
        const cover = new THREE.Mesh(coverGeometry, coverMaterial);
        diary.add(cover);

        // Pages
        const pagesGeometry = new THREE.BoxGeometry(0.14, 0.15, 0.19);
        const pagesMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffee,
            roughness: 0.9,
            metalness: 0.1
        });
        const pages = new THREE.Mesh(pagesGeometry, pagesMaterial);
        pages.position.y = 0.08;
        diary.add(pages);

        return diary;
    }

    private setupPostProcessing(): void {
        const composer = new EffectComposer(this.renderer);
        
        // Basic render pass
        const renderPass = new RenderPass(this.scene, this.camera);
        composer.addPass(renderPass);

        // Enhanced bloom effect
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.7,  // increased bloom strength
            0.8,  // increased radius
            0.35  // adjusted threshold
        );
        composer.addPass(bloomPass);

        // Enhanced SSAO (ambient occlusion)
        const ssaoPass = new SSAOPass(this.scene, this.camera);
        ssaoPass.kernelRadius = 32;
        ssaoPass.minDistance = 0.002;
        ssaoPass.maxDistance = 0.2;
        ssaoPass.kernelRadius = 16;
        ssaoPass.minDistance = 0.005;
        ssaoPass.maxDistance = 0.1;
        composer.addPass(ssaoPass);

        // Add color correction
        const effectPass = new ShaderPass(
            new THREE.ShaderMaterial({
                uniforms: {
                    tDiffuse: { value: null },
                    brightness: { value: 0.05 },
                    contrast: { value: 1.1 },
                    saturation: { value: 1.1 }
                },
                vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform sampler2D tDiffuse;
                    uniform float brightness;
                    uniform float contrast;
                    uniform float saturation;
                    varying vec2 vUv;
                    void main() {
                        vec4 color = texture2D(tDiffuse, vUv);
                        // Brightness
                        color.rgb += brightness;
                        // Contrast
                        color.rgb = (color.rgb - 0.5) * contrast + 0.5;
                        // Saturation
                        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
                        color.rgb = mix(vec3(gray), color.rgb, saturation);
                        gl_FragColor = color;
                    }
                `
            })
        );
        composer.addPass(effectPass);

        this.composer = composer;
    }

    private initializeRenderer(): void {
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            powerPreference: "high-performance",
            stencil: false,
            depth: true,
            precision: "mediump",
            logarithmicDepthBuffer: false
        });
        
        // Optimize renderer settings
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        
        // Enable frustum culling
        this.camera.matrixAutoUpdate = true;
        this.scene.matrixAutoUpdate = false;
        this.scene.autoUpdate = false;
    }

    private updateMovement(delta: number): void {
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
    }

    private addDynamicLighting(roomId: string): void {
        switch (roomId) {
            case 'library':
                // Add flickering candlelight
                const candleLight = new THREE.PointLight(0xffd700, 0.5, 3);
                candleLight.position.set(-14, 1, 0);
                this.scene.add(candleLight);
                
                const candleFlicker = () => {
                    candleLight.intensity = 0.4 + Math.random() * 0.2;
                    requestAnimationFrame(candleFlicker);
                };
                candleFlicker();
                break;
                
            case 'conservatory':
                // Add dynamic sunlight that changes color based on time
                const sunLight = new THREE.DirectionalLight(0xffffff, 1);
                sunLight.position.set(1, 1, 1);
                this.scene.add(sunLight);
                
                const updateSunlight = () => {
                    const time = Date.now() * 0.001;
                    const hue = (Math.sin(time * 0.1) + 1) * 0.1;
                    sunLight.color.setHSL(hue, 0.5, 0.5);
                    requestAnimationFrame(updateSunlight);
                };
                updateSunlight();
                break;
                
            case 'wine_cellar':
                // Add dust particles with dynamic lighting
                const particleSystem = this.createDustParticles();
                this.scene.add(particleSystem);
                break;
        }
    }

    private createDustParticles(): THREE.Points {
        const particleCount = 1000;
        const particles = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        for (let i = 0; i < particleCount; i++) {
            particles[i * 3] = (Math.random() - 0.5) * 10;
            particles[i * 3 + 1] = Math.random() * 5;
            particles[i * 3 + 2] = (Math.random() - 0.5) * 10;
            sizes[i] = Math.random() * 0.1;
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(particles, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.05,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        const points = new THREE.Points(geometry, material);
        
        // Animate particles
        const animate = () => {
            const positions = points.geometry.attributes.position.array as Float32Array;
            for (let i = 0; i < particleCount; i++) {
                positions[i * 3 + 1] += Math.sin(Date.now() * 0.001 + i) * 0.001;
                positions[i * 3] += Math.cos(Date.now() * 0.001 + i) * 0.001;
            }
            points.geometry.attributes.position.needsUpdate = true;
            requestAnimationFrame(animate);
        };
        animate();
        
        return points;
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