// ============================================
// BATTLESHIP MULTIPLAYER (Socket.IO)
// Mounted from server.js via mount(server)
// ============================================
const { Server: SocketServer } = require('socket.io');

const BS_GRID = 12;
const BS_FLEET = [
    { id: 'carrier', name: 'Carrier', size: 5 },
    { id: 'battleship', name: 'Battleship', size: 4 },
    { id: 'cruiser', name: 'Cruiser', size: 3 },
    { id: 'submarine', name: 'Submarine', size: 3 },
    { id: 'destroyer', name: 'Destroyer', size: 2 },
];
// Cooldown values = "usable every N own-turns". Sonar=2 → usable on own-turn 1, 3, 5...
// After use, cd is set to N. At end of each own-turn, cd decrements. Usable when cd <= 0.
const BS_COOLDOWNS = { sonar: 2, torpedo: 3, recon: 4, barrage: 5 };
const BS_BOMB_TURNS = 4; // bomb zone blocks ship movement for 4 of the defender's own turns

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = '';
    for (let i = 0; i < 5; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
}

function makeBoard() {
    return {
        ships: [],          // {id,name,size,cells:[{x,y}],orient,hits:Set<idx>}
        bombs: new Map(),   // "x,y" → own-turns remaining
        revealed: new Map(),// "x,y" → {type, ...} (this is what the OPPONENT sees about this board)
        cooldowns: { sonar: 0, torpedo: 0, recon: 0, barrage: 0 },
    };
}

function validatePlacement(submitted) {
    if (!Array.isArray(submitted) || submitted.length !== BS_FLEET.length) return null;
    const required = new Map(BS_FLEET.map(s => [s.id, s.size]));
    const occupied = new Set();
    const validated = [];
    for (const s of submitted) {
        const expectedSize = required.get(s.id);
        if (!expectedSize) return null;
        if (!Number.isInteger(s.x) || !Number.isInteger(s.y)) return null;
        if (s.orient !== 'h' && s.orient !== 'v') return null;
        const cells = [];
        for (let i = 0; i < expectedSize; i++) {
            const cx = s.x + (s.orient === 'h' ? i : 0);
            const cy = s.y + (s.orient === 'v' ? i : 0);
            if (cx < 0 || cx >= BS_GRID || cy < 0 || cy >= BS_GRID) return null;
            const key = `${cx},${cy}`;
            if (occupied.has(key)) return null;
            occupied.add(key);
            cells.push({ x: cx, y: cy });
        }
        const def = BS_FLEET.find(f => f.id === s.id);
        validated.push({
            id: s.id,
            name: def.name,
            size: expectedSize,
            cells,
            orient: s.orient,
            hits: new Set(),
        });
        required.delete(s.id);
    }
    if (required.size > 0) return null;
    return validated;
}

function findShipAt(board, x, y) {
    for (const ship of board.ships) {
        for (let i = 0; i < ship.cells.length; i++) {
            const c = ship.cells[i];
            if (c.x === x && c.y === y) return { ship, idx: i };
        }
    }
    return null;
}

function cellIsAlive(hit) {
    return !hit.ship.hits.has(hit.idx);
}

function isSunk(ship) {
    return ship.hits.size >= ship.size;
}

function allSunk(board) {
    return board.ships.length > 0 && board.ships.every(isSunk);
}

function nearestShipDistance(board, x, y) {
    let min = Infinity;
    let nearest = null;
    for (const ship of board.ships) {
        for (let i = 0; i < ship.cells.length; i++) {
            if (ship.hits.has(i)) continue;
            const c = ship.cells[i];
            const d = Math.max(Math.abs(c.x - x), Math.abs(c.y - y)); // Chebyshev
            if (d < min) { min = d; nearest = c; }
        }
    }
    return { distance: min, nearest };
}

function tierForDistance(d) {
    if (d === 0) return 'Burning';
    if (d === 1) return 'Burning';
    if (d === 2) return 'Warm';
    if (d <= 4) return 'Cold';
    return 'Freezing';
}

