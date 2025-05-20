import * as THREE from 'three';

export class RoomBuilder {
    constructor() {
        this.textureLoader = new THREE.TextureLoader();
        this.materials = {
            wood: new THREE.MeshStandardMaterial({
                color: 0x8b4513,
                roughness: 0.7,
                metalness: 0.1
            }),
            wallpaper: new THREE.MeshStandardMaterial({
                color: 0xd4c4a8,
                roughness: 0.9,
                metalness: 0.1
            }),
            carpet: new THREE.MeshStandardMaterial({
                color: 0x7a3b2e,
                roughness: 1,
                metalness: 0
            }),
            metal: new THREE.MeshStandardMaterial({
                color: 0xb4b4b4,
                roughness: 0.3,
                metalness: 0.8
            }),
            glass: new THREE.MeshPhysicalMaterial({
                color: 0xffffff,
                transmission: 0.9,
                opacity: 0.3,
                metalness: 0,
                roughness: 0,
                ior: 1.5,
                transparent: true
            })
        };
    }

    createRoom(type, dimensions = { width: 10, height: 4, depth: 10 }) {
        const room = new THREE.Group();
        room.userData.type = type;
        room.userData.interactive = true;

        // Add basic room structure
        this.addFloor(room, dimensions);
        this.addWalls(room, dimensions);
        this.addCeiling(room, dimensions);
        
        // Add room-specific furniture and items
        switch (type) {
            case 'entrance_hall':
                this.addEntranceHallFurniture(room, dimensions);
                break;
            case 'library':
                this.addLibraryFurniture(room, dimensions);
                break;
            case 'dining_room':
                this.addDiningRoomFurniture(room, dimensions);
                break;
            case 'kitchen':
                this.addKitchenFurniture(room, dimensions);
                break;
            case 'grand_staircase':
                this.addStaircaseFurniture(room, dimensions);
                break;
            case 'master_bedroom':
                this.addBedroomFurniture(room, dimensions);
                break;
        }

        return room;
    }

    addFloor(room, dimensions) {
        const floorGeometry = new THREE.PlaneGeometry(dimensions.width, dimensions.depth);
        const floor = new THREE.Mesh(floorGeometry, this.materials.carpet);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        room.add(floor);
    }

    addWalls(room, dimensions) {
        const wallGeometry = new THREE.PlaneGeometry(dimensions.width, dimensions.height);
        
        // Back wall
        const backWall = new THREE.Mesh(wallGeometry, this.materials.wallpaper);
        backWall.position.z = -dimensions.depth / 2;
        backWall.position.y = dimensions.height / 2;
        backWall.receiveShadow = true;
        room.add(backWall);

        // Front wall with door
        const frontWall = this.createWallWithDoor(dimensions);
        frontWall.position.z = dimensions.depth / 2;
        frontWall.position.y = dimensions.height / 2;
        frontWall.rotation.y = Math.PI;
        room.add(frontWall);

        // Side walls
        const leftWall = new THREE.Mesh(wallGeometry, this.materials.wallpaper);
        leftWall.position.x = -dimensions.width / 2;
        leftWall.position.y = dimensions.height / 2;
        leftWall.rotation.y = Math.PI / 2;
        leftWall.receiveShadow = true;
        room.add(leftWall);

        const rightWall = new THREE.Mesh(wallGeometry, this.materials.wallpaper);
        rightWall.position.x = dimensions.width / 2;
        rightWall.position.y = dimensions.height / 2;
        rightWall.rotation.y = -Math.PI / 2;
        rightWall.receiveShadow = true;
        room.add(rightWall);
    }

    addCeiling(room, dimensions) {
        const ceilingGeometry = new THREE.PlaneGeometry(dimensions.width, dimensions.depth);
        const ceiling = new THREE.Mesh(ceilingGeometry, this.materials.wallpaper);
        ceiling.position.y = dimensions.height;
        ceiling.rotation.x = Math.PI / 2;
        room.add(ceiling);
    }

