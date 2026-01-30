// Dots Survivor - Authentication & Save System
const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:3002'  // Local dev server
    : '';  // Same origin in production

class AuthManager {
    constructor() {
        this.user = null;
        // Check both game token and hub token
        this.token = localStorage.getItem('ds_token') || localStorage.getItem('auth_token');
        this.rememberToken = localStorage.getItem('ds_remember_token') || localStorage.getItem('remember_token');
        this.init();
    }

    async init() {
        // Try to restore session from existing token (hub or game token)
        if (this.token) {
            try {
                // Always verify token with server to get fresh user data
                const res = await this.apiGet('/api/auth/me');
                this.user = res;
                // Sync tokens to both storages
                localStorage.setItem('ds_token', this.token);
                localStorage.setItem('auth_token', this.token);
                localStorage.setItem('user_data', JSON.stringify(res));
                this.showStartMenu();
                this.setupEventListeners();
                return;
            } catch (e) {
                console.log('Token verification failed, trying remember token...');
                // Token expired, clear and try remember token
                this.token = null;
                localStorage.removeItem('ds_token');
                localStorage.removeItem('auth_token');
            }
        }

        // Try auto-login with remember token
        if (this.rememberToken) {
            try {
                const res = await this.apiPost('/api/auth/remember', {
                    rememberToken: this.rememberToken
                });
                this.token = res.token;
                this.user = res.user;
                // Sync to both storages
                localStorage.setItem('ds_token', res.token);
                localStorage.setItem('auth_token', res.token);
                localStorage.setItem('user_data', JSON.stringify(res.user));
                this.showStartMenu();
                this.setupEventListeners();
                return;
            } catch (e) {
                // Remember token expired/invalid
                this.clearSession();
            }
        }

        this.showAuthMenu();
        this.setupEventListeners();
    }

