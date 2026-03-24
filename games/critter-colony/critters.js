/* ============================================================
   Critter Colony — Critter System
   ============================================================ */

// ─── CRITTER TYPES ──────────────────────────────────────────
const CRITTER_TYPES = {
    grass:  { name: 'Grass',  icon: '🌿', color: '#66bb6a', desc: 'Farming & food production', buildings: ['farm','greenhouse'] },
    fire:   { name: 'Fire',   icon: '🔥', color: '#ff7043', desc: 'Smelting & fuel processing', buildings: ['smelter','gas_refinery'] },
    muscle: { name: 'Muscle', icon: '💪', color: '#90a4ae', desc: 'Mining, lumber & combat',    buildings: ['mine','lumber_mill','iron_mine','oil_pump','gold_mine','diamond_drill'] },
    arcane: { name: 'Arcane', icon: '🔮', color: '#ce93d8', desc: 'Research, crafting & extractors', buildings: ['research_lab','workbench','crystal_extractor','refinery'] },
    beast:  { name: 'Beast',  icon: '🐾', color: '#8d6e63', desc: 'Patrol & bodyguard specialist', buildings: [] },
    water:  { name: 'Water',  icon: '💧', color: '#42a5f5', desc: 'Can swim. Companion grants water walk', buildings: ['greenhouse'], canSwim: true },
    fairy:  { name: 'Fairy',  icon: '✨', color: '#fff176', desc: 'Lucky crafter & healer',    buildings: ['workbench','healer'] },
};

// Type bonus: +50% production when assigned to a matching building type
// Wrong type: works but at -30% penalty
const TYPE_MATCH_BONUS = 0.50;
const TYPE_MISMATCH_PENALTY = -0.30;

