const express = require('express');
const compression = require('compression');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Log startup
console.log('🚀 Starting games server...');
console.log(`   Node version: ${process.version}`);
console.log(`   PORT env: ${process.env.PORT || 'not set, using 3001'}`);

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

// Cache static assets - short cache for JS/CSS to allow quick updates
const cacheOptions = {
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
        // Cache images and audio longer (1 week)
        if (filePath.match(/\.(jpg|jpeg|png|gif|webp|mp3|wav|ogg)$/i)) {
            res.setHeader('Cache-Control', 'public, max-age=604800');
        }
        // JS/CSS - short cache (5 minutes) to allow quick updates
        else if (filePath.match(/\.(js|css)$/i)) {
            res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
        }
        // HTML - no cache (always fresh)
        else if (filePath.match(/\.html$/i)) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
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

