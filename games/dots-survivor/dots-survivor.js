// Dots Survivor - Complete Game with Classes, Items, Bosses & Infinite Map

// Get base path for sprites (works on both desktop and mobile)
const SPRITE_BASE_PATH = (() => {
    // Get the directory of the current script/page
    const path = window.location.pathname;
    const dir = path.substring(0, path.lastIndexOf('/') + 1);
    return dir;
})();

// Helper function to get full sprite path
function getSpritePath(filename) {
    // If already absolute or has protocol, return as is
    if (filename.startsWith('/') || filename.startsWith('http')) return filename;
    return SPRITE_BASE_PATH + filename;
}

// Player, Minion, and Projectile Sprite System (Single Sprites per Animation)
const PLAYER_SPRITES = {
    standing: 'Standing-removebg-preview.png',
    walking: 'Walking-removebg-preview.png',
    dead: 'Dead-removebg-preview.png'
};

// Player level progression sprites (changes appearance as player levels up)
const PLAYER_LEVEL_SPRITES = {
    level1: 'Level1Mage.png',      // Level 1-4
    level5: 'Level2Mage.png',      // Level 5-9
    level10: 'Level3.png',         // Level 10-14
    level15: 'Level4Mage.png',     // Level 15-19
    level20: 'Level5Mage.png',     // Level 20-24
    level25: 'Level6Mage.png',     // Level 25-29
    level30: 'Standing-removebg-preview.png'  // Level 30+
};

const WOLF_SPRITES = {
    standing: 'WolfStanding-removebg-preview.png',
    running1: 'WolfRunning-removebg-preview.png',
    running2: 'WolfRunning2-removebg-preview.png',
    biting: 'WolfBitting-removebg-preview.png'
};

const FIREBALL_SPRITE = 'Fireball.png';
const RINGOFFIRE_SPRITE = 'RingOfFire.png';

// Elemental Skull Sprites (for orbiting skull augment)
const SKULL_SPRITES = {
    fire: '1ec244e0-23e0-4582-866c-10c9705ee8b1-removebg-preview.png',
    slow: '23758cbd-26db-454a-b5f7-cfb21a00d678-removebg-preview.png',
    dark: '5e6439b6-6125-4cc8-bcf4-acf56e524b72-removebg-preview.png',
    lightning: '0a93e9de-a767-4d80-9df3-e21ca59d8319-removebg-preview.png'
};

// Beam of Despair Sprites (stacking item icons)
const BEAM_DESPAIR_SPRITES = {
    base: '1d6bda2b-9e6a-4e43-aa19-9edcf1a91255.jpg',
    evolved: '916b5e75-0b5b-4e95-a550-c84fbfe0a268.jpg'
};

// Crit Blade Sprites (stacking item icons)
const CRIT_BLADE_SPRITES = {
    base: 'e6ae531e-f976-4598-9cb1-3645d62a2d0a.jpg',
    evolved: '151435d5-709b-4fb5-ab63-216453fa472d.jpg'
};

// Ring of XP Sprites (stacking item icons)
const RING_XP_SPRITES = {
    base: 'bdd432b1-e52d-43fa-b591-20759c11bd7b.jpg',
    evolved: 'aa38aa35-9eca-4b7c-9a43-7dbd2981b7d8.jpg'
};

// Soul Collector Sprites (POI icons)
const SOUL_COLLECTOR_SPRITES = {
    collecting: 'f8ac43e1-63f9-4aac-9a62-bd7435a93b2b.jpg',
    complete: 'f3e8ed8c-0406-4cbe-a85b-4d925bffb445.jpg'
};

// Boots of Swiftness Sprites (stacking item icons)
const BOOTS_SWIFTNESS_SPRITES = {
    base: 'b8ed813f-ac3d-4cfe-91c0-5e8b3c82cb84-removebg-preview.png',
    evolved: 'a2d729b4-7e35-4961-a88e-bac4cc28398d-removebg-preview.png'
};

// Demon Set Sprites
const DEMON_SET_SPRITES = {
    helm: '0770a100-e29d-4325-8741-9951ba4affcd.jpg',
    chest: 'deee24a8-9020-43ea-8fc9-cef4b810b858.jpg',
    boots: 'd8a16809-cbe3-4b78-a63c-e974e12aba1d.jpg'
};

// Heart of Vitality Sprites (stacking item icons)
const HEART_VITALITY_SPRITES = {
    base: '53ded777-5832-47cf-8640-4c0c5e933582.jpg',
    evolved: 'c81ba2ce-1664-4f4c-83c7-c7cf898e1116.jpg'
};

// Blood Soaker Sprites (stacking item icons)
const BLOOD_SOAKER_SPRITES = {
    base: 'd7f4391a-1877-4d7a-89c2-fa09b95fa006.jpg',
    evolved: '977daf8c-4a8b-43bb-ac0f-3abd5824a2ad.jpg'
};

// Beam of Despair color progression (changes every 1000 kills)
const BEAM_DESPAIR_COLORS = [
    '#ffffff',  // Level 1: White
    '#88ccff',  // Level 2: Light Blue
    '#00ffff',  // Level 3: Cyan
    '#aa44ff',  // Level 4: Purple
    '#ff44ff',  // Level 5: Magenta
    '#ff4444',  // Level 6: Red
    '#ff8800',  // Level 7: Orange
    '#ffff00',  // Level 8: Yellow
    '#ffd700',  // Level 9: Gold
    '#ff00ff'   // Level 10+/Evolved: Rainbow/Pink
];

// Animation state for wolf running (alternates between running1 and running2)
const ANIM_STATE = {
    player: { current: 'standing' },
    wolfRunFrame: 0,
    wolfRunTimer: 0
};

// Animation speed (seconds per frame)
const ANIM_SPEED = 0.15;

// Enemy Sprite System - Load custom images for enemies
const ENEMY_SPRITES = {
    // Define sprite paths for each enemy type (set to null for default circle rendering)
    swarm: 'swarm.png',
    basic: 'basicenemy.png',
    runner: 'RunnerEnemy.png',
    tank: 'TankEnemy.png',
    splitter: 'Splitter.png',
    bomber: 'BomberEnemy.png',
    mini: 'TinyEnemy.png',
    sticky: 'StickyEnemy.png',
    ice: 'IceEnemy.png',
    poison: 'Poison.png',
    boss: 'BossEnemy.png',
    general: 'DemonKing.png',
    consumer: null,    // The Consumer boss (has custom rendering)
    cthulhu: '01a0c668-edf9-4306-aa39-391bb1d77077-removebg-preview.png'  // Cthulhu, Lord of the Sea
};

// Sprite cache - stores loaded Image objects
const SPRITE_CACHE = {};

// Remove white/light background from image and return a canvas with transparency
function removeWhiteBackground(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Make white/near-white pixels transparent
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // If pixel is white or very light (threshold 240), make it transparent
        if (r > 240 && g > 240 && b > 240) {
            data[i + 3] = 0; // Set alpha to 0
        }
        // Fade out near-white pixels for smoother edges
        else if (r > 200 && g > 200 && b > 200) {
            const brightness = (r + g + b) / 3;
            data[i + 3] = Math.floor(255 * (1 - (brightness - 200) / 55));
        }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

// Load a sprite image
function loadSprite(type, path, skipProcessing = false) {
    if (!path) return null;
    if (SPRITE_CACHE[type]) return SPRITE_CACHE[type];

    const img = new Image();
    img.src = getSpritePath(path);
    img.onload = () => {
        // Skip processing for sprites that already have transparency
        if (skipProcessing || type.startsWith('player_') || type.startsWith('wolf_') || type === 'fireball') {
            SPRITE_CACHE[type] = img; // Use image directly
            console.log(`Loaded sprite for ${type} (no processing)`);
        } else {
            // Process image to remove white background for enemy sprites
            const processedCanvas = removeWhiteBackground(img);
            SPRITE_CACHE[type] = processedCanvas;
            console.log(`Loaded and processed sprite for ${type}`);
        }
    };
    img.onerror = () => {
        console.warn(`Failed to load sprite for ${type}: ${path}`);
    };
    return img;
}

// Initialize sprites on load
function initSprites() {
    // Load enemy sprites
    for (const [type, path] of Object.entries(ENEMY_SPRITES)) {
        if (path) loadSprite(type, path);
    }
    // Load player sprites (standing, walking, dead)
    for (const [anim, path] of Object.entries(PLAYER_SPRITES)) {
        loadSprite('player_' + anim, path, true);
    }
    // Load player level progression sprites
    for (const [level, path] of Object.entries(PLAYER_LEVEL_SPRITES)) {
        loadSprite('player_' + level, path, true);
    }
    // Load wolf sprites (standing, running1, running2, biting)
    for (const [anim, path] of Object.entries(WOLF_SPRITES)) {
        loadSprite('wolf_' + anim, path, true);
    }
    // Load fireball sprite
    if (FIREBALL_SPRITE) loadSprite('fireball', FIREBALL_SPRITE, true);
    // Load ring of fire sprite (for aura fire augment)
    if (RINGOFFIRE_SPRITE) loadSprite('ringoffire', RINGOFFIRE_SPRITE, true);
    // Load elemental skull sprites
    for (const [element, path] of Object.entries(SKULL_SPRITES)) {
        loadSprite('skull_' + element, path, true);
    }
    // Load Beam of Despair sprites
    for (const [type, path] of Object.entries(BEAM_DESPAIR_SPRITES)) {
        loadSprite('beam_despair_' + type, path, true);
    }
    // Load Crit Blade sprites
    for (const [type, path] of Object.entries(CRIT_BLADE_SPRITES)) {
        loadSprite('crit_blade_' + type, path, true);
    }
    // Load Ring of XP sprites
    for (const [type, path] of Object.entries(RING_XP_SPRITES)) {
        loadSprite('ring_xp_' + type, path, true);
    }
    // Load Soul Collector sprites
    for (const [type, path] of Object.entries(SOUL_COLLECTOR_SPRITES)) {
        loadSprite('soul_collector_' + type, path, true);
    }
    // Load Boots of Swiftness sprites
    for (const [type, path] of Object.entries(BOOTS_SWIFTNESS_SPRITES)) {
        loadSprite('boots_swiftness_' + type, path, true);
    }
    // Load Demon Set sprites
    for (const [type, path] of Object.entries(DEMON_SET_SPRITES)) {
        loadSprite('demon_' + type, path, true);
    }
    // Load Heart of Vitality sprites
    for (const [type, path] of Object.entries(HEART_VITALITY_SPRITES)) {
        loadSprite('heart_vitality_' + type, path, true);
    }
    // Load Blood Soaker sprites
    for (const [type, path] of Object.entries(BLOOD_SOAKER_SPRITES)) {
        loadSprite('blood_soaker_' + type, path, true);
    }
}

// Call init when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSprites);
} else {
    initSprites();
}

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
        { id: 'skull', name: 'Elemental Skull', icon: '💀', desc: '+1 orbiting skull (cycles Fire/Dark/Lightning/Slow)', rarity: 'rare', effect: (g) => g.skulls.push(g.createSkull()), getDesc: (g) => `Skulls: ${g.skulls.length} → ${g.skulls.length + 1}` },
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
    { id: 'wind_push', name: 'Gale Force', icon: '💨', desc: 'Every 7 seconds, unleash a wind slash that pushes all enemies back (bigger enemies resist more)', effect: (g) => { g.augments.push('wind_push'); g.windPushTimer = 0; g.windPushCooldown = 7; }, getDesc: (g) => g.augments.includes('wind_push') ? 'Active ✓' : 'Not Active' },
    { id: 'time_stop', name: 'Chrono Field', icon: '⏳', desc: 'Periodically freeze all enemies for 3 seconds', effect: (g) => g.augments.push('time_stop'), getDesc: (g) => g.augments.includes('time_stop') ? 'Active ✓' : 'Not Active' },
    { id: 'skull_frenzy', name: 'Skull Frenzy', icon: '💀', desc: 'Skulls spin 2x faster and deal +50% damage', effect: (g) => { g.augments.push('skull_frenzy'); g.skulls.forEach(s => { s.speed *= 2; s.damage *= 1.5; }); }, getDesc: (g) => g.augments.includes('skull_frenzy') ? 'Active ✓' : 'Not Active' },
    { id: 'skull_army', name: 'Skull Army', icon: '☠️', desc: '+3 elemental skulls instantly', effect: (g) => { for(let i = 0; i < 3; i++) g.skulls.push(g.createSkull()); }, getDesc: (g) => `Skulls: ${g.skulls.length} → ${g.skulls.length + 3}` },
    // Wolf Pack Path
    { id: 'dire_wolves', name: 'Dire Wolves', icon: '🐺', desc: 'Max wolves +3, wolves are 50% larger and tankier', effect: (g) => { g.maxWolves = (g.maxWolves || 0) + 3; g.wolfSizeBonus = (g.wolfSizeBonus || 1) * 1.5; for(let i = 0; i < 3; i++) g.addMinion('wolf'); }, getDesc: (g) => `Max Wolves: ${g.maxWolves || 0} → ${(g.maxWolves || 0) + 3}` },
    { id: 'feral_frenzy', name: 'Feral Frenzy', icon: '🔥', desc: 'Wolves attack 50% faster and deal +25% damage', effect: (g) => { g.augments.push('feral_frenzy'); g.wolfAttackSpeed = (g.wolfAttackSpeed || 1) * 1.5; g.wolfDamageBonus = (g.wolfDamageBonus || 1) * 1.25; }, getDesc: (g) => g.augments.includes('feral_frenzy') ? 'Active ✓' : 'Not Active' },
    { id: 'pack_tactics', name: 'Pack Tactics', icon: '🌙', desc: 'You gain +5% damage for every active wolf', effect: (g) => g.augments.push('pack_tactics'), getDesc: (g) => `Wolves: ${g.minions?.length || 0} (+${(g.minions?.length || 0) * 5}% dmg)` },
    { id: 'alpha_howl', name: 'Alpha Howl', icon: '🌕', desc: 'Every 10s wolves howl, gaining +50% speed and damage for 5s', effect: (g) => { g.augments.push('alpha_howl'); g.howlTimer = 0; g.howlCooldown = 10; g.howlDuration = 5; }, getDesc: (g) => g.augments.includes('alpha_howl') ? 'Active ✓' : 'Not Active' },
    // New Hybrid Paths
    { id: 'tech_wizard', name: 'Soul Harvest', icon: '🔮', desc: 'Projectiles spawn Skulls on kill (10% chance, max 12)', effect: (g) => g.augments.push('tech_wizard'), getDesc: (g) => g.augments.includes('tech_wizard') ? 'Active ✓' : 'Not Active' },
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
    // stackType: 'kill' = stacks on kills, 'damage' = stacks on damage dealt
    critBlade: {
        name: 'Crit Blade',
        icon: '🗡️',
        desc: '+0.0125% crit chance per stack. Stacks on damage dealt.',
        evolvedName: 'Death Blade',
        evolvedIcon: '⚔️',
        evolvedDesc: '+25% crit, crits deal 3x damage',
        maxStacks: 50000,
        stackType: 'damage',
        hasSprite: true,
        spriteBase: 'crit_blade_base',
        spriteEvolved: 'crit_blade_evolved',
        effect: (g, stacks) => { g.stackingCritBonus = stacks * 0.000005; },
        evolvedEffect: (g) => { g.stackingCritBonus = 0.25; g.weapons.bullet.critMultiplier = 3; }
    },
    beamDespair: {
        name: 'Beam of Despair',
        icon: '💫',
        desc: 'Chains +1 enemy per 1k kills. Color changes with level.',
        evolvedName: 'Ray of Annihilation',
        evolvedIcon: '🌟',
        evolvedDesc: 'Rainbow beam, 10 chains, devastating damage',
        maxStacks: 10000,  // 10 levels, evolves at 10k kills
        stackType: 'kill',
        hasSprite: true,
        spriteBase: 'beam_despair_base',
        spriteEvolved: 'beam_despair_evolved',
        effect: (g, stacks) => {
            // Level up every 1000 kills
            const level = Math.floor(stacks / 1000) + 1;
            const chains = level;
            const damage = 15 + (level - 1) * 5;  // 15 base, +5 per level
            const colorIndex = Math.min(level - 1, BEAM_DESPAIR_COLORS.length - 1);
            const color = BEAM_DESPAIR_COLORS[colorIndex];

            if (!g.beamDespair) {
                g.beamDespair = { damage: damage, chains: chains, range: 300, level: level, color: color };
            } else {
                g.beamDespair.damage = damage;
                g.beamDespair.chains = chains;
                g.beamDespair.level = level;
                g.beamDespair.color = color;
            }
        },
        evolvedEffect: (g) => {
            // Max power beam - rainbow effect
            g.beamDespair = { damage: 60, chains: 10, range: 400, level: 10, color: '#ff00ff', evolved: true };
        }
    },
    ringXp: {
        name: 'Ring of XP',
        icon: '💍',
        desc: '+0.05% XP gain per stack. Stacks on kills.',
        evolvedName: 'Crown of Wisdom',
        evolvedIcon: '👑',
        evolvedDesc: '+150% XP gain, enemies drop double XP orbs',
        maxStacks: 3000,  // Evolves at 3k kills
        stackType: 'kill',
        hasSprite: true,
        spriteBase: 'ring_xp_base',
        spriteEvolved: 'ring_xp_evolved',
        effect: (g, stacks) => {
            // +0.05% XP per stack = 0.0005 multiplier per stack
            // At 3000 stacks = +150% XP
            g.stackingXpBonus = stacks * 0.0005;
        },
        evolvedEffect: (g) => {
            g.stackingXpBonus = 1.5;  // +150% XP
            g.doubleXpOrbs = true;    // Enemies drop double XP orbs
        }
    },
    bootsSwiftness: {
        name: 'Boots of Swiftness',
        icon: '👟',
        desc: '+0.01% move speed per stack. Stacks by distance traveled.',
        evolvedName: 'Wings of Mercury',
        evolvedIcon: '🪽',
        evolvedDesc: '+50% move speed, dash ability on double-tap',
        maxStacks: 50000,  // 50000 units traveled = ~50km in game units
        stackType: 'distance',
        hasSprite: true,
        spriteBase: 'boots_swiftness_base',
        spriteEvolved: 'boots_swiftness_evolved',
        effect: (g, stacks) => {
            // +0.01% speed per stack = +0.0001 multiplier per stack
            // At 50000 stacks = +50% speed
            g.stackingSpeedBonus = stacks * 0.00001;
        },
        evolvedEffect: (g) => {
            g.stackingSpeedBonus = 0.5;  // +50% move speed
            g.hasDash = true;  // Unlock dash ability
        }
    },
    heartVitality: {
        name: 'Heart of Vitality',
        icon: '❤️',
        desc: '+0.02 HP5 per stack (out of combat). Stacks on kills.',
        evolvedName: 'Immortal Heart',
        evolvedIcon: '💖',
        evolvedDesc: '+100 HP5 out of combat, +50 HP5 in combat',
        maxStacks: 5000,  // 5k kills to evolve
        stackType: 'kill',
        hasSprite: true,
        spriteBase: 'heart_vitality_base',
        spriteEvolved: 'heart_vitality_evolved',
        effect: (g, stacks) => {
            // +0.02 HP5 per stack = 0.02 HP per 5 seconds per stack
            // At 5000 stacks = 100 HP5
            g.stackingHp5Bonus = stacks * 0.02;
        },
        evolvedEffect: (g) => {
            g.stackingHp5Bonus = 100;  // +100 HP5 out of combat
            g.inCombatHp5 = 50;  // +50 HP5 even in combat
        }
    },
    bloodSoaker: {
        name: 'Blood Soaker',
        icon: '🩸',
        desc: '0.5% + 0.00048% lifesteal per stack. Stacks on damage dealt.',
        evolvedName: 'Vampiric Essence',
        evolvedIcon: '🧛',
        evolvedDesc: '15% lifesteal, heal burst on kill',
        maxStacks: 30000,  // 30k damage to evolve
        stackType: 'damage',
        hasSprite: true,
        spriteBase: 'blood_soaker_base',
        spriteEvolved: 'blood_soaker_evolved',
        effect: (g, stacks) => {
            // Base 0.5% + scaling to reach 15% at 30k
            // (15% - 0.5%) / 30000 = 0.000483% per stack
            g.stackingLifesteal = 0.005 + (stacks * 0.00000483);
        },
        evolvedEffect: (g) => {
            g.stackingLifesteal = 0.15;  // 15% lifesteal
            g.healBurstOnKill = true;  // Heal burst on kill
        }
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
        bonus: '+3 Skulls, skulls deal 2x damage',
        effect: (g) => {
            for (let i = 0; i < 3; i++) g.skulls.push(g.createSkull());
            g.skulls.forEach(s => s.damage *= 2);
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
        bonus: 'Killed enemies explode, +3 spirit wolves',
        effect: (g) => {
            g.necroExplosion = true;
            g.maxWolves = (g.maxWolves || 0) + 3;
            for (let i = 0; i < 3; i++) g.addMinion('wolf');
        }
    }
};

