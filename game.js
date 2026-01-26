// Default game settings
const DEFAULT_SETTINGS = {
    startingChips: 1000,
    smallBlind: 10,
    bigBlind: 20,
    optionalBigBlind: false,
    turnTimeLimit: 30,
    allowBuyBack: true,
    maxBuyBacks: 3,
    buyBackAmount: 1000
};

// AI Trash Talk Messages
const AI_TAUNTS = {
    win: [
        "Thanks for the chips! 💰",
        "Is that all you got? 😏",
        "Too easy! Better luck next time!",
        "No chips left? What a shame! 🤭",
        "I'll take that, thank you very much!",
        "Yoink! My chips now! 😎",
        "Get good, kid! 🎯",
        "You call that poker? 🤣",
        "Maybe try Go Fish instead? 🐟",
        "GG EZ! No re! 🏆"
    ],
    bigWin: [
        "HUGE POT! Thanks for the donation! 💸",
        "CLEANING YOU OUT! 🧹💰",
        "That's gotta hurt! 😈",
        "Your chips look better with me! 💎",
        "DOMINATED! You never had a chance! 🔥"
    ],
    bluff: [
        "Scared money don't make money! 😤",
        "You're folding THAT? Interesting... 🤔",
        "Smart fold... or was it? 👀",
        "I might have had nothing... who knows? 😏"
    ],
    raise: [
        "Let's make this interesting! 📈",
        "Can you afford this? 💵",
        "Feeling lucky? 🍀",
        "Put your chips where your mouth is!",
        "Let's see what you're made of! 💪"
    ],
    allIn: [
        "ALL IN! You feeling brave? 🎲",
        "Go big or go home! 🚀",
        "THIS IS IT! Final stand! ⚔️",
        "NO FEAR! Show me what you got! 🔥"
    ],
    playerFolded: [
        "That's right, run away! 🏃",
        "Wise choice... or was it? 😈",
        "Another one bites the dust! 💀",
        "Chicken! 🐔"
    ],
    playerLowChips: [
        "Running low there, buddy! 😬",
        "Need a loan? Oh wait, I'm the house! 🏦",
        "Your stack is looking... sad 😢",
        "Might wanna hit that buy-back button! 💸"
    ]
};

// Aggressive AI Dealer
class AIDealer {
    constructor(name = "Dealer", chips = 1000) {
        this.name = name;
        this.chips = chips;
        this.isAI = true;
        this.aggressiveness = 0.75; // More aggressive!
        this.lastTaunt = '';
        this.onTaunt = null; // Callback for taunts
    }

    getRandomTaunt(category) {
        const taunts = AI_TAUNTS[category];
        if (!taunts || taunts.length === 0) return null;

        let taunt;
        do {
            taunt = taunts[Math.floor(Math.random() * taunts.length)];
        } while (taunt === this.lastTaunt && taunts.length > 1);

        this.lastTaunt = taunt;
        return taunt;
    }

    sendTaunt(category) {
        const taunt = this.getRandomTaunt(category);
        if (taunt && this.onTaunt) {
            this.onTaunt(taunt);
        }
        return taunt;
    }

