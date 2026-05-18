extends Node
## Wave manager — spawns enemies in a ring around the player, escalating
## difficulty over time. Ported loosely from the HTML5 wave system.

const ENEMY_SCENE_PATH := "res://scenes/enemy.tscn"

# (key, sprite_prefix, hp, dmg, speed, xp, min_wave)
const ENEMY_TYPES := [
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
]

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
    # Ranged casters: stop and fire bolts at the player.
    match key:
        "necromancer":
            enemy.ranged_range = 280.0
            enemy.attack_cooldown = 2.2
            enemy.projectile_color = Color(0.65, 0.35, 1.0)
        "flower":
            enemy.ranged_range = 220.0
            enemy.attack_cooldown = 1.7
            enemy.projectile_color = Color(0.5, 1.0, 0.4)
        "wyvern":
            enemy.ranged_range = 320.0
            enemy.attack_cooldown = 2.0
            enemy.projectile_color = Color(1.0, 0.55, 0.2)
    enemy.global_position = _pick_spawn_position()
    get_parent().add_child(enemy)

func _pick_enemy_index_for_wave() -> int:
    # Build the pool of eligible enemy indices for the current wave.
    # Earlier types stay weighted more common so they don't disappear entirely.
    var pool: Array[int] = []
    for i in range(ENEMY_TYPES.size()):
        var min_wave: int = int(ENEMY_TYPES[i][6])
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
