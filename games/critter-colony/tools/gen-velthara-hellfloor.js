#!/usr/bin/env node
/**
 * Generate a tileable hellish floor texture for Veltharas Dominion via openai/gpt-image-2.
 *
 * Output: games-server/public/veltharas-dominion/bg/hell-floor.png (1024x1024, tileable-ish)
 *
 * Usage:
 *   cd games/critter-colony/tools
 *   REPLICATE_API_TOKEN=r8_... node gen-velthara-hellfloor.js
 */

const fs = require('fs');
const path = require('path');
const Replicate = require('replicate');

const OUT_DIR = path.resolve(__dirname, '..', '..', '..', 'games-server', 'public', 'veltharas-dominion', 'bg');
const OUT_FILE = path.join(OUT_DIR, 'hell-floor.png');

const PROMPT = `
A seamless tileable 1024x1024 square texture of a hellscape ground viewed directly from above (orthographic top-down).
The texture is DARK (overall value around 15-25%) so that brightly colored game sprites placed on top will pop.
There is NO central subject, NO focal point — it is an even, repeatable ground texture that reads well at any rotation.
Content: cracked black obsidian stone plates with deep crimson lava fissures glowing between them, scattered grey ash,
tiny glowing ember particles, charred bone fragments half-buried, veins of molten orange deep in the cracks,
faint demonic sigils burned lightly into a few stones (low contrast, subtle), wisps of dark smoke implied as haze.
Color palette: near-black #0a0508 base, deep red #3b0a0a cracks, hot lava orange #ff4400 glow inside fissures,
bone grey #6b6560 highlights, ash tan #3a2a22 accents.
Style: gritty realistic 2D game floor tile, high-detail painterly but not busy, unified lighting (no strong shadows).
IMPORTANT: the top edge must visually continue into the bottom edge and the left edge into the right edge (tileable/seamless)
— no borders, no frames, no labels, no text, no characters, no props that are clearly asymmetric.
No logos. No UI. No signature. Just a pure ground texture.
`.trim().replace(/\s+/g, ' ');

async function main() {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) { console.error('ERROR: set REPLICATE_API_TOKEN'); process.exit(1); }
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

    const replicate = new Replicate({ auth: token });

    console.log('Generating Veltharas hell-floor texture (1024x1024) via gpt-image-2...');
    console.log(`Output: ${OUT_FILE}\n`);

    const output = await replicate.run('openai/gpt-image-2', {
        input: {
            prompt: PROMPT,
            aspect_ratio: '1:1',
            quality: 'high',
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

    fs.writeFileSync(OUT_FILE, buf);
    console.log(`Saved ${OUT_FILE} (${(buf.length / 1024).toFixed(1)} KB).`);
    console.log('Reload the game — the hellscape floor will tile across the map.');
}

main().catch((err) => { console.error('Generation failed:', err); process.exit(1); });
