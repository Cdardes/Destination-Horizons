import * as THREE from 'three';
import { RoomBuilder } from '../RoomBuilder';

export class LibraryRoom extends RoomBuilder {
    constructor() {
        super();
        this.bookColors = [
            0x8B4513, // Brown
            0x800000, // Maroon
            0x556B2F, // Dark Olive Green
            0x191970, // Midnight Blue
            0x4B0082, // Indigo
        ];
    }

    createRoom() {
        const room = super.createRoom('library');
        this.addBookshelves(room);
        this.addReadingArea(room);
        this.addFireplace(room);
        this.addClues(room);
        return room;
    }

    addBookshelves(room) {
        // Add bookshelves along the walls
        const shelfPositions = [
            { x: -4.5, z: -4.5, rotation: 0 },
            { x: 4.5, z: -4.5, rotation: 0 },
            { x: -4.5, z: 4.5, rotation: Math.PI },
            { x: 4.5, z: 4.5, rotation: Math.PI },
        ];

        shelfPositions.forEach(pos => {
            const bookshelf = this.createBookshelf();
            bookshelf.position.set(pos.x, 0, pos.z);
            bookshelf.rotation.y = pos.rotation;
            room.add(bookshelf);
        });
    }

    createBookshelf() {
        const shelf = new THREE.Group();
        
        // Create the bookshelf structure
        const shelfGeometry = new THREE.BoxGeometry(3, 4, 0.5);
        const shelfMesh = new THREE.Mesh(shelfGeometry, this.materials.wood);
        shelf.add(shelfMesh);

        // Add books
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 8; col++) {
                const book = this.createBook();
                book.position.set(
                    -1.2 + col * 0.3,
                    0.3 + row * 1,
                    0.3
                );
                shelf.add(book);
            }
        }

        return shelf;
    }

    createBook() {
        const bookGeometry = new THREE.BoxGeometry(0.2, 0.8, 0.3);
        const bookMaterial = new THREE.MeshStandardMaterial({
            color: this.bookColors[Math.floor(Math.random() * this.bookColors.length)],
            roughness: 0.8,
            metalness: 0.1
        });
        return new THREE.Mesh(bookGeometry, bookMaterial);
    }

    addReadingArea(room) {
        // Add armchair
        const armchair = this.createArmchair();
        armchair.position.set(0, 0, 0);
        armchair.rotation.y = Math.PI / 4;
        room.add(armchair);

        // Add reading table
        const table = this.createReadingTable();
        table.position.set(1, 0, 1);
        room.add(table);

        // Add reading lamp
        const lamp = this.createReadingLamp();
        lamp.position.set(1, 0.8, 1);
        room.add(lamp);
    }

    createArmchair() {
        const chair = new THREE.Group();

        // Base
        const baseGeometry = new THREE.BoxGeometry(1.2, 0.5, 1.2);
        const base = new THREE.Mesh(baseGeometry, this.materials.wood);
        chair.add(base);

        // Backrest
        const backGeometry = new THREE.BoxGeometry(1.2, 1.2, 0.3);
        const back = new THREE.Mesh(backGeometry, this.materials.wood);
        back.position.set(0, 0.85, -0.45);
        chair.add(back);

        return chair;
    }

    createReadingTable() {
        const table = new THREE.Group();

        // Table top
        const topGeometry = new THREE.BoxGeometry(0.8, 0.05, 0.8);
        const top = new THREE.Mesh(topGeometry, this.materials.wood);
        top.position.y = 0.6;
        table.add(top);

        // Table leg
        const legGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.6);
        const leg = new THREE.Mesh(legGeometry, this.materials.wood);
        leg.position.y = 0.3;
        table.add(leg);

        return table;
    }

    createReadingLamp() {
        const lamp = new THREE.Group();

        // Base
        const baseGeometry = new THREE.CylinderGeometry(0.1, 0.15, 0.05);
        const base = new THREE.Mesh(baseGeometry, this.materials.metal);
        lamp.add(base);

        // Stem
        const stemGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.4);
        const stem = new THREE.Mesh(stemGeometry, this.materials.metal);
        stem.position.y = 0.2;
        lamp.add(stem);

        // Lampshade
        const shadeGeometry = new THREE.ConeGeometry(0.2, 0.3, 32);
        const shade = new THREE.Mesh(shadeGeometry, this.materials.metal);
        shade.position.y = 0.4;
        lamp.add(shade);

        // Add light
        const light = new THREE.PointLight(0xffaa44, 0.5, 3);
        light.position.y = 0.4;
        lamp.add(light);

        return lamp;
    }

    addFireplace(room) {
        const fireplace = this.createFireplace();
        fireplace.position.set(0, 0, -4.5);
        room.add(fireplace);
    }

    createFireplace() {
        const fireplace = new THREE.Group();

        // Main structure
        const mainGeometry = new THREE.BoxGeometry(2, 2, 0.5);
        const main = new THREE.Mesh(mainGeometry, this.materials.wood);
        fireplace.add(main);

        // Inner part (where fire would be)
        const innerGeometry = new THREE.BoxGeometry(1.5, 1.2, 0.3);
        const innerMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
        const inner = new THREE.Mesh(innerGeometry, innerMaterial);
        inner.position.z = 0.1;
        fireplace.add(inner);

        // Add flickering light
        const fireLight = new THREE.PointLight(0xff4400, 1, 5);
        fireLight.position.set(0, 0.5, 0.2);
        fireplace.add(fireLight);

        // Animate the light
        const animate = () => {
            fireLight.intensity = 0.8 + Math.random() * 0.4;
            requestAnimationFrame(animate);
        };
        animate();

        return fireplace;
    }

    addClues(room) {
        // Add torn page
        const tornPage = this.createInteractiveObject(
            new THREE.PlaneGeometry(0.2, 0.3),
            new THREE.MeshBasicMaterial({ color: 0xffffcc }),
            new THREE.Vector3(1.1, 0.62, 1.1),
            "torn_page",
            "clue"
        );
        tornPage.rotation.x = -Math.PI / 2;
        room.add(tornPage);

        // Add strange letter
        const strangeLetter = this.createInteractiveObject(
            new THREE.PlaneGeometry(0.2, 0.3),
            new THREE.MeshBasicMaterial({ color: 0xffffee }),
            new THREE.Vector3(0.9, 0.62, 0.9),
            "strange_letter",
            "clue"
        );
        strangeLetter.rotation.x = -Math.PI / 2;
        room.add(strangeLetter);
    }
} 