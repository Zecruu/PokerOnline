/* ============================================================
   Critter Colony — UI System
   ============================================================ */

// Research definitions
const RESEARCH_DEFS = {
    gunDamage:    { name: 'Tamer Gun Power',   desc: '+5 gun damage',         maxLevel: 10, cost: (l) => ({ wood: 30*(l+1), stone: 20*(l+1), food: 10*(l+1) }), time: 30 },
    storageCap:   { name: 'Storage Expansion',  desc: '+100 resource cap',     maxLevel: 10, cost: (l) => ({ wood: 40*(l+1), stone: 40*(l+1), food: 0 }),        time: 25 },
    captureBonus: { name: 'Capture Mastery',    desc: '+10% capture rate',     maxLevel: 5,  cost: (l) => ({ wood: 20*(l+1), stone: 20*(l+1), food: 20*(l+1) }), time: 40 },
    turretDamage: { name: 'Turret Calibration', desc: '+3 turret damage',      maxLevel: 8,  cost: (l) => ({ wood: 25*(l+1), stone: 35*(l+1), food: 0 }),        time: 35 },
    turretRange:  { name: 'Turret Optics',      desc: '+1 tile turret range',  maxLevel: 5,  cost: (l) => ({ wood: 30*(l+1), stone: 30*(l+1), food: 0 }),        time: 30 },
    afkCap:       { name: 'Extended AFK',       desc: '+2 hours offline cap',  maxLevel: 4,  cost: (l) => ({ wood: 50*(l+1), stone: 50*(l+1), food: 30*(l+1) }), time: 60 },
    colonyRadius: { name: 'Colony Reach',       desc: 'Bigger expander radius',maxLevel: 3,  cost: (l) => ({ wood: 60*(l+1), stone: 60*(l+1), food: 40*(l+1) }), time: 50 },
    critterCap:   { name: 'Critter Capacity',   desc: '+4 max critters',       maxLevel: 10, cost: (l) => ({ wood: 25*(l+1), stone: 25*(l+1), food: 15*(l+1) }), time: 20 },
    workersPerB:  { name: 'Workforce Training', desc: '+1 worker per building', maxLevel: 4,  cost: (l) => ({ wood: 35*(l+1), stone: 35*(l+1), food: 20*(l+1) }), time: 35 },
    // Base upgrades
    baseHp:       { name: 'Fortification',     desc: '+50 HP to all buildings', maxLevel: 8,  cost: (l) => ({ wood: 40*(l+1), stone: 50*(l+1), food: 0 }),        time: 30 },
    baseTurret:   { name: 'HQ Auto-Turret',    desc: 'HQ fires at enemies (stacks)', maxLevel: 3, cost: (l) => ({ wood: 50*(l+1), stone: 60*(l+1), iron: 20*(l+1) }), time: 50 },
    bodyguardSlots:{ name: 'Bodyguard Training',desc: '+1 bodyguard slot (max 4)', maxLevel: 3, cost: (l) => ({ wood: 40*(l+1), stone: 30*(l+1), food: 30*(l+1) }), time: 40 },
    // Building unlocks
    storageBuilding:{ name: 'Storage Tech',    desc: 'Unlocks Storage building (+150 cap each)', maxLevel: 1, cost: (l) => ({ wood: 60, stone: 60, food: 20 }), time: 30 },
    smelting:     { name: 'Smelting',          desc: 'Unlocks Smelter (ore → metal)',    maxLevel: 1, cost: (l) => ({ wood: 50, stone: 80, food: 0 }),        time: 45 },
    greenhouse:   { name: 'Greenhouse Tech',   desc: 'Unlocks Greenhouse (2x food)',    maxLevel: 1, cost: (l) => ({ wood: 60, stone: 40, food: 30 }),       time: 35 },
    barracks:     { name: 'Barracks',          desc: 'Unlocks Barracks (+30% patrol dmg)', maxLevel: 1, cost: (l) => ({ wood: 50, stone: 70, food: 20 }),    time: 40 },
    refinery:     { name: 'Crystal Refinery',  desc: 'Unlocks Refinery (produces crystal)', maxLevel: 1, cost: (l) => ({ wood: 80, stone: 80, food: 40 }),   time: 60 },
    healingHut:   { name: 'Healing Arts',      desc: 'Unlocks Healing Hut (auto-heal injured)', maxLevel: 1, cost: (l) => ({ wood: 40, stone: 30, food: 40 }), time: 35 },
    // Extractors
    oilDrilling:  { name: 'Oil Drilling',      desc: 'Unlocks Oil Pump (place on oil nodes)',   maxLevel: 1, cost: (l) => ({ wood: 60, stone: 80, food: 0 }),       time: 50 },
    goldMining:   { name: 'Gold Mining',       desc: 'Unlocks Gold Mine (place on gold nodes)', maxLevel: 1, cost: (l) => ({ wood: 80, stone: 100, iron: 20 }),     time: 60 },
    diamondDrill: { name: 'Diamond Drilling',  desc: 'Unlocks Diamond Drill (diamond nodes)',   maxLevel: 1, cost: (l) => ({ wood: 100, stone: 120, iron: 40 }),    time: 80 },
    crystalExtract:{ name: 'Crystal Extraction',desc: 'Unlocks Crystal Extractor',              maxLevel: 1, cost: (l) => ({ wood: 70, stone: 90, iron: 15 }),      time: 55 },
    // Power chain
    gasRefining:  { name: 'Gas Refining',      desc: 'Unlocks Gas Refinery (oil → gasoline)',  maxLevel: 1, cost: (l) => ({ wood: 50, stone: 60, iron: 15 }),      time: 40 },
    generators:   { name: 'Power Generators',  desc: 'Unlocks Generator (powers extractors)',  maxLevel: 1, cost: (l) => ({ wood: 60, stone: 70, iron: 25 }),      time: 50 },
    // Snare tiers
    ironSnare:    { name: 'Iron Snares',       desc: 'Craft Iron Snares (catches uncommon)',    maxLevel: 1, cost: (l) => ({ wood: 40, stone: 40, iron: 10 }),      time: 30 },
    goldSnare:    { name: 'Gold Snares',       desc: 'Craft Gold Snares (catches rare)',        maxLevel: 1, cost: (l) => ({ wood: 50, stone: 50, gold: 5 }),       time: 45 },
    diamondSnare: { name: 'Diamond Snares',    desc: 'Craft Diamond Snares (catches legendary)',maxLevel: 1, cost: (l) => ({ wood: 60, stone: 60, diamond: 3 }),    time: 60 },
};

