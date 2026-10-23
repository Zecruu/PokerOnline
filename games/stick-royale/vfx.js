/**
 * Stick Royale — pooled 2D canvas VFX + blood (ZecruRigger preset schema).
 */
(function (root) {
  'use strict';

  const MAX_PARTICLES = 280;
  const MAX_STAINS = 40;
  const MAX_RIBBONS = 24;
  const MAX_RINGS = 20;

  function hexToRgb(hex) {
    const h = String(hex || '#fff').replace('#', '');
    const n = h.length === 3
      ? h.split('').map((c) => c + c).join('')
      : h;
    const v = parseInt(n.slice(0, 6), 16);
    return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
  }

  function createVfx(presetsDoc) {
    const presets = (presetsDoc && presetsDoc.presets) || {};
    const bindings = (presetsDoc && presetsDoc.bindings) || {};
    const particles = [];
    const stains = [];
    const ribbons = [];
    const rings = [];
    const wisps = [];
    let bloodOn = true;
    let quality = 1;
    let fpsEma = 60;
    let lastTs = 0;

    function cap(n) {
      return Math.max(1, Math.round(n * quality));
    }

    function allocParticle() {
      if (particles.length >= MAX_PARTICLES) particles.shift();
      const p = {
        x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 0.3, size: 2,
        r: 255, g: 255, b: 255, a: 1, gravity: 120, kind: 'spark'
      };
      particles.push(p);
      return p;
    }

    function burst(preset, x, y, tint) {
      const count = cap(preset.count || 10);
      const colors = preset.colors || [preset.color || '#fff'];
      for (let i = 0; i < count; i++) {
        const p = allocParticle();
        const ang = Math.random() * Math.PI * 2;
        const spd = (preset.speed || 80) * (0.45 + Math.random());
        p.x = x; p.y = y;
        p.vx = Math.cos(ang) * spd;
        p.vy = Math.sin(ang) * spd - 20;
        p.life = 0;
        p.max = (preset.life || 0.3) * (0.7 + Math.random() * 0.6);
        p.size = (preset.size || 3) * (0.6 + Math.random() * 0.7);
        p.gravity = preset.gravity || 160;
        const col = hexToRgb(tint || colors[i % colors.length]);
        p.r = col.r; p.g = col.g; p.b = col.b;
        p.kind = preset.type === 'blood' ? 'blood' : 'spark';
      }
    }

    function sprayBlood(x, y, color) {
      const preset = bloodOn ? presets.bloodSpray : presets.spark;
      if (!preset) return;
      burst(preset, x, y, bloodOn ? (color || preset.color) : null);
    }

    function addStain(x, y, color) {
      if (!bloodOn) return;
      if (stains.length >= MAX_STAINS) stains.shift();
      const preset = presets.bloodSplatter || { radius: 10, life: 4, color: '#7f1d1d' };
      stains.push({
        x, y,
        r: (preset.radius || 10) * (0.6 + Math.random() * 0.8),
        life: 0,
        max: preset.life || 4.5,
        color: color || preset.color
      });
    }

    function addRibbon(x, y, facing, preset) {
      if (ribbons.length >= MAX_RIBBONS) ribbons.shift();
      ribbons.push({
        x, y,
        facing: facing || 1,
        life: 0,
        max: preset.life || 0.24,
        width: preset.width || 7,
        length: preset.length || 22,
        color: preset.color || '#ffe7a3'
      });
    }

    function addRing(x, y, preset) {
      if (rings.length >= MAX_RINGS) rings.shift();
      rings.push({
        x, y,
        life: 0,
        max: preset.life || 0.38,
        r0: preset.radius || 12,
        grow: preset.grow || 24,
        width: preset.width || 2,
        color: preset.color || '#fde68a'
      });
    }

    function fireBinding(clipId, x, y, facing, stickColor) {
      const list = bindings[clipId] || [];
      for (const bind of list) {
        const name = (!bloodOn && bind.alt) ? bind.alt : bind.preset;
        const preset = presets[name];
        if (!preset) continue;
        if (preset.type === 'ribbon') addRibbon(x, y, facing, preset);
        else if (preset.type === 'ring') addRing(x, y, preset);
        else if (preset.type === 'stain') addStain(x, y, bloodOn ? '#7f1d1d' : null);
        else if (preset.type === 'blood') sprayBlood(x, y, '#b91c1c');
        else if (preset.type === 'aura') { /* aura drawn per-unit */ }
        else burst(preset, x, y, stickColor);
      }
    }

    function playEvent(ev, unitColor) {
      if (ev.type === 'hit') {
        fireBinding('hit', ev.x, ev.y, 1, unitColor);
      } else if (ev.type === 'death') {
        fireBinding('death', ev.x, ev.y, 1, unitColor);
      } else if (ev.type === 'deploy') {
        fireBinding('spawn', ev.x, ev.y, 1, unitColor);
      } else if (ev.type === 'spell') {
        burst(presets.impactBurst || { count: 12, speed: 80, life: 0.3, size: 3, colors: ['#fde68a'] }, ev.x, ev.y);
        addRing(ev.x, ev.y, presets.groundRing || {});
      }
    }

    function auraFor(def) {
      if (!def) return null;
      if (def.rarity === 'epic') return presets.auraViolet;
      if (def.rarity === 'rare' || !def.starting) return presets.auraCyan;
      return null;
    }

    function drawAura(ctx, x, y, def, t) {
      const aura = auraFor(def);
      if (!aura) return;
      const pulse = 1 + Math.sin(t * (aura.pulse || 1.5) * 4) * 0.08;
      const r = (aura.radius || 16) * pulse;
      const col = hexToRgb(aura.color);
      const g = ctx.createRadialGradient(x, y, 2, x, y, r);
      g.addColorStop(0, `rgba(${col.r},${col.g},${col.b},${0.28 * (aura.glow || 0.5)})`);
      g.addColorStop(1, `rgba(${col.r},${col.g},${col.b},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      const wispsN = cap(aura.wispCount || 4);
      const wc = hexToRgb(aura.wispColor || aura.color);
      for (let i = 0; i < wispsN; i++) {
        const a = t * 2 + i * (Math.PI * 2 / wispsN);
        const wx = x + Math.cos(a) * r * 0.55;
        const wy = y + Math.sin(a * 1.3) * r * 0.35 - 6;
        ctx.fillStyle = `rgba(${wc.r},${wc.g},${wc.b},0.55)`;
        ctx.beginPath();
        ctx.arc(wx, wy, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function step(dt, now) {
      if (lastTs) {
        const inst = 1000 / Math.max(8, now - lastTs);
        fpsEma = fpsEma * 0.9 + inst * 0.1;
        if (fpsEma < 40) quality = 0.55;
        else if (fpsEma < 50) quality = 0.75;
        else quality = 1;
      }
      lastTs = now;
      for (const p of particles) {
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += p.gravity * dt;
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].life >= particles[i].max) particles.splice(i, 1);
      }
      for (const s of stains) s.life += dt;
      for (let i = stains.length - 1; i >= 0; i--) {
        if (stains[i].life >= stains[i].max) stains.splice(i, 1);
      }
      for (const r of ribbons) r.life += dt;
      for (let i = ribbons.length - 1; i >= 0; i--) {
        if (ribbons[i].life >= ribbons[i].max) ribbons.splice(i, 1);
      }
      for (const r of rings) r.life += dt;
      for (let i = rings.length - 1; i >= 0; i--) {
        if (rings[i].life >= rings[i].max) rings.splice(i, 1);
      }
    }

    function drawStains(ctx, worldToScreen) {
      for (const s of stains) {
        const k = 1 - s.life / s.max;
        const p = worldToScreen(s.x, s.y);
        const col = hexToRgb(s.color);
        ctx.fillStyle = `rgba(${col.r},${col.g},${col.b},${0.38 * k})`;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 6, s.r, s.r * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function draw(ctx, worldToScreen) {
      for (const r of rings) {
        const u = r.life / r.max;
        const p = worldToScreen(r.x, r.y);
        const rad = r.r0 + r.grow * u;
        const col = hexToRgb(r.color);
        ctx.strokeStyle = `rgba(${col.r},${col.g},${col.b},${1 - u})`;
        ctx.lineWidth = r.width;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 8, rad, rad * 0.4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (const rb of ribbons) {
        const u = rb.life / rb.max;
        const p = worldToScreen(rb.x, rb.y);
        const col = hexToRgb(rb.color);
        ctx.strokeStyle = `rgba(${col.r},${col.g},${col.b},${1 - u})`;
        ctx.lineWidth = rb.width * (1 - u * 0.4);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 10);
        ctx.quadraticCurveTo(
          p.x + rb.facing * rb.length * 0.4,
          p.y - 22,
          p.x + rb.facing * rb.length * (0.6 + u),
          p.y - 6
        );
        ctx.stroke();
      }
      for (const p of particles) {
        const k = 1 - p.life / p.max;
        const s = worldToScreen(p.x, p.y);
        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${k})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function setBlood(on) { bloodOn = !!on; }
    function getBlood() { return bloodOn; }

    return {
      presets,
      bindings,
      playEvent,
      fireBinding,
      sprayBlood,
      addStain,
      addRibbon,
      addRing,
      drawAura,
      auraFor,
      step,
      drawStains,
      draw,
      setBlood,
      getBlood,
      get quality() { return quality; },
      get fps() { return fpsEma; }
    };
  }

  root.StickVfx = { createVfx, hexToRgb };
})(typeof self !== 'undefined' ? self : this);
