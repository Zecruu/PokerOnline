// ============================================
// TACTICAL WATERS — Client
// ============================================
const GRID = 12;
const FLEET = [
    { id: 'carrier', name: 'Carrier', size: 5 },
    { id: 'battleship', name: 'Battleship', size: 4 },
    { id: 'cruiser', name: 'Cruiser', size: 3 },
    { id: 'submarine', name: 'Submarine', size: 3 },
    { id: 'destroyer', name: 'Destroyer', size: 2 },
];

const socket = io({ path: '/battleship-mp' });

// Stable per-device identity so the server can reattach us to our slot when
// the WebSocket drops (mobile background, network blip). Generated once and
// kept in localStorage; survives reloads.
const CLIENT_ID = (() => {
    try {
        let id = localStorage.getItem('bs_client_id');
        if (!id) {
            id = 'cli_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
            localStorage.setItem('bs_client_id', id);
        }
        return id;
    } catch {
        return 'cli_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
})();

function rememberRoom(code) { try { localStorage.setItem('bs_room_code', code); } catch {} }
function forgetRoom()       { try { localStorage.removeItem('bs_room_code'); } catch {} }
function recalledRoom()     { try { return localStorage.getItem('bs_room_code'); } catch { return null; } }

// =========== STATE ============
let state = {
    screen: 'lobby',
    code: null,
    myIdx: -1,
    // placement state (local only until ready)
    placement: {
        ships: new Map(), // id -> { x, y, orient, cells: [{x,y}] } once placed
        selectedShipId: null,
        selectedOrient: 'h',
    },
    // battle UI state (local only)
    ui: {
        selectedAttack: null,
        moveMode: false,
        moveShipId: null,
    },
    // last known server state
    server: null,
};

// =========== SCREEN MGMT ============
function showScreen(name) {
    state.screen = name;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + name)?.classList.add('active');
}

// =========== HELPERS ============
function $(id) { return document.getElementById(id); }
function key(x, y) { return x + ',' + y; }

function shipCells(x, y, orient, size) {
    const cells = [];
    for (let i = 0; i < size; i++) {
        cells.push({ x: x + (orient === 'h' ? i : 0), y: y + (orient === 'v' ? i : 0) });
    }
    return cells;
}

function inBounds(x, y) { return x >= 0 && x < GRID && y >= 0 && y < GRID; }

// =========== SHIP SPRITE OVERLAY ============
// Natural aspect ratio (w/h) of each alpha-trimmed ship sprite.
// If tools/downscale-ships.js is rerun and the sprites change shape, update these.
const SHIP_ASPECTS = {
    carrier:    492 / 187,
    battleship: 508 / 94,
    cruiser:    490 / 101,
    submarine:  512 / 124,
    destroyer:  500 / 106,
};
const _shipObserved = new WeakSet();

function renderShipOverlay(grid, ships) {
    let overlay = grid.querySelector('.ship-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'ship-overlay';
        grid.appendChild(overlay);
    }
    overlay._ships = ships;
    if (!_shipObserved.has(grid) && typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(() => positionShipImages(grid));
        ro.observe(grid);
        _shipObserved.add(grid);
    }
    positionShipImages(grid);
}

// CSS grid gap between cells. Must match .grid { gap: 1px } in battleship.css.
const GRID_GAP_PX = 1;

// Per-grid memory of which cells we've already shown the fire burst for.
// Without this, the burst would replay every server-state render (cells rebuild on each render).
const _knownHits = new Map(); // gridDomId -> Set<"x,y">

function maybeBurst(gridDomId, cell, x, y) {
    let known = _knownHits.get(gridDomId);
    if (!known) { known = new Set(); _knownHits.set(gridDomId, known); }
    const k = key(x, y);
    if (known.has(k)) return;
    known.add(k);
    cell.classList.add('hit-burst');
    setTimeout(() => cell.classList.remove('hit-burst'), 750);
}

function resetKnownHits() {
    _knownHits.clear();
}

