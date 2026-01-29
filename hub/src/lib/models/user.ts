import mongoose from 'mongoose';

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

  // Remember Me tokens
  rememberTokens: [{
    token: { type: String, required: true },
    deviceInfo: { type: String },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true }
  }],

  // Game library (owned games)
  library: [{
    gameId: { type: String, required: true },
    purchasedAt: { type: Date, default: Date.now },
    playTime: { type: Number, default: 0 } // minutes
  }],

  // Wishlist
  wishlist: [{ type: String }],

  // Favorites
  favorites: [{ type: String }],

  // Dots Survivor saved game state
  savedGame: {
    exists: { type: Boolean, default: false },
    savedAt: { type: Date },
    gameState: { type: Object }
  },

  // Dots Survivor stats
  dotsSurvivorStats: {
    highestScore: { type: Number, default: 0 },
    highestWave: { type: Number, default: 0 },
    highestKills: { type: Number, default: 0 },
    totalGamesPlayed: { type: Number, default: 0 },
    totalTimePlayed: { type: Number, default: 0 }
  }
});

export const User = mongoose.models.User || mongoose.model('User', UserSchema);

