const assert = require('assert');
const { pickCappedImposter, MAX_IMPOSTER_TURNS } = require('./public/imposter/pick.js');

assert.strictEqual(MAX_IMPOSTER_TURNS, 2);

function play(nPlayers, rounds, seedCounts) {
    const ids = Array.from({ length: nPlayers }, (_, i) => 'p' + i);
    const counts = seedCounts || {};
    const picks = [];
    for (let r = 0; r < rounds; r++) {
        picks.push(pickCappedImposter(ids, counts));
    }
    return { ids, counts, picks };
}

function tally(picks) {
    const t = {};
    for (const p of picks) t[p] = (t[p] || 0) + 1;
    return t;
}

// 3 players, 6 rounds: each is faker exactly twice
{
    const { picks, counts } = play(3, 6);
    const t = tally(picks);
    assert.deepStrictEqual(Object.keys(t).sort(), ['p0', 'p1', 'p2']);
    assert.strictEqual(t.p0, 2);
    assert.strictEqual(t.p1, 2);
    assert.strictEqual(t.p2, 2);
    assert.strictEqual(counts.p0, 2);
    assert.strictEqual(counts.p1, 2);
    assert.strictEqual(counts.p2, 2);
}

// A player at the cap is never chosen while anyone else is under it
{
    const ids = ['a', 'b', 'c'];
    const counts = { a: 2, b: 0, c: 1 };
    for (let i = 0; i < 200; i++) {
        const snapshot = { ...counts };
        const picked = pickCappedImposter(ids, snapshot);
        assert.notStrictEqual(picked, 'a', 'capped player was picked while others were eligible');
    }
}

// 4 players, 5 rounds: nobody reaches 3
{
    for (let trial = 0; trial < 500; trial++) {
        const { picks } = play(4, 5);
        const t = tally(picks);
        for (const id of Object.keys(t)) {
            assert.ok(t[id] <= 2, `${id} was faker ${t[id]} times in 5 rounds`);
        }
    }
}

// After everyone is capped, a new cycle can pick anyone (game continues)
{
    const ids = ['a', 'b', 'c'];
    const counts = { a: 2, b: 2, c: 2 };
    const picked = pickCappedImposter(ids, counts);
    assert.ok(ids.includes(picked));
    assert.strictEqual(counts[picked], 1);
    for (const id of ids) {
        if (id !== picked) assert.strictEqual(counts[id], 0);
    }
}

// Map-backed counts (online rooms)
{
    const ids = ['s1', 's2', 's3'];
    const counts = new Map([['s1', 2], ['s2', 0], ['s3', 0]]);
    for (let i = 0; i < 100; i++) {
        const m = new Map(counts);
        const picked = pickCappedImposter(ids, m);
        assert.notStrictEqual(picked, 's1');
    }
}

// Empty list
assert.strictEqual(pickCappedImposter([], {}), null);

console.log('imposter-pick tests passed');
