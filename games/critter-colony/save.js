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

    static async save(game) {
        const token = Save.getToken();
        if (!token) return { success: false, reason: 'Not logged in' };

        // Serialize colony chunks (only colony-modified chunks)
        const modifiedChunks = {};
        for (const [key, chunk] of game.world.chunks) {
            // Only save chunks that have colony/path tiles (player-modified)
            let hasModified = false;
            for (let i = 0; i < chunk.tiles.length; i++) {
                if (chunk.tiles[i] === TILE.COLONY || chunk.tiles[i] === TILE.PATH) {
                    hasModified = true;
                    break;
                }
            }
            if (hasModified) {
                modifiedChunks[key] = Array.from(chunk.tiles);
            }
        }

        const gameState = {
            worldSeed: game.world.seed,
            modifiedChunks,
            waypoints: game.world.waypoints,
            playerPos: { x: game.player.x, y: game.player.y },
            resources: { ...game.resources },
            resourceCaps: { ...game.resourceCaps },
            inventory: { ...game.inventory },
            buildings: game.buildings.map(b => ({
                id: b.id, type: b.type, gridX: b.gridX, gridY: b.gridY,
                workers: [...b.workers], productionAccum: b.productionAccum,
                turretAngle: b.turretAngle || 0,
            })),
            critters: game.critters.map(c => ({
                id: c.id, species: c.species, nickname: c.nickname,
                stats: { ...c.stats }, level: c.level, xp: c.xp,
                assignment: c.assignment,
            })),
            research: { ...game.research },
            researchInProgress: game.researchInProgress ? { ...game.researchInProgress } : null,
            lastActive: Date.now(),
        };

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
        if (!token) return null;

        try {
            const res = await fetch('/api/colony/load', {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (res.status === 404) return null;
            const data = await res.json();
            if (!data.success) return null;
            return data;
        } catch (e) {
            console.error('Load failed:', e);
            return null;
        }
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
