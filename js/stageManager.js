const STAGE_TYPE = {
    INTRO: 'intro',
    DEMO: 'demo',
    LEVEL: 'level',
    ANIMATION: 'animation',
    GAMEOVER: 'gameover',
    WIN: 'win',
    CREDITS: 'credits',
    SELECT_CHARACTER: 'select_character'
};

function copyMap(map) {
    return map.map(row => row.slice());
}

class StageManager {

    constructor(game) {

        this.game = game;
        this.currentStage = null;
        this.stages = {};
        this.stageType = STAGE_TYPE.INTRO;
        this.lastDeltaTime = 16.67;
        
        this.registerStage(STAGE_TYPE.INTRO, new IntroStage(this.game));
        this.registerStage(STAGE_TYPE.DEMO, new DemoStage(this.game));
        this.registerStage(STAGE_TYPE.LEVEL, new LevelStage(this.game));
        this.registerStage(STAGE_TYPE.GAMEOVER, new GameOverStage(this.game));
        this.registerStage(STAGE_TYPE.WIN, new WinStage(this.game));
        this.registerStage(STAGE_TYPE.CREDITS, new CreditsStage(this.game));
        this.registerStage(STAGE_TYPE.SELECT_CHARACTER, new SelectCharacterStage(this.game));
    }

    init() {
        this.setStage(STAGE_TYPE.INTRO);
    }

    registerStage(type, stageInstance) {
        this.stages[type] = stageInstance;
    }

    setStage(type, options = {}) {
        if (!this.stages[type]) {
            console.error(`Stage '${type}' no encontrado`);
            return;
        }
        
        if (this.currentStage && this.currentStage.onExit) {
            this.currentStage.onExit();
        }
        
        this.stageType = type;
        this.currentStage = this.stages[type];
        
        if (this.currentStage.onEnter) {
            this.currentStage.onEnter(options);
        }
    }

    getStage() {
        return this.currentStage;
    }

    getStageType() {
        return this.stageType;
    }

    update(deltaTime) {
        this.lastDeltaTime = deltaTime;

        if (this.currentStage && this.currentStage.update) {
            const nextStage = this.currentStage.update(deltaTime);

            if (nextStage) {
                this.setStage(nextStage.stage, nextStage.options || {});
            }
        }
    }

    render(_deltaTime) {
        if (this.currentStage && this.currentStage.render) {
            this.currentStage.render(this.lastDeltaTime);
        }
    }
}

class BaseStage {
    constructor(game) {
        this.game = game;
    }

    onEnter(options = {}) {}
    onExit() {}
    update(deltaTime) { return null; }
    render(_deltaTime) {}
}

class DemoStage extends BaseStage {

    constructor(game) {
        super(game);
        this.demoTimer = 0;
        this.demoLevel = 1;
        this.state = 'playing';
    }

    onEnter(options = {}) {
        this.demoTimer = 0;
        this.demoLevel = 1;
        this.state = 'playing';
        
        this.game.savedOriginalMap = copyMap(this.game.originalMap);
        this.game.isDemo = true;
        this.game.soundManager.setDemoMode(true);
        
        this.loadDemoLevel(this.demoLevel);
        
        this.game.pacman.pauseMovement(false);
        this.game.ghosts.forEach(g => g.pauseMovement(false));
        
        this.game.pacman.setAutoPilot(true);
    }

    onExit() {
        this.game.isDemo = false;
        this.game.soundManager.setDemoMode(false);
    }

    loadDemoLevel(levelNum) {
        this.game.currentLevel = levelNum;
        this.game.actualStage = this.game.stages.map(levelNum);
        this.game.originalMap = copyMap(this.game.actualStage);
        this.game.pacman.setMap(this.game.actualStage);
        this.game.sprite.setTileColors(levelNum);
        this.game.sprite.updateStageBuffer(this.game.actualStage);
        this.game.initPelletCount();
        this.game.ghosts.forEach(g => g.setMap(this.game.actualStage));
        this.game.resetPositions();
    }

