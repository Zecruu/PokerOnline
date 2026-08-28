const assert = require('assert');
const BJ = require('../games/poker/blackjack-rules');

function card(rank, suit) {
    return { rank, suit: suit || 'spades' };
}

function shoeFromDeal(order) {
    // draw() pops from the end, so reverse the intended deal sequence.
    return order.slice().reverse();
}

function freshTable(overrides) {
    const table = BJ.createTable({
        startingChips: 1000,
        minBet: 10,
        playerName: 'P',
        dealerName: 'D',
        ...(overrides || {})
    });
    BJ.startRound(table);
    return table;
}

function dealWith(table, cards) {
    table.shoe = shoeFromDeal(cards);
    const r = BJ.apply(table, 'player', 'bet', { amount: 100 });
    assert.ok(r.ok, r.error);
}

function test(name, fn) {
    fn();
    console.log(`  ok  ${name}`);
}

console.log('Blackjack rules');

test('hand values: hard, soft, bust, ace adjust', () => {
    assert.deepStrictEqual(BJ.handValue([card('7'), card('9')]), { total: 16, soft: false, bust: false });
    assert.deepStrictEqual(BJ.handValue([card('A'), card('6')]), { total: 17, soft: true, bust: false });
    assert.deepStrictEqual(BJ.handValue([card('A'), card('6'), card('K')]), { total: 17, soft: false, bust: false });
    assert.deepStrictEqual(BJ.handValue([card('K'), card('Q'), card('5')]), { total: 25, soft: false, bust: true });
    assert.strictEqual(BJ.handValue([card('A'), card('A'), card('A')]).total, 13);
});

test('natural blackjack is only a two-card 21', () => {
    assert.strictEqual(BJ.isBlackjack([card('A'), card('K')]), true);
    assert.strictEqual(BJ.isBlackjack([card('A'), card('10')]), true);
    assert.strictEqual(BJ.isBlackjack([card('A'), card('9'), card('A')]), false);
    assert.strictEqual(BJ.isNatural({ cards: [card('A'), card('Q')], fromSplit: false }), true);
    assert.strictEqual(BJ.isNatural({ cards: [card('A'), card('Q')], fromSplit: true }), false);
});

test('dealer S17 stands on soft 17; H17 hits', () => {
    const soft17 = [card('A'), card('6')];
    assert.strictEqual(BJ.dealerShouldHit(soft17, false), false);
    assert.strictEqual(BJ.dealerShouldHit(soft17, true), true);
    assert.strictEqual(BJ.dealerShouldHit([card('K'), card('6')], false), true);
    assert.strictEqual(BJ.dealerShouldHit([card('K'), card('7')], false), false);
    assert.strictEqual(BJ.dealerShouldHit([card('A'), card('7')], true), false);
});

test('player blackjack pays 3:2 when dealer does not have blackjack', () => {
    const table = freshTable();
    // deal: P A, D 9, P K, D 5
    dealWith(table, [card('A'), card('9'), card('K'), card('5')]);
    assert.strictEqual(table.phase, 'complete');
    assert.strictEqual(table.player.chips, 1000 - 100 + 100 + 150);
    assert.strictEqual(table.dealer.chips, 1000 - 150);
    assert.strictEqual(table.lastSettlement.hands[0].result, 'blackjack');
});

test('both naturals push after insurance is declined', () => {
    const table = freshTable();
    // P A, D A, P K, D Q — Ace upcard offers insurance first
    dealWith(table, [card('A'), card('A'), card('K'), card('Q')]);
    assert.strictEqual(table.phase, 'insurance');
    assert.ok(BJ.apply(table, 'player', 'no-insurance').ok);
    assert.strictEqual(table.phase, 'complete');
    assert.strictEqual(table.lastSettlement.hands[0].result, 'push');
    assert.strictEqual(table.player.chips, 1000);
    assert.strictEqual(table.dealer.chips, 1000);
});

test('dealer blackjack on 10-value upcard wins immediately', () => {
    const table = freshTable();
    // P 8, D K, P 7, D A
    dealWith(table, [card('8'), card('K'), card('7'), card('A')]);
    assert.strictEqual(table.phase, 'complete');
    assert.strictEqual(table.lastSettlement.hands[0].result, 'lose');
    assert.strictEqual(table.player.chips, 900);
    assert.strictEqual(table.dealer.chips, 1100);
});

