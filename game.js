// Poker Game Logic
// Handles game state, player management, and game flow

class PokerGame {
    constructor(roomCode, playerName, isHost = false) {
        this.roomCode = roomCode;
        this.playerName = playerName;
        this.isHost = isHost;
        this.players = [];
        this.deck = [];
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = 0;
        this.currentPlayerIndex = 0;
        this.gamePhase = 'waiting'; // waiting, preflop, flop, turn, river, showdown
        this.smallBlind = 10;
        this.bigBlind = 20;
        this.dealerIndex = 0;

        this.initializePlayer(playerName, isHost);
    }

    initializePlayer(name, isHost) {
        const player = {
            id: this.generatePlayerId(),
            name: name,
            chips: 1000,
            bet: 0,
            cards: [],
            folded: false,
            isHost: isHost,
            isActive: false
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

    removePlayer(playerId) {
        this.players = this.players.filter(p => p.id !== playerId);
    }

    generatePlayerId() {
        return 'player_' + Math.random().toString(36).substr(2, 9);
    }

    startGame() {
        if (this.players.length < 2) {
            return { success: false, message: 'Need at least 2 players' };
        }

        this.gamePhase = 'preflop';
        this.resetRound();
        this.dealHoleCards();
        this.postBlinds();

        return { success: true };
    }

    resetRound() {
        this.deck = CardRenderer.shuffleDeck(CardRenderer.createDeck());
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = this.bigBlind;

        this.players.forEach(player => {
            player.bet = 0;
            player.cards = [];
            player.folded = false;
            player.isActive = false;
        });

        // Set first player after big blind as active
        this.currentPlayerIndex = (this.dealerIndex + 3) % this.players.length;
        this.players[this.currentPlayerIndex].isActive = true;
    }

    dealHoleCards() {
        this.players.forEach(player => {
            player.cards = [
                this.deck.pop(),
                this.deck.pop()
            ];
        });
    }

    postBlinds() {
        const smallBlindIndex = (this.dealerIndex + 1) % this.players.length;
        const bigBlindIndex = (this.dealerIndex + 2) % this.players.length;

        this.players[smallBlindIndex].bet = this.smallBlind;
        this.players[smallBlindIndex].chips -= this.smallBlind;
        this.pot += this.smallBlind;

        this.players[bigBlindIndex].bet = this.bigBlind;
        this.players[bigBlindIndex].chips -= this.bigBlind;
        this.pot += this.bigBlind;
    }

    dealFlop() {
        this.deck.pop(); // Burn card
        this.communityCards.push(this.deck.pop());
        this.communityCards.push(this.deck.pop());
        this.communityCards.push(this.deck.pop());
        this.gamePhase = 'flop';
        this.resetBettingRound();
    }

    dealTurn() {
        this.deck.pop(); // Burn card
        this.communityCards.push(this.deck.pop());
        this.gamePhase = 'turn';
        this.resetBettingRound();
    }

    dealRiver() {
        this.deck.pop(); // Burn card
        this.communityCards.push(this.deck.pop());
        this.gamePhase = 'river';
        this.resetBettingRound();
    }

    resetBettingRound() {
        this.currentBet = 0;
        this.players.forEach(player => {
            player.bet = 0;
            player.isActive = false;
        });
        this.currentPlayerIndex = (this.dealerIndex + 1) % this.players.length;
        this.players[this.currentPlayerIndex].isActive = true;
    }

    playerAction(playerId, action, amount = 0) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || !player.isActive) {
            return { success: false, message: 'Not your turn' };
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
                const callAmount = this.currentBet - player.bet;
                if (player.chips < callAmount) {
                    return { success: false, message: 'Not enough chips' };
                }
                player.chips -= callAmount;
                player.bet += callAmount;
                this.pot += callAmount;
                break;

            case 'raise':
                const raiseAmount = amount;
                if (raiseAmount <= this.currentBet) {
                    return { success: false, message: 'Raise must be higher than current bet' };
                }
                const totalAmount = raiseAmount - player.bet;
                if (player.chips < totalAmount) {
                    return { success: false, message: 'Not enough chips' };
                }
                player.chips -= totalAmount;
                player.bet = raiseAmount;
                this.pot += totalAmount;
                this.currentBet = raiseAmount;
                break;
        }

        // Move to next player
        this.nextPlayer();

        // Check if betting round is complete
        if (this.isBettingRoundComplete()) {
            this.advanceGamePhase();
        }

        return { success: true };
    }

    nextPlayer() {
        this.players[this.currentPlayerIndex].isActive = false;

        do {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        } while (this.players[this.currentPlayerIndex].folded);

        this.players[this.currentPlayerIndex].isActive = true;
    }

    isBettingRoundComplete() {
        const activePlayers = this.players.filter(p => !p.folded);
        if (activePlayers.length === 1) return true;

        return activePlayers.every(p => p.bet === this.currentBet);
    }

    advanceGamePhase() {
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

    showdown() {
        this.gamePhase = 'showdown';
        const activePlayers = this.players.filter(p => !p.folded);

        if (activePlayers.length === 1) {
            // Only one player left, they win
            activePlayers[0].chips += this.pot;
            return { winner: activePlayers[0], reason: 'All others folded' };
        }

        // Evaluate hands
        const hands = activePlayers.map(player => {
            const allCards = [...player.cards, ...this.communityCards];
            const hand = PokerHandEvaluator.evaluateHand(allCards);
            return { player, hand };
        });

        // Find winner
        hands.sort((a, b) => b.hand.rank - a.hand.rank);
        const winner = hands[0].player;
        winner.chips += this.pot;

        return { winner, hand: hands[0].hand };
    }

    getGameState() {
        return {
            roomCode: this.roomCode,
            players: this.players,
            communityCards: this.communityCards,
            pot: this.pot,
            currentBet: this.currentBet,
            gamePhase: this.gamePhase,
            currentPlayerIndex: this.currentPlayerIndex
        };
    }
}

// Room Manager for handling multiple game rooms
class RoomManager {
    constructor() {
        this.rooms = new Map();
    }

    generateRoomCode() {
        return Math.random().toString(36).substr(2, 6).toUpperCase();
    }

    createRoom(playerName) {
        const roomCode = this.generateRoomCode();
        const game = new PokerGame(roomCode, playerName, true);
        this.rooms.set(roomCode, game);
        return { roomCode, game };
    }

    joinRoom(roomCode, playerName) {
        const game = this.rooms.get(roomCode);
        if (!game) {
            return { success: false, message: 'Room not found' };
        }

        const result = game.addPlayer(playerName);
        if (result.success) {
            return { success: true, game };
        }
        return result;
    }

    getRoom(roomCode) {
        return this.rooms.get(roomCode);
    }

    removeRoom(roomCode) {
        this.rooms.delete(roomCode);
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PokerGame, RoomManager };
}
