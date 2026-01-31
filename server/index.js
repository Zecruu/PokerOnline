// Poker Online - WebSocket Server with MongoDB
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const { Room } = require('./models');
const { createDeck, shuffleDeck, evaluateHand, makeAIDecision, getRandomTaunt } = require('./gameLogic');

const app = express();
const server = http.createServer(app);

// Socket.IO with CORS
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:8000", "http://localhost:3000", "https://poker-online.vercel.app", "*"],
        methods: ["GET", "POST"]
    }
});

// Middleware - CORS for games subdomain and main site
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:8000',
        'https://www.zecrugames.com',
        'https://zecrugames.com',
        'https://games.zecrugames.com'
    ],
    credentials: true
}));
app.use(express.json());
// Serve the Next.js static export from hub/out
app.use(express.static(path.join(__dirname, '../hub/out')));

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI?.trim();
let mongoConnected = false;

async function connectMongoDB() {
    if (!mongoUri || (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://'))) {
        console.error('❌ MONGODB_URI is missing or invalid. It must start with "mongodb://" or "mongodb+srv://"');
        console.error('   Current value:', mongoUri ? mongoUri.substring(0, 15) + '...' : 'undefined');
        console.error('   Please check your Railway variables or .env file.');
        return;
    }

    try {
        await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 45000,
        });
        mongoConnected = true;
        console.log('✅ Connected to MongoDB');
    } catch (err) {
        console.error('❌ MongoDB connection error:', err);
        mongoConnected = false;
        // Retry connection after 5 seconds
        setTimeout(connectMongoDB, 5000);
    }
}

// Handle disconnection
mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB disconnected. Attempting to reconnect...');
    mongoConnected = false;
    setTimeout(connectMongoDB, 5000);
});

mongoose.connection.on('connected', () => {
    mongoConnected = true;
});

// Initial connection
connectMongoDB();

// Generate room code
function generateRoomCode() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}

// Generate player ID
function generatePlayerId() {
    return 'player_' + Math.random().toString(36).substr(2, 9);
}

