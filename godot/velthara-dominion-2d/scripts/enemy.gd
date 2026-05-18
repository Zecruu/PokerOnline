extends CharacterBody2D
## Generic enemy — chases the player, attacks on contact, dies on HP <= 0.
## Configure type via @export properties on the instance.

@export var enemy_type: String = "swarm"
@export var max_hp: float = 100.0
@export var damage: float = 25.0
@export var move_speed: float = 70.0
@export var contact_range: float = 36.0
@export var attack_cooldown: float = 1.5
@export var xp_drop: int = 6
# Ranged: when > 0 the enemy stops at `ranged_range` and fires a projectile
# instead of melee. Projectile speed/damage scales with our `damage`.
@export var ranged_range: float = 0.0
@export var projectile_color: Color = Color(0.7, 0.4, 1.0)

# Sprite-sheet config. Set `sprite_prefix` (e.g. "skeleton-swarm") and the
# enemy looks up its SpriteFrames from the SpriteFrameCache autoload — every
# enemy of the same prefix shares the same SpriteFrames pointer so Godot's
# 2D batcher can merge draw calls and we don't rebuild AtlasTextures.
#
# Legacy walk/attack/death_sheet exports stay for callers that prefer to
# inject textures directly; if any are set, _ready uses them instead.
@export var sprite_prefix: String = ""
@export var walk_sheet: Texture2D
@export var attack_sheet: Texture2D
@export var death_sheet: Texture2D
@export var walk_fps: int = 9
@export var attack_fps: int = 11
@export var death_fps: int = 12

var hp: float = max_hp
var atk_timer: float = 0.0
var hit_flash: float = 0.0
var dying: bool = false
var burn_remaining: float = 0.0   # seconds of burn DoT remaining
var burn_dps: float = 0.0         # burn damage per second
var burn_tick_acc: float = 0.0    # accumulator so burn ticks at ~5 Hz

@onready var sprite: AnimatedSprite2D = $AnimatedSprite2D
@onready var hp_bar: ProgressBar = $HpBar
@onready var damage_anchor: Node2D = $DamageNumberAnchor
var player: Node2D = null

func _ready() -> void:
    hp = max_hp
    add_to_group("enemies")
    sprite.sprite_frames = _build_sprite_frames()
    sprite.animation = "walk"
    sprite.play()
    sprite.material = _make_cream_strip_material()
    hp_bar.max_value = max_hp
    hp_bar.value = max_hp
    hp_bar.visible = false  # only show once damaged
    var players := get_tree().get_nodes_in_group("player")
    if players.size() > 0:
        player = players[0]

func _make_cream_strip_material() -> ShaderMaterial:
    var mat := ShaderMaterial.new()
    mat.shader = load("res://assets/shaders/strip_cream_bg.gdshader")
    return mat

