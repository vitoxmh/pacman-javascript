const DIRECTIONS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
};

const OPPOSITE = {
    up: 'down',
    down: 'up',
    left: 'right',
    right: 'left'
};

const DIRECTION_VECTORS = {
    up: { dx: 0, dy: -1 },
    down: { dx: 0, dy: 1 },
    left: { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 }
};

const TILE_IDS = new Set([0, 36, 37, 38, 39]);

class pacman {

    constructor(ctx, sprite, size) {
        this.ctx = ctx;
        this.sprite = sprite;
        this.tileSize = size;
        this.speed = CONFIG.pacman.speed;
        this.direction = 'right';
        this.nextDirection = 'right';
        this.map = [];
        this.tunnelRows = null;
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
        
        this._row = 0;
        this._col = 0;

        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp') this.nextDirection = 'up';
            if (e.key === 'ArrowDown') this.nextDirection = 'down';
            if (e.key === 'ArrowLeft') this.nextDirection = 'left';
            if (e.key === 'ArrowRight') this.nextDirection = 'right';
        });
    }

    setScoreManager(scoreManager) {
        this.scoreManager = scoreManager;
    }

    setType(type) {
        this.type = type;
    }

    setMap(mapData) {
        this.map = mapData;
        this._buildTunnelCache();
    }

    _buildTunnelCache() {
        this.tunnelRows = [];
        const rowCount = this.map.length;
        const lastCol = this.map[0].length - 1;
        for (let i = 0; i < rowCount; i++) {
            const first = this.map[i][0];
            const last = this.map[i][lastCol];
            if ((first === 0 || first === 39) && (last === 0 || last === 39)) {
                this.tunnelRows.push(i);
            }
        }
        this._tunnelSet = new Set(this.tunnelRows);
    }

    setAutoPilot(enabled) {
        this.autoPilot = enabled;
    }

    getCell(x, y) {
        this._row = y | 0;
        this._col = x | 0;
        return { row: this._row, col: this._col };
    }

    canMove(x, y, direction) {
        const row = y | 0;
        const col = x | 0;
        const mapRow = this.map[row];
        if (!mapRow) return false;

        if (this._tunnelSet.has(row)) {
            if (direction === 'left' && col === 0) return true;
            if (direction === 'right' && col === this.map[0].length - 1) return true;
        }

        const { dx, dy } = DIRECTION_VECTORS[direction];
        const targetRow = row + dy;
        const targetCol = col + dx;
        const tile = this.map[targetRow]?.[targetCol];
        return tile !== undefined && TILE_IDS.has(tile);
    }

    update(deltaTime = 16) {
        if (this.paused) return;

        if (this.autoPilot) {
            this.autoPilotTimer += deltaTime;
            if (this.autoPilotTimer > 200) {
                this.autoPilotTimer = 0;
                this._updateAutoPilotDirection();
            }
        }

        const seconds = deltaTime / 1000;

        if (!this.moving) {
            if (this.canMove(this.x, this.y, this.nextDirection)) {
                this.direction = this.nextDirection;
            }

            if (!this.canMove(this.x, this.y, this.direction)) return;

            const { dx, dy } = DIRECTION_VECTORS[this.direction];
            this.target = { x: this.x + dx, y: this.y + dy };
            this.moving = true;
        }

        const tilesPerSecond = CONFIG.pacman.speed;
        const moveStep = tilesPerSecond * seconds;

        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= moveStep) {
            this.x = this.target.x;
            this.y = this.target.y;
            this.moving = false;
        } else {
            const ratio = moveStep / distance;
            this.x += dx * ratio;
            this.y += dy * ratio;
        }

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

        const row = this.y | 0;
        const col = this.x | 0;
        const cellValue = this.map[row]?.[col];

        if (cellValue === 36) {
            this.game.soundManager.playWaka();
            this.map[row][col] = 0;
            if (this.game) this.game.decrementPelletCount();
            if (this.scoreManager && !this.autoPilot) {
                this.scoreManager.addScore(CONFIG.score.pellet);
                this.scoreManager.pelletEaten();
            }
        }

        if (cellValue === 37) {
            this.map[row][col] = 0;

            if (this.ghosts) {
                const anyFrightened = this.ghosts.some(g => g.mode === "frightened" || g.mode === "flash");
                if (!anyFrightened && !this.game.soundManager.frightAudio) {
                    this.game.soundManager.playFright();
                }
            }
            
            if (this.game) this.game.decrementPelletCount();
            if (this.scoreManager && !this.autoPilot) {
                this.scoreManager.addScore(CONFIG.score.powerPellet);
                this.scoreManager.resetEatenCounter();
            }

            if (this.ghosts) {
                this.ghosts.forEach(g => g.frighten());
            }
        }

        if (this.scoreManager && this.scoreManager.isFruitActive()) {
            const fruitPos = this.scoreManager.getFruitPosition();
            const fdx = this.x - fruitPos.x;
            const fdy = this.y - fruitPos.y;
            if (fdx * fdx + fdy * fdy < 0.09) {
                this.scoreManager.eatFruit();
            }
        }

        const cols = this.map[0].length;
        if (this.x < 0) {
            this.x = cols - 1;
            this.moving = false;
        }
        if (this.x >= cols) {
            this.x = 0;
            this.moving = false;
        }
    }

    _updateAutoPilotDirection() {
        const validDirs = [];
        const opp = OPPOSITE[this.direction];
        const dirs = ['up', 'down', 'left', 'right'];
        
        for (let i = 0; i < 4; i++) {
            const dir = dirs[i];
            if (dir !== opp && this.canMove(this.x, this.y, dir)) {
                validDirs.push(dir);
            }
        }

        if (validDirs.length === 0) {
            if (this.canMove(this.x, this.y, opp)) {
                this.direction = opp;
                this.nextDirection = opp;
            }
            return;
        }

        this.nextDirection = validDirs[Math.random() * validDirs.length | 0];
    }

    draw() {
        const dx = this.x * this.tileSize * 2 - 5;
        const dy = this.y * this.tileSize * 2 - 5;

        let spritePacman = this.sprite.getSprite(CONFIG.pacman.type, this.animFrame);

        if (!this.visible) {
            spritePacman = this.sprite.getSprite('empty');
        }

        let reverse = false;
        let rotation = 0;
        
        if (this.direction === 'right') rotation = 0;
        else if (this.direction === 'down') rotation = Math.PI / 2;
        else if (this.direction === 'left') { rotation = 0; reverse = true; }
        else if (this.direction === 'up') rotation = -Math.PI / 2;

        this.sprite.renderSprite(dx, dy, spritePacman, rotation, reverse);
    }

    isVisible(visible) {
        this.visible = visible;
    }

    pauseMovement(paused) {
        this.paused = paused; 
    }
}