const assert = require("assert");
const { CARDS, rollOffers, BY_ID } = require("./cards.js");

assert.ok(CARDS.length >= 18, "need a full first-pass card pool");
assert.ok(CARDS.every((c) => c.id && c.name && c.apply && c.rarity && c.classId));

const necro = CARDS.filter((c) => c.classId === "necromancer");
const gold = necro.filter((c) => c.rarity === "gold");
const prism = necro.filter((c) => c.rarity === "prismatic");
assert.ok(gold.length >= 6, "need several necro golds");
assert.ok(prism.length >= 4, "need prismatic class finishers");

const fakeState = () => ({
  player: {
    moveMult: 1, maxHp: 100, hp: 80, crit: 0, magnetMult: 1,
    atkSpeedMult: 1, atkDmgMult: 1, dr: 0, maxMinions: 6,
    raiseInterval: 2, minionDmgMult: 1, minionLifesteal: 0,
    atkRange: 240, drPerMinion: 0, poisonBolts: false,
    raiseCount: 1, corpseLife: 10, raiseRange: 220, auraDps: 0,
    auraRadius: 0, raiseOnKill: false, minionAtkSpeedMult: 1,
    deathNova: false, corpseExplode: false, explodeMult: 1, soulHarvest: false,
  },
});

for (const card of CARDS) {
  const s = fakeState();
  card.apply(s);
}

let classHits = 0;
for (let i = 0; i < 80; i++) {
  const offers = rollOffers(3, Math.random, []);
  assert.strictEqual(offers.length, 3);
  assert.strictEqual(new Set(offers.map((o) => o.id)).size, 3);
  if (offers.some((o) => o.classId === "necromancer")) classHits++;
}
assert.ok(classHits >= 50, "drafts should usually show a necro card, got " + classHits);

assert.ok(BY_ID.army_of_bone);
console.log("cards.test.js ok —", CARDS.length, "cards,", classHits, "/80 drafts had a class card");
