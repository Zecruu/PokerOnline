// Stick Royale multiplayer rooms (Socket.IO)
// Client in games/stick-royale + hub/public/games/stick-royale emits sr:* events.
// Server-authoritative simulation via games/stick-royale/sim.js

const StickRoyale = require('../games/stick-royale/sim');

const SR_MAX_PLAYERS = 2;
const TICK_HZ = 10;
const TICK_DT = 1 / TICK_HZ;

function makePlayer(socket, name, isHost) {
    const trimmed = String(name || 'Player').trim().substring(0, 12);
    return {
        socketId: socket.id,
        name: trimmed || 'Player',
        isHost: !!isHost
    };
}

function generateUniqueCode(rooms) {
    let code;
    do {
        code = Math.random().toString(36).substr(2, 6).toUpperCase();
    } while (rooms[code]);
    return code;
}

function sanitizeMode(mode) {
    return mode === 'versus' ? 'versus' : 'survival';
}

function playerIndex(room, socketId) {
    return room.players.findIndex((p) => p.socketId === socketId);
}

function stopLoop(room) {
    if (room.loop) {
        clearInterval(room.loop);
        room.loop = null;
    }
}

function broadcastState(io, room) {
    if (!room.match) return;
    io.to('sr:' + room.code).emit('sr:state', StickRoyale.getSnapshot(room.match));
}

function startMatchLoop(io, room) {
    stopLoop(room);
    room.loop = setInterval(() => {
        if (!room.match || room.match.ended) {
            if (room.match && room.match.ended && !room.endedEmitted) {
                room.endedEmitted = true;
                io.to('sr:' + room.code).emit('sr:gameOver', StickRoyale.getSnapshot(room.match));
            }
            stopLoop(room);
            return;
        }
        StickRoyale.tick(room.match, TICK_DT);
        broadcastState(io, room);
        if (room.match.ended && !room.endedEmitted) {
            room.endedEmitted = true;
            io.to('sr:' + room.code).emit('sr:gameOver', StickRoyale.getSnapshot(room.match));
            stopLoop(room);
        }
    }, TICK_DT * 1000);
}

