/* ============================================================
   Critter Colony — Building System
   ============================================================ */

const BUILDING_DEFS = {
    hq:          { name: 'Colony HQ',   cost: { wood: 0, stone: 0, food: 0 },    produces: null,    baseRate: 0,   color: '#4FC3F7', letter: 'H', size: 3, statKey: null, hp: 500, isHQ: true, unbuildable: true },
    mine:        { name: 'Mine',        cost: { wood: 30, stone: 0, food: 0 },   produces: 'stone', baseRate: 0.1, color: '#78909c', letter: 'M', size: 2, statKey: 'STR', hp: 80 },
    lumber_mill: { name: 'Lumber Mill', cost: { wood: 0, stone: 30, food: 0 },   produces: 'wood',  baseRate: 0.1, color: '#6d4c41', letter: 'L', size: 2, statKey: 'STR', hp: 80 },
    farm:        { name: 'Farm',        cost: { wood: 20, stone: 10, food: 0 },   produces: 'food',  baseRate: 0.2, color: '#7cb342', letter: 'F', size: 2, statKey: 'VIT', hp: 60 },
    nest:        { name: 'Nest',        cost: { wood: 15, stone: 5, food: 0 },    produces: null,    baseRate: 0,   color: '#ffb74d', letter: 'N', size: 2, statKey: null, capacity: 4, hp: 50 },
    turret:      { name: 'Turret',      cost: { wood: 20, stone: 30, food: 0 },   produces: null,    baseRate: 0,   color: '#607d8b', letter: 'T', size: 1, statKey: null, turret: true, range: 6, damage: 5, fireRate: 1, hp: 120 },
    expander:    { name: 'Expander',    cost: { wood: 40, stone: 40, food: 20 },  produces: null,    baseRate: 0,   color: '#ab47bc', letter: 'E', size: 1, statKey: null, expander: true, expandRadius: 5 },
    research_lab:{ name: 'Research Lab',cost: { wood: 50, stone: 50, food: 30 },  produces: null,    baseRate: 0,   color: '#5c6bc0', letter: 'R', size: 2, statKey: 'INT', isResearch: true, hp: 100 },
    workbench:   { name: 'Workbench',  cost: { wood: 25, stone: 15, food: 0 },   produces: null,    baseRate: 0,   color: '#8d6e63', letter: 'W', size: 2, statKey: 'DEX', isWorkbench: true, hp: 70 },
    iron_mine:   { name: 'Iron Mine',  cost: { wood: 30, stone: 40, food: 0 },  produces: 'iron',  baseRate: 0.08, color: '#b0bec5', letter: 'I', size: 2, statKey: 'STR', hp: 100 },
    wall:        { name: 'Wall',        cost: { wood: 5, stone: 10, food: 0 },    produces: null,    baseRate: 0,   color: '#546e7a', letter: '▪', size: 1, statKey: null, isWall: true, hp: 200, blocksMovement: true },
    gate:        { name: 'Gate',        cost: { wood: 10, stone: 15, food: 0 },   produces: null,    baseRate: 0,   color: '#6d4c41', letter: '⊞', size: 1, statKey: null, isGate: true, hp: 150, blocksMovement: false },
    storage:     { name: 'Storage',     cost: { wood: 35, stone: 35, food: 0 },   produces: null,    baseRate: 0,   color: '#8d6e63', letter: 'S', size: 2, statKey: null, isStorage: true, hp: 80, storageCap: 150, researchReq: 'storageBuilding' },
    smelter:     { name: 'Smelter',     cost: { wood: 20, stone: 40, iron: 10 },  produces: 'metal', baseRate: 0.06, color: '#e65100', letter: '🔥', size: 2, statKey: 'STR', hp: 100, researchReq: 'smelting' },
    greenhouse:  { name: 'Greenhouse',  cost: { wood: 40, stone: 20, food: 0 },   produces: 'food',  baseRate: 0.3,  color: '#43a047', letter: 'G', size: 2, statKey: 'VIT', hp: 60, researchReq: 'greenhouse' },
    barracks:    { name: 'Barracks',    cost: { wood: 30, stone: 50, iron: 15 },  produces: null,    baseRate: 0,   color: '#c62828', letter: 'B', size: 2, statKey: null, hp: 150, isBarracks: true, patrolBonus: 0.3, researchReq: 'barracks' },
    refinery:    { name: 'Refinery',    cost: { wood: 30, stone: 50, iron: 20 },  produces: 'crystal', baseRate: 0.03, color: '#7b1fa2', letter: '♦', size: 2, statKey: 'INT', hp: 120, researchReq: 'refinery' },
    healer:      { name: 'Healing Hut', cost: { wood: 25, stone: 20, food: 15 },  produces: null,    baseRate: 0,   color: '#e91e63', letter: '+', size: 2, statKey: 'VIT', hp: 60, isHealer: true, researchReq: 'healingHut' },
    // Extractors — must be placed ON resource nodes
    oil_pump:    { name: 'Oil Pump',    cost: { wood: 30, stone: 40, iron: 10 }, produces: 'oil',     baseRate: 0.05, color: '#37474f', letter: '⛽', size: 1, statKey: 'STR', hp: 100, isExtractor: true, nodeType: TILE.NODE_OIL, researchReq: 'oilDrilling', selfPowered: true },
    gold_mine:   { name: 'Gold Mine',   cost: { wood: 40, stone: 60, iron: 20 }, produces: 'gold',    baseRate: 0.03, color: '#f9a825', letter: 'G', size: 1, statKey: 'STR', hp: 120, isExtractor: true, nodeType: TILE.NODE_GOLD, researchReq: 'goldMining', needsPower: true },
    diamond_drill:{ name: 'Diamond Drill',cost: { wood: 50, stone: 80, iron: 30 },produces: 'diamond', baseRate: 0.02, color: '#4fc3f7', letter: '♦', size: 1, statKey: 'STR', hp: 150, isExtractor: true, nodeType: TILE.NODE_DIAMOND, researchReq: 'diamondDrill', needsPower: true },
    crystal_extractor:{ name: 'Crystal Extractor',cost: { wood: 40, stone: 50, iron: 15 },produces: 'crystal', baseRate: 0.04, color: '#ab47bc', letter: '◆', size: 1, statKey: 'INT', hp: 100, isExtractor: true, nodeType: TILE.NODE_CRYSTAL, researchReq: 'crystalExtract', needsPower: true },
    // Power chain: Oil → Gasoline Refinery → Generator → powers extractors
    gas_refinery:{ name: 'Gas Refinery', cost: { wood: 30, stone: 50, iron: 20 }, produces: 'gasoline', baseRate: 0.04, color: '#ff6f00', letter: '⚗', size: 2, statKey: 'STR', hp: 100, consumesResource: 'oil', consumeRate: 0.02, researchReq: 'gasRefining' },
    generator:   { name: 'Generator',    cost: { wood: 20, stone: 40, iron: 30 }, produces: null,       baseRate: 0,    color: '#ffc107', letter: '⚡', size: 1, statKey: null, hp: 120, isGenerator: true, powerRadius: 8, consumesResource: 'gasoline', consumeRate: 0.01, researchReq: 'generators' },
    passive_lab: { name: 'Passive Lab',  cost: { wood: 60, stone: 60, gold: 5 },  produces: null,       baseRate: 0,    color: '#e040fb', letter: '🧬', size: 2, statKey: null, hp: 80, isPassiveLab: true, researchReq: 'passiveLab' },
};

