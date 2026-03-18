/* ============================================================
   Critter Colony — Building System
   ============================================================ */

const BUILDING_DEFS = {
    mine:        { name: 'Mine',        cost: { wood: 30, stone: 0, food: 0 },   produces: 'stone', baseRate: 0.1, color: '#78909c', letter: 'M', size: 2, statKey: 'STR' },
    lumber_mill: { name: 'Lumber Mill', cost: { wood: 0, stone: 30, food: 0 },   produces: 'wood',  baseRate: 0.1, color: '#6d4c41', letter: 'L', size: 2, statKey: 'STR' },
    farm:        { name: 'Farm',        cost: { wood: 20, stone: 10, food: 0 },   produces: 'food',  baseRate: 0.1, color: '#7cb342', letter: 'F', size: 2, statKey: 'VIT' },
    nest:        { name: 'Nest',        cost: { wood: 15, stone: 5, food: 0 },    produces: null,    baseRate: 0,   color: '#ffb74d', letter: 'N', size: 2, statKey: null, capacity: 4 },
    turret:      { name: 'Turret',      cost: { wood: 20, stone: 30, food: 0 },   produces: null,    baseRate: 0,   color: '#607d8b', letter: 'T', size: 1, statKey: null, turret: true, range: 6, damage: 5, fireRate: 1 },
    expander:    { name: 'Expander',    cost: { wood: 40, stone: 40, food: 20 },  produces: null,    baseRate: 0,   color: '#ab47bc', letter: 'E', size: 1, statKey: null, expander: true, expandRadius: 5 },
    research_lab:{ name: 'Research Lab',cost: { wood: 50, stone: 50, food: 30 },  produces: null,    baseRate: 0,   color: '#5c6bc0', letter: 'R', size: 2, statKey: 'INT', isResearch: true },
    workbench:   { name: 'Workbench',  cost: { wood: 25, stone: 15, food: 0 },   produces: null,    baseRate: 0,   color: '#8d6e63', letter: 'W', size: 2, statKey: 'DEX', isWorkbench: true },
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
        for (let dx = 0; dx < size; dx++) {
            for (let dy = 0; dy < size; dy++) {
                if (!world.isColony(gridX + dx, gridY + dy)) return false;
            }
        }
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
        for (const [res, cost] of Object.entries(def.cost)) {
            resources[res] -= cost;
        }
        return {
            id: Date.now() + Math.floor(Math.random() * 1000),
            type,
            gridX,
            gridY,
            workers: [],
            productionAccum: 0,
            // Turret state
            turretTarget: null,
            turretCooldown: 0,
            turretAngle: 0,
        };
    }

    static getProductionRate(building, critters, hungry) {
        const def = BUILDING_DEFS[building.type];
        if (!def.produces || building.workers.length === 0) return 0;

        let totalStat = 0;
        for (const cid of building.workers) {
            const c = critters.find(cr => cr.id === cid);
            if (c && def.statKey) {
                totalStat += c.stats[def.statKey] || 0;
            }
        }
        let rate = def.baseRate * building.workers.length * (1 + totalStat * 0.05);
        if (hungry) rate *= 0.5; // hungry debuff
        return rate;
    }

    // Base 5 seconds per trap. Each DEX point from workers reduces by 2%, min 1 second.
    // No workers = manual craft at base speed (5s).
    static getCraftTime(building, critters) {
        let dexSum = 0;
        for (const cid of building.workers) {
            const c = critters.find(cr => cr.id === cid);
            if (c) dexSum += c.stats.DEX || 0;
        }
        return Math.max(1, 5 * (1 - dexSum * 0.02));
    }

    static getResearchSpeed(buildings, critters) {
        let speed = 0;
        for (const b of buildings) {
            if (b.type !== 'research_lab') continue;
            let intSum = 0;
            for (const cid of b.workers) {
                const c = critters.find(cr => cr.id === cid);
                if (c) intSum += c.stats.INT || 0;
            }
            if (b.workers.length > 0) {
                speed += 0.05 * b.workers.length * (1 + intSum * 0.08);
            }
        }
        return speed;
    }

    static update(dt, buildings, critters, resources, resourceCaps, inventory, hungry) {
        for (const b of buildings) {
            const def = BUILDING_DEFS[b.type];

            // Workbench: craft queue system
            if (def.isWorkbench) {
                if (!b.craftQueue) b.craftQueue = 0; // how many queued to auto-craft
                if (!b.craftProgress) b.craftProgress = 0;

                // Only auto-craft if workers assigned AND queue > 0
                const hasWork = b.workers.length > 0 && b.craftQueue > 0;
                // Manual craft also progresses (craftProgress set by game.manualCraft)
                if (hasWork || b._manualCrafting) {
                    const craftTime = Buildings.getCraftTime(b, critters);
                    b.craftProgress += dt;

                    if (b.craftProgress >= craftTime && inventory) {
                        if ((resources.wood || 0) >= 5 && (resources.stone || 0) >= 3) {
                            resources.wood -= 5;
                            resources.stone -= 3;
                            inventory.traps = (inventory.traps || 0) + 1;
                            b.craftProgress = 0;
                            if (b.craftQueue > 0) b.craftQueue--;
                            if (b._manualCrafting) b._manualCrafting = false;

                            for (const cid of b.workers) {
                                const c = critters.find(cr => cr.id === cid);
                                if (c) Critters.addXp(c, 1);
                            }
                        } else {
                            b.craftProgress = craftTime; // wait for resources
                        }
                    }
                }
                continue;
            }

            if (!def.produces || b.workers.length === 0) continue;

            const rate = Buildings.getProductionRate(b, critters, hungry);
            b.productionAccum += rate * dt;

            if (b.productionAccum >= 1) {
                const gained = Math.floor(b.productionAccum);
                const res = def.produces;
                const cap = resourceCaps ? (resourceCaps[res] || 9999) : 9999;
                resources[res] = Math.min((resources[res] || 0) + gained, cap);
                b.productionAccum -= gained;

                for (const cid of b.workers) {
                    const c = critters.find(cr => cr.id === cid);
                    if (c) Critters.addXp(c, gained);
                }
            }
        }
    }

    static updateTurrets(dt, buildings, wildCritters, projectiles, research) {
        for (const b of buildings) {
            const def = BUILDING_DEFS[b.type];
            if (!def.turret) continue;

            b.turretCooldown = Math.max(0, (b.turretCooldown || 0) - dt);
            const range = (def.range + (research?.turretRange || 0)) * TILE_SIZE;
            const damage = def.damage + (research?.turretDamage || 0) * 3;
            const cx = (b.gridX + 0.5) * TILE_SIZE;
            const cy = (b.gridY + 0.5) * TILE_SIZE;

            // Find closest wild critter in range
            let closest = null;
            let closestDist = Infinity;
            for (const wc of wildCritters) {
                const dx = wc.x - cx;
                const dy = wc.y - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < range && dist < closestDist) {
                    closestDist = dist;
                    closest = wc;
                }
            }

            if (closest) {
                b.turretAngle = Math.atan2(closest.y - cy, closest.x - cx);
                b.turretTarget = { x: closest.x, y: closest.y };

                if (b.turretCooldown <= 0) {
                    b.turretCooldown = 1 / def.fireRate;
                    const angle = b.turretAngle;
                    const speed = 350;
                    projectiles.push({
                        x: cx, y: cy,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        damage,
                        lifetime: 2,
                        fromTurret: true,
                    });
                }
            } else {
                b.turretTarget = null;
            }
        }
    }

    static getMaxWorkersPerBuilding(research) {
        return 1 + (research?.workersPerB || 0); // base 1, max 5
    }

    static getMaxCritters(buildings, research) {
        let cap = 4;
        for (const b of buildings) {
            if (b.type === 'nest') cap += (BUILDING_DEFS.nest.capacity || 4);
        }
        cap += (research?.critterCap || 0) * 4;
        return cap;
    }

    static render(ctx, building, camX, camY, critters, time) {
        const def = BUILDING_DEFS[building.type];
        const wx = building.gridX * TILE_SIZE;
        const wy = building.gridY * TILE_SIZE;
        const sx = wx - camX;
        const sy = wy - camY;
        const size = def.size * TILE_SIZE;

        // Building body — use sprite if available
        const sprite = typeof BUILDING_SPRITES !== 'undefined' ? BUILDING_SPRITES[building.type] : null;
        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
            ctx.drawImage(sprite, sx + 1, sy + 1, size - 2, size - 2);
        } else {
            ctx.fillStyle = def.color;
            ctx.fillRect(sx + 2, sy + 2, size - 4, size - 4);
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${def.size === 1 ? 14 : 18}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(def.letter, sx + size / 2, sy + (def.size === 1 ? size / 2 : 18));
        }

        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx + 2, sy + 2, size - 4, size - 4);

        // Turret barrel
        if (def.turret) {
            const angle = building.turretAngle || 0;
            const tcx = sx + size / 2;
            const tcy = sy + size / 2;
            ctx.strokeStyle = '#ccc';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(tcx, tcy);
            ctx.lineTo(tcx + Math.cos(angle) * 18, tcy + Math.sin(angle) * 18);
            ctx.stroke();
            // Range circle (faint)
            const range = (def.range) * TILE_SIZE;
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(tcx, tcy, range, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Worker count
        if (building.workers.length > 0 && !def.turret && !def.expander) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(sx + size - 20, sy + 2, 18, 14);
            ctx.fillStyle = '#4ade80';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(building.workers.length.toString(), sx + size - 11, sy + 10);
        }

        // Production rate
        if (def.produces && building.workers.length > 0) {
            const rate = Buildings.getProductionRate(building, critters);
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(sx + 2, sy + size - 14, size - 4, 12);
            ctx.fillStyle = '#fbbf24';
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`+${rate.toFixed(1)}/s ${def.produces}`, sx + size / 2, sy + size - 6);
        }

        // Research lab indicator
        if (def.isResearch && building.workers.length > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(sx + 2, sy + size - 14, size - 4, 12);
            ctx.fillStyle = '#818cf8';
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('RESEARCHING', sx + size / 2, sy + size - 6);
        }

        // Workbench indicator
        if (def.isWorkbench) {
            const crafting = (building.workers.length > 0 && building.craftQueue > 0) || building._manualCrafting;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(sx + 2, sy + size - 14, size - 4, 12);
            if (crafting) {
                const ct = Buildings.getCraftTime(building, critters);
                const pct = Math.min(1, (building.craftProgress || 0) / ct);
                // Progress bar
                ctx.fillStyle = 'rgba(255,171,145,0.3)';
                ctx.fillRect(sx + 3, sy + size - 13, (size - 6) * pct, 10);
                ctx.fillStyle = '#ffab91';
                ctx.font = '9px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`CRAFTING (${building.craftQueue || 0} queued)`, sx + size / 2, sy + size - 6);
            } else {
                ctx.fillStyle = '#888';
                ctx.font = '9px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('WORKBENCH', sx + size / 2, sy + size - 6);
            }
        }

        // Assigned critters
        for (let i = 0; i < building.workers.length; i++) {
            const c = critters.find(cr => cr.id === building.workers[i]);
            if (c) Critters.renderAssigned(ctx, c, wx, wy, i, camX, camY, time);
        }
    }
}