function positionShipImages(grid) {
    const overlay = grid.querySelector('.ship-overlay');
    if (!overlay) return;
    const ships = overlay._ships || [];
    overlay.innerHTML = '';

    // Overlay fills the grid's padding-box exactly, same coordinate system as the cells.
    // Total inner width = 12 cells + 11 gaps, so cell size and stride must compensate.
    const innerW = overlay.clientWidth;
    if (innerW <= 0) return;
    const cellSize = (innerW - (GRID - 1) * GRID_GAP_PX) / GRID;
    const stride = cellSize + GRID_GAP_PX;
    if (cellSize <= 0) return;

    for (const ship of ships) {
        if (!ship.cells || ship.cells.length === 0) continue;
        const horiz = ship.orient === 'h';
        const len = ship.cells.length;
        const aspect = SHIP_ASPECTS[ship.id] || len;
        // Long axis spans N cells PLUS the (N-1) gap pixels between them.
        const longPx = len * cellSize + (len - 1) * GRID_GAP_PX;
        const shortPx = longPx / aspect;
        const head = ship.cells[0];

        const img = document.createElement('img');
        const cdnUrl = (typeof window.bsAssetUrl === 'function')
            ? window.bsAssetUrl(`ships/${ship.id}.png`)
            : `ships/${ship.id}.png`;
        img.src = cdnUrl;
        img.onerror = () => {
            if (img.src !== `ships/${ship.id}.png` && !img.dataset.fallback) {
                img.dataset.fallback = '1';
                img.src = `ships/${ship.id}.png`;
            }
        };
        img.draggable = false;
        img.className = 'ship-img' + (ship.sunk ? ' sunk' : '');
        img.alt = '';

        if (horiz) {
            img.style.width = `${longPx}px`;
            img.style.height = `${shortPx}px`;
            img.style.left = `${head.x * stride}px`;
            img.style.top = `${head.y * stride + (cellSize - shortPx) / 2}px`;
        } else {
            // Rotated container is 1 cell wide × N cells tall (+ gaps).
            // Pre-rotation: image is longPx wide × shortPx tall, rotated 90° around its center.
            const cx = head.x * stride + cellSize / 2;
            const cy = head.y * stride + longPx / 2;
            img.style.width = `${longPx}px`;
            img.style.height = `${shortPx}px`;
            img.style.left = `${cx - longPx / 2}px`;
            img.style.top = `${cy - shortPx / 2}px`;
            img.style.transform = 'rotate(90deg)';
            img.style.transformOrigin = 'center center';
        }
        overlay.appendChild(img);
    }
}

function showError(msg) {
    const el = $('lobby-error');
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 4000);
}

function flashHint(msg, duration = 2500) {
    const el = $('hint-box');
    if (!el) return;
    el.textContent = msg;
    if (duration) setTimeout(() => updateHintFromState(), duration);
}

// =========== LOBBY ============
$('btn-create').addEventListener('click', () => {
    const name = $('player-name').value.trim() || 'Captain';
    localStorage.setItem('bs_name', name);
    socket.emit('bs:create', { name, clientId: CLIENT_ID }, (resp) => {
        if (resp?.error) return showError(resp.error);
        if (resp?.success) {
            state.code = resp.code;
            state.myIdx = resp.myIdx;
            rememberRoom(resp.code);
            $('room-code-display').textContent = resp.code;
            showScreen('waiting');
            // Update URL with ?room=CODE so it can be shared
            history.replaceState(null, '', `?room=${resp.code}`);
        }
    });
});

$('btn-join').addEventListener('click', () => doJoin());
$('join-code').addEventListener('keydown', e => {
    if (e.key === 'Enter') doJoin();
});

function doJoin(prefilledCode) {
    const code = (prefilledCode || $('join-code').value).trim().toUpperCase();
    if (!code) return showError('Enter a room code');
    const name = $('player-name').value.trim() || 'Captain';
    localStorage.setItem('bs_name', name);
    socket.emit('bs:join', { code, name, clientId: CLIENT_ID }, (resp) => {
        if (resp?.error) return showError(resp.error);
        if (resp?.success) {
            state.code = resp.code;
            state.myIdx = resp.myIdx;
            rememberRoom(resp.code);
            history.replaceState(null, '', `?room=${resp.code}`);
            // Server will broadcast state which will switch us to placement
        }
    });
}

$('btn-copy-link').addEventListener('click', () => {
    const url = `${location.origin}${location.pathname}?room=${state.code}`;
    navigator.clipboard.writeText(url).then(() => {
        $('btn-copy-link').textContent = 'Copied!';
        setTimeout(() => $('btn-copy-link').textContent = 'Copy invite link', 2000);
    });
});

$('btn-leave-waiting').addEventListener('click', () => {
    forgetRoom();
    socket.emit('bs:leave');
    location.href = location.pathname;
});

// Pre-fill name and room from URL/localStorage
window.addEventListener('load', () => {
    const savedName = localStorage.getItem('bs_name');
    if (savedName) $('player-name').value = savedName;
    const params = new URLSearchParams(location.search);
    const roomCode = params.get('room');
    if (roomCode) $('join-code').value = roomCode.toUpperCase();
});

// =========== PLACEMENT ============
let _placementGridBuilt = false;

function flipOrientation(hover) {
    state.placement.selectedOrient = state.placement.selectedOrient === 'h' ? 'v' : 'h';
    updateRotateLabel();
    renderPlacementGrid(hover);
}

function updateRotateLabel() {
    const btn = $('btn-rotate');
    if (btn) btn.textContent = state.placement.selectedOrient === 'h' ? '↻ Rotate (H)' : '↻ Rotate (V)';
}

