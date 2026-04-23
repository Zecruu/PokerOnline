/* Critter Colony — CDN Asset Configuration */

const CDN_CONFIG = {
    enabled: true,
    baseUrl: 'https://d2f5lfipdzhi8t.cloudfront.net/critter-colony',
    localBasePath: 'images/'
};

const ASSET_VERSION = 5; // bump to bust CDN cache

function getAssetUrl(path) {
    if (CDN_CONFIG.enabled) return `${CDN_CONFIG.baseUrl}/${path}?v=${ASSET_VERSION}`;
    return CDN_CONFIG.localBasePath + path;
}

// ─── BUILDING SPRITES ────────────────────────────────────────
const BUILDING_SPRITES = {};

function preloadBuildingSprites() {
    const defs = {
        hq: 'buildings/hq.png',
        mine: 'buildings/mine.png',
        lumber_mill: 'buildings/lumber-mill.png',
        farm: 'buildings/farm.png',
        nest: 'buildings/nest.png',
        turret: 'buildings/turret.png',
        doctrine_building: 'buildings/research-lab.png',
        workbench: 'buildings/workbench.png',
        iron_mine: 'buildings/iron-mine.png',
        wall: 'buildings/wall.png',
        gate: 'buildings/gate.png',
    };
    const promises = [];
    for (const [key, path] of Object.entries(defs)) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        const p = new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
        });
        img.src = getAssetUrl(path);
        BUILDING_SPRITES[key] = img;
        promises.push(p);
    }
    return Promise.allSettled(promises);
}

// ─── CRITTER SPRITES ─────────────────────────────────────────
const CRITTER_SPRITES = {};

function preloadCritterSprites() {
    const defs = {
        mossbun: 'critters/mossbun.png', pebblit: 'critters/pebblit.png',
        flickwing: 'critters/flickwing.png', glowmite: 'critters/glowmite.png',
        thornback: 'critters/thornback.png', emberfox: 'critters/emberfox.png',
        crystalhorn: 'critters/crystalhorn.png', stormwing: 'critters/stormwing.png',
        ironshell: 'critters/ironshell.png', venomaw: 'critters/venomaw.png',
        shadowfang: 'critters/shadowfang.png', celestine: 'critters/celestine.png',
        mudgrub: 'critters/mudgrub.png', dustmite: 'critters/dustmite.png',
        puffshroom: 'critters/puffshroom.png', scraprat: 'critters/scraprat.png',
        bogwalker: 'critters/bogwalker.png', sparkfly: 'critters/sparkfly.png',
        rotjaw: 'critters/rotjaw.png', goretusk: 'critters/goretusk.png',
        faewisp: 'critters/faewisp.png', dreadmaw: 'critters/dreadmaw.png',
        pixibell: 'critters/pixibell.png',
    };
    const promises = [];
    for (const [key, path] of Object.entries(defs)) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        const localPath = CDN_CONFIG.localBasePath + path;
        const p = new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = () => { img.src = localPath; img.onload = resolve; img.onerror = resolve; };
        });
        img.src = getAssetUrl(path);
        CRITTER_SPRITES[key] = img;
        promises.push(p);
    }
    return Promise.allSettled(promises);
}

// ─── RESOURCE ICONS ──────────────────────────────────────────
const RES_ICONS = {};

function preloadResIcons() {
    const defs = {
        wood: 'icons/res-wood.png', stone: 'icons/res-stone.png', food: 'icons/res-food.png',
        iron: 'icons/res-iron.png', oil: 'icons/res-oil.png', gold: 'icons/res-gold.png',
        diamond: 'icons/res-diamond.png', crystal: 'icons/res-crystal.png',
        gasoline: 'icons/res-gasoline.png', metal: 'icons/res-metal.png',
        trap: 'icons/res-trap.png', ammo: 'icons/res-ammo.png', aethershard: 'icons/res-aethershard.png',
    };
    const promises = [];
    for (const [key, path] of Object.entries(defs)) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        const p = new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });
        img.src = getAssetUrl(path);
        RES_ICONS[key] = img;
        promises.push(p);
    }
    return Promise.allSettled(promises);
}

// ─── STAT ICONS ──────────────────────────────────────────────
const STAT_ICONS = {};

function preloadStatIcons() {
    const defs = { str: 'icons/str.png', dex: 'icons/dex.png', int: 'icons/int.png', vit: 'icons/vit.png', lck: 'icons/lck.png' };
    const promises = [];
    for (const [key, path] of Object.entries(defs)) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        const p = new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });
        img.src = getAssetUrl(path);
        STAT_ICONS[key] = img;
        promises.push(p);
    }
    return Promise.allSettled(promises);
}

