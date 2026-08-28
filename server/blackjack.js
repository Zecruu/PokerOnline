const BlackjackRules = require('../games/poker/blackjack-rules');

function isBlackjackRoom(room) {
    return !!(room && room.gameMode === 'blackjack');
}

function createBlackjackTable(room) {
    const host = room.players.find(p => p.isHost);
    const guest = room.players.find(p => !p.isHost);
    if (!host || !guest) return { error: 'Blackjack needs one dealer (host) and one player' };
    const table = BlackjackRules.createTable({
        playerId: guest.oderId,
        playerName: guest.name,
        dealerId: host.oderId,
        dealerName: host.name,
        startingChips: room.settings.startingChips || 1000,
        minBet: room.settings.minBet || 10,
        hitSoft17: !!room.settings.hitSoft17,
        das: room.settings.das !== false,
        surrender: room.settings.surrender !== false,
        allowBuyBack: room.settings.allowBuyBack !== false,
        maxBuyBacks: room.settings.maxBuyBacks || 3,
        buyBackAmount: room.settings.buyBackAmount || 1000
    });
    table.player.chips = guest.chips;
    table.dealer.chips = host.chips;
    BlackjackRules.startRound(table);
    room.bj = table;
    syncBlackjackPlayers(room);
    return { ok: true };
}

function syncBlackjackPlayers(room) {
    const t = room.bj;
    if (!t) return;
    const playerBet = (t.hands || []).reduce((sum, h) => sum + (h.bet || 0), 0) + (t.pendingBet || 0) + (t.insuranceBet || 0);
    room.players.forEach(p => {
        if (p.oderId === t.player.id) {
            p.chips = t.player.chips;
            p.bet = playerBet;
            p.cards = (t.hands[t.activeHand] && t.hands[t.activeHand].cards) || [];
            p.isActive = t.phase === 'betting' || t.phase === 'insurance' || t.phase === 'player';
            p.isDealer = false;
            p.folded = false;
        } else if (p.oderId === t.dealer.id) {
            p.chips = t.dealer.chips;
            p.bet = 0;
            p.cards = t.dealerHand.cards || [];
            p.isActive = false;
            p.isDealer = true;
            p.folded = false;
        }
    });
    room.gamePhase = t.phase;
    room.pot = playerBet;
}

function applyBlackjackAction(room, actorId, action, amount) {
    if (!room.bj) return { ok: false, error: 'Blackjack table not started' };
    const result = BlackjackRules.apply(room.bj, actorId, action, { amount });
    if (result.ok) syncBlackjackPlayers(room);
    return result;
}

function buyBackBlackjack(room, playerId) {
    const t = room.bj;
    if (!t) return { ok: false, error: 'No table' };
    const amount = room.settings.buyBackAmount || t.settings.buyBackAmount || 1000;
    const max = room.settings.maxBuyBacks || t.settings.maxBuyBacks || 3;
    if (playerId === t.player.id) {
        if (t.player.chips > 0) return { ok: false, error: 'You still have chips' };
        if (t.player.buyBacksUsed >= max) return { ok: false, error: 'Max buy-backs reached' };
        t.player.chips = amount;
        t.player.buyBacksUsed += 1;
        syncBlackjackPlayers(room);
        return { ok: true, chips: t.player.chips, buyBacksRemaining: max - t.player.buyBacksUsed };
    }
    if (playerId === t.dealer.id) {
        if (t.dealer.chips > 0) return { ok: false, error: 'You still have chips' };
        if (t.dealer.buyBacksUsed >= max) return { ok: false, error: 'Max buy-backs reached' };
        t.dealer.chips = amount;
        t.dealer.buyBacksUsed += 1;
        syncBlackjackPlayers(room);
        return { ok: true, chips: t.dealer.chips, buyBacksRemaining: max - t.dealer.buyBacksUsed };
    }
    return { ok: false, error: 'Seat not found' };
}

function sanitizeBlackjackRoom(room, viewerId) {
    const view = BlackjackRules.viewFor(room.bj, viewerId);
    return {
        roomCode: room.roomCode,
        gameMode: 'blackjack',
        gamePhase: view.phase,
        pot: room.pot || 0,
        settings: room.settings,
        chatMessages: room.chatMessages || [],
        players: room.players.map(p => {
            const isDealer = p.oderId === room.bj.dealer.id;
            return {
                oderId: p.oderId,
                name: p.name,
                avatarId: p.avatarId,
                chips: isDealer ? view.dealer.chips : view.player.chips,
                bet: isDealer ? 0 : ((view.player.hands || []).reduce((s, h) => s + h.bet, 0) + (view.pendingBet || 0)),
                cards: isDealer ? view.dealer.cards : ((view.player.hands[view.activeHand] || view.player.hands[0] || {}).cards || []),
                folded: false,
                isHost: !!p.isHost,
                isActive: !isDealer && (view.phase === 'betting' || view.phase === 'insurance' || view.phase === 'player'),
                isAI: !!p.isAI,
                isDealer,
                isConnected: !!p.isConnected,
                buyBacksUsed: p.buyBacksUsed || 0
            };
        }),
        communityCards: [],
        bj: view
    };
}

function broadcastPoker(io, room, event, extra) {
    extra = extra || {};
    if (isBlackjackRoom(room) && room.bj) {
        room.players.forEach(p => {
            if (!p.odId || p.isAI) return;
            io.to(p.odId).emit(event, Object.assign({}, extra, {
                room: sanitizeBlackjackRoom(room, p.oderId)
            }));
        });
        return;
    }
}

module.exports = {
    BlackjackRules,
    isBlackjackRoom,
    createBlackjackTable,
    syncBlackjackPlayers,
    applyBlackjackAction,
    buyBackBlackjack,
    sanitizeBlackjackRoom,
    broadcastPoker
};
