/* ============================================================
   Critter Colony — Building System
   ============================================================ */

const BUILDING_DEFS = {
    mine:        { name: 'Mine',        cost: { wood: 30, stone: 0, food: 0 },  produces: 'stone', baseRate: 0.1, color: '#78909c', letter: 'M', size: 2, statKey: 'STR' },
    lumber_mill: { name: 'Lumber Mill', cost: { wood: 0, stone: 30, food: 0 },  produces: 'wood',  baseRate: 0.1, color: '#6d4c41', letter: 'L', size: 2, statKey: 'STR' },
    farm:        { name: 'Farm',        cost: { wood: 20, stone: 10, food: 0 },  produces: 'food',  baseRate: 0.1, color: '#7cb342', letter: 'F', size: 2, statKey: 'VIT' },
    nest:        { name: 'Nest',        cost: { wood: 15, stone: 5, food: 0 },   produces: null,    baseRate: 0,   color: '#ffb74d', letter: 'N', size: 2, statKey: null, capacity: 4 },
};

class Buildings {
    static canAfford(type, resources) {
        const def = BUILDING_DEFS[type];
        for (const [res, cost] of Object.entries(def.cost)) {
            if ((resources[res] || 0) < cost) return false;
        }
        return true;
    }

    static canPlace(gridX, gridY, size, buildings, world) {
        // Must be in colony zone
        for (let dx = 0; dx < size; dx++) {
            for (let dy = 0; dy < size; dy++) {
                if (!world.isColony(gridX + dx, gridY + dy)) return false;
            }
        }
        // No overlap with existing buildings
        for (const b of buildings) {
            const def = BUILDING_DEFS[b.type];
            if (gridX < b.gridX + def.size && gridX + size > b.gridX &&
                gridY < b.gridY + def.size && gridY + size > b.gridY) {
                return false;
            }
        }
        return true;
    }

    static place(type, gridX, gridY, resources) {
        const def = BUILDING_DEFS[type];
        // Deduct cost
        for (const [res, cost] of Object.entries(def.cost)) {
            resources[res] -= cost;
        }
        return {
            id: Date.now() + Math.floor(Math.random() * 1000),
            type,
            gridX,
            gridY,
            workers: [], // critter IDs
            productionAccum: 0,
        };
    }

    static getProductionRate(building, critters) {
        const def = BUILDING_DEFS[building.type];
        if (!def.produces || building.workers.length === 0) return 0;

        let totalStat = 0;
        for (const cid of building.workers) {
            const c = critters.find(cr => cr.id === cid);
            if (c && def.statKey) {
                totalStat += c.stats[def.statKey] || 0;
            }
        }
        // base rate * workers * (1 + stat bonus)
        return def.baseRate * building.workers.length * (1 + totalStat * 0.05);
    }

    static update(dt, buildings, critters, resources) {
        for (const b of buildings) {
            const def = BUILDING_DEFS[b.type];
            if (!def.produces || b.workers.length === 0) continue;

            const rate = Buildings.getProductionRate(b, critters);
            b.productionAccum += rate * dt;

            if (b.productionAccum >= 1) {
                const gained = Math.floor(b.productionAccum);
                resources[def.produces] = (resources[def.produces] || 0) + gained;
                b.productionAccum -= gained;

                // XP for workers
                for (const cid of b.workers) {
                    const c = critters.find(cr => cr.id === cid);
                    if (c) Critters.addXp(c, gained);
                }
            }
        }
    }

    static getMaxCritters(buildings) {
        let cap = 4; // base capacity
        for (const b of buildings) {
            if (b.type === 'nest') cap += (BUILDING_DEFS.nest.capacity || 4);
        }
        return cap;
    }

    static render(ctx, building, camX, camY, critters, time) {
        const def = BUILDING_DEFS[building.type];
        const wx = building.gridX * TILE_SIZE;
        const wy = building.gridY * TILE_SIZE;
        const sx = wx - camX;
        const sy = wy - camY;
        const size = def.size * TILE_SIZE;

        // Building body
        ctx.fillStyle = def.color;
        ctx.fillRect(sx + 2, sy + 2, size - 4, size - 4);

        // Border
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx + 2, sy + 2, size - 4, size - 4);

        // Letter label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(def.letter, sx + size / 2, sy + 18);

        // Worker count
        if (building.workers.length > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(sx + size - 20, sy + 2, 18, 14);
            ctx.fillStyle = '#4ade80';
            ctx.font = 'bold 10px monospace';
            ctx.fillText(building.workers.length.toString(), sx + size - 11, sy + 10);
        }

        // Production rate indicator
        if (def.produces && building.workers.length > 0) {
            const rate = Buildings.getProductionRate(building, critters);
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(sx + 2, sy + size - 14, size - 4, 12);
            ctx.fillStyle = '#fbbf24';
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`+${rate.toFixed(1)}/s ${def.produces}`, sx + size / 2, sy + size - 6);
        }

        // Render assigned critters
        for (let i = 0; i < building.workers.length; i++) {
            const c = critters.find(cr => cr.id === building.workers[i]);
            if (c) Critters.renderAssigned(ctx, c, wx, wy, i, camX, camY, time);
        }
    }
}
