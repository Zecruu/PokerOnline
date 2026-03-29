const express = require('express');
const compression = require('compression');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server: SocketServer } = require('socket.io');

// ============================================
// STRIPE CONFIGURATION (Add API keys when ready)
// ============================================
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || null;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || null;
const STRIPE_ENABLED = !!STRIPE_SECRET_KEY;

// Initialize Stripe if key is provided
let stripe = null;
if (STRIPE_ENABLED) {
    try {
        stripe = require('stripe')(STRIPE_SECRET_KEY);
        console.log('💳 Stripe initialized successfully');
    } catch (e) {
        console.log('⚠️ Stripe package not installed - run: npm install stripe');
    }
}

// Log startup
console.log('🚀 Starting games server...');
console.log(`   Node version: ${process.version}`);
console.log(`   PORT env: ${process.env.PORT || 'not set, using 3001'}`);
console.log(`   Stripe: ${STRIPE_ENABLED ? '✅ Configured' : '⏳ Not configured (add STRIPE_SECRET_KEY env var)'}`);

// Verify public directory exists
const publicPath = path.join(__dirname, 'public');
if (!fs.existsSync(publicPath)) {
    console.error('❌ ERROR: public directory not found at:', publicPath);
    console.log('   Available files:', fs.readdirSync(__dirname));
} else {
    console.log('✅ Public directory found:', publicPath);
    console.log('   Games:', fs.readdirSync(publicPath));
}

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all origins (games can be embedded)
app.use(cors());

// Enable gzip compression for faster loading
app.use(compression());

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    next();
});

// Cache static assets - NO CACHE during development for quick updates
const cacheOptions = {
    etag: false,
    lastModified: true,
    setHeaders: (res, filePath) => {
        // Cache images and audio longer (1 day)
        if (filePath.match(/\.(jpg|jpeg|png|gif|webp|mp3|wav|ogg)$/i)) {
            res.setHeader('Cache-Control', 'public, max-age=86400');
        }
        // JS/CSS/HTML - NO CACHE during development
        else {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
};

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public'), cacheOptions));

// SEO: robots.txt
app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send(`User-agent: *
Allow: /
Disallow: /api/
Disallow: /stripe-test/

Sitemap: https://games.zecrugames.com/sitemap.xml
`);
});

// SEO: sitemap.xml
app.get('/sitemap.xml', (req, res) => {
    res.type('application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://games.zecrugames.com/veltharas-dominion/</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>https://games.zecrugames.com/imposter/</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>
</urlset>
`);
});

// Client error reporting endpoint (logs to Railway console)
app.post('/api/client-error', express.json(), (req, res) => {
    const { error, stack, context, userAgent, timestamp } = req.body || {};
    console.error('🔴 CLIENT ERROR:', {
        error: error || 'unknown',
        stack: stack || 'no stack',
        context: context || 'unknown',
        userAgent: (userAgent || '').substring(0, 100),
        timestamp: timestamp || new Date().toISOString()
    });
    res.json({ received: true });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'games-server' });
});

// Root redirect to game list or main game
app.get('/', (req, res) => {
    res.redirect('https://www.zecrugames.com');
});

// ============================================
// STRIPE PAYMENT ROUTES
// ============================================

// Parse JSON for API routes (but NOT for webhook - needs raw body)
app.use('/api', express.json());

// Create Stripe Checkout Session
app.post('/api/payments/create-checkout', async (req, res) => {
    if (!STRIPE_ENABLED || !stripe) {
        return res.status(503).json({
            error: 'Payments not configured yet. Coming soon!',
            stripeEnabled: false
        });
    }

    try {
        const { itemId, category, price, userId } = req.body;

        if (!itemId || !category || !price) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Convert price string to cents (e.g., "4.99" -> 499)
        const priceInCents = Math.round(parseFloat(price) * 100);

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `Cosmetic: ${itemId}`,
                        description: `${category} cosmetic for Velthara's Dominion`,
                    },
                    unit_amount: priceInCents,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${req.protocol}://${req.get('host')}/veltharas-dominion/?purchase_success=1&item=${itemId}&category=${category}`,
            cancel_url: `${req.protocol}://${req.get('host')}/veltharas-dominion/?purchase_cancelled=1`,
            metadata: {
                itemId,
                category,
                userId: userId || 'guest',
                game: 'veltharas-dominion'
            }
        });

        res.json({ checkoutUrl: session.url, sessionId: session.id });
    } catch (error) {
        console.error('Stripe checkout error:', error);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

// Stripe Webhook Handler (for payment confirmation)
// Note: This route needs raw body, not JSON parsed
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    if (!STRIPE_ENABLED || !stripe) {
        return res.status(503).json({ error: 'Payments not configured' });
    }

    const sig = req.headers['stripe-signature'];

    let event;
    try {
        // Verify webhook signature if secret is configured
        if (STRIPE_WEBHOOK_SECRET) {
            event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
        } else {
            // Development mode - parse without verification
            event = JSON.parse(req.body.toString());
            console.log('⚠️ Webhook signature not verified (STRIPE_WEBHOOK_SECRET not set)');
        }
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            console.log('💰 Payment successful!', {
                sessionId: session.id,
                itemId: session.metadata?.itemId,
                category: session.metadata?.category,
                userId: session.metadata?.userId,
                amount: session.amount_total
            });

            // TODO: Update user's owned cosmetics in database
            // For now, the client handles this via URL params on redirect
            break;

        case 'payment_intent.payment_failed':
            const paymentIntent = event.data.object;
            console.log('❌ Payment failed:', paymentIntent.id);
            break;

        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
});