const SPECIES = {
    // ── COMMON (8) ──────────────────────────────────────────
    mossbun:     { name: 'Mossbun',     type: 'grass',  color: '#66bb6a', rarity: 'common',    baseStats: { STR:3, DEX:4, INT:3, VIT:7, LCK:3 }, desc: 'A gentle grass critter. Great farmer.', aggressive: false, attackDmg: 2, attackCooldown: 2, size: 1 },
    pebblit:     { name: 'Pebblit',     type: 'muscle', color: '#90a4ae', rarity: 'common',    baseStats: { STR:7, DEX:3, INT:2, VIT:5, LCK:3 }, desc: 'Tough little rock critter. Born to mine.', aggressive: true, aggroRange: 8, attackDmg: 4, attackCooldown: 1.2, size: 1 },
    flickwing:   { name: 'Flickwing',   type: 'arcane', color: '#ffd54f', rarity: 'common',    baseStats: { STR:2, DEX:8, INT:4, VIT:3, LCK:3 }, desc: 'Fast and nimble. Excellent at crafting.', aggressive: false, attackDmg: 2, attackCooldown: 1.5, size: 1 },
    thornback:   { name: 'Thornback',   type: 'grass',  color: '#558b2f', rarity: 'common',    baseStats: { STR:5, DEX:3, INT:2, VIT:6, LCK:4 }, desc: 'Spiky hedgehog critter. Tough and reliable.', aggressive: true, aggroRange: 6, attackDmg: 5, attackCooldown: 1.4, size: 1 },
    mudgrub:     { name: 'Mudgrub',     type: 'beast',  color: '#795548', rarity: 'common',    baseStats: { STR:4, DEX:2, INT:1, VIT:8, LCK:2 }, desc: 'Ugly worm thing. Useless but very tanky.', aggressive: false, attackDmg: 1, attackCooldown: 3, size: 0.8 },
    dustmite:    { name: 'Dustmite',    type: 'beast',  color: '#bcaaa4', rarity: 'common',    baseStats: { STR:2, DEX:5, INT:2, VIT:4, LCK:6 }, desc: 'Tiny dust bug. Annoyingly fast and lucky.', aggressive: true, aggroRange: 5, attackDmg: 1, attackCooldown: 0.8, size: 0.6 },
    puffshroom:  { name: 'Puffshroom',  type: 'grass',  color: '#ef9a9a', rarity: 'common',    baseStats: { STR:1, DEX:1, INT:6, VIT:9, LCK:3 }, desc: 'Adorable mushroom blob. Great HP, terrible at everything else.', aggressive: false, attackDmg: 1, attackCooldown: 3, size: 1.1 },
    scraprat:    { name: 'Scraprat',    type: 'arcane', color: '#8d6e63', rarity: 'common',    baseStats: { STR:3, DEX:6, INT:3, VIT:3, LCK:5 }, desc: 'Ugly sewer rat. Scrappy crafter with luck.', aggressive: true, aggroRange: 6, attackDmg: 3, attackCooldown: 1.0, size: 0.9 },

    // ── UNCOMMON (6) ────────────────────────────────────────
    glowmite:    { name: 'Glowmite',    type: 'arcane', color: '#ce93d8', rarity: 'uncommon',  baseStats: { STR:2, DEX:3, INT:8, VIT:3, LCK:4 }, desc: 'A mysterious luminous critter. Great researcher.', aggressive: true, aggroRange: 10, attackDmg: 6, attackCooldown: 1.8, size: 1 },
    emberfox:    { name: 'Emberfox',    type: 'fire',   color: '#ff7043', rarity: 'uncommon',  baseStats: { STR:5, DEX:7, INT:3, VIT:4, LCK:5 }, desc: 'A fiery fox. Fast attacker and decent crafter.', aggressive: true, aggroRange: 10, attackDmg: 7, attackCooldown: 1.0, size: 1.2 },
    crystalhorn: { name: 'Crystalhorn', type: 'muscle', color: '#7e57c2', rarity: 'uncommon',  baseStats: { STR:6, DEX:2, INT:4, VIT:7, LCK:5 }, desc: 'Crystalline beetle. Incredibly sturdy miner.', aggressive: true, aggroRange: 8, attackDmg: 8, attackCooldown: 1.6, size: 1.3 },
    bogwalker:   { name: 'Bogwalker',   type: 'water',  color: '#4e342e', rarity: 'uncommon',  baseStats: { STR:8, DEX:1, INT:2, VIT:9, LCK:2 }, desc: 'Massive swamp toad. Slow but hits like a truck. Swims.', aggressive: true, aggroRange: 5, attackDmg: 12, attackCooldown: 2.5, size: 1.6 },
    sparkfly:    { name: 'Sparkfly',    type: 'arcane', color: '#80deea', rarity: 'uncommon',  baseStats: { STR:1, DEX:10, INT:5, VIT:2, LCK:6 }, desc: 'Tiny electric firefly. Lightning fast but fragile.', aggressive: false, attackDmg: 3, attackCooldown: 0.6, size: 0.7 },
    rotjaw:      { name: 'Rotjaw',      type: 'muscle', color: '#6d4c41', rarity: 'uncommon',  baseStats: { STR:7, DEX:4, INT:1, VIT:6, LCK:3 }, desc: 'Decaying lizard. Ugly and mean. Good fighter.', aggressive: true, aggroRange: 10, attackDmg: 9, attackCooldown: 1.3, size: 1.3 },

    // ── RARE (5) ────────────────────────────────────────────
    stormwing:   { name: 'Stormwing',   type: 'arcane', color: '#42a5f5', rarity: 'rare',      baseStats: { STR:4, DEX:10, INT:7, VIT:4, LCK:6 }, desc: 'Electric bird. Lightning fast, great at everything.', aggressive: true, aggroRange: 14, attackDmg: 10, attackCooldown: 0.8, size: 1.3 },
    ironshell:   { name: 'Ironshell',   type: 'muscle', color: '#78909c', rarity: 'rare',      baseStats: { STR:9, DEX:2, INT:3, VIT:12, LCK:5 }, desc: 'Armored turtle. Nearly indestructible tank.', aggressive: true, aggroRange: 6, attackDmg: 12, attackCooldown: 2.0, size: 1.5 },
    venomaw:     { name: 'Venomaw',     type: 'beast',  color: '#ab47bc', rarity: 'rare',      baseStats: { STR:7, DEX:6, INT:5, VIT:5, LCK:8 }, desc: 'Toxic frog. Poisons enemies and boosts luck.', aggressive: true, aggroRange: 12, attackDmg: 9, attackCooldown: 1.2, size: 1.2 },
    goretusk:    { name: 'Goretusk',    type: 'beast',  color: '#b71c1c', rarity: 'rare',      baseStats: { STR:12, DEX:4, INT:1, VIT:8, LCK:3 }, desc: 'Blood-red boar. Pure aggression. Terrible worker.', aggressive: true, aggroRange: 16, attackDmg: 16, attackCooldown: 1.0, size: 1.7 },
    faewisp:     { name: 'Faewisp',     type: 'fairy',  color: '#b2ff59', rarity: 'rare',      baseStats: { STR:1, DEX:6, INT:12, VIT:3, LCK:10 }, desc: 'Ethereal fairy. Incredible researcher and lucky.', aggressive: false, attackDmg: 2, attackCooldown: 2, size: 0.8 },

    // ── LEGENDARY (4) ───────────────────────────────────────
    shadowfang:  { name: 'Shadowfang',  type: 'beast',  color: '#5c2d91', rarity: 'legendary', baseStats: { STR:12, DEX:10, INT:6, VIT:8, LCK:8 }, desc: 'Dark wolf of shadow. Devastating in combat.', aggressive: true, aggroRange: 18, attackDmg: 18, attackCooldown: 0.7, size: 1.8 },
    celestine:   { name: 'Celestine',   type: 'fairy',  color: '#e0f7fa', rarity: 'legendary', baseStats: { STR:6, DEX:8, INT:14, VIT:10, LCK:10 }, desc: 'Celestial deer. Divine researcher and healer.', aggressive: true, aggroRange: 16, attackDmg: 14, attackCooldown: 1.0, size: 1.8 },
    dreadmaw:    { name: 'Dreadmaw',    type: 'beast',  color: '#1a1a1a', rarity: 'legendary', baseStats: { STR:15, DEX:6, INT:2, VIT:14, LCK:5 }, desc: 'Abyssal horror. Giant mouth. Eats everything.', aggressive: true, aggroRange: 20, attackDmg: 25, attackCooldown: 0.8, size: 2.2 },
    pixibell:  { name: 'Pixibell',  type: 'fairy',  color: '#fff176', rarity: 'legendary', baseStats: { STR:2, DEX:14, INT:12, VIT:4, LCK:14 }, desc: 'Adorable golden pixie. Absurdly lucky crafter.', aggressive: false, attackDmg: 5, attackCooldown: 1.5, size: 0.6 },
};

