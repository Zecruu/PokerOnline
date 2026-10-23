#!/usr/bin/env node
/**
 * Bake Stick Royale 2D motion clips.
 *
 * Preferred path (Michael's machine, after cloning ZecruRigger):
 *   git clone https://github.com/Zecruu/zecrurigger.git
 *   cd zecrurigger && npm install && npm run build   # follow its README
 *   node agent/cli.mjs catalog human
 *   node tools/bake-stick-motion.mjs --zecrurigger /path/to/zecrurigger
 *
 * This cloud agent could not clone Zecruu/zecrurigger (private repo, 404 with
 * the agent's GitHub token). Without a checkout the script writes
 * code-authored curves in the SAME JSON format so clips can be dropped in later.
 *
 * Output: games/stick-royale/motion/clips.json
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'games/stick-royale/motion/clips.json');

const JOINTS = [
  'hips', 'spine', 'chest', 'neck', 'head',
  'upperArm_L', 'lowerArm_L', 'hand_L',
  'upperArm_R', 'lowerArm_R', 'hand_R',
  'upperLeg_L', 'lowerLeg_L', 'foot_L',
  'upperLeg_R', 'lowerLeg_R', 'foot_R'
];

const JOINT_ALIASES = {
  hips: ['hips', 'Hips', 'pelvis', 'Pelvis', 'DEF-hips', 'mixamorig:Hips', 'root'],
  spine: ['spine', 'Spine', 'DEF-spine', 'mixamorig:Spine', 'spine1'],
  chest: ['chest', 'Chest', 'spine1', 'Spine1', 'Spine2', 'DEF-spine.001', 'mixamorig:Spine1', 'mixamorig:Spine2'],
  neck: ['neck', 'Neck', 'DEF-neck', 'mixamorig:Neck'],
  head: ['head', 'Head', 'DEF-head', 'mixamorig:Head'],
  upperArm_L: ['upperArm_L', 'LeftArm', 'upper_arm.L', 'DEF-upper_arm.L', 'mixamorig:LeftArm', 'upperarm_l'],
  lowerArm_L: ['lowerArm_L', 'LeftForeArm', 'forearm.L', 'DEF-forearm.L', 'mixamorig:LeftForeArm', 'lowerarm_l'],
  hand_L: ['hand_L', 'LeftHand', 'hand.L', 'DEF-hand.L', 'mixamorig:LeftHand'],
  upperArm_R: ['upperArm_R', 'RightArm', 'upper_arm.R', 'DEF-upper_arm.R', 'mixamorig:RightArm', 'upperarm_r'],
  lowerArm_R: ['lowerArm_R', 'RightForeArm', 'forearm.R', 'DEF-forearm.R', 'mixamorig:RightForeArm', 'lowerarm_r'],
  hand_R: ['hand_R', 'RightHand', 'hand.R', 'DEF-hand.R', 'mixamorig:RightHand'],
  upperLeg_L: ['upperLeg_L', 'LeftUpLeg', 'thigh.L', 'DEF-thigh.L', 'mixamorig:LeftUpLeg', 'upleg_l'],
  lowerLeg_L: ['lowerLeg_L', 'LeftLeg', 'shin.L', 'DEF-shin.L', 'mixamorig:LeftLeg', 'leg_l'],
  foot_L: ['foot_L', 'LeftFoot', 'foot.L', 'DEF-foot.L', 'mixamorig:LeftFoot'],
  upperLeg_R: ['upperLeg_R', 'RightUpLeg', 'thigh.R', 'DEF-thigh.R', 'mixamorig:RightUpLeg', 'upleg_r'],
  lowerLeg_R: ['lowerLeg_R', 'RightLeg', 'shin.R', 'DEF-shin.R', 'mixamorig:RightLeg', 'leg_r'],
  foot_R: ['foot_R', 'RightFoot', 'foot.R', 'DEF-foot.R', 'mixamorig:RightFoot']
};

const CLIP_ROLES = {
  idle: ['idle', 'idle_loop', 'breathing', 'stand', 'human-idle'],
  walk: ['walk', 'walk_loop', 'walkforward', 'locomotion'],
  run: ['run', 'run_loop', 'sprint'],
  attack_melee: ['attack', 'melee', 'slash', 'jab', 'punch', 'swing', 'fight'],
  attack_cast: ['throw', 'cast', 'throw_object', 'ranged', 'shoot', 'bow'],
  hit: ['hit', 'hit_react', 'hurt', 'flinch', 'impact'],
  death: ['death', 'die', 'death_01', 'collapse']
};

function argValue(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

function runCli(zecru, args, timeoutMs = 20000) {
  const cli = path.join(zecru, 'agent/cli.mjs');
  if (!fs.existsSync(cli)) {
    return { ok: false, error: `missing ${cli}` };
  }
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: zecru,
    encoding: 'utf8',
    timeout: timeoutMs
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
  try { return JSON.parse(text); } catch { /* fall through */ }
  const start = text.indexOf('{') >= 0 && (text.indexOf('[') < 0 || text.indexOf('{') < text.indexOf('['))
    ? text.indexOf('{')
    : text.indexOf('[');
  const end = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
}