// Socket.IO Connection Handler
io.on('connection', (socket) => {
    console.log(`🔌 Player connected: ${socket.id}`);

    // Create Room
    socket.on('createRoom', async (data) => {
        try {
            const { playerName, settings, withAI } = data;
            const roomCode = generateRoomCode();
            const playerId = generatePlayerId();

            const room = new Room({
                roomCode,
                players: [{
                    odId: socket.id,
                    oderId: playerId,
                    name: playerName,
                    chips: settings?.startingChips || 1000,
                    isHost: true,
                    isConnected: true
                }],
                settings: settings || {},
                gamePhase: 'waiting'
            });

            // Add AI player if requested
            if (withAI) {
                room.players.push({
                    odId: 'AI_DEALER',
                    oderId: generatePlayerId(),
                    name: 'Dealer',
                    chips: settings?.startingChips || 1000,
                    isAI: true,
                    isConnected: true
                });
            }

            await room.save();

            socket.join(roomCode);
            socket.roomCode = roomCode;
            socket.oderId = playerId;

            socket.emit('roomCreated', {
                roomCode,
                playerId,
                room: sanitizeRoom(room)
            });

            console.log(`🏠 Room ${roomCode} created by ${playerName}`);
        } catch (error) {
            console.error('Create room error:', error);
            socket.emit('error', { message: 'Failed to create room' });
        }
    });

    // Join Room
    socket.on('joinRoom', async (data) => {
        try {
            const { roomCode, playerName } = data;

            const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });
            if (!room) {
                socket.emit('error', { message: 'Room not found' });
                return;
            }

            if (room.players.length >= 8) {
                socket.emit('error', { message: 'Room is full' });
                return;
            }

            if (room.gamePhase !== 'waiting') {
                socket.emit('error', { message: 'Game already in progress' });
                return;
            }

            const playerId = generatePlayerId();
            room.players.push({
                odId: socket.id,
                oderId: playerId,
                name: playerName,
                chips: room.settings.startingChips || 1000,
                isConnected: true
            });
            room.lastActivity = new Date();
            await room.save();

            socket.join(roomCode);
            socket.roomCode = roomCode;
            socket.oderId = playerId;

            socket.emit('roomJoined', {
                roomCode,
                playerId,
                room: sanitizeRoom(room)
            });

            // Notify others
            socket.to(roomCode).emit('playerJoined', {
                player: { name: playerName, oderId: playerId },
                room: sanitizeRoom(room)
            });

            console.log(`👤 ${playerName} joined room ${roomCode}`);
        } catch (error) {
            console.error('Join room error:', error);
            socket.emit('error', { message: 'Failed to join room' });
        }
    });

    // Start Game
    socket.on('startGame', async () => {
        try {
            const room = await Room.findOne({ roomCode: socket.roomCode });
            if (!room) return;

            const player = room.players.find(p => p.oderId === socket.oderId);
            if (!player || !player.isHost) {
                socket.emit('error', { message: 'Only host can start the game' });
                return;
            }

            if (room.players.length < 2) {
                socket.emit('error', { message: 'Need at least 2 players' });
                return;
            }

            // Initialize game
            await startNewRound(room);

            io.to(socket.roomCode).emit('gameStarted', {
                room: sanitizeRoom(room)
            });

            // Check if AI goes first
            scheduleAITurn(room);

        } catch (error) {
            console.error('Start game error:', error);
            socket.emit('error', { message: 'Failed to start game' });
        }
    });

    // Player Action
    socket.on('playerAction', async (data) => {
        try {
            const { action, amount } = data;
            const room = await Room.findOne({ roomCode: socket.roomCode });
            if (!room) return;

            const playerIndex = room.players.findIndex(p => p.oderId === socket.oderId);
            if (playerIndex === -1 || playerIndex !== room.currentPlayerIndex) {
                socket.emit('error', { message: 'Not your turn' });
                return;
            }

            const player = room.players[playerIndex];
            if (!player.isActive || player.folded) {
                socket.emit('error', { message: 'Cannot act' });
                return;
            }

            // Process action
            const result = processAction(room, playerIndex, action, amount);
            if (!result.success) {
                socket.emit('error', { message: result.message });
                return;
            }

            room.lastActivity = new Date();
            await room.save();

            // Broadcast update
            io.to(socket.roomCode).emit('gameUpdate', {
                room: sanitizeRoom(room),
                lastAction: { playerId: socket.oderId, action, amount }
            });

            // Check for winner or advance phase
            const activePlayers = room.players.filter(p => !p.folded);
            if (activePlayers.length === 1) {
                await handleWinner(room, activePlayers[0], 'All others folded');
            } else if (isBettingRoundComplete(room)) {
                await advanceGamePhase(room);
            } else {
                // Next player
                moveToNextPlayer(room);
                await room.save();

                io.to(socket.roomCode).emit('gameUpdate', {
                    room: sanitizeRoom(room)
                });

                scheduleAITurn(room);
            }

        } catch (error) {
            console.error('Player action error:', error);
            socket.emit('error', { message: 'Action failed' });
        }
    });

    // Chat Message
    socket.on('chatMessage', async (data) => {
        try {
            const { message } = data;
            const room = await Room.findOne({ roomCode: socket.roomCode });
            if (!room) return;

            const player = room.players.find(p => p.oderId === socket.oderId);
            if (!player) return;

            const chatMessage = {
                playerId: socket.oderId,
                playerName: player.name,
                message: message.substring(0, 200),
                isAI: false,
                timestamp: new Date()
            };

            room.chatMessages.push(chatMessage);
            if (room.chatMessages.length > 50) {
                room.chatMessages.shift();
            }
            await room.save();

            io.to(socket.roomCode).emit('newChatMessage', chatMessage);

        } catch (error) {
            console.error('Chat error:', error);
        }
    });

    // Next Round
    socket.on('nextRound', async () => {
        try {
            const room = await Room.findOne({ roomCode: socket.roomCode });
            if (!room) return;

            room.dealerIndex = (room.dealerIndex + 1) % room.players.length;
            await startNewRound(room);

            io.to(socket.roomCode).emit('gameStarted', {
                room: sanitizeRoom(room)
            });

            scheduleAITurn(room);

        } catch (error) {
            console.error('Next round error:', error);
        }
    });

    // Buy Back
    socket.on('buyBack', async () => {
        try {
            const room = await Room.findOne({ roomCode: socket.roomCode });
            if (!room) return;

            const player = room.players.find(p => p.oderId === socket.oderId);
            if (!player) return;

            if (!room.settings.allowBuyBack) {
                socket.emit('error', { message: 'Buy-backs not allowed' });
                return;
            }

            if (player.buyBacksUsed >= room.settings.maxBuyBacks) {
                socket.emit('error', { message: 'Max buy-backs reached' });
                return;
            }

            if (player.chips > 0) {
                socket.emit('error', { message: 'You still have chips' });
                return;
            }

            player.chips = room.settings.buyBackAmount || 1000;
            player.buyBacksUsed++;
            await room.save();

            socket.emit('buyBackSuccess', {
                chips: player.chips,
                buyBacksRemaining: room.settings.maxBuyBacks - player.buyBacksUsed
            });

            io.to(socket.roomCode).emit('gameUpdate', {
                room: sanitizeRoom(room)
            });

        } catch (error) {
            console.error('Buy back error:', error);
        }
    });

    // Disconnect
    socket.on('disconnect', async () => {
        console.log(`🔌 Player disconnected: ${socket.id}`);

        if (socket.roomCode) {
            try {
                const room = await Room.findOne({ roomCode: socket.roomCode });
                if (room) {
                    const player = room.players.find(p => p.odId === socket.id);
                    if (player) {
                        player.isConnected = false;
                        await room.save();

                        io.to(socket.roomCode).emit('playerDisconnected', {
                            playerId: player.oderId,
                            room: sanitizeRoom(room)
                        });
                    }
                }
            } catch (error) {
                console.error('Disconnect handling error:', error);
            }
        }
    });
});

