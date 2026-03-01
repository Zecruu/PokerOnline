(function() {
'use strict';

class ZecruWordMaster {
    constructor() {
        this.socket = null;
        this.roomCode = null;
        this.playerId = null;
        this.playerName = 'Player';
        this.isHost = false;

        this.role = null;
        this.board = [];
        this.currentHint = null;
        this.guessesLeft = 0;
        this.safeFound = 0;
        this.hostRole = 'wordmaster';
        this.canPick = false;

        this.loadPlayerName();
        this.setupEvents();
        this.showScreen('menuScreen');
    }

    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const el = document.getElementById(id);
        if (el) el.classList.add('active');
    }

    loadPlayerName() {
        try {
            const userData = localStorage.getItem('user_data');
            if (userData) {
                const parsed = JSON.parse(userData);
                if (parsed.username) this.playerName = parsed.username;
            }
        } catch (e) {}
        document.getElementById('playerNameInput').value = this.playerName;
    }

    getPlayerName() {
        const input = document.getElementById('playerNameInput').value.trim();
        return input || this.playerName || 'Player';
    }

    setupEvents() {
        document.getElementById('btnCreateRoom').addEventListener('click', () => this.createRoom());
        document.getElementById('btnJoinRoom').addEventListener('click', () => this.joinRoom());
        document.getElementById('roomCodeInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });

        document.getElementById('btnRoleWordmaster').addEventListener('click', () => this.selectRole('wordmaster'));
        document.getElementById('btnRoleGuesser').addEventListener('click', () => this.selectRole('guesser'));
        document.getElementById('btnStartGame').addEventListener('click', () => this.startGame());
        document.getElementById('btnBackToMenu').addEventListener('click', () => this.backToMenu());

        document.getElementById('btnGiveHint').addEventListener('click', () => this.giveHint());
        document.getElementById('hintInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.giveHint();
        });
        document.getElementById('btnEndTurn').addEventListener('click', () => this.endTurn());

        document.getElementById('btnPlayAgain').addEventListener('click', () => this.backToMenu());
        document.getElementById('btnMainMenu').addEventListener('click', () => this.backToMenu());
    }

    connectSocket() {
        if (this.socket) return;

        const host = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
            ? 'http://localhost:3001'
            : (window.SOCKET_SERVER_URL || window.location.origin);

        this.socket = io(host, { transports: ['websocket', 'polling'], timeout: 10000 });

        this.socket.on('connect', () => {
            console.log('[WordMaster] Connected');
            this.playerId = this.socket.id;
        });

        this.socket.on('disconnect', () => {
            console.log('[WordMaster] Disconnected');
        });

        // Room lifecycle
        this.socket.on('wm:roomCreated', (data) => {
            this.roomCode = data.code;
            this.isHost = true;
            document.getElementById('lobbyRoomCode').textContent = data.code;
            this.updateLobbyUI(data.players);
            document.getElementById('roleSelect').classList.remove('hidden');
            document.getElementById('btnStartGame').classList.add('hidden');
            document.getElementById('lobbyStatus').textContent = 'Waiting for another player...';
            this.showScreen('lobbyScreen');
        });

        this.socket.on('wm:roomJoined', (data) => {
            this.roomCode = data.code;
            this.isHost = false;
            document.getElementById('lobbyRoomCode').textContent = data.code;
            this.updateLobbyUI(data.players);
            document.getElementById('roleSelect').classList.add('hidden');
            document.getElementById('btnStartGame').classList.add('hidden');
            document.getElementById('lobbyStatus').textContent = 'Waiting for host to start...';
            this.showScreen('lobbyScreen');
        });

        this.socket.on('wm:playerJoined', (data) => {
            this.updateLobbyUI(data.players);
            if (this.isHost && data.players.length === 2) {
                document.getElementById('btnStartGame').classList.remove('hidden');
                document.getElementById('lobbyStatus').textContent = 'Ready to start!';
            }
        });

        this.socket.on('wm:playerLeft', (data) => {
            if (this.currentScreen() === 'gameScreen') {
                alert('The other player disconnected.');
                this.backToMenu();
            } else {
                this.updateLobbyUI(data.players);
                document.getElementById('btnStartGame').classList.add('hidden');
                document.getElementById('lobbyStatus').textContent = 'Waiting for another player...';
            }
        });

        // Game flow
        this.socket.on('wm:gameStarted', (data) => {
            console.log('[WordMaster] Game started, role:', data.role);
            this.role = data.role;
            this.board = data.board;
            this.currentHint = null;
            this.guessesLeft = 0;
            this.safeFound = 0;
            this.canPick = false;

            this.showScreen('gameScreen');
            this.setupGameScreen();
        });

        this.socket.on('wm:hintGiven', (data) => {
            this.currentHint = { word: data.hint, number: data.number };
            this.guessesLeft = data.guessesLeft;

            // Show hint in HUD
            document.getElementById('hintWord').textContent = data.hint.toUpperCase();
            const numEl = document.getElementById('hintNumber');
            numEl.textContent = data.number;
            numEl.classList.remove('hidden');
            this.updateHUD();

            // Add to history
            this.addHistoryEntry('hint', data.hint.toUpperCase() + ' — ' + data.number);

            if (this.role === 'guesser') {
                this.switchArea('guess');
                document.getElementById('guessStatus').textContent =
                    'Hint: "' + data.hint.toUpperCase() + '" for ' + data.number + ' word(s). Click a card!';
                this.canPick = true;
                this.updateCardClickability();
            } else {
                this.switchArea('waiting');
                document.getElementById('waitingText').textContent = 'Guesser is picking...';
            }
        });

        this.socket.on('wm:wordRevealed', (data) => {
            this.board[data.index].revealed = true;
            this.board[data.index].type = data.type;
            this.safeFound = data.safeFound;
            this.guessesLeft = data.guessesLeft;

            this.revealWord(data.index, data.type);
            this.updateHUD();

            // Add pick to history
            const label = data.word.charAt(0).toUpperCase() + data.word.slice(1);
            this.addHistoryEntry(data.type, label + ' — ' + data.type.toUpperCase());

            if (data.gameOver) {
                this.canPick = false;
                this.updateCardClickability();
                return;
            }

            if (data.turnEnded) {
                this.canPick = false;
                this.updateCardClickability();
                document.getElementById('hintWord').textContent = 'Waiting...';
                document.getElementById('hintNumber').classList.add('hidden');

                if (this.role === 'wordmaster') {
                    this.switchArea('hint');
                } else {
                    this.switchArea('waiting');
                    document.getElementById('waitingText').textContent = 'Waiting for WordMaster\'s hint...';
                }
            } else if (this.role === 'guesser') {
                // Still have guesses left — re-enable picking
                this.canPick = true;
                this.updateCardClickability();
                document.getElementById('guessStatus').textContent =
                    'Correct! ' + this.guessesLeft + ' guess(es) left. Pick another or End Turn.';
            }
        });

        this.socket.on('wm:turnEnded', (data) => {
            this.safeFound = data.safeFound;
            this.guessesLeft = 0;
            this.currentHint = null;
            this.canPick = false;
            this.updateCardClickability();
            this.updateHUD();

            document.getElementById('hintWord').textContent = 'Waiting...';
            document.getElementById('hintNumber').classList.add('hidden');

            if (this.role === 'wordmaster') {
                this.switchArea('hint');
            } else {
                this.switchArea('waiting');
                document.getElementById('waitingText').textContent = 'Waiting for WordMaster\'s hint...';
            }
        });

        this.socket.on('wm:gameOver', (data) => {
            setTimeout(() => this.showGameOver(data), 800);
        });

        this.socket.on('wm:error', (data) => {
            console.error('[WordMaster] Error:', data.msg);
            if (this.role === 'guesser') {
                this.canPick = true;
                this.updateCardClickability();
            }
            alert(data.msg || 'An error occurred.');
        });
    }

    currentScreen() {
        const active = document.querySelector('.screen.active');
        return active ? active.id : null;
    }

    // ── Room Management ──────────────────────────────
    createRoom() {
        this.connectSocket();
        this.playerName = this.getPlayerName();
        this.socket.emit('wm:createRoom', { name: this.playerName });
    }

    joinRoom() {
        const code = document.getElementById('roomCodeInput').value.trim().toUpperCase();
        if (code.length < 4) { alert('Enter a valid room code.'); return; }
        this.connectSocket();
        this.playerName = this.getPlayerName();
        this.socket.emit('wm:joinRoom', { code, name: this.playerName });
    }

    backToMenu() {
        if (this.socket) { this.socket.disconnect(); this.socket = null; }
        this.roomCode = null;
        this.isHost = false;
        this.role = null;
        this.board = [];
        this.currentHint = null;
        this.guessesLeft = 0;
        this.safeFound = 0;
        this.canPick = false;
        this.showScreen('menuScreen');
    }

    updateLobbyUI(players) {
        document.getElementById('lobbyPlayerCount').textContent = players.length;
        const list = document.getElementById('lobbyPlayerList');
        list.innerHTML = '';
        players.forEach((p, i) => {
            const div = document.createElement('div');
            div.className = 'player-item';
            div.innerHTML = p.name + (i === 0 ? ' <span class="host-badge">HOST</span>' : '');
            list.appendChild(div);
        });
    }

    selectRole(role) {
        this.hostRole = role;
        document.getElementById('btnRoleWordmaster').classList.toggle('selected', role === 'wordmaster');
        document.getElementById('btnRoleGuesser').classList.toggle('selected', role === 'guesser');
    }

    startGame() {
        if (!this.isHost) return;
        this.socket.emit('wm:startGame', { hostRole: this.hostRole });
    }

    // ── Game Screen ──────────────────────────────────
    setupGameScreen() {
        const badge = document.getElementById('hudRole');
        badge.textContent = this.role === 'wordmaster' ? 'WORDMASTER' : 'GUESSER';
        badge.className = 'role-badge ' + this.role;

        document.getElementById('hintWord').textContent = 'Waiting...';
        document.getElementById('hintNumber').classList.add('hidden');
        document.getElementById('hintHistory').innerHTML = '';

        this.updateHUD();
        this.renderBoard();

        if (this.role === 'wordmaster') {
            this.switchArea('hint');
        } else {
            this.switchArea('waiting');
            document.getElementById('waitingText').textContent = 'Waiting for WordMaster\'s hint...';
        }
    }

    renderBoard() {
        const grid = document.getElementById('wordGrid');
        grid.innerHTML = '';

        this.board.forEach((card, i) => {
            const div = document.createElement('div');
            div.className = 'word-card';
            div.id = 'card_' + i;
            div.dataset.index = i;
            div.innerHTML = '<span class="card-word">' + card.word.charAt(0).toUpperCase() + card.word.slice(1) + '</span>';

            // WordMaster sees card types
            if (this.role === 'wordmaster' && card.type && !card.revealed) {
                div.classList.add('wm-' + card.type);
            }

            if (card.revealed) {
                div.classList.add('revealed', 'revealed-' + card.type);
            }

            // Guesser click handler
            if (this.role === 'guesser' && !card.revealed) {
                div.addEventListener('click', () => this.pickWord(i));
            }

            grid.appendChild(div);
        });

        this.updateCardClickability();
    }

    updateHUD() {
        document.getElementById('hudSafeFound').textContent = this.safeFound;
        document.getElementById('hudGuessesLeft').textContent = this.guessesLeft;
    }

    updateCardClickability() {
        const cards = document.querySelectorAll('#wordGrid .word-card');
        cards.forEach(card => {
            const idx = parseInt(card.dataset.index);
            if (this.board[idx] && this.board[idx].revealed) {
                card.classList.remove('clickable');
                return;
            }
            if (this.canPick && this.role === 'guesser') {
                card.classList.add('clickable');
            } else {
                card.classList.remove('clickable');
            }
        });
    }

    switchArea(mode) {
        document.getElementById('hintInputArea').classList.add('hidden');
        document.getElementById('guessArea').classList.add('hidden');
        document.getElementById('waitingArea').classList.add('hidden');

        if (mode === 'hint') {
            document.getElementById('hintInputArea').classList.remove('hidden');
            const input = document.getElementById('hintInput');
            input.value = '';
            input.disabled = false;
            document.getElementById('btnGiveHint').disabled = false;
            document.getElementById('hintError').classList.add('hidden');
            input.focus();
        } else if (mode === 'guess') {
            document.getElementById('guessArea').classList.remove('hidden');
            document.getElementById('guessError').classList.add('hidden');
        } else {
            document.getElementById('waitingArea').classList.remove('hidden');
        }
    }

    // ── Give Hint ────────────────────────────────────
    giveHint() {
        const input = document.getElementById('hintInput');
        const hint = input.value.trim().toLowerCase();
        const number = parseInt(document.getElementById('hintNumberInput').value);
        const errorEl = document.getElementById('hintError');
        errorEl.classList.add('hidden');

        if (!hint) return;
        if (hint.includes(' ')) {
            errorEl.textContent = 'Hint must be a single word.';
            errorEl.classList.remove('hidden');
            return;
        }
        if (!number || number < 1 || number > 8) {
            errorEl.textContent = 'Number must be between 1 and 8.';
            errorEl.classList.remove('hidden');
            return;
        }
        // Check if hint is a word on the board
        if (this.board.some(c => c.word === hint)) {
            errorEl.textContent = 'Hint cannot be a word on the board!';
            errorEl.classList.remove('hidden');
            return;
        }

        if (!this.socket || !this.socket.connected) {
            errorEl.textContent = 'Disconnected. Please refresh.';
            errorEl.classList.remove('hidden');
            return;
        }

        input.disabled = true;
        document.getElementById('btnGiveHint').disabled = true;
        this.socket.emit('wm:giveHint', { hint, number });

        setTimeout(() => {
            if (input.disabled) {
                input.disabled = false;
                document.getElementById('btnGiveHint').disabled = false;
            }
        }, 5000);
    }

    // ── Pick Word ────────────────────────────────────
    pickWord(index) {
        if (!this.canPick) return;
        if (this.board[index].revealed) return;

        if (!this.socket || !this.socket.connected) {
            document.getElementById('guessError').textContent = 'Disconnected. Please refresh.';
            document.getElementById('guessError').classList.remove('hidden');
            return;
        }

        this.canPick = false;
        this.updateCardClickability();
        this.socket.emit('wm:pickWord', { index });

        this._pickTimeout = setTimeout(() => {
            this.canPick = true;
            this.updateCardClickability();
        }, 5000);
    }

    // ── End Turn ─────────────────────────────────────
    endTurn() {
        if (!this.socket || !this.socket.connected) return;
        this.socket.emit('wm:endTurn');
    }

    // ── Reveal Word Animation ────────────────────────
    revealWord(index, type) {
        if (this._pickTimeout) { clearTimeout(this._pickTimeout); this._pickTimeout = null; }

        const card = document.getElementById('card_' + index);
        if (!card) return;

        // Remove old classes
        card.classList.remove('wm-safe', 'wm-neutral', 'wm-doom', 'clickable');
        card.classList.add('revealed', 'revealed-' + type, 'just-revealed');

        setTimeout(() => card.classList.remove('just-revealed'), 500);
    }

    // ── History Log ──────────────────────────────────
    addHistoryEntry(type, text) {
        const container = document.getElementById('hintHistory');
        const div = document.createElement('div');
        if (type === 'hint') {
            div.className = 'history-entry history-hint';
        } else {
            div.className = 'history-entry history-pick ' + type;
        }
        div.textContent = text;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    // ── Game Over ────────────────────────────────────
    showGameOver(data) {
        const title = document.getElementById('gameOverTitle');
        if (data.winner === 'guesser') {
            title.textContent = 'GUESSER WINS!';
            title.className = 'win';
        } else if (data.winner === 'disconnect') {
            title.textContent = 'PLAYER DISCONNECTED';
            title.className = 'lose';
        } else {
            title.textContent = 'DOOM WORD PICKED!';
            title.className = 'lose';
        }

        document.getElementById('goSafeFound').textContent = data.safeFound || 0;
        document.getElementById('goHintsGiven').textContent = data.hintsGiven || 0;

        // Render full board reveal
        const grid = document.getElementById('revealGrid');
        grid.innerHTML = '';
        if (data.board) {
            data.board.forEach((card) => {
                const div = document.createElement('div');
                div.className = 'word-card revealed revealed-' + card.type;
                div.innerHTML = '<span class="card-word">' + card.word.charAt(0).toUpperCase() + card.word.slice(1) + '</span>';
                grid.appendChild(div);
            });
        }

        this.showScreen('gameOverScreen');
    }
}

new ZecruWordMaster();

})();