// Check payment status (for verifying purchases)
app.get('/api/payments/verify/:sessionId', async (req, res) => {
    if (!STRIPE_ENABLED || !stripe) {
        return res.status(503).json({ error: 'Payments not configured' });
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);

        res.json({
            paid: session.payment_status === 'paid',
            itemId: session.metadata?.itemId,
            category: session.metadata?.category
        });
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({ error: 'Failed to verify payment' });
    }
});

// Payment status endpoint (for debugging)
app.get('/api/payments/status', (req, res) => {
    res.json({
        stripeEnabled: STRIPE_ENABLED,
        message: STRIPE_ENABLED
            ? 'Stripe payments are active'
            : 'Stripe not configured. Set STRIPE_SECRET_KEY environment variable.'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).send('Game not found. <a href="/">Back to games</a>');
});

// ============================================
// CRITTER COLONY — MULTIPLAYER (Socket.IO)
// ============================================
const server = http.createServer(app);
const io = new SocketServer(server, {
    path: '/colony-mp',
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingInterval: 10000,
    pingTimeout: 5000,
});

// Room storage: roomId → { hostId, worldSeed, players: Map<socketId, {name, x, y, color}>, createdAt }
const colonyRooms = new Map();

function generateRoomId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = '';
    for (let i = 0; i < 5; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
}

const PLAYER_COLORS = ['#66bb6a', '#ffa726', '#ab47bc', '#29b6f6', '#ef5350', '#ffee58', '#26c6da', '#ec407a'];

io.on('connection', (socket) => {
    console.log(`[Colony MP] Player connected: ${socket.id}`);
    let currentRoom = null;

    // Create a new room
    socket.on('colony:create', (data, cb) => {
        const roomId = generateRoomId();
        const room = {
            hostId: socket.id,
            worldSeed: data.worldSeed || Math.floor(Math.random() * 999999),
            players: new Map(),
            createdAt: Date.now(),
            lastWorldState: null,
        };
        room.players.set(socket.id, {
            name: data.name || 'Host',
            x: 0, y: 0, dir: 'front',
            hp: 100, maxHp: 100,
            color: PLAYER_COLORS[0],
        });
        colonyRooms.set(roomId, room);
        socket.join(roomId);
        currentRoom = roomId;
        console.log(`[Colony MP] Room ${roomId} created by ${data.name || 'Host'}`);
        cb({ roomId, success: true });
    });

    // Join existing room
    socket.on('colony:join', (data, cb) => {
        const room = colonyRooms.get(data.roomId);
        if (!room) { cb({ error: 'Room not found' }); return; }
        if (room.players.size >= 8) { cb({ error: 'Room is full (max 8)' }); return; }

        const colorIdx = room.players.size % PLAYER_COLORS.length;
        const playerInfo = {
            name: data.name || 'Player',
            x: 0, y: 0, dir: 'front',
            hp: 100, maxHp: 100,
            color: PLAYER_COLORS[colorIdx],
        };
        room.players.set(socket.id, playerInfo);
        socket.join(data.roomId);
        currentRoom = data.roomId;

        // Notify others
        socket.to(data.roomId).emit('colony:player-joined', {
            id: socket.id,
            name: playerInfo.name,
            color: playerInfo.color,
        });

        // Build player list for the joiner
        const players = [];
        for (const [id, p] of room.players) {
            players.push({ id, name: p.name, x: p.x, y: p.y, color: p.color });
        }

        // Request world state from host
        const hostSocket = io.sockets.sockets.get(room.hostId);
        if (hostSocket) {
            hostSocket.emit('colony:request-state', { requesterId: socket.id }, (worldState) => {
                cb({ success: true, players, worldState });
            });
        } else {
            // Fallback: send last known state
            cb({ success: true, players, worldState: room.lastWorldState || { worldSeed: room.worldSeed } });
        }

        console.log(`[Colony MP] ${data.name || 'Player'} joined room ${data.roomId} (${room.players.size} players)`);
    });

    // List open rooms
    socket.on('colony:list', (data, cb) => {
        const rooms = [];
        for (const [id, room] of colonyRooms) {
            const host = room.players.get(room.hostId);
            rooms.push({
                roomId: id,
                hostName: host?.name || 'Unknown',
                playerCount: room.players.size,
                maxPlayers: 8,
                createdAt: room.createdAt,
            });
        }
        cb({ rooms });
    });

    // Leave room
    socket.on('colony:leave', () => {
        if (currentRoom) leaveCurrentRoom();
    });

    // Player position update
    socket.on('colony:move', (data) => {
        if (!currentRoom) return;
        const room = colonyRooms.get(currentRoom);
        if (!room) return;
        const player = room.players.get(socket.id);
        if (player) {
            player.x = data.x; player.y = data.y;
            player.dir = data.dir;
            player.hp = data.hp; player.maxHp = data.maxHp;
        }
        // Broadcast all positions to room
        const positions = [];
        for (const [id, p] of room.players) {
            positions.push({ id, x: p.x, y: p.y, dir: p.dir, hp: p.hp, maxHp: p.maxHp });
        }
        socket.to(currentRoom).emit('colony:positions', positions);
    });

    // State sync (host → server → clients)
    socket.on('colony:state-sync', (state) => {
        if (!currentRoom) return;
        const room = colonyRooms.get(currentRoom);
        if (!room || room.hostId !== socket.id) return;
        room.lastWorldState = state;
        socket.to(currentRoom).emit('colony:state-sync', state);
    });

    // Game actions (building, capturing, etc.)
    socket.on('colony:action', (data) => {
        if (!currentRoom) return;
        const room = colonyRooms.get(currentRoom);
        if (!room) return;
        const player = room.players.get(socket.id);
        data.from = socket.id;
        data.playerName = player?.name || 'Player';
        socket.to(currentRoom).emit('colony:action', data);
    });

    // Projectiles
    socket.on('colony:projectile', (data) => {
        if (!currentRoom) return;
        data.from = socket.id;
        socket.to(currentRoom).volatile.emit('colony:projectile', data);
    });

    // Chat
    socket.on('colony:chat', (data) => {
        if (!currentRoom) return;
        socket.to(currentRoom).emit('colony:chat', data);
    });

    // Host responds with full world state for new joiners
    socket.on('colony:request-state', (data, cb) => {
        // This is handled on the host client — they'll respond with Save._buildGameState
        // The callback is forwarded from the join flow
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log(`[Colony MP] Player disconnected: ${socket.id}`);
        if (currentRoom) leaveCurrentRoom();
    });

    function leaveCurrentRoom() {
        const room = colonyRooms.get(currentRoom);
        if (!room) { currentRoom = null; return; }

        room.players.delete(socket.id);
        socket.leave(currentRoom);

        if (room.players.size === 0) {
            // Empty room — delete
            colonyRooms.delete(currentRoom);
            console.log(`[Colony MP] Room ${currentRoom} deleted (empty)`);
        } else if (room.hostId === socket.id) {
            // Host left — promote next player
            const nextHost = room.players.keys().next().value;
            room.hostId = nextHost;
            io.to(currentRoom).emit('colony:player-left', {
                id: socket.id,
                newHost: nextHost,
            });
            console.log(`[Colony MP] Host left room ${currentRoom}, promoted ${nextHost}`);
        } else {
            io.to(currentRoom).emit('colony:player-left', { id: socket.id });
        }
        currentRoom = null;
    }
});

// Cleanup stale rooms every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [id, room] of colonyRooms) {
        if (room.players.size === 0 || now - room.createdAt > 12 * 60 * 60 * 1000) {
            colonyRooms.delete(id);
        }
    }
}, 5 * 60 * 1000);

