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

// Bind to 0.0.0.0 explicitly for Railway
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log(`🎮 Games server running on http://${HOST}:${PORT}`);
    console.log(`   Serving games from: ${path.join(__dirname, 'public')}`);
    console.log(`   🌐 Colony Multiplayer: Socket.IO on /colony-mp`);
}).on('error', (err) => {
    console.error('❌ Server failed to start:', err);
    process.exit(1);
});