    update(deltaTime) {
        this.demoTimer += deltaTime;
        
        if (this.demoTimer > 900000) {
            this.game.pacman.setAutoPilot(false);
            return { stage: STAGE_TYPE.INTRO };
        }
        
        if (this.game.levelComplete) {
            return this.handleDemoLevelComplete(deltaTime);
        }

        this.game.pacman.update(deltaTime);
        
        this.game.scoreManager.updateFruit(deltaTime);
        
        const pelletCount = this.game.hasPellets();
        if (pelletCount === 0) {
            this.game.nextLevel();
        }

        this.game.ghosts.forEach(g => g.update(deltaTime));

        this.game.pelletFlashTimer += deltaTime;
        if (this.game.pelletFlashTimer > 200) {
            this.game.pelletFlashTimer = 0;
            this.game.pelletFlash = !this.game.pelletFlash;
        }

        const anyFlash = this.game.ghosts.some(g => g.mode === "flash");
        if (anyFlash) {
            this.game.powerPelletFlash = this.game.pelletFlash;
        } else {
            this.game.powerPelletFlash = false;
        }
        
        this.checkCollisions();

        return null;
    }

    handleDemoLevelComplete(deltaTime) {
        if (!this.game.levelCompleteTimer) this.game.levelCompleteTimer = 0;
        this.game.levelCompleteTimer += deltaTime;
        
        const flashInterval = 150;
        const flashes = Math.floor(this.game.levelCompleteTimer / flashInterval);
        this.game.pelletFlash = flashes % 2 === 1;
        
        if (this.game.levelCompleteTimer >= 2000) {
            this.demoLevel++;
            this.loadDemoLevel(this.demoLevel);
            this.game.levelComplete = false;
            this.game.levelCompleteTimer = 0;
            this.game.pacman.setAutoPilot(true);
        }
        
        return null;
    }

    checkCollisions() {
        const px = this.game.pacman.x;
        const py = this.game.pacman.y;
        
        for (const g of this.game.ghosts) {
            const dx = g.x - px;
            const dy = g.y - py;
            const distSq = dx * dx + dy * dy;
            
            if (distSq < 0.09) {
                if (g.mode === "frightened" || g.mode === "flash") {
                    g.die();
                    this.game.scoreManager.eatenCounterIncrement(px, py);
                } else if (g.mode === "scatter" || g.mode === "chase" || g.mode === "reviving") {
                    this.game.isDying = true;
                    this.game.pacman.pauseMovement(true);
                    for (const gg of this.game.ghosts) gg.pauseMovement(true);
                    
                    setTimeout(() => {
                        this.game.isDying = false;
                        this.game.pacman.setAutoPilot(false);
                        this.game.pacman.x = CONFIG.pacman.startX;
                        this.game.pacman.y = CONFIG.pacman.startY;
                        this.game.pacman.direction = 'right';
                        this.game.pacman.nextDirection = 'right';
                        this.game.pacman.animFrame = 0;
                        this.game.pacman.mouthOpen = 0;
                        
                        this.game.lives--;
                        this.game.scoreManager.setLives(this.game.lives);
                        console.log("MUERTE - Vidas:", this.game.lives);
                        
                        if (this.game.lives <= 0) {
                            console.log("GAME OVER - Restaurando mapa");
                            this.game.actualStage = copyMap(this.game.originalMap);
                            this.game.pacman.setMap(this.game.actualStage);
                            this.game.initGhosts();
                            this.game.stageManager.setStage(STAGE_TYPE.GAMEOVER);
                        } else {
                            console.log("CONTINUAR - No se restaura mapa");
                            this.game.initGhosts();
                            this.game.resetPositions();
                            this.game.pendingLevel = this.game.currentLevel;
                            this.game.stageManager.setStage(STAGE_TYPE.INTRO);
                        }
                    }, 2000);
                }
            }
        }
    }
 
    render(_deltaTime) {
        this.game.clearScreen();
        
        let flashType = 0;
        if (this.game.levelComplete) {
            flashType = this.game.pelletFlash ? 5 : 0;
        }

        const pelletFlashType = this.game.pelletFlash ? 2 : 0;
        const powerPelletFlashType = this.game.powerPelletFlash ? 3 : 0;
        
        this.game.sprite.renderStage(this.game.actualStage, flashType, pelletFlashType, powerPelletFlashType);
        this.game.pacman.draw();
        this.game.ghosts.forEach(g => g.draw());
        this.game.scoreManager.update();
        
        this.game.sprite.renderText("game over",160, 280, 4);
        
        if (this.game.credits > 0) {
            this.game.sprite.renderText(`credits ${this.game.credits}`, 220, 545, 5);
        }
    }
}