// Game Logic Functions
async function startNewRound(room) {
    room.deck = shuffleDeck(createDeck());
    room.communityCards = [];
    room.pot = 0;
    room.currentBet = room.settings.bigBlind || 20;
    room.gamePhase = 'preflop';
    room.playersActedThisRound = [];
    room.revealedCards = new Map();

    // Reset players
    room.players.forEach(p => {
        p.bet = 0;
        p.cards = [];
        p.folded = p.chips <= 0;
        p.isActive = false;
    });

    // Deal cards
    room.players.forEach(p => {
        if (!p.folded) {
            p.cards = [room.deck.pop(), room.deck.pop()];
        }
    });

    // Post blinds
    const sb = room.settings.smallBlind || 10;
    const bb = room.settings.bigBlind || 20;

    let sbIndex, bbIndex;
    if (room.players.length === 2) {
        sbIndex = room.dealerIndex;
        bbIndex = (room.dealerIndex + 1) % room.players.length;
    } else {
        sbIndex = (room.dealerIndex + 1) % room.players.length;
        bbIndex = (room.dealerIndex + 2) % room.players.length;
    }

    const sbPlayer = room.players[sbIndex];
    const sbAmount = Math.min(sb, sbPlayer.chips);
    sbPlayer.bet = sbAmount;
    sbPlayer.chips -= sbAmount;
    room.pot += sbAmount;

    const bbPlayer = room.players[bbIndex];
    const bbAmount = Math.min(bb, bbPlayer.chips);
    bbPlayer.bet = bbAmount;
    bbPlayer.chips -= bbAmount;
    room.pot += bbAmount;

    // Set first player
    if (room.players.length === 2) {
        room.currentPlayerIndex = room.dealerIndex;
    } else {
        room.currentPlayerIndex = (room.dealerIndex + 3) % room.players.length;
    }

    while (room.players[room.currentPlayerIndex].folded) {
        room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
    }

    room.players[room.currentPlayerIndex].isActive = true;

    await room.save();
}

function processAction(room, playerIndex, action, amount) {
    const player = room.players[playerIndex];

    switch (action) {
        case 'fold':
            player.folded = true;
            break;

        case 'check':
            if (player.bet < room.currentBet) {
                return { success: false, message: 'Cannot check' };
            }
            break;

        case 'call':
            const callAmount = Math.min(room.currentBet - player.bet, player.chips);
            player.chips -= callAmount;
            player.bet += callAmount;
            room.pot += callAmount;
            break;

        case 'raise':
            if (amount <= room.currentBet) {
                return { success: false, message: 'Raise must be higher' };
            }
            const raiseTotal = Math.min(amount - player.bet, player.chips);
            player.chips -= raiseTotal;
            player.bet += raiseTotal;
            room.pot += raiseTotal;
            room.currentBet = player.bet;
            room.playersActedThisRound = [player.oderId];
            return { success: true };
    }

    room.playersActedThisRound.push(player.oderId);
    player.isActive = false;

    return { success: true };
}

