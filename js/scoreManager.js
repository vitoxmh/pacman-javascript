class scoreManager {

    highScore = 0;
    score = 0;
    ghostCounter = 0;
    eatGhost = CONFIG.score.ghostEat;
    visiblePoints = false;
    pacmanPosition = {x:0,y:0};
    lives = 3;
    pelletsEaten = 0;
    fruitActive = false;
    fruitEaten = false;
    fruitIndex = 0;
    fruitTimer = 0;
    fruitPoints = 0;
    showFruitPoints = false;

    constructor(sprite, game) {
        this.sprite = sprite;
        this.game = game;

        const highScore = localStorage.getItem('highScore')
        if(highScore){
            this.highScore = parseInt(highScore);
        }
    }

    addScore(points) {
        this.score += points;   
        if (this.score > this.highScore) {
            this.highScore = this.score;
        }
    }

    resetScore() {
        this.score = 0;
    }

    getScore() {
        return this.score;
    }

    getHighScore() {
        return this.highScore;
    }

    setLives(lives) {
        this.lives = lives;
    }

    getLives() {
        return this.lives;
    }

    update(){
        this.sprite.renderText("high score", 155, -49, 5);
        this.sprite.renderText("1up", 45, -49, 5);
        this.sprite.renderText(this.getHighScore().toString(), 250, -30, 5);
        this.sprite.renderText(this.getScore().toString(), 50, -30, 5);

        this.draw();
    }
    
    saveHighScore() {
        localStorage.setItem('highScore', this.getHighScore());
    }

    draw(){
        if(this.visiblePoints){
            const dx = this.pacmanPosition.x * 8 * 2 -5;
            const dy = this.pacmanPosition.y * 8 * 2 - 5;
            this.sprite.renderSprite(dx,dy,this.sprite.getSprite('pointGhost', this.ghostCounter-1));
        }

        if (this.showFruitPoints) {
            const dx = this.pacmanPosition.x * 8 * 2;
            const dy = this.pacmanPosition.y * 8 * 2;
            this.sprite.renderText(this.fruitPoints.toString(), dx, dy, 7);
        }

        if (this.fruitActive && !this.fruitEaten) {
            const fruitPos = this.getFruitPosition();
            const dx = fruitPos.x * 8 * 2 - 5; 
            const dy = fruitPos.y * 8 * 2 - 5;
            const fruitSprite = this.getFruitSprite();
            this.sprite.renderSprite(dx, dy, this.sprite.getSprite(fruitSprite, 0));
        }

        this.drawLives();
        this.drawFruitUI();
    }

    drawFruitUI() {
        const level = this.game ? this.game.currentLevel : 1;
        const maxFruits = Math.min(level, CONFIG.fruit.length);
        const startX = 400;
        const startY = 500;
        const spacing = 25;
        
        for (let i = 0; i < maxFruits; i++) {
            const dx = startX - (i * spacing);
            const fruitSprite = CONFIG.fruit[i].sprite;
            this.sprite.renderSprite(dx, startY, this.sprite.getSprite(fruitSprite, 0));
        }
    }

    drawLives() {
        const startX = 50;
        const startY = 500;
        
        for (let i = 0; i < this.lives - 1; i++) {
            const dx = startX + (i * 30);
            this.sprite.renderSprite(dx, startY, this.sprite.getSprite(CONFIG.pacman.type, 2), -Math.PI / 90, false);
        }
    }

    resetEatenCounter(){
        this.ghostCounter = 0;
    }

    eatenCounterIncrement(pacmanX, pacmanY){
        this.ghostCounter += 1;

        this.pacmanPosition = {x: pacmanX, y: pacmanY};
        this.visiblePoints = true;

        setTimeout(() => {
            this.visiblePoints = false;
        }, 1000);

        this.addScore(this.eatGhost[this.ghostCounter - 1]);
    }

    pelletEaten() {
        this.pelletsEaten++;
        
        const appearCount = CONFIG.score.fruitAppear[this.fruitIndex];
        
        if (this.fruitIndex < CONFIG.score.fruitAppear.length && 
            this.pelletsEaten === appearCount) {
            this.fruitActive = true;
            this.fruitEaten = false;
            this.fruitTimer = 0;
        }
    }

    eatFruit() {
        if (this.fruitActive && !this.fruitEaten) {
            this.fruitEaten = true;
            this.fruitActive = false;
            this.fruitIndex++;
            this.fruitPoints = CONFIG.score.fruit[Math.min(this.fruitIndex - 1, CONFIG.score.fruit.length - 1)];
            
            this.pacmanPosition = this.getFruitPosition();
            this.showFruitPoints = true;
            
            setTimeout(() => {
                this.showFruitPoints = false;
            }, 2000);
            
            this.addScore(this.fruitPoints);
            return true;
        }
        return false;
    }

    updateFruit(deltaTime) {
        if (this.fruitActive && !this.fruitEaten) {
            this.fruitTimer += deltaTime;
            if (this.fruitTimer > 9000) {
                this.fruitActive = false;
                this.fruitEaten = false;
            }
        }
    }

    resetFruit() {
        this.pelletsEaten = 0;
        this.fruitActive = false;
        this.fruitEaten = false;
        this.fruitIndex = 0;
        this.fruitTimer = 0;
    }

    getFruitPosition() {
        const level = this.game ? this.game.currentLevel : 1;
        const fruitIndex = Math.min(level - 1, CONFIG.fruit.length - 1);
        return { x: CONFIG.fruit[fruitIndex].x, y: CONFIG.fruit[fruitIndex].y };
    }

    getFruitSprite() {
        const level = this.game ? this.game.currentLevel : 1;
        const fruitIndex = Math.min(level - 1, CONFIG.fruit.length - 1);
        return CONFIG.fruit[fruitIndex].sprite;
    }

    isFruitActive() {
        return this.fruitActive && !this.fruitEaten;
    }
}