class UI {
    static init(game) {
        this.game = game;
        this.activeTab = 'buildings';
        this.notifications = [];
        this.showWaypointMenu = false;
        this.showResearchMenu = false;

        document.getElementById('tabBuildings').onclick = () => this.switchTab('buildings');
        document.getElementById('tabCritters').onclick = () => this.switchTab('critters');
        document.getElementById('tabManage').onclick = () => this.switchTab('manage');
        document.getElementById('tabResearch').onclick = () => this.switchTab('research');
    }

    static switchTab(tab) {
        this.activeTab = tab;
        document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
        const el = document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1));
        if (el) el.classList.add('active');
        this.updatePanel();
    }

    static update() {
        const g = this.game;
        const getCap = (r) => (g.resourceCaps[r] || 200) + (g.research.storageCap || 0) * 100;

        document.getElementById('resWood').textContent = `${Math.floor(g.resources.wood)}/${getCap('wood')}`;
        document.getElementById('resStone').textContent = `${Math.floor(g.resources.stone)}/${getCap('stone')}`;
        document.getElementById('resFood').textContent = `${Math.floor(g.resources.food)}/${getCap('food')}`;
        document.getElementById('trapCount').textContent = g.inventory.traps;
        document.getElementById('critterCount').textContent = `${g.critters.length}/${Buildings.getMaxCritters(g.buildings, g.research)}`;

        this.updatePanel();
    }

    static _critterIconHtml(species, cssClass) {
        const cls = cssClass || 'mb-worker-icon';
        const sprite = typeof CRITTER_SPRITES !== 'undefined' && CRITTER_SPRITES[species] && CRITTER_SPRITES[species].complete
            ? CRITTER_SPRITES[species] : null;
        if (sprite) return `<img class="${cls}" src="${sprite.src}">`;
        return `<div class="${cls}" style="background:${SPECIES[species].color}"></div>`;
    }

    static updatePanel() {
        const g = this.game;
        const body = document.getElementById('panelBody');
        if (!body) return;

        // Don't rebuild critters/manage tab if a select is focused (prevents dropdown closing)
        if ((this.activeTab === 'critters' || this.activeTab === 'manage') && body.querySelector('select:focus')) return;

        // ── WORKBENCH UI (overrides other tabs when open) ──
        if (g._activeWorkbench) {
            const wb = g.buildings.find(b => b.id === g._activeWorkbench);
            if (!wb || !g._isNearWorkbench(g._activeWorkbench)) {
                g._activeWorkbench = null; // auto-close if walked away
            } else {
                const ct = Buildings.getCraftTime(wb, g.critters);
                const canCraft = (g.resources.wood || 0) >= 5 && (g.resources.stone || 0) >= 3;
                const crafting = (wb.workers.length > 0 && wb.craftQueue > 0) || wb._manualCrafting;
                const pct = crafting ? Math.min(100, ((wb.craftProgress || 0) / ct) * 100) : 0;

                const canTrap = (g.resources.wood||0) >= 5 && (g.resources.stone||0) >= 3;
                const canAmmo = (g.resources.iron||0) >= 2 && (g.resources.stone||0) >= 1;
                const activeR = wb.activeRecipe || 'trap';

                let html = `<div class="wb-panel">`;
                html += `<div class="wb-panel-header"><span>⚒ Workbench</span><button class="wb-close" onclick="game.closeWorkbench()">✕</button></div>`;

                // Progress bar (if crafting anything)
                if (crafting) {
                    const label = activeR === 'ammo' ? 'Bullets' : 'Trap';
                    html += `<div class="wb-progress">`;
                    html += `<div class="wb-prog-bar"><div class="wb-prog-fill" style="width:${pct}%"></div></div>`;
                    html += `<span class="wb-prog-text">Crafting ${label}... ${Math.floor(pct)}% (${ct.toFixed(1)}s)</span>`;
                    html += `</div>`;
                }

                // ── Recipe: Trap ──
                html += `<div class="wb-recipe">`;
                html += `<div class="wb-recipe-icon">🪤</div>`;
                html += `<div class="wb-recipe-info">`;
                html += `<div class="wb-recipe-name">Trap</div>`;
                html += `<div class="wb-recipe-desc">Captures stunned critters</div>`;
                html += `<div class="wb-recipe-cost"><span class="wb-res ${(g.resources.wood||0)>=5?'':'wb-res-lack'}">🪵5</span><span class="wb-res ${(g.resources.stone||0)>=3?'':'wb-res-lack'}">🪨3</span> → 🪤1</div>`;
                html += `</div>`;
                html += `<div class="wb-recipe-btns">`;
                html += `<button class="wb-craft-sm" onclick="game.manualCraft(${wb.id},'trap')" ${canTrap?'':'disabled'}>×1</button>`;
                html += `<button class="wb-craft-sm" onclick="game.queueCraft(${wb.id},5,'trap')" ${canTrap?'':'disabled'}>+5</button>`;
                html += `<button class="wb-craft-sm" onclick="game.queueCraft(${wb.id},20,'trap')" ${canTrap?'':'disabled'}>+20</button>`;
                html += `</div></div>`;
                if (wb.craftQueue > 0) html += `<div class="wb-queue-sm">${wb.craftQueue} traps queued</div>`;

                // ── Recipe: Bullets ──
                html += `<div class="wb-recipe">`;
                html += `<div class="wb-recipe-icon">🔫</div>`;
                html += `<div class="wb-recipe-info">`;
                html += `<div class="wb-recipe-name">Bullets ×5</div>`;
                html += `<div class="wb-recipe-desc">Ammo for your tamer gun</div>`;
                html += `<div class="wb-recipe-cost"><span class="wb-res ${(g.resources.iron||0)>=2?'':'wb-res-lack'}">⛓2 Iron</span><span class="wb-res ${(g.resources.stone||0)>=1?'':'wb-res-lack'}">🪨1</span> → 💥5</div>`;
                html += `</div>`;
                html += `<div class="wb-recipe-btns">`;
                html += `<button class="wb-craft-sm" onclick="game.manualCraft(${wb.id},'ammo')" ${canAmmo?'':'disabled'}>×1</button>`;
                html += `<button class="wb-craft-sm" onclick="game.queueCraft(${wb.id},5,'ammo')" ${canAmmo?'':'disabled'}>+5</button>`;
                html += `<button class="wb-craft-sm" onclick="game.queueCraft(${wb.id},20,'ammo')" ${canAmmo?'':'disabled'}>+20</button>`;
                html += `</div></div>`;
                if (wb.ammoQueue > 0) html += `<div class="wb-queue-sm">${wb.ammoQueue} ammo batches queued</div>`;

                // Workers
                html += `<div class="wb-workers-label">Workers (${wb.workers.length}) — DEX = speed</div>`;
                if (wb.workers.length > 0) {
                    for (const cid of wb.workers) {
                        const c = g.critters.find(cr => cr.id === cid);
                        if (c) html += `<div class="wb-worker-item">${UI._critterIconHtml(c.species,'wb-worker-icon')} ${c.nickname} <span style="color:#ffd54f">DEX:${c.stats.DEX||0}</span></div>`;
                    }
                } else html += `<div class="wb-no-workers">No workers — assign DEX critters for auto-craft</div>`;

                // Inventory
                html += `<div class="wb-inv-row"><span>🪤 Traps: <b>${g.inventory.traps}</b></span><span>💥 Ammo: <b>${g.inventory.ammo||0}</b></span></div>`;
                html += `</div>`;
                body.innerHTML = html;
                return;
            }
        }

        if (this.activeTab === 'buildings') {
            let html = '<div class="panel-section-label">Build</div>';
            for (const [type, def] of Object.entries(BUILDING_DEFS)) {
                if (def.unbuildable) continue;
                const canAfford = Buildings.canAfford(type, g.resources);
                const costStr = Object.entries(def.cost).filter(([,v]) => v > 0).map(([k,v]) => `${v} ${k}`).join(', ');
                // Building sprite image
                const bSprite = typeof BUILDING_SPRITES !== 'undefined' && BUILDING_SPRITES[type] && BUILDING_SPRITES[type].complete && BUILDING_SPRITES[type].naturalWidth > 0
                    ? BUILDING_SPRITES[type] : null;
                html += `<div class="build-item ${canAfford ? '' : 'disabled'}" onclick="game.startPlacement('${type}')">`;
                html += `<div class="build-header">`;
                if (bSprite) {
                    html += `<img class="build-icon" src="${bSprite.src}">`;
                } else {
                    html += `<div class="build-icon build-icon-fallback" style="background:${def.color}">${def.letter}</div>`;
                }
                html += `<div class="build-header-text">`;
                html += `<span class="build-name">${def.name}</span>`;
                html += `<span class="build-cost">${costStr || 'Free'}</span>`;
                html += `</div>`;
                html += `</div>`;
                // Stat yield info with icon
                if (def.statKey) {
                    const statIcon = typeof STAT_ICONS !== 'undefined' && STAT_ICONS[def.statKey.toLowerCase()] && STAT_ICONS[def.statKey.toLowerCase()].complete
                        ? `<img class="build-stat-icon" src="${STAT_ICONS[def.statKey.toLowerCase()].src}">` : '';
                    html += `<div class="build-stat">${statIcon}<b>${def.statKey}</b> increases yield</div>`;
                }
                if (def.produces) html += `<span class="build-desc">Produces ${def.produces} — assign critters with high ${def.statKey || 'stats'}</span>`;
                else if (def.capacity) html += `<span class="build-desc">+${def.capacity} critter capacity</span>`;
                else if (def.turret) html += `<span class="build-desc">Auto-attacks wild critters</span>`;
                else if (def.expander) html += `<span class="build-desc">Expands colony zone</span>`;
                else if (def.isResearch) html += `<span class="build-desc">Assign high INT critters to research faster</span>`;
                else if (def.isWorkbench) html += `<span class="build-desc">Crafts traps (5 wood + 3 stone). High DEX = faster</span>`;
                if (def.hp) html += `<span class="build-hp">HP: ${def.hp}</span>`;
                html += `</div>`;
            }

            if (g.buildings.length > 0) {
                html += '<div class="panel-section-label" style="margin-top:12px">Your Buildings</div>';
                for (const b of g.buildings) {
                    const def = BUILDING_DEFS[b.type];
                    const rate = Buildings.getProductionRate(b, g.critters);
                    html += `<div class="placed-building">`;
                    html += `<span class="pb-name">${def.name}</span>`;
                    html += `<span class="pb-workers">${b.workers.length} workers</span>`;
                    if (def.produces) html += `<span class="pb-rate">+${rate.toFixed(2)}/s ${def.produces}</span>`;

                    // Workbench — open button
                    if (def.isWorkbench) {
                        html += `<button class="wb-open-btn" onclick="game.openWorkbench(${b.id})">Open Workbench</button>`;
                        if (b.craftQueue > 0 || b._manualCrafting) {
                            const ct = Buildings.getCraftTime(b, g.critters);
                            const pct = Math.min(100, ((b.craftProgress || 0) / ct) * 100);
                            html += `<div class="wb-inline-prog"><div class="wb-inline-bar" style="width:${pct}%"></div></div>`;
                            if (b.craftQueue > 0) html += `<span class="wb-queue">${b.craftQueue} queued</span>`;
                        }
                    }

                    html += `</div>`;
                }
            }
            body.innerHTML = html;

        } else if (this.activeTab === 'critters') {
            let html = '';
            if (g.critters.length === 0) {
                html = '<div class="panel-empty">No critters captured yet.<br>Explore and press E near wild critters!</div>';
            } else {
                for (const c of g.critters) {
                    const sp = SPECIES[c.species];
                    const critterImg = typeof CRITTER_SPRITES !== 'undefined' && CRITTER_SPRITES[c.species] && CRITTER_SPRITES[c.species].complete
                        ? `<img class="cc-icon" src="${CRITTER_SPRITES[c.species].src}">` : `<span class="cc-dot" style="background:${sp.color}"></span>`;
                    html += `<div class="critter-card">`;
                    html += `<div class="cc-header">`;
                    html += critterImg;
                    html += `<span class="cc-name" onclick="game.renameCritter(${c.id})" title="Click to rename">${c.nickname}</span>`;
                    const maxLv = typeof Critters !== 'undefined' ? Critters.MAX_LEVEL : 20;
                    html += `<span class="cc-level">Lv.${c.level}${c.level >= maxLv ? ' MAX' : ''}</span>`;
                    html += `</div>`;
                    const typeInfo = typeof CRITTER_TYPES !== 'undefined' ? CRITTER_TYPES[sp.type] : null;
                    html += `<div class="cc-type-row">`;
                    html += `<span class="cc-rarity" style="color:${RARITY_COLORS[sp.rarity]}">${sp.rarity}</span>`;
                    if (typeInfo) html += `<span class="cc-type" style="color:${typeInfo.color}">${typeInfo.icon} ${typeInfo.name}</span>`;
                    html += `</div>`;
                    if (c.injured) {
                        const mins = Math.ceil((c.injuredTimer || 0) / 60);
                        html += `<div class="cc-injured">🩹 Injured — ${mins}m recovery</div>`;
                    }
                    // Passives
                    if (c.passives && c.passives.length > 0) {
                        html += `<div class="cc-passives">`;
                        for (const pid of c.passives) {
                            const p = typeof PASSIVES !== 'undefined' ? PASSIVES[pid] : null;
                            if (!p) continue;
                            const pColor = RARITY_COLORS[p.rarity] || '#aaa';
                            html += `<span class="cc-passive ${p.negative ? 'cc-passive-neg' : ''}" style="border-color:${pColor}40;color:${pColor}" title="${p.desc}">${p.icon} ${p.name}</span>`;
                        }
                        html += `</div>`;
                    }
                    // Patrol HP
                    if (c.assignment === 'patrol' && c.patrolHp !== undefined) {
                        const php = Math.floor(c.patrolHp), pmhp = c.patrolMaxHp || 50;
                        html += `<div class="cc-patrol-hp">❤️ ${php}/${pmhp} HP</div>`;
                    }
                    // XP bar
                    if (c.level < maxLv) {
                        const xpNeeded = typeof Critters !== 'undefined' ? Critters.getXpForLevel(c.level) : 50;
                        const xpPct = Math.min(100, (c.xp / xpNeeded) * 100);
                        html += `<div class="cc-xp"><div class="cc-xp-bar" style="width:${xpPct}%"></div><span class="cc-xp-text">${c.xp}/${xpNeeded} XP</span></div>`;
                    } else {
                        html += `<div class="cc-xp cc-xp-max"><span class="cc-xp-text">MAX LEVEL</span></div>`;
                    }
                    html += `<div class="cc-stats">`;
                    for (const [key, val] of Object.entries(c.stats)) {
                        const iconImg = typeof STAT_ICONS !== 'undefined' && STAT_ICONS[key.toLowerCase()] && STAT_ICONS[key.toLowerCase()].complete
                            ? `<img class="cc-stat-icon" src="${STAT_ICONS[key.toLowerCase()].src}">` : '';
                        html += `<span class="cc-stat">${iconImg}${key}:${val}</span>`;
                    }
                    html += `</div>`;
                    // Show bonus yield if assigned to a building
                    if (c.assignment && c.assignment !== 'patrol') {
                        const bld = g.buildings.find(b => b.id === c.assignment);
                        if (bld) {
                            const def = BUILDING_DEFS[bld.type];
                            // Type match indicator
                            const tBonus = typeof Critters !== 'undefined' ? Critters.getTypeBonus(c, bld.type) : 0;
                            if (tBonus > 0) html += `<div class="cc-bonus cc-type-match">✅ Type match! +${(tBonus*100).toFixed(0)}% bonus</div>`;
                            else if (tBonus < 0) html += `<div class="cc-bonus cc-type-mismatch">⚠️ Wrong type. ${(tBonus*100).toFixed(0)}% penalty</div>`;
                            if (def.produces && def.statKey) {
                                const statVal = c.stats[def.statKey] || 0;
                                const bonus = (statVal * 0.05 * 100).toFixed(0);
                                html += `<div class="cc-bonus">+${bonus}% ${def.produces} yield (${def.statKey}: ${statVal})</div>`;
                            } else if (def.isResearch) {
                                const intVal = c.stats.INT || 0;
                                html += `<div class="cc-bonus">+${(intVal * 8).toFixed(0)}% research speed (INT: ${intVal})</div>`;
                            } else if (def.isWorkbench) {
                                const dexVal = c.stats.DEX || 0;
                                html += `<div class="cc-bonus">-${(dexVal * 2).toFixed(0)}% craft time (DEX: ${dexVal})</div>`;
                            }
                        }
                    }

                    html += `<div class="cc-assign">`;
                    html += `<select onchange="game.assignCritter(${c.id}, this.value)">`;
                    html += `<option value="">Idle</option>`;
                    html += `<option value="patrol" ${c.assignment === 'patrol' ? 'selected' : ''}>Patrol (Guard)</option>`;
                    const bodyguardCount = g.critters.filter(cr => cr.assignment === 'bodyguard').length;
                    const maxBodyguards = 1 + (g.research.bodyguardSlots || 0);
                    if (c.assignment === 'bodyguard' || bodyguardCount < maxBodyguards) {
                        html += `<option value="bodyguard" ${c.assignment === 'bodyguard' ? 'selected' : ''}>Bodyguard (${bodyguardCount}/${maxBodyguards})</option>`;
                    }
                    const maxW = Buildings.getMaxWorkersPerBuilding(g.research);
                    for (const b of g.buildings) {
                        const def = BUILDING_DEFS[b.type];
                        if (def.isHQ || def.isWall || def.isGate) continue;
                        if (!def.produces && !def.isResearch && !def.isWorkbench && !def.isStorage) continue;
                        const isAssignedHere = c.assignment == b.id; // loose compare for string/number
                        const isFull = b.workers.length >= maxW && !isAssignedHere;
                        if (isFull) continue;
                        const selected = isAssignedHere ? 'selected' : '';
                        html += `<option value="${b.id}" ${selected}>${def.name} (${b.workers.length}/${maxW})</option>`;
                    }
                    html += `</select>`;
                    html += `</div>`;
                    // Sacrifice button
                    html += `<button class="cc-sacrifice" onclick="game.sacrificeCritter(${c.id})">🩸 Sacrifice</button>`;
                    html += `</div>`;
                }
            }
            body.innerHTML = html;

        } else if (this.activeTab === 'research') {
            let html = '';
            const researchSpeed = Buildings.getResearchSpeed(g.buildings, g.critters);
            if (researchSpeed <= 0) {
                html = '<div class="panel-empty">Build a Research Lab and assign INT critters to start researching!</div>';
            } else {
                html += `<div class="panel-section-label">Research Speed: ${researchSpeed.toFixed(2)}/s</div>`;

                // In-progress research
                if (g.researchInProgress) {
                    const rd = RESEARCH_DEFS[g.researchInProgress.id];
                    const pct = Math.min(100, (g.researchInProgress.progress / rd.time) * 100);
                    html += `<div class="research-progress">`;
                    html += `<span class="rp-name">${rd.name}</span>`;
                    html += `<div class="rp-bar"><div class="rp-fill" style="width:${pct}%"></div></div>`;
                    html += `<span class="rp-pct">${Math.floor(pct)}%</span>`;
                    html += `</div>`;
                }

                html += '<div class="panel-section-label" style="margin-top:8px">Available Research</div>';
                for (const [id, rd] of Object.entries(RESEARCH_DEFS)) {
                    const level = g.research[id] || 0;
                    if (level >= rd.maxLevel) {
                        html += `<div class="research-item done"><span class="ri-name">${rd.name}</span><span class="ri-max">MAX</span></div>`;
                        continue;
                    }
                    const cost = rd.cost(level);
                    const costStr = Object.entries(cost).filter(([,v]) => v > 0).map(([k,v]) => `${v} ${k}`).join(', ');
                    const canAfford = Object.entries(cost).every(([k,v]) => (g.resources[k]||0) >= v);
                    const inProgress = g.researchInProgress?.id === id;
                    html += `<div class="research-item ${!canAfford && !inProgress ? 'disabled' : ''} ${inProgress ? 'active' : ''}">`;
                    html += `<span class="ri-name">${rd.name} (${level}/${rd.maxLevel})</span>`;
                    html += `<span class="ri-desc">${rd.desc}</span>`;
                    html += `<span class="ri-cost">${costStr}</span>`;
                    if (!inProgress && !g.researchInProgress) {
                        html += `<button class="ri-btn" onclick="game.startResearch('${id}')" ${!canAfford ? 'disabled' : ''}>Research</button>`;
                    }
                    html += `</div>`;
                }
            }
            body.innerHTML = html;

        } else if (this.activeTab === 'manage') {
            let html = '';
            const maxW = Buildings.getMaxWorkersPerBuilding(g.research);

            if (g.buildings.length === 0) {
                html = '<div class="panel-empty">No buildings yet. Build some first!</div>';
            } else {
                for (const b of g.buildings) {
                    const def = BUILDING_DEFS[b.type];
                    if (def.turret || def.expander || def.capacity) continue; // skip turrets, expanders, nests

                    html += `<div class="manage-building">`;
                    html += `<div class="mb-header">`;
                    html += `<span class="mb-icon" style="background:${def.color}">${def.letter}</span>`;
                    html += `<span class="mb-name">${def.name}</span>`;
                    html += `<span class="mb-cap">${b.workers.length}/${maxW}</span>`;
                    html += `</div>`;

                    // Worker slots
                    html += `<div class="mb-workers">`;
                    for (let i = 0; i < maxW; i++) {
                        if (i < b.workers.length) {
                            const c = g.critters.find(cr => cr.id === b.workers[i]);
                            if (c) {
                                const sp = SPECIES[c.species];
                                html += `<div class="mb-worker" onclick="game.unassignFromManage(${c.id})">`;
                                html += UI._critterIconHtml(c.species);
                                html += `<span class="mb-worker-name">${c.nickname}</span>`;
                                html += `<span class="mb-worker-lv">Lv${c.level}</span>`;
                                if (def.statKey) html += `<span class="mb-worker-stat">${def.statKey}:${c.stats[def.statKey]||0}</span>`;
                                html += `</div>`;
                            }
                        } else {
                            // Empty slot — show dropdown to assign idle critter
                            const idle = g.critters.filter(cr => !cr.assignment && !cr.injured);
                            if (idle.length > 0) {
                                html += `<div class="mb-worker mb-empty-assign">`;
                                html += `<select class="mb-assign-select" onchange="game.assignCritter(parseInt(this.value), '${b.id}')">`;
                                html += `<option value="">+ Assign critter...</option>`;
                                for (const ic of idle) {
                                    const isp = SPECIES[ic.species];
                                    const statVal = def.statKey ? ` (${def.statKey}:${ic.stats[def.statKey]||0})` : '';
                                    html += `<option value="${ic.id}">${ic.nickname} Lv${ic.level}${statVal}</option>`;
                                }
                                html += `</select>`;
                                html += `</div>`;
                            } else {
                                html += `<div class="mb-worker mb-empty">`;
                                html += `<div class="mb-worker-icon mb-empty-icon">+</div>`;
                                html += `<span class="mb-worker-name">No idle critters</span>`;
                                html += `</div>`;
                            }
                        }
                    }
                    html += `</div>`;

                    // Production info
                    if (def.produces && b.workers.length > 0) {
                        const rate = Buildings.getProductionRate(b, g.critters, g.hungry);
                        html += `<div class="mb-prod">+${rate.toFixed(2)}/s ${def.produces}${g.hungry ? ' (hungry -50%)' : ''}</div>`;
                    }
                    if (def.isWorkbench && b.workers.length > 0) {
                        const ct = Buildings.getCraftTime(b, g.critters);
                        html += `<div class="mb-prod">${ct.toFixed(1)}s/trap${b.craftQueue > 0 ? ` | ${b.craftQueue} queued` : ''}</div>`;
                    }
                    if (def.isResearch && b.workers.length > 0) {
                        const speed = Buildings.getResearchSpeed([b], g.critters);
                        html += `<div class="mb-prod">Research: ${speed.toFixed(2)}/s</div>`;
                    }

                    html += `</div>`;
                }

                // Critter lists
                const injured = g.critters.filter(c => c.injured);
                const idle = g.critters.filter(c => !c.assignment && !c.injured);
                const patrolling = g.critters.filter(c => c.assignment === 'patrol');

                if (patrolling.length > 0) {
                    html += `<div class="panel-section-label" style="margin-top:10px">On Patrol (${patrolling.length})</div>`;
                    html += `<div class="mb-idle-list">`;
                    for (const c of patrolling) {
                        const sp = SPECIES[c.species];
                        html += `<div class="mb-idle-critter">`;
                        html += UI._critterIconHtml(c.species);
                        html += `<span>${c.nickname} Lv${c.level}</span>`;
                        html += `</div>`;
                    }
                    html += `</div>`;
                }

                if (idle.length > 0) {
                    html += `<div class="panel-section-label" style="margin-top:10px">Idle (${idle.length})</div>`;
                    html += `<div class="mb-idle-list">`;
                    for (const c of idle) {
                        html += `<div class="mb-idle-critter">`;
                        html += UI._critterIconHtml(c.species);
                        html += `<span>${c.nickname} Lv${c.level}</span>`;
                        html += `</div>`;
                    }
                    html += `</div>`;
                }

                if (injured.length > 0) {
                    html += `<div class="panel-section-label" style="margin-top:10px;color:#f87171">Injured (${injured.length})</div>`;
                    html += `<div class="mb-idle-list">`;
                    for (const c of injured) {
                        const mins = Math.ceil((c.injuredTimer || 0) / 60);
                        html += `<div class="mb-idle-critter mb-injured">`;
                        html += UI._critterIconHtml(c.species);
                        html += `<span>${c.nickname} Lv${c.level}</span>`;
                        html += `<span class="mb-injury-time">🩹 ${mins}m</span>`;
                        html += `</div>`;
                    }
                    html += `</div>`;
                }
            }
            body.innerHTML = html;
        }
    }

    static renderWaypointMenu(ctx, game, canvasW, canvasH) {
        if (!this.showWaypointMenu) return;
        const waypoints = game.world.waypoints.filter(w => w.claimed);

        const menuW = 260;
        const menuH = Math.min(40 + waypoints.length * 36, canvasH - 80);
        const mx = (canvasW - menuW) / 2;
        const my = (canvasH - menuH) / 2;

        ctx.fillStyle = 'rgba(10,10,30,0.92)';
        ctx.fillRect(mx, my, menuW, menuH);
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(mx, my, menuW, menuH);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Waypoints (T to close)', mx + menuW / 2, my + 22);

        // Store clickable areas for game.js to handle
        game._waypointButtons = [];
        for (let i = 0; i < waypoints.length; i++) {
            const wp = waypoints[i];
            const by = my + 36 + i * 36;
            const bx = mx + 10;

            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.fillRect(bx, by, menuW - 20, 30);

            ctx.fillStyle = '#66bb6a';
            ctx.font = '12px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(wp.name, bx + 8, by + 14);

            ctx.fillStyle = '#888';
            ctx.font = '9px monospace';
            ctx.fillText(`(${wp.x}, ${wp.y})`, bx + 8, by + 24);

            // Teleport button
            ctx.fillStyle = 'rgba(102,187,106,0.2)';
            ctx.fillRect(bx + menuW - 80, by + 4, 52, 22);
            ctx.fillStyle = '#66bb6a';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('GO', bx + menuW - 54, by + 18);

            game._waypointButtons.push({ x: bx + menuW - 80, y: by + 4, w: 52, h: 22, wp });
        }
    }

    static notify(text, duration = 3000) {
        const n = { text, timer: duration / 1000, opacity: 1 };
        this.notifications.push(n);
    }

    static updateNotifications(dt) {
        for (let i = this.notifications.length - 1; i >= 0; i--) {
            const n = this.notifications[i];
            n.timer -= dt;
            if (n.timer < 0.5) n.opacity = Math.max(0, n.timer / 0.5);
            if (n.timer <= 0) this.notifications.splice(i, 1);
        }
    }

    static renderNotifications(ctx, canvasW) {
        ctx.textAlign = 'center';
        for (let i = 0; i < this.notifications.length; i++) {
            const n = this.notifications[i];
            const y = 80 + i * 30;
            ctx.globalAlpha = n.opacity;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.font = 'bold 13px monospace';
            const tw = ctx.measureText(n.text).width;
            ctx.fillRect(canvasW / 2 - tw / 2 - 12, y - 12, tw + 24, 24);
            ctx.fillStyle = '#fff';
            ctx.fillText(n.text, canvasW / 2, y + 4);
        }
        ctx.globalAlpha = 1;
    }
}