function moveToNextPlayer(room) {
    room.players[room.currentPlayerIndex].isActive = false;

    let nextIndex = (room.currentPlayerIndex + 1) % room.players.length;
    let attempts = 0;

    while (room.players[nextIndex].folded && attempts < room.players.length) {
        nextIndex = (nextIndex + 1) % room.players.length;
        attempts++;
    }

    room.currentPlayerIndex = nextIndex;
    room.players[nextIndex].isActive = true;
}

function isBettingRoundComplete(room) {
    const activePlayers = room.players.filter(p => !p.folded);
    if (activePlayers.length <= 1) return true;

    const allActed = activePlayers.every(p => room.playersActedThisRound.includes(p.oderId));
    const betsEqual = activePlayers.every(p => p.bet === room.currentBet || p.chips === 0);

    return allActed && betsEqual;
}

async function advanceGamePhase(room) {
    const activePlayers = room.players.filter(p => !p.folded);

    if (activePlayers.length === 1) {
        await handleWinner(room, activePlayers[0], 'All others folded');
        return;
    }

    switch (room.gamePhase) {
        case 'preflop':
            room.deck.pop(); // Burn
            room.communityCards.push(room.deck.pop(), room.deck.pop(), room.deck.pop());
            room.gamePhase = 'flop';
            break;
        case 'flop':
            room.deck.pop();
            room.communityCards.push(room.deck.pop());
            room.gamePhase = 'turn';
            break;
        case 'turn':
            room.deck.pop();
            room.communityCards.push(room.deck.pop());
            room.gamePhase = 'river';
            break;
        case 'river':
            await showdown(room);
            return;
    }

    // Reset for new betting round
    room.currentBet = 0;
    room.playersActedThisRound = [];
    room.players.forEach(p => {
        p.bet = 0;
        p.isActive = false;
    });

    let startIndex = (room.dealerIndex + 1) % room.players.length;
    while (room.players[startIndex].folded) {
        startIndex = (startIndex + 1) % room.players.length;
    }
    room.currentPlayerIndex = startIndex;
    room.players[startIndex].isActive = true;

    await room.save();

    io.to(room.roomCode).emit('gameUpdate', {
        room: sanitizeRoom(room)
    });

    scheduleAITurn(room);
}

async function showdown(room) {
    room.gamePhase = 'showdown';

    const activePlayers = room.players.filter(p => !p.folded);

    // Evaluate hands
    const hands = activePlayers.map(player => {
        const allCards = [...player.cards, ...room.communityCards];
        const hand = evaluateHand(allCards);
        return { player, hand };
    });

    hands.sort((a, b) => b.hand.value - a.hand.value);
    const winner = hands[0].player;
    const winAmount = room.pot;
    winner.chips += winAmount;

    // Reveal AI cards
    room.players.forEach(p => {
        if (p.isAI && !p.folded) {
            room.revealedCards.set(p.oderId, [0, 1]);
        }
    });

    await room.save();

    // Send AI taunt
    const aiPlayer = room.players.find(p => p.isAI);
    if (aiPlayer && winner.isAI) {
        setTimeout(async () => {
            const tauntCategory = winAmount > 100 ? 'bigWin' : 'win';
            const taunt = getRandomTaunt(tauntCategory);
            if (taunt) {
                const chatMessage = {
                    playerId: aiPlayer.oderId,
                    playerName: aiPlayer.name,
                    message: taunt,
                    isAI: true,
                    isTaunt: true,
                    timestamp: new Date()
                };
                room.chatMessages.push(chatMessage);
                await room.save();
                io.to(room.roomCode).emit('newChatMessage', chatMessage);
            }
        }, 500);
    }

    io.to(room.roomCode).emit('showdown', {
        room: sanitizeRoom(room),
        winner: {
            playerId: winner.oderId,
            name: winner.name,
            hand: hands[0].hand,
            winAmount
        },
        hands: hands.map(h => ({
            playerId: h.player.oderId,
            playerName: h.player.name,
            cards: h.player.cards,
            hand: h.hand
        }))
    });
}

