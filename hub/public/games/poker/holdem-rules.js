// Official No-Limit Texas Hold'em rules helpers.
// Works in the browser (window.HoldemRules) and in Node (module.exports).

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.HoldemRules = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const RANK_VALUE = {
        '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
        '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
    };

    const RANK_NAME = {
        2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
        10: '10', 11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace'
    };

    const RANK_PLURAL = {
        2: 'Twos', 3: 'Threes', 4: 'Fours', 5: 'Fives', 6: 'Sixes', 7: 'Sevens',
        8: 'Eights', 9: 'Nines', 10: 'Tens', 11: 'Jacks', 12: 'Queens',
        13: 'Kings', 14: 'Aces'
    };

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

    const STREET_NAMES = {
        waiting: 'Waiting',
        preflop: 'Preflop',
        flop: 'Flop',
        turn: 'Turn',
        river: 'River',
        showdown: 'Showdown'
    };

    function getRankValue(rank) {
        return RANK_VALUE[rank] || 0;
    }

    function rankLabel(value, plural) {
        return (plural ? RANK_PLURAL[value] : RANK_NAME[value]) || String(value);
    }

    function playerId(player) {
        return player.oderId || player.id;
    }

    function combinations(arr, k) {
        const result = [];
        const combo = [];
        function rec(start) {
            if (combo.length === k) {
                result.push(combo.slice());
                return;
            }
            for (let i = start; i <= arr.length - (k - combo.length); i++) {
                combo.push(arr[i]);
                rec(i + 1);
                combo.pop();
            }
        }
        rec(0);
        return result;
    }

    function evaluateFive(cards) {
        const values = cards.map(c => getRankValue(c.rank)).sort((a, b) => b - a);
        const suits = cards.map(c => c.suit);
        const counts = {};
        values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });

        const groups = Object.keys(counts)
            .map(v => ({ value: Number(v), count: counts[v] }))
            .sort((a, b) => b.count - a.count || b.value - a.value);

        const isFlush = suits.every(s => s === suits[0]);
        const unique = [...new Set(values)].sort((a, b) => b - a);

        let straightHigh = 0;
        if (unique.length === 5 && unique[0] - unique[4] === 4) {
            straightHigh = unique[0];
        } else if (
            unique.length === 5 &&
            unique[0] === 14 &&
            unique[1] === 5 &&
            unique[2] === 4 &&
            unique[3] === 3 &&
            unique[4] === 2
        ) {
            straightHigh = 5;
        }

        const isStraight = straightHigh > 0;
        let rank;
        let name;
        let tiebreakers;

        if (isFlush && isStraight && straightHigh === 14) {
            rank = HAND_RANKS.ROYAL_FLUSH;
            name = 'Royal Flush';
            tiebreakers = [14];
        } else if (isFlush && isStraight) {
            rank = HAND_RANKS.STRAIGHT_FLUSH;
            name = 'Straight Flush';
            tiebreakers = [straightHigh];
        } else if (groups[0].count === 4) {
            rank = HAND_RANKS.FOUR_OF_A_KIND;
            name = 'Four of a Kind';
            tiebreakers = [groups[0].value, groups[1].value];
        } else if (groups[0].count === 3 && groups[1] && groups[1].count === 2) {
            rank = HAND_RANKS.FULL_HOUSE;
            name = 'Full House';
            tiebreakers = [groups[0].value, groups[1].value];
        } else if (isFlush) {
            rank = HAND_RANKS.FLUSH;
            name = 'Flush';
            tiebreakers = values.slice();
        } else if (isStraight) {
            rank = HAND_RANKS.STRAIGHT;
            name = 'Straight';
            tiebreakers = [straightHigh];
        } else if (groups[0].count === 3) {
            rank = HAND_RANKS.THREE_OF_A_KIND;
            name = 'Three of a Kind';
            tiebreakers = [groups[0].value, ...groups.slice(1).map(g => g.value)];
        } else if (groups[0].count === 2 && groups[1] && groups[1].count === 2) {
            rank = HAND_RANKS.TWO_PAIR;
            name = 'Two Pair';
            const kicker = groups[2] ? groups[2].value : 0;
            tiebreakers = [groups[0].value, groups[1].value, kicker];
        } else if (groups[0].count === 2) {
            rank = HAND_RANKS.PAIR;
            name = 'Pair';
            tiebreakers = [groups[0].value, ...groups.slice(1).map(g => g.value)];
        } else {
            rank = HAND_RANKS.HIGH_CARD;
            name = 'High Card';
            tiebreakers = values.slice();
        }

        return { rank, name, tiebreakers, cards: cards.slice() };
    }

    function describeHand(hand) {
        if (!hand) return 'High Card';
        const t = hand.tiebreakers || [];
        switch (hand.rank) {
            case HAND_RANKS.ROYAL_FLUSH:
                return 'Royal Flush';
            case HAND_RANKS.STRAIGHT_FLUSH:
                return `Straight Flush, ${rankLabel(t[0])} high`;
            case HAND_RANKS.FOUR_OF_A_KIND:
                return `Four of a Kind, ${rankLabel(t[0], true)}`;
            case HAND_RANKS.FULL_HOUSE:
                return `Full House, ${rankLabel(t[0], true)} over ${rankLabel(t[1], true)}`;
            case HAND_RANKS.FLUSH:
                return `Flush, ${rankLabel(t[0])} high`;
            case HAND_RANKS.STRAIGHT:
                return `Straight, ${rankLabel(t[0])} high`;
            case HAND_RANKS.THREE_OF_A_KIND:
                return `Three of a Kind, ${rankLabel(t[0], true)}`;
            case HAND_RANKS.TWO_PAIR:
                return `Two Pair, ${rankLabel(t[0], true)} and ${rankLabel(t[1], true)}`;
            case HAND_RANKS.PAIR:
                return `Pair of ${rankLabel(t[0], true)}`;
            default:
                return `${rankLabel(t[0])} high`;
        }
    }

    function evaluateBestHand(cards) {
        if (!cards || cards.length === 0) {
            return { rank: 0, name: 'No Cards', tiebreakers: [], cards: [] };
        }
        if (cards.length < 5) {
            const values = cards.map(c => getRankValue(c.rank)).sort((a, b) => b - a);
            return {
                rank: HAND_RANKS.HIGH_CARD,
                name: 'High Card',
                tiebreakers: values,
                cards: cards.slice()
            };
        }
        if (cards.length === 5) {
            const result = evaluateFive(cards);
            result.name = describeHand(result);
            return result;
        }

        let best = null;
        combinations(cards, 5).forEach(combo => {
            const evaluated = evaluateFive(combo);
            if (!best || compareHands(evaluated, best) > 0) {
                best = evaluated;
            }
        });
        best.name = describeHand(best);
        return best;
    }

    function compareHands(a, b) {
        if (!a && !b) return 0;
        if (!a) return -1;
        if (!b) return 1;
        if (a.rank !== b.rank) return a.rank - b.rank;
        const len = Math.max((a.tiebreakers || []).length, (b.tiebreakers || []).length);
        for (let i = 0; i < len; i++) {
            const av = (a.tiebreakers && a.tiebreakers[i]) || 0;
            const bv = (b.tiebreakers && b.tiebreakers[i]) || 0;
            if (av !== bv) return av - bv;
        }
        return 0;
    }

    function nextLiveIndex(players, startIndex) {
        for (let i = 0; i < players.length; i++) {
            const idx = (startIndex + i) % players.length;
            if (players[idx] && players[idx].chips > 0) return idx;
        }
        return startIndex;
    }

    function livePlayers(players) {
        return players.filter(p => !p.folded);
    }

    function playersWhoCanBet(players) {
        return players.filter(p => !p.folded && p.chips > 0);
    }

    function shouldRunOutBoard(players) {
        return livePlayers(players).length >= 2 && playersWhoCanBet(players).length <= 1;
    }

    function firstToActIndex(players, dealerIndex, street) {
        if (players.length === 2) {
            // Heads-up: dealer/SB acts first preflop AND postflop.
            return nextActingIndex(players, dealerIndex);
        }
        if (street === 'preflop') {
            // Under the gun: first live player left of the big blind.
            const bbIndex = nextLiveIndex(players, dealerIndex + 2);
            return nextActingIndex(players, (bbIndex + 1) % players.length);
        }
        // Postflop: first live player left of the button.
        return nextActingIndex(players, (dealerIndex + 1) % players.length);
    }

    function nextActingIndex(players, startIndex) {
        for (let i = 0; i < players.length; i++) {
            const idx = (startIndex + i) % players.length;
            const p = players[idx];
            if (p && !p.folded && p.chips > 0) return idx;
        }
        return startIndex;
    }

    function minBetSize(settings) {
        return settings.bigBlind || 20;
    }

    function minRaiseTo(currentBet, lastRaiseSize, settings) {
        const raiseSize = lastRaiseSize > 0 ? lastRaiseSize : minBetSize(settings);
        if (currentBet <= 0) return minBetSize(settings);
        return currentBet + raiseSize;
    }

    function commitChips(player, amount) {
        const putIn = Math.max(0, Math.min(amount, player.chips));
        player.chips -= putIn;
        player.bet = (player.bet || 0) + putIn;
        player.committed = (player.committed || 0) + putIn;
        return putIn;
    }

    function postForcedBet(player, amount) {
        return commitChips(player, amount);
    }

    function buildSidePots(players) {
        const levels = [...new Set(players.map(p => p.committed || 0).filter(v => v > 0))].sort((a, b) => a - b);
        const pots = [];
        let prev = 0;

        levels.forEach((level, index) => {
            const contributors = players.filter(p => (p.committed || 0) >= level);
            const amount = (level - prev) * contributors.length;
            const eligible = contributors.filter(p => !p.folded);
            if (amount > 0) {
                pots.push({
                    amount,
                    eligibleIds: eligible.map(playerId),
                    label: index === 0 ? 'Main Pot' : `Side Pot ${index}`
                });
            }
            prev = level;
        });

        return pots;
    }

    function awardPots(players, communityCards, dealerIndex) {
        const pots = buildSidePots(players);
        const results = [];

        pots.forEach(pot => {
            const eligible = players.filter(p => pot.eligibleIds.includes(playerId(p)));
            if (eligible.length === 0) return;

            const evaluated = eligible.map(player => ({
                player,
                hand: evaluateBestHand([...(player.cards || []), ...communityCards])
            }));

            evaluated.sort((a, b) => compareHands(b.hand, a.hand));
            const best = evaluated[0].hand;
            const winners = evaluated.filter(e => compareHands(e.hand, best) === 0).map(e => e.player);

            const share = Math.floor(pot.amount / winners.length);
            let remainder = pot.amount - share * winners.length;
            winners.forEach(w => { w.chips += share; });

            if (remainder > 0) {
                for (let i = 1; i <= players.length && remainder > 0; i++) {
                    const candidate = players[(dealerIndex + i) % players.length];
                    if (winners.includes(candidate)) {
                        candidate.chips += 1;
                        remainder -= 1;
                    }
                }
            }

            results.push({
                label: pot.label,
                amount: pot.amount,
                share,
                winners: winners.map(w => ({
                    playerId: playerId(w),
                    name: w.name,
                    hand: evaluated.find(e => e.player === w).hand
                }))
            });
        });

        return results;
    }

    function validateAction(player, action, amount, state) {
        const { currentBet, lastRaiseSize, settings } = state;
        const callAmount = Math.max(0, currentBet - (player.bet || 0));
        const stack = player.chips || 0;
        const maxTo = (player.bet || 0) + stack;

        if (action === 'check') {
            if (callAmount > 0) return { ok: false, message: 'Cannot check, must call or fold' };
            return { ok: true };
        }
        if (action === 'fold') return { ok: true };
        if (action === 'call') return { ok: true };

        if (action === 'allin' || action === 'all-in') {
            return { ok: true, target: maxTo };
        }

        if (action === 'bet' || action === 'raise') {
            const target = Math.min(Number(amount) || 0, maxTo);
            if (target <= (player.bet || 0)) {
                return { ok: false, message: 'Bet must put more chips in' };
            }
            const goingAllIn = target >= maxTo;
            if (currentBet <= 0) {
                const minBet = minBetSize(settings);
                if (!goingAllIn && target < minBet) {
                    return { ok: false, message: `Minimum bet is $${minBet}` };
                }
            } else {
                const minTo = minRaiseTo(currentBet, lastRaiseSize, settings);
                if (!goingAllIn && target < minTo) {
                    return { ok: false, message: `Minimum raise is to $${minTo}` };
                }
            }
            return { ok: true, target };
        }

        return { ok: false, message: 'Unknown action' };
    }

    const RULES_TEXT = [
        {
            title: 'The Deal',
            body: 'A standard 52-card deck is used. The dealer button rotates clockwise each hand. Each player is dealt two private hole cards, one at a time, starting left of the button. A card is burned before the flop, turn, and river.'
        },
        {
            title: 'Blinds & Antes',
            body: 'The player left of the button posts the small blind. The next player posts the big blind (usually 2× the small blind). Optional antes are posted by every player with chips before the deal. In heads-up, the dealer posts the small blind and acts first.'
        },
        {
            title: 'Betting Streets',
            body: 'There are four betting rounds: preflop, flop (3 community cards), turn (4th street), and river (5th street). Action is clockwise. Preflop starts left of the big blind (under the gun). After the flop it starts left of the button. In heads-up the dealer/SB acts first on every street.'
        },
        {
            title: 'Actions',
            body: 'Fold, check (only if no bet to you), bet (first chips into the street), call (match the current bet), raise (increase it), or go all-in. You cannot check into a bet. The big blind is a live bet preflop and gets the option to check or raise if nobody raised.'
        },
        {
            title: 'No-Limit Raises',
            body: 'The minimum bet is the big blind. A raise must be at least the size of the previous bet or raise. You may always move all-in for less, but a short all-in does not reopen betting for players who already acted. A full raise reopens the action.'
        },
        {
            title: 'All-In & Side Pots',
            body: 'You can only win from each opponent as much as you committed. Extra chips among remaining players go into side pots. If only one player still has chips, remaining community cards are dealt with no further betting.'
        },
        {
            title: 'The Showdown',
            body: 'Players make the best five-card hand using any combination of their two hole cards and the five community cards — both, one, or neither (playing the board). Suits are equal. Identical hands split the pot. Odd chips go to the first winning seat left of the button.'
        },
        {
            title: 'Hand Rankings (high to low)',
            body: 'Royal Flush · Straight Flush · Four of a Kind · Full House · Flush · Straight · Three of a Kind · Two Pair · Pair · High Card. Kickers break ties. A-2-3-4-5 is a valid wheel straight (five-high).'
        }
    ];

    return {
        HAND_RANKS,
        STREET_NAMES,
        RULES_TEXT,
        getRankValue,
        playerId,
        evaluateBestHand,
        evaluateFive,
        compareHands,
        describeHand,
        nextLiveIndex,
        nextActingIndex,
        livePlayers,
        playersWhoCanBet,
        shouldRunOutBoard,
        firstToActIndex,
        minBetSize,
        minRaiseTo,
        commitChips,
        postForcedBet,
        buildSidePots,
        awardPots,
        validateAction
    };
}));
