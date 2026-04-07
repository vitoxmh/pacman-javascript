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

    constructor() {
        this.loadSounds();
    }

    setDemoMode(value) {
        this.isDemo = value;
        if (value) {
            this.stopSiren();
            this.stopFright();
            this.stopEyes();
        }
    }

    loadSounds() {
        const isMsPacman = CONFIG.pacman.type === 'mspacman';
        
        const createAudio = (src) => {
            const audio = new Audio(src);
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
			credit: new Audio(this.path+"credit.wav"),
			eatGhost: new Audio(isMsPacman ? this.path+"mspacman/ms_eat_ghost.wav" : this.path+"eat_ghost.wav"),
			start: new Audio(isMsPacman ? this.path+"mspacman/ms_start.wav" : this.path+"start.wav")
		}
    }

    index = 0;


    play(theme = null){
        if (this.isDemo) return;

        const isMsPacman = CONFIG.pacman.type === 'mspacman';

        switch(theme){

            case "credit":

                //this.audio = new Audio(this.path+"credit.wav");
				this.listSound.credit.play();

            break;

            case "eat-ghost":
                //this.listSound.eatGhost.play();
				this.listSound.eatGhost.play();
            break;

            case "start":
                 //this.audio = new Audio(isMsPacman ? this.path+"mspacman/ms_start.wav" : this.path+"start.wav");
				 this.listSound.start.play();

            break;
            

        }
        
        //if(this.audio)  this.audio.play();
       

    }


    playWaka() {
        if (this.isDemo) return;

        const audio = this.sounds[this.index];
        audio.currentTime = 0;
        audio.play();

        // alternar entre 0 y 1
        this.index = (this.index + 1) % this.sounds.length;
    }



    playFright() {
        if (this.isDemo) return;

        // 🔊 sonido inicial
        this.frightAudio = new Audio(this.path + "fright.wav");
        this.frightAudio.loop = true;
        this.frightAudio.play();

    }


    stopFright(){
        if (this.frightAudio) {
            this.frightAudio.pause();
            this.frightAudio.currentTime = 0;
            this.frightAudio = null;
        }
        if (this.eyesAudio) {
            this.eyesAudio.pause();
            this.eyesAudio.currentTime = 0;
            this.eyesAudio = null;
        }
    }


    playEyes() {
        if (this.isDemo) return;

        const isMsPacman = CONFIG.pacman.type === 'mspacman';
        const audio = new Audio(isMsPacman ? this.path + "mspacman/ms_eyes.wav" : this.path + "eyes.wav");
        audio.loop = true;
        audio.play();
        this.eyesAudio = audio;
    
    }

    stopEyes(){
        if (this.eyesAudio) {
            this.eyesAudio.pause();
            this.eyesAudio.currentTime = 0;
            this.eyesAudio = null;
        }
    }

    playSiren() {
        if (this.isDemo) return;
        
        if (!this.sirenAudio) {
            this.sirenIndex = 0;
            this.sirenAudio = this.sirenSounds[0];
            this.sirenAudio.loop = true;
            this.sirenAudio.play();
        }
    }

    updateSirenLevel(pelletCount, maxPellets) {
        if (!this.sirenAudio || pelletCount <= 0) return;
        
        const level = Math.min(4, Math.floor(4 * (1 - pelletCount / maxPellets)) + 1);
        
        if (level !== this.sirenIndex + 1) {
            this.sirenIndex = level - 1;
            this.sirenAudio.pause();
            this.sirenAudio = this.sirenSounds[this.sirenIndex];
            this.sirenAudio.loop = true;
            this.sirenAudio.play();
        }
    }

    stopSiren() {
        if (this.sirenAudio) {
            this.sirenAudio.pause();
            this.sirenAudio.currentTime = 0;
            this.sirenAudio = null;
        }
        this.sirenIndex = 0;
    }




    stop(){

        this.audio.pause();

    }

}