/* ============================================================
   RealtyRush — Full Game Logic
   Local multiplayer (pass-and-play) real estate board game
   ============================================================ */

(() => {
"use strict";

// ─── PLAYER COLORS ─────────────────────────────────────────
const COLORS = ["#e74c3c","#3498db","#2ecc71","#f1c40f","#9b59b6","#e67e22"];

// ─── MODE CONFIG ────────────────────────────────────────────
const MODE_CFG = {
  quick:    { cash: 60000, pay: 4000, label: "Quick Game" },
  standard: { cash: 80000, pay: 6000, label: "Standard" },
  empire:   { cash: 100000, pay: 8000, label: "Empire Mode" },
};

// ─── BOARD DEFINITION (56 tiles, clockwise from bottom-left) ─
// Side A: tiles 0(HQ corner) → 13(City Hall) = bottom row L→R
// Side B: tiles 14(City Hall+1) → 27 = left col B→T  (actually top-left up)
// Remap: We go clockwise:
//   Bottom side (L→R): tile 0=HQ … tile 13=corner
//   Right side (B→T): 14…27
//   Top side (R→L): 28…41
//   Left side (T→B): 42…55
// Corners: 0=HQ, 14=City Hall, 28=Police Precinct, 42=Underground Market

function buildBoard() {
  const board = new Array(56);

  // Helper
  const prop = (i, name, price, income, fine, side) =>
    ({ type:"property", name, basePrice:price, baseIncome:income, baseFine:fine, side,
       ownerId:null, tier:1, upgradeInProgress:false, upgradeRound:0 });

  // ─ Corners ─
  board[0]  = { type:"corner", name:"Headquarters", corner:"hq" };
  board[14] = { type:"corner", name:"City Hall", corner:"cityhall" };
  board[28] = { type:"corner", name:"Police Precinct", corner:"police" };
  board[42] = { type:"corner", name:"Underground Market", corner:"underground" };

  // ─ Side A: Downtown Core (tiles 1-13, 8 props + 1 taxi + special) ─
  board[1]  = prop(1, "Capital Tower",    85000,5500,8000,"A");
  board[2]  = prop(2, "Exchange Plaza",   78000,5000,7500,"A");
  board[3]  = { type:"taxi", name:"Central Depot", side:"A", ownerId:null };
  board[4]  = prop(4, "Prestige Centre",  72000,4600,7000,"A");
  board[5]  = prop(5, "Financial Row",    65000,4200,6500,"A");
  board[6]  = { type:"tax", name:"Tax Office" };
  board[7]  = prop(7, "Skyline Drive",    58000,3800,6000,"A");
  board[8]  = prop(8, "Commerce Street",  52000,3400,5500,"A");
  board[9]  = { type:"momentum", name:"Momentum" };
  board[10] = prop(10,"Midrise Avenue",   46000,3000,5000,"A");
  board[11] = { type:"underground_card", name:"Back Alley Deal" };
  board[12] = prop(11,"Business Lane",    40000,2600,4500,"A");
  board[13] = { type:"bank", name:"First National Bank" };

  // ─ Side B: Resort Strip (tiles 15-27) ─
  board[15] = prop(15,"Grand Marina",     42000,2800,4200,"B");
  board[16] = prop(16,"Oceanfront Hotel", 38000,2500,3800,"B");
  board[17] = { type:"taxi", name:"Beachfront Terminal", side:"B", ownerId:null };
  board[18] = prop(18,"Sunset Boardwalk", 35000,2300,3500,"B");
  board[19] = prop(19,"Palm Boulevard",   32000,2100,3200,"B");
  board[20] = { type:"unlucky", name:"Unlucky Drop" };
  board[21] = prop(21,"Harbour View",     28000,1900,2900,"B");
  board[22] = prop(22,"Beachside Retreat",25000,1700,2600,"B");
  board[23] = { type:"momentum", name:"Momentum" };
  board[24] = prop(24,"Coastal Commons",  22000,1500,2300,"B");
  board[25] = prop(25,"Sandy Shores",     18000,1300,2000,"B");
  board[26] = { type:"free", name:"Free Roam" };
  board[27] = { type:"bank", name:"Community Credit Union" };

  // ─ Side C: Midtown (tiles 29-41) ─
  board[29] = prop(29,"Uptown Flats",     20000,1400,2100,"C");
  board[30] = prop(30,"Central Market",   18000,1250,1900,"C");
  board[31] = { type:"taxi", name:"Crosstown Hub", side:"C", ownerId:null };
  board[32] = prop(32,"Riverside Complex",16000,1100,1700,"C");
  board[33] = prop(33,"Metro Commons",    14000, 980,1500,"C");
  board[34] = { type:"tax", name:"City Tax Bureau" };
  board[35] = prop(35,"Greenway Apts",    12000, 860,1300,"C");
  board[36] = prop(36,"Junction Square",  10500, 750,1150,"C");
  board[37] = { type:"underground_card", name:"Shady Contact" };
  board[38] = prop(38,"Park Place",        9000, 650,1000,"C");
  board[39] = prop(39,"Cross Street",      7500, 560, 850,"C");
  board[40] = { type:"unlucky", name:"Unlucky Drop" };
  board[41] = { type:"momentum", name:"Momentum" };

  // ─ Side D: Suburbs (tiles 43-55) ─
  board[43] = prop(43,"Maple Grove",   8000,580,900,"D");
  board[44] = prop(44,"Elmwood Estate",7000,510,800,"D");
  board[45] = { type:"taxi", name:"Eastside Station", side:"D", ownerId:null };
  board[46] = prop(46,"Birchwood Lane",6500,470,720,"D");
  board[47] = prop(47,"Cedar Heights", 6000,430,660,"D");
  board[48] = { type:"lucky", name:"Lucky Drop" };
  board[49] = prop(49,"Oak Park",      5500,400,610,"D");
  board[50] = prop(50,"Willow Creek",  5000,370,560,"D");
  board[51] = { type:"lucky", name:"Lucky Drop" };
  board[52] = prop(52,"Pine Ridge",    4500,340,510,"D");
  board[53] = prop(53,"Meadow View",   4000,310,460,"D");
  board[54] = { type:"lucky", name:"Lucky Drop" };
  board[55] = { type:"free", name:"Free Roam" };

  return board;
}

// ─── TILE POSITION HELPERS ──────────────────────────────────
// Board layout: 14 tiles per side, rendered as a square
// Bottom: tiles 0..13 (L to R)
// Right:  tiles 14..27 (B to T)
// Top:    tiles 28..41 (R to L)
// Left:   tiles 42..55 (T to B)

const TILE_SIZE = 110;
const BOARD_PX = 14 * TILE_SIZE; // 1540px

function tilePos(idx) {
  if (idx < 14) { // bottom row L→R
    return { col: idx, row: 13 };
  } else if (idx < 28) { // right col B→T
    return { col: 13, row: 13 - (idx - 14) };
  } else if (idx < 42) { // top row R→L
    return { col: 13 - (idx - 28), row: 0 };
  } else { // left col T→B
    return { col: 0, row: idx - 42 };
  }
}

function tilePx(idx) {
  const p = tilePos(idx);
  return { x: p.col * TILE_SIZE, y: p.row * TILE_SIZE };
}

// ─── SIDE COLORS ────────────────────────────────────────────
const SIDE_COLORS = { A:"#e74c3c", B:"#3498db", C:"#2ecc71", D:"#f1c40f" };
const CORNER_COLORS = { hq:"#00d4aa", cityhall:"#8b5cf6", police:"#ef4444", underground:"#f59e0b" };

// ─── CARTEL CARDS ───────────────────────────────────────────
const CARTEL_DECK = [
  { id:"arson", name:"Arson", desc:"Destroy one tier of a target property. At T1 becomes vacant → auction.", heat:2, type:"offense", needsTarget:true, needsProperty:true },
  { id:"armed_robbery", name:"Armed Robbery", desc:"Steal 1 round of passive income from a target property.", heat:2, type:"offense", needsTarget:true, needsProperty:true },
  { id:"extortion", name:"Extortion", desc:"Force player to pay you $5,000 or lose a random upgrade.", heat:2, type:"offense", needsTarget:true },
  { id:"bribery", name:"Bribery", desc:"Skip paying a trespassing fine entirely.", heat:1, type:"defense" },
  { id:"money_laundering", name:"Money Laundering", desc:"Hide net worth for 2 rounds.", heat:1, type:"utility" },
  { id:"hostile_acquisition", name:"Hostile Acquisition", desc:"Force distressed player (<$10k) to sell you a property at half price.", heat:2, type:"offense", needsTarget:true },
  { id:"smear_campaign", name:"Smear Campaign", desc:"Target loses auction priority for 2 rounds.", heat:1, type:"offense", needsTarget:true },
  { id:"cartel_alliance", name:"Cartel Alliance", desc:"No fines between you and target for 3 rounds.", heat:0, type:"utility", needsTarget:true },
  { id:"tipoff", name:"Tip-Off", desc:"If target heat 3+, they are arrested immediately.", heat:0, type:"offense", needsTarget:true },
  { id:"clean_record", name:"Clean Record", desc:"Reset your heat to 0.", heat:0, type:"utility", rare:true },
  { id:"security_system", name:"Security System", desc:"Blocks next cartel action on your properties.", heat:0, type:"defense" },
  { id:"legal_team", name:"Legal Team", desc:"Nullifies incoming extortion or lawsuit.", heat:0, type:"defense" },
  { id:"rebuild", name:"Rebuild", desc:"Restore one destroyed property tier for free.", heat:0, type:"utility" },
];

// ─── STOCKS ─────────────────────────────────────────────────
const STOCK_DEFS = [
  { id:"novatech", name:"NovaTech", sector:"Tech", volatility:3, basePrice:50 },
  { id:"riverside_reit", name:"Riverside REIT", sector:"Real Estate", volatility:2, basePrice:40 },
  { id:"goldrush", name:"GoldRush Mining", sector:"Commodities", volatility:3, basePrice:35 },
  { id:"metro_transit", name:"Metro Transit Co.", sector:"Infrastructure", volatility:1, basePrice:30 },
  { id:"coastal_resorts", name:"Coastal Resorts", sector:"Tourism", volatility:2, basePrice:25 },
  { id:"harbor_bank", name:"Harbor Bank", sector:"Finance", volatility:1, basePrice:45 },
  { id:"neon_nightlife", name:"Neon Nightlife", sector:"Entertainment", volatility:3, basePrice:20 },
  { id:"bubble", name:"??? Corp", sector:"???", volatility:4, basePrice:10, isBubble:true },
];

// ─── UTILITY ────────────────────────────────────────────────
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }
function rng(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function fmt(n) { return "$" + n.toLocaleString(); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ============================================================
// GAME CLASS
// ============================================================
class RealtyRush {
  constructor() {
    this.board = [];
    this.players = [];
    this.mode = "quick";
    this.targetNetWorth = 500000;
    this.round = 1;
    this.currentPlayerIdx = 0;
    this.phase = "idle"; // idle, rolling, moving, action, endturn
    this.auctionTimer = 0;
    this.stocks = [];
    this.stockTimer = 0;
    this.bubblePop = false;
    this.bubblePopRound = 0;
    this.lastStockUpdate = 0;
    this.animFrame = null;
    this.cameraX = 0;
    this.cameraY = 0;
    this.cameraZoom = 1;
    this.targetCamX = 0;
    this.targetCamY = 0;
    this.targetCamZoom = 1;
    this.tokenAnimations = [];
    this.canvas = null;
    this.ctx = null;

    // ─ Multiplayer state ─
    this.socket = null;
    this.multiplayer = false;
    this.roomCode = null;
    this.isHost = false;
    this.mySocketId = null;
    this.myPlayerIdx = -1; // which player index this client controls
    this.lobbyPlayers = []; // [{socketId, name, color}]

    this.initLobby();
  }

  // ─── LOBBY ────────────────────────────────────────────────
  initLobby() {
    const addBtn = $("#addPlayer");
    const removeBtn = $("#removePlayer");
    const startBtn = $("#startGame");

    addBtn.onclick = () => this.addPlayerSlot();
    removeBtn.onclick = () => this.removePlayerSlot();
    startBtn.onclick = () => this.startGame();

    // Mode buttons (for both local and online lobbies)
    $$(".mode-btn").forEach(b => {
      b.onclick = () => {
        const lobby = b.dataset.lobby || "local";
        $$(`.mode-btn[data-lobby="${lobby}"]`).forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        this.mode = b.dataset.mode;
        if (lobby === "local") {
          $("#quickTarget").style.display = this.mode === "quick" ? "block" : "none";
        } else {
          $("#onlineQuickTarget").style.display = this.mode === "quick" ? "block" : "none";
          // Broadcast mode change if host
          if (this.isHost && this.socket) {
            this.socket.emit("rr:setMode", { mode: this.mode });
          }
        }
      };
    });

    // Load username from localStorage
    try {
      const ud = JSON.parse(localStorage.getItem("user_data") || "{}");
      if (ud.username) {
        const nameInput = $("#onlineName");
        if (nameInput) nameInput.value = ud.username;
      }
    } catch(e) {}
  }

  // ─── LOBBY TAB SWITCHING ──────────────────────────────────
  switchLobbyTab(tab) {
    if (tab === "online") {
      $("#localLobby").style.display = "none";
      $("#onlineLobby").style.display = "block";
      $("#tabLocal").classList.remove("active");
      $("#tabOnline").classList.add("active");
    } else {
      $("#localLobby").style.display = "block";
      $("#onlineLobby").style.display = "none";
      $("#tabLocal").classList.add("active");
      $("#tabOnline").classList.remove("active");
    }
  }

  // ─── SOCKET CONNECTION ────────────────────────────────────
  connectSocket() {
    if (this.socket) return;
    const host = window.location.hostname === "localhost"
      ? "http://localhost:3001"
      : "https://www.zecrugames.com";

    this.setConnStatus("connecting", "Connecting...");
    this.socket = io(host, { transports: ["websocket", "polling"] });

    this.socket.on("connect", () => {
      this.mySocketId = this.socket.id;
      this.setConnStatus("connected", "Connected");
    });

    this.socket.on("disconnect", () => {
      this.setConnStatus("disconnected", "Disconnected");
    });

    // ── Room events ──
    this.socket.on("rr:roomCreated", (data) => {
      this.roomCode = data.code;
      this.isHost = true;
      this.lobbyPlayers = data.players || [];
      this.showRoomWaiting();
    });

    this.socket.on("rr:roomJoined", (data) => {
      this.roomCode = data.code;
      this.isHost = (data.hostId === this.mySocketId);
      this.lobbyPlayers = data.players || [];
      this.showRoomWaiting();
    });

    this.socket.on("rr:roomUpdate", (data) => {
      this.lobbyPlayers = data.players || [];
      this.isHost = (data.hostId === this.mySocketId);
      this.updateLobbyPlayerList();
      if (this.isHost) {
        $("#startOnlineGame").style.display = this.lobbyPlayers.length >= 2 ? "block" : "none";
        $("#waitingMsg").style.display = "none";
      } else {
        $("#startOnlineGame").style.display = "none";
        $("#waitingMsg").style.display = "block";
      }
    });

    this.socket.on("rr:modeChanged", (data) => {
      this.mode = data.mode;
      $$('.mode-btn[data-lobby="online"]').forEach(b => {
        b.classList.toggle("active", b.dataset.mode === data.mode);
      });
      $("#onlineQuickTarget").style.display = this.mode === "quick" ? "block" : "none";
    });

    this.socket.on("rr:gameStart", (data) => {
      this.mode = data.mode;
      this.targetNetWorth = data.targetNetWorth || 500000;
      this.multiplayer = true;
      // Determine which player index we control
      this.myPlayerIdx = data.players.findIndex(p => p.socketId === this.mySocketId);
      this.startOnlineGame(data.players, data.seed);
    });

    // ── In-game sync events ──
    this.socket.on("rr:rolled", (data) => {
      // Another player rolled — animate their move
      if (data.playerIdx === this.myPlayerIdx) return; // ignore our own echo
      this.showRollFlash(data.roll);
      setTimeout(() => {
        this.movePlayer(this.players[data.playerIdx], data.roll);
      }, 1600);
    });

    this.socket.on("rr:action", (data) => {
      // Remote player performed an action — apply it
      if (data.playerIdx === this.myPlayerIdx) return;
      this.applyRemoteAction(data);
    });

    this.socket.on("rr:endTurn", (data) => {
      if (data.playerIdx === this.myPlayerIdx) return;
      this.endTurnRemote();
    });

    this.socket.on("rr:stateSync", (data) => {
      // Full state sync from host (periodic or on request)
      this.applySyncState(data);
    });

    this.socket.on("rr:playerLeft", (data) => {
      if (this.players[data.playerIdx]) {
        this.eliminatePlayer(this.players[data.playerIdx]);
      }
    });

    this.socket.on("rr:auctionBid", (data) => {
      if (data.playerIdx === this.myPlayerIdx) return;
      this._auctionBid(data.amount);
    });

    this.socket.on("rr:auctionPass", (data) => {
      if (data.playerIdx === this.myPlayerIdx) return;
      this._auctionPass();
    });

    this.socket.on("rr:stockTrade", (data) => {
      if (data.playerIdx === this.myPlayerIdx) return;
      const p = this.players[data.playerIdx];
      if (data.action === "buy") {
        const s = this.stocks.find(x => x.id === data.stockId);
        if (s && p.cash >= s.price) {
          p.cash -= s.price;
          p.stocks[data.stockId] = (p.stocks[data.stockId] || 0) + 1;
        }
      } else {
        const s = this.stocks.find(x => x.id === data.stockId);
        if (s && p.stocks[data.stockId] > 0) {
          p.stocks[data.stockId]--;
          p.cash += s.price;
        }
      }
      this.updateHUD();
      this.updateStockUI();
    });

    this.socket.on("rr:cartelPlayed", (data) => {
      if (data.playerIdx === this.myPlayerIdx) return;
      this.executeCartelCard(data.cardIdx, data.targetId);
    });
  }

  setConnStatus(cls, text) {
    const el = $("#connectionStatus");
    if (!el) return;
    el.className = "conn-status " + cls;
    el.textContent = text;
  }

  // ─── CREATE / JOIN ROOM ───────────────────────────────────
  createRoom() {
    this.connectSocket();
    const name = ($("#onlineName").value || "").trim() || "Player";
    this.socket.emit("rr:createRoom", { name });
  }

  joinRoom() {
    const code = ($("#roomCodeInput").value || "").trim().toUpperCase();
    if (code.length < 4) return;
    this.connectSocket();
    const name = ($("#onlineName").value || "").trim() || "Player";
    this.socket.emit("rr:joinRoom", { code, name });
  }

  showRoomWaiting() {
    $("#onlinePreRoom").style.display = "none";
    $("#roomWaiting").style.display = "block";
    $("#roomCodeDisplay").textContent = this.roomCode;
    this.updateLobbyPlayerList();

    if (this.isHost) {
      $("#startOnlineGame").style.display = this.lobbyPlayers.length >= 2 ? "block" : "none";
      $("#startOnlineGame").onclick = () => this.hostStartGame();
      $("#waitingMsg").style.display = "none";
    } else {
      $("#startOnlineGame").style.display = "none";
      $("#waitingMsg").style.display = "block";
    }
  }

  updateLobbyPlayerList() {
    const el = $("#lobbyPlayerList");
    if (!el) return;
    el.innerHTML = "";
    this.lobbyPlayers.forEach((p, i) => {
      const div = document.createElement("div");
      div.className = "lobby-player-item";
      div.innerHTML = `
        <span class="lp-color" style="background:${COLORS[i]}"></span>
        <span class="lp-name">${p.name}</span>
        ${p.isHost ? '<span class="lp-host">HOST</span>' : ""}
      `;
      el.appendChild(div);
    });
    const countEl = $("#lobbyPlayerCount");
    if (countEl) countEl.textContent = this.lobbyPlayers.length;
  }

  hostStartGame() {
    if (!this.isHost || this.lobbyPlayers.length < 2) return;
    const target = this.mode === "quick" ?
      Math.max(100000, parseInt($("#onlineTargetNetWorth").value) || 500000) : 500000;
    this.socket.emit("rr:startGame", {
      mode: this.mode,
      targetNetWorth: target,
      seed: Math.floor(Math.random() * 999999),
    });
  }

  // ─── START ONLINE GAME ────────────────────────────────────
  startOnlineGame(playerList, seed) {
    const cfg = MODE_CFG[this.mode];

    // Build board
    this.board = buildBoard();

    // Build players from lobby list
    this.players = [];
    playerList.forEach((lp, i) => {
      this.players.push({
        id: i,
        name: lp.name,
        color: COLORS[i],
        socketId: lp.socketId,
        cash: cfg.cash,
        debt: 0,
        debtRounds: 0,
        heat: 0,
        heatDecayCounter: 0,
        jail: 0,
        pos: 0,
        properties: [],
        taxis: [],
        cartelHand: [],
        stocks: {},
        lawsuitLosses: 0,
        eliminated: false,
        hqPassStreak: 0,
        moneyHidden: false,
        moneyHiddenRounds: 0,
        smearRounds: 0,
        allianceWith: null,
        allianceRounds: 0,
        securityActive: false,
        legalTeamActive: false,
        playedCardThisTurn: false,
        lastStand: false,
      });
    });

    // Seeded RNG for stock market consistency
    this._seed = seed;

    // Init stocks (same as local)
    this.stocks = STOCK_DEFS.map(s => ({
      ...s,
      price: s.basePrice,
      prevPrice: s.basePrice,
      trend: 0,
      trendRounds: 0,
      history: [s.basePrice],
    }));
    this.bubblePop = false;
    this.bubblePopRound = 15 + (seed % 11); // deterministic from seed

    this.round = 1;
    this.currentPlayerIdx = 0;
    this.phase = "preturn";
    this.auctionTimer = 5;

    // Switch screens
    $("#lobby").classList.remove("active");
    $("#game").classList.add("active");

    // Setup canvas
    this.canvas = $("#boardCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.canvas.width = BOARD_PX;
    this.canvas.height = BOARD_PX;
    this.resetCamera();
    this.onResize();
    window.onresize = () => this.onResize();
    $("#boardWrap").onwheel = (e) => {
      e.preventDefault();
      const d = e.deltaY > 0 ? -0.1 : 0.1;
      this.targetCamZoom = clamp(this.targetCamZoom + d, 0.4, 2.5);
    };

    this.updateHUD();
    this.updateStockUI();
    this.renderLoop();
    $("#stockToggle").onclick = () => {
      $("#stockTicker").classList.toggle("collapsed");
    };

    this.beginTurn();
  }

  // ─── IS MY TURN (multiplayer check) ──────────────────────
  isMyTurn() {
    if (!this.multiplayer) return true; // local game: always your turn
    return this.currentPlayerIdx === this.myPlayerIdx;
  }

  // ─── EMIT GAME EVENT ──────────────────────────────────────
  emit(event, data = {}) {
    if (this.multiplayer && this.socket) {
      this.socket.emit(event, { ...data, playerIdx: this.myPlayerIdx, roomCode: this.roomCode });
    }
  }

  // ─── APPLY REMOTE ACTION ──────────────────────────────────
  applyRemoteAction(data) {
    const p = this.players[data.playerIdx];
    if (!p) return;
    switch (data.type) {
      case "buyProperty":
        this.board[data.tileIdx].ownerId = p.id;
        p.properties.push(data.tileIdx);
        p.cash -= this.board[data.tileIdx].basePrice;
        break;
      case "buyTaxi":
        this.board[data.tileIdx].ownerId = p.id;
        p.taxis.push(data.tileIdx);
        p.cash -= 22000;
        break;
      case "upgradeProperty": {
        const tile = this.board[data.tileIdx];
        const cost = this.tierUpgradeCost(tile);
        p.cash -= cost;
        tile.upgradeInProgress = true;
        tile.upgradeRound = this.round;
        break;
      }
      case "payFine": {
        const tile = this.board[data.tileIdx];
        const owner = this.players[tile.ownerId];
        p.cash -= data.fine;
        if (p.cash < 0) { p.debt += Math.abs(p.cash); p.cash = 0; }
        owner.cash += data.fine;
        break;
      }
      case "mortgage": {
        const tile = this.board[data.tileIdx];
        const val = Math.floor(tile.basePrice * 0.6);
        p.cash += val;
        tile.ownerId = null;
        tile.tier = 1;
        tile.upgradeInProgress = false;
        p.properties = p.properties.filter(i => i !== data.tileIdx);
        break;
      }
      case "payBail": {
        const bail = 6000 + 500 * p.properties.length;
        p.cash -= bail;
        p.jail = 0;
        break;
      }
      case "cityHallBribe":
        p.cash -= 5000;
        p.heat = Math.max(0, p.heat - 2);
        break;
    }
    this.updateHUD();
  }

  endTurnRemote() {
    // Called when a remote player ends their turn
    const p = this.cp;
    p.playedCardThisTurn = false;
    this.hideActionPanel();
    $("#cartelHand").classList.add("hidden");
    $("#endTurnBtn").classList.add("hidden");
    $("#rollBtn").classList.add("hidden");

    let next = (this.currentPlayerIdx + 1) % this.players.length;
    while (this.players[next].eliminated) {
      next = (next + 1) % this.players.length;
    }
    if (next <= this.currentPlayerIdx) {
      this.round++;
      $("#roundNum").textContent = this.round;
    }
    this.currentPlayerIdx = next;
    this.resetCamera();
    this.beginTurn();
  }

  applySyncState(data) {
    // Full state sync from host — replace game state
    if (data.board) this.board = data.board;
    if (data.players) {
      data.players.forEach((sp, i) => {
        if (this.players[i]) Object.assign(this.players[i], sp);
      });
    }
    if (data.round) this.round = data.round;
    if (data.stocks) this.stocks = data.stocks;
    this.updateHUD();
    this.updateStockUI();
  }

  // Periodic state sync (host only, every 5 turns)
  maybeSyncState() {
    if (!this.multiplayer || !this.isHost) return;
    if (this.round % 2 === 0 && this.currentPlayerIdx === 0) {
      this.socket.emit("rr:stateSync", {
        roomCode: this.roomCode,
        board: this.board,
        players: this.players.map(p => ({
          cash: p.cash, debt: p.debt, heat: p.heat, jail: p.jail,
          pos: p.pos, properties: p.properties, taxis: p.taxis,
          stocks: p.stocks, eliminated: p.eliminated,
        })),
        round: this.round,
        stocks: this.stocks,
      });
    }
  }

  addPlayerSlot() {
    const setup = $("#playerSetup");
    const count = setup.children.length;
    if (count >= 6) return;
    const row = document.createElement("div");
    row.className = "player-row";
    row.innerHTML = `<span class="player-color" style="background:${COLORS[count]}"></span>
      <input type="text" value="Player ${count + 1}" maxlength="12" data-idx="${count}">`;
    setup.appendChild(row);
  }

  removePlayerSlot() {
    const setup = $("#playerSetup");
    if (setup.children.length <= 2) return;
    setup.removeChild(setup.lastChild);
  }

  // ─── START GAME ───────────────────────────────────────────
  startGame() {
    const setup = $("#playerSetup");
    const inputs = setup.querySelectorAll("input");
    const cfg = MODE_CFG[this.mode];

    if (this.mode === "quick") {
      this.targetNetWorth = Math.max(100000, parseInt($("#targetNetWorth").value) || 500000);
    }

    // Build board
    this.board = buildBoard();

    // Build players
    this.players = [];
    inputs.forEach((inp, i) => {
      this.players.push({
        id: i,
        name: inp.value.trim() || `Player ${i+1}`,
        color: COLORS[i],
        cash: cfg.cash,
        debt: 0,
        debtRounds: 0,
        heat: 0,
        heatDecayCounter: 0,
        jail: 0, // rounds remaining
        pos: 0,
        properties: [], // tile indices
        taxis: [], // tile indices
        cartelHand: [],
        stocks: {}, // stockId → shares
        lawsuitLosses: 0,
        eliminated: false,
        hqPassStreak: 0,
        moneyHidden: false,
        moneyHiddenRounds: 0,
        smearRounds: 0,
        allianceWith: null,
        allianceRounds: 0,
        securityActive: false,
        legalTeamActive: false,
        playedCardThisTurn: false,
        lastStand: false,
      });
    });

    // Init stocks
    this.stocks = STOCK_DEFS.map(s => ({
      ...s,
      price: s.basePrice,
      prevPrice: s.basePrice,
      trend: 0, // -1 bear, 0 neutral, 1 bull
      trendRounds: 0,
      history: [s.basePrice],
    }));
    this.bubblePop = false;
    this.bubblePopRound = rng(15, 25);

    this.round = 1;
    this.currentPlayerIdx = 0;
    this.phase = "preturn";
    this.auctionTimer = 5; // first auction at round 5

    // Switch screens
    $("#lobby").classList.remove("active");
    $("#game").classList.add("active");

    // Setup canvas
    this.canvas = $("#boardCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.canvas.width = BOARD_PX;
    this.canvas.height = BOARD_PX;

    // Camera
    this.resetCamera();

    // Resize handler
    this.onResize();
    window.onresize = () => this.onResize();

    // Scroll zoom
    $("#boardWrap").onwheel = (e) => {
      e.preventDefault();
      const d = e.deltaY > 0 ? -0.1 : 0.1;
      this.targetCamZoom = clamp(this.targetCamZoom + d, 0.4, 2.5);
    };

    // HUD & render
    this.updateHUD();
    this.updateStockUI();
    this.renderLoop();

    // Stock ticker toggle
    $("#stockToggle").onclick = () => {
      $("#stockTicker").classList.toggle("collapsed");
    };

    // Begin first turn
    this.beginTurn();
  }

  onResize() {
    const wrap = $("#boardWrap");
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    // Fit board
    const fitZoom = Math.min(w / BOARD_PX, h / BOARD_PX) * 0.85;
    this.targetCamZoom = fitZoom;
    this.cameraZoom = fitZoom;
    this.targetCamX = BOARD_PX / 2;
    this.targetCamY = BOARD_PX / 2;
    this.cameraX = this.targetCamX;
    this.cameraY = this.targetCamY;
  }

  resetCamera() {
    this.targetCamX = BOARD_PX / 2;
    this.targetCamY = BOARD_PX / 2;
    const wrap = $("#boardWrap");
    const fitZoom = Math.min(wrap.clientWidth / BOARD_PX, wrap.clientHeight / BOARD_PX) * 0.85;
    this.targetCamZoom = fitZoom;
  }

  focusTile(idx, zoom) {
    const p = tilePx(idx);
    this.targetCamX = p.x + TILE_SIZE / 2;
    this.targetCamY = p.y + TILE_SIZE / 2;
    this.targetCamZoom = zoom != null ? zoom : Math.max(this.cameraZoom, 1.2);
  }

  focusPlayer(p) {
    this.focusTile(p.pos, 1.4);
  }

  get cp() { return this.players[this.currentPlayerIdx]; }

  alivePlayers() { return this.players.filter(p => !p.eliminated); }

  // ─── TURN FLOW ────────────────────────────────────────────
  beginTurn() {
    const alive = this.alivePlayers();

    // Check win
    if (alive.length <= 1 && this.players.length > 1) {
      this.endGame(alive[0]);
      return;
    }
    if (this.mode === "quick") {
      for (const p of alive) {
        if (this.netWorth(p) >= this.targetNetWorth) {
          this.endGame(p);
          return;
        }
      }
    }

    // Skip eliminated
    while (this.cp.eliminated) {
      this.currentPlayerIdx = (this.currentPlayerIdx + 1) % this.players.length;
    }

    const p = this.cp;

    // Round start income (first player of each round)
    if (this.currentPlayerIdx === this.firstAliveIdx()) {
      this.collectAllIncome();
      this.processDebt();
      this.tickHeatDecay();
      this.tickUpgrades();
      this.tickEffects();

      // Check auction
      this.auctionTimer--;
      if (this.auctionTimer <= 0) {
        this.auctionTimer = 5;
        this.startAuction();
        return; // auction will call beginTurn again when done
      }

      // Stock update
      this.updateStocks();
    }

    // Jail check
    if (p.jail > 0) {
      this.showJailTurn(p);
      return;
    }

    // Show roll button
    this.phase = "rolling";
    $("#turnPlayerName").textContent = p.name;
    this.updateHUD();

    // Auto-focus camera on current player
    this.focusPlayer(p);

    if (this.isMyTurn()) {
      this.showCartelHand(p);
      $("#rollBtn").classList.remove("hidden");
      $("#rollBtn").onclick = () => this.doRoll();
    } else {
      $("#rollBtn").classList.add("hidden");
      $("#cartelHand").classList.add("hidden");
    }
    $("#endTurnBtn").classList.add("hidden");
    this.hideActionPanel();
  }

  firstAliveIdx() {
    for (let i = 0; i < this.players.length; i++) {
      if (!this.players[i].eliminated) return i;
    }
    return 0;
  }

  doRoll() {
    if (this.phase !== "rolling") return;
    if (!this.isMyTurn()) return; // not your turn in multiplayer
    this.phase = "moving";
    $("#rollBtn").classList.add("hidden");

    const roll = rng(1, 12);
    this.emit("rr:rolled", { roll });
    this.showRollFlash(roll);

    setTimeout(() => {
      this.movePlayer(this.cp, roll);
    }, 1600);
  }

  showRollFlash(n) {
    const el = $("#rollFlash");
    el.textContent = n;
    el.classList.remove("hidden");
    el.style.animation = "none";
    void el.offsetWidth;
    el.style.animation = "flashIn 0.3s ease-out forwards";

    setTimeout(() => {
      el.style.animation = "flashOut 0.5s ease-in forwards";
      setTimeout(() => el.classList.add("hidden"), 500);
    }, 1200);
  }

  movePlayer(p, steps) {
    const startPos = p.pos;
    let passedHQ = false;
    let passedPolice = false;

    // Animate step by step
    let step = 0;
    const interval = setInterval(() => {
      step++;
      p.pos = (startPos + step) % 56;

      // Check passing HQ (tile 0)
      if (p.pos === 0 && step < steps) {
        passedHQ = true;
      }
      // Check passing Police (tile 28)
      if (p.pos === 28 && step < steps) {
        passedPolice = true;
      }

      this.focusTile(p.pos, 1.4);
      this.updateHUD();

      if (step >= steps) {
        clearInterval(interval);

        // Passed HQ paycheck
        if (passedHQ) {
          this.paycheck(p);
        }

        // Passed police while heat 4+
        if (passedPolice && p.heat >= 4) {
          const caught = rng(1, 2) === 1; // 50/50
          if (caught) {
            this.arrestPlayer(p);
            this.showEndTurn();
            return;
          }
        }

        // Also check if landed on 0 = HQ
        if (p.pos === 0 && steps > 0) {
          if (!passedHQ) this.paycheck(p);
        }

        // Resolve tile
        setTimeout(() => this.resolveTile(p), 300);
      }
    }, 200);
  }

  // ─── PAYCHECK ─────────────────────────────────────────────
  paycheck(p) {
    const base = MODE_CFG[this.mode].pay;
    const propCount = p.properties.length;
    let bonus = 0;
    if (propCount >= 11) bonus = 0.75;
    else if (propCount >= 7) bonus = 0.50;
    else if (propCount >= 4) bonus = 0.25;
    else if (propCount >= 1) bonus = 0.10;

    let pay = Math.floor(base * (1 + bonus));

    // Taxi dividend
    if (p.taxis.length === 4) {
      pay += 5000;
    }

    // Hot streak
    p.hqPassStreak++;
    if (p.hqPassStreak >= 3) {
      pay += 10000;
      p.hqPassStreak = 0;
    }

    // Debt seizure
    if (p.debt > 0) {
      const seized = Math.min(pay, p.debt);
      p.debt -= seized;
      pay -= seized;
    }

    p.cash += pay;
    this.updateHUD();
  }

  // ─── INCOME COLLECTION ────────────────────────────────────
  collectAllIncome() {
    for (const p of this.alivePlayers()) {
      if (p.jail > 0) continue;
      let income = 0;
      for (const ti of p.properties) {
        const tile = this.board[ti];
        if (tile.upgradeInProgress) continue;
        const mult = this.tierIncomeMultiplier(tile.tier);
        const distBonus = this.districtBonus(p, tile.side);
        income += Math.floor(tile.baseIncome * mult * (1 + distBonus));
      }
      for (const ti of p.taxis) {
        income += this.taxiIncome(p);
      }

      if (p.debt > 0) {
        const seized = Math.min(income, p.debt);
        p.debt -= seized;
        income -= seized;
      }
      p.cash += income;
    }
  }

  tierIncomeMultiplier(tier) {
    return [0, 1, 2, 3.5, 5.5][tier] || 1;
  }

  tierFineMultiplier(tier) {
    return [0, 1, 2.2, 3.8, 6][tier] || 1;
  }

  tierUpgradeCost(tile) {
    const pct = [0, 0, 0.4, 0.65, 0.9][tile.tier + 1] || 0;
    return Math.floor(tile.basePrice * pct);
  }

  taxiIncome(p) {
    const n = p.taxis.length;
    return [0, 800, 2000, 4500, 9000][n] || 0;
  }

  taxiFine(p) {
    const n = p.taxis.length;
    return [0, 1200, 3000, 6500, 14000][n] || 0;
  }

  districtBonus(player, side) {
    const count = player.properties.filter(ti => this.board[ti].side === side).length;
    return [0, 0, 0.10, 0.25, 0.40, 0.55, 0.70, 0.85, 1.00][count] || 0;
  }

  districtFineBonus(player, side) {
    const count = player.properties.filter(ti => this.board[ti].side === side).length;
    if (count >= 3) return 0.20;
    return 0;
  }

  // ─── RESOLVE TILE ─────────────────────────────────────────
  resolveTile(p) {
    const tile = this.board[p.pos];
    this.phase = "action";

    switch (tile.type) {
      case "corner": this.resolveCorner(p, tile); break;
      case "property": this.resolveProperty(p, tile, p.pos); break;
      case "taxi": this.resolveTaxi(p, tile, p.pos); break;
      case "tax": this.resolveTax(p); break;
      case "bank": this.resolveBank(p); break;
      case "momentum": this.resolveMomentum(p); break;
      case "underground_card": this.drawCartelCard(p, 1); this.showEndTurn(); break;
      case "lucky": this.resolveLucky(p); break;
      case "unlucky": this.resolveUnlucky(p); break;
      case "free": this.showActionPanel("Free Roam", "Nothing happens. Take a breather."); this.showEndTurn(); break;
      default: this.showEndTurn();
    }
    this.updateHUD();
  }

  // ─── CORNERS ──────────────────────────────────────────────
  resolveCorner(p, tile) {
    switch (tile.corner) {
      case "hq":
        this.showActionPanel("Headquarters", "You landed on HQ. Collect your paycheck bonus!");
        this.paycheck(p);
        this.showEndTurn();
        break;

      case "cityhall":
        this.showCityHall(p);
        break;

      case "police":
        this.resolvePolice(p);
        break;

      case "underground":
        this.showActionPanel("Underground Market", "Draw 2 Cartel Cards, keep 1. Heat +1.");
        p.heat = Math.min(5, p.heat + 1);
        this.drawCartelCard(p, 2, true);
        break;
    }
  }

  resolvePolice(p) {
    if (p.heat >= 5) {
      this.showActionPanel("Police Precinct", `Heat ${p.heat} — ARRESTED! Sent to jail for 3 rounds.`);
      this.arrestPlayer(p);
      this.showEndTurn();
    } else if (p.heat >= 3) {
      this.showActionPanel("Police Precinct", `Heat ${p.heat} — Suspicious! Skip next turn. Heat drops to 1.`);
      p.jail = 1;
      p.heat = 1;
      this.showEndTurn();
    } else {
      this.showActionPanel("Police Precinct", "Heat low. No issues — you're clean.");
      this.showEndTurn();
    }
  }

  arrestPlayer(p) {
    p.jail = 3;
    p.hqPassStreak = 0;
  }

  showCityHall(p) {
    let html = '<p>Welcome to City Hall. Choose an action:</p>';
    html += `<button class="action-btn" onclick="game.cityHallBribe()">Pay ${fmt(5000)} to reduce heat by 2</button>`;
    html += `<button class="action-btn" onclick="game.cityHallContest()">Contest last trespassing fine (50% refund)</button>`;
    html += `<button class="action-btn" onclick="game.cityHallLawsuit()">File a Lawsuit</button>`;
    html += `<button class="action-btn" onclick="game.showEndTurnAction()">Do Nothing</button>`;
    this.showActionPanel("City Hall", html);
  }

  cityHallBribe() {
    const p = this.cp;
    if (p.cash < 5000) {
      this.showModal("Not Enough Cash", "You need $5,000 for the bribe.", [{text:"OK", action:() => this.hideModal()}]);
      return;
    }
    p.cash -= 5000;
    p.heat = Math.max(0, p.heat - 2);
    this.emit("rr:action", { type:"cityHallBribe" });
    this.showActionPanel("City Hall", `Bribe paid. Heat reduced to ${p.heat}.`);
    this.showEndTurn();
    this.updateHUD();
  }

  cityHallContest() {
    // Simplified: 50% refund of $3000
    const p = this.cp;
    p.cash += 1500;
    this.showActionPanel("City Hall", "Fine contested. You received a $1,500 refund.");
    this.showEndTurn();
    this.updateHUD();
  }

  cityHallLawsuit() {
    const p = this.cp;
    const targets = this.alivePlayers().filter(t => t.id !== p.id && !t.eliminated);
    if (targets.length === 0) {
      this.showActionPanel("City Hall", "No valid targets for a lawsuit.");
      this.showEndTurn();
      return;
    }

    let html = '<p>Choose target:</p>';
    targets.forEach(t => {
      html += `<button class="action-btn" onclick="game.fileLawsuit(${t.id})">${t.name} (${fmt(t.cash)})</button>`;
    });
    html += `<button class="action-btn" onclick="game.showEndTurnAction()">Cancel</button>`;
    this.showActionPanel("File Lawsuit", html);
  }

  fileLawsuit(targetId) {
    const p = this.cp;
    const target = this.players[targetId];
    const ask = Math.floor(Math.min(p.cash * 0.5, target.cash * 0.3) + 5000);

    const win = Math.random() < 0.30;
    if (win) {
      const paid = Math.min(ask, target.cash);
      target.cash -= paid;
      if (target.cash < 0) {
        target.debt += Math.abs(target.cash);
        target.cash = 0;
      }
      p.cash += paid;
      p.heat = Math.min(5, p.heat + 1);
      this.showActionPanel("Lawsuit Won!", `You won! ${target.name} pays you ${fmt(paid)}. Heat +1.`);
    } else {
      const lossRates = [0.30, 0.35, 0.40, 0.45, 0.50, 0.60];
      const rate = lossRates[Math.min(p.lawsuitLosses, 5)];
      const fee = Math.floor(ask * rate);
      p.cash -= Math.min(fee, p.cash);
      if (p.cash <= 0) {
        p.debt += fee - p.cash;
        p.cash = 0;
      }
      p.lawsuitLosses++;
      this.showActionPanel("Lawsuit Lost", `You lost! Lawyer fee: ${fmt(fee)} (loss #${p.lawsuitLosses}).`);
    }
    this.showEndTurn();
    this.updateHUD();
  }

  // ─── PROPERTY ─────────────────────────────────────────────

  // Build rich property card HTML
  _propertyCard(tile, tileIdx, status) {
    const sideColor = SIDE_COLORS[tile.side] || "#888";
    const distName = this.sideName(tile.side);
    const ownerCount = tile.ownerId != null
      ? this.players[tile.ownerId].properties.filter(ti => this.board[ti].side === tile.side).length
      : 0;
    const totalInSide = this.board.filter(t => t && t.type === "property" && t.side === tile.side).length;
    const tierStars = "\u2605".repeat(tile.tier) + "\u2606".repeat(4 - tile.tier);
    const mult = this.tierFineMultiplier(tile.tier);
    const fineNow = Math.floor(tile.baseFine * mult);
    const incomeNow = Math.floor(tile.baseIncome * ([0, 1, 1.8, 3, 5][tile.tier] || 1));

    let html = `<div class="tile-card">`;
    html += `<div class="tile-card-header" style="border-color:${sideColor}">`;
    html += `<span class="tile-card-district" style="color:${sideColor}">${distName}</span>`;
    if (status) html += `<span class="tile-card-status ${status.cls || ''}">${status.label}</span>`;
    html += `</div>`;
    html += `<div class="tile-card-name">${tile.name}</div>`;
    html += `<div class="tile-card-tier"><span class="tier-stars" style="color:#fbbf24">${tierStars}</span> <span class="tier-label">Tier ${tile.tier}</span></div>`;
    html += `<div class="tile-card-stats">`;
    html += `<div class="tcs-row"><span class="tcs-label">Price</span><span class="tcs-val" style="color:#fbbf24">${fmt(tile.basePrice)}</span></div>`;
    html += `<div class="tcs-row"><span class="tcs-label">Income</span><span class="tcs-val" style="color:#4ade80">${fmt(incomeNow)}/rnd</span></div>`;
    html += `<div class="tcs-row"><span class="tcs-label">Fine</span><span class="tcs-val" style="color:#f87171">${fmt(fineNow)}</span></div>`;
    html += `<div class="tcs-row"><span class="tcs-label">District</span><span class="tcs-val">${ownerCount}/${totalInSide}</span></div>`;
    if (ownerCount >= 3) html += `<div class="tcs-bonus">District Bonus: +20% fines</div>`;
    html += `</div>`;

    if (tile.ownerId != null) {
      const owner = this.players[tile.ownerId];
      html += `<div class="tile-card-owner"><span class="tco-dot" style="background:${owner.color}"></span>${owner.name}</div>`;
    }

    html += `</div>`;
    return html;
  }

  resolveProperty(p, tile, tileIdx) {
    if (tile.ownerId === null) {
      // Unowned — offer to buy
      let html = this._propertyCard(tile, tileIdx, { label: "FOR SALE", cls: "status-sale" });

      if (p.cash >= tile.basePrice) {
        html += `<button class="action-btn" onclick="game.buyProperty(${tileIdx})">Buy for ${fmt(tile.basePrice)}</button>`;
      } else {
        html += `<p style="color:#f87171;text-align:center;margin-top:8px">Not enough cash!</p>`;
      }
      html += `<button class="action-btn" onclick="game.showEndTurnAction()">Pass</button>`;
      this.showActionPanel("Property Available", html);
    } else if (tile.ownerId === p.id) {
      // Own property — offer upgrade
      let html = this._propertyCard(tile, tileIdx, { label: "YOURS", cls: "status-owned" });
      if (tile.tier < 4) {
        const cost = this.tierUpgradeCost(tile);
        html += `<button class="action-btn" onclick="game.upgradeProperty(${tileIdx})">Upgrade to Tier ${tile.tier + 1} \u2014 ${fmt(cost)}</button>`;
        if (p.cash < cost) html += `<p style="color:#f87171;text-align:center;font-size:.8rem">Not enough cash to upgrade.</p>`;
      } else {
        html += `<p style="color:#4ade80;text-align:center;margin-top:8px">Max tier reached!</p>`;
      }
      html += `<button class="action-btn" onclick="game.showEndTurnAction()">Done</button>`;
      this.showActionPanel("Your Property", html);
    } else {
      // Opponent's property — pay fine
      const owner = this.players[tile.ownerId];
      if (tile.upgradeInProgress) {
        let html = this._propertyCard(tile, tileIdx, { label: "CONSTRUCTION", cls: "status-construction" });
        html += `<p style="text-align:center;color:#fbbf24;margin-top:8px">Under construction \u2014 no fine this round.</p>`;
        this.showActionPanel(tile.name, html);
        this.showEndTurn();
        return;
      }

      // Check alliance
      if (p.allianceWith === owner.id && p.allianceRounds > 0) {
        let html = this._propertyCard(tile, tileIdx, { label: "ALLIED", cls: "status-owned" });
        html += `<p style="text-align:center;color:#00d4aa;margin-top:8px">Cartel Alliance active \u2014 no fine!</p>`;
        this.showActionPanel(tile.name, html);
        this.showEndTurn();
        return;
      }

      // Check bribery card
      const hasBribery = p.cartelHand.some(c => c.id === "bribery");

      const mult = this.tierFineMultiplier(tile.tier);
      const distBonus = this.districtFineBonus(owner, tile.side);
      let fine = Math.floor(tile.baseFine * mult * (1 + distBonus));

      // District 5+ bonus: payer pays 25% less
      const payerDistrict = p.properties.filter(ti => this.board[ti].side === tile.side).length;
      if (payerDistrict >= 5) fine = Math.floor(fine * 0.75);

      let html = this._propertyCard(tile, tileIdx, { label: "TRESPASSING", cls: "status-trespass" });

      html += `<div style="text-align:center;margin:8px 0;font-size:1.1rem;font-weight:700;color:#f87171">Fine: ${fmt(fine)}</div>`;

      if (hasBribery) {
        html += `<button class="action-btn" onclick="game.useBribery(${tileIdx})">Play Bribery Card (skip fine)</button>`;
      }
      html += `<button class="action-btn danger" onclick="game.payFine(${tileIdx},${fine})">Pay ${fmt(fine)}</button>`;
      this.showActionPanel("Trespassing!", html);
    }
  }

  buyProperty(tileIdx) {
    const p = this.cp;
    const tile = this.board[tileIdx];
    if (p.cash < tile.basePrice) return;

    p.cash -= tile.basePrice;
    tile.ownerId = p.id;
    p.properties.push(tileIdx);
    this.emit("rr:action", { type:"buyProperty", tileIdx });
    this.showActionPanel("Purchased!", `You now own ${tile.name}.`);
    this.showEndTurn();
    this.updateHUD();
  }

  upgradeProperty(tileIdx) {
    const p = this.cp;
    const tile = this.board[tileIdx];
    const cost = this.tierUpgradeCost(tile);
    if (p.cash < cost || tile.tier >= 4) return;

    p.cash -= cost;
    tile.upgradeInProgress = true;
    tile.upgradeRound = this.round;
    this.emit("rr:action", { type:"upgradeProperty", tileIdx });
    this.showActionPanel("Upgrading!", `${tile.name} is under construction. Ready next round.`);
    this.showEndTurn();
    this.updateHUD();
  }

  payFine(tileIdx, fine) {
    const p = this.cp;
    const tile = this.board[tileIdx];
    const owner = this.players[tile.ownerId];

    const paid = Math.min(fine, p.cash);
    p.cash -= paid;
    if (paid < fine) {
      p.debt += (fine - paid);
    }
    owner.cash += fine;
    p.hqPassStreak = 0;

    this.emit("rr:action", { type:"payFine", tileIdx, fine });
    this.showActionPanel("Fine Paid", `You paid ${fmt(fine)} to ${owner.name}.`);
    this.showEndTurn();
    this.updateHUD();
    this.checkBankruptcy(p);
  }

  useBribery(tileIdx) {
    const p = this.cp;
    const idx = p.cartelHand.findIndex(c => c.id === "bribery");
    if (idx === -1) return;
    p.cartelHand.splice(idx, 1);
    p.heat = Math.min(5, p.heat + 1);
    this.showActionPanel("Bribery!", "Fine skipped! Heat +1.");
    this.showEndTurn();
    this.updateHUD();
  }

  // ─── TAXI ─────────────────────────────────────────────────
  resolveTaxi(p, tile, tileIdx) {
    if (tile.ownerId === null) {
      let html = `<p class="prop-name">${tile.name}</p>`;
      html += `<p>Price: <span class="prop-price">${fmt(22000)}</span></p>`;
      html += `<p>Taxi Hub — income & fines scale with # owned</p>`;
      if (p.cash >= 22000) {
        html += `<button class="action-btn" onclick="game.buyTaxi(${tileIdx})">Buy for ${fmt(22000)}</button>`;
      } else {
        html += `<p style="color:#f87171">Not enough cash!</p>`;
      }
      html += `<button class="action-btn" onclick="game.showEndTurnAction()">Pass</button>`;
      this.showActionPanel("Taxi Hub Available", html);
    } else if (tile.ownerId === p.id) {
      this.showActionPanel("Your Taxi Hub", `${tile.name} — you own ${p.taxis.length} hub(s).`);
      this.showEndTurn();
    } else {
      const owner = this.players[tile.ownerId];
      const fine = this.taxiFine(owner);
      let html = `<p class="prop-name">${tile.name}</p>`;
      html += `<p>Owner: <span style="color:${owner.color}">${owner.name}</span> (${owner.taxis.length} hubs)</p>`;
      html += `<p>Fleet Fee: <span class="prop-fine">${fmt(fine)}</span></p>`;
      html += `<button class="action-btn danger" onclick="game.payFine(${tileIdx},${fine})">Pay ${fmt(fine)}</button>`;
      this.showActionPanel("Taxi Hub", html);
    }
  }

  buyTaxi(tileIdx) {
    const p = this.cp;
    const tile = this.board[tileIdx];
    if (p.cash < 22000) return;

    p.cash -= 22000;
    tile.ownerId = p.id;
    p.taxis.push(tileIdx);
    this.emit("rr:action", { type:"buyTaxi", tileIdx });
    this.showActionPanel("Purchased!", `You now own ${tile.name}. (${p.taxis.length}/4 hubs)`);
    this.showEndTurn();
    this.updateHUD();
  }

  // ─── TAX ──────────────────────────────────────────────────
  resolveTax(p) {
    const tax = Math.floor(p.cash * 0.08);
    p.cash -= tax;
    this.showActionPanel("Tax Time", `You paid ${fmt(tax)} in taxes (8% of cash).`);
    this.showEndTurn();
    this.updateHUD();
  }

  // ─── BANK ─────────────────────────────────────────────────
  resolveBank(p) {
    let html = '<p>Bank services:</p>';
    if (p.debt > 0) {
      html += `<p>Outstanding debt: <span class="prop-fine">${fmt(p.debt)}</span></p>`;
      const repay = Math.min(p.debt, p.cash);
      if (repay > 0) {
        html += `<button class="action-btn" onclick="game.repayDebt()">Repay ${fmt(repay)}</button>`;
      }
    }
    // Mortgage: sell property at 60%
    if (p.properties.length > 0) {
      html += `<p style="margin-top:8px">Mortgage a property (60% value):</p>`;
      for (const ti of p.properties) {
        const t = this.board[ti];
        const val = Math.floor(t.basePrice * 0.6);
        html += `<button class="action-btn" onclick="game.mortgageProperty(${ti})">Sell ${t.name} for ${fmt(val)}</button>`;
      }
    }
    html += `<button class="action-btn" onclick="game.showEndTurnAction()">Leave</button>`;
    this.showActionPanel("Bank", html);
  }

  repayDebt() {
    const p = this.cp;
    const repay = Math.min(p.debt, p.cash);
    p.cash -= repay;
    p.debt -= repay;
    this.resolveBank(p);
    this.updateHUD();
  }

  mortgageProperty(tileIdx) {
    const p = this.cp;
    const tile = this.board[tileIdx];
    const val = Math.floor(tile.basePrice * 0.6);
    p.cash += val;
    tile.ownerId = null;
    tile.tier = 1;
    tile.upgradeInProgress = false;
    p.properties = p.properties.filter(i => i !== tileIdx);
    this.emit("rr:action", { type:"mortgage", tileIdx });
    this.resolveBank(p);
    this.updateHUD();
  }

  // ─── MOMENTUM ─────────────────────────────────────────────
  resolveMomentum(p) {
    const bonus = rng(0, 1) === 0 ? 2 : -2;
    const label = bonus > 0 ? "+2" : "-2";
    this.showActionPanel("Momentum!", `Next roll modifier: ${label}`);
    // Store for next roll (simplified: just move extra now)
    const newPos = (p.pos + bonus + 56) % 56;
    p.pos = newPos;
    this.focusTile(p.pos);
    setTimeout(() => this.resolveTile(p), 500);
  }

  // ─── LUCKY DROP ───────────────────────────────────────────
  resolveLucky(p) {
    const roll = rng(1, 6);
    const base = 1000 + this.round * 200;
    let payout;
    if (roll === 1) payout = base;
    else if (roll <= 3) payout = Math.floor(base * 2);
    else if (roll <= 5) payout = Math.floor(base * 4);
    else payout = Math.floor(base * 8);

    p.cash += payout;
    const tier = roll === 6 ? "JACKPOT" : roll >= 4 ? "Large" : roll >= 2 ? "Moderate" : "Small";
    this.showActionPanel("Lucky Drop!", `${tier} windfall! You received ${fmt(payout)}.`);
    this.showEndTurn();
    this.updateHUD();
  }

  // ─── UNLUCKY DROP ─────────────────────────────────────────
  resolveUnlucky(p) {
    const outcome = rng(1, 3);
    if (outcome === 1) {
      // Scam
      const loss = Math.floor(p.cash * (rng(5, 20) / 100));
      p.cash -= loss;
      if (p.cash < 0) { p.debt += Math.abs(p.cash); p.cash = 0; }
      this.showActionPanel("Scam!", `You were scammed! Lost ${fmt(loss)}.`);
      this.showEndTurn();
    } else if (outcome === 2) {
      // Force property auction
      if (p.properties.length > 0) {
        let html = '<p>You must auction one property!</p>';
        for (const ti of p.properties) {
          const t = this.board[ti];
          html += `<button class="action-btn danger" onclick="game.forceAuctionProperty(${ti})">${t.name} (${fmt(t.basePrice)})</button>`;
        }
        this.showActionPanel("Forced Auction", html);
      } else {
        const fine = 8000;
        p.cash -= fine;
        if (p.cash < 0) { p.debt += Math.abs(p.cash); p.cash = 0; p.debtRounds = 2; }
        this.showActionPanel("Being Broke Fine", `No properties to auction. Pay ${fmt(fine)} fine.`);
        this.showEndTurn();
      }
    } else {
      // Double scam
      const loss1 = Math.floor(p.cash * (rng(5, 15) / 100));
      p.cash -= loss1;
      const loss2 = Math.floor(p.cash * (rng(5, 15) / 100));
      p.cash -= loss2;
      if (p.cash < 0) { p.debt += Math.abs(p.cash); p.cash = 0; }
      this.showActionPanel("Double Scam!", `Hit twice! Lost ${fmt(loss1 + loss2)} total.`);
      this.showEndTurn();
    }
    this.updateHUD();
    this.checkBankruptcy(p);
  }

  forceAuctionProperty(tileIdx) {
    const p = this.cp;
    const tile = this.board[tileIdx];
    // Quick auction: each other player bids
    tile.ownerId = null;
    tile.tier = 1;
    tile.upgradeInProgress = false;
    p.properties = p.properties.filter(i => i !== tileIdx);

    // Simplified: sell at 50% to highest cash player
    const buyers = this.alivePlayers().filter(b => b.id !== p.id);
    if (buyers.length > 0) {
      const buyer = buyers.reduce((a, b) => a.cash > b.cash ? a : b);
      const price = Math.floor(tile.basePrice * 0.5);
      if (buyer.cash >= price) {
        buyer.cash -= price;
        p.cash += price;
        tile.ownerId = buyer.id;
        buyer.properties.push(tileIdx);
        this.showActionPanel("Auction Complete", `${buyer.name} bought ${tile.name} for ${fmt(price)}.`);
      } else {
        this.showActionPanel("No Buyers", `${tile.name} returned to the market.`);
      }
    }
    this.showEndTurn();
    this.updateHUD();
  }

  // ─── CARTEL CARDS ─────────────────────────────────────────
  drawCartelCard(p, count, pickOne = false) {
    const drawn = [];
    for (let i = 0; i < count; i++) {
      const pool = CARTEL_DECK.filter(c => !c.rare || Math.random() < 0.1);
      drawn.push({ ...pool[rng(0, pool.length - 1)] });
    }

    if (pickOne && drawn.length === 2) {
      let html = '<p>Choose one card to keep:</p>';
      drawn.forEach((c, i) => {
        html += `<button class="action-btn" onclick="game.keepCartelCard(${i})">${c.name} — ${c.desc} (Heat +${c.heat})</button>`;
      });
      this._drawnCards = drawn;
      this.showActionPanel("Pick a Card", html);
    } else {
      drawn.forEach(c => p.cartelHand.push(c));
      if (p.cartelHand.length > 5) p.cartelHand = p.cartelHand.slice(-5);
      this.showActionPanel("Card Drawn", `You drew: ${drawn.map(c => c.name).join(", ")}`);
      this.showEndTurn();
      this.showCartelHand(p);
    }
  }

  keepCartelCard(idx) {
    const p = this.cp;
    const card = this._drawnCards[idx];
    p.cartelHand.push(card);
    if (p.cartelHand.length > 5) p.cartelHand = p.cartelHand.slice(-5);
    this.showActionPanel("Card Kept", `You kept: ${card.name}`);
    this.showEndTurn();
    this.showCartelHand(p);
  }

  showCartelHand(p) {
    const el = $("#cartelCards");
    const wrap = $("#cartelHand");
    if (p.cartelHand.length === 0) {
      wrap.classList.add("hidden");
      return;
    }
    wrap.classList.remove("hidden");
    el.innerHTML = "";
    p.cartelHand.forEach((c, i) => {
      const div = document.createElement("div");
      div.className = "cartel-card";
      div.innerHTML = `<span class="cc-name">${c.name}</span><span class="cc-heat">+${c.heat}</span>`;
      div.onclick = () => this.playCartelCard(i);
      el.appendChild(div);
    });
  }

  playCartelCard(idx) {
    const p = this.cp;
    if (p.playedCardThisTurn) {
      this.showModal("Limit", "You can only play 1 card per turn.", [{text:"OK", action:() => this.hideModal()}]);
      return;
    }

    const card = p.cartelHand[idx];
    if (!card) return;

    if (card.needsTarget) {
      const targets = this.alivePlayers().filter(t => t.id !== p.id);
      if (targets.length === 0) return;

      let html = `<p>Play <strong>${card.name}</strong> on:</p>`;
      targets.forEach(t => {
        html += `<button class="action-btn" onclick="game.executeCartelCard(${idx},${t.id})">${t.name}</button>`;
      });
      html += `<button class="action-btn" onclick="game.hideModal()">Cancel</button>`;
      this.showModal("Choose Target", html);
    } else {
      this.executeCartelCard(idx, null);
    }
  }

  executeCartelCard(cardIdx, targetId) {
    const p = this.cp;
    const card = p.cartelHand[cardIdx];
    if (!card) return;

    p.cartelHand.splice(cardIdx, 1);
    p.playedCardThisTurn = true;
    p.heat = Math.min(5, p.heat + card.heat);

    const target = targetId !== null ? this.players[targetId] : null;

    switch (card.id) {
      case "arson": {
        if (!target) break;
        // Check security
        if (target.securityActive) {
          target.securityActive = false;
          this.showModal("Blocked!", `${target.name}'s Security System blocked the Arson!`,[{text:"OK",action:()=>this.hideModal()}]);
          break;
        }
        const props = target.properties.filter(ti => this.board[ti].type === "property");
        if (props.length > 0) {
          const ti = props[rng(0, props.length - 1)];
          const tile = this.board[ti];
          if (tile.tier > 1) {
            tile.tier--;
            this.showModal("Arson!", `${tile.name} dropped to Tier ${tile.tier}!`,[{text:"OK",action:()=>this.hideModal()}]);
          } else {
            tile.ownerId = null;
            target.properties = target.properties.filter(i => i !== ti);
            this.showModal("Arson!", `${tile.name} destroyed and returned to market!`,[{text:"OK",action:()=>this.hideModal()}]);
          }
        }
        break;
      }
      case "armed_robbery": {
        if (!target) break;
        const props = target.properties.filter(ti => !this.board[ti].upgradeInProgress);
        if (props.length > 0) {
          const ti = props[rng(0, props.length - 1)];
          const tile = this.board[ti];
          const stolen = Math.floor(tile.baseIncome * this.tierIncomeMultiplier(tile.tier));
          target.cash -= Math.min(stolen, target.cash);
          p.cash += stolen;
          this.showModal("Armed Robbery!", `Stole ${fmt(stolen)} from ${tile.name}!`,[{text:"OK",action:()=>this.hideModal()}]);
        }
        break;
      }
      case "extortion": {
        if (!target) break;
        if (target.legalTeamActive) {
          target.legalTeamActive = false;
          this.showModal("Blocked!", `${target.name}'s Legal Team nullified the extortion!`,[{text:"OK",action:()=>this.hideModal()}]);
          break;
        }
        const fee = 5000;
        if (target.cash >= fee) {
          target.cash -= fee;
          p.cash += fee;
          this.showModal("Extortion!", `${target.name} paid you ${fmt(fee)}.`,[{text:"OK",action:()=>this.hideModal()}]);
        } else {
          // Lose random upgrade
          const props = target.properties.filter(ti => this.board[ti].tier > 1);
          if (props.length > 0) {
            const ti = props[rng(0, props.length - 1)];
            this.board[ti].tier--;
            this.showModal("Extortion!", `${target.name} couldn't pay — ${this.board[ti].name} downgraded!`,[{text:"OK",action:()=>this.hideModal()}]);
          }
        }
        break;
      }
      case "hostile_acquisition": {
        if (!target || target.cash >= 10000) {
          this.showModal("Failed", "Target is not distressed (needs < $10,000).",[{text:"OK",action:()=>this.hideModal()}]);
          break;
        }
        if (target.properties.length > 0) {
          const ti = target.properties[0];
          const tile = this.board[ti];
          const cost = Math.floor(tile.basePrice * 0.5);
          if (p.cash >= cost) {
            p.cash -= cost;
            target.cash += cost;
            tile.ownerId = p.id;
            target.properties = target.properties.filter(i => i !== ti);
            p.properties.push(ti);
            this.showModal("Hostile Acquisition!", `Took ${tile.name} for ${fmt(cost)}!`,[{text:"OK",action:()=>this.hideModal()}]);
          }
        }
        break;
      }
      case "smear_campaign": {
        if (target) target.smearRounds = 2;
        this.showModal("Smear Campaign", `${target.name} smeared for 2 rounds.`,[{text:"OK",action:()=>this.hideModal()}]);
        break;
      }
      case "cartel_alliance": {
        if (target) {
          p.allianceWith = target.id;
          p.allianceRounds = 3;
          target.allianceWith = p.id;
          target.allianceRounds = 3;
          this.showModal("Alliance!", `No fines between you and ${target.name} for 3 rounds.`,[{text:"OK",action:()=>this.hideModal()}]);
        }
        break;
      }
      case "tipoff": {
        if (target && target.heat >= 3) {
          this.arrestPlayer(target);
          this.showModal("Tip-Off!", `${target.name} arrested! Heat was ${target.heat}.`,[{text:"OK",action:()=>this.hideModal()}]);
        } else {
          this.showModal("Tip-Off Failed", "Target heat too low.",[{text:"OK",action:()=>this.hideModal()}]);
        }
        break;
      }
      case "clean_record":
        p.heat = 0;
        this.showModal("Clean Record", "Your heat reset to 0!",[{text:"OK",action:()=>this.hideModal()}]);
        break;
      case "security_system":
        p.securityActive = true;
        this.showModal("Security System", "Next cartel action on your properties will be blocked.",[{text:"OK",action:()=>this.hideModal()}]);
        break;
      case "legal_team":
        p.legalTeamActive = true;
        this.showModal("Legal Team", "Next extortion or lawsuit against you will be nullified.",[{text:"OK",action:()=>this.hideModal()}]);
        break;
      case "rebuild": {
        const props = p.properties.filter(ti => this.board[ti].tier < 4);
        if (props.length > 0) {
          const ti = props[0];
          this.board[ti].tier = Math.min(4, this.board[ti].tier + 1);
          this.showModal("Rebuild", `${this.board[ti].name} restored to T${this.board[ti].tier}!`,[{text:"OK",action:()=>this.hideModal()}]);
        }
        break;
      }
      case "money_laundering":
        p.moneyHidden = true;
        p.moneyHiddenRounds = 2;
        this.showModal("Money Laundering", "Net worth hidden for 2 rounds.",[{text:"OK",action:()=>this.hideModal()}]);
        break;
      default:
        this.showModal(card.name, card.desc,[{text:"OK",action:()=>this.hideModal()}]);
    }

    this.showCartelHand(p);
    this.updateHUD();
  }

  // ─── JAIL TURN ────────────────────────────────────────────
  showJailTurn(p) {
    this.focusPlayer(p);
    p.jail--;
    const bail = 6000 + 500 * p.properties.length;

    let html = `<p>You're in jail! ${p.jail + 1} round(s) remaining.</p>`;
    html += `<p>No movement, no income this round.</p>`;

    if (p.cash >= bail) {
      html += `<button class="action-btn" onclick="game.payBail()">Pay Bail: ${fmt(bail)}</button>`;
    }
    if (p.properties.length > 0) {
      html += `<button class="action-btn danger" onclick="game.forfeitForJail()">Forfeit a Property</button>`;
    }
    html += `<button class="action-btn" onclick="game.serveTime()">Serve Time</button>`;
    this.showActionPanel("Jail", html);

    // Can still trade stocks
    this.showCartelHand(p);
    $("#rollBtn").classList.add("hidden");
  }

  payBail() {
    const p = this.cp;
    const bail = 6000 + 500 * p.properties.length;
    if (p.cash < bail) return;
    p.cash -= bail;
    p.jail = 0;
    this.emit("rr:action", { type:"payBail" });
    this.showActionPanel("Released!", "Bail paid. You're free!");
    this.showEndTurn();
    this.updateHUD();
  }

  forfeitForJail() {
    const p = this.cp;
    if (p.properties.length === 0) return;
    const ti = p.properties[0];
    const tile = this.board[ti];
    tile.ownerId = null;
    tile.tier = 1;
    p.properties = p.properties.filter(i => i !== ti);
    p.jail = 0;
    this.showActionPanel("Released!", `Forfeited ${tile.name} to get out of jail.`);
    this.showEndTurn();
    this.updateHUD();
  }

  serveTime() {
    const p = this.cp;
    if (p.jail <= 0) {
      p.heat = 0; // Full serve resets heat
    }
    this.showActionPanel("Serving Time", p.jail > 0 ? `${p.jail} round(s) left.` : "Released! Heat reset to 0.");
    this.showEndTurn();
    this.updateHUD();
  }

  // ─── AUCTION SYSTEM ───────────────────────────────────────
  startAuction() {
    // Find unclaimed highest-value property
    let bestTile = null;
    let bestIdx = -1;
    for (let i = 0; i < 56; i++) {
      const t = this.board[i];
      if (t && t.type === "property" && t.ownerId === null) {
        if (!bestTile || t.basePrice > bestTile.basePrice) {
          bestTile = t;
          bestIdx = i;
        }
      }
    }

    if (!bestTile) {
      // No unclaimed properties — skip
      this.beginTurn();
      return;
    }

    // Simplified auction: each alive player can bid
    this.runSimpleAuction(bestIdx);
  }

  runSimpleAuction(tileIdx) {
    const tile = this.board[tileIdx];
    const bidders = this.alivePlayers();
    let currentBid = Math.max(1000, Math.floor(tile.basePrice * 0.3));
    let highBidder = null;
    let bidRound = 0;
    let consecutivePasses = 0;

    const nextBid = () => {
      // End if everyone passed in a row, or max rounds reached
      if (consecutivePasses >= bidders.length || bidRound >= bidders.length * 5) {
        if (highBidder) {
          highBidder.cash -= currentBid;
          tile.ownerId = highBidder.id;
          highBidder.properties.push(tileIdx);
          this.showModal("Auction Won!", `${highBidder.name} bought ${tile.name} for ${fmt(currentBid)}.`,
            [{text:"Continue", action:() => { this.hideModal(); this.beginTurn(); }}]);
        } else {
          this.showModal("Auction Failed", `No bids on ${tile.name}.`,
            [{text:"Continue", action:() => { this.hideModal(); this.beginTurn(); }}]);
        }
        this.updateHUD();
        return;
      }

      const bidder = bidders[bidRound % bidders.length];

      // Skip if this bidder is already the high bidder
      if (highBidder && bidder.id === highBidder.id) {
        bidRound++;
        consecutivePasses++;
        nextBid();
        return;
      }

      const minBid = highBidder ? Math.floor(currentBid * 1.05) : currentBid;
      const canBid = bidder.cash >= minBid;

      let html = this._propertyCard(tile, tileIdx, { label: "AUCTION", cls: "status-sale" });

      html += `<div class="auction-info">`;
      html += `<div class="auction-current-bid">`;
      html += `<span class="auction-label">Current Bid</span>`;
      html += `<span class="auction-amount">${fmt(currentBid)}</span>`;
      if (highBidder) {
        html += `<span class="auction-bidder" style="color:${highBidder.color}">${highBidder.name}</span>`;
      } else {
        html += `<span class="auction-bidder" style="color:#888">No bids yet</span>`;
      }
      html += `</div>`;

      html += `<div class="auction-your-turn">`;
      html += `<span class="auction-turn-dot" style="background:${bidder.color}"></span>`;
      html += `<span>${bidder.name}'s turn</span>`;
      html += `<span class="auction-cash">${fmt(bidder.cash)} available</span>`;
      html += `</div>`;
      html += `</div>`;

      if (canBid) {
        // Quick bid buttons
        const quickBids = [minBid, Math.floor(minBid * 1.25), Math.floor(minBid * 1.5), Math.floor(minBid * 2)];
        html += `<div class="auction-quick-bids">`;
        for (const qb of quickBids) {
          if (bidder.cash >= qb) {
            html += `<button class="auction-quick-btn" onclick="game._auctionBid(${qb})">${fmt(qb)}</button>`;
          }
        }
        html += `</div>`;

        // Custom bid input
        html += `<div class="auction-custom">`;
        html += `<input type="number" id="auctionCustomBid" class="auction-input" min="${minBid}" max="${bidder.cash}" step="500" value="${minBid}" placeholder="Custom amount">`;
        html += `<button class="action-btn" onclick="game._auctionBidCustom()">Place Bid</button>`;
        html += `</div>`;
        html += `<p class="auction-min-hint">Minimum bid: ${fmt(minBid)}</p>`;
      } else {
        html += `<p style="color:#f87171;text-align:center;margin-top:12px">Not enough cash to bid (min ${fmt(minBid)})</p>`;
      }

      html += `<button class="action-btn" style="margin-top:4px" onclick="game._auctionPass()">Pass</button>`;

      this._auctionState = { tileIdx, bidders, currentBid, highBidder, bidRound, nextBid, consecutivePasses, minBid };
      this.showModal("Auction", html);
    };

    nextBid();
  }

  _auctionBid(amount) {
    const s = this._auctionState;
    const bidder = s.bidders[s.bidRound % s.bidders.length];
    if (amount > bidder.cash) return;
    if (amount < s.minBid) return;
    s.currentBid = amount;
    s.highBidder = bidder;
    s.bidRound++;
    s.consecutivePasses = 0;
    this.hideModal();
    s.nextBid();
  }

  _auctionBidCustom() {
    const input = document.getElementById("auctionCustomBid");
    if (!input) return;
    const amount = parseInt(input.value);
    if (isNaN(amount)) return;
    this._auctionBid(amount);
  }

  _auctionPass() {
    const s = this._auctionState;
    s.bidRound++;
    s.consecutivePasses++;
    this.hideModal();
    s.nextBid();
  }

  // ─── DEBT & BANKRUPTCY ────────────────────────────────────
  processDebt() {
    for (const p of this.alivePlayers()) {
      if (p.debt > 0) {
        p.debt = Math.floor(p.debt * 1.10); // 10% interest
        p.debtRounds++;
        if (p.debtRounds > 2 && p.properties.length === 0 && p.cash < p.debt) {
          this.eliminatePlayer(p);
        }
      }
    }
  }

  checkBankruptcy(p) {
    if (p.cash <= 0 && p.properties.length === 0 && p.taxis.length === 0) {
      this.eliminatePlayer(p);
    }
  }

  eliminatePlayer(p) {
    p.eliminated = true;
    // Return properties to market
    for (const ti of p.properties) {
      this.board[ti].ownerId = null;
      this.board[ti].tier = 1;
    }
    for (const ti of p.taxis) {
      this.board[ti].ownerId = null;
    }
    p.properties = [];
    p.taxis = [];

    const alive = this.alivePlayers();
    if (alive.length <= 1) {
      this.endGame(alive[0] || null);
      return;
    }

    this.showModal("Eliminated!", `${p.name} has been eliminated!`,
      [{text:"Continue", action:() => this.hideModal()}]);
    this.updateHUD();
  }

  // ─── HEAT & EFFECTS TICK ──────────────────────────────────
  tickHeatDecay() {
    for (const p of this.alivePlayers()) {
      p.heatDecayCounter++;
      if (p.heatDecayCounter >= 3 && p.heat > 0) {
        p.heat--;
        p.heatDecayCounter = 0;
      }
    }
  }

  tickUpgrades() {
    for (let i = 0; i < 56; i++) {
      const t = this.board[i];
      if (t && t.upgradeInProgress && t.upgradeRound < this.round) {
        t.tier = Math.min(4, t.tier + 1);
        t.upgradeInProgress = false;
      }
    }
  }

  tickEffects() {
    for (const p of this.alivePlayers()) {
      if (p.moneyHiddenRounds > 0) {
        p.moneyHiddenRounds--;
        if (p.moneyHiddenRounds <= 0) p.moneyHidden = false;
      }
      if (p.smearRounds > 0) p.smearRounds--;
      if (p.allianceRounds > 0) {
        p.allianceRounds--;
        if (p.allianceRounds <= 0) p.allianceWith = null;
      }
    }
  }

  // ─── STOCKS ───────────────────────────────────────────────
  updateStocks() {
    for (const s of this.stocks) {
      s.prevPrice = s.price;

      // Trend management
      if (s.trendRounds > 0) {
        s.trendRounds--;
      } else {
        // Random trend change
        const r = Math.random();
        if (r < 0.1) { s.trend = 1; s.trendRounds = rng(2, 4); }
        else if (r < 0.2) { s.trend = -1; s.trendRounds = rng(1, 3); }
        else { s.trend = 0; }
      }

      // Price change
      let change = 0;
      const vol = s.volatility;
      const baseChange = rng(-vol * 3, vol * 3);
      change = baseChange + s.trend * vol * 2;

      // Bubble stock
      if (s.isBubble) {
        if (this.round < this.bubblePopRound) {
          change = Math.abs(change) + rng(2, 8); // Always climb
        } else if (!this.bubblePop) {
          this.bubblePop = true;
          change = -Math.floor(s.price * 0.8); // Crash
        } else {
          change = rng(-2, 1); // Stay low
        }
      }

      s.price = Math.max(1, s.price + change);
      s.history.push(s.price);
      if (s.history.length > 20) s.history.shift();
    }
    this.updateStockUI();
  }

  updateStockUI() {
    const body = $("#stockBody");
    if (!body) return;
    body.innerHTML = "";
    for (const s of this.stocks) {
      const diff = s.price - s.prevPrice;
      const cls = diff > 0 ? "stock-up" : diff < 0 ? "stock-down" : "stock-flat";
      const sign = diff > 0 ? "+" : "";
      const row = document.createElement("div");
      row.className = "stock-row";
      row.innerHTML = `
        <span class="stock-name">${s.name}</span>
        <span class="stock-price ${cls}">${fmt(s.price)}</span>
        <span class="stock-change ${cls}">${sign}${diff}</span>
        <span class="stock-actions">
          <button class="stock-btn" onclick="game.buyStock('${s.id}')">B</button>
          <button class="stock-btn" onclick="game.sellStock('${s.id}')">S</button>
        </span>
      `;
      body.appendChild(row);
    }
  }

  buyStock(stockId) {
    const p = this.cp;
    const s = this.stocks.find(x => x.id === stockId);
    if (!s || p.cash < s.price) return;
    p.cash -= s.price;
    p.stocks[stockId] = (p.stocks[stockId] || 0) + 1;
    this.emit("rr:stockTrade", { action:"buy", stockId });
    this.updateHUD();
    this.updateStockUI();
  }

  sellStock(stockId) {
    const p = this.cp;
    const s = this.stocks.find(x => x.id === stockId);
    if (!s || !p.stocks[stockId] || p.stocks[stockId] <= 0) return;
    p.stocks[stockId]--;
    p.cash += s.price;
    this.emit("rr:sellTrade", { action:"sell", stockId });
    this.updateHUD();
    this.updateStockUI();
  }

  // ─── NET WORTH ────────────────────────────────────────────
  netWorth(p) {
    let nw = p.cash - p.debt;
    for (const ti of p.properties) {
      nw += this.board[ti].basePrice * this.board[ti].tier;
    }
    for (const ti of p.taxis) {
      nw += 22000;
    }
    for (const [sid, qty] of Object.entries(p.stocks)) {
      const s = this.stocks.find(x => x.id === sid);
      if (s) nw += s.price * qty;
    }
    return nw;
  }

  // ─── END TURN ─────────────────────────────────────────────
  showEndTurn() {
    this.phase = "endturn";
    $("#endTurnBtn").classList.remove("hidden");
    $("#endTurnBtn").onclick = () => this.endTurn();
    $("#rollBtn").classList.add("hidden");
  }

  showEndTurnAction() {
    this.showEndTurn();
  }

  endTurn() {
    const p = this.cp;
    p.playedCardThisTurn = false;
    $("#endTurnBtn").classList.add("hidden");
    this.hideActionPanel();
    $("#cartelHand").classList.add("hidden");

    this.emit("rr:endTurn");
    this.maybeSyncState();

    // Advance to next player
    let next = (this.currentPlayerIdx + 1) % this.players.length;
    // If we wrapped, increment round
    if (next <= this.currentPlayerIdx || this.alivePlayers().length === 1) {
      // Check if we completed a full round
      let wrapped = false;
      let check = next;
      while (this.players[check].eliminated) {
        check = (check + 1) % this.players.length;
        if (check === this.currentPlayerIdx) break;
      }
      if (check <= this.currentPlayerIdx) {
        this.round++;
        $("#roundNum").textContent = this.round;
      }
    }

    this.currentPlayerIdx = next;
    while (this.cp.eliminated) {
      this.currentPlayerIdx = (this.currentPlayerIdx + 1) % this.players.length;
    }

    this.resetCamera();
    this.beginTurn();
  }

  // ─── GAME OVER ────────────────────────────────────────────
  endGame(winner) {
    cancelAnimationFrame(this.animFrame);
    $("#game").classList.remove("active");
    $("#gameOver").classList.add("active");

    if (winner) {
      $("#winnerTitle").innerHTML = `<span style="color:${winner.color}">${winner.name}</span> Wins!`;
      $("#winnerDesc").textContent = `Dominated the real estate market in ${this.round} rounds.`;
    } else {
      $("#winnerTitle").textContent = "Game Over";
      $("#winnerDesc").textContent = "Everyone went bankrupt!";
    }

    let stats = "";
    for (const p of this.players) {
      stats += `<div class="stat-row"><span class="stat-label" style="color:${p.color}">${p.name}</span>`;
      stats += `<span class="stat-val">${p.eliminated ? "Eliminated" : fmt(this.netWorth(p))}</span></div>`;
    }
    $("#finalStats").innerHTML = stats;

    $("#playAgain").onclick = () => {
      $("#gameOver").classList.remove("active");
      $("#lobby").classList.add("active");
    };
  }

  // ─── UI HELPERS ───────────────────────────────────────────
  showActionPanel(title, html) {
    const panel = $("#actionPanel");
    panel.classList.remove("hidden");
    $("#actionTitle").textContent = title;
    $("#actionBody").innerHTML = html;
  }

  hideActionPanel() {
    $("#actionPanel").classList.add("hidden");
  }

  showModal(title, bodyHtml, buttons) {
    const modal = $("#modal");
    modal.classList.remove("hidden");
    $("#modalTitle").textContent = title;

    if (typeof bodyHtml === "string") {
      $("#modalBody").innerHTML = bodyHtml;
    }

    const actions = $("#modalActions");
    actions.innerHTML = "";
    if (buttons) {
      buttons.forEach(b => {
        const btn = document.createElement("button");
        btn.className = "action-btn";
        btn.textContent = b.text;
        btn.onclick = b.action;
        actions.appendChild(btn);
      });
    }
  }

  hideModal() {
    $("#modal").classList.add("hidden");
  }

  sideName(side) {
    return { A:"Downtown Core", B:"Resort Strip", C:"Midtown", D:"Suburbs" }[side] || side;
  }

  updateHUD() {
    const el = $("#hudPlayers");
    el.innerHTML = "";
    for (const p of this.players) {
      const div = document.createElement("div");
      let cls = "hud-player";
      if (p.id === this.cp.id) cls += " active";
      if (p.eliminated) cls += " eliminated";
      if (p.jail > 0) cls += " jailed";
      div.className = cls;

      const nw = p.moneyHidden && p.id !== this.cp.id ? "???" : fmt(this.netWorth(p));
      const cashDisplay = p.moneyHidden && p.id !== this.cp.id ? "???" : fmt(p.cash);

      div.innerHTML = `
        <span class="hud-dot" style="background:${p.color}"></span>
        <span>
          <span class="hud-name">${p.name}</span><br>
          <span class="hud-cash">${cashDisplay}</span>
          <span class="hud-props">${p.properties.length} props</span>
        </span>
        <span class="hud-heat heat-${p.heat}">${p.jail > 0 ? "JAIL " + p.jail : "Heat " + p.heat}</span>
      `;
      el.appendChild(div);
    }
  }

  // ─── RENDERING ────────────────────────────────────────────
  renderLoop() {
    // Smooth camera
    this.cameraX += (this.targetCamX - this.cameraX) * 0.08;
    this.cameraY += (this.targetCamY - this.cameraY) * 0.08;
    this.cameraZoom += (this.targetCamZoom - this.cameraZoom) * 0.08;

    this.renderBoard();
    this.renderMinimap();
    this.animFrame = requestAnimationFrame(() => this.renderLoop());
  }

  renderBoard() {
    const ctx = this.ctx;
    const canvas = this.canvas;
    const wrap = $("#boardWrap");
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;

    // Size canvas to viewport
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    canvas.width = w * devicePixelRatio;
    canvas.height = h * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

    // Clear
    ctx.fillStyle = "#0d0d1a";
    ctx.fillRect(0, 0, w, h);

    // Camera transform
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(this.cameraZoom, this.cameraZoom);
    ctx.translate(-this.cameraX, -this.cameraY);

    // Draw tiles
    for (let i = 0; i < 56; i++) {
      this.drawTile(ctx, i);
    }

    // Draw center area
    this.drawCenter(ctx);

    // Draw player tokens
    for (const p of this.players) {
      if (p.eliminated) continue;
      this.drawToken(ctx, p);
    }

    ctx.restore();
  }

  drawTile(ctx, idx) {
    const tile = this.board[idx];
    if (!tile) return;

    const { x, y } = tilePx(idx);
    const s = TILE_SIZE;
    const pad = 1;
    const r = 6; // corner radius

    // Background
    let bg = "#181830";
    let borderColor = "rgba(255,255,255,0.08)";
    if (tile.type === "property") {
      bg = tile.ownerId !== null ?
        this.players[tile.ownerId].color + "30" : "#1e1e3a";
      if (tile.ownerId != null) borderColor = this.players[tile.ownerId].color + "55";
    } else if (tile.type === "corner") {
      bg = CORNER_COLORS[tile.corner] + "22";
      borderColor = CORNER_COLORS[tile.corner] + "55";
    } else if (tile.type === "taxi") {
      bg = "#fbbf2420"; borderColor = "#fbbf2444";
    } else if (tile.type === "lucky") {
      bg = "#4ade8020"; borderColor = "#4ade8044";
    } else if (tile.type === "unlucky") {
      bg = "#f8717120"; borderColor = "#f8717144";
    } else if (tile.type === "bank") {
      bg = "#60a5fa18"; borderColor = "#60a5fa44";
    } else if (tile.type === "momentum") {
      bg = "#c084fc18"; borderColor = "#c084fc44";
    }

    // Rounded rect fill
    this._roundRect(ctx, x + pad, y + pad, s - pad * 2, s - pad * 2, r);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Side color bar for properties (thicker)
    if (tile.type === "property" && tile.side) {
      ctx.fillStyle = SIDE_COLORS[tile.side];
      ctx.fillRect(x + pad + r, y + pad, s - pad * 2 - r * 2, 5);
    }
    if (tile.type === "taxi") {
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(x + pad + r, y + pad, s - pad * 2 - r * 2, 5);
    }

    // Ownership dot
    if (tile.ownerId != null) {
      ctx.fillStyle = this.players[tile.ownerId].color;
      ctx.beginPath();
      ctx.arc(x + s - 14, y + 16, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Tier stars for owned properties
    if (tile.type === "property" && tile.ownerId != null) {
      const tierW = tile.tier * 13;
      const startX = x + s / 2 - tierW / 2;
      for (let t = 0; t < tile.tier; t++) {
        ctx.fillStyle = t < tile.tier ? "#fbbf24" : "#333";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("\u2605", startX + t * 13 + 6, y + s - 10);
      }
    }

    // Under construction overlay
    if (tile.upgradeInProgress) {
      ctx.fillStyle = "rgba(251,191,36,0.2)";
      this._roundRect(ctx, x + pad, y + pad, s - pad * 2, s - pad * 2, r);
      ctx.fill();
      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("\uD83D\uDD28", x + s / 2, y + s / 2 + 6);
      return; // don't draw text over construction
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Type icon (centered, above name)
    const TILE_ICONS = {
      corner: { hq:"\uD83C\uDFE0", cityhall:"\uD83C\uDFDB", police:"\uD83D\uDE94", underground:"\uD83D\uDCA0" },
      taxi: "\uD83D\uDE95",
      tax: "\uD83D\uDCB8",
      bank: "\uD83C\uDFE6",
      lucky: "\uD83C\uDF40",
      unlucky: "\u26A0",
      momentum: "\u26A1",
      underground_card: "\uD83C\uDCCF",
      free: "\uD83D\uDEB6",
    };

    let icon = "";
    if (tile.type === "corner") icon = TILE_ICONS.corner[tile.corner] || "";
    else if (tile.type === "property") icon = "";
    else icon = TILE_ICONS[tile.type] || "";

    if (icon) {
      ctx.font = "22px sans-serif";
      ctx.fillText(icon, x + s / 2, y + s / 2 - 14);
    }

    // Tile name (word-wrap into 2 lines max)
    const name = tile.name || "";
    ctx.fillStyle = "#e8e8f0";
    ctx.font = "bold 11px sans-serif";
    const nameY = icon ? y + s / 2 + 8 : y + s / 2 - 8;
    this._drawWrappedText(ctx, name, x + s / 2, nameY, s - 14, 13, 2);

    // Sub-label
    if (tile.type === "property") {
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.font = "10px sans-serif";
      ctx.fillText(fmt(tile.basePrice), x + s / 2, y + s - 22);
    } else if (tile.type === "corner") {
      ctx.fillStyle = CORNER_COLORS[tile.corner];
      ctx.font = "bold 11px sans-serif";
      const labels = { hq:"HQ", cityhall:"CITY HALL", police:"POLICE", underground:"MARKET" };
      ctx.fillText(labels[tile.corner], x + s / 2, y + s - 14);
    } else if (tile.type === "tax") {
      ctx.fillStyle = "#f87171";
      ctx.font = "bold 10px sans-serif";
      ctx.fillText("TAX 8%", x + s / 2, y + s - 14);
    }
  }

  // Helper: rounded rectangle path
  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // Helper: word-wrap text into maxLines
  _drawWrappedText(ctx, text, cx, startY, maxWidth, lineHeight, maxLines) {
    const words = text.split(" ");
    let lines = [];
    let line = "";
    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      lines[maxLines - 1] = lines[maxLines - 1].slice(0, -1) + "\u2026";
    }
    const totalH = lines.length * lineHeight;
    const topY = startY - totalH / 2 + lineHeight / 2;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], cx, topY + i * lineHeight);
    }
  }

  drawCenter(ctx) {
    const margin = TILE_SIZE;
    const inner = BOARD_PX - margin * 2;

    // Subtle bg
    ctx.fillStyle = "rgba(10,10,26,0.95)";
    ctx.fillRect(margin, margin, inner, inner);

    // Logo
    ctx.fillStyle = "#fff";
    ctx.font = "bold 48px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Realty", BOARD_PX / 2, BOARD_PX / 2 - 28);
    ctx.fillStyle = "#00d4aa";
    ctx.fillText("Rush", BOARD_PX / 2, BOARD_PX / 2 + 28);

    // Round
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "16px sans-serif";
    ctx.fillText(`Round ${this.round} \u2014 ${MODE_CFG[this.mode].label}`, BOARD_PX / 2, BOARD_PX / 2 + 72);

    // Side labels (inside center area, not overlapping tiles)
    ctx.save();
    ctx.font = "bold 14px sans-serif";
    ctx.fillStyle = SIDE_COLORS.A;
    ctx.fillText("DOWNTOWN CORE", BOARD_PX / 2, BOARD_PX - margin - 14);
    ctx.fillStyle = SIDE_COLORS.B;
    ctx.save();
    ctx.translate(BOARD_PX - margin - 14, BOARD_PX / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("RESORT STRIP", 0, 0);
    ctx.restore();
    ctx.fillStyle = SIDE_COLORS.C;
    ctx.fillText("MIDTOWN", BOARD_PX / 2, margin + 22);
    ctx.fillStyle = SIDE_COLORS.D;
    ctx.save();
    ctx.translate(margin + 22, BOARD_PX / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillText("SUBURBS", 0, 0);
    ctx.restore();
    ctx.restore();
  }

  drawToken(ctx, p) {
    const { x, y } = tilePx(p.pos);
    const offset = p.id * 12;
    const tx = x + 22 + (offset % 60);
    const ty = y + 36 + Math.floor(offset / 60) * 16;

    // Shadow
    ctx.beginPath();
    ctx.arc(tx, ty + 2, 9, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fill();

    // Token
    ctx.beginPath();
    ctx.arc(tx, ty, 8, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Jail indicator
    if (p.jail > 0) {
      ctx.strokeStyle = "#f87171";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tx - 8, ty - 8);
      ctx.lineTo(tx + 8, ty + 8);
      ctx.moveTo(tx + 8, ty - 8);
      ctx.lineTo(tx - 8, ty + 8);
      ctx.stroke();
    }
  }

  renderMinimap() {
    const mc = $("#minimap");
    const mctx = mc.getContext("2d");
    const ms = 160;
    const scale = ms / BOARD_PX;

    mctx.clearRect(0, 0, ms, ms);
    mctx.fillStyle = "rgba(10,10,26,0.9)";
    mctx.fillRect(0, 0, ms, ms);

    // Tiles
    for (let i = 0; i < 56; i++) {
      const tile = this.board[i];
      if (!tile) continue;
      const { x, y } = tilePx(i);
      const mx = x * scale;
      const my = y * scale;
      const mw = TILE_SIZE * scale;

      let c = "rgba(255,255,255,0.1)";
      if (tile.ownerId != null) c = this.players[tile.ownerId].color + "88";
      else if (tile.type === "corner") c = CORNER_COLORS[tile.corner] + "44";

      mctx.fillStyle = c;
      mctx.fillRect(mx, my, mw, mw);
    }

    // Player dots
    for (const p of this.players) {
      if (p.eliminated) continue;
      const { x, y } = tilePx(p.pos);
      const mx = (x + TILE_SIZE / 2) * scale;
      const my = (y + TILE_SIZE / 2) * scale;
      mctx.beginPath();
      mctx.arc(mx, my, 4, 0, Math.PI * 2);
      mctx.fillStyle = p.color;
      mctx.fill();
      mctx.strokeStyle = "#fff";
      mctx.lineWidth = 1;
      mctx.stroke();
    }

    // Camera viewport
    const wrap = $("#boardWrap");
    const vw = (wrap.clientWidth / this.cameraZoom) * scale;
    const vh = (wrap.clientHeight / this.cameraZoom) * scale;
    const vx = (this.cameraX - wrap.clientWidth / 2 / this.cameraZoom) * scale;
    const vy = (this.cameraY - wrap.clientHeight / 2 / this.cameraZoom) * scale;
    mctx.strokeStyle = "rgba(0,212,170,0.5)";
    mctx.lineWidth = 1;
    mctx.strokeRect(vx, vy, vw, vh);
  }
}

// ─── INIT ───────────────────────────────────────────────────
window.game = new RealtyRush();

})();
