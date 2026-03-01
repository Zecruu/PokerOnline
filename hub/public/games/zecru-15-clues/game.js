(function() {
'use strict';

class ZecruClues {
    constructor() {
        this.socket = null;
        this.roomCode = null;
        this.playerId = null;
        this.playerName = 'Player';
        this.isHost = false;

        // Game state
        this.role = null;
        this.words = [];
        this.foundWords = [];
        this.guessesRemaining = 15;
        this.currentClue = null;
        this.currentClueCount = 0;
        this.clueGuessesLeft = 0;
        this.guessHistory = [];
        this.hostRole = 'wordmaster';

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
        // Menu
        document.getElementById('btnCreateRoom').addEventListener('click', () => this.createRoom());
        document.getElementById('btnJoinRoom').addEventListener('click', () => this.joinRoom());
        document.getElementById('roomCodeInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });

        // Lobby
        document.getElementById('btnRoleWordmaster').addEventListener('click', () => this.selectRole('wordmaster'));
        document.getElementById('btnRoleGuesser').addEventListener('click', () => this.selectRole('guesser'));
        document.getElementById('btnStartGame').addEventListener('click', () => this.startGame());
        document.getElementById('btnBackToMenu').addEventListener('click', () => this.backToMenu());

        // Word Input
        document.getElementById('btnSubmitWords').addEventListener('click', () => this.submitWords());

        // Game
        document.getElementById('btnGiveClue').addEventListener('click', () => this.giveClue());
        document.getElementById('btnMakeGuess').addEventListener('click', () => this.makeGuess());
        document.getElementById('btnPassTurn').addEventListener('click', () => this.passTurn());
        document.getElementById('clueInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.giveClue();
        });
        document.getElementById('guessInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.makeGuess();
        });

        // Game Over
        document.getElementById('btnPlayAgain').addEventListener('click', () => this.backToMenu());
        document.getElementById('btnMainMenu').addEventListener('click', () => this.backToMenu());
    }

    // ── Socket ──────────────────────────────────────────────
    connectSocket() {
        if (this.socket) return;

        const host = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
            ? 'http://localhost:3001'
            : (window.SOCKET_SERVER_URL || window.location.origin);

        this.socket = io(host, { transports: ['websocket', 'polling'], timeout: 10000 });

        this.socket.on('connect', () => {
            console.log('[15 Clues] Connected');
            this.playerId = this.socket.id;
        });
        this.socket.on('disconnect', () => console.log('[15 Clues] Disconnected'));

        // Room lifecycle
        this.socket.on('clue:roomCreated', (data) => {
            this.roomCode = data.code;
            this.isHost = true;
            document.getElementById('lobbyRoomCode').textContent = data.code;
            this.updateLobbyUI(data.players);
            document.getElementById('roleSelect').classList.remove('hidden');
            document.getElementById('btnStartGame').classList.add('hidden');
            document.getElementById('lobbyStatus').textContent = 'Waiting for another player...';
            this.showScreen('lobbyScreen');
        });

        this.socket.on('clue:roomJoined', (data) => {
            this.roomCode = data.code;
            this.isHost = false;
            document.getElementById('lobbyRoomCode').textContent = data.code;
            this.updateLobbyUI(data.players);
            document.getElementById('roleSelect').classList.add('hidden');
            document.getElementById('btnStartGame').classList.add('hidden');
            document.getElementById('lobbyStatus').textContent = 'Waiting for host to start...';
            this.showScreen('lobbyScreen');
        });

        this.socket.on('clue:playerJoined', (data) => {
            this.updateLobbyUI(data.players);
            if (this.isHost && data.players.length === 2) {
                document.getElementById('btnStartGame').classList.remove('hidden');
                document.getElementById('lobbyStatus').textContent = 'Ready to start!';
            }
        });

        this.socket.on('clue:playerLeft', (data) => {
            if (this.currentScreen() === 'gameScreen') {
                alert('The other player disconnected.');
                this.backToMenu();
            } else {
                this.updateLobbyUI(data.players);
                document.getElementById('btnStartGame').classList.add('hidden');
                document.getElementById('lobbyStatus').textContent = 'Waiting for another player...';
            }
        });

        // ── Game Started — Wordmaster picks words, Guesser waits ──
        this.socket.on('clue:gameStarted', (data) => {
            console.log('[15 Clues] Game started, role:', data.role);
            this.role = data.role;
            this.guessesRemaining = 15;
            this.guessHistory = [];
            this.currentClue = null;
            this.currentClueCount = 0;
            this.clueGuessesLeft = 0;
            this.foundWords = new Array(10).fill(false);
            this.words = [];

            if (this.role === 'wordmaster') {
                this.buildWordInputScreen();
                this.showScreen('wordInputScreen');
            } else {
                this.showScreen('wordWaitScreen');
            }
        });

        // ── Words Submitted — both players enter the game ──
        this.socket.on('clue:wordsSubmitted', (data) => {
            console.log('[15 Clues] Words submitted, starting game');
            if (data.words) {
                this.words = data.words; // wordmaster gets the words
            }
            this.showScreen('gameScreen');
            this.setupGameScreen();
        });

        // ── Clue Given ──
        this.socket.on('clue:clueGiven', (data) => {
            if (this._clueTimeout) { clearTimeout(this._clueTimeout); this._clueTimeout = null; }
            console.log('[15 Clues] Clue:', data.clue, 'Count:', data.count, 'Role:', this.role);
            this.currentClue = data.clue;
            this.currentClueCount = data.count;
            this.clueGuessesLeft = data.count;
            this.showCurrentClue(data.clue, data.count);

            if (this.role === 'guesser') {
                this.updateGuessHint();
                this.switchInputArea('guess');
            } else {
                this.switchInputArea('waiting');
                document.getElementById('waitingText').textContent = 'Waiting for Guesser to guess...';
            }
        });

        // ── Guess Result ──
        this.socket.on('clue:guessResult', (data) => {
            if (this._guessTimeout) { clearTimeout(this._guessTimeout); this._guessTimeout = null; }
            console.log('[15 Clues] Result:', data);

            this.guessesRemaining = data.guessesRemaining;
            this.clueGuessesLeft = data.clueGuessesLeft;
            if (data.foundWords) this.foundWords = data.foundWords;

            this.addHistoryEntry({
                clue: data.clue,
                guess: data.guess,
                correct: data.correct,
                word: data.word
            });

            this.showResultFlash(data.correct);
            this.updateGameHUD();
            if (this.role === 'wordmaster') this.updateWordList();

            setTimeout(() => {
                if (data.gameOver) return;

                if (data.turnOver) {
                    // Turn is over — back to wordmaster's turn
                    document.getElementById('clueDisplay').classList.add('hidden');
                    if (this.role === 'wordmaster') {
                        this.switchInputArea('clue');
                    } else {
                        this.switchInputArea('waiting');
                        document.getElementById('waitingText').textContent = 'Waiting for Wordmaster\'s clue...';
                    }
                } else {
                    // Guesser still has guesses left for this clue
                    if (this.role === 'guesser') {
                        this.updateGuessHint();
                        this.switchInputArea('guess');
                    }
                }
            }, 1200);
        });

        // ── Turn Passed ──
        this.socket.on('clue:turnPassed', (data) => {
            this.guessesRemaining = data.guessesRemaining;
            if (data.foundWords) this.foundWords = data.foundWords;
            this.clueGuessesLeft = 0;
            this.currentClue = null;

            this.updateGameHUD();
            if (this.role === 'wordmaster') this.updateWordList();

            document.getElementById('clueDisplay').classList.add('hidden');
            if (this.role === 'wordmaster') {
                this.switchInputArea('clue');
            } else {
                this.switchInputArea('waiting');
                document.getElementById('waitingText').textContent = 'Waiting for Wordmaster\'s clue...';
            }
        });

        // ── Game Over ──
        this.socket.on('clue:gameOver', (data) => {
            if (this._guessTimeout) { clearTimeout(this._guessTimeout); this._guessTimeout = null; }
            if (this._clueTimeout) { clearTimeout(this._clueTimeout); this._clueTimeout = null; }
            setTimeout(() => this.showGameOver(data), 1800);
        });

        // ── Error ──
        this.socket.on('clue:error', (data) => {
            console.error('[15 Clues] Error:', data.msg);
            if (this._guessTimeout) { clearTimeout(this._guessTimeout); this._guessTimeout = null; }
            if (this._clueTimeout) { clearTimeout(this._clueTimeout); this._clueTimeout = null; }
            if (this.role === 'guesser') {
                const inp = document.getElementById('guessInput');
                if (inp) inp.disabled = false;
                const btn = document.getElementById('btnMakeGuess');
                if (btn) btn.disabled = false;
            } else if (this.role === 'wordmaster') {
                const inp = document.getElementById('clueInput');
                if (inp) inp.disabled = false;
                const btn = document.getElementById('btnGiveClue');
                if (btn) btn.disabled = false;
            }
            alert(data.msg || 'An error occurred.');
        });
    }

    currentScreen() {
        const active = document.querySelector('.screen.active');
        return active ? active.id : null;
    }

    // ── Room Management ─────────────────────────────────────
    createRoom() {
        this.connectSocket();
        this.playerName = this.getPlayerName();
        this.socket.emit('clue:createRoom', { name: this.playerName });
    }

    joinRoom() {
        const code = document.getElementById('roomCodeInput').value.trim().toUpperCase();
        if (code.length < 4) { alert('Enter a valid room code.'); return; }
        this.connectSocket();
        this.playerName = this.getPlayerName();
        this.socket.emit('clue:joinRoom', { code, name: this.playerName });
    }

    backToMenu() {
        if (this.socket) { this.socket.disconnect(); this.socket = null; }
        this.roomCode = null;
        this.isHost = false;
        this.role = null;
        this.words = [];
        this.foundWords = [];
        this.guessHistory = [];
        this.currentClue = null;
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
        this.socket.emit('clue:startGame', { hostRole: this.hostRole });
    }

    // ── Word Input (Wordmaster types 10 words) ─────────────
    buildWordInputScreen() {
        const list = document.getElementById('wordInputList');
        list.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            const row = document.createElement('div');
            row.className = 'word-input-row';
            row.innerHTML =
                '<span class="word-num">' + (i + 1) + '</span>' +
                '<input type="text" class="word-input" id="wordInput' + i + '" placeholder="Word ' + (i + 1) + '" maxlength="30" autocomplete="off">';
            list.appendChild(row);
        }
        // Auto-focus first input
        const first = document.getElementById('wordInput0');
        if (first) setTimeout(() => first.focus(), 100);

        // Enter key moves to next input
        for (let i = 0; i < 10; i++) {
            const inp = document.getElementById('wordInput' + i);
            inp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (i < 9) {
                        document.getElementById('wordInput' + (i + 1)).focus();
                    } else {
                        this.submitWords();
                    }
                }
            });
        }

        document.getElementById('wordInputError').classList.add('hidden');
        document.getElementById('btnSubmitWords').disabled = false;
    }

    submitWords() {
        const errorEl = document.getElementById('wordInputError');
        errorEl.classList.add('hidden');

        const words = [];
        for (let i = 0; i < 10; i++) {
            const inp = document.getElementById('wordInput' + i);
            const val = (inp.value || '').trim().toLowerCase();
            if (!val) {
                errorEl.textContent = 'Word ' + (i + 1) + ' is empty.';
                errorEl.classList.remove('hidden');
                inp.focus();
                return;
            }
            if (val.includes(' ')) {
                errorEl.textContent = 'Word ' + (i + 1) + ' must be a single word.';
                errorEl.classList.remove('hidden');
                inp.focus();
                return;
            }
            if (words.includes(val)) {
                errorEl.textContent = 'Word ' + (i + 1) + ' is a duplicate.';
                errorEl.classList.remove('hidden');
                inp.focus();
                return;
            }
            words.push(val);
        }

        if (!this.socket || !this.socket.connected) {
            errorEl.textContent = 'Disconnected. Please refresh.';
            errorEl.classList.remove('hidden');
            return;
        }

        document.getElementById('btnSubmitWords').disabled = true;
        this.socket.emit('clue:submitWords', { words });
    }

    // ── Game Screen Setup ───────────────────────────────────
    setupGameScreen() {
        this.updateGameHUD();

        const badge = document.getElementById('hudRole');
        badge.textContent = this.role === 'wordmaster' ? 'WORDMASTER' : 'GUESSER';
        badge.className = 'role-badge ' + this.role;

        document.getElementById('guessHistory').innerHTML = '';
        document.getElementById('clueDisplay').classList.add('hidden');

        if (this.role === 'wordmaster') {
            document.getElementById('wordListPanel').classList.remove('hidden');
            this.updateWordList();
            this.switchInputArea('clue');
        } else {
            document.getElementById('wordListPanel').classList.add('hidden');
            this.switchInputArea('waiting');
            document.getElementById('waitingText').textContent = 'Waiting for Wordmaster\'s clue...';
        }
    }

    // ── HUD ─────────────────────────────────────────────────
    updateGameHUD() {
        const found = this.foundWords.filter(Boolean).length;
        document.getElementById('hudWordNum').textContent = found;
        document.getElementById('hudGuesses').textContent = this.guessesRemaining;

        const guessEl = document.getElementById('hudGuesses');
        if (this.guessesRemaining <= 3) {
            guessEl.style.color = '#ff4444';
        } else if (this.guessesRemaining <= 6) {
            guessEl.style.color = '#ffaa44';
        } else {
            guessEl.style.color = '#fff';
        }
    }

    // ── Word List (Wordmaster sidebar) ──────────────────────
    updateWordList() {
        const list = document.getElementById('wordList');
        list.innerHTML = '';
        this.words.forEach((word, i) => {
            const li = document.createElement('li');
            li.className = this.foundWords[i] ? 'guessed' : '';
            li.innerHTML = '<span class="wl-num">' + (i + 1) + '</span><span class="wl-word">' + word + '</span>';
            list.appendChild(li);
        });
    }

    // ── Input Switching ─────────────────────────────────────
    switchInputArea(mode) {
        document.getElementById('clueInputArea').classList.add('hidden');
        document.getElementById('guessInputArea').classList.add('hidden');
        document.getElementById('waitingArea').classList.add('hidden');

        if (mode === 'clue') {
            document.getElementById('clueInputArea').classList.remove('hidden');
            const input = document.getElementById('clueInput');
            const countInput = document.getElementById('clueCountInput');
            input.value = '';
            input.disabled = false;
            if (countInput) countInput.disabled = false;
            document.getElementById('btnGiveClue').disabled = false;
            document.getElementById('clueError').classList.add('hidden');
            input.focus();
        } else if (mode === 'guess') {
            document.getElementById('guessInputArea').classList.remove('hidden');
            const input = document.getElementById('guessInput');
            input.value = '';
            input.disabled = false;
            document.getElementById('btnMakeGuess').disabled = false;
            document.getElementById('btnPassTurn').disabled = false;
            document.getElementById('guessError').classList.add('hidden');
            input.focus();
        } else {
            document.getElementById('waitingArea').classList.remove('hidden');
        }
    }

    // ── Give Clue ───────────────────────────────────────────
    giveClue() {
        const input = document.getElementById('clueInput');
        const clue = input.value.trim().toLowerCase();
        const errorEl = document.getElementById('clueError');
        const countInput = document.getElementById('clueCountInput');
        const count = parseInt(countInput ? countInput.value : 1) || 1;
        errorEl.classList.add('hidden');

        if (!clue) return;

        if (clue.includes(' ')) {
            errorEl.textContent = 'Clue must be exactly one word.';
            errorEl.classList.remove('hidden');
            return;
        }

        // Check if clue is one of the unguessed words
        for (let i = 0; i < this.words.length; i++) {
            if (!this.foundWords[i] && clue === this.words[i].toLowerCase()) {
                errorEl.textContent = 'Clue cannot be one of the words!';
                errorEl.classList.remove('hidden');
                return;
            }
        }

        if (!this.socket || !this.socket.connected) {
            errorEl.textContent = 'Disconnected. Please refresh.';
            errorEl.classList.remove('hidden');
            return;
        }

        input.disabled = true;
        if (countInput) countInput.disabled = true;
        document.getElementById('btnGiveClue').disabled = true;
        this.socket.emit('clue:giveClue', { clue, count });

        this._clueTimeout = setTimeout(() => {
            this.switchInputArea('clue');
            errorEl.textContent = 'No response. Try again.';
            errorEl.classList.remove('hidden');
        }, 5000);
    }

    // ── Make Guess ──────────────────────────────────────────
    makeGuess() {
        const input = document.getElementById('guessInput');
        const guess = input.value.trim().toLowerCase();
        const errorEl = document.getElementById('guessError');
        errorEl.classList.add('hidden');

        if (!guess) return;

        if (!this.socket || !this.socket.connected) {
            errorEl.textContent = 'Disconnected. Please refresh.';
            errorEl.classList.remove('hidden');
            return;
        }

        input.disabled = true;
        document.getElementById('btnMakeGuess').disabled = true;
        document.getElementById('btnPassTurn').disabled = true;
        this.socket.emit('clue:makeGuess', { guess });

        this._guessTimeout = setTimeout(() => {
            this.switchInputArea('guess');
            errorEl.textContent = 'No response. Try again.';
            errorEl.classList.remove('hidden');
        }, 5000);
    }

    // ── Pass Turn ───────────────────────────────────────────
    passTurn() {
        if (!this.socket || !this.socket.connected) return;
        this.socket.emit('clue:passTurn');
    }

    // ── Show Clue Display ───────────────────────────────────
    showCurrentClue(clue, count) {
        const display = document.getElementById('clueDisplay');
        document.getElementById('clueWord').textContent = clue.toUpperCase();
        const countEl = document.getElementById('clueCount');
        if (countEl) countEl.textContent = count;
        display.classList.remove('hidden');
    }

    // ── Update guess hint with remaining clue guesses ───────
    updateGuessHint() {
        const hint = document.getElementById('guessHint');
        if (hint) {
            hint.textContent = 'Guesses for this clue: ' + this.clueGuessesLeft + ' remaining';
        }
    }

    // ── History Entry ───────────────────────────────────────
    addHistoryEntry(entry) {
        const container = document.getElementById('guessHistory');
        const div = document.createElement('div');
        div.className = 'history-entry ' + (entry.correct ? 'correct' : 'wrong');
        div.innerHTML =
            '<div class="history-clue">Clue: <strong>' + entry.clue + '</strong></div>' +
            '<div class="history-guess ' + (entry.correct ? 'correct' : 'wrong') + '">Guess: <strong>' + entry.guess + '</strong>' +
            (entry.correct ? ' ✓' : ' ✗') +
            (entry.correct && entry.word ? ' — <em>' + entry.word.toUpperCase() + '</em>' : '') +
            '</div>';
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    // ── Result Flash ────────────────────────────────────────
    showResultFlash(correct) {
        const flash = document.getElementById('resultFlash');
        const text = document.getElementById('resultText');
        flash.className = 'result-flash ' + (correct ? 'correct' : 'wrong');
        text.textContent = correct ? 'CORRECT!' : 'WRONG!';
        flash.classList.remove('hidden');
        setTimeout(() => flash.classList.add('hidden'), 1000);
    }

    // ── Game Over ───────────────────────────────────────────
    showGameOver(data) {
        const title = document.getElementById('gameOverTitle');
        if (data.winner === 'guesser') {
            title.textContent = 'GUESSER WINS!';
            title.className = 'win';
        } else if (data.winner === 'disconnect') {
            title.textContent = 'PLAYER DISCONNECTED';
            title.className = 'lose';
        } else {
            title.textContent = 'WORDMASTER WINS!';
            title.className = 'lose';
        }

        document.getElementById('goWordsGuessed').textContent = data.wordsGuessed || 0;
        document.getElementById('goGuessesUsed').textContent = data.guessesUsed || 0;

        const revealList = document.getElementById('revealList');
        revealList.innerHTML = '';
        if (data.words) {
            data.words.forEach((word, i) => {
                const item = document.createElement('div');
                item.className = 'reveal-item';
                const found = data.foundWords && data.foundWords[i];
                const clues = (data.guessHistory || [])
                    .filter(h => h.word === word || (h.correct && h.word === word))
                    .map(h => h.clue)
                    .filter((v, idx, arr) => arr.indexOf(v) === idx)
                    .join(', ');

                item.innerHTML =
                    '<span class="reveal-num">' + (i + 1) + '</span>' +
                    '<span class="reveal-word">' + word + '</span>' +
                    '<span class="reveal-clues">' + (clues || '—') + '</span>' +
                    '<span class="reveal-status ' + (found ? 'found' : 'missed') + '">' + (found ? 'FOUND' : 'MISSED') + '</span>';
                revealList.appendChild(item);
            });
        }

        this.showScreen('gameOverScreen');
    }
}

new ZecruClues();
})();
