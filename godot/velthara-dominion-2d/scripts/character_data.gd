extends Node
## Autoload — defines selectable characters and which one is active. The
## active character's stats are read by player.gd on _ready().

const CHARS: Array[Dictionary] = [
    {
        "id": "fire_sovereign", "name": "Fire Sovereign",
        "desc": "Balanced flame caster. Burn DoT on every slash.",
        "color": Color(1.0, 0.6, 0.2),
        "idle_tex": "res://assets/characters/fire-sovereign-idle-s.png",
        "walk_tex": "res://assets/characters/fire-sovereign-walk-s.png",
        "cast_tex": "res://assets/characters/fire-sovereign-cast-s.png",
        "grid_cols": 3, "grid_rows": 2,
        "move_speed_mult": 1.0, "damage_mult": 1.0, "fire_rate_mult": 1.0,
        "max_hp_bonus": 0.0,
        "q_ability": "inferno_volley", "q_name": "Inferno Volley",
        "e_ability": "solar_cataclysm", "e_name": "Solar Cataclysm",
    },
    {
        "id": "angelic_knight", "name": "Angelic Knight",
        "desc": "Tanky bruiser. +25 HP, slower attacks but heavier hits.",
        "color": Color(0.95, 0.92, 1.0),
        "idle_tex": "res://assets/characters/angelic-knight-idle-s.png",
        "walk_tex": "res://assets/characters/angelic-knight-walk-s.png",
        "cast_tex": "res://assets/characters/angelic-knight-idle-s.png",
        "grid_cols": 3, "grid_rows": 2,
        "move_speed_mult": 0.92, "damage_mult": 1.25, "fire_rate_mult": 0.85,
        "max_hp_bonus": 25.0,
        "q_ability": "holy_hammer", "q_name": "Holy Hammer",
        "e_ability": "divine_shield", "e_name": "Divine Shield",
    },
    {
        "id": "demonic_monarch", "name": "Demonic Monarch",
        "desc": "Fast skirmisher. +15% move, faster fire rate.",
        "color": Color(0.65, 0.3, 0.95),
        "idle_tex": "res://assets/characters/demonic-monarch-idle-s.png",
        "walk_tex": "res://assets/characters/demonic-monarch-walk-s.png",
        "cast_tex": "res://assets/characters/demonic-monarch-idle-s.png",
        "grid_cols": 1, "grid_rows": 1,  # single-frame artwork
        "move_speed_mult": 1.15, "damage_mult": 0.95, "fire_rate_mult": 1.20,
        "max_hp_bonus": -10.0,
        "q_ability": "shadow_dash", "q_name": "Shadow Dash",
        "e_ability": "soul_drain", "e_name": "Soul Drain",
    },
]

var selected_index: int = 0

func selected() -> Dictionary:
    return CHARS[clamp(selected_index, 0, CHARS.size() - 1)]

func select(idx: int) -> void:
    selected_index = clamp(idx, 0, CHARS.size() - 1)
