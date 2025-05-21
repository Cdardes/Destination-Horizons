import { Audio, AudioListener, AudioLoader } from 'three';

export class SoundManager {
    private listener: AudioListener;
    private audioLoader: AudioLoader;
    private sounds: Map<string, Audio>;
    private footstepTimeout: number | null = null;
    private isWalking: boolean = false;

    constructor(listener: AudioListener) {
        this.listener = listener;
        this.audioLoader = new AudioLoader();
        this.sounds = new Map();

        // Initialize sounds
        this.loadSound('footstep', '/sounds/footstep.mp3');
        this.loadSound('ambient', '/sounds/ambient.mp3');
        this.loadSound('door', '/sounds/door.mp3');
        this.loadSound('pickup', '/sounds/pickup.mp3');
    }

    private loadSound(name: string, url: string): void {
        const sound = new Audio(this.listener);
        
        this.audioLoader.load(url, (buffer) => {
            sound.setBuffer(buffer);
            sound.setLoop(name === 'ambient');
            sound.setVolume(name === 'ambient' ? 0.3 : 0.5);
            this.sounds.set(name, sound);

            // Start ambient sound immediately
            if (name === 'ambient') {
                sound.play();
            }
        }, 
        undefined,
        (error) => {
            console.warn(`Error loading sound ${name}:`, error);
        });
    }

    public playFootsteps(isWalking: boolean): void {
        this.isWalking = isWalking;
        
        if (isWalking && !this.footstepTimeout) {
            const playStep = () => {
                const footstep = this.sounds.get('footstep');
                if (footstep && this.isWalking) {
                    footstep.play();
                    // Random slight variation in footstep timing
                    this.footstepTimeout = window.setTimeout(playStep, 450 + Math.random() * 50);
                } else {
                    this.footstepTimeout = null;
                }
            };
            playStep();
        } else if (!isWalking) {
            if (this.footstepTimeout) {
                clearTimeout(this.footstepTimeout);
                this.footstepTimeout = null;
            }
        }
    }

    public playSound(name: string): void {
        const sound = this.sounds.get(name);
        if (sound && !sound.isPlaying) {
            sound.play();
        }
    }

    public stopSound(name: string): void {
        const sound = this.sounds.get(name);
        if (sound && sound.isPlaying) {
            sound.stop();
        }
    }

    public setVolume(name: string, volume: number): void {
        const sound = this.sounds.get(name);
        if (sound) {
            sound.setVolume(Math.max(0, Math.min(1, volume)));
        }
    }

    public stopAll(): void {
        this.sounds.forEach(sound => {
            if (sound.isPlaying) {
                sound.stop();
            }
        });
    }
} 