// ============================================
// 1-10 RANGE — MULTIPLAYER (Socket.IO)
// Mounted from server.js via mount(server)
// ============================================
const { Server: SocketServer } = require('socket.io');
const { rollRange, isInRange, scoreRound } = require('./public/range-1-10/range.js');

const COLORS = ['#2ee6a6', '#3d9eff', '#ffb74d', '#e57373', '#ba68c8', '#4db6ac', '#fff176', '#f06292'];

function generateRoomId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = '';
    for (let i = 0; i < 5; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
}

function buildPlayerList(room) {
    const list = [];
    for (const [id, p] of room.players) {
        list.push({ id, name: p.name, color: p.color, isHost: id === room.hostId });
    }
    return list;
}

function clearTimers(room) {
    for (const t of room.timers) clearTimeout(t);
    room.timers = [];
}

function startNewRound(io, roomId, room) {
    clearTimers(room);
    room.round++;
    room.guesses = new Map();
    room.phase = 'guess';
    const rolled = rollRange();
    room.min = rolled.min;
    room.max = rolled.max;
    room.target = rolled.target;

    console.log(`[Range] Room ${roomId} round ${room.round}: ${room.min}-${room.max} target=${room.target}`);

    io.to(roomId).emit('range:round-start', {
        round: room.round,
        min: room.min,
        max: room.max,
        guessTime: room.guessTime,
    });

    const timer = setTimeout(() => {
        if (room.phase === 'guess') resolveRound(io, roomId, room);
    }, room.guessTime * 1000);
    room.timers.push(timer);
}

function resolveRound(io, roomId, room) {
    if (room.phase === 'results') return;
    room.phase = 'results';
    clearTimers(room);

    const guesses = [];
    for (const [id, p] of room.players) {
        const raw = room.guesses.has(id) ? room.guesses.get(id) : null;
        guesses.push({ id, name: p.name, guess: raw });
    }

    const scored = scoreRound(room.target, guesses);
    for (const s of scored) {
        if (s.points) {
            room.scores.set(s.id, (room.scores.get(s.id) || 0) + s.points);
        }
    }

    const scores = [];
    for (const [id, p] of room.players) {
        scores.push({ id, name: p.name, score: room.scores.get(id) || 0 });
    }

    io.to(roomId).emit('range:results', {
        round: room.round,
        min: room.min,
        max: room.max,
        target: room.target,
        guesses: scored.map((s) => ({
            id: s.id,
            name: s.name,
            guess: Number.isFinite(s.guess) ? s.guess : null,
            dist: Number.isFinite(s.dist) ? s.dist : null,
            points: s.points,
            exact: s.exact,
            closest: s.closest,
        })),
        scores,
    });

    room.phase = 'lobby';
}

function mount(server) {
    const io = new SocketServer(server, {
        path: '/range-mp',
        cors: { origin: '*', methods: ['GET', 'POST'] },
        pingInterval: 10000,
        pingTimeout: 5000,
    });

    const rooms = new Map();

    io.on('connection', (socket) => {
        console.log(`[Range] Player connected: ${socket.id}`);
        let currentRoom = null;

        socket.on('range:create', (data, cb) => {
            const roomId = generateRoomId();
            const room = {
                hostId: socket.id,
                players: new Map(),
                scores: new Map(),
                guesses: new Map(),
                round: 0,
                phase: 'lobby',
                guessTime: 25,
                min: null,
                max: null,
                target: null,
                createdAt: Date.now(),
                timers: [],
            };
            room.players.set(socket.id, {
                name: (data.name || 'Host').substring(0, 16),
                color: COLORS[0],
            });
            room.scores.set(socket.id, 0);
            rooms.set(roomId, room);
            socket.join(roomId);
            currentRoom = roomId;
            console.log(`[Range] Room ${roomId} created by ${data.name}`);
            cb({ success: true, roomId, players: buildPlayerList(room) });
        });

        socket.on('range:join', (data, cb) => {
            const room = rooms.get(data.roomId);
            if (!room) { cb({ error: 'Room not found' }); return; }
            if (room.players.size >= 8) { cb({ error: 'Room is full (max 8)' }); return; }
            if (room.phase !== 'lobby') { cb({ error: 'Game already in progress' }); return; }

            room.players.set(socket.id, {
                name: (data.name || 'Player').substring(0, 16),
                color: COLORS[room.players.size % COLORS.length],
            });
            room.scores.set(socket.id, 0);
            socket.join(data.roomId);
            currentRoom = data.roomId;

            const playerList = buildPlayerList(room);
            io.to(data.roomId).emit('range:player-joined', { players: playerList });
            console.log(`[Range] ${data.name} joined room ${data.roomId} (${room.players.size} players)`);
            cb({ success: true, players: playerList });
        });

        socket.on('range:start', (data) => {
            if (!currentRoom) return;
            const room = rooms.get(currentRoom);
            if (!room || room.hostId !== socket.id) return;
            if (room.players.size < 1) return;
            room.guessTime = Math.min(Math.max((data && data.guessTime) || 25, 10), 60);
            startNewRound(io, currentRoom, room);
        });

        socket.on('range:guess', (data) => {
            if (!currentRoom) return;
            const room = rooms.get(currentRoom);
            if (!room || room.phase !== 'guess') return;
            if (room.guesses.has(socket.id)) return;
            const guess = parseInt(data && data.guess, 10);
            if (!isInRange(guess, room.min, room.max)) return;
            room.guesses.set(socket.id, guess);
            io.to(currentRoom).emit('range:guess-count', {
                guessed: room.guesses.size,
                total: room.players.size,
            });
            if (room.guesses.size >= room.players.size) {
                resolveRound(io, currentRoom, room);
            }
        });

        socket.on('range:next-round', () => {
            if (!currentRoom) return;
            const room = rooms.get(currentRoom);
            if (!room || room.hostId !== socket.id) return;
            startNewRound(io, currentRoom, room);
        });

        socket.on('disconnect', () => {
            console.log(`[Range] Player disconnected: ${socket.id}`);
            if (!currentRoom) return;
            const room = rooms.get(currentRoom);
            if (!room) { currentRoom = null; return; }

            room.players.delete(socket.id);
            room.scores.delete(socket.id);
            room.guesses.delete(socket.id);
            socket.leave(currentRoom);

            if (room.players.size === 0) {
                clearTimers(room);
                rooms.delete(currentRoom);
                console.log(`[Range] Room ${currentRoom} deleted (empty)`);
            } else {
                if (room.hostId === socket.id) {
                    room.hostId = room.players.keys().next().value;
                }
                io.to(currentRoom).emit('range:player-left', {
                    players: buildPlayerList(room),
                    newHost: room.hostId,
                });
                if (room.phase === 'guess' && room.guesses.size >= room.players.size) {
                    resolveRound(io, currentRoom, room);
                }
            }
            currentRoom = null;
        });
    });

    setInterval(() => {
        const now = Date.now();
        for (const [id, room] of rooms) {
            if (room.players.size === 0 || now - room.createdAt > 6 * 60 * 60 * 1000) {
                clearTimers(room);
                rooms.delete(id);
            }
        }
    }, 5 * 60 * 1000);

    return io;
}

module.exports = { mount };
