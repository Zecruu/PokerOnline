#!/usr/bin/env node
// Slice the bg-stripped 2×3 grid sheets into 384×64 horizontal strips that
// the in-engine renderer expects. Reads from the main enemies/ dir (where
// strip-bg-velthara.js wrote bg-stripped grids) and overwrites in place.
//
// The raw cream-bg grids stay safe in enemies/_raw_sheets/.
//
// Usage: node slice-velthara-sheets.js          # all 36 sheets
//        node slice-velthara-sheets.js tank      # only tank (3 sheets)

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ENEMIES_DIR = path.resolve(__dirname, '..', 'public', 'veltharas-dominion', 'enemies');
const FRAME_SIZE = 64;
const COLS = 2;
const ROWS = 3;
const FRAME_COUNT = COLS * ROWS;

const ENEMY_FILES = {
  tank:           'plate-corpse-tank',
  splitter:       'larva-bloated-splitter',
  bomber:         'chained-husk-bomber',
  mini:           'severed-head-mini',
  sticky:         'gore-blob-sticky',
  goblin:         'imp-scavenger-goblin',
  necromancer:    'cultist-hollow-necromancer',
  magma_crawler:  'magma-arachnid-crawler',
  leech:          'bile-worm-leech',
  pusher:         'bone-titan-pusher',
  clowns:         'mask-jester-clowns',
  wraith:         'shadow-specter-wraith',
};
const STATES = ['walk', 'attack', 'death'];

async function sliceOne(name) {
  const filePath = path.join(ENEMIES_DIR, name);
  if (!fs.existsSync(filePath)) {
    console.warn(`  ⚠ ${name} missing, skipping`);
    return false;
  }
  const buf = fs.readFileSync(filePath);
  const meta = await sharp(buf).metadata();
  // Already a horizontal strip? Skip.
  if (meta.width === FRAME_SIZE * FRAME_COUNT && meta.height === FRAME_SIZE) {
    console.log(`  • ${name} already 384×64, skipping`);
    return true;
  }
  const cellW = Math.floor(meta.width / COLS);
  const cellH = Math.floor(meta.height / ROWS);
  const frames = [];
  for (let i = 0; i < FRAME_COUNT; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const cellPng = await sharp(buf)
      .extract({ left: col * cellW, top: row * cellH, width: cellW, height: cellH })
      .resize(FRAME_SIZE, FRAME_SIZE, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
    frames.push(cellPng);
  }
  const composites = frames.map((b, i) => ({
    input: b,
    left: i * FRAME_SIZE,
    top: 0,
  }));
  await sharp({
    create: {
      width: FRAME_SIZE * FRAME_COUNT,
      height: FRAME_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toFile(filePath);
  console.log(`  ✓ ${name}  (${(fs.statSync(filePath).size / 1024).toFixed(0)} KB)`);
  return true;
}

async function main() {
  const enemyArg = process.argv[2];
  if (enemyArg && !ENEMY_FILES[enemyArg]) {
    console.error(`unknown enemy: ${enemyArg}`);
    process.exit(1);
  }
  const targets = enemyArg ? { [enemyArg]: ENEMY_FILES[enemyArg] } : ENEMY_FILES;

  const files = [];
  for (const base of Object.values(targets)) {
    for (const s of STATES) files.push(`${base}-${s}.png`);
  }
  console.log(`Slicing ${files.length} sheets to 384×64...\n`);
  let done = 0;
  for (let i = 0; i < files.length; i++) {
    process.stdout.write(`[${i + 1}/${files.length}] `);
    try {
      if (await sliceOne(files[i])) done++;
    } catch (err) {
      console.error(`  ✗ ${files[i]} failed:`, err.message);
    }
  }
  console.log(`\nDone. ${done}/${files.length}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
