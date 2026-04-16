/* ============================================================
   Critter Colony — Hostile Enemy System
   ============================================================
   Non-capturable hostile enemies that spawn based on biome,
   distance, and time of day. They attack player, critters,
   and buildings. Drop loot on death.

   Enemy data loaded from data/enemies.json by config.js.
   ============================================================ */

let _nextEnemyId = 10000;

// Preloaded enemy sprites
const ENEMY_SPRITES = {};

function preloadEnemySprites() {
    if (typeof ENEMY_DEFS === 'undefined') return;
    for (const key of Object.keys(ENEMY_DEFS)) {
        const img = new Image();
        img.src = `images/enemies/${key}.webp`;
        ENEMY_SPRITES[key] = img;
    }
}

class Enemies {
    static MAX_ENEMIES = 15;
    static SPAWN_INTERVAL = 30; // seconds between spawn checks
    static DESPAWN_DIST = 60; // tiles from player to despawn

    // Spawn enemies based on player position, biome, and time of day
    static spawnCheck(world, playerX, playerY, existingEnemies) {
        if (typeof ENEMY_DEFS === 'undefined') return [];
        if (existingEnemies.length >= Enemies.MAX_ENEMIES) return [];

        const playerTX = Math.floor(playerX / TILE_SIZE);
        const playerTY = Math.floor(playerY / TILE_SIZE);
        const dist = Math.sqrt(playerTX * playerTX + playerTY * playerTY);
        const biome = world.getBiome ? world.getBiome(playerTX, playerTY) : 'plains';
        const isNight = world.dayNightCycle ? world.dayNightCycle.isNight : false;

        const spawned = [];
        const toSpawn = Math.min(3, Enemies.MAX_ENEMIES - existingEnemies.length);

        for (let i = 0; i < toSpawn; i++) {
            // Build candidate pool
            const candidates = [];
            for (const [key, def] of Object.entries(ENEMY_DEFS)) {
                if (def.nightOnly && !isNight) continue;
                if (dist < def.minDist) continue;
                if (!def.biomes.includes(biome)) continue;
                candidates.push({ key, def, weight: def.spawnWeight || 1 });
            }
            if (candidates.length === 0) continue;

            // Weighted random pick
            const totalWeight = candidates.reduce((s, c) => s + c.weight, 0);
            let roll = Math.random() * totalWeight;
            let picked = candidates[0];
            for (const c of candidates) {
                roll -= c.weight;
                if (roll <= 0) { picked = c; break; }
            }

            // Spawn at random angle from player, 15-25 tiles out
            const angle = Math.random() * Math.PI * 2;
            const spawnDist = (15 + Math.random() * 10) * TILE_SIZE;
            const sx = playerX + Math.cos(angle) * spawnDist;
            const sy = playerY + Math.sin(angle) * spawnDist;

            // Scale HP/damage with distance from colony
            const scaleFactor = 1 + (dist / 200) * 0.5;

            spawned.push({
                id: _nextEnemyId++,
                type: picked.key,
                x: sx, y: sy,
                hp: Math.floor(picked.def.hp * scaleFactor),
                maxHp: Math.floor(picked.def.hp * scaleFactor),
                damage: Math.floor(picked.def.damage * scaleFactor),
                _attackTimer: 0,
                _burrowed: picked.def.burrows || false,
                _burrowTimer: 0,
                _fireTrailTimer: 0,
                _aggroed: false,
                state: 'idle',
                wanderTarget: null,
                wanderTimer: Math.random() * 3,
            });
        }
        return spawned;
    }

