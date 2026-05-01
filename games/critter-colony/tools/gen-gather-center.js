#!/usr/bin/env node
/**
 * Generate the Critter Gather Center building sprite via gpt-image-2.
 * Output: ../images/buildings/gather-center.png
 *
 * Usage: REPLICATE_API_TOKEN=r8_... node gen-gather-center.js
 */
const fs = require('fs');
const path = require('path');
const Replicate = require('replicate');

const OUT_FILE = path.resolve(__dirname, '..', 'images', 'buildings', 'gather-center.png');
const REF_IMAGE = path.resolve(__dirname, '..', 'images', 'buildings', 'lumber-mill.png');

const PROMPT = `
A single Critter Colony building sprite for a "Critter Gather Center" — a wooden gathering hub
where critters drop off the wood and stone they harvest from nearby tree and rock nodes.
Top-down 3/4 painterly perspective matching the reference image's exact style: warm cottagecore
palette, crisp edges, hand-drawn feel, soft baked-in shadows.

Subject: a sturdy log-frame open-air pavilion with a moss-covered shingled roof, a stone-base
loading dock at the front, a small wooden cart parked under the awning piled with fresh-cut logs
on one side and a stack of rough-hewn stones on the other, a small wooden weighing scale or
workbench off to one side, and a rolled banner with a simple paw-print sigil hanging over the
front beam. Tiny mossy planters and a couple of glowing fireflies near the eaves to match the
cottagecore vibe.

Composition: building centered with small padding, same scale and framing as the lumber-mill
reference. Flat neutral cream-colored studio background (NOT transparent) so the subject reads
clearly.

No text, no watermark, no logos, no border, no signature. Same warm painterly cottagecore palette
as the reference image.
`.trim().replace(/\s+/g, ' ');

async function main() {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) { console.error('ERROR: set REPLICATE_API_TOKEN'); process.exit(1); }
    if (!fs.existsSync(REF_IMAGE)) { console.error('ERROR: ref missing:', REF_IMAGE); process.exit(1); }

    const replicate = new Replicate({ auth: token });
    const refBuf = fs.readFileSync(REF_IMAGE);
    const refDataUri = `data:image/png;base64,${refBuf.toString('base64')}`;

    const input = {
        prompt: PROMPT,
        input_images: [refDataUri],
        aspect_ratio: '1:1',
        quality: 'medium',
        number_of_images: 1,
        output_format: 'png',
        background: 'opaque',
        moderation: 'auto',
    };

    console.log('Generating Critter Gather Center via gpt-image-2...');
    console.log(`Style anchor: ${REF_IMAGE}`);
    const output = await replicate.run('openai/gpt-image-2', { input });
    const urls = Array.isArray(output) ? output : [output];
    const u = urls[0];
    const url = typeof u === 'string' ? u : (u.url ? u.url() : u);
    const res = await fetch(url);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(OUT_FILE, buf);
    console.log(`Saved ${OUT_FILE} (${(buf.length / 1024).toFixed(1)} KB).`);
    console.log('Next: run strip-bg-gather-center.js to remove the cream background.');
}

main().catch((e) => { console.error('Generation failed:', e); process.exit(1); });