// ============================================
// WHO'S THE IMPOSTER — MULTIPLAYER (Socket.IO)
// ============================================
const imposterIo = new SocketServer(server, {
    path: '/imposter-mp',
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingInterval: 10000,
    pingTimeout: 5000,
});

const imposterRooms = new Map();

// Word bank: { category, word, hint }
const WORD_BANK = [
    { category: 'Animals', word: 'Elephant', hint: 'Big' },
    { category: 'Animals', word: 'Flamingo', hint: 'Pink' },
    { category: 'Animals', word: 'Chameleon', hint: 'Colorful' },
    { category: 'Animals', word: 'Penguin', hint: 'Cold' },
    { category: 'Animals', word: 'Dolphin', hint: 'Playful' },
    { category: 'Animals', word: 'Owl', hint: 'Nocturnal' },
    { category: 'Animals', word: 'Cheetah', hint: 'Fast' },
    { category: 'Animals', word: 'Turtle', hint: 'Slow' },
    { category: 'Animals', word: 'Parrot', hint: 'Talkative' },
    { category: 'Animals', word: 'Shark', hint: 'Scary' },
    { category: 'Food', word: 'Pizza', hint: 'Round' },
    { category: 'Food', word: 'Sushi', hint: 'Japanese' },
    { category: 'Food', word: 'Watermelon', hint: 'Green' },
    { category: 'Food', word: 'Chocolate', hint: 'Sweet' },
    { category: 'Food', word: 'Taco', hint: 'Crunchy' },
    { category: 'Food', word: 'Ice Cream', hint: 'Cold' },
    { category: 'Food', word: 'Pancake', hint: 'Flat' },
    { category: 'Food', word: 'Avocado', hint: 'Trendy' },
    { category: 'Food', word: 'Popcorn', hint: 'Movie' },
    { category: 'Food', word: 'Donut', hint: 'Hole' },
    { category: 'Places', word: 'Beach', hint: 'Sandy' },
    { category: 'Places', word: 'Library', hint: 'Quiet' },
    { category: 'Places', word: 'Hospital', hint: 'White' },
    { category: 'Places', word: 'Volcano', hint: 'Hot' },
    { category: 'Places', word: 'Castle', hint: 'Medieval' },
    { category: 'Places', word: 'Airport', hint: 'Busy' },
    { category: 'Places', word: 'Cave', hint: 'Dark' },
    { category: 'Places', word: 'Gym', hint: 'Strong' },
    { category: 'Places', word: 'Museum', hint: 'Old' },
    { category: 'Places', word: 'Carnival', hint: 'Fun' },
    { category: 'Objects', word: 'Umbrella', hint: 'Rainy' },
    { category: 'Objects', word: 'Guitar', hint: 'Musical' },
    { category: 'Objects', word: 'Telescope', hint: 'Far' },
    { category: 'Objects', word: 'Candle', hint: 'Warm' },
    { category: 'Objects', word: 'Balloon', hint: 'Light' },
    { category: 'Objects', word: 'Clock', hint: 'Ticking' },
    { category: 'Objects', word: 'Mirror', hint: 'Reflective' },
    { category: 'Objects', word: 'Diamond', hint: 'Shiny' },
    { category: 'Objects', word: 'Backpack', hint: 'Heavy' },
    { category: 'Objects', word: 'Compass', hint: 'North' },
    { category: 'Activities', word: 'Swimming', hint: 'Wet' },
    { category: 'Activities', word: 'Dancing', hint: 'Rhythmic' },
    { category: 'Activities', word: 'Camping', hint: 'Outdoors' },
    { category: 'Activities', word: 'Cooking', hint: 'Hot' },
    { category: 'Activities', word: 'Painting', hint: 'Colorful' },
    { category: 'Activities', word: 'Skateboarding', hint: 'Wheeled' },
    { category: 'Activities', word: 'Fishing', hint: 'Patient' },
    { category: 'Activities', word: 'Karaoke', hint: 'Loud' },
    { category: 'Activities', word: 'Yoga', hint: 'Flexible' },
    { category: 'Activities', word: 'Gaming', hint: 'Digital' },
];

