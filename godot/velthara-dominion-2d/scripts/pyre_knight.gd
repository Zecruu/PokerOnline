extends CharacterBody2D
## Pyre Knight — Wave 10 mini-boss.
##
## Mechanic: telegraphs a charge direction (red lance line), then sprints
## along that locked vector for ~1.5s leaving a 3-second fire trail of
## damaging patches. Cooldown ~5s between charges; melee in between.

@export var max_hp: float = 5000.0
@export var damage: float = 95.0
@export var move_speed: float = 50.0
@export var contact_range: float = 60.0
@export var attack_cooldown: float = 1.4
@export var xp_drop: int = 250

const TELEGRAPH_TIME: float = 1.0
const CHARGE_TIME: float = 1.5
const CHARGE_SPEED: float = 260.0
const CHARGE_COOLDOWN: float = 5.0
const FIRE_TRAIL_INTERVAL: float = 0.1
const FIRE_TRAIL_DURATION: float = 3.0
const FIRE_TRAIL_DPS: float = 25.0

var hp: float = max_hp
var atk_timer: float = 0.0
var hit_flash: float = 0.0
var burn_remaining: float = 0.0
var burn_dps: float = 0.0
var burn_tick_acc: float = 0.0
var dying: bool = false
var player: Node2D = null

var charge_cd: float = 3.0
var telegraph_remaining: float = 0.0
var telegraph_dir: Vector2 = Vector2.RIGHT
var charging_remaining: float = 0.0
var fire_trail_tick: float = 0.0

@onready var sprite: AnimatedSprite2D = $AnimatedSprite2D
@onready var hp_bar: ProgressBar = $HpBar

func _ready() -> void:
    add_to_group("enemies")
    # If external code (event_manager wave-scaling) bumped max_hp before _ready,
    # the class-level `var hp = max_hp` initializer already evaluated against the
    # default. Re-sync here so the boss enters play with the scaled HP.
    hp = max_hp
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
    scale = Vector2(1.8, 1.8)

func _physics_process(dt: float) -> void:
    if dying: return
    if player == null or not is_instance_valid(player):
        var players := get_tree().get_nodes_in_group("player")
        player = players[0] if players.size() > 0 else null
        if player == null: return
    atk_timer = max(0.0, atk_timer - dt)
    hit_flash = max(0.0, hit_flash - dt)
    charge_cd = max(0.0, charge_cd - dt)
    _tick_burn(dt)

    var to_p: Vector2 = player.global_position - global_position
    var dist: float = to_p.length()

    if charging_remaining > 0.0:
        charging_remaining = max(0.0, charging_remaining - dt)
        velocity = telegraph_dir * CHARGE_SPEED
        fire_trail_tick += dt
        if fire_trail_tick >= FIRE_TRAIL_INTERVAL:
            fire_trail_tick = 0.0
            _drop_fire_patch()
        if dist <= contact_range and atk_timer <= 0.0:
            atk_timer = 0.4
            if player.has_method("take_damage"):
                player.take_damage(damage * 1.5, self)
    elif telegraph_remaining > 0.0:
        telegraph_remaining = max(0.0, telegraph_remaining - dt)
        velocity = Vector2.ZERO
        if telegraph_remaining <= 0.0:
            charging_remaining = CHARGE_TIME
            charge_cd = CHARGE_COOLDOWN
            fire_trail_tick = 0.0
    else:
        if dist > contact_range:
            velocity = (to_p / max(dist, 0.001)) * move_speed
        else:
            velocity = Vector2.ZERO
            if atk_timer <= 0.0:
                atk_timer = attack_cooldown
                if player.has_method("take_damage"):
                    player.take_damage(damage, self)
        if charge_cd <= 0.0 and dist > 120.0 and dist < 620.0:
            telegraph_remaining = TELEGRAPH_TIME
            telegraph_dir = (to_p / max(dist, 0.001))
    move_and_slide()
    queue_redraw()

    if hit_flash > 0.0: sprite.modulate = Color(2.0, 2.0, 2.0)
    elif charging_remaining > 0.0: sprite.modulate = Color(1.6, 0.7, 0.35)
    else: sprite.modulate = Color(1.25, 0.65, 0.45)
    hp_bar.rotation = 0.0
    hp_bar.value = max(0.0, hp)

func _drop_fire_patch() -> void:
    var patch := Node2D.new()
    patch.global_position = global_position
    patch.set_meta("dps", FIRE_TRAIL_DPS)
    patch.set_meta("duration", FIRE_TRAIL_DURATION)
    patch.set_meta("radius", 36.0)
    get_parent().add_child(patch)
    var gd := GDScript.new()
    gd.source_code = """
extends Node2D
var t: float = 0.0
var tick_acc: float = 0.0
func _ready(): set_process(true)
func _process(dt):
    t += dt
    var dur = float(get_meta(\"duration\"))
    if t > dur: queue_free(); return
    queue_redraw()
    tick_acc += dt
    if tick_acc >= 0.25:
        tick_acc = 0.0
        var players = get_tree().get_nodes_in_group(\"player\")
        var radius = float(get_meta(\"radius\"))
        var dps = float(get_meta(\"dps\"))
        for p in players:
            if p == null or not is_instance_valid(p): continue
            if (p.global_position - global_position).length() <= radius:
                if p.has_method(\"take_damage\"):
                    p.take_damage(dps * 0.25, null)
func _draw():
    var r = float(get_meta(\"radius\"))
    var dur = float(get_meta(\"duration\"))
    var a = 1.0 - t / dur
    draw_circle(Vector2.ZERO, r, Color(1.0, 0.45, 0.15, 0.30 * a))
    draw_arc(Vector2.ZERO, r, 0, TAU, 24, Color(1.0, 0.85, 0.35, 0.55 * a), 3.0)
"""
    gd.reload()
    patch.set_script(gd)

func _draw() -> void:
    if dying: return
    if telegraph_remaining > 0.0:
        var t: float = 1.0 - clamp(telegraph_remaining / TELEGRAPH_TIME, 0.0, 1.0)
        var alpha: float = 0.35 + 0.55 * t
        var lance_len: float = CHARGE_SPEED * CHARGE_TIME * 0.6
        var end: Vector2 = telegraph_dir * lance_len
        draw_line(Vector2.ZERO, end, Color(1.0, 0.45, 0.15, alpha), 8.0)
        draw_line(Vector2.ZERO, end, Color(1.0, 0.85, 0.35, alpha), 3.0)

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
        orb.global_position = global_position + Vector2(cos(ang), sin(ang)) * 12.0
        orb.set_meta("amount", int(xp_drop / 8))
        get_parent().add_child(orb)
    if source != null and source.has_method("register_kill"):
        source.register_kill()
    var save: Node = get_tree().root.get_node_or_null("SaveSystem")
    if save != null:
        save.add_souls(100)
    sprite.play(&"death")
    await get_tree().create_timer(0.6, true).timeout
    queue_free()

func _build_sprite_frames() -> SpriteFrames:
    # Placeholder sheets — plate-corpse-tank. Phase 3 Pass B will swap in
    # the proper Pyre Knight sprites once Replicate credit is back.
    var frames := SpriteFrames.new()
    var prefix := "plate-corpse-tank"
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
