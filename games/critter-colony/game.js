/* ============================================================
   Critter Colony — Main Game Engine
   ============================================================ */

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
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

        this._setupInput();
        this._resize();
        window.onresize = () => this._resize();
        preloadAllAssets();
        this._initTitle();
    }

    // ─── TITLE SCREEN ───────────────────────────────────────
    async _initTitle() {
        const saveData = await Save.load();
        const titleEl = document.getElementById('titleScreen');
        const hasData = saveData && saveData.gameState;
        let html = '<div class="title-content">';
        html += '<h1 class="title-logo">Critter<span>Colony</span></h1>';
        html += '<p class="title-sub">Capture. Build. Automate.</p>';
        html += '<div class="title-buttons">';
        if (hasData) html += '<button class="title-btn title-continue" onclick="game.loadAndStart()">Continue</button>';
        html += '<button class="title-btn title-new" onclick="game.newGame()">New Game</button>';
        html += '</div>';
        if (!Save.isLoggedIn()) html += '<p class="title-warn">Log in to save your progress!</p>';
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
        this.buildings = gs.buildings.map(b => ({ ...b, workers: [...b.workers], turretCooldown: 0, turretTarget: null }));
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
        UI.init(this); UI.update();
        this.lastTimestamp = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
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
            // Waypoint menu
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
            this._shoot(wx, wy);
        };
    }

    _handleEKey() {
        // Claim waypoint
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
        // Capture critter
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
                this.wildCritters = this.wildCritters.filter(c => c.id !== closest.id);
                this.critters.push(result.captured);
                UI.notify(`Captured ${SPECIES[result.captured.species].name}!`); UI.update();
            } else UI.notify(result.reason);
        }
    }

    _shoot(wx, wy) {
        if (this.gunCooldown > 0) return;
        this.gunCooldown = 0.3;
        const angle = Math.atan2(wy - this.player.y, wx - this.player.x);
        const speed = 400, damage = this.gunDamage + (this.research.gunDamage || 0) * 5;
        this.projectiles.push({ x: this.player.x, y: this.player.y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, damage, lifetime: 2, fromTurret: false });
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
            UI.notify(`Colony expanded! (+${radius} tile radius)`);
            this.placementMode = null; UI.update(); return;
        }
        const b = Buildings.place(type, tx, ty, this.resources);
        this.buildings.push(b);
        UI.notify(`Built ${def.name}!`); this.placementMode = null; UI.update();
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

    // ─── GAME LOOP ──────────────────────────────────────────
    gameLoop(timestamp) {
        const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1);
        this.lastTimestamp = timestamp; this.time = timestamp / 1000;
        this.update(dt); this.render();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    update(dt) {
        // Player movement
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

        // Camera
        this.cam.x += (this.player.x - this.canvas.width/2 - this.cam.x) * 0.1;
        this.cam.y += (this.player.y - this.canvas.height/2 - this.cam.y) * 0.1;

        // Chunks
        this.world.updateLoadedChunks(this.player.x, this.player.y);

        // Gun cooldown
        this.gunCooldown = Math.max(0, this.gunCooldown - dt);

        // Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx * dt; p.y += p.vy * dt; p.lifetime -= dt;
            if (p.lifetime <= 0) { this.projectiles.splice(i, 1); continue; }
            for (const wc of this.wildCritters) {
                const hx = wc.x - p.x, hy = wc.y - p.y;
                if (Math.sqrt(hx*hx + hy*hy) < 12) { Critters.damageWild(wc, p.damage); this.projectiles.splice(i, 1); break; }
            }
        }

        // Wild AI
        // Wild AI + aggression
        Critters.updateWild(dt, this.wildCritters, this.world, this.player);

        // Player HP regen (1 hp/sec when not taking damage)
        if (this.player.hp < this.player.maxHp) {
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + 1 * dt);
        }
        if (this.player.hp <= 0) {
            // Respawn at colony
            this.player.hp = this.player.maxHp;
            this.player.x = 0; this.player.y = 0;
            UI.notify('You were knocked out! Respawned at colony.', 4000);
        }

        // Resource caps
        const caps = {};
        for (const r of ['wood','stone','food']) caps[r] = (this.resourceCaps[r]||200) + (this.research.storageCap||0)*100;

        // Building production
        Buildings.update(dt, this.buildings, this.critters, this.resources, caps, this.inventory, this.hungry);
        for (const r of ['wood','stone','food']) this.resources[r] = Math.min(this.resources[r], caps[r]);

        // Turrets
        Buildings.updateTurrets(dt, this.buildings, this.wildCritters, this.projectiles, this.research);

        // Patrol critters — walk around colony, attack nearby wilds
        for (const c of this.critters) {
            if (c.assignment !== 'patrol') continue;

            // Init patrol state
            if (!c._patrolAngle) c._patrolAngle = Math.random() * Math.PI * 2;
            if (!c._patrolX) c._patrolX = 0;
            if (!c._patrolY) c._patrolY = 0;
            if (!c._patrolTargetX) { c._patrolTargetX = c._patrolX; c._patrolTargetY = c._patrolY; }
            if (!c._attackTimer) c._attackTimer = 0;
            c._attackTimer -= dt;

            // Walk along colony perimeter in a circle
            c._patrolAngle += dt * 0.3; // orbit speed
            const orbitR = CHUNK_SIZE * TILE_SIZE * 1.2; // just outside colony
            c._patrolTargetX = Math.cos(c._patrolAngle + c.id * 1.5) * orbitR;
            c._patrolTargetY = Math.sin(c._patrolAngle + c.id * 1.5) * orbitR;

            // Move toward target
            const pdx = c._patrolTargetX - c._patrolX;
            const pdy = c._patrolTargetY - c._patrolY;
            const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
            if (pDist > 3) {
                const speed = 60;
                c._patrolX += (pdx / pDist) * speed * dt;
                c._patrolY += (pdy / pDist) * speed * dt;
            }

            // Attack nearby wild critters
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

        // Research
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

        // Critter food consumption — each owned critter eats 0.02 food/sec (1.2/min)
        // Only critters with an assignment (working or patrolling) consume food
        // No food = critters work 50% slower (hungry debuff, not death)
        if (!this._foodTimer) this._foodTimer = 0;
        this._foodTimer += dt;
        if (this._foodTimer >= 5) { // check every 5 seconds
            this._foodTimer = 0;
            let activeCount = this.critters.filter(c => c.assignment).length;
            const consumption = activeCount * 0.1; // 0.1 food per active critter per 5s
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

        // Respawn
        this.respawnTimer -= dt;
        if (this.respawnTimer <= 0) {
            this.respawnTimer = 30;
            if (this.wildCritters.length < WILD_MIN_COUNT) {
                const nw = Critters.spawnWild(this.world);
                this.wildCritters.push(...nw.slice(0, WILD_MIN_COUNT - this.wildCritters.length));
            }
        }

        // Auto-save
        this.autoSaveTimer -= dt;
        if (this.autoSaveTimer <= 0) { this.autoSaveTimer = 60; Save.save(this); }

        UI.updateNotifications(dt);

        // Resource bar
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

    render() {
        const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
        ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, w, h);

        this.world.render(ctx, this.cam.x, this.cam.y, w, h);
        for (const b of this.buildings) Buildings.render(ctx, b, this.cam.x, this.cam.y, this.critters, this.time);

        // Patrol critters
        for (const c of this.critters) {
            if (c.assignment !== 'patrol') continue;
            const sp = SPECIES[c.species], sx = (c._patrolX||0) - this.cam.x, sy = (c._patrolY||0) - this.cam.y;
            const bob = Math.sin(this.time*3 + c.id)*2;
            ctx.fillStyle = sp.color; ctx.beginPath(); ctx.arc(sx, sy+bob, 7, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('\uD83D\uDEE1', sx, sy+bob-10);
        }

        for (const c of this.wildCritters) Critters.renderWild(ctx, c, this.cam.x, this.cam.y, this.time);

        // Projectiles
        for (const p of this.projectiles) {
            ctx.fillStyle = p.fromTurret ? '#90a4ae' : '#ffd54f';
            ctx.beginPath(); ctx.arc(p.x-this.cam.x, p.y-this.cam.y, 3, 0, Math.PI*2); ctx.fill();
        }

        // Player
        const px = this.player.x - this.cam.x, py = this.player.y - this.cam.y;
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(px, py+12, 10, 5, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#4FC3F7'; ctx.beginPath(); ctx.arc(px, py, 10, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();

        // Player HP bar
        if (this.player.hp < this.player.maxHp) {
            const hpW = 28, hpH = 4;
            ctx.fillStyle = '#333'; ctx.fillRect(px - hpW/2, py - 18, hpW, hpH);
            const pct = this.player.hp / this.player.maxHp;
            ctx.fillStyle = pct > 0.5 ? '#4ade80' : pct > 0.25 ? '#fbbf24' : '#f87171';
            ctx.fillRect(px - hpW/2, py - 18, hpW * pct, hpH);
        }

        // Gun aim
        if (this.gunCooldown <= 0) {
            ctx.strokeStyle = 'rgba(255,213,79,0.2)'; ctx.lineWidth = 1; ctx.setLineDash([4,4]);
            ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(this.mouse.x, this.mouse.y); ctx.stroke(); ctx.setLineDash([]);
        }

        // Placement preview
        if (this.placementMode) {
            const tx = Math.floor(this.mouse.worldX/TILE_SIZE), ty = Math.floor(this.mouse.worldY/TILE_SIZE);
            const def = BUILDING_DEFS[this.placementMode.type];
            const cp = Buildings.canPlace(tx, ty, def.size, this.buildings, this.world);
            const sx = tx*TILE_SIZE-this.cam.x, sy = ty*TILE_SIZE-this.cam.y, sz = def.size*TILE_SIZE;
            ctx.fillStyle = cp ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'; ctx.fillRect(sx,sy,sz,sz);
            ctx.strokeStyle = cp ? '#4ade80' : '#f87171'; ctx.lineWidth = 2; ctx.strokeRect(sx,sy,sz,sz);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(def.letter, sx+sz/2, sy+sz/2);
        }

        // Capture/waypoint indicators
        for (const c of this.wildCritters) {
            const cd = Math.sqrt((c.x-this.player.x)**2+(c.y-this.player.y)**2)/TILE_SIZE;
            if (cd < CAPTURE_RANGE) {
                const sx = c.x-this.cam.x, sy = c.y-this.cam.y;
                ctx.strokeStyle = c.stunned ? 'rgba(255,213,79,0.7)' : 'rgba(74,222,128,0.5)';
                ctx.lineWidth = 1.5; ctx.setLineDash([4,4]); ctx.beginPath(); ctx.arc(sx,sy,16,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
                ctx.fillStyle = c.stunned ? '#ffd54f' : '#4ade80'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
                ctx.fillText(c.stunned ? 'E: FREE!' : 'E: CAPTURE', sx, sy-22);
            }
        }
        for (const wp of this.world.waypoints) {
            if (wp.claimed) continue;
            const wd = Math.sqrt((this.player.x-(wp.x*TILE_SIZE+16))**2+(this.player.y-(wp.y*TILE_SIZE+16))**2);
            if (wd < TILE_SIZE*3) {
                const sx = wp.x*TILE_SIZE+16-this.cam.x, sy = wp.y*TILE_SIZE+16-this.cam.y;
                ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
                ctx.fillText('E: CLAIM WAYPOINT', sx, sy-50);
            }
        }

        UI.renderWaypointMenu(ctx, this, w, h);
        UI.renderNotifications(ctx, w);

        if (this.showFullMap) {
            this._renderFullMap(ctx, w, h);
        } else {
            this._renderMinimap(ctx, w, h);
        }
    }

    _renderFullMap(ctx, cw, ch) {
        // Dark overlay
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(0, 0, cw, ch);

        // Map area with padding
        const pad = 40;
        const mapW = cw - pad * 2;
        const mapH = ch - pad * 2;

        ctx.fillStyle = 'rgba(10,10,30,0.95)';
        ctx.fillRect(pad, pad, mapW, mapH);
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(pad, pad, mapW, mapH);

        // Title
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('WORLD MAP (M to close)', cw / 2, pad - 12);

        // Find bounds of all generated chunks
        let minCX = Infinity, maxCX = -Infinity, minCY = Infinity, maxCY = -Infinity;
        for (const [, chunk] of this.world.chunks) {
            if (chunk.cx < minCX) minCX = chunk.cx;
            if (chunk.cx > maxCX) maxCX = chunk.cx;
            if (chunk.cy < minCY) minCY = chunk.cy;
            if (chunk.cy > maxCY) maxCY = chunk.cy;
        }

        if (minCX > maxCX) return; // no chunks

        const chunkSpanX = maxCX - minCX + 1;
        const chunkSpanY = maxCY - minCY + 1;
        const tileScale = Math.min((mapW - 20) / (chunkSpanX * CHUNK_SIZE), (mapH - 20) / (chunkSpanY * CHUNK_SIZE));
        const offsetX = pad + 10 + (mapW - 20 - chunkSpanX * CHUNK_SIZE * tileScale) / 2;
        const offsetY = pad + 10 + (mapH - 20 - chunkSpanY * CHUNK_SIZE * tileScale) / 2;

        // Tile colors for map
        const mapColors = {
            [TILE.GRASS]: '#3a6832',
            [TILE.TREE]: '#2a5020',
            [TILE.ROCK]: '#555',
            [TILE.WATER]: '#2266aa',
            [TILE.COLONY]: '#8a7a52',
            [TILE.PATH]: '#9a8a60',
        };

        // Draw each chunk's tiles
        for (const [, chunk] of this.world.chunks) {
            const cBaseX = (chunk.cx - minCX) * CHUNK_SIZE;
            const cBaseY = (chunk.cy - minCY) * CHUNK_SIZE;

            for (let ly = 0; ly < CHUNK_SIZE; ly++) {
                for (let lx = 0; lx < CHUNK_SIZE; lx++) {
                    const t = chunk.tiles[ly * CHUNK_SIZE + lx];
                    const sx = offsetX + (cBaseX + lx) * tileScale;
                    const sy = offsetY + (cBaseY + ly) * tileScale;
                    ctx.fillStyle = mapColors[t] || '#222';
                    ctx.fillRect(sx, sy, Math.ceil(tileScale), Math.ceil(tileScale));
                }
            }
        }

        // Draw buildings
        for (const b of this.buildings) {
            const def = BUILDING_DEFS[b.type];
            const bx = offsetX + (b.gridX - minCX * CHUNK_SIZE) * tileScale;
            const by = offsetY + (b.gridY - minCY * CHUNK_SIZE) * tileScale;
            const bs = def.size * tileScale;
            ctx.fillStyle = def.color;
            ctx.fillRect(bx, by, Math.max(bs, 3), Math.max(bs, 3));
        }

        // Draw waypoints
        for (const wp of this.world.waypoints) {
            const wx = offsetX + (wp.x - minCX * CHUNK_SIZE) * tileScale;
            const wy = offsetY + (wp.y - minCY * CHUNK_SIZE) * tileScale;
            ctx.fillStyle = wp.claimed ? '#4ade80' : '#888';
            ctx.beginPath();
            ctx.arc(wx, wy, Math.max(3, tileScale * 2), 0, Math.PI * 2);
            ctx.fill();
            if (wp.claimed) {
                ctx.fillStyle = '#fff';
                ctx.font = '9px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(wp.name, wx, wy - Math.max(5, tileScale * 3));
            }
        }

        // Draw player
        const playerTX = Math.floor(this.player.x / TILE_SIZE);
        const playerTY = Math.floor(this.player.y / TILE_SIZE);
        const ppx = offsetX + (playerTX - minCX * CHUNK_SIZE) * tileScale;
        const ppy = offsetY + (playerTY - minCY * CHUNK_SIZE) * tileScale;
        ctx.fillStyle = '#4FC3F7';
        ctx.beginPath();
        ctx.arc(ppx, ppy, Math.max(4, tileScale * 2), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Legend
        ctx.textAlign = 'left';
        ctx.font = '10px monospace';
        const legendY = ch - pad - 8;
        const legends = [
            ['#3a6832', 'Grass'], ['#2a5020', 'Forest'], ['#555', 'Rock'],
            ['#2266aa', 'Water'], ['#8a7a52', 'Colony'], ['#4FC3F7', 'You'],
            ['#4ade80', 'Waypoint'],
        ];
        let lx = pad + 10;
        for (const [color, label] of legends) {
            ctx.fillStyle = color;
            ctx.fillRect(lx, legendY - 6, 8, 8);
            ctx.fillStyle = '#aaa';
            ctx.fillText(label, lx + 12, legendY);
            lx += ctx.measureText(label).width + 24;
        }

        // Chunk count
        ctx.fillStyle = '#666';
        ctx.textAlign = 'right';
        ctx.fillText(`${this.world.chunks.size} chunks explored`, cw - pad - 10, legendY);
    }

    _renderMinimap(ctx, cw, ch) {
        const ms = 120, mx = 10, my = ch-ms-10, scale = 0.15;
        ctx.fillStyle = 'rgba(10,10,30,0.8)'; ctx.fillRect(mx,my,ms,ms);
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1; ctx.strokeRect(mx,my,ms,ms);
        const cx = mx+ms/2, cy = my+ms/2;
        for (const b of this.buildings) {
            const bx = cx+(b.gridX*TILE_SIZE-this.player.x)*scale/TILE_SIZE;
            const by = cy+(b.gridY*TILE_SIZE-this.player.y)*scale/TILE_SIZE;
            if (bx>mx&&bx<mx+ms&&by>my&&by<my+ms) { ctx.fillStyle = BUILDING_DEFS[b.type].color; ctx.fillRect(bx-1,by-1,3,3); }
        }
        for (const wp of this.world.waypoints) {
            const wpx = cx+(wp.x*TILE_SIZE-this.player.x)*scale/TILE_SIZE;
            const wpy = cy+(wp.y*TILE_SIZE-this.player.y)*scale/TILE_SIZE;
            if (wpx>mx&&wpx<mx+ms&&wpy>my&&wpy<my+ms) { ctx.fillStyle = wp.claimed?'#4ade80':'#888'; ctx.beginPath(); ctx.arc(wpx,wpy,2,0,Math.PI*2); ctx.fill(); }
        }
        ctx.fillStyle = '#4FC3F7'; ctx.beginPath(); ctx.arc(cx,cy,3,0,Math.PI*2); ctx.fill();
    }

    _resize() { this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight; }
}

const game = new Game();
