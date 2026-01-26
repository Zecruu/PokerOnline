// MongoDB Schema for Poker Game
const mongoose = require('mongoose');

// Player schema (embedded in Room)
const PlayerSchema = new mongoose.Schema({
    odId: String, // Socket ID
    oderId: String, // Player ID for game logic
    name: String,
    chips: { type: Number, default: 1000 },
    bet: { type: Number, default: 0 },
    cards: [{
        rank: String,
        suit: String
    }],
    folded: { type: Boolean, default: false },
    isHost: { type: Boolean, default: false },
    isActive: { type: Boolean, default: false },
    isAI: { type: Boolean, default: false },
    buyBacksUsed: { type: Number, default: 0 },
    isConnected: { type: Boolean, default: true }
}, { _id: false });

// Chat message schema
const ChatMessageSchema = new mongoose.Schema({
    playerId: String,
    playerName: String,
    message: String,
    isAI: { type: Boolean, default: false },
    isTaunt: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
}, { _id: false });

// Room schema
const RoomSchema = new mongoose.Schema({
    roomCode: { type: String, required: true, unique: true, index: true },
    players: [PlayerSchema],
    deck: [{
        rank: String,
        suit: String
    }],
    communityCards: [{
        rank: String,
        suit: String
    }],
    pot: { type: Number, default: 0 },
    currentBet: { type: Number, default: 0 },
    currentPlayerIndex: { type: Number, default: 0 },
    gamePhase: { type: String, default: 'waiting' }, // waiting, preflop, flop, turn, river, showdown
    dealerIndex: { type: Number, default: 0 },
    settings: {
        startingChips: { type: Number, default: 1000 },
        smallBlind: { type: Number, default: 10 },
        bigBlind: { type: Number, default: 20 },
        turnTimeLimit: { type: Number, default: 30 },
        allowBuyBack: { type: Boolean, default: true },
        maxBuyBacks: { type: Number, default: 3 },
        buyBackAmount: { type: Number, default: 1000 }
    },
    chatMessages: [ChatMessageSchema],
    playersActedThisRound: [String],
    revealedCards: { type: Map, of: [Number] },
    createdAt: { type: Date, default: Date.now },
    lastActivity: { type: Date, default: Date.now }
});

// Auto-delete rooms after 2 hours of inactivity
RoomSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 7200 });

const Room = mongoose.model('Room', RoomSchema);

module.exports = { Room };
