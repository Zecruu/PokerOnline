#!/usr/bin/env node
/**
 * Generate Veltharas passive-selection icons via openai/gpt-image-2.
 * Single 1024x512 sheet (3:2 aspect) sliced into 2 cells.
 */
const fs = require('fs');
const path = require('path');
const Replicate = require('replicate');
const sharp = require('sharp');

const BASE = path.resolve(__dirname, '..', '..', '..', 'games-server', 'public', 'veltharas-dominion');
const OUT_DIR = path.join(BASE, 'passives');

const PROMPT = `
Game-UI passive-skill-icon set in Path-of-Exile / Diablo style. A single
horizontal banner with a 2-column by 1-row grid of 2 large square icons.
NO text, NO labels, NO numbers. Each icon centered in its cell with a
small dark inner frame. Read left-to-right:

- Cell 1 (left): "Pyre Fuel" — a glowing molten ember crystal nestled
  inside a bone or charred-iron brazier, with a swirling ring of orange
  flame counters (small numbered-looking pips) orbiting its core. Heavy
  rim lighting, deep crimson background, sparks rising.

- Cell 2 (right): "Cosmic Stardust" — a small cosmic singularity / black
  sphere wreathed in violet-and-cyan starlight nebulae, with floating
  golden stardust motes spiraling inward. Ethereal, deep-space palette
  on a dark void-purple background.

Both icons read clearly as INFINITE-STACK power passives. Bold, saturated,
with an obvious central focal point and dramatic chiaroscuro lighting.
Same scale and framing across the two cells. Plain dark slate background
between them, no text anywhere.
`.trim().replace(/\s+/g, ' ');

async function main() {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) { console.error('set REPLICATE_API_TOKEN'); process.exit(1); }
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const replicate = new Replicate({ auth: token });
    console.log('Generating 2 passive icons (1536x1024 → 2 cells)...');
    const output = await replicate.run('openai/gpt-image-2', {
        input: {
            prompt: PROMPT,
            aspect_ratio: '3:2',
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
    fs.writeFileSync(path.join(OUT_DIR, 'sheet-raw.png'), buf);
    const meta = await sharp(buf).metadata();
    const cellW = Math.floor(meta.width / 2);
    const cellH = meta.height;
    const names = ['pyre_fuel', 'cosmic_stardust'];
    for (let i = 0; i < 2; i++) {
        await sharp(buf).extract({ left: i * cellW, top: 0, width: cellW, height: cellH })
            .toFile(path.join(OUT_DIR, `${names[i]}.png`));
        console.log(`  ${names[i]}.png`);
    }
    console.log('Done.');
}
main().catch(e => { console.error(e); process.exit(1); });
