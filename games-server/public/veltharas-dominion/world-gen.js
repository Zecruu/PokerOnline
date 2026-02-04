/**
 * Procedural Infinite World Generation System
 * Vampire Survivors-style chunk streaming with deterministic RNG
 */

// ============================================
// CONSTANTS
// ============================================
const CHUNK_SIZE = 512;
const ACTIVE_RADIUS = 2; // 5x5 chunk grid around player

// Biome definitions
const BIOMES = {
    ash: {
        name: 'Ashlands',
        tint: { r: 60, g: 20, b: 10 }, // Warm ember
        groundColor: '#0f0a08',
        propWeights: { rock: 0.3, char: 0.25, rubble: 0.2, ember: 0.15, skull: 0.1 }
    },
    grave: {
        name: 'Gravefield',
        tint: { r: 15, g: 40, b: 20 }, // Greenish dead
        groundColor: '#080c08',
        propWeights: { bone: 0.3, weed: 0.25, skull: 0.2, rubble: 0.15, tombstone: 0.1 }
    },
    ruins: {
        name: 'Ruins',
        tint: { r: 15, g: 20, b: 45 }, // Cold bluish
        groundColor: '#08080f',
        propWeights: { rubble: 0.35, pillar: 0.2, rock: 0.2, slab: 0.15, crack: 0.1 }
    }
};

// Prop visual definitions
const PROP_VISUALS = {
    rock: { shape: 'circle', minSize: 4, maxSize: 12, colors: ['#2a2a2a', '#333333', '#252525'] },
    char: { shape: 'circle', minSize: 3, maxSize: 8, colors: ['#1a1a1a', '#151515', '#222222'] },
    rubble: { shape: 'rect', minSize: 5, maxSize: 15, colors: ['#2d2d2d', '#353535', '#282828'] },
    ember: { shape: 'glow', minSize: 2, maxSize: 5, colors: ['#ff4400', '#ff6600', '#cc3300'] },
    skull: { shape: 'icon', icon: '💀', minSize: 8, maxSize: 14, colors: ['#aaaaaa'] },
    bone: { shape: 'line', minSize: 6, maxSize: 16, colors: ['#ccccbb', '#bbbbaa', '#999988'] },
    weed: { shape: 'tuft', minSize: 4, maxSize: 10, colors: ['#2a3320', '#1d2618', '#354028'] },
    tombstone: { shape: 'rect', minSize: 12, maxSize: 20, colors: ['#3a3a3a', '#444444'] },
    pillar: { shape: 'rect', minSize: 8, maxSize: 18, colors: ['#4a4a5a', '#3d3d4d', '#555565'] },
    slab: { shape: 'rect', minSize: 10, maxSize: 25, colors: ['#3a3a45', '#2d2d38'] },
    crack: { shape: 'line', minSize: 15, maxSize: 40, colors: ['#151515', '#1a1a1a'] }
};

// Landmark definitions
const LANDMARKS = {
    obelisk: { width: 20, height: 60, color: '#3a3a4a', glow: '#6644aa' },
    statue: { width: 30, height: 45, color: '#444455', glow: '#4488aa' },
    crater: { radius: 40, color: '#151515', glow: '#ff4400' },
    altar: { width: 35, height: 25, color: '#3d2828', glow: '#aa0000' }
};

// ============================================
// DETERMINISTIC RNG
// ============================================
function hash2D(seed, x, y) {
    // Simple hash combining seed with coordinates
    let h = seed;
    h ^= (x * 374761393) >>> 0;
    h ^= (y * 668265263) >>> 0;
    h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
    return h ^ (h >>> 16);
}

