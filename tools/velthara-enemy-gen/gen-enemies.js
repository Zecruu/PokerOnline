#!/usr/bin/env node
/**
 * Velthara Dominion 2D — enemy sprite-sheet generator.
 *
 * Generates 6-frame 64×64 horizontal strips (384×64 total, cream BG) for
 * walk/attack/death actions via Replicate's openai/gpt-image-2.
 *
 * gpt-image-2 only allows 1:1 / 3:2 / 2:3 aspect ratios, so each call
 * produces a 3-col × 2-row grid (aspect 3:2). We then slice the grid,
 * resize each cell to 64×64, and compose them into the horizontal strip
 * the Godot project expects.
 *
 * Modes
 *   single  — generate ONE enemy (3 sheets). Used for the sample-quality check.
 *   batch   — read enemies.json and generate all of them in parallel batches.
 *
 * Usage
 *   REPLICATE_API_TOKEN=r8_... node gen-enemies.js single <enemy_id>
 *   REPLICATE_API_TOKEN=r8_... node gen-enemies.js batch [--concurrency=5] [--skip-existing]
 */
const fs = require('fs');
const path = require('path');
const Replicate = require('replicate');
const sharp = require('sharp');

const COLS = 3;
const ROWS = 2;
const FRAME_COUNT = COLS * ROWS; // 6
const FRAME_PX = 64;
const STRIP_W = FRAME_PX * FRAME_COUNT; // 384
const STRIP_H = FRAME_PX; // 64

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(REPO_ROOT, 'godot', 'velthara-dominion-2d', 'assets', 'enemies');
const RAW_DIR = path.join(__dirname, 'raw');
const ENEMIES_JSON = path.join(__dirname, 'enemies.json');

const ACTIONS = ['walk', 'attack', 'death'];

const STYLE = 'dark fantasy chibi pixel-art sprite, volcanic hellscape theme, top-down 3/4 perspective, chunky high-contrast colors, crisp edges, moderate detail';

const ACTION_POSES = {
  walk: ({i}) => {
    const cycle = [
      'standing neutral pose facing the camera, weight on both legs',
      'mid-step left leg forward, body slightly leaning forward',
      'mid-step right leg forward, opposite arm swinging',
      'standing neutral pose facing the camera, weight on both legs',
      'mid-step left leg back, slight bob downward',
      'mid-step right leg back, opposite arm swinging back',
    ];
    return cycle[i % 6];
  },
  attack: ({i}) => {
    const cycle = [
      'wind-up pose pulling arm or weapon back, body coiled',
      'pre-strike anticipation, brow furrowed, claws or weapon raised high',
      'mid-strike lunge forward, weapon or claws extended toward viewer, motion lines',
      'peak strike impact, body fully extended forward, weapon or claws at maximum reach with flash effect',
      'follow-through after the strike, leaning forward with weapon down',
      'recovery to neutral pose, weight settling',
    ];
    return cycle[i % 6];
  },
  death: ({i}) => {
    const cycle = [
      'taking lethal damage, body recoiling backward, eyes wide',
      'staggering, body bent over, hands or claws clutching the wound',
      'falling backward, knees buckling, body tilted away',
      'fully collapsed onto the ground in profile, limbs splayed',
      'lifeless on the ground, body partially dissolving into dark smoke or embers',
      'just a small pile of bones, ash, or smoldering remains, almost nothing left',
    ];
    return cycle[i % 6];
  },
};