function pickAlias(name, catalogNames) {
  const aliases = JOINT_ALIASES[name] || [name];
  const lower = catalogNames.map((n) => String(n));
  for (const a of aliases) {
    const hit = lower.find((n) => n === a || n.toLowerCase() === a.toLowerCase() || n.endsWith(a));
    if (hit) return hit;
  }
  return null;
}

function quatToSideAngle(qx, qy, qz, qw) {
  // Project a bone quaternion onto the side-view (X/Y) plane → 2D angle.
  const x = 1 - 2 * (qy * qy + qz * qz);
  const y = 2 * (qx * qy + qw * qz);
  return Math.atan2(y, x);
}

function sampleClipFromLibrary(zecru, clipId, fps, failures) {
  const attempts = [
    ['run', '--template', 'human', '--clip', clipId, '--sample-fps', String(fps), '--project', '2d-side'],
    ['run', 'human', clipId, '--fps', String(fps)],
    ['library.inspect', clipId],
    ['library', 'inspect', clipId]
  ];
  for (const args of attempts) {
    const res = runCli(zecru, args);
    if (!res.ok) {
      failures.push({ clipId, args, status: res.status, error: res.error, stderr: (res.stderr || '').slice(0, 400) });
      continue;
    }
    const json = parseJsonLoose(res.stdout);
    if (json) return { json, args };
  }
  return null;
}

function convertSampledClip(raw, role, fps, catalogJoints) {
  const frames = raw.frames || raw.samples || raw.keyframes || [];
  const duration = raw.duration || (frames.length / fps);
  const tracks = {};
  for (const joint of JOINTS) {
    const srcName = pickAlias(joint, catalogJoints) || joint;
    tracks[joint] = [];
    for (const frame of frames) {
      const bones = frame.bones || frame.joints || frame;
      const b = bones[srcName] || bones[joint] || null;
      if (!b) {
        tracks[joint].push(0);
        continue;
      }
      if (typeof b === 'number') tracks[joint].push(round(b));
      else if (b.angle != null) tracks[joint].push(round(b.angle));
      else if (b.q) tracks[joint].push(round(quatToSideAngle(b.q[0], b.q[1], b.q[2], b.q[3])));
      else if (b.qx != null) tracks[joint].push(round(quatToSideAngle(b.qx, b.qy, b.qz, b.qw)));
      else tracks[joint].push(0);
    }
  }
  return {
    id: role,
    source: 'zecrurigger',
    zecruriggerClipId: raw.id || raw.clipId || raw.name || role,
    fps,
    duration: round(duration),
    loop: role !== 'death' && role !== 'hit' && role !== 'attack_melee' && role !== 'attack_cast',
    joints: tracks
  };
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}

function authoredClip(id, fps, seconds, loop, fill) {
  const frames = Math.max(2, Math.round(seconds * fps));
  const joints = {};
  for (const j of JOINTS) joints[j] = [];
  for (let i = 0; i < frames; i++) {
    const t = i / (frames - (loop ? 0 : 1));
    const pose = fill(t, i, frames);
    for (const j of JOINTS) joints[j].push(round(pose[j] || 0));
  }
  return { id, source: 'authored-fallback', zecruriggerClipId: null, fps, duration: round(seconds), loop, joints };
}

function poseBase() {
  return {
    hips: 0, spine: 0, chest: 0, neck: 0, head: 0,
    upperArm_L: 0.28, lowerArm_L: 0.18, hand_L: 0.05,
    upperArm_R: -0.18, lowerArm_R: 0.22, hand_R: 0.04,
    upperLeg_L: 0.06, lowerLeg_L: 0.04, foot_L: -0.04,
    upperLeg_R: -0.04, lowerLeg_R: 0.05, foot_R: -0.03
  };
}

