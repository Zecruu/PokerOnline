// Socket.io Client for Multiplayer Poker
// Connects to the WebSocket server for real-time multiplayer

class SocketClient {
    constructor() {
        this.socket = null;
        this.serverUrl = this.getServerUrl();
        this.connected = false;
        this.roomCode = null;
        this.playerId = null;

        // Callbacks
        this.onConnect = null;
        this.onDisconnect = null;
        this.onRoomCreated = null;
        this.onRoomJoined = null;
        this.onPlayerJoined = null;
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
            return 'http://localhost:3002';
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
                timeout: 10000
            });

            this.socket.on('connect', () => {
                console.log('✅ Connected to server');
                this.connected = true;
                if (this.onConnect) this.onConnect();
                resolve();
            });

            this.socket.on('disconnect', () => {
                console.log('❌ Disconnected from server');
                this.connected = false;
                if (this.onDisconnect) this.onDisconnect();
            });

            this.socket.on('connect_error', (error) => {
                console.error('Connection error:', error);
                reject(error);
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

        } catch (error) {
            reject(error);
        }
    }

    // Room operations
    createRoom(playerName, settings, withAI) {
        if (!this.socket) return;
        this.socket.emit('createRoom', { playerName, settings, withAI });
    }

    joinRoom(roomCode, playerName) {
        if (!this.socket) return;
        this.socket.emit('joinRoom', { roomCode, playerName });
    }

    // Game operations
    startGame() {
        if (!this.socket) return;
        this.socket.emit('startGame');
    }

    playerAction(action, amount) {
        if (!this.socket) return;
        this.socket.emit('playerAction', { action, amount });
    }

    nextRound() {
        if (!this.socket) return;
        this.socket.emit('nextRound');
    }

    buyBack() {
        if (!this.socket) return;
        this.socket.emit('buyBack');
    }

    // Chat
    sendChatMessage(message) {
        if (!this.socket) return;
        this.socket.emit('chatMessage', { message });
    }

    // Cleanup
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
        }
    }
}

// Global instance
window.socketClient = new SocketClient();
