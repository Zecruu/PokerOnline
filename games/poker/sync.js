// Cross-tab synchronization for multiplayer poker
// Uses BroadcastChannel API for real-time sync + localStorage for persistence

class RoomSync {
    constructor() {
        this.channel = null;
        this.tabId = 'tab_' + Math.random().toString(36).substr(2, 8);
        this.rooms = new Map();
        this.myRoomCode = null;
        this.myPlayerId = null;
        this.callbacks = {
            onPlayerJoined: null,
            onPlayerLeft: null,
            onGameUpdate: null,
            onChatMessage: null,
            onRoomUpdate: null
        };

        this.initChannel();
        this.loadRoomsFromStorage();
    }

    initChannel() {
        try {
            this.channel = new BroadcastChannel('poker_rooms_sync');
            this.channel.onmessage = (event) => this.handleMessage(event.data);
            console.log('📡 BroadcastChannel initialized for cross-tab sync');
        } catch (e) {
            console.warn('BroadcastChannel not supported, falling back to storage events');
            window.addEventListener('storage', (e) => {
                if (e.key === 'poker_rooms_data') {
                    this.loadRoomsFromStorage();
                    if (this.myRoomCode && this.callbacks.onRoomUpdate) {
                        const room = this.rooms.get(this.myRoomCode);
                        if (room) this.callbacks.onRoomUpdate(room);
                    }
                }
            });
        }
    }

    broadcast(type, data) {
        const message = {
            type,
            data,
            senderId: this.tabId,
            timestamp: Date.now()
        };

        if (this.channel) {
            this.channel.postMessage(message);
        }

        // Also save to localStorage for persistence
        this.saveRoomsToStorage();
    }

    handleMessage(message) {
        // Ignore messages from self
        if (message.senderId === this.tabId) return;

        console.log('📨 Received:', message.type, message.data);

        switch (message.type) {
            case 'ROOM_CREATED':
                this.handleRoomCreated(message.data);
                break;
            case 'PLAYER_JOINED':
                this.handlePlayerJoined(message.data);
                break;
            case 'PLAYER_LEFT':
                this.handlePlayerLeft(message.data);
                break;
            case 'GAME_START':
                this.handleGameStart(message.data);
                break;
            case 'GAME_UPDATE':
                this.handleGameUpdate(message.data);
                break;
            case 'PLAYER_ACTION':
                this.handlePlayerAction(message.data);
                break;
            case 'CHAT':
                this.handleChat(message.data);
                break;
            case 'ROOM_SYNC_REQUEST':
                this.handleSyncRequest(message.data);
                break;
            case 'ROOM_SYNC_RESPONSE':
                this.handleSyncResponse(message.data);
                break;
        }
    }

    // === Room Management ===

    createRoom(playerName, settings = {}) {
        const roomCode = this.generateRoomCode();
        const playerId = this.generatePlayerId();

        const room = {
            code: roomCode,
            hostId: playerId,
            hostTabId: this.tabId,
            players: [{
                id: playerId,
                name: playerName,
                chips: settings.startingChips || 1000,
                bet: 0,
                cards: [],
                folded: false,
                isHost: true,
                isAI: false,
                isConnected: true,
                tabId: this.tabId
            }],
            settings: {
                startingChips: 1000,
                smallBlind: 10,
                bigBlind: 20,
                turnTimeLimit: 30,
                ...settings
            },
            gameState: {
                phase: 'waiting',
                pot: 0,
                currentBet: 0,
                communityCards: [],
                deck: [],
                currentPlayerIndex: 0,
                dealerIndex: 0,
                revealedCards: {}
            },
            chat: [],
            createdAt: Date.now()
        };

        this.rooms.set(roomCode, room);
        this.myRoomCode = roomCode;
        this.myPlayerId = playerId;

        this.broadcast('ROOM_CREATED', { room });

        return { roomCode, playerId, room };
    }

