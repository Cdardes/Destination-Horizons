import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { GUI } from 'dat.gui';
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

class ResourceManager {
    private static instance: ResourceManager;
    private geometries: Map<string, THREE.BufferGeometry>;
    private materials: Map<string, THREE.Material>;
    private objectPool: Map<string, THREE.Object3D[]>;
    private textureLoader: THREE.TextureLoader;
    private loadedTextures: Map<string, THREE.Texture>;

    private constructor() {
        this.geometries = new Map();
        this.materials = new Map();
        this.objectPool = new Map();
        this.textureLoader = new THREE.TextureLoader();
        this.loadedTextures = new Map();
        this.initializeCommonResources();
    }

    static getInstance(): ResourceManager {
        if (!ResourceManager.instance) {
            ResourceManager.instance = new ResourceManager();
        }
        return ResourceManager.instance;
    }

    private initializeCommonResources(): void {
        // Simplified geometries with lower polygon counts
        this.geometries.set('box', new THREE.BoxGeometry(1, 1, 1));
        this.geometries.set('sphere', new THREE.SphereGeometry(1, 8, 8)); // Reduced segments
        this.geometries.set('cylinder', new THREE.CylinderGeometry(1, 1, 1, 6)); // Reduced segments
        this.geometries.set('plane', new THREE.PlaneGeometry(1, 1));

        // Use MeshLambertMaterial instead of MeshStandardMaterial for better performance
        this.materials.set('wood', new THREE.MeshLambertMaterial({
            color: 0x8b4513
        }));
        this.materials.set('metal', new THREE.MeshLambertMaterial({
            color: 0xcccccc
        }));
        this.materials.set('glass', new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.3
        }));
    }

    getGeometry(key: string): THREE.BufferGeometry {
        const geometry = this.geometries.get(key);
        if (!geometry) {
            console.warn(`Geometry ${key} not found, using fallback`);
            return this.geometries.get('box') || new THREE.BoxGeometry(1, 1, 1);
        }
        return geometry;
    }

    getMaterial(key: string): THREE.Material {
        const material = this.materials.get(key);
        if (!material) {
            console.warn(`Material ${key} not found, using fallback`);
            return new THREE.MeshBasicMaterial({ color: 0xff00ff });
        }
        return material;
    }

    // Improved object pooling
    acquireObject(type: string): THREE.Object3D | null {
        if (!this.objectPool.has(type)) {
            this.objectPool.set(type, []);
        }
        const pool = this.objectPool.get(type)!;
        return pool.pop() || this.createNewObject(type);
    }

    private createNewObject(type: string): THREE.Object3D {
        const geometry = this.getGeometry('box');
        const material = this.getMaterial('wood');
        return new THREE.Mesh(geometry, material);
    }

    releaseObject(type: string, object: THREE.Object3D): void {
        if (!this.objectPool.has(type)) {
            this.objectPool.set(type, []);
        }
        // Reset object properties
        object.position.set(0, 0, 0);
        object.rotation.set(0, 0, 0);
        object.scale.set(1, 1, 1);
        this.objectPool.get(type)!.push(object);
    }

    dispose(): void {
        this.geometries.forEach(geometry => geometry.dispose());
        this.materials.forEach(material => material.dispose());
        this.loadedTextures.forEach(texture => texture.dispose());
        this.objectPool.clear();
        this.loadedTextures.clear();
    }
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
    private lastNearbyCheck: number = 0;
    private readonly NEARBY_CHECK_INTERVAL: number = 100; // Check every 100ms

    constructor() {
        // Initialize basic components
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.clock = new THREE.Clock();

        // Setup renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(1); // Force 1:1 pixel ratio
        document.getElementById('app')?.appendChild(this.renderer.domElement);

        // Setup camera
        this.camera.position.y = 1.6; // Eye level
        
        // Setup controls
        this.controls = new PointerLockControls(this.camera, document.body);
        
        // Create basic scene
        this.createScene();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start animation loop
        this.animate();
    }

    private createScene(): void {
        // Add floor
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(20, 20),
            new THREE.MeshBasicMaterial({ color: 0x808080 })
        );
        floor.rotation.x = -Math.PI / 2;
        this.scene.add(floor);

        // Add walls
        const walls = [
            { pos: [0, 2, -10], rot: [0, 0, 0] },
            { pos: [0, 2, 10], rot: [0, Math.PI, 0] },
            { pos: [-10, 2, 0], rot: [0, Math.PI / 2, 0] },
            { pos: [10, 2, 0], rot: [0, -Math.PI / 2, 0] }
        ];

        const wallGeometry = new THREE.PlaneGeometry(20, 4);
        const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x808080 });

        walls.forEach(wall => {
            const mesh = new THREE.Mesh(wallGeometry, wallMaterial);
            mesh.position.set(...wall.pos);
            mesh.rotation.set(...wall.rot);
            this.scene.add(mesh);
        });

        // Add basic lighting
        const light = new THREE.AmbientLight(0xffffff, 1);
        this.scene.add(light);
    }

    private setupEventListeners(): void {
        // Lock controls on click
        const startPrompt = document.createElement('div');
        startPrompt.className = 'click-to-start';
        startPrompt.textContent = 'Click to start';
        startPrompt.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 24px; cursor: pointer;';
        document.body.appendChild(startPrompt);

        startPrompt.addEventListener('click', () => {
            this.controls.lock();
        });

        // Handle pointer lock change
        document.addEventListener('pointerlockchange', () => {
            startPrompt.style.display = document.pointerLockElement ? 'none' : 'block';
        });

        // Handle movement
        const onKeyDown = (event: KeyboardEvent) => {
            if (!this.controls.isLocked) return;
            
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
        };

        const onKeyUp = (event: KeyboardEvent) => {
            if (!this.controls.isLocked) return;

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

        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    private updateMovement(): void {
        const delta = Math.min(this.clock.getDelta(), 0.1);
        const speed = 5;

        // Simple velocity calculation
        this.velocity.x = 0;
        this.velocity.z = 0;

        if (this.moveForward) this.velocity.z = -speed * delta;
        if (this.moveBackward) this.velocity.z = speed * delta;
        if (this.moveLeft) this.velocity.x = -speed * delta;
        if (this.moveRight) this.velocity.x = speed * delta;

        // Apply movement
        this.controls.moveRight(this.velocity.x);
        this.controls.moveForward(this.velocity.z);
    }

    private animate(): void {
        requestAnimationFrame(() => this.animate());

        if (this.controls.isLocked) {
            this.updateMovement();
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    new Game();
}); 