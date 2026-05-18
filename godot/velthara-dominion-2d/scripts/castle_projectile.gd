extends Node2D
## Castle turret projectile — mirror of enemy_projectile but targets
## enemies (the turret is on the player's side).

const SPEED: float = 360.0
const HIT_RADIUS: float = 14.0

var direction_angle: float = 0.0
var damage: float = 60.0
var life: float = 2.0
var color: Color = Color(1.0, 0.95, 0.45)
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
    var reg: Node = get_tree().root.get_node_or_null("EnemyRegistry")
    if reg == null: return
    for e in reg.alive():
        if e == null or not (e is Node2D): continue
        if (e.global_position - global_position).length_squared() < HIT_RADIUS * HIT_RADIUS:
            if e.has_method("take_damage"):
                e.take_damage(damage, null, true, false)
            queue_free()
            return

func _draw() -> void:
    for i in range(trail.size()):
        var rel: Vector2 = trail[i] - global_position
        var t: float = float(i) / max(1.0, trail.size())
        draw_circle(rel, 4.0 * (0.4 + 0.6 * t), Color(color.r, color.g, color.b, 0.4 * t))
    draw_circle(Vector2.ZERO, 6.0, color)
    draw_circle(Vector2.ZERO, 9.0, Color(color.r, color.g, color.b, 0.35))