async function handleWinner(room, winner, reason) {
    const winAmount = room.pot;
    winner.chips += winAmount;
    room.gamePhase = 'showdown';

    await room.save();

    // AI taunt when player folds
    const aiPlayer = room.players.find(p => p.isAI);
    if (aiPlayer && winner.isAI && reason === 'All others folded') {
        setTimeout(async () => {
            const taunt = getRandomTaunt('playerFolded');
            if (taunt) {
                const chatMessage = {
                    playerId: aiPlayer.oderId,
                    playerName: aiPlayer.name,
                    message: taunt,
                    isAI: true,
                    isTaunt: true,
                    timestamp: new Date()
                };
                room.chatMessages.push(chatMessage);
                await room.save();
                io.to(room.roomCode).emit('newChatMessage', chatMessage);
            }
        }, 500);
    }

    io.to(room.roomCode).emit('roundEnd', {
        room: sanitizeRoom(room),
        winner: {
            playerId: winner.oderId,
            name: winner.name,
            winAmount,
            reason
        }
    });
}

// AI Turn Handler
const aiTimers = new Map();

function scheduleAITurn(room) {
    const currentPlayer = room.players[room.currentPlayerIndex];
    if (!currentPlayer || !currentPlayer.isAI) return;
    if (room.gamePhase === 'showdown' || room.gamePhase === 'waiting') return;

    // Clear existing timer
    if (aiTimers.has(room.roomCode)) {
        clearTimeout(aiTimers.get(room.roomCode));
    }

    const timer = setTimeout(async () => {
        try {
            const freshRoom = await Room.findOne({ roomCode: room.roomCode });
            if (!freshRoom || freshRoom.gamePhase === 'showdown') return;

            const aiPlayer = freshRoom.players[freshRoom.currentPlayerIndex];
            if (!aiPlayer || !aiPlayer.isAI || !aiPlayer.isActive) return;

            const gameState = {
                currentBet: freshRoom.currentBet,
                pot: freshRoom.pot,
                myBet: aiPlayer.bet,
                myChips: aiPlayer.chips,
                bigBlind: freshRoom.settings.bigBlind || 20
            };

            const decision = makeAIDecision(gameState, aiPlayer.cards, freshRoom.communityCards);

            // Process AI action
            const result = processAction(freshRoom, freshRoom.currentPlayerIndex, decision.action, decision.amount);
            if (!result.success) return;

            await freshRoom.save();

            // Send taunt if applicable
            if (decision.taunt) {
                const chatMessage = {
                    playerId: aiPlayer.oderId,
                    playerName: aiPlayer.name,
                    message: decision.taunt,
                    isAI: true,
                    isTaunt: true,
                    timestamp: new Date()
                };
                freshRoom.chatMessages.push(chatMessage);
                await freshRoom.save();
                io.to(freshRoom.roomCode).emit('newChatMessage', chatMessage);
            }

            io.to(freshRoom.roomCode).emit('gameUpdate', {
                room: sanitizeRoom(freshRoom),
                lastAction: { playerId: aiPlayer.oderId, action: decision.action, amount: decision.amount }
            });

            // Check game state
            const activePlayers = freshRoom.players.filter(p => !p.folded);
            if (activePlayers.length === 1) {
                await handleWinner(freshRoom, activePlayers[0], 'All others folded');
            } else if (isBettingRoundComplete(freshRoom)) {
                await advanceGamePhase(freshRoom);
            } else {
                moveToNextPlayer(freshRoom);
                await freshRoom.save();

                io.to(freshRoom.roomCode).emit('gameUpdate', {
                    room: sanitizeRoom(freshRoom)
                });

                scheduleAITurn(freshRoom);
            }

        } catch (error) {
            console.error('AI turn error:', error);
        }
    }, 2000);

    aiTimers.set(room.roomCode, timer);
}

// Sanitize room data (hide other players' cards)
function sanitizeRoom(room) {
    const data = room.toObject ? room.toObject() : room;

    // Remove deck from response
    delete data.deck;

    // Only show revealed cards
    data.players = data.players.map(p => {
        const revealed = data.revealedCards?.get?.(p.oderId) || [];
        return {
            ...p,
            cards: p.isAI && data.gamePhase !== 'showdown' && revealed.length === 0
                ? []
                : p.cards
        };
    });

    return data;
}

