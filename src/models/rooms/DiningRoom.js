import * as THREE from 'three';
import { RoomBuilder } from '../RoomBuilder';

export class DiningRoom extends RoomBuilder {
    constructor() {
        super();
    }

    createRoom() {
        const room = super.createRoom('dining_room');
        this.addDiningTable(room);
        this.addSideboards(room);
        this.addChandelier(room);
        this.addClues(room);
        return room;
    }

    addDiningTable(room) {
        const table = new THREE.Group();

        // Table top
        const topGeometry = new THREE.BoxGeometry(4, 0.1, 2);
        const top = new THREE.Mesh(topGeometry, this.materials.wood);
        top.position.y = 0.9;
        table.add(top);

        // Table legs
        const legGeometry = new THREE.BoxGeometry(0.1, 0.9, 0.1);
        const positions = [
            [-1.9, 0.45, 0.9],
            [1.9, 0.45, 0.9],
            [-1.9, 0.45, -0.9],
            [1.9, 0.45, -0.9]
        ];

        positions.forEach(pos => {
            const leg = new THREE.Mesh(legGeometry, this.materials.wood);
            leg.position.set(...pos);
            table.add(leg);
        });

        // Add chairs
        for (let x = -1.5; x <= 1.5; x += 1) {
            for (let z = -1.2; z <= 1.2; z += 2.4) {
                const chair = this.createChair();
                chair.position.set(x, 0, z);
                chair.rotation.y = z > 0 ? Math.PI : 0;
                table.add(chair);
            }
        }

        table.position.set(0, 0, 0);
        room.add(table);
    }

    createChair() {
        const chair = new THREE.Group();

        // Seat
        const seatGeometry = new THREE.BoxGeometry(0.5, 0.1, 0.5);
        const seat = new THREE.Mesh(seatGeometry, this.materials.wood);
        seat.position.y = 0.5;
        chair.add(seat);

        // Back
        const backGeometry = new THREE.BoxGeometry(0.5, 0.8, 0.1);
        const back = new THREE.Mesh(backGeometry, this.materials.wood);
        back.position.set(0, 0.9, -0.2);
        chair.add(back);

        // Legs
        const legGeometry = new THREE.BoxGeometry(0.05, 0.5, 0.05);
        const positions = [
            [0.2, 0.25, 0.2],
            [-0.2, 0.25, 0.2],
            [0.2, 0.25, -0.2],
            [-0.2, 0.25, -0.2]
        ];

        positions.forEach(pos => {
            const leg = new THREE.Mesh(legGeometry, this.materials.wood);
            leg.position.set(...pos);
            chair.add(leg);
        });

        return chair;
    }

    addSideboards(room) {
        // Add sideboards along the walls
        const sideboard1 = this.createSideboard();
        sideboard1.position.set(-4, 0, -4);
        room.add(sideboard1);

        const sideboard2 = this.createSideboard();
        sideboard2.position.set(4, 0, -4);
        room.add(sideboard2);
    }

    createSideboard() {
        const sideboard = new THREE.Group();

        // Main body
        const bodyGeometry = new THREE.BoxGeometry(2, 1, 0.6);
        const body = new THREE.Mesh(bodyGeometry, this.materials.wood);
        body.position.y = 0.5;
        sideboard.add(body);

        // Add decorative items (vase, plates, etc.)
        const vase = this.createVase();
        vase.position.set(0, 1.1, 0);
        vase.scale.set(0.7, 0.7, 0.7);
        sideboard.add(vase);

        return sideboard;
    }

    createVase() {
        const vase = new THREE.Group();

        // Vase body
        const bodyGeometry = new THREE.CylinderGeometry(0.15, 0.1, 0.4, 16);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x4169e1,
            metalness: 0.3,
            roughness: 0.2
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        vase.add(body);

        // Vase neck
        const neckGeometry = new THREE.CylinderGeometry(0.08, 0.15, 0.2, 16);
        const neck = new THREE.Mesh(neckGeometry, bodyMaterial);
        neck.position.y = 0.3;
        vase.add(neck);

        return vase;
    }

    addClues(room) {
        // Add wine glass
        const wineGlass = this.createInteractiveObject(
            new THREE.CylinderGeometry(0.1, 0.1, 0.3, 16),
            new THREE.MeshPhysicalMaterial({
                color: 0xffffff,
                transmission: 0.9,
                opacity: 0.3,
                metalness: 0,
                roughness: 0,
                ior: 1.5,
                transparent: true
            }),
            new THREE.Vector3(-0.5, 0.95, 0),
            "wine_glass",
            "clue"
        );
        room.add(wineGlass);

        // Add napkin note
        const napkinNote = this.createInteractiveObject(
            new THREE.PlaneGeometry(0.2, 0.2),
            new THREE.MeshBasicMaterial({ color: 0xffffee }),
            new THREE.Vector3(0.5, 0.95, 0),
            "napkin_note",
            "clue"
        );
        napkinNote.rotation.x = -Math.PI / 2;
        room.add(napkinNote);
    }
} 