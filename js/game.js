function copyMap(map) {
    return map.map(row => row.slice());
}

class game{

    pacman =  null;
    tileSize = CONFIG.game.tileSize;
    speed = CONFIG.pacman.speed;
    paused = false;
    step = false;
    lives = 3;
    gameState = "intro";
    credits = 0;
    introTimer = 0;
    introPhase = 0;
    introGhostShow = [false, false, false, false];
    originalMap = null;
    savedOriginalMap = null;
    isDying = false;
    currentLevel = 1;
    levelComplete = false;
    levelCompleteTimer = 0;
    levelBlink = false;
    flashCount = 0;
    pelletFlashTimer = 0;
    pelletFlash = false;
    powerPelletFlash = false;
    firstGame = true;
    maxPelletCount = 0;
    _deltaTime = 0;
    stageManager = null;
    isDemo = false;
    stageCanvas = null;
    stageCtx = null;
    lastRenderedStage = null;

    constructor(canvas){
        
            this.lastTime = performance.now();
            this.canvas = document.getElementById(canvas);
            this.ctx = this.canvas.getContext('2d', { alpha: false, desynchronized: true });
            this.ctx.imageSmoothingEnabled = false;
            this.ctx.scale(1,1);
            this.ctx.fillStyle = "#000000";
            this.ctx.fillRect(0,0,CONFIG.game.canvas.width,CONFIG.game.canvas.height); 
            
            this.stageCanvas = document.createElement('canvas');
            this.stageCanvas.width = CONFIG.game.canvas.width;
            this.stageCanvas.height = CONFIG.game.canvas.height;
            this.stageCtx = this.stageCanvas.getContext('2d', { alpha: false });
            this.stageCtx.imageSmoothingEnabled = false;
            
            this.sprite = new sprite(this.ctx, this.stageCtx);
            this.sprite.setTileColors(1);
            this.sprite.updateStageBuffer(this.actualStage);
            this.stages = new stage();
            this.pacman = new pacman(this.ctx,this.sprite,this.tileSize);
            this.pacman.game = this;
            this.actualStage = this.stages.map(1);
            this.originalMap = copyMap(this.actualStage);
            this.pacman.setMap( this.actualStage );
            this.initPelletCount();
            this.scoreManager = new scoreManager(this.sprite, this);
            this.scoreManager.setLives(this.lives);
            this.pacman.setScoreManager(this.scoreManager);
            this.soundManager = new soundManager();
            this.readyTimer = CONFIG.game.readyTimer;
            this.gameState = "intro";
            this.introTimer = 0;
            this.introPhase = 0;
            this.introGhostShow = [false, false, false, false];
            this.firstGame = true;

            this.globalEatPause = true;
            this.globalEatTimer = 0;

            this.initGhosts();

            this.stageManager = new StageManager(this);
            this.stageManager.init();

            document.addEventListener("visibilitychange", () => {
                if (document.hidden) {
                    this.paused = true;
                } else {
                    this.paused = false;
                    this.lastTime = performance.now();
                }
            });

            window.addEventListener("keydown", e => {
                if (e.key === "p") {
                    this.paused = !this.paused;
                    console.log(this.paused ? "⏸ Pausado" : "▶ Reanudado");
                }

                if (e.key === "o") {
                    if (this.paused) {
                        this.step = true;
                        console.log("⏭ Frame avanza");
                    }
                }

                if (e.key === "r" || e.key === "R") {
                    this.restartGame(true);
                }

                if (e.key === "Enter") {
                    if (this.credits > 0) {
                        this.credits--;
                        this.pacman.setAutoPilot(false);
                        console.log(`Crédito usado. Restantes: ${this.credits}`);
                        
                        this.lives = 3;
                        this.scoreManager.setLives(this.lives);
                        this.scoreManager.score = 0;
                        this.scoreManager.resetFruit();
                        this.currentLevel = 1;
                        this.actualStage = this.stages.map(1);
                        this.originalMap = copyMap(this.actualStage);
                        this.pacman.setMap(this.actualStage);
                        this.initPelletCount();
                        this.initGhosts();
                        this.firstGame = true;
                        this.stageManager.setStage(STAGE_TYPE.LEVEL, { levelNumber: 1, state: 'ready' });
                    } else if (this.stageManager.stageType === STAGE_TYPE.CREDITS) {
                        this.stageManager.setStage(STAGE_TYPE.INTRO);
                    } else if (this.stageManager.stageType === STAGE_TYPE.DEMO) {
                        this.lives = 3;
                        this.scoreManager.setLives(this.lives);
                        this.scoreManager.score = 0;
                        this.scoreManager.resetFruit();
                        this.currentLevel = 1;
                        this.actualStage = this.stages.map(1);
                        this.originalMap = copyMap(this.actualStage);
                        this.pacman.setMap(this.actualStage);
                        this.initPelletCount();
                        this.initGhosts();
                        this.firstGame = true;
                        this.stageManager.setStage(STAGE_TYPE.LEVEL, { levelNumber: 1, state: 'ready' });
                    }
                }

                if (e.key === "1") {
                    this.credits++;
                    console.log(`Crédito agregado: ${this.credits}`);
                    if (this.stageManager.stageType === STAGE_TYPE.INTRO || 
                        this.stageManager.stageType === STAGE_TYPE.GAMEOVER || 
                        this.stageManager.stageType === STAGE_TYPE.CREDITS ||
                        this.stageManager.stageType === STAGE_TYPE.DEMO) {
                        this.stageManager.setStage(STAGE_TYPE.CREDITS);
                    }
                }

                if (e.key === "c" || e.key === "C") {
                    this.credits++;
                    console.log(`Crédito agregado: ${this.credits}`);
                    this.soundManager.play("credit");
                    if (this.stageManager.stageType === STAGE_TYPE.INTRO || 
                        this.stageManager.stageType === STAGE_TYPE.GAMEOVER || 
                        this.stageManager.stageType === STAGE_TYPE.CREDITS ||
                        this.stageManager.stageType === STAGE_TYPE.DEMO) {
                        this.stageManager.setStage(STAGE_TYPE.CREDITS);
                    }
                }
            });
      
            requestAnimationFrame(this.loop.bind(this));

    }

