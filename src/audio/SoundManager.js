export class SoundManager {
    constructor() {
        this.sounds = {};
        this.music = null;
        this.currentMusic = null;
        this.volume = 0.5;
        this.musicVolume = 0.3;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        // Create audio context
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();

        // Load all sounds
        await Promise.all([
            this.loadSound('footstep', '/audio/footstep.mp3'),
            this.loadSound('door', '/audio/door.mp3'),
            this.loadSound('pickup', '/audio/pickup.mp3'),
            this.loadSound('ambient', '/audio/ambient.mp3'),
            this.loadSound('thunder', '/audio/thunder.mp3'),
            this.loadSound('creak', '/audio/creak.mp3'),
            this.loadSound('success', '/audio/success.mp3'),
            this.loadSound('fail', '/audio/fail.mp3')
        ]);

        this.initialized = true;
    }

    async loadSound(name, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.sounds[name] = audioBuffer;
        } catch (error) {
            console.warn(`Failed to load sound: ${name}`, error);
        }
    }

    playSound(name, options = {}) {
        if (!this.initialized || !this.sounds[name]) return;

        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        
        source.buffer = this.sounds[name];
        gainNode.gain.value = options.volume || this.volume;

        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        if (options.loop) {
            source.loop = true;
        }

        source.start(0);
        return source;
    }

    playMusic(name) {
        if (this.currentMusic === name) return;
        
        if (this.music) {
            this.music.stop();
        }

        this.music = this.playSound(name, { loop: true, volume: this.musicVolume });
        this.currentMusic = name;
    }

    stopMusic() {
        if (this.music) {
            this.music.stop();
            this.music = null;
            this.currentMusic = null;
        }
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }

    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.music) {
            this.music.gain.value = this.musicVolume;
        }
    }
} 