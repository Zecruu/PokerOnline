/* ============================================================
   Critter Colony — Critter System
   ============================================================ */

const SPECIES = {
    mossbun:   { name: 'Mossbun',   color: '#66bb6a', rarity: 'common',   baseStats: { STR:3, DEX:4, INT:3, VIT:7, LCK:3 }, desc: 'A gentle grass critter. Great farmer.' },
    pebblit:   { name: 'Pebblit',   color: '#90a4ae', rarity: 'common',   baseStats: { STR:7, DEX:3, INT:2, VIT:5, LCK:3 }, desc: 'Tough little rock critter. Born to mine.' },
    flickwing: { name: 'Flickwing', color: '#ffd54f', rarity: 'common',   baseStats: { STR:2, DEX:8, INT:4, VIT:3, LCK:3 }, desc: 'Fast and nimble. Excellent at crafting.' },
    glowmite:  { name: 'Glowmite', color: '#ce93d8', rarity: 'uncommon', baseStats: { STR:2, DEX:3, INT:8, VIT:3, LCK:4 }, desc: 'A mysterious luminous critter. Great researcher.' },
};

const RARITY_COLORS = { common: '#aaa', uncommon: '#8bc34a', rare: '#ffc107', legendary: '#e040fb' };
const CATCH_RATES = { common: 0.70, uncommon: 0.40, rare: 0.20, legendary: 0.05 };
const RARITY_HP = { common: 30, uncommon: 50, rare: 80, legendary: 150 };
const WILD_MIN_COUNT = 12;
const WILD_MAX_COUNT = 16;
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
        const speciesKeys = Object.keys(SPECIES);

        for (let i = 0; i < count; i++) {
            const pos = world.randomGrassTile(rng);
            // Weight by rarity
            let species;
            const roll = Math.random();
            if (roll < 0.15) species = 'glowmite';
            else species = speciesKeys[Math.floor(Math.random() * 3)]; // first 3 are common

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
        critter.hp = Math.max(0, critter.hp - damage);
        if (critter.hp <= 0) {
            critter.stunned = true;
            critter.stunTimer = 5;
            critter.state = 'idle';
            critter.fleeing = false;
        }
    }

    static updateWild(dt, wildCritters, world) {
        for (const c of wildCritters) {
            // Stunned
            if (c.stunned) {
                c.stunTimer -= dt;
                if (c.stunTimer <= 0) {
                    c.stunned = false;
                    c.hp = c.maxHp;
                    c.state = 'idle';
                    c.wanderTimer = 2;
                }
                continue;
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
                        c.x += (dx / dist) * 120 * dt;
                        c.y += (dy / dist) * 120 * dt;
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
                    const speed = 30;
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
        ctx.ellipse(sx, sy + 10, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body
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

    static getXpForLevel(level) {
        return Math.floor(50 * Math.pow(level, 1.5));
    }

    static addXp(critter, amount) {
        critter.xp += amount;
        const needed = Critters.getXpForLevel(critter.level);
        if (critter.xp >= needed) {
            critter.xp -= needed;
            critter.level++;
            // Random stat boost on level up
            const statKeys = Object.keys(critter.stats);
            const key = statKeys[Math.floor(Math.random() * statKeys.length)];
            critter.stats[key]++;
            return true; // leveled up
        }
        return false;
    }
}