function initPlacementScreen() {
    _placementGridBuilt = false;
    resetKnownHits();
    state.placement.ships.clear();
    state.placement.selectedShipId = FLEET[0].id;
    state.placement.selectedOrient = 'h';
    updateRotateLabel();
    renderFleetList();
    renderPlacementGrid();
    updatePlacementOverlay();
    updatePlacementStatus();
}

function updatePlacementOverlay() {
    const ships = [];
    for (const [id, info] of state.placement.ships) {
        ships.push({ id, orient: info.orient, cells: info.cells });
    }
    renderShipOverlay($('placement-grid'), ships);
}

function renderFleetList() {
    const list = $('fleet-list');
    list.innerHTML = '';
    for (const ship of FLEET) {
        const placed = state.placement.ships.has(ship.id);
        const selected = state.placement.selectedShipId === ship.id;
        const card = document.createElement('div');
        card.className = 'ship-card' + (placed ? ' placed' : '') + (selected ? ' selected' : '');
        const preview = document.createElement('div');
        preview.className = 'ship-preview';
        for (let i = 0; i < ship.size; i++) {
            const c = document.createElement('div');
            c.className = 'ship-cell';
            preview.appendChild(c);
        }
        const info = document.createElement('div');
        info.className = 'ship-info';
        info.innerHTML = `<b>${ship.name}</b><small>${ship.size} cells${placed ? ' · placed' : ''}</small>`;
        card.appendChild(preview);
        card.appendChild(info);
        card.addEventListener('click', () => {
            state.placement.selectedShipId = ship.id;
            renderFleetList();
            renderPlacementGrid();
        });
        list.appendChild(card);
    }
}

function renderPlacementGrid(hover) {
    const grid = $('placement-grid');
    // Build cells ONCE. Re-rendering on hover destroys the cell mid-tap on mobile,
    // which kills the click handler — that's why tap-to-place was broken on touch devices.
    if (!_placementGridBuilt) {
        grid.innerHTML = '';
        for (let y = 0; y < GRID; y++) {
            for (let x = 0; x < GRID; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                cell.addEventListener('mouseenter', () => renderPlacementGrid({ x: +cell.dataset.x, y: +cell.dataset.y }));
                cell.addEventListener('mouseleave', () => renderPlacementGrid(null));
                cell.addEventListener('click', (e) => {
                    if (cell._suppressClick) { cell._suppressClick = false; return; }
                    onPlacementClick(+cell.dataset.x, +cell.dataset.y);
                });
                cell.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    flipOrientation({ x: +cell.dataset.x, y: +cell.dataset.y });
                });
                // Long-press to rotate (touch-friendly equivalent of right-click)
                let pressTimer = null;
                cell.addEventListener('touchstart', () => {
                    pressTimer = setTimeout(() => {
                        flipOrientation();
                        if (navigator.vibrate) navigator.vibrate(30);
                        pressTimer = null;
                        // Suppress the synthetic click that follows touchend so we don't
                        // also place a ship on the long-press cell.
                        cell._suppressClick = true;
                    }, 450);
                }, { passive: true });
                const cancelPress = () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } };
                cell.addEventListener('touchend', cancelPress);
                cell.addEventListener('touchmove', cancelPress);
                cell.addEventListener('touchcancel', cancelPress);
                grid.appendChild(cell);
            }
        }
        _placementGridBuilt = true;
    }

    // Compute occupied set
    const occupied = new Map(); // key -> shipId
    for (const [shipId, info] of state.placement.ships) {
        for (const c of info.cells) occupied.set(key(c.x, c.y), shipId);
    }
    // Preview cells (if hovering)
    let previewCells = null;
    let previewOk = false;
    const selShip = FLEET.find(s => s.id === state.placement.selectedShipId);
    if (hover && selShip && !state.placement.ships.has(selShip.id)) {
        previewCells = shipCells(hover.x, hover.y, state.placement.selectedOrient, selShip.size);
        previewOk = previewCells.every(c => inBounds(c.x, c.y) && !occupied.has(key(c.x, c.y)));
    }
    const previewSet = new Set();
    if (previewCells) previewCells.forEach(c => previewSet.add(key(c.x, c.y)));

    // Update existing cells in-place — no DOM destruction, click handlers persist.
    // IMPORTANT: skip non-cell children (like .ship-overlay) — otherwise we'd overwrite
    // their className and lose absolute positioning, dumping the sprite layer to a
    // 13th implicit grid row at the bottom.
    for (const cell of grid.children) {
        if (cell.dataset.x === undefined) continue;
        const x = +cell.dataset.x;
        const y = +cell.dataset.y;
        cell.className = 'cell';
        if (occupied.has(key(x, y))) cell.classList.add('ship');
        if (previewSet.has(key(x, y))) cell.classList.add(previewOk ? 'preview-ok' : 'preview-bad');
    }
}