    initGhosts() {
        const blinky = new Ghost(this.ctx, this.sprite, this.tileSize, this.actualStage, 
            CONFIG.ghost.startPositions.blinky.x, CONFIG.ghost.startPositions.blinky.y, 
            CONFIG.ghost.colors.blinky, this.pacman);
        const pinky = new Ghost(this.ctx, this.sprite, this.tileSize, this.actualStage, 
            CONFIG.ghost.startPositions.pinky.x, CONFIG.ghost.startPositions.pinky.y, 
            CONFIG.ghost.colors.pinky, this.pacman);
        const inky = new Ghost(this.ctx, this.sprite, this.tileSize, this.actualStage, 
            CONFIG.ghost.startPositions.inky.x, CONFIG.ghost.startPositions.inky.y, 
            CONFIG.ghost.colors.inky, this.pacman, blinky);
        const clyde = new Ghost(this.ctx, this.sprite, this.tileSize, this.actualStage, 
            CONFIG.ghost.startPositions.clyde.x, CONFIG.ghost.startPositions.clyde.y, 
            CONFIG.ghost.colors.clyde, this.pacman);

        this.ghosts = [blinky, pinky, inky, clyde];
        this.pacman.ghosts = this.ghosts;
        this.resetPositions();
    }

    resetPositions() {
        this.pacman.x = CONFIG.pacman.startX;
        this.pacman.y = CONFIG.pacman.startY;
        this.pacman.direction = 'right';
        this.pacman.nextDirection = 'right';
        this.pacman.moving = false;
        this.pacman.animFrame = 2;
        this.pacman.mouthOpen = 2;
        this.pacman.hasStartedMoving = false;
        
        this.scoreManager.resetFruit();
        
        this.ghosts.forEach((g, i) => {
            const positions = Object.values(CONFIG.ghost.startPositions);
            g.x = positions[i].x;
            g.y = positions[i].y;
            g.direction = "left";
            g.moving = false;
            g.target = { x: g.x, y: g.y };
            
            if (g.color !== "red") {
                g.mode = "house";
                g.state = "inHouse";
                g.direction = "up";
                g.exitTimer = 0;
            } else {
                g.mode = "chase";
                g.state = "chase";
            }
        });
    }

    restartGame(fullRestart = false) {
        this.pacman.setAutoPilot(false);
        
        if (fullRestart) {
            this.lives = 3;
            this.scoreManager.setLives(this.lives);
            this.scoreManager.score = 0;
            this.scoreManager.resetFruit();
            this.currentLevel = 1;
            this.actualStage = this.stages.map(1);
            this.originalMap = copyMap(this.actualStage);
            this.pacman.setMap(this.actualStage);
            this.initGhosts();
            this.firstGame = true;
            this.stageManager.setStage(STAGE_TYPE.INTRO);
            return;
        }
        
        this.lives--;
        this.scoreManager.setLives(this.lives);
        
        if (this.lives <= 0) {
            this.stageManager.setStage(STAGE_TYPE.GAMEOVER);
            return;
        }

        this.isDying = true;
        this.pacman.pauseMovement(true);
        this.ghosts.forEach(g => g.pauseMovement(true));
        
        setTimeout(() => {
            this.isDying = false;
            this.pacman.pauseMovement(false);
            this.ghosts.forEach(g => g.pauseMovement(false));
            this.stageManager.setStage(STAGE_TYPE.LEVEL, { levelNumber: this.currentLevel, state: 'ready' });
            this.resetPositions();
        }, 2000);
    }