test('insurance pays 2:1 when dealer has blackjack', () => {
    const table = freshTable();
    // P 9, D A, P 7, D K
    dealWith(table, [card('9'), card('A'), card('7'), card('K')]);
    assert.strictEqual(table.phase, 'insurance');
    assert.ok(BJ.apply(table, 'player', 'insurance').ok);
    assert.strictEqual(table.phase, 'complete');
    // bet 100 lost, insurance 50 wins 100 → net 0
    assert.strictEqual(table.player.chips, 1000);
    assert.strictEqual(table.dealer.chips, 1000);
    assert.strictEqual(table.lastSettlement.insurance.won, true);
});

test('insurance loses when dealer does not have blackjack', () => {
    const table = freshTable();
    dealWith(table, [card('9'), card('A'), card('7'), card('5')]);
    BJ.apply(table, 'player', 'insurance');
    assert.strictEqual(table.phase, 'player');
    assert.strictEqual(table.player.chips, 1000 - 100 - 50);
    BJ.apply(table, 'player', 'stand');
    assert.strictEqual(table.lastSettlement.insurance.won, false);
});

test('even money pays 1:1 without peek risk', () => {
    const table = freshTable();
    dealWith(table, [card('A'), card('A'), card('K'), card('5')]);
    assert.ok(BJ.legalActions(table, 'player').includes('even-money'));
    assert.ok(BJ.apply(table, 'player', 'even-money').ok);
    assert.strictEqual(table.phase, 'complete');
    assert.strictEqual(table.player.chips, 1100);
    assert.strictEqual(table.dealer.chips, 900);
});

test('hit until bust then lose', () => {
    const table = freshTable();
    // P 9, D 6, P 7, D 10 then player hits K
    const extra = [card('K')];
    table.shoe = shoeFromDeal([card('9'), card('6'), card('7'), card('10'), ...extra]);
    BJ.apply(table, 'player', 'bet', { amount: 100 });
    assert.strictEqual(table.phase, 'player');
    BJ.apply(table, 'player', 'hit');
    assert.strictEqual(table.phase, 'complete');
    assert.strictEqual(table.lastSettlement.hands[0].note, 'bust');
    assert.strictEqual(table.player.chips, 900);
});

test('dealer draws to 17 and player 18 wins', () => {
    const table = freshTable();
    // P 10, D 6, P 8, D 5  then dealer draws 6 → 17
    table.shoe = shoeFromDeal([card('10'), card('6'), card('8'), card('5'), card('6')]);
    BJ.apply(table, 'player', 'bet', { amount: 100 });
    BJ.apply(table, 'player', 'stand');
    assert.strictEqual(table.phase, 'complete');
    assert.strictEqual(table.lastSettlement.dealerTotal, 17);
    assert.strictEqual(table.lastSettlement.hands[0].result, 'win');
    assert.strictEqual(table.player.chips, 1100);
});

test('dealer busts, player wins', () => {
    const table = freshTable();
    table.shoe = shoeFromDeal([card('10'), card('6'), card('9'), card('9'), card('K')]);
    BJ.apply(table, 'player', 'bet', { amount: 100 });
    BJ.apply(table, 'player', 'stand');
    assert.strictEqual(table.lastSettlement.dealerBust, true);
    assert.strictEqual(table.lastSettlement.hands[0].result, 'win');
});

test('push on matching totals', () => {
    const table = freshTable();
    table.shoe = shoeFromDeal([card('10'), card('9'), card('9'), card('10')]);
    BJ.apply(table, 'player', 'bet', { amount: 100 });
    BJ.apply(table, 'player', 'stand');
    assert.strictEqual(table.lastSettlement.hands[0].result, 'push');
    assert.strictEqual(table.player.chips, 1000);
});

test('double down takes one card and stands', () => {
    const table = freshTable();
    table.shoe = shoeFromDeal([card('5'), card('6'), card('6'), card('10'), card('9')]);
    BJ.apply(table, 'player', 'bet', { amount: 100 });
    assert.ok(BJ.legalActions(table, 'player').includes('double'));
    BJ.apply(table, 'player', 'double');
    assert.strictEqual(table.hands[0].cards.length, 3);
    assert.strictEqual(table.hands[0].bet, 200);
    assert.strictEqual(table.phase, 'complete');
    assert.strictEqual(table.lastSettlement.hands[0].result, 'win');
    assert.strictEqual(table.player.chips, 1200);
});