function authoredClips(fps) {
  const idle = authoredClip('idle', fps, 2.0, true, (t) => {
    const p = poseBase();
    const b = Math.sin(t * Math.PI * 2) * 0.035;
    p.spine = b;
    p.chest = b * 0.6;
    p.head = -b * 0.4;
    p.upperArm_L += b * 0.15;
    p.upperArm_R -= b * 0.15;
    return p;
  });
  const walk = authoredClip('walk', fps, 0.8, true, (t) => {
    const p = poseBase();
    const s = Math.sin(t * Math.PI * 2);
    const c = Math.cos(t * Math.PI * 2);
    p.hips = s * 0.04;
    p.spine = s * 0.06;
    p.upperLeg_L = s * 0.62;
    p.lowerLeg_L = Math.max(0, -s) * 0.55;
    p.foot_L = c * 0.18;
    p.upperLeg_R = -s * 0.62;
    p.lowerLeg_R = Math.max(0, s) * 0.55;
    p.foot_R = -c * 0.18;
    p.upperArm_L = -s * 0.55;
    p.lowerArm_L = 0.25 + Math.max(0, s) * 0.2;
    p.upperArm_R = s * 0.55;
    p.lowerArm_R = 0.25 + Math.max(0, -s) * 0.2;
    return p;
  });
  const run = authoredClip('run', fps, 0.55, true, (t) => {
    const p = poseBase();
    const s = Math.sin(t * Math.PI * 2);
    const c = Math.cos(t * Math.PI * 2);
    p.hips = s * 0.07;
    p.spine = 0.12 + s * 0.08;
    p.chest = 0.08;
    p.upperLeg_L = s * 0.95;
    p.lowerLeg_L = Math.max(0, -s) * 0.85;
    p.foot_L = c * 0.28;
    p.upperLeg_R = -s * 0.95;
    p.lowerLeg_R = Math.max(0, s) * 0.85;
    p.foot_R = -c * 0.28;
    p.upperArm_L = -s * 0.85;
    p.lowerArm_L = 0.45;
    p.upperArm_R = s * 0.85;
    p.lowerArm_R = 0.45;
    return p;
  });
  const attack_melee = authoredClip('attack_melee', fps, 0.5, false, (t) => {
    const p = poseBase();
    const wind = t < 0.35 ? (t / 0.35) : 0;
    const slash = t >= 0.35 && t < 0.7 ? (t - 0.35) / 0.35 : t >= 0.7 ? 1 : 0;
    const rec = t >= 0.7 ? (t - 0.7) / 0.3 : 0;
    p.spine = -0.15 * wind + 0.35 * slash - 0.1 * rec;
    p.chest = p.spine * 0.8;
    p.upperArm_R = -0.9 * wind + 1.35 * slash - 0.2 * rec;
    p.lowerArm_R = 0.7 * wind - 0.15 * slash;
    p.hand_R = 0.2 * slash;
    p.upperArm_L = 0.25 + 0.2 * slash;
    p.upperLeg_R = 0.15 * slash;
    return p;
  });
  const attack_cast = authoredClip('attack_cast', fps, 0.55, false, (t) => {
    const p = poseBase();
    const up = t < 0.45 ? t / 0.45 : 1;
    const throwN = t >= 0.45 ? (t - 0.45) / 0.55 : 0;
    p.spine = -0.08 * up + 0.2 * throwN;
    p.upperArm_R = -1.15 * up + 1.6 * throwN;
    p.lowerArm_R = 0.85 * up - 0.4 * throwN;
    p.upperArm_L = -0.7 * up + 0.5 * throwN;
    p.lowerArm_L = 0.5 * up;
    p.head = -0.12 * up;
    return p;
  });
  const hit = authoredClip('hit', fps, 0.28, false, (t) => {
    const p = poseBase();
    const k = Math.sin(Math.min(1, t) * Math.PI);
    p.spine = -0.28 * k;
    p.chest = -0.18 * k;
    p.head = 0.2 * k;
    p.upperArm_L = 0.45 * k;
    p.upperArm_R = 0.35 * k;
    p.upperLeg_L = -0.12 * k;
    return p;
  });
  const death = authoredClip('death', fps, 0.7, false, (t) => {
    const p = poseBase();
    const k = Math.min(1, t * 1.15);
    const ease = k * k;
    p.hips = 0.15 * ease;
    p.spine = 1.15 * ease;
    p.chest = 0.7 * ease;
    p.neck = 0.45 * ease;
    p.head = 0.55 * ease;
    p.upperArm_L = 0.4 + 0.5 * ease;
    p.upperArm_R = -0.2 + 0.7 * ease;
    p.upperLeg_L = 0.55 * ease;
    p.lowerLeg_L = 0.7 * ease;
    p.upperLeg_R = 0.35 * ease;
    p.lowerLeg_R = 0.85 * ease;
    return p;
  });
  return { idle, walk, run, attack_melee, attack_cast, hit, death };
}

