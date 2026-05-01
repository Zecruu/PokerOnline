#!/usr/bin/env node
/**
 * Generate the Critdex book UI asset for Critter Colony.
 * Output: ../images/ui/critdex-book.png
 *
 * Usage: REPLICATE_API_TOKEN=r8_... node gen-critdex-book.js
 *
 * Followed by `node strip-bg-critdex-book.js` (separate one-off) if you
 * want a transparent backdrop for layering. The default cream studio
 * background reads fine on the panel without bg removal.
 */
const fs = require('fs');
const path = require('path');
const Replicate = require('replicate');

const OUT_FILE = path.resolve(__dirname, '..', 'images', 'ui', 'critdex-book.png');
const REF_IMAGE = path.resolve(__dirname, '..', 'images', 'bg', 'menu-background.png');

const PROMPT = `
A single hand-painted pixel-art game UI illustration of an open spellbook / bestiary tome —
the player's "Critdex". Two-page spread, viewed from above at a slight 3/4 angle.
Rich chestnut-brown leather cover with brass corner reinforcements, a small cottagecore-style
critter paw embossed on the spine, and a gold ribbon bookmark dangling between the pages.
Aged parchment pages with subtle yellow-cream tint, faint wear at the edges, no actual text or
glyphs printed on the pages (UI text will be overlaid later) — instead the pages show a small
hand-drawn empty silhouette frame on the left page and a sketched grid of empty critter portrait
slots on the right page, like a Pokédex page layout but rougher and warmer. Tiny green
moss accents and a few glowing fireflies hovering near the book to match the cottagecore palette.
Subject centered, slight padding around all edges. Flat neutral cream-colored studio background
(NOT transparent). Same warm painterly palette and soft lighting as the reference image.
No text, no watermark, no logos, no border, no signature.
`.trim().replace(/\s+/g, ' ');

async function main() {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) { console.error('ERROR: set REPLICATE_API_TOKEN'); process.exit(1); }
    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });

    const replicate = new Replicate({ auth: token });
    const input = {
        prompt: PROMPT,
        aspect_ratio: '3:2',
        quality: 'high',
        number_of_images: 1,
        output_format: 'png',
        background: 'opaque',
        moderation: 'auto',
    };

    if (fs.existsSync(REF_IMAGE)) {
        const buf = fs.readFileSync(REF_IMAGE);
        input.input_images = [`data:image/png;base64,${buf.toString('base64')}`];
        console.log(`Style anchor: ${REF_IMAGE}`);
    }

    console.log('Generating Critdex book via gpt-image-2 (high)...');
    const output = await replicate.run('openai/gpt-image-2', { input });
    const urls = Array.isArray(output) ? output : [output];
    const u = urls[0];
    const url = typeof u === 'string' ? u : (u.url ? u.url() : u);
    const res = await fetch(url);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(OUT_FILE, buf);
    console.log(`Saved ${OUT_FILE} (${(buf.length / 1024).toFixed(1)} KB).`);
}

main().catch((err) => { console.error('Generation failed:', err); process.exit(1); });