class IntroStage extends BaseStage {


    constructor(game) {
        super(game);
        this.timer = 0;
        this.phase = 0;
        this.animTime = 0;
        this.animFrame = 0;
        this.animFrameGhost = 0;
       

        this.game.clearScreen();
    }

    onEnter(options = {}) {

         this.x = 500;
        this.xGhost = 550;
        this.pause = false;
        this.ghosStatus = {
            g1 : false,
            g2 : false,
            g3 : false,
            g4 : false
        }
        this.timer = 0;
        this.phase = 0;
        this.game.pacman.pauseMovement(true);
        this.game.ghosts.forEach(g => g.pauseMovement(true));
    }

    update(deltaTime) {

        this.timer += deltaTime;
        this.animTime += deltaTime / 1000;
                
        if (this.animTime >= 1 / CONFIG.pacman.animSpeed) {

            this.animTime = 0;
            this.animFrame = (this.animFrame + 1) % 3;
            this.animFrameGhost = (this.animFrameGhost + 1) % 2;

        }
        
        if (this.timer > 20000) {
            if (this.game.credits > 0) {
                this.game.credits--;
                console.log(`Crédito usado. Restantes: ${this.game.credits}`);
                return { stage: STAGE_TYPE.LEVEL, options: { levelNumber: 1 } };
            } else {
                return { stage: STAGE_TYPE.DEMO };
            }
        }
        
        return null;
    }

    render(deltaTime) {
        const { sprite } = this.game;

        let flashType = 0;
        let direction = 1;


        if(this.pause) return;

        this.game.clearScreen();
        sprite.renderStage(this.game.actualStage, 0, 0, 0, true);
        sprite.renderText("high score", 155, -49, 5);
        sprite.renderText("1up", 45, -49, 5);
        sprite.renderText("0", 50, -30, 5);
        sprite.renderText("character / nickname", 105, 60, 5);

    
        if (this.timer > 500) this.renderGhost(0, 4,6);
        if (this.timer > 1000) sprite.renderText("-shadown", 105, 98, 4);
        if (this.timer > 1500) sprite.renderText('"blinky"', 300, 98, 4);

        if (this.timer > 2000) this.renderGhost(1, 4,9);
        if (this.timer > 2500) sprite.renderText("-speedy", 105, 147, 7);
        if (this.timer > 3000) sprite.renderText('"pinky"', 300, 147, 7);

        if (this.timer > 3500) this.renderGhost(2, 4,12);
        if (this.timer > 4000) sprite.renderText("-bashful", 105, 196, 8);
        if (this.timer > 4500) sprite.renderText('"inky"', 300, 196, 8);

        if (this.timer > 5000) this.renderGhost(3, 4,15);
        if (this.timer > 5500) sprite.renderText("-pokey", 105, 245, 9);
        if (this.timer > 6000) sprite.renderText('"clyde"', 300, 245, 9);

          sprite.renderText(`credits ${this.game.credits}`, 30, 530, 5);

        if (this.timer > 7000){
            sprite.renderSprite(130,380,sprite.getTiled(36));
            sprite.renderSprite(130,420,sprite.getTiled(37));
            sprite.renderText("10", 160, 380, 7);
            sprite.renderText("50", 160, 420, 7);
            sprite.renderSprite(200, 383,sprite.TEXT['pts']);
            sprite.renderSprite(200, 422,sprite.TEXT['pts']);
            sprite.renderSprite(200,460,sprite.getSprite("namco"));
        }
        
         if (this.timer > 8000 && this.timer < 12650){

                if(this.animFrameGhost === 0){
                    sprite.renderSprite(60,310,sprite.getTiled(37),0,false,true);
                }

         }  
 
         if(this.timer > 12650){
            direction = -1;
         }
                
         if (this.timer > 8500){
            
             

            const frameScale = deltaTime / 16.67;
            this.x = this.x - 1.75 * frameScale * direction;
            
            const pacmanSprite = sprite.getSprite(CONFIG.pacman.type,this.animFrame);
          
            sprite.renderSprite(this.x,300,pacmanSprite,0,(direction === 1));

            this.xGhost = this.xGhost - (direction === 1 ? 1.75 : 1.1) * frameScale * direction;
         

            if(this.timer < 13650){
                
                this.ghostAniation(this.xGhost, 0, direction);
               
            }else if(this.ghosStatus.g1 === false){

                this.ghosStatus.g1 = true;
                this.pause = true;
                sprite.getSprite('pointGhost',0);
                //this.game.ctx.clearRect(this.x,350,32,30);
                this.game.ctx.fillStyle = 'black';
                this.game.ctx.fillRect(this.x,350,32,30); 
                sprite.renderSprite(this.x,300,sprite.getSprite('pointGhost',0),0,false);
                
                setTimeout(() => {
                    this.pause = false;
                }, 1000);
            }

             if(this.timer < 15500){

                 this.ghostAniation((this.xGhost+30), 1, direction);

             }else if(this.ghosStatus.g2 === false){
               
           
                this.game.ctx.fillStyle = 'black';
                this.game.ctx.fillRect(this.x,350,32,30); 
                this.ghosStatus.g2 = true;
                this.pause = true;
                sprite.renderSprite(this.x,300,sprite.getSprite('pointGhost',1),0,false);
                setTimeout(() => {
                    this.pause = false;
                }, 1000);

            }


             if(this.timer < 17000){

                 this.ghostAniation((this.xGhost+60), 2, direction);

             }else if(this.ghosStatus.g3 === false){
                  this.game.ctx.fillStyle = 'black';
                this.game.ctx.fillRect(this.x,350,32,30); 
                sprite.renderSprite(this.x,300,sprite.getSprite('pointGhost',2),0,false);
                this.ghosStatus.g3 = true;
                this.pause = true;
                setTimeout(() => {
                    this.pause = false;
                }, 1000);

            }


            if(this.timer < 19000){

                this.ghostAniation((this.xGhost+90), 3, direction);

            }else if(this.ghosStatus.g4 === false){
                  this.game.ctx.fillStyle = 'black';
                this.game.ctx.fillRect(this.x,350,32,30); 
                this.ghosStatus.g4 = true;
                this.pause = true;
                sprite.renderSprite(this.x,300,sprite.getSprite('pointGhost',3),0,false);
                setTimeout(() => {
                    this.pause = false;
                }, 1000);

            }

           
              
           
         }

    }

    