function attachStickRoyale(socket, io, rooms) {
    socket.on('sr:createRoom', (data = {}) => {
        const code = generateUniqueCode(rooms);
        const player = makePlayer(socket, data && data.name, true);
        const mode = sanitizeMode(data && data.mode);
        rooms[code] = {
            code,
            hostId: socket.id,
            players: [player],
            started: false,
            mode,
            match: null,
            loop: null,
            endedEmitted: false
        };
        socket.srRoom = code;
        socket.join('sr:' + code);
        socket.emit('sr:roomCreated', { code, mode, players: [player] });
        console.log(`⚔️  SR Room ${code} created by ${player.name} (${mode})`);
    });

    socket.on('sr:joinRoom', (data = {}) => {
        const code = String((data && data.code) || '').trim().toUpperCase();
        const room = rooms[code];
        if (!room) return socket.emit('sr:error', { msg: 'Room not found' });
        if (room.started) return socket.emit('sr:error', { msg: 'Game already started' });
        if (room.players.length >= SR_MAX_PLAYERS) return socket.emit('sr:error', { msg: 'Room full' });
        if (room.players.some((p) => p.socketId === socket.id)) return;

        const player = makePlayer(socket, data && data.name, false);
        room.players.push(player);
        socket.srRoom = code;
        socket.join('sr:' + code);
        socket.emit('sr:roomJoined', {
            code,
            mode: room.mode,
            hostId: room.hostId,
            players: room.players
        });
        socket.to('sr:' + code).emit('sr:roomUpdate', {
            players: room.players,
            hostId: room.hostId,
            mode: room.mode
        });
        console.log(`⚔️  ${player.name} joined SR room ${code}`);
    });

    socket.on('sr:setMode', (data = {}) => {
        const room = rooms[socket.srRoom];
        if (!room || room.hostId !== socket.id || room.started) return;
        room.mode = sanitizeMode(data && data.mode);
        io.to('sr:' + socket.srRoom).emit('sr:modeChanged', { mode: room.mode });
    });

    socket.on('sr:startGame', (data = {}) => {
        const room = rooms[socket.srRoom];
        if (!room || room.hostId !== socket.id || room.started) return;
        if (room.players.length < 2) return socket.emit('sr:error', { msg: 'Need 2 players' });
        room.started = true;
        room.mode = sanitizeMode((data && data.mode) || room.mode);
        const seed = (data && data.seed != null) ? (data.seed >>> 0) : ((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
        room.match = StickRoyale.createMatch({
            mode: room.mode,
            seed,
            playerCount: 2,
            aiOpponent: false,
            names: room.players.map((p) => p.name)
        });
        io.to('sr:' + socket.srRoom).emit('sr:gameStart', {
            mode: room.mode,
            seed,
            players: room.players,
            state: StickRoyale.getSnapshot(room.match)
        });
        startMatchLoop(io, room);
        console.log(`⚔️  SR Room ${socket.srRoom} started (${room.mode})`);
    });

    socket.on('sr:playCard', (data = {}) => {
        const room = rooms[socket.srRoom];
        if (!room || !room.match || room.match.ended) return;
        const idx = playerIndex(room, socket.id);
        if (idx < 0) return;
        const result = StickRoyale.playCard(
            room.match,
            idx,
            data.cardId,
            Number(data.x),
            Number(data.y)
        );
        if (!result.ok) {
            socket.emit('sr:playDenied', { reason: result.reason, cardId: data.cardId });
            return;
        }
        broadcastState(io, room);
    });

    socket.on('sr:pickAugment', (data = {}) => {
        const room = rooms[socket.srRoom];
        if (!room || !room.match) return;
        const idx = playerIndex(room, socket.id);
        if (idx < 0) return;
        const result = StickRoyale.pickAugment(room.match, idx, data.unitId);
        if (!result.ok) {
            socket.emit('sr:pickDenied', { reason: result.reason });
            return;
        }
        broadcastState(io, room);
    });
}

function handleStickRoyaleDisconnect(socket, io, rooms) {
    const code = socket.srRoom;
    if (!code) return;
    const room = rooms[code];
    if (!room) return;

    const playerIdx = room.players.findIndex((p) => p.socketId === socket.id);
    if (playerIdx === -1) return;

    if (room.started) {
        io.to('sr:' + code).emit('sr:playerLeft', { playerIdx, name: room.players[playerIdx].name });
        room.players[playerIdx].disconnected = true;
        if (room.match && !room.match.ended) {
            if (room.mode === 'versus') {
                const winnerTeam = playerIdx === 0 ? 1 : 0;
                room.match.ended = true;
                room.match.phase = 'ended';
                room.match.winner = winnerTeam;
                room.match.winReason = 'disconnect';
                io.to('sr:' + code).emit('sr:gameOver', StickRoyale.getSnapshot(room.match));
                stopLoop(room);
            }
        }
        if (room.players.every((p) => p.disconnected)) {
            stopLoop(room);
            delete rooms[code];
        }
        return;
    }

    room.players.splice(playerIdx, 1);
    if (room.players.length === 0) {
        stopLoop(room);
        delete rooms[code];
        return;
    }
    if (room.hostId === socket.id) {
        room.hostId = room.players[0].socketId;
        room.players.forEach((p) => {
            p.isHost = p.socketId === room.hostId;
        });
    }
    io.to('sr:' + code).emit('sr:roomUpdate', {
        players: room.players,
        hostId: room.hostId,
        mode: room.mode
    });
}

module.exports = {
    attachStickRoyale,
    handleStickRoyaleDisconnect,
    SR_MAX_PLAYERS,
    TICK_HZ
};
