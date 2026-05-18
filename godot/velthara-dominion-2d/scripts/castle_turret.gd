extends Node2D
## Castle Anomaly ally — stationary turret that picks the nearest enemy
## within range every second and fires a projectile at it. Despawns when
## the player no longer has the `castle` tag (anomaly ended).

const FIRE_INTERVAL: float = 1.0
const RANGE: float = 420.0
const DAMAGE: float = 60.0
const PULSE_RATE: float = 2.5  # for the rotating barrel visual

var fire_timer: float = 0.0
var pulse: float = 0.0
var player: Node2D = null

func _ready() -> void:
    z_index = -2
    set_process(true)
    var players := get_tree().get_nodes_in_group("player")
    if players.size() > 0:
        player = players[0]

func _process(dt: float) -> void:
    pulse += dt
    fire_timer = max(0.0, fire_timer - dt)
    # Despawn when the anomaly ends (player loses the castle tag).
    if player != null and is_instance_valid(player) and player.has_method("has_tag"):
        if not player.has_tag("castle"):
            queue_free()
            return
    var reg: Node = get_tree().root.get_node_or_null("EnemyRegistry")
    if reg == null: return
    var nearest: Node2D = reg.nearest_to(global_position, RANGE)
    if nearest == null:
        queue_redraw()
        return
    if fire_timer <= 0.0:
        fire_timer = FIRE_INTERVAL
        _fire(nearest)
    queue_redraw()

func _fire(target: Node2D) -> void:
    var proj_script := preload("res://scripts/castle_projectile.gd")
    var p: Node2D = Node2D.new()
    p.set_script(proj_script)
    p.set("direction_angle", (target.global_position - global_position).angle())
    p.set("damage", DAMAGE)
    p.global_position = global_position
    get_parent().add_child(p)

func _draw() -> void:
    # Stone base.
    draw_circle(Vector2.ZERO, 22.0, Color(0.18, 0.16, 0.12))
    draw_arc(Vector2.ZERO, 22.0, 0.0, TAU, 32, Color(0.55, 0.45, 0.32), 3.0)
    # Glowing core.
    var glow: float = 0.5 + 0.3 * sin(pulse * PULSE_RATE * TAU)
    draw_circle(Vector2.ZERO, 9.0, Color(1.0, 0.95, 0.45, glow))
    # Range ring (faint).
    draw_arc(Vector2.ZERO, RANGE, 0.0, TAU, 64, Color(1.0, 0.95, 0.45, 0.10), 1.0)
