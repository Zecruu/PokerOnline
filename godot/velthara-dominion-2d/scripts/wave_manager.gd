extends Node
## Wave manager — spawns enemies in a ring around the player, escalating
## difficulty over time. Ported loosely from the HTML5 wave system.

const ENEMY_SCENE_PATH := "res://scenes/enemy.tscn"

# (key, sprite_prefix, hp, dmg, speed, xp, min_wave)
const ENEMY_TYPES := [
    # ── ORIGINAL 14 (waves 1–9) ──────────────────────────────────────────
    ["swarm",      "skeleton-swarm",            150.0, 25.0,  90.0,  6,  1],
    ["runner",     "evil-ghost-runner",         100.0, 22.0, 140.0,  5,  1],
    ["imp",        "imp-scavenger-goblin",       80.0, 18.0, 165.0,  7,  2],
    ["goreblob",   "gore-blob-sticky",          220.0, 30.0,  70.0, 10,  3],
    ["leech",      "bile-worm-leech",           180.0, 20.0, 110.0,  9,  3],
    ["necromancer","cultist-hollow-necromancer",260.0, 35.0,  80.0, 14,  4],
    ["tank",       "plate-corpse-tank",         750.0, 60.0,  55.0, 25,  5],
    ["bomber",     "chained-husk-bomber",       320.0, 50.0, 100.0, 18,  6],
    ["bonetitan",  "bone-titan-pusher",         620.0, 55.0,  60.0, 22,  7],
    ["splitter",   "larva-bloated-splitter",    200.0, 28.0, 100.0, 12,  4],
    ["wretch",     "fire-blob-cinder-wretch",   140.0, 30.0, 120.0,  9,  3],
    ["flower",     "evil-flower-poison",        300.0, 26.0,  40.0, 14,  5],
    ["wyvern",     "fire-wyvern-heads",         420.0, 45.0,  95.0, 20,  8],
    ["icegiant",   "ice-giant-ice",             580.0, 48.0,  62.0, 22,  9],
    # ── NEW (waves 1–10) — swarm + low-tier melee ────────────────────────
    ["ember_rat",       "ember-rat-scurry",         70.0, 14.0, 175.0,  4,  1],
    ["soul_wisp",       "soul-wisp-flicker",        60.0, 18.0, 155.0,  5,  2],
    ["plague_maggot",   "plague-maggot-grub",       90.0, 16.0, 105.0,  5,  3],
    ["cinder_imp",      "cinder-imp-runt",          95.0, 20.0, 170.0,  7,  4],
    ["brimstone_hound", "brimstone-hound-feral",   180.0, 32.0, 135.0, 10,  6],
    ["grave_husk",      "gravesoaked-husk-wretch", 230.0, 28.0,  95.0, 11,  8],
    # ── NEW (waves 11–25) — variety: tanks, casters, flying, splitters ──
    ["basalt_warden",   "basalt-warden-juggernaut", 900.0, 65.0,  50.0, 30, 11],
    ["hex_witch",       "hex-witch-thornveil",      260.0, 38.0,  70.0, 16, 12],
    ["plague_bat",      "plague-bat-roost",         140.0, 26.0, 145.0, 11, 13],
    ["bone_archer",     "bone-archer-skirmisher",   220.0, 34.0,  85.0, 14, 14],
    ["ash_bloom",       "ash-bloom-splitter",       280.0, 30.0,  85.0, 18, 15],
    ["cinder_seed",     "cinder-seedling-spawn",     50.0, 14.0, 165.0,  3, 99], # spawn-only, never in pool
    ["pyre_seraph",     "pyre-seraph-fallen",       280.0, 40.0,  95.0, 18, 16],
    ["void_diviner",    "void-diviner-cloaked",     310.0, 42.0,  78.0, 18, 17],
    ["molten_eel",      "molten-eel-flicker",       120.0, 30.0, 170.0,  9, 18],
    ["carrion_crow",    "carrion-crow-flock",       150.0, 28.0, 140.0, 11, 19],
    ["chitin_arachnid", "chitin-arachnid-prowler",  290.0, 36.0, 130.0, 16, 20],
    ["plague_spawn",    "plague-spawn-bubbler",     320.0, 32.0,  75.0, 16, 21],
    ["drowned_revenant","drowned-revenant-knight",  780.0, 70.0,  55.0, 28, 22],
    ["shrieker_banshee","shrieker-banshee-veiled",  250.0, 38.0, 100.0, 17, 23],
    ["infernal_alpha",  "infernal-houndmaster-chained", 380.0, 50.0, 125.0, 22, 24],
    ["rotworm_burrower","rotworm-burrower-segmented",480.0, 52.0,  80.0, 22, 25],
    # ── NEW (waves 26–40) — elites + bombers + heavier ranged ───────────
    ["cinder_kamikaze", "cinder-kamikaze-livingbomb", 110.0, 14.0, 145.0, 14, 26],
    ["molten_titan",    "molten-titan-forgewarden", 1100.0, 80.0,  55.0, 38, 28],
    ["basilisk_stonewing","basilisk-stonewing-flying", 520.0, 55.0, 110.0, 26, 29],
    ["hex_baron",       "hex-baron-shadowcloak",    560.0, 62.0,  78.0, 30, 30],
    ["plague_baron",    "plague-baron-bloatlord",  1300.0, 78.0,  50.0, 42, 31],
    ["gargoyle_stoneborn","gargoyle-stoneborn-watcher",560.0, 56.0, 105.0, 26, 33],
    ["void_martyr",     "void-martyr-selfblast",    200.0, 18.0, 130.0, 18, 34],
    ["ember_champion",  "ember-champion-flameknight",740.0, 72.0,  95.0, 34, 35],
    ["frost_duke",      "frost-duke-icebound",      580.0, 64.0,  75.0, 32, 37],
    ["void_overseer",   "void-overseer-throneless",1050.0, 76.0,  65.0, 40, 39],
    # ── NEW (waves 41–50) — endgame elite variants ──────────────────────
    ["abyss_leviathan", "abyss-leviathan-deepborn",1500.0, 88.0,  55.0, 50, 41],
    ["dread_archon",    "dread-archon-skyborn",     880.0, 78.0, 100.0, 42, 44],
    ["void_tyrant",     "void-tyrant-eyeswarm",     920.0, 82.0,  75.0, 46, 46],
    ["eternity_shade",  "eternity-shade-finalherald",1300.0, 95.0, 105.0, 52, 49],
]

