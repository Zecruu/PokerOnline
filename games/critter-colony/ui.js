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
    // Companion & passive
    companionSlots:{ name: 'Companion Bond',   desc: '+1 companion slot (max 4)',       maxLevel: 3, cost: (l) => ({ wood: 40*(l+1), stone: 30*(l+1), food: 30*(l+1) }), time: 40 },
    passiveLab:   { name: 'Passive Lab',       desc: 'Unlocks Passive Lab (transfer passives)', maxLevel: 1, cost: (l) => ({ wood: 60, stone: 60, gold: 5 }), time: 50 },
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
        this.showBuildMenu = false;
    }

    static switchTab(tab) {
        this.activeTab = tab;
        document.querySelectorAll('.bm-tab').forEach(t => t.classList.remove('active'));
        const el = document.querySelector(`.bm-tab[data-tab="${tab}"]`);
        if (el) el.classList.add('active');
        this.updatePanel();
    }

    static toggleBuildMenu() {
        this.showBuildMenu = !this.showBuildMenu;
        const modal = document.getElementById('buildModal');
        if (modal) {
            if (this.showBuildMenu) { modal.classList.remove('hidden'); this.updatePanel(); }
            else modal.classList.add('hidden');
        }
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
        const body = document.getElementById('buildModalBody');
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
            let html = '<div class="build-grid">';
            for (const [type, def] of Object.entries(BUILDING_DEFS)) {
                if (def.unbuildable) continue;
                const canAfford = Buildings.canAfford(type, g.resources);
                const isLocked = def.researchReq && !(g.research[def.researchReq] > 0);
                const costStr = Object.entries(def.cost).filter(([,v]) => v > 0).map(([k,v]) => `${v} ${k}`).join(', ');
                const bSprite = typeof BUILDING_SPRITES !== 'undefined' && BUILDING_SPRITES[type] && BUILDING_SPRITES[type].complete && BUILDING_SPRITES[type].naturalWidth > 0
                    ? BUILDING_SPRITES[type] : null;

                const classes = isLocked ? 'build-item locked disabled' : canAfford ? 'build-item' : 'build-item disabled';
                const onclick = isLocked ? '' : `onclick="game.startPlacement('${type}')"`;
                html += `<div class="${classes}" ${onclick}>`;
                html += `<div class="build-header">`;
                if (bSprite) {
                    html += `<img class="build-icon" src="${bSprite.src}">`;
                } else {
                    html += `<div class="build-icon build-icon-fallback" style="background:${def.color}">${def.letter}</div>`;
                }
                html += `<div class="build-header-text">`;
                html += `<span class="build-name">${def.name}</span>`;
                if (isLocked) {
                    const rd = RESEARCH_DEFS[def.researchReq];
                    html += `<span class="build-locked-text">Requires: ${rd ? rd.name : def.researchReq}</span>`;
                } else {
                    html += `<span class="build-cost">${costStr || 'Free'}</span>`;
                }
                html += `</div>`;
                html += `</div>`;
                if (!isLocked) {
                    if (def.produces) html += `<span class="build-desc">Produces ${def.produces}</span>`;
                    else if (def.capacity) html += `<span class="build-desc">+${def.capacity} critter capacity</span>`;
                    else if (def.turret) html += `<span class="build-desc">Auto-attacks enemies</span>`;
                    else if (def.expander) html += `<span class="build-desc">Expands colony zone</span>`;
                    else if (def.isResearch) html += `<span class="build-desc">Research new tech</span>`;
                    else if (def.isWorkbench) html += `<span class="build-desc">Craft traps & ammo</span>`;
                    else if (def.isGenerator) html += `<span class="build-desc">Powers nearby extractors</span>`;
                    else if (def.isExtractor) html += `<span class="build-desc">Place on ${NODE_INFO[def.nodeType]?.name || 'node'}</span>`;
                    else if (def.isStorage) html += `<span class="build-desc">+150 resource cap</span>`;
                    else if (def.isPassiveLab) html += `<span class="build-desc">Transfer passives</span>`;
                    else if (def.isHealer) html += `<span class="build-desc">Auto-heal injured</span>`;
                    else if (def.isBarracks) html += `<span class="build-desc">+30% patrol damage</span>`;
                }
                html += `</div>`;
            }
            html += '</div>'; // close build-grid

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
            this._buildingsRendered = false;
            let html = '';
            if (g.critters.length === 0) {
                html = '<div class="panel-empty">No critters captured yet.<br>Explore and press E near wild critters!</div>';
            } else {
                const mergeSel = g._mergeSelection;
                const mergeSrc = mergeSel ? g.critters.find(cr => cr.id === mergeSel.sourceId) : null;
                const pickedIds = mergeSel ? mergeSel.pickedIds : [];
                if (mergeSrc) {
                    const picked = pickedIds.length;
                    html += `<div class="cc-merge-banner">Merging <b>${mergeSrc.nickname}</b> (${mergeSrc.stars||0}★) — pick ${2 - picked} more identical pal${2 - picked === 1 ? '' : 's'} (${1 + picked}/3) <button onclick="game.cancelMerge()">Cancel</button></div>`;
                }
                for (const c of g.critters) {
                    const sp = SPECIES[c.species];
                    const critterImg = typeof CRITTER_SPRITES !== 'undefined' && CRITTER_SPRITES[c.species] && CRITTER_SPRITES[c.species].complete
                        ? `<img class="cc-icon" src="${CRITTER_SPRITES[c.species].src}">` : `<span class="cc-dot" style="background:${sp.color}"></span>`;
                    const maxLv = typeof Critters !== 'undefined' ? Critters.MAX_LEVEL : 20;
                    const typeInfo = typeof CRITTER_TYPES !== 'undefined' ? CRITTER_TYPES[sp.type] : null;
                    const stars = c.stars || 0;
                    const starsHtml = stars > 0 ? `<span class="cc-stars">${'★'.repeat(stars)}</span>` : '';
                    // Merge selection state
                    let mergeClass = '', mergeClick = '';
                    if (mergeSrc) {
                        if (c.id === mergeSrc.id) mergeClass = ' cc-merge-src';
                        else if (pickedIds.includes(c.id)) {
                            mergeClass = ' cc-merge-picked';
                            mergeClick = ` onclick="game.pickMergeTarget(${c.id})"`;
                        } else if (c.species === mergeSrc.species && (c.stars||0) === (mergeSrc.stars||0)) {
                            mergeClass = ' cc-merge-eligible';
                            mergeClick = ` onclick="game.pickMergeTarget(${c.id})"`;
                        } else {
                            mergeClass = ' cc-merge-disabled';
                        }
                    }

                    // Assignment status
                    let statusText = 'Idle', statusColor = '#888';
                    if (c.assignment === 'patrol') { statusText = '🛡️ Patrol'; statusColor = '#4ade80'; }
                    else if (c.assignment === 'companion') { statusText = '💫 Companion'; statusColor = '#fbbf24'; }
                    else if (c.assignment === 'bodyguard') { statusText = '⚔️ Bodyguard'; statusColor = '#4FC3F7'; }
                    else if (c.assignment) {
                        const bld = g.buildings.find(b => b.id == c.assignment);
                        if (bld) { statusText = `⚙️ ${BUILDING_DEFS[bld.type].name}`; statusColor = '#4ade80'; }
                    }

                    html += `<div class="critter-card${c.injured ? ' cc-card-injured' : ''}${mergeClass}"${mergeClick}>`;

                    // Top row: icon + name + level + type + rarity
                    html += `<div class="cc-top">`;
                    html += critterImg;
                    html += `<div class="cc-top-info">`;
                    html += `<div class="cc-name-row">`;
                    html += `<span class="cc-name" onclick="event.stopPropagation(); game.renameCritter(${c.id})" title="Click to rename">${c.nickname}</span>`;
                    if (starsHtml) html += starsHtml;
                    html += `<span class="cc-level">Lv.${c.level}${c.level >= maxLv ? ' MAX' : ''}</span>`;
                    html += `</div>`;
                    html += `<div class="cc-meta-row">`;
                    html += `<span class="cc-rarity" style="color:${RARITY_COLORS[sp.rarity]}">${sp.rarity}</span>`;
                    if (typeInfo) html += `<span class="cc-type" style="color:${typeInfo.color}">${typeInfo.icon} ${typeInfo.name}</span>`;
                    html += `<span class="cc-status" style="color:${statusColor}">${statusText}</span>`;
                    html += `</div>`;
                    html += `</div></div>`;

                    if (c.injured) {
                        const mins = Math.ceil((c.injuredTimer || 0) / 60);
                        html += `<div class="cc-injured">🩹 Injured — ${mins}m recovery</div>`;
                    }

                    // XP bar
                    if (c.level < maxLv) {
                        const xpNeeded = typeof Critters !== 'undefined' ? Critters.getXpForLevel(c.level) : 50;
                        const xpPct = Math.min(100, (c.xp / xpNeeded) * 100);
                        html += `<div class="cc-xp"><div class="cc-xp-bar" style="width:${xpPct}%"></div><span class="cc-xp-text">${c.xp}/${xpNeeded} XP</span></div>`;
                    } else {
                        html += `<div class="cc-xp cc-xp-max"><span class="cc-xp-text">MAX LEVEL</span></div>`;
                    }

                    // Stats row
                    html += `<div class="cc-stats">`;
                    for (const [key, val] of Object.entries(c.stats)) {
                        const iconImg = typeof STAT_ICONS !== 'undefined' && STAT_ICONS[key.toLowerCase()] && STAT_ICONS[key.toLowerCase()].complete
                            ? `<img class="cc-stat-icon" src="${STAT_ICONS[key.toLowerCase()].src}">` : '';
                        html += `<span class="cc-stat">${iconImg}${key}:${val}</span>`;
                    }
                    html += `</div>`;

                    // PASSIVES — prominent section with full descriptions
                    if (c.passives && c.passives.length > 0) {
                        html += `<div class="cc-passives-section">`;
                        html += `<div class="cc-passives-label">Passives</div>`;
                        for (const pid of c.passives) {
                            const p = typeof PASSIVES !== 'undefined' ? PASSIVES[pid] : null;
                            if (!p) continue;
                            const pColor = RARITY_COLORS[p.rarity] || '#aaa';
                            html += `<div class="cc-passive-full ${p.negative ? 'cc-passive-neg' : ''}">`;
                            html += `<span class="cc-pf-icon">${p.icon}</span>`;
                            html += `<div class="cc-pf-info">`;
                            html += `<span class="cc-pf-name" style="color:${pColor}">${p.name}</span>`;
                            html += `<span class="cc-pf-desc">${p.desc}</span>`;
                            html += `</div></div>`;
                        }
                        html += `</div>`;
                    } else {
                        html += `<div class="cc-no-passives">No passives</div>`;
                    }

                    // Patrol HP
                    if ((c.assignment === 'patrol' || c.assignment === 'bodyguard') && c.patrolHp !== undefined) {
                        const php = Math.floor(c.patrolHp), pmhp = c.patrolMaxHp || 50;
                        const hpPct = Math.min(100, (php / pmhp) * 100);
                        html += `<div class="cc-patrol-hp-bar"><div class="cc-php-fill" style="width:${hpPct}%"></div><span>❤️ ${php}/${pmhp}</span></div>`;
                    }

                    // Hunger bar (for assigned critters)
                    if (c.assignment) {
                        const hungerPct = g.hungry ? 0 : 100;
                        const hungerColor = g.hungry ? '#f87171' : '#4ade80';
                        html += `<div class="cc-hunger-bar"><div class="cc-hunger-fill" style="width:${hungerPct}%;background:${hungerColor}"></div><span>${g.hungry ? '🍖 Starving!' : '🍖 Fed'}</span></div>`;
                    }

                    // Assignment + type match info
                    if (c.assignment && c.assignment !== 'patrol' && c.assignment !== 'companion' && c.assignment !== 'bodyguard') {
                        const bld = g.buildings.find(b => b.id == c.assignment);
                        if (bld) {
                            const def = BUILDING_DEFS[bld.type];
                            const tBonus = typeof Critters !== 'undefined' ? Critters.getTypeBonus(c, bld.type) : 0;
                            if (tBonus > 0) html += `<div class="cc-bonus cc-type-match">✅ Type match! +${(tBonus*100).toFixed(0)}%</div>`;
                            else if (tBonus < 0) html += `<div class="cc-bonus cc-type-mismatch">⚠️ Wrong type ${(tBonus*100).toFixed(0)}%</div>`;
                        }
                    }

                    // Role dropdown
                    html += `<div class="cc-assign">`;
                    html += `<select onchange="game.assignCritter(${c.id}, this.value)">`;
                    html += `<option value="" ${!c.assignment ? 'selected' : ''}>Idle</option>`;
                    html += `<option value="patrol" ${c.assignment === 'patrol' ? 'selected' : ''}>🛡️ Patrol</option>`;
                    const companionCount = g.critters.filter(cr => cr.assignment === 'companion').length;
                    const maxCompanions = 1 + (g.research.companionSlots || 0);
                    if (c.assignment === 'companion' || companionCount < maxCompanions) {
                        html += `<option value="companion" ${c.assignment === 'companion' ? 'selected' : ''}>💫 Companion (${companionCount}/${maxCompanions})</option>`;
                    }
                    const bodyguardCount = g.critters.filter(cr => cr.assignment === 'bodyguard').length;
                    const maxBodyguards = 1 + (g.research.bodyguardSlots || 0);
                    if (c.assignment === 'bodyguard' || bodyguardCount < maxBodyguards) {
                        html += `<option value="bodyguard" ${c.assignment === 'bodyguard' ? 'selected' : ''}>Bodyguard (${bodyguardCount}/${maxBodyguards})</option>`;
                    }
                    html += `</select>`;
                    html += `<span class="cc-assign-hint">Assign to buildings in Manage tab</span>`;
                    html += `</div>`;
                    // Merge + Sacrifice buttons
                    html += `<div class="cc-actions">`;
                    if (stars < 5) {
                        html += `<button class="cc-merge" onclick="event.stopPropagation(); game.startMerge(${c.id})">⭐ Merge</button>`;
                    }
                    html += `<button class="cc-sacrifice" onclick="event.stopPropagation(); game.sacrificeCritter(${c.id})">🩸 Sacrifice</button>`;
                    html += `</div>`;
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
                // Research speed + in-progress bar
                html += `<div class="tt-header">`;
                html += `<span class="tt-speed">Research Speed: <b>${researchSpeed.toFixed(2)}/s</b></span>`;
                if (g.researchInProgress) {
                    const rd = RESEARCH_DEFS[g.researchInProgress.id];
                    const pct = Math.min(100, (g.researchInProgress.progress / rd.time) * 100);
                    html += `<div class="tt-prog">`;
                    html += `<span class="tt-prog-name">${rd.name}</span>`;
                    html += `<div class="tt-prog-bar"><div class="tt-prog-fill" style="width:${pct}%"></div></div>`;
                    html += `<span class="tt-prog-pct">${Math.floor(pct)}%</span>`;
                    html += `</div>`;
                }
                html += `</div>`;

                // ─── TECH TREE BRANCHES ──────────────────────
                const branches = [
                    { name: 'Combat', icon: '⚔️', color: '#f87171', rows: [
                        ['gunDamage'],
                        ['turretDamage', 'turretRange'],
                        ['baseTurret', 'barracks'],
                    ]},
                    { name: 'Economy', icon: '🏗️', color: '#4ade80', rows: [
                        ['storageCap', 'storageBuilding'],
                        ['smelting', 'greenhouse'],
                        ['gasRefining', 'generators'],
                        ['colonyRadius', 'afkCap'],
                    ]},
                    { name: 'Capture', icon: '🎯', color: '#4fc3f7', rows: [
                        ['captureBonus', 'critterCap'],
                        ['ironSnare', 'workersPerB'],
                        ['goldSnare', 'companionSlots'],
                        ['diamondSnare', 'bodyguardSlots'],
                        ['passiveLab'],
                    ]},
                    { name: 'Extraction', icon: '⛏️', color: '#ce93d8', rows: [
                        ['oilDrilling', 'crystalExtract'],
                        ['goldMining', 'refinery'],
                        ['diamondDrill'],
                    ]},
                    { name: 'Defense', icon: '🛡️', color: '#fbbf24', rows: [
                        ['baseHp'],
                        ['healingHut'],
                    ]},
                ];

                html += `<div class="tt-tree">`;
                for (const branch of branches) {
                    // Count completions for branch progress
                    let branchTotal = 0, branchDone = 0;
                    for (const row of branch.rows) {
                        for (const id of row) {
                            const rd = RESEARCH_DEFS[id]; if (!rd) continue;
                            branchTotal += rd.maxLevel;
                            branchDone += Math.min(g.research[id] || 0, rd.maxLevel);
                        }
                    }
                    const branchPct = branchTotal > 0 ? Math.floor((branchDone / branchTotal) * 100) : 0;

                    html += `<div class="tt-branch" style="--branch-color:${branch.color}">`;
                    html += `<div class="tt-branch-head">`;
                    html += `<span class="tt-branch-icon">${branch.icon}</span>`;
                    html += `<span class="tt-branch-name">${branch.name}</span>`;
                    html += `<span class="tt-branch-pct">${branchPct}%</span>`;
                    html += `<div class="tt-branch-bar"><div class="tt-branch-fill" style="width:${branchPct}%"></div></div>`;
                    html += `</div>`;

                    for (let ri = 0; ri < branch.rows.length; ri++) {
                        const row = branch.rows[ri];
                        // Connector line between rows
                        if (ri > 0) html += `<div class="tt-connector" style="border-color:${branch.color}40"></div>`;
                        html += `<div class="tt-row">`;
                        for (const id of row) {
                            const rd = RESEARCH_DEFS[id];
                            if (!rd) continue;
                            const level = g.research[id] || 0;
                            const maxed = level >= rd.maxLevel;
                            const inProg = g.researchInProgress?.id === id;
                            const cost = maxed ? null : rd.cost(level);
                            const canAfford = cost ? Object.entries(cost).every(([k,v]) => (g.resources[k]||0) >= v) : false;
                            const canClick = !maxed && !inProg && !g.researchInProgress && canAfford;

                            let stateClass = 'tt-locked';
                            if (maxed) stateClass = 'tt-done';
                            else if (inProg) stateClass = 'tt-active';
                            else if (canAfford) stateClass = 'tt-available';

                            // Level pips
                            let pipsHtml = '';
                            if (rd.maxLevel > 1) {
                                pipsHtml = `<div class="tt-pips">`;
                                for (let p = 0; p < rd.maxLevel; p++) {
                                    pipsHtml += `<span class="tt-pip${p < level ? ' tt-pip-on' : ''}"></span>`;
                                }
                                pipsHtml += `</div>`;
                            }

                            html += `<div class="tt-node ${stateClass}" ${canClick ? `onclick="game.startResearch('${id}')"` : ''}>`;
                            html += `<div class="tt-node-name">${rd.name}</div>`;
                            html += `<div class="tt-node-desc">${rd.desc}</div>`;
                            if (rd.maxLevel > 1) {
                                html += `<div class="tt-node-level">${level}/${rd.maxLevel}</div>`;
                                html += pipsHtml;
                            } else {
                                html += `<div class="tt-node-level">${maxed ? '✓' : '○'}</div>`;
                            }
                            if (cost) {
                                const costBits = Object.entries(cost).filter(([,v]) => v > 0).map(([k,v]) => {
                                    const have = Math.floor(g.resources[k] || 0);
                                    return `<span class="${have >= v ? 'tt-cost-ok' : 'tt-cost-need'}">${v} ${k}</span>`;
                                }).join(' ');
                                html += `<div class="tt-node-cost">${costBits}</div>`;
                            }
                            if (inProg) {
                                const pct = Math.min(100, (g.researchInProgress.progress / rd.time) * 100);
                                html += `<div class="tt-node-bar"><div class="tt-node-fill" style="width:${pct}%"></div></div>`;
                            }
                            html += `</div>`;
                        }
                        html += `</div>`;
                    }
                    html += `</div>`;
                }
                html += `</div>`;
            }
            body.innerHTML = html;

        } else if (this.activeTab === 'workbench') {
            let html = '';
            // Find nearest workbench
            const wb = g.buildings.find(b => BUILDING_DEFS[b.type].isWorkbench);
            const isNear = wb && g._isNearWorkbench ? g._isNearWorkbench(wb.id) : false;

            if (!wb) {
                html = '<div class="panel-empty">No Workbench built yet!<br>Build one from the Buildings tab.</div>';
            } else if (!isNear) {
                html = '<div class="panel-empty">⚠️ Walk near your Workbench to craft!<br><br>Workbench must be within range to use.</div>';
            } else {
                const ct = Buildings.getCraftTime(wb, g.critters);
                const crafting = (wb.workers.length > 0 && (wb.craftQueue > 0 || wb.ammoQueue > 0)) || wb._manualCrafting;
                const pct = crafting ? Math.min(100, ((wb.craftProgress || 0) / ct) * 100) : 0;

                html += `<div class="wb-panel">`;
                html += `<div class="wb-speed-info">Craft speed: ${ct.toFixed(1)}s per item (${wb.workers.length} workers)</div>`;

                if (crafting) {
                    const label = wb.activeRecipe === 'ammo' ? 'Bullets' : wb.activeRecipe === 'iron_snare' ? 'Iron Snare' : wb.activeRecipe === 'gold_snare' ? 'Gold Snare' : wb.activeRecipe === 'diamond_snare' ? 'Diamond Snare' : 'Trap';
                    html += `<div class="wb-progress"><div class="wb-prog-bar"><div class="wb-prog-fill" style="width:${pct}%"></div></div>`;
                    html += `<span class="wb-prog-text">Crafting ${label}... ${Math.floor(pct)}%</span></div>`;
                }

                // Recipes
                const recipes = [
                    { id: 'trap', name: 'Rope Snare', desc: 'Catches common critters', cost: {wood:5,stone:3}, icon: '🪤', result: 'traps', qty: 1 },
                    { id: 'ammo', name: 'Bullets x5', desc: 'Ammo for tamer gun', cost: {iron:2,stone:1}, icon: '💥', result: 'ammo', qty: 5 },
                    { id: 'iron_snare', name: 'Iron Snare', desc: 'Catches uncommon critters', cost: {wood:5,iron:3}, icon: '⛓️', result: 'iron_snare', qty: 1, req: 'ironSnare' },
                    { id: 'gold_snare', name: 'Gold Snare', desc: 'Catches rare critters', cost: {iron:3,gold:2}, icon: '✨', result: 'gold_snare', qty: 1, req: 'goldSnare' },
                    { id: 'diamond_snare', name: 'Diamond Snare', desc: 'Catches legendary critters', cost: {gold:2,diamond:1}, icon: '💎', result: 'diamond_snare', qty: 1, req: 'diamondSnare' },
                ];

                for (const r of recipes) {
                    if (r.req && !(g.research[r.req] > 0)) {
                        html += `<div class="wb-recipe wb-recipe-locked">`;
                        html += `<div class="wb-recipe-icon">${r.icon}</div>`;
                        html += `<div class="wb-recipe-info"><div class="wb-recipe-name">${r.name} 🔒</div>`;
                        html += `<div class="wb-recipe-desc">Requires: ${RESEARCH_DEFS[r.req]?.name || r.req}</div></div></div>`;
                        continue;
                    }
                    const canCraft = Object.entries(r.cost).every(([k,v]) => (g.resources[k]||0) >= v);
                    const costStr = Object.entries(r.cost).map(([k,v]) => `${v} ${k}`).join(' + ');
                    const owned = g.inventory[r.result] || 0;

                    html += `<div class="wb-recipe">`;
                    html += `<div class="wb-recipe-icon">${r.icon}</div>`;
                    html += `<div class="wb-recipe-info">`;
                    html += `<div class="wb-recipe-name">${r.name} <span style="color:#888;font-size:.7rem">(owned: ${owned})</span></div>`;
                    html += `<div class="wb-recipe-desc">${r.desc}</div>`;
                    html += `<div class="wb-recipe-cost">${costStr} → ${r.icon}x${r.qty}</div>`;
                    html += `</div>`;
                    html += `<div class="wb-recipe-btns">`;
                    html += `<button class="wb-craft-sm" onclick="game.manualCraft(${wb.id},'${r.id}')" ${canCraft?'':'disabled'}>x1</button>`;
                    html += `<button class="wb-craft-sm" onclick="game.queueCraft(${wb.id},5,'${r.id}')" ${canCraft?'':'disabled'}>+5</button>`;
                    html += `<button class="wb-craft-sm" onclick="game.queueCraft(${wb.id},20,'${r.id}')" ${canCraft?'':'disabled'}>+20</button>`;
                    html += `</div></div>`;
                }
                html += `</div>`;
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
                    if (def.turret || def.expander || def.capacity || def.isHQ || def.isWall || def.isGate || def.isGenerator) continue;

                    // Find best critter type for this building
                    let bestType = null;
                    if (typeof CRITTER_TYPES !== 'undefined') {
                        for (const [tKey, tInfo] of Object.entries(CRITTER_TYPES)) {
                            if (tInfo.buildings.includes(b.type)) { bestType = tInfo; break; }
                        }
                    }

                    html += `<div class="manage-building">`;
                    html += `<div class="mb-header">`;
                    html += `<span class="mb-icon" style="background:${def.color}">${def.letter}</span>`;
                    html += `<span class="mb-name">${def.name}</span>`;
                    if (bestType) html += `<span class="mb-best-type" style="color:${bestType.color}">${bestType.icon} ${bestType.name}</span>`;
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
                                    const typeInfo = typeof CRITTER_TYPES !== 'undefined' ? CRITTER_TYPES[isp.type] : null;
                                    const typeTag = typeInfo ? `${typeInfo.icon}${typeInfo.name}` : '';
                                    const statVal = def.statKey ? ` ${def.statKey}:${ic.stats[def.statKey]||0}` : '';
                                    const tBonus = typeof Critters !== 'undefined' ? Critters.getTypeBonus(ic, b.type) : 0;
                                    const matchTag = tBonus > 0 ? ' ✅' : tBonus < 0 ? ' ⚠️' : '';
                                    html += `<option value="${ic.id}">${ic.nickname} Lv${ic.level} [${typeTag}]${statVal}${matchTag}</option>`;
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

        } else if (this.activeTab === 'equip') {
            let html = '';
            html += `<div class="eq-panel">`;

            // GUN section
            const gt = GUN_TIERS[g.gunTier] || GUN_TIERS[1];
            const nextGun = g.gunTier < 5 ? GUN_TIERS[g.gunTier + 1] : null;
            html += `<div class="eq-section">`;
            html += `<div class="eq-header">🔫 Gun</div>`;
            html += `<div class="eq-current">`;
            html += `<span class="eq-tier-badge eq-t${g.gunTier}">T${g.gunTier}</span>`;
            html += `<span class="eq-name">${gt.name}</span>`;
            html += `</div>`;
            html += `<div class="eq-desc">${gt.desc}</div>`;
            html += `<div class="eq-stats">`;
            html += `<span>Damage: <b>${gt.dmgMul}x</b></span>`;
            html += `<span>Fire rate: <b>${gt.cooldown}s</b></span>`;
            html += `</div>`;
            if (nextGun) {
                const costStr = Object.entries(nextGun.cost).map(([k,v]) => {
                    const have = Math.floor(g.resources[k] || 0);
                    const ok = have >= v;
                    return `<span class="${ok ? 'eq-cost-ok' : 'eq-cost-need'}">${v} ${k} (${have})</span>`;
                }).join(' + ');
                const canUpgrade = Object.entries(nextGun.cost).every(([k,v]) => (g.resources[k]||0) >= v);
                html += `<div class="eq-upgrade">`;
                html += `<div class="eq-next-name">⬆ <span class="eq-tier-badge eq-t${nextGun.tier}">T${nextGun.tier}</span> ${nextGun.name} — ${nextGun.dmgMul}x dmg, ${nextGun.cooldown}s</div>`;
                html += `<div class="eq-cost">${costStr}</div>`;
                html += `<button class="eq-btn" onclick="game.upgradeGun()" ${canUpgrade ? '' : 'disabled'}>Upgrade Gun</button>`;
                html += `</div>`;
            } else {
                html += `<div class="eq-maxed">★ MAX TIER ★</div>`;
            }
            html += `</div>`;

            // ARMOR section
            const at = ARMOR_TIERS[g.armorTier] || ARMOR_TIERS[1];
            const nextArmor = g.armorTier < 5 ? ARMOR_TIERS[g.armorTier + 1] : null;
            html += `<div class="eq-section">`;
            html += `<div class="eq-header">🛡️ Armor</div>`;
            html += `<div class="eq-current">`;
            html += `<span class="eq-tier-badge eq-t${g.armorTier}">T${g.armorTier}</span>`;
            html += `<span class="eq-name">${at.name}</span>`;
            html += `</div>`;
            html += `<div class="eq-desc">${at.desc}</div>`;
            html += `<div class="eq-stats">`;
            html += `<span>Bonus HP: <b>+${at.hpBonus}</b></span>`;
            html += `<span>Damage reduction: <b>${Math.round(at.dr * 100)}%</b></span>`;
            html += `</div>`;
            if (nextArmor) {
                const costStr = Object.entries(nextArmor.cost).map(([k,v]) => {
                    const have = Math.floor(g.resources[k] || 0);
                    const ok = have >= v;
                    return `<span class="${ok ? 'eq-cost-ok' : 'eq-cost-need'}">${v} ${k} (${have})</span>`;
                }).join(' + ');
                const canUpgrade = Object.entries(nextArmor.cost).every(([k,v]) => (g.resources[k]||0) >= v);
                html += `<div class="eq-upgrade">`;
                html += `<div class="eq-next-name">⬆ <span class="eq-tier-badge eq-t${nextArmor.tier}">T${nextArmor.tier}</span> ${nextArmor.name} — +${nextArmor.hpBonus} HP, ${Math.round(nextArmor.dr*100)}% DR</div>`;
                html += `<div class="eq-cost">${costStr}</div>`;
                html += `<button class="eq-btn" onclick="game.upgradeArmor()" ${canUpgrade ? '' : 'disabled'}>Upgrade Armor</button>`;
                html += `</div>`;
            } else {
                html += `<div class="eq-maxed">★ MAX TIER ★</div>`;
            }
            html += `</div>`;

            html += `</div>`;
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
