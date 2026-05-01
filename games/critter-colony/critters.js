/* ============================================================
   Critter Colony — Critter System
   ============================================================
   All data (SPECIES, CRITTER_TYPES, PASSIVES, etc.)
   is loaded from data/*.json by config.js before this file runs.
   Edit the JSON files in data/ to mod critter stats, passives, etc.
   ============================================================ */

let _nextCritterId = 1;

class Critters {
    // Get a critter's role (fighter/enhancer/chef/gatherer). Falls back to legacy `type` during migration.
    static getRole(critter) {
        const sp = SPECIES[critter.species];
        if (!sp) return null;
        return sp.role || sp.type || null;
    }

    // Proficiency-vs-building bonus.
    // Role match: +30% (TYPE_MATCH_BONUS). Role mismatch: -60% (worse than before to make roles matter).
    // No role on building (e.g. nest, hq) = 0%.
    static getTypeBonus(critter, buildingType) {
        const def = (typeof BUILDING_DEFS !== 'undefined') ? BUILDING_DEFS[buildingType] : null;
        if (!def || !def.role) return 0;
        const role = Critters.getRole(critter);
        if (!role) return 0;
        if (role === def.role) return (typeof TYPE_MATCH_BONUS !== 'undefined') ? TYPE_MATCH_BONUS : 0.30;
        return (typeof TYPE_MISMATCH_PENALTY !== 'undefined') ? TYPE_MISMATCH_PENALTY : -0.60;
    }

    // Roll a proficiency value for a newly captured critter.
    // Base from species ± 2 variance, clamped to 1+.
    static rollProficiency(species) {
        const sp = SPECIES[species];
        if (!sp) return 1;
        const base = sp.proficiency || 5;
        const variance = Math.floor(Math.random() * 5) - 2; // -2..+2
        return Math.max(1, base + variance);
    }

    // Legacy shim — keep `stats` object for code that still reads c.stats.X
    // All stats now mirror the proficiency value. Migration handles old saves.
    static rollStats(species) {
        const prof = Critters.rollProficiency(species);
        return { STR: prof, DEX: prof, INT: prof, VIT: prof, LCK: prof, PROF: prof };
    }

    // Hard ceiling for PROF earned from leveling alone. Beyond this, only stars add power.
    static get MAX_BASE_PROF() { return 50; }
    // PROF granted per star, up to 5★. Stars 6+ are cosmetic "Collector's Stars".
    static get STAR_PROF_BONUS() { return 10; }
    static get MAX_STAR_PROF_BONUS() { return Critters.MAX_BASE_PROF_STAR_LEVEL * Critters.STAR_PROF_BONUS; }
    static get MAX_BASE_PROF_STAR_LEVEL() { return 5; }

    // Get a critter's current *effective* proficiency: base (from species+levels, capped at 50)
    // plus star bonus (+10 per star up to 5★). Stars 6+ add no power.
    static getProficiency(critter) {
        const base = Critters.getBaseProficiency(critter);
        const stars = critter.stars || 0;
        const starBonus = Math.min(stars, Critters.MAX_BASE_PROF_STAR_LEVEL) * Critters.STAR_PROF_BONUS;
        return base + starBonus;
    }

    // Base proficiency from species + leveling only (no star bonus). Used for save/level logic.
    static getBaseProficiency(critter) {
        if (critter.proficiency !== undefined) return critter.proficiency;
        if (critter.stats && critter.stats.PROF !== undefined) return critter.stats.PROF;
        if (critter.stats) {
            const keys = ['STR','DEX','INT','VIT','LCK'];
            let sum = 0, n = 0;
            for (const k of keys) { if (typeof critter.stats[k] === 'number') { sum += critter.stats[k]; n++; } }
            if (n > 0) return Math.round(sum / n);
        }
        return 1;
    }

