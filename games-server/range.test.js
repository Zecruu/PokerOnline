const assert = require('assert');
const {
    RANGE_LO, RANGE_HI, MIN_WIDTH, MAX_WIDTH,
    rollRange, isInRange, scoreRound,
} = require('./public/range-1-10/range.js');

function seq(values) {
    let i = 0;
    return (min, max) => {
        const v = values[i++];
        assert.ok(v >= min && v <= max, `fixture ${v} outside ${min}-${max}`);
        return v;
    };
}

{
    const r = rollRange(seq([3, 6, 7])); // width 3, min 6 → 6-8, target 7
    assert.deepStrictEqual(r, { min: 6, max: 8, target: 7 });
}

{
    const r = rollRange(seq([3, 1, 2])); // 1-3, target 2
    assert.deepStrictEqual(r, { min: 1, max: 3, target: 2 });
}

{
    const r = rollRange(seq([3, 8, 10])); // 8-10, target 10
    assert.deepStrictEqual(r, { min: 8, max: 10, target: 10 });
}

for (let i = 0; i < 200; i++) {
    const r = rollRange();
    assert.ok(r.min >= RANGE_LO && r.max <= RANGE_HI);
    assert.ok(r.max - r.min + 1 >= MIN_WIDTH && r.max - r.min + 1 <= MAX_WIDTH);
    assert.ok(r.target >= r.min && r.target <= r.max);
}

assert.strictEqual(isInRange(6, 6, 8), true);
assert.strictEqual(isInRange(8, 6, 8), true);
assert.strictEqual(isInRange(5, 6, 8), false);
assert.strictEqual(isInRange(6.5, 6, 8), false);

{
    const scored = scoreRound(7, [
        { id: 'a', name: 'Ada', guess: 7 },
        { id: 'b', name: 'Bea', guess: 6 },
        { id: 'c', name: 'Cal', guess: 9 },
    ]);
    assert.strictEqual(scored[0].points, 3);
    assert.strictEqual(scored[0].exact, true);
    assert.strictEqual(scored[0].closest, true);
    assert.strictEqual(scored[1].points, 0);
    assert.strictEqual(scored[2].points, 0);
}

{
    const scored = scoreRound(4, [
        { id: 'a', name: 'Ada', guess: 2 },
        { id: 'b', name: 'Bea', guess: 6 },
        { id: 'c', name: 'Cal', guess: null },
    ]);
    assert.strictEqual(scored[0].points, 2);
    assert.strictEqual(scored[0].closest, true);
    assert.strictEqual(scored[1].points, 2);
    assert.strictEqual(scored[1].closest, true);
    assert.strictEqual(scored[2].points, 0);
    assert.strictEqual(scored[2].closest, false);
}

console.log('range tests passed');
