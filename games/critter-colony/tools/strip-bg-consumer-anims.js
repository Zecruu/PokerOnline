#!/usr/bin/env node
/**
 * Strip backgrounds from Consumer boss animation frames in-place.
 * Originals backed up to enemies/consumer-anims/<anim>/_raw/ on first run.
 */
const fs = require('fs');
const path = require('path');
const { removeBackground } = require('@imgly/background-removal-node');

const BASE = path.resolve(__dirname, '..', '..', '..', 'games-server', 'public', 'veltharas-dominion');
const ROOT = path.join(BASE, 'enemies', 'consumer-anims');

async function main() {
    if (!fs.existsSync(ROOT)) { console.error('No consumer-anims/ dir'); process.exit(1); }
    const anims = fs.readdirSync(ROOT).filter(d => fs.statSync(path.join(ROOT, d)).isDirectory());
    let total = 0, ok = 0, fail = 0;
    for (const anim of anims) {
        const dir = path.join(ROOT, anim);
        const rawDir = path.join(dir, '_raw');
        fs.mkdirSync(rawDir, { recursive: true });
        const frames = fs.readdirSync(dir).filter(f => /^frame-\d+\.png$/.test(f));
        console.log(`\n[${anim}] ${frames.length} frame(s)`);
        for (const f of frames) {
            total++;
            const src = path.join(dir, f);
            const backup = path.join(rawDir, f);
            if (!fs.existsSync(backup)) fs.copyFileSync(src, backup);
            const t0 = Date.now();
            try {
                const buf = fs.readFileSync(backup);
                const blob = new Blob([buf], { type: 'image/png' });
                const result = await removeBackground(blob);
                const out = Buffer.from(await result.arrayBuffer());
                fs.writeFileSync(src, out);
                console.log(`  ✓ ${f}  ${((Date.now() - t0) / 1000).toFixed(1)}s  ${(out.length / 1024).toFixed(1)} KB`);
                ok++;
            } catch (e) {
                console.log(`  ✗ ${f}  ${e.message}`);
                fail++;
            }
        }
    }
    console.log(`\n${ok}/${total} stripped (${fail} failed). Raws preserved in <anim>/_raw/.`);
    if (fail) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
