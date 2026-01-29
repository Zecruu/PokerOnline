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
    isBanned: { type: Boolean, default: false },
    banReason: { type: String, default: '' },
    bannedAt: { type: Date },

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

    // Dots Survivor stats (best scores)
    dotsSurvivorStats: {
        highestScore: { type: Number, default: 0 },
        highestWave: { type: Number, default: 0 },
        highestKills: { type: Number, default: 0 },
        totalGamesPlayed: { type: Number, default: 0 },
        totalTimePlayed: { type: Number, default: 0 } // in seconds
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

const User = mongoose.model('User', UserSchema);
const LeaderboardEntry = mongoose.model('LeaderboardEntry', LeaderboardEntrySchema);

module.exports = { User, LeaderboardEntry };
