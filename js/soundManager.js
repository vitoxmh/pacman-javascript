class soundManager{

    audio = null;
    path = "sound/";
    frightAudio = null;
    eyesAudio = null;
    sirenAudio = null;
    sirenIndex = 0;
    sounds = [];
    sirenSounds = [];
    isDemo = false;
    isLoaded = false;

    constructor() {
        this.loadSoundsAsync();
    }

    setDemoMode(value) {
        this.isDemo = value;
        if (value) {
            this.stopSiren();
            this.stopFright();
            this.stopEyes();
        }
    }

    loadSoundsAsync() {
        const isMsPacman = CONFIG.pacman.type === 'mspacman';
        
        const createAudio = (src) => {
            const audio = document.createElement('audio');
            audio.src = src;
            audio.preload = 'auto';
            return audio;
        };
        
        if (isMsPacman) {
            this.sounds = [
                createAudio(this.path+'mspacman/ms_eat_dot.wav'),
                createAudio(this.path+'mspacman/ms_eat_dot.wav')
            ];
            this.sirenSounds = [
                createAudio(this.path+'mspacman/ms_siren1.wav'),
                createAudio(this.path+'mspacman/ms_siren2.wav'),
                createAudio(this.path+'mspacman/ms_siren3.wav'),
                createAudio(this.path+'mspacman/ms_siren4.wav')
            ];
        } else {
            this.sounds = [
                createAudio(this.path+'eat_dot_0.wav'),
                createAudio(this.path+'eat_dot_1.wav')
            ];
            this.sirenSounds = [
                createAudio(this.path+'siren1.wav'),
                createAudio(this.path+'siren2.wav'),
                createAudio(this.path+'siren3.wav'),
                createAudio(this.path+'siren4.wav')
            ];
        }
		
		this.listSound = {
			credit: createAudio(this.path+"credit.wav"),
			eatGhost: createAudio(isMsPacman ? this.path+"mspacman/ms_eat_ghost.wav" : this.path+"eat_ghost.wav"),
			start: createAudio(isMsPacman ? this.path+"mspacman/ms_start.wav" : this.path+"start.wav")
        }
        
        for (const key in this.listSound) {
            this.listSound[key].preload = 'auto';
        }
        
        for (const audio of this.sirenSounds) {
            audio.preload = 'auto';
        }
        
        this.isLoaded = true;
    }

    index = 0;


    play(theme = null){
        if (this.isDemo || !this.isLoaded) return;

        switch(theme){
            case "credit":
                this.listSound.credit.currentTime = 0;
                this.listSound.credit.play();
            break;
            case "eat-ghost":
                this.listSound.eatGhost.currentTime = 0;
                this.listSound.eatGhost.play();
            break;
            case "start":
                this.listSound.start.currentTime = 0;
                this.listSound.start.play();
            break;
        }
    }


    playWaka() {
        if (this.isDemo || !this.isLoaded) return;

        const audio = this.sounds[this.index];
        audio.currentTime = 0;
        audio.play();

        this.index = (this.index + 1) % this.sounds.length;
    }


    playFright() {
        if (this.isDemo || !this.isLoaded) return;

        this.frightAudio = document.createElement('audio');
        this.frightAudio.src = this.path + "fright.wav";
        this.frightAudio.loop = true;
        this.frightAudio.play();
    }


    stopFright(){
        if (this.frightAudio) {
            this.frightAudio.pause();
            this.frightAudio = null;
        }
        this.stopEyes();
    }


    playEyes() {
        if (this.isDemo || !this.isLoaded) return;

        const isMsPacman = CONFIG.pacman.type === 'mspacman';
        this.eyesAudio = document.createElement('audio');
        this.eyesAudio.src = isMsPacman ? this.path + "mspacman/ms_eyes.wav" : this.path + "eyes.wav";
        this.eyesAudio.loop = true;
        this.eyesAudio.play();
    }

    stopEyes(){
        if (this.eyesAudio) {
            this.eyesAudio.pause();
            this.eyesAudio = null;
        }
    }

    playSiren() {
        if (this.isDemo || !this.isLoaded) return;
        
        if (this.sirenAudio) {
            this.sirenAudio.pause();
        }
        
        this.sirenIndex = 0;
        this.sirenAudio = this.sirenSounds[0];
        this.sirenAudio.loop = true;
        this.sirenAudio.currentTime = 0;
        this.sirenAudio.play();
    }

    updateSirenLevel(pelletCount, maxPellets) {
        if (!this.sirenAudio || pelletCount <= 0) return;
        
        const level = Math.min(4, Math.floor(4 * (1 - pelletCount / maxPellets)) + 1);
        
        if (level !== this.sirenIndex + 1) {
            this.sirenAudio.pause();
            this.sirenAudio.currentTime = 0;
            this.sirenIndex = level - 1;
            this.sirenAudio = this.sirenSounds[this.sirenIndex];
            this.sirenAudio.loop = true;
            this.sirenAudio.play();
        }
    }

    stopSiren() {
        if (this.sirenAudio) {
            this.sirenAudio.pause();
            this.sirenAudio = null;
        }
        this.sirenIndex = 0;
    }

    stop(){
        this.stopSiren();
        this.stopFright();
        this.stopEyes();
    }

}
