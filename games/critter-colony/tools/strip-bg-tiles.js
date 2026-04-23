#!/usr/bin/env node
/**
 * Strip the cream studio background from world-tile sprites.
 * Writes transparent PNGs in-place (backs up originals to tiles/_raw/).
 *
 * Usage: node strip-bg-tiles.js
 */
const fs = require('fs');
const path = require('path');
const { removeBackground } = require('@imgly/background-removal-node');

const TILES_DIR = path.resolve(__dirname, '..', 'images', 'tiles');
const BACKUP_DIR = path.join(TILES_DIR, '_raw');

const TILES = [
    'tree-1.png',
    'tree-2.png',
    'rock-1.png',
    'rock-2.png',
    'node-oil.png',
    'node-gold.png',
    'node-diamond.png',
    'node-crystal.png',
];

async function main() {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`Stripping backgrounds for ${TILES.length} tiles...\n`);

    for (let i = 0; i < TILES.length; i++) {
        const name = TILES[i];
        const srcPath = path.join(TILES_DIR, name);
        const backupPath = path.join(BACKUP_DIR, name);
        if (!fs.existsSync(srcPath)) { console.warn(`  ${name} not found, skipping`); continue; }

        // Back up original (only if no backup yet)
        if (!fs.existsSync(backupPath)) fs.copyFileSync(srcPath, backupPath);

        console.log(`[${i + 1}/${TILES.length}] ${name}...`);
        const t0 = Date.now();
        const buf = fs.readFileSync(backupPath); // always process from backup for reproducibility
        const blob = new Blob([buf], { type: 'image/png' });
        const resultBlob = await removeBackground(blob);
        const resultBuf = Buffer.from(await resultBlob.arrayBuffer());
        fs.writeFileSync(srcPath, resultBuf);
        console.log(`   done (${((Date.now() - t0) / 1000).toFixed(1)}s, ${(resultBuf.length / 1024).toFixed(1)} KB)`);
    }

    console.log('\nAll tiles have transparent backgrounds. Originals preserved in images/tiles/_raw/.');
}

main().catch((e) => { console.error(e); process.exit(1); });