    // Update all enemies
    static update(dt, enemies, player, critters, world, projectiles) {
        if (typeof ENEMY_DEFS === 'undefined') return;
        const isNight = world.dayNightCycle ? world.dayNightCycle.isNight : false;

        for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            const def = ENEMY_DEFS[e.type];
            if (!def) { enemies.splice(i, 1); continue; }

            // Shadow stalkers flee at dawn
            if (def.nightOnly && !isNight) {
                e.hp = 0; // disintegrate
                enemies.splice(i, 1);
                continue;
            }

            // Despawn if too far from player
            const pdx = e.x - player.x, pdy = e.y - player.y;
            const pDistTiles = Math.sqrt(pdx * pdx + pdy * pdy) / TILE_SIZE;
            if (pDistTiles > Enemies.DESPAWN_DIST) {
                enemies.splice(i, 1);
                continue;
            }

            // Dead
            if (e.hp <= 0) continue;

            // Burrower mechanic
            if (def.burrows) {
                if (e._burrowed) {
                    e._burrowTimer -= dt;
                    // Surface when player is close
                    if (pDistTiles < def.aggroRange) {
                        e._burrowed = false;
                        e._burrowTimer = def.burrowCooldown || 5;
                    }
                    continue; // invisible while burrowed
                } else {
                    e._burrowTimer -= dt;
                    if (e._burrowTimer <= 0 && pDistTiles > def.aggroRange * 1.5) {
                        e._burrowed = true;
                        e._burrowTimer = def.burrowCooldown || 5;
                        continue;
                    }
                }
            }

            const speed = def.speed || 80;

            // Targeting — poachers target critters first
            let targetX = player.x, targetY = player.y;
            if (def.targetsCreatures && critters && critters.length > 0) {
                // Find nearest player-owned critter on patrol/bodyguard
                let nearestC = null, nearestCDist = Infinity;
                for (const c of critters) {
                    if (c.assignment !== 'patrol' && c.assignment !== 'bodyguard') continue;
                    if (c.injured) continue;
                    const cx = c._patrolX || player.x, cy = c._patrolY || player.y;
                    const cd = Math.sqrt((e.x - cx) ** 2 + (e.y - cy) ** 2);
                    if (cd < nearestCDist) { nearestCDist = cd; nearestC = c; }
                }
                if (nearestC && nearestCDist < def.aggroRange * TILE_SIZE) {
                    targetX = nearestC._patrolX || player.x;
                    targetY = nearestC._patrolY || player.y;
                }
            }

            // Chase target
            const dx = targetX - e.x, dy = targetY - e.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const aggroPixels = def.aggroRange * TILE_SIZE;

            if (dist < aggroPixels) {
                e._aggroed = true;
                e.state = 'aggro';

                // Move toward target
                const stopDist = def.ranged ? TILE_SIZE * 6 : TILE_SIZE * 1.2;
                if (dist > stopDist) {
                    e.x += (dx / dist) * speed * dt;
                    e.y += (dy / dist) * speed * dt;
                }

                // Attack
                e._attackTimer -= dt;
                if (e._attackTimer <= 0 && dist < (def.ranged ? aggroPixels : TILE_SIZE * 1.8)) {
                    e._attackTimer = def.attackCooldown || 1.5;

                    if (def.ranged && projectiles) {
                        // Shoot projectile at target
                        const pSpeed = def.projectileSpeed || 250;
                        const angle = Math.atan2(dy, dx);
                        projectiles.push({
                            x: e.x, y: e.y,
                            vx: Math.cos(angle) * pSpeed,
                            vy: Math.sin(angle) * pSpeed,
                            damage: e.damage,
                            lifetime: 2,
                            fromEnemy: true,
                            enemyId: e.id,
                        });
                    } else if (dist < TILE_SIZE * 1.8) {
                        // Melee — damage player if target is player
                        const isTargetingPlayer = Math.abs(targetX - player.x) < 1 && Math.abs(targetY - player.y) < 1;
                        if (isTargetingPlayer && typeof game !== 'undefined' && game.playerTakeDamage) {
                            game.playerTakeDamage(e.damage);
                        }
                    }
                }
            } else {
                // Wander
                e.state = 'idle';
                e.wanderTimer -= dt;
                if (e.wanderTimer <= 0) {
                    e.wanderTarget = {
                        x: e.x + (Math.random() - 0.5) * TILE_SIZE * 8,
                        y: e.y + (Math.random() - 0.5) * TILE_SIZE * 8,
                    };
                    e.wanderTimer = 3 + Math.random() * 4;
                }
                if (e.wanderTarget) {
                    const wx = e.wanderTarget.x - e.x, wy = e.wanderTarget.y - e.y;
                    const wd = Math.sqrt(wx * wx + wy * wy);
                    if (wd > 4) {
                        e.x += (wx / wd) * speed * 0.4 * dt;
                        e.y += (wy / wd) * speed * 0.4 * dt;
                    } else {
                        e.wanderTarget = null;
                    }
                }
            }

            // Fire trail (magma golem)
            if (def.fireTrail && e.state === 'aggro') {
                e._fireTrailTimer -= dt;
                if (e._fireTrailTimer <= 0) {
                    e._fireTrailTimer = 0.5;
                    if (!e._fireTrails) e._fireTrails = [];
                    e._fireTrails.push({ x: e.x, y: e.y, timer: def.fireTrailDuration || 4 });
                }
                // Update fire trail timers
                if (e._fireTrails) {
                    for (let fi = e._fireTrails.length - 1; fi >= 0; fi--) {
                        e._fireTrails[fi].timer -= dt;
                        if (e._fireTrails[fi].timer <= 0) e._fireTrails.splice(fi, 1);
                    }
                    // Damage player if standing on fire
                    if (player) {
                        for (const ft of e._fireTrails) {
                            const fx = ft.x - player.x, fy = ft.y - player.y;
                            if (Math.sqrt(fx * fx + fy * fy) < TILE_SIZE * 0.8) {
                                if (typeof game !== 'undefined' && game.playerTakeDamage) {
                                    game.playerTakeDamage(def.fireTrailDamage || 3);
                                }
                                break;
                            }
                        }
                    }
                }
            }
        }
    }

    // Handle damage to an enemy — returns loot if killed
    static damage(enemy, amount) {
        if (!enemy || enemy.hp <= 0) return null;
        enemy.hp -= amount;
        enemy._aggroed = true;
        if (enemy.hp <= 0) {
            const def = typeof ENEMY_DEFS !== 'undefined' ? ENEMY_DEFS[enemy.type] : null;
            return def ? { ...def.loot } : null;
        }
        return null;
    }

    // Render an enemy
    static render(ctx, enemy, camX, camY, time) {
        const def = typeof ENEMY_DEFS !== 'undefined' ? ENEMY_DEFS[enemy.type] : null;
        if (!def) return;
        if (enemy._burrowed) return; // invisible

        const sx = enemy.x - camX;
        const sy = enemy.y - camY;
        const bob = Math.sin(time * 3 + enemy.id) * 2;
        const size = (def.size || 1);
        const r = 12 * size;

        // Fire trails
        if (enemy._fireTrails) {
            for (const ft of enemy._fireTrails) {
                const fx = ft.x - camX, fy = ft.y - camY;
                const fa = Math.min(1, ft.timer / 2);
                ctx.fillStyle = `rgba(255,100,0,${fa * 0.4})`;
                ctx.beginPath();
                ctx.arc(fx, fy, TILE_SIZE * 0.4, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(sx, sy + r, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body — sprite or fallback
        const sprite = ENEMY_SPRITES[enemy.type];
        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(sx, sy + bob, r, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(sprite, sx - r, sy + bob - r, r * 2, r * 2);
            ctx.restore();
        } else {
            // Fallback colored circle with red outline
            ctx.fillStyle = def.color || '#f44';
            ctx.beginPath();
            ctx.arc(sx, sy + bob, r * 0.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(200,40,40,0.8)';
            ctx.lineWidth = 2;
            ctx.stroke();
            // Red eyes
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(sx - r * 0.2, sy + bob - r * 0.15, 2, 0, Math.PI * 2);
            ctx.arc(sx + r * 0.2, sy + bob - r * 0.15, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Hostile indicator — red skull
        ctx.fillStyle = '#f44';
        ctx.font = `bold ${Math.floor(8 * size)}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('\u2620', sx, sy + bob - r - 4);

        // Name
        ctx.fillStyle = '#ff6b6b';
        ctx.font = 'bold 7px monospace';
        ctx.fillText(def.name, sx, sy + bob - r - 12);

        // HP bar
        if (enemy.hp < enemy.maxHp) {
            const barW = 24 * size;
            const barH = 3;
            const bx = sx - barW / 2;
            const by = sy + bob - r - 2;
            ctx.fillStyle = '#333';
            ctx.fillRect(bx, by, barW, barH);
            const pct = enemy.hp / enemy.maxHp;
            ctx.fillStyle = '#f44';
            ctx.fillRect(bx, by, barW * pct, barH);
        }

        // Aggro ring
        if (enemy.state === 'aggro') {
            ctx.strokeStyle = `rgba(255,50,50,${0.4 + Math.sin(time * 6) * 0.2})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(sx, sy + bob, r + 3, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Burrowing indicator (sand particles before emerging)
        if (enemy._burrowTimer > 0 && !enemy._burrowed && enemy._burrowTimer < 1) {
            ctx.fillStyle = 'rgba(194,168,77,0.5)';
            for (let p = 0; p < 5; p++) {
                const px = sx + Math.sin(time * 8 + p * 1.3) * r;
                const py = sy + Math.cos(time * 8 + p * 1.3) * r * 0.5;
                ctx.fillRect(px - 1, py - 1, 3, 3);
            }
        }
    }
}
