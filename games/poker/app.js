// Main Application Logic - Full Featured Version
// Supports both local AI games and online multiplayer via WebSocket

class PokerApp {
    constructor() {
        this.roomManager = new RoomManager();
        this.currentGame = null;
        this.currentPlayerId = null;
        this.currentScreen = 'home';
        this.lastRenderedCards = '';
        this.lastRenderedCommunity = '';
        this.lastRenderedOpponents = '';
        this.gameSettings = { ...DEFAULT_SETTINGS };

        // Multiplayer mode
        this.isOnlineMode = false;
        this.currentRoom = null;

        // Setup socket callbacks
        this.setupSocketCallbacks();

        this.initializeEventListeners();
        this.showScreen('home');
    }

    setupSocketCallbacks() {
        const client = window.socketClient;
        if (!client) return;

        client.onRoomCreated = (data) => {
            this.currentPlayerId = data.playerId;
            this.currentRoom = data.room;
            this.showOnlineLobby(data.roomCode);
        };

        client.onRoomJoined = (data) => {
            this.currentPlayerId = data.playerId;
            this.currentRoom = data.room;
            this.showOnlineLobby(data.roomCode);
        };

        client.onPlayerJoined = (data) => {
            this.currentRoom = data.room;
            this.updateOnlinePlayersList();
        };

        client.onGameStarted = (data) => {
            this.currentRoom = data.room;
            this.showScreen('game');
            this.resetRenderCache();
            this.renderOnlineGame();
            this.createChatUI();
        };

        client.onGameUpdate = (data) => {
            this.currentRoom = data.room;
            if (this.currentScreen === 'game') {
                this.renderOnlineGame();
            }
        };

        client.onShowdown = (data) => {
            this.currentRoom = data.room;
            this.showOnlineShowdown(data);
        };

        client.onRoundEnd = (data) => {
            this.currentRoom = data.room;
            this.showOnlineRoundEnd(data);
        };

        client.onChatMessage = (data) => {
            this.addChatMessage(data);
        };

        client.onError = (data) => {
            alert(data.message || 'An error occurred');
        };
    }