// ================== USER AUTHENTICATION & DOTS SURVIVOR API ==================

const { User, LeaderboardEntry } = require('./userModels');

// Generate session token (simple implementation)
function generateToken() {
    return require('crypto').randomBytes(32).toString('hex');
}

// In-memory session store (for production, use Redis)
const sessions = new Map();

// Middleware to check auth
function authenticateToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const session = sessions.get(token);
    if (!session) return res.status(401).json({ error: 'Invalid or expired token' });

    req.userId = session.userId;
    req.username = session.username;
    next();
}

// Middleware to check admin
async function authenticateAdmin(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const session = sessions.get(token);
    if (!session) return res.status(401).json({ error: 'Invalid or expired token' });

    try {
        const user = await User.findById(session.userId);
        if (!user || !user.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        req.userId = session.userId;
        req.username = session.username;
        next();
    } catch (error) {
        return res.status(500).json({ error: 'Authentication failed' });
    }
}

// Profanity filter
const BANNED_WORDS = [
    'fuck', 'shit', 'ass', 'bitch', 'cunt', 'dick', 'pussy', 'cock', 'nigger', 'nigga',
    'faggot', 'fag', 'retard', 'whore', 'slut', 'bastard', 'damn', 'piss', 'penis',
    'vagina', 'anus', 'dildo', 'porn', 'sex', 'rape', 'nazi', 'hitler', 'kill', 'murder',
    'suicide', 'terrorist', 'bomb', 'kys', 'kms', 'n1gger', 'n1gga', 'f4g', 'f4ggot',
    'b1tch', 'sh1t', 'a55', 'd1ck', 'p0rn', 'wh0re', 'sl00t'
];

function containsProfanity(text) {
    const normalized = text.toLowerCase().replace(/[0-9@!$]/g, match => {
        const replacements = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '@': 'a', '!': 'i', '$': 's' };
        return replacements[match] || match;
    });

    return BANNED_WORDS.some(word => normalized.includes(word));
}

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        // Check MongoDB connection
        if (!mongoConnected || mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: 'Database temporarily unavailable. Please try again.' });
        }

        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({ error: 'Username must be 3-20 characters' });
        }

        // Profanity check
        if (containsProfanity(username)) {
            return res.status(400).json({ error: 'Username contains inappropriate language' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if username or email exists
        const existingUser = await User.findOne({ $or: [{ username }, { email: email.toLowerCase() }] });
        if (existingUser) {
            if (existingUser.username === username) {
                return res.status(400).json({ error: 'Username already taken' });
            }
            return res.status(400).json({ error: 'Email already registered' });
        }

        const user = new User({ username, email: email.toLowerCase() });
        user.setPassword(password);
        await user.save();

        // Auto-login after registration
        const token = generateToken();
        sessions.set(token, { userId: user._id, username: user.username });

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                savedGame: user.savedGame,
                stats: user.dotsSurvivorStats
            }
        });

        console.log(`✅ User registered: ${username}`);
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        // Check MongoDB connection
        if (!mongoConnected || mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: 'Database temporarily unavailable. Please try again.' });
        }

        const { login, password, rememberMe, deviceInfo } = req.body;

        if (!login || !password) {
            return res.status(400).json({ error: 'Login and password required' });
        }

        // Find by username or email
        const user = await User.findOne({
            $or: [{ username: login }, { email: login.toLowerCase() }]
        });

        if (!user || !user.validatePassword(password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if user is banned
        if (user.isBanned) {
            return res.status(403).json({
                error: 'Account banned',
                reason: user.banReason || 'No reason provided',
                bannedAt: user.bannedAt
            });
        }

        user.lastLogin = new Date();

        const token = generateToken();
        sessions.set(token, { userId: user._id, username: user.username });

        let rememberToken = null;
        if (rememberMe) {
            // Generate a persistent remember token (30 days)
            rememberToken = generateToken();
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            
            // Remove old tokens for this device if exists, keep max 5 tokens
            if (user.rememberTokens && user.rememberTokens.length >= 5) {
                user.rememberTokens.shift();
            }
            if (!user.rememberTokens) user.rememberTokens = [];
            
            user.rememberTokens.push({
                token: rememberToken,
                deviceInfo: deviceInfo || 'Unknown device',
                createdAt: new Date(),
                expiresAt
            });
        }

        await user.save();

        res.json({
            success: true,
            token,
            rememberToken,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                savedGame: user.savedGame,
                stats: user.dotsSurvivorStats
            }
        });

        console.log(`✅ User logged in: ${user.username}${rememberMe ? ' (remembered)' : ''}`);
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Logout
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];
    const { rememberToken } = req.body || {};
    
    sessions.delete(token);
    
    // Also remove remember token if provided
    if (rememberToken) {
        try {
            const user = await User.findById(req.userId);
            if (user && user.rememberTokens) {
                user.rememberTokens = user.rememberTokens.filter(t => t.token !== rememberToken);
                await user.save();
            }
        } catch (e) {
            console.error('Error removing remember token:', e);
        }
    }
    
    res.json({ success: true });
});