func _physics_process(dt: float) -> void:
    if dying:
        return
    if player == null or not is_instance_valid(player):
        var players := get_tree().get_nodes_in_group("player")
        player = players[0] if players.size() > 0 else null
        if player == null:
            return

    atk_timer = max(0.0, atk_timer - dt)
    hit_flash = max(0.0, hit_flash - dt)
    _tick_burn(dt)

    var to_player: Vector2 = player.global_position - global_position
    var dist: float = to_player.length()

    # Ranged enemies stop at ranged_range and fire bolts; melee chase to contact.
    if ranged_range > 0.0:
        if dist > ranged_range:
            velocity = (to_player / max(dist, 0.001)) * move_speed
            if sprite.animation != &"walk":
                sprite.play(&"walk")
        else:
            velocity = (to_player / max(dist, 0.001)) * move_speed * -0.3 if dist < ranged_range * 0.55 else Vector2.ZERO
            if atk_timer <= 0.0:
                atk_timer = attack_cooldown
                _fire_projectile(to_player)
                if sprite.animation != &"attack":
                    sprite.play(&"attack")
    elif dist > contact_range:
        # Chase
        velocity = (to_player / max(dist, 0.001)) * move_speed
        if sprite.animation != &"walk":
            sprite.play(&"walk")
    else:
        velocity = Vector2.ZERO
        # Attack with cooldown
        if atk_timer <= 0.0:
            atk_timer = attack_cooldown
            if player.has_method("take_damage"):
                player.take_damage(damage, self)
            if sprite.animation != &"attack":
                sprite.play(&"attack")
    move_and_slide()
    # Frostbite expiry: restore move_speed when the slow window has passed.
    if has_meta("_frostbite_until") and Time.get_ticks_msec() >= int(get_meta("_frostbite_until")):
        if has_meta("_orig_move_speed"):
            move_speed = float(get_meta("_orig_move_speed"))
            remove_meta("_orig_move_speed")
        remove_meta("_frostbite_until")

    # Visual bookkeeping — skip entirely when far off-screen so we don't pay
    # for modulate writes, hp_bar updates, and burn-icon redraws on enemies
    # the player can't see.
    var visible_dist: bool = (dist < 900.0)
    if visible_dist:
        if hit_flash > 0.0:
            sprite.modulate = Color(2.0, 2.0, 2.0)
        elif burn_remaining > 0.0:
            sprite.modulate = Color(1.4, 0.85, 0.55)
        else:
            sprite.modulate = Color(1.0, 1.0, 1.0)
        hp_bar.rotation = 0.0
        queue_redraw()
    elif hp_bar.visible:
        hp_bar.visible = false  # hide while off-screen, will re-show on next hit

func take_damage(amount: float, source: Node = null, show_number: bool = true, is_crit: bool = false) -> void:
    if dying:
        return
    hp -= amount
    hit_flash = 0.14
    hp_bar.value = max(0.0, hp)
    hp_bar.visible = hp < max_hp and hp > 0.0
    if show_number:
        var col: Color = Color(1.0, 0.45, 0.95) if is_crit else Color(1.0, 0.92, 0.4)
        _spawn_damage_number(int(round(amount)), col, is_crit)
    if hp <= 0.0:
        _die(source)

func apply_burn(dps: float, duration: float) -> void:
    # Refresh: take the longer of the two durations and the stronger dps.
    if dps > burn_dps:
        burn_dps = dps
    if duration > burn_remaining:
        burn_remaining = duration

func _tick_burn(dt: float) -> void:
    if burn_remaining <= 0.0:
        return
    burn_remaining = max(0.0, burn_remaining - dt)
    burn_tick_acc += dt
    if burn_tick_acc >= 0.2:
        var tick: float = burn_dps * burn_tick_acc
        burn_tick_acc = 0.0
        if dying:
            return
        hp -= tick
        hp_bar.value = max(0.0, hp)
        hp_bar.visible = hp < max_hp and hp > 0.0
        _spawn_damage_number(int(round(tick)), Color(1.0, 0.55, 0.2))
        if hp <= 0.0:
            _die(null)
    if burn_remaining <= 0.0:
        burn_dps = 0.0

func _spawn_damage_number(amount: int, color: Color, is_crit: bool = false) -> void:
    if amount <= 0:
        return
    var text: String = ("%d!" % amount) if is_crit else str(amount)
    var pool: Node = get_tree().root.get_node_or_null("DamageNumberPool")
    if pool != null and pool.spawn(self, text, color, is_crit):
        return
    # Fallback: per-spawn Label (used when the pool is saturated).
    var lbl := Label.new()
    lbl.text = text
    lbl.add_theme_font_size_override("font_size", 20 if is_crit else 14)
    lbl.add_theme_color_override("font_color", color)
    lbl.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.8))
    lbl.add_theme_constant_override("outline_size", 4)
    lbl.z_index = 50
    lbl.position = Vector2(randf_range(-12, 12), 0)
    damage_anchor.add_child(lbl)
    var tw := lbl.create_tween()
    tw.set_parallel(true)
    tw.tween_property(lbl, "position:y", lbl.position.y - 28.0, 0.7)
    tw.tween_property(lbl, "modulate:a", 0.0, 0.7)
    tw.chain().tween_callback(lbl.queue_free)