// Game balance settings (balanced around medium difficulty)
const GAME_SETTINGS = {
    enemyHealthMult: 0.5,        // Much lower base health for easy waves 1-9
    enemyDamageMult: 1.0,
    enemySpeedMult: 1.3,         // FASTER enemies for more exciting gameplay
    spawnRateMult: 0.7,          // FASTER spawns (lower = more frequent)
    scalingPerWave: 0.10,        // Slightly higher scaling for progression feel
    scalingPerWaveLate: 0.55,    // Heavy scaling after wave 10 (difficulty ramps up)
    lateGameWave: 10,            // When late game scaling kicks in
    playerHealthMult: 1.0,
    xpMult: 1.2,                 // More XP for faster leveling
    playerSpeedMult: 1.15        // Faster player movement
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
    { id: 'helm', name: 'Demon Helm', icon: '👹', desc: '+500 Max HP', spriteKey: 'demon_helm' },
    { id: 'chest', name: 'Demon Chestplate', icon: '🛡️', desc: '+20% Damage Reduction', spriteKey: 'demon_chest' },
    { id: 'boots', name: 'Demon Gauntlets', icon: '👢', desc: '+50 Move Speed', spriteKey: 'demon_boots' }
];

// Ocean Set - Drops from Cthulhu
const OCEAN_SET_PIECES = [
    { id: 'crown', name: 'Crown of the Deep', icon: '👑', desc: '+1000 Max HP' },
    { id: 'trident', name: 'Trident of Storms', icon: '🔱', desc: '+50% Damage' },
    { id: 'scales', name: 'Scales of Leviathan', icon: '🐚', desc: '+100 Move Speed' }
];

class DotsSurvivor {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.gameRunning = false;
        this.gamePaused = false;
        this.upgradeMenuShowing = false; // Prevent multiple upgrade menus from showing
        this.gameTime = 0;
        this.lastTime = 0;
        this.wave = 1;
        this.waveTimer = 0;
        this.waveDuration = 20000; // Shorter waves for faster pacing

