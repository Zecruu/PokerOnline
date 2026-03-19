/* ============================================================
   Critter Colony — Critter System
   ============================================================ */

const SPECIES = {
    // ── COMMON (4) ──────────────────────────────────────────
    mossbun:     { name: 'Mossbun',     color: '#66bb6a', rarity: 'common',    baseStats: { STR:3, DEX:4, INT:3, VIT:7, LCK:3 }, desc: 'A gentle grass critter. Great farmer.', aggressive: false, attackDmg: 2, attackCooldown: 2, size: 1 },
    pebblit:     { name: 'Pebblit',     color: '#90a4ae', rarity: 'common',    baseStats: { STR:7, DEX:3, INT:2, VIT:5, LCK:3 }, desc: 'Tough little rock critter. Born to mine.', aggressive: true, aggroRange: 8, attackDmg: 4, attackCooldown: 1.2, size: 1 },
    flickwing:   { name: 'Flickwing',   color: '#ffd54f', rarity: 'common',    baseStats: { STR:2, DEX:8, INT:4, VIT:3, LCK:3 }, desc: 'Fast and nimble. Excellent at crafting.', aggressive: false, attackDmg: 2, attackCooldown: 1.5, size: 1 },
    thornback:   { name: 'Thornback',   color: '#558b2f', rarity: 'common',    baseStats: { STR:5, DEX:3, INT:2, VIT:6, LCK:4 }, desc: 'Spiky hedgehog critter. Tough and reliable.', aggressive: true, aggroRange: 6, attackDmg: 5, attackCooldown: 1.4, size: 1 },

    // ── UNCOMMON (3) ────────────────────────────────────────
    glowmite:    { name: 'Glowmite',    color: '#ce93d8', rarity: 'uncommon',  baseStats: { STR:2, DEX:3, INT:8, VIT:3, LCK:4 }, desc: 'A mysterious luminous critter. Great researcher.', aggressive: true, aggroRange: 10, attackDmg: 6, attackCooldown: 1.8, size: 1 },
    emberfox:    { name: 'Emberfox',    color: '#ff7043', rarity: 'uncommon',  baseStats: { STR:5, DEX:7, INT:3, VIT:4, LCK:5 }, desc: 'A fiery fox. Fast attacker and decent crafter.', aggressive: true, aggroRange: 10, attackDmg: 7, attackCooldown: 1.0, size: 1.2 },
    crystalhorn: { name: 'Crystalhorn', color: '#7e57c2', rarity: 'uncommon',  baseStats: { STR:6, DEX:2, INT:4, VIT:7, LCK:5 }, desc: 'Crystalline beetle. Incredibly sturdy miner.', aggressive: true, aggroRange: 8, attackDmg: 8, attackCooldown: 1.6, size: 1.3 },

    // ── RARE (3) ────────────────────────────────────────────
    stormwing:   { name: 'Stormwing',   color: '#42a5f5', rarity: 'rare',      baseStats: { STR:4, DEX:10, INT:7, VIT:4, LCK:6 }, desc: 'Electric bird. Lightning fast, great at everything.', aggressive: true, aggroRange: 14, attackDmg: 10, attackCooldown: 0.8, size: 1.3 },
    ironshell:   { name: 'Ironshell',   color: '#78909c', rarity: 'rare',      baseStats: { STR:9, DEX:2, INT:3, VIT:12, LCK:5 }, desc: 'Armored turtle. Nearly indestructible tank.', aggressive: true, aggroRange: 6, attackDmg: 12, attackCooldown: 2.0, size: 1.5 },
    venomaw:     { name: 'Venomaw',     color: '#ab47bc', rarity: 'rare',      baseStats: { STR:7, DEX:6, INT:5, VIT:5, LCK:8 }, desc: 'Toxic frog. Poisons enemies and boosts luck.', aggressive: true, aggroRange: 12, attackDmg: 9, attackCooldown: 1.2, size: 1.2 },

    // ── LEGENDARY (2) ───────────────────────────────────────
    shadowfang:  { name: 'Shadowfang',  color: '#5c2d91', rarity: 'legendary', baseStats: { STR:12, DEX:10, INT:6, VIT:8, LCK:8 }, desc: 'Dark wolf of shadow. Devastating in combat.', aggressive: true, aggroRange: 18, attackDmg: 18, attackCooldown: 0.7, size: 1.8 },
    celestine:   { name: 'Celestine',   color: '#e0f7fa', rarity: 'legendary', baseStats: { STR:6, DEX:8, INT:14, VIT:10, LCK:10 }, desc: 'Celestial deer. Divine researcher and healer.', aggressive: true, aggroRange: 16, attackDmg: 14, attackCooldown: 1.0, size: 1.8 },
};

