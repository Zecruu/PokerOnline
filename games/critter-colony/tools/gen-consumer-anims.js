#!/usr/bin/env node
/**
 * Generate Consumer boss animation sprite-sheets via gpt-image-2.
 * One call per animation, single batched 2x3 grid (6 frames), then sliced.
 *
 * Output: games-server/public/veltharas-dominion/enemies/consumer-anims/{walk,eat,die}/frame-N.png
 *
 * Usage: REPLICATE_API_TOKEN=r8_... node gen-consumer-anims.js [walk|eat|die|all]
 */
const fs = require('fs');
const path = require('path');
const Replicate = require('replicate');
const sharp = require('sharp');

const COLS = 2, ROWS = 3, FRAMES = COLS * ROWS;
const ASPECT = '2:3';

const BASE = path.resolve(__dirname, '..', '..', '..', 'games-server', 'public', 'veltharas-dominion');
const REF_IMAGE = path.join(BASE, 'enemies', 'the-consumer.png');
const OUT_ROOT = path.join(BASE, 'enemies', 'consumer-anims');

const SHARED = `
A single image containing a ${COLS}-column by ${ROWS}-row grid (${FRAMES} cells total) showing an
animation cycle. Read cells left-to-right, top-to-bottom. NO numbers, NO labels, NO borders, NO grid
lines — just the ${FRAMES} sprite images arranged in a clean grid with a small gap between cells.
Subject (identical across cells unless noted): the apex demonic devourer boss "The Consumer" —
massive humanoid torso fused with a gaping ringed mouth in its center that glows with molten lava,
long clawed arms, spiked obsidian shoulders, a crown of horns, smoke pouring from cracks all over
its body, lit from within by lava glow. Style and palette MUST match the provided reference image.
Plain flat neutral cream-colored studio background (NOT transparent). No text, no labels, no
watermarks, no signatures.
`.trim().replace(/\s+/g, ' ');

const ANIMS = {
    walk: {
        prompt: `${SHARED}
CRITICAL: every cell shows the EXACT same Consumer in the EXACT same scale and screen position.
Do NOT add or remove any element. Only the body pose changes — a heavy walk cycle facing the camera
slightly turned 3/4. Cells:
- Cell 1: contact pose, right foot just landed forward, left foot back, weight on right leg, arms
  swinging slightly, mouth-cavity glow steady.
- Cell 2: weight transfer, body lowered slightly, arms continue swing, smoke puffs at feet.
- Cell 3: passing pose, both feet roughly aligned, body at lowest point, arms at neutral.
- Cell 4: contact pose mirrored — left foot forward now, right foot back, weight on left leg.
- Cell 5: weight transfer mirrored.
- Cell 6: passing pose mirrored, ready to loop back to cell 1.
Heavy, lumbering, deliberate gait.`.trim().replace(/\s+/g, ' '),
    },
    eat: {
        prompt: `${SHARED}
This is an EATING-AND-GROWING animation. Across the 6 cells the Consumer GROWS LARGER each cell as
it consumes prey. Other elements: a smaller charred demonic minion is being devoured by the central
mouth — visible in cells 1-3, gone by cell 4.
- Cell 1: Consumer at base size, mouth opening wide, claws lifting a flailing minion toward it.
- Cell 2: Consumer slightly larger (~110%), minion partway into the mouth, lava glow brighter.
- Cell 3: Consumer larger (~120%), only minion's legs visible, intense lava glow inside maw.
- Cell 4: Consumer larger again (~130%), minion fully consumed, mouth closing, body looks more
  swollen with molten orange light bleeding through more cracks.
- Cell 5: Consumer at ~140% scale, body radiates more heat, smoke increased, mouth closed and
  satisfied.
- Cell 6: Consumer fully grown (~150% original size), powered up, glowing brighter, looming pose.
The growth must read as a steady scale-up across the cells. Same camera angle throughout.`.trim().replace(/\s+/g, ' '),
    },
    die: {
        prompt: `${SHARED}
This is a DEATH animation. The Consumer collapses and breaks apart over 6 cells. Same camera angle
throughout, same scale and frame position (do NOT shrink the figure).
- Cell 1: Consumer staggers, hunched, one arm clutching its chest, lava cracks pulsing brighter.
- Cell 2: Consumer falls to its knees, head lowered, body cracking open along major fissures
  showing intense molten interior, smoke pouring out.
- Cell 3: Consumer kneeling, body splitting further, chunks of obsidian flesh falling away,
  bright lava bursting through.
- Cell 4: Consumer collapsed forward onto hands, body breaking apart, one shoulder horn dropping,
  fragments scattering.
- Cell 5: Consumer crumbled into a heap of glowing rubble and embers, partial torso recognizable.
- Cell 6: nothing left but a smoldering pile of cracked obsidian shards, dying lava embers, and
  thick rising black smoke. Silhouette of the Consumer is gone, only debris remains.
Dramatic, cinematic, satisfying death sequence.`.trim().replace(/\s+/g, ' '),
    },
};

async function generateOne(name, replicate) {
    const cfg = ANIMS[name];
    const outDir = path.join(OUT_ROOT, name);
    fs.mkdirSync(outDir, { recursive: true });

    console.log(`[${name}] generating ${COLS}x${ROWS} sprite sheet...`);
    const refBuf = fs.readFileSync(REF_IMAGE);
    const input = {
        prompt: cfg.prompt,
        input_images: [`data:image/png;base64,${refBuf.toString('base64')}`],
        aspect_ratio: ASPECT,
        quality: 'high',
        number_of_images: 1,
        output_format: 'png',
        background: 'opaque',
        moderation: 'auto',
    };
    const output = await replicate.run('openai/gpt-image-2', { input });
    const urls = Array.isArray(output) ? output : [output];
    const u = urls[0];
    const url = typeof u === 'string' ? u : (u.url ? u.url() : u);
    const res = await fetch(url);
    const buf = Buffer.from(await res.arrayBuffer());

    fs.writeFileSync(path.join(outDir, 'sheet-raw.png'), buf);
    const meta = await sharp(buf).metadata();
    const cellW = Math.floor(meta.width / COLS);
    const cellH = Math.floor(meta.height / ROWS);
    console.log(`[${name}] sheet ${meta.width}x${meta.height}, slicing ${cellW}x${cellH} cells...`);

    for (let i = 0; i < FRAMES; i++) {
        const col = i % COLS, row = Math.floor(i / COLS);
        await sharp(buf).extract({ left: col * cellW, top: row * cellH, width: cellW, height: cellH })
            .toFile(path.join(outDir, `frame-${i}.png`));
    }
    console.log(`[${name}] done (${FRAMES} frames)`);
}

async function main() {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) { console.error('set REPLICATE_API_TOKEN'); process.exit(1); }
    const replicate = new Replicate({ auth: token });
    const arg = process.argv[2] || 'all';
    const names = arg === 'all' ? Object.keys(ANIMS) : [arg];
    for (const n of names) {
        if (!ANIMS[n]) { console.error('unknown anim:', n); continue; }
        await generateOne(n, replicate);
    }
    console.log('\nAll done. Run strip-bg-consumer-anims.js to clean backgrounds.');
}

main().catch((e) => { console.error(e); process.exit(1); });
