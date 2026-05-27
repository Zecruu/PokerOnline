#!/usr/bin/env node
/**
 * Velthara Dominion 2D — playable character sprite-sheet generator.
 *
 * Generates 3-col × 2-row grids of 256×256 cells (768×512 PNGs) for
 * idle/walk/cast actions via Replicate's openai/gpt-image-2. Output is
 * saved directly with no slicing — the project's character pipeline
 * already expects this grid layout (see Fire Sovereign sheets).
 *
 * Anchors style on the existing Fire Sovereign sheets via input_images
 * so the new characters share palette/perspective.
 *
 * Modes
 *   single  — generate ONE character (3 sheets). Used for sample-quality check.
 *   batch   — read characters.json and generate all of them serially.
 *
 * Usage
 *   REPLICATE_API_TOKEN=r8_... node gen-characters.js single <char_id>
 *   REPLICATE_API_TOKEN=r8_... node gen-characters.js batch [--skip-existing]
 */
const fs = require('fs');
const path = require('path');
const Replicate = require('replicate');
const sharp = require('sharp');

const COLS = 3;
const ROWS = 2;
const CELL_PX = 256;
const SHEET_W = COLS * CELL_PX; // 768
const SHEET_H = ROWS * CELL_PX; // 512

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(REPO_ROOT, 'godot', 'velthara-dominion-2d', 'assets', 'characters');
const RAW_DIR = path.join(__dirname, 'raw-characters');
const REF_DIR = path.join(REPO_ROOT, 'godot', 'velthara-dominion-2d', 'assets', 'characters');
const CHARS_JSON = path.join(__dirname, 'characters.json');

const ACTIONS = ['idle', 'walk', 'cast'];

const STYLE = 'dark fantasy painterly chibi-ish stylized full-body character sprite, top-down 3/4 perspective, crisp clean edges with moderate detail, warm volcanic palette accents, single character clearly centered in each cell with full body visible head-to-toe, sized to occupy about 70% of the cell height';

const ACTION_POSES = {
  idle: ({i}) => {
    const cycle = [
      'standing neutral pose facing the camera, weight balanced, arms relaxed at sides, subtle slight forward lean',
      'slight breathing rise, shoulders very faintly raised, hint of motion',
      'standing neutral pose with the head turned a tiny bit to one side',
      'subtle weight shift onto the right foot, hip cocked slightly',
      'slight breathing settle, shoulders softened back down',
      'return to the neutral standing pose to close the loop',
    ];
    return cycle[i % 6];
  },
  walk: ({i}) => {
    const cycle = [
      'neutral standing pose, about to step',
      'left leg forward in a mid-step, opposite arm swinging forward, slight forward lean',
      'left foot planted, body weight transferring forward',
      'transition pose with feet briefly together, weight centered',
      'right leg forward in a mid-step, opposite arm swinging forward, slight forward lean',
      'right foot planted, weight transferring forward, returning toward neutral for loop',
    ];
    return cycle[i % 6];
  },
  cast: ({i}) => {
    const cycle = [
      'standing neutral pose, both hands relaxed at sides, calm before the spell',
      'arms beginning to rise, hands glowing softly, head tilted slightly forward in focus',
      'arms raised to chest height, hands cupping a building orb of magical energy that glows brightly between them',
      'peak cast pose — arms thrust outward and forward toward the viewer, hands releasing a bright burst of magical energy with radial light streaks',
      'follow-through pose — arms still extended forward, energy dissipating from the hands, body slightly leaned forward',
      'recovery — arms lowering back to the sides, last wisps of magical residue fading off the hands',
    ];
    return cycle[i % 6];
  },
};

function buildPrompt(char, action) {
  const cells = [];
  for (let i = 0; i < COLS * ROWS; i++) {
    cells.push(`Cell ${i + 1}: ${ACTION_POSES[action]({i})}.`);
  }
  return `A single image containing a ${COLS}-column by ${ROWS}-row grid (${COLS * ROWS} cells total) showing the ${action} animation of a single ${char.subject}. Read cells left-to-right, top-to-bottom: cell 1 (top-left) to cell ${COLS * ROWS} (bottom-right). NO numbers, NO labels, NO borders, NO grid lines, NO gutters between cells — just ${COLS * ROWS} character images arranged cleanly with a small uniform gap.

Subject (identical across all ${COLS * ROWS} cells unless the animation requires it to differ): ${char.subject}. ${char.flavor}. Style: ${STYLE}. ${char.palette ? 'Palette: ' + char.palette + '.' : ''}

CRITICAL: every cell shows the EXACT same character with EXACT same proportions, robes, props, and colors. Do NOT swap any feature between cells. Do NOT change the character's identity or outfit. Only the body pose changes frame-to-frame to show the ${action} animation.

Frame-by-frame poses (the ONLY variation across cells):
${cells.join('\n')}

Background: solid flat off-white cream color (RGB approximately 245,238,222), completely uniform, NOT transparent, NOT textured, NOT shaded. The cream background fills every cell behind the character. Each character sits centered in its cell with small margin so it doesn't touch the cell edges. Full body visible — head to toe — in every cell.

No text, no labels, no watermarks, no signatures, no UI elements, no shadow grounds beyond the character's own ground shadow if any, no border lines.`;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function runWithRetry(replicate, input, label) {
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
      if (attempt >= 6 || (!m429 && !fivexx)) throw e;
      const wait = m429
        ? (retryAfterMatch ? parseInt(retryAfterMatch[1], 10) * 1000 : 12000) + 500
        : Math.min(30000, 1500 * Math.pow(2, attempt));
      console.log(`  [${label}] ${m429 ? '429' : '5xx'} attempt ${attempt}, sleeping ${(wait / 1000).toFixed(1)}s`);
      await sleep(wait);
    }
  }
}