// ─── PASSIVE ABILITIES ──────────────────────────────────────
const PASSIVES = {
    // COMMON passives (high roll chance)
    hard_worker:    { name: 'Hard Worker',    rarity: 'common',    desc: 'Building produces 15% more resources', icon: '⚒️', effect: { prodBonus: 0.15 } },
    thick_skin:     { name: 'Thick Skin',     rarity: 'common',    desc: '+20% patrol HP',           icon: '🛡️', effect: { hpBonus: 0.20 } },
    quick_feet:     { name: 'Quick Feet',     rarity: 'common',    desc: '+25% move speed on patrol', icon: '👟', effect: { speedBonus: 0.25 } },
    keen_eye:       { name: 'Keen Eye',       rarity: 'common',    desc: '+10% capture rate bonus',  icon: '👁️', effect: { captureBonus: 0.10 } },
    glutton:        { name: 'Glutton',        rarity: 'common',    desc: '+30% food consumption',    icon: '🍖', effect: { foodPenalty: 0.30 }, negative: true },
    lazy:           { name: 'Lazy',           rarity: 'common',    desc: '-20% production speed',    icon: '😴', effect: { prodBonus: -0.20 }, negative: true },
    clumsy:         { name: 'Clumsy',         rarity: 'common',    desc: '-15% crafting speed',      icon: '🤕', effect: { craftBonus: -0.15 }, negative: true },
    cowardly:       { name: 'Cowardly',       rarity: 'common',    desc: 'Runs away 50% faster on patrol (less fighting)', icon: '🏃', effect: { fleeBonus: 0.50 }, negative: true },
    scrapper:       { name: 'Scrapper',       rarity: 'common',    desc: '+20% attack damage',       icon: '🔪', effect: { dmgBonus: 0.20 } },
    stubborn:       { name: 'Stubborn',       rarity: 'common',    desc: '+15% HP but -10% speed',   icon: '🐢', effect: { hpBonus: 0.15, speedBonus: -0.10 } },

    // UNCOMMON passives
    lumberjack:     { name: 'Lumberjack',     rarity: 'uncommon',  desc: '+50% wood yield when assigned', icon: '🪓', effect: { resourceBonus: { wood: 0.50 } } },
    quarry_master:  { name: 'Quarry Master',  rarity: 'uncommon',  desc: '+50% stone yield when assigned', icon: '⛏️', effect: { resourceBonus: { stone: 0.50 } } },
    green_thumb:    { name: 'Green Thumb',    rarity: 'uncommon',  desc: '+50% food yield when assigned', icon: '🌱', effect: { resourceBonus: { food: 0.50 } } },
    nimble_hands:   { name: 'Nimble Hands',   rarity: 'uncommon',  desc: '+30% crafting speed',      icon: '✋', effect: { craftBonus: 0.30 } },
    researcher:     { name: 'Researcher',     rarity: 'uncommon',  desc: '+30% research speed',      icon: '🔬', effect: { researchBonus: 0.30 } },
    brawler:        { name: 'Brawler',        rarity: 'uncommon',  desc: '+40% attack damage',       icon: '👊', effect: { dmgBonus: 0.40 } },
    tank:           { name: 'Tank',           rarity: 'uncommon',  desc: '+50% patrol HP, +25% aggro range', icon: '🛡️', effect: { hpBonus: 0.50, aggroBonus: 0.25 } },
    berserker:      { name: 'Berserker',      rarity: 'uncommon',  desc: '+60% dmg but takes +30% more damage', icon: '🔥', effect: { dmgBonus: 0.60, dmgTaken: 0.30 } },
    lifesteal:      { name: 'Lifesteal',      rarity: 'uncommon',  desc: 'Heals 20% of damage dealt on patrol', icon: '🩸', effect: { lifesteal: 0.20 } },
    fragile:        { name: 'Fragile',        rarity: 'uncommon',  desc: '-40% HP but +30% production', icon: '🥚', effect: { hpBonus: -0.40, prodBonus: 0.30 } },

    // RARE passives
    overachiever:   { name: 'Overachiever',   rarity: 'rare',      desc: 'Building produces 80% more resources (1.8x)', icon: '⭐', effect: { prodBonus: 0.80 } },
    iron_will:      { name: 'Iron Will',      rarity: 'rare',      desc: 'Survives lethal damage once per patrol', icon: '💪', effect: { deathSave: true } },
    lucky_star:     { name: 'Lucky Star',     rarity: 'rare',      desc: '+25% capture rate + double XP', icon: '🍀', effect: { captureBonus: 0.25, xpMulti: 2 } },
    double_harvest: { name: 'Double Harvest', rarity: 'rare',      desc: '20% chance to double resource yield', icon: '🎰', effect: { doubleChance: 0.20 } },
    mentor:         { name: 'Mentor',         rarity: 'rare',      desc: 'Nearby workers gain +50% XP',  icon: '📚', effect: { xpAura: 0.50 } },
    warlord:        { name: 'Warlord',        rarity: 'rare',      desc: '+100% dmg, +50% HP, attacks 30% faster', icon: '⚔️', effect: { dmgBonus: 1.00, hpBonus: 0.50, attackSpeedBonus: 0.30 } },
    thorns:         { name: 'Thorns',         rarity: 'rare',      desc: 'Reflects 40% damage back to attackers', icon: '🌵', effect: { thornsDmg: 0.40 } },
    vampiric:       { name: 'Vampiric',       rarity: 'rare',      desc: 'Heals 40% of damage dealt, +30% dmg at night', icon: '🧛', effect: { lifesteal: 0.40, nightDmg: 0.30 } },

    // LEGENDARY passives
    golden_touch:   { name: 'Golden Touch',   rarity: 'legendary', desc: 'Building produces 2.5x resources (ALL types)', icon: '👑', effect: { prodBonus: 1.50 } },
    undying:        { name: 'Undying',        rarity: 'legendary', desc: 'Cannot die on patrol. Respawns at 1 HP.', icon: '♾️', effect: { immortal: true } },
    architect:      { name: 'Architect',      rarity: 'legendary', desc: 'Buildings this critter works at have +100% HP', icon: '🏛️', effect: { bldgHpBonus: 1.00 } },
    prodigy:        { name: 'Prodigy',        rarity: 'legendary', desc: '+100% to ALL stat scaling', icon: '🧬', effect: { statMulti: 1.00 } },
    juggernaut:     { name: 'Juggernaut',     rarity: 'legendary', desc: '+200% HP, +150% dmg, immune to knockback', icon: '🏔️', effect: { hpBonus: 2.00, dmgBonus: 1.50, knockbackImmune: true } },
    reaper:         { name: 'Reaper',         rarity: 'legendary', desc: '10% chance to instantly kill wild critters', icon: '💀', effect: { executeChance: 0.10 } },
    gamba:          { name: 'Gamba',           rarity: 'rare',      desc: 'Chance to 2x crafted items (scales with INT)', icon: '🎲', effect: { gambaChance: true } },
    chopper:        { name: 'Chopper',         rarity: 'uncommon',  desc: '5x wood production when assigned to Lumber Mill', icon: '🪓', effect: { resourceBonus: { wood: 4.0 } } },
    ironlung:       { name: 'Iron Lung',       rarity: 'uncommon',  desc: '3x stone production when assigned to Mine', icon: '⛏️', effect: { resourceBonus: { stone: 2.0 } } },
    oil_baron:      { name: 'Oil Baron',       rarity: 'rare',      desc: '4x oil production from Oil Pump', icon: '🛢️', effect: { resourceBonus: { oil: 3.0 } } },
    goldfinger:     { name: 'Goldfinger',      rarity: 'rare',      desc: '3x gold production from Gold Mine', icon: '💰', effect: { resourceBonus: { gold: 2.0 } } },
    glass_cannon:   { name: 'Glass Cannon',    rarity: 'uncommon',  desc: '+200% dmg but -80% HP. One hit wonder.', icon: '💥', effect: { dmgBonus: 2.00, hpBonus: -0.80 } },
    scavenger:      { name: 'Scavenger',       rarity: 'common',    desc: '+15% all resource production', icon: '🔍', effect: { prodBonus: 0.15 } },
    cursed:         { name: 'Cursed',           rarity: 'common',    desc: '-50% production, -30% HP. Terrible.', icon: '☠️', effect: { prodBonus: -0.50, hpBonus: -0.30 }, negative: true },
    bottomless_pit: { name: 'Bottomless Pit',  rarity: 'common',    desc: '+100% food consumption. Always hungry.', icon: '🕳️', effect: { foodPenalty: 1.00 }, negative: true },

    // ── COMPANION PASSIVES (only activate when assigned as companion) ──
    waterwalker:    { name: 'Waterwalker',    rarity: 'uncommon',  desc: 'COMPANION: Player can walk on water',   icon: '🌊', effect: { companionWaterWalk: true }, companionOnly: true },
    swiftrunner:    { name: 'Swift Runner',   rarity: 'uncommon',  desc: 'COMPANION: +30% player move speed',     icon: '🏃', effect: { companionSpeed: 0.30 }, companionOnly: true },
    strongback:     { name: 'Strong Back',    rarity: 'uncommon',  desc: 'COMPANION: +50% mining/chopping speed', icon: '⛏️', effect: { companionMine: 0.50 }, companionOnly: true },
    sharpshooter:   { name: 'Sharpshooter',   rarity: 'rare',      desc: 'COMPANION: +40% gun damage',            icon: '🎯', effect: { companionGunDmg: 0.40 }, companionOnly: true },
    treasure_sense: { name: 'Treasure Sense', rarity: 'rare',      desc: 'COMPANION: Reveals nearby resource nodes on minimap', icon: '🗺️', effect: { companionReveal: true }, companionOnly: true },
    iron_stomach:   { name: 'Iron Stomach',   rarity: 'uncommon',  desc: 'COMPANION: -50% player food consumption', icon: '🍽️', effect: { companionFoodSave: 0.50 }, companionOnly: true },
    magnetism:      { name: 'Magnetism',      rarity: 'rare',      desc: 'COMPANION: Auto-pickup resources in 3 tile range', icon: '🧲', effect: { companionMagnet: 3 }, companionOnly: true },
    lucky_charm:    { name: 'Lucky Charm',    rarity: 'legendary', desc: 'COMPANION: +30% capture rate for ALL snares', icon: '🎰', effect: { companionCapture: 0.30 }, companionOnly: true },
};

