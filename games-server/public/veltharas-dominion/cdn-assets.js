// CDN Asset Configuration for Veltharas Dominion
// CloudFront Distribution: d2f5lfipdzhi8t.cloudfront.net

const CDN_CONFIG = {
    enabled: true, // Set to false to use local assets
    baseUrl: 'https://d2f5lfipdzhi8t.cloudfront.net/veltharas-dominion',
    localBasePath: '' // Empty for same directory
};

// Asset path helper - returns CDN URL if enabled, local path otherwise
function getAssetUrl(path) {
    if (CDN_CONFIG.enabled) {
        return `${CDN_CONFIG.baseUrl}/${path}`;
    }
    return CDN_CONFIG.localBasePath + path;
}

// ============================================
// ASSET MAPPINGS - Old names to new CDN paths
// ============================================

const CDN_ASSETS = {
    // ========== CHARACTERS - FIRE MAGE ==========
    characters: {
        fireMage: {
            lv1: 'characters/fire-mage-lv1.png',      // Level1Mage.png
            lv5: 'characters/fire-mage-lv5.png',      // Level2Mage.png
            lv10: 'characters/fire-mage-lv10.png',    // Level3.png
            lv15: 'characters/fire-mage-lv15.png',    // Level4Mage.png
            lv20: 'characters/fire-mage-lv20.png',    // Level5Mage.png
            lv25: 'characters/fire-mage-lv25.png',    // Level6Mage.png
        },
        shadowMonarch: {
            lv1: 'characters/shadow-monarch-lv1.png',
            lv5: 'characters/shadow-monarch-lv5.png',
            lv10: 'characters/shadow-monarch-lv10.png',
            lv15: 'characters/shadow-monarch-lv15.png',
        },
        necromancer: {
            idle: 'characters/necromancer-idle.png',
            walk: 'characters/necromancer-walk.png',
            dead: 'characters/necromancer-dead.png',
        }
    },

    // ========== ENEMIES ==========
    enemies: {
        swarm: 'enemies/swarm.png',
        basic: 'enemies/basic.png',
        runner: 'enemies/runner.png',
        tank: 'enemies/tank.png',
        bomber: 'enemies/bomber.png',
        mini: 'enemies/mini.png',
        splitter: 'enemies/splitter.png',
        sticky: 'enemies/sticky.png',
        ice: 'enemies/ice.png',
        poison: 'enemies/poison.png',
        goblin: 'enemies/goblin.png',
        necromancer: 'enemies/necromancer-enemy.png',
        necroSprite: 'enemies/necro-sprite.png',
        miniConsumer: 'enemies/mini-consumer.png',
        bossConsumer: 'enemies/boss-consumer.png',
        consumer: 'enemies/the-consumer.png',
        demonKing: 'enemies/demon-king.png',
    },

    // ========== MINIONS ==========
    minions: {
        wolfIdle: 'minions/wolf-idle.png',
        wolfRun: 'minions/wolf-run.png',
        wolfRunAlt: 'minions/wolf-run-alt.png',
        wolfAttack: 'minions/wolf-attack.png',
    },

    // ========== EFFECTS & PROJECTILES ==========
    effects: {
        fireball: 'effects/fireball.png',
        ringOfFire: 'effects/ring-of-fire.png',
        ringOfFireAura: 'effects/ring-of-fire-aura.png',
        devilRingOfFire: 'effects/devil-ring-of-fire.png',
        demonicFireMythic: 'effects/demonic-fire-mythic.png',
        xpOrb: 'effects/xp-orb.png',
    },

    // ========== SKULLS ==========
    skulls: {
        fire: 'items/skull-fire.png',
        slow: 'items/skull-slow.png',
        dark: 'items/skull-dark.png',
        lightning: 'items/skull-lightning.png',
    },

    // ========== STACKING ITEMS ==========
    items: {
        beamDespair: { base: 'items/beam-despair.jpg', evolved: 'items/beam-despair-evolved.jpg' },
        critBlade: { base: 'items/crit-blade.jpg', evolved: 'items/crit-blade-evolved.jpg' },
        ringXp: { base: 'items/ring-xp.jpg', evolved: 'items/ring-xp-evolved.jpg' },
        soulCollector: { base: 'items/soul-collector.jpg', evolved: 'items/soul-collector-evolved.jpg' },
        bootsSwiftness: { base: 'items/boots-swiftness.png', evolved: 'items/boots-swiftness-evolved.png' },
        heartVitality: { base: 'items/heart-vitality.jpg', evolved: 'items/heart-vitality-evolved.jpg' },
        bloodSoaker: { base: 'items/blood-soaker.jpg', evolved: 'items/blood-soaker-evolved.jpg' },
    },

    // ========== DEMON SET ==========
    demonSet: {
        helm: 'items/demon-helm.jpg',
        chest: 'items/demon-chest.jpg',
        boots: 'items/demon-boots.jpg',
    },

    // ========== ABILITIES ==========
    abilities: {
        dash: 'abilities/dash.jpg',
        nuclearBlast: 'abilities/nuclear-blast.jpg',
    },

    // ========== UI & BACKGROUNDS ==========
    ui: {
        background: 'ui/velthara-bg.jpg',
        thumbnail: 'ui/velthara-thumbnail.png',
        logo: 'ui/logo.png',
    },

    // ========== AUDIO ==========
    audio: {
        gameMusic: 'audio/game-music.mp3',
        menuMusic: 'audio/menu-music.mp3',
        bossMusic: 'audio/boss-music.mp3',
        fireball: 'audio/fireball.mp3',
        beam: 'audio/beam.mp3',
        levelup: 'audio/levelup.mp3',
        wolfHowl: 'audio/wolf-howl.mp3',
        horde: 'audio/horde.mp3',
        gameStart: 'audio/game-start.mp3',
        theEndIsNear: 'audio/the-end-is-near.mp3',
    }
};