function compassDirection(fromX, fromY, toX, toY) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    if (dx === 0 && dy === 0) return 'HERE';
    // Atan2 with y growing downward. East = 0deg, South = 90deg.
    const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    // 8 sectors of 45deg, centered on cardinal/intercardinal points.
    // E=0, SE=45, S=90, SW=135, W=180, NW=225, N=270, NE=315
    const dirs = ['E','SE','S','SW','W','NW','N','NE'];
    const idx = Math.round(angle / 45) % 8;
    return dirs[idx];
}

function tickBombsForDefender(board) {
    for (const [key, turns] of board.bombs) {
        if (turns - 1 <= 0) board.bombs.delete(key);
        else board.bombs.set(key, turns - 1);
    }
}

function applyHit(room, attackerIdx, defenderBoard, x, y) {
    const found = findShipAt(defenderBoard, x, y);
    if (found && cellIsAlive(found)) {
        found.ship.hits.add(found.idx);
        defenderBoard.revealed.set(`${x},${y}`, { type: 'hit' });
        defenderBoard.bombs.set(`${x},${y}`, BS_BOMB_TURNS);
        return { hit: true, sunk: isSunk(found.ship), shipName: found.ship.name };
    } else {
        defenderBoard.revealed.set(`${x},${y}`, { type: 'miss' });
        defenderBoard.bombs.set(`${x},${y}`, BS_BOMB_TURNS);
        return { hit: false };
    }
}

