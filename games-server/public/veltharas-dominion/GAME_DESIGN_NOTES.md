# Velthara's Dominion - Game Design Notes

## CURRENT AUGMENTS & UPGRADES

### Base Upgrades (Level Up Rewards)
| ID | Name | Icon | Rarity | Description |
|----|------|------|--------|-------------|
| speed | Swift Feet | 👟 | Common | Move 30 units faster |
| health | Vitality | ❤️ | Common | +30 Max HP |
| damage | Power Shot | 💥 | Common | +5 projectile damage |
| magnet | Magnet | 🧲 | Common | +50 pickup range |
| firerate | Rapid Fire | 🔫 | Rare | Shoot 10% faster |
| multishot | Multi Shot | 🎯 | Rare | +1 projectile per shot |
| pierce | Piercing | 🗡️ | Rare | +1 pierce, +3% range |
| skull_upgrade | Soul Collector | 💀 | Rare | +1 skull (max 6), then +15 dmg |
| summon_wolf | Call of the Pack | 🐺 | Rare | +1 wolf companion (max 3) |
| critdmg | Lethal Strike | 🩸 | Epic | +50% crit damage |
| armor | Armor | 🛡️ | Epic | +50 HP, +25 speed |
| skull_shower | Skull Storm | ☠️ | Epic | +3 skulls (max 6), overflow = +15 dmg each |
| devastation | Devastation | ☠️ | Legendary | +20 damage |

### Class-Specific Upgrades (Mage Only Currently)
| ID | Name | Icon | Rarity | Description |
|----|------|------|--------|-------------|
| rapidfire | Machine Gun | 💥 | Epic | +15% fire rate |
| skull | Elemental Skull | 💀 | Rare | +1 orbiting skull (cycles elements) |

---

### 💎 DIAMOND AUGMENTS (Every 5 Levels)

#### Soldier Path
| ID | Name | Icon | Description |
|----|------|------|-------------|
| tactical_nuke | Tactical Nuke | ☢️ | Every 5th shot fires a nuke dealing 500% damage in huge area |
| overclock | Overclock | ⚙️ | Fire rate +10% |
| bullet_storm | Bullet Storm | 🌧️ | Bullets split into 3 smaller bullets on impact |
| titan_killer | Titan Killer | 🎯 | +15% damage to Bosses/Tanks (+5% per stack) |

#### Mage Path
| ID | Name | Icon | Description |
|----|------|------|-------------|
| wind_push | Gale Force | 💨 | Every 7s, wind slash pushes all enemies back |
| time_stop | Chrono Field | ⏳ | Periodically freeze all enemies for 3 seconds |
| skull_frenzy | Skull Frenzy | 💀 | Skulls spin 2x faster, +50% damage |
| skull_army | Skull Army | ☠️ | +3 skulls (max 6), overflow = +30 damage each |

#### Wolf Pack Path
| ID | Name | Icon | Description |
|----|------|------|-------------|
| dire_wolves | Dire Wolves | 🐺 | Wolves 50% larger/tankier, +damage if at max |
| feral_frenzy | Feral Frenzy | 🔥 | Wolves attack 50% faster, +25% damage |
| pack_tactics | Pack Tactics | 🌙 | +5% damage per active wolf |
| alpha_howl | Alpha Howl | 🌕 | Every 10s wolves howl, +50% speed/damage for 5s |

#### Hybrid/Special
| ID | Name | Icon | Description |
|----|------|------|-------------|
| tech_wizard | Soul Harvest | 🔮 | Projectiles spawn Skulls on kill (10% chance, max 6) |
| aura_fire | Aura Fire Circle | 🔥 | Burning ring damages enemies, upgrades with kills |

#### Demon Set Augments (Requires Full Demon Set)
| ID | Name | Icon | Description |
|----|------|------|-------------|
| imp_horde | Imp Horde | 👿 | Max Imps +5 |
| hellfire_fury | Hellfire Fury | 🔥 | Imp Damage +100% |
| eternal_flame | Eternal Flame | 🕯️ | Imp Burn Duration +5s |

