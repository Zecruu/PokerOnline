/**
 * Graveborn — 2D necromancer survivor prototype.
 * Auto-attack, auto-raise from corpses, ARAM-style class cards.
 * Pooled entities + a coarse grid so the hot loop stays cheap on phones.
 */
(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const hud = {
    hpFill: document.getElementById("hpFill"),
    xpFill: document.getElementById("xpFill"),
    hpText: document.getElementById("hpText"),
    levelText: document.getElementById("levelText"),
    armyText: document.getElementById("armyText"),
    killText: document.getElementById("killText"),
    timeText: document.getElementById("timeText"),
    banner: document.getElementById("banner"),
  };

  const WORLD = 2400;
  const TILE = 64;
  const GRID = 128;
  const MAX_ENEMIES = 80;
  const MAX_MINIONS = 16;
  const MAX_CORPSES = 50;
  const MAX_PROJS = 40;
  const MAX_GEMS = 80;

  const keys = Object.create(null);
  const pointer = { x: 0, y: 0, active: false, id: null };
  const joy = { dx: 0, dy: 0, show: false, ox: 0, oy: 0 };

  let state;
  let lastT = 0;
  let raf = 0;
  let drafting = false;

  function rand() {
    return Math.random();
  }

  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }

  function len(x, y) {
    return Math.hypot(x, y);
  }

  function norm(x, y) {
    const d = Math.hypot(x, y) || 1;
    return { x: x / d, y: y / d };
  }

  function xpFor(level) {
    return 18 + level * 10;
  }

  function emptyPool(n, factory) {
    const list = [];
    for (let i = 0; i < n; i++) list.push(factory());
    return list;
  }

  function acquire(pool) {
    for (let i = 0; i < pool.length; i++) {
      if (!pool[i].alive) return pool[i];
    }
    return null;
  }

  function gridKey(x, y) {
    return ((x / GRID) | 0) + "," + ((y / GRID) | 0);
  }

  function rebuildGrid(entities, grid) {
    grid.clear();
    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      if (!e.alive) continue;
      const k = gridKey(e.x, e.y);
      let bucket = grid.get(k);
      if (!bucket) {
        bucket = [];
        grid.set(k, bucket);
      }
      bucket.push(e);
    }
  }

  function near(grid, x, y, r, out) {
    out.length = 0;
    const r1 = r + GRID;
    const x0 = ((x - r1) / GRID) | 0;
    const x1 = ((x + r1) / GRID) | 0;
    const y0 = ((y - r1) / GRID) | 0;
    const y1 = ((y + r1) / GRID) | 0;
    const r2 = r * r;
    for (let gx = x0; gx <= x1; gx++) {
      for (let gy = y0; gy <= y1; gy++) {
        const bucket = grid.get(gx + "," + gy);
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) {
          const e = bucket[i];
          if (!e.alive) continue;
          const dx = e.x - x;
          const dy = e.y - y;
          if (dx * dx + dy * dy <= r2) out.push(e);
        }
      }
    }
    return out;
  }

  function makeState() {
    const s = {
      time: 0,
      wave: 1,
      spawnAcc: 0,
      raiseAcc: 0,
      auraAcc: 0,
      camX: WORLD / 2,
      camY: WORLD / 2,
      shake: 0,
      kills: 0,
      over: false,
      bannerT: 0,
      player: {
        x: WORLD / 2,
        y: WORLD / 2,
        r: 16,
        hp: 100,
        maxHp: 100,
        speed: 210,
        moveMult: 1,
        atkCd: 0,
        atkInterval: 0.62,
        atkSpeedMult: 1,
        atkDmg: 22,
        atkDmgMult: 1,
        atkRange: 240,
        crit: 0.08,
        dr: 0,
        magnet: 70,
        magnetMult: 1,
        maxMinions: 6,
        raiseInterval: 2.1,
        raiseRange: 220,
        raiseCount: 1,
        corpseLife: 10,
        minionDmgMult: 1,
        minionAtkSpeedMult: 1,
        minionLifesteal: 0,
        drPerMinion: 0,
        poisonBolts: false,
        raiseOnKill: false,
        deathNova: false,
        corpseExplode: true,
        explodeMult: 1.15,
        auraDps: 0,
        auraRadius: 0,
        soulHarvest: false,
        soulStacks: 0,
        facing: 1,
        frame: 0,
        iframe: 0,
        classId: "necromancer",
        taken: [],
      },
      enemies: emptyPool(MAX_ENEMIES, () => ({
        alive: false, x: 0, y: 0, r: 14, hp: 0, maxHp: 0, speed: 0, dmg: 0,
        type: "husk", xp: 4, frame: 0, hit: 0, poison: 0, poisonDps: 0, atkCd: 0,
      })),
      minions: emptyPool(MAX_MINIONS, () => ({
        alive: false, x: 0, y: 0, r: 13, hp: 0, maxHp: 0, dmg: 0, atkCd: 0,
        life: 0, frame: 0, facing: 1,
      })),
      corpses: emptyPool(MAX_CORPSES, () => ({
        alive: false, x: 0, y: 0, life: 0, r: 12,
      })),
      projs: emptyPool(MAX_PROJS, () => ({
        alive: false, x: 0, y: 0, vx: 0, vy: 0, dmg: 0, life: 0, poison: false,
      })),
      gems: emptyPool(MAX_GEMS, () => ({
        alive: false, x: 0, y: 0, val: 4, life: 18,
      })),
      fx: [],
      enemyGrid: new Map(),
      minionCount: 0,
      _near: [],
    };
    return s;
  }

  function livingMinions() {
    let n = 0;
    for (let i = 0; i < state.minions.length; i++) if (state.minions[i].alive) n++;
    state.minionCount = n;
    return n;
  }

  function harvestMult() {
    return 1 + state.player.soulStacks * 0.02;
  }

  function boltDamage() {
    return state.player.atkDmg * state.player.atkDmgMult * harvestMult();
  }

  function minionDamage() {
    return 14 * state.player.minionDmgMult * harvestMult();
  }

  function playerDr() {
    const fromArmy = Math.min(0.24, state.minionCount * state.player.drPerMinion);
    return Math.min(0.65, state.player.dr + fromArmy);
  }

  function spawnEnemy() {
    const e = acquire(state.enemies);
    if (!e) return;
    const p = state.player;
    const ang = rand() * Math.PI * 2;
    const dist = 420 + rand() * 180;
    const roll = rand();
    let type = "husk";
    let hp = 28 + state.wave * 6;
    let speed = 58 + state.wave * 1.4;
    let dmg = 8 + state.wave * 0.8;
    let r = 14;
    let xp = 5;
    if (state.time > 25 && roll > 0.72) {
      type = "runner";
      hp = 20 + state.wave * 4;
      speed = 110 + state.wave * 2;
      dmg = 7 + state.wave * 0.6;
      r = 12;
      xp = 6;
    }
    if (state.time > 45 && roll > 0.9) {
      type = "brute";
      hp = 90 + state.wave * 14;
      speed = 42;
      dmg = 16 + state.wave * 1.2;
      r = 20;
      xp = 14;
    }
    e.alive = true;
    e.x = clamp(p.x + Math.cos(ang) * dist, 40, WORLD - 40);
    e.y = clamp(p.y + Math.sin(ang) * dist, 40, WORLD - 40);
    e.hp = hp;
    e.maxHp = hp;
    e.speed = speed;
    e.dmg = dmg;
    e.type = type;
    e.xp = xp;
    e.r = r;
    e.frame = rand() * 4;
    e.hit = 0;
    e.poison = 0;
    e.poisonDps = 0;
    e.atkCd = 0;
  }

  function dropCorpse(x, y) {
    const c = acquire(state.corpses);
    if (!c) return;
    c.alive = true;
    c.x = x;
    c.y = y;
    c.life = state.player.corpseLife;
  }

  function dropGem(x, y, val) {
    const g = acquire(state.gems);
    if (!g) return;
    g.alive = true;
    g.x = x + (rand() - 0.5) * 10;
    g.y = y + (rand() - 0.5) * 10;
    g.val = val;
    g.life = 16;
  }

  function addFx(x, y, color, life, r) {
    if (state.fx.length > 40) state.fx.shift();
    state.fx.push({ x, y, color, life, max: life, r });
  }

  function killEnemy(e, creditRaise) {
    e.alive = false;
    state.kills++;
    if (state.player.soulHarvest && state.player.soulStacks < 40) {
      state.player.soulStacks++;
    }
    dropCorpse(e.x, e.y);
    dropGem(e.x, e.y, e.xp);
    addFx(e.x, e.y, "rgba(109,255,138,0.7)", 0.35, 22);
    if (creditRaise && state.player.raiseOnKill) {
      tryRaiseNear(e.x, e.y, 1);
    }
  }

  function damageEnemy(e, dmg, fromMinion) {
    e.hp -= dmg;
    e.hit = 0.12;
    if (fromMinion && state.player.minionLifesteal > 0) {
      state.player.hp = Math.min(
        state.player.maxHp,
        state.player.hp + dmg * state.player.minionLifesteal
      );
    }
    if (e.hp <= 0) killEnemy(e, true);
  }

  function explode(x, y, radius, dmg) {
    addFx(x, y, "rgba(180,80,255,0.55)", 0.28, radius);
    state.shake = Math.max(state.shake, 6);
    const list = state._near;
    near(state.enemyGrid, x, y, radius, list);
    for (let i = 0; i < list.length; i++) damageEnemy(list[i], dmg, false);
  }

  function spawnMinion(x, y) {
    const m = acquire(state.minions);
    if (!m) return false;
    m.alive = true;
    m.x = x;
    m.y = y;
    m.maxHp = 46;
    m.hp = 46;
    m.dmg = minionDamage();
    m.atkCd = 0;
    m.life = 16;
    m.frame = 0;
    m.facing = 1;
    addFx(x, y, "rgba(109,255,138,0.8)", 0.4, 28);
    return true;
  }

  function nearestCorpse(x, y, range) {
    let best = null;
    let bestD = range * range;
    for (let i = 0; i < state.corpses.length; i++) {
      const c = state.corpses[i];
      if (!c.alive) continue;
      const dx = c.x - x;
      const dy = c.y - y;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    return best;
  }

  function tryRaiseNear(x, y, count) {
    let raised = 0;
    for (let n = 0; n < count; n++) {
      const corpse = nearestCorpse(x, y, state.player.raiseRange);
      if (!corpse) break;
      corpse.alive = false;
      if (livingMinions() >= state.player.maxMinions) {
        if (state.player.corpseExplode) {
          explode(corpse.x, corpse.y, 86, boltDamage() * state.player.explodeMult);
        }
        continue;
      }
      if (spawnMinion(corpse.x, corpse.y)) raised++;
    }
    return raised;
  }

  function fireBolt(tx, ty) {
    const p = state.player;
    const d = norm(tx - p.x, ty - p.y);
    const b = acquire(state.projs);
    if (!b) return;
    b.alive = true;
    b.x = p.x;
    b.y = p.y;
    b.vx = d.x * 520;
    b.vy = d.y * 520;
    const crit = rand() < p.crit;
    b.dmg = boltDamage() * (crit ? 2 : 1);
    b.life = p.atkRange / 520;
    b.poison = p.poisonBolts;
    p.facing = d.x < 0 ? -1 : 1;
  }

  function nearestEnemy(x, y, range) {
    const list = state._near;
    near(state.enemyGrid, x, y, range, list);
    let best = null;
    let bestD = range * range;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      const dx = e.x - x;
      const dy = e.y - y;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  function gainXp(amount) {
    const p = state.player;
    p._xp = (p._xp || 0) + amount;
    p._need = p._need || xpFor(p._level || 1);
    p._level = p._level || 1;
    p._draftQueue = p._draftQueue || 0;
    while (p._xp >= p._need) {
      p._xp -= p._need;
      p._level++;
      p._need = xpFor(p._level);
      p.hp = Math.min(p.maxHp, p.hp + 8);
      p._draftQueue++;
    }
    if (p._draftQueue > 0 && !drafting) openDraft();
  }

  function openDraft() {
    if (drafting) return;
    const p = state.player;
    p._draftQueue = Math.max(0, (p._draftQueue || 1) - 1);
    drafting = true;
    const rng = Math.random;
    const offers = GravebornCards.rollOffers(3, rng, []);
    const overlay = document.getElementById("draft");
    const row = document.getElementById("cardRow");
    document.getElementById("draftLevel").textContent = "LEVEL " + (state.player._level || 1);
    row.innerHTML = "";
    offers.forEach((card, idx) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "aram-card rarity-" + card.rarity;
      el.dataset.idx = String(idx);
      const cls = card.classId === "necromancer" ? "NECROMANCER" : "GENERAL";
      el.innerHTML =
        '<div class="card-rarity">' + GravebornCards.RARITY[card.rarity].label + "</div>" +
        '<div class="card-class">' + cls + "</div>" +
        '<div class="card-icon">' + card.icon + "</div>" +
        "<h3>" + card.name + "</h3>" +
        '<p class="card-desc">' + card.desc + "</p>" +
        '<p class="card-flavor">' + card.flavor + "</p>" +
        '<span class="card-key">' + (idx + 1) + "</span>";
      el.addEventListener("click", () => pickCard(card));
      row.appendChild(el);
    });
    overlay.classList.add("open");
    overlay.dataset.ready = "1";
    state._offers = offers;
    showBanner("LEVEL " + state.player._level);
  }

  function pickCard(card) {
    if (!drafting) return;
    card.apply(state);
    state.player.taken.push(card.id);
    drafting = false;
    document.getElementById("draft").classList.remove("open");
    showBanner(card.name);
    if ((state.player._draftQueue || 0) > 0) {
      openDraft();
    }
  }

  function showBanner(text) {
    hud.banner.textContent = text;
    hud.banner.classList.add("show");
    state.bannerT = 1.4;
  }

  function hurtPlayer(dmg) {
    const p = state.player;
    if (p.iframe > 0 || state.over) return;
    const taken = dmg * (1 - playerDr());
    p.hp -= taken;
    p.iframe = 0.45;
    state.shake = 8;
    if (p.hp <= 0) {
      p.hp = 0;
      state.over = true;
      document.getElementById("overTitle").textContent = "The grave is full";
      document.getElementById("overStats").textContent =
        "Survived " + formatTime(state.time) + " · " + state.kills + " kills · Level " + (p._level || 1);
      document.getElementById("over").classList.add("open");
    }
  }

  function formatTime(t) {
    const m = (t / 60) | 0;
    const s = (t | 0) % 60;
    return m + ":" + String(s).padStart(2, "0");
  }

  function inputDir() {
    let x = joy.dx;
    let y = joy.dy;
    if (keys["KeyW"] || keys["ArrowUp"]) y -= 1;
    if (keys["KeyS"] || keys["ArrowDown"]) y += 1;
    if (keys["KeyA"] || keys["ArrowLeft"]) x -= 1;
    if (keys["KeyD"] || keys["ArrowRight"]) x += 1;
    const d = Math.hypot(x, y);
    if (d < 0.15) return { x: 0, y: 0 };
    return { x: x / d, y: y / d };
  }

  function update(dt) {
    if (state.over || drafting) return;
    const p = state.player;
    state.time += dt;
    state.wave = 1 + ((state.time / 22) | 0);
    p.iframe = Math.max(0, p.iframe - dt);
    p.atkCd = Math.max(0, p.atkCd - dt);
    state.raiseAcc += dt;
    state.auraAcc += dt;
    state.shake *= 0.88;
    if (state.bannerT > 0) {
      state.bannerT -= dt;
      if (state.bannerT <= 0) hud.banner.classList.remove("show");
    }

    const dir = inputDir();
    p.x = clamp(p.x + dir.x * p.speed * p.moveMult * dt, 24, WORLD - 24);
    p.y = clamp(p.y + dir.y * p.speed * p.moveMult * dt, 24, WORLD - 24);
    if (dir.x !== 0) p.facing = dir.x < 0 ? -1 : 1;
    p.frame += dt * (dir.x || dir.y ? 10 : 4);

    const spawnEvery = Math.max(0.28, 1.05 - state.wave * 0.07);
    state.spawnAcc += dt;
    while (state.spawnAcc >= spawnEvery) {
      state.spawnAcc -= spawnEvery;
      spawnEnemy();
    }

    rebuildGrid(state.enemies, state.enemyGrid);

    const target = nearestEnemy(p.x, p.y, p.atkRange);
    if (target && p.atkCd <= 0) {
      fireBolt(target.x, target.y);
      p.atkCd = p.atkInterval / p.atkSpeedMult;
    }

    if (state.raiseAcc >= p.raiseInterval) {
      state.raiseAcc = 0;
      tryRaiseNear(p.x, p.y, p.raiseCount);
    }

    if (p.auraDps > 0 && state.auraAcc >= 0.4) {
      state.auraAcc = 0;
      const list = state._near;
      near(state.enemyGrid, p.x, p.y, p.auraRadius, list);
      for (let i = 0; i < list.length; i++) damageEnemy(list[i], p.auraDps * 0.4, false);
    }

    // projectiles
    for (let i = 0; i < state.projs.length; i++) {
      const b = state.projs[i];
      if (!b.alive) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0) {
        b.alive = false;
        continue;
      }
      const hit = nearestEnemy(b.x, b.y, 16);
      if (hit) {
        damageEnemy(hit, b.dmg, false);
        if (b.poison) {
          hit.poison = 3;
          hit.poisonDps = b.dmg * 0.18;
        }
        b.alive = false;
      }
    }

    // enemies
    for (let i = 0; i < state.enemies.length; i++) {
      const e = state.enemies[i];
      if (!e.alive) continue;
      e.frame += dt * 8;
      e.hit = Math.max(0, e.hit - dt);
      if (e.poison > 0) {
        e.poison -= dt;
        damageEnemy(e, e.poisonDps * dt, false);
        if (!e.alive) continue;
      }
      const to = norm(p.x - e.x, p.y - e.y);
      e.x += to.x * e.speed * dt;
      e.y += to.y * e.speed * dt;
      e.atkCd = Math.max(0, e.atkCd - dt);
      const ddx = e.x - p.x;
      const ddy = e.y - p.y;
      if (ddx * ddx + ddy * ddy < (e.r + p.r) * (e.r + p.r) && e.atkCd <= 0) {
        hurtPlayer(e.dmg);
        e.atkCd = 0.9;
      }
    }

    // minions
    for (let i = 0; i < state.minions.length; i++) {
      const m = state.minions[i];
      if (!m.alive) continue;
      m.life -= dt;
      m.frame += dt * 9;
      m.atkCd = Math.max(0, m.atkCd - dt);
      if (m.life <= 0 || m.hp <= 0) {
        m.alive = false;
        if (state.player.deathNova) explode(m.x, m.y, 80, 90);
        continue;
      }
      const prey = nearestEnemy(m.x, m.y, 340);
      if (prey) {
        const ddx = prey.x - m.x;
        const ddy = prey.y - m.y;
        const dist = Math.hypot(ddx, ddy);
        m.facing = ddx < 0 ? -1 : 1;
        if (dist > 22) {
          m.x += (ddx / dist) * 150 * dt;
          m.y += (ddy / dist) * 150 * dt;
        } else if (m.atkCd <= 0) {
          damageEnemy(prey, minionDamage(), true);
          m.atkCd = 0.7 / state.player.minionAtkSpeedMult;
        }
      }
    }
    livingMinions();

    // corpses + gems
    const mag = p.magnet * p.magnetMult;
    for (let i = 0; i < state.corpses.length; i++) {
      const c = state.corpses[i];
      if (!c.alive) continue;
      c.life -= dt;
      if (c.life <= 0) c.alive = false;
    }
    for (let i = 0; i < state.gems.length; i++) {
      const g = state.gems[i];
      if (!g.alive) continue;
      g.life -= dt;
      const dx = p.x - g.x;
      const dy = p.y - g.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < mag * mag) {
        const d = Math.sqrt(d2) || 1;
        g.x += (dx / d) * 320 * dt;
        g.y += (dy / d) * 320 * dt;
      }
      if (d2 < 22 * 22) {
        g.alive = false;
        gainXp(g.val);
      } else if (g.life <= 0) g.alive = false;
    }

    for (let i = state.fx.length - 1; i >= 0; i--) {
      state.fx[i].life -= dt;
      if (state.fx[i].life <= 0) state.fx.splice(i, 1);
    }

    state.camX += (p.x - state.camX) * Math.min(1, dt * 8);
    state.camY += (p.y - state.camY) * Math.min(1, dt * 8);
  }

  function resize() {
    const wrap = canvas.parentElement;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(320, w * dpr);
    canvas.height = Math.max(240, h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const shakeX = (rand() - 0.5) * state.shake;
    const shakeY = (rand() - 0.5) * state.shake;
    const camX = state.camX - w / 2 + shakeX;
    const camY = state.camY - h / 2 + shakeY;
    ctx.fillStyle = "#0b0a10";
    ctx.fillRect(0, 0, w, h);

    const x0 = ((camX / TILE) | 0) - 1;
    const y0 = ((camY / TILE) | 0) - 1;
    const x1 = (((camX + w) / TILE) | 0) + 1;
    const y1 = (((camY + h) / TILE) | 0) + 1;
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const shade = (tx + ty) & 1 ? "#14121c" : "#101018";
        ctx.fillStyle = shade;
        ctx.fillRect(tx * TILE - camX, ty * TILE - camY, TILE - 1, TILE - 1);
        if (((tx * 13 + ty * 7) & 7) === 0) {
          ctx.fillStyle = "#1c1826";
          ctx.fillRect(tx * TILE - camX + 18, ty * TILE - camY + 20, 10, 6);
        }
      }
    }

    function inView(x, y, pad) {
      return x > camX - pad && x < camX + w + pad && y > camY - pad && y < camY + h + pad;
    }

    for (let i = 0; i < state.corpses.length; i++) {
      const c = state.corpses[i];
      if (!c.alive || !inView(c.x, c.y, 20)) continue;
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(state.time * 6 + c.x);
      GravebornSprites.draw(ctx, "corpse", c.x - camX, c.y - camY, 1.1, 0, false);
      ctx.globalAlpha = 1;
    }

    for (let i = 0; i < state.gems.length; i++) {
      const g = state.gems[i];
      if (!g.alive || !inView(g.x, g.y, 12)) continue;
      GravebornSprites.draw(ctx, "gem", g.x - camX, g.y - camY, 0.7, 0, false);
    }

    for (let i = 0; i < state.enemies.length; i++) {
      const e = state.enemies[i];
      if (!e.alive || !inView(e.x, e.y, 24)) continue;
      if (e.hit > 0) ctx.filter = "brightness(2)";
      GravebornSprites.draw(ctx, e.type, e.x - camX, e.y - camY, e.type === "brute" ? 1.6 : 1.25, e.frame | 0, e.x < state.player.x);
      ctx.filter = "none";
    }

    for (let i = 0; i < state.minions.length; i++) {
      const m = state.minions[i];
      if (!m.alive || !inView(m.x, m.y, 20)) continue;
      GravebornSprites.draw(ctx, "skeleton", m.x - camX, m.y - camY, 1.15, m.frame | 0, m.facing < 0);
    }

    const p = state.player;
    if (p.auraRadius > 0) {
      ctx.strokeStyle = "rgba(109,255,138,0.25)";
      ctx.beginPath();
      ctx.arc(p.x - camX, p.y - camY, p.auraRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = p.iframe > 0 ? 0.55 : 1;
    GravebornSprites.draw(ctx, "necro", p.x - camX, p.y - camY, 1.55, p.frame | 0, p.facing < 0);
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#d4b8ff";
    for (let i = 0; i < state.projs.length; i++) {
      const b = state.projs[i];
      if (!b.alive) continue;
      ctx.beginPath();
      ctx.arc(b.x - camX, b.y - camY, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < state.fx.length; i++) {
      const f = state.fx[i];
      ctx.globalAlpha = f.life / f.max;
      ctx.strokeStyle = f.color;
      ctx.beginPath();
      ctx.arc(f.x - camX, f.y - camY, f.r * (1.2 - f.life / f.max), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (joy.show) {
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.beginPath();
      ctx.arc(joy.ox, joy.oy, 48, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(180,140,255,0.45)";
      ctx.beginPath();
      ctx.arc(joy.ox + joy.dx * 28, joy.oy + joy.dy * 28, 18, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function syncHud() {
    const p = state.player;
    const lvl = p._level || 1;
    const xp = p._xp || 0;
    const need = p._need || xpFor(1);
    hud.hpFill.style.width = (100 * p.hp) / p.maxHp + "%";
    hud.xpFill.style.width = (100 * xp) / need + "%";
    hud.hpText.textContent = Math.ceil(p.hp) + " / " + p.maxHp;
    hud.levelText.textContent = "Lv " + lvl;
    hud.armyText.textContent = state.minionCount + " / " + p.maxMinions;
    hud.killText.textContent = String(state.kills);
    hud.timeText.textContent = formatTime(state.time);
  }

  function loop(t) {
    const dt = Math.min(0.033, (t - lastT) / 1000 || 0.016);
    lastT = t;
    update(dt);
    draw();
    syncHud();
    raf = requestAnimationFrame(loop);
  }

  function startRun() {
    state = makeState();
    state.player._xp = 0;
    state.player._level = 1;
    state.player._need = xpFor(1);
    drafting = false;
    document.getElementById("draft").classList.remove("open");
    document.getElementById("over").classList.remove("open");
    document.getElementById("title").classList.remove("open");
    showBanner("Raise the dead");
    for (let i = 0; i < 10; i++) spawnEnemy();
  }

  function bindInput() {
    window.addEventListener("keydown", (e) => {
      keys[e.code] = true;
      if (drafting && state._offers) {
        const n = e.key === "1" ? 0 : e.key === "2" ? 1 : e.key === "3" ? 2 : -1;
        if (n >= 0 && state._offers[n]) pickCard(state._offers[n]);
      }
      if (e.code === "Enter" && state && state.over) startRun();
    });
    window.addEventListener("keyup", (e) => {
      keys[e.code] = false;
    });

    function joyFrom(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      if (!joy.show) {
        joy.ox = x;
        joy.oy = y;
        joy.show = true;
      }
      const dx = x - joy.ox;
      const dy = y - joy.oy;
      const d = Math.hypot(dx, dy) || 1;
      const cap = Math.min(1, d / 48);
      joy.dx = (dx / d) * cap;
      joy.dy = (dy / d) * cap;
    }

    canvas.addEventListener("pointerdown", (e) => {
      if (e.clientX > window.innerWidth * 0.62) return;
      pointer.active = true;
      pointer.id = e.pointerId;
      canvas.setPointerCapture(e.pointerId);
      joyFrom(e.clientX, e.clientY);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!pointer.active || e.pointerId !== pointer.id) return;
      joyFrom(e.clientX, e.clientY);
    });
    function endJoy(e) {
      if (pointer.id != null && e.pointerId !== pointer.id) return;
      pointer.active = false;
      pointer.id = null;
      joy.show = false;
      joy.dx = 0;
      joy.dy = 0;
    }
    canvas.addEventListener("pointerup", endJoy);
    canvas.addEventListener("pointercancel", endJoy);
  }

  window.addEventListener("resize", resize);
  document.getElementById("btnPlay").addEventListener("click", startRun);
  document.getElementById("btnHow").addEventListener("click", () => {
    document.getElementById("how").classList.toggle("open");
  });
  document.getElementById("btnAgain").addEventListener("click", startRun);

  resize();
  bindInput();
  state = makeState();
  document.getElementById("title").classList.add("open");
  lastT = performance.now();
  raf = requestAnimationFrame(loop);

  // Dev hook for tests / debug.
  window.Graveborn = { startRun, getState: () => state, pickCard, openDraft };
})();
