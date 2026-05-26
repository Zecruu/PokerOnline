extends CharacterBody2D
## Skeleton Minion — friendly summon for the Necromancer's Raise Skeleton ability.
##
## Lives for `lifetime` seconds, chases the nearest enemy, attacks on contact.
## Reuses the existing `skeleton-swarm` sprite sheets with a green tint so the
## player can tell friend from foe at a glance. NOT in the "enemies" group —
## belongs to "necromancer_minions" instead, so the wave manager + auto-attack
## targeting skip them cleanly.

@export var max_hp: float = 200.0
@export var damage: float = 40.0
@export var move_speed: float = 140.0
@export var contact_range: float = 30.0
@export var attack_cooldown: float = 1.0
@export var lifetime: float = 12.0

var hp: float = max_hp
var atk_timer: float = 0.0
var life_remaining: float = lifetime
var dying: bool = false
var current_target: Node2D = null
var owner_player: Node = null

@onready var sprite: AnimatedSprite2D = AnimatedSprite2D.new()

func _ready() -> void:
    add_to_group("necromancer_minions")
    hp = max_hp
    life_remaining = lifetime
    # Build the sprite procedurally so we don't need a dedicated .tscn.
    add_child(sprite)
    sprite.sprite_frames = _build_sprite_frames()
    sprite.animation = "walk"
    sprite.play()
    var mat := ShaderMaterial.new()
    mat.shader = load("res://assets/shaders/strip_cream_bg.gdshader")
    sprite.material = mat
    sprite.modulate = Color(0.65, 1.15, 0.65)  # green friendly tint
    # Lightweight collision shape so move_and_slide works.
    var coll := CollisionShape2D.new()
    var shape := CircleShape2D.new()
    shape.radius = 14.0
    coll.shape = shape
    add_child(coll)

func _physics_process(dt: float) -> void:
    if dying: return
    life_remaining = max(0.0, life_remaining - dt)
    if life_remaining <= 0.0:
        _expire()
        return
    atk_timer = max(0.0, atk_timer - dt)
    # Re-target whenever the current target dies or strays far.
    if current_target == null or not is_instance_valid(current_target):
        current_target = _find_nearest_enemy()
    if current_target == null:
        velocity = Vector2.ZERO
        move_and_slide()
        return
    var to_t: Vector2 = current_target.global_position - global_position
    var dist: float = to_t.length()
    if dist > contact_range:
        velocity = (to_t / max(dist, 0.001)) * move_speed
    else:
        velocity = Vector2.ZERO
        if atk_timer <= 0.0:
            atk_timer = attack_cooldown
            if current_target.has_method("take_damage"):
                # Credit the owning player for kill bookkeeping (Pyre Fuel,
                # Bloodbond, etc.) — without this the minion eats the kill.
                current_target.take_damage(damage, owner_player if owner_player != null else self)
    move_and_slide()

func _find_nearest_enemy() -> Node2D:
    var reg: Node = get_tree().root.get_node_or_null("EnemyRegistry")
    if reg != null:
        return reg.nearest_to(global_position, 600.0)
    var best: Node2D = null
    var best_d_sq: float = INF
    for e in get_tree().get_nodes_in_group("enemies"):
        if e == null or not (e is Node2D): continue
        var d_sq: float = (e.global_position - global_position).length_squared()
        if d_sq < best_d_sq:
            best = e
            best_d_sq = d_sq
    return best

func _expire() -> void:
    dying = true
    # Fade-out flicker, then despawn.
    var fx_tween := create_tween()
    fx_tween.tween_property(sprite, "modulate:a", 0.0, 0.4)
    await fx_tween.finished
    queue_free()

func _build_sprite_frames() -> SpriteFrames:
    var cache: Node = get_tree().root.get_node_or_null("SpriteFrameCache")
    if cache != null:
        return cache.for_prefix("skeleton-swarm")
    # Fallback path — the cache should always be present, but keep a safety net.
    return SpriteFrames.new()
