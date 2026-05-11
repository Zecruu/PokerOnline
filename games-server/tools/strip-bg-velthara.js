#!/usr/bin/env node
// Strip cream studio background from generated Velthara enemy sprite sheets,
// then slice the 2×3 raw grid into 6 frames and compose into the final
// 384×64 horizontal strip the in-engine renderer expects.
//
// Reads FROM enemies/_raw_sheets/ (preserved originals) so re-runs are
// idempotent and never lose source data.
//
// Usage: node strip-bg-velthara.js              # all 12 enemies × 3 states
//        node strip-bg-velthara.js tank          # only tank (3 sheets)

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { removeBackground } = require('@imgly/background-removal-node');

const ENEMIES_DIR = path.resolve(__dirname, '..', 'public', 'veltharas-dominion', 'enemies');
const BACKUP_DIR = path.join(ENEMIES_DIR, '_raw_sheets');
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

async function processOne(name) {
  const backupPath = path.join(BACKUP_DIR, name);
  const outPath = path.join(ENEMIES_DIR, name);
  if (!fs.existsSync(backupPath)) {
    console.warn(`  ⚠ ${name} missing from _raw_sheets, skipping`);
    return false;
  }
  const t0 = Date.now();

  // 1. Strip the cream background from the raw 2×3 grid.
  const rawBuf = fs.readFileSync(backupPath);
  const blob = new Blob([rawBuf], { type: 'image/png' });
  const stripped = await removeBackground(blob);
  const strippedBuf = Buffer.from(await stripped.arrayBuffer());

  // 2. Slice the stripped grid into 6 frames.
  const meta = await sharp(strippedBuf).metadata();
  const cellW = Math.floor(meta.width / COLS);
  const cellH = Math.floor(meta.height / ROWS);
  const frames = [];
  for (let i = 0; i < FRAME_COUNT; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const cellPng = await sharp(strippedBuf)
      .extract({ left: col * cellW, top: row * cellH, width: cellW, height: cellH })
      .resize(FRAME_SIZE, FRAME_SIZE, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }, // keep transparent
      })
      .png()
      .toBuffer();
    frames.push(cellPng);
  }

  // 3. Compose into a single 384×64 horizontal strip.
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
    .toFile(outPath);

  const sizeKB = (fs.statSync(outPath).size / 1024).toFixed(0);
  console.log(`  ✓ ${name}  (${((Date.now() - t0) / 1000).toFixed(1)}s, ${sizeKB} KB)`);
  return true;
}

async function main() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
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
  console.log(`Processing ${files.length} sprite sheets (strip + slice + compose)...\n`);
  let done = 0;
  for (let i = 0; i < files.length; i++) {
    process.stdout.write(`[${i + 1}/${files.length}] `);
    try {
      if (await processOne(files[i])) done++;
    } catch (err) {
      console.error(`  ✗ ${files[i]} failed:`, err.message);
    }
  }
  console.log(`\nDone. ${done}/${files.length} sheets ready as 384×64 horizontal strips.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
