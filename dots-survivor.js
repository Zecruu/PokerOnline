// Dots Survivor - Complete Game with Classes, Items, Bosses & Infinite Map

// Boss name generators
const BOSS_PREFIXES = ['Dark', 'Doom', 'Blood', 'Shadow', 'Chaos', 'Death', 'Void', 'Dread', 'Grim', 'Infernal'];
const BOSS_NAMES = ['Destroyer', 'Eater', 'Bringer', 'Lord', 'King', 'Master', 'Titan', 'Overlord', 'Reaper', 'Slayer'];
const BOSS_SUFFIXES = ['of Pain', 'of Souls', 'the Cruel', 'the Mighty', 'Supreme', 'Eternal', 'Unstoppable', 'the Devourer'];

// Class definitions
// Basic class (no selection)
const SURVIVOR_CLASS = {
    name: 'Survivor',
    icon: '👤',
    color: '#00ccff',
    desc: 'The last hope.',
    bonuses: { bulletCount: 0, fireRate: 1, damage: 1 },
    upgrades: [
        // Consolidated upgrades from all classes (removed barrage - duplicate of multishot)
        { id: 'rapidfire', name: 'Machine Gun', icon: '💥', desc: '+15% fire rate', rarity: 'epic', effect: (g) => g.weapons.bullet.fireRate = Math.floor(g.weapons.bullet.fireRate * 0.85), getDesc: (g) => `Fire Rate: ${(1000 / g.weapons.bullet.fireRate).toFixed(1)}/s → ${(1000 / (g.weapons.bullet.fireRate * 0.85)).toFixed(1)}/s` },
        { id: 'orbital', name: 'Arcane Orbital', icon: '🌀', desc: '+1 orbiting spell', rarity: 'rare', effect: (g) => g.orbitals.push(g.createOrbital()), getDesc: (g) => `Orbitals: ${g.orbitals.length} → ${g.orbitals.length + 1}` },
        { id: 'guard', name: 'Summon Guard', icon: '🛡️', desc: '+1 guard minion', rarity: 'rare', effect: (g) => g.addMinion('guard'), getDesc: (g) => `Minions: ${g.minions.length}/${g.maxMinions || 5}` },
    ]
};

// Diamond Augments (All combined)
const DIAMOND_AUGMENTS = [
    // Soldier Path
    { id: 'tactical_nuke', name: 'Tactical Nuke', icon: '☢️', desc: 'Every 5th shot fires a nuke dealing 500% damage in a huge area', effect: (g) => g.augments.push('tactical_nuke'), getDesc: (g) => g.augments.includes('tactical_nuke') ? 'Active ✓' : 'Not Active' },
    // Nerfed per user request: only ~10% faster fire rate instead of 100%
    { id: 'overclock', name: 'Overclock', icon: '⚙️', desc: 'Fire rate +10%, but accuracy decreases slightly', effect: (g) => { g.weapons.bullet.fireRate *= 0.9; g.spread = (g.spread || 0) + 0.2; }, getDesc: (g) => `Fire Rate: ${(1000 / g.weapons.bullet.fireRate).toFixed(1)}/s → ${(1000 / (g.weapons.bullet.fireRate * 0.9)).toFixed(1)}/s` },
    { id: 'bullet_storm', name: 'Bullet Storm', icon: '🌧️', desc: 'Bullets split into 3 smaller bullets on impact', effect: (g) => g.augments.push('bullet_storm'), getDesc: (g) => g.augments.includes('bullet_storm') ? 'Active ✓' : 'Not Active' },
    { id: 'titan_killer', name: 'Titan Killer', icon: '🎯', desc: 'Deal +15% damage to Bosses and Tanks (+5% per stack)', effect: (g) => { if (!g.augments.includes('titan_killer')) g.augments.push('titan_killer'); g.titanKillerBonus = (g.titanKillerBonus || 0) + (g.titanKillerBonus ? 0.05 : 0.15); }, getDesc: (g) => `Boss/Tank Dmg: +${Math.round((g.titanKillerBonus || 0) * 100)}% → +${Math.round(((g.titanKillerBonus || 0) + (g.titanKillerBonus ? 0.05 : 0.15)) * 100)}%` },
    // Mage Path
    { id: 'black_hole', name: 'Black Hole', icon: '⚫', desc: 'Orbitals have a chance to pull enemies in and crush them', effect: (g) => g.augments.push('black_hole'), getDesc: (g) => g.augments.includes('black_hole') ? 'Active ✓' : 'Not Active' },
    { id: 'time_stop', name: 'Chrono Field', icon: '⏳', desc: 'Periodically freeze all enemies for 3 seconds', effect: (g) => g.augments.push('time_stop'), getDesc: (g) => g.augments.includes('time_stop') ? 'Active ✓' : 'Not Active' },
    { id: 'elemental_mastery', name: 'Elemental Mastery', icon: '🌈', desc: 'Orbitals cycle between Fire, Ice, and Lightning effects', effect: (g) => g.augments.push('elemental_mastery'), getDesc: (g) => g.augments.includes('elemental_mastery') ? 'Active ✓' : 'Not Active' },
    { id: 'unlimited_power', name: 'Unlimited Power', icon: '⚡', desc: 'Cooldowns reduced by 50%, Orbitals spin 2x faster', effect: (g) => g.orbitals.forEach(o => o.speed *= 2), getDesc: (g) => `Orbitals: ${g.orbitals.length} (2x speed)` },
    // Dotomancer Path
    { id: 'army_of_dead', name: 'Army of the Dead', icon: '🧟', desc: 'Max minions +5, conversion chance +10%', effect: (g) => { g.maxMinions = (g.maxMinions || 0) + 5; g.conversionChance += 0.1; }, getDesc: (g) => `Max Minions: ${g.maxMinions || 0} → ${(g.maxMinions || 0) + 5}, Convert: ${Math.round((g.conversionChance || 0) * 100)}% → ${Math.round(((g.conversionChance || 0) + 0.1) * 100)}%` },
    { id: 'soul_explosion', name: 'Soul Explosion', icon: '💥', desc: 'Minions explode on death dealing 500 damage', effect: (g) => g.augments.push('soul_explosion'), getDesc: (g) => g.augments.includes('soul_explosion') ? 'Active ✓' : 'Not Active' },
    { id: 'lich_king', name: 'Lich King', icon: '👑', desc: 'You gain +10% damage for every active minion', effect: (g) => g.augments.push('lich_king'), getDesc: (g) => `Minions: ${g.minions?.length || 0} (+${(g.minions?.length || 0) * 10}% dmg)` },
    // New Hybrid Paths
    { id: 'tech_wizard', name: 'Tech Wizard', icon: '🔮', desc: 'Projectiles spawn Orbitals on hit (10% chance)', effect: (g) => g.augments.push('tech_wizard'), getDesc: (g) => g.augments.includes('tech_wizard') ? 'Active ✓' : 'Not Active' },
    // Demon Set Augments
    { id: 'imp_horde', name: 'Imp Horde', icon: '👿', desc: 'Max Imps +5', req: 'demonSet', effect: (g) => g.impStats.maxImps += 5, getDesc: (g) => `Max Imps: ${g.impStats?.maxImps || 0} → ${(g.impStats?.maxImps || 0) + 5}` },
    { id: 'hellfire_fury', name: 'Hellfire Fury', icon: '🔥', desc: 'Imp Damage +100%', req: 'demonSet', effect: (g) => g.impStats.damage *= 2, getDesc: (g) => `Imp Dmg: ${g.impStats?.damage || 0} → ${(g.impStats?.damage || 0) * 2}` },
    { id: 'eternal_flame', name: 'Eternal Flame', icon: '🕯️', desc: 'Imp Burn Duration +5s', req: 'demonSet', effect: (g) => g.impStats.burnDuration += 5, getDesc: (g) => `Burn: ${g.impStats?.burnDuration || 0}s → ${(g.impStats?.burnDuration || 0) + 5}s` },
    // Aura augment
    { id: 'aura_fire', name: 'Aura Fire Circle', icon: '🔥', desc: 'Thin burning ring - enemies take burn damage. Upgrades with kills.', effect: (g) => { g.augments.push('aura_fire'); g.auraFire = { radius: 80, damage: 25, burnDuration: 3, kills: 0, level: 1 }; }, getDesc: (g) => g.auraFire ? `Lvl ${g.auraFire.level}: ${g.auraFire.damage} dmg/s (${g.auraFire.kills}/50 kills)` : 'Not Active' }
];

// STACKING ITEMS SYSTEM - Items drop once and stack with kills/damage
const STACKING_ITEMS = {
    // Each item has: base effect, stack scaling, max stacks, evolution
    // stackType: 'kill' = stacks on kills (2k to evolve), 'damage' = stacks on damage dealt (50k to evolve)
    bloodBlade: {
        name: 'Blood Blade',
        icon: '🗡️',
        desc: 'Deal +0.025% damage per stack. Stacks on damage dealt.',
        evolvedName: 'Crimson Reaper',
        evolvedIcon: '⚔️',
        evolvedDesc: 'Deal +50% damage, crits heal you',
        maxStacks: 50000,
        stackType: 'damage',
        effect: (g, stacks) => { g.stackingDamageBonus = stacks * 0.00001; },
        evolvedEffect: (g) => { g.stackingDamageBonus = 0.5; g.critHeals = true; }
    },
    soulGem: {
        name: 'Soul Gem',
        icon: '💎',
        desc: '+0.05% XP gain per stack. Stacks on kills.',
        evolvedName: 'Soul Devourer',
        evolvedIcon: '🔮',
        evolvedDesc: '+100% XP, enemies drop double XP orbs',
        maxStacks: 2000,
        stackType: 'kill',
        effect: (g, stacks) => { g.stackingXpBonus = stacks * 0.0005; },
        evolvedEffect: (g) => { g.stackingXpBonus = 1.0; g.doubleXpOrbs = true; }
    },
    ironHeart: {
        name: 'Iron Heart',
        icon: '🫀',
        desc: '+0.05 max HP per stack. Stacks on kills.',
        evolvedName: 'Titan Heart',
        evolvedIcon: '💖',
        evolvedDesc: '+100 max HP, regen 2 HP/s',
        maxStacks: 2000,
        stackType: 'kill',
        effect: (g, stacks) => { g.stackingHpBonus = stacks * 0.05; },
        evolvedEffect: (g) => { g.stackingHpBonus = 100; g.stackingRegen = 2; }
    },
    swiftBoots: {
        name: 'Swift Boots',
        icon: '👟',
        desc: '+0.025 speed per stack. Stacks on kills.',
        evolvedName: 'Phantom Stride',
        evolvedIcon: '💨',
        evolvedDesc: '+50 speed, dash through enemies',
        maxStacks: 2000,
        stackType: 'kill',
        effect: (g, stacks) => { g.stackingSpeedBonus = stacks * 0.025; },
        evolvedEffect: (g) => { g.stackingSpeedBonus = 50; g.dashThroughEnemies = true; }
    },
    huntersMark: {
        name: "Hunter's Mark",
        icon: '🎯',
        desc: '+0.0125% crit chance per stack. Stacks on damage dealt.',
        evolvedName: 'Death Mark',
        evolvedIcon: '💀',
        evolvedDesc: '+25% crit, crits deal 3x damage',
        maxStacks: 50000,
        stackType: 'damage',
        effect: (g, stacks) => { g.stackingCritBonus = stacks * 0.000005; },
        evolvedEffect: (g) => { g.stackingCritBonus = 0.25; g.weapons.bullet.critMultiplier = 3; }
    },
    frostShard: {
        name: 'Frost Shard',
        icon: '❄️',
        desc: '+0.025% freeze chance per stack. Stacks on kills.',
        evolvedName: 'Eternal Winter',
        evolvedIcon: '🥶',
        evolvedDesc: '50% freeze, frozen enemies shatter',
        maxStacks: 2000,
        stackType: 'kill',
        effect: (g, stacks) => { g.stackingFreezeChance = stacks * 0.00025; },
        evolvedEffect: (g) => { g.stackingFreezeChance = 0.5; g.shatterFrozen = true; }
    },
    venomFang: {
        name: 'Venom Fang',
        icon: '🐍',
        desc: 'Poison on hit. +0.015 dps per stack. Stacks on damage dealt.',
        evolvedName: 'Plague Bearer',
        evolvedIcon: '☠️',
        evolvedDesc: 'Poison spreads to nearby enemies',
        maxStacks: 50000,
        stackType: 'damage',
        effect: (g, stacks) => { g.stackingPoisonDps = stacks * 0.0006; },
        evolvedEffect: (g) => { g.stackingPoisonDps = 30; g.poisonSpreads = true; }
    },
    magnetCore: {
        name: 'Magnet Core',
        icon: '🧲',
        desc: '+0.1 pickup range per stack. Stacks on kills.',
        evolvedName: 'Gravity Well',
        evolvedIcon: '🌀',
        evolvedDesc: 'Massive pickup range, pulls enemies slightly',
        maxStacks: 2000,
        stackType: 'kill',
        effect: (g, stacks) => { g.stackingMagnetBonus = stacks * 0.1; },
        evolvedEffect: (g) => { g.stackingMagnetBonus = 200; g.pullsEnemies = true; }
    }
};

// Legacy ITEMS for backward compatibility (redirects to stacking system)
const ITEMS = STACKING_ITEMS;

// Build Set Bonuses - activated when all 3 pieces are collected
const BUILD_SETS = {
    warrior: {
        name: 'Warrior Set',
        pieces: ['warriorHelm', 'warriorChest', 'warriorBoots'],
        color: '#ff4444',
        bonus: '+50% damage, attacks cause explosions',
        effect: (g) => {
            g.damageMultiplier = (g.damageMultiplier || 1) * 1.5;
            g.bulletExplosion = true;
            g.explosionRadius = Math.max(g.explosionRadius || 0, 50);
        }
    },
    mage: {
        name: 'Mage Set',
        pieces: ['mageHat', 'mageRobe', 'mageStaff'],
        color: '#4488ff',
        bonus: '+3 Orbitals, orbitals deal 2x damage',
        effect: (g) => {
            for (let i = 0; i < 3; i++) g.orbitals.push(g.createOrbital());
            g.orbitals.forEach(o => o.damage *= 2);
        }
    },
    hunter: {
        name: 'Hunter Set',
        pieces: ['hunterHood', 'hunterCloak', 'hunterBow'],
        color: '#44ff44',
        bonus: 'Crits deal 3x damage, +2 projectiles',
        effect: (g) => {
            g.weapons.bullet.critMultiplier = 3;
            g.weapons.bullet.count += 2;
        }
    },
    necro: {
        name: 'Necro Set',
        pieces: ['necroSkull', 'necroRobe', 'necroScythe'],
        color: '#aa44ff',
        bonus: 'Killed enemies explode, +3 minions',
        effect: (g) => {
            g.necroExplosion = true;
            for (let i = 0; i < 3; i++) g.addMinion('guard');
        }
    }
};

// Game balance settings (balanced around medium difficulty)
const GAME_SETTINGS = {
    enemyHealthMult: 0.5,        // Much lower base health for easy waves 1-9
        enemyDamageMult: 1.0,
        enemySpeedMult: 1.0,
        spawnRateMult: 1.0,
    scalingPerWave: 0.08,        // Very low scaling for waves 1-9 (easy early game)
    scalingPerWaveLate: 0.55,    // Heavy scaling after wave 10 (difficulty ramps up)
    lateGameWave: 10,            // When late game scaling kicks in
        playerHealthMult: 1.0,
        xpMult: 1.0
};

// Legendary Perks (from control points)
const LEGENDARY_PERKS = [
    { id: 'vampiric', name: 'Vampiric Touch', icon: '🧛', desc: 'Heal 2 HP per enemy killed' },
    { id: 'doubleshot', name: 'Double Trouble', icon: '👯', desc: 'Fire 2x projectiles' },
    { id: 'nuclear', name: 'Nuclear Core', icon: '☢️', desc: '+50% damage, enemies explode on death' },
    { id: 'timewarp', name: 'Time Warp', icon: '⏰', desc: 'Enemies move 30% slower' },
    { id: 'goldenheart', name: 'Golden Heart', icon: '💛', desc: '+100 max HP, +3 HP regen/s' },
    { id: 'berserk', name: 'Berserker', icon: '😤', desc: '+100% damage when below 30% HP' },
    { id: 'guardian', name: 'Guardian Angel', icon: '👼', desc: 'Revive once with 50% HP' },
    { id: 'inferno', name: 'Inferno Aura', icon: '🔥', desc: 'Burn nearby enemies for 5 DPS' },
    { id: 'frozen', name: 'Frozen Heart', icon: '❄️', desc: 'Chance to freeze enemies on hit' }
];

const DEMON_SET_PIECES = [
    { id: 'helm', name: 'Demon Helm', icon: '👹', desc: '+500 Max HP' },
    { id: 'chest', name: 'Demon Plate', icon: '🛡️', desc: '+20% Damage Reduction' },
    { id: 'boots', name: 'Demon Greaves', icon: '👢', desc: '+50 Move Speed' }
];

class DotsSurvivor {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.gameRunning = false;
        this.gamePaused = false;
        this.gameTime = 0;
        this.lastTime = 0;
        this.wave = 1;
        this.waveTimer = 0;
        this.waveDuration = 30000;

        // World offset - bounded map (no more infinite kiting!)
        this.worldX = 0;
        this.worldY = 0;
        this.mapSize = 2000; // Medium map: 2000x2000 units (-1000 to +1000 in each direction)
        this.mapBounds = {
            minX: -this.mapSize / 2,
            maxX: this.mapSize / 2,
            minY: -this.mapSize / 2,
            maxY: this.mapSize / 2
        };

        // Class
        this.selectedClass = null;

        // Player
        this.player = { x: 0, y: 0, radius: 15, speed: 220, maxHealth: 100, health: 100, xp: 0, xpToLevel: 50, level: 1, kills: 0, invincibleTime: 0, color: '#00ffaa' };

        // Combat
        this.projectiles = [];
        this.weapons = { bullet: { damage: 15, speed: 450, fireRate: 450, lastFired: 0, count: 1, size: 6, pierce: 1, color: '#00ffaa' } };
        this.orbitals = [];
        this.minions = [];

        // Enemies
        this.enemies = [];
        this.enemySpawnRate = 1200;
        this.lastEnemySpawn = 0;

        // Pickups & Items
        this.pickups = [];
        this.magnetRadius = 100;
        this.xpMultiplier = 1;
        this.items = {};
        this.shieldActive = false;
        this.shieldCooldown = 60;
        this.shieldTimer = 0;

        // Effects
        this.particles = [];
        this.damageNumbers = [];

        // Controls
        this.keys = {};
        this.joystick = { active: false, startX: 0, startY: 0, dx: 0, dy: 0 };
        this.isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