    loseLife() {
       
        this.isDying = true;
        this.soundManager.stopSiren();
        
        this.pacman.pauseMovement(true);
        this.ghosts.forEach(g => g.pauseMovement(true));
        
        setTimeout(() => {
            this.lives--;
            this.scoreManager.setLives(this.lives);
            this.isDying = false;
            this.pacman.pauseMovement(false);
            this.ghosts.forEach(g => g.pauseMovement(false));
            
            if (this.lives <= 0) {
                this.stageManager.setStage(STAGE_TYPE.GAMEOVER);
            } else {
                this.resetPositions();
                this.stageManager.setStage(STAGE_TYPE.LEVEL, { levelNumber: this.currentLevel, state: 'ready' });
            }
        }, 2000);
    }

    gameOver() {
        this.gameState = "gameover";
        console.log("💀 Game Over");
    }

    initPelletCount() {
        this.pelletCount = 0;
        for (let row = 0; row < this.actualStage.length; row++) {
            for (let col = 0; col < this.actualStage[row].length; col++) {
                if (this.actualStage[row][col] === 36 || this.actualStage[row][col] === 37) {
                    this.pelletCount++;
                }
            }
        }
        this.maxPelletCount = this.pelletCount;
    }

    decrementPelletCount() {
        this.pelletCount--;
    }

    hasPellets() {
        return this.pelletCount;
    }

    nextLevel() {
        this.levelComplete = true;
        this.levelCompleteTimer = 0;
        this.flashCount = 0;
        console.log(`Nivel completado! Parpadeando antes del nivel ${this.currentLevel + 1}`);
        
        this.pacman.pauseMovement(true);
        this.ghosts.forEach(g => g.pauseMovement(true));
    }

    finishLevelTransition() {
        this.currentLevel++;
        console.log(`Avanzando al nivel ${this.currentLevel}`);
        
        const difficultyMultiplier = Math.min(1 + (this.currentLevel - 1) * 0.05, 1.5);
        
        CONFIG.ghost.baseSpeed = Math.min(7 + (this.currentLevel - 1) * 0.2, 10);
        CONFIG.ghost.frightenedDuration = Math.max(5 - (this.currentLevel - 1) * 0.1, 3);
        
        CONFIG.ghost.scatterDuration = Math.max(7 - (this.currentLevel - 1) * 0.2, 5);
        CONFIG.ghost.chaseDuration = Math.max(20 + (this.currentLevel - 1) * 0.5, 25);
        
        this.levelComplete = false;
        
        this.actualStage = this.stages.map(this.currentLevel);
        this.originalMap = copyMap(this.actualStage);
        this.pacman.setMap(this.actualStage);
        
        this.sprite.setTileColors(this.currentLevel);
        this.sprite.updateStageBuffer(this.actualStage);
        
        this.pacman.x = CONFIG.pacman.startX;
        this.pacman.y = CONFIG.pacman.startY;
        this.pacman.direction = 'right';
        this.pacman.nextDirection = 'right';
        this.pacman.moving = false;
        
        this.ghosts.forEach((g, i) => {
            const positions = Object.values(CONFIG.ghost.startPositions);
            g.x = positions[i].x;
            g.y = positions[i].y;
            g.direction = "left";
            g.moving = false;
            g.target = { x: g.x, y: g.y };
            
            if (g.color !== "red") {
                g.mode = "house";
                g.state = "inHouse";
                g.direction = "up";
                g.exitTimer = 0;
            } else {
                g.mode = "chase";
                g.state = "chase";
            }
        });

        this.gameState = "ready";
        this.readyTimer = CONFIG.game.readyTimer;
    }

    loop(now) {

        if (!this.paused || this.step) {

            let deltaTime = now - this.lastTime;
            this.lastTime = now;

            if (deltaTime > 100) deltaTime = 16;
        
            this.update(deltaTime);

            if (this.step) this.step = false;
        }

        requestAnimationFrame(this.loop.bind(this));
    }


   update(deltaTime) {
        this._deltaTime = deltaTime;

        if (this.isDying) {
            this.clearScreen();
            this.sprite.renderStage(this.actualStage);
            this.pacman.draw();
            this.ghosts.forEach(g => g.draw());
            this.scoreManager.update();
            return;
        }

        this.stageManager.update(deltaTime);
        this.stageManager.render();
    }

    drawDebugGrid(ctx, map, tileSize) {
        const w = tileSize * 2;

        for (let r = 0; r < map.length; r++) {
            for (let c = 0; c < map[0].length; c++) {

                const x = c * w;
                const y = r * w;
                const t = map[r][c];

                if (t >= 1 && t <= 45) {
                    ctx.strokeStyle = "rgba(0, 100, 255, 0.3)";
                    ctx.strokeRect(x, y, w, w);
                }

                if (t === 38) {
                    ctx.fillStyle = "rgba(255, 0, 255, 0.3)";
                    ctx.fillRect(x, y, w, w);
                }

                if (t === 0 || t === 36 || t === 37) {
                    ctx.strokeStyle = "rgba(255,255,255,0.1)";
                    ctx.strokeRect(x, y, w, w);
                }
            }
        }
    }


    clearScreen(){
        this.ctx.fillStyle = "#000";
        this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height); 
    }


}
