#!/usr/bin/env node
/**
 * Generate the Veltharas Dominion start-menu cinematic background via gpt-image-2.
 * Output: games-server/public/veltharas-dominion/bg/menu-background.png (1536x1024)
 */
const fs = require('fs');
const path = require('path');
const Replicate = require('replicate');

const OUT_DIR = path.resolve(__dirname, '..', '..', '..', 'games-server', 'public', 'veltharas-dominion', 'bg');
const OUT_FILE = path.join(OUT_DIR, 'menu-background.png');

const PROMPT = `
A cinematic 16:10 widescreen dark-fantasy key art painting of a colossal demonic obsidian castle rising in
the distance, perched at the center of a vast molten lava sea. The castle is jagged, gothic, volcanic-stone,
with glowing orange-red cracks veining through its walls and tall twisted spires topped with hellish flames
and pointed iron tips. Smoke and embers drift upward on both sides into a blood-red and deep-purple sky
filled with churning dark clouds and distant lightning. Rivers of bright orange-yellow lava flow from the
castle's base into the foreground, with sharp black obsidian rocks and spires breaking the lava surface.
Faint silhouettes of demonic gargoyles and bridges connect outer spires. Atmospheric haze, god rays,
heavy mist.
Composition: horizon near vertical center, castle centered and slightly dominant, foreground a quieter
darker area with gentle lava pools (so UI text placed here stays readable), no subjects in the exact
middle-bottom section. Leave visual space in the lower third for game menu UI overlay.
NO text, NO logos, NO characters, NO creatures, NO border, NO watermark, NO UI, NO signature.
Ultra-detailed, painterly, cinematic key art, dramatic rim lighting, AAA video game splash screen style.
`.trim().replace(/\s+/g, ' ');

async function main() {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) { console.error('ERROR: set REPLICATE_API_TOKEN'); process.exit(1); }
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

    const replicate = new Replicate({ auth: token });
    console.log('Generating Veltharas menu background (1536x1024) via gpt-image-2...');
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