function resolveAttack(room, attackerIdx, type, payload) {
    const defender = room.boards[1 - attackerIdx];
    const attacker = room.boards[attackerIdx];

    if (type === 'bomb') {
        const { x, y } = payload || {};
        if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x >= BS_GRID || y < 0 || y >= BS_GRID) {
            return { error: 'Bad coordinates' };
        }
        const h = applyHit(room, attackerIdx, defender, x, y);
        if (h.hit) {
            return { type: 'bomb', x, y, hit: true, sunk: h.sunk, shipName: h.shipName };
        }
        const { distance } = nearestShipDistance(defender, x, y);
        const tier = tierForDistance(distance);
        defender.revealed.set(`${x},${y}`, { type: 'miss', tier });
        return { type: 'bomb', x, y, hit: false, tier };
    }

    if (type === 'sonar') {
        if (attacker.cooldowns.sonar > 0) return { error: 'Sonar on cooldown' };
        const { x, y } = payload || {};
        if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x >= BS_GRID || y < 0 || y >= BS_GRID) {
            return { error: 'Bad coordinates' };
        }
        const { distance, nearest } = nearestShipDistance(defender, x, y);
        const tier = tierForDistance(distance);
        const direction = nearest ? compassDirection(x, y, nearest.x, nearest.y) : 'NONE';
        // Sonar ping is visible to defender (they see opponent pinged this cell)
        const existing = defender.revealed.get(`${x},${y}`);
        if (!existing || existing.type === 'recon-empty' || existing.type === 'recon-occ') {
            defender.revealed.set(`${x},${y}`, { type: 'sonar', tier, direction });
        }
        attacker.cooldowns.sonar = BS_COOLDOWNS.sonar;
        return { type: 'sonar', x, y, tier, direction };
    }

    if (type === 'torpedo') {
        if (attacker.cooldowns.torpedo > 0) return { error: 'Torpedo on cooldown' };
        const { axis, index, fromStart } = payload || {};
        if ((axis !== 'row' && axis !== 'col') || !Number.isInteger(index) || index < 0 || index >= BS_GRID) {
            return { error: 'Bad torpedo target' };
        }
        const order = [...Array(BS_GRID).keys()];
        if (!fromStart) order.reverse();
        let hitInfo = null;
        const pathCells = [];
        for (const i of order) {
            const c = axis === 'row' ? { x: i, y: index } : { x: index, y: i };
            pathCells.push(c);
            const found = findShipAt(defender, c.x, c.y);
            if (found && cellIsAlive(found)) {
                found.ship.hits.add(found.idx);
                defender.revealed.set(`${c.x},${c.y}`, { type: 'hit' });
                defender.bombs.set(`${c.x},${c.y}`, BS_BOMB_TURNS);
                hitInfo = { x: c.x, y: c.y, sunk: isSunk(found.ship), shipName: found.ship.name };
                break;
            }
        }
        attacker.cooldowns.torpedo = BS_COOLDOWNS.torpedo;
        return { type: 'torpedo', axis, index, fromStart, hit: hitInfo };
    }

    if (type === 'recon') {
        if (attacker.cooldowns.recon > 0) return { error: 'Recon on cooldown' };
        const { x, y } = payload || {};
        if (!Number.isInteger(x) || !Number.isInteger(y) || x < 1 || x >= BS_GRID - 1 || y < 1 || y >= BS_GRID - 1) {
            return { error: 'Recon must be 1 cell from edge' };
        }
        const cells = [];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const cx = x + dx, cy = y + dy;
                const found = findShipAt(defender, cx, cy);
                const occupied = found && cellIsAlive(found);
                const key = `${cx},${cy}`;
                const existing = defender.revealed.get(key);
                // Don't downgrade a hit/miss/sonar to a recon marker
                if (!existing || existing.type === 'recon-empty' || existing.type === 'recon-occ') {
                    defender.revealed.set(key, { type: occupied ? 'recon-occ' : 'recon-empty' });
                }
                cells.push({ x: cx, y: cy, occupied: !!occupied });
            }
        }
        attacker.cooldowns.recon = BS_COOLDOWNS.recon;
        return { type: 'recon', x, y, cells };
    }

    if (type === 'barrage') {
        if (attacker.cooldowns.barrage > 0) return { error: 'Barrage on cooldown' };
        const { x, y, orient } = payload || {};
        if (orient !== 'h' && orient !== 'v') return { error: 'Bad barrage orient' };
        if (!Number.isInteger(x) || !Number.isInteger(y)) return { error: 'Bad coordinates' };
        let cells;
        if (orient === 'h') {
            if (x < 1 || x >= BS_GRID - 1 || y < 0 || y >= BS_GRID) return { error: 'Out of bounds' };
            cells = [{ x: x - 1, y }, { x, y }, { x: x + 1, y }];
        } else {
            if (y < 1 || y >= BS_GRID - 1 || x < 0 || x >= BS_GRID) return { error: 'Out of bounds' };
            cells = [{ x, y: y - 1 }, { x, y }, { x, y: y + 1 }];
        }
        const results = [];
        for (const c of cells) {
            const found = findShipAt(defender, c.x, c.y);
            if (found && cellIsAlive(found)) {
                found.ship.hits.add(found.idx);
                defender.revealed.set(`${c.x},${c.y}`, { type: 'hit' });
                defender.bombs.set(`${c.x},${c.y}`, BS_BOMB_TURNS);
                results.push({ x: c.x, y: c.y, hit: true, sunk: isSunk(found.ship), shipName: found.ship.name });
            } else {
                defender.revealed.set(`${c.x},${c.y}`, { type: 'miss' });
                defender.bombs.set(`${c.x},${c.y}`, BS_BOMB_TURNS);
                results.push({ x: c.x, y: c.y, hit: false });
            }
        }
        attacker.cooldowns.barrage = BS_COOLDOWNS.barrage;
        return { type: 'barrage', x, y, orient, cells: results };
    }

    return { error: 'Unknown attack type' };
}

