(() => {
  'use strict';

  const SR = window.StickRoyale;
  const Motion = window.StickMotion;

  function $(id) { return document.getElementById(id); }
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach((el) => el.classList.remove('active'));
    $(id).classList.add('active');
  }
  function socketHost() {
    const h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') {
      return window.location.port && window.location.port !== '3001'
        ? 'http://localhost:3001'
        : window.location.origin;
    }
    return window.location.origin.includes('zecrugames.com')
      ? window.location.origin
      : 'https://www.zecrugames.com';
  }

  const game = {
    clips: null,
    vfxDoc: null,
    vfx: null,
    match: null,
    snap: null,
    online: false,
    socket: null,
    myId: 0,
    isHost: false,
    roomCode: null,
    pendingMode: 'survival',
    selected: null,
    anims: new Map(),
    lastSeen: new Set(),
    lastTs: 0,
    bloodOn: localStorage.getItem('stickroyale-blood') !== '0',
    canvas: null,
    ctx: null,
    viewTeam: 0
  };

  function setBlood(on) {
    game.bloodOn = !!on;
    localStorage.setItem('stickroyale-blood', on ? '1' : '0');
    $('bloodToggle').checked = on;
    $('bloodToggleGame').checked = on;
    $('bloodLabel').textContent = on ? 'On' : 'Off';
    $('bloodLabelGame').textContent = on ? 'On' : 'Off';
    if (game.vfx) game.vfx.setBlood(on);
  }

  async function loadAssets() {
    const [clips, vfxDoc] = await Promise.all([
      fetch('motion/clips.json').then((r) => r.json()),
      fetch('vfx/presets.json').then((r) => r.json())
    ]);
    game.clips = clips.clips;
    game.vfxDoc = vfxDoc;
    game.vfx = window.StickVfx.createVfx(vfxDoc);
    game.vfx.setBlood(game.bloodOn);
  }

  function worldToScreenFactory() {
    const c = game.canvas;
    const padT = 52;
    const padB = 118;
    const w = c.width;
    const h = c.height;
    const flip = game.viewTeam === 1;
    return (x, y) => {
      const yy = flip ? (SR.ARENA_H - y) : y;
      return {
        x: (x / SR.ARENA_W) * w,
        y: padT + (yy / SR.ARENA_H) * (h - padT - padB)
      };
    };
  }

  function screenToWorld(sx, sy) {
    const c = game.canvas;
    const rect = c.getBoundingClientRect();
    const x = (sx - rect.left) * (c.width / rect.width);
    const y = (sy - rect.top) * (c.height / rect.height);
    const padT = 52;
    const padB = 118;
    const yy = (y - padT) / Math.max(1, c.height - padT - padB);
    let wy = yy * SR.ARENA_H;
    if (game.viewTeam === 1) wy = SR.ARENA_H - wy;
    const wx = (x / c.width) * SR.ARENA_W;
    return { x: wx, y: wy };
  }

  function applySnap(snap) {
    const prev = game.snap;
    game.snap = snap;
    if (snap.players && snap.players[game.myId]) {
      game.viewTeam = snap.players[game.myId].team;
    }
    if (game.vfx && snap.events) {
      for (const ev of snap.events) {
        const def = ev.unitType ? SR.UNITS[ev.unitType] : null;
        game.vfx.playEvent(ev, def && def.color);
        if (ev.type === 'hit' && ev.x != null) {
          const clip = (game.playersPose(ev) === 'attack_cast') ? 'attack_cast' : null;
          if (clip) game.vfx.fireBinding(clip, ev.x, ev.y, 1, def && def.color);
        }
      }
    }
    if (prev && game.vfx) {
      const prevIds = new Set((prev.units || []).map((u) => u.id));
      for (const u of snap.units || []) {
        if (!prevIds.has(u.id)) game.vfx.fireBinding('spawn', u.x, u.y, 1, (SR.UNITS[u.type] || {}).color);
      }
    }
    renderHud(snap);
    if (snap.phase === 'augment') showAugment(snap);
    else hideAugment();
    if (snap.ended) endFromSnap(snap);
  }

  game.playersPose = function () { return 'attack_melee'; };

  function startLocal(mode) {
    game.online = false;
    game.myId = 0;
    game.viewTeam = 0;
    game.anims.clear();
    const fast = new URLSearchParams(location.search).has('fast');
    game.match = SR.createMatch({
      mode,
      playerCount: 1,
      aiOpponent: mode === 'versus',
      names: ['You', mode === 'versus' ? 'Arena Bot' : ''],
      augmentEvery: fast ? 8 : undefined
    });
    applySnap(SR.getSnapshot(game.match));
    showScreen('gameScreen');
    resize();
  }

  function localTick(ts) {
    if (!game.lastTs) game.lastTs = ts;
    const dt = Math.min(0.05, (ts - game.lastTs) / 1000);
    game.lastTs = ts;
    if (game.match && !game.online && !game.match.ended && game.match.phase === 'battle') {
      SR.tick(game.match, dt);
      applySnap(SR.getSnapshot(game.match));
    } else if (game.match && !game.online && game.match.phase === 'augment') {
      SR.tick(game.match, dt);
      applySnap(SR.getSnapshot(game.match));
    }
    if (game.vfx) game.vfx.step(dt, ts);
    draw();
    requestAnimationFrame(localTick);
  }

  function playSelectedAt(x, y) {
    if (!game.selected || !game.snap || game.snap.phase !== 'battle') return;
    if (game.online && game.socket) {
      game.socket.emit('sr:playCard', { cardId: game.selected, x, y });
    } else if (game.match) {
      SR.playCard(game.match, game.myId, game.selected, x, y);
      applySnap(SR.getSnapshot(game.match));
    }
    game.selected = null;
    $('dropHint').classList.add('hidden');
    renderHand(game.snap);
  }

  function renderHud(snap) {
    if (!snap) return;
    $('hudWave').textContent = snap.wave || 0;
    $('hudScore').textContent = snap.score || 0;
    const remain = Math.max(0, (SR.VERSUS_TIME || 180) - (snap.battleTime || 0));
    const m = Math.floor(remain / 60);
    const s = Math.floor(remain % 60);
    $('hudTime').textContent = snap.mode === 'versus' ? `${m}:${String(s).padStart(2, '0')}` : '∞';
    $('hudWaveWrap').style.display = snap.mode === 'survival' ? '' : 'none';
    $('hudPhase').textContent = snap.phase === 'augment' ? 'AUGMENT' : (snap.doubleElixir ? 'Double Elixir' : 'Battle');
    const eta = Math.max(0, (snap.nextAugmentAt || 30) - (snap.battleTime || 0));
    $('hudAugmentEta').textContent = snap.phase === 'augment'
      ? `Pick! ${Math.ceil(Math.max(0, (snap.augmentEndsAt || 0) - (snap.time || 0)))}s`
      : `Augment in ${Math.ceil(eta)}s`;
    const me = snap.players[game.myId] || snap.players[0];
    const elix = me ? me.elixir : 0;
    $('elixirFill').style.width = `${(elix / SR.ELIXIR_MAX) * 100}%`;
    $('elixirText').textContent = `${elix.toFixed(1)} / ${SR.ELIXIR_MAX}`;
    renderHand(snap);
  }

  function renderHand(snap) {
    const me = snap.players[game.myId] || snap.players[0];
    const handEl = $('hand');
    handEl.innerHTML = '';
    if (!me) return;
    me.hand.forEach((id) => {
      const def = SR.UNITS[id];
      if (!def) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'card' + (game.selected === id ? ' selected' : '') + (me.elixir < def.cost ? ' disabled' : '');
      btn.innerHTML = `<span class="card-cost">${def.cost}</span>
        <canvas width="36" height="36" class="card-art"></canvas>
        <span class="card-name">${def.name}</span>
        <span class="card-role">${def.role}</span>`;
      const cv = btn.querySelector('canvas');
      const ctx = cv.getContext('2d');
      Motion.drawHead(ctx, 18, 18, def.shape, def.color, false, 10);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (me.elixir < def.cost || snap.phase !== 'battle') return;
        game.selected = game.selected === id ? null : id;
        $('dropHint').classList.toggle('hidden', !game.selected);
        renderHand(snap);
      });
      handEl.appendChild(btn);
    });
  }

  function showAugment(snap) {
    const me = snap.players[game.myId] || snap.players[0];
    if (!me || !me.offers) return;
    $('augmentOverlay').classList.remove('hidden');
    $('augmentTimer').textContent = Math.ceil(Math.max(0, (snap.augmentEndsAt || 0) - (snap.time || 0)));
    const box = $('augmentChoices');
    if (box.dataset.round === String(snap.augmentRound) && box.childElementCount) return;
    box.dataset.round = String(snap.augmentRound);
    box.innerHTML = '';
    me.offers.forEach((id) => {
      const def = SR.UNITS[id];
      if (!def) return;
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'aug-card';
      el.innerHTML = `<canvas width="56" height="56"></canvas>
        <strong>${def.name}</strong>
        <div class="aug-${def.rarity}">${def.rarity} • ${def.role}</div>
        <div>Cost ${def.cost}</div>`;
      Motion.drawHead(el.querySelector('canvas').getContext('2d'), 28, 28, def.shape, def.color, false, 16);
      el.addEventListener('click', () => {
        if (game.online && game.socket) game.socket.emit('sr:pickAugment', { unitId: id });
        else if (game.match) {
          SR.pickAugment(game.match, game.myId, id);
          applySnap(SR.getSnapshot(game.match));
        }
      });
      box.appendChild(el);
    });
  }

  function hideAugment() {
    $('augmentOverlay').classList.add('hidden');
    $('augmentChoices').innerHTML = '';
    $('augmentChoices').dataset.round = '';
  }

  function endFromSnap(snap) {
    const me = snap.players[game.myId] || snap.players[0];
    const win = snap.mode === 'survival'
      ? snap.winReason !== 'king'
      : snap.winner === (me ? me.team : 0);
    $('goTitle').textContent = snap.mode === 'survival' ? 'WAVES OVER' : (win ? 'VICTORY' : 'DEFEAT');
    $('goDesc').textContent = snap.winReason === 'disconnect'
      ? 'Opponent left the room.'
      : (snap.mode === 'survival' ? 'Your king tower fell.' : `Win condition: ${snap.winReason || 'towers'}`);
    $('goWave').textContent = snap.wave || 0;
    $('goScore').textContent = snap.score || 0;
    $('goDmg').textContent = me ? me.damageDealt : 0;
    showScreen('gameOverScreen');
  }

  function drawArena(ctx, toS) {
    const a0 = toS(0, 0);
    const a1 = toS(SR.ARENA_W, SR.ARENA_H);
    const x = Math.min(a0.x, a1.x);
    const y = Math.min(a0.y, a1.y);
    const w = Math.abs(a1.x - a0.x);
    const h = Math.abs(a1.y - a0.y);
    ctx.fillStyle = '#163322';
    ctx.fillRect(x, y, w, h);
    const r0 = toS(0, SR.RIVER_Y0);
    const r1 = toS(SR.ARENA_W, SR.RIVER_Y1);
    ctx.fillStyle = '#1d4ed8';
    ctx.globalAlpha = 0.45;
    ctx.fillRect(Math.min(r0.x, r1.x), Math.min(r0.y, r1.y), Math.abs(r1.x - r0.x), Math.abs(r1.y - r0.y));
    ctx.globalAlpha = 1;
    SR.LANES.forEach((lx) => {
      const p0 = toS(lx, SR.RIVER_Y0);
      const p1 = toS(lx, SR.RIVER_Y1);
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(p0.x - 10, Math.min(p0.y, p1.y) - 4, 20, Math.abs(p1.y - p0.y) + 8);
    });
  }

  function drawTower(ctx, tw, toS) {
    const p = toS(tw.x, tw.y);
    const king = tw.kind === 'king';
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = tw.team === 0 ? '#2563eb' : '#dc2626';
    if (tw.flash > 0) ctx.fillStyle = '#fff';
    ctx.fillRect(-14, king ? -28 : -20, 28, king ? 36 : 26);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-16, king ? -32 : -24, 32, 6);
    ctx.fillStyle = '#111';
    ctx.fillRect(-12, -8, 24, 4);
    ctx.fillStyle = tw.hp / tw.maxHp > 0.4 ? '#4ade80' : '#f87171';
    ctx.fillRect(-16, 12, 32 * (tw.hp / tw.maxHp), 4);
    ctx.restore();
  }

  function draw() {
    const ctx = game.ctx;
    const snap = game.snap;
    if (!ctx || !snap) return;
    const w = game.canvas.width;
    const h = game.canvas.height;
    ctx.clearRect(0, 0, w, h);
    const toS = worldToScreenFactory();
    drawArena(ctx, toS);
    if (game.vfx) game.vfx.drawStains(ctx, (x, y) => toS(x, y));
    snap.towers.forEach((tw) => { if (tw.hp > 0) drawTower(ctx, tw, toS); });
    const now = performance.now() / 1000;
    for (const u of snap.units) {
      const def = SR.UNITS[u.type] || { shape: 'circle', color: '#fff', role: 'melee' };
      let anim = game.anims.get(u.id);
      if (!anim) {
        anim = Motion.createAnimator();
        game.anims.set(u.id, anim);
      }
      Motion.stepAnimator(anim, game.clips, u.pose, def, 1 / 30);
      const ev = Motion.evaluate(anim, game.clips, def);
      const p = toS(u.x, u.y);
      const facing = (u.team === 0 ? -1 : 1) * (game.viewTeam === 1 ? -1 : 1);
      const world = Motion.solve(ev.pose, p.x, p.y, facing, ev.mods.scale * 1.15, ev.mods.stance);
      if (game.vfx) game.vfx.drawAura(ctx, p.x, p.y - 18, def, now);
      Motion.drawStick(ctx, world, def, u.flash > 0, ev.mods.scale);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(p.x - 12, p.y + 14, 24 * (u.hp / u.maxHp), 3);
    }
    for (const pr of snap.projectiles || []) {
      const p = toS(pr.x, pr.y);
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (game.vfx) game.vfx.draw(ctx, (x, y) => toS(x, y));
  }

  function resize() {
    const c = game.canvas;
    if (!c) return;
    c.width = Math.floor(c.clientWidth * (window.devicePixelRatio || 1));
    c.height = Math.floor(c.clientHeight * (window.devicePixelRatio || 1));
  }

  function connectSocket() {
    if (game.socket) return game.socket;
    const socket = window.io(socketHost(), { transports: ['websocket', 'polling'] });
    game.socket = socket;
    socket.on('sr:roomCreated', (data) => {
      game.roomCode = data.code;
      game.isHost = true;
      $('lobbyError').textContent = '';
      updateLobby(data.players);
    });
    socket.on('sr:roomJoined', (data) => {
      game.roomCode = data.code;
      game.isHost = data.hostId === socket.id;
      $('lobbyError').textContent = '';
      updateLobby(data.players, data.hostId);
    });
    socket.on('sr:roomUpdate', (data) => {
      game.isHost = data.hostId === socket.id;
      $('lobbyError').textContent = '';
      updateLobby(data.players, data.hostId);
    });
    socket.on('sr:gameStart', (data) => {
      game.online = true;
      game.myId = (data.players || []).findIndex((p) => p.socketId === socket.id);
      if (game.myId < 0) game.myId = 0;
      game.anims.clear();
      applySnap(data.state);
      showScreen('gameScreen');
      resize();
    });
    socket.on('sr:state', (snap) => applySnap(snap));
    socket.on('sr:gameOver', (snap) => applySnap(snap));
    socket.on('sr:error', (data) => { $('lobbyError').textContent = data.msg || 'Error'; });
    socket.on('sr:playDenied', (data) => {
      $('dropHint').textContent = data.reason === 'elixir' ? 'Not enough elixir' : 'Cannot play that';
      $('dropHint').classList.remove('hidden');
      setTimeout(() => $('dropHint').classList.add('hidden'), 800);
    });
    return socket;
  }

  function updateLobby(players, hostId) {
    $('lobbyInfo').classList.remove('hidden');
    $('lobbyRoomCode').textContent = game.roomCode || '------';
    $('lobbyPlayerCount').textContent = players.length;
    $('lobbyPlayerList').innerHTML = players.map((p) =>
      `<div class="player-chip">${p.name}${p.isHost || p.socketId === hostId ? ' · host' : ''}</div>`
    ).join('');
    $('btnStartGame').classList.toggle('hidden', !(game.isHost && players.length >= 2));
    $('lobbyWait').textContent = game.isHost
      ? (players.length < 2 ? 'Waiting for a joiner…' : 'Ready — start when you want.')
      : 'Waiting for host to start…';
  }

  function openLobby(mode) {
    game.pendingMode = mode;
    game.online = false;
    $('lobbyTitle').textContent = mode === 'versus' ? '1v1 Versus' : 'Co-op Survival';
    $('lobbyModeLabel').textContent = mode === 'versus' ? 'Destroy the enemy king' : 'Share a side vs waves';
    $('lobbyInfo').classList.add('hidden');
    $('lobbyError').textContent = '';
    $('roomCodeInput').value = '';
    showScreen('lobbyScreen');
    connectSocket();
  }

  function bindCanvasInput() {
    const c = game.canvas;
    const handler = (ev) => {
      const t = ev.touches ? ev.touches[0] : ev;
      if (!t || !game.selected) return;
      ev.preventDefault();
      const w = screenToWorld(t.clientX, t.clientY);
      playSelectedAt(w.x, w.y);
    };
    c.addEventListener('click', handler);
    c.addEventListener('touchstart', handler, { passive: false });
  }

  function bindUi() {
    $('btnSoloSurvival').onclick = () => startLocal('survival');
    $('btnSoloVersus').onclick = () => startLocal('versus');
    $('btnCoop').onclick = () => openLobby('survival');
    $('btnVersus').onclick = () => openLobby('versus');
    $('btnBackToMenu').onclick = () => showScreen('menuScreen');
    $('btnCreateRoom').onclick = () => {
      const name = $('playerName').value.trim() || 'Player';
      connectSocket().emit('sr:createRoom', { name, mode: game.pendingMode });
    };
    $('btnJoinRoom').onclick = () => {
      const code = ($('roomCodeInput').value || '').trim().toUpperCase();
      const name = $('playerName').value.trim() || 'Player';
      if (!code) { $('lobbyError').textContent = 'Type a room code'; return; }
      connectSocket().emit('sr:joinRoom', { code, name });
    };
    $('btnStartGame').onclick = () => {
      if (game.socket) game.socket.emit('sr:startGame', { mode: game.pendingMode });
    };
    $('btnQuit').onclick = () => { game.match = null; game.online = false; showScreen('menuScreen'); };
    $('btnPlayAgain').onclick = () => showScreen('menuScreen');
    $('btnMainMenu').onclick = () => showScreen('menuScreen');
    $('btnSettings').onclick = () => $('settingsOverlay').classList.remove('hidden');
    $('btnCloseSettings').onclick = () => $('settingsOverlay').classList.add('hidden');
    $('bloodToggle').onchange = (e) => setBlood(e.target.checked);
    $('bloodToggleGame').onchange = (e) => setBlood(e.target.checked);
    window.addEventListener('resize', resize);
  }

  async function boot() {
    game.canvas = $('gameCanvas');
    game.ctx = game.canvas.getContext('2d');
    setBlood(game.bloodOn);
    bindUi();
    bindCanvasInput();
    await loadAssets();
    resize();
    requestAnimationFrame(localTick);
  }

  window.stickRoyaleGame = game;
  boot();
})();
