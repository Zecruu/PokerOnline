// Daily challenge + leaderboard for the games-server.
// - Daily challenge: deterministic seed + modifier set, derived from UTC date.
//   Resets at UTC midnight. Same for every player worldwide.
// - Leaderboard: Mongo-backed, two modes: 'daily' (per-day per-player best) and
//   'allTime' (per-player best ever for a given character).
//
// Wire-up (in server.js):
//   const leaderboard = require('./leaderboard');
//   leaderboard.connect(process.env.MONGODB_URI);
//   leaderboard.mountRoutes(app);

const mongoose = require('mongoose');

// ── Mongo connection ─────────────────────────────────────────
let _connecting = null;
async function connect(uri) {
  if (!uri) {
    console.warn('[leaderboard] No MONGODB_URI; leaderboard endpoints will return 503.');
    return false;
  }
  if (mongoose.connection.readyState === 1) return true;
  if (_connecting) return _connecting;
  _connecting = mongoose
    .connect(uri, { serverSelectionTimeoutMS: 8000 })
    .then(() => { console.log('[leaderboard] mongo connected'); return true; })
    .catch((err) => { console.error('[leaderboard] mongo connect failed:', err.message); _connecting = null; return false; });
  return _connecting;
}

function isReady() {
  return mongoose.connection.readyState === 1;
}

// ── Schema ───────────────────────────────────────────────────
// One document per submitted run. We keep all submissions and let queries
// pull the player's best — simpler than upsert logic and lets us show recent
// activity if we ever want to.
const entrySchema = new mongoose.Schema({
  game: { type: String, required: true, index: true }, // e.g. 'velthara'
  mode: { type: String, required: true, enum: ['daily', 'allTime'], index: true },
  dailyKey: { type: String, index: true }, // YYYY-MM-DD when mode==='daily'
  playerName: { type: String, required: true, maxlength: 24 },
  character: { type: String, required: true, maxlength: 32 },
  // Score components (wave is the primary sort, kills/level are tiebreakers).
  wave: { type: Number, required: true, min: 0, max: 999 },
  kills: { type: Number, required: true, min: 0, max: 999999 },
  level: { type: Number, required: true, min: 0, max: 999 },
  runDuration: { type: Number, default: 0, min: 0, max: 86400 }, // seconds
  // Loose modifier hash so we can verify the run was for THIS daily.
  modifierHash: { type: String, maxlength: 64 },
  createdAt: { type: Date, default: Date.now, index: true },
});

// Compound index for the most common query: top wave per (game, mode, dailyKey).
entrySchema.index({ game: 1, mode: 1, dailyKey: 1, wave: -1, kills: -1 });

const Entry = mongoose.models.LeaderboardEntry || mongoose.model('LeaderboardEntry', entrySchema);

// ── Daily challenge generator ────────────────────────────────
// Deterministic from UTC date. Same goal set for every player worldwide for
// that day. The game runs UNCHANGED — these are pure achievement-style goals
// the player aims for during a normal run. The client evaluates each completed
// run against today's goals and tracks completion locally.
//
// Each goal is a `target` against a single stat reported on run end:
//   stat: 'wave' | 'kills' | 'level' | 'runDuration' (seconds)
//   gte:  threshold to meet/exceed (e.g. wave gte 30)
const GOALS = [
  { id: 'wave_15',    name: 'Push to Wave 15',     description: 'Survive until wave 15.',                   stat: 'wave',        gte: 15 },
  { id: 'wave_25',    name: 'Push to Wave 25',     description: 'Survive until wave 25.',                   stat: 'wave',        gte: 25 },
  { id: 'wave_35',    name: 'Push to Wave 35',     description: 'Survive until wave 35.',                   stat: 'wave',        gte: 35 },
  { id: 'kills_500',  name: 'Body Count: 500',     description: 'Get 500 kills in a single run.',           stat: 'kills',       gte: 500 },
  { id: 'kills_1500', name: 'Body Count: 1,500',   description: 'Get 1,500 kills in a single run.',         stat: 'kills',       gte: 1500 },
  { id: 'kills_3000', name: 'Body Count: 3,000',   description: 'Get 3,000 kills in a single run.',         stat: 'kills',       gte: 3000 },
  { id: 'level_20',   name: 'Reach Level 20',      description: 'Reach character level 20.',                stat: 'level',       gte: 20 },
  { id: 'level_35',   name: 'Reach Level 35',      description: 'Reach character level 35.',                stat: 'level',       gte: 35 },
  { id: 'survive_10', name: 'Survive 10 Minutes',  description: 'Stay alive for at least 10 minutes.',      stat: 'runDuration', gte: 600 },
  { id: 'survive_20', name: 'Survive 20 Minutes',  description: 'Stay alive for at least 20 minutes.',      stat: 'runDuration', gte: 1200 },
  { id: 'level_50',   name: 'Hit Level 50',        description: 'Reach character level 50.',                stat: 'level',       gte: 50 },
  { id: 'wave_50',    name: 'Endgame: Wave 50',    description: 'Survive to wave 50.',                      stat: 'wave',        gte: 50 },
];

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

function utcDateKey(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Pick 3 distinct goals deterministically from today's date.
function getDailyChallenge(dailyKey = utcDateKey()) {
  const seed = fnv1a(dailyKey);
  // Tiered pick: 1 easy, 1 medium, 1 hard for a good rhythm of "achievable
  // → stretch → bragging-rights".
  const easy   = GOALS.filter((g) => ['wave_15','kills_500','level_20','survive_10'].includes(g.id));
  const medium = GOALS.filter((g) => ['wave_25','kills_1500','level_35','survive_20'].includes(g.id));
  const hard   = GOALS.filter((g) => ['wave_35','kills_3000','level_50','wave_50'].includes(g.id));
  const goals = [
    easy[seed % easy.length],
    medium[(seed >>> 8) % medium.length],
    hard[(seed >>> 16) % hard.length],
  ];
  return {
    dailyKey,
    seed,
    goals,
    expiresAt: nextUtcMidnight(),
  };
}

function nextUtcMidnight() {
  const d = new Date();
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0, 0);
}

