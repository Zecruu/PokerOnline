// MongoDB Schemas for User Authentication and Dots Survivor
const mongoose = require('mongoose');
const crypto = require('crypto');

// User Schema
const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 20
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    passwordHash: { type: String, required: true },
    salt: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date, default: Date.now },
    isAdmin: { type: Boolean, default: false },
    isTester: { type: Boolean, default: false }, // Testers get free games but no admin access
    isBanned: { type: Boolean, default: false },
    banReason: { type: String, default: '' },
    bannedAt: { type: Date },

    // Game library (owned games)
    library: [{
        gameId: { type: String, required: true },
        purchasedAt: { type: Date, default: Date.now },
        price: { type: Number, default: 0 }, // Price paid in cents (0 = free/gifted)
        stripePaymentId: { type: String } // Stripe payment intent ID
    }],

    // Remember Me tokens (device/browser persistence)
    rememberTokens: [{
        token: { type: String, required: true },
        deviceInfo: { type: String },
        createdAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, required: true }
    }],

    // Dots Survivor saved game state
    savedGame: {
        exists: { type: Boolean, default: false },
        savedAt: { type: Date },
        gameState: { type: Object }
    },

    // Critter Colony saved game state
    colonyData: {
        exists: { type: Boolean, default: false },
        lastActive: { type: Date },
        savedAt: { type: Date },
        gameState: { type: Object }
    },

    // Dots Survivor stats (best scores)
    dotsSurvivorStats: {
        highestScore: { type: Number, default: 0 },
        highestWave: { type: Number, default: 0 },
        highestKills: { type: Number, default: 0 },
        totalGamesPlayed: { type: Number, default: 0 },
        totalTimePlayed: { type: Number, default: 0 } // in seconds
    },

    // Account progression system (for future perk tree)
    accountProgression: {
        level: { type: Number, default: 1 },
        xp: { type: Number, default: 0 },
        xpToNextLevel: { type: Number, default: 1000 }, // Base 1000 XP, +300 per level
        tokens: { type: Number, default: 0 },
        totalTokensEarned: { type: Number, default: 0 }
    }
});

// Hash password
UserSchema.methods.setPassword = function (password) {
    this.salt = crypto.randomBytes(16).toString('hex');
    this.passwordHash = crypto.pbkdf2Sync(password, this.salt, 1000, 64, 'sha512').toString('hex');
};

// Validate password
UserSchema.methods.validatePassword = function (password) {
    const hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64, 'sha512').toString('hex');
    return this.passwordHash === hash;
};

// Leaderboard Schema (for quick queries)
const LeaderboardEntrySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    category: { type: String, enum: ['score', 'wave', 'kills'], required: true },
    value: { type: Number, required: true },
    achievedAt: { type: Date, default: Date.now }
});

LeaderboardEntrySchema.index({ category: 1, value: -1 });
LeaderboardEntrySchema.index({ userId: 1, category: 1 }, { unique: true });

// Session Schema - For persistent auth sessions (survives server restarts)
const SessionSchema = new mongoose.Schema({
    token: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    username: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    deviceInfo: { type: String, default: 'Unknown' },
    lastActivity: { type: Date, default: Date.now }
});

// Auto-delete expired sessions with TTL index
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ═══════════════════════════════════════════════════════════
// KINGDOM CONQUEST SCHEMAS
// ═══════════════════════════════════════════════════════════

const KCKingdomSchema = new mongoose.Schema({
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, default: 'New Kingdom', maxlength: 30 },
    level: { type: Number, default: 1 },
    age: { type: Number, default: 1 }, // 1=Dark Ages, 2=Feudal, 3=Crusade, 4=Renaissance, 5=Imperial
    resources: {
        gold: { type: Number, default: 500 },
        food: { type: Number, default: 200 },
        wood: { type: Number, default: 100 },
        stone: { type: Number, default: 50 },
        faith: { type: Number, default: 20 },
        manpower: { type: Number, default: 100 },
    },
    tickRates: {
        gold: { type: Number, default: 10 },
        food: { type: Number, default: 8 },
        wood: { type: Number, default: 5 },
        stone: { type: Number, default: 3 },
        faith: { type: Number, default: 2 },
        manpower: { type: Number, default: 2 },
    },
    storageCaps: {
        gold: { type: Number, default: 50000 },
        food: { type: Number, default: 20000 },
        wood: { type: Number, default: 10000 },
        stone: { type: Number, default: 8000 },
        faith: { type: Number, default: 5000 },
        manpower: { type: Number, default: 2000 },
    },
    buildings: [{
        slotIndex: { type: Number, required: true }, // 0-35 (6x6 grid)
        buildingId: { type: String, required: true },
        tier: { type: Number, default: 1 },
        builtAt: { type: Date, default: Date.now },
    }],
    equippedRelics: [{ type: mongoose.Schema.Types.ObjectId, ref: 'KCCard' }], // max 3
    activeEvents: [{
        cardId: { type: mongoose.Schema.Types.ObjectId, ref: 'KCCard' },
        expiresAtTick: { type: Number },
        effect: { type: Object },
    }],
    deployedUnits: [{ type: mongoose.Schema.Types.ObjectId, ref: 'KCCard' }],
    wallHP: { type: Number, default: 100 },
    maxWallHP: { type: Number, default: 100 },
    garrisonPower: { type: Number, default: 0 },
    tributeFrom: [{ type: mongoose.Schema.Types.ObjectId, ref: 'KCKingdom' }],
    hexIndex: { type: Number, default: -1 }, // position on world map (0-49)
    isAI: { type: Boolean, default: false },
    aiDifficulty: { type: Number, default: 1 },
    lastTickAt: { type: Date, default: Date.now },
    totalPrestigePoints: { type: Number, default: 0 },
    prestigeLevel: { type: Number, default: 0 },
    raidCooldowns: { type: Map, of: Number, default: {} }, // kingdomId → tickExpiry
    totalTicks: { type: Number, default: 0 },
}, { timestamps: true });

