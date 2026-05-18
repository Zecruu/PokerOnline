extends Node2D
## Inferno Volley projectile — homing fireball that seeks the nearest enemy
## within `seek_range`, then explodes on contact for `damage` + applies burn.

const SPEED: float = 380.0
const TURN_RATE: float = 6.5            # radians/sec
const LIFE: float = 2.2
const HIT_RADIUS: float = 22.0
const SEEK_RANGE: float = 600.0
const EXPLOSION_RADIUS: float = 56.0

var velocity_vec: Vector2 = Vector2.ZERO
var direction_angle: float = 0.0
var damage: float = 60.0
var burn_dps: float = 18.0
var crit_chance: float = 0.12   # set at spawn by player (honors Jeweled Gauntlet)
var crit_mult: float = 2.0      # set at spawn (honors Heavy Hitter)
var source: Node = null
var life_left: float = LIFE
var target: Node2D = null

func _ready() -> void:
    velocity_vec = Vector2(cos(direction_angle), sin(direction_angle)) * SPEED
    set_process(true)
    queue_redraw()

func _process(dt: float) -> void:
    life_left -= dt
    if life_left <= 0.0:
        _explode()
        return

    _acquire_target_if_needed()
    if target != null and is_instance_valid(target):
        var desired := (target.global_position - global_position).angle()
        direction_angle = _rotate_toward(direction_angle, desired, TURN_RATE * dt)
    velocity_vec = Vector2(cos(direction_angle), sin(direction_angle)) * SPEED
    global_position += velocity_vec * dt
    rotation = direction_angle
    queue_redraw()

    # Direct hit detection
    for e in get_tree().get_nodes_in_group("enemies"):
        if e == null or not (e is Node2D): continue
        if (e.global_position - global_position).length_squared() < HIT_RADIUS * HIT_RADIUS:
            _explode()
            return

func _acquire_target_if_needed() -> void:
    if target != null and is_instance_valid(target):
        return
    var best: Node2D = null
    var best_d_sq: float = SEEK_RANGE * SEEK_RANGE
    for e in get_tree().get_nodes_in_group("enemies"):
        if e == null or not (e is Node2D): continue
        var d_sq: float = (e.global_position - global_position).length_squared()
        if d_sq < best_d_sq:
            best = e
            best_d_sq = d_sq
    target = best

static func _rotate_toward(current: float, desired: float, max_step: float) -> float:
    var diff: float = wrapf(desired - current, -PI, PI)
    if abs(diff) <= max_step:
        return desired
    return current + sign(diff) * max_step

func _explode() -> void:
    for e in get_tree().get_nodes_in_group("enemies"):
        if e == null or not (e is Node2D): continue
        if (e.global_position - global_position).length() > EXPLOSION_RADIUS: continue
        var is_crit: bool = randf() < crit_chance
        var dmg: float = damage * (crit_mult if is_crit else 1.0)
        if e.has_method("take_damage"):
            e.take_damage(dmg, source, true, is_crit)
        if e.has_method("apply_burn"):
            e.apply_burn(burn_dps, 2.0)
    _spawn_blast_vfx()
    queue_free()

func _spawn_blast_vfx() -> void:
    var blast := Node2D.new()
    blast.global_position = global_position
    get_parent().add_child(blast)
    var time_left := 0.32
    var radius := EXPLOSION_RADIUS
    blast.set_meta("life", time_left)
    blast.set_meta("max_life", time_left)
    blast.set_meta("radius", radius)
    blast.set_script(_make_blast_script())

func _make_blast_script() -> GDScript:
    var src := """
extends Node2D
func _ready(): set_process(true); queue_redraw()
func _process(dt):
    var l = get_meta(\"life\") - dt
    if l <= 0.0: queue_free(); return
    set_meta(\"life\", l); queue_redraw()
func _draw():
    var l = get_meta(\"life\"); var ml = get_meta(\"max_life\"); var r = get_meta(\"radius\")
    var t = clamp(1.0 - l/ml, 0.0, 1.0)
    var alpha = (1.0 - t) * 0.85
    draw_circle(Vector2.ZERO, r * (0.55 + 0.6 * t), Color(1.0, 0.55, 0.2, alpha * 0.45))
    draw_arc(Vector2.ZERO, r * (0.55 + 0.6 * t), 0.0, TAU, 48, Color(1.0, 0.8, 0.3, alpha), 3.0)
"""
    var gd := GDScript.new()
    gd.source_code = src
    gd.reload()
    return gd

func _draw() -> void:
    # Fireball body — bright yellow-orange core with crimson outer ring.
    draw_circle(Vector2.ZERO, 9.0, Color(1.0, 0.95, 0.55, 1.0))
    draw_circle(Vector2.ZERO, 13.0, Color(1.0, 0.55, 0.18, 0.55))
    # Trail
    for i in range(6):
        var t: float = float(i + 1) / 6.0
        var pos: Vector2 = Vector2(-t * 24.0, 0.0)
        draw_circle(pos, 9.0 * (1.0 - t), Color(1.0, 0.4, 0.15, 0.45 * (1.0 - t)))
