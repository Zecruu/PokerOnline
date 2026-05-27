extends CharacterBody2D
## Void Consumer — Wave 50 FINAL BOSS.
##
## Three phases gated by HP percent:
##   Phase 1 (100%–66%): tentacle slam — every 4s telegraph 3 random AoE
##     zones near the player (1.0s telegraph) then deal AoE damage.
##   Phase 2 (66%–33%): gravity pull — passively pulls the player toward
##     the boss at 80 px/s while the player is within 200 px. Tentacles
##     keep firing but at a slower cadence.
##   Phase 3 (<33%): spawns "void rifts" — small floating nodes that fire
##     beam projectiles toward the player every 2s. Tentacles continue.
##
## On death: SaveSystem.unlocked_void_empress = true; main.gd's run summary
## is shown in victory mode (kills/wave/level + souls + "VICTORY").

@export var max_hp: float = 25000.0
@export var damage: float = 140.0
@export var move_speed: float = 32.0
@export var contact_range: float = 80.0
@export var attack_cooldown: float = 1.6
@export var xp_drop: int = 1200

const TENTACLE_COOLDOWN_P1: float = 4.0
const TENTACLE_COOLDOWN_P2: float = 5.5
const TENTACLE_COOLDOWN_P3: float = 6.0
const TENTACLE_TELEGRAPH: float = 1.0
const TENTACLE_SLAMS: int = 3
const TENTACLE_RADIUS: float = 75.0
const TENTACLE_DAMAGE_MULT: float = 1.4
const GRAVITY_RADIUS: float = 200.0
const GRAVITY_PULL_SPEED: float = 80.0
const PHASE2_AT_PCT: float = 0.66
const PHASE3_AT_PCT: float = 0.33
const RIFT_SPAWN_COOLDOWN: float = 7.0
const RIFT_MAX_COUNT: int = 3

var hp: float = max_hp
var atk_timer: float = 0.0
var hit_flash: float = 0.0
var burn_remaining: float = 0.0
var burn_dps: float = 0.0
var burn_tick_acc: float = 0.0
var dying: bool = false
var player: Node2D = null

var phase: int = 1
var phase_shift_flash: float = 0.0
var tentacle_cd: float = 3.0
var tentacle_telegraph_remaining: float = 0.0
var tentacle_zones: Array = []  # of Vector2 (global positions, baked at telegraph start)
var rift_cd: float = 5.0
var rifts: Array = []  # active rift Node2Ds, pruned on _physics_process

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
    scale = Vector2(2.4, 2.4)

func _physics_process(dt: float) -> void:
    if dying: return
    if player == null or not is_instance_valid(player):
        var players := get_tree().get_nodes_in_group("player")
        player = players[0] if players.size() > 0 else null
        if player == null: return
    atk_timer = max(0.0, atk_timer - dt)
    hit_flash = max(0.0, hit_flash - dt)
    phase_shift_flash = max(0.0, phase_shift_flash - dt)
    tentacle_cd = max(0.0, tentacle_cd - dt)
    rift_cd = max(0.0, rift_cd - dt)
    _tick_burn(dt)
    _maybe_phase_shift()

    # Phase 1+ — tentacle slam ability cycle.
    if tentacle_telegraph_remaining > 0.0:
        tentacle_telegraph_remaining = max(0.0, tentacle_telegraph_remaining - dt)
        if tentacle_telegraph_remaining <= 0.0:
            _resolve_tentacles()
    if tentacle_cd <= 0.0 and tentacle_telegraph_remaining <= 0.0:
        tentacle_cd = _tentacle_cooldown_for_phase()
        _start_tentacle_telegraph()

    # Phase 2+ — gravity pull. Always applied while close enough, no telegraph.
    if phase >= 2:
        _apply_gravity_pull(dt)

    # Phase 3 — rift spawning.
    if phase >= 3 and rift_cd <= 0.0:
        rift_cd = RIFT_SPAWN_COOLDOWN
        _spawn_void_rift()

    # Boss movement (slow chase).
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

    if hit_flash > 0.0 or phase_shift_flash > 0.0:
        sprite.modulate = Color(2.2, 1.8, 2.4)
    else:
        sprite.modulate = Color(0.65, 0.45, 1.0)  # deep void purple
    hp_bar.rotation = 0.0
    hp_bar.value = max(0.0, hp)

