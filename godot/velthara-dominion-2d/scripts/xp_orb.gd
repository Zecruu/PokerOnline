extends Area2D
## XP orb dropped by dead enemies. Floats toward the player when within
## attraction range, gives XP on contact.

const ATTRACT_RANGE: float = 120.0
const PICKUP_RANGE: float = 18.0
const ATTRACT_SPEED: float = 320.0

var amount: int = 6
var life: float = 12.0
var player: Node2D = null

func _ready() -> void:
    if has_meta("amount"):
        amount = int(get_meta("amount"))
    var players := get_tree().get_nodes_in_group("player")
    if players.size() > 0:
        player = players[0]

func _physics_process(dt: float) -> void:
    life -= dt
    if life <= 0.0:
        queue_free()
        return
    if player == null or not is_instance_valid(player):
        return
    var to_p: Vector2 = player.global_position - global_position
    var dist: float = to_p.length()
    if dist <= PICKUP_RANGE:
        if player.has_method("add_xp"):
            player.add_xp(amount)
        queue_free()
        return
    var range_mult: float = 1.0
    if player.has_method("current_pickup_radius_mult"):
        range_mult = player.current_pickup_radius_mult()
    if dist < ATTRACT_RANGE * range_mult:
        global_position += (to_p / max(dist, 0.001)) * ATTRACT_SPEED * dt