# Per-key behavior overrides applied to the enemy node after instantiation.
# Replaces the old `match key:` block; lets us drop new types into ENEMY_TYPES
# without touching _spawn_one. `cinder_seed` is intentionally absent — its
# stats are pushed by enemy.gd's splitter spawner, not by the wave pool.
const SPECIAL_BEHAVIORS: Dictionary = {
    # Ranged casters — stop at ranged_range, fire projectiles.
    "necromancer":     {"ranged_range": 280.0, "attack_cooldown": 2.2, "projectile_color": Color(0.65, 0.35, 1.0)},
    "flower":          {"ranged_range": 220.0, "attack_cooldown": 1.7, "projectile_color": Color(0.5, 1.0, 0.4)},
    "wyvern":          {"ranged_range": 320.0, "attack_cooldown": 2.0, "projectile_color": Color(1.0, 0.55, 0.2), "flying": true},
    "hex_witch":       {"ranged_range": 300.0, "attack_cooldown": 2.1, "projectile_color": Color(0.7, 0.3, 1.0)},
    "bone_archer":     {"ranged_range": 320.0, "attack_cooldown": 1.6, "projectile_color": Color(0.95, 0.95, 0.85)},
    "pyre_seraph":     {"ranged_range": 290.0, "attack_cooldown": 2.0, "projectile_color": Color(1.0, 0.6, 0.25), "flying": true},
    "void_diviner":    {"ranged_range": 320.0, "attack_cooldown": 2.3, "projectile_color": Color(0.55, 0.25, 1.0)},
    "shrieker_banshee":{"ranged_range": 310.0, "attack_cooldown": 1.9, "projectile_color": Color(0.85, 0.95, 1.0), "flying": true},
    "hex_baron":       {"ranged_range": 340.0, "attack_cooldown": 2.3, "projectile_color": Color(0.8, 0.35, 1.0)},
    "frost_duke":      {"ranged_range": 330.0, "attack_cooldown": 2.2, "projectile_color": Color(0.6, 0.85, 1.0)},
    "void_tyrant":     {"ranged_range": 340.0, "attack_cooldown": 1.8, "projectile_color": Color(0.75, 0.3, 1.0), "flying": true},
    # Splitters — spawn children on death.
    "ash_bloom":       {"splitter_child_prefix": "cinder-seedling-spawn", "splitter_child_count": 2, "splitter_child_hp_factor": 0.4},
    "plague_spawn":    {"splitter_child_prefix": "plague-maggot-grub", "splitter_child_count": 2, "splitter_child_hp_factor": 0.5},
    # Bombers — detonate in radius on contact, bypass attack_cooldown.
    "cinder_kamikaze": {"explode_on_contact": true, "explode_radius": 90.0, "explode_damage_mult": 2.2},
    "void_martyr":     {"explode_on_contact": true, "explode_radius": 110.0, "explode_damage_mult": 2.6},
    # Flying-only (cosmetic + future-proof for terrain pathing).
    "plague_bat":          {"flying": true},
    "molten_eel":          {"flying": true},
    "carrion_crow":        {"flying": true},
    "basilisk_stonewing":  {"flying": true},
    "gargoyle_stoneborn":  {"flying": true},
    "dread_archon":        {"flying": true},
}

