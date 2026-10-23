const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { Server } = require('socket.io');
const { io: Client } = require('socket.io-client');
const { attachRealtyRush, handleRealtyRushDisconnect, RR_MAX_PLAYERS } = require('./realtyrush');

function once(socket, event, timeoutMs = 2000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            socket.off(event, onEvent);
            reject(new Error(`Timed out waiting for ${event}`));
        }, timeoutMs);
        function onEvent(data) {
            clearTimeout(timer);
            resolve(data);
        }
        socket.once(event, onEvent);
    });
}

function connectClient(url) {
    return new Promise((resolve, reject) => {
        const socket = Client(url, { transports: ['websocket'], forceNew: true });
        socket.once('connect', () => resolve(socket));
        socket.once('connect_error', reject);
    });
}

async function startHarness() {
    const rooms = {};
    const httpServer = http.createServer();
    const io = new Server(httpServer, { cors: { origin: '*' } });
    io.on('connection', (socket) => {
        attachRealtyRush(socket, io, rooms);
        socket.on('disconnect', () => handleRealtyRushDisconnect(socket, io, rooms));
    });
    await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
    const port = httpServer.address().port;
    return {
        rooms,
        io,
        httpServer,
        url: `http://127.0.0.1:${port}`,
        async close() {
            io.close();
            await new Promise((resolve) => httpServer.close(resolve));
        }
    };
}

test('createRoom emits a shareable room code and host player', async () => {
    const harness = await startHarness();
    const host = await connectClient(harness.url);
    try {
        const created = once(host, 'rr:roomCreated');
        host.emit('rr:createRoom', { name: 'Michael' });
        const data = await created;
        assert.match(data.code, /^[A-Z0-9]{6}$/);
        assert.equal(data.players.length, 1);
        assert.equal(data.players[0].name, 'Michael');
        assert.equal(data.players[0].isHost, true);
        assert.equal(data.players[0].socketId, host.id);
        assert.ok(harness.rooms[data.code]);
    } finally {
        host.disconnect();
        await harness.close();
    }
});

test('second client can join with the room code', async () => {
    const harness = await startHarness();
    const host = await connectClient(harness.url);
    const joiner = await connectClient(harness.url);
    try {
        const created = once(host, 'rr:roomCreated');
        host.emit('rr:createRoom', { name: 'Host' });
        const { code } = await created;

        const joined = once(joiner, 'rr:roomJoined');
        const hostUpdate = once(host, 'rr:roomUpdate');
        joiner.emit('rr:joinRoom', { code, name: 'Joiner' });

        const joinData = await joined;
        const update = await hostUpdate;
        assert.equal(joinData.code, code);
        assert.equal(joinData.hostId, host.id);
        assert.equal(joinData.players.length, 2);
        assert.equal(joinData.players[1].name, 'Joiner');
        assert.equal(joinData.players[1].socketId, joiner.id);
        assert.equal(update.players.length, 2);
        assert.equal(update.hostId, host.id);
    } finally {
        host.disconnect();
        joiner.disconnect();
        await harness.close();
    }
});

test('join missing room emits rr:error', async () => {
    const harness = await startHarness();
    const joiner = await connectClient(harness.url);
    try {
        const err = once(joiner, 'rr:error');
        joiner.emit('rr:joinRoom', { code: 'NOPEZZ', name: 'Lost' });
        const data = await err;
        assert.equal(data.msg, 'Room not found');
    } finally {
        joiner.disconnect();
        await harness.close();
    }
});

test('startGame broadcasts to host and joiner', async () => {
    const harness = await startHarness();
    const host = await connectClient(harness.url);
    const joiner = await connectClient(harness.url);
    try {
        const created = once(host, 'rr:roomCreated');
        host.emit('rr:createRoom', { name: 'Host' });
        const { code } = await created;
        const joined = once(joiner, 'rr:roomJoined');
        joiner.emit('rr:joinRoom', { code, name: 'Joiner' });
        await joined;

        const hostStart = once(host, 'rr:gameStart');
        const joinStart = once(joiner, 'rr:gameStart');
        host.emit('rr:startGame', { mode: 'quick', targetNetWorth: 250000, seed: 42 });
        const [a, b] = await Promise.all([hostStart, joinStart]);
        assert.equal(a.mode, 'quick');
        assert.equal(a.targetNetWorth, 250000);
        assert.equal(a.seed, 42);
        assert.equal(a.players.length, 2);
        assert.equal(b.players[1].socketId, joiner.id);
        assert.equal(harness.rooms[code].started, true);
    } finally {
        host.disconnect();
        joiner.disconnect();
        await harness.close();
    }
});

test('in-game events relay to the other client', async () => {
    const harness = await startHarness();
    const host = await connectClient(harness.url);
    const joiner = await connectClient(harness.url);
    try {
        const created = once(host, 'rr:roomCreated');
        host.emit('rr:createRoom', { name: 'Host' });
        const { code } = await created;
        const joined = once(joiner, 'rr:roomJoined');
        joiner.emit('rr:joinRoom', { code, name: 'Joiner' });
        await joined;

        const rolled = once(joiner, 'rr:rolled');
        host.emit('rr:rolled', { roll: 8, playerIdx: 0, roomCode: code });
        const data = await rolled;
        assert.equal(data.roll, 8);
        assert.equal(data.playerIdx, 0);
    } finally {
        host.disconnect();
        joiner.disconnect();
        await harness.close();
    }
});

test('room rejects a seventh player', async () => {
    const harness = await startHarness();
    const clients = [];
    try {
        const host = await connectClient(harness.url);
        clients.push(host);
        const created = once(host, 'rr:roomCreated');
        host.emit('rr:createRoom', { name: 'P1' });
        const { code } = await created;

        for (let i = 2; i <= RR_MAX_PLAYERS; i++) {
            const c = await connectClient(harness.url);
            clients.push(c);
            const joined = once(c, 'rr:roomJoined');
            c.emit('rr:joinRoom', { code, name: 'P' + i });
            await joined;
        }

        const extra = await connectClient(harness.url);
        clients.push(extra);
        const err = once(extra, 'rr:error');
        extra.emit('rr:joinRoom', { code, name: 'P7' });
        const data = await err;
        assert.equal(data.msg, 'Room full');
    } finally {
        for (const c of clients) c.disconnect();
        await harness.close();
    }
});
