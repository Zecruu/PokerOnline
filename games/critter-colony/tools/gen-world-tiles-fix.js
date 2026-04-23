#!/usr/bin/env node
/**
 * Re-generate just the sprites where the player reference character leaked in.
 * Uses tree-1.png (generated earlier, same target style, no character) as anchor.
 */
const fs = require('fs');
const path = require('path');
const Replicate = require('replicate');

const OUT_DIR = path.resolve(__dirname, '..', 'images', 'tiles');
const REF_IMAGE = path.join(OUT_DIR, 'tree-1.png');

const STYLE_BASE = `
Top-down 3/4 perspective game tile sprite, chunky pixel-art style matching the reference image's
palette and rendering treatment (crisp edges, clean block colors, subtle highlights, small soft
shadow beneath subject). Subject centered in frame with small padding. High-contrast colors that
read clearly at 32x32 pixel render size. Flat neutral cream-colored studio background (NOT
transparent). NO text, NO watermark, NO logos, NO border, NO signature. ABSOLUTELY NO character,
NO person, NO creature, NO critter — only the single inanimate subject described below.
`.trim().replace(/\s+/g, ' ');

const SPRITES = [
    { name: 'rock-1',   prompt: 'A single grey boulder cluster — one large chunky rock with 1-2 smaller rocks beside it at its base. Cool grey tones with highlight edges suggesting sun from upper-left. Small grass tufts at the base. Isometric tile, no character or human figure anywhere.' },
    { name: 'node-oil', prompt: 'A bubbling black oil seep pool on the ground, glossy dark liquid with small bubbles and a faint petroleum rainbow sheen on the surface. Small mound of dark earth around the edge. Isometric tile, no character or human figure anywhere.' },
];

async function main() {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) { console.error('ERROR: set REPLICATE_API_TOKEN'); process.exit(1); }
    if (!fs.existsSync(REF_IMAGE)) { console.error('ERROR: tree-1.png missing — run gen-world-tiles.js first'); process.exit(1); }

    const replicate = new Replicate({ auth: token });
    const refBuffer = fs.readFileSync(REF_IMAGE);
    const refDataUri = `data:image/png;base64,${refBuffer.toString('base64')}`;

    console.log(`Re-generating ${SPRITES.length} sprite(s) using tree-1.png as style anchor...\n`);

    for (let i = 0; i < SPRITES.length; i++) {
        const s = SPRITES[i];
        const prompt = `${STYLE_BASE} ${s.prompt}`;
        console.log(`[${i + 1}/${SPRITES.length}] ${s.name}...`);

        const output = await replicate.run('openai/gpt-image-2', {
            input: {
                prompt,
                input_images: [refDataUri],
                aspect_ratio: '1:1',
                quality: 'medium',
                number_of_images: 1,
                output_format: 'png',
                background: 'opaque',
                moderation: 'auto',
            },
        });

        const urls = Array.isArray(output) ? output : [output];
        const u = urls[0];
        const url = typeof u === 'string' ? u : (u.url ? u.url() : u);
        const res = await fetch(url);
        const buf = Buffer.from(await res.arrayBuffer());
        const outPath = path.join(OUT_DIR, `${s.name}.png`);
        fs.writeFileSync(outPath, buf);
        console.log(`   saved ${outPath} (${(buf.length / 1024).toFixed(1)} KB)`);
    }

    console.log('\nDone.');
}

main().catch((err) => { console.error('Generation failed:', err); process.exit(1); });