KCKingdomSchema.index({ playerId: 1 });
KCKingdomSchema.index({ isAI: 1 });
KCKingdomSchema.index({ hexIndex: 1 });

const KCCardSchema = new mongoose.Schema({
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    kingdomId: { type: mongoose.Schema.Types.ObjectId, ref: 'KCKingdom', index: true },
    cardType: { type: String, enum: ['unit', 'spell', 'event', 'relic', 'building'], required: true },
    rarity: { type: String, enum: ['common', 'uncommon', 'rare', 'legendary'], required: true },
    name: { type: String, required: true },
    lore: { type: String, default: '' },
    imagePrompt: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    stats: {
        atk: Number,
        def: Number,
        speed: Number,
        upkeepGold: Number,
        upkeepFood: Number,
        upkeepFaith: Number,
        effectValue: Number,
        durationTicks: Number,
        wallDamage: Number,
        atkBonus: Number,
        targetResource: String,
        isPositive: Boolean,
        passiveBonus: String,
        specialUnlock: String,
        primaryResource: String,
        outputPerTick: Number,
        specialEffect: String,
    },
    isDeployed: { type: Boolean, default: false },
    isEquipped: { type: Boolean, default: false },
    isListed: { type: Boolean, default: false },
    generatedAt: { type: Date, default: Date.now },
});

KCCardSchema.index({ ownerId: 1, cardType: 1 });
KCCardSchema.index({ rarity: 1 });

const KCRaidSchema = new mongoose.Schema({
    attackerId: { type: mongoose.Schema.Types.ObjectId, ref: 'KCKingdom', required: true, index: true },
    defenderId: { type: mongoose.Schema.Types.ObjectId, ref: 'KCKingdom', required: true, index: true },
    attackerUnits: [{ type: mongoose.Schema.Types.ObjectId, ref: 'KCCard' }],
    spellCardId: { type: mongoose.Schema.Types.ObjectId, ref: 'KCCard' },
    attackPower: { type: Number, default: 0 },
    defensePower: { type: Number, default: 0 },
    wallHP: { type: Number, default: 0 },
    outcome: { type: String, enum: ['victory', 'defeat'], required: true },
    raidType: { type: String, enum: ['pillage', 'capture'], default: 'pillage' },
    lootGained: {
        gold: { type: Number, default: 0 },
        food: { type: Number, default: 0 },
        wood: { type: Number, default: 0 },
        stone: { type: Number, default: 0 },
    },
    unitCasualties: [{ type: mongoose.Schema.Types.ObjectId, ref: 'KCCard' }],
    createdAt: { type: Date, default: Date.now },
});

KCRaidSchema.index({ attackerId: 1, createdAt: -1 });
KCRaidSchema.index({ defenderId: 1, createdAt: -1 });

const KCAllianceSchema = new mongoose.Schema({
    name: { type: String, required: true, maxlength: 30 },
    leaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'KCKingdom' },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'KCKingdom' }], // max 5
    sharedGold: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
});

const KCMarketListingSchema = new mongoose.Schema({
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    cardId: { type: mongoose.Schema.Types.ObjectId, ref: 'KCCard', required: true },
    priceGold: { type: Number, required: true },
    listedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
});

KCMarketListingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL
KCMarketListingSchema.index({ 'cardType': 1, 'rarity': 1 });

const KCSeasonSchema = new mongoose.Schema({
    number: { type: Number, required: true, unique: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    topPlayers: [{
        playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        rank: Number,
        prestigePoints: Number,
    }],
    isActive: { type: Boolean, default: true },
});

const User = mongoose.model('User', UserSchema);
const LeaderboardEntry = mongoose.model('LeaderboardEntry', LeaderboardEntrySchema);
const Session = mongoose.model('Session', SessionSchema);
const KCKingdom = mongoose.model('KCKingdom', KCKingdomSchema);
const KCCard = mongoose.model('KCCard', KCCardSchema);
const KCRaid = mongoose.model('KCRaid', KCRaidSchema);
const KCAlliance = mongoose.model('KCAlliance', KCAllianceSchema);
const KCMarketListing = mongoose.model('KCMarketListing', KCMarketListingSchema);
const KCSeason = mongoose.model('KCSeason', KCSeasonSchema);

module.exports = { User, LeaderboardEntry, Session, KCKingdom, KCCard, KCRaid, KCAlliance, KCMarketListing, KCSeason };