// ── Validation ───────────────────────────────────────────────
function sanitizePlayerName(name) {
  if (typeof name !== 'string') return null;
  const trimmed = name.trim().replace(/[^\w\-\. ]/g, '').slice(0, 24);
  return trimmed.length >= 2 ? trimmed : null;
}

function validateScore(body) {
  if (!body || typeof body !== 'object') return 'invalid body';
  if (!['daily', 'allTime'].includes(body.mode)) return 'invalid mode';
  const playerName = sanitizePlayerName(body.playerName);
  if (!playerName) return 'invalid playerName';
  if (typeof body.character !== 'string' || body.character.length > 32) return 'invalid character';
  const wave = Number(body.wave), kills = Number(body.kills), level = Number(body.level);
  if (!Number.isFinite(wave) || wave < 0 || wave > 999) return 'invalid wave';
  if (!Number.isFinite(kills) || kills < 0 || kills > 999999) return 'invalid kills';
  if (!Number.isFinite(level) || level < 0 || level > 999) return 'invalid level';
  // Light anti-cheat: cap kills against a generous wave-derived ceiling.
  const maxReasonableKills = Math.max(50, wave * 400);
  if (kills > maxReasonableKills) return 'kills suspicious for wave count';
  return { playerName, wave, kills, level };
}

// ── Routes ───────────────────────────────────────────────────
function mountRoutes(app) {
  app.get('/api/leaderboard/daily', async (req, res) => {
    if (!isReady()) return res.status(503).json({ error: 'leaderboard offline' });
    const dailyKey = (typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date))
      ? req.query.date : utcDateKey();
    const game = (req.query.game || 'velthara').toString().slice(0, 32);
    try {
      const top = await Entry.find({ game, mode: 'daily', dailyKey })
        .sort({ wave: -1, kills: -1, level: -1, createdAt: 1 })
        .limit(50)
        .select('playerName character wave kills level runDuration createdAt')
        .lean();
      // De-duplicate to one entry per player (their best).
      const seen = new Set();
      const dedup = [];
      for (const row of top) {
        if (seen.has(row.playerName)) continue;
        seen.add(row.playerName);
        dedup.push(row);
        if (dedup.length >= 25) break;
      }
      res.json({ dailyKey, entries: dedup, challenge: getDailyChallenge(dailyKey) });
    } catch (err) {
      console.error('[leaderboard] daily query failed:', err);
      res.status(500).json({ error: 'query failed' });
    }
  });

  app.get('/api/leaderboard/all-time', async (req, res) => {
    if (!isReady()) return res.status(503).json({ error: 'leaderboard offline' });
    const game = (req.query.game || 'velthara').toString().slice(0, 32);
    const character = req.query.character ? req.query.character.toString().slice(0, 32) : null;
    try {
      const filter = { game, mode: 'allTime' };
      if (character) filter.character = character;
      const top = await Entry.find(filter)
        .sort({ wave: -1, kills: -1, level: -1, createdAt: 1 })
        .limit(50)
        .select('playerName character wave kills level runDuration createdAt')
        .lean();
      const seen = new Set();
      const dedup = [];
      for (const row of top) {
        const key = row.playerName + '|' + row.character;
        if (seen.has(key)) continue;
        seen.add(key);
        dedup.push(row);
        if (dedup.length >= 25) break;
      }
      res.json({ entries: dedup });
    } catch (err) {
      console.error('[leaderboard] all-time query failed:', err);
      res.status(500).json({ error: 'query failed' });
    }
  });

  app.get('/api/leaderboard/daily/today', (req, res) => {
    res.json(getDailyChallenge());
  });

  app.post('/api/leaderboard/submit', async (req, res) => {
    if (!isReady()) return res.status(503).json({ error: 'leaderboard offline' });
    const body = req.body;
    const validated = validateScore(body);
    if (typeof validated === 'string') return res.status(400).json({ error: validated });
    const game = (body.game || 'velthara').toString().slice(0, 32);
    const character = body.character.toString().slice(0, 32);
    const runDuration = Math.max(0, Math.min(86400, Number(body.runDuration) || 0));
    if (runDuration < 30) return res.status(400).json({ error: 'run too short' });
    const dailyKey = body.mode === 'daily' ? utcDateKey() : null;
    try {
      await Entry.create({
        game,
        mode: body.mode,
        dailyKey,
        playerName: validated.playerName,
        character,
        wave: validated.wave,
        kills: validated.kills,
        level: validated.level,
        runDuration,
      });
      // Evaluate which of today's goals this run completes (if any).
      let goalsCompleted = [];
      if (body.mode === 'daily') {
        const ch = getDailyChallenge(dailyKey);
        const stats = { wave: validated.wave, kills: validated.kills, level: validated.level, runDuration };
        goalsCompleted = ch.goals.filter((g) => stats[g.stat] >= g.gte).map((g) => g.id);
      }
      res.json({ ok: true, goalsCompleted });
    } catch (err) {
      console.error('[leaderboard] submit failed:', err);
      res.status(500).json({ error: 'submit failed' });
    }
  });
}

module.exports = {
  connect,
  mountRoutes,
  getDailyChallenge,
  utcDateKey,
};
