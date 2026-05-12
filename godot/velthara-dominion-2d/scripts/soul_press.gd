extends Node2D
## Soul press — a shrinking circle. Enemies inside take damage every tick.
## Closes from outer_radius down to ~60px over `duration`.

@export var outer_radius: float = 260.0
@export var inner_radius: float = 60.0
@export var damage_per_sec: float = 32.0
@export var duration: float = 7.0

var elapsed: float = 0.0
var dmg_tick_acc: float = 0.0

func _ready() -> void:
    z_index = -2
    set_process(true)

func _process(dt: float) -> void:
    elapsed += dt
    queue_redraw()
    if elapsed >= duration:
        queue_free()
        return
    dmg_tick_acc += dt
    if dmg_tick_acc < 0.25:
        return
    var tick: float = damage_per_sec * dmg_tick_acc
    dmg_tick_acc = 0.0
    var r: float = current_radius()
    for e in get_tree().get_nodes_in_group("enemies"):
        if e == null or not (e is Node2D):
            continue
        if (e.global_position - global_position).length() < r:
            if e.has_method("take_damage"):
                e.take_damage(tick, null, false)

func current_radius() -> float:
    var t: float = clamp(elapsed / duration, 0.0, 1.0)
    return lerp(outer_radius, inner_radius, t)

func _draw() -> void:
    var r: float = current_radius()
    draw_circle(Vector2.ZERO, r, Color(0.85, 0.55, 1.0, 0.16))
    draw_arc(Vector2.ZERO, r, 0.0, TAU, 64, Color(0.85, 0.55, 1.0, 0.7), 4.0)