// Question bank: crew gets `question`, imposter gets `imposterQuestion`
const QUESTION_BANK = [
    { question: 'What is your favorite pizza topping?', imposterQuestion: 'What is your favorite sandwich filling?' },
    { question: 'What would you do if you won the lottery?', imposterQuestion: 'What would you do if you got a big promotion?' },
    { question: 'What is your biggest pet peeve?', imposterQuestion: 'What is your biggest fear?' },
    { question: 'Describe your ideal vacation destination.', imposterQuestion: 'Describe your ideal weekend at home.' },
    { question: 'What superpower would you want?', imposterQuestion: 'What skill would you want to master instantly?' },
    { question: 'What is the worst movie you have ever seen?', imposterQuestion: 'What is the worst book you have ever read?' },
    { question: 'If you could have dinner with anyone, who?', imposterQuestion: 'If you could swap lives with anyone for a day, who?' },
    { question: 'What would your last meal on Earth be?', imposterQuestion: 'What would your first meal on Mars be?' },
    { question: 'What is the most embarrassing thing that happened to you in school?', imposterQuestion: 'What is the most embarrassing thing that happened to you at work?' },
    { question: 'What is your guilty pleasure TV show?', imposterQuestion: 'What is your guilty pleasure snack?' },
    { question: 'If you could live in any time period, when?', imposterQuestion: 'If you could live in any country, where?' },
    { question: 'What is the strangest food you have ever tried?', imposterQuestion: 'What is the strangest hobby you have ever tried?' },
    { question: 'What is one thing you cannot live without?', imposterQuestion: 'What is one thing you wish you could get rid of?' },
    { question: 'What was your childhood dream job?', imposterQuestion: 'What is your current dream job?' },
    { question: 'If you were an animal, what would you be?', imposterQuestion: 'If you were a fictional character, who would you be?' },
    { question: 'What is the best gift you have ever received?', imposterQuestion: 'What is the best gift you have ever given?' },
    { question: 'What scares you most about the ocean?', imposterQuestion: 'What scares you most about space?' },
    { question: 'Describe your morning routine.', imposterQuestion: 'Describe your bedtime routine.' },
    { question: 'What song do you secretly love?', imposterQuestion: 'What movie do you secretly love?' },
    { question: 'What is the most useless talent you have?', imposterQuestion: 'What is the most useful talent you have?' },
    { question: 'If you could only eat one cuisine forever, what?', imposterQuestion: 'If you could only drink one beverage forever, what?' },
    { question: 'What is the worst advice you have received?', imposterQuestion: 'What is the best advice you have received?' },
    { question: 'What would you do during a zombie apocalypse?', imposterQuestion: 'What would you do during an alien invasion?' },
    { question: 'What is your unpopular opinion about food?', imposterQuestion: 'What is your unpopular opinion about music?' },
    { question: 'If your life was a movie genre, what would it be?', imposterQuestion: 'If your life was a book genre, what would it be?' },
    { question: 'What is the hardest thing you have ever done?', imposterQuestion: 'What is the bravest thing you have ever done?' },
    { question: 'What do you think happens after you die?', imposterQuestion: 'What do you think happened before you were born?' },
    { question: 'What hill are you willing to die on?', imposterQuestion: 'What argument do you always avoid?' },
    { question: 'Describe the perfect date night.', imposterQuestion: 'Describe the perfect friend hangout.' },
    { question: 'What is the worst haircut you have ever had?', imposterQuestion: 'What is the worst outfit you have ever worn?' },
];