const SPAWN_RING_INNER: float = 380.0
const SPAWN_RING_OUTER: float = 540.0
const WAVE_DURATION: float = 20.0

var time_in_wave: float = 0.0
var wave: int = 1
var spawn_timer: float = 1.0
var alive_count: int = 0
var max_alive: int = 24

@onready var enemy_scene: PackedScene = preload(ENEMY_SCENE_PATH)
var player: Node2D = null

signal wave_advanced(wave: int)
signal alive_count_changed(count: int)

func _ready() -> void:
    add_to_group("wave_manager")
    var players := get_tree().get_nodes_in_group("player")
    if players.size() > 0:
        player = players[0]

func _physics_process(dt: float) -> void:
    if player == null:
        var players := get_tree().get_nodes_in_group("player")
        if players.size() > 0: player = players[0]
        if player == null: return

    time_in_wave += dt
    if time_in_wave >= WAVE_DURATION:
        time_in_wave -= WAVE_DURATION
        wave += 1
        max_alive = min(120, 24 + wave * 4)
        wave_advanced.emit(wave)

    spawn_timer -= dt
    alive_count = _count_alive_enemies()
    alive_count_changed.emit(alive_count)
    if spawn_timer <= 0.0 and alive_count < max_alive:
        spawn_timer = _spawn_interval()
        var burst: int = min(max_alive - alive_count, 1 + wave / 4)
        for i in range(burst):
            _spawn_one()

func _spawn_interval() -> float:
    return max(0.35, 1.2 - wave * 0.05)

func _count_alive_enemies() -> int:
    return get_tree().get_nodes_in_group("enemies").size()

func _spawn_one() -> void:
    var idx: int = _pick_enemy_index_for_wave()
    var def: Array = ENEMY_TYPES[idx]
    var key: String = def[0]
    var prefix: String = def[1]
    var hp: float = def[2] * (1.0 + (wave - 1) * 0.15)
    var dmg: float = def[3] * (1.0 + (wave - 1) * 0.08)
    var speed: float = def[4]
    var xp: int = int(def[5])

    var enemy: Node2D = enemy_scene.instantiate()
    enemy.enemy_type = key
    enemy.max_hp = hp
    enemy.damage = dmg
    enemy.move_speed = speed
    enemy.xp_drop = xp
    enemy.sprite_prefix = prefix  # SpriteFrameCache loads + shares
    # Apply per-key behavior overrides from the SPECIAL_BEHAVIORS table.
    # Ranged casters, splitters, bombers, and flying flags all live there
    # so adding a new enemy type only touches ENEMY_TYPES + that dict.
    var overrides: Dictionary = SPECIAL_BEHAVIORS.get(key, {})
    for field in overrides.keys():
        enemy.set(field, overrides[field])
    enemy.global_position = _pick_spawn_position()
    get_parent().add_child(enemy)

func _pick_enemy_index_for_wave() -> int:
    # Build the pool of eligible enemy indices for the current wave.
    # Earlier types stay weighted more common so they don't disappear entirely.
    # Types with min_wave >= 99 are "spawn-only" — they only enter the world
    # via splitter children (e.g. cinder-seedling-spawn from ash-bloom).
    var pool: Array[int] = []
    for i in range(ENEMY_TYPES.size()):
        var min_wave: int = int(ENEMY_TYPES[i][6])
        if min_wave >= 99:
            continue
        if wave < min_wave:
            continue
        var weight: int = max(1, 6 - (wave - min_wave) / 4)
        for _w in range(weight):
            pool.append(i)
    if pool.is_empty():
        return 0
    return pool[randi() % pool.size()]

func _pick_spawn_position() -> Vector2:
    var angle: float = randf() * TAU
    var dist: float = randf_range(SPAWN_RING_INNER, SPAWN_RING_OUTER)
    return player.global_position + Vector2(cos(angle), sin(angle)) * dist