function buildPrompt(enemy, action) {
  const cells = [];
  for (let i = 0; i < FRAME_COUNT; i++) {
    cells.push(`Cell ${i + 1}: ${ACTION_POSES[action]({i})}.`);
  }
  return `A single image containing a ${COLS}-column by ${ROWS}-row grid (${FRAME_COUNT} cells total) showing the ${action} animation of a single ${enemy.subject}. Read cells left-to-right, top-to-bottom: cell 1 (top-left) to cell ${FRAME_COUNT} (bottom-right). NO numbers, NO labels, NO borders, NO grid lines, NO gutters — just ${FRAME_COUNT} sprite images arranged cleanly with a small uniform gap between cells.

Subject (identical across all ${FRAME_COUNT} cells unless animation-state differs): ${enemy.subject}. ${enemy.flavor}. Style: ${STYLE}. ${enemy.palette ? 'Palette: ' + enemy.palette + '.' : ''}

CRITICAL: every cell shows the EXACT same character with EXACT same proportions, clothing, props, and colors. Do NOT swap any feature between cells. Only the body pose changes frame-to-frame to show the ${action} animation.

Frame-by-frame poses (the ONLY variation across cells):
${cells.join('\n')}

Background: solid flat off-white cream color (RGB approximately 245,238,222), completely uniform, NOT transparent, NOT textured, NOT shaded. The cream background fills every cell behind the sprite. Each sprite sits centered in its cell with small margin so it doesn't touch the cell edges.

The subject should be small enough that the full character is visible in every cell with the body fully contained, head to toe. Subject occupies roughly 60% of cell height.

No text, no labels, no watermarks, no signatures, no UI elements, no shadow grounds beyond the sprite's own shadow if any, no border lines.`;
}

function sliceCells(buf, _meta) {
  return sharp(buf).metadata().then(async (meta) => {
    const cellW = Math.floor(meta.width / COLS);
    const cellH = Math.floor(meta.height / ROWS);
    const cells = [];
    for (let i = 0; i < FRAME_COUNT; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cellBuf = await sharp(buf)
        .extract({ left: col * cellW, top: row * cellH, width: cellW, height: cellH })
        .resize(FRAME_PX, FRAME_PX, { kernel: 'lanczos3', fit: 'cover' })
        .png()
        .toBuffer();
      cells.push(cellBuf);
    }
    return cells;
  });
}

async function buildHorizontalStrip(cellBufs) {
  const composites = cellBufs.map((buf, i) => ({ input: buf, left: i * FRAME_PX, top: 0 }));
  return sharp({
    create: { width: STRIP_W, height: STRIP_H, channels: 4, background: { r: 245, g: 238, b: 222, alpha: 1 } },
  })
    .composite(composites)
    .png()
    .toBuffer();
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function runWithRetry(replicate, input, label) {
  // Replicate throttles to 6 RPM / burst 1 while account credit is <$5,
  // returning 429s with a `retry_after` in seconds. We honor that and
  // back off; for other 5xx errors we do a short exponential backoff.
  let attempt = 0;
  while (true) {
    attempt++;
    try {
      return await replicate.run('openai/gpt-image-2', { input });
    } catch (e) {
      const msg = String(e && e.message || '');
      const m429 = /429/.test(msg);
      const retryAfterMatch = /retry_after"?\s*:\s*(\d+)/.exec(msg);
      const fivexx = /50\d/.test(msg);
      if (attempt >= 6 || (!m429 && !fivexx)) {
        throw e;
      }
      const wait = m429
        ? (retryAfterMatch ? parseInt(retryAfterMatch[1], 10) * 1000 : 12000) + 500
        : Math.min(30000, 1500 * Math.pow(2, attempt));
      console.log(`  [${label}] ${m429 ? '429' : '5xx'} attempt ${attempt}, sleeping ${(wait / 1000).toFixed(1)}s`);
      await sleep(wait);
    }
  }
}

async function genOneSheet(replicate, enemy, action) {
  const outPath = path.join(OUT_DIR, `${enemy.id}-${action}.png`);
  const rawPath = path.join(RAW_DIR, `${enemy.id}-${action}-raw.png`);
  const prompt = buildPrompt(enemy, action);
  const input = {
    prompt,
    aspect_ratio: '3:2',
    quality: 'medium',
    number_of_images: 1,
    output_format: 'png',
    background: 'opaque',
    moderation: 'auto',
  };
  console.log(`  [${enemy.id} ${action}] generating...`);
  const t0 = Date.now();
  const output = await runWithRetry(replicate, input, `${enemy.id} ${action}`);
  const urls = Array.isArray(output) ? output : [output];
  const url = typeof urls[0] === 'string' ? urls[0] : urls[0].url();
  const res = await fetch(url);
  const rawBuf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(RAW_DIR, { recursive: true });
  fs.writeFileSync(rawPath, rawBuf);
  const cells = await sliceCells(rawBuf);
  const strip = await buildHorizontalStrip(cells);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(outPath, strip);
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`  [${enemy.id} ${action}] ${dt}s, raw ${(rawBuf.length / 1024).toFixed(0)}KB, strip ${(strip.length / 1024).toFixed(0)}KB`);
  return outPath;
}

