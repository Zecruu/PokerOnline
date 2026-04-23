#!/usr/bin/env node
/**
 * Generate the Veltharas Dominion menu title art via openai/gpt-image-2.
 *
 * Output: games-server/public/veltharas-dominion/bg/title-art.png
 *
 * Usage:
 *   cd games/critter-colony/tools
 *   REPLICATE_API_TOKEN=r8_... node gen-velthara-title.js
 */

const fs = require('fs');
const path = require('path');
const Replicate = require('replicate');

const OUT_DIR = path.resolve(__dirname, '..', '..', '..', 'games-server', 'public', 'veltharas-dominion', 'bg');
const OUT_FILE = path.join(OUT_DIR, 'title-art.png');

const PROMPT = `
Horizontal game-menu title banner showing the words "VELTHARA'S DOMINION" in huge, ornate, dark-fantasy
block letters. The letters look like they are forged from cracked blackened obsidian/iron with MOLTEN ORANGE
LAVA glowing through deep fractures inside each letter — like cooled forged metal with hot cracks. Thin wisps
of smoke curl upward from the tops of the letters. Faint orange ember sparks float around the letters.
"VELTHARA'S" is on the TOP line (larger), "DOMINION" on the BOTTOM line (slightly smaller, wider letter-spacing).
Both lines are perfectly centered horizontally and aligned to each other. No misspellings — spell exactly
"VELTHARA'S DOMINION" with a proper apostrophe in "VELTHARA'S".
Background: deep near-black, with a dim radial glow of blood-red behind the letters that fades to black at
the edges of the image. No other objects, no characters, no creatures, no borders, no frame, no extra text,
no watermark, no signature, no logo, no dates, no UI elements.
Dark fantasy, cinematic, high detail, dramatic rim lighting, realistic rendered style.
`.trim().replace(/\s+/g, ' ');

async function main() {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) { console.error('ERROR: set REPLICATE_API_TOKEN'); process.exit(1); }
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

    const replicate = new Replicate({ auth: token });

    console.log('Generating Veltharas title art (1536x1024) via gpt-image-2...');
    console.log(`Output: ${OUT_FILE}\n`);

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

    fs.writeFileSync(OUT_FILE, buf);
    console.log(`Saved ${OUT_FILE} (${(buf.length / 1024).toFixed(1)} KB).`);
}

main().catch((err) => { console.error('Generation failed:', err); process.exit(1); });
