import * as THREE from 'three';

export class LibraryRoom {
    constructor(materials) {
        this.materials = materials;
    }

    create(dimensions = { width: 10, height: 4, depth: 10 }) {
        const room = new THREE.Group();

        // Add basic room structure
        this.addFloor(room, dimensions);
        this.addWalls(room, dimensions);
        this.addCeiling(room, dimensions);
        
        // Add bookshelves
        this.addBookshelves(room, dimensions);
        
        // Add fireplace
        this.addFireplace(room);
        
        // Add reading area
        this.addReadingArea(room);
        
        // Add clues
        this.addClues(room);

        return room;
    }

    addBookshelves(room, dimensions) {
        const shelfWidth = dimensions.width * 0.8;
        const shelfHeight = dimensions.height * 0.8;
        const shelfDepth = 0.5;
        const numShelves = 5;
        const shelfSpacing = shelfHeight / numShelves;

        // Create bookshelves along back wall
        const bookshelf = new THREE.Group();
        
        // Main bookshelf structure
        const shelfGeometry = new THREE.BoxGeometry(shelfWidth, shelfHeight, shelfDepth);
        const shelf = new THREE.Mesh(shelfGeometry, this.materials.wood);
        shelf.position.set(0, shelfHeight/2, -dimensions.depth/2 + shelfDepth/2);
        bookshelf.add(shelf);

        // Add individual shelves
        for (let i = 1; i < numShelves; i++) {
            const shelfBoardGeometry = new THREE.BoxGeometry(shelfWidth, 0.1, shelfDepth);
            const shelfBoard = new THREE.Mesh(shelfBoardGeometry, this.materials.wood);
            shelfBoard.position.set(0, i * shelfSpacing, -dimensions.depth/2 + shelfDepth/2);
            bookshelf.add(shelfBoard);
        }

        // Add books
        for (let i = 0; i < numShelves; i++) {
            const y = i * shelfSpacing;
            for (let x = -shelfWidth/2 + 0.2; x < shelfWidth/2; x += 0.2) {
                const bookHeight = 0.3 + Math.random() * 0.2;
                const bookGeometry = new THREE.BoxGeometry(0.15, bookHeight, 0.3);
                const bookMaterial = new THREE.MeshStandardMaterial({
                    color: new THREE.Color().setHSL(Math.random(), 0.7, 0.3)
                });
                const book = new THREE.Mesh(bookGeometry, bookMaterial);
                book.position.set(
                    x,
                    y + bookHeight/2,
                    -dimensions.depth/2 + shelfDepth/2
                );
                bookshelf.add(book);
            }
        }

        room.add(bookshelf);
    }

    addFireplace(room) {
        const fireplace = new THREE.Group();

        // Fireplace structure
        const fireplaceGeometry = new THREE.BoxGeometry(2, 2, 0.5);
        const fireplaceBase = new THREE.Mesh(fireplaceGeometry, this.materials.metal);
        fireplaceBase.position.set(0, 1, -4.5);
        fireplace.add(fireplaceBase);

        // Mantel
        const mantelGeometry = new THREE.BoxGeometry(2.4, 0.2, 0.7);
        const mantel = new THREE.Mesh(mantelGeometry, this.materials.wood);
        mantel.position.set(0, 2.1, -4.5);
        fireplace.add(mantel);

        // Fire glow (point light)
        const fireLight = new THREE.PointLight(0xff6600, 1, 5);
        fireLight.position.set(0, 1, -4.3);
        fireplace.add(fireLight);

        // Animated fire particles will be added through the particle system

        room.add(fireplace);
    }

    addReadingArea(room) {
        const readingArea = new THREE.Group();

        // Armchair
        const chair = this.createArmchair();
        chair.position.set(-2, 0, -2);
        chair.rotation.y = Math.PI / 4;
        readingArea.add(chair);

        // Reading table
        const table = this.createReadingTable();
        table.position.set(-1.5, 0, -1.5);
        readingArea.add(table);

        // Reading lamp
        const lamp = this.createReadingLamp();
        lamp.position.set(-1.5, 0.8, -1.5);
        readingArea.add(lamp);

        room.add(readingArea);
    }

    createArmchair() {
        const chair = new THREE.Group();

        // Seat
        const seatGeometry = new THREE.BoxGeometry(1, 0.5, 1);
        const seat = new THREE.Mesh(seatGeometry, this.materials.wood);
        seat.position.y = 0.25;
        chair.add(seat);

        // Back
        const backGeometry = new THREE.BoxGeometry(1, 1.2, 0.2);
        const back = new THREE.Mesh(backGeometry, this.materials.wood);
        back.position.set(0, 0.85, -0.4);
        chair.add(back);

        // Arms
        const armGeometry = new THREE.BoxGeometry(0.2, 0.4, 1);
        const leftArm = new THREE.Mesh(armGeometry, this.materials.wood);
        leftArm.position.set(-0.4, 0.45, 0);
        chair.add(leftArm);

        const rightArm = new THREE.Mesh(armGeometry, this.materials.wood);
        rightArm.position.set(0.4, 0.45, 0);
        chair.add(rightArm);

        return chair;
    }

    createReadingTable() {
        const table = new THREE.Group();

        // Table top
        const topGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.05, 16);
        const top = new THREE.Mesh(topGeometry, this.materials.wood);
        top.position.y = 0.6;
        table.add(top);

        // Leg
        const legGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8);
        const leg = new THREE.Mesh(legGeometry, this.materials.wood);
        leg.position.y = 0.3;
        table.add(leg);

        // Base
        const baseGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.05, 16);
        const base = new THREE.Mesh(baseGeometry, this.materials.wood);
        base.position.y = 0.025;
        table.add(base);

        return table;
    }

    createReadingLamp() {
        const lamp = new THREE.Group();

        // Base
        const baseGeometry = new THREE.CylinderGeometry(0.1, 0.15, 0.05, 8);
        const base = new THREE.Mesh(baseGeometry, this.materials.metal);
        lamp.add(base);

        // Stem
        const stemGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8);
        const stem = new THREE.Mesh(stemGeometry, this.materials.metal);
        stem.position.y = 0.2;
        lamp.add(stem);

        // Shade
        const shadeGeometry = new THREE.ConeGeometry(0.2, 0.3, 16, 1, true);
        const shade = new THREE.Mesh(shadeGeometry, this.materials.metal);
        shade.position.y = 0.4;
        lamp.add(shade);

        // Light
        const light = new THREE.PointLight(0xffffcc, 0.5, 3);
        light.position.y = 0.4;
        lamp.add(light);

        return lamp;
    }

    addClues(room) {
        // Add torn page
        const pageGeometry = new THREE.PlaneGeometry(0.2, 0.3);
        const pageMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffcc,
            side: THREE.DoubleSide
        });
        const tornPage = new THREE.Mesh(pageGeometry, pageMaterial);
        tornPage.position.set(-1.5, 0.62, -1.5);
        tornPage.rotation.x = -Math.PI / 2;
        tornPage.userData.name = "torn_page";
        tornPage.userData.type = "clue";
        tornPage.userData.interactive = true;
        room.add(tornPage);

        // Add strange letter
        const letterGeometry = new THREE.PlaneGeometry(0.2, 0.3);
        const letterMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide
        });
        const strangeLetter = new THREE.Mesh(letterGeometry, letterMaterial);
        strangeLetter.position.set(1.5, 0.01, -1);
        strangeLetter.rotation.x = -Math.PI / 2;
        strangeLetter.userData.name = "strange_letter";
        strangeLetter.userData.type = "clue";
        strangeLetter.userData.interactive = true;
        room.add(strangeLetter);
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
} 