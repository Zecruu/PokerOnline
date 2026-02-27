// ═══════════════════════════════════════════════════════════════
// ZECRU TOWER DEFENSE - Complete Game Engine
// ═══════════════════════════════════════════════════════════════
(function () {
'use strict';

// ── CONSTANTS ──────────────────────────────────────────────
const TILE = 40;
const COLS = 20;
const ROWS = 14;
const CANVAS_W = COLS * TILE;   // 800
const CANVAS_H = ROWS * TILE;   // 560
const SELL_RATIO = 0.7;
const ASCENDED_SELL_RATIO = 0.5;

// ── PATH (grid coords) ────────────────────────────────────
const PATH_GRID = [
  [0, 6], [4, 6], [4, 2], [10, 2], [10, 11], [16, 11], [16, 4], [19, 4]
];
const PATH = PATH_GRID.map(([gx, gy]) => ({
  x: gx * TILE + TILE / 2,
  y: gy * TILE + TILE / 2
}));

function buildPathTiles() {
  const tiles = new Set();
  for (let i = 0; i < PATH_GRID.length - 1; i++) {
    const [x1, y1] = PATH_GRID[i];
    const [x2, y2] = PATH_GRID[i + 1];
    if (x1 === x2) {
      for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
        tiles.add(`${x1},${y}`);
      }
    } else {
      for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
        tiles.add(`${x},${y1}`);
      }
    }
  }
  return tiles;
}
const PATH_TILES = buildPathTiles();

// Precompute path segment lengths for enemy movement
const PATH_LENGTHS = [];
let TOTAL_PATH_LENGTH = 0;
for (let i = 0; i < PATH.length - 1; i++) {
  const dx = PATH[i + 1].x - PATH[i].x;
  const dy = PATH[i + 1].y - PATH[i].y;
  const len = Math.sqrt(dx * dx + dy * dy);
  PATH_LENGTHS.push(len);
  TOTAL_PATH_LENGTH += len;
}

// ── SPRITE LOADER ──────────────────────────────────────────
const SPRITES = {};
function loadSprite(key, src) {
  const img = new Image();
  img.src = src;
  SPRITES[key] = img;
}
loadSprite('bolt', 'bolt-tower.png');
loadSprite('frost', 'frost-tower.png');
loadSprite('cannon', 'cannon-tower.png');
loadSprite('cannonProj', 'cannon-projectile.png');
loadSprite('sniper', 'sniper-tower.png');
loadSprite('tesla', 'tesla-tower.png');
loadSprite('radar', 'radar-tower.png');

// ── TOWER DEFINITIONS ──────────────────────────────────────
const TOWERS = {
  bolt: {
    // PHYSICAL - good vs scouts/runners, weak vs phantoms/shielded
    name: 'Bolt Tower', cost: 100, damage: 12, range: 140, fireRate: 1.2,
    color: '#4488ff', projColor: '#66aaff', projSpeed: 450,
    sprite: 'bolt', dmgType: 'physical',
    desc: 'Physical bolts. Weak vs Phantoms.', type: 'single',
    upgrades: [
      { cost: 100, damage: 22, fireRate: 1.8, range: 155, desc: 'Rapid Bolts' },
      { cost: 250, damage: 40, fireRate: 2.4, range: 170, pierce: 2, desc: 'Piercing Bolts' },
      { cost: 500, damage: 70, fireRate: 3.0, range: 190, pierce: 4, dmgType: 'energy', desc: 'Plasma Bolts (Energy)' }
    ]
  },
  frost: {
    // MAGIC - counters phantoms & runners (slow), weak vs shielded
    name: 'Frost Spire', cost: 150, damage: 6, range: 120, fireRate: 0.9,
    color: '#00ddee', projColor: '#aaffff', projSpeed: 320,
    sprite: 'frost', dmgType: 'magic',
    slow: 0.45, slowDur: 2.0,
    desc: 'Magic ice. Counters Phantoms & Runners.', type: 'single',
    upgrades: [
      { cost: 120, damage: 14, slow: 0.3, range: 140, fireRate: 1.1, desc: 'Deep Freeze' },
      { cost: 275, damage: 28, slow: 0.2, range: 160, fireRate: 1.3, freezeChance: 0.2, shieldBreak: true, desc: 'Shatter (breaks shields)' },
      { cost: 500, damage: 50, slow: 0.1, range: 180, fireRate: 1.5, freezeChance: 0.35, splash: 65, desc: 'Blizzard' }
    ]
  },
  cannon: {
    // EXPLOSIVE - counters swarms & splitters (AoE), weak vs armored
    name: 'Cannon Turret', cost: 225, damage: 28, range: 130, fireRate: 0.5,
    color: '#dd4444', projColor: '#ff6644', projSpeed: 260,
    sprite: 'cannon', projSprite: 'cannonProj', dmgType: 'explosive',
    splash: 50, desc: 'AoE explosive. Counters Swarms & Splitters.', type: 'splash',
    upgrades: [
      { cost: 175, damage: 50, splash: 70, range: 145, fireRate: 0.6, desc: 'Bigger Blasts' },
      { cost: 375, damage: 85, splash: 95, range: 160, fireRate: 0.7, antiSwarm: true, desc: 'Fragmentation (2x vs Swarm)' },
      { cost: 600, damage: 140, splash: 120, range: 175, fireRate: 0.8, desc: 'Cluster Bombs' }
    ]
  },
  sniper: {
    // PHYSICAL - counters armored & brutes (armor pierce), weak vs swarms
    name: 'Sniper Nest', cost: 275, damage: 45, range: 280, fireRate: 0.3,
    color: '#44cc44', projColor: '#88ff88', projSpeed: 900,
    sprite: 'sniper', dmgType: 'physical',
    desc: 'Armor piercing. Counters Armored & Brutes.', type: 'single',
    upgrades: [
      { cost: 200, damage: 85, range: 310, critChance: 0.25, critMult: 3.0, camoDetect: true, desc: 'Night Vision (sees Camo)' },
      { cost: 425, damage: 150, range: 340, fireRate: 0.4, armorPierce: true, critChance: 0.3, critMult: 3.0, camoDetect: true, dmgType: 'energy', desc: 'Energy Rounds (pierce all)' },
      { cost: 700, damage: 250, range: 380, fireRate: 0.5, instakillThresh: 0.2, camoDetect: true, desc: 'Headshot (execute <20%)' }
    ]
  },
  radar: {
    // SUPPORT - reveals camo enemies in range, no damage
    name: 'Radar Station', cost: 200, damage: 0, range: 180, fireRate: 0,
    color: '#55ff99', projColor: '#55ff99', projSpeed: 0,
    dmgType: 'none', camoReveal: true,
    sprite: 'radar',
    desc: 'Reveals Camo enemies for all towers.', type: 'support',
    upgrades: [
      { cost: 150, range: 230, desc: 'Extended Radar' },
      { cost: 350, range: 280, camoStrip: true, desc: 'Scrambler (strips Camo)' },
      { cost: 600, range: 340, nearbyBoost: 0.1, desc: 'Command Center (+10% ally dmg)' }
    ]
  },
  tesla: {
    // ENERGY - counters phantoms & shielded, good vs groups
    name: 'Tesla Coil', cost: 300, damage: 18, range: 140, fireRate: 0.7,
    color: '#ffcc00', projColor: '#ffee66', projSpeed: 0,
    chainCount: 3, chainRange: 80, dmgType: 'energy',
    sprite: 'tesla',
    desc: 'Energy chains. Counters Phantoms & Shielded.', type: 'chain',
    upgrades: [
      { cost: 200, damage: 32, chainCount: 5, chainRange: 95, range: 160, fireRate: 0.85, desc: 'Arc Spread' },
      { cost: 400, damage: 55, chainCount: 7, chainRange: 110, range: 175, fireRate: 1.0, stunChance: 0.15, shieldBreak: true, desc: 'Shield Breaker' },
      { cost: 650, damage: 90, chainCount: 10, chainRange: 130, range: 200, fireRate: 1.2, stunChance: 0.25, desc: 'Overload' }
    ]
  }
};