const PASSIVE_POOL = {
    common: Object.keys(PASSIVES).filter(k => PASSIVES[k].rarity === 'common'),
    uncommon: Object.keys(PASSIVES).filter(k => PASSIVES[k].rarity === 'uncommon'),
    rare: Object.keys(PASSIVES).filter(k => PASSIVES[k].rarity === 'rare'),
    legendary: Object.keys(PASSIVES).filter(k => PASSIVES[k].rarity === 'legendary'),
};

const RARITY_COLORS = { common: '#aaa', uncommon: '#8bc34a', rare: '#ffc107', legendary: '#e040fb' };
const CATCH_RATES = { common: 0.70, uncommon: 0.40, rare: 0.20, legendary: 0.05 };
const RARITY_HP = { common: 30, uncommon: 50, rare: 80, legendary: 150 };

// ─── SNARE TIERS (trap types) ───────────────────────────────
// Higher tiers needed for rarer critters. Using wrong tier = 0% catch rate.
const SNARE_TIERS = {
    rope_snare:    { name: 'Rope Snare',    tier: 1, color: '#8d6e63', captures: ['common'],                     craftCost: { wood: 5, stone: 3 }, desc: 'Basic snare. Catches common critters.' },
    iron_snare:    { name: 'Iron Snare',     tier: 2, color: '#78909c', captures: ['common','uncommon'],          craftCost: { wood: 5, iron: 3 }, desc: 'Reinforced snare. Catches uncommon.', researchReq: 'ironSnare' },
    gold_snare:    { name: 'Gold Snare',     tier: 3, color: '#ffd700', captures: ['common','uncommon','rare'],   craftCost: { iron: 3, gold: 2 }, desc: 'Enchanted snare. Catches rare.', researchReq: 'goldSnare' },
    diamond_snare: { name: 'Diamond Snare',  tier: 4, color: '#81d4fa', captures: ['common','uncommon','rare','legendary'], craftCost: { gold: 2, diamond: 1 }, desc: 'Perfect snare. Catches legendary.', researchReq: 'diamondSnare' },
};
const WILD_MIN_COUNT = 16;
const WILD_MAX_COUNT = 24;
const CAPTURE_RANGE = 2.5; // in tiles

