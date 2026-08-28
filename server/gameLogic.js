// Poker Game Logic for Server
// Deck, hand evaluation, and AI logic

const HoldemRules = require('../games/poker/holdem-rules');

// Card utilities
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ rank, suit });
        }
    }
    return deck;
}

function shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Hand evaluation
const HAND_RANKS = {
    HIGH_CARD: 1,
    PAIR: 2,
    TWO_PAIR: 3,
    THREE_OF_A_KIND: 4,
    STRAIGHT: 5,
    FLUSH: 6,
    FULL_HOUSE: 7,
    FOUR_OF_A_KIND: 8,
    STRAIGHT_FLUSH: 9,
    ROYAL_FLUSH: 10
};

function getRankValue(rank) {
    const values = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
    return values[rank] || 0;
}

function evaluateHand(cards) {
    const hand = HoldemRules.evaluateBestHand(cards);
    const value = (hand.rank || 0) * 1e10 + (hand.tiebreakers || []).reduce((sum, v, i) => {
        return sum + (v || 0) * Math.pow(15, 5 - i);
    }, 0);
    return { ...hand, value };
}

// AI Trash Talk
const AI_TAUNTS = {
    win: [
        "Thanks for the chips! 💰",
        "Is that all you got? 😏",
        "Too easy! Better luck next time!",
        "No chips left? What a shame! 🤭",
        "Yoink! My chips now! 😎",
        "Get good, kid! 🎯",
        "GG EZ! No re! 🏆",
        "Cash out while you can! 📉"
    ],
    bigWin: [
        "HUGE POT! Thanks for the donation! 💸",
        "CLEANING YOU OUT! 🧹💰",
        "That's gotta hurt! 😈",
        "DOMINATED! You never had a chance! 🔥",
        "I'm owning this table! 🦁"
    ],
    // When AI Raises
    raise: [
        "Just fold, we all know you ain't him. ✋",
        "Can you afford this? 💵",
        "I smell fear. 👃",
        "Put your chips where your mouth is!",
        "Don't hurt yourself trying to call this. 🚑",
        "I'm raising... pray if you want to. 🙏",
        "This is where the big boys play. 🕴️"
    ],
    // When AI Calls/Checks (Responding to player)
    call: [
        "You probably got shit cards. 🚽",
        "I'll pay to see that bluff. 👀",
        "Nice try, I'm not going anywhere. 🧱",
        "Stop wasting my time with these baby bets. 🍼"
    ],
    playerFolded: [
        "That's right, run away! 🏃",
        "Chicken! 🐔",
        "Another one bites the dust! 💀",
        "Smart fold... for a coward. 🤡"
    ],
    playerLowChips: [
        "Running low there, buddy! 😬",
        "Your stack is looking... sad 😢",
        "Need a loan? Interest is 100%. 🏦"
    ]
};

function getRandomTaunt(category) {
    const taunts = AI_TAUNTS[category];
    if (!taunts || taunts.length === 0) return null;
    return taunts[Math.floor(Math.random() * taunts.length)];
}

// AI Decision Making
function makeAIDecision(gameState, myCards, communityCards) {
    const { currentBet, pot, myBet, myChips, bigBlind } = gameState;

    const handStrength = evaluateHandStrength(myCards, communityCards);
    const callAmount = currentBet - myBet;
    const potOdds = pot > 0 ? callAmount / (pot + callAmount) : 0.3;
    const randomFactor = Math.random();
    const isAggressive = randomFactor < 0.75;
    const shouldBluff = Math.random() < 0.25 && myChips > pot;

    // Strong hand - aggressive
    if (handStrength >= 0.6) {
        if (handStrength >= 0.8 && Math.random() < 0.3) {
            return { action: 'raise', amount: myChips + myBet, taunt: getRandomTaunt('raise') };
        }

        const raiseAmount = Math.max(Math.floor(pot * (0.5 + handStrength * 0.5)), currentBet + (bigBlind || 20));
        if (raiseAmount > currentBet && myChips > raiseAmount) {
            return { action: 'raise', amount: raiseAmount, taunt: getRandomTaunt('raise') };
        }

        // Taunt when calling with a strong hand
        return { action: 'call', taunt: Math.random() < 0.4 ? getRandomTaunt('call') : null };
    }

    // Medium hand
    if (handStrength >= 0.35) {
        if (callAmount === 0) {
            if (isAggressive || handStrength > 0.5) {
                const betAmount = Math.floor(pot * 0.4) + (bigBlind || 20);
                if (betAmount > 0 && myChips > betAmount) {
                    return { action: 'raise', amount: Math.max(betAmount, currentBet + 20), taunt: Math.random() < 0.3 ? getRandomTaunt('raise') : null };
                }
            }
            return { action: 'check' };
        }

        if (handStrength > potOdds || isAggressive) {
            if (randomFactor < 0.3 && myChips > currentBet * 2) {
                return { action: 'raise', amount: currentBet * 2, taunt: getRandomTaunt('raise') };
            }
            // Calling a bet with medium hand
            return { action: 'call', taunt: Math.random() < 0.3 ? getRandomTaunt('call') : null };
        }
        return { action: 'fold' };
    }

    // Weak hand
    if (callAmount === 0) {
        if (shouldBluff && myChips > pot) {
            const bluffAmount = Math.floor(pot * 0.6);
            if (bluffAmount > 20) {
                return { action: 'raise', amount: bluffAmount, taunt: getRandomTaunt('raise') }; // Bluff with confidence
            }
        }
        return { action: 'check' };
    }

    if (callAmount <= pot * 0.3 && randomFactor < 0.2) {
        return { action: 'call', taunt: "I'll swim. 🐟" };
    }

    return { action: 'fold' };
}

function evaluateHandStrength(myCards, communityCards) {
    if (!myCards || myCards.length === 0) return 0.3;

    if (!communityCards || communityCards.length < 3) {
        return evaluatePreFlop(myCards);
    }

    const allCards = [...myCards, ...communityCards];
    const hand = evaluateHand(allCards);
    return (hand.rank / 10) * 1.2;
}

function evaluatePreFlop(cards) {
    if (!cards || cards.length < 2) return 0.3;

    const rank1 = getRankValue(cards[0].rank);
    const rank2 = getRankValue(cards[1].rank);
    const isPair = rank1 === rank2;
    const isSuited = cards[0].suit === cards[1].suit;
    const highCard = Math.max(rank1, rank2);
    const lowCard = Math.min(rank1, rank2);
    const gap = Math.abs(rank1 - rank2);

    let strength = 0;

    if (isPair) {
        if (highCard >= 11) strength = 0.85 + (highCard / 100);
        else if (highCard >= 8) strength = 0.65 + (highCard / 50);
        else strength = 0.5 + (highCard / 40);
    } else if (highCard === 14 && lowCard >= 12) {
        strength = isSuited ? 0.75 : 0.68;
    } else if (highCard >= 12 && lowCard >= 10) {
        strength = isSuited ? 0.55 : 0.48;
    } else if (isSuited && gap <= 2 && lowCard >= 6) {
        strength = 0.45 + (lowCard / 100);
    } else if (highCard === 14) {
        strength = isSuited ? 0.45 : 0.38;
    } else {
        strength = (highCard + lowCard) / 35;
        if (isSuited) strength += 0.08;
        if (gap <= 3) strength += 0.05;
    }

    return Math.min(strength, 0.95);
}

module.exports = {
    createDeck,
    shuffleDeck,
    evaluateHand,
    getRankValue,
    makeAIDecision,
    getRandomTaunt,
    AI_TAUNTS,
    HoldemRules
};
