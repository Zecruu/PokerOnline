const assert = require("assert");
require("./enemies.js");
const E = globalThis.GravebornEnemies;

assert.strictEqual(E.waveFromTime(0), 1);
assert.strictEqual(E.waveFromTime(19.9), 1);
assert.strictEqual(E.waveFromTime(20), 2);
assert.strictEqual(E.waveFromTime(100), 6);

assert.ok(E.scaleStat(100, 1.16, 5) > 180);
assert.ok(E.scaled(E.TYPES.husk, 8).hp > E.TYPES.husk.hp * 2);
assert.ok(E.scaled(E.TYPES.runner, 20).spd <= E.TYPES.runner.spd * E.SPD_CAP + 0.01);

assert.ok(E.spawnInterval(1) > E.spawnInterval(10));
assert.ok(E.liveCap(12) > E.liveCap(1));
assert.strictEqual(E.liveCap(99), 180);
assert.strictEqual(E.eliteChance(1), 0);
assert.ok(E.eliteChance(8) > 0.1);

const early = {};
for (let i = 0; i < 80; i++) early[E.pickType(0, () => i / 80).id] = true;
assert.ok(early.husk && early.mite);
assert.ok(!early.brute && !early.wraith);

const late = {};
for (let i = 0; i < 200; i++) late[E.pickType(90, Math.random).id] = true;
assert.ok(late.spit && late.brute);

assert.strictEqual(E.bossIndex(59), -1);
assert.strictEqual(E.bossIndex(60), 0);
assert.strictEqual(E.bossForIndex(0).def.id, "titan");
assert.strictEqual(E.bossForIndex(1).def.id, "sovereign");
assert.strictEqual(E.bossForIndex(4).def.id, "titan");
assert.strictEqual(E.bossForIndex(4).cycle, 1);
assert.ok(E.scaled(E.BOSSES[0], 4, 1).hp > E.scaled(E.BOSSES[0], 4, 0).hp);
assert.strictEqual(E.nextBossAt(0), 60);
assert.strictEqual(E.nextBossAt(60), 135);

console.log("enemies.test.js ok —", Object.keys(E.TYPES).length, "types,", E.BOSSES.length, "bosses");