const RARITY_COLORS = { common: '#aaa', uncommon: '#8bc34a', rare: '#ffc107', legendary: '#e040fb' };
const CATCH_RATES = { common: 0.70, uncommon: 0.40, rare: 0.20, legendary: 0.05 };
const RARITY_HP = { common: 30, uncommon: 50, rare: 80, legendary: 150 };
const WILD_MIN_COUNT = 16;
const WILD_MAX_COUNT = 24;
const CAPTURE_RANGE = 2.5; // in tiles

let _nextCritterId = 1;

class Critters {
    static rollStats(species) {
        const base = SPECIES[species].baseStats;
        const stats = {};
        for (const key of Object.keys(base)) {
            stats[key] = Math.max(1, base[key] + Math.floor(Math.random() * 5) - 2);
        }
        return stats;
    }

    static spawnWild(world) {
        const wilds = [];
        const rng = world._seededRng(world.seed + 7777);
        const count = WILD_MIN_COUNT + Math.floor(Math.random() * (WILD_MAX_COUNT - WILD_MIN_COUNT + 1));

        const commonKeys = Object.keys(SPECIES).filter(k => SPECIES[k].rarity === 'common');
        const uncommonKeys = Object.keys(SPECIES).filter(k => SPECIES[k].rarity === 'uncommon');
        const rareKeys = Object.keys(SPECIES).filter(k => SPECIES[k].rarity === 'rare');
        const legendaryKeys = Object.keys(SPECIES).filter(k => SPECIES[k].rarity === 'legendary');

        for (let i = 0; i < count; i++) {
            const pos = world.randomGrassTile(rng);
            // Weight by rarity: 50% common, 25% uncommon, 18% rare, 7% legendary
            let species;
            const roll = Math.random();
            if (roll < 0.07 && legendaryKeys.length > 0) species = legendaryKeys[Math.floor(Math.random() * legendaryKeys.length)];
            else if (roll < 0.25 && rareKeys.length > 0) species = rareKeys[Math.floor(Math.random() * rareKeys.length)];
            else if (roll < 0.50 && uncommonKeys.length > 0) species = uncommonKeys[Math.floor(Math.random() * uncommonKeys.length)];
            else species = commonKeys[Math.floor(Math.random() * commonKeys.length)];

            const maxHp = RARITY_HP[SPECIES[species].rarity] || 30;
            wilds.push({
                id: _nextCritterId++,
                species,
                x: pos.x * TILE_SIZE + TILE_SIZE / 2,
                y: pos.y * TILE_SIZE + TILE_SIZE / 2,
                stats: Critters.rollStats(species),
                hp: maxHp,
                maxHp,
                stunned: false,
                stunTimer: 0,
                state: 'idle',
                wanderTarget: null,
                wanderTimer: Math.random() * 3,
                fleeing: false,
                fleeTimer: 0,
            });
        }
        return wilds;
    }

    static damageWild(critter, damage) {
        if (critter.stunned) return; // Already downed — don't reset timer
        critter.hp = Math.max(0, critter.hp - damage);
        if (critter.hp <= 0) {
            critter.stunned = true;
            critter.stunTimer = 15; // 15 seconds to capture before despawn
            critter.state = 'idle';
            critter.fleeing = false;
            critter._aggroed = false;
        } else {
            critter._aggroed = true;
            critter.state = 'aggro';
        }
    }

