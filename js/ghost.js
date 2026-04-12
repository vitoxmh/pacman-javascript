class Ghost {


    constructor(ctx, sprite, size, map, startX, startY, color = 'red', pacman = null, blinky = null) {


        this.ctx = ctx;
        this.sprite = sprite;
        this.tileSize = size;
        this.map = map;
        this.color = color;
        this.pacman = pacman;
        this.blinky = blinky;
        
        this.coloredSpriteCache = {};

        this.x = startX;
        this.y = startY;

        this.houseTimer = 0;   // tiempo moviéndose adentro
        this.inHouseBounce = false;  // si está haciendo rebote interno

        this.direction = "left";
        this.moving = false;
        this.target = { x: this.x, y: this.y };

        // Animación
        this.animFrame = 0;
        this.animTime = 0;
        this.animSpeed = CONFIG.ghost.animSpeed;

        // --------- NUEVOS MODOS ----------
        this.mode = "scatter"; // scatter | chase | frightened | flash | dead | house
        this.modeTimer = 0;
        this.frightenedTimer = 0;
        this.flashTime = 0;
        this.speedFactor = 1;
        this.lockDead = false;
        this.degMode = false;
        this.pause = false;



        this.scriptTarget = null;
        this.scriptSpeed = 5; // tiles por segundo

        
        // Scatter corners
        this.scatterTarget = { x: 1, y: 1 };
        if (color === "pink")   this.scatterTarget = { x: 30, y: 1 };
        if (color === "cyan")   this.scatterTarget = { x: 27, y: 1 };
        if (color === "orange") this.scatterTarget = { x: 27, y: 30 };

        // Ghost House
        this.door = { x: 13.5,y: 15 };
        this.home  = { x: 14, y: 15 }; // interior real
        
        this.initialReleaseDelay = 0;
      

       



        // --- ESTADOS PAC-MAN ORIGINALES ---
        this.state = "normal";  // inHouse, exiting, normal, dead, reviving

        // Movimiento dentro de la casa
        this.houseTop = 13.5;
        this.houseBottom = 14.5;
        this.houseDir = -1; // sube/baja

        // Punto de entrada/salida
        this.doorX = 13.5;
        this.doorY = 14;

        // Timer de salida
         // ms (puedes personalizar por fantasma)
        this.exitTimer = 0;

        // Punto exacto de revivir
        this.reviveX = 13.5;
        this.reviveY = 15;


        if (color === "pink")   this.exitDelay = CONFIG.ghost.exitDelay.pink;
        if (color === "cyan")   this.exitDelay = CONFIG.ghost.exitDelay.cyan;
        if (color === "orange") this.exitDelay = CONFIG.ghost.exitDelay.orange;


         // Todos menos Blinky empiezan dentro de la casa
        if (color !== "red") {

            //this.mode = "house";
            this.hasExitedInitially = false;
            this.mode = "house";
             this.state = "inHouse";
              this.direction = "up";
           
        }


        window.addEventListener("keydown", e => {
            if (e.key === "d") {

                this.degMode = !this.degMode;
                console.log("Debug mode ghosts:", this.degMode);
                
              
            }
        });
                
    }

    // --------------------------------------
    // UTILIDADES
    // --------------------------------------

    getCell(x, y) {
        this._row = Math.floor(y);
        this._col = Math.floor(x);
        return { row: this._row, col: this._col };
    }

    setMap(mapData) {
        this.map = mapData;
        this._buildTunnelCache();
    }

    _buildTunnelCache() {
        this._tunnelSet = new Set();
        const rowCount = this.map.length;
        const lastCol = this.map[0].length - 1;
        for (let i = 0; i < rowCount; i++) {
            const first = this.map[i][0];
            const last = this.map[i][lastCol];
            if ((first === 0 || first === 39) && (last === 0 || last === 39)) {
                this._tunnelSet.add(i);
            }
        }
    }

    canMove(x, y, direction) {
        const row = Math.floor(y);
        const col = Math.floor(x);
        const mapRow = this.map[row];
        if (!mapRow) return false;

        const cols = this.map[0].length;

        if (this._tunnelSet.has(row)) {
            if (direction === 'left' && col === 0) return true;
            if (direction === 'right' && col === cols - 1) return true;
        }

        const { dx, dy } = DIRECTION_VECTORS[direction];
        const tile = this.map[row + dy]?.[col + dx];
        if (tile === undefined) return false;

        if (this.mode === "dead" || this.mode === "reviving") {
            return tile === 0 || tile === 38 || tile === 36 || tile === 37 || tile === 39;
        }

        return tile === 0 || tile === 36 || tile === 37 || tile === 39;
    }


    opposite(dir) {
        if (dir === 'up') return 'down';
        if (dir === 'down') return 'up';
        if (dir === 'left') return 'right';
        if (dir === 'right') return 'left';
        return dir;
    }

    // --------------------------------------
    // OBJETIVO SEGÚN MODO
    // --------------------------------------
    getChaseTarget() {

        if (!this.pacman) return { x: this.x, y: this.y };

        const px = this.pacman.x;
        const py = this.pacman.y;
        const dir = this.pacman.direction;

        // Scatter primero
        if (this.mode === "scatter") {
            return this.scatterTarget;
        }

        if(this.mode === "reviving"){
            if(this.color === "orange"){
                 return { x: 15, y: 9 };
            }else {
                return { x: 14, y: 11 };
            }
        }

        // Dead mode: vuelve a la Ghost House
        if (this.mode === "dead") {
            if (this.y < this.door.y) {
                return { x: this.door.x, y: this.door.y };
            }
            if (Math.abs(this.x - this.door.x) < 0.2 && Math.abs(this.y - this.door.y) < 0.2) {
                return this.home;  
            }
            return this.door;
        }

        // Frightened / Flash → huir de Pac-Man pero con randomness
        if (this.mode === "frightened" || this.mode === "flash") {
            const fleeX = this.x + (this.x - px) * 2;
            const fleeY = this.y + (this.y - py) * 2;
            const randX = (Math.random() - 0.5) * 4;
            const randY = (Math.random() - 0.5) * 4;
            return { x: fleeX + randX, y: fleeY + randY };
        }

        // ----------- CHASE NORMAL -----------
        switch (this.color) {
            case 'red': 
                return { x: px, y: py };

            case 'pink':
                let pinkTargetX = px;
                let pinkTargetY = py;
                if (dir === 'up') pinkTargetY -= 4;
                else if (dir === 'down') pinkTargetY += 4;
                else if (dir === 'left') pinkTargetX -= 4;
                else if (dir === 'right') pinkTargetX += 4;
                return { x: pinkTargetX, y: pinkTargetY };

            case 'cyan':
                if (!this.blinky) return { x: px, y: py };
                let targetX = px;
                let targetY = py;
                if (dir === 'up') targetY -= 2;
                else if (dir === 'down') targetY += 2;
                else if (dir === 'left') targetX -= 2;
                else if (dir === 'right') targetX += 2;
                
                const vectorX = targetX - this.blinky.x;
                const vectorY = targetY - this.blinky.y;
                return { 
                    x: this.blinky.x + 2 * vectorX, 
                    y: this.blinky.y + 2 * vectorY 
                };

            case 'orange':
                const dx = px - this.x;
                const dy = py - this.y;
                if (dx * dx + dy * dy >= 64) return { x: px, y: py };
                return this.scatterTarget;
        }

        return { x: px, y: py };
    }

    // --------------------------------------
    // ACTUALIZACIÓN
    // --------------------------------------
    update(deltaTime = 16) {

        if (this.pause) return;

        const seconds = deltaTime / 1000;

        if (!Number.isFinite(deltaTime) || deltaTime <= 0) return;




        // Velocidad según modo
        this.speedFactor = (this.mode === "dead") ? (CONFIG.ghost.deadSpeed / CONFIG.ghost.baseSpeed) : 
                        (this.mode === "frightened" || this.mode === "flash") ? (CONFIG.ghost.frightenedSpeed / CONFIG.ghost.baseSpeed) : 1;

        if(this.mode === "reviving" || this.mode === "house"){
            this.speedFactor = CONFIG.ghost.houseSpeed / CONFIG.ghost.baseSpeed;
        }


                    // --- ANIMACIÓN ---
        this.animTime += seconds;
        if (this.animTime >= 1 / this.animSpeed) {
            this.animTime = 0;
            this.animFrame = (this.animFrame + 1) % 2;
        }


        const { row, col } = this.getCell(this.x, this.y);


                switch (this.state) {

            case "inHouse":
                this.updateInHouse(seconds);
                return;

            case "exiting":
                this.updateExiting(seconds);
                return;

            case "dead":
                this.updateDead(seconds);
             

            case "reviving":
                this.updateReviving(seconds);
                return;

                // sigue al comportamiento normal de tu clase
                break;
        }




        if (this.mode === "movingToPoint" && this.scriptTarget) {


            const step = this.scriptSpeed * seconds;

            let dx = this.scriptTarget.x - this.x;
            let dy = this.scriptTarget.y - this.y;
            let distance = Math.sqrt(dx*dx + dy*dy);

            if (distance < 0.02) {
                // llegó al punto
                this.x = this.scriptTarget.x;
                this.y = this.scriptTarget.y;

                this.scriptTarget = null;
                this.mode = "idle"; // o "chase", o lo que quieras
                this.moving = false;

                return;
            }

            this.x += (dx / distance) * step;
            this.y += (dy / distance) * step;

            // Actualiza dirección visual
            if (Math.abs(dx) > Math.abs(dy)) {
                this.direction = dx > 0 ? "right" : "left";
            } else {
                this.direction = dy > 0 ? "down" : "up";
            }

            return; // IMPORTANTE: no ejecutar la IA normal
        }





        if(this.mode === "dead" && (col == 14 && row == 14)){

                this.mode = "reviving";
                this.moving = true;
                this.direction = "up";

                this.target = {x:13.5, y:14}
              
            
             if (Math.abs(this.x - Math.round(this.x)) < 0.5 ||
                Math.abs(this.y - Math.round(this.y)) < 0.5) {

                this.x = Math.round(this.x * 1000) / 1000;
                this.y = Math.round(this.y * 1000) / 1000;
            }

           
        }

 
        if(this.mode === "reviving" && (col == 14 && row == 11)){
            
            this.mode = "chase";
            this.moving = false;
            this.direction = "up";

            if (Math.abs(this.x - Math.round(this.x)) < 0.5 ||
                Math.abs(this.y - Math.round(this.y)) < 0.5) {

                this.x = Math.round(this.x * 1000) / 1000;
                this.y = Math.round(this.y * 1000) / 1000;
            }

        }

        let baseSpeed = CONFIG.ghost.baseSpeed;

        const currentTile = this.map[row]?.[col];
        if (currentTile === 39) {
            baseSpeed = CONFIG.ghost.tunnelSpeed;
        }

        const moveStep = baseSpeed * seconds * this.speedFactor;


        // --- MODO TIMERS ---
        this.modeTimer += seconds;
        if (this.mode === "scatter" && this.modeTimer >= CONFIG.ghost.scatterDuration) {
            this.mode = "chase"; this.modeTimer = 0;
        } else if (this.mode === "chase" && this.modeTimer >= CONFIG.ghost.chaseDuration) {
            this.mode = "scatter"; this.modeTimer = 0;
        }

        if (this.mode === "frightened") {
            this.frightenedTimer += seconds;
            if (this.frightenedTimer >= CONFIG.ghost.frightenedDuration) {
                this.mode = "flash"; this.frightenedTimer = 0;
            }
        } else if (this.mode === "flash") {
            this.flashTime += seconds;
            if (this.flashTime >= CONFIG.ghost.flashDuration) {
                this.mode = "chase"; this.flashTime = 0;
            }
        }

        // --- SI NO ESTÁ MOVIDO, CALCULAR NUEVA DIRECCIÓN ---
        if (!this.moving) {
            
            const target = this.getChaseTarget();


            let possibleDirs = ['up','down','left','right'].filter(d => this.canMove(this.x, this.y, d));
        

            if (this.mode === "dead") {
                // DEAD MODE: usar chooseDeadDirection, permite retroceder
                this.direction = this.chooseDeadDirection(possibleDirs, target);

                
            } else {
                // MODO NORMAL: evita retroceder
                possibleDirs = possibleDirs.filter(d => d !== this.opposite(this.direction));
                this.direction = this.chooseDirection(possibleDirs, target);
            }

     

            // --- TARGET TILE ---
            this.target = {
                x: this.x + (this.direction === 'right' ? 1 : this.direction === 'left' ? -1 : 0),
                y: this.y + (this.direction === 'down' ? 1 : this.direction === 'up' ? -1 : 0)
            };

            this.moving = true;
        }

        // --- MOVIMIENTO SUAVE ---
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const distance = Math.sqrt(dx*dx + dy*dy);

        if (distance <= moveStep) {
            
            this.x = Math.round(this.target.x * 1000) / 1000;
            this.y = Math.round(this.target.y * 1000) / 1000;

            // Snap exacto al centro del tile
            this.snapToTileCenter();
            this.moving = false;

        } else {

            this.x += (dx / distance) * moveStep ;
            this.y += (dy / distance) * moveStep;
            
        }

       // =======================
        // TELEPORT TÚNEL (ARCADE)
        // =======================
        const cols = this.map[0].length;

        // IZQUIERDA → DERECHA
        if (this.x <= -0.5) {
            this.x = cols - 1;
            this.moving = false;

            // 🔒 mantener dirección
            this.target = {
                x: this.x + (this.direction === 'right' ? 1 : -1),
                y: this.y
            };

            return; // ⛔ no recalcular IA este frame
        }

        // DERECHA → IZQUIERDA
        if (this.x >= cols - 0.5) {
            this.x = 0;
            this.moving = false;

            this.target = {
                x: this.x + (this.direction === 'right' ? 1 : -1),
                y: this.y
            };

            return;
        }



    }


    // --------------------------------------
    // DRAW
    // --------------------------------------
    draw() {


        const ctx = this.ctx;
        const w = this.tileSize * 2;

        let dx = this.x * w - 5;
        let dy = this.y * w - 5;
        

        // DEAD MODE (solo ojos)
       

        // NORMAL / FRIGHTENED / FLASH
        let bodyColor = this.color;
     
        // ojos (excepto frightened)
        if (this.mode !== "frightened" && this.mode !== "flash") {
         
        }

        let reverse = false;
        let ghostSpriteGet = 'ghost';

        if (this.mode === "dead") {
            
            reverse = false; 
            ghostSpriteGet = 'eyes-'+this.direction;

        }else if (this.mode === "flash"){

          ghostSpriteGet = this.animFrame === 0 ? 'ghost-frightened' : 'ghost-flash';


        }else if(this.mode === "frightened"){

            reverse = false; 
            ghostSpriteGet = 'ghost-frightened';
            
        }else if (this.direction === 'right'){

            reverse = false; 
            ghostSpriteGet = 'ghost';

        }else if (this.direction === 'left') {

            reverse = true; 
            ghostSpriteGet = 'ghost';

        }else if (this.direction === 'up'){

             reverse = false; 
             ghostSpriteGet = 'ghost-up';

        }else if(this.direction === 'down'){

            reverse = false; 
            ghostSpriteGet = 'ghost-down';


        }


        let ghostSprites = this.sprite.getSprite(ghostSpriteGet,this.animFrame);

        let ghostSpritesColor = ghostSprites;

        if (this.color !== 'red' && this.mode !== "dead" && this.mode !== "eaten" && this.mode !== "eyes-left" && this.mode !== "eyes-right" && this.mode !== "eyes-up" && this.mode !== "eyes-down") {
            const cacheKey = `${ghostSpriteGet}-${this.animFrame}-${this.color}`;
            
            if (!this.coloredSpriteCache[cacheKey]) {
                const colorMap = { 'pink': 7, 'cyan': 8, 'orange': 9 };
                const newColor = colorMap[this.color];
                
                this.coloredSpriteCache[cacheKey] = ghostSprites.map(fila =>
                    fila.map(valor => valor === 4 ? newColor : valor)
                );
            }
            
            ghostSpritesColor = this.coloredSpriteCache[cacheKey];
        }

        if(this.mode === "eaten"){
            ghostSpritesColor = this.sprite.getSprite('empty');
        }

        


        this.sprite.renderSprite(dx,dy,ghostSpritesColor,0,reverse);


        if(this.degMode){
            this.debugDraw();

        }
        
        ctx.restore();
    }

    // --------------------------------------
    // LLAMAR CUANDO PAC-MAN COME POWER PELLET
    // --------------------------------------
    frighten() {
        if (this.mode === "dead") return; // no se asusta si está muerto
        this.mode = "frightened";
        this.frightenedTimer = 0;
        this.modeTimer = 0;
    }

    // --------------------------------------
    // LLAMAR CUANDO PAC-MAN TOCA UN FANTASMA
    // --------------------------------------
    die() {

        this.mode = "eaten";
        this.moving = false;
        this.direction = this.opposite(this.direction); // ← FIX ARCADE
        this.modeTimer = 0;
        this.pauseMovement(true);
        this.pacman.pauseMovement(true);


        setTimeout(() => {
            this.pauseMovement(false);
            this.pacman.pauseMovement(false);
            this.mode = "dead";
        }, 1000);

    }


    chooseDirection(possibleDirs, target) {
        if (possibleDirs.length === 0) return this.direction;
        
        const currentDir = this.direction;
        const opposite = this.opposite(currentDir);
        
        let best = null;
        let bestDist = Infinity;
        
        for (const dir of possibleDirs) {
            if (dir === opposite && possibleDirs.length > 1) continue;

            let nx = this.x + (dir === 'right' ? 1 : dir === 'left' ? -1 : 0);
            let ny = this.y + (dir === 'down' ? 1 : dir === 'up' ? -1 : 0);

            let dist = (target.x - nx) * (target.x - nx) +
                       (target.y - ny) * (target.y - ny);

            if (dir === currentDir) {
                dist *= 0.9;
            }

            if (dist < bestDist) {
                bestDist = dist;
                best = dir;
            }
        }

        if (!best) {
            const filtered = possibleDirs.filter(d => d !== opposite);
            if (filtered.length > 0) {
                best = filtered[0];
            } else {
                best = possibleDirs[0];
            }
        }

        return best;
    }


    chooseDeadDirection(possibleDirs, target) {
        
        if (possibleDirs.length === 0) return this.direction;

        let best = null;
        let bestDist = Infinity;


        for (const d of possibleDirs) {
            let nx = this.x + (d === 'right' ? 1 : d === 'left' ? -1 : 0);
            let ny = this.y + (d === 'down' ? 1 : d === 'up' ? -1 : 0);

            const dist = (target.x - nx) ** 2 + (target.y - ny) ** 2;

            if (dist < bestDist) {
                bestDist = dist;
                best = d;
            }
        }


        if (best === this.opposite(this.direction) && possibleDirs.length > 1) {
            const filtered = possibleDirs.filter(d => d !== this.opposite(this.direction));
            if (filtered.length > 0) return this.chooseDeadDirection(filtered, target);
        }

        return best;
    }

    snapToTileCenter() {
        // Solo snapea en dead mode o si está muy cerca del centro de un tile
        const cx = Math.round(this.x);
        const cy = Math.round(this.y);

        if (this.mode === "dead" || Math.abs(this.x - cx) < 0.12) this.x = cx;
        if (this.mode === "dead" || Math.abs(this.y - cy) < 0.12) this.y = cy;
    }


    debugDraw() {
        const ctx = this.ctx;
        const w = this.tileSize * 2;

        ctx.save();

        // TILE ACTUAL
        const { row, col } = this.getCell(this.x, this.y);
        const tileX = col * w;
        const tileY = row * w;

        // Cuadrado azul = tile actual
        ctx.strokeStyle = "rgba(0,150,255,0.8)";
        ctx.lineWidth = 2;
        ctx.strokeRect(tileX, tileY + this.sprite.paddingTop, w, w);

        // Punto amarillo = ghost
        ctx.fillStyle = "yellow";
        ctx.beginPath();
        ctx.arc(this.x * w, this.y * w + this.sprite.paddingTop, 4, 0, Math.PI * 2);
        ctx.fill();

        // TARGET TILE
        const t = this.getChaseTarget();
        ctx.fillStyle = "rgba(255,0,0,0.4)";
        ctx.fillRect(t.x * w - w/2, t.y * w - w/2 + this.sprite.paddingTop, w, w);

        // Línea hacia target
        ctx.strokeStyle = "red";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x * w, this.y * w + this.sprite.paddingTop);
        ctx.lineTo(t.x * w, t.y * w + this.sprite.paddingTop);
        ctx.stroke();

        // === TEXTO DEBUG ===
        ctx.fillStyle = "white";
        ctx.font = "14px Arial";

        // Dirección actual
        ctx.fillText(`dir: ${this.direction}`, this.x * w + 10, this.y * w - 10 + this.sprite.paddingTop);

        // Row y Col actuales
        ctx.fillText(`row: ${row}`, this.x * w + 10, this.y * w - 26 + this.sprite.paddingTop);
        ctx.fillText(`col: ${col}`, this.x * w + 10, this.y * w - 42 + this.sprite.paddingTop);
        // NUEVO → row/col del target
        ctx.fillStyle = "cyan";
        ctx.fillText(`tRow: ${t.y}`, this.x * w + 10, this.y * w - 58 + this.sprite.paddingTop);
        ctx.fillText(`tCol: ${t.x}`, this.x * w + 10, this.y * w - 74 + this.sprite.paddingTop);
        // DIRECCIONES POSIBLES
        const dirs = ["up", "down", "left", "right"];
        let yOffset = 15;

        dirs.forEach(dir => {
            const can = this.canMove(this.x, this.y, dir);
            ctx.fillStyle = can ? "lime" : "red";
            ctx.fillText(`${dir}: ${can}`, this.x * w + 10, this.y * w + yOffset + this.sprite.paddingTop);
            yOffset += 14;
        });

        ctx.restore();
    }

    isInsideHouseInterior() {
        const { row, col } = this.getCell(this.x, this.y);
        return (
            col >= 12 && col <= 15 &&
            row >= 11 && row <= 13     // interior real, sin incluir puerta
        );
    }


    startMoveTo(x, y, speed = 5) {
        this.mode = "movingToPoint"; 
        this.scriptTarget = { x, y };
        this.scriptSpeed = speed;
    }


    
    updateInHouse(seconds) {

        this.exitTimer += seconds * 1000;

        // Velocidad constante en la casa (igual en X y en Y)
        const houseSpeed = CONFIG.ghost.houseSpeed;

        // ------------------------------------------------------------
        //    SI AÚN NO DEBE SALIR → SOLO ARRIBA/ABAJO
        // ------------------------------------------------------------
        if (this.exitTimer < this.exitDelay) {

            this.y += this.houseDir * houseSpeed * seconds;

            if (this.y <= this.houseTop) {
                this.houseDir = 1;
                this.direction = "down";
            }

            if (this.y >= this.houseBottom) {
                this.houseDir = -1;
                this.direction = "up";
            }

            return;
        }

        // ------------------------------------------------------------
        //     LÓGICA DE SALIDA: SOLO MOVER EN X CON LA MISMA VELOCIDAD
        // ------------------------------------------------------------

        // Detener movimiento vertical
        this.direction = (this.doorX > this.x) ? "right" : "left";

        // Movimiento horizontal con misma velocidad que arriba/abajo
        if (this.x < this.doorX) {
            this.x += houseSpeed * seconds;
            if (this.x > this.doorX) this.x = this.doorX;
        } else {
            this.x -= houseSpeed * seconds;
            if (this.x < this.doorX) this.x = this.doorX;
        }

        // Una vez centrado, cambiar estado
        if (Math.abs(this.x - this.doorX) < 0.05) {
            this.x = this.doorX;
            this.state = "exiting";
        }
    }



    updateExiting(seconds) {

        const speed = this.speedFactor * 6;

        // 1) Asegurar que está EXACTO en la puerta antes de subir
        // (solo la primera vez que entra en exiting)
        if (!this.exitingAligned) {
            this.x = this.doorX;
            this.y = Math.round(this.y * 1000) / 1000;
            this.exitingAligned = true;
        }

        // 2) Movimiento recto hacia arriba
        this.y -= speed * seconds;
        this.direction = "up";

        // 3) Cuando sale 1 tile completo → modo normal
        if (this.y <= this.doorY - 1) {
            this.y = this.doorY - 1;
            this.state = "chase";
            this.mode = "reviving";
            this.direction = "up";

            this.moving = false;
            this.exitingAligned = false;
        }



    
    }



    updateDead(seconds) {
        const speed = CONFIG.ghost.deadSpeed;
        
        const dx = this.doorX - this.x;
        const dy = this.doorY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0.1) {
            const moveX = (dx / dist) * speed * seconds;
            const moveY = (dy / dist) * speed * seconds;
            this.x += moveX;
            this.y += moveY;
            
            if (Math.abs(dx) > Math.abs(dy)) {
                this.direction = dx > 0 ? "right" : "left";
            } else {
                this.direction = dy > 0 ? "down" : "up";
            }
        } else {
            this.x = this.doorX;
            this.y = this.doorY;
            this.state = "reviving";
        }
    }

    updateReviving(seconds) {
        const speed = CONFIG.ghost.houseSpeed * 2;
        const exitY = 11;
        
        if (this.y > exitY) {
            this.y -= speed * seconds;
            this.direction = "up";
        } else {
            this.y = exitY;
            this.mode = "chase";
            this.state = "normal";
            this.direction = "up";
            this.moving = false;
        }
    }


    pauseMovement(paused) {
        this.pause = paused;
    }



    pauseEaten(){
        this.mode = "eaten";
        
    }


    getMode(){
        return this.mode;
    }



}