    static rollPassives(speciesRarity) {
        const passives = [];
        // Config-driven passive roll counts and tier weights
        const pr = (typeof BALANCE !== 'undefined' && BALANCE.passiveRolls) ? BALANCE.passiveRolls : null;
        const countMap = pr ? pr.countByRarity : { common: 1, uncommon: 2, rare: 2, legendary: 3 };
        const bonusMap = pr ? pr.bonusChance : { common: 0.15, uncommon: 0.15, rare: 0.30, legendary: 0.50 };
        const tw = pr ? pr.tierWeights : { legendary: 0.03, rare: 0.09, uncommon: 0.23, common: 0.65 };

        const count = countMap[speciesRarity] || 1;
        const bonusChance = bonusMap[speciesRarity] || 0.15;
        const totalSlots = count + (Math.random() < bonusChance ? 1 : 0);

        // Time-based passive tier bias — early game rolls skew common/uncommon.
        const affectsPassives = !(typeof BALANCE !== 'undefined' && BALANCE.worldScaling && BALANCE.worldScaling.affectsPassives === false);
        const ts = affectsPassives ? Critters.timeScale() : 1;
        const twScaled = {
            legendary: tw.legendary * ts,
            rare:      tw.rare      * ts,
            uncommon:  tw.uncommon  * (0.5 + 0.5 * ts),
            common:    tw.common + (1 - ts) * (tw.legendary + tw.rare) + (0.5 * (1 - ts)) * tw.uncommon
        };

        for (let i = 0; i < totalSlots; i++) {
            const roll = Math.random();
            let pool;
            if (roll < twScaled.legendary) pool = PASSIVE_POOL.legendary;
            else if (roll < twScaled.legendary + twScaled.rare) pool = PASSIVE_POOL.rare;
            else if (roll < twScaled.legendary + twScaled.rare + twScaled.uncommon) pool = PASSIVE_POOL.uncommon;
            else pool = PASSIVE_POOL.common;

            const id = pool[Math.floor(Math.random() * pool.length)];
            if (!passives.includes(id)) passives.push(id);
        }
        return passives;
    }

    // Get total passive effect value for a critter
    static getPassiveEffect(critter, effectKey) {
        if (!critter.passives) return 0;
        let total = 0;
        for (const pid of critter.passives) {
            const p = PASSIVES[pid];
            if (!p || !p.effect) continue;
            if (p.effect[effectKey] !== undefined) total += p.effect[effectKey];
        }
        return total;
    }

    static hasPassive(critter, effectKey) {
        if (!critter.passives) return false;
        return critter.passives.some(pid => {
            const p = PASSIVES[pid];
            return p && p.effect && p.effect[effectKey];
        });
    }

    // Time-based scaling: 0 → minScale at t=0, reaches 1.0 at capHours.
    // Gates rarity/level/passive-tier power so new runs aren't overwhelming.
    static timeScale() {
        const cfg = (typeof BALANCE !== 'undefined' && BALANCE.worldScaling) ? BALANCE.worldScaling : null;
        const capH = cfg ? cfg.capHours : 8;
        const minS = cfg ? cfg.minScale : 0.12;
        const t = (typeof game !== 'undefined' && game && typeof game.gameTimeSec === 'number') ? game.gameTimeSec : 0;
        const p = Math.min(1, t / (capH * 3600));
        return minS + (1 - minS) * p;
    }

