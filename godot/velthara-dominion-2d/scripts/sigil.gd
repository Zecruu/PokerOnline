extends Resource
## Augment (legacy name: Sigil) — a tiered passive that grants stat bonuses
## and/or behavior tags. Tags are checked in player/enemy code at key
## moments (attack, damage, kill, level-up) to trigger unique effects.
##
## Inspired by LoL Arena's Silver/Gold/Prismatic augment system: rarity
## controls offer weight; lower-rarity augments are pure stats while
## higher-rarity ones reshape gameplay (combo crits, lifesteal, revive,
## phase-shift gimmicks).
##
## No class_name so the autoload registry doesn't need a pre-warmed class
## cache for headless tooling. Other scripts treat us as a Resource.

enum Rarity { COMMON, RARE, EPIC, LEGENDARY, CORRUPTED }

@export var id: String = ""
@export var display_name: String = ""
@export var description: String = ""
@export var rarity: Rarity = Rarity.COMMON

# --- Stat bonuses (additive multipliers, +0.10 = +10%) ---
@export var damage_mult_add: float = 0.0
@export var fire_rate_mult_add: float = 0.0
@export var pickup_radius_mult_add: float = 0.0
@export var move_speed_mult_add: float = 0.0
@export var max_hp_bonus: float = 0.0
@export var heal_on_pickup: float = 0.0
@export var crit_chance_add: float = 0.0      # additive crit chance, 0.05 = +5%
@export var lifesteal_add: float = 0.0        # additive lifesteal %
@export var cdr_add: float = 0.0              # additive CD reduction %, 0.10 = -10% CDs
@export var attack_power_add: float = 0.0     # flat AD added to BASE_DAMAGE (autos only)
@export var spell_power_add: float = 0.0      # additive ability damage %, 0.20 = +20% AP

# --- Behavior tags. See player.gd & enemy.gd for trigger points. ---
@export var tags: Array[String] = []

func rarity_color() -> Color:
    match rarity:
        Rarity.COMMON: return Color(0.85, 0.85, 0.85)      # Silver
        Rarity.RARE: return Color(0.45, 0.7, 1.0)          # Gold-ish blue
        Rarity.EPIC: return Color(0.78, 0.42, 1.0)         # Prismatic purple
        Rarity.LEGENDARY: return Color(1.0, 0.55, 0.18)    # Hex-orange fire
        Rarity.CORRUPTED: return Color(0.85, 0.18, 0.22)   # Corrupted blood-red
    return Color.WHITE

func rarity_weight() -> float:
    match rarity:
        Rarity.COMMON: return 60.0
        Rarity.RARE: return 28.0
        Rarity.EPIC: return 10.0
        Rarity.LEGENDARY: return 2.0
        Rarity.CORRUPTED: return 1.2
    return 1.0

func rarity_name() -> String:
    match rarity:
        Rarity.COMMON: return "Silver"
        Rarity.RARE: return "Gold"
        Rarity.EPIC: return "Prismatic"
        Rarity.LEGENDARY: return "Hex"
        Rarity.CORRUPTED: return "Corrupted"
    return ""
