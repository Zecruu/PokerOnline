#!/usr/bin/env node
// Post-process Fire Sovereign animation sheets without @imgly.
// Approach: slice into cells, then mask the cream background to transparent
// via a direct RGB color threshold. (imgly's vips backend was segfaulting on
// these larger sheets in this Node + Windows environment.)
//
// The generated sheets all use a flat cream background (~RGB 245,240,220),
// uniform enough that a simple distance threshold gives clean alpha cutouts
// for the chunky pixel-art style we generated.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const CHARACTERS_DIR = path.resolve(__dirname, '..', 'public', 'veltharas-dominion', 'characters');
const RAW_DIR = path.join(CHARACTERS_DIR, '_raw_sheets');
const FRAME_SIZE = 256;
const COLS = 3;
const ROWS = 2;
const FRAME_COUNT = COLS * ROWS;

const FILES = {
  idle: 'fire-sovereign-idle-s.png',
  walk: 'fire-sovereign-walk-s.png',
  cast: 'fire-sovereign-cast-s.png',
};

// Tuned for the generator's "flat neutral cream-colored studio background".
const CREAM = { r: 245, g: 240, b: 220 };
const THRESH_FULL = 22;   // pixels within this distance → fully transparent
const THRESH_FEATHER = 38; // pixels within this distance → partially transparent (anti-alias edge)

function colorDistance(r, g, b) {
  const dr = r - CREAM.r;
  const dg = g - CREAM.g;
  const db = b - CREAM.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

async function maskCellToTransparent(buf) {
  // Get raw RGBA pixels.
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += 4) {
    const r = out[i], g = out[i + 1], b = out[i + 2];
    const d = colorDistance(r, g, b);
    if (d < THRESH_FULL) {
      out[i + 3] = 0; // fully transparent
    } else if (d < THRESH_FEATHER) {
      // Linear feather between full and feather thresholds.
      const t = (d - THRESH_FULL) / (THRESH_FEATHER - THRESH_FULL);
      out[i + 3] = Math.round(out[i + 3] * t);
    }
    // Else: keep original alpha.
  }
  return sharp(out, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .png()
    .toBuffer();
}

async function processOne(animKey) {
  const name = FILES[animKey];
  const rawPath = path.join(RAW_DIR, name);
  const outPath = path.join(CHARACTERS_DIR, name);
  if (!fs.existsSync(rawPath)) {
    console.warn(`  ⚠ ${name} missing from _raw_sheets, skipping`);
    return false;
  }
  const t0 = Date.now();

  const rawBuf = fs.readFileSync(rawPath);
  const meta = await sharp(rawBuf).metadata();
  const cellW = Math.floor(meta.width / COLS);
  const cellH = Math.floor(meta.height / ROWS);

  const finalCells = [];
  for (let i = 0; i < FRAME_COUNT; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    // Slice at native size.
    const cellBuf = await sharp(rawBuf)
      .extract({ left: col * cellW, top: row * cellH, width: cellW, height: cellH })
      .png()
      .toBuffer();
    // Mask cream pixels to transparent.
    const transparent = await maskCellToTransparent(cellBuf);
    // Resize to final 256×256 with `contain` so the silhouette doesn't distort.
    const finalCell = await sharp(transparent)
      .resize(FRAME_SIZE, FRAME_SIZE, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
    finalCells.push(finalCell);
    process.stdout.write('.');
  }

  const composites = [];
  for (let i = 0; i < FRAME_COUNT; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    composites.push({ input: finalCells[i], left: col * FRAME_SIZE, top: row * FRAME_SIZE });
  }
  await sharp({
    create: {
      width: FRAME_SIZE * COLS,
      height: FRAME_SIZE * ROWS,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toFile(outPath);

  const sizeKB = (fs.statSync(outPath).size / 1024).toFixed(0);
  console.log(` ✓ ${name}  (${((Date.now() - t0) / 1000).toFixed(1)}s, ${sizeKB} KB)`);
  return true;
}

async function main() {
  const target = process.argv[2];
  if (target && !FILES[target]) { console.error(`unknown anim: ${target}`); process.exit(1); }
  const plan = target ? [target] : Object.keys(FILES);
  console.log(`Processing ${plan.length} sprite sheet(s) → 768×512 (3×2 of 256×256)...\n`);
  let done = 0;
  for (let i = 0; i < plan.length; i++) {
    process.stdout.write(`[${i + 1}/${plan.length}] `);
    try { if (await processOne(plan[i])) done++; }
    catch (err) { console.error(`  ✗ ${plan[i]} failed:`, err.message); }
  }
  console.log(`\nDone. ${done}/${plan.length} ready.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