function pickRandomQuestion(usedQuestions) {
    const available = QUESTION_BANK.filter(q => !usedQuestions.has(q.question));
    const pool = available.length > 0 ? available : QUESTION_BANK;
    return pool[Math.floor(Math.random() * pool.length)];
}

const IMP_COLORS = ['#4fc3f7', '#81c784', '#ffb74d', '#e57373', '#ba68c8', '#4db6ac', '#fff176', '#f06292'];

function generateImposterRoomId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = '';
    for (let i = 0; i < 5; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
}

function pickRandomWord(usedWords) {
    const available = WORD_BANK.filter(w => !usedWords.has(w.word));
    const pool = available.length > 0 ? available : WORD_BANK;
    return pool[Math.floor(Math.random() * pool.length)];
}

function buildPlayerList(room) {
    const list = [];
    for (const [id, p] of room.players) {
        list.push({ id, name: p.name, color: p.color, isHost: id === room.hostId });
    }
    return list;
}

imposterIo.on('connection', (socket) => {
    console.log(`[Imposter] Player connected: ${socket.id}`);
    let currentRoom = null;

    // Create room
    socket.on('imposter:create', (data, cb) => {
        const roomId = generateImposterRoomId();
        const room = {
            hostId: socket.id,
            players: new Map(),
            round: 0,
            usedWords: new Set(),
            usedQuestions: new Set(),
            scores: new Map(),
            createdAt: Date.now(),
            phase: 'lobby',
            gameMode: 'word', // 'word' or 'question'
            discussTime: 60,
            voteTime: 20,
            currentWord: null,
            currentQuestion: null,
            imposterId: null,
            votes: new Map(),
            answers: new Map(), // playerId → answer string (question mode)
            timers: [],
        };
        room.players.set(socket.id, {
            name: (data.name || 'Host').substring(0, 16),
            color: IMP_COLORS[0],
        });
        room.scores.set(socket.id, 0);
        imposterRooms.set(roomId, room);
        socket.join(roomId);
        currentRoom = roomId;

        console.log(`[Imposter] Room ${roomId} created by ${data.name}`);
        cb({ roomId, success: true, players: buildPlayerList(room) });
    });

    // Join room
    socket.on('imposter:join', (data, cb) => {
        const room = imposterRooms.get(data.roomId);
        if (!room) { cb({ error: 'Room not found' }); return; }
        if (room.players.size >= 12) { cb({ error: 'Room is full (max 12)' }); return; }
        if (room.phase !== 'lobby') { cb({ error: 'Game already in progress' }); return; }

        const colorIdx = room.players.size % IMP_COLORS.length;
        room.players.set(socket.id, {
            name: (data.name || 'Player').substring(0, 16),
            color: IMP_COLORS[colorIdx],
        });
        room.scores.set(socket.id, 0);
        socket.join(data.roomId);
        currentRoom = data.roomId;

        const playerList = buildPlayerList(room);

        // Notify everyone
        imposterIo.to(data.roomId).emit('imposter:player-joined', { players: playerList });

        console.log(`[Imposter] ${data.name} joined room ${data.roomId} (${room.players.size} players)`);
        cb({ success: true, players: playerList });
    });

    // Start game
    socket.on('imposter:start', (data) => {
        if (!currentRoom) return;
        const room = imposterRooms.get(currentRoom);
        if (!room || room.hostId !== socket.id) return;
        if (room.players.size < 3) return;

        room.discussTime = Math.min(Math.max(data.discussTime || 60, 15), 180);
        room.voteTime = Math.min(Math.max(data.voteTime || 20, 10), 60);
        if (data.gameMode === 'question' || data.gameMode === 'word') {
            room.gameMode = data.gameMode;
        }
        startNewRound(currentRoom, room);
    });

    // Submit answer (question mode)
    socket.on('imposter:submit-answer', (data) => {
        if (!currentRoom) return;
        const room = imposterRooms.get(currentRoom);
        if (!room || room.phase !== 'answering') return;
        if (room.answers.has(socket.id)) return; // already answered

        room.answers.set(socket.id, (data.answer || '').substring(0, 300).trim());

        // Broadcast answer count
        imposterIo.to(currentRoom).emit('imposter:answer-count', {
            answered: room.answers.size,
            total: room.players.size,
        });

        // Check if all answered
        if (room.answers.size >= room.players.size) {
            clearRoomTimers(room);
            revealAnswers(currentRoom, room);
        }
    });

    // Next round
    socket.on('imposter:next-round', () => {
        if (!currentRoom) return;
        const room = imposterRooms.get(currentRoom);
        if (!room || room.hostId !== socket.id) return;
        startNewRound(currentRoom, room);
    });

    // Vote
    socket.on('imposter:vote', (data) => {
        if (!currentRoom) return;
        const room = imposterRooms.get(currentRoom);
        if (!room || room.phase !== 'vote') return;
        if (socket.id === room.imposterId) return; // imposter can't vote
        if (room.votes.has(socket.id)) return; // already voted

        room.votes.set(socket.id, data.target);

        // Broadcast vote counts (anonymous — just totals per player)
        const voteCounts = {};
        for (const [, target] of room.votes) {
            voteCounts[target] = (voteCounts[target] || 0) + 1;
        }
        imposterIo.to(currentRoom).emit('imposter:vote-update', { votes: voteCounts });

        // Check if all non-imposter players voted
        let allVoted = true;
        for (const [id] of room.players) {
            if (id !== room.imposterId && !room.votes.has(id)) {
                allVoted = false;
                break;
            }
        }
        if (allVoted) {
            clearRoomTimers(room);
            resolveVotes(currentRoom, room);
        }
    });

    // Chat
    socket.on('imposter:chat', (data) => {
        if (!currentRoom) return;
        const room = imposterRooms.get(currentRoom);
        if (!room) return;
        const player = room.players.get(socket.id);
        if (!player) return;
        const msg = (data.msg || '').substring(0, 200).trim();
        if (!msg) return;
        imposterIo.to(currentRoom).emit('imposter:chat', {
            name: player.name,
            color: player.color,
            msg,
        });
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log(`[Imposter] Player disconnected: ${socket.id}`);
        if (currentRoom) leaveRoom();
    });

    function leaveRoom() {
        const room = imposterRooms.get(currentRoom);
        if (!room) { currentRoom = null; return; }

        room.players.delete(socket.id);
        room.scores.delete(socket.id);
        socket.leave(currentRoom);

        if (room.players.size === 0) {
            clearRoomTimers(room);
            imposterRooms.delete(currentRoom);
            console.log(`[Imposter] Room ${currentRoom} deleted (empty)`);
        } else {
            // If host left, promote
            if (room.hostId === socket.id) {
                room.hostId = room.players.keys().next().value;
            }
            const playerList = buildPlayerList(room);
            imposterIo.to(currentRoom).emit('imposter:player-left', {
                players: playerList,
                newHost: room.hostId,
            });
        }
        currentRoom = null;
    }
});