function onPlacementClick(x, y) {
    const selId = state.placement.selectedShipId;
    if (!selId) return;
    const ship = FLEET.find(s => s.id === selId);
    if (!ship) return;
    // If clicking on already-placed selected ship → pick it up
    const existing = state.placement.ships.get(selId);
    if (existing && existing.cells.some(c => c.x === x && c.y === y)) {
        state.placement.ships.delete(selId);
        renderFleetList();
        renderPlacementGrid();
        updatePlacementOverlay();
        updatePlacementStatus();
        return;
    }
    // Try to place
    const orient = state.placement.selectedOrient;
    const cells = shipCells(x, y, orient, ship.size);
    const occupied = new Set();
    for (const [shipId, info] of state.placement.ships) {
        if (shipId === selId) continue;
        for (const c of info.cells) occupied.add(key(c.x, c.y));
    }
    const ok = cells.every(c => inBounds(c.x, c.y) && !occupied.has(key(c.x, c.y)));
    if (!ok) return;
    state.placement.ships.set(selId, { x, y, orient, cells });
    // Auto-advance to next unplaced ship
    const nextUnplaced = FLEET.find(s => !state.placement.ships.has(s.id));
    if (nextUnplaced) state.placement.selectedShipId = nextUnplaced.id;
    renderFleetList();
    renderPlacementGrid();
    updatePlacementOverlay();
    updatePlacementStatus();
}

function updatePlacementStatus() {
    const placed = state.placement.ships.size;
    const status = $('placement-status');
    const readyBtn = $('btn-ready');
    if (placed < FLEET.length) {
        status.textContent = `${placed}/${FLEET.length} ships placed.`;
        status.classList.remove('ready');
        readyBtn.disabled = true;
    } else {
        status.textContent = `All ships placed. Lock in your formation!`;
        status.classList.add('ready');
        readyBtn.disabled = false;
    }
}

$('btn-rotate').addEventListener('click', () => flipOrientation());

$('btn-randomize').addEventListener('click', () => {
    state.placement.ships.clear();
    const occupied = new Set();
    for (const ship of FLEET) {
        for (let tries = 0; tries < 200; tries++) {
            const orient = Math.random() < 0.5 ? 'h' : 'v';
            const maxX = orient === 'h' ? GRID - ship.size : GRID - 1;
            const maxY = orient === 'v' ? GRID - ship.size : GRID - 1;
            const x = Math.floor(Math.random() * (maxX + 1));
            const y = Math.floor(Math.random() * (maxY + 1));
            const cells = shipCells(x, y, orient, ship.size);
            if (cells.every(c => !occupied.has(key(c.x, c.y)))) {
                cells.forEach(c => occupied.add(key(c.x, c.y)));
                state.placement.ships.set(ship.id, { x, y, orient, cells });
                break;
            }
        }
    }
    renderFleetList();
    renderPlacementGrid();
    updatePlacementOverlay();
    updatePlacementStatus();
});

$('btn-reset-placement').addEventListener('click', () => {
    state.placement.ships.clear();
    state.placement.selectedShipId = FLEET[0].id;
    renderFleetList();
    renderPlacementGrid();
    updatePlacementOverlay();
    updatePlacementStatus();
});

$('btn-ready').addEventListener('click', () => {
    const ships = [];
    for (const [id, info] of state.placement.ships) {
        ships.push({ id, x: info.x, y: info.y, orient: info.orient });
    }
    socket.emit('bs:place', { ships }, (resp) => {
        if (resp?.error) return flashHint('Placement rejected: ' + resp.error);
        $('btn-ready').disabled = true;
        $('placement-status').textContent = 'Ready! Waiting for opponent…';
    });
});

window.addEventListener('keydown', e => {
    if (state.screen === 'placement' && (e.key === 'r' || e.key === 'R')) {
        flipOrientation();
    }
});

// =========== BATTLE ============
function renderBattle(server) {
    state.server = server;
    const isMyTurn = server.turn === server.myIdx;

    // Header
    $('tag-me').textContent = server.myName;
    $('tag-them').textContent = server.opponentName;
    $('tag-me').classList.toggle('active', isMyTurn);
    $('tag-them').classList.toggle('active', !isMyTurn);

    const ti = $('turn-indicator');
    if (server.phase === 'ended') {
        ti.textContent = 'Game Over';
        ti.className = 'turn-indicator';
    } else if (isMyTurn) {
        ti.textContent = 'Your turn';
        ti.className = 'turn-indicator my-turn';
    } else {
        ti.textContent = `${server.opponentName}'s turn`;
        ti.className = 'turn-indicator their-turn';
    }

    // Render boards
    renderEnemyGrid(server);
    renderMyGrid(server);

    // Update counters
    $('enemy-ships-remaining').textContent = server.enemyBoard.shipsRemaining;
    $('enemy-ships-total').textContent = server.enemyBoard.shipsTotal;
    const myAlive = server.myBoard.ships.filter(s => !s.sunk).length;
    $('my-ships-remaining').textContent = myAlive;

    // Attack buttons
    renderAttackButtons(server, isMyTurn);

    // Move + End-turn buttons
    const turnState = server.turnState || {};
    $('btn-move').disabled = !isMyTurn || !turnState.attacked || turnState.moved || server.phase !== 'battle';
    $('btn-move').classList.toggle('active', state.ui.moveMode);
    $('btn-end-turn').disabled = !isMyTurn || !turnState.attacked || server.phase !== 'battle';

    // Log
    renderLog(server.log);

    // Hint
    updateHintFromState();

    // End screen
    if (server.phase === 'ended') {
        setTimeout(() => showEndScreen(server), 800);
    }
}

