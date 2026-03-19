/* ============================================================
   Critter Colony — Infinite Chunk-Based World
   ============================================================ */

const TILE = { GRASS: 0, TREE: 1, ROCK: 2, WATER: 3, COLONY: 4, PATH: 5, NODE_OIL: 6, NODE_GOLD: 7, NODE_DIAMOND: 8, NODE_CRYSTAL: 9 };

const NODE_COLORS = {
    [TILE.NODE_OIL]:     ['#1a1a1a', '#222'],
    [TILE.NODE_GOLD]:    ['#ffd700', '#e6c200'],
    [TILE.NODE_DIAMOND]: ['#b3e5fc', '#81d4fa'],
    [TILE.NODE_CRYSTAL]: ['#ce93d8', '#ba68c8'],
};

const NODE_INFO = {
    [TILE.NODE_OIL]:     { name: 'Oil Deposit',     resource: 'oil',     color: '#1a1a1a', icon: '🛢️' },
    [TILE.NODE_GOLD]:    { name: 'Gold Vein',        resource: 'gold',    color: '#ffd700', icon: '✨' },
    [TILE.NODE_DIAMOND]: { name: 'Diamond Cluster',  resource: 'diamond', color: '#81d4fa', icon: '💎' },
    [TILE.NODE_CRYSTAL]: { name: 'Arcane Crystal',   resource: 'crystal', color: '#ce93d8', icon: '🔮' },
};
const TILE_SIZE = 32;
const CHUNK_SIZE = 16;

// Legacy compat — other files reference these for initial player placement
const MAP_W = 100;
const MAP_H = 100;
const COLONY_MIN = -16; // colony spans chunks (0,0),(0,-1),(-1,0),(-1,-1) → tiles -32..-1 to 31..0? No — see below
const COLONY_MAX = 15;  // Colony is tiles -32..31 in world coords (4 chunks centered on origin)

// Render distance in chunks around the player
const RENDER_DISTANCE = 3; // 7x7 grid = -3..+3

const TILE_COLORS = {
    [TILE.GRASS]:  ['#4a7c3f','#4e8243','#46763b','#528647'],
    [TILE.TREE]:   ['#2d5a1e'],
    [TILE.ROCK]:   ['#6b6b6b'],
    [TILE.WATER]:  ['#2a6faa','#2d74b0','#2768a2'],
    [TILE.COLONY]: ['#8a7a52','#8e7e56','#867650'],
    [TILE.PATH]:   ['#a89060','#a48a5c','#ac9464'],
    [TILE.NODE_OIL]:     ['#1a1a1a','#222'],
    [TILE.NODE_GOLD]:    ['#8a7a30','#7a6a28'],
    [TILE.NODE_DIAMOND]: ['#5a7a8a','#4a6a7a'],
    [TILE.NODE_CRYSTAL]: ['#6a4a7a','#5a3a6a'],
};

class World {
    constructor() {
        this.chunks = new Map();   // key: "cx,cy" → { tiles: Uint8Array, cx, cy }
        this.seed = 0;
        this.waypoints = [];       // [{ name, x, y, claimed }]
        this._noiseCache = new Map();
        this._gradients = null;
    }

    /* ----------------------------------------------------------
       Generation entry point (called by game.js)
       ---------------------------------------------------------- */
    generate(seed) {
        this.seed = seed || Math.floor(Math.random() * 999999);
        this.chunks.clear();
        this._noiseCache.clear();
        this._initNoiseGradients();

        // Pre-generate the colony chunks and nearby area
        for (let cx = -RENDER_DISTANCE; cx <= RENDER_DISTANCE; cx++) {
            for (let cy = -RENDER_DISTANCE; cy <= RENDER_DISTANCE; cy++) {
                this.getOrGenerateChunk(cx, cy);
            }
        }

        // Default home waypoint at colony center
        this.waypoints = [
            { name: 'Home', x: 0, y: 0, claimed: true }
        ];

        // Generate some initial far waypoints
        this._generateWaypointsInRange(10);
    }