// ─── PIXI TEXTURE CACHE ─────────────────────────────────────
// Load directly via PIXI.Texture.from(url) for reliable WebGL textures
const PIXI_BUILDING_TEXTURES = {};
const PIXI_CRITTER_TEXTURES = {};
// World-tile sprites (trees, rocks, resource nodes). Keyed by sprite name
// (tree-1, tree-2, rock-1, rock-2, node-oil, node-gold, node-diamond, node-crystal).
const PIXI_TILE_TEXTURES = {};
let _pixiTexturesReady = false;

function _loadPixiTex(path) {
    // Try CDN first, fall back to local
    const cdnUrl = CDN_CONFIG.enabled ? `${CDN_CONFIG.baseUrl}/${path}` : null;
    const localUrl = CDN_CONFIG.localBasePath + path;
    try {
        const tex = PIXI.Texture.from(cdnUrl || localUrl);
        // If CDN fails, the baseTexture error handler will switch to local
        if (cdnUrl) {
            tex.baseTexture.resource?.source?.addEventListener?.('error', () => {
                try { tex.baseTexture.resource.source.src = localUrl; } catch(e) {}
            });
        }
        return tex;
    } catch(e) {
        try { return PIXI.Texture.from(localUrl); } catch(e2) { return null; }
    }
}

function buildPixiTextures() {
    if (typeof PIXI === 'undefined') return;
    const buildingDefs = {
        hq: 'buildings/hq.png',
        mine: 'buildings/mine.png', lumber_mill: 'buildings/lumber-mill.png',
        farm: 'buildings/farm.png', nest: 'buildings/nest.png',
        turret: 'buildings/turret.png', doctrine_building: 'buildings/research-lab.png',
        workbench: 'buildings/workbench.png', iron_mine: 'buildings/iron-mine.png',
        wall: 'buildings/wall.png', gate: 'buildings/gate.png',
    };
    const critterDefs = {
        mossbun: 'critters/mossbun.png', pebblit: 'critters/pebblit.png',
        flickwing: 'critters/flickwing.png', glowmite: 'critters/glowmite.png',
        thornback: 'critters/thornback.png', emberfox: 'critters/emberfox.png',
        crystalhorn: 'critters/crystalhorn.png', stormwing: 'critters/stormwing.png',
        ironshell: 'critters/ironshell.png', venomaw: 'critters/venomaw.png',
        shadowfang: 'critters/shadowfang.png', celestine: 'critters/celestine.png',
        mudgrub: 'critters/mudgrub.png', dustmite: 'critters/dustmite.png',
        puffshroom: 'critters/puffshroom.png', scraprat: 'critters/scraprat.png',
        bogwalker: 'critters/bogwalker.png', sparkfly: 'critters/sparkfly.png',
        rotjaw: 'critters/rotjaw.png', goretusk: 'critters/goretusk.png',
        faewisp: 'critters/faewisp.png', dreadmaw: 'critters/dreadmaw.png',
        pixibell: 'critters/pixibell.png',
    };
    for (const [key, path] of Object.entries(buildingDefs)) {
        const t = _loadPixiTex(path);
        if (t) PIXI_BUILDING_TEXTURES[key] = t;
    }
    for (const [key, path] of Object.entries(critterDefs)) {
        const t = _loadPixiTex(path);
        if (t) PIXI_CRITTER_TEXTURES[key] = t;
    }
    // World-tile sprites
    const tileDefs = {
        'tree-1':       'tiles/tree-1.png',
        'tree-2':       'tiles/tree-2.png',
        'rock-1':       'tiles/rock-1.png',
        'rock-2':       'tiles/rock-2.png',
        'node-oil':     'tiles/node-oil.png',
        'node-gold':    'tiles/node-gold.png',
        'node-diamond': 'tiles/node-diamond.png',
        'node-crystal': 'tiles/node-crystal.png',
    };
    for (const [key, path] of Object.entries(tileDefs)) {
        const t = _loadPixiTex(path);
        if (t) PIXI_TILE_TEXTURES[key] = t;
    }
    _pixiTexturesReady = true;
}

// ─── PLAYER SPRITES ──────────────────────────────────────────
const PLAYER_SPRITES = {};

function preloadPlayerSprites() {
    const defs = {
        front: 'player/player-front.png',
        back: 'player/player-back.png',
        left: 'player/player-left.png',
        // right = left flipped in code
    };
    const promises = [];
    for (const [key, path] of Object.entries(defs)) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        const p = new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });
        img.src = getAssetUrl(path);
        PLAYER_SPRITES[key] = img;
        promises.push(p);
    }
    return Promise.allSettled(promises);
}

// Preload everything
function preloadAllAssets() {
    // HTML Image preload for UI panels (img tags in DOM)
    const htmlPreload = Promise.all([preloadBuildingSprites(), preloadCritterSprites(), preloadStatIcons(), preloadResIcons(), preloadPlayerSprites()]);
    // PIXI texture load (for WebGL rendering)
    buildPixiTextures();
    return htmlPreload;
}
