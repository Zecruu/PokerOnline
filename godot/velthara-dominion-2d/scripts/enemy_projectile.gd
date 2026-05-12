extends Node2D
## A simple enemy-cast projectile. Travels at SPEED in `direction_angle` and
## damages the player on contact. Self-destructs on hit or after `life` sec.

const SPEED: float = 280.0
const HIT_RADIUS: float = 14.0

var direction_angle: float = 0.0
var damage: float = 18.0
var life: float = 3.0
var color: Color = Color(0.7, 0.4, 1.0)  # purple necromancer bolt
var trail: Array[Vector2] = []

func _ready() -> void:
    z_index = 4
    set_process(true)
    rotation = direction_angle

func _process(dt: float) -> void:
    life -= dt
    if life <= 0.0:
        queue_free()
        return
    var vel: Vector2 = Vector2(cos(direction_angle), sin(direction_angle)) * SPEED
    global_position += vel * dt
    trail.append(global_position)
    if trail.size() > 6: trail.pop_front()
    queue_redraw()
    var players := get_tree().get_nodes_in_group("player")
    if players.size() > 0:
        var p: Node2D = players[0]
        if (p.global_position - global_position).length() < HIT_RADIUS:
            if p.has_method("take_damage"):
                p.take_damage(damage)
            queue_free()

func _draw() -> void:
    # Draw trail in local space relative to current position.
    for i in range(trail.size()):
        var rel: Vector2 = trail[i] - global_position
        var t: float = float(i) / max(1.0, trail.size())
        draw_circle(rel, 4.0 * (0.4 + 0.6 * t), Color(color.r, color.g, color.b, 0.4 * t))
    draw_circle(Vector2.ZERO, 6.0, Color(color.r, color.g, color.b, 1.0))
    draw_circle(Vector2.ZERO, 9.0, Color(color.r, color.g, color.b, 0.35))