    /* ----------------------------------------------------------
       Chunk management
       ---------------------------------------------------------- */
    getChunkKey(cx, cy) {
        return cx + ',' + cy;
    }

    worldToChunk(worldTileX, worldTileY) {
        // Floor division for negative coords
        const cx = Math.floor(worldTileX / CHUNK_SIZE);
        const cy = Math.floor(worldTileY / CHUNK_SIZE);
        // Local coords within chunk (always 0..CHUNK_SIZE-1)
        let localX = worldTileX - cx * CHUNK_SIZE;
        let localY = worldTileY - cy * CHUNK_SIZE;
        return { cx, cy, localX, localY };
    }

    getOrGenerateChunk(cx, cy) {
        const key = this.getChunkKey(cx, cy);
        let chunk = this.chunks.get(key);
        if (chunk) return chunk;

        chunk = {
            cx, cy,
            tiles: new Uint8Array(CHUNK_SIZE * CHUNK_SIZE)
        };

        this._generateChunkTiles(chunk);
        this.chunks.set(key, chunk);
        return chunk;
    }

    _generateChunkTiles(chunk) {
        const { cx, cy, tiles } = chunk;

        // Colony zone: chunks (0,0), (0,-1), (-1,0), (-1,-1)
        const isColonyChunk = (cx === 0 || cx === -1) && (cy === 0 || cy === -1);

        if (isColonyChunk) {
            tiles.fill(TILE.COLONY);
            return;
        }

        // Use noise for terrain generation
        for (let ly = 0; ly < CHUNK_SIZE; ly++) {
            for (let lx = 0; lx < CHUNK_SIZE; lx++) {
                const wx = cx * CHUNK_SIZE + lx;
                const wy = cy * CHUNK_SIZE + ly;
                const idx = ly * CHUNK_SIZE + lx;

                const n1 = this._noise2D(wx * 0.04, wy * 0.04);       // primary terrain
                const n2 = this._noise2D(wx * 0.08 + 100, wy * 0.08 + 100); // secondary detail
                const n3 = this._noise2D(wx * 0.02 + 500, wy * 0.02 + 500); // large features

                // Water: rivers and ponds
                if (n1 < -0.3) {
                    tiles[idx] = TILE.WATER;
                }
                // Trees: clustered forests
                else if (n1 > 0.4 && n2 > 0.2) {
                    tiles[idx] = TILE.TREE;
                }
                // Rocks: scattered
                else if (n1 > 0.1 && n1 < 0.2 && n2 > 0.42) {
                    tiles[idx] = TILE.ROCK;
                }
                // Default grass
                else {
                    tiles[idx] = TILE.GRASS;
                }

                // Resource nodes — spawn in specific noise ranges, far from colony
                const distFromOrigin = Math.sqrt(wx * wx + wy * wy);
                if (tiles[idx] === TILE.GRASS && distFromOrigin > 40) {
                    const n4 = this._noise2D(wx * 0.015 + 1000, wy * 0.015 + 1000);
                    const n5 = this._noise2D(wx * 0.03 + 2000, wy * 0.03 + 2000);
                    if (n4 > 0.55 && n5 > 0.5 && n2 > 0.6) {
                        // Pick node type based on distance + noise
                        if (distFromOrigin > 120 && n4 > 0.7) tiles[idx] = TILE.NODE_DIAMOND;
                        else if (distFromOrigin > 80 && n4 > 0.62) tiles[idx] = TILE.NODE_GOLD;
                        else if (n5 > 0.65) tiles[idx] = TILE.NODE_CRYSTAL;
                        else tiles[idx] = TILE.NODE_OIL;
                    }
                }
            }
        }
    }

    /* ----------------------------------------------------------
       Tile access — world tile coordinates
       ---------------------------------------------------------- */
    getTile(worldTileX, worldTileY) {
        const { cx, cy, localX, localY } = this.worldToChunk(worldTileX, worldTileY);
        const chunk = this.getOrGenerateChunk(cx, cy);
        return chunk.tiles[localY * CHUNK_SIZE + localX];
    }