    static updateWild(dt, wildCritters, world, player, buildings) {
        for (let ci = wildCritters.length - 1; ci >= 0; ci--) {
            const c = wildCritters[ci];
            // Stunned — 15s capture window then despawn
            if (c.stunned) {
                c.stunTimer -= dt;
                if (c.stunTimer <= 0) {
                    // Despawn — not captured in time
                    c._despawned = true;
                    wildCritters.splice(ci, 1);
                }
                continue;
            }

            // Aggression check — naturally aggressive OR was hit
            const sp = SPECIES[c.species];
            if ((sp.aggressive || c._aggroed) && player && !c.fleeing) {
                const pdx = player.x - c.x, pdy = player.y - c.y;
                const pDist = Math.sqrt(pdx*pdx + pdy*pdy) / TILE_SIZE;

                const aggroRange = c._aggroed ? Math.max(sp.aggroRange || 6, 12) : (sp.aggroRange || 6);
                if (pDist < aggroRange) {
                    c.state = 'aggro';
                    // Chase player
                    const speed = 70;
                    const len = Math.sqrt(pdx*pdx + pdy*pdy);
                    if (len > 15) {
                        c.x += (pdx / len) * speed * dt;
                        c.y += (pdy / len) * speed * dt;
                    }
                    // Attack when close
                    if (!c._attackTimer) c._attackTimer = 0;
                    c._attackTimer -= dt;
                    if (pDist < 1.2 && c._attackTimer <= 0) {
                        c._attackTimer = sp.attackCooldown || 1.5;
                        if (player.hp !== undefined) {
                            player.hp -= sp.attackDmg || 3;
                            c._justAttacked = true;
                            setTimeout(() => { c._justAttacked = false; }, 300);
                        }
                    }
                    continue;
                } else if (c.state === 'aggro') {
                    c.state = 'idle';
                    c.wanderTimer = 1;
                }
            }

            // Attack buildings when aggressive and no player nearby
            if ((sp.aggressive || c._aggroed) && buildings && c.state !== 'aggro') {
                if (!c._bldgTimer) c._bldgTimer = 0;
                c._bldgTimer -= dt;
                let closestB = null, closestBDist = Infinity;
                for (const b of buildings) {
                    const def = BUILDING_DEFS[b.type];
                    const bcx = (b.gridX + def.size / 2) * TILE_SIZE;
                    const bcy = (b.gridY + def.size / 2) * TILE_SIZE;
                    const bdx = bcx - c.x, bdy = bcy - c.y;
                    const bd = Math.sqrt(bdx*bdx + bdy*bdy) / TILE_SIZE;
                    if (bd < 8 && bd < closestBDist) { closestBDist = bd; closestB = b; }
                }
                if (closestB) {
                    const def = BUILDING_DEFS[closestB.type];
                    const bcx = (closestB.gridX + def.size / 2) * TILE_SIZE;
                    const bcy = (closestB.gridY + def.size / 2) * TILE_SIZE;
                    const bdx = bcx - c.x, bdy = bcy - c.y;
                    const bd = Math.sqrt(bdx*bdx + bdy*bdy);
                    c.state = 'attacking_building';
                    if (bd > TILE_SIZE * 1.5) {
                        c.x += (bdx / bd) * 50 * dt;
                        c.y += (bdy / bd) * 50 * dt;
                    } else if (c._bldgTimer <= 0) {
                        c._bldgTimer = sp.attackCooldown || 1.5;
                        const dmg = sp.attackDmg || 3;
                        if (closestB.hp !== undefined) closestB.hp -= dmg;
                        c._justAttacked = true;
                        setTimeout(() => { c._justAttacked = false; }, 300);
                    }
                    continue;
                } else if (c.state === 'attacking_building') {
                    c.state = 'idle'; c.wanderTimer = 1;
                }
            }

            // Fleeing
            if (c.fleeing) {
                c.fleeTimer -= dt;
                if (c.fleeTimer <= 0) {
                    c.fleeing = false;
                    c.state = 'idle';
                    c.wanderTimer = 2;
                }
                if (c.wanderTarget) {
                    const dx = c.wanderTarget.x - c.x;
                    const dy = c.wanderTarget.y - c.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 2) {
                        c.x += (dx / dist) * 150 * dt;
                        c.y += (dy / dist) * 150 * dt;
                    }
                }
                continue;
            }

            // Wander AI
            if (c.state === 'idle') {
                c.wanderTimer -= dt;
                if (c.wanderTimer <= 0) {
                    // Pick random nearby tile
                    const tx = Math.floor(c.x / TILE_SIZE) + Math.floor(Math.random() * 7) - 3;
                    const ty = Math.floor(c.y / TILE_SIZE) + Math.floor(Math.random() * 7) - 3;
                    if (world.isWalkable(tx, ty) && !world.isColony(tx, ty)) {
                        c.wanderTarget = { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
                        c.state = 'walking';
                    }
                    c.wanderTimer = 2 + Math.random() * 3;
                }
            } else if (c.state === 'walking') {
                if (!c.wanderTarget) { c.state = 'idle'; continue; }
                const dx = c.wanderTarget.x - c.x;
                const dy = c.wanderTarget.y - c.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 3) {
                    c.state = 'idle';
                    c.wanderTimer = 2 + Math.random() * 4;
                } else {
                    const speed = 45;
                    c.x += (dx / dist) * speed * dt;
                    c.y += (dy / dist) * speed * dt;
                }
            }
        }
    }

    static attemptCapture(critter, game) {
        if (game.inventory.traps <= 0) return { success: false, reason: 'No traps!' };

        const px = game.player.x;
        const py = game.player.y;
        const dx = critter.x - px;
        const dy = critter.y - py;
        const dist = Math.sqrt(dx * dx + dy * dy) / TILE_SIZE;

        if (dist > CAPTURE_RANGE) return { success: false, reason: 'Too far away!' };

        game.inventory.traps--;

        // Stunned = guaranteed capture
        if (critter.stunned) {
            const captured = {
                id: critter.id, species: critter.species,
                nickname: SPECIES[critter.species].name,
                stats: critter.stats, level: 1, xp: 0, assignment: null,
            };
            return { success: true, captured };
        }

        // HP bonus: lower HP = easier capture
        const baseRate = CATCH_RATES[SPECIES[critter.species].rarity] || 0.5;
        const hpBonus = (1 - critter.hp / critter.maxHp) * 0.3;
        const captureBonus = (game.research?.captureBonus || 0) * 0.1;
        const rate = Math.min(0.95, baseRate + hpBonus + captureBonus);
        const roll = Math.random();

        if (roll < rate) {
            // Success!
            const captured = {
                id: critter.id,
                species: critter.species,
                nickname: SPECIES[critter.species].name,
                stats: critter.stats,
                level: 1,
                xp: 0,
                assignment: null,
            };
            return { success: true, captured };
        } else {
            // Fail — critter flees
            critter.fleeing = true;
            critter.fleeTimer = 3;
            const angle = Math.atan2(critter.y - py, critter.x - px);
            critter.wanderTarget = {
                x: critter.x + Math.cos(angle) * TILE_SIZE * 6,
                y: critter.y + Math.sin(angle) * TILE_SIZE * 6,
            };
            return { success: false, reason: 'It escaped!' };
        }
    }

    static renderWild(ctx, critter, camX, camY, time) {
        const sp = SPECIES[critter.species];
        const sx = critter.x - camX;
        const sy = critter.y - camY;
        const bob = Math.sin(time * 3 + critter.id) * 2;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(sx, sy + 12, 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body — use sprite if available
        const sprite = typeof CRITTER_SPRITES !== 'undefined' ? CRITTER_SPRITES[critter.species] : null;
        const r = 12;
        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(sx, sy + bob, r, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(sprite, sx - r, sy + bob - r, r * 2, r * 2);
            ctx.restore();
        } else {
            ctx.fillStyle = sp.color;
            ctx.beginPath();
            ctx.arc(sx, sy + bob, 8, 0, Math.PI * 2);
            ctx.fill();
            // Eyes
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(sx - 3, sy + bob - 2, 2.5, 0, Math.PI * 2);
            ctx.arc(sx + 3, sy + bob - 2, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#222';
            ctx.beginPath();
            ctx.arc(sx - 2.5, sy + bob - 2, 1.2, 0, Math.PI * 2);
            ctx.arc(sx + 3.5, sy + bob - 2, 1.2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Stunned visual
        if (critter.stunned) {
            ctx.globalAlpha = 0.5 + Math.sin(time * 10) * 0.3;
            ctx.strokeStyle = '#ffd54f';
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(sx, sy + bob, 12, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;
            // Stars above head
            ctx.fillStyle = '#ffd54f';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('\u2605', sx - 6, sy + bob - 14);
            ctx.fillText('\u2605', sx + 6, sy + bob - 14);
        }

        // HP bar (show when damaged)
        if (critter.hp < critter.maxHp && !critter.stunned) {
            const barW = 20;
            const barH = 3;
            const bx = sx - barW / 2;
            const by = sy + bob - 16;
            ctx.fillStyle = '#333';
            ctx.fillRect(bx, by, barW, barH);
            const pct = critter.hp / critter.maxHp;
            ctx.fillStyle = pct > 0.5 ? '#4ade80' : pct > 0.25 ? '#fbbf24' : '#f87171';
            ctx.fillRect(bx, by, barW * pct, barH);
        }

        // Aggro indicator
        if (critter.state === 'aggro') {
            ctx.strokeStyle = 'rgba(248,113,113,0.7)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sx, sy + bob, 11, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#f87171';
            ctx.font = 'bold 8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('!', sx, sy + bob - 14);
        }

        // Rarity glow for uncommon+
        if (sp.rarity !== 'common') {
            ctx.strokeStyle = RARITY_COLORS[sp.rarity] + '66';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sx, sy + bob, 11, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    static renderAssigned(ctx, critter, bx, by, index, camX, camY, time) {
        const sp = SPECIES[critter.species];
        const ox = (index % 2) * 18 + 8;
        const oy = Math.floor(index / 2) * 18 + 40;
        const sx = bx - camX + ox;
        const sy = by - camY + oy;
        const bob = Math.sin(time * 4 + critter.id) * 1.5;

        ctx.fillStyle = sp.color;
        ctx.beginPath();
        ctx.arc(sx, sy + bob, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    static MAX_LEVEL = 20;

    static getXpForLevel(level) {
        return Math.floor(50 * Math.pow(level, 1.5));
    }

    static addXp(critter, amount) {
        if (critter.level >= Critters.MAX_LEVEL) return false;
        critter.xp += amount;
        const needed = Critters.getXpForLevel(critter.level);
        if (critter.xp >= needed) {
            critter.xp -= needed;
            critter.level++;

            // Level up: boost 2 stats — primary stat + random stat
            const sp = SPECIES[critter.species];
            const statKeys = Object.keys(critter.stats);
            // Find the species' best base stat
            let primaryStat = statKeys[0];
            let bestVal = 0;
            for (const k of statKeys) {
                if (sp.baseStats[k] > bestVal) { bestVal = sp.baseStats[k]; primaryStat = k; }
            }
            // Always boost primary
            critter.stats[primaryStat]++;
            // 50% chance to also boost a random stat
            if (Math.random() < 0.5) {
                const other = statKeys[Math.floor(Math.random() * statKeys.length)];
                critter.stats[other]++;
            }

            // Track what leveled for UI notification
            critter._lastLevelUp = { level: critter.level, stat: primaryStat };
            return true;
        }
        return false;
    }
}
