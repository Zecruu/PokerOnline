const express = require('express');
const compression = require('compression');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

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

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'games-server' });
});

// Root redirect to game list or main game
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>ZecruGames - Games</title>
            <style>
                body { 
                    font-family: 'Inter', sans-serif; 
                    background: linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 100%);
                    color: white; 
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    margin: 0;
                }
                h1 { color: #00ffaa; margin-bottom: 2rem; }
                .games { display: flex; gap: 2rem; flex-wrap: wrap; justify-content: center; }
                .game-card {
                    background: rgba(0,0,0,0.5);
                    border: 2px solid #00ffaa;
                    border-radius: 12px;
                    padding: 2rem;
                    text-align: center;
                    text-decoration: none;
                    color: white;
                    transition: all 0.3s;
                }
                .game-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 10px 30px rgba(0,255,170,0.3);
                }
                .game-card h2 { color: #00ffaa; margin: 0 0 0.5rem 0; }
                .game-card p { color: #888; margin: 0; }
            </style>
        </head>
        <body>
            <h1>🎮 ZecruGames</h1>
            <div class="games">
                <a href="/veltharas-dominion/" class="game-card">
                    <h2>⚔️ Velthara's Dominion</h2>
                    <p>Wave-based survival</p>
                </a>
                <a href="/poker/" class="game-card">
                    <h2>🃏 Poker</h2>
                    <p>Texas Hold'em</p>
                </a>
            </div>
            <p style="margin-top: 2rem; color: #666;">
                <a href="https://www.zecrugames.com" style="color: #00ffaa;">← Back to Hub</a>
            </p>
        </body>
        </html>
    `);
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

// Bind to 0.0.0.0 explicitly for Railway
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log(`🎮 Games server running on http://${HOST}:${PORT}`);
    console.log(`   Serving games from: ${path.join(__dirname, 'public')}`);
}).on('error', (err) => {
    console.error('❌ Server failed to start:', err);
    process.exit(1);
});