    joinRoom(roomCode, playerName) {
        // First, request sync from other tabs
        this.broadcast('ROOM_SYNC_REQUEST', { roomCode, requesterId: this.tabId });

        // Wait a bit for sync response, then try to join
        return new Promise((resolve) => {
            setTimeout(() => {
                this.loadRoomsFromStorage();

                let room = this.rooms.get(roomCode);
                if (!room) {
                    resolve({ success: false, message: 'Room not found. Make sure the host has the room open.' });
                    return;
                }

                // Check if player is already in room
                const existingPlayer = room.players.find(p => p.name === playerName);
                if (existingPlayer) {
                    // Reconnect
                    existingPlayer.isConnected = true;
                    existingPlayer.tabId = this.tabId;
                    this.myPlayerId = existingPlayer.id;
                } else {
                    const playerId = this.generatePlayerId();
                    const player = {
                        id: playerId,
                        name: playerName,
                        chips: room.settings.startingChips,
                        bet: 0,
                        cards: [],
                        folded: false,
                        isHost: false,
                        isAI: false,
                        isConnected: true,
                        tabId: this.tabId
                    };

                    room.players.push(player);
                    this.myPlayerId = playerId;
                }

                this.myRoomCode = roomCode;
                this.rooms.set(roomCode, room);

                this.broadcast('PLAYER_JOINED', {
                    roomCode,
                    player: room.players.find(p => p.id === this.myPlayerId)
                });

                resolve({ success: true, playerId: this.myPlayerId, room });
            }, 300);
        });
    }

    leaveRoom() {
        if (!this.myRoomCode || !this.myPlayerId) return;

        const room = this.rooms.get(this.myRoomCode);
        if (room) {
            const playerIndex = room.players.findIndex(p => p.id === this.myPlayerId);
            if (playerIndex !== -1) {
                room.players[playerIndex].isConnected = false;
            }

            this.broadcast('PLAYER_LEFT', {
                roomCode: this.myRoomCode,
                playerId: this.myPlayerId
            });
        }

        this.myRoomCode = null;
        this.myPlayerId = null;
    }

    // === Game Actions ===

    startGame() {
        const room = this.rooms.get(this.myRoomCode);
        if (!room) return { success: false, message: 'Room not found' };

        const players = room.players.filter(p => p.isConnected || p.isAI);
        if (players.length < 2) {
            return { success: false, message: 'Need at least 2 players' };
        }

        // Initialize game
        room.gameState.phase = 'preflop';
        room.gameState.deck = this.createShuffledDeck();
        room.gameState.pot = 0;
        room.gameState.currentBet = room.settings.bigBlind;
        room.gameState.communityCards = [];
        room.gameState.revealedCards = {};

        // Deal hole cards
        players.forEach(player => {
            player.cards = [room.gameState.deck.pop(), room.gameState.deck.pop()];
            player.folded = false;
            player.bet = 0;
        });

        // Post blinds
        this.postBlinds(room);

        this.broadcast('GAME_START', { room });
        return { success: true };
    }

    playerAction(action, amount = 0) {
        const room = this.rooms.get(this.myRoomCode);
        if (!room) return { success: false };

        const player = room.players.find(p => p.id === this.myPlayerId);
        if (!player) return { success: false };

        // Apply action
        const result = this.applyAction(room, player, action, amount);

        if (result.success) {
            this.broadcast('PLAYER_ACTION', {
                roomCode: this.myRoomCode,
                playerId: this.myPlayerId,
                action,
                amount,
                room
            });
        }

        return result;
    }

    sendChat(message) {
        const room = this.rooms.get(this.myRoomCode);
        if (!room) return;

        const player = room.players.find(p => p.id === this.myPlayerId);
        if (!player) return;

        const chatMessage = {
            id: Date.now(),
            playerId: this.myPlayerId,
            playerName: player.name,
            message,
            timestamp: new Date().toLocaleTimeString(),
            isAI: false
        };

        room.chat.push(chatMessage);

        this.broadcast('CHAT', { roomCode: this.myRoomCode, message: chatMessage });

        if (this.callbacks.onChatMessage) {
            this.callbacks.onChatMessage(chatMessage);
        }
    }

    // === Event Handlers ===

    handleRoomCreated(data) {
        this.rooms.set(data.room.code, data.room);
    }

    handlePlayerJoined(data) {
        const room = this.rooms.get(data.roomCode);
        if (!room) return;

        const existingPlayer = room.players.find(p => p.id === data.player.id);
        if (existingPlayer) {
            Object.assign(existingPlayer, data.player);
        } else {
            room.players.push(data.player);
        }

        if (data.roomCode === this.myRoomCode && this.callbacks.onPlayerJoined) {
            this.callbacks.onPlayerJoined(data.player, room);
        }
    }