// Auto-login with remember token
app.post('/api/auth/remember', async (req, res) => {
    try {
        if (!mongoConnected || mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: 'Database temporarily unavailable' });
        }

        const { rememberToken } = req.body;
        
        if (!rememberToken) {
            return res.status(400).json({ error: 'Remember token required' });
        }

        // Find user with this remember token
        const user = await User.findOne({
            'rememberTokens.token': rememberToken,
            'rememberTokens.expiresAt': { $gt: new Date() }
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid or expired remember token' });
        }

        user.lastLogin = new Date();
        await user.save();

        // Generate new session token
        const token = generateToken();
        sessions.set(token, { userId: user._id, username: user.username });

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                savedGame: user.savedGame,
                stats: user.dotsSurvivorStats
            }
        });

        console.log(`✅ User auto-logged in via remember token: ${user.username}`);
    } catch (error) {
        console.error('Remember login error:', error);
        res.status(500).json({ error: 'Auto-login failed' });
    }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({
            id: user._id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin || false,
            savedGame: user.savedGame,
            stats: user.dotsSurvivorStats
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// ================== DOTS SURVIVOR SAVE/LOAD ==================

// Save game
app.post('/api/dots-survivor/save', authenticateToken, async (req, res) => {
    try {
        const { gameState } = req.body;

        if (!gameState) {
            return res.status(400).json({ error: 'No game state provided' });
        }

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.savedGame = {
            exists: true,
            savedAt: new Date(),
            gameState
        };
        await user.save();

        res.json({ success: true, savedAt: user.savedGame.savedAt });
        console.log(`💾 Game saved for ${user.username}`);
    } catch (error) {
        console.error('Save game error:', error);
        res.status(500).json({ error: 'Failed to save game' });
    }
});

// Load game
app.get('/api/dots-survivor/load', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (!user.savedGame?.exists) {
            return res.status(404).json({ error: 'No saved game found' });
        }

        res.json({
            success: true,
            savedAt: user.savedGame.savedAt,
            gameState: user.savedGame.gameState
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to load game' });
    }
});

// Delete saved game
app.delete('/api/dots-survivor/save', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.savedGame = { exists: false };
        await user.save();

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete save' });
    }
});

// Submit score (end of game)
app.post('/api/dots-survivor/submit-score', authenticateToken, async (req, res) => {
    try {
        const { score, wave, kills, timePlayed } = req.body;

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const stats = user.dotsSurvivorStats;
        let updated = false;

        // Update personal bests
        if (score > stats.highestScore) {
            stats.highestScore = score;
            updated = true;
        }
        if (wave > stats.highestWave) {
            stats.highestWave = wave;
            updated = true;
        }
        if (kills > stats.highestKills) {
            stats.highestKills = kills;
            updated = true;
        }

        stats.totalGamesPlayed++;
        stats.totalTimePlayed += timePlayed || 0;

        // Clear saved game on submission
        user.savedGame = { exists: false };
        await user.save();

        // Update leaderboards
        await updateLeaderboard(user._id, user.username, 'score', score);
        await updateLeaderboard(user._id, user.username, 'wave', wave);
        await updateLeaderboard(user._id, user.username, 'kills', kills);

        res.json({
            success: true,
            newPersonalBest: updated,
            stats: user.dotsSurvivorStats
        });

        console.log(`🏆 Score submitted: ${user.username} - Wave ${wave}, ${kills} kills`);
    } catch (error) {
        console.error('Submit score error:', error);
        res.status(500).json({ error: 'Failed to submit score' });
    }
});

