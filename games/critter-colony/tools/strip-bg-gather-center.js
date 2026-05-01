#!/usr/bin/env node
/**
 * Strip the cream studio background from gather-center.png in place.
 * Backs up the raw output to images/buildings/_raw/ so reruns are
 * idempotent (always processes from the backup).
 */
const fs = require('fs');
const path = require('path');

const DIR = path.resolve(__dirname, '..', 'images', 'buildings');
const BACKUP_DIR = path.join(DIR, '_raw');
const FILES = ['gather-center.png'];

function loadGlobalRequire(packageName) {
    // Prefer the workspace install, but fall back to the global npm root
    // (Replicate token + globals are on this machine via `npm install -g`).
    try { return require(packageName); } catch (e) {}
    const { execSync } = require('child_process');
    let root;
    try {
        root = execSync('npm root -g', { encoding: 'utf8' }).trim();
    } catch { throw new Error(`Cannot resolve ${packageName}`); }
    return require(path.join(root, packageName));
}

const { removeBackground } = loadGlobalRequire('@imgly/background-removal-node');

async function main() {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    for (const name of FILES) {
        const src = path.join(DIR, name);
        const backup = path.join(BACKUP_DIR, name);
        if (!fs.existsSync(src)) { console.warn(`skip ${name}`); continue; }
        if (!fs.existsSync(backup)) fs.copyFileSync(src, backup);

        console.log(`stripping ${name}...`);
        const t0 = Date.now();
        const buf = fs.readFileSync(backup); // always process from raw backup
        const blob = new Blob([buf], { type: 'image/png' });
        const result = await removeBackground(blob);
        fs.writeFileSync(src, Buffer.from(await result.arrayBuffer()));
        console.log(`   done (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    }
    console.log('Originals preserved in', BACKUP_DIR);
}

main().catch((e) => { console.error(e); process.exit(1); });
