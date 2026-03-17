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
    corner_police: 'tiles/police.png',
    corner_underground: 'tiles/underground.png',
    // Financial District (A1)
    tile_1: 'tiles/capital-tower.png',
    tile_2: 'tiles/exchange-plaza.png',
    tile_4: 'tiles/prestige-centre.png',
    tile_5: 'tiles/financial-row.png',
    // Commerce Row (A2)
    tile_7: 'tiles/skyline-drive.png',
    tile_8: 'tiles/commerce-street.png',
    tile_10: 'tiles/midrise-avenue.png',
    tile_12: 'tiles/business-lane.png',
    // Oceanfront (B1)
    tile_15: 'tiles/grand-marina.png',
    tile_16: 'tiles/oceanfront-hotel.png',
    tile_18: 'tiles/sunset-boardwalk.png',
    tile_19: 'tiles/palm-boulevard.png',
    // Coastal (B2)
    tile_21: 'tiles/harbour-view.png',
    tile_22: 'tiles/beachside-retreat.png',
    tile_24: 'tiles/coastal-commons.png',
    tile_25: 'tiles/sandy-shores.png',
    // Uptown (C1)
    tile_29: 'tiles/uptown-flats.png',
    tile_30: 'tiles/central-market.png',
    tile_32: 'tiles/riverside-complex.png',
    tile_33: 'tiles/metro-commons.png',
    // Greenway (C2)
    tile_35: 'tiles/greenway-apts.png',
    tile_36: 'tiles/junction-square.png',
    tile_38: 'tiles/park-place.png',
    tile_39: 'tiles/cross-street.png',
    // Oakwood (D1)
    tile_43: 'tiles/maple-grove.png',
    tile_44: 'tiles/elmwood-estate.png',
    tile_46: 'tiles/birchwood-lane.png',
    tile_47: 'tiles/cedar-heights.png',
    // Pinewood (D2)
    tile_49: 'tiles/oak-park.png',
    tile_50: 'tiles/willow-creek.png',
    tile_52: 'tiles/pine-ridge.png',
    tile_53: 'tiles/meadow-view.png',
    // Special tiles
    special_taxi: 'tiles/taxi.png',
    special_tax: 'tiles/tax.png',
    special_bank: 'tiles/bank.png',
    special_momentum: 'tiles/momentum.png',
    special_cartel: 'tiles/cartel.png',
    special_lucky: 'tiles/lucky.png',
    special_unlucky: 'tiles/unlucky.png',
    special_free: 'tiles/free-roam.png',
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
    if (tile.type === "property") return "tile_" + idx;
    // Special tiles share images
    const specialMap = {
        taxi: "special_taxi", tax: "special_tax", bank: "special_bank",
        momentum: "special_momentum", underground_card: "special_cartel",
        lucky: "special_lucky", unlucky: "special_unlucky", free: "special_free",
    };
    return specialMap[tile.type] || "tile_" + idx;
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
