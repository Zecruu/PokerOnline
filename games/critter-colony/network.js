/* ============================================================
   Critter Colony — Multiplayer Networking (Socket.IO Client)
   ============================================================ */

class Network {
    constructor(game) {
        this.game = game;
        this.socket = null;
        this.roomId = null;
        this.playerId = null;
        this.playerName = 'Player';
        this.isHost = false;
        this.connected = false;
        this.peers = new Map(); // peerId → { name, x, y, dir, hp, maxHp, color }
        this._sendTimer = 0;
        this._syncTimer = 0;
        this._peerSprites = new Map(); // peerId → { canvas, tex, sprite }
        this.SEND_RATE = 1 / 15; // 15 updates/sec for player position
        this.SYNC_RATE = 2; // full state sync every 2s (host only)
    }

    // ─── CONNECTION ──────────────────────────────────────────
    connect(serverUrl) {
        return new Promise((resolve, reject) => {
            if (this.socket) { this.socket.disconnect(); }
            this.socket = io(serverUrl, {
                path: '/colony-mp',
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionAttempts: 5,
            });

            this.socket.on('connect', () => {
                this.connected = true;
                this.playerId = this.socket.id;
                console.log('[MP] Connected:', this.playerId);
                resolve();
            });

            this.socket.on('connect_error', (err) => {
                console.error('[MP] Connection error:', err.message);
                reject(err);
            });

            this.socket.on('disconnect', (reason) => {
                console.log('[MP] Disconnected:', reason);
                this.connected = false;
                this._onDisconnect(reason);
            });

            this._setupListeners();
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.connected = false;
        this.roomId = null;
        this.isHost = false;
        this.peers.clear();
        this._cleanupPeerSprites();
    }

    // ─── ROOM MANAGEMENT ────────────────────────────────────
    createRoom(name) {
        this.playerName = name || 'Player';
        return new Promise((resolve, reject) => {
            this.socket.emit('colony:create', {
                name: this.playerName,
                worldSeed: this.game.world.seed,
            }, (res) => {
                if (res.error) { reject(new Error(res.error)); return; }
                this.roomId = res.roomId;
                this.isHost = true;
                console.log('[MP] Created room:', this.roomId);
                resolve(res);
            });
        });
    }

    joinRoom(roomId, name) {
        this.playerName = name || 'Player';
        return new Promise((resolve, reject) => {
            this.socket.emit('colony:join', {
                roomId,
                name: this.playerName,
            }, (res) => {
                if (res.error) { reject(new Error(res.error)); return; }
                this.roomId = roomId;
                this.isHost = false;
                // Apply host's world state
                if (res.worldState) {
                    this._applyWorldState(res.worldState);
                }
                // Add existing players
                if (res.players) {
                    for (const p of res.players) {
                        if (p.id !== this.playerId) {
                            this.peers.set(p.id, {
                                name: p.name,
                                x: p.x || 0, y: p.y || 0,
                                dir: 'front', hp: 100, maxHp: 100,
                                color: p.color || this._randomColor(),
                            });
                        }
                    }
                }
                console.log('[MP] Joined room:', roomId);
                resolve(res);
            });
        });
    }

    listRooms() {
        return new Promise((resolve) => {
            this.socket.emit('colony:list', {}, (res) => {
                resolve(res.rooms || []);
            });
        });
    }

    leaveRoom() {
        if (this.socket && this.roomId) {
            this.socket.emit('colony:leave', { roomId: this.roomId });
        }
        this.roomId = null;
        this.isHost = false;
        this.peers.clear();
        this._cleanupPeerSprites();
    }

    // ─── LISTENERS ──────────────────────────────────────────
    _setupListeners() {
        const s = this.socket;

        // Player joined our room
        s.on('colony:player-joined', (data) => {
            this.peers.set(data.id, {
                name: data.name,
                x: 0, y: 0, dir: 'front',
                hp: 100, maxHp: 100,
                color: data.color || this._randomColor(),
            });
            UI.notify(`${data.name} joined the colony!`, 3000);
        });

        // Player left
        s.on('colony:player-left', (data) => {
            const peer = this.peers.get(data.id);
            if (peer) UI.notify(`${peer.name} left the colony.`, 3000);
            this.peers.delete(data.id);
            this._cleanupPeerSprite(data.id);
            // If host left, promote or disconnect
            if (data.newHost === this.playerId) {
                this.isHost = true;
                UI.notify('You are now the host!', 4000);
            }
        });

        // Player position updates (batched)
        s.on('colony:positions', (data) => {
            for (const p of data) {
                if (p.id === this.playerId) continue;
                const peer = this.peers.get(p.id);
                if (peer) {
                    peer.x = p.x; peer.y = p.y;
                    peer.dir = p.dir || 'front';
                    peer.hp = p.hp; peer.maxHp = p.maxHp;
                }
            }
        });

        // Game state sync from host
        s.on('colony:state-sync', (state) => {
            if (this.isHost) return; // host doesn't apply own sync
            this._applyStateSync(state);
        });

        // Individual actions
        s.on('colony:action', (data) => {
            if (data.from === this.playerId) return;
            this._handleRemoteAction(data);
        });

        // Chat/notifications
        s.on('colony:chat', (data) => {
            UI.notify(`[${data.name}] ${data.msg}`, 4000);
        });

        // Peer projectile
        s.on('colony:projectile', (data) => {
            if (data.from === this.playerId) return;
            this.game.projectiles.push({
                x: data.x, y: data.y,
                vx: data.vx, vy: data.vy,
                damage: data.damage, lifetime: 2,
                fromPeer: true,
            });
        });
    }

    // ─── SENDING ────────────────────────────────────────────
    update(dt) {
        if (!this.connected || !this.roomId) return;

        // Send position at SEND_RATE
        this._sendTimer += dt;
        if (this._sendTimer >= this.SEND_RATE) {
            this._sendTimer = 0;
            this.socket.volatile.emit('colony:move', {
                x: this.game.player.x,
                y: this.game.player.y,
                dir: this.game.player._dir || 'front',
                hp: this.game.player.hp,
                maxHp: this.game.player.maxHp,
            });
        }

        // Host sends state sync
        if (this.isHost) {
            this._syncTimer += dt;
            if (this._syncTimer >= this.SYNC_RATE) {
                this._syncTimer = 0;
                this._sendStateSync();
            }
        }
    }

    _sendStateSync() {
        const g = this.game;
        this.socket.emit('colony:state-sync', {
            resources: { ...g.resources },
            resourceCaps: { ...g.resourceCaps },
            inventory: { ...g.inventory },
            buildings: g.buildings.map(b => ({
                id: b.id, type: b.type, gridX: b.gridX, gridY: b.gridY,
                workers: [...b.workers], productionAccum: b.productionAccum,
                hp: b.hp, maxHp: b.maxHp,
            })),
            critters: g.critters.map(c => ({
                id: c.id, species: c.species, nickname: c.nickname,
                stats: { ...c.stats }, level: c.level, xp: c.xp,
                assignment: c.assignment, injured: c.injured,
                passives: c.passives || [],
                patrolHp: c.patrolHp, patrolMaxHp: c.patrolMaxHp,
                _patrolX: c._patrolX, _patrolY: c._patrolY,
            })),
            research: { ...g.research },
            researchInProgress: g.researchInProgress ? { ...g.researchInProgress } : null,
            hordeTimer: g.hordeTimer,
            hordeWave: g.hordeWave,
            hordeActive: g.hordeActive,
            gameTimeSec: g.gameTimeSec,
        });
    }

    // Send an action event to all peers
    sendAction(type, data) {
        if (!this.connected || !this.roomId) return;
        this.socket.emit('colony:action', { type, ...data });
    }

    sendProjectile(x, y, vx, vy, damage) {
        if (!this.connected || !this.roomId) return;
        this.socket.volatile.emit('colony:projectile', { x, y, vx, vy, damage });
    }

    sendChat(msg) {
        if (!this.connected || !this.roomId) return;
        this.socket.emit('colony:chat', { msg, name: this.playerName });
    }

    // ─── RECEIVING ──────────────────────────────────────────
    _applyWorldState(state) {
        const g = this.game;
        // Apply world seed and chunks
        if (state.worldSeed !== undefined) {
            g.world.generate(state.worldSeed);
            if (state.modifiedChunks) {
                Save.restoreModifiedChunks(g.world, state.modifiedChunks);
            }
            if (state.waypoints) g.world.waypoints = state.waypoints;
        }
        // Apply full game state
        if (state.resources) g.resources = { ...state.resources };
        if (state.resourceCaps) g.resourceCaps = { ...state.resourceCaps };
        if (state.inventory) g.inventory = { ...state.inventory };
        if (state.buildings) {
            g.buildings = state.buildings.map(b => {
                const def = BUILDING_DEFS[b.type];
                const maxHp = def ? (def.hp || 100) : 100;
                return { ...b, workers: [...(b.workers||[])], turretCooldown: 0, turretTarget: null, hp: b.hp ?? maxHp, maxHp };
            });
        }
        if (state.critters) {
            g.critters = state.critters.map(c => ({ ...c, stats: { ...c.stats } }));
        }
        if (state.research) g.research = { ...state.research };
        if (state.researchInProgress !== undefined) g.researchInProgress = state.researchInProgress;
        // Spawn wild critters for this client
        g.wildCritters = Critters.spawnWild(g.world);
    }

    _applyStateSync(state) {
        const g = this.game;
        // Resources / inventory sync
        if (state.resources) g.resources = { ...state.resources };
        if (state.resourceCaps) g.resourceCaps = { ...state.resourceCaps };
        if (state.inventory) g.inventory = { ...state.inventory };
        // Buildings sync (careful not to lose sprite refs)
        if (state.buildings) {
            const oldMap = new Map(g.buildings.map(b => [b.id, b]));
            g.buildings = state.buildings.map(sb => {
                const existing = oldMap.get(sb.id);
                if (existing) {
                    // Update existing, keep sprite refs
                    existing.workers = [...(sb.workers || [])];
                    existing.productionAccum = sb.productionAccum;
                    existing.hp = sb.hp;
                    existing.maxHp = sb.maxHp;
                    return existing;
                }
                const def = BUILDING_DEFS[sb.type];
                const maxHp = def ? (def.hp || 100) : 100;
                return { ...sb, workers: [...(sb.workers||[])], turretCooldown: 0, turretTarget: null, hp: sb.hp ?? maxHp, maxHp };
            });
        }
        // Critters sync (keep sprite refs)
        if (state.critters) {
            const oldMap = new Map(g.critters.map(c => [c.id, c]));
            g.critters = state.critters.map(sc => {
                const existing = oldMap.get(sc.id);
                if (existing) {
                    Object.assign(existing, sc);
                    existing.stats = { ...sc.stats };
                    return existing;
                }
                return { ...sc, stats: { ...sc.stats } };
            });
        }
        if (state.research) g.research = { ...state.research };
        if (state.researchInProgress !== undefined) g.researchInProgress = state.researchInProgress;
        if (state.hordeTimer !== undefined) g.hordeTimer = state.hordeTimer;
        if (state.hordeWave !== undefined) g.hordeWave = state.hordeWave;
        if (state.gameTimeSec !== undefined) g.gameTimeSec = state.gameTimeSec;
    }

    _handleRemoteAction(data) {
        const g = this.game;
        switch (data.type) {
            case 'build': {
                const def = BUILDING_DEFS[data.buildingType];
                if (!def) return;
                const b = { ...data.building, workers: [], turretCooldown: 0, turretTarget: null };
                g.buildings.push(b);
                UI.notify(`${data.playerName} built ${def.name}!`, 2000);
                break;
            }
            case 'capture': {
                if (data.critter) {
                    g.critters.push({ ...data.critter, stats: { ...data.critter.stats } });
                    const sp = SPECIES[data.critter.species];
                    UI.notify(`${data.playerName} captured ${sp?.name || 'a critter'}!`, 2000);
                }
                break;
            }
            case 'research-start': {
                if (data.researchId) {
                    g.researchInProgress = { id: data.researchId, progress: 0 };
                }
                break;
            }
            case 'colony-expand': {
                if (data.tx !== undefined && data.ty !== undefined) {
                    g.world.expandColony(data.tx, data.ty, data.radius || 6);
                    g._invalidateChunksNear(data.tx, data.ty, data.radius || 6);
                }
                break;
            }
            case 'horde-start': {
                if (!g.hordeActive) {
                    g._startHorde();
                }
                break;
            }
        }
    }

    _onDisconnect(reason) {
        this.peers.clear();
        this._cleanupPeerSprites();
        if (this.roomId) {
            UI.notify('Disconnected from multiplayer.', 4000);
            this.roomId = null;
        }
    }

    // ─── RENDERING PEERS ────────────────────────────────────
    drawPeers(gfx) {
        const PLAYER_COLORS = [0x66bb6a, 0xffa726, 0xab47bc, 0x29b6f6, 0xef5350, 0xffee58, 0x26c6da, 0xec407a];
        let colorIdx = 0;

        for (const [peerId, peer] of this.peers) {
            const px = peer.x, py = peer.y;
            const color = PLAYER_COLORS[colorIdx % PLAYER_COLORS.length];
            colorIdx++;

            // Shadow
            gfx.beginFill(0x000000, 0.25);
            gfx.drawEllipse(px, py + 16, 10, 4);
            gfx.endFill();

            // Body circle (colored per peer)
            gfx.beginFill(color);
            gfx.lineStyle(2, 0xffffff, 0.8);
            gfx.drawCircle(px, py, 10);
            gfx.endFill();
            gfx.lineStyle(0);

            // Name tag (world space)
            const t = this.game._getWorldText(peer.name, {
                fontFamily: 'monospace', fontSize: 10, fontWeight: 'bold',
                fill: color, stroke: 0x000000, strokeThickness: 2,
            });
            t.x = px; t.y = py - 24;

            // HP bar if damaged
            if (peer.hp < peer.maxHp) {
                const hpW = 28, hpH = 3;
                gfx.beginFill(0x333333);
                gfx.drawRect(px - hpW / 2, py - 34, hpW, hpH);
                gfx.endFill();
                const pct = Math.max(0, peer.hp / peer.maxHp);
                gfx.beginFill(pct > 0.5 ? 0x4ade80 : pct > 0.25 ? 0xfbbf24 : 0xf87171);
                gfx.drawRect(px - hpW / 2, py - 34, hpW * pct, hpH);
                gfx.endFill();
            }
        }
    }

    // Draw peer dots on minimap
    drawPeersMinimap(gfx, mapX, mapY, mapSize, scale) {
        const PLAYER_COLORS = [0x66bb6a, 0xffa726, 0xab47bc, 0x29b6f6, 0xef5350];
        let colorIdx = 0;
        for (const [, peer] of this.peers) {
            const px = mapX + mapSize / 2 + (peer.x / TILE_SIZE) * scale;
            const py = mapY + mapSize / 2 + (peer.y / TILE_SIZE) * scale;
            if (px >= mapX && px <= mapX + mapSize && py >= mapY && py <= mapY + mapSize) {
                gfx.beginFill(PLAYER_COLORS[colorIdx % PLAYER_COLORS.length]);
                gfx.drawCircle(px, py, 3);
                gfx.endFill();
            }
            colorIdx++;
        }
    }

    _cleanupPeerSprites() {
        for (const [id, data] of this._peerSprites) {
            if (data.sprite && data.sprite.parent) data.sprite.parent.removeChild(data.sprite);
            if (data.sprite) data.sprite.destroy({ children: true });
        }
        this._peerSprites.clear();
    }

    _cleanupPeerSprite(peerId) {
        const data = this._peerSprites.get(peerId);
        if (data) {
            if (data.sprite && data.sprite.parent) data.sprite.parent.removeChild(data.sprite);
            if (data.sprite) data.sprite.destroy({ children: true });
            this._peerSprites.delete(peerId);
        }
    }

    _randomColor() {
        const colors = ['#66bb6a', '#ffa726', '#ab47bc', '#29b6f6', '#ef5350', '#ffee58', '#26c6da', '#ec407a'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // ─── MULTIPLAYER UI ─────────────────────────────────────
    getPlayerCount() {
        return this.peers.size + 1;
    }

    getPeerList() {
        const list = [{ id: this.playerId, name: this.playerName + (this.isHost ? ' (Host)' : ''), isLocal: true }];
        for (const [id, peer] of this.peers) {
            list.push({ id, name: peer.name, isLocal: false });
        }
        return list;
    }
}