async function genEnemy(replicate, enemy, opts = {}) {
  const results = [];
  for (const action of ACTIONS) {
    const outPath = path.join(OUT_DIR, `${enemy.id}-${action}.png`);
    if (opts.skipExisting && fs.existsSync(outPath)) {
      console.log(`  [${enemy.id} ${action}] skip (exists)`);
      results.push(outPath);
      continue;
    }
    try {
      results.push(await genOneSheet(replicate, enemy, action));
    } catch (e) {
      console.error(`  [${enemy.id} ${action}] FAILED: ${e.message}`);
      results.push(null);
    }
  }
  return results;
}

async function batch(replicate, enemies, concurrency, skipExisting) {
  console.log(`Batch mode: ${enemies.length} enemies × ${ACTIONS.length} sheets = ${enemies.length * ACTIONS.length} calls`);
  console.log(`Concurrency: ${concurrency}, skipExisting: ${skipExisting}`);
  const queue = [...enemies];
  let inFlight = 0;
  let done = 0;
  const total = enemies.length;
  return new Promise((resolve, reject) => {
    const pump = () => {
      if (queue.length === 0 && inFlight === 0) {
        resolve();
        return;
      }
      while (inFlight < concurrency && queue.length > 0) {
        const enemy = queue.shift();
        inFlight++;
        genEnemy(replicate, enemy, { skipExisting })
          .then(() => {
            done++;
            inFlight--;
            console.log(`✓ ${done}/${total} ${enemy.id} (${inFlight} in-flight, ${queue.length} queued)`);
            pump();
          })
          .catch((e) => {
            inFlight--;
            console.error(`✗ ${enemy.id} batch error: ${e.message}`);
            pump();
          });
      }
    };
    pump();
  });
}

async function main() {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    console.error('ERROR: set REPLICATE_API_TOKEN');
    process.exit(1);
  }
  const replicate = new Replicate({ auth: token });
  const args = process.argv.slice(2);
  const mode = args[0] || 'single';

  if (mode === 'single') {
    const wantId = args[1];
    if (!wantId) {
      console.error('Usage: node gen-enemies.js single <enemy_id>');
      process.exit(1);
    }
    if (!fs.existsSync(ENEMIES_JSON)) {
      console.error(`Missing ${ENEMIES_JSON}`);
      process.exit(1);
    }
    const enemies = JSON.parse(fs.readFileSync(ENEMIES_JSON, 'utf8'));
    const enemy = enemies.find((e) => e.id === wantId);
    if (!enemy) {
      console.error(`No enemy with id "${wantId}" in enemies.json`);
      process.exit(1);
    }
    await genEnemy(replicate, enemy);
    return;
  }

  if (mode === 'batch') {
    const concurrency = parseInt((args.find((a) => a.startsWith('--concurrency=')) || '').split('=')[1] || '4', 10);
    const skipExisting = args.includes('--skip-existing');
    const onlyMissingBosses = args.includes('--enemies-only');
    let enemies = JSON.parse(fs.readFileSync(ENEMIES_JSON, 'utf8'));
    if (onlyMissingBosses) enemies = enemies.filter((e) => !e.boss);
    await batch(replicate, enemies, concurrency, skipExisting);
    return;
  }

  console.error('Unknown mode. Use: single <id>  or  batch [--concurrency=N] [--skip-existing]');
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
