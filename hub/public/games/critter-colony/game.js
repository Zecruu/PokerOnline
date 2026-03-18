/* ============================================================
   Critter Colony — Main Game Engine
   ============================================================ */

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.world = new World();

        // Player
        this.player = { x: 0, y: 0, speed: 200 };

        // Camera
        this.cam = { x: 0, y: 0 };

        // State
        this.resources = { wood: 50, stone: 50, food: 30 };
        this.inventory = { traps: 5 };
        this.buildings = [];
        this.critters = [];
        this.wildCritters = [];

        // Input
        this.keys = {};
        this.mouse = { x: 0, y: 0, worldX: 0, worldY: 0 };
        this.placementMode = null; // { type } when placing a building
        this.captureMode = false;

        // Timers
        this.autoSaveTimer = 60;
        this.respawnTimer = 30;
        this.time = 0;
        this.lastTimestamp = 0;

        // State
        this.started = false;
        this.titleScreen = true;

        this._setupInput();
        this._resize();
        window.onresize = () => this._resize();

        // Check for existing save
        this._initTitle();
    }

    async _initTitle() {
        const saveData = await Save.load();
        const titleEl = document.getElementById('titleScreen');
        const hasData = saveData && saveData.gameState;

        let html = '<div class="title-content">';
        html += '<h1 class="title-logo">Critter<span>Colony</span></h1>';
        html += '<p class="title-sub">Capture. Build. Automate.</p>';
        html += '<div class="title-buttons">';
        if (hasData) {
            html += '<button class="title-btn title-continue" onclick="game.loadAndStart()">Continue</button>';
        }
        html += '<button class="title-btn title-new" onclick="game.newGame()">New Game</button>';
        html += '</div>';
        if (!Save.isLoggedIn()) {
            html += '<p class="title-warn">Log in to save your progress!</p>';
        }
        html += '</div>';
        titleEl.innerHTML = html;

        this._saveData = saveData;
    }

    async loadAndStart() {
        if (!this._saveData) return this.newGame();
        const gs = this._saveData.gameState;
        const elapsed = this._saveData.elapsed || 0;

        // Restore world
        this.world.generate(gs.worldSeed);

        // Restore player
        this.player.x = gs.playerPos.x;
        this.player.y = gs.playerPos.y;

        // Restore resources & inventory
        this.resources = { ...gs.resources };
        this.inventory = { ...gs.inventory };

        // Restore buildings
        this.buildings = gs.buildings.map(b => ({
            ...b, workers: [...b.workers],
        }));

        // Restore critters
        this.critters = gs.critters.map(c => ({
            ...c, stats: { ...c.stats },
        }));

        // Spawn wild critters (not saved, regenerated)
        this.wildCritters = Critters.spawnWild(this.world);

        // AFK gains
        if (elapsed > 10) {
            const gains = Save.applyAFKGains(this, elapsed);
            if (gains) {
                const parts = Object.entries(gains).filter(([,v]) => v > 0).map(([k,v]) => `${v} ${k}`);
                if (parts.length > 0) {
                    setTimeout(() => {
                        UI.notify(`Welcome back! (${Save.formatTime(elapsed)}) +${parts.join(', ')}`, 5000);
                    }, 500);
                }
            }
        }

        this._startGame();
    }

    newGame() {
        this.world.generate();
        this.player.x = (COLONY_MIN + 10) * TILE_SIZE;
        this.player.y = (COLONY_MIN + 10) * TILE_SIZE;
        this.resources = { wood: 50, stone: 50, food: 30 };
        this.inventory = { traps: 5 };
        this.buildings = [];
        this.critters = [];
        this.wildCritters = Critters.spawnWild(this.world);
        this._startGame();
    }

    _startGame() {
        document.getElementById('titleScreen').classList.add('hidden');
        document.getElementById('gameUI').classList.remove('hidden');
        this.titleScreen = false;
        this.started = true;
        UI.init(this);
        UI.update();
        this.lastTimestamp = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    // ─── INPUT ───────────────────────────────────────────────
    _setupInput() {
        window.onkeydown = (e) => { this.keys[e.key.toLowerCase()] = true; };
        window.onkeyup = (e) => {
            this.keys[e.key.toLowerCase()] = false;
            if (e.key === 'Escape') {
                this.placementMode = null;
                this.captureMode = false;
                UI.notify('Cancelled');
            }
        };
        this.canvas.onmousemove = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
            this.mouse.worldX = this.mouse.x + this.cam.x;
            this.mouse.worldY = this.mouse.y + this.cam.y;
        };
        this.canvas.onclick = (e) => {
            if (this.titleScreen) return;
            const rect = this.canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left + this.cam.x;
            const my = e.clientY - rect.top + this.cam.y;
            this._handleClick(mx, my);
        };
    }

    _handleClick(wx, wy) {
        const tileX = Math.floor(wx / TILE_SIZE);
        const tileY = Math.floor(wy / TILE_SIZE);

        // Placement mode
        if (this.placementMode) {
            const type = this.placementMode.type;
            if (Buildings.canPlace(tileX, tileY, BUILDING_DEFS[type].size, this.buildings, this.world)) {
                if (Buildings.canAfford(type, this.resources)) {
                    const b = Buildings.place(type, tileX, tileY, this.resources);
                    this.buildings.push(b);
                    UI.notify(`Built ${BUILDING_DEFS[type].name}!`);
                    this.placementMode = null;
                    UI.update();
                } else {
                    UI.notify('Not enough resources!');
                }
            } else {
                UI.notify('Cannot build here!');
            }
            return;
        }

        // Try to capture wild critter
        let closestWild = null;
        let closestDist = Infinity;
        for (const c of this.wildCritters) {
            const dx = c.x - wx;
            const dy = c.y - wy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < TILE_SIZE * 1.5 && dist < closestDist) {
                closestDist = dist;
                closestWild = c;
            }
        }

        if (closestWild) {
            if (this.critters.length >= Buildings.getMaxCritters(this.buildings)) {
                UI.notify('Critter roster full! Build a Nest.');
                return;
            }
            const result = Critters.attemptCapture(closestWild, this);
            if (result.success) {
                this.wildCritters = this.wildCritters.filter(c => c.id !== closestWild.id);
                this.critters.push(result.captured);
                UI.notify(`Captured ${SPECIES[result.captured.species].name}!`);
                UI.update();
            } else {
                UI.notify(result.reason);
            }
            return;
        }
    }

    startPlacement(type) {
        if (!Buildings.canAfford(type, this.resources)) {
            UI.notify('Not enough resources!');
            return;
        }
        this.placementMode = { type };
        UI.notify(`Click colony zone to place ${BUILDING_DEFS[type].name}. ESC to cancel.`);
    }

    assignCritter(critterId, buildingIdStr) {
        const buildingId = buildingIdStr ? parseInt(buildingIdStr) : null;
        const critter = this.critters.find(c => c.id === critterId);
        if (!critter) return;

        // Remove from old building
        if (critter.assignment) {
            const oldB = this.buildings.find(b => b.id === critter.assignment);
            if (oldB) oldB.workers = oldB.workers.filter(w => w !== critterId);
        }

        if (buildingId) {
            const newB = this.buildings.find(b => b.id === buildingId);
            if (newB) {
                newB.workers.push(critterId);
                critter.assignment = buildingId;
                UI.notify(`${critter.nickname} assigned to ${BUILDING_DEFS[newB.type].name}`);
            }
        } else {
            critter.assignment = null;
        }
        UI.update();
    }

    // ─── GAME LOOP ──────────────────────────────────────────
    gameLoop(timestamp) {
        const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1);
        this.lastTimestamp = timestamp;
        this.time = timestamp / 1000;

        this.update(dt);
        this.render();

        requestAnimationFrame((t) => this.gameLoop(t));
    }

    update(dt) {
        // Player movement
        let dx = 0, dy = 0;
        if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
        if (this.keys['s'] || this.keys['arrowdown']) dy += 1;
        if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
        if (this.keys['d'] || this.keys['arrowright']) dx += 1;

        if (dx !== 0 || dy !== 0) {
            const len = Math.sqrt(dx * dx + dy * dy);
            dx /= len; dy /= len;
            const nx = this.player.x + dx * this.player.speed * dt;
            const ny = this.player.y + dy * this.player.speed * dt;
            const ntx = Math.floor(nx / TILE_SIZE);
            const nty = Math.floor(ny / TILE_SIZE);
            if (this.world.isWalkable(ntx, nty)) {
                this.player.x = nx;
                this.player.y = ny;
            } else {
                // Try sliding along axis
                const stx = Math.floor(nx / TILE_SIZE);
                const sty = Math.floor(this.player.y / TILE_SIZE);
                if (this.world.isWalkable(stx, sty)) this.player.x = nx;
                const stx2 = Math.floor(this.player.x / TILE_SIZE);
                const sty2 = Math.floor(ny / TILE_SIZE);
                if (this.world.isWalkable(stx2, sty2)) this.player.y = ny;
            }
        }

        // Camera follow player (lerp)
        const targetCamX = this.player.x - this.canvas.width / 2;
        const targetCamY = this.player.y - this.canvas.height / 2;
        this.cam.x += (targetCamX - this.cam.x) * 0.1;
        this.cam.y += (targetCamY - this.cam.y) * 0.1;

        // Clamp camera
        this.cam.x = Math.max(0, Math.min(MAP_W * TILE_SIZE - this.canvas.width, this.cam.x));
        this.cam.y = Math.max(0, Math.min(MAP_H * TILE_SIZE - this.canvas.height, this.cam.y));

        // Wild critter AI
        Critters.updateWild(dt, this.wildCritters, this.world);

        // Building production
        Buildings.update(dt, this.buildings, this.critters, this.resources);

        // Respawn wild critters
        this.respawnTimer -= dt;
        if (this.respawnTimer <= 0) {
            this.respawnTimer = 30;
            if (this.wildCritters.length < WILD_MIN_COUNT) {
                const needed = WILD_MIN_COUNT - this.wildCritters.length;
                const newWilds = Critters.spawnWild(this.world);
                this.wildCritters.push(...newWilds.slice(0, needed));
            }
        }

        // Auto-save
        this.autoSaveTimer -= dt;
        if (this.autoSaveTimer <= 0) {
            this.autoSaveTimer = 60;
            Save.save(this);
        }

        // Notifications
        UI.updateNotifications(dt);

        // Update resource bar (lightweight, every frame)
        document.getElementById('resWood').textContent = Math.floor(this.resources.wood);
        document.getElementById('resStone').textContent = Math.floor(this.resources.stone);
        document.getElementById('resFood').textContent = Math.floor(this.resources.food);
    }

    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Clear
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, w, h);

        // World tiles
        this.world.render(ctx, this.cam.x, this.cam.y, w, h);

        // Buildings
        for (const b of this.buildings) {
            Buildings.render(ctx, b, this.cam.x, this.cam.y, this.critters, this.time);
        }

        // Wild critters
        for (const c of this.wildCritters) {
            Critters.renderWild(ctx, c, this.cam.x, this.cam.y, this.time);
        }

        // Player
        const px = this.player.x - this.cam.x;
        const py = this.player.y - this.cam.y;
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(px, py + 12, 10, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Body
        ctx.fillStyle = '#4FC3F7';
        ctx.beginPath();
        ctx.arc(px, py, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Placement preview
        if (this.placementMode) {
            const tileX = Math.floor(this.mouse.worldX / TILE_SIZE);
            const tileY = Math.floor(this.mouse.worldY / TILE_SIZE);
            const def = BUILDING_DEFS[this.placementMode.type];
            const canPlace = Buildings.canPlace(tileX, tileY, def.size, this.buildings, this.world);
            const sx = tileX * TILE_SIZE - this.cam.x;
            const sy = tileY * TILE_SIZE - this.cam.y;
            const size = def.size * TILE_SIZE;

            ctx.fillStyle = canPlace ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)';
            ctx.fillRect(sx, sy, size, size);
            ctx.strokeStyle = canPlace ? '#4ade80' : '#f87171';
            ctx.lineWidth = 2;
            ctx.strokeRect(sx, sy, size, size);

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(def.letter, sx + size / 2, sy + size / 2);
        }

        // Notifications (screen space)
        UI.renderNotifications(ctx, w);

        // Capture range indicator near critters
        for (const c of this.wildCritters) {
            const dx = c.x - this.player.x;
            const dy = c.y - this.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy) / TILE_SIZE;
            if (dist < CAPTURE_RANGE + 1) {
                const sx = c.x - this.cam.x;
                const sy = c.y - this.cam.y;
                ctx.strokeStyle = dist < CAPTURE_RANGE ? 'rgba(74,222,128,0.5)' : 'rgba(255,255,255,0.15)';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.arc(sx, sy, 14, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);

                if (dist < CAPTURE_RANGE) {
                    const sp = SPECIES[c.species];
                    ctx.fillStyle = 'rgba(0,0,0,0.6)';
                    ctx.fillRect(sx - 30, sy - 26, 60, 14);
                    ctx.fillStyle = RARITY_COLORS[sp.rarity];
                    ctx.font = '9px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(sp.name, sx, sy - 17);
                }
            }
        }
    }

    _resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    // Serialization helpers
    getState() {
        return {
            worldSeed: this.world.seed,
            playerPos: { x: this.player.x, y: this.player.y },
            resources: this.resources,
            inventory: this.inventory,
            buildings: this.buildings,
            critters: this.critters,
        };
    }
}

// ─── INIT ────────────────────────────────────────────────
const game = new Game();
