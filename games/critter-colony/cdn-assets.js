/* Critter Colony — CDN Asset Configuration */

const CDN_CONFIG = {
    enabled: true,
    baseUrl: 'https://d2f5lfipdzhi8t.cloudfront.net/critter-colony',
    localBasePath: 'images/'
};

function getAssetUrl(path) {
    if (CDN_CONFIG.enabled) return `${CDN_CONFIG.baseUrl}/${path}`;
    return CDN_CONFIG.localBasePath + path;
}

// ─── BUILDING SPRITES ────────────────────────────────────────
const BUILDING_SPRITES = {};

function preloadBuildingSprites() {
    const defs = {
        mine: 'buildings/mine.png',
        lumber_mill: 'buildings/lumber-mill.png',
        farm: 'buildings/farm.png',
        nest: 'buildings/nest.png',
        turret: 'buildings/turret.png',
        research_lab: 'buildings/research-lab.png',
        workbench: 'buildings/workbench.png',
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
        mossbun: 'critters/mossbun.png',
        pebblit: 'critters/pebblit.png',
        flickwing: 'critters/flickwing.png',
        glowmite: 'critters/glowmite.png',
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
        CRITTER_SPRITES[key] = img;
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
// Converts loaded HTML Image objects to PIXI.Texture after preload
const PIXI_BUILDING_TEXTURES = {};
const PIXI_CRITTER_TEXTURES = {};

function buildPixiTextures() {
    for (const [key, img] of Object.entries(BUILDING_SPRITES)) {
        if (img && img.complete && img.naturalWidth > 0) {
            try { PIXI_BUILDING_TEXTURES[key] = PIXI.Texture.from(img); } catch(e) {}
        }
    }
    for (const [key, img] of Object.entries(CRITTER_SPRITES)) {
        if (img && img.complete && img.naturalWidth > 0) {
            try { PIXI_CRITTER_TEXTURES[key] = PIXI.Texture.from(img); } catch(e) {}
        }
    }
}

// Preload everything
function preloadAllAssets() {
    return Promise.all([preloadBuildingSprites(), preloadCritterSprites(), preloadStatIcons()]).then(() => {
        buildPixiTextures();
    });
}
