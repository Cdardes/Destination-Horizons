import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

class MansionGame {
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

    constructor() {
        // Initialize scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);

        // Initialize camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        (this.camera as any).position.y = 1.6; // Average eye height

        // Initialize renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        (this.renderer as any).shadowMap.enabled = true;
        document.getElementById('game-container')?.appendChild(this.renderer.domElement);

        // Initialize controls
        this.controls = new PointerLockControls(this.camera, document.body);
        
        // Initialize movement vectors
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();

        // Setup initial room
        this.setupEntranceHall();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start animation loop
        this.animate();
    }

    private setupEntranceHall(): void {
        // Floor
        const floorGeometry = new THREE.PlaneGeometry(20, 20);
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x808080,
            roughness: 0.8,
            metalness: 0.2
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial as THREE.Material);
        (floor as any).rotation.x = -Math.PI / 2;
        (floor as any).receiveShadow = true;
        this.scene.add(floor);

        // Walls
        const wallMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8B4513,
            roughness: 0.9,
            metalness: 0.1
        });

        // Create walls
        const walls = [
            { pos: [0, 5, -10], rot: [0, 0, 0], scale: [20, 10, 0.3] }, // North
            { pos: [0, 5, 10], rot: [0, 0, 0], scale: [20, 10, 0.3] },  // South
            { pos: [-10, 5, 0], rot: [0, Math.PI / 2, 0], scale: [20, 10, 0.3] }, // West
            { pos: [10, 5, 0], rot: [0, Math.PI / 2, 0], scale: [20, 10, 0.3] }   // East
        ];

        walls.forEach(wall => {
            const wallGeometry = new THREE.BoxGeometry(1, 1, 1);
            const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial as THREE.Material);
            (wallMesh as any).position.set(wall.pos[0], wall.pos[1], wall.pos[2]);
            (wallMesh as any).rotation.set(wall.rot[0], wall.rot[1], wall.rot[2]);
            (wallMesh as any).scale.set(wall.scale[0], wall.scale[1], wall.scale[2]);
            (wallMesh as any).castShadow = true;
            (wallMesh as any).receiveShadow = true;
            this.scene.add(wallMesh);
        });

        // Add lighting
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);

        const mainLight = new THREE.PointLight(0xffffff, 1, 100);
        (mainLight as any).position.set(0, 8, 0);
        (mainLight as any).castShadow = true;
        this.scene.add(mainLight);

        // Add chandelier model (placeholder as a simple shape for now)
        const chandelierGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const chandelierMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFFD700,
            metalness: 0.8,
            roughness: 0.2
        });
        const chandelier = new THREE.Mesh(chandelierGeometry, chandelierMaterial as THREE.Material);
        (chandelier as any).position.set(0, 8, 0);
        this.scene.add(chandelier);
    }

    private setupEventListeners(): void {
        // Lock pointer on click
        document.addEventListener('click', () => {
            this.controls.lock();
        });

        // Movement controls
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
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    private animate(): void {
        requestAnimationFrame(() => this.animate());

        if (this.controls.isLocked) {
            const delta = 0.1;

            this.velocity.x -= this.velocity.x * 10.0 * delta;
            this.velocity.z -= this.velocity.z * 10.0 * delta;

            this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
            this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
            this.direction.normalize();

            if (this.moveForward || this.moveBackward) {
                this.velocity.z -= this.direction.z * 400.0 * delta;
            }
            if (this.moveLeft || this.moveRight) {
                this.velocity.x -= this.direction.x * 400.0 * delta;
            }

            this.controls.moveRight(-this.velocity.x * delta);
            this.controls.moveForward(-this.velocity.z * delta);
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MansionGame();
}); 