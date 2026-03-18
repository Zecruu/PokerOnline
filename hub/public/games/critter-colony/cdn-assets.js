/* Critter Colony — CDN Asset Configuration */

const CDN_CONFIG = {
    enabled: false, // Enable when sprites are uploaded to S3
    baseUrl: 'https://d2f5lfipdzhi8t.cloudfront.net/critter-colony',
    localBasePath: 'images/'
};

function getAssetUrl(path) {
    if (CDN_CONFIG.enabled) return `${CDN_CONFIG.baseUrl}/${path}`;
    return CDN_CONFIG.localBasePath + path;
}