    makeDecision(gameState, myCards, communityCards) {
        const { currentBet, pot, myBet, myChips } = gameState;

        const handStrength = this.evaluateHandStrength(myCards, communityCards);
        const callAmount = currentBet - myBet;
        const potOdds = pot > 0 ? callAmount / (pot + callAmount) : 0.3;
        const randomFactor = Math.random();
        const isAggressive = randomFactor < this.aggressiveness;

        // Bluff sometimes even with weak hands
        const bluffChance = Math.random();
        const shouldBluff = bluffChance < 0.25 && myChips > pot;

        // STRONG HAND (0.6+) - Be very aggressive
        if (handStrength >= 0.6) {
            // Big raise or all-in with monster hands
            if (handStrength >= 0.8) {
                const allInChance = Math.random();
                if (allInChance < 0.3) {
                    this.sendTaunt('allIn');
                    return { action: 'raise', amount: myChips + myBet }; // All-in
                }
            }

            // Raise big
            const raiseMultiplier = 0.5 + (handStrength * 0.5);
            const raiseAmount = Math.max(
                Math.floor(pot * raiseMultiplier),
                currentBet + gameState.bigBlind || 20
            );

            if (raiseAmount > currentBet && myChips > raiseAmount) {
                this.sendTaunt('raise');
                return { action: 'raise', amount: raiseAmount };
            }

            return { action: 'call' };
        }

        // MEDIUM HAND (0.35-0.6) - Play strategically
        if (handStrength >= 0.35) {
            if (callAmount === 0) {
                // Free to check, but often bet for value
                if (isAggressive || handStrength > 0.5) {
                    const betAmount = Math.floor(pot * 0.4) + (gameState.bigBlind || 20);
                    if (betAmount > 0 && myChips > betAmount) {
                        this.sendTaunt('raise');
                        return { action: 'raise', amount: Math.max(betAmount, currentBet + 20) };
                    }
                }
                return { action: 'check' };
            }

            // Facing a bet - call if pot odds are good
            if (handStrength > potOdds || isAggressive) {
                // Sometimes re-raise
                if (randomFactor < 0.3 && myChips > currentBet * 2) {
                    const reRaise = currentBet * 2;
                    this.sendTaunt('raise');
                    return { action: 'raise', amount: reRaise };
                }
                return { action: 'call' };
            }

            return { action: 'fold' };
        }

        // WEAK HAND (<0.35) - Bluff or fold
        if (callAmount === 0) {
            // Can check for free, but sometimes bluff
            if (shouldBluff && myChips > pot) {
                const bluffAmount = Math.floor(pot * 0.6);
                if (bluffAmount > 20) {
                    this.sendTaunt('raise');
                    return { action: 'raise', amount: bluffAmount };
                }
            }
            return { action: 'check' };
        }

        // Facing a bet with weak hand - mostly fold, occasionally call
        if (callAmount <= pot * 0.3 && randomFactor < 0.2) {
            return { action: 'call' }; // Occasionally call small bets
        }

        return { action: 'fold' };
    }

    evaluateHandStrength(myCards, communityCards) {
        if (!myCards || myCards.length === 0) return 0.3;

        if (communityCards.length < 3) {
            return this.evaluatePreFlop(myCards);
        }

        const allCards = [...myCards, ...communityCards];
        const hand = PokerHandEvaluator.evaluateHand(allCards);
        // Scale hand rank to 0-1 (ranks go from 1-10)
        return (hand.rank / 10) * 1.2; // Boost slightly for post-flop accuracy
    }

    evaluatePreFlop(cards) {
        if (cards.length < 2) return 0.3;

        const rank1 = PokerHandEvaluator.getRankValue(cards[0].rank);
        const rank2 = PokerHandEvaluator.getRankValue(cards[1].rank);
        const isPair = rank1 === rank2;
        const isSuited = cards[0].suit === cards[1].suit;
        const highCard = Math.max(rank1, rank2);
        const lowCard = Math.min(rank1, rank2);
        const gap = rank1 - rank2;

        let strength = 0;

        // Premium pairs (AA, KK, QQ, JJ)
        if (isPair) {
            if (highCard >= 11) strength = 0.85 + (highCard / 100);
            else if (highCard >= 8) strength = 0.65 + (highCard / 50);
            else strength = 0.5 + (highCard / 40);
        }
        // Premium hands (AK, AQ, KQ)
        else if (highCard === 14 && lowCard >= 12) {
            strength = isSuited ? 0.75 : 0.68;
        }
        // Good high cards
        else if (highCard >= 12 && lowCard >= 10) {
            strength = isSuited ? 0.55 : 0.48;
        }
        // Suited connectors
        else if (isSuited && Math.abs(gap) <= 2 && lowCard >= 6) {
            strength = 0.45 + (lowCard / 100);
        }
        // Ace with decent kicker
        else if (highCard === 14) {
            strength = isSuited ? 0.45 : 0.38;
        }
        // Other hands
        else {
            strength = (highCard + lowCard) / 35;
            if (isSuited) strength += 0.08;
            if (Math.abs(gap) <= 3) strength += 0.05;
        }

        return Math.min(strength, 0.95);
    }
}

