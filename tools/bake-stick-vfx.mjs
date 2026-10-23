#!/usr/bin/env node
/**
 * Bake Stick Royale 2D VFX presets from ZecruRigger when available.
 *
 *   node tools/bake-stick-vfx.mjs --zecrurigger /path/to/zecrurigger
 *
 * Reads docs/vfx.md, docs/surface-aura.md, and any portable VFX library JSON
 * in the checkout. Converts particle/burst, sword ribbons, ground rings, and
 * violet/cyan surface-aura presets into compact canvas params, keyed to the
 * same clip ids as motion/clips.json.
 *
 * If the private repo cannot be read (this VM: clone 404), writes authored
 * presets in the SAME JSON format.
 *
 * Output: games/stick-royale/vfx/presets.json
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'games/stick-royale/vfx/presets.json');
const MOTION = path.join(ROOT, 'games/stick-royale/motion/clips.json');

function argValue(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

function runCli(zecru, args) {
  const cli = path.join(zecru, 'agent/cli.mjs');
  if (!fs.existsSync(cli)) return { ok: false, error: `missing ${cli}` };
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: zecru,
    encoding: 'utf8',
    timeout: 20000
  });
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error ? String(result.error) : null
  };
}

function parseJsonLoose(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch { /* continue */ }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
}

function authoredPresets() {
  return {
    meleeRibbon: {
      type: 'ribbon',
      width: 7,
      life: 0.24,
      color: '#ffe7a3',
      fade: 0.2,
      joint: 'hand_R',
      length: 22
    },
    castRibbon: {
      type: 'ribbon',
      width: 5,
      life: 0.28,
      color: '#7dd3fc',
      fade: 0.22,
      joint: 'hand_R',
      length: 26
    },
    impactBurst: {
      type: 'burst',
      count: 14,
      speed: 90,
      life: 0.32,
      size: 3.2,
      gravity: 180,
      colors: ['#fff4c2', '#ffb020', '#ff6a00']
    },
    groundRing: {
      type: 'ring',
      radius: 18,
      grow: 28,
      life: 0.38,
      width: 2,
      color: '#fde68a',
      fade: 0.3
    },
    spawnRing: {
      type: 'ring',
      radius: 10,
      grow: 22,
      life: 0.4,
      width: 2,
      color: '#5eead4',
      fade: 0.32
    },
    auraViolet: {
      type: 'aura',
      color: '#a78bfa',
      glow: 0.55,
      wispCount: 5,
      wispColor: '#c4b5fd',
      radius: 16,
      pulse: 1.6
    },
    auraCyan: {
      type: 'aura',
      color: '#22d3ee',
      glow: 0.5,
      wispCount: 5,
      wispColor: '#67e8f9',
      radius: 16,
      pulse: 1.4
    },
    deathPoof: {
      type: 'burst',
      count: 18,
      speed: 70,
      life: 0.45,
      size: 4,
      gravity: 40,
      colors: ['#e5e7eb', '#9ca3af', '#6b7280']
    },
    bloodSpray: {
      type: 'blood',
      count: 10,
      speed: 120,
      life: 0.4,
      size: 2.6,
      gravity: 260,
      color: '#b91c1c'
    },
    bloodSplatter: {
      type: 'stain',
      count: 6,
      radius: 10,
      life: 4.5,
      color: '#7f1d1d'
    },
    spark: {
      type: 'burst',
      count: 10,
      speed: 100,
      life: 0.3,
      size: 2.4,
      gravity: 60,
      colors: ['#f8fafc', '#fde68a', '#93c5fd']
    }
  };
}

function defaultBindings(motion) {
  const frameOf = (clipId, t) => {
    const clip = motion && motion.clips && motion.clips[clipId];
    if (!clip) return 8;
    return Math.round((clip.duration || 0.5) * (clip.fps || 30) * t);
  };
  return {
    attack_melee: [
      { preset: 'meleeRibbon', frame: frameOf('attack_melee', 0.35) },
      { preset: 'impactBurst', frame: frameOf('attack_melee', 0.55) },
      { preset: 'groundRing', frame: frameOf('attack_melee', 0.55) }
    ],
    attack_cast: [
      { preset: 'castRibbon', frame: frameOf('attack_cast', 0.4) },
      { preset: 'impactBurst', frame: frameOf('attack_cast', 0.62) }
    ],
    hit: [
      { preset: 'bloodSpray', frame: 1, alt: 'spark' },
      { preset: 'impactBurst', frame: 2 }
    ],
    death: [
      { preset: 'deathPoof', frame: 2 },
      { preset: 'bloodSplatter', frame: 4, alt: 'spark' }
    ],
    spawn: [
      { preset: 'spawnRing', frame: 0 }
    ]
  };
}