    // Pick a species weighted by distance from colony center (0,0 in tiles)
    // Inner zones → mostly common; outer zones → higher rarities.
    // Rarity weights are also biased toward common in early game (time scaling).
    // If biome is provided, 40% chance to pick from biome-boosted species.
    static pickSpeciesByDistance(distTiles, biome) {
        const commonKeys = Object.keys(SPECIES).filter(k => SPECIES[k].rarity === 'common');
        const uncommonKeys = Object.keys(SPECIES).filter(k => SPECIES[k].rarity === 'uncommon');
        const rareKeys = Object.keys(SPECIES).filter(k => SPECIES[k].rarity === 'rare');
        const legendaryKeys = Object.keys(SPECIES).filter(k => SPECIES[k].rarity === 'legendary');

        // Rarity weights by distance zone — moddable via balance.json
        const zones = (typeof BALANCE !== 'undefined' && BALANCE.wildCritters) ? BALANCE.wildCritters.rarityByDistance : null;
        let w;
        if (zones) {
            const sorted = Object.values(zones).sort((a, b) => a.maxDist - b.maxDist);
            w = sorted[sorted.length - 1]; // default to farthest
            for (const z of sorted) {
                if (distTiles < z.maxDist) { w = z; break; }
            }
        } else {
            if (distTiles < 55)       w = { legendary: 0.00, rare: 0.00, uncommon: 0.05, common: 0.95 };
            else if (distTiles < 100) w = { legendary: 0.00, rare: 0.05, uncommon: 0.30, common: 0.65 };
            else if (distTiles < 160) w = { legendary: 0.03, rare: 0.22, uncommon: 0.40, common: 0.35 };
            else                      w = { legendary: 0.15, rare: 0.40, uncommon: 0.30, common: 0.15 };
        }

        // Time-based rarity bias — early game, blend weights toward common.
        // At t=0: ~88% common override. At capHours: weights pass through unchanged.
        const affectsRarity = !(typeof BALANCE !== 'undefined' && BALANCE.worldScaling && BALANCE.worldScaling.affectsRarity === false);
        if (affectsRarity) {
            const ts = Critters.timeScale();
            w = {
                legendary: w.legendary * ts,
                rare:      w.rare      * ts,
                uncommon:  w.uncommon  * ts,
                common:    w.common + (1 - ts) * (w.legendary + w.rare + w.uncommon)
            };
        }

        // Biome bonus: 40% chance to force a biome-native species
        if (biome && typeof BIOMES !== 'undefined' && BIOMES[biome] && BIOMES[biome].critterBonus && BIOMES[biome].critterBonus.length > 0) {
            if (Math.random() < 0.40) {
                const pool = BIOMES[biome].critterBonus.filter(k => SPECIES[k]);
                if (pool.length > 0) return pool[Math.floor(Math.random() * pool.length)];
            }
        }

        const roll = Math.random();
        let acc = 0;
        acc += w.legendary; if (roll < acc && legendaryKeys.length) return legendaryKeys[Math.floor(Math.random() * legendaryKeys.length)];
        acc += w.rare;      if (roll < acc && rareKeys.length)      return rareKeys[Math.floor(Math.random() * rareKeys.length)];
        acc += w.uncommon;  if (roll < acc && uncommonKeys.length)  return uncommonKeys[Math.floor(Math.random() * uncommonKeys.length)];
        return commonKeys[Math.floor(Math.random() * commonKeys.length)];
    }

    // Pick a random spawn tile distributed across a range of distances from origin.
    // minDist/maxDist in tiles.
    static pickSpawnTile(world, minDist, maxDist) {
        for (let attempts = 0; attempts < 40; attempts++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = minDist + Math.random() * (maxDist - minDist);
            const tx = Math.round(Math.cos(angle) * dist);
            const ty = Math.round(Math.sin(angle) * dist);
            const pos = world.randomGrassTile(tx, ty, 8);
            if (!world.isColony(pos.x, pos.y)) return pos;
        }
        return { x: minDist | 0, y: 0 };
    }