class PokerGame {
    constructor(roomCode, playerName, isHost = false, settings = {}) {
        this.roomCode = roomCode;
        this.playerName = playerName;
        this.isHost = isHost;
        this.settings = { ...DEFAULT_SETTINGS, ...settings };

        this.players = [];
        this.deck = [];
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = 0;
        this.currentPlayerIndex = 0;
        this.gamePhase = 'waiting';
        this.smallBlind = this.settings.smallBlind;
        this.bigBlind = this.settings.bigBlind;
        this.dealerIndex = 0;
        this.playersActedThisRound = new Set();
        this.lastRaiserIndex = -1;

        // Timer
        this.turnTimer = null;
        this.turnTimeRemaining = 0;
        this.onTimerTick = null;

        // Callbacks
        this.onStateChange = null;
        this.onWinner = null;
        this.onShowdown = null;
        this.onChat = null; // Chat callback
        this.aiTimeout = null;

        // Card reveal tracking
        this.revealedCards = {};

        // Chat messages
        this.chatMessages = [];

        if (playerName) {
            this.initializePlayer(playerName, isHost);
        }
    }

    // Send a chat message
    sendChatMessage(playerId, message) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        const chatMessage = {
            id: Date.now(),
            playerId: playerId,
            playerName: player.name,
            message: message,
            isAI: player.isAI,
            timestamp: new Date().toLocaleTimeString()
        };

        this.chatMessages.push(chatMessage);

        // Keep only last 50 messages
        if (this.chatMessages.length > 50) {
            this.chatMessages.shift();
        }

