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

        const gameState = {
            worldSeed: game.world.seed,
            playerPos: { x: game.player.x, y: game.player.y },
            resources: { ...game.resources },
            inventory: { ...game.inventory },
            buildings: game.buildings.map(b => ({
                id: b.id, type: b.type, gridX: b.gridX, gridY: b.gridY,
                workers: [...b.workers], productionAccum: b.productionAccum,
            })),
            critters: game.critters.map(c => ({
                id: c.id, species: c.species, nickname: c.nickname,
                stats: { ...c.stats }, level: c.level, xp: c.xp,
                assignment: c.assignment,
            })),
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

        const gains = { wood: 0, stone: 0, food: 0 };
        for (const b of game.buildings) {
            const rate = Buildings.getProductionRate(b, game.critters);
            const def = BUILDING_DEFS[b.type];
            if (def.produces && rate > 0) {
                const gained = Math.floor(rate * elapsedSeconds);
                gains[def.produces] = (gains[def.produces] || 0) + gained;
                game.resources[def.produces] = (game.resources[def.produces] || 0) + gained;
            }
        }
        return gains;
    }

    static formatTime(seconds) {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m}m`;
    }
}
