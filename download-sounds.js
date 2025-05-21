const https = require('https');
const fs = require('fs');
const path = require('path');

// Using different sound sources that are freely available
const sounds = {
    'footstep': 'https://cdn.freesound.org/previews/268/268557_5121236-lq.mp3',
    'ambient': 'https://cdn.freesound.org/previews/419/419932_7836862-lq.mp3',
    'door': 'https://cdn.freesound.org/previews/444/444739_9159316-lq.mp3',
    'pickup': 'https://cdn.freesound.org/previews/320/320181_5260872-lq.mp3'
};

function downloadSound(name, url) {
    return new Promise((resolve, reject) => {
        const targetPath = path.join(__dirname, 'public', 'sounds', `${name}.mp3`);
        
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        };

        const request = https.get(url, options, (response) => {
            if (response.statusCode === 200) {
                const file = fs.createWriteStream(targetPath);
                response.pipe(file);
                
                file.on('finish', () => {
                    file.close();
                    console.log(`Successfully downloaded ${name}.mp3`);
                    resolve();
                });

                file.on('error', (err) => {
                    fs.unlink(targetPath, () => {
                        reject(new Error(`Error writing ${name}.mp3: ${err.message}`));
                    });
                });
            } else if (response.statusCode === 302 || response.statusCode === 301) {
                // Handle redirects
                console.log(`Following redirect for ${name}.mp3...`);
                downloadSound(name, response.headers.location).then(resolve).catch(reject);
            } else {
                reject(new Error(`Failed to download ${name}.mp3: HTTP ${response.statusCode}`));
            }
        });

        request.on('error', (err) => {
            reject(new Error(`Network error downloading ${name}.mp3: ${err.message}`));
        });

        // Set a timeout
        request.setTimeout(10000, () => {
            request.destroy();
            reject(new Error(`Timeout downloading ${name}.mp3`));
        });
    });
}

// Create sounds directory if it doesn't exist
const soundsDir = path.join(__dirname, 'public', 'sounds');
if (!fs.existsSync(soundsDir)) {
    fs.mkdirSync(soundsDir, { recursive: true });
}

// Download all sounds with proper error handling
async function downloadAllSounds() {
    for (const [name, url] of Object.entries(sounds)) {
        try {
            console.log(`Downloading ${name}.mp3...`);
            await downloadSound(name, url);
        } catch (error) {
            console.error(`Error downloading ${name}.mp3:`, error.message);
            
            // If the download fails, create a silent audio file as fallback
            const fallbackPath = path.join(__dirname, 'public', 'sounds', `${name}.mp3`);
            try {
                // Copy a minimal valid MP3 file (essentially silence)
                const silentMp3 = Buffer.from([
                    0xFF, 0xFB, 0x30, 0xC0, 0x00, 0x00, 0x00, 0x00,
                    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
                ]);
                fs.writeFileSync(fallbackPath, silentMp3);
                console.log(`Created fallback silent audio for ${name}.mp3`);
            } catch (fallbackError) {
                console.error(`Failed to create fallback for ${name}.mp3:`, fallbackError.message);
            }
        }
    }
    console.log('Sound download process completed.');
}

// Run the download process
downloadAllSounds(); 