#!/usr/bin/env node
/**
 * Generate a 6-frame sawmill animation via Replicate's gpt-image-2.
 *
 * Strategy: gpt-image-2 interprets "6 frames" as "draw a sprite-sheet grid"
 * which actually gives us better continuity than separate per-frame calls.
 * So we request ONE 2x3 grid image, then slice it into 6 PNGs with sharp.
 *
 * Usage:
 *   cd games/critter-colony/tools
 *   npm install
 *   REPLICATE_API_TOKEN=r8_... node gen-sawmill-frames.js
 */

const fs = require('fs');
const path = require('path');
const Replicate = require('replicate');
const sharp = require('sharp');

const COLS = 2;
const ROWS = 3;
const FRAME_COUNT = COLS * ROWS; // 6
const OUT_DIR = path.join(__dirname, '..', 'images', 'buildings', 'sawmill');
const REF_IMAGE = path.join(__dirname, '..', 'images', 'buildings', 'lumber-mill.png');

const PROMPT = `
A single image containing a 2-column by 3-row grid (6 cells total) showing an animation cycle of
an unmanned mechanical wood-chopping sawmill building. This is a game sprite sheet — each cell is
one animation frame, read left-to-right, top-to-bottom: cell 1 (top-left), cell 2 (top-right),
cell 3 (mid-left), cell 4 (mid-right), cell 5 (bottom-left), cell 6 (bottom-right). No numbers, no
labels, no borders, no grid lines between cells — just the six sprite images arranged in a clean
grid with a small gap of transparent pixels between them.

Subject (identical across all 6 cells): a pixel-art wood-chopping sawmill building matching the
reference image style — warm wood-brown planks, moss-green pitched roof, stone chimney on the left
with a small smoke wisp, a circular sawblade mounted on the front of the building, a pile of logs
on the left, stack of sawn planks on the right, small chopping block in front with a mechanical
piston/axe above it. Top-down 3/4 perspective, transparent background around each building.
No characters, no people, no critters — just the machinery.

CRITICAL: every cell shows the EXACT same building in the EXACT same position and scale with the
EXACT same props. Do NOT add, remove, move, or resize anything. Only these elements change frame
to frame (animation):
- Cell 1: mechanical piston/axe fully raised above the chopping block. Sawblade teeth in starting
  rotation. Small smoke wisp above chimney.
- Cell 2: piston descending, halfway down. Sawblade rotated ~60°.
- Cell 3: piston striking the log on the chopping block, small wood chips bursting outward, tiny
  bright impact flash on log. Sawblade rotated ~120°.
- Cell 4: piston beginning to lift, wood chips still in the air falling. Sawblade rotated ~180°.
- Cell 5: piston halfway up, chips settled. Sawblade rotated ~240°.
- Cell 6: piston nearly fully raised, returning to cell 1 pose. Sawblade rotated ~300°. Different
  smoke wisp shape.

Pixel-art style, crisp edges, transparent background throughout. High quality, clean composition.
`.trim().replace(/\s+/g, ' ');

async function main() {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) { console.error('ERROR: set REPLICATE_API_TOKEN'); process.exit(1); }
    if (!fs.existsSync(REF_IMAGE)) { console.error('ERROR: ref image missing:', REF_IMAGE); process.exit(1); }

    const replicate = new Replicate({ auth: token });
    const refBuffer = fs.readFileSync(REF_IMAGE);
    const refDataUri = `data:image/png;base64,${refBuffer.toString('base64')}`;

    console.log('Generating 1 sprite-sheet image (2x3 grid) via gpt-image-2...');
    console.log(`Reference: ${REF_IMAGE}`);
    console.log(`Output:    ${OUT_DIR}\n`);

    const output = await replicate.run('openai/gpt-image-2', {
        input: {
            prompt: PROMPT,
            input_images: [refDataUri],
            aspect_ratio: '2:3', // matches our 2-col × 3-row grid
            quality: 'high',
            number_of_images: 1,
            output_format: 'png',
            background: 'auto',
            moderation: 'auto',
        },
    });

    const urls = Array.isArray(output) ? output : [output];
    const u = urls[0];
    const url = typeof u === 'string' ? u : (u.url ? u.url() : u);
    const res = await fetch(url);
    const buf = Buffer.from(await res.arrayBuffer());

    // Save the raw sprite sheet for reference/debugging
    const sheetPath = path.join(OUT_DIR, 'sheet-raw.png');
    fs.writeFileSync(sheetPath, buf);
    console.log(`Saved raw sheet: ${sheetPath} (${(buf.length / 1024).toFixed(1)} KB)`);

    // Slice into 6 frames
    const meta = await sharp(buf).metadata();
    const cellW = Math.floor(meta.width / COLS);
    const cellH = Math.floor(meta.height / ROWS);
    console.log(`Sheet is ${meta.width}x${meta.height}, slicing into ${COLS}x${ROWS} cells of ${cellW}x${cellH}...\n`);

    for (let i = 0; i < FRAME_COUNT; i++) {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const left = col * cellW;
        const top = row * cellH;
        const outPath = path.join(OUT_DIR, `frame-${i}.png`);
        await sharp(buf).extract({ left, top, width: cellW, height: cellH }).toFile(outPath);
        const s = fs.statSync(outPath).size;
        console.log(`  frame-${i}.png (cell r${row}c${col} @ ${left},${top}) ${(s / 1024).toFixed(1)} KB`);
    }

    console.log('\nDone. Reload the game and place a Sawmill to see the animation.');
    console.log('If a frame is off, inspect sheet-raw.png and re-run.');
}

main().catch((err) => { console.error('Generation failed:', err); process.exit(1); });
