/* ============================================================
   Critter Colony — Pollution System (Industrial Tyrant)
   ============================================================
   Dedicated risk mechanic for the Industrial Tyrant doctrine.
   Owns:
     - emitter list (industrial buildings)
     - per-tick zone computation (cached)
     - spatial query: getIntensityAt(x, y)
     - damage application (critters + buildings)
     - debug visualization + toggles

   Only active when doctrine.active === 'industrial_tyrant'. Other
   doctrines skip the tick entirely (no cost). All tunables come
   from DOCTRINE_DEFS.industrial_tyrant.risk.params — editable via
   data/doctrines.json.
   ============================================================ */

const PollutionSystem = {
    // ── STATE ──────────────────────────────────────────────
    _zones: [],            // [{x, y, radiusPx, radiusSq, intensity, building}]
    _zonesDirty: true,     // recompute on next tick
    _accumTimer: 0,        // drives 1s damage interval
    _enabled: false,       // true only when Industrial Tyrant is active
    _params: null,         // cached params from doctrine data

    // Debug
    debug: {
        visualize: false,       // F10 toggles
        disableDamage: false,   // skip critter/building damage
        logBreakdowns: false,   // console.log on breakdown
    },

    // ── INIT ───────────────────────────────────────────────
    init(game) {
        this.game = game;
        this.reset();
    },

    reset() {
        this._zones = [];
        this._zonesDirty = true;
        this._accumTimer = 0;
        this._enabled = false;
        this._params = null;
    },

    // ── PARAM ACCESS ───────────────────────────────────────
    _getParams() {
        if (this._params) return this._params;
        const defs = (typeof DOCTRINE_DEFS !== 'undefined') ? DOCTRINE_DEFS.industrial_tyrant : null;
        if (!defs || !defs.risk || !defs.risk.params) return null;
        this._params = defs.risk.params;
        return this._params;
    },

    // ── TICK ───────────────────────────────────────────────
    tick(dt) {
        const game = this.game;
        if (!game) return;

        // Only active when Industrial Tyrant is the picked doctrine
        const active = game.doctrine?.active === 'industrial_tyrant';
        this._enabled = active;
        if (!active) { if (this._zones.length) this._zones = []; return; }

        const params = this._getParams();
        if (!params) return;

        // Rebuild zone cache periodically (cheap: only on placement/destroy)
        // For now rebuild every 2s to also pick up building HP changes
        if (!this._rebuildTimer) this._rebuildTimer = 0;
        this._rebuildTimer -= dt;
        if (this._rebuildTimer <= 0 || this._zonesDirty) {
            this._rebuildZones(params);
            this._rebuildTimer = 2;
        }

        // Accumulator — apply damage once per second for stable numbers
        this._accumTimer += dt;
        if (this._accumTimer >= 1) {
            const secondsElapsed = Math.floor(this._accumTimer);
            this._accumTimer -= secondsElapsed;
            if (!this.debug.disableDamage) {
                for (let i = 0; i < secondsElapsed; i++) {
                    this._applyCritterDamage(params);
                    this._applyBuildingFatigue(params);
                }
            }
        }

        // Breakdowns check every frame (very low chance)
        this._checkBreakdowns(dt, params);
    },

    // ── ZONE CACHING ───────────────────────────────────────
    invalidate() { this._zonesDirty = true; this._params = null; }, // call when doctrine changes or buildings placed/destroyed

    _rebuildZones(params) {
        this._zones = [];
        this._zonesDirty = false;
        const game = this.game;
        if (!game.buildings) return;
        const overdriveOn = (typeof Doctrines !== 'undefined') && Doctrines.getFlag('overdriveUnlocked');
        const overdriveBonus = overdriveOn ? (params.overdrivePollutionBonus || 0) : 0;
        const industrialSet = new Set(params.industrialBuildings || []);
        const radiusTiles = (params.pollutionEmitRadiusTiles || 4) + overdriveBonus;
        const radiusPx = radiusTiles * TILE_SIZE;
        const radiusSq = radiusPx * radiusPx;
        const baseIntensity = params.pollutionEmitIntensity || 1;

        for (const b of game.buildings) {
            if (!industrialSet.has(b.type)) continue;
            if (b._breakdown) continue; // broken-down buildings emit nothing
            const def = BUILDING_DEFS[b.type];
            if (!def) continue;
            const bx = (b.gridX + (def.size || 1) / 2) * TILE_SIZE;
            const by = (b.gridY + (def.size || 1) / 2) * TILE_SIZE;
            this._zones.push({ x: bx, y: by, radiusPx, radiusSq, intensity: baseIntensity, building: b });
        }
    },

    // ── QUERIES ────────────────────────────────────────────
    // Returns aggregate intensity at position (sum of overlapping zones, 0 if outside all).
    getIntensityAt(x, y) {
        if (!this._enabled || this._zones.length === 0) return 0;
        let total = 0;
        for (const z of this._zones) {
            const dx = x - z.x, dy = y - z.y;
            if (dx * dx + dy * dy <= z.radiusSq) total += z.intensity;
        }
        return total;
    },

    isInZone(x, y) {
        return this.getIntensityAt(x, y) > 0;
    },

    getZones() { return this._zones; },

    // ── DAMAGE APPLICATION ─────────────────────────────────
    _applyCritterDamage(params) {
        const game = this.game;
        if (this._zones.length === 0) return;
        const dmgPerSec = params.pollutionCritterDamagePerSec || 0;
        const moralePerSec = params.pollutionMoraleDrainPerSec || 0;
        // Modifier bag lookups
        const moraleImmune = (typeof Doctrines !== 'undefined') && Doctrines.getFlag('moralePollutionImmune');

        // Iterate zones and check nearby critters via squared distance
        const list = (game.wildCritters || []).concat(game.critters || []);
        for (const c of list) {
            const cx = (c.x !== undefined) ? c.x : (c._patrolX || null);
            const cy = (c.y !== undefined) ? c.y : (c._patrolY || null);
            if (cx === null || cy === null) continue;
            let intensity = 0;
            for (const z of this._zones) {
                const dx = cx - z.x, dy = cy - z.y;
                if (dx * dx + dy * dy <= z.radiusSq) intensity += z.intensity;
            }
            if (intensity <= 0) continue;
            if (dmgPerSec > 0 && c.hp !== undefined) {
                c.hp = Math.max(0, c.hp - dmgPerSec * intensity);
            }
            if (!moraleImmune && moralePerSec > 0 && c.morale !== undefined) {
                c.morale = Math.max(0, c.morale - moralePerSec * intensity);
            }
        }
    },

    _applyBuildingFatigue(params) {
        if (this._zones.length === 0) return;
        const game = this.game;
        const fatiguePerSec = params.pollutionBuildingFatiguePerSec || 0;
        if (fatiguePerSec <= 0) return;
        const fatigueMul = (typeof Doctrines !== 'undefined')
            ? Math.max(0, 1 + Doctrines.getMod('pollutionBuildingDamageMul'))
            : 1;

        for (const b of game.buildings || []) {
            if (b.hp === undefined) continue;
            const def = BUILDING_DEFS[b.type];
            if (!def) continue;
            const bx = (b.gridX + (def.size || 1) / 2) * TILE_SIZE;
            const by = (b.gridY + (def.size || 1) / 2) * TILE_SIZE;
            // Don't have a building fatigue its own emissions
            let intensity = 0;
            for (const z of this._zones) {
                if (z.building && z.building.id === b.id) continue;
                const dx = bx - z.x, dy = by - z.y;
                if (dx * dx + dy * dy <= z.radiusSq) intensity += z.intensity;
            }
            if (intensity <= 0) continue;
            b.hp = Math.max(1, b.hp - fatiguePerSec * intensity * fatigueMul);
        }
    },

    // ── BREAKDOWNS ─────────────────────────────────────────
    // Each industrial building has a small chance per tick to break down —
    // stops producing for breakdownDurationSec, loses breakdownHpCost HP.
    // Reinforced Machinery reduces this chance.
    _checkBreakdowns(dt, params) {
        const game = this.game;
        if (!game.buildings) return;
        const industrialSet = new Set(params.industrialBuildings || []);
        const baseChance = params.breakdownChancePerTick || 0;
        const chanceMul = (typeof Doctrines !== 'undefined')
            ? Math.max(0.1, 1 + Doctrines.getMod('breakdownChanceMul'))
            : 1;
        const chance = baseChance * chanceMul;
        if (chance <= 0) return;

        for (const b of game.buildings) {
            if (!industrialSet.has(b.type)) continue;
            // Tick breakdown recovery
            if (b._breakdown) {
                b._breakdownTimer = (b._breakdownTimer || 0) - dt;
                if (b._breakdownTimer <= 0) {
                    b._breakdown = false;
                    b._breakdownTimer = 0;
                    if (this.debug.logBreakdowns) console.log('[Pollution] Building repaired:', b.type, b.id);
                }
                continue;
            }
            if (b.workers && b.workers.length === 0) continue; // idle building won't break
            if (Math.random() < chance * dt * 60) { // scale by frame time (dt=1/60→1x)
                b._breakdown = true;
                b._breakdownTimer = params.breakdownDurationSec || 12;
                b.hp = Math.max(1, (b.hp || 0) - (params.breakdownHpCost || 0));
                if (this.debug.logBreakdowns) console.log('[Pollution] BREAKDOWN:', b.type, b.id, 'hp→', b.hp);
                if (typeof UI !== 'undefined' && UI.notify) UI.notify(`⚠ ${BUILDING_DEFS[b.type]?.name || 'Building'} broke down!`, 2500);
                this._zonesDirty = true; // broken buildings stop emitting
            }
        }
    },

    // Called by Enemies on death — returns bonus loot if in a pollution zone.
    // Also cleans up the nearest zone slightly (industrial "consumes" the kill).
    onEnemyDeath(enemy) {
        const game = this.game;
        if (!this._enabled) return null;
        if (!enemy) return null;
        const intensity = this.getIntensityAt(enemy.x, enemy.y);
        if (intensity <= 0) return null;

        const defs = (typeof DOCTRINE_DEFS !== 'undefined') ? DOCTRINE_DEFS.industrial_tyrant : null;
        const hook = defs && defs.deathHooks && defs.deathHooks.enemyKillInPollution;
        if (!hook) return null;

        // Reduce nearest emitter's intensity a bit
        let nearest = null, nearestSq = Infinity;
        for (const z of this._zones) {
            const dx = enemy.x - z.x, dy = enemy.y - z.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < nearestSq) { nearestSq = d2; nearest = z; }
        }
        if (nearest && hook.pollutionCleanupPct) {
            nearest.intensity = Math.max(0, nearest.intensity * (1 - hook.pollutionCleanupPct));
        }

        // Return bonus loot bag — Enemies.damage() merges this with base loot
        return hook.bonusLoot ? { ...hook.bonusLoot } : null;
    },

    // ── DEBUG RENDER ───────────────────────────────────────
    render(gfx) {
        if (!this._enabled || !this.debug.visualize || this._zones.length === 0) return;
        for (const z of this._zones) {
            // Outer translucent zone
            gfx.beginFill(0xff8f00, 0.12);
            gfx.drawCircle(z.x, z.y, z.radiusPx);
            gfx.endFill();
            // Inner intensity ring
            gfx.lineStyle(2, 0xff8f00, 0.5);
            gfx.drawCircle(z.x, z.y, z.radiusPx);
            gfx.lineStyle(0);
            // Dashed warning ring (thin)
            gfx.lineStyle(1, 0xffd54f, 0.3);
            gfx.drawCircle(z.x, z.y, z.radiusPx * 0.6);
            gfx.lineStyle(0);
        }
    },

    // ── DEBUG CONSOLE HELPERS ──────────────────────────────
    toggleVisualize() {
        this.debug.visualize = !this.debug.visualize;
        if (typeof UI !== 'undefined' && UI.notify) UI.notify(`Pollution viz: ${this.debug.visualize ? 'ON' : 'OFF'}`, 2000);
        return this.debug.visualize;
    },

    toggleDamage() {
        this.debug.disableDamage = !this.debug.disableDamage;
        if (typeof UI !== 'undefined' && UI.notify) UI.notify(`Pollution damage: ${this.debug.disableDamage ? 'DISABLED' : 'enabled'}`, 2000);
        return !this.debug.disableDamage;
    },

    toggleBreakdownLog() {
        this.debug.logBreakdowns = !this.debug.logBreakdowns;
        console.log('[Pollution] Breakdown logs:', this.debug.logBreakdowns ? 'ON' : 'OFF');
        return this.debug.logBreakdowns;
    },
};

// Expose to window for debug console access
if (typeof window !== 'undefined') window.PollutionSystem = PollutionSystem;