// ── ASCENDED TOWER DEFINITIONS ─────────────────────────────
const ASCENDED = {
  moneyman: {
    name: 'Money Man', cost: 500, damage: 5, range: 150, fireRate: 0.5,
    color: '#ffd700', projColor: '#fff44f', projSpeed: 300,
    desc: 'Generates gold & boosts income nearby.', type: 'support',
    goldPerWave: 50, goldBonus: 0.5, ascended: true,
    upgrades: [
      { cost: 350, damage: 12, goldPerWave: 100, goldBonus: 0.85, range: 170, desc: 'Gold Rush' },
      { cost: 650, damage: 25, goldPerWave: 175, goldBonus: 1.2, range: 200, nearbyBoost: 0.2, desc: 'Inspire (+20% ally dmg)' },
      { cost: 1000, damage: 45, goldPerWave: 300, goldBonus: 2.0, range: 230, nearbyBoost: 0.4, goldExplosion: true, desc: 'Golden Touch' }
    ]
  },
  voidwarden: {
    name: 'Void Warden', cost: 600, damage: 35, range: 160, fireRate: 0.35,
    color: '#9933ff', projColor: '#cc66ff', projSpeed: 0,
    desc: 'Gravity well pulls enemies in. Massive AoE.', type: 'aoe',
    pullStr: 35, ascended: true,
    upgrades: [
      { cost: 450, damage: 70, pullStr: 65, range: 190, fireRate: 0.45, desc: 'Stronger Pull' },
      { cost: 750, damage: 120, pullStr: 90, range: 220, fireRate: 0.55, voidErupt: true, desc: 'Void Eruption' },
      { cost: 1100, damage: 200, pullStr: 130, range: 260, fireRate: 0.65, blackHole: true, desc: 'Black Hole' }
    ]
  },
  chrono: {
    name: 'Chrono Sentinel', cost: 550, damage: 12, range: 200, fireRate: 0.4,
    color: '#ddeeff', projColor: '#bbccff', projSpeed: 350,
    desc: 'Warps time - massive slow field.', type: 'timeslow',
    globalSlow: 0.5, ascended: true,
    upgrades: [
      { cost: 400, damage: 30, globalSlow: 0.3, range: 240, fireRate: 0.55, desc: 'Time Dilation' },
      { cost: 700, damage: 55, globalSlow: 0.15, range: 280, fireRate: 0.7, timeStop: true, desc: 'Time Stop Burst' },
      { cost: 1050, damage: 90, globalSlow: 0.05, range: 330, fireRate: 0.9, rewind: true, desc: 'Temporal Rewind' }
    ]
  }
};

// ── ENEMY DEFINITIONS ──────────────────────────────────────
// resist: { physical, energy, magic, explosive } — 0=full dmg, 1=immune
// evasion: chance to dodge single-target hits
// shield: absorbs damage before HP, regens between waves
// splits: on death spawn N smaller enemies
const ENEMY_TYPES = {
  scout:    { name: 'Scout',    hp: 10,  speed: 1.8, gold: 7,   color: '#ff4444', size: 7 },
  runner:   { name: 'Runner',   hp: 16,  speed: 3.0, gold: 8,   color: '#44ff44', size: 6,
              evasion: 0.2 },  // 20% dodge vs single-target → use AoE or frost slow
  brute:    { name: 'Brute',    hp: 50,  speed: 1.2, gold: 15,  color: '#4488ff', size: 10,
              armor: 0.25, resist: { explosive: 0.3 } },  // tanky, resists explosions → use sniper
  swarm:    { name: 'Swarm',    hp: 6,   speed: 2.4, gold: 2,   color: '#cc44ff', size: 5 },  // use AoE/chain
  armored:  { name: 'Armored',  hp: 90,  speed: 0.9, gold: 25,  color: '#ffcc00', size: 11,
              armor: 0.5, resist: { physical: 0.4, magic: 0.2 } },  // need armor pierce or energy
  phantom:  { name: 'Phantom',  hp: 35,  speed: 2.0, gold: 18,  color: '#88ffff', size: 8,
              resist: { physical: 0.85, explosive: 0.6 }, phase: true },  // immune to physical → need magic/energy
  shielded: { name: 'Shielded', hp: 40,  speed: 1.5, gold: 20,  color: '#ffffff', size: 9,
              shield: 30, shieldMax: 30, shieldRegen: 5 },  // shield absorbs → need fast fire or shieldBreak
  splitter: { name: 'Splitter', hp: 45,  speed: 1.6, gold: 12,  color: '#ff8800', size: 10,
              splits: 3 },  // splits on death → need AoE to clean up children
  camoScout:{ name: 'Camo Scout',  hp: 12, speed: 2.2, gold: 8, color: '#336633', size: 7,
              camo: true },  // invisible → need Radar or Sniper Lv1+
  camoRunner:{ name: 'Camo Runner', hp: 18, speed: 3.2, gold: 12, color: '#225522', size: 6,
              camo: true, evasion: 0.15 },  // fast + invisible
  camoArmored:{ name: 'Camo Tank', hp: 80, speed: 1.0, gold: 30, color: '#556622', size: 11,
              camo: true, armor: 0.4, resist: { physical: 0.3 } },  // armored + invisible, nasty
  boss:     { name: 'Boss',     hp: 500, speed: 0.65, gold: 150, color: '#ff0044', size: 16,
              armor: 0.2, shield: 100, shieldMax: 100, shieldRegen: 8,
              resist: { physical: 0.15 } }
};

// ── WAVE GENERATOR (Bloons-style pacing) ───────────────────
// Early waves: small groups, fast spawns, quick ramp
// Mid waves: mixed enemy types, tighter spacing
// Late waves: massive swarms + tanks + bosses, relentless
const TOTAL_WAVES = 40;
function generateWaves() {
  const waves = [];
  for (let w = 1; w <= TOTAL_WAVES; w++) {
    const wave = [];
    const hpS = 1 + (w - 1) * 0.22;
    const spS = 1 + (w - 1) * 0.018;
    let t = 0;
    const push = (type, count, gap) => {
      for (let i = 0; i < count; i++) {
        wave.push({ type, delay: t, hpMult: hpS, spdMult: spS });
        t += gap;
      }
    };

    // Aggressive scaling: BTD-inspired pacing
    // Camo introduced wave 6, phantom w8, shielded w12, splitter w14
    // Spawn gaps tightened significantly for more pressure
    if (w <= 3) {
      push('scout', 4 + w * 3, 0.6);
    } else if (w <= 6) {
      push('scout', 8 + w * 3, 0.35);
      t += 0.4;
      push('runner', w, 0.35);
      // Camo scouts introduced wave 6 — need Radar or Sniper Lv1
      if (w >= 6) { t += 0.3; push('camoScout', 3, 0.7); }
    } else if (w <= 10) {
      push('scout', 12 + w * 2, 0.25);
      t += 0.3;
      push('runner', 4 + (w - 6) * 3, 0.25);
      t += 0.3;
      push('brute', 2 + Math.floor((w - 5) / 2), 0.8);
      push('camoScout', 3 + (w - 6) * 2, 0.5);
      // Phantoms start at wave 8
      if (w >= 8) { t += 0.3; push('phantom', 2 + (w - 8), 0.6); }
      if (w >= 9) { push('camoRunner', 2 + (w - 9), 0.6); }
    } else if (w <= 15) {
      push('runner', 8 + (w - 10) * 3, 0.18);
      t += 0.2;
      push('scout', 15 + w * 2, 0.18);
      t += 0.2;
      push('brute', 4 + (w - 10), 0.6);
      t += 0.15;
      push('swarm', 12 + (w - 10) * 6, 0.08);
      t += 0.2;
      push('phantom', 3 + (w - 10), 0.5);
      push('camoScout', 5 + (w - 10) * 2, 0.35);
      push('camoRunner', 3 + (w - 10), 0.4);
      // Shielded start at wave 12
      if (w >= 12) { t += 0.3; push('shielded', 2 + (w - 12), 0.7); }
      // Splitters start at wave 14
      if (w >= 14) { t += 0.2; push('splitter', 2 + (w - 14), 0.6); }
    } else if (w <= 25) {
      push('runner', 14 + (w - 14) * 3, 0.12);
      push('scout', 20 + (w - 10) * 2, 0.12);
      t += 0.15;
      push('brute', 5 + (w - 14) * 2, 0.45);
      push('swarm', 18 + (w - 14) * 7, 0.05);
      t += 0.2;
      push('armored', 3 + (w - 15), 0.8);
      t += 0.15;
      push('phantom', 4 + (w - 15) * 2, 0.4);
      push('shielded', 3 + (w - 15), 0.55);
      t += 0.15;
      push('splitter', 3 + Math.floor((w - 15) / 2), 0.6);
      push('camoScout', 8 + (w - 15) * 2, 0.2);
      push('camoRunner', 5 + (w - 15), 0.3);
      if (w >= 20) { push('camoArmored', 1 + Math.floor((w - 20) / 2), 1.0); }
    } else {
      push('runner', 22 + (w - 24) * 4, 0.07);
      push('swarm', 35 + (w - 24) * 10, 0.04);
      t += 0.1;
      push('brute', 8 + (w - 24) * 2, 0.3);
      push('armored', 5 + (w - 24) * 2, 0.5);
      t += 0.1;
      push('scout', 25 + (w - 24) * 3, 0.08);
      t += 0.1;
      push('phantom', 6 + (w - 24) * 3, 0.3);
      push('shielded', 5 + (w - 24) * 2, 0.4);
      push('splitter', 4 + (w - 24) * 2, 0.45);
      push('camoScout', 12 + (w - 24) * 3, 0.12);
      push('camoRunner', 8 + (w - 24) * 2, 0.18);
      push('camoArmored', 3 + (w - 24), 0.7);
    }

    // Boss every 5 waves
    if (w % 5 === 0) {
      const bm = hpS * (1 + Math.floor(w / 5) * 0.5);
      wave.push({ type: 'boss', delay: t + 1.5, hpMult: bm, spdMult: spS * 0.9 });
      if (w >= 15) wave.push({ type: 'boss', delay: t + 5, hpMult: bm * 0.8, spdMult: spS });
      if (w >= 30) wave.push({ type: 'boss', delay: t + 8, hpMult: bm * 0.7, spdMult: spS * 1.1 });
    }

    wave.sort((a, b) => a.delay - b.delay);
    waves.push(wave);
  }
  return waves;
}
const WAVES = generateWaves();