    createWallWithDoor(dimensions) {
        const group = new THREE.Group();
        
        // Create wall segments around the door
        const doorWidth = 2;
        const doorHeight = 3;
        
        // Top segment
        const topGeometry = new THREE.PlaneGeometry(dimensions.width, dimensions.height - doorHeight);
        const topWall = new THREE.Mesh(topGeometry, this.materials.wallpaper);
        topWall.position.y = doorHeight + (dimensions.height - doorHeight) / 2;
        group.add(topWall);
        
        // Side segments
        const sideGeometry = new THREE.PlaneGeometry((dimensions.width - doorWidth) / 2, doorHeight);
        
        const leftWall = new THREE.Mesh(sideGeometry, this.materials.wallpaper);
        leftWall.position.x = -(doorWidth + (dimensions.width - doorWidth) / 4);
        leftWall.position.y = doorHeight / 2;
        group.add(leftWall);
        
        const rightWall = new THREE.Mesh(sideGeometry, this.materials.wallpaper);
        rightWall.position.x = (doorWidth + (dimensions.width - doorWidth) / 4);
        rightWall.position.y = doorHeight / 2;
        group.add(rightWall);
        
        // Door frame
        this.addDoorFrame(group, doorWidth, doorHeight);
        
        return group;
    }

    addDoorFrame(group, width, height) {
        const frameThickness = 0.1;
        const frameBreadth = 0.2;
        
        const frameGeometry = new THREE.BoxGeometry(frameBreadth, height, frameThickness);
        const topFrameGeometry = new THREE.BoxGeometry(width + frameBreadth * 2, frameBreadth, frameThickness);
        
        // Left frame
        const leftFrame = new THREE.Mesh(frameGeometry, this.materials.wood);
        leftFrame.position.set(-width/2 - frameBreadth/2, height/2, 0);
        group.add(leftFrame);
        
        // Right frame
        const rightFrame = new THREE.Mesh(frameGeometry, this.materials.wood);
        rightFrame.position.set(width/2 + frameBreadth/2, height/2, 0);
        group.add(rightFrame);
        
        // Top frame
        const topFrame = new THREE.Mesh(topFrameGeometry, this.materials.wood);
        topFrame.position.set(0, height + frameBreadth/2, 0);
        group.add(topFrame);
    }

    createInteractiveObject(geometry, material, position, name, type) {
        const object = new THREE.Mesh(geometry, material);
        object.position.copy(position);
        object.castShadow = true;
        object.receiveShadow = true;
        object.userData.name = name;
        object.userData.type = type;
        object.userData.interactive = true;
        return object;
    }

    addEntranceHallFurniture(room, dimensions) {
        // Add chandelier
        const chandelier = this.createChandelier();
        chandelier.position.set(0, dimensions.height - 1, 0);
        room.add(chandelier);

        // Add console table
        const consoleTable = this.createConsoleTable();
        consoleTable.position.set(0, 0, -dimensions.depth/2 + 1);
        room.add(consoleTable);

        // Add muddy footprint (interactive clue)
        const footprintGeometry = new THREE.PlaneGeometry(0.5, 1);
        const footprintMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x4a3c2a,
            transparent: true,
            opacity: 0.7
        });
        const footprint = this.createInteractiveObject(
            footprintGeometry,
            footprintMaterial,
            new THREE.Vector3(-1, 0.01, 0),
            "muddy_footprint",
            "clue"
        );
        footprint.rotation.x = -Math.PI / 2;
        room.add(footprint);
    }

    createChandelier() {
        const group = new THREE.Group();
        
        // Main structure
        const baseGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 8);
        const base = new THREE.Mesh(baseGeometry, this.materials.metal);
        group.add(base);
        
        // Add lights
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const radius = 0.8;
            
            const light = new THREE.PointLight(0xffaa44, 0.5, 5);
            light.position.set(
                Math.cos(angle) * radius,
                -0.5,
                Math.sin(angle) * radius
            );
            group.add(light);
            
            // Add decorative bulb
            const bulbGeometry = new THREE.SphereGeometry(0.1, 8, 8);
            const bulb = new THREE.Mesh(bulbGeometry, this.materials.glass);
            bulb.position.copy(light.position);
            group.add(bulb);
        }
        
        return group;
    }

    createConsoleTable() {
        const group = new THREE.Group();
        
        // Table top
        const topGeometry = new THREE.BoxGeometry(2, 0.1, 0.8);
        const top = new THREE.Mesh(topGeometry, this.materials.wood);
        top.position.y = 1;
        group.add(top);
        
        // Legs
        const legGeometry = new THREE.BoxGeometry(0.1, 1, 0.1);
        for (let x = -0.9; x <= 0.9; x += 1.8) {
            for (let z = -0.3; z <= 0.3; z += 0.6) {
                const leg = new THREE.Mesh(legGeometry, this.materials.wood);
                leg.position.set(x, 0.5, z);
                group.add(leg);
            }
        }
        
        return group;
    }

    // Add other room-specific furniture methods here...
} 