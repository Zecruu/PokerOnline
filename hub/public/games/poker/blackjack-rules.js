// Official American / Las Vegas Strip blackjack helpers.
// Works in the browser (window.BlackjackRules) and in Node (module.exports).
//
// House rules implemented here:
// - 6-deck shoe, reshuffle when fewer than 40 cards remain
// - Dealer stands on all 17s including soft 17 (S17); optional H17
// - Player cards face up; dealer one upcard + one hole card
// - American peek for blackjack on Ace or 10-value upcard
// - Natural blackjack pays 3:2; push on both naturals
// - Insurance (half bet, pays 2:1) when dealer shows Ace
// - Even money when player has a natural and dealer shows Ace
// - Late surrender on the original two-card hand only (half bet)
// - Double down on any first two cards (including after split if DAS)
// - Split matching ranks only; max 4 hands; split Aces get one card each
// - Split 10 + Ace is 21, not a natural blackjack
// - Dealer does not draw if every player hand has busted or surrendered

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.BlackjackRules = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
    const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

    const DEFAULT_BJ_SETTINGS = {
        decks: 6,
        minBet: 10,
        hitSoft17: false,
        das: true,
        surrender: true,
        resplitAces: false,
        maxHands: 4,
        blackjackPayout: 1.5,
        startingChips: 1000,
        allowBuyBack: true,
        maxBuyBacks: 3,
        buyBackAmount: 1000
    };

    function createShoe(decks) {
        const n = Math.max(1, decks || 6);
        const shoe = [];
        for (let d = 0; d < n; d++) {
            for (const suit of SUITS) {
                for (const rank of RANKS) {
                    shoe.push({ rank, suit });
                }
            }
        }
        return shoe;
    }

    function shuffle(cards) {
        const a = cards.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = a[i];
            a[i] = a[j];
            a[j] = tmp;
        }
        return a;
    }

    function isTenValue(rank) {
        return rank === '10' || rank === 'J' || rank === 'Q' || rank === 'K';
    }

    function pipValue(rank) {
        if (rank === 'A') return 11;
        if (isTenValue(rank)) return 10;
        return parseInt(rank, 10);
    }

    function handValue(cards) {
        let total = 0;
        let aces = 0;
        for (const card of cards || []) {
            if (card.rank === 'A') {
                aces += 1;
                total += 11;
            } else {
                total += pipValue(card.rank);
            }
        }
        while (total > 21 && aces > 0) {
            total -= 10;
            aces -= 1;
        }
        return {
            total,
            soft: aces > 0 && total <= 21,
            bust: total > 21
        };
    }

    function isBlackjack(cards) {
        return Array.isArray(cards) && cards.length === 2 && handValue(cards).total === 21;
    }

    function isNatural(hand) {
        return !!(hand && !hand.fromSplit && isBlackjack(hand.cards));
    }

    function isPair(cards) {
        return Array.isArray(cards) && cards.length === 2 && cards[0].rank === cards[1].rank;
    }

    function dealerShouldHit(cards, hitSoft17) {
        const v = handValue(cards);
        if (v.total < 17) return true;
        if (v.total > 17) return false;
        return !!(hitSoft17 && v.soft);
    }

    function emptyHand(bet) {
        return {
            cards: [],
            bet: bet || 0,
            stood: false,
            doubled: false,
            fromSplit: false,
            splitAces: false,
            surrendered: false,
            busted: false
        };
    }

    function createTable(opts) {
        const settings = { ...DEFAULT_BJ_SETTINGS, ...(opts || {}) };
        delete settings.playerId;
        delete settings.playerName;
        delete settings.dealerId;
        delete settings.dealerName;
        delete settings.dealerIsAI;
        const starting = settings.startingChips || 1000;
        return {
            settings,
            shoe: shuffle(createShoe(settings.decks)),
            dealerHand: { cards: [] },
            holeRevealed: false,
            player: {
                id: (opts && opts.playerId) || 'bj_player',
                name: (opts && opts.playerName) || 'Player',
                chips: starting,
                buyBacksUsed: 0
            },
            dealer: {
                id: (opts && opts.dealerId) || 'bj_dealer',
                name: (opts && opts.dealerName) || 'Dealer',
                chips: starting,
                isAI: !!(opts && opts.dealerIsAI),
                buyBacksUsed: 0
            },
            hands: [],
            activeHand: 0,
            pendingBet: 0,
            insuranceBet: 0,
            phase: 'waiting',
            message: 'Place your bet to start.',
            lastSettlement: null
        };
    }

    function ensureShoe(table) {
        if (!table.shoe || table.shoe.length === 0) {
            table.shoe = shuffle(createShoe(table.settings.decks));
        }
    }

    function draw(table) {
        ensureShoe(table);
        return table.shoe.pop();
    }

    function upcard(table) {
        return table.dealerHand.cards[0] || null;
    }

    function liveHands(table) {
        return (table.hands || []).filter(h => !h.busted && !h.surrendered);
    }

    function allHandsDone(table) {
        return (table.hands || []).every(h => h.stood || h.busted || h.surrendered);
    }

    function takeFromDealer(table, amount) {
        const pay = Math.min(Math.max(0, amount), table.dealer.chips);
        table.dealer.chips -= pay;
        return pay;
    }

    function giveToDealer(table, amount) {
        table.dealer.chips += Math.max(0, amount);
    }

    function compareHand(hand, dealerCards) {
        if (hand.surrendered) return 'surrender';
        const playerVal = handValue(hand.cards);
        const dealerVal = handValue(dealerCards);
        if (playerVal.bust) return 'lose';
        const playerBJ = isNatural(hand);
        const dealerBJ = isBlackjack(dealerCards);
        if (playerBJ && dealerBJ) return 'push';
        if (playerBJ) return 'blackjack';
        if (dealerBJ) return 'lose';
        if (dealerVal.bust) return 'win';
        if (playerVal.total > dealerVal.total) return 'win';
        if (playerVal.total < dealerVal.total) return 'lose';
        return 'push';
    }

    function settleHand(table, hand) {
        const result = compareHand(hand, table.dealerHand.cards);
        const bet = hand.bet;
        let playerDelta = 0;
        let note = result;
        if (result === 'blackjack') {
            const win = Math.floor(bet * (table.settings.blackjackPayout || 1.5));
            const paid = takeFromDealer(table, win);
            table.player.chips += bet + paid;
            playerDelta = paid;
            note = paid < win ? 'blackjack (short pay)' : 'blackjack 3:2';
        } else if (result === 'win') {
            const paid = takeFromDealer(table, bet);
            table.player.chips += bet + paid;
            playerDelta = paid;
            note = paid < bet ? 'win (short pay)' : 'win 1:1';
        } else if (result === 'push') {
            table.player.chips += bet;
            note = 'push';
        } else if (result === 'surrender') {
            const half = Math.floor(bet / 2);
            table.player.chips += half;
            giveToDealer(table, bet - half);
            playerDelta = -(bet - half);
            note = 'surrender';
        } else {
            giveToDealer(table, bet);
            playerDelta = -bet;
            note = hand.busted ? 'bust' : 'lose';
        }
        return {
            result,
            note,
            bet,
            playerDelta,
            total: handValue(hand.cards).total,
            cards: hand.cards.slice()
        };
    }

    function settleInsurance(table) {
        if (!table.insuranceBet) return null;
        const ins = table.insuranceBet;
        table.insuranceBet = 0;
        if (isBlackjack(table.dealerHand.cards)) {
            const win = ins * 2;
            const paid = takeFromDealer(table, win);
            table.player.chips += ins + paid;
            return { taken: true, won: true, amount: paid };
        }
        giveToDealer(table, ins);
        return { taken: true, won: false, amount: -ins };
    }

    function finishRound(table, extraMessage) {
        table.holeRevealed = true;
        const insurance = settleInsurance(table);
        const hands = table.hands.map(h => settleHand(table, h));
        table.lastSettlement = {
            dealerTotal: handValue(table.dealerHand.cards).total,
            dealerCards: table.dealerHand.cards.slice(),
            dealerBust: handValue(table.dealerHand.cards).bust,
            insurance,
            hands
        };
        const net = hands.reduce((s, h) => s + h.playerDelta, 0) + (insurance ? insurance.amount : 0);
        table.phase = 'complete';
        table.message = extraMessage || (net > 0 ? `You win $${net}` : net < 0 ? `You lose $${-net}` : 'Push');
        return { ok: true };
    }

    function playDealer(table) {
        table.holeRevealed = true;
        if (liveHands(table).length > 0) {
            while (dealerShouldHit(table.dealerHand.cards, table.settings.hitSoft17)) {
                table.dealerHand.cards.push(draw(table));
            }
        }
        return finishRound(table);
    }

    function afterDeal(table) {
        const up = upcard(table);
        const playerHand = table.hands[0];
        const playerBJ = isNatural(playerHand);
        if (up && up.rank === 'A') {
            table.phase = 'insurance';
            table.message = playerBJ
                ? 'Dealer shows Ace. Take even money or decline and peek for blackjack.'
                : 'Dealer shows Ace. Insurance?';
            return { ok: true };
        }
        if (up && isTenValue(up.rank) && isBlackjack(table.dealerHand.cards)) {
            return finishRound(table, 'Dealer has blackjack.');
        }
        if (playerBJ) {
            return finishRound(table, 'Blackjack!');
        }
        table.phase = 'player';
        table.activeHand = 0;
        table.message = 'Your play — hit, stand, double, or split.';
        return { ok: true };
    }

    function dealInitial(table) {
        table.hands = [emptyHand(table.pendingBet)];
        table.pendingBet = 0;
        table.dealerHand.cards = [];
        table.holeRevealed = false;
        table.insuranceBet = 0;
        table.activeHand = 0;
        table.hands[0].cards.push(draw(table));
        table.dealerHand.cards.push(draw(table));
        table.hands[0].cards.push(draw(table));
        table.dealerHand.cards.push(draw(table));
        return afterDeal(table);
    }

    function currentHand(table) {
        return table.hands[table.activeHand] || null;
    }

    function advanceHand(table) {
        const next = table.hands.findIndex((h, i) => i > table.activeHand && !h.stood && !h.busted && !h.surrendered);
        if (next >= 0) {
            table.activeHand = next;
            table.phase = 'player';
            table.message = table.hands.length > 1 ? `Playing split hand ${next + 1}.` : table.message;
            return { ok: true };
        }
        if (allHandsDone(table)) {
            table.phase = 'dealer';
            return playDealer(table);
        }
        return { ok: true };
    }

    function peekAfterInsurance(table) {
        if (isBlackjack(table.dealerHand.cards)) {
            return finishRound(table, 'Dealer has blackjack.');
        }
        if (isNatural(table.hands[0])) {
            return finishRound(table, 'Blackjack!');
        }
        table.phase = 'player';
        table.activeHand = 0;
        table.message = 'No dealer blackjack. Your play.';
        return { ok: true };
    }

    function startRound(table) {
        table.dealerHand.cards = [];
        table.hands = [];
        table.activeHand = 0;
        table.pendingBet = 0;
        table.insuranceBet = 0;
        table.holeRevealed = false;
        table.lastSettlement = null;
        if (!table.shoe || table.shoe.length < 40) {
            table.shoe = shuffle(createShoe(table.settings.decks));
        }
        table.phase = 'betting';
        table.message = `Place a bet (min $${table.settings.minBet}).`;
        return { ok: true };
    }

    function legalActions(table, role) {
        if (!table) return [];
        if (table.phase === 'complete') return ['next'];
        if (role === 'player' && table.phase === 'betting') return ['bet'];
        if (role === 'player' && table.phase === 'insurance') {
            const acts = ['no-insurance'];
            if (isNatural(table.hands[0])) acts.unshift('even-money');
            else acts.unshift('insurance');
            return acts;
        }
        if (role === 'player' && table.phase === 'player') {
            const hand = currentHand(table);
            if (!hand) return [];
            const acts = ['hit', 'stand'];
            const twoCards = hand.cards.length === 2;
            if (twoCards && !hand.splitAces && table.player.chips >= hand.bet) {
                if (!hand.fromSplit || table.settings.das) acts.push('double');
            }
            if (twoCards && isPair(hand.cards) && table.hands.length < table.settings.maxHands && table.player.chips >= hand.bet) {
                if (!(hand.splitAces && !table.settings.resplitAces)) acts.push('split');
            }
            if (table.settings.surrender && twoCards && !hand.fromSplit) acts.push('surrender');
            if (hand.splitAces) return ['stand'];
            return acts;
        }
        return [];
    }

    function roleOf(table, actorId) {
        if (!actorId) return null;
        if (actorId === table.player.id || actorId === 'player') return 'player';
        if (actorId === table.dealer.id || actorId === 'dealer') return 'dealer';
        return null;
    }

    function apply(table, actorId, action, payload) {
        payload = payload || {};
        const role = roleOf(table, actorId);
        if (action === 'start' || action === 'next') {
            if (table.phase !== 'waiting' && table.phase !== 'complete') {
                return { ok: false, error: 'Round still in progress' };
            }
            return startRound(table);
        }
        const allowed = legalActions(table, role);
        if (!allowed.includes(action)) {
            return { ok: false, error: 'Illegal action' };
        }

        if (action === 'bet') {
            const min = table.settings.minBet || 10;
            const amount = Math.floor(Number(payload.amount));
            if (!Number.isFinite(amount) || amount < min) {
                return { ok: false, error: `Minimum bet is $${min}` };
            }
            if (amount > table.player.chips) {
                return { ok: false, error: 'Not enough chips' };
            }
            table.player.chips -= amount;
            table.pendingBet = amount;
            return dealInitial(table);
        }

        if (action === 'insurance') {
            const bet = table.hands[0].bet;
            const cost = Math.floor(bet / 2);
            if (cost < 1 || table.player.chips < cost) {
                return { ok: false, error: 'Not enough chips for insurance' };
            }
            table.player.chips -= cost;
            table.insuranceBet = cost;
            return peekAfterInsurance(table);
        }

        if (action === 'no-insurance') {
            return peekAfterInsurance(table);
        }

        if (action === 'even-money') {
            const bet = table.hands[0].bet;
            const paid = takeFromDealer(table, bet);
            table.player.chips += bet + paid;
            table.holeRevealed = true;
            table.lastSettlement = {
                dealerTotal: handValue(table.dealerHand.cards).total,
                dealerCards: table.dealerHand.cards.slice(),
                evenMoney: true,
                hands: [{ result: 'win', note: 'even money', bet, playerDelta: paid, total: 21, cards: table.hands[0].cards.slice() }]
            };
            table.phase = 'complete';
            table.message = 'Even money — paid 1:1.';
            return { ok: true };
        }

        const hand = currentHand(table);
        if (!hand) return { ok: false, error: 'No active hand' };

        if (action === 'hit') {
            hand.cards.push(draw(table));
            const v = handValue(hand.cards);
            if (v.bust) {
                hand.busted = true;
                hand.stood = true;
                table.message = `Bust (${v.total}).`;
                return advanceHand(table);
            }
            if (v.total === 21) {
                hand.stood = true;
                table.message = '21.';
                return advanceHand(table);
            }
            table.message = `Hand total ${v.total}${v.soft ? ' (soft)' : ''}.`;
            return { ok: true };
        }

        if (action === 'stand') {
            hand.stood = true;
            table.message = `Stand on ${handValue(hand.cards).total}.`;
            return advanceHand(table);
        }

        if (action === 'double') {
            if (table.player.chips < hand.bet) return { ok: false, error: 'Not enough chips to double' };
            table.player.chips -= hand.bet;
            hand.bet *= 2;
            hand.doubled = true;
            hand.cards.push(draw(table));
            const v = handValue(hand.cards);
            if (v.bust) hand.busted = true;
            hand.stood = true;
            table.message = v.bust ? `Double bust (${v.total}).` : `Double — ${v.total}.`;
            return advanceHand(table);
        }

        if (action === 'split') {
            if (table.player.chips < hand.bet) return { ok: false, error: 'Not enough chips to split' };
            table.player.chips -= hand.bet;
            const splitAces = hand.cards[0].rank === 'A';
            const moved = hand.cards.pop();
            const next = emptyHand(hand.bet);
            next.cards = [moved];
            next.fromSplit = true;
            next.splitAces = splitAces;
            hand.fromSplit = true;
            hand.splitAces = splitAces;
            hand.cards.push(draw(table));
            next.cards.push(draw(table));
            table.hands.splice(table.activeHand + 1, 0, next);
            if (splitAces) {
                hand.stood = true;
                next.stood = true;
                table.message = 'Split Aces — one card each.';
                return advanceHand(table);
            }
            table.message = 'Split. Play the first hand.';
            return { ok: true };
        }

        if (action === 'surrender') {
            hand.surrendered = true;
            hand.stood = true;
            table.message = 'Surrender — half the bet is returned.';
            return advanceHand(table);
        }

        return { ok: false, error: 'Unknown action' };
    }

    function visibleDealerCards(table, viewerId) {
        const cards = table.dealerHand.cards || [];
        if (table.holeRevealed || viewerId === table.dealer.id || viewerId === 'dealer') {
            return cards.slice();
        }
        return cards.map((c, i) => (i === 0 ? c : { hidden: true }));
    }

    function viewFor(table, viewerId) {
        const role = roleOf(table, viewerId) || 'player';
        const dealerCards = visibleDealerCards(table, viewerId);
        const showDealerTotal = table.holeRevealed || role === 'dealer';
        return {
            gameMode: 'blackjack',
            phase: table.phase,
            gamePhase: table.phase,
            holeRevealed: table.holeRevealed,
            message: table.message,
            lastSettlement: table.lastSettlement,
            legalActions: legalActions(table, role),
            activeHand: table.activeHand,
            pendingBet: table.pendingBet,
            insuranceBet: table.insuranceBet,
            minBet: table.settings.minBet,
            settings: table.settings,
            dealer: {
                id: table.dealer.id,
                name: table.dealer.name,
                chips: table.dealer.chips,
                isAI: !!table.dealer.isAI,
                cards: dealerCards,
                total: showDealerTotal ? handValue(table.dealerHand.cards).total : handValue(dealerCards.filter(c => !c.hidden)).total,
                upcard: upcard(table)
            },
            player: {
                id: table.player.id,
                name: table.player.name,
                chips: table.player.chips,
                hands: table.hands.map(h => ({
                    ...h,
                    total: handValue(h.cards).total,
                    soft: handValue(h.cards).soft,
                    blackjack: isNatural(h)
                }))
            }
        };
    }

    const RULES_TEXT = [
        {
            title: 'The Game',
            body: 'One player vs one dealer. Beat the dealer without going over 21. This table uses a 6-deck shoe and American hole-card rules.'
        },
        {
            title: 'Card Values',
            body: '2–10 are face value. Jack, Queen, and King count as 10. Ace counts as 11 or 1, whichever keeps the hand at 21 or under (a soft hand uses Ace as 11).'
        },
        {
            title: 'The Deal',
            body: 'After you bet, each side gets two cards. Yours are face up. The dealer shows one upcard and keeps a hole card hidden. If the upcard is an Ace or a 10-value, the dealer peeks for blackjack before you play.'
        },
        {
            title: 'Blackjack',
            body: 'An Ace plus a 10-value on the first two cards is a natural blackjack and pays 3:2. A natural beats a 21 made with three or more cards. If both you and the dealer have a natural, the hand is a push.'
        },
        {
            title: 'Insurance & Even Money',
            body: 'When the dealer shows an Ace you may buy insurance for half your bet. Insurance pays 2:1 if the dealer has blackjack. If you already have a natural, you may take even money (paid 1:1 immediately) instead of risking a push.'
        },
        {
            title: 'Player Actions',
            body: 'Hit (take a card), stand, double down (double the bet, take exactly one card), split a pair of the same rank, or late-surrender the original two-card hand for half your bet back. Split Aces receive one card each. A 10+Ace after a split is 21, not a natural.'
        },
        {
            title: 'Dealer Rules',
            body: 'The dealer stands on all 17s, including soft 17. The dealer hits 16 or less. If every player hand has busted or surrendered, the dealer does not draw further cards.'
        },
        {
            title: 'Settlement',
            body: 'Bust loses immediately. If the dealer busts, remaining hands win even money. Higher total wins even money. Matching totals push. Naturals pay 3:2. The host is the dealer bank; chips move between player and dealer.'
        }
    ];

    return {
        SUITS,
        RANKS,
        DEFAULT_BJ_SETTINGS,
        RULES_TEXT,
        createShoe,
        shuffle,
        createTable,
        startRound,
        apply,
        legalActions,
        handValue,
        isBlackjack,
        isNatural,
        isPair,
        isTenValue,
        dealerShouldHit,
        compareHand,
        viewFor,
        visibleDealerCards,
        roleOf
    };
}));
