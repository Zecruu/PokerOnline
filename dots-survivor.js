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
        // Consolidated upgrades from all classes
        { id: 'barrage', name: 'Barrage', icon: '🎯', desc: '+1 projectile', rarity: 'rare', effect: (g) => g.weapons.bullet.count++, getDesc: (g) => `Projectiles: ${g.weapons.bullet.count} → ${g.weapons.bullet.count + 1}` },
        { id: 'rapidfire', name: 'Machine Gun', icon: '💥', desc: '+40% fire rate', rarity: 'epic', effect: (g) => g.weapons.bullet.fireRate = Math.floor(g.weapons.bullet.fireRate * 0.6), getDesc: (g) => `Fire Rate: ${(1000 / g.weapons.bullet.fireRate).toFixed(1)}/s → ${(1000 / (g.weapons.bullet.fireRate * 0.6)).toFixed(1)}/s` },
        { id: 'orbital', name: 'Arcane Orbital', icon: '🌀', desc: '+1 orbiting spell', rarity: 'rare', effect: (g) => g.orbitals.push(g.createOrbital()), getDesc: (g) => `Orbitals: ${g.orbitals.length} → ${g.orbitals.length + 1}` },
        { id: 'guard', name: 'Summon Guard', icon: '🛡️', desc: '+1 guard minion', rarity: 'rare', effect: (g) => g.addMinion('guard'), getDesc: (g) => `Minions: ${g.minions.length}/${g.maxMinions || 5}` },
    ]
};

// Diamond Augments (All combined)
const DIAMOND_AUGMENTS = [
    // Soldier Path
    { id: 'tactical_nuke', name: 'Tactical Nuke', icon: '☢️', desc: 'Every 5th shot fires a nuke dealing 500% damage in a huge area', effect: (g) => g.augments.push('tactical_nuke') },
    { id: 'overclock', name: 'Overclock', icon: '⚙️', desc: 'Fire rate +100%, but accuracy decreases slightly', effect: (g) => { g.weapons.bullet.fireRate *= 0.5; g.spread = 0.2; } },
    { id: 'bullet_storm', name: 'Bullet Storm', icon: '🌧️', desc: 'Bullets split into 3 smaller bullets on impact', effect: (g) => g.augments.push('bullet_storm') },
    { id: 'titan_killer', name: 'Titan Killer', icon: '🎯', desc: 'Deal +200% damage to Bosses and Tank enemies', effect: (g) => g.augments.push('titan_killer') },
    // Mage Path
    { id: 'black_hole', name: 'Black Hole', icon: '⚫', desc: 'Orbitals have a chance to pull enemies in and crush them', effect: (g) => g.augments.push('black_hole') },
    { id: 'time_stop', name: 'Chrono Field', icon: '⏳', desc: 'Periodically freeze all enemies for 3 seconds', effect: (g) => g.augments.push('time_stop') },
    { id: 'elemental_mastery', name: 'Elemental Mastery', icon: '🌈', desc: 'Orbitals cycle between Fire, Ice, and Lightning effects', effect: (g) => g.augments.push('elemental_mastery') },
    { id: 'unlimited_power', name: 'Unlimited Power', icon: '⚡', desc: 'Cooldowns reduced by 50%, Orbitals spin 2x faster', effect: (g) => g.orbitals.forEach(o => o.speed *= 2) },
    // Dotomancer Path
    { id: 'army_of_dead', name: 'Army of the Dead', icon: '🧟', desc: 'Max minions +5, conversion chance +10%', effect: (g) => { g.maxMinions = (g.maxMinions || 0) + 5; g.conversionChance += 0.1; } },

    { id: 'soul_explosion', name: 'Soul Explosion', icon: '💥', desc: 'Minions explode on death dealing 500 damage', effect: (g) => g.augments.push('soul_explosion') },
    { id: 'lich_king', name: 'Lich King', icon: '👑', desc: 'You gain +10% damage for every active minion', effect: (g) => g.augments.push('lich_king') },
    // New Hybrid Paths
    { id: 'tech_wizard', name: 'Tech Wizard', icon: '🔮', desc: 'Projectiles spawn Orbitals on hit (10% chance)', effect: (g) => g.augments.push('tech_wizard') },
    { id: 'commander', name: 'Field Commander', icon: '📣', desc: 'Your fire rate boosts minion attack speed', effect: (g) => g.augments.push('commander') },
    // Demon Set Augments
    { id: 'imp_horde', name: 'Imp Horde', icon: '👿', desc: 'Max Imps +5', req: 'demonSet', effect: (g) => g.impStats.maxImps += 5 },
    { id: 'hellfire_fury', name: 'Hellfire Fury', icon: '🔥', desc: 'Imp Damage +100%', req: 'demonSet', effect: (g) => g.impStats.damage *= 2 },
    { id: 'eternal_flame', name: 'Eternal Flame', icon: '🕯️', desc: 'Imp Burn Duration +5s', req: 'demonSet', effect: (g) => g.impStats.burnDuration += 5 }
];

