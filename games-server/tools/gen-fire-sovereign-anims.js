#!/usr/bin/env node
// Generate Fire Sovereign player animation sprite sheets via gpt-image-2.
//
// Format (matches the existing Angelic Knight format the renderer expects):
//   3 cols × 2 rows = 6 frames per sheet
//   256×256 per frame  → final 768×512 sheet
//   3 sheets total: idle, walk, cast
//
// Usage:
//   REPLICATE_API_TOKEN=... node gen-fire-sovereign-anims.js          # all 3
//   REPLICATE_API_TOKEN=... node gen-fire-sovereign-anims.js idle      # just one
//   REPLICATE_API_TOKEN=... node gen-fire-sovereign-anims.js --force   # regen even if file exists

const fs = require('fs');
const path = require('path');
const Replicate = require('replicate');
const sharp = require('sharp');

function loadEnvLocal() {
  const candidates = [
    path.resolve(__dirname, '..', '..', '.env.local'),
    path.resolve(__dirname, '..', '.env.local'),
  ];
  for (const f of candidates) {
    if (!fs.existsSync(f)) continue;
    const txt = fs.readFileSync(f, 'utf8');
    for (const line of txt.split(/\r?\n/)) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  }
}
loadEnvLocal();

const CHARACTERS_DIR = path.resolve(__dirname, '..', 'public', 'veltharas-dominion', 'characters');
// Use the Angelic Knight idle sheet as the style anchor — chunky pixel art,
// 256x256 per frame, solid outlines, top-down 3/4 perspective.
const STYLE_REF = path.join(CHARACTERS_DIR, 'angelic-knight-idle-s.png');

// Subject baseline — same description across all frames so the model doesn't
// drift the design between cells. This is the "badass off rip" identity.
const SUBJECT = (
  'a tall regal Fire Sovereign mage character (full body, top-down 3/4 perspective, ' +
  'centered facing forward), wearing a dark obsidian-black hooded robe with deep crimson ' +
  'trim and ornate gold filigree edging, glowing molten-orange magma cracks running through ' +
  'the robe seams along the chest and down the arms, hooded face shadowed beneath a black ' +
  'horned ember-crown that sits over the hood, two horns angling outward, glowing yellow ' +
  'eyes burning inside the hood shadow, holding a tall ornate metallic staff in one hand ' +
  'topped with a pulsing crimson-orange flame orb, ember motes drifting around the body, ' +
  'broad shoulders with skull-and-flame epaulettes, imposing confident stance, ' +
  'chunky pixel-art game sprite style with solid black outlines matching the reference image'
);

const ANIMS = {
  idle: {
    file: 'fire-sovereign-idle-s.png',
    fps: 7,
    frameDescriptions: [
      'standing tall, staff planted on the ground beside him, robe falling at rest',
      'subtle breath in: chest rises slightly, ember motes drifting upward around the staff orb',
      'staff orb pulses brighter, flame inside swelling outward',
      'standing tall again at neutral pose, robe hem swaying gently',
      'subtle breath out: chest lowers, ember motes drifting downward',
      'staff orb dims slightly, returning to neutral pose to loop back to frame 1',
    ],
  },
  walk: {
    file: 'fire-sovereign-walk-s.png',
    fps: 10,
    frameDescriptions: [
      'left foot striding forward, staff held angled forward, robe trailing behind',
      'mid-step left foot down, weight shifting forward, robe billowing',
      'right foot lifting through, staff tip glowing brighter mid-stride',
      'right foot striding forward, opposite arm balancing, robe swaying right',
      'mid-step right foot down, weight forward, staff orb trailing embers',
      'left foot lifting through to begin the next cycle (loop to frame 1)',
    ],
  },
  cast: {
    file: 'fire-sovereign-cast-s.png',
    fps: 12,
    frameDescriptions: [
      'staff thrust forward, free hand extended palm-out, small flame forming in palm',
      'flame in palm growing into a basketball-sized fireball, staff orb flaring',
      'fireball at peak size, both arms forward, body leaning into the cast',
      'fireball releasing forward off-screen toward the right, body following through',
      'arms recoiling back, embers and flame trail lingering, body in follow-through pose',
      'returning to ready stance with staff down, free hand falling to side (loop ready)',
    ],
  },
};

