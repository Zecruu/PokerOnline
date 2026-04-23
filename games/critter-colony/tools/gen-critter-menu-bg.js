#!/usr/bin/env node
/**
 * Generate the Critter Colony start-menu cinematic background via gpt-image-2.
 * Output: games/critter-colony/images/bg/menu-background.png
 *
 * Usage:
 *   cd games/critter-colony/tools
 *   REPLICATE_API_TOKEN=r8_... node gen-critter-menu-bg.js
 */
const fs = require('fs');
const path = require('path');
const Replicate = require('replicate');

const OUT_DIR = path.resolve(__dirname, '..', 'images', 'bg');
const OUT_FILE = path.join(OUT_DIR, 'menu-background.png');

const PROMPT = `
A cinematic 3:2 widescreen painterly key-art illustration of a cozy woodland critter colony at golden hour.
A small cluster of wooden cabins and workshops with moss-green shingled roofs sits nestled in a lush green
forest clearing. A sawmill with a glowing sawblade, a farm with neat crop rows, and a tall watchtower can
be seen among the buildings. Warm amber light pours from cabin windows and lanterns.

Foreground: gently rolling grass, scattered wildflowers, a few small wooden crates, mushrooms on mossy
logs — quieter and darker in the lower third of the image so UI overlay text stays readable.

Mid-ground: tiny friendly critter silhouettes (soft blobby shapes with big eyes, NO detailed characters,
just suggestive silhouettes — no specific species) wandering between buildings, a few fireflies rising.

Background: tall ancient pine and birch trees framing the scene, a winding river catching sunset light,
distant misty mountains and a vast sky of soft orange-pink-peach gradient with wispy clouds and a few
distant birds.

Atmosphere: warm cozy cottagecore fantasy, Studio-Ghibli-adjacent painterly style, soft volumetric god
rays through the trees, gentle haze, richly saturated greens and warm oranges, inviting and peaceful.

Composition: horizon near vertical center, buildings clustered slightly left of center, lots of visual
breathing room. No subjects in the exact middle-bottom — leave visual space in the lower third for game
menu UI overlay and a centered title logo in the upper third.

NO text, NO logos, NO watermarks, NO borders, NO UI, NO signature, NO specific identifiable character
or critter faces. Painterly, cinematic, AAA game splash screen / key art quality.
`.trim().replace(/\s+/g, ' ');

async function main() {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) { console.error('ERROR: set REPLICATE_API_TOKEN'); process.exit(1); }
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

    const replicate = new Replicate({ auth: token });
    console.log('Generating Critter Colony menu background via gpt-image-2...');
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
