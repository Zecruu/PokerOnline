#!/usr/bin/env node
// Generate Velthara Dominion enemy sprite sheets via gpt-image-2.
//
// Each gen produces a 6-frame animation sheet (2 cols × 3 rows grid) of one
// enemy state (walk / attack / death). The grid is then sliced and composed
// into a horizontal 384×64 strip matching the existing in-engine layout
// (frame * frameWidth=64, frameHeight=64, 6 frames).
//
// Usage:
//   REPLICATE_API_TOKEN=... node gen-velthara-enemies.js              # all 12 × 3 = 36 sheets
//   REPLICATE_API_TOKEN=... node gen-velthara-enemies.js tank          # only tank (3 states)
//   REPLICATE_API_TOKEN=... node gen-velthara-enemies.js tank walk     # only tank walk
//   REPLICATE_API_TOKEN=... node gen-velthara-enemies.js --force ...   # regen even if file exists
//
// Run from the repo root or from games-server/tools.
//
// Cost notes (gpt-image-2 high quality, ~$0.10–0.15/call):
//   one enemy state ≈ $0.15
//   one enemy (3 states) ≈ $0.40
//   full batch (12 enemies × 3) ≈ $4–6

const fs = require('fs');
const path = require('path');
const Replicate = require('replicate');
const sharp = require('sharp');

// ── env loader (reads .env.local at repo root) ──────────────
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

const ENEMIES_DIR = path.resolve(__dirname, '..', 'public', 'veltharas-dominion', 'enemies');
const STYLE_REF = path.join(ENEMIES_DIR, 'skeleton-swarm-walk.png');

