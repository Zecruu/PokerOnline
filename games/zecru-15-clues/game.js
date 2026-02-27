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

        // Game
        document.getElementById('btnGiveClue').addEventListener('click', () => this.giveClue());
        document.getElementById('btnMakeGuess').addEventListener('click', () => this.makeGuess());
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
            this.role = data.role;
            this.currentWordIndex = 0;
            this.guessesRemaining = 15;
            this.guessHistory = [];
            this.currentClue = null;
            this.words = [];

            if (this.role === 'wordmaster') {
                document.getElementById('wordmasterSetup').classList.remove('hidden');
                document.getElementById('guesserWaiting').classList.add('hidden');
                this.buildWordInputs();
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
            setTimeout(() => {
                this.showGameOver(data);
            }, 1800);
        });

        this.socket.on('clue:error', (data) => {
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

    // ── Word Selection ───────────────────────────────────────
    buildWordInputs() {
        const container = document.getElementById('wordInputList');
        container.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            const row = document.createElement('div');
            row.className = 'word-input-row';
            row.innerHTML =
                '<span class="word-num">' + (i + 1) + '</span>' +
                '<input type="text" id="wordInput' + i + '" class="word-input" placeholder="Word ' + (i + 1) + '" maxlength="30" autocomplete="off">';
            container.appendChild(row);
        }
        // Enter advances to next input
        for (let i = 0; i < 10; i++) {
            document.getElementById('wordInput' + i).addEventListener('keydown', (e) => {
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
        document.getElementById('wordInput0').focus();
    }

    submitWords() {
        const words = [];
        const errorEl = document.getElementById('wordError');
        errorEl.classList.add('hidden');

        for (let i = 0; i < 10; i++) {
            const val = document.getElementById('wordInput' + i).value.trim().toLowerCase();
            if (!val) {
                errorEl.textContent = 'Word ' + (i + 1) + ' is empty.';
                errorEl.classList.remove('hidden');
                document.getElementById('wordInput' + i).focus();
                return;
            }
            if (val.includes(' ')) {
                errorEl.textContent = 'Word ' + (i + 1) + ' must be a single word.';
                errorEl.classList.remove('hidden');
                document.getElementById('wordInput' + i).focus();
                return;
            }
            if (words.includes(val)) {
                errorEl.textContent = 'Word ' + (i + 1) + ' is a duplicate.';
                errorEl.classList.remove('hidden');
                document.getElementById('wordInput' + i).focus();
                return;
            }
            words.push(val);
        }

        this.words = words;
        this.socket.emit('clue:submitWords', { words });
    }

    // ── Game Screen Setup ────────────────────────────────────
    setupGameScreen() {
        // Reset HUD
        this.updateGameHUD();

        // Role badge
        const badge = document.getElementById('hudRole');
        badge.textContent = this.role === 'wordmaster' ? 'WORDMASTER' : 'GUESSER';
        badge.className = 'role-badge ' + this.role;

        // Clear history
        document.getElementById('guessHistory').innerHTML = '';
        document.getElementById('clueDisplay').classList.add('hidden');

        // Wordmaster sidebar
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
            input.focus();
        } else if (mode === 'guess') {
            document.getElementById('guessInputArea').classList.remove('hidden');
            const input = document.getElementById('guessInput');
            input.value = '';
            input.disabled = false;
            document.getElementById('btnMakeGuess').disabled = false;
            document.getElementById('guessError').classList.add('hidden');
            input.focus();
        } else {
            document.getElementById('waitingArea').classList.remove('hidden');
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

        input.disabled = true;
        document.getElementById('btnGiveClue').disabled = true;
        this.socket.emit('clue:giveClue', { clue });
    }

    // ── Make Guess ───────────────────────────────────────────
    makeGuess() {
        const input = document.getElementById('guessInput');
        const guess = input.value.trim().toLowerCase();
        const errorEl = document.getElementById('guessError');
        errorEl.classList.add('hidden');

        if (!guess) return;

        input.disabled = true;
        document.getElementById('btnMakeGuess').disabled = true;
        this.socket.emit('clue:makeGuess', { guess });
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