function moveShip(room, playerIdx, shipId, dx, dy) {
    if (Math.abs(dx) + Math.abs(dy) !== 1) return { error: 'Must move exactly 1 cell orthogonally' };
    const board = room.boards[playerIdx];
    const ship = board.ships.find(s => s.id === shipId);
    if (!ship) return { error: 'Ship not found' };
    if (isSunk(ship)) return { error: 'Cannot move a sunk ship' };

    const newCells = ship.cells.map(c => ({ x: c.x + dx, y: c.y + dy }));
    const myOldKeys = new Set(ship.cells.map(c => `${c.x},${c.y}`));
    const otherShipCells = new Set();
    for (const s of board.ships) {
        if (s.id === ship.id) continue;
        for (const c of s.cells) otherShipCells.add(`${c.x},${c.y}`);
    }
    for (const c of newCells) {
        if (c.x < 0 || c.x >= BS_GRID || c.y < 0 || c.y >= BS_GRID) return { error: 'Out of bounds' };
        if (board.bombs.has(`${c.x},${c.y}`)) return { error: 'That cell is a bombed zone' };
        if (otherShipCells.has(`${c.x},${c.y}`)) return { error: 'Would overlap another ship' };
    }
    ship.cells = newCells;
    return { success: true };
}

function viewForPlayer(room, idx) {
    if (idx < 0 || idx > 1) return null;
    const me = room.boards[idx];
    const enemy = room.boards[1 - idx];
    // What I see on my own waters: full ship layout, my bombs (with countdown), and what the OPPONENT sees on me (revealed) — useful to know they've spotted me there
    const myBoardView = {
        ships: me.ships.map(s => ({
            id: s.id, name: s.name, size: s.size, orient: s.orient,
            cells: s.cells,
            hitCells: Array.from(s.hits).map(i => s.cells[i]),
            sunk: isSunk(s),
        })),
        bombs: Array.from(me.bombs.entries()).map(([k, t]) => {
            const [x, y] = k.split(',').map(Number); return { x, y, turnsLeft: t };
        }),
        // Cells that the opponent has revealed about me (sonar pings they used on me — useful intel)
        opponentPings: Array.from(me.revealed.entries())
            .filter(([k, v]) => v.type === 'sonar')
            .map(([k, v]) => { const [x, y] = k.split(',').map(Number); return { x, y, tier: v.tier, direction: v.direction }; }),
        cooldowns: { ...me.cooldowns },
    };
    // What I see on enemy waters: only what I've revealed via my attacks
    const enemyBoardView = {
        revealed: Array.from(enemy.revealed.entries()).map(([k, v]) => {
            const [x, y] = k.split(',').map(Number); return { x, y, ...v };
        }),
        // Reveal sunk ships fully so attacker sees the silhouette
        sunkShips: enemy.ships.filter(isSunk).map(s => ({ id: s.id, name: s.name, size: s.size, cells: s.cells, orient: s.orient })),
        shipsTotal: enemy.ships.length,
        shipsRemaining: enemy.ships.filter(s => !isSunk(s)).length,
    };
    return {
        phase: room.phase,
        turn: room.turn,
        myIdx: idx,
        myName: room.players[idx]?.name || 'You',
        opponentName: room.players[1 - idx]?.name || 'Opponent',
        opponentConnected: !!room.players[1 - idx],
        placementReady: [...room.placementReady],
        turnState: room.turnState ? { ...room.turnState } : null,
        myBoard: myBoardView,
        enemyBoard: enemyBoardView,
        log: room.log.slice(-25),
        winner: room.winner,
        cooldownConfig: BS_COOLDOWNS,
        gridSize: BS_GRID,
        fleet: BS_FLEET,
    };
}

function broadcast(io, room) {
    for (let i = 0; i < 2; i++) {
        const sid = room.players[i]?.socketId;
        if (sid) io.to(sid).emit('bs:state', viewForPlayer(room, i));
    }
}

