extends CharacterBody2D
## Frostbinder — Wave 20 boss.
##
## Mechanic: telegraphs a 1.2s frost circle at the player's CURRENT position.
## After the telegraph expires, anyone still inside takes a damage tick + is
## frozen for 1s (player.frozen_timer). Also summons 4 ice-shard projectiles
## in cardinal directions every 8s.

@export var max_hp: float = 7500.0
@export var damage: float = 100.0
@export var move_speed: float = 35.0
@export var contact_range: float = 56.0
@export var attack_cooldown: float = 1.7
@export var xp_drop: int = 350

const FROST_TELEGRAPH_TIME: float = 1.2
const FROST_RADIUS: float = 90.0
const FROST_FREEZE_TIME: float = 1.0
const FROST_DAMAGE_MULT: float = 1.5
const FROST_COOLDOWN: float = 6.0
const SHARDS_COOLDOWN: float = 8.0
const SHARD_COUNT: int = 4

var hp: float = max_hp
var atk_timer: float = 0.0
var hit_flash: float = 0.0
var burn_remaining: float = 0.0
var burn_dps: float = 0.0
var burn_tick_acc: float = 0.0
var dying: bool = false
var player: Node2D = null

var frost_cd: float = 4.0
var frost_telegraph_remaining: float = 0.0
var frost_center: Vector2 = Vector2.ZERO
var shards_cd: float = 5.0

@onready var sprite: AnimatedSprite2D = $AnimatedSprite2D
@onready var hp_bar: ProgressBar = $HpBar

func _ready() -> void:
    add_to_group("enemies")
    hp = max_hp  # re-sync after potential external max_hp bump (see event_manager wave scalar)
    sprite.sprite_frames = _build_sprite_frames()
    sprite.animation = "walk"
    sprite.play()
    var mat := ShaderMaterial.new()
    mat.shader = load("res://assets/shaders/strip_cream_bg.gdshader")
    sprite.material = mat
    hp_bar.max_value = max_hp
    hp_bar.value = max_hp
    var players := get_tree().get_nodes_in_group("player")
    if players.size() > 0: player = players[0]
    scale = Vector2(1.7, 1.7)

func _physics_process(dt: float) -> void:
    if dying: return
    if player == null or not is_instance_valid(player):
        var players := get_tree().get_nodes_in_group("player")
        player = players[0] if players.size() > 0 else null
        if player == null: return
    atk_timer = max(0.0, atk_timer - dt)
    hit_flash = max(0.0, hit_flash - dt)
    frost_cd = max(0.0, frost_cd - dt)
    shards_cd = max(0.0, shards_cd - dt)
    _tick_burn(dt)

    if frost_telegraph_remaining > 0.0:
        frost_telegraph_remaining = max(0.0, frost_telegraph_remaining - dt)
        if frost_telegraph_remaining <= 0.0:
            _resolve_frost()
    if frost_cd <= 0.0 and frost_telegraph_remaining <= 0.0:
        frost_cd = FROST_COOLDOWN
        frost_telegraph_remaining = FROST_TELEGRAPH_TIME
        frost_center = player.global_position
    if shards_cd <= 0.0:
        shards_cd = SHARDS_COOLDOWN
        _spawn_ice_shards()

    var to_p: Vector2 = player.global_position - global_position
    var dist: float = to_p.length()
    if dist > contact_range:
        velocity = (to_p / max(dist, 0.001)) * move_speed
    else:
        velocity = Vector2.ZERO
        if atk_timer <= 0.0:
            atk_timer = attack_cooldown
            if player.has_method("take_damage"):
                player.take_damage(damage, self)
    move_and_slide()
    queue_redraw()

    if hit_flash > 0.0: sprite.modulate = Color(2.0, 2.0, 2.0)
    else: sprite.modulate = Color(0.7, 0.85, 1.4)  # ice tint
    hp_bar.rotation = 0.0
    hp_bar.value = max(0.0, hp)

func _resolve_frost() -> void:
    if player == null or not is_instance_valid(player): return
    if (player.global_position - frost_center).length() <= FROST_RADIUS:
        if player.has_method("take_damage"):
            player.take_damage(damage * FROST_DAMAGE_MULT, self)
        if "frozen_timer" in player:
            player.frozen_timer = max(float(player.frozen_timer), FROST_FREEZE_TIME)
    # Spawn a quick visual burst at the resolution point.
    var fx := Node2D.new()
    fx.global_position = frost_center
    fx.set_meta("r", FROST_RADIUS)
    get_parent().add_child(fx)
    var gd := GDScript.new()
    gd.source_code = """
extends Node2D
var t: float = 0.0
func _ready(): set_process(true)
func _process(dt):
    t += dt
    if t > 0.45: queue_free(); return
    queue_redraw()
func _draw():
    var r = float(get_meta(\"r\"))
    var a = 1.0 - t / 0.45
    draw_circle(Vector2.ZERO, r * (0.6 + t * 1.4), Color(0.55, 0.85, 1.0, 0.30 * a))
    draw_arc(Vector2.ZERO, r * (0.6 + t * 1.4), 0, TAU, 48, Color(0.85, 0.95, 1.0, a), 4.0)
"""
    gd.reload()
    fx.set_script(gd)

