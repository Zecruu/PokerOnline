#!/usr/bin/env node
/**
 * Generate world tile sprites (trees, rocks, resource nodes) via gpt-image-2.
 * Follows the game-sprites skill rules:
 *   - No transparent-bg prompts (flat cream background, strip in post)
 *   - Reference sprite for style anchoring
 *   - One call per sprite (Template 1 — not animation)
 *
 * Output: ../images/tiles/<name>.png
 *
 * Usage: REPLICATE_API_TOKEN=r8_... node gen-world-tiles.js
 */

const fs = require('fs');
const path = require('path');
const Replicate = require('replicate');

const OUT_DIR = path.resolve(__dirname, '..', 'images', 'tiles');
const REF_IMAGE = path.resolve(__dirname, '..', 'images', 'player', 'player-front.png');

const STYLE_BASE = `
Top-down 3/4 perspective game tile sprite, chunky pixel-art style, crisp clean edges, high-contrast
colors that read clearly at 32x32 pixel render size. Subject centered with small padding. Small
soft dark shadow at base of subject. Warm cottagecore palette with slightly saturated greens and
browns. Flat neutral cream-colored studio background (NOT transparent). NO text, NO watermark,
NO logos, NO border, NO signature.
`.trim().replace(/\s+/g, ' ');

const SPRITES = [
    { name: 'tree-1',    prompt: 'A single lush deciduous tree with a rounded dark-green canopy and a short stout brown trunk. Viewed from top-down 3/4. Moderate detail — individual leaf clusters suggested, not micro-detailed.' },
    { name: 'tree-2',    prompt: 'A single tall pine / conifer tree, pointed triangular silhouette, layered dark-green needles, narrow dark-brown trunk peeking at base. Top-down 3/4 view, different silhouette from a rounded oak.' },
    { name: 'rock-1',    prompt: 'A single grey boulder cluster — one large chunky rock with 1-2 smaller rocks beside it at its base. Cool grey tones with highlight edges suggesting sun from upper-left. Top-down 3/4.' },
    { name: 'rock-2',    prompt: 'A single jagged rocky outcrop — sharper angular edges than a boulder cluster, slightly taller silhouette, darker grey with slight brown iron-stain hints. Top-down 3/4.' },
    { name: 'node-oil',  prompt: 'A bubbling black oil seep pool on the ground, glossy dark liquid with small bubbles and a faint petroleum rainbow sheen on the surface. Small mound of dark earth around the edge. Top-down 3/4.' },
    { name: 'node-gold', prompt: 'A gold ore deposit — exposed rocky vein with bright yellow-gold metallic crystalline clusters embedded in grey stone. Small sparkle highlights. Top-down 3/4.' },
    { name: 'node-diamond', prompt: 'A diamond crystal cluster — translucent pale-blue faceted crystals of varying sizes jutting out of a grey rocky base. Bright facet highlights. Top-down 3/4.' },
    { name: 'node-crystal', prompt: 'A purple magic crystal formation — glowing vibrant purple-violet faceted crystals in a small cluster emerging from dark stone, faint aura glow around the crystals. Top-down 3/4.' },
];

async function main() {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) { console.error('ERROR: set REPLICATE_API_TOKEN'); process.exit(1); }
    if (!fs.existsSync(REF_IMAGE)) { console.error('ERROR: ref image missing:', REF_IMAGE); process.exit(1); }

    const replicate = new Replicate({ auth: token });
    const refBuffer = fs.readFileSync(REF_IMAGE);
    const refDataUri = `data:image/png;base64,${refBuffer.toString('base64')}`;

    fs.mkdirSync(OUT_DIR, { recursive: true });
    console.log(`Generating ${SPRITES.length} world-tile sprites via gpt-image-2...`);
    console.log(`Reference: ${REF_IMAGE}`);
    console.log(`Output:    ${OUT_DIR}\n`);

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

    console.log('\nDone. Next step: background removal — run `rembg p -m u2net` on the tiles dir,');
    console.log('or use remove.bg / Adobe, then drop the clean PNGs back in place.');
}

main().catch((err) => { console.error('Generation failed:', err); process.exit(1); });
