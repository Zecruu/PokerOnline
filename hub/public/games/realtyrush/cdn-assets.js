/* ============================================================
   RealtyRush — CDN Asset Configuration
   Same S3/CloudFront as Velthara's Dominion
   ============================================================ */

const CDN_CONFIG = {
    enabled: true,
    baseUrl: 'https://d2f5lfipdzhi8t.cloudfront.net/realtyrush',
    localBasePath: 'images/'
};

function getAssetUrl(path) {
    if (CDN_CONFIG.enabled) {
        return `${CDN_CONFIG.baseUrl}/${path}`;
    }
    return CDN_CONFIG.localBasePath + path;
}

// ─── CHARACTER ICONS ─────────────────────────────────────────
const CHARACTER_ASSETS = {
    mobBossJerry: {
        icon: 'characters/mob-boss-jerry.png',
        name: 'Mob Boss Jerry',
    },
    divinaMarina: {
        icon: 'characters/divina-marina.png',
        name: 'Divina Marina',
    },
    homelessJoe: {
        icon: 'characters/homeless-joe.png',
        name: 'Homeless Joe',
    },
    mrRichardson: {
        icon: 'characters/mr-richardson.png',
        name: 'Mr Richardson',
    },
    grannyMildred: {
        icon: 'characters/granny-mildred.png',
        name: 'Granny Mildred',
    },
    baronessVivienne: {
        icon: 'characters/baroness-vivienne.png',
        name: 'Baroness Vivienne',
    },
    countMortis: {
        icon: 'characters/count-mortis.png',
        name: 'Count Mortis',
    },
};

// ─── TILE IMAGES ─────────────────────────────────────────────
// Map tile index (or corner key) to image path
const TILE_ASSETS = {
    // Corners
    corner_hq: 'tiles/hq.png',
    corner_cityhall: 'tiles/cityhall.png',
    // corner_police: 'tiles/police.png',
    // corner_underground: 'tiles/underground.png',
    // Properties — uncomment as images are added
    // tile_1: 'tiles/capital-tower.png',
    // tile_2: 'tiles/exchange-plaza.png',
    // ... add more as generated
};

const TILE_IMAGES = {}; // key → Image object

function preloadTileAssets() {
    const promises = [];
    for (const [key, path] of Object.entries(TILE_ASSETS)) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        const p = new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve; // don't block on missing tiles
        });
        img.src = getAssetUrl(path);
        TILE_IMAGES[key] = img;
        promises.push(p);
    }
    return Promise.allSettled(promises);
}

// Get tile image key for a given board tile
function getTileImageKey(tile, idx) {
    if (tile.type === "corner") return "corner_" + tile.corner;
    return "tile_" + idx;
}

// Preload character images
function preloadCharacterAssets() {
    const promises = [];
    for (const [key, char] of Object.entries(CHARACTER_ASSETS)) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        const p = new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });
        img.src = getAssetUrl(char.icon);
        CHARACTER_ASSETS[key].image = img;
        promises.push(p);
    }
    return Promise.allSettled(promises);
}