function mapLibraryPreset(raw) {
  const type = String(raw.type || raw.kind || '').toLowerCase();
  if (type.includes('ribbon') || type.includes('trail') || type.includes('sword')) {
    return {
      type: 'ribbon',
      width: raw.width || raw.trailWidth || 7,
      life: raw.life || raw.lifetime || 0.24,
      color: raw.color || raw.tint || '#ffe7a3',
      fade: raw.fade || 0.2,
      joint: raw.joint || 'hand_R',
      length: raw.length || 22
    };
  }
  if (type.includes('ring') || type.includes('ground')) {
    return {
      type: 'ring',
      radius: raw.radius || 16,
      grow: raw.grow || raw.radiusEnd || 26,
      life: raw.life || 0.38,
      width: raw.width || 2,
      color: raw.color || '#fde68a',
      fade: raw.fade || 0.3
    };
  }
  if (type.includes('aura') || type.includes('glow') || type.includes('wisp') || type.includes('flame')) {
    const violet = /violet|purple|magenta/i.test(JSON.stringify(raw));
    return {
      type: 'aura',
      color: raw.color || (violet ? '#a78bfa' : '#22d3ee'),
      glow: raw.glow || 0.5,
      wispCount: raw.wispCount || raw.count || 5,
      wispColor: raw.wispColor || raw.color || (violet ? '#c4b5fd' : '#67e8f9'),
      radius: raw.radius || 16,
      pulse: raw.pulse || 1.5
    };
  }
  return {
    type: 'burst',
    count: raw.count || raw.burst || 12,
    speed: raw.speed || 90,
    life: raw.life || raw.lifetime || 0.32,
    size: raw.size || 3,
    gravity: raw.gravity || 160,
    colors: raw.colors || [raw.color || '#fff4c2', '#ffb020']
  };
}

function tryZecruRigger(zecru) {
  const report = { attempted: true, path: zecru, files: [], steps: [] };
  if (!fs.existsSync(zecru)) {
    report.error = `checkout not found: ${zecru}`;
    return { report, presets: null, bindings: null };
  }
  for (const rel of ['docs/vfx.md', 'docs/surface-aura.md']) {
    const p = path.join(zecru, rel);
    report.files.push({ rel, exists: fs.existsSync(p) });
  }

  const attempts = [
    ['library.inspect', '--vfx'],
    ['vfx', 'library'],
    ['vfx', 'export', '--json'],
    ['catalog', 'vfx']
  ];
  let library = null;
  for (const args of attempts) {
    const res = runCli(zecru, args);
    report.steps.push({ cmd: 'node agent/cli.mjs ' + args.join(' '), ok: res.ok, status: res.status, error: res.error, stderr: (res.stderr || '').slice(0, 300) });
    if (res.ok) {
      library = parseJsonLoose(res.stdout);
      if (library) break;
    }
  }

  const guessFiles = [];
  function walk(dir, depth) {
    if (depth > 3 || !fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory() && !['node_modules', '.git'].includes(ent.name)) walk(p, depth + 1);
      else if (/\.json$/i.test(ent.name) && /vfx|aura|fx/i.test(ent.name)) guessFiles.push(p);
    }
  }
  walk(zecru, 0);
  report.libraryFiles = guessFiles.slice(0, 20).map((p) => path.relative(zecru, p));
  if (!library) {
    for (const f of guessFiles) {
      try {
        const j = JSON.parse(fs.readFileSync(f, 'utf8'));
        if (j && (j.presets || j.vfx || j.library)) {
          library = j;
          report.usedFile = path.relative(zecru, f);
          break;
        }
      } catch { /* skip */ }
    }
  }
  if (!library) return { report, presets: null, bindings: null };

  const rawPresets = library.presets || library.vfx || library.library || {};
  const presets = authoredPresets();
  const list = Array.isArray(rawPresets) ? rawPresets : Object.entries(rawPresets).map(([k, v]) => ({ id: k, ...v }));
  for (const item of list) {
    const id = item.id || item.name || item.preset;
    if (!id) continue;
    const mapped = mapLibraryPreset(item);
    const key = /ribbon|trail|sword/i.test(id) ? ( /cast|throw/i.test(id) ? 'castRibbon' : 'meleeRibbon' )
      : /violet|purple/i.test(id) ? 'auraViolet'
      : /cyan|teal/i.test(id) ? 'auraCyan'
      : /ring|ground/i.test(id) ? 'groundRing'
      : /death|poof/i.test(id) ? 'deathPoof'
      : /blood/i.test(id) ? 'bloodSpray'
      : /burst|impact|hit/i.test(id) ? 'impactBurst'
      : null;
    if (key) presets[key] = { ...presets[key], ...mapped, zecruriggerId: id };
  }
  report.mapped = Object.keys(presets).filter((k) => presets[k].zecruriggerId);
  return { report, presets, bindings: library.bindings || null };
}

function main() {
  const zecru = argValue('--zecrurigger', process.env.ZECRURIGGER || '');
  let motion = null;
  if (fs.existsSync(MOTION)) {
    try { motion = JSON.parse(fs.readFileSync(MOTION, 'utf8')); } catch { motion = null; }
  }
  let source = 'authored-fallback';
  let presets = authoredPresets();
  let bindings = defaultBindings(motion);
  let report = { attempted: false };

  if (zecru) {
    const result = tryZecruRigger(path.resolve(zecru));
    report = result.report;
    if (result.presets) {
      presets = result.presets;
      if (result.bindings) bindings = result.bindings;
      source = 'zecrurigger';
    } else {
      console.error('[bake-stick-vfx] ZecruRigger VFX bake failed; writing authored-fallback presets.');
      console.error(JSON.stringify(report, null, 2));
    }
  } else {
    report.note = 'No --zecrurigger path. Clone of https://github.com/Zecruu/zecrurigger failed (private, 404).';
    console.error(report.note);
  }

  const payload = {
    version: 1,
    format: 'stick-royale-vfx/1',
    source,
    bakedAt: new Date().toISOString(),
    zecruriggerReport: report,
    presets,
    bindings
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${OUT} source=${source}`);
}

main();