// ── enemy descriptors (subject, walk pose, attack pose, death sequence) ──
// Style: dark fantasy, dominion-grade horror. NOT pg.
const ENEMIES = {
  tank: {
    fileBase: 'plate-corpse-tank', // → plate-corpse-tank-walk.png etc.
    subject:
      'a hulking 7-foot armored corpse golem, rusted blood-stained iron plate armor, ' +
      'cracked iron mask weeping dark blood from the eye-slits, hunched posture, ' +
      'chains hanging from pauldrons, exposed grey rotting flesh between plates, ' +
      'dark fantasy painterly style',
    walk: 'heavy lumbering step, weight-bearing pose, axe dragged behind on the ground',
    attack: 'overhead two-handed slam with the axe, spine arched back to gain force',
    death: 'collapsing to one knee, mask cracking open, dark blood spraying out as the body falls forward',
  },
  splitter: {
    fileBase: 'larva-bloated-splitter',
    subject:
      'a bloated corrupted larva creature the size of a small barrel, translucent slime-skin glowing ' +
      'with a sickly green core visible through the flesh, six twitching mandible-arms, ' +
      'chitinous spine plates, dark fantasy painterly style',
    walk: 'pulsing crawl, body undulating forward on stubby legs',
    attack: 'rearing up, mandibles flared open, slime drooling',
    death: 'body bursts in a wet split, smaller spawn-larvae erupting from the cavity',
  },
  bomber: {
    fileBase: 'chained-husk-bomber',
    subject:
      'a twitching kamikaze husk wrapped in heavy iron chains and burning sigil-runes, ' +
      'gaunt skeletal frame with patches of rotted skin, glowing red runes carved into its chest, ' +
      'lit fuse jutting from its open ribcage, dark fantasy painterly style',
    walk: 'jerky, accelerating shuffle as if drawn forward against its will',
    attack: 'sprinting at the camera with arms outstretched, fuse sparking brighter',
    death: 'detonating outward in a fireball, chains snapping and flying free, ash silhouette remaining',
  },
  mini: {
    fileBase: 'severed-head-mini',
    subject:
      'a small skittering monster the size of a melon shaped like a charred animal skull, ' +
      'four insectoid claw-legs, glowing red ember-eyes inside the eye sockets, ' +
      'thin smoke trailing from cracks in the bone, dark fantasy painterly style',
    walk: 'scurrying forward low to the ground on its claw-legs',
    attack: 'leaping forward with claws extended, jaws opened wide showing inner glow',
    death: 'rolling onto its back, claws curling inward, ember-eyes fading out as smoke disperses',
  },
  sticky: {
    fileBase: 'gore-blob-sticky',
    subject:
      'a faceless hunched gore blob, glistening dark-red flesh with veins pulsing, ' +
      'multiple jagged tooth-rings opening across its surface, dripping acidic mucus from every opening, ' +
      'dark fantasy painterly style',
    walk: 'slow oozing drag forward, pulling its body along',
    attack: 'lurching upward, tooth-rings opening wide and spitting acid',
    death: 'collapsing into a puddle, tooth rings dissolving into liquid',
  },
  goblin: {
    fileBase: 'imp-scavenger-goblin',
    subject:
      'a small scavenger imp wearing a torn skull-mask, jagged teeth visible through the mouth-hole, ' +
      'mottled grey-green skin, hunched posture with crude bone-blade in one hand, ' +
      'dark fantasy painterly style',
    walk: 'stalking sideways with the blade raised, predatory crouch',
    attack: 'lunging forward, blade slashing in an arc',
    death: 'falling backward clutching its chest, mask shattering as it hits the ground',
  },
  necromancer: {
    fileBase: 'cultist-hollow-necromancer',
    subject:
      'a hollow-eyed cultist in tattered black hooded robes, exposed ribcage visible through ' +
      'torn fabric, gaunt skeletal hands channeling green flame, dripping black ichor down the chin, ' +
      'dark fantasy painterly style',
    walk: 'slow ritual stride, robe trailing, hands raised to chest',
    attack: 'arms thrown wide, green flame erupting between the palms',
    death: 'collapsing inward as the green flame consumes the body, robes crumbling to ash',
  },
  magma_crawler: {
    fileBase: 'magma-arachnid-crawler',
    subject:
      'a cracked-stone arachnid the size of a wolf, basalt carapace with glowing molten cracks ' +
      'leaking lava-blood from every joint, six segmented legs ending in obsidian claws, ' +
      'dark fantasy painterly style',
    walk: 'low scuttle on six legs, lava drips marking each step',
    attack: 'rearing up on hind legs, fangs flared, magma streaming from its mouth',
    death: 'shattering apart, magma core exposed and exploding outward',
  },
  leech: {
    fileBase: 'bile-worm-leech',
    subject:
      'a fanged eyeless worm three feet long, segmented dark-purple body coated in dripping yellow bile, ' +
      'circular mouth ringed with concentric rows of needle teeth, ' +
      'dark fantasy painterly style',
    walk: 'undulating forward, body arcing up and down',
    attack: 'lunging toward the viewer, mouth opened to reveal the rings of teeth',
    death: 'flopping over, body rupturing, bile pooling beneath',
  },
  pusher: {
    fileBase: 'bone-titan-pusher',
    subject:
      'a 9-foot bone titan with a massive battering-ram skull for a head, exposed flayed spine, ' +
      'patches of rotting muscle clinging to ribs, oversized clawed forearms, ' +
      'dark fantasy painterly style',
    walk: 'heavy stomp forward, skull lowered like a charging bull',
    attack: 'full-body charge, skull thrust forward to ram',
    death: 'spine snapping in half, body folding to the ground as bones clatter loose',
  },
  clowns: {
    fileBase: 'mask-jester-clowns',
    subject:
      'a grinning porcelain-mask demon wearing tattered jester rags, painted blood-smile across the mask, ' +
      'oversized clawed hands holding a rusted dagger, dark eye-holes weeping black liquid, ' +
      'dark fantasy painterly style',
    walk: 'mocking skipping gait, dagger spinning',
    attack: 'frenzied stab with both arms, mask cracked wider into a manic grin',
    death: 'mask shatters revealing nothing but darkness inside, body crumpling like empty cloth',
  },
  wraith: {
    fileBase: 'shadow-specter-wraith',
    subject:
      'a tattered hooded specter wreathed in shadow, void-black eye sockets weeping smoke, ' +
      'ghostly torso with no lower body — instead trailing wisps of dark smoke down to nothing, ' +
      'skeletal hands extended forward, dark fantasy painterly style',
    walk: 'gliding forward, smoke trail flowing behind',
    attack: 'arms swept wide releasing a shadow-burst, hood thrown back to reveal a screaming skull',
    death: 'dissolving into wisps of black smoke that drift up and fade',
  },
};

const STATES = ['walk', 'attack', 'death'];

// ── prompt builder ───────────────────────────────────────────
function buildPrompt(enemy, state) {
  const def = ENEMIES[enemy];
  const stateDesc = def[state];
  const stateLabel = state === 'walk' ? 'walking forward' : state === 'attack' ? 'attacking' : 'dying';
  return `
A single image containing a 2-column by 3-row grid (6 cells total) showing a 6-frame animation cycle
of ${def.subject} ${stateLabel}. Read cells left-to-right, top-to-bottom: cell 1 (top-left) to cell 6
(bottom-right). NO numbers, NO labels, NO borders, NO grid lines — just the 6 sprite images arranged
in a clean grid with a small gap between cells.

Subject (identical across all 6 cells): ${def.subject}. Centered in each cell, facing slightly toward
the lower-right (3/4 perspective). Same composition, same colors, same proportions, same props in every cell.

CRITICAL: every cell shows the EXACT same character with EXACT same details. Do NOT add, remove, move,
or resize the character or its props between cells.

Animation: ${stateDesc}. Six smooth frames forming a clean loop (or a single completed action for death).
Cell 1 starts the action, cell 6 ends it. ${state === 'death' ? '' : 'Cell 6 should match cell 1 closely so the loop reads as continuous.'}

Style: dark fantasy painterly game sprite, hand-drawn feel, gritty horror, blood and decay encouraged
where it fits the subject. Strong silhouette, high contrast, readable at small sizes (renders at ~64px).
Match the dark, painterly enemy art style of the existing skeleton swarm reference image.

Background: flat neutral cream-colored studio background (NOT transparent). No text, no labels,
no watermarks, no signatures, no grid lines.
`.trim().replace(/\s+/g, ' ');
}