function mulberry32(seed) {
    // Mulberry32 PRNG - fast and good distribution
    return function() {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

// ============================================
// WORLD SYSTEM CLASS
// ============================================
class WorldSystem {
    constructor() {
        this.chunks = new Map();
        this.worldSeed = 0;
        this.debugShowChunkBounds = false;
        this.debugShowGrid = false;
        this.currentPlayerChunkX = null;
        this.currentPlayerChunkY = null;
    }

    init(seed = null) {
        this.worldSeed = seed !== null ? seed : (Date.now() ^ (Math.random() * 0xFFFFFFFF)) >>> 0;
        this.chunks.clear();
        this.currentPlayerChunkX = null;
        this.currentPlayerChunkY = null;
        console.log(`[WorldGen] Initialized with seed: ${this.worldSeed}`);
    }

    getPlayerChunk(worldX, worldY) {
        return {
            cx: Math.floor(worldX / CHUNK_SIZE),
            cy: Math.floor(worldY / CHUNK_SIZE)
        };
    }

    updateChunks(worldX, worldY) {
        const { cx, cy } = this.getPlayerChunk(worldX, worldY);
        
        // Early exit if player hasn't moved to a new chunk
        if (cx === this.currentPlayerChunkX && cy === this.currentPlayerChunkY) {
            return;
        }
        
        this.currentPlayerChunkX = cx;
        this.currentPlayerChunkY = cy;

        // Build set of needed chunk keys
        const neededKeys = new Set();
        for (let dx = -ACTIVE_RADIUS; dx <= ACTIVE_RADIUS; dx++) {
            for (let dy = -ACTIVE_RADIUS; dy <= ACTIVE_RADIUS; dy++) {
                neededKeys.add(`${cx + dx},${cy + dy}`);
            }
        }

        // Generate missing chunks
        for (const key of neededKeys) {
            if (!this.chunks.has(key)) {
                const [chunkX, chunkY] = key.split(',').map(Number);
                this.chunks.set(key, this.generateChunk(chunkX, chunkY));
            }
        }

        // Unload distant chunks
        for (const key of this.chunks.keys()) {
            if (!neededKeys.has(key)) {
                this.chunks.delete(key);
            }
        }
    }

    generateChunk(cx, cy) {
        const chunkSeed = hash2D(this.worldSeed, cx, cy);
        const rand = mulberry32(chunkSeed);

        // Determine biome
        const biomeRoll = rand();
        let biome;
        if (biomeRoll < 0.33) biome = 'ash';
        else if (biomeRoll < 0.66) biome = 'grave';
        else biome = 'ruins';

        const biomeData = BIOMES[biome];
        const chunkWorldX = cx * CHUNK_SIZE;
        const chunkWorldY = cy * CHUNK_SIZE;

        // Generate speckles (micro texture)
        const speckles = [];
        const speckCount = 100 + Math.floor(rand() * 60);
        for (let i = 0; i < speckCount; i++) {
            speckles.push({
                x: chunkWorldX + rand() * CHUNK_SIZE,
                y: chunkWorldY + rand() * CHUNK_SIZE,
                radius: 1 + rand() * 2,
                alpha: 0.03 + rand() * 0.06
            });
        }

        // Generate props using clusters
        const props = this.generateClusteredProps(cx, cy, rand, biome);

        // Maybe generate landmark (8-12% chance)
        let landmark = null;
        if (rand() < 0.10) {
            landmark = this.generateLandmark(chunkWorldX, chunkWorldY, rand);
        }

        return { cx, cy, biome, biomeData, speckles, props, landmark, chunkWorldX, chunkWorldY };
    }

    pickWeightedProp(rand, weights) {
        const entries = Object.entries(weights);
        let total = 0;
        for (const [, w] of entries) total += w;
        let roll = rand() * total;
        for (const [type, w] of entries) {
            roll -= w;
            if (roll <= 0) return type;
        }
        return entries[0][0];
    }

    generateClusteredProps(cx, cy, rand, biome) {
        const props = [];
        const biomeData = BIOMES[biome];
        const chunkWorldX = cx * CHUNK_SIZE;
        const chunkWorldY = cy * CHUNK_SIZE;

        // Generate 3-6 clusters per chunk
        const clusterCount = 3 + Math.floor(rand() * 4);

        for (let c = 0; c < clusterCount; c++) {
            const centerX = chunkWorldX + rand() * CHUNK_SIZE;
            const centerY = chunkWorldY + rand() * CHUNK_SIZE;
            const propCount = 6 + Math.floor(rand() * 15);

            for (let p = 0; p < propCount; p++) {
                const propType = this.pickWeightedProp(rand, biomeData.propWeights);
                const propVisual = PROP_VISUALS[propType];
                const angle = rand() * Math.PI * 2;
                const distance = rand() * 80;

                props.push({
                    type: propType,
                    x: centerX + Math.cos(angle) * distance,
                    y: centerY + Math.sin(angle) * distance,
                    scale: propVisual.minSize + rand() * (propVisual.maxSize - propVisual.minSize),
                    rotation: rand() * Math.PI * 2,
                    color: propVisual.colors[Math.floor(rand() * propVisual.colors.length)],
                    visual: propVisual
                });
            }
        }
        return props;
    }

    generateLandmark(chunkWorldX, chunkWorldY, rand) {
        const types = Object.keys(LANDMARKS);
        const type = types[Math.floor(rand() * types.length)];
        const def = LANDMARKS[type];

        return {
            type,
            x: chunkWorldX + CHUNK_SIZE * 0.3 + rand() * CHUNK_SIZE * 0.4,
            y: chunkWorldY + CHUNK_SIZE * 0.3 + rand() * CHUNK_SIZE * 0.4,
            def,
            glowPhase: rand() * Math.PI * 2
        };
    }

    // ============================================
    // RENDERING METHODS
    // ============================================
    drawWorld(ctx, cameraX, cameraY, canvasW, canvasH, gameTime) {
        const viewLeft = cameraX - 100;
        const viewRight = cameraX + canvasW + 100;
        const viewTop = cameraY - 100;
        const viewBottom = cameraY + canvasH + 100;

        // Draw each active chunk
        for (const chunk of this.chunks.values()) {
            if (chunk.chunkWorldX + CHUNK_SIZE < viewLeft || chunk.chunkWorldX > viewRight ||
                chunk.chunkWorldY + CHUNK_SIZE < viewTop || chunk.chunkWorldY > viewBottom) {
                continue;
            }

            this.drawChunkTint(ctx, chunk, cameraX, cameraY, canvasW, canvasH);
            this.drawSpeckles(ctx, chunk, cameraX, cameraY, viewLeft, viewRight, viewTop, viewBottom);
            this.drawProps(ctx, chunk, cameraX, cameraY, viewLeft, viewRight, viewTop, viewBottom);

            if (chunk.landmark) {
                this.drawLandmark(ctx, chunk.landmark, cameraX, cameraY, gameTime);
            }

            if (this.debugShowChunkBounds) {
                this.drawChunkBounds(ctx, chunk, cameraX, cameraY);
            }
        }

        if (this.debugShowGrid) {
            this.drawDebugGrid(ctx, cameraX, cameraY, canvasW, canvasH);
        }
    }

    drawChunkTint(ctx, chunk, cameraX, cameraY, canvasW, canvasH) {
        const sx = chunk.chunkWorldX - cameraX;
        const sy = chunk.chunkWorldY - cameraY;
        const tint = chunk.biomeData.tint;

        ctx.fillStyle = `rgba(${tint.r}, ${tint.g}, ${tint.b}, 0.15)`;
        ctx.fillRect(sx, sy, CHUNK_SIZE, CHUNK_SIZE);
    }

    drawSpeckles(ctx, chunk, cameraX, cameraY, vL, vR, vT, vB) {
        for (const s of chunk.speckles) {
            if (s.x < vL || s.x > vR || s.y < vT || s.y > vB) continue;
            const sx = s.x - cameraX;
            const sy = s.y - cameraY;
            ctx.beginPath();
            ctx.arc(sx, sy, s.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
            ctx.fill();
        }
    }

    drawProps(ctx, chunk, cameraX, cameraY, vL, vR, vT, vB) {
        for (const p of chunk.props) {
            if (p.x < vL - 30 || p.x > vR + 30 || p.y < vT - 30 || p.y > vB + 30) continue;
            const sx = p.x - cameraX;
            const sy = p.y - cameraY;

            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(p.rotation);

            switch (p.visual.shape) {
                case 'circle':
                    ctx.beginPath();
                    ctx.arc(0, 0, p.scale, 0, Math.PI * 2);
                    ctx.fillStyle = p.color;
                    ctx.fill();
                    break;
                case 'rect':
                    ctx.fillStyle = p.color;
                    ctx.fillRect(-p.scale / 2, -p.scale / 2, p.scale, p.scale * 0.6);
                    break;
                case 'line':
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(-p.scale / 2, 0);
                    ctx.lineTo(p.scale / 2, 0);
                    ctx.stroke();
                    break;
                case 'tuft':
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = 1.5;
                    for (let i = -2; i <= 2; i++) {
                        ctx.beginPath();
                        ctx.moveTo(i * 2, 0);
                        ctx.lineTo(i * 2 + i * 0.5, -p.scale);
                        ctx.stroke();
                    }
                    break;
                case 'glow':
                    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.scale * 2);
                    grad.addColorStop(0, p.color);
                    grad.addColorStop(1, 'transparent');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(0, 0, p.scale * 2, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case 'icon':
                    ctx.font = `${p.scale}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.globalAlpha = 0.4;
                    ctx.fillText(p.visual.icon, 0, 0);
                    break;
            }
            ctx.restore();
        }
    }

    drawLandmark(ctx, lm, cameraX, cameraY, gameTime) {
        const sx = lm.x - cameraX;
        const sy = lm.y - cameraY;
        const def = lm.def;
        const pulse = 0.5 + Math.sin((gameTime || 0) * 0.002 + lm.glowPhase) * 0.3;

        ctx.save();

        // Glow effect
        ctx.shadowBlur = 20 * pulse;
        ctx.shadowColor = def.glow;

        if (lm.type === 'crater') {
            ctx.beginPath();
            ctx.arc(sx, sy, def.radius, 0, Math.PI * 2);
            ctx.fillStyle = def.color;
            ctx.fill();
            ctx.strokeStyle = def.glow;
            ctx.lineWidth = 2;
            ctx.stroke();
        } else {
            ctx.fillStyle = def.color;
            ctx.fillRect(sx - def.width / 2, sy - def.height, def.width, def.height);
            ctx.strokeStyle = def.glow;
            ctx.lineWidth = 2;
            ctx.strokeRect(sx - def.width / 2, sy - def.height, def.width, def.height);
        }

        ctx.restore();
    }

    drawChunkBounds(ctx, chunk, cameraX, cameraY) {
        const sx = chunk.chunkWorldX - cameraX;
        const sy = chunk.chunkWorldY - cameraY;

        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(sx, sy, CHUNK_SIZE, CHUNK_SIZE);
        ctx.setLineDash([]);

        ctx.fillStyle = '#ff00ff';
        ctx.font = '12px monospace';
        ctx.fillText(`${chunk.cx},${chunk.cy} [${chunk.biome}]`, sx + 5, sy + 15);
    }

    drawDebugGrid(ctx, cameraX, cameraY, canvasW, canvasH) {
        const gs = 60;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        const ox = -cameraX % gs;
        const oy = -cameraY % gs;
        for (let x = ox; x < canvasW; x += gs) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvasH);
            ctx.stroke();
        }
        for (let y = oy; y < canvasH; y += gs) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvasW, y);
            ctx.stroke();
        }
    }
}

// Create global instance
const worldSystem = new WorldSystem();