// ═══════════════════════════════════════════════════════════════
// GAME CLASS
// ═══════════════════════════════════════════════════════════════
class ZecruTD {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = CANVAS_W;
    this.canvas.height = CANVAS_H;

    // State
    this.state = 'menu';
    this.gold = 250;
    this.lives = 20;
    this.score = 0;
    this.wave = 0;
    this.towersBuilt = 0;

    // Entities
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.floatTexts = [];

    // Wave
    this.waveQueue = [];
    this.waveTimer = 0;
    this.waveSpawnIdx = 0;
    this.waveActive = false;
    this.betweenWaves = true;

    // Selection
    this.selectedType = null;   // tower type key to place
    this.selectedTower = null;  // placed tower to inspect
    this.hoverGX = -1;
    this.hoverGY = -1;
    this.hasAscended = false;

    // Grid: 0=empty, 1=path, 2=tower
    this.grid = [];
    for (let r = 0; r < ROWS; r++) {
      this.grid[r] = new Array(COLS).fill(0);
    }
    PATH_TILES.forEach(k => {
      const [x, y] = k.split(',').map(Number);
      if (x >= 0 && x < COLS && y >= 0 && y < ROWS) this.grid[y][x] = 1;
    });

    // Timing
    this.lastTime = 0;
    this.gameSpeed = 1;
    this.paused = false;

    // Multiplayer (stub)
    this.multiplayer = false;
    this.socket = null;
    this.roomCode = null;