        if (this.onChat) {
            this.onChat(chatMessage);
        }
    }

    // AI sends taunt message
    sendAITaunt(message) {
        const aiPlayer = this.players.find(p => p.isAI);
        if (!aiPlayer) return;

        const chatMessage = {
            id: Date.now(),
            playerId: aiPlayer.id,
            playerName: aiPlayer.name,
            message: message,
            isAI: true,
            isTaunt: true,
            timestamp: new Date().toLocaleTimeString()
        };

        this.chatMessages.push(chatMessage);

        if (this.onChat) {
            this.onChat(chatMessage);
        }
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.smallBlind = this.settings.smallBlind;
        this.bigBlind = this.settings.bigBlind;
    }

    initializePlayer(name, isHost) {
        const player = {
            id: this.generatePlayerId(),
            name: name,
            chips: this.settings.startingChips,
            bet: 0,
            cards: [],
            folded: false,
            isHost: isHost,
            isActive: false,
            isAI: false,
            buyBacksUsed: 0,
            isBankrupt: false
        };

        this.players.push(player);
        return player;
    }

    addPlayer(name) {
        if (this.players.length >= 8) {
            return { success: false, message: 'Room is full' };
        }
        const player = this.initializePlayer(name, false);
        return { success: true, player: player };
    }

    addAIPlayer(aiDealer) {
        if (this.players.length >= 8) {
            return { success: false, message: 'Room is full' };
        }

        const player = {
            id: this.generatePlayerId(),
            name: aiDealer.name,
            chips: this.settings.startingChips,
            bet: 0,
            cards: [],
            folded: false,
            isHost: false,
            isActive: false,
            isAI: true,
            aiInstance: aiDealer,
            buyBacksUsed: 0,
            isBankrupt: false
        };

        this.players.push(player);
        return { success: true, player: player };
    }

    buyBack(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return { success: false, message: 'Player not found' };

        if (!this.settings.allowBuyBack) {
            return { success: false, message: 'Buy-backs are not allowed' };
        }

        if (player.buyBacksUsed >= this.settings.maxBuyBacks) {
            return { success: false, message: `Maximum buy-backs (${this.settings.maxBuyBacks}) reached` };
        }

        if (player.chips > 0) {
            return { success: false, message: 'You still have chips' };
        }

        player.chips = this.settings.buyBackAmount;
        player.buyBacksUsed++;
        player.isBankrupt = false;

        return {
            success: true,
            message: `Bought back with $${this.settings.buyBackAmount}. Buy-backs remaining: ${this.settings.maxBuyBacks - player.buyBacksUsed}`
        };
    }

    removePlayer(playerId) {
        this.players = this.players.filter(p => p.id !== playerId);
    }

    generatePlayerId() {
        return 'player_' + Math.random().toString(36).substr(2, 9);
    }

    startGame() {
        // Check for valid players
        const activePlayers = this.players.filter(p => p.chips > 0);
        if (activePlayers.length < 2) {
            return { success: false, message: 'Need at least 2 players with chips' };
        }

        this.clearTimers();
        this.revealedCards = {};

        this.gamePhase = 'preflop';
        this.resetRound();
        this.dealHoleCards();
        this.postBlinds();
        this.setFirstPlayerToAct();

        this.notifyStateChange();
        this.startTurnTimer();
        this.scheduleAITurnIfNeeded();

        return { success: true };
    }

    clearTimers() {
        if (this.aiTimeout) {
            clearTimeout(this.aiTimeout);
            this.aiTimeout = null;
        }
        if (this.turnTimer) {
            clearInterval(this.turnTimer);
            this.turnTimer = null;
        }
    }

    startTurnTimer() {
        if (this.settings.turnTimeLimit <= 0) return;

        const currentPlayer = this.players[this.currentPlayerIndex];
        if (currentPlayer.isAI) return; // AI doesn't need timer

        this.turnTimeRemaining = this.settings.turnTimeLimit;

        if (this.turnTimer) clearInterval(this.turnTimer);

        this.turnTimer = setInterval(() => {
            this.turnTimeRemaining--;

            if (this.onTimerTick) {
                this.onTimerTick(this.turnTimeRemaining);
            }

            if (this.turnTimeRemaining <= 0) {
                clearInterval(this.turnTimer);
                this.turnTimer = null;

                // Auto-fold
                const player = this.players[this.currentPlayerIndex];
                if (player && player.isActive && !player.isAI) {
                    this.playerAction(player.id, 'fold');
                }
            }
        }, 1000);
    }

    setFirstPlayerToAct() {
        if (this.players.length === 2) {
            this.currentPlayerIndex = this.dealerIndex;
        } else {
            // With optional BB rule, player after BB can choose to play or fold
            if (this.settings.optionalBigBlind && this.players.length > 2) {
                this.currentPlayerIndex = (this.dealerIndex + 3) % this.players.length;
            } else {
                this.currentPlayerIndex = (this.dealerIndex + 3) % this.players.length;
            }
        }

        let attempts = 0;
        while ((this.players[this.currentPlayerIndex].folded ||
            this.players[this.currentPlayerIndex].chips <= 0) &&
            attempts < this.players.length) {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
            attempts++;
        }

        this.players.forEach(p => p.isActive = false);
        this.players[this.currentPlayerIndex].isActive = true;
    }

    resetRound() {
        this.deck = CardRenderer.shuffleDeck(CardRenderer.createDeck());
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = this.bigBlind;
        this.playersActedThisRound = new Set();
        this.lastRaiserIndex = -1;
        this.revealedCards = {};

        this.players.forEach(player => {
            player.bet = 0;
            player.cards = [];
            player.folded = player.chips <= 0; // Auto-fold if no chips
            player.isActive = false;
            if (player.chips <= 0) player.isBankrupt = true;
        });
    }

    dealHoleCards() {
        this.players.forEach(player => {
            if (!player.folded) {
                player.cards = [
                    this.deck.pop(),
                    this.deck.pop()
                ];
            }
        });
    }

    postBlinds() {
        let smallBlindIndex, bigBlindIndex;

        if (this.players.length === 2) {
            smallBlindIndex = this.dealerIndex;
            bigBlindIndex = (this.dealerIndex + 1) % this.players.length;
        } else {
            smallBlindIndex = (this.dealerIndex + 1) % this.players.length;
            bigBlindIndex = (this.dealerIndex + 2) % this.players.length;
        }

        // Small blind
        const sbPlayer = this.players[smallBlindIndex];
        const sbAmount = Math.min(this.smallBlind, sbPlayer.chips);
        sbPlayer.bet = sbAmount;
        sbPlayer.chips -= sbAmount;
        this.pot += sbAmount;

        // Big blind
        const bbPlayer = this.players[bigBlindIndex];
        const bbAmount = Math.min(this.bigBlind, bbPlayer.chips);
        bbPlayer.bet = bbAmount;
        bbPlayer.chips -= bbAmount;
        this.pot += bbAmount;
    }

    dealFlop() {
        this.deck.pop();
        this.communityCards.push(this.deck.pop());
        this.communityCards.push(this.deck.pop());
        this.communityCards.push(this.deck.pop());
        this.gamePhase = 'flop';
        this.startNewBettingRound();
    }

    dealTurn() {
        this.deck.pop();
        this.communityCards.push(this.deck.pop());
        this.gamePhase = 'turn';
        this.startNewBettingRound();
    }

    dealRiver() {
        this.deck.pop();
        this.communityCards.push(this.deck.pop());
        this.gamePhase = 'river';
        this.startNewBettingRound();
    }

    startNewBettingRound() {
        this.currentBet = 0;
        this.playersActedThisRound = new Set();
        this.lastRaiserIndex = -1;

        this.players.forEach(player => {
            player.bet = 0;
            player.isActive = false;
        });

        let startIndex = (this.dealerIndex + 1) % this.players.length;
        let attempts = 0;
        while ((this.players[startIndex].folded || this.players[startIndex].chips <= 0) &&
            attempts < this.players.length) {
            startIndex = (startIndex + 1) % this.players.length;
            attempts++;
        }

        this.currentPlayerIndex = startIndex;
        this.players[this.currentPlayerIndex].isActive = true;

        this.notifyStateChange();
        this.startTurnTimer();
        this.scheduleAITurnIfNeeded();
    }

    scheduleAITurnIfNeeded() {
        const currentPlayer = this.players[this.currentPlayerIndex];

        if (!currentPlayer || !currentPlayer.isAI || currentPlayer.folded) return;
        if (this.gamePhase === 'showdown' || this.gamePhase === 'waiting') return;

        if (this.aiTimeout) clearTimeout(this.aiTimeout);

        this.aiTimeout = setTimeout(() => {
            if (this.gamePhase === 'showdown' || this.gamePhase === 'waiting') return;

            const aiPlayer = this.players[this.currentPlayerIndex];
            if (!aiPlayer || !aiPlayer.isAI || !aiPlayer.isActive) return;

            const aiDealer = aiPlayer.aiInstance;
            const gameState = {
                currentBet: this.currentBet,
                pot: this.pot,
                myBet: aiPlayer.bet,
                myChips: aiPlayer.chips
            };

            const decision = aiDealer.makeDecision(
                gameState,
                aiPlayer.cards,
                this.communityCards
            );

            this.playerAction(aiPlayer.id, decision.action, decision.amount || 0);
        }, 2000);
    }

    playerAction(playerId, action, amount = 0) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || !player.isActive) {
            return { success: false, message: 'Not your turn' };
        }

        // Stop timer
        if (this.turnTimer) {
            clearInterval(this.turnTimer);
            this.turnTimer = null;
        }

        switch (action) {
            case 'fold':
                player.folded = true;
                break;

            case 'check':
                if (player.bet < this.currentBet) {
                    return { success: false, message: 'Cannot check, must call or fold' };
                }
                break;

            case 'call':
                const callAmount = Math.min(this.currentBet - player.bet, player.chips);
                player.chips -= callAmount;
                player.bet += callAmount;
                this.pot += callAmount;
                break;

            case 'raise':
                const raiseAmount = amount;
                if (raiseAmount <= this.currentBet) {
                    return { success: false, message: 'Raise must be higher than current bet' };
                }
                const totalAmount = Math.min(raiseAmount - player.bet, player.chips);
                player.chips -= totalAmount;
                player.bet += totalAmount;
                this.pot += totalAmount;
                this.currentBet = player.bet;
                this.lastRaiserIndex = this.currentPlayerIndex;
                this.playersActedThisRound = new Set([playerId]);
                break;
        }

        this.playersActedThisRound.add(playerId);
        player.isActive = false;

        const activePlayers = this.players.filter(p => !p.folded && p.chips >= 0);
        if (activePlayers.length === 1) {
            this.handleWinner(activePlayers[0], 'All others folded');
            return { success: true };
        }

        this.moveToNextPlayer();

        if (this.isBettingRoundComplete()) {
            this.advanceGamePhase();
        } else {
            this.notifyStateChange();
            this.startTurnTimer();
            this.scheduleAITurnIfNeeded();
        }

        return { success: true };
    }

    // Allow player to reveal their cards (for player vs player)
    revealCards(playerId, cardIndices) {
        // cardIndices can be [0], [1], [0, 1], or []
        this.revealedCards[playerId] = cardIndices;
        this.notifyStateChange();
    }

    moveToNextPlayer() {
        let nextIndex = (this.currentPlayerIndex + 1) % this.players.length;
        let attempts = 0;

        while ((this.players[nextIndex].folded || this.players[nextIndex].chips < 0) &&
            attempts < this.players.length) {
            nextIndex = (nextIndex + 1) % this.players.length;
            attempts++;
        }

        this.currentPlayerIndex = nextIndex;
        this.players[this.currentPlayerIndex].isActive = true;
    }

    isBettingRoundComplete() {
        const activePlayers = this.players.filter(p => !p.folded);

        if (activePlayers.length <= 1) return true;

        const allActed = activePlayers.every(p => this.playersActedThisRound.has(p.id));
        const betsEqual = activePlayers.every(p => p.bet === this.currentBet || p.chips === 0);

        return allActed && betsEqual;
    }

    advanceGamePhase() {
        const activePlayers = this.players.filter(p => !p.folded);

        if (activePlayers.length === 1) {
            this.handleWinner(activePlayers[0], 'All others folded');
            return;
        }

        switch (this.gamePhase) {
            case 'preflop':
                this.dealFlop();
                break;
            case 'flop':
                this.dealTurn();
                break;
            case 'turn':
                this.dealRiver();
                break;
            case 'river':
                this.showdown();
                break;
        }
    }

    handleWinner(winner, reason) {
        const winAmount = this.pot;
        winner.chips += winAmount;
        this.gamePhase = 'showdown';

        this.clearTimers();

        // AI taunt when winning
        if (winner.isAI && winner.aiInstance) {
            setTimeout(() => {
                const tauntCategory = winAmount > 100 ? 'bigWin' : 'win';
                const taunt = winner.aiInstance.getRandomTaunt(tauntCategory);
                if (taunt) {
                    this.sendAITaunt(taunt);
                }

                // Check if player is low on chips
                const humanPlayer = this.players.find(p => !p.isAI);
                if (humanPlayer && humanPlayer.chips < 200) {
                    setTimeout(() => {
                        const lowChipsTaunt = winner.aiInstance.getRandomTaunt('playerLowChips');
                        if (lowChipsTaunt) {
                            this.sendAITaunt(lowChipsTaunt);
                        }
                    }, 1500);
                }
            }, 500);
        }

        // AI taunt when player folds
        if (reason === 'All others folded') {
            const aiPlayer = this.players.find(p => p.isAI);
            if (aiPlayer && aiPlayer.aiInstance && winner.isAI) {
                setTimeout(() => {
                    const taunt = aiPlayer.aiInstance.getRandomTaunt('playerFolded');
                    if (taunt) {
                        this.sendAITaunt(taunt);
                    }
                }, 800);
            }
        }

        this.notifyStateChange();

        if (this.onWinner) {
            this.onWinner({
                winner: winner,
                reason: reason,
                winAmount: winAmount,
                hand: null,
                showdownData: null
            });
        }
    }

    showdown() {
        this.gamePhase = 'showdown';
        this.clearTimers();

        const activePlayers = this.players.filter(p => !p.folded);

        if (activePlayers.length === 1) {
            this.handleWinner(activePlayers[0], 'All others folded');
            return;
        }

        // Evaluate hands
        const hands = activePlayers.map(player => {
            const allCards = [...player.cards, ...this.communityCards];
            const hand = PokerHandEvaluator.evaluateHand(allCards);
            return {
                player,
                hand,
                cards: player.cards // Include cards for reveal
            };
        });

        hands.sort((a, b) => b.hand.rank - a.hand.rank);
        const winner = hands[0].player;
        const winAmount = this.pot;
        winner.chips += winAmount;

        // Auto-reveal AI cards
        hands.forEach(h => {
            if (h.player.isAI) {
                this.revealedCards[h.player.id] = [0, 1]; // Reveal both cards
            }
        });

        this.notifyStateChange();

        // Showdown data for UI
        const showdownData = {
            hands: hands.map(h => ({
                playerId: h.player.id,
                playerName: h.player.name,
                cards: h.cards,
                handName: h.hand.name,
                handRank: h.hand.rank,
                isWinner: h.player.id === winner.id,
                isAI: h.player.isAI
            }))
        };

        if (this.onShowdown) {
            this.onShowdown(showdownData);
        }

        if (this.onWinner) {
            this.onWinner({
                winner: winner,
                hand: hands[0].hand,
                winAmount: winAmount,
                showdownData: showdownData
            });
        }
    }

    notifyStateChange() {
        if (this.onStateChange) {
            this.onStateChange(this.getGameState());
        }
    }

    getGameState() {
        return {
            roomCode: this.roomCode,
            players: this.players.map(p => ({ ...p })),
            communityCards: [...this.communityCards],
            pot: this.pot,
            currentBet: this.currentBet,
            gamePhase: this.gamePhase,
            currentPlayerIndex: this.currentPlayerIndex,
            dealerIndex: this.dealerIndex,
            settings: this.settings,
            revealedCards: this.revealedCards,
            turnTimeRemaining: this.turnTimeRemaining
        };
    }

    startNextRound() {
        // Move dealer
        let nextDealer = (this.dealerIndex + 1) % this.players.length;
        let attempts = 0;
        while (this.players[nextDealer].chips <= 0 && attempts < this.players.length) {
            nextDealer = (nextDealer + 1) % this.players.length;
            attempts++;
        }
        this.dealerIndex = nextDealer;

        this.startGame();
    }
}

