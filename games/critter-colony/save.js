/* ============================================================
   Critter Colony — Save/Load System
   ============================================================ */

class Save {
    static getToken() {
        return localStorage.getItem('auth_token');
    }

    static isLoggedIn() {
        return !!Save.getToken();
    }

    // ─── LOCAL SAVE (always available) ────────────────────────
    static saveLocal(game) {
        try {
            const gs = Save._buildGameState(game);
            localStorage.setItem('critter_colony_save', JSON.stringify(gs));
        } catch(e) { console.error('Local save failed:', e); }
    }

    static loadLocal() {
        try {
            const raw = localStorage.getItem('critter_colony_save');
            if (!raw) return null;
            const gs = JSON.parse(raw);
            const elapsed = gs.lastActive ? Math.floor((Date.now() - gs.lastActive) / 1000) : 0;
            return { gameState: gs, elapsed };
        } catch(e) { return null; }
    }

    static deleteLocal() {
        localStorage.removeItem('critter_colony_save');
    }

    static _buildGameState(game) {
        const modifiedChunks = {};
        for (const [key, chunk] of game.world.chunks) {
            let hasModified = false;
            for (let i = 0; i < chunk.tiles.length; i++) {
                if (chunk.tiles[i] === TILE.COLONY || chunk.tiles[i] === TILE.PATH) { hasModified = true; break; }
            }
            if (hasModified) modifiedChunks[key] = Array.from(chunk.tiles);
        }
        return {
            worldSeed: game.world.seed,
            modifiedChunks,
            waypoints: game.world.waypoints,
            nodePools: Array.from((game.world.nodePools || new Map()).entries()).map(([k, v]) => [k, v === Infinity ? '∞' : v]),
            nodeRespawns: Array.from((game.world.nodeRespawns || new Map()).entries()),
            playerPos: { x: game.player.x, y: game.player.y },
            playerHunger: game.player.hunger !== undefined ? game.player.hunger : 100,
            skillPoints: game.skillPoints || 0,
            techUnlocks: game.techUnlocks || {},
            resources: { ...game.resources },
            resourceCaps: { ...game.resourceCaps },
            inventory: { ...game.inventory },
            buildings: game.buildings.map(b => ({
                id: b.id, type: b.type, gridX: b.gridX, gridY: b.gridY,
                workers: [...b.workers], productionAccum: b.productionAccum,
                turretAngle: b.turretAngle || 0,
                hp: b.hp, maxHp: b.maxHp,
            })),
            critters: game.critters.map(c => ({
                id: c.id, species: c.species, nickname: c.nickname,
                proficiency: c.proficiency !== undefined ? c.proficiency : (c.stats?.PROF || 1),
                stats: { ...(c.stats || {}) }, // legacy shim for old-format readers
                level: c.level, xp: c.xp,
                assignment: c.assignment,
                injured: c.injured || false, injuredTimer: c.injuredTimer || 0,
                passives: c.passives || [],
                patrolHp: c.patrolHp, patrolMaxHp: c.patrolMaxHp,
                hunger: c.hunger !== undefined ? c.hunger : 100,
                stars: c.stars || 0,
            })),
            deadCritters: (game.deadCritters || []).slice(-20),
            discoveredSpecies: game.discoveredSpecies || [],
            critdex: game.critdex
                ? { level: game.critdex.level || 1, xp: game.critdex.xp || 0 }
                : { level: 1, xp: 0 },
            research: { ...game.research },
            researchInProgress: game.researchInProgress ? { ...game.researchInProgress } : null,
            doctrine: (typeof Doctrines !== 'undefined' && Doctrines.save) ? Doctrines.save() : (game.doctrine || null),
            lastActive: Date.now(),
        };
    }

    static async save(game) {
        // Always save locally
        Save.saveLocal(game);

        const token = Save.getToken();
        if (!token) return { success: false, reason: 'Not logged in' };

        const gameState = Save._buildGameState(game);

        try {
            const res = await fetch('/api/colony/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ gameState }),
            });
            return await res.json();
        } catch (e) {
            console.error('Save failed:', e);
            return { success: false, reason: e.message };
        }
    }

    static async load() {
        const token = Save.getToken();

        // Try server first if logged in
        if (token) {
            try {
                const res = await fetch('/api/colony/load', {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (res.status !== 404) {
                    const data = await res.json();
                    if (data.success) return data;
                }
            } catch (e) {
                console.error('Server load failed, trying local:', e);
            }
        }

        // Fallback to local save
        return Save.loadLocal();
    }

    static async deleteSave() {
        const token = Save.getToken();
        if (!token) return;

        try {
            await fetch('/api/colony/save', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
        } catch (e) {
            console.error('Delete save failed:', e);
        }
    }

    static applyAFKGains(game, elapsedSeconds) {
        if (elapsedSeconds <= 0) return null;

        // Cap based on research
        const maxAfk = (8 + (game.research.afkCap || 0) * 2) * 3600;
        const elapsed = Math.min(elapsedSeconds, maxAfk);

        const gains = { wood: 0, stone: 0, food: 0 };
        for (const b of game.buildings) {
            const rate = Buildings.getProductionRate(b, game.critters);
            const def = BUILDING_DEFS[b.type];
            if (def.produces && rate > 0) {
                const gained = Math.floor(rate * elapsed);
                const res = def.produces;
                const cap = (game.resourceCaps[res] || 200) + (game.research.storageCap || 0) * 100;
                const before = game.resources[res] || 0;
                game.resources[res] = Math.min(before + gained, cap);
                gains[res] = (gains[res] || 0) + (game.resources[res] - before);
            }
        }
        return gains;
    }

    static restoreModifiedChunks(world, modifiedChunks) {
        if (!modifiedChunks) return;
        for (const [key, tiles] of Object.entries(modifiedChunks)) {
            const [cxStr, cyStr] = key.split(',');
            const cx = parseInt(cxStr);
            const cy = parseInt(cyStr);
            const chunk = world.getOrGenerateChunk(cx, cy);
            for (let i = 0; i < tiles.length && i < chunk.tiles.length; i++) {
                chunk.tiles[i] = tiles[i];
            }
        }
    }

    static formatTime(seconds) {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m}m`;
    }
}