    initializeEventListeners() {
        document.getElementById('create-room-btn').addEventListener('click', () => this.showSettingsModal());
        document.getElementById('join-room-btn').addEventListener('click', () => this.showScreen('join'));
        document.getElementById('back-from-join').addEventListener('click', () => this.showScreen('home'));
        document.getElementById('join-room-submit').addEventListener('click', () => this.joinRoom());
        document.getElementById('leave-lobby-btn').addEventListener('click', () => this.leaveLobby());
        document.getElementById('copy-code-btn').addEventListener('click', () => this.copyRoomCode());
        document.getElementById('start-game-btn').addEventListener('click', () => this.startGame());
        document.getElementById('leave-game-btn').addEventListener('click', () => this.leaveGame());
        document.getElementById('fold-btn').addEventListener('click', () => this.playerAction('fold'));
        document.getElementById('check-btn').addEventListener('click', () => this.playerAction('check'));
        document.getElementById('call-btn').addEventListener('click', () => this.playerAction('call'));
        document.getElementById('raise-btn').addEventListener('click', () => {
            const amount = parseInt(document.getElementById('bet-slider').value);
            this.playerAction('raise', amount);
        });

        document.getElementById('bet-slider').addEventListener('input', (e) => {
            document.getElementById('bet-amount').textContent = e.target.value;
        });

        document.getElementById('room-code-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });

        document.getElementById('player-name-join').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });
    }

    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(`${screenName}-screen`).classList.add('active');
        this.currentScreen = screenName;
    }

    showSettingsModal() {
        // Create settings modal if not exists
        let modal = document.getElementById('settings-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'settings-modal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content">
                    <h2>Game Settings</h2>
                    <p class="subtitle">Configure your poker game</p>
                    
                    <div class="settings-form">
                        <div class="input-group">
                            <label>Your Name</label>
                            <input type="text" id="settings-player-name" placeholder="Enter your name" maxlength="20">
                        </div>
                        
                        <div class="input-group">
                            <label>Starting Chips</label>
                            <input type="number" id="settings-chips" value="1000" min="100" step="100">
                        </div>
                        
                        <div class="input-group">
                            <label>Small Blind</label>
                            <input type="number" id="settings-small-blind" value="10" min="1" step="5">
                        </div>
                        
                        <div class="input-group">
                            <label>Big Blind</label>
                            <input type="number" id="settings-big-blind" value="20" min="2" step="10">
                        </div>
                        
                        <div class="input-group">
                            <label>Turn Time Limit (seconds, 0 = no limit)</label>
                            <input type="number" id="settings-turn-time" value="30" min="0" max="120" step="5">
                        </div>
                        
                        <div class="checkbox-group">
                            <label>
                                <input type="checkbox" id="settings-optional-bb">
                                Optional Big Blind (3+ players: player after BB can fold free)
                            </label>
                        </div>
                        
                        <div class="checkbox-group">
                            <label>
                                <input type="checkbox" id="settings-allow-buyback" checked>
                                Allow Buy-backs
                            </label>
                        </div>
                        
                        <div class="input-group">
                            <label>Max Buy-backs per Player</label>
                            <input type="number" id="settings-max-buybacks" value="3" min="0" max="10">
                        </div>
                        
                        <div class="input-group">
                            <label>Buy-back Amount</label>
                            <input type="number" id="settings-buyback-amount" value="1000" min="100" step="100">
                        </div>
                        
                        <div class="modal-actions">
                            <button id="settings-cancel" class="secondary-btn">Cancel</button>
                            <button id="settings-single" class="primary-btn">Play vs AI Dealer</button>
                            <button id="settings-multi" class="primary-btn">Create Multiplayer Room</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            document.getElementById('settings-cancel').addEventListener('click', () => {
                modal.classList.remove('active');
            });

            document.getElementById('settings-single').addEventListener('click', () => {
                this.createRoomWithSettings(true);
            });

            document.getElementById('settings-multi').addEventListener('click', () => {
                this.createRoomWithSettings(false);
            });
        }

        modal.classList.add('active');
    }

    createRoomWithSettings(withDealer) {
        const playerName = document.getElementById('settings-player-name').value.trim();
        if (!playerName) {
            alert('Please enter your name');
            return;
        }

        const settings = {
            startingChips: parseInt(document.getElementById('settings-chips').value) || 1000,
            smallBlind: parseInt(document.getElementById('settings-small-blind').value) || 10,
            bigBlind: parseInt(document.getElementById('settings-big-blind').value) || 20,
            turnTimeLimit: parseInt(document.getElementById('settings-turn-time').value) || 0,
            optionalBigBlind: document.getElementById('settings-optional-bb').checked,
            allowBuyBack: document.getElementById('settings-allow-buyback').checked,
            maxBuyBacks: parseInt(document.getElementById('settings-max-buybacks').value) || 3,
            buyBackAmount: parseInt(document.getElementById('settings-buyback-amount').value) || 1000
        };

        this.gameSettings = settings;
        document.getElementById('settings-modal').classList.remove('active');

        // For multiplayer without AI - use local sync for same-browser tabs, online for remote
        if (!withDealer) {
            // Use local cross-tab sync (works without server, across browser tabs on same machine)
            if (window.roomSync) {
                const result = window.roomSync.createRoom(playerName, settings);
                this.isOnlineMode = false;
                this.useLocalSync = true;
                this.currentPlayerId = result.playerId;

                // Also create local game instance
                const { roomCode, game } = this.roomManager.createRoom(playerName, settings, false);
                this.currentGame = game;

                // Setup sync callbacks
                this.setupSyncCallbacks();
                this.setupGameCallbacks();
                this.showLobby(result.roomCode);
            } else {
                // Fall back to online server
                this.createOnlineRoom(playerName, settings, false);
            }
            return;
        }

        // For single player vs AI - use local game (faster, works offline)
        this.isOnlineMode = false;
        const { roomCode, game } = this.roomManager.createRoom(playerName, settings, withDealer);
        this.currentGame = game;
        this.currentPlayerId = game.players[0].id;

        this.setupGameCallbacks();
        this.showLobby(roomCode);

        if (withDealer && game.players.length === 2) {
            setTimeout(() => this.startGame(), 500);
        }
    }

    joinRoom() {
        const roomCode = document.getElementById('room-code-input').value.trim().toUpperCase();
        const playerName = document.getElementById('player-name-join').value.trim();

        if (!roomCode || roomCode.length !== 6) {
            alert('Please enter a valid 6-character room code');
            return;
        }

        if (!playerName) {
            alert('Please enter your name');
            return;
        }

        // Try local cross-tab sync first (works without server)
        if (window.roomSync) {
            window.roomSync.joinRoom(roomCode, playerName).then(result => {
                if (result.success) {
                    this.isOnlineMode = false;
                    this.useLocalSync = true;
                    this.currentPlayerId = result.playerId;

                    // Setup sync callbacks
                    this.setupSyncCallbacks();

                    // Create a local game instance from the synced data
                    this.currentGame = this.roomManager.getRoom(roomCode);
                    if (!this.currentGame) {
                        // Create game from sync data
                        const room = window.roomSync.getRoom();
                        this.currentGame = new PokerGame(roomCode, '', false, room.settings || {});
                        this.currentGame.players = room.players;
                        this.roomManager.rooms.set(roomCode, this.currentGame);
                    }

                    this.setupGameCallbacks();
                    this.showLobby(roomCode);
                } else {
                    // Fall back to online server
                    console.log('Local sync failed, trying online server:', result.message);
                    this.joinOnlineRoom(roomCode, playerName);
                }
            });
        } else {
            // No local sync available, use online
            this.joinOnlineRoom(roomCode, playerName);
        }
    }

    setupGameCallbacks() {
        this.currentGame.onStateChange = () => {
            if (this.currentScreen === 'game') {
                this.updateGameDisplay();
            }
        };

        this.currentGame.onTimerTick = (timeRemaining) => {
            this.updateTimer(timeRemaining);
        };

        this.currentGame.onShowdown = (showdownData) => {
            this.showShowdownModal(showdownData);
        };

        // Chat callback - handles both player messages and AI taunts
        this.currentGame.onChat = (chatMessage) => {
            this.addChatMessage(chatMessage);
        };

        this.currentGame.onWinner = (result) => {
            setTimeout(() => {
                this.hideShowdownModal();

                let message = `${result.winner.name} wins $${result.winAmount}!`;
                if (result.hand) {
                    message += `\nHand: ${result.hand.name}`;
                } else if (result.reason) {
                    message += `\n${result.reason}`;
                }

                // Check if current player needs buy-back
                const myPlayer = this.currentGame.players.find(p => p.id === this.currentPlayerId);
                if (myPlayer && myPlayer.chips <= 0) {
                    this.showBuyBackOption(message);
                } else {
                    alert(message);
                    if (confirm('Play another round?')) {
                        this.resetRenderCache();
                        this.currentGame.startNextRound();
                    }
                }
            }, 2000);
        };
    }

    setupSyncCallbacks() {
        if (!window.roomSync) return;

        // When another player joins
        window.roomSync.callbacks.onPlayerJoined = (player, room) => {
            // Update local game with new player
            if (this.currentGame && !this.currentGame.players.find(p => p.id === player.id)) {
                this.currentGame.players.push(player);
            }
            this.updatePlayersList();
            this.updateStartButton();
        };

        // When a player leaves
        window.roomSync.callbacks.onPlayerLeft = (playerId, room) => {
            if (this.currentGame) {
                const player = this.currentGame.players.find(p => p.id === playerId);
                if (player) player.isConnected = false;
            }
            this.updatePlayersList();
        };

        // When game updates
        window.roomSync.callbacks.onGameUpdate = (room) => {
            if (this.currentGame && this.currentScreen === 'game') {
                // Sync game state
                this.currentGame.players = room.players;
                this.currentGame.communityCards = room.gameState.communityCards || [];
                this.currentGame.pot = room.gameState.pot;
                this.currentGame.currentBet = room.gameState.currentBet;
                this.currentGame.gamePhase = room.gameState.phase;
                this.currentGame.currentPlayerIndex = room.gameState.currentPlayerIndex;

                this.updateGameDisplay();
            }
        };

        // When chat message received
        window.roomSync.callbacks.onChatMessage = (message) => {
            this.addChatMessage(message);
        };

        // When room updates (general)
        window.roomSync.callbacks.onRoomUpdate = (room) => {
            if (this.currentScreen === 'lobby') {
                if (this.currentGame) {
                    this.currentGame.players = room.players;
                }
                this.updatePlayersList();
                this.updateStartButton();
            }
        };
    }

    showShowdownModal(showdownData) {
        let modal = document.getElementById('showdown-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'showdown-modal';
            modal.className = 'showdown-overlay';
            document.body.appendChild(modal);
        }

        let html = '<div class="showdown-content"><h2>🏆 Showdown!</h2><div class="showdown-hands">';

        showdownData.hands.forEach(hand => {
            const isWinner = hand.isWinner;
            html += `
                <div class="showdown-hand ${isWinner ? 'winner' : ''}">
                    <div class="showdown-player-name">${hand.playerName} ${hand.isAI ? '🤖' : ''} ${isWinner ? '👑' : ''}</div>
                    <div class="showdown-cards">
                        ${hand.cards.map(card => `
                            <div class="showdown-card">
                                ${CardRenderer.createCardSVG(card.rank, card.suit)}
                            </div>
                        `).join('')}
                    </div>
                    <div class="showdown-hand-name">${hand.handName}</div>
                </div>
            `;
        });

        html += '</div></div>';
        modal.innerHTML = html;
        modal.classList.add('active');
    }

    hideShowdownModal() {
        const modal = document.getElementById('showdown-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    showBuyBackOption(winnerMessage) {
        const settings = this.currentGame.settings;
        const myPlayer = this.currentGame.players.find(p => p.id === this.currentPlayerId);
        const buyBacksRemaining = settings.maxBuyBacks - myPlayer.buyBacksUsed;

        if (!settings.allowBuyBack || buyBacksRemaining <= 0) {
            alert(winnerMessage + '\n\nYou are out of chips and cannot buy back!');
            return;
        }

        const doBuyBack = confirm(
            winnerMessage +
            `\n\nYou are out of chips!\n\nBuy back for $${settings.buyBackAmount}?\n` +
            `(${buyBacksRemaining} buy-backs remaining)`
        );

        if (doBuyBack) {
            const result = this.currentGame.buyBack(this.currentPlayerId);
            if (result.success) {
                alert(result.message);
                if (confirm('Play another round?')) {
                    this.resetRenderCache();
                    this.currentGame.startNextRound();
                }
            } else {
                alert(result.message);
            }
        }
    }

    updateTimer(timeRemaining) {
        let timerEl = document.getElementById('turn-timer');
        if (!timerEl) {
            timerEl = document.createElement('div');
            timerEl.id = 'turn-timer';
            timerEl.className = 'turn-timer';
            document.querySelector('.game-header').appendChild(timerEl);
        }

        const myPlayer = this.currentGame.players.find(p => p.id === this.currentPlayerId);
        if (myPlayer && myPlayer.isActive && timeRemaining > 0) {
            timerEl.textContent = `⏱ ${timeRemaining}s`;
            timerEl.style.display = 'block';

            if (timeRemaining <= 5) {
                timerEl.classList.add('urgent');
            } else {
                timerEl.classList.remove('urgent');
            }
        } else {
            timerEl.style.display = 'none';
        }
    }

    resetRenderCache() {
        this.lastRenderedCards = '';
        this.lastRenderedCommunity = '';
        this.lastRenderedOpponents = '';
    }

    showLobby(roomCode) {
        document.getElementById('display-room-code').textContent = roomCode;
        this.updatePlayersList();
        this.showScreen('lobby');
        this.updateStartButton();
        this.displayBottomInfo();
    }

    displayBottomInfo() {
        const lobbyContent = document.querySelector('.lobby-content');
        let infoEl = document.getElementById('lobby-settings-info');

        if (!infoEl) {
            infoEl = document.createElement('div');
            infoEl.id = 'lobby-settings-info';
            infoEl.className = 'lobby-settings-info';
            lobbyContent.appendChild(infoEl);
        }

        const s = this.currentGame.settings;
        infoEl.innerHTML = `
            <div class="settings-summary">
                <span>💰 ${s.startingChips} chips</span>
                <span>🎲 Blinds: ${s.smallBlind}/${s.bigBlind}</span>
                <span>⏱ ${s.turnTimeLimit > 0 ? s.turnTimeLimit + 's timer' : 'No timer'}</span>
                <span>🔄 ${s.allowBuyBack ? s.maxBuyBacks + ' buy-backs' : 'No buy-backs'}</span>
            </div>
        `;
    }

    updatePlayersList() {
        const playersList = document.getElementById('players-list');
        playersList.innerHTML = '';

        this.currentGame.players.forEach((player) => {
            const playerItem = document.createElement('div');
            playerItem.className = 'player-item' + (player.isHost ? ' host' : '');

            const avatar = document.createElement('div');
            avatar.className = 'player-avatar';
            avatar.textContent = player.name.charAt(0).toUpperCase();

            const details = document.createElement('div');
            details.className = 'player-details';

            const name = document.createElement('div');
            name.className = 'player-name';
            name.textContent = player.name;

            details.appendChild(name);

            if (player.isHost) {
                const badge = document.createElement('div');
                badge.className = 'player-badge';
                badge.textContent = '👑 Host';
                details.appendChild(badge);
            }

            if (player.isAI) {
                const badge = document.createElement('div');
                badge.className = 'player-badge';
                badge.textContent = '🤖 AI Dealer';
                badge.style.color = '#00d4aa';
                details.appendChild(badge);
            }

            playerItem.appendChild(avatar);
            playerItem.appendChild(details);
            playersList.appendChild(playerItem);
        });
    }

    updateStartButton() {
        const startBtn = document.getElementById('start-game-btn');
        const playerCount = this.currentGame.players.length;
        const countSpan = startBtn.querySelector('.player-count');

        if (playerCount >= 2 && playerCount <= 8) {
            startBtn.disabled = false;
            countSpan.textContent = `(${playerCount} players ready)`;
        } else {
            startBtn.disabled = true;
            countSpan.textContent = `(${playerCount}/2-8 players)`;
        }

        const currentPlayer = this.currentGame.players.find(p => p.id === this.currentPlayerId);
        if (!currentPlayer || !currentPlayer.isHost) {
            startBtn.disabled = true;
            countSpan.textContent = '(Only host can start)';
        }
    }

    copyRoomCode() {
        const roomCode = document.getElementById('display-room-code').textContent;
        navigator.clipboard.writeText(roomCode).then(() => {
            const btn = document.getElementById('copy-code-btn');
            btn.innerHTML = '<span>✓</span>';
            setTimeout(() => {
                btn.innerHTML = '<span>📋</span>';
            }, 2000);
        });
    }

    leaveLobby() {
        if (confirm('Are you sure you want to leave?')) {
            this.currentGame = null;
            this.currentPlayerId = null;
            this.showScreen('home');
        }
    }

    startGame() {
        if (this.isOnlineMode) {
            // Online multiplayer - send to server
            window.socketClient.startGame();
        } else {
            // Local game
            const result = this.currentGame.startGame();

            if (result.success) {
                this.showScreen('game');
                this.resetRenderCache();
                this.forceFullRender();
                this.addCardRevealButtons();
                this.createChatUI();
            } else {
                alert(result.message);
            }
        }
    }

    addCardRevealButtons() {
        // Only show reveal buttons for multiplayer (not AI games)
        const hasHumanOpponents = this.currentGame.players.some(p => !p.isAI && p.id !== this.currentPlayerId);
        if (!hasHumanOpponents) return;

        let revealContainer = document.getElementById('card-reveal-controls');
        if (revealContainer) revealContainer.remove();

        revealContainer = document.createElement('div');
        revealContainer.id = 'card-reveal-controls';
        revealContainer.className = 'card-reveal-controls';
        revealContainer.innerHTML = `
            <span class="reveal-label">Show cards at showdown:</span>
            <button class="reveal-btn" data-reveal="none">None</button>
            <button class="reveal-btn active" data-reveal="both">Both</button>
            <button class="reveal-btn" data-reveal="first">First</button>
            <button class="reveal-btn" data-reveal="second">Second</button>
        `;

        document.querySelector('.player-cards').parentNode.insertBefore(
            revealContainer,
            document.querySelector('.player-cards').nextSibling
        );

        revealContainer.querySelectorAll('.reveal-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                revealContainer.querySelectorAll('.reveal-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                const reveal = e.target.dataset.reveal;
                let indices = [];
                if (reveal === 'both') indices = [0, 1];
                else if (reveal === 'first') indices = [0];
                else if (reveal === 'second') indices = [1];

                this.currentGame.revealCards(this.currentPlayerId, indices);
            });
        });
    }

    forceFullRender() {
        const state = this.currentGame.getGameState();
        const currentPlayer = state.players.find(p => p.id === this.currentPlayerId);
        if (!currentPlayer) return;

        document.getElementById('pot-amount').textContent = `$${state.pot}`;
        document.getElementById('player-chips-amount').textContent = `$${currentPlayer.chips}`;

        this.renderPlayerCards(currentPlayer.cards, true);
        this.renderCommunityCards(state.communityCards, true);
        this.renderOpponents(state, true);

        this.updateActionControls(currentPlayer, state);
        this.updateBetSlider(currentPlayer, state);
    }

    updateGameDisplay() {
        const state = this.currentGame.getGameState();
        const currentPlayer = state.players.find(p => p.id === this.currentPlayerId);
        if (!currentPlayer) return;

        document.getElementById('pot-amount').textContent = `$${state.pot}`;
        document.getElementById('player-chips-amount').textContent = `$${currentPlayer.chips}`;

        this.renderPlayerCards(currentPlayer.cards);
        this.renderCommunityCards(state.communityCards);
        this.renderOpponents(state);

        this.updateActionControls(currentPlayer, state);
        this.updateBetSlider(currentPlayer, state);
    }

    renderPlayerCards(cards, force = false) {
        const cardsHash = JSON.stringify(cards);
        if (!force && this.lastRenderedCards === cardsHash) return;
        this.lastRenderedCards = cardsHash;

        const container = document.getElementById('player-cards');
        container.innerHTML = '';

        cards.forEach((card, index) => {
            const cardElement = CardRenderer.createCardElement(card.rank, card.suit);
            cardElement.style.animationDelay = `${index * 0.1}s`;
            cardElement.classList.add('dealing');
            container.appendChild(cardElement);
        });
    }

    renderCommunityCards(cards, force = false) {
        const cardsHash = JSON.stringify(cards);
        if (!force && this.lastRenderedCommunity === cardsHash) return;
        this.lastRenderedCommunity = cardsHash;

        const container = document.getElementById('community-cards');
        container.innerHTML = '';

        for (let i = 0; i < 5; i++) {
            if (i < cards.length) {
                const cardElement = CardRenderer.createCardElement(cards[i].rank, cards[i].suit);
                cardElement.style.animationDelay = `${i * 0.1}s`;
                cardElement.classList.add('dealing');
                container.appendChild(cardElement);
            } else {
                const placeholder = document.createElement('div');
                placeholder.className = 'card';
                placeholder.style.opacity = '0.2';
                placeholder.style.border = '2px dashed rgba(255,255,255,0.3)';
                placeholder.style.background = 'transparent';
                container.appendChild(placeholder);
            }
        }
    }

    renderOpponents(state, force = false) {
        const opponents = state.players.filter(p => p.id !== this.currentPlayerId);
        const opponentHash = JSON.stringify(opponents.map(o => ({
            chips: o.chips, active: o.isActive, folded: o.folded, bet: o.bet
        }))) + state.dealerIndex + state.gamePhase + JSON.stringify(state.revealedCards);

        if (!force && this.lastRenderedOpponents === opponentHash) return;
        this.lastRenderedOpponents = opponentHash;

        const container = document.getElementById('players-container');
        container.innerHTML = '';

        if (opponents.length === 0) return;

        const positions = this.calculateOpponentPositions(opponents.length);

        opponents.forEach((opponent, index) => {
            const opponentDiv = document.createElement('div');
            opponentDiv.className = 'opponent-player' +
                (opponent.isActive ? ' active' : '') +
                (opponent.folded ? ' folded' : '');
            opponentDiv.style.left = positions[index].x;
            opponentDiv.style.top = positions[index].y;
            opponentDiv.style.transform = 'translate(-50%, -50%)';

            const info = document.createElement('div');
            info.className = 'opponent-info';

            const nameDiv = document.createElement('div');
            nameDiv.className = 'opponent-name';
            nameDiv.textContent = opponent.name + (opponent.isAI ? ' 🤖' : '');
            info.appendChild(nameDiv);

            const chipsDiv = document.createElement('div');
            chipsDiv.className = 'opponent-chips';
            chipsDiv.textContent = `$${opponent.chips}`;
            info.appendChild(chipsDiv);

            if (opponent.bet > 0) {
                const betDiv = document.createElement('div');
                betDiv.style.color = '#00d4aa';
                betDiv.style.fontSize = '0.75rem';
                betDiv.textContent = `Bet: $${opponent.bet}`;
                info.appendChild(betDiv);
            }

            opponentDiv.appendChild(info);

            // Cards - check if revealed
            const revealedIndices = state.revealedCards[opponent.id] || [];
            const isShowdown = state.gamePhase === 'showdown';

            if (!opponent.folded && opponent.cards && opponent.cards.length > 0) {
                const cardsDiv = document.createElement('div');
                cardsDiv.className = 'opponent-cards';

                for (let i = 0; i < 2; i++) {
                    // Show card if AI at showdown, or if player chose to reveal
                    if ((opponent.isAI && isShowdown) || revealedIndices.includes(i)) {
                        const card = opponent.cards[i];
                        const cardEl = CardRenderer.createCardElement(card.rank, card.suit);
                        cardEl.style.width = '40px';
                        cardEl.style.height = '56px';
                        cardsDiv.appendChild(cardEl);
                    } else {
                        const cardBack = CardRenderer.createCardElement('A', 'spades', true);
                        cardBack.style.width = '40px';
                        cardBack.style.height = '56px';
                        cardsDiv.appendChild(cardBack);
                    }
                }
                opponentDiv.appendChild(cardsDiv);
            }

            // Dealer button
            const playerIndex = state.players.findIndex(p => p.id === opponent.id);
            if (playerIndex === state.dealerIndex) {
                const dealerBtn = document.createElement('div');
                dealerBtn.className = 'dealer-button';
                dealerBtn.innerHTML = CardRenderer.createDealerButton();
                opponentDiv.appendChild(dealerBtn);
            }

            container.appendChild(opponentDiv);
        });

        const myIndex = state.players.findIndex(p => p.id === this.currentPlayerId);
        this.showPlayerDealerButton(myIndex === state.dealerIndex);
    }

    showPlayerDealerButton(show) {
        let btn = document.getElementById('player-dealer-btn');
        if (show) {
            if (!btn) {
                btn = document.createElement('div');
                btn.id = 'player-dealer-btn';
                btn.className = 'dealer-button player-dealer';
                btn.innerHTML = CardRenderer.createDealerButton();
                document.querySelector('.player-info-bar').appendChild(btn);
            }
            btn.style.display = 'inline-block';
        } else if (btn) {
            btn.style.display = 'none';
        }
    }

    calculateOpponentPositions(count) {
        if (count === 1) return [{ x: '50%', y: '15%' }];

        const positions = [];
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI - Math.PI / 2;
            positions.push({
                x: `${50 + 35 * Math.cos(angle)}%`,
                y: `${20 + 15 * Math.sin(angle)}%`
            });
        }
        return positions;
    }

    updateBetSlider(player, state) {
        const slider = document.getElementById('bet-slider');
        const minRaise = Math.max(state.currentBet + this.currentGame.bigBlind, this.currentGame.bigBlind);
        slider.min = minRaise;
        slider.max = player.chips + player.bet;
        slider.value = minRaise;
        document.getElementById('bet-amount').textContent = minRaise;
    }

    updateActionControls(player, state) {
        const isMyTurn = player.isActive && !player.folded;
        const isGameActive = state.gamePhase !== 'showdown' && state.gamePhase !== 'waiting';
        const canCheck = player.bet >= state.currentBet;
        const callAmount = state.currentBet - player.bet;
        const canAct = isMyTurn && isGameActive;

        document.getElementById('fold-btn').disabled = !canAct;
        document.getElementById('check-btn').disabled = !canAct || !canCheck;
        document.getElementById('call-btn').disabled = !canAct || canCheck;
        document.getElementById('raise-btn').disabled = !canAct || player.chips <= 0;

        const callBtn = document.getElementById('call-btn');
        callBtn.textContent = callAmount > 0 ? `Call $${callAmount}` : 'Call';

        const controls = document.getElementById('action-controls');
        if (canAct) {
            controls.classList.add('my-turn');
        } else {
            controls.classList.remove('my-turn');
        }
    }

    playerAction(action, amount = 0) {
        if (this.isOnlineMode) {
            // Online multiplayer - send to server
            window.socketClient.playerAction(action, amount);
        } else {
            // Local game
            const result = this.currentGame.playerAction(this.currentPlayerId, action, amount);
            if (!result.success) {
                alert(result.message);
            }
        }
    }

    leaveGame() {
        if (confirm('Are you sure you want to leave the game?')) {
            this.currentGame.clearTimers();
            this.showScreen('home');
            this.currentGame = null;
            this.currentPlayerId = null;
            this.resetRenderCache();
        }
    }

    // ===== CHAT FUNCTIONALITY =====

    createChatUI() {
        // Check if chat already exists
        if (document.getElementById('game-chat')) return;

        const chatContainer = document.createElement('div');
        chatContainer.id = 'game-chat';
        chatContainer.className = 'game-chat';
        chatContainer.innerHTML = `
            <div class="chat-header" id="chat-header">
                <span>💬 Chat</span>
                <button class="chat-toggle" id="chat-toggle">−</button>
            </div>
            <div class="chat-messages" id="chat-messages"></div>
            <div class="chat-input-container">
                <input type="text" id="chat-input" placeholder="Type a message..." maxlength="200">
                <button id="chat-send" class="chat-send-btn">Send</button>
            </div>
        `;

        document.querySelector('.game-container').appendChild(chatContainer);

        // Toggle function
        const toggleChat = (e) => {
            // Prevent triggering when clicking the input or messages if they bubble up (they shouldn't due to structure)
            if (e.target.closest('.chat-input-container') || e.target.closest('.chat-messages')) return;

            chatContainer.classList.toggle('minimized');
            const btn = document.getElementById('chat-toggle');
            btn.textContent = chatContainer.classList.contains('minimized') ? '+' : '−';
        };

        // Event listeners
        document.getElementById('chat-header').addEventListener('click', toggleChat);

        document.getElementById('chat-send').addEventListener('click', (e) => {
            e.stopPropagation();
            this.sendChatMessage();
        });

        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendChatMessage();
            }
        });

        // Prevent mobile keyboard from scrolling the whole view too much
        document.getElementById('chat-input').addEventListener('focus', () => {
            // Optional: Scroll chat into view if needed, or handle viewport resize
            setTimeout(() => {
                chatContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 300);
        });
    }

    sendChatMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();

        if (message) {
            if (this.isOnlineMode) {
                window.socketClient.sendChatMessage(message);
            } else if (this.currentGame) {
                this.currentGame.sendChatMessage(this.currentPlayerId, message);
            }
            input.value = '';
        }
    }

    addChatMessage(chatMessage) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message';

        if (chatMessage.isAI) {
            messageDiv.classList.add('ai-message');
        }
        if (chatMessage.isTaunt) {
            messageDiv.classList.add('taunt');
        }
        if (chatMessage.playerId === this.currentPlayerId) {
            messageDiv.classList.add('my-message');
        }

        messageDiv.innerHTML = `
            <span class="chat-sender">${chatMessage.playerName}${chatMessage.isAI ? ' 🤖' : ''}:</span>
            <span class="chat-text">${this.escapeHtml(chatMessage.message)}</span>
        `;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Flash effect for taunts
        if (chatMessage.isTaunt) {
            messageDiv.classList.add('flash');
            setTimeout(() => messageDiv.classList.remove('flash'), 500);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ===== ONLINE MULTIPLAYER METHODS =====

    async createOnlineRoom(playerName, settings, withAI) {
        try {
            await window.socketClient.connect();
            this.isOnlineMode = true;
            window.socketClient.createRoom(playerName, settings, withAI);
        } catch (error) {
            alert('Failed to connect to server. Playing locally instead.');
            this.isOnlineMode = false;
            this.createLocalRoom(playerName, settings, withAI);
        }
    }

    async joinOnlineRoom(roomCode, playerName) {
        try {
            await window.socketClient.connect();
            this.isOnlineMode = true;
            window.socketClient.joinRoom(roomCode, playerName);
        } catch (error) {
            alert('Failed to connect to server: ' + error.message);
        }
    }

    showOnlineLobby(roomCode) {
        document.getElementById('display-room-code').textContent = roomCode;
        this.updateOnlinePlayersList();
        this.showScreen('lobby');
        this.updateOnlineStartButton();
    }

    updateOnlinePlayersList() {
        if (!this.currentRoom) return;

        const playersList = document.getElementById('players-list');
        playersList.innerHTML = '';

        this.currentRoom.players.forEach((player) => {
            const playerItem = document.createElement('div');
            playerItem.className = 'player-item' + (player.isHost ? ' host' : '');
            playerItem.innerHTML = `
                <div class="player-avatar">${player.name.charAt(0).toUpperCase()}</div>
                <div class="player-details">
                    <div class="player-name">${player.name}</div>
                    ${player.isHost ? '<div class="player-badge">👑 Host</div>' : ''}
                    ${player.isAI ? '<div class="player-badge" style="color:#00d4aa">🤖 AI</div>' : ''}
                    ${!player.isConnected ? '<div class="player-badge" style="color:#ff3b5c">Disconnected</div>' : ''}
                </div>
            `;
            playersList.appendChild(playerItem);
        });
    }

    updateOnlineStartButton() {
        const startBtn = document.getElementById('start-game-btn');
        const countSpan = startBtn.querySelector('.player-count');

        if (!this.currentRoom) return;

        const playerCount = this.currentRoom.players.length;
        const myPlayer = this.currentRoom.players.find(p => p.oderId === this.currentPlayerId);

        if (playerCount >= 2 && myPlayer?.isHost) {
            startBtn.disabled = false;
            countSpan.textContent = `(${playerCount} players ready)`;
        } else if (!myPlayer?.isHost) {
            startBtn.disabled = true;
            countSpan.textContent = '(Waiting for host)';
        } else {
            startBtn.disabled = true;
            countSpan.textContent = `(${playerCount}/2+ players)`;
        }
    }

    renderOnlineGame() {
        if (!this.currentRoom) return;

        const myPlayer = this.currentRoom.players.find(p => p.oderId === this.currentPlayerId);
        if (!myPlayer) return;

        // Update pot and chips
        document.getElementById('pot-amount').textContent = `$${this.currentRoom.pot}`;
        document.getElementById('player-chips-amount').textContent = `$${myPlayer.chips}`;

        // Render cards
        this.renderPlayerCards(myPlayer.cards || []);
        this.renderCommunityCards(this.currentRoom.communityCards || []);
        this.renderOnlineOpponents();

        // Update controls
        this.updateOnlineActionControls(myPlayer);
        this.updateOnlineBetSlider(myPlayer);
    }

    renderOnlineOpponents() {
        const opponents = this.currentRoom.players.filter(p => p.oderId !== this.currentPlayerId);
        const container = document.getElementById('players-container');
        container.innerHTML = '';

        if (opponents.length === 0) return;

        const positions = this.calculateOpponentPositions(opponents.length);

        opponents.forEach((opponent, index) => {
            const opponentDiv = document.createElement('div');
            opponentDiv.className = 'opponent-player' +
                (opponent.isActive ? ' active' : '') +
                (opponent.folded ? ' folded' : '');
            opponentDiv.style.left = positions[index].x;
            opponentDiv.style.top = positions[index].y;
            opponentDiv.style.transform = 'translate(-50%, -50%)';

            opponentDiv.innerHTML = `
                <div class="opponent-info">
                    <div class="opponent-name">${opponent.name}${opponent.isAI ? ' 🤖' : ''}</div>
                    <div class="opponent-chips">$${opponent.chips}</div>
                    ${opponent.bet > 0 ? `<div style="color:#00d4aa;font-size:0.75rem">Bet: $${opponent.bet}</div>` : ''}
                </div>
                <div class="opponent-cards">
                    ${this.renderOpponentCards(opponent)}
                </div>
            `;

            container.appendChild(opponentDiv);
        });
    }

    renderOpponentCards(opponent) {
        if (opponent.folded || !opponent.cards) return '';

        const isShowdown = this.currentRoom.gamePhase === 'showdown';
        const revealed = this.currentRoom.revealedCards?.[opponent.oderId] || [];

        let html = '';
        for (let i = 0; i < 2; i++) {
            if ((opponent.isAI && isShowdown) || revealed.includes(i)) {
                if (opponent.cards[i]) {
                    html += `<div class="mini-card">${opponent.cards[i].rank}${this.getSuitSymbol(opponent.cards[i].suit)}</div>`;
                }
            } else {
                html += `<div class="mini-card back">🂠</div>`;
            }
        }
        return html;
    }

    getSuitSymbol(suit) {
        const symbols = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
        return symbols[suit] || '';
    }

    updateOnlineActionControls(player) {
        const isMyTurn = player.isActive && !player.folded;
        const isGameActive = this.currentRoom.gamePhase !== 'showdown' && this.currentRoom.gamePhase !== 'waiting';
        const canCheck = player.bet >= this.currentRoom.currentBet;
        const callAmount = this.currentRoom.currentBet - player.bet;
        const canAct = isMyTurn && isGameActive;

        document.getElementById('fold-btn').disabled = !canAct;
        document.getElementById('check-btn').disabled = !canAct || !canCheck;
        document.getElementById('call-btn').disabled = !canAct || canCheck;
        document.getElementById('raise-btn').disabled = !canAct || player.chips <= 0;

        const callBtn = document.getElementById('call-btn');
        callBtn.textContent = callAmount > 0 ? `Call $${callAmount}` : 'Call';

        const controls = document.getElementById('action-controls');
        if (canAct) {
            controls.classList.add('my-turn');
        } else {
            controls.classList.remove('my-turn');
        }
    }

    updateOnlineBetSlider(player) {
        const slider = document.getElementById('bet-slider');
        const bigBlind = this.currentRoom.settings?.bigBlind || 20;
        const minRaise = Math.max(this.currentRoom.currentBet + bigBlind, bigBlind);
        slider.min = minRaise;
        slider.max = player.chips + player.bet;
        slider.value = minRaise;
        document.getElementById('bet-amount').textContent = minRaise;
    }

    showOnlineShowdown(data) {
        let modal = document.getElementById('showdown-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'showdown-modal';
            modal.className = 'showdown-overlay';
            document.body.appendChild(modal);
        }

        let html = '<div class="showdown-content"><h2>🏆 Showdown!</h2><div class="showdown-hands">';

        data.hands.forEach(hand => {
            const isWinner = hand.playerId === data.winner.playerId;
            html += `
                <div class="showdown-hand ${isWinner ? 'winner' : ''}">
                    <div class="showdown-player-name">${hand.playerName} ${isWinner ? '👑' : ''}</div>
                    <div class="showdown-cards">
                        ${hand.cards.map(card => `
                            <div class="showdown-card" style="background:white;padding:10px;border-radius:8px;">
                                <span style="color:${card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : 'black'}">
                                    ${card.rank}${this.getSuitSymbol(card.suit)}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                    <div class="showdown-hand-name">${hand.hand.name}</div>
                </div>
            `;
        });

        html += `</div><p style="margin-top:20px;color:#fbbf24">${data.winner.name} wins $${data.winner.winAmount}!</p></div>`;
        modal.innerHTML = html;
        modal.classList.add('active');

        // Auto-hide and prompt for next round
        setTimeout(() => {
            modal.classList.remove('active');
            if (confirm('Play another round?')) {
                window.socketClient.nextRound();
            }
        }, 4000);
    }

    showOnlineRoundEnd(data) {
        setTimeout(() => {
            alert(`${data.winner.name} wins $${data.winner.winAmount}!\n${data.winner.reason || ''}`);

            const myPlayer = this.currentRoom.players.find(p => p.oderId === this.currentPlayerId);
            if (myPlayer && myPlayer.chips <= 0) {
                if (confirm('You are out of chips! Buy back?')) {
                    window.socketClient.buyBack();
                }
            } else if (confirm('Play another round?')) {
                window.socketClient.nextRound();
            }
        }, 1000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.pokerApp = new PokerApp();
});
