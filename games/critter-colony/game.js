/* ============================================================
   Critter Colony — Main Game Engine (PixiJS Renderer)
   ============================================================ */

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.world = new World();

        this.player = { x: 0, y: 0, speed: 200, hp: 100, maxHp: 100 };
        this.cam = { x: 0, y: 0 };

        this.resources = { wood: 50, stone: 50, food: 30, iron: 0 };
        this.resourceCaps = { wood: 200, stone: 200, food: 150, iron: 100, oil: 50, gold: 30, diamond: 15, crystal: 50, metal: 50 };
        this.inventory = { traps: 5, ammo: 120 };
        this.buildings = [];
        this.critters = [];
        this.wildCritters = [];
        this.projectiles = [];
        this.deadCritters = []; // permadeath graveyard

        // Combat
        this.gunCooldown = 0;
        this.gunDamage = 10;
        this.mouseDown = false;

        // Mining
        this.miningHeld = false;
        this.miningProgress = 0;
        this.miningTarget = null; // {tx, ty, type}

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

        // Death skulls (visual markers that despawn after 3s)
        this.deathSkulls = []; // { x, y, timer }

        // Horde system
        this.hordeTimer = 15 * 60; // 15 minutes default
        this.hordeInterval = 15 * 60;
        this.hordeWave = 0;
        this.hordeActive = false;
        this.hordeCreatures = [];

        // Timers
        this.autoSaveTimer = 60;
        this.respawnTimer = 30;
        this.time = 0;
        this.lastTimestamp = 0;
        this.panelUpdateTimer = 0;

        this.started = false;
        this.titleScreen = true;
        this.paused = false;
        this.gameTimeSec = 0; // in-game time in seconds
        this._resourceRates = { wood: 0, stone: 0, food: 0, iron: 0 };
        this._rateTracker = { wood: 0, stone: 0, food: 0, iron: 0 };
        this._rateSampleTimer = 0;
        this.showFps = false;
        this._fpsFrames = 0;
        this._fpsTimer = 0;
        this._fpsDisplay = 0;
        this.zoomLevel = 1;
        this.mouseSensitivity = 1;

        // ─── MULTIPLAYER ───────────────────────────────────────
        this.network = new Network(this);
        this.mpServerUrl = ''; // auto-detect from current origin

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
    // Get text on the world container (moves with camera)
    _getWorldText(str, style) {
        if (!this._worldTextPool) { this._worldTextPool = []; this._worldTextIdx = 0; }
        if (this._worldTextIdx < this._worldTextPool.length) {
            const t = this._worldTextPool[this._worldTextIdx];
            t.text = str; t.style = style; t.visible = true; t.alpha = 1;
            this._worldTextIdx++;
            return t;
        }
        const t = new PIXI.Text(str, style);
        t.anchor.set(0.5, 0.5);
        this.entityContainer.addChild(t);
        this._worldTextPool.push(t);
        this._worldTextIdx++;
        return t;
    }

    _resetWorldTextPool() {
        if (!this._worldTextPool) return;
        for (let i = this._worldTextIdx; i < this._worldTextPool.length; i++) {
            this._worldTextPool[i].visible = false;
        }
        this._worldTextIdx = 0;
    }

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
        html += '<div class="title-info">';
        html += '<p>Explore an infinite procedural world. Capture wild critters and put them to work mining, farming, researching, and crafting.</p>';
        html += '<p>Build walls and turrets to defend your colony. Assign patrol guards to fight off aggressive creatures.</p>';
        html += '<div class="title-lose"><b>Lose condition:</b> Your Colony HQ is destroyed → Game Over</div>';
        html += '<div class="title-controls">';
        html += '<span>WASD move</span><span>Hold Click shoot</span><span>Hold Q mine</span>';
        html += '<span>E capture</span><span>B build</span><span>T teleport</span><span>M map</span>';
        html += '</div>';
        html += '</div>';
        html += '<div class="title-buttons">';
        if (hasData) html += '<button class="title-btn title-continue" onclick="game.loadAndStart()">Continue</button>';
        html += '<button class="title-btn title-new" onclick="game.newGame()">New Game</button>';
        html += '<button class="title-btn title-new" onclick="game.toggleMpLobby()" style="border-color:rgba(102,187,106,.4);color:#66bb6a">Multiplayer</button>';
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
        this.research = gs.research || { gunDamage:0, storageCap:0, captureBonus:0, turretDamage:0, turretRange:0, afkCap:0, colonyRadius:0, critterCap:0, workersPerB:0, baseHp:0, baseTurret:0, bodyguardSlots:0, storageBuilding:0, smelting:0, greenhouse:0, barracks:0, refinery:0, healingHut:0, oilDrilling:0, goldMining:0, diamondDrill:0, crystalExtract:0, gasRefining:0, generators:0, companionSlots:0, passiveLab:0, ironSnare:0, goldSnare:0, diamondSnare:0 };
        this.researchInProgress = gs.researchInProgress || null;
        this.deadCritters = gs.deadCritters || [];
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
        this.resources = { wood: 50, stone: 50, food: 30, iron: 0 };
        this.resourceCaps = { wood: 200, stone: 200, food: 150, iron: 100, oil: 50, gold: 30, diamond: 15, crystal: 50, metal: 50 };
        this.inventory = { traps: 5, ammo: 120 };
        this.critters = []; this.deadCritters = [];
        this.research = { gunDamage:0, storageCap:0, captureBonus:0, turretDamage:0, turretRange:0, afkCap:0, colonyRadius:0, critterCap:0, workersPerB:0, baseHp:0, baseTurret:0, bodyguardSlots:0, storageBuilding:0, smelting:0, greenhouse:0, barracks:0, refinery:0, healingHut:0, oilDrilling:0, goldMining:0, diamondDrill:0, crystalExtract:0, gasRefining:0, generators:0, companionSlots:0, passiveLab:0, ironSnare:0, goldSnare:0, diamondSnare:0 };
        this.researchInProgress = null;
        // Place HQ at colony center
        this.buildings = [Buildings.place('hq', -1, -1, { wood:0, stone:0, food:0, iron:0 })];
        this.wildCritters = Critters.spawnWild(this.world);
        this.gameOver = false;
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
        // Set resource icon images
        this._setResIcons();
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
            if (e.key.toLowerCase() === 'q') this.miningHeld = true;
            if (e.key.toLowerCase() === 't') UI.showWaypointMenu = !UI.showWaypointMenu;
            if (e.key.toLowerCase() === 'm') this.showFullMap = !this.showFullMap;
            if (e.key.toLowerCase() === 'b') UI.toggleBuildMenu();
            if (e.key.toLowerCase() === 'n') this.toggleMpLobby();
            if (e.key === 'Escape') {
                if (this.paused) { this.togglePause(); }
                else if (document.getElementById('settingsPanel') && !document.getElementById('settingsPanel').classList.contains('hidden')) { this.toggleSettings(); }
                else if (UI.showBuildMenu) { UI.toggleBuildMenu(); }
                else { this.placementMode = null; UI.showWaypointMenu = false; this.showFullMap = false; }
            }
            if (e.key.toLowerCase() === 'p') this.togglePause();
        };
        window.onkeyup = (e) => {
            this.keys[e.key.toLowerCase()] = false;
            if (e.key.toLowerCase() === 'q') { this.miningHeld = false; this.miningProgress = 0; this.miningTarget = null; }
        };
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
                // MP broadcast
                this.network.sendAction('capture', { critter: result.captured });
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
        // Clean up building worker sprite
        if (critter._workerSprite) {
            critter._workerSprite.parent?.removeChild(critter._workerSprite);
            critter._workerSprite.destroy();
            critter._workerSprite = null;
        }
    }

    _shoot(wx, wy) {
        if (this.gunCooldown > 0) return;
        if ((this.inventory.ammo || 0) <= 0) {
            // Knife slash — melee attack, no ammo needed
            this.gunCooldown = 0.6;
            const knifeDmg = 5 + (this.research.gunDamage || 0) * 2;
            const knifeRange = TILE_SIZE * 2;
            for (const wc of this.wildCritters) {
                const dx = wc.x - this.player.x, dy = wc.y - this.player.y;
                if (Math.sqrt(dx*dx + dy*dy) < knifeRange) {
                    Critters.damageWild(wc, knifeDmg);
                    this.sounds.hit();
                    break;
                }
            }
            // Throttled ammo warning (once every 10 seconds)
            if (!this._lastAmmoWarn || this.time - this._lastAmmoWarn > 10) {
                this._lastAmmoWarn = this.time;
                UI.notify('Out of ammo! Using knife. Craft bullets at workbench.');
            }
            return;
        }
        this.gunCooldown = 0.5;
        this.inventory.ammo--;
        const angle = Math.atan2(wy - this.player.y, wx - this.player.x);
        const speed = 400, damage = this.gunDamage + (this.research.gunDamage || 0) * 5;
        const vx = Math.cos(angle)*speed, vy = Math.sin(angle)*speed;
        this.projectiles.push({ x: this.player.x, y: this.player.y, vx, vy, damage, lifetime: 2, fromTurret: false });
        this.network.sendProjectile(this.player.x, this.player.y, vx, vy, damage);
        this.sounds.shoot();
    }

    _handlePlacement(wx, wy) {
        const tx = Math.floor(wx / TILE_SIZE), ty = Math.floor(wy / TILE_SIZE);
        const type = this.placementMode.type, def = BUILDING_DEFS[type];

        // Extractor placement — must be on correct node type
        if (def.isExtractor) {
            if (!Buildings.canPlaceExtractor(tx, ty, this.buildings, this.world, def.nodeType)) {
                const info = NODE_INFO[def.nodeType];
                UI.notify(`Must place on ${info ? info.name : 'resource node'}!`); return;
            }
            if (!Buildings.canAfford(type, this.resources)) { UI.notify('Not enough resources!'); return; }
            const b = Buildings.place(type, tx, ty, this.resources);
            this.buildings.push(b);
            this.sounds.build();

            // Create outpost waypoint for this extractor
            const info = NODE_INFO[def.nodeType];
            const outpostName = `${info?.name || 'Outpost'} #${this.buildings.filter(bb => BUILDING_DEFS[bb.type].isExtractor).length}`;
            const existingWP = this.world.waypoints.find(w => Math.abs(w.x - tx) < 3 && Math.abs(w.y - ty) < 3);
            if (!existingWP) {
                this.world.waypoints.push({ name: outpostName, x: tx, y: ty, claimed: true, isOutpost: true });
            }

            UI.notify(`Built ${def.name}! Outpost waypoint created.`);
            // MP broadcast
            this.network.sendAction('build', { buildingType: type, building: { ...b, workers: [] } });
            this.placementMode = null; UI.update(); return;
        }

        if (!Buildings.canPlace(tx, ty, def.size, this.buildings, this.world)) { UI.notify('Cannot build here!'); return; }
        if (!Buildings.canAfford(type, this.resources)) { UI.notify('Not enough resources!'); return; }
        if (def.expander) {
            for (const [r,c] of Object.entries(def.cost)) this.resources[r] -= c;
            const radius = def.expandRadius + (this.research.colonyRadius || 0) * 2;
            this.world.expandColony(tx, ty, radius);
            // Invalidate affected chunk caches
            this._invalidateChunksNear(tx, ty, radius);
            // MP broadcast
            this.network.sendAction('colony-expand', { tx, ty, radius });
            UI.notify(`Colony expanded! (+${radius} tile radius)`);
            this.placementMode = null; UI.update(); return;
        }
        const b = Buildings.place(type, tx, ty, this.resources);
        this.buildings.push(b);
        this.sounds.build();
        // MP broadcast
        this.network.sendAction('build', { buildingType: type, building: { ...b, workers: [] } });
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
        const def = BUILDING_DEFS[type];
        if (def.researchReq && !(this.research[def.researchReq] > 0)) { UI.notify('Research required first!'); return; }
        if (!Buildings.canAfford(type, this.resources)) { UI.notify('Not enough resources!'); return; }
        this.placementMode = { type };
        if (UI.showBuildMenu) UI.toggleBuildMenu(); // close modal when placing
        UI.notify(`Click to place ${def.name}. ESC to cancel.`);
    }

    assignCritter(critterId, valueStr) {
        const critter = this.critters.find(c => c.id === critterId);
        if (!critter) return;
        if (critter.injured) {
            const mins = Math.ceil((critter.injuredTimer || 0) / 60);
            UI.notify(`${critter.nickname} is injured! (${mins}m left)`);
            return;
        }
        // Clean up old assignment sprites
        if (critter.assignment === 'patrol') {
            this._cleanupCritterSprite(critter);
        } else if (critter.assignment && critter.assignment !== 'patrol') {
            const oldB = this.buildings.find(b => b.id === critter.assignment);
            if (oldB) oldB.workers = oldB.workers.filter(w => w !== critterId);
            this._cleanupCritterSprite(critter);
        }
        if (valueStr === 'patrol') {
            critter.assignment = 'patrol';
            critter._patrolX = this.player.x + (Math.random() - 0.5) * 200;
            critter._patrolY = this.player.y + (Math.random() - 0.5) * 200;
            UI.notify(`${critter.nickname} is now on patrol!`);
        } else if (valueStr === 'companion') {
            const maxComp = 1 + (this.research.companionSlots || 0);
            const currentComp = this.critters.filter(c => c.assignment === 'companion').length;
            if (currentComp >= maxComp) { UI.notify(`Max ${maxComp} companions! Research Companion Bond.`); return; }
            critter.assignment = 'companion';
            const sp = SPECIES[critter.species];
            const typeInfo = CRITTER_TYPES[sp.type];
            UI.notify(`${critter.nickname} is now your companion! ${typeInfo?.icon || ''}`);
        } else if (valueStr === 'bodyguard') {
            const maxBG = 1 + (this.research.bodyguardSlots || 0);
            const currentBG = this.critters.filter(c => c.assignment === 'bodyguard').length;
            if (currentBG >= maxBG) { UI.notify(`Max ${maxBG} bodyguards! Research Bodyguard Training.`); return; }
            critter.assignment = 'bodyguard';
            UI.notify(`${critter.nickname} is now your bodyguard!`);
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
        UI._forceRebuild = true;
        UI.updatePanel();
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
        UI._forceRebuild = true;
        UI.updatePanel();
    }

    // Get combined companion effects
    _setResIcons() {
        const map = {
            riWood: 'wood', riStone: 'stone', riFood: 'food', riIron: 'iron',
            riOil: 'oil', riGold: 'gold', riDiamond: 'diamond', riGas: 'gasoline',
            riTrap: 'trap', riAmmo: 'ammo', riAether: 'aethershard',
        };
        for (const [elId, key] of Object.entries(map)) {
            const el = document.getElementById(elId);
            const icon = typeof RES_ICONS !== 'undefined' ? RES_ICONS[key] : null;
            if (el && icon && icon.complete && icon.src) el.src = icon.src;
        }
    }

    closeBuildMenu() { UI.toggleBuildMenu(); }
    switchBuildTab(tab) { UI.switchTab(tab); }

    getCompanionEffect(effectKey) {
        let total = 0;
        for (const c of this.critters) {
            if (c.assignment !== 'companion') continue;
            total += Critters.getPassiveEffect(c, effectKey);
            // Type-based companion bonuses
            const sp = SPECIES[c.species];
            const typeInfo = sp ? CRITTER_TYPES[sp.type] : null;
            if (typeInfo?.canSwim && effectKey === 'companionWaterWalk') total = 1; // any water type grants water walk
        }
        return total;
    }

    hasCompanionEffect(effectKey) {
        for (const c of this.critters) {
            if (c.assignment !== 'companion') continue;
            if (Critters.hasPassive(c, effectKey)) return true;
            const sp = SPECIES[c.species];
            const typeInfo = sp ? CRITTER_TYPES[sp.type] : null;
            if (typeInfo?.canSwim && effectKey === 'companionWaterWalk') return true;
        }
        return false;
    }

    // Transfer passive from one critter to another (costs gold)
    transferPassive(fromId, passiveId, toId) {
        const from = this.critters.find(c => c.id === fromId);
        const to = this.critters.find(c => c.id === toId);
        if (!from || !to) return;
        if (!from.passives || !from.passives.includes(passiveId)) { UI.notify('Critter doesn\'t have that passive!'); return; }
        if (to.passives && to.passives.includes(passiveId)) { UI.notify('Target already has that passive!'); return; }

        const goldCost = 10;
        if ((this.resources.gold || 0) < goldCost) { UI.notify(`Need ${goldCost} gold to transfer!`); return; }

        this.resources.gold -= goldCost;
        from.passives = from.passives.filter(p => p !== passiveId);
        if (!to.passives) to.passives = [];
        to.passives.push(passiveId);
        const p = PASSIVES[passiveId];
        UI.notify(`Transferred ${p?.name || passiveId} from ${from.nickname} to ${to.nickname}! (-${goldCost} gold)`);
        if (this.sounds) this.sounds.levelup?.();
        UI.update();
    }

    sacrificeCritter(critterId) {
        const critter = this.critters.find(c => c.id === critterId);
        if (!critter) return;
        const sp = SPECIES[critter.species];

        if (!confirm(`Sacrifice ${critter.nickname} (Lv.${critter.level} ${sp.name}) for food? This is permanent.`)) return;

        // Remove from building
        if (critter.assignment && critter.assignment !== 'patrol') {
            const bld = this.buildings.find(b => b.id === critter.assignment);
            if (bld) bld.workers = bld.workers.filter(w => w !== critterId);
        }

        // Food gained: base 10 + level * 5 + VIT * 2
        const foodGained = 10 + critter.level * 5 + (critter.stats.VIT || 0) * 2;
        const cap = (this.resourceCaps.food || 150) + (this.research.storageCap || 0) * 100;
        this.resources.food = Math.min(this.resources.food + foodGained, cap);

        this.critters = this.critters.filter(c => c.id !== critterId);
        if (!this.deadCritters) this.deadCritters = [];
        this.deadCritters.push({ ...critter, causeOfDeath: 'sacrificed' });

        UI.notify(`🩸 Sacrificed ${critter.nickname} for ${foodGained} food...`, 4000);
        if (this.sounds) this.sounds.sacrifice?.();
        UI.update();
    }

    _isNearWorkbench(buildingId) {
        const b = this.buildings.find(b => b.id === buildingId);
        if (!b) return false;
        const def = BUILDING_DEFS[b.type];
        const bcx = (b.gridX + def.size / 2) * TILE_SIZE;
        const bcy = (b.gridY + def.size / 2) * TILE_SIZE;
        const dx = this.player.x - bcx, dy = this.player.y - bcy;
        return Math.sqrt(dx * dx + dy * dy) < TILE_SIZE * 4;
    }

    manualCraft(buildingId, recipe) {
        recipe = recipe || 'trap';
        const b = this.buildings.find(b => b.id === buildingId);
        if (!b || !BUILDING_DEFS[b.type].isWorkbench) return;
        if (!this._isNearWorkbench(buildingId)) { UI.notify('Get closer to the Workbench!'); return; }
        if (recipe === 'trap') {
            if ((this.resources.wood||0) < 5 || (this.resources.stone||0) < 3) { UI.notify('Need 5 wood + 3 stone!'); return; }
        } else if (recipe === 'ammo') {
            if ((this.resources.iron||0) < 2 || (this.resources.stone||0) < 1) { UI.notify('Need 2 iron + 1 stone!'); return; }
        }
        b._manualCrafting = true;
        b._manualRecipe = recipe;
        b.craftProgress = 0;
        this.sounds.build();
        UI.notify(recipe === 'ammo' ? 'Crafting bullets...' : 'Crafting trap...');
    }

    queueCraft(buildingId, amount, recipe) {
        recipe = recipe || 'trap';
        const b = this.buildings.find(b => b.id === buildingId);
        if (!b || !BUILDING_DEFS[b.type].isWorkbench) return;
        if (!this._isNearWorkbench(buildingId)) { UI.notify('Get closer to the Workbench!'); return; }
        const queueMap = {
            trap: 'craftQueue', ammo: 'ammoQueue',
            iron_snare: 'ironSnareQueue', gold_snare: 'goldSnareQueue', diamond_snare: 'diamondSnareQueue',
        };
        const qKey = queueMap[recipe] || 'craftQueue';
        if (!b[qKey]) b[qKey] = 0;
        b[qKey] += amount;
        const names = { trap:'traps', ammo:'ammo batches', iron_snare:'Iron Snares', gold_snare:'Gold Snares', diamond_snare:'Diamond Snares' };
        UI.notify(`${amount} ${names[recipe]||recipe} queued (${b[qKey]} total)`);
        UI.update();
    }

    openWorkbench(buildingId) {
        this._activeWorkbench = buildingId;
        UI.update();
    }

    closeWorkbench() {
        this._activeWorkbench = null;
        UI.update();
    }

    renameCritter(critterId) {
        const c = this.critters.find(cr => cr.id === critterId);
        if (!c) return;
        const name = prompt(`Rename ${c.nickname}:`, c.nickname);
        if (name && name.trim().length > 0 && name.trim().length <= 16) {
            c.nickname = name.trim();
            UI.update();
        }
    }

    _triggerGameOver() {
        this.gameOver = true;
        this.paused = true;
        Save.deleteLocal();
        const mins = Math.floor(this.gameTimeSec / 60);
        const el = document.getElementById('pauseOverlay');
        el.classList.remove('hidden');
        el.querySelector('.pause-content').innerHTML = `
            <h2 style="color:#f87171">COLONY DESTROYED</h2>
            <p style="margin-bottom:8px">Your Colony HQ has been overrun!</p>
            <p style="color:#888;font-size:.85rem">Survived: ${mins} minutes | Critters captured: ${this.critters.length + this.deadCritters.length} | Fallen: ${this.deadCritters.length}</p>
            <button class="title-btn title-new" onclick="location.reload()" style="margin-top:16px">Try Again</button>
        `;
    }

    togglePause() {
        if (this.gameOver) return;
        this.paused = !this.paused;
        const el = document.getElementById('pauseOverlay');
        if (el) el.classList.toggle('hidden', !this.paused);
        const btn = document.getElementById('pauseBtn');
        if (btn) btn.textContent = this.paused ? '▶' : '⏸';
    }

    toggleSettings() {
        const el = document.getElementById('settingsPanel');
        if (el) el.classList.toggle('hidden');
    }

    applySetting(key, value) {
        switch (key) {
            case 'volume':
                this.sounds.setVolume(parseInt(value) / 100);
                document.getElementById('setVolumeVal').textContent = value + '%';
                break;
            case 'sfx':
                if (!value) this.sounds.toggleMute();
                else if (this.sounds.muted) this.sounds.toggleMute();
                break;
            case 'zoom':
                this.zoomLevel = parseInt(value) / 100;
                document.getElementById('setZoomVal').textContent = value + '%';
                break;
            case 'sensitivity':
                this.mouseSensitivity = parseInt(value) / 100;
                document.getElementById('setSensVal').textContent = value + '%';
                break;
            case 'fps':
                this.showFps = value;
                break;
        }
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
        // MP broadcast
        this.network.sendAction('research-start', { researchId });
        UI.notify(`Researching ${rd.name}...`); UI.update();
    }

    // ─── UPDATE ──────────────────────────────────────────────
    update(dt) {
        // FPS counter
        this._fpsFrames++;
        this._fpsTimer += dt;
        if (this._fpsTimer >= 1) { this._fpsDisplay = this._fpsFrames; this._fpsFrames = 0; this._fpsTimer = 0; }

        if (this.paused) return;

        this.gameTimeSec += dt;

        // Track resource rates (sample every 2 seconds)
        this._rateSampleTimer += dt;
        if (this._rateSampleTimer >= 2) {
            for (const r of ['wood', 'stone', 'food', 'iron']) {
                this._resourceRates[r] = ((this.resources[r] || 0) - (this._rateTracker[r] || 0)) / this._rateSampleTimer;
                this._rateTracker[r] = this.resources[r] || 0;
            }
            this._rateSampleTimer = 0;
        }

        let dx = 0, dy = 0;
        if (this.player._dead) { dx = 0; dy = 0; } // no movement while dead
        else {
        if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
        if (this.keys['s'] || this.keys['arrowdown']) dy += 1;
        if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
        if (this.keys['d'] || this.keys['arrowright']) dx += 1; }
        // Companion speed bonus
        const compSpeed = this.getCompanionEffect('companionSpeed');
        const canWaterWalk = this.hasCompanionEffect('companionWaterWalk');
        const moveSpeed = this.player.speed * (1 + compSpeed);

        // Companion mining speed bonus cached
        this.player._compMineBonus = this.getCompanionEffect('companionMine');

        if (dx || dy) {
            const len = Math.sqrt(dx*dx + dy*dy); dx /= len; dy /= len;
            const nx = this.player.x + dx * moveSpeed * dt;
            const ny = this.player.y + dy * moveSpeed * dt;
            const canWalk = (tx, ty) => {
                if (this.world.isWalkable(tx, ty)) return true;
                if (canWaterWalk && this.world.getTile(tx, ty) === TILE.WATER) return true;
                return false;
            };
            if (canWalk(Math.floor(nx/TILE_SIZE), Math.floor(ny/TILE_SIZE))) { this.player.x = nx; this.player.y = ny; }
            else {
                if (canWalk(Math.floor(nx/TILE_SIZE), Math.floor(this.player.y/TILE_SIZE))) this.player.x = nx;
                if (canWalk(Math.floor(this.player.x/TILE_SIZE), Math.floor(ny/TILE_SIZE))) this.player.y = ny;
            }
        }

        const w = this.pixiApp.screen.width, h = this.pixiApp.screen.height;
        this.cam.x += (this.player.x - w/2 - this.cam.x) * 0.1;
        this.cam.y += (this.player.y - h/2 - this.cam.y) * 0.1;

        this.world.updateLoadedChunks(this.player.x, this.player.y);

        this.gunCooldown = Math.max(0, this.gunCooldown - dt);
        if (this.mouseDown && this.gunCooldown <= 0 && !this.placementMode && !this.player._dead) {
            this._shoot(this.mouse.worldX, this.mouse.worldY);
        }

        // Mining (hold Q) — mine adjacent trees/rocks
        if (this.miningHeld) {
            const ptx = Math.floor(this.player.x / TILE_SIZE);
            const pty = Math.floor(this.player.y / TILE_SIZE);
            // Find closest tree or rock within 2 tiles
            if (!this.miningTarget) {
                let bestDist = Infinity;
                for (let dy = -2; dy <= 2; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        const tx = ptx + dx, ty = pty + dy;
                        const t = this.world.getTile(tx, ty);
                        if (t === TILE.TREE || t === TILE.ROCK || t === TILE.NODE_OIL) {
                            const d = Math.abs(dx) + Math.abs(dy);
                            if (d < bestDist) { bestDist = d; this.miningTarget = { tx, ty, type: t }; }
                        }
                    }
                }
            }
            if (this.miningTarget) {
                // Check still in range
                const mdx = this.miningTarget.tx - ptx, mdy = this.miningTarget.ty - pty;
                if (Math.abs(mdx) > 2 || Math.abs(mdy) > 2) {
                    this.miningTarget = null; this.miningProgress = 0;
                } else {
                    const baseMineTime = this.miningTarget.type === TILE.TREE ? 0.8 : this.miningTarget.type === TILE.NODE_OIL ? 2.0 : 1.2;
                    const mineTime = baseMineTime / (1 + (this.player._compMineBonus || 0));
                    this.miningProgress += dt;
                    if (this.miningProgress >= mineTime) {
                        const t = this.miningTarget.type;
                        const tx = this.miningTarget.tx, ty = this.miningTarget.ty;
                        // Harvest
                        const cap = (r) => (this.resourceCaps[r] || 50) + (this.research.storageCap || 0) * 100;
                        if (t === TILE.TREE) {
                            this.resources.wood = Math.min(this.resources.wood + 3, cap('wood'));
                        } else if (t === TILE.ROCK) {
                            this.resources.stone = Math.min(this.resources.stone + 3, cap('stone'));
                        } else if (t === TILE.NODE_OIL) {
                            this.resources.oil = Math.min((this.resources.oil || 0) + 1, cap('oil'));
                            UI.notify('+1 Oil', 1500);
                        }
                        // Clear tile to grass (except oil — oil nodes persist, just give resource)
                        if (t !== TILE.NODE_OIL) this.world.setTile(tx, ty, TILE.GRASS);
                        // Invalidate chunk cache
                        const cx = Math.floor(tx / CHUNK_SIZE), cy = Math.floor(ty / CHUNK_SIZE);
                        const cs = this._chunkSprites.get(cx + ',' + cy);
                        if (cs) cs.dirty = true;
                        this.sounds.hit();
                        this.miningProgress = 0;
                        this.miningTarget = null; // find next target
                    }
                }
            }
        }

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx * dt; p.y += p.vy * dt; p.lifetime -= dt;
            if (p.lifetime <= 0) { this.projectiles.splice(i, 1); continue; }
            for (const wc of this.wildCritters) {
                if (wc.stunned) continue;
                const hx = wc.x - p.x, hy = wc.y - p.y;
                if (Math.sqrt(hx*hx + hy*hy) < 12) {
                    Critters.damageWild(wc, p.damage);
                    this.sounds.slash();
                    // Slash hit effect
                    if (!this._hitEffects) this._hitEffects = [];
                    this._hitEffects.push({ x: wc.x, y: wc.y, timer: 0.2, angle: Math.atan2(p.vy, p.vx) });
                    this.projectiles.splice(i, 1); break;
                }
            }
        }

        const bodyguards = this.critters.filter(c => c.assignment === 'bodyguard');
        Critters.updateWild(dt, this.wildCritters, this.world, this.player, this.buildings, bodyguards);

        // Play slash sound for any critter that just attacked
        for (const c of this.wildCritters) {
            if (c._playSlash) { c._playSlash = false; if (this.sounds) this.sounds.slash(); }
        }

        // Handle despawned critters — spawn skull, then recycle
        for (const c of this.wildCritters) {
            if (c._despawned) {
                this.deathSkulls.push({ x: c.x, y: c.y, timer: 3 });
                this._cleanupCritterSprite(c);
                Critters.recycle(c, this.world);
            }
        }

        // Update death skulls
        for (let i = this.deathSkulls.length - 1; i >= 0; i--) {
            this.deathSkulls[i].timer -= dt;
            if (this.deathSkulls[i].timer <= 0) this.deathSkulls.splice(i, 1);
        }

        // Update hit slash effects
        if (this._hitEffects) {
            for (let i = this._hitEffects.length - 1; i >= 0; i--) {
                this._hitEffects[i].timer -= dt;
                if (this._hitEffects[i].timer <= 0) this._hitEffects.splice(i, 1);
            }
        }

        // Check building HP — destroy if 0
        for (let i = this.buildings.length - 1; i >= 0; i--) {
            const b = this.buildings[i];
            if (b.hp !== undefined && b.hp <= 0) {
                // Injure workers — 5 minute recovery, can't be assigned
                for (const cid of b.workers) {
                    const cr = this.critters.find(c => c.id === cid);
                    if (cr) {
                        cr.assignment = null;
                        cr.injured = true;
                        cr.injuredTimer = 300; // 5 minutes in seconds
                        this._cleanupCritterSprite(cr);
                        UI.notify(`${cr.nickname} was injured! (5 min recovery)`, 4000);
                    }
                }
                if (b._pixiSprite) { b._pixiSprite.destroy({ children: true }); b._pixiSprite = null; }
                this.sounds.destroy();
                // HQ destroyed = game over
                if (BUILDING_DEFS[b.type].isHQ) {
                    this.buildings.splice(i, 1);
                    this._triggerGameOver();
                    return;
                }
                UI.notify(`${BUILDING_DEFS[b.type].name} was destroyed!`, 4000);
                this.buildings.splice(i, 1);
            }
        }

        // Player death / respawn
        if (this.player._dead) {
            this.player._respawnTimer -= dt;
            if (this.player._respawnTimer <= 0) {
                this.player._dead = false;
                this.player.hp = this.player.maxHp;
                this.player.x = 0; this.player.y = 0;
                UI.notify('Respawned at colony.', 3000);
            }
        } else {
            if (this.player.hp < this.player.maxHp) {
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + 1 * dt);
            }
            if (this.player.hp <= 0) {
                this.player._dead = true;
                this.player._respawnTimer = 5;
                this.player.hp = 0;
                this.sounds.destroy();
                UI.notify('You were knocked out! Respawning in 5s...', 5000);
            }
        }

        const caps = {};
        for (const r of ['wood','stone','food','iron','oil','gold','diamond','crystal','metal']) caps[r] = (this.resourceCaps[r]||50) + (this.research.storageCap||0)*100;

        Buildings.update(dt, this.buildings, this.critters, this.resources, caps, this.inventory, this.hungry);
        for (const r of ['wood','stone','food','iron']) this.resources[r] = Math.min(this.resources[r], caps[r]);

        Buildings.updateTurrets(dt, this.buildings, this.wildCritters, this.projectiles, this.research);

        for (let pi = this.critters.length - 1; pi >= 0; pi--) {
            const c = this.critters[pi];
            if (c.assignment !== 'patrol') continue;
            if (!c._patrolAngle) c._patrolAngle = Math.random() * Math.PI * 2;
            if (!c._patrolX) c._patrolX = 0;
            if (!c._patrolY) c._patrolY = 0;
            if (!c._attackTimer) c._attackTimer = 0;
            if (!c._hurtTimer) c._hurtTimer = 0;
            c._attackTimer -= dt;
            c._hurtTimer -= dt;

            // Init patrol HP based on VIT
            if (!c.patrolMaxHp) { c.patrolMaxHp = 30 + (c.stats.VIT || 3) * 5; c.patrolHp = c.patrolMaxHp; }
            const hpBonus = Critters.getPassiveEffect(c, 'hpBonus');
            const effectiveMaxHp = Math.floor(c.patrolMaxHp * (1 + hpBonus));

            // Take damage from nearby wild critters that are aggroed
            for (const wc of this.wildCritters) {
                if (wc.stunned) continue;
                const sp = SPECIES[wc.species];
                if (!sp.aggressive && !wc._aggroed) continue;
                const dx = (c._patrolX||0) - wc.x, dy = (c._patrolY||0) - wc.y;
                const d = Math.sqrt(dx*dx + dy*dy);
                if (d < TILE_SIZE * 1.5 && c._hurtTimer <= 0) {
                    c.patrolHp -= (sp.attackDmg || 3);
                    c._hurtTimer = sp.attackCooldown || 1.5;
                    break;
                }
            }

            // Check death
            if (c.patrolHp <= 0) {
                if (Critters.hasPassive(c, 'immortal')) {
                    c.patrolHp = 1; // Undying passive
                } else if (Critters.hasPassive(c, 'deathSave') && !c._deathSaveUsed) {
                    c.patrolHp = Math.floor(effectiveMaxHp * 0.3);
                    c._deathSaveUsed = true;
                    UI.notify(`${c.nickname}'s Iron Will saved them!`);
                } else {
                    // Permadeath
                    this._cleanupCritterSprite(c);
                    this.deadCritters.push({ nickname: c.nickname, species: c.species, level: c.level, time: this.gameTimeSec });
                    this.sounds.destroy();
                    UI.notify(`${c.nickname} has fallen in battle! (Lv.${c.level} ${SPECIES[c.species].name})`, 5000);
                    this.critters.splice(pi, 1);
                    continue;
                }
            }

            // Regen 1 hp/sec when not being hurt
            if (c._hurtTimer <= 0 && c.patrolHp < effectiveMaxHp) {
                c.patrolHp = Math.min(effectiveMaxHp, c.patrolHp + 2 * dt);
            }

            // Find nearest wild critter within detection range (12 tiles)
            const detectRange = TILE_SIZE * 12;
            let target = null, targetDist = Infinity;
            for (const wc of this.wildCritters) {
                if (wc.stunned) continue;
                const ax = wc.x - (c._patrolX || 0), ay = wc.y - (c._patrolY || 0);
                const d = Math.sqrt(ax * ax + ay * ay);
                if (d < detectRange && d < targetDist) { targetDist = d; target = wc; }
            }

            if (target) {
                // Chase enemy
                const chx = target.x - c._patrolX, chy = target.y - c._patrolY;
                const chLen = Math.sqrt(chx * chx + chy * chy);
                if (chLen > TILE_SIZE * 1.2) {
                    const chaseSpeed = 90;
                    c._patrolX += (chx / chLen) * chaseSpeed * dt;
                    c._patrolY += (chy / chLen) * chaseSpeed * dt;
                }
                // Attack when close
                if (chLen < TILE_SIZE * 1.5 && c._attackTimer <= 0) {
                    Critters.damageWild(target, (c.stats.STR || 1) * 3);
                    c._attackTimer = 1.0;
                    this.sounds.hit();
                }
            } else {
                // Orbit colony when no enemies
                c._patrolAngle += dt * 0.3;
                const orbitR = CHUNK_SIZE * TILE_SIZE * 1.2;
                const targetX = Math.cos(c._patrolAngle + c.id * 1.5) * orbitR;
                const targetY = Math.sin(c._patrolAngle + c.id * 1.5) * orbitR;
                const pdx = targetX - c._patrolX, pdy = targetY - c._patrolY;
                const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
                if (pDist > 3) {
                    c._patrolX += (pdx / pDist) * 60 * dt;
                    c._patrolY += (pdy / pDist) * 60 * dt;
                }
            }
        }

        // ─── BODYGUARDS ──────────────────────────────────────
        for (const c of this.critters) {
            if (c.assignment !== 'bodyguard') continue;
            if (!c._attackTimer) c._attackTimer = 0;
            c._attackTimer -= dt;

            const followDist = 40 + (c.id % 3) * 20;
            const angle = (c.id % 4) * (Math.PI / 2) + this.time * 0.5;
            const targetX = this.player.x + Math.cos(angle) * followDist;
            const targetY = this.player.y + Math.sin(angle) * followDist;
            const dx = targetX - (c._patrolX || this.player.x);
            const dy = targetY - (c._patrolY || this.player.y);
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 5) {
                c._patrolX = (c._patrolX || this.player.x) + (dx / dist) * 180 * dt;
                c._patrolY = (c._patrolY || this.player.y) + (dy / dist) * 180 * dt;
            }

            if (c._attackTimer <= 0) {
                const dmg = (c.stats.STR || 1) * 3;
                let hit = false;

                // Attack wild critters
                for (const wc of this.wildCritters) {
                    if (wc.stunned) continue;
                    const ax = wc.x - c._patrolX, ay = wc.y - c._patrolY;
                    if (Math.sqrt(ax * ax + ay * ay) < TILE_SIZE * 5) {
                        Critters.damageWild(wc, dmg);
                        c._attackTimer = 1.0; hit = true;
                        if (this.sounds) this.sounds.hit();
                        break;
                    }
                }

                // Attack horde critters
                if (!hit) for (const wc of this.hordeCreatures) {
                    if (wc.stunned) continue;
                    const ax = wc.x - c._patrolX, ay = wc.y - c._patrolY;
                    if (Math.sqrt(ax * ax + ay * ay) < TILE_SIZE * 5) {
                        wc.hp -= dmg; if (wc.hp <= 0) { wc.stunned = true; wc.stunTimer = 3; }
                        c._attackTimer = 1.0; hit = true;
                        if (this.sounds) this.sounds.hit();
                        break;
                    }
                }

                // Attack world bosses
                if (!hit && this.worldBosses) for (const boss of this.worldBosses) {
                    if (boss.hp <= 0) continue;
                    const ax = boss.x - c._patrolX, ay = boss.y - c._patrolY;
                    if (Math.sqrt(ax * ax + ay * ay) < TILE_SIZE * 5) {
                        boss.hp -= dmg;
                        c._attackTimer = 1.0; hit = true;
                        if (this.sounds) this.sounds.hit();
                        break;
                    }
                }
            }
        }

        // ─── WORLD BOSSES ───────────────────────────────────
        if (!this.worldBosses) this.worldBosses = [];
        if (!this._bossSpawnTimer) this._bossSpawnTimer = 300;
        this._bossSpawnTimer -= dt;
        if (this._bossSpawnTimer <= 0 && this.worldBosses.length < 3) {
            this._spawnWorldBoss();
            this._bossSpawnTimer = 600;
        }
        this._updateWorldBosses(dt);

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

        // Tick injured critter recovery
        for (const c of this.critters) {
            if (c.injured) {
                c.injuredTimer -= dt;
                if (c.injuredTimer <= 0) {
                    c.injured = false;
                    c.injuredTimer = 0;
                    UI.notify(`${c.nickname} has recovered!`);
                }
            }
        }

        // ─── BUILDING PASSIVE HEAL ─────────────────────────
        for (const b of this.buildings) {
            const def = BUILDING_DEFS[b.type];
            if (!def.hp || b.hp >= (b.maxHp || def.hp)) continue;
            if (!b._lastDamageTime) b._lastDamageTime = 0;
            // Track when last damaged
            if (b.hp < (b._lastHp || b.hp)) {
                b._lastDamageTime = this.gameTimeSec;
            }
            b._lastHp = b.hp;
            // Heal 2 HP/sec after 2 minutes of no damage
            if (this.gameTimeSec - b._lastDamageTime > 120) {
                b.hp = Math.min((b.maxHp || def.hp), b.hp + 2 * dt);
            }
        }

        // ─── FOOD CONSUMPTION + STARVATION ────────────────
        if (!this._foodTimer) this._foodTimer = 0;
        if (!this._starveTimer) this._starveTimer = 0;
        this._foodTimer += dt;
        if (this._foodTimer >= 5) {
            this._foodTimer = 0;
            let activeCount = this.critters.filter(c => c.assignment).length;
            const consumption = activeCount * 0.1;
            if (this.resources.food >= consumption) {
                this.resources.food -= consumption;
                this.hungry = false;
                this._starveTimer = 0;
            } else {
                this.resources.food = Math.max(0, this.resources.food - consumption);
                if (!this.hungry) {
                    this.hungry = true;
                    UI.notify('⚠️ Critters are hungry! Build more Farms.', 4000);
                }
                // Starvation — after 60s of no food, critters start dying
                this._starveTimer += 5;
                if (this._starveTimer >= 60 && this.resources.food <= 0) {
                    // Kill the weakest assigned critter
                    const assigned = this.critters.filter(c => c.assignment);
                    if (assigned.length > 0) {
                        assigned.sort((a, b) => a.level - b.level);
                        const victim = assigned[0];
                        // Remove from building
                        if (victim.assignment && victim.assignment !== 'patrol') {
                            const bld = this.buildings.find(b => b.id === victim.assignment);
                            if (bld) bld.workers = bld.workers.filter(w => w !== victim.id);
                        }
                        this.critters = this.critters.filter(c => c.id !== victim.id);
                        if (!this.deadCritters) this.deadCritters = [];
                        this.deadCritters.push({ ...victim, causeOfDeath: 'starvation' });
                        UI.notify(`💀 ${victim.nickname} starved to death!`, 5000);
                        if (this.sounds) this.sounds.destroy?.();
                        this._starveTimer = 30; // next death in 30s if still starving
                        UI.update();
                    }
                }
            }
        }

        this.respawnTimer -= dt;
        if (this.respawnTimer <= 0) {
            this.respawnTimer = 30;
            // Top up wild critters if below min (reuse pool, don't regenerate)
            while (this.wildCritters.length < WILD_MIN_COUNT) {
                const rng = this.world._seededRng(Date.now() + this.wildCritters.length);
                const pos = this.world.randomGrassTile(rng);
                const commonKeys = Object.keys(SPECIES).filter(k => SPECIES[k].rarity === 'common');
                const uncommonKeys = Object.keys(SPECIES).filter(k => SPECIES[k].rarity === 'uncommon');
                const rareKeys = Object.keys(SPECIES).filter(k => SPECIES[k].rarity === 'rare');
                const legendaryKeys = Object.keys(SPECIES).filter(k => SPECIES[k].rarity === 'legendary');
                const roll = Math.random();
                let species;
                if (roll < 0.07 && legendaryKeys.length > 0) species = legendaryKeys[Math.floor(Math.random() * legendaryKeys.length)];
                else if (roll < 0.25 && rareKeys.length > 0) species = rareKeys[Math.floor(Math.random() * rareKeys.length)];
                else if (roll < 0.50 && uncommonKeys.length > 0) species = uncommonKeys[Math.floor(Math.random() * uncommonKeys.length)];
                else species = commonKeys[Math.floor(Math.random() * commonKeys.length)];
                const maxHp = RARITY_HP[SPECIES[species].rarity] || 30;
                this.wildCritters.push({
                    id: _nextCritterId++, species,
                    x: pos.x * TILE_SIZE + TILE_SIZE / 2, y: pos.y * TILE_SIZE + TILE_SIZE / 2,
                    stats: Critters.rollStats(species), hp: maxHp, maxHp,
                    stunned: false, stunTimer: 0, state: 'idle',
                    wanderTarget: null, wanderTimer: Math.random() * 3,
                    fleeing: false, fleeTimer: 0,
                });
            }
        }

        // ─── HORDE SYSTEM ────────────────────────────────────
        this.hordeTimer -= dt;
        if (this.hordeTimer <= 0 && !this.hordeActive) {
            this._startHorde();
        }
        if (this.hordeActive) {
            this._updateHorde(dt);
        }

        // Multiplayer network tick
        if (this.network) this.network.update(dt);

        // Update multiplayer HUD
        if (this.network && this.network.roomId) {
            const mpHud = document.getElementById('mpHud');
            if (mpHud && mpHud.classList.contains('hidden')) mpHud.classList.remove('hidden');
            const countEl = document.getElementById('mpPlayerCount');
            if (countEl) countEl.textContent = this.network.getPlayerCount();
            const roomEl = document.getElementById('mpRoomId');
            if (roomEl) roomEl.textContent = this.network.roomId;
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
            document.getElementById('resIron').textContent = `${Math.floor(this.resources.iron||0)}/${gc('iron')}`;
            document.getElementById('trapCount').textContent = this.inventory.traps;
            document.getElementById('ammoCount').textContent = this.inventory.ammo || 0;
            document.getElementById('aethershardCount').textContent = this.inventory.aethershards || 0;
            document.getElementById('critterCount').textContent = `${this.critters.length}/${Buildings.getMaxCritters(this.buildings, this.research)}`;
            const deadEl = document.getElementById('deadCount');
            if (this.deadCritters.length > 0) {
                deadEl.style.display = '';
                deadEl.querySelector('span').textContent = this.deadCritters.length;
                deadEl.title = this.deadCritters.map(d => `${d.nickname} Lv${d.level} (${SPECIES[d.species].name})`).join('\n');
            } else { deadEl.style.display = 'none'; }
            // Resource rates
            const fmtRate = (r) => { const v = this._resourceRates[r] || 0; return v >= 0.01 ? `+${v.toFixed(1)}/s` : v <= -0.01 ? `${v.toFixed(1)}/s` : ''; };
            document.getElementById('rateWood').textContent = fmtRate('wood');
            document.getElementById('rateStone').textContent = fmtRate('stone');
            document.getElementById('rateFood').textContent = fmtRate('food');
            document.getElementById('rateIron').textContent = fmtRate('iron');
            // Game time
            const mins = Math.floor(this.gameTimeSec / 60);
            const secs = Math.floor(this.gameTimeSec % 60);
            const hrs = Math.floor(mins / 60);
            document.getElementById('gameTime').textContent = hrs > 0 ? `${hrs}:${(mins%60).toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}` : `${mins}:${secs.toString().padStart(2,'0')}`;

            // Horde timer
            const hordeEl = document.getElementById('hordeTimer');
            if (hordeEl) {
                if (this.hordeActive) {
                    hordeEl.textContent = `⚔️ HORDE! (${this.hordeCreatures.length})`;
                    hordeEl.style.color = '#ff4444';
                } else {
                    const hm = Math.floor(this.hordeTimer / 60);
                    const hs = Math.floor(this.hordeTimer % 60);
                    hordeEl.textContent = `⚔️ ${hm}:${hs.toString().padStart(2, '0')}`;
                    hordeEl.style.color = this.hordeTimer < 60 ? '#ff4444' : '#f87171';
                }
            }

            if (UI.showBuildMenu) UI.updatePanel();
            this._updatePartyHud();
        }
    }

    _updatePartyHud() {
        const el = document.getElementById('partyHud');
        if (!el) return;

        const bodyguards = this.critters.filter(c => c.assignment === 'bodyguard');
        const companions = this.critters.filter(c => c.assignment === 'companion');

        if (bodyguards.length === 0 && companions.length === 0) { el.innerHTML = ''; return; }

        let html = '';

        if (bodyguards.length > 0) {
            html += '<div class="ph-section"><div class="ph-label">⚔️ Bodyguards</div>';
            for (const c of bodyguards) {
                const sp = SPECIES[c.species];
                const spriteImg = typeof CRITTER_SPRITES !== 'undefined' && CRITTER_SPRITES[c.species] && CRITTER_SPRITES[c.species].complete
                    ? `<img class="ph-icon" src="${CRITTER_SPRITES[c.species].src}">` : `<div class="ph-icon ph-icon-fb" style="background:${sp.color}"></div>`;
                const maxLv = Critters.MAX_LEVEL || 20;
                const php = Math.floor(c.patrolHp || 0), pmhp = c.patrolMaxHp || 50;
                const hpPct = Math.min(100, (php / pmhp) * 100);
                const xpNeeded = Critters.getXpForLevel(c.level);
                const xpPct = c.level >= maxLv ? 100 : Math.min(100, (c.xp / xpNeeded) * 100);

                html += `<div class="ph-critter">`;
                html += spriteImg;
                html += `<div class="ph-info">`;
                html += `<div class="ph-name">${c.nickname} <span class="ph-lv">Lv${c.level}</span></div>`;
                html += `<div class="ph-bar ph-hp"><div class="ph-fill ph-hp-fill" style="width:${hpPct}%"></div><span>❤️ ${php}/${pmhp}</span></div>`;
                html += `<div class="ph-bar ph-xp"><div class="ph-fill ph-xp-fill" style="width:${xpPct}%"></div><span>${c.level >= maxLv ? 'MAX' : `${c.xp}/${xpNeeded}`}</span></div>`;
                html += `</div></div>`;
            }
            html += '</div>';
        }

        if (companions.length > 0) {
            html += '<div class="ph-section"><div class="ph-label">💫 Companions</div>';
            for (const c of companions) {
                const sp = SPECIES[c.species];
                const spriteImg = typeof CRITTER_SPRITES !== 'undefined' && CRITTER_SPRITES[c.species] && CRITTER_SPRITES[c.species].complete
                    ? `<img class="ph-icon" src="${CRITTER_SPRITES[c.species].src}">` : `<div class="ph-icon ph-icon-fb" style="background:${sp.color}"></div>`;
                const typeInfo = CRITTER_TYPES[sp.type];
                const maxLv = Critters.MAX_LEVEL || 20;
                const xpNeeded = Critters.getXpForLevel(c.level);
                const xpPct = c.level >= maxLv ? 100 : Math.min(100, (c.xp / xpNeeded) * 100);

                // Hunger (active companions consume food)
                const hungerPct = this.hungry ? 0 : 100;

                html += `<div class="ph-critter">`;
                html += spriteImg;
                html += `<div class="ph-info">`;
                html += `<div class="ph-name">${c.nickname} <span class="ph-lv">Lv${c.level}</span>`;
                if (typeInfo) html += ` <span class="ph-type" style="color:${typeInfo.color}">${typeInfo.icon}</span>`;
                html += `</div>`;
                html += `<div class="ph-bar ph-xp"><div class="ph-fill ph-xp-fill" style="width:${xpPct}%"></div><span>${c.level >= maxLv ? 'MAX' : `${c.xp}/${xpNeeded}`}</span></div>`;
                html += `<div class="ph-bar ph-hunger"><div class="ph-fill ph-hunger-fill" style="width:${hungerPct}%"></div><span>${this.hungry ? '🍖 Starving!' : '🍖 Fed'}</span></div>`;
                html += `</div></div>`;
            }
            html += '</div>';
        }

        el.innerHTML = html;
    }

    // ─── PIXI RENDER ────────────────────────────────────────
    _pixiRender() {
        const w = this.pixiApp.screen.width, h = this.pixiApp.screen.height;
        const camX = this.cam.x, camY = this.cam.y;

        // Move world container (camera + zoom)
        this.worldContainer.scale.set(this.zoomLevel);
        this.worldContainer.x = -camX * this.zoomLevel + w * (1 - this.zoomLevel) / 2;
        this.worldContainer.y = -camY * this.zoomLevel + h * (1 - this.zoomLevel) / 2;

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

        // Horde critters (red-tinted)
        for (const h of this.hordeCreatures) {
            if (h.stunned) continue;
            const sp = SPECIES[h.species];
            const colorNum = parseInt(sp.color.replace('#', ''), 16);
            const r = h.isHorde ? 10 * (sp.size || 1) : 8;

            // Red glow ring
            gfx.lineStyle(2, 0xff0000, 0.6);
            gfx.drawCircle(h.x, h.y, r + 4);
            gfx.lineStyle(0);

            // Body
            gfx.beginFill(colorNum);
            gfx.drawCircle(h.x, h.y, r);
            gfx.endFill();

            // HP bar
            if (h.hp < h.maxHp) {
                const bw = r * 2.5;
                gfx.beginFill(0x333333);
                gfx.drawRect(h.x - bw / 2, h.y - r - 8, bw, 3);
                gfx.endFill();
                const pct = h.hp / h.maxHp;
                gfx.beginFill(pct > 0.5 ? 0x4ade80 : pct > 0.25 ? 0xfbbf24 : 0xf87171);
                gfx.drawRect(h.x - bw / 2, h.y - r - 8, bw * pct, 3);
                gfx.endFill();
            }
        }

        // World Bosses
        if (this.worldBosses) {
            for (const boss of this.worldBosses) {
                if (boss.hp <= 0) continue;
                const bc = parseInt(boss.color.replace('#', ''), 16);
                const r = TILE_SIZE * boss.size * 0.5;
                const pulse = Math.sin(this.time * 2) * 3;

                // Glow aura
                gfx.lineStyle(3, 0xffd700, 0.3 + Math.sin(this.time * 3) * 0.15);
                gfx.drawCircle(boss.x, boss.y, r + 8 + pulse);
                gfx.lineStyle(0);

                // Body
                gfx.beginFill(bc);
                gfx.drawCircle(boss.x, boss.y, r);
                gfx.endFill();

                // Inner pattern
                gfx.beginFill(0xffd700, 0.3);
                gfx.drawCircle(boss.x, boss.y, r * 0.4);
                gfx.endFill();

                // HP bar (wide)
                const bw = r * 3;
                gfx.beginFill(0x333333);
                gfx.drawRect(boss.x - bw / 2, boss.y - r - 14, bw, 6);
                gfx.endFill();
                const pct = boss.hp / boss.maxHp;
                gfx.beginFill(pct > 0.5 ? 0xff6600 : pct > 0.25 ? 0xff0000 : 0x880000);
                gfx.drawRect(boss.x - bw / 2, boss.y - r - 14, bw * pct, 6);
                gfx.endFill();
            }
        }

        // Bodyguard critters — use actual sprite
        for (const c of this.critters) {
            if (c.assignment !== 'bodyguard') continue;
            const sp = SPECIES[c.species];
            const bx = c._patrolX || this.player.x;
            const by = c._patrolY || this.player.y;
            const bob = Math.sin(this.time * 3 + c.id) * 2;
            const sizeScale = sp.size || 1;
            const r = Math.round(10 * sizeScale);

            // Shadow
            gfx.beginFill(0x000000, 0.2);
            gfx.drawEllipse(bx, by + 10, 8, 3);
            gfx.endFill();

            // Use PIXI sprite if available
            const tex = this._getCritterTex(c.species);
            if (tex) {
                if (!c._bgSprite) {
                    c._bgSprite = new PIXI.Sprite(tex);
                    c._bgSprite.anchor.set(0.5, 0.5);
                    this.entityContainer.addChild(c._bgSprite);
                }
                c._bgSprite.width = r * 2;
                c._bgSprite.height = r * 2;
                c._bgSprite.x = bx;
                c._bgSprite.y = by + bob;
                c._bgSprite.visible = true;
            } else {
                if (c._bgSprite) c._bgSprite.visible = false;
                const colorNum = parseInt(sp.color.replace('#', ''), 16);
                gfx.beginFill(colorNum);
                gfx.drawCircle(bx, by + bob, r);
                gfx.endFill();
            }

            // Blue shield indicator (world space)
            const t = this._getWorldText('\uD83D\uDEE1', { fontSize: 10 });
            t.x = bx; t.y = by + bob - r - 8;
        }

        // Projectiles
        for (const p of this.projectiles) {
            gfx.beginFill(p.fromTurret ? 0x90a4ae : 0xffd54f);
            gfx.drawCircle(p.x, p.y, 3);
            gfx.endFill();
        }

        // Hit slash effects — white arc lines
        if (this._hitEffects) {
            for (const fx of this._hitEffects) {
                const alpha = fx.timer / 0.2;
                const len = 20;
                // White slash arc
                gfx.lineStyle(3, 0xffffff, alpha);
                gfx.moveTo(fx.x + Math.cos(fx.angle - 0.5) * 4, fx.y + Math.sin(fx.angle - 0.5) * 4);
                gfx.lineTo(fx.x + Math.cos(fx.angle) * len, fx.y + Math.sin(fx.angle) * len);
                gfx.lineTo(fx.x + Math.cos(fx.angle + 0.5) * 4, fx.y + Math.sin(fx.angle + 0.5) * 4);
                // Second thin line
                gfx.lineStyle(1, 0xffffff, alpha * 0.6);
                gfx.moveTo(fx.x + Math.cos(fx.angle + Math.PI - 0.3) * 4, fx.y + Math.sin(fx.angle + Math.PI - 0.3) * 4);
                gfx.lineTo(fx.x + Math.cos(fx.angle + Math.PI) * 12, fx.y + Math.sin(fx.angle + Math.PI) * 12);
                gfx.lineTo(fx.x + Math.cos(fx.angle + Math.PI + 0.3) * 4, fx.y + Math.sin(fx.angle + Math.PI + 0.3) * 4);
                gfx.lineStyle(0);
            }
        }

        // Death skulls (world space)
        for (const skull of this.deathSkulls) {
            const alpha = Math.min(1, skull.timer / 1);
            const floatY = (3 - skull.timer) * 10;
            const t = this._getWorldText('\uD83D\uDC80', { fontSize: 16 });
            t.x = skull.x; t.y = skull.y - floatY;
            t.alpha = alpha;
        }

        // Boss location markers (pulsing skull pointing toward distant bosses)
        if (this.worldBosses) {
            for (const boss of this.worldBosses) {
                if (boss.hp <= 0) continue;
                const bdx = boss.x - this.player.x, bdy = boss.y - this.player.y;
                const bDist = Math.sqrt(bdx * bdx + bdy * bdy);
                if (bDist > 600) {
                    const angle = Math.atan2(bdy, bdx);
                    const edgeX = this.player.x + Math.cos(angle) * 450;
                    const edgeY = this.player.y + Math.sin(angle) * 450;
                    const pulse = 0.6 + Math.sin(this.time * 3) * 0.3;
                    const t = this._getWorldText('\uD83D\uDC80', { fontSize: 20 });
                    t.x = edgeX; t.y = edgeY;
                    t.alpha = pulse;
                }
            }
        }

        // Player
        const px = this.player.x, py = this.player.y;
        gfx.beginFill(0x000000, 0.3);
        gfx.drawEllipse(px, py + 16, 12, 5);
        gfx.endFill();
        // Draw player sprite (animated sprite sheet, 4 frames per direction)
        this._drawPlayer(px, py);

        // Player HP bar (above sprite)
        if (this.player.hp < this.player.maxHp) {
            const hpW = 32, hpH = 4;
            gfx.beginFill(0x333333);
            gfx.drawRect(px - hpW/2, py - 38, hpW, hpH);
            gfx.endFill();
            const pct = this.player.hp / this.player.maxHp;
            const hpColor = pct > 0.5 ? 0x4ade80 : pct > 0.25 ? 0xfbbf24 : 0xf87171;
            gfx.beginFill(hpColor);
            gfx.drawRect(px - hpW/2, py - 38, hpW * pct, hpH);
            gfx.endFill();
        }

        // Multiplayer peers
        if (this.network && this.network.roomId) {
            this.network.drawPeers(gfx);
        }

        // ── Overlay (screen-space) ──
        const ovr = this._overlayGfx;
        ovr.clear();
        this._resetTextPool();
        this._resetWorldTextPool();

        // Mining progress bar
        if (this.miningHeld && this.miningTarget && this.miningProgress > 0) {
            const mtx = this.miningTarget.tx * TILE_SIZE + TILE_SIZE / 2 - camX;
            const mty = this.miningTarget.ty * TILE_SIZE - 4 - camY;
            const mineTime = this.miningTarget.type === TILE.TREE ? 0.8 : 1.2;
            const pct = Math.min(1, this.miningProgress / mineTime);
            const barW = 28;
            ovr.beginFill(0x333333);
            ovr.drawRect(mtx - barW / 2, mty, barW, 4);
            ovr.endFill();
            ovr.beginFill(this.miningTarget.type === TILE.TREE ? 0x66bb6a : 0x90a4ae);
            ovr.drawRect(mtx - barW / 2, mty, barW * pct, 4);
            ovr.endFill();
            const label = this.miningTarget.type === TILE.TREE ? 'Chopping...' : 'Mining...';
            const mt = this._getText(label, { fontFamily: 'monospace', fontSize: 9, fontWeight: 'bold', fill: 0xffffff });
            mt.x = mtx; mt.y = mty - 8;
        }

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

        // Death respawn overlay
        if (this.player._dead) {
            ovr.beginFill(0x000000, 0.5);
            ovr.drawRect(0, 0, w, h);
            ovr.endFill();
            const secs = Math.ceil(this.player._respawnTimer || 0);
            const dt = this._getText(`KNOCKED OUT`, { fontFamily: 'monospace', fontSize: 28, fontWeight: 'bold', fill: 0xf87171 });
            dt.x = w / 2; dt.y = h / 2 - 20;
            const ds = this._getText(`Respawning in ${secs}s...`, { fontFamily: 'monospace', fontSize: 14, fill: 0xaaaaaa });
            ds.x = w / 2; ds.y = h / 2 + 15;
        }

        // FPS counter
        if (this.showFps) {
            const fps = this._getText(`FPS: ${this._fpsDisplay}`, { fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold', fill: 0x4ade80 });
            fps.anchor.set(1, 0);
            fps.x = w - 310; fps.y = 48;
        }

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
                if (!c._workerSprite) {
                    c._workerSprite = new PIXI.Sprite(tex);
                    c._workerSprite.anchor.set(0.5, 0.5);
                    this.entityContainer.addChild(c._workerSprite);
                } else if (c._workerSprite.texture !== tex) {
                    c._workerSprite.texture = tex;
                }
                c._workerSprite.width = 16; c._workerSprite.height = 16;
                c._workerSprite.x = workerX; c._workerSprite.y = workerY;
                c._workerSprite.visible = true;
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
        const sizeScale = sp.size || 1;
        const r = Math.round(12 * sizeScale);

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
            gfx.drawCircle(sx, sy + bob, Math.round(8 * sizeScale));
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

        // Stunned — stars above head (world space)
        if (critter.stunned) {
            const t = this._getWorldText('★ ★', { fontFamily: 'monospace', fontSize: 10, fill: 0xffd54f });
            t.x = sx; t.y = sy + bob - r - 10;
        }

        // HP bar (scales with critter size)
        if (critter.hp < critter.maxHp && !critter.stunned) {
            const barW = Math.max(20, r * 2.2), barH = 3;
            gfx.beginFill(0x333333);
            gfx.drawRect(sx - barW/2, sy + bob - r - 8, barW, barH);
            gfx.endFill();
            const pct = critter.hp / critter.maxHp;
            const hpColor = pct > 0.5 ? 0x4ade80 : pct > 0.25 ? 0xfbbf24 : 0xf87171;
            gfx.beginFill(hpColor);
            gfx.drawRect(sx - barW/2, sy + bob - r - 8, barW * pct, barH);
            gfx.endFill();
        }

        // Aggro indicator — red "!" only, no circle (world space)
        if (critter.state === 'aggro' || critter.state === 'attacking_building' || critter.state === 'aggro_bodyguard') {
            const t = this._getWorldText('!', { fontFamily: 'monospace', fontSize: 14, fontWeight: 'bold', fill: 0xf87171 });
            t.x = sx; t.y = sy + bob - r - 16;
        }

        // Slash animation when critter attacks — white arc line
        if (critter._justAttacked) {
            const angle = Math.atan2(
                (this.player.y || 0) - sy,
                (this.player.x || 0) - sx
            );
            const len = r + 14;
            // Main white slash
            gfx.lineStyle(3, 0xffffff, 0.9);
            gfx.moveTo(sx + Math.cos(angle - 0.6) * (r + 2), sy + bob + Math.sin(angle - 0.6) * (r + 2));
            gfx.lineTo(sx + Math.cos(angle) * len, sy + bob + Math.sin(angle) * len);
            gfx.lineTo(sx + Math.cos(angle + 0.6) * (r + 2), sy + bob + Math.sin(angle + 0.6) * (r + 2));
            // Thin trailing line
            gfx.lineStyle(1, 0xffffff, 0.5);
            gfx.moveTo(sx + Math.cos(angle - 0.8) * r, sy + bob + Math.sin(angle - 0.8) * r);
            gfx.lineTo(sx + Math.cos(angle) * (len + 4), sy + bob + Math.sin(angle) * (len + 4));
            gfx.lineTo(sx + Math.cos(angle + 0.8) * r, sy + bob + Math.sin(angle + 0.8) * r);
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

        // Multiplayer peers on minimap
        if (this.network && this.network.roomId) {
            const PEER_COLORS = [0x66bb6a, 0xffa726, 0xab47bc, 0x29b6f6, 0xef5350];
            let ci = 0;
            for (const [, peer] of this.network.peers) {
                const relX = peer.x / TILE_SIZE - playerTX;
                const relY = peer.y / TILE_SIZE - playerTY;
                if (Math.abs(relX) > tileRadius || Math.abs(relY) > tileRadius) { ci++; continue; }
                const ppx = centerX + relX * tileScale;
                const ppy = centerY + relY * tileScale;
                if (ppx > mx && ppx < mx + ms && ppy > my && ppy < my + ms) {
                    gfx.beginFill(PEER_COLORS[ci % PEER_COLORS.length]);
                    gfx.drawCircle(ppx, ppy, 2.5);
                    gfx.endFill();
                }
                ci++;
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

    _drawPlayer(px, py) {
        // Determine direction based on last movement
        if (!this.player._dir) this.player._dir = 'front';

        const mdx = (this.keys['d'] || this.keys['arrowright'] ? 1 : 0) - (this.keys['a'] || this.keys['arrowleft'] ? 1 : 0);
        const mdy = (this.keys['s'] || this.keys['arrowdown'] ? 1 : 0) - (this.keys['w'] || this.keys['arrowup'] ? 1 : 0);

        if (mdx > 0) this.player._dir = 'right';
        else if (mdx < 0) this.player._dir = 'left';
        else if (mdy > 0) this.player._dir = 'front';
        else if (mdy < 0) this.player._dir = 'back';

        // Single static sprites per direction
        // Left sprite is the base — right = left flipped horizontally
        const dir = this.player._dir;
        // The 'left' sprite file actually faces right, so:
        // Moving right = use 'left' image as-is (no flip)
        // Moving left = use 'left' image flipped
        const spriteKey = (dir === 'right' || dir === 'left') ? 'left' : dir;
        const sprite = typeof PLAYER_SPRITES !== 'undefined' ? PLAYER_SPRITES[spriteKey] : null;
        const flipX = dir === 'left';

        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
            const drawSize = 48; // render size in world pixels

            if (!this._playerCanvas) {
                this._playerCanvas = document.createElement('canvas');
                this._playerCanvas.width = drawSize;
                this._playerCanvas.height = drawSize;
            }
            const pctx = this._playerCanvas.getContext('2d');
            pctx.clearRect(0, 0, drawSize, drawSize);
            pctx.save();
            if (flipX) {
                pctx.scale(-1, 1);
                pctx.drawImage(sprite, 0, 0, sprite.naturalWidth, sprite.naturalHeight, -drawSize, 0, drawSize, drawSize);
            } else {
                pctx.drawImage(sprite, 0, 0, sprite.naturalWidth, sprite.naturalHeight, 0, 0, drawSize, drawSize);
            }
            pctx.restore();

            if (!this._playerPixiTex) {
                this._playerPixiTex = PIXI.Texture.from(this._playerCanvas);
                this._playerPixiSprite = new PIXI.Sprite(this._playerPixiTex);
                this._playerPixiSprite.anchor.set(0.5, 0.7); // feet near bottom
                this.worldContainer.addChild(this._playerPixiSprite);
            }
            this._playerPixiTex.update();
            this._playerPixiSprite.x = px;
            this._playerPixiSprite.y = py;
            this._playerPixiSprite.visible = true;
        } else {
            // Fallback blue circle
            if (this._playerPixiSprite) this._playerPixiSprite.visible = false;
            const gfx = this._gfx;
            gfx.beginFill(0x4FC3F7);
            gfx.lineStyle(2, 0xffffff);
            gfx.drawCircle(px, py, 10);
            gfx.endFill();
            gfx.lineStyle(0);
        }
    }

    _resize() {
        this.pixiApp.renderer.resize(window.innerWidth, window.innerHeight);
    }

    // ─── WORLD BOSSES ────────────────────────────────────────
    // Bosses drop "Aethershard" — rare ore that boosts a stat by 5
    _spawnWorldBoss() {
        const bossTypes = [
            { name: 'Stonecrusher', color: '#616161', hp: 500, dmg: 20, speed: 40, size: 3, drops: 2 },
            { name: 'Infernal Wyrm', color: '#d32f2f', hp: 400, dmg: 25, speed: 60, size: 2.5, drops: 2 },
            { name: 'Crystal Titan', color: '#7c4dff', hp: 700, dmg: 15, speed: 30, size: 3.5, drops: 3 },
            { name: 'Void Stalker', color: '#1a1a2e', hp: 350, dmg: 30, speed: 80, size: 2, drops: 2 },
            { name: 'Ancient Treant', color: '#2e7d32', hp: 800, dmg: 12, speed: 20, size: 4, drops: 4 },
        ];
        const type = bossTypes[Math.floor(Math.random() * bossTypes.length)];
        const angle = Math.random() * Math.PI * 2;
        const dist = (20 + Math.random() * 30) * TILE_SIZE;

        this.worldBosses.push({
            id: _nextCritterId++,
            ...type,
            x: Math.cos(angle) * dist,
            y: Math.sin(angle) * dist,
            maxHp: type.hp,
            _attackTimer: 0,
            _phase: 0, // bosses have attack phases
            _phaseTimer: 0,
        });

        UI.notify(`🔱 WORLD BOSS: ${type.name} has appeared!`, 6000);
        if (this.sounds) this.sounds.alert?.();
    }

    _updateWorldBosses(dt) {
        for (let i = this.worldBosses.length - 1; i >= 0; i--) {
            const boss = this.worldBosses[i];

            // Boss is dead
            if (boss.hp <= 0) {
                // Drop Aethershards
                if (!this.inventory.aethershards) this.inventory.aethershards = 0;
                this.inventory.aethershards += boss.drops;
                UI.notify(`🔱 ${boss.name} defeated! +${boss.drops} Aethershards!`, 5000);
                if (this.sounds) this.sounds.levelup?.();
                this.worldBosses.splice(i, 1);
                continue;
            }

            // Chase player if within 15 tiles
            const pdx = this.player.x - boss.x, pdy = this.player.y - boss.y;
            const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
            if (pDist < TILE_SIZE * 15 && pDist > TILE_SIZE * 1.5) {
                boss.x += (pdx / pDist) * boss.speed * dt;
                boss.y += (pdy / pDist) * boss.speed * dt;
            }

            // Attack player
            boss._attackTimer -= dt;
            if (pDist < TILE_SIZE * 2 && boss._attackTimer <= 0) {
                this.player.hp -= boss.dmg;
                boss._attackTimer = 2;
            }

            // Take projectile damage
            for (let pi = this.projectiles.length - 1; pi >= 0; pi--) {
                const p = this.projectiles[pi];
                const hx = boss.x - p.x, hy = boss.y - p.y;
                if (Math.sqrt(hx * hx + hy * hy) < TILE_SIZE * boss.size * 0.5) {
                    boss.hp -= p.damage;
                    this.projectiles.splice(pi, 1);
                }
            }
        }
    }

    // Use Aethershard on a critter
    useAethershard(critterId, statKey) {
        if (!this.inventory.aethershards || this.inventory.aethershards <= 0) {
            UI.notify('No Aethershards!'); return;
        }
        const critter = this.critters.find(c => c.id === critterId);
        if (!critter) return;
        if (!critter.stats[statKey]) { UI.notify('Invalid stat!'); return; }

        this.inventory.aethershards--;
        critter.stats[statKey] += 5;
        UI.notify(`✨ ${critter.nickname}'s ${statKey} +5! (now ${critter.stats[statKey]})`, 4000);
        if (this.sounds) this.sounds.levelup?.();
        UI.update();
    }

    // ─── MULTIPLAYER ─────────────────────────────────────────
    toggleMpLobby() {
        const el = document.getElementById('mpLobby');
        if (!el) return;
        const showing = el.classList.contains('hidden');
        el.classList.toggle('hidden', !showing);
        if (showing) {
            // Set default server URL
            const serverInput = document.getElementById('mpServer');
            if (serverInput && !serverInput.value) {
                serverInput.value = window.location.origin;
            }
        }
    }

    closeMpLobby() {
        const el = document.getElementById('mpLobby');
        if (el) el.classList.add('hidden');
    }

    _getMpServerUrl() {
        const input = document.getElementById('mpServer');
        return (input && input.value.trim()) || window.location.origin;
    }

    _getMpName() {
        const input = document.getElementById('mpName');
        return (input && input.value.trim()) || 'Player';
    }

    _setMpStatus(msg, isError) {
        const el = document.getElementById('mpStatus');
        if (el) {
            el.textContent = msg;
            el.className = 'mp-status' + (isError ? ' error' : '');
        }
    }

    async mpHost() {
        try {
            this._setMpStatus('Connecting...');
            await this.network.connect(this._getMpServerUrl());
            const res = await this.network.createRoom(this._getMpName());
            this._setMpStatus(`Room created: ${res.roomId}`);
            // Add host response to state request
            this.network.socket.on('colony:request-state', (data, cb) => {
                const gs = Save._buildGameState(this);
                cb(gs);
            });
            setTimeout(() => this.closeMpLobby(), 800);
        } catch (e) {
            this._setMpStatus('Failed: ' + e.message, true);
        }
    }

    async mpRefreshRooms() {
        try {
            this._setMpStatus('Connecting...');
            if (!this.network.connected) {
                await this.network.connect(this._getMpServerUrl());
            }
            const rooms = await this.network.listRooms();
            const listEl = document.getElementById('mpRoomList');
            if (!listEl) return;
            if (rooms.length === 0) {
                listEl.innerHTML = '<div style="color:#666;text-align:center;padding:12px;font-size:.85rem">No rooms found. Host a game to get started!</div>';
            } else {
                listEl.innerHTML = rooms.map(r => `
                    <div class="mp-room-item">
                        <div class="mp-room-info">
                            <div class="mp-room-host">${this._escapeHtml(r.hostName)}'s Colony</div>
                            <div class="mp-room-meta">Code: ${r.roomId} | ${r.playerCount}/${r.maxPlayers} players</div>
                        </div>
                        <button class="mp-room-join" onclick="game.mpJoin('${r.roomId}')">Join</button>
                    </div>
                `).join('');
            }
            this._setMpStatus(`Found ${rooms.length} room(s)`);
        } catch (e) {
            this._setMpStatus('Failed: ' + e.message, true);
        }
    }

    async mpJoin(roomId) {
        try {
            this._setMpStatus('Joining...');
            if (!this.network.connected) {
                await this.network.connect(this._getMpServerUrl());
            }
            await this.network.joinRoom(roomId, this._getMpName());
            this._setMpStatus('Joined!');
            // If not started yet, start the game
            if (this.titleScreen) {
                this._startGame();
            }
            setTimeout(() => this.closeMpLobby(), 500);
        } catch (e) {
            this._setMpStatus('Failed: ' + e.message, true);
        }
    }

    async mpJoinByCode() {
        const codeInput = document.getElementById('mpJoinCode');
        const code = codeInput ? codeInput.value.trim().toUpperCase() : '';
        if (!code || code.length < 3) {
            this._setMpStatus('Enter a valid room code', true);
            return;
        }
        await this.mpJoin(code);
    }

    mpLeave() {
        this.network.leaveRoom();
        this.network.disconnect();
        const mpHud = document.getElementById('mpHud');
        if (mpHud) mpHud.classList.add('hidden');
        UI.notify('Left multiplayer session.', 3000);
    }

    _escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ─── HORDE SYSTEM ──────────────────────────────────────
    _startHorde() {
        this.hordeWave++;
        this.hordeActive = true;
        this.hordeCreatures = [];

        // Scale difficulty with wave
        const baseCount = 6 + this.hordeWave * 3;
        const count = Math.min(baseCount, 40);
        const hpMult = 1 + this.hordeWave * 0.3;
        const dmgMult = 1 + this.hordeWave * 0.2;

        // Pick species weighted toward aggressive ones
        const aggroSpecies = Object.keys(SPECIES).filter(k => SPECIES[k].aggressive);
        const allSpecies = Object.keys(SPECIES);

        for (let i = 0; i < count; i++) {
            // Spawn in a ring around colony (8-14 tiles out)
            const angle = (Math.PI * 2 / count) * i + Math.random() * 0.3;
            const dist = (8 + Math.random() * 6) * CHUNK_SIZE;
            const sx = Math.cos(angle) * dist * TILE_SIZE;
            const sy = Math.sin(angle) * dist * TILE_SIZE;

            // Higher waves spawn rarer critters
            let species;
            const roll = Math.random();
            if (this.hordeWave >= 5 && roll < 0.05) species = 'dreadmaw';
            else if (this.hordeWave >= 3 && roll < 0.15) species = aggroSpecies[Math.floor(Math.random() * aggroSpecies.length)];
            else species = aggroSpecies[Math.floor(Math.random() * aggroSpecies.length)];

            const sp = SPECIES[species];
            const baseHp = (RARITY_HP[sp.rarity] || 30) * hpMult;

            this.hordeCreatures.push({
                id: _nextCritterId++,
                species,
                x: sx, y: sy,
                hp: Math.floor(baseHp),
                maxHp: Math.floor(baseHp),
                stats: Critters.rollStats(species),
                dmgMult,
                state: 'charging', // always charge toward HQ
                _attackTimer: 0,
                stunned: false, stunTimer: 0,
                fleeing: false, fleeTimer: 0,
                _aggroed: true,
                isHorde: true,
            });
        }

        UI.notify(`⚠️ HORDE WAVE ${this.hordeWave}! ${count} creatures attacking!`, 6000);
        if (this.sounds) this.sounds.alert?.();
    }

    _updateHorde(dt) {
        if (this.hordeCreatures.length === 0) {
            this.hordeActive = false;
            this.hordeTimer = this.hordeInterval;
            UI.notify(`✅ Horde wave ${this.hordeWave} defeated!`, 4000);
            return;
        }

        for (let i = this.hordeCreatures.length - 1; i >= 0; i--) {
            const h = this.hordeCreatures[i];

            // Stunned — remove from horde (defeated), spawn skull
            if (h.stunned) {
                h.stunTimer -= dt;
                if (h.stunTimer <= 0) {
                    this.deathSkulls.push({ x: h.x, y: h.y, timer: 3 });
                    this.hordeCreatures.splice(i, 1);
                }
                continue;
            }

            // Charge toward HQ (0,0)
            const dx = -h.x, dy = -h.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const speed = 80;
            if (dist > TILE_SIZE * 2) {
                h.x += (dx / dist) * speed * dt;
                h.y += (dy / dist) * speed * dt;
            }

            // Attack buildings near them
            if (!h._attackTimer) h._attackTimer = 0;
            h._attackTimer -= dt;
            if (h._attackTimer <= 0) {
                const sp = SPECIES[h.species];
                for (const b of this.buildings) {
                    const def = BUILDING_DEFS[b.type];
                    const bcx = (b.gridX + def.size / 2) * TILE_SIZE;
                    const bcy = (b.gridY + def.size / 2) * TILE_SIZE;
                    const bdist = Math.sqrt((h.x - bcx) ** 2 + (h.y - bcy) ** 2);
                    if (bdist < TILE_SIZE * 2) {
                        const dmg = Math.floor((sp.attackDmg || 3) * (h.dmgMult || 1));
                        if (b.hp !== undefined) b.hp -= dmg;
                        h._attackTimer = sp.attackCooldown || 1.5;
                        break;
                    }
                }

                // Also attack player if close
                const pdist = Math.sqrt((h.x - this.player.x) ** 2 + (h.y - this.player.y) ** 2);
                if (pdist < TILE_SIZE * 1.5 && h._attackTimer <= 0) {
                    const sp = SPECIES[h.species];
                    this.player.hp -= Math.floor((sp.attackDmg || 3) * (h.dmgMult || 1));
                    h._attackTimer = sp.attackCooldown || 1.5;
                }
            }
        }

        // Projectiles hit horde creatures
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            for (const h of this.hordeCreatures) {
                if (h.stunned) continue;
                const hx = h.x - p.x, hy = h.y - p.y;
                if (Math.sqrt(hx * hx + hy * hy) < 14) {
                    h.hp -= p.damage;
                    if (h.hp <= 0) {
                        h.stunned = true;
                        h.stunTimer = 3; // shorter stun, just for death animation
                    }
                    this.projectiles.splice(i, 1);
                    break;
                }
            }
        }

        // Turrets also target horde creatures
        Buildings.updateTurrets(dt, this.buildings, this.hordeCreatures, this.projectiles, this.research);

        // Patrol critters attack horde
        for (const c of this.critters) {
            if (c.assignment !== 'patrol') continue;
            if (!c._attackTimer) c._attackTimer = 0;
            c._attackTimer -= dt;
            if (c._attackTimer <= 0) {
                for (const h of this.hordeCreatures) {
                    if (h.stunned) continue;
                    const ax = h.x - (c._patrolX || 0), ay = h.y - (c._patrolY || 0);
                    if (Math.sqrt(ax * ax + ay * ay) < TILE_SIZE * 5) {
                        h.hp -= (c.stats.STR || 1) * 2;
                        if (h.hp <= 0) { h.stunned = true; h.stunTimer = 3; }
                        c._attackTimer = 1.5;
                        break;
                    }
                }
            }
        }
    }
}

const game = new Game();
