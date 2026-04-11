/**
 * Pacman Player Class
 * Handles player movement, animation, collision detection, and game logic
 */
class Pacman {
    constructor(ctx, sprite, size) {
        this.ctx = ctx;
        this.sprite = sprite;
        this.tileSize = size;
        this.speed = CONFIG.pacman.speed;
        this.direction = 'right';
        this.nextDirection = 'right';
        this.map = [];
        this.paused = false;
        this.visible = true;
        this.scoreManager = null;
        this.game = null;
        this.autoPilot = false;
        this.autoPilotTimer = 0;

        this.x = CONFIG.pacman.startX;
        this.y = CONFIG.pacman.startY;

        this.moving = false;
        this.target = { x: this.x, y: this.y };

        this.animFrame = 2;
        this.animTime = 0;
        this.animSpeed = CONFIG.pacman.animSpeed;
        this.mouthOpen = 2;
        this.hasStartedMoving = false;
        
        // Input handling
        this._handleKeyDown = this._handleKeyDown.bind(this);
        window.addEventListener('keydown', this._handleKeyDown);
    }
    
    /**
     * Handle keyboard input for player controls
     * @private
     */
    _handleKeyDown(e) {
        switch (e.key) {
            case 'ArrowUp': this.nextDirection = 'up'; break;
            case 'ArrowDown': this.nextDirection = 'down'; break;
            case 'ArrowLeft': this.nextDirection = 'left'; break;
            case 'ArrowRight': this.nextDirection = 'right'; break;
        }
    }

    /**
     * Set the score manager reference
     * @param {ScoreManager} scoreManager 
     */
    setScoreManager(scoreManager) {
        this.scoreManager = scoreManager;
    }

    /**
     * Set the current map data
     * @param {number[][]} mapData 
     */
    setMap(mapData) {
        this.map = mapData;
    }

    /**
     * Enable or disable auto-pilot mode (for demo)
     * @param {boolean} enabled 
     */
    setAutoPilot(enabled) {
        this.autoPilot = enabled;
    }

    /**
     * Get the cell coordinates from position
     * @param {number} x 
     * @param {number} y 
     * @returns {{row: number, col: number}}
     */
    getCell(x, y) {
        return { row: Math.floor(y), col: Math.floor(x) };
    }
    

    /**
     * Check if pacman can move in the given direction
     * @param {number} x 
     * @param {number} y 
     * @param {'up'|'down'|'left'|'right'} direction 
     * @returns {boolean}
     */
    canMove(x, y, direction) {
        const { row, col } = this.getCell(x, y);
        
        // Check tunnel rows (rows where both ends are open)
        const tunnelRows = [];
        for (let i = 0; i < this.map.length; i++) {
            const leftEdge = this.map[i][0];
            const rightEdge = this.map[i][this.map[i].length - 1];
            if ((leftEdge === 0 || leftEdge === 39) &&
                (rightEdge === 0 || rightEdge === 39)) {
                tunnelRows.push(i);
            }
        }

        // Allow tunnel movement
        if (tunnelRows.includes(row)) {
            if (direction === 'left' && col === 0) return true;
            if (direction === 'right' && col === this.map[0].length - 1) return true;
        }

        // Define walkable tiles
        const walkableTiles = [0, 36, 37, 38, 39]; // empty, pellet, power pellet, door, tunnel
        
        // Check next tile based on direction
        let nextRow = row;
        let nextCol = col;
        
        switch (direction) {
            case 'up': nextRow = row - 1; break;
            case 'down': nextRow = row + 1; break;
            case 'left': nextCol = col - 1; break;
            case 'right': nextCol = col + 1; break;
            default: return false;
        }
        
        // Check bounds and walkable tiles
        if (nextRow < 0 || nextRow >= this.map.length) return false;
        if (nextCol < 0 || nextCol >= this.map[0].length) return false;
        
        return walkableTiles.includes(this.map[nextRow][nextCol]);
    }

