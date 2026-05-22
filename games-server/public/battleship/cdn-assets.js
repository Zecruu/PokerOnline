/* Tactical Waters — CDN Asset Configuration
 * CloudFront Distribution: d2f5lfipdzhi8t.cloudfront.net
 * S3 prefix: battleship/
 *
 * Same pattern as veltharas-dominion/cdn-assets.js and critter-colony/cdn-assets.js.
 * Bump ASSET_VERSION when re-uploading sprites to bust the CDN cache.
 */

const BS_CDN_CONFIG = {
    enabled: true, // flip to false to force local assets during dev
    baseUrl: 'https://d2f5lfipdzhi8t.cloudfront.net/battleship',
    localBasePath: '', // relative to this page (games-server/public/battleship/)
};

const BS_ASSET_VERSION = 1;

function bsAssetUrl(path) {
    if (BS_CDN_CONFIG.enabled) {
        return `${BS_CDN_CONFIG.baseUrl}/${path}?v=${BS_ASSET_VERSION}`;
    }
    return BS_CDN_CONFIG.localBasePath + path;
}

// Expose to battleship.js
window.bsAssetUrl = bsAssetUrl;
window.BS_CDN_CONFIG = BS_CDN_CONFIG;
