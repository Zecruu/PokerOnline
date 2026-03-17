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
};

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
