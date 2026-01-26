// Poker Game Logic for Server
// Deck, hand evaluation, and AI logic

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
    if (!cards || cards.length < 5) {
        return { rank: 1, name: 'High Card', value: 0 };
    }

    const sortedCards = [...cards].sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));
    const ranks = sortedCards.map(c => getRankValue(c.rank));
    const suits = sortedCards.map(c => c.suit);

    const rankCounts = {};
    ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);
    const counts = Object.values(rankCounts).sort((a, b) => b - a);

    const isFlush = suits.filter(s => s === suits[0]).length >= 5;

    let isStraight = false;
    const uniqueRanks = [...new Set(ranks)].sort((a, b) => b - a);
    for (let i = 0; i <= uniqueRanks.length - 5; i++) {
        if (uniqueRanks[i] - uniqueRanks[i + 4] === 4) {
            isStraight = true;
            break;
        }
    }
    // Check for Ace-low straight (A-2-3-4-5)
    if (uniqueRanks.includes(14) && uniqueRanks.includes(2) && uniqueRanks.includes(3) && uniqueRanks.includes(4) && uniqueRanks.includes(5)) {
        isStraight = true;
    }

    if (isFlush && isStraight) {
        if (uniqueRanks.includes(14) && uniqueRanks.includes(13)) {
            return { rank: 10, name: 'Royal Flush', value: 10000 };
        }
        return { rank: 9, name: 'Straight Flush', value: 9000 + uniqueRanks[0] };
    }

    if (counts[0] === 4) return { rank: 8, name: 'Four of a Kind', value: 8000 + ranks[0] };
    if (counts[0] === 3 && counts[1] === 2) return { rank: 7, name: 'Full House', value: 7000 + ranks[0] };
    if (isFlush) return { rank: 6, name: 'Flush', value: 6000 + ranks[0] };
    if (isStraight) return { rank: 5, name: 'Straight', value: 5000 + uniqueRanks[0] };
    if (counts[0] === 3) return { rank: 4, name: 'Three of a Kind', value: 4000 + ranks[0] };
    if (counts[0] === 2 && counts[1] === 2) return { rank: 3, name: 'Two Pair', value: 3000 + ranks[0] };
    if (counts[0] === 2) return { rank: 2, name: 'Pair', value: 2000 + ranks[0] };

    return { rank: 1, name: 'High Card', value: 1000 + ranks[0] };
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
        "GG EZ! No re! 🏆"
    ],
    bigWin: [
        "HUGE POT! Thanks for the donation! 💸",
        "CLEANING YOU OUT! 🧹💰",
        "That's gotta hurt! 😈",
        "DOMINATED! You never had a chance! 🔥"
    ],
    raise: [
        "Let's make this interesting! 📈",
        "Can you afford this? 💵",
        "Feeling lucky? 🍀",
        "Let's see what you're made of! 💪"
    ],
    playerFolded: [
        "That's right, run away! 🏃",
        "Chicken! 🐔",
        "Another one bites the dust! 💀"
    ],
    playerLowChips: [
        "Running low there, buddy! 😬",
        "Your stack is looking... sad 😢"
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
        return { action: 'call' };
    }

    // Medium hand
    if (handStrength >= 0.35) {
        if (callAmount === 0) {
            if (isAggressive || handStrength > 0.5) {
                const betAmount = Math.floor(pot * 0.4) + (bigBlind || 20);
                if (betAmount > 0 && myChips > betAmount) {
                    return { action: 'raise', amount: Math.max(betAmount, currentBet + 20) };
                }
            }
            return { action: 'check' };
        }

        if (handStrength > potOdds || isAggressive) {
            if (randomFactor < 0.3 && myChips > currentBet * 2) {
                return { action: 'raise', amount: currentBet * 2, taunt: getRandomTaunt('raise') };
            }
            return { action: 'call' };
        }
        return { action: 'fold' };
    }

    // Weak hand
    if (callAmount === 0) {
        if (shouldBluff && myChips > pot) {
            const bluffAmount = Math.floor(pot * 0.6);
            if (bluffAmount > 20) {
                return { action: 'raise', amount: bluffAmount };
            }
        }
        return { action: 'check' };
    }

    if (callAmount <= pot * 0.3 && randomFactor < 0.2) {
        return { action: 'call' };
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
    AI_TAUNTS
};