        // World offset - bounded map (no more infinite kiting!)
        this.worldX = 0;
        this.worldY = 0;
        this.mapSize = 4000; // Large map: 4000x4000 units (-2000 to +2000 in each direction)
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
        this.skulls = []; // Elemental skulls (replaced orbitals and stars)
        this.skullElements = ['fire', 'dark', 'lightning', 'slow'];
        this.skullElementIndex = 0;
        this.skullCycleTimer = 0;
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
            { id: 'skull_upgrade', name: 'Soul Collector', icon: '💀', desc: 'Adds a skull (max 12), then +15 damage', rarity: 'rare', effect: (g) => { if (g.skulls.length < 12) g.skulls.push(g.createSkull()); else g.skulls.forEach(s => s.damage += 15); }, getDesc: (g) => g.skulls.length < 12 ? `Skulls: ${g.skulls.length} → ${g.skulls.length + 1}` : `Skull Damage: ${g.skulls[0]?.damage || 20} → ${(g.skulls[0]?.damage || 20) + 15}` },
            { id: 'critdmg', name: 'Lethal Strike', icon: '🩸', desc: '+50% Crit Damage', rarity: 'epic', effect: (g) => g.weapons.bullet.critMultiplier = (g.weapons.bullet.critMultiplier || 2.0) + 0.5, getDesc: (g) => `Crit Damage: ${Math.floor((g.weapons.bullet.critMultiplier || 2.0) * 100)}% → ${Math.floor(((g.weapons.bullet.critMultiplier || 2.0) + 0.5) * 100)}%` },
            { id: 'armor', name: 'Armor', icon: '🛡️', desc: 'Gain +50 HP and +25 speed', rarity: 'epic', effect: (g) => { g.player.maxHealth += 50; g.player.health += 50; g.player.speed += 25; }, getDesc: (g) => `HP: ${g.player.maxHealth}→${g.player.maxHealth + 50}, Speed: ${g.player.speed}→${g.player.speed + 25}` },
            { id: 'skull_shower', name: 'Skull Storm', icon: '☠️', desc: 'Adds 3 skulls (max 12), overflow = +15 damage each', rarity: 'epic', effect: (g) => { for (let i = 0; i < 3; i++) { if (g.skulls.length < 12) g.skulls.push(g.createSkull()); else g.skulls.forEach(s => s.damage += 15); } }, getDesc: (g) => { const toAdd = Math.min(3, 12 - g.skulls.length); const overflow = 3 - toAdd; return toAdd > 0 ? `Skulls: ${g.skulls.length} → ${g.skulls.length + toAdd}${overflow > 0 ? `, +${overflow * 15} dmg` : ''}` : `Skull Damage: +45`; } },
            { id: 'devastation', name: 'Devastation', icon: '☠️', desc: 'Massive +20 damage boost', rarity: 'legendary', effect: (g) => g.weapons.bullet.damage += 20, getDesc: (g) => `Damage: ${g.weapons.bullet.damage} → ${g.weapons.bullet.damage + 20}` },
            { id: 'summon_wolf', name: 'Call of the Pack', icon: '🐺', desc: '+1 wolf companion (max 8)', rarity: 'rare', effect: (g) => { if ((g.maxWolves || 0) < 8) { g.maxWolves = (g.maxWolves || 0) + 1; g.addMinion('wolf'); } }, getDesc: (g) => `Wolves: ${g.minions.length}/${g.maxWolves || 0}` },
        ];

        this.initSettings();
        this.initSound();
        this.init();
    }

    initSettings() {
        // Load settings from localStorage
        const savedSettings = localStorage.getItem('dotsSurvivorSettings');
        if (savedSettings) {
            this.settings = JSON.parse(savedSettings);
        } else {
            this.settings = {
                soundEnabled: true,
                volume: 50,
                screenShake: true,
                slowMotion: true
            };
        }
    }

    saveSettings() {
        localStorage.setItem('dotsSurvivorSettings', JSON.stringify(this.settings));
    }

    initSound() {
        this.sounds = {};
        this.audioCtx = null;
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) { console.log('Audio not supported'); }

        // Background music
        this.menuMusic = new Audio('menu-music.mp3');
        this.menuMusic.loop = true;
        this.menuMusic.volume = 0.3; // 30% volume for background music
        this.musicPlaying = false;
    }

    playMenuMusic() {
        if (!this.settings.soundEnabled || this.musicPlaying) return;

        const volumeMult = this.settings.volume / 100;
        this.menuMusic.volume = 0.3 * volumeMult;

        // Resume audio context if suspended (browser autoplay policy)
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        this.menuMusic.play().then(() => {
            this.musicPlaying = true;
            console.log('🎵 Menu music started');
        }).catch(e => {
            console.log('Music autoplay blocked, will play on user interaction');
        });
    }

    stopMenuMusic() {
        if (this.menuMusic && this.musicPlaying) {
            this.menuMusic.pause();
            this.menuMusic.currentTime = 0;
            this.musicPlaying = false;
            console.log('🎵 Menu music stopped');
        }
    }

    updateMusicVolume() {
        if (this.menuMusic) {
            const volumeMult = this.settings.volume / 100;
            this.menuMusic.volume = 0.3 * volumeMult;
        }
    }

    playSound(type) {
        if (!this.audioCtx || !this.settings.soundEnabled) return;

        const volumeMult = this.settings.volume / 100;
        if (volumeMult <= 0) return;

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        if (type === 'shoot') {
            // Star Wars style laser pew pew
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1800, this.audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(300, this.audioCtx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.08 * volumeMult, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.08);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.08);
            return;
        }

        const baseVolume = type === 'horde' ? 0.2 : 0.1;
        gain.gain.value = baseVolume * volumeMult;
        if (type === 'hit') { osc.frequency.value = 200; osc.type = 'sawtooth'; }
        else if (type === 'kill') { osc.frequency.value = 600; osc.type = 'sine'; }
        else if (type === 'xp') { osc.frequency.value = 900; osc.type = 'square'; }
        else if (type === 'levelup') { osc.frequency.value = 800; osc.type = 'sine'; }
        else if (type === 'horde') { osc.frequency.value = 150; osc.type = 'sawtooth'; }
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

        // Set default class
        this.selectedClass = SURVIVOR_CLASS;
        this.player.color = this.selectedClass.color;

        // Don't show boost select immediately - let auth manager control the flow
        // The auth manager will show the start menu after login/guest selection
        // The start button in start menu will trigger showBoostSelect

        // Setup start button to show boost select
        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                this.showBoostSelect();
            });
        }

        document.getElementById('restart-btn').addEventListener('click', () => {
            document.getElementById('gameover-menu').classList.add('hidden');
            this.showBoostSelect();
        });
        document.getElementById('hud-pause-btn').addEventListener('click', (e) => { e.stopPropagation(); this.togglePause(); });

        // Settings menu
        this.initSettingsMenu();
    }

    initSettingsMenu() {
        const settingsBtn = document.getElementById('settings-btn');
        const settingsMenu = document.getElementById('settings-menu');
        const settingsBackBtn = document.getElementById('settings-back-btn');
        const soundToggle = document.getElementById('sound-toggle');
        const volumeSlider = document.getElementById('volume-slider');
        const volumeValue = document.getElementById('volume-value');
        const shakeToggle = document.getElementById('shake-toggle');
        const slowmoToggle = document.getElementById('slowmo-toggle');

        if (!settingsBtn || !settingsMenu) return;

        // Load current settings into UI
        soundToggle.checked = this.settings.soundEnabled;
        volumeSlider.value = this.settings.volume;
        volumeValue.textContent = this.settings.volume + '%';
        shakeToggle.checked = this.settings.screenShake;
        slowmoToggle.checked = this.settings.slowMotion;

        // Open settings
        settingsBtn.addEventListener('click', () => {
            document.getElementById('start-menu').classList.add('hidden');
            settingsMenu.classList.remove('hidden');
        });

        // Close settings
        settingsBackBtn.addEventListener('click', () => {
            this.saveSettings();
            settingsMenu.classList.add('hidden');
            document.getElementById('start-menu').classList.remove('hidden');
        });

        // Sound toggle
        soundToggle.addEventListener('change', (e) => {
            this.settings.soundEnabled = e.target.checked;
            if (e.target.checked) {
                this.playSound('xp'); // Play test sound
                this.playMenuMusic(); // Resume music if on menu
            } else {
                // Pause music when sound is disabled
                if (this.menuMusic) {
                    this.menuMusic.pause();
                    this.musicPlaying = false;
                }
            }
        });

        // Volume slider
        volumeSlider.addEventListener('input', (e) => {
            this.settings.volume = parseInt(e.target.value);
            volumeValue.textContent = this.settings.volume + '%';
            this.updateMusicVolume(); // Update music volume in real-time
        });

        volumeSlider.addEventListener('change', () => {
            this.playSound('xp'); // Play test sound when done adjusting
        });

        // Screen shake toggle
        shakeToggle.addEventListener('change', (e) => {
            this.settings.screenShake = e.target.checked;
        });

        // Slow motion toggle
        slowmoToggle.addEventListener('change', (e) => {
            this.settings.slowMotion = e.target.checked;
        });

        // Help/Info button
        const helpBtn = document.getElementById('help-btn');
        const helpMenu = document.getElementById('help-menu');
        const helpBackBtn = document.getElementById('help-back-btn');

        if (helpBtn && helpMenu) {
            helpBtn.addEventListener('click', () => {
                document.getElementById('start-menu').classList.add('hidden');
                helpMenu.classList.remove('hidden');
                this.populateEnemyInfo();
            });

            helpBackBtn.addEventListener('click', () => {
                helpMenu.classList.add('hidden');
                document.getElementById('start-menu').classList.remove('hidden');
            });
        }
    }

    populateEnemyInfo() {
        const grid = document.getElementById('enemy-grid');
        if (!grid) return;

        const enemies = [
            { type: 'swarm', name: 'Swarm', desc: 'Fast & weak, attacks in numbers', color: '#ff6666' },
            { type: 'basic', name: 'Basic', desc: 'Standard enemy', color: '#ff4444' },
            { type: 'runner', name: 'Runner', desc: 'Very fast, low HP', color: '#ff8800' },
            { type: 'tank', name: 'Tank', desc: 'Slow, high HP', color: '#884400' },
            { type: 'splitter', name: 'Splitter', desc: 'Splits into minis on death', color: '#aa44ff' },
            { type: 'bomber', name: 'Bomber', desc: 'Explodes near you', color: '#ff0000' },
            { type: 'mini', name: 'Mini', desc: 'Tiny but quick', color: '#ffaaff' },
            { type: 'sticky', name: 'Sticky', desc: 'Slows you on hit', color: '#88ff00' },
            { type: 'ice', name: 'Ice', desc: 'Creates slowing zone', color: '#00ddff' },
            { type: 'poison', name: 'Poison', desc: 'Deals damage over time', color: '#44ff44' },
            { type: 'boss', name: 'Boss', desc: 'Powerful, spawns hordes', color: '#ff0044' },
            { type: 'general', name: 'General', desc: 'Demon King - very strong', color: '#ff0000' }
        ];

        grid.innerHTML = enemies.map(e => {
            const sprite = SPRITE_CACHE[e.type];
            let imgHtml = '';
            if (sprite) {
                imgHtml = `<canvas class="enemy-preview" data-type="${e.type}" width="40" height="40" style="image-rendering:pixelated;"></canvas>`;
            } else {
                imgHtml = `<div style="width:40px;height:40px;border-radius:50%;background:${e.color};"></div>`;
            }
            return `
                <div style="background:#1a1a2e;border-radius:8px;padding:0.5rem;text-align:center;">
                    <div style="display:flex;justify-content:center;margin-bottom:0.25rem;">${imgHtml}</div>
                    <div style="color:#fff;font-weight:600;font-size:0.85rem;">${e.name}</div>
                    <div style="color:#888;font-size:0.7rem;">${e.desc}</div>
                </div>
            `;
        }).join('');

        // Draw sprites onto canvases
        setTimeout(() => {
            enemies.forEach(e => {
                const canvas = grid.querySelector(`canvas[data-type="${e.type}"]`);
                if (canvas && SPRITE_CACHE[e.type]) {
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(SPRITE_CACHE[e.type], 0, 0, 40, 40);
                }
            });
        }, 50);
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

            // Skulls
            skullsCount: this.skulls.length,

            // Perks and augments
            perks: this.perks,
            augments: this.augments,

            // Class
            selectedClassName: this.selectedClass?.name,

            // Wolf pack data
            maxWolves: this.maxWolves,
            wolfSizeBonus: this.wolfSizeBonus,
            wolfDamageBonus: this.wolfDamageBonus,
            wolfAttackSpeed: this.wolfAttackSpeed,

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

        // Skulls
        this.skulls = [];
        for (let i = 0; i < (state.skullsCount || 0); i++) {
            this.skulls.push(this.createSkull());
        }

        // Perks and augments
        this.perks = state.perks || [];
        this.augments = state.augments || [];
        this.perks.forEach(p => this.applyPerk(p));

        // Wolf pack
        this.maxWolves = state.maxWolves || 0;
        this.wolfSizeBonus = state.wolfSizeBonus || 1;
        this.wolfDamageBonus = state.wolfDamageBonus || 1;
        this.wolfAttackSpeed = state.wolfAttackSpeed || 1;

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

        // Play menu music when returning to menu
        this.playMenuMusic();

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

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        // Mobile devices get a zoomed out view for better visibility
        if (this.isMobile || window.innerWidth < 768) {
            this.cameraScale = 0.50; // More zoomed out on mobile
        } else {
            this.cameraScale = 0.65; // Default desktop zoom
        }
    }

    startGame(mode = 'fresh') {
        // Stop menu music when game starts
        this.stopMenuMusic();

        // Hide all menus first
        document.getElementById('start-menu').classList.add('hidden');
        document.getElementById('gameover-menu').classList.add('hidden');
        document.getElementById('levelup-menu').classList.add('hidden');
        document.getElementById('game-hud').classList.remove('hidden');

        // Reset upgrade menu state
        this.upgradeMenuShowing = false;

        this.worldX = 0; this.worldY = 0;
        this.player.x = this.canvas.width / 2; this.player.y = this.canvas.height / 2;

        // Apply game settings to player
        const baseHealth = Math.floor(100 * GAME_SETTINGS.playerHealthMult);
        const baseSpeed = Math.floor(220 * (GAME_SETTINGS.playerSpeedMult || 1));
        this.player.health = baseHealth; this.player.maxHealth = baseHealth; this.player.speed = baseSpeed;
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

        this.weapons.bullet = { damage: 13, speed: 450, fireRate: 450, lastFired: 0, count: 1, size: 6, pierce: 1, color: this.selectedClass.color, critChance: 0.05, critMultiplier: 2.0 };

        // Apply class bonuses
        if (this.selectedClass.bonuses.bulletCount) this.weapons.bullet.count += this.selectedClass.bonuses.bulletCount;
        if (this.selectedClass.bonuses.fireRate) this.weapons.bullet.fireRate = Math.floor(this.weapons.bullet.fireRate * this.selectedClass.bonuses.fireRate);
        if (this.selectedClass.bonuses.damage) this.weapons.bullet.damage = Math.floor(this.weapons.bullet.damage * this.selectedClass.bonuses.damage);

        this.enemies = []; this.projectiles = []; this.pickups = []; this.particles = []; this.damageNumbers = [];
        this.skulls = []; this.minions = []; this.items = {};
        this.skullElementIndex = 0; this.skullCycleTimer = 0;
        
        // Stacking Items System
        this.stackingItems = {}; // { itemKey: { stacks: 0, evolved: false } }
        this.droppedItems = []; // Track which items have already dropped (drop once only)
        this.lastItemPickupTime = -180000; // Allow first item to drop immediately (3 min = 180000ms)
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
        this.spawnPauseTimer = 0; // Pauses spawns after Consumer dies

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

        // Soul Collectors (POI) and perks
        this.soulCollectors = [];
        this.perks = [];
        this.availablePerks = [...LEGENDARY_PERKS];

        // Boss tracking
        this.bossesSpawnedThisWave = 0;
        this.generalSpawnedThisWave = false;
        this.lastBossWave = 0;
        this.bossStatMultiplier = 1.0;
        this.consumerSpawned = false;
        this.bossGracePeriod = 0; // Seconds of reduced spawns after boss appears
        this.spawnSoulCollector();
        this.lastSoulCollectorWave = 1;

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

        // Diamond Augments & Wolf Pack Stats
        this.augments = [];
        this.titanKillerBonus = 0; // Titan Killer augment bonus damage to bosses/tanks
        this.maxWolves = 0;
        this.wolfSizeBonus = 1;
        this.wolfDamageBonus = 1;
        this.wolfAttackSpeed = 1;

        // Demon Set
        this.demonSet = { helm: false, chest: false, boots: false };
        this.demonSetBonusActive = false;
        this.imps = [];
        this.impSpawnTimer = 0;
        this.impStats = { damage: 300, maxImps: 5, spawnInterval: 10, burnDuration: 5 };

        // Ocean Set (Cthulhu)
        this.oceanSet = { crown: false, trident: false, scales: false };
        this.oceanSetBonusActive = false;
        this.waterTornadoes = [];
        this.tornadoSpawnTimer = 0;
        this.tornadoStats = { damage: 200, maxTornadoes: 3, spawnInterval: 8, duration: 6, pullRadius: 120 };

        // Cthulhu Boss
        this.cthulhuSpawned = false;
        this.cthulhuWarning = false;
        this.cthulhuWarningTimer = 0;
        this.cthulhuSpawnWave = 25; // Cthulhu appears at wave 25
        this.oceanBackground = { transitioning: false, targetColor: '#000000', currentColor: '#000000', transitionSpeed: 0.02 };
        this.swimmingCreatures = [];
        this.waterRipples = [];

        if (this.selectedClass.bonuses.wolfCount) {
            this.maxWolves = this.selectedClass.bonuses.wolfCount;
        }

        // Initialize available perks for control points
        this.availablePerks = [...LEGENDARY_PERKS];
        // Add Diamond Augments to the pool? Or are they separate?
        // User request implied "Diamond Augments" are what's being shown.
        // Let's add them to the pool or use them exclusively for a specific event
        // Current code likely wasn't using them if grep failed, but let's ensure they are used
        this.diamondAugments = [...DIAMOND_AUGMENTS];

        // Class-specific starting abilities
        if (this.selectedClass.bonuses.skullCount) for (let i = 0; i < this.selectedClass.bonuses.skullCount; i++) this.skulls.push(this.createSkull());

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

        if (this.selectedClass.bonuses.wolfCount) {
            // Initial wolves
            for (let i = 0; i < this.maxWolves; i++) this.addMinion('wolf');
        }

        // Start Game Loop
        this.gameRunning = true;
        this.gamePaused = false;
        this.lastTime = performance.now();
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

    spawnSoulCollector() {
        const angle = Math.random() * Math.PI * 2;
        const dist = 300 + Math.random() * 400; // Reduced distance to stay in map

        // Calculate position and clamp to map boundaries with padding
        const padding = 100; // Keep away from edges
        let wx = this.worldX + Math.cos(angle) * dist;
        let wy = this.worldY + Math.sin(angle) * dist;

        // Clamp to map bounds
        wx = Math.max(this.mapBounds.minX + padding, Math.min(this.mapBounds.maxX - padding, wx));
        wy = Math.max(this.mapBounds.minY + padding, Math.min(this.mapBounds.maxY - padding, wy));

        // Soul collector requires 25-50 souls based on wave
        const soulsRequired = Math.min(25 + Math.floor(this.wave * 2), 100);

        this.soulCollectors.push({
            wx, wy,
            radius: 120,  // Collection radius - kills within this range count
            soulsCollected: 0,
            soulsRequired: soulsRequired,
            complete: false,
            completeTimer: 0,  // Timer for showing complete icon
            spawnWave: this.wave
        });
    }

    spawnConsumer() {
        // Consumer boss - black hole that consumes other enemies to grow stronger
        const angle = Math.random() * Math.PI * 2;
        const dist = 400 + Math.random() * 100;
        const wx = this.worldX + Math.cos(angle) * dist;
        const wy = this.worldY + Math.sin(angle) * dist;

        // Unique enemy ID
        if (!this.enemyIdCounter) this.enemyIdCounter = 0;
        this.enemyIdCounter++;

        const consumer = {
            wx, wy,
            id: this.enemyIdCounter, // Unique ID for damage stacking
            type: 'consumer',
            name: 'THE CONSUMER',
            isConsumer: true,
            isBoss: true,
            radius: 80,
            baseRadius: 80,
            speed: 20, // Much slower - menacing crawl
            health: 15000, // Tanky but killable
            maxHealth: 15000,
            baseHealth: 15000,
            damage: 50, // High contact damage
            xp: 2000,
            color: '#8800ff',
            hitFlash: 0,
            consumedCount: 0,
            rotationAngle: 0,
            consumeRadius: 180, // Larger consume range
            pullRadius: 250, // Visual pull effect radius
            critResistance: 0.8, // 80% crit resistance
            lifeTimer: 0,
            maxLifeTime: 90, // 1:30 survival time
            vacuumParticles: [], // For vacuum effect
            attackCooldown: 0 // For attack speed system
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

        // Initialize vacuum particles array if needed
        if (!consumer.vacuumParticles) consumer.vacuumParticles = [];

        // Spawn vacuum particles around the pull radius
        if (Math.random() < 0.4) { // 40% chance per frame to spawn particle
            const angle = Math.random() * Math.PI * 2;
            const dist = consumer.pullRadius + Math.random() * 50;
            consumer.vacuumParticles.push({
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist,
                angle: angle,
                speed: 80 + Math.random() * 60,
                size: 2 + Math.random() * 4,
                alpha: 0.8,
                color: Math.random() > 0.3 ? '#8800ff' : '#ff00ff'
            });
        }

        // Update vacuum particles - spiral inward
        for (let i = consumer.vacuumParticles.length - 1; i >= 0; i--) {
            const p = consumer.vacuumParticles[i];
            const pDist = Math.sqrt(p.x * p.x + p.y * p.y);

            // Move toward center with spiral motion
            p.angle += dt * (3 + urgency); // Spiral faster as urgency increases
            const pullSpeed = p.speed * (1 + urgency * 0.3);
            p.x -= (p.x / pDist) * pullSpeed * dt;
            p.y -= (p.y / pDist) * pullSpeed * dt;

            // Add spiral offset
            p.x += Math.cos(p.angle + Math.PI/2) * 20 * dt;
            p.y += Math.sin(p.angle + Math.PI/2) * 20 * dt;

            // Fade in as it gets closer
            const newDist = Math.sqrt(p.x * p.x + p.y * p.y);
            p.alpha = Math.min(1, 0.3 + (1 - newDist / consumer.pullRadius) * 0.7);
            p.size = Math.max(1, p.size * (newDist / consumer.pullRadius));

            // Remove when reached center
            if (newDist < consumer.radius * 0.3) {
                consumer.vacuumParticles.splice(i, 1);
            }
        }

        // Limit particle count
        if (consumer.vacuumParticles.length > 60) {
            consumer.vacuumParticles.splice(0, consumer.vacuumParticles.length - 60);
        }

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

        // Massive visual effect
        this.spawnParticles(sx, sy, '#8800ff', 50);
        this.spawnParticles(sx, sy, '#ffffff', 30);
        this.spawnParticles(sx, sy, '#ff00ff', 40);

        // Screen shake
        this.triggerScreenShake(20, 0.5);
        this.triggerSlowmo(0.2, 1.0);

        // Wipe ALL enemies (no damage to player)
        const enemiesWiped = this.enemies.filter(e => e !== consumer).length;
        for (const e of this.enemies) {
            if (e === consumer) continue;
            const esx = this.player.x + (e.wx - this.worldX);
            const esy = this.player.y + (e.wy - this.worldY);
            this.spawnParticles(esx, esy, '#8800ff', 5);
        }
        // Remove all enemies except consumer
        this.enemies = this.enemies.filter(e => e === consumer);

        // Announcement
        this.damageNumbers.push({
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 - 80,
            value: '⚫ THE CONSUMER DEPARTS ⚫',
            lifetime: 3,
            color: '#8800ff',
            scale: 2.5
        });
        this.damageNumbers.push({
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 - 50,
            value: `${enemiesWiped} souls consumed`,
            lifetime: 2.5,
            color: '#cc88ff',
            scale: 1.5
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

        // Pause enemy spawns for 5 seconds
        this.spawnPauseTimer = 5;

        // Remove consumer
        const idx = this.enemies.indexOf(consumer);
        if (idx >= 0) this.enemies.splice(idx, 1);
    }

    handleConsumerKilled(consumer, sx, sy) {
        // Visual effects
        this.spawnParticles(sx, sy, '#8800ff', 50);
        this.spawnParticles(sx, sy, '#ffffff', 30);
        this.spawnParticles(sx, sy, '#ff00ff', 40);

        // Screen shake
        this.triggerScreenShake(20, 0.5);
        this.triggerSlowmo(0.2, 1.0);

        // Wipe ALL enemies (no damage to player)
        const enemiesWiped = this.enemies.filter(e => e !== consumer).length;
        for (const e of this.enemies) {
            if (e === consumer) continue;
            const esx = this.player.x + (e.wx - this.worldX);
            const esy = this.player.y + (e.wy - this.worldY);
            this.spawnParticles(esx, esy, '#8800ff', 5);
        }
        // Remove all enemies
        this.enemies = [];

        // Announcement
        this.damageNumbers.push({
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 - 80,
            value: '💀 THE CONSUMER SLAIN! 💀',
            lifetime: 3,
            color: '#ffcc00',
            scale: 2.5
        });
        this.damageNumbers.push({
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 - 50,
            value: `${enemiesWiped} souls freed`,
            lifetime: 2.5,
            color: '#88ffcc',
            scale: 1.5
        });

        // Drop massive XP
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 100;
            this.pickups.push({
                wx: consumer.wx + Math.cos(angle) * dist,
                wy: consumer.wy + Math.sin(angle) * dist,
                xp: 100 + consumer.consumedCount * 10,
                radius: 10,
                color: '#d4e600',
                isItem: false
            });
        }

        // Pause enemy spawns for 5 seconds
        this.spawnPauseTimer = 5;

        // Count the kill
        this.player.kills++;
    }

    // ==================== CTHULHU BOSS SYSTEM ====================
    startCthulhuWarning() {
        if (this.cthulhuWarning || this.cthulhuSpawned) return;

        this.cthulhuWarning = true;
        this.cthulhuWarningTimer = 30; // 30 seconds until spawn
        this.oceanBackground.transitioning = true;
        this.oceanBackground.targetColor = '#0a2a4a'; // Deep ocean blue

        // Spawn initial swimming creatures
        for (let i = 0; i < 5; i++) {
            this.spawnSwimmingCreature();
        }

        // Warning message
        this.damageNumbers.push({
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 - 100,
            value: '🌊 THE OCEAN STIRS... 🌊',
            lifetime: 5,
            color: '#00aaff',
            scale: 2.5
        });
    }

    spawnSwimmingCreature() {
        const side = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
        let x, y, vx, vy;

        if (side === 0) { x = Math.random() * this.canvas.width; y = -50; vx = (Math.random() - 0.5) * 100; vy = 50 + Math.random() * 50; }
        else if (side === 1) { x = this.canvas.width + 50; y = Math.random() * this.canvas.height; vx = -(50 + Math.random() * 50); vy = (Math.random() - 0.5) * 100; }
        else if (side === 2) { x = Math.random() * this.canvas.width; y = this.canvas.height + 50; vx = (Math.random() - 0.5) * 100; vy = -(50 + Math.random() * 50); }
        else { x = -50; y = Math.random() * this.canvas.height; vx = 50 + Math.random() * 50; vy = (Math.random() - 0.5) * 100; }

        this.swimmingCreatures.push({
            x, y, vx, vy,
            size: 20 + Math.random() * 40,
            type: Math.random() > 0.5 ? '🐙' : '🦑',
            alpha: 0.3 + Math.random() * 0.4,
            wobble: Math.random() * Math.PI * 2
        });
    }

    updateCthulhuWarning(dt) {
        if (!this.cthulhuWarning) return;

        this.cthulhuWarningTimer -= dt;

        // Spawn more creatures as time goes on
        if (Math.random() < 0.02) this.spawnSwimmingCreature();

        // Water ripples
        if (Math.random() < 0.05) {
            this.waterRipples.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                radius: 0,
                maxRadius: 50 + Math.random() * 100,
                alpha: 0.5
            });
        }

        // Update swimming creatures
        for (let i = this.swimmingCreatures.length - 1; i >= 0; i--) {
            const c = this.swimmingCreatures[i];
            c.x += c.vx * dt;
            c.y += c.vy * dt;
            c.wobble += dt * 3;

            // Remove if off screen
            if (c.x < -100 || c.x > this.canvas.width + 100 || c.y < -100 || c.y > this.canvas.height + 100) {
                this.swimmingCreatures.splice(i, 1);
            }
        }

        // Update water ripples
        for (let i = this.waterRipples.length - 1; i >= 0; i--) {
            const r = this.waterRipples[i];
            r.radius += 80 * dt;
            r.alpha -= 0.3 * dt;
            if (r.alpha <= 0 || r.radius >= r.maxRadius) {
                this.waterRipples.splice(i, 1);
            }
        }

        // Screen shake intensifies as Cthulhu approaches
        if (this.cthulhuWarningTimer < 10) {
            if (Math.random() < 0.1) {
                this.triggerScreenShake(2 + (10 - this.cthulhuWarningTimer) * 0.5, 0.1);
            }
        }

        // Warning messages at intervals
        if (this.cthulhuWarningTimer <= 20 && this.cthulhuWarningTimer > 19.9) {
            this.damageNumbers.push({ x: this.canvas.width / 2, y: this.canvas.height / 2, value: '🌊 SOMETHING APPROACHES... 🌊', lifetime: 3, color: '#00ddff', scale: 2 });
        }
        if (this.cthulhuWarningTimer <= 10 && this.cthulhuWarningTimer > 9.9) {
            this.damageNumbers.push({ x: this.canvas.width / 2, y: this.canvas.height / 2, value: '⚠️ CTHULHU AWAKENS IN 10 SECONDS ⚠️', lifetime: 3, color: '#ff4400', scale: 2.5 });
            this.triggerScreenShake(10, 0.5);
        }
        if (this.cthulhuWarningTimer <= 5 && this.cthulhuWarningTimer > 4.9) {
            this.damageNumbers.push({ x: this.canvas.width / 2, y: this.canvas.height / 2, value: '☠️ 5... ☠️', lifetime: 1, color: '#ff0000', scale: 3 });
        }
        if (this.cthulhuWarningTimer <= 4 && this.cthulhuWarningTimer > 3.9) {
            this.damageNumbers.push({ x: this.canvas.width / 2, y: this.canvas.height / 2, value: '☠️ 4... ☠️', lifetime: 1, color: '#ff0000', scale: 3 });
        }
        if (this.cthulhuWarningTimer <= 3 && this.cthulhuWarningTimer > 2.9) {
            this.damageNumbers.push({ x: this.canvas.width / 2, y: this.canvas.height / 2, value: '☠️ 3... ☠️', lifetime: 1, color: '#ff0000', scale: 3 });
        }
        if (this.cthulhuWarningTimer <= 2 && this.cthulhuWarningTimer > 1.9) {
            this.damageNumbers.push({ x: this.canvas.width / 2, y: this.canvas.height / 2, value: '☠️ 2... ☠️', lifetime: 1, color: '#ff0000', scale: 3 });
        }
        if (this.cthulhuWarningTimer <= 1 && this.cthulhuWarningTimer > 0.9) {
            this.damageNumbers.push({ x: this.canvas.width / 2, y: this.canvas.height / 2, value: '☠️ 1... ☠️', lifetime: 1, color: '#ff0000', scale: 3 });
        }

        // Spawn Cthulhu
        if (this.cthulhuWarningTimer <= 0) {
            this.spawnCthulhu();
        }
    }

    spawnCthulhu() {
        if (this.cthulhuSpawned) return;

        this.cthulhuSpawned = true;
        this.cthulhuWarning = false;

        const angle = Math.random() * Math.PI * 2;
        const dist = 500;
        const wx = this.worldX + Math.cos(angle) * dist;
        const wy = this.worldY + Math.sin(angle) * dist;

        if (!this.enemyIdCounter) this.enemyIdCounter = 0;
        this.enemyIdCounter++;

        const waveMult = 1 + this.wave * 0.1;

        const cthulhu = {
            wx, wy,
            id: this.enemyIdCounter,
            type: 'cthulhu',
            name: 'CTHULHU, LORD OF THE SEA',
            isCthulhu: true,
            isBoss: true,
            radius: 120,
            baseRadius: 120,
            speed: 40,
            health: Math.floor(50000 * waveMult),
            maxHealth: Math.floor(50000 * waveMult),
            damage: 100,
            xp: 10000,
            color: '#0a4a2a',
            hitFlash: 0,
            critResistance: 0.9,
            attackCooldown: 0,
            tentaclePhase: 0,
            lastTentacleAttack: 0
        };

        this.enemies.push(cthulhu);

        // Clear nearby enemies
        const nonBossEnemies = this.enemies.filter(e => !e.isBoss);
        const enemiesToRemove = Math.floor(nonBossEnemies.length * 0.8);
        for (let i = 0; i < enemiesToRemove; i++) {
            const idx = this.enemies.findIndex(e => !e.isBoss);
            if (idx !== -1) this.enemies.splice(idx, 1);
        }

        // Epic entrance
        this.triggerScreenShake(30, 1.0);
        this.triggerSlowmo(0.1, 2.0);

        this.damageNumbers.push({
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 - 150,
            value: '🐙 CTHULHU RISES! 🐙',
            lifetime: 5,
            color: '#00ffaa',
            scale: 3
        });
        this.damageNumbers.push({
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 - 100,
            value: 'LORD OF THE SEA',
            lifetime: 5,
            color: '#00ddff',
            scale: 2
        });
        this.damageNumbers.push({
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 - 60,
            value: '☠️ DEFEAT THE ANCIENT ONE ☠️',
            lifetime: 5,
            color: '#ff4400',
            scale: 1.5
        });

        // Grace period
        this.bossGracePeriod = 8;
    }

    handleCthulhuKilled(cthulhu, sx, sy) {
        // Massive visual effects
        this.spawnParticles(sx, sy, '#00ffaa', 80);
        this.spawnParticles(sx, sy, '#00ddff', 60);
        this.spawnParticles(sx, sy, '#ffffff', 40);

        // Screen effects
        this.triggerScreenShake(25, 1.0);
        this.triggerSlowmo(0.1, 2.0);

        // Reset ocean background
        this.oceanBackground.transitioning = true;
        this.oceanBackground.targetColor = '#000000';
        this.swimmingCreatures = [];
        this.waterRipples = [];

        // Victory message
        this.damageNumbers.push({
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 - 100,
            value: '🏆 CTHULHU DEFEATED! 🏆',
            lifetime: 5,
            color: '#ffd700',
            scale: 3
        });

        // Drop Ocean Set piece
        const missing = OCEAN_SET_PIECES.filter(p => !this.oceanSet[p.id]);
        if (missing.length > 0) {
            const piece = missing[Math.floor(Math.random() * missing.length)];
            this.pickups.push({
                wx: cthulhu.wx, wy: cthulhu.wy,
                radius: 15, color: '#00ffaa',
                isOceanPiece: true, pieceId: piece.id
            });
        }

        // Drop massive XP
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 150;
            this.pickups.push({
                wx: cthulhu.wx + Math.cos(angle) * dist,
                wy: cthulhu.wy + Math.sin(angle) * dist,
                xp: 200,
                radius: 12,
                color: '#00ffaa',
                isItem: false
            });
        }

        this.player.kills++;
        this.spawnPauseTimer = 8;
    }

    updateWaterTornadoes(dt) {
        if (!this.oceanSetBonusActive) return;

        // Spawn tornadoes
        if (this.waterTornadoes.length < this.tornadoStats.maxTornadoes) {
            this.tornadoSpawnTimer += dt;
            if (this.tornadoSpawnTimer >= this.tornadoStats.spawnInterval) {
                this.tornadoSpawnTimer = 0;
                const angle = Math.random() * Math.PI * 2;
                const dist = 100 + Math.random() * 200;
                this.waterTornadoes.push({
                    x: this.player.x + Math.cos(angle) * dist,
                    y: this.player.y + Math.sin(angle) * dist,
                    radius: 30,
                    damage: this.tornadoStats.damage,
                    lifetime: this.tornadoStats.duration,
                    pullRadius: this.tornadoStats.pullRadius,
                    rotation: 0,
                    damageTimer: 0
                });
                this.spawnParticles(this.waterTornadoes[this.waterTornadoes.length-1].x, this.waterTornadoes[this.waterTornadoes.length-1].y, '#00ddff', 15);
            }
        }

        // Update tornadoes
        for (let i = this.waterTornadoes.length - 1; i >= 0; i--) {
            const t = this.waterTornadoes[i];
            t.lifetime -= dt;
            t.rotation += dt * 10;
            t.damageTimer += dt;

            if (t.lifetime <= 0) {
                this.waterTornadoes.splice(i, 1);
                continue;
            }

            // Pull and damage enemies
            for (const e of this.enemies) {
                const ex = this.player.x + (e.wx - this.worldX);
                const ey = this.player.y + (e.wy - this.worldY);
                const dx = t.x - ex;
                const dy = t.y - ey;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Pull enemies toward tornado
                if (dist < t.pullRadius && dist > 0) {
                    const pullStrength = (1 - dist / t.pullRadius) * 100 * dt;
                    e.wx += (dx / dist) * pullStrength;
                    e.wy += (dy / dist) * pullStrength;
                }

                // Damage enemies in tornado
                if (dist < t.radius && t.damageTimer >= 0.5) {
                    e.health -= t.damage;
                    e.hitFlash = 0.1;
                    this.damageNumbers.push({
                        x: ex, y: ey - 20,
                        value: t.damage,
                        lifetime: 0.5,
                        color: '#00ddff'
                    });
                }
            }

            if (t.damageTimer >= 0.5) t.damageTimer = 0;
        }
    }
    // ==================== END CTHULHU BOSS SYSTEM ====================

    spawnHealthPack() {
        const angle = Math.random() * Math.PI * 2;
        const dist = 200 + Math.random() * 400;
        this.pickups.push({
            wx: this.worldX + Math.cos(angle) * dist,
            wy: this.worldY + Math.sin(angle) * dist,
            xp: 0, radius: 12, color: '#ff4488', isItem: false, isHealth: true, healAmount: 30
        });
    }

    createSkull() {
        // Create an elemental skull that orbits the player
        const elements = ['fire', 'dark', 'lightning', 'slow'];
        const element = elements[this.skulls.length % 4]; // Cycle through elements
        const colors = { fire: '#ff4400', dark: '#6600aa', lightning: '#ffff00', slow: '#00ccff' };
        return {
            angle: Math.random() * Math.PI * 2,
            radius: 70 + this.skulls.length * 12,
            speed: 2.5 + Math.random() * 0.5,
            damage: 20,
            size: 18,
            element: element,
            color: colors[element]
        };
    }

    addMinion(type) {
        const m = this.createWolf();
        this.minions.push(m);
    }

    createWolf() {
        const angle = Math.random() * Math.PI * 2;

        // Wolf Stats - Scale with level and augments
        const levelMult = 1 + (this.player.level * 0.15); // 15% scaling per level
        const sizeBonus = this.wolfSizeBonus || 1;
        const damageBonus = this.wolfDamageBonus || 1;

        return {
            x: this.player.x + Math.cos(angle) * 80,
            y: this.player.y + Math.sin(angle) * 80,
            radius: Math.floor(14 * sizeBonus),
            speed: 250,
            damage: Math.floor(35 * levelMult * damageBonus),
            health: Math.floor(1200 * levelMult * sizeBonus),
            maxHealth: Math.floor(1200 * levelMult * sizeBonus),
            color: '#8b7355',
            icon: '🐺',
            attackCooldown: 0,
            type: 'wolf'
        };
    }

    gameLoop(t) {
        if (!this.gameRunning) return;
        const dt = (t - this.lastTime) / 1000; this.lastTime = t;
        if (!this.gamePaused) {
            // Check for pending upgrades (Starting Boost) - only show if not already showing
            if (this.pendingUpgrades > 0 && !this.upgradeMenuShowing) {
                this.upgradeMenuShowing = true;
                this.showLevelUpMenu();
                // do not return, let the loop continue so requestAnimationFrame is called
            }
            this.gameTime += dt * 1000;
            this.waveTimer += dt * 1000;
            if (this.waveTimer >= this.waveDuration) {
                this.wave++;
                this.waveTimer = 0;
                this.enemySpawnRate = Math.max(200, this.enemySpawnRate - 80);

                // Spawn soul collectors every 5 waves
                if (this.wave % 5 === 0 || this.wave - this.lastSoulCollectorWave >= 5) {
                    this.spawnSoulCollector();
                    this.lastSoulCollectorWave = this.wave;
                }

                // Reset boss tracking for new wave
                this.bossesSpawnedThisWave = 0;
                this.generalSpawnedThisWave = false;

                // Cthulhu warning at wave 25
                if (this.wave >= this.cthulhuSpawnWave && !this.cthulhuSpawned && !this.cthulhuWarning) {
                    this.startCthulhuWarning();
                }

                // Check for expired soul collectors (10 waves without completion)
                for (let i = this.soulCollectors.length - 1; i >= 0; i--) {
                    const sc = this.soulCollectors[i];
                    if (!sc.complete && this.wave - sc.spawnWave >= 10) {
                        // Despawn and trigger horde
                        this.soulCollectors.splice(i, 1);
                        this.damageNumbers.push({
                            x: this.canvas.width / 2,
                            y: this.canvas.height / 2 - 100,
                            value: '⚠️ SOUL COLLECTOR LOST! HORDE INCOMING! ⚠️',
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

        // Spawn enemies FAR from player - gives player time to prepare
        for (let i = 0; i < hordeSize; i++) {
            setTimeout(() => {
                const angle = (i / hordeSize) * Math.PI * 2 + Math.random() * 0.3;
                const dist = 500 + Math.random() * 200; // FARTHER spawn distance for horde
                const wx = this.worldX + Math.cos(angle) * dist;
                const wy = this.worldY + Math.sin(angle) * dist;

                // Fixed: 'fast' -> 'runner', added sticky and ice to horde pool
                const types = ['basic', 'runner', 'swarm', 'swarm', 'sticky'];
                if (this.wave >= 8) types.push('ice'); // Ice mobs appear in hordes after wave 8
                const type = types[Math.floor(Math.random() * types.length)];
                // Pass isHorde=true for +50% health and 40% slower speed (slower horde)
                const enemy = this.createEnemy(wx, wy, type, false, true);
                enemy.isHordeEnemy = true; // Mark as horde enemy for tracking
                this.enemies.push(enemy);
            }, i * 60); // Slightly more stagger for dramatic effect
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

        // Update spawn pause timer (after Consumer dies)
        if (this.spawnPauseTimer > 0) {
            this.spawnPauseTimer -= effectiveDt;
        }

        // Update boss grace period timer
        if (this.bossGracePeriod > 0) {
            this.bossGracePeriod -= effectiveDt;
        }

        this.updatePlayer(effectiveDt);
        this.updateShield(effectiveDt);
        this.updateRegen(effectiveDt);
        this.updateChronoField(effectiveDt);
        this.updateElementalCycle(effectiveDt);
        this.updateEvents(effectiveDt);
        this.spawnEnemies();
        this.spawnHealthPacks();
        this.updateSoulCollectors(effectiveDt);
        this.updateEnemies(effectiveDt);
        this.updateSkulls(effectiveDt);
        this.updateMinions(effectiveDt);
        this.updateActiveMinions(effectiveDt);
        this.updateImps(effectiveDt);
        this.updateWaterTornadoes(effectiveDt);
        this.updateCthulhuWarning(effectiveDt);
        this.updateAuraFire(effectiveDt);
        this.updateBeamDespair(effectiveDt);
        this.updateWindPush(effectiveDt);
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
        if (!this.settings.screenShake) return; // Respect settings
        this.screenShake.intensity = Math.max(this.screenShake.intensity, intensity);
        this.screenShake.duration = Math.max(this.screenShake.duration, duration);
    }

    triggerSlowmo(factor = 0.3, duration = 0.5) {
        if (!this.settings.slowMotion) return; // Respect settings
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

    // Beam of Despair - chains to enemies, color based on level
    updateBeamDespair(dt) {
        if (!this.beamDespair) return;

        // Initialize beam targets array
        if (!this.beamTargets) this.beamTargets = [];

        // Get beam color for visual effects
        const beamColor = this.beamDespair.color || '#ffffff';

        // Find closest enemies to target
        const targets = [];
        const maxTargets = this.beamDespair.chains;
        const range = this.beamDespair.range;

        // Sort enemies by distance to player
        const sortedEnemies = [...this.enemies].map(e => {
            const sx = this.player.x + (e.wx - this.worldX);
            const sy = this.player.y + (e.wy - this.worldY);
            const dist = Math.sqrt((sx - this.player.x) ** 2 + (sy - this.player.y) ** 2);
            return { enemy: e, sx, sy, dist };
        }).filter(e => e.dist < range).sort((a, b) => a.dist - b.dist);

        // First target: closest enemy to player
        if (sortedEnemies.length > 0) {
            targets.push(sortedEnemies[0]);

            // Chain targets: each subsequent target is closest to the previous target
            let lastTarget = sortedEnemies[0];
            for (let i = 1; i < maxTargets && i < sortedEnemies.length; i++) {
                // Find closest enemy to last target that isn't already targeted
                let bestDist = Infinity;
                let bestTarget = null;
                for (const e of sortedEnemies) {
                    if (targets.some(t => t.enemy === e.enemy)) continue;
                    const chainDist = Math.sqrt((e.sx - lastTarget.sx) ** 2 + (e.sy - lastTarget.sy) ** 2);
                    if (chainDist < bestDist && chainDist < 200) { // Chain range limit
                        bestDist = chainDist;
                        bestTarget = e;
                    }
                }
                if (bestTarget) {
                    targets.push(bestTarget);
                    lastTarget = bestTarget;
                }
            }
        }

        // Store targets for rendering
        this.beamTargets = targets;

        // Deal damage to all targets
        for (const t of targets) {
            const damage = Math.floor(this.beamDespair.damage * dt);
            t.enemy.health -= damage;
            t.enemy.hitFlash = 0.3;

            // Add damage numbers less frequently - use beam color
            if (Math.random() < 0.15) {
                this.addDamageNumber(t.sx, t.sy, this.beamDespair.damage, beamColor, { enemyId: t.enemy.id });
            }

            // Spawn particles on targets occasionally - use beam color
            if (Math.random() < 0.1) {
                this.spawnParticles(t.sx, t.sy, beamColor, 2);
            }
        }
    }

    updateWindPush(dt) {
        if (!this.augments.includes('wind_push')) return;

        this.windPushTimer += dt;
        if (this.windPushTimer >= this.windPushCooldown) {
            this.windPushTimer = 0;

            // Visual effect - wind slash from player
            this.spawnParticles(this.player.x, this.player.y, '#88ccff', 30);
            this.spawnParticles(this.player.x, this.player.y, '#ffffff', 20);

            // Screen shake for impact
            this.triggerScreenShake(8, 0.2);

            // Push all enemies away from player
            const pushRange = 350; // Range of wind push
            const basePushForce = 400; // Base knockback force

            for (const e of this.enemies) {
                const sx = this.player.x + (e.wx - this.worldX);
                const sy = this.player.y + (e.wy - this.worldY);
                const dx = sx - this.player.x;
                const dy = sy - this.player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < pushRange && dist > 0) {
                    // Calculate knockback resistance based on enemy size
                    // Bigger enemies (larger radius) resist more
                    const sizeResistance = Math.min(0.9, e.radius / 100); // Max 90% resistance for huge enemies
                    const effectivePush = basePushForce * (1 - sizeResistance);

                    // Push direction (away from player)
                    const pushX = (dx / dist) * effectivePush;
                    const pushY = (dy / dist) * effectivePush;

                    // Apply push to enemy world position
                    e.wx += pushX * 0.5; // Instant push
                    e.wy += pushY * 0.5;

                    // Visual feedback
                    this.spawnParticles(sx, sy, '#88ccff', 3);
                }
            }

            // Announcement
            this.damageNumbers.push({
                x: this.player.x,
                y: this.player.y - 50,
                value: '💨 GALE FORCE!',
                lifetime: 1,
                color: '#88ccff',
                scale: 1.5
            });
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

        // Heart of Vitality HP5 bonus (HP per 5 seconds)
        const hp5Bonus = this.stackingHp5Bonus || 0;
        const inCombatHp5 = this.inCombatHp5 || 0;
        if (hp5Bonus > 0 || inCombatHp5 > 0) {
            this.hp5Timer = (this.hp5Timer || 0) + dt;
            if (this.hp5Timer >= 5) {
                this.hp5Timer = 0;
                // Out of combat: full HP5 bonus, In combat: only inCombatHp5 (from evolved)
                const healAmount = inCombat ? inCombatHp5 : hp5Bonus;
                if (healAmount > 0 && this.player.health < this.player.maxHealth) {
                    this.player.health = Math.min(this.player.maxHealth, this.player.health + healAmount);
                    this.damageNumbers.push({
                        x: this.player.x, y: this.player.y - 40,
                        value: `❤️ +${Math.floor(healAmount)}`,
                        lifetime: 0.8,
                        color: inCombat ? '#ff6688' : '#ff4466'
                    });
                }
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
        // Skulls always cycle through elements every 4 seconds
        if (this.skulls.length === 0) return;

        this.skullCycleTimer += dt;
        if (this.skullCycleTimer >= 4) { // Cycle every 4 seconds
            this.skullCycleTimer = 0;
            this.skullElementIndex = (this.skullElementIndex + 1) % 4;

            const elements = ['fire', 'dark', 'lightning', 'slow'];
            const colors = { fire: '#ff4400', dark: '#6600aa', lightning: '#ffff00', slow: '#00ccff' };
            const newElement = elements[this.skullElementIndex];

            // Update all skull elements
            for (const s of this.skulls) {
                s.element = newElement;
                s.color = colors[newElement];
            }

            // Visual feedback for element change
            this.damageNumbers.push({
                x: this.player.x,
                y: this.player.y - 50,
                value: `💀 ${newElement.toUpperCase()}!`,
                lifetime: 1,
                color: colors[newElement],
                scale: 0.8
            });
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

    updateSoulCollectors(dt) {
        for (let i = this.soulCollectors.length - 1; i >= 0; i--) {
            const sc = this.soulCollectors[i];

            // Handle complete timer (show complete icon for 5 seconds then remove)
            if (sc.complete) {
                sc.completeTimer -= dt;
                if (sc.completeTimer <= 0) {
                    this.soulCollectors.splice(i, 1);
                }
                continue;
            }
        }
    }

    // Called when enemy dies near a soul collector
    checkSoulCollection(enemyWx, enemyWy, isBoss) {
        for (const sc of this.soulCollectors) {
            if (sc.complete) continue;

            // Check if enemy died within collection radius
            const dx = enemyWx - sc.wx;
            const dy = enemyWy - sc.wy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= sc.radius) {
                // Add souls (bosses give 5 souls)
                const soulsGained = isBoss ? 5 : 1;
                sc.soulsCollected += soulsGained;

                // Visual feedback - soul flying to chest
                const sx = this.player.x + (enemyWx - this.worldX);
                const sy = this.player.y + (enemyWy - this.worldY);
                this.spawnParticles(sx, sy, '#88ffff', 3);

                // Check if complete
                if (sc.soulsCollected >= sc.soulsRequired) {
                    this.completeSoulCollector(sc);
                }
            }
        }
    }

    completeSoulCollector(sc) {
        sc.complete = true;
        sc.completeTimer = 5; // Show complete icon for 5 seconds

        this.playSound('capture');

        // Grant large XP reward (scales with wave)
        const xpReward = 500 + (this.wave * 50);
        this.player.xp += xpReward;

        // Screen position for effects
        const sx = this.player.x + (sc.wx - this.worldX);
        const sy = this.player.y + (sc.wy - this.worldY);

        // Visual feedback
        this.damageNumbers.push({
            x: sx, y: sy - 40,
            value: `💀 SOULS COLLECTED! +${xpReward} XP`,
            lifetime: 3,
            color: '#00ffff',
            scale: 1.8
        });

        this.spawnParticles(sx, sy, '#00ffff', 30);
        this.triggerScreenShake(10, 0.3);

        // Show Augment Menu as reward
        let available = this.diamondAugments.filter(a => {
            if (this.augments.includes(a.id)) return false;
            if (a.req === 'demonSet' && !this.demonSetBonusActive) return false;
            return true;
        });

        if (available.length === 0) {
            available = this.availablePerks;
        }

        if (available.length > 0) {
            const choices = [];
            let pool = [...available];

            for (let i = 0; i < 3 && pool.length > 0; i++) {
                const idx = Math.floor(Math.random() * pool.length);
                choices.push(pool[idx]);
                pool.splice(idx, 1);
            }
            this.showAugmentMenu(choices, () => {
                this.spawnHorde();
                this.spawnSoulCollector();
            });
        } else {
            this.player.health = this.player.maxHealth;
            this.damageNumbers.push({ x: this.player.x, y: this.player.y, value: 'Fully Healed!', color: '#00ff00' });
            this.spawnHorde();
            this.spawnSoulCollector();
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

        // Calculate intended new position (apply speed bonuses from stacking items)
        const speedBonus = 1 + (this.stackingSpeedBonus || 0);
        const moveX = dx * this.player.speed * speedBonus * iceSlowMult * dt;
        const moveY = dy * this.player.speed * speedBonus * iceSlowMult * dt;
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

        // Track distance traveled for stacking items
        const distanceMoved = Math.sqrt(
            (newWorldX - this.worldX) ** 2 +
            (newWorldY - this.worldY) ** 2
        );
        if (distanceMoved > 0) {
            this.updateStackingItems('distance', distanceMoved);
        }

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
        // Check for spawn pause (after Consumer dies)
        if (this.spawnPauseTimer > 0) return;

        const now = performance.now();

        // DYNAMIC MINIMUM: Start at 10, +1 per wave, max 30
        // Early game is manageable, late game gets overwhelming
        // BOSS GRACE PERIOD: Reduce minimum enemies when boss just spawned
        let MIN_ENEMIES = Math.min(30, 10 + this.wave - 1);
        if (this.bossGracePeriod > 0) {
            MIN_ENEMIES = Math.floor(MIN_ENEMIES * 0.3); // Only 30% of normal during grace period
        }
        const needsEmergencySpawn = this.enemies.length < MIN_ENEMIES;

        // Only check spawn rate if we're not in emergency spawn mode
        if (!needsEmergencySpawn && now - this.lastEnemySpawn < this.enemySpawnRate) return;
        this.lastEnemySpawn = now;

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

        // Pick enemy type first to determine spawn distance
        const type = types[Math.floor(Math.random() * types.length)];

        // Spawn around player in world coordinates
        // Enemies spawn further away to give player time to react
        const angle = Math.random() * Math.PI * 2;
        const dist = type === 'swarm' ? (400 + Math.random() * 200) : (550 + Math.random() * 250);
        const wx = this.worldX + Math.cos(angle) * dist;
        const wy = this.worldY + Math.sin(angle) * dist;

        // Consumer boss spawns at wave 15 (one time)
        if (this.wave >= 15 && !this.consumerSpawned) {
            this.spawnConsumer();
            this.consumerSpawned = true;
        }

        // Boss spawning logic - controlled per wave
        // Wave 10: First boss, Wave 15: Consumer, Wave 20: Demon King, Wave 25: Cthulhu
        // After wave 20, random bosses spawn every 5 waves
        const isBossWave = this.wave >= 10 && this.wave % 10 === 0;
        const isGeneralWave = this.wave === 20; // Demon King only at wave 20
        const isRandomBossWave = this.wave > 20 && this.wave % 5 === 0; // Random bosses after wave 20

        if ((isBossWave || isRandomBossWave) && this.lastBossWave !== this.wave) {
            // Calculate how many bosses should spawn this wave
            const bossWaveNumber = this.wave > 20 ? Math.floor((this.wave - 20) / 5) + 1 : 1;
            const maxBossesThisWave = Math.min(bossWaveNumber, 5); // Cap at 5 bosses

            // If we're past the cap, increase boss stats
            if (bossWaveNumber > 5) {
                this.bossStatMultiplier = 1 + (bossWaveNumber - 5) * 0.2; // +20% per wave past cap
            }

            // BOSS SPAWN: Clear nearby enemies and start grace period
            // This gives player breathing room when boss appears
            if (this.bossesSpawnedThisWave === 0) {
                // First boss of the wave - clear 60% of non-boss enemies
                const nonBossEnemies = this.enemies.filter(e => !e.isBoss);
                const enemiesToRemove = Math.floor(nonBossEnemies.length * 0.6);
                for (let i = 0; i < enemiesToRemove; i++) {
                    const idx = this.enemies.findIndex(e => !e.isBoss);
                    if (idx !== -1) {
                        this.enemies.splice(idx, 1);
                    }
                }
                // Start grace period - reduced spawns for 5 seconds
                this.bossGracePeriod = 5;
            }

            // Spawn Demonic General (Demon King) at wave 20 only
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
            // Type already picked above for spawn distance calculation
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
            // Swarm is now the default enemy from wave 1 - fast spawns, surrounds player
            // Speeds increased to compensate for further spawn distance
            swarm: { radius: 14, speed: 115, health: 20, damage: 10, xp: 2, color: '#ff66aa', icon: '' },
            basic: { radius: 12, speed: 100, health: 30, damage: 15, xp: 6, color: '#ff4466', icon: '' },
            runner: { radius: 16, speed: 200, health: 40, damage: 10, xp: 5, color: '#00ffff', icon: '💨' }, // Bigger radius (16 vs 10)
            tank: { radius: 28, speed: 60, health: 350, damage: 31, xp: 25, color: '#8844ff', icon: '' },
            splitter: { radius: 20, speed: 85, health: 150, damage: 19, xp: 15, color: '#44ddff', icon: '💧', splits: true },
            bomber: { radius: 16, speed: 105, health: 75, damage: 13, xp: 12, color: '#ff8800', icon: '💣', explodes: true },
            mini: { radius: 6, speed: 140, health: 25, damage: 8, xp: 3, color: '#44ddff', icon: '' },
            // New enemy types
            sticky: { radius: 12, speed: 120, health: 50, damage: 6, xp: 8, color: '#88ff00', icon: '🍯', stickies: true },
            ice: { radius: 32, speed: 55, health: 200, damage: 25, xp: 20, color: '#00ddff', icon: '🧊', freezesOnDeath: true },
            poison: { radius: 14, speed: 90, health: 80, damage: 12, xp: 10, color: '#00cc44', icon: '☣️', explodes: true, isPoisonous: true } // Green poison explosion
        }[type] || data.basic;

        const sizeMult = isSplit ? 0.6 : 1;
        // Horde enemies get +50% health and 40% slower speed (easier to deal with)
        const hordeHealthMult = isHorde ? 1.5 : 1;
        const hordeSpeedMult = isHorde ? 0.6 : 1;

        // Unique enemy ID for damage number stacking
        if (!this.enemyIdCounter) this.enemyIdCounter = 0;
        this.enemyIdCounter++;

        return {
            wx, wy, type,
            id: this.enemyIdCounter, // Unique ID for damage stacking
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
            isHorde: isHorde,
            attackCooldown: 0 // For attack speed system
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
        let stats = { health: 3000, damage: 50, speed: 75, radius: 80, xp: 500 }; // Reduced for early game

        if (type === 'general') {
            name = `DEMON GENERAL ${BOSS_NAMES[Math.floor(Math.random() * BOSS_NAMES.length)]}`;
            face = '👹';
            color = '#8800ff';
            stats = { health: 8000, damage: 80, speed: 90, radius: 100, xp: 2000 }; // Reduced for early game
        } else {
            const faces = ['😈', '👹', '💀', '👿', '🤡', '👺', '☠️', '🔥'];
            face = faces[Math.floor(Math.random() * faces.length)];
            stats.radius += this.wave * 8;
        }

        // Crit Resistance (Max 75% at wave 25)
        const critResist = Math.min(0.75, (this.wave * 0.03));

        // Apply stat multiplier for waves past boss cap
        const statMult = this.bossStatMultiplier || 1.0;

        // Unique enemy ID for damage number stacking
        if (!this.enemyIdCounter) this.enemyIdCounter = 0;
        this.enemyIdCounter++;

        return {
            wx, wy, type, name,
            id: this.enemyIdCounter, // Unique ID for damage stacking
            face,
            radius: stats.radius,
            speed: Math.floor(stats.speed * GAME_SETTINGS.enemySpeedMult), // Speed does NOT scale
            health: Math.floor(stats.health * waveMult * GAME_SETTINGS.enemyHealthMult * statMult),
            maxHealth: Math.floor(stats.health * waveMult * GAME_SETTINGS.enemyHealthMult * statMult),
            damage: Math.floor(stats.damage * waveMult * GAME_SETTINGS.enemyDamageMult * statMult),
            xp: Math.floor(stats.xp * waveMult),
            color, hitFlash: 0, isBoss: true,
            critResistance: critResist,
            attackCooldown: 0 // For attack speed system
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

            // Update attack cooldown
            if (e.attackCooldown > 0) {
                e.attackCooldown -= dt;
            }

            // Collision with player (use updated position)
            const pd = Math.sqrt((sxMoved - this.player.x) ** 2 + (syMoved - this.player.y) ** 2);
            if (pd < e.radius + this.player.radius && this.player.invincibleTime <= 0 && e.attackCooldown <= 0) {
                // Set attack cooldown - enemies can attack again after this time
                // Swarm attacks faster, bosses attack slower
                const baseAttackSpeed = e.isBoss ? 1.5 : (e.type === 'swarm' ? 0.4 : 0.8);
                e.attackCooldown = baseAttackSpeed;

                if (this.shieldActive) {
                    this.shieldActive = false;
                    this.shieldTimer = 0;
                    this.spawnParticles(this.player.x, this.player.y, '#00aaff', 10);
                } else {
                    this.player.health -= e.damage;
                    this.player.invincibleTime = 0.5;
                    this.combatTimer = 0; // Reset combat timer - healing reduced for 3s
                    this.damageNumbers.push({ x: this.player.x, y: this.player.y - 20, value: -e.damage, lifetime: 1, color: '#ff4444', isText: true });
                    this.playSound('hit');

                    // Thorn Armor: reflect damage back to enemy
                    if (this.thornDamage > 0) {
                        const reflected = Math.floor(e.damage * this.thornDamage);
                        e.health -= reflected;
                        e.hitFlash = 1;
                        this.addDamageNumber(sxMoved, syMoved, reflected, '#ff66aa', { enemyId: e.id, scale: 1 });
                        this.spawnParticles(sxMoved, syMoved, '#ff66aa', 5);
                    }

                    // Sticky enemy effect: immobilize player for 1.5 seconds
                    if (e.stickies && this.stickyTimer <= 0) {
                        this.stickyTimer = 1.5; // 1.5 seconds immobilized
                        this.damageNumbers.push({
                            x: this.player.x, y: this.player.y - 50,
                            value: '🍯 STUCK!', lifetime: 2, color: '#88ff00', scale: 1.5, isText: true
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
        // Special handling for Consumer death (killed by player)
        if (e.isConsumer) {
            this.handleConsumerKilled(e, sx, sy);
            const idx = this.enemies.indexOf(e);
            if (idx >= 0) this.enemies.splice(idx, 1);
            return;
        }

        // Special handling for Cthulhu death
        if (e.isCthulhu) {
            this.handleCthulhuKilled(e, sx, sy);
            const idx = this.enemies.indexOf(e);
            if (idx >= 0) this.enemies.splice(idx, 1);
            return;
        }

        this.player.kills++;
        this.playSound('kill');

        // Soul Collector - check if enemy died near a collector
        this.checkSoulCollection(e.wx, e.wy, e.isBoss);

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

        // Blood Soaker evolved - heal burst on kill
        if (this.healBurstOnKill && this.player.health < this.player.maxHealth) {
            const healAmount = e.isBoss ? 50 : 10; // Bigger heal on boss kills
            this.player.health = Math.min(this.player.maxHealth, this.player.health + healAmount);
            this.damageNumbers.push({
                x: this.player.x, y: this.player.y - 35,
                value: `🧛 +${healAmount}`,
                lifetime: 0.6,
                color: '#cc00ff'
            });
            // Blood particles on player
            this.spawnParticles(this.player.x, this.player.y, '#cc00ff', 3);
        }

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

        // Soul Harvest (tech_wizard augment): 10% chance to spawn a skull on kill (max 12)
        if (this.augments.includes('tech_wizard') && this.skulls.length < 12) {
            if (Math.random() < 0.10) {
                this.skulls.push(this.createSkull());
                this.damageNumbers.push({ x: sx, y: sy - 20, value: '💀 SOUL!', lifetime: 1, color: '#aa44ff', scale: 0.8 });
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
        // Check 3-minute cooldown since last item pickup (180000ms = 3 minutes)
        const itemCooldown = 180000;
        if (this.gameTime - this.lastItemPickupTime < itemCooldown) return;

        // Only drop items that haven't been collected yet
        const allKeys = Object.keys(STACKING_ITEMS);
        const availableKeys = allKeys.filter(key => !this.droppedItems.includes(key));

        if (availableKeys.length === 0) return; // All items already dropped

        const itemKey = availableKeys[Math.floor(Math.random() * availableKeys.length)];
        this.pickups.push({ wx, wy, xp: 0, radius: 15, color: '#fbbf24', isItem: true, itemKey });
    }

    updateSkulls(dt) {
        // Initialize skull hit tracking if not exists
        if (!this.skullHits) this.skullHits = new Map();

        this.skulls.forEach((s, sIndex) => {
            s.angle += s.speed * dt;
            const sx = this.player.x + Math.cos(s.angle) * s.radius;
            const sy = this.player.y + Math.sin(s.angle) * s.radius;

            // Check collision with enemies
            for (const e of this.enemies) {
                const ex = this.player.x + (e.wx - this.worldX);
                const ey = this.player.y + (e.wy - this.worldY);
                const d = Math.sqrt((sx - ex) ** 2 + (sy - ey) ** 2);
                if (d < s.size + e.radius) {
                    // Diminishing returns system: track hits per enemy per skull
                    if (!e.skullHitId) e.skullHitId = Math.random();
                    const hitKey = `skull${sIndex}_${e.skullHitId}`;

                    if (!this.skullHits.has(hitKey)) {
                        this.skullHits.set(hitKey, { lastHit: 0, hitCount: 0 });
                    }
                    const hitData = this.skullHits.get(hitKey);

                    // Hit cooldown: 0.3 seconds between hits on same target
                    if (this.gameTime - hitData.lastHit < 300) continue;

                    hitData.lastHit = this.gameTime;
                    hitData.hitCount++;

                    // Diminishing returns: damage reduces by 15% per consecutive hit, min 30% of base
                    const diminishFactor = Math.max(0.3, 1 - (hitData.hitCount - 1) * 0.15);
                    const actualDamage = Math.floor(s.damage * diminishFactor);

                    e.health -= actualDamage; e.hitFlash = 1;

                    // Elemental effects based on current skull element
                    if (s.element === 'fire') {
                        // Fire: Burn damage over time
                        e.health -= Math.floor(actualDamage * 0.5);
                        this.spawnParticles(ex, ey, '#ff4400', 5);
                        this.addDamageNumber(ex, ey, Math.floor(actualDamage * 1.5), '#ff4400', { enemyId: e.id });
                    } else if (s.element === 'dark') {
                        // Dark: High damage, life steal
                        const darkBonus = Math.floor(actualDamage * 0.3);
                        e.health -= darkBonus;
                        this.player.health = Math.min(this.player.maxHealth, this.player.health + Math.floor(darkBonus * 0.1));
                        this.spawnParticles(ex, ey, '#6600aa', 5);
                        this.addDamageNumber(ex, ey, actualDamage + darkBonus, '#aa44ff', { enemyId: e.id });
                    } else if (s.element === 'lightning') {
                        // Lightning: Chain to nearby enemies
                        let chainTarget = null;
                        let chainDist = 150;
                        for (const other of this.enemies) {
                            if (other === e) continue;
                            const otherEx = this.player.x + (other.wx - this.worldX);
                            const otherEy = this.player.y + (other.wy - this.worldY);
                            const chainD = Math.sqrt((ex - otherEx) ** 2 + (ey - otherEy) ** 2);
                            if (chainD < chainDist) {
                                chainDist = chainD;
                                chainTarget = other;
                            }
                        }
                        if (chainTarget) {
                            chainTarget.health -= Math.floor(actualDamage * 0.5);
                            chainTarget.hitFlash = 1;
                            const chainEx = this.player.x + (chainTarget.wx - this.worldX);
                            const chainEy = this.player.y + (chainTarget.wy - this.worldY);
                            this.addDamageNumber(chainEx, chainEy, Math.floor(actualDamage * 0.5), '#ffff00', { enemyId: chainTarget.id });
                        }
                        this.spawnParticles(ex, ey, '#ffff00', 5);
                        this.addDamageNumber(ex, ey, actualDamage, '#ffff00', { enemyId: e.id });
                    } else if (s.element === 'slow') {
                        // Slow: Reduce enemy speed
                        e.speed = Math.max(20, e.speed * 0.6);
                        e.slowTimer = 2; // Slow lasts 2 seconds
                        this.spawnParticles(ex, ey, '#00ccff', 5);
                        this.addDamageNumber(ex, ey, actualDamage, '#00ccff', { enemyId: e.id });
                    } else {
                        this.addDamageNumber(ex, ey, actualDamage, s.color, { enemyId: e.id });
                    }
                } else {
                    // Enemy out of range - reset hit count
                    if (e.skullHitId) {
                        const hitKey = `skull${sIndex}_${e.skullHitId}`;
                        if (this.skullHits.has(hitKey)) {
                            this.skullHits.get(hitKey).hitCount = 0;
                        }
                    }
                }
            }
        });

        // Clean up old hit tracking entries periodically
        if (this.gameTime % 5000 < 20) {
            for (const [key, data] of this.skullHits) {
                if (this.gameTime - data.lastHit > 3000) {
                    this.skullHits.delete(key);
                }
            }
        }
    }

    updateMinions(dt) {
        // Wolf respawn logic
        const maxWolves = this.maxWolves || 0;
        if (maxWolves > 0 && this.minions.length < maxWolves) {
            if (!this.wolfRespawnTimer) this.wolfRespawnTimer = 0;
            this.wolfRespawnTimer += dt;
            if (this.wolfRespawnTimer >= 12) { // Wolves respawn every 12 seconds
                this.wolfRespawnTimer = 0;
                this.addMinion('wolf');
            }
        }

        // Alpha Howl effect
        if (this.augments.includes('alpha_howl')) {
            this.howlTimer = (this.howlTimer || 0) + dt;
            if (this.howlTimer >= this.howlCooldown) {
                this.howlTimer = 0;
                this.howlActive = true;
                this.howlActiveTimer = this.howlDuration;
                // Visual feedback
                this.spawnParticles(this.player.x, this.player.y, '#ffdd00', 20);
            }
            if (this.howlActive) {
                this.howlActiveTimer -= dt;
                if (this.howlActiveTimer <= 0) {
                    this.howlActive = false;
                }
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
        // Apply howl buff multipliers
        const howlSpeedMult = this.howlActive ? 1.5 : 1;
        const howlDamageMult = this.howlActive ? 1.5 : 1;
        const attackSpeedMult = this.wolfAttackSpeed || 1;

        for (let i = this.minions.length - 1; i >= 0; i--) {
            const m = this.minions[i];

            if (m.health <= 0) {
                this.spawnParticles(m.x, m.y, m.color, 10);
                this.minions.splice(i, 1);
                continue;
            }

            // Wolf Logic: Stay near player, seek enemy if close
            const distToPlayer = Math.sqrt((m.x - this.player.x) ** 2 + (m.y - this.player.y) ** 2);
            let target = null;
            let moveTarget = null;

            // Find nearest enemy in range
            let nd = Infinity;
            for (const e of this.enemies) {
                const sx = this.player.x + (e.wx - this.worldX);
                const sy = this.player.y + (e.wy - this.worldY);
                const d = Math.sqrt((m.x - sx) ** 2 + (m.y - sy) ** 2);
                if (d < 350 && d < nd) { nd = d; target = e; moveTarget = { x: sx, y: sy }; }
            }

            // Move logic with howl speed bonus
            const effectiveSpeed = m.speed * howlSpeedMult;
            if (target) {
                // Chase enemy
                const dx = moveTarget.x - m.x, dy = moveTarget.y - m.y, d = Math.sqrt(dx * dx + dy * dy);
                if (d > 0) { m.x += (dx / d) * effectiveSpeed * dt; m.y += (dy / d) * effectiveSpeed * dt; }
            } else if (distToPlayer > 100) {
                // Return to player (orbit loosely)
                const angle = Math.atan2(this.player.y - m.y, this.player.x - m.x);
                m.x += Math.cos(angle) * effectiveSpeed * dt;
                m.y += Math.sin(angle) * effectiveSpeed * dt;
            }

            // Attack cooldown (faster with feral frenzy)
            if (m.attackCooldown > 0) m.attackCooldown -= dt * attackSpeedMult;

            // Attack with howl damage bonus
            if (target && nd < m.radius + target.radius + 15 && m.attackCooldown <= 0) {
                m.attackCooldown = 0.8;
                const damage = Math.floor(m.damage * howlDamageMult);
                target.health -= damage;
                target.hitFlash = 1;
                this.damageNumbers.push({ x: moveTarget.x, y: moveTarget.y - 10, value: damage, lifetime: 0.5, color: '#8b7355' });
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

                    // Pack Tactics: +5% damage per wolf
                    if (this.augments.includes('pack_tactics') && this.minions.length > 0) {
                        damage = Math.floor(damage * (1 + this.minions.length * 0.05));
                    }

                    // Ocean Trident bonus: +50% damage
                    if (this.oceanTridentBonus) {
                        damage = Math.floor(damage * this.oceanTridentBonus);
                    }

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

                    // Blood Soaker lifesteal
                    if (this.stackingLifesteal && this.stackingLifesteal > 0) {
                        const healAmount = Math.floor(damage * this.stackingLifesteal);
                        if (healAmount > 0 && this.player.health < this.player.maxHealth) {
                            this.player.health = Math.min(this.player.maxHealth, this.player.health + healAmount);
                            // Show lifesteal heal (less frequently to avoid spam)
                            if (Math.random() < 0.1) {
                                this.damageNumbers.push({
                                    x: this.player.x, y: this.player.y - 30,
                                    value: `🩸 +${healAmount}`,
                                    lifetime: 0.5,
                                    color: '#ff4466'
                                });
                            }
                        }
                    }

                    // Use stacking damage numbers (crit text still shows separately)
                    if (isCrit) {
                        this.addDamageNumber(sx, sy, damage, color, { enemyId: e.id, scale: 1.3 });
                    } else {
                        this.addDamageNumber(sx, sy, damage, color, { enemyId: e.id });
                    }

                    if (isCrit) this.spawnParticles(p.x, p.y, '#ff0000', 5);
                    else this.spawnParticles(p.x, p.y, '#fff', 3);

                    // Freeze effect from Frost Bullets item
                    if (p.canFreeze && this.freezeChance && Math.random() < this.freezeChance) {
                        e.frozen = true;
                        e.frozenTimer = 2; // Frozen for 2 seconds
                        this.spawnParticles(sx, sy, '#00ddff', 8);
                        this.damageNumbers.push({ x: sx, y: sy - 30, value: '❄️', lifetime: 1, color: '#00ddff', isText: true });
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
                                this.addDamageNumber(osx, osy, splashDmg, '#ff8800', { enemyId: other.id });
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
                } else if (pk.isOceanPiece) {
                    // Ocean Piece Collection (King of the Ocean Set)
                    if (!this.oceanSet[pk.pieceId]) {
                        this.oceanSet[pk.pieceId] = true;
                        this.playSound('levelup');

                        // Apply piece bonus
                        const piece = OCEAN_SET_PIECES.find(p => p.id === pk.pieceId);
                        if (piece.id === 'crown') { this.player.maxHealth += 1000; this.player.health += 1000; }
                        if (piece.id === 'trident') { this.oceanTridentBonus = 1.5; } // 50% damage bonus
                        if (piece.id === 'scales') { this.player.speed += 100; }

                        this.damageNumbers.push({
                            x: this.player.x, y: this.player.y - 80,
                            value: `🌊 EQUIPPED: ${piece.name} 🌊`, lifetime: 3, color: '#00ffaa', scale: 1.5
                        });

                        // Check Full Set
                        if (this.oceanSet.crown && this.oceanSet.trident && this.oceanSet.scales && !this.oceanSetBonusActive) {
                            this.oceanSetBonusActive = true;
                            this.damageNumbers.push({
                                x: this.player.x, y: this.player.y - 120,
                                value: `🌊 KING OF THE OCEAN SET ACTIVE! 🌊`, lifetime: 4, color: '#00ffaa', scale: 2.0
                            });
                            this.damageNumbers.push({
                                x: this.player.x, y: this.player.y - 160,
                                value: `Water Tornadoes Unleashed!`, lifetime: 4, color: '#00ddff', scale: 1.5
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
            this.lastItemPickupTime = this.gameTime; // Track pickup time for cooldown
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
        let stackTypeText, stackTypeIcon;
        if (item.stackType === 'damage') {
            stackTypeText = 'STACKS WITH DAMAGE DEALT';
            stackTypeIcon = '⚔️';
        } else if (item.stackType === 'distance') {
            stackTypeText = 'STACKS WITH DISTANCE TRAVELED';
            stackTypeIcon = '🏃';
        } else {
            stackTypeText = 'STACKS WITH KILLS';
            stackTypeIcon = '💀';
        }
        const maxStacksFormatted = item.maxStacks >= 1000 ? `${(item.maxStacks / 1000).toFixed(0)}k` : item.maxStacks;

        // Check if item has sprite icons
        let iconHtml = `<div style="font-size: 4rem; margin-bottom: 1rem;">${item.icon}</div>`;
        let evolvedIconHtml = `${item.evolvedIcon} ${item.evolvedName}`;
        if (item.hasSprite) {
            // Get the correct sprite based on item key
            let spriteSet = null;
            if (key === 'beamDespair') spriteSet = BEAM_DESPAIR_SPRITES;
            else if (key === 'critBlade') spriteSet = CRIT_BLADE_SPRITES;
            else if (key === 'ringXp') spriteSet = RING_XP_SPRITES;
            else if (key === 'bootsSwiftness') spriteSet = BOOTS_SWIFTNESS_SPRITES;
            else if (key === 'heartVitality') spriteSet = HEART_VITALITY_SPRITES;
            else if (key === 'bloodSoaker') spriteSet = BLOOD_SOAKER_SPRITES;

            if (spriteSet) {
                iconHtml = `<img src="${getSpritePath(spriteSet.base)}" style="width: 80px; height: 80px; margin-bottom: 1rem; border-radius: 12px; border: 2px solid #fbbf24;" onerror="this.style.display='none'">`;
                evolvedIconHtml = `<img src="${getSpritePath(spriteSet.evolved)}" style="width: 40px; height: 40px; vertical-align: middle; border-radius: 8px; margin-right: 8px;" onerror="this.style.display='none'"> ${item.evolvedName}`;
            }
        }

        popup.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); border: 3px solid #fbbf24;
                border-radius: 20px; padding: 2rem; max-width: 400px; text-align: center;
                box-shadow: 0 0 50px rgba(251, 191, 36, 0.3);">
                ${iconHtml}
                <h2 style="color: #fbbf24; font-size: 1.5rem; margin-bottom: 0.5rem;">${item.name}</h2>
                <p style="color: #aaa; font-size: 0.9rem; margin-bottom: 1.5rem;">${item.desc}</p>

                <div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 1rem; margin-bottom: 1rem;">
                    <p style="color: #888; font-size: 0.8rem; margin-bottom: 0.5rem;">${stackTypeIcon} ${stackTypeText}</p>
                    <p style="color: #fff; font-size: 0.9rem;">0 / ${maxStacksFormatted} stacks</p>
                </div>

                <div style="background: rgba(251, 191, 36, 0.1); border: 1px solid #fbbf24; border-radius: 12px; padding: 1rem; margin-bottom: 1.5rem;">
                    <p style="color: #fbbf24; font-size: 0.75rem; margin-bottom: 0.3rem;">⬆️ EVOLVES INTO</p>
                    <p style="color: #fff; font-size: 1rem;">${evolvedIconHtml}</p>
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
        // Called on kills, damage, or distance to add stacks to all collected stacking items
        for (const key in this.stackingItems) {
            const itemData = this.stackingItems[key];
            const item = STACKING_ITEMS[key];
            if (!item || itemData.evolved) continue;

            // Add stacks based on type matching item's stackType
            if (type === 'kill' && item.stackType === 'kill') {
                itemData.stacks += amount;
            } else if (type === 'damage' && item.stackType === 'damage') {
                itemData.stacks += amount;
            } else if (type === 'distance' && item.stackType === 'distance') {
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
        // Show upgrade selection menu - player picks from 3 RANDOM upgrades
        this.playSound('levelup');
        this.gamePaused = true;

        // Get all available upgrades
        const all = [...this.baseUpgrades, ...this.selectedClass.upgrades];

        // Early waves (1-10): Only damage and HP related upgrades
        const earlyWaveIds = ['damage', 'health', 'firerate', 'critdmg', 'devastation', 'armor'];
        let available;
        if (this.wave <= 10) {
            available = all.filter(u => earlyWaveIds.includes(u.id));
        } else {
            available = all;
        }

        // Build the upgrade menu
        const container = document.getElementById('upgrade-choices');
        if (!container) {
            // Fallback if no container - use old random system
            const choices = this.getRandomUpgrades(3);
            const randomUpgrade = choices[Math.floor(Math.random() * choices.length)];
            randomUpgrade.effect(this);
            this.gamePaused = false;
            return;
        }

        container.innerHTML = '';

        // Pick 3 RANDOM upgrades from available pool (weighted by rarity)
        const choices = [];
        const pool = [...available];
        const weights = { common: 50, rare: 30, epic: 15, legendary: 5 };

        while (choices.length < 3 && pool.length > 0) {
            const weightedPool = [];
            pool.forEach((u, idx) => {
                const w = weights[u.rarity] || 50;
                for (let i = 0; i < w; i++) weightedPool.push(idx);
            });
            const idx = weightedPool[Math.floor(Math.random() * weightedPool.length)];
            choices.push(pool.splice(idx, 1)[0]);
        }

        choices.forEach(upgrade => {
            const card = document.createElement('div');
            card.className = `upgrade-card ${upgrade.rarity || 'common'}`;
            card.innerHTML = `
                <div class="upgrade-icon">${upgrade.icon}</div>
                <div class="upgrade-name" style="color: #fff;">${upgrade.name}</div>
                <div class="upgrade-desc" style="color: #ddd;">${upgrade.desc}</div>
                <div class="upgrade-stats" style="color: #aaa;">${upgrade.getDesc ? upgrade.getDesc(this) : ''}</div>
            `;
            card.onclick = () => {
                upgrade.effect(this);
                document.getElementById('levelup-menu').classList.add('hidden');
                this.upgradeMenuShowing = false;
                this.gamePaused = false;

                // Show what they picked
                this.damageNumbers.push({
                    x: this.canvas.width / 2,
                    y: this.canvas.height / 2 - 50,
                    value: `⬆️ ${upgrade.icon} ${upgrade.name}`,
                    lifetime: 2,
                    color: upgrade.rarity === 'legendary' ? '#fbbf24' : upgrade.rarity === 'epic' ? '#a855f7' : upgrade.rarity === 'rare' ? '#4da6ff' : '#b8b8b8',
                    scale: 1.5
                });

                // Handle multiple pending upgrades
                if (this.pendingUpgrades > 0) {
                    this.pendingUpgrades--;
                    // Next upgrade will be shown by the game loop when upgradeMenuShowing is false
                }
            };
            container.appendChild(card);
        });

        document.getElementById('levelup-menu').classList.remove('hidden');
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

            // Pick 3 RANDOM diamond augments
            choices = [];
            const pool = [...available];
            while (choices.length < 3 && pool.length > 0) {
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
                    <div class="upgrade-name" style="color:#ffffff;">${u.name}</div>
                    <div class="upgrade-desc" style="color:#ffffff;">${u.desc}</div>
                    <div class="upgrade-stats" style="color:#cccccc;font-size:0.8em;margin-top:4px;">${desc}</div>
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

        // Early waves (1-10): Only damage and HP related upgrades
        const earlyWaveIds = ['damage', 'health', 'firerate', 'critdmg', 'devastation', 'armor'];
        let filtered;
        if (this.wave <= 10) {
            filtered = all.filter(u => earlyWaveIds.includes(u.id));
        } else {
            filtered = all;
        }

        const result = [], weights = { common: 50, rare: 30, epic: 15, legendary: 5 };
        const available = [...filtered];
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

    // Stacked damage number system - combines damage on same target
    addDamageNumber(x, y, value, color, options = {}) {
        const { scale = 1, lifetime = 0.8, enemyId = null, isText = false } = options;

        // If it's text (like "STUCK!" or "Rise!") or no enemy ID, just add normally
        if (isText || !enemyId || typeof value !== 'number') {
            this.damageNumbers.push({ x, y, value, lifetime, color, scale, isText: true });
            return;
        }

        // Look for existing damage number for this enemy within stacking window
        const stackWindow = 0.6; // Stack damage within 0.6 seconds
        const existing = this.damageNumbers.find(d =>
            d.enemyId === enemyId &&
            d.lifetime > (d.maxLifetime - stackWindow) &&
            !d.isText
        );

        if (existing) {
            // Stack onto existing number
            existing.value += value;
            existing.lifetime = existing.maxLifetime; // Reset lifetime
            existing.scale = Math.min(2.5, 1 + (existing.stackCount * 0.15)); // Grow with stacks
            existing.stackCount++;
            existing.pulseTimer = 0.15; // Trigger pulse animation
            existing.x = x; // Update position to latest hit
            existing.y = y - 10;
        } else {
            // Create new stacked damage number
            this.damageNumbers.push({
                x, y: y - 10,
                value,
                lifetime: 1.2,
                maxLifetime: 1.2,
                color,
                scale,
                enemyId,
                stackCount: 1,
                pulseTimer: 0,
                isText: false
            });
        }
    }

    updateDamageNumbers(dt) {
        // Limit max active numbers
        if (this.damageNumbers.length > 50) {
            this.damageNumbers.splice(0, this.damageNumbers.length - 50);
        }

        for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
            const d = this.damageNumbers[i];
            d.y -= 25 * dt; // Float upward
            d.lifetime -= dt;

            // Update pulse animation
            if (d.pulseTimer > 0) {
                d.pulseTimer -= dt;
            }

            if (d.lifetime <= 0) this.damageNumbers.splice(i, 1);
        }
    }



    updateParticles(dt) { for (let i = this.particles.length - 1; i >= 0; i--) { const p = this.particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.lifetime -= dt; if (p.lifetime <= 0) this.particles.splice(i, 1); } }

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

        // Play menu music on game over
        this.playMenuMusic();

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

        // Ocean background transition for Cthulhu
        if (this.oceanBackground && this.oceanBackground.transitioning) {
            // Lerp toward target color
            const current = this.oceanBackground.currentColor;
            const target = this.oceanBackground.targetColor;
            const speed = this.oceanBackground.transitionSpeed;

            // Parse hex colors
            const cR = parseInt(current.slice(1, 3), 16);
            const cG = parseInt(current.slice(3, 5), 16);
            const cB = parseInt(current.slice(5, 7), 16);
            const tR = parseInt(target.slice(1, 3), 16);
            const tG = parseInt(target.slice(3, 5), 16);
            const tB = parseInt(target.slice(5, 7), 16);

            // Lerp
            const nR = Math.round(cR + (tR - cR) * speed);
            const nG = Math.round(cG + (tG - cG) * speed);
            const nB = Math.round(cB + (tB - cB) * speed);

            this.oceanBackground.currentColor = `#${nR.toString(16).padStart(2,'0')}${nG.toString(16).padStart(2,'0')}${nB.toString(16).padStart(2,'0')}`;

            // Check if close enough to stop
            if (Math.abs(cR - tR) <= 1 && Math.abs(cG - tG) <= 1 && Math.abs(cB - tB) <= 1) {
                this.oceanBackground.currentColor = target;
                this.oceanBackground.transitioning = false;
            }
        }

        // Use ocean background color if set, otherwise default
        const bgColor = (this.oceanBackground && this.oceanBackground.currentColor !== '#000000') ? this.oceanBackground.currentColor : '#0a0a0f';
        ctx.fillStyle = bgColor;
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

        // Draw Cthulhu warning effects (swimming creatures, water ripples)
        if (this.cthulhuWarning || (this.oceanBackground && this.oceanBackground.currentColor !== '#000000')) {
            // Water ripples
            if (this.waterRipples) {
                this.waterRipples.forEach(r => {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(0, 180, 255, ${r.alpha})`;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    ctx.restore();
                });
            }

            // Swimming creatures
            if (this.swimmingCreatures) {
                this.swimmingCreatures.forEach(c => {
                    ctx.save();
                    ctx.globalAlpha = c.alpha;
                    ctx.font = `${c.size}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    // Add wobble effect
                    const wobbleX = Math.sin(c.wobble) * 5;
                    const wobbleY = Math.cos(c.wobble * 0.7) * 3;
                    ctx.fillText(c.type, c.x + wobbleX, c.y + wobbleY);
                    ctx.restore();
                });
            }
        }

        // Draw water tornadoes (Ocean Set bonus)
        if (this.waterTornadoes && this.waterTornadoes.length > 0) {
            this.waterTornadoes.forEach(t => {
                ctx.save();
                ctx.translate(t.x, t.y);
                ctx.rotate(t.rotation);

                // Tornado spiral effect
                for (let i = 0; i < 5; i++) {
                    const angle = (i / 5) * Math.PI * 2;
                    const dist = t.radius * (0.3 + i * 0.15);
                    const alpha = 0.3 + (i * 0.1);

                    ctx.beginPath();
                    ctx.arc(Math.cos(angle) * dist * 0.5, Math.sin(angle) * dist * 0.5, t.radius * (0.8 - i * 0.1), 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(0, 200, 255, ${alpha})`;
                    ctx.lineWidth = 3;
                    ctx.stroke();
                }

                // Center swirl
                ctx.beginPath();
                ctx.arc(0, 0, t.radius * 0.3, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 220, 255, 0.5)';
                ctx.fill();

                // Pull radius indicator
                ctx.beginPath();
                ctx.arc(0, 0, t.pullRadius, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(0, 150, 200, 0.2)';
                ctx.lineWidth = 2;
                ctx.setLineDash([10, 5]);
                ctx.stroke();

                ctx.restore();
            });
        }

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
        // Projectiles (Fireballs) - Single sprite
        this.projectiles.forEach(p => {
            const fireballSprite = SPRITE_CACHE['fireball'];
            if (fireballSprite) {
                ctx.save();
                ctx.translate(p.x, p.y);
                // Rotate fireball based on direction
                const angle = Math.atan2(p.vy, p.vx);
                ctx.rotate(angle);
                const size = p.radius * 5; // Fireball sprite sizing
                ctx.drawImage(fireballSprite, -size / 2, -size / 2, size, size);
                ctx.restore();
            } else {
                // Fallback to circle
                ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill();
            }
        });
        // Enemies
        this.enemies.forEach(e => {
            const sx = this.player.x + (e.wx - this.worldX);
            const sy = this.player.y + (e.wy - this.worldY);
            if (sx < -200 || sx > this.canvas.width + 200 || sy < -200 || sy > this.canvas.height + 200) return;

            // Skip default circle for Consumer and Cthulhu - they have custom rendering
            if (!e.isConsumer && !e.isCthulhu) {
                // Check for custom sprite
                const spriteType = e.isBoss ? (e.type === 'general' ? 'general' : 'boss') : e.type;
                const sprite = SPRITE_CACHE[spriteType];

                if (sprite) {
                    // Draw sprite image (sprite is a canvas, not an Image)
                    ctx.save();
                    ctx.translate(sx, sy);

                    // Hit flash effect - draw white overlay
                    if (e.hitFlash > 0) {
                        ctx.globalAlpha = 0.7;
                        ctx.filter = 'brightness(3)';
                    }

                    // Draw the sprite centered and scaled to enemy radius
                    const size = e.radius * 2;
                    ctx.drawImage(sprite, -size/2, -size/2, size, size);

                    ctx.restore();
                } else {
                    // Default circular enemy rendering
                    ctx.beginPath(); ctx.arc(sx, sy, e.radius, 0, Math.PI * 2);
                    ctx.fillStyle = e.hitFlash > 0 ? '#fff' : e.color; ctx.fill();
                    // Enemy icon
                    if (e.icon) {
                        ctx.font = `${e.radius}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                        ctx.fillText(e.icon, sx, sy);
                    }
                }
            }

            // CTHULHU - Lord of the Sea custom rendering
            if (e.isCthulhu) {
                ctx.save();
                ctx.translate(sx, sy);

                // Try to use Cthulhu sprite first
                const cthulhuSprite = SPRITE_CACHE['cthulhu'];
                if (cthulhuSprite) {
                    // Hit flash effect
                    if (e.hitFlash > 0) {
                        ctx.globalAlpha = 0.7;
                        ctx.filter = 'brightness(3)';
                    }
                    const size = e.radius * 3;
                    ctx.drawImage(cthulhuSprite, -size/2, -size/2, size, size);
                } else {
                    // Fallback rendering - dark tentacle creature
                    // Outer glow
                    const glowGrad = ctx.createRadialGradient(0, 0, e.radius * 0.5, 0, 0, e.radius * 1.5);
                    glowGrad.addColorStop(0, 'rgba(0, 100, 80, 0.8)');
                    glowGrad.addColorStop(0.5, 'rgba(0, 60, 60, 0.5)');
                    glowGrad.addColorStop(1, 'rgba(0, 40, 50, 0)');
                    ctx.beginPath();
                    ctx.arc(0, 0, e.radius * 1.5, 0, Math.PI * 2);
                    ctx.fillStyle = glowGrad;
                    ctx.fill();

                    // Tentacles
                    e.tentaclePhase = (e.tentaclePhase || 0) + 0.02;
                    for (let i = 0; i < 8; i++) {
                        const angle = (i / 8) * Math.PI * 2 + e.tentaclePhase;
                        const tentLen = e.radius * (1.2 + Math.sin(e.tentaclePhase + i) * 0.3);
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.quadraticCurveTo(
                            Math.cos(angle + 0.3) * tentLen * 0.5,
                            Math.sin(angle + 0.3) * tentLen * 0.5,
                            Math.cos(angle) * tentLen,
                            Math.sin(angle) * tentLen
                        );
                        ctx.strokeStyle = e.hitFlash > 0 ? '#fff' : '#006644';
                        ctx.lineWidth = 8;
                        ctx.lineCap = 'round';
                        ctx.stroke();
                    }

                    // Main body
                    ctx.beginPath();
                    ctx.arc(0, 0, e.radius * 0.7, 0, Math.PI * 2);
                    const bodyGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, e.radius * 0.7);
                    bodyGrad.addColorStop(0, e.hitFlash > 0 ? '#fff' : '#005544');
                    bodyGrad.addColorStop(1, e.hitFlash > 0 ? '#fff' : '#002222');
                    ctx.fillStyle = bodyGrad;
                    ctx.fill();

                    // Eyes
                    ctx.fillStyle = '#ff0044';
                    ctx.beginPath();
                    ctx.arc(-e.radius * 0.25, -e.radius * 0.1, e.radius * 0.12, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(e.radius * 0.25, -e.radius * 0.1, e.radius * 0.12, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.restore();

                // Cthulhu name and HP bar
                ctx.font = 'bold 18px Inter';
                ctx.fillStyle = '#00ffaa';
                ctx.textAlign = 'center';
                ctx.fillText('🐙 ' + e.name + ' 🐙', sx, sy - e.radius - 50);

                // HP bar
                const bw = e.radius * 3;
                ctx.fillStyle = '#222';
                ctx.fillRect(sx - bw / 2, sy - e.radius - 35, bw, 14);
                const hpGrad = ctx.createLinearGradient(sx - bw / 2, 0, sx + bw / 2, 0);
                hpGrad.addColorStop(0, '#00ffaa');
                hpGrad.addColorStop(0.5, '#00ddff');
                hpGrad.addColorStop(1, '#0088ff');
                ctx.fillStyle = hpGrad;
                ctx.fillRect(sx - bw / 2 + 2, sy - e.radius - 33, (bw - 4) * (e.health / e.maxHealth), 10);

                // HP text
                ctx.font = '10px Inter';
                ctx.fillStyle = '#fff';
                ctx.fillText(`${Math.floor(e.health)} / ${e.maxHealth}`, sx, sy - e.radius - 25);
            }

            if (e.isConsumer) {
                // THE CONSUMER - Clean dark void design (no flickering)
                ctx.save();
                ctx.translate(sx, sy);

                // Simple dark core with subtle glow
                const coreRadius = e.radius;

                // Outer dark ring (static, no animation)
                ctx.beginPath();
                ctx.arc(0, 0, coreRadius * 1.2, 0, Math.PI * 2);
                const outerGrad = ctx.createRadialGradient(0, 0, coreRadius * 0.8, 0, 0, coreRadius * 1.2);
                outerGrad.addColorStop(0, 'rgba(20, 0, 40, 0.9)');
                outerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = outerGrad;
                ctx.fill();

                // Main dark core
                ctx.beginPath();
                ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
                const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreRadius);
                coreGrad.addColorStop(0, '#000000');
                coreGrad.addColorStop(0.5, '#0a0015');
                coreGrad.addColorStop(0.9, '#1a0030');
                coreGrad.addColorStop(1, e.hitFlash > 0 ? '#ffffff' : '#2a0050');
                ctx.fillStyle = coreGrad;
                ctx.fill();

                // Evil eye in center
                const eyeSize = coreRadius * 0.4;
                ctx.beginPath();
                ctx.ellipse(0, 0, eyeSize, eyeSize * 0.4, 0, 0, Math.PI * 2);
                ctx.fillStyle = '#cc0044';
                ctx.fill();

                // Pupil - follows player direction
                const playerDx = this.worldX - e.wx;
                const playerDy = this.worldY - e.wy;
                const playerDist = Math.sqrt(playerDx * playerDx + playerDy * playerDy);
                const pupilOffset = Math.min(eyeSize * 0.3, playerDist * 0.05);
                const pupilX = playerDist > 0 ? (playerDx / playerDist) * pupilOffset : 0;
                const pupilY = playerDist > 0 ? (playerDy / playerDist) * pupilOffset * 0.4 : 0;

                ctx.beginPath();
                ctx.ellipse(pupilX, pupilY, eyeSize * 0.25, eyeSize * 0.15, 0, 0, Math.PI * 2);
                ctx.fillStyle = '#000';
                ctx.fill();

                // Inner highlight
                ctx.beginPath();
                ctx.arc(pupilX - eyeSize * 0.1, pupilY - eyeSize * 0.05, eyeSize * 0.08, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.fill();

                // Simple consume radius indicator (dashed line, no animation)
                ctx.beginPath();
                ctx.arc(0, 0, e.consumeRadius, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(100, 0, 50, 0.3)';
                ctx.lineWidth = 2;
                ctx.setLineDash([10, 8]);
                ctx.stroke();
                ctx.setLineDash([]);

                ctx.restore();

                // Name and HP bar (outside save/restore)
                ctx.font = 'bold 16px Inter'; ctx.fillStyle = '#ff0066'; ctx.textAlign = 'center';
                ctx.fillText('⚫ ' + e.name + ' ⚫', sx, sy - e.radius - 45);
                ctx.font = '11px Inter'; ctx.fillStyle = '#cc88ff';
                ctx.fillText(`Souls Consumed: ${e.consumedCount}`, sx, sy - e.radius - 30);
                // Time remaining
                if (e.lifeTimer !== undefined) {
                    const timeLeft = Math.ceil(e.maxLifeTime - e.lifeTimer);
                    const timeColor = timeLeft <= 10 ? '#ff0000' : (timeLeft <= 30 ? '#ff8800' : '#888');
                    ctx.font = '10px Inter'; ctx.fillStyle = timeColor;
                    ctx.fillText(`Detonates in: ${timeLeft}s`, sx, sy - e.radius - 18);
                }
                const bw = e.radius * 2.5;
                ctx.fillStyle = '#222'; ctx.fillRect(sx - bw / 2, sy - e.radius - 8, bw, 10);
                ctx.fillStyle = '#333'; ctx.fillRect(sx - bw / 2 + 1, sy - e.radius - 7, bw - 2, 8);
                const hpGrad = ctx.createLinearGradient(sx - bw / 2, 0, sx + bw / 2, 0);
                hpGrad.addColorStop(0, '#8800ff');
                hpGrad.addColorStop(0.5, '#cc00aa');
                hpGrad.addColorStop(1, '#ff0066');
                ctx.fillStyle = hpGrad;
                ctx.fillRect(sx - bw / 2 + 1, sy - e.radius - 7, (bw - 2) * (e.health / e.maxHealth), 8);
            } else if (e.isBoss) {
                // Boss name (no emoji on the boss itself - sprites handle visuals)
                ctx.font = 'bold 12px Inter'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
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

        // Soul Collectors
        this.soulCollectors.forEach(sc => {
            const sx = this.player.x + (sc.wx - this.worldX);
            const sy = this.player.y + (sc.wy - this.worldY);

            // Collection radius indicator (dashed circle)
            ctx.beginPath();
            ctx.arc(sx, sy, sc.radius, 0, Math.PI * 2);
            ctx.setLineDash([10, 10]);
            ctx.strokeStyle = sc.complete ? '#00ff88' : 'rgba(136, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.setLineDash([]);

            // Progress ring
            if (!sc.complete && sc.soulsCollected > 0) {
                const progress = sc.soulsCollected / sc.soulsRequired;
                ctx.beginPath();
                ctx.arc(sx, sy, 40, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
                ctx.strokeStyle = '#00ffff';
                ctx.lineWidth = 6;
                ctx.stroke();
            }

            // Soul Collector icon (sprite or fallback)
            const spriteKey = sc.complete ? 'soul_collector_complete' : 'soul_collector_collecting';
            const sprite = SPRITE_CACHE[spriteKey];
            if (sprite) {
                const iconSize = sc.complete ? 64 : 48;
                ctx.drawImage(sprite, sx - iconSize/2, sy - iconSize/2, iconSize, iconSize);
            } else {
                // Fallback emoji
                ctx.font = sc.complete ? '40px Arial' : '32px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = sc.complete ? '#00ff88' : '#88ffff';
                ctx.fillText(sc.complete ? '✨' : '💀', sx, sy);
            }

            // Soul count UI (only if not complete)
            if (!sc.complete) {
                ctx.font = 'bold 14px Inter';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#fff';
                ctx.fillText(`${sc.soulsCollected}/${sc.soulsRequired}`, sx, sy + 40);

                // "KILL NEARBY" hint
                ctx.font = '10px Inter';
                ctx.fillStyle = '#88ffff';
                ctx.fillText('KILL NEARBY', sx, sy + 52);
            }
        });

        // Elemental Skulls
        this.skulls.forEach(s => {
            const sx = this.player.x + Math.cos(s.angle) * s.radius;
            const sy = this.player.y + Math.sin(s.angle) * s.radius;

            // Try to use skull sprite
            const skullSprite = SPRITE_CACHE['skull_' + s.element];
            if (skullSprite) {
                ctx.save();
                ctx.translate(sx, sy);
                // Add glow effect based on element
                ctx.shadowBlur = 15;
                ctx.shadowColor = s.color;
                const size = s.size * 2;
                ctx.drawImage(skullSprite, -size / 2, -size / 2, size, size);
                ctx.shadowBlur = 0;
                ctx.restore();
            } else {
                // Fallback to circle with skull emoji
                ctx.beginPath(); ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
                ctx.fillStyle = s.color; ctx.shadowBlur = 10; ctx.shadowColor = s.color; ctx.fill(); ctx.shadowBlur = 0;
                ctx.font = `${s.size}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillStyle = '#fff';
                ctx.fillText('💀', sx, sy);
            }
        });
        // Minions (Wolf Pack) - Using single sprite files
        this.minions.forEach((m, idx) => {
            // Determine which sprite to use based on wolf state
            const isAttacking = m.attackCooldown > 0.5;
            const isMoving = m.lastX !== undefined && (Math.abs(m.x - m.lastX) > 0.5 || Math.abs(m.y - m.lastY) > 0.5);

            let spriteKey;
            if (isAttacking) {
                spriteKey = 'wolf_biting';
            } else if (isMoving) {
                // Alternate between running1 and running2 for animation
                if (!m.runTimer) m.runTimer = 0;
                m.runTimer += 0.016;
                if (m.runTimer >= ANIM_SPEED) {
                    m.runTimer = 0;
                    m.runFrame = (m.runFrame || 0) === 0 ? 1 : 0;
                }
                spriteKey = m.runFrame === 0 ? 'wolf_running1' : 'wolf_running2';
            } else {
                spriteKey = 'wolf_standing';
            }

            // Store position for movement detection
            m.lastX = m.x; m.lastY = m.y;

            const wolfSprite = SPRITE_CACHE[spriteKey];
            if (wolfSprite) {
                ctx.save();
                ctx.translate(m.x, m.y);
                const size = m.radius * 4; // Wolf sprite sizing
                ctx.drawImage(wolfSprite, -size / 2, -size / 2, size, size);
                ctx.restore();
            } else {
                // Fallback to circle
                ctx.beginPath(); ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
                ctx.fillStyle = m.color; ctx.fill();
                ctx.font = `${m.radius + 4}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(m.icon, m.x, m.y);
            }

            // Draw green health bar above wolf
            const barWidth = m.radius * 3;
            const barHeight = 4;
            const barY = m.y - m.radius * 2.5;
            const healthPercent = m.health / m.maxHealth;

            // Background (dark)
            ctx.fillStyle = '#333';
            ctx.fillRect(m.x - barWidth / 2, barY, barWidth, barHeight);

            // Health (green gradient based on health)
            const healthColor = healthPercent > 0.5 ? '#22c55e' : healthPercent > 0.25 ? '#eab308' : '#ef4444';
            ctx.fillStyle = healthColor;
            ctx.fillRect(m.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);

            // Border
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.strokeRect(m.x - barWidth / 2, barY, barWidth, barHeight);
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

        // Aura Fire Circle (augment) - Rotating sprite ring
        if (this.auraFire) {
            ctx.save();
            const auraRadius = this.auraFire.radius;
            const ringSprite = SPRITE_CACHE['ringoffire'];

            if (ringSprite) {
                // Draw rotating ring of fire sprite
                ctx.translate(this.player.x, this.player.y);

                // Slow rotation based on game time
                const rotation = this.gameTime / 500;
                ctx.rotate(rotation);

                // Size the sprite to match the aura radius (sprite covers diameter)
                const spriteSize = auraRadius * 2.2; // Slightly larger for visual impact

                // Add glow effect
                ctx.shadowBlur = 15 + this.auraFire.level * 3;
                ctx.shadowColor = `rgba(255, 100, 0, 0.8)`;

                // Draw the ring sprite centered
                ctx.drawImage(ringSprite, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);

                ctx.shadowBlur = 0;
            } else {
                // Fallback to circle rendering if sprite not loaded
                const intensity = 0.6 + Math.sin(this.gameTime / 100) * 0.2;
                ctx.shadowBlur = 15 + this.auraFire.level * 3;
                ctx.shadowColor = `rgba(255, ${100 - this.auraFire.level * 10}, 0, ${intensity})`;
                ctx.beginPath();
                ctx.arc(this.player.x, this.player.y, auraRadius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, ${150 - this.auraFire.level * 15}, 0, ${intensity})`;
                ctx.lineWidth = 3 + this.auraFire.level;
                ctx.stroke();
                ctx.shadowBlur = 0;
            }

            // Level indicator
            if (this.auraFire.level > 1) {
                ctx.font = 'bold 10px Inter';
                ctx.fillStyle = '#ff6600';
                ctx.textAlign = 'center';
                ctx.fillText(`🔥${this.auraFire.level}`, this.player.x, this.player.y - auraRadius - 8);
            }

            ctx.restore();
        }

        // Beam of Despair
        if (this.beamDespair && this.beamTargets && this.beamTargets.length > 0) {
            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Get beam color based on level (from stacking item)
            const beamColor = this.beamDespair.color || '#ffffff';
            const isEvolved = this.beamDespair.evolved;

            // Draw beams connecting player -> target1 -> target2 -> target3 etc
            let prevX = this.player.x;
            let prevY = this.player.y;

            for (let i = 0; i < this.beamTargets.length; i++) {
                const t = this.beamTargets[i];

                // Evolved rainbow effect - cycle colors per chain
                let chainColor = beamColor;
                if (isEvolved) {
                    const colorIndex = (Math.floor(this.gameTime / 100) + i) % BEAM_DESPAIR_COLORS.length;
                    chainColor = BEAM_DESPAIR_COLORS[colorIndex];
                }

                // Main beam line with dynamic color
                ctx.beginPath();
                ctx.moveTo(prevX, prevY);
                ctx.lineTo(t.sx, t.sy);

                // Core with glow - use beam color
                ctx.strokeStyle = chainColor;
                ctx.lineWidth = 4;
                ctx.shadowBlur = 25;
                ctx.shadowColor = chainColor;
                ctx.stroke();

                // Inner bright core
                ctx.beginPath();
                ctx.moveTo(prevX, prevY);
                ctx.lineTo(t.sx, t.sy);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Pulsing outer glow
                const pulse = Math.sin(this.gameTime / 50) * 0.3 + 0.7;
                ctx.globalAlpha = pulse;
                ctx.beginPath();
                ctx.moveTo(prevX, prevY);
                ctx.lineTo(t.sx, t.sy);
                ctx.strokeStyle = chainColor;
                ctx.lineWidth = 8;
                ctx.stroke();
                ctx.globalAlpha = 1;

                // Draw target indicator circle with beam color
                ctx.beginPath();
                ctx.arc(t.sx, t.sy, t.enemy.radius + 5, 0, Math.PI * 2);
                ctx.strokeStyle = chainColor;
                ctx.lineWidth = 2;
                ctx.stroke();

                prevX = t.sx;
                prevY = t.sy;
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

        // Damage numbers (UI - not scaled) - with stacking visual effects
        this.damageNumbers.forEach(d => {
            // Base font size - smaller for regular damage
            let fontSize = Math.floor(14 * (d.scale || 1));

            // Pulse effect when damage is added (reduced intensity)
            if (d.pulseTimer > 0) {
                const pulse = 1 + (d.pulseTimer / 0.15) * 0.15; // Reduced from 0.3 to 0.15
                fontSize = Math.floor(fontSize * pulse);
            }

            // Scale based on stack count - much more limited scaling
            if (d.stackCount > 1) {
                fontSize = Math.floor(fontSize * (1 + Math.min(d.stackCount * 0.02, 0.2))); // Reduced from 0.05/0.5 to 0.02/0.2
            }

            // Cap maximum font size to prevent screen-covering numbers
            fontSize = Math.min(fontSize, 28);

            ctx.font = `bold ${fontSize}px Inter`;
            ctx.textAlign = 'center';

            // For stacked numbers, add subtle glow effect
            if (d.stackCount > 3) {
                ctx.shadowBlur = Math.min(8, 4 + d.stackCount * 0.5); // Capped glow
                ctx.shadowColor = d.color;
            }

            // Outline for readability
            ctx.globalAlpha = Math.min(1, d.lifetime * 1.5);
            ctx.strokeStyle = 'rgba(0,0,0,0.8)';
            ctx.lineWidth = 2; // Reduced from 3

            // Format large numbers (1000+ = 1.0k)
            let displayValue = d.value;
            if (typeof d.value === 'number' && d.value >= 1000) {
                displayValue = (d.value / 1000).toFixed(1) + 'k';
            }

            ctx.strokeText(displayValue, d.x, d.y);
            ctx.fillStyle = d.color;
            ctx.fillText(displayValue, d.x, d.y);

            // Reset effects
            ctx.shadowBlur = 0;
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

            // Try to use sprite, fallback to emoji
            const sprite = SPRITE_CACHE[p.spriteKey];

            if (has) {
                ctx.strokeStyle = '#ff0044';
                ctx.strokeRect(px, y + 5, 30, 40);
                // Glow
                ctx.shadowBlur = 10; ctx.shadowColor = '#ff0044';
                ctx.strokeRect(px, y + 5, 30, 40);
                ctx.shadowBlur = 0;

                if (sprite) {
                    ctx.drawImage(sprite, px + 2, y + 8, 26, 34);
                } else {
                    ctx.font = '20px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillStyle = '#fff';
                    ctx.fillText(p.icon, px + 15, y + 32);
                }
            } else {
                ctx.strokeStyle = '#333';
                ctx.strokeRect(px, y + 5, 30, 40);

                if (sprite) {
                    ctx.globalAlpha = 0.3;
                    ctx.drawImage(sprite, px + 2, y + 8, 26, 34);
                    ctx.globalAlpha = 1;
                } else {
                    ctx.font = '20px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillStyle = '#444';
                    ctx.fillText(p.icon, px + 15, y + 32);
                }
            }
        });

        // Set Bonus text
        if (this.demonSetBonusActive) {
            ctx.font = 'bold 10px Inter';
            ctx.fillStyle = '#ff0044';
            ctx.textAlign = 'center';
            ctx.fillText('HELLFIRE ACTIVE', x + 60, y + 62);
        }

        // Ocean Set display (below Demon Set)
        const oceanY = y + 75;
        const hasAnyOcean = this.oceanSet && (this.oceanSet.crown || this.oceanSet.trident || this.oceanSet.scales);
        if (hasAnyOcean || this.cthulhuSpawned || this.cthulhuWarning) {
            ctx.fillStyle = 'rgba(0,40,60,0.5)';
            ctx.fillRect(x, oceanY, 120, 50);
            ctx.strokeStyle = '#006688';
            ctx.strokeRect(x, oceanY, 120, 50);

            OCEAN_SET_PIECES.forEach((p, i) => {
                const has = this.oceanSet && this.oceanSet[p.id];
                const px = x + 10 + i * 35;
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                if (has) {
                    ctx.fillStyle = '#fff';
                    ctx.fillText(p.icon, px + 15, oceanY + 32);
                    ctx.strokeStyle = '#00ffaa';
                    ctx.strokeRect(px, oceanY + 5, 30, 40);
                    // Glow
                    ctx.shadowBlur = 10; ctx.shadowColor = '#00ffaa';
                    ctx.strokeRect(px, oceanY + 5, 30, 40);
                    ctx.shadowBlur = 0;
                } else {
                    ctx.fillStyle = '#335';
                    ctx.fillText(p.icon, px + 15, oceanY + 32);
                    ctx.strokeStyle = '#224';
                    ctx.strokeRect(px, oceanY + 5, 30, 40);
                }
            });

            // Set Bonus text
            if (this.oceanSetBonusActive) {
                ctx.font = 'bold 10px Inter';
                ctx.fillStyle = '#00ffaa';
                ctx.textAlign = 'center';
                ctx.fillText('OCEAN KING ACTIVE', x + 60, oceanY + 62);
            }
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

        // Determine which level sprite to use based on player level
        const level = p.level || 1;
        let levelSpriteKey;
        if (level >= 30) levelSpriteKey = 'player_level30';
        else if (level >= 25) levelSpriteKey = 'player_level25';
        else if (level >= 20) levelSpriteKey = 'player_level20';
        else if (level >= 15) levelSpriteKey = 'player_level15';
        else if (level >= 10) levelSpriteKey = 'player_level10';
        else if (level >= 5) levelSpriteKey = 'player_level5';
        else levelSpriteKey = 'player_level1';

        // Get the level-based sprite
        const playerSprite = SPRITE_CACHE[levelSpriteKey];

        if (playerSprite) {
            ctx.save();
            ctx.translate(p.x, p.y);
            const size = p.radius * 4; // Mage sprite display size
            ctx.drawImage(playerSprite, -size / 2, -size / 2, size, size);
            ctx.restore();
        } else {
            // Fallback to circle
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius + 8, 0, Math.PI * 2); ctx.fillStyle = `${p.color}33`; ctx.fill();
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill();
            ctx.beginPath(); ctx.arc(p.x - 3, p.y - 3, p.radius * 0.4, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fill();
            ctx.font = '14px Arial'; ctx.fillText(this.selectedClass.icon, p.x - 7, p.y + 5);
        }
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

            // Check for sprite-based item (Beam of Despair)
            const spriteKey = isEvolved ? item.spriteEvolved : item.spriteBase;
            const hasSprite = item.hasSprite && SPRITE_CACHE[spriteKey];

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

                // Icon and stack count - use sprite if available
                if (hasSprite) {
                    ctx.drawImage(SPRITE_CACHE[spriteKey], 12, y + 3, 24, 24);
                } else {
                    ctx.font = '16px Inter'; ctx.fillStyle = color; ctx.textAlign = 'center';
                    ctx.fillText(icon, 25, y + 18);
                }
                ctx.font = 'bold 8px Inter'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
                ctx.fillText(isEvolved ? '★' : stacksFormatted, 50, y + 18);

                if (isEvolved) {
                    ctx.strokeStyle = '#ff6b00'; ctx.lineWidth = 2;
                    ctx.strokeRect(10, y, 55, 30);
                }
                y += 38;
                } else {
                // Desktop view - compact without name
                const boxWidth = 90;
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(10, y, boxWidth, 28);

                // Progress bar
                ctx.fillStyle = 'rgba(255,255,255,0.1)';
                ctx.fillRect(10, y + 24, boxWidth, 4);
                ctx.fillStyle = isEvolved ? '#ff6b00' : '#fbbf24';
                ctx.fillRect(10, y + 24, boxWidth * progress, 4);

                // Icon - use sprite if available
                if (hasSprite) {
                    ctx.drawImage(SPRITE_CACHE[spriteKey], 12, y + 2, 22, 22);
                } else {
                    ctx.font = '14px Inter'; ctx.fillStyle = color; ctx.textAlign = 'left';
                    ctx.fillText(icon, 15, y + 17);
                }

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