class Buildings {
    static canAfford(type, resources) {
        const def = BUILDING_DEFS[type];
        for (const [res, cost] of Object.entries(def.cost)) {
            if ((resources[res] || 0) < cost) return false;
        }
        return true;
    }

    static canPlaceExtractor(gridX, gridY, buildings, world, nodeType) {
        // Must be on the correct node type
        if (world.getTile(gridX, gridY) !== nodeType) return false;
        // No overlap
        for (const b of buildings) {
            const def = BUILDING_DEFS[b.type];
            if (gridX >= b.gridX && gridX < b.gridX + def.size &&
                gridY >= b.gridY && gridY < b.gridY + def.size) return false;
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
        const maxHp = def.hp || 100;
        return {
            id: Date.now() + Math.floor(Math.random() * 1000),
            type,
            gridX,
            gridY,
            workers: [],
            productionAccum: 0,
            hp: maxHp,
            maxHp,
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
        let passiveBonus = 0;
        let typeBonus = 0;
        for (const cid of building.workers) {
            const c = critters.find(cr => cr.id === cid);
            if (!c) continue;
            if (def.statKey) {
                let stat = c.stats[def.statKey] || 0;
                stat *= (1 + Critters.getPassiveEffect(c, 'statMulti'));
                totalStat += stat;
            }
            passiveBonus += Critters.getPassiveEffect(c, 'prodBonus');
            const resBonus = c.passives ? c.passives.reduce((sum, pid) => {
                const p = PASSIVES[pid];
                if (p && p.effect && p.effect.resourceBonus && p.effect.resourceBonus[def.produces])
                    return sum + p.effect.resourceBonus[def.produces];
                return sum;
            }, 0) : 0;
            passiveBonus += resBonus;
            // Type bonus/penalty
            typeBonus += Critters.getTypeBonus(c, building.type);
        }
        let rate = def.baseRate * building.workers.length * (1 + totalStat * 0.05) * (1 + passiveBonus) * (1 + typeBonus / building.workers.length);
        if (hungry) rate *= 0.5;
        return Math.max(0, rate);
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

            // Workbench: multi-recipe craft queue
            if (def.isWorkbench) {
                if (!b.craftQueue) b.craftQueue = 0;
                if (!b.ammoQueue) b.ammoQueue = 0;
                if (!b.craftProgress) b.craftProgress = 0;

                let recipe = null;
                if (b._manualCrafting) recipe = b._manualRecipe || 'trap';
                else if (b.workers.length > 0) {
                    if (b.craftQueue > 0) recipe = 'trap';
                    else if (b.ammoQueue > 0) recipe = 'ammo';
                }

                if (recipe) {
                    b.activeRecipe = recipe;
                    const craftTime = Buildings.getCraftTime(b, critters);
                    b.craftProgress += dt;

                    if (b.craftProgress >= craftTime && inventory) {
                        let ok = false;
                        if (recipe === 'trap' && (resources.wood||0) >= 5 && (resources.stone||0) >= 3) {
                            resources.wood -= 5; resources.stone -= 3;
                            inventory.traps = (inventory.traps||0) + 1;
                            ok = true; if (b.craftQueue > 0) b.craftQueue--;
                        } else if (recipe === 'ammo' && (resources.iron||0) >= 2 && (resources.stone||0) >= 1) {
                            resources.iron -= 2; resources.stone -= 1;
                            inventory.ammo = (inventory.ammo||0) + 5;
                            ok = true; if (b.ammoQueue > 0) b.ammoQueue--;
                        }
                        if (ok) {
                            b.craftProgress = 0;
                            if (b._manualCrafting) { b._manualCrafting = false; b._manualRecipe = null; }
                            for (const cid of b.workers) {
                                const c = critters.find(cr => cr.id === cid);
                                if (c) {
                                    const leveled = Critters.addXp(c, 1);
                                    if (leveled && c._lastLevelUp) {
                                        UI.notify(`${c.nickname} leveled up to Lv.${c._lastLevelUp.level}! +${c._lastLevelUp.stat}`);
                                        if (typeof game !== 'undefined' && game.sounds) game.sounds.levelup();
                                    }
                                }
                            }
                        } else { b.craftProgress = craftTime; }
                    }
                }
                continue;
            }

            // Generator: consume gasoline to stay powered
            if (def.isGenerator) {
                if (!b._fuelTimer) b._fuelTimer = 0;
                b._fuelTimer += dt;
                if (b._fuelTimer >= 10) { // check every 10s
                    b._fuelTimer = 0;
                    const fuelNeeded = def.consumeRate * 10;
                    if ((resources[def.consumesResource] || 0) >= fuelNeeded) {
                        resources[def.consumesResource] -= fuelNeeded;
                        b.powered = true;
                    } else {
                        b.powered = false;
                    }
                }
                continue;
            }

            // Gas Refinery: consume oil → produce gasoline
            if (def.consumesResource && def.produces && !def.isGenerator) {
                if (b.workers.length === 0) continue;
                b.productionAccum = (b.productionAccum || 0) + def.baseRate * dt;
                if (b.productionAccum >= 1) {
                    const consumeAmt = def.consumeRate * 10;
                    if ((resources[def.consumesResource] || 0) >= consumeAmt) {
                        resources[def.consumesResource] -= consumeAmt;
                        const gained = Math.floor(b.productionAccum);
                        const cap = resourceCaps ? (resourceCaps[def.produces] || 9999) : 9999;
                        resources[def.produces] = Math.min((resources[def.produces] || 0) + gained, cap);
                        b.productionAccum -= gained;
                    } else {
                        b.productionAccum = 1; // wait
                    }
                }
                continue;
            }

            if (!def.produces || b.workers.length === 0) continue;

            // Power check — extractors (except oil pump) need a powered generator nearby
            if (def.needsPower) {
                const powered = Buildings._isPowered(b, buildings);
                b.powered = powered;
                if (!powered) continue; // no power = no production
            }

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
                    if (c) {
                        const leveled = Critters.addXp(c, gained);
                        if (leveled && c._lastLevelUp) {
                            UI.notify(`${c.nickname} leveled up to Lv.${c._lastLevelUp.level}! +${c._lastLevelUp.stat}`);
                            if (typeof game !== 'undefined' && game.sounds) game.sounds.levelup();
                        }
                    }
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

    // Check if a building is within range of a powered generator
    static _isPowered(building, allBuildings) {
        const bx = (building.gridX + 0.5) * TILE_SIZE;
        const by = (building.gridY + 0.5) * TILE_SIZE;
        for (const gen of allBuildings) {
            const gDef = BUILDING_DEFS[gen.type];
            if (!gDef.isGenerator || !gen.powered) continue;
            const gx = (gen.gridX + 0.5) * TILE_SIZE;
            const gy = (gen.gridY + 0.5) * TILE_SIZE;
            const dist = Math.sqrt((bx - gx) ** 2 + (by - gy) ** 2) / TILE_SIZE;
            if (dist <= (gDef.powerRadius || 8)) return true;
        }
        return false;
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

        // Power status for extractors
        if (def.needsPower) {
            ctx.fillStyle = building.powered ? 'rgba(0,200,0,0.6)' : 'rgba(200,0,0,0.6)';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(building.powered ? '⚡' : '❌', sx + size / 2, sy - 4);
        }

        // Generator power radius
        if (def.isGenerator) {
            if (building.powered) {
                ctx.strokeStyle = 'rgba(255,193,7,0.15)';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.arc(sx + size / 2, sy + size / 2, (def.powerRadius || 8) * TILE_SIZE, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            ctx.fillStyle = building.powered ? '#4ade80' : '#f87171';
            ctx.font = '8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(building.powered ? 'POWERED' : 'NO FUEL', sx + size / 2, sy + size + 8);
        }

        // Assigned critters
        for (let i = 0; i < building.workers.length; i++) {
            const c = critters.find(cr => cr.id === building.workers[i]);
            if (c) Critters.renderAssigned(ctx, c, wx, wy, i, camX, camY, time);
        }
    }
}