let _nextCritterId = 1;

class Critters {
    // Check if critter type matches a building
    static getTypeBonus(critter, buildingType) {
        const sp = SPECIES[critter.species];
        if (!sp || !sp.type) return 0;
        const typeInfo = CRITTER_TYPES[sp.type];
        if (!typeInfo) return 0;
        if (typeInfo.buildings.includes(buildingType)) return TYPE_MATCH_BONUS;
        if (typeInfo.buildings.length > 0) return TYPE_MISMATCH_PENALTY; // has specialties but this isn't one
        return 0; // beast type — no building specialty, no penalty
    }

    static rollStats(species) {
        const base = SPECIES[species].baseStats;
        const stats = {};
        for (const key of Object.keys(base)) {
            stats[key] = Math.max(1, base[key] + Math.floor(Math.random() * 5) - 2);
        }
        return stats;
    }

    static rollPassives(speciesRarity) {
        const passives = [];
        // Each critter gets 1-3 passives based on rarity
        const count = speciesRarity === 'legendary' ? 3 : speciesRarity === 'rare' ? 2 : speciesRarity === 'uncommon' ? 2 : 1;
        // Extra roll chance for a bonus passive
        const bonusChance = speciesRarity === 'legendary' ? 0.5 : speciesRarity === 'rare' ? 0.3 : 0.15;
        const totalSlots = count + (Math.random() < bonusChance ? 1 : 0);

        for (let i = 0; i < totalSlots; i++) {
            // Roll rarity of this passive slot
            const roll = Math.random();
            let pool;
            if (roll < 0.03) pool = PASSIVE_POOL.legendary;
            else if (roll < 0.12) pool = PASSIVE_POOL.rare;
            else if (roll < 0.35) pool = PASSIVE_POOL.uncommon;
            else pool = PASSIVE_POOL.common;

            const id = pool[Math.floor(Math.random() * pool.length)];
            if (!passives.includes(id)) passives.push(id);
        }
        return passives;
    }

    // Get total passive effect value for a critter
    static getPassiveEffect(critter, effectKey) {
        if (!critter.passives) return 0;
        let total = 0;
        for (const pid of critter.passives) {
            const p = PASSIVES[pid];
            if (!p || !p.effect) continue;
            if (p.effect[effectKey] !== undefined) total += p.effect[effectKey];
        }
        return total;
    }

    static hasPassive(critter, effectKey) {
        if (!critter.passives) return false;
        return critter.passives.some(pid => {
            const p = PASSIVES[pid];
            return p && p.effect && p.effect[effectKey];
        });
    }

    static spawnWild(world) {
        const wilds = [];
        const rng = world._seededRng(world.seed + 7777);
        const count = WILD_MIN_COUNT + Math.floor(Math.random() * (WILD_MAX_COUNT - WILD_MIN_COUNT + 1));

        const commonKeys = Object.keys(SPECIES).filter(k => SPECIES[k].rarity === 'common');
        const uncommonKeys = Object.keys(SPECIES).filter(k => SPECIES[k].rarity === 'uncommon');
        const rareKeys = Object.keys(SPECIES).filter(k => SPECIES[k].rarity === 'rare');
        const legendaryKeys = Object.keys(SPECIES).filter(k => SPECIES[k].rarity === 'legendary');

        for (let i = 0; i < count; i++) {
            const pos = world.randomGrassTile(rng);
            // Weight by rarity: 50% common, 25% uncommon, 18% rare, 7% legendary
            let species;
            const roll = Math.random();
            if (roll < 0.07 && legendaryKeys.length > 0) species = legendaryKeys[Math.floor(Math.random() * legendaryKeys.length)];
            else if (roll < 0.25 && rareKeys.length > 0) species = rareKeys[Math.floor(Math.random() * rareKeys.length)];
            else if (roll < 0.50 && uncommonKeys.length > 0) species = uncommonKeys[Math.floor(Math.random() * uncommonKeys.length)];
            else species = commonKeys[Math.floor(Math.random() * commonKeys.length)];

            const maxHp = RARITY_HP[SPECIES[species].rarity] || 30;
            wilds.push({
                id: _nextCritterId++,
                species,
                x: pos.x * TILE_SIZE + TILE_SIZE / 2,
                y: pos.y * TILE_SIZE + TILE_SIZE / 2,
                stats: Critters.rollStats(species),
                hp: maxHp,
                maxHp,
                stunned: false,
                stunTimer: 0,
                state: 'idle',
                wanderTarget: null,
                wanderTimer: Math.random() * 3,
                fleeing: false,
                fleeTimer: 0,
            });
        }
        return wilds;
    }

    static damageWild(critter, damage) {
        if (critter.stunned) return; // Already downed — don't reset timer
        critter.hp = Math.max(0, critter.hp - damage);
        if (critter.hp <= 0) {
            critter.stunned = true;
            critter.stunTimer = 15; // 15 seconds to capture before despawn
            critter.state = 'idle';
            critter.fleeing = false;
            critter._aggroed = false;
        } else {
            critter._aggroed = true;
            critter.state = 'aggro';
        }
    }

