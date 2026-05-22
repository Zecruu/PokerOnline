#!/usr/bin/env node
/**
 * Downscale the alpha-stripped ship sprites to a web-friendly size.
 * Reads from ships/ (which contains the alpha-keyed versions from strip-bg-ships.js),
 * writes back to ships/ at 512×342 (preserving aspect of the 3:2 generation).
 *
 * Originals at full resolution remain backed up in ships/_raw/.
 *
 * Usage: node downscale-ships.js
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DIR = path.resolve(__dirname, '..', 'public', 'battleship', 'ships');
const TARGET_WIDTH = 512;
const FILES = ['carrier.png', 'battleship.png', 'cruiser.png', 'submarine.png', 'destroyer.png'];

async function main() {
    for (const name of FILES) {
        const srcPath = path.join(DIR, name);
        if (!fs.existsSync(srcPath)) { console.warn(`  ${name} missing, skipping`); continue; }
        const inputBuf = fs.readFileSync(srcPath);
        const meta = await sharp(inputBuf).metadata();
        // Trim transparent border tight to the ship's alpha bbox, THEN downscale.
        // This makes the sprite fill its render box in-game without padding.
        const out = await sharp(inputBuf)
            .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
            .resize({ width: TARGET_WIDTH, withoutEnlargement: true })
            .png({ compressionLevel: 9 })
            .toBuffer();
        const outMeta = await sharp(out).metadata();
        fs.writeFileSync(srcPath, out);
        console.log(`  ${name}: ${meta.width}×${meta.height} → trim+scale → ${outMeta.width}×${outMeta.height} (${(out.length / 1024).toFixed(1)} KB)`);
    }
    console.log('Done.');
}

main().catch(e => { console.error(e); process.exit(1); });
