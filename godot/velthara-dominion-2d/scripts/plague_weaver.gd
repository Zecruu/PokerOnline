extends CharacterBody2D
## Plague Weaver — named boss. Chases the player but every few seconds
## spawns 3 imp adds and emits a short-lived poison ring at its feet.

@export var max_hp: float = 9000.0
@export var damage: float = 90.0
@export var move_speed: float = 38.0
@export var contact_range: float = 60.0
@export var attack_cooldown: float = 1.6
@export var xp_drop: int = 400

var hp: float = max_hp
var atk_timer: float = 0.0
var hit_flash: float = 0.0
var burn_remaining: float = 0.0
var burn_dps: float = 0.0
var burn_tick_acc: float = 0.0
var dying: bool = false
var ability_timer: float = 4.0
var telegraph_remaining: float = 0.0  # >0 while warning before ability cast
const TELEGRAPH_TIME: float = 0.8
var player: Node2D = null

@onready var sprite: AnimatedSprite2D = $AnimatedSprite2D
@onready var hp_bar: ProgressBar = $HpBar

func _ready() -> void:
    add_to_group("enemies")
    sprite.sprite_frames = _build_sprite_frames()
    sprite.animation = "walk"
    sprite.play()
    hp_bar.max_value = max_hp
    hp_bar.value = max_hp
    var players := get_tree().get_nodes_in_group("player")
    if players.size() > 0: player = players[0]
    scale = Vector2(1.9, 1.9)

func _physics_process(dt: float) -> void:
    if dying: return
    if player == null or not is_instance_valid(player):
        var players := get_tree().get_nodes_in_group("player")
        player = players[0] if players.size() > 0 else null
        if player == null: return
    atk_timer = max(0.0, atk_timer - dt)
    hit_flash = max(0.0, hit_flash - dt)
    ability_timer = max(0.0, ability_timer - dt)
    _tick_burn(dt)

    telegraph_remaining = max(0.0, telegraph_remaining - dt)
    if ability_timer <= TELEGRAPH_TIME and telegraph_remaining <= 0.0 and ability_timer > 0.0:
        # Begin telegraph
        telegraph_remaining = ability_timer
        queue_redraw()
    if ability_timer <= 0.0:
        ability_timer = 6.5
        _ability_pulse()
    queue_redraw()

    var to_p: Vector2 = player.global_position - global_position
    var dist: float = to_p.length()
    if dist > contact_range:
        velocity = (to_p / max(dist, 0.001)) * move_speed
    else:
        velocity = Vector2.ZERO
        if atk_timer <= 0.0:
            atk_timer = attack_cooldown
            if player.has_method("take_damage"):
                player.take_damage(damage)
    move_and_slide()

    if hit_flash > 0.0:
        sprite.modulate = Color(2.0, 2.0, 2.0)
    elif burn_remaining > 0.0:
        sprite.modulate = Color(1.4, 0.85, 0.55)
    else:
        sprite.modulate = Color(0.85, 1.0, 0.55)  # sickly green tint
    hp_bar.rotation = 0.0

func take_damage(amount: float, source: Node = null, _show: bool = true, _is_crit: bool = false) -> void:
    if dying: return
    hp -= amount
    hit_flash = 0.14
    hp_bar.value = max(0.0, hp)
    if hp <= 0.0:
        _die(source)

func apply_burn(dps: float, duration: float) -> void:
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
            hp_bar.value = max(0.0, hp)
            if hp <= 0.0: _die(null)
    if burn_remaining <= 0.0: burn_dps = 0.0

func _draw() -> void:
    if telegraph_remaining <= 0.0 or dying: return
    var t: float = 1.0 - clamp(telegraph_remaining / TELEGRAPH_TIME, 0.0, 1.0)
    var radius: float = 110.0
    var alpha: float = 0.35 + 0.55 * t
    draw_arc(Vector2.ZERO, radius, 0.0, TAU, 48, Color(0.6, 1.0, 0.45, alpha), 5.0)
    draw_circle(Vector2.ZERO, radius, Color(0.4, 0.9, 0.35, 0.10 + 0.18 * t))

func _ability_pulse() -> void:
    telegraph_remaining = 0.0
    queue_redraw()
    # Drop a poison ring at our feet.
    var ring_script := preload("res://scripts/poison_ring.gd")
    var ring: Node2D = ring_script.new()
    ring.global_position = global_position
    get_parent().add_child(ring)
    # Spawn 3 imp adds in a triangle.
    var enemy_scene: PackedScene = preload("res://scenes/enemy.tscn")
    for i in range(3):
        var angle: float = (TAU / 3.0) * float(i)
        var add: Node2D = enemy_scene.instantiate()
        add.enemy_type = "imp"
        add.max_hp = 70.0
        add.damage = 18.0
        add.move_speed = 165.0
        add.xp_drop = 4
        add.walk_sheet = load("res://assets/enemies/imp-scavenger-goblin-walk.png")
        add.attack_sheet = load("res://assets/enemies/imp-scavenger-goblin-attack.png")
        add.death_sheet = load("res://assets/enemies/imp-scavenger-goblin-death.png")
        add.global_position = global_position + Vector2(cos(angle), sin(angle)) * 70.0
        get_parent().add_child(add)

func _die(source: Node) -> void:
    dying = true
    velocity = Vector2.ZERO
    hp_bar.visible = false
    var orb_scene: PackedScene = preload("res://scenes/xp_orb.tscn")
    # Drop 8 orbs in a starburst for a satisfying kill payoff.
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
        save.add_souls(150)
    sprite.play(&"death")
    await sprite.animation_finished
    queue_free()

func _build_sprite_frames() -> SpriteFrames:
    # Reuse the necromancer sheets — green tint sells "plague" theme.
    var frames := SpriteFrames.new()
    var prefix := "cultist-hollow-necromancer"
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
