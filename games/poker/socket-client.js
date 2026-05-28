// Socket.io Client for Multiplayer Poker
// Connects to the WebSocket server for real-time multiplayer

class SocketClient {
    constructor() {
        this.socket = null;
        this.serverUrl = this.getServerUrl();
        this.connected = false;
        this.roomCode = null;
        this.playerId = null;

        // Reconnect / queue state
        this.intentionalDisconnect = false;
        this.pendingActions = [];

        // Callbacks
        this.onConnect = null;
        this.onDisconnect = null;
        this.onReconnecting = null;
        this.onReconnected = null;
        this.onReconnectFailed = null;
        this.onSessionExpired = null;
        this.onRoomCreated = null;
        this.onRoomJoined = null;
        this.onPlayerJoined = null;
        this.onPlayerReconnected = null;
        this.onGameStarted = null;
        this.onGameUpdate = null;
        this.onShowdown = null;
        this.onRoundEnd = null;
        this.onChatMessage = null;
        this.onError = null;
    }

    getServerUrl() {
        // Check if we're on localhost
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3001';
        }
        // For production, default to the same origin (monolith deployment)
        // Or check for environment variable injected by build process
        return window.SOCKET_SERVER_URL || window.location.origin;
    }

    connect() {
        return new Promise((resolve, reject) => {
            if (this.socket && this.connected) {
                resolve();
                return;
            }

            // Load Socket.io client if not loaded
            if (typeof io === 'undefined') {
                const script = document.createElement('script');
                script.src = 'https://cdn.socket.io/4.7.4/socket.io.min.js';
                script.onload = () => this.initSocket(resolve, reject);
                script.onerror = () => reject(new Error('Failed to load Socket.io'));
                document.head.appendChild(script);
            } else {
                this.initSocket(resolve, reject);
            }
        });
    }

    initSocket(resolve, reject) {
        try {
            this.socket = io(this.serverUrl, {
                transports: ['websocket', 'polling'],
                timeout: 10000,
                reconnection: true,
                reconnectionAttempts: Infinity,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 30000,
                randomizationFactor: 0
            });

            let initialResolved = false;
            const resolveOnce = () => {
                if (initialResolved) return;
                initialResolved = true;
                resolve();
            };
            const rejectOnce = (err) => {
                if (initialResolved) return;
                initialResolved = true;
                reject(err);
            };

            this.socket.on('connect', () => {
                console.log('✅ Connected to server');
                this.connected = true;
                if (this.onConnect) this.onConnect();
                resolveOnce();
            });

            this.socket.on('disconnect', (reason) => {
                console.log(`❌ Disconnected from server: ${reason}`);
                this.connected = false;
                if (this.onDisconnect) this.onDisconnect(reason);
                // socket.io v4 will auto-reconnect unless the disconnect was
                // initiated by the server with reason "io server disconnect"
                // or by us via socket.disconnect() (this.intentionalDisconnect).
                if (!this.intentionalDisconnect && reason !== 'io server disconnect') {
                    if (this.onReconnecting) this.onReconnecting({ attempt: 0 });
                }
            });

            this.socket.io.on('reconnect_attempt', (attempt) => {
                console.log(`🔄 Reconnect attempt #${attempt}`);
                if (this.onReconnecting) this.onReconnecting({ attempt });
            });

            this.socket.io.on('reconnect', (attempt) => {
                console.log(`✅ Reconnected after ${attempt} attempt(s)`);
                this.connected = true;
                // Rejoin BEFORE flushing queued actions so the server knows who we are.
                if (this.roomCode && this.playerId) {
                    this.socket.emit('rejoinRoom', {
                        roomCode: this.roomCode,
                        playerId: this.playerId
                    });
                }
                if (this.onReconnected) this.onReconnected({ attempt });
                // Don't flush actions yet — wait for rejoinRoom ack.
            });

            this.socket.io.on('reconnect_error', (error) => {
                console.warn('Reconnect error:', error?.message || error);
            });

            this.socket.io.on('reconnect_failed', () => {
                console.error('❌ Reconnect failed permanently');
                if (this.onReconnectFailed) this.onReconnectFailed();
            });

            this.socket.on('connect_error', (error) => {
                console.error('Connection error:', error);
                // Only reject the initial connect Promise; later connect_errors
                // are part of the reconnection loop and should not throw.
                rejectOnce(error);
            });

            // Game events
            this.socket.on('roomCreated', (data) => {
                this.roomCode = data.roomCode;
                this.playerId = data.playerId;
                if (this.onRoomCreated) this.onRoomCreated(data);
            });

            this.socket.on('roomJoined', (data) => {
                this.roomCode = data.roomCode;
                this.playerId = data.playerId;
                if (this.onRoomJoined) this.onRoomJoined(data);
            });

            this.socket.on('rejoinSuccess', (data) => {
                console.log('✅ Rejoin acknowledged by server');
                this.flushPendingActions();
            });

            this.socket.on('rejoinFailed', (data) => {
                console.warn('❌ Rejoin failed:', data?.reason);
                // Clear queued actions — server has no slot for us.
                this.pendingActions = [];
                if (this.onSessionExpired) this.onSessionExpired(data);
            });

            this.socket.on('playerReconnected', (data) => {
                if (this.onPlayerReconnected) this.onPlayerReconnected(data);
            });

            this.socket.on('playerJoined', (data) => {
                if (this.onPlayerJoined) this.onPlayerJoined(data);
            });

            this.socket.on('gameStarted', (data) => {
                if (this.onGameStarted) this.onGameStarted(data);
            });

            this.socket.on('gameUpdate', (data) => {
                if (this.onGameUpdate) this.onGameUpdate(data);
            });

            this.socket.on('showdown', (data) => {
                if (this.onShowdown) this.onShowdown(data);
            });

            this.socket.on('roundEnd', (data) => {
                if (this.onRoundEnd) this.onRoundEnd(data);
            });

            this.socket.on('newChatMessage', (data) => {
                if (this.onChatMessage) this.onChatMessage(data);
            });

            this.socket.on('error', (data) => {
                console.error('Server error:', data);
                if (this.onError) this.onError(data);
            });

            this.socket.on('buyBackSuccess', (data) => {
                if (this.onBuyBackSuccess) this.onBuyBackSuccess(data);
            });

            this.socket.on('playerDisconnected', (data) => {
                if (this.onPlayerDisconnected) this.onPlayerDisconnected(data);
            });

        } catch (error) {
            reject(error);
        }
    }

    flushPendingActions() {
        if (this.pendingActions.length === 0) return;
        const queue = this.pendingActions.slice();
        this.pendingActions = [];
        for (const item of queue) {
            this.socket.emit(item.event, item.payload);
        }
    }

    // Room operations
    createRoom(playerName, settings, withAI, avatarId) {
        if (!this.socket) return;
        this.socket.emit('createRoom', { playerName, settings, withAI, avatarId });
    }

    joinRoom(roomCode, playerName, avatarId) {
        if (!this.socket) return;
        this.socket.emit('joinRoom', { roomCode, playerName, avatarId });
    }

    // Game operations — queue when disconnected so they fire after reconnect.
    playerAction(action, amount) {
        if (!this.socket) return;
        const payload = { action, amount };
        if (this.connected) {
            this.socket.emit('playerAction', payload);
        } else {
            this.pendingActions.push({ event: 'playerAction', payload });
        }
    }

    startGame() {
        if (!this.socket) return;
        if (this.connected) {
            this.socket.emit('startGame');
        } else {
            this.pendingActions.push({ event: 'startGame', payload: undefined });
        }
    }

    nextRound() {
        if (!this.socket) return;
        if (this.connected) {
            this.socket.emit('nextRound');
        } else {
            this.pendingActions.push({ event: 'nextRound', payload: undefined });
        }
    }

    buyBack() {
        if (!this.socket) return;
        if (this.connected) {
            this.socket.emit('buyBack');
        } else {
            this.pendingActions.push({ event: 'buyBack', payload: undefined });
        }
    }

    // Chat
    sendChatMessage(message) {
        if (!this.socket) return;
        const payload = { message };
        if (this.connected) {
            this.socket.emit('chatMessage', payload);
        } else {
            this.pendingActions.push({ event: 'chatMessage', payload });
        }
    }

    // Cleanup
    disconnect() {
        if (this.socket) {
            this.intentionalDisconnect = true;
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
            this.roomCode = null;
            this.playerId = null;
            this.pendingActions = [];
        }
    }
}

// Global instance
window.socketClient = new SocketClient();