        // Base upgrades with descriptions
        this.baseUpgrades = [
            { id: 'speed', name: 'Swift Feet', icon: '👟', desc: 'Move 30 units faster', rarity: 'common', effect: (g) => g.player.speed += 30, getDesc: (g) => `Speed: ${g.player.speed} → ${g.player.speed + 30}` },
            { id: 'health', name: 'Vitality', icon: '❤️', desc: 'Increases max HP by 30', rarity: 'common', effect: (g) => { g.player.maxHealth += 30; g.player.health += 30; }, getDesc: (g) => `Max HP: ${g.player.maxHealth} → ${g.player.maxHealth + 30}` },
            { id: 'damage', name: 'Power Shot', icon: '💥', desc: 'Projectiles deal +5 damage', rarity: 'common', effect: (g) => g.weapons.bullet.damage += 5, getDesc: (g) => `Damage: ${g.weapons.bullet.damage} → ${g.weapons.bullet.damage + 5}` },
            { id: 'firerate', name: 'Rapid Fire', icon: '🔫', desc: 'Shoot 10% faster', rarity: 'rare', effect: (g) => g.weapons.bullet.fireRate = Math.floor(g.weapons.bullet.fireRate * 0.9), getDesc: (g) => `Fire Rate: ${(1000 / g.weapons.bullet.fireRate).toFixed(1)}/s → ${(1000 / (g.weapons.bullet.fireRate * 0.9)).toFixed(1)}/s` },
            { id: 'multishot', name: 'Multi Shot', icon: '🎯', desc: 'Fire +1 projectile per shot', rarity: 'rare', effect: (g) => g.weapons.bullet.count++, getDesc: (g) => `Projectiles: ${g.weapons.bullet.count} → ${g.weapons.bullet.count + 1}` },
            { id: 'pierce', name: 'Piercing', icon: '🗡️', desc: 'Projectiles pass through +1 enemy', rarity: 'rare', effect: (g) => g.weapons.bullet.pierce++, getDesc: (g) => `Pierce: ${g.weapons.bullet.pierce} → ${g.weapons.bullet.pierce + 1}` },
            { id: 'magnet', name: 'Magnet', icon: '🧲', desc: 'Attract pickups from +50 range', rarity: 'common', effect: (g) => g.magnetRadius += 50, getDesc: (g) => `Magnet Range: ${g.magnetRadius} → ${g.magnetRadius + 50}` },
            { id: 'healregen', name: 'Regeneration', icon: '💚', desc: 'Regenerate +1 HP/s (out of combat only)', rarity: 'rare', effect: (g) => g.player.hpRegen = (g.player.hpRegen || 0) + 1, getDesc: (g) => `HP Regen: ${g.player.hpRegen || 0}/s → ${(g.player.hpRegen || 0) + 1}/s (out of combat)` },
            { id: 'stars', name: 'Orbiting Stars', icon: '⭐', desc: 'Adds a star (max 8), then +10 damage', rarity: 'rare', effect: (g) => { if (g.stars.length < 8) g.stars.push(g.createStar()); else g.stars.forEach(s => s.damage += 10); }, getDesc: (g) => g.stars.length < 8 ? `Stars: ${g.stars.length} → ${g.stars.length + 1}` : `Star Damage: ${g.stars[0]?.damage || 15} → ${(g.stars[0]?.damage || 15) + 10}` },
            { id: 'crit', name: 'Critical Hit', icon: '⚡', desc: '+15% Crit Chance (Max 100%)', rarity: 'epic', effect: (g) => g.weapons.bullet.critChance = Math.min(1.0, (g.weapons.bullet.critChance || 0.05) + 0.15), getDesc: (g) => `Crit Chance: ${Math.floor((g.weapons.bullet.critChance || 0.05) * 100)}% → ${Math.min(100, Math.floor(((g.weapons.bullet.critChance || 0.05) + 0.15) * 100))}%` },
            { id: 'critdmg', name: 'Lethal Strike', icon: '🩸', desc: '+50% Crit Damage', rarity: 'epic', effect: (g) => g.weapons.bullet.critMultiplier = (g.weapons.bullet.critMultiplier || 2.0) + 0.5, getDesc: (g) => `Crit Damage: ${Math.floor((g.weapons.bullet.critMultiplier || 2.0) * 100)}% → ${Math.floor(((g.weapons.bullet.critMultiplier || 2.0) + 0.5) * 100)}%` },
            { id: 'armor', name: 'Armor', icon: '🛡️', desc: 'Gain +50 HP and +25 speed', rarity: 'epic', effect: (g) => { g.player.maxHealth += 50; g.player.health += 50; g.player.speed += 25; }, getDesc: (g) => `HP: ${g.player.maxHealth}→${g.player.maxHealth + 50}, Speed: ${g.player.speed}→${g.player.speed + 25}` },
            { id: 'morestars', name: 'Star Shower', icon: '🌟', desc: 'Adds 3 stars (max 8), overflow = +10 damage each', rarity: 'epic', effect: (g) => { for (let i = 0; i < 3; i++) { if (g.stars.length < 8) g.stars.push(g.createStar()); else g.stars.forEach(s => s.damage += 10); } }, getDesc: (g) => { const toAdd = Math.min(3, 8 - g.stars.length); const overflow = 3 - toAdd; return toAdd > 0 ? `Stars: ${g.stars.length} → ${g.stars.length + toAdd}${overflow > 0 ? `, +${overflow * 10} dmg` : ''}` : `Star Damage: +30`; } },
            { id: 'devastation', name: 'Devastation', icon: '☠️', desc: 'Massive +20 damage boost', rarity: 'legendary', effect: (g) => g.weapons.bullet.damage += 20, getDesc: (g) => `Damage: ${g.weapons.bullet.damage} → ${g.weapons.bullet.damage + 20}` },
        ];

