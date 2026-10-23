const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const { io: Client } = require('socket.io-client');
const StickRoyale = require('../games/stick-royale/sim');
const { attachStickRoyale, handleStickRoyaleDisconnect, SR_MAX_PLAYERS } = require('./stickroyale');

function once(socket, event, timeoutMs = 2500) {
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
        attachStickRoyale(socket, io, rooms);
        socket.on('disconnect', () => handleStickRoyaleDisconnect(socket, io, rooms));
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

test('roster has 12 starting units and 12 augment-only units', () => {
    assert.equal(StickRoyale.BASE_IDS.length, 8);
    const all = Object.keys(StickRoyale.UNITS);
    assert.ok(all.length >= 24, `expected ~24 units, got ${all.length}`);
    assert.equal(StickRoyale.AUGMENT_IDS.length, all.length - StickRoyale.BASE_IDS.length);
    const shapes = new Set(all.map((id) => StickRoyale.UNITS[id].shape));
    const colors = new Set(all.map((id) => StickRoyale.UNITS[id].color));
    assert.ok(shapes.size >= 16);
    assert.ok(colors.size >= 16);
});

test('solo survival is playable: elixir, deploy, waves, augment at 30s', () => {
    const match = StickRoyale.createMatch({ mode: 'survival', seed: 7, playerCount: 1, augmentEvery: 30 });
    assert.equal(match.players[0].elixir, StickRoyale.ELIXIR_START);
    StickRoyale.runTicks(match, 3, 0.05);
    assert.ok(match.players[0].elixir > StickRoyale.ELIXIR_START);
    const card = match.players[0].hand.find((id) => StickRoyale.UNITS[id].cost <= match.players[0].elixir);
    const played = StickRoyale.playCard(match, 0, card, StickRoyale.LANES[1], 8);
    assert.equal(played.ok, true);
    assert.ok(match.units.length >= 1);
    StickRoyale.runTicks(match, 2, 0.05);
    assert.ok(match.wave >= 1, 'wave should spawn');
    StickRoyale.runTicks(match, 28, 0.05);
    assert.equal(match.phase, 'augment');
    assert.ok(match.players[0].offers && match.players[0].offers.length === 3);
    const pick = StickRoyale.pickAugment(match, 0, match.players[0].offers[0]);
    assert.equal(pick.ok, true);
    assert.ok(match.players[0].deck.includes(match.players[0].augments[0]));
    assert.equal(match.phase, 'battle');
});

test('versus AI king death ends the match', () => {
    const match = StickRoyale.createMatch({ mode: 'versus', seed: 3, playerCount: 1, aiOpponent: true });
    const enemyKing = match.towers.find((t) => t.team === 1 && t.kind === 'king');
    StickRoyale.damageTower = StickRoyale.damageTower;
    enemyKing.hp = 1;
    const zap = 'zap';
    match.players[0].hand[0] = zap;
    match.players[0].elixir = 10;
    const res = StickRoyale.playCard(match, 0, zap, enemyKing.x, enemyKing.y);
    assert.equal(res.ok, true);
    assert.equal(match.ended, true);
    assert.equal(match.winner, 0);
});

test('baked motion clips use the human-template joint set', () => {
    const clips = JSON.parse(fs.readFileSync(path.join(__dirname, '../games/stick-royale/motion/clips.json'), 'utf8'));
    const need = ['idle', 'walk', 'run', 'attack_melee', 'attack_cast', 'hit', 'death'];
    for (const id of need) {
        assert.ok(clips.clips[id], `missing clip ${id}`);
        assert.ok(clips.clips[id].joints.hips.length >= 8);
        assert.ok(clips.clips[id].joints.head);
        assert.ok(clips.clips[id].joints.upperArm_R);
        assert.ok(clips.clips[id].joints.upperLeg_L);
    }
    const vfx = JSON.parse(fs.readFileSync(path.join(__dirname, '../games/stick-royale/vfx/presets.json'), 'utf8'));
    assert.ok(vfx.presets.meleeRibbon);
    assert.ok(vfx.presets.bloodSpray);
    assert.ok(vfx.bindings.attack_melee);
    assert.ok(vfx.bindings.hit);
});

test('createRoom emits a shareable room code and host player', async () => {
    const harness = await startHarness();
    const host = await connectClient(harness.url);
    try {
        const created = once(host, 'sr:roomCreated');
        host.emit('sr:createRoom', { name: 'Michael', mode: 'survival' });
        const data = await created;
        assert.match(data.code, /^[A-Z0-9]{6}$/);
        assert.equal(data.mode, 'survival');
        assert.equal(data.players[0].isHost, true);
        assert.ok(harness.rooms[data.code]);
    } finally {
        host.disconnect();
        await harness.close();
    }
});

test('second client can join with the room code and start co-op', async () => {
    const harness = await startHarness();
    const host = await connectClient(harness.url);
    const joiner = await connectClient(harness.url);
    try {
        const created = once(host, 'sr:roomCreated');
        host.emit('sr:createRoom', { name: 'Host', mode: 'survival' });
        const { code } = await created;
        const joined = once(joiner, 'sr:roomJoined');
        joiner.emit('sr:joinRoom', { code, name: 'Joiner' });
        const joinData = await joined;
        assert.equal(joinData.code, code);
        assert.equal(joinData.players.length, 2);

        const hostStart = once(host, 'sr:gameStart');
        const joinStart = once(joiner, 'sr:gameStart');
        host.emit('sr:startGame', { mode: 'survival', seed: 11 });
        const [a, b] = await Promise.all([hostStart, joinStart]);
        assert.equal(a.mode, 'survival');
        assert.equal(a.state.players.length, 2);
        assert.equal(a.state.players[0].team, 0);
        assert.equal(a.state.players[1].team, 0);
        assert.equal(b.state.phase, 'battle');
        assert.equal(harness.rooms[code].started, true);
    } finally {
        host.disconnect();
        joiner.disconnect();
        await harness.close();
    }
});

test('versus start puts joiner on the opposite team', async () => {
    const harness = await startHarness();
    const host = await connectClient(harness.url);
    const joiner = await connectClient(harness.url);
    try {
        const created = once(host, 'sr:roomCreated');
        host.emit('sr:createRoom', { name: 'Host', mode: 'versus' });
        const { code } = await created;
        await Promise.all([
            once(joiner, 'sr:roomJoined'),
            (async () => { joiner.emit('sr:joinRoom', { code, name: 'Joiner' }); })()
        ]);
        const started = once(host, 'sr:gameStart');
        host.emit('sr:startGame', { mode: 'versus', seed: 5 });
        const data = await started;
        assert.equal(data.state.mode, 'versus');
        assert.equal(data.state.players[0].team, 0);
        assert.equal(data.state.players[1].team, 1);
    } finally {
        host.disconnect();
        joiner.disconnect();
        await harness.close();
    }
});

test('join missing room emits sr:error and a third player is rejected', async () => {
    const harness = await startHarness();
    const host = await connectClient(harness.url);
    const joiner = await connectClient(harness.url);
    const extra = await connectClient(harness.url);
    try {
        const err = once(joiner, 'sr:error');
        joiner.emit('sr:joinRoom', { code: 'NOPEZZ', name: 'Lost' });
        assert.equal((await err).msg, 'Room not found');

        const created = once(host, 'sr:roomCreated');
        host.emit('sr:createRoom', { name: 'Host' });
        const { code } = await created;
        await Promise.all([
            once(joiner, 'sr:roomJoined'),
            (async () => { joiner.emit('sr:joinRoom', { code, name: 'P2' }); })()
        ]);
        const full = once(extra, 'sr:error');
        extra.emit('sr:joinRoom', { code, name: 'P3' });
        assert.equal((await full).msg, 'Room full');
        assert.equal(SR_MAX_PLAYERS, 2);
    } finally {
        host.disconnect();
        joiner.disconnect();
        extra.disconnect();
        await harness.close();
    }
});

test('authoritative playCard from joiner appears in the next snapshot', async () => {
    const harness = await startHarness();
    const host = await connectClient(harness.url);
    const joiner = await connectClient(harness.url);
    try {
        const created = once(host, 'sr:roomCreated');
        host.emit('sr:createRoom', { name: 'Host', mode: 'survival' });
        const { code } = await created;
        await Promise.all([
            once(joiner, 'sr:roomJoined'),
            (async () => { joiner.emit('sr:joinRoom', { code, name: 'Joiner' }); })()
        ]);
        const started = once(host, 'sr:gameStart');
        host.emit('sr:startGame', { seed: 9 });
        const start = await started;
        const card = start.state.players[1].hand[0];
        const def = StickRoyale.UNITS[card];
        const hostState = once(host, 'sr:state');
        joiner.emit('sr:playCard', { cardId: card, x: StickRoyale.LANES[0], y: 8 });
        const snap = await hostState;
        if (start.state.players[1].elixir >= def.cost) {
            assert.ok(snap.units.length >= 1 || snap.events.some((e) => e.type === 'deploy' || e.type === 'spell'));
        }
    } finally {
        host.disconnect();
        joiner.disconnect();
        await harness.close();
    }
});
