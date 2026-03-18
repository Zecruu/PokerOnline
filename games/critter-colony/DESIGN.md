# Critter Colony — Game Design Document

## Theme & Vibe
Dark fantasy automation colony. You're a **Warden** stranded on a mysterious island filled with wild critters. Build a colony, capture critters, put them to work, and uncover the island's secrets. Art style: pixel art, muted earth tones with magical glows.

---

## CORE GAMEPLAY LOOP

```
EXPLORE → CAPTURE → ASSIGN → BUILD → RESEARCH → EXPAND → (repeat)
                         ↑                              |
                         └──── AFK GAINS ───────────────┘
```

### 1. Explore
- Top-down 2D map, WASD movement
- Start in **Clearing** biome (safe, basic critters)
- Fog of war — explore to reveal map
- Biomes: Clearing → Forest → Caves → Swamp → Volcanic → Crystal Depths
- Each biome has unique critters and resources

### 2. Capture
- Walk near a wild critter, click to throw a **Trap**
- Catch rate based on: trap quality, critter HP (weaken first), critter rarity
- Wild critters roam, some aggressive (attack you), some passive
- Inventory limit on traps — craft more at base

### 3. Assign
- Drag critters onto workstations at your colony
- Each critter has **stats** that affect work speed:
  - STR → Mining, Chopping
  - DEX → Crafting, Building speed
  - INT → Research speed
  - VIT → Farming, longer work shifts
  - LCK → Rare resource drops
- Critters gain XP from working → level up → stats grow
- Critter mood: overwork = unhappy = slower. Rest them or feed treats.

### 4. Build
- Place buildings on your colony grid
- Buildings cost resources and take time (critters build faster with DEX)

### 5. Research
- Tech tree unlocked at the **Workshop**
- Assign INT critters to research
- Unlocks: new buildings, better traps, automation, critter evolution, new biomes

### 6. AFK / Offline
- Critters keep working while offline
- On return: "Welcome back! Your critters gathered: [resources]"
- Capped at 8 hours of offline gains (prevents infinite hoarding)
- Upgradeable cap via research

---

## BUILDINGS

| Building | Function | Workers | Resource |
|----------|----------|---------|----------|
| **Mine** | Produces Stone, Ore, Gems | STR critters | Stone |
| **Lumber Mill** | Produces Wood, Hardwood | STR critters | Wood |
| **Farm** | Produces Food, Herbs | VIT critters | Food |
| **Workshop** | Research tech tree | INT critters | - |
| **Trap Forge** | Crafts traps | DEX critters | Ore + Wood |
| **Smelter** | Ore → Metal Bars | STR critters | Ore |
| **Kitchen** | Food → Treats (critter mood) | VIT critters | Food + Herbs |
| **Altar** | Evolve critters (rare) | - | Gems + Essence |
| **Storage** | Increases resource cap | - | Wood + Stone |
| **Watchtower** | Reveals fog faster | - | Wood + Stone |
| **Nest** | Critter housing (max capacity) | - | Wood |

---

## CRITTERS (20 species across biomes)

### Clearing (starter)
| Critter | Type | Best Stat | Rarity |
|---------|------|-----------|--------|
| **Mossbun** | Grass | VIT | Common |
| **Pebblit** | Rock | STR | Common |
| **Flickwing** | Air | DEX | Common |
| **Glowmite** | Light | INT | Uncommon |

### Forest
| **Thornback** | Grass | STR | Common |
| **Sapsquirrel** | Grass | DEX | Common |
| **Shadowfox** | Dark | DEX | Uncommon |
| **Elderoot** | Grass | VIT | Rare |

### Caves
| **Ironmole** | Rock | STR | Common |
| **Crystalbat** | Crystal | INT | Uncommon |
| **Deepworm** | Rock | STR | Uncommon |
| **Gemdrake** | Crystal | LCK | Rare |

### Swamp
| **Boghopper** | Water | VIT | Common |
| **Miasmare** | Poison | INT | Uncommon |
| **Muckgolem** | Rock | STR | Rare |

### Volcanic
| **Cinders** | Fire | STR | Uncommon |
| **Magmapede** | Fire | VIT | Uncommon |
| **Infernog** | Fire | STR | Rare |

### Crystal Depths
| **Prismfly** | Crystal | LCK | Rare |
| **Voidling** | Dark | INT | Legendary |

### Rarity Rates
- Common: 60%
- Uncommon: 25%
- Rare: 12%
- Legendary: 3%

---

## SKILL TREE (Player progression)

### Warden Path (capture & exploration)
- Swift Trapper: +20% catch rate per level (5 levels)
- Trap Mastery: unlock better trap tiers
- Explorer: +15% fog reveal radius
- Critter Whisperer: see wild critter stats before capture
- Beast Bond: +1 max critter capacity per level

### Overseer Path (colony efficiency)
- Taskmaster: +10% work speed per level
- Bulk Storage: +25% resource cap per level
- Efficient Builder: -15% build time per level
- Auto-Collect: resources auto-deposit (no manual pickup)
- Double Shift: critters can work 2x before needing rest

### Scholar Path (research & rare)
- Quick Study: +15% research speed per level
- Lucky Finds: +5% rare drop chance per level
- Evolution Expert: -20% evolution cost
- Ancient Knowledge: unlock hidden research
- Prestige Insight: +10% prestige multiplier