    ghostAniation(x, ghostIndex, direction = false){

        const { sprite } = this.game;

        let typeSprite = 'ghost';
        if(direction === -1){
            typeSprite = 'ghost-frightened';
        }
        
        let ghostSprite = sprite.getSprite(typeSprite, this.animFrameGhost);
        
        const ghost = this.game.ghosts[ghostIndex];
        if (ghost && ghost.color !== 'red') {
            const colorMap = {
                'pink': 7,
                'cyan': 8,
                'orange': 9
            };
            const colorIndex = colorMap[ghost.color];
            if (colorIndex) {
                ghostSprite = ghostSprite.map(fila =>
                    fila.map(valor => valor === 4 ? colorIndex : valor)
                );
            }
        }
        
        this.game.sprite.renderSprite(x, 300, ghostSprite, 0, (direction === 1), true);
        
    }

    renderGhost(index, x,y) {
        const ghost = this.game.ghosts[index];
        ghost.x = x;
        ghost.y = y;
        ghost.direction = 'rigth';
        ghost.draw();
    }
}

class LevelStage extends BaseStage {

    constructor(game) {
        super(game);
        this.levelNumber = 1;
        this.state = 'ready';
        this.readyTimer = 0;
    }

    onEnter(options = {}) {
        this.levelNumber = options.levelNumber || 1;
        this.state = options.state || 'ready';
        
        if (this.game.firstLife) {
            this.readyTimer = 4;
            this.game.firstLife = false;
        } else {
            this.readyTimer = 1;
        }
        
        this.loadLevel(this.levelNumber);
        if (this.game.firstGame) {
            this.game.soundManager.play("start");
            this.game.firstGame = false;
        }
        this.game.pacman.pauseMovement(true);
        this.game.ghosts.forEach(g => g.pauseMovement(true));
    }