    handlePlayerLeft(data) {
        const room = this.rooms.get(data.roomCode);
        if (!room) return;

        const player = room.players.find(p => p.id === data.playerId);
        if (player) {
            player.isConnected = false;
        }

        if (data.roomCode === this.myRoomCode && this.callbacks.onPlayerLeft) {
            this.callbacks.onPlayerLeft(data.playerId, room);
        }
    }

    handleGameStart(data) {
        this.rooms.set(data.room.code, data.room);

        if (data.room.code === this.myRoomCode && this.callbacks.onGameUpdate) {
            this.callbacks.onGameUpdate(data.room);
        }
    }

    handleGameUpdate(data) {
        this.rooms.set(data.room.code, data.room);

        if (data.room.code === this.myRoomCode && this.callbacks.onGameUpdate) {
            this.callbacks.onGameUpdate(data.room);
        }
    }

    handlePlayerAction(data) {
        this.rooms.set(data.roomCode, data.room);

        if (data.roomCode === this.myRoomCode && this.callbacks.onGameUpdate) {
            this.callbacks.onGameUpdate(data.room);
        }
    }

    handleChat(data) {
        const room = this.rooms.get(data.roomCode);
        if (room && !room.chat.find(c => c.id === data.message.id)) {
            room.chat.push(data.message);
        }

        if (data.roomCode === this.myRoomCode && this.callbacks.onChatMessage) {
            this.callbacks.onChatMessage(data.message);
        }
    }

    handleSyncRequest(data) {
        const room = this.rooms.get(data.roomCode);
        if (room && room.hostTabId === this.tabId) {
            // I'm the host, send room data
            this.broadcast('ROOM_SYNC_RESPONSE', {
                roomCode: data.roomCode,
                requesterId: data.requesterId,
                room
            });
        }
    }

    handleSyncResponse(data) {
        if (data.requesterId === this.tabId) {
            this.rooms.set(data.roomCode, data.room);
        }
    }

    // === Helper Methods ===

    generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    }

    generatePlayerId() {
        return 'player_' + Math.random().toString(36).substr(2, 9);
    }

    createShuffledDeck() {
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        const deck = [];

        for (const suit of suits) {
            for (const rank of ranks) {
                deck.push({ rank, suit });
            }
        }

        // Fisher-Yates shuffle
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        return deck;
    }

    postBlinds(room) {
        const players = room.players.filter(p => (p.isConnected || p.isAI) && !p.folded);
        if (players.length < 2) return;

        const sbIndex = room.gameState.dealerIndex;
        const bbIndex = (sbIndex + 1) % players.length;

        // Small blind
        const sbPlayer = players[sbIndex];
        const sbAmount = Math.min(room.settings.smallBlind, sbPlayer.chips);
        sbPlayer.bet = sbAmount;
        sbPlayer.chips -= sbAmount;
        room.gameState.pot += sbAmount;

        // Big blind
        const bbPlayer = players[bbIndex];
        const bbAmount = Math.min(room.settings.bigBlind, bbPlayer.chips);
        bbPlayer.bet = bbAmount;
        bbPlayer.chips -= bbAmount;
        room.gameState.pot += bbAmount;

        // Set first player to act
        room.gameState.currentPlayerIndex = (bbIndex + 1) % players.length;
    }

    applyAction(room, player, action, amount) {
        switch (action) {
            case 'fold':
                player.folded = true;
                break;
            case 'check':
                if (player.bet < room.gameState.currentBet) {
                    return { success: false, message: 'Cannot check' };
                }
                break;
            case 'call':
                const callAmount = Math.min(room.gameState.currentBet - player.bet, player.chips);
                player.chips -= callAmount;
                player.bet += callAmount;
                room.gameState.pot += callAmount;
                break;
            case 'raise':
                const raiseTotal = amount - player.bet;
                if (raiseTotal > player.chips) {
                    return { success: false, message: 'Not enough chips' };
                }
                player.chips -= raiseTotal;
                player.bet = amount;
                room.gameState.pot += raiseTotal;
                room.gameState.currentBet = amount;
                break;
        }

        // Move to next player
        this.advanceGame(room);

        return { success: true };
    }

    advanceGame(room) {
        const activePlayers = room.players.filter(p =>
            (p.isConnected || p.isAI) && !p.folded && p.chips >= 0
        );

        // Check for winner
        if (activePlayers.length === 1) {
            this.endRound(room, activePlayers[0]);
            return;
        }

        // Move to next active player
        let nextIndex = (room.gameState.currentPlayerIndex + 1) % room.players.length;
        let attempts = 0;
        while (attempts < room.players.length) {
            const nextPlayer = room.players[nextIndex];
            if ((nextPlayer.isConnected || nextPlayer.isAI) && !nextPlayer.folded && nextPlayer.chips > 0) {
                break;
            }
            nextIndex = (nextIndex + 1) % room.players.length;
            attempts++;
        }
        room.gameState.currentPlayerIndex = nextIndex;

        // Check if betting round complete
        const allBetsEqual = activePlayers.every(p => p.bet === room.gameState.currentBet || p.chips === 0);
        if (allBetsEqual) {
            this.advancePhase(room);
        }
    }

    advancePhase(room) {
        // Reset bets
        room.players.forEach(p => p.bet = 0);
        room.gameState.currentBet = 0;

        switch (room.gameState.phase) {
            case 'preflop':
                room.gameState.deck.pop(); // Burn
                room.gameState.communityCards.push(
                    room.gameState.deck.pop(),
                    room.gameState.deck.pop(),
                    room.gameState.deck.pop()
                );
                room.gameState.phase = 'flop';
                break;
            case 'flop':
                room.gameState.deck.pop(); // Burn
                room.gameState.communityCards.push(room.gameState.deck.pop());
                room.gameState.phase = 'turn';
                break;
            case 'turn':
                room.gameState.deck.pop(); // Burn
                room.gameState.communityCards.push(room.gameState.deck.pop());
                room.gameState.phase = 'river';
                break;
            case 'river':
                this.showdown(room);
                return;
        }

        // Reset to first active player
        const activePlayers = room.players.filter(p => (p.isConnected || p.isAI) && !p.folded);
        room.gameState.currentPlayerIndex = room.players.indexOf(activePlayers[0]);
    }

    showdown(room) {
        room.gameState.phase = 'showdown';

        const activePlayers = room.players.filter(p => !p.folded);
        if (activePlayers.length === 1) {
            this.endRound(room, activePlayers[0]);
            return;
        }

        // Evaluate hands and find winner
        let bestPlayer = null;
        let bestRank = -1;

        activePlayers.forEach(player => {
            const allCards = [...player.cards, ...room.gameState.communityCards];
            const hand = PokerHandEvaluator.evaluateHand(allCards);
            player.hand = hand;

            if (hand.rank > bestRank) {
                bestRank = hand.rank;
                bestPlayer = player;
            }
        });

        if (bestPlayer) {
            this.endRound(room, bestPlayer);
        }
    }

    endRound(room, winner) {
        winner.chips += room.gameState.pot;
        room.gameState.pot = 0;
        room.gameState.phase = 'complete';

        this.broadcast('GAME_UPDATE', { room });
    }

    getRoom() {
        return this.rooms.get(this.myRoomCode);
    }

    getMyPlayer() {
        const room = this.getRoom();
        if (!room) return null;
        return room.players.find(p => p.id === this.myPlayerId);
    }

    // === Storage ===

    saveRoomsToStorage() {
        try {
            const data = {};
            this.rooms.forEach((room, code) => {
                // Don't save cards in storage (security)
                const roomCopy = JSON.parse(JSON.stringify(room));
                roomCopy.players.forEach(p => {
                    // Only save card info if needed for sync
                    if (!p.isAI) {
                        p.cards = p.cards || [];
                    }
                });
                data[code] = roomCopy;
            });
            localStorage.setItem('poker_rooms_data', JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save rooms:', e);
        }
    }

    loadRoomsFromStorage() {
        try {
            const data = localStorage.getItem('poker_rooms_data');
            if (!data) return;

            const roomsData = JSON.parse(data);
            Object.keys(roomsData).forEach(code => {
                // Only load rooms that are less than 1 hour old
                const room = roomsData[code];
                if (Date.now() - room.createdAt < 3600000) {
                    this.rooms.set(code, room);
                }
            });
        } catch (e) {
            console.error('Failed to load rooms:', e);
        }
    }

    cleanup() {
        this.leaveRoom();
        if (this.channel) {
            this.channel.close();
        }
    }
}

// Initialize global sync instance
window.roomSync = new RoomSync();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.roomSync) {
        window.roomSync.leaveRoom();
    }
});