function clearRoomTimers(room) {
    for (const t of room.timers) clearTimeout(t);
    room.timers = [];
}

function startNewRound(roomId, room) {
    clearRoomTimers(room);
    room.round++;
    room.votes = new Map();
    room.answers = new Map();

    // Pick imposter
    const playerIds = [...room.players.keys()];
    room.imposterId = playerIds[Math.floor(Math.random() * playerIds.length)];

    if (room.gameMode === 'question') {
        // ── QUESTION MODE ──
        room.phase = 'answering';
        const qObj = pickRandomQuestion(room.usedQuestions);
        room.usedQuestions.add(qObj.question);
        room.currentQuestion = qObj;
        room.currentWord = null;

        console.log(`[Imposter] Room ${roomId} round ${room.round} (question): crew="${qObj.question}", imposter="${qObj.imposterQuestion}", imp=${room.imposterId}`);

        for (const [id] of room.players) {
            const sock = imposterIo.sockets.sockets.get(id);
            if (!sock) continue;
            if (id === room.imposterId) {
                sock.emit('imposter:round-start', {
                    role: 'imposter',
                    gameMode: 'question',
                    question: qObj.imposterQuestion,
                    round: room.round,
                    answerTime: 60,
                });
            } else {
                sock.emit('imposter:round-start', {
                    role: 'crew',
                    gameMode: 'question',
                    question: qObj.question,
                    round: room.round,
                    answerTime: 60,
                });
            }
        }

        // Auto-advance after answer time
        const answerTimer = setTimeout(() => {
            if (room.phase === 'answering') {
                // Fill in blank answers for anyone who didn't respond
                for (const [id] of room.players) {
                    if (!room.answers.has(id)) room.answers.set(id, '(no answer)');
                }
                revealAnswers(roomId, room);
            }
        }, 60 * 1000);
        room.timers.push(answerTimer);

    } else {
        // ── CLASSIC WORD MODE ──
        room.phase = 'discuss';
        const wordObj = pickRandomWord(room.usedWords);
        room.usedWords.add(wordObj.word);
        room.currentWord = wordObj;
        room.currentQuestion = null;

        console.log(`[Imposter] Room ${roomId} round ${room.round}: word="${wordObj.word}", imposter=${room.imposterId}`);

        for (const [id] of room.players) {
            const sock = imposterIo.sockets.sockets.get(id);
            if (!sock) continue;
            if (id === room.imposterId) {
                sock.emit('imposter:round-start', {
                    role: 'imposter',
                    gameMode: 'word',
                    hint: wordObj.hint,
                    round: room.round,
                    discussTime: room.discussTime,
                });
            } else {
                sock.emit('imposter:round-start', {
                    role: 'crew',
                    gameMode: 'word',
                    word: wordObj.word,
                    category: wordObj.category,
                    round: room.round,
                    discussTime: room.discussTime,
                });
            }
        }

        // After discussion time → vote phase
        const discussTimer = setTimeout(() => {
            room.phase = 'vote';
            imposterIo.to(roomId).emit('imposter:vote-phase', { voteTime: room.voteTime });

            const voteTimer = setTimeout(() => {
                resolveVotes(roomId, room);
            }, room.voteTime * 1000);
            room.timers.push(voteTimer);
        }, room.discussTime * 1000);
        room.timers.push(discussTimer);
    }
}

