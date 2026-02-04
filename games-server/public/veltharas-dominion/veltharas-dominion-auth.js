// Velthara's Dominion - Authentication & Save System
// VERSION: 2024-02-03-v1 (Score submit fix + Aura fire visual)

const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:3002'  // Local dev server
    : 'https://www.zecrugames.com';  // Main API server in production

class AuthManager {
    constructor() {
        this.user = null;

        // PRIORITY 0: Check for tokens passed via URL (cross-domain from hub)
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('auth_token');
        const urlRememberToken = urlParams.get('remember_token');
        const urlUserData = urlParams.get('user_data');

        if (urlToken) {
            // Store tokens from URL to localStorage
            localStorage.setItem('auth_token', urlToken);
            localStorage.setItem('ds_token', urlToken);

            if (urlRememberToken) {
                localStorage.setItem('remember_token', urlRememberToken);
                localStorage.setItem('ds_remember_token', urlRememberToken);
            }

            if (urlUserData) {
                try {
                    const userData = JSON.parse(decodeURIComponent(urlUserData));
                    localStorage.setItem('user_data', JSON.stringify(userData));
                } catch (e) {
                }
            }

            // Clean URL to remove tokens (security)
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }

        // Check both game token and hub token
        this.token = localStorage.getItem('ds_token') || localStorage.getItem('auth_token');
        this.rememberToken = localStorage.getItem('ds_remember_token') || localStorage.getItem('remember_token');
        this.init();
    }