    setTile(worldTileX, worldTileY, type) {
        const { cx, cy, localX, localY } = this.worldToChunk(worldTileX, worldTileY);
        const chunk = this.getOrGenerateChunk(cx, cy);
        chunk.tiles[localY * CHUNK_SIZE + localX] = type;
    }

    isWalkable(worldTileX, worldTileY) {
        const t = this.getTile(worldTileX, worldTileY);
        return t === TILE.GRASS || t === TILE.COLONY || t === TILE.PATH
            || t === TILE.NODE_OIL || t === TILE.NODE_GOLD || t === TILE.NODE_DIAMOND || t === TILE.NODE_CRYSTAL;
    }

    isNode(worldTileX, worldTileY) {
        const t = this.getTile(worldTileX, worldTileY);
        return t >= TILE.NODE_OIL && t <= TILE.NODE_CRYSTAL;
    }

    getNodeInfo(worldTileX, worldTileY) {
        const t = this.getTile(worldTileX, worldTileY);
        return NODE_INFO[t] || null;
    }

    isColony(worldTileX, worldTileY) {
        return this.getTile(worldTileX, worldTileY) === TILE.COLONY;
    }

    /* ----------------------------------------------------------
       Colony expansion — convert tiles in radius to COLONY
       ---------------------------------------------------------- */
    expandColony(worldTileX, worldTileY, radius) {
        const r = Math.ceil(radius);
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (dx * dx + dy * dy <= radius * radius) {
                    const tx = worldTileX + dx;
                    const ty = worldTileY + dy;
                    const t = this.getTile(tx, ty);
                    if (t === TILE.GRASS || t === TILE.PATH) {
                        this.setTile(tx, ty, TILE.COLONY);
                    }
                }
            }
        }
    }

    /* ----------------------------------------------------------
       Find random grass tile near a point
       ---------------------------------------------------------- */
    randomGrassTile(nearXOrRng, nearY, radius) {
        // Legacy compat: old call was randomGrassTile(rng)
        if (typeof nearXOrRng === 'function') {
            const rng = nearXOrRng;
            // Search in a wide area around origin
            for (let attempts = 0; attempts < 300; attempts++) {
                const x = -50 + Math.floor(rng() * 100);
                const y = -50 + Math.floor(rng() * 100);
                if (this.getTile(x, y) === TILE.GRASS) return { x, y };
            }
            return { x: -40, y: -40 };
        }

        // New call: randomGrassTile(nearX, nearY, radius)
        const r = radius || 30;
        const rng = this._seededRng(nearXOrRng * 73856093 ^ (nearY || 0) * 19349663 ^ this.seed);
        for (let attempts = 0; attempts < 300; attempts++) {
            const x = nearXOrRng + Math.floor((rng() - 0.5) * 2 * r);
            const y = (nearY || 0) + Math.floor((rng() - 0.5) * 2 * r);
            if (this.getTile(x, y) === TILE.GRASS) return { x, y };
        }
        return { x: nearXOrRng, y: nearY || 0 };
    }

    /* ----------------------------------------------------------
       Chunk loading / unloading based on player position
       ---------------------------------------------------------- */
    updateLoadedChunks(playerWorldX, playerWorldY) {
        const playerTX = Math.floor(playerWorldX / TILE_SIZE);
        const playerTY = Math.floor(playerWorldY / TILE_SIZE);
        const pcx = Math.floor(playerTX / CHUNK_SIZE);
        const pcy = Math.floor(playerTY / CHUNK_SIZE);

        // Load chunks in range
        for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
            for (let dy = -RENDER_DISTANCE; dy <= RENDER_DISTANCE; dy++) {
                this.getOrGenerateChunk(pcx + dx, pcy + dy);
            }
        }

        // Unload distant chunks (keep within 2x render distance)
        const unloadDist = RENDER_DISTANCE * 2;
        for (const [key, chunk] of this.chunks) {
            if (Math.abs(chunk.cx - pcx) > unloadDist || Math.abs(chunk.cy - pcy) > unloadDist) {
                this.chunks.delete(key);
            }
        }
    }

    /* ----------------------------------------------------------
       Waypoint system
       ---------------------------------------------------------- */
    _generateWaypointsInRange(chunkRange) {
        const spacing = 30; // every ~30 chunks
        const halfSpacing = Math.floor(spacing / 2);

        for (let gcx = -chunkRange; gcx <= chunkRange; gcx += spacing) {
            for (let gcy = -chunkRange; gcy <= chunkRange; gcy += spacing) {
                if (gcx === 0 && gcy === 0) continue; // skip colony center

                // Find noise peak in this region for interesting placement
                const baseTX = gcx * CHUNK_SIZE + halfSpacing;
                const baseTY = gcy * CHUNK_SIZE + halfSpacing;

                let bestN = -Infinity;
                let bestX = baseTX;
                let bestY = baseTY;

                // Sample a few points to find a noise peak
                const sampleRng = this._seededRng(gcx * 7919 + gcy * 6271 + this.seed);
                for (let i = 0; i < 20; i++) {
                    const sx = baseTX + Math.floor((sampleRng() - 0.5) * CHUNK_SIZE * 8);
                    const sy = baseTY + Math.floor((sampleRng() - 0.5) * CHUNK_SIZE * 8);
                    const n = this._noise2D(sx * 0.04, sy * 0.04);
                    if (n > bestN && n > -0.2) {
                        bestN = n;
                        bestX = sx;
                        bestY = sy;
                    }
                }

                // Ensure waypoint is on walkable ground
                if (this.getTile(bestX, bestY) !== TILE.GRASS) {
                    // Nudge to nearest grass
                    let found = false;
                    for (let r = 1; r < 10 && !found; r++) {
                        for (let dy = -r; dy <= r && !found; dy++) {
                            for (let dx = -r; dx <= r && !found; dx++) {
                                if (this.getTile(bestX + dx, bestY + dy) === TILE.GRASS) {
                                    bestX += dx;
                                    bestY += dy;
                                    found = true;
                                }
                            }
                        }
                    }
                }

                const exists = this.waypoints.some(w =>
                    Math.abs(w.x - bestX) < CHUNK_SIZE * 5 && Math.abs(w.y - bestY) < CHUNK_SIZE * 5
                );
                if (!exists) {
                    this.waypoints.push({
                        name: 'Waypoint',
                        x: bestX,
                        y: bestY,
                        claimed: false
                    });
                }
            }
        }
    }

    /* ----------------------------------------------------------
       Rendering
       ---------------------------------------------------------- */
    render(ctx, camX, camY, canvasW, canvasH) {
        // Calculate visible tile range (world tile coords)
        const startTX = Math.floor(camX / TILE_SIZE);
        const startTY = Math.floor(camY / TILE_SIZE);
        const endTX = Math.floor((camX + canvasW) / TILE_SIZE) + 1;
        const endTY = Math.floor((camY + canvasH) / TILE_SIZE) + 1;

        // Determine which chunks are visible
        const startCX = Math.floor(startTX / CHUNK_SIZE);
        const startCY = Math.floor(startTY / CHUNK_SIZE);
        const endCX = Math.floor(endTX / CHUNK_SIZE);
        const endCY = Math.floor(endTY / CHUNK_SIZE);

        for (let chunkCX = startCX; chunkCX <= endCX; chunkCX++) {
            for (let chunkCY = startCY; chunkCY <= endCY; chunkCY++) {
                const chunk = this.getOrGenerateChunk(chunkCX, chunkCY);
                this._renderChunk(ctx, chunk, camX, camY, startTX, startTY, endTX, endTY);
            }
        }

        // Render waypoints
        this._renderWaypoints(ctx, camX, camY, canvasW, canvasH);
    }

    _renderChunk(ctx, chunk, camX, camY, visTX0, visTY0, visTX1, visTY1) {
        const chunkWorldTX = chunk.cx * CHUNK_SIZE;
        const chunkWorldTY = chunk.cy * CHUNK_SIZE;

        // Clamp local tile range to visible area
        const lx0 = Math.max(0, visTX0 - chunkWorldTX);
        const ly0 = Math.max(0, visTY0 - chunkWorldTY);
        const lx1 = Math.min(CHUNK_SIZE - 1, visTX1 - chunkWorldTX);
        const ly1 = Math.min(CHUNK_SIZE - 1, visTY1 - chunkWorldTY);

        for (let ly = ly0; ly <= ly1; ly++) {
            for (let lx = lx0; lx <= lx1; lx++) {
                const t = chunk.tiles[ly * CHUNK_SIZE + lx];
                const wx = chunkWorldTX + lx;
                const wy = chunkWorldTY + ly;

                const colors = TILE_COLORS[t];
                if (!colors) continue;
                const ci = ((wx & 0x7FFFFFFF) * 7 + (wy & 0x7FFFFFFF) * 13) % colors.length;
                ctx.fillStyle = colors[ci];

                const sx = wx * TILE_SIZE - camX;
                const sy = wy * TILE_SIZE - camY;
                ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);

                // Tree detail
                if (t === TILE.TREE) {
                    ctx.fillStyle = '#5c3d1e';
                    ctx.fillRect(sx + 12, sy + 12, 8, 8);
                    ctx.fillStyle = '#3a7a28';
                    ctx.beginPath();
                    ctx.arc(sx + 16, sy + 12, 10, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Rock detail
                if (t === TILE.ROCK) {
                    ctx.fillStyle = '#888';
                    ctx.beginPath();
                    ctx.arc(sx + 16, sy + 18, 9, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#999';
                    ctx.beginPath();
                    ctx.arc(sx + 14, sy + 15, 5, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Colony grid lines
                if (t === TILE.COLONY) {
                    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
                    ctx.lineWidth = 0.5;
                    ctx.strokeRect(sx, sy, TILE_SIZE, TILE_SIZE);
                }

                // Path — slightly different shade, no extra decoration

                // Resource nodes
                if (NODE_COLORS[t]) {
                    const nc = NODE_COLORS[t];
                    const nci = (wx * 3 + wy * 7) % nc.length;
                    ctx.fillStyle = nc[nci];
                    ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
                    // Sparkle/indicator
                    const info = NODE_INFO[t];
                    if (info) {
                        ctx.fillStyle = info.color + '66';
                        ctx.beginPath();
                        ctx.arc(sx + 16, sy + 16, 8, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.fillStyle = info.color;
                        ctx.beginPath();
                        ctx.arc(sx + 16, sy + 16, 4, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        }
    }

    _renderWaypoints(ctx, camX, camY, canvasW, canvasH) {
        const time = Date.now() * 0.002;

        for (const wp of this.waypoints) {
            const wpPixelX = wp.x * TILE_SIZE + TILE_SIZE / 2;
            const wpPixelY = wp.y * TILE_SIZE + TILE_SIZE / 2;
            const sx = wpPixelX - camX;
            const sy = wpPixelY - camY;

            const onScreen = sx >= -40 && sx <= canvasW + 40 && sy >= -60 && sy <= canvasH + 40;

            if (onScreen) {
                // Draw pillar / beacon
                const glow = 0.5 + 0.3 * Math.sin(time + wp.x);

                if (wp.claimed) {
                    // Green pillar
                    ctx.fillStyle = `rgba(100, 220, 100, ${0.4 + glow * 0.3})`;
                    ctx.fillRect(sx - 4, sy - 40, 8, 40);

                    // Glow
                    const grad = ctx.createRadialGradient(sx, sy - 20, 2, sx, sy - 20, 25);
                    grad.addColorStop(0, `rgba(100, 255, 100, ${0.4 * glow})`);
                    grad.addColorStop(1, 'rgba(100, 255, 100, 0)');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(sx, sy - 20, 25, 0, Math.PI * 2);
                    ctx.fill();

                    // Name
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 11px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(wp.name, sx, sy - 46);
                } else {
                    // Grey pillar with "?"
                    ctx.fillStyle = `rgba(160, 160, 160, ${0.4 + glow * 0.2})`;
                    ctx.fillRect(sx - 3, sy - 30, 6, 30);

                    const grad = ctx.createRadialGradient(sx, sy - 15, 2, sx, sy - 15, 18);
                    grad.addColorStop(0, `rgba(200, 200, 200, ${0.3 * glow})`);
                    grad.addColorStop(1, 'rgba(200, 200, 200, 0)');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(sx, sy - 15, 18, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = '#ccc';
                    ctx.font = 'bold 14px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText('?', sx, sy - 34);
                }
            } else {
                // Off-screen indicator — compass arrow at screen edge
                const centerX = canvasW / 2;
                const centerY = canvasH / 2;
                const dx = sx - centerX;
                const dy = sy - centerY;
                const angle = Math.atan2(dy, dx);

                // Clamp to screen edge with margin
                const margin = 30;
                const edgeX = Math.max(margin, Math.min(canvasW - margin, centerX + Math.cos(angle) * (canvasW / 2 - margin)));
                const edgeY = Math.max(margin, Math.min(canvasH - margin, centerY + Math.sin(angle) * (canvasH / 2 - margin)));

                // Only show if reasonably close (within ~20 chunks)
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 20 * CHUNK_SIZE * TILE_SIZE) {
                    ctx.save();
                    ctx.translate(edgeX, edgeY);
                    ctx.rotate(angle);

                    // Arrow
                    ctx.fillStyle = wp.claimed ? 'rgba(100, 220, 100, 0.7)' : 'rgba(180, 180, 180, 0.6)';
                    ctx.beginPath();
                    ctx.moveTo(10, 0);
                    ctx.lineTo(-5, -6);
                    ctx.lineTo(-5, 6);
                    ctx.closePath();
                    ctx.fill();

                    ctx.restore();
                }
            }
        }
    }

    /* ----------------------------------------------------------
       Seeded noise system — value noise with interpolation
       ---------------------------------------------------------- */
    _initNoiseGradients() {
        // Create a permutation table seeded from world seed
        this._perm = new Uint8Array(512);
        const rng = this._seededRng(this.seed);
        const p = new Uint8Array(256);
        for (let i = 0; i < 256; i++) p[i] = i;
        // Fisher-Yates shuffle
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            const tmp = p[i]; p[i] = p[j]; p[j] = tmp;
        }
        for (let i = 0; i < 512; i++) this._perm[i] = p[i & 255];
    }

    _noise2D(x, y) {
        // Value noise with smooth interpolation
        const xi = Math.floor(x);
        const yi = Math.floor(y);
        const xf = x - xi;
        const yf = y - yi;

        // Smooth interpolation curve (smootherstep)
        const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
        const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);

        // Hash corner values
        const v00 = this._hashNoise(xi, yi);
        const v10 = this._hashNoise(xi + 1, yi);
        const v01 = this._hashNoise(xi, yi + 1);
        const v11 = this._hashNoise(xi + 1, yi + 1);

        // Bilinear interpolation
        const i1 = v00 + u * (v10 - v00);
        const i2 = v01 + u * (v11 - v01);
        return (i1 + v * (i2 - i1)) * 2 - 1; // map to -1..1
    }

    _hashNoise(ix, iy) {
        // Deterministic hash → 0..1
        const perm = this._perm;
        if (!perm) return 0;
        const a = perm[(ix & 255)];
        const b = perm[(a + (iy & 255)) & 255];
        return b / 255;
    }

    /* ----------------------------------------------------------
       Seeded RNG (LCG) — same as original
       ---------------------------------------------------------- */
    _seededRng(seed) {
        let s = seed;
        return () => {
            s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
            return (s >>> 0) / 0xFFFFFFFF;
        };
    }
}
