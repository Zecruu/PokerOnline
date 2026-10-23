// RealtyRush multiplayer rooms (Socket.IO)
// Client in games/realtyrush + hub/public/games/realtyrush emits rr:* events.

const RR_MAX_PLAYERS = 6;
const RR_RELAY_EVENTS = [
    'rr:rolled',
    'rr:action',
    'rr:endTurn',
    'rr:stateSync',
    'rr:stockTrade',
    'rr:auctionBid',
    'rr:auctionPass',
    'rr:cartelPlayed'
];

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

function attachRealtyRush(socket, io, rooms) {
    socket.on('rr:createRoom', (data = {}) => {
        const code = generateUniqueCode(rooms);
        const player = makePlayer(socket, data && data.name, true);
        rooms[code] = {
            code,
            hostId: socket.id,
            players: [player],
            started: false
        };
        socket.rrRoom = code;
        socket.join('rr:' + code);
        socket.emit('rr:roomCreated', { code, players: [player] });
        console.log(`🏠 RR Room ${code} created by ${player.name}`);
    });

    socket.on('rr:joinRoom', (data = {}) => {
        const code = String((data && data.code) || '').trim().toUpperCase();
        const room = rooms[code];
        if (!room) return socket.emit('rr:error', { msg: 'Room not found' });
        if (room.started) return socket.emit('rr:error', { msg: 'Game already started' });
        if (room.players.length >= RR_MAX_PLAYERS) return socket.emit('rr:error', { msg: 'Room full' });
        if (room.players.some(p => p.socketId === socket.id)) return;

        const player = makePlayer(socket, data && data.name, false);
        room.players.push(player);
        socket.rrRoom = code;
        socket.join('rr:' + code);
        socket.emit('rr:roomJoined', { code, hostId: room.hostId, players: room.players });
        socket.to('rr:' + code).emit('rr:roomUpdate', {
            players: room.players,
            hostId: room.hostId
        });
        console.log(`🏠 ${player.name} joined RR room ${code}`);
    });

    socket.on('rr:setMode', (data = {}) => {
        const room = rooms[socket.rrRoom];
        if (!room || room.hostId !== socket.id) return;
        const mode = data && data.mode;
        if (!mode) return;
        room.mode = mode;
        socket.to('rr:' + socket.rrRoom).emit('rr:modeChanged', { mode });
    });

    socket.on('rr:startGame', (data = {}) => {
        const room = rooms[socket.rrRoom];
        if (!room || room.hostId !== socket.id || room.started) return;
        if (room.players.length < 2) return;
        room.started = true;
        io.to('rr:' + socket.rrRoom).emit('rr:gameStart', {
            mode: (data && data.mode) || room.mode || 'quick',
            targetNetWorth: (data && data.targetNetWorth) || 500000,
            seed: data && data.seed,
            players: room.players
        });
        console.log(`🏠 RR Room ${socket.rrRoom} started (${room.players.length} players)`);
    });

    for (const event of RR_RELAY_EVENTS) {
        socket.on(event, (payload = {}) => {
            if (!socket.rrRoom) return;
            socket.to('rr:' + socket.rrRoom).emit(event, payload);
        });
    }
}

function handleRealtyRushDisconnect(socket, io, rooms) {
    const code = socket.rrRoom;
    if (!code) return;
    const room = rooms[code];
    if (!room) return;

    const playerIdx = room.players.findIndex(p => p.socketId === socket.id);
    if (playerIdx === -1) return;

    if (room.started) {
        io.to('rr:' + code).emit('rr:playerLeft', { playerIdx });
        room.players[playerIdx].disconnected = true;
        if (room.players.every(p => p.disconnected)) delete rooms[code];
        return;
    }

    room.players.splice(playerIdx, 1);
    if (room.players.length === 0) {
        delete rooms[code];
        return;
    }
    if (room.hostId === socket.id) {
        room.hostId = room.players[0].socketId;
        room.players.forEach(p => {
            p.isHost = p.socketId === room.hostId;
        });
    }
    io.to('rr:' + code).emit('rr:roomUpdate', {
        players: room.players,
        hostId: room.hostId
    });
}

module.exports = {
    attachRealtyRush,
    handleRealtyRushDisconnect,
    RR_MAX_PLAYERS
};
