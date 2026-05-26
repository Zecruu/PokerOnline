extends Node
## Periodically spawns arena hazards and mini-bosses.
## - Every ~25s after wave 3: random poison ring / soul press / cube / control point.
## - Every 5 waves: a beefed-up mini-boss (tank with 5x HP, slower, big XP).

const EVENT_INTERVAL_MIN: float = 22.0
const EVENT_INTERVAL_MAX: float = 32.0

var event_timer: float = EVENT_INTERVAL_MIN
var horde_timer: float = 60.0
var spawned_boss_wave: int = -1
var spawned_named_boss_wave: int = -1
var wave_manager: Node = null
var player: Node2D = null

# Phase 3 boss schedule. Replaces the old wave%10 plague-weaver-only spawn.
# Each entry pins a named boss to a specific wave, with the flash banner text
# the HUD shows when the wave rolls over. Wave 30 still points at the
# existing plague_weaver scene so we don't break that boss.
const BOSS_SCHEDULE: Array[Dictionary] = [
    {"wave": 10, "scene": "res://scenes/pyre_knight.tscn",   "flash": "PYRE KNIGHT CHARGES"},
    {"wave": 20, "scene": "res://scenes/frostbinder.tscn",   "flash": "FROSTBINDER AWAKENS"},
    {"wave": 30, "scene": "res://scenes/plague_weaver.tscn", "flash": "PLAGUE WEAVER STIRS"},
    {"wave": 40, "scene": "res://scenes/bone_tyrant.tscn",   "flash": "BONE TYRANT RISES"},
    {"wave": 50, "scene": "res://scenes/void_consumer.tscn", "flash": "THE VOID CONSUMER"},
]

func _ready() -> void:
    set_process(true)

func _process(dt: float) -> void:
    if wave_manager == null:
        var nodes := get_tree().get_nodes_in_group("wave_manager")
        if nodes.size() > 0: wave_manager = nodes[0]
        else: return
    if player == null:
        var players := get_tree().get_nodes_in_group("player")
        if players.size() > 0: player = players[0]
        else: return

    if wave_manager.wave < 3:
        return

    # Arena events
    event_timer -= dt
    if event_timer <= 0.0:
        event_timer = randf_range(EVENT_INTERVAL_MIN, EVENT_INTERVAL_MAX)
        _spawn_random_event()

    # Mini-boss every 5th wave (only spawn once per wave).
    if wave_manager.wave % 5 == 0 and wave_manager.wave != spawned_boss_wave:
        spawned_boss_wave = wave_manager.wave
        _spawn_mini_boss()

    # Named bosses on a fixed schedule (waves 10/20/30/40/50). Only one boss
    # entry can match per wave (BOSS_SCHEDULE waves are unique by design).
    if wave_manager.wave != spawned_named_boss_wave:
        for entry in BOSS_SCHEDULE:
            if int(entry["wave"]) == wave_manager.wave:
                spawned_named_boss_wave = wave_manager.wave
                _spawn_named_boss(entry)
                break

    # Horde event: every ~60s after wave 4 — flood 30 imps.
    horde_timer -= dt
    if horde_timer <= 0.0 and wave_manager.wave >= 4:
        horde_timer = 75.0 + randf_range(-10, 10)
        _trigger_horde()

func _spawn_random_event() -> void:
    var kind: int = randi() % 4
    var pos: Vector2 = player.global_position + Vector2(randf_range(-160, 160), randf_range(-160, 160))
    var node: Node2D = null
    match kind:
        0: node = preload("res://scripts/poison_ring.gd").new()
        1: node = preload("res://scripts/soul_press.gd").new()
        2: node = preload("res://scripts/entrapment_cube.gd").new()
        3: node = preload("res://scripts/control_point.gd").new()
    if node == null: return
    node.global_position = pos
    get_parent().add_child(node)
    var name: String = ["Poison Ring", "Soul Press", "Entrapment Cube", "Control Point"][kind]
    var hud := _find_hud()
    if hud != null: hud.flash_text(name)

func _spawn_mini_boss() -> void:
    var enemy_scene: PackedScene = preload("res://scenes/enemy.tscn")
    var prefix: String = "plate-corpse-tank"
    var boss: Node2D = enemy_scene.instantiate()
    boss.enemy_type = "boss"
    boss.max_hp = 4500.0 + wave_manager.wave * 250.0
    boss.damage = 80.0 + wave_manager.wave * 6.0
    boss.move_speed = 48.0
    boss.xp_drop = 150
    boss.walk_sheet = load("res://assets/enemies/%s-walk.png" % prefix)
    boss.attack_sheet = load("res://assets/enemies/%s-attack.png" % prefix)
    boss.death_sheet = load("res://assets/enemies/%s-death.png" % prefix)
    boss.scale = Vector2(1.6, 1.6)
    var angle: float = randf() * TAU
    boss.global_position = player.global_position + Vector2(cos(angle), sin(angle)) * 480.0
    get_parent().add_child(boss)
    var hud := _find_hud()
    if hud != null: hud.flash_text("MINI-BOSS APPROACHES")

func _spawn_named_boss(entry: Dictionary) -> void:
    var scene_path: String = String(entry["scene"])
    var packed: PackedScene = load(scene_path) as PackedScene
    if packed == null:
        push_warning("BOSS_SCHEDULE missing scene: %s" % scene_path)
        return
    var boss: Node2D = packed.instantiate()
    # HP scales with current wave per the Phase 3 brief — base_hp * (1 + (wave-1) * 0.10).
    # Bosses each export a `max_hp`; we apply the scalar here so the schedule
    # logic stays one place. Each boss script reads `max_hp` in _ready() to
    # initialize `hp` and the hp_bar, so we set BOTH before parenting.
    if "max_hp" in boss:
        var wave_scalar: float = 1.0 + (float(wave_manager.wave) - 1.0) * 0.10
        boss.max_hp = float(boss.max_hp) * wave_scalar
    var angle: float = randf() * TAU
    boss.global_position = player.global_position + Vector2(cos(angle), sin(angle)) * 540.0
    get_parent().add_child(boss)
    var hud := _find_hud()
    if hud != null: hud.flash_text(String(entry["flash"]))

func _trigger_horde() -> void:
    var enemy_scene: PackedScene = preload("res://scenes/enemy.tscn")
    for i in range(30):
        var angle: float = (TAU * float(i) / 30.0) + randf_range(-0.05, 0.05)
        var dist: float = randf_range(420.0, 540.0)
        var imp: Node2D = enemy_scene.instantiate()
        imp.enemy_type = "imp"
        imp.max_hp = 60.0 + wave_manager.wave * 3.0
        imp.damage = 14.0 + wave_manager.wave * 1.0
        imp.move_speed = 175.0
        imp.xp_drop = 5
        imp.walk_sheet = load("res://assets/enemies/imp-scavenger-goblin-walk.png")
        imp.attack_sheet = load("res://assets/enemies/imp-scavenger-goblin-attack.png")
        imp.death_sheet = load("res://assets/enemies/imp-scavenger-goblin-death.png")
        imp.global_position = player.global_position + Vector2(cos(angle), sin(angle)) * dist
        get_parent().add_child(imp)
    var hud := _find_hud()
    if hud != null: hud.flash_text("HORDE INCOMING")

func _find_hud() -> Node:
    var parent := get_parent()
    if parent == null: return null
    return parent.get_node_or_null("Hud")