async function updateLeaderboard(userId, username, category, value) {
    try {
        // Only update if new value is higher than existing value
        const existing = await LeaderboardEntry.findOne({ userId, category });
        if (!existing || value > existing.value) {
            await LeaderboardEntry.findOneAndUpdate(
                { userId, category },
                { userId, username, category, value: Math.max(value, 0), achievedAt: new Date() },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        }
    } catch (error) {
        console.error('Leaderboard update error:', error);
    }
}

// ================== LEADERBOARDS ==================

// Get leaderboard
app.get('/api/leaderboard/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const limit = parseInt(req.query.limit) || 10;

        if (!['score', 'wave', 'kills'].includes(category)) {
            return res.status(400).json({ error: 'Invalid category' });
        }

        const entries = await LeaderboardEntry
            .find({ category })
            .sort({ value: -1 })
            .limit(limit)
            .lean();

        res.json({
            category,
            entries: entries.map((e, i) => ({
                rank: i + 1,
                username: e.username,
                value: e.value,
                achievedAt: e.achievedAt
            }))
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get leaderboard' });
    }
});

// Get user rank
app.get('/api/leaderboard/:category/rank', authenticateToken, async (req, res) => {
    try {
        const { category } = req.params;

        if (!['score', 'wave', 'kills'].includes(category)) {
            return res.status(400).json({ error: 'Invalid category' });
        }

        const userEntry = await LeaderboardEntry.findOne({ userId: req.userId, category });
        if (!userEntry) {
            return res.json({ rank: null, value: 0 });
        }

        const rank = await LeaderboardEntry.countDocuments({
            category,
            value: { $gt: userEntry.value }
        }) + 1;

        res.json({ rank, value: userEntry.value });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get rank' });
    }
});

// ================== ADMIN API ==================

// Get all users (admin only)
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const skip = (page - 1) * limit;

        const query = search ? {
            $or: [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ]
        } : {};

        const [users, total] = await Promise.all([
            User.find(query)
                .select('-passwordHash -salt -rememberTokens -savedGame.gameState')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments(query)
        ]);

        res.json({
            users: users.map(u => ({
                id: u._id,
                username: u.username,
                email: u.email,
                createdAt: u.createdAt,
                lastLogin: u.lastLogin,
                isAdmin: u.isAdmin,
                isBanned: u.isBanned,
                banReason: u.banReason,
                bannedAt: u.bannedAt,
                stats: u.dotsSurvivorStats,
                hasSavedGame: u.savedGame?.exists || false
            })),
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Admin get users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
});

// Ban user (admin only)
app.post('/api/admin/ban/:userId', authenticateAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (user.isAdmin) {
            return res.status(400).json({ error: 'Cannot ban admin users' });
        }

        user.isBanned = true;
        user.banReason = reason || 'No reason provided';
        user.bannedAt = new Date();
        await user.save();

        // Remove all active sessions for this user
        for (const [token, session] of sessions.entries()) {
            if (session.userId.toString() === userId) {
                sessions.delete(token);
            }
        }

        res.json({ success: true, message: `User ${user.username} has been banned` });
        console.log(`🚫 User banned: ${user.username} by ${req.username}. Reason: ${reason || 'None'}`);
    } catch (error) {
        console.error('Admin ban error:', error);
        res.status(500).json({ error: 'Failed to ban user' });
    }
});

// Unban user (admin only)
app.post('/api/admin/unban/:userId', authenticateAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.isBanned = false;
        user.banReason = '';
        user.bannedAt = null;
        await user.save();

        res.json({ success: true, message: `User ${user.username} has been unbanned` });
        console.log(`✅ User unbanned: ${user.username} by ${req.username}`);
    } catch (error) {
        console.error('Admin unban error:', error);
        res.status(500).json({ error: 'Failed to unban user' });
    }
});

// Get admin stats
app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
    try {
        const [totalUsers, bannedUsers, activeToday] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ isBanned: true }),
            User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
        ]);

        res.json({
            totalUsers,
            bannedUsers,
            activeToday
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', mongodb: mongoose.connection.readyState === 1 });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 Poker server running on port ${PORT}`);
});