    this.buildUI();
    this.setupEvents();
    this.showScreen('menuScreen');
    this.gameLoop = this.gameLoop.bind(this);
  }

  // ── UI BUILDING ────────────────────────────────────────
  buildUI() {
    const towerList = document.getElementById('towerList');
    const ascendedList = document.getElementById('ascendedList');

    for (const [key, def] of Object.entries(TOWERS)) {
      towerList.appendChild(this.makeTowerBtn(key, def));
    }
    for (const [key, def] of Object.entries(ASCENDED)) {
      ascendedList.appendChild(this.makeTowerBtn(key, def, true));
    }
  }

  makeTowerBtn(key, def, isAscended = false) {
    const btn = document.createElement('button');
    btn.className = 'tower-btn';
    btn.dataset.tower = key;

    // Build stat line
    let stats = `${def.damage} dmg | ${def.range} rng`;
    if (def.splash) stats += ` | ${def.splash} AoE`;
    if (def.slow) stats += ` | ${Math.round((1 - def.slow) * 100)}% slow`;
    if (def.chainCount) stats += ` | ${def.chainCount} chain`;
    if (def.goldPerWave) stats += ` | +${def.goldPerWave}g/wave`;
    if (def.goldBonus) stats += ` | +${Math.round(def.goldBonus * 100)}% gold`;
    if (def.pullStr) stats += ` | ${def.pullStr} pull`;
    if (def.globalSlow) stats += ` | ${Math.round((1 - def.globalSlow) * 100)}% time slow`;

    btn.innerHTML = `
      <div class="t-icon" style="background:${def.color}"></div>
      <div class="t-info">
        <span class="t-name">${def.name}</span>
        <span class="t-cost">${def.cost}g</span>
        <span class="t-desc">${def.desc}</span>
        <span class="t-stats">${stats}</span>
      </div>`;
    btn.addEventListener('click', () => this.selectTowerType(key));
    return btn;
  }

  // ── SCREEN MANAGEMENT ──────────────────────────────────
  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  }

  // ── EVENTS ─────────────────────────────────────────────
  setupEvents() {
    // Menu
    document.getElementById('btnSinglePlayer').addEventListener('click', () => this.startGame(false));
    document.getElementById('btnMultiplayer').addEventListener('click', () => this.showScreen('lobbyScreen'));
    document.getElementById('btnBackToMenu').addEventListener('click', () => this.showScreen('menuScreen'));
    document.getElementById('btnCreateRoom').addEventListener('click', () => this.createRoom());
    document.getElementById('btnJoinRoom').addEventListener('click', () => this.joinRoom());
    document.getElementById('btnStartGame').addEventListener('click', () => {
      if (this.socket) this.socket.emit('td:startGame');
    });

    // Game
    document.getElementById('btnNextWave').addEventListener('click', () => this.startNextWave());
    document.getElementById('btnPause').addEventListener('click', () => this.togglePause());
    document.getElementById('btnSpeed').addEventListener('click', () => this.toggleSpeed());
    document.getElementById('btnUpgrade').addEventListener('click', () => this.upgradeSelected());
    document.getElementById('btnSell').addEventListener('click', () => this.sellSelected());

    // Game Over
    document.getElementById('btnPlayAgain').addEventListener('click', () => this.startGame(false));
    document.getElementById('btnMainMenu').addEventListener('click', () => {
      this.state = 'menu';
      this.showScreen('menuScreen');
    });

    // Canvas events
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('click', (e) => this.onClick(e));
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.selectedType = null;
      this.selectedTower = null;
      this.updateTowerButtons();
      this.hideTowerInfo();
    });

    // Keyboard
    window.addEventListener('keydown', (e) => {
      if (this.state !== 'playing') return;
      if (e.key === 'Escape') {
        this.selectedType = null;
        this.selectedTower = null;
        this.updateTowerButtons();
        this.hideTowerInfo();
      }
      if (e.key === ' ') { e.preventDefault(); this.startNextWave(); }
      const keys = ['1','2','3','4','5','6','7','8','9'];
      const allKeys = [...Object.keys(TOWERS), ...Object.keys(ASCENDED)];
      const idx = keys.indexOf(e.key);
      if (idx >= 0 && idx < allKeys.length) this.selectTowerType(allKeys[idx]);
    });
  }

  // ── GAME START ─────────────────────────────────────────
  startGame(isMultiplayer) {
    this.multiplayer = isMultiplayer;
    this.state = 'playing';
    this.gold = 250;
    this.lives = 20;
    this.score = 0;
    this.wave = 0;
    this.towersBuilt = 0;
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.floatTexts = [];
    this.waveQueue = [];
    this.waveTimer = 0;
    this.waveSpawnIdx = 0;
    this.waveActive = false;
    this.betweenWaves = true;
    this.selectedType = null;
    this.selectedTower = null;
    this.hasAscended = false;
    this.gameSpeed = 1;
    this.paused = false;

    // Reset grid
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        this.grid[r][c] = PATH_TILES.has(`${c},${r}`) ? 1 : 0;
      }
    }

    this.showScreen('gameScreen');
    this.updateHUD();
    this.updateTowerButtons();
    this.hideTowerInfo();
    document.getElementById('btnNextWave').classList.remove('hidden');
    document.getElementById('btnSpeed').textContent = '1x';

    this.lastTime = performance.now();
    requestAnimationFrame(this.gameLoop);
  }

  // ── MAIN LOOP ──────────────────────────────────────────
  gameLoop(now) {
    if (this.state !== 'playing') return;
    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const dt = this.paused ? 0 : Math.min(rawDt, 0.1) * this.gameSpeed;

    this.update(dt);
    this.render();
    requestAnimationFrame(this.gameLoop);
  }

  // ── UPDATE ─────────────────────────────────────────────
  update(dt) {
    if (dt <= 0) return;
    this.updateWaveSpawn(dt);
    this.updateEnemies(dt);
    this.updateTowers(dt);
    this.updateProjectiles(dt);
    this.updateParticles(dt);
    this.updateFloatTexts(dt);
    this.checkWaveEnd();
    this.updateHUD();
  }

  // ── WAVE SPAWNING ──────────────────────────────────────
  startNextWave(fromServer) {
    if (this.waveActive || this.wave >= TOTAL_WAVES) return;
    // In multiplayer, send to server first (server broadcasts to all including sender)
    if (this.multiplayer && this.socket && !fromServer) {
      this.socket.emit('td:sendWave');
      return;
    }
    this.wave++;
    this.waveActive = true;
    this.betweenWaves = false;
    this.waveQueue = WAVES[this.wave - 1].slice();
    this.waveTimer = 0;
    this.waveSpawnIdx = 0;

    // Money Man gold per wave
    this.towers.forEach(t => {
      if (t.def.goldPerWave) {
        const gpw = t.stats.goldPerWave || t.def.goldPerWave;
        this.gold += gpw;
        this.spawnFloatText(t.x, t.y - 20, `+${gpw}g`, '#ffd700');
      }
    });

    document.getElementById('btnNextWave').classList.add('hidden');
    this.showWaveBanner(`Wave ${this.wave}`);
  }

  updateWaveSpawn(dt) {
    if (!this.waveActive) return;
    this.waveTimer += dt;
    while (this.waveSpawnIdx < this.waveQueue.length) {
      const entry = this.waveQueue[this.waveSpawnIdx];
      if (this.waveTimer < entry.delay) break;
      this.spawnEnemy(entry.type, entry.hpMult, entry.spdMult);
      this.waveSpawnIdx++;
    }
  }

  checkWaveEnd() {
    if (!this.waveActive) return;
    if (this.waveSpawnIdx >= this.waveQueue.length && this.enemies.length === 0) {
      this.waveActive = false;
      this.betweenWaves = true;
      if (this.wave >= TOTAL_WAVES) {
        this.victory();
      } else {
        document.getElementById('btnNextWave').classList.remove('hidden');
      }
    }
  }

  showWaveBanner(text) {
    const el = document.getElementById('waveBanner');
    document.getElementById('waveBannerText').textContent = text;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 2000);
  }

  // ── ENEMIES ────────────────────────────────────────────
  spawnEnemy(type, hpMult, spdMult, pathDist) {
    const def = ENEMY_TYPES[type];
    this.enemies.push({
      type,
      x: PATH[0].x,
      y: PATH[0].y,
      hp: Math.round(def.hp * hpMult),
      maxHp: Math.round(def.hp * hpMult),
      speed: def.speed * spdMult,
      baseSpeed: def.speed * spdMult,
      gold: def.gold,
      color: def.color,
      size: def.size,
      armor: def.armor || 0,
      resist: def.resist ? { ...def.resist } : {},
      evasion: def.evasion || 0,
      phase: def.phase || false,
      camo: def.camo || false,
      revealed: false,  // set true when in radar range or camo stripped
      shield: def.shield ? Math.round(def.shield * hpMult) : 0,
      shieldMax: def.shieldMax ? Math.round(def.shieldMax * hpMult) : 0,
      shieldRegen: def.shieldRegen || 0,
      splits: def.splits || 0,
      hpMult: hpMult,
      spdMult: spdMult,
      pathDist: pathDist || 0,
      pathSeg: 0,
      segDist: 0,
      slow: 1,
      slowTimer: 0,
      frozen: false,
      frozenTimer: 0,
      stunned: false,
      stunnedTimer: 0,
      alive: true
    });
  }

  updateEnemies(dt) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e.alive) { this.enemies.splice(i, 1); continue; }

      // Timers
      if (e.slowTimer > 0) { e.slowTimer -= dt; if (e.slowTimer <= 0) e.slow = 1; }
      if (e.frozenTimer > 0) { e.frozenTimer -= dt; if (e.frozenTimer <= 0) e.frozen = false; }
      if (e.stunnedTimer > 0) { e.stunnedTimer -= dt; if (e.stunnedTimer <= 0) e.stunned = false; }

      // Shield regen
      if (e.shieldRegen > 0 && e.shield < e.shieldMax) {
        e.shield = Math.min(e.shieldMax, e.shield + e.shieldRegen * dt);
      }

      if (e.frozen || e.stunned) continue;

      // Chrono Sentinel global slow
      let chronoSlow = 1;
      for (const t of this.towers) {
        if (t.def.globalSlow) {
          const gs = t.stats.globalSlow || t.def.globalSlow;
          const dx = e.x - t.x;
          const dy = e.y - t.y;
          const rng = t.stats.range || t.def.range;
          if (dx * dx + dy * dy <= rng * rng) {
            chronoSlow = Math.min(chronoSlow, gs);
          }
        }
      }

      // Void Warden pull
      for (const t of this.towers) {
        if (t.def.pullStr) {
          const ps = t.stats.pullStr || t.def.pullStr;
          const dx = t.x - e.x;
          const dy = t.y - e.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const rng = t.stats.range || t.def.range;
          if (dist < rng && dist > 5) {
            const force = (ps / dist) * dt;
            e.x += (dx / dist) * force;
            e.y += (dy / dist) * force;
          }
        }
      }

      // Move along path
      const spd = e.speed * e.slow * chronoSlow * TILE * dt;
      e.pathDist += spd;

      // Position from path distance
      let remain = e.pathDist;
      let placed = false;
      for (let s = 0; s < PATH_LENGTHS.length; s++) {
        if (remain <= PATH_LENGTHS[s]) {
          const frac = remain / PATH_LENGTHS[s];
          e.x = PATH[s].x + (PATH[s + 1].x - PATH[s].x) * frac;
          e.y = PATH[s].y + (PATH[s + 1].y - PATH[s].y) * frac;
          e.pathSeg = s;
          placed = true;
          break;
        }
        remain -= PATH_LENGTHS[s];
      }

      if (!placed) {
        // Reached end
        this.lives--;
        e.alive = false;
        this.spawnParticles(e.x, e.y, '#ff0000', 8);
        if (this.lives <= 0) this.gameOver();
      }
    }
  }

  damageEnemy(enemy, damage, tower, isSplash) {
    let dmg = damage;
    const dt = tower ? (tower.stats.dmgType || tower.def.dmgType || 'physical') : 'physical';

    // Evasion check (single-target only, not splash/chain)
    if (enemy.evasion > 0 && !isSplash && Math.random() < enemy.evasion) {
      this.spawnFloatText(enemy.x, enemy.y - 12, 'DODGE', '#aaaaaa');
      return;
    }

    // Damage type resistance
    if (enemy.resist && enemy.resist[dt]) {
      dmg *= (1 - enemy.resist[dt]);
      if (dmg < 1) {
        this.spawnFloatText(enemy.x, enemy.y - 12, 'RESIST', '#888888');
        return;
      }
    }

    // Armor reduction (unless armor pierce)
    if (enemy.armor > 0 && !(tower && tower.stats.armorPierce)) {
      dmg *= (1 - enemy.armor);
    }

    // Crit
    if (tower && tower.stats.critChance && Math.random() < tower.stats.critChance) {
      dmg *= (tower.stats.critMult || 2);
      this.spawnFloatText(enemy.x, enemy.y - 15, 'CRIT!', '#ff4444');
    }

    // Anti-swarm bonus
    if (tower && tower.stats.antiSwarm && (enemy.type === 'swarm' || enemy.type === 'splitter')) {
      dmg *= 2;
    }

    // Instakill threshold
    if (tower && tower.stats.instakillThresh) {
      if (enemy.hp / enemy.maxHp <= tower.stats.instakillThresh && enemy.type !== 'boss') {
        dmg = enemy.hp + enemy.shield;
        this.spawnFloatText(enemy.x, enemy.y - 15, 'EXECUTE!', '#ff0000');
      }
    }

    // Money Man nearby boost
    for (const t of this.towers) {
      if (t.def.nearbyBoost || t.stats.nearbyBoost) {
        const boost = t.stats.nearbyBoost || 0;
        if (boost > 0 && tower) {
          const dx = tower.x - t.x;
          const dy = tower.y - t.y;
          const rng = t.stats.range || t.def.range;
          if (dx * dx + dy * dy <= rng * rng) {
            dmg *= (1 + boost);
          }
        }
      }
    }

    dmg = Math.round(dmg);

    // Shield absorb first
    if (enemy.shield > 0) {
      const shieldBreak = tower && (tower.stats.shieldBreak);
      if (shieldBreak) {
        enemy.shield = 0;
        this.spawnFloatText(enemy.x, enemy.y - 15, 'SHATTER!', '#00ffff');
      } else {
        if (dmg <= enemy.shield) {
          enemy.shield -= dmg;
          return; // fully absorbed
        }
        dmg -= enemy.shield;
        enemy.shield = 0;
      }
    }

    enemy.hp -= dmg;
    if (enemy.hp <= 0) {
      enemy.alive = false;
      this.onEnemyKill(enemy, tower);
    }
  }

  onEnemyKill(enemy, tower) {
    let goldEarned = enemy.gold;
    // Money Man gold bonus
    for (const t of this.towers) {
      if (t.def.goldBonus) {
        const gb = t.stats.goldBonus || t.def.goldBonus;
        const dx = enemy.x - t.x;
        const dy = enemy.y - t.y;
        const rng = t.stats.range || t.def.range;
        if (dx * dx + dy * dy <= rng * rng) {
          goldEarned = Math.round(goldEarned * (1 + gb));
        }
      }
      // Gold explosion
      if (t.stats.goldExplosion && Math.random() < 0.2) {
        const bonus = Math.round(enemy.gold * 0.5);
        goldEarned += bonus;
        this.spawnParticles(enemy.x, enemy.y, '#ffd700', 12);
      }
    }
    this.gold += goldEarned;
    this.score += enemy.maxHp;
    this.spawnFloatText(enemy.x, enemy.y - 10, `+${goldEarned}g`, '#ffd700');
    this.spawnParticles(enemy.x, enemy.y, enemy.color, 6);

    // Splitter: spawn smaller children at same position
    if (enemy.splits > 0) {
      for (let i = 0; i < enemy.splits; i++) {
        this.spawnEnemy('swarm', enemy.hpMult * 0.8, enemy.spdMult * 1.2, enemy.pathDist + (i - 1) * 8);
      }
      this.spawnParticles(enemy.x, enemy.y, '#ff8800', 10);
    }

    this.updateTowerButtons();
  }

  // ── TOWERS ─────────────────────────────────────────────
  selectTowerType(key) {
    const allDefs = { ...TOWERS, ...ASCENDED };
    const def = allDefs[key];
    if (!def) return;
    if (def.ascended && this.hasAscended) return; // limit 1
    if (def.cost > this.gold) return;
    this.selectedType = key;
    this.selectedTower = null;
    this.hideTowerInfo();
    this.updateTowerButtons();
  }

  placeTower(gx, gy) {
    const allDefs = { ...TOWERS, ...ASCENDED };
    const def = allDefs[this.selectedType];
    if (!def || def.cost > this.gold) return false;
    if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) return false;
    if (this.grid[gy][gx] !== 0) return false;
    if (def.ascended && this.hasAscended) return false;

    this.gold -= def.cost;
    this.grid[gy][gx] = 2;
    this.towersBuilt++;

    const tower = {
      id: Date.now() + Math.random(),
      type: this.selectedType,
      def: def,
      gx, gy,
      x: gx * TILE + TILE / 2,
      y: gy * TILE + TILE / 2,
      level: 0,
      cooldown: 0,
      angle: 0,
      totalCost: def.cost,
      stats: { ...def }  // mutable copy of current stats
    };

    this.towers.push(tower);
    if (def.ascended) this.hasAscended = true;

    // Sync to multiplayer
    if (this.multiplayer && this.socket) {
      this.socket.emit('td:placeTower', { gx, gy, type: this.selectedType });
    }

    this.spawnParticles(tower.x, tower.y, def.color, 8);
    this.updateTowerButtons();
    return true;
  }

  upgradeSelected() {
    const t = this.selectedTower;
    if (!t) return;
    if (t.level >= t.def.upgrades.length) return;
    const upg = t.def.upgrades[t.level];
    if (upg.cost > this.gold) return;

    this.gold -= upg.cost;
    t.totalCost += upg.cost;
    t.level++;

    // Apply upgrade stats
    for (const [k, v] of Object.entries(upg)) {
      if (k !== 'cost' && k !== 'desc') {
        t.stats[k] = v;
      }
    }
    // Re-merge base stats that weren't overridden
    for (const [k, v] of Object.entries(t.def)) {
      if (!(k in t.stats) || (k !== 'upgrades' && k !== 'name' && t.stats[k] === undefined)) {
        t.stats[k] = v;
      }
    }

    if (this.multiplayer && this.socket) {
      this.socket.emit('td:upgradeTower', { gx: t.gx, gy: t.gy });
    }

    this.spawnParticles(t.x, t.y, '#44ff88', 10);
    this.showTowerInfo(t);
    this.updateTowerButtons();
  }

  sellSelected() {
    const t = this.selectedTower;
    if (!t) return;
    const ratio = t.def.ascended ? ASCENDED_SELL_RATIO : SELL_RATIO;
    const refund = Math.round(t.totalCost * ratio);
    this.gold += refund;
    this.grid[t.gy][t.gx] = 0;
    if (t.def.ascended) this.hasAscended = false;
    if (this.multiplayer && this.socket) {
      this.socket.emit('td:sellTower', { gx: t.gx, gy: t.gy });
    }
    this.towers = this.towers.filter(tw => tw !== t);
    this.selectedTower = null;
    this.hideTowerInfo();
    this.spawnFloatText(t.x, t.y - 10, `+${refund}g`, '#44ff88');
    this.updateTowerButtons();
  }

  // Check if a tower can see a camo enemy
  canSeeCamo(tower, enemy) {
    if (!enemy.camo) return true;           // not camo, everyone sees it
    if (enemy.revealed) return true;        // revealed by radar
    if (tower.stats.camoDetect) return true; // tower has camo detection upgrade
    if (tower.def.camoDetect) return true;  // tower innately detects camo
    return false;
  }

  updateTowers(dt) {
    // ── Radar pass: reveal/strip camo for enemies in radar range ──
    // Reset revealed flag each frame (only revealed while in radar range)
    for (const e of this.enemies) {
      if (e.camo) e.revealed = false;
    }
    for (const t of this.towers) {
      if (!t.def.camoReveal && !t.stats.camoReveal) continue;
      const range = t.stats.range || t.def.range;
      for (const e of this.enemies) {
        if (!e.alive || !e.camo) continue;
        const dx = e.x - t.x, dy = e.y - t.y;
        if (dx * dx + dy * dy <= range * range) {
          e.revealed = true;
          // Scrambler upgrade permanently strips camo
          if (t.stats.camoStrip) {
            e.camo = false;
            e.revealed = true;
          }
        }
      }
    }

    for (const t of this.towers) {
      // Radar tower is support only — no attacking
      if (t.def.type === 'support' && t.def.camoReveal) continue;

      t.cooldown -= dt;
      if (t.cooldown > 0) continue;

      const range = t.stats.range || t.def.range;
      const fr = t.stats.fireRate || t.def.fireRate;

      // Void Warden AoE pulse
      if (t.def.type === 'aoe') {
        let hit = false;
        for (const e of this.enemies) {
          if (!e.alive || !this.canSeeCamo(t, e)) continue;
          const dx = e.x - t.x, dy = e.y - t.y;
          if (dx * dx + dy * dy <= range * range) {
            this.damageEnemy(e, t.stats.damage || t.def.damage, t, true);
            hit = true;
          }
        }
        if (hit) {
          t.cooldown = 1 / fr;
          this.spawnParticles(t.x, t.y, t.def.color, 4);
          // Void Eruption
          if (t.stats.voidErupt && Math.random() < 0.25) {
            for (const e of this.enemies) {
              if (!e.alive) continue;
              const dx = e.x - t.x, dy = e.y - t.y;
              if (dx * dx + dy * dy <= (range * 1.5) * (range * 1.5)) {
                this.damageEnemy(e, (t.stats.damage || t.def.damage) * 0.5, t, true);
              }
            }
            this.spawnParticles(t.x, t.y, '#cc66ff', 15);
          }
          // Black Hole instakill small enemies
          if (t.stats.blackHole) {
            for (const e of this.enemies) {
              if (!e.alive || e.type === 'boss') continue;
              const dx = e.x - t.x, dy = e.y - t.y;
              if (dx * dx + dy * dy <= 50 * 50 && e.hp / e.maxHp < 0.3) {
                e.alive = false;
                this.onEnemyKill(e, t);
              }
            }
          }
        }
        continue;
      }

      // Chrono Sentinel - time slow is passive, but also shoots + has timeStop burst
      if (t.def.type === 'timeslow') {
        // Time Stop burst
        if (t.stats.timeStop && Math.random() < 0.03 * dt * 60) {
          for (const e of this.enemies) {
            if (!e.alive) continue;
            const dx = e.x - t.x, dy = e.y - t.y;
            if (dx * dx + dy * dy <= range * range) {
              e.frozen = true;
              e.frozenTimer = 1.5;
            }
          }
          this.spawnParticles(t.x, t.y, '#ffffff', 20);
        }
        // Rewind
        if (t.stats.rewind && Math.random() < 0.02 * dt * 60) {
          for (const e of this.enemies) {
            if (!e.alive || e.type === 'boss') continue;
            const dx = e.x - t.x, dy = e.y - t.y;
            if (dx * dx + dy * dy <= range * range) {
              e.pathDist = Math.max(0, e.pathDist - 60);
            }
          }
          this.spawnParticles(t.x, t.y, '#aabbff', 12);
        }
      }

      // Find target (closest to end of path = highest pathDist)
      let target = null;
      let bestDist = -1;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        // Camo visibility check
        if (!this.canSeeCamo(t, e)) continue;
        const dx = e.x - t.x, dy = e.y - t.y;
        if (dx * dx + dy * dy <= range * range) {
          if (e.pathDist > bestDist) {
            bestDist = e.pathDist;
            target = e;
          }
        }
      }
      if (!target) continue;

      t.angle = Math.atan2(target.y - t.y, target.x - t.x);
      t.cooldown = 1 / fr;

      // Chain lightning (tesla)
      if (t.def.type === 'chain') {
        this.fireChain(t, target);
        continue;
      }

      // Normal projectile
      this.fireProjectile(t, target);
    }
  }

  // ── PROJECTILES ────────────────────────────────────────
  fireProjectile(tower, target) {
    const spd = tower.stats.projSpeed || tower.def.projSpeed;
    this.projectiles.push({
      x: tower.x, y: tower.y,
      vx: 0, vy: 0,
      speed: spd,
      target: target,        // homing: track the target
      damage: tower.stats.damage || tower.def.damage,
      color: tower.def.projColor,
      projSprite: tower.def.projSprite || null,
      tower: tower,
      splash: tower.stats.splash || tower.def.splash || 0,
      slow: tower.stats.slow || tower.def.slow || 0,
      slowDur: tower.stats.slowDur || tower.def.slowDur || 0,
      freezeChance: tower.stats.freezeChance || 0,
      pierce: tower.stats.pierce || 0,
      hit: new Set(),
      life: 4
    });
  }

  fireChain(tower, target) {
    const dmg = tower.stats.damage || tower.def.damage;
    const count = tower.stats.chainCount || tower.def.chainCount;
    const cRange = tower.stats.chainRange || tower.def.chainRange;
    const stun = tower.stats.stunChance || 0;

    let current = target;
    const hit = new Set();
    const chainPts = [{ x: tower.x, y: tower.y }];

    for (let c = 0; c < count; c++) {
      if (!current || !current.alive) break;
      hit.add(current);
      chainPts.push({ x: current.x, y: current.y });
      this.damageEnemy(current, dmg * (c === 0 ? 1 : 0.7), tower, true);
      if (stun > 0 && Math.random() < stun) {
        current.stunned = true;
        current.stunnedTimer = 0.8;
      }

      // Find next chain target
      let best = null;
      let bestD = cRange * cRange;
      for (const e of this.enemies) {
        if (!e.alive || hit.has(e)) continue;
        const dx = e.x - current.x, dy = e.y - current.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD) { bestD = d2; best = e; }
      }
      current = best;
    }

    // Lightning visual
    this.particles.push({
      type: 'chain', points: chainPts, color: tower.def.color, life: 0.25, maxLife: 0.25
    });
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;

      // Homing: steer toward target
      if (p.target && p.target.alive) {
        const dx = p.target.x - p.x;
        const dy = p.target.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          p.vx = (dx / dist) * p.speed;
          p.vy = (dy / dist) * p.speed;
        }
      }
      // If target is dead, keep current velocity and find nearest enemy
      if (p.target && !p.target.alive) {
        let nearest = null, bestD = Infinity;
        for (const e of this.enemies) {
          if (!e.alive || p.hit.has(e)) continue;
          const dx = e.x - p.x, dy = e.y - p.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < bestD) { bestD = d2; nearest = e; }
        }
        p.target = nearest;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Off screen or expired
      if (p.life <= 0 || p.x < -20 || p.x > CANVAS_W + 20 || p.y < -20 || p.y > CANVAS_H + 20) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Hit detection
      for (const e of this.enemies) {
        if (!e.alive || p.hit.has(e)) continue;
        const dx = e.x - p.x, dy = e.y - p.y;
        const hitDist = e.size + 5;
        if (dx * dx + dy * dy <= hitDist * hitDist) {
          p.hit.add(e);

          // Splash
          if (p.splash > 0) {
            for (const e2 of this.enemies) {
              if (!e2.alive) continue;
              const sx = e2.x - p.x, sy = e2.y - p.y;
              if (sx * sx + sy * sy <= p.splash * p.splash) {
                this.damageEnemy(e2, p.damage * (e2 === e ? 1 : 0.5), p.tower, true);
                if (p.slow > 0) { e2.slow = p.slow; e2.slowTimer = p.slowDur; }
              }
            }
            this.spawnParticles(p.x, p.y, p.color, 6);
            this.projectiles.splice(i, 1);
            break;
          } else {
            this.damageEnemy(e, p.damage, p.tower);
            if (p.slow > 0) { e.slow = p.slow; e.slowTimer = p.slowDur; }
            if (p.freezeChance > 0 && Math.random() < p.freezeChance) {
              e.frozen = true; e.frozenTimer = 1.2;
            }
            if (p.pierce > 0) {
              p.pierce--;
            } else {
              this.projectiles.splice(i, 1);
              break;
            }
          }
        }
      }
    }
  }

  // ── PARTICLES & FLOAT TEXT ─────────────────────────────
  spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 80;
      this.particles.push({
        type: 'dot',
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 0.4 + Math.random() * 0.4,
        maxLife: 0.8,
        size: 1.5 + Math.random() * 2
      });
    }
  }

  spawnFloatText(x, y, text, color) {
    this.floatTexts.push({ x, y, text, color, life: 1.0, maxLife: 1.0 });
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      if (p.type === 'dot') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.96;
        p.vy *= 0.96;
      }
    }
  }

  updateFloatTexts(dt) {
    for (let i = this.floatTexts.length - 1; i >= 0; i--) {
      const ft = this.floatTexts[i];
      ft.life -= dt;
      ft.y -= 30 * dt;
      if (ft.life <= 0) this.floatTexts.splice(i, 1);
    }
  }

  // ── RENDER ─────────────────────────────────────────────
  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    this.drawMap(ctx);
    this.drawTowers(ctx);
    this.drawEnemies(ctx);
    this.drawProjectiles(ctx);
    this.drawParticles(ctx);
    this.drawFloatTexts(ctx);
    this.drawHoverPreview(ctx);
  }

  drawMap(ctx) {
    // Background grass
    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 0.5;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath(); ctx.moveTo(c * TILE, 0); ctx.lineTo(c * TILE, CANVAS_H); ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * TILE); ctx.lineTo(CANVAS_W, r * TILE); ctx.stroke();
    }

    // Path
    ctx.strokeStyle = '#3a3028';
    ctx.lineWidth = TILE * 0.9;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(PATH[0].x, PATH[0].y);
    for (let i = 1; i < PATH.length; i++) {
      ctx.lineTo(PATH[i].x, PATH[i].y);
    }
    ctx.stroke();

    // Path center line
    ctx.strokeStyle = '#4a4038';
    ctx.lineWidth = TILE * 0.5;
    ctx.beginPath();
    ctx.moveTo(PATH[0].x, PATH[0].y);
    for (let i = 1; i < PATH.length; i++) {
      ctx.lineTo(PATH[i].x, PATH[i].y);
    }
    ctx.stroke();

    // Start/End markers
    ctx.fillStyle = '#44ff44';
    ctx.beginPath();
    ctx.arc(PATH[0].x, PATH[0].y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(PATH[PATH.length - 1].x, PATH[PATH.length - 1].y, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  drawTowers(ctx) {
    for (const t of this.towers) {
      // Range circle if selected
      if (t === this.selectedTower) {
        const rng = t.stats.range || t.def.range;
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(t.x, t.y, rng, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Tower rendering
      const baseSize = 14;
      const spriteKey = t.def.sprite;
      const sprite = spriteKey && SPRITES[spriteKey];
      // 60% bigger base, +8% per upgrade level
      const sizeScale = 1.6 + t.level * 0.08;
      const drawSize = TILE * sizeScale;

      if (sprite && sprite.complete && sprite.naturalWidth > 0) {
        ctx.save();
        ctx.translate(t.x, t.y);
        // Only rotate bolt/cannon (turret types), not stationary towers like frost/sniper
        if (t.type === 'bolt' || t.type === 'cannon') ctx.rotate(t.angle);
        ctx.drawImage(sprite, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
        ctx.restore();
      } else {
        // Fallback: colored rectangle with barrel
        const fb = baseSize * sizeScale / 1.6;
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(t.x - fb - 1, t.y - fb - 1, fb * 2 + 2, fb * 2 + 2);
        ctx.fillStyle = t.def.color;
        ctx.fillRect(t.x - fb, t.y - fb, fb * 2, fb * 2);

        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(t.x - fb * 0.57, t.y - fb * 0.57, fb * 1.14, fb * 1.14);
        ctx.fillStyle = t.def.color;
        ctx.fillRect(t.x - fb * 0.43, t.y - fb * 0.43, fb * 0.86, fb * 0.86);

        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate(t.angle);
        ctx.fillStyle = '#ddd';
        ctx.fillRect(fb * 0.3, -2, fb, 4);
        ctx.restore();
      }

      // Upgrade glow ring (per level)
      if (t.level > 0) {
        const glowColors = ['#44ff88', '#44ccff', '#ffaa00'];
        const gc = glowColors[Math.min(t.level - 1, 2)];
        const ringR = drawSize / 2 + 3;
        ctx.save();
        ctx.shadowColor = gc;
        ctx.shadowBlur = 6 + t.level * 3;
        ctx.strokeStyle = gc;
        ctx.lineWidth = 1 + t.level * 0.5;
        ctx.globalAlpha = 0.5 + t.level * 0.1;
        ctx.beginPath();
        ctx.arc(t.x, t.y, ringR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        ctx.globalAlpha = 1;
      }

      // Level stars
      for (let l = 0; l < t.level; l++) {
        const starX = t.x - (t.level - 1) * 5 + l * 10;
        const starY = t.y + drawSize / 2 + 6;
        ctx.fillStyle = l === 2 ? '#ffaa00' : l === 1 ? '#44ccff' : '#44ff88';
        ctx.beginPath();
        ctx.arc(starX, starY, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Ascended glow
      if (t.def.ascended) {
        const aR = drawSize / 2 + 5;
        ctx.save();
        ctx.shadowColor = t.def.color;
        ctx.shadowBlur = 18;
        ctx.strokeStyle = t.def.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(t.x, t.y, aR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Radar pulse ring
      if (t.def.camoReveal) {
        const rng = t.stats.range || t.def.range;
        const pulse = (Date.now() % 2000) / 2000;  // 0-1 every 2s
        ctx.save();
        ctx.strokeStyle = `rgba(85,255,153,${0.3 * (1 - pulse)})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(t.x, t.y, rng * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        // Static outer ring
        ctx.strokeStyle = 'rgba(85,255,153,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(t.x, t.y, rng, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Void Warden pull ring
      if (t.def.type === 'aoe') {
        const rng = t.stats.range || t.def.range;
        ctx.strokeStyle = `rgba(153,51,255,${0.1 + Math.sin(Date.now() / 300) * 0.08})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(t.x, t.y, rng, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Chrono field
      if (t.def.type === 'timeslow') {
        const rng = t.stats.range || t.def.range;
        ctx.strokeStyle = `rgba(200,220,255,${0.08 + Math.sin(Date.now() / 500) * 0.05})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(t.x, t.y, rng, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  drawEnemies(ctx) {
    for (const e of this.enemies) {
      if (!e.alive) continue;

      // Frozen overlay
      if (e.frozen) {
        ctx.fillStyle = 'rgba(100,200,255,0.3)';
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size + 4, 0, Math.PI * 2);
        ctx.fill();
      }
      // Stunned indicator
      if (e.stunned) {
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size + 5, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Enemy body
      // Camo: semi-transparent with dashed outline
      if (e.camo && !e.revealed) {
        ctx.globalAlpha = 0.3;
      } else if (e.camo && e.revealed) {
        ctx.globalAlpha = 0.7;
      }
      // Phantom: translucent with phase glow
      if (e.phase) {
        ctx.globalAlpha = 0.4 + 0.15 * Math.sin(Date.now() * 0.005);
        ctx.shadowColor = '#88ffff';
        ctx.shadowBlur = 12;
      }

      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
      ctx.fill();

      // Reset phantom glow
      if (e.phase) {
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }

      // Camo indicator: dashed ring
      if (e.camo) {
        ctx.strokeStyle = e.revealed ? '#aaff44' : '#335533';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size + 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }

      // Armor ring
      if (e.armor > 0) {
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size + 2, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Shield bar (above health bar, blue)
      const bw = e.size * 2 + 4;
      const bx = e.x - bw / 2;
      if (e.shieldMax > 0) {
        const sby = e.y - e.size - 12;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(bx, sby, bw, 3);
        const sRatio = Math.max(0, e.shield / e.shieldMax);
        ctx.fillStyle = '#44aaff';
        ctx.fillRect(bx, sby, bw * sRatio, 3);
      }

      // Health bar
      if (e.hp < e.maxHp) {
        const by = e.y - e.size - 8;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(bx, by, bw, 4);
        const ratio = e.hp / e.maxHp;
        ctx.fillStyle = ratio > 0.5 ? '#44ff44' : ratio > 0.25 ? '#ffcc00' : '#ff4444';
        ctx.fillRect(bx, by, bw * ratio, 4);
      }

      // Boss label
      if (e.type === 'boss') {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('BOSS', e.x, e.y + e.size + 12);
      }

      // Splitter icon (small "x3" below enemy)
      if (e.splits > 0) {
        ctx.fillStyle = '#ff8800';
        ctx.font = 'bold 7px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('x' + e.splits, e.x, e.y + e.size + 10);
      }

      // Slow visual
      if (e.slow < 1) {
        ctx.fillStyle = 'rgba(0,200,255,0.4)';
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawProjectiles(ctx) {
    for (const p of this.projectiles) {
      const spr = p.projSprite && SPRITES[p.projSprite];
      if (spr && spr.complete && spr.naturalWidth > 0) {
        const size = 16;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(p.vy, p.vx));
        ctx.drawImage(spr, -size / 2, -size / 2, size, size);
        ctx.restore();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawParticles(ctx) {
    for (const p of this.particles) {
      if (p.type === 'chain') {
        const alpha = p.life / p.maxLife;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2 * alpha;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        for (let i = 0; i < p.points.length; i++) {
          const pt = p.points[i];
          // Add jitter for lightning effect
          const jx = (i > 0 && i < p.points.length - 1) ? (Math.random() - 0.5) * 6 : 0;
          const jy = (i > 0 && i < p.points.length - 1) ? (Math.random() - 0.5) * 6 : 0;
          if (i === 0) ctx.moveTo(pt.x + jx, pt.y + jy);
          else ctx.lineTo(pt.x + jx, pt.y + jy);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }

  drawFloatTexts(ctx) {
    for (const ft of this.floatTexts) {
      const alpha = ft.life / ft.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.globalAlpha = 1;
    }
  }

  drawHoverPreview(ctx) {
    if (!this.selectedType || this.hoverGX < 0) return;
    const gx = this.hoverGX, gy = this.hoverGY;
    const canPlace = gx >= 0 && gx < COLS && gy >= 0 && gy < ROWS && this.grid[gy][gx] === 0;
    const allDefs = { ...TOWERS, ...ASCENDED };
    const def = allDefs[this.selectedType];
    if (!def) return;

    const px = gx * TILE + TILE / 2;
    const py = gy * TILE + TILE / 2;

    // Range preview
    ctx.strokeStyle = canPlace ? 'rgba(100,255,100,0.2)' : 'rgba(255,100,100,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px, py, def.range, 0, Math.PI * 2);
    ctx.stroke();

    // Ghost tower (60% bigger)
    ctx.globalAlpha = 0.5;
    const ghostSize = TILE * 1.6;
    const spriteKey = def.sprite;
    const sprite = spriteKey && SPRITES[spriteKey];
    if (canPlace && sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.drawImage(sprite, px - ghostSize / 2, py - ghostSize / 2, ghostSize, ghostSize);
    } else {
      ctx.fillStyle = canPlace ? def.color : '#ff0000';
      const hs = ghostSize / 2;
      ctx.fillRect(px - hs, py - hs, ghostSize, ghostSize);
    }
    ctx.globalAlpha = 1;

    // Grid highlight
    ctx.strokeStyle = canPlace ? 'rgba(100,255,100,0.5)' : 'rgba(255,100,100,0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(gx * TILE, gy * TILE, TILE, TILE);
  }

  // ── INPUT ──────────────────────────────────────────────
  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    this.hoverGX = Math.floor(mx / TILE);
    this.hoverGY = Math.floor(my / TILE);
  }

  onClick(e) {
    if (this.state !== 'playing') return;
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    const gx = Math.floor(mx / TILE);
    const gy = Math.floor(my / TILE);

    // Placing tower
    if (this.selectedType) {
      if (this.placeTower(gx, gy)) {
        // Keep type selected for rapid placement
        const allDefs = { ...TOWERS, ...ASCENDED };
        const def = allDefs[this.selectedType];
        if (def && (def.cost > this.gold || (def.ascended && this.hasAscended))) {
          this.selectedType = null;
          this.updateTowerButtons();
        }
      }
      return;
    }

    // Clicking on existing tower
    const clicked = this.towers.find(t => t.gx === gx && t.gy === gy);
    if (clicked) {
      this.selectedTower = clicked;
      this.showTowerInfo(clicked);
    } else {
      this.selectedTower = null;
      this.hideTowerInfo();
    }
  }

  // ── HUD & UI ───────────────────────────────────────────
  updateHUD() {
    document.getElementById('hudWave').textContent = this.wave;
    document.getElementById('hudTotalWaves').textContent = TOTAL_WAVES;
    document.getElementById('hudGold').textContent = this.gold;
    document.getElementById('hudLives').textContent = this.lives;
    document.getElementById('hudScore').textContent = this.score;
  }

  updateTowerButtons() {
    document.querySelectorAll('.tower-btn').forEach(btn => {
      const key = btn.dataset.tower;
      const allDefs = { ...TOWERS, ...ASCENDED };
      const def = allDefs[key];
      if (!def) return;

      btn.classList.toggle('selected', this.selectedType === key);
      btn.classList.toggle('disabled', def.cost > this.gold);

      if (def.ascended) {
        btn.classList.toggle('locked', this.hasAscended);
      }
    });
  }

  showTowerInfo(tower) {
    const el = document.getElementById('towerInfo');
    el.classList.remove('hidden');
    document.getElementById('infoIcon').style.background = tower.def.color;
    document.getElementById('infoName').textContent = tower.def.name;
    document.getElementById('infoLevel').textContent = `Lv ${tower.level + 1}`;
    document.getElementById('infoDmg').textContent = tower.stats.damage || tower.def.damage;
    document.getElementById('infoRange').textContent = tower.stats.range || tower.def.range;
    document.getElementById('infoSpeed').textContent = (tower.stats.fireRate || tower.def.fireRate).toFixed(1) + '/s';

    const upgradeBtn = document.getElementById('btnUpgrade');
    if (tower.level < tower.def.upgrades.length) {
      const upg = tower.def.upgrades[tower.level];
      upgradeBtn.disabled = upg.cost > this.gold;
      document.getElementById('upgradeCost').textContent = upg.cost;
      upgradeBtn.title = upg.desc;
      upgradeBtn.style.display = '';
    } else {
      upgradeBtn.style.display = 'none';
    }

    const ratio = tower.def.ascended ? ASCENDED_SELL_RATIO : SELL_RATIO;
    document.getElementById('sellValue').textContent = Math.round(tower.totalCost * ratio);
  }

  hideTowerInfo() {
    document.getElementById('towerInfo').classList.add('hidden');
  }

  togglePause() {
    this.paused = !this.paused;
    document.getElementById('btnPause').textContent = this.paused ? '>' : 'II';
  }

  toggleSpeed() {
    const speeds = [1, 2, 3];
    const idx = speeds.indexOf(this.gameSpeed);
    this.gameSpeed = speeds[(idx + 1) % speeds.length];
    document.getElementById('btnSpeed').textContent = this.gameSpeed + 'x';
  }

  // ── GAME END ───────────────────────────────────────────
  gameOver() {
    this.state = 'gameover';
    document.getElementById('gameOverTitle').textContent = 'GAME OVER';
    document.getElementById('gameOverTitle').className = '';
    document.getElementById('goWave').textContent = this.wave;
    document.getElementById('goScore').textContent = this.score;
    document.getElementById('goTowers').textContent = this.towersBuilt;
    this.showScreen('gameOverScreen');
  }

  victory() {
    this.state = 'gameover';
    document.getElementById('gameOverTitle').textContent = 'VICTORY!';
    document.getElementById('gameOverTitle').className = 'victory';
    document.getElementById('goWave').textContent = this.wave;
    document.getElementById('goScore').textContent = this.score;
    document.getElementById('goTowers').textContent = this.towersBuilt;
    this.showScreen('gameOverScreen');
  }

  // ── MULTIPLAYER (Socket.IO) ─────────────────────────────
  connectSocket() {
    if (this.socket) return;
    const host = window.location.hostname === 'localhost'
      ? 'http://localhost:3001'
      : 'https://www.zecrugames.com';
    this.socket = io(host, { transports: ['websocket', 'polling'] });

    this.socket.on('td:roomCreated', (data) => {
      this.roomCode = data.code;
      this.isHost = true;
      this.updateLobbyUI(data.players);
      document.getElementById('btnStartGame').classList.remove('hidden');
    });

    this.socket.on('td:roomJoined', (data) => {
      this.roomCode = data.code;
      this.isHost = (data.host === this.socket.id);
      this.updateLobbyUI(data.players);
      if (this.isHost) document.getElementById('btnStartGame').classList.remove('hidden');
      else document.getElementById('btnStartGame').classList.add('hidden');
    });

    this.socket.on('td:roomUpdate', (data) => {
      this.isHost = (data.host === this.socket.id);
      this.updateLobbyUI(data.players);
      if (this.isHost) document.getElementById('btnStartGame').classList.remove('hidden');
    });

    this.socket.on('td:gameStart', (data) => {
      this.playerCount = data.players.length;
      this.startGame(true);
    });

    this.socket.on('td:error', (data) => {
      alert(data.msg);
    });

    // In-game sync
    this.socket.on('td:towerPlaced', (data) => {
      this.placeTowerRemote(data.gx, data.gy, data.type);
    });
    this.socket.on('td:towerSold', (data) => {
      const t = this.towers.find(tw => tw.gx === data.gx && tw.gy === data.gy);
      if (t) {
        this.grid[t.gy][t.gx] = 0;
        if (t.def.ascended) this.hasAscended = false;
        this.towers = this.towers.filter(tw => tw !== t);
      }
    });
    this.socket.on('td:towerUpgraded', (data) => {
      const t = this.towers.find(tw => tw.gx === data.gx && tw.gy === data.gy);
      if (t && t.level < t.def.upgrades.length) {
        const upg = t.def.upgrades[t.level];
        t.level++;
        for (const [k, v] of Object.entries(upg)) {
          if (k !== 'cost' && k !== 'desc') t.stats[k] = v;
        }
      }
    });
    this.socket.on('td:waveStart', () => {
      if (!this.waveActive && this.wave < TOTAL_WAVES) {
        this.startNextWave(true);
      }
    });
    this.socket.on('td:goldReceived', (data) => {
      this.gold += data.amount;
      this.spawnFloatText(CANVAS_W / 2, CANVAS_H / 2, `+${data.amount}g from ally!`, '#44ff88');
      this.updateTowerButtons();
    });
  }

  updateLobbyUI(players) {
    document.getElementById('lobbyRoomCode').textContent = this.roomCode;
    document.getElementById('lobbyPlayerCount').textContent = players.length;
    document.getElementById('lobbyInfo').classList.remove('hidden');
    const list = document.getElementById('lobbyPlayerList');
    list.innerHTML = '';
    players.forEach((p, i) => {
      const div = document.createElement('div');
      div.className = 'player-item';
      div.textContent = p.name + (i === 0 ? ' (Host)' : '');
      list.appendChild(div);
    });
  }

  createRoom() {
    this.connectSocket();
    const userData = localStorage.getItem('user_data');
    let name = 'Player';
    try { name = JSON.parse(userData).username || name; } catch(e) {}
    this.socket.emit('td:createRoom', { name });
  }

  joinRoom() {
    const code = document.getElementById('roomCodeInput').value.trim().toUpperCase();
    if (code.length < 4) return;
    this.connectSocket();
    const userData = localStorage.getItem('user_data');
    let name = 'Player';
    try { name = JSON.parse(userData).username || name; } catch(e) {}
    this.socket.emit('td:joinRoom', { code, name });
  }

  // Place a tower from a remote player (no gold deduction)
  placeTowerRemote(gx, gy, type) {
    const allDefs = { ...TOWERS, ...ASCENDED };
    const def = allDefs[type];
    if (!def) return;
    if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) return;
    if (this.grid[gy][gx] !== 0) return;
    this.grid[gy][gx] = 2;
    this.towers.push({
      id: Date.now() + Math.random(),
      type, def, gx, gy,
      x: gx * TILE + TILE / 2,
      y: gy * TILE + TILE / 2,
      level: 0, cooldown: 0, angle: 0,
      totalCost: def.cost,
      stats: { ...def },
      remote: true
    });
    if (def.ascended) this.hasAscended = true;
    this.spawnParticles(gx * TILE + TILE / 2, gy * TILE + TILE / 2, def.color, 8);
  }

  // ── CANVAS RESIZE ──────────────────────────────────────
  resize() {
    const panel = 190;
    const hud = 44;
    const maxW = window.innerWidth - panel;
    const maxH = window.innerHeight - hud;
    const scale = Math.min(maxW / CANVAS_W, maxH / CANVAS_H);
    this.canvas.style.width = (CANVAS_W * scale) + 'px';
    this.canvas.style.height = (CANVAS_H * scale) + 'px';
  }
}

// ── INIT ───────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const game = new ZecruTD();
  game.resize();
  window.addEventListener('resize', () => game.resize());
});

})();
