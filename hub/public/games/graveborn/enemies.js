/**
 * Graveborn horde catalog — types, wave scaling, pack weights, boss rotation.
 * Shared by the web build (and mirrored in godot/graveborn/scripts/enemy_db.gd).
 */
(function (root) {
  const WAVE_SECS = 20;
  const HP_GROWTH = 1.16;
  const DMG_GROWTH = 1.11;
  const SPD_GROWTH = 1.028;
  const SPD_CAP = 1.6;
  const FIRST_BOSS = 60;
  const BOSS_EVERY = 75;

  const TYPES = {
    husk: {
      id: "husk", role: "chase", hp: 26, spd: 56, dmg: 8, r: 14, xp: 4,
      scale: 1.22, unlock: 0, pack: 1, weight: 70,
    },
    mite: {
      id: "mite", role: "swarm", hp: 9, spd: 92, dmg: 5, r: 9, xp: 2,
      scale: 0.72, unlock: 0, pack: 4, weight: 48,
    },
    runner: {
      id: "runner", role: "chase", hp: 18, spd: 120, dmg: 7, r: 12, xp: 5,
      scale: 1.12, unlock: 20, pack: 2, weight: 30,
    },
    spit: {
      id: "spit", role: "ranged", hp: 24, spd: 44, dmg: 10, r: 13, xp: 6,
      scale: 1.18, unlock: 30, pack: 1, weight: 22,
    },
    exploder: {
      id: "exploder", role: "suicide", hp: 20, spd: 98, dmg: 24, r: 13, xp: 7,
      scale: 1.18, unlock: 45, pack: 1, weight: 16,
    },
    brute: {
      id: "brute", role: "chase", hp: 100, spd: 40, dmg: 17, r: 20, xp: 14,
      scale: 1.7, unlock: 40, pack: 1, weight: 14,
    },
    wraith: {
      id: "wraith", role: "phase", hp: 30, spd: 84, dmg: 12, r: 13, xp: 9,
      scale: 1.28, unlock: 70, pack: 1, weight: 12,
    },
    shaman: {
      id: "shaman", role: "support", hp: 38, spd: 38, dmg: 8, r: 14, xp: 12,
      scale: 1.3, unlock: 80, pack: 1, weight: 8,
    },
  };

  const BOSSES = [
    {
      id: "titan", name: "GRAVE TITAN", role: "boss_slam",
      hp: 560, spd: 34, dmg: 24, r: 28, xp: 90, scale: 2.55,
    },
    {
      id: "sovereign", name: "BONE SOVEREIGN", role: "boss_summon",
      hp: 480, spd: 40, dmg: 16, r: 26, xp: 80, scale: 2.35,
    },
    {
      id: "duchess", name: "HOWLING DUCHESS", role: "boss_dash",
      hp: 400, spd: 96, dmg: 18, r: 22, xp: 85, scale: 2.2,
    },
    {
      id: "bishop", name: "PLAGUE BISHOP", role: "boss_mage",
      hp: 430, spd: 36, dmg: 14, r: 24, xp: 88, scale: 2.3,
    },
  ];

  function waveFromTime(t) {
    return 1 + ((Math.max(0, t) / WAVE_SECS) | 0);
  }

  function scaleStat(base, rate, wave, cap) {
    const v = base * Math.pow(rate, Math.max(0, wave - 1));
    return cap != null ? Math.min(cap, v) : v;
  }

  function scaled(def, wave, cycle) {
    const cyc = cycle || 0;
    const hpMul = Math.pow(1.22, cyc);
    return {
      hp: scaleStat(def.hp, HP_GROWTH, wave) * hpMul,
      spd: scaleStat(def.spd, SPD_GROWTH, wave, def.spd * SPD_CAP),
      dmg: scaleStat(def.dmg, DMG_GROWTH, wave) * Math.pow(1.1, cyc),
    };
  }

  function spawnInterval(wave) {
    return Math.max(0.11, 0.7 - wave * 0.034);
  }

  function packBonus(wave) {
    return Math.min(4, (wave / 3) | 0);
  }

  function liveCap(wave) {
    return Math.min(180, 48 + wave * 14);
  }

  function eliteChance(wave) {
    if (wave < 3) return 0;
    return Math.min(0.22, 0.06 + (wave - 3) * 0.015);
  }

  function pickType(time, rng) {
    const roll = rng || Math.random;
    const unlocked = [];
    let total = 0;
    for (const id in TYPES) {
      const def = TYPES[id];
      if (time < def.unlock) continue;
      unlocked.push(def);
      total += def.weight;
    }
    let r = roll() * total;
    for (let i = 0; i < unlocked.length; i++) {
      r -= unlocked[i].weight;
      if (r <= 0) return unlocked[i];
    }
    return TYPES.husk;
  }

  function bossIndex(time) {
    if (time < FIRST_BOSS) return -1;
    return ((time - FIRST_BOSS) / BOSS_EVERY) | 0;
  }

  function bossForIndex(index) {
    if (index < 0) return null;
    const def = BOSSES[index % BOSSES.length];
    const cycle = (index / BOSSES.length) | 0;
    return { def: def, cycle: cycle, wave: waveFromTime(FIRST_BOSS + index * BOSS_EVERY) };
  }

  function nextBossAt(time) {
    if (time < FIRST_BOSS) return FIRST_BOSS;
    return FIRST_BOSS + (bossIndex(time) + 1) * BOSS_EVERY;
  }

  root.GravebornEnemies = {
    WAVE_SECS, HP_GROWTH, DMG_GROWTH, SPD_GROWTH, SPD_CAP,
    FIRST_BOSS, BOSS_EVERY, TYPES, BOSSES,
    waveFromTime, scaleStat, scaled, spawnInterval, packBonus, liveCap,
    eliteChance, pickType, bossIndex, bossForIndex, nextBossAt,
  };
})(typeof window !== "undefined" ? window : globalThis);
