/**
 * Arcade-Quality Sound Manager
 * Optimized for authentic arcade sound reproduction
 * Uses Web Audio API with arcade-specific enhancements
 */
class SoundManager {
    audioContext = null;
    masterGain = null;
    path = "sound/";
    
    // Looping sounds
    frightAudio = null;
    frightSource = null;
    frightBuffer = null;
    eyesAudio = null;
    eyesSource = null;
    eyesBuffer = null;
    sirenAudio = null;
    sirenSource = null;
    sirenBuffer = null;
    sirenIndex = 0;
    
    // One-shot sounds
    sounds = [];
    soundBuffers = [];
    sirenSounds = [];
    sirenBuffers = [];
    listSound = {};
    listSoundBuffers = {};
    
    // State
    isDemo = false;
    isLoaded = false;
    wakaIndex = 0;
    
    // Arcade audio settings
    sampleRate = 44100; // CD quality for best resampling
    arcadeVolume = 0.8; // Arcade machines weren't at full volume

    constructor() {
        // Initialize Web Audio API with optimal settings
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: this.sampleRate
            });
            
            // Create master gain node for volume control
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.arcadeVolume;
            this.masterGain.connect(this.audioContext.destination);
        } catch (e) {
            console.warn('Web Audio API not supported, falling back to HTML5 Audio');
            this.audioContext = null;
        }
        
        this.loadSoundsAsync();
    }

    /**
     * Decode audio file into AudioBuffer for Web Audio API
     * @param {string} src - Path to audio file
     * @returns {Promise<AudioBuffer|null>}
     */
    async loadAudioBuffer(src) {
        if (!this.audioContext) return null;
        
        try {
            const response = await fetch(src);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            return audioBuffer;
        } catch (e) {
            console.warn(`Failed to load audio buffer: ${src}`, e);
            return null;
        }
    }

    /**
     * Play an AudioBuffer with looping (arcade-quality)
     * @param {AudioBuffer} buffer - Audio buffer to play
     * @param {boolean} loop - Whether to loop
     * @returns {Object} Source info
     */
    playBuffer(buffer, loop = false) {
        if (!this.audioContext || !buffer) return null;
        
        // CRITICAL: Resume context if suspended (Chrome autoplay policy)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(() => {});
        }
        
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = loop;
        
        // Set explicit loop points for arcade-perfect looping
        if (loop) {
            source.loopStart = 0;
            source.loopEnd = buffer.duration;
        }
        
        // Connect through master gain for consistent volume
        source.connect(this.masterGain);
        source.start(0);
        
        return { source, loop };
    }

    /**
     * Stop an AudioBufferSourceNode
     * @param {Object} audioData - Source object from playBuffer
     */
    stopBuffer(audioData) {
        if (!audioData) return;
        
        const source = audioData.source || audioData;
        
        if (source) {
            try {
                source.stop();
                source.disconnect();
            } catch (e) {
                // Source already stopped or disconnected
            }
        }
    }

    setDemoMode(value) {
        this.isDemo = value;
        if (value) {
            this.stopSiren();
            this.stopFright();
            this.stopEyes();
        }
    }

    async loadSoundsAsync() {
        const isMsPacman = CONFIG.pacman.type === 'mspacman';

        // Create HTML5 Audio fallback for non-looping sounds
        const createAudio = (src) => {
            const audio = document.createElement('audio');
            audio.src = src;
            audio.preload = 'auto';
            return audio;
        };

        // Load waka sounds
        if (isMsPacman) {
            this.sounds = [
                createAudio(this.path+'mspacman/ms_eat_dot.wav'),
                createAudio(this.path+'mspacman/ms_eat_dot.wav')
            ];
        } else {
            this.sounds = [
                createAudio(this.path+'eat_dot_0.wav'),
                createAudio(this.path+'eat_dot_1.wav')
            ];
        }

        // Load one-shot sounds
        this.listSound = {
            credit: createAudio(this.path+"credit.wav"),
            eatGhost: createAudio(isMsPacman ? this.path+"mspacman/ms_eat_ghost.wav" : this.path+"eat_ghost.wav"),
            start: createAudio(isMsPacman ? this.path+"mspacman/ms_start.wav" : this.path+"start.wav")
        };

        // Load looping sounds with Web Audio API for arcade quality
        if (this.audioContext) {
            // Load siren sounds
            const sirenFiles = isMsPacman ? 
                ['mspacman/ms_siren1.wav', 'mspacman/ms_siren2.wav', 'mspacman/ms_siren3.wav', 'mspacman/ms_siren4.wav'] :
                ['siren1.wav', 'siren2.wav', 'siren3.wav', 'siren4.wav'];
            
            this.sirenSounds = sirenFiles.map(file => createAudio(this.path + file));
            
            // Load buffers for looping sounds
            this.sirenBuffers = await Promise.all(
                sirenFiles.map(file => this.loadAudioBuffer(this.path + file))
            );
            
            this.frightBuffer = await this.loadAudioBuffer(this.path + "fright.wav");
            
            const eyesFile = isMsPacman ? "mspacman/ms_eyes.wav" : "eyes.wav";
            this.eyesBuffer = await this.loadAudioBuffer(this.path + eyesFile);
        } else {
            // Fallback to HTML5 Audio
            const sirenFiles = isMsPacman ? 
                ['mspacman/ms_siren1.wav', 'mspacman/ms_siren2.wav', 'mspacman/ms_siren3.wav', 'mspacman/ms_siren4.wav'] :
                ['siren1.wav', 'siren2.wav', 'siren3.wav', 'siren4.wav'];
            
            this.sirenSounds = sirenFiles.map(file => createAudio(this.path + file));
        }

        this.isLoaded = true;
    }

    index = 0;

    /**
     * Play a one-shot sound effect
     * @param {string} theme - Sound name to play
     */
    play(theme = null) {
        if (this.isDemo || !this.isLoaded) return;

        switch(theme) {
            case "credit":
                this.listSound.credit.currentTime = 0;
                this.listSound.credit.play().catch(() => {});
                break;
            case "eat-ghost":
                this.listSound.eatGhost.currentTime = 0;
                this.listSound.eatGhost.play().catch(() => {});
                break;
            case "start":
                this.listSound.start.currentTime = 0;
                this.listSound.start.play().catch(() => {});
                break;
        }
    }

    /**
     * Play waka sound (alternating between two sounds)
     * Arcade: waka alternates between two tones
     */
    playWaka() {
        if (this.isDemo || !this.isLoaded) return;

        const audio = this.sounds[this.index];
        audio.currentTime = 0;
        audio.play().catch(() => {});

        this.index = (this.index + 1) % this.sounds.length;
    }

    /**
     * Play frightened mode audio (looping)
     * Arcade: distinctive high-pitched loop when ghosts are vulnerable
     */
    playFright() {
        if (this.isDemo || !this.isLoaded) return;

        // Stop any existing fright audio first
        this.stopFright();

        // Use Web Audio API for arcade-quality looping
        if (this.audioContext && this.frightBuffer) {
            this.frightAudio = this.playBuffer(this.frightBuffer, true);
        } else {
            // Fallback to HTML5 Audio
            this.frightAudio = document.createElement('audio');
            this.frightAudio.src = this.path + "fright.wav";
            this.frightAudio.loop = true;
            this.frightAudio.play().catch(() => {});
        }
    }

    /**
     * Stop frightened audio
     */
    stopFright() {
        if (this.frightAudio) {
            if (this.audioContext && this.frightAudio.source) {
                this.stopBuffer(this.frightAudio);
                this.frightAudio = null;
            } else {
                this.frightAudio.pause();
                this.frightAudio = null;
            }
        }
        this.stopEyes();
    }

    /**
     * Play eyes audio (looping)
     * Arcade: plays when ghosts are eaten and only eyes return
     */
    playEyes() {
        if (this.isDemo || !this.isLoaded) return;

        this.stopEyes();

        if (this.audioContext && this.eyesBuffer) {
            this.eyesAudio = this.playBuffer(this.eyesBuffer, true);
        } else {
            const isMsPacman = CONFIG.pacman.type === 'mspacman';
            this.eyesAudio = document.createElement('audio');
            this.eyesAudio.src = isMsPacman ? this.path + "mspacman/ms_eyes.wav" : this.path + "eyes.wav";
            this.eyesAudio.loop = true;
            this.eyesAudio.play().catch(() => {});
        }
    }

    /**
     * Stop eyes audio
     */
    stopEyes() {
        if (this.eyesAudio) {
            if (this.audioContext && this.eyesAudio.source) {
                this.stopBuffer(this.eyesAudio);
                this.eyesAudio = null;
            } else {
                this.eyesAudio.pause();
                this.eyesAudio = null;
            }
        }
    }

    /**
     * Play siren audio (looping)
     * Arcade: continuous background hum that changes pitch
     */
    playSiren() {
        if (this.isDemo || !this.isLoaded) return;

        this.stopSiren();

        this.sirenIndex = 0;
        
        if (this.audioContext && this.sirenBuffers[0]) {
            this.sirenBuffer = this.sirenBuffers[0];
            this.sirenAudio = this.playBuffer(this.sirenBuffer, true);
        } else {
            this.sirenAudio = this.sirenSounds[0];
            this.sirenAudio.loop = true;
            this.sirenAudio.currentTime = 0;
            this.sirenAudio.play().catch(() => {});
        }
    }

    /**
     * Update siren level based on remaining pellets
     * Arcade: siren pitch increases as fewer pellets remain
     * @param {number} pelletCount - Remaining pellets
     * @param {number} maxPellets - Maximum pellets
     */
    updateSirenLevel(pelletCount, maxPellets) {
        if (pelletCount <= 0) return;

        const level = Math.min(4, Math.floor(4 * (1 - pelletCount / maxPellets)) + 1);

        if (level !== this.sirenIndex + 1) {
            this.sirenIndex = level - 1;
            
            // Switch to new siren level
            if (this.audioContext && this.sirenBuffers[this.sirenIndex]) {
                if (this.sirenAudio) {
                    this.stopBuffer(this.sirenAudio);
                }
                
                this.sirenBuffer = this.sirenBuffers[this.sirenIndex];
                if (this.sirenBuffer) {
                    this.sirenAudio = this.playBuffer(this.sirenBuffer, true);
                }
            } else if (this.sirenSounds[this.sirenIndex]) {
                if (this.sirenAudio) {
                    this.sirenAudio.pause();
                }
                this.sirenAudio = this.sirenSounds[this.sirenIndex];
                this.sirenAudio.loop = true;
                this.sirenAudio.currentTime = 0;
                this.sirenAudio.play().catch(() => {});
            }
        }
    }

    /**
     * Stop siren audio
     */
    stopSiren() {
        if (this.sirenAudio) {
            if (this.audioContext && this.sirenAudio.source) {
                this.stopBuffer(this.sirenAudio);
                this.sirenAudio = null;
            } else {
                this.sirenAudio.pause();
                this.sirenAudio = null;
            }
        }
        this.sirenIndex = 0;
    }

    /**
     * Stop all audio
     */
    stop() {
        this.stopSiren();
        this.stopFright();
        this.stopEyes();
    }

    /**
     * Set master volume (0.0 to 1.0)
     * @param {number} volume - Volume level
     */
    setVolume(volume) {
        this.arcadeVolume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.arcadeVolume;
        }
    }

    /**
     * Get master volume
     * @returns {number} Current volume
     */
    getVolume() {
        return this.arcadeVolume;
    }
}