**Skill points:** 1 per player level, leveled by total playtime + milestones

---

## RESEARCH TREE

### Tier 1 (starter)
- Better Traps → Iron Traps (higher catch rate)
- Storage II → Double resource cap
- Pathfinding → Reveal map faster

### Tier 2
- Automation I → Critters auto-deposit resources
- Steel Traps → Catch uncommon+ easier
- Forest Access → Unlock Forest biome
- Selective Breeding → Reroll 1 stat on level up

### Tier 3
- Cave Access → Unlock Caves biome
- Smelting → Unlock Smelter building
- Critter Evolution → Unlock Altar
- AFK Extended → 12h offline cap (from 8h)

### Tier 4
- Swamp/Volcanic Access
- Master Traps → Catch rare+ easier
- Auto-Assign → New critters auto-go to best station
- Prestige I → Unlock prestige system

### Tier 5
- Crystal Depths Access
- Legendary Traps → Catch legendaries
- Critter Fusion → Combine 2 critters
- Time Warp → 2x speed for 10 min (cooldown)

---

## PRESTIGE SYSTEM

After reaching Crystal Depths + capturing a Voidling:
- **Reset:** Colony, resources, critter levels (keep species journal)
- **Keep:** Skill points, discovered species, prestige currency
- **Gain:** Prestige Shards → spend on permanent multipliers:
  - +10% all production
  - +5% catch rate
  - +1 starting critter slot
  - Start with Tier 1 research unlocked
  - Unlock cosmetic colony themes

---

## RESOURCES

| Resource | Source | Used For |
|----------|--------|----------|
| **Wood** | Lumber Mill | Buildings, Traps |
| **Stone** | Mine | Buildings, Storage |
| **Ore** | Mine | Smelting → Metal |
| **Metal** | Smelter | Advanced buildings, Traps |
| **Food** | Farm | Critter feeding |
| **Herbs** | Farm | Kitchen → Treats |
| **Gems** | Mine (rare) | Evolution, Prestige |
| **Essence** | Altar sacrifice | Evolution |
| **Hardwood** | Lumber Mill (rare) | Advanced buildings |

---

## UI LAYOUT

```
┌─────────────────────────────────────────┐
│ [Resources Bar]  Wood:340  Stone:120 ...│
├──────────────────────────┬──────────────┤
│                          │  [Colony     │
│                          │   Panel]     │
│    GAME WORLD            │  - Buildings │
│    (Canvas)              │  - Critters  │
│    Top-down view         │  - Assign    │
│    WASD movement         │              │
│                          │  [Research]  │
│                          │  [Skills]    │
├──────────────────────────┴──────────────┤
│ [Hotbar: Traps] [Inventory] [Journal]   │
└─────────────────────────────────────────┘
```

---

## TECHNICAL ARCHITECTURE

### Files
```
games/critter-colony/
  index.html          — Entry point
  game.js             — Game engine (canvas, input, loop)
  world.js            — Map generation, biomes, fog of war
  critters.js         — Species data, stats, AI behavior
  buildings.js        — Building types, production logic
  research.js         — Tech tree data
  skills.js           — Skill tree data
  ui.js               — Panels, menus, HUD
  save.js             — Save/load to MongoDB via API
  style.css           — UI styling
  cdn-assets.js       — Asset URLs (sprites from S3)
```

### Server Endpoints (added to server/index.js)
```
POST /api/colony/save      — Save game state
GET  /api/colony/load      — Load game state
POST /api/colony/afk-calc  — Calculate offline gains
GET  /api/colony/leaderboard — Top colonies
```

### MongoDB Schema (in User model or separate collection)
```js
colonyData: {
  lastActive: Date,
  world: { seed, revealedTiles[], currentBiome },
  colony: { buildings[], gridSize },
  critters: [{ species, name, level, xp, stats, assignment, mood }],
  inventory: { wood, stone, ore, metal, food, herbs, gems, essence },
  research: { unlocked[], inProgress, progressPct, startedAt },
  skillTree: { warden: {}, overseer: {}, scholar: {} },
  journal: { discovered[], totalCaptured },
  prestige: { level, shards, permanentBonuses },
  stats: { playtime, totalResources, totalBuilt }
}
```

### Asset Generation (Gemini API)
- 20 critter sprites (idle + walk 4-frame)
- 11 building sprites
- 6 biome tilesets (16x16 tiles)
- UI elements (resource icons, buttons)
- Player sprite (8-dir movement)

---

## IMPLEMENTATION ORDER

### Phase 1 — Core (MVP playable)
1. Canvas engine: top-down camera, WASD, tile rendering
2. Colony grid: place buildings, basic resource generation
3. Critter system: spawn, capture, assign to buildings
4. Save/Load: MongoDB integration
5. Basic UI: resource bar, building menu, critter list

### Phase 2 — Depth
6. Research tree
7. Skill tree
8. Biome progression (fog of war, unlock areas)
9. AFK offline calculation
10. Critter leveling & stats

### Phase 3 — Polish
11. Generate all sprites via Gemini API
12. Sound effects & ambient audio
13. Prestige system
14. Leaderboard
15. Hub integration (store, library pages)