    static spawnWild(world) {
        const wilds = [];
        const count = WILD_MIN_COUNT + Math.floor(Math.random() * (WILD_MAX_COUNT - WILD_MIN_COUNT + 1));

        for (let i = 0; i < count; i++) {
            const pos = Critters.pickSpawnTile(world, 55, 210);
            const distTiles = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
            const biome = world.getBiome ? world.getBiome(pos.x, pos.y) : 'plains';
            const species = Critters.pickSpeciesByDistance(distTiles, biome);
            const sp = SPECIES[species];
            const level = Critters.levelFromDistance(distTiles, sp.rarity);

            // Boss chance: 3% in far zones (dist > 130), must be uncommon+
            const isBoss = distTiles > 130 && sp.rarity !== 'common' && Math.random() < 0.03;
            const bossMul = isBoss ? 2 : 1;

            const baseHp = (RARITY_HP[sp.rarity] || 30) * bossMul;
            const maxHp = Math.floor(baseHp * Critters.enemyHpMul(level));
            const attackDmg = Math.ceil((sp.attackDmg || 3) * Critters.enemyDmgMul(level) * bossMul);

            let prof = Critters.rollProficiency(species);
            if (isBoss) prof *= 2;
            const stats = { PROF: prof, STR: prof, DEX: prof, INT: prof, VIT: prof, LCK: prof };

            wilds.push({
                id: _nextCritterId++,
                species, level, attackDmg,
                isBoss,
                x: pos.x * TILE_SIZE + TILE_SIZE / 2,
                y: pos.y * TILE_SIZE + TILE_SIZE / 2,
                proficiency: prof,
                stats,
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

    // Distance threshold (in pixels) for full AI updates — ~30 tiles
    // Computed lazily since TILE_SIZE is loaded from config at runtime
    static get AI_RANGE() { return TILE_SIZE * 30; }
    static get AI_RANGE_SQ() { return (TILE_SIZE * 30) ** 2; }

    static updateWild(dt, wildCritters, world, player, buildings, bodyguards) {
        const px = player ? player.x : 0, py = player ? player.y : 0;
        for (let ci = wildCritters.length - 1; ci >= 0; ci--) {
            const c = wildCritters[ci];
            // Stunned — 15s capture window then despawn (always tick, even far away)
            if (c.stunned) {
                c.stunTimer -= dt;
                if (c.stunTimer <= 0) {
                    c._despawned = true;
                }
                continue;
            }

            // Distance culling — skip full AI for critters far from player
            const cdx = c.x - px, cdy = c.y - py;
            const distSq = cdx * cdx + cdy * cdy;
            if (distSq > Critters.AI_RANGE_SQ) {
                // Minimal tick: just drift wander timer so they don't all sync up
                c.wanderTimer -= dt;
                if (c.wanderTimer <= 0) c.wanderTimer = 2 + Math.random() * 4;
                continue;
            }

            const sp = SPECIES[c.species];

            // Aggression — player takes priority over buildings (skip if player dead)
            if ((sp.aggressive || c._aggroed) && player && !player._dead && !c.fleeing) {
                const pdx = player.x - c.x, pdy = player.y - c.y;
                const pDist = Math.sqrt(pdx*pdx + pdy*pdy) / TILE_SIZE;
                const aggroRange = c._aggroed ? Math.max(sp.aggroRange || 6, 12) : (sp.aggroRange || 6);

                if (pDist < aggroRange) {
                    c.state = 'aggro';
                    const speed = 205; // slightly faster than player (200)
                    const len = Math.sqrt(pdx*pdx + pdy*pdy);
                    const stopDist = TILE_SIZE * 1.2; // stop at attack range, don't overlap player
                    if (len > stopDist) {
                        c.x += (pdx / len) * speed * dt;
                        c.y += (pdy / len) * speed * dt;
                    } else if (len > 0) {
                        // Push away slightly if too close (prevent stacking)
                        const pushStr = (stopDist - len) * 2;
                        c.x -= (pdx / len) * pushStr * dt;
                        c.y -= (pdy / len) * pushStr * dt;
                    }
                    if (!c._attackTimer) c._attackTimer = 0;
                    c._attackTimer -= dt;
                    if (pDist < 1.5 && c._attackTimer <= 0) {
                        c._attackTimer = sp.attackCooldown || 1.5;
                        if (player.hp !== undefined) {
                            const rawDmg = c.attackDmg || sp.attackDmg || 3;
                            if (typeof game !== 'undefined' && game.playerTakeDamage) game.playerTakeDamage(rawDmg);
                            else player.hp -= rawDmg;
                            c._justAttacked = true;
                            c._playSlash = true;
                            setTimeout(() => { c._justAttacked = false; }, 300);
                        }
                    }
                    continue;
                } else if (c.state === 'aggro') {
                    c.state = 'idle';
                    c.wanderTimer = 1;
                }
            }

            // Attack bodyguards if nearby
            if (sp.aggressive && bodyguards && bodyguards.length > 0 && c.state !== 'aggro' && !c.fleeing) {
                for (const bg of bodyguards) {
                    const bgx = (bg._patrolX || 0) - c.x, bgy = (bg._patrolY || 0) - c.y;
                    const bgDist = Math.sqrt(bgx * bgx + bgy * bgy) / TILE_SIZE;
                    if (bgDist < (sp.aggroRange || 6)) {
                        c.state = 'aggro_bodyguard';
                        const len = Math.sqrt(bgx * bgx + bgy * bgy);
                        if (len > 15) { c.x += (bgx / len) * 60 * dt; c.y += (bgy / len) * 60 * dt; }
                        if (!c._attackTimer) c._attackTimer = 0;
                        c._attackTimer -= dt;
                        if (bgDist < 1.5 && c._attackTimer <= 0) {
                            c._attackTimer = sp.attackCooldown || 1.5;
                            if (bg.patrolHp !== undefined) bg.patrolHp -= (c.attackDmg || sp.attackDmg || 3);
                            c._justAttacked = true;
                            c._playSlash = true;
                            setTimeout(() => { c._justAttacked = false; }, 300);
                        }
                        break;
                    }
                }
                if (c.state === 'aggro_bodyguard') continue;
            }

            // Attack buildings — all aggressive critters, wider detection range
            if (sp.aggressive && buildings && buildings.length > 0 && c.state !== 'aggro' && !c.fleeing) {
                if (!c._bldgTimer) c._bldgTimer = 0;
                c._bldgTimer -= dt;
                let closestB = null, closestBDist = Infinity;
                for (const b of buildings) {
                    const def = BUILDING_DEFS[b.type];
                    if (def.expander) continue; // don't target expanders
                    const bcx = (b.gridX + def.size / 2) * TILE_SIZE;
                    const bcy = (b.gridY + def.size / 2) * TILE_SIZE;
                    const bdx = bcx - c.x, bdy = bcy - c.y;
                    const bd = Math.sqrt(bdx*bdx + bdy*bdy) / TILE_SIZE;
                    if (bd < 20 && bd < closestBDist) { closestBDist = bd; closestB = b; }
                }
                if (closestB) {
                    const def = BUILDING_DEFS[closestB.type];
                    const bcx = (closestB.gridX + def.size / 2) * TILE_SIZE;
                    const bcy = (closestB.gridY + def.size / 2) * TILE_SIZE;
                    const bdx = bcx - c.x, bdy = bcy - c.y;
                    const bd = Math.sqrt(bdx*bdx + bdy*bdy);
                    c.state = 'attacking_building';
                    if (bd > TILE_SIZE * 1.5) {
                        c.x += (bdx / bd) * 60 * dt;
                        c.y += (bdy / bd) * 60 * dt;
                    } else if (c._bldgTimer <= 0) {
                        c._bldgTimer = sp.attackCooldown || 1.5;
                        const dmg = c.attackDmg || sp.attackDmg || 3;
                        if (closestB.hp !== undefined) {
                            closestB.hp -= dmg;
                            if (typeof game !== 'undefined' && game.sounds) game.sounds.buildingHit();
                        }
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
                    const canWalkTile = world.isWalkable(tx, ty) || (world.getTile(tx, ty) === TILE.WATER && CRITTER_TYPES[sp.type]?.canSwim);
                    if (canWalkTile && !world.isColony(tx, ty)) {
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
                    const speed = 60;
                    c.x += (dx / dist) * speed * dt;
                    c.y += (dy / dist) * speed * dt;
                }
            }
        }
    }

    // ── CRITDEX ──────────────────────────────────────────────────────
    // Capture progression book. Levels gate the rarity tier the player
    // can capture. Each level requires a quota of captures of a specific
    // rarity (replaces the earlier XP-curve approach which advanced too
    // fast on a couple of captures).
    //   Lv1 → Common              start
    //   Lv2 → + Uncommon          quota: 30 commons
    //   Lv3 → + Rare              quota: 20 uncommons
    //   Lv4 → + Legendary         quota: 10 rares
    static get CRITDEX_TIERS() {
        return ['common', 'uncommon', 'rare', 'legendary'];
    }
    static get CRITDEX_LEVEL_REQS() {
        // Indexed by the level being WORKED TOWARD. Each entry is the
        // rarity to capture and the required count. Level 1 has no
        // requirement (you start there).
        return {
            2: { rarity: 'common',   count: 30 },
            3: { rarity: 'uncommon', count: 20 },
            4: { rarity: 'rare',     count: 10 },
        };
    }
    static get CRITDEX_MAX_LEVEL() {
        return 4;
    }
    static getCritdexTierForRarity(rarity) {
        return Critters.CRITDEX_TIERS.indexOf(rarity) + 1; // 1..4, 0 if unknown
    }
    static getCritdexLevelMaxRarity(level) {
        const tier = Math.max(1, Math.min(level, Critters.CRITDEX_TIERS.length));
        return Critters.CRITDEX_TIERS[tier - 1];
    }
    static getCritdexNextRequirement(level) {
        return Critters.CRITDEX_LEVEL_REQS[level + 1] || null;
    }
    static getCritdexProgress(critdex) {
        // Returns { rarity, current, required, ratio, maxed }
        const lvl = (critdex && critdex.level) || 1;
        const req = Critters.getCritdexNextRequirement(lvl);
        if (!req) return { maxed: true, rarity: null, current: 0, required: 0, ratio: 1 };
        const captures = (critdex && critdex.captures) || {};
        const current = Math.min(captures[req.rarity] || 0, req.count);
        return {
            maxed: false,
            rarity: req.rarity,
            current,
            required: req.count,
            ratio: req.count > 0 ? current / req.count : 1,
        };
    }
    static recordCritdexCapture(game, rarity) {
        if (!game.critdex) game.critdex = { level: 1, captures: {} };
        if (!game.critdex.captures) game.critdex.captures = {};
        const cd = game.critdex;
        cd.captures[rarity] = (cd.captures[rarity] || 0) + 1;
        const result = { rarity, leveledUp: false, newLevel: cd.level, unlockedRarity: null };
        // Drain through any level-ups (each level needs its tier quota met)
        while (cd.level < Critters.CRITDEX_MAX_LEVEL) {
            const req = Critters.CRITDEX_LEVEL_REQS[cd.level + 1];
            if (!req) break;
            if ((cd.captures[req.rarity] || 0) < req.count) break;
            cd.level += 1;
            result.leveledUp = true;
            result.newLevel = cd.level;
            result.unlockedRarity = Critters.getCritdexLevelMaxRarity(cd.level);
        }
        return result;
    }

    static attemptCapture(critter, game) {
        const sp = SPECIES[critter.species];
        const rarityTier = Critters.getCritdexTierForRarity(sp.rarity);
        if (!game.critdex) game.critdex = { level: 1, xp: 0 };
        const critdexLevel = game.critdex.level;

        if (rarityTier > critdexLevel) {
            const needRarity = Critters.getCritdexLevelMaxRarity(rarityTier);
            return {
                success: false,
                reason: `Critdex Lv${rarityTier} needed for ${needRarity} critters (you're Lv${critdexLevel}).`,
            };
        }

        const px = game.player.x;
        const py = game.player.y;
        const dx = critter.x - px;
        const dy = critter.y - py;
        const dist = Math.sqrt(dx * dx + dy * dy) / TILE_SIZE;

        if (dist > CAPTURE_RANGE) return { success: false, reason: 'Too far away!' };

        // Each successful capture counts toward the Critdex quota for
        // its rarity. Caller surfaces toasts via the returned `critdex`.
        const recordCapture = () => Critters.recordCritdexCapture(game, sp.rarity);

        // Stunned = guaranteed capture
        if (critter.stunned) {
            const prof = critter.proficiency !== undefined ? critter.proficiency : Critters.rollProficiency(critter.species);
            const captured = {
                id: critter.id, species: critter.species,
                nickname: SPECIES[critter.species].name,
                proficiency: prof,
                stats: { PROF: prof }, // legacy shim for code that still reads stats
                level: 1, xp: 0, assignment: null,
                passives: Critters.rollPassives(SPECIES[critter.species].rarity),
                patrolHp: 50, patrolMaxHp: 50,
                hunger: 100,
                stars: 0,
            };
            const critdex = recordCapture();
            return { success: true, captured, critdex };
        }

        // HP bonus: lower HP = easier capture
        const baseRate = CATCH_RATES[SPECIES[critter.species].rarity] || 0.5;
        const hpBonus = (1 - critter.hp / critter.maxHp) * 0.3;
        const captureBonus = (game.research?.captureBonus || 0) * 0.1;
        const rate = Math.min(0.95, baseRate + hpBonus + captureBonus);
        const roll = Math.random();

        if (roll < rate) {
            // Success!
            const prof = critter.proficiency !== undefined ? critter.proficiency : Critters.rollProficiency(critter.species);
            const captured = {
                id: critter.id,
                species: critter.species,
                nickname: SPECIES[critter.species].name,
                proficiency: prof,
                stats: { PROF: prof }, // legacy shim
                level: 1,
                xp: 0,
                assignment: null,
                passives: Critters.rollPassives(SPECIES[critter.species].rarity),
                patrolHp: 50, patrolMaxHp: 50,
                hunger: 100,
                stars: 0,
            };
            const critdex = recordCapture();
            return { success: true, captured, critdex };
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
        const boss = critter.isBoss;
        const scale = boss ? 2.0 : 1.0;

        // Shadow — bigger for bosses
        ctx.fillStyle = boss ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(sx, sy + 12 * scale, 10 * scale, 4 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Boss glow ring
        if (boss) {
            ctx.strokeStyle = `rgba(255,215,0,${0.3 + Math.sin(time * 4) * 0.2})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sx, sy + bob, 18, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Body — use sprite if available
        const sprite = typeof CRITTER_SPRITES !== 'undefined' ? CRITTER_SPRITES[critter.species] : null;
        const r = 12 * scale;
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

        // Boss crown + name plate
        if (boss) {
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('\u{1F451}', sx, sy + bob - r - 8);
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 8px monospace';
            ctx.fillText('BOSS', sx, sy + bob - r - 18);
        }

        // Stunned visual
        if (critter.stunned) {
            ctx.globalAlpha = 0.5 + Math.sin(time * 10) * 0.3;
            ctx.strokeStyle = '#ffd54f';
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(sx, sy + bob, r + 2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#ffd54f';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('\u2605', sx - 6 * scale, sy + bob - r - 2);
            ctx.fillText('\u2605', sx + 6 * scale, sy + bob - r - 2);
        }

        // HP bar (show when damaged) — wider for bosses
        if (critter.hp < critter.maxHp && !critter.stunned) {
            const barW = boss ? 40 : 20;
            const barH = boss ? 5 : 3;
            const bx = sx - barW / 2;
            const by = sy + bob - r - 6;
            ctx.fillStyle = '#333';
            ctx.fillRect(bx, by, barW, barH);
            const pct = critter.hp / critter.maxHp;
            ctx.fillStyle = pct > 0.5 ? '#4ade80' : pct > 0.25 ? '#fbbf24' : '#f87171';
            ctx.fillRect(bx, by, barW * pct, barH);
            // HP text for bosses
            if (boss) {
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 7px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`${Math.floor(critter.hp)}/${critter.maxHp}`, sx, by - 2);
            }
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

    // Uses balance.json values if loaded, otherwise defaults
    static get MAX_LEVEL() { return (typeof BALANCE !== 'undefined' && BALANCE.leveling) ? BALANCE.leveling.maxLevel : 100; }

    // ─── SHARED LEVELING ─────────────────────────────────────
    // Enemy level based on distance from colony (tiles) + rarity tier bonus.
    // Adds some variance so two enemies next to each other can differ slightly.
    static get RARITY_LEVEL_BONUS() { return (typeof BALANCE !== 'undefined' && BALANCE.leveling) ? BALANCE.leveling.rarityLevelBonus : { common: 0, uncommon: 8, rare: 18, legendary: 30 }; }

    static levelFromDistance(distTiles, rarity) {
        const base = Math.max(1, Math.floor(distTiles / 4));
        const bonus = Critters.RARITY_LEVEL_BONUS[rarity] || 0;
        const variance = Math.floor(Math.random() * 5);
        const raw = base + bonus + variance;
        // Time scaling — early runs produce low-level critters even far from colony.
        const ts = Critters.timeScale();
        const scaled = Math.round(raw * ts);
        return Math.max(1, Math.min(Critters.MAX_LEVEL, scaled));
    }

    // HP multiplier for a given enemy level. Keeps L1 at 1x, ramps to ~13x by L100.
    static enemyHpMul(level) {
        const scale = (typeof BALANCE !== 'undefined' && BALANCE.leveling) ? BALANCE.leveling.enemyHpScale : 0.12;
        return 1 + (level - 1) * scale;
    }

    // Damage multiplier — gentler than HP so late-game isn't one-shotty.
    static enemyDmgMul(level) {
        const scale = (typeof BALANCE !== 'undefined' && BALANCE.leveling) ? BALANCE.leveling.enemyDmgScale : 0.05;
        return 1 + (level - 1) * scale;
    }

    // Recycle a dead critter — reset it and teleport to a new spawn location
    static recycle(critter, world) {
        const pos = Critters.pickSpawnTile(world, 55, 210);
        const distTiles = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
        const biome = world.getBiome ? world.getBiome(pos.x, pos.y) : 'plains';
        const species = Critters.pickSpeciesByDistance(distTiles, biome);
        const sp = SPECIES[species];
        const level = Critters.levelFromDistance(distTiles, sp.rarity);

        const isBoss = distTiles > 130 && sp.rarity !== 'common' && Math.random() < 0.03;
        const bossMul = isBoss ? 2 : 1;

        const baseHp = (RARITY_HP[sp.rarity] || 30) * bossMul;
        const maxHp = Math.floor(baseHp * Critters.enemyHpMul(level));
        const attackDmg = Math.ceil((sp.attackDmg || 3) * Critters.enemyDmgMul(level) * bossMul);

        let prof = Critters.rollProficiency(species);
        if (isBoss) prof *= 2;
        const stats = { PROF: prof, STR: prof, DEX: prof, INT: prof, VIT: prof, LCK: prof };

        critter.species = species;
        critter.level = level;
        critter.attackDmg = attackDmg;
        critter.isBoss = isBoss;
        critter.x = pos.x * TILE_SIZE + TILE_SIZE / 2;
        critter.y = pos.y * TILE_SIZE + TILE_SIZE / 2;
        critter.proficiency = prof;
        critter.stats = stats;
        critter.hp = maxHp;
        critter.maxHp = maxHp;
        critter.stunned = false;
        critter.stunTimer = 0;
        critter.state = 'idle';
        critter.wanderTarget = null;
        critter.wanderTimer = Math.random() * 3;
        critter.fleeing = false;
        critter.fleeTimer = 0;
        critter._aggroed = false;
        critter._attackTimer = 0;
        critter._bldgTimer = 0;
        critter._despawned = false;
        critter._justAttacked = false;
    }

    static getXpForLevel(level) {
        const b = (typeof BALANCE !== 'undefined' && BALANCE.leveling) ? BALANCE.leveling.xpFormula : { base: 50, exponent: 1.5 };
        return Math.floor(b.base * Math.pow(level, b.exponent));
    }

    static addXp(critter, amount) {
        if (critter.level >= Critters.MAX_LEVEL) return false;
        critter.xp += amount;
        const needed = Critters.getXpForLevel(critter.level);
        if (critter.xp >= needed) {
            critter.xp -= needed;
            critter.level++;

            // Level up: +1 PROF (primary advancement) + 25% chance for bonus +1.
            // Capped at MAX_BASE_PROF (50). Beyond that, only stars grant more PROF.
            if (critter.proficiency === undefined) critter.proficiency = Critters.getBaseProficiency(critter);
            const cap = Critters.MAX_BASE_PROF;
            const rawGain = 1 + (Math.random() < 0.25 ? 1 : 0);
            const gain = Math.max(0, Math.min(rawGain, cap - critter.proficiency));
            critter.proficiency += gain;
            // Keep legacy stats object in sync
            if (critter.stats) {
                critter.stats.PROF = critter.proficiency;
                for (const k of ['STR','DEX','INT','VIT','LCK']) {
                    if (critter.stats[k] !== undefined) critter.stats[k] = critter.proficiency;
                }
            } else {
                critter.stats = { PROF: critter.proficiency };
            }

            critter._lastLevelUp = { level: critter.level, stat: 'PROF', gain };
            return true;
        }
        return false;
    }
}
