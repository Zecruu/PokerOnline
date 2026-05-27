extends CharacterBody2D
## Bone Tyrant — Wave 40 boss.
##
## Phase 1 (HP > 50%): melee + bone projectiles every ~3s.
## Phase 2 (HP ≤ 50%): one-time phase-shift — summons 6 skeleton-swarm adds,
##   gains 40% damage reduction (armor), continues melee + projectiles but
##   the projectile cadence speeds up.

@export var max_hp: float = 12000.0
@export var damage: float = 120.0
@export var move_speed: float = 48.0
@export var contact_range: float = 64.0
@export var attack_cooldown: float = 1.5
@export var xp_drop: int = 600

const PROJECTILE_COOLDOWN_P1: float = 3.0
const PROJECTILE_COOLDOWN_P2: float = 1.8
const PHASE_SHIFT_AT_PCT: float = 0.5
const ADDS_PER_PHASE_SHIFT: int = 6
const ARMOR_DR_P2: float = 0.4  # 40% damage reduction in phase 2

var hp: float = max_hp
var atk_timer: float = 0.0
var hit_flash: float = 0.0
var burn_remaining: float = 0.0
var burn_dps: float = 0.0
var burn_tick_acc: float = 0.0
var dying: bool = false
var player: Node2D = null

var projectile_cd: float = 2.0
var phase: int = 1  # 1 or 2
var phase_shifted: bool = false
var phase_shift_flash: float = 0.0

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
    scale = Vector2(2.0, 2.0)

func _physics_process(dt: float) -> void:
    if dying: return
    if player == null or not is_instance_valid(player):
        var players := get_tree().get_nodes_in_group("player")
        player = players[0] if players.size() > 0 else null
        if player == null: return
    atk_timer = max(0.0, atk_timer - dt)
    hit_flash = max(0.0, hit_flash - dt)
    phase_shift_flash = max(0.0, phase_shift_flash - dt)
    projectile_cd = max(0.0, projectile_cd - dt)
    _tick_burn(dt)

    if not phase_shifted and hp <= max_hp * PHASE_SHIFT_AT_PCT:
        _phase_shift()

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
    if projectile_cd <= 0.0:
        projectile_cd = PROJECTILE_COOLDOWN_P2 if phase == 2 else PROJECTILE_COOLDOWN_P1
        _fire_bone_projectile(to_p)
    move_and_slide()

    if hit_flash > 0.0 or phase_shift_flash > 0.0:
        sprite.modulate = Color(2.0, 2.0, 2.0)
    elif phase == 2:
        sprite.modulate = Color(1.05, 0.95, 0.75)  # bone-bleached armored tint
    else:
        sprite.modulate = Color(0.95, 0.92, 0.85)  # pale bone
    hp_bar.rotation = 0.0
    hp_bar.value = max(0.0, hp)

func _phase_shift() -> void:
    phase_shifted = true
    phase = 2
    phase_shift_flash = 0.6
    # Summon 6 skeleton-swarm adds in a ring.
    var enemy_scene: PackedScene = preload("res://scenes/enemy.tscn")
    for i in range(ADDS_PER_PHASE_SHIFT):
        var angle: float = TAU * float(i) / float(ADDS_PER_PHASE_SHIFT)
        var add: Node2D = enemy_scene.instantiate()
        add.enemy_type = "swarm"
        add.max_hp = 150.0
        add.damage = 25.0
        add.move_speed = 100.0
        add.xp_drop = 6
        add.sprite_prefix = "skeleton-swarm"
        add.global_position = global_position + Vector2(cos(angle), sin(angle)) * 90.0
        get_parent().add_child(add)
    # Visual flash to sell the shift.
    var fx := Node2D.new()
    fx.global_position = global_position
    get_parent().add_child(fx)
    var gd := GDScript.new()
    gd.source_code = """
extends Node2D
var t: float = 0.0
func _ready(): set_process(true)
func _process(dt):
    t += dt
    if t > 0.6: queue_free(); return
    queue_redraw()
func _draw():
    var a = 1.0 - t / 0.6
    draw_arc(Vector2.ZERO, 60 + 100 * t, 0, TAU, 48, Color(0.95, 0.92, 0.85, a), 5.0)
"""
    gd.reload()
    fx.set_script(gd)
    var hud := _find_hud()
    if hud != null and hud.has_method("flash_text"):
        hud.flash_text("BONE TYRANT — ENRAGED")

func _find_hud() -> Node:
    var root_main: Node = get_parent()
    if root_main == null: return null
    return root_main.get_node_or_null("Hud")

func _fire_bone_projectile(to_p: Vector2) -> void:
    var proj_scene: PackedScene = preload("res://scenes/enemy_projectile.tscn")
    var p: Node2D = proj_scene.instantiate()
    p.set("direction_angle", to_p.angle())
    p.set("damage", damage * 0.6)
    p.set("color", Color(0.95, 0.92, 0.85))
    p.global_position = global_position
    get_parent().add_child(p)

func take_damage(amount: float, source: Node = null, _show: bool = true, _is_crit: bool = false) -> void:
    if dying: return
    var actual: float = amount * (1.0 - ARMOR_DR_P2) if phase == 2 else amount
    hp -= actual
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
            var actual: float = tick * (1.0 - ARMOR_DR_P2) if phase == 2 else tick
            hp -= actual
            if hp <= 0.0: _die(null)
    if burn_remaining <= 0.0: burn_dps = 0.0

func _die(source: Node) -> void:
    dying = true
    velocity = Vector2.ZERO
    hp_bar.visible = false
    var orb_scene: PackedScene = preload("res://scenes/xp_orb.tscn")
    for i in range(10):
        var orb: Node2D = orb_scene.instantiate()
        var ang: float = TAU * float(i) / 10.0
        orb.global_position = global_position + Vector2(cos(ang), sin(ang)) * 14.0
        orb.set_meta("amount", int(xp_drop / 10))
        get_parent().add_child(orb)
    if source != null and source.has_method("register_kill"):
        source.register_kill()
    var save: Node = get_tree().root.get_node_or_null("SaveSystem")
    if save != null:
        save.add_souls(220)
    sprite.play(&"death")
    await get_tree().create_timer(0.6, true).timeout
    queue_free()

func _build_sprite_frames() -> SpriteFrames:
    var frames := SpriteFrames.new()
    var prefix := "bone-tyrant"
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