function revealAnswers(roomId, room) {
    room.phase = 'discuss';

    // Build answers list (shuffled order for extra deception)
    const answerList = [];
    for (const [id, answer] of room.answers) {
        const player = room.players.get(id);
        answerList.push({ id, name: player?.name || 'Player', answer });
    }

    imposterIo.to(roomId).emit('imposter:answers-revealed', {
        answers: answerList,
        discussTime: room.discussTime,
    });

    // After discussion → vote
    const discussTimer = setTimeout(() => {
        room.phase = 'vote';
        imposterIo.to(roomId).emit('imposter:vote-phase', { voteTime: room.voteTime });

        const voteTimer = setTimeout(() => {
            resolveVotes(roomId, room);
        }, room.voteTime * 1000);
        room.timers.push(voteTimer);
    }, room.discussTime * 1000);
    room.timers.push(discussTimer);
}

function resolveVotes(roomId, room) {
    if (room.phase === 'results') return; // already resolved
    room.phase = 'results';

    // Tally votes
    const tally = {};
    for (const [, target] of room.votes) {
        tally[target] = (tally[target] || 0) + 1;
    }

    // Find most voted
    let maxVotes = 0;
    let votedOut = null;
    let tie = false;
    for (const [id, count] of Object.entries(tally)) {
        if (count > maxVotes) {
            maxVotes = count;
            votedOut = id;
            tie = false;
        } else if (count === maxVotes) {
            tie = true;
        }
    }

    if (tie) votedOut = null; // ties mean nobody is voted out

    const crewWins = votedOut === room.imposterId;

    // Award points
    if (crewWins) {
        // Each crew member who voted correctly gets 2 pts
        for (const [voter, target] of room.votes) {
            if (target === room.imposterId) {
                room.scores.set(voter, (room.scores.get(voter) || 0) + 2);
            }
        }
    } else {
        // Imposter gets 3 pts for surviving
        room.scores.set(room.imposterId, (room.scores.get(room.imposterId) || 0) + 3);
    }

    // Build scores array
    const scores = [];
    for (const [id, p] of room.players) {
        scores.push({ id, name: p.name, score: room.scores.get(id) || 0 });
    }

    const resultData = {
        crewWins,
        imposterId: room.imposterId,
        votedOut,
        gameMode: room.gameMode,
        scores,
    };
    if (room.gameMode === 'question' && room.currentQuestion) {
        resultData.crewQuestion = room.currentQuestion.question;
        resultData.imposterQuestion = room.currentQuestion.imposterQuestion;
    } else if (room.currentWord) {
        resultData.word = room.currentWord.word;
        resultData.hint = room.currentWord.hint;
    }
    imposterIo.to(roomId).emit('imposter:results', resultData);

    // Go back to lobby phase so host can start next round
    room.phase = 'lobby';
}

// Cleanup stale imposter rooms every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [id, room] of imposterRooms) {
        if (room.players.size === 0 || now - room.createdAt > 6 * 60 * 60 * 1000) {
            clearRoomTimers(room);
            imposterRooms.delete(id);
        }
    }
}, 5 * 60 * 1000);

// Bind to 0.0.0.0 explicitly for Railway
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log(`🎮 Games server running on http://${HOST}:${PORT}`);
    console.log(`   Serving games from: ${path.join(__dirname, 'public')}`);
    console.log(`   🌐 Colony Multiplayer: Socket.IO on /colony-mp`);
    console.log(`   🕵️ Imposter Game: Socket.IO on /imposter-mp`);
}).on('error', (err) => {
    console.error('❌ Server failed to start:', err);
    process.exit(1);
});