function renderAttackButtons(server, isMyTurn) {
    const cds = server.myBoard.cooldowns;
    const turnState = server.turnState || {};
    const attackedAlready = !!turnState.attacked;
    document.querySelectorAll('.attack-btn').forEach(btn => {
        const type = btn.dataset.attack;
        const cd = cds[type] || 0;
        const cdSpan = btn.querySelector('.atk-cd');
        if (type !== 'bomb' && cd > 0) {
            cdSpan.textContent = `${cd}T`;
        } else {
            cdSpan.textContent = '';
        }
        const onCd = type !== 'bomb' && cd > 0;
        btn.disabled = !isMyTurn || server.phase !== 'battle' || attackedAlready || onCd;
        btn.classList.toggle('selected', state.ui.selectedAttack === type);
    });
}

function renderEnemyGrid(server) {
    const grid = $('enemy-grid');
    grid.innerHTML = '';
    // Build map of revealed cells
    const revealed = new Map();
    for (const r of server.enemyBoard.revealed) revealed.set(key(r.x, r.y), r);
    const sunkCells = new Set();
    for (const s of server.enemyBoard.sunkShips) {
        for (const c of s.cells) sunkCells.add(key(c.x, c.y));
    }
    for (let y = 0; y < GRID; y++) {
        for (let x = 0; x < GRID; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.x = x;
            cell.dataset.y = y;
            const r = revealed.get(key(x, y));
            if (r) {
                if (r.type === 'hit') {
                    cell.classList.add('hit');
                    if (sunkCells.has(key(x, y))) cell.classList.add('ship', 'sunk');
                    maybeBurst('enemy-grid', cell, x, y);
                } else if (r.type === 'miss') {
                    cell.classList.add('miss');
                    if (r.tier) cell.classList.add(r.tier.toLowerCase());
                } else if (r.type === 'recon-empty') {
                    cell.classList.add('recon-empty');
                } else if (r.type === 'recon-occ') {
                    cell.classList.add('recon-occ');
                } else if (r.type === 'sonar') {
                    cell.classList.add('sonar');
                    const arrow = document.createElement('span');
                    arrow.className = 'sonar-arrow';
                    arrow.textContent = directionArrow(r.direction) + (r.tier ? ` ${tierShort(r.tier)}` : '');
                    cell.appendChild(arrow);
                }
            }
            // Click handler depends on selected attack
            cell.addEventListener('click', () => onEnemyCellClick(x, y));
            cell.addEventListener('mouseenter', () => onEnemyCellHover(x, y));
            cell.addEventListener('mouseleave', () => onEnemyCellLeave());
            grid.appendChild(cell);
        }
    }
    // Reveal sunk-enemy ships as desaturated silhouettes.
    const sunk = (server.enemyBoard.sunkShips || []).map(s => ({
        id: s.id, orient: s.orient, cells: s.cells, sunk: true,
    }));
    renderShipOverlay(grid, sunk);
}

function directionArrow(dir) {
    const map = { 'N':'↑','NE':'↗','E':'→','SE':'↘','S':'↓','SW':'↙','W':'←','NW':'↖','HERE':'⊙','NONE':'?' };
    return map[dir] || dir;
}
function tierShort(t) {
    return { 'Burning':'B','Warm':'W','Cold':'C','Freezing':'F' }[t] || t[0];
}

