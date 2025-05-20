import * as THREE from 'three';

export class ParticleSystem {
    constructor() {
        this.systems = new Map();
    }

    createDustParticles(count = 1000) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);
        
        for (let i = 0; i < count * 3; i += 3) {
            // Random position within a 10x4x10 box
            positions[i] = (Math.random() - 0.5) * 10;
            positions[i + 1] = Math.random() * 4;
            positions[i + 2] = (Math.random() - 0.5) * 10;
            
            // Random slow-falling velocity
            velocities[i] = (Math.random() - 0.5) * 0.01;
            velocities[i + 1] = -0.01 * Math.random();
            velocities[i + 2] = (Math.random() - 0.5) * 0.01;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        
        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.05,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending
        });
        
        const particles = new THREE.Points(geometry, material);
        this.systems.set('dust', {
            mesh: particles,
            type: 'dust',
            count: count
        });
        
        return particles;
    }

    createRainParticles(count = 1000) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);
        
        for (let i = 0; i < count * 3; i += 3) {
            // Random position above the scene
            positions[i] = (Math.random() - 0.5) * 20;
            positions[i + 1] = 10 + Math.random() * 5;
            positions[i + 2] = (Math.random() - 0.5) * 20;
            
            // Downward velocity
            velocities[i] = 0;
            velocities[i + 1] = -0.2 - Math.random() * 0.1;
            velocities[i + 2] = 0;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        
        const material = new THREE.PointsMaterial({
            color: 0x88ccff,
            size: 0.1,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        
        const particles = new THREE.Points(geometry, material);
        this.systems.set('rain', {
            mesh: particles,
            type: 'rain',
            count: count
        });
        
        return particles;
    }

    createSmokeParticles(position, count = 100) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);
        const lifetimes = new Float32Array(count);
        
        for (let i = 0; i < count * 3; i += 3) {
            // Start at the given position with small random offset
            positions[i] = position.x + (Math.random() - 0.5) * 0.1;
            positions[i + 1] = position.y;
            positions[i + 2] = position.z + (Math.random() - 0.5) * 0.1;
            
            // Upward and outward velocity
            velocities[i] = (Math.random() - 0.5) * 0.02;
            velocities[i + 1] = 0.05 + Math.random() * 0.05;
            velocities[i + 2] = (Math.random() - 0.5) * 0.02;
            
            // Random lifetime
            lifetimes[Math.floor(i / 3)] = Math.random();
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
        
        const material = new THREE.PointsMaterial({
            color: 0x888888,
            size: 0.2,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending
        });
        
        const particles = new THREE.Points(geometry, material);
        const systemId = `smoke_${Date.now()}`;
        this.systems.set(systemId, {
            mesh: particles,
            type: 'smoke',
            count: count,
            position: position.clone()
        });
        
        return particles;
    }

    update() {
        this.systems.forEach((system, id) => {
            const positions = system.mesh.geometry.attributes.position;
            const velocities = system.mesh.geometry.attributes.velocity;
            
            switch (system.type) {
                case 'dust':
                    this.updateDustParticles(positions, velocities);
                    break;
                case 'rain':
                    this.updateRainParticles(positions, velocities);
                    break;
                case 'smoke':
                    const lifetimes = system.mesh.geometry.attributes.lifetime;
                    this.updateSmokeParticles(positions, velocities, lifetimes, system.position);
                    break;
            }
            
            positions.needsUpdate = true;
        });
    }

    updateDustParticles(positions, velocities) {
        for (let i = 0; i < positions.count; i++) {
            positions.array[i * 3] += velocities.array[i * 3];
            positions.array[i * 3 + 1] += velocities.array[i * 3 + 1];
            positions.array[i * 3 + 2] += velocities.array[i * 3 + 2];
            
            // Reset particles that fall below the floor
            if (positions.array[i * 3 + 1] < 0) {
                positions.array[i * 3 + 1] = 4;
            }
        }
    }

    updateRainParticles(positions, velocities) {
        for (let i = 0; i < positions.count; i++) {
            positions.array[i * 3] += velocities.array[i * 3];
            positions.array[i * 3 + 1] += velocities.array[i * 3 + 1];
            positions.array[i * 3 + 2] += velocities.array[i * 3 + 2];
            
            // Reset particles that fall below the ground
            if (positions.array[i * 3 + 1] < 0) {
                positions.array[i * 3] = (Math.random() - 0.5) * 20;
                positions.array[i * 3 + 1] = 15;
                positions.array[i * 3 + 2] = (Math.random() - 0.5) * 20;
            }
        }
    }

    updateSmokeParticles(positions, velocities, lifetimes, origin) {
        for (let i = 0; i < positions.count; i++) {
            lifetimes.array[i] += 0.01;
            
            if (lifetimes.array[i] > 1) {
                // Reset particle
                positions.array[i * 3] = origin.x + (Math.random() - 0.5) * 0.1;
                positions.array[i * 3 + 1] = origin.y;
                positions.array[i * 3 + 2] = origin.z + (Math.random() - 0.5) * 0.1;
                lifetimes.array[i] = 0;
            } else {
                positions.array[i * 3] += velocities.array[i * 3];
                positions.array[i * 3 + 1] += velocities.array[i * 3 + 1];
                positions.array[i * 3 + 2] += velocities.array[i * 3 + 2];
            }
        }
        lifetimes.needsUpdate = true;
    }

    removeSystem(id) {
        const system = this.systems.get(id);
        if (system) {
            system.mesh.geometry.dispose();
            system.mesh.material.dispose();
            this.systems.delete(id);
        }
    }
} 