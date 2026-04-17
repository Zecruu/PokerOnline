/* ============================================================
   Critter Colony — Main Game Engine (PixiJS Renderer)
   ============================================================
   GUN_TIERS and ARMOR_TIERS are loaded from data/equipment.json
   by config.js. Edit that file to mod weapon/armor stats and costs.
   ============================================================ */

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.world = new World();

        this.player = { x: 0, y: 0, speed: 200, hp: 100, maxHp: 100, level: 1, xp: 0, hunger: 100 };
        this.gunTier = 1;
        this.armorTier = 1;
        this.cam = { x: 0, y: 0 };

        this.resources = { wood: 50, stone: 50, food: 30, iron: 0 }; // 30 = forage
        this.resourceCaps = { wood: 200, stone: 200, food: 150, iron: 100, oil: 50, gold: 30, diamond: 15, crystal: 50, metal: 50 };
        this.inventory = { traps: 5, ammo: 120 };
        this.buildings = [];
        this.critters = [];
        this.wildCritters = [];
        this.projectiles = [];
        this.deadCritters = []; // permadeath graveyard
        this.discoveredSpecies = []; // Critterdex — species IDs the player has captured

        // Combat
        this.gunCooldown = 0;
        this.gunDamage = 10;
        this.mouseDown = false;

        // Mining
        this.miningHeld = false;
        this.miningProgress = 0;
        this.miningTarget = null; // {tx, ty, type}

        // Tech tree (replaces research). research field kept as alias for backwards-compat —
        // most game code reads `this.research.X` to get unlock levels. We point it at techUnlocks.
        this.skillPoints = 0;
        this.techUnlocks = {};
        this.research = this.techUnlocks; // alias for legacy code
        this.researchInProgress = null; // unused but kept to avoid undefined refs

        // Doctrine (colony-wide strategic identity)
        this.doctrine = { active: null, unlocked: [], pendingSelection: false };

        // Input
        this.keys = {};
        this.mouse = { x: 0, y: 0, worldX: 0, worldY: 0 };
        this.placementMode = null;
        this._waypointButtons = [];
        this.showFullMap = false;

        // Death skulls (visual markers that despawn after 3s)
        this.deathSkulls = []; // { x, y, timer }
        // Floating damage numbers
        this.damageNumbers = []; // { x, y, text, timer, color, vy }

        // Horde system
        this.hordeTimer = 15 * 60; // 15 minutes default
        this.hordeInterval = 15 * 60;
        this.hordeWave = 0;
        this.hordeActive = false;
        this.hordeCreatures = [];

        // Hostile enemies (non-capturable)
        this.hostileEnemies = [];
        this._enemySpawnTimer = 15; // first check after 15s

        // Timers
        this.autoSaveTimer = 60;
        this.respawnTimer = 10;
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
        preloadEnemySprites();
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
        // Restore node pools + respawns
        if (gs.nodePools) {
            this.world.nodePools = new Map(gs.nodePools.map(([k, v]) => [k, v === '∞' ? Infinity : v]));
        }
        if (gs.nodeRespawns) this.world.nodeRespawns = new Map(gs.nodeRespawns);
        this.player.x = gs.playerPos.x;
        this.player.y = gs.playerPos.y;
        this.player.hunger = gs.playerHunger !== undefined ? gs.playerHunger : 100;
        this.skillPoints = gs.skillPoints || 0;
        this.techUnlocks = gs.techUnlocks || {};
        this.resources = { ...gs.resources };
        this.resourceCaps = gs.resourceCaps || { wood: 200, stone: 200, food: 150 };
        this.inventory = { ...gs.inventory };
        this.buildings = gs.buildings
            .filter(b => BUILDING_DEFS[b.type]) // skip removed buildings (e.g. research_lab from old saves)
            .map(b => {
                const def = BUILDING_DEFS[b.type];
                const maxHp = def ? (def.hp || 100) : 100;
                return { ...b, workers: [...b.workers], turretCooldown: 0, turretTarget: null, hp: b.hp ?? maxHp, maxHp };
            });
        this.critters = gs.critters.map(c => {
            const restored = { ...c, stats: { ...c.stats }, hunger: c.hunger !== undefined ? c.hunger : 100 };
            // Clear assignment if it points to a building that no longer exists (e.g. removed research_lab)
            if (restored.assignment && typeof restored.assignment === 'number') {
                const bld = this.buildings.find(b => b.id === restored.assignment);
                if (!bld) restored.assignment = null;
            }
            return restored;
        });
        // Tech tree — merge legacy `research` field with new `techUnlocks` (whichever has data wins)
        this.techUnlocks = { ...(gs.research || {}), ...(gs.techUnlocks || {}) };
        this.research = this.techUnlocks; // alias for legacy code paths
        this.researchInProgress = null; // research progress system removed
        this.deadCritters = gs.deadCritters || [];
        this.discoveredSpecies = gs.discoveredSpecies || [];
        // Doctrine state
        this.doctrine = gs.doctrine || { active: null, unlocked: [], pendingSelection: false };
        // Backfill: mark all currently owned critter species as discovered
        for (const c of this.critters) {
            if (!this.discoveredSpecies.includes(c.species)) this.discoveredSpecies.push(c.species);
        }
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
        this.resources = { wood: 50, stone: 50, food: 30, iron: 0 }; // 30 = forage
        this.resourceCaps = { wood: 200, stone: 200, food: 150, iron: 100, oil: 50, gold: 30, diamond: 15, crystal: 50, metal: 50 };
        this.inventory = { traps: 5, ammo: 120 };
        this.critters = []; this.deadCritters = [];
        this.research = { gunDamage:0, storageCap:0, captureBonus:0, turretDamage:0, turretRange:0, afkCap:0, colonyRadius:0, critterCap:0, workersPerB:0, baseHp:0, baseTurret:0, bodyguardSlots:0, storageBuilding:0, smelting:0, greenhouse:0, barracks:0, refinery:0, healingHut:0, oilDrilling:0, goldMining:0, diamondDrill:0, crystalExtract:0, gasRefining:0, generators:0, companionSlots:0, passiveLab:0, ironSnare:0, goldSnare:0, diamondSnare:0 };
        this.researchInProgress = null;
        this.doctrine = { active: null, unlocked: [], pendingSelection: false };
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
        Doctrines.init(this);
        if (typeof PollutionSystem !== 'undefined') PollutionSystem.init(this);
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
            if (e.key.toLowerCase() === 'x') this._handleExecute();
            if (e.key.toLowerCase() === 'q') this.miningHeld = true;
            if (e.key.toLowerCase() === 't') UI.showWaypointMenu = !UI.showWaypointMenu;
            if (e.key.toLowerCase() === 'm') this.showFullMap = !this.showFullMap;
            if (e.key.toLowerCase() === 'b') UI.toggleBuildMenu();
            if (e.key === 'Escape') {
                if (this.paused) { this.togglePause(); }
                else if (document.getElementById('settingsPanel') && !document.getElementById('settingsPanel').classList.contains('hidden')) { this.toggleSettings(); }
                else if (UI.showBuildMenu) { UI.toggleBuildMenu(); }
                else { this.placementMode = null; UI.showWaypointMenu = false; this.showFullMap = false; }
            }
            if (e.key.toLowerCase() === 'p') this.togglePause();
            // Debug: F10 toggles pollution viz, F11 toggles damage
            if (e.key === 'F10' && typeof PollutionSystem !== 'undefined') { e.preventDefault(); PollutionSystem.toggleVisualize(); }
            if (e.key === 'F11' && typeof PollutionSystem !== 'undefined') { e.preventDefault(); PollutionSystem.toggleDamage(); }
        };
        window.onkeyup = (e) => {
            this.keys[e.key.toLowerCase()] = false;
            if (e.key.toLowerCase() === 'q') { this.miningHeld = false; this.miningProgress = 0; this.miningTarget = null; }
        };
        this.canvas.onmousemove = (e) => {
            const r = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - r.left; this.mouse.y = e.clientY - r.top;
            // Screen → world, accounting for zoom
            const w = this.pixiApp.screen.width, h = this.pixiApp.screen.height;
            const zoom = this.zoomLevel || 1;
            this.mouse.worldX = (this.mouse.x - w * (1 - zoom) / 2) / zoom + this.cam.x;
            this.mouse.worldY = (this.mouse.y - h * (1 - zoom) / 2) / zoom + this.cam.y;
        };
        this.canvas.onmousedown = (e) => {
            if (this.titleScreen || !this.started) return;
            const r = this.canvas.getBoundingClientRect();
            const mx = e.clientX - r.left, my = e.clientY - r.top;
            // Screen → world, accounting for zoom
            const w = this.pixiApp.screen.width, hh = this.pixiApp.screen.height;
            const zoom = this.zoomLevel || 1;
            const wx = (mx - w * (1 - zoom) / 2) / zoom + this.cam.x;
            const wy = (my - hh * (1 - zoom) / 2) / zoom + this.cam.y;
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
                // Preserve wild level on the captured pal so late-game captures aren't reset
                result.captured.level = Math.max(1, closest.level || 1);
                this.critters.push(result.captured);
                // Critterdex discovery
                if (!this.discoveredSpecies.includes(closest.species)) {
                    this.discoveredSpecies.push(closest.species);
                    UI.notify(`\ud83d\udcd6 New Critterdex entry: ${SPECIES[closest.species]?.name || closest.species}!`, 5000);
                }
                // Capture XP bonus — bigger than kill, scales with wild level + rarity
                const rarity = SPECIES[closest.species]?.rarity || 'common';
                const rarityMul = { common: 1.2, uncommon: 1.8, rare: 2.6, legendary: 4.5 }[rarity] || 1;
                this.grantPlayerXp(Math.floor((10 + (closest.level || 1) * 2) * rarityMul));
                this.sounds.capture();
                // MP broadcast
                // multiplayer removed
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
        if (this.player._stunned) return;
        if ((this.inventory.ammo || 0) <= 0) {
            // Dry-fire stump thud on every attempt — player hears they have no ammo
            if (this.sounds) this.sounds.ammoLow?.();
            // Knife slash — melee attack, no ammo needed
            this.gunCooldown = 0.6;
            const knifeDmg = 5 + (this.research.gunDamage || 0) * 2;
            const knifeRange = TILE_SIZE * 2;
            const slashAngle = Math.atan2(wy - this.player.y, wx - this.player.x);
            // Always show swing arc toward mouse
            if (!this._knifeSwings) this._knifeSwings = [];
            this._knifeSwings.push({ x: this.player.x, y: this.player.y, angle: slashAngle, timer: 0.25 });
            let knifeHit = false;
            // Hit wild critters
            for (const wc of this.wildCritters) {
                const dx = wc.x - this.player.x, dy = wc.y - this.player.y;
                if (Math.sqrt(dx*dx + dy*dy) < knifeRange) {
                    Critters.damageWild(wc, knifeDmg);
                    this._spawnDmgNum(wc.x, wc.y, knifeDmg, 0xff8a65);
                    this._awardKillXp(wc);
                    this.sounds.hit();
                    knifeHit = true;
                    break;
                }
            }
            // Also hit horde critters
            if (!knifeHit) for (const h of this.hordeCreatures) {
                if (h.stunned) continue;
                const dx = h.x - this.player.x, dy = h.y - this.player.y;
                if (Math.sqrt(dx*dx + dy*dy) < knifeRange) {
                    h.hp -= knifeDmg;
                    if (h.hp <= 0) { h.stunned = true; h.stunTimer = 3; }
                    this._spawnDmgNum(h.x, h.y, knifeDmg, 0xff8a65);
                    this.sounds.hit();
                    knifeHit = true;
                    break;
                }
            }
            // Also hit world bosses
            if (!knifeHit && this.worldBosses) for (const boss of this.worldBosses) {
                if (boss.hp <= 0) continue;
                const dx = boss.x - this.player.x, dy = boss.y - this.player.y;
                if (Math.sqrt(dx*dx + dy*dy) < knifeRange * 1.5) {
                    boss.hp -= knifeDmg;
                    this._spawnDmgNum(boss.x, boss.y, knifeDmg, 0xff8a65);
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
        const gt = GUN_TIERS[this.gunTier] || GUN_TIERS[1];
        this.gunCooldown = gt.cooldown;
        this.inventory.ammo--;
        // Low-ammo warning thresholds — stump sound once when crossing each line
        const ammoNow = this.inventory.ammo;
        if ([10, 5, 1].includes(ammoNow) && this._lastAmmoThreshold !== ammoNow) {
            this._lastAmmoThreshold = ammoNow;
            if (this.sounds) this.sounds.ammoLow?.();
        }
        if (ammoNow > 10) this._lastAmmoThreshold = null;
        const angle = Math.atan2(wy - this.player.y, wx - this.player.x);
        const doctrineCombat = (typeof Doctrines !== 'undefined') ? (1 + Doctrines.getMod('combatDmgMul')) : 1;
        const speed = 400, damage = Math.floor((this.gunDamage + (this.research.gunDamage || 0) * 5) * gt.dmgMul * doctrineCombat);
        const vx = Math.cos(angle)*speed, vy = Math.sin(angle)*speed;
        this.projectiles.push({ x: this.player.x, y: this.player.y, vx, vy, damage, lifetime: 2, fromTurret: false });
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
            UI.notify(`Colony expanded! (+${radius} tile radius)`);
            this.placementMode = null; UI.update(); return;
        }
        const b = Buildings.place(type, tx, ty, this.resources);
        this.buildings.push(b);
        this.sounds.build();
        UI.notify(`Built ${def.name}!`); this.placementMode = null; UI.update();
        // Trigger doctrine selection on first Doctrine Building
        if (type === 'doctrine_building' && !this.doctrine.active) {
            Doctrines.triggerSelection();
        }
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

    // Auto-assign idle critters to best-fit buildings based on type match + stat
    autoAssignCritters() {
        const maxW = Buildings.getMaxWorkersPerBuilding(this.research);
        // Get idle critters — skip patrol, companion, bodyguard (player's party)
        const idle = this.critters.filter(c =>
            !c.assignment && !c.injured
        );
        if (idle.length === 0) { UI.notify('No idle critters to assign!'); return; }

        // Get buildings with open worker slots (skip non-assignable types)
        const openBuildings = this.buildings.filter(b => {
            const def = BUILDING_DEFS[b.type];
            if (def.turret || def.expander || def.capacity || def.isHQ || def.isWall || def.isGate || def.isGenerator) return false;
            return b.workers.length < maxW;
        });

        if (openBuildings.length === 0) { UI.notify('All buildings are fully staffed!'); return; }

        let assigned = 0;
        // Sort idle critters by total stats descending (best critters first)
        idle.sort((a, b) => {
            const sa = Object.values(a.stats).reduce((s, v) => s + v, 0);
            const sb = Object.values(b.stats).reduce((s, v) => s + v, 0);
            return sb - sa;
        });

        for (const critter of idle) {
            // Find best building for this critter (type match + relevant stat)
            let bestBuilding = null, bestScore = -Infinity;
            const sp = SPECIES[critter.species];

            for (const b of openBuildings) {
                if (b.workers.length >= maxW) continue;
                const def = BUILDING_DEFS[b.type];

                // Score: type match bonus + relevant stat value
                let score = 0;
                const typeBonus = Critters.getTypeBonus(critter, b.type);
                score += typeBonus * 100; // type match is very important

                // Add the building's scaling stat value
                if (def.statKey && critter.stats[def.statKey]) {
                    score += critter.stats[def.statKey] * 5;
                }

                // Penalize buildings that already have workers (spread workers out)
                score -= b.workers.length * 20;

                if (score > bestScore) { bestScore = score; bestBuilding = b; }
            }

            if (bestBuilding) {
                critter.assignment = bestBuilding.id;
                bestBuilding.workers.push(critter.id);
                assigned++;
            }
        }

        if (assigned > 0) {
            UI.notify(`⚡ Auto-assigned ${assigned} critter${assigned > 1 ? 's' : ''} to buildings!`, 4000);
        } else {
            UI.notify('No suitable assignments found.');
        }
        UI.updatePanel();
    }

    unassignAllWorkers() {
        let count = 0;
        for (const c of this.critters) {
            // Skip patrol, companion, bodyguard — only unassign building workers
            if (c.assignment && c.assignment !== 'patrol' && c.assignment !== 'companion' && c.assignment !== 'bodyguard') {
                const b = this.buildings.find(bl => bl.id == c.assignment);
                if (b) b.workers = b.workers.filter(w => w !== c.id);
                c.assignment = null;
                count++;
            }
        }
        if (count > 0) UI.notify(`↩ Unassigned ${count} worker${count > 1 ? 's' : ''} from buildings.`, 3000);
        else UI.notify('No workers to unassign.');
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

        if (!confirm(`Sacrifice ${critter.nickname} (Lv.${critter.level} ${sp.name}) for forage? This is permanent.`)) return;

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

        UI.notify(`🩸 Sacrificed ${critter.nickname} for ${foodGained} forage...`, 4000);
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

    // ─── EQUIPMENT ─────────────────────────────────────────────
    _getArmorDR() {
        return (ARMOR_TIERS[this.armorTier] || ARMOR_TIERS[1]).dr;
    }

    // Reduces incoming damage by armor DR, applies to player.hp
    playerTakeDamage(rawDmg) {
        const dr = this._getArmorDR();
        const finalDmg = Math.max(1, Math.floor(rawDmg * (1 - dr)));
        this.player.hp -= finalDmg;
        return finalDmg;
    }

    upgradeGun() {
        if (this.gunTier >= 5) { UI.notify('Gun already max tier!'); return; }
        const next = GUN_TIERS[this.gunTier + 1];
        if (!next.cost) return;
        for (const [res, amt] of Object.entries(next.cost)) {
            if ((this.resources[res] || 0) < amt) {
                UI.notify(`Need ${amt} ${res} to upgrade to ${next.name}!`); return;
            }
        }
        for (const [res, amt] of Object.entries(next.cost)) this.resources[res] -= amt;
        this.gunTier++;
        UI.notify(`🔫 Gun upgraded to T${this.gunTier}: ${GUN_TIERS[this.gunTier].name}!`, 4000);
        if (this.sounds) this.sounds.levelup?.();
        UI.update();
    }

    upgradeArmor() {
        if (this.armorTier >= 5) { UI.notify('Armor already max tier!'); return; }
        const next = ARMOR_TIERS[this.armorTier + 1];
        if (!next.cost) return;
        for (const [res, amt] of Object.entries(next.cost)) {
            if ((this.resources[res] || 0) < amt) {
                UI.notify(`Need ${amt} ${res} to upgrade to ${next.name}!`); return;
            }
        }
        for (const [res, amt] of Object.entries(next.cost)) this.resources[res] -= amt;
        // Remove old armor HP bonus, apply new
        const oldBonus = (ARMOR_TIERS[this.armorTier] || ARMOR_TIERS[1]).hpBonus;
        this.armorTier++;
        const newBonus = ARMOR_TIERS[this.armorTier].hpBonus;
        this.player.maxHp += (newBonus - oldBonus);
        this.player.hp = Math.min(this.player.hp + (newBonus - oldBonus), this.player.maxHp);
        UI.notify(`🛡️ Armor upgraded to T${this.armorTier}: ${ARMOR_TIERS[this.armorTier].name}!`, 4000);
        if (this.sounds) this.sounds.levelup?.();
        UI.update();
    }

    // ─── EXECUTE + LOOT SYSTEM ─────────────────────────────────
    // X key near a stunned wild critter: kill it for loot drops instead of capture
    _handleExecute() {
        let closest = null, closestDist = Infinity;
        for (const c of this.wildCritters) {
            if (!c.stunned) continue;
            const dx = c.x - this.player.x, dy = c.y - this.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy) / TILE_SIZE;
            if (dist < CAPTURE_RANGE && dist < closestDist) { closestDist = dist; closest = c; }
        }
        if (!closest) return;
        // Kill it
        const sp = SPECIES[closest.species];
        this._cleanupCritterSprite(closest);
        this.wildCritters = this.wildCritters.filter(c => c.id !== closest.id);
        // Grant XP
        const lvl = closest.level || 1;
        const rarityMul = { common: 1, uncommon: 1.4, rare: 2, legendary: 3.5 }[sp.rarity] || 1;
        this.grantPlayerXp(Math.floor((8 + lvl * 1.2) * rarityMul));
        // Drop loot
        this._dropLoot(closest.x, closest.y, sp.rarity, lvl);
        this.sounds.sacrifice?.() || this.sounds.hit?.();
        UI.notify(`Executed ${sp.name} — loot dropped!`, 3000);
    }

    _dropLoot(x, y, rarity, level) {
        if (!this._lootPickups) this._lootPickups = [];
        const drops = [];
        const lootRng = () => Math.random();

        // Base drops: wood/stone/food (all rarities)
        if (lootRng() < 0.8) drops.push({ resource: 'wood', amount: 2 + Math.floor(level * 0.3) });
        if (lootRng() < 0.6) drops.push({ resource: 'stone', amount: 1 + Math.floor(level * 0.25) });
        if (lootRng() < 0.5) drops.push({ resource: 'food', amount: 2 + Math.floor(level * 0.2) });

        // Rarity-gated drops
        if (rarity !== 'common') {
            if (lootRng() < 0.7) drops.push({ resource: 'iron', amount: 1 + Math.floor(level * 0.15) });
        }
        if (rarity === 'rare' || rarity === 'legendary') {
            if (lootRng() < 0.4) drops.push({ resource: 'gold', amount: 1 + Math.floor(level * 0.08) });
            if (lootRng() < 0.15) drops.push({ resource: 'diamond', amount: 1 });
        }
        if (rarity === 'legendary') {
            if (lootRng() < 0.35) drops.push({ resource: 'crystal', amount: 1 + Math.floor(level * 0.04) });
            if (lootRng() < 0.5) drops.push({ resource: 'diamond', amount: 1 + Math.floor(level * 0.05) });
        }

        // Spawn as pickup entities around the kill position
        for (const drop of drops) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 10 + Math.random() * 20;
            this._lootPickups.push({
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                resource: drop.resource,
                amount: drop.amount,
                timer: 30, // despawn after 30s
                bobPhase: Math.random() * 6.28,
            });
        }
    }

    _updateLootPickups(dt) {
        if (!this._lootPickups) return;
        const caps = this.resourceCaps;
        const capBonus = (this.research.storageCap || 0) * 100;
        for (let i = this._lootPickups.length - 1; i >= 0; i--) {
            const lp = this._lootPickups[i];
            lp.timer -= dt;
            if (lp.timer <= 0) { this._lootPickups.splice(i, 1); continue; }
            // Auto-collect when player walks near
            const dx = lp.x - this.player.x, dy = lp.y - this.player.y;
            if (Math.sqrt(dx * dx + dy * dy) < TILE_SIZE * 1.5) {
                const cap = (caps[lp.resource] || 200) + capBonus;
                this.resources[lp.resource] = Math.min((this.resources[lp.resource] || 0) + lp.amount, cap);
                this._spawnDmgNum(lp.x, lp.y, '+' + lp.amount + ' ' + lp.resource, 0x4ade80);
                if (this.sounds) this.sounds.collect?.();
                this._lootPickups.splice(i, 1);
            }
        }
    }

    // ─── PLAYER LEVELING ─────────────────────────────────────
    static playerXpForLevel(level) {
        // 50 * n^1.5 matches pal curve; L1→L2 needs 50, L99→L100 needs ~49k
        return Math.floor(50 * Math.pow(level, 1.5));
    }

    grantPlayerXp(amount) {
        if (!amount) return;
        if (!this.player.level) this.player.level = 1;
        if (!this.player.xp) this.player.xp = 0;
        if (this.player.level >= 100) return;
        this.player.xp += amount;
        let leveled = false;
        let pointsGained = 0;
        while (this.player.level < 100 && this.player.xp >= Game.playerXpForLevel(this.player.level)) {
            this.player.xp -= Game.playerXpForLevel(this.player.level);
            this.player.level++;
            // Per-level reward: +5 maxHp, +1 gun damage, heal to full, +1 Skill Point (engram!)
            this.player.maxHp = (this.player.maxHp || 100) + 5;
            this.gunDamage = (this.gunDamage || 10) + 1;
            this.player.hp = this.player.maxHp;
            this.skillPoints = (this.skillPoints || 0) + 1;
            pointsGained++;
            leveled = true;
        }
        if (leveled) {
            UI.notify(`🎉 LEVEL UP! Lv.${this.player.level} — +${pointsGained} Skill Point${pointsGained > 1 ? 's' : ''} earned! [Open Tech Tree]`, 6000);
            if (this.sounds) this.sounds.levelup?.();
        }
    }

    // Called after damaging a wild critter; grants XP on the killing blow.
    _awardKillXp(critter) {
        if (!critter || critter._xpGranted) return;
        if (!critter.stunned) return;
        critter._xpGranted = true;
        const lvl = critter.level || 1;
        const rarity = SPECIES[critter.species]?.rarity || 'common';
        const rarityMul = { common: 1, uncommon: 1.4, rare: 2.0, legendary: 3.5 }[rarity] || 1;
        const xp = Math.floor((6 + lvl * 1.5) * rarityMul);
        this.grantPlayerXp(xp);
        this._spawnDmgNum(critter.x, critter.y - 16, '+' + xp + ' XP', 0x4fc3f7);
    }

    // ─── MERGE SYSTEM ────────────────────────────────────────
    // Two pals of same species + same star tier merge into one
    // with +1 star (max 5). Stars grant permanent stat bonuses.
    static MERGE_MAX_STARS = 5;

    startMerge(critterId) {
        const c = this.critters.find(cr => cr.id === critterId);
        if (!c) return;
        if ((c.stars || 0) >= 5) { UI.notify('Already max stars (5★)!'); return; }
        const eligible = this.critters.filter(o =>
            o.id !== critterId &&
            o.species === c.species &&
            (o.stars || 0) === (c.stars || 0)
        );
        if (eligible.length < 2) {
            UI.notify(`Need 3 identical ${SPECIES[c.species].name} at ${c.stars||0}★ (have ${eligible.length + 1}/3)`, 4000);
            return;
        }
        this._mergeSelection = { sourceId: critterId, pickedIds: [] };
        UI.update();
    }

    cancelMerge() {
        this._mergeSelection = null;
        UI.update();
    }

    pickMergeTarget(targetId) {
        const sel = this._mergeSelection;
        if (!sel) return;
        if (targetId === sel.sourceId) return;
        if (sel.pickedIds.includes(targetId)) {
            // Unselect
            sel.pickedIds = sel.pickedIds.filter(id => id !== targetId);
            UI.update();
            return;
        }
        const source = this.critters.find(c => c.id === sel.sourceId);
        const target = this.critters.find(c => c.id === targetId);
        if (!source || !target) return;
        if (source.species !== target.species || (source.stars||0) !== (target.stars||0)) return;

        sel.pickedIds.push(targetId);
        if (sel.pickedIds.length >= 2) {
            this._completeMerge();
        } else {
            UI.update();
        }
    }

    _completeMerge() {
        const sel = this._mergeSelection;
        this._mergeSelection = null;
        if (!sel || sel.pickedIds.length < 2) { UI.update(); return; }
        const ids = [sel.sourceId, ...sel.pickedIds];
        const pals = ids.map(id => this.critters.find(c => c.id === id)).filter(Boolean);
        if (pals.length !== 3) { UI.update(); return; }
        const sp = pals[0].species, st = pals[0].stars || 0;
        if (!pals.every(p => p.species === sp && (p.stars||0) === st)) { UI.update(); return; }

        // Pick highest-level pal as the base so XP isn't wasted
        pals.sort((a, b) => (b.level || 1) - (a.level || 1));
        const base = pals[0];
        const consumed = pals.slice(1);

        for (const c of consumed) {
            if (c.assignment && c.assignment !== 'patrol' && c.assignment !== 'companion' && c.assignment !== 'bodyguard') {
                const bld = this.buildings.find(bd => bd.id === c.assignment);
                if (bld) bld.workers = bld.workers.filter(w => w !== c.id);
            }
        }
        const consumedIds = new Set(consumed.map(c => c.id));
        this.critters = this.critters.filter(c => !consumedIds.has(c.id));

        // Apply star — bake flat stat bonus so downstream code doesn't need updates
        base.stars = (base.stars || 0) + 1;
        for (const key of Object.keys(base.stats)) base.stats[key] += 2;
        base.patrolMaxHp = (base.patrolMaxHp || 50) + 10;
        base.patrolHp = Math.min((base.patrolHp || 0) + 10, base.patrolMaxHp);

        // Inherit up to 1 passive from consumed pool (25% chance per candidate)
        if (base.passives && base.passives.length < 5) {
            const pool = [];
            for (const c of consumed) if (c.passives) pool.push(...c.passives);
            for (const pid of pool) {
                if (!base.passives.includes(pid) && Math.random() < 0.25) {
                    base.passives.push(pid);
                    break;
                }
            }
        }

        UI.notify(`⭐ ${base.nickname} ascended to ${base.stars}★!`, 4000);
        if (this.sounds) this.sounds.levelup?.() || this.sounds.build?.();
        UI.update();
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

    returnToMenu() {
        Save.save(this);
        location.reload();
    }

    toggleSettings() {
        const el = document.getElementById('settingsPanel');
        if (el) el.classList.toggle('hidden');
    }

    toggleResourceChart() {
        const el = document.getElementById('resourceChart');
        const btn = document.getElementById('rcToggle');
        if (!el) return;
        el.classList.toggle('collapsed');
        if (btn) btn.textContent = el.classList.contains('collapsed') ? '+' : '−';
    }

    openTechTree() {
        if (!UI.showBuildMenu) UI.toggleBuildMenu();
        UI.switchTab('research');
    }

    // Check if all prereqs for a tech node are met
    _techPrereqsMet(nodeId) {
        if (typeof TECH_DEFS === 'undefined' || !TECH_DEFS[nodeId]) return false;
        const node = TECH_DEFS[nodeId];
        if (!node.prereq || node.prereq.length === 0) return true;
        for (const req of node.prereq) {
            if (!this.techUnlocks[req] || this.techUnlocks[req] < 1) return false;
        }
        return true;
    }

    unlockTech(nodeId) {
        if (typeof TECH_DEFS === 'undefined' || !TECH_DEFS[nodeId]) return;
        const node = TECH_DEFS[nodeId];
        const cur = this.techUnlocks[nodeId] || 0;
        if (cur >= node.maxLevel) { UI.notify('Already maxed out!'); return; }
        if (!this._techPrereqsMet(nodeId)) {
            const missing = (node.prereq || []).filter(r => !this.techUnlocks[r]).map(r => TECH_DEFS[r]?.name || r);
            UI.notify('Locked! Need: ' + missing.join(', '), 4000);
            return;
        }
        const cost = node.cost || 1;
        if ((this.skillPoints || 0) < cost) { UI.notify(`Need ${cost} Skill Point${cost > 1 ? 's' : ''}!`); return; }
        this.skillPoints -= cost;
        this.techUnlocks[nodeId] = cur + 1;
        UI.notify(`🧬 Unlocked: ${node.name}${node.maxLevel > 1 ? ` (Lv.${cur+1}/${node.maxLevel})` : ''}`, 4000);
        if (this.sounds) this.sounds.levelup?.();
        UI.update();
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

    // Legacy alias — old saves/UI may still reference startResearch. Redirect to unlockTech.
    startResearch(id) { return this.unlockTech(id); }

    // ─── UPDATE ──────────────────────────────────────────────
    update(dt) {
        // FPS counter
        this._fpsFrames++;
        this._fpsTimer += dt;
        if (this._fpsTimer >= 1) { this._fpsDisplay = this._fpsFrames; this._fpsFrames = 0; this._fpsTimer = 0; }

        if (this.paused) return;

        this.gameTimeSec += dt;
        // Node respawns (trees/rocks regenerate over time unless Abundance V = infinite)
        if (this.world && this.world.processRespawns) {
            this.world.processRespawns(this.gameTimeSec, this.techUnlocks?.abundance || 0);
        }

        // Doctrine risk tick — pollution, instability, threat bleed
        if (typeof Doctrines !== 'undefined') Doctrines.tick(dt);

        // ── Day/Night Cycle ──
        const dn = this.world.dayNightCycle;
        const fullCycle = dn.dayLength + dn.nightLength; // 480s = 8min total
        dn.time = (dn.time + dt) % fullCycle;
        dn.isNight = dn.time >= dn.dayLength;
        // Smooth darkness transition (0=day, 1=full night)
        if (!dn.isNight) {
            // Day: darkness ramps down at dawn, stays 0 in daytime
            const dawnEnd = 30; // 30s dawn transition
            const duskStart = dn.dayLength - 30;
            if (dn.time < dawnEnd) dn.darkness = 1 - (dn.time / dawnEnd);
            else if (dn.time > duskStart) dn.darkness = (dn.time - duskStart) / 30;
            else dn.darkness = 0;
        } else {
            // Night: ramp up quickly then hold
            const nightTime = dn.time - dn.dayLength;
            const nightFadeIn = 20;
            dn.darkness = Math.min(1, nightTime / nightFadeIn);
        }

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
        let moveSpeed = this.player.speed * (1 + compSpeed);
        if (this.player._slowed) moveSpeed *= 0.35;
        if (this.player._stunned) moveSpeed = 0;

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
                    // Manual mining is slow — critters do it faster. Encourage automation.
                    const baseMineTime = this.miningTarget.type === TILE.TREE ? 3.0 : this.miningTarget.type === TILE.NODE_OIL ? 5.0 : 4.0;
                    const mineTime = baseMineTime / (1 + (this.player._compMineBonus || 0));
                    this.miningProgress += dt;
                    if (this.miningProgress >= mineTime) {
                        const t = this.miningTarget.type;
                        const tx = this.miningTarget.tx, ty = this.miningTarget.ty;
                        const cap = (r) => (this.resourceCaps[r] || 50) + (this.research.storageCap || 0) * 100;
                        const abLvl = this.techUnlocks?.abundance || 0;
                        // Harvest from node pool (handles depletion + respawn scheduling)
                        if (t === TILE.NODE_OIL) {
                            // Oil nodes never deplete (extractor pattern) — give fixed amount
                            this.resources.oil = Math.min((this.resources.oil || 0) + 1, cap('oil'));
                            UI.notify('+1 Oil', 1500);
                        } else {
                            const got = this.world.harvestNode(tx, ty, 3, abLvl, this.gameTimeSec, 300);
                            if (t === TILE.TREE) {
                                this.resources.wood = Math.min(this.resources.wood + got, cap('wood'));
                            } else if (t === TILE.ROCK) {
                                this.resources.stone = Math.min(this.resources.stone + got, cap('stone'));
                            }
                            // If tile got depleted, invalidate chunk cache (harvestNode may have changed tile)
                            const cx = Math.floor(tx / CHUNK_SIZE), cy = Math.floor(ty / CHUNK_SIZE);
                            const cs = this._chunkSprites.get(cx + ',' + cy);
                            if (cs) cs.dirty = true;
                        }
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
                // Fast squared-distance pre-check (~5 tile radius)
                if (hx * hx + hy * hy > 25600) continue;
                if (Math.sqrt(hx*hx + hy*hy) < 12) {
                    Critters.damageWild(wc, p.damage);
                    this._spawnDmgNum(wc.x, wc.y, p.damage, 0xffd54f);
                    if (!p.fromTurret) this._awardKillXp(wc);
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

        // Update floating damage numbers
        for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
            const dn = this.damageNumbers[i];
            dn.timer -= dt;
            dn.y += dn.vy * dt;
            if (dn.timer <= 0) this.damageNumbers.splice(i, 1);
        }

        // Update hit slash effects
        if (this._hitEffects) {
            for (let i = this._hitEffects.length - 1; i >= 0; i--) {
                this._hitEffects[i].timer -= dt;
                if (this._hitEffects[i].timer <= 0) this._hitEffects.splice(i, 1);
            }
        }

        // Update knife swing arcs
        if (this._knifeSwings) {
            for (let i = this._knifeSwings.length - 1; i >= 0; i--) {
                this._knifeSwings[i].timer -= dt;
                if (this._knifeSwings[i].timer <= 0) this._knifeSwings.splice(i, 1);
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
                if (typeof PollutionSystem !== 'undefined') PollutionSystem.invalidate();
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

        // Combine turret targets: only wild critters near colony (within ~40 tiles of origin)
        const turretRangeSq = (TILE_SIZE * 40) ** 2;
        this._turretTargets = this.wildCritters.filter(wc => !wc.stunned && (wc.x * wc.x + wc.y * wc.y) < turretRangeSq);
        if (this.worldBosses && this.worldBosses.length > 0) {
            this._turretTargets = this._turretTargets.concat(this.worldBosses.filter(b => b.hp > 0));
        }
        Buildings.updateTurrets(dt, this.buildings, this._turretTargets, this.projectiles, this.research);

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
                    const patDmg = (c.stats.STR || 1) * 3;
                    Critters.damageWild(target, patDmg);
                    this._spawnDmgNum(target.x, target.y, patDmg, 0x81c784);
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
                        this._spawnDmgNum(wc.x, wc.y, dmg, 0x64b5f6);
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
                        this._spawnDmgNum(wc.x, wc.y, dmg, 0x64b5f6);
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
                        this._spawnDmgNum(boss.x, boss.y, dmg, 0x64b5f6);
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

        // (Research progress system removed — see unlockTech instead)

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

        // ─── PER-CRITTER HUNGER SYSTEM ────────────────────
        // Each critter has a hunger value (0-100, 100=full).
        // Decays over time based on activity. Critters eat from food pool
        // when hunger drops, restoring it. Big critters eat more.
        // States: Full(70+) | Peckish(30-70, -15% prod) | Hungry(10-30, -40% prod)
        //         | Starving(<10, HP drain) | Death after 30s at 0 hunger.
        if (!this._hungerTickTimer) this._hungerTickTimer = 0;
        if (!this._eatTickTimer) this._eatTickTimer = 0;
        if (!this._eatingPops) this._eatingPops = []; // {x, y, timer}

        // Decay hunger every second
        this._hungerTickTimer += dt;
        if (this._hungerTickTimer >= 1) {
            const decayDt = this._hungerTickTimer;
            this._hungerTickTimer = 0;

            // Player hunger decay (slower than working critters)
            if (this.player.hunger === undefined) this.player.hunger = 100;
            this.player.hunger = Math.max(0, this.player.hunger - 0.5 * decayDt);
            // Player auto-eats when below 30
            if (this.player.hunger < 30 && this.resources.food >= 1) {
                this.resources.food -= 1;
                this.player.hunger = 100;
                this._eatingPops.push({ x: this.player.x, y: this.player.y - 12, timer: 1.2, vy: -25 });
            }
            // Starve player at 0 hunger with no forage — HP drain
            if (this.player.hunger <= 0 && this.resources.food <= 0) {
                this.player.hp = Math.max(0, this.player.hp - 2 * decayDt);
                if (!this._lastStarveWarn || this.gameTimeSec - this._lastStarveWarn > 10) {
                    UI.notify('💀 You are starving! Find Forage NOW!', 4000);
                    this._lastStarveWarn = this.gameTimeSec;
                }
            }

            for (const c of this.critters) {
                if (c.hunger === undefined) c.hunger = 100;
                if (c.injured) continue;
                const sp = SPECIES[c.species];
                const sizeMul = (sp?.size || 1);
                let decay;
                if (!c.assignment) decay = 0.3;        // idle
                else if (c.assignment === 'patrol' || c.assignment === 'bodyguard') decay = 0.8;
                else if (c.assignment === 'companion') decay = 0.5;
                else decay = 1.0;                      // working at building
                c.hunger = Math.max(0, c.hunger - decay * sizeMul * decayDt);
                // Starving HP drain
                if (c.hunger <= 0) {
                    if (!c._starveDeathTimer) c._starveDeathTimer = 0;
                    c._starveDeathTimer += decayDt;
                    if (c.patrolHp !== undefined) c.patrolHp = Math.max(0, c.patrolHp - decayDt * 1.5);
                } else {
                    c._starveDeathTimer = 0;
                }
            }
        }

        // Every 3s, hungry critters try to eat (1 forage = full from any hunger)
        this._eatTickTimer += dt;
        if (this._eatTickTimer >= 3) {
            this._eatTickTimer = 0;
            for (const c of this.critters) {
                if (c.hunger === undefined) c.hunger = 100;
                if (c.hunger >= 30) continue; // wait until under 30 (Palworld-style threshold)
                if (c.injured) continue;
                const cost = 1; // 1 forage per critter, regardless of size
                if (this.resources.food >= cost) {
                    this.resources.food -= cost;
                    c.hunger = 100;
                    // Spawn eating animation at critter's location
                    let ex, ey;
                    if (c.assignment === 'patrol' || c.assignment === 'bodyguard') {
                        ex = c._patrolX || this.player.x;
                        ey = c._patrolY || this.player.y;
                    } else if (c.assignment === 'companion') {
                        ex = this.player.x; ey = this.player.y - 12;
                    } else if (c.assignment) {
                        const bld = this.buildings.find(b => b.id == c.assignment);
                        if (bld) {
                            const def = BUILDING_DEFS[bld.type];
                            ex = (bld.gridX + def.size / 2) * TILE_SIZE;
                            ey = (bld.gridY + def.size / 2) * TILE_SIZE;
                        }
                    }
                    if (ex !== undefined) {
                        this._eatingPops.push({ x: ex, y: ey - 8, timer: 1.2, vy: -25 });
                    }
                }
            }
        }

        // Update eating pop animations
        for (let i = this._eatingPops.length - 1; i >= 0; i--) {
            const p = this._eatingPops[i];
            p.timer -= dt;
            p.y += p.vy * dt;
            if (p.timer <= 0) this._eatingPops.splice(i, 1);
        }

        // Aggregate hungry flag for HUD/notifications
        const anyHungry = this.critters.some(c => (c.hunger || 100) < 30);
        if (anyHungry && !this.hungry) {
            this.hungry = true;
            UI.notify('⚠️ Some critters are hungry! Build more Farms.', 4000);
        } else if (!anyHungry && this.hungry) {
            this.hungry = false;
        }

        // Death from prolonged starvation (30s at 0 hunger)
        for (let pi = this.critters.length - 1; pi >= 0; pi--) {
            const c = this.critters[pi];
            if ((c._starveDeathTimer || 0) >= 30) {
                if (c.assignment && c.assignment !== 'patrol' && c.assignment !== 'companion' && c.assignment !== 'bodyguard') {
                    const bld = this.buildings.find(b => b.id === c.assignment);
                    if (bld) bld.workers = bld.workers.filter(w => w !== c.id);
                }
                if (!this.deadCritters) this.deadCritters = [];
                this.deadCritters.push({ ...c, causeOfDeath: 'starvation' });
                UI.notify(`💀 ${c.nickname} starved to death!`, 5000);
                if (this.sounds) this.sounds.destroy?.();
                this._cleanupCritterSprite?.(c);
                this.critters.splice(pi, 1);
            }
        }

        this.respawnTimer -= dt;
        if (this.respawnTimer <= 0) {
            this.respawnTimer = 10;
            // Top up wild critters if below min (reuse pool, don't regenerate)
            while (this.wildCritters.length < WILD_MIN_COUNT) {
                const pos = Critters.pickSpawnTile(this.world, 55, 210);
                const distTiles = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
                const species = Critters.pickSpeciesByDistance(distTiles);
                const sp = SPECIES[species];
                const level = Critters.levelFromDistance(distTiles, sp.rarity);
                const baseHp = RARITY_HP[sp.rarity] || 30;
                const maxHp = Math.floor(baseHp * Critters.enemyHpMul(level));
                const attackDmg = Math.ceil((sp.attackDmg || 3) * Critters.enemyDmgMul(level));
                this.wildCritters.push({
                    id: _nextCritterId++, species, level, attackDmg,
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

        // ── Hostile enemies (non-capturable) ──
        this._enemySpawnTimer -= dt;
        if (this._enemySpawnTimer <= 0) {
            this._enemySpawnTimer = Enemies.SPAWN_INTERVAL;
            const newEnemies = Enemies.spawnCheck(this.world, this.player.x, this.player.y, this.hostileEnemies);
            for (const e of newEnemies) this.hostileEnemies.push(e);
        }
        Enemies.update(dt, this.hostileEnemies, this.player, this.critters, this.world, this.projectiles);
        // Check projectile hits on hostile enemies
        for (let pi = this.projectiles.length - 1; pi >= 0; pi--) {
            const p = this.projectiles[pi];
            if (p.fromEnemy) {
                // Enemy projectile hits player
                const hx = p.x - this.player.x, hy = p.y - this.player.y;
                if (Math.sqrt(hx * hx + hy * hy) < 14) {
                    this.playerTakeDamage(p.damage);
                    this.projectiles.splice(pi, 1);
                }
                continue;
            }
            for (let ei = this.hostileEnemies.length - 1; ei >= 0; ei--) {
                const e = this.hostileEnemies[ei];
                if (e.hp <= 0 || e._burrowed) continue;
                const hx = e.x - p.x, hy = e.y - p.y;
                if (Math.sqrt(hx * hx + hy * hy) < 14 * (ENEMY_DEFS[e.type]?.size || 1)) {
                    const loot = Enemies.damage(e, p.damage);
                    this._spawnDmgNum(e.x, e.y, p.damage, 0xff5252);
                    if (loot) {
                        // Award loot
                        for (const [res, amt] of Object.entries(loot)) {
                            if (res === 'aethershards') this.inventory.aethershards = (this.inventory.aethershards || 0) + amt;
                            else this.resources[res] = Math.min((this.resources[res] || 0) + amt, 9999);
                        }
                        this.deathSkulls.push({ x: e.x, y: e.y, timer: 3 });
                        UI.notify(`Defeated ${ENEMY_DEFS[e.type]?.name || 'enemy'}! Loot dropped.`, 3000);
                        this.hostileEnemies.splice(ei, 1);
                    }
                    this.projectiles.splice(pi, 1);
                    break;
                }
            }
        }
        // Remove dead enemies
        for (let ei = this.hostileEnemies.length - 1; ei >= 0; ei--) {
            if (this.hostileEnemies[ei].hp <= 0) this.hostileEnemies.splice(ei, 1);
        }

        // Loot pickups
        this._updateLootPickups(dt);

        this.autoSaveTimer -= dt;
        if (this.autoSaveTimer <= 0) { this.autoSaveTimer = 60; Save.save(this); }

        UI.updateNotifications(dt);

        this.panelUpdateTimer -= dt;
        if (this.panelUpdateTimer <= 0) {
            this.panelUpdateTimer = 0.5;
            const gc = (r) => caps[r]||200;
            // Helper — set amount text + fill bar width
            const setRes = (key, fillId, amountId) => {
                const cur = Math.floor(this.resources[key] || 0);
                const max = gc(key);
                const el = document.getElementById(amountId);
                if (el) el.textContent = `${cur}/${max}`;
                const fill = document.getElementById(fillId);
                if (fill) fill.style.width = Math.min(100, (cur / max) * 100) + '%';
            };
            setRes('wood',  'fillWood',  'resWood');
            setRes('stone', 'fillStone', 'resStone');
            setRes('food',  'fillFood',  'resFood');
            setRes('iron',  'fillIron',  'resIron');
            // Tint food fill red when hungry
            const foodFill = document.getElementById('fillFood');
            if (foodFill) foodFill.style.background = this.hungry
                ? 'linear-gradient(90deg,#f87171,#dc2626)'
                : 'linear-gradient(90deg,#9ccc65,#689f38)';
            document.getElementById('trapCount').textContent = this.inventory.traps;
            document.getElementById('ammoCount').textContent = this.inventory.ammo || 0;
            // Player level HUD
            const plvlNum = document.getElementById('plvlNum');
            const plvlFill = document.getElementById('plvlFill');
            if (plvlNum && plvlFill) {
                const plvl = this.player.level || 1;
                plvlNum.textContent = plvl;
                if (plvl >= 100) {
                    plvlFill.style.width = '100%';
                } else {
                    const need = Game.playerXpForLevel(plvl);
                    const pct = Math.max(0, Math.min(100, ((this.player.xp || 0) / need) * 100));
                    plvlFill.style.width = pct + '%';
                }
            }
            document.getElementById('aethershardCount').textContent = this.inventory.aethershards || 0;
            // Skill points indicator (only shows when > 0)
            const spWrap = document.getElementById('skillPointsWrap');
            const spNum = document.getElementById('skillPointsNum');
            if (spWrap && spNum) {
                if ((this.skillPoints || 0) > 0) { spWrap.style.display = ''; spNum.textContent = this.skillPoints; }
                else spWrap.style.display = 'none';
            }
            // Player hunger bar
            const ph = this.player.hunger !== undefined ? this.player.hunger : 100;
            const phFill = document.getElementById('phungerFill');
            if (phFill) {
                phFill.style.width = ph + '%';
                phFill.className = 'phunger-fill' + (ph < 10 ? ' starving' : ph < 30 ? ' low' : '');
            }
            document.getElementById('critterCount').textContent = `${this.critters.length}/${Buildings.getMaxCritters(this.buildings, this.research)}`;
            const deadEl = document.getElementById('deadCount');
            if (this.deadCritters.length > 0) {
                deadEl.style.display = '';
                deadEl.querySelector('span').textContent = this.deadCritters.length;
                deadEl.title = this.deadCritters.map(d => `${d.nickname} Lv${d.level} (${SPECIES[d.species].name})`).join('\n');
            } else { deadEl.style.display = 'none'; }
            // Resource rates with positive/negative coloring
            const setRate = (r, id) => {
                const v = this._resourceRates[r] || 0;
                const el = document.getElementById(id);
                if (!el) return;
                if (v >= 0.01) { el.textContent = `+${v.toFixed(1)}/s`; el.className = 'rc-rate positive'; }
                else if (v <= -0.01) { el.textContent = `${v.toFixed(1)}/s`; el.className = 'rc-rate negative'; }
                else { el.textContent = '—'; el.className = 'rc-rate zero'; }
            };
            setRate('wood', 'rateWood');
            setRate('stone', 'rateStone');
            setRate('food', 'rateFood');
            setRate('iron', 'rateIron');
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

        // Pollution zones (debug viz under critters)
        if (typeof PollutionSystem !== 'undefined' && PollutionSystem.render) PollutionSystem.render(gfx);

        // Wild critters
        for (const c of this.wildCritters) this._drawWildCritter(gfx, c);

        // Hostile enemies
        for (const e of this.hostileEnemies) {
            if (e._burrowed) continue;
            if (e.x < camX - 100 || e.x > camX + w + 100 || e.y < camY - 100 || e.y > camY + h + 100) continue;
            this._drawHostileEnemy(gfx, e);
        }

        // Loot pickups
        if (this._lootPickups) {
            const lootColors = { wood: 0x8d6e63, stone: 0x90a4ae, food: 0x9ccc65, iron: 0x78909c, gold: 0xffd700, diamond: 0x81d4fa, crystal: 0xce93d8, oil: 0x333333 };
            for (const lp of this._lootPickups) {
                const bob = Math.sin(this.time * 4 + lp.bobPhase) * 3;
                const color = lootColors[lp.resource] || 0xffffff;
                gfx.beginFill(color, 0.9);
                gfx.drawRoundedRect(lp.x - 5, lp.y + bob - 5, 10, 10, 3);
                gfx.endFill();
                // White outline glow
                gfx.lineStyle(1, 0xffffff, 0.4);
                gfx.drawRoundedRect(lp.x - 5, lp.y + bob - 5, 10, 10, 3);
                gfx.lineStyle(0);
            }
        }

        // Horde critters (red-tinted, with sprites)
        for (const h of this.hordeCreatures) {
            if (h.stunned) continue;
            const sp = SPECIES[h.species];
            const sizeScale = sp.size || 1;
            const r = Math.round(12 * sizeScale);
            const bob = Math.sin(this.time * 3 + h.id) * 2;

            // Red glow ring
            gfx.lineStyle(2, 0xff0000, 0.6);
            gfx.drawCircle(h.x, h.y + bob, r + 6);
            gfx.lineStyle(0);

            // Shadow
            gfx.beginFill(0x000000, 0.2);
            gfx.drawEllipse(h.x, h.y + 12, 10, 4);
            gfx.endFill();

            // Body — use sprite if available
            const tex = this._getCritterTex(h.species);
            if (tex) {
                if (!h._pixiSprite) {
                    h._pixiSprite = new PIXI.Sprite(tex);
                    h._pixiSprite.anchor.set(0.5, 0.5);
                    h._pixiSprite.tint = 0xff6666; // red tint for horde
                    this.entityContainer.addChild(h._pixiSprite);
                }
                h._pixiSprite.width = r * 2;
                h._pixiSprite.height = r * 2;
                h._pixiSprite.x = h.x;
                h._pixiSprite.y = h.y + bob;
                h._pixiSprite.visible = true;
            } else {
                if (h._pixiSprite) h._pixiSprite.visible = false;
                const colorNum = parseInt(sp.color.replace('#', ''), 16);
                gfx.beginFill(colorNum);
                gfx.drawCircle(h.x, h.y + bob, r);
                gfx.endFill();
            }

            // HP bar
            if (h.hp < h.maxHp) {
                const bw = r * 2.5;
                gfx.beginFill(0x333333);
                gfx.drawRect(h.x - bw / 2, h.y + bob - r - 8, bw, 3);
                gfx.endFill();
                const pct = h.hp / h.maxHp;
                gfx.beginFill(pct > 0.5 ? 0x4ade80 : pct > 0.25 ? 0xfbbf24 : 0xf87171);
                gfx.drawRect(h.x - bw / 2, h.y + bob - r - 8, bw * pct, 3);
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

                // Charging trail
                if (boss._charging) {
                    gfx.lineStyle(4, bc, 0.4);
                    gfx.moveTo(boss.x - boss._chargeVx * 0.15, boss.y - boss._chargeVy * 0.15);
                    gfx.lineTo(boss.x, boss.y);
                    gfx.lineStyle(0);
                }

                // Name + ability warning
                const nameT = this._getWorldText(boss.name, { fontFamily: 'sans-serif', fontSize: 12, fontWeight: 'bold', fill: 0xffd700, stroke: 0x000000, strokeThickness: 3 });
                nameT.x = boss.x; nameT.y = boss.y - r - 22;
            }
        }

        // Boss projectiles
        if (this._bossProjectiles) {
            for (const bp of this._bossProjectiles) {
                gfx.beginFill(bp.color || 0xff5252, 0.9);
                gfx.drawCircle(bp.x, bp.y, bp.size || 6);
                gfx.endFill();
                // Glow
                gfx.lineStyle(2, bp.color || 0xff5252, 0.3);
                gfx.drawCircle(bp.x, bp.y, (bp.size || 6) + 4);
                gfx.lineStyle(0);
            }
        }

        // Boss shockwaves
        if (this._bossShockwaves) {
            for (const sw of this._bossShockwaves) {
                const alpha = Math.max(0.1, sw.timer / 1.5);
                gfx.lineStyle(4, sw.color, alpha);
                gfx.drawCircle(sw.x, sw.y, sw.radius);
                gfx.lineStyle(2, sw.color, alpha * 0.4);
                gfx.drawCircle(sw.x, sw.y, sw.radius + 8);
                gfx.lineStyle(0);
            }
        }

        // Player stun/slow indicators
        if (this.player._stunned) {
            const t = this._getWorldText('STUNNED', { fontFamily: 'sans-serif', fontSize: 14, fontWeight: 'bold', fill: 0xffd54f, stroke: 0x000000, strokeThickness: 3 });
            t.x = this.player.x; t.y = this.player.y - 46;
        } else if (this.player._slowed) {
            const t = this._getWorldText('SLOWED', { fontFamily: 'sans-serif', fontSize: 12, fontWeight: 'bold', fill: 0x66bb6a, stroke: 0x000000, strokeThickness: 3 });
            t.x = this.player.x; t.y = this.player.y - 46;
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

        // Knife swing arcs — wide sweeping arc from player
        if (this._knifeSwings) {
            for (const ks of this._knifeSwings) {
                const progress = 1 - (ks.timer / 0.25); // 0→1
                const alpha = 1 - progress;
                const sweepAngle = 1.2; // radians of arc sweep
                const startAngle = ks.angle - sweepAngle / 2;
                const currentSweep = sweepAngle * progress;
                const innerR = 10;
                const outerR = 30 + progress * 8;

                // Bright arc
                gfx.lineStyle(3, 0xffcc80, alpha * 0.9);
                gfx.arc(ks.x, ks.y, outerR, startAngle, startAngle + currentSweep);
                gfx.lineStyle(0);

                // Blade line at current sweep tip
                const tipAngle = startAngle + currentSweep;
                gfx.lineStyle(2, 0xffffff, alpha * 0.8);
                gfx.moveTo(ks.x + Math.cos(tipAngle) * innerR, ks.y + Math.sin(tipAngle) * innerR);
                gfx.lineTo(ks.x + Math.cos(tipAngle) * outerR, ks.y + Math.sin(tipAngle) * outerR);
                gfx.lineStyle(0);

                // Faint trail fill
                gfx.beginFill(0xffcc80, alpha * 0.15);
                gfx.moveTo(ks.x, ks.y);
                const segments = 8;
                for (let s = 0; s <= segments; s++) {
                    const a = startAngle + (currentSweep * s / segments);
                    gfx.lineTo(ks.x + Math.cos(a) * outerR, ks.y + Math.sin(a) * outerR);
                }
                gfx.lineTo(ks.x, ks.y);
                gfx.endFill();
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

        // Floating damage numbers (world space)
        for (const dn of this.damageNumbers) {
            const alpha = Math.min(1, dn.timer / 0.3);
            const t = this._getWorldText(dn.text, {
                fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold',
                fill: dn.color, stroke: 0x000000, strokeThickness: 3,
            });
            t.x = dn.x; t.y = dn.y;
            t.alpha = alpha;
        }

        // Eating pop animations (🍖 floating up when critter eats)
        if (this._eatingPops) {
            for (const ep of this._eatingPops) {
                const alpha = Math.min(1, ep.timer / 0.4);
                const t = this._getWorldText('\uD83C\uDF56', { fontSize: 14 });
                t.x = ep.x; t.y = ep.y;
                t.alpha = alpha;
            }
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

        // ── Overlay (screen-space) ──
        const ovr = this._overlayGfx;
        ovr.clear();
        this._resetTextPool();
        this._resetWorldTextPool();

        // World→screen helper for overlay elements
        const zoom = this.zoomLevel || 1;
        const zoomOffX = w * (1 - zoom) / 2;
        const zoomOffY = h * (1 - zoom) / 2;
        const w2sx = (wx) => (wx - camX) * zoom + zoomOffX;
        const w2sy = (wy) => (wy - camY) * zoom + zoomOffY;

        // Node remaining-count labels — shown when player is within 5 tiles of a tree/rock
        {
            const ptx = Math.floor(this.player.x / TILE_SIZE);
            const pty = Math.floor(this.player.y / TILE_SIZE);
            const abLvl = this.techUnlocks?.abundance || 0;
            const isInfinite = abLvl >= 5;
            for (let dy = -5; dy <= 5; dy++) {
                for (let dx = -5; dx <= 5; dx++) {
                    if (dx * dx + dy * dy > 25) continue;
                    const tx = ptx + dx, ty = pty + dy;
                    const t = this.world.getTile(tx, ty);
                    if (t !== TILE.TREE && t !== TILE.ROCK) continue;
                    const remaining = this.world.getNodePool(tx, ty, abLvl);
                    const maxPool = this.world._defaultPoolFor(t, abLvl);
                    const nx = w2sx(tx * TILE_SIZE + TILE_SIZE / 2);
                    const ny = w2sy(ty * TILE_SIZE - 2);
                    if (isInfinite) {
                        const lbl = this._getText('∞', { fontFamily: 'monospace', fontSize: 10, fontWeight: 'bold', fill: 0x4ade80, stroke: 0x000000, strokeThickness: 3 });
                        lbl.x = nx; lbl.y = ny;
                    } else {
                        const pct = remaining / maxPool;
                        const color = pct > 0.5 ? 0xeaeaea : pct > 0.25 ? 0xfbbf24 : 0xf87171;
                        const lbl = this._getText(remaining + '', { fontFamily: 'monospace', fontSize: 9, fontWeight: 'bold', fill: color, stroke: 0x000000, strokeThickness: 3 });
                        lbl.x = nx; lbl.y = ny;
                    }
                }
            }
        }

        // Mining progress bar
        if (this.miningHeld && this.miningTarget && this.miningProgress > 0) {
            const mtx = w2sx(this.miningTarget.tx * TILE_SIZE + TILE_SIZE / 2);
            const mty = w2sy(this.miningTarget.ty * TILE_SIZE - 4);
            const mineTime = this.miningTarget.type === TILE.TREE ? 3.0 : this.miningTarget.type === TILE.NODE_OIL ? 5.0 : 4.0;
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
            const ppx = w2sx(px), ppy = w2sy(py);
            ovr.moveTo(ppx, ppy);
            ovr.lineTo(this.mouse.x, this.mouse.y);
            ovr.lineStyle(0);
        }

        // Placement preview
        if (this.placementMode) {
            const tx = Math.floor(this.mouse.worldX/TILE_SIZE), ty = Math.floor(this.mouse.worldY/TILE_SIZE);
            const def = BUILDING_DEFS[this.placementMode.type];
            const cp = def.isExtractor
                ? Buildings.canPlaceExtractor(tx, ty, this.buildings, this.world, def.nodeType)
                : Buildings.canPlace(tx, ty, def.size, this.buildings, this.world);
            const sx = w2sx(tx * TILE_SIZE);
            const sy = w2sy(ty * TILE_SIZE);
            const sz = def.size * TILE_SIZE * zoom;
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
                const sx = w2sx(c.x), sy = w2sy(c.y);
                const col = c.stunned ? 0xffd54f : 0x4ade80;
                ovr.lineStyle(1.5, col, c.stunned ? 0.7 : 0.5);
                ovr.drawCircle(sx, sy, 16 * zoom);
                ovr.lineStyle(0);
                const label = c.stunned ? `E: FREE! (${Math.ceil(c.stunTimer)}s)` : 'E: CAPTURE';
                const t = this._getText(label, { fontFamily: 'monospace', fontSize: 10, fontWeight: 'bold', fill: col });
                t.x = sx; t.y = sy - 22 * zoom;
            }
        }

        // Waypoint claim indicators
        for (const wp of this.world.waypoints) {
            if (wp.claimed) continue;
            const wd = Math.sqrt((this.player.x-(wp.x*TILE_SIZE+16))**2+(this.player.y-(wp.y*TILE_SIZE+16))**2);
            if (wd < TILE_SIZE*3) {
                const sx = w2sx(wp.x*TILE_SIZE+16), sy = w2sy(wp.y*TILE_SIZE+16);
                const t = this._getText('E: CLAIM WAYPOINT', { fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold', fill: 0xfbbf24 });
                t.x = sx; t.y = sy - 50 * zoom;
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

        // ── Night overlay ──
        const dn = this.world.dayNightCycle;
        if (dn.darkness > 0.01) {
            const alpha = dn.darkness * 0.55; // max 55% darkness
            ovr.beginFill(0x080820, alpha);
            ovr.drawRect(0, 0, w, h);
            ovr.endFill();
        }
        // Day/Night indicator
        const dnIcon = dn.isNight ? '\u{1F319}' : '\u{2600}\uFE0F';
        const cycleTotal = dn.dayLength + dn.nightLength;
        const cycleRemain = dn.isNight ? (cycleTotal - dn.time) : (dn.dayLength - dn.time);
        const dnMins = Math.floor(cycleRemain / 60);
        const dnSecs = Math.floor(cycleRemain % 60);
        const dnText = this._getText(`${dnIcon} ${dnMins}:${dnSecs < 10 ? '0' : ''}${dnSecs}`, {
            fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold',
            fill: dn.isNight ? 0x6688cc : 0xffd54f
        });
        dnText.anchor.set(1, 0);
        dnText.x = w - 10; dnText.y = 48;

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
        // Breakdown overlay (Industrial Tyrant): red X and smoke
        if (building._breakdown) {
            const cx = wx + size / 2, cy = wy + size / 2;
            const r = size / 2 - 4;
            const pulse = 0.5 + Math.sin(this.time * 6) * 0.3;
            gfx.lineStyle(3, 0xff5252, pulse);
            gfx.moveTo(cx - r, cy - r); gfx.lineTo(cx + r, cy + r);
            gfx.moveTo(cx + r, cy - r); gfx.lineTo(cx - r, cy + r);
            gfx.lineStyle(0);
            gfx.beginFill(0x1a1a1a, 0.35);
            gfx.drawRect(wx + 2, wy + 2, size - 4, size - 4);
            gfx.endFill();
        }
        gfx.lineStyle(0);

        // Resource Storage — draw a dashed line to current gather target
        if (def.isResourceStorage && building._gatherTarget) {
            const target = building._gatherTarget;
            const tx = target.tx * TILE_SIZE + TILE_SIZE / 2;
            const ty = target.ty * TILE_SIZE + TILE_SIZE / 2;
            const sx = wx + size / 2, sy = wy + size / 2;
            const col = target.type === TILE.TREE ? 0x66bb6a : 0x90a4ae;
            gfx.lineStyle(2, col, 0.4 + Math.sin(this.time * 3) * 0.2);
            gfx.moveTo(sx, sy);
            gfx.lineTo(tx, ty);
            gfx.lineStyle(0);
            // Small pulsing dot at target
            gfx.beginFill(col, 0.6);
            gfx.drawCircle(tx, ty, 4 + Math.sin(this.time * 4) * 1.5);
            gfx.endFill();
        }

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
    _drawHostileEnemy(gfx, enemy) {
        const def = typeof ENEMY_DEFS !== 'undefined' ? ENEMY_DEFS[enemy.type] : null;
        if (!def || enemy._burrowed) return;

        const sx = enemy.x, sy = enemy.y;
        const bob = Math.sin(this.time * 3 + enemy.id) * 2;
        const size = def.size || 1;
        const r = Math.round(12 * size);

        // Fire trails
        if (enemy._fireTrails) {
            for (const ft of enemy._fireTrails) {
                const fa = Math.min(1, ft.timer / 2);
                gfx.beginFill(0xff6400, fa * 0.4);
                gfx.drawCircle(ft.x, ft.y, TILE_SIZE * 0.4);
                gfx.endFill();
            }
        }

        // Shadow
        gfx.beginFill(0x000000, 0.3);
        gfx.drawEllipse(sx, sy + r, r * 0.8, r * 0.3);
        gfx.endFill();

        // Body — red-tinted circle with hostile indicator
        const bodyColor = def.color ? PIXI.utils.string2hex(def.color) : 0xff4444;
        gfx.beginFill(bodyColor);
        gfx.drawCircle(sx, sy + bob, r * 0.85);
        gfx.endFill();

        // Red outline (hostile)
        gfx.lineStyle(2, 0xcc3333, 0.8);
        gfx.drawCircle(sx, sy + bob, r * 0.85);
        gfx.lineStyle(0);

        // Angry eyes
        gfx.beginFill(0xff0000);
        gfx.drawCircle(sx - r * 0.22, sy + bob - r * 0.12, 2.5);
        gfx.drawCircle(sx + r * 0.22, sy + bob - r * 0.12, 2.5);
        gfx.endFill();

        // Aggro pulse ring
        if (enemy.state === 'aggro') {
            const pulse = 0.4 + Math.sin(this.time * 6) * 0.2;
            gfx.lineStyle(1.5, 0xff3333, pulse);
            gfx.drawCircle(sx, sy + bob, r + 4);
            gfx.lineStyle(0);
        }

        // Name label
        const nameText = this._getText(def.name, {
            fontFamily: 'monospace', fontSize: 8, fontWeight: 'bold', fill: 0xff6b6b
        });
        nameText.anchor.set(0.5, 1);
        nameText.x = sx; nameText.y = sy + bob - r - 10;

        // Skull icon
        const skull = this._getText('\u2620', {
            fontFamily: 'sans-serif', fontSize: Math.floor(10 * size), fill: 0xff4444
        });
        skull.anchor.set(0.5, 1);
        skull.x = sx; skull.y = sy + bob - r - 2;

        // HP bar
        if (enemy.hp < enemy.maxHp) {
            const barW = 24 * size, barH = 3;
            const bx = sx - barW / 2, by = sy + bob - r - 18;
            gfx.beginFill(0x333333);
            gfx.drawRect(bx, by, barW, barH);
            gfx.endFill();
            const pct = Math.max(0, enemy.hp / enemy.maxHp);
            gfx.beginFill(0xff4444);
            gfx.drawRect(bx, by, barW * pct, barH);
            gfx.endFill();
        }
    }

    _drawWildCritter(gfx, critter) {
        // Render culling — skip offscreen critters (camera-relative check)
        const camX = this.cam.x, camY = this.cam.y;
        const w = this.canvas.width, h = this.canvas.height;
        const zoom = this.zoomLevel || 1;
        const margin = 80; // extra pixels beyond viewport edge
        const viewW = w / zoom + margin * 2, viewH = h / zoom + margin * 2;
        if (critter.x < camX - margin || critter.x > camX + viewW ||
            critter.y < camY - margin || critter.y > camY + viewH) {
            // Hide sprite if it exists so it doesn't render at old position
            if (critter._pixiSprite) critter._pixiSprite.visible = false;
            return;
        }

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

        // Stunned — stars above head + action hints (world space)
        if (critter.stunned) {
            const t = this._getWorldText('★ ★', { fontFamily: 'monospace', fontSize: 10, fill: 0xffd54f });
            t.x = sx; t.y = sy + bob - r - 10;
            // Check if player is close enough for action prompts
            const distToPlayer = Math.sqrt((critter.x - this.player.x) ** 2 + (critter.y - this.player.y) ** 2) / TILE_SIZE;
            if (distToPlayer < CAPTURE_RANGE) {
                const hint = this._getWorldText('[E] Capture  [X] Execute', { fontFamily: 'sans-serif', fontSize: 9, fill: 0xffffff, stroke: 0x000000, strokeThickness: 2 });
                hint.x = sx; hint.y = sy + bob + r + 10;
            }
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

        // Name label with capture-aware color
        if (!critter.stunned) {
            const snareKey = Critters.getBestSnare(this.inventory || {}, sp.rarity);
            let fillColor;
            if (sp.rarity === 'legendary') {
                const hue = (this.time * 80) % 360;
                fillColor = this._hslToHex(hue, 100, 60);
            } else if (snareKey) {
                fillColor = 0x4ade80; // green — can capture
            } else {
                fillColor = 0xfacc15; // yellow — missing snare
            }
            const hasHpBar = critter.hp < critter.maxHp;
            const nameY = sy + bob - r - (hasHpBar ? 16 : 10);
            const lvl = critter.level || 1;
            const nameStr = `[L${lvl}] ${sp.name}`;
            const nameT = this._getWorldText(nameStr, {
                fontFamily: 'sans-serif', fontSize: 11, fontWeight: 'bold',
                fill: fillColor, stroke: 0x000000, strokeThickness: 3,
            });
            nameT.x = sx; nameT.y = nameY;
        }
    }

    _hslToHex(h, s, l) {
        s /= 100; l /= 100;
        const k = n => (n + h / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        const r = Math.round(f(0) * 255);
        const g = Math.round(f(8) * 255);
        const b = Math.round(f(4) * 255);
        return (r << 16) | (g << 8) | b;
    }

    // ─── NOTIFICATIONS ──────────────────────────────────────
    _renderNotifications(gfx, canvasW) {
        const style = { fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold', fill: 0xffffff };
        // Measure using fresh TextMetrics so pooled-Text stale cache doesn't mis-size the bg rect
        for (let i = 0; i < UI.notifications.length; i++) {
            const n = UI.notifications[i];
            const y = 80 + i * 30;
            const metrics = PIXI.TextMetrics.measureText(n.text, new PIXI.TextStyle(style));
            const tw = metrics.width;
            const th = metrics.height;
            // Background rect first (drawn behind — Graphics is added before Text in overlay)
            gfx.beginFill(0x000000, 0.6 * n.opacity);
            gfx.drawRoundedRect(canvasW / 2 - tw / 2 - 12, y - th / 2 - 4, tw + 24, th + 8, 6);
            gfx.endFill();
            // Text on top
            const t = this._getText(n.text, style);
            t.x = canvasW / 2; t.y = y;
            t.alpha = n.opacity;
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
            { name: 'Stonecrusher',   color: '#616161', hp: 500, dmg: 20, speed: 55,  size: 3,   drops: 2, abilities: ['stomp','charge'] },
            { name: 'Infernal Wyrm',  color: '#d32f2f', hp: 400, dmg: 25, speed: 70,  size: 2.5, drops: 2, abilities: ['fireball','charge'] },
            { name: 'Crystal Titan',  color: '#7c4dff', hp: 700, dmg: 15, speed: 45,  size: 3.5, drops: 3, abilities: ['stomp','fireball','slow_aura'] },
            { name: 'Void Stalker',   color: '#1a1a2e', hp: 350, dmg: 30, speed: 90,  size: 2,   drops: 2, abilities: ['teleport','fireball'] },
            { name: 'Ancient Treant', color: '#2e7d32', hp: 800, dmg: 12, speed: 35,  size: 4,   drops: 4, abilities: ['stomp','root'] },
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
            _abilityTimer: 3 + Math.random() * 2,
            _abilityIdx: 0,
            _charging: false,
            _chargeTimer: 0,
            _chargeVx: 0,
            _chargeVy: 0,
        });

        if (!this._bossProjectiles) this._bossProjectiles = [];
        if (!this._bossShockwaves) this._bossShockwaves = [];

        UI.notify(`🔱 WORLD BOSS: ${type.name} has appeared!`, 6000);
        if (this.sounds) this.sounds.alert?.();
    }

    _updateWorldBosses(dt) {
        // Update boss projectiles
        if (!this._bossProjectiles) this._bossProjectiles = [];
        if (!this._bossShockwaves) this._bossShockwaves = [];

        for (let i = this._bossProjectiles.length - 1; i >= 0; i--) {
            const bp = this._bossProjectiles[i];
            bp.x += bp.vx * dt; bp.y += bp.vy * dt; bp.lifetime -= dt;
            if (bp.lifetime <= 0) { this._bossProjectiles.splice(i, 1); continue; }
            const dx = bp.x - this.player.x, dy = bp.y - this.player.y;
            if (dx * dx + dy * dy < (TILE_SIZE * 0.8) ** 2) {
                this.playerTakeDamage(bp.dmg);
                this._spawnDmgNum(this.player.x, this.player.y, bp.dmg, 0xff5252);
                this._bossProjectiles.splice(i, 1);
            }
        }

        // Update shockwaves
        for (let i = this._bossShockwaves.length - 1; i >= 0; i--) {
            const sw = this._bossShockwaves[i];
            sw.radius += sw.expandSpeed * dt;
            sw.timer -= dt;
            if (sw.timer <= 0) { this._bossShockwaves.splice(i, 1); continue; }
            // Check if player is caught in the ring (between inner and outer edge)
            if (!sw._hitPlayer) {
                const dx = this.player.x - sw.x, dy = this.player.y - sw.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const ringInner = sw.radius - 20, ringOuter = sw.radius + 20;
                if (dist > ringInner && dist < ringOuter) {
                    sw._hitPlayer = true;
                    if (sw.type === 'stomp') {
                        this.playerTakeDamage(sw.dmg);
                        this.player._stunned = true;
                        this.player._stunnedTimer = 1.5;
                        this._spawnDmgNum(this.player.x, this.player.y, 'STUNNED', 0xffd54f);
                    } else if (sw.type === 'root') {
                        this.player._slowed = true;
                        this.player._slowTimer = 3;
                        this._spawnDmgNum(this.player.x, this.player.y, 'ROOTED', 0x66bb6a);
                    }
                }
            }
        }

        // Player slow/stun effect
        if (this.player._slowed) {
            this.player._slowTimer -= dt;
            if (this.player._slowTimer <= 0) { this.player._slowed = false; }
        }
        if (this.player._stunned) {
            this.player._stunnedTimer -= dt;
            if (this.player._stunnedTimer <= 0) { this.player._stunned = false; }
        }

        for (let i = this.worldBosses.length - 1; i >= 0; i--) {
            const boss = this.worldBosses[i];

            // Boss is dead — drop loot
            if (boss.hp <= 0) {
                if (!this.inventory.aethershards) this.inventory.aethershards = 0;
                this.inventory.aethershards += boss.drops;
                this._dropLoot(boss.x, boss.y, 'legendary', 50);
                UI.notify(`🔱 ${boss.name} defeated! +${boss.drops} Aethershards!`, 5000);
                if (this.sounds) this.sounds.levelup?.();
                this.grantPlayerXp(Math.floor(100 + boss.maxHp * 0.3));
                this.worldBosses.splice(i, 1);
                continue;
            }

            const pdx = this.player.x - boss.x, pdy = this.player.y - boss.y;
            const pDist = Math.sqrt(pdx * pdx + pdy * pdy);

            // Charging — lunge at high speed
            if (boss._charging) {
                boss._chargeTimer -= dt;
                boss.x += boss._chargeVx * dt;
                boss.y += boss._chargeVy * dt;
                if (boss._chargeTimer <= 0) boss._charging = false;
                // Hit player during charge
                if (pDist < TILE_SIZE * 2) {
                    this.playerTakeDamage(Math.floor(boss.dmg * 1.5));
                    this._spawnDmgNum(this.player.x, this.player.y, '💥', 0xff5252);
                    boss._charging = false;
                }
            } else {
                // Chase player if within 20 tiles (increased from 15)
                if (pDist < TILE_SIZE * 20 && pDist > TILE_SIZE * 1.5) {
                    boss.x += (pdx / pDist) * boss.speed * dt;
                    boss.y += (pdy / pDist) * boss.speed * dt;
                }
            }

            // Melee attack
            boss._attackTimer -= dt;
            if (pDist < TILE_SIZE * 2 && boss._attackTimer <= 0 && !boss._charging) {
                this.playerTakeDamage(boss.dmg);
                boss._attackTimer = 1.5;
            }

            // ── BOSS ABILITIES ──────────────────────────────
            if (pDist < TILE_SIZE * 18) {
                boss._abilityTimer -= dt;
                if (boss._abilityTimer <= 0 && boss.abilities && boss.abilities.length > 0) {
                    const ability = boss.abilities[boss._abilityIdx % boss.abilities.length];
                    boss._abilityIdx++;
                    boss._abilityTimer = 3.5 + Math.random() * 2;

                    if (ability === 'fireball') {
                        // Fire 3 spread projectiles at player
                        const baseAngle = Math.atan2(pdy, pdx);
                        for (let s = -1; s <= 1; s++) {
                            const a = baseAngle + s * 0.25;
                            this._bossProjectiles.push({
                                x: boss.x, y: boss.y,
                                vx: Math.cos(a) * 180, vy: Math.sin(a) * 180,
                                dmg: Math.floor(boss.dmg * 0.7),
                                lifetime: 2.5,
                                color: boss.color === '#d32f2f' ? 0xff5252 : boss.color === '#1a1a2e' ? 0x7c4dff : 0xffd740,
                                size: 6,
                            });
                        }
                    } else if (ability === 'charge') {
                        // Lunge at player's current position at 3x speed
                        boss._charging = true;
                        boss._chargeTimer = 0.6;
                        const chargeSpeed = boss.speed * 4;
                        boss._chargeVx = (pdx / pDist) * chargeSpeed;
                        boss._chargeVy = (pdy / pDist) * chargeSpeed;
                    } else if (ability === 'stomp') {
                        // Expanding shockwave ring — stuns on hit
                        this._bossShockwaves.push({
                            x: boss.x, y: boss.y,
                            radius: 0, expandSpeed: 250,
                            timer: 1.2, type: 'stomp',
                            dmg: Math.floor(boss.dmg * 0.5),
                            color: 0xffd54f,
                            _hitPlayer: false,
                        });
                    } else if (ability === 'root') {
                        // Vine ring — slows player for 3s
                        this._bossShockwaves.push({
                            x: boss.x, y: boss.y,
                            radius: 0, expandSpeed: 200,
                            timer: 1.5, type: 'root',
                            dmg: 0,
                            color: 0x66bb6a,
                            _hitPlayer: false,
                        });
                    } else if (ability === 'teleport') {
                        // Blink behind the player
                        const behindAngle = Math.atan2(-pdy, -pdx);
                        boss.x = this.player.x + Math.cos(behindAngle) * TILE_SIZE * 2;
                        boss.y = this.player.y + Math.sin(behindAngle) * TILE_SIZE * 2;
                        this._spawnDmgNum(boss.x, boss.y, '!', 0x7c4dff);
                    } else if (ability === 'slow_aura') {
                        // Constant slow when near boss
                        if (pDist < TILE_SIZE * 5) {
                            this.player._slowed = true;
                            this.player._slowTimer = 2;
                        }
                    }
                }
            }

            // Take projectile damage
            for (let pi = this.projectiles.length - 1; pi >= 0; pi--) {
                const p = this.projectiles[pi];
                const hx = boss.x - p.x, hy = boss.y - p.y;
                if (Math.sqrt(hx * hx + hy * hy) < TILE_SIZE * boss.size * 0.5) {
                    boss.hp -= p.damage;
                    this._spawnDmgNum(boss.x, boss.y, p.damage, 0xffd740);
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


    _spawnDmgNum(x, y, amount, color) {
        this.damageNumbers.push({
            x: x + (Math.random() - 0.5) * 12,
            y: y - 8,
            text: (typeof amount === 'string') ? amount : Math.floor(amount).toString(),
            timer: 0.8,
            color: color || 0xffffff,
            vy: -40 - Math.random() * 20,
        });
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
                    if (h._pixiSprite) { h._pixiSprite.parent?.removeChild(h._pixiSprite); h._pixiSprite.destroy(); h._pixiSprite = null; }
                    this.hordeCreatures.splice(i, 1);
                }
                continue;
            }

            // Charge toward HQ — but walls block, gates attract
            let targetX = 0, targetY = 0;

            // Find nearest gate to path through (if walls exist)
            if (!h._gateTarget) {
                let nearestGate = null, nearestGateDist = Infinity;
                for (const b of this.buildings) {
                    const def = BUILDING_DEFS[b.type];
                    if (!def.isGate) continue;
                    const gx = (b.gridX + 0.5) * TILE_SIZE;
                    const gy = (b.gridY + 0.5) * TILE_SIZE;
                    const gd = Math.sqrt((h.x - gx) ** 2 + (h.y - gy) ** 2);
                    if (gd < nearestGateDist) { nearestGateDist = gd; nearestGate = b; }
                }
                // If a gate is closer than HQ, path through it first
                if (nearestGate) {
                    const gx = (nearestGate.gridX + 0.5) * TILE_SIZE;
                    const gy = (nearestGate.gridY + 0.5) * TILE_SIZE;
                    const distToHQ = Math.sqrt(h.x * h.x + h.y * h.y);
                    if (nearestGateDist < distToHQ * 0.8) h._gateTarget = nearestGate;
                }
            }

            // If heading toward a gate, target it until close, then switch to HQ
            if (h._gateTarget) {
                const g = h._gateTarget;
                const gx = (g.gridX + 0.5) * TILE_SIZE;
                const gy = (g.gridY + 0.5) * TILE_SIZE;
                const gd = Math.sqrt((h.x - gx) ** 2 + (h.y - gy) ** 2);
                if (gd < TILE_SIZE * 2) h._gateTarget = null; // passed through
                else { targetX = gx; targetY = gy; }
            }

            const dx = targetX - h.x, dy = targetY - h.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const speed = 80;

            // Check for wall collision — if next position hits a wall, stop and attack it
            let blockedByWall = null;
            if (dist > TILE_SIZE * 2) {
                const nextX = h.x + (dx / dist) * speed * dt;
                const nextY = h.y + (dy / dist) * speed * dt;
                for (const b of this.buildings) {
                    const def = BUILDING_DEFS[b.type];
                    if (!def.isWall && !def.isGate) continue;
                    if (b.hp <= 0) continue; // destroyed
                    const wx = b.gridX * TILE_SIZE, wy = b.gridY * TILE_SIZE;
                    const ws = def.size * TILE_SIZE;
                    // Simple AABB check
                    if (nextX > wx - 8 && nextX < wx + ws + 8 && nextY > wy - 8 && nextY < wy + ws + 8) {
                        blockedByWall = b;
                        break;
                    }
                }

                if (!blockedByWall) {
                    h.x = nextX;
                    h.y = nextY;
                }
            }

            // Attack buildings near them (prioritize walls blocking them)
            if (!h._attackTimer) h._attackTimer = 0;
            h._attackTimer -= dt;
            if (h._attackTimer <= 0) {
                const sp = SPECIES[h.species];

                // If blocked by a wall, attack it
                if (blockedByWall) {
                    const dmg = Math.floor((sp.attackDmg || 3) * (h.dmgMult || 1));
                    if (blockedByWall.hp !== undefined) {
                        blockedByWall.hp -= dmg;
                        if (this.sounds) this.sounds.buildingHit();
                    }
                    h._attackTimer = sp.attackCooldown || 1.5;
                } else {
                    // Attack any building in range
                    for (const b of this.buildings) {
                        const def = BUILDING_DEFS[b.type];
                        const bcx = (b.gridX + def.size / 2) * TILE_SIZE;
                        const bcy = (b.gridY + def.size / 2) * TILE_SIZE;
                        const bdist = Math.sqrt((h.x - bcx) ** 2 + (h.y - bcy) ** 2);
                        if (bdist < TILE_SIZE * 2) {
                            const dmg = Math.floor((sp.attackDmg || 3) * (h.dmgMult || 1));
                            if (b.hp !== undefined) {
                                b.hp -= dmg;
                                if (this.sounds) this.sounds.buildingHit();
                            }
                            h._attackTimer = sp.attackCooldown || 1.5;
                            break;
                        }
                    }
                }

                // Also attack player if close
                const pdist = Math.sqrt((h.x - this.player.x) ** 2 + (h.y - this.player.y) ** 2);
                if (pdist < TILE_SIZE * 1.5 && h._attackTimer <= 0) {
                    const sp2 = SPECIES[h.species];
                    this.playerTakeDamage(Math.floor((sp2.attackDmg || 3) * (h.dmgMult || 1)));
                    h._attackTimer = sp2.attackCooldown || 1.5;
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
                    this._spawnDmgNum(h.x, h.y, p.damage, 0xff5252);
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
                        const patDmg = (c.stats.STR || 1) * 2;
                        h.hp -= patDmg;
                        this._spawnDmgNum(h.x, h.y, patDmg, 0x81c784);
                        if (h.hp <= 0) { h.stunned = true; h.stunTimer = 3; }
                        c._attackTimer = 1.5;
                        break;
                    }
                }
            }
        }
    }
}

// Game instance is created in index.html after config.js loads all moddable data
// window.game = new Game();