    static updateWild(dt, wildCritters, world, player, buildings, bodyguards) {
        for (let ci = wildCritters.length - 1; ci >= 0; ci--) {
            const c = wildCritters[ci];
            // Stunned — 15s capture window then despawn
            if (c.stunned) {
                c.stunTimer -= dt;
                if (c.stunTimer <= 0) {
                    c._despawned = true; // flag for game.js to cleanup sprite & recycle
                }
                continue;
            }

            const sp = SPECIES[c.species];

            // Aggression — player takes priority over buildings (skip if player dead)
            if ((sp.aggressive || c._aggroed) && player && !player._dead && !c.fleeing) {
                const pdx = player.x - c.x, pdy = player.y - c.y;
                const pDist = Math.sqrt(pdx*pdx + pdy*pdy) / TILE_SIZE;
                const aggroRange = c._aggroed ? Math.max(sp.aggroRange || 6, 12) : (sp.aggroRange || 6);

                if (pDist < aggroRange) {
                    c.state = 'aggro';
                    const speed = 205; // slightly faster than player (200)
                    const len = Math.sqrt(pdx*pdx + pdy*pdy);
                    const stopDist = TILE_SIZE * 1.2; // stop at attack range, don't overlap player
                    if (len > stopDist) {
                        c.x += (pdx / len) * speed * dt;
                        c.y += (pdy / len) * speed * dt;
                    } else if (len > 0) {
                        // Push away slightly if too close (prevent stacking)
                        const pushStr = (stopDist - len) * 2;
                        c.x -= (pdx / len) * pushStr * dt;
                        c.y -= (pdy / len) * pushStr * dt;
                    }
                    if (!c._attackTimer) c._attackTimer = 0;
                    c._attackTimer -= dt;
                    if (pDist < 1.5 && c._attackTimer <= 0) {
                        c._attackTimer = sp.attackCooldown || 1.5;
                        if (player.hp !== undefined) {
                            player.hp -= sp.attackDmg || 3;
                            c._justAttacked = true;
                            c._playSlash = true;
                            setTimeout(() => { c._justAttacked = false; }, 300);
                        }
                    }
                    continue;
                } else if (c.state === 'aggro') {
                    c.state = 'idle';
                    c.wanderTimer = 1;
                }
            }

            // Attack bodyguards if nearby
            if (sp.aggressive && bodyguards && bodyguards.length > 0 && c.state !== 'aggro' && !c.fleeing) {
                for (const bg of bodyguards) {
                    const bgx = (bg._patrolX || 0) - c.x, bgy = (bg._patrolY || 0) - c.y;
                    const bgDist = Math.sqrt(bgx * bgx + bgy * bgy) / TILE_SIZE;
                    if (bgDist < (sp.aggroRange || 6)) {
                        c.state = 'aggro_bodyguard';
                        const len = Math.sqrt(bgx * bgx + bgy * bgy);
                        if (len > 15) { c.x += (bgx / len) * 60 * dt; c.y += (bgy / len) * 60 * dt; }
                        if (!c._attackTimer) c._attackTimer = 0;
                        c._attackTimer -= dt;
                        if (bgDist < 1.5 && c._attackTimer <= 0) {
                            c._attackTimer = sp.attackCooldown || 1.5;
                            if (bg.patrolHp !== undefined) bg.patrolHp -= (sp.attackDmg || 3);
                            c._justAttacked = true;
                            c._playSlash = true;
                            setTimeout(() => { c._justAttacked = false; }, 300);
                        }
                        break;
                    }
                }
                if (c.state === 'aggro_bodyguard') continue;
            }

            // Attack buildings — all aggressive critters, wider detection range
            if (sp.aggressive && buildings && buildings.length > 0 && c.state !== 'aggro' && !c.fleeing) {
                if (!c._bldgTimer) c._bldgTimer = 0;
                c._bldgTimer -= dt;
                let closestB = null, closestBDist = Infinity;
                for (const b of buildings) {
                    const def = BUILDING_DEFS[b.type];
                    if (def.expander) continue; // don't target expanders
                    const bcx = (b.gridX + def.size / 2) * TILE_SIZE;
                    const bcy = (b.gridY + def.size / 2) * TILE_SIZE;
                    const bdx = bcx - c.x, bdy = bcy - c.y;
                    const bd = Math.sqrt(bdx*bdx + bdy*bdy) / TILE_SIZE;
                    if (bd < 20 && bd < closestBDist) { closestBDist = bd; closestB = b; }
                }
                if (closestB) {
                    const def = BUILDING_DEFS[closestB.type];
                    const bcx = (closestB.gridX + def.size / 2) * TILE_SIZE;
                    const bcy = (closestB.gridY + def.size / 2) * TILE_SIZE;
                    const bdx = bcx - c.x, bdy = bcy - c.y;
                    const bd = Math.sqrt(bdx*bdx + bdy*bdy);
                    c.state = 'attacking_building';
                    if (bd > TILE_SIZE * 1.5) {
                        c.x += (bdx / bd) * 60 * dt;
                        c.y += (bdy / bd) * 60 * dt;
                    } else if (c._bldgTimer <= 0) {
                        c._bldgTimer = sp.attackCooldown || 1.5;
                        const dmg = sp.attackDmg || 3;
                        if (closestB.hp !== undefined) {
                            closestB.hp -= dmg;
                            if (typeof game !== 'undefined' && game.sounds) game.sounds.buildingHit();
                        }
                        c._justAttacked = true;
                        setTimeout(() => { c._justAttacked = false; }, 300);
                    }
                    continue;
                } else if (c.state === 'attacking_building') {
                    c.state = 'idle'; c.wanderTimer = 1;
                }
            }

            // Fleeing
            if (c.fleeing) {
                c.fleeTimer -= dt;
                if (c.fleeTimer <= 0) {
                    c.fleeing = false;
                    c.state = 'idle';
                    c.wanderTimer = 2;
                }
                if (c.wanderTarget) {
                    const dx = c.wanderTarget.x - c.x;
                    const dy = c.wanderTarget.y - c.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 2) {
                        c.x += (dx / dist) * 150 * dt;
                        c.y += (dy / dist) * 150 * dt;
                    }
                }
                continue;
            }

            // Wander AI
            if (c.state === 'idle') {
                c.wanderTimer -= dt;
                if (c.wanderTimer <= 0) {
                    // Pick random nearby tile
                    const tx = Math.floor(c.x / TILE_SIZE) + Math.floor(Math.random() * 7) - 3;
                    const ty = Math.floor(c.y / TILE_SIZE) + Math.floor(Math.random() * 7) - 3;
                    const canWalkTile = world.isWalkable(tx, ty) || (world.getTile(tx, ty) === TILE.WATER && CRITTER_TYPES[sp.type]?.canSwim);
                    if (canWalkTile && !world.isColony(tx, ty)) {
                        c.wanderTarget = { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
                        c.state = 'walking';
                    }
                    c.wanderTimer = 2 + Math.random() * 3;
                }
            } else if (c.state === 'walking') {
                if (!c.wanderTarget) { c.state = 'idle'; continue; }
                const dx = c.wanderTarget.x - c.x;
                const dy = c.wanderTarget.y - c.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 3) {
                    c.state = 'idle';
                    c.wanderTimer = 2 + Math.random() * 4;
                } else {
                    const speed = 60;
                    c.x += (dx / dist) * speed * dt;
                    c.y += (dy / dist) * speed * dt;
                }
            }
        }
    }

    // Find the best snare tier the player can use for this critter's rarity
    static getBestSnare(inventory, critterRarity) {
        const tiers = Object.entries(SNARE_TIERS).reverse(); // check highest first
        for (const [key, snare] of tiers) {
            if ((inventory[key] || 0) > 0 && snare.captures.includes(critterRarity)) {
                return key;
            }
        }
        // Fallback to old traps for backwards compat
        if ((inventory.traps || 0) > 0 && critterRarity === 'common') return '_legacy_trap';
        return null;
    }

    static attemptCapture(critter, game) {
        const sp = SPECIES[critter.species];
        const snareKey = Critters.getBestSnare(game.inventory, sp.rarity);

        if (!snareKey) {
            if (sp.rarity !== 'common') {
                const needed = sp.rarity === 'uncommon' ? 'Iron Snare' : sp.rarity === 'rare' ? 'Gold Snare' : 'Diamond Snare';
                return { success: false, reason: `Need ${needed} for ${sp.rarity} critters!` };
            }
            return { success: false, reason: 'No snares!' };
        }

        const px = game.player.x;
        const py = game.player.y;
        const dx = critter.x - px;
        const dy = critter.y - py;
        const dist = Math.sqrt(dx * dx + dy * dy) / TILE_SIZE;

        if (dist > CAPTURE_RANGE) return { success: false, reason: 'Too far away!' };

        // Consume the snare
        if (snareKey === '_legacy_trap') game.inventory.traps--;
        else game.inventory[snareKey] = (game.inventory[snareKey] || 0) - 1;

        // Stunned = guaranteed capture
        if (critter.stunned) {
            const captured = {
                id: critter.id, species: critter.species,
                nickname: SPECIES[critter.species].name,
                stats: critter.stats, level: 1, xp: 0, assignment: null,
                passives: Critters.rollPassives(SPECIES[critter.species].rarity),
                patrolHp: 50, patrolMaxHp: 50,
            };
            return { success: true, captured };
        }

        // HP bonus: lower HP = easier capture
        const baseRate = CATCH_RATES[SPECIES[critter.species].rarity] || 0.5;
        const hpBonus = (1 - critter.hp / critter.maxHp) * 0.3;
        const captureBonus = (game.research?.captureBonus || 0) * 0.1;
        const rate = Math.min(0.95, baseRate + hpBonus + captureBonus);
        const roll = Math.random();

        if (roll < rate) {
            // Success!
            const captured = {
                id: critter.id,
                species: critter.species,
                nickname: SPECIES[critter.species].name,
                stats: critter.stats,
                level: 1,
                xp: 0,
                assignment: null,
                passives: Critters.rollPassives(SPECIES[critter.species].rarity),
                patrolHp: 50, patrolMaxHp: 50,
            };
            return { success: true, captured };
        } else {
            // Fail — critter flees
            critter.fleeing = true;
            critter.fleeTimer = 3;
            const angle = Math.atan2(critter.y - py, critter.x - px);
            critter.wanderTarget = {
                x: critter.x + Math.cos(angle) * TILE_SIZE * 6,
                y: critter.y + Math.sin(angle) * TILE_SIZE * 6,
            };
            return { success: false, reason: 'It escaped!' };
        }
    }

    static renderWild(ctx, critter, camX, camY, time) {
        const sp = SPECIES[critter.species];
        const sx = critter.x - camX;
        const sy = critter.y - camY;
        const bob = Math.sin(time * 3 + critter.id) * 2;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(sx, sy + 12, 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body — use sprite if available
        const sprite = typeof CRITTER_SPRITES !== 'undefined' ? CRITTER_SPRITES[critter.species] : null;
        const r = 12;
        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(sx, sy + bob, r, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(sprite, sx - r, sy + bob - r, r * 2, r * 2);
            ctx.restore();
        } else {
            ctx.fillStyle = sp.color;
            ctx.beginPath();
            ctx.arc(sx, sy + bob, 8, 0, Math.PI * 2);
            ctx.fill();
            // Eyes
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(sx - 3, sy + bob - 2, 2.5, 0, Math.PI * 2);
            ctx.arc(sx + 3, sy + bob - 2, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#222';
            ctx.beginPath();
            ctx.arc(sx - 2.5, sy + bob - 2, 1.2, 0, Math.PI * 2);
            ctx.arc(sx + 3.5, sy + bob - 2, 1.2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Stunned visual
        if (critter.stunned) {
            ctx.globalAlpha = 0.5 + Math.sin(time * 10) * 0.3;
            ctx.strokeStyle = '#ffd54f';
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(sx, sy + bob, 12, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;
            // Stars above head
            ctx.fillStyle = '#ffd54f';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('\u2605', sx - 6, sy + bob - 14);
            ctx.fillText('\u2605', sx + 6, sy + bob - 14);
        }

        // HP bar (show when damaged)
        if (critter.hp < critter.maxHp && !critter.stunned) {
            const barW = 20;
            const barH = 3;
            const bx = sx - barW / 2;
            const by = sy + bob - 16;
            ctx.fillStyle = '#333';
            ctx.fillRect(bx, by, barW, barH);
            const pct = critter.hp / critter.maxHp;
            ctx.fillStyle = pct > 0.5 ? '#4ade80' : pct > 0.25 ? '#fbbf24' : '#f87171';
            ctx.fillRect(bx, by, barW * pct, barH);
        }

        // Aggro indicator
        if (critter.state === 'aggro') {
            ctx.strokeStyle = 'rgba(248,113,113,0.7)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sx, sy + bob, 11, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#f87171';
            ctx.font = 'bold 8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('!', sx, sy + bob - 14);
        }

        // Rarity glow for uncommon+
        if (sp.rarity !== 'common') {
            ctx.strokeStyle = RARITY_COLORS[sp.rarity] + '66';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sx, sy + bob, 11, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    static renderAssigned(ctx, critter, bx, by, index, camX, camY, time) {
        const sp = SPECIES[critter.species];
        const ox = (index % 2) * 18 + 8;
        const oy = Math.floor(index / 2) * 18 + 40;
        const sx = bx - camX + ox;
        const sy = by - camY + oy;
        const bob = Math.sin(time * 4 + critter.id) * 1.5;

        ctx.fillStyle = sp.color;
        ctx.beginPath();
        ctx.arc(sx, sy + bob, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    static MAX_LEVEL = 20;

    // Recycle a dead critter — reset it and teleport to a new spawn location
    static recycle(critter, world) {
        const commonKeys = Object.keys(SPECIES).filter(k => SPECIES[k].rarity === 'common');
        const uncommonKeys = Object.keys(SPECIES).filter(k => SPECIES[k].rarity === 'uncommon');
        const rareKeys = Object.keys(SPECIES).filter(k => SPECIES[k].rarity === 'rare');
        const legendaryKeys = Object.keys(SPECIES).filter(k => SPECIES[k].rarity === 'legendary');

        const roll = Math.random();
        let species;
        if (roll < 0.07 && legendaryKeys.length > 0) species = legendaryKeys[Math.floor(Math.random() * legendaryKeys.length)];
        else if (roll < 0.25 && rareKeys.length > 0) species = rareKeys[Math.floor(Math.random() * rareKeys.length)];
        else if (roll < 0.50 && uncommonKeys.length > 0) species = uncommonKeys[Math.floor(Math.random() * uncommonKeys.length)];
        else species = commonKeys[Math.floor(Math.random() * commonKeys.length)];

        const rng = world._seededRng(Date.now() + critter.id);
        const pos = world.randomGrassTile(rng);
        const maxHp = RARITY_HP[SPECIES[species].rarity] || 30;

        critter.species = species;
        critter.x = pos.x * TILE_SIZE + TILE_SIZE / 2;
        critter.y = pos.y * TILE_SIZE + TILE_SIZE / 2;
        critter.stats = Critters.rollStats(species);
        critter.hp = maxHp;
        critter.maxHp = maxHp;
        critter.stunned = false;
        critter.stunTimer = 0;
        critter.state = 'idle';
        critter.wanderTarget = null;
        critter.wanderTimer = Math.random() * 3;
        critter.fleeing = false;
        critter.fleeTimer = 0;
        critter._aggroed = false;
        critter._attackTimer = 0;
        critter._bldgTimer = 0;
        critter._despawned = false;
        critter._justAttacked = false;
    }

    static getXpForLevel(level) {
        return Math.floor(50 * Math.pow(level, 1.5));
    }

    static addXp(critter, amount) {
        if (critter.level >= Critters.MAX_LEVEL) return false;
        critter.xp += amount;
        const needed = Critters.getXpForLevel(critter.level);
        if (critter.xp >= needed) {
            critter.xp -= needed;
            critter.level++;

            // Level up: boost 2 stats — primary stat + random stat
            const sp = SPECIES[critter.species];
            const statKeys = Object.keys(critter.stats);
            // Find the species' best base stat
            let primaryStat = statKeys[0];
            let bestVal = 0;
            for (const k of statKeys) {
                if (sp.baseStats[k] > bestVal) { bestVal = sp.baseStats[k]; primaryStat = k; }
            }
            // Always boost primary
            critter.stats[primaryStat]++;
            // 50% chance to also boost a random stat
            if (Math.random() < 0.5) {
                const other = statKeys[Math.floor(Math.random() * statKeys.length)];
                critter.stats[other]++;
            }

            // Track what leveled for UI notification
            critter._lastLevelUp = { level: critter.level, stat: primaryStat };
            return true;
        }
        return false;
    }
}