func _maybe_phase_shift() -> void:
    var pct: float = hp / max_hp
    if phase < 2 and pct <= PHASE2_AT_PCT:
        phase = 2
        phase_shift_flash = 0.5
        var hud := _find_hud()
        if hud != null and hud.has_method("flash_text"):
            hud.flash_text("THE VOID PULLS — PHASE 2")
    if phase < 3 and pct <= PHASE3_AT_PCT:
        phase = 3
        phase_shift_flash = 0.5
        var hud := _find_hud()
        if hud != null and hud.has_method("flash_text"):
            hud.flash_text("RIFTS OPEN — PHASE 3")

func _tentacle_cooldown_for_phase() -> float:
    if phase == 1: return TENTACLE_COOLDOWN_P1
    if phase == 2: return TENTACLE_COOLDOWN_P2
    return TENTACLE_COOLDOWN_P3

func _start_tentacle_telegraph() -> void:
    tentacle_telegraph_remaining = TENTACLE_TELEGRAPH
    tentacle_zones.clear()
    var base: Vector2 = player.global_position
    for i in range(TENTACLE_SLAMS):
        var angle: float = randf() * TAU
        var dist: float = randf_range(40.0, 130.0)
        tentacle_zones.append(base + Vector2(cos(angle), sin(angle)) * dist)

func _resolve_tentacles() -> void:
    for zone in tentacle_zones:
        if player == null or not is_instance_valid(player): break
        if (player.global_position - zone).length() <= TENTACLE_RADIUS:
            if player.has_method("take_damage"):
                player.take_damage(damage * TENTACLE_DAMAGE_MULT, self)
        # Visual burst at each zone.
        var fx := Node2D.new()
        fx.global_position = zone
        fx.set_meta("r", TENTACLE_RADIUS)
        get_parent().add_child(fx)
        var gd := GDScript.new()
        gd.source_code = """
extends Node2D
var t: float = 0.0
func _ready(): set_process(true)
func _process(dt):
    t += dt
    if t > 0.5: queue_free(); return
    queue_redraw()
func _draw():
    var r = float(get_meta(\"r\"))
    var a = 1.0 - t / 0.5
    draw_circle(Vector2.ZERO, r * (0.4 + t * 1.6), Color(0.6, 0.25, 1.0, 0.35 * a))
    draw_arc(Vector2.ZERO, r * (0.4 + t * 1.6), 0, TAU, 32, Color(0.85, 0.55, 1.0, a), 4.0)
"""
        gd.reload()
        fx.set_script(gd)
    tentacle_zones.clear()

func _apply_gravity_pull(dt: float) -> void:
    if player == null or not is_instance_valid(player): return
    var to_b: Vector2 = global_position - player.global_position
    var dist: float = to_b.length()
    if dist > GRAVITY_RADIUS or dist < 1.0: return
    var pull: Vector2 = (to_b / dist) * GRAVITY_PULL_SPEED * dt
    player.global_position += pull

