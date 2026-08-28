const assert = require('assert');
const H = require('../games/poker/holdem-rules');

function c(rank, suit) {
    return { rank, suit };
}

function names(cards) {
    return H.evaluateBestHand(cards).name;
}

function cmp(a, b) {
    return H.compareHands(H.evaluateBestHand(a), H.evaluateBestHand(b));
}

// Best 5 from 7 — flush over pair
assert.strictEqual(
    H.evaluateBestHand([
        c('A', 'hearts'), c('9', 'hearts'),
        c('2', 'hearts'), c('7', 'hearts'), c('K', 'hearts'), c('9', 'spades'), c('3', 'clubs')
    ]).rank,
    H.HAND_RANKS.FLUSH
);

// Wheel straight A-5
const wheel = H.evaluateBestHand([
    c('A', 'hearts'), c('2', 'clubs'), c('3', 'diamonds'), c('4', 'spades'), c('5', 'hearts')
]);
assert.strictEqual(wheel.rank, H.HAND_RANKS.STRAIGHT);
assert.strictEqual(wheel.tiebreakers[0], 5);

// Royal flush beats straight flush
assert.ok(cmp(
    [c('A', 'spades'), c('K', 'spades'), c('Q', 'spades'), c('J', 'spades'), c('10', 'spades')],
    [c('9', 'spades'), c('K', 'spades'), c('Q', 'spades'), c('J', 'spades'), c('10', 'spades')]
) > 0);

// Pair kickers: AA K beats AA Q
assert.ok(cmp(
    [c('A', 'hearts'), c('A', 'spades'), c('K', 'clubs'), c('7', 'diamonds'), c('2', 'hearts')],
    [c('A', 'clubs'), c('A', 'diamonds'), c('Q', 'clubs'), c('7', 'spades'), c('2', 'clubs')]
) > 0);

// Playing the board — identical community hands tie
const board = [c('A', 'hearts'), c('K', 'clubs'), c('Q', 'diamonds'), c('J', 'spades'), c('9', 'hearts')];
assert.strictEqual(
    cmp([...board, c('2', 'clubs'), c('3', 'clubs')], [...board, c('4', 'diamonds'), c('5', 'diamonds')]),
    0
);

// Full house over trips
assert.ok(cmp(
    [c('8', 'hearts'), c('8', 'spades'), c('8', 'clubs'), c('4', 'diamonds'), c('4', 'hearts')],
    [c('A', 'hearts'), c('A', 'spades'), c('A', 'clubs'), c('K', 'diamonds'), c('Q', 'hearts')]
) > 0);

// Min raise: after 20 BB, raise to 60 is +40, next min is 100
assert.strictEqual(H.minRaiseTo(60, 40, { bigBlind: 20 }), 100);
assert.strictEqual(H.minRaiseTo(0, 20, { bigBlind: 20 }), 20);

// Side pots + split
const players = [
    { id: 'a', name: 'A', chips: 0, committed: 50, folded: false, cards: [c('2', 'hearts'), c('2', 'clubs')] },
    { id: 'b', name: 'B', chips: 0, committed: 100, folded: false, cards: [c('A', 'hearts'), c('A', 'spades')] },
    { id: 'c', name: 'C', chips: 0, committed: 100, folded: false, cards: [c('K', 'hearts'), c('K', 'spades')] }
];
const community = [c('7', 'diamonds'), c('8', 'clubs'), c('9', 'hearts'), c('3', 'spades'), c('J', 'diamonds')];
const awards = H.awardPots(players, community, 0);
assert.strictEqual(awards.length, 2);
assert.strictEqual(awards[0].label, 'Main Pot');
assert.strictEqual(awards[0].amount, 150);
assert.strictEqual(awards[0].winners[0].playerId, 'b');
assert.strictEqual(awards[1].amount, 100);
assert.strictEqual(awards[1].winners[0].playerId, 'b');
assert.strictEqual(players[1].chips, 250);

// Heads-up first to act is dealer/SB on every street
const hu = [
    { chips: 100, folded: false },
    { chips: 100, folded: false }
];
assert.strictEqual(H.firstToActIndex(hu, 0, 'preflop'), 0);
assert.strictEqual(H.firstToActIndex(hu, 0, 'flop'), 0);

console.log('OK — Hold\'em rules checks passed');
console.log('Sample names:', names([c('A', 'hearts'), c('K', 'hearts'), c('Q', 'hearts'), c('J', 'hearts'), c('10', 'hearts')]));