    loadLevel(levelNum) {
        const isSameLevel = this.game.currentLevel === levelNum && this.game.actualStage !== null;
        
        this.game.currentLevel = levelNum;
        
        if (!isSameLevel) {
            this.game.actualStage = this.game.stages.map(levelNum);
            this.game.originalMap = copyMap(this.game.actualStage);
            this.game.pacman.setMap(this.game.actualStage);
            this.game.sprite.setTileColors(levelNum);
            this.game.sprite.updateStageBuffer(this.game.actualStage);
            this.game.initPelletCount();
            this.game.scoreManager.resetFruit();
        }
        
        this.game.initGhosts();
        this.game.resetPositions();
    }

    update(deltaTime) {
        if (this.game.isDying) {
            return null;
        }

        if (this.game.levelComplete) {
            return this.handleLevelComplete(deltaTime);
        }

        if (this.state === 'ready') {
            this.readyTimer -= deltaTime / 1000;
            
            if (this.readyTimer <= 0) {
                this.state = 'playing';
                this.game.gameState = 'playing';
                this.game.pacman.pauseMovement(false);
                this.game.ghosts.forEach(g => g.pauseMovement(false));
                this.game.soundManager.playSiren();
            }
            return null;
        }

        this.game.pacman.update(deltaTime);
        
        this.game.scoreManager.updateFruit(deltaTime);
        
        const pelletCount = this.game.hasPellets();
        this.game.soundManager.updateSirenLevel(pelletCount, this.game.maxPelletCount);
        
        if (pelletCount === 0) {
            this.game.soundManager.stopSiren();
            this.game.nextLevel();
        }

        this.game.ghosts.forEach(g => g.update(deltaTime));

        this.game.pelletFlashTimer += deltaTime;
        if (this.game.pelletFlashTimer > 200) {
            this.game.pelletFlashTimer = 0;
            this.game.pelletFlash = !this.game.pelletFlash;
        }

        const anyFlash = this.game.ghosts.some(g => g.mode === "flash");
        if (anyFlash) {
            this.game.powerPelletFlash = this.game.pelletFlash;
        } else {
            this.game.powerPelletFlash = false;
        }
        
        const anyFrightened = this.game.ghosts.some(g => g.mode === "frightened" || g.mode === "flash");
        const anyDead = this.game.ghosts.some(g => g.mode === "dead");
        
        if (anyDead) {
            if (this.game.soundManager.frightAudio) {
                this.game.soundManager.stopFright();
            }
            if (!this.game.soundManager.eyesAudio) {
                this.game.soundManager.playEyes();
            }
            this.game.soundManager.stopSiren();
        } else if (anyFrightened) {
            if (this.game.soundManager.eyesAudio) {
                this.game.soundManager.stopEyes();
            }
            if (!this.game.soundManager.frightAudio) {
                this.game.soundManager.playFright();
            }
            this.game.soundManager.stopSiren();
        } else if (this.game.soundManager.frightAudio || this.game.soundManager.eyesAudio) {
            this.game.soundManager.stopFright();
            this.game.soundManager.stopEyes();
            this.game.soundManager.playSiren();
        }
        
        this.checkCollisions();

        return null;
    }

    handleLevelComplete(deltaTime) {
        this.game.levelCompleteTimer += deltaTime;
        
        const flashInterval = 150;
        const flashes = Math.floor(this.game.levelCompleteTimer / flashInterval);
        this.game.pelletFlash = flashes % 2 === 1;
        
        if (this.game.levelCompleteTimer >= 2000) {
            const nextLevel = this.game.currentLevel + 1;
            this.loadLevel(nextLevel);
            this.state = 'ready';
            this.readyTimer = CONFIG.game.readyTimer;
            this.game.levelComplete = false;
            
            const difficultyMultiplier = Math.min(1 + (nextLevel - 1) * 0.05, 1.5);
            CONFIG.ghost.baseSpeed = Math.min(7 + (nextLevel - 1) * 0.2, 10);
            CONFIG.ghost.frightenedDuration = Math.max(5 - (nextLevel - 1) * 0.1, 3);
        }
        
        return null;
    }