function buildPrompt(animKey) {
  const def = ANIMS[animKey];
  const cellLines = def.frameDescriptions.map((d, i) => `Cell ${i + 1}: ${d}.`).join(' ');
  return `
A single image containing a 3-column by 2-row grid (6 cells total) showing a 6-frame animation cycle
of ${SUBJECT}. Read cells left-to-right, top-to-bottom: cell 1 (top-left) to cell 6 (bottom-right).
NO numbers, NO labels, NO borders, NO grid lines — just the 6 sprite images arranged in a clean grid
with a small gap between cells.

Subject (identical across all 6 cells): ${SUBJECT}. Centered in each cell with small padding around
edges, facing forward (toward the viewer with a slight 3/4 downward perspective). Same composition,
same colors, same design, same proportions, same props in every cell.

CRITICAL: every cell shows the EXACT same character with EXACT same details. Do NOT add, remove,
move, or resize the character or its props between cells. Same face, same robe, same staff, same
horns, same crown.

Animation: this is a 6-frame ${animKey} cycle. ${cellLines}
${animKey === 'cast' ? '' : 'Frame 6 should match frame 1 closely so the loop reads as continuous.'}

Style: chunky pixel-art game sprite, solid black 1–2 pixel outlines, hand-drawn pixel feel,
limited bold palette (deep blacks, deep crimson, glowing molten orange, gold trim accents),
strong silhouette, readable at small sizes (renders at ~96–128px). Match the chunky outlined
pixel-art style of the Angelic Knight reference image — same scale, same outline thickness,
same overall vibe but darker and more menacing.

Background: flat neutral cream-colored studio background (NOT transparent). No text, no labels,
no watermarks, no signatures, no grid lines.
`.trim().replace(/\s+/g, ' ');
}

async function generateOne(animKey, force) {
  const def = ANIMS[animKey];
  const outPath = path.join(CHARACTERS_DIR, def.file);
  if (!force && fs.existsSync(outPath)) {
    console.log(`  ✓ ${def.file} already exists, skipping (--force to regen)`);
    return;
  }
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
  const refBuf = fs.readFileSync(STYLE_REF);
  const input = {
    prompt: buildPrompt(animKey),
    aspect_ratio: '3:2',
    quality: 'high',
    number_of_images: 1,
    output_format: 'png',
    background: 'opaque',
    moderation: 'auto',
    input_images: [`data:image/png;base64,${refBuf.toString('base64')}`],
  };
  console.log(`  → generating ${animKey} (gpt-image-2 high)...`);
  const t0 = Date.now();
  const output = await replicate.run('openai/gpt-image-2', { input });
  const urls = Array.isArray(output) ? output : [output];
  const url = typeof urls[0] === 'string' ? urls[0] : urls[0].url();
  const res = await fetch(url);
  const sheetBuf = Buffer.from(await res.arrayBuffer());
  // Save raw sheet for debugging / re-slicing later.
  const rawDir = path.join(CHARACTERS_DIR, '_raw_sheets');
  fs.mkdirSync(rawDir, { recursive: true });
  fs.writeFileSync(path.join(rawDir, def.file), sheetBuf);
  // Initial in-place save (BG removal + slicing happens in a separate script).
  fs.writeFileSync(outPath, sheetBuf);
  console.log(`  ✓ wrote ${def.file} raw (${(sheetBuf.length / 1024).toFixed(0)} KB) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

async function main() {
  if (!process.env.REPLICATE_API_TOKEN) {
    console.error('Missing REPLICATE_API_TOKEN');
    process.exit(1);
  }
  if (!fs.existsSync(STYLE_REF)) {
    console.error(`Missing style reference: ${STYLE_REF}`);
    process.exit(1);
  }
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const positional = args.filter((a) => !a.startsWith('--'));
  const target = positional[0] || null;

  let plan = [];
  if (target) {
    if (!ANIMS[target]) { console.error(`unknown anim: ${target}`); process.exit(1); }
    plan = [target];
  } else {
    plan = Object.keys(ANIMS);
  }
  console.log(`Generating ${plan.length} sheet(s). Output: ${CHARACTERS_DIR}\n`);
  for (const a of plan) {
    try { await generateOne(a, force); } catch (err) { console.error(`  ✗ ${a} failed:`, err.message); }
  }
  console.log('\nDone. Next: strip backgrounds + slice/resize via post-processing script.');
}

main().catch((e) => { console.error(e); process.exit(1); });