func _spawn_void_rift() -> void:
    # Prune dead rifts; cap active count.
    rifts = rifts.filter(func(r): return r != null and is_instance_valid(r))
    if rifts.size() >= RIFT_MAX_COUNT: return
    var rift := Node2D.new()
    var angle: float = randf() * TAU
    rift.global_position = global_position + Vector2(cos(angle), sin(angle)) * 200.0
    rift.set_meta("damage", damage * 0.6)
    rift.set_meta("life", 12.0)
    rift.set_meta("fire_cd", 2.0)
    get_parent().add_child(rift)
    var gd := GDScript.new()
    gd.source_code = """
extends Node2D
var t: float = 0.0
var cd: float = 1.5
const FIRE_INTERVAL: float = 2.0
func _ready(): set_process(true)
func _process(dt):
    t += dt
    cd -= dt
    var life = float(get_meta(\"life\"))
    if t > life: queue_free(); return
    queue_redraw()
    if cd <= 0.0:
        cd = FIRE_INTERVAL
        _fire()
func _fire():
    var players = get_tree().get_nodes_in_group(\"player\")
    if players.is_empty(): return
    var p = players[0]
    if p == null or not is_instance_valid(p): return
    var to_p = p.global_position - global_position
    var proj_scene = preload(\"res://scenes/enemy_projectile.tscn\")
    var proj = proj_scene.instantiate()
    proj.set(\"direction_angle\", to_p.angle())
    proj.set(\"damage\", float(get_meta(\"damage\")))
    proj.set(\"color\", Color(0.75, 0.3, 1.0))
    proj.global_position = global_position
    get_parent().add_child(proj)
func _draw():
    var pulse = sin(t * 6.0) * 0.3 + 0.7
    draw_circle(Vector2.ZERO, 14.0 * pulse, Color(0.5, 0.2, 1.0, 0.7))
    draw_arc(Vector2.ZERO, 18.0 * pulse, 0, TAU, 24, Color(0.85, 0.55, 1.0, 0.9), 2.5)
    draw_arc(Vector2.ZERO, 24.0 * pulse, 0, TAU, 32, Color(0.65, 0.3, 1.0, 0.5), 1.5)
"""
    gd.reload()
    rift.set_script(gd)
    rifts.append(rift)

func _draw() -> void:
    if dying or tentacle_telegraph_remaining <= 0.0: return
    var t: float = 1.0 - clamp(tentacle_telegraph_remaining / TENTACLE_TELEGRAPH, 0.0, 1.0)
    var alpha: float = 0.35 + 0.55 * t
    for zone in tentacle_zones:
        var local: Vector2 = zone - global_position
        draw_arc(local, TENTACLE_RADIUS, 0.0, TAU, 32, Color(0.65, 0.3, 1.0, alpha), 4.0)
        draw_circle(local, TENTACLE_RADIUS, Color(0.55, 0.2, 1.0, 0.10 + 0.15 * t))

func _find_hud() -> Node:
    var root_main: Node = get_parent()
    if root_main == null: return null
    return root_main.get_node_or_null("Hud")

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
    # XP starburst.
    var orb_scene: PackedScene = preload("res://scenes/xp_orb.tscn")
    for i in range(12):
        var orb: Node2D = orb_scene.instantiate()
        var ang: float = TAU * float(i) / 12.0
        orb.global_position = global_position + Vector2(cos(ang), sin(ang)) * 18.0
        orb.set_meta("amount", int(xp_drop / 12))
        get_parent().add_child(orb)
    if source != null and source.has_method("register_kill"):
        source.register_kill()
    # Persistent unlock + victory screen.
    var save: Node = get_tree().root.get_node_or_null("SaveSystem")
    if save != null:
        save.unlocked_void_empress = true
        if save.has_method("save_now"):
            save.save_now()
        if save.has_method("add_souls"):
            save.add_souls(500)
    _trigger_victory(source)
    sprite.play(&"death")
    await get_tree().create_timer(0.8, true).timeout
    queue_free()

func _trigger_victory(source: Node) -> void:
    # Reach into Main to surface a victory run-summary. Main's run_summary
    # gained a show_victory(...) helper in the Phase 3 patch; if we're
    # running an older Main without it we silently no-op rather than crash.
    var main: Node = get_parent()
    if main == null: return
    var run_summary: Node = main.get_node_or_null("RunSummary")
    if run_summary == null: return
    if not run_summary.has_method("show_victory"): return
    var kills: int = int(source.kills) if (source != null and "kills" in source) else 0
    var level: int = int(source.level) if (source != null and "level" in source) else 1
    var wave_mgr: Node = main.get_node_or_null("WaveManager")
    var wave: int = int(wave_mgr.wave) if (wave_mgr != null and "wave" in wave_mgr) else 50
    run_summary.show_victory(kills, wave, level)

func _build_sprite_frames() -> SpriteFrames:
    var frames := SpriteFrames.new()
    var prefix := "void-consumer"
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
