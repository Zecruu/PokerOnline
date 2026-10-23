/**
 * Stick Royale — 2D stick skeleton driven by baked JSON clips.
 * Joint set maps to ZecruRigger / Mesh2Motion human template.
 */
(function (root) {
  'use strict';

  const JOINT_ORDER = [
    'hips', 'spine', 'chest', 'neck', 'head',
    'upperArm_L', 'lowerArm_L', 'hand_L',
    'upperArm_R', 'lowerArm_R', 'hand_R',
    'upperLeg_L', 'lowerLeg_L', 'foot_L',
    'upperLeg_R', 'lowerLeg_R', 'foot_R'
  ];

  const BONES = [
    { id: 'hips', parent: null, len: 0, rest: 0 },
    { id: 'spine', parent: 'hips', len: 9, rest: -Math.PI / 2 },
    { id: 'chest', parent: 'spine', len: 8, rest: 0 },
    { id: 'neck', parent: 'chest', len: 4, rest: 0 },
    { id: 'head', parent: 'neck', len: 5, rest: 0 },
    { id: 'upperArm_L', parent: 'chest', len: 8, rest: 2.5 },
    { id: 'lowerArm_L', parent: 'upperArm_L', len: 7, rest: 0.35 },
    { id: 'hand_L', parent: 'lowerArm_L', len: 3.2, rest: 0.1 },
    { id: 'upperArm_R', parent: 'chest', len: 8, rest: 0.65 },
    { id: 'lowerArm_R', parent: 'upperArm_R', len: 7, rest: 0.3 },
    { id: 'hand_R', parent: 'lowerArm_R', len: 3.2, rest: 0.1 },
    { id: 'upperLeg_L', parent: 'hips', len: 9, rest: 1.45 },
    { id: 'lowerLeg_L', parent: 'upperLeg_L', len: 8.5, rest: 0.15 },
    { id: 'foot_L', parent: 'lowerLeg_L', len: 3.4, rest: 1.2 },
    { id: 'upperLeg_R', parent: 'hips', len: 9, rest: 1.7 },
    { id: 'lowerLeg_R', parent: 'upperLeg_R', len: 8.5, rest: 0.12 },
    { id: 'foot_R', parent: 'lowerLeg_R', len: 3.4, rest: 1.15 }
  ];

  const ROLE_MODS = {
    tank: { speed: 0.85, amp: 0.78, stance: 1.18, scale: 1.18 },
    melee: { speed: 1.0, amp: 1.0, stance: 1.0, scale: 1.0 },
    swarm: { speed: 1.35, amp: 1.15, stance: 0.78, scale: 0.72 },
    ranged: { speed: 1.05, amp: 0.9, stance: 0.92, scale: 0.94 },
    splash: { speed: 0.95, amp: 1.0, stance: 1.0, scale: 0.98 },
    assassin: { speed: 1.4, amp: 1.2, stance: 0.82, scale: 0.9 },
    siege: { speed: 0.7, amp: 0.7, stance: 1.25, scale: 1.28 },
    healer: { speed: 0.95, amp: 0.85, stance: 0.95, scale: 0.96 },
    support: { speed: 0.9, amp: 0.88, stance: 1.1, scale: 1.12 },
    champion: { speed: 1.05, amp: 1.08, stance: 1.08, scale: 1.22 },
    building: { speed: 0.2, amp: 0.2, stance: 1.0, scale: 1.0 },
    spell: { speed: 1, amp: 1, stance: 1, scale: 1 }
  };

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }

  function sampleTrack(arr, t, loop) {
    if (!arr || !arr.length) return 0;
    const n = arr.length;
    if (n === 1) return arr[0];
    const u = loop ? ((t % 1) + 1) % 1 : clamp01(t);
    const f = u * (loop ? n : n - 1);
    const i = Math.floor(f);
    const j = loop ? (i + 1) % n : Math.min(n - 1, i + 1);
    return lerp(arr[i], arr[j], f - i);
  }

  function poseFromClip(clip, time, amp) {
    const pose = {};
    const t = clip.duration > 0 ? time / clip.duration : 0;
    for (const j of JOINT_ORDER) {
      pose[j] = sampleTrack(clip.joints[j], t, clip.loop) * amp;
    }
    return pose;
  }

  function blendPose(a, b, k) {
    const out = {};
    for (const j of JOINT_ORDER) out[j] = lerp(a[j] || 0, b[j] || 0, k);
    return out;
  }

  function modifiersFor(def) {
    return ROLE_MODS[def && def.role] || ROLE_MODS.melee;
  }

  function clipForPose(clips, pose, def) {
    if (pose === 'attack') {
      return (def && def.range > 2.2) ? clips.attack_cast : clips.attack_melee;
    }
    if (pose === 'hit') return clips.hit;
    if (pose === 'death') return clips.death;
    if (pose === 'walk' || pose === 'run') {
      return (def && def.speed >= 1.5) ? clips.run : clips.walk;
    }
    return clips.idle;
  }

  function createAnimator() {
    return { clipId: 'idle', time: 0, prevId: null, prevTime: 0, fade: 0, fadeDur: 0.12 };
  }

  function stepAnimator(anim, clips, pose, def, dt) {
    const next = clipForPose(clips, pose, def);
    const nextId = next ? next.id : 'idle';
    if (nextId !== anim.clipId) {
      anim.prevId = anim.clipId;
      anim.prevTime = anim.time;
      anim.clipId = nextId;
      anim.time = 0;
      anim.fade = anim.fadeDur;
    }
    const mods = modifiersFor(def);
    const clip = clips[anim.clipId] || clips.idle;
    anim.time += dt * mods.speed;
    if (clip && clip.loop && clip.duration) anim.time %= clip.duration;
    if (anim.fade > 0) anim.fade = Math.max(0, anim.fade - dt);
    return anim;
  }

  function evaluate(anim, clips, def) {
    const mods = modifiersFor(def);
    const cur = clips[anim.clipId] || clips.idle;
    const pose = poseFromClip(cur, anim.time, mods.amp);
    if (anim.fade > 0 && anim.prevId && clips[anim.prevId]) {
      const prev = poseFromClip(clips[anim.prevId], anim.prevTime, mods.amp);
      const k = 1 - anim.fade / anim.fadeDur;
      return { pose: blendPose(prev, pose, k), mods };
    }
    return { pose, mods };
  }

  function solve(pose, x, y, facing, scale, stance) {
    const world = {};
    const byId = {};
    for (const b of BONES) byId[b.id] = b;
    for (const b of BONES) {
      if (!b.parent) {
        world[b.id] = { x, y, a: (pose[b.id] || 0) * facing };
        continue;
      }
      const p = world[b.parent];
      const pb = byId[b.parent];
      const stanceMul = b.id.indexOf('Leg') >= 0 || b.id.indexOf('foot') >= 0 ? stance : 1;
      const a = p.a + b.rest * facing + (pose[b.id] || 0) * facing;
      const len = b.len * scale * (b.id.indexOf('Leg') >= 0 ? stanceMul : 1);
      world[b.id] = {
        x: p.x + Math.cos(a) * len,
        y: p.y + Math.sin(a) * len,
        a,
        px: p.x,
        py: p.y
      };
    }
    return world;
  }

  function drawHead(ctx, x, y, shape, color, flash, r) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = flash ? '#fff' : color;
    ctx.strokeStyle = flash ? '#fff' : '#0b0b10';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    if (shape === 'circle') ctx.arc(0, 0, r, 0, Math.PI * 2);
    else if (shape === 'square') ctx.rect(-r, -r, r * 2, r * 2);
    else if (shape === 'triangle') {
      ctx.moveTo(0, -r); ctx.lineTo(r, r); ctx.lineTo(-r, r); ctx.closePath();
    } else if (shape === 'diamond') {
      ctx.moveTo(0, -r); ctx.lineTo(r, 0); ctx.lineTo(0, r); ctx.lineTo(-r, 0); ctx.closePath();
    } else if (shape === 'star') {
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5;
        const rr = i % 2 ? r * 0.45 : r;
        ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
    } else if (shape === 'crescent') {
      ctx.arc(0, 0, r, 0.4, Math.PI * 2 - 0.4);
      ctx.arc(-r * 0.35, 0, r * 0.72, Math.PI * 2 - 0.5, 0.5, true);
      ctx.closePath();
    } else if (shape === 'hexagon' || shape === 'pentagon' || shape === 'octagon') {
      const n = shape === 'hexagon' ? 6 : shape === 'octagon' ? 8 : 5;
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + i * Math.PI * 2 / n;
        ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
    } else if (shape === 'heart') {
      ctx.moveTo(0, r * 0.7);
      ctx.bezierCurveTo(r * 1.2, 0, r * 0.6, -r, 0, -r * 0.25);
      ctx.bezierCurveTo(-r * 0.6, -r, -r * 1.2, 0, 0, r * 0.7);
    } else if (shape === 'teardrop') {
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(r, r * 0.2, 0, r);
      ctx.quadraticCurveTo(-r, r * 0.2, 0, -r);
    } else if (shape === 'bolt' || shape === 'lightning') {
      ctx.moveTo(2, -r); ctx.lineTo(-2, 0); ctx.lineTo(2, 0); ctx.lineTo(-2, r);
      ctx.lineTo(4, 0.5); ctx.lineTo(0, 0.5); ctx.closePath();
    } else if (shape === 'plus') {
      const w = r * 0.35;
      ctx.rect(-w, -r, w * 2, r * 2);
      ctx.rect(-r, -w, r * 2, w * 2);
    } else if (shape === 'sun') {
      ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75);
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.stroke();
      }
      ctx.restore();
      return;
    } else if (shape === 'moon') {
      ctx.arc(0, 0, r, 0.5, Math.PI * 2 - 0.5);
      ctx.arc(-r * 0.4, 0, r * 0.75, Math.PI * 2 - 0.4, 0.4, true);
      ctx.closePath();
    } else if (shape === 'spade') {
      ctx.moveTo(0, -r);
      ctx.bezierCurveTo(r, -r * 0.2, r * 0.7, r * 0.4, 0, r * 0.2);
      ctx.bezierCurveTo(-r * 0.7, r * 0.4, -r, -r * 0.2, 0, -r);
      ctx.moveTo(-r * 0.25, r * 0.15);
      ctx.lineTo(0, r);
      ctx.lineTo(r * 0.25, r * 0.15);
    } else if (shape === 'club') {
      ctx.arc(-r * 0.4, 0, r * 0.42, 0, Math.PI * 2);
      ctx.arc(r * 0.4, 0, r * 0.42, 0, Math.PI * 2);
      ctx.arc(0, -r * 0.45, r * 0.42, 0, Math.PI * 2);
      ctx.rect(-r * 0.18, 0, r * 0.36, r);
    } else if (shape === 'arrow') {
      ctx.moveTo(0, -r); ctx.lineTo(r, 0); ctx.lineTo(r * 0.25, 0);
      ctx.lineTo(r * 0.25, r); ctx.lineTo(-r * 0.25, r);
      ctx.lineTo(-r * 0.25, 0); ctx.lineTo(-r, 0); ctx.closePath();
    } else if (shape === 'flame') {
      ctx.moveTo(0, r);
      ctx.bezierCurveTo(r, r * 0.2, r * 0.4, -r * 0.2, 0, -r);
      ctx.bezierCurveTo(-r * 0.2, -r * 0.1, -r, r * 0.3, 0, r);
    } else if (shape === 'snowflake') {
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.stroke();
      ctx.restore();
      return;
    } else if (shape === 'shield') {
      ctx.moveTo(0, -r);
      ctx.lineTo(r, -r * 0.4);
      ctx.lineTo(r * 0.75, r * 0.3);
      ctx.lineTo(0, r);
      ctx.lineTo(-r * 0.75, r * 0.3);
      ctx.lineTo(-r, -r * 0.4);
      ctx.closePath();
    } else if (shape === 'crown') {
      ctx.moveTo(-r, r * 0.4);
      ctx.lineTo(-r, -r * 0.1);
      ctx.lineTo(-r * 0.5, r * 0.15);
      ctx.lineTo(0, -r);
      ctx.lineTo(r * 0.5, r * 0.15);
      ctx.lineTo(r, -r * 0.1);
      ctx.lineTo(r, r * 0.4);
      ctx.closePath();
    } else if (shape === 'leaf') {
      ctx.ellipse(0, 0, r * 0.7, r, 0.4, 0, Math.PI * 2);
    } else {
      ctx.arc(0, 0, r, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawStick(ctx, world, def, flash, scale) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = flash ? '#ffffff' : '#14141c';
    ctx.lineWidth = Math.max(2.2, 2.6 * scale);
    const segments = [
      ['hips', 'spine'], ['spine', 'chest'], ['chest', 'neck'],
      ['upperArm_L', 'lowerArm_L'], ['lowerArm_L', 'hand_L'],
      ['upperArm_R', 'lowerArm_R'], ['lowerArm_R', 'hand_R'],
      ['upperLeg_L', 'lowerLeg_L'], ['lowerLeg_L', 'foot_L'],
      ['upperLeg_R', 'lowerLeg_R'], ['lowerLeg_R', 'foot_R']
    ];
    const hips = world.hips;
    const chest = world.chest;
    ctx.beginPath();
    ctx.moveTo(hips.x, hips.y);
    ctx.lineTo(chest.x, chest.y);
    ctx.lineTo(world.neck.x, world.neck.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(world.upperArm_L.px, world.upperArm_L.py);
    ctx.lineTo(world.hand_L.x, world.hand_L.y);
    ctx.moveTo(world.upperArm_R.px, world.upperArm_R.py);
    ctx.lineTo(world.hand_R.x, world.hand_R.y);
    ctx.moveTo(hips.x, hips.y);
    ctx.lineTo(world.foot_L.x, world.foot_L.y);
    ctx.moveTo(hips.x, hips.y);
    ctx.lineTo(world.foot_R.x, world.foot_R.y);
    ctx.stroke();
    drawHead(ctx, world.head.x, world.head.y, def.shape, def.color, flash, 5.4 * scale);
    ctx.restore();
    return world;
  }

  root.StickMotion = {
    JOINT_ORDER,
    BONES,
    modifiersFor,
    createAnimator,
    stepAnimator,
    evaluate,
    solve,
    drawHead,
    drawStick,
    clipForPose
  };
})(typeof self !== 'undefined' ? self : this);