function mount(server) {
    const io = new SocketServer(server, {
        path: '/battleship-mp',
        cors: { origin: '*', methods: ['GET', 'POST'] },
        pingInterval: 10000,
        pingTimeout: 5000,
    });

    const rooms = new Map();

    io.on('connection', (socket) => {
        console.log(`[Battleship] connected: ${socket.id}`);
        let currentRoom = null;
        let myIdx = -1;

        function getRoom() { return currentRoom ? rooms.get(currentRoom) : null; }

        socket.on('bs:create', (data, cb) => {
            cb = typeof cb === 'function' ? cb : () => {};
            const code = generateRoomCode();
            const room = {
                code,
                players: [{ socketId: socket.id, name: (data?.name || 'Player 1').slice(0, 20) }, null],
                boards: [makeBoard(), makeBoard()],
                phase: 'placement',
                turn: Math.random() < 0.5 ? 0 : 1,
                placementReady: [false, false],
                turnState: null,
                winner: null,
                createdAt: Date.now(),
                log: [{ type: 'system', msg: 'Room created. Waiting for opponent...' }],
            };
            rooms.set(code, room);
            socket.join(code);
            currentRoom = code;
            myIdx = 0;
            cb({ success: true, code, myIdx: 0 });
            broadcast(io, room);
        });

        socket.on('bs:join', (data, cb) => {
            cb = typeof cb === 'function' ? cb : () => {};
            const code = (data?.code || '').toUpperCase();
            const room = rooms.get(code);
            if (!room) return cb({ error: 'Room not found' });
            if (room.players[0] && room.players[1]) return cb({ error: 'Room is full' });
            const slot = room.players[0] ? 1 : 0;
            room.players[slot] = { socketId: socket.id, name: (data?.name || 'Player 2').slice(0, 20) };
            socket.join(code);
            currentRoom = code;
            myIdx = slot;
            room.log.push({ type: 'system', msg: `${room.players[slot].name} joined. Place your fleet!` });
            cb({ success: true, code, myIdx: slot });
            broadcast(io, room);
        });

        socket.on('bs:place', (data, cb) => {
            cb = typeof cb === 'function' ? cb : () => {};
            const room = getRoom();
            if (!room) return cb({ error: 'Not in room' });
            if (room.phase !== 'placement') return cb({ error: 'Not in placement phase' });
            const ships = validatePlacement(data?.ships);
            if (!ships) return cb({ error: 'Invalid placement' });
            room.boards[myIdx].ships = ships;
            room.placementReady[myIdx] = true;
            room.log.push({ type: 'system', msg: `${room.players[myIdx].name} is ready.` });
            if (room.placementReady[0] && room.placementReady[1]) {
                room.phase = 'battle';
                room.log.push({ type: 'system', msg: `Battle begins! ${room.players[room.turn].name} goes first.` });
            }
            cb({ success: true });
            broadcast(io, room);
        });

        socket.on('bs:attack', (data, cb) => {
            cb = typeof cb === 'function' ? cb : () => {};
            const room = getRoom();
            if (!room) return cb({ error: 'Not in room' });
            if (room.phase !== 'battle') return cb({ error: 'Not in battle phase' });
            if (room.turn !== myIdx) return cb({ error: 'Not your turn' });
            if (room.turnState && room.turnState.attacked) return cb({ error: 'Already attacked this turn' });
            const result = resolveAttack(room, myIdx, data?.type, data);
            if (result.error) return cb(result);
            room.turnState = { attacked: true, moved: false, attackType: data.type };
            room.log.push({ type: 'attack', who: room.players[myIdx].name, msg: describeAttack(data.type, result) });
            if (allSunk(room.boards[1 - myIdx])) {
                room.phase = 'ended';
                room.winner = myIdx;
                room.log.push({ type: 'system', msg: `${room.players[myIdx].name} wins!` });
            }
            cb({ success: true, result });
            broadcast(io, room);
        });

        socket.on('bs:move', (data, cb) => {
            cb = typeof cb === 'function' ? cb : () => {};
            const room = getRoom();
            if (!room) return cb({ error: 'Not in room' });
            if (room.phase !== 'battle') return cb({ error: 'Not in battle phase' });
            if (room.turn !== myIdx) return cb({ error: 'Not your turn' });
            if (!room.turnState || !room.turnState.attacked) return cb({ error: 'Attack before moving' });
            if (room.turnState.moved) return cb({ error: 'Already moved this turn' });
            const r = moveShip(room, myIdx, data?.shipId, data?.dx | 0, data?.dy | 0);
            if (r.error) return cb(r);
            room.turnState.moved = true;
            const ship = room.boards[myIdx].ships.find(s => s.id === data.shipId);
            room.log.push({ type: 'move', who: room.players[myIdx].name, msg: `moved ${ship?.name || 'ship'}` });
            cb({ success: true });
            broadcast(io, room);
        });

        socket.on('bs:end-turn', (data, cb) => {
            cb = typeof cb === 'function' ? cb : () => {};
            const room = getRoom();
            if (!room) return cb({ error: 'Not in room' });
            if (room.phase !== 'battle') return cb({ error: 'Not in battle phase' });
            if (room.turn !== myIdx) return cb({ error: 'Not your turn' });
            if (!room.turnState || !room.turnState.attacked) return cb({ error: 'Must attack before ending turn' });
            // Decrement cooldowns of the player ending their turn (ticks one own-turn)
            const mb = room.boards[myIdx];
            for (const k of Object.keys(mb.cooldowns)) {
                if (mb.cooldowns[k] > 0) mb.cooldowns[k]--;
            }
            // Switch turn
            room.turn = 1 - myIdx;
            room.turnState = null;
            // Tick bombs for the player whose turn is starting (their movement restriction clears down)
            tickBombsForDefender(room.boards[room.turn]);
            cb({ success: true });
            broadcast(io, room);
        });

        socket.on('bs:chat', (data) => {
            const room = getRoom();
            if (!room) return;
            const msg = (data?.msg || '').slice(0, 200);
            if (!msg) return;
            room.log.push({ type: 'chat', who: room.players[myIdx]?.name || '?', msg });
            broadcast(io, room);
        });

        socket.on('bs:leave', () => {
            handleLeave();
        });

        socket.on('disconnect', () => {
            console.log(`[Battleship] disconnected: ${socket.id}`);
            handleLeave();
        });

        function handleLeave() {
            const room = getRoom();
            if (!room) return;
            if (room.players[myIdx]) room.players[myIdx] = null;
            socket.leave(currentRoom);
            if (!room.players[0] && !room.players[1]) {
                rooms.delete(currentRoom);
            } else {
                if (room.phase === 'battle' || room.phase === 'placement') {
                    room.phase = 'ended';
                    room.winner = 1 - myIdx;
                    room.log.push({ type: 'system', msg: 'Opponent left — you win by forfeit.' });
                    broadcast(io, room);
                }
            }
            currentRoom = null;
            myIdx = -1;
        }
    });

    // Cleanup stale rooms every 5 min
    setInterval(() => {
        const now = Date.now();
        for (const [code, room] of rooms) {
            const empty = !room.players[0] && !room.players[1];
            const old = now - room.createdAt > 6 * 60 * 60 * 1000;
            if (empty || old) rooms.delete(code);
        }
    }, 5 * 60 * 1000);

    console.log('   🚢 Battleship Multiplayer: Socket.IO on /battleship-mp');
    return io;
}

function describeAttack(type, result) {
    if (type === 'bomb') {
        if (result.hit) return `bomb (${result.x},${result.y}) HIT${result.sunk ? ` — SUNK ${result.shipName}!` : ''}`;
        return `bomb (${result.x},${result.y}) MISS — ${result.tier}`;
    }
    if (type === 'sonar') return `sonar (${result.x},${result.y}) → ${result.tier}, ${result.direction}`;
    if (type === 'torpedo') {
        if (result.hit) return `torpedo ${result.axis} ${result.index} → HIT (${result.hit.x},${result.hit.y})${result.hit.sunk ? ` — SUNK ${result.hit.shipName}!` : ''}`;
        return `torpedo ${result.axis} ${result.index} → no contact`;
    }
    if (type === 'recon') {
        const occ = result.cells.filter(c => c.occupied).length;
        return `recon (${result.x},${result.y}) → ${occ}/9 occupied`;
    }
    if (type === 'barrage') {
        const hits = result.cells.filter(c => c.hit).length;
        return `barrage (${result.x},${result.y}) ${result.orient} → ${hits}/3 hits`;
    }
    return type;
}

module.exports = { mount };