---

## STACKING ITEMS (Drop Once, Stack Forever)

| Item | Icon | Stack Type | Description | Evolution |
|------|------|------------|-------------|-----------|
| Crit Blade | 🗡️ | Damage | +0.0125% crit per stack | Death Blade ⚔️: +25% crit, 3x crit dmg |
| Beam of Despair | 💫 | Kills | Chains +1 enemy per 1k kills | Ray of Annihilation |
| Vampiric Fang | 🧛 | Kills | +0.1% lifesteal per stack | Blood Lord's Fang |
| Frost Heart | ❄️ | Kills | +0.05% freeze chance per stack | Absolute Zero |
| Toxic Core | ☠️ | Damage | +0.5 poison DPS per stack | Plague Heart |
| Speed Boots | 👢 | Kills | +0.5 speed per stack | Hermes Sandals |
| XP Tome | 📖 | Kills | +0.1% XP bonus per stack | Tome of Infinite Knowledge |
| Health Gem | 💎 | Damage | +0.5 max HP per stack | Heart of the Titan |
| Magnet Orb | 🔮 | Kills | +1 magnet range per stack | Gravity Well |
| Regen Ring | 💚 | Kills | +0.02 HP/s per stack | Ring of Eternal Life |

---

## CURRENT BOSSES

| Wave | Boss | HP | Notes |
|------|------|-----|-------|
| 10 | Generic Boss | 5000 | First boss encounter |
| 15 | The Consumer | 15000 | Void spiral, pulls player in |
| 20 | Demon King | 25000 | Drops Demon Set pieces |
| 25 | ~~Cthulhu~~ | ~~100000~~ | **TO BE REMOVED** |

---

## CURRENT DIFFICULTY SYSTEM (TO BE REMOVED)

- **Fresh Start**: Level 1, +3 random upgrades
- **Head Start**: Level 5, +5 random upgrades

---

## NEW BOSS IDEAS (Replacing Cthulhu at Wave 25)

### Option 1: 🔥 INFERNAL TITAN - Lord of the Burning Abyss
- Giant fire demon with molten armor
- Attacks: Meteor shower, fire breath cone, ground slam creating lava pools
- Mechanic: Armor plates that must be destroyed before dealing damage
- Drops: **Infernal Set** (Helm, Gauntlets, Greaves) - Fire damage bonuses

### Option 2: ⚡ STORM COLOSSUS - The Thunder King
- Massive lightning elemental
- Attacks: Chain lightning, thunder clap stun, lightning pillars
- Mechanic: Charges up - must interrupt or massive AoE
- Drops: **Storm Set** - Lightning chain attacks, speed bonuses

### Option 3: 💀 THE LICH KING - Master of the Undead
- Skeletal necromancer on a bone throne
- Attacks: Summons skeleton waves, death beam, soul drain
- Mechanic: Must destroy phylacteries around arena to make vulnerable
- Drops: **Lich Set** - Summon bonuses, death magic

### Option 4: 🌑 VOID EMPEROR - The End of All Things
- Abstract cosmic horror (not Cthulhu-like)
- Attacks: Reality tears, gravity wells, dimension rifts
- Mechanic: Phases between dimensions, different attack patterns each phase
- Drops: **Void Set** - Damage reduction, reality-bending abilities

### Option 5: 🐉 ANCIENT DRAGON - The World Ender
- Classic massive dragon
- Attacks: Fire breath, tail swipe, wing gust, dive bomb
- Mechanic: Flight phases where you must dodge, ground phases for damage
- Drops: **Dragon Set** - Fire resistance, dragon companion

---

## CHARACTER SELECT CONCEPTS (Replacing Mage)

### 1. ⚔️ WARRIOR - The Blade Master
- **Playstyle**: Melee-focused, high HP, slower but devastating
- **Starting Ability**: Sword slash (short range, high damage)
- **Passive**: +50% HP, -20% speed, melee attacks cleave
- **Unique Mechanic**: Rage meter - builds with damage taken, unleashes powerful attacks
- **Monetization**: Unlock with tokens or $1.99

