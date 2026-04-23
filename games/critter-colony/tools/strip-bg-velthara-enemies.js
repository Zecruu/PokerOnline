#!/usr/bin/env node
/**
 * Strip backgrounds from Veltharas enemy sprites.
 * Reads raws from enemies/_raw/*.png, writes transparent PNGs to enemies/*.png.
 * Re-runs are idempotent — always processes from _raw/.
 *
 * Usage: node strip-bg-velthara-enemies.js
 */
const fs = require('fs');
const path = require('path');
const { removeBackground } = require('@imgly/background-removal-node');

const BASE = path.resolve(__dirname, '..', '..', '..', 'games-server', 'public', 'veltharas-dominion');
const OUT_DIR = path.join(BASE, 'enemies');
const RAW_DIR = path.join(OUT_DIR, '_raw');

async function main() {
    if (!fs.existsSync(RAW_DIR)) { console.error('No _raw/ dir — run generations first'); process.exit(1); }
    const files = fs.readdirSync(RAW_DIR).filter(f => f.endsWith('.png'));
    if (!files.length) { console.log('No raw sprites found.'); return; }

    console.log(`Stripping backgrounds for ${files.length} sprite(s)...\n`);

    let ok = 0, fail = 0;
    for (let i = 0; i < files.length; i++) {
        const name = files[i];
        const srcPath = path.join(RAW_DIR, name);
        const outPath = path.join(OUT_DIR, name);
        const t0 = Date.now();
        process.stdout.write(`[${(i + 1).toString().padStart(2)}/${files.length}] ${name.padEnd(28)} `);
        try {
            const buf = fs.readFileSync(srcPath);
            const blob = new Blob([buf], { type: 'image/png' });
            const result = await removeBackground(blob);
            const outBuf = Buffer.from(await result.arrayBuffer());
            fs.writeFileSync(outPath, outBuf);
            console.log(`ok  ${((Date.now() - t0) / 1000).toFixed(1)}s  ${(outBuf.length / 1024).toFixed(1)} KB`);
            ok++;
        } catch (e) {
            console.log(`FAIL  ${e.message}`);
            fail++;
        }
    }
    console.log(`\n${ok} stripped, ${fail} failed. Raws preserved in ${RAW_DIR}.`);
    if (fail) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
