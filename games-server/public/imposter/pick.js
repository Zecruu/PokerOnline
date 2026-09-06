// Shared Imposter picker for in-person (browser) and online (Node).
// Nobody is the faker more than MAX_IMPOSTER_TURNS times in a cycle.
// When every current player has hit the cap, counts reset and a new cycle starts.

const MAX_IMPOSTER_TURNS = 2;

function readCount(counts, id) {
    if (counts instanceof Map) return counts.get(id) || 0;
    return counts[id] || 0;
}

function writeCount(counts, id, value) {
    if (counts instanceof Map) counts.set(id, value);
    else counts[id] = value;
}

function pickCappedImposter(ids, counts, maxTimes) {
    const cap = maxTimes == null ? MAX_IMPOSTER_TURNS : maxTimes;
    if (!ids || !ids.length) return null;

    let eligible = ids.filter((id) => readCount(counts, id) < cap);
    if (eligible.length === 0) {
        for (const id of ids) writeCount(counts, id, 0);
        eligible = ids.slice();
    }

    const picked = eligible[Math.floor(Math.random() * eligible.length)];
    writeCount(counts, picked, readCount(counts, picked) + 1);
    return picked;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { pickCappedImposter, MAX_IMPOSTER_TURNS };
} else {
    globalThis.pickCappedImposter = pickCappedImposter;
    globalThis.MAX_IMPOSTER_TURNS = MAX_IMPOSTER_TURNS;
}
