// Card SVG Generator for Poker Game
// Generates realistic playing card SVGs

const SUITS = {
    hearts: { symbol: '♥', color: '#ef4444' },
    diamonds: { symbol: '♦', color: '#ef4444' },
    clubs: { symbol: '♣', color: '#1a1a1a' },
    spades: { symbol: '♠', color: '#1a1a1a' }
};

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

class CardRenderer {
    static createCardSVG(rank, suit) {
        const suitData = SUITS[suit];
        const color = suitData.color;
        const symbol = suitData.symbol;
        
        return `
            <svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">
                <!-- Card Background -->
                <rect width="100" height="140" rx="8" fill="white" stroke="#ddd" stroke-width="1"/>
                
                <!-- Top Left Corner -->
                <text x="8" y="20" font-size="16" font-weight="bold" fill="${color}" font-family="Arial, sans-serif">
                    ${rank}
                </text>
                <text x="8" y="35" font-size="18" fill="${color}">
                    ${symbol}
                </text>
                
                <!-- Center Symbol -->
                <text x="50" y="80" font-size="40" fill="${color}" text-anchor="middle" dominant-baseline="middle">
                    ${symbol}
                </text>
                
                <!-- Bottom Right Corner (Rotated) -->
                <g transform="rotate(180 50 70)">
                    <text x="8" y="20" font-size="16" font-weight="bold" fill="${color}" font-family="Arial, sans-serif">
                        ${rank}
                    </text>
                    <text x="8" y="35" font-size="18" fill="${color}">
                        ${symbol}
                    </text>
                </g>
            </svg>
        `;
    }
    
    static createCardBack() {
        return `
            <svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">
                <!-- Card Background -->
                <rect width="100" height="140" rx="8" fill="white" stroke="#ddd" stroke-width="1"/>
                
                <!-- Pattern Background -->
                <rect x="5" y="5" width="90" height="130" rx="6" fill="url(#cardPattern)"/>
                
                <!-- Define Pattern -->
                <defs>
                    <linearGradient id="cardPattern" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#7c3aed;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#5b21b6;stop-opacity:1" />
                    </linearGradient>
                    <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                        <circle cx="10" cy="10" r="2" fill="rgba(255,255,255,0.2)"/>
                    </pattern>
                </defs>
                
                <!-- Decorative Pattern -->
                <rect x="5" y="5" width="90" height="130" rx="6" fill="url(#dots)"/>
                
                <!-- Center Logo -->
                <circle cx="50" cy="70" r="15" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="2"/>
                <text x="50" y="77" font-size="20" fill="white" text-anchor="middle" font-weight="bold">♠</text>
            </svg>
        `;
    }
    
    static createCardElement(rank, suit, faceDown = false) {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.rank = rank;
        card.dataset.suit = suit;
        
        if (faceDown) {
            card.innerHTML = this.createCardBack();
        } else {
            card.innerHTML = this.createCardSVG(rank, suit);
        }
        
        return card;
    }
    
    static createDeck() {
        const deck = [];
        for (const suit in SUITS) {
            for (const rank of RANKS) {
                deck.push({ rank, suit });
            }
        }
        return deck;
    }
    
    static shuffleDeck(deck) {
        const shuffled = [...deck];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}

// Poker Hand Evaluator
class PokerHandEvaluator {
    static getRankValue(rank) {
        const values = {
            '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
            '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
        };
        return values[rank];
    }
    
    static evaluateHand(cards) {
        // Sort cards by rank value
        const sorted = cards.sort((a, b) => 
            this.getRankValue(b.rank) - this.getRankValue(a.rank)
        );
        
        const ranks = sorted.map(c => c.rank);
        const suits = sorted.map(c => c.suit);
        const rankCounts = {};
        
        ranks.forEach(rank => {
            rankCounts[rank] = (rankCounts[rank] || 0) + 1;
        });
        
        const counts = Object.values(rankCounts).sort((a, b) => b - a);
        const isFlush = suits.every(suit => suit === suits[0]);
        const rankValues = ranks.map(r => this.getRankValue(r));
        const isStraight = this.checkStraight(rankValues);
        
        // Royal Flush
        if (isFlush && isStraight && rankValues[0] === 14) {
            return { rank: 10, name: 'Royal Flush' };
        }
        
        // Straight Flush
        if (isFlush && isStraight) {
            return { rank: 9, name: 'Straight Flush' };
        }
        
        // Four of a Kind
        if (counts[0] === 4) {
            return { rank: 8, name: 'Four of a Kind' };
        }
        
        // Full House
        if (counts[0] === 3 && counts[1] === 2) {
            return { rank: 7, name: 'Full House' };
        }
        
        // Flush
        if (isFlush) {
            return { rank: 6, name: 'Flush' };
        }
        
        // Straight
        if (isStraight) {
            return { rank: 5, name: 'Straight' };
        }
        
        // Three of a Kind
        if (counts[0] === 3) {
            return { rank: 4, name: 'Three of a Kind' };
        }
        
        // Two Pair
        if (counts[0] === 2 && counts[1] === 2) {
            return { rank: 3, name: 'Two Pair' };
        }
        
        // One Pair
        if (counts[0] === 2) {
            return { rank: 2, name: 'One Pair' };
        }
        
        // High Card
        return { rank: 1, name: 'High Card' };
    }
    
    static checkStraight(values) {
        // Check for regular straight
        for (let i = 0; i < values.length - 1; i++) {
            if (values[i] - values[i + 1] !== 1) {
                // Check for A-2-3-4-5 straight
                if (values[0] === 14 && values[1] === 5 && values[2] === 4 && 
                    values[3] === 3 && values[4] === 2) {
                    return true;
                }
                return false;
            }
        }
        return true;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CardRenderer, PokerHandEvaluator, SUITS, RANKS };
}
