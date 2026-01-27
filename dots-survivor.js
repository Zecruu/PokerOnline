// Dots Survivor - Complete Game with Classes, Items, Bosses & Infinite Map

// Boss name generators
const BOSS_PREFIXES = ['Dark', 'Doom', 'Blood', 'Shadow', 'Chaos', 'Death', 'Void', 'Dread', 'Grim', 'Infernal'];
const BOSS_NAMES = ['Destroyer', 'Eater', 'Bringer', 'Lord', 'King', 'Master', 'Titan', 'Overlord', 'Reaper', 'Slayer'];
const BOSS_SUFFIXES = ['of Pain', 'of Souls', 'the Cruel', 'the Mighty', 'Supreme', 'Eternal', 'Unstoppable', 'the Devourer'];

// Class definitions
const CLASSES = {
    soldier: {
        name: 'Soldier',
        icon: '🔫',
        color: '#ff6600',
        desc: 'Master of firearms. Shoots more projectiles.',
        bonuses: { bulletCount: 2, fireRate: 0.8, damage: 1.2 },
        upgrades: [
            { id: 'barrage', name: 'Barrage', icon: '🎯', desc: '+2 projectiles', rarity: 'rare', effect: (g) => g.weapons.bullet.count += 2 },
            { id: 'rapidfire', name: 'Machine Gun', icon: '💥', desc: '+40% fire rate', rarity: 'epic', effect: (g) => g.weapons.bullet.fireRate = Math.floor(g.weapons.bullet.fireRate * 0.6) },
            { id: 'explosive', name: 'Explosive Rounds', icon: '💣', desc: '+25 damage', rarity: 'legendary', effect: (g) => g.weapons.bullet.damage += 25 },
        ]
    },
    mage: {
        name: 'Mage',
        icon: '🔮',
        color: '#aa44ff',
        desc: 'Wields arcane power. Summons magical orbitals.',
        bonuses: { orbitalCount: 2, spellDamage: 1.5, xpBonus: 1.2 },
        upgrades: [
            { id: 'orbital', name: 'Arcane Orbital', icon: '🌀', desc: '+1 orbiting spell', rarity: 'rare', effect: (g) => g.orbitals.push(g.createOrbital()) },
            { id: 'nova', name: 'Nova Burst', icon: '✨', desc: 'Orbital damage +15', rarity: 'epic', effect: (g) => g.orbitals.forEach(o => o.damage += 15) },
            { id: 'meteor', name: 'Meteor Storm', icon: '☄️', desc: '+3 orbitals', rarity: 'legendary', effect: (g) => { for (let i = 0; i < 3; i++) g.orbitals.push(g.createOrbital()); } },
        ]
    },
    necromancer: {
        name: 'Necromancer',
        icon: '💀',
        color: '#44ff88',
        desc: 'Raises the dead. More enemies spawn to fuel your army.',
        bonuses: { minionCount: 3, minionDamage: 1.3, minionSpeed: 1.2, spawnsMoreEnemies: true },
        upgrades: [
            { id: 'gunner', name: 'Summon Gunner', icon: '🔫', desc: '+1 ranged minion', rarity: 'rare', effect: (g) => g.minions.push(g.createMinion('gunner')) },
            { id: 'tank', name: 'Summon Tank', icon: '🛡️', desc: '+1 tank minion', rarity: 'epic', effect: (g) => g.minions.push(g.createMinion('tank')) },
            { id: 'ravager', name: 'Summon Ravager', icon: '⚔️', desc: '+1 ravager minion', rarity: 'legendary', effect: (g) => g.minions.push(g.createMinion('ravager')) },
        ]
    }
};

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
    { id: 'magnetking', name: 'Magnet King', icon: '🧲', desc: 'Pickup radius +200, auto-collect XP' },
    { id: 'berserk', name: 'Berserker', icon: '😤', desc: '+100% damage when below 30% HP' },
    { id: 'guardian', name: 'Guardian Angel', icon: '👼', desc: 'Revive once with 50% HP' },
    { id: 'inferno', name: 'Inferno Aura', icon: '🔥', desc: 'Burn nearby enemies for 5 DPS' },
    { id: 'frozen', name: 'Frozen Heart', icon: '❄️', desc: 'Chance to freeze enemies on hit' }
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
            { id: 'speed', name: 'Swift Feet', icon: '👟', desc: 'Move 30 units faster', rarity: 'common', effect: (g) => g.player.speed += 30 },
            { id: 'health', name: 'Vitality', icon: '❤️', desc: 'Increases max HP by 30', rarity: 'common', effect: (g) => { g.player.maxHealth += 30; g.player.health += 30; } },
            { id: 'damage', name: 'Power Shot', icon: '💥', desc: 'Projectiles deal +5 damage', rarity: 'common', effect: (g) => g.weapons.bullet.damage += 5 },
            { id: 'firerate', name: 'Rapid Fire', icon: '🔫', desc: 'Shoot 20% faster', rarity: 'rare', effect: (g) => g.weapons.bullet.fireRate = Math.floor(g.weapons.bullet.fireRate * 0.8) },
            { id: 'multishot', name: 'Multi Shot', icon: '🎯', desc: 'Fire +1 projectile per shot', rarity: 'rare', effect: (g) => g.weapons.bullet.count++ },
            { id: 'pierce', name: 'Piercing', icon: '🗡️', desc: 'Projectiles pass through +1 enemy', rarity: 'rare', effect: (g) => g.weapons.bullet.pierce++ },
            { id: 'magnet', name: 'Magnet', icon: '🧲', desc: 'Attract pickups from +50 range', rarity: 'common', effect: (g) => g.magnetRadius += 50 },
            { id: 'healregen', name: 'Regeneration', icon: '💚', desc: 'Regenerate +1 HP per second', rarity: 'rare', effect: (g) => g.player.hpRegen = (g.player.hpRegen || 0) + 1 },
            { id: 'stars', name: 'Orbiting Stars', icon: '⭐', desc: 'Adds a star that circles around you', rarity: 'rare', effect: (g) => g.stars.push(g.createStar()) },
            { id: 'crit', name: 'Critical Hit', icon: '⚡', desc: 'All attacks deal +8 damage', rarity: 'epic', effect: (g) => g.weapons.bullet.damage += 8 },
            { id: 'armor', name: 'Armor', icon: '🛡️', desc: 'Gain +50 HP and +25 speed', rarity: 'epic', effect: (g) => { g.player.maxHealth += 50; g.player.health += 50; g.player.speed += 25; } },
            { id: 'morestars', name: 'Star Shower', icon: '🌟', desc: 'Adds 3 orbiting stars', rarity: 'epic', effect: (g) => { for (let i = 0; i < 3; i++) g.stars.push(g.createStar()); } },
            { id: 'devastation', name: 'Devastation', icon: '☠️', desc: 'Massive +20 damage boost', rarity: 'legendary', effect: (g) => g.weapons.bullet.damage += 20 },
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
        this.setupClassSelection();
        document.getElementById('restart-btn').addEventListener('click', () => this.showClassSelect());
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
            pauseMenu.innerHTML = `
                <div class="menu-content" style="text-align:center;">
                    <h1 style="font-size:3rem;margin-bottom:1rem;">⏸️ PAUSED</h1>
                    <p style="color:#888;margin-bottom:2rem;">Press ESC or P to resume</p>
                    <button id="resume-btn" class="menu-btn" style="background:linear-gradient(135deg,#00ffaa,#00aa66);border:none;padding:1rem 2rem;border-radius:12px;color:#000;font-weight:700;font-size:1.1rem;cursor:pointer;margin:0.5rem;">▶️ Resume</button>
                    <button id="quit-btn" class="menu-btn" style="background:linear-gradient(135deg,#ff4466,#cc2244);border:none;padding:1rem 2rem;border-radius:12px;color:#fff;font-weight:700;font-size:1.1rem;cursor:pointer;margin:0.5rem;">🚪 Quit</button>
                </div>
            `;
            document.body.appendChild(pauseMenu);
            document.getElementById('resume-btn').addEventListener('click', () => this.togglePause());
            document.getElementById('quit-btn').addEventListener('click', () => { this.togglePause(); this.gameOver(); });
        }
        pauseMenu.classList.remove('hidden');
    }

    hidePauseMenu() {
        const pauseMenu = document.getElementById('pause-menu');
        if (pauseMenu) pauseMenu.classList.add('hidden');
    }

    setupTouch() {
        this.canvas.addEventListener('touchstart', (e) => { if (!this.gameRunning || this.gamePaused) return; e.preventDefault(); const t = e.touches[0]; if (t.clientX < window.innerWidth / 2) { this.joystick.active = true; this.joystick.startX = t.clientX; this.joystick.startY = t.clientY; } }, { passive: false });
        this.canvas.addEventListener('touchmove', (e) => { if (!this.joystick.active) return; e.preventDefault(); const t = e.touches[0]; const dx = t.clientX - this.joystick.startX, dy = t.clientY - this.joystick.startY; const d = Math.sqrt(dx * dx + dy * dy); if (d > 0) { const c = Math.min(d, 60); this.joystick.dx = (dx / d) * (c / 60); this.joystick.dy = (dy / d) * (c / 60); } }, { passive: false });
        this.canvas.addEventListener('touchend', () => { this.joystick.active = false; this.joystick.dx = 0; this.joystick.dy = 0; });
    }

    setupClassSelection() {
        const menu = document.getElementById('start-menu');
        const content = menu.querySelector('.menu-content');
        content.innerHTML = `
            <h1 class="game-title">DOTS<span>SURVIVOR</span></h1>
            <p class="game-subtitle">Choose your class:</p>
            <div class="class-selection" style="display:flex;gap:1rem;flex-wrap:wrap;justify-content:center;margin:1.5rem 0;">
                ${Object.entries(CLASSES).map(([id, c]) => `
                    <div class="class-card" data-class="${id}" style="background:${c.color}22;border:2px solid ${c.color};border-radius:12px;padding:1rem;width:140px;cursor:pointer;transition:all 0.2s;text-align:center;">
                        <div style="font-size:2.5rem;">${c.icon}</div>
                        <div style="font-weight:700;color:${c.color};margin:0.5rem 0;">${c.name}</div>
                        <div style="font-size:0.75rem;color:#888;">${c.desc}</div>
                    </div>
                `).join('')}
            </div>
            <div class="controls-info"><p>🎮 WASD/Arrows to move & aim</p><p>🔫 Shoots in movement direction</p><p>⏸️ ESC/P to pause</p></div>
        `;
        content.querySelectorAll('.class-card').forEach(card => {
            card.addEventListener('click', () => this.selectClass(card.dataset.class));
            card.addEventListener('mouseenter', () => card.style.transform = 'scale(1.05)');
            card.addEventListener('mouseleave', () => card.style.transform = 'scale(1)');
        });
    }

    showClassSelect() {
        document.getElementById('gameover-menu').classList.add('hidden');
        this.setupClassSelection();
        document.getElementById('start-menu').classList.remove('hidden');
    }

    selectClass(classId) {
        this.selectedClass = CLASSES[classId];
        this.player.color = this.selectedClass.color;
        this.showDifficultySelect();
    }

    showDifficultySelect() {
        const menu = document.getElementById('start-menu');
        const content = menu.querySelector('.menu-content');
        content.innerHTML = `
            <h1 class="game-title">DOTS<span>SURVIVOR</span></h1>
            <p class="game-subtitle">Playing as <span style="color:${this.selectedClass.color}">${this.selectedClass.icon} ${this.selectedClass.name}</span></p>
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
            <button id="back-to-class" style="background:transparent;border:1px solid #666;color:#888;padding:0.5rem 1.5rem;border-radius:8px;cursor:pointer;margin-top:1rem;">← Back</button>
        `;
        content.querySelectorAll('.diff-card').forEach(card => {
            card.addEventListener('click', () => this.selectDifficulty(card.dataset.diff));
            card.addEventListener('mouseenter', () => card.style.transform = 'scale(1.05)');
            card.addEventListener('mouseleave', () => card.style.transform = 'scale(1)');
        });
        document.getElementById('back-to-class').addEventListener('click', () => this.setupClassSelection());
    }

    selectDifficulty(diffId) {
        this.selectedDifficulty = DIFFICULTIES[diffId];
        this.startGame();
    }

    resizeCanvas() { this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight; }

    startGame() {
        const diff = this.selectedDifficulty;

        this.worldX = 0; this.worldY = 0;
        this.player.x = this.canvas.width / 2; this.player.y = this.canvas.height / 2;

        // Apply difficulty to player
        const baseHealth = Math.floor(100 * diff.playerHealthMult);
        this.player.health = baseHealth; this.player.maxHealth = baseHealth; this.player.speed = 220;
        this.player.xp = 0; this.player.xpToLevel = 50; this.player.level = 1; this.player.kills = 0;
        this.player.hpRegen = 0;

        this.weapons.bullet = { damage: 8, speed: 450, fireRate: 450, lastFired: 0, count: 1, size: 6, pierce: 1, color: this.selectedClass.color };

        // Apply class bonuses
        if (this.selectedClass.bonuses.bulletCount) this.weapons.bullet.count += this.selectedClass.bonuses.bulletCount;
        if (this.selectedClass.bonuses.fireRate) this.weapons.bullet.fireRate = Math.floor(this.weapons.bullet.fireRate * this.selectedClass.bonuses.fireRate);
        if (this.selectedClass.bonuses.damage) this.weapons.bullet.damage = Math.floor(this.weapons.bullet.damage * this.selectedClass.bonuses.damage);

        this.enemies = []; this.projectiles = []; this.pickups = []; this.particles = []; this.damageNumbers = [];
        this.orbitals = []; this.minions = []; this.items = {}; this.stars = [];
        this.wave = 1; this.waveTimer = 0; this.gameTime = 0;

        // INTENSE spawn rate (much faster)
        this.baseSpawnRate = Math.floor(400 * diff.spawnRateMult);
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
        this.spawnControlPoint();

        // Health packs (rare spawns)
        this.lastHealthPackSpawn = 0;
        this.healthPackInterval = 45000; // Every 45 seconds chance

        // Camera zoom
        this.cameraScale = 0.65;

        // Regen timer
        this.regenTimer = 0;

        // Class-specific starting abilities
        if (this.selectedClass.bonuses.orbitalCount) for (let i = 0; i < this.selectedClass.bonuses.orbitalCount; i++) this.orbitals.push(this.createOrbital());
        if (this.selectedClass.bonuses.minionCount) for (let i = 0; i < this.selectedClass.bonuses.minionCount; i++) this.minions.push(this.createMinion('basic'));

        document.getElementById('start-menu').classList.add('hidden');
        document.getElementById('gameover-menu').classList.add('hidden');
        document.getElementById('levelup-menu').classList.add('hidden');
        document.getElementById('game-hud').classList.remove('hidden');

        this.gameRunning = true; this.gamePaused = false; this.lastTime = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    spawnControlPoint() {
        const angle = Math.random() * Math.PI * 2;
        const dist = 800 + Math.random() * 500;
        this.controlPoints.push({
            wx: this.worldX + Math.cos(angle) * dist,
            wy: this.worldY + Math.sin(angle) * dist,
            radius: 50,
            captureProgress: 0,
            captured: false
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

    createMinion(type = 'basic') {
        const angle = Math.random() * Math.PI * 2;
        const types = {
            basic: { radius: 12, speed: 180, damage: 12, health: 40, color: '#44ff88', icon: '👻', isRanged: false },
            gunner: { radius: 10, speed: 150, damage: 8, health: 30, color: '#66aaff', icon: '🔫', isRanged: true },
            tank: { radius: 18, speed: 100, damage: 20, health: 100, color: '#ffaa44', icon: '🛡️', isRanged: false },
            ravager: { radius: 14, speed: 220, damage: 25, health: 50, color: '#ff4466', icon: '⚔️', isRanged: false }
        };
        const t = types[type] || types.basic;
        return {
            x: this.player.x + Math.cos(angle) * 50,
            y: this.player.y + Math.sin(angle) * 50,
            type, ...t, maxHealth: t.health, target: null, attackCooldown: 0
        };
    }

    gameLoop(t) {
        if (!this.gameRunning) return;
        const dt = (t - this.lastTime) / 1000; this.lastTime = t;
        if (!this.gamePaused) {
            this.gameTime += dt * 1000;
            this.waveTimer += dt * 1000;
            if (this.waveTimer >= this.waveDuration) {
                this.wave++;
                this.waveTimer = 0;
                this.enemySpawnRate = Math.max(200, this.enemySpawnRate - 80);
            }
            this.checkHorde();
            this.update(dt);
        }
        this.render();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    checkHorde() {
        // Horde every 5 minutes (300000ms)
        const hordeInterval = 300000;
        const currentHordeCount = Math.floor(this.gameTime / hordeInterval);

        if (currentHordeCount > this.lastHordeCount) {
            this.lastHordeCount = currentHordeCount;
            this.spawnHorde();
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
        this.spawnEnemies();
        this.spawnHealthPacks();
        this.updateControlPoints(dt);
        this.updateEnemies(dt);
        this.updateOrbitals(dt);
        this.updateStars(dt);
        this.updateMinions(dt);
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
        const dist = 400 + Math.random() * 200;
        const wx = this.worldX + Math.cos(angle) * dist;
        const wy = this.worldY + Math.sin(angle) * dist;

        const types = ['basic', 'basic'];
        if (this.wave >= 2) types.push('runner', 'runner');
        if (this.wave >= 3) types.push('tank', 'splitter');
        if (this.wave >= 4) types.push('swarm', 'swarm', 'bomber');
        if (this.wave >= 5) types.push('splitter', 'bomber');

        // Boss every 3 waves
        if (this.wave >= 3 && this.wave % 3 === 0 && Math.random() < 0.15) {
            this.enemies.push(this.createBoss(wx, wy));
        } else {
            const type = types[Math.floor(Math.random() * types.length)];
            this.enemies.push(this.createEnemy(wx, wy, type));
        }
    }

    createEnemy(wx, wy, type, isSplit = false) {
        const diff = this.selectedDifficulty;
        const waveMult = 1 + (this.wave - 1) * diff.scalingPerWave;
        const data = {
            basic: { radius: 14, speed: 85, health: 100, damage: 12, xp: 6, color: '#ff4466', icon: '' },
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

    createBoss(wx, wy) {
        const diff = this.selectedDifficulty;
        const waveMult = 1 + this.wave * diff.scalingPerWave;
        const name = `${BOSS_PREFIXES[Math.floor(Math.random() * BOSS_PREFIXES.length)]} ${BOSS_NAMES[Math.floor(Math.random() * BOSS_NAMES.length)]} ${BOSS_SUFFIXES[Math.floor(Math.random() * BOSS_SUFFIXES.length)]}`;
        const faces = ['😈', '👹', '💀', '👿', '🤡', '👺', '☠️', '🔥'];
        return {
            wx, wy, type: 'boss', name,
            face: faces[Math.floor(Math.random() * faces.length)],
            radius: 60 + this.wave * 5,
            speed: Math.floor(35 * diff.enemySpeedMult),
            health: Math.floor(1000 * waveMult * diff.enemyHealthMult),
            maxHealth: Math.floor(1000 * waveMult * diff.enemyHealthMult),
            damage: Math.floor(40 * waveMult * diff.enemyDamageMult),
            xp: Math.floor(200 * waveMult),
            color: '#ff0044', hitFlash: 0, isBoss: true
        };
    }

    updateEnemies(dt) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
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

            // Dead
            if (e.health <= 0) {
                this.player.kills++;
                this.playSound('kill');

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
                if (e.isBoss) this.dropItem(e.wx, e.wy);
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
            // Check collision with enemies
            for (const e of this.enemies) {
                const sx = this.player.x + (e.wx - this.worldX);
                const sy = this.player.y + (e.wy - this.worldY);
                const d = Math.sqrt((ox - sx) ** 2 + (oy - sy) ** 2);
                if (d < o.size + e.radius) {
                    e.health -= o.damage; e.hitFlash = 1;
                    this.damageNumbers.push({ x: sx, y: sy - 10, value: o.damage, lifetime: 0.6, color: '#aa44ff' });
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
        this.minions.forEach(m => {
            // Find target
            let nearest = null, nd = Infinity;
            for (const e of this.enemies) {
                const sx = this.player.x + (e.wx - this.worldX);
                const sy = this.player.y + (e.wy - this.worldY);
                const d = Math.sqrt((m.x - sx) ** 2 + (m.y - sy) ** 2);
                if (d < nd) { nd = d; nearest = e; }
            }
            if (nearest && nd < 300) {
                const sx = this.player.x + (nearest.wx - this.worldX);
                const sy = this.player.y + (nearest.wy - this.worldY);
                const dx = sx - m.x, dy = sy - m.y, d = Math.sqrt(dx * dx + dy * dy);
                if (d > 0) { m.x += (dx / d) * m.speed * dt; m.y += (dy / d) * m.speed * dt; }
                // Attack
                if (d < m.radius + nearest.radius) {
                    nearest.health -= m.damage; nearest.hitFlash = 1;
                    this.damageNumbers.push({ x: sx, y: sy - 10, value: m.damage, lifetime: 0.5, color: '#44ff88' });
                }
            } else {
                // Follow player
                const dx = this.player.x - m.x, dy = this.player.y - m.y, d = Math.sqrt(dx * dx + dy * dy);
                if (d > 50) { m.x += (dx / d) * m.speed * 0.5 * dt; m.y += (dy / d) * m.speed * 0.5 * dt; }
            }
        });
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
                    e.health -= p.damage; e.hitFlash = 1;
                    p.hitEnemies.push(e);
                    this.damageNumbers.push({ x: sx, y: sy - 10, value: p.damage, lifetime: 0.6, color: '#fff' });
                    this.spawnParticles(p.x, p.y, '#fff', 3);
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
            this.player.xpToLevel = Math.floor(this.player.xpToLevel * 1.25);
            this.showLevelUpMenu();
        }
    }

    showLevelUpMenu() {
        this.gamePaused = true;
        const choices = this.getRandomUpgrades(3);
        const container = document.getElementById('upgrade-choices');
        container.innerHTML = '';
        choices.forEach(u => {
            const card = document.createElement('div');
            card.className = `upgrade-card ${u.rarity}`;
            card.innerHTML = `<div class="upgrade-rarity">${u.rarity}</div><div class="upgrade-icon">${u.icon}</div><div class="upgrade-name">${u.name}</div><div class="upgrade-desc">${u.desc}</div>`;
            card.addEventListener('click', () => { u.effect(this); document.getElementById('levelup-menu').classList.add('hidden'); this.gamePaused = false; });
            container.appendChild(card);
        });
        document.getElementById('levelup-menu').classList.remove('hidden');
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
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2, s = 50 + Math.random() * 100;
            this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, radius: 2 + Math.random() * 3, color, lifetime: 0.3 + Math.random() * 0.3 });
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

    gameOver() {
        this.gameRunning = false;
        const m = Math.floor(this.gameTime / 60000), s = Math.floor((this.gameTime % 60000) / 1000);
        document.getElementById('final-time').textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        document.getElementById('final-kills').textContent = this.player.kills;
        document.getElementById('final-level').textContent = this.player.level;
        document.getElementById('game-hud').classList.add('hidden');
        document.getElementById('gameover-menu').classList.remove('hidden');
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
        this.damageNumbers.forEach(d => { ctx.font = 'bold 16px Inter'; ctx.fillStyle = d.color; ctx.globalAlpha = d.lifetime; ctx.textAlign = 'center'; ctx.fillText(typeof d.value === 'number' ? Math.abs(d.value) : d.value, d.x, d.y); ctx.globalAlpha = 1; });
        // Health bar
        this.drawHealthBar();
        // Items display
        this.drawItems();
        // Joystick
        if (this.isMobile && this.joystick.active) this.drawJoystick();
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
        Object.entries(this.items).forEach(([key, lvl]) => {
            if (lvl > 0) {
                const item = ITEMS[key];
                ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(20, y, 100, 20);
                ctx.font = '12px Inter'; ctx.fillStyle = '#fbbf24'; ctx.textAlign = 'left';
                ctx.fillText(`${item.icon} Lv${lvl}`, 25, y + 14);
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