    getDeviceInfo() {
        const ua = navigator.userAgent;
        const isMobile = /Mobile|Android|iPhone|iPad/.test(ua);
        const browser = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)/)?.[1] || 'Unknown';
        return `${isMobile ? 'Mobile' : 'Desktop'} - ${browser}`;
    }

    setupEventListeners() {
        // Login form
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.login();
        });

        // Register form
        document.getElementById('register-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.register();
        });

        // Play as guest
        document.getElementById('play-guest-btn').addEventListener('click', () => {
            this.playAsGuest();
        });

        // Page navigation links
        document.getElementById('show-register')?.addEventListener('click', (e) => {
            e.preventDefault();
            showRegisterPage();
        });

        document.getElementById('show-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            showLoginPage();
        });

        // Leaderboard button
        document.getElementById('leaderboard-btn').addEventListener('click', () => {
            this.showLeaderboard();
        });

        // Leaderboard back button
        document.getElementById('lb-back-btn').addEventListener('click', () => {
            document.getElementById('leaderboard-menu').classList.add('hidden');
            document.getElementById('start-menu').classList.remove('hidden');
        });

        // Leaderboard tabs
        document.querySelectorAll('.lb-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.loadLeaderboard(tab.dataset.category);
            });
        });

        // Continue button
        document.getElementById('continue-btn')?.addEventListener('click', async () => {
            const btn = document.getElementById('continue-btn');
            btn.textContent = 'LOADING...';
            btn.disabled = true;

            try {
                const savedState = await this.loadSavedGame();
                if (savedState && typeof game !== 'undefined') {
                    // Delete saved game after loading
                    await this.deleteSavedGame();
                    this.user.savedGame = { exists: false };
                    // Start game with saved state
                    game.startGameWithState(savedState);
                } else {
                    // No saved state found - maybe it was deleted or never existed
                    console.error('No saved state found or game not ready');
                    document.getElementById('saved-game-notice').classList.add('hidden');
                    document.getElementById('start-btn').classList.remove('hidden');
                    this.user.savedGame = { exists: false };
                    // Update stored user data
                    localStorage.setItem('user_data', JSON.stringify(this.user));
                }
            } catch (e) {
                console.error('Failed to continue game:', e);
                // Reset UI on error
                document.getElementById('saved-game-notice').classList.add('hidden');
                document.getElementById('start-btn').classList.remove('hidden');
            }

            btn.textContent = 'CONTINUE';
            btn.disabled = false;
        });

        // New game button
        document.getElementById('new-game-btn')?.addEventListener('click', async () => {
            await this.deleteSavedGame();
            document.getElementById('saved-game-notice').classList.add('hidden');
            document.getElementById('start-btn').classList.remove('hidden');
        });
    }

    async login() {
        const login = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const rememberMe = document.getElementById('login-remember')?.checked || false;
        const errorEl = document.getElementById('login-error');

        try {
            errorEl.textContent = '';
            const res = await this.apiPost('/api/auth/login', { 
                login, 
                password, 
                rememberMe,
                deviceInfo: this.getDeviceInfo()
            });
            this.token = res.token;
            this.user = res.user;
            localStorage.setItem('ds_token', res.token);
            
            // Store remember token if provided
            if (res.rememberToken) {
                this.rememberToken = res.rememberToken;
                localStorage.setItem('ds_remember_token', res.rememberToken);
            }
            
            this.showStartMenu();
        } catch (e) {
            errorEl.textContent = e.message || 'Login failed';
        }
    }

    async register() {
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const errorEl = document.getElementById('register-error');

        try {
            errorEl.textContent = '';
            const res = await this.apiPost('/api/auth/register', { username, email, password });
            this.token = res.token;
            this.user = res.user;
            localStorage.setItem('ds_token', res.token);
            
            // Clear form
            document.getElementById('register-username').value = '';
            document.getElementById('register-email').value = '';
            document.getElementById('register-password').value = '';
            
            this.showStartMenu();
        } catch (e) {
            errorEl.textContent = e.message || 'Registration failed';
        }
    }

    playAsGuest() {
        this.user = null;
        this.token = null;
        this.showStartMenu();
    }

    clearSession() {
        this.user = null;
        this.token = null;
        this.rememberToken = null;
        localStorage.removeItem('ds_token');
        localStorage.removeItem('ds_remember_token');
    }

    logout() {
        this.apiPost('/api/auth/logout', { rememberToken: this.rememberToken }).catch(() => { });
        this.clearSession();
        this.showAuthMenu();
    }

    showAuthMenu() {
        document.getElementById('auth-menu').classList.remove('hidden');
        document.getElementById('register-menu').classList.add('hidden');
        document.getElementById('start-menu').classList.add('hidden');
    }

    showStartMenu() {
        document.getElementById('auth-menu').classList.add('hidden');
        document.getElementById('register-menu').classList.add('hidden');
        document.getElementById('start-menu').classList.remove('hidden');

        // Update user info
        const userInfoEl = document.getElementById('user-info');
        if (this.user) {
            userInfoEl.innerHTML = `
                <span style="color:#00ffaa;">👤 ${this.user.username}</span><br>
                <button onclick="authManager.logout()" style="background:none;border:none;color:#ff6666;cursor:pointer;font-size:0.8rem;">Logout</button>
            `;

            // Check for saved game
            if (this.user.savedGame?.exists) {
                document.getElementById('saved-game-notice').classList.remove('hidden');
                document.getElementById('start-btn').classList.add('hidden');
            } else {
                document.getElementById('saved-game-notice').classList.add('hidden');
                document.getElementById('start-btn').classList.remove('hidden');
            }
        } else {
            userInfoEl.innerHTML = `<span style="color:#888;">Playing as Guest</span>`;
            document.getElementById('saved-game-notice').classList.add('hidden');
            document.getElementById('start-btn').classList.remove('hidden');
        }
    }

    async showLeaderboard() {
        document.getElementById('start-menu').classList.add('hidden');
        document.getElementById('leaderboard-menu').classList.remove('hidden');
        this.loadLeaderboard('wave');
    }

    async loadLeaderboard(category) {
        const contentEl = document.getElementById('leaderboard-content');
        contentEl.innerHTML = '<div class="lb-loading">Loading...</div>';

        try {
            const res = await this.apiGet(`/api/leaderboard/${category}?limit=10`);

            if (res.entries.length === 0) {
                contentEl.innerHTML = '<div class="lb-empty">No entries yet. Be the first!</div>';
                return;
            }

            const categoryLabels = { wave: 'Waves', kills: 'Kills', score: 'Score' };

            let html = '<div class="lb-list">';
            res.entries.forEach(entry => {
                const medal = entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`;
                html += `
                    <div class="lb-entry ${this.user?.username === entry.username ? 'lb-me' : ''}">
                        <span class="lb-rank">${medal}</span>
                        <span class="lb-name">${entry.username}</span>
                        <span class="lb-value">${entry.value.toLocaleString()}</span>
                    </div>
                `;
            });
            html += '</div>';

            contentEl.innerHTML = html;
        } catch (e) {
            contentEl.innerHTML = '<div class="lb-error">Failed to load leaderboard</div>';
        }
    }

    async saveGame(gameState) {
        if (!this.user || !this.token) return false;

        try {
            await this.apiPost('/api/dots-survivor/save', { gameState });
            this.user.savedGame = { exists: true, savedAt: new Date() };
            return true;
        } catch (e) {
            console.error('Failed to save game:', e);
            return false;
        }
    }

    async loadSavedGame() {
        if (!this.user || !this.token) return null;

        try {
            const res = await this.apiGet('/api/dots-survivor/load');
            return res.gameState;
        } catch (e) {
            console.error('Failed to load game:', e);
            return null;
        }
    }

    async deleteSavedGame() {
        if (!this.user || !this.token) return;

        try {
            await this.apiDelete('/api/dots-survivor/save');
            this.user.savedGame = { exists: false };
        } catch (e) {
            console.error('Failed to delete save:', e);
        }
    }

    async submitScore(score, wave, kills, timePlayed) {
        if (!this.user || !this.token) return null;

        try {
            const res = await this.apiPost('/api/dots-survivor/submit-score', { score, wave, kills, timePlayed });
            this.user.stats = res.stats;
            return res;
        } catch (e) {
            console.error('Failed to submit score:', e);
            return null;
        }
    }

    // API helpers
    async apiGet(url) {
        const res = await fetch(API_BASE + url, {
            headers: this.token ? { 'Authorization': `Bearer ${this.token}` } : {}
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Request failed');
        return data;
    }

    async apiPost(url, body) {
        const res = await fetch(API_BASE + url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {})
            },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Request failed');
        return data;
    }

    async apiDelete(url) {
        const res = await fetch(API_BASE + url, {
            method: 'DELETE',
            headers: this.token ? { 'Authorization': `Bearer ${this.token}` } : {}
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Request failed');
        return data;
    }
}

// Page switching between login and register
function showLoginPage() {
    document.getElementById('auth-menu').classList.remove('hidden');
    document.getElementById('register-menu').classList.add('hidden');
}

function showRegisterPage() {
    document.getElementById('auth-menu').classList.add('hidden');
    document.getElementById('register-menu').classList.remove('hidden');
}

// Initialize auth manager
const authManager = new AuthManager();
