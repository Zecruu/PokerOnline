extends Area2D
## Floating power-up — picked up on player contact. The kind decides the buff.

@export var kind: String = "soul"

const PICKUP_RANGE: float = 28.0

var t: float = 0.0
var player: Node2D = null

func _ready() -> void:
    z_index = 5
    set_process(true)
    var players := get_tree().get_nodes_in_group("player")
    if players.size() > 0:
        player = players[0]

func _process(dt: float) -> void:
    t += dt
    queue_redraw()
    if player == null or not is_instance_valid(player):
        var players := get_tree().get_nodes_in_group("player")
        player = players[0] if players.size() > 0 else null
        if player == null: return
    if (player.global_position - global_position).length() <= PICKUP_RANGE:
        if player.has_method("apply_powerup"):
            player.apply_powerup(kind)
        queue_free()

func _draw() -> void:
    var col := _color_for_kind()
    var pulse: float = 1.0 + 0.16 * sin(t * 4.5)
    draw_circle(Vector2.ZERO, 18.0 * pulse, Color(col.r, col.g, col.b, 0.18))
    draw_arc(Vector2.ZERO, 14.0 * pulse, 0.0, TAU, 32, col, 3.0)
    draw_circle(Vector2.ZERO, 6.0, col)

func _color_for_kind() -> Color:
    match kind:
        "soul": return Color(0.6, 0.9, 1.0)
        "frenzy": return Color(1.0, 0.7, 0.25)
        "inferno": return Color(1.0, 0.35, 0.2)
        "wraith": return Color(0.55, 0.45, 1.0)
        "magnet": return Color(0.4, 0.85, 1.0)
        "heal": return Color(0.4, 1.0, 0.5)
    return Color(1, 1, 1)