    // 🔹 Método principal de movimiento por tiles
    update(deltaTime = 16) {

 

        if (this.paused) return;

        if (this.autoPilot) {
            this.autoPilotTimer += deltaTime;
            if (this.autoPilotTimer > 200) {
                this.autoPilotTimer = 0;
                this.updateAutoPilotDirection();
            }
        }

        const seconds = deltaTime / 1000;

      
        // Si no está en movimiento, planificar el siguiente tile
        if (!this.moving) {
            // Intentar girar primero
            if (this.canMove(this.x, this.y, this.nextDirection)) {
                this.direction = this.nextDirection;
            }

            // Si no puede avanzar en la dirección actual, se queda quieto
            if (!this.canMove(this.x, this.y, this.direction)) return;

            // Calcular nuevo destino (tile siguiente)
            this.target = { x: this.x, y: this.y };
            if (this.direction === 'up') this.target.y -= 1;
            if (this.direction === 'down') this.target.y += 1;
            if (this.direction === 'left') this.target.x -= 1;
            if (this.direction === 'right') this.target.x += 1;

            this.moving = true;
        }

        // Velocidad constante (tiles por segundo)
        const tilesPerSecond = CONFIG.pacman.speed;
      
        const moveStep = tilesPerSecond * seconds;

        // Calcular diferencia hacia el destino
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;

        const distance = Math.sqrt(dx * dx + dy * dy);
      
      
        if (distance <= moveStep) {
            // llegó al centro exacto del tile
            this.x = this.target.x;
            this.y = this.target.y;
            this.moving = false;
           
        } else {
            // moverse proporcional al tiempo real
            this.x += (dx / distance) * moveStep;
            this.y += (dy / distance) * moveStep;
           
        }

        // Control de animación del sprite
        if (this.moving) {
            this.hasStartedMoving = true;
            this.animTime += seconds;
            if (this.animTime >= 1 / this.animSpeed) {
                this.animTime = 0;
                this.animFrame = (this.animFrame + 1) % 3;
                this.mouthOpen = this.animFrame;
            }
        } else if (this.hasStartedMoving) {
            this.animFrame = 2;
            this.mouthOpen = 2;
        }
        
        const { row, col } = this.getCell(this.x, this.y);
        
        // Comer pellet normal
        if (this.map[row][col] === 36) {
            this.game.soundManager.playWaka();
            this.map[row][col] = 0;
            if (this.game) this.game.decrementPelletCount();
            if (this.scoreManager && !this.autoPilot) {
                this.scoreManager.addScore(CONFIG.score.pellet);
                this.scoreManager.pelletEaten();
            }
        }

        // Comer POWER PELLET → activar FRIGHTENED
        if (this.map[row][col] === 37) {
            this.map[row][col] = 0;

            const anyFrightened = this.ghosts ? this.ghosts.some(g => g.mode === "frightened" || g.mode === "flash") : false;
            if (!anyFrightened && !this.game.soundManager.frightAudio) {
                this.game.soundManager.playFright();
            }
            
            if (this.game) this.game.decrementPelletCount();
            if (this.scoreManager && !this.autoPilot) {
                this.scoreManager.addScore(CONFIG.score.powerPellet);
                this.scoreManager.resetEatenCounter();
            }

            // activar modo frightened en todos los fantasmas
            if (this.ghosts) {
                this.ghosts.forEach(g => g.frighten());
            }
        }

        // Verificar colisión con fruta
        if (this.scoreManager && this.scoreManager.isFruitActive()) {
            const fruitPos = this.scoreManager.getFruitPosition();
            const dist = Math.hypot(this.x - fruitPos.x, this.y - fruitPos.y);
            if (dist < 0.3) {
                this.scoreManager.eatFruit();
            }
        }



        // =======================
        // TELEPORT PAC-MAN
        // =======================
        const cols = this.map[0].length;

        // sale por la izquierda → aparece a la derecha
        if (this.x < 0) {
            this.x = cols - 1;
            this.moving = false;
        }

        // sale por la derecha → aparece a la izquierda
        if (this.x >= cols) {
            this.x = 0;
            this.moving = false;
        }



    }

    updateAutoPilotDirection() {
        const directions = ['up', 'down', 'left', 'right'];
        const opposite = { 'up': 'down', 'down': 'up', 'left': 'right', 'right': 'left' };
        
        const validDirections = directions.filter(dir => {
            if (dir === opposite[this.direction]) return false;
            return this.canMove(this.x, this.y, dir);
        });

        if (validDirections.length === 0) {
            const canReverse = this.canMove(this.x, this.y, opposite[this.direction]);
            if (canReverse) {
                this.direction = opposite[this.direction];
                this.nextDirection = this.direction;
            }
            return;
        }

        const chosen = validDirections[Math.floor(Math.random() * validDirections.length)];
        this.nextDirection = chosen;
    }

    draw() {
        const w = this.tileSize * 2;
        const dx = this.x * w - 5;
        const dy = this.y * w - 5;

        if (!this.visible) {
            this.sprite.renderSprite(dx, dy, this.sprite.getSprite('empty'));
            return;
        }

        let spritePacman = this.sprite.getSprite(CONFIG.pacman.type, this.animFrame);

        let reverse = false;
        let rotation = 0;
        switch (this.direction) {
            case 'down': rotation = Math.PI / 2; break;
            case 'left': rotation = 0; reverse = true; break;
            case 'up': rotation = -Math.PI / 2; break;
        }

        this.sprite.renderSprite(dx, dy, spritePacman, rotation, reverse);
    }

    isVisible(visible) {
        this.visible = visible;
    }


    pauseMovement(paused) {
        
        this.paused = paused; 
    }
}
