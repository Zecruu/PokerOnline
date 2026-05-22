#!/usr/bin/env node
/**
 * Strip the white studio background from each ship sprite, in-place.
 * Originals are backed up to ships/_raw/ on first run; re-runs always
 * process from the backup, so this script is idempotent.
 *
 * Usage: node strip-bg-ships.js
 */
const fs = require('fs');
const path = require('path');
const { removeBackground } = require('@imgly/background-removal-node');

const DIR = path.resolve(__dirname, '..', 'public', 'battleship', 'ships');
const BACKUP_DIR = path.join(DIR, '_raw');
const FILES = ['carrier.png', 'battleship.png', 'cruiser.png', 'submarine.png', 'destroyer.png'];

async function main() {
    if (!fs.existsSync(DIR)) {
        console.error(`Ships dir not found: ${DIR}\nRun gen-ships.js first.`);
        process.exit(1);
    }
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`Stripping white background from ${FILES.length} ship sprites...\n`);

    for (let i = 0; i < FILES.length; i++) {
        const name = FILES[i];
        const srcPath = path.join(DIR, name);
        const backupPath = path.join(BACKUP_DIR, name);
        if (!fs.existsSync(srcPath)) { console.warn(`  ${name} missing, skipping`); continue; }

        if (!fs.existsSync(backupPath)) fs.copyFileSync(srcPath, backupPath);

        console.log(`[${i + 1}/${FILES.length}] ${name}...`);
        const t0 = Date.now();
        const buf = fs.readFileSync(backupPath);
        const blob = new Blob([buf], { type: 'image/png' });
        const result = await removeBackground(blob);
        const outBuf = Buffer.from(await result.arrayBuffer());
        fs.writeFileSync(srcPath, outBuf);
        console.log(`   done (${((Date.now() - t0) / 1000).toFixed(1)}s, ${(outBuf.length / 1024).toFixed(1)} KB)`);
    }

    console.log(`\nDone. Originals preserved in ${BACKUP_DIR}.`);
}

main().catch(e => { console.error(e); process.exit(1); });
