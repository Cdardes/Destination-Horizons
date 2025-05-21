export async function generateSoundFiles(): Promise<void> {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Generate footstep sound
    const footstepBuffer = await generateFootstepSound(audioContext);
    saveAudioBuffer('footstep', footstepBuffer);

    // Generate ambient sound
    const ambientBuffer = await generateAmbientSound(audioContext);
    saveAudioBuffer('ambient', ambientBuffer);

    // Generate door sound
    const doorBuffer = await generateDoorSound(audioContext);
    saveAudioBuffer('door', doorBuffer);

    // Generate pickup sound
    const pickupBuffer = await generatePickupSound(audioContext);
    saveAudioBuffer('pickup', pickupBuffer);
}

async function generateFootstepSound(ctx: AudioContext): Promise<AudioBuffer> {
    const duration = 0.15;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < buffer.length; i++) {
        // Create a dampened sine wave with some noise
        const t = i / ctx.sampleRate;
        const decay = Math.exp(-t * 30);
        const noise = Math.random() * 0.2;
        data[i] = decay * (Math.sin(t * 400) + noise);
    }
    
    return buffer;
}

async function generateAmbientSound(ctx: AudioContext): Promise<AudioBuffer> {
    const duration = 10.0;
    const buffer = ctx.createBuffer(2, ctx.sampleRate * duration, ctx.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel);
        
        for (let i = 0; i < buffer.length; i++) {
            const t = i / ctx.sampleRate;
            // Create a subtle wind-like sound
            const wind = Math.sin(t * 0.5) * 0.3;
            const noise = Math.random() * 0.05;
            data[i] = (wind + noise) * 0.3;
        }
    }
    
    return buffer;
}

async function generateDoorSound(ctx: AudioContext): Promise<AudioBuffer> {
    const duration = 0.5;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < buffer.length; i++) {
        const t = i / ctx.sampleRate;
        // Create a creaking door sound
        const creak = Math.sin(t * 100 + Math.sin(t * 4) * 20);
        const decay = Math.exp(-t * 8);
        data[i] = creak * decay * 0.5;
    }
    
    return buffer;
}

async function generatePickupSound(ctx: AudioContext): Promise<AudioBuffer> {
    const duration = 0.2;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < buffer.length; i++) {
        const t = i / ctx.sampleRate;
        // Create a short ascending tone
        const tone = Math.sin(t * (440 + t * 1000));
        const decay = Math.exp(-t * 20);
        data[i] = tone * decay * 0.5;
    }
    
    return buffer;
}

function saveAudioBuffer(name: string, buffer: AudioBuffer): void {
    // Convert AudioBuffer to WAV format
    const numberOfChannels = buffer.numberOfChannels;
    const length = buffer.length * numberOfChannels * 2;
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);

    // Write WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, length, true);

    // Write audio data
    const offset = 44;
    for (let i = 0; i < buffer.length; i++) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
            const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
            view.setInt16(offset + (i * numberOfChannels + channel) * 2, sample * 0x7FFF, true);
        }
    }

    // Create Blob and download
    const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.wav`;
    a.click();
    URL.revokeObjectURL(url);
}

function writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
} 