function renderMyGrid(server) {
    const grid = $('my-grid');
    grid.innerHTML = '';
    // Build maps
    const shipMap = new Map();
    const hitMap = new Set();
    const sunkShipIds = new Set();
    for (const s of server.myBoard.ships) {
        if (s.sunk) sunkShipIds.add(s.id);
        for (const c of s.cells) shipMap.set(key(c.x, c.y), s);
        for (const h of s.hitCells) hitMap.add(key(h.x, h.y));
    }
    const bombMap = new Map();
    for (const b of server.myBoard.bombs) bombMap.set(key(b.x, b.y), b.turnsLeft);
    const pingMap = new Map();
    for (const p of server.myBoard.opponentPings) pingMap.set(key(p.x, p.y), p);

    const moveFromShipId = state.ui.moveMode ? state.ui.moveShipId : null;
    const moveFromShip = moveFromShipId ? server.myBoard.ships.find(s => s.id === moveFromShipId) : null;
    const moveFromCells = moveFromShip ? new Set(moveFromShip.cells.map(c => key(c.x, c.y))) : null;

    for (let y = 0; y < GRID; y++) {
        for (let x = 0; x < GRID; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.x = x;
            cell.dataset.y = y;
            const ship = shipMap.get(key(x, y));
            if (ship) {
                cell.classList.add('ship');
                if (sunkShipIds.has(ship.id)) cell.classList.add('sunk');
                if (hitMap.has(key(x, y))) {
                    cell.classList.add('hit-part');
                    maybeBurst('my-grid', cell, x, y);
                }
            }
            if (bombMap.has(key(x, y)) && !ship) {
                cell.classList.add('bombed-zone');
                const counter = document.createElement('span');
                counter.className = 'bomb-counter';
                counter.textContent = bombMap.get(key(x, y));
                cell.appendChild(counter);
            } else if (bombMap.has(key(x, y))) {
                // Ship currently sitting on a bombed zone (just got hit). Show small counter.
                const counter = document.createElement('span');
                counter.className = 'bomb-counter';
                counter.textContent = bombMap.get(key(x, y));
                cell.appendChild(counter);
            }
            if (pingMap.has(key(x, y))) cell.classList.add('opp-ping');
            if (moveFromCells?.has(key(x, y))) cell.classList.add('move-from');
            if (state.ui.moveMode && moveFromShip) {
                // Highlight valid move targets
                const candidates = computeMoveTargets(moveFromShip, server);
                if (candidates.some(t => t.x === x && t.y === y)) cell.classList.add('move-target');
            }
            cell.addEventListener('click', () => onMyCellClick(x, y));
            grid.appendChild(cell);
        }
    }
    // Paint own ships as sprites (sunk ones get the desaturated treatment).
    const myShips = server.myBoard.ships.map(s => ({
        id: s.id, orient: s.orient, cells: s.cells, sunk: !!s.sunk,
    }));
    renderShipOverlay(grid, myShips);
}

function computeMoveTargets(ship, server) {
    // For each direction, the WHOLE ship shifts. Show the ship's NEW anchor cell highlights (head of ship) OR just every potentially-moved cell? Simpler: highlight where the ship's first cell would land.
    // Actually we'll allow clicking on any cell adjacent to a ship cell to determine direction.
    const targets = [];
    const dirs = [
        { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
        { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
    ];
    const bombSet = new Set(server.myBoard.bombs.map(b => key(b.x, b.y)));
    const otherShipCells = new Set();
    for (const s of server.myBoard.ships) {
        if (s.id === ship.id) continue;
        for (const c of s.cells) otherShipCells.add(key(c.x, c.y));
    }
    for (const d of dirs) {
        const newCells = ship.cells.map(c => ({ x: c.x + d.dx, y: c.y + d.dy }));
        const ok = newCells.every(c => inBounds(c.x, c.y) && !bombSet.has(key(c.x, c.y)) && !otherShipCells.has(key(c.x, c.y)));
        if (ok) {
            // For each new cell that wasn't in the original ship → that's a "target hint"
            for (const c of newCells) {
                if (!ship.cells.some(o => o.x === c.x && o.y === c.y)) {
                    targets.push({ x: c.x, y: c.y, dx: d.dx, dy: d.dy });
                }
            }
        }
    }
    return targets;
}

function onMyCellClick(x, y) {
    const server = state.server;
    if (!server) return;
    if (!state.ui.moveMode) {
        // Clicking a ship cell selects it for movement (will activate move mode if eligible)
        if (server.turn !== server.myIdx || !server.turnState?.attacked || server.turnState?.moved) return;
        const ship = server.myBoard.ships.find(s => s.cells.some(c => c.x === x && c.y === y) && !s.sunk);
        if (ship) {
            state.ui.moveMode = true;
            state.ui.moveShipId = ship.id;
            renderBattle(server);
            flashHint(`Click an adjacent cell to move ${ship.name} that direction. Click ship again to cancel.`, 0);
        }
        return;
    }
    // In move mode — clicked target
    const ship = server.myBoard.ships.find(s => s.id === state.ui.moveShipId);
    if (!ship) return;
    // Clicked one of ship's own cells → cancel
    if (ship.cells.some(c => c.x === x && c.y === y)) {
        state.ui.moveMode = false;
        state.ui.moveShipId = null;
        renderBattle(server);
        return;
    }
    const targets = computeMoveTargets(ship, server);
    const target = targets.find(t => t.x === x && t.y === y);
    if (!target) {
        flashHint('Invalid move target. Click a highlighted cell.', 2000);
        return;
    }
    socket.emit('bs:move', { shipId: ship.id, dx: target.dx, dy: target.dy }, (resp) => {
        if (resp?.error) {
            flashHint('Move rejected: ' + resp.error);
        } else {
            state.ui.moveMode = false;
            state.ui.moveShipId = null;
        }
    });
}

// =========== ATTACKS ============
document.querySelectorAll('.attack-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.disabled) return;
        state.ui.selectedAttack = btn.dataset.attack;
        renderAttackButtons(state.server, true);
        const hints = {
            bomb: 'Click an enemy cell to drop a bomb.',
            sonar: 'Click an enemy cell to ping — no damage, reveals direction.',
            torpedo: 'Click an enemy cell — you\'ll pick row/col + direction.',
            recon: 'Click an enemy cell (interior, not on the edge) for a 3×3 scan.',
            barrage: 'Click an enemy cell — you\'ll pick horizontal or vertical 3-cell line.',
        };
        flashHint(hints[btn.dataset.attack], 0);
    });
});