    checkCollisions() {
        if (this.game.globalEatPause) {
            this.game.globalEatTimer -= this.game._deltaTime / 1000;
            if (this.game.globalEatTimer <= 0) {
                this.game.globalEatPause = false;
                this.game.pacman.pauseMovement(false);
                this.game.pacman.isVisible(true);
                for (const g of this.game.ghosts) {
                    if (g.mode !== "dead") g.pauseMovement(false);
                }
            }
            return;
        }

        const px = this.game.pacman.x;
        const py = this.game.pacman.y;
        
        for (const g of this.game.ghosts) {
            const dx = g.x - px;
            const dy = g.y - py;
            const dist = dx * dx + dy * dy;
            
            if (dist < 0.09) {
                if (g.mode === "frightened" || g.mode === "flash") {
                    this.game.soundManager.play("eat-ghost");
                    g.die();
                    this.game.scoreManager.eatenCounterIncrement(px, py);
                    this.game.globalEatPause = true;
                    this.game.globalEatTimer = 1.0;
                    this.game.pacman.pauseMovement(true);
                    this.game.pacman.isVisible(false);
                    for (const gg of this.game.ghosts) {
                        if (gg.mode !== "dead") gg.pauseMovement(true);
                    }
                    
                    let anyFrightenedLeft = false;
                    for (const gg of this.game.ghosts) {
                        if (gg.mode === "frightened" || gg.mode === "flash") {
                            anyFrightenedLeft = true;
                            break;
                        }
                    }
                    if (!anyFrightenedLeft) {
                        this.game.soundManager.stopFright();
                        this.game.soundManager.playEyes();
                    }
                } else if (g.mode === "scatter" || g.mode === "chase" || g.mode === "reviving") {
                    this.game.loseLife();
                }
            }
        }
    }

    render(_deltaTime) {
        this.game.clearScreen();
        
        let flashType = 0;
        if (this.game.levelComplete) {
            flashType = this.game.pelletFlash ? 5 : 0;
        }

        const pelletFlashType = this.game.pelletFlash ? 2 : 0;
        const powerPelletFlashType = this.game.powerPelletFlash ? 3 : 0;
        
        this.game.sprite.renderStage(this.game.actualStage, flashType, pelletFlashType, powerPelletFlashType, false, false);
        this.game.pacman.draw();
        this.game.ghosts.forEach(g => g.draw());
        this.game.scoreManager.update();
        
        if (this.game.credits > 0) {
            this.game.sprite.renderText(`credit ${this.game.credits}`, 30, 530, 5);
        }
        
        if (this.state === 'ready') {
            this.game.sprite.renderText("ready!", 180, 275, 5);
        }
        
        if (this.game.levelComplete) {
            const levelText = `LEVEL ${this.game.currentLevel + 1}`;
            this.game.sprite.renderText(levelText, 160, 270, 5);
        }
    }
}

class GameOverStage extends BaseStage {
    constructor(game) {
        super(game);
        this.timer = 0;
    }

    onEnter(options = {}) {
        this.game.gameState = "gameover";
        this.game.soundManager.stopSiren();
        this.timer = 0;
    }

    update(deltaTime) {
        this.timer += deltaTime;
        
        if (this.timer > 5000) {
            this.game.pacman.setAutoPilot(false);
            if (this.game.credits > 0) {
                this.game.credits--;
                console.log(`Crédito usado. Restantes: ${this.game.credits}`);
                return { stage: STAGE_TYPE.CREDITS };
            } else {
                return { stage: STAGE_TYPE.INTRO };
            }
        }
        
        return null;
    }

    render(_deltaTime) {
        this.game.clearScreen();
        this.game.sprite.renderStage(this.game.actualStage);
        this.game.pacman.draw();
        this.game.ghosts.forEach(g => g.draw());
        this.game.scoreManager.update();
        this.game.sprite.renderText("game over", 160, 270, 5);
        
        if (this.game.credits > 0) {
            this.game.sprite.renderText(`credits ${this.game.credits}`, 220, 300, 5);
        } else {
            this.game.sprite.renderText("press r", 190, 300, 5);
        }
    }
}

class WinStage extends BaseStage {
    constructor(game) {
        super(game);
        this.timer = 0;
    }

    onEnter(options = {}) {
        this.timer = 0;
    }

