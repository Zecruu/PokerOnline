/* ============================================================
   Critter Colony — Main Game Engine (PixiJS Renderer)
   ============================================================ */

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.world = new World();

        this.player = { x: 0, y: 0, speed: 200, hp: 100, maxHp: 100 };
        this.cam = { x: 0, y: 0 };

        this.resources = { wood: 50, stone: 50, food: 30 };
        this.resourceCaps = { wood: 200, stone: 200, food: 150 };
        this.inventory = { traps: 5 };
        this.buildings = [];
        this.critters = [];
        this.wildCritters = [];
        this.projectiles = [];

        // Combat
        this.gunCooldown = 0;
        this.gunDamage = 10;
        this.mouseDown = false;

        // Research
        this.research = {
            gunDamage: 0, storageCap: 0, captureBonus: 0,
            turretDamage: 0, turretRange: 0, afkCap: 0, colonyRadius: 0,
        };
        this.researchInProgress = null;

        // Input
        this.keys = {};
        this.mouse = { x: 0, y: 0, worldX: 0, worldY: 0 };
        this.placementMode = null;
        this._waypointButtons = [];
        this.showFullMap = false;

        // Timers
        this.autoSaveTimer = 60;
        this.respawnTimer = 30;
        this.time = 0;
        this.lastTimestamp = 0;
        this.panelUpdateTimer = 0;

        this.started = false;
        this.titleScreen = true;

        // ─── SOUND ──────────────────────────────────────────
        this.sounds = new GameSounds();

        // ─── PIXI SETUP ─────────────────────────────────────
        this.pixiApp = new PIXI.Application({
            view: this.canvas,
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundColor: 0x1a1a2e,
            antialias: false,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
        });

        // Containers
        this.worldContainer = new PIXI.Container();
        this.chunkContainer = new PIXI.Container();
        this.buildingContainer = new PIXI.Container();
        this.entityContainer = new PIXI.Container();
        this.overlayContainer = new PIXI.Container();

        this.worldContainer.addChild(this.chunkContainer);
        this.worldContainer.addChild(this.buildingContainer);
        this.worldContainer.addChild(this.entityContainer);
        this.pixiApp.stage.addChild(this.worldContainer);
        this.pixiApp.stage.addChild(this.overlayContainer);

        // Chunk texture cache: "cx,cy" → { sprite, dirty }
        this._chunkSprites = new Map();
        // Entity display object pools
        this._entityGfx = new PIXI.Graphics();
        this.entityContainer.addChild(this._entityGfx);
        // Overlay graphics (minimap, indicators, etc.)
        this._overlayGfx = new PIXI.Graphics();
        this.overlayContainer.addChild(this._overlayGfx);
        // Text pool for labels
        this._textPool = [];
        this._textIdx = 0;

        this._setupInput();
        this._resize();
        window.onresize = () => this._resize();
        preloadAllAssets();
        this._initTitle();
    }

    // ─── TEXT POOL ───────────────────────────────────────────
    _getText(str, style) {
        if (this._textIdx < this._textPool.length) {
            const t = this._textPool[this._textIdx];
            t.text = str;
            t.style = style;
            t.visible = true;
            this._textIdx++;
            return t;
        }
        const t = new PIXI.Text(str, style);
        t.anchor.set(0.5, 0.5);
        this.overlayContainer.addChild(t);
        this._textPool.push(t);
        this._textIdx++;
        return t;
    }

    _resetTextPool() {
        for (let i = this._textIdx; i < this._textPool.length; i++) {
            this._textPool[i].visible = false;
        }
        this._textIdx = 0;
    }

    // ─── TITLE SCREEN ───────────────────────────────────────
    async _initTitle() {
        let saveData = null;
        try { saveData = await Save.load(); } catch(e) {}
        // Also check local
        if (!saveData || !saveData.gameState) {
            saveData = Save.loadLocal();
        }
        const titleEl = document.getElementById('titleScreen');
        const hasData = saveData && saveData.gameState;
        let html = '<div class="title-content">';
        html += '<h1 class="title-logo">Critter<span>Colony</span></h1>';
        html += '<p class="title-sub">Capture. Build. Automate.</p>';
        html += '<div class="title-buttons">';
        if (hasData) html += '<button class="title-btn title-continue" onclick="game.loadAndStart()">Continue</button>';
        html += '<button class="title-btn title-new" onclick="game.newGame()">New Game</button>';
        html += '</div>';
        if (!Save.isLoggedIn()) html += '<p class="title-hint">Progress saves locally. Log in for cloud saves!</p>';
        html += '</div>';
        titleEl.innerHTML = html;
        this._saveData = saveData;
    }

    async loadAndStart() {
        if (!this._saveData) return this.newGame();
        const gs = this._saveData.gameState;
        const elapsed = this._saveData.elapsed || 0;
        this.world.generate(gs.worldSeed);
        Save.restoreModifiedChunks(this.world, gs.modifiedChunks);
        if (gs.waypoints) this.world.waypoints = gs.waypoints;
        this.player.x = gs.playerPos.x;
        this.player.y = gs.playerPos.y;
        this.resources = { ...gs.resources };
        this.resourceCaps = gs.resourceCaps || { wood: 200, stone: 200, food: 150 };
        this.inventory = { ...gs.inventory };
        this.buildings = gs.buildings.map(b => {
            const def = BUILDING_DEFS[b.type];
            const maxHp = def ? (def.hp || 100) : 100;
            return { ...b, workers: [...b.workers], turretCooldown: 0, turretTarget: null, hp: b.hp ?? maxHp, maxHp };
        });
        this.critters = gs.critters.map(c => ({ ...c, stats: { ...c.stats } }));
        this.research = gs.research || { gunDamage:0, storageCap:0, captureBonus:0, turretDamage:0, turretRange:0, afkCap:0, colonyRadius:0, critterCap:0, workersPerB:0 };
        this.researchInProgress = gs.researchInProgress || null;
        this.wildCritters = Critters.spawnWild(this.world);
        if (elapsed > 10) {
            const gains = Save.applyAFKGains(this, elapsed);
            if (gains) {
                const parts = Object.entries(gains).filter(([,v]) => v > 0).map(([k,v]) => `${v} ${k}`);
                if (parts.length > 0) setTimeout(() => UI.notify(`Welcome back! (${Save.formatTime(elapsed)}) +${parts.join(', ')}`, 5000), 500);
            }
        }
        this._startGame();
    }

    newGame() {
        // Cleanup old sprites
        for (const c of this.wildCritters) this._cleanupCritterSprite(c);
        for (const b of this.buildings) { if (b._pixiSprite) { b._pixiSprite.destroy({ children: true }); b._pixiSprite = null; } }
        this.world.generate();
        this.player.x = 0; this.player.y = 0;
        this.resources = { wood: 50, stone: 50, food: 30 };
        this.resourceCaps = { wood: 200, stone: 200, food: 150 };
        this.inventory = { traps: 5 };
        this.buildings = []; this.critters = [];
        this.research = { gunDamage:0, storageCap:0, captureBonus:0, turretDamage:0, turretRange:0, afkCap:0, colonyRadius:0, critterCap:0, workersPerB:0 };
        this.researchInProgress = null;
        this.wildCritters = Critters.spawnWild(this.world);
        this._startGame();
    }

    _startGame() {
        document.getElementById('titleScreen').classList.add('hidden');
        document.getElementById('gameUI').classList.remove('hidden');
        this.titleScreen = false; this.started = true;
        this.sounds.init();
        // Clear old chunk sprites
        this._chunkSprites.forEach(cs => { if (cs.sprite.parent) cs.sprite.parent.removeChild(cs.sprite); cs.sprite.destroy(true); });
        this._chunkSprites.clear();
        UI.init(this); UI.update();
        this.lastTimestamp = performance.now();
        this.pixiApp.ticker.add(() => {
            const now = performance.now();
            const dt = Math.min((now - this.lastTimestamp) / 1000, 0.1);
            this.lastTimestamp = now;
            this.time = now / 1000;
            this.update(dt);
            this._pixiRender();
        });
    }

    // ─── INPUT ──────────────────────────────────────────────
    _setupInput() {
        window.onkeydown = (e) => {
            this.keys[e.key.toLowerCase()] = true;
            if (!this.started) return;
            if (e.key.toLowerCase() === 'e') this._handleEKey();
            if (e.key.toLowerCase() === 't') UI.showWaypointMenu = !UI.showWaypointMenu;
            if (e.key.toLowerCase() === 'm') this.showFullMap = !this.showFullMap;
            if (e.key.toLowerCase() === 'b') UI.switchTab('buildings');
            if (e.key === 'Escape') { this.placementMode = null; UI.showWaypointMenu = false; this.showFullMap = false; }
        };
        window.onkeyup = (e) => { this.keys[e.key.toLowerCase()] = false; };
        this.canvas.onmousemove = (e) => {
            const r = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - r.left; this.mouse.y = e.clientY - r.top;
            this.mouse.worldX = this.mouse.x + this.cam.x; this.mouse.worldY = this.mouse.y + this.cam.y;
        };
        this.canvas.onmousedown = (e) => {
            if (this.titleScreen || !this.started) return;
            const r = this.canvas.getBoundingClientRect();
            const mx = e.clientX - r.left, my = e.clientY - r.top;
            const wx = mx + this.cam.x, wy = my + this.cam.y;
            if (UI.showWaypointMenu && this._waypointButtons) {
                for (const btn of this._waypointButtons) {
                    if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
                        this.player.x = btn.wp.x * TILE_SIZE + TILE_SIZE / 2;
                        this.player.y = btn.wp.y * TILE_SIZE + TILE_SIZE / 2;
                        UI.showWaypointMenu = false; UI.notify(`Teleported to ${btn.wp.name}`); return;
                    }
                }
            }
            if (this.placementMode) { this._handlePlacement(wx, wy); return; }
            this.mouseDown = true;
        };
        this.canvas.onmouseup = () => { this.mouseDown = false; };
        this.canvas.onmouseleave = () => { this.mouseDown = false; };
    }

    _handleEKey() {
        for (const wp of this.world.waypoints) {
            if (wp.claimed) continue;
            const dx = this.player.x - (wp.x * TILE_SIZE + TILE_SIZE / 2);
            const dy = this.player.y - (wp.y * TILE_SIZE + TILE_SIZE / 2);
            if (Math.sqrt(dx*dx + dy*dy) < TILE_SIZE * 3) {
                wp.claimed = true;
                wp.name = `Waypoint ${this.world.waypoints.filter(w => w.claimed).length}`;
                UI.notify(`Claimed ${wp.name}! Press T to teleport.`); return;
            }
        }
        let closest = null, closestDist = Infinity;
        for (const c of this.wildCritters) {
            const dx = c.x - this.player.x, dy = c.y - this.player.y;
            const dist = Math.sqrt(dx*dx + dy*dy) / TILE_SIZE;
            if (dist < CAPTURE_RANGE && dist < closestDist) { closestDist = dist; closest = c; }
        }
        if (closest) {
            if (this.critters.length >= Buildings.getMaxCritters(this.buildings, this.research)) { UI.notify('Roster full! Build a Nest.'); return; }
            const result = Critters.attemptCapture(closest, this);
            if (result.success) {
                this._cleanupCritterSprite(closest);
                this.wildCritters = this.wildCritters.filter(c => c.id !== closest.id);
                this.critters.push(result.captured);
                this.sounds.capture();
                UI.notify(`Captured ${SPECIES[result.captured.species].name}!`); UI.update();
            } else UI.notify(result.reason);
        }
    }

    _getCritterTex(species) {
        if (typeof PIXI_CRITTER_TEXTURES === 'undefined' || !_pixiTexturesReady) return null;
        const tex = PIXI_CRITTER_TEXTURES[species];
        if (!tex) return null;
        // Check if base texture has loaded (width > 0 means image data is available)
        if (tex.baseTexture && tex.baseTexture.width > 1) return tex;
        // Fallback: check the HTML Image directly
        const img = typeof CRITTER_SPRITES !== 'undefined' ? CRITTER_SPRITES[species] : null;
        if (img && img.complete && img.naturalWidth > 0) {
            // Re-create texture from loaded image
            try {
                const newTex = PIXI.Texture.from(img);
                PIXI_CRITTER_TEXTURES[species] = newTex;
                return newTex;
            } catch(e) {}
        }
        return null;
    }

    _getBuildingTex(type) {
        if (typeof PIXI_BUILDING_TEXTURES === 'undefined' || !_pixiTexturesReady) return null;
        const tex = PIXI_BUILDING_TEXTURES[type];
        if (!tex) return null;
        if (tex.baseTexture && tex.baseTexture.width > 1) return tex;
        const img = typeof BUILDING_SPRITES !== 'undefined' ? BUILDING_SPRITES[type] : null;
        if (img && img.complete && img.naturalWidth > 0) {
            try {
                const newTex = PIXI.Texture.from(img);
                PIXI_BUILDING_TEXTURES[type] = newTex;
                return newTex;
            } catch(e) {}
        }
        return null;
    }

    _cleanupCritterSprite(critter) {
        if (critter._pixiSprite) {
            critter._pixiSprite.parent?.removeChild(critter._pixiSprite);
            critter._pixiSprite.destroy({ children: true });
            critter._pixiSprite = null;
        }
        if (critter._patrolSprite) {
            critter._patrolSprite.parent?.removeChild(critter._patrolSprite);
            critter._patrolSprite.destroy({ children: true });
            critter._patrolSprite = null;
        }
        // Clean up building worker sprites
        for (const key of Object.keys(critter)) {
            if (key.startsWith('_bldgWorker') && critter[key] instanceof PIXI.Sprite) {
                critter[key].parent?.removeChild(critter[key]);
                critter[key].destroy();
                delete critter[key];
            }
        }
    }

    _shoot(wx, wy) {
        if (this.gunCooldown > 0) return;
        this.gunCooldown = 0.5;
        const angle = Math.atan2(wy - this.player.y, wx - this.player.x);
        const speed = 400, damage = this.gunDamage + (this.research.gunDamage || 0) * 5;
        this.projectiles.push({ x: this.player.x, y: this.player.y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, damage, lifetime: 2, fromTurret: false });
        this.sounds.shoot();
    }

    _handlePlacement(wx, wy) {
        const tx = Math.floor(wx / TILE_SIZE), ty = Math.floor(wy / TILE_SIZE);
        const type = this.placementMode.type, def = BUILDING_DEFS[type];
        if (!Buildings.canPlace(tx, ty, def.size, this.buildings, this.world)) { UI.notify('Cannot build here!'); return; }
        if (!Buildings.canAfford(type, this.resources)) { UI.notify('Not enough resources!'); return; }
        if (def.expander) {
            for (const [r,c] of Object.entries(def.cost)) this.resources[r] -= c;
            const radius = def.expandRadius + (this.research.colonyRadius || 0) * 2;
            this.world.expandColony(tx, ty, radius);
            // Invalidate affected chunk caches
            this._invalidateChunksNear(tx, ty, radius);
            UI.notify(`Colony expanded! (+${radius} tile radius)`);
            this.placementMode = null; UI.update(); return;
        }
        const b = Buildings.place(type, tx, ty, this.resources);
        this.buildings.push(b);
        this.sounds.build();
        UI.notify(`Built ${def.name}!`); this.placementMode = null; UI.update();
    }

    _invalidateChunksNear(tx, ty, radius) {
        const r = Math.ceil(radius);
        const seen = new Set();
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                const cx = Math.floor((tx + dx) / CHUNK_SIZE);
                const cy = Math.floor((ty + dy) / CHUNK_SIZE);
                const key = cx + ',' + cy;
                if (!seen.has(key)) {
                    seen.add(key);
                    const cs = this._chunkSprites.get(key);
                    if (cs) cs.dirty = true;
                }
            }
        }
    }

    startPlacement(type) {
        if (!Buildings.canAfford(type, this.resources)) { UI.notify('Not enough resources!'); return; }
        this.placementMode = { type };
        UI.notify(`Click colony zone to place ${BUILDING_DEFS[type].name}. ESC to cancel.`);
    }

    assignCritter(critterId, valueStr) {
        const critter = this.critters.find(c => c.id === critterId);
        if (!critter) return;
        if (critter.assignment && critter.assignment !== 'patrol') {
            const oldB = this.buildings.find(b => b.id === critter.assignment);
            if (oldB) oldB.workers = oldB.workers.filter(w => w !== critterId);
        }
        if (valueStr === 'patrol') {
            critter.assignment = 'patrol';
            critter._patrolX = this.player.x + (Math.random() - 0.5) * 200;
            critter._patrolY = this.player.y + (Math.random() - 0.5) * 200;
            UI.notify(`${critter.nickname} is now on patrol!`);
        } else if (valueStr) {
            const bid = parseInt(valueStr);
            const newB = this.buildings.find(b => b.id === bid);
            if (newB) {
                const maxW = Buildings.getMaxWorkersPerBuilding(this.research);
                if (newB.workers.length >= maxW) { UI.notify(`Building full! (${maxW}/${maxW}) Research Workforce Training.`); return; }
                newB.workers.push(critterId); critter.assignment = bid;
                UI.notify(`${critter.nickname} assigned to ${BUILDING_DEFS[newB.type].name} (${newB.workers.length}/${maxW})`);
            }
        } else { critter.assignment = null; }
        UI.update();
    }

    unassignFromManage(critterId) {
        const critter = this.critters.find(c => c.id === critterId);
        if (!critter) return;
        if (critter.assignment && critter.assignment !== 'patrol') {
            const oldB = this.buildings.find(b => b.id === critter.assignment);
            if (oldB) oldB.workers = oldB.workers.filter(w => w !== critterId);
        }
        critter.assignment = null;
        UI.notify(`${critter.nickname} unassigned.`);
        UI.update();
    }

    manualCraft(buildingId) {
        const b = this.buildings.find(b => b.id === buildingId);
        if (!b || !BUILDING_DEFS[b.type].isWorkbench) return;
        if ((this.resources.wood || 0) < 5 || (this.resources.stone || 0) < 3) { UI.notify('Need 5 wood + 3 stone!'); return; }
        b._manualCrafting = true;
        b.craftProgress = 0;
        UI.notify('Crafting trap...');
    }

    queueCraft(buildingId, amount) {
        const b = this.buildings.find(b => b.id === buildingId);
        if (!b || !BUILDING_DEFS[b.type].isWorkbench) return;
        if (!b.craftQueue) b.craftQueue = 0;
        b.craftQueue += amount;
        if (b.workers.length === 0) UI.notify(`${amount} traps queued. Assign DEX critters to auto-craft!`);
        else UI.notify(`${amount} traps queued (${b.craftQueue} total)`);
        UI.update();
    }

    startResearch(researchId) {
        if (this.researchInProgress) { UI.notify('Already researching!'); return; }
        const rd = RESEARCH_DEFS[researchId];
        const level = this.research[researchId] || 0;
        if (level >= rd.maxLevel) return;
        const cost = rd.cost(level);
        for (const [k,v] of Object.entries(cost)) { if ((this.resources[k]||0) < v) { UI.notify('Not enough resources!'); return; } }
        for (const [k,v] of Object.entries(cost)) this.resources[k] -= v;
        this.researchInProgress = { id: researchId, progress: 0 };
        UI.notify(`Researching ${rd.name}...`); UI.update();
    }

    // ─── UPDATE (100% identical game logic) ─────────────────
    update(dt) {
        let dx = 0, dy = 0;
        if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
        if (this.keys['s'] || this.keys['arrowdown']) dy += 1;
        if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
        if (this.keys['d'] || this.keys['arrowright']) dx += 1;
        if (dx || dy) {
            const len = Math.sqrt(dx*dx + dy*dy); dx /= len; dy /= len;
            const nx = this.player.x + dx * this.player.speed * dt;
            const ny = this.player.y + dy * this.player.speed * dt;
            if (this.world.isWalkable(Math.floor(nx/TILE_SIZE), Math.floor(ny/TILE_SIZE))) { this.player.x = nx; this.player.y = ny; }
            else {
                if (this.world.isWalkable(Math.floor(nx/TILE_SIZE), Math.floor(this.player.y/TILE_SIZE))) this.player.x = nx;
                if (this.world.isWalkable(Math.floor(this.player.x/TILE_SIZE), Math.floor(ny/TILE_SIZE))) this.player.y = ny;
            }
        }

        const w = this.pixiApp.screen.width, h = this.pixiApp.screen.height;
        this.cam.x += (this.player.x - w/2 - this.cam.x) * 0.1;
        this.cam.y += (this.player.y - h/2 - this.cam.y) * 0.1;

        this.world.updateLoadedChunks(this.player.x, this.player.y);

        this.gunCooldown = Math.max(0, this.gunCooldown - dt);
        if (this.mouseDown && this.gunCooldown <= 0 && !this.placementMode) {
            this._shoot(this.mouse.worldX, this.mouse.worldY);
        }

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx * dt; p.y += p.vy * dt; p.lifetime -= dt;
            if (p.lifetime <= 0) { this.projectiles.splice(i, 1); continue; }
            for (const wc of this.wildCritters) {
                const hx = wc.x - p.x, hy = wc.y - p.y;
                if (Math.sqrt(hx*hx + hy*hy) < 12) { Critters.damageWild(wc, p.damage); this.sounds.hit(); this.projectiles.splice(i, 1); break; }
            }
        }

        Critters.updateWild(dt, this.wildCritters, this.world, this.player, this.buildings);

        // Cleanup despawned critter sprites
        for (const c of this.wildCritters) {
            if (c._despawned) this._cleanupCritterSprite(c);
        }
        this.wildCritters = this.wildCritters.filter(c => !c._despawned);

        // Check building HP — destroy if 0
        for (let i = this.buildings.length - 1; i >= 0; i--) {
            const b = this.buildings[i];
            if (b.hp !== undefined && b.hp <= 0) {
                // Unassign workers
                for (const cid of b.workers) {
                    const cr = this.critters.find(c => c.id === cid);
                    if (cr) cr.assignment = null;
                }
                if (b._pixiSprite) { b._pixiSprite.destroy({ children: true }); b._pixiSprite = null; }
                this.sounds.destroy();
                UI.notify(`${BUILDING_DEFS[b.type].name} was destroyed!`, 4000);
                this.buildings.splice(i, 1);
            }
        }

        if (this.player.hp < this.player.maxHp) {
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + 1 * dt);
        }
        if (this.player.hp <= 0) {
            this.player.hp = this.player.maxHp;
            this.player.x = 0; this.player.y = 0;
            UI.notify('You were knocked out! Respawned at colony.', 4000);
        }

        const caps = {};
        for (const r of ['wood','stone','food']) caps[r] = (this.resourceCaps[r]||200) + (this.research.storageCap||0)*100;

        Buildings.update(dt, this.buildings, this.critters, this.resources, caps, this.inventory, this.hungry);
        for (const r of ['wood','stone','food']) this.resources[r] = Math.min(this.resources[r], caps[r]);

        Buildings.updateTurrets(dt, this.buildings, this.wildCritters, this.projectiles, this.research);

        for (const c of this.critters) {
            if (c.assignment !== 'patrol') continue;
            if (!c._patrolAngle) c._patrolAngle = Math.random() * Math.PI * 2;
            if (!c._patrolX) c._patrolX = 0;
            if (!c._patrolY) c._patrolY = 0;
            if (!c._patrolTargetX) { c._patrolTargetX = c._patrolX; c._patrolTargetY = c._patrolY; }
            if (!c._attackTimer) c._attackTimer = 0;
            c._attackTimer -= dt;
            c._patrolAngle += dt * 0.3;
            const orbitR = CHUNK_SIZE * TILE_SIZE * 1.2;
            c._patrolTargetX = Math.cos(c._patrolAngle + c.id * 1.5) * orbitR;
            c._patrolTargetY = Math.sin(c._patrolAngle + c.id * 1.5) * orbitR;
            const pdx = c._patrolTargetX - c._patrolX;
            const pdy = c._patrolTargetY - c._patrolY;
            const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
            if (pDist > 3) {
                const speed = 60;
                c._patrolX += (pdx / pDist) * speed * dt;
                c._patrolY += (pdy / pDist) * speed * dt;
            }
            if (c._attackTimer <= 0) {
                for (const wc of this.wildCritters) {
                    const ax = wc.x - c._patrolX, ay = wc.y - c._patrolY;
                    if (Math.sqrt(ax*ax + ay*ay) < TILE_SIZE * 4) {
                        Critters.damageWild(wc, (c.stats.STR || 1) * 2);
                        c._attackTimer = 1.5;
                        break;
                    }
                }
            }
        }

        if (this.researchInProgress) {
            const speed = Buildings.getResearchSpeed(this.buildings, this.critters);
            if (speed > 0) {
                this.researchInProgress.progress += speed * dt;
                const rd = RESEARCH_DEFS[this.researchInProgress.id];
                if (this.researchInProgress.progress >= rd.time) {
                    this.research[this.researchInProgress.id] = (this.research[this.researchInProgress.id]||0) + 1;
                    UI.notify(`Research complete: ${rd.name}!`);
                    this.researchInProgress = null; UI.update();
                }
            }
        }

        if (!this._foodTimer) this._foodTimer = 0;
        this._foodTimer += dt;
        if (this._foodTimer >= 5) {
            this._foodTimer = 0;
            let activeCount = this.critters.filter(c => c.assignment).length;
            const consumption = activeCount * 0.1;
            if (this.resources.food >= consumption) {
                this.resources.food -= consumption;
                this.hungry = false;
            } else {
                this.resources.food = Math.max(0, this.resources.food - consumption);
                if (!this.hungry) {
                    this.hungry = true;
                    UI.notify('Critters are hungry! Build more Farms.', 4000);
                }
            }
        }

        this.respawnTimer -= dt;
        if (this.respawnTimer <= 0) {
            this.respawnTimer = 30;
            if (this.wildCritters.length < WILD_MIN_COUNT) {
                const nw = Critters.spawnWild(this.world);
                this.wildCritters.push(...nw.slice(0, WILD_MIN_COUNT - this.wildCritters.length));
            }
        }

        this.autoSaveTimer -= dt;
        if (this.autoSaveTimer <= 0) { this.autoSaveTimer = 60; Save.save(this); }

        UI.updateNotifications(dt);

        this.panelUpdateTimer -= dt;
        if (this.panelUpdateTimer <= 0) {
            this.panelUpdateTimer = 0.5;
            const gc = (r) => caps[r]||200;
            document.getElementById('resWood').textContent = `${Math.floor(this.resources.wood)}/${gc('wood')}`;
            document.getElementById('resStone').textContent = `${Math.floor(this.resources.stone)}/${gc('stone')}`;
            const foodEl = document.getElementById('resFood');
            foodEl.textContent = `${Math.floor(this.resources.food)}/${gc('food')}`;
            foodEl.style.color = this.hungry ? '#f87171' : '#9ccc65';
            document.getElementById('trapCount').textContent = this.inventory.traps;
            document.getElementById('critterCount').textContent = `${this.critters.length}/${Buildings.getMaxCritters(this.buildings, this.research)}`;
            UI.updatePanel();
        }
    }

    // ─── PIXI RENDER ────────────────────────────────────────
    _pixiRender() {
        const w = this.pixiApp.screen.width, h = this.pixiApp.screen.height;
        const camX = this.cam.x, camY = this.cam.y;

        // Move world container (camera)
        this.worldContainer.x = -camX;
        this.worldContainer.y = -camY;

        // ── Chunk tile rendering (cached textures) ──
        this._updateChunks(camX, camY, w, h);

        // ── Entity graphics (redrawn each frame via single Graphics) ──
        const gfx = this._entityGfx;
        gfx.clear();

        // Buildings
        for (const b of this.buildings) this._drawBuilding(gfx, b);

        // Patrol critters
        for (const c of this.critters) {
            if (c.assignment !== 'patrol') continue;
            const sp = SPECIES[c.species];
            const sx = c._patrolX || 0, sy = (c._patrolY || 0) + Math.sin(this.time*3 + c.id)*2;
            const tex = this._getCritterTex(c.species);
            if (tex) {
                if (!c._patrolSprite || c._patrolSprite._speciesKey !== c.species) {
                    if (c._patrolSprite) { c._patrolSprite.parent?.removeChild(c._patrolSprite); c._patrolSprite.destroy(); }
                    c._patrolSprite = new PIXI.Sprite(tex);
                    c._patrolSprite.anchor.set(0.5, 0.5);
                    c._patrolSprite._speciesKey = c.species;
                    this.entityContainer.addChild(c._patrolSprite);
                } else if (c._patrolSprite.texture !== tex) {
                    c._patrolSprite.texture = tex;
                }
                c._patrolSprite.width = 18; c._patrolSprite.height = 18;
                c._patrolSprite.x = sx; c._patrolSprite.y = sy;
                c._patrolSprite.visible = true;
            } else {
                if (c._patrolSprite) c._patrolSprite.visible = false;
                gfx.beginFill(PIXI.utils.string2hex(sp.color));
                gfx.drawCircle(sx, sy, 7);
                gfx.endFill();
            }
        }

        // Wild critters
        for (const c of this.wildCritters) this._drawWildCritter(gfx, c);

        // Projectiles
        for (const p of this.projectiles) {
            gfx.beginFill(p.fromTurret ? 0x90a4ae : 0xffd54f);
            gfx.drawCircle(p.x, p.y, 3);
            gfx.endFill();
        }

        // Player
        const px = this.player.x, py = this.player.y;
        gfx.beginFill(0x000000, 0.3);
        gfx.drawEllipse(px, py + 12, 10, 5);
        gfx.endFill();
        gfx.beginFill(0x4FC3F7);
        gfx.lineStyle(2, 0xffffff);
        gfx.drawCircle(px, py, 10);
        gfx.endFill();
        gfx.lineStyle(0);

        // Player HP bar
        if (this.player.hp < this.player.maxHp) {
            const hpW = 28, hpH = 4;
            gfx.beginFill(0x333333);
            gfx.drawRect(px - hpW/2, py - 18, hpW, hpH);
            gfx.endFill();
            const pct = this.player.hp / this.player.maxHp;
            const hpColor = pct > 0.5 ? 0x4ade80 : pct > 0.25 ? 0xfbbf24 : 0xf87171;
            gfx.beginFill(hpColor);
            gfx.drawRect(px - hpW/2, py - 18, hpW * pct, hpH);
            gfx.endFill();
        }

        // ── Overlay (screen-space) ──
        const ovr = this._overlayGfx;
        ovr.clear();
        this._resetTextPool();

        // Gun aim line
        if (this.gunCooldown <= 0 && !this.placementMode) {
            ovr.lineStyle(1, 0xffd54f, 0.2);
            const ppx = px - camX, ppy = py - camY;
            ovr.moveTo(ppx, ppy);
            ovr.lineTo(this.mouse.x, this.mouse.y);
            ovr.lineStyle(0);
        }

        // Placement preview
        if (this.placementMode) {
            const tx = Math.floor(this.mouse.worldX/TILE_SIZE), ty = Math.floor(this.mouse.worldY/TILE_SIZE);
            const def = BUILDING_DEFS[this.placementMode.type];
            const cp = Buildings.canPlace(tx, ty, def.size, this.buildings, this.world);
            const sx = tx*TILE_SIZE-camX, sy = ty*TILE_SIZE-camY, sz = def.size*TILE_SIZE;
            ovr.beginFill(cp ? 0x4ade80 : 0xf87171, 0.3);
            ovr.lineStyle(2, cp ? 0x4ade80 : 0xf87171);
            ovr.drawRect(sx, sy, sz, sz);
            ovr.endFill();
            ovr.lineStyle(0);
            const t = this._getText(def.letter, { fontFamily: 'monospace', fontSize: 16, fontWeight: 'bold', fill: 0xffffff });
            t.x = sx + sz/2; t.y = sy + sz/2;
        }

        // Capture indicators
        for (const c of this.wildCritters) {
            const cd = Math.sqrt((c.x-this.player.x)**2+(c.y-this.player.y)**2)/TILE_SIZE;
            if (cd < CAPTURE_RANGE) {
                const sx = c.x - camX, sy = c.y - camY;
                const col = c.stunned ? 0xffd54f : 0x4ade80;
                ovr.lineStyle(1.5, col, c.stunned ? 0.7 : 0.5);
                ovr.drawCircle(sx, sy, 16);
                ovr.lineStyle(0);
                const label = c.stunned ? `E: FREE! (${Math.ceil(c.stunTimer)}s)` : 'E: CAPTURE';
                const t = this._getText(label, { fontFamily: 'monospace', fontSize: 10, fontWeight: 'bold', fill: col });
                t.x = sx; t.y = sy - 22;
            }
        }

        // Waypoint claim indicators
        for (const wp of this.world.waypoints) {
            if (wp.claimed) continue;
            const wd = Math.sqrt((this.player.x-(wp.x*TILE_SIZE+16))**2+(this.player.y-(wp.y*TILE_SIZE+16))**2);
            if (wd < TILE_SIZE*3) {
                const sx = wp.x*TILE_SIZE+16-camX, sy = wp.y*TILE_SIZE+16-camY;
                const t = this._getText('E: CLAIM WAYPOINT', { fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold', fill: 0xfbbf24 });
                t.x = sx; t.y = sy - 50;
            }
        }

        // Notifications
        this._renderNotifications(ovr, w);

        // Waypoint menu
        if (UI.showWaypointMenu) this._renderWaypointMenu(ovr, w, h);

        // Minimap / Full Map
        if (this.showFullMap) {
            this._renderFullMap(ovr, w, h);
        } else {
            this._renderMinimap(ovr, w, h);
        }
    }

    // ─── CHUNK MANAGEMENT ───────────────────────────────────
    _updateChunks(camX, camY, screenW, screenH) {
        const startTX = Math.floor(camX / TILE_SIZE);
        const startTY = Math.floor(camY / TILE_SIZE);
        const endTX = Math.floor((camX + screenW) / TILE_SIZE) + 1;
        const endTY = Math.floor((camY + screenH) / TILE_SIZE) + 1;
        const startCX = Math.floor(startTX / CHUNK_SIZE);
        const startCY = Math.floor(startTY / CHUNK_SIZE);
        const endCX = Math.floor(endTX / CHUNK_SIZE);
        const endCY = Math.floor(endTY / CHUNK_SIZE);

        const visibleKeys = new Set();

        for (let cx = startCX; cx <= endCX; cx++) {
            for (let cy = startCY; cy <= endCY; cy++) {
                const key = cx + ',' + cy;
                visibleKeys.add(key);
                let cs = this._chunkSprites.get(key);

                if (!cs || cs.dirty) {
                    const chunk = this.world.getOrGenerateChunk(cx, cy);
                    const tex = this._renderChunkToTexture(chunk);
                    if (cs) {
                        cs.sprite.texture.destroy(true);
                        cs.sprite.texture = tex;
                        cs.dirty = false;
                    } else {
                        const sprite = new PIXI.Sprite(tex);
                        sprite.x = cx * CHUNK_SIZE * TILE_SIZE;
                        sprite.y = cy * CHUNK_SIZE * TILE_SIZE;
                        this.chunkContainer.addChild(sprite);
                        cs = { sprite, dirty: false };
                        this._chunkSprites.set(key, cs);
                    }
                }

                cs.sprite.visible = true;
            }
        }

        // Hide non-visible chunks (don't destroy — they'll likely be reused)
        for (const [key, cs] of this._chunkSprites) {
            if (!visibleKeys.has(key)) {
                cs.sprite.visible = false;
            }
        }

        // Cleanup chunks far from player (memory management)
        if (this._chunkSprites.size > 200) {
            const playerCX = Math.floor(this.player.x / TILE_SIZE / CHUNK_SIZE);
            const playerCY = Math.floor(this.player.y / TILE_SIZE / CHUNK_SIZE);
            for (const [key, cs] of this._chunkSprites) {
                const [cxs, cys] = key.split(',').map(Number);
                if (Math.abs(cxs - playerCX) > RENDER_DISTANCE * 3 || Math.abs(cys - playerCY) > RENDER_DISTANCE * 3) {
                    if (cs.sprite.parent) cs.sprite.parent.removeChild(cs.sprite);
                    cs.sprite.texture.destroy(true);
                    cs.sprite.destroy();
                    this._chunkSprites.delete(key);
                }
            }
        }
    }

    _renderChunkToTexture(chunk) {
        const size = CHUNK_SIZE * TILE_SIZE;
        const gfx = new PIXI.Graphics();

        const TILE_HEX = {
            [TILE.GRASS]:  [0x4a7c3f, 0x4e8243, 0x46763b, 0x528647],
            [TILE.TREE]:   [0x2d5a1e],
            [TILE.ROCK]:   [0x6b6b6b],
            [TILE.WATER]:  [0x2a6faa, 0x2d74b0, 0x2768a2],
            [TILE.COLONY]: [0x8a7a52, 0x8e7e56, 0x867650],
            [TILE.PATH]:   [0xa89060, 0xa48a5c, 0xac9464],
        };

        for (let ly = 0; ly < CHUNK_SIZE; ly++) {
            for (let lx = 0; lx < CHUNK_SIZE; lx++) {
                const t = chunk.tiles[ly * CHUNK_SIZE + lx];
                const wx = chunk.cx * CHUNK_SIZE + lx;
                const wy = chunk.cy * CHUNK_SIZE + ly;
                const colors = TILE_HEX[t];
                if (!colors) continue;
                const ci = ((wx & 0x7FFFFFFF) * 7 + (wy & 0x7FFFFFFF) * 13) % colors.length;

                const sx = lx * TILE_SIZE;
                const sy = ly * TILE_SIZE;

                gfx.beginFill(colors[ci]);
                gfx.drawRect(sx, sy, TILE_SIZE, TILE_SIZE);
                gfx.endFill();

                if (t === TILE.TREE) {
                    gfx.beginFill(0x5c3d1e);
                    gfx.drawRect(sx + 12, sy + 12, 8, 8);
                    gfx.endFill();
                    gfx.beginFill(0x3a7a28);
                    gfx.drawCircle(sx + 16, sy + 12, 10);
                    gfx.endFill();
                } else if (t === TILE.ROCK) {
                    gfx.beginFill(0x888888);
                    gfx.drawCircle(sx + 16, sy + 18, 9);
                    gfx.endFill();
                    gfx.beginFill(0x999999);
                    gfx.drawCircle(sx + 14, sy + 15, 5);
                    gfx.endFill();
                } else if (t === TILE.COLONY) {
                    gfx.lineStyle(0.5, 0xffffff, 0.06);
                    gfx.drawRect(sx, sy, TILE_SIZE, TILE_SIZE);
                    gfx.lineStyle(0);
                }
            }
        }

        const rt = this.pixiApp.renderer.generateTexture(gfx, {
            region: new PIXI.Rectangle(0, 0, size, size),
        });
        gfx.destroy();
        return rt;
    }

    // ─── BUILDING DRAWING ───────────────────────────────────
    _drawBuilding(gfx, building) {
        const def = BUILDING_DEFS[building.type];
        const wx = building.gridX * TILE_SIZE;
        const wy = building.gridY * TILE_SIZE;
        const size = def.size * TILE_SIZE;

        // Building body — use Pixi sprite if available
        const tex = this._getBuildingTex(building.type);
        if (tex) {
            // Manage persistent sprite
            if (!building._pixiSprite) {
                building._pixiSprite = new PIXI.Sprite(tex);
                this.buildingContainer.addChild(building._pixiSprite);
            }
            const sp = building._pixiSprite;
            sp.x = wx + 1; sp.y = wy + 1;
            sp.width = size - 2; sp.height = size - 2;
            sp.visible = true;
        } else {
            gfx.beginFill(PIXI.utils.string2hex(def.color));
            gfx.drawRect(wx + 2, wy + 2, size - 4, size - 4);
            gfx.endFill();
        }
        gfx.lineStyle(1, 0xffffff, 0.2);
        gfx.drawRect(wx + 2, wy + 2, size - 4, size - 4);
        gfx.lineStyle(0);

        // Turret barrel
        if (def.turret) {
            const angle = building.turretAngle || 0;
            const tcx = wx + size / 2, tcy = wy + size / 2;
            gfx.lineStyle(3, 0xcccccc);
            gfx.moveTo(tcx, tcy);
            gfx.lineTo(tcx + Math.cos(angle) * 18, tcy + Math.sin(angle) * 18);
            gfx.lineStyle(0);
            gfx.lineStyle(1, 0xffffff, 0.05);
            gfx.drawCircle(tcx, tcy, def.range * TILE_SIZE);
            gfx.lineStyle(0);
        }

        // Building HP bar
        if (building.hp !== undefined && building.hp < building.maxHp) {
            const hpW = size - 8, hpH = 3;
            gfx.beginFill(0x333333);
            gfx.drawRect(wx + 4, wy + size - 6, hpW, hpH);
            gfx.endFill();
            const pct = building.hp / building.maxHp;
            const hpColor = pct > 0.5 ? 0x4ade80 : pct > 0.25 ? 0xfbbf24 : 0xf87171;
            gfx.beginFill(hpColor);
            gfx.drawRect(wx + 4, wy + size - 6, hpW * pct, hpH);
            gfx.endFill();
        }

        // Worker count badge
        if (building.workers.length > 0 && !def.turret && !def.expander) {
            gfx.beginFill(0x000000, 0.5);
            gfx.drawRect(wx + size - 20, wy + 2, 18, 14);
            gfx.endFill();
        }

        // Assigned critters — use sprites when available
        for (let i = 0; i < building.workers.length; i++) {
            const c = this.critters.find(cr => cr.id === building.workers[i]);
            if (!c) continue;
            const sp = SPECIES[c.species];
            const ox = (i % 2) * 20 + 8;
            const oy = Math.floor(i / 2) * 20 + 38;
            const bob = Math.sin(this.time * 4 + c.id) * 1.5;
            const workerX = wx + ox;
            const workerY = wy + oy + bob;

            const tex = this._getCritterTex(c.species);
            if (tex) {
                // Use a persistent sprite keyed to worker slot
                const spriteKey = '_bldgWorker' + building.id + '_' + i;
                if (!c[spriteKey]) {
                    c[spriteKey] = new PIXI.Sprite(tex);
                    c[spriteKey].anchor.set(0.5, 0.5);
                    this.entityContainer.addChild(c[spriteKey]);
                } else if (c[spriteKey].texture !== tex) {
                    c[spriteKey].texture = tex;
                }
                c[spriteKey].width = 16; c[spriteKey].height = 16;
                c[spriteKey].x = workerX; c[spriteKey].y = workerY;
                c[spriteKey].visible = true;
            } else {
                gfx.beginFill(PIXI.utils.string2hex(sp.color));
                gfx.drawCircle(workerX, workerY, 6);
                gfx.endFill();
            }
        }
    }

    // ─── WILD CRITTER DRAWING ───────────────────────────────
    _drawWildCritter(gfx, critter) {
        const sp = SPECIES[critter.species];
        const sx = critter.x, sy = critter.y;
        const bob = Math.sin(this.time * 3 + critter.id) * 2;
        const r = 12;

        // Shadow
        gfx.beginFill(0x000000, 0.2);
        gfx.drawEllipse(sx, sy + 12, 10, 4);
        gfx.endFill();

        // Body — use PIXI sprite if texture available
        const tex = this._getCritterTex(critter.species);
        if (tex) {
            if (!critter._pixiSprite) {
                critter._pixiSprite = new PIXI.Sprite(tex);
                critter._pixiSprite.anchor.set(0.5, 0.5);
                this.entityContainer.addChild(critter._pixiSprite);
            }
            critter._pixiSprite.width = r * 2;
            critter._pixiSprite.height = r * 2;
            critter._pixiSprite.x = sx;
            critter._pixiSprite.y = sy + bob;
            critter._pixiSprite.visible = true;
            critter._pixiSprite.alpha = critter.stunned ? 0.5 + Math.sin(this.time * 10) * 0.3 : 1;
        } else {
            // Fallback colored circle
            if (critter._pixiSprite) critter._pixiSprite.visible = false;
            const color = PIXI.utils.string2hex(sp.color);
            gfx.beginFill(color);
            gfx.drawCircle(sx, sy + bob, 8);
            gfx.endFill();
            // Eyes
            gfx.beginFill(0xffffff);
            gfx.drawCircle(sx - 3, sy + bob - 2, 2.5);
            gfx.drawCircle(sx + 3, sy + bob - 2, 2.5);
            gfx.endFill();
            gfx.beginFill(0x222222);
            gfx.drawCircle(sx - 2.5, sy + bob - 2, 1.2);
            gfx.drawCircle(sx + 3.5, sy + bob - 2, 1.2);
            gfx.endFill();
        }

        // Stunned
        if (critter.stunned) {
            gfx.lineStyle(2, 0xffd54f, 0.5 + Math.sin(this.time * 10) * 0.3);
            gfx.drawCircle(sx, sy + bob, 12);
            gfx.lineStyle(0);
        }

        // HP bar
        if (critter.hp < critter.maxHp && !critter.stunned) {
            const barW = 20, barH = 3;
            gfx.beginFill(0x333333);
            gfx.drawRect(sx - barW/2, sy + bob - 16, barW, barH);
            gfx.endFill();
            const pct = critter.hp / critter.maxHp;
            const hpColor = pct > 0.5 ? 0x4ade80 : pct > 0.25 ? 0xfbbf24 : 0xf87171;
            gfx.beginFill(hpColor);
            gfx.drawRect(sx - barW/2, sy + bob - 16, barW * pct, barH);
            gfx.endFill();
        }

        // Aggro indicator
        if (critter.state === 'aggro') {
            gfx.lineStyle(2, 0xf87171, 0.7);
            gfx.drawCircle(sx, sy + bob, 11);
            gfx.lineStyle(0);
        }

        // Building attack indicator
        if (critter.state === 'attacking_building') {
            gfx.lineStyle(2, 0xff6b35, 0.7);
            gfx.drawCircle(sx, sy + bob, 11);
            gfx.lineStyle(0);
        }

        // Rarity glow
        if (sp.rarity !== 'common') {
            const rc = PIXI.utils.string2hex(RARITY_COLORS[sp.rarity].replace(/[^0-9a-fA-F#]/g, ''));
            gfx.lineStyle(2, rc, 0.4);
            gfx.drawCircle(sx, sy + bob, 11);
            gfx.lineStyle(0);
        }
    }

    // ─── NOTIFICATIONS ──────────────────────────────────────
    _renderNotifications(gfx, canvasW) {
        for (let i = 0; i < UI.notifications.length; i++) {
            const n = UI.notifications[i];
            const y = 80 + i * 30;
            const t = this._getText(n.text, { fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold', fill: 0xffffff });
            t.x = canvasW / 2; t.y = y;
            t.alpha = n.opacity;

            const tw = t.width;
            gfx.beginFill(0x000000, 0.6 * n.opacity);
            gfx.drawRect(canvasW / 2 - tw / 2 - 12, y - 12, tw + 24, 24);
            gfx.endFill();
        }
    }

    // ─── WAYPOINT MENU ──────────────────────────────────────
    _renderWaypointMenu(gfx, canvasW, canvasH) {
        const waypoints = this.world.waypoints.filter(w => w.claimed);
        const menuW = 260;
        const menuH = Math.min(40 + waypoints.length * 36, canvasH - 80);
        const mx = (canvasW - menuW) / 2;
        const my = (canvasH - menuH) / 2;

        gfx.beginFill(0x0a0a1e, 0.92);
        gfx.lineStyle(1, 0xffffff, 0.15);
        gfx.drawRect(mx, my, menuW, menuH);
        gfx.endFill();
        gfx.lineStyle(0);

        const title = this._getText('Waypoints (T to close)', { fontFamily: 'monospace', fontSize: 14, fontWeight: 'bold', fill: 0xffffff });
        title.x = mx + menuW / 2; title.y = my + 16;

        this._waypointButtons = [];
        for (let i = 0; i < waypoints.length; i++) {
            const wp = waypoints[i];
            const by = my + 36 + i * 36;
            const bx = mx + 10;

            gfx.beginFill(0xffffff, 0.05);
            gfx.drawRect(bx, by, menuW - 20, 30);
            gfx.endFill();

            const nameText = this._getText(wp.name, { fontFamily: 'monospace', fontSize: 12, fill: 0x66bb6a });
            nameText.anchor.set(0, 0.5);
            nameText.x = bx + 8; nameText.y = by + 10;

            const coordText = this._getText(`(${wp.x}, ${wp.y})`, { fontFamily: 'monospace', fontSize: 9, fill: 0x888888 });
            coordText.anchor.set(0, 0.5);
            coordText.x = bx + 8; coordText.y = by + 22;

            gfx.beginFill(0x66bb6a, 0.2);
            gfx.drawRect(bx + menuW - 80, by + 4, 52, 22);
            gfx.endFill();

            const goText = this._getText('GO', { fontFamily: 'monospace', fontSize: 10, fontWeight: 'bold', fill: 0x66bb6a });
            goText.x = bx + menuW - 54; goText.y = by + 15;

            this._waypointButtons.push({ x: bx + menuW - 80, y: by + 4, w: 52, h: 22, wp });
        }
    }

    // ─── MINIMAP ────────────────────────────────────────────
    _renderMinimap(gfx, cw, ch) {
        const ms = 140, mx = 10, my = ch - ms - 10;
        gfx.beginFill(0x0a0a1e, 0.85);
        gfx.lineStyle(1, 0xffffff, 0.15);
        gfx.drawRect(mx, my, ms, ms);
        gfx.endFill();
        gfx.lineStyle(0);

        const centerX = mx + ms / 2, centerY = my + ms / 2;
        const playerTX = this.player.x / TILE_SIZE;
        const playerTY = this.player.y / TILE_SIZE;

        // Render chunk tiles on minimap
        const mapColors = { [TILE.GRASS]:0x3a6832, [TILE.TREE]:0x2a5020, [TILE.ROCK]:0x555555, [TILE.WATER]:0x2266aa, [TILE.COLONY]:0x8a7a52, [TILE.PATH]:0x9a8a60 };
        const viewRadius = ms / 2; // pixels on minimap
        const tileRadius = 40; // how many tiles to show in each direction
        const tileScale = viewRadius / tileRadius;

        for (const [, chunk] of this.world.chunks) {
            const chunkWorldTX = chunk.cx * CHUNK_SIZE;
            const chunkWorldTY = chunk.cy * CHUNK_SIZE;

            // Quick bounds check — skip chunks too far from player
            const chunkCenterTX = chunkWorldTX + CHUNK_SIZE / 2;
            const chunkCenterTY = chunkWorldTY + CHUNK_SIZE / 2;
            if (Math.abs(chunkCenterTX - playerTX) > tileRadius + CHUNK_SIZE ||
                Math.abs(chunkCenterTY - playerTY) > tileRadius + CHUNK_SIZE) continue;

            // Draw each tile as a tiny pixel
            for (let ly = 0; ly < CHUNK_SIZE; ly += 2) { // sample every 2 tiles for perf
                for (let lx = 0; lx < CHUNK_SIZE; lx += 2) {
                    const wtx = chunkWorldTX + lx;
                    const wty = chunkWorldTY + ly;
                    const relX = wtx - playerTX;
                    const relY = wty - playerTY;
                    if (Math.abs(relX) > tileRadius || Math.abs(relY) > tileRadius) continue;

                    const sx = centerX + relX * tileScale;
                    const sy = centerY + relY * tileScale;
                    if (sx < mx || sx > mx + ms || sy < my || sy > my + ms) continue;

                    const t = chunk.tiles[ly * CHUNK_SIZE + lx];
                    const col = mapColors[t];
                    if (col !== undefined) {
                        gfx.beginFill(col);
                        gfx.drawRect(sx, sy, Math.ceil(tileScale * 2), Math.ceil(tileScale * 2));
                        gfx.endFill();
                    }
                }
            }
        }

        // Buildings
        for (const b of this.buildings) {
            const relX = b.gridX - playerTX;
            const relY = b.gridY - playerTY;
            if (Math.abs(relX) > tileRadius || Math.abs(relY) > tileRadius) continue;
            const bx = centerX + relX * tileScale;
            const by = centerY + relY * tileScale;
            if (bx > mx && bx < mx + ms && by > my && by < my + ms) {
                gfx.beginFill(PIXI.utils.string2hex(BUILDING_DEFS[b.type].color));
                gfx.drawRect(bx - 1, by - 1, 3, 3);
                gfx.endFill();
            }
        }

        // Waypoints
        for (const wp of this.world.waypoints) {
            const relX = wp.x - playerTX;
            const relY = wp.y - playerTY;
            if (Math.abs(relX) > tileRadius || Math.abs(relY) > tileRadius) continue;
            const wpx = centerX + relX * tileScale;
            const wpy = centerY + relY * tileScale;
            if (wpx > mx && wpx < mx + ms && wpy > my && wpy < my + ms) {
                gfx.beginFill(wp.claimed ? 0x4ade80 : 0x888888);
                gfx.drawCircle(wpx, wpy, 2);
                gfx.endFill();
            }
        }

        // Wild critters (red dots)
        for (const wc of this.wildCritters) {
            const relX = wc.x / TILE_SIZE - playerTX;
            const relY = wc.y / TILE_SIZE - playerTY;
            if (Math.abs(relX) > tileRadius || Math.abs(relY) > tileRadius) continue;
            const wcx = centerX + relX * tileScale;
            const wcy = centerY + relY * tileScale;
            if (wcx > mx && wcx < mx + ms && wcy > my && wcy < my + ms) {
                gfx.beginFill(wc.stunned ? 0xffd54f : 0xf87171, 0.7);
                gfx.drawCircle(wcx, wcy, 1.5);
                gfx.endFill();
            }
        }

        // Player (center)
        gfx.beginFill(0x4FC3F7);
        gfx.drawCircle(centerX, centerY, 3);
        gfx.endFill();
        gfx.lineStyle(1, 0xffffff, 0.3);
        gfx.drawCircle(centerX, centerY, 3);
        gfx.lineStyle(0);
    }

    // ─── FULL MAP ───────────────────────────────────────────
    _renderFullMap(gfx, cw, ch) {
        gfx.beginFill(0x000000, 0.85);
        gfx.drawRect(0, 0, cw, ch);
        gfx.endFill();

        const pad = 40;
        const mapW = cw - pad * 2, mapH = ch - pad * 2;
        gfx.beginFill(0x0a0a1e, 0.95);
        gfx.lineStyle(1, 0xffffff, 0.15);
        gfx.drawRect(pad, pad, mapW, mapH);
        gfx.endFill();
        gfx.lineStyle(0);

        const title = this._getText('WORLD MAP (M to close)', { fontFamily: 'monospace', fontSize: 16, fontWeight: 'bold', fill: 0xffffff });
        title.x = cw / 2; title.y = pad - 12;

        let minCX = Infinity, maxCX = -Infinity, minCY = Infinity, maxCY = -Infinity;
        for (const [, chunk] of this.world.chunks) {
            if (chunk.cx < minCX) minCX = chunk.cx;
            if (chunk.cx > maxCX) maxCX = chunk.cx;
            if (chunk.cy < minCY) minCY = chunk.cy;
            if (chunk.cy > maxCY) maxCY = chunk.cy;
        }
        if (minCX > maxCX) return;

        const chunkSpanX = maxCX - minCX + 1;
        const chunkSpanY = maxCY - minCY + 1;
        const tileScale = Math.min((mapW - 20) / (chunkSpanX * CHUNK_SIZE), (mapH - 20) / (chunkSpanY * CHUNK_SIZE));
        const offsetX = pad + 10 + (mapW - 20 - chunkSpanX * CHUNK_SIZE * tileScale) / 2;
        const offsetY = pad + 10 + (mapH - 20 - chunkSpanY * CHUNK_SIZE * tileScale) / 2;

        const mapColors = { [TILE.GRASS]:0x3a6832, [TILE.TREE]:0x2a5020, [TILE.ROCK]:0x555555, [TILE.WATER]:0x2266aa, [TILE.COLONY]:0x8a7a52, [TILE.PATH]:0x9a8a60 };

        for (const [, chunk] of this.world.chunks) {
            const cBaseX = (chunk.cx - minCX) * CHUNK_SIZE;
            const cBaseY = (chunk.cy - minCY) * CHUNK_SIZE;
            for (let ly = 0; ly < CHUNK_SIZE; ly++) {
                for (let lx = 0; lx < CHUNK_SIZE; lx++) {
                    const t = chunk.tiles[ly * CHUNK_SIZE + lx];
                    const sx = offsetX + (cBaseX + lx) * tileScale;
                    const sy = offsetY + (cBaseY + ly) * tileScale;
                    gfx.beginFill(mapColors[t] || 0x222222);
                    gfx.drawRect(sx, sy, Math.ceil(tileScale), Math.ceil(tileScale));
                    gfx.endFill();
                }
            }
        }

        for (const b of this.buildings) {
            const def = BUILDING_DEFS[b.type];
            const bx = offsetX + (b.gridX - minCX * CHUNK_SIZE) * tileScale;
            const by = offsetY + (b.gridY - minCY * CHUNK_SIZE) * tileScale;
            gfx.beginFill(PIXI.utils.string2hex(def.color));
            gfx.drawRect(bx, by, Math.max(def.size * tileScale, 3), Math.max(def.size * tileScale, 3));
            gfx.endFill();
        }

        for (const wp of this.world.waypoints) {
            const wx = offsetX + (wp.x - minCX * CHUNK_SIZE) * tileScale;
            const wy = offsetY + (wp.y - minCY * CHUNK_SIZE) * tileScale;
            gfx.beginFill(wp.claimed ? 0x4ade80 : 0x888888);
            gfx.drawCircle(wx, wy, Math.max(3, tileScale * 2));
            gfx.endFill();
        }

        const playerTX = Math.floor(this.player.x / TILE_SIZE);
        const playerTY = Math.floor(this.player.y / TILE_SIZE);
        const ppx = offsetX + (playerTX - minCX * CHUNK_SIZE) * tileScale;
        const ppy = offsetY + (playerTY - minCY * CHUNK_SIZE) * tileScale;
        gfx.beginFill(0x4FC3F7);
        gfx.lineStyle(1.5, 0xffffff);
        gfx.drawCircle(ppx, ppy, Math.max(4, tileScale * 2));
        gfx.endFill();
        gfx.lineStyle(0);
    }

    _resize() {
        this.pixiApp.renderer.resize(window.innerWidth, window.innerHeight);
    }
}

const game = new Game();
