extends Node2D
## Solar Cataclysm — expanding circular nova that deals damage to every enemy
## the ring sweeps past once. Applies a strong burn.

const EXPAND_DURATION: float = 0.55
const MAX_RADIUS: float = 260.0

var damage: float = 220.0
var burn_dps: float = 30.0
var source: Node = null
var elapsed: float = 0.0
var hit_set: Dictionary = {}

func _ready() -> void:
    set_process(true)
    queue_redraw()

func _process(dt: float) -> void:
    elapsed += dt
    var t: float = elapsed / EXPAND_DURATION
    var radius: float = MAX_RADIUS * _ease_out_cubic(min(t, 1.0))

    # Damage everything within the current radius that we haven't hit yet.
    for e in get_tree().get_nodes_in_group("enemies"):
        if e == null or not (e is Node2D): continue
        var id: int = e.get_instance_id()
        if hit_set.has(id): continue
        if (e.global_position - global_position).length() <= radius:
            hit_set[id] = true
            if e.has_method("take_damage"):
                e.take_damage(damage, source)
            if e.has_method("apply_burn"):
                e.apply_burn(burn_dps, 3.0)

    queue_redraw()
    if t >= 1.25:  # linger ~0.14s after full expansion for the visual fade
        queue_free()

static func _ease_out_cubic(x: float) -> float:
    return 1.0 - pow(1.0 - x, 3.0)

func _draw() -> void:
    var t: float = clamp(elapsed / EXPAND_DURATION, 0.0, 1.0)
    var radius: float = MAX_RADIUS * _ease_out_cubic(t)
    var alpha: float = 1.0 - clamp((elapsed - EXPAND_DURATION) / 0.28, 0.0, 1.0)
    # Inner glow
    draw_circle(Vector2.ZERO, radius * 0.85, Color(1.0, 0.55, 0.2, 0.18 * alpha))
    # Bright leading ring
    draw_arc(Vector2.ZERO, radius, 0.0, TAU, 64, Color(1.0, 0.95, 0.45, 0.85 * alpha), 8.0)
    draw_arc(Vector2.ZERO, radius * 0.92, 0.0, TAU, 64, Color(1.0, 0.45, 0.15, 0.7 * alpha), 4.0)
