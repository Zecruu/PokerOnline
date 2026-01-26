// Main Application Logic
// Handles UI interactions and game flow

class PokerApp {
    constructor() {
        this.roomManager = new RoomManager();
        this.currentGame = null;
        this.currentPlayerId = null;
        this.currentScreen = 'home';

        this.initializeEventListeners();
        this.showScreen('home');
    }

    initializeEventListeners() {
        // Home screen
        document.getElementById('create-room-btn').addEventListener('click', () => {
            this.createRoom();
        });

        document.getElementById('join-room-btn').addEventListener('click', () => {
            this.showScreen('join');
        });

        // Join screen
        document.getElementById('back-from-join').addEventListener('click', () => {
            this.showScreen('home');
        });

        document.getElementById('join-room-submit').addEventListener('click', () => {
            this.joinRoom();
        });

        // Lobby screen
        document.getElementById('leave-lobby-btn').addEventListener('click', () => {
            this.leaveLobby();
        });

        document.getElementById('copy-code-btn').addEventListener('click', () => {
            this.copyRoomCode();
        });

        document.getElementById('start-game-btn').addEventListener('click', () => {
            this.startGame();
        });

        // Game screen
        document.getElementById('leave-game-btn').addEventListener('click', () => {
            this.leaveGame();
        });

        document.getElementById('fold-btn').addEventListener('click', () => {
            this.playerAction('fold');
        });

        document.getElementById('check-btn').addEventListener('click', () => {
            this.playerAction('check');
        });

        document.getElementById('call-btn').addEventListener('click', () => {
            this.playerAction('call');
        });

        document.getElementById('raise-btn').addEventListener('click', () => {
            const amount = parseInt(document.getElementById('bet-slider').value);
            this.playerAction('raise', amount);
        });

        // Bet slider
        document.getElementById('bet-slider').addEventListener('input', (e) => {
            document.getElementById('bet-amount').textContent = e.target.value;
        });

        // Enter key handlers
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

    createRoom() {
        const playerName = prompt('Enter your name:');
        if (!playerName || playerName.trim() === '') {
            alert('Please enter a valid name');
            return;
        }

        const { roomCode, game } = this.roomManager.createRoom(playerName.trim());
        this.currentGame = game;
        this.currentPlayerId = game.players[0].id;

        this.showLobby(roomCode);
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

        const result = this.roomManager.joinRoom(roomCode, playerName);

        if (result.success) {
            this.currentGame = result.game;
            // Find the player that was just added
            this.currentPlayerId = result.game.players[result.game.players.length - 1].id;
            this.showLobby(roomCode);
        } else {
            alert(result.message || 'Failed to join room');
        }
    }

    showLobby(roomCode) {
        document.getElementById('display-room-code').textContent = roomCode;
        this.updatePlayersList();
        this.showScreen('lobby');

        // Update start button state
        this.updateStartButton();
    }

    updatePlayersList() {
        const playersList = document.getElementById('players-list');
        playersList.innerHTML = '';

        this.currentGame.players.forEach((player, index) => {
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

        // Only host can start
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
            const originalText = btn.innerHTML;
            btn.innerHTML = '<span>✓</span>';
            setTimeout(() => {
                btn.innerHTML = originalText;
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
        const result = this.currentGame.startGame();

        if (result.success) {
            this.showScreen('game');
            this.renderGameState();
        } else {
            alert(result.message);
        }
    }

    renderGameState() {
        const state = this.currentGame.getGameState();
        const currentPlayer = state.players.find(p => p.id === this.currentPlayerId);

        // Update pot
        document.getElementById('pot-amount').textContent = `$${state.pot}`;

        // Update player chips
        document.getElementById('player-chips-amount').textContent = `$${currentPlayer.chips}`;

        // Render player's cards
        this.renderPlayerCards(currentPlayer.cards);

        // Render community cards
        this.renderCommunityCards(state.communityCards);

        // Render opponents
        this.renderOpponents(state.players.filter(p => p.id !== this.currentPlayerId));

        // Update action controls
        this.updateActionControls(currentPlayer, state);

        // Update bet slider
        document.getElementById('bet-slider').max = currentPlayer.chips;
        document.getElementById('bet-slider').value = state.currentBet;
        document.getElementById('bet-amount').textContent = state.currentBet;
    }

    renderPlayerCards(cards) {
        const container = document.getElementById('player-cards');
        container.innerHTML = '';

        cards.forEach((card, index) => {
            const cardElement = CardRenderer.createCardElement(card.rank, card.suit);
            cardElement.style.animationDelay = `${index * 0.1}s`;
            cardElement.classList.add('dealing');
            container.appendChild(cardElement);
        });
    }

    renderCommunityCards(cards) {
        const container = document.getElementById('community-cards');
        container.innerHTML = '';

        // Always show 5 card slots
        for (let i = 0; i < 5; i++) {
            if (i < cards.length) {
                const cardElement = CardRenderer.createCardElement(cards[i].rank, cards[i].suit);
                cardElement.style.animationDelay = `${i * 0.1}s`;
                cardElement.classList.add('dealing');
                container.appendChild(cardElement);
            } else {
                // Empty slot
                const placeholder = document.createElement('div');
                placeholder.className = 'card';
                placeholder.style.opacity = '0.3';
                placeholder.style.border = '2px dashed rgba(255,255,255,0.3)';
                container.appendChild(placeholder);
            }
        }
    }

    renderOpponents(opponents) {
        const container = document.getElementById('players-container');
        container.innerHTML = '';

        // Position opponents around the table
        const positions = this.calculateOpponentPositions(opponents.length);

        opponents.forEach((opponent, index) => {
            const opponentDiv = document.createElement('div');
            opponentDiv.className = 'opponent-player' + (opponent.isActive ? ' active' : '');
            opponentDiv.style.left = positions[index].x;
            opponentDiv.style.top = positions[index].y;

            const info = document.createElement('div');
            info.className = 'opponent-info';

            const name = document.createElement('div');
            name.className = 'opponent-name';
            name.textContent = opponent.name;

            const chips = document.createElement('div');
            chips.className = 'opponent-chips';
            chips.textContent = `$${opponent.chips}`;

            info.appendChild(name);
            info.appendChild(chips);

            const cardsDiv = document.createElement('div');
            cardsDiv.className = 'opponent-cards';

            // Show card backs for opponents
            if (opponent.cards.length > 0 && !opponent.folded) {
                for (let i = 0; i < 2; i++) {
                    const cardBack = CardRenderer.createCardElement('A', 'spades', true);
                    cardBack.style.width = '40px';
                    cardBack.style.height = '56px';
                    cardsDiv.appendChild(cardBack);
                }
            }

            opponentDiv.appendChild(info);
            opponentDiv.appendChild(cardsDiv);
            container.appendChild(opponentDiv);
        });
    }

    calculateOpponentPositions(count) {
        const positions = [];
        const radius = 40; // percentage from center

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
            const x = 50 + radius * Math.cos(angle);
            const y = 30 + radius * Math.sin(angle) * 0.6; // Ellipse

            positions.push({
                x: `${x}%`,
                y: `${y}%`
            });
        }

        return positions;
    }

    updateActionControls(player, state) {
        const foldBtn = document.getElementById('fold-btn');
        const checkBtn = document.getElementById('check-btn');
        const callBtn = document.getElementById('call-btn');
        const raiseBtn = document.getElementById('raise-btn');

        const isPlayerTurn = player.isActive;
        const canCheck = player.bet >= state.currentBet;
        const callAmount = state.currentBet - player.bet;

        // Enable/disable buttons based on turn
        foldBtn.disabled = !isPlayerTurn;
        checkBtn.disabled = !isPlayerTurn || !canCheck;
        callBtn.disabled = !isPlayerTurn || canCheck;
        raiseBtn.disabled = !isPlayerTurn;

        // Update call button text
        if (callAmount > 0) {
            callBtn.textContent = `Call $${callAmount}`;
        } else {
            callBtn.textContent = 'Call';
        }
    }

    playerAction(action, amount = 0) {
        const result = this.currentGame.playerAction(this.currentPlayerId, action, amount);

        if (result.success) {
            this.renderGameState();

            // Check for game end
            if (this.currentGame.gamePhase === 'showdown') {
                setTimeout(() => {
                    this.handleShowdown();
                }, 1000);
            }
        } else {
            alert(result.message);
        }
    }

    handleShowdown() {
        const result = this.currentGame.showdown();

        let message = `${result.winner.name} wins $${this.currentGame.pot}!`;
        if (result.hand) {
            message += `\nHand: ${result.hand.name}`;
        } else if (result.reason) {
            message += `\n${result.reason}`;
        }

        alert(message);

        // Start new round
        setTimeout(() => {
            this.currentGame.dealerIndex = (this.currentGame.dealerIndex + 1) % this.currentGame.players.length;
            this.currentGame.startGame();
            this.renderGameState();
        }, 2000);
    }

    leaveGame() {
        if (confirm('Are you sure you want to leave the game?')) {
            this.showScreen('home');
            this.currentGame = null;
            this.currentPlayerId = null;
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.pokerApp = new PokerApp();
});