function pickReferenceFor(char, action) {
  // Anchor style on the existing Fire Sovereign sheet matching the same action
  // so palette + framing + cell layout transfer cleanly.
  const ref = path.join(REF_DIR, `fire-sovereign-${action}-s.png`);
  return fs.existsSync(ref) ? ref : null;
}

async function genOneSheet(replicate, char, action) {
  const outName = `${char.id}-${action}-s.png`;
  const outPath = path.join(OUT_DIR, outName);
  const rawPath = path.join(RAW_DIR, `${char.id}-${action}-raw.png`);
  const prompt = buildPrompt(char, action);
  const input = {
    prompt,
    aspect_ratio: '3:2',
    quality: 'medium',
    number_of_images: 1,
    output_format: 'png',
    background: 'opaque',
    moderation: 'auto',
  };
  const refPath = pickReferenceFor(char, action);
  if (refPath != null) {
    const buf = fs.readFileSync(refPath);
    input.input_images = [`data:image/png;base64,${buf.toString('base64')}`];
  }
  console.log(`  [${char.id} ${action}] generating${refPath ? ' (with FS reference)' : ''}...`);
  const t0 = Date.now();
  const output = await runWithRetry(replicate, input, `${char.id} ${action}`);
  const urls = Array.isArray(output) ? output : [output];
  const url = typeof urls[0] === 'string' ? urls[0] : urls[0].url();
  const res = await fetch(url);
  const rawBuf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(RAW_DIR, { recursive: true });
  fs.writeFileSync(rawPath, rawBuf);
  // Resize the raw grid down to the project's 768×512 canvas. gpt-image-2
  // returns ~1024×683 at 3:2 medium quality — we just downsample, no slicing.
  const sheet = await sharp(rawBuf)
    .resize(SHEET_W, SHEET_H, { kernel: 'lanczos3', fit: 'fill' })
    .png()
    .toBuffer();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(outPath, sheet);
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`  [${char.id} ${action}] ${dt}s, raw ${(rawBuf.length / 1024).toFixed(0)}KB, sheet ${(sheet.length / 1024).toFixed(0)}KB → ${outName}`);
  return outPath;
}

async function genChar(replicate, char, opts = {}) {
  const results = [];
  for (const action of ACTIONS) {
    const outName = `${char.id}-${action}-s.png`;
    const outPath = path.join(OUT_DIR, outName);
    if (opts.skipExisting && fs.existsSync(outPath)) {
      console.log(`  [${char.id} ${action}] skip (exists)`);
      results.push(outPath);
      continue;
    }
    try {
      results.push(await genOneSheet(replicate, char, action));
    } catch (e) {
      console.error(`  [${char.id} ${action}] FAILED: ${e.message}`);
      results.push(null);
    }
  }
  return results;
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
  if (!fs.existsSync(CHARS_JSON)) {
    console.error(`Missing ${CHARS_JSON}`);
    process.exit(1);
  }
  const chars = JSON.parse(fs.readFileSync(CHARS_JSON, 'utf8'));

  if (mode === 'single') {
    const wantId = args[1];
    if (!wantId) {
      console.error('Usage: node gen-characters.js single <char_id>');
      process.exit(1);
    }
    const char = chars.find((c) => c.id === wantId);
    if (!char) {
      console.error(`No character with id "${wantId}" in characters.json`);
      process.exit(1);
    }
    await genChar(replicate, char);
    return;
  }

  if (mode === 'batch') {
    const skipExisting = args.includes('--skip-existing');
    for (const c of chars) {
      await genChar(replicate, c, { skipExisting });
    }
    return;
  }

  console.error('Unknown mode. Use: single <id>  or  batch [--skip-existing]');
  process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
