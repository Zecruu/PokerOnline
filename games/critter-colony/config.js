/* ============================================================
   Critter Colony — Moddable Config Loader
   ============================================================
   Loads all game data from JSON files in data/ folder.
   Players can edit those JSON files to mod the game.

   This script MUST be loaded before all other game scripts.
   It populates the same global variable names the game already
   uses, so existing code works without changes.
   ============================================================ */

const GameConfig = {
    loaded: false,
    _data: {},

    // Base path to data folder (auto-detected)
    _basePath: (() => {
        // Works for both local file:// and http:// serving
        const scripts = document.getElementsByTagName('script');
        for (const s of scripts) {
            if (s.src && s.src.includes('config.js')) {
                return s.src.replace('config.js', 'data/');
            }
        }
        return 'data/';
    })(),

    async loadAll() {
        const files = [
            'species', 'critter-types', 'passives', 'buildings',
            'research', 'equipment', 'snares', 'world', 'balance', 'biomes', 'enemies', 'tech'
        ];

        const results = await Promise.all(
            files.map(async (name) => {
                try {
                    const resp = await fetch(this._basePath + name + '.json');
                    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                    const data = await resp.json();
                    // Strip _README keys
                    delete data._README;
                    return [name, data];
                } catch (e) {
                    console.warn(`[Config] Failed to load ${name}.json:`, e.message);
                    return [name, null];
                }
            })
        );

        for (const [name, data] of results) {
            if (data) this._data[name] = data;
        }

        this._applyToGlobals();
        this.loaded = true;
        console.log('[Config] All config loaded from data/ folder. Game is moddable!');
    },

    _applyToGlobals() {
        const d = this._data;

        // ── WORLD (must go first — TILE constants used by buildings) ──
        if (d.world) {
            const w = d.world;
            window.TILE_SIZE = w.TILE_SIZE;
            window.CHUNK_SIZE = w.CHUNK_SIZE;
            window.RENDER_DISTANCE = w.RENDER_DISTANCE;
            window.MAP_W = w.MAP_W;
            window.MAP_H = w.MAP_H;
            window.COLONY_MIN = w.COLONY_MIN;
            window.COLONY_MAX = w.COLONY_MAX;

            // Tile enum
            window.TILE = {};
            for (const [name, val] of Object.entries(w.tiles)) {
                window.TILE[name] = val;
            }

            // Tile colors — keys are numeric strings from JSON, convert to int
            window.TILE_COLORS = {};
            for (const [k, v] of Object.entries(w.tileColors)) {
                window.TILE_COLORS[parseInt(k)] = v;
            }

            window.NODE_COLORS = {};
            for (const [k, v] of Object.entries(w.nodeColors)) {
                window.NODE_COLORS[parseInt(k)] = v;
            }

            window.NODE_INFO = {};
            for (const [k, v] of Object.entries(w.nodeInfo)) {
                window.NODE_INFO[parseInt(k)] = v;
            }
        }

        // ── BALANCE ──
        if (d.balance) {
            window.BALANCE = d.balance;
        }

        // ── CRITTER TYPES ──
        if (d['critter-types']) {
            window.CRITTER_TYPES = d['critter-types'];
        }

        // ── SPECIES ──
        if (d.species) {
            window.SPECIES = d.species;
        }

        // ── PASSIVES ──
        if (d.passives) {
            window.PASSIVES = d.passives;

            // Build passive pools by rarity (derived, not config)
            window.PASSIVE_POOL = {
                common: Object.keys(d.passives).filter(k => d.passives[k].rarity === 'common'),
                uncommon: Object.keys(d.passives).filter(k => d.passives[k].rarity === 'uncommon'),
                rare: Object.keys(d.passives).filter(k => d.passives[k].rarity === 'rare'),
                legendary: Object.keys(d.passives).filter(k => d.passives[k].rarity === 'legendary'),
            };
        }

        // ── BALANCE-DERIVED GLOBALS ──
        if (d.balance) {
            const b = d.balance;
            window.TYPE_MATCH_BONUS = b.capture.typeMatchBonus;
            window.TYPE_MISMATCH_PENALTY = b.capture.typeMismatchPenalty;
            window.CATCH_RATES = b.capture.catchRates;
            window.RARITY_HP = b.wildCritters.rarityHp;
            window.RARITY_COLORS = b.wildCritters.rarityColors;
            window.WILD_MIN_COUNT = b.wildCritters.minCount;
            window.WILD_MAX_COUNT = b.wildCritters.maxCount;
            window.CAPTURE_RANGE = b.capture.captureRange;
        }

        // ── BIOMES ──
        if (d.biomes) {
            window.BIOMES = d.biomes;
        }

        // ── ENEMIES ──
        if (d.enemies) {
            window.ENEMY_DEFS = d.enemies;
        }

        // ── TECH TREE ──
        if (d.tech) {
            window.TECH_BRANCHES = d.tech._branches || {};
            const techDefs = {};
            for (const [k, v] of Object.entries(d.tech)) {
                if (k.startsWith('_')) continue;
                techDefs[k] = v;
            }
            window.TECH_DEFS = techDefs;
        }

        // ── SNARES ──
        if (d.snares) {
            window.SNARE_TIERS = d.snares;
        }

        // ── BUILDINGS ──
        if (d.buildings) {
            window.BUILDING_DEFS = d.buildings;
        }

        // ── RESEARCH ──
        if (d.research) {
            // Convert JSON format back to the function-based format the game expects
            window.RESEARCH_DEFS = {};
            for (const [id, rd] of Object.entries(d.research)) {
                window.RESEARCH_DEFS[id] = {
                    name: rd.name,
                    desc: rd.desc,
                    maxLevel: rd.maxLevel,
                    time: rd.time,
                    // Recreate the cost function from costBase + costScale
                    cost: rd.costScale === 'flat'
                        ? (l) => { const c = {}; for (const [k,v] of Object.entries(rd.costBase)) c[k] = v; return c; }
                        : (l) => { const c = {}; for (const [k,v] of Object.entries(rd.costBase)) c[k] = v * (l + 1); return c; }
                };
            }
        }

        // ── EQUIPMENT ──
        if (d.equipment) {
            window.GUN_TIERS = d.equipment.guns;
            window.ARMOR_TIERS = d.equipment.armor;
        }
    }
};