    update(deltaTime) {
        this.timer += deltaTime;
        
        if (this.timer > 5000) {
            return { stage: STAGE_TYPE.INTRO };
        }
        
        return null;
    }

    render(_deltaTime) {
        this.game.clearScreen();
        this.game.sprite.renderText("YOU WIN!", 170, 270, 5);
        this.game.scoreManager.update();
    }
}

class CreditsStage extends BaseStage {
    constructor(game) {
        super(game);
        this.timer = 0;
    }

    onEnter(options = {}) {
        this.game.gameState = "credits";
        this.timer = 0;
    }

    update(deltaTime) {
        this.timer += deltaTime;
        return null;
    }

    render(_deltaTime) {
        this.game.clearScreen();
       

        this.game.sprite.renderText("high score", 155, -49, 5);
        this.game.sprite.renderText("1up", 45, -49, 5);
        this.game.sprite.renderText("0", 50, -30, 5);


        
        if (this.game.credits > 0) {
            this.game.sprite.renderText(`credit ${this.game.credits}`, 30, 530, 5);
        } else {
            this.game.sprite.renderText("insert coin", 150, 270, 5);
        }
        
        this.game.sprite.renderText("push start button", 120, 190, 9);
        this.game.sprite.renderText("1 player only", 150, 250, 8);

        this.game.sprite.renderText("bonus pacman for 1000 *", 60, 320, 7); 

        this.game.sprite.renderText("developer victor morales", 60, 370, 4); 
        this.game.sprite.renderText("ig: vitoXmh", 60, 400, 4);
        this.game.sprite.renderSprite(130,450,this.game.sprite.getSprite("copy"));
        this.game.sprite.renderSprite(160,450,this.game.sprite.getSprite("namco"));
        this.game.sprite.renderText("2026", 280, 452, 7); 
       
    }
}

class SelectCharacterStage extends BaseStage {
    constructor(game) {
        super(game);
        this.timer = 0;
        this.selectedIndex = 0;
    }

    onEnter(options = {}) {
        this.game.gameState = "select_character";
        this.timer = 0;
        this.selectedIndex = this.game.selectedCharacter || 0;
    }

    update(deltaTime) {
        this.selectedIndex = this.game.selectedCharacter || 0;
        this.timer += deltaTime;
        return null;
    }

    render(_deltaTime) {
        this.game.clearScreen();
         this.game.sprite.renderText("high score", 155, -49, 5);
        this.game.sprite.renderText("1up", 45, -49, 5);
        this.game.sprite.renderText("0", 50, -30, 5);
       
        
        this.game.sprite.renderText("select character", 130, 150, 8);
        
        const y1 = 230;
        const y2 = 340;
        const offset = this.selectedIndex === 0 ? 0 : 0;
        
   
        const pacmanSprite = this.game.sprite.getSprite("pacman", 0);
        this.game.sprite.renderSprite(160 + offset, y1, pacmanSprite, 0, false);
        this.game.sprite.renderText("pac-man", 200, y1 + 10, (this.selectedIndex === 0 ? 3 : 5));
        
 
        const mspacmanSprite = this.game.sprite.getSprite("mspacman", 1);
        this.game.sprite.renderSprite(160 + (this.selectedIndex === 1 ? 0 : 0), y2, mspacmanSprite, 0, false);
        this.game.sprite.renderText("ms-pac-man", 200, y2 + 10, (this.selectedIndex === 1 ? 3 : 5));

        if (this.game.credits > 0) {
            this.game.sprite.renderText(`credit ${this.game.credits}`, 30, 530, 5);
        }
    }
}

class AnimationStage extends BaseStage {
    constructor(game) {
        super(game);
        this.animationType = null;
        this.onComplete = null;
        this.callback = null;
    }

    onEnter(options = {}) {
        this.animationType = options.animationType || 'default';
        this.onComplete = options.onComplete || null;
        this.callback = options.callback || null;
        this.timer = 0;
    }

    update(deltaTime) {
        this.timer += deltaTime;
        
        if (this.callback && this.callback(this.timer, deltaTime)) {
            return this.onComplete || null;
        }
        
        return null;
    }

    render(_deltaTime) {
        if (this.callback) {
            this.callback(this.timer, 0, true);
        }
    }
}
