import * as THREE from 'three';
import { RoomBuilder } from '../RoomBuilder';

export class EntranceHall extends RoomBuilder {
    constructor() {
        super();
    }

    createRoom() {
        const room = super.createRoom('entrance_hall');
        this.addChandelier(room);
        this.addConsoleTable(room);
        this.addClues(room);
        return room;
    }

    addChandelier(room) {
        const chandelier = this.createChandelier();
        chandelier.position.set(0, 3.5, 0);
        room.add(chandelier);
    }

    addConsoleTable(room) {
        const table = new THREE.Group();

        // Table top
        const topGeometry = new THREE.BoxGeometry(2, 0.1, 0.8);
        const top = new THREE.Mesh(topGeometry, this.materials.wood);
        top.position.y = 0.9;
        table.add(top);

        // Table legs
        const legGeometry = new THREE.BoxGeometry(0.1, 0.9, 0.1);
        const legMaterial = this.materials.wood;

        const positions = [
            [-0.9, 0.45, 0.3],
            [0.9, 0.45, 0.3],
            [-0.9, 0.45, -0.3],
            [0.9, 0.45, -0.3]
        ];

        positions.forEach(pos => {
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            leg.position.set(...pos);
            table.add(leg);
        });

        // Add decorative vase
        const vase = this.createVase();
        vase.position.set(0, 1, 0);
        table.add(vase);

        table.position.set(0, 0, -4);
        room.add(table);
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
        // Add muddy footprint
        const footprint = this.createInteractiveObject(
            new THREE.PlaneGeometry(0.3, 0.6),
            new THREE.MeshBasicMaterial({ 
                color: 0x4a3c2a,
                transparent: true,
                opacity: 0.7
            }),
            new THREE.Vector3(-1, 0.01, 0),
            "muddy_footprint",
            "clue"
        );
        footprint.rotation.x = -Math.PI / 2;
        footprint.rotation.z = Math.PI / 6;
        room.add(footprint);
    }
} 