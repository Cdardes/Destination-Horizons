import * as THREE from 'three';
import { RoomBuilder } from '../RoomBuilder';

export class Kitchen extends RoomBuilder {
    constructor() {
        super();
    }

    createRoom() {
        const room = super.createRoom('kitchen');
        this.addCounters(room);
        this.addIsland(room);
        this.addAppliances(room);
        this.addClues(room);
        return room;
    }

    addCounters(room) {
        // Add counters along the walls
        const counterPositions = [
            { x: -4, z: -4, rotation: 0 },
            { x: 4, z: -4, rotation: 0 },
            { x: -4, z: 4, rotation: Math.PI },
            { x: 4, z: 4, rotation: Math.PI }
        ];

        counterPositions.forEach(pos => {
            const counter = this.createCounter();
            counter.position.set(pos.x, 0, pos.z);
            counter.rotation.y = pos.rotation;
            room.add(counter);
        });
    }

    createCounter() {
        const counter = new THREE.Group();

        // Base cabinets
        const baseGeometry = new THREE.BoxGeometry(2, 0.9, 0.6);
        const base = new THREE.Mesh(baseGeometry, this.materials.wood);
        base.position.y = 0.45;
        counter.add(base);

        // Countertop
        const topGeometry = new THREE.BoxGeometry(2, 0.05, 0.6);
        const topMaterial = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            roughness: 0.3,
            metalness: 0.2
        });
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.y = 0.925;
        counter.add(top);

        // Upper cabinets
        const upperGeometry = new THREE.BoxGeometry(2, 0.8, 0.3);
        const upper = new THREE.Mesh(upperGeometry, this.materials.wood);
        upper.position.set(0, 2.2, -0.15);
        counter.add(upper);

        return counter;
    }

    addIsland(room) {
        const island = new THREE.Group();

        // Island base
        const baseGeometry = new THREE.BoxGeometry(3, 0.9, 1.5);
        const base = new THREE.Mesh(baseGeometry, this.materials.wood);
        base.position.y = 0.45;
        island.add(base);

        // Island top
        const topGeometry = new THREE.BoxGeometry(3, 0.05, 1.5);
        const topMaterial = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            roughness: 0.3,
            metalness: 0.2
        });
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.y = 0.925;
        island.add(top);

        // Add some kitchen tools
        const tools = this.createKitchenTools();
        tools.position.set(0, 0.95, 0);
        island.add(tools);

        island.position.set(0, 0, 0);
        room.add(island);
    }

    createKitchenTools() {
        const tools = new THREE.Group();

        // Cutting board
        const boardGeometry = new THREE.BoxGeometry(0.4, 0.02, 0.3);
        const boardMaterial = new THREE.MeshStandardMaterial({
            color: 0xd2b48c,
            roughness: 0.8
        });
        const board = new THREE.Mesh(boardGeometry, boardMaterial);
        board.position.set(-0.5, 0, 0);
        tools.add(board);

        // Knife block
        const blockGeometry = new THREE.BoxGeometry(0.2, 0.3, 0.1);
        const block = new THREE.Mesh(blockGeometry, this.materials.wood);
        block.position.set(0.5, 0.15, 0);
        tools.add(block);

        return tools;
    }

    addAppliances(room) {
        // Add stove
        const stove = this.createStove();
        stove.position.set(-3, 0, -4);
        room.add(stove);

        // Add refrigerator
        const fridge = this.createRefrigerator();
        fridge.position.set(3, 0, -4);
        room.add(fridge);
    }

    createStove() {
        const stove = new THREE.Group();

        // Main body
        const bodyGeometry = new THREE.BoxGeometry(1.2, 0.9, 0.6);
        const body = new THREE.Mesh(bodyGeometry, this.materials.metal);
        body.position.y = 0.45;
        stove.add(body);

        // Cooktop
        const topGeometry = new THREE.BoxGeometry(1.2, 0.05, 0.6);
        const top = new THREE.Mesh(topGeometry, new THREE.MeshStandardMaterial({ color: 0x111111 }));
        top.position.y = 0.925;
        stove.add(top);

        // Burners
        const burnerGeometry = new THREE.CircleGeometry(0.1, 16);
        const burnerMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const burnerPositions = [
            [-0.3, 0.15],
            [0.3, 0.15],
            [-0.3, -0.15],
            [0.3, -0.15]
        ];

        burnerPositions.forEach(pos => {
            const burner = new THREE.Mesh(burnerGeometry, burnerMaterial);
            burner.position.set(pos[0], 0.926, pos[1]);
            burner.rotation.x = -Math.PI / 2;
            stove.add(burner);
        });

        return stove;
    }

    createRefrigerator() {
        const fridge = new THREE.Group();

        // Main body
        const bodyGeometry = new THREE.BoxGeometry(1, 2, 0.8);
        const body = new THREE.Mesh(bodyGeometry, this.materials.metal);
        body.position.y = 1;
        fridge.add(body);

        // Handle
        const handleGeometry = new THREE.BoxGeometry(0.05, 0.4, 0.05);
        const handle = new THREE.Mesh(handleGeometry, this.materials.metal);
        handle.position.set(0.45, 1, 0.3);
        fridge.add(handle);

        return fridge;
    }

    addClues(room) {
        // Add knife
        const knife = this.createInteractiveObject(
            new THREE.BoxGeometry(0.05, 0.3, 0.02),
            this.materials.metal,
            new THREE.Vector3(0.5, 1.1, 0),
            "knife",
            "clue"
        );
        knife.rotation.z = Math.PI / 4;
        room.add(knife);

        // Add recipe book
        const recipeBook = this.createInteractiveObject(
            new THREE.BoxGeometry(0.2, 0.02, 0.3),
            new THREE.MeshStandardMaterial({ color: 0x8b0000 }),
            new THREE.Vector3(-0.5, 0.96, 0),
            "recipe_book",
            "clue"
        );
        room.add(recipeBook);
    }
} 