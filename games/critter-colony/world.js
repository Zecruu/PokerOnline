/* ============================================================
   Critter Colony — World / Tile Map
   ============================================================ */

const TILE = { GRASS: 0, TREE: 1, ROCK: 2, WATER: 3, COLONY: 4 };
const TILE_SIZE = 32;
const MAP_W = 100;
const MAP_H = 100;
const COLONY_MIN = 40;
const COLONY_MAX = 59;

const TILE_COLORS = {
    [TILE.GRASS]:  ['#4a7c3f','#4e8243','#46763b','#528647'],
    [TILE.TREE]:   ['#2d5a1e'],
    [TILE.ROCK]:   ['#6b6b6b'],
    [TILE.WATER]:  ['#2a6faa','#2d74b0','#2768a2'],
    [TILE.COLONY]: ['#8a7a52','#8e7e56','#867650'],
};

class World {
    constructor() {
        this.tiles = null;
        this.seed = 0;
    }

    generate(seed) {
        this.seed = seed || Math.floor(Math.random() * 999999);
        const rng = this._seededRng(this.seed);
        this.tiles = new Array(MAP_W * MAP_H);

        // Fill with grass
        for (let i = 0; i < this.tiles.length; i++) this.tiles[i] = TILE.GRASS;

        // Water border (3-5 tiles deep, irregular)
        for (let x = 0; x < MAP_W; x++) {
            for (let y = 0; y < MAP_H; y++) {
                const distEdge = Math.min(x, y, MAP_W - 1 - x, MAP_H - 1 - y);
                const threshold = 3 + Math.floor(rng() * 3);
                if (distEdge < threshold) {
                    this.tiles[y * MAP_W + x] = TILE.WATER;
                }
            }
        }

        // Colony zone (center 20x20, clear)
        for (let x = COLONY_MIN; x <= COLONY_MAX; x++) {
            for (let y = COLONY_MIN; y <= COLONY_MAX; y++) {
                this.tiles[y * MAP_W + x] = TILE.COLONY;
            }
        }

        // Scatter trees and rocks (outside colony & water)
        for (let x = 0; x < MAP_W; x++) {
            for (let y = 0; y < MAP_H; y++) {
                const t = this.tiles[y * MAP_W + x];
                if (t !== TILE.GRASS) continue;
                const r = rng();
                if (r < 0.12) this.tiles[y * MAP_W + x] = TILE.TREE;
                else if (r < 0.18) this.tiles[y * MAP_W + x] = TILE.ROCK;
            }
        }
    }

    getTile(tx, ty) {
        if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return TILE.WATER;
        return this.tiles[ty * MAP_W + tx];
    }

    isWalkable(tx, ty) {
        const t = this.getTile(tx, ty);
        return t === TILE.GRASS || t === TILE.COLONY;
    }

    isColony(tx, ty) {
        return tx >= COLONY_MIN && tx <= COLONY_MAX && ty >= COLONY_MIN && ty <= COLONY_MAX;
    }

    // Find a random walkable grass tile outside colony
    randomGrassTile(rng) {
        for (let attempts = 0; attempts < 200; attempts++) {
            const x = 6 + Math.floor(rng() * (MAP_W - 12));
            const y = 6 + Math.floor(rng() * (MAP_H - 12));
            if (this.getTile(x, y) === TILE.GRASS) return { x, y };
        }
        return { x: 20, y: 20 };
    }

    render(ctx, camX, camY, canvasW, canvasH) {
        const startTX = Math.max(0, Math.floor((camX) / TILE_SIZE));
        const startTY = Math.max(0, Math.floor((camY) / TILE_SIZE));
        const endTX = Math.min(MAP_W - 1, Math.floor((camX + canvasW) / TILE_SIZE));
        const endTY = Math.min(MAP_H - 1, Math.floor((camY + canvasH) / TILE_SIZE));

        for (let tx = startTX; tx <= endTX; tx++) {
            for (let ty = startTY; ty <= endTY; ty++) {
                const t = this.tiles[ty * MAP_W + tx];
                const colors = TILE_COLORS[t];
                const ci = (tx * 7 + ty * 13) % colors.length;
                ctx.fillStyle = colors[ci];

                const sx = tx * TILE_SIZE - camX;
                const sy = ty * TILE_SIZE - camY;
                ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);

                // Tree trunk
                if (t === TILE.TREE) {
                    ctx.fillStyle = '#5c3d1e';
                    ctx.fillRect(sx + 12, sy + 12, 8, 8);
                    ctx.fillStyle = '#3a7a28';
                    ctx.beginPath();
                    ctx.arc(sx + 16, sy + 12, 10, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Rock shape
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
            }
        }
    }

    _seededRng(seed) {
        let s = seed;
        return () => {
            s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
            return (s >>> 0) / 0xFFFFFFFF;
        };
    }
}
