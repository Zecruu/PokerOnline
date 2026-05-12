extends Resource
## Sigil = persistent passive buff. Stack-additive within a single run.
##
## Not declared with class_name so the class-cache doesn't need to be
## prepopulated before the first headless run. Other scripts treat it as a
## generic Resource and access fields by name.
##
## Stats apply multiplicatively when relevant (damage_mult, fire_rate_mult,
## pickup_radius_mult, move_speed_mult). max_hp_bonus is flat HP added.
## Rarity controls draw weight and the color tint in the offer UI.

enum Rarity { COMMON, RARE, EPIC, LEGENDARY }

@export var id: String = ""
@export var display_name: String = ""
@export var description: String = ""
@export var rarity: Rarity = Rarity.COMMON

# Effects (multiplicative buffs are "+0.10" = +10%)
@export var damage_mult_add: float = 0.0
@export var fire_rate_mult_add: float = 0.0
@export var pickup_radius_mult_add: float = 0.0
@export var move_speed_mult_add: float = 0.0
@export var max_hp_bonus: float = 0.0
@export var heal_on_pickup: float = 0.0

func rarity_color() -> Color:
    match rarity:
        Rarity.COMMON: return Color(0.85, 0.85, 0.85)
        Rarity.RARE: return Color(0.45, 0.7, 1.0)
        Rarity.EPIC: return Color(0.78, 0.42, 1.0)
        Rarity.LEGENDARY: return Color(1.0, 0.75, 0.2)
    return Color.WHITE

func rarity_weight() -> float:
    match rarity:
        Rarity.COMMON: return 60.0
        Rarity.RARE: return 28.0
        Rarity.EPIC: return 10.0
        Rarity.LEGENDARY: return 2.0
    return 1.0

func rarity_name() -> String:
    match rarity:
        Rarity.COMMON: return "Common"
        Rarity.RARE: return "Rare"
        Rarity.EPIC: return "Epic"
        Rarity.LEGENDARY: return "Legendary"
    return ""
