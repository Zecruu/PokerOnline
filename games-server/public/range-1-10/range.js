// Shared 1-10 Range rules for in-person (browser) and online (Node).
// The board is always integers 1..10. Each round rolls a contiguous
// range (width 2-4) and a secret target inside that range.

const RANGE_LO = 1;
const RANGE_HI = 10;
const MIN_WIDTH = 2;
const MAX_WIDTH = 4;
const POINTS_EXACT = 3;
const POINTS_CLOSEST = 2;

function randomInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

function rollRange(rng) {
    const pick = rng || randomInt;
    const width = pick(MIN_WIDTH, MAX_WIDTH);
    const min = pick(RANGE_LO, RANGE_HI - width + 1);
    const max = min + width - 1;
    const target = pick(min, max);
    return { min, max, target };
}

function isInRange(guess, min, max) {
    return Number.isInteger(guess) && guess >= min && guess <= max;
}

function scoreRound(target, guesses) {
    const scored = guesses.map((g) => {
        const guess = g.guess;
        if (!Number.isInteger(guess)) {
            return { ...g, dist: Infinity, points: 0, exact: false, closest: false };
        }
        const dist = Math.abs(guess - target);
        return { ...g, dist, points: 0, exact: dist === 0, closest: false };
    });

    const finite = scored.filter((s) => Number.isFinite(s.dist));
    if (finite.length === 0) return scored;

    const minDist = Math.min(...finite.map((s) => s.dist));
    for (const s of scored) {
        if (!Number.isFinite(s.dist)) continue;
        if (s.dist === minDist) {
            s.closest = true;
            s.points = s.exact ? POINTS_EXACT : POINTS_CLOSEST;
        }
    }
    return scored;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        RANGE_LO, RANGE_HI, MIN_WIDTH, MAX_WIDTH, POINTS_EXACT, POINTS_CLOSEST,
        randomInt, rollRange, isInRange, scoreRound,
    };
} else {
    globalThis.RangeGame = {
        RANGE_LO, RANGE_HI, MIN_WIDTH, MAX_WIDTH, POINTS_EXACT, POINTS_CLOSEST,
        randomInt, rollRange, isInRange, scoreRound,
    };
}
