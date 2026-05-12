extends Node2D
## Entrapment cube — a square zone that slows enemies inside by 60% and grants
## the player +30% damage while standing in it. Lasts a fixed duration.

@export var size: float = 220.0
@export var duration: float = 10.0
@export var slow_factor: float = 0.4
@export var player_damage_bonus: float = 0.30

var elapsed: float = 0.0
var pulse: float = 0.0
var player: Node2D = null
var _buff_active: bool = false

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
        _set_player_buff(false)
        queue_free()
        return
    # Slow enemies inside the box.
    for e in get_tree().get_nodes_in_group("enemies"):
        if e == null or not (e is Node2D):
            continue
        var inside: bool = _inside(e.global_position)
        if "move_speed" in e:
            if inside and not e.has_meta("_orig_speed"):
                e.set_meta("_orig_speed", e.move_speed)
                e.move_speed = e.move_speed * slow_factor
            elif not inside and e.has_meta("_orig_speed"):
                e.move_speed = float(e.get_meta("_orig_speed"))
                e.remove_meta("_orig_speed")
    # Player damage buff toggling.
    if player != null and is_instance_valid(player):
        _set_player_buff(_inside(player.global_position))

func _inside(p: Vector2) -> bool:
    var half: float = size * 0.5
    return absf(p.x - global_position.x) <= half and absf(p.y - global_position.y) <= half

func _set_player_buff(on: bool) -> void:
    if player == null: return
    if on and not _buff_active:
        _buff_active = true
        if "damage_mult" in player:
            player.damage_mult += player_damage_bonus
    elif not on and _buff_active:
        _buff_active = false
        if "damage_mult" in player:
            player.damage_mult -= player_damage_bonus

func _draw() -> void:
    var half: float = size * 0.5
    var rect := Rect2(Vector2(-half, -half), Vector2(size, size))
    var a: float = 0.16 + 0.06 * sin(pulse * 3.2)
    draw_rect(rect, Color(1.0, 0.85, 0.35, a), true)
    draw_rect(rect, Color(1.0, 0.92, 0.5, 0.85), false, 3.0)