        this.initSound();
        this.init();
    }

    initSound() {
        this.sounds = {};
        this.audioCtx = null;
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) { console.log('Audio not supported'); }
    }

    playSound(type) {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        if (type === 'shoot') {
            // Star Wars style laser pew pew
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1800, this.audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(300, this.audioCtx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.08);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.08);
            return;
        }

        gain.gain.value = 0.1;
	        if (type === 'hit') { osc.frequency.value = 200; osc.type = 'sawtooth'; }
	        else if (type === 'kill') { osc.frequency.value = 600; osc.type = 'sine'; }
	        else if (type === 'xp') { osc.frequency.value = 900; osc.type = 'square'; }
        else if (type === 'levelup') { osc.frequency.value = 800; osc.type = 'sine'; }
        else if (type === 'horde') { osc.frequency.value = 150; osc.type = 'sawtooth'; gain.gain.value = 0.2; }
        else if (type === 'capture') { osc.frequency.value = 1000; osc.type = 'sine'; }

        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.15);
        osc.stop(this.audioCtx.currentTime + 0.15);
    }

    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            if ('wasd'.includes(e.key.toLowerCase()) || e.key.startsWith('Arrow')) e.preventDefault();
            // Pause toggle
            if ((e.key === 'Escape' || e.key.toLowerCase() === 'p') && this.gameRunning) {
                this.togglePause();
            }
        });
        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
        this.setupTouch();

        // Skip class select, go straight to boost select
        this.selectedClass = SURVIVOR_CLASS;
        this.player.color = this.selectedClass.color;

        this.showBoostSelect();

        document.getElementById('restart-btn').addEventListener('click', () => {
            this.showBoostSelect();
        });
        document.getElementById('hud-pause-btn').addEventListener('click', (e) => { e.stopPropagation(); this.togglePause(); });
    }

    togglePause() {
        this.gamePaused = !this.gamePaused;
        if (this.gamePaused) {
            this.showPauseMenu();
        } else {
            this.hidePauseMenu();
        }
    }

    showPauseMenu() {
        // Create pause overlay if doesn't exist
        let pauseMenu = document.getElementById('pause-menu');
        if (!pauseMenu) {
            pauseMenu = document.createElement('div');
            pauseMenu.id = 'pause-menu';
            pauseMenu.className = 'menu-overlay';
            document.body.appendChild(pauseMenu);
        }

        // Show save option only if logged in
        const canSave = typeof authManager !== 'undefined' && authManager.user;

        pauseMenu.innerHTML = `
            <div class="menu-content" style="text-align:center;">
                <h1 style="font-size:3rem;margin-bottom:1rem;">⏸️ PAUSED</h1>
                <p style="color:#888;margin-bottom:2rem;">Press ESC or P to resume</p>
                <button id="resume-btn" class="menu-btn" style="background:linear-gradient(135deg,#00ffaa,#00aa66);border:none;padding:1rem 2rem;border-radius:12px;color:#000;font-weight:700;font-size:1.1rem;cursor:pointer;margin:0.5rem;display:block;width:200px;margin-left:auto;margin-right:auto;">▶️ Resume</button>
                ${canSave ? `<button id="save-quit-btn" class="menu-btn" style="background:linear-gradient(135deg,#4da6ff,#2266aa);border:none;padding:1rem 2rem;border-radius:12px;color:#fff;font-weight:700;font-size:1.1rem;cursor:pointer;margin:0.5rem;display:block;width:200px;margin-left:auto;margin-right:auto;">💾 Save & Quit</button>` : ''}
                <button id="quit-btn" class="menu-btn" style="background:linear-gradient(135deg,#ff4466,#cc2244);border:none;padding:1rem 2rem;border-radius:12px;color:#fff;font-weight:700;font-size:1.1rem;cursor:pointer;margin:0.5rem;display:block;width:200px;margin-left:auto;margin-right:auto;">🚪 Quit</button>
            </div>
        `;

        document.getElementById('resume-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('quit-btn').addEventListener('click', () => {
            this.togglePause();
            this.gameOver();
        });

        if (canSave) {
            document.getElementById('save-quit-btn').addEventListener('click', async () => {
                const btn = document.getElementById('save-quit-btn');
                btn.textContent = '💾 Saving...';
                btn.disabled = true;

                try {
                    const saved = await this.saveGame();
                    if (saved) {
                        // Successfully saved - now go to home
                        this.gameRunning = false;
                        this.gamePaused = false;
                        document.getElementById('pause-menu').classList.add('hidden');
                        document.getElementById('game-hud').classList.add('hidden');
                        document.getElementById('start-menu').classList.remove('hidden');
                        if (typeof authManager !== 'undefined') {
                            authManager.showStartMenu();
                        }
                    } else {
                        // Save failed - show error and stay in pause menu
                        btn.textContent = '❌ Save Failed - Try Again';
                        btn.disabled = false;
                        setTimeout(() => {
                            btn.textContent = '💾 Save & Quit';
                        }, 2000);
                    }
                } catch (e) {
                    console.error('Save error:', e);
                    btn.textContent = '❌ Save Error';
                    btn.disabled = false;
                    setTimeout(() => {
                        btn.textContent = '💾 Save & Quit';
                    }, 2000);
                }
            });
        }

        pauseMenu.classList.remove('hidden');
    }

    hidePauseMenu() {
        const pauseMenu = document.getElementById('pause-menu');
        if (pauseMenu) pauseMenu.classList.add('hidden');
    }

    // Get serializable game state for saving
    getGameState() {
        return {
            // Player state
            playerX: this.worldX,
            playerY: this.worldY,
            playerHealth: this.player.health,
            playerMaxHealth: this.player.maxHealth,
            playerLevel: this.player.level,
            playerXp: this.player.xp,
            playerXpToLevel: this.player.xpToLevel,
            playerKills: this.player.kills,
            playerSpeed: this.player.speed,
            playerHpRegen: this.player.hpRegen || 0,

            // Game state
            wave: this.wave,
            gameTime: this.gameTime,
            magnetRadius: this.magnetRadius,

            // Weapons
            weapons: this.weapons,

            // Stars/Orbitals
            starsCount: this.stars.length,
            orbitalsCount: this.orbitals.length,

            // Perks and augments
            perks: this.perks,
            augments: this.augments,

            // Class
            selectedClassName: this.selectedClass?.name,

            // Minion data
            maxMinions: this.maxMinions,
            conversionChance: this.conversionChance,

            // Demon set
            demonSet: this.demonSet,
            demonSetBonusActive: this.demonSetBonusActive,
            impStats: this.impStats,

            // Boosts
            startBoost: this.startBoost
        };
    }

    // Load game state from saved data
    loadGameState(state) {
        if (!state) return false;

        // Player
        this.worldX = state.playerX || 0;
        this.worldY = state.playerY || 0;
        this.player.health = state.playerHealth || 100;
        this.player.maxHealth = state.playerMaxHealth || 100;
        this.player.level = state.playerLevel || 1;
        this.player.xp = state.playerXp || 0;
        this.player.xpToLevel = state.playerXpToLevel || 50;
        this.player.kills = state.playerKills || 0;
        this.player.speed = state.playerSpeed || 220;
        this.player.hpRegen = state.playerHpRegen || 0;

        // Game
        this.wave = state.wave || 1;
        this.gameTime = state.gameTime || 0;
        this.magnetRadius = state.magnetRadius || 100;

        // Weapons
        if (state.weapons) this.weapons = state.weapons;

        // Stars/Orbitals
        this.stars = [];
        for (let i = 0; i < (state.starsCount || 0); i++) {
            this.stars.push(this.createStar());
        }
        this.orbitals = [];
        for (let i = 0; i < (state.orbitalsCount || 0); i++) {
            this.orbitals.push(this.createOrbital());
        }

        // Perks and augments
        this.perks = state.perks || [];
        this.augments = state.augments || [];
        this.perks.forEach(p => this.applyPerk(p));

        // Minions
        this.maxMinions = state.maxMinions || 0;
        this.conversionChance = state.conversionChance || 0;

        // Demon set
        this.demonSet = state.demonSet || { helm: false, chest: false, boots: false };
        this.demonSetBonusActive = state.demonSetBonusActive || false;
        if (state.impStats) this.impStats = state.impStats;

        return true;
    }

    async saveGame() {
        if (typeof authManager === 'undefined' || !authManager.user) return false;

        const state = this.getGameState();
        const saved = await authManager.saveGame(state);

        if (saved) {
            this.damageNumbers.push({
                x: this.player.x, y: this.player.y - 50,
                value: '💾 GAME SAVED', lifetime: 2, color: '#00ffaa', scale: 1.2
            });
        }

        return saved;
    }

    setupTouch() {
        this.canvas.addEventListener('touchstart', (e) => { if (!this.gameRunning || this.gamePaused) return; e.preventDefault(); const t = e.touches[0]; if (t.clientY > window.innerHeight / 2) { this.joystick.active = true; this.joystick.startX = t.clientX; this.joystick.startY = t.clientY; } }, { passive: false });
        this.canvas.addEventListener('touchmove', (e) => { if (!this.joystick.active) return; e.preventDefault(); const t = e.touches[0]; const dx = t.clientX - this.joystick.startX, dy = t.clientY - this.joystick.startY; const d = Math.sqrt(dx * dx + dy * dy); if (d > 0) { const c = Math.min(d, 60); this.joystick.dx = (dx / d) * (c / 60); this.joystick.dy = (dy / d) * (c / 60); } }, { passive: false });
        this.canvas.addEventListener('touchend', () => { this.joystick.active = false; this.joystick.dx = 0; this.joystick.dy = 0; });
    }

    showBoostSelect() {
        // Hide game over menu and show start menu
        document.getElementById('gameover-menu').classList.add('hidden');
        document.getElementById('start-menu').classList.remove('hidden');

        const menu = document.getElementById('start-menu');
        const content = menu.querySelector('.menu-content');
        content.innerHTML = `
            <h1 class="game-title">DOTS<span>SURVIVOR</span></h1>
            <p class="game-subtitle">Survive the endless horde!</p>
            <div style="display:flex;gap:1.5rem;justify-content:center;margin:2rem 0;">
                <div class="diff-card" id="btn-fresh" style="background:#44ff8822;border:2px solid #44ff88;border-radius:12px;padding:1.5rem;width:180px;cursor:pointer;text-align:center;">
                    <div style="font-size:2.5rem;">🌱</div>
                    <div style="font-weight:700;color:#44ff88;font-size:1.2rem;margin:0.5rem 0;">Fresh Start</div>
                    <div style="font-size:0.85rem;color:#ccc;">Start at Level 1</div>
                    <div style="font-size:0.9rem;color:#fff;margin-top:0.5rem;">+3 Random Upgrades</div>
                    <div style="font-size:0.7rem;color:#888;margin-top:0.3rem;">🎲 Augments are random</div>
                </div>
                <div class="diff-card" id="btn-boosted" style="background:#00ccff22;border:2px solid #00ccff;border-radius:12px;padding:1.5rem;width:180px;cursor:pointer;text-align:center;">
                    <div style="font-size:2.5rem;">🚀</div>
                    <div style="font-weight:700;color:#00ccff;font-size:1.2rem;margin:0.5rem 0;">Head Start</div>
                    <div style="font-size:0.85rem;color:#ccc;">Start at Level 5</div>
                    <div style="font-size:0.9rem;color:#fff;margin-top:0.5rem;">+5 Random Upgrades</div>
                    <div style="font-size:0.7rem;color:#888;margin-top:0.3rem;">🎲 Augments are random</div>
                </div>
            </div>
            <div class="controls-info" style="margin-top:1rem;color:#888;font-size:0.8rem;"><p>🎮 WASD/Arrows to move & aim</p><p>🔫 Auto-shoots in movement direction</p><p>⏸️ ESC/P to pause</p></div>
        `;

        document.getElementById('btn-fresh').addEventListener('click', () => this.startGame('fresh'));
        document.getElementById('btn-boosted').addEventListener('click', () => this.startGame('boosted'));
    }

    resizeCanvas() { this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight; }

    startGame(mode = 'fresh') {
        document.getElementById('start-menu').classList.add('hidden'); // Ensure menu hidden

        this.worldX = 0; this.worldY = 0;
        this.player.x = this.canvas.width / 2; this.player.y = this.canvas.height / 2;

        // Apply game settings to player
        const baseHealth = Math.floor(100 * GAME_SETTINGS.playerHealthMult);
        this.player.health = baseHealth; this.player.maxHealth = baseHealth; this.player.speed = 220;
        this.player.xp = 0; this.player.xpToLevel = 50; this.player.kills = 0;
        this.player.hpRegen = 0;

        // Mode logic
        if (mode === 'boosted') {
            this.player.level = 5;
            this.pendingUpgrades = 5;
            // Scale XP requirement for lvl 5
            for (let i = 1; i < 5; i++) this.player.xpToLevel = Math.floor(this.player.xpToLevel * 1.15);
        } else {
            this.player.level = 1;
            this.pendingUpgrades = 3; // 3 Free attributes for Fresh start
        }

        this.weapons.bullet = { damage: 12, speed: 450, fireRate: 450, lastFired: 0, count: 1, size: 6, pierce: 1, color: this.selectedClass.color, critChance: 0.05, critMultiplier: 2.0 };

        // Apply class bonuses
        if (this.selectedClass.bonuses.bulletCount) this.weapons.bullet.count += this.selectedClass.bonuses.bulletCount;
        if (this.selectedClass.bonuses.fireRate) this.weapons.bullet.fireRate = Math.floor(this.weapons.bullet.fireRate * this.selectedClass.bonuses.fireRate);
        if (this.selectedClass.bonuses.damage) this.weapons.bullet.damage = Math.floor(this.weapons.bullet.damage * this.selectedClass.bonuses.damage);

        this.enemies = []; this.projectiles = []; this.pickups = []; this.particles = []; this.damageNumbers = [];
        this.orbitals = []; this.minions = []; this.items = {}; this.stars = [];
        
        // Stacking Items System
        this.stackingItems = {}; // { itemKey: { stacks: 0, evolved: false } }
        this.droppedItems = []; // Track which items have already dropped (drop once only)
        this.stackingDamageBonus = 0;
        this.stackingXpBonus = 0;
        this.stackingHpBonus = 0;
        this.stackingSpeedBonus = 0;
        this.stackingCritBonus = 0;
        this.stackingFreezeChance = 0;
        this.stackingPoisonDps = 0;
        this.stackingMagnetBonus = 0;
        this.stackingRegen = 0;
        this.wave = 1; this.waveTimer = 0; this.gameTime = 0;

        // INTENSE spawn rate (faster spawns)
        this.baseSpawnRate = Math.floor(500 * GAME_SETTINGS.spawnRateMult);
        // Necromancer gets even more enemies
        if (this.selectedClass.bonuses.spawnsMoreEnemies) this.baseSpawnRate = Math.floor(this.baseSpawnRate * 0.6);
        this.enemySpawnRate = this.baseSpawnRate;

        this.magnetRadius = 100; this.xpMultiplier = GAME_SETTINGS.xpMult;
        this.shieldActive = false; this.shieldTimer = 0; this.shieldCooldown = 60;

        // Item drop chance (base 1% - reduced due to high mob count)
        this.itemDropChance = 0.01;

        // Ice zones array for ice mob death effect
        this.iceZones = [];

        // Sticky immobilization timer

        // Combat healing penalty
        this.combatTimer = 0; // Time since last damage (healing reduced while in combat)
        this.combatHealingPenalty = 0.75; // 75% healing reduction in combat
        this.combatDuration = 3; // 3 seconds before out of combat

        // New item effect properties
        this.vampiricHeal = 0;         // HP healed per kill
        this.critChance = 0;            // Crit chance (0-1)
        this.bulletPierce = 0;          // How many enemies bullets pierce
        this.damageMultiplier = 1;      // Bullet damage multiplier
        this.bulletExplosion = false;   // Whether bullets explode
        this.explosionRadius = 30;      // Explosion radius
        this.freezeChance = 0;          // Chance to freeze enemies
        this.extraBullets = 0;          // Extra bullets per shot
        this.regenEnabled = false;      // Whether regen is active
        this.regenInterval = 5;         // Seconds between regen
        this.regenTimer = 0;            // Timer for regen
        this.thornDamage = 0;           // Damage reflection percentage
        this.stickyTimer = 0;

        // Minimum enemies (scales up over time)
        this.minEnemies = 20;

        // Horde system
        this.lastHordeCount = 0;

        // Control points and perks
        this.controlPoints = [];
        this.perks = [];
        this.availablePerks = [...LEGENDARY_PERKS];

        // Boss tracking
        this.bossesSpawnedThisWave = 0;
        this.generalSpawnedThisWave = false;
        this.lastBossWave = 0;
        this.bossStatMultiplier = 1.0;
        this.consumerSpawned = false;
        this.spawnControlPoint();
        this.lastControlPointWave = 1;

        // Health packs (rare spawns)
        this.lastHealthPackSpawn = 0;
        this.healthPackInterval = 45000; // Every 45 seconds chance

        // Camera zoom
        this.cameraScale = 0.65;

        // Game Juice Effects
        this.screenShake = { intensity: 0, duration: 0 };
        this.slowmo = { active: false, factor: 1, duration: 0 };
        this.killStreak = 0;
        this.killStreakTimer = 0;
        this.auraFire = null; // Fire aura augment

        // Horde tracking
        this.hordeActive = false;
        this.hordeEnemyCount = 0;

        // Regen timer
        this.regenTimer = 0;

        // Diamond Augments & Dotomancer Stats
        this.augments = [];
        this.titanKillerBonus = 0; // Titan Killer augment bonus damage to bosses/tanks
        this.maxMinions = 0;
        this.minionRespawnTime = 0;
        this.conversionChance = 0;

        // Demon Set
        this.demonSet = { helm: false, chest: false, boots: false };
        this.demonSetBonusActive = false;
        this.imps = [];
        this.impSpawnTimer = 0;
        this.impStats = { damage: 300, maxImps: 5, spawnInterval: 10, burnDuration: 5 };

        if (this.selectedClass.bonuses.minionCount) {
            this.maxMinions = this.selectedClass.bonuses.minionCount;
            this.minionRespawnTime = this.selectedClass.bonuses.minionRespawn || 0;
            this.conversionChance = this.selectedClass.bonuses.conversionChance || 0;
        }

        // Initialize available perks for control points
        this.availablePerks = [...LEGENDARY_PERKS];
        // Add Diamond Augments to the pool? Or are they separate?
        // User request implied "Diamond Augments" are what's being shown.
        // Let's add them to the pool or use them exclusively for a specific event
        // Current code likely wasn't using them if grep failed, but let's ensure they are used
        this.diamondAugments = [...DIAMOND_AUGMENTS];

        // Class-specific starting abilities
        if (this.selectedClass.bonuses.orbitalCount) for (let i = 0; i < this.selectedClass.bonuses.orbitalCount; i++) this.orbitals.push(this.createOrbital());

        // Chrono Field (time_stop augment)
        this.chronoFieldTimer = 0;
        this.chronoFieldCooldown = 15; // seconds between freezes
        this.chronoFieldActive = false;
        this.chronoFieldDuration = 3; // 3 second freeze

        // Elemental Mastery
        this.elementalCycleTimer = 0;
        this.currentElement = 0; // 0=Fire, 1=Ice, 2=Lightning
        this.elementNames = ['fire', 'ice', 'lightning'];
        this.elementColors = ['#ff4400', '#00ccff', '#ffff00'];

        // Event System
        this.activeEvent = null;
        this.eventTimer = 0;
        this.nextEventWave = 15; // First event at wave 15
        this.eventCooldown = 0;

        // Ring of Fire event data
        this.ringOfFire = {
            active: false,
            radius: 350, // Increased size
            duration: 15,
            timer: 0,
            damagePerSecond: 8,
            burnTimer: 0,
            burnDuration: 5
        };

        // Unescapable Square event data
        this.trapSquare = {
            active: false,
            size: 400,
            duration: 30,
            timer: 0,
            spawnBoost: 3
        };

        // Circle of Doom event data - purple closing circle
        this.circleOfDoom = {
            active: false,
            centerX: 0,
            centerY: 0,
            startRadius: 500,
            currentRadius: 500,
            minRadius: 120, // Cannot close smaller than this - player can still move
            duration: 25,
            timer: 0,
            damagePerSecond: 15
        };

        // Start Game Loop
        this.gameRunning = true;
        this.gamePaused = false;
        this.lastTime = performance.now();
        this.gameLoop(this.lastTime);

        if (this.selectedClass.bonuses.minionCount) {
            // Initial minions
            for (let i = 0; i < this.maxMinions; i++) this.addMinion('basic');
        }

        document.getElementById('start-menu').classList.add('hidden');
        document.getElementById('gameover-menu').classList.add('hidden');
        document.getElementById('levelup-menu').classList.add('hidden');
        document.getElementById('game-hud').classList.remove('hidden');

        this.gameRunning = true; this.gamePaused = false; this.lastTime = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    // Start game with a saved state
    startGameWithState(savedState) {
        // First initialize with fresh state (uses default settings)
        this.startGame('fresh');

        // Then override with saved state
        if (savedState) {
            this.loadGameState(savedState);

            // Update HUD immediately
            this.updateHUD();

            // Show resume message
            this.damageNumbers.push({
                x: this.player.x, y: this.player.y - 60,
                value: '▶️ GAME RESUMED', lifetime: 3, color: '#00ffaa', scale: 1.5
            });
        }
    }

    spawnControlPoint() {
        const angle = Math.random() * Math.PI * 2;
        const dist = 800 + Math.random() * 500;
        this.controlPoints.push({
            wx: this.worldX + Math.cos(angle) * dist,
            wy: this.worldY + Math.sin(angle) * dist,
            radius: 50,
            captureProgress: 0,
            captured: false,
            spawnWave: this.wave
        });
    }

    spawnConsumer() {
        // Consumer boss - black hole that consumes other enemies to grow stronger
        const angle = Math.random() * Math.PI * 2;
        const dist = 400 + Math.random() * 100;
        const wx = this.worldX + Math.cos(angle) * dist;
        const wy = this.worldY + Math.sin(angle) * dist;

        const consumer = {
            wx, wy,
            type: 'consumer',
            name: 'THE CONSUMER',
            isConsumer: true,
            isBoss: true,
            radius: 80,
            baseRadius: 80,
            speed: 20, // Much slower - menacing crawl
            health: 30000, // Very tanky - survive or kill
            maxHealth: 30000,
            baseHealth: 30000,
            damage: 50, // High contact damage
            xp: 2000,
            color: '#8800ff',
            hitFlash: 0,
            consumedCount: 0,
            rotationAngle: 0,
            consumeRadius: 180, // Larger consume range
            critResistance: 0.8, // 80% crit resistance
            lifeTimer: 0,
            maxLifeTime: 90 // 1:30 survival time
        };

        this.enemies.push(consumer);

        // Scary warning announcement
        this.damageNumbers.push({
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 - 120,
            value: '⚫ THE CONSUMER AWAKENS ⚫',
            lifetime: 4,
            color: '#8800ff',
            scale: 2.5
        });
        this.damageNumbers.push({
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 - 70,
            value: '🔥 SURVIVE FOR 1:30! 🔥',
            lifetime: 4,
            color: '#ff4400',
            scale: 2
        });
        this.damageNumbers.push({
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 - 30,
            value: 'It cannot be stopped...',
            lifetime: 4,
            color: '#cc88ff',
            scale: 1.2
        });
    }

    updateConsumer(dt) {
        // Find consumer enemy
        const consumer = this.enemies.find(e => e.isConsumer);
        if (!consumer) return;

        // Update life timer
        consumer.lifeTimer += dt;

        // Warning at 60 seconds
        if (consumer.lifeTimer >= 60 && consumer.lifeTimer < 60 + dt) {
            this.damageNumbers.push({
                x: this.canvas.width / 2,
                y: this.canvas.height / 2 - 50,
                value: '⚠️ CONSUMER UNSTABLE! 30 SECONDS! ⚠️',
                lifetime: 3,
                color: '#ff4400',
                scale: 1.5
            });
        }

        // Warning at 80 seconds
        if (consumer.lifeTimer >= 80 && consumer.lifeTimer < 80 + dt) {
            this.damageNumbers.push({
                x: this.canvas.width / 2,
                y: this.canvas.height / 2 - 50,
                value: '💀 CONSUMER CRITICAL! 10 SECONDS! 💀',
                lifetime: 3,
                color: '#ff0000',
                scale: 2
            });
        }

        // EXPLOSION at 90 seconds
        if (consumer.lifeTimer >= consumer.maxLifeTime) {
            this.consumerExplode(consumer);
            return;
        }

        // Update rotation for visual effect (faster as time runs out)
        const urgency = Math.max(1, (consumer.lifeTimer / consumer.maxLifeTime) * 5);
        consumer.rotationAngle += dt * 2 * urgency;

        // Move toward player (slowly)
        const dx = this.worldX - consumer.wx;
        const dy = this.worldY - consumer.wy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
            consumer.wx += (dx / dist) * consumer.speed * dt;
            consumer.wy += (dy / dist) * consumer.speed * dt;
        }

        // Consume nearby non-boss enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            if (e === consumer || e.isBoss) continue;

            const edx = consumer.wx - e.wx;
            const edy = consumer.wy - e.wy;
            const edist = Math.sqrt(edx * edx + edy * edy);

            if (edist < consumer.consumeRadius) {
                // Pull enemy toward consumer
                const pullStrength = 200 * dt;
                e.wx += (edx / edist) * pullStrength;
                e.wy += (edy / edist) * pullStrength;

                // Consume if very close
                if (edist < consumer.radius + e.radius) {
                    // Absorb health (15% of enemy max health)
                    const healthGain = Math.floor(e.maxHealth * 0.15);
                    consumer.maxHealth += healthGain;
                    consumer.health += healthGain;
                    consumer.consumedCount++;

                    // Grow slightly
                    consumer.radius = consumer.baseRadius + Math.min(consumer.consumedCount * 2, 60);
                    consumer.consumeRadius = 120 + Math.min(consumer.consumedCount * 3, 80);

                    // Increase damage slightly
                    consumer.damage = 30 + Math.floor(consumer.consumedCount * 2);

                    // Visual feedback
                    const sx = this.player.x + (e.wx - this.worldX);
                    const sy = this.player.y + (e.wy - this.worldY);
                    this.spawnParticles(sx, sy, '#8800ff', 8);
                    
                    // Remove consumed enemy
                    this.enemies.splice(i, 1);

                    // Announce growth
                    if (consumer.consumedCount % 5 === 0) {
                        this.damageNumbers.push({
                            x: this.canvas.width / 2,
                            y: 100,
                            value: `🌀 Consumer grows! HP: ${consumer.health}`,
                            lifetime: 1.5,
                            color: '#cc88ff'
                        });
                    }
                }
            }
        }
    }

    consumerExplode(consumer) {
        const sx = this.player.x + (consumer.wx - this.worldX);
        const sy = this.player.y + (consumer.wy - this.worldY);

        // Massive explosion effect
        this.spawnParticles(sx, sy, '#8800ff', 50);
        this.spawnParticles(sx, sy, '#ffffff', 30);
        this.spawnParticles(sx, sy, '#ff00ff', 40);

        // Screen shake
        this.triggerScreenShake(20, 0.5);
        this.triggerSlowmo(0.2, 1.0);

        // Explosion damage to ALL enemies in huge radius
        const explosionRadius = 300 + consumer.consumedCount * 5;
        const explosionDamage = 500 + consumer.consumedCount * 50;

        for (const e of this.enemies) {
            if (e === consumer) continue;
            const edx = consumer.wx - e.wx;
            const edy = consumer.wy - e.wy;
            const edist = Math.sqrt(edx * edx + edy * edy);

            if (edist < explosionRadius) {
                e.health -= explosionDamage;
                e.hitFlash = 1;
                const esx = this.player.x + (e.wx - this.worldX);
                const esy = this.player.y + (e.wy - this.worldY);
                this.damageNumbers.push({ x: esx, y: esy - 10, value: explosionDamage, lifetime: 1, color: '#ff00ff' });
            }
        }

        // Damage player if close
        const playerDist = Math.sqrt((this.worldX - consumer.wx) ** 2 + (this.worldY - consumer.wy) ** 2);
        if (playerDist < explosionRadius) {
            const playerDmg = Math.floor(explosionDamage * 0.5);
            this.player.health -= playerDmg;
            this.combatTimer = 0; // Reset combat timer
            this.damageNumbers.push({ x: this.player.x, y: this.player.y - 30, value: -playerDmg, lifetime: 1, color: '#ff0000' });
        }

        // Announcement
        this.damageNumbers.push({
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 - 80,
            value: '💥 THE CONSUMER EXPLODES! 💥',
            lifetime: 3,
            color: '#ff00ff',
            scale: 2.5
        });

        // Drop massive XP
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 100;
            this.pickups.push({
                wx: consumer.wx + Math.cos(angle) * dist,
                wy: consumer.wy + Math.sin(angle) * dist,
                xp: 50 + consumer.consumedCount * 5,
                radius: 10,
                color: '#d4e600',
                isItem: false
            });
        }

        // Remove consumer
        const idx = this.enemies.indexOf(consumer);
        if (idx >= 0) this.enemies.splice(idx, 1);
    }


    spawnHealthPack() {
        const angle = Math.random() * Math.PI * 2;
        const dist = 200 + Math.random() * 400;
        this.pickups.push({
            wx: this.worldX + Math.cos(angle) * dist,
            wy: this.worldY + Math.sin(angle) * dist,
            xp: 0, radius: 12, color: '#ff4488', isItem: false, isHealth: true, healAmount: 30
        });
    }

    createOrbital() {
        return { angle: Math.random() * Math.PI * 2, radius: 80 + this.orbitals.length * 15, speed: 2 + Math.random(), damage: 12, size: 12, color: '#aa44ff' };
    }

    createStar() {
        return {
            angle: Math.random() * Math.PI * 2,
            radius: 60 + this.stars.length * 12,
            speed: 3 + Math.random() * 0.5,
            damage: 15,
            size: 10,
            color: '#ffdd00'
        };
    }

    addMinion(type) {
        const m = this.createMinion();
        this.minions.push(m);
    }

    createMinion() {
        const angle = Math.random() * Math.PI * 2;
        const radius = 60 + Math.random() * 40;

        // Guard Stats - Scale with level
        const levelMult = 1 + (this.player.level * 0.15); // 15% scaling per level

        return {
            x: this.player.x + Math.cos(angle) * 80,
            y: this.player.y + Math.sin(angle) * 80,
            radius: 14,
            speed: 220,
            damage: Math.floor(30 * levelMult),
            health: Math.floor(1500 * levelMult),
            maxHealth: Math.floor(1500 * levelMult),
            color: '#44ff88',
            icon: '🛡️',
            attackCooldown: 0,
            type: 'guard'
        };
    }

    gameLoop(t) {
        if (!this.gameRunning) return;
        const dt = (t - this.lastTime) / 1000; this.lastTime = t;
        if (!this.gamePaused) {
            // Check for pending upgrades (Starting Boost)
            if (this.pendingUpgrades > 0) {
                this.showLevelUpMenu();
                // do not return, let the loop continue so requestAnimationFrame is called
            }
            this.gameTime += dt * 1000;
            this.waveTimer += dt * 1000;
            if (this.waveTimer >= this.waveDuration) {
                this.wave++;
                this.waveTimer = 0;
                this.enemySpawnRate = Math.max(200, this.enemySpawnRate - 80);

                // Spawn control points every 5 waves
                if (this.wave % 5 === 0 || this.wave - this.lastControlPointWave >= 5) {
                    this.spawnControlPoint();
                    this.lastControlPointWave = this.wave;
                }

                // Reset boss tracking for new wave
                this.bossesSpawnedThisWave = 0;
                this.generalSpawnedThisWave = false;

                // Check for expired control points (10 waves without capture)
                for (let i = this.controlPoints.length - 1; i >= 0; i--) {
                    const cp = this.controlPoints[i];
                    if (!cp.captured && this.wave - cp.spawnWave >= 10) {
                        // Despawn and trigger horde
                        this.controlPoints.splice(i, 1);
                        this.damageNumbers.push({
                            x: this.canvas.width / 2,
                            y: this.canvas.height / 2 - 100,
                            value: '⚠️ CONTROL POINT LOST! HORDE INCOMING! ⚠️',
                            lifetime: 3,
                            color: '#ff0044',
                            scale: 1.5
                        });
                        this.spawnHorde();
                    }
                }
            }
            this.checkHorde();
            this.update(dt);
        }
        this.render();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    checkHorde() {
        // Horde every 5 waves starting at wave 5
        const hordeWaveInterval = 5;
        const currentHordeCount = Math.floor(this.wave / hordeWaveInterval);

        if (this.wave >= 5 && currentHordeCount > this.lastHordeCount) {
            this.lastHordeCount = currentHordeCount;
            this.spawnHorde();
        }

        // Update HUD horde indicator
        const wavesRemaining = hordeWaveInterval - (this.wave % hordeWaveInterval);
        const indicator = document.getElementById('horde-indicator');
        const wavesSpan = document.getElementById('horde-waves');
        if (indicator && wavesSpan) {
            if (this.wave >= 2 && wavesRemaining <= 3) {
                indicator.style.display = 'block';
                wavesSpan.textContent = wavesRemaining === 5 ? 'NOW!' : wavesRemaining;
            } else {
                indicator.style.display = 'none';
            }
        }
    }

    spawnHorde() {

        // Spawn a massive wave of enemies surrounding the player
        const hordeSize = 30 + this.wave * 5;

        // Show horde warning
        this.damageNumbers.push({
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 - 50,
            value: '⚠️ HORDE INCOMING! ⚠️',
            lifetime: 3,
            color: '#ff0044'
        });

        this.playSound('horde');
        this.hordeActive = true;
        this.hordeEnemyCount = hordeSize;

        // Spawn enemies in a tight circle around player (closer spawn for surrounded feel)
        for (let i = 0; i < hordeSize; i++) {
            setTimeout(() => {
                const angle = (i / hordeSize) * Math.PI * 2 + Math.random() * 0.3;
                const dist = 180 + Math.random() * 120; // Closer horde spawns for intense combat
                const wx = this.worldX + Math.cos(angle) * dist;
                const wy = this.worldY + Math.sin(angle) * dist;

                // Fixed: 'fast' -> 'runner', added sticky and ice to horde pool
                const types = ['basic', 'runner', 'swarm', 'swarm', 'sticky'];
                if (this.wave >= 8) types.push('ice'); // Ice mobs appear in hordes after wave 8
                const type = types[Math.floor(Math.random() * types.length)];
                // Pass isHorde=true for +50% health and 20% slower speed
                const enemy = this.createEnemy(wx, wy, type, false, true);
                enemy.isHordeEnemy = true; // Mark as horde enemy for tracking
                this.enemies.push(enemy);
            }, i * 50); // Stagger spawns for dramatic effect
        }
    }

    checkHordeCompletion() {
        if (!this.hordeActive) return;

        // Count remaining horde enemies
        const hordeEnemiesLeft = this.enemies.filter(e => e.isHordeEnemy).length;

        if (hordeEnemiesLeft === 0) {
            this.hordeActive = false;
            // Horde defeated announcement
            this.damageNumbers.push({
                x: this.canvas.width / 2,
                y: this.canvas.height / 2 - 50,
                value: '✅ HORDE DEFEATED!',
                lifetime: 2,
                color: '#00ff88',
                scale: 1.5
            });
        }
    }

    // ==================== EVENT SYSTEM ====================

    checkEvents() {
        // Check if we should trigger an event
        if (this.activeEvent) return; // Event already active
        if (this.eventCooldown > 0) return; // On cooldown

        // Trigger event at specific waves
        if (this.wave >= this.nextEventWave) {
            this.triggerRandomEvent();
            this.nextEventWave = this.wave + 8 + Math.floor(Math.random() * 5); // Next event 8-12 waves later
        }
    }

    triggerRandomEvent() {
        const eventTypes = ['ring_of_fire', 'trap_square', 'circle_of_doom'];
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

        this.activeEvent = eventType;
        this.eventTimer = 0;

        if (eventType === 'ring_of_fire') {
            this.ringOfFire.active = true;
            this.ringOfFire.timer = 0;
            this.ringOfFire.burnTimer = 0;
            this.ringOfFire.radius = 400 + Math.min(this.wave * 8, 300); // Increased size - grows with wave

            this.damageNumbers.push({
                x: this.canvas.width / 2,
                y: this.canvas.height / 2 - 80,
                value: '🔥 RING OF FIRE 🔥',
                lifetime: 3,
                color: '#ff4400',
                scale: 1.5
            });
            this.damageNumbers.push({
                x: this.canvas.width / 2,
                y: this.canvas.height / 2 - 40,
                value: 'Stay inside the ring!',
                lifetime: 3,
                color: '#ffaa00'
            });
        } else if (eventType === 'trap_square') {
            this.trapSquare.active = true;
            this.trapSquare.timer = 0;
            this.trapSquare.centerX = this.worldX;
            this.trapSquare.centerY = this.worldY;
            this.trapSquare.size = 350 + Math.min(this.wave * 3, 150);

            this.damageNumbers.push({
                x: this.canvas.width / 2,
                y: this.canvas.height / 2 - 80,
                value: '⬛ TRAPPED! ⬛',
                lifetime: 3,
                color: '#8844ff',
                scale: 1.5
            });
            this.damageNumbers.push({
                x: this.canvas.width / 2,
                y: this.canvas.height / 2 - 40,
                value: 'Survive 30 seconds!',
                lifetime: 3,
                color: '#aa66ff'
            });

            // Spawn flood of enemies outside
            for (let i = 0; i < 50; i++) {
                setTimeout(() => {
                    const side = Math.floor(Math.random() * 4);
                    const offset = (Math.random() - 0.5) * this.trapSquare.size * 2;
                    let wx, wy;
                    const dist = this.trapSquare.size / 2 + 100;
                    switch (side) {
                        case 0: wx = this.trapSquare.centerX - dist; wy = this.trapSquare.centerY + offset; break;
                        case 1: wx = this.trapSquare.centerX + dist; wy = this.trapSquare.centerY + offset; break;
                        case 2: wx = this.trapSquare.centerX + offset; wy = this.trapSquare.centerY - dist; break;
                        case 3: wx = this.trapSquare.centerX + offset; wy = this.trapSquare.centerY + dist; break;
                    }
                    this.enemies.push(this.createEnemy(wx, wy, 'swarm'));
                }, i * 100);
            }
        } else if (eventType === 'circle_of_doom') {
            // Circle of Doom - purple closing circle, player CANNOT escape
            this.circleOfDoom.active = true;
            this.circleOfDoom.timer = 0;
            this.circleOfDoom.centerX = this.worldX;
            this.circleOfDoom.centerY = this.worldY;
            this.circleOfDoom.startRadius = 450 + Math.min(this.wave * 5, 150);
            this.circleOfDoom.currentRadius = this.circleOfDoom.startRadius;

            this.damageNumbers.push({
                x: this.canvas.width / 2,
                y: this.canvas.height / 2 - 80,
                value: '💀 CIRCLE OF DOOM 💀',
                lifetime: 3,
                color: '#aa00ff',
                scale: 1.8
            });
            this.damageNumbers.push({
                x: this.canvas.width / 2,
                y: this.canvas.height / 2 - 50,
                value: 'No escape! Survive!',
                lifetime: 3,
                color: '#cc66ff'
            });
        }
    }

    updateEvents(dt) {
        if (!this.activeEvent) {
            this.checkEvents();
            if (this.eventCooldown > 0) this.eventCooldown -= dt;
            return;
        }

        this.eventTimer += dt;

        // Ring of Fire
        if (this.ringOfFire.active) {
            this.ringOfFire.timer += dt;

            // Check if player is outside ring
            const playerDist = 0; // Player is always at center of ring
            const ringRadius = this.ringOfFire.radius;

            // Check if player moved outside the ring (ring is centered on player's start position)
            // Actually ring should follow player - if player crosses the boundary they take damage
            // Let's make it so the ring surrounds player's current position
            // Damage is applied if player is AT the ring edge (crossing it)

            // Simpler: player takes burn damage if they're near the edge
            // We'll check this in updatePlayer to restrict movement

            // Update burn status
            if (this.ringOfFire.burnTimer > 0) {
                this.ringOfFire.burnTimer -= dt;
                // Apply burn damage
                const burnDmg = Math.floor(this.ringOfFire.damagePerSecond * dt);
                if (burnDmg > 0) {
                    this.player.health -= burnDmg;
                    this.combatTimer = 0; // Reset combat timer
                    if (Math.random() < 0.3) {
                        this.damageNumbers.push({
                            x: this.player.x + (Math.random() - 0.5) * 30,
                            y: this.player.y - 20 + (Math.random() - 0.5) * 20,
                            value: -burnDmg, lifetime: 0.5, color: '#ff4400'
                        });
                        this.spawnParticles(this.player.x, this.player.y, '#ff4400', 3);
                    }
                }
            }

            // End event
            if (this.ringOfFire.timer >= this.ringOfFire.duration) {
                this.ringOfFire.active = false;
                this.activeEvent = null;
                this.eventCooldown = 10;
                this.damageNumbers.push({
                    x: this.canvas.width / 2,
                    y: this.canvas.height / 2 - 50,
                    value: '🔥 Ring fades... 🔥',
                    lifetime: 2,
                    color: '#ff8800'
                });
            }
        }

        // Trap Square
        if (this.trapSquare.active) {
            this.trapSquare.timer += dt;

            // End event
            if (this.trapSquare.timer >= this.trapSquare.duration) {
                this.trapSquare.active = false;
                this.activeEvent = null;
                this.eventCooldown = 10;
                this.damageNumbers.push({
                    x: this.canvas.width / 2,
                    y: this.canvas.height / 2 - 50,
                    value: '⬛ Barrier breaks! ⬛',
                    lifetime: 2,
                    color: '#aa88ff'
                });
            }
        }

        // Circle of Doom - purple closing circle
        if (this.circleOfDoom.active) {
            this.circleOfDoom.timer += dt;

            // Slowly close the circle
            const shrinkRate = (this.circleOfDoom.startRadius - this.circleOfDoom.minRadius) / this.circleOfDoom.duration;
            this.circleOfDoom.currentRadius = Math.max(
                this.circleOfDoom.minRadius,
                this.circleOfDoom.startRadius - (shrinkRate * this.circleOfDoom.timer)
            );

            // Damage player if outside the circle
            const distFromCenter = Math.sqrt(
                Math.pow(this.worldX - this.circleOfDoom.centerX, 2) +
                Math.pow(this.worldY - this.circleOfDoom.centerY, 2)
            );

            if (distFromCenter > this.circleOfDoom.currentRadius) {
                const damage = Math.floor(this.circleOfDoom.damagePerSecond * dt);
                if (damage > 0 && this.player.invincibleTime <= 0) {
                    this.player.health -= damage;
                    this.combatTimer = 0; // Reset combat timer
                    this.damageNumbers.push({
                        x: this.player.x,
                        y: this.player.y - 30,
                        value: -damage,
                        lifetime: 0.5,
                        color: '#aa00ff'
                    });
                }
            }

            // End event
            if (this.circleOfDoom.timer >= this.circleOfDoom.duration) {
                this.circleOfDoom.active = false;
                this.activeEvent = null;
                this.eventCooldown = 10;
                this.damageNumbers.push({
                    x: this.canvas.width / 2,
                    y: this.canvas.height / 2 - 50,
                    value: '💀 Doom lifts... 💀',
                    lifetime: 2,
                    color: '#aa00ff'
                });
            }
        }
    }

    // Check if player crosses ring of fire
    checkRingOfFireCollision(newWorldX, newWorldY) {
        if (!this.ringOfFire.active) return false;

        // Ring is always centered on current player position
        // If player tries to move beyond radius, they hit the ring
        const moveDistX = newWorldX - this.worldX;
        const moveDistY = newWorldY - this.worldY;
        const moveDist = Math.sqrt(moveDistX * moveDistX + moveDistY * moveDistY);

        // Don't allow movement beyond ring boundary at screen edge
        // Ring is rendered at a fixed radius from player center
        // Player moving doesn't cross the ring - but we need to damage if at edge
        // Let's simplify: damage player over time while event is active based on proximity to edge
        return false; // Movement not blocked, damage handled separately
    }

    // Check trap square bounds
    checkTrapSquareBounds(newWorldX, newWorldY) {
        if (!this.trapSquare.active) return { x: newWorldX, y: newWorldY };

        const halfSize = this.trapSquare.size / 2;
        const minX = this.trapSquare.centerX - halfSize;
        const maxX = this.trapSquare.centerX + halfSize;
        const minY = this.trapSquare.centerY - halfSize;
        const maxY = this.trapSquare.centerY + halfSize;

        return {
            x: Math.max(minX, Math.min(maxX, newWorldX)),
            y: Math.max(minY, Math.min(maxY, newWorldY))
        };
    }

    // Check Circle of Doom bounds - player CANNOT escape
    checkCircleOfDoomBounds(newWorldX, newWorldY) {
        if (!this.circleOfDoom.active) return { x: newWorldX, y: newWorldY };

        const dx = newWorldX - this.circleOfDoom.centerX;
        const dy = newWorldY - this.circleOfDoom.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // If within circle, allow movement
        if (dist <= this.circleOfDoom.currentRadius) {
            return { x: newWorldX, y: newWorldY };
        }

        // Clamp to circle edge
        const angle = Math.atan2(dy, dx);
        return {
            x: this.circleOfDoom.centerX + Math.cos(angle) * this.circleOfDoom.currentRadius,
            y: this.circleOfDoom.centerY + Math.sin(angle) * this.circleOfDoom.currentRadius
        };
    }


    update(dt) {
        // Apply slowmo effect
        const effectiveDt = this.slowmo.active ? dt * this.slowmo.factor : dt;
        
        this.updatePlayer(effectiveDt);
        this.updateShield(effectiveDt);
        this.updateRegen(effectiveDt);
        this.updateChronoField(effectiveDt);
        this.updateElementalCycle(effectiveDt);
        this.updateEvents(effectiveDt);
        this.spawnEnemies();
        this.spawnHealthPacks();
        this.updateControlPoints(effectiveDt);
        this.updateEnemies(effectiveDt);
        this.updateOrbitals(effectiveDt);
        this.updateStars(effectiveDt);
        this.updateMinions(effectiveDt);
        this.updateActiveMinions(effectiveDt);
        this.updateImps(effectiveDt);
        this.updateAuraFire(effectiveDt);
        this.checkHordeCompletion();
        this.updateConsumer(effectiveDt);
        this.fireWeapons();
        this.updateProjectiles(effectiveDt);
        this.updatePickups(effectiveDt);
        this.updateParticles(effectiveDt);
        this.updateDamageNumbers(effectiveDt);
        this.updateGameJuice(dt); // Always real-time for juice effects
        if (this.player.health <= 0) this.gameOver();
        this.updateHUD();
    }

    // Game Juice - Screen shake, slowmo, kill streaks
    triggerScreenShake(intensity, duration = 0.2) {
        this.screenShake.intensity = Math.max(this.screenShake.intensity, intensity);
        this.screenShake.duration = Math.max(this.screenShake.duration, duration);
    }

    triggerSlowmo(factor = 0.3, duration = 0.5) {
        this.slowmo.active = true;
        this.slowmo.factor = factor;
        this.slowmo.duration = duration;
    }

    updateGameJuice(dt) {
        // Screen shake decay
        if (this.screenShake.duration > 0) {
            this.screenShake.duration -= dt;
            if (this.screenShake.duration <= 0) {
                this.screenShake.intensity = 0;
            }
        }

        // Slowmo decay
        if (this.slowmo.active && this.slowmo.duration > 0) {
            this.slowmo.duration -= dt;
            if (this.slowmo.duration <= 0) {
                this.slowmo.active = false;
                this.slowmo.factor = 1;
            }
        }

        // Kill streak decay
        if (this.killStreakTimer > 0) {
            this.killStreakTimer -= dt;
            if (this.killStreakTimer <= 0) {
                this.killStreak = 0;
            }
        }
    }

    // Aura Fire Circle - burns enemies that get close
    updateAuraFire(dt) {
        if (!this.auraFire) return;

        for (const e of this.enemies) {
            const sx = this.player.x + (e.wx - this.worldX);
            const sy = this.player.y + (e.wy - this.worldY);
            const dist = Math.sqrt((sx - this.player.x) ** 2 + (sy - this.player.y) ** 2);

            if (dist < this.auraFire.radius + e.radius) {
                // Apply burn if not already burning from aura
                if (!e.auraBurn) {
                    e.auraBurn = { timer: this.auraFire.burnDuration, dps: this.auraFire.damage };
                    e.hitFlash = 0.5;
                    this.spawnParticles(sx, sy, '#ff4400', 3);
                }
            }
        }

        // Process aura burns
        for (const e of this.enemies) {
            if (e.auraBurn && e.auraBurn.timer > 0) {
                e.auraBurn.timer -= dt;
                e.health -= this.auraFire.damage * dt;
                
                // Visual burn effect
                if (Math.random() < 0.1) {
                    const sx = this.player.x + (e.wx - this.worldX);
                    const sy = this.player.y + (e.wy - this.worldY);
                    this.spawnParticles(sx, sy, '#ff6600', 1);
                }
            }
        }
    }

    updateRegen(dt) {
        // Update combat timer
        this.combatTimer += dt;
        const inCombat = this.combatTimer < this.combatDuration;

        // Perk-based regen (1 HP per second) - DISABLED while in combat
        if (this.player.hpRegen > 0 && !inCombat) {
            this.regenTimer += dt;
            if (this.regenTimer >= 1) {
                this.regenTimer = 0;
                this.player.health = Math.min(this.player.maxHealth, this.player.health + this.player.hpRegen);
            }
        }

        // Regeneration item (1 HP every X seconds based on level) - DISABLED while in combat
        if (this.regenEnabled && !inCombat) {
            this.itemRegenTimer = (this.itemRegenTimer || 0) + dt;
            if (this.itemRegenTimer >= this.regenInterval) {
                this.itemRegenTimer = 0;
                if (this.player.health < this.player.maxHealth) {
                    this.player.health = Math.min(this.player.maxHealth, this.player.health + 1);
                    this.damageNumbers.push({ x: this.player.x, y: this.player.y - 40, value: '💚 +1', lifetime: 0.6, color: '#44ff88' });
                }
            }
        }
    }

    // Check if player is in combat (for healing penalty)
    isInCombat() {
        return this.combatTimer < this.combatDuration;
    }

    // Apply healing with combat penalty
    applyHealing(amount) {
        if (this.isInCombat()) {
            amount = Math.floor(amount * (1 - this.combatHealingPenalty)); // 75% reduction
        }
        this.player.health = Math.min(this.player.maxHealth, this.player.health + amount);
        return amount;
    }

    updateChronoField(dt) {
        if (!this.augments.includes('time_stop')) return;

        this.chronoFieldTimer += dt;

        if (this.chronoFieldActive) {
            // Freeze is active - enemies are frozen
            if (this.chronoFieldTimer >= this.chronoFieldDuration) {
                // End freeze
                this.chronoFieldActive = false;
                this.chronoFieldTimer = 0;
                // Unfreeze enemies
                for (const e of this.enemies) {
                    e.frozen = false;
                }
            }
        } else {
            // Freeze is on cooldown
            if (this.chronoFieldTimer >= this.chronoFieldCooldown) {
                // Activate freeze
                this.chronoFieldActive = true;
                this.chronoFieldTimer = 0;
                // Freeze all enemies (except bosses)
                for (const e of this.enemies) {
                    if (!e.isBoss) e.frozen = true;
                }
                // Visual announcement
                this.damageNumbers.push({
                    x: this.player.x, y: this.player.y - 80,
                    value: '⏳ TIME FROZEN ⏳', lifetime: 2, color: '#00ccff', scale: 1.5
                });
                this.spawnParticles(this.player.x, this.player.y, '#00ccff', 30);
            }
        }
    }

    updateElementalCycle(dt) {
        if (!this.augments.includes('elemental_mastery')) return;

        this.elementalCycleTimer += dt;
        if (this.elementalCycleTimer >= 3) { // Cycle every 3 seconds
            this.elementalCycleTimer = 0;
            this.currentElement = (this.currentElement + 1) % 3;

            // Update orbital colors
            for (const o of this.orbitals) {
                o.element = this.elementNames[this.currentElement];
                o.color = this.elementColors[this.currentElement];
            }
        }
    }

    spawnHealthPacks() {
        const now = performance.now();
        if (now - this.lastHealthPackSpawn > this.healthPackInterval) {
            this.lastHealthPackSpawn = now;
            if (Math.random() < 0.3) { // 30% chance every 45s
                const angle = Math.random() * Math.PI * 2;
                const dist = 300 + Math.random() * 400;
                this.pickups.push({
                    wx: this.worldX + Math.cos(angle) * dist,
                    wy: this.worldY + Math.sin(angle) * dist,
                    xp: 0, radius: 14, color: '#ff4488', isItem: false, isHealth: true, healAmount: 40
                });
            }
        }
    }

    updateControlPoints(dt) {
        for (const cp of this.controlPoints) {
            if (cp.captured) continue;
            const sx = this.player.x + (cp.wx - this.worldX);
            const sy = this.player.y + (cp.wy - this.worldY);
            const d = Math.sqrt((sx - this.player.x) ** 2 + (sy - this.player.y) ** 2);

            if (d < cp.radius + this.player.radius) {
                cp.captureProgress += dt * 20; // Capture speed
                if (cp.captureProgress >= 100) {
                    cp.captured = true;
                    this.captureControlPoint();
                }
            } else {
                cp.captureProgress = Math.max(0, cp.captureProgress - dt * 10);
            }
        }
    }

    captureControlPoint() {
        this.playSound('capture');

        // Show Augment Menu instead of random
        // Filter available diamond augments based on prereqs?
        let available = this.diamondAugments.filter(a => !a.req || this[a.req] || (a.req === 'demonSet' && this.demonSetBonusActive));

        // If no diamond augments left or available, fallback to legendary perks
        if (available.length === 0) {
            available = this.availablePerks;
        }

        if (available.length > 0) {
            // Pick 3 random
            const choices = [];
            // Clone available to avoid modifying original array directly here if we want to pick w/o removing yet
            // But we want to ensure we don't pick duplicates in choices
            let pool = [...available];

            for (let i = 0; i < 3 && pool.length > 0; i++) {
                const idx = Math.floor(Math.random() * pool.length);
                choices.push(pool[idx]);
                pool.splice(idx, 1);
            }
            this.showAugmentMenu(choices, () => {
                this.spawnHorde();
                this.spawnControlPoint();
            });
        } else {
            // Just heal or XP if absolutely nothing left
            this.player.health = this.player.maxHealth;
            this.damageNumbers.push({ x: this.player.x, y: this.player.y, value: 'Fully Healed!', color: '#00ff00' });
            this.spawnHorde();
            this.spawnControlPoint();
        }
    }


    applyPerk(perk) {
        switch (perk.id) {
            case 'vampiric': this.vampiric = true; break;
            case 'doubleshot': this.weapons.bullet.count *= 2; break;
            case 'nuclear': this.weapons.bullet.damage = Math.floor(this.weapons.bullet.damage * 1.5); this.nuclear = true; break;
            case 'timewarp': this.timewarp = true; break;
            case 'goldenheart': this.player.maxHealth += 100; this.player.health += 100; this.player.hpRegen += 3; break;
            case 'magnetking': this.magnetRadius += 200; this.autoCollect = true; break;
            case 'berserk': this.berserk = true; break;
            case 'guardian': this.guardian = true; break;
            case 'inferno': this.inferno = true; break;
            case 'frozen': this.frozen = true; break;
        }
    }

    updatePlayer(dt) {
        let dx = 0, dy = 0;
        if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
        if (this.keys['s'] || this.keys['arrowdown']) dy += 1;
        if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
        if (this.keys['d'] || this.keys['arrowright']) dx += 1;
        if (this.joystick.dx || this.joystick.dy) { dx = this.joystick.dx; dy = this.joystick.dy; }
        if (dx && dy) { const len = Math.sqrt(dx * dx + dy * dy); dx /= len; dy /= len; }

        // Track last movement direction for shooting
        if (dx !== 0 || dy !== 0) {
            this.lastMoveDir = { x: dx, y: dy };
        }

        // Update sticky timer
        if (this.stickyTimer > 0) {
            this.stickyTimer -= dt;
        }

        // Update ice zones
        for (let i = this.iceZones.length - 1; i >= 0; i--) {
            this.iceZones[i].timer -= dt;
            if (this.iceZones[i].timer <= 0) {
                this.iceZones.splice(i, 1);
            }
        }

        // Check if player is stuck (sticky enemy hit)
        if (this.stickyTimer > 0) {
            // Player cannot move while stuck
            dx = 0;
            dy = 0;
        }

        // Check if player is in an ice zone (movement slow)
        let iceSlowMult = 1;
        for (const zone of this.iceZones) {
            const distToZone = Math.sqrt((this.worldX - zone.wx) ** 2 + (this.worldY - zone.wy) ** 2);
            if (distToZone < zone.radius) {
                iceSlowMult = 0.5; // 50% movement slow in ice zones
                break;
            }
        }

        // Calculate intended new position
        const moveX = dx * this.player.speed * iceSlowMult * dt;
        const moveY = dy * this.player.speed * iceSlowMult * dt;
        let newWorldX = this.worldX + moveX;
        let newWorldY = this.worldY + moveY;

        // Ring of Fire - check if crossing boundary
        if (this.ringOfFire.active) {
            // Ring moves with player, but if player tries to move beyond visible ring edge, they get burned
            // The ring is always at a fixed screen radius from player center
            // So effectively the ring moves with the player - no movement restriction
            // But we visually show the ring and damage if player is near edge
            // Let's instead make it: ring has fixed world position, player can't leave
            // Actually per user request: ring surrounds player, crossing it damages them
            // I'll interpret as: a visible ring at radius X, player moving past it = burn
            // But ring moves with player... so they can never cross? 
            // Better interpretation: ring is at fixed world position when spawned
            // Player must stay inside that world-space circle

            // Let's set ring center at spawn time
            if (!this.ringOfFire.centerX) {
                this.ringOfFire.centerX = this.worldX;
                this.ringOfFire.centerY = this.worldY;
            }

            const distFromCenter = Math.sqrt(
                (newWorldX - this.ringOfFire.centerX) ** 2 +
                (newWorldY - this.ringOfFire.centerY) ** 2
            );

            if (distFromCenter > this.ringOfFire.radius) {
                // Player is crossing the ring - apply burn and push back
                this.ringOfFire.burnTimer = this.ringOfFire.burnDuration;

                // Clamp to ring boundary
                const angle = Math.atan2(newWorldY - this.ringOfFire.centerY, newWorldX - this.ringOfFire.centerX);
                newWorldX = this.ringOfFire.centerX + Math.cos(angle) * (this.ringOfFire.radius - 5);
                newWorldY = this.ringOfFire.centerY + Math.sin(angle) * (this.ringOfFire.radius - 5);

                this.damageNumbers.push({
                    x: this.player.x,
                    y: this.player.y - 30,
                    value: '🔥 BURNING!',
                    lifetime: 0.5,
                    color: '#ff4400'
                });
            }
        }

        // Trap Square - restrict movement to square bounds
        if (this.trapSquare.active) {
            const bounds = this.checkTrapSquareBounds(newWorldX, newWorldY);
            newWorldX = bounds.x;
            newWorldY = bounds.y;
        }

        // Circle of Doom - restrict movement to shrinking circle
        if (this.circleOfDoom.active) {
            const bounds = this.checkCircleOfDoomBounds(newWorldX, newWorldY);
            newWorldX = bounds.x;
            newWorldY = bounds.y;
        }

        // Clamp to map boundaries (no more infinite kiting!)
        newWorldX = Math.max(this.mapBounds.minX, Math.min(this.mapBounds.maxX, newWorldX));
        newWorldY = Math.max(this.mapBounds.minY, Math.min(this.mapBounds.maxY, newWorldY));

        this.worldX = newWorldX;
        this.worldY = newWorldY;

        // Keep player centered
        this.player.x = this.canvas.width / 2;
        this.player.y = this.canvas.height / 2;

        if (this.player.invincibleTime > 0) this.player.invincibleTime -= dt;
    }

    updateShield(dt) {
        if (!this.shieldActive && this.items.shield) {
            this.shieldTimer += dt;
            if (this.shieldTimer >= this.shieldCooldown) { this.shieldActive = true; this.shieldTimer = 0; }
        }
    }

    spawnEnemies() {
        const now = performance.now();

        // MINIMUM 30 MOBS: If below 30, spawn immediately without cooldown
        // Swarm enemies keep the pressure on - they rapidly surround and overwhelm
        const MIN_ENEMIES = 30;
        const needsEmergencySpawn = this.enemies.length < MIN_ENEMIES;

        // Only check spawn rate if we're not in emergency spawn mode
        if (!needsEmergencySpawn && now - this.lastEnemySpawn < this.enemySpawnRate) return;
        this.lastEnemySpawn = now;

        // Spawn around player in world coordinates
        const angle = Math.random() * Math.PI * 2;
        const dist = 200 + Math.random() * 150; // Even closer spawns for more intense gameplay
        const wx = this.worldX + Math.cos(angle) * dist;
        const wy = this.worldY + Math.sin(angle) * dist;

        // Swarm is default from wave 1 - they rapidly spawn and try to surround player
        const types = ['swarm', 'swarm', 'swarm', 'swarm'];
        if (this.wave >= 2) types.push('swarm', 'swarm', 'basic');
        if (this.wave >= 3) types.push('runner', 'runner', 'swarm');
        if (this.wave >= 4) types.push('tank', 'splitter', 'swarm');
        if (this.wave >= 5) types.push('bomber', 'splitter', 'swarm');
        // Add sticky, ice, and poison enemies to spawn pool
        if (this.wave >= 6) types.push('sticky', 'sticky', 'swarm');
        if (this.wave >= 7) types.push('poison', 'poison'); // Poison enemies at wave 7+
        if (this.wave >= 8) types.push('ice', 'swarm');

        // Consumer boss spawns at wave 7+ (one time)
        if (this.wave >= 7 && !this.consumerSpawned) {
            this.spawnConsumer();
            this.consumerSpawned = true;
        }

        // Boss spawning logic - controlled per wave
        const isBossWave = this.wave >= 5 && this.wave % 5 === 0;
        const isGeneralWave = this.wave >= 20 && this.wave % 20 === 0;

        if (isBossWave && this.lastBossWave !== this.wave) {
            // Calculate how many bosses should spawn this wave
            const bossWaveNumber = Math.floor(this.wave / 5);
            const maxBossesThisWave = Math.min(bossWaveNumber, 5); // Cap at 5 bosses

            // If we're past the cap, increase boss stats
            if (bossWaveNumber > 5) {
                this.bossStatMultiplier = 1 + (bossWaveNumber - 5) * 0.2; // +20% per wave past cap
            }

            // Spawn Demonic General (1 per 20 waves)
            if (isGeneralWave && !this.generalSpawnedThisWave) {
                this.enemies.push(this.createBoss(wx, wy, 'general'));
                this.generalSpawnedThisWave = true;
                this.bossesSpawnedThisWave++;
            } else if (this.bossesSpawnedThisWave < maxBossesThisWave) {
                // Spawn normal boss
                this.enemies.push(this.createBoss(wx, wy, 'boss'));
                this.bossesSpawnedThisWave++;
            }

            // Mark this wave as processed if we've spawned all bosses
            if (this.bossesSpawnedThisWave >= maxBossesThisWave) {
                this.lastBossWave = this.wave;
            }
        } else {
            const type = types[Math.floor(Math.random() * types.length)];
            this.enemies.push(this.createEnemy(wx, wy, type));
        }
    }

    createEnemy(wx, wy, type, isSplit = false, isHorde = false) {
        // Scaling: early game is easier, late game (wave 10+) scales harder
        let waveMult;
        if (this.wave < GAME_SETTINGS.lateGameWave) {
            waveMult = 1 + (this.wave - 1) * GAME_SETTINGS.scalingPerWave;
        } else {
            // Early waves scaling + late game scaling for waves beyond 10
            const earlyScaling = (GAME_SETTINGS.lateGameWave - 1) * GAME_SETTINGS.scalingPerWave;
            const lateWaves = this.wave - GAME_SETTINGS.lateGameWave;
            waveMult = 1 + earlyScaling + lateWaves * GAME_SETTINGS.scalingPerWaveLate;
        }
        const data = {
            // Swarm is now the default enemy from wave 1 - smaller, faster spawns, surrounds player
            swarm: { radius: 5, speed: 95, health: 20, damage: 10, xp: 2, color: '#ff66aa', icon: '' },
            basic: { radius: 12, speed: 85, health: 30, damage: 15, xp: 6, color: '#ff4466', icon: '' },
            runner: { radius: 10, speed: 180, health: 40, damage: 10, xp: 5, color: '#00ffff', icon: '💨' },
            tank: { radius: 28, speed: 50, health: 350, damage: 31, xp: 25, color: '#8844ff', icon: '' },
            splitter: { radius: 20, speed: 70, health: 150, damage: 19, xp: 15, color: '#44ddff', icon: '💧', splits: true },
            bomber: { radius: 16, speed: 90, health: 75, damage: 13, xp: 12, color: '#ff8800', icon: '💣', explodes: true },
            mini: { radius: 6, speed: 120, health: 25, damage: 8, xp: 3, color: '#44ddff', icon: '' },
            // New enemy types
            sticky: { radius: 12, speed: 100, health: 50, damage: 6, xp: 8, color: '#88ff00', icon: '🍯', stickies: true },
            ice: { radius: 32, speed: 45, health: 200, damage: 25, xp: 20, color: '#00ddff', icon: '🧊', freezesOnDeath: true },
            poison: { radius: 14, speed: 75, health: 80, damage: 12, xp: 10, color: '#00cc44', icon: '☣️', explodes: true, isPoisonous: true } // Green poison explosion
        }[type] || data.basic;

        const sizeMult = isSplit ? 0.6 : 1;
        // Horde enemies get +50% health and 20% slower speed
        const hordeHealthMult = isHorde ? 1.5 : 1;
        const hordeSpeedMult = isHorde ? 0.8 : 1;

        return {
            wx, wy, type,
            radius: Math.floor(data.radius * sizeMult),
            speed: Math.floor(data.speed * GAME_SETTINGS.enemySpeedMult * hordeSpeedMult),
            health: Math.floor(data.health * waveMult * GAME_SETTINGS.enemyHealthMult * sizeMult * hordeHealthMult),
            maxHealth: Math.floor(data.health * waveMult * GAME_SETTINGS.enemyHealthMult * sizeMult * hordeHealthMult),
            damage: Math.floor(data.damage * waveMult * GAME_SETTINGS.enemyDamageMult),
            xp: Math.floor(data.xp * waveMult),
            color: data.color, icon: data.icon || '', hitFlash: 0, isBoss: false,
            splits: data.splits || false,
            explodes: data.explodes || false,
            stickies: data.stickies || false,
            freezesOnDeath: data.freezesOnDeath || false,
            isHorde: isHorde
        };
    }

    createBoss(wx, wy, type = 'boss') {
        // Scaling: early game is easier, late game (wave 10+) scales harder
        let waveMult;
        if (this.wave < GAME_SETTINGS.lateGameWave) {
            waveMult = 1 + this.wave * GAME_SETTINGS.scalingPerWave;
        } else {
            const earlyScaling = GAME_SETTINGS.lateGameWave * GAME_SETTINGS.scalingPerWave;
            const lateWaves = this.wave - GAME_SETTINGS.lateGameWave;
            waveMult = 1 + earlyScaling + lateWaves * GAME_SETTINGS.scalingPerWaveLate;
        }

        let name = `${BOSS_PREFIXES[Math.floor(Math.random() * BOSS_PREFIXES.length)]} ${BOSS_NAMES[Math.floor(Math.random() * BOSS_NAMES.length)]} ${BOSS_SUFFIXES[Math.floor(Math.random() * BOSS_SUFFIXES.length)]}`;
        let face = '😈';
        let color = '#ff0044';
        let stats = { health: 12500, damage: 50, speed: 75, radius: 80, xp: 500 }; // 5x health, faster speed

        if (type === 'general') {
            name = `DEMON GENERAL ${BOSS_NAMES[Math.floor(Math.random() * BOSS_NAMES.length)]}`;
            face = '👹';
            color = '#8800ff';
            stats = { health: 30000, damage: 80, speed: 90, radius: 100, xp: 2000 }; // 5x health, faster speed
        } else {
            const faces = ['😈', '👹', '💀', '👿', '🤡', '👺', '☠️', '🔥'];
            face = faces[Math.floor(Math.random() * faces.length)];
            stats.radius += this.wave * 8;
        }

        // Crit Resistance (Max 75% at wave 25)
        const critResist = Math.min(0.75, (this.wave * 0.03));

        // Apply stat multiplier for waves past boss cap
        const statMult = this.bossStatMultiplier || 1.0;

        return {
            wx, wy, type, name,
            face,
            radius: stats.radius,
            speed: Math.floor(stats.speed * GAME_SETTINGS.enemySpeedMult), // Speed does NOT scale
            health: Math.floor(stats.health * waveMult * GAME_SETTINGS.enemyHealthMult * statMult),
            maxHealth: Math.floor(stats.health * waveMult * GAME_SETTINGS.enemyHealthMult * statMult),
            damage: Math.floor(stats.damage * waveMult * GAME_SETTINGS.enemyDamageMult * statMult),
            xp: Math.floor(stats.xp * waveMult),
            color, hitFlash: 0, isBoss: true,
            critResistance: critResist
        };
    }

    updateEnemies(dt) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];

            // Calculate screen position (needed for death effects too)
            const sx = this.player.x + (e.wx - this.worldX);
            const sy = this.player.y + (e.wy - this.worldY);

            // Check death FIRST (before freeze check) so frozen enemies can die
            if (e.health <= 0) {
                this.handleEnemyDeath(e, sx, sy, i);
                continue;
            }

            // Handle freeze timer (from Frost Bullets item or Chrono Field)
            if (e.frozen) {
                if (e.frozenTimer !== undefined) {
                    e.frozenTimer -= dt;
                    if (e.frozenTimer <= 0) {
                        e.frozen = false;
                        e.frozenTimer = 0;
                    }
                }
                if (e.hitFlash > 0) e.hitFlash -= dt * 5;
                continue; // Skip movement and collision for frozen enemies
            }

            // Normal enemy - Move towards player (world coords)
            const dx = this.worldX - e.wx, dy = this.worldY - e.wy;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d > 0) { e.wx += (dx / d) * e.speed * dt; e.wy += (dy / d) * e.speed * dt; }
            if (e.hitFlash > 0) e.hitFlash -= dt * 5;
            // Update screen position after movement
            const sxMoved = this.player.x + (e.wx - this.worldX);
            const syMoved = this.player.y + (e.wy - this.worldY);

            // Apply time warp perk
            const speedMult = this.timewarp ? 0.7 : 1;

            // Collision with player (use updated position)
            const pd = Math.sqrt((sxMoved - this.player.x) ** 2 + (syMoved - this.player.y) ** 2);
            if (pd < e.radius + this.player.radius && this.player.invincibleTime <= 0) {
                if (this.shieldActive) { this.shieldActive = false; this.shieldTimer = 0; this.spawnParticles(this.player.x, this.player.y, '#00aaff', 10); }
                else {
                    this.player.health -= e.damage;
                    this.player.invincibleTime = 0.5;
                    this.combatTimer = 0; // Reset combat timer - healing reduced for 3s
                    this.damageNumbers.push({ x: this.player.x, y: this.player.y - 20, value: -e.damage, lifetime: 1, color: '#ff4444' });
                    this.playSound('hit');

                    // Thorn Armor: reflect damage back to enemy
                    if (this.thornDamage > 0) {
                        const reflected = Math.floor(e.damage * this.thornDamage);
                        e.health -= reflected;
                        e.hitFlash = 1;
                        this.damageNumbers.push({ x: sxMoved, y: syMoved - 20, value: `🌹 ${reflected}`, lifetime: 0.8, color: '#ff66aa' });
                        this.spawnParticles(sxMoved, syMoved, '#ff66aa', 5);
                    }

                    // Sticky enemy effect: immobilize player for 3 seconds
                    if (e.stickies && this.stickyTimer <= 0) {
                        this.stickyTimer = 3; // 3 seconds immobilized
                        this.damageNumbers.push({
                            x: this.player.x, y: this.player.y - 50,
                            value: '🍯 STUCK!', lifetime: 2, color: '#88ff00', scale: 1.5
                        });
                    }
                }
            }

            // Inferno aura damage
            if (this.inferno && pd < 100) {
                e.health -= 5 * dt;
            }

            // Imp Burn (True Damage)
            if (e.impBurn) {
                e.impBurn.duration -= dt;
                const tick = e.impBurn.dps * dt;
                e.health -= tick;
                if (e.impBurn.duration <= 0) delete e.impBurn;
                // Visual effect for burn?
                if (Math.random() < 0.1) this.spawnParticles(sxMoved, syMoved, '#ff4400', 3);
            }

            // Dead
            if (e.health <= 0) {
                this.handleEnemyDeath(e, sxMoved, syMoved, i);
            }
        }
    }

    handleEnemyDeath(e, sx, sy, index) {
        this.player.kills++;
        this.playSound('kill');

        // Aura Fire kill tracking and upgrades
        if (this.auraFire) {
            this.auraFire.kills++;
            if (this.auraFire.kills >= 50 && this.auraFire.level < 10) {
                this.auraFire.level++;
                this.auraFire.damage += 10;
                this.auraFire.radius += 5;
                this.auraFire.kills = 0;
                this.damageNumbers.push({ x: this.player.x, y: this.player.y - 60, value: `🔥 AURA LVL ${this.auraFire.level}!`, lifetime: 2, color: '#ff6600', scale: 1.5 });
            }
        }

        // Stacking items - add kills
        this.updateStackingItems('kill', e.isBoss ? 5 : 1);

        // GAME JUICE: Kill streak and effects
        this.killStreak++;
        this.killStreakTimer = 2; // Reset streak timer

        // Screen shake and slowmo ONLY on boss kills
        if (e.isBoss) {
            this.triggerScreenShake(15, 0.4);
            this.triggerSlowmo(0.15, 1.2); // Epic slowmo for boss kills
            
            // Boss death message and revenge horde
            this.damageNumbers.push({ 
                x: sx, y: sy - 60, 
                value: '💀 I WILL RETURN!', 
                lifetime: 2, 
                color: '#ff0000', 
                scale: 2.5 
            });
            this.damageNumbers.push({ 
                x: sx, y: sy - 30, 
                value: '⚔️ AVENGE ME WARRIORS!', 
                lifetime: 2, 
                color: '#ff4400', 
                scale: 2 
            });
            
            // Spawn revenge horde
            setTimeout(() => this.spawnHorde(), 500);
        }

        // Death pop effect - scale up then burst
        this.deathPops = this.deathPops || [];
        this.deathPops.push({
            x: sx, y: sy,
            radius: e.radius,
            maxRadius: e.radius * 1.8,
            color: e.color,
            alpha: 1,
            timer: 0.15
        });

        // Dotomancer Conversion
        if (this.conversionChance > 0 && Math.random() < this.conversionChance) {
            if (this.minions.length < (this.maxMinions || 5) + 5) {
                const undead = {
                    x: sx, y: sy,
                    radius: e.radius,
                    speed: e.speed * 0.8,
                    damage: Math.floor(e.damage * 0.5),
                    health: Math.floor(e.maxHealth * 0.25),
                    maxHealth: Math.floor(e.maxHealth * 0.25),
                    color: '#88ff88',
                    icon: '🧟',
                    isRanged: false,
                    target: null,
                    attackCooldown: 0,
                    lifetime: 20
                };
                if (this.selectedClass.bonuses.minionDamage) undead.damage = Math.floor(undead.damage * this.selectedClass.bonuses.minionDamage);
                this.minions.push(undead);
                this.spawnParticles(sx, sy, '#88ff88', 10);
                this.damageNumbers.push({ x: sx, y: sy - 20, value: 'Rise!', lifetime: 1, color: '#88ff88' });
            }
        }

        // Vampiric perk (from augments) - reduced by 75% while in combat
        if (this.vampiric) {
            let healAmt = 2;
            if (this.isInCombat()) healAmt = Math.floor(healAmt * (1 - this.combatHealingPenalty));
            if (healAmt > 0) this.player.health = Math.min(this.player.maxHealth, this.player.health + healAmt);
        }

        // Vampire Fang item: heal on kill - reduced by 75% while in combat
        if (this.vampiricHeal > 0) {
            let healAmt = this.vampiricHeal;
            if (this.isInCombat()) healAmt = Math.floor(healAmt * (1 - this.combatHealingPenalty));
            const healed = Math.min(healAmt, this.player.maxHealth - this.player.health);
            if (healed > 0) {
                this.player.health += healed;
                this.damageNumbers.push({ x: this.player.x, y: this.player.y - 35, value: `+${healed}`, lifetime: 0.5, color: this.isInCombat() ? '#ff8888' : '#ff4488' });
            }
        }

        // Necro Set Bonus: enemies explode on death
        if (this.necroExplosion && !e.isBoss) {
            this.spawnParticles(sx, sy, '#aa44ff', 15);
            // Damage nearby enemies
            for (const other of this.enemies) {
                if (other === e) continue;
                const osx = this.player.x + (other.wx - this.worldX);
                const osy = this.player.y + (other.wy - this.worldY);
                const od = Math.sqrt((sx - osx) ** 2 + (sy - osy) ** 2);
                if (od < 60) {
                    other.health -= 30;
                    other.hitFlash = 1;
                }
            }
        }

        // Splitter spawns mini enemies
        if (e.splits) {
            for (let j = 0; j < 3; j++) {
                const angle = (j / 3) * Math.PI * 2;
                const mini = this.createEnemy(e.wx + Math.cos(angle) * 20, e.wy + Math.sin(angle) * 20, 'mini', true);
                this.enemies.push(mini);
            }
        }

        // Bomber explodes (orange) or Poison explodes (green)
        if (e.explodes) {
            const explosionColor = e.isPoisonous ? '#00ff44' : '#ff8800';
            const explosionRadius = e.isPoisonous ? 100 : 80;
            this.spawnParticles(sx, sy, explosionColor, e.isPoisonous ? 30 : 20);
            
            // Poison has larger green explosion visual
            if (e.isPoisonous) {
                // Create poison cloud effect
                for (let p = 0; p < 12; p++) {
                    const angle = (p / 12) * Math.PI * 2;
                    const dist = 30 + Math.random() * 40;
                    this.particles.push({
                        x: sx + Math.cos(angle) * dist,
                        y: sy + Math.sin(angle) * dist,
                        vx: Math.cos(angle) * 20,
                        vy: Math.sin(angle) * 20,
                        radius: 8 + Math.random() * 6,
                        color: '#00cc44',
                        lifetime: 1.5
                    });
                }
            }
            
            const pd = Math.sqrt((sx - this.player.x) ** 2 + (sy - this.player.y) ** 2);
            if (pd < explosionRadius) {
                const dmg = Math.floor(e.damage * (e.isPoisonous ? 2 : 1.5));
                this.player.health -= dmg;
                this.combatTimer = 0; // Reset combat timer
                this.damageNumbers.push({ 
                    x: this.player.x, 
                    y: this.player.y - 20, 
                    value: e.isPoisonous ? `☣️ ${-dmg}` : -dmg, 
                    lifetime: 1, 
                    color: explosionColor 
                });
            }
        }

        // Ice mob creates icy zone on death (slows player movement)
        if (e.freezesOnDeath) {
            const iceRadius = e.radius * 3; // Zone is 3x the mob's size
            this.iceZones.push({
                wx: e.wx,
                wy: e.wy,
                radius: iceRadius,
                duration: 8, // Lasts 8 seconds
                timer: 8
            });
            this.spawnParticles(sx, sy, '#00ddff', 25);
            this.damageNumbers.push({
                x: sx, y: sy - 20,
                value: '❄️ ICY ZONE!', lifetime: 2, color: '#00ddff', scale: 1.3
            });
        }

        // Nuclear perk - enemies explode
        if (this.nuclear) {
            this.spawnParticles(sx, sy, '#ffff00', 15);
            for (const other of this.enemies) {
                if (other === e) continue;
                const osx = this.player.x + (other.wx - this.worldX);
                const osy = this.player.y + (other.wy - this.worldY);
                const od = Math.sqrt((sx - osx) ** 2 + (sy - osy) ** 2);
                if (od < 60) other.health -= 15;
            }
        }

        const xpGain = Math.floor(e.xp * this.xpMultiplier);
        this.pickups.push({ wx: e.wx, wy: e.wy, xp: xpGain, radius: 8, color: '#d4e600', isItem: false }); // Yellow-green XP
        this.spawnParticles(sx, sy, e.color, 10);

        // Regular enemy item drops (base 1% chance, increased by luckyCharm)
        const dropChance = this.itemDropChance || 0.01;
        if (!e.isBoss && Math.random() < dropChance) {
            this.dropItem(e.wx, e.wy);
        }

        // Boss drops item
        if (e.isBoss) {
            if (e.type === 'general') {
                const missing = DEMON_SET_PIECES.filter(p => !this.demonSet[p.id]);
                if (missing.length > 0) {
                    const piece = missing[Math.floor(Math.random() * missing.length)];
                    this.pickups.push({
                        wx: e.wx, wy: e.wy,
                        radius: 12, color: '#ff0044',
                        isDemonPiece: true, pieceId: piece.id
                    });
                } else {
                    this.dropItem(e.wx, e.wy);
                }
            } else {
                this.dropItem(e.wx, e.wy);
            }
        }
        this.enemies.splice(index, 1);
    }

    dropItem(wx, wy) {
        // Only drop items that haven't been collected yet
        const allKeys = Object.keys(STACKING_ITEMS);
        const availableKeys = allKeys.filter(key => !this.droppedItems.includes(key));
        
        if (availableKeys.length === 0) return; // All items already dropped
        
        const itemKey = availableKeys[Math.floor(Math.random() * availableKeys.length)];
        this.pickups.push({ wx, wy, xp: 0, radius: 15, color: '#fbbf24', isItem: true, itemKey });
    }

    updateOrbitals(dt) {
        this.orbitals.forEach(o => {
            o.angle += o.speed * dt;
            const ox = this.player.x + Math.cos(o.angle) * o.radius;
            const oy = this.player.y + Math.sin(o.angle) * o.radius;

            // Black Hole Effect: Pull enemies
            if (this.augments.includes('black_hole')) {
                for (const e of this.enemies) {
                    const sx = this.player.x + (e.wx - this.worldX);
                    const sy = this.player.y + (e.wy - this.worldY);
                    const d = Math.sqrt((ox - sx) ** 2 + (oy - sy) ** 2);
                    if (d < 200) { // Pull range
                        const pullForce = 150 * (1 - d / 200); // Stronger closer
                        const ang = Math.atan2(oy - sy, ox - sx);
                        e.wx += Math.cos(ang) * pullForce * dt;
                        e.wy += Math.sin(ang) * pullForce * dt;
                    }
                }
            }

            // Check collision with enemies
            for (const e of this.enemies) {
                const sx = this.player.x + (e.wx - this.worldX);
                const sy = this.player.y + (e.wy - this.worldY);
                const d = Math.sqrt((ox - sx) ** 2 + (oy - sy) ** 2);
                if (d < o.size + e.radius) {
                    e.health -= o.damage; e.hitFlash = 1;

                    // Elemental effects
                    if (o.element === 'fire') {
                        // Fire: Burn damage
                        e.health -= o.damage * 0.5;
                        this.spawnParticles(sx, sy, '#ff4400', 5);
                        this.damageNumbers.push({ x: sx, y: sy - 10, value: Math.floor(o.damage * 1.5), lifetime: 0.6, color: '#ff4400' });
                    } else if (o.element === 'ice') {
                        // Ice: Slow enemy
                        e.speed = Math.max(20, e.speed * 0.7);
                        this.spawnParticles(sx, sy, '#00ccff', 5);
                        this.damageNumbers.push({ x: sx, y: sy - 10, value: o.damage, lifetime: 0.6, color: '#00ccff' });
                    } else if (o.element === 'lightning') {
                        // Lightning: Chain to nearby enemy
                        let chainTarget = null;
                        let chainDist = 150;
                        for (const other of this.enemies) {
                            if (other === e) continue;
                            const otherSx = this.player.x + (other.wx - this.worldX);
                            const otherSy = this.player.y + (other.wy - this.worldY);
                            const chainD = Math.sqrt((sx - otherSx) ** 2 + (sy - otherSy) ** 2);
                            if (chainD < chainDist) {
                                chainDist = chainD;
                                chainTarget = other;
                            }
                        }
                        if (chainTarget) {
                            chainTarget.health -= Math.floor(o.damage * 0.5);
                            chainTarget.hitFlash = 1;
                        }
                        this.spawnParticles(sx, sy, '#ffff00', 5);
                        this.damageNumbers.push({ x: sx, y: sy - 10, value: o.damage, lifetime: 0.6, color: '#ffff00' });
                    } else {
                        this.damageNumbers.push({ x: sx, y: sy - 10, value: o.damage, lifetime: 0.6, color: '#aa44ff' });
                    }
                }
            }
        });
    }

    updateStars(dt) {
        this.stars.forEach(s => {
            s.angle += s.speed * dt;
            const sx = this.player.x + Math.cos(s.angle) * s.radius;
            const sy = this.player.y + Math.sin(s.angle) * s.radius;
            // Check collision with enemies
            for (const e of this.enemies) {
                const ex = this.player.x + (e.wx - this.worldX);
                const ey = this.player.y + (e.wy - this.worldY);
                const d = Math.sqrt((sx - ex) ** 2 + (sy - ey) ** 2);
                if (d < s.size + e.radius) {
                    e.health -= s.damage; e.hitFlash = 1;
                    this.damageNumbers.push({ x: ex, y: ey - 10, value: s.damage, lifetime: 0.6, color: '#ffdd00' });
                }
            }
        });
    }

    updateMinions(dt) {
        // Respawn logic
        if (this.maxMinions > 0 && this.minions.length < this.maxMinions) {
            if (!this.minionRespawnTimer) this.minionRespawnTimer = 0;
            this.minionRespawnTimer += dt;
            if (this.minionRespawnTimer >= 15) {
                this.minionRespawnTimer = 0;
                this.addMinion('guard');
            }
        }
    }

    updateImps(dt) {
        if (!this.demonSetBonusActive) return;

        // Spawn
        if (this.imps.length < this.impStats.maxImps) {
            this.impSpawnTimer += dt;
            if (this.impSpawnTimer >= this.impStats.spawnInterval) {
                this.impSpawnTimer = 0;
                const angle = Math.random() * Math.PI * 2;
                this.imps.push({
                    x: this.player.x + Math.cos(angle) * 40,
                    y: this.player.y + Math.sin(angle) * 40,
                    radius: 8, speed: 250,
                    color: '#ff4400',
                    lifetime: 10
                });
                this.spawnParticles(this.player.x, this.player.y, '#ff4400', 5);
            }
        }

        // Update
        for (let i = this.imps.length - 1; i >= 0; i--) {
            const imp = this.imps[i];
            imp.lifetime -= dt;
            if (imp.lifetime <= 0) { this.imps.splice(i, 1); continue; }

            // Seek nearest
            let nearest = null, nd = Infinity;
            for (const e of this.enemies) {
                const sx = this.player.x + (e.wx - this.worldX);
                const sy = this.player.y + (e.wy - this.worldY);
                const d = Math.sqrt((imp.x - sx) ** 2 + (imp.y - sy) ** 2);
                if (d < nd) { nd = d; nearest = { e, sx, sy }; }
            }

            if (nearest && nd < 400) {
                const dx = nearest.sx - imp.x, dy = nearest.sy - imp.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    imp.x += (dx / dist) * imp.speed * dt;
                    imp.y += (dy / dist) * imp.speed * dt;
                }

                // Contact
                if (dist < 20 + nearest.e.radius) {
                    // Explode
                    this.spawnParticles(imp.x, imp.y, '#ff4400', 15);
                    this.playSound('shoot'); // boom sound ideally

                    nearest.e.health -= this.impStats.damage; // True damage checks? Armor? No armor mainly.
                    nearest.e.hitFlash = 1;
                    this.damageNumbers.push({ x: nearest.sx, y: nearest.sy - 20, value: this.impStats.damage, color: '#ff4400', scale: 1.2 });

                    // Apply Burn (True Damage)
                    nearest.e.impBurn = {
                        duration: this.impStats.burnDuration,
                        dps: nearest.e.maxHealth * 0.01 // 1% max hp per second
                    };

                    this.imps.splice(i, 1);
                }
            } else {
                // Follow player
                const dx = this.player.x - imp.x, dy = this.player.y - imp.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 60) {
                    imp.x += (dx / dist) * imp.speed * dt;
                    imp.y += (dy / dist) * imp.speed * dt;
                }
            }
        }
    }

    updateActiveMinions(dt) {
        for (let i = this.minions.length - 1; i >= 0; i--) {
            const m = this.minions[i];

            if (m.health <= 0) {
                this.spawnParticles(m.x, m.y, m.color, 10);
                this.minions.splice(i, 1);
                continue;
            }

            // Guard Logic: Stay near player, seek enemy if close
            const distToPlayer = Math.sqrt((m.x - this.player.x) ** 2 + (m.y - this.player.y) ** 2);
            let target = null;
            let moveTarget = null;

            // Find nearest enemy in range
            let nd = Infinity;
            for (const e of this.enemies) {
                const sx = this.player.x + (e.wx - this.worldX);
                const sy = this.player.y + (e.wy - this.worldY);
                const d = Math.sqrt((m.x - sx) ** 2 + (m.y - sy) ** 2);
                if (d < 300 && d < nd) { nd = d; target = e; moveTarget = { x: sx, y: sy }; }
            }

            // Move logic
            if (target) {
                // Chase enemy
                const dx = moveTarget.x - m.x, dy = moveTarget.y - m.y, d = Math.sqrt(dx * dx + dy * dy);
                if (d > 0) { m.x += (dx / d) * m.speed * dt; m.y += (dy / d) * m.speed * dt; }
            } else if (distToPlayer > 100) {
                // Return to player (orbit loosely)
                const angle = Math.atan2(this.player.y - m.y, this.player.x - m.x);
                m.x += Math.cos(angle) * m.speed * dt;
                m.y += Math.sin(angle) * m.speed * dt;
            }

            // Attack cooldown
            if (m.attackCooldown > 0) m.attackCooldown -= dt;

            // Attack
            if (target && nd < m.radius + target.radius + 15 && m.attackCooldown <= 0) {
                m.attackCooldown = 0.8;
                target.health -= m.damage;
                target.hitFlash = 1;
                this.damageNumbers.push({ x: moveTarget.x, y: moveTarget.y - 10, value: m.damage, lifetime: 0.5, color: '#44ff88' });
            }
        }
    }

    fireWeapons() {
        const now = performance.now(), w = this.weapons.bullet;
        if (now - w.lastFired < w.fireRate) return;
        w.lastFired = now;

        // Auto-aim at nearest enemy
        let nearest = null, nd = Infinity;
        for (const e of this.enemies) {
            const sx = this.player.x + (e.wx - this.worldX);
            const sy = this.player.y + (e.wy - this.worldY);
            const d = Math.sqrt((sx - this.player.x) ** 2 + (sy - this.player.y) ** 2);
            if (d < nd) { nd = d; nearest = { sx, sy }; }
        }
        if (!nearest) return;

        const baseAngle = Math.atan2(nearest.sy - this.player.y, nearest.sx - this.player.x);

        this.playSound('shoot');

        // Calculate total bullet count (base + multi-shot item)
        const totalBullets = w.count + (this.extraBullets || 0);
        // Apply damage multiplier from Damage Amp item
        const finalDamage = Math.floor(w.damage * (this.damageMultiplier || 1));
        // Calculate pierce (base + Piercing Shot item)
        const totalPierce = w.pierce + (this.bulletPierce || 0);

        for (let i = 0; i < totalBullets; i++) {
            const offset = (i - (totalBullets - 1) / 2) * 0.15;
            const a = baseAngle + offset;
            this.projectiles.push({
                x: this.player.x,
                y: this.player.y,
                vx: Math.cos(a) * w.speed,
                vy: Math.sin(a) * w.speed,
                radius: w.size,
                damage: finalDamage,
                pierce: totalPierce,
                color: w.color,
                hitEnemies: [],
                canExplode: this.bulletExplosion || false,
                canFreeze: (this.freezeChance || 0) > 0
            });
        }
    }

    updateProjectiles(dt) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx * dt; p.y += p.vy * dt;
            // Remove if too far from player (short range for close combat gameplay)
            if (Math.abs(p.x - this.player.x) > 175 || Math.abs(p.y - this.player.y) > 175) { this.projectiles.splice(i, 1); continue; }
            for (const e of this.enemies) {
                if (p.hitEnemies.includes(e)) continue;
                const sx = this.player.x + (e.wx - this.worldX);
                const sy = this.player.y + (e.wy - this.worldY);
                const d = Math.sqrt((p.x - sx) ** 2 + (p.y - sy) ** 2);
                if (d < p.radius + e.radius) {
                    // Crit Calculation - also check critRing item bonus
                    let damage = p.damage;
                    
                    // Stacking item damage bonus
                    if (this.stackingDamageBonus) {
                        damage = Math.floor(damage * (1 + this.stackingDamageBonus));
                    }
                    
                    // Titan Killer bonus damage to bosses and tanks
                    if (this.titanKillerBonus && (e.isBoss || e.type === 'tank')) {
                        damage = Math.floor(damage * (1 + this.titanKillerBonus));
                    }
                    
                    // Stacking crit bonus
                    const critChance = (this.weapons.bullet.critChance || 0.05) + (this.critChance || 0) + (this.stackingCritBonus || 0);
                    const isCrit = Math.random() < critChance;
                    let color = '#fff';
                    let text = damage;

                    if (isCrit) {
                        const multiplier = this.weapons.bullet.critMultiplier || 2.0;
                        damage = Math.floor(damage * multiplier);
                        color = '#ff0000';
                        text = `💥 ${damage}`;
                    }

                    e.health -= damage; e.hitFlash = 1;
                    p.hitEnemies.push(e);

                    // Track damage for stacking items
                    this.updateStackingItems('damage', damage);

                    this.damageNumbers.push({
                        x: sx,
                        y: sy - 10,
                        value: text,
                        lifetime: isCrit ? 1.0 : 0.6,
                        color: color,
                        scale: isCrit ? 1.5 : 1
                    });

                    if (isCrit) this.spawnParticles(p.x, p.y, '#ff0000', 5);
                    else this.spawnParticles(p.x, p.y, '#fff', 3);

                    // Freeze effect from Frost Bullets item
                    if (p.canFreeze && this.freezeChance && Math.random() < this.freezeChance) {
                        e.frozen = true;
                        e.frozenTimer = 2; // Frozen for 2 seconds
                        this.spawnParticles(sx, sy, '#00ddff', 8);
                        this.damageNumbers.push({ x: sx, y: sy - 30, value: '❄️', lifetime: 1, color: '#00ddff' });
                    }

                    // Explosion effect from Explosive Rounds item
                    if (p.canExplode && this.bulletExplosion) {
                        const expRadius = this.explosionRadius || 40;
                        this.spawnParticles(sx, sy, '#ff8800', 15);
                        // Damage all nearby enemies
                        for (const other of this.enemies) {
                            if (other === e) continue;
                            const osx = this.player.x + (other.wx - this.worldX);
                            const osy = this.player.y + (other.wy - this.worldY);
                            const od = Math.sqrt((sx - osx) ** 2 + (sy - osy) ** 2);
                            if (od < expRadius) {
                                const splashDmg = Math.floor(damage * 0.5);
                                other.health -= splashDmg;
                                other.hitFlash = 1;
                                this.damageNumbers.push({ x: osx, y: osy - 10, value: splashDmg, lifetime: 0.5, color: '#ff8800' });
                            }
                        }
                    }

                    if (p.hitEnemies.length >= p.pierce) { this.projectiles.splice(i, 1); break; }
                }
            }

        }
    }

    updatePickups(dt) {
        for (let i = this.pickups.length - 1; i >= 0; i--) {
            const pk = this.pickups[i];
            const sx = this.player.x + (pk.wx - this.worldX);
            const sy = this.player.y + (pk.wy - this.worldY);
            const dx = this.player.x - sx, dy = this.player.y - sy, d = Math.sqrt(dx * dx + dy * dy);

            // Auto-collect with magnet king perk for XP
            const magnetDist = this.autoCollect && !pk.isItem && !pk.isHealth ? Infinity : this.magnetRadius;

            if (d < magnetDist) { pk.wx += (dx / d) * 350 * dt; pk.wy += (dy / d) * 350 * dt; }
            if (d < this.player.radius + pk.radius) {
                if (pk.isItem) {
                    this.collectItem(pk.itemKey);
                } else if (pk.isHealth) {
                    // Health pack - reduced by 75% while in combat
                    let healAmount = pk.healAmount;
                    if (this.isInCombat()) {
                        healAmount = Math.floor(healAmount * (1 - this.combatHealingPenalty));
                    }
                    const healed = Math.min(healAmount, this.player.maxHealth - this.player.health);
                    this.player.health += healed;
                    const combatText = this.isInCombat() ? ' (combat)' : '';
                    this.damageNumbers.push({ x: this.player.x, y: this.player.y - 30, value: `+${healed} HP${combatText}`, lifetime: 1.5, color: this.isInCombat() ? '#ff8888' : '#ff4488' });
                } else if (pk.isDemonPiece) {
                    // Demon Piece Collection
                    if (!this.demonSet[pk.pieceId]) {
                        this.demonSet[pk.pieceId] = true;
                        this.playSound('levelup'); // Reusing sound

                        // Apply piece bonus
                        const piece = DEMON_SET_PIECES.find(p => p.id === pk.pieceId);
                        if (piece.id === 'helm') this.player.maxHealth += 500; this.player.health += 500;
                        if (piece.id === 'boots') this.player.speed += 50;

                        this.damageNumbers.push({
                            x: this.player.x, y: this.player.y - 80,
                            value: `EQUIPPED: ${piece.name}`, lifetime: 3, color: '#ff0044', scale: 1.5
                        });

                        // Check Full Set
                        if (this.demonSet.helm && this.demonSet.chest && this.demonSet.boots && !this.demonSetBonusActive) {
                            this.demonSetBonusActive = true;
                            this.damageNumbers.push({
                                x: this.player.x, y: this.player.y - 120,
                                value: `🔥 HELLFIRE SET ACTIVE! 🔥`, lifetime: 4, color: '#ff0044', scale: 2.0
                            });
                        }
                    }
                } else {
                    this.player.xp += pk.xp;
                    this.playSound('xp'); // Play coin sound when collecting XP
                    this.checkLevelUp();
                }
                this.pickups.splice(i, 1);
            }
        }
    }

    collectItem(key) {
        const item = STACKING_ITEMS[key];
        if (!item) return;
        
        // First time picking up this item - show info popup
        if (!this.stackingItems[key]) {
            this.stackingItems[key] = { stacks: 0, evolved: false };
            this.droppedItems.push(key);
            this.showItemPickupPopup(key);
            return;
        }
    }
    
    showItemPickupPopup(key) {
        const item = STACKING_ITEMS[key];
        this.gamePaused = true;
        this.pendingItemKey = key;
        
        // Create popup HTML
        const popup = document.createElement('div');
        popup.id = 'item-popup';
        popup.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.9); display: flex; justify-content: center;
            align-items: center; z-index: 200; animation: fadeIn 0.3s ease;
        `;
        const stackTypeText = item.stackType === 'damage' ? 'STACKS WITH DAMAGE DEALT' : 'STACKS WITH KILLS';
        const stackTypeIcon = item.stackType === 'damage' ? '⚔️' : '💀';
        const maxStacksFormatted = item.maxStacks >= 1000 ? `${(item.maxStacks / 1000).toFixed(0)}k` : item.maxStacks;
        popup.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); border: 3px solid #fbbf24;
                border-radius: 20px; padding: 2rem; max-width: 400px; text-align: center;
                box-shadow: 0 0 50px rgba(251, 191, 36, 0.3);">
                <div style="font-size: 4rem; margin-bottom: 1rem;">${item.icon}</div>
                <h2 style="color: #fbbf24; font-size: 1.5rem; margin-bottom: 0.5rem;">${item.name}</h2>
                <p style="color: #aaa; font-size: 0.9rem; margin-bottom: 1.5rem;">${item.desc}</p>

                <div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 1rem; margin-bottom: 1rem;">
                    <p style="color: #888; font-size: 0.8rem; margin-bottom: 0.5rem;">${stackTypeIcon} ${stackTypeText}</p>
                    <p style="color: #fff; font-size: 0.9rem;">0 / ${maxStacksFormatted} stacks</p>
                </div>

                <div style="background: rgba(251, 191, 36, 0.1); border: 1px solid #fbbf24; border-radius: 12px; padding: 1rem; margin-bottom: 1.5rem;">
                    <p style="color: #fbbf24; font-size: 0.75rem; margin-bottom: 0.3rem;">⬆️ EVOLVES INTO</p>
                    <p style="color: #fff; font-size: 1rem;">${item.evolvedIcon} ${item.evolvedName}</p>
                    <p style="color: #aaa; font-size: 0.8rem;">${item.evolvedDesc}</p>
                </div>

                <button id="item-popup-close" style="background: linear-gradient(135deg, #fbbf24, #f59e0b);
                    color: #000; border: none; padding: 1rem 3rem; font-size: 1rem; font-weight: 700;
                    border-radius: 12px; cursor: pointer; transition: transform 0.2s;">
                    GOT IT!
                </button>
            </div>
        `;
        document.body.appendChild(popup);
        
        document.getElementById('item-popup-close').onclick = () => {
            popup.remove();
            this.gamePaused = false;
            this.playSound('levelup');
        };
    }
    
    updateStackingItems(type, amount) {
        // Called on kills or damage to add stacks to all collected stacking items
        for (const key in this.stackingItems) {
            const itemData = this.stackingItems[key];
            const item = STACKING_ITEMS[key];
            if (!item || itemData.evolved) continue;

            // Add stacks based on type matching item's stackType
            if (type === 'kill' && item.stackType === 'kill') {
                itemData.stacks += amount;
            } else if (type === 'damage' && item.stackType === 'damage') {
                itemData.stacks += amount;
            }

            // Check for evolution
            if (itemData.stacks >= item.maxStacks && !itemData.evolved) {
                this.evolveItem(key);
            } else {
                // Apply current effect
                item.effect(this, itemData.stacks);
            }
        }
    }
    
    evolveItem(key) {
        const item = STACKING_ITEMS[key];
        const itemData = this.stackingItems[key];
        if (!item || !itemData) return;
        
        itemData.evolved = true;
        
        // Apply evolved effect
        item.evolvedEffect(this);
        
        // Big announcement
        this.triggerScreenShake(10, 0.3);
        this.triggerSlowmo(0.3, 0.8);
        
        this.damageNumbers.push({
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 - 80,
            value: `⭐ ITEM EVOLVED! ⭐`,
            lifetime: 3,
            color: '#fbbf24',
            scale: 2.5
        });
        this.damageNumbers.push({
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 - 40,
            value: `${item.evolvedIcon} ${item.evolvedName}`,
            lifetime: 3,
            color: '#fff',
            scale: 2
        });
        this.damageNumbers.push({
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            value: item.evolvedDesc,
            lifetime: 3,
            color: '#aaa',
            scale: 1.2
        });
        
        this.playSound('levelup');
    }

    checkSetBonus(setName) {
        const set = BUILD_SETS[setName];
        if (!set || this.activeSets?.[setName]) return; // Already activated
        
        // Check if all pieces are collected
        const hasAll = set.pieces.every(piece => this.items[piece] && this.items[piece] > 0);
        if (hasAll) {
            // Initialize activeSets if needed
            if (!this.activeSets) this.activeSets = {};
            this.activeSets[setName] = true;
            
            // Apply set bonus
            set.effect(this);
            
            // Big announcement
            this.gamePaused = true;
            setTimeout(() => {
                this.damageNumbers.push({
                    x: this.canvas.width / 2,
                    y: this.canvas.height / 2 - 80,
                    value: `🎉 ${set.name.toUpperCase()} COMPLETE! 🎉`,
                    lifetime: 4,
                    color: set.color,
                    scale: 2
                });
                this.damageNumbers.push({
                    x: this.canvas.width / 2,
                    y: this.canvas.height / 2 - 40,
                    value: set.bonus,
                    lifetime: 4,
                    color: '#ffffff',
                    scale: 1.2
                });
                setTimeout(() => { this.gamePaused = false; }, 2000);
            }, 100);
            
            this.playSound('levelup');
        }
    }

    checkLevelUp() {
        while (this.player.xp >= this.player.xpToLevel) {
            this.player.xp -= this.player.xpToLevel;
            this.player.level++;

            // Spawn rate scaling (Aggressive)
            if (this.player.level % 2 === 0) {
                this.enemySpawnRate = Math.max(50, Math.floor(this.enemySpawnRate * 0.9));
            }

            // XP Curve Adjustment
            if (this.player.level < 20) {
                // Easier early game (linear-ish growth)
                this.player.xpToLevel = Math.floor(this.player.xpToLevel * 1.15);
            } else if (this.player.level < 60) {
                // Mid game
                this.player.xpToLevel = Math.floor(this.player.xpToLevel * 1.1);
            } else {
                // Harder late game
                this.player.xpToLevel = Math.floor(this.player.xpToLevel * 1.3);
            }

            // Check for Diamond Augment (Every 5 levels)
            if (this.player.level % 5 === 0) {
                this.showAugmentMenu();
            } else {
                this.showLevelUpMenu();
            }
        }
    }

    showLevelUpMenu() {
        // Auto-select a random upgrade - no menu shown
        this.playSound('levelup');
        const choices = this.getRandomUpgrades(3);
        
        // Pick a random upgrade from the choices
        const randomUpgrade = choices[Math.floor(Math.random() * choices.length)];
        randomUpgrade.effect(this);
        
        // Show what they got
        this.damageNumbers.push({
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 - 50,
            value: `⬆️ ${randomUpgrade.icon} ${randomUpgrade.name}`,
            lifetime: 2,
            color: randomUpgrade.rarity === 'legendary' ? '#fbbf24' : randomUpgrade.rarity === 'epic' ? '#a855f7' : randomUpgrade.rarity === 'rare' ? '#4da6ff' : '#b8b8b8',
            scale: 1.5
        });

        // Handle multiple pending upgrades
        if (this.pendingUpgrades > 0) {
            this.pendingUpgrades--;
            if (this.pendingUpgrades > 0) {
                setTimeout(() => this.showLevelUpMenu(), 300);
                return;
            }
        }
    }

    showAugmentMenu(choices = null, onComplete = null) {
        // If first arg is function, it's onComplete (legacy support or if no choices passed)
        if (typeof choices === 'function') {
            onComplete = choices;
            choices = null;
        }

        this.gamePaused = true;
        this.playSound('levelup');

        if (!choices) {
            // Internal selection logic (only Diamond Augments by default)
            // Use the flattened DIAMOND_AUGMENTS
            const available = DIAMOND_AUGMENTS.filter(a => {
                if (this.augments.includes(a.id)) return false;
                if (a.req === 'demonSet' && !this.demonSetBonusActive) return false;
                return true;
            });

            if (available.length === 0) {
                // No augments available?
                this.gamePaused = false;
                if (onComplete) onComplete();
                return;
            }

            choices = [];
            const pool = [...available];
            while (choices.length < 2 && pool.length > 0) {
                const idx = Math.floor(Math.random() * pool.length);
                choices.push(pool.splice(idx, 1)[0]);
            }
        }

        const container = document.getElementById('augment-choices');
        container.innerHTML = '';
        choices.forEach(u => {
            // Use getDesc if available for upgrade descriptions
            const desc = u.getDesc ? u.getDesc(this) : u.desc;
            const card = document.createElement('div');
            card.className = `upgrade-card legendary`;
            card.style.borderColor = '#00ffff';
            card.style.boxShadow = '0 0 15px rgba(0,255,255,0.2)';
            card.innerHTML = `
                <div class="upgrade-rarity" style="background:#00ffff;color:#000;">DIAMOND</div>
                <div class="upgrade-icon">${u.icon}</div>
                <div class="upgrade-details-container">
                    <div class="upgrade-name" style="color:#00ffff;">${u.name}</div>
                    <div class="upgrade-desc" style="color:#aee;">${u.desc}</div>
                    <div class="upgrade-stats" style="color:#88ffff;font-size:0.8em;margin-top:4px;">${desc}</div>
                </div>
            `;
            card.addEventListener('click', () => {
                u.effect(this);
                document.getElementById('augment-menu').classList.add('hidden');
                this.gamePaused = false;
                this.damageNumbers.push({ x: this.player.x, y: this.player.y - 80, value: `💎 ${u.name}!`, lifetime: 3, color: '#00ffff' });
                this.updateAugmentDisplay();
                if (onComplete) onComplete();
            });
            container.appendChild(card);
        });
        document.getElementById('augment-menu').classList.remove('hidden');
    }

    getRandomUpgrades(count) {
        const all = [...this.baseUpgrades, ...this.selectedClass.upgrades];
        const result = [], weights = { common: 50, rare: 30, epic: 15, legendary: 5 };
        const available = [...all];
        for (let i = 0; i < count && available.length; i++) {
            const pool = [];
            available.forEach((u, idx) => { for (let w = 0; w < (weights[u.rarity] || 50); w++) pool.push(idx); });
            const idx = pool[Math.floor(Math.random() * pool.length)];
            result.push(available.splice(idx, 1)[0]);
        }
        return result;
    }

    spawnParticles(x, y, color, count) {
        if (this.particles.length > 60) return; // Hard cap
        const limit = Math.min(count, 5); // Limit per spawn
        for (let i = 0; i < limit; i++) {
            const a = Math.random() * Math.PI * 2, s = 50 + Math.random() * 100;
            this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, radius: 2 + Math.random() * 3, color, lifetime: 0.3 + Math.random() * 0.3 });
        }
    }

    updateDamageNumbers(dt) {
        // Limit max active numbers
        if (this.damageNumbers.length > 40) {
            this.damageNumbers.splice(0, this.damageNumbers.length - 40);
        }

        for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
            const d = this.damageNumbers[i];
            d.y -= 30 * dt;
            d.lifetime -= dt;
            if (d.lifetime <= 0) this.damageNumbers.splice(i, 1);
        }
    }



    updateParticles(dt) { for (let i = this.particles.length - 1; i >= 0; i--) { const p = this.particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.lifetime -= dt; if (p.lifetime <= 0) this.particles.splice(i, 1); } }
    updateDamageNumbers(dt) { for (let i = this.damageNumbers.length - 1; i >= 0; i--) { const d = this.damageNumbers[i]; d.y -= 35 * dt; d.lifetime -= dt; if (d.lifetime <= 0) this.damageNumbers.splice(i, 1); } }

    updateHUD() {
        const m = Math.floor(this.gameTime / 60000), s = Math.floor((this.gameTime % 60000) / 1000);
        document.getElementById('timer').textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        document.getElementById('wave-num').textContent = this.wave;
        document.getElementById('xp-bar').style.width = `${(this.player.xp / this.player.xpToLevel) * 100}%`;
        document.getElementById('level-display').textContent = `Lv. ${this.player.level}`;
        document.getElementById('kill-count').textContent = `💀 ${this.player.kills}`;
    }

    async gameOver() {
        this.gameRunning = false;
        const m = Math.floor(this.gameTime / 60000), s = Math.floor((this.gameTime % 60000) / 1000);
        document.getElementById('final-time').textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        document.getElementById('final-kills').textContent = this.player.kills;
        document.getElementById('final-level').textContent = this.player.level;
        document.getElementById('game-hud').classList.add('hidden');
        document.getElementById('gameover-menu').classList.remove('hidden');

        // Submit score if logged in
        if (typeof authManager !== 'undefined' && authManager.user) {
            const score = this.player.kills * 10 + this.wave * 100; // Simple score formula
            const result = await authManager.submitScore(score, this.wave, this.player.kills, Math.floor(this.gameTime / 1000));
            if (result?.newPersonalBest) {
                document.getElementById('new-record').classList.remove('hidden');
            } else {
                document.getElementById('new-record').classList.add('hidden');
            }
        } else {
            document.getElementById('new-record').classList.add('hidden');
        }
    }

    drawEvents(ctx) {
        if (!this.activeEvent) return;

        // Ring of Fire
        if (this.ringOfFire.active) {
            // Check if ring is fixed or centered on player
            // Logic in updatePlayer suggests it tracks worldX/worldY if not set, or we used set center
            // Let's assume it has a center
            const centerX = this.ringOfFire.centerX || this.worldX;
            const centerY = this.ringOfFire.centerY || this.worldY;

            // Convert to screen coords
            const sx = this.player.x + (centerX - this.worldX);
            const sy = this.player.y + (centerY - this.worldY);

            ctx.save();
            ctx.beginPath();
            ctx.arc(sx, sy, this.ringOfFire.radius, 0, Math.PI * 2);
            ctx.strokeStyle = '#ff4400';
            ctx.lineWidth = 4 + Math.sin(this.gameTime / 100) * 2;
            ctx.setLineDash([10, 5]);
            ctx.stroke();

            // Burning effects on ring
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ff4400';
            ctx.stroke();

            // Inner danger zone indication
            ctx.fillStyle = 'rgba(255, 68, 0, 0.1)';
            ctx.fill();
            ctx.restore();

            // Draw particles on ring
            if (Math.random() < 0.3) {
                const angle = Math.random() * Math.PI * 2;
                const px = sx + Math.cos(angle) * this.ringOfFire.radius;
                const py = sy + Math.sin(angle) * this.ringOfFire.radius;
                // We're in render loop, better not spawn logic particles here usually, 
                // but visual only particles are fine if we had a visual-only list. 
                // Or just draw directly.
                // Let's sticking to standard particles via spawn in updateEvents, 
                // but we can draw some glow here.
            }
        }

        // Trap Square
        if (this.trapSquare.active) {
            const centerX = this.trapSquare.centerX;
            const centerY = this.trapSquare.centerY;

            const sx = this.player.x + (centerX - this.worldX);
            const sy = this.player.y + (centerY - this.worldY);
            const size = this.trapSquare.size;

            ctx.save();
            ctx.beginPath();
            ctx.rect(sx - size / 2, sy - size / 2, size, size);
            ctx.strokeStyle = '#8844ff';
            ctx.lineWidth = 5;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#aa66ff';
            ctx.stroke();

            // Walls effect
            ctx.fillStyle = 'rgba(136, 68, 255, 0.05)';
            ctx.fill();

            // Corner markers
            const cornerSize = 20;
            ctx.fillStyle = '#aa66ff';
            ctx.fillRect(sx - size / 2 - 5, sy - size / 2 - 5, cornerSize, cornerSize);
            ctx.fillRect(sx + size / 2 - cornerSize + 5, sy - size / 2 - 5, cornerSize, cornerSize);
            ctx.fillRect(sx - size / 2 - 5, sy + size / 2 - cornerSize + 5, cornerSize, cornerSize);
            ctx.fillRect(sx + size / 2 - cornerSize + 5, sy + size / 2 - cornerSize + 5, cornerSize, cornerSize);

            ctx.restore();
        }

        // Circle of Doom - purple closing circle
        if (this.circleOfDoom.active) {
            const centerX = this.circleOfDoom.centerX;
            const centerY = this.circleOfDoom.centerY;

            const sx = this.player.x + (centerX - this.worldX);
            const sy = this.player.y + (centerY - this.worldY);
            const radius = this.circleOfDoom.currentRadius;

            ctx.save();

            // Outer doom zone (outside the circle is dangerous)
            ctx.beginPath();
            ctx.arc(sx, sy, radius + 500, 0, Math.PI * 2);
            ctx.arc(sx, sy, radius, 0, Math.PI * 2, true); // Cut out inner circle
            ctx.fillStyle = 'rgba(120, 0, 180, 0.3)';
            ctx.fill();

            // Main circle border - pulsing purple
            ctx.beginPath();
            ctx.arc(sx, sy, radius, 0, Math.PI * 2);
            ctx.strokeStyle = '#aa00ff';
            ctx.lineWidth = 6 + Math.sin(this.gameTime / 80) * 3;
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#aa00ff';
            ctx.stroke();

            // Inner warning ring
            ctx.beginPath();
            ctx.arc(sx, sy, radius - 10, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(200, 100, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.setLineDash([15, 10]);
            ctx.stroke();

            // Skull indicators around the circle
            ctx.font = '24px Inter';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#cc66ff';
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2 + this.gameTime / 2000;
                const skullX = sx + Math.cos(angle) * (radius + 20);
                const skullY = sy + Math.sin(angle) * (radius + 20);
                ctx.fillText('💀', skullX, skullY);
            }

            ctx.restore();
        }
    }

    render() {
        const ctx = this.ctx;
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Apply camera zoom (centered on player) and screen shake
        ctx.save();
        const scale = this.cameraScale || 1;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Screen shake offset
        let shakeX = 0, shakeY = 0;
        if (this.screenShake.intensity > 0) {
            shakeX = (Math.random() - 0.5) * this.screenShake.intensity * 2;
            shakeY = (Math.random() - 0.5) * this.screenShake.intensity * 2;
        }
        
        ctx.translate(centerX + shakeX, centerY + shakeY);
        ctx.scale(scale, scale);
        ctx.translate(-centerX, -centerY);

        this.drawGrid();
        this.drawMapBorders();

        // Draw events
        this.drawEvents(ctx);

        // Draw ice zones (visual effect for ice mob death)
        if (this.iceZones && this.iceZones.length > 0) {
            this.iceZones.forEach(zone => {
                const sx = this.player.x + (zone.wx - this.worldX);
                const sy = this.player.y + (zone.wy - this.worldY);

                ctx.save();
                // Outer glow
                ctx.beginPath();
                ctx.arc(sx, sy, zone.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0, 200, 255, ${0.15 + Math.sin(this.gameTime / 200) * 0.05})`;
                ctx.fill();

                // Ice pattern ring
                ctx.beginPath();
                ctx.arc(sx, sy, zone.radius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(100, 220, 255, ${0.6 + Math.sin(this.gameTime / 100) * 0.2})`;
                ctx.lineWidth = 3;
                ctx.setLineDash([8, 4]);
                ctx.stroke();

                // Inner frost effect
                ctx.beginPath();
                ctx.arc(sx, sy, zone.radius * 0.6, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(200, 240, 255, ${0.1})`;
                ctx.fill();

                // Snowflake icon at center
                ctx.font = `${Math.floor(zone.radius * 0.4)}px Inter`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = `rgba(255, 255, 255, ${0.7 + Math.sin(this.gameTime / 150) * 0.3})`;
                ctx.fillText('❄️', sx, sy);

                ctx.restore();
            });
        }

        // Draw sticky effect indicator on player
        if (this.stickyTimer > 0) {
            ctx.save();
            ctx.font = '24px Inter';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#88ff00';
            ctx.fillText('🍯', this.player.x, this.player.y - this.player.radius - 20);
            ctx.font = '12px Inter';
            ctx.fillText(`${this.stickyTimer.toFixed(1)}s`, this.player.x, this.player.y - this.player.radius - 5);
            ctx.restore();
        }

        // Pickups
        this.pickups.forEach(pk => {
            const sx = this.player.x + (pk.wx - this.worldX);
            const sy = this.player.y + (pk.wy - this.worldY);
            ctx.beginPath(); ctx.arc(sx, sy, pk.radius, 0, Math.PI * 2);
            ctx.fillStyle = pk.color; ctx.shadowBlur = 15; ctx.shadowColor = pk.color; ctx.fill(); ctx.shadowBlur = 0;
            if (pk.isItem && STACKING_ITEMS[pk.itemKey]) { ctx.font = '14px Inter'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(STACKING_ITEMS[pk.itemKey].icon, sx, sy + 5); }
            // Health pack cross design
            if (pk.isHealth) {
                ctx.fillStyle = '#ffffff';
                const crossW = pk.radius * 0.4, crossH = pk.radius * 1.2;
                ctx.fillRect(sx - crossW/2, sy - crossH/2, crossW, crossH); // Vertical bar
                ctx.fillRect(sx - crossH/2, sy - crossW/2, crossH, crossW); // Horizontal bar
            }
        });
        // Projectiles
        this.projectiles.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill(); });
        // Enemies
        this.enemies.forEach(e => {
            const sx = this.player.x + (e.wx - this.worldX);
            const sy = this.player.y + (e.wy - this.worldY);
            if (sx < -200 || sx > this.canvas.width + 200 || sy < -200 || sy > this.canvas.height + 200) return;
            
            // Regular circular enemies
            ctx.beginPath(); ctx.arc(sx, sy, e.radius, 0, Math.PI * 2);
            ctx.fillStyle = e.hitFlash > 0 ? '#fff' : e.color; ctx.fill();
            // Enemy icon
            if (e.icon) {
                ctx.font = `${e.radius}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(e.icon, sx, sy);
            }
            
            if (e.isConsumer) {
                // Consumer - Black hole tornado design
                ctx.save();
                ctx.translate(sx, sy);
                
                // Outer rotating spiral arms (purple)
                for (let arm = 0; arm < 4; arm++) {
                    ctx.save();
                    ctx.rotate(e.rotationAngle + (arm * Math.PI / 2));
                    
                    const gradient = ctx.createLinearGradient(0, 0, e.radius * 1.5, 0);
                    gradient.addColorStop(0, 'rgba(136, 0, 255, 0.8)');
                    gradient.addColorStop(1, 'rgba(136, 0, 255, 0)');
                    
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    for (let i = 0; i < 20; i++) {
                        const angle = (i / 20) * Math.PI;
                        const r = e.radius * 0.3 + (i / 20) * e.radius * 0.7;
                        ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r * 0.3);
                    }
                    ctx.strokeStyle = gradient;
                    ctx.lineWidth = 8;
                    ctx.stroke();
                    ctx.restore();
                }
                
                // Inner black hole (dark center)
                ctx.beginPath();
                ctx.arc(0, 0, e.radius * 0.6, 0, Math.PI * 2);
                const innerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, e.radius * 0.6);
                innerGrad.addColorStop(0, '#000');
                innerGrad.addColorStop(0.5, '#220044');
                innerGrad.addColorStop(1, '#8800ff');
                ctx.fillStyle = innerGrad;
                ctx.fill();
                
                // White accretion disk ring
                ctx.beginPath();
                ctx.arc(0, 0, e.radius * 0.5, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.lineWidth = 3;
                ctx.stroke();
                
                // White inner glow
                ctx.beginPath();
                ctx.arc(0, 0, e.radius * 0.2, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fill();
                
                // Consume radius indicator (faint)
                ctx.beginPath();
                ctx.arc(0, 0, e.consumeRadius, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(136, 0, 255, 0.2)';
                ctx.lineWidth = 2;
                ctx.setLineDash([10, 10]);
                ctx.stroke();
                ctx.setLineDash([]);
                
                ctx.restore();
                
                // Name and HP bar
                ctx.font = 'bold 14px Inter'; ctx.fillStyle = '#cc88ff'; ctx.textAlign = 'center';
                ctx.fillText(e.name, sx, sy - e.radius - 30);
                ctx.font = '10px Inter'; ctx.fillStyle = '#888';
                ctx.fillText(`Consumed: ${e.consumedCount}`, sx, sy - e.radius - 18);
                const bw = e.radius * 2.5;
                ctx.fillStyle = '#333'; ctx.fillRect(sx - bw / 2, sy - e.radius - 8, bw, 8);
                ctx.fillStyle = '#8800ff'; ctx.fillRect(sx - bw / 2, sy - e.radius - 8, bw * (e.health / e.maxHealth), 8);
            } else if (e.isBoss) {
                // Boss face
                ctx.font = `${e.radius}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(e.face, sx, sy);
                // Name
                ctx.font = 'bold 12px Inter'; ctx.fillStyle = '#fff';
                ctx.fillText(e.name, sx, sy - e.radius - 15);
                // HP bar
                const bw = e.radius * 2;
                ctx.fillStyle = '#333'; ctx.fillRect(sx - bw / 2, sy - e.radius - 8, bw, 6);
                ctx.fillStyle = '#ff0044'; ctx.fillRect(sx - bw / 2, sy - e.radius - 8, bw * (e.health / e.maxHealth), 6);
            } else if (e.type === 'tank' || e.type === 'splitter') {
                const bw = e.radius * 1.5;
                ctx.fillStyle = '#333'; ctx.fillRect(sx - bw / 2, sy - e.radius - 8, bw, 4);
                ctx.fillStyle = '#ff4444'; ctx.fillRect(sx - bw / 2, sy - e.radius - 8, bw * (e.health / e.maxHealth), 4);
            }
        });

        // Control points
        this.controlPoints.forEach(cp => {
            if (cp.captured) return;
            const sx = this.player.x + (cp.wx - this.worldX);
            const sy = this.player.y + (cp.wy - this.worldY);
            // Outer ring
            ctx.beginPath(); ctx.arc(sx, sy, cp.radius, 0, Math.PI * 2);
            ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 4; ctx.stroke();
            // Capture progress
            if (cp.captureProgress > 0) {
                ctx.beginPath();
                ctx.arc(sx, sy, cp.radius - 5, -Math.PI / 2, -Math.PI / 2 + (cp.captureProgress / 100) * Math.PI * 2);
                ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 6; ctx.stroke();
            }
            // Icon
            ctx.font = '24px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fbbf24'; ctx.fillText('🏴', sx, sy);
        });

        // Orbitals
        this.orbitals.forEach(o => {
            const ox = this.player.x + Math.cos(o.angle) * o.radius;
            const oy = this.player.y + Math.sin(o.angle) * o.radius;
            ctx.beginPath(); ctx.arc(ox, oy, o.size, 0, Math.PI * 2);
            ctx.fillStyle = o.color; ctx.shadowBlur = 10; ctx.shadowColor = o.color; ctx.fill(); ctx.shadowBlur = 0;
        });
        // Stars
        this.stars.forEach(s => {
            const sx = this.player.x + Math.cos(s.angle) * s.radius;
            const sy = this.player.y + Math.sin(s.angle) * s.radius;
            ctx.font = `${s.size + 6}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.shadowBlur = 15; ctx.shadowColor = '#ffdd00';
            ctx.fillText('⭐', sx, sy);
            ctx.shadowBlur = 0;
        });
        // Minions
        this.minions.forEach(m => {
            ctx.beginPath(); ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
            ctx.fillStyle = m.color; ctx.fill();
            ctx.font = `${m.radius + 4}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(m.icon, m.x, m.y);
        });
        // Imps
        this.imps.forEach(imp => {
            ctx.beginPath(); ctx.arc(imp.x, imp.y, imp.radius, 0, Math.PI * 2);
            ctx.fillStyle = imp.color; ctx.shadowBlur = 10; ctx.shadowColor = '#ff4400'; ctx.fill(); ctx.shadowBlur = 0;
            ctx.font = '12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🔥', imp.x, imp.y);
        });
        // Particles
        this.particles.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * (p.lifetime * 2), 0, Math.PI * 2); ctx.globalAlpha = p.lifetime * 2; ctx.fillStyle = p.color; ctx.fill(); ctx.globalAlpha = 1; });
        
        // Death pop effects (GAME JUICE)
        if (this.deathPops) {
            this.deathPops = this.deathPops.filter(pop => {
                pop.timer -= 0.016;
                const progress = 1 - (pop.timer / 0.15);
                const currentRadius = pop.radius + (pop.maxRadius - pop.radius) * progress;
                pop.alpha = 1 - progress;
                
                ctx.save();
                ctx.globalAlpha = pop.alpha;
                ctx.beginPath();
                ctx.arc(pop.x, pop.y, currentRadius, 0, Math.PI * 2);
                ctx.fillStyle = pop.color;
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.restore();
                
                return pop.timer > 0;
            });
        }

        // Aura Fire Circle (augment) - Thin ring with glow
        if (this.auraFire) {
            ctx.save();
            const auraRadius = this.auraFire.radius;
            const intensity = 0.6 + Math.sin(this.gameTime / 100) * 0.2;
            
            // Outer glow effect
            ctx.shadowBlur = 15 + this.auraFire.level * 3;
            ctx.shadowColor = `rgba(255, ${100 - this.auraFire.level * 10}, 0, ${intensity})`;
            
            // Thin fire ring
            ctx.beginPath();
            ctx.arc(this.player.x, this.player.y, auraRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, ${150 - this.auraFire.level * 15}, 0, ${intensity})`;
            ctx.lineWidth = 3 + this.auraFire.level;
            ctx.stroke();
            
            // Level indicator
            if (this.auraFire.level > 1) {
                ctx.font = 'bold 10px Inter';
                ctx.fillStyle = '#ff6600';
                ctx.textAlign = 'center';
                ctx.shadowBlur = 0;
                ctx.fillText(`🔥${this.auraFire.level}`, this.player.x, this.player.y - auraRadius - 8);
            }
            
            ctx.shadowBlur = 0;
            ctx.restore();
        }

        // Player
        this.drawPlayer();
        // Shield indicator
        if (this.shieldActive) { ctx.beginPath(); ctx.arc(this.player.x, this.player.y, this.player.radius + 12, 0, Math.PI * 2); ctx.strokeStyle = '#00aaff'; ctx.lineWidth = 3; ctx.stroke(); }
        // Inferno aura
        if (this.inferno) { ctx.beginPath(); ctx.arc(this.player.x, this.player.y, 100, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,100,0,0.3)'; ctx.lineWidth = 2; ctx.stroke(); }

        // Restore transform before drawing UI
        ctx.restore();

        // Damage numbers (UI - not scaled)
        this.damageNumbers.forEach(d => {
            const fontSize = Math.floor(16 * (d.scale || 1));
            ctx.font = `bold ${fontSize}px Inter`;
            ctx.fillStyle = d.color;
            ctx.globalAlpha = d.lifetime;
            ctx.textAlign = 'center';
            ctx.fillText(d.value, d.x, d.y);
            ctx.globalAlpha = 1;
        });
        
        // Consumer Survival Timer UI
        this.drawConsumerTimer(ctx);
        
        // Health bar
        this.drawHealthBar();
        // Items display
        this.drawItems();
        // Joystick
        if (this.isMobile && this.joystick.active) this.drawJoystick();

        // Armor HUD
        this.drawArmorHUD();
    }

    drawConsumerTimer(ctx) {
        // Find consumer enemy
        const consumer = this.enemies.find(e => e.isConsumer);
        if (!consumer) return;

        const timeLeft = Math.max(0, consumer.maxLifeTime - consumer.lifeTimer);
        const minutes = Math.floor(timeLeft / 60);
        const seconds = Math.floor(timeLeft % 60);
        const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Timer panel at top center
        const panelWidth = 280;
        const panelHeight = 70;
        const panelX = (this.canvas.width - panelWidth) / 2;
        const panelY = 80;
        
        // Urgency color based on time left
        let urgencyColor = '#8800ff'; // Purple - calm
        let bgAlpha = 0.7;
        if (timeLeft < 30) {
            urgencyColor = '#ff0000'; // Red - danger
            bgAlpha = 0.85 + Math.sin(this.gameTime / 50) * 0.1;
        } else if (timeLeft < 60) {
            urgencyColor = '#ff6600'; // Orange - warning
            bgAlpha = 0.8;
        }
        
        // Background panel with glow
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = urgencyColor;
        ctx.fillStyle = `rgba(0, 0, 0, ${bgAlpha})`;
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 12);
        ctx.fill();
        
        // Border
        ctx.strokeStyle = urgencyColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 12);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Title
        ctx.font = 'bold 14px Inter';
        ctx.fillStyle = urgencyColor;
        ctx.textAlign = 'center';
        ctx.fillText('⚫ SURVIVE THE CONSUMER ⚫', panelX + panelWidth / 2, panelY + 22);
        
        // Timer
        ctx.font = 'bold 32px Inter';
        ctx.fillStyle = timeLeft < 30 ? '#ff0000' : '#ffffff';
        ctx.fillText(timeStr, panelX + panelWidth / 2, panelY + 55);
        
        // Pulsing effect when critical
        if (timeLeft < 30) {
            const pulse = Math.sin(this.gameTime / 100) * 0.3 + 0.7;
            ctx.globalAlpha = pulse;
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(panelX - 5, panelY - 5, panelWidth + 10, panelHeight + 10, 15);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
        
        ctx.restore();
    }

    drawArmorHUD() {
        const ctx = this.ctx;
        const x = this.canvas.width - 140, y = 20;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(x, y, 120, 50);
        ctx.strokeStyle = '#444';
        ctx.strokeRect(x, y, 120, 50);

        DEMON_SET_PIECES.forEach((p, i) => {
            const has = this.demonSet && this.demonSet[p.id];
            const px = x + 10 + i * 35;
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            if (has) {
                ctx.fillStyle = '#fff';
                ctx.fillText(p.icon, px + 15, y + 32);
                ctx.strokeStyle = '#ff0044';
                ctx.strokeRect(px, y + 5, 30, 40);
                // Glow
                ctx.shadowBlur = 10; ctx.shadowColor = '#ff0044';
                ctx.strokeRect(px, y + 5, 30, 40);
                ctx.shadowBlur = 0;
            } else {
                ctx.fillStyle = '#444';
                ctx.fillText(p.icon, px + 15, y + 32);
                ctx.strokeStyle = '#333';
                ctx.strokeRect(px, y + 5, 30, 40);
            }
        });

        // Set Bonus text
        if (this.demonSetBonusActive) {
            ctx.font = 'bold 10px Inter';
            ctx.fillStyle = '#ff0044';
            ctx.textAlign = 'center';
            ctx.fillText('HELLFIRE ACTIVE', x + 60, y + 62);
        }
    }

    drawGrid() {
        const ctx = this.ctx, gs = 60;
        ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
        const ox = -this.worldX % gs, oy = -this.worldY % gs;
        for (let x = ox; x < this.canvas.width; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.canvas.height); ctx.stroke(); }
        for (let y = oy; y < this.canvas.height; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.canvas.width, y); ctx.stroke(); }
    }

    drawMapBorders() {
        const ctx = this.ctx;
        const { minX, maxX, minY, maxY } = this.mapBounds;
        
        // Convert world bounds to screen coordinates
        const leftEdge = this.player.x + (minX - this.worldX);
        const rightEdge = this.player.x + (maxX - this.worldX);
        const topEdge = this.player.y + (minY - this.worldY);
        const bottomEdge = this.player.y + (maxY - this.worldY);
        
        ctx.save();
        
        // Draw border glow effect
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 20;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        
        // Draw visible border lines
        ctx.beginPath();
        ctx.moveTo(leftEdge, topEdge);
        ctx.lineTo(rightEdge, topEdge);
        ctx.lineTo(rightEdge, bottomEdge);
        ctx.lineTo(leftEdge, bottomEdge);
        ctx.closePath();
        ctx.stroke();
        
        // Draw danger zone (edge warning area)
        const warningDist = 100;
        ctx.shadowBlur = 0;
        
        // Left warning
        if (leftEdge > -50) {
            const gradient = ctx.createLinearGradient(leftEdge, 0, leftEdge + warningDist, 0);
            gradient.addColorStop(0, 'rgba(255, 100, 100, 0.3)');
            gradient.addColorStop(1, 'rgba(255, 100, 100, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(leftEdge, Math.max(0, topEdge), warningDist, Math.min(this.canvas.height, bottomEdge - topEdge));
        }
        
        // Right warning
        if (rightEdge < this.canvas.width + 50) {
            const gradient = ctx.createLinearGradient(rightEdge, 0, rightEdge - warningDist, 0);
            gradient.addColorStop(0, 'rgba(255, 100, 100, 0.3)');
            gradient.addColorStop(1, 'rgba(255, 100, 100, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(rightEdge - warningDist, Math.max(0, topEdge), warningDist, Math.min(this.canvas.height, bottomEdge - topEdge));
        }
        
        // Top warning
        if (topEdge > -50) {
            const gradient = ctx.createLinearGradient(0, topEdge, 0, topEdge + warningDist);
            gradient.addColorStop(0, 'rgba(255, 100, 100, 0.3)');
            gradient.addColorStop(1, 'rgba(255, 100, 100, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(Math.max(0, leftEdge), topEdge, Math.min(this.canvas.width, rightEdge - leftEdge), warningDist);
        }
        
        // Bottom warning
        if (bottomEdge < this.canvas.height + 50) {
            const gradient = ctx.createLinearGradient(0, bottomEdge, 0, bottomEdge - warningDist);
            gradient.addColorStop(0, 'rgba(255, 100, 100, 0.3)');
            gradient.addColorStop(1, 'rgba(255, 100, 100, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(Math.max(0, leftEdge), bottomEdge - warningDist, Math.min(this.canvas.width, rightEdge - leftEdge), warningDist);
        }
        
        // Draw corner markers
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Inter';
        ctx.textAlign = 'center';
        
        // Only draw markers if visible on screen
        if (leftEdge > 0 && topEdge > 0) {
            ctx.fillText('⚠', leftEdge + 20, topEdge + 25);
        }
        if (rightEdge < this.canvas.width && topEdge > 0) {
            ctx.fillText('⚠', rightEdge - 20, topEdge + 25);
        }
        if (leftEdge > 0 && bottomEdge < this.canvas.height) {
            ctx.fillText('⚠', leftEdge + 20, bottomEdge - 10);
        }
        if (rightEdge < this.canvas.width && bottomEdge < this.canvas.height) {
            ctx.fillText('⚠', rightEdge - 20, bottomEdge - 10);
        }
        
        ctx.restore();
    }

    drawPlayer() {
        const ctx = this.ctx, p = this.player;
        const healthPercent = p.health / p.maxHealth;
        
        // Low health danger pulse (GAME JUICE)
        if (healthPercent < 0.25) {
            const pulse = Math.sin(this.gameTime * 10) * 0.5 + 0.5;
            ctx.save();
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius + 20 + pulse * 10, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 0, 0, ${0.1 + pulse * 0.15})`;
            ctx.fill();
            ctx.restore();
        }
        
        if (p.invincibleTime > 0 && Math.floor(p.invincibleTime * 10) % 2 === 0) ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius + 8, 0, Math.PI * 2); ctx.fillStyle = `${p.color}33`; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x - 3, p.y - 3, p.radius * 0.4, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fill();
        ctx.font = '14px Arial'; ctx.fillText(this.selectedClass.icon, p.x - 7, p.y + 5);
        ctx.globalAlpha = 1;
    }

    drawHealthBar() {
        const ctx = this.ctx, bw = 150, bh = 12, x = 20, y = 20;
        const hp = this.player.health / this.player.maxHealth;
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x, y, bw, bh);
        ctx.fillStyle = hp > 0.5 ? '#4ade80' : hp > 0.25 ? '#fbbf24' : '#ff4444'; ctx.fillRect(x, y, bw * hp, bh);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(x, y, bw, bh);
        ctx.font = 'bold 10px Inter'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(`${Math.ceil(this.player.health)}/${this.player.maxHealth}`, x + bw / 2, y + 10);
    }

    drawItems() {
        const ctx = this.ctx;
        let y = 50;
        const compact = this.canvas.width < 768;

        // Helper to format large numbers
        const formatNum = (n) => {
            if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
            if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
            return Math.floor(n).toString();
        };

        // Stacking Items with progress
        Object.entries(this.stackingItems).forEach(([key, data]) => {
            const item = STACKING_ITEMS[key];
            if (!item) return;

            const isEvolved = data.evolved;
            const icon = isEvolved ? item.evolvedIcon : item.icon;
            const name = isEvolved ? item.evolvedName : item.name;
            const color = isEvolved ? '#ff6b00' : '#fbbf24';
            const progress = Math.min(data.stacks / item.maxStacks, 1);
            const stacksFormatted = formatNum(data.stacks);
            const maxFormatted = formatNum(item.maxStacks);

                if (compact) {
                // Compact mobile view
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(10, y, 55, 30);

                // Progress bar background
                ctx.fillStyle = 'rgba(255,255,255,0.1)';
                ctx.fillRect(10, y + 26, 55, 4);

                // Progress bar fill
                ctx.fillStyle = isEvolved ? '#ff6b00' : '#fbbf24';
                ctx.fillRect(10, y + 26, 55 * progress, 4);

                // Icon and stack count
                ctx.font = '16px Inter'; ctx.fillStyle = color; ctx.textAlign = 'center';
                ctx.fillText(icon, 25, y + 18);
                ctx.font = 'bold 8px Inter'; ctx.fillStyle = '#fff';
                ctx.fillText(isEvolved ? '★' : stacksFormatted, 50, y + 18);

                if (isEvolved) {
                    ctx.strokeStyle = '#ff6b00'; ctx.lineWidth = 2;
                    ctx.strokeRect(10, y, 55, 30);
                }
                y += 38;
                } else {
                // Desktop view
                const boxWidth = 140;
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(10, y, boxWidth, 28);

                // Progress bar
                ctx.fillStyle = 'rgba(255,255,255,0.1)';
                ctx.fillRect(10, y + 24, boxWidth, 4);
                ctx.fillStyle = isEvolved ? '#ff6b00' : '#fbbf24';
                ctx.fillRect(10, y + 24, boxWidth * progress, 4);

                // Icon and name
                ctx.font = '12px Inter'; ctx.fillStyle = color; ctx.textAlign = 'left';
                ctx.fillText(`${icon} ${name}`, 15, y + 16);

                // Stack count
                ctx.font = 'bold 10px Inter'; ctx.fillStyle = '#fff'; ctx.textAlign = 'right';
                ctx.fillText(isEvolved ? '★ MAX' : `${stacksFormatted}/${maxFormatted}`, boxWidth + 5, y + 16);

                if (isEvolved) {
                    ctx.strokeStyle = '#ff6b00'; ctx.lineWidth = 2;
                    ctx.strokeRect(10, y, boxWidth, 28);
                }
                y += 36;
            }
        });

        // Diamond Augments
        y += 10;
        this.augments.forEach(augId => {
            const aug = DIAMOND_AUGMENTS.find(a => a.id === augId);
            if (aug) {
                if (compact) {
                    ctx.fillStyle = 'rgba(0,30,40,0.7)'; ctx.fillRect(10, y, 30, 30);
                    ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 1; ctx.strokeRect(10, y, 30, 30);
                    ctx.font = '18px Inter'; ctx.fillStyle = '#00ffff'; ctx.textAlign = 'center';
                    ctx.fillText(`${aug.icon}`, 25, y + 20);
                    y += 35;
                } else {
                    ctx.fillStyle = 'rgba(0,30,40,0.7)'; ctx.fillRect(10, y, 120, 20);
                    ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 1; ctx.strokeRect(10, y, 120, 20);
                    ctx.font = '12px Inter'; ctx.fillStyle = '#00ffff'; ctx.textAlign = 'left';
                    ctx.fillText(`${aug.icon} ${aug.name}`, 15, y + 14);
                    y += 24;
                }
            }
        });
    }

    drawJoystick() {
        const ctx = this.ctx;
        ctx.beginPath(); ctx.arc(this.joystick.startX, this.joystick.startY, 60, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,255,170,0.3)'; ctx.lineWidth = 3; ctx.stroke();
        const tx = this.joystick.startX + this.joystick.dx * 50;
        const ty = this.joystick.startY + this.joystick.dy * 50;
        ctx.beginPath(); ctx.arc(tx, ty, 25, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,255,170,0.6)'; ctx.fill();
    }
}

document.addEventListener('DOMContentLoaded', () => { window.game = new DotsSurvivor(); });