func _die(source: Node) -> void:
    dying = true
    velocity = Vector2.ZERO
    hp_bar.visible = false
    # Run independently of the tree's paused state so the death animation
    # can finish even if the game is paused (e.g. level-up sigil offer).
    process_mode = Node.PROCESS_MODE_ALWAYS
    # Drop XP orb at our position.
    var orb_scene: PackedScene = preload("res://scenes/xp_orb.tscn")
    var orb: Node2D = orb_scene.instantiate()
    orb.global_position = global_position
    orb.set_meta("amount", xp_drop)
    get_parent().add_child(orb)
    # ~5% chance to also drop a random power-up.
    if randf() < 0.05:
        _drop_power_up()
    # Tell source it scored a kill.
    if source != null and source.has_method("register_kill"):
        source.register_kill()
    # Play death anim then queue_free. The timer runs even while the tree
    # is paused (second arg = process_always), so dying enemies disappear
    # cleanly during the level-up sigil-offer pause.
    if sprite.sprite_frames != null and sprite.sprite_frames.has_animation("death"):
        sprite.play(&"death")
    await get_tree().create_timer(0.55, true).timeout
    queue_free()

func _draw() -> void:
    if burn_remaining <= 0.0 or dying:
        return
    # Flame icon at top-right of enemy: triangular wisp pulsing with phase.
    var t: float = Time.get_ticks_msec() * 0.005
    var offset := Vector2(16, -28)
    var pulse: float = 1.0 + 0.15 * sin(t * 6.0)
    var pts := PackedVector2Array([
        offset + Vector2(0, -7) * pulse,
        offset + Vector2(-5, 2) * pulse,
        offset + Vector2(0, -2) * pulse,
        offset + Vector2(5, 2) * pulse,
    ])
    draw_colored_polygon(pts, Color(1.0, 0.5, 0.15, 0.95))
    draw_circle(offset + Vector2(0, 0), 2.5, Color(1.0, 0.95, 0.6))

func _fire_projectile(to_player: Vector2) -> void:
    var proj_scene: PackedScene = preload("res://scenes/enemy_projectile.tscn")
    var proj: Node2D = proj_scene.instantiate()
    proj.set("direction_angle", to_player.angle())
    proj.set("damage", damage)
    proj.set("color", projectile_color)
    proj.global_position = global_position
    get_parent().add_child(proj)

func _drop_power_up() -> void:
    var kinds := ["soul", "frenzy", "inferno", "wraith", "magnet", "heal"]
    var pu_scene: PackedScene = preload("res://scenes/power_up.tscn")
    var pu: Node2D = pu_scene.instantiate()
    pu.set("kind", kinds[randi() % kinds.size()])
    pu.global_position = global_position
    get_parent().add_child(pu)

func _build_sprite_frames() -> SpriteFrames:
    # Prefer the shared cache when we have a prefix — collapses 18 AtlasTexture
    # allocations per spawn down to a single dictionary lookup.
    if sprite_prefix != "":
        var cache: Node = get_tree().root.get_node_or_null("SpriteFrameCache")
        if cache != null:
            return cache.for_prefix(sprite_prefix)
    # Fallback: per-enemy frames built from injected textures.
    var frames := SpriteFrames.new()
    if walk_sheet != null:
        _add_strip(frames, "walk", walk_sheet, walk_fps, true)
    if attack_sheet != null:
        _add_strip(frames, "attack", attack_sheet, attack_fps, true)
    if death_sheet != null:
        _add_strip(frames, "death", death_sheet, death_fps, false)
    return frames

# All enemy strips are 6-frame horizontal layouts (64×64 per frame, 384×64 total).
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