// Room Manager
class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.storageKey = 'poker_rooms';
        this.loadRooms();
    }

    generateRoomCode() {
        return Math.random().toString(36).substr(2, 6).toUpperCase();
    }

    createRoom(playerName, settings = {}, withDealer = false) {
        const roomCode = this.generateRoomCode();
        const game = new PokerGame(roomCode, playerName, true, settings);

        if (withDealer) {
            const dealer = new AIDealer("Dealer", settings.startingChips || 1000);
            game.addAIPlayer(dealer);
        }

        this.rooms.set(roomCode, game);
        this.saveRooms();
        return { roomCode, game };
    }

    joinRoom(roomCode, playerName) {
        this.loadRooms();

        let game = this.rooms.get(roomCode);
        if (!game) {
            return { success: false, message: 'Room not found' };
        }

        const result = game.addPlayer(playerName);
        if (result.success) {
            this.saveRooms();
            return { success: true, game };
        }
        return result;
    }

    getRoom(roomCode) {
        this.loadRooms();
        return this.rooms.get(roomCode);
    }

    saveRooms() {
        try {
            const roomsData = {};
            this.rooms.forEach((game, code) => {
                roomsData[code] = {
                    roomCode: game.roomCode,
                    players: game.players.map(p => ({
                        ...p,
                        aiInstance: undefined
                    })),
                    settings: game.settings,
                    gamePhase: game.gamePhase,
                    pot: game.pot,
                    currentBet: game.currentBet,
                    communityCards: game.communityCards,
                    dealerIndex: game.dealerIndex,
                    currentPlayerIndex: game.currentPlayerIndex,
                    lastUpdate: Date.now()
                };
            });
            localStorage.setItem(this.storageKey, JSON.stringify(roomsData));
        } catch (e) {
            console.error('Failed to save rooms:', e);
        }
    }

    loadRooms() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (!data) return;

            const roomsData = JSON.parse(data);
            const now = Date.now();

            Object.keys(roomsData).forEach(code => {
                const roomData = roomsData[code];

                if (now - roomData.lastUpdate > 3600000) return;

                const game = new PokerGame(code, '', false, roomData.settings || {});
                game.players = [];

                roomData.players.forEach(playerData => {
                    if (playerData.isAI) {
                        const aiDealer = new AIDealer(playerData.name, playerData.chips);
                        playerData.aiInstance = aiDealer;
                    }
                    game.players.push(playerData);
                });

                game.gamePhase = roomData.gamePhase;
                game.pot = roomData.pot;
                game.currentBet = roomData.currentBet;
                game.communityCards = roomData.communityCards || [];
                game.dealerIndex = roomData.dealerIndex;
                game.currentPlayerIndex = roomData.currentPlayerIndex;

                this.rooms.set(code, game);
            });
        } catch (e) {
            console.error('Failed to load rooms:', e);
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PokerGame, RoomManager, AIDealer, DEFAULT_SETTINGS };
}