function tryZecruRigger(zecru, fps) {
  const report = { attempted: true, path: zecru, steps: [], failures: [] };
  if (!fs.existsSync(zecru)) {
    report.error = `checkout not found: ${zecru}`;
    return { report, clips: null };
  }
  const catalog = runCli(zecru, ['catalog', 'human']);
  report.steps.push({
    cmd: 'node agent/cli.mjs catalog human',
    ok: catalog.ok,
    status: catalog.status,
    error: catalog.error,
    stderr: (catalog.stderr || '').slice(0, 500),
    stdoutHead: (catalog.stdout || '').slice(0, 400)
  });
  if (!catalog.ok) return { report, clips: null };

  const catalogJson = parseJsonLoose(catalog.stdout) || {};
  const jointNames = catalogJson.joints || catalogJson.bones || catalogJson.jointNames || [];
  const clipList = catalogJson.clips || catalogJson.animations || catalogJson.clipIds || [];
  report.jointCount = Array.isArray(jointNames) ? jointNames.length : 0;
  report.clipIds = Array.isArray(clipList) ? clipList.map((c) => c.id || c.name || c) : [];

  const inspect = runCli(zecru, ['library.inspect']);
  report.steps.push({
    cmd: 'node agent/cli.mjs library.inspect',
    ok: inspect.ok,
    status: inspect.status,
    stderr: (inspect.stderr || '').slice(0, 400)
  });

  const clips = {};
  const fallback = authoredClips(fps);
  for (const [role, aliases] of Object.entries(CLIP_ROLES)) {
    const names = report.clipIds.map(String);
    const match = names.find((n) => aliases.some((a) => n.toLowerCase().includes(a)));
    if (!match) {
      report.failures.push({ role, reason: 'no matching clip id in catalog', aliases });
      clips[role] = fallback[role];
      continue;
    }
    const sampled = sampleClipFromLibrary(zecru, match, fps, report.failures);
    if (!sampled) {
      clips[role] = fallback[role];
      continue;
    }
    clips[role] = convertSampledClip(sampled.json, role, fps, jointNames.map(String));
    clips[role].zecruriggerClipId = match;
  }
  const baked = Object.values(clips).filter((c) => c.source === 'zecrurigger').length;
  report.bakedFromRigger = baked;
  return { report, clips: baked > 0 ? clips : null };
}

function main() {
  const fps = Number(argValue('--fps', '30')) || 30;
  const zecru = argValue('--zecrurigger', process.env.ZECRURIGGER || '');
  let source = 'authored-fallback';
  let clips = authoredClips(fps);
  let report = { attempted: false };

  if (zecru) {
    const result = tryZecruRigger(path.resolve(zecru), fps);
    report = result.report;
    if (result.clips) {
      clips = result.clips;
      source = 'zecrurigger';
    } else {
      console.error('[bake-stick-motion] ZecruRigger bake failed; writing authored-fallback clips.');
      console.error(JSON.stringify(report, null, 2));
    }
  } else {
    report.note = 'No --zecrurigger path. Agent could not clone https://github.com/Zecruu/zecrurigger (private, 404).';
    console.error(report.note);
  }

  const payload = {
    version: 1,
    format: 'stick-royale-motion/1',
    source,
    fps,
    joints: JOINTS,
    bakedAt: new Date().toISOString(),
    zecruriggerReport: report,
    clips
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload));
  console.log(`Wrote ${OUT} source=${source} clips=${Object.keys(clips).join(',')}`);
}

main();