### 2. 🏹 RANGER - The Swift Hunter  
- **Playstyle**: Fast, long range, critical hit focused
- **Starting Ability**: Piercing arrow (long range, high pierce)
- **Passive**: +30% speed, +20% crit chance, -20% HP
- **Unique Mechanic**: Mark targets for bonus damage
- **Monetization**: Unlock with tokens or $1.99

### 3. 🛡️ PALADIN - The Holy Guardian
- **Playstyle**: Tank, support abilities, healing
- **Starting Ability**: Holy shield (blocks damage, reflects)
- **Passive**: +100% HP, healing aura, -30% damage
- **Unique Mechanic**: Divine intervention (auto-revive once per game)
- **Monetization**: Unlock with tokens or $2.99

### 4. 🗡️ ASSASSIN - The Shadow Blade
- **Playstyle**: Glass cannon, stealth, burst damage
- **Starting Ability**: Shadow step (teleport behind enemies)
- **Passive**: +100% crit damage, -40% HP, invisibility on kill
- **Unique Mechanic**: Execute - instant kill enemies below 10% HP
- **Monetization**: Unlock with tokens or $2.99

### 5. 🔮 MAGE - The Arcane Master (Current, stays FREE)
- **Playstyle**: Balanced, elemental magic, skulls
- **Starting Ability**: Magic missiles (current projectiles)
- **Passive**: Elemental skulls, balanced stats
- **Unique Mechanic**: Elemental mastery (fire/ice/lightning cycle)
- **Monetization**: FREE (starter class)

### 6. 🐺 BEASTMASTER - The Pack Leader
- **Playstyle**: Summon-focused, wolves and beasts
- **Starting Ability**: Summon wolf pack (starts with 2 wolves)
- **Passive**: +2 max wolves, wolves deal +50% damage
- **Unique Mechanic**: Beast rage - all summons go berserk
- **Monetization**: Unlock with tokens or $1.99

### 7. ☠️ NECROMANCER - The Death Caller
- **Playstyle**: Summon undead, death magic
- **Starting Ability**: Raise dead (killed enemies become allies)
- **Passive**: +50% summon damage, enemies drop souls
- **Unique Mechanic**: Army of the dead - massive skeleton wave
- **Monetization**: Unlock with tokens or $2.99

### 8. 🔥 PYROMANCER - The Flame Wielder
- **Playstyle**: Fire damage, DoT, explosions
- **Starting Ability**: Fireball (explodes on impact)
- **Passive**: All attacks burn, +30% fire damage
- **Unique Mechanic**: Combustion - enemies explode on death
- **Monetization**: Unlock with tokens or $1.99

---

## NEW DIFFICULTY SYSTEM PROPOSAL

Instead of "Fresh Start" vs "Head Start", implement:

### Difficulty Tiers (Affects XP/Token rewards)
1. **EASY** - Enemies deal 50% damage, +0% rewards
2. **NORMAL** - Standard difficulty, +0% rewards  
3. **HARD** - Enemies +50% HP/damage, +25% rewards
4. **NIGHTMARE** - Enemies +100% HP/damage, +50% rewards
5. **INFERNO** - Enemies +200% HP/damage, +100% rewards (Unlock at Account Level 10)

### Modifiers (Optional challenges for bonus rewards)
- 🔥 **Burning Ground** - Floor damages you (+10% tokens)
- ⚡ **Speed Demons** - Enemies 50% faster (+15% tokens)
- 💀 **Glass Cannon** - You deal 2x damage but have 50% HP (+20% tokens)
- 🚫 **No Healing** - Health pickups disabled (+25% tokens)

---

## MONETIZATION STRATEGY

1. **Character Unlocks**: $1.99 - $2.99 each, or 500-1000 tokens
2. **Cosmetic Skins**: $0.99 - $4.99 (character skins, projectile effects)
3. **Battle Pass**: $4.99/season (exclusive skins, bonus tokens, XP boost)
4. **Token Packs**: $0.99 = 100 tokens, $4.99 = 600 tokens, $9.99 = 1500 tokens