// ── generation + slicing ─────────────────────────────────────
async function generateOne(enemy, state, force) {
  const def = ENEMIES[enemy];
  const outName = `${def.fileBase}-${state}.png`;
  const outPath = path.join(ENEMIES_DIR, outName);
  if (!force && fs.existsSync(outPath)) {
    console.log(`  ✓ ${outName} already exists, skipping (--force to regen)`);
    return outName;
  }

  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
  const refBuf = fs.readFileSync(STYLE_REF);

  const input = {
    prompt: buildPrompt(enemy, state),
    aspect_ratio: '2:3',
    quality: 'high',
    number_of_images: 1,
    output_format: 'png',
    background: 'opaque',
    moderation: 'auto',
    input_images: [`data:image/png;base64,${refBuf.toString('base64')}`],
  };

  console.log(`  → generating ${enemy}/${state} (gpt-image-2 high)...`);
  const t0 = Date.now();
  const output = await replicate.run('openai/gpt-image-2', { input });
  const urls = Array.isArray(output) ? output : [output];
  const url = typeof urls[0] === 'string' ? urls[0] : urls[0].url();
  const res = await fetch(url);
  const sheetBuf = Buffer.from(await res.arrayBuffer());

  // Save raw 2x3 sheet for debugging.
  const rawDir = path.join(ENEMIES_DIR, '_raw_sheets');
  fs.mkdirSync(rawDir, { recursive: true });
  fs.writeFileSync(path.join(rawDir, outName), sheetBuf);

  // Slice into 6 frames, scale each to 64×64, compose into a single 384×64 strip.
  const meta = await sharp(sheetBuf).metadata();
  const cellW = Math.floor(meta.width / 2);
  const cellH = Math.floor(meta.height / 3);
  const FRAME_SIZE = 64;
  const frames = [];
  for (let i = 0; i < 6; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cellPng = await sharp(sheetBuf)
      .extract({ left: col * cellW, top: row * cellH, width: cellW, height: cellH })
      .resize(FRAME_SIZE, FRAME_SIZE, { fit: 'contain', background: { r: 245, g: 240, b: 220, alpha: 1 } })
      .png()
      .toBuffer();
    frames.push(cellPng);
  }

  // Composite frames horizontally into one strip.
  const composites = await Promise.all(frames.map(async (b, i) => ({
    input: b,
    left: i * FRAME_SIZE,
    top: 0,
  })));
  await sharp({
    create: { width: FRAME_SIZE * 6, height: FRAME_SIZE, channels: 4, background: { r: 245, g: 240, b: 220, alpha: 1 } },
  })
    .composite(composites)
    .png()
    .toFile(outPath);

  console.log(`  ✓ wrote ${outName} (${(fs.statSync(outPath).size / 1024).toFixed(0)} KB) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  return outName;
}

// ── CLI ──────────────────────────────────────────────────────
async function main() {
  if (!process.env.REPLICATE_API_TOKEN) {
    console.error('Missing REPLICATE_API_TOKEN (set env var or add to .env.local)');
    process.exit(1);
  }
  if (!fs.existsSync(STYLE_REF)) {
    console.error(`Missing style reference: ${STYLE_REF}`);
    process.exit(1);
  }
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const positional = args.filter((a) => !a.startsWith('--'));
  const enemy = positional[0] || null;
  const state = positional[1] || null;

  let plan = [];
  if (enemy && state) plan = [[enemy, state]];
  else if (enemy) plan = STATES.map((s) => [enemy, s]);
  else for (const e of Object.keys(ENEMIES)) for (const s of STATES) plan.push([e, s]);

  console.log(`Generating ${plan.length} sheet(s). Output: ${ENEMIES_DIR}\n`);
  const completed = [];
  for (const [e, s] of plan) {
    if (!ENEMIES[e]) { console.warn(`  unknown enemy: ${e}`); continue; }
    if (!STATES.includes(s)) { console.warn(`  unknown state: ${s}`); continue; }
    try {
      const name = await generateOne(e, s, force);
      completed.push(name);
    } catch (err) {
      console.error(`  ✗ ${e}/${s} failed:`, err.message);
    }
  }
  console.log(`\nDone. ${completed.length}/${plan.length} sheets written.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
