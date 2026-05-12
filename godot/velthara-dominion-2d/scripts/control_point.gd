extends Node2D
## Control point — a marker that grants souls + XP when the player holds it
## clear of enemies for a few seconds. Spawned by the event manager.

const CAPTURE_RANGE: float = 90.0
const CAPTURE_TIME: float = 5.0

var progress: float = 0.0
var done: bool = false
var player: Node2D = null

func _ready() -> void:
    z_index = -3
    set_process(true)
    var players := get_tree().get_nodes_in_group("player")
    if players.size() > 0:
        player = players[0]

func _process(dt: float) -> void:
    if done:
        return
    if player == null or not is_instance_valid(player):
        var players := get_tree().get_nodes_in_group("player")
        if players.size() > 0:
            player = players[0]
        else:
            return
    var player_in_range: bool = (player.global_position - global_position).length() <= CAPTURE_RANGE
    var enemies_in_range: bool = _enemies_in_range()
    if player_in_range and not enemies_in_range:
        progress = min(CAPTURE_TIME, progress + dt)
        if progress >= CAPTURE_TIME:
            _capture()
    elif enemies_in_range:
        progress = max(0.0, progress - dt * 0.5)
    queue_redraw()

func _enemies_in_range() -> bool:
    for e in get_tree().get_nodes_in_group("enemies"):
        if e == null or not (e is Node2D):
            continue
        if (e.global_position - global_position).length() <= CAPTURE_RANGE + 30.0:
            return true
    return false

func _capture() -> void:
    done = true
    if has_node("/root/SaveSystem"):
        SaveSystem.add_souls(40)
    if player != null and player.has_method("add_xp"):
        player.add_xp(50)
    var lbl := Label.new()
    lbl.text = "+40 souls"
    lbl.add_theme_color_override("font_color", Color(0.55, 0.95, 1.0))
    lbl.add_theme_font_size_override("font_size", 22)
    lbl.position = Vector2(-40, -10)
    add_child(lbl)
    var tw := lbl.create_tween()
    tw.tween_property(lbl, "position:y", lbl.position.y - 40, 0.9)
    tw.parallel().tween_property(lbl, "modulate:a", 0.0, 0.9)
    tw.tween_callback(queue_free)

func _draw() -> void:
    var t: float = progress / CAPTURE_TIME
    draw_circle(Vector2.ZERO, CAPTURE_RANGE, Color(0.3, 0.85, 1.0, 0.07))
    draw_arc(Vector2.ZERO, CAPTURE_RANGE, 0.0, TAU, 48, Color(0.3, 0.85, 1.0, 0.45), 2.0)
    draw_arc(Vector2.ZERO, CAPTURE_RANGE * 0.6, -PI * 0.5, -PI * 0.5 + TAU * t, 36, Color(0.55, 0.95, 1.0, 0.85), 5.0)
