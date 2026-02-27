(function() {
'use strict';

class ZecruClues {
    constructor() {
        // Connection state
        this.socket = null;
        this.roomCode = null;
        this.playerId = null;
        this.playerName = 'Player';
        this.isHost = false;

        // Game state
        this.role = null;           // 'wordmaster' | 'guesser'
        this.words = [];            // wordmaster only
        this.currentWordIndex = 0;
        this.guessesRemaining = 15;
        this.currentClue = null;
        this.guessHistory = [];
        this.hostRole = 'wordmaster';

        // Token system
        this.tokenPool = [];
        this.selectedTokens = [];
        this.guessedTokens = {};
        this.canGuess = false;

        this.loadPlayerName();
        this.setupEvents();
        this.showScreen('menuScreen');
    }

    // ── Screen Management ────────────────────────────────────
    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const el = document.getElementById(id);
        if (el) el.classList.add('active');
    }

    // ── Player Name ──────────────────────────────────────────
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

    // ── Event Listeners ──────────────────────────────────────
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

        // Word Selection
        document.getElementById('btnSubmitWords').addEventListener('click', () => this.submitWords());
        document.getElementById('btnAddCustomWord').addEventListener('click', () => this.addCustomWord());
        document.getElementById('customWordInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.addCustomWord();
        });

        // Game
        document.getElementById('btnGiveClue').addEventListener('click', () => this.giveClue());
        document.getElementById('clueInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.giveClue();
        });
        document.getElementById('btnMakeGuess').addEventListener('click', () => this.makeCustomGuess());
        document.getElementById('guessInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.makeCustomGuess();
        });

        // Game Over
        document.getElementById('btnPlayAgain').addEventListener('click', () => this.backToMenu());
        document.getElementById('btnMainMenu').addEventListener('click', () => this.backToMenu());
    }

    // ── Socket Connection ────────────────────────────────────
    connectSocket() {
        if (this.socket) return;

        const host = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
            ? 'http://localhost:3001'
            : (window.SOCKET_SERVER_URL || window.location.origin);

        this.socket = io(host, { transports: ['websocket', 'polling'], timeout: 10000 });

        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.playerId = this.socket.id;
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });

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
            if (this.currentScreen() === 'gameScreen' || this.currentScreen() === 'wordSelectScreen') {
                alert('The other player disconnected.');
                this.backToMenu();
            } else {
                this.updateLobbyUI(data.players);
                document.getElementById('btnStartGame').classList.add('hidden');
                document.getElementById('lobbyStatus').textContent = 'Waiting for another player...';
            }
        });

        // Game flow
        this.socket.on('clue:gameStarted', (data) => {
            console.log('[15 Clues] Game started, my role:', data.role);
            this.role = data.role;
            this.currentWordIndex = 0;
            this.guessesRemaining = 15;
            this.guessHistory = [];
            this.currentClue = null;
            this.words = [];
            this.tokenPool = data.tokenPool || [];
            this.selectedTokens = [];
            this.guessedTokens = {};
            this.canGuess = false;

            if (this.role === 'wordmaster') {
                document.getElementById('wordmasterSetup').classList.remove('hidden');
                document.getElementById('guesserWaiting').classList.add('hidden');
                this.buildTokenSelectGrid();
            } else {
                document.getElementById('wordmasterSetup').classList.add('hidden');
                document.getElementById('guesserWaiting').classList.remove('hidden');
            }
            this.showScreen('wordSelectScreen');
        });

        this.socket.on('clue:wordsReady', (data) => {
            if (data && data.words) this.words = data.words;
            this.showScreen('gameScreen');
            this.setupGameScreen();
        });

        this.socket.on('clue:clueGiven', (data) => {
            if (this._clueTimeout) { clearTimeout(this._clueTimeout); this._clueTimeout = null; }
            console.log('[15 Clues] Clue given:', data.clue, 'My role:', this.role);
            this.currentClue = data.clue;
            this.showCurrentClue(data.clue);

            if (this.role === 'guesser') {
                this.switchInputArea('guess');
            } else {
                this.switchInputArea('waiting');
                document.getElementById('waitingText').textContent = 'Waiting for Guesser to guess...';
            }
        });

        this.socket.on('clue:guessResult', (data) => {
            if (this._guessTimeout) { clearTimeout(this._guessTimeout); this._guessTimeout = null; }
            console.log('[15 Clues] Guess result:', data);
            this.currentWordIndex = data.currentWordIndex;
            this.guessesRemaining = data.guessesRemaining;
            this.currentClue = null;

            this.addHistoryEntry({
                wordNum: data.wordNum,
                clue: data.clue,
                guess: data.guess,
                correct: data.correct,
                word: data.word
            });

            // Mark the guessed token visually
            this.markTokenGuessed(data.guess, data.correct);

            this.showResultFlash(data.correct);
            this.updateGameHUD();
            if (this.role === 'wordmaster') this.updateWordList();

            // After flash, prepare next turn
            setTimeout(() => {
                if (data.gameOver) return;
                document.getElementById('clueDisplay').classList.add('hidden');

                if (this.role === 'wordmaster') {
                    this.switchInputArea('clue');
                    document.getElementById('currentWordHint').innerHTML =
                        'Word ' + (this.currentWordIndex + 1) + ': <strong>' + this.words[this.currentWordIndex] + '</strong>';
                } else {
                    this.switchInputArea('waiting');
                    document.getElementById('waitingText').textContent = 'Waiting for Wordmaster\'s clue...';
                }
            }, 1500);
        });

        this.socket.on('clue:gameOver', (data) => {
            if (this._guessTimeout) { clearTimeout(this._guessTimeout); this._guessTimeout = null; }
            if (this._clueTimeout) { clearTimeout(this._clueTimeout); this._clueTimeout = null; }
            setTimeout(() => {
                this.showGameOver(data);
            }, 1800);
        });

        this.socket.on('clue:error', (data) => {
            console.error('[15 Clues] Error:', data.msg);
            if (this._guessTimeout) { clearTimeout(this._guessTimeout); this._guessTimeout = null; }
            if (this._clueTimeout) { clearTimeout(this._clueTimeout); this._clueTimeout = null; }
            if (this.role === 'guesser') {
                this.canGuess = true;
                this.updateTokenClickability();
                const gi = document.getElementById('guessInput');
                if (gi) gi.disabled = false;
                const gb = document.getElementById('btnMakeGuess');
                if (gb) gb.disabled = false;
            } else if (this.role === 'wordmaster') {
                const input = document.getElementById('clueInput');
                if (input) { input.disabled = false; }
                const btn = document.getElementById('btnGiveClue');
                if (btn) { btn.disabled = false; }
            }
            alert(data.msg || 'An error occurred.');
        });
    }

    currentScreen() {
        const active = document.querySelector('.screen.active');
        return active ? active.id : null;
    }

    // ── Room Management ──────────────────────────────────────
    createRoom() {
        this.connectSocket();
        this.playerName = this.getPlayerName();
        this.socket.emit('clue:createRoom', { name: this.playerName });
    }

    joinRoom() {
        const code = document.getElementById('roomCodeInput').value.trim().toUpperCase();
        if (code.length < 4) {
            alert('Enter a valid room code.');
            return;
        }
        this.connectSocket();
        this.playerName = this.getPlayerName();
        this.socket.emit('clue:joinRoom', { code, name: this.playerName });
    }

    backToMenu() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.roomCode = null;
        this.isHost = false;
        this.role = null;
        this.words = [];
        this.guessHistory = [];
        this.currentClue = null;
        this.tokenPool = [];
        this.selectedTokens = [];
        this.guessedTokens = {};
        this.canGuess = false;
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

    // ── Role Selection ───────────────────────────────────────
    selectRole(role) {
        this.hostRole = role;
        document.getElementById('btnRoleWordmaster').classList.toggle('selected', role === 'wordmaster');
        document.getElementById('btnRoleGuesser').classList.toggle('selected', role === 'guesser');
    }

    startGame() {
        if (!this.isHost) return;
        this.socket.emit('clue:startGame', { hostRole: this.hostRole });
    }

    // ── Word Selection (Token Grid + Custom Input) ──────────
    buildTokenSelectGrid() {
        const container = document.getElementById('tokenSelectGrid');
        container.innerHTML = '';
        this.selectedTokens = [];

        this.tokenPool.forEach((token) => {
            const card = document.createElement('div');
            card.className = 'token-card';
            card.dataset.word = token.word;
            card.dataset.category = token.category;
            card.innerHTML =
                '<span class="token-word">' + token.word.charAt(0).toUpperCase() + token.word.slice(1) + '</span>' +
                '<span class="token-category">' + token.category + '</span>' +
                '<span class="select-num"></span>';
            card.addEventListener('click', () => this.toggleTokenSelection(token.word, card));
            container.appendChild(card);
        });

        this.updateSelectionCount();
    }

    toggleTokenSelection(word, card) {
        const idx = this.selectedTokens.indexOf(word);
        if (idx !== -1) {
            this.selectedTokens.splice(idx, 1);
            card.classList.remove('selected');
        } else {
            if (this.selectedTokens.length >= 10) return;
            this.selectedTokens.push(word);
            card.classList.add('selected');
        }
        this.updateSelectionNumbers();
        this.updateSelectionCount();
    }

    updateSelectionNumbers() {
        const container = document.getElementById('tokenSelectGrid');
        if (!container) return;
        container.querySelectorAll('.token-card').forEach(card => {
            const word = card.dataset.word;
            const idx = this.selectedTokens.indexOf(word);
            const numEl = card.querySelector('.select-num');
            if (idx !== -1) {
                card.classList.add('selected');
                numEl.textContent = idx + 1;
            } else {
                card.classList.remove('selected');
                numEl.textContent = '';
            }
        });
    }

    updateSelectionCount() {
        const count = this.selectedTokens.length;
        const countEl = document.getElementById('selectionCount');
        if (countEl) countEl.innerHTML = 'Selected: <strong>' + count + '</strong>/10';
        const btn = document.getElementById('btnSubmitWords');
        if (btn) {
            btn.textContent = 'Lock In Words (' + count + '/10)';
            btn.disabled = (count !== 10);
        }
        this.renderSelectedWords();
    }

    addCustomWord() {
        const input = document.getElementById('customWordInput');
        const word = input.value.trim().toLowerCase();
        const errorEl = document.getElementById('wordError');
        errorEl.classList.add('hidden');

        if (!word) return;
        if (word.includes(' ')) {
            errorEl.textContent = 'Must be a single word.';
            errorEl.classList.remove('hidden');
            return;
        }
        if (this.selectedTokens.length >= 10) {
            errorEl.textContent = 'Already selected 10 words.';
            errorEl.classList.remove('hidden');
            return;
        }
        if (this.selectedTokens.includes(word)) {
            errorEl.textContent = '"' + word + '" is already selected.';
            errorEl.classList.remove('hidden');
            return;
        }

        this.selectedTokens.push(word);
        input.value = '';
        this.updateSelectionNumbers();
        this.updateSelectionCount();
    }

    removeSelectedWord(word) {
        const idx = this.selectedTokens.indexOf(word);
        if (idx === -1) return;
        this.selectedTokens.splice(idx, 1);
        this.updateSelectionNumbers();
        this.updateSelectionCount();
    }

    renderSelectedWords() {
        const container = document.getElementById('selectedWordsList');
        if (!container) return;
        container.innerHTML = '';
        if (this.selectedTokens.length === 0) return;

        this.selectedTokens.forEach((word, i) => {
            const tag = document.createElement('span');
            tag.className = 'selected-word-tag';
            const isToken = this.tokenPool.some(t => t.word === word);
            tag.innerHTML = '<span class="tag-num">' + (i + 1) + '</span> ' +
                word.charAt(0).toUpperCase() + word.slice(1) +
                (!isToken ? ' <span class="tag-custom">custom</span>' : '') +
                ' <span class="tag-remove" data-word="' + word + '">&times;</span>';
            container.appendChild(tag);
        });

        container.querySelectorAll('.tag-remove').forEach(btn => {
            btn.addEventListener('click', () => this.removeSelectedWord(btn.dataset.word));
        });
    }

    submitWords() {
        const errorEl = document.getElementById('wordError');
        errorEl.classList.add('hidden');

        if (this.selectedTokens.length !== 10) {
            errorEl.textContent = 'You must select exactly 10 tokens.';
            errorEl.classList.remove('hidden');
            return;
        }

        this.words = [...this.selectedTokens];
        this.socket.emit('clue:submitWords', { words: this.words });
    }

    // ── Game Screen Setup ────────────────────────────────────
    setupGameScreen() {
        this.updateGameHUD();

        const badge = document.getElementById('hudRole');
        badge.textContent = this.role === 'wordmaster' ? 'WORDMASTER' : 'GUESSER';
        badge.className = 'role-badge ' + this.role;

        document.getElementById('guessHistory').innerHTML = '';
        document.getElementById('clueDisplay').classList.add('hidden');

        // Build the 25-token game grid
        this.buildGameTokenGrid();

        if (this.role === 'wordmaster') {
            document.getElementById('wordListPanel').classList.remove('hidden');
            this.updateWordList();
            this.switchInputArea('clue');
            document.getElementById('currentWordHint').innerHTML =
                'Word 1: <strong>' + this.words[0] + '</strong>';
        } else {
            document.getElementById('wordListPanel').classList.add('hidden');
            this.switchInputArea('waiting');
            document.getElementById('waitingText').textContent = 'Waiting for Wordmaster\'s clue...';
        }
    }

    // ── Game HUD ─────────────────────────────────────────────
    updateGameHUD() {
        document.getElementById('hudWordNum').textContent = Math.min(this.currentWordIndex + 1, 10);
        document.getElementById('hudGuesses').textContent = this.guessesRemaining;

        // Color guesses warning
        const guessEl = document.getElementById('hudGuesses');
        if (this.guessesRemaining <= 3) {
            guessEl.style.color = '#ff4444';
        } else if (this.guessesRemaining <= 6) {
            guessEl.style.color = '#ffaa44';
        } else {
            guessEl.style.color = '#fff';
        }
    }

    // ── Word List (Wordmaster sidebar) ───────────────────────
    updateWordList() {
        const list = document.getElementById('wordList');
        list.innerHTML = '';
        this.words.forEach((word, i) => {
            const li = document.createElement('li');
            if (i < this.currentWordIndex) {
                li.className = 'guessed';
            } else if (i === this.currentWordIndex) {
                li.className = 'current';
            }
            li.innerHTML = '<span class="wl-num">' + (i + 1) + '</span><span class="wl-word">' + word + '</span>';
            list.appendChild(li);
        });
    }

    // ── Input Area Switching ─────────────────────────────────
    switchInputArea(mode) {
        document.getElementById('clueInputArea').classList.add('hidden');
        document.getElementById('guessInputArea').classList.add('hidden');
        document.getElementById('waitingArea').classList.add('hidden');

        if (mode === 'clue') {
            document.getElementById('clueInputArea').classList.remove('hidden');
            const input = document.getElementById('clueInput');
            input.value = '';
            input.disabled = false;
            document.getElementById('btnGiveClue').disabled = false;
            document.getElementById('clueError').classList.add('hidden');
            this.canGuess = false;
            input.focus();
        } else if (mode === 'guess') {
            document.getElementById('guessInputArea').classList.remove('hidden');
            document.getElementById('guessError').classList.add('hidden');
            const customInput = document.getElementById('guessInput');
            if (customInput) {
                customInput.value = '';
                customInput.disabled = false;
            }
            const customBtn = document.getElementById('btnMakeGuess');
            if (customBtn) customBtn.disabled = false;
            this.canGuess = true;
            this.updateTokenClickability();
        } else {
            document.getElementById('waitingArea').classList.remove('hidden');
            this.canGuess = false;
            this.updateTokenClickability();
        }
    }

    // ── Give Clue ────────────────────────────────────────────
    giveClue() {
        const input = document.getElementById('clueInput');
        const clue = input.value.trim().toLowerCase();
        const errorEl = document.getElementById('clueError');
        errorEl.classList.add('hidden');

        if (!clue) return;

        if (clue.includes(' ')) {
            errorEl.textContent = 'Clue must be exactly one word.';
            errorEl.classList.remove('hidden');
            return;
        }

        if (this.words[this.currentWordIndex] && clue === this.words[this.currentWordIndex].toLowerCase()) {
            errorEl.textContent = 'Clue cannot be the answer itself!';
            errorEl.classList.remove('hidden');
            return;
        }

        if (!this.socket || !this.socket.connected) {
            errorEl.textContent = 'Disconnected from server. Please refresh.';
            errorEl.classList.remove('hidden');
            return;
        }

        input.disabled = true;
        document.getElementById('btnGiveClue').disabled = true;
        console.log('[15 Clues] Sending clue:', clue);
        this.socket.emit('clue:giveClue', { clue });

        // Failsafe: re-enable input if no response in 5 seconds
        this._clueTimeout = setTimeout(() => {
            console.warn('[15 Clues] No response for clue, re-enabling input');
            this.switchInputArea('clue');
            errorEl.textContent = 'No response from server. Try again.';
            errorEl.classList.remove('hidden');
        }, 5000);
    }

    // ── Token Grid (Game Screen) ──────────────────────────────
    buildGameTokenGrid() {
        const container = document.getElementById('gameTokenGrid');
        container.innerHTML = '';

        this.tokenPool.forEach((token) => {
            const card = document.createElement('div');
            card.className = 'token-card';
            card.id = 'gameToken_' + token.word;
            card.dataset.word = token.word;
            card.dataset.category = token.category;
            card.innerHTML =
                '<span class="token-word">' + token.word.charAt(0).toUpperCase() + token.word.slice(1) + '</span>' +
                '<span class="token-category">' + token.category + '</span>';

            if (this.role === 'wordmaster' && this.words.includes(token.word)) {
                card.classList.add('my-word');
            }

            if (this.role === 'guesser') {
                card.addEventListener('click', () => this.clickGuessToken(token.word));
            }

            container.appendChild(card);
        });
    }

    clickGuessToken(word) {
        if (!this.canGuess) return;
        if (this.guessedTokens[word]) return;

        if (!this.socket || !this.socket.connected) {
            const errorEl = document.getElementById('guessError');
            errorEl.textContent = 'Disconnected from server. Please refresh.';
            errorEl.classList.remove('hidden');
            return;
        }

        this.canGuess = false;
        this.updateTokenClickability();
        console.log('[15 Clues] Sending guess:', word);
        this.socket.emit('clue:makeGuess', { guess: word });

        this._guessTimeout = setTimeout(() => {
            console.warn('[15 Clues] No response for guess, re-enabling');
            this.canGuess = true;
            this.updateTokenClickability();
            const errorEl = document.getElementById('guessError');
            errorEl.textContent = 'No response from server. Try again.';
            errorEl.classList.remove('hidden');
        }, 5000);
    }

    makeCustomGuess() {
        const input = document.getElementById('guessInput');
        if (!input) return;
        const guess = input.value.trim().toLowerCase();
        const errorEl = document.getElementById('guessError');
        errorEl.classList.add('hidden');

        if (!guess) return;
        if (guess.includes(' ')) {
            errorEl.textContent = 'Guess must be a single word.';
            errorEl.classList.remove('hidden');
            return;
        }

        if (!this.socket || !this.socket.connected) {
            errorEl.textContent = 'Disconnected from server. Please refresh.';
            errorEl.classList.remove('hidden');
            return;
        }

        this.canGuess = false;
        this.updateTokenClickability();
        input.disabled = true;
        const btn = document.getElementById('btnMakeGuess');
        if (btn) btn.disabled = true;
        console.log('[15 Clues] Sending custom guess:', guess);
        this.socket.emit('clue:makeGuess', { guess });

        this._guessTimeout = setTimeout(() => {
            console.warn('[15 Clues] No response for guess, re-enabling');
            this.canGuess = true;
            this.updateTokenClickability();
            if (input) input.disabled = false;
            if (btn) btn.disabled = false;
            errorEl.textContent = 'No response from server. Try again.';
            errorEl.classList.remove('hidden');
        }, 5000);
    }

    updateTokenClickability() {
        const container = document.getElementById('gameTokenGrid');
        if (!container) return;
        container.querySelectorAll('.token-card').forEach(card => {
            const word = card.dataset.word;
            if (this.guessedTokens[word]) {
                card.classList.remove('clickable');
                card.classList.add('disabled');
            } else if (this.canGuess && this.role === 'guesser') {
                card.classList.add('clickable');
                card.classList.remove('disabled');
            } else {
                card.classList.remove('clickable');
            }
        });
    }

    markTokenGuessed(word, correct) {
        this.guessedTokens[word] = correct ? 'correct' : 'wrong';
        const card = document.getElementById('gameToken_' + word);
        if (!card) return;
        card.classList.add(correct ? 'guessed-correct' : 'guessed-wrong');
        card.classList.add('disabled');
        card.classList.remove('clickable');
    }

    // ── Show Clue ────────────────────────────────────────────
    showCurrentClue(clue) {
        const display = document.getElementById('clueDisplay');
        document.getElementById('clueWord').textContent = clue.toUpperCase();
        display.classList.remove('hidden');
    }

    // ── History Entry ────────────────────────────────────────
    addHistoryEntry(entry) {
        const container = document.getElementById('guessHistory');
        const div = document.createElement('div');
        div.className = 'history-entry ' + (entry.correct ? 'correct' : 'wrong');
        div.innerHTML =
            '<div class="history-word-num">WORD ' + entry.wordNum + (entry.correct && entry.word ? ' — ' + entry.word.toUpperCase() : '') + '</div>' +
            '<div class="history-clue">Clue: <strong>' + entry.clue + '</strong></div>' +
            '<div class="history-guess ' + (entry.correct ? 'correct' : 'wrong') + '">Guess: <strong>' + entry.guess + '</strong>' +
            (entry.correct ? ' ✓' : ' ✗') + '</div>';
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    // ── Result Flash ─────────────────────────────────────────
    showResultFlash(correct) {
        const flash = document.getElementById('resultFlash');
        const text = document.getElementById('resultText');
        flash.className = 'result-flash ' + (correct ? 'correct' : 'wrong');
        text.textContent = correct ? 'CORRECT!' : 'WRONG!';
        flash.classList.remove('hidden');

        setTimeout(() => {
            flash.classList.add('hidden');
        }, 1200);
    }

    // ── Game Over ────────────────────────────────────────────
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

        // Word reveal
        const revealList = document.getElementById('revealList');
        revealList.innerHTML = '';
        if (data.words) {
            data.words.forEach((word, i) => {
                const item = document.createElement('div');
                item.className = 'reveal-item';

                // Find guesses for this word
                const entries = (data.guessHistory || []).filter(h => h.wordNum === i + 1);
                const found = entries.some(h => h.correct);
                const clueList = entries.map(h => h.clue).filter((v, idx, arr) => arr.indexOf(v) === idx).join(', ');

                item.innerHTML =
                    '<span class="reveal-num">' + (i + 1) + '</span>' +
                    '<span class="reveal-word">' + word + '</span>' +
                    '<span class="reveal-clues">' + (clueList || '—') + '</span>' +
                    '<span class="reveal-status ' + (found ? 'found' : 'missed') + '">' + (found ? 'FOUND' : 'MISSED') + '</span>';
                revealList.appendChild(item);
            });
        }

        this.showScreen('gameOverScreen');
    }
}

// Boot
new ZecruClues();

})();
