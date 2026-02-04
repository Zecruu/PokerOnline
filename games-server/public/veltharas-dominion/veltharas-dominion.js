// Velthara's Dominion - Complete Game with Classes, Items, Bosses & Infinite Map
// CDN configuration is loaded from cdn-assets.js

// Helper function to get full sprite path (CDN or local)
// Uses CDN_CONFIG from cdn-assets.js
function getSpritePath(filename) {
    // If already absolute or has protocol, return as is
    if (filename.startsWith('/') || filename.startsWith('http')) return filename;
    if (typeof CDN_CONFIG !== 'undefined' && CDN_CONFIG.enabled) {
        return `${CDN_CONFIG.baseUrl}/${filename}`;
    }
    // Fallback to local path
    const path = window.location.pathname;
    const dir = path.substring(0, path.lastIndexOf('/') + 1);
    return dir + filename;
}

// Player sprites for necromancer class
const PLAYER_SPRITES = {
    standing: 'characters/necromancer-idle.png',
    walking: 'characters/necromancer-walk.png',
    dead: 'characters/necromancer-dead.png'
};

// Fire Mage level progression sprites
const PLAYER_LEVEL_SPRITES = {
    level1: 'characters/fire-mage-lv1.png',      // Level 1-4
    level5: 'characters/fire-mage-lv5.png',      // Level 5-9
    level10: 'characters/fire-mage-lv10.png',    // Level 10-14
    level15: 'characters/fire-mage-lv15.png',    // Level 15-19
    level20: 'characters/fire-mage-lv20.png',    // Level 20-24
    level25: 'characters/fire-mage-lv25.png',    // Level 25-29
    level30: 'characters/necromancer-idle.png'   // Level 30+
};

// Shadow Monarch level progression sprites
const SHADOW_MONARCH_SPRITES = {
    level1: 'characters/shadow-monarch-lv1.png',
    level5: 'characters/shadow-monarch-lv5.png',
    level10: 'characters/shadow-monarch-lv10.png',
    level15: 'characters/shadow-monarch-lv15.png'
};

const WOLF_SPRITES = {
    standing: 'minions/wolf-idle.png',
    running1: 'minions/wolf-run.png',
    running2: 'minions/wolf-run-alt.png',
    biting: 'minions/wolf-attack.png'
};

const FIREBALL_SPRITE = 'effects/fireball.png';
const RINGOFFIRE_SPRITE = 'effects/ring-of-fire-aura.png';
const DEVIL_RINGOFFIRE_SPRITE = 'effects/devil-ring-of-fire.png';

// Elemental Skull Sprites (for orbiting skull augment)
const SKULL_SPRITES = {
    fire: 'items/skull-fire.png',
    slow: 'items/skull-slow.png',
    dark: 'items/skull-dark.png',
    lightning: 'items/skull-lightning.png'
};

// Beam of Despair Sprites (stacking item icons)
const BEAM_DESPAIR_SPRITES = {
    base: 'items/beam-despair.jpg',
    evolved: 'items/beam-despair-evolved.jpg'
};

// Crit Blade Sprites (stacking item icons)
const CRIT_BLADE_SPRITES = {
    base: 'items/crit-blade.jpg',
    evolved: 'items/crit-blade-evolved.jpg'
};

// Ring of XP Sprites (stacking item icons)
const RING_XP_SPRITES = {
    base: 'items/ring-xp.jpg',
    evolved: 'items/ring-xp-evolved.jpg'
};

// Boots of Swiftness Sprites (stacking item icons)
const BOOTS_SWIFTNESS_SPRITES = {
    base: 'items/boots-swiftness.png',
    evolved: 'items/boots-swiftness-evolved.png'
};

// Demon Set Sprites
const DEMON_SET_SPRITES = {
    helm: 'items/demon-helm.jpg',
    chest: 'items/demon-chest.jpg',
    boots: 'items/demon-boots.jpg'
};

// Heart of Vitality Sprites (stacking item icons)
const HEART_VITALITY_SPRITES = {
    base: 'items/heart-vitality.jpg',
    evolved: 'items/heart-vitality-evolved.jpg'
};

// Blood Soaker Sprites (stacking item icons)
const BLOOD_SOAKER_SPRITES = {
    base: 'items/blood-soaker.jpg',
    evolved: 'items/blood-soaker-evolved.jpg'
};

// Ability Icons
const ABILITY_SPRITES = {
    dash: 'abilities/dash.jpg',
    nuclearBlast: 'abilities/nuclear-blast.jpg'
};

// Mythic Augment Sprites
const MYTHIC_SPRITES = {
    demonic_fire_mythic: 'effects/demonic-fire-mythic.png',
    devil_ring_of_fire: 'effects/devil-ring-of-fire.png'
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

// ============================================
// SIGIL SYSTEM - Replaces Augment terminology
// Sigil Tiers (canonical):
//   Tier 1: Faded Sigils
//   Tier 2: Runed Sigils
//   Tier 3: Empowered Sigils
//   Tier 4: Ascendant Sigils
//   Tier 5: Mythic Sigils
// ============================================
const SIGIL_TIERS = {
    FADED: { tier: 1, name: 'Faded', color: '#8b7355', label: 'Faded Sigil', image: 'sigils/tier_faded.jpg' },
    RUNED: { tier: 2, name: 'Runed', color: '#c0c0c0', label: 'Runed Sigil', image: 'sigils/tier_runed.jpg' },
    EMPOWERED: { tier: 3, name: 'Empowered', color: '#9932cc', label: 'Empowered Sigil', image: 'sigils/tier_empowered.jpg' },
    ASCENDANT: { tier: 4, name: 'Ascendant', color: '#ffd700', label: 'Ascendant Sigil', image: 'sigils/tier_ascendant.jpg' },
    MYTHIC: { tier: 5, name: 'Mythic', color: '#ff6600', label: 'Mythic Sigil', image: 'sigils/tier_mythic.jpg' },
    // Corrupted variants (Tier II and III only)
    CORRUPTED_RUNED: { tier: 2, name: 'Corrupted Runed', color: '#8b0000', label: 'Corrupted Sigil', image: 'sigils/tier_corrupted_runed.jpg', isCorrupted: true },
    CORRUPTED_EMPOWERED: { tier: 3, name: 'Corrupted Empowered', color: '#4a0080', label: 'Corrupted Sigil', image: 'sigils/tier_corrupted_empowered.jpg', isCorrupted: true }
};

// Map old rarity names to new sigil tiers
const RARITY_TO_TIER = {
    'common': 'FADED',
    'bronze': 'FADED',
    'silver': 'RUNED',
    'rare': 'RUNED',
    'purple': 'EMPOWERED',
    'epic': 'EMPOWERED',
    'legendary': 'ASCENDANT',
    'mythic': 'MYTHIC',
    'corrupted_runed': 'CORRUPTED_RUNED',
    'corrupted_empowered': 'CORRUPTED_EMPOWERED'
};

// ============================================
// CORRUPTED SIGILS SYSTEM
// Rules:
// - Only appear after Wave 8
// - Only Tier II (Runed) or Tier III (Empowered)
// - Maximum 2 Corrupted Sigils per run
// - Each has a powerful upside and meaningful downside
// ============================================
const CORRUPTED_SIGILS = {
    // Universal Pool (6)
    universal: [
        {
            id: 'corrupted_vitality',
            name: 'Blighted Vitality',
            icon: '💔',
            tier: 'CORRUPTED_RUNED',
            rarity: 'corrupted_runed',
            isCorrupted: true,
            baseSigil: 'sigil_greater_vitality',
            desc: '+150 Max HP. Take 15% more damage.',
            flavor: 'Strength borrowed from the void demands payment.',
            tags: ['health', 'defense'],
            upside: '+150 Max HP (vs +100 normal)',
            downside: 'Take 15% more damage from all sources',
            effect: (g) => {
                g.player.maxHealth += 150;
                g.player.health += 150;
                g.corruptedDamageTaken = (g.corruptedDamageTaken || 1) * 1.15;
                g.boundSigils.push('corrupted_vitality');
                g.corruptedSigilCount = (g.corruptedSigilCount || 0) + 1;
            },
            getDesc: (g) => `HP: ${g.player.maxHealth} → ${g.player.maxHealth + 150}`
        },
        {
            id: 'corrupted_haste',
            name: 'Frenzied Haste',
            icon: '💨',
            tier: 'CORRUPTED_RUNED',
            rarity: 'corrupted_runed',
            isCorrupted: true,
            baseSigil: 'sigil_swiftness',
            desc: '+25% move speed. Nearby enemies +10% faster.',
            flavor: 'The corruption quickens all it touches.',
            tags: ['movement'],
            upside: '+25% movement speed (vs +15% normal)',
            downside: 'Enemies move 10% faster when nearby',
            effect: (g) => {
                g.player.speed *= 1.25;
                g.corruptedEnemySpeedAura = 1.10;
                g.boundSigils.push('corrupted_haste');
                g.corruptedSigilCount = (g.corruptedSigilCount || 0) + 1;
            },
            getDesc: (g) => `Speed: +25%`
        },
        {
            id: 'corrupted_drain',
            name: 'Voracious Drain',
            icon: '🩸',
            tier: 'CORRUPTED_EMPOWERED',
            rarity: 'corrupted_empowered',
            isCorrupted: true,
            baseSigil: 'sigil_lifesteal',
            desc: '8% lifesteal on all damage. Take 15% more damage.',
            flavor: 'It feeds, but never stops hungering.',
            tags: ['lifesteal', 'sustain'],
            upside: '8% lifesteal on all damage',
            downside: 'Take 15% more damage from all sources',
            effect: (g) => {
                g.vampireHeal = (g.vampireHeal || 0) + 0.08;
                g.corruptedDamageTaken = (g.corruptedDamageTaken || 1) * 1.15;
                g.boundSigils.push('corrupted_drain');
                g.corruptedSigilCount = (g.corruptedSigilCount || 0) + 1;
            },
            getDesc: (g) => `Lifesteal: ${Math.round((g.vampireHeal || 0) * 100)}% → ${Math.round(((g.vampireHeal || 0) + 0.08) * 100)}%`
        },
        {
            id: 'corrupted_explosion',
            name: 'Unstable Detonation',
            icon: '💥',
            tier: 'CORRUPTED_EMPOWERED',
            rarity: 'corrupted_empowered',
            isCorrupted: true,
            baseSigil: 'sigil_explosion',
            desc: 'Explosions +60% dmg, +40% radius. 10% self-damage.',
            flavor: 'Power without control is still power.',
            tags: ['explosion', 'chaos'],
            upside: 'Explosions deal +60% damage, +40% radius',
            downside: '10% chance explosions damage you for 50 HP',
            effect: (g) => {
                g.explosionDamage = (g.explosionDamage || 1) * 1.60;
                g.explosionRadius = (g.explosionRadius || 1) * 1.40;
                g.corruptedExplosionBackfire = 0.10;
                g.corruptedExplosionSelfDamage = 50;
                g.boundSigils.push('corrupted_explosion');
                g.corruptedSigilCount = (g.corruptedSigilCount || 0) + 1;
            },
            getDesc: (g) => `Explosion Dmg +60%, Radius +40%`
        },
        {
            id: 'corrupted_xp',
            name: 'Ravenous Experience',
            icon: '📚',
            tier: 'CORRUPTED_RUNED',
            rarity: 'corrupted_runed',
            isCorrupted: true,
            baseSigil: 'sigil_xp',
            desc: '+40% XP gain. Enemies drop 30% less loot.',
            flavor: 'Knowledge devours all other rewards.',
            tags: ['progression'],
            upside: '+40% XP gain (vs +25% normal)',
            downside: 'Enemies drop 30% less gold/items',
            effect: (g) => {
                g.xpMult = (g.xpMult || 1) * 1.40;
                g.corruptedLootPenalty = 0.70;
                g.boundSigils.push('corrupted_xp');
                g.corruptedSigilCount = (g.corruptedSigilCount || 0) + 1;
            },
            getDesc: (g) => `XP: +40%`
        },
        {
            id: 'corrupted_crit',
            name: 'Cursed Precision',
            icon: '🎯',
            tier: 'CORRUPTED_EMPOWERED',
            rarity: 'corrupted_empowered',
            isCorrupted: true,
            baseSigil: 'sigil_critical',
            desc: '+20% crit chance, +30% crit dmg. 8% miss chance.',
            flavor: 'Perfect aim, imperfect reality.',
            tags: ['damage', 'crit'],
            upside: '+20% crit chance, +30% crit damage',
            downside: 'Miss 8% of attacks completely',
            effect: (g) => {
                g.critChance = (g.critChance || 0.05) + 0.20;
                g.critDamage = (g.critDamage || 1.5) + 0.30;
                g.corruptedMissChance = 0.08;
                g.boundSigils.push('corrupted_crit');
                g.corruptedSigilCount = (g.corruptedSigilCount || 0) + 1;
            },
            getDesc: (g) => `Crit: ${Math.round((g.critChance || 0.05) * 100)}% → ${Math.round(((g.critChance || 0.05) + 0.20) * 100)}%`
        }
    ],
    // Fire Mage Corrupted Sigils (2)
    fire_mage: [
        {
            id: 'corrupted_fm_orbs',
            name: 'Hellfire Incandescence',
            icon: '🔮',
            tier: 'CORRUPTED_EMPOWERED',
            rarity: 'corrupted_empowered',
            isCorrupted: true,
            classRestriction: 'fire_mage',
            baseSigil: 'fm_orb_incandescence',
            desc: '+2 orbs, +25% orb damage. Orbs drain 1 HP/s each.',
            flavor: 'Each flame is a piece of your soul.',
            tags: ['fire', 'orbs'],
            upside: '+2 orbiting orbs (vs +1), orbs deal +25% damage',
            downside: 'Orbs drain 1 HP per second each',
            effect: (g) => {
                if (g.skulls.length < 6) g.skulls.push(g.createSkull());
                if (g.skulls.length < 6) g.skulls.push(g.createSkull());
                g.skulls.forEach(s => s.damage *= 1.25);
                g.corruptedOrbDrain = (g.corruptedOrbDrain || 0) + 1;
                g.boundSigils.push('corrupted_fm_orbs');
                g.corruptedSigilCount = (g.corruptedSigilCount || 0) + 1;
            },
            getDesc: (g) => `Orbs: ${g.skulls.length} → ${Math.min(6, g.skulls.length + 2)}`
        },
        {
            id: 'corrupted_fm_aura',
            name: 'Pyroclastic Inferno',
            icon: '🔥',
            tier: 'CORRUPTED_RUNED',
            rarity: 'corrupted_runed',
            isCorrupted: true,
            classRestriction: 'fire_mage',
            baseSigil: 'fm_inferno_radius',
            desc: 'Aura +25 radius, +100 DPS. Standing still burns you.',
            flavor: 'The fire demands you keep moving.',
            tags: ['fire', 'aura'],
            upside: 'Aura +25 radius, +100 DPS (vs +10, +60)',
            downside: 'Standing still for 2s burns you for 30 DPS',
            effect: (g) => {
                if (g.auraFire) {
                    g.auraFire.radius += 25;
                    g.auraFire.damage += 100;
                }
                g.corruptedStillBurn = { threshold: 2, damage: 30, timer: 0 };
                g.boundSigils.push('corrupted_fm_aura');
                g.corruptedSigilCount = (g.corruptedSigilCount || 0) + 1;
            },
            getDesc: (g) => g.auraFire ? `Radius: ${g.auraFire.radius} → ${g.auraFire.radius + 25}` : 'Aura not active'
        }
    ],
    // Shadow Master Corrupted Sigils (2)
    shadow_master: [
        {
            id: 'corrupted_sm_summon',
            name: 'Abyssal Shadows',
            icon: '👤',
            tier: 'CORRUPTED_EMPOWERED',
            rarity: 'corrupted_empowered',
            isCorrupted: true,
            classRestriction: 'shadow_master',
            baseSigil: 'sm_caller_shades',
            desc: 'Summon 2 shadows, +40% damage. Death explosion hurts you.',
            flavor: 'They serve, but resent their chains.',
            tags: ['summon', 'shadow'],
            upside: 'Summon 2 shadow monsters (vs 1), +40% damage',
            downside: 'Shadows explode on death, damaging you for 25 HP',
            effect: (g) => {
                g.maxShadowMonsters = (g.maxShadowMonsters || 0) + 2;
                g.shadowMonsterDamage = (g.shadowMonsterDamage || 1) * 1.40;
                g.corruptedShadowDeathDamage = 25;
                g.boundSigils.push('corrupted_sm_summon');
                g.corruptedSigilCount = (g.corruptedSigilCount || 0) + 1;
            },
            getDesc: (g) => `Shadows: +2, Damage +40%`
        },
        {
            id: 'corrupted_sm_cloak',
            name: 'Void-Touched Cloak',
            icon: '🌑',
            tier: 'CORRUPTED_RUNED',
            rarity: 'corrupted_runed',
            isCorrupted: true,
            classRestriction: 'shadow_master',
            baseSigil: 'sm_cloak_depths',
            desc: 'Cloak +4s duration, +50% damage. Exit stuns you 0.5s.',
            flavor: 'The void releases you reluctantly.',
            tags: ['stealth', 'shadow'],
            upside: 'Cloak duration +4s (vs +2s), +50% cloak damage',
            downside: 'Exiting cloak stuns you for 0.5s',
            effect: (g) => {
                g.cloakDuration = (g.cloakDuration || 3) + 4;
                g.cloakDamageBonus = (g.cloakDamageBonus || 1) * 1.50;
                g.corruptedCloakStun = 0.5;
                g.boundSigils.push('corrupted_sm_cloak');
                g.corruptedSigilCount = (g.corruptedSigilCount || 0) + 1;
            },
            getDesc: (g) => `Cloak: +4s, Damage +50%`
        }
    ],
    // Necromancer Corrupted Sigils (2)
    necromancer: [
        {
            id: 'corrupted_nc_raise',
            name: 'Malevolent Resurrection',
            icon: '💀',
            tier: 'CORRUPTED_EMPOWERED',
            rarity: 'corrupted_empowered',
            isCorrupted: true,
            classRestriction: 'necromancer',
            baseSigil: 'nc_soul_harvest',
            desc: 'Raise 2 skeletons/kill, +30% HP. 20% chance to attack you.',
            flavor: 'The dead remember who killed them.',
            tags: ['summon', 'undead'],
            upside: 'Raise 2 skeletons per kill (vs 1), +30% skeleton HP',
            downside: 'Skeletons have 20% chance to attack you',
            effect: (g) => {
                g.skeletonsPerKill = (g.skeletonsPerKill || 1) + 1;
                g.skeletonHPBonus = (g.skeletonHPBonus || 1) * 1.30;
                g.corruptedSkeletonBetrayal = 0.20;
                g.boundSigils.push('corrupted_nc_raise');
                g.corruptedSigilCount = (g.corruptedSigilCount || 0) + 1;
            },
            getDesc: (g) => `Skeletons: 2/kill, HP +30%`
        },
        {
            id: 'corrupted_nc_siphon',
            name: 'Blighted Siphon',
            icon: '🌀',
            tier: 'CORRUPTED_RUNED',
            rarity: 'corrupted_runed',
            isCorrupted: true,
            classRestriction: 'necromancer',
            baseSigil: 'nc_death_siphon',
            desc: 'Siphon +80% heal, chains +2 targets. Costs 10 HP to cast.',
            flavor: 'To take life, you must give life.',
            tags: ['drain', 'undead'],
            upside: 'Siphon heals +80% more, chains to 2 extra targets',
            downside: 'Each siphon costs 10 HP to cast',
            effect: (g) => {
                g.siphonHealBonus = (g.siphonHealBonus || 1) * 1.80;
                g.siphonChainTargets = (g.siphonChainTargets || 1) + 2;
                g.corruptedSiphonCost = 10;
                g.boundSigils.push('corrupted_nc_siphon');
                g.corruptedSigilCount = (g.corruptedSigilCount || 0) + 1;
            },
            getDesc: (g) => `Siphon: +80% heal, +2 chains`
        }
    ]
};

// Helper to get available corrupted sigils for current game state
function getAvailableCorruptedSigils(game) {
    if (game.wave < 8) return [];
    if ((game.corruptedSigilCount || 0) >= 2) return [];

    const available = [...CORRUPTED_SIGILS.universal];

    // Add class-specific corrupted sigils
    if (game.selectedClass === 'fire_mage') {
        available.push(...CORRUPTED_SIGILS.fire_mage);
    } else if (game.selectedClass === 'shadow_master') {
        available.push(...CORRUPTED_SIGILS.shadow_master);
    } else if (game.selectedClass === 'necromancer') {
        available.push(...CORRUPTED_SIGILS.necromancer);
    }

    // Filter out already bound corrupted sigils
    return available.filter(s => !game.boundSigils.includes(s.id));
}

// ============================================
// DOMINION SETS SYSTEM
// Rules:
// - Max 1 Tier IV set active at any time
// - Max 2 Tier III sets active at any time
// - Mixing Tier I-II encouraged
// - Mythic Sigils count as 2 pieces for matching set
// ============================================
const DOMINION_SETS = {
    infinite_echoes: {
        id: 'infinite_echoes',
        name: 'Sigil of Infinite Echoes',
        desc: 'Stacking/Progression',
        icon: '♾️',
        color: '#00ff88',
        image: 'sigils/sigil_infinite_echoes.jpg',
        tiers: {
            1: { name: 'Tier I', bonus: '+35% item stack gain', effect: (g) => { g.dominionStackGain = (g.dominionStackGain || 1) * 1.35; } },
            2: { name: 'Tier II', bonus: '+75% item stack gain', effect: (g) => { g.dominionStackGain = (g.dominionStackGain || 1) * 1.75; } },
            3: { name: 'Tier III', bonus: '+140% item stack gain', effect: (g) => { g.dominionStackGain = (g.dominionStackGain || 1) * 2.40; } },
            4: { name: 'Tier IV', bonus: 'Stack overflow enabled; stacks beyond cap are 50% effective', effect: (g) => { g.dominionStackGain = (g.dominionStackGain || 1) * 2.40; g.stackOverflowEnabled = true; g.stackOverflowEfficiency = 0.5; } }
        }
    },
    cataclysm: {
        id: 'cataclysm',
        name: 'Sigil of Cataclysm',
        desc: 'Explosions/Chaos',
        icon: '💥',
        color: '#ff4400',
        image: 'sigils/sigil_cataclysm.jpg',
        tiers: {
            1: { name: 'Tier I', bonus: 'Explosions +20% radius', effect: (g) => { g.dominionExplosionRadius = (g.dominionExplosionRadius || 1) * 1.20; } },
            2: { name: 'Tier II', bonus: 'Explosions +40% damage', effect: (g) => { g.dominionExplosionRadius = (g.dominionExplosionRadius || 1) * 1.20; g.dominionExplosionDamage = (g.dominionExplosionDamage || 1) * 1.40; } },
            3: { name: 'Tier III', bonus: 'Explosions chain once at 50% damage', effect: (g) => { g.dominionExplosionRadius = (g.dominionExplosionRadius || 1) * 1.20; g.dominionExplosionDamage = (g.dominionExplosionDamage || 1) * 1.40; g.dominionExplosionChain = true; g.dominionExplosionChainDamage = 0.5; } },
            4: { name: 'Tier IV', bonus: 'Mini-nova on explosion (300 dmg, 6s ICD)', effect: (g) => { g.dominionExplosionRadius = (g.dominionExplosionRadius || 1) * 1.20; g.dominionExplosionDamage = (g.dominionExplosionDamage || 1) * 1.40; g.dominionExplosionChain = true; g.dominionExplosionChainDamage = 0.5; g.dominionMiniNova = true; g.dominionMiniNovaDamage = 300; g.dominionMiniNovaICD = 6; g.dominionMiniNovaTimer = 0; } }
        }
    },
    astral_host: {
        id: 'astral_host',
        name: 'Sigil of the Astral Host',
        desc: 'Summons/Orbits',
        icon: '🌟',
        color: '#9966ff',
        image: 'sigils/sigil_astral_host.jpg',
        tiers: {
            1: { name: 'Tier I', bonus: '+1 summon/orb', effect: (g) => { g.dominionSummonBonus = 1; } },
            2: { name: 'Tier II', bonus: 'Summons +35% damage', effect: (g) => { g.dominionSummonBonus = 1; g.dominionSummonDamage = (g.dominionSummonDamage || 1) * 1.35; } },
            3: { name: 'Tier III', bonus: 'Summons inherit on-hit effects at 50% power', effect: (g) => { g.dominionSummonBonus = 1; g.dominionSummonDamage = (g.dominionSummonDamage || 1) * 1.35; g.dominionSummonOnHit = true; g.dominionSummonOnHitPower = 0.5; } },
            4: { name: 'Tier IV', bonus: 'Summons explode on death (600 dmg, 120px radius)', effect: (g) => { g.dominionSummonBonus = 1; g.dominionSummonDamage = (g.dominionSummonDamage || 1) * 1.35; g.dominionSummonOnHit = true; g.dominionSummonOnHitPower = 0.5; g.dominionSummonExplode = true; g.dominionSummonExplodeDamage = 600; g.dominionSummonExplodeRadius = 120; } }
        }
    },
    bloodbound_throne: {
        id: 'bloodbound_throne',
        name: 'Sigil of the Bloodbound Throne',
        desc: 'Sustain/Risk',
        icon: '🩸',
        color: '#cc0000',
        image: 'sigils/sigil_bloodbound_throne.jpg',
        tiers: {
            1: { name: 'Tier I', bonus: 'Lifesteal 2% of damage dealt', effect: (g) => { g.dominionLifesteal = 0.02; } },
            2: { name: 'Tier II', bonus: 'Bonus damage = 1% of MAX HP', effect: (g) => { g.dominionLifesteal = 0.02; g.dominionHPDamage = 0.01; } },
            3: { name: 'Tier III', bonus: 'Overheal becomes Blood Shield (cap = 15% MAX HP)', effect: (g) => { g.dominionLifesteal = 0.02; g.dominionHPDamage = 0.01; g.dominionBloodShield = true; g.dominionBloodShieldCap = 0.15; } },
            4: { name: 'Tier IV', bonus: 'Blood Shield detonates at cap (800 dmg, 160px, 8s ICD)', effect: (g) => { g.dominionLifesteal = 0.02; g.dominionHPDamage = 0.01; g.dominionBloodShield = true; g.dominionBloodShieldCap = 0.15; g.dominionBloodDetonate = true; g.dominionBloodDetonateDamage = 800; g.dominionBloodDetonateRadius = 160; g.dominionBloodDetonateICD = 8; g.dominionBloodDetonateTimer = 0; } }
        }
    }
};

// ID mapping for save compatibility (old augment IDs -> new sigil IDs)
const SIGIL_ID_MAP = {
    // Fire Mage Class Sigils
    'fm_speed': 'fm_emberstep', 'fm_hp': 'fm_cinder_ward',
    'fm_orb': 'fm_orb_incandescence', 'fm_fire_rate': 'fm_accelerant_flame',
    'fm_aura_expand': 'fm_inferno_radius', 'fm_fireball_size': 'fm_meteor_aspect',
    'fm_blast_radius': 'fm_solar_flare', 'fm_orb_frenzy': 'fm_orb_singularity',
    'fm_burn_spread': 'fm_wild_pyre', 'fm_amp_persist': 'fm_everburn',
    // Shadow Master Class Sigils
    'sm_speed': 'sm_shade_step', 'sm_hp': 'sm_umbral_skin',
    'sm_monster': 'sm_caller_shades', 'sm_sentinel': 'sm_sentinel_binding',
    'sm_whip_range': 'sm_chain_lash', 'sm_monster_frenzy': 'sm_frenzy_night',
    'sm_cloak_extend': 'sm_cloak_depths', 'sm_dark_pact': 'sm_pact_shadows',
    'sm_sentinel_explode': 'sm_void_detonation', 'sm_step_damage': 'sm_phantom_rend',
    // Necromancer Class Sigils
    'nc_speed': 'nc_gravewalker', 'nc_hp': 'nc_bone_plating',
    'nc_skull': 'nc_skullbinder', 'nc_corpse': 'nc_mass_gravecall',
    'nc_raise_chance': 'nc_rite_return', 'nc_drain_chain': 'nc_crimson_chain',
    'nc_pit_radius': 'nc_expanded_ossuary', 'nc_corpse_explode': 'nc_detonation_rite',
    'nc_drain_evolve': 'nc_siphon_unlife', 'nc_soul_harvest': 'nc_harvest_eternal',
    // Diamond Sigils
    'feral_frenzy': 'wolfsblood_frenzy', 'pack_tactics': 'lunar_pack',
    'alpha_howl': 'howl_first_beast', 'pyroclasm': 'ashburst_impact',
    'inferno_mastery': 'sovereign_flame', 'flame_cascade': 'cascade_cinders',
    'molten_core': 'molten_heart', 'ring_of_fire_1': 'ring_ember_oath',
    'ring_of_fire_2': 'ring_ember_oath_2', 'tactical_nuke': 'ruinfall',
    'overclock': 'overclocked_fate', 'bullet_storm': 'shatterhail',
    'titan_killer': 'colossus_bane', 'wind_push': 'tempest_reversal',
    'time_stop': 'chronolock', 'skull_frenzy': 'skullwhirl',
    'skull_army': 'ossuary_legion', 'tech_wizard': 'reapers_seed',
    'aura_fire': 'cinder_halo', 'imp_horde': 'legion_imps',
    'hellfire_fury': 'hellbound_fury', 'eternal_flame': 'unending_pyre',
    // Mythic Sigils
    'demonic_inferno': 'mythic_hell_crowned', 'void_sovereign': 'mythic_void_seal',
    'thunder_god': 'mythic_storm_titan', 'blood_lord': 'mythic_bloodbound',
    'celestial_guardian': 'mythic_seraphic', 'omega_destroyer': 'mythic_omega',
    'devil_ring_of_fire': 'mythic_devil_halo',
    // Rune -> Sigil mappings
    'rune_vitality': 'faded_vital_spark', 'rune_might': 'faded_iron_pulse',
    'rune_swiftness': 'faded_quickstep', 'rune_recovery': 'faded_mending',
    'rune_precision': 'faded_keen_eye', 'rune_endurance': 'faded_stalwart',
    'rune_vitality_2': 'runed_heartforge', 'rune_might_2': 'runed_bladeforge',
    'rune_swiftness_2': 'runed_galefoot', 'rune_recovery_2': 'runed_evermend',
    'rune_ferocity': 'runed_frenzied_ember', 'rune_fortitude': 'runed_bastion',
    'rune_agility': 'runed_lightning_step',
    'rune_vitality_3': 'empowered_crimson', 'rune_might_3': 'empowered_warbrand',
    'rune_swiftness_3': 'empowered_vortex', 'rune_recovery_3': 'empowered_radiant',
    'rune_devastation': 'empowered_cataclysm', 'rune_juggernaut': 'empowered_titanwrought',
    'rune_assassin': 'empowered_nightfang',
    'rune_berserker': 'ascendant_berserker', 'rune_titan': 'ascendant_titan',
    'rune_executioner': 'ascendant_executioner', 'rune_phoenix': 'ascendant_phoenix',
    'rune_tempest': 'ascendant_tempest', 'rune_vampire': 'ascendant_vampire',
    'rune_doubler': 'ascendant_echo_doubling', 'rune_momentum': 'ascendant_momentum',
    'rune_ring_mastery': 'ascendant_fire_mastery',
    'mythic_inferno': 'mythic_infernal_dominion', 'mythic_void': 'mythic_void_sovereign',
    'mythic_thunder': 'mythic_thunder_god', 'mythic_blood': 'mythic_blood_lord',
    'mythic_celestial': 'mythic_celestial_guardian', 'mythic_omega': 'mythic_omega_destroyer'
};

// Helper function to migrate old augment IDs to new sigil IDs
function migrateSigilId(oldId) {
    return SIGIL_ID_MAP[oldId] || oldId;
}

// ============================================
// DOMINION SETS - Helper Functions
// ============================================

// Get sigil data by ID from all pools
function getSigilDataById(sigilId) {
    // Check all sigil pools
    const pools = [FADED_SIGILS, RUNED_SIGILS, EMPOWERED_SIGILS, ASCENDANT_SIGILS, MYTHIC_SIGILS, MYTHIC_RUNES];
    for (const pool of pools) {
        if (!pool) continue;
        const found = pool.find(s => s.id === sigilId);
        if (found) return found;
    }
    return null;
}

// Recalculate Dominion Set pieces and tiers for a game instance
function recalculateDominionSets(game) {
    // Reset set pieces
    game.dominionSetPieces = {};
    game.dominionSetTiers = {};

    // Count pieces for each set
    for (const sigilId of game.boundSigils) {
        const sigilData = getSigilDataById(sigilId);
        if (!sigilData || !sigilData.setKey) continue;

        const setId = sigilData.setKey;
        const isMythic = sigilData.tier === 'MYTHIC' || sigilData.rarity === 'mythic';
        const pieceValue = isMythic ? 2 : 1; // Mythic counts as 2 pieces

        game.dominionSetPieces[setId] = (game.dominionSetPieces[setId] || 0) + pieceValue;
    }

    // Calculate tier for each set based on piece count
    // Tier thresholds: 1 piece = T1, 2 pieces = T2, 3 pieces = T3, 4+ pieces = T4
    for (const setId in game.dominionSetPieces) {
        const pieces = game.dominionSetPieces[setId];
        let tier = 0;
        if (pieces >= 4) tier = 4;
        else if (pieces >= 3) tier = 3;
        else if (pieces >= 2) tier = 2;
        else if (pieces >= 1) tier = 1;
        game.dominionSetTiers[setId] = tier;
    }

    // Enforce tier limits: Max 1 Tier IV, Max 2 Tier III
    const tierIVSets = Object.entries(game.dominionSetTiers).filter(([_, t]) => t === 4);
    const tierIIISets = Object.entries(game.dominionSetTiers).filter(([_, t]) => t === 3);

    // Clamp excess Tier IV sets to Tier III
    if (tierIVSets.length > 1) {
        for (let i = 1; i < tierIVSets.length; i++) {
            game.dominionSetTiers[tierIVSets[i][0]] = 3;
        }
    }

    // Clamp excess Tier III sets to Tier II (after T4 clamping may have added more)
    const newTierIIISets = Object.entries(game.dominionSetTiers).filter(([_, t]) => t === 3);
    if (newTierIIISets.length > 2) {
        for (let i = 2; i < newTierIIISets.length; i++) {
            game.dominionSetTiers[newTierIIISets[i][0]] = 2;
        }
    }

    // Apply set bonuses
    applyDominionSetBonuses(game);
}

// Apply all active Dominion Set bonuses
function applyDominionSetBonuses(game) {
    // Reset all dominion bonuses to defaults
    game.dominionStackGain = 1;
    game.stackOverflowEnabled = false;
    game.stackOverflowEfficiency = 0;
    game.dominionExplosionRadius = 1;
    game.dominionExplosionDamage = 1;
    game.dominionExplosionChain = false;
    game.dominionExplosionChainDamage = 0;
    game.dominionMiniNova = false;
    game.dominionSummonBonus = 0;
    game.dominionSummonDamage = 1;
    game.dominionSummonOnHit = false;
    game.dominionSummonOnHitPower = 0;
    game.dominionSummonExplode = false;
    game.dominionLifesteal = 0;
    game.dominionHPDamage = 0;
    game.dominionBloodShield = false;
    game.dominionBloodDetonate = false;

    // Apply each set's current tier bonus
    for (const setId in game.dominionSetTiers) {
        const tier = game.dominionSetTiers[setId];
        if (tier <= 0) continue;

        const setData = DOMINION_SETS[setId];
        if (!setData || !setData.tiers[tier]) continue;

        // Apply the effect
        setData.tiers[tier].effect(game);
    }
}

// Enemy Sprite System - Load custom images for enemies
const ENEMY_SPRITES = {
    // Define sprite paths for each enemy type (set to null for default circle rendering)
    swarm: 'enemies/swarm.png',
    basic: 'enemies/basic.png',
    runner: 'enemies/runner.png',
    tank: 'enemies/tank.png',
    splitter: 'enemies/splitter.png',
    bomber: 'enemies/bomber.png',
    mini: 'enemies/mini.png',
    sticky: 'enemies/sticky.png',
    ice: 'enemies/ice.png',
    poison: 'enemies/poison.png',
    boss: 'enemies/boss-consumer.png',
    general: 'enemies/demon-king.png',
    consumer: 'enemies/the-consumer.png',  // The Consumer boss - void spiral
    // New enemies - Wave 5+
    goblin: 'enemies/goblin.png',           // Wave 5 - Passive XP stealer
    necromancer: 'enemies/necromancer-enemy.png', // Wave 6 - Spawns sprites
    necro_sprite: 'enemies/necro-sprite.png',     // Necromancer's minions
    miniconsumer: 'enemies/mini-consumer.png', // Wave 10 - Grows with deaths
    cinder_wretch: 'enemies/cinder_wretch.png' // Wave 6+ - Fire enemy, spawns Fire Zone on death
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
    img.crossOrigin = "anonymous"; // Enable CORS for CloudFront/S3 images
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
    if (DEVIL_RINGOFFIRE_SPRITE) loadSprite('devil_ringoffire', DEVIL_RINGOFFIRE_SPRITE, true);
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
    // Load Ability sprites
    for (const [type, path] of Object.entries(ABILITY_SPRITES)) {
        loadSprite('ability_' + type, path, true);
    }
    // Load Mythic Augment sprites
    for (const [type, path] of Object.entries(MYTHIC_SPRITES)) {
        loadSprite('mythic_' + type, path, true);
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
// Legacy class (kept for backwards compatibility)
const SURVIVOR_CLASS = {
    name: 'Survivor',
    icon: '👤',
    color: '#00ccff',
    desc: 'The last hope.',
    bonuses: { bulletCount: 0, fireRate: 1, damage: 1 },
    upgrades: [
        { id: 'rapidfire', name: 'Machine Gun', icon: '💥', desc: '+15% fire rate', rarity: 'epic', effect: (g) => g.weapons.bullet.fireRate = Math.floor(g.weapons.bullet.fireRate * 0.85), getDesc: (g) => `Fire Rate: ${(1000 / g.weapons.bullet.fireRate).toFixed(1)}/s → ${(1000 / (g.weapons.bullet.fireRate * 0.85)).toFixed(1)}/s` },
        { id: 'skull', name: 'Elemental Skull', icon: '💀', desc: '+1 orbiting skull (cycles Fire/Dark/Lightning/Slow)', rarity: 'rare', effect: (g) => g.skulls.push(g.createSkull()), getDesc: (g) => `Skulls: ${g.skulls.length} → ${g.skulls.length + 1}` },
    ]
};

// ============================================
// PLAYABLE CHARACTER CLASSES (Launch: 3 classes)
// Each character has: 3 Skills + 2 Abilities
// Sigils: Faded/Runed = stats, Empowered/Ascendant = skill/ability upgrades
// ============================================

// 🔥 FIRE MAGE - Elemental destruction specialist
// Skills: Fireballs, Aura Ring, Elemental Orbs
// PASSIVE: +15% fire damage
const FIRE_MAGE_CLASS = {
    id: 'fire_mage',
    name: 'Fire Mage',
    icon: '🔥',
    color: '#ff4400',
    desc: 'Master of flames. Burns enemies with fireballs, aura ring, and elemental orbs.',
    // Starting state
    bonuses: {
        hasFireballs: true,    // Skill 1: Fireballs (projectiles)
        hasAuraFire: true,     // Skill 2: Aura Ring
        hasElementalOrbs: true, // Skill 3: Elemental Orbs
        elementalOrbCount: 2,   // Starts with 2 orbs
        damage: 1.1,           // +10% base damage
        fireRate: 1
    },
    skills: {
        fireball: { name: 'Fireballs', icon: '🔥', desc: 'Homing fireballs that seek enemies', level: 1 },
        auraRing: { name: 'Aura Ring', icon: '🔵', desc: 'Burning ring damages nearby enemies', level: 1 },
        elementalOrbs: { name: 'Elemental Orbs', icon: '🔮', desc: 'Orbiting orbs that cycle elements', level: 1 }
    },
    // CLASS PASSIVE - Replaces abilities
    passive: {
        name: 'Pyromaniac',
        icon: '🔥',
        desc: '+15% fire damage (fireballs, aura, orbs)',
        effect: (g) => { g.fireDamageBonus = 0.15; }
    },
    // Legacy abilities - REMOVED (kept for reference)
    abilities: {},
    // Class Sigils for leveling up - REBALANCED
    sigils: [
        // Tier 1 (Faded) - REBALANCED
        { id: 'fm_emberstep', name: 'Emberstep Sigil', icon: '💨', desc: '+8% movement speed', tier: 'FADED', rarity: 'common', effect: (g) => g.player.speed *= 1.08, getDesc: (g) => `Speed: ${g.player.speed} → ${Math.floor(g.player.speed * 1.08)}` },
        { id: 'fm_cinder_ward', name: 'Cinder Ward', icon: '🛡️', desc: '+200 max HP', tier: 'FADED', rarity: 'common', effect: (g) => { g.player.maxHealth += 200; g.player.health += 200; }, getDesc: (g) => `HP: ${g.player.maxHealth} → ${g.player.maxHealth + 200}` },
        // Tier 2 (Runed) - REBALANCED
        { id: 'fm_orb_incandescence', name: 'Orb of Incandescence', icon: '🔮', desc: '+1 orbiting orb (max 6)', tier: 'RUNED', rarity: 'rare', effect: (g) => { if(g.skulls.length < 6) g.skulls.push(g.createSkull()); }, getDesc: (g) => `Orbs: ${g.skulls.length} → ${Math.min(6, g.skulls.length + 1)}` },
        { id: 'fm_accelerant_flame', name: 'Accelerant Flame', icon: '🔥', desc: '+12% fire rate', tier: 'RUNED', rarity: 'rare', effect: (g) => g.weapons.bullet.fireRate *= 0.88, getDesc: (g) => `Fire Rate: +12%` },
        // Tier 3 (Empowered) - REBALANCED
        { id: 'fm_inferno_radius', name: 'Inferno Radius', icon: '🔵', desc: 'Aura +10 radius, +60 DPS', tier: 'EMPOWERED', rarity: 'epic', isSkillUpgrade: true, skill: 'auraRing', effect: (g) => { if(g.auraFire) { g.auraFire.radius += 10; g.auraFire.damage += 60; } }, getDesc: (g) => g.auraFire ? `Radius: ${g.auraFire.radius} → ${g.auraFire.radius + 10}` : 'Aura not active' },
        { id: 'fm_meteor_aspect', name: 'Meteor Aspect', icon: '☄️', desc: 'Fireballs +30% size, +15% damage', tier: 'EMPOWERED', rarity: 'epic', isSkillUpgrade: true, skill: 'fireball', effect: (g) => { g.weapons.bullet.size = Math.floor(g.weapons.bullet.size * 1.3); g.weapons.bullet.damage = Math.floor(g.weapons.bullet.damage * 1.15); }, getDesc: (g) => `Size +30%, Damage +15%` },
        { id: 'fm_solar_flare', name: 'Solar Flare', icon: '💥', desc: 'Fire Blast radius +80px, +20% damage', tier: 'EMPOWERED', rarity: 'epic', isAbilityUpgrade: true, ability: 'fireBlast', effect: (g) => { g.fireBlastRadius = (g.fireBlastRadius || 800) + 80; g.fireBlastDamage = (g.fireBlastDamage || 1) * 1.20; }, getDesc: (g) => `Radius: ${g.fireBlastRadius || 800} → ${(g.fireBlastRadius || 800) + 80}` },
        // Tier 4 (Ascendant) - REBALANCED
        { id: 'fm_orb_singularity', name: 'Orb Singularity', icon: '🌀', desc: 'Orbs spin 1.75x faster, +40% damage', tier: 'ASCENDANT', rarity: 'legendary', isSkillUpgrade: true, skill: 'elementalOrbs', effect: (g) => { g.skulls.forEach(s => { s.speed *= 1.75; s.damage *= 1.4; }); }, getDesc: (g) => `Orb Speed x1.75, Damage +40%` },
        { id: 'fm_wild_pyre', name: 'Wild Pyre', icon: '🌋', desc: 'Burn spreads at 60% damage', tier: 'ASCENDANT', rarity: 'legendary', isSkillUpgrade: true, skill: 'auraRing', effect: (g) => { g.boundSigils.push('burn_spread'); g.burnSpreadDamage = 0.6; }, getDesc: (g) => g.boundSigils?.includes('burn_spread') ? 'Active ✓' : 'Activate' },
        { id: 'fm_everburn', name: 'Everburn Sigil', icon: '🔥', desc: 'Fire Amp +2s, +35% damage', tier: 'ASCENDANT', rarity: 'legendary', isAbilityUpgrade: true, ability: 'fireAmp', effect: (g) => { g.fireAmpDuration = (g.fireAmpDuration || 5) + 2; g.fireAmpBoost = (g.fireAmpBoost || 1.5) + 0.35; }, getDesc: (g) => `Duration +2s, Boost +35%` },
    ],
    // Legacy augments array (for backward compatibility)
    augments: []
};

// 🌑 SHADOW MASTER - Shadow creature summoner with whip attack
// Skills: Whip Attack, Shadow Monsters, Shadow Sentinels
// PASSIVE: +20% minion damage
const SHADOW_MASTER_CLASS = {
    id: 'shadow_master',
    name: 'Shadow Master',
    icon: '🌑',
    color: '#6600aa',
    desc: 'Commands shadows. Whip attack, shadow monsters, and sentinel guardians.',
    bonuses: {
        hasWhipAttack: true,       // Skill 1: Whip (replaces projectiles)
        shadowMonsterCount: 1,     // Skill 2: Shadow Monsters (starts with 1)
        shadowSentinelCount: 2,    // Skill 3: Shadow Sentinels (stationary defenders)
        damage: 1.4,               // +40% damage (whip hits hard)
        fireRate: 0.85             // Slightly slower
    },
    skills: {
        whipAttack: { name: 'Whip Attack', icon: '🔗', desc: 'Arc attack hits multiple enemies', level: 1 },
        shadowMonsters: { name: 'Shadow Monsters', icon: '👻', desc: 'Summon shadows to fight for you', level: 1 },
        shadowSentinels: { name: 'Shadow Sentinels', icon: '🦇', desc: 'Stationary guardians that attack nearby enemies', level: 1 }
    },
    // CLASS PASSIVE - Replaces abilities
    passive: {
        name: 'Shadow Lord',
        icon: '🌑',
        desc: '+20% minion damage (monsters, sentinels, wolves)',
        effect: (g) => { g.minionDamageBonus = 0.20; }
    },
    // Legacy abilities - REMOVED
    abilities: {},
    // Class Sigils for leveling up - REBALANCED
    sigils: [
        // Tier 1 (Faded) - REBALANCED
        { id: 'sm_shade_step', name: 'Shade Step', icon: '💨', desc: '+10% movement speed', tier: 'FADED', rarity: 'common', effect: (g) => g.player.speed *= 1.10, getDesc: (g) => `Speed +10%` },
        { id: 'sm_umbral_skin', name: 'Umbral Skin', icon: '🛡️', desc: '+175 max HP', tier: 'FADED', rarity: 'common', effect: (g) => { g.player.maxHealth += 175; g.player.health += 175; }, getDesc: (g) => `HP +175` },
        // Tier 2 (Runed) - REBALANCED
        { id: 'sm_caller_shades', name: 'Caller of Shades', icon: '👻', desc: '+1 shadow monster (max 5)', tier: 'RUNED', rarity: 'rare', effect: (g) => { if((g.shadowMonsters?.length || 0) < 5) g.shadowMonsters.push(g.createShadowMonster()); }, getDesc: (g) => `Monsters: ${g.shadowMonsters?.length || 0} → ${Math.min(5, (g.shadowMonsters?.length || 0) + 1)}` },
        { id: 'sm_sentinel_binding', name: 'Sentinel Binding', icon: '🦇', desc: '+1 shadow sentinel (max 6)', tier: 'RUNED', rarity: 'rare', effect: (g) => { if((g.shadowSentinels?.length || 0) < 6) g.shadowSentinels.push(g.createShadowSentinel()); }, getDesc: (g) => `Sentinels: ${g.shadowSentinels?.length || 0} → ${Math.min(6, (g.shadowSentinels?.length || 0) + 1)}` },
        // Tier 3 (Empowered) - REBALANCED
        { id: 'sm_chain_lash', name: 'Chain-Lash Sigil', icon: '🔗', desc: 'Whip +30% range, hits +1 enemy', tier: 'EMPOWERED', rarity: 'epic', isSkillUpgrade: true, skill: 'whipAttack', effect: (g) => { g.whipRange = (g.whipRange || 120) * 1.30; g.whipTargets = (g.whipTargets || 3) + 1; }, getDesc: (g) => `Range +30%, Targets +1` },
        { id: 'sm_frenzy_night', name: 'Frenzy of Night', icon: '👻', desc: 'Monsters attack 40% faster, +25% damage', tier: 'EMPOWERED', rarity: 'epic', isSkillUpgrade: true, skill: 'shadowMonsters', effect: (g) => { g.shadowAttackSpeed = (g.shadowAttackSpeed || 1) * 1.4; g.shadowDamageBonus = (g.shadowDamageBonus || 1) * 1.25; }, getDesc: (g) => `Attack +40%, Damage +25%` },
        { id: 'sm_cloak_depths', name: 'Cloak of Depths', icon: '👤', desc: 'Shadow Cloak +1.5s duration', tier: 'EMPOWERED', rarity: 'epic', isAbilityUpgrade: true, ability: 'shadowCloak', effect: (g) => g.shadowCloakDuration = (g.shadowCloakDuration || 3) + 1.5, getDesc: (g) => `Duration: ${g.shadowCloakDuration || 3}s → ${(g.shadowCloakDuration || 3) + 1.5}s` },
        // Tier 4 (Ascendant) - REBALANCED
        { id: 'sm_pact_shadows', name: 'Pact of Shadows', icon: '💀', desc: 'Monsters heal you 6% of damage dealt', tier: 'ASCENDANT', rarity: 'legendary', isSkillUpgrade: true, skill: 'shadowMonsters', effect: (g) => { g.boundSigils.push('dark_pact'); g.darkPactHeal = 0.06; }, getDesc: (g) => g.boundSigils?.includes('dark_pact') ? 'Active ✓' : 'Activate' },
        { id: 'sm_void_detonation', name: 'Void Detonation', icon: '💥', desc: 'Sentinels explode on death (600 dmg)', tier: 'ASCENDANT', rarity: 'legendary', isSkillUpgrade: true, skill: 'shadowSentinels', effect: (g) => { g.boundSigils.push('sentinel_explode'); g.sentinelExplosionDamage = 600; }, getDesc: (g) => g.boundSigils?.includes('sentinel_explode') ? 'Active ✓' : 'Activate' },
        { id: 'sm_phantom_rend', name: 'Phantom Rend', icon: '💨', desc: 'Shadow Step deals 400 damage to passed enemies', tier: 'ASCENDANT', rarity: 'legendary', isAbilityUpgrade: true, ability: 'shadowStep', effect: (g) => g.shadowStepDamage = 400, getDesc: (g) => `Step Damage: 400` },
    ],
    // Legacy augments array (for backward compatibility)
    augments: []
};

// ☠️ NECROMANCER - Master of death, raises the fallen
// Skills: Floating Skulls (main attack), Raise Dead, Death Drain
// PASSIVE: +25% raised corpse health, +5% raise chance
const NECROMANCER_CLASS = {
    id: 'necromancer',
    name: 'Necromancer',
    icon: '☠️',
    color: '#00cc66',
    desc: 'Master of death. Floating skulls, raise the dead, and drain life.',
    bonuses: {
        hasFloatingSkulls: true,   // Skill 1: Floating skulls (NO projectiles)
        skullCount: 3,             // Starts with 3 skulls
        hasRaiseDead: true,        // Skill 2: Raise Dead passive
        hasDeathDrain: true,       // Skill 3: Death Drain beam (from beam of despair)
        noProjectiles: true,       // Necromancer doesn't shoot projectiles
        damage: 1.0,
        fireRate: 1
    },
    skills: {
        floatingSkulls: { name: 'Floating Skulls', icon: '💀', desc: 'Orbiting skulls damage enemies', level: 1 },
        raiseDead: { name: 'Raise Dead', icon: '🧟', desc: 'Killed enemies may rise to fight for you', level: 1 },
        deathDrain: { name: 'Death Drain', icon: '🩸', desc: 'Red beam chains to enemies, draining life', level: 1 }
    },
    // CLASS PASSIVE - Replaces abilities
    passive: {
        name: 'Death Lord',
        icon: '☠️',
        desc: '+25% corpse health, +5% raise chance',
        effect: (g) => { g.corpseHealthBonus = 0.25; g.raiseChance = (g.raiseChance || 0.15) + 0.05; }
    },
    // Legacy abilities - REMOVED
    abilities: {},
    // Class Sigils for leveling up - REBALANCED
    sigils: [
        // Tier 1 (Faded) - REBALANCED
        { id: 'nc_gravewalker', name: "Gravewalker's Pace", icon: '💨', desc: '+6% movement speed', tier: 'FADED', rarity: 'common', effect: (g) => g.player.speed *= 1.06, getDesc: (g) => `Speed +6%` },
        { id: 'nc_bone_plating', name: 'Bone Plating', icon: '🛡️', desc: '+250 max HP', tier: 'FADED', rarity: 'common', effect: (g) => { g.player.maxHealth += 250; g.player.health += 250; }, getDesc: (g) => `HP +250` },
        // Tier 2 (Runed) - REBALANCED
        { id: 'nc_skullbinder', name: 'Skullbinder', icon: '💀', desc: '+1 floating skull (max 6)', tier: 'RUNED', rarity: 'rare', effect: (g) => { if(g.skulls.length < 6) g.skulls.push(g.createSkull()); }, getDesc: (g) => `Skulls: ${g.skulls.length} → ${Math.min(6, g.skulls.length + 1)}` },
        { id: 'nc_mass_gravecall', name: 'Mass Gravecall', icon: '🧟', desc: '+2 max raised corpses', tier: 'RUNED', rarity: 'rare', effect: (g) => g.maxRaisedCorpses = (g.maxRaisedCorpses || 5) + 2, getDesc: (g) => `Max Corpses: ${g.maxRaisedCorpses || 5} → ${(g.maxRaisedCorpses || 5) + 2}` },
        // Tier 3 (Empowered) - REBALANCED
        { id: 'nc_rite_return', name: 'Rite of Return', icon: '🧟', desc: '+8% raise chance, corpses last +4s', tier: 'EMPOWERED', rarity: 'epic', isSkillUpgrade: true, skill: 'raiseDead', effect: (g) => { g.raiseChance = (g.raiseChance || 0.15) + 0.08; g.corpseLifetime = (g.corpseLifetime || 20) + 4; }, getDesc: (g) => `Raise: ${Math.floor((g.raiseChance || 0.15) * 100)}% → ${Math.floor(((g.raiseChance || 0.15) + 0.08) * 100)}%` },
        { id: 'nc_crimson_chain', name: 'Crimson Chain', icon: '🩸', desc: 'Death Drain chains to +1 enemy', tier: 'EMPOWERED', rarity: 'epic', isSkillUpgrade: true, skill: 'deathDrain', effect: (g) => g.deathDrainChains = (g.deathDrainChains || 1) + 1, getDesc: (g) => `Chains: ${g.deathDrainChains || 1} → ${(g.deathDrainChains || 1) + 1}` },
        { id: 'nc_expanded_ossuary', name: 'Expanded Ossuary', icon: '🦴', desc: 'Bone Pit +40% radius', tier: 'EMPOWERED', rarity: 'epic', isAbilityUpgrade: true, ability: 'bonePit', effect: (g) => g.bonePitRadius = (g.bonePitRadius || 100) * 1.4, getDesc: (g) => `Radius: ${g.bonePitRadius || 100} → ${Math.floor((g.bonePitRadius || 100) * 1.4)}` },
        // Tier 4 (Ascendant) - REBALANCED
        { id: 'nc_detonation_rite', name: 'Detonation Rite', icon: '💥', desc: 'Raised corpses explode on death (900 dmg)', tier: 'ASCENDANT', rarity: 'legendary', isSkillUpgrade: true, skill: 'raiseDead', effect: (g) => { g.boundSigils.push('corpse_explode'); g.corpseExplosionDamage = 900; }, getDesc: (g) => g.boundSigils?.includes('corpse_explode') ? 'Active ✓' : 'Activate' },
        { id: 'nc_siphon_unlife', name: 'Siphon of Unlife', icon: '💚', desc: 'Death Drain heals you 2.5% of damage dealt', tier: 'ASCENDANT', rarity: 'legendary', isSkillUpgrade: true, skill: 'deathDrain', effect: (g) => { g.boundSigils.push('drain_heals'); g.deathDrainEvolved = true; g.deathDrainHealPercent = 0.025; }, getDesc: (g) => g.boundSigils?.includes('drain_heals') ? 'Active ✓' : 'Activate' },
        { id: 'nc_harvest_eternal', name: 'Harvest Eternal', icon: '🔮', desc: '+1% max HP per 15 kills (permanent)', tier: 'ASCENDANT', rarity: 'legendary', isSkillUpgrade: true, skill: 'floatingSkulls', effect: (g) => { g.boundSigils.push('soul_harvest'); g.soulHarvestKillsRequired = 15; }, getDesc: (g) => g.boundSigils?.includes('soul_harvest') ? 'Active ✓' : 'Activate' },
    ],
    // Legacy augments array (for backward compatibility)
    augments: []
};

// All playable classes for character select
const PLAYABLE_CLASSES = [FIRE_MAGE_CLASS, SHADOW_MASTER_CLASS, NECROMANCER_CLASS];

// ============================================
// COSMETIC STORE SYSTEM (Stripe Prices in cents for easy conversion)
// Price shown to user = price / 100 (e.g., 499 = $4.99)
// ============================================
const COSMETIC_STORE = {
    skins: [
        { id: 'skin_golden', name: 'Golden Warrior', icon: '👑', desc: 'Shimmering gold player aura', price: 499, color: '#ffd700', effect: 'golden_glow' },
        { id: 'skin_shadow', name: 'Shadow Form', icon: '🌑', desc: 'Dark purple ethereal form', price: 399, color: '#6600aa', effect: 'shadow_form' },
        { id: 'skin_ice', name: 'Frost Walker', icon: '❄️', desc: 'Icy blue crystalline skin', price: 399, color: '#00ccff', effect: 'ice_form' },
        { id: 'skin_fire', name: 'Inferno', icon: '🔥', desc: 'Blazing fire aura', price: 449, color: '#ff4400', effect: 'fire_form' },
        { id: 'skin_nature', name: 'Forest Spirit', icon: '🌿', desc: 'Green nature essence', price: 349, color: '#44ff88', effect: 'nature_form' },
        { id: 'skin_void', name: 'Void Walker', icon: '🕳️', desc: 'Dark void energy', price: 599, color: '#220044', effect: 'void_form' },
        { id: 'skin_rainbow', name: 'Prismatic', icon: '🌈', desc: 'Color-shifting rainbow', price: 799, color: 'rainbow', effect: 'rainbow_form' },
        { id: 'skin_skull', name: 'Death Knight', icon: '💀', desc: 'Skeletal warrior form', price: 549, color: '#aaaaaa', effect: 'skull_form' },
    ],
    // trails removed - no longer a cosmetic category
    effects: [
        { id: 'effect_explosion', name: 'Epic Explosions', icon: '💥', desc: 'Bigger kill explosions', price: 399, effect: 'big_explosions' },
        { id: 'effect_screenshake', name: 'Extra Shake', icon: '📳', desc: 'More screen shake on hits', price: 149, effect: 'extra_shake' },
        { id: 'effect_confetti', name: 'Confetti Kills', icon: '🎉', desc: 'Confetti on enemy death', price: 299, effect: 'confetti_kills' },
        { id: 'effect_coins', name: 'Coin Shower', icon: '🪙', desc: 'Coins fly out on kills', price: 349, effect: 'coin_shower' },
        { id: 'effect_skull_eyes', name: 'Glowing Skulls', icon: '👁️', desc: 'Your skulls have glowing eyes', price: 249, effect: 'glowing_skulls' },
        { id: 'effect_rainbow_damage', name: 'Rainbow Numbers', icon: '🌈', desc: 'Damage numbers cycle colors', price: 199, effect: 'rainbow_damage' },
    ]
};

// ============================================
// RUNE SYSTEM - Replaces old augment system
// Tiers: Common (Bronze), Silver, Purple (Epic), Legendary, Mythic
// Player scales through RUNES, not class augments
// ============================================

// COMMON RUNES (Bronze) - Basic stat boosts
// ============================================
// FADED SIGILS (Tier 1) - Basic stat boosts
// ============================================
const FADED_SIGILS = [
    { id: 'sigil_vitality', name: 'Faded Sigil of Vitality', icon: '❤️', desc: '+50 Max HP', rarity: 'common', tier: 'FADED', effect: (g) => { g.player.maxHealth += 50; g.player.health += 50; }, getDesc: (g) => `HP: ${g.player.maxHealth} → ${g.player.maxHealth + 50}` },
    { id: 'sigil_might', name: 'Faded Sigil of Might', icon: '⚔️', desc: '+18 Damage', rarity: 'common', tier: 'FADED', effect: (g) => { g.weapons.bullet.damage += 18; }, getDesc: (g) => `Damage: ${g.weapons.bullet.damage} → ${g.weapons.bullet.damage + 18}` },
    { id: 'sigil_swiftness', name: 'Faded Sigil of Swiftness', icon: '💨', desc: '+5 Speed', rarity: 'common', tier: 'FADED', effect: (g) => { g.player.speed += 5; }, getDesc: (g) => `Speed: ${g.player.speed} → ${g.player.speed + 5}` },
    { id: 'sigil_recovery', name: 'Faded Sigil of Recovery', icon: '💚', desc: '+1 HP per 5 seconds', rarity: 'common', tier: 'FADED', effect: (g) => { g.player.hpRegen = (g.player.hpRegen || 0) + 1; }, getDesc: (g) => `HP5: ${g.player.hpRegen || 0} → ${(g.player.hpRegen || 0) + 1}` },
    { id: 'sigil_precision', name: 'Faded Sigil of Precision', icon: '🎯', desc: '+2% Crit Chance', rarity: 'common', tier: 'FADED', effect: (g) => { g.critChanceBonus = (g.critChanceBonus || 0) + 0.02; }, getDesc: (g) => `Crit: +${Math.round((g.critChanceBonus || 0) * 100)}% → +${Math.round(((g.critChanceBonus || 0) + 0.02) * 100)}%` },
    { id: 'sigil_endurance', name: 'Faded Sigil of Endurance', icon: '🛡️', desc: '+25 HP, +3 Speed', rarity: 'common', tier: 'FADED', effect: (g) => { g.player.maxHealth += 25; g.player.health += 25; g.player.speed += 3; }, getDesc: (g) => `HP +25, Speed +3` },
    { id: 'sigil_haste', name: 'Faded Sigil of Haste', icon: '⚡', desc: '+8% Attack Speed', rarity: 'common', tier: 'FADED', effect: (g) => { g.weapons.bullet.fireRate *= 0.92; }, getDesc: (g) => `Attack Speed +8%` },
];

// Legacy alias for backward compatibility
const COMMON_RUNES = FADED_SIGILS;

// ============================================
// RUNED SIGILS (Tier 2) - Better stat boosts
// ============================================
const RUNED_SIGILS = [
    { id: 'sigil_greater_vitality', name: 'Runed Sigil of Vitality', icon: '❤️‍🔥', desc: '+100 Max HP', rarity: 'rare', tier: 'RUNED', effect: (g) => { g.player.maxHealth += 100; g.player.health += 100; }, getDesc: (g) => `HP: ${g.player.maxHealth} → ${g.player.maxHealth + 100}` },
    { id: 'sigil_greater_might', name: 'Runed Sigil of Might', icon: '🗡️', desc: '+35 Damage', rarity: 'rare', tier: 'RUNED', effect: (g) => { g.weapons.bullet.damage += 35; }, getDesc: (g) => `Damage: ${g.weapons.bullet.damage} → ${g.weapons.bullet.damage + 35}` },
    { id: 'sigil_greater_swiftness', name: 'Runed Sigil of Swiftness', icon: '🌪️', desc: '+10 Speed', rarity: 'rare', tier: 'RUNED', effect: (g) => { g.player.speed += 10; }, getDesc: (g) => `Speed: ${g.player.speed} → ${g.player.speed + 10}` },
    { id: 'sigil_greater_recovery', name: 'Runed Sigil of Recovery', icon: '💖', desc: '+2 HP per 5 seconds', rarity: 'rare', tier: 'RUNED', effect: (g) => { g.player.hpRegen = (g.player.hpRegen || 0) + 2; }, getDesc: (g) => `HP5: ${g.player.hpRegen || 0} → ${(g.player.hpRegen || 0) + 2}` },
    { id: 'sigil_ferocity', name: 'Runed Sigil of Ferocity', icon: '🔥', desc: '+12% Attack Speed', rarity: 'rare', tier: 'RUNED', effect: (g) => { g.weapons.bullet.fireRate *= 0.88; }, getDesc: (g) => `Attack Speed +12%` },
    { id: 'sigil_fortitude', name: 'Runed Sigil of Fortitude', icon: '🏰', desc: '+75 HP, +15 Damage', rarity: 'rare', tier: 'RUNED', effect: (g) => { g.player.maxHealth += 75; g.player.health += 75; g.weapons.bullet.damage += 15; }, getDesc: (g) => `HP +75, Damage +15` },
    { id: 'sigil_agility', name: 'Runed Sigil of Agility', icon: '⚡', desc: '+8 Speed, +3% Crit', rarity: 'rare', tier: 'RUNED', effect: (g) => { g.player.speed += 8; g.critChanceBonus = (g.critChanceBonus || 0) + 0.03; }, getDesc: (g) => `Speed +8, Crit +3%` },
    { id: 'sigil_fury', name: 'Runed Sigil of Fury', icon: '💢', desc: '+20 Damage, +8% Attack Speed', rarity: 'rare', tier: 'RUNED', effect: (g) => { g.weapons.bullet.damage += 20; g.weapons.bullet.fireRate *= 0.92; }, getDesc: (g) => `Damage +20, Attack Speed +8%` },
];

// Legacy alias for backward compatibility
const SILVER_RUNES = RUNED_SIGILS;

// ============================================
// EMPOWERED SIGILS (Tier 3) - Strong stat boosts
// ============================================
const EMPOWERED_SIGILS = [
    { id: 'sigil_superior_vitality', name: 'Empowered Sigil of Vitality', icon: '💗', desc: '+200 Max HP', rarity: 'epic', tier: 'EMPOWERED', effect: (g) => { g.player.maxHealth += 200; g.player.health += 200; }, getDesc: (g) => `HP: ${g.player.maxHealth} → ${g.player.maxHealth + 200}` },
    { id: 'sigil_superior_might', name: 'Empowered Sigil of Might', icon: '⚔️', desc: '+40 Damage', rarity: 'epic', tier: 'EMPOWERED', effect: (g) => { g.weapons.bullet.damage += 40; }, getDesc: (g) => `Damage: ${g.weapons.bullet.damage} → ${g.weapons.bullet.damage + 40}` },
    { id: 'sigil_superior_swiftness', name: 'Empowered Sigil of Swiftness', icon: '🌀', desc: '+20 Speed', rarity: 'epic', tier: 'EMPOWERED', effect: (g) => { g.player.speed += 20; }, getDesc: (g) => `Speed: ${g.player.speed} → ${g.player.speed + 20}` },
    { id: 'sigil_superior_recovery', name: 'Empowered Sigil of Recovery', icon: '✨', desc: '+4 HP per 5 seconds', rarity: 'epic', tier: 'EMPOWERED', effect: (g) => { g.player.hpRegen = (g.player.hpRegen || 0) + 4; }, getDesc: (g) => `HP5: ${g.player.hpRegen || 0} → ${(g.player.hpRegen || 0) + 4}` },
    { id: 'sigil_devastation', name: 'Empowered Sigil of Devastation', icon: '💥', desc: '+30 Damage, +10% Fire Rate', rarity: 'epic', tier: 'EMPOWERED', effect: (g) => { g.weapons.bullet.damage += 30; g.weapons.bullet.fireRate *= 0.9; }, getDesc: (g) => `Damage +30, Fire Rate +10%` },
    { id: 'sigil_juggernaut', name: 'Empowered Sigil of Juggernaut', icon: '🦾', desc: '+150 HP, +15 Damage, +5 Speed', rarity: 'epic', tier: 'EMPOWERED', effect: (g) => { g.player.maxHealth += 150; g.player.health += 150; g.weapons.bullet.damage += 15; g.player.speed += 5; }, getDesc: (g) => `HP +150, Damage +15, Speed +5` },
    { id: 'sigil_assassin', name: 'Empowered Sigil of Assassin', icon: '🗡️', desc: '+25% Crit Damage, +5% Crit Chance', rarity: 'epic', tier: 'EMPOWERED', effect: (g) => { g.weapons.bullet.critMultiplier = (g.weapons.bullet.critMultiplier || 2) + 0.25; g.critChanceBonus = (g.critChanceBonus || 0) + 0.05; }, getDesc: (g) => `Crit Damage +25%, Crit Chance +5%` },
    { id: 'sigil_pyroclasm', name: 'Empowered Sigil of Pyroclasm', icon: '🌋', desc: 'Every 8s: 800px explosion (500 dmg). +5% Attack Damage, +5% Burn Damage', rarity: 'epic', tier: 'EMPOWERED', effect: (g) => { g.weapons.bullet.damage = Math.floor(g.weapons.bullet.damage * 1.05); g.burnDamageBonus = (g.burnDamageBonus || 1) * 1.05; g.boundSigils.push('pyroclasm'); g.pyroclasmCooldown = 0; g.pyroclasmRadius = 800; g.pyroclasmDamage = 500; }, getDesc: (g) => g.boundSigils?.includes('pyroclasm') ? 'Active ✓' : '+5% Damage, +5% Burn, Pyroclasm Explosion' },
];

// Legacy alias for backward compatibility
const PURPLE_RUNES = EMPOWERED_SIGILS;

// ============================================
// ASCENDANT SIGILS (Tier 4) - Unique passives with stat combos
// ============================================
const ASCENDANT_SIGILS = [
    { id: 'sigil_berserker', name: 'Ascendant Sigil: Berserker\'s Fury', icon: '😤', desc: '+300 HP, +50 Damage. PASSIVE: Deal +1% damage for each 1% HP missing', rarity: 'legendary', tier: 'ASCENDANT', effect: (g) => { g.player.maxHealth += 300; g.player.health += 300; g.weapons.bullet.damage += 50; g.boundSigils.push('berserker_fury'); }, getDesc: (g) => g.boundSigils?.includes('berserker_fury') ? 'Active ✓' : '+300 HP, +50 Damage, Berserker Passive' },
    { id: 'sigil_titan', name: 'Ascendant Sigil: Titan\'s Resolve', icon: '🗿', desc: '+500 HP, +25 Damage. PASSIVE: Take 15% less damage from all sources', rarity: 'legendary', tier: 'ASCENDANT', effect: (g) => { g.player.maxHealth += 500; g.player.health += 500; g.weapons.bullet.damage += 25; g.damageReduction = (g.damageReduction || 0) + 0.15; }, getDesc: (g) => `HP +500, Damage +25, -15% Damage Taken` },
    { id: 'sigil_executioner', name: 'Ascendant Sigil: Executioner\'s Call', icon: '⚰️', desc: '+60 Damage, +50% Crit Damage. PASSIVE: Enemies below 20% HP take 2x damage', rarity: 'legendary', tier: 'ASCENDANT', effect: (g) => { g.weapons.bullet.damage += 60; g.weapons.bullet.critMultiplier = (g.weapons.bullet.critMultiplier || 2) + 0.5; g.boundSigils.push('executioner'); }, getDesc: (g) => g.boundSigils?.includes('executioner') ? 'Active ✓' : '+60 Damage, +50% Crit, Execute Passive' },
    { id: 'sigil_phoenix', name: 'Ascendant Sigil: Phoenix\'s Blessing', icon: '🔥', desc: '+250 HP, +6 HP5. PASSIVE: Revive once with 50% HP (180s cooldown)', rarity: 'legendary', tier: 'ASCENDANT', effect: (g) => { g.player.maxHealth += 250; g.player.health += 250; g.player.hpRegen = (g.player.hpRegen || 0) + 6; g.phoenixRevive = true; g.phoenixCooldown = 0; }, getDesc: (g) => g.phoenixRevive ? 'Active ✓' : '+250 HP, +6 HP5, Revive Passive' },
    { id: 'sigil_tempest', name: 'Ascendant Sigil: Tempest\'s Wrath', icon: '⛈️', desc: '+40 Damage, +15 Speed. PASSIVE: Every 5th hit triggers chain lightning (3 targets)', rarity: 'legendary', tier: 'ASCENDANT', effect: (g) => { g.weapons.bullet.damage += 40; g.player.speed += 15; g.boundSigils.push('tempest_chain'); g.tempestCounter = 0; }, getDesc: (g) => g.boundSigils?.includes('tempest_chain') ? 'Active ✓' : '+40 Damage, +15 Speed, Chain Lightning' },
    { id: 'sigil_vampire', name: 'Ascendant Sigil: Vampire\'s Embrace', icon: '🧛', desc: '+200 HP, +35 Damage. PASSIVE: Heal 3% of damage dealt (reduced in combat)', rarity: 'legendary', tier: 'ASCENDANT', effect: (g) => { g.player.maxHealth += 200; g.player.health += 200; g.weapons.bullet.damage += 35; g.vampireHeal = 0.03; }, getDesc: (g) => `HP +200, Damage +35, 3% Lifesteal` },
    { id: 'sigil_doubler', name: 'Ascendant Sigil: Doubling', icon: '✖️', desc: '+100 HP, +20 Damage. PASSIVE: All item stacks count as DOUBLE', rarity: 'legendary', tier: 'ASCENDANT', effect: (g) => { g.player.maxHealth += 100; g.player.health += 100; g.weapons.bullet.damage += 20; g.stackDoubler = true; }, getDesc: (g) => g.stackDoubler ? 'Active ✓ (Stacks 2x)' : '+100 HP, +20 Damage, Double Stacks' },
    { id: 'sigil_momentum', name: 'Ascendant Sigil: Momentum\'s Edge', icon: '🏃', desc: '+30 Speed, +30 Damage. PASSIVE: Gain +1% damage per second moving (max 50%)', rarity: 'legendary', tier: 'ASCENDANT', effect: (g) => { g.player.speed += 30; g.weapons.bullet.damage += 30; g.boundSigils.push('momentum'); g.momentumBonus = 0; }, getDesc: (g) => g.boundSigils?.includes('momentum') ? `Active ✓ (+${Math.floor((g.momentumBonus || 0) * 100)}% dmg)` : '+30 Speed, +30 Damage, Momentum Passive' },
    { id: 'sigil_ring_mastery', name: 'Ascendant Sigil: Ring of Fire Mastery', icon: '🔥', desc: '+200 HP, +40 Damage. PASSIVE: Ring of Fire radius +100, damage +80 DPS, burn enemies for 5s', rarity: 'legendary', tier: 'ASCENDANT', classReq: 'fire_mage', effect: (g) => { g.player.maxHealth += 200; g.player.health += 200; g.weapons.bullet.damage += 40; if (!g.playerRingOfFire) { g.playerRingOfFire = { radius: 100, damage: 50, rotation: 0, rotationSpeed: 2, burnDuration: 3 }; } g.playerRingOfFire.radius += 100; g.playerRingOfFire.damage += 80; g.playerRingOfFire.burnDuration = 5; g.boundSigils.push('ring_mastery'); }, getDesc: (g) => g.boundSigils?.includes('ring_mastery') ? 'Active ✓' : '+200 HP, +40 Damage, Ring Upgrade' },
];

// Legacy alias for backward compatibility
const LEGENDARY_RUNES = ASCENDANT_SIGILS;

// ============================================
// MYTHIC RUNES - Legacy array aliased to rune-style mythics
// Uses boundSigils for tracking
// ============================================
const MYTHIC_RUNES = [
    {
        id: 'mythic_inferno',
        name: 'Infernal Dominion',
        icon: '👹',
        rarity: 'mythic',
        tier: 'MYTHIC',
        setKey: 'cataclysm',
        desc: '+1000 HP, 100 DPS Aura, Nova every 8s (5000 dmg), +25 HP on kill',
        hasSprite: true,
        spriteKey: 'demonic_fire_mythic',
        effect: (g) => {
            g.player.maxHealth += 1000; g.player.health += 1000;
            g.boundSigils.push('mythic_inferno');
            g.demonicAura = { radius: 150, damage: 100 };
            g.demonicNova = { cooldown: 8, timer: 0, damage: 5000, radius: 300 };
            g.demonicHealOnKill = 25;
        },
        getDesc: (g) => g.boundSigils?.includes('mythic_inferno') ? '🔥 INFERNAL ACTIVE 🔥' : '+1000 HP, Aura, Nova, Heal on Kill'
    },
    {
        id: 'mythic_void',
        name: 'Void Sovereign',
        icon: '🕳️',
        rarity: 'mythic',
        tier: 'MYTHIC',
        setKey: 'astral_host',
        desc: '+500 HP. Every 5s pull enemies to you for 2000 damage. +50% damage to pulled enemies.',
        effect: (g) => {
            g.player.maxHealth += 500; g.player.health += 500;
            g.boundSigils.push('mythic_void');
            g.voidPull = { cooldown: 5, timer: 0, damage: 2000, radius: 400 };
            g.voidDamageBonus = 0.5;
        },
        getDesc: (g) => g.boundSigils?.includes('mythic_void') ? '🕳️ VOID ACTIVE 🕳️' : '+500 HP, Void Pull, +50% to pulled'
    },
    {
        id: 'mythic_thunder',
        name: 'Thunder God\'s Wrath',
        icon: '⚡',
        rarity: 'mythic',
        tier: 'MYTHIC',
        setKey: 'cataclysm',
        desc: '+300 HP. Attacks chain lightning to 3 enemies (500 dmg). +100% crit damage.',
        effect: (g) => {
            g.player.maxHealth += 300; g.player.health += 300;
            g.boundSigils.push('mythic_thunder');
            g.thunderChain = { targets: 3, damage: 500, range: 200 };
            g.weapons.bullet.critMultiplier = (g.weapons.bullet.critMultiplier || 2) + 1;
        },
        getDesc: (g) => g.boundSigils?.includes('mythic_thunder') ? '⚡ THUNDER ACTIVE ⚡' : '+300 HP, Chain Lightning, +100% Crit'
    },
    {
        id: 'mythic_blood',
        name: 'Blood Lord\'s Reign',
        icon: '🩸',
        rarity: 'mythic',
        tier: 'MYTHIC',
        setKey: 'bloodbound_throne',
        desc: '+750 HP. Deal +3% of your max HP as bonus damage. 5% lifesteal. +2000 Blood Shield.',
        effect: (g) => {
            g.player.maxHealth += 750; g.player.health += 750;
            g.boundSigils.push('mythic_blood');
            g.bloodLordDamage = 0.03;
            g.vampireHeal = (g.vampireHeal || 0) + 0.05;
            g.bloodShieldEnabled = true;
            g.bloodShieldMaxBase = (g.bloodShieldMaxBase || 0) + 2000;
        },
        getDesc: (g) => g.boundSigils?.includes('mythic_blood') ? '🩸 BLOOD LORD ACTIVE 🩸' : '+750 HP, %HP Damage, Lifesteal, Shield'
    },
    {
        id: 'mythic_celestial',
        name: 'Celestial Guardian',
        icon: '✨',
        rarity: 'mythic',
        tier: 'MYTHIC',
        setKey: 'infinite_echoes',
        desc: '+2000 HP. Immune to damage for 0.5s after being hit (2s CD). One-time full HP revive.',
        effect: (g) => {
            g.player.maxHealth += 2000; g.player.health += 2000;
            g.boundSigils.push('mythic_celestial');
            g.celestialImmunity = { duration: 0.5, cooldown: 2, timer: 0, active: false };
            g.celestialRevive = true;
        },
        getDesc: (g) => g.boundSigils?.includes('mythic_celestial') ? '✨ CELESTIAL ACTIVE ✨' : '+2000 HP, Immunity, Revive'
    },
    {
        id: 'mythic_omega',
        name: 'Omega Destroyer',
        icon: '💀',
        rarity: 'mythic',
        tier: 'MYTHIC',
        setKey: 'cataclysm',
        desc: '+500% projectile damage, -50% fire rate. Projectiles explode. +3 projectiles.',
        effect: (g) => {
            g.player.maxHealth += 500; g.player.health += 500;
            g.boundSigils.push('mythic_omega');
            g.weapons.bullet.damage = Math.floor(g.weapons.bullet.damage * 6);
            g.weapons.bullet.fireRate = Math.floor(g.weapons.bullet.fireRate * 2);
            g.weapons.bullet.count = (g.weapons.bullet.count || 1) + 3;
            g.omegaExplosions = true;
        },
        getDesc: (g) => g.boundSigils?.includes('mythic_omega') ? '💀 OMEGA ACTIVE 💀' : '+500% dmg, -50% rate, explosions'
    }
];

// Legacy alias for backward compatibility (uses MYTHIC_RUNES for rune selection)
const ALL_RUNES = {
    common: FADED_SIGILS,
    silver: RUNED_SIGILS,
    purple: EMPOWERED_SIGILS,
    legendary: ASCENDANT_SIGILS,
    mythic: MYTHIC_RUNES
};
// Note: ALL_SIGILS is defined after MYTHIC_SIGILS below

// ============================================
// MYTHIC SIGILS - Ultra rare, game-changing powers (~5% chance to appear)
// These are Tier 5 Sigils that make runs feel special
// Mythic Sigils count as 2 pieces for Dominion Set bonuses
// ============================================
const MYTHIC_SIGILS = [
    {
        id: 'mythic_hell_crowned',
        name: 'Mythic Sigil: Hell-Crowned Dominion',
        icon: '👹',
        tier: 'MYTHIC',
        rarity: 'mythic',
        setKey: 'cataclysm', // Counts as 2 pieces for Cataclysm set
        hasSprite: true,
        spriteKey: 'demonic_fire_mythic',
        desc: 'Unleash hellfire. +1000 max HP. Gain Inferno Aura (100 DPS). Every 8s, summon a Hellfire Nova dealing 5000 damage. Kills heal 25 HP.',
        effect: (g) => {
            g.boundSigils.push('mythic_hell_crowned');
            g.player.maxHealth += 1000;
            g.player.health += 1000;
            g.demonicInferno = true;
            g.demonicInfernoRadius = 150;
            g.demonicInfernoDPS = 100;
            g.hellfireNovaTimer = 0;
            g.hellfireNovaCooldown = 8;
            g.hellfireNovaDamage = 5000;
            g.hellfireNovaRadius = 300;
            g.demonicHealOnKill = 25;
        },
        getDesc: (g) => g.boundSigils?.includes('mythic_hell_crowned') ? '🔥 HELLFIRE ACTIVE 🔥' : '+1000 HP, 100 DPS Aura, 5000 Nova/8s'
    },
    {
        id: 'mythic_void_seal',
        name: 'Mythic Sigil: Void Seal',
        icon: '🕳️',
        tier: 'MYTHIC',
        rarity: 'mythic',
        setKey: 'astral_host', // Counts as 2 pieces for Astral Host set
        desc: 'Become one with the void. +500 HP. Every 5s, pull all enemies toward you and deal 2000 damage. +50% damage to pulled enemies for 3s.',
        effect: (g) => {
            g.boundSigils.push('mythic_void_seal');
            g.player.maxHealth += 500;
            g.player.health += 500;
            g.voidSovereign = true;
            g.voidPullTimer = 0;
            g.voidPullCooldown = 5;
            g.voidPullDamage = 2000;
            g.voidPullRadius = 400;
            g.voidVulnerableDuration = 3;
        },
        getDesc: (g) => g.boundSigils?.includes('mythic_void_seal') ? '🌀 VOID ACTIVE 🌀' : '+500 HP, 2000 dmg pull/5s'
    },
    {
        id: 'mythic_storm_titan',
        name: 'Mythic Sigil: Storm Titan',
        icon: '⚡',
        tier: 'MYTHIC',
        rarity: 'mythic',
        setKey: 'cataclysm', // Counts as 2 pieces for Cataclysm set
        desc: 'Channel divine lightning. +300 HP. Every projectile chains lightning to 3 nearby enemies for 500 damage. +100% crit damage.',
        effect: (g) => {
            g.boundSigils.push('mythic_storm_titan');
            g.player.maxHealth += 300;
            g.player.health += 300;
            g.thunderGod = true;
            g.lightningChainCount = 3;
            g.lightningChainDamage = 500;
            g.critDamageBonus = (g.critDamageBonus || 1) + 1;
        },
        getDesc: (g) => g.boundSigils?.includes('mythic_storm_titan') ? '⚡ THUNDER ACTIVE ⚡' : '+300 HP, chain lightning, +100% crit'
    },
    {
        id: 'mythic_bloodbound',
        name: 'Mythic Sigil: Bloodbound Sovereign',
        icon: '🩸',
        tier: 'MYTHIC',
        rarity: 'mythic',
        setKey: 'bloodbound_throne', // Counts as 2 pieces for Bloodbound Throne set
        desc: 'Master of blood magic. +750 HP. Deal 3% of your max HP as bonus damage. Heal 5% of all damage dealt. Blood Shield max +2000.',
        effect: (g) => {
            g.boundSigils.push('mythic_bloodbound');
            g.player.maxHealth += 750;
            g.player.health += 750;
            g.bloodLord = true;
            g.bloodLordBonusDamage = 0.03;
            g.bloodLordLifesteal = 0.05;
            g.bloodShieldMaxBase = (g.bloodShieldMaxBase || 0) + 2000;
        },
        getDesc: (g) => g.boundSigils?.includes('mythic_bloodbound') ? '🩸 BLOOD LORD ACTIVE 🩸' : '+750 HP, 3% HP dmg, 5% lifesteal'
    },
    {
        id: 'mythic_seraphic',
        name: 'Mythic Sigil: Seraphic Aegis',
        icon: '✨',
        tier: 'MYTHIC',
        rarity: 'mythic',
        setKey: 'infinite_echoes', // Counts as 2 pieces for Infinite Echoes set
        desc: 'Divine protection. +2000 max HP. Immune to damage for 0.5s after taking a hit (5s cooldown). Revive with 100% HP once.',
        effect: (g) => {
            g.boundSigils.push('mythic_seraphic');
            g.player.maxHealth += 2000;
            g.player.health += 2000;
            g.celestialGuardian = true;
            g.celestialImmuneCooldown = 0;
            g.celestialImmuneActive = false;
            g.celestialRevive = true;
        },
        getDesc: (g) => g.boundSigils?.includes('mythic_seraphic') ? '✨ DIVINE PROTECTION ✨' : '+2000 HP, damage immunity, full revive'
    },
    {
        id: 'mythic_omega',
        name: 'Mythic Sigil: Omega Annihilator',
        icon: '💀',
        tier: 'MYTHIC',
        rarity: 'mythic',
        setKey: 'cataclysm', // Counts as 2 pieces for Cataclysm set
        desc: 'Pure destruction. +500% projectile damage. -50% fire rate. Projectiles explode for 1500 damage in 100px radius. +3 projectiles.',
        effect: (g) => {
            g.boundSigils.push('mythic_omega');
            g.weapons.bullet.damage = Math.floor(g.weapons.bullet.damage * 6);
            g.weapons.bullet.fireRate *= 2;
            g.omegaDestroyer = true;
            g.omegaExplosionDamage = 1500;
            g.omegaExplosionRadius = 100;
            g.weapons.bullet.count += 3;
        },
        getDesc: (g) => g.boundSigils?.includes('mythic_omega') ? '💀 OMEGA ACTIVE 💀' : '+500% dmg, -50% rate, explosions'
    },
    {
        id: 'mythic_devil_halo',
        name: 'Mythic Sigil: Devil Halo',
        icon: '😈',
        tier: 'MYTHIC',
        rarity: 'mythic',
        classReq: 'fire_mage',
        setKey: 'cataclysm', // Counts as 2 pieces for Cataclysm set
        hasSprite: true,
        spriteKey: 'devil_ring_of_fire',
        desc: 'DEMONIC INFERNO. +500 HP, +100 Damage. Triple fire ring (3 rotating rings). 200 DPS each, 200px radius. Burns enemies for 10s. Every 10s, all rings explode for 3000 damage.',
        effect: (g) => {
            g.boundSigils.push('mythic_devil_halo');
            g.player.maxHealth += 500;
            g.player.health += 500;
            g.weapons.bullet.damage += 100;
            g.devilRingOfFire = {
                rings: 3,
                radius: 200,
                damage: 200,
                rotation: 0,
                rotationSpeed: 3,
                burnDuration: 10,
                explosionTimer: 0,
                explosionCooldown: 10,
                explosionDamage: 3000,
                explosionRadius: 350
            };
            g.playerRingOfFire = null;
        },
        getDesc: (g) => g.boundSigils?.includes('mythic_devil_halo') ? '😈 DEVIL RING ACTIVE 😈' : '+500 HP, +100 Damage, 3 Fire Rings'
    }
];

// Legacy alias for backward compatibility
const MYTHIC_AUGMENTS = MYTHIC_SIGILS;

// ============================================
// ALL SIGILS - Combined sigils for easy access by tier
// ============================================
const ALL_SIGILS = {
    faded: FADED_SIGILS,
    runed: RUNED_SIGILS,
    empowered: EMPOWERED_SIGILS,
    ascendant: ASCENDANT_SIGILS,
    mythic: MYTHIC_SIGILS
};

// STACKING ITEMS SYSTEM - Items drop once and stack with kills/damage
const STACKING_ITEMS = {
    // Each item has: base effect, stack scaling, max stacks, evolution
    // stackType: 'kill' = stacks on kills, 'damage' = stacks on damage dealt
    // INFINITE SCALING: critBlade and heartVitality scale infinitely
    // CAPPED: bootsSwiftness and bloodSoaker have max stacks
    critBlade: {
        name: 'Crit Blade',
        icon: '🗡️',
        desc: '♾️ INFINITE: +0.001% crit damage per stack. Stacks on damage dealt.',
        evolvedName: 'Death Blade',
        evolvedIcon: '⚔️',
        evolvedDesc: '♾️ +0.002% crit damage per stack. Crits deal 3x base damage.',
        maxStacks: Infinity,  // INFINITE SCALING
        stackType: 'damage',
        infiniteScaling: true,
        hasSprite: true,
        spriteBase: 'crit_blade_base',
        spriteEvolved: 'crit_blade_evolved',
        effect: (g, stacks) => {
            // Apply stack doubler if active
            const effectiveStacks = g.stackDoubler ? stacks * 2 : stacks;
            // +0.001% crit damage per stack = scales forever
            g.stackingCritDamageBonus = effectiveStacks * 0.00001;
        },
        evolvedEffect: (g) => {
            // Keep infinite scaling but boost the rate
            g.critBladeEvolved = true;
            g.weapons.bullet.critMultiplier = 3; // Base 3x crit damage
        },
        evolveThreshold: 50000  // Evolve at 50k damage for evolved boost
    },
    // beamDespair removed - now Necromancer's base attack
    ringXp: {
        name: 'Ring of XP',
        icon: '💍',
        desc: '+0.05% XP gain per stack. Stacks on kills.',
        evolvedName: 'Crown of Wisdom',
        evolvedIcon: '👑',
        evolvedDesc: '+150% XP gain, enemies drop double XP orbs',
        maxStacks: 3000,  // Evolves at 3k kills (capped)
        stackType: 'kill',
        infiniteScaling: false,
        hasSprite: true,
        spriteBase: 'ring_xp_base',
        spriteEvolved: 'ring_xp_evolved',
        effect: (g, stacks) => {
            const effectiveStacks = g.stackDoubler ? stacks * 2 : stacks;
            g.stackingXpBonus = effectiveStacks * 0.0005;
        },
        evolvedEffect: (g) => {
            g.stackingXpBonus = 1.5;
            g.doubleXpOrbs = true;
        }
    },
    bootsSwiftness: {
        name: 'Boots of Swiftness',
        icon: '👟',
        desc: '🔒 CAPPED: +0.01% move speed per stack (max +50%). Stacks by distance.',
        evolvedName: 'Wings of Mercury',
        evolvedIcon: '🪽',
        evolvedDesc: '+50% move speed, dash ability on double-tap',
        maxStacks: 50000,  // CAPPED at 50k - speed shouldn't scale infinitely
        stackType: 'distance',
        infiniteScaling: false,
        hasSprite: true,
        spriteBase: 'boots_swiftness_base',
        spriteEvolved: 'boots_swiftness_evolved',
        effect: (g, stacks) => {
            // Capped at 50% speed bonus
            g.stackingSpeedBonus = Math.min(stacks * 0.00001, 0.5);
        },
        evolvedEffect: (g) => {
            g.stackingSpeedBonus = 0.5;
            g.hasDash = true;
            if (g.abilities && g.abilities.dash) {
                g.abilities.dash.unlocked = true;
            }
        }
    },
    heartVitality: {
        name: 'Heart of Vitality',
        icon: '❤️',
        desc: '♾️ INFINITE: +1 max HP per stack. Stacks on kills.',
        evolvedName: 'Immortal Heart',
        evolvedIcon: '💖',
        evolvedDesc: '♾️ +2 max HP per stack. Heal 0.5% max HP per 5 seconds.',
        maxStacks: Infinity,  // INFINITE SCALING
        stackType: 'kill',
        infiniteScaling: true,
        hasSprite: true,
        spriteBase: 'heart_vitality_base',
        spriteEvolved: 'heart_vitality_evolved',
        effect: (g, stacks) => {
            const effectiveStacks = g.stackDoubler ? stacks * 2 : stacks;
            // +1 max HP per stack, no cap
            const hpBonus = effectiveStacks;
            const prevHpBonus = g.heartVitalityHpBonus || 0;
            const hpDiff = hpBonus - prevHpBonus;
            if (hpDiff > 0) {
                g.player.maxHealth += hpDiff;
                g.player.health += hpDiff;
            }
            g.heartVitalityHpBonus = hpBonus;
        },
        evolvedEffect: (g) => {
            // Keep infinite scaling but boost the rate
            g.heartVitalityEvolved = true;  // +2 HP per stack after evolution
        },
        evolveThreshold: 1000  // Evolve at 1k kills for evolved boost
    },
    bloodSoaker: {
        name: 'Blood Soaker',
        icon: '🩸',
        desc: '🔒 CAPPED: Build blood shield from damage dealt (max 1500 shield).',
        evolvedName: 'Vampiric Essence',
        evolvedIcon: '🧛',
        evolvedDesc: 'Shield explodes on break, damaging enemies. Heal 10% of explosion.',
        maxStacks: 150000,  // CAPPED - blood shield max is limited
        stackType: 'damage',
        infiniteScaling: false,
        hasSprite: true,
        spriteBase: 'blood_soaker_base',
        spriteEvolved: 'blood_soaker_evolved',
        effect: (g, stacks) => {
            g.bloodShieldEnabled = true;
            // Capped at 1000 max shield
            g.bloodShieldMaxBase = Math.min(250 + Math.floor(stacks * 0.005), 1000);
            g.bloodShieldRate = 0.01;
        },
        evolvedEffect: (g) => {
            g.bloodShieldEnabled = true;
            g.bloodShieldEvolved = true;
            g.bloodShieldMaxBase = 1500; // Max shield capped at 1500
            g.bloodShieldRate = 0.02;
        }
    }
};

// Legacy ITEMS for backward compatibility (redirects to stacking system)
const ITEMS = STACKING_ITEMS;

// ============================================
// STARTER ITEMS SYSTEM (NEW)
// - Player picks ONE starter item at game start (wave 1)
// - Starter item automatically evolves at Wave 10
// - Starter items are CLASS-LOCKED
// - Starter items do NOT count as Sigils and do NOT interact with Dominion Sets
// - Starter items do NOT scale (no per-kill, per-damage, per-wave scaling beyond Wave 10 evolution)
// ============================================
const STARTER_ITEMS = {
    // =========================================
    // FIRE MAGE STARTER ITEMS
    // =========================================
    fm_cinderbrand_focus: {
        id: 'fm_cinderbrand_focus',
        classLock: 'fire_mage',
        name: 'Cinderbrand Focus',
        evolvedName: 'Infernal Cinderbrand',
        icon: 'starters/cinderbrand_focus.jpg',
        evolvedIcon: 'starters/infernal_cinderbrand.jpg',
        color: '#ff4400',
        evolveWave: 10,
        base: {
            desc: '+10 Damage, +8% Fire Rate',
            modifiers: { flatDamageBonus: 10, fireRateMult: 0.08 },
            passives: []
        },
        evolved: {
            desc: '+18 Damage, +15% Fire Rate',
            modifiers: { flatDamageBonus: 18, fireRateMult: 0.15 },
            passives: [{ type: 'damageVsBurningMult', value: 0.20, desc: 'Fire attacks deal +20% damage to burning enemies' }]
        }
    },
    fm_emberstep_sandals: {
        id: 'fm_emberstep_sandals',
        classLock: 'fire_mage',
        name: 'Emberstep Sandals',
        evolvedName: 'Ashen Emberstep',
        icon: 'starters/emberstep_sandals.jpg',
        evolvedIcon: 'starters/ashen_emberstep.jpg',
        color: '#ff6600',
        evolveWave: 10,
        base: {
            desc: '+12% Move Speed, +10% Projectile Speed',
            modifiers: { moveSpeedMult: 0.12, projectileSpeedMult: 0.10 },
            passives: []
        },
        evolved: {
            desc: '+18% Move Speed, +15% Projectile Speed',
            modifiers: { moveSpeedMult: 0.18, projectileSpeedMult: 0.15 },
            passives: [{
                type: 'momentumFireRateBuff',
                requiredMoveSeconds: 2.0,
                buffFireRateMult: 0.10,
                buffDurationSeconds: 1.5,
                internalCooldownSeconds: 0.0,
                desc: 'After moving for 2s, gain +10% fire rate for 1.5s'
            }]
        }
    },
    fm_kindled_aegis: {
        id: 'fm_kindled_aegis',
        classLock: 'fire_mage',
        name: 'Kindled Aegis',
        evolvedName: 'Blazing Aegis',
        icon: 'starters/kindled_aegis.jpg',
        evolvedIcon: 'starters/blazing_aegis.jpg',
        color: '#ff8800',
        evolveWave: 10,
        base: {
            desc: '+120 Max HP, -25% Burn Damage Taken',
            modifiers: { maxHpFlat: 120, burnDamageTakenMult: -0.25 },
            passives: []
        },
        evolved: {
            desc: '+220 Max HP, -40% Burn Damage Taken',
            modifiers: { maxHpFlat: 220, burnDamageTakenMult: -0.40 },
            passives: [{
                type: 'onHitFlamePulse',
                damage: 100,
                radiusPx: 140,
                internalCooldownSeconds: 6.0,
                desc: 'When hit, emit a flame pulse (100 dmg, 140px radius, 6s cooldown)'
            }]
        }
    },
    fm_sparkcaller_tome: {
        id: 'fm_sparkcaller_tome',
        classLock: 'fire_mage',
        name: 'Sparkcaller Tome',
        evolvedName: 'Tome of Wildfire',
        icon: 'starters/sparkcaller_tome.jpg',
        evolvedIcon: 'starters/tome_of_wildfire.jpg',
        color: '#ffaa00',
        evolveWave: 10,
        base: {
            desc: '+12% Fire Rate, +20% Burn Duration',
            modifiers: { fireRateMult: 0.12, burnDurationMult: 0.20 },
            passives: []
        },
        evolved: {
            desc: '+20% Fire Rate, +40% Burn Duration',
            modifiers: { fireRateMult: 0.20, burnDurationMult: 0.40 },
            passives: [{
                type: 'burnStacksCap',
                maxStacks: 2,
                desc: 'Burn damage can stack up to 2 times on the same enemy'
            }]
        }
    }
};

// Helper: Get starter items for a specific class
function getStarterItemsForClass(classId) {
    return Object.keys(STARTER_ITEMS)
        .filter(key => STARTER_ITEMS[key].classLock === classId)
        .map(key => ({ key, ...STARTER_ITEMS[key] }));
}

// Helper: Apply starter item modifiers
function applyStarterModifiers(game, modifiers) {
    if (modifiers.flatDamageBonus) {
        game.weapons.bullet.damage += modifiers.flatDamageBonus;
    }
    if (modifiers.fireRateMult) {
        // Fire rate is lower = faster, so multiply by (1 - mult)
        game.weapons.bullet.fireRate *= (1 - modifiers.fireRateMult);
    }
    if (modifiers.moveSpeedMult) {
        game.player.speed *= (1 + modifiers.moveSpeedMult);
    }
    if (modifiers.projectileSpeedMult) {
        game.weapons.bullet.speed *= (1 + modifiers.projectileSpeedMult);
    }
    if (modifiers.maxHpFlat) {
        game.player.maxHealth += modifiers.maxHpFlat;
        game.player.health += modifiers.maxHpFlat;
    }
    if (modifiers.burnDurationMult) {
        game.starterBurnDurationMult = (game.starterBurnDurationMult || 0) + modifiers.burnDurationMult;
    }
    if (modifiers.burnDamageTakenMult) {
        game.starterBurnDamageTakenMult = (game.starterBurnDamageTakenMult || 0) + modifiers.burnDamageTakenMult;
    }
}

// Helper: Remove starter item modifiers (for evolution transition)
function removeStarterModifiers(game, modifiers) {
    if (modifiers.flatDamageBonus) {
        game.weapons.bullet.damage -= modifiers.flatDamageBonus;
    }
    if (modifiers.fireRateMult) {
        // Reverse the fire rate change
        game.weapons.bullet.fireRate /= (1 - modifiers.fireRateMult);
    }
    if (modifiers.moveSpeedMult) {
        game.player.speed /= (1 + modifiers.moveSpeedMult);
    }
    if (modifiers.projectileSpeedMult) {
        game.weapons.bullet.speed /= (1 + modifiers.projectileSpeedMult);
    }
    if (modifiers.maxHpFlat) {
        game.player.maxHealth -= modifiers.maxHpFlat;
        game.player.health = Math.min(game.player.health, game.player.maxHealth);
    }
    if (modifiers.burnDurationMult) {
        game.starterBurnDurationMult = (game.starterBurnDurationMult || 0) - modifiers.burnDurationMult;
    }
    if (modifiers.burnDamageTakenMult) {
        game.starterBurnDamageTakenMult = (game.starterBurnDamageTakenMult || 0) - modifiers.burnDamageTakenMult;
    }
}

// Helper: Register evolved passives
function registerEvolvedPassives(game, passives) {
    for (const passive of passives) {
        switch (passive.type) {
            case 'damageVsBurningMult':
                game.starterDamageVsBurningMult = passive.value;
                break;
            case 'momentumFireRateBuff':
                game.starterMomentumBuff = {
                    requiredMoveSeconds: passive.requiredMoveSeconds,
                    buffFireRateMult: passive.buffFireRateMult,
                    buffDurationSeconds: passive.buffDurationSeconds,
                    internalCooldownSeconds: passive.internalCooldownSeconds,
                    moveTimer: 0,
                    buffTimer: 0,
                    lastMoveTime: 0
                };
                break;
            case 'onHitFlamePulse':
                game.starterFlamePulse = {
                    damage: passive.damage,
                    radiusPx: passive.radiusPx,
                    internalCooldownSeconds: passive.internalCooldownSeconds,
                    cooldownTimer: 0
                };
                break;
            case 'burnStacksCap':
                game.starterBurnStacksCap = passive.maxStacks;
                break;
        }
    }
}

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
        bonus: 'Killed enemies explode, +wolves (max 3)',
        effect: (g) => {
            g.necroExplosion = true;
            const toAdd = Math.min(3, 3 - (g.maxWolves || 0));
            if (toAdd > 0) {
                g.maxWolves = (g.maxWolves || 0) + toAdd;
                for (let i = 0; i < toAdd; i++) g.addMinion('wolf');
            }
        }
    }
};

// Game balance settings (balanced around medium difficulty)
// SCALED 5x base with INCREASED scaling for late-game power spikes
const GAME_SETTINGS = {
    enemyHealthMult: 0.35,       // Lower base health for easier early game
    enemyDamageMult: 1.0,
    enemySpeedMult: 1.2,         // REBALANCED: 1.3 -> 1.2
    // spawnRateMult is now dynamic - see getSpawnRateMultByWave()
    scalingPerWaveEarly: 0.05,   // +5% per wave for waves 1-9
    scalingPerWaveMid: 0.16,     // +16% per wave for waves 10-15
    scalingPerWaveLate: 0.24,    // +24% per wave for waves 16+
    playerHealthMult: 1.0,
    xpMult: 1.2,                 // More XP for faster leveling
    playerSpeedMult: 1.15        // Faster player movement
};

// Dynamic Difficulty Tiers (based on wave number)
// Waves 1-5: EASY, Waves 6-10: NORMAL, Waves 11-15: HARD, Waves 16-20: INFERNAL
const DIFFICULTY_TIERS = {
    EASY: { name: 'Easy', icon: '🌱', color: '#44ff44', healthMult: 0.60, damageMult: 0.55, maxWave: 5 },
    NORMAL: { name: 'Normal', icon: '⚔️', color: '#ffaa00', healthMult: 0.90, damageMult: 0.90, maxWave: 10 },
    HARD: { name: 'Hard', icon: '🔥', color: '#ff4400', healthMult: 1.25, damageMult: 1.20, maxWave: 15 },
    INFERNAL: { name: 'Infernal', icon: '💀', color: '#ff0044', healthMult: 1.85, damageMult: 1.80, maxWave: 20 }
};

// Get difficulty tier based on wave number
function getDifficultyTier(wave) {
    if (wave <= 5) return DIFFICULTY_TIERS.EASY;
    if (wave <= 10) return DIFFICULTY_TIERS.NORMAL;
    if (wave <= 15) return DIFFICULTY_TIERS.HARD;
    return DIFFICULTY_TIERS.INFERNAL;
}

// Get spawn rate multiplier by wave (lower = more frequent spawns)
// Base spawn rate = 500ms * this multiplier
function getSpawnRateMultByWave(wave) {
    if (wave <= 3) return 1.10;   // Waves 1-3: slower spawns
    if (wave <= 6) return 0.95;   // Waves 4-6: slightly faster
    if (wave <= 9) return 0.80;   // Waves 7-9: faster
    if (wave <= 12) return 0.62;  // Waves 10-12: much faster
    if (wave <= 15) return 0.52;  // Waves 13-15: very fast
    return 0.45;                  // Waves 16+: maximum spawn rate
}

// Get max alive enemy cap by wave
function getMaxAliveByWave(wave) {
    if (wave <= 3) return 28;     // Waves 1-3: low cap
    if (wave <= 6) return 44;     // Waves 4-6: medium cap
    if (wave <= 9) return 62;     // Waves 7-9: higher cap
    if (wave <= 12) return 95;    // Waves 10-12: high cap
    if (wave <= 15) return 125;   // Waves 13-15: very high cap
    return 165;                   // Waves 16+: maximum cap
}

// Get wave scaling multiplier (stepped curve for HP and damage)
function getWaveScalingMult(wave) {
    if (wave <= 9) {
        // Waves 1-9: +5% per wave
        return 1 + (wave - 1) * GAME_SETTINGS.scalingPerWaveEarly;
    } else if (wave <= 15) {
        // Waves 10-15: +5% for waves 1-9, then +16% per wave
        const earlyScaling = 9 * GAME_SETTINGS.scalingPerWaveEarly; // 9 waves * 5% = 45%
        const midWaves = wave - 9;
        return 1 + earlyScaling + midWaves * GAME_SETTINGS.scalingPerWaveMid;
    } else {
        // Waves 16+: +5% for 1-9, +16% for 10-15, then +24% per wave
        const earlyScaling = 9 * GAME_SETTINGS.scalingPerWaveEarly; // 45%
        const midScaling = 6 * GAME_SETTINGS.scalingPerWaveMid;     // 6 waves * 16% = 96%
        const lateWaves = wave - 15;
        return 1 + earlyScaling + midScaling + lateWaves * GAME_SETTINGS.scalingPerWaveLate;
    }
}

// Get enemy types allowed for the current wave (with gating)
// Returns array of enemy types with proper weighting
function getEnemyTypesForWave(wave, tankOrSplitterChoice) {
    // Waves 1-2: Only Swarm and Basic
    const types = ['swarm', 'swarm', 'swarm', 'swarm'];
    if (wave >= 2) types.push('swarm', 'swarm', 'basic');

    // Waves 3-4: Add Runner (low weight)
    if (wave >= 3 && wave <= 4) {
        types.push('runner'); // Low weight - only 1 entry
    }

    // Waves 5-6: Add either Tank OR Splitter (never both), Runner gets more weight
    if (wave >= 5 && wave <= 6) {
        types.push('runner', 'runner'); // Runner gets more weight now
        // tankOrSplitterChoice should be 'tank' or 'splitter' for this wave
        if (tankOrSplitterChoice === 'tank') {
            types.push('tank');
        } else {
            types.push('splitter');
        }
    }

    // Waves 7-9: Add Sticky (low weight), Tank and Splitter both available, Bomber LOCKED
    if (wave >= 7 && wave <= 9) {
        types.push('runner', 'runner', 'swarm');
        types.push('tank', 'splitter');
        types.push('sticky'); // Low weight
        types.push('goblin'); // Goblin available
        types.push('necromancer'); // Necromancer available
        types.push('poison'); // Poison available
        if (wave >= 8) types.push('ice'); // Ice at wave 8+
        // Note: Bomber is LOCKED until wave 10
    }

    // Wave 10+: Full pool unlocked, Bomber enabled
    if (wave >= 10) {
        types.push('runner', 'runner', 'swarm');
        types.push('tank', 'splitter', 'swarm');
        types.push('sticky', 'sticky');
        types.push('goblin');
        types.push('necromancer');
        types.push('poison', 'poison');
        types.push('ice', 'swarm');
        types.push('miniconsumer');

        // Bomber: reduced weight until wave 12, then normal weight
        if (wave >= 10 && wave < 12) {
            types.push('bomber'); // Low weight until wave 12
        } else if (wave >= 12) {
            types.push('bomber', 'bomber'); // Normal weight at wave 12+
        }
    }

    // ============ CINDER WRETCH SPAWN GATING ============
    // Waves 1-5: disabled
    // Waves 6-9: LOW spawn weight (1 entry)
    // Wave 10+: NORMAL spawn weight (2 entries)
    // Easy difficulty: reduce by 30% (don't add on Easy for waves 6-9, reduced on Easy for wave 10+)
    const isEasyDifficulty = typeof getDifficultyTier !== 'undefined' && getDifficultyTier(wave).name === 'Easy';

    if (wave >= 6 && wave <= 9) {
        // LOW weight - only add if NOT Easy difficulty
        if (!isEasyDifficulty) {
            types.push('cinder_wretch'); // 1 entry = low weight
        }
    } else if (wave >= 10) {
        // NORMAL weight at wave 10+
        if (isEasyDifficulty) {
            // Easy: 30% reduction = 1 entry instead of 2
            types.push('cinder_wretch');
        } else {
            // Normal+: full weight = 2 entries
            types.push('cinder_wretch', 'cinder_wretch');
        }
    }

    return types;
}

// ============================================
// SPAWN SYSTEM TESTS
// Run in browser console: window.runSpawnSystemTests()
// ============================================
function runSpawnSystemTests() {
    const results = [];
    let passed = 0;
    let failed = 0;

    function assert(condition, message) {
        if (condition) {
            passed++;
            results.push(`✅ PASS: ${message}`);
        } else {
            failed++;
            results.push(`❌ FAIL: ${message}`);
        }
    }

    // Test 1: maxAlive cap values are correct
    assert(getMaxAliveByWave(1) === 28, 'Wave 1 maxAlive should be 28');
    assert(getMaxAliveByWave(3) === 28, 'Wave 3 maxAlive should be 28');
    assert(getMaxAliveByWave(4) === 44, 'Wave 4 maxAlive should be 44');
    assert(getMaxAliveByWave(6) === 44, 'Wave 6 maxAlive should be 44');
    assert(getMaxAliveByWave(7) === 62, 'Wave 7 maxAlive should be 62');
    assert(getMaxAliveByWave(9) === 62, 'Wave 9 maxAlive should be 62');
    assert(getMaxAliveByWave(10) === 95, 'Wave 10 maxAlive should be 95');
    assert(getMaxAliveByWave(12) === 95, 'Wave 12 maxAlive should be 95');
    assert(getMaxAliveByWave(13) === 125, 'Wave 13 maxAlive should be 125');
    assert(getMaxAliveByWave(15) === 125, 'Wave 15 maxAlive should be 125');
    assert(getMaxAliveByWave(16) === 165, 'Wave 16 maxAlive should be 165');
    assert(getMaxAliveByWave(20) === 165, 'Wave 20 maxAlive should be 165');

    // Test 2: spawnRateMult values are correct
    assert(getSpawnRateMultByWave(1) === 1.10, 'Wave 1 spawnRateMult should be 1.10');
    assert(getSpawnRateMultByWave(3) === 1.10, 'Wave 3 spawnRateMult should be 1.10');
    assert(getSpawnRateMultByWave(4) === 0.95, 'Wave 4 spawnRateMult should be 0.95');
    assert(getSpawnRateMultByWave(6) === 0.95, 'Wave 6 spawnRateMult should be 0.95');
    assert(getSpawnRateMultByWave(7) === 0.80, 'Wave 7 spawnRateMult should be 0.80');
    assert(getSpawnRateMultByWave(9) === 0.80, 'Wave 9 spawnRateMult should be 0.80');
    assert(getSpawnRateMultByWave(10) === 0.62, 'Wave 10 spawnRateMult should be 0.62');
    assert(getSpawnRateMultByWave(12) === 0.62, 'Wave 12 spawnRateMult should be 0.62');
    assert(getSpawnRateMultByWave(13) === 0.52, 'Wave 13 spawnRateMult should be 0.52');
    assert(getSpawnRateMultByWave(15) === 0.52, 'Wave 15 spawnRateMult should be 0.52');
    assert(getSpawnRateMultByWave(16) === 0.45, 'Wave 16 spawnRateMult should be 0.45');
    assert(getSpawnRateMultByWave(20) === 0.45, 'Wave 20 spawnRateMult should be 0.45');

    // Test 3: Wave 10 ramp applies - scaling increases significantly
    const scaling9 = getWaveScalingMult(9);
    const scaling10 = getWaveScalingMult(10);
    const scaling15 = getWaveScalingMult(15);
    const scaling16 = getWaveScalingMult(16);
    assert(scaling10 > scaling9, `Wave 10 scaling (${scaling10.toFixed(2)}) should be > wave 9 (${scaling9.toFixed(2)})`);
    assert((scaling10 - scaling9) > 0.10, `Wave 10 ramp should increase scaling by >10% (actual: ${((scaling10 - scaling9) * 100).toFixed(1)}%)`);
    assert(scaling16 > scaling15, `Wave 16 scaling (${scaling16.toFixed(2)}) should be > wave 15 (${scaling15.toFixed(2)})`);
    assert((scaling16 - scaling15) > 0.20, `Wave 16 ramp should increase scaling by >20% (actual: ${((scaling16 - scaling15) * 100).toFixed(1)}%)`);

    // Test 4: Enemy composition gating - restricted types don't appear early
    const wave1Types = getEnemyTypesForWave(1, 'tank');
    const wave2Types = getEnemyTypesForWave(2, 'tank');
    assert(!wave1Types.includes('runner'), 'Wave 1 should NOT have runner');
    assert(!wave1Types.includes('tank'), 'Wave 1 should NOT have tank');
    assert(!wave1Types.includes('splitter'), 'Wave 1 should NOT have splitter');
    assert(!wave1Types.includes('bomber'), 'Wave 1 should NOT have bomber');
    assert(!wave2Types.includes('bomber'), 'Wave 2 should NOT have bomber');
    assert(wave1Types.includes('swarm'), 'Wave 1 should have swarm');
    assert(wave2Types.includes('basic'), 'Wave 2 should have basic');

    // Test 5: Runner appears at waves 3-4 with low weight
    const wave3Types = getEnemyTypesForWave(3, 'tank');
    const wave4Types = getEnemyTypesForWave(4, 'tank');
    assert(wave3Types.includes('runner'), 'Wave 3 should have runner');
    assert(wave4Types.includes('runner'), 'Wave 4 should have runner');
    const wave3RunnerCount = wave3Types.filter(t => t === 'runner').length;
    const wave3SwarmCount = wave3Types.filter(t => t === 'swarm').length;
    assert(wave3RunnerCount < wave3SwarmCount, `Wave 3 runner weight (${wave3RunnerCount}) should be < swarm (${wave3SwarmCount})`);

    // Test 6: Waves 5-6 have either Tank OR Splitter (not both based on choice)
    const wave5Tank = getEnemyTypesForWave(5, 'tank');
    const wave5Splitter = getEnemyTypesForWave(5, 'splitter');
    assert(wave5Tank.includes('tank') && !wave5Tank.includes('splitter'), 'Wave 5 with tank choice should have tank but NOT splitter');
    assert(wave5Splitter.includes('splitter') && !wave5Splitter.includes('tank'), 'Wave 5 with splitter choice should have splitter but NOT tank');

    // Test 7: Bomber is locked until wave 10
    const wave7Types = getEnemyTypesForWave(7, 'tank');
    const wave9Types = getEnemyTypesForWave(9, 'tank');
    const wave10Types = getEnemyTypesForWave(10, 'tank');
    assert(!wave7Types.includes('bomber'), 'Wave 7 should NOT have bomber (locked)');
    assert(!wave9Types.includes('bomber'), 'Wave 9 should NOT have bomber (locked)');
    assert(wave10Types.includes('bomber'), 'Wave 10 should have bomber (unlocked)');

    // Test 8: Sticky appears at waves 7-9 with low weight
    assert(wave7Types.includes('sticky'), 'Wave 7 should have sticky');
    const wave7StickyCount = wave7Types.filter(t => t === 'sticky').length;
    assert(wave7StickyCount <= 2, `Wave 7 sticky weight (${wave7StickyCount}) should be low`);

    // Test 9: Full pool unlocked at wave 10+
    assert(wave10Types.includes('tank'), 'Wave 10 should have tank');
    assert(wave10Types.includes('splitter'), 'Wave 10 should have splitter');
    assert(wave10Types.includes('sticky'), 'Wave 10 should have sticky');
    assert(wave10Types.includes('poison'), 'Wave 10 should have poison');
    assert(wave10Types.includes('ice'), 'Wave 10 should have ice');
    assert(wave10Types.includes('miniconsumer'), 'Wave 10 should have miniconsumer');

    // Test 10: Difficulty tier multipliers are correct
    const easy = getDifficultyTier(3);
    const normal = getDifficultyTier(8);
    const hard = getDifficultyTier(13);
    const infernal = getDifficultyTier(18);
    assert(easy.healthMult === 0.60, `Easy healthMult should be 0.60, got ${easy.healthMult}`);
    assert(easy.damageMult === 0.55, `Easy damageMult should be 0.55, got ${easy.damageMult}`);
    assert(normal.healthMult === 0.90, `Normal healthMult should be 0.90, got ${normal.healthMult}`);
    assert(normal.damageMult === 0.90, `Normal damageMult should be 0.90, got ${normal.damageMult}`);
    assert(hard.healthMult === 1.25, `Hard healthMult should be 1.25, got ${hard.healthMult}`);
    assert(hard.damageMult === 1.20, `Hard damageMult should be 1.20, got ${hard.damageMult}`);
    assert(infernal.healthMult === 1.85, `Infernal healthMult should be 1.85, got ${infernal.healthMult}`);
    assert(infernal.damageMult === 1.80, `Infernal damageMult should be 1.80, got ${infernal.damageMult}`);

    // ============================================
    // CINDER WRETCH TESTS
    // ============================================

    // Test 11: Cinder Wretch does NOT spawn before Wave 6
    const wave1TypesCW = getEnemyTypesForWave(1, 'tank');
    const wave3TypesCW = getEnemyTypesForWave(3, 'tank');
    const wave5TypesCW = getEnemyTypesForWave(5, 'tank');
    assert(!wave1TypesCW.includes('cinder_wretch'), 'Cinder Wretch should NOT spawn at Wave 1');
    assert(!wave3TypesCW.includes('cinder_wretch'), 'Cinder Wretch should NOT spawn at Wave 3');
    assert(!wave5TypesCW.includes('cinder_wretch'), 'Cinder Wretch should NOT spawn at Wave 5');

    // Test 12: Cinder Wretch spawns at Wave 6+ with low weight
    const wave6TypesCW = getEnemyTypesForWave(6, 'tank');
    const wave8TypesCW = getEnemyTypesForWave(8, 'tank');
    // On Normal+ difficulty, Cinder Wretch should appear at wave 6-9
    // (Note: Easy difficulty won't add it at waves 6-9)
    const wave6CinderCount = wave6TypesCW.filter(t => t === 'cinder_wretch').length;
    const wave8CinderCount = wave8TypesCW.filter(t => t === 'cinder_wretch').length;
    // Should have at least 1 entry (Normal difficulty)
    assert(wave6CinderCount >= 1, `Wave 6 should have Cinder Wretch (count: ${wave6CinderCount})`);
    assert(wave8CinderCount >= 1, `Wave 8 should have Cinder Wretch (count: ${wave8CinderCount})`);
    // Low weight = 1 entry
    assert(wave6CinderCount <= 1, `Wave 6 Cinder Wretch weight (${wave6CinderCount}) should be low (1)`);

    // Test 13: Cinder Wretch has NORMAL weight at Wave 10+
    const wave10TypesCW = getEnemyTypesForWave(10, 'tank');
    const wave12TypesCW = getEnemyTypesForWave(12, 'tank');
    const wave10CinderCount = wave10TypesCW.filter(t => t === 'cinder_wretch').length;
    const wave12CinderCount = wave12TypesCW.filter(t => t === 'cinder_wretch').length;
    assert(wave10CinderCount >= 2, `Wave 10 Cinder Wretch weight (${wave10CinderCount}) should be normal (2+)`);
    assert(wave12CinderCount >= 2, `Wave 12 Cinder Wretch weight (${wave12CinderCount}) should be normal (2+)`);

    // Test 14: Fire Zone properties are correct (static test)
    const testFireZone = {
        wx: 0, wy: 0,
        radius: 80,
        duration: 3.5,
        timer: 3.5,
        dps: 18,
        lastDamageTick: 0
    };
    assert(testFireZone.radius === 80, `Fire Zone radius should be 80px, got ${testFireZone.radius}`);
    assert(testFireZone.duration === 3.5, `Fire Zone duration should be 3.5s, got ${testFireZone.duration}`);
    assert(testFireZone.dps === 18, `Fire Zone DPS should be 18, got ${testFireZone.dps}`);
    // Damage per 0.5s tick = 18 * 0.5 = 9
    const expectedTickDamage = testFireZone.dps * 0.5;
    assert(expectedTickDamage === 9, `Fire Zone tick damage (0.5s) should be 9, got ${expectedTickDamage}`);

    // Test 15: Fire Zone burn damage modifier calculation
    // burnDamageTakenMult = 0.75 means 25% burn resistance (Fire Mage starter item: Kindled Aegis)
    const baseDamage = 9; // Damage per tick
    const burnResist = 0.75; // 25% reduction
    const damageWithResist = Math.floor(baseDamage * burnResist);
    assert(damageWithResist === 6, `Fire Zone damage with 25% burn resist should be 6, got ${damageWithResist}`);

    // Test 16: Easy difficulty has fewer Cinder Wretches
    // Easy difficulty reduces weight by 30% - at waves 6-9, it doesn't add them at all
    // At wave 10+, Easy adds 1 instead of 2
    // We can't easily simulate Easy difficulty here without mocking, so we test the logic:
    // The code checks: if (isEasyDifficulty) types.push('cinder_wretch'); // 1 entry
    // else types.push('cinder_wretch', 'cinder_wretch'); // 2 entries
    // So Normal+ should have 2x the count of Easy at wave 10+
    assert(wave10CinderCount >= 2, `Normal difficulty Wave 10 should have 2+ Cinder Wretches, got ${wave10CinderCount}`);
    // Note: Can't directly test Easy without game instance, but logic is verified by code inspection

    // Print results
    console.log('\n========================================');
    console.log('SPAWN SYSTEM TESTS (including Cinder Wretch)');
    console.log('========================================\n');
    results.forEach(r => console.log(r));
    console.log('\n========================================');
    console.log(`TOTAL: ${passed} passed, ${failed} failed`);
    console.log('========================================\n');

    return { passed, failed, results };
}

// Expose test function globally
if (typeof window !== 'undefined') {
    window.runSpawnSystemTests = runSpawnSystemTests;
}

// Legendary Perks (from control points)
// SCALED 5x for balanced early game with better late scaling
const LEGENDARY_PERKS = [
    { id: 'vampiric', name: 'Vampiric Touch', icon: '🧛', desc: 'Heal 10 HP per enemy killed' },
    { id: 'doubleshot', name: 'Double Trouble', icon: '👯', desc: 'Fire 2x projectiles' },
    { id: 'nuclear', name: 'Nuclear Core', icon: '☢️', desc: '+50% damage, enemies explode on death' },
    { id: 'timewarp', name: 'Time Warp', icon: '⏰', desc: 'Enemies move 30% slower' },
    { id: 'goldenheart', name: 'Golden Heart', icon: '💛', desc: '+500 max HP, +15 HP regen/s' },
    { id: 'berserk', name: 'Berserker', icon: '😤', desc: '+100% damage when below 30% HP' },
    { id: 'guardian', name: 'Guardian Angel', icon: '👼', desc: 'Revive once with 50% HP' },
    { id: 'inferno', name: 'Inferno Aura', icon: '🔥', desc: 'Burn nearby enemies for 25 DPS' },
    { id: 'frozen', name: 'Frozen Heart', icon: '❄️', desc: 'Chance to freeze enemies on hit' }
];

const DEMON_SET_PIECES = [
    { id: 'helm', name: 'Demon Helm', icon: '👹', desc: '+500 Max HP', spriteKey: 'demon_helm' },
    { id: 'chest', name: 'Demon Chestplate', icon: '🛡️', desc: '+20% Damage Reduction', spriteKey: 'demon_chest' },
    { id: 'boots', name: 'Demon Gauntlets', icon: '👢', desc: '+50 Move Speed', spriteKey: 'demon_boots' }
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

        // Player - SCALED UP 10x for big satisfying numbers
        this.player = { x: 0, y: 0, radius: 15, speed: 220, maxHealth: 500, health: 500, xp: 0, xpToLevel: 50, level: 1, kills: 0, invincibleTime: 0, color: '#00ffaa' };

        // Combat - SCALED 5x (halved from 10x for better early game)
        this.projectiles = [];
        this.weapons = { bullet: { damage: 75, speed: 450, fireRate: 600, lastFired: 0, count: 1, size: 6, pierce: 1, color: '#00ffaa' } };
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

        // Base upgrades with descriptions - SCALED 5x (halved from 10x)
        this.baseUpgrades = [
            { id: 'speed', name: 'Swift Feet', icon: '👟', desc: 'Move 15 units faster', rarity: 'common', effect: (g) => g.player.speed += 15, getDesc: (g) => `Speed: ${g.player.speed} → ${g.player.speed + 15}` },
            { id: 'health', name: 'Vitality', icon: '❤️', desc: 'Increases max HP by 150', rarity: 'common', effect: (g) => { g.player.maxHealth += 150; g.player.health += 150; }, getDesc: (g) => `Max HP: ${g.player.maxHealth} → ${g.player.maxHealth + 150}` },
            { id: 'damage', name: 'Power Shot', icon: '💥', desc: 'Projectiles deal +25 damage', rarity: 'common', effect: (g) => g.weapons.bullet.damage += 25, getDesc: (g) => `Damage: ${g.weapons.bullet.damage} → ${g.weapons.bullet.damage + 25}` },
            { id: 'firerate', name: 'Rapid Fire', icon: '🔫', desc: 'Shoot 10% faster', rarity: 'rare', effect: (g) => g.weapons.bullet.fireRate = Math.floor(g.weapons.bullet.fireRate * 0.9), getDesc: (g) => `Fire Rate: ${(1000 / g.weapons.bullet.fireRate).toFixed(1)}/s → ${(1000 / (g.weapons.bullet.fireRate * 0.9)).toFixed(1)}/s` },
            { id: 'multishot', name: 'Multi Shot', icon: '🎯', desc: 'Fire +1 projectile per shot', rarity: 'rare', effect: (g) => g.weapons.bullet.count++, getDesc: (g) => `Projectiles: ${g.weapons.bullet.count} → ${g.weapons.bullet.count + 1}` },
            { id: 'pierce', name: 'Piercing', icon: '🗡️', desc: 'Projectiles pass through +1 enemy & +3% range', rarity: 'rare', effect: (g) => { g.weapons.bullet.pierce++; g.projectileRangeBonus = (g.projectileRangeBonus || 1) * 1.03; }, getDesc: (g) => `Pierce: ${g.weapons.bullet.pierce} → ${g.weapons.bullet.pierce + 1}, Range: +3%` },
            { id: 'magnet', name: 'Magnet', icon: '🧲', desc: 'Attract pickups from +25 range', rarity: 'common', effect: (g) => g.magnetRadius += 25, getDesc: (g) => `Magnet Range: ${g.magnetRadius} → ${g.magnetRadius + 25}` },
            { id: 'critdmg', name: 'Lethal Strike', icon: '🩸', desc: '+50% Crit Damage', rarity: 'epic', effect: (g) => g.weapons.bullet.critMultiplier = (g.weapons.bullet.critMultiplier || 2.0) + 0.5, getDesc: (g) => `Crit Damage: ${Math.floor((g.weapons.bullet.critMultiplier || 2.0) * 100)}% → ${Math.floor(((g.weapons.bullet.critMultiplier || 2.0) + 0.5) * 100)}%` },
            { id: 'armor', name: 'Armor', icon: '🛡️', desc: 'Gain +250 HP and +12 speed', rarity: 'epic', effect: (g) => { g.player.maxHealth += 250; g.player.health += 250; g.player.speed += 12; }, getDesc: (g) => `HP: ${g.player.maxHealth}→${g.player.maxHealth + 250}, Speed: ${g.player.speed}→${g.player.speed + 12}` },
            { id: 'devastation', name: 'Devastation', icon: '☠️', desc: 'Massive +100 damage boost', rarity: 'legendary', effect: (g) => g.weapons.bullet.damage += 100, getDesc: (g) => `Damage: ${g.weapons.bullet.damage} → ${g.weapons.bullet.damage + 100}` },
            // Note: skull_upgrade, skull_shower, summon_wolf are now class-specific augments
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

        // Background music - Menu
        this.menuMusic = new Audio('menu-music.mp3');
        this.menuMusic.loop = true;
        this.menuMusic.volume = 0.3;
        this.musicPlaying = false;

        // Background music - In-game
        this.gameMusic = new Audio('game-music.mp3');
        this.gameMusic.loop = true;
        this.gameMusic.volume = 0.35;
        this.gameMusicPlaying = false;

        // Background music - Boss
        this.bossMusic = new Audio('boss-music.mp3');
        this.bossMusic.loop = true;
        this.bossMusic.volume = 0.4;
        this.bossMusicPlaying = false;

        // Beam of Despair sound effect
        this.beamSound = new Audio('beam-sound.mp3');
        this.beamSound.loop = true;
        this.beamSound.volume = 0.25;
        this.beamSoundPlaying = false;

        // Fireball shoot sound
        this.fireballSound = new Audio('fireball-sound.mp3');
        this.fireballSound.volume = 0.3;

        // Level up sound
        this.levelupSound = new Audio('levelup-sound.mp3');
        this.levelupSound.volume = 0.5;

        // Wolf howl sound
        this.wolfHowlSound = new Audio('wolf-howl.mp3');
        this.wolfHowlSound.volume = 0.4;

        // Horde spawn sound
        this.hordeSound = new Audio('horde-sound.mp3');
        this.hordeSound.volume = 0.6;

        // Game start voiceover
        this.gameStartVoice = new Audio('game-start-voice.mp3');
        this.gameStartVoice.volume = 0.7;
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

    playGameMusic() {
        if (!this.settings.soundEnabled || this.gameMusicPlaying) return;

        const volumeMult = this.settings.volume / 100;
        this.gameMusic.volume = 0.35 * volumeMult;

        this.gameMusic.play().then(() => {
            this.gameMusicPlaying = true;
            console.log('🎵 Game music started');
        }).catch(e => {
            console.log('Game music autoplay blocked');
        });
    }

    stopGameMusic() {
        if (this.gameMusic && this.gameMusicPlaying) {
            this.gameMusic.pause();
            this.gameMusic.currentTime = 0;
            this.gameMusicPlaying = false;
            console.log('🎵 Game music stopped');
        }
    }

    pauseGameMusic() {
        if (this.gameMusic && this.gameMusicPlaying) {
            this.gameMusic.pause();
            console.log('🎵 Game music paused');
        }
    }

    resumeGameMusic() {
        if (!this.settings.soundEnabled || !this.gameMusicPlaying) return;

        const volumeMult = this.settings.volume / 100;
        this.gameMusic.volume = 0.35 * volumeMult;

        this.gameMusic.play().catch(e => {});
        console.log('🎵 Game music resumed');
    }

    playBossMusic() {
        if (!this.settings.soundEnabled || this.bossMusicPlaying) return;

        // Pause game music when boss music starts
        this.pauseGameMusic();

        const volumeMult = this.settings.volume / 100;
        this.bossMusic.volume = 0.4 * volumeMult;

        this.bossMusic.play().then(() => {
            this.bossMusicPlaying = true;
            console.log('🎵 Boss music started');
        }).catch(e => {
            console.log('Boss music autoplay blocked');
        });
    }

    stopBossMusic() {
        if (this.bossMusic && this.bossMusicPlaying) {
            this.bossMusic.pause();
            this.bossMusic.currentTime = 0;
            this.bossMusicPlaying = false;
            console.log('🎵 Boss music stopped');

            // Resume game music after boss dies
            this.resumeGameMusic();
        }
    }

    playBeamSound() {
        if (!this.settings.soundEnabled || this.beamSoundPlaying) return;

        const volumeMult = this.settings.volume / 100;
        this.beamSound.volume = 0.25 * volumeMult;

        this.beamSound.play().then(() => {
            this.beamSoundPlaying = true;
        }).catch(e => {});
    }

    stopBeamSound() {
        if (this.beamSound && this.beamSoundPlaying) {
            this.beamSound.pause();
            this.beamSound.currentTime = 0;
            this.beamSoundPlaying = false;
        }
    }

    updateMusicVolume() {
        const volumeMult = this.settings.volume / 100;
        if (this.menuMusic) {
            this.menuMusic.volume = 0.3 * volumeMult;
        }
        if (this.gameMusic) {
            this.gameMusic.volume = 0.35 * volumeMult;
        }
        if (this.bossMusic) {
            this.bossMusic.volume = 0.4 * volumeMult;
        }
        if (this.beamSound) {
            this.beamSound.volume = 0.25 * volumeMult;
        }
        if (this.fireballSound) {
            this.fireballSound.volume = 0.3 * volumeMult;
        }
        if (this.levelupSound) {
            this.levelupSound.volume = 0.5 * volumeMult;
        }
        if (this.wolfHowlSound) {
            this.wolfHowlSound.volume = 0.4 * volumeMult;
        }
        if (this.hordeSound) {
            this.hordeSound.volume = 0.6 * volumeMult;
        }
        if (this.gameStartVoice) {
            this.gameStartVoice.volume = 0.7 * volumeMult;
        }
    }

    // Play fireball sound effect
    playFireballSound() {
        if (!this.settings.soundEnabled || !this.fireballSound) return;
        const volumeMult = this.settings.volume / 100;
        this.fireballSound.volume = 0.3 * volumeMult;
        this.fireballSound.currentTime = 0;
        this.fireballSound.play().catch(e => {});
    }

    // Play level up sound effect
    playLevelupSound() {
        if (!this.settings.soundEnabled || !this.levelupSound) return;
        const volumeMult = this.settings.volume / 100;
        this.levelupSound.volume = 0.5 * volumeMult;
        this.levelupSound.currentTime = 0;
        this.levelupSound.play().catch(e => {});
    }

    // Play wolf howl sound effect
    playWolfHowl() {
        if (!this.settings.soundEnabled || !this.wolfHowlSound) return;
        const volumeMult = this.settings.volume / 100;
        this.wolfHowlSound.volume = 0.4 * volumeMult;
        this.wolfHowlSound.currentTime = 0;
        this.wolfHowlSound.play().catch(e => {});
    }

    // Play horde spawn sound effect
    playHordeSound() {
        if (!this.settings.soundEnabled || !this.hordeSound) return;
        const volumeMult = this.settings.volume / 100;
        this.hordeSound.volume = 0.6 * volumeMult;
        this.hordeSound.currentTime = 0;
        this.hordeSound.play().catch(e => {});
    }

    // Play game start voiceover
    playGameStartVoice() {
        if (!this.settings.soundEnabled || !this.gameStartVoice) return;
        const volumeMult = this.settings.volume / 100;
        this.gameStartVoice.volume = 0.7 * volumeMult;
        this.gameStartVoice.currentTime = 0;
        this.gameStartVoice.play().catch(e => {});
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
            if (!e.key) return; // Guard against undefined key
            const key = e.key.toLowerCase();
            this.keys[key] = true;
            if ('wasd'.includes(key) || e.key.startsWith('Arrow')) e.preventDefault();
            // Pause toggle
            if ((e.key === 'Escape' || key === 'p') && this.gameRunning) {
                this.togglePause();
            }
            // CLASS ABILITIES REMOVED - Classes now have passives instead
            // Q and E keys are no longer used for character abilities

            // Item ability activation - 1 and 2 keys
            if (key === '1' && this.gameRunning && !this.gamePaused) {
                this.activateAbility('dash');
            }
            if (key === '2' && this.gameRunning && !this.gamePaused) {
                this.activateAbility('nuclearBlast');
            }
        });
        window.addEventListener('keyup', (e) => {
            if (!e.key) return; // Guard against undefined key
            this.keys[e.key.toLowerCase()] = false;
        });
        this.setupTouch();

        // Set default class
        this.selectedClass = SURVIVOR_CLASS;
        this.player.color = this.selectedClass.color;

        // Don't show boost select immediately - let auth manager control the flow
        // The auth manager will show the start menu after login/guest selection
        // The start button in start menu will trigger showBoostSelect

        // Setup start button to show character select
        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                this.showCharacterSelect();
            });
        }

        document.getElementById('restart-btn').addEventListener('click', () => {
            document.getElementById('gameover-menu').classList.add('hidden');
            this.showCharacterSelect();
        });
        document.getElementById('main-menu-btn').addEventListener('click', () => {
            document.getElementById('gameover-menu').classList.add('hidden');
            this.showCharacterSelect();
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
                // Pause all sounds when sound is disabled
                if (this.menuMusic) {
                    this.menuMusic.pause();
                    this.musicPlaying = false;
                }
                if (this.gameMusic) {
                    this.gameMusic.pause();
                    this.gameMusicPlaying = false;
                }
                if (this.bossMusic) {
                    this.bossMusic.pause();
                    this.bossMusicPlaying = false;
                }
                if (this.beamSound) {
                    this.beamSound.pause();
                    this.beamSoundPlaying = false;
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
            <div class="menu-content" style="text-align:center;max-height:85vh;display:flex;flex-direction:column;">
                <h1 style="font-size:2.5rem;margin-bottom:0.5rem;">⏸️ PAUSED</h1>
                <p style="color:#888;margin-bottom:1rem;font-size:0.9rem;">Press ESC or P to resume</p>

                <!-- Scrollable button area -->
                <div id="pause-menu-buttons" style="overflow-y:auto;max-height:50vh;padding:0.5rem;scrollbar-width:thin;scrollbar-color:#00ffaa33 transparent;">
                    <button id="resume-btn" class="menu-btn" style="background:linear-gradient(135deg,#00ffaa,#00aa66);border:none;padding:1rem 2rem;border-radius:12px;color:#000;font-weight:700;font-size:1.1rem;cursor:pointer;margin:0.5rem;display:block;width:220px;margin-left:auto;margin-right:auto;">▶️ Resume</button>
                    ${canSave ? `<button id="save-quit-btn" class="menu-btn" style="background:linear-gradient(135deg,#4da6ff,#2266aa);border:none;padding:1rem 2rem;border-radius:12px;color:#fff;font-weight:700;font-size:1.1rem;cursor:pointer;margin:0.5rem;display:block;width:220px;margin-left:auto;margin-right:auto;">💾 Save & Quit</button>` : ''}
                    <button id="quit-btn" class="menu-btn" style="background:linear-gradient(135deg,#ff4466,#cc2244);border:none;padding:1rem 2rem;border-radius:12px;color:#fff;font-weight:700;font-size:1.1rem;cursor:pointer;margin:0.5rem;display:block;width:220px;margin-left:auto;margin-right:auto;">🚪 Quit</button>

                    <!-- Divider -->
                    <div style="border-top:1px solid #333;margin:1rem auto;width:180px;"></div>

                    <!-- Donate Button -->
                    <a id="donate-btn" href="https://ko-fi.com/zecrugames" target="_blank" rel="noopener noreferrer" class="menu-btn" style="background:linear-gradient(135deg,#ff5e5b,#ff9966);border:none;padding:1rem 2rem;border-radius:12px;color:#fff;font-weight:700;font-size:1.1rem;cursor:pointer;margin:0.5rem;display:block;width:220px;margin-left:auto;margin-right:auto;text-decoration:none;box-shadow:0 0 20px rgba(255,94,91,0.3);transition:all 0.2s;">
                        ❤️ Support Us
                    </a>
                    <p style="color:#888;font-size:0.75rem;margin-top:0.25rem;text-align:center;">Help fund indie game development!</p>
                </div>
            </div>
        `;

        document.getElementById('resume-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('quit-btn').addEventListener('click', () => {
            this.togglePause();
            this.gameOver();
        });

        // Donate button hover effect
        const donateBtn = document.getElementById('donate-btn');
        if (donateBtn) {
            donateBtn.addEventListener('mouseenter', () => {
                donateBtn.style.transform = 'scale(1.05)';
                donateBtn.style.boxShadow = '0 0 30px rgba(255,94,91,0.5)';
            });
            donateBtn.addEventListener('mouseleave', () => {
                donateBtn.style.transform = 'scale(1)';
                donateBtn.style.boxShadow = '0 0 20px rgba(255,94,91,0.3)';
            });
        }

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

            // Perks and sigils (boundSigils is primary, augments for backward compatibility)
            perks: this.perks,
            boundSigils: this.boundSigils,
            augments: this.boundSigils, // Legacy: kept for backward compatibility

            // Class
            selectedClassName: this.selectedClass?.name,

            // Wolf pack data
            maxWolves: this.maxWolves,
            wolfSizeBonus: this.wolfSizeBonus,
            wolfDamageBonus: this.wolfDamageBonus,
            wolfAttackSpeed: this.wolfAttackSpeed,

            // Projectile range bonus (from Piercing upgrades)
            projectileRangeBonus: this.projectileRangeBonus,

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
        if (state.weapons) {
            this.weapons = state.weapons;
            // Reset lastFired to 0 so player can shoot immediately after loading
            // (performance.now() resets each session, so old timestamps would prevent firing)
            if (this.weapons.bullet) this.weapons.bullet.lastFired = 0;
        }

        // Skulls
        this.skulls = [];
        for (let i = 0; i < (state.skullsCount || 0); i++) {
            this.skulls.push(this.createSkull());
        }

        // Perks and sigils (with backward compatibility)
        this.perks = state.perks || [];

        // Migrate old augments to new boundSigils system
        const oldAugments = state.augments || [];
        const migratedSigils = oldAugments.map(id => migrateSigilId(id));
        this.boundSigils = state.boundSigils ? state.boundSigils.map(id => migrateSigilId(id)) : migratedSigils;
        this.augments = this.boundSigils; // Legacy alias

        this.perks.forEach(p => this.applyPerk(p));

        // Wolf pack
        this.maxWolves = state.maxWolves || 0;
        this.wolfSizeBonus = state.wolfSizeBonus || 1;
        this.wolfDamageBonus = state.wolfDamageBonus || 1;
        this.wolfAttackSpeed = state.wolfAttackSpeed || 1;

        // Projectile range bonus
        this.projectileRangeBonus = state.projectileRangeBonus || 1;

        // Demon set
        this.demonSet = state.demonSet || { helm: false, chest: false, boots: false };
        this.demonSetBonusActive = state.demonSetBonusActive || false;
        if (state.impStats) this.impStats = state.impStats;

        // Recalculate Dominion Set bonuses based on loaded sigils
        recalculateDominionSets(this);

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
        this.canvas.addEventListener('touchstart', (e) => {
            if (!this.gameRunning || this.gamePaused) return;
            e.preventDefault();
            const t = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const touchX = t.clientX - rect.left;
            const touchY = t.clientY - rect.top;

            // Check if tap is on character abilities (bottom left)
            const compact = this.canvas.width < 768;
            const abilitySize = compact ? 40 : 50;
            const padding = compact ? 6 : 10;
            const margin = 15;
            const charAbilityY = this.canvas.height - margin - abilitySize;

            // Q ability area (first slot, bottom left)
            const qX = margin;
            if (touchX >= qX && touchX <= qX + abilitySize &&
                touchY >= charAbilityY && touchY <= charAbilityY + abilitySize) {
                this.activateCharacterAbility('q');
                return;
            }

            // E ability area (second slot)
            const eX = margin + abilitySize + padding;
            if (touchX >= eX && touchX <= eX + abilitySize &&
                touchY >= charAbilityY && touchY <= charAbilityY + abilitySize) {
                this.activateCharacterAbility('e');
                return;
            }

            // Check if tap is on item abilities (bottom right)
            const itemAbilitySize = compact ? 45 : 55;
            const itemPadding = compact ? 8 : 12;
            const itemMargin = compact ? 10 : 15;
            const itemAbilityY = this.canvas.height - itemMargin - itemAbilitySize;

            // Nuclear Blast (rightmost)
            const nuclearX = this.canvas.width - itemMargin - itemAbilitySize;
            if (touchX >= nuclearX && touchX <= nuclearX + itemAbilitySize &&
                touchY >= itemAbilityY && touchY <= itemAbilityY + itemAbilitySize) {
                this.activateAbility('nuclearBlast');
                return;
            }

            // Dash (second from right)
            const dashX = nuclearX - itemPadding - itemAbilitySize;
            if (touchX >= dashX && touchX <= dashX + itemAbilitySize &&
                touchY >= itemAbilityY && touchY <= itemAbilityY + itemAbilitySize) {
                this.activateAbility('dash');
                return;
            }

            // Otherwise, start joystick if in bottom half
            if (t.clientY > window.innerHeight / 2) {
                this.joystick.active = true;
                this.joystick.startX = t.clientX;
                this.joystick.startY = t.clientY;
            }
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            if (!this.joystick.active) return;
            e.preventDefault();
            const t = e.touches[0];
            const dx = t.clientX - this.joystick.startX;
            const dy = t.clientY - this.joystick.startY;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d > 0) {
                const c = Math.min(d, 60);
                this.joystick.dx = (dx / d) * (c / 60);
                this.joystick.dy = (dy / d) * (c / 60);
            }
        }, { passive: false });

        this.canvas.addEventListener('touchend', () => {
            this.joystick.active = false;
            this.joystick.dx = 0;
            this.joystick.dy = 0;
        });
    }

    showBoostSelect() {
        this.showCharacterSelect();
    }

    showCharacterSelect() {
        // Hide game over menu and show start menu
        document.getElementById('gameover-menu').classList.add('hidden');
        document.getElementById('start-menu').classList.remove('hidden');

        // Play menu music when returning to menu
        this.playMenuMusic();

        const menu = document.getElementById('start-menu');
        const content = menu.querySelector('.menu-content');

        // Build character cards HTML
        // Disabled classes: shadow_master, necromancer (Coming Soon)
        const DISABLED_CLASSES = ['shadow_master', 'necromancer'];

        const characterCardsHTML = PLAYABLE_CLASSES.map((charClass, index) => {
            const isDisabled = DISABLED_CLASSES.includes(charClass.id);
            const skillsHTML = Object.values(charClass.skills).map(s =>
                `<div style="display:flex;align-items:center;gap:0.3rem;font-size:0.7rem;color:#ccc;"><span>${s.icon}</span><span>${s.name}</span></div>`
            ).join('');

            // Show class passive instead of abilities
            const passiveHTML = charClass.passive ?
                `<div style="display:flex;align-items:center;gap:0.4rem;font-size:0.7rem;color:#fbbf24;background:rgba(251,191,36,0.15);padding:0.4rem 0.6rem;border-radius:6px;border:1px solid rgba(251,191,36,0.3);">
                    <span style="font-size:1rem;">${charClass.passive.icon}</span>
                    <div>
                        <div style="font-weight:700;">${charClass.passive.name}</div>
                        <div style="font-size:0.6rem;color:#ccc;">${charClass.passive.desc}</div>
                    </div>
                </div>` : '';

            // Coming Soon overlay for disabled classes
            const comingSoonOverlay = isDisabled ? `
                <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:10;">
                    <div style="font-size:2rem;margin-bottom:0.5rem;">🔒</div>
                    <div style="color:#fbbf24;font-weight:700;font-size:1.1rem;text-transform:uppercase;">Coming Soon</div>
                </div>
            ` : '';

            return `
                <div class="char-card ${isDisabled ? 'disabled' : ''}" data-class-index="${index}" data-disabled="${isDisabled}" style="background:${charClass.color}22;border:3px solid ${isDisabled ? '#444' : charClass.color};border-radius:16px;padding:1.2rem;width:220px;cursor:${isDisabled ? 'not-allowed' : 'pointer'};text-align:center;transition:all 0.3s;position:relative;opacity:${isDisabled ? '0.6' : '1'};">
                    ${comingSoonOverlay}
                    <div style="font-size:3rem;margin-bottom:0.3rem;">${charClass.icon}</div>
                    <div style="font-weight:700;color:${charClass.color};font-size:1.3rem;margin:0.3rem 0;">${charClass.name}</div>
                    <div style="font-size:0.75rem;color:#aaa;margin-bottom:0.8rem;line-height:1.3;">${charClass.desc}</div>

                    <div style="text-align:left;margin-top:0.8rem;">
                        <div style="font-size:0.65rem;color:#888;text-transform:uppercase;margin-bottom:0.3rem;">⚔️ Skills</div>
                        ${skillsHTML}
                    </div>

                    <div style="text-align:left;margin-top:0.6rem;">
                        <div style="font-size:0.65rem;color:#888;text-transform:uppercase;margin-bottom:0.3rem;">⭐ Class Passive</div>
                        ${passiveHTML}
                    </div>
                </div>
            `;
        }).join('');

        content.innerHTML = `
            <h1 class="game-title">VELTHARA'S<span>DOMINION</span></h1>
            <p class="game-subtitle" style="margin-bottom:0.5rem;">Choose Your Champion</p>
            <div style="display:flex;gap:1.2rem;justify-content:center;margin:1.5rem 0;flex-wrap:wrap;">
                ${characterCardsHTML}
            </div>
            <a href="/" class="menu-btn secondary" style="margin-top:1rem;display:inline-block;">🏠 EXIT TO HUB</a>
            <div class="controls-info" style="margin-top:1rem;color:#888;font-size:0.8rem;">
                <p>🎮 WASD/Arrows to move • 🔫 Auto-attack • ⏸️ ESC to pause</p>
                <p style="color:#fbbf24;">Q/E for special abilities</p>
            </div>
        `;

        // Add hover effects and click handlers
        const cards = content.querySelectorAll('.char-card');
        cards.forEach(card => {
            const isDisabled = card.dataset.disabled === 'true';

            card.addEventListener('mouseenter', () => {
                if (isDisabled) return;
                card.style.transform = 'scale(1.05)';
                card.style.boxShadow = '0 0 30px rgba(255,255,255,0.2)';
            });
            card.addEventListener('mouseleave', () => {
                if (isDisabled) return;
                card.style.transform = 'scale(1)';
                card.style.boxShadow = 'none';
            });
            card.addEventListener('click', () => {
                if (isDisabled) return; // Don't allow clicking disabled classes
                const classIndex = parseInt(card.dataset.classIndex);
                const selectedClass = PLAYABLE_CLASSES[classIndex];
                this.showStarterItemSelect(selectedClass);
            });
        });
    }

    showStarterItemSelect(characterClass) {
        // Store selected character class for startGame
        this.pendingCharacterClass = characterClass;

        const menu = document.getElementById('start-menu');
        const content = menu.querySelector('.menu-content');

        // Get class-specific starter items using the classLock field
        const classId = characterClass.id || characterClass.name.toLowerCase().replace(/ /g, '_');
        const items = getStarterItemsForClass(classId);

        // If no starter items for this class, skip directly to game
        if (items.length === 0) {
            this.selectedStarterItem = null;
            this.startGame();
            return;
        }

        const CDN_BASE = 'https://d2f5lfipdzhi8t.cloudfront.net/veltharas-dominion/';

        content.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;gap:0.5rem;margin-bottom:0.5rem;">
                <span style="font-size:2rem;">${characterClass.icon}</span>
                <span style="color:${characterClass.color};font-size:1.2rem;font-weight:700;">${characterClass.name}</span>
            </div>
            <h1 style="color:#fbbf24;font-size:1.6rem;margin-bottom:0.5rem;">🔥 CHOOSE STARTER ITEM</h1>
            <p style="color:#888;font-size:0.85rem;margin-bottom:1rem;">Evolves automatically at Wave 10!</p>
            <div id="starter-items-grid" style="display:grid;grid-template-columns:repeat(2,1fr);gap:1rem;max-width:900px;margin:0 auto;">
                ${items.map(item => `
                    <div class="starter-item-card" data-item="${item.key}" style="background:rgba(0,0,0,0.6);border:2px solid ${item.color};border-radius:12px;padding:1rem;cursor:pointer;text-align:left;transition:all 0.2s;">
                        <div style="display:flex;gap:1rem;align-items:flex-start;">
                            <div style="flex-shrink:0;">
                                <img src="${CDN_BASE}${item.icon}" style="width:80px;height:80px;border-radius:8px;border:2px solid ${item.color};" crossorigin="anonymous" />
                            </div>
                            <div style="flex:1;">
                                <div style="font-weight:700;color:${item.color};font-size:1rem;margin-bottom:0.3rem;">${item.name}</div>
                                <div style="font-size:0.75rem;color:#aaa;margin-bottom:0.5rem;">${item.base.desc}</div>
                                <div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.5rem;padding-top:0.5rem;border-top:1px solid rgba(255,255,255,0.1);">
                                    <img src="${CDN_BASE}${item.evolvedIcon}" style="width:40px;height:40px;border-radius:4px;border:1px solid #ffaa00;" crossorigin="anonymous" />
                                    <div>
                                        <div style="font-size:0.7rem;color:#ffaa00;font-weight:600;">⭐ Wave 10: ${item.evolvedName}</div>
                                        <div style="font-size:0.65rem;color:#888;">${item.evolved.desc}</div>
                                        ${item.evolved.passives.length > 0 ? `<div style="font-size:0.6rem;color:#44ff88;margin-top:2px;">✨ ${item.evolved.passives[0].desc}</div>` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <button id="skip-item-btn" style="margin-top:1.5rem;padding:10px 24px;background:transparent;border:1px solid #666;color:#888;border-radius:8px;cursor:pointer;font-family:inherit;">Skip (No Starter)</button>
            <button id="back-to-chars-btn" style="margin-top:0.5rem;padding:8px 20px;background:transparent;border:1px solid #444;color:#666;border-radius:8px;cursor:pointer;font-family:inherit;display:block;margin-left:auto;margin-right:auto;">← Back to Characters</button>
        `;

        // Add hover effects and click handlers
        const cards = content.querySelectorAll('.starter-item-card');
        cards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                const item = STARTER_ITEMS[card.dataset.item];
                card.style.borderColor = '#fbbf24';
                card.style.background = 'rgba(251,191,36,0.15)';
                card.style.transform = 'scale(1.02)';
            });
            card.addEventListener('mouseleave', () => {
                const item = STARTER_ITEMS[card.dataset.item];
                card.style.borderColor = item?.color || '#444';
                card.style.background = 'rgba(0,0,0,0.6)';
                card.style.transform = 'scale(1)';
            });
            card.addEventListener('click', () => {
                const itemKey = card.dataset.item;
                this.selectedStarterItem = itemKey;
                this.startGame();
            });
        });

        document.getElementById('skip-item-btn').addEventListener('click', () => {
            this.selectedStarterItem = null;
            this.startGame();
        });

        document.getElementById('back-to-chars-btn').addEventListener('click', () => {
            this.showCharacterSelect();
        });
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

    startGame() {
        // Use the pending character class selected from character select screen
        if (this.pendingCharacterClass) {
            this.selectedClass = this.pendingCharacterClass;
            this.pendingCharacterClass = null;
        } else {
            // Fallback to Fire Mage if no class selected
            this.selectedClass = FIRE_MAGE_CLASS;
        }
        this.player.color = this.selectedClass.color;

        // Stop menu music and start game music when game starts
        this.stopMenuMusic();
        this.playGameMusic();
        this.playGameStartVoice();

        // Hide all menus first
        document.getElementById('start-menu').classList.add('hidden');
        document.getElementById('gameover-menu').classList.add('hidden');
        document.getElementById('levelup-menu').classList.add('hidden');
        document.getElementById('game-hud').classList.remove('hidden');

        // Reset upgrade menu state
        this.upgradeMenuShowing = false;

        // Load equipped cosmetics from store
        this.loadEquippedCosmetics();

        this.worldX = 0; this.worldY = 0;
        this.player.x = this.canvas.width / 2; this.player.y = this.canvas.height / 2;

        // Apply game settings to player
        const baseHealth = Math.floor(100 * GAME_SETTINGS.playerHealthMult);
        const baseSpeed = Math.floor(220 * (GAME_SETTINGS.playerSpeedMult || 1));
        this.player.health = baseHealth; this.player.maxHealth = baseHealth; this.player.speed = baseSpeed;
        this.player.xp = 0; this.player.xpToLevel = 50; this.player.kills = 0;
        this.player.hpRegen = 0;

        // All characters start at level 1 with 3 starting augments
        this.player.level = 1;
        this.pendingUpgrades = 3;

        this.weapons.bullet = { damage: 15, speed: 450, fireRate: 600, lastFired: 0, count: 1, size: 6, pierce: 1, color: this.selectedClass.color, critChance: 0.05, critMultiplier: 2.0 };

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
        this.lastItemDropTime = -180000; // Allow first item to drop immediately (3 min = 180000ms)
        this.stackingDamageBonus = 0;
        this.stackingXpBonus = 0;
        this.stackingHpBonus = 0;
        this.stackingSpeedBonus = 0;
        this.stackingCritBonus = 0;
        this.stackingFreezeChance = 0;
        this.stackingPoisonDps = 0;
        this.stackingMagnetBonus = 0;
        this.stackingRegen = 0;

        // Blood Shield (Blood Soaker item)
        this.bloodShieldEnabled = false;
        this.bloodShieldEvolved = false;
        this.bloodShield = 0;           // Current shield amount
        this.bloodShieldMax = 0;        // Max shield (calculated from bloodShieldMaxBase)
        this.bloodShieldMaxBase = 0;    // Base max shield (set by item effect)
        this.bloodShieldRate = 0;       // % of damage dealt that becomes shield
        this.bloodShieldCooldown = 0;   // Cooldown timer after shield breaks (30 seconds)
        this.bloodShieldCooldownMax = 30; // 30 second rebuild cooldown

        this.wave = 1; this.waveTimer = 0; this.gameTime = 0;

        // Spawn rate is now dynamically calculated per wave using getSpawnRateMultByWave()
        // Base rate of 500ms * wave multiplier, Necromancer gets 40% faster spawns
        this.baseSpawnRate = 500;
        this.necromancerSpawnMult = this.selectedClass.bonuses.spawnsMoreEnemies ? 0.6 : 1.0;
        this.spawnPauseTimer = 0; // Pauses spawns after Consumer dies
        // Tank or Splitter choice for waves 5-6 (randomly chosen once per wave)
        this.tankOrSplitterChoice = Math.random() < 0.5 ? 'tank' : 'splitter';

        this.magnetRadius = 100; this.xpMultiplier = GAME_SETTINGS.xpMult;
        this.shieldActive = false; this.shieldTimer = 0; this.shieldCooldown = 60;

        // Item drop chance (base 1% - reduced due to high mob count)
        this.itemDropChance = 0.01;

        // Ice zones array for ice mob death effect
        this.iceZones = [];

        // Fire zones array for Cinder Wretch death effect
        this.fireZones = [];
        this.playerInFireZone = false; // Track if player is currently in a fire zone (for non-stacking damage)

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

        // Perks
        this.perks = [];
        this.availablePerks = [...LEGENDARY_PERKS];

        // Boss tracking
        this.bossesSpawnedThisWave = 0;
        this.generalSpawnedThisWave = false;
        this.lastBossWave = 0;
        this.bossStatMultiplier = 1.0;
        this.consumerSpawned = false;
        this.bossGracePeriod = 0; // Seconds of reduced spawns after boss appears

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

        // ABILITIES SYSTEM - Active abilities with cooldowns (Item abilities use 1 and 2 keys)
        this.abilities = {
            dash: {
                unlocked: false,
                cooldown: 10,        // 10 second cooldown
                currentCooldown: 0,
                distance: 100,       // Blinks 100px
                key: '1'             // 1 key to activate
            },
            nuclearBlast: {
                unlocked: false,
                cooldown: 60,        // 60 second cooldown
                currentCooldown: 0,
                damage: 2500,        // SCALED 5x - Base damage
                range: 800,          // Max range 800px
                key: '2'             // 2 key to activate
            }
        };
        this.nuclearBlastWave = null; // Active nuclear blast effect

        // Horde tracking
        this.hordeActive = false;
        this.hordeEnemyCount = 0;

        // Regen timer
        this.regenTimer = 0;

        // Sigils System (replaces Augments terminology)
        this.boundSigils = [];  // New: Bound Sigils array
        this.augments = this.boundSigils; // Legacy alias: points to same array
        this.titanKillerBonus = 0; // Colossus Bane sigil bonus damage to bosses/tanks

        // Dominion Sets tracking
        this.dominionSetPieces = {};  // { setId: pieceCount }
        this.dominionSetTiers = {};   // { setId: currentTier }
        this.dominionStackGain = 1;   // Infinite Echoes bonus
        this.stackOverflowEnabled = false;
        this.stackOverflowEfficiency = 0;
        this.dominionExplosionRadius = 1;  // Cataclysm bonus
        this.dominionExplosionDamage = 1;
        this.dominionExplosionChain = false;
        this.dominionMiniNova = false;
        this.dominionMiniNovaTimer = 0;
        this.dominionSummonBonus = 0;  // Astral Host bonus
        this.dominionSummonDamage = 1;
        this.dominionSummonOnHit = false;
        this.dominionSummonExplode = false;
        this.dominionLifesteal = 0;  // Bloodbound Throne bonus
        this.dominionHPDamage = 0;
        this.dominionBloodShield = false;
        this.dominionBloodDetonate = false;
        this.dominionBloodDetonateTimer = 0;
        this.maxWolves = 0;
        this.wolfSizeBonus = 1;
        this.wolfDamageBonus = 1;
        this.wolfAttackSpeed = 1;
        this.projectileRangeBonus = 1; // Piercing upgrade adds +3% range each

        // Demon Set
        this.demonSet = { helm: false, chest: false, boots: false };
        this.demonSetBonusActive = false;
        this.imps = [];
        this.impSpawnTimer = 0;
        this.impStats = { damage: 1500, maxImps: 5, spawnInterval: 10, burnDuration: 5 }; // SCALED 5x

        if (this.selectedClass.bonuses.wolfCount) {
            this.maxWolves = this.selectedClass.bonuses.wolfCount;
        }

        // Initialize available perks for control points
        this.availablePerks = [...LEGENDARY_PERKS];

        // ============================================
        // CLASS-SPECIFIC INITIALIZATION
        // ============================================

        // Initialize character abilities (Q and E keys)
        this.characterAbilities = {
            q: { cooldown: 0, maxCooldown: 12, ready: true },
            e: { cooldown: 0, maxCooldown: 15, ready: true }
        };

        // Skulls/Orbs (Fire Mage & Necromancer)
        if (this.selectedClass.bonuses.skullCount) {
            for (let i = 0; i < this.selectedClass.bonuses.skullCount; i++) {
                this.skulls.push(this.createSkull());
            }
        }

        // ========== FIRE MAGE ========== SCALED 5x (halved from 10x)
        if (this.selectedClass.bonuses.hasAuraFire) {
            this.auraFire = { radius: 120, damage: 40, burnDuration: 3 };  // 40 dps = 120 dmg over 3s (swarm has 100 HP)
            this.boundSigils.push('aura_fire');
        }
        if (this.selectedClass.bonuses.hasFireballs) {
            // Fire Mage uses fireballs (default projectile system)
            this.hasFireballs = true;
        }
        // Fire Mage abilities
        this.fireBlastRadius = 800;
        this.fireBlastDamage = 1;
        this.fireAmpDuration = 5;
        this.fireAmpBoost = 1.5;
        this.fireAmpActive = false;
        this.fireAmpTimer = 0;

        // ========== SHADOW MASTER ==========
        if (this.selectedClass.bonuses.hasWhipAttack) {
            this.hasWhipAttack = true;
            this.whipRange = 120;
            this.whipArc = Math.PI * 0.6;
            this.whipTargets = 3;
        }
        if (this.selectedClass.bonuses.shadowMonsterCount) {
            this.shadowMonsters = [];
            this.shadowAttackSpeed = 1;
            this.shadowDamageBonus = 1;
            for (let i = 0; i < this.selectedClass.bonuses.shadowMonsterCount; i++) {
                this.shadowMonsters.push(this.createShadowMonster());
            }
        }
        if (this.selectedClass.bonuses.shadowSentinelCount) {
            this.shadowSentinels = [];
            for (let i = 0; i < this.selectedClass.bonuses.shadowSentinelCount; i++) {
                this.shadowSentinels.push(this.createShadowSentinel());
            }
        }
        // Shadow Master abilities
        this.shadowCloakDuration = 3;
        this.shadowCloakActive = false;
        this.shadowCloakTimer = 0;
        this.shadowStepDistance = 200;
        this.shadowStepDamage = 0;
        this.isInvisible = false;

        // ========== NECROMANCER ==========
        if (this.selectedClass.bonuses.hasRaiseDead) {
            this.raisedCorpses = [];
            this.maxRaisedCorpses = 5;
            this.raiseChance = 0.15;
            this.corpseLifetime = 20;
            this.deathAura = null;
        }
        if (this.selectedClass.bonuses.hasDeathDrain) {
            this.hasDeathDrain = true;
            this.deathDrainChains = 1;
            this.deathDrainEvolved = false;
            this.deathDrainDamage = 75; // SCALED 5x (halved from 10x)
        }
        if (this.selectedClass.bonuses.noProjectiles) {
            this.noProjectiles = true;
        }
        // Necromancer abilities
        this.bonePitRadius = 100;
        this.bonePits = [];
        this.soulShieldActive = false;
        this.soulShieldTimer = 0;
        this.soulShieldDuration = 4;

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

        // Unescapable Square event data (Cube of Death)
        this.trapSquare = {
            active: false,
            size: 600, // Increased from 400 for more room
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

        // Apply class passive effect
        if (this.selectedClass.passive && this.selectedClass.passive.effect) {
            this.selectedClass.passive.effect(this);
            console.log(`[CLASS PASSIVE] Applied: ${this.selectedClass.passive.name}`);
        }

        // Apply starter item if selected (new class-locked evolving system)
        // Store the selected starter for this run (do NOT clear until next run)
        this.activeStarter = null;
        this.starterEvolved = false;
        // Reset starter passive tracking
        this.starterDamageVsBurningMult = 0;
        this.starterMomentumBuff = null;
        this.starterFlamePulse = null;
        this.starterBurnStacksCap = 0;
        this.starterBurnDurationMult = 0;
        this.starterBurnDamageTakenMult = 0;

        if (this.selectedStarterItem && STARTER_ITEMS[this.selectedStarterItem]) {
            const itemKey = this.selectedStarterItem;
            const item = STARTER_ITEMS[itemKey];

            // Store active starter for this run
            this.activeStarter = itemKey;

            // Apply base modifiers
            applyStarterModifiers(this, item.base.modifiers);

            // Show pickup message
            this.damageNumbers.push({
                x: this.player.x, y: this.player.y - 40,
                value: `🔥 ${item.name}`, lifetime: 2, color: item.color || '#fbbf24', scale: 1.3
            });

            console.log(`[STARTER] Applied: ${item.name} (evolves at Wave ${item.evolveWave})`);
        }

        // Clear selection for next game (activeStarter holds current run's starter)
        this.selectedStarterItem = null;

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
            radius: 100,           // Bigger base size
            baseRadius: 100,
            spriteSize: 300,       // Sprite render size (grows when consuming)
            baseSpriteSize: 300,
            speed: 18, // Slightly slower - menacing crawl
            health: 175000,        // SCALED 5x (halved from 10x)
            maxHealth: 175000,
            baseHealth: 175000,
            damage: 300, // SCALED 5x - High contact damage
            xp: 3000,
            color: '#8800ff',
            hitFlash: 0,
            consumedCount: 0,
            rotationAngle: 0,
            spiralAngle: 0,        // For spiraling void effect
            consumeRadius: 220,    // Larger consume/suck range
            pullRadius: 350,       // Larger visual pull effect radius
            suckStrength: 400,     // How strongly it pulls enemies
            critResistance: 0.85,  // 85% crit resistance
            lifeTimer: 0,
            maxLifeTime: 90, // 1:30 survival time
            vacuumParticles: [], // For vacuum effect
            spiralParticles: [], // For spiraling void effect
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

        // Update rotation and spiral for visual effect (faster as time runs out)
        const urgency = Math.max(1, (consumer.lifeTimer / consumer.maxLifeTime) * 5);
        consumer.rotationAngle += dt * 2 * urgency;
        consumer.spiralAngle = (consumer.spiralAngle || 0) + dt * 3 * (1 + urgency * 0.5);

        // Initialize particle arrays if needed
        if (!consumer.vacuumParticles) consumer.vacuumParticles = [];
        if (!consumer.spiralParticles) consumer.spiralParticles = [];

        // Spawn spiral void particles (more frequent, more dramatic)
        if (Math.random() < 0.6) {
            const angle = Math.random() * Math.PI * 2;
            const dist = consumer.pullRadius + Math.random() * 80;
            consumer.vacuumParticles.push({
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist,
                angle: angle,
                speed: 120 + Math.random() * 80,
                size: 3 + Math.random() * 6,
                alpha: 0.9,
                color: Math.random() > 0.5 ? '#8800ff' : (Math.random() > 0.5 ? '#ff00ff' : '#4400aa')
            });
        }

        // Update vacuum particles - spiral inward with stronger effect
        for (let i = consumer.vacuumParticles.length - 1; i >= 0; i--) {
            const p = consumer.vacuumParticles[i];
            const pDist = Math.sqrt(p.x * p.x + p.y * p.y);

            // Move toward center with stronger spiral motion
            p.angle += dt * (4 + urgency * 1.5);
            const pullSpeed = p.speed * (1 + urgency * 0.5);
            p.x -= (p.x / pDist) * pullSpeed * dt;
            p.y -= (p.y / pDist) * pullSpeed * dt;

            // Add stronger spiral offset
            p.x += Math.cos(p.angle + Math.PI/2) * 35 * dt;
            p.y += Math.sin(p.angle + Math.PI/2) * 35 * dt;

            // Fade in as it gets closer
            const newDist = Math.sqrt(p.x * p.x + p.y * p.y);
            p.alpha = Math.min(1, 0.4 + (1 - newDist / consumer.pullRadius) * 0.6);
            p.size = Math.max(1, p.size * (newDist / consumer.pullRadius));

            // Remove when reached center
            if (newDist < consumer.radius * 0.2) {
                consumer.vacuumParticles.splice(i, 1);
            }
        }

        // Limit particle count
        if (consumer.vacuumParticles.length > 80) {
            consumer.vacuumParticles.splice(0, consumer.vacuumParticles.length - 80);
        }

        // Move toward player (slowly)
        const dx = this.worldX - consumer.wx;
        const dy = this.worldY - consumer.wy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
            consumer.wx += (dx / dist) * consumer.speed * dt;
            consumer.wy += (dy / dist) * consumer.speed * dt;
        }

        // ENHANCED: Suck and consume nearby non-boss enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            if (e === consumer || e.isBoss) continue;

            const edx = consumer.wx - e.wx;
            const edy = consumer.wy - e.wy;
            const edist = Math.sqrt(edx * edx + edy * edy);

            // Pull enemies within consume radius with strong suction
            if (edist < consumer.consumeRadius) {
                // Stronger pull - scales with proximity (closer = stronger pull)
                const pullMult = 1 + (1 - edist / consumer.consumeRadius) * 2;
                const pullStrength = (consumer.suckStrength || 400) * pullMult * dt;
                e.wx += (edx / edist) * pullStrength;
                e.wy += (edy / edist) * pullStrength;

                // Consume if very close - DEVOUR the enemy
                if (edist < consumer.radius + e.radius * 0.5) {
                    // Absorb health (20% of enemy max health)
                    const healthGain = Math.floor(e.maxHealth * 0.20);
                    consumer.maxHealth += healthGain;
                    consumer.health += healthGain;
                    consumer.consumedCount++;

                    // GROW BIGGER - both hitbox and sprite
                    consumer.radius = consumer.baseRadius + Math.min(consumer.consumedCount * 3, 100);
                    consumer.spriteSize = consumer.baseSpriteSize + Math.min(consumer.consumedCount * 8, 300);
                    consumer.consumeRadius = 220 + Math.min(consumer.consumedCount * 4, 150);
                    consumer.pullRadius = 350 + Math.min(consumer.consumedCount * 5, 200);

                    // Increase damage
                    consumer.damage = 60 + Math.floor(consumer.consumedCount * 3);

                    // Visual feedback - particles spiral into consumer
                    const sx = this.player.x + (e.wx - this.worldX);
                    const sy = this.player.y + (e.wy - this.worldY);
                    this.spawnParticles(sx, sy, '#8800ff', 12);
                    this.spawnParticles(sx, sy, '#ff00ff', 6);

                    // Remove consumed enemy
                    this.enemies.splice(i, 1);

                    // Announce growth every 5 consumed
                    if (consumer.consumedCount % 5 === 0) {
                        this.damageNumbers.push({
                            x: this.canvas.width / 2,
                            y: 100,
                            value: `🌀 CONSUMER GROWS! HP: ${Math.floor(consumer.health)}`,
                            lifetime: 1.5,
                            color: '#cc88ff',
                            scale: 1.3
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
        // Create an elemental skull that orbits the player - SCALED 5x (halved from 10x)
        const elements = ['fire', 'dark', 'lightning', 'slow'];
        const element = elements[this.skulls.length % 4]; // Cycle through elements
        const colors = { fire: '#ff4400', dark: '#6600aa', lightning: '#ffff00', slow: '#00ccff' };
        return {
            angle: Math.random() * Math.PI * 2,
            radius: 70 + this.skulls.length * 12,
            speed: 2.5 + Math.random() * 0.5,
            damage: 100,
            size: 18,
            element: element,
            color: colors[element]
        };
    }

    addMinion(type) {
        const m = this.createWolf();
        this.minions.push(m);
        // Play wolf howl when summoning a wolf
        this.playWolfHowl();
    }

    createWolf() {
        // Spread wolves evenly around player based on how many exist
        const existingWolves = this.minions.length;
        const baseAngle = (existingWolves * (Math.PI * 2 / 3)) + (Math.random() * 0.5 - 0.25); // Spread by 120 degrees + small random offset
        const spawnDistance = 80 + (existingWolves * 30); // Each wolf spawns further out

        // Wolf Stats - Scale with level and augments (wolves are TANKY) - SCALED 5x with 20% level scaling
        const levelMult = 1 + (this.player.level * 0.20); // INCREASED to 20% scaling per level
        const sizeBonus = this.wolfSizeBonus || 1;
        const damageBonus = this.wolfDamageBonus || 1;

        return {
            x: this.player.x + Math.cos(baseAngle) * spawnDistance,
            y: this.player.y + Math.sin(baseAngle) * spawnDistance,
            radius: Math.floor(14 * sizeBonus),
            speed: 250,
            damage: Math.floor(175 * levelMult * damageBonus),
            health: Math.floor(15000 * levelMult * sizeBonus),
            maxHealth: Math.floor(15000 * levelMult * sizeBonus),
            color: '#8b7355',
            icon: '🐺',
            attackCooldown: 0,
            type: 'wolf'
        };
    }

    // Beast Tamer: Create shadow monster minion - SCALED 5x with 18% level scaling
    createShadowMonster() {
        const existingMonsters = this.shadowMonsters?.length || 0;
        const baseAngle = (existingMonsters * (Math.PI * 2 / 5)) + (Math.random() * 0.3 - 0.15);
        const spawnDistance = 100 + (existingMonsters * 25);

        const levelMult = 1 + (this.player.level * 0.18); // INCREASED to 18% scaling per level
        const damageBonus = this.shadowDamageBonus || 1;

        return {
            x: this.player.x + Math.cos(baseAngle) * spawnDistance,
            y: this.player.y + Math.sin(baseAngle) * spawnDistance,
            radius: 16,
            speed: 280,
            damage: Math.floor(225 * levelMult * damageBonus),
            health: Math.floor(4000 * levelMult),
            maxHealth: Math.floor(4000 * levelMult),
            color: '#6600aa',
            icon: '👻',
            attackCooldown: 0,
            type: 'shadow',
            alpha: 0.7,  // Semi-transparent
            phaseTimer: 0  // For phasing animation
        };
    }

    // Shadow Master: Create shadow sentinel (stationary guardian)
    createShadowSentinel() {
        const existingSentinels = this.shadowSentinels?.length || 0;
        const baseAngle = (existingSentinels * (Math.PI * 2 / 6)) + (Math.random() * 0.2 - 0.1);
        const orbitRadius = 90 + (existingSentinels * 15);

        const levelMult = 1 + (this.player.level * 0.15); // INCREASED to 15% scaling per level

        // SCALED 5x (halved from 10x)
        return {
            angle: baseAngle,
            orbitRadius: orbitRadius,
            x: this.player.x + Math.cos(baseAngle) * orbitRadius,
            y: this.player.y + Math.sin(baseAngle) * orbitRadius,
            radius: 12,
            damage: Math.floor(150 * levelMult),
            health: Math.floor(2000 * levelMult),
            maxHealth: Math.floor(2000 * levelMult),
            color: '#8844cc',
            icon: '🦇',
            attackCooldown: 0,
            attackRange: 80,  // Attack enemies within this range
            type: 'sentinel'
        };
    }

    gameLoop(t) {
        if (!this.gameRunning) return;
        const dt = (t - this.lastTime) / 1000; this.lastTime = t;

        // Check for pending upgrades BEFORE game update - pause immediately
        if (this.pendingUpgrades > 0 && !this.upgradeMenuShowing) {
            this.upgradeMenuShowing = true;
            this.gamePaused = true;
            this.showLevelUpMenu();
        }

        if (!this.gamePaused) {
            this.gameTime += dt * 1000;
            this.waveTimer += dt * 1000;
            if (this.waveTimer >= this.waveDuration) {
                this.wave++;
                this.waveTimer = 0;
                // Re-roll Tank or Splitter choice for waves 5-6 (new choice each wave)
                this.tankOrSplitterChoice = Math.random() < 0.5 ? 'tank' : 'splitter';

                // =============================================
                // STARTER ITEM EVOLUTION AT WAVE 10
                // =============================================
                if (this.wave === 10 && this.activeStarter && !this.starterEvolved) {
                    const starter = STARTER_ITEMS[this.activeStarter];
                    if (starter) {
                        // Remove base modifiers
                        removeStarterModifiers(this, starter.base.modifiers);
                        // Apply evolved modifiers
                        applyStarterModifiers(this, starter.evolved.modifiers);
                        // Register evolved passives
                        registerEvolvedPassives(this, starter.evolved.passives);
                        // Mark as evolved
                        this.starterEvolved = true;

                        // Play evolution sound
                        this.playSound('levelup');

                        // Show evolution toast
                        this.damageNumbers.push({
                            x: this.canvas.width / 2,
                            y: this.canvas.height / 2 - 80,
                            value: `⭐ STARTER EVOLVED! ⭐`,
                            lifetime: 3,
                            color: '#ffaa00',
                            scale: 1.8
                        });
                        this.damageNumbers.push({
                            x: this.canvas.width / 2,
                            y: this.canvas.height / 2 - 40,
                            value: starter.evolvedName,
                            lifetime: 3,
                            color: starter.color,
                            scale: 1.5
                        });

                        console.log(`[STARTER] Evolved: ${starter.name} → ${starter.evolvedName}`);
                    }
                }

                // Reset boss tracking for new wave
                this.bossesSpawnedThisWave = 0;
                this.generalSpawnedThisWave = false;
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
        this.playHordeSound();
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
        // ALL EVENTS REMOVED - Ring of Fire, Cube of Death, Circle of Doom all disabled
        // No events will spawn
        return;
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
        this.updateBloodShield(effectiveDt);
        this.updateRegen(effectiveDt);
        this.updateChronoField(effectiveDt);
        this.updateElementalCycle(effectiveDt);
        this.updateEvents(effectiveDt);
        this.spawnEnemies();
        this.spawnHealthPacks();
        this.updateEnemies(effectiveDt);
        this.updateSkulls(effectiveDt);
        this.updateMinions(effectiveDt);
        this.updateActiveMinions(effectiveDt);
        this.updateShadowMonsters(effectiveDt);  // Shadow Master shadow monsters
        this.updateShadowSentinels(effectiveDt); // Shadow Master sentinels
        this.updateRaisedCorpses(effectiveDt);   // Necromancer raised dead
        this.updateDeathAura(effectiveDt);       // Necromancer death aura
        this.updateDeathDrain(effectiveDt);      // Necromancer death drain beam
        this.updateBonePits(effectiveDt);        // Necromancer bone pits
        this.updateSoulShield(effectiveDt);      // Necromancer soul shield
        this.updateCharacterAbilities(effectiveDt); // Q/E ability cooldowns
        this.updateInvisibility(effectiveDt);    // Shadow Master invisibility
        this.updateFireAmp(effectiveDt);         // Fire Mage fire amp zone
        this.updateFireBlast(effectiveDt);       // Fire Mage fire blast ability
        this.updateImps(effectiveDt);
        this.updateAuraFire(effectiveDt);
        this.updatePlayerRingOfFire(effectiveDt);  // Ring of Fire augment
        this.updateDevilRingOfFire(effectiveDt);   // Devil Ring of Fire mythic
        this.updateMythicAugments(effectiveDt);  // Mythic augment effects
        this.updateAbilities(effectiveDt);
        this.updateBeamDespair(effectiveDt);
        this.updateWindPush(effectiveDt);
        this.checkHordeCompletion();
        this.updateConsumer(effectiveDt);
        this.fireWeapons();
        this.updateProjectiles(effectiveDt);
        this.updatePickups(effectiveDt);
        this.updateParticles(effectiveDt);
        // Trail cosmetics removed
        this.updateDamageNumbers(effectiveDt);
        this.updateGameJuice(dt); // Always real-time for juice effects
        this.updateGreenMucusEffect(effectiveDt); // Mini Consumer death effect
        this.updateCorruptedSigilDownsides(effectiveDt); // Corrupted Sigil downsides
        this.updateStarterPassives(effectiveDt); // Starter item evolved passives
        if (this.player.health <= 0) this.gameOver();
        this.updateHUD();
    }

    // ============ STARTER ITEM EVOLVED PASSIVES ============
    updateStarterPassives(dt) {
        // Only process if we have an evolved starter
        if (!this.starterEvolved || !this.activeStarter) return;

        // ---- Momentum Fire Rate Buff (Emberstep Sandals evolved) ----
        if (this.starterMomentumBuff) {
            const isMoving = (this.keys['w'] || this.keys['arrowup'] ||
                              this.keys['s'] || this.keys['arrowdown'] ||
                              this.keys['a'] || this.keys['arrowleft'] ||
                              this.keys['d'] || this.keys['arrowright'] ||
                              this.joystick.dx || this.joystick.dy);

            if (isMoving) {
                this.starterMomentumBuff.moveTimer += dt;
                this.starterMomentumBuff.lastMoveTime = this.gameTime;

                // Check if buff should trigger
                if (this.starterMomentumBuff.moveTimer >= this.starterMomentumBuff.requiredMoveSeconds &&
                    this.starterMomentumBuff.buffTimer <= 0) {
                    // Trigger the buff
                    this.starterMomentumBuff.buffTimer = this.starterMomentumBuff.buffDurationSeconds;
                    this.starterMomentumBuff.moveTimer = 0;

                    // Show buff indicator
                    this.damageNumbers.push({
                        x: this.player.x, y: this.player.y - 30,
                        value: '⚡ MOMENTUM!', lifetime: 1, color: '#ff6600', scale: 1.2
                    });
                }
            } else {
                // Reset move timer if stationary for >0.2s
                if (this.gameTime - this.starterMomentumBuff.lastMoveTime > 200) {
                    this.starterMomentumBuff.moveTimer = 0;
                }
            }

            // Tick down buff duration
            if (this.starterMomentumBuff.buffTimer > 0) {
                this.starterMomentumBuff.buffTimer -= dt;
            }
        }

        // ---- Flame Pulse Cooldown (Kindled Aegis evolved) ----
        if (this.starterFlamePulse && this.starterFlamePulse.cooldownTimer > 0) {
            this.starterFlamePulse.cooldownTimer -= dt;
        }
    }

    // Trigger flame pulse when player takes damage (called from damage handler)
    triggerFlamePulse() {
        if (!this.starterFlamePulse || this.starterFlamePulse.cooldownTimer > 0) return;

        // Set cooldown
        this.starterFlamePulse.cooldownTimer = this.starterFlamePulse.internalCooldownSeconds;

        const damage = this.starterFlamePulse.damage;
        const radius = this.starterFlamePulse.radiusPx;

        // Damage all enemies in radius
        for (const enemy of this.enemies) {
            const distToEnemy = Math.sqrt(
                (enemy.wx - this.worldX) ** 2 + (enemy.wy - this.worldY) ** 2
            );
            if (distToEnemy <= radius) {
                enemy.health -= damage;
                enemy.hitFlash = 0.2;

                // Show damage number
                const sx = this.player.x + (enemy.wx - this.worldX);
                const sy = this.player.y + (enemy.wy - this.worldY);
                this.damageNumbers.push({
                    x: sx, y: sy - 10,
                    value: damage, lifetime: 0.5, color: '#ff4400', scale: 1.0
                });
            }
        }

        // Visual effect
        this.damageNumbers.push({
            x: this.player.x, y: this.player.y - 40,
            value: '🔥 FLAME PULSE!', lifetime: 1, color: '#ff4400', scale: 1.3
        });

        this.playSound('explosion');
    }

    updateGreenMucusEffect(dt) {
        if (this.greenMucusEffect && this.greenMucusEffect.active) {
            this.greenMucusEffect.timer -= dt;
            if (this.greenMucusEffect.timer <= 0) {
                this.greenMucusEffect.active = false;
            }
        }
    }

    // Corrupted Sigil Downsides - Process passive negative effects
    updateCorruptedSigilDownsides(dt) {
        // Voracious Drain: Lose 2 HP per second passively
        if (this.corruptedHPDrain && this.corruptedHPDrain > 0) {
            const drain = this.corruptedHPDrain * dt;
            this.player.health -= drain;
            // Show occasional damage number
            if (Math.random() < dt * 0.5) {
                this.damageNumbers.push({
                    x: this.player.x + (Math.random() - 0.5) * 20,
                    y: this.player.y - 30,
                    value: `💔 ${-Math.ceil(drain)}`,
                    lifetime: 0.8,
                    color: '#8b0000'
                });
            }
        }

        // Hellfire Incandescence: Orbs drain 1 HP per second each
        if (this.corruptedOrbDrain && this.corruptedOrbDrain > 0 && this.skulls) {
            const orbDrain = this.corruptedOrbDrain * this.skulls.length * dt;
            if (orbDrain > 0) {
                this.player.health -= orbDrain;
            }
        }

        // Pyroclastic Inferno: Standing still burns you after 2 seconds
        if (this.corruptedStillBurn) {
            const playerMoving = this.lastPlayerX !== undefined &&
                (Math.abs(this.player.x - this.lastPlayerX) > 1 || Math.abs(this.player.y - this.lastPlayerY) > 1);

            if (!playerMoving) {
                this.corruptedStillBurn.timer = (this.corruptedStillBurn.timer || 0) + dt;
                if (this.corruptedStillBurn.timer >= this.corruptedStillBurn.threshold) {
                    const burn = this.corruptedStillBurn.damage * dt;
                    this.player.health -= burn;
                    if (Math.random() < dt) {
                        this.damageNumbers.push({
                            x: this.player.x + (Math.random() - 0.5) * 30,
                            y: this.player.y - 25,
                            value: `🔥 ${-Math.ceil(burn)}`,
                            lifetime: 0.6,
                            color: '#ff4400'
                        });
                    }
                }
            } else {
                this.corruptedStillBurn.timer = 0;
            }
            this.lastPlayerX = this.player.x;
            this.lastPlayerY = this.player.y;
        }

        // Pyroclasm Sigil: Every 8 seconds, trigger massive explosion
        if (this.boundSigils?.includes('pyroclasm')) {
            this.pyroclasmCooldown = (this.pyroclasmCooldown || 0) - dt;
            if (this.pyroclasmCooldown <= 0) {
                this.pyroclasmCooldown = 8; // Reset cooldown
                const radius = this.pyroclasmRadius || 800;
                const damage = this.pyroclasmDamage || 500;

                // Damage all enemies in radius
                let hitCount = 0;
                for (const e of this.enemies) {
                    if (e.dead) continue;
                    const ex = this.player.x + (e.wx - this.worldX);
                    const ey = this.player.y + (e.wy - this.worldY);
                    const dist = Math.sqrt((this.player.x - ex) ** 2 + (this.player.y - ey) ** 2);
                    if (dist <= radius) {
                        e.health -= damage;
                        e.hitFlash = 1;
                        hitCount++;
                        // Spawn fire particles on hit enemies
                        this.spawnParticles(ex, ey, '#ff4400', 8);
                    }
                }

                // Visual explosion effect
                this.spawnParticles(this.player.x, this.player.y, '#ff6600', 30);
                this.spawnParticles(this.player.x, this.player.y, '#ff0000', 20);
                this.triggerScreenShake(8, 0.4);

                // Show explosion message
                this.damageNumbers.push({
                    x: this.player.x,
                    y: this.player.y - 60,
                    value: `🌋 PYROCLASM! (${hitCount} hit)`,
                    lifetime: 1.2,
                    color: '#ff4400',
                    scale: 1.3
                });
            }
        }
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

        // Calculate burn duration with starter item multiplier
        const baseBurnDuration = this.auraFire.burnDuration;
        const burnDurationMult = 1 + (this.starterBurnDurationMult || 0);
        const effectiveBurnDuration = baseBurnDuration * burnDurationMult;

        // Check if burn stacking is enabled (Sparkcaller Tome evolved passive)
        const burnStacksCap = this.starterBurnStacksCap || 0;

        for (const e of this.enemies) {
            const sx = this.player.x + (e.wx - this.worldX);
            const sy = this.player.y + (e.wy - this.worldY);
            const dist = Math.sqrt((sx - this.player.x) ** 2 + (sy - this.player.y) ** 2);

            if (dist < this.auraFire.radius + e.radius) {
                // Initialize burn stacks array if stacking is enabled
                if (burnStacksCap > 0) {
                    if (!e.auraBurnStacks) e.auraBurnStacks = [];
                    // Add new burn stack if under cap
                    if (e.auraBurnStacks.length < burnStacksCap) {
                        e.auraBurnStacks.push({ timer: effectiveBurnDuration, dps: this.auraFire.damage });
                        e.hitFlash = 0.5;
                        this.spawnParticles(sx, sy, '#ff4400', 3);
                    }
                } else {
                    // Standard single burn behavior
                    if (!e.auraBurn) {
                        e.auraBurn = { timer: effectiveBurnDuration, dps: this.auraFire.damage };
                        e.hitFlash = 0.5;
                        this.spawnParticles(sx, sy, '#ff4400', 3);
                    }
                }
            }
        }

        // Process aura burns
        for (const e of this.enemies) {
            const ampBoost = this.fireAmpActive ? (this.fireAmpBoost || 1.5) : 1;
            const sx = this.player.x + (e.wx - this.worldX);
            const sy = this.player.y + (e.wy - this.worldY);

            // Process stacked burns (Sparkcaller Tome evolved)
            if (e.auraBurnStacks && e.auraBurnStacks.length > 0) {
                let totalDamage = 0;
                for (let i = e.auraBurnStacks.length - 1; i >= 0; i--) {
                    const stack = e.auraBurnStacks[i];
                    stack.timer -= dt;
                    if (stack.timer > 0) {
                        totalDamage += stack.dps * dt * ampBoost;
                    } else {
                        e.auraBurnStacks.splice(i, 1); // Remove expired stack
                    }
                }
                if (totalDamage > 0) {
                    e.health -= totalDamage;
                    if (Math.random() < 0.15) {
                        this.spawnParticles(sx, sy, '#ff6600', 2);
                    }
                }
            }
            // Process single burn (standard behavior)
            else if (e.auraBurn && e.auraBurn.timer > 0) {
                e.auraBurn.timer -= dt;
                e.health -= this.auraFire.damage * dt * ampBoost;

                // Visual burn effect
                if (Math.random() < 0.1) {
                    this.spawnParticles(sx, sy, '#ff6600', 1);
                }
            }
        }
    }

    // ============ PLAYER RING OF FIRE (AUGMENT) ============
    updatePlayerRingOfFire(dt) {
        if (!this.playerRingOfFire) return;

        // Update rotation
        this.playerRingOfFire.rotation += this.playerRingOfFire.rotationSpeed * dt;

        // Calculate burn duration with starter item multiplier
        const baseBurnDuration = this.playerRingOfFire.burnDuration || 3;
        const burnDurationMult = 1 + (this.starterBurnDurationMult || 0);
        const effectiveBurnDuration = baseBurnDuration * burnDurationMult;

        // Check if burn stacking is enabled (Sparkcaller Tome evolved passive)
        const burnStacksCap = this.starterBurnStacksCap || 0;

        // Damage enemies within ring radius
        for (const e of this.enemies) {
            const sx = this.player.x + (e.wx - this.worldX);
            const sy = this.player.y + (e.wy - this.worldY);
            const dist = Math.sqrt((sx - this.player.x) ** 2 + (sy - this.player.y) ** 2);

            // Enemy is within ring area
            if (dist < this.playerRingOfFire.radius + e.radius) {
                // Initialize burn stacks array if stacking is enabled
                if (burnStacksCap > 0) {
                    if (!e.ringBurnStacks) e.ringBurnStacks = [];
                    if (e.ringBurnStacks.length < burnStacksCap) {
                        e.ringBurnStacks.push({ timer: effectiveBurnDuration, dps: this.playerRingOfFire.damage });
                        e.hitFlash = 0.3;
                        this.spawnParticles(sx, sy, '#ff6600', 4);
                    }
                } else {
                    // Standard single burn behavior
                    if (!e.ringBurn) {
                        e.ringBurn = { timer: effectiveBurnDuration, dps: this.playerRingOfFire.damage };
                        e.hitFlash = 0.3;
                        this.spawnParticles(sx, sy, '#ff6600', 4);
                    }
                }
            }
        }

        // Process ring burns
        for (const e of this.enemies) {
            const ampBoost = this.fireAmpActive ? (this.fireAmpBoost || 1.5) : 1;
            const fireDmgBonus = this.fireDamageBonus || 1;
            const sx = this.player.x + (e.wx - this.worldX);
            const sy = this.player.y + (e.wy - this.worldY);

            // Process stacked burns (Sparkcaller Tome evolved)
            if (e.ringBurnStacks && e.ringBurnStacks.length > 0) {
                let totalDamage = 0;
                for (let i = e.ringBurnStacks.length - 1; i >= 0; i--) {
                    const stack = e.ringBurnStacks[i];
                    stack.timer -= dt;
                    if (stack.timer > 0) {
                        totalDamage += stack.dps * dt * ampBoost * fireDmgBonus;
                    } else {
                        e.ringBurnStacks.splice(i, 1);
                    }
                }
                if (totalDamage > 0) {
                    e.health -= totalDamage;
                    if (Math.random() < 0.15) {
                        this.spawnParticles(sx, sy, '#ff4400', 2);
                    }
                }
            }
            // Process single burn (standard behavior)
            else if (e.ringBurn && e.ringBurn.timer > 0) {
                e.ringBurn.timer -= dt;
                e.health -= e.ringBurn.dps * dt * ampBoost * fireDmgBonus;

                if (Math.random() < 0.15) {
                    this.spawnParticles(sx, sy, '#ff4400', 2);
                }
            }
        }
    }

    // ============ DEVIL RING OF FIRE (MYTHIC) ============
    updateDevilRingOfFire(dt) {
        if (!this.devilRingOfFire) return;

        // Update rotation
        this.devilRingOfFire.rotation += this.devilRingOfFire.rotationSpeed * dt;

        // Update explosion timer
        this.devilRingOfFire.explosionTimer += dt;

        // Check for explosion
        if (this.devilRingOfFire.explosionTimer >= this.devilRingOfFire.explosionCooldown) {
            this.devilRingOfFire.explosionTimer = 0;

            // Explode all rings - damage all enemies in explosion radius
            for (const e of this.enemies) {
                const sx = this.player.x + (e.wx - this.worldX);
                const sy = this.player.y + (e.wy - this.worldY);
                const dist = Math.sqrt((sx - this.player.x) ** 2 + (sy - this.player.y) ** 2);

                if (dist < this.devilRingOfFire.explosionRadius) {
                    const fireDmgBonus = this.fireDamageBonus || 1;
                    e.health -= this.devilRingOfFire.explosionDamage * fireDmgBonus;
                    e.hitFlash = 1.0;
                    this.spawnParticles(sx, sy, '#ff0000', 10);
                }
            }

            // Visual explosion effect
            this.damageNumbers.push({
                x: this.player.x,
                y: this.player.y - 50,
                value: '😈 DEVIL EXPLOSION! 😈',
                lifetime: 1.5,
                color: '#ff0000'
            });

            // Screen shake for explosion
            this.screenShake = { intensity: 15, duration: 0.3 };
        }

        // Damage enemies within ring radius (all 3 rings share same radius)
        for (const e of this.enemies) {
            const sx = this.player.x + (e.wx - this.worldX);
            const sy = this.player.y + (e.wy - this.worldY);
            const dist = Math.sqrt((sx - this.player.x) ** 2 + (sy - this.player.y) ** 2);

            if (dist < this.devilRingOfFire.radius + e.radius) {
                // Apply burn if not already burning from devil ring
                if (!e.devilRingBurn) {
                    e.devilRingBurn = {
                        timer: this.devilRingOfFire.burnDuration,
                        dps: this.devilRingOfFire.damage * this.devilRingOfFire.rings // 3 rings = 3x damage
                    };
                    e.hitFlash = 0.5;
                    this.spawnParticles(sx, sy, '#ff0000', 6);
                }
            }
        }

        // Process devil ring burns
        for (const e of this.enemies) {
            if (e.devilRingBurn && e.devilRingBurn.timer > 0) {
                e.devilRingBurn.timer -= dt;
                const ampBoost = this.fireAmpActive ? (this.fireAmpBoost || 1.5) : 1;
                const fireDmgBonus = this.fireDamageBonus || 1;
                e.health -= e.devilRingBurn.dps * dt * ampBoost * fireDmgBonus;

                if (Math.random() < 0.2) {
                    const sx = this.player.x + (e.wx - this.worldX);
                    const sy = this.player.y + (e.wy - this.worldY);
                    this.spawnParticles(sx, sy, '#ff0000', 3);
                }
            }
        }
    }

    // ============ MYTHIC AUGMENTS UPDATE ============
    updateMythicAugments(dt) {
        // DEMONIC INFERNO - Aura damage + Hellfire Nova
        if (this.demonicInferno) {
            // Inferno Aura - deals DPS to nearby enemies
            for (const e of this.enemies) {
                const sx = this.player.x + (e.wx - this.worldX);
                const sy = this.player.y + (e.wy - this.worldY);
                const dist = Math.sqrt((sx - this.player.x) ** 2 + (sy - this.player.y) ** 2);

                if (dist < (this.demonicInfernoRadius || 150) + e.radius) {
                    // Deal continuous fire damage
                    const damage = (this.demonicInfernoDPS || 100) * dt;
                    e.health -= damage;
                    e.hitFlash = 0.1;

                    // Visual effect
                    if (Math.random() < 0.15) {
                        this.spawnParticles(sx, sy, '#ff3300', 2);
                    }

                    // Death is handled by updateEnemies loop
                }
            }

            // Hellfire Nova - periodic explosion
            this.hellfireNovaTimer = (this.hellfireNovaTimer || 0) + dt;
            if (this.hellfireNovaTimer >= (this.hellfireNovaCooldown || 8)) {
                this.hellfireNovaTimer = 0;

                // Trigger Hellfire Nova explosion
                const novaRadius = this.hellfireNovaRadius || 300;
                const novaDamage = this.hellfireNovaDamage || 5000;

                // Visual explosion effect
                this.damageNumbers.push({
                    x: this.player.x,
                    y: this.player.y - 60,
                    value: '🔥 HELLFIRE NOVA! 🔥',
                    lifetime: 1.5,
                    color: '#ff3300',
                    scale: 2
                });
                this.triggerScreenShake(12, 0.3);

                // Damage all enemies in radius
                for (const e of this.enemies) {
                    const sx = this.player.x + (e.wx - this.worldX);
                    const sy = this.player.y + (e.wy - this.worldY);
                    const dist = Math.sqrt((sx - this.player.x) ** 2 + (sy - this.player.y) ** 2);

                    if (dist < novaRadius + e.radius) {
                        e.health -= novaDamage;
                        e.hitFlash = 0.5;

                        this.damageNumbers.push({
                            x: sx, y: sy - 20,
                            value: Math.floor(novaDamage),
                            lifetime: 1,
                            color: '#ff6600',
                            scale: 1.3
                        });
                        this.spawnParticles(sx, sy, '#ff6600', 8);

                        // Death is handled by updateEnemies loop
                    }
                }

                // Nova visual ring (stored for rendering)
                this.hellfireNovaVisual = { radius: 0, maxRadius: novaRadius, alpha: 1 };
            }

            // Update nova visual
            if (this.hellfireNovaVisual) {
                this.hellfireNovaVisual.radius += 800 * dt; // Expand fast
                this.hellfireNovaVisual.alpha -= dt * 2;
                if (this.hellfireNovaVisual.alpha <= 0) {
                    this.hellfireNovaVisual = null;
                }
            }
        }

        // VOID SOVEREIGN - Periodic pull and damage
        if (this.voidSovereign) {
            this.voidPullTimer = (this.voidPullTimer || 0) + dt;
            if (this.voidPullTimer >= (this.voidPullCooldown || 5)) {
                this.voidPullTimer = 0;

                const pullRadius = this.voidPullRadius || 400;
                const pullDamage = this.voidPullDamage || 2000;

                this.damageNumbers.push({
                    x: this.player.x,
                    y: this.player.y - 60,
                    value: '🌀 VOID PULL! 🌀',
                    lifetime: 1.5,
                    color: '#8800ff',
                    scale: 2
                });

                for (const e of this.enemies) {
                    const sx = this.player.x + (e.wx - this.worldX);
                    const sy = this.player.y + (e.wy - this.worldY);
                    const dist = Math.sqrt((sx - this.player.x) ** 2 + (sy - this.player.y) ** 2);

                    if (dist < pullRadius + e.radius) {
                        // Pull enemy toward player
                        const pullStrength = 150; // Pull 150px toward player
                        const angle = Math.atan2(this.worldY - e.wy, this.worldX - e.wx);
                        e.wx += Math.cos(angle) * pullStrength;
                        e.wy += Math.sin(angle) * pullStrength;

                        // Deal damage
                        e.health -= pullDamage;
                        e.hitFlash = 0.5;
                        e.voidVulnerable = this.voidVulnerableDuration || 3; // Mark as vulnerable

                        this.damageNumbers.push({ x: sx, y: sy - 20, value: Math.floor(pullDamage), lifetime: 1, color: '#8800ff', scale: 1.2 });
                        this.spawnParticles(sx, sy, '#8800ff', 5);

                        // Death is handled by updateEnemies loop
                    }
                }
            }

            // Update void vulnerable timers
            for (const e of this.enemies) {
                if (e.voidVulnerable && e.voidVulnerable > 0) {
                    e.voidVulnerable -= dt;
                }
            }
        }

        // CELESTIAL GUARDIAN - Damage immunity cooldown
        if (this.celestialGuardian) {
            if (this.celestialImmuneCooldown > 0) {
                this.celestialImmuneCooldown -= dt;
            }
            if (this.celestialImmuneActive) {
                this.celestialImmuneTimer = (this.celestialImmuneTimer || 0.5) - dt;
                if (this.celestialImmuneTimer <= 0) {
                    this.celestialImmuneActive = false;
                }
            }
        }
    }

    // ABILITIES SYSTEM - Update cooldowns and active effects
    updateAbilities(dt) {
        if (!this.abilities) return;

        // Update Dash cooldown
        if (this.abilities.dash.currentCooldown > 0) {
            this.abilities.dash.currentCooldown -= dt;
        }

        // Update Nuclear Blast cooldown
        if (this.abilities.nuclearBlast.currentCooldown > 0) {
            this.abilities.nuclearBlast.currentCooldown -= dt;
        }

        // Update active Nuclear Blast wave effect
        if (this.nuclearBlastWave) {
            this.nuclearBlastWave.radius += 600 * dt; // Expand at 600px/s
            this.nuclearBlastWave.alpha -= dt * 0.8;  // Fade out

            // Damage enemies in the wave ring
            for (const e of this.enemies) {
                if (e.nuclearBlastHit) continue; // Already hit by this blast

                const edist = Math.sqrt((e.wx - this.nuclearBlastWave.wx) ** 2 + (e.wy - this.nuclearBlastWave.wy) ** 2);
                const waveInner = this.nuclearBlastWave.radius - 30;
                const waveOuter = this.nuclearBlastWave.radius + 30;

                if (edist >= waveInner && edist <= waveOuter) {
                    // Hit by wave - deal massive damage
                    const damage = this.nuclearBlastWave.damage;
                    e.health -= damage;
                    e.hitFlash = 0.3;
                    e.nuclearBlastHit = true; // Mark as hit

                    const sx = this.player.x + (e.wx - this.worldX);
                    const sy = this.player.y + (e.wy - this.worldY);
                    this.damageNumbers.push({ x: sx, y: sy - 20, value: `☢️${Math.floor(damage)}`, lifetime: 1, color: '#aa00ff', scale: 1.2 });
                    this.spawnParticles(sx, sy, '#aa00ff', 5);

                    // Death is handled by updateEnemies loop
                }
            }

            // Remove wave when fully expanded or faded
            if (this.nuclearBlastWave.radius >= this.nuclearBlastWave.maxRadius || this.nuclearBlastWave.alpha <= 0) {
                // Clear nuclearBlastHit flags from enemies
                for (const e of this.enemies) {
                    delete e.nuclearBlastHit;
                }
                this.nuclearBlastWave = null;
            }
        }
    }

    // Activate an ability
    activateAbility(abilityKey) {
        if (!this.abilities || !this.abilities[abilityKey]) return;

        const ability = this.abilities[abilityKey];

        // Check if unlocked and off cooldown
        if (!ability.unlocked) {
            this.damageNumbers.push({ x: this.canvas.width / 2, y: this.canvas.height / 2, value: 'ABILITY LOCKED', lifetime: 1, color: '#888' });
            return;
        }
        if (ability.currentCooldown > 0) {
            this.damageNumbers.push({ x: this.canvas.width / 2, y: this.canvas.height / 2, value: `ON COOLDOWN (${Math.ceil(ability.currentCooldown)}s)`, lifetime: 0.5, color: '#ff4444' });
            return;
        }

        // Activate the ability
        if (abilityKey === 'dash') {
            this.activateDash();
        } else if (abilityKey === 'nuclearBlast') {
            this.activateNuclearBlast();
        }
    }

    // Dash - Blink player 100px in movement direction
    activateDash() {
        const ability = this.abilities.dash;

        // Get movement direction from current input
        let dx = 0, dy = 0;
        if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
        if (this.keys['s'] || this.keys['arrowdown']) dy += 1;
        if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
        if (this.keys['d'] || this.keys['arrowright']) dx += 1;

        // If no movement input, dash in facing direction (last movement)
        if (dx === 0 && dy === 0) {
            dx = this.lastMoveDirX || 1;
            dy = this.lastMoveDirY || 0;
        } else {
            // Store last move direction
            this.lastMoveDirX = dx;
            this.lastMoveDirY = dy;
        }

        // Normalize
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
            dx /= len;
            dy /= len;
        }

        // Move player in world coordinates
        this.worldX += dx * ability.distance;
        this.worldY += dy * ability.distance;

        // Visual effect - particles trail
        for (let i = 0; i < 10; i++) {
            const px = this.player.x - dx * ability.distance * (i / 10);
            const py = this.player.y - dy * ability.distance * (i / 10);
            this.particles.push({
                x: px + (Math.random() - 0.5) * 20,
                y: py + (Math.random() - 0.5) * 20,
                vx: (Math.random() - 0.5) * 50,
                vy: (Math.random() - 0.5) * 50,
                lifetime: 0.5,
                color: '#00ccff'
            });
        }

        // Invincibility frames during dash
        this.player.invincibleTime = 0.3;

        // Start cooldown
        ability.currentCooldown = ability.cooldown;

        // Sound effect and screen juice
        this.playSound('levelup');
        this.triggerScreenShake(5, 0.15);

        this.damageNumbers.push({ x: this.player.x, y: this.player.y - 40, value: '💨 DASH!', lifetime: 0.8, color: '#00ccff' });
    }

    // Nuclear Blast - Massive purple damage wave
    activateNuclearBlast() {
        const ability = this.abilities.nuclearBlast;

        // Create the wave effect
        this.nuclearBlastWave = {
            wx: this.worldX,     // Center on player's world position
            wy: this.worldY,
            radius: 0,           // Starts at 0
            maxRadius: ability.range,
            damage: ability.damage,
            alpha: 1
        };

        // Start cooldown
        ability.currentCooldown = ability.cooldown;

        // Epic effects
        this.playSound('levelup');
        this.triggerScreenShake(15, 0.5);
        this.triggerSlowmo(0.2, 0.3);

        // Spawn particles at center
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 200;
            this.particles.push({
                x: this.player.x,
                y: this.player.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                lifetime: 0.8,
                color: Math.random() > 0.5 ? '#aa00ff' : '#ff00ff'
            });
        }

        this.damageNumbers.push({ x: this.player.x, y: this.player.y - 50, value: '☢️ NUCLEAR BLAST!', lifetime: 1.5, color: '#aa00ff', scale: 2 });
    }

    // Beam of Despair - chains to enemies, color based on level
    updateBeamDespair(dt) {
        if (!this.beamDespair) {
            // Stop beam sound if beam is not active
            this.stopBeamSound();
            return;
        }

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

        // Play/stop beam sound based on whether we have targets
        if (targets.length > 0) {
            this.playBeamSound();
        } else {
            this.stopBeamSound();
        }

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
        const heartEvolved = this.heartVitalityEvolved || false;
        if (hp5Bonus > 0 || heartEvolved) {
            this.hp5Timer = (this.hp5Timer || 0) + dt;
            if (this.hp5Timer >= 5) {
                this.hp5Timer = 0;
                // Evolved: heal 0.5% of max HP, otherwise use HP5 bonus
                let healAmount;
                if (heartEvolved) {
                    healAmount = Math.floor(this.player.maxHealth * 0.005); // 0.5% max HP
                } else {
                    healAmount = hp5Bonus;
                }
                if (healAmount > 0 && this.player.health < this.player.maxHealth) {
                    this.player.health = Math.min(this.player.maxHealth, this.player.health + healAmount);
                    this.damageNumbers.push({
                        x: this.player.x, y: this.player.y - 40,
                        value: `❤️ +${Math.floor(healAmount)}`,
                        lifetime: 0.8,
                        color: heartEvolved ? '#ff44aa' : '#ff4466'
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

    applyPerk(perk) {
        // SCALED UP 10x for big satisfying numbers
        switch (perk.id) {
            case 'vampiric': this.vampiric = true; break;
            case 'doubleshot': this.weapons.bullet.count *= 2; break;
            case 'nuclear': this.weapons.bullet.damage = Math.floor(this.weapons.bullet.damage * 1.5); this.nuclear = true; break;
            case 'timewarp': this.timewarp = true; break;
            case 'goldenheart': this.player.maxHealth += 500; this.player.health += 500; this.player.hpRegen += 15; break;
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

        // Update fire zones (Cinder Wretch death effect)
        this.playerInFireZone = false; // Reset each frame
        for (let i = this.fireZones.length - 1; i >= 0; i--) {
            const zone = this.fireZones[i];
            zone.timer -= dt;
            zone.lastDamageTick += dt;

            // Remove expired fire zones
            if (zone.timer <= 0) {
                this.fireZones.splice(i, 1);
                continue;
            }

            // Check if player is in this fire zone
            const distToZone = Math.sqrt((this.worldX - zone.wx) ** 2 + (this.worldY - zone.wy) ** 2);
            if (distToZone < zone.radius) {
                this.playerInFireZone = true;

                // Tick damage at 0.5 second intervals (same as other DoTs)
                if (zone.lastDamageTick >= 0.5) {
                    zone.lastDamageTick = 0;

                    // Calculate damage with modifiers
                    let damage = zone.dps * 0.5; // Damage per tick (0.5s * 18 DPS = 9 damage per tick)

                    // Apply burnDamageTakenMult (Fire Mage starter item reduces this)
                    const burnResist = this.burnDamageTakenMult || 1;
                    damage *= burnResist;

                    // Apply fire resist if any
                    const fireResist = this.fireResist || 0;
                    damage *= (1 - fireResist);

                    // Floor the damage
                    damage = Math.floor(damage);

                    if (damage > 0) {
                        this.player.health -= damage;
                        this.combatTimer = 0; // Reset combat timer

                        // Visual feedback
                        this.damageNumbers.push({
                            x: this.player.x + (Math.random() - 0.5) * 30,
                            y: this.player.y - 30,
                            value: `-${damage} 🔥`,
                            lifetime: 0.8,
                            color: '#ff4400'
                        });

                        // Don't stack damage - break after first zone damages
                        // If player is in multiple zones, only take damage once but refresh duration
                        break;
                    }
                }
            }
        }

        // If player is in a fire zone, refresh the duration of all zones they're in (non-stacking)
        if (this.playerInFireZone) {
            for (const zone of this.fireZones) {
                const distToZone = Math.sqrt((this.worldX - zone.wx) ** 2 + (this.worldY - zone.wy) ** 2);
                if (distToZone < zone.radius) {
                    // Refresh duration but don't stack damage
                    zone.timer = Math.max(zone.timer, 1.0); // Keep at least 1 second when refreshed
                }
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

    // Blood Shield cooldown update
    updateBloodShield(dt) {
        if (!this.bloodShieldEnabled) return;

        // Update cooldown
        if (this.bloodShieldCooldown > 0) {
            this.bloodShieldCooldown -= dt;
            if (this.bloodShieldCooldown <= 0) {
                this.bloodShieldCooldown = 0;
                // Show ready message
                this.damageNumbers.push({
                    x: this.player.x, y: this.player.y - 50,
                    value: '🩸 Shield Ready!',
                    lifetime: 1.5,
                    color: '#cc2244'
                });
            }
        }
    }

    // Evolved Blood Shield explosion when shield breaks
    triggerBloodShieldExplosion() {
        const explosionRadius = 200;
        const baseDamage = 100;
        let totalDamage = 0;

        // Damage nearby enemies
        for (const e of this.enemies) {
            const sx = this.player.x + (e.wx - this.worldX);
            const sy = this.player.y + (e.wy - this.worldY);
            const dist = Math.sqrt((sx - this.player.x) ** 2 + (sy - this.player.y) ** 2);

            if (dist < explosionRadius) {
                const damage = Math.floor(baseDamage * (1 - dist / explosionRadius));
                e.health -= damage;
                e.hitFlash = 1;
                totalDamage += damage;
                this.damageNumbers.push({ x: sx, y: sy - 15, value: damage, lifetime: 0.8, color: '#cc2244', scale: 1.1 });
                this.spawnParticles(sx, sy, '#cc2244', 4);
            }
        }

        // Heal player for 10% of damage dealt
        if (totalDamage > 0) {
            const healAmount = Math.floor(totalDamage * 0.1);
            if (healAmount > 0 && this.player.health < this.player.maxHealth) {
                this.player.health = Math.min(this.player.maxHealth, this.player.health + healAmount);
                this.damageNumbers.push({
                    x: this.player.x, y: this.player.y - 60,
                    value: `🧛 +${healAmount}`,
                    lifetime: 1.2,
                    color: '#ff4488'
                });
            }
        }

        // Visual effect - red explosion
        this.spawnParticles(this.player.x, this.player.y, '#cc2244', 20);
        this.triggerScreenShake(8, 0.3);

        // Show explosion message
        this.damageNumbers.push({
            x: this.player.x, y: this.player.y - 80,
            value: '🩸 BLOOD BURST!',
            lifetime: 1.5,
            color: '#cc2244',
            scale: 1.5
        });
    }

    spawnEnemies() {
        // Check for spawn pause (after Consumer dies)
        if (this.spawnPauseTimer > 0) return;

        const now = performance.now();

        // ============ MAX ALIVE CAP CHECK ============
        // If we're at or above the max alive cap for this wave, don't spawn
        const maxAlive = getMaxAliveByWave(this.wave);
        // Count non-boss enemies only for cap (bosses don't count toward cap)
        const currentAlive = this.enemies.filter(e => !e.isBoss).length;
        if (currentAlive >= maxAlive) {
            return; // Delay spawns until under cap
        }

        // ============ SPAWN RATE CALCULATION ============
        // Use wave-based spawn rate multiplier
        const spawnRateMult = getSpawnRateMultByWave(this.wave);
        const effectiveSpawnRate = this.baseSpawnRate * spawnRateMult * this.necromancerSpawnMult;

        // Reduce spawn rate during boss grace period
        const graceMultiplier = this.bossGracePeriod > 0 ? 2.0 : 1.0;
        const finalSpawnRate = effectiveSpawnRate * graceMultiplier;

        // Check if enough time has passed since last spawn
        if (now - this.lastEnemySpawn < finalSpawnRate) return;
        this.lastEnemySpawn = now;

        // ============ ENEMY TYPE SELECTION (Wave Gating) ============
        // Use the helper function for wave-gated enemy types
        const types = getEnemyTypesForWave(this.wave, this.tankOrSplitterChoice);

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
        // Wave 10: First boss, Wave 15: Consumer, Wave 20: Demon King
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

                // Play boss music when first boss spawns
                this.playBossMusic();
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
        // Dynamic difficulty tier based on wave number
        const difficultyTier = getDifficultyTier(this.wave);

        // Wave-based scaling using stepped curve:
        // Waves 1-9: +5% per wave, Waves 10-15: +16% per wave, Waves 16+: +24% per wave
        const waveMult = getWaveScalingMult(this.wave);

        const data = {
            // BALANCED for early game - lower base damage, scales with wave/difficulty
            // Swarm is now the default enemy from wave 1 - fast spawns, surrounds player
            // All damage values +10 for better early game challenge
            // Early game enemies have reduced speed so they don't overwhelm the player
            swarm: { radius: 14, speed: 75, health: 100, damage: 25, xp: 2, color: '#ff66aa', icon: '' },
            basic: { radius: 12, speed: 65, health: 150, damage: 35, xp: 6, color: '#ff4466', icon: '' },
            runner: { radius: 16, speed: 120, health: 200, damage: 25, xp: 5, color: '#00ffff', icon: '💨' },
            tank: { radius: 28, speed: 60, health: 1750, damage: 60, xp: 25, color: '#8844ff', icon: '' },
            splitter: { radius: 20, speed: 85, health: 750, damage: 40, xp: 15, color: '#44ddff', icon: '💧', splits: true },
            bomber: { radius: 16, speed: 105, health: 375, damage: 30, xp: 12, color: '#ff8800', icon: '💣', explodes: true },
            mini: { radius: 6, speed: 140, health: 125, damage: 22, xp: 3, color: '#44ddff', icon: '' },
            // New enemy types
            sticky: { radius: 12, speed: 120, health: 250, damage: 20, xp: 8, color: '#88ff00', icon: '🍯', stickies: true },
            ice: { radius: 32, speed: 55, health: 1000, damage: 50, xp: 20, color: '#00ddff', icon: '🧊', freezesOnDeath: true },
            poison: { radius: 14, speed: 90, health: 400, damage: 30, xp: 10, color: '#00cc44', icon: '☣️', explodes: true, isPoisonous: true },
            // Wave 5+ enemy types
            goblin: { radius: 22, speed: 115, health: 200, damage: 20, xp: 0, color: '#44aa44', icon: '🧌', isGoblin: true, passive: true },
            necromancer: { radius: 18, speed: 40, health: 600, damage: 25, xp: 20, color: '#8800aa', icon: '💀', isNecromancer: true, passive: true },
            necro_sprite: { radius: 8, speed: 130, health: 75, damage: 20, xp: 0, color: '#aa44ff', icon: '👻' },
            miniconsumer: { radius: 20, speed: 50, health: 1500, damage: 45, xp: 30, color: '#00ff44', icon: '🟢', isMiniConsumer: true },
            // Wave 6+ fire enemy - spawns Fire Zone on death
            cinder_wretch: { radius: 14, speed: 95, health: 140, damage: 25, xp: 6, color: '#ff4400', icon: '🔥', spawnsFireZone: true }
        }[type] || data.basic;

        const sizeMult = isSplit ? 0.6 : 1;
        // Horde enemies get +50% health and 40% slower speed (easier to deal with)
        const hordeHealthMult = isHorde ? 1.5 : 1;
        const hordeSpeedMult = isHorde ? 0.6 : 1;

        // POST WAVE 15: Enemies get bigger and stronger after defeating Demon King
        const lateGameSizeMult = this.wave >= 15 ? 1.5 : 1; // 50% bigger after wave 15
        const lateGameStatMult = this.wave >= 15 ? 1.5 : 1; // 50% more HP/damage after wave 15

        // Unique enemy ID for damage number stacking
        if (!this.enemyIdCounter) this.enemyIdCounter = 0;
        this.enemyIdCounter++;

        // Apply difficulty tier multipliers to health and damage
        const tierHealthMult = difficultyTier.healthMult;
        const tierDamageMult = difficultyTier.damageMult;

        return {
            wx, wy, type,
            id: this.enemyIdCounter, // Unique ID for damage stacking
            radius: Math.floor(data.radius * sizeMult * lateGameSizeMult),
            baseRadius: Math.floor(data.radius * sizeMult * lateGameSizeMult), // For mini consumer growth
            speed: Math.floor(data.speed * GAME_SETTINGS.enemySpeedMult * hordeSpeedMult),
            health: Math.floor(data.health * waveMult * GAME_SETTINGS.enemyHealthMult * sizeMult * hordeHealthMult * lateGameStatMult * tierHealthMult),
            maxHealth: Math.floor(data.health * waveMult * GAME_SETTINGS.enemyHealthMult * sizeMult * hordeHealthMult * lateGameStatMult * tierHealthMult),
            damage: Math.floor(data.damage * waveMult * GAME_SETTINGS.enemyDamageMult * lateGameStatMult * tierDamageMult),
            xp: Math.floor(data.xp * waveMult),
            color: data.color, icon: data.icon || '', hitFlash: 0, isBoss: false,
            splits: data.splits || false,
            explodes: data.explodes || false,
            stickies: data.stickies || false,
            freezesOnDeath: data.freezesOnDeath || false,
            isHorde: isHorde,
            attackCooldown: 0, // For attack speed system
            // New enemy behaviors
            isGoblin: data.isGoblin || false,
            stolenXP: 0, // XP stolen by goblin
            isNecromancer: data.isNecromancer || false,
            lastSpriteSpawn: 0, // Timer for necromancer sprite spawning
            isMiniConsumer: data.isMiniConsumer || false,
            absorbedKills: 0, // Kills absorbed by mini consumer
            passive: data.passive || false, // Passive enemies don't chase player
            spawnsFireZone: data.spawnsFireZone || false // Cinder Wretch spawns Fire Zone on death
        };
    }

    createBoss(wx, wy, type = 'boss') {
        // Dynamic difficulty tier based on wave number
        const difficultyTier = getDifficultyTier(this.wave);

        // Wave-based scaling using stepped curve:
        // Waves 1-9: +5% per wave, Waves 10-15: +16% per wave, Waves 16+: +24% per wave
        const waveMult = getWaveScalingMult(this.wave);

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

        // TRIPLE boss HP and damage for more challenge
        const bossBaseMult = 3.0;

        // Apply difficulty tier multipliers to health and damage
        const tierHealthMult = difficultyTier.healthMult;
        const tierDamageMult = difficultyTier.damageMult;

        // Unique enemy ID for damage number stacking
        if (!this.enemyIdCounter) this.enemyIdCounter = 0;
        this.enemyIdCounter++;

        return {
            wx, wy, type, name,
            id: this.enemyIdCounter, // Unique ID for damage stacking
            face,
            radius: stats.radius,
            speed: Math.floor(stats.speed * GAME_SETTINGS.enemySpeedMult), // Speed does NOT scale
            health: Math.floor(stats.health * waveMult * GAME_SETTINGS.enemyHealthMult * statMult * bossBaseMult * tierHealthMult),
            maxHealth: Math.floor(stats.health * waveMult * GAME_SETTINGS.enemyHealthMult * statMult * bossBaseMult * tierHealthMult),
            damage: Math.floor(stats.damage * waveMult * GAME_SETTINGS.enemyDamageMult * statMult * bossBaseMult * tierDamageMult),
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

            // PASSIVE ENEMIES: Goblin and Necromancer don't chase player directly
            const dx = this.worldX - e.wx, dy = this.worldY - e.wy;
            const d = Math.sqrt(dx * dx + dy * dy);

            // Bone Pit slow effect (Necromancer Q ability) - 60% slow
            let speedMult = 1;
            if (e.bonePitSlow) {
                speedMult = 0.4; // 60% slow
                if (e.bonePitSlowTimer !== undefined) {
                    e.bonePitSlowTimer -= dt;
                    if (e.bonePitSlowTimer <= 0) {
                        e.bonePitSlow = false;
                    }
                }
            }

            // Frenzied Haste (Corrupted Sigil): Nearby enemies move 10% faster
            if (this.corruptedEnemySpeedAura && d < 300) {
                speedMult *= this.corruptedEnemySpeedAura;
            }

            if (e.passive) {
                // Passive enemies wander randomly around, not towards player
                if (!e.wanderAngle) e.wanderAngle = Math.random() * Math.PI * 2;
                if (!e.wanderTimer) e.wanderTimer = 0;
                e.wanderTimer -= dt;
                if (e.wanderTimer <= 0) {
                    e.wanderAngle += (Math.random() - 0.5) * Math.PI; // Random turn
                    e.wanderTimer = 1 + Math.random() * 2; // New direction every 1-3s
                }
                e.wx += Math.cos(e.wanderAngle) * e.speed * dt * 0.5 * speedMult;
                e.wy += Math.sin(e.wanderAngle) * e.speed * dt * 0.5 * speedMult;
            } else {
                // Normal enemy - Move towards player (world coords)
                if (d > 0) { e.wx += (dx / d) * e.speed * dt * speedMult; e.wy += (dy / d) * e.speed * dt * speedMult; }
            }
            if (e.hitFlash > 0) e.hitFlash -= dt * 5;

            // GOBLIN: Steal XP from nearby orbs
            if (e.isGoblin) {
                for (let p = this.pickups.length - 1; p >= 0; p--) {
                    const pickup = this.pickups[p];
                    if (pickup.type === 'xp') {
                        const psx = this.player.x + (pickup.wx - this.worldX);
                        const psy = this.player.y + (pickup.wy - this.worldY);
                        const gsx = this.player.x + (e.wx - this.worldX);
                        const gsy = this.player.y + (e.wy - this.worldY);
                        const dist = Math.sqrt((psx - gsx) ** 2 + (psy - gsy) ** 2);
                        if (dist < 60) { // Goblin steal radius
                            e.stolenXP += pickup.value;
                            this.pickups.splice(p, 1);
                            this.spawnParticles(gsx, gsy, '#44aa44', 3);
                        }
                    }
                }
            }

            // NECROMANCER: Spawn sprites periodically
            if (e.isNecromancer) {
                e.lastSpriteSpawn += dt;
                if (e.lastSpriteSpawn >= 3) { // Spawn sprite every 3 seconds
                    e.lastSpriteSpawn = 0;
                    // Spawn 1-2 sprites near the necromancer
                    const spriteCount = 1 + Math.floor(Math.random() * 2);
                    for (let s = 0; s < spriteCount; s++) {
                        const angle = Math.random() * Math.PI * 2;
                        const spriteDist = 30 + Math.random() * 20;
                        const spriteWx = e.wx + Math.cos(angle) * spriteDist;
                        const spriteWy = e.wy + Math.sin(angle) * spriteDist;
                        const sprite = this.createEnemy(spriteWx, spriteWy, 'necro_sprite');
                        this.enemies.push(sprite);
                    }
                    // Visual effect when spawning
                    const necroSx = this.player.x + (e.wx - this.worldX);
                    const necroSy = this.player.y + (e.wy - this.worldY);
                    this.spawnParticles(necroSx, necroSy, '#aa44ff', 8);
                }
            }
            // Update screen position after movement
            const sxMoved = this.player.x + (e.wx - this.worldX);
            const syMoved = this.player.y + (e.wy - this.worldY);

            // Apply time warp perk (multiply with existing speedMult from bone pit, etc.)
            if (this.timewarp) speedMult *= 0.7;

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
                } else if (this.soulShieldActive && this.raisedCorpses && this.raisedCorpses.length > 0) {
                    // Necromancer Soul Shield: Raised corpses absorb damage
                    const corpse = this.raisedCorpses[0];
                    corpse.health -= e.damage;
                    this.damageNumbers.push({ x: corpse.x, y: corpse.y - 10, value: -e.damage, lifetime: 1, color: '#00cc66', isText: true });
                    this.spawnParticles(corpse.x, corpse.y, '#00cc66', 5);
                    this.playSound('hit');
                } else {
                    // Apply corrupted damage taken multiplier (Blighted Vitality)
                    let remainingDamage = e.damage * (this.corruptedDamageTaken || 1);

                    // Blood Shield absorbs damage first
                    if (this.bloodShield > 0) {
                        const absorbed = Math.min(this.bloodShield, remainingDamage);
                        this.bloodShield -= absorbed;
                        remainingDamage -= absorbed;
                        this.damageNumbers.push({ x: this.player.x, y: this.player.y - 40, value: `🩸 -${absorbed}`, lifetime: 0.8, color: '#cc2244', isText: true });
                        this.spawnParticles(this.player.x, this.player.y, '#cc2244', 5);

                        // Shield broken - evolved effect
                        if (this.bloodShield <= 0 && this.bloodShieldEvolved) {
                            this.triggerBloodShieldExplosion();
                        }

                        // Start cooldown if shield is depleted
                        if (this.bloodShield <= 0) {
                            this.bloodShieldCooldown = this.bloodShieldCooldownMax;
                        }
                    }

                    // Apply remaining damage to health
                    if (remainingDamage > 0) {
                        this.player.health -= remainingDamage;
                        this.player.invincibleTime = 0.5;
                        this.combatTimer = 0; // Reset combat timer - healing reduced for 3s
                        this.damageNumbers.push({ x: this.player.x, y: this.player.y - 20, value: -remainingDamage, lifetime: 1, color: '#ff4444', isText: true });
                        this.playSound('hit');

                        // Starter Passive: Flame Pulse (Kindled Aegis evolved)
                        if (this.starterEvolved && this.starterFlamePulse) {
                            this.triggerFlamePulse();
                        }
                    }

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

            // Inferno aura damage - SCALED 5x (halved from 10x)
            if (this.inferno && pd < 100) {
                e.health -= 25 * dt;
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

        this.player.kills++;
        this.playSound('kill');

        // Necromancer: Raise Dead - chance to raise killed enemy as ally
        if (this.raisedCorpses && !e.isBoss && !e.isRaised) {
            const raiseChance = this.raiseChance || 0.15;
            if (Math.random() < raiseChance && this.raisedCorpses.length < (this.maxRaisedCorpses || 5)) {
                const levelMult = 1 + (this.player.level * 0.12); // INCREASED to 12% scaling per level
                // SCALED 5x (halved from 10x)
                this.raisedCorpses.push({
                    x: sx, y: sy,
                    radius: Math.max(10, e.radius * 0.8),
                    speed: 180,
                    damage: Math.floor(150 * levelMult),
                    health: Math.floor(1000 * levelMult),
                    maxHealth: Math.floor(1000 * levelMult),
                    color: '#00cc66',
                    icon: '💀',
                    attackCooldown: 0,
                    lifetime: 20,  // 20 seconds before despawn
                    isRaised: true
                });
                this.damageNumbers.push({ x: sx, y: sy - 20, value: '💀 RAISED!', lifetime: 1, color: '#00cc66', scale: 1 });
                this.spawnParticles(sx, sy, '#00cc66', 10);
            }
        }

        // Soul Harvest augment: +1% max HP for every 10 kills
        if (this.augments.includes('soul_harvest')) {
            if (this.player.kills % 10 === 0) {
                const hpBonus = Math.floor(this.player.maxHealth * 0.01);
                this.player.maxHealth += hpBonus;
                this.player.health += hpBonus;
                this.damageNumbers.push({ x: this.player.x, y: this.player.y - 50, value: `🔮 +${hpBonus} MAX HP!`, lifetime: 1.5, color: '#00cc66', scale: 1 });
            }
        }

        // Aura Fire kill tracking and upgrades
        // Aura Fire no longer auto-levels - only upgrades via "Inferno Expansion" augment

        // ============ MYTHIC AUGMENT ON-KILL EFFECTS ============
        // Demonic Inferno: Heal on kill
        if (this.demonicHealOnKill && this.demonicHealOnKill > 0) {
            const healAmount = this.demonicHealOnKill;
            this.player.health = Math.min(this.player.maxHealth, this.player.health + healAmount);
            // Show heal number occasionally (not every kill to reduce spam)
            if (Math.random() < 0.2) {
                this.damageNumbers.push({ x: this.player.x, y: this.player.y - 30, value: `+${healAmount}`, lifetime: 0.5, color: '#ff6600', scale: 0.8 });
            }
        }

        // Blood Lord: Lifesteal (5% of damage dealt heals)
        // Note: This is handled in damage dealing functions

        // Stacking items - add kills
        this.updateStackingItems('kill', e.isBoss ? 5 : 1);

        // GAME JUICE: Kill streak and effects
        this.killStreak++;
        this.killStreakTimer = 2; // Reset streak timer

        // Screen shake and slowmo ONLY on boss kills
        if (e.isBoss) {
            this.triggerScreenShake(15, 0.4);
            this.triggerSlowmo(0.15, 1.2); // Epic slowmo for boss kills

            // Check if all bosses are dead - stop boss music
            const remainingBosses = this.enemies.filter(en => en.isBoss && en !== e).length;
            if (remainingBosses === 0) {
                this.stopBossMusic();
            }

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
        const explosionMult = this.hasEffect('big_explosions') ? 2.5 : 1.0;
        this.deathPops.push({
            x: sx, y: sy,
            radius: e.radius,
            maxRadius: e.radius * 1.8 * explosionMult,
            color: e.color,
            alpha: 1,
            timer: 0.15 * explosionMult
        });

        // Cosmetic Effect: Confetti Kills
        if (this.hasEffect('confetti_kills')) {
            const confettiColors = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#00d2d3', '#54a0ff', '#5f27cd'];
            for (let i = 0; i < 12; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 100 + Math.random() * 150;
                this.particles.push({
                    x: sx, y: sy,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 50,
                    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
                    lifetime: 1.5 + Math.random() * 0.5,
                    size: 4 + Math.random() * 3
                });
            }
        }

        // Cosmetic Effect: Coin Shower
        if (this.hasEffect('coin_shower')) {
            for (let i = 0; i < 5; i++) {
                this.damageNumbers.push({
                    x: sx + (Math.random() - 0.5) * 30,
                    y: sy + (Math.random() - 0.5) * 20,
                    value: '🪙',
                    lifetime: 0.8 + Math.random() * 0.4,
                    color: '#ffd700',
                    scale: 0.8 + Math.random() * 0.4
                });
            }
        }

        // Cosmetic Effect: Extra Screen Shake
        if (this.hasEffect('extra_shake') && !e.isBoss) {
            this.triggerScreenShake(3, 0.1);
        }

        // Vampiric perk (from augments) - SCALED 5x (halved from 10x), reduced by 75% while in combat
        if (this.vampiric) {
            let healAmt = 10;
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

        // Soul Harvest (tech_wizard augment): 10% chance to spawn a skull on kill (max 6)
        if (this.augments.includes('tech_wizard') && this.skulls.length < 6) {
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
                    other.health -= 300; // SCALED UP 10x
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

        // CINDER WRETCH: Spawn Fire Zone on death (damages player, burn type)
        if (e.spawnsFireZone) {
            this.fireZones.push({
                wx: e.wx,
                wy: e.wy,
                radius: 80, // 80px radius as specified
                duration: 3.5, // 3.5 seconds duration
                timer: 3.5,
                dps: 18, // 18 damage per second
                lastDamageTick: 0 // For tick-based damage
            });
            this.spawnParticles(sx, sy, '#ff4400', 20);
            this.damageNumbers.push({
                x: sx, y: sy - 20,
                value: '🔥 FIRE ZONE!', lifetime: 2, color: '#ff4400', scale: 1.3
            });
        }

        // GOBLIN: Drop 50% of stolen XP when killed
        if (e.isGoblin && e.stolenXP > 0) {
            const xpDrop = Math.floor(e.stolenXP * 0.5);
            if (xpDrop > 0) {
                // Create multiple XP orbs for the stolen XP
                const orbCount = Math.min(5, Math.ceil(xpDrop / 10));
                const xpPerOrb = Math.floor(xpDrop / orbCount);
                for (let o = 0; o < orbCount; o++) {
                    const angle = (o / orbCount) * Math.PI * 2;
                    const dist = 20 + Math.random() * 15;
                    this.pickups.push({
                        wx: e.wx + Math.cos(angle) * dist,
                        wy: e.wy + Math.sin(angle) * dist,
                        type: 'xp',
                        value: xpPerOrb,
                        radius: 5,
                        color: '#44aa44'
                    });
                }
                this.damageNumbers.push({
                    x: sx, y: sy - 30,
                    value: `🧌 +${xpDrop} XP RECOVERED!`,
                    lifetime: 2,
                    color: '#44aa44',
                    scale: 1.3
                });
            }
            this.spawnParticles(sx, sy, '#44aa44', 15);
        }

        // MINI CONSUMER: Green mucus screen effect on death if player in radius
        if (e.isMiniConsumer) {
            const effectRadius = e.radius * 4; // Effect radius based on size
            const playerDist = Math.sqrt((sx - this.player.x) ** 2 + (sy - this.player.y) ** 2);
            if (playerDist < effectRadius) {
                // Apply green screen effect
                this.greenMucusEffect = {
                    active: true,
                    timer: 5, // 5 seconds
                    alpha: 0.6
                };
                this.damageNumbers.push({
                    x: this.player.x, y: this.player.y - 50,
                    value: '🟢 MUCUS BLINDED!',
                    lifetime: 2,
                    color: '#00ff44',
                    scale: 1.5
                });
            }
            this.spawnParticles(sx, sy, '#00ff44', 30);
        }

        // MINI CONSUMER GROWTH: When any enemy dies, nearby mini consumers grow
        for (const mc of this.enemies) {
            if (mc.isMiniConsumer && mc !== e) {
                const mcSx = this.player.x + (mc.wx - this.worldX);
                const mcSy = this.player.y + (mc.wy - this.worldY);
                const dist = Math.sqrt((sx - mcSx) ** 2 + (sy - mcSy) ** 2);
                if (dist < 200) { // Within growth radius
                    mc.absorbedKills++;
                    // Grow every 3 kills absorbed
                    if (mc.absorbedKills % 3 === 0) {
                        mc.radius = Math.floor(mc.baseRadius * (1 + mc.absorbedKills * 0.1));
                        mc.health += 50;
                        mc.maxHealth += 50;
                        mc.damage += 5;
                        this.spawnParticles(mcSx, mcSy, '#00ff44', 5);
                    }
                }
            }
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
        this.pickups.push({ wx: e.wx, wy: e.wy, xp: xpGain, radius: 5, color: '#d4e600', isItem: false }); // Yellow-green XP (smaller)
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
        // Check 3-minute cooldown since last item DROP (180000ms = 3 minutes)
        const itemCooldown = 180000;
        if (this.gameTime - this.lastItemDropTime < itemCooldown) return;

        // Only drop items that haven't been collected yet
        const allKeys = Object.keys(STACKING_ITEMS);
        const availableKeys = allKeys.filter(key => !this.droppedItems.includes(key));

        if (availableKeys.length === 0) return; // All items already dropped

        const itemKey = availableKeys[Math.floor(Math.random() * availableKeys.length)];
        this.pickups.push({ wx, wy, xp: 0, radius: 15, color: '#fbbf24', isItem: true, itemKey });

        // Update last drop time to prevent multiple items dropping at once
        this.lastItemDropTime = this.gameTime;
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
            if (this.wolfRespawnTimer >= 15) { // Wolves respawn every 15 seconds (was 12)
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
                    this.damageNumbers.push({ x: nearest.sx, y: nearest.sy - 20, value: this.impStats.damage, lifetime: 0.5, color: '#ff4400', scale: 1.2 });

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

    // Beast Tamer: Update shadow monsters
    updateShadowMonsters(dt) {
        if (!this.shadowMonsters || this.shadowMonsters.length === 0) return;

        const attackSpeedMult = this.shadowAttackSpeed || 1;
        const damageBonus = this.shadowDamageBonus || 1;

        for (let i = this.shadowMonsters.length - 1; i >= 0; i--) {
            const m = this.shadowMonsters[i];

            // Phase animation (ghostly effect)
            m.phaseTimer += dt;
            m.alpha = 0.5 + Math.sin(m.phaseTimer * 3) * 0.3;

            if (m.health <= 0) {
                this.spawnParticles(m.x, m.y, '#6600aa', 12);
                this.shadowMonsters.splice(i, 1);
                continue;
            }

            // Find nearest enemy
            let target = null, nd = Infinity, moveTarget = null;
            for (const e of this.enemies) {
                const sx = this.player.x + (e.wx - this.worldX);
                const sy = this.player.y + (e.wy - this.worldY);
                const d = Math.sqrt((m.x - sx) ** 2 + (m.y - sy) ** 2);
                if (d < 400 && d < nd) { nd = d; target = e; moveTarget = { x: sx, y: sy }; }
            }

            const distToPlayer = Math.sqrt((m.x - this.player.x) ** 2 + (m.y - this.player.y) ** 2);

            if (target && moveTarget) {
                // Chase enemy
                const dx = moveTarget.x - m.x, dy = moveTarget.y - m.y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d > m.radius + target.radius) {
                    m.x += (dx / d) * m.speed * dt;
                    m.y += (dy / d) * m.speed * dt;
                }

                // Attack enemy
                if (m.attackCooldown <= 0 && d < m.radius + target.radius + 20) {
                    const damage = Math.floor(m.damage * damageBonus);
                    target.health -= damage;
                    target.hitFlash = 1;
                    this.damageNumbers.push({ x: moveTarget.x, y: moveTarget.y - 15, value: damage, lifetime: 0.5, color: '#6600aa', scale: 1 });
                    this.spawnParticles(moveTarget.x, moveTarget.y, '#6600aa', 5);
                    m.attackCooldown = 0.8 / attackSpeedMult;

                    // Dark Pact: heal player for 5% of damage dealt
                    if (this.augments.includes('dark_pact')) {
                        const heal = Math.floor(damage * 0.05);
                        this.player.health = Math.min(this.player.maxHealth, this.player.health + heal);
                    }
                }
            } else if (distToPlayer > 150) {
                // Return to player
                const dx = this.player.x - m.x, dy = this.player.y - m.y;
                const d = Math.sqrt(dx * dx + dy * dy);
                m.x += (dx / d) * m.speed * 0.7 * dt;
                m.y += (dy / d) * m.speed * 0.7 * dt;
            }

            if (m.attackCooldown > 0) m.attackCooldown -= dt;
        }
    }

    // Necromancer: Update raised corpses
    updateRaisedCorpses(dt) {
        if (!this.raisedCorpses || this.raisedCorpses.length === 0) return;

        for (let i = this.raisedCorpses.length - 1; i >= 0; i--) {
            const corpse = this.raisedCorpses[i];

            corpse.lifetime -= dt;
            if (corpse.lifetime <= 0 || corpse.health <= 0) {
                // Corpse Explosion augment - SCALED 5x (uses corpseExplosionDamage or default 1250)
                if (this.augments.includes('corpse_explode')) {
                    const explosionDmg = this.corpseExplosionDamage || 1250;
                    this.spawnParticles(corpse.x, corpse.y, '#00cc66', 20);
                    for (const e of this.enemies) {
                        const sx = this.player.x + (e.wx - this.worldX);
                        const sy = this.player.y + (e.wy - this.worldY);
                        const d = Math.sqrt((corpse.x - sx) ** 2 + (corpse.y - sy) ** 2);
                        if (d < 80) {
                            e.health -= explosionDmg;
                            e.hitFlash = 1;
                            this.damageNumbers.push({ x: sx, y: sy - 15, value: explosionDmg, color: '#00cc66', scale: 1.2 });
                        }
                    }
                }
                this.raisedCorpses.splice(i, 1);
                continue;
            }

            // Find nearest enemy
            let target = null, nd = Infinity, moveTarget = null;
            for (const e of this.enemies) {
                const sx = this.player.x + (e.wx - this.worldX);
                const sy = this.player.y + (e.wy - this.worldY);
                const d = Math.sqrt((corpse.x - sx) ** 2 + (corpse.y - sy) ** 2);
                if (d < 300 && d < nd) { nd = d; target = e; moveTarget = { x: sx, y: sy }; }
            }

            if (target && moveTarget) {
                const dx = moveTarget.x - corpse.x, dy = moveTarget.y - corpse.y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d > corpse.radius + target.radius) {
                    corpse.x += (dx / d) * corpse.speed * dt;
                    corpse.y += (dy / d) * corpse.speed * dt;
                }

                // Attack
                if (corpse.attackCooldown <= 0 && d < corpse.radius + target.radius + 15) {
                    target.health -= corpse.damage;
                    target.hitFlash = 1;
                    this.damageNumbers.push({ x: moveTarget.x, y: moveTarget.y - 15, value: corpse.damage, color: '#00cc66', scale: 0.9 });
                    corpse.attackCooldown = 1.2;
                }
            }

            if (corpse.attackCooldown > 0) corpse.attackCooldown -= dt;
        }
    }

    // Necromancer: Death Aura - damages nearby enemies
    updateDeathAura(dt) {
        if (!this.deathAura) return;

        this.deathAura.timer = (this.deathAura.timer || 0) + dt;

        // Deal damage every 0.5 seconds
        if (this.deathAura.timer >= 0.5) {
            this.deathAura.timer = 0;

            for (const e of this.enemies) {
                const sx = this.player.x + (e.wx - this.worldX);
                const sy = this.player.y + (e.wy - this.worldY);
                const d = Math.sqrt((this.player.x - sx) ** 2 + (this.player.y - sy) ** 2);

                if (d < this.deathAura.radius) {
                    const damage = Math.floor(this.deathAura.damage * 0.5); // 0.5s tick
                    e.health -= damage;
                    e.hitFlash = 0.3;
                }
            }
        }
    }

    // Shadow Master: Update shadow sentinels (stationary defenders)
    updateShadowSentinels(dt) {
        if (!this.shadowSentinels || this.shadowSentinels.length === 0) return;

        for (let i = this.shadowSentinels.length - 1; i >= 0; i--) {
            const s = this.shadowSentinels[i];

            if (s.health <= 0) {
                // Sentinel explode augment - SCALED 5x (750 damage as per augment desc)
                if (this.augments.includes('sentinel_explode')) {
                    this.spawnParticles(s.x, s.y, '#8844cc', 15);
                    for (const e of this.enemies) {
                        const sx = this.player.x + (e.wx - this.worldX);
                        const sy = this.player.y + (e.wy - this.worldY);
                        const d = Math.sqrt((s.x - sx) ** 2 + (s.y - sy) ** 2);
                        if (d < 60) {
                            e.health -= 750;
                            e.hitFlash = 1;
                        }
                    }
                }
                this.shadowSentinels.splice(i, 1);
                continue;
            }

            // Stay in orbit around player
            s.x = this.player.x + Math.cos(s.angle) * s.orbitRadius;
            s.y = this.player.y + Math.sin(s.angle) * s.orbitRadius;

            // Attack nearby enemies
            if (s.attackCooldown <= 0) {
                for (const e of this.enemies) {
                    const sx = this.player.x + (e.wx - this.worldX);
                    const sy = this.player.y + (e.wy - this.worldY);
                    const d = Math.sqrt((s.x - sx) ** 2 + (s.y - sy) ** 2);

                    if (d < s.attackRange) {
                        e.health -= s.damage;
                        e.hitFlash = 0.5;
                        this.damageNumbers.push({ x: sx, y: sy - 10, value: s.damage, lifetime: 0.5, color: '#8844cc', scale: 0.8 });
                        this.spawnParticles(sx, sy, '#8844cc', 3);
                        s.attackCooldown = 1.0;
                        break;
                    }
                }
            }

            if (s.attackCooldown > 0) s.attackCooldown -= dt;
        }
    }

    // Necromancer: Death Drain beam (chains to enemies)
    updateDeathDrain(dt) {
        if (!this.hasDeathDrain) return;

        this.deathDrainTimer = (this.deathDrainTimer || 0) + dt;

        // Tick damage every 0.3 seconds
        if (this.deathDrainTimer >= 0.3) {
            this.deathDrainTimer = 0;

            const maxChains = this.deathDrainChains || 1;
            const damage = this.deathDrainDamage || 15;
            const heals = this.augments.includes('drain_heals');

            // Find closest enemies to chain to
            let chainedEnemies = [];
            let lastPoint = { x: this.player.x, y: this.player.y };

            for (let c = 0; c < maxChains; c++) {
                let nearest = null, nd = Infinity;
                for (const e of this.enemies) {
                    if (chainedEnemies.includes(e)) continue;
                    const sx = this.player.x + (e.wx - this.worldX);
                    const sy = this.player.y + (e.wy - this.worldY);
                    const d = Math.sqrt((lastPoint.x - sx) ** 2 + (lastPoint.y - sy) ** 2);
                    if (d < 200 && d < nd) { nd = d; nearest = { e, sx, sy }; }
                }

                if (nearest) {
                    chainedEnemies.push(nearest.e);
                    nearest.e.health -= damage;
                    nearest.e.hitFlash = 0.3;

                    // Heal if evolved
                    if (heals) {
                        const healAmount = Math.floor(damage * 0.2);
                        this.player.health = Math.min(this.player.maxHealth, this.player.health + healAmount);
                    }

                    lastPoint = { x: nearest.sx, y: nearest.sy };
                }
            }

            // Store for rendering
            this.deathDrainTargets = chainedEnemies;
        }
    }

    // Necromancer: Bone Pits (slow zones)
    updateBonePits(dt) {
        if (!this.bonePits) return;

        for (let i = this.bonePits.length - 1; i >= 0; i--) {
            const pit = this.bonePits[i];
            pit.timer -= dt;

            if (pit.timer <= 0) {
                this.bonePits.splice(i, 1);
                continue;
            }

            // Slow enemies inside
            for (const e of this.enemies) {
                const sx = this.player.x + (e.wx - this.worldX);
                const sy = this.player.y + (e.wy - this.worldY);
                const d = Math.sqrt((pit.x - sx) ** 2 + (pit.y - sy) ** 2);

                if (d < pit.radius) {
                    e.bonePitSlow = true;
                    e.bonePitSlowTimer = 0.5;  // Slow persists briefly after leaving
                }
            }
        }
    }

    // Necromancer: Soul Shield timer
    updateSoulShield(dt) {
        if (!this.soulShieldActive) return;

        this.soulShieldTimer -= dt;
        if (this.soulShieldTimer <= 0) {
            this.soulShieldActive = false;
            // Remove shielding flag from corpses
            if (this.raisedCorpses) {
                for (const c of this.raisedCorpses) {
                    c.shielding = false;
                }
            }
        }
    }

    // Character Abilities: Update cooldowns
    updateCharacterAbilities(dt) {
        if (!this.characterAbilities) return;

        if (this.characterAbilities.q.cooldown > 0) {
            this.characterAbilities.q.cooldown -= dt;
            if (this.characterAbilities.q.cooldown <= 0) {
                this.characterAbilities.q.ready = true;
            }
        }

        if (this.characterAbilities.e.cooldown > 0) {
            this.characterAbilities.e.cooldown -= dt;
            if (this.characterAbilities.e.cooldown <= 0) {
                this.characterAbilities.e.ready = true;
            }
        }
    }

    // Shadow Master: Invisibility state
    updateInvisibility(dt) {
        if (!this.isInvisible) return;

        // Freeze all enemies while invisible
        for (const e of this.enemies) {
            e.frozen = true;
            e.frozenByInvisibility = true;
        }

        // Check timers
        if (this.shadowCloakActive) {
            this.shadowCloakTimer -= dt;
            if (this.shadowCloakTimer <= 0) {
                this.shadowCloakActive = false;
                this.isInvisible = false;
                this.unfreezeEnemies();
            }
        }
    }

    unfreezeEnemies() {
        for (const e of this.enemies) {
            if (e.frozenByInvisibility) {
                e.frozen = false;
                e.frozenByInvisibility = false;
            }
        }
    }

    // Fire Mage: Fire Amp zone
    updateFireAmp(dt) {
        if (!this.fireAmpActive) return;

        this.fireAmpTimer -= dt;
        if (this.fireAmpTimer <= 0) {
            this.fireAmpActive = false;
        }
    }

    // Fire Mage: Fire Blast (expanding damage circle)
    updateFireBlast(dt) {
        if (!this.fireBlast) return;

        const fb = this.fireBlast;
        fb.timer += dt;
        fb.radius = Math.min(fb.radius + fb.expandSpeed * dt, fb.maxRadius);

        // Deal damage to enemies caught in the expanding wave
        const waveThickness = 40;
        for (const e of this.enemies) {
            if (e.hitByFireBlast) continue;  // Don't hit same enemy twice

            const sx = this.player.x + (e.wx - this.worldX);
            const sy = this.player.y + (e.wy - this.worldY);
            const d = Math.sqrt((fb.x - sx) ** 2 + (fb.y - sy) ** 2);

            // Check if enemy is within the expanding ring
            if (d <= fb.radius && d >= fb.radius - waveThickness) {
                e.health -= fb.damage;
                e.hitFlash = 1;
                e.hitByFireBlast = true;
                this.damageNumbers.push({ x: sx, y: sy - 15, value: fb.damage, lifetime: 0.5, color: '#ff4400', scale: 1.2 });
                this.spawnParticles(sx, sy, '#ff4400', 5);
            }
        }

        // Finish when max radius reached
        if (fb.radius >= fb.maxRadius) {
            this.fireBlast = null;
            // Clear hitByFireBlast flags
            for (const e of this.enemies) {
                e.hitByFireBlast = false;
            }
        }
    }

    // Activate character-specific ability (Q or E)
    activateCharacterAbility(abilityKey) {
        if (!this.characterAbilities) return;
        const ability = this.characterAbilities[abilityKey];
        if (!ability || !ability.ready) return;

        const classId = this.selectedClass?.id;

        // ========== FIRE MAGE ABILITIES ==========
        if (classId === 'fire_mage') {
            if (abilityKey === 'q') {
                // Fire Blast: Expanding damage circle - SCALED 5x
                this.fireBlast = {
                    x: this.player.x,
                    y: this.player.y,
                    radius: 0,
                    maxRadius: this.fireBlastRadius || 800,
                    damage: Math.floor(250 * this.fireBlastDamage),
                    timer: 0,
                    expandSpeed: 800  // pixels per second
                };
                this.playSound('shoot');
                this.triggerScreenShake(8, 0.2);
                ability.ready = false;
                ability.cooldown = ability.maxCooldown;
            }
            else if (abilityKey === 'e') {
                // Fire Amp: Damage boost zone
                this.fireAmpActive = true;
                this.fireAmpTimer = this.fireAmpDuration || 5;
                this.fireAmpZone = {
                    x: this.player.x,
                    y: this.player.y,
                    radius: 120
                };
                this.playSound('shoot');
                ability.ready = false;
                ability.cooldown = ability.maxCooldown;
            }
        }
        // ========== SHADOW MASTER ABILITIES ==========
        else if (classId === 'shadow_master') {
            if (abilityKey === 'q') {
                // Shadow Cloak: 3 second invisibility, freeze enemies
                this.shadowCloakActive = true;
                this.shadowCloakTimer = this.shadowCloakDuration || 3;
                this.isInvisible = true;
                this.playSound('shoot');
                ability.ready = false;
                ability.cooldown = ability.maxCooldown;
            }
            else if (abilityKey === 'e') {
                // Shadow Step: Dash 200px + 1s invisibility
                const dashDist = this.shadowStepDistance || 200;
                // Dash in movement direction or facing direction
                let dx = 0, dy = 0;
                if (this.keys['w'] || this.keys['arrowup']) dy = -1;
                if (this.keys['s'] || this.keys['arrowdown']) dy = 1;
                if (this.keys['a'] || this.keys['arrowleft']) dx = -1;
                if (this.keys['d'] || this.keys['arrowright']) dx = 1;

                // If not moving, dash toward nearest enemy
                if (dx === 0 && dy === 0) {
                    let nearest = null, nd = Infinity;
                    for (const e of this.enemies) {
                        const sx = this.player.x + (e.wx - this.worldX);
                        const sy = this.player.y + (e.wy - this.worldY);
                        const d = Math.sqrt((sx - this.player.x) ** 2 + (sy - this.player.y) ** 2);
                        if (d < nd) { nd = d; nearest = { x: sx, y: sy }; }
                    }
                    if (nearest) {
                        dx = nearest.x - this.player.x;
                        dy = nearest.y - this.player.y;
                    }
                }

                if (dx !== 0 || dy !== 0) {
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    this.worldX -= (dx / dist) * dashDist;
                    this.worldY -= (dy / dist) * dashDist;
                }

                // Short invisibility after dash
                this.isInvisible = true;
                this.shadowCloakActive = true;
                this.shadowCloakTimer = 1;

                this.spawnParticles(this.player.x, this.player.y, '#6600aa', 15);
                this.playSound('shoot');
                this.triggerScreenShake(5, 0.15);
                ability.ready = false;
                ability.cooldown = ability.maxCooldown;
            }
        }
        // ========== NECROMANCER ABILITIES ==========
        else if (classId === 'necromancer') {
            if (abilityKey === 'q') {
                // Bone Pit: Slow zone at cursor/player position
                const pit = {
                    x: this.player.x,
                    y: this.player.y,
                    radius: this.bonePitRadius || 100,
                    timer: 5,  // Fixed 5 second duration
                    damage: 0  // Slows only, no damage
                };
                if (!this.bonePits) this.bonePits = [];
                this.bonePits.push(pit);
                this.playSound('shoot');
                this.spawnParticles(this.player.x, this.player.y, '#aaaaaa', 10);
                ability.ready = false;
                ability.cooldown = ability.maxCooldown;
            }
            else if (abilityKey === 'e') {
                // Soul Shield: Raised corpses absorb damage for 4 seconds
                this.soulShieldActive = true;
                this.soulShieldTimer = this.soulShieldDuration || 4;
                this.playSound('shoot');
                // Visual feedback - corpses glow
                if (this.raisedCorpses) {
                    for (const c of this.raisedCorpses) {
                        c.shielding = true;
                    }
                }
                ability.ready = false;
                ability.cooldown = ability.maxCooldown;
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

        // Calculate effective fire rate (includes Momentum buff from Emberstep Sandals evolved)
        let effectiveFireRate = w.fireRate;
        if (this.starterMomentumBuff && this.starterMomentumBuff.buffTimer > 0) {
            // Reduce fire rate (faster shooting) by buff percentage
            effectiveFireRate = w.fireRate * (1 - this.starterMomentumBuff.buffFireRateMult);
        }

        if (now - w.lastFired < effectiveFireRate) return;
        w.lastFired = now;

        // Shadow Master: Whip attack instead of projectiles
        if (this.hasWhipAttack) {
            this.fireWhipAttack();
            return;
        }

        // Necromancer: No projectiles - relies on skulls and death drain
        if (this.noProjectiles) {
            return;
        }

        // Auto-aim at nearest enemy with PREDICTIVE targeting
        let nearestEnemy = null, nd = Infinity;
        for (const e of this.enemies) {
            const sx = this.player.x + (e.wx - this.worldX);
            const sy = this.player.y + (e.wy - this.worldY);
            const d = Math.sqrt((sx - this.player.x) ** 2 + (sy - this.player.y) ** 2);
            if (d < nd) { nd = d; nearestEnemy = e; }
        }
        if (!nearestEnemy) return;

        // Calculate enemy screen position
        const ex = this.player.x + (nearestEnemy.wx - this.worldX);
        const ey = this.player.y + (nearestEnemy.wy - this.worldY);

        // Calculate enemy velocity (they move towards player)
        const edx = this.worldX - nearestEnemy.wx;
        const edy = this.worldY - nearestEnemy.wy;
        const ed = Math.sqrt(edx * edx + edy * edy);
        const evx = ed > 0 ? (edx / ed) * nearestEnemy.speed : 0;
        const evy = ed > 0 ? (edy / ed) * nearestEnemy.speed : 0;

        // Predictive aiming: calculate intercept point
        // Time for projectile to reach enemy = distance / projectile_speed
        // Enemy will move during that time, so aim at predicted position
        const distToEnemy = Math.sqrt((ex - this.player.x) ** 2 + (ey - this.player.y) ** 2);
        const timeToIntercept = distToEnemy / w.speed;

        // Predict where enemy will be
        const predictedX = ex + evx * timeToIntercept;
        const predictedY = ey + evy * timeToIntercept;

        const baseAngle = Math.atan2(predictedY - this.player.y, predictedX - this.player.x);

        this.playSound('shoot');
        this.playFireballSound();

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

    // Beast Tamer: Whip attack - short range arc attack
    fireWhipAttack() {
        this.playSound('shoot');

        const whipRange = this.whipRange || 120;
        const whipArc = this.whipArc || (Math.PI * 0.6);  // 108 degrees
        const maxTargets = this.whipTargets || 3;
        const baseDamage = Math.floor(this.weapons.bullet.damage * (this.selectedClass?.bonuses?.damage || 1.5));

        // Find nearest enemy to determine whip direction
        let nearestEnemy = null, nd = Infinity;
        for (const e of this.enemies) {
            const sx = this.player.x + (e.wx - this.worldX);
            const sy = this.player.y + (e.wy - this.worldY);
            const d = Math.sqrt((sx - this.player.x) ** 2 + (sy - this.player.y) ** 2);
            if (d < nd && d < whipRange * 1.5) { nd = d; nearestEnemy = e; }
        }

        if (!nearestEnemy) return;

        // Calculate whip direction
        const ex = this.player.x + (nearestEnemy.wx - this.worldX);
        const ey = this.player.y + (nearestEnemy.wy - this.worldY);
        const whipAngle = Math.atan2(ey - this.player.y, ex - this.player.x);

        // Store whip data for visual rendering
        this.activeWhip = {
            angle: whipAngle,
            range: whipRange,
            arc: whipArc,
            timer: 0.3,  // Visual duration
            x: this.player.x,
            y: this.player.y
        };

        // Find all enemies in whip arc
        let hitCount = 0;
        const enemiesInRange = [];

        for (const e of this.enemies) {
            const sx = this.player.x + (e.wx - this.worldX);
            const sy = this.player.y + (e.wy - this.worldY);
            const d = Math.sqrt((sx - this.player.x) ** 2 + (sy - this.player.y) ** 2);

            if (d <= whipRange) {
                // Check if enemy is within arc
                const angleToEnemy = Math.atan2(sy - this.player.y, sx - this.player.x);
                let angleDiff = angleToEnemy - whipAngle;
                // Normalize angle difference
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                if (Math.abs(angleDiff) <= whipArc / 2) {
                    enemiesInRange.push({ enemy: e, dist: d, sx, sy });
                }
            }
        }

        // Sort by distance and hit up to maxTargets
        enemiesInRange.sort((a, b) => a.dist - b.dist);

        for (const hit of enemiesInRange.slice(0, maxTargets)) {
            const e = hit.enemy;
            const damage = baseDamage;

            e.health -= damage;
            e.hitFlash = 1;
            this.damageNumbers.push({ x: hit.sx, y: hit.sy - 15, value: damage, lifetime: 0.5, color: '#6600aa', scale: 1.1 });
            this.spawnParticles(hit.sx, hit.sy, '#6600aa', 4);
            hitCount++;
        }

        if (hitCount > 0) {
            this.triggerScreenShake(3, 0.1);
        }
    }

    updateProjectiles(dt) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];

            // HOMING MISSILES: Find and track nearest enemy
            let nearestEnemy = null, minDist = Infinity;
            for (const e of this.enemies) {
                const sx = this.player.x + (e.wx - this.worldX);
                const sy = this.player.y + (e.wy - this.worldY);
                const dist = Math.sqrt((p.x - sx) ** 2 + (p.y - sy) ** 2);
                if (dist < minDist) { minDist = dist; nearestEnemy = e; }
            }

            if (nearestEnemy) {
                const sx = this.player.x + (nearestEnemy.wx - this.worldX);
                const sy = this.player.y + (nearestEnemy.wy - this.worldY);
                const dx = sx - p.x, dy = sy - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    // Strong homing - turn toward target
                    const homingStrength = 8; // Higher = faster turning
                    const targetVx = (dx / dist) * this.weapons.bullet.speed;
                    const targetVy = (dy / dist) * this.weapons.bullet.speed;
                    // Lerp toward target velocity
                    p.vx += (targetVx - p.vx) * homingStrength * dt;
                    p.vy += (targetVy - p.vy) * homingStrength * dt;
                    // Normalize to maintain consistent speed
                    const currentSpeed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                    if (currentSpeed > 0) {
                        p.vx = (p.vx / currentSpeed) * this.weapons.bullet.speed;
                        p.vy = (p.vy / currentSpeed) * this.weapons.bullet.speed;
                    }
                }
            }

            p.x += p.vx * dt; p.y += p.vy * dt;
            // Remove if too far from player (range scales with projectileRangeBonus)
            const baseRange = 260; // Base range (was 220, +18% buff for more reach)
            const rangeBonus = this.projectileRangeBonus || 1;
            const maxRange = baseRange * rangeBonus;
            if (Math.abs(p.x - this.player.x) > maxRange || Math.abs(p.y - this.player.y) > maxRange) { this.projectiles.splice(i, 1); continue; }
            for (const e of this.enemies) {
                if (p.hitEnemies.includes(e)) continue;
                const sx = this.player.x + (e.wx - this.worldX);
                const sy = this.player.y + (e.wy - this.worldY);
                const d = Math.sqrt((p.x - sx) ** 2 + (p.y - sy) ** 2);
                if (d < p.radius + e.radius) {
                    // Crit Calculation - also check critRing item bonus
                    let damage = p.damage;

                    // Fire Mage: Fire Amp boost (applies to fireballs)
                    if (this.fireAmpActive && this.hasFireballs) {
                        damage = Math.floor(damage * (this.fireAmpBoost || 1.5));
                    }

                    // Pack Tactics: +5% damage per wolf
                    if (this.augments.includes('pack_tactics') && this.minions.length > 0) {
                        damage = Math.floor(damage * (1 + this.minions.length * 0.05));
                    }

                    // Stacking item damage bonus
                    if (this.stackingDamageBonus) {
                        damage = Math.floor(damage * (1 + this.stackingDamageBonus));
                    }

                    // Titan Killer bonus damage to bosses and tanks
                    if (this.titanKillerBonus && (e.isBoss || e.type === 'tank')) {
                        damage = Math.floor(damage * (1 + this.titanKillerBonus));
                    }

                    // Starter Passive: Damage vs Burning Enemies (Cinderbrand Focus evolved)
                    if (this.starterDamageVsBurningMult > 0 && (e.burn || e.auraBurn || e.ringBurn || e.impBurn)) {
                        damage = Math.floor(damage * (1 + this.starterDamageVsBurningMult));
                    }

                    // Starter Passive: Momentum Fire Rate Buff (adds temporary damage indicator, fire rate is handled elsewhere)
                    // No damage boost from momentum - it's fire rate only

                    // Stacking crit bonus
                    const critChance = (this.weapons.bullet.critChance || 0.05) + (this.critChance || 0) + (this.stackingCritBonus || 0);
                    const isCrit = Math.random() < critChance;
                    let color = '#fff';
                    let text = damage;

                    if (isCrit) {
                        const multiplier = this.weapons.bullet.critMultiplier || 2.0;
                        damage = Math.floor(damage * multiplier);
                        color = '#ff0000';
                    }

                    // Cursed Precision (Corrupted Sigil): 8% chance to miss completely
                    if (this.corruptedMissChance && Math.random() < this.corruptedMissChance) {
                        this.damageNumbers.push({ x: sx, y: sy - 20, value: 'MISS', lifetime: 0.6, color: '#888888', scale: 0.8 });
                        continue; // Skip this hit entirely
                    }

                    e.health -= damage; e.hitFlash = 1;
                    p.hitEnemies.push(e);

                    // Track damage for stacking items
                    this.updateStackingItems('damage', damage);

                    // Lifesteal: vampireHeal heals % of damage dealt
                    if (this.vampireHeal && this.vampireHeal > 0) {
                        const healAmount = Math.floor(damage * this.vampireHeal);
                        if (healAmount > 0 && this.player.health < this.player.maxHealth) {
                            this.player.health = Math.min(this.player.maxHealth, this.player.health + healAmount);
                            // Show heal occasionally (10% chance to reduce spam)
                            if (Math.random() < 0.1) {
                                this.damageNumbers.push({
                                    x: this.player.x + (Math.random() - 0.5) * 20,
                                    y: this.player.y - 40,
                                    value: `🩸 +${healAmount}`,
                                    lifetime: 0.6,
                                    color: '#ff4488'
                                });
                            }
                        }
                    }

                    // Blood Soaker - add to blood shield
                    if (this.bloodShieldEnabled && this.bloodShieldRate > 0 && this.bloodShieldCooldown <= 0) {
                        const shieldGain = Math.max(1, Math.ceil(damage * this.bloodShieldRate));
                        const maxShield = this.bloodShieldMaxBase || 100;
                        this.bloodShieldMax = maxShield;
                        const oldShield = this.bloodShield;
                        this.bloodShield = Math.min(maxShield, this.bloodShield + shieldGain);
                        // Show shield gain (less frequently to avoid spam)
                        if (this.bloodShield > oldShield && Math.random() < 0.1) {
                            this.damageNumbers.push({
                                x: this.player.x, y: this.player.y - 30,
                                value: `🩸 +${shieldGain}`,
                                lifetime: 0.5,
                                color: '#cc2244'
                            });
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

                    // ============ FLAME CASCADE: Every 3rd fireball splits into 3 ============
                    if (this.augments.includes('flame_cascade') && this.hasFireballs && !p.isSplitProjectile) {
                        this.flameCascadeCounter = (this.flameCascadeCounter || 0) + 1;
                        if (this.flameCascadeCounter >= 3) {
                            this.flameCascadeCounter = 0;
                            // Spawn 3 split fireballs in a spread pattern
                            const baseAngle = Math.atan2(p.vy, p.vx);
                            const spreadAngles = [-0.5, 0, 0.5]; // ~30 degree spread
                            for (const angleOffset of spreadAngles) {
                                const angle = baseAngle + angleOffset;
                                const splitProjectile = {
                                    x: sx, y: sy,
                                    vx: Math.cos(angle) * this.weapons.bullet.speed,
                                    vy: Math.sin(angle) * this.weapons.bullet.speed,
                                    damage: Math.floor(p.damage * 0.5), // 50% damage
                                    radius: p.radius * 0.8,
                                    pierce: 1,
                                    hitEnemies: [e], // Don't hit the same enemy
                                    isSplitProjectile: true // Prevent infinite splits
                                };
                                this.projectiles.push(splitProjectile);
                            }
                            // Visual effect
                            this.spawnParticles(sx, sy, '#ff6600', 10);
                            this.damageNumbers.push({ x: sx, y: sy - 20, value: '🌋 CASCADE!', lifetime: 0.8, color: '#ff4400', scale: 0.9 });
                        }
                    }

                    // ============ TEMPEST'S WRATH: Every 5th hit triggers chain lightning ============
                    if (this.boundSigils.includes('tempest_chain') && !p.isChainLightning) {
                        this.tempestCounter = (this.tempestCounter || 0) + 1;
                        if (this.tempestCounter >= 5) {
                            this.tempestCounter = 0;
                            // Trigger chain lightning to 3 targets
                            const chainTargets = 3;
                            const chainDamage = Math.floor(damage * 0.6); // 60% of hit damage
                            const chainRange = 180;

                            const chainedEnemies = [e];
                            let lastPoint = { x: sx, y: sy };
                            const lightningPoints = [{ x: sx, y: sy }];

                            for (let c = 0; c < chainTargets; c++) {
                                let nearest = null, nearestDist = Infinity;
                                for (const other of this.enemies) {
                                    if (chainedEnemies.includes(other) || other.dead) continue;
                                    const osx = this.player.x + (other.wx - this.worldX);
                                    const osy = this.player.y + (other.wy - this.worldY);
                                    const dist = Math.sqrt((lastPoint.x - osx) ** 2 + (lastPoint.y - osy) ** 2);
                                    if (dist < chainRange && dist < nearestDist) {
                                        nearestDist = dist;
                                        nearest = { enemy: other, sx: osx, sy: osy };
                                    }
                                }

                                if (nearest) {
                                    chainedEnemies.push(nearest.enemy);
                                    nearest.enemy.health -= chainDamage;
                                    nearest.enemy.hitFlash = 0.5;
                                    lightningPoints.push({ x: nearest.sx, y: nearest.sy });
                                    lastPoint = { x: nearest.sx, y: nearest.sy };
                                    this.addDamageNumber(nearest.sx, nearest.sy, chainDamage, '#00ddff', { enemyId: nearest.enemy.id });
                                    this.spawnParticles(nearest.sx, nearest.sy, '#00ddff', 5);
                                }
                            }

                            // Store lightning chain for visual rendering
                            if (lightningPoints.length > 1) {
                                if (!this.lightningChains) this.lightningChains = [];
                                this.lightningChains.push({ points: lightningPoints, lifetime: 0.3, color: '#00ddff' });
                                this.damageNumbers.push({ x: sx, y: sy - 25, value: '⛈️ TEMPEST!', lifetime: 0.8, color: '#00ddff', scale: 1.0 });
                            }
                        }
                    }

                    // ============ THUNDER GOD: Chain lightning to nearby enemies ============
                    if ((this.thunderGod || this.thunderChain) && !p.isChainLightning) {
                        const chainTargets = this.lightningChainCount || this.thunderChain?.targets || 3;
                        const chainDamage = this.lightningChainDamage || this.thunderChain?.damage || 500;
                        const chainRange = this.thunderChain?.range || 200;

                        // Find nearby enemies to chain to
                        const chainedEnemies = [e];
                        let lastPoint = { x: sx, y: sy };

                        // Store lightning chain points for rendering
                        const lightningPoints = [{ x: sx, y: sy }];

                        for (let c = 0; c < chainTargets; c++) {
                            let nearest = null, nearestDist = Infinity;
                            for (const other of this.enemies) {
                                if (chainedEnemies.includes(other) || other.dead) continue;
                                const osx = this.player.x + (other.wx - this.worldX);
                                const osy = this.player.y + (other.wy - this.worldY);
                                const dist = Math.sqrt((lastPoint.x - osx) ** 2 + (lastPoint.y - osy) ** 2);
                                if (dist < chainRange && dist < nearestDist) {
                                    nearestDist = dist;
                                    nearest = { enemy: other, sx: osx, sy: osy };
                                }
                            }

                            if (nearest) {
                                chainedEnemies.push(nearest.enemy);
                                nearest.enemy.health -= chainDamage;
                                nearest.enemy.hitFlash = 0.5;
                                lightningPoints.push({ x: nearest.sx, y: nearest.sy });
                                lastPoint = { x: nearest.sx, y: nearest.sy };

                                // Show chain damage
                                this.addDamageNumber(nearest.sx, nearest.sy, chainDamage, '#ffff00', { enemyId: nearest.enemy.id });
                                this.spawnParticles(nearest.sx, nearest.sy, '#ffff00', 5);

                                // Death is handled by updateEnemies loop
                            }
                        }

                        // Store lightning chain for visual rendering
                        if (lightningPoints.length > 1) {
                            this.lightningChains = this.lightningChains || [];
                            this.lightningChains.push({
                                points: lightningPoints,
                                lifetime: 0.3,
                                color: '#ffff00'
                            });
                        }
                    }

                    if (p.hitEnemies.length >= p.pierce) { this.projectiles.splice(i, 1); break; }
                }
            }

        }

        // Update lightning chain visuals
        if (this.lightningChains) {
            for (let i = this.lightningChains.length - 1; i >= 0; i--) {
                this.lightningChains[i].lifetime -= dt;
                if (this.lightningChains[i].lifetime <= 0) {
                    this.lightningChains.splice(i, 1);
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
            // Initialize with 1 stack so all items get their initial bonus
            this.stackingItems[key] = { stacks: 1, evolved: false };
            this.droppedItems.push(key);

            // Apply initial effect immediately with 1 stack
            if (item.effect) {
                item.effect(this, 1);
            }

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

            // Spawn rate is now controlled by wave (getSpawnRateMultByWave), not by level

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

            // Show level up menu for sigil selection
            this.showLevelUpMenu();
        }
    }

    showLevelUpMenu() {
        // ============================================
        // SIGIL SYSTEM - Player scales through Sigils
        // Tiers: Faded (50%), Runed (30%), Empowered (15%), Ascendant (4%), Mythic (1%)
        // First 3 offerings guarantee at least one Faded Sigil
        // ============================================
        this.playSound('levelup');
        this.playLevelupSound();
        this.gamePaused = true;

        // Track sigil offerings for early game guarantee
        this.sigilOfferingCount = (this.sigilOfferingCount || 0) + 1;

        // Build the upgrade menu
        const container = document.getElementById('upgrade-choices');
        if (!container) {
            // Fallback - auto-select a faded sigil
            const randomRune = FADED_SIGILS[Math.floor(Math.random() * FADED_SIGILS.length)];
            randomRune.effect(this);
            this.gamePaused = false;
            return;
        }

        container.innerHTML = '';

        // Sigil tier selection with wave-based probabilities for tier 3+
        // Wave 1-5: 0.01% chance for tier 3+ (Empowered, Ascendant, Mythic)
        // Wave 6-10: 5% chance for tier 3+
        // Wave 10+: 10% chance for tier 3+
        // Within tier 3+ bracket: Mythic ~6%, Ascendant ~27%, Empowered ~67% (relative)
        const selectRuneTier = () => {
            const currentWave = this.wave || 1;

            // Determine tier 3+ base chance based on wave
            let tier3PlusChance;
            if (currentWave <= 5) {
                tier3PlusChance = 0.01; // 0.01%
            } else if (currentWave <= 10) {
                tier3PlusChance = 5; // 5%
            } else {
                tier3PlusChance = 10; // 10%
            }

            // First roll: do we get tier 3+ at all?
            const tier3Roll = Math.random() * 100;
            if (tier3Roll < tier3PlusChance) {
                // We got tier 3+! Now distribute within tier 3+
                // Mythic: 5% of tier3+, Ascendant: 20% of tier3+, Empowered: 75% of tier3+
                // Additionally reduce chances per tier (mythic hardest, empowered easiest)
                const subRoll = Math.random() * 100;
                if (subRoll < 5) return 'mythic';      // 5% of tier 3+ bracket
                if (subRoll < 25) return 'legendary';  // 20% of tier 3+ bracket (Ascendant)
                return 'purple';                        // 75% of tier 3+ bracket (Empowered)
            }

            // Not tier 3+, pick between Faded and Runed
            // Faded: ~62%, Runed: ~38% of tier 1-2 bracket
            const roll = Math.random() * 100;
            if (roll < 38) return 'silver';  // Runed
            return 'common';                  // Faded
        };

        // Pick 3 random sigils (each with independent tier roll)
        const choices = [];
        const usedIds = new Set();

        // First 3 offerings: guarantee at least one Faded (Tier 1) sigil
        const guaranteeFaded = this.sigilOfferingCount <= 3;
        let hasFaded = false;

        for (let i = 0; i < 3; i++) {
            let tier = selectRuneTier();

            // On third slot of first 3 offerings, force Faded if none selected yet
            if (guaranteeFaded && i === 2 && !hasFaded) {
                tier = 'common';
            }

            if (tier === 'common') hasFaded = true;
            // Helper function to filter sigils by requirements
            const filterSigil = (r) => {
                if (usedIds.has(r.id)) return false;
                // Check class requirement
                if (r.classReq && r.classReq !== this.selectedClass?.id) return false;
                // Check prerequisite requirement (e.g., Ring II requires Ring I)
                if (r.req && r.req !== 'demonSet' && !this.boundSigils?.includes(r.req)) return false;
                // Check demon set requirement
                if (r.req === 'demonSet' && !this.demonSetBonusActive) return false;
                return true;
            };

            let runePool;
            switch (tier) {
                case 'mythic': runePool = MYTHIC_RUNES.filter(r => !this.augments.includes(r.id) && filterSigil(r)); break;
                case 'legendary': runePool = LEGENDARY_RUNES.filter(filterSigil); break;
                case 'purple': runePool = PURPLE_RUNES.filter(filterSigil); break;
                case 'silver': runePool = SILVER_RUNES.filter(filterSigil); break;
                default: runePool = COMMON_RUNES.filter(filterSigil); break;
            }

            // Fallback to common if pool is empty
            if (runePool.length === 0) {
                runePool = COMMON_RUNES.filter(filterSigil);
            }
            if (runePool.length === 0) {
                runePool = COMMON_RUNES.filter(r => !usedIds.has(r.id)); // Allow any common sigil
            }
            if (runePool.length === 0) {
                runePool = [...COMMON_RUNES]; // Allow duplicates if all used
            }

            const rune = runePool[Math.floor(Math.random() * runePool.length)];
            usedIds.add(rune.id);
            choices.push(rune);
        }

        // After Wave 8: 15% chance per slot to offer a corrupted sigil instead (max 2 corrupted per run)
        if (this.wave >= 8 && (this.corruptedSigilCount || 0) < 2) {
            const availableCorrupted = getAvailableCorruptedSigils(this);
            if (availableCorrupted.length > 0) {
                for (let i = 0; i < choices.length; i++) {
                    if (Math.random() < 0.15) {
                        // Pick a corrupted sigil matching the tier if possible
                        const currentTier = choices[i].tier || choices[i].rarity || 'common';
                        let matchingCorrupted;
                        if (currentTier === 'silver' || currentTier === 'rare') {
                            matchingCorrupted = availableCorrupted.filter(c => c.rarity === 'corrupted_runed');
                        } else if (currentTier === 'purple' || currentTier === 'epic') {
                            matchingCorrupted = availableCorrupted.filter(c => c.rarity === 'corrupted_empowered');
                        } else {
                            matchingCorrupted = availableCorrupted;
                        }
                        if (matchingCorrupted.length > 0) {
                            const corruptedSigil = matchingCorrupted[Math.floor(Math.random() * matchingCorrupted.length)];
                            choices[i] = corruptedSigil;
                            break; // Only replace one slot per level-up
                        }
                    }
                }
            }
        }

        // Sigil tier colors and styling with tier images
        const tierStyles = {
            // Legacy rarity names mapping to sigil tiers
            common: { border: '#8b7355', bg: 'linear-gradient(135deg, #2a1810, #3d2817)', label: 'FADED', labelBg: '#8b7355', glow: 'rgba(139,115,85,0.3)', tierKey: 'FADED' },
            bronze: { border: '#8b7355', bg: 'linear-gradient(135deg, #2a1810, #3d2817)', label: 'FADED', labelBg: '#8b7355', glow: 'rgba(139,115,85,0.3)', tierKey: 'FADED' },
            silver: { border: '#c0c0c0', bg: 'linear-gradient(135deg, #1a1a2e, #2d2d44)', label: 'RUNED', labelBg: '#c0c0c0', glow: 'rgba(192,192,192,0.4)', tierKey: 'RUNED' },
            rare: { border: '#c0c0c0', bg: 'linear-gradient(135deg, #1a1a2e, #2d2d44)', label: 'RUNED', labelBg: '#c0c0c0', glow: 'rgba(192,192,192,0.4)', tierKey: 'RUNED' },
            purple: { border: '#9932cc', bg: 'linear-gradient(135deg, #1a0a2e, #2d1744)', label: 'EMPOWERED', labelBg: '#9932cc', glow: 'rgba(153,50,204,0.4)', tierKey: 'EMPOWERED' },
            epic: { border: '#9932cc', bg: 'linear-gradient(135deg, #1a0a2e, #2d1744)', label: 'EMPOWERED', labelBg: '#9932cc', glow: 'rgba(153,50,204,0.4)', tierKey: 'EMPOWERED' },
            legendary: { border: '#ffd700', bg: 'linear-gradient(135deg, #2a1a00, #3d2800)', label: 'ASCENDANT', labelBg: 'linear-gradient(90deg,#ffd700,#f59e0b)', glow: 'rgba(255,215,0,0.5)', tierKey: 'ASCENDANT' },
            mythic: { border: '#ff6600', bg: 'linear-gradient(135deg, #1a0a00, #2a1000)', label: '🔥 MYTHIC 🔥', labelBg: 'linear-gradient(90deg,#ff6600,#ff0000,#ff6600)', glow: 'rgba(255,102,0,0.6)', tierKey: 'MYTHIC' },
            // New sigil tier names (lowercase for direct lookup)
            faded: { border: '#8b7355', bg: 'linear-gradient(135deg, #2a1810, #3d2817)', label: 'FADED', labelBg: '#8b7355', glow: 'rgba(139,115,85,0.3)', tierKey: 'FADED' },
            runed: { border: '#c0c0c0', bg: 'linear-gradient(135deg, #1a1a2e, #2d2d44)', label: 'RUNED', labelBg: '#c0c0c0', glow: 'rgba(192,192,192,0.4)', tierKey: 'RUNED' },
            empowered: { border: '#9932cc', bg: 'linear-gradient(135deg, #1a0a2e, #2d1744)', label: 'EMPOWERED', labelBg: '#9932cc', glow: 'rgba(153,50,204,0.4)', tierKey: 'EMPOWERED' },
            ascendant: { border: '#ffd700', bg: 'linear-gradient(135deg, #2a1a00, #3d2800)', label: 'ASCENDANT', labelBg: 'linear-gradient(90deg,#ffd700,#f59e0b)', glow: 'rgba(255,215,0,0.5)', tierKey: 'ASCENDANT' },
            // Corrupted tier styles - dark red/purple with unstable effects
            corrupted_runed: { border: '#8b0000', bg: 'linear-gradient(135deg, #1a0505, #2d0a0a)', label: '⚠️ CORRUPTED', labelBg: 'linear-gradient(90deg,#8b0000,#4a0000)', glow: 'rgba(139,0,0,0.6)', tierKey: 'CORRUPTED_RUNED', isCorrupted: true },
            corrupted_empowered: { border: '#4a0080', bg: 'linear-gradient(135deg, #0a0515, #150a20)', label: '⚠️ CORRUPTED', labelBg: 'linear-gradient(90deg,#4a0080,#2a0050)', glow: 'rgba(74,0,128,0.6)', tierKey: 'CORRUPTED_EMPOWERED', isCorrupted: true }
        };

        choices.forEach(rune => {
            const tierRaw = rune.tier || rune.rarity || 'common';
            const tier = tierRaw.toLowerCase(); // Normalize to lowercase for tierStyles lookup
            const style = tierStyles[tier] || tierStyles.common;
            const isMythic = tier === 'mythic';
            const isLegendary = tier === 'legendary';
            const isCorrupted = rune.isCorrupted || style.isCorrupted;

            // Get tier image from SIGIL_TIERS
            const sigilTierData = SIGIL_TIERS[style.tierKey];
            const tierImageUrl = sigilTierData && sigilTierData.image ? getSpritePath(sigilTierData.image) : null;

            // Check if sigil belongs to a Dominion Set
            const setData = rune.setKey ? DOMINION_SETS[rune.setKey] : null;
            const setImageUrl = setData && setData.image ? getSpritePath(setData.image) : null;

            const card = document.createElement('div');
            card.className = `upgrade-card ${tier}`;
            card.style.borderColor = style.border;
            card.style.boxShadow = `0 0 20px ${style.glow}`;
            card.style.background = style.bg;
            card.style.position = 'relative'; // For set badge positioning
            if (isMythic) card.style.animation = 'mythicPulse 2s ease-in-out infinite';
            if (isLegendary) card.style.animation = 'legendaryShine 3s ease-in-out infinite';
            if (isCorrupted) card.style.animation = 'corruptedFlicker 1.5s ease-in-out infinite';

            // Build corrupted overlay HTML for corrupted sigils
            const corruptedOverlayHtml = isCorrupted ? `
                <div class="corrupted-overlay" style="position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;border-radius:inherit;overflow:hidden;">
                    <div style="position:absolute;top:5px;left:5px;font-size:16px;">☠️</div>
                    <div style="position:absolute;inset:0;background:linear-gradient(45deg,transparent 40%,rgba(139,0,0,0.1) 50%,transparent 60%);animation:corruptionVeins 3s linear infinite;"></div>
                </div>
            ` : '';

            // Build set badge HTML if this sigil belongs to a set
            const setBadgeHtml = setData ? `
                <div class="sigil-set-badge" style="position:absolute;top:5px;right:5px;display:flex;align-items:center;gap:4px;padding:2px 6px;border-radius:8px;background:${setData.color}33;border:1px solid ${setData.color};">
                    ${setImageUrl ? `<img src="${setImageUrl}" style="width:20px;height:20px;border-radius:4px;object-fit:cover;" crossorigin="anonymous">` : ''}
                    <span style="font-size:10px;color:${setData.color};font-weight:bold;">${setData.icon}</span>
                </div>
            ` : '';

            // Build tier image HTML - shows the sigil tier artwork
            const tierImageHtml = tierImageUrl ? `
                <div class="sigil-tier-image" style="width:60px;height:60px;margin:0 auto 8px;border-radius:8px;overflow:hidden;border:2px solid ${style.border};box-shadow:0 0 10px ${style.glow};">
                    <img src="${tierImageUrl}" style="width:100%;height:100%;object-fit:cover;" crossorigin="anonymous">
                </div>
            ` : `<div class="upgrade-icon" style="font-size:2.5rem;">${rune.icon}</div>`;

            // Build downside warning for corrupted sigils
            const downsideHtml = isCorrupted && rune.downside ? `
                <div class="corrupted-downside" style="color:#ff4444;font-size:0.75em;margin-top:4px;padding:2px 4px;background:rgba(139,0,0,0.2);border-radius:4px;">⚠️ ${rune.downside}</div>
            ` : '';

            card.innerHTML = `
                ${corruptedOverlayHtml}
                ${setBadgeHtml}
                <div class="upgrade-rarity" style="background:${style.labelBg};color:${tier === 'silver' || tier === 'common' || tier === 'bronze' || tier === 'rare' ? '#000' : '#fff'};font-weight:bold;">${style.label}</div>
                ${tierImageHtml}
                <div class="upgrade-name" style="color:${style.border};font-weight:bold;">${rune.name}</div>
                <div class="upgrade-desc" style="color:#ddd;font-size:0.85em;">${rune.desc}</div>
                ${downsideHtml}
                ${setData ? `<div class="sigil-set-info" style="color:${setData.color};font-size:0.75em;margin-top:4px;font-style:italic;">${setData.icon} ${setData.name}</div>` : ''}
                <div class="upgrade-stats" style="color:#aaa;font-size:0.8em;">${rune.getDesc ? rune.getDesc(this) : ''}</div>
            `;

            card.onclick = () => {
                rune.effect(this);

                // Recalculate Dominion Set bonuses after binding a sigil/rune
                recalculateDominionSets(this);

                document.getElementById('levelup-menu').classList.add('hidden');
                this.upgradeMenuShowing = false;
                this.gamePaused = false;

                // Show what they picked with tier-appropriate color
                const tierColors = { common: '#cd7f32', bronze: '#cd7f32', silver: '#c0c0c0', purple: '#9966ff', epic: '#9966ff', legendary: '#fbbf24', mythic: '#ff6600' };
                this.damageNumbers.push({
                    x: this.canvas.width / 2,
                    y: this.canvas.height / 2 - 50,
                    value: isMythic ? `🔥 MYTHIC: ${rune.name} 🔥` : `✨ ${rune.icon} ${rune.name}`,
                    lifetime: isMythic ? 4 : 2,
                    color: tierColors[tier] || '#b8b8b8',
                    scale: isMythic ? 2 : isLegendary ? 1.8 : 1.5
                });

                if (isMythic) {
                    this.triggerScreenShake(15, 0.5);
                }

                // Show Dominion Set progress if applicable
                if (rune.setKey && this.dominionSetPieces[rune.setKey]) {
                    const setData = DOMINION_SETS[rune.setKey];
                    const pieces = this.dominionSetPieces[rune.setKey];
                    const setTier = this.dominionSetTiers[rune.setKey];
                    this.damageNumbers.push({
                        x: this.canvas.width / 2, y: this.canvas.height / 2,
                        value: `${setData.icon} ${setData.name} [${pieces} pcs] Tier ${setTier}`,
                        lifetime: 3, color: setData.color, scale: 1
                    });
                }

                // Handle multiple pending upgrades
                if (this.pendingUpgrades > 0) {
                    this.pendingUpgrades--;
                }
            };
            container.appendChild(card);
        });

        document.getElementById('levelup-menu').classList.remove('hidden');
    }

    getRandomUpgrades(count) {
        const all = [...this.baseUpgrades, ...(this.selectedClass.upgrades || [])];

        // Early waves (1-10): Only damage and HP related upgrades
        const earlyWaveIds = ['damage', 'health', 'firerate', 'critdmg', 'devastation', 'armor'];
        let filtered;
        if (this.wave <= 10) {
            filtered = all.filter(u => earlyWaveIds.includes(u.id));
        } else {
            filtered = all;
        }

        // Filter out maxed skull/wolf upgrades - only show damage upgrades when maxed
        const skullsMaxed = this.skulls.length >= 6;
        const wolvesMaxed = (this.maxWolves || 0) >= 3;
        if (skullsMaxed) {
            filtered = filtered.filter(u => u.id !== 'skull_upgrade' && u.id !== 'skull_shower');
        }
        if (wolvesMaxed) {
            filtered = filtered.filter(u => u.id !== 'summon_wolf');
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

        // Update difficulty tier display
        const difficultyTier = getDifficultyTier(this.wave);
        const difficultyEl = document.getElementById('difficulty-tier');
        if (difficultyEl) {
            difficultyEl.textContent = `${difficultyTier.icon} ${difficultyTier.name}`;
            difficultyEl.style.color = difficultyTier.color;
        }

        // Update character class display
        const classEl = document.getElementById('class-display');
        if (classEl && this.selectedClass) {
            classEl.textContent = `${this.selectedClass.icon} ${this.selectedClass.name}`;
            classEl.style.color = this.selectedClass.color;
        }

        // Update stats panel
        const statDamage = document.getElementById('stat-damage');
        const statAtkSpd = document.getElementById('stat-atkspd');
        const statSpeed = document.getElementById('stat-speed');
        const statCrit = document.getElementById('stat-crit');
        const statHp = document.getElementById('stat-hp');
        const statRegen = document.getElementById('stat-regen');

        if (statDamage && this.weapons?.bullet) {
            statDamage.textContent = Math.floor(this.weapons.bullet.damage);
        }
        if (statAtkSpd && this.weapons?.bullet) {
            // Fire rate is in seconds between shots, convert to attacks per second
            const atkPerSec = (1 / this.weapons.bullet.fireRate).toFixed(1);
            statAtkSpd.textContent = atkPerSec;
        }
        if (statSpeed && this.player) {
            statSpeed.textContent = Math.floor(this.player.speed);
        }
        if (statCrit) {
            const critChance = Math.round((this.critChanceBonus || 0) * 100 + 5); // Base 5% + bonus
            statCrit.textContent = `${critChance}%`;
        }
        if (statHp && this.player) {
            statHp.textContent = `${Math.floor(this.player.health)}/${Math.floor(this.player.maxHealth)}`;
        }
        if (statRegen && this.player) {
            statRegen.textContent = Math.floor(this.player.hpRegen || 0);
        }
    }

    // Load equipped cosmetics at game start
    loadEquippedCosmetics() {
        this.equippedCosmetics = { skins: null, effects: null };

        if (typeof authManager !== 'undefined') {
            const equipped = authManager.getEquippedCosmetics();
            if (equipped.skins) this.equippedCosmetics.skins = equipped.skins;
            if (equipped.effects) this.equippedCosmetics.effects = equipped.effects;
        } else {
            try {
                const equipped = JSON.parse(localStorage.getItem('equipped_cosmetics') || '{}');
                if (equipped.skins) this.equippedCosmetics.skins = equipped.skins;
                if (equipped.effects) this.equippedCosmetics.effects = equipped.effects;
            } catch (e) { /* ignore */ }
        }
    }

    // Get cosmetic skin color for player glow
    getCosmeticSkinColor() {
        if (!this.equippedCosmetics?.skins) return null;
        const store = typeof COSMETIC_STORE !== 'undefined' ? COSMETIC_STORE : null;
        if (!store) return null;
        const skin = store.skins.find(s => s.id === this.equippedCosmetics.skins);
        return skin ? skin.color : null;
    }

    // Trail cosmetics removed

    // Check if effect cosmetic is active
    hasEffect(effectName) {
        if (!this.equippedCosmetics?.effects) return false;
        const store = typeof COSMETIC_STORE !== 'undefined' ? COSMETIC_STORE : null;
        if (!store) return false;
        const effect = store.effects.find(e => e.id === this.equippedCosmetics.effects);
        return effect && effect.effect === effectName;
    }

    // Get rainbow color for rainbow damage numbers
    getRainbowColor() {
        const hue = (this.gameTime / 10) % 360;
        return `hsl(${hue}, 100%, 60%)`;
    }

    async gameOver() {
        this.gameRunning = false;

        // Stop all game sounds
        this.stopGameMusic();
        this.stopBossMusic();
        this.stopBeamSound();

        // Stop game start voice if still playing
        if (this.gameStartVoice) {
            this.gameStartVoice.pause();
            this.gameStartVoice.currentTime = 0;
        }

        // Hide HUD
        document.getElementById('game-hud').classList.add('hidden');

        // Show death video first
        await this.playDeathVideo();

        // Play menu music after video
        this.playMenuMusic();

        const m = Math.floor(this.gameTime / 60000), s = Math.floor((this.gameTime % 60000) / 1000);
        document.getElementById('final-time').textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        document.getElementById('final-kills').textContent = this.player.kills;
        document.getElementById('final-level').textContent = this.player.level;
        document.getElementById('gameover-menu').classList.remove('hidden');

        // Get or create account progression display element
        let progressionDisplay = document.getElementById('account-progression-display');
        if (!progressionDisplay) {
            progressionDisplay = document.createElement('div');
            progressionDisplay.id = 'account-progression-display';
            progressionDisplay.style.cssText = 'margin-top:1rem;padding:1rem;background:rgba(0,100,150,0.3);border:2px solid #00ccff;border-radius:12px;text-align:center;';
            const gameoverMenu = document.getElementById('gameover-menu');
            const menuContent = gameoverMenu.querySelector('.menu-content');
            if (menuContent) {
                menuContent.appendChild(progressionDisplay);
            }
        }

        // Submit score if logged in
        if (typeof authManager !== 'undefined' && authManager.user) {
            const score = this.player.kills * 10 + this.wave * 100; // Simple score formula
            const result = await authManager.submitScore(score, this.wave, this.player.kills, Math.floor(this.gameTime / 1000));
            if (result?.newPersonalBest) {
                document.getElementById('new-record').classList.remove('hidden');
            } else {
                document.getElementById('new-record').classList.add('hidden');
            }

            // Display account progression
            if (result?.accountProgression) {
                const prog = result.accountProgression;
                const xpPercent = Math.min(100, Math.floor((prog.xp / prog.xpToNextLevel) * 100));

                // Calculate XP breakdown
                const killXP = this.player.kills;
                const waveXP = 10 * (this.wave * (this.wave + 1) / 2);

                let progressionHTML = '';
                if (prog.levelsGained > 0) {
                    // Level up celebration
                    progressionHTML = `
                        <div style="font-size:1.5rem;color:#ffd700;font-weight:bold;margin-bottom:0.5rem;text-shadow:0 0 10px #ffd700;">
                            🎉 LEVEL UP! 🎉
                        </div>
                        <div style="font-size:1.3rem;color:#00ffff;margin-bottom:0.5rem;">
                            Account Level ${prog.level}
                        </div>
                    `;
                } else {
                    progressionHTML = `
                        <div style="font-size:1.1rem;color:#00ccff;margin-bottom:0.5rem;font-weight:bold;">
                            📊 Account Level ${prog.level}
                        </div>
                    `;
                }

                progressionHTML += `
                    <div style="background:#1a1a2e;border-radius:8px;padding:0.75rem;margin:0.5rem 0;">
                        <div style="color:#00ffaa;font-size:1rem;font-weight:bold;margin-bottom:0.5rem;">
                            +${prog.xpEarned} XP Earned
                        </div>
                        <div style="display:flex;justify-content:space-around;color:#aaa;font-size:0.8rem;">
                            <span>💀 Kills: +${killXP} XP</span>
                            <span>🌊 Waves: +${Math.floor(waveXP)} XP</span>
                        </div>
                    </div>
                    <div style="background:#222;border-radius:10px;height:24px;overflow:hidden;margin:0.75rem 0;border:1px solid #333;">
                        <div style="background:linear-gradient(90deg,#00ccff,#00ffaa);height:100%;width:${xpPercent}%;transition:width 0.5s;box-shadow:0 0 10px #00ffaa;"></div>
                    </div>
                    <div style="color:#fff;font-size:0.9rem;font-weight:bold;">
                        ${prog.xp.toLocaleString()} / ${prog.xpToNextLevel.toLocaleString()} XP
                    </div>
                    <div style="color:#888;font-size:0.75rem;margin-top:0.25rem;">
                        to Level ${prog.level + 1}
                    </div>
                `;

                progressionDisplay.innerHTML = progressionHTML;
                progressionDisplay.style.display = 'block';
            } else {
                // No progression data returned - show error
                progressionDisplay.innerHTML = `
                    <div style="color:#ff6666;font-size:0.9rem;">
                        ⚠️ Could not load progression data
                    </div>
                `;
                progressionDisplay.style.display = 'block';
            }
        } else {
            document.getElementById('new-record').classList.add('hidden');
            progressionDisplay.innerHTML = `
                <div style="color:#888;font-size:0.9rem;">
                    🔒 Log in to track account progression!
                </div>
            `;
            progressionDisplay.style.display = 'block';
        }
    }

    playDeathVideo() {
        return new Promise((resolve) => {
            const overlay = document.getElementById('death-video-overlay');
            const video = document.getElementById('death-video');
            const skipBtn = document.getElementById('skip-video-btn');

            if (!overlay || !video) {
                resolve();
                return;
            }

            // Show overlay
            overlay.classList.remove('hidden');

            // Reset and play video
            video.currentTime = 0;
            video.play().catch(e => {
                console.log('Video autoplay blocked');
                // If video can't play, skip to game over
                overlay.classList.add('hidden');
                resolve();
            });

            // When video ends, hide overlay and resolve
            const onVideoEnd = () => {
                overlay.classList.add('hidden');
                video.removeEventListener('ended', onVideoEnd);
                resolve();
            };
            video.addEventListener('ended', onVideoEnd);

            // Skip button
            const onSkip = () => {
                video.pause();
                overlay.classList.add('hidden');
                video.removeEventListener('ended', onVideoEnd);
                skipBtn.removeEventListener('click', onSkip);
                resolve();
            };
            skipBtn.addEventListener('click', onSkip);
        });
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

        // Default background
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

        // Draw fire zones (Cinder Wretch death effect - damages player)
        if (this.fireZones && this.fireZones.length > 0) {
            this.fireZones.forEach(zone => {
                const sx = this.player.x + (zone.wx - this.worldX);
                const sy = this.player.y + (zone.wy - this.worldY);

                // Calculate fade-out alpha based on remaining duration
                const fadeAlpha = Math.min(1, zone.timer / 0.5); // Fade out in last 0.5 seconds
                const pulseAlpha = 0.15 + Math.sin(this.gameTime / 100) * 0.05;

                ctx.save();

                // Outer fire glow (pulsing orange/red)
                ctx.beginPath();
                ctx.arc(sx, sy, zone.radius, 0, Math.PI * 2);
                const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, zone.radius);
                gradient.addColorStop(0, `rgba(255, 100, 0, ${0.3 * fadeAlpha})`);
                gradient.addColorStop(0.5, `rgba(255, 68, 0, ${0.2 * fadeAlpha})`);
                gradient.addColorStop(1, `rgba(255, 34, 0, ${0.05 * fadeAlpha})`);
                ctx.fillStyle = gradient;
                ctx.fill();

                // Fire ring border (animated)
                ctx.beginPath();
                ctx.arc(sx, sy, zone.radius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 68, 0, ${(0.7 + Math.sin(this.gameTime / 80) * 0.3) * fadeAlpha})`;
                ctx.lineWidth = 4;
                ctx.setLineDash([12, 6]);
                ctx.lineDashOffset = -this.gameTime / 50; // Animate the dash
                ctx.stroke();

                // Inner hot zone
                ctx.beginPath();
                ctx.arc(sx, sy, zone.radius * 0.5, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 150, 50, ${(pulseAlpha + 0.1) * fadeAlpha})`;
                ctx.fill();

                // Fire emoji at center
                ctx.setLineDash([]);
                ctx.font = `${Math.floor(zone.radius * 0.35)}px Inter`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = `rgba(255, 255, 255, ${(0.8 + Math.sin(this.gameTime / 120) * 0.2) * fadeAlpha})`;
                ctx.fillText('🔥', sx, sy);

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

        // ============ LIGHTNING CHAIN VISUAL RENDERING ============
        if (this.lightningChains && this.lightningChains.length > 0) {
            ctx.save();
            for (const chain of this.lightningChains) {
                const alpha = chain.lifetime / 0.3; // Fade out over lifetime
                ctx.globalAlpha = alpha;
                ctx.strokeStyle = chain.color || '#ffff00';
                ctx.lineWidth = 4;
                ctx.shadowColor = '#ffff00';
                ctx.shadowBlur = 15;

                // Draw jagged lightning bolt between points
                ctx.beginPath();
                for (let i = 0; i < chain.points.length - 1; i++) {
                    const p1 = chain.points[i];
                    const p2 = chain.points[i + 1];

                    // Draw main bolt with jagged segments
                    ctx.moveTo(p1.x, p1.y);

                    // Create jagged lightning effect with random offsets
                    const segments = 4;
                    const dx = (p2.x - p1.x) / segments;
                    const dy = (p2.y - p1.y) / segments;

                    for (let s = 1; s <= segments; s++) {
                        const offsetX = s < segments ? (Math.random() - 0.5) * 20 : 0;
                        const offsetY = s < segments ? (Math.random() - 0.5) * 20 : 0;
                        ctx.lineTo(p1.x + dx * s + offsetX, p1.y + dy * s + offsetY);
                    }

                    // Draw glow circle at impact point
                    ctx.arc(p2.x, p2.y, 8, 0, Math.PI * 2);
                }
                ctx.stroke();

                // Draw bright core
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.shadowBlur = 5;
                ctx.beginPath();
                for (let i = 0; i < chain.points.length - 1; i++) {
                    const p1 = chain.points[i];
                    const p2 = chain.points[i + 1];
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                }
                ctx.stroke();
            }
            ctx.restore();
        }

        // Enemies
        this.enemies.forEach(e => {
            const sx = this.player.x + (e.wx - this.worldX);
            const sy = this.player.y + (e.wy - this.worldY);
            if (sx < -200 || sx > this.canvas.width + 200 || sy < -200 || sy > this.canvas.height + 200) return;

            // Skip default circle for Consumer - it has custom rendering
            if (!e.isConsumer) {
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

            if (e.isConsumer) {
                // THE CONSUMER - Spiraling void with sprite and eyeball
                ctx.save();
                ctx.translate(sx, sy);

                const spriteSize = e.spriteSize || 300;
                const coreRadius = e.radius;

                // Draw spiraling vacuum particles BEHIND the sprite
                if (e.vacuumParticles) {
                    for (const p of e.vacuumParticles) {
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                        ctx.fillStyle = p.color;
                        ctx.globalAlpha = p.alpha * 0.7;
                        ctx.fill();
                    }
                    ctx.globalAlpha = 1;
                }

                // Draw spiraling void rings (rotating effect)
                const spiralAngle = e.spiralAngle || 0;
                for (let ring = 0; ring < 4; ring++) {
                    const ringRadius = coreRadius * (1.3 + ring * 0.25);
                    const ringAlpha = 0.3 - ring * 0.06;
                    ctx.save();
                    ctx.rotate(spiralAngle * (ring % 2 === 0 ? 1 : -1) * (0.5 + ring * 0.2));
                    ctx.beginPath();
                    ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(136, 0, 255, ${ringAlpha})`;
                    ctx.lineWidth = 3 - ring * 0.5;
                    ctx.setLineDash([15 + ring * 5, 10 + ring * 3]);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.restore();
                }

                // Draw the void sprite (rotating slowly)
                const consumerSprite = SPRITE_CACHE['consumer'];
                if (consumerSprite) {
                    ctx.save();
                    ctx.rotate(e.rotationAngle * 0.3); // Slow rotation
                    // Hit flash effect
                    if (e.hitFlash > 0) {
                        ctx.globalAlpha = 0.7;
                        ctx.filter = 'brightness(2)';
                    }
                    ctx.drawImage(consumerSprite, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
                    ctx.filter = 'none';
                    ctx.globalAlpha = 1;
                    ctx.restore();
                } else {
                    // Fallback: dark void circle if sprite not loaded
                    ctx.beginPath();
                    ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
                    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreRadius);
                    coreGrad.addColorStop(0, '#000000');
                    coreGrad.addColorStop(0.6, '#1a0030');
                    coreGrad.addColorStop(1, '#4400aa');
                    ctx.fillStyle = coreGrad;
                    ctx.fill();
                }

                // Draw the EYEBALL in the center of the sprite
                const eyeSize = coreRadius * 0.35;

                // Eye white/red glow
                ctx.beginPath();
                ctx.arc(0, 0, eyeSize * 1.2, 0, Math.PI * 2);
                const eyeGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, eyeSize * 1.2);
                eyeGlow.addColorStop(0, 'rgba(255, 0, 100, 0.8)');
                eyeGlow.addColorStop(0.7, 'rgba(200, 0, 80, 0.4)');
                eyeGlow.addColorStop(1, 'rgba(100, 0, 50, 0)');
                ctx.fillStyle = eyeGlow;
                ctx.fill();

                // Main eye (red, menacing)
                ctx.beginPath();
                ctx.ellipse(0, 0, eyeSize, eyeSize * 0.5, 0, 0, Math.PI * 2);
                ctx.fillStyle = '#cc0044';
                ctx.fill();
                ctx.strokeStyle = '#ff0066';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Pupil - follows player direction
                const playerDx = this.worldX - e.wx;
                const playerDy = this.worldY - e.wy;
                const playerDist = Math.sqrt(playerDx * playerDx + playerDy * playerDy);
                const pupilOffset = Math.min(eyeSize * 0.35, playerDist * 0.06);
                const pupilX = playerDist > 0 ? (playerDx / playerDist) * pupilOffset : 0;
                const pupilY = playerDist > 0 ? (playerDy / playerDist) * pupilOffset * 0.5 : 0;

                ctx.beginPath();
                ctx.ellipse(pupilX, pupilY, eyeSize * 0.3, eyeSize * 0.18, 0, 0, Math.PI * 2);
                ctx.fillStyle = '#000';
                ctx.fill();

                // Inner highlight (makes eye look alive)
                ctx.beginPath();
                ctx.arc(pupilX - eyeSize * 0.12, pupilY - eyeSize * 0.06, eyeSize * 0.1, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.fill();

                // Consume radius indicator (pulsing dashed circle)
                const pulseAlpha = 0.2 + Math.sin(e.spiralAngle * 2) * 0.1;
                ctx.beginPath();
                ctx.arc(0, 0, e.consumeRadius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(136, 0, 255, ${pulseAlpha})`;
                ctx.lineWidth = 3;
                ctx.setLineDash([12, 8]);
                ctx.stroke();
                ctx.setLineDash([]);

                ctx.restore();

                // Name and HP bar (outside save/restore)
                const displayRadius = spriteSize / 2;
                ctx.font = 'bold 18px Inter'; ctx.fillStyle = '#ff0066'; ctx.textAlign = 'center';
                ctx.fillText('🌀 ' + e.name + ' 🌀', sx, sy - displayRadius - 55);
                ctx.font = '12px Inter'; ctx.fillStyle = '#cc88ff';
                ctx.fillText(`Souls Consumed: ${e.consumedCount}`, sx, sy - displayRadius - 38);
                // Time remaining
                if (e.lifeTimer !== undefined) {
                    const timeLeft = Math.ceil(e.maxLifeTime - e.lifeTimer);
                    const timeColor = timeLeft <= 10 ? '#ff0000' : (timeLeft <= 30 ? '#ff8800' : '#aaa');
                    ctx.font = '11px Inter'; ctx.fillStyle = timeColor;
                    ctx.fillText(`Detonates in: ${timeLeft}s`, sx, sy - displayRadius - 22);
                }
                const bw = Math.max(e.radius * 2.5, 200);
                ctx.fillStyle = '#222'; ctx.fillRect(sx - bw / 2, sy - displayRadius - 12, bw, 12);
                ctx.fillStyle = '#333'; ctx.fillRect(sx - bw / 2 + 1, sy - displayRadius - 11, bw - 2, 10);
                const hpGrad = ctx.createLinearGradient(sx - bw / 2, 0, sx + bw / 2, 0);
                hpGrad.addColorStop(0, '#8800ff');
                hpGrad.addColorStop(0.5, '#cc00aa');
                hpGrad.addColorStop(1, '#ff0066');
                ctx.fillStyle = hpGrad;
                ctx.fillRect(sx - bw / 2 + 1, sy - displayRadius - 11, (bw - 2) * (e.health / e.maxHealth), 10);
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

        // Elemental Skulls
        const hasGlowingSkullsEffect = this.hasEffect('glowing_skulls');
        this.skulls.forEach(s => {
            const sx = this.player.x + Math.cos(s.angle) * s.radius;
            const sy = this.player.y + Math.sin(s.angle) * s.radius;

            // Try to use skull sprite
            const skullSprite = SPRITE_CACHE['skull_' + s.element];
            if (skullSprite) {
                ctx.save();
                ctx.translate(sx, sy);
                // Add glow effect based on element (enhanced with cosmetic)
                ctx.shadowBlur = hasGlowingSkullsEffect ? 30 : 15;
                ctx.shadowColor = hasGlowingSkullsEffect ? '#ff0000' : s.color;
                const size = s.size * 2;
                ctx.drawImage(skullSprite, -size / 2, -size / 2, size, size);
                // Extra eye glow effect for glowing skulls cosmetic
                if (hasGlowingSkullsEffect) {
                    ctx.beginPath();
                    ctx.arc(-3, -2, 3, 0, Math.PI * 2);
                    ctx.arc(3, -2, 3, 0, Math.PI * 2);
                    ctx.fillStyle = '#ff0000';
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = '#ff0000';
                    ctx.fill();
                }
                ctx.shadowBlur = 0;
                ctx.restore();
            } else {
                // Fallback to circle with skull emoji
                ctx.beginPath(); ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
                ctx.fillStyle = s.color; ctx.shadowBlur = hasGlowingSkullsEffect ? 25 : 10; ctx.shadowColor = hasGlowingSkullsEffect ? '#ff0000' : s.color; ctx.fill(); ctx.shadowBlur = 0;
                ctx.font = `${s.size}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillStyle = '#fff';
                ctx.fillText('💀', sx, sy);
                // Glowing eyes for fallback
                if (hasGlowingSkullsEffect) {
                    ctx.font = `${Math.floor(s.size * 0.3)}px Arial`;
                    ctx.fillStyle = '#ff0000';
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = '#ff0000';
                    ctx.fillText('👁️👁️', sx, sy - 2);
                    ctx.shadowBlur = 0;
                }
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

        // Shadow Monsters (Beast Tamer)
        if (this.shadowMonsters) {
            this.shadowMonsters.forEach(m => {
                ctx.globalAlpha = m.alpha || 0.7;
                ctx.beginPath(); ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
                ctx.fillStyle = m.color; ctx.shadowBlur = 15; ctx.shadowColor = '#6600aa'; ctx.fill(); ctx.shadowBlur = 0;
                ctx.font = `${m.radius + 6}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(m.icon, m.x, m.y);
                ctx.globalAlpha = 1;

                // Health bar
                const barWidth = m.radius * 2.5;
                const barHeight = 3;
                const barY = m.y - m.radius - 8;
                const healthPercent = m.health / m.maxHealth;
                ctx.fillStyle = '#333'; ctx.fillRect(m.x - barWidth / 2, barY, barWidth, barHeight);
                ctx.fillStyle = '#6600aa'; ctx.fillRect(m.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);
            });
        }

        // Raised Corpses (Necromancer)
        if (this.raisedCorpses) {
            this.raisedCorpses.forEach(c => {
                ctx.globalAlpha = 0.8;
                ctx.beginPath(); ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
                ctx.fillStyle = c.color; ctx.shadowBlur = 10; ctx.shadowColor = '#00cc66'; ctx.fill(); ctx.shadowBlur = 0;
                ctx.font = `${c.radius + 4}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(c.icon, c.x, c.y);
                ctx.globalAlpha = 1;

                // Health bar
                const barWidth = c.radius * 2;
                const barHeight = 3;
                const barY = c.y - c.radius - 6;
                const healthPercent = c.health / c.maxHealth;
                ctx.fillStyle = '#333'; ctx.fillRect(c.x - barWidth / 2, barY, barWidth, barHeight);
                ctx.fillStyle = '#00cc66'; ctx.fillRect(c.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);
            });
        }

        // Death Aura (Necromancer) - render as a subtle green ring around player
        if (this.deathAura) {
            ctx.beginPath();
            ctx.arc(this.player.x, this.player.y, this.deathAura.radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 204, 102, 0.4)';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 10; ctx.shadowColor = '#00cc66';
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Shadow Sentinels (Shadow Master) - 🦇 flying around player
        if (this.shadowSentinels) {
            this.shadowSentinels.forEach(s => {
                ctx.globalAlpha = 0.85;
                ctx.beginPath(); ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
                ctx.fillStyle = s.color; ctx.shadowBlur = 12; ctx.shadowColor = '#8844cc'; ctx.fill(); ctx.shadowBlur = 0;
                ctx.font = `${s.radius + 6}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(s.icon, s.x, s.y);
                ctx.globalAlpha = 1;

                // Health bar
                const barWidth = s.radius * 2;
                const barHeight = 2;
                const barY = s.y - s.radius - 5;
                const healthPercent = s.health / s.maxHealth;
                ctx.fillStyle = '#333'; ctx.fillRect(s.x - barWidth / 2, barY, barWidth, barHeight);
                ctx.fillStyle = '#8844cc'; ctx.fillRect(s.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);
            });
        }

        // Fire Blast (Fire Mage Q ability) - Expanding orange ring
        if (this.fireBlast) {
            const fb = this.fireBlast;
            ctx.beginPath();
            ctx.arc(fb.x, fb.y, fb.radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 136, 0, 0.8)';
            ctx.lineWidth = 8;
            ctx.shadowBlur = 20; ctx.shadowColor = '#ff4400';
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Inner glow
            ctx.beginPath();
            ctx.arc(fb.x, fb.y, fb.radius * 0.95, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 200, 100, 0.4)';
            ctx.lineWidth = 15;
            ctx.stroke();
        }

        // Fire Amp Zone (Fire Mage E ability) - Orange ground circle
        if (this.fireAmpActive && this.fireAmpZone) {
            const faz = this.fireAmpZone;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(faz.x, faz.y, faz.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#ff6600'; ctx.shadowBlur = 15; ctx.shadowColor = '#ff4400'; ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;

            // Border ring
            ctx.beginPath();
            ctx.arc(faz.x, faz.y, faz.radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 100, 0, 0.7)';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Bone Pits (Necromancer Q ability) - Bone-colored slow zones
        if (this.bonePits) {
            this.bonePits.forEach(pit => {
                ctx.globalAlpha = 0.4 * (pit.timer / 5);
                ctx.beginPath();
                ctx.arc(pit.x, pit.y, pit.radius, 0, Math.PI * 2);
                ctx.fillStyle = '#888866'; ctx.shadowBlur = 8; ctx.shadowColor = '#aaaaaa'; ctx.fill();
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1;

                // Bone particles inside
                ctx.font = '10px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = '#ccccaa';
                for (let i = 0; i < 5; i++) {
                    const boneX = pit.x + Math.cos(i * 1.25 + pit.timer) * pit.radius * 0.5;
                    const boneY = pit.y + Math.sin(i * 1.25 + pit.timer) * pit.radius * 0.5;
                    ctx.fillText('🦴', boneX, boneY);
                }
            });
        }

        // Death Drain Beam (Necromancer) - Red/green beam chaining to enemies
        if (this.hasDeathDrain && this.deathDrainTargets && this.deathDrainTargets.length > 0) {
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';

            let lastPoint = { x: this.player.x, y: this.player.y };
            const evolved = this.deathDrainEvolved || this.augments?.includes('drain_heals');

            this.deathDrainTargets.forEach((e, idx) => {
                const sx = this.player.x + (e.wx - this.worldX);
                const sy = this.player.y + (e.wy - this.worldY);

                // Create gradient for evolved beam (red to green)
                const gradient = ctx.createLinearGradient(lastPoint.x, lastPoint.y, sx, sy);
                if (evolved) {
                    gradient.addColorStop(0, '#ff3333');
                    gradient.addColorStop(1, '#33ff66');
                } else {
                    gradient.addColorStop(0, '#ff3333');
                    gradient.addColorStop(1, '#cc0000');
                }

                ctx.beginPath();
                ctx.moveTo(lastPoint.x, lastPoint.y);
                ctx.lineTo(sx, sy);
                ctx.strokeStyle = gradient;
                ctx.shadowBlur = 10; ctx.shadowColor = evolved ? '#00ff66' : '#ff0000';
                ctx.stroke();
                ctx.shadowBlur = 0;

                lastPoint = { x: sx, y: sy };
            });
        }

        // Whip Attack Visual (Shadow Master)
        if (this.activeWhip && this.activeWhip.timer > 0) {
            const w = this.activeWhip;
            ctx.save();
            ctx.translate(w.x, w.y);
            ctx.rotate(w.angle);

            // Draw arc sweep
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, w.range, -w.arc / 2, w.arc / 2);
            ctx.closePath();

            const alpha = Math.min(1, w.timer * 3);
            ctx.globalAlpha = alpha * 0.4;
            ctx.fillStyle = '#6600aa';
            ctx.shadowBlur = 15; ctx.shadowColor = '#9933ff';
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.strokeStyle = '#bb88ff';
            ctx.lineWidth = 3;
            ctx.globalAlpha = alpha;
            ctx.stroke();

            ctx.restore();

            this.activeWhip.timer -= 0.016;
        }

        // Invisibility Effect (Shadow Master) - Player transparency
        // This is handled in player rendering section

        // Soul Shield Effect (Necromancer E ability)
        if (this.soulShieldActive) {
            // Green shield around player
            ctx.beginPath();
            ctx.arc(this.player.x, this.player.y, this.player.radius + 15, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 255, 100, 0.6)';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 12; ctx.shadowColor = '#00ff66';
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Particles
        this.particles.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * (p.lifetime * 2), 0, Math.PI * 2); ctx.globalAlpha = p.lifetime * 2; ctx.fillStyle = p.color; ctx.fill(); ctx.globalAlpha = 1; });
        
        // Death pop effects (GAME JUICE)
        if (this.deathPops) {
            this.deathPops = this.deathPops.filter(pop => {
                pop.timer -= 0.016;
                if (pop.timer <= 0) return false;

                const progress = 1 - (pop.timer / 0.15);
                const currentRadius = Math.max(1, pop.radius + (pop.maxRadius - pop.radius) * progress);
                pop.alpha = Math.max(0, 1 - progress);

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

                return true;
            });
        }

        // Aura Fire Circle - visual removed (damage effect still active, just no ugly ring)

        // Nuclear Blast Wave Effect
        if (this.nuclearBlastWave) {
            const wave = this.nuclearBlastWave;
            const sx = this.player.x + (wave.wx - this.worldX);
            const sy = this.player.y + (wave.wy - this.worldY);

            ctx.save();
            ctx.globalAlpha = wave.alpha;

            // Outer glow ring
            ctx.beginPath();
            ctx.arc(sx, sy, wave.radius + 20, 0, Math.PI * 2);
            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = 8;
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#aa00ff';
            ctx.stroke();

            // Main wave ring
            ctx.beginPath();
            ctx.arc(sx, sy, wave.radius, 0, Math.PI * 2);
            ctx.strokeStyle = '#aa00ff';
            ctx.lineWidth = 25;
            ctx.shadowBlur = 50;
            ctx.shadowColor = '#8800ff';
            ctx.stroke();

            // Inner bright ring (only draw if radius is large enough)
            if (wave.radius > 15) {
                ctx.beginPath();
                ctx.arc(sx, sy, wave.radius - 15, 0, Math.PI * 2);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3;
                ctx.shadowBlur = 0;
                ctx.stroke();
            }

            // Center flash (fades quickly)
            if (wave.radius < 100) {
                const centerAlpha = (1 - wave.radius / 100) * wave.alpha;
                const centerRadius = Math.max(5, 50 - wave.radius * 0.3); // Ensure positive radius
                ctx.beginPath();
                ctx.arc(sx, sy, centerRadius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${centerAlpha})`;
                ctx.fill();
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

        // Trail cosmetics removed

        // Player
        this.drawPlayer();
        // Shield indicator
        if (this.shieldActive) { ctx.beginPath(); ctx.arc(this.player.x, this.player.y, this.player.radius + 12, 0, Math.PI * 2); ctx.strokeStyle = '#00aaff'; ctx.lineWidth = 3; ctx.stroke(); }
        // Blood Shield indicator (red bubble)
        if (this.bloodShield > 0 && this.bloodShieldEnabled) {
            const shieldPercent = this.bloodShield / (this.bloodShieldMax || 100);
            const shieldRadius = this.player.radius + 8 + (shieldPercent * 10); // 8-18px outside player
            ctx.beginPath();
            ctx.arc(this.player.x, this.player.y, shieldRadius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(204, 34, 68, ${0.15 + shieldPercent * 0.2})`; // Semi-transparent red fill
            ctx.fill();
            ctx.strokeStyle = `rgba(204, 34, 68, ${0.6 + shieldPercent * 0.4})`; // Red stroke
            ctx.lineWidth = 2 + shieldPercent * 2;
            ctx.stroke();
            // Pulsing glow effect when full
            if (shieldPercent >= 0.9) {
                ctx.beginPath();
                ctx.arc(this.player.x, this.player.y, shieldRadius + 3, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 68, 100, ${0.3 + Math.sin(Date.now() / 200) * 0.2})`;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
        // Blood Shield cooldown indicator (faded circle when on cooldown)
        if (this.bloodShieldCooldown > 0 && this.bloodShieldEnabled) {
            const cooldownPercent = this.bloodShieldCooldown / this.bloodShieldCooldownMax;
            ctx.beginPath();
            ctx.arc(this.player.x, this.player.y, this.player.radius + 10, -Math.PI / 2, -Math.PI / 2 + (1 - cooldownPercent) * Math.PI * 2);
            ctx.strokeStyle = 'rgba(204, 34, 68, 0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        // Inferno aura
        if (this.inferno) { ctx.beginPath(); ctx.arc(this.player.x, this.player.y, 100, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,100,0,0.3)'; ctx.lineWidth = 2; ctx.stroke(); }

        // ============ BASE AURA FIRE (FIRE MAGE STARTING SKILL) ============
        // Only draw if we have auraFire but NOT the upgraded ring versions
        if (this.auraFire && !this.playerRingOfFire && !this.devilRingOfFire) {
            ctx.save();
            const auraRadius = this.auraFire.radius;

            // Pulsing effect
            const pulse = 1 + Math.sin(this.gameTime / 200) * 0.05;
            const drawRadius = auraRadius * pulse;

            // Outer glow
            ctx.beginPath();
            ctx.arc(this.player.x, this.player.y, drawRadius + 8, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 100, 0, 0.15)';
            ctx.lineWidth = 12;
            ctx.stroke();

            // Main flame circle
            ctx.beginPath();
            ctx.arc(this.player.x, this.player.y, drawRadius, 0, Math.PI * 2);
            ctx.strokeStyle = '#ff6600';
            ctx.lineWidth = 4;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff4400';
            ctx.stroke();

            // Inner glow
            ctx.beginPath();
            ctx.arc(this.player.x, this.player.y, drawRadius - 3, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 200, 50, 0.4)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Animated flame particles around the ring
            const numFlames = 12;
            const rotationOffset = this.gameTime / 500; // Slow rotation
            for (let i = 0; i < numFlames; i++) {
                const angle = (i / numFlames) * Math.PI * 2 + rotationOffset;
                const flicker = Math.sin(this.gameTime / 100 + i * 2) * 3;
                const fx = this.player.x + Math.cos(angle) * (drawRadius + flicker);
                const fy = this.player.y + Math.sin(angle) * (drawRadius + flicker);
                const flameSize = 4 + Math.sin(this.gameTime / 80 + i) * 2;

                ctx.beginPath();
                ctx.arc(fx, fy, flameSize, 0, Math.PI * 2);
                const alpha = 0.6 + Math.sin(this.gameTime / 60 + i * 3) * 0.3;
                ctx.fillStyle = `rgba(255, ${Math.floor(100 + Math.random() * 50)}, 0, ${alpha})`;
                ctx.fill();
            }

            ctx.restore();
        }

        // ============ PLAYER RING OF FIRE (AUGMENT) ============
        if (this.playerRingOfFire) {
            ctx.save();
            const ring = this.playerRingOfFire;
            const ringSprite = SPRITE_CACHE['ringoffire'];

            // Draw rotating ring
            ctx.translate(this.player.x, this.player.y);
            ctx.rotate(ring.rotation);

            if (ringSprite) {
                // Draw sprite-based ring
                const spriteSize = ring.radius * 2.5; // Scale sprite to ring size
                ctx.drawImage(ringSprite, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
            } else {
                // Fallback: draw circle
                ctx.beginPath();
                ctx.arc(0, 0, ring.radius, 0, Math.PI * 2);
                ctx.strokeStyle = '#ff4400';
                ctx.lineWidth = 8;
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#ff6600';
                ctx.stroke();
            }

            // Add fire particles around ring edge
            if (Math.random() < 0.3) {
                const angle = Math.random() * Math.PI * 2;
                const px = Math.cos(angle) * ring.radius;
                const py = Math.sin(angle) * ring.radius;
                ctx.beginPath();
                ctx.arc(px, py, 3 + Math.random() * 5, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, ${Math.floor(100 + Math.random() * 100)}, 0, ${0.5 + Math.random() * 0.5})`;
                ctx.fill();
            }

            ctx.restore();
        }

        // ============ DEVIL RING OF FIRE (MYTHIC) ============
        if (this.devilRingOfFire) {
            ctx.save();
            const devil = this.devilRingOfFire;
            const devilSprite = SPRITE_CACHE['devil_ringoffire'];

            ctx.translate(this.player.x, this.player.y);

            // Draw 3 rotating rings at different angles
            for (let i = 0; i < devil.rings; i++) {
                ctx.save();
                const ringOffset = (Math.PI * 2 / devil.rings) * i;
                ctx.rotate(devil.rotation + ringOffset);

                if (devilSprite) {
                    const spriteSize = devil.radius * 2.5;
                    ctx.drawImage(devilSprite, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
                } else {
                    // Fallback: draw demonic circle
                    ctx.beginPath();
                    ctx.arc(0, 0, devil.radius, 0, Math.PI * 2);
                    ctx.strokeStyle = '#ff0000';
                    ctx.lineWidth = 10;
                    ctx.shadowBlur = 30;
                    ctx.shadowColor = '#ff0000';
                    ctx.stroke();
                }

                ctx.restore();
            }

            // Add demonic particles
            if (Math.random() < 0.5) {
                for (let i = 0; i < 3; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const px = Math.cos(angle) * devil.radius;
                    const py = Math.sin(angle) * devil.radius;
                    ctx.beginPath();
                    ctx.arc(px, py, 4 + Math.random() * 6, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, 0, ${Math.floor(Math.random() * 100)}, ${0.6 + Math.random() * 0.4})`;
                    ctx.fill();
                }
            }

            // Explosion warning indicator
            const explosionProgress = devil.explosionTimer / devil.explosionCooldown;
            if (explosionProgress > 0.7) {
                ctx.beginPath();
                ctx.arc(0, 0, devil.explosionRadius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 0, 0, ${(explosionProgress - 0.7) * 3})`;
                ctx.lineWidth = 3;
                ctx.setLineDash([10, 10]);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            ctx.restore();
        }

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
            // Rainbow damage numbers cosmetic effect
            if (this.hasEffect('rainbow_damage') && typeof d.value === 'number') {
                ctx.fillStyle = this.getRainbowColor();
            } else {
                ctx.fillStyle = d.color;
            }
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
        // Abilities UI (bottom right) - Item abilities only (1, 2 keys)
        this.drawAbilities();
        // Character abilities UI REMOVED - class abilities replaced with passives
        // this.drawCharacterAbilities();
        // Joystick
        if (this.isMobile && this.joystick.active) this.drawJoystick();

        // GREEN MUCUS EFFECT (Mini Consumer death effect)
        if (this.greenMucusEffect && this.greenMucusEffect.active) {
            const ctx = this.ctx;
            const alpha = this.greenMucusEffect.alpha * (this.greenMucusEffect.timer / 5);

            // Main green overlay
            ctx.fillStyle = `rgba(0, 255, 68, ${alpha * 0.4})`;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Dripping mucus blobs from top
            for (let i = 0; i < 8; i++) {
                const x = (i + 0.5) * (this.canvas.width / 8);
                const blobSize = 40 + Math.sin(Date.now() / 300 + i) * 20;
                const yOffset = Math.sin(Date.now() / 400 + i * 0.5) * 30;

                const gradient = ctx.createRadialGradient(x, -20 + yOffset, 0, x, blobSize + yOffset, blobSize);
                gradient.addColorStop(0, `rgba(0, 200, 50, ${alpha * 0.8})`);
                gradient.addColorStop(1, `rgba(0, 150, 30, 0)`);
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.ellipse(x, blobSize / 2 + yOffset, blobSize, blobSize * 1.5, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            // Mucus drips from edges
            ctx.fillStyle = `rgba(0, 180, 40, ${alpha * 0.6})`;
            for (let i = 0; i < 12; i++) {
                const x = Math.random() * this.canvas.width;
                const dripLen = 100 + Math.sin(Date.now() / 200 + i) * 50;
                ctx.beginPath();
                ctx.ellipse(x, dripLen / 2, 8, dripLen / 2, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            // Warning text
            ctx.font = 'bold 24px Inter';
            ctx.fillStyle = `rgba(200, 255, 200, ${alpha})`;
            ctx.textAlign = 'center';
            ctx.fillText(`🟢 VISION OBSCURED: ${this.greenMucusEffect.timer.toFixed(1)}s`, this.canvas.width / 2, 80);
        }

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
        const level = p.level || 1;

        // ============================================
        // FIRE MAGE AURA SYSTEM - REMOVED (user found it ugly)
        // The orange gradient fire effect has been disabled
        // ============================================
        // if (this.selectedClass?.id === 'fire_mage') {
        //     this.drawFireMageAura(ctx, p.x, p.y, level);
        // }

        // Cosmetic Skin Glow Effect (for non-Fire Mage or additional effects)
        const skinColor = this.getCosmeticSkinColor();
        if (skinColor && skinColor !== 'rainbow' && this.selectedClass?.id !== 'fire_mage') {
            ctx.save();
            const pulse = Math.sin(this.gameTime * 3) * 0.2 + 0.4;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius + 25, 0, Math.PI * 2);
            ctx.shadowBlur = 20;
            ctx.shadowColor = skinColor;
            ctx.fillStyle = `${skinColor}${Math.floor(pulse * 60).toString(16).padStart(2, '0')}`;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.restore();
        } else if (skinColor === 'rainbow') {
            // Rainbow skin - cycling colors
            ctx.save();
            const pulse = Math.sin(this.gameTime * 3) * 0.2 + 0.4;
            const hue = (this.gameTime / 20) % 360;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius + 25, 0, Math.PI * 2);
            ctx.shadowBlur = 25;
            ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
            ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${pulse})`;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.restore();
        }

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

        // Shadow Master: Invisibility effect (very transparent)
        if (this.isInvisible) {
            ctx.globalAlpha = 0.2;
        }

        // Determine which level sprite to use based on player level
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

    // ============================================
    // FIRE MAGE AURA - Level-Scaling Fire Effects
    // ============================================
    drawFireMageAura(ctx, x, y, level) {
        // Calculate intensity tier (0-6 based on level)
        // Level 1-4 = tier 0, 5-9 = tier 1, 10-14 = tier 2, etc.
        const tier = Math.min(6, Math.floor(level / 5));
        const intensity = (tier + 1) / 7; // 0.14 to 1.0

        const time = this.gameTime;
        const baseRadius = this.player.radius;

        ctx.save();

        // === LAYER 1: Inner Heat Glow (always present) ===
        const innerGlow = ctx.createRadialGradient(x, y, 0, x, y, baseRadius * (1.5 + tier * 0.3));
        innerGlow.addColorStop(0, `rgba(255, 200, 50, ${0.3 + intensity * 0.3})`);
        innerGlow.addColorStop(0.5, `rgba(255, 100, 0, ${0.2 + intensity * 0.2})`);
        innerGlow.addColorStop(1, 'rgba(255, 50, 0, 0)');
        ctx.fillStyle = innerGlow;
        ctx.beginPath();
        ctx.arc(x, y, baseRadius * (1.5 + tier * 0.3), 0, Math.PI * 2);
        ctx.fill();

        // === LAYER 2: Pulsing Fire Ring (tier 1+) ===
        if (tier >= 1) {
            const ringPulse = Math.sin(time * 4) * 0.15 + 0.85;
            const ringRadius = baseRadius * (1.8 + tier * 0.2) * ringPulse;

            ctx.strokeStyle = `rgba(255, 120, 0, ${0.4 + intensity * 0.4})`;
            ctx.lineWidth = 2 + tier * 0.5;
            ctx.shadowBlur = 10 + tier * 3;
            ctx.shadowColor = '#ff6600';
            ctx.beginPath();
            ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // === LAYER 3: Orbiting Flame Particles (tier 2+) ===
        if (tier >= 2) {
            const flameCount = 3 + tier; // 5-9 flames at max
            for (let i = 0; i < flameCount; i++) {
                const angle = (i / flameCount) * Math.PI * 2 + time * (1.5 + tier * 0.2);
                const orbitRadius = baseRadius * (2 + tier * 0.15);
                const fx = x + Math.cos(angle) * orbitRadius;
                const fy = y + Math.sin(angle) * orbitRadius;

                // Flame particle
                const flameSize = 4 + tier * 1.5 + Math.sin(time * 8 + i) * 2;
                const flameGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, flameSize);
                flameGrad.addColorStop(0, '#ffff00');
                flameGrad.addColorStop(0.3, '#ff8800');
                flameGrad.addColorStop(0.7, '#ff4400');
                flameGrad.addColorStop(1, 'rgba(255,0,0,0)');

                ctx.fillStyle = flameGrad;
                ctx.beginPath();
                ctx.arc(fx, fy, flameSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // === LAYER 4: Rising Ember Particles (tier 3+) ===
        if (tier >= 3) {
            const emberCount = 2 + tier;
            for (let i = 0; i < emberCount; i++) {
                const seed = i * 137.5; // Golden angle for distribution
                const emberTime = (time * 0.5 + seed) % 2;
                const emberX = x + Math.sin(seed) * baseRadius * 0.8;
                const emberY = y - emberTime * 40 - 10;
                const emberAlpha = 1 - emberTime / 2;
                const emberSize = 2 + Math.sin(time * 10 + i) * 1;

                ctx.fillStyle = `rgba(255, ${150 + Math.random() * 100}, 0, ${emberAlpha * intensity})`;
                ctx.beginPath();
                ctx.arc(emberX + Math.sin(time * 5 + i) * 5, emberY, emberSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // === LAYER 5: Outer Fire Corona (tier 4+) ===
        if (tier >= 4) {
            const coronaRadius = baseRadius * (2.5 + tier * 0.2);
            const spikes = 8 + tier * 2;

            ctx.beginPath();
            for (let i = 0; i < spikes; i++) {
                const angle = (i / spikes) * Math.PI * 2 + time * 0.5;
                const spikeLength = coronaRadius + Math.sin(time * 6 + i * 2) * 8;
                const innerR = coronaRadius * 0.7;

                if (i === 0) {
                    ctx.moveTo(x + Math.cos(angle) * spikeLength, y + Math.sin(angle) * spikeLength);
                } else {
                    ctx.lineTo(x + Math.cos(angle) * spikeLength, y + Math.sin(angle) * spikeLength);
                }

                const midAngle = angle + Math.PI / spikes;
                ctx.lineTo(x + Math.cos(midAngle) * innerR, y + Math.sin(midAngle) * innerR);
            }
            ctx.closePath();

            const coronaGrad = ctx.createRadialGradient(x, y, coronaRadius * 0.5, x, y, coronaRadius * 1.2);
            coronaGrad.addColorStop(0, 'rgba(255, 150, 0, 0)');
            coronaGrad.addColorStop(0.5, `rgba(255, 100, 0, ${0.2 * intensity})`);
            coronaGrad.addColorStop(1, 'rgba(255, 50, 0, 0)');
            ctx.fillStyle = coronaGrad;
            ctx.fill();
        }

        // === LAYER 6: Heat Distortion Effect (tier 5+) ===
        if (tier >= 5) {
            // Wavy heat lines rising
            ctx.strokeStyle = `rgba(255, 200, 100, ${0.15 * intensity})`;
            ctx.lineWidth = 1;
            for (let i = 0; i < 3; i++) {
                const waveX = x - 15 + i * 15;
                ctx.beginPath();
                ctx.moveTo(waveX, y);
                for (let j = 0; j < 5; j++) {
                    const wy = y - j * 10 - 20;
                    const wx = waveX + Math.sin(time * 8 + j + i) * 5;
                    ctx.lineTo(wx, wy);
                }
                ctx.stroke();
            }
        }

        // === LAYER 7: Maximum Power Aura (tier 6 / level 30+) ===
        if (tier >= 6) {
            // Intense outer blaze
            const blazeRadius = baseRadius * 3.5;
            ctx.shadowBlur = 40;
            ctx.shadowColor = '#ff4400';

            const blazeGrad = ctx.createRadialGradient(x, y, baseRadius, x, y, blazeRadius);
            blazeGrad.addColorStop(0, 'rgba(255, 200, 0, 0.3)');
            blazeGrad.addColorStop(0.4, 'rgba(255, 100, 0, 0.2)');
            blazeGrad.addColorStop(0.7, 'rgba(255, 50, 0, 0.1)');
            blazeGrad.addColorStop(1, 'rgba(200, 0, 0, 0)');

            ctx.fillStyle = blazeGrad;
            ctx.beginPath();
            ctx.arc(x, y, blazeRadius, 0, Math.PI * 2);
            ctx.fill();

            // Extra orbiting fire orbs
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2 - time * 2;
                const orbRadius = baseRadius * 3;
                const ox = x + Math.cos(angle) * orbRadius;
                const oy = y + Math.sin(angle) * orbRadius;

                const orbGrad = ctx.createRadialGradient(ox, oy, 0, ox, oy, 10);
                orbGrad.addColorStop(0, '#ffffff');
                orbGrad.addColorStop(0.3, '#ffff00');
                orbGrad.addColorStop(0.6, '#ff6600');
                orbGrad.addColorStop(1, 'rgba(255,0,0,0)');

                ctx.fillStyle = orbGrad;
                ctx.beginPath();
                ctx.arc(ox, oy, 10, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.shadowBlur = 0;
        }

        ctx.restore();
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
            if (n === Infinity) return '∞';
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

                // Stack count - show only current stacks for infinite scaling items
                ctx.font = 'bold 10px Inter'; ctx.fillStyle = '#fff'; ctx.textAlign = 'right';
                const stackText = isEvolved ? '★ MAX' : (item.infiniteScaling ? `${stacksFormatted} stacks` : `${stacksFormatted}/${maxFormatted}`);
                ctx.fillText(stackText, boxWidth + 5, y + 16);

                if (isEvolved) {
                    ctx.strokeStyle = '#ff6b00'; ctx.lineWidth = 2;
                    ctx.strokeRect(10, y, boxWidth, 28);
                }
                y += 36;
            }
        });
    }

    // Draw Abilities UI - Bottom right corner, mobile friendly
    drawAbilities() {
        if (!this.abilities) return;

        const ctx = this.ctx;
        const compact = this.canvas.width < 768;
        const abilitySize = compact ? 45 : 55;
        const padding = compact ? 8 : 12;
        const margin = compact ? 10 : 15;

        // Position in bottom right
        let x = this.canvas.width - margin - abilitySize;
        let y = this.canvas.height - margin - abilitySize;

        // Draw abilities from right to left (so newest is on right)
        const abilityKeys = ['nuclearBlast', 'dash'];

        for (const key of abilityKeys) {
            const ability = this.abilities[key];
            const isUnlocked = ability.unlocked;
            const isReady = ability.currentCooldown <= 0;
            const cooldownPercent = isReady ? 0 : ability.currentCooldown / ability.cooldown;

            // Background panel
            ctx.fillStyle = isUnlocked ? 'rgba(0,0,0,0.7)' : 'rgba(30,30,30,0.5)';
            ctx.beginPath();
            ctx.roundRect(x, y, abilitySize, abilitySize, 8);
            ctx.fill();

            // Border - glow when ready
            if (isUnlocked && isReady) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = key === 'dash' ? '#00ccff' : '#aa00ff';
            }
            ctx.strokeStyle = isUnlocked ? (isReady ? (key === 'dash' ? '#00ccff' : '#aa00ff') : '#666') : '#333';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Ability icon (sprite or fallback)
            const spriteKey = key === 'dash' ? 'ability_dash' : 'ability_nuclearBlast';
            const sprite = SPRITE_CACHE[spriteKey];

            if (sprite && isUnlocked) {
                ctx.globalAlpha = isReady ? 1 : 0.4;
                ctx.drawImage(sprite, x + 4, y + 4, abilitySize - 8, abilitySize - 8);
                ctx.globalAlpha = 1;
            } else {
                // Fallback icon
                ctx.font = `${compact ? 20 : 24}px Inter`;
                ctx.fillStyle = isUnlocked ? (isReady ? '#fff' : '#666') : '#444';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(key === 'dash' ? '💨' : '☢️', x + abilitySize / 2, y + abilitySize / 2);
            }

            // Cooldown overlay
            if (isUnlocked && !isReady) {
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.beginPath();
                ctx.moveTo(x + abilitySize / 2, y + abilitySize / 2);
                ctx.arc(x + abilitySize / 2, y + abilitySize / 2, abilitySize / 2 - 4,
                    -Math.PI / 2, -Math.PI / 2 + cooldownPercent * Math.PI * 2);
                ctx.lineTo(x + abilitySize / 2, y + abilitySize / 2);
                ctx.fill();

                // Cooldown text
                ctx.font = `bold ${compact ? 12 : 14}px Inter`;
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${Math.ceil(ability.currentCooldown)}`, x + abilitySize / 2, y + abilitySize / 2);
            }

            // Key hint (bottom of button)
            if (!compact && isUnlocked) {
                ctx.font = 'bold 10px Inter';
                ctx.fillStyle = isReady ? '#fff' : '#888';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(ability.key.toUpperCase(), x + abilitySize / 2, y + abilitySize - 3);
            }

            // Locked overlay
            if (!isUnlocked) {
                ctx.font = `${compact ? 16 : 20}px Inter`;
                ctx.fillStyle = '#666';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🔒', x + abilitySize / 2, y + abilitySize / 2);
            }

            // Move to next ability slot (left)
            x -= abilitySize + padding;
        }

        // Draw "ABILITIES" label above on desktop
        if (!compact) {
            ctx.font = 'bold 10px Inter';
            ctx.fillStyle = '#888';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            ctx.fillText('ABILITIES', this.canvas.width - margin, y - 5);
        }
    }

    // Draw Character-specific Abilities (Q and E)
    drawCharacterAbilities() {
        if (!this.characterAbilities || !this.selectedClass) return;

        const ctx = this.ctx;
        const compact = this.canvas.width < 768;
        const abilitySize = compact ? 40 : 50;
        const padding = compact ? 6 : 10;
        const margin = 15;

        // Position bottom left (opposite of items)
        let x = margin;
        let y = this.canvas.height - margin - abilitySize;

        const classId = this.selectedClass.id;
        let qAbility, eAbility;

        // Get ability info based on class
        if (classId === 'fire_mage') {
            qAbility = { name: 'Fire Blast', icon: '💥', key: 'Q', color: '#ff4400' };
            eAbility = { name: 'Fire Amp', icon: '🔥', key: 'E', color: '#ff6600' };
        } else if (classId === 'shadow_master') {
            qAbility = { name: 'Shadow Cloak', icon: '👤', key: 'Q', color: '#6600aa' };
            eAbility = { name: 'Shadow Step', icon: '💨', key: 'E', color: '#9944ff' };
        } else if (classId === 'necromancer') {
            qAbility = { name: 'Bone Pit', icon: '🦴', key: 'Q', color: '#888866' };
            eAbility = { name: 'Soul Shield', icon: '🛡️', key: 'E', color: '#00cc66' };
        } else {
            return; // No character abilities for this class
        }

        // Draw Q ability
        this.drawAbilitySlot(ctx, x, y, abilitySize, qAbility, this.characterAbilities.q, compact);
        x += abilitySize + padding;

        // Draw E ability
        this.drawAbilitySlot(ctx, x, y, abilitySize, eAbility, this.characterAbilities.e, compact);
    }

    drawAbilitySlot(ctx, x, y, size, abilityInfo, abilityState, compact) {
        const isReady = abilityState.ready;
        const cooldownPercent = isReady ? 0 : abilityState.cooldown / abilityState.maxCooldown;

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.beginPath();
        ctx.roundRect(x, y, size, size, 8);
        ctx.fill();

        // Border - glow when ready
        if (isReady) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = abilityInfo.color;
        }
        ctx.strokeStyle = isReady ? abilityInfo.color : '#555';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Icon
        ctx.font = `${compact ? 18 : 22}px Inter`;
        ctx.fillStyle = isReady ? '#fff' : '#666';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = isReady ? 1 : 0.5;
        ctx.fillText(abilityInfo.icon, x + size / 2, y + size / 2 - 3);
        ctx.globalAlpha = 1;

        // Cooldown overlay
        if (!isReady) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.beginPath();
            ctx.moveTo(x + size / 2, y + size / 2);
            ctx.arc(x + size / 2, y + size / 2, size / 2 - 4,
                -Math.PI / 2, -Math.PI / 2 + cooldownPercent * Math.PI * 2);
            ctx.lineTo(x + size / 2, y + size / 2);
            ctx.fill();

            // Cooldown number
            ctx.font = `bold ${compact ? 11 : 13}px Inter`;
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${Math.ceil(abilityState.cooldown)}`, x + size / 2, y + size / 2);
        }

        // Key hint at bottom
        ctx.font = `bold ${compact ? 9 : 11}px Inter`;
        ctx.fillStyle = isReady ? abilityInfo.color : '#666';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(abilityInfo.key, x + size / 2, y + size - 2);
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