    async init() {
        // Check for purchase callback from Stripe
        this.handlePurchaseCallback();
        // PRIORITY 1: Check if user is logged in via the game hub
        // If hub has user_data and auth_token, trust it and skip login entirely
        const hubToken = localStorage.getItem('auth_token');
        const hubUserData = localStorage.getItem('user_data');

        if (hubToken && hubUserData) {
            try {
                this.user = JSON.parse(hubUserData);
                this.token = hubToken;
                // Sync to game storage
                localStorage.setItem('ds_token', hubToken);

                // Try to refresh user data from server (for saved game status)
                // But don't fail if server is unavailable
                try {
                    const res = await this.apiGet('/api/auth/me');
                    this.user = res;
                    localStorage.setItem('user_data', JSON.stringify(res));
                } catch (e) {
                }

                this.showStartMenu();
                this.setupEventListeners();
                return;
            } catch (e) {
            }
        }

        // PRIORITY 2: Try game's own token
        if (this.token && !hubToken) {
            try {
                const res = await this.apiGet('/api/auth/me');
                this.user = res;
                localStorage.setItem('user_data', JSON.stringify(res));
                this.showStartMenu();
                this.setupEventListeners();
                return;
            } catch (e) {
                this.token = null;
                localStorage.removeItem('ds_token');
            }
        }

        // PRIORITY 3: Try auto-login with remember token
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

        // No valid login found - show auth menu
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

        // Store button
        document.getElementById('store-btn')?.addEventListener('click', () => {
            this.showStore();
        });

        // Store back button
        document.getElementById('store-back-btn')?.addEventListener('click', () => {
            document.getElementById('store-menu').classList.add('hidden');
            document.getElementById('start-menu').classList.remove('hidden');
        });

        // Store tabs
        document.querySelectorAll('.store-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.store-tab').forEach(t => {
                    t.classList.remove('active');
                    t.style.background = '#33333366';
                    t.style.borderColor = '#444';
                    t.style.color = '#888';
                });
                tab.classList.add('active');
                tab.style.background = '#fbbf2433';
                tab.style.borderColor = '#fbbf24';
                tab.style.color = '#fbbf24';
                this.populateStoreItems(tab.dataset.category);
            });
        });

        // Customize button
        document.getElementById('customize-btn')?.addEventListener('click', () => {
            this.showCustomize();
        });

        // Customize back button
        document.getElementById('customize-back-btn')?.addEventListener('click', () => {
            document.getElementById('customize-menu').classList.add('hidden');
            document.getElementById('start-menu').classList.remove('hidden');
        });

        // Customize tabs
        document.querySelectorAll('.customize-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.customize-tab').forEach(t => {
                    t.classList.remove('active');
                    t.style.background = '#33333366';
                    t.style.borderColor = '#444';
                    t.style.color = '#888';
                });
                tab.classList.add('active');
                tab.style.background = '#a855f733';
                tab.style.borderColor = '#a855f7';
                tab.style.color = '#a855f7';
                this.populateCustomizeItems(tab.dataset.category);
            });
        });

        // Check for Stripe purchase success (redirect from checkout)
        this.checkPurchaseSuccess();

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
                    document.getElementById('saved-game-notice').classList.add('hidden');
                    document.getElementById('start-btn').classList.remove('hidden');
                    this.user.savedGame = { exists: false };
                    // Update stored user data
                    localStorage.setItem('user_data', JSON.stringify(this.user));
                }
            } catch (e) {
                // Reset UI on error
                document.getElementById('saved-game-notice').classList.add('hidden');
                document.getElementById('start-btn').classList.remove('hidden');
            }

            btn.textContent = 'CONTINUE';
            btn.disabled = false;
        });

        // New game button - delete save and go straight to character select
        document.getElementById('new-game-btn')?.addEventListener('click', async () => {
            // Try to delete save but don't block game start if it fails
            try {
                await this.deleteSavedGame();
            } catch (e) {
            }

            // Clear local saved game state regardless of API result
            if (this.user) {
                this.user.savedGame = { exists: false };
                localStorage.setItem('user_data', JSON.stringify(this.user));
            }

            // Hide saved game notice
            document.getElementById('saved-game-notice')?.classList.add('hidden');

            // Go directly to character select
            if (typeof game !== 'undefined') {
                game.showCharacterSelect();
            }
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

    // Check if current user is an admin (unlocks all cosmetics for free)
    isAdmin() {
        if (!this.user) return false;
        // The game hub uses isAdmin boolean field
        return this.user.isAdmin === true;
    }

    // Check if current user is a tester (gets free access)
    isTester() {
        if (!this.user) return false;
        return this.user.isTester === true;
    }

    // Check if user owns the game
    async checkGameOwnership() {
        // Admins and testers always have access
        if (this.isAdmin() || this.isTester()) {
            return { ownsGame: true, reason: this.isAdmin() ? 'admin' : 'tester' };
        }

        // Check with server
        try {
            const res = await this.apiGet('/api/games/check-ownership/veltharas-dominion');
            return res;
        } catch (e) {
            // If server is down, check local library cache
            if (this.user?.library?.some(g => g.gameId === 'veltharas-dominion')) {
                return { ownsGame: true, reason: 'purchased' };
            }
            return { ownsGame: false, reason: 'error' };
        }
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

        // Play menu music
        if (window.game) window.game.playMenuMusic();
    }

    async showStartMenu() {
        document.getElementById('auth-menu').classList.add('hidden');
        document.getElementById('register-menu').classList.add('hidden');
        document.getElementById('start-menu').classList.remove('hidden');

        // Play menu music
        if (window.game) window.game.playMenuMusic();

        // Update user info
        const userInfoEl = document.getElementById('user-info');

        // Check game ownership first
        const ownership = await this.checkGameOwnership();

        if (!ownership.ownsGame) {
            // User doesn't own the game - show purchase prompt
            userInfoEl.innerHTML = this.user
                ? `<span style="color:#00ffaa;">👤 ${this.user.username}</span><br>
                   <button onclick="authManager.logout()" style="background:none;border:none;color:#ff6666;cursor:pointer;font-size:0.8rem;">Logout</button>`
                : `<span style="color:#888;">Not logged in</span>`;

            document.getElementById('saved-game-notice').classList.add('hidden');
            document.getElementById('start-btn').classList.add('hidden');

            // Show purchase required message
            this.showPurchaseRequired();
            return;
        }

        if (this.user) {
            let badge = '';
            if (ownership.reason === 'admin') badge = ' <span style="color:#ffd700;">👑</span>';
            else if (ownership.reason === 'tester') badge = ' <span style="color:#00aaff;">🧪</span>';

            userInfoEl.innerHTML = `
                <span style="color:#00ffaa;">👤 ${this.user.username}${badge}</span><br>
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
            // Guest with ownership (shouldn't happen normally, but handle it)
            userInfoEl.innerHTML = `<span style="color:#888;">Playing as Guest</span>`;
            document.getElementById('saved-game-notice').classList.add('hidden');
            document.getElementById('start-btn').classList.remove('hidden');
        }
    }

    // Show purchase required overlay
    showPurchaseRequired() {
        // Hide game buttons
        document.getElementById('start-btn')?.classList.add('hidden');
        document.getElementById('continue-btn')?.classList.add('hidden');

        // Create or update purchase overlay
        let overlay = document.getElementById('purchase-required-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'purchase-required-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.9);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                text-align: center;
                padding: 2rem;
            `;
            document.body.appendChild(overlay);
        }

        overlay.innerHTML = `
            <div style="max-width: 500px;">
                <h1 style="color: #ff6b6b; font-size: 2.5rem; margin-bottom: 1rem;">🔒 Game Not Owned</h1>
                <p style="color: #ccc; font-size: 1.2rem; margin-bottom: 2rem;">
                    You need to purchase <strong style="color: #fbbf24;">Velthara's Dominion</strong> to play.
                </p>
                <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                    <a href="https://www.zecrugames.com/store" style="
                        display: inline-block;
                        padding: 1rem 2rem;
                        background: linear-gradient(135deg, #fbbf24, #f59e0b);
                        color: #000;
                        text-decoration: none;
                        border-radius: 12px;
                        font-weight: bold;
                        font-size: 1.1rem;
                    ">🛒 Buy Now — $5</a>
                    <a href="https://www.zecrugames.com" style="
                        display: inline-block;
                        padding: 1rem 2rem;
                        background: #333;
                        color: #fff;
                        text-decoration: none;
                        border-radius: 12px;
                        font-weight: bold;
                        font-size: 1.1rem;
                    ">← Back to Hub</a>
                </div>
                ${this.user ? '' : `
                    <p style="color: #888; margin-top: 2rem; font-size: 0.9rem;">
                        Already purchased? <a href="https://www.zecrugames.com/login" style="color: #00aaff;">Login</a> to access your game.
                    </p>
                `}
            </div>
        `;
        overlay.classList.remove('hidden');
    }

    // Handle Stripe purchase callback
    async handlePurchaseCallback() {
        const params = new URLSearchParams(window.location.search);

        if (params.get('purchase_success') === '1') {
            const sessionId = params.get('session_id');

            // Clear URL params immediately
            window.history.replaceState({}, '', window.location.pathname);

            // Confirm purchase with server if we have session ID
            if (sessionId && this.token) {
                try {
                    const result = await this.apiPost('/api/games/confirm-purchase/veltharas-dominion', { sessionId });
                } catch (e) {
                    // Continue anyway - webhook might have handled it
                }
            }

            // Show success message after a short delay
            setTimeout(() => {
                this.showPurchaseSuccess();
            }, 500);
        } else if (params.get('purchase_cancelled') === '1') {
            // Clear URL params
            window.history.replaceState({}, '', window.location.pathname);

            // Show cancellation message
            setTimeout(() => {
                alert('Purchase cancelled. You can try again anytime!');
            }, 500);
        }
    }

    // Show purchase success modal
    async showPurchaseSuccess() {
        // Refresh user data to get updated library
        if (this.token) {
            try {
                const res = await this.apiGet('/api/auth/me');
                this.user = res;
                localStorage.setItem('user_data', JSON.stringify(res));

                // Show success and reload menu
                alert('🎉 Purchase successful! Welcome to Velthara\'s Dominion!');
                this.showStartMenu();
            } catch (e) {
                alert('🎉 Purchase successful! Please refresh the page to access the game.');
                window.location.reload();
            }
        } else {
            alert('🎉 Purchase successful! Please login to access your game.');
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

            const categoryLabels = { wave: 'Waves', kills: 'Kills' };

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

    // ============================================
    // CUSTOMIZATION SYSTEM
    // ============================================
    showCustomize() {
        document.getElementById('start-menu').classList.add('hidden');
        document.getElementById('customize-menu').classList.remove('hidden');

        // Populate with default category (skins)
        this.populateCustomizeItems('skins');
        this.updateCurrentlyEquipped();
    }

    populateCustomizeItems(category) {
        const grid = document.getElementById('customize-items-grid');
        const emptyMsg = document.getElementById('customize-empty');
        const store = typeof COSMETIC_STORE !== 'undefined' ? COSMETIC_STORE : null;

        if (!store || !store[category]) {
            grid.innerHTML = '';
            emptyMsg?.classList.remove('hidden');
            return;
        }

        const owned = this.getOwnedCosmetics();
        const equipped = this.getEquippedCosmetics();
        const isAdmin = this.isAdmin();

        // Filter to only owned items (or all items for admin)
        const items = store[category].filter(item => owned.includes(item.id) || isAdmin);

        if (items.length === 0) {
            grid.innerHTML = '';
            emptyMsg?.classList.remove('hidden');
            return;
        }

        emptyMsg?.classList.add('hidden');

        grid.innerHTML = items.map(item => {
            const isEquipped = equipped[category] === item.id;
            const isOwned = owned.includes(item.id);

            return `
                <div class="customize-item" data-id="${item.id}" data-category="${category}" style="
                    background: ${isEquipped ? '#a855f722' : '#1a1a2e'};
                    border: 2px solid ${isEquipped ? '#a855f7' : '#333'};
                    border-radius: 12px;
                    padding: 1rem;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                ">
                    <div style="font-size:2.5rem;margin-bottom:0.3rem;">${item.icon}</div>
                    <div style="font-weight:600;color:${isEquipped ? '#a855f7' : '#fff'};font-size:0.9rem;">${item.name}</div>
                    <div style="font-size:0.75rem;color:#888;margin:0.3rem 0;">${item.desc}</div>
                    ${!isOwned && isAdmin ? '<div style="font-size:0.7rem;color:#ffd700;">👑 Admin</div>' : ''}
                    <button class="customize-equip-btn" data-id="${item.id}" data-category="${category}" style="
                        margin-top:0.5rem;
                        padding:0.4rem 0.8rem;
                        background: ${isEquipped ? '#666' : 'linear-gradient(135deg, #a855f7, #6366f1)'};
                        border: none;
                        border-radius: 6px;
                        color: #fff;
                        font-weight: 600;
                        cursor: pointer;
                        font-family: inherit;
                        font-size: 0.8rem;
                    ">${isEquipped ? '✓ EQUIPPED' : 'EQUIP'}</button>
                </div>
            `;
        }).join('');

        // Add click handlers for equip buttons
        grid.querySelectorAll('.customize-equip-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const itemId = btn.dataset.id;
                const cat = btn.dataset.category;
                this.equipCosmetic(itemId, cat);
                this.populateCustomizeItems(cat);
                this.updateCurrentlyEquipped();
            });
        });
    }

    updateCurrentlyEquipped() {
        const container = document.getElementById('currently-equipped');
        const equipped = this.getEquippedCosmetics();
        const store = typeof COSMETIC_STORE !== 'undefined' ? COSMETIC_STORE : null;

        if (!store || Object.keys(equipped).length === 0) {
            container.innerHTML = '<span style="color:#666;">Nothing equipped</span>';
            return;
        }

        const equippedItems = [];
        Object.entries(equipped).forEach(([category, itemId]) => {
            const item = store[category]?.find(i => i.id === itemId);
            if (item) {
                equippedItems.push({ ...item, category });
            }
        });

        if (equippedItems.length === 0) {
            container.innerHTML = '<span style="color:#666;">Nothing equipped</span>';
            return;
        }

        container.innerHTML = equippedItems.map(item => `
            <div style="
                background:#a855f722;
                border:1px solid #a855f7;
                border-radius:8px;
                padding:0.5rem 0.8rem;
                display:flex;
                align-items:center;
                gap:0.5rem;
            ">
                <span style="font-size:1.2rem;">${item.icon}</span>
                <span style="color:#a855f7;font-size:0.85rem;font-weight:600;">${item.name}</span>
                <button class="unequip-btn" data-id="${item.id}" data-category="${item.category}" style="
                    background:none;
                    border:none;
                    color:#ff6666;
                    cursor:pointer;
                    font-size:1rem;
                    padding:0 0.3rem;
                ">✕</button>
            </div>
        `).join('');

        // Add unequip handlers
        container.querySelectorAll('.unequip-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const itemId = btn.dataset.id;
                const category = btn.dataset.category;
                this.equipCosmetic(itemId, category);

                // Refresh the active tab
                const activeTab = document.querySelector('.customize-tab.active');
                if (activeTab) {
                    this.populateCustomizeItems(activeTab.dataset.category);
                }
                this.updateCurrentlyEquipped();
            });
        });
    }

    // ============================================
    // COSMETIC STORE SYSTEM
    // ============================================
    showStore() {
        document.getElementById('start-menu').classList.add('hidden');
        document.getElementById('store-menu').classList.remove('hidden');

        // Populate with default category (skins)
        this.populateStoreItems('skins');
        this.updateOwnedCosmetics();
    }

    getOwnedCosmetics() {
        try {
            return JSON.parse(localStorage.getItem('owned_cosmetics') || '[]');
        } catch (e) {
            return [];
        }
    }

    setOwnedCosmetics(cosmetics) {
        localStorage.setItem('owned_cosmetics', JSON.stringify(cosmetics));
    }

    getEquippedCosmetics() {
        try {
            return JSON.parse(localStorage.getItem('equipped_cosmetics') || '{}');
        } catch (e) {
            return {};
        }
    }

    setEquippedCosmetics(equipped) {
        localStorage.setItem('equipped_cosmetics', JSON.stringify(equipped));
    }

    populateStoreItems(category) {
        const grid = document.getElementById('store-items-grid');
        const store = typeof COSMETIC_STORE !== 'undefined' ? COSMETIC_STORE : null;

        if (!store || !store[category]) {
            grid.innerHTML = '<p style="color:#888;">Store data not loaded</p>';
            return;
        }

        const items = store[category];
        const owned = this.getOwnedCosmetics();
        const equipped = this.getEquippedCosmetics();
        const isAdmin = this.isAdmin(); // Admins get everything free

        grid.innerHTML = items.map(item => {
            const isOwned = owned.includes(item.id);
            const isEquipped = equipped[category] === item.id;
            // Convert price to USD (cents / 100 = dollars)
            const usdPrice = (item.price / 100).toFixed(2);

            // Determine button to show
            let buttonHtml;
            if (isOwned) {
                // Already owned - show equip button
                buttonHtml = `<button class="store-equip-btn" data-id="${item.id}" data-category="${category}" style="
                    background: ${isEquipped ? '#fbbf24' : '#00ffaa'};
                    border: none;
                    color: #000;
                    padding: 0.4rem 1rem;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: bold;
                    font-family: inherit;
                ">${isEquipped ? '✓ EQUIPPED' : 'EQUIP'}</button>`;
            } else if (isAdmin) {
                // Admin - free unlock button
                buttonHtml = `<button class="store-admin-btn" data-id="${item.id}" data-category="${category}" style="
                    background: linear-gradient(135deg, #ffd700, #ff8c00);
                    border: none;
                    color: #000;
                    padding: 0.4rem 1rem;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: bold;
                    font-family: inherit;
                ">👑 FREE</button>`;
            } else {
                // Regular user - Stripe purchase button
                buttonHtml = `<button class="store-buy-btn" data-id="${item.id}" data-category="${category}" data-price="${usdPrice}" style="
                    background: linear-gradient(135deg, #635bff, #8b5cf6);
                    border: none;
                    color: #fff;
                    padding: 0.4rem 1rem;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: bold;
                    font-family: inherit;
                ">💳 $${usdPrice}</button>`;
            }

            return `
                <div class="store-item" data-id="${item.id}" data-category="${category}" style="
                    background: ${isOwned ? '#00ffaa22' : isAdmin ? '#ffd70011' : '#1a1a2e'};
                    border: 2px solid ${isOwned ? '#00ffaa' : isEquipped ? '#fbbf24' : isAdmin ? '#ffd700' : '#333'};
                    border-radius: 12px;
                    padding: 1rem;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                ">
                    <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">${item.icon}</div>
                    <div style="color: ${item.color === 'rainbow' ? '#ff66aa' : item.color || '#fff'}; font-weight: bold; margin-bottom: 0.3rem;">${item.name}</div>
                    <div style="color: #888; font-size: 0.8rem; margin-bottom: 0.5rem;">${item.desc}</div>
                    ${buttonHtml}
                </div>
            `;
        }).join('');

        // Add event listeners for admin free unlock buttons
        grid.querySelectorAll('.store-admin-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const cat = btn.dataset.category;
                this.adminUnlockCosmetic(id, cat);
            });
        });

        // Add event listeners for buy buttons (Stripe checkout)
        grid.querySelectorAll('.store-buy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const cat = btn.dataset.category;
                const price = btn.dataset.price;
                this.initStripeCheckout(id, cat, price);
            });
        });

        // Add event listeners for equip buttons
        grid.querySelectorAll('.store-equip-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const cat = btn.dataset.category;
                this.equipCosmetic(id, cat);
            });
        });
    }

    // Admin instant unlock (free)
    adminUnlockCosmetic(itemId, category) {
        this.handleSuccessfulPurchase(itemId, category);
        this.showStoreMessage('👑 Admin Unlock! Item added to your collection.', '#ffd700');
    }

    // Stripe Checkout - skeleton ready for API credentials
    async initStripeCheckout(itemId, category, price) {
        // Check if user is logged in
        if (!this.user) {
            this.showStoreMessage('⚠️ Please login to purchase', '#ff8844');
            return;
        }

        this.showStoreMessage('⏳ Connecting to payment...', '#635bff');

        try {
            // Create checkout session on games-server (same origin)
            const response = await fetch('/api/payments/create-checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {})
                },
                body: JSON.stringify({
                    itemId,
                    category,
                    price,
                    userId: this.user.id || this.user._id
                })
            });

            const data = await response.json();

            if (data.checkoutUrl) {
                // Redirect to Stripe Checkout
                window.location.href = data.checkoutUrl;
            } else if (data.error) {
                this.showStoreMessage(`❌ ${data.error}`, '#ff4466');
            }
        } catch (e) {
            // Stripe not configured yet - show placeholder message
            this.showStoreMessage('⚠️ Payments coming soon!', '#ff8844');
        }
    }

    // Called after successful Stripe payment (via webhook or redirect)
    handleSuccessfulPurchase(itemId, category) {
        // Add to owned cosmetics
        const owned = this.getOwnedCosmetics();
        if (!owned.includes(itemId)) {
            owned.push(itemId);
            this.setOwnedCosmetics(owned);
        }

        // Auto-equip newly purchased item
        this.equipCosmetic(itemId, category);

        // Refresh the store display
        this.populateStoreItems(category);
        this.updateOwnedCosmetics();

        this.showStoreMessage('✅ Purchase successful!', '#00ffaa');
    }

    // Check URL params for successful Stripe purchase (called on page load)
    checkPurchaseSuccess() {
        const params = new URLSearchParams(window.location.search);

        if (params.get('purchase_success') === '1') {
            const itemId = params.get('item');
            const category = params.get('category');

            if (itemId && category) {
                // Add to owned cosmetics
                this.handleSuccessfulPurchase(itemId, category);

                // Show success notification
                setTimeout(() => {
                    this.showStore();
                    this.showStoreMessage('🎉 Purchase Complete! Item added to your collection.', '#00ffaa');
                }, 500);
            }

            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        if (params.get('purchase_cancelled') === '1') {
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    equipCosmetic(itemId, category) {
        const equipped = this.getEquippedCosmetics();

        // If already equipped, unequip
        if (equipped[category] === itemId) {
            delete equipped[category];
            this.showStoreMessage('🔓 Unequipped!', '#888');
        } else {
            equipped[category] = itemId;
            this.showStoreMessage('✨ Equipped!', '#fbbf24');
        }

        this.setEquippedCosmetics(equipped);

        // Find active tab and refresh
        const activeTab = document.querySelector('.store-tab.active');
        if (activeTab) {
            this.populateStoreItems(activeTab.dataset.category);
        }
        this.updateOwnedCosmetics();
    }

    updateOwnedCosmetics() {
        const ownedEl = document.getElementById('owned-items');
        const owned = this.getOwnedCosmetics();
        const equipped = this.getEquippedCosmetics();
        const store = typeof COSMETIC_STORE !== 'undefined' ? COSMETIC_STORE : null;

        if (!store || owned.length === 0) {
            ownedEl.innerHTML = '<span style="color:#666;font-size:0.9rem;">No cosmetics owned yet</span>';
            return;
        }

        // Find all owned items from all categories
        const ownedItems = [];
        Object.entries(store).forEach(([category, items]) => {
            items.forEach(item => {
                if (owned.includes(item.id)) {
                    ownedItems.push({
                        ...item,
                        category,
                        isEquipped: equipped[category] === item.id
                    });
                }
            });
        });

        ownedEl.innerHTML = ownedItems.map(item => `
            <div style="
                background: ${item.isEquipped ? '#fbbf2433' : '#333'};
                border: 2px solid ${item.isEquipped ? '#fbbf24' : '#555'};
                border-radius: 8px;
                padding: 0.4rem 0.6rem;
                display: flex;
                align-items: center;
                gap: 0.3rem;
                font-size: 0.85rem;
            ">
                <span>${item.icon}</span>
                <span style="color: ${item.isEquipped ? '#fbbf24' : '#aaa'};">${item.name}</span>
                ${item.isEquipped ? '<span style="color:#00ffaa;">✓</span>' : ''}
            </div>
        `).join('');
    }

    showStoreMessage(text, color) {
        // Create or update a temporary message
        let msgEl = document.getElementById('store-message');
        if (!msgEl) {
            msgEl = document.createElement('div');
            msgEl.id = 'store-message';
            msgEl.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);padding:1rem 2rem;border-radius:12px;font-weight:bold;font-size:1.2rem;z-index:1000;pointer-events:none;transition:opacity 0.3s;';
            document.body.appendChild(msgEl);
        }

        msgEl.textContent = text;
        msgEl.style.background = '#1a1a2e';
        msgEl.style.border = `2px solid ${color}`;
        msgEl.style.color = color;
        msgEl.style.opacity = '1';

        setTimeout(() => {
            msgEl.style.opacity = '0';
        }, 1500);
    }

    async saveGame(gameState) {
        if (!this.user || !this.token) return false;

        try {
            await this.apiPost('/api/dots-survivor/save', { gameState });
            this.user.savedGame = { exists: true, savedAt: new Date() };
            return true;
        } catch (e) {
            // If token expired, try to refresh and retry
            if (e.message && e.message.toLowerCase().includes('token') && this.rememberToken) {
                try {
                    const res = await this.apiPost('/api/auth/remember', {
                        rememberToken: this.rememberToken
                    });
                    this.token = res.token;
                    this.user = res.user;
                    localStorage.setItem('ds_token', res.token);
                    localStorage.setItem('auth_token', res.token);
                    localStorage.setItem('user_data', JSON.stringify(res.user));

                    // Retry the save with new token
                    await this.apiPost('/api/dots-survivor/save', { gameState });
                    this.user.savedGame = { exists: true, savedAt: new Date() };
                    return true;
                } catch (refreshError) {
                }
            }
            return false;
        }
    }

    async loadSavedGame() {
        if (!this.user || !this.token) return null;

        try {
            const res = await this.apiGet('/api/dots-survivor/load');
            return res.gameState;
        } catch (e) {
            return null;
        }
    }

    async deleteSavedGame() {
        if (!this.user || !this.token) return;

        try {
            await this.apiDelete('/api/dots-survivor/save');
            this.user.savedGame = { exists: false };
        } catch (e) {
        }
    }

    async submitScore(score, wave, kills, timePlayed) {
        if (!this.user || !this.token) return null;

        try {
            const res = await this.apiPost('/api/dots-survivor/submit-score', { score, wave, kills, timePlayed });
            this.user.stats = res.stats;
            return res;
        } catch (e) {
            // If token expired, try to refresh and retry
            if (e.message && e.message.toLowerCase().includes('token') && this.rememberToken) {
                try {
                    const refreshRes = await this.apiPost('/api/auth/remember', {
                        rememberToken: this.rememberToken
                    });
                    this.token = refreshRes.token;
                    this.user = refreshRes.user;
                    localStorage.setItem('ds_token', refreshRes.token);
                    localStorage.setItem('auth_token', refreshRes.token);
                    localStorage.setItem('user_data', JSON.stringify(refreshRes.user));

                    // Retry the score submission with new token
                    const res = await this.apiPost('/api/dots-survivor/submit-score', { score, wave, kills, timePlayed });
                    this.user.stats = res.stats;
                    return res;
                } catch (refreshError) {
                }
            }
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