func _spawn_ice_shards() -> void:
    var proj_scene: PackedScene = preload("res://scenes/enemy_projectile.tscn")
    for i in range(SHARD_COUNT):
        var angle: float = TAU * float(i) / float(SHARD_COUNT)
        var p: Node2D = proj_scene.instantiate()
        p.set("direction_angle", angle)
        p.set("damage", damage * 0.7)
        p.set("color", Color(0.6, 0.85, 1.0))
        p.global_position = global_position
        get_parent().add_child(p)

func _draw() -> void:
    if dying or frost_telegraph_remaining <= 0.0: return
    var t: float = 1.0 - clamp(frost_telegraph_remaining / FROST_TELEGRAPH_TIME, 0.0, 1.0)
    var alpha: float = 0.35 + 0.55 * t
    # Telegraph is in world space but our _draw is in local space — offset.
    var local_center: Vector2 = frost_center - global_position
    draw_arc(local_center, FROST_RADIUS, 0.0, TAU, 48, Color(0.55, 0.85, 1.0, alpha), 5.0)
    draw_circle(local_center, FROST_RADIUS, Color(0.45, 0.75, 1.0, 0.10 + 0.18 * t))

func take_damage(amount: float, source: Node = null, _show: bool = true, _is_crit: bool = false) -> void:
    if dying: return
    hp -= amount
    hit_flash = 0.14
    if hp <= 0.0: _die(source)

func apply_burn(dps: float, duration: float, _source: Node = null) -> void:
    if dps > burn_dps: burn_dps = dps
    if duration > burn_remaining: burn_remaining = duration

func _tick_burn(dt: float) -> void:
    if burn_remaining <= 0.0: return
    burn_remaining = max(0.0, burn_remaining - dt)
    burn_tick_acc += dt
    if burn_tick_acc >= 0.2:
        var tick: float = burn_dps * burn_tick_acc
        burn_tick_acc = 0.0
        if not dying:
            hp -= tick
            if hp <= 0.0: _die(null)
    if burn_remaining <= 0.0: burn_dps = 0.0

func _die(source: Node) -> void:
    dying = true
    velocity = Vector2.ZERO
    hp_bar.visible = false
    var orb_scene: PackedScene = preload("res://scenes/xp_orb.tscn")
    for i in range(8):
        var orb: Node2D = orb_scene.instantiate()
        var ang: float = TAU * float(i) / 8.0
        orb.global_position = global_position + Vector2(cos(ang), sin(ang)) * 14.0
        orb.set_meta("amount", int(xp_drop / 8))
        get_parent().add_child(orb)
    if source != null and source.has_method("register_kill"):
        source.register_kill()
    var save: Node = get_tree().root.get_node_or_null("SaveSystem")
    if save != null:
        save.add_souls(140)
    sprite.play(&"death")
    await get_tree().create_timer(0.6, true).timeout
    queue_free()

func _build_sprite_frames() -> SpriteFrames:
    var frames := SpriteFrames.new()
    var prefix := "frostbinder"
    var walk_tex: Texture2D = load("res://assets/enemies/%s-walk.png" % prefix)
    var attack_tex: Texture2D = load("res://assets/enemies/%s-attack.png" % prefix)
    var death_tex: Texture2D = load("res://assets/enemies/%s-death.png" % prefix)
    _add_strip(frames, "walk", walk_tex, 9, true)
    _add_strip(frames, "attack", attack_tex, 11, true)
    _add_strip(frames, "death", death_tex, 12, false)
    return frames

func _add_strip(frames: SpriteFrames, name: String, tex: Texture2D, fps: int, loop: bool) -> void:
    frames.add_animation(name)
    frames.set_animation_speed(name, float(fps))
    frames.set_animation_loop(name, loop)
    var h: int = tex.get_height()
    var w: int = tex.get_width() / 6
    for i in range(6):
        var atlas := AtlasTexture.new()
        atlas.atlas = tex
        atlas.region = Rect2(i * w, 0, w, h)
        frames.add_frame(name, atlas)