$('btn-move').addEventListener('click', () => {
    if (state.ui.moveMode) {
        state.ui.moveMode = false;
        state.ui.moveShipId = null;
        renderBattle(state.server);
        return;
    }
    flashHint('Click one of your ships, then click an adjacent cell to move it.', 0);
});

$('btn-end-turn').addEventListener('click', () => {
    socket.emit('bs:end-turn', {}, (resp) => {
        if (resp?.error) flashHint('End turn failed: ' + resp.error);
        state.ui.selectedAttack = null;
        state.ui.moveMode = false;
        state.ui.moveShipId = null;
    });
});

function onEnemyCellHover(x, y) {
    // (Optional: future enhancement — show attack preview)
}
function onEnemyCellLeave() {}

function onEnemyCellClick(x, y) {
    const server = state.server;
    if (!server || server.phase !== 'battle') return;
    if (server.turn !== server.myIdx) return flashHint('Not your turn.');
    if (server.turnState?.attacked) return flashHint('Already attacked this turn.');
    const type = state.ui.selectedAttack || 'bomb';
    if (type === 'bomb') {
        fireAttack('bomb', { x, y });
    } else if (type === 'sonar') {
        fireAttack('sonar', { x, y });
    } else if (type === 'torpedo') {
        openTorpedoPicker(x, y);
    } else if (type === 'recon') {
        if (x < 1 || x >= GRID - 1 || y < 1 || y >= GRID - 1) return flashHint('Recon must be at least 1 cell from edges.');
        fireAttack('recon', { x, y });
    } else if (type === 'barrage') {
        openBarragePicker(x, y);
    }
}

function fireAttack(type, payload) {
    socket.emit('bs:attack', { type, ...payload }, (resp) => {
        if (resp?.error) return flashHint('Attack failed: ' + resp.error);
        state.ui.selectedAttack = null;
        if (resp.result) describeResult(resp.result);
    });
}

function describeResult(r) {
    if (r.type === 'bomb') {
        if (r.hit) flashHint(r.sunk ? `🎯 HIT — SUNK ${r.shipName}!` : `🎯 HIT at (${r.x},${r.y})!`, 3500);
        else flashHint(`💧 Miss — ${r.tier}`, 3000);
    } else if (r.type === 'sonar') {
        flashHint(`📡 Sonar → ${r.tier}, ${r.direction}`, 3500);
    } else if (r.type === 'torpedo') {
        if (r.hit) flashHint(r.hit.sunk ? `🚀 Torpedo SUNK ${r.hit.shipName}!` : `🚀 Torpedo HIT (${r.hit.x},${r.hit.y})`, 3500);
        else flashHint(`🚀 Torpedo — no contact`, 3000);
    } else if (r.type === 'recon') {
        const occ = r.cells.filter(c => c.occupied).length;
        flashHint(`✈️ Recon → ${occ}/9 occupied`, 3500);
    } else if (r.type === 'barrage') {
        const hits = r.cells.filter(c => c.hit).length;
        flashHint(`💣 Barrage → ${hits}/3 hits`, 3500);
    }
}

// =========== PICKERS ============
function openTorpedoPicker(x, y) {
    showPicker('Torpedo direction', [
        { label: `Row ${y} →`, action: () => fireAttack('torpedo', { axis: 'row', index: y, fromStart: true }) },
        { label: `Row ${y} ←`, action: () => fireAttack('torpedo', { axis: 'row', index: y, fromStart: false }) },
        { label: `Col ${x} ↓`, action: () => fireAttack('torpedo', { axis: 'col', index: x, fromStart: true }) },
        { label: `Col ${x} ↑`, action: () => fireAttack('torpedo', { axis: 'col', index: x, fromStart: false }) },
    ]);
}

function openBarragePicker(x, y) {
    const opts = [];
    if (x >= 1 && x < GRID - 1) opts.push({ label: 'Horizontal (3 cells across)', action: () => fireAttack('barrage', { x, y, orient: 'h' }) });
    if (y >= 1 && y < GRID - 1) opts.push({ label: 'Vertical (3 cells down)', action: () => fireAttack('barrage', { x, y, orient: 'v' }) });
    if (!opts.length) return flashHint('Cell must be at least 1 from the edge (in chosen direction).');
    showPicker('Barrage orientation', opts);
}

