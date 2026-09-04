/**
 * Graveborn augment cards — League Arena / ARAM-style draft.
 * Silver = generic stats. Gold / Prismatic = Necromancer class upgrades.
 */
(function (root) {
  const RARITY = {
    silver: { label: "SILVER", weight: 50, classBias: 0.15 },
    gold: { label: "GOLD", weight: 35, classBias: 0.75 },
    prismatic: { label: "PRISMATIC", weight: 15, classBias: 1 },
  };

  const CARDS = [
    // ── Silver / general ──────────────────────────────────────────
    {
      id: "swift_feet",
      name: "Swift Feet",
      icon: "👟",
      rarity: "silver",
      classId: "generic",
      desc: "+12% move speed.",
      flavor: "The grave is patient. You are not.",
      apply: (s) => {
        s.player.moveMult *= 1.12;
      },
    },
    {
      id: "vitality",
      name: "Vitality",
      icon: "❤️",
      rarity: "silver",
      classId: "generic",
      desc: "+25 max HP and heal 25.",
      flavor: "Bone and blood remember.",
      apply: (s) => {
        s.player.maxHp += 25;
        s.player.hp = Math.min(s.player.maxHp, s.player.hp + 25);
      },
    },
    {
      id: "keen_eye",
      name: "Keen Eye",
      icon: "🎯",
      rarity: "silver",
      classId: "generic",
      desc: "+8% crit chance.",
      flavor: "Find the crack in every skull.",
      apply: (s) => {
        s.player.crit += 0.08;
      },
    },
    {
      id: "long_grasp",
      name: "Long Grasp",
      icon: "🧲",
      rarity: "silver",
      classId: "generic",
      desc: "+30% gem pickup radius.",
      flavor: "Souls come when called.",
      apply: (s) => {
        s.player.magnetMult *= 1.3;
      },
    },
    {
      id: "quick_hands",
      name: "Quick Hands",
      icon: "⚡",
      rarity: "silver",
      classId: "generic",
      desc: "+12% auto-attack speed.",
      flavor: "The next bolt is already nocked.",
      apply: (s) => {
        s.player.atkSpeedMult *= 1.12;
      },
    },
    {
      id: "heavy_bolt",
      name: "Heavy Bolt",
      icon: "💀",
      rarity: "silver",
      classId: "generic",
      desc: "+18% bone-bolt damage.",
      flavor: "A heavier curse, a cleaner kill.",
      apply: (s) => {
        s.player.atkDmgMult *= 1.18;
      },
    },
    {
      id: "aegis",
      name: "Grave Aegis",
      icon: "🛡️",
      rarity: "silver",
      classId: "generic",
      desc: "+8% damage reduction.",
      flavor: "Dirt is armor if you trust it.",
      apply: (s) => {
        s.player.dr = Math.min(0.6, s.player.dr + 0.08);
      },
    },

    // ── Gold / Necromancer class ──────────────────────────────────
    {
      id: "deathless_thrall",
      name: "Deathless Thrall",
      icon: "🦴",
      rarity: "gold",
      classId: "necromancer",
      desc: "+2 max skeletons.",
      flavor: "There is always room in the procession.",
      apply: (s) => {
        s.player.maxMinions += 2;
      },
    },
    {
      id: "grave_rush",
      name: "Grave Rush",
      icon: "⏳",
      rarity: "gold",
      classId: "necromancer",
      desc: "Auto-raise 30% faster.",
      flavor: "The dirt barely has time to settle.",
      apply: (s) => {
        s.player.raiseInterval *= 0.7;
      },
    },
    {
      id: "bone_legion",
      name: "Bone Legion",
      icon: "⚔️",
      rarity: "gold",
      classId: "necromancer",
      desc: "Minions deal +30% damage.",
      flavor: "Each rib a blade.",
      apply: (s) => {
        s.player.minionDmgMult *= 1.3;
      },
    },
    {
      id: "soul_link",
      name: "Soul Link",
      icon: "💚",
      rarity: "gold",
      classId: "necromancer",
      desc: "12% of minion damage heals you.",
      flavor: "They eat. You live.",
      apply: (s) => {
        s.player.minionLifesteal += 0.12;
      },
    },
    {
      id: "occult_reach",
      name: "Occult Reach",
      icon: "🌀",
      rarity: "gold",
      classId: "necromancer",
      desc: "+70 bone-bolt range.",
      flavor: "Death has a long arm.",
      apply: (s) => {
        s.player.atkRange += 70;
      },
    },
    {
      id: "risen_plate",
      name: "Risen Plate",
      icon: "🪖",
      rarity: "gold",
      classId: "necromancer",
      desc: "Each living minion grants +4% DR (max 24%).",
      flavor: "Stand behind your dead.",
      apply: (s) => {
        s.player.drPerMinion += 0.04;
      },
    },
    {
      id: "plague_bolt",
      name: "Plague Bolt",
      icon: "☠️",
      rarity: "gold",
      classId: "necromancer",
      desc: "Bolts poison enemies (18% bolt dmg / sec, 3s).",
      flavor: "The wound keeps working.",
      apply: (s) => {
        s.player.poisonBolts = true;
      },
    },
    {
      id: "twin_raise",
      name: "Twin Raise",
      icon: "👯",
      rarity: "gold",
      classId: "necromancer",
      desc: "Each auto-raise pulse takes 2 corpses.",
      flavor: "Two graves, one word.",
      apply: (s) => {
        s.player.raiseCount += 1;
      },
    },
    {
      id: "grave_magnet",
      name: "Grave Magnet",
      icon: "📡",
      rarity: "gold",
      classId: "necromancer",
      desc: "Corpses last +5s. Raise range +90.",
      flavor: "Nothing stays buried for long.",
      apply: (s) => {
        s.player.corpseLife += 5;
        s.player.raiseRange += 90;
      },
    },
    {
      id: "wither_aura",
      name: "Withering Aura",
      icon: "🌑",
      rarity: "gold",
      classId: "necromancer",
      desc: "Nearby enemies take 8 damage/sec.",
      flavor: "The air around you is a tomb.",
      apply: (s) => {
        s.player.auraDps += 8;
        s.player.auraRadius = Math.max(s.player.auraRadius, 110);
      },
    },

    // ── Prismatic / build-defining Necromancer ────────────────────
    {
      id: "army_of_bone",
      name: "Army of Bone",
      icon: "👑",
      rarity: "prismatic",
      classId: "necromancer",
      desc: "+4 max minions. Every kill auto-raises if a corpse is in range.",
      flavor: "You are no longer a mage. You are a census.",
      apply: (s) => {
        s.player.maxMinions += 4;
        s.player.raiseOnKill = true;
      },
    },
    {
      id: "lich_bond",
      name: "Lich Bond",
      icon: "🔮",
      rarity: "prismatic",
      classId: "necromancer",
      desc: "Your bolts deal −35% damage. Minions gain +50% damage and +40% attack speed.",
      flavor: "Give the body. Keep the will.",
      apply: (s) => {
        s.player.atkDmgMult *= 0.65;
        s.player.minionDmgMult *= 1.5;
        s.player.minionAtkSpeedMult *= 1.4;
      },
    },
    {
      id: "death_nova",
      name: "Death Nova",
      icon: "💥",
      rarity: "prismatic",
      classId: "necromancer",
      desc: "When a minion dies, explode for 90 damage in 80px.",
      flavor: "Even their second death serves you.",
      apply: (s) => {
        s.player.deathNova = true;
      },
    },
    {
      id: "corpse_explosion",
      name: "Corpse Explosion",
      icon: "💣",
      rarity: "prismatic",
      classId: "necromancer",
      desc: "Overflow raises (army full) detonate the corpse for 220% bolt damage.",
      flavor: "If they cannot serve, they can scatter.",
      apply: (s) => {
        s.player.corpseExplode = true;
        s.player.explodeMult = 2.2;
      },
    },
    {
      id: "soul_harvest",
      name: "Soul Harvest",
      icon: "🌾",
      rarity: "prismatic",
      classId: "necromancer",
      desc: "Each kill +2% minion & bolt damage (max 40 stacks).",
      flavor: "A field of last breaths.",
      apply: (s) => {
        s.player.soulHarvest = true;
      },
    },
  ];

  const BY_ID = Object.fromEntries(CARDS.map((c) => [c.id, c]));

  function weightedRarity(rng) {
    const roll = rng() * 100;
    if (roll < RARITY.prismatic.weight) return "prismatic";
    if (roll < RARITY.prismatic.weight + RARITY.gold.weight) return "gold";
    return "silver";
  }

  function pickFrom(list, rng) {
    if (!list.length) return null;
    return list[Math.floor(rng() * list.length)];
  }

  /**
   * Roll `count` unique cards. Biases toward Necromancer cards on gold/prismatic
   * so class identity shows up in almost every draft.
   */
  function rollOffers(count, rng, takenIds) {
    const taken = new Set(takenIds || []);
    const offers = [];
    let classGuaranteed = false;

    for (let i = 0; i < count; i++) {
      const rarity = weightedRarity(rng);
      const wantClass = rng() < RARITY[rarity].classBias || (!classGuaranteed && i === count - 1);
      const pool = CARDS.filter((c) => {
        if (taken.has(c.id)) return false;
        if (c.rarity !== rarity) return false;
        if (wantClass) return c.classId === "necromancer" || rarity === "silver";
        return true;
      });
      let card = pickFrom(pool, rng);
      if (!card) {
        const fallback = CARDS.filter((c) => !taken.has(c.id));
        card = pickFrom(fallback, rng);
      }
      if (!card) break;
      taken.add(card.id);
      offers.push(card);
      if (card.classId === "necromancer") classGuaranteed = true;
    }
    return offers;
  }

  const api = { CARDS, BY_ID, RARITY, rollOffers, weightedRarity };
  root.GravebornCards = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
