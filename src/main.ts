import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';

class Game {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: PointerLockControls;

    constructor() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb); // Sky blue

        // Create camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.y = 1.6; // Eye height
        this.camera.position.z = 5;

        // Create renderer
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.querySelector('#app')?.appendChild(this.renderer.domElement);

        // Create controls
        this.controls = new PointerLockControls(this.camera, document.body);

        // Add event listeners
        this.setupEventListeners();

        // Create basic scene
        this.createScene();

        // Start animation loop
        this.animate();
    }

    private setupEventListeners(): void {
        // Lock controls on click
        document.querySelector('.click-to-start')?.addEventListener('click', () => {
            this.controls.lock();
        });

        // Handle pointer lock change
        document.addEventListener('pointerlockchange', () => {
            const startPrompt = document.querySelector('.click-to-start') as HTMLElement;
            if (startPrompt) {
                startPrompt.style.display = this.controls.isLocked ? 'none' : 'block';
            }
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    private createScene(): void {
        // Add floor
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(20, 20),
            new THREE.MeshStandardMaterial({ color: 0x808080 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);

        // Add directional light
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(5, 5, 5);
        light.castShadow = true;
        this.scene.add(light);

        // Add a simple cube for reference
        const cube = new THREE.Mesh(
            new THREE.BoxGeometry(),
            new THREE.MeshStandardMaterial({ color: 0x00ff00 })
        );
        cube.position.set(0, 0.5, -5);
        cube.castShadow = true;
        this.scene.add(cube);
    }

    private animate(): void {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    new Game();
}); 