function showPicker(title, options) {
    $('picker-title').textContent = title;
    const container = $('picker-options');
    container.innerHTML = '';
    for (const opt of options) {
        const b = document.createElement('button');
        b.className = 'picker-opt';
        b.textContent = opt.label;
        b.addEventListener('click', () => {
            $('picker-overlay').classList.add('hidden');
            opt.action();
        });
        container.appendChild(b);
    }
    $('picker-overlay').classList.remove('hidden');
}
$('picker-cancel').addEventListener('click', () => $('picker-overlay').classList.add('hidden'));

// =========== LOG ============
function renderLog(log) {
    const box = $('log-box');
    box.innerHTML = '';
    for (const entry of log) {
        const line = document.createElement('div');
        line.className = 'log-line ' + (entry.type || '');
        if (entry.type === 'chat') line.textContent = `${entry.who}: ${entry.msg}`;
        else if (entry.who) line.textContent = `${entry.who}: ${entry.msg}`;
        else line.textContent = entry.msg;
        box.appendChild(line);
    }
    box.scrollTop = box.scrollHeight;
}

// =========== HINT ============
function updateHintFromState() {
    const server = state.server;
    if (!server) return;
    if (server.phase !== 'battle') return;
    const isMyTurn = server.turn === server.myIdx;
    const ts = server.turnState || {};
    if (!isMyTurn) {
        $('hint-box').textContent = `Waiting for ${server.opponentName} to take their turn...`;
        return;
    }
    if (!ts.attacked) {
        if (ts.chainCount && ts.chainCount > 0) {
            $('hint-box').textContent = `🔥 Hit chain ×${ts.chainCount} — fire again! You keep attacking until you miss.`;
        } else {
            $('hint-box').textContent = `Your turn — pick an attack, then click the enemy grid. Hits chain (keep firing until you miss).`;
        }
    } else if (!ts.moved) {
        $('hint-box').textContent = `You missed. Optionally move one ship by 1 cell, or end your turn.`;
    } else {
        $('hint-box').textContent = `Move complete. End your turn when ready.`;
    }
}

// =========== END SCREEN ============
function showEndScreen(server) {
    const won = server.winner === server.myIdx;
    const title = $('end-title');
    title.textContent = won ? 'VICTORY' : 'DEFEATED';
    title.className = won ? 'victory' : 'defeat';
    $('end-message').textContent = won
        ? `You sank ${server.opponentName}'s entire fleet!`
        : `${server.opponentName} sank your fleet.`;
    showScreen('end');
}
$('btn-play-again').addEventListener('click', () => {
    forgetRoom();
    socket.emit('bs:leave');
    location.href = location.pathname;
});

// =========== SOCKET EVENTS ============
socket.on('bs:state', (server) => {
    // Phase transitions
    if (server.phase === 'placement' && state.screen !== 'placement') {
        if (server.opponentConnected || server.placementReady[1 - server.myIdx]) {
            showScreen('placement');
            initPlacementScreen();
        } else if (state.screen !== 'waiting') {
            showScreen('waiting');
        }
    } else if (server.phase === 'placement' && state.screen === 'waiting' && server.opponentConnected) {
        showScreen('placement');
        initPlacementScreen();
    } else if (server.phase === 'battle' && state.screen !== 'battle') {
        showScreen('battle');
    }
    if (server.phase === 'battle' || server.phase === 'ended') {
        renderBattle(server);
    }
});

socket.on('connect', () => {
    console.log('[BS] connected', socket.id);
    // If we had a room before (page load with saved state, or returning from
    // a mobile background that killed the socket), try to reattach. The server
    // holds the slot for ~5 min after disconnect.
    const code = recalledRoom();
    if (code) {
        socket.emit('bs:reclaim', { code, clientId: CLIENT_ID }, (resp) => {
            if (resp?.success) {
                state.code = resp.code;
                state.myIdx = resp.myIdx;
                history.replaceState(null, '', `?room=${resp.code}`);
                // Server will broadcast state — bs:state handler routes us to
                // the right screen (waiting / placement / battle / ended).
            } else {
                // Room is gone (timed out, or never existed). Drop the stale code
                // so we don't keep retrying, and stay on the lobby.
                forgetRoom();
            }
        });
    }
});
socket.on('disconnect', () => {
    // Soft notice — socket.io will auto-reconnect. The reclaim flow on the
    // next 'connect' event will put us back in the room if it still exists.
    flashHint('Connection lost — reconnecting…', 0);
});
socket.io.on('reconnect', () => {
    // Belt-and-suspenders: socket.io fires both 'connect' (on the socket) and
    // 'reconnect' (on the manager). The 'connect' handler above already runs
    // the reclaim, so this is mostly for the hint clear.
    flashHint('Reconnected.', 1500);
});