test('late surrender returns half the bet', () => {
    const table = freshTable();
    table.shoe = shoeFromDeal([card('10'), card('9'), card('6'), card('7')]);
    BJ.apply(table, 'player', 'bet', { amount: 100 });
    assert.ok(BJ.legalActions(table, 'player').includes('surrender'));
    BJ.apply(table, 'player', 'surrender');
    assert.strictEqual(table.phase, 'complete');
    assert.strictEqual(table.player.chips, 950);
    assert.strictEqual(table.dealer.chips, 1050);
});

test('split pair plays two hands; split 10+A is 21 not blackjack', () => {
    const table = freshTable();
    // P 8, D 6, P 8, D 9  then first hand A, second hand 3
    table.shoe = shoeFromDeal([card('8'), card('6'), card('8'), card('9'), card('A'), card('3'), card('2')]);
    BJ.apply(table, 'player', 'bet', { amount: 100 });
    assert.ok(BJ.apply(table, 'player', 'split').ok);
    assert.strictEqual(table.hands.length, 2);
    assert.strictEqual(table.hands[0].cards[1].rank, 'A');
    assert.strictEqual(BJ.isNatural(table.hands[0]), false);
    assert.strictEqual(table.hands[0].total || BJ.handValue(table.hands[0].cards).total, 19);
    BJ.apply(table, 'player', 'stand');
    BJ.apply(table, 'player', 'stand');
    assert.strictEqual(table.phase, 'complete');
    assert.strictEqual(table.lastSettlement.hands[0].result, 'win');
    assert.strictEqual(table.lastSettlement.hands[1].result, 'lose');
    assert.strictEqual(table.player.chips, 1000);
});

test('split Aces get one card each and cannot hit', () => {
    const table = freshTable();
    table.shoe = shoeFromDeal([card('A'), card('6'), card('A'), card('9'), card('9'), card('8'), card('2')]);
    BJ.apply(table, 'player', 'bet', { amount: 100 });
    BJ.apply(table, 'player', 'split');
    assert.strictEqual(table.hands[0].splitAces, true);
    assert.strictEqual(table.hands[0].cards.length, 2);
    assert.strictEqual(table.hands[1].cards.length, 2);
    assert.strictEqual(table.phase, 'complete');
});

test('dealer does not draw when player busts', () => {
    const table = freshTable();
    table.shoe = shoeFromDeal([card('K'), card('6'), card('6'), card('5'), card('K'), card('K')]);
    BJ.apply(table, 'player', 'bet', { amount: 100 });
    BJ.apply(table, 'player', 'hit');
    assert.strictEqual(table.phase, 'complete');
    assert.strictEqual(table.dealerHand.cards.length, 2);
});

test('hidden hole card is hidden from the player view', () => {
    const table = freshTable();
    dealWith(table, [card('9'), card('A'), card('7'), card('5')]);
    const playerView = BJ.viewFor(table, table.player.id);
    assert.strictEqual(playerView.dealer.cards[0].rank, 'A');
    assert.strictEqual(playerView.dealer.cards[1].hidden, true);
    const dealerView = BJ.viewFor(table, table.dealer.id);
    assert.strictEqual(dealerView.dealer.cards[1].rank, '5');
});

test('min bet and illegal actions are rejected', () => {
    const table = freshTable();
    assert.strictEqual(BJ.apply(table, 'player', 'bet', { amount: 5 }).ok, false);
    assert.strictEqual(BJ.apply(table, 'player', 'hit').ok, false);
    BJ.apply(table, 'player', 'bet', { amount: 10 });
});

test('next starts a new betting round', () => {
    const table = freshTable();
    dealWith(table, [card('A'), card('9'), card('K'), card('5')]);
    assert.strictEqual(table.phase, 'complete');
    assert.ok(BJ.apply(table, 'dealer', 'next').ok);
    assert.strictEqual(table.phase, 'betting');
    assert.strictEqual(table.hands.length, 0);
});

console.log('All blackjack rule tests passed.');
