/**
 * Stick Royale — shared simulation (Node + browser).
 * Server-authoritative multiplayer and local solo both call this.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.StickRoyale = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ARENA_W = 18;
  const ARENA_H = 32;
  const LANES = [3.6, 9, 14.4];
  const RIVER_Y0 = 15.15;
  const RIVER_Y1 = 16.85;
  const BRIDGE_HALF = 1.15;
  const ELIXIR_MAX = 10;
  const ELIXIR_START = 5;
  const ELIXIR_RATE = 1 / 2.8;
  const ELIXIR_RATE_DOUBLE = 1 / 1.4;
  const DOUBLE_ELIXIR_AT = 60;
  const HAND_SIZE = 4;
  const STARTING_DECK = ['bruiser', 'skirmish', 'knight', 'archer', 'mage', 'assassin', 'golem', 'zap'];
  const AUGMENT_EVERY = 30;
  const AUGMENT_DURATION = 8;
  const VERSUS_TIME = 180;
  const OVERTIME = 60;
  const KING_HP = 4200;
  const PRINCESS_HP = 2400;

  const UNITS = {
    bruiser: {
      id: 'bruiser', name: 'Bruiser', role: 'tank', rarity: 'common', starting: true,
      shape: 'circle', color: '#3b82f6', cost: 5, hp: 1450, dmg: 88, range: 0.95,
      speed: 0.95, atkInterval: 1.15, splash: 0, count: 1, target: 'any', kind: 'troop'
    },
    skirmish: {
      id: 'skirmish', name: 'Skirmishers', role: 'swarm', rarity: 'common', starting: true,
      shape: 'triangle', color: '#84cc16', cost: 3, hp: 195, dmg: 38, range: 0.7,
      speed: 1.65, atkInterval: 0.7, splash: 0, count: 3, target: 'any', kind: 'troop'
    },
    knight: {
      id: 'knight', name: 'Knight', role: 'melee', rarity: 'common', starting: true,
      shape: 'square', color: '#94a3b8', cost: 3, hp: 680, dmg: 74, range: 0.85,
      speed: 1.2, atkInterval: 1.0, splash: 0, count: 1, target: 'any', kind: 'troop'
    },
    archer: {
      id: 'archer', name: 'Archer', role: 'ranged', rarity: 'common', starting: true,
      shape: 'star', color: '#fbbf24', cost: 3, hp: 230, dmg: 48, range: 5.4,
      speed: 1.1, atkInterval: 0.85, splash: 0, count: 1, target: 'any', kind: 'troop'
    },
    mage: {
      id: 'mage', name: 'Mage', role: 'splash', rarity: 'common', starting: true,
      shape: 'diamond', color: '#22d3ee', cost: 4, hp: 250, dmg: 58, range: 4.8,
      speed: 1.0, atkInterval: 1.05, splash: 1.65, count: 1, target: 'any', kind: 'troop'
    },
    assassin: {
      id: 'assassin', name: 'Assassin', role: 'assassin', rarity: 'common', starting: true,
      shape: 'crescent', color: '#a855f7', cost: 4, hp: 290, dmg: 102, range: 0.8,
      speed: 1.85, atkInterval: 0.72, splash: 0, count: 1, target: 'units', kind: 'troop'
    },
    golem: {
      id: 'golem', name: 'Siege Golem', role: 'siege', rarity: 'common', starting: true,
      shape: 'hexagon', color: '#a16207', cost: 5, hp: 1680, dmg: 96, range: 0.95,
      speed: 0.68, atkInterval: 1.4, splash: 0, count: 1, target: 'buildings', kind: 'troop'
    },
    zap: {
      id: 'zap', name: 'Zap', role: 'spell', rarity: 'common', starting: true,
      shape: 'bolt', color: '#eab308', cost: 2, hp: 0, dmg: 95, range: 2.15,
      speed: 0, atkInterval: 0, splash: 2.15, count: 1, target: 'any', kind: 'spell', stun: 0.5
    },
    priest: {
      id: 'priest', name: 'Priest', role: 'healer', rarity: 'common', starting: false,
      shape: 'heart', color: '#f472b6', cost: 4, hp: 320, dmg: 42, range: 4.2,
      speed: 1.0, atkInterval: 0.95, splash: 0, count: 1, target: 'heal', kind: 'troop', heal: 70
    },
    guard: {
      id: 'guard', name: 'Guard', role: 'tank', rarity: 'common', starting: false,
      shape: 'pentagon', color: '#f97316', cost: 4, hp: 980, dmg: 58, range: 0.9,
      speed: 1.02, atkInterval: 1.05, splash: 0, count: 1, target: 'any', kind: 'troop'
    },
    bomber: {
      id: 'bomber', name: 'Bomber', role: 'splash', rarity: 'common', starting: false,
      shape: 'teardrop', color: '#ef4444', cost: 3, hp: 270, dmg: 78, range: 3.15,
      speed: 1.08, atkInterval: 1.15, splash: 1.85, count: 1, target: 'any', kind: 'troop'
    },
    healpulse: {
      id: 'healpulse', name: 'Heal Pulse', role: 'spell', rarity: 'common', starting: false,
      shape: 'plus', color: '#f8fafc', cost: 3, hp: 0, dmg: 0, range: 2.8,
      speed: 0, atkInterval: 0, splash: 2.8, count: 1, target: 'heal', kind: 'spell', heal: 220
    },
    warlord: {
      id: 'warlord', name: 'Warlord', role: 'tank', rarity: 'epic', starting: false,
      shape: 'octagon', color: '#dc2626', cost: 7, hp: 2400, dmg: 130, range: 1.05,
      speed: 0.82, atkInterval: 1.2, splash: 0.9, count: 1, target: 'any', kind: 'troop'
    },
    sunshot: {
      id: 'sunshot', name: 'Sunshot', role: 'ranged', rarity: 'rare', starting: false,
      shape: 'sun', color: '#f59e0b', cost: 5, hp: 280, dmg: 110, range: 7.2,
      speed: 0.95, atkInterval: 1.25, splash: 0, count: 1, target: 'any', kind: 'troop'
    },
    nightshade: {
      id: 'nightshade', name: 'Nightshade', role: 'assassin', rarity: 'rare', starting: false,
      shape: 'moon', color: '#6366f1', cost: 5, hp: 340, dmg: 145, range: 0.85,
      speed: 1.95, atkInterval: 0.62, splash: 0, count: 1, target: 'units', kind: 'troop'
    },
    graveswarm: {
      id: 'graveswarm', name: 'Grave Swarm', role: 'swarm', rarity: 'rare', starting: false,
      shape: 'spade', color: '#374151', cost: 4, hp: 160, dmg: 32, range: 0.7,
      speed: 1.7, atkInterval: 0.65, splash: 0, count: 5, target: 'any', kind: 'troop'
    },
    cannon: {
      id: 'cannon', name: 'Cannon', role: 'building', rarity: 'common', starting: false,
      shape: 'club', color: '#166534', cost: 3, hp: 620, dmg: 72, range: 5.6,
      speed: 0, atkInterval: 0.8, splash: 0, count: 1, target: 'any', kind: 'building', lifetime: 28
    },
    ballista: {
      id: 'ballista', name: 'Ballista', role: 'siege', rarity: 'rare', starting: false,
      shape: 'arrow', color: '#0d9488', cost: 6, hp: 520, dmg: 160, range: 6.8,
      speed: 0.72, atkInterval: 1.6, splash: 0, count: 1, target: 'buildings', kind: 'troop'
    },
    fireball: {
      id: 'fireball', name: 'Fireball', role: 'spell', rarity: 'rare', starting: false,
      shape: 'flame', color: '#ea580c', cost: 4, hp: 0, dmg: 280, range: 2.6,
      speed: 0, atkInterval: 0, splash: 2.6, count: 1, target: 'any', kind: 'spell'
    },
    frost: {
      id: 'frost', name: 'Frost Nova', role: 'spell', rarity: 'common', starting: false,
      shape: 'snowflake', color: '#7dd3fc', cost: 3, hp: 0, dmg: 80, range: 2.5,
      speed: 0, atkInterval: 0, splash: 2.5, count: 1, target: 'any', kind: 'spell', slow: 2.4
    },
    warden: {
      id: 'warden', name: 'Warden', role: 'support', rarity: 'epic', starting: false,
      shape: 'shield', color: '#1e3a8a', cost: 6, hp: 1550, dmg: 70, range: 1.0,
      speed: 0.88, atkInterval: 1.1, splash: 0, count: 1, target: 'any', kind: 'troop', aura: 3.2
    },
    kinglet: {
      id: 'kinglet', name: 'Kinglet', role: 'champion', rarity: 'epic', starting: false,
      shape: 'crown', color: '#ca8a04', cost: 8, hp: 1900, dmg: 155, range: 1.15,
      speed: 1.05, atkInterval: 0.95, splash: 1.1, count: 1, target: 'any', kind: 'troop'
    },
    storm: {
      id: 'storm', name: 'Stormcaller', role: 'splash', rarity: 'rare', starting: false,
      shape: 'lightning', color: '#7c3aed', cost: 5, hp: 300, dmg: 62, range: 5.0,
      speed: 1.0, atkInterval: 1.1, splash: 0, count: 1, target: 'any', kind: 'troop', chain: 3
    },
    grove: {
      id: 'grove', name: 'Grove Healer', role: 'healer', rarity: 'rare', starting: false,
      shape: 'leaf', color: '#4ade80', cost: 5, hp: 420, dmg: 36, range: 4.6,
      speed: 0.98, atkInterval: 0.9, splash: 2.2, count: 1, target: 'heal', kind: 'troop', heal: 55
    }
  };

  const BASE_IDS = Object.keys(UNITS).filter((id) => UNITS[id].starting);
  const AUGMENT_IDS = Object.keys(UNITS).filter((id) => !UNITS[id].starting);
  const RARITY_WEIGHT = { common: 60, rare: 30, epic: 10 };

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function rng() {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function dist(ax, ay, bx, by) {
    return Math.hypot(ax - bx, ay - by);
  }

  function nearestLane(x) {
    let best = LANES[0];
    let bestD = Math.abs(x - best);
    for (let i = 1; i < LANES.length; i++) {
      const d = Math.abs(x - LANES[i]);
      if (d < bestD) {
        best = LANES[i];
        bestD = d;
      }
    }
    return best;
  }

  function nextId(state) {
    state.nextId += 1;
    return state.nextId;
  }

  function makeTowers() {
    const mk = (team, kind, x, y, hp) => ({
      id: `t${team}${kind[0]}${x}`,
      team,
      kind,
      x,
      y,
      hp,
      maxHp: hp,
      range: kind === 'king' ? 7.2 : 6.6,
      dmg: kind === 'king' ? 110 : 82,
      atkCd: 0,
      atkInterval: kind === 'king' ? 1.05 : 0.8,
      active: kind !== 'king'
    });
    return [
      mk(0, 'king', 9, 2.7, KING_HP),
      mk(0, 'princess', 3.6, 7.35, PRINCESS_HP),
      mk(0, 'princess', 14.4, 7.35, PRINCESS_HP),
      mk(1, 'king', 9, 29.3, KING_HP),
      mk(1, 'princess', 3.6, 24.65, PRINCESS_HP),
      mk(1, 'princess', 14.4, 24.65, PRINCESS_HP)
    ];
  }

  function drawOpeningHand(deck, rng) {
    const hand = [];
    const cycle = deck.slice();
    for (let i = 0; i < HAND_SIZE; i++) {
      hand.push(cycle.shift());
    }
    return { hand, cycle };
  }

  function makePlayer(id, team, name, isAI, rng) {
    const deck = STARTING_DECK.slice();
    const { hand, cycle } = drawOpeningHand(deck, rng);
    return {
      id,
      team,
      name: name || (isAI ? 'AI' : 'Player'),
      isAI: !!isAI,
      elixir: ELIXIR_START,
      elixirAcc: 0,
      deck,
      hand,
      cycle,
      augments: [],
      offers: null,
      picked: false,
      damageDealt: 0
    };
  }

  function createMatch(opts) {
    const o = opts || {};
    const seed = o.seed == null ? (Date.now() % 1e9) : (o.seed >>> 0);
    const mode = o.mode === 'versus' ? 'versus' : 'survival';
    const playerCount = o.playerCount === 2 ? 2 : 1;
    const aiOpponent = !!o.aiOpponent || (mode === 'versus' && playerCount === 1);
    const rng = mulberry32(seed);
    const names = o.names || [];
    const players = [
      makePlayer(0, 0, names[0] || 'Player 1', false, rng)
    ];
    if (mode === 'versus') {
      players.push(makePlayer(1, 1, names[1] || (aiOpponent ? 'Arena Bot' : 'Player 2'), aiOpponent, rng));
    } else if (playerCount === 2) {
      players.push(makePlayer(1, 0, names[1] || 'Player 2', false, rng));
    }

    return {
      mode,
      seed,
      rng,
      nextId: 1,
      time: 0,
      battleTime: 0,
      matchLimit: mode === 'versus' ? VERSUS_TIME : 0,
      overtime: false,
      phase: 'battle',
      augmentEvery: o.augmentEvery > 0 ? o.augmentEvery : AUGMENT_EVERY,
      augmentDuration: o.augmentDuration > 0 ? o.augmentDuration : AUGMENT_DURATION,
      nextAugmentAt: o.augmentEvery > 0 ? o.augmentEvery : AUGMENT_EVERY,
      augmentEndsAt: 0,
      augmentRound: 0,
      players,
      units: [],
      towers: makeTowers(),
      projectiles: [],
      fx: [],
      wave: 0,
      waveTimer: mode === 'survival' ? 1.2 : 0,
      enemiesAlive: 0,
      score: 0,
      winner: null,
      winReason: null,
      ended: false,
      events: []
    };
  }

  function elixirRate(state) {
    if (state.mode === 'versus' && state.battleTime >= DOUBLE_ELIXIR_AT) return ELIXIR_RATE_DOUBLE;
    if (state.mode === 'survival' && state.wave >= 6) return ELIXIR_RATE_DOUBLE;
    return ELIXIR_RATE;
  }

  function regenElixir(state, dt) {
    const rate = elixirRate(state);
    for (const p of state.players) {
      if (p.isAI && state.mode === 'survival') continue;
      p.elixirAcc += rate * dt;
      if (p.elixirAcc >= 1) {
        const add = Math.floor(p.elixirAcc);
        p.elixir = Math.min(ELIXIR_MAX, p.elixir + add);
        p.elixirAcc -= add;
      }
    }
  }

  function cycleCard(player, playedId) {
    player.cycle.push(playedId);
    const next = player.cycle.shift();
    const idx = player.hand.indexOf(playedId);
    if (idx >= 0) player.hand[idx] = next;
    else if (player.hand.length < HAND_SIZE) player.hand.push(next);
  }

  function spawnOffsets(count) {
    if (count <= 1) return [{ dx: 0, dy: 0 }];
    const out = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      out.push({ dx: Math.cos(a) * 0.55, dy: Math.sin(a) * 0.35 });
    }
    return out;
  }

  function spawnTroop(state, def, team, owner, x, y) {
    const hpScale = 1;
    const unit = {
      id: nextId(state),
      type: def.id,
      team,
      owner,
      x: clamp(x, 0.6, ARENA_W - 0.6),
      y: clamp(y, 0.6, ARENA_H - 0.6),
      hp: def.hp * hpScale,
      maxHp: def.hp * hpScale,
      atkCd: 0.15,
      stun: 0,
      slow: 0,
      flash: 0,
      lifetime: def.lifetime || 0,
      kind: def.kind,
      dead: false,
      pose: 'idle',
      poseT: 0
    };
    state.units.push(unit);
    return unit;
  }

  function dropZoneOk(state, player, def, x, y) {
    if (def.kind === 'spell' && def.target !== 'heal') return true;
    if (player.team === 0) return y < RIVER_Y0 - 0.15;
    return y > RIVER_Y1 + 0.15;
  }

  function applySpell(state, def, team, owner, x, y) {
    state.fx.push({ kind: 'spell', type: def.id, x, y, r: def.splash || def.range, t: 0, life: 0.45, color: def.color });
    const r = def.splash || def.range;
    if (def.heal) {
      for (const u of state.units) {
        if (u.dead || u.team !== team) continue;
        if (dist(u.x, u.y, x, y) <= r) {
          u.hp = Math.min(u.maxHp, u.hp + def.heal);
          state.fx.push({ kind: 'heal', x: u.x, y: u.y, t: 0, life: 0.4 });
        }
      }
      return;
    }
    for (const u of state.units) {
      if (u.dead || u.team === team) continue;
      if (dist(u.x, u.y, x, y) <= r) {
        damageUnit(state, u, def.dmg, owner);
        if (def.stun) u.stun = Math.max(u.stun, def.stun);
        if (def.slow) u.slow = Math.max(u.slow, def.slow);
      }
    }
    for (const tw of state.towers) {
      if (tw.hp <= 0 || tw.team === team) continue;
      if (dist(tw.x, tw.y, x, y) <= r + 0.4) {
        damageTower(state, tw, Math.round(def.dmg * 0.45), owner);
      }
    }
  }

  function playCard(state, playerId, cardId, x, y) {
    if (state.ended || state.phase !== 'battle') {
      return { ok: false, reason: 'not-battle' };
    }
    const player = state.players[playerId];
    if (!player) return { ok: false, reason: 'no-player' };
    const def = UNITS[cardId];
    if (!def) return { ok: false, reason: 'unknown-card' };
    if (player.hand.indexOf(cardId) < 0) return { ok: false, reason: 'not-in-hand' };
    if (player.elixir < def.cost) return { ok: false, reason: 'elixir' };
    const px = clamp(x, 0.4, ARENA_W - 0.4);
    const py = clamp(y, 0.4, ARENA_H - 0.4);
    if (!dropZoneOk(state, player, def, px, py)) return { ok: false, reason: 'zone' };

    player.elixir -= def.cost;
    cycleCard(player, cardId);

    if (def.kind === 'spell') {
      applySpell(state, def, player.team, player.id, px, py);
      state.events.push({ type: 'spell', cardId, x: px, y: py, playerId });
      return { ok: true, kind: 'spell' };
    }

    const laneX = nearestLane(px);
    const spawned = [];
    for (const off of spawnOffsets(def.count || 1)) {
      spawned.push(spawnTroop(state, def, player.team, player.id, laneX + off.dx, py + off.dy));
    }
    state.events.push({ type: 'deploy', cardId, x: laneX, y: py, playerId, count: spawned.length });
    return { ok: true, kind: def.kind, spawned: spawned.map((u) => u.id) };
  }

  function damageUnit(state, unit, amount, ownerId) {
    if (unit.dead || amount <= 0) return;
    let dmg = amount;
    for (const other of state.units) {
      if (other.dead || other.team !== unit.team) continue;
      const def = UNITS[other.type];
      if (def && def.aura && dist(other.x, other.y, unit.x, unit.y) <= def.aura) {
        dmg *= 0.82;
        break;
      }
    }
    unit.hp -= dmg;
    unit.flash = 0.12;
    unit.pose = 'hit';
    unit.poseT = 0.22;
    if (state.events.filter((e) => e.type === 'hit').length < 10) {
      state.events.push({
        type: 'hit',
        x: unit.x,
        y: unit.y,
        team: unit.team,
        unitType: unit.type,
        amount: Math.round(dmg)
      });
    }
    const owner = state.players[ownerId];
    if (owner && owner.team !== unit.team) owner.damageDealt += dmg;
    if (state.mode === 'survival' && unit.team === 1) state.score += Math.round(dmg);
    if (unit.hp <= 0) killUnit(state, unit);
  }

  function killUnit(state, unit) {
    if (unit.dead) return;
    unit.dead = true;
    unit.hp = 0;
    state.fx.push({ kind: 'poof', x: unit.x, y: unit.y, t: 0, life: 0.45, color: (UNITS[unit.type] || {}).color || '#fff' });
    state.events.push({ type: 'death', id: unit.id, x: unit.x, y: unit.y });
    if (state.mode === 'survival' && unit.team === 1) state.score += 25;
  }

  function damageTower(state, tower, amount, ownerId) {
    if (tower.hp <= 0 || amount <= 0) return;
    tower.hp -= amount;
    tower.flash = 0.12;
    if (tower.kind === 'king') tower.active = true;
    const owner = state.players[ownerId];
    if (owner && owner.team !== tower.team) owner.damageDealt += amount;
    if (state.mode === 'survival' && tower.team === 0) {
      /* defending */
    } else if (state.mode === 'survival' && tower.team === 1) {
      state.score += Math.round(amount * 0.25);
    }
    if (tower.hp <= 0) {
      tower.hp = 0;
      state.fx.push({ kind: 'poof', x: tower.x, y: tower.y, t: 0, life: 0.7, color: '#fbbf24' });
      if (tower.kind === 'princess') {
        const king = state.towers.find((t) => t.team === tower.team && t.kind === 'king');
        if (king) king.active = true;
      }
      if (tower.kind === 'king') {
        endMatch(state, tower.team === 0 ? 1 : 0, 'king');
      }
    }
  }

  function endMatch(state, winnerTeam, reason) {
    if (state.ended) return;
    state.ended = true;
    state.phase = 'ended';
    state.winner = winnerTeam;
    state.winReason = reason;
    state.events.push({ type: 'end', winner: winnerTeam, reason });
  }

  function livingUnits(state, team) {
    return state.units.filter((u) => !u.dead && u.team === team);
  }

  function livingTowers(state, team) {
    return state.towers.filter((t) => t.hp > 0 && t.team === team);
  }

  function findTarget(state, unit, def) {
    if (def.target === 'heal') {
      let best = null;
      let bestMissing = 8;
      for (const u of state.units) {
        if (u.dead || u.team !== unit.team || u.id === unit.id) continue;
        const missing = u.maxHp - u.hp;
        if (missing > bestMissing) {
          bestMissing = missing;
          best = u;
        }
      }
      if (best) return { kind: 'unit', ref: best };
      const front = livingTowers(state, unit.team === 0 ? 1 : 0)[0];
      return front ? { kind: 'tower', ref: front } : null;
    }

    if (def.target !== 'buildings') {
      let best = null;
      let bestD = 1e9;
      for (const u of state.units) {
        if (u.dead || u.team === unit.team) continue;
        const d = dist(unit.x, unit.y, u.x, u.y);
        if (d < bestD) {
          bestD = d;
          best = u;
        }
      }
      const aggro = def.range + (def.range > 2 ? 6 : 4.5);
      if (best && bestD <= aggro) return { kind: 'unit', ref: best };
      if (def.target === 'units' && best) return { kind: 'unit', ref: best };
    }

    let twBest = null;
    let twD = 1e9;
    for (const tw of state.towers) {
      if (tw.hp <= 0 || tw.team === unit.team) continue;
      const d = dist(unit.x, unit.y, tw.x, tw.y);
      if (d < twD) {
        twD = d;
        twBest = tw;
      }
    }
    return twBest ? { kind: 'tower', ref: twBest } : null;
  }

  function steer(unit, tx, ty, speed, dt) {
    const crossing =
      (unit.y < RIVER_Y0 && ty > RIVER_Y1) ||
      (unit.y > RIVER_Y1 && ty < RIVER_Y0);
    const onBridge = LANES.some((lx) => Math.abs(unit.x - lx) <= BRIDGE_HALF);
    const inRiver = unit.y > RIVER_Y0 && unit.y < RIVER_Y1;
    let gx = tx;
    let gy = ty;
    if ((crossing || inRiver) && !onBridge) {
      gx = nearestLane(unit.x);
      if (inRiver) {
        gy = unit.y;
      } else {
        gy = unit.y < 16 ? RIVER_Y0 - 0.05 : RIVER_Y1 + 0.05;
      }
    }
    const dx = gx - unit.x;
    const dy = gy - unit.y;
    const d = Math.hypot(dx, dy) || 1;
    const step = speed * dt;
    if (step >= d) {
      unit.x = gx;
      unit.y = gy;
    } else {
      unit.x += (dx / d) * step;
      unit.y += (dy / d) * step;
    }
    unit.x = clamp(unit.x, 0.35, ARENA_W - 0.35);
    unit.y = clamp(unit.y, 0.35, ARENA_H - 0.35);
  }

  function dealHit(state, attacker, def, target) {
    const ownerId = attacker.owner;
    if (def.target === 'heal' && def.heal && target.kind === 'unit' && target.ref.team === attacker.team) {
      target.ref.hp = Math.min(target.ref.maxHp, target.ref.hp + def.heal);
      state.fx.push({ kind: 'heal', x: target.ref.x, y: target.ref.y, t: 0, life: 0.35 });
      if (def.splash) {
        for (const u of state.units) {
          if (u.dead || u.team !== attacker.team) continue;
          if (dist(u.x, u.y, target.ref.x, target.ref.y) <= def.splash) {
            u.hp = Math.min(u.maxHp, u.hp + def.heal * 0.55);
          }
        }
      }
      return;
    }
    if (target.kind === 'unit') {
      damageUnit(state, target.ref, def.dmg, ownerId);
      if (def.splash) {
        for (const u of state.units) {
          if (u.dead || u.team === attacker.team || u.id === target.ref.id) continue;
          if (dist(u.x, u.y, target.ref.x, target.ref.y) <= def.splash) {
            damageUnit(state, u, def.dmg * 0.7, ownerId);
          }
        }
      }
      if (def.chain) {
        let from = target.ref;
        let hops = def.chain;
        const hit = new Set([from.id]);
        while (hops-- > 0) {
          let nxt = null;
          let nd = 3.4;
          for (const u of state.units) {
            if (u.dead || u.team === attacker.team || hit.has(u.id)) continue;
            const d = dist(from.x, from.y, u.x, u.y);
            if (d < nd) {
              nd = d;
              nxt = u;
            }
          }
          if (!nxt) break;
          hit.add(nxt.id);
          damageUnit(state, nxt, def.dmg * 0.75, ownerId);
          state.fx.push({ kind: 'bolt', x1: from.x, y1: from.y, x2: nxt.x, y2: nxt.y, t: 0, life: 0.18 });
          from = nxt;
        }
      }
    } else {
      damageTower(state, target.ref, def.dmg, ownerId);
    }
  }

  function tickUnits(state, dt) {
    for (const unit of state.units) {
      if (unit.dead) continue;
      const def = UNITS[unit.type];
      if (!def) continue;
      if (unit.flash > 0) unit.flash -= dt;
      if (unit.stun > 0) {
        unit.stun -= dt;
        continue;
      }
      if (unit.slow > 0) unit.slow -= dt;
      if (def.kind === 'building' && def.lifetime) {
        unit.lifetime -= dt;
        if (unit.lifetime <= 0) {
          killUnit(state, unit);
          continue;
        }
      }
      unit.atkCd = Math.max(0, unit.atkCd - dt);
      const target = findTarget(state, unit, def);
      if (!target) continue;
      const tx = target.ref.x;
      const ty = target.ref.y;
      const reach = def.range + (target.kind === 'tower' ? 0.85 : 0.35);
      const d = dist(unit.x, unit.y, tx, ty);
      if (d <= reach) {
        unit.pose = unit.pose === 'hit' && unit.poseT > 0 ? 'hit' : 'attack';
        if (unit.pose !== 'hit') unit.poseT = Math.max(unit.poseT, 0.28);
        if (unit.atkCd <= 0) {
          unit.atkCd = def.atkInterval;
          unit.pose = 'attack';
          unit.poseT = Math.min(0.55, def.atkInterval * 0.85);
          if (def.range > 2.2 && def.target !== 'heal') {
            state.projectiles.push({
              id: nextId(state),
              x: unit.x,
              y: unit.y - 0.35,
              tx,
              ty,
              team: unit.team,
              owner: unit.owner,
              type: unit.type,
              speed: 10,
              targetKind: target.kind,
              targetId: target.ref.id
            });
          } else {
            dealHit(state, unit, def, target);
          }
        }
      } else if (def.kind !== 'building') {
        const spd = def.speed * (unit.slow > 0 ? 0.55 : 1);
        steer(unit, tx, ty, spd, dt);
        if (!(unit.pose === 'hit' && unit.poseT > 0) && !(unit.pose === 'attack' && unit.poseT > 0)) {
          unit.pose = 'walk';
        }
      } else if (!(unit.pose === 'hit' && unit.poseT > 0) && !(unit.pose === 'attack' && unit.poseT > 0)) {
        unit.pose = 'idle';
      }
      if (unit.poseT > 0) {
        unit.poseT -= dt;
        if (unit.poseT <= 0 && (unit.pose === 'attack' || unit.pose === 'hit')) {
          unit.pose = def.kind === 'building' ? 'idle' : 'walk';
        }
      }
    }
    state.units = state.units.filter((u) => !u.dead);
  }

  function resolveProjectileTarget(state, p) {
    if (p.targetKind === 'unit') {
      const u = state.units.find((x) => x.id === p.targetId && !x.dead);
      return u ? { kind: 'unit', ref: u } : null;
    }
    const tw = state.towers.find((x) => x.id === p.targetId && x.hp > 0);
    return tw ? { kind: 'tower', ref: tw } : null;
  }

  function tickProjectiles(state, dt) {
    const keep = [];
    for (const p of state.projectiles) {
      const tgt = resolveProjectileTarget(state, p);
      if (tgt) {
        p.tx = tgt.ref.x;
        p.ty = tgt.ref.y;
      }
      const d = dist(p.x, p.y, p.tx, p.ty);
      const step = p.speed * dt;
      if (d <= step || !tgt) {
        if (tgt) {
          const fake = { owner: p.owner, team: p.team, type: p.type, x: p.x, y: p.y };
          dealHit(state, fake, UNITS[p.type], tgt);
        }
      } else {
        p.x += ((p.tx - p.x) / d) * step;
        p.y += ((p.ty - p.y) / d) * step;
        keep.push(p);
      }
    }
    state.projectiles = keep;
  }

  function tickTowers(state, dt) {
    for (const tw of state.towers) {
      if (tw.hp <= 0) continue;
      if (tw.flash > 0) tw.flash -= dt;
      if (!tw.active) continue;
      tw.atkCd = Math.max(0, tw.atkCd - dt);
      if (tw.atkCd > 0) continue;
      let best = null;
      let bestD = tw.range;
      for (const u of state.units) {
        if (u.dead || u.team === tw.team) continue;
        const d = dist(tw.x, tw.y, u.x, u.y);
        if (d < bestD) {
          bestD = d;
          best = u;
        }
      }
      if (best) {
        tw.atkCd = tw.atkInterval;
        state.projectiles.push({
          id: nextId(state),
          x: tw.x,
          y: tw.y - 0.2,
          tx: best.x,
          ty: best.y,
          team: tw.team,
          owner: tw.team === 0 ? 0 : (state.players[1] ? state.players[1].id : 1),
          type: 'archer',
          speed: 12,
          targetKind: 'unit',
          targetId: best.id,
          towerShot: true,
          dmg: tw.dmg
        });
      }
    }
  }

  function dealHitTowerShot(state, p, target) {
    if (p.towerShot && target && target.kind === 'unit') {
      damageUnit(state, target.ref, p.dmg, p.owner);
      return true;
    }
    return false;
  }

  // Patch projectile landing to honor tower shots
  const _tickProjectiles = tickProjectiles;
  function tickProjectilesWrapped(state, dt) {
    const keep = [];
    for (const p of state.projectiles) {
      const tgt = resolveProjectileTarget(state, p);
      if (tgt) {
        p.tx = tgt.ref.x;
        p.ty = tgt.ref.y;
      }
      const d = dist(p.x, p.y, p.tx, p.ty);
      const step = p.speed * dt;
      if (d <= step || !tgt) {
        if (tgt) {
          if (!dealHitTowerShot(state, p, tgt)) {
            const fake = { owner: p.owner, team: p.team, type: p.type, x: p.x, y: p.y };
            dealHit(state, fake, UNITS[p.type], tgt);
          }
        }
      } else {
        p.x += ((p.tx - p.x) / d) * step;
        p.y += ((p.ty - p.y) / d) * step;
        keep.push(p);
      }
    }
    state.projectiles = keep;
  }

  function tickFx(state, dt) {
    for (const f of state.fx) f.t += dt;
    state.fx = state.fx.filter((f) => f.t < f.life);
  }

  function weightedOfferIds(state, player) {
    const owned = new Set(player.deck);
    const pool = Object.keys(UNITS).filter((id) => !owned.has(id));
    const picks = [];
    const used = new Set();
    let guard = 0;
    while (picks.length < 3 && guard++ < 40 && pool.length) {
      const weighted = [];
      for (const id of pool) {
        if (used.has(id)) continue;
        const w = RARITY_WEIGHT[UNITS[id].rarity] || 20;
        for (let i = 0; i < w; i++) weighted.push(id);
      }
      if (!weighted.length) break;
      const id = weighted[Math.floor(state.rng() * weighted.length)];
      used.add(id);
      picks.push(id);
    }
    while (picks.length < 3) {
      const leftover = Object.keys(UNITS).find((id) => !used.has(id));
      if (!leftover) break;
      used.add(leftover);
      picks.push(leftover);
    }
    return picks;
  }

  function beginAugment(state) {
    state.phase = 'augment';
    state.augmentRound += 1;
    state.augmentEndsAt = state.time + state.augmentDuration;
    state.nextAugmentAt += state.augmentEvery;
    for (const p of state.players) {
      if (p.isAI && state.mode === 'survival') continue;
      p.offers = weightedOfferIds(state, p);
      p.picked = false;
    }
    for (const p of state.players) {
      if (p.isAI && p.offers && p.offers.length) {
        pickAugment(state, p.id, p.offers[Math.floor(state.rng() * p.offers.length)]);
      }
    }
    state.events.push({ type: 'augment', round: state.augmentRound });
  }

  function pickAugment(state, playerId, unitId) {
    if (state.phase !== 'augment') return { ok: false, reason: 'not-augment' };
    const player = state.players[playerId];
    if (!player || player.picked) return { ok: false, reason: 'already' };
    if (!player.offers || player.offers.indexOf(unitId) < 0) return { ok: false, reason: 'not-offered' };
    if (!UNITS[unitId]) return { ok: false, reason: 'unknown' };
    player.deck.push(unitId);
    player.cycle.push(unitId);
    player.augments.push(unitId);
    player.picked = true;
    player.offers = player.offers.slice();
    state.events.push({ type: 'picked', playerId, unitId });
    maybeResumeFromAugment(state);
    return { ok: true };
  }

  function maybeResumeFromAugment(state) {
    if (state.phase !== 'augment') return;
    const need = state.players.filter((p) => !(p.isAI && state.mode === 'survival'));
    if (need.every((p) => p.picked) || state.time >= state.augmentEndsAt) {
      for (const p of need) {
        if (!p.picked && p.offers && p.offers[0]) {
          pickAugment(state, p.id, p.offers[0]);
        }
        p.offers = null;
      }
      if (state.phase === 'augment') {
        state.phase = 'battle';
        state.events.push({ type: 'resume' });
      }
    }
  }

  function finishAugmentTimeout(state) {
    if (state.phase !== 'augment') return;
    for (const p of state.players) {
      if (!p.picked && p.offers && p.offers[0]) pickAugment(state, p.id, p.offers[0]);
    }
    maybeResumeFromAugment(state);
  }

  const WAVE_TEMPLATES = [
    [{ type: 'skirmish', n: 1, lane: 0 }, { type: 'skirmish', n: 1, lane: 2 }],
    [{ type: 'knight', n: 1, lane: 1 }, { type: 'skirmish', n: 1, lane: 0 }],
    [{ type: 'archer', n: 1, lane: 0 }, { type: 'archer', n: 1, lane: 2 }, { type: 'knight', n: 1, lane: 1 }],
    [{ type: 'bruiser', n: 1, lane: 1 }, { type: 'bomber', n: 1, lane: 0 }],
    [{ type: 'golem', n: 1, lane: 1 }, { type: 'skirmish', n: 1, lane: 0 }, { type: 'skirmish', n: 1, lane: 2 }],
    [{ type: 'mage', n: 1, lane: 0 }, { type: 'assassin', n: 1, lane: 2 }, { type: 'guard', n: 1, lane: 1 }],
    [{ type: 'graveswarm', n: 1, lane: 1 }, { type: 'archer', n: 1, lane: 0 }],
    [{ type: 'warlord', n: 1, lane: 1 }, { type: 'sunshot', n: 1, lane: 0 }]
  ];

  function spawnWave(state) {
    state.wave += 1;
    const tpl = WAVE_TEMPLATES[(state.wave - 1) % WAVE_TEMPLATES.length];
    const scale = 1 + (state.wave - 1) * 0.14;
    const extra = Math.floor((state.wave - 1) / WAVE_TEMPLATES.length);
    for (const entry of tpl) {
      const def = UNITS[entry.type];
      if (!def) continue;
      const copies = entry.n + extra;
      for (let i = 0; i < copies; i++) {
        const x = LANES[entry.lane] + (i - (copies - 1) / 2) * 0.45;
        const y = 28.6 - (i % 2) * 0.5;
        const u = spawnTroop(state, def, 1, -1, x, y);
        u.hp = Math.round(u.hp * scale);
        u.maxHp = u.hp;
        u.owner = -1;
      }
    }
    state.waveTimer = Math.max(16, 22 - state.wave * 0.35);
    state.score += 100;
    state.events.push({ type: 'wave', wave: state.wave });
  }

  function tickWaves(state, dt) {
    if (state.mode !== 'survival') return;
    const enemies = state.units.filter((u) => !u.dead && u.team === 1).length;
    state.enemiesAlive = enemies;
    state.waveTimer -= dt;
    if (enemies === 0 && state.wave > 0) state.waveTimer = Math.min(state.waveTimer, 1.4);
    if (state.waveTimer <= 0) spawnWave(state);
  }

  function cheapestAffordable(player) {
    let best = null;
    for (const id of player.hand) {
      const def = UNITS[id];
      if (!def) continue;
      if (player.elixir >= def.cost && (!best || def.cost < UNITS[best].cost)) best = id;
    }
    return best;
  }

  function tickAI(state) {
    for (const p of state.players) {
      if (!p.isAI) continue;
      if (state.mode === 'survival') continue;
      if (p.elixir < 3) continue;
      const card = cheapestAffordable(p);
      if (!card) continue;
      const lane = LANES[Math.floor(state.rng() * LANES.length)];
      const y = p.team === 1 ? 24.2 + state.rng() * 3.2 : 7.8 - state.rng() * 3.2;
      playCard(state, p.id, card, lane, y);
    }
  }

  function scoreVersus(state) {
    const hp = [0, 0];
    for (const tw of state.towers) {
      if (tw.hp > 0) hp[tw.team] += tw.hp;
    }
    if (hp[0] === hp[1]) {
      const dmg = state.players.map((p) => p.damageDealt);
      if (dmg[0] === dmg[1]) return { team: 0, reason: 'draw' };
      return { team: dmg[0] > dmg[1] ? 0 : 1, reason: 'damage' };
    }
    return { team: hp[0] > hp[1] ? 0 : 1, reason: 'towers' };
  }

  function tickClock(state, dt) {
    if (state.mode !== 'versus') return;
    const limit = state.overtime ? VERSUS_TIME + OVERTIME : VERSUS_TIME;
    if (state.battleTime >= VERSUS_TIME && !state.overtime) {
      const kings = state.towers.filter((t) => t.kind === 'king');
      const h0 = kings.find((t) => t.team === 0);
      const h1 = kings.find((t) => t.team === 1);
      if (h0 && h1 && Math.abs(h0.hp - h1.hp) < 1) {
        state.overtime = true;
        state.events.push({ type: 'overtime' });
      } else {
        const s = scoreVersus(state);
        endMatch(state, s.team, s.reason);
      }
    } else if (state.battleTime >= limit) {
      const s = scoreVersus(state);
      endMatch(state, s.team, s.reason);
    }
  }

  function tick(state, dt) {
    if (!state || state.ended) return state;
    state.events = [];
    state.time += dt;
    if (state.phase === 'augment') {
      tickFx(state, dt);
      if (state.time >= state.augmentEndsAt) finishAugmentTimeout(state);
      return state;
    }
    state.battleTime += dt;
    regenElixir(state, dt);
    tickAI(state);
    tickWaves(state, dt);
    tickUnits(state, dt);
    tickTowers(state, dt);
    tickProjectilesWrapped(state, dt);
    tickFx(state, dt);
    if (state.battleTime + 0.0001 >= state.nextAugmentAt) beginAugment(state);
    tickClock(state, dt);
    return state;
  }

  function getSnapshot(state) {
    return {
      mode: state.mode,
      seed: state.seed,
      time: state.time,
      battleTime: state.battleTime,
      phase: state.phase,
      augmentRound: state.augmentRound,
      augmentEndsAt: state.augmentEndsAt,
      nextAugmentAt: state.nextAugmentAt,
      overtime: state.overtime,
      wave: state.wave,
      score: state.score,
      ended: state.ended,
      winner: state.winner,
      winReason: state.winReason,
      players: state.players.map((p) => ({
        id: p.id,
        team: p.team,
        name: p.name,
        isAI: p.isAI,
        elixir: Math.round(p.elixir * 100) / 100,
        hand: p.hand.slice(),
        deck: p.deck.slice(),
        augments: p.augments.slice(),
        offers: p.offers ? p.offers.slice() : null,
        picked: p.picked,
        damageDealt: Math.round(p.damageDealt)
      })),
      units: state.units.map((u) => ({
        id: u.id,
        type: u.type,
        team: u.team,
        owner: u.owner,
        x: Math.round(u.x * 100) / 100,
        y: Math.round(u.y * 100) / 100,
        hp: Math.round(u.hp),
        maxHp: Math.round(u.maxHp),
        flash: u.flash,
        stun: u.stun,
        kind: u.kind,
        pose: u.pose || 'idle',
        poseT: Math.round((u.poseT || 0) * 100) / 100
      })),
      towers: state.towers.map((t) => ({
        id: t.id,
        team: t.team,
        kind: t.kind,
        x: t.x,
        y: t.y,
        hp: Math.max(0, Math.round(t.hp)),
        maxHp: t.maxHp,
        active: t.active,
        flash: t.flash || 0
      })),
      projectiles: state.projectiles.map((p) => ({
        id: p.id, x: p.x, y: p.y, tx: p.tx, ty: p.ty, team: p.team, type: p.type
      })),
      fx: state.fx.slice(),
      events: state.events.slice(),
      elixirRate: elixirRate(state),
      doubleElixir: elixirRate(state) > ELIXIR_RATE
    };
  }

  function runTicks(state, seconds, dt) {
    const step = dt || 0.05;
    let left = seconds;
    while (left > 0.0001 && !state.ended) {
      const d = Math.min(step, left);
      tick(state, d);
      left -= d;
    }
    return state;
  }

  return {
    ARENA_W,
    ARENA_H,
    LANES,
    RIVER_Y0,
    RIVER_Y1,
    ELIXIR_MAX,
    ELIXIR_START,
    STARTING_DECK,
    AUGMENT_EVERY,
    AUGMENT_DURATION,
    VERSUS_TIME,
    UNITS,
    BASE_IDS,
    AUGMENT_IDS,
    createMatch,
    tick,
    runTicks,
    playCard,
    pickAugment,
    getSnapshot,
    nearestLane,
    elixirRate
  };
});
