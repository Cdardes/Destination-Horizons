import * as THREE from 'three';

export function createPlaceholderRoom() {
    const room = new THREE.Group();

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(10, 10);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    room.add(floor);

    // Walls
    const wallGeometry = new THREE.PlaneGeometry(10, 4);
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xa0a0a0 });

    // Back wall
    const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
    backWall.position.z = -5;
    backWall.position.y = 2;
    backWall.receiveShadow = true;
    room.add(backWall);

    // Left wall
    const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
    leftWall.position.x = -5;
    leftWall.position.y = 2;
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    room.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
    rightWall.position.x = 5;
    rightWall.position.y = 2;
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    room.add(rightWall);

    // Add some furniture (placeholder boxes)
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const boxMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });

    // Table
    const table = new THREE.Mesh(boxGeometry, boxMaterial);
    table.scale.set(2, 1, 1);
    table.position.set(0, 0.5, 0);
    table.castShadow = true;
    room.add(table);

    // Chairs
    const chair1 = new THREE.Mesh(boxGeometry, boxMaterial);
    chair1.scale.set(0.5, 0.8, 0.5);
    chair1.position.set(-1.5, 0.4, 0);
    chair1.castShadow = true;
    room.add(chair1);

    const chair2 = new THREE.Mesh(boxGeometry, boxMaterial);
    chair2.scale.set(0.5, 0.8, 0.5);
    chair2.position.set(1.5, 0.4, 0);
    chair2.castShadow = true;
    room.add(chair2);

    return room;
} 