// Items that can drop
const ITEMS = {
    xpRing: { name: 'Ring of XP', icon: '💍', desc: '+5% XP per level', maxLevel: 10, effect: (g, lvl) => g.xpMultiplier = 1 + lvl * 0.05 },
    collector: { name: 'Collector', icon: '🧲', desc: '+30 pickup radius per level', maxLevel: 5, effect: (g, lvl) => g.magnetRadius = 100 + lvl * 30 },
    boots: { name: 'Swift Boots', icon: '👢', desc: '+20 speed per level', maxLevel: 5, effect: (g, lvl) => g.player.speed = 220 + lvl * 20 },
    shield: { name: 'Barrier Shield', icon: '🛡️', desc: 'Block 1 hit. -5s cooldown per level', maxLevel: 10, baseCooldown: 60, effect: (g, lvl) => { g.shieldCooldown = Math.max(10, 60 - lvl * 5); } }
};

// Difficulty settings
const DIFFICULTIES = {
    easy: {
        name: 'Easy',
        icon: '😊',
        color: '#4ade80',
        desc: 'Relaxed gameplay for casual fun',
        enemyHealthMult: 0.6,
        enemyDamageMult: 0.5,
        enemySpeedMult: 0.8,
        spawnRateMult: 1.3,
        scalingPerWave: 0.12,
        playerHealthMult: 1.3,
        xpMult: 1.5
    },
    medium: {
        name: 'Medium',
        icon: '😐',
        color: '#fbbf24',
        desc: 'Balanced challenge for most players',
        enemyHealthMult: 1.0,
        enemyDamageMult: 1.0,
        enemySpeedMult: 1.0,
        spawnRateMult: 1.0,
        scalingPerWave: 0.20,
        playerHealthMult: 1.0,
        xpMult: 1.0
    },
    hard: {
        name: 'Hard',
        icon: '😠',
        color: '#f97316',
        desc: 'For experienced survivors only',
        enemyHealthMult: 1.4,
        enemyDamageMult: 1.3,
        enemySpeedMult: 1.2,
        spawnRateMult: 0.7,
        scalingPerWave: 0.28,
        playerHealthMult: 0.8,
        xpMult: 0.8
    },
    extreme: {
        name: '☠️ EXTREME',
        icon: '☠️',
        color: '#dc2626',
        desc: 'You WILL die. How long can you last?',
        enemyHealthMult: 2.0,
        enemyDamageMult: 1.8,
        enemySpeedMult: 1.4,
        spawnRateMult: 0.5,
        scalingPerWave: 0.40,
        playerHealthMult: 0.6,
        xpMult: 0.6
    }
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

        // World offset for infinite scrolling
        this.worldX = 0;
        this.worldY = 0;

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
            { id: 'firerate', name: 'Rapid Fire', icon: '🔫', desc: 'Shoot 20% faster', rarity: 'rare', effect: (g) => g.weapons.bullet.fireRate = Math.floor(g.weapons.bullet.fireRate * 0.8), getDesc: (g) => `Fire Rate: ${(1000 / g.weapons.bullet.fireRate).toFixed(1)}/s → ${(1000 / (g.weapons.bullet.fireRate * 0.8)).toFixed(1)}/s` },
            { id: 'multishot', name: 'Multi Shot', icon: '🎯', desc: 'Fire +1 projectile per shot', rarity: 'rare', effect: (g) => g.weapons.bullet.count++, getDesc: (g) => `Projectiles: ${g.weapons.bullet.count} → ${g.weapons.bullet.count + 1}` },
            { id: 'pierce', name: 'Piercing', icon: '🗡️', desc: 'Projectiles pass through +1 enemy', rarity: 'rare', effect: (g) => g.weapons.bullet.pierce++, getDesc: (g) => `Pierce: ${g.weapons.bullet.pierce} → ${g.weapons.bullet.pierce + 1}` },
            { id: 'magnet', name: 'Magnet', icon: '🧲', desc: 'Attract pickups from +50 range', rarity: 'common', effect: (g) => g.magnetRadius += 50, getDesc: (g) => `Magnet Range: ${g.magnetRadius} → ${g.magnetRadius + 50}` },
            { id: 'healregen', name: 'Regeneration', icon: '💚', desc: 'Regenerate +1 HP per second', rarity: 'rare', effect: (g) => g.player.hpRegen = (g.player.hpRegen || 0) + 1, getDesc: (g) => `HP Regen: ${g.player.hpRegen || 0}/s → ${(g.player.hpRegen || 0) + 1}/s` },
            { id: 'stars', name: 'Orbiting Stars', icon: '⭐', desc: 'Adds a star that circles around you', rarity: 'rare', effect: (g) => g.stars.push(g.createStar()), getDesc: (g) => `Stars: ${g.stars.length} → ${g.stars.length + 1}` },
            { id: 'crit', name: 'Critical Hit', icon: '⚡', desc: '+15% Crit Chance (Max 100%)', rarity: 'epic', effect: (g) => g.weapons.bullet.critChance = Math.min(1.0, (g.weapons.bullet.critChance || 0.05) + 0.15), getDesc: (g) => `Crit Chance: ${Math.floor((g.weapons.bullet.critChance || 0.05) * 100)}% → ${Math.min(100, Math.floor(((g.weapons.bullet.critChance || 0.05) + 0.15) * 100))}%` },
            { id: 'critdmg', name: 'Lethal Strike', icon: '🩸', desc: '+50% Crit Damage', rarity: 'epic', effect: (g) => g.weapons.bullet.critMultiplier = (g.weapons.bullet.critMultiplier || 2.0) + 0.5, getDesc: (g) => `Crit Damage: ${Math.floor((g.weapons.bullet.critMultiplier || 2.0) * 100)}% → ${Math.floor(((g.weapons.bullet.critMultiplier || 2.0) + 0.5) * 100)}%` },
            { id: 'armor', name: 'Armor', icon: '🛡️', desc: 'Gain +50 HP and +25 speed', rarity: 'epic', effect: (g) => { g.player.maxHealth += 50; g.player.health += 50; g.player.speed += 25; }, getDesc: (g) => `HP: ${g.player.maxHealth}→${g.player.maxHealth + 50}, Speed: ${g.player.speed}→${g.player.speed + 25}` },
            { id: 'morestars', name: 'Star Shower', icon: '🌟', desc: 'Adds 3 orbiting stars', rarity: 'epic', effect: (g) => { for (let i = 0; i < 3; i++) g.stars.push(g.createStar()); }, getDesc: (g) => `Stars: ${g.stars.length} → ${g.stars.length + 3}` },
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

        // Skip class select, go straight to difficulty or start
        this.selectedClass = SURVIVOR_CLASS;
        this.player.color = this.selectedClass.color;

        // Default to Medium difficulty
        this.selectedDifficulty = DIFFICULTIES.medium;
        this.showBoostSelect();

        document.getElementById('restart-btn').addEventListener('click', () => {
            this.selectedDifficulty = DIFFICULTIES.medium;
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
                await this.saveGame();
                this.gameRunning = false;
                document.getElementById('pause-menu').classList.add('hidden');
                document.getElementById('game-hud').classList.add('hidden');
                document.getElementById('start-menu').classList.remove('hidden');
                authManager.showStartMenu();
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
        this.canvas.addEventListener('touchstart', (e) => { if (!this.gameRunning || this.gamePaused) return; e.preventDefault(); const t = e.touches[0]; if (t.clientX < window.innerWidth / 2) { this.joystick.active = true; this.joystick.startX = t.clientX; this.joystick.startY = t.clientY; } }, { passive: false });
        this.canvas.addEventListener('touchmove', (e) => { if (!this.joystick.active) return; e.preventDefault(); const t = e.touches[0]; const dx = t.clientX - this.joystick.startX, dy = t.clientY - this.joystick.startY; const d = Math.sqrt(dx * dx + dy * dy); if (d > 0) { const c = Math.min(d, 60); this.joystick.dx = (dx / d) * (c / 60); this.joystick.dy = (dy / d) * (c / 60); } }, { passive: false });
        this.canvas.addEventListener('touchend', () => { this.joystick.active = false; this.joystick.dx = 0; this.joystick.dy = 0; });
    }

    showDifficultySelect() {
        document.getElementById('gameover-menu').classList.add('hidden');
        document.getElementById('start-menu').classList.remove('hidden');

        const menu = document.getElementById('start-menu');
        const content = menu.querySelector('.menu-content');
        content.innerHTML = `
            <h1 class="game-title">DOTS<span>SURVIVOR</span></h1>
            <p class="game-subtitle">Survive the endless horde!</p>
            <p style="color:#888;margin-bottom:1rem;">Select difficulty:</p>
            <div class="difficulty-selection" style="display:flex;gap:0.8rem;flex-wrap:wrap;justify-content:center;margin:1rem 0;">
                ${Object.entries(DIFFICULTIES).map(([id, d]) => `
                    <div class="diff-card" data-diff="${id}" style="background:${d.color}22;border:2px solid ${d.color};border-radius:12px;padding:1rem;width:130px;cursor:pointer;transition:all 0.2s;text-align:center;">
                        <div style="font-size:2rem;">${d.icon}</div>
                        <div style="font-weight:700;color:${d.color};margin:0.3rem 0;">${d.name}</div>
                        <div style="font-size:0.7rem;color:#888;">${d.desc}</div>
                    </div>
                `).join('')}
            </div>
            <div class="controls-info"><p>🎮 WASD/Arrows to move & aim</p><p>🔫 Shoots in movement direction</p><p>⏸️ ESC/P to pause</p></div>
        `;
        content.querySelectorAll('.diff-card').forEach(card => {
            card.addEventListener('click', () => this.selectDifficulty(card.dataset.diff));
            card.addEventListener('mouseenter', () => card.style.transform = 'scale(1.05)');
            card.addEventListener('mouseleave', () => card.style.transform = 'scale(1)');
        });
    }

    selectDifficulty(diffId) {
        this.selectedDifficulty = DIFFICULTIES[diffId];
        this.showBoostSelect();
    }

    showBoostSelect() {
        const menu = document.getElementById('start-menu');
        const content = menu.querySelector('.menu-content');
        content.innerHTML = `
            <h1 class="game-title">START<span>BOOST</span></h1>
            <p class="game-subtitle">Choose your starting bonus:</p>
            <div style="display:flex;gap:1.5rem;justify-content:center;margin:2rem 0;">
                <div class="diff-card" id="btn-fresh" style="background:#44ff8822;border:2px solid #44ff88;border-radius:12px;padding:1.5rem;width:180px;cursor:pointer;text-align:center;">
                    <div style="font-size:2.5rem;">🌱</div>
                    <div style="font-weight:700;color:#44ff88;font-size:1.2rem;margin:0.5rem 0;">Fresh Start</div>
                    <div style="font-size:0.85rem;color:#ccc;">Start at Level 1</div>
                    <div style="font-size:0.9rem;color:#fff;margin-top:0.5rem;">+3 Free Upgrades</div>
                </div>
                <div class="diff-card" id="btn-boosted" style="background:#00ccff22;border:2px solid #00ccff;border-radius:12px;padding:1.5rem;width:180px;cursor:pointer;text-align:center;">
                    <div style="font-size:2.5rem;">🚀</div>
                    <div style="font-weight:700;color:#00ccff;font-size:1.2rem;margin:0.5rem 0;">Head Start</div>
                    <div style="font-size:0.85rem;color:#ccc;">Start at Level 5</div>
                    <div style="font-size:0.9rem;color:#fff;margin-top:0.5rem;">+5 Free Upgrades</div>
                </div>
            </div>
            <p style="color:#666;font-size:0.8rem;">Select one to begin</p>
        `;

        document.getElementById('btn-fresh').addEventListener('click', () => this.startGame('fresh'));
        document.getElementById('btn-boosted').addEventListener('click', () => this.startGame('boosted'));
    }

    resizeCanvas() { this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight; }

    startGame(mode = 'fresh') {
        const diff = this.selectedDifficulty;
        document.getElementById('start-menu').classList.add('hidden'); // Ensure menu hidden

        this.worldX = 0; this.worldY = 0;
        this.player.x = this.canvas.width / 2; this.player.y = this.canvas.height / 2;

        // Apply difficulty to player
        const baseHealth = Math.floor(100 * diff.playerHealthMult);
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

        this.weapons.bullet = { damage: 10, speed: 450, fireRate: 450, lastFired: 0, count: 1, size: 6, pierce: 1, color: this.selectedClass.color, critChance: 0.05, critMultiplier: 2.0 };

        // Apply class bonuses
        if (this.selectedClass.bonuses.bulletCount) this.weapons.bullet.count += this.selectedClass.bonuses.bulletCount;
        if (this.selectedClass.bonuses.fireRate) this.weapons.bullet.fireRate = Math.floor(this.weapons.bullet.fireRate * this.selectedClass.bonuses.fireRate);
        if (this.selectedClass.bonuses.damage) this.weapons.bullet.damage = Math.floor(this.weapons.bullet.damage * this.selectedClass.bonuses.damage);

        this.enemies = []; this.projectiles = []; this.pickups = []; this.particles = []; this.damageNumbers = [];
        this.orbitals = []; this.minions = []; this.items = {}; this.stars = [];
        this.wave = 1; this.waveTimer = 0; this.gameTime = 0;

        // INTENSE spawn rate (faster spawns)
        this.baseSpawnRate = Math.floor(500 * diff.spawnRateMult);
        // Necromancer gets even more enemies
        if (this.selectedClass.bonuses.spawnsMoreEnemies) this.baseSpawnRate = Math.floor(this.baseSpawnRate * 0.6);
        this.enemySpawnRate = this.baseSpawnRate;

        this.magnetRadius = 100; this.xpMultiplier = diff.xpMult;
        this.shieldActive = false; this.shieldTimer = 0; this.shieldCooldown = 60;

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
        this.spawnControlPoint();

        // Health packs (rare spawns)
        this.lastHealthPackSpawn = 0;
        this.healthPackInterval = 45000; // Every 45 seconds chance

        // Camera zoom
        this.cameraScale = 0.65;

        // Regen timer
        this.regenTimer = 0;

        // Diamond Augments & Dotomancer Stats
        this.augments = [];
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
        // Spawn a massive wave of enemies
        const hordeSize = 30 + this.wave * 5;

        // Show horde warning
        this.damageNumbers.push({
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 - 50,
            value: '⚠️ HORDE INCOMING! ⚠️',
            lifetime: 3,
            color: '#ff0044'
        });

        // Spawn enemies in a circle around player
        for (let i = 0; i < hordeSize; i++) {
            setTimeout(() => {
                const angle = (i / hordeSize) * Math.PI * 2 + Math.random() * 0.5;
                const dist = 500 + Math.random() * 300;
                const wx = this.worldX + Math.cos(angle) * dist;
                const wy = this.worldY + Math.sin(angle) * dist;

                const types = ['basic', 'fast', 'swarm', 'swarm'];
                const type = types[Math.floor(Math.random() * types.length)];
                this.enemies.push(this.createEnemy(wx, wy, type));
            }, i * 50); // Stagger spawns for dramatic effect
        }
    }

    update(dt) {
        this.updatePlayer(dt);
        this.updateShield(dt);
        this.updateRegen(dt);
        this.updateChronoField(dt);
        this.updateElementalCycle(dt);
        this.spawnEnemies();
        this.spawnHealthPacks();
        this.updateControlPoints(dt);
        this.updateEnemies(dt);
        this.updateOrbitals(dt);
        this.updateStars(dt);
        this.updateMinions(dt);
        this.updateActiveMinions(dt);
        this.updateImps(dt);
        this.fireWeapons();
        this.updateProjectiles(dt);
        this.updatePickups(dt);
        this.updateParticles(dt);
        this.updateDamageNumbers(dt);
        if (this.player.health <= 0) this.gameOver();
        this.updateHUD();
    }

    updateRegen(dt) {
        if (this.player.hpRegen > 0) {
            this.regenTimer += dt;
            if (this.regenTimer >= 1) {
                this.regenTimer = 0;
                this.player.health = Math.min(this.player.maxHealth, this.player.health + this.player.hpRegen);
            }
        }
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
        // Award legendary perk
        if (this.availablePerks.length > 0) {
            const idx = Math.floor(Math.random() * this.availablePerks.length);
            const perk = this.availablePerks.splice(idx, 1)[0];
            this.perks.push(perk);
            this.applyPerk(perk);
            this.damageNumbers.push({
                x: this.player.x, y: this.player.y - 60,
                value: `✨ ${perk.name}! ✨`, lifetime: 3, color: '#fbbf24'
            });
        }
        // Trigger horde!
        this.spawnHorde();
        // Spawn next control point
        this.spawnControlPoint();
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

        // Infinite world - move world offset instead of clamping player
        const moveX = dx * this.player.speed * dt;
        const moveY = dy * this.player.speed * dt;
        this.worldX += moveX; this.worldY += moveY;
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
        if (now - this.lastEnemySpawn < this.enemySpawnRate) return;
        this.lastEnemySpawn = now;

        // Spawn around player in world coordinates
        const angle = Math.random() * Math.PI * 2;
        const dist = 300 + Math.random() * 200; // Closer spawns (was 400-600)
        const wx = this.worldX + Math.cos(angle) * dist;
        const wy = this.worldY + Math.sin(angle) * dist;

        const types = ['basic', 'basic'];
        if (this.wave >= 2) types.push('runner', 'runner');
        if (this.wave >= 3) types.push('tank', 'splitter');
        if (this.wave >= 4) types.push('swarm', 'swarm', 'bomber');
        if (this.wave >= 5) types.push('splitter', 'bomber');

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

    createEnemy(wx, wy, type, isSplit = false) {
        const diff = this.selectedDifficulty;
        const waveMult = 1 + (this.wave - 1) * diff.scalingPerWave;
        const data = {
            basic: { radius: 14, speed: 85, health: 30, damage: 12, xp: 6, color: '#ff4466', icon: '' },
            runner: { radius: 10, speed: 180, health: 40, damage: 8, xp: 5, color: '#00ffff', icon: '💨' },
            tank: { radius: 28, speed: 50, health: 350, damage: 25, xp: 25, color: '#8844ff', icon: '' },
            swarm: { radius: 8, speed: 110, health: 35, damage: 8, xp: 4, color: '#ff66aa', icon: '' },
            splitter: { radius: 20, speed: 70, health: 150, damage: 15, xp: 15, color: '#44ddff', icon: '💧', splits: true },
            bomber: { radius: 16, speed: 90, health: 75, damage: 10, xp: 12, color: '#ff8800', icon: '💣', explodes: true },
            mini: { radius: 8, speed: 120, health: 30, damage: 6, xp: 3, color: '#44ddff', icon: '' }
        }[type] || data.basic;

        const sizeMult = isSplit ? 0.6 : 1;
        return {
            wx, wy, type,
            radius: Math.floor(data.radius * sizeMult),
            speed: Math.floor(data.speed * diff.enemySpeedMult),
            health: Math.floor(data.health * waveMult * diff.enemyHealthMult * sizeMult),
            maxHealth: Math.floor(data.health * waveMult * diff.enemyHealthMult * sizeMult),
            damage: Math.floor(data.damage * waveMult * diff.enemyDamageMult),
            xp: Math.floor(data.xp * waveMult),
            color: data.color, icon: data.icon || '', hitFlash: 0, isBoss: false,
            splits: data.splits || false,
            explodes: data.explodes || false
        };
    }

    createBoss(wx, wy, type = 'boss') {
        const diff = this.selectedDifficulty;
        const waveMult = 1 + this.wave * diff.scalingPerWave;

        let name = `${BOSS_PREFIXES[Math.floor(Math.random() * BOSS_PREFIXES.length)]} ${BOSS_NAMES[Math.floor(Math.random() * BOSS_NAMES.length)]} ${BOSS_SUFFIXES[Math.floor(Math.random() * BOSS_SUFFIXES.length)]}`;
        let face = '😈';
        let color = '#ff0044';
        let stats = { health: 2500, damage: 50, speed: 40, radius: 80, xp: 500 };

        if (type === 'general') {
            name = `DEMON GENERAL ${BOSS_NAMES[Math.floor(Math.random() * BOSS_NAMES.length)]}`;
            face = '👹';
            color = '#8800ff';
            stats = { health: 6000, damage: 80, speed: 50, radius: 100, xp: 2000 };
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
            speed: Math.floor(stats.speed * diff.enemySpeedMult), // Speed does NOT scale
            health: Math.floor(stats.health * waveMult * diff.enemyHealthMult * statMult),
            maxHealth: Math.floor(stats.health * waveMult * diff.enemyHealthMult * statMult),
            damage: Math.floor(stats.damage * waveMult * diff.enemyDamageMult * statMult),
            xp: Math.floor(stats.xp * waveMult),
            color, hitFlash: 0, isBoss: true,
            critResistance: critResist
        };
    }

    updateEnemies(dt) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];

            // Skip movement if frozen by Chrono Field
            if (e.frozen) {
                if (e.hitFlash > 0) e.hitFlash -= dt * 5;
                continue; // Skip all actions for frozen enemies
            }

            // Move towards player (world coords)
            const dx = this.worldX - e.wx, dy = this.worldY - e.wy;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d > 0) { e.wx += (dx / d) * e.speed * dt; e.wy += (dy / d) * e.speed * dt; }
            if (e.hitFlash > 0) e.hitFlash -= dt * 5;
            // Screen position
            const sx = this.player.x + (e.wx - this.worldX);
            const sy = this.player.y + (e.wy - this.worldY);

            // Apply time warp perk
            const speedMult = this.timewarp ? 0.7 : 1;

            // Collision with player
            const pd = Math.sqrt((sx - this.player.x) ** 2 + (sy - this.player.y) ** 2);
            if (pd < e.radius + this.player.radius && this.player.invincibleTime <= 0) {
                if (this.shieldActive) { this.shieldActive = false; this.shieldTimer = 0; this.spawnParticles(this.player.x, this.player.y, '#00aaff', 10); }
                else { this.player.health -= e.damage; this.player.invincibleTime = 0.5; this.damageNumbers.push({ x: this.player.x, y: this.player.y - 20, value: -e.damage, lifetime: 1, color: '#ff4444' }); this.playSound('hit'); }
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
                if (Math.random() < 0.1) this.spawnParticles(sx, sy, '#ff4400', 3);
            }

            // Dead
            if (e.health <= 0) {
                this.player.kills++;
                this.playSound('kill');

                // Dotomancer Conversion
                if (this.conversionChance > 0 && Math.random() < this.conversionChance) {
                    // Turn into minion
                    if (this.minions.length < (this.maxMinions || 5) + 5) { // Allow overflowing max slightly for conversions, or cap it? 
                        // Let's cap it at maxMinions + some buffer, OR just normal max. 
                        // Usually summoner classes allow temporary minions beyond limit or hard cap.
                        // Let's enforce maxMinions but maybe upgrades increase it.
                        // Actually, converted minions should probably be temporary or count towards cap? 
                        // If they count towards cap, they might block strong summoned ones.
                        // Let's make them separate or just count them.
                        // "Necromancer should be able to turn killed dots into its minions"
                        // I'll make a special 'undead' minion type that inherits stats.

                        const undead = {
                            x: sx, y: sy,
                            radius: e.radius,
                            speed: e.speed * 0.8,
                            damage: Math.floor(e.damage * 0.5), // 25% stats was requested, higher with attributes. Let's start at 50% as base is weak.
                            health: Math.floor(e.maxHealth * 0.25),
                            maxHealth: Math.floor(e.maxHealth * 0.25),
                            color: '#88ff88',
                            icon: '🧟',
                            isRanged: false,
                            target: null,
                            attackCooldown: 0,
                            lifetime: 20 // Undead expire? The prompt didn't say. Let's keep them permanent until death.
                        };

                        // Apply bonuses
                        if (this.selectedClass.bonuses.minionDamage) undead.damage = Math.floor(undead.damage * this.selectedClass.bonuses.minionDamage);

                        this.minions.push(undead);
                        this.spawnParticles(sx, sy, '#88ff88', 10);
                        this.damageNumbers.push({ x: sx, y: sy - 20, value: 'Rise!', lifetime: 1, color: '#88ff88' });
                    }
                }

                // Vampiric perk
                if (this.vampiric) {
                    this.player.health = Math.min(this.player.maxHealth, this.player.health + 2);
                }

                // Splitter spawns mini enemies
                if (e.splits) {
                    for (let j = 0; j < 3; j++) {
                        const angle = (j / 3) * Math.PI * 2;
                        const mini = this.createEnemy(e.wx + Math.cos(angle) * 20, e.wy + Math.sin(angle) * 20, 'mini', true);
                        this.enemies.push(mini);
                    }
                }

                // Bomber explodes
                if (e.explodes) {
                    this.spawnParticles(sx, sy, '#ff8800', 20);
                    // Damage player if close
                    if (pd < 80) {
                        const dmg = Math.floor(e.damage * 1.5);
                        this.player.health -= dmg;
                        this.damageNumbers.push({ x: this.player.x, y: this.player.y - 20, value: -dmg, lifetime: 1, color: '#ff8800' });
                    }
                }

                // Nuclear perk - enemies explode
                if (this.nuclear) {
                    this.spawnParticles(sx, sy, '#ffff00', 15);
                    // Damage nearby enemies
                    for (const other of this.enemies) {
                        if (other === e) continue;
                        const osx = this.player.x + (other.wx - this.worldX);
                        const osy = this.player.y + (other.wy - this.worldY);
                        const od = Math.sqrt((sx - osx) ** 2 + (sy - osy) ** 2);
                        if (od < 60) other.health -= 15;
                    }
                }

                const xpGain = Math.floor(e.xp * this.xpMultiplier);
                this.pickups.push({ wx: e.wx, wy: e.wy, xp: xpGain, radius: 8, color: '#4ade80', isItem: false });
                this.spawnParticles(sx, sy, e.color, 10);
                // Boss drops item
                if (e.isBoss) {
                    if (e.type === 'general') {
                        // Drop Demon Piece
                        // Find uncollected piece
                        const missing = DEMON_SET_PIECES.filter(p => !this.demonSet[p.id]);
                        if (missing.length > 0) {
                            const piece = missing[Math.floor(Math.random() * missing.length)];
                            this.pickups.push({
                                wx: e.wx, wy: e.wy,
                                radius: 12, color: '#ff0044',
                                isDemonPiece: true, pieceId: piece.id
                            });
                        } else {
                            // All collected? Maybe big XP or random item
                            this.dropItem(e.wx, e.wy);
                        }
                    } else {
                        this.dropItem(e.wx, e.wy);
                    }
                }
                this.enemies.splice(i, 1);
            }
        }
    }

    dropItem(wx, wy) {
        const itemKeys = Object.keys(ITEMS);
        const itemKey = itemKeys[Math.floor(Math.random() * itemKeys.length)];
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

        for (let i = 0; i < w.count; i++) {
            const offset = (i - (w.count - 1) / 2) * 0.15;
            const a = baseAngle + offset;
            this.projectiles.push({ x: this.player.x, y: this.player.y, vx: Math.cos(a) * w.speed, vy: Math.sin(a) * w.speed, radius: w.size, damage: w.damage, pierce: w.pierce, color: w.color, hitEnemies: [] });
        }
    }

    updateProjectiles(dt) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx * dt; p.y += p.vy * dt;
            // Remove if too far from player
            if (Math.abs(p.x - this.player.x) > 800 || Math.abs(p.y - this.player.y) > 800) { this.projectiles.splice(i, 1); continue; }
            for (const e of this.enemies) {
                if (p.hitEnemies.includes(e)) continue;
                const sx = this.player.x + (e.wx - this.worldX);
                const sy = this.player.y + (e.wy - this.worldY);
                const d = Math.sqrt((p.x - sx) ** 2 + (p.y - sy) ** 2);
                if (d < p.radius + e.radius) {
                    // Crit Calculation
                    let damage = p.damage;
                    const isCrit = Math.random() < (this.weapons.bullet.critChance || 0.05);
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
                    // Health pack
                    const healed = Math.min(pk.healAmount, this.player.maxHealth - this.player.health);
                    this.player.health += healed;
                    this.damageNumbers.push({ x: this.player.x, y: this.player.y - 30, value: `+${healed} HP`, lifetime: 1.5, color: '#ff4488' });
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
                    this.checkLevelUp();
                }
                this.pickups.splice(i, 1);
            }
        }
    }

    collectItem(key) {
        if (!this.items[key]) this.items[key] = 0;
        const item = ITEMS[key];
        if (this.items[key] < item.maxLevel) {
            this.items[key]++;
            item.effect(this, this.items[key]);
            this.damageNumbers.push({ x: this.player.x, y: this.player.y - 40, value: `${item.icon} ${item.name} Lv${this.items[key]}`, lifetime: 2, color: '#fbbf24' });
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
        this.gamePaused = true;
        this.playSound('levelup');
        const choices = this.getRandomUpgrades(3);
        const container = document.getElementById('upgrade-choices');
        container.innerHTML = '';
        choices.forEach(u => {
            const desc = u.getDesc ? u.getDesc(this) : u.desc;
            const card = document.createElement('div');
            card.className = `upgrade-card ${u.rarity}`;
            card.innerHTML = `<div class="upgrade-rarity">${u.rarity}</div><div class="upgrade-icon">${u.icon}</div><div class="upgrade-name">${u.name}</div><div class="upgrade-desc">${desc}</div>`;
            card.addEventListener('click', () => {
                u.effect(this);
                document.getElementById('levelup-menu').classList.add('hidden');

                // Handle multiple pending upgrades
                if (this.pendingUpgrades > 0) {
                    this.pendingUpgrades--;
                    if (this.pendingUpgrades > 0) {
                        // Show next upgrade immediately
                        setTimeout(() => this.showLevelUpMenu(), 100);
                        return;
                    }
                }

                this.gamePaused = false;
            });
            container.appendChild(card);
        });
        document.getElementById('levelup-menu').classList.remove('hidden');

        // Update title to show pending count if applicable
        const title = document.querySelector('#levelup-menu h2');
        if (title) {
            title.textContent = this.pendingUpgrades > 0 ? `LEVEL UP! (${this.pendingUpgrades} Remaining)` : 'LEVEL UP!';
        }
    }

    showAugmentMenu() {
        this.gamePaused = true;
        this.playSound('levelup');

        // Use the flattened DIAMOND_AUGMENTS
        const available = DIAMOND_AUGMENTS.filter(a => {
            if (this.augments.includes(a.id)) return false;
            if (a.req === 'demonSet' && !this.demonSetBonusActive) return false;
            return true;
        });

        if (available.length === 0) {
            this.showLevelUpMenu();
            return;
        }

        const choices = [];
        // Pick 2 random available augments
        // Since we removed strict class paths, all are available
        const pool = [...available];
        while (choices.length < 2 && pool.length > 0) {
            const idx = Math.floor(Math.random() * pool.length);
            choices.push(pool.splice(idx, 1)[0]);
        }

        const container = document.getElementById('augment-choices');
        container.innerHTML = '';
        choices.forEach(u => {
            // For Diamond Augments, we don't usually need comparison stats as they are unique toggles, but could add if needed
            const card = document.createElement('div');
            card.className = `upgrade-card legendary`;
            card.style.borderColor = '#00ffff';
            card.style.boxShadow = '0 0 15px rgba(0,255,255,0.2)';
            card.innerHTML = `<div class="upgrade-rarity" style="background:#00ffff;color:#000;">DIAMOND</div><div class="upgrade-icon">${u.icon}</div><div class="upgrade-name" style="color:#00ffff;">${u.name}</div><div class="upgrade-desc" style="color:#aee;">${u.desc}</div>`;
            card.addEventListener('click', () => {
                u.effect(this);
                document.getElementById('augment-menu').classList.add('hidden');
                this.gamePaused = false;
                this.damageNumbers.push({ x: this.player.x, y: this.player.y - 80, value: `💎 ${u.name}!`, lifetime: 3, color: '#00ffff' });
                this.updateAugmentDisplay();
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

    // ... (rest of methods until drawHUD) ...

    drawHUD() {
        // This is not an existing method, the HUD is HTML based in this codebase (checked earlier).
        // Wait, line 1370 suggests item drawing on canvas? 
        // "ctx.fillRect(20, y, 100, 20)" -> Yes, `drawHUD` or similar exists but I don't see the method definition in the snippet.
        // Ah, looking at previous `view_file` (1370-1378), it seems to be inside `render` or a `drawHUD` method.
        // It uses `ctx`. Let's assume it's part of `render` or called by it.
        // The snippet 1370 starts with `if (lvl > 0)`.
        // I need to insert the diamond augment display *after* the items loop.

        // Let's find where the items loop ends. Line 1377 `});`.
        // I will append code there.
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

    render() {
        const ctx = this.ctx;
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Apply camera zoom (centered on player)
        ctx.save();
        const scale = this.cameraScale || 1;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        ctx.translate(centerX, centerY);
        ctx.scale(scale, scale);
        ctx.translate(-centerX, -centerY);

        this.drawGrid();
        // Pickups
        this.pickups.forEach(pk => {
            const sx = this.player.x + (pk.wx - this.worldX);
            const sy = this.player.y + (pk.wy - this.worldY);
            ctx.beginPath(); ctx.arc(sx, sy, pk.radius, 0, Math.PI * 2);
            ctx.fillStyle = pk.color; ctx.shadowBlur = 15; ctx.shadowColor = pk.color; ctx.fill(); ctx.shadowBlur = 0;
            if (pk.isItem) { ctx.font = '14px Inter'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(ITEMS[pk.itemKey].icon, sx, sy + 5); }
        });
        // Projectiles
        this.projectiles.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill(); });
        // Enemies
        this.enemies.forEach(e => {
            const sx = this.player.x + (e.wx - this.worldX);
            const sy = this.player.y + (e.wy - this.worldY);
            if (sx < -200 || sx > this.canvas.width + 200 || sy < -200 || sy > this.canvas.height + 200) return;
            ctx.beginPath(); ctx.arc(sx, sy, e.radius, 0, Math.PI * 2);
            ctx.fillStyle = e.hitFlash > 0 ? '#fff' : e.color; ctx.fill();
            // Enemy icon
            if (e.icon) {
                ctx.font = `${e.radius}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(e.icon, sx, sy);
            }
            if (e.isBoss) {
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
        // Health bar
        this.drawHealthBar();
        // Items display
        this.drawItems();
        // Joystick
        if (this.isMobile && this.joystick.active) this.drawJoystick();

        // Armor HUD
        this.drawArmorHUD();
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

    drawPlayer() {
        const ctx = this.ctx, p = this.player;
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

        // Items
        Object.entries(this.items).forEach(([key, lvl]) => {
            if (lvl > 0) {
                const item = ITEMS[key];
                ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(20, y, 100, 20);
                ctx.font = '12px Inter'; ctx.fillStyle = '#fbbf24'; ctx.textAlign = 'left';
                ctx.fillText(`${item.icon} Lv${lvl}`, 25, y + 14);
                y += 24;
            }
        });

        // Diamond Augments
        y += 10;
        this.augments.forEach(augId => {
            const aug = DIAMOND_AUGMENTS.find(a => a.id === augId);
            if (aug) {
                ctx.fillStyle = 'rgba(0,30,40,0.7)'; ctx.fillRect(20, y, 120, 20);
                ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 1; ctx.strokeRect(20, y, 120, 20);
                ctx.font = '12px Inter'; ctx.fillStyle = '#00ffff'; ctx.textAlign = 'left';
                ctx.fillText(`${aug.icon} ${aug.name}`, 25, y + 14);
                y += 24;
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
