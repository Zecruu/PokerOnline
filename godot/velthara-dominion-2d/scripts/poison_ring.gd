extends Node2D
## Poison ring — a hazardous donut. Anyone (player and enemies) standing
## between inner_radius and outer_radius takes damage_per_sec while inside.

@export var inner_radius: float = 110.0
@export var outer_radius: float = 170.0
@export var damage_per_sec: float = 14.0
@export var duration: float = 12.0

var elapsed: float = 0.0
var pulse: float = 0.0
var dmg_tick_acc: float = 0.0
var player: Node2D = null

func _ready() -> void:
    z_index = -2
    set_process(true)
    var players := get_tree().get_nodes_in_group("player")
    if players.size() > 0:
        player = players[0]

func _process(dt: float) -> void:
    elapsed += dt
    pulse += dt
    queue_redraw()
    if elapsed >= duration:
        queue_free()
        return
    dmg_tick_acc += dt
    if dmg_tick_acc < 0.25:
        return
    var tick: float = damage_per_sec * dmg_tick_acc
    dmg_tick_acc = 0.0
    if player != null and is_instance_valid(player):
        var d: float = (player.global_position - global_position).length()
        if d > inner_radius and d < outer_radius:
            if player.has_method("take_damage"):
                player.take_damage(tick)
    for e in get_tree().get_nodes_in_group("enemies"):
        if e == null or not (e is Node2D):
            continue
        var de: float = (e.global_position - global_position).length()
        if de > inner_radius and de < outer_radius:
            if e.has_method("take_damage"):
                e.take_damage(tick * 0.8, null, false)

func _draw() -> void:
    var alpha: float = 0.32 + 0.10 * sin(pulse * 4.0)
    draw_arc(Vector2.ZERO, inner_radius, 0.0, TAU, 64, Color(0.55, 1.0, 0.4, alpha), 3.0)
    draw_arc(Vector2.ZERO, outer_radius, 0.0, TAU, 64, Color(0.4, 0.85, 0.3, alpha), 3.0)
    var fill_alpha: float = 0.16
    draw_circle(Vector2.ZERO, outer_radius, Color(0.35, 0.85, 0.3, fill_alpha))
    draw_circle(Vector2.ZERO, inner_radius, Color(0.05, 0.02, 0.02, 1.0))
