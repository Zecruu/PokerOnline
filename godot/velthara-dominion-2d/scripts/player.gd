extends CharacterBody2D
## Fire Sovereign player — Godot port of the HTML5 Velthara player.
##
## Mirrors the JS player: WASD movement, auto-attack on nearest enemy via
## fire slash arc, HP / XP / level progression, hit i-frames. Sprites use
## the same 768×512 (3×2 of 256) sheets we ship for the HTML5 build.

# ── Tuning constants (matches the HTML5 fire_sovereign class) ──
const MOVE_SPEED: float = 220.0
const MAX_HP: float = 100.0
const BASE_DAMAGE: float = 75.0
const FIRE_SLASH_RANGE: float = 200.0
const FIRE_SLASH_HALF_ANGLE: float = 0.59  # ~34° per side = 68° cone
const FIRE_SLASH_VISUAL_TIME: float = 0.38
const FIRE_RATE: float = 1.468  # seconds between auto-attacks (Caitlyn-style cadence)
const IFRAME_DURATION: float = 0.4
const XP_FOR_LEVEL: int = 50   # base xp at level 1, grows per playerXpForLevel()

# Pyre Fuel passive: every kill adds +0.6% damage per stack, no cap.
# The longer the run lives, the stronger the Sovereign becomes.
const PYRE_FUEL_DAMAGE_PER_STACK: float = 0.006

# Stardust passive: every level adds +1% damage and +0.5% fire rate.
const STARDUST_DAMAGE_PER_LEVEL: float = 0.01
const STARDUST_FIRE_RATE_PER_LEVEL: float = 0.005

# Crits: chance to roll 2× damage on every hit. Sigils can boost the chance.
const CRIT_CHANCE: float = 0.12
const CRIT_MULT: float = 2.0

# Fire slash burn DoT: applies a 2.5s burn that deals 35% of hit damage per second.
const BURN_DURATION: float = 2.5
const BURN_DPS_RATIO: float = 0.35

# Q ability: Inferno Volley — 5 homing fireballs, 7s cooldown.
const VOLLEY_COUNT: int = 5
const VOLLEY_CD: float = 7.0
const VOLLEY_DAMAGE_MULT: float = 0.8     # of current_damage()

# E ability: Solar Cataclysm — AoE nova, 18s cooldown.
const CATACLYSM_CD: float = 18.0
const CATACLYSM_DAMAGE_MULT: float = 2.6  # of current_damage()

# ── Runtime state ──
var hp: float = MAX_HP
var xp: int = 0
var level: int = 1
var xp_to_level: int = XP_FOR_LEVEL
var kills: int = 0
var pyre_fuel_stacks: int = 0
var shoot_cooldown: float = 0.0
var iframes: float = 0.0
var volley_cd: float = 0.0
var cataclysm_cd: float = 0.0
# Multipliers from sigils / power-ups
var damage_mult: float = 1.0
var fire_rate_mult: float = 1.0
var pickup_radius_mult: float = 1.0
var move_speed_mult: float = 1.0
var max_hp_bonus_from_sigils: float = 0.0
var inventory_damage_bonus: float = 0.0   # legacy — kept for backward compat
var inventory_hp_bonus: float = 0.0       # legacy
# Augment-driven stats (populated by SigilManager._reapply_to_player).
var crit_chance_bonus: float = 0.0
var lifesteal: float = 0.0
var cdr_bonus: float = 0.0
var attack_power_bonus: float = 0.0   # flat AD added (Warrior's Vow, Magnum Opus)
var spell_power_mult: float = 1.0     # multiplier on ability damage (Acolyte's, Cosmic Scroll)
var augment_tags: Dictionary = {}     # tag string → count
# Augment-state counters.
var attack_counter: int = 0           # for Combo Killer + Hellbore + Lightning Strikes
var phoenix_used: bool = false        # for Phoenix Heart
var last_stardust_level: int = 1      # for Stardust Surge
var phenomenal_evil_stacks: int = 0   # for Phenomenal Evil — +0.5% AP per kill
var time_since_attack: float = 999.0  # for Quickdraw (post-pause guaranteed crit)
var eternal_flame_tick: float = 0.0   # 1 HP/sec drain accumulator

# ── Anomaly-driven fields. Set by AnomalyManager.activate(); reset to
#    defaults by AnomalyManager.deactivate(). Fold into the existing
#    formulas so anomalies stack with permanent augment buffs. ──
var anomaly_damage_mult: float = 1.0
var anomaly_attack_damage: float = 1.0
var anomaly_ability_power: float = 1.0
var anomaly_fire_rate_mult: float = 1.0
var anomaly_move_speed_mult: float = 1.0
var anomaly_max_hp_factor: float = 1.0
var anomaly_burn_mult: float = 1.0
var anomaly_xp_mult: float = 1.0
var anomaly_crit_chance: float = 0.0
var anomaly_lifesteal: float = 0.0
var anomaly_pyre_per_kill: int = 0
var anomaly_tags: Dictionary = {}
# Power-up timers (seconds remaining)
var frenzy_timer: float = 0.0   # +75% fire rate
var inferno_timer: float = 0.0  # +50% damage
var wraith_timer: float = 0.0   # iframe-on-hit
var magnet_timer: float = 0.0   # XP attract range x4

# ── Visual ──
@onready var sprite: AnimatedSprite2D = $AnimatedSprite2D
var _cast_anim_remaining: float = 0.0

signal hp_changed(current: float, max: float)
signal xp_changed(current: int, to_level: int, level: int)
signal kill_count_changed(kills: int)
signal pyre_fuel_changed(stacks: int)
signal ability_cd_changed(q_cd: float, q_max: float, e_cd: float, e_max: float)
signal powerup_changed(active: Dictionary)
signal leveled_up(new_level: int)
signal died()

## Two clear scaling stats so the player understands the build:
##   - Attack Damage scales auto-attacks (Fire Slash, Combo Killer, etc.)
##   - Ability Power scales abilities (Q / E casts, Inferno Volley, …)
## The HUD surfaces both numbers so augment choices have a clear identity.

# Inventory accessor — totals are computed live so Mejai's-style stacking
# items reflect the current kill count without per-frame caching.
func _inv() -> Node:
    return get_tree().root.get_node_or_null("Inventory")

# Blacksmith doubles every inventory contribution.
func _inv_mult() -> float:
    return 2.0 if has_tag("blacksmith") else 1.0

func _inv_ad() -> float:
    var inv: Node = _inv()
    return inventory_damage_bonus + (inv.total_ad_bonus() * _inv_mult() if inv != null else 0.0)

func _inv_ap() -> float:
    # Additive +% AP (0.25 = +25%) summed across all inventory items + their
    # kill-stacks. Multiplied into ability damage in current_ability_power.
    var inv: Node = _inv()
    return inv.total_ap_bonus() * _inv_mult() if inv != null else 0.0

func _inv_hp() -> float:
    var inv: Node = _inv()
    return inventory_hp_bonus + (inv.total_hp_bonus() * _inv_mult() if inv != null else 0.0)

func _inv_crit() -> float:
    var inv: Node = _inv()
    return inv.total_crit_chance() if inv != null else 0.0

func _inv_lifesteal() -> float:
    var inv: Node = _inv()
    return inv.total_lifesteal() if inv != null else 0.0

func _inv_cdr() -> float:
    var inv: Node = _inv()
    return inv.total_cdr() if inv != null else 0.0

func _base_damage_shared() -> float:
    # Shared multipliers that affect both AD and AP. Includes universal
    # damage_mult, Pyre Fuel stacks, Inferno power-up, Stardust per-level,
    # the active Anomaly's damage factor, and Symphony of War scaling.
    var inferno_bonus: float = 1.5 if inferno_timer > 0.0 else 1.0
    var stardust_bonus: float = 1.0 + (level - 1) * STARDUST_DAMAGE_PER_LEVEL
    var pyre_bonus: float = 1.0 + pyre_fuel_stacks * PYRE_FUEL_DAMAGE_PER_STACK
    var symphony_bonus: float = 1.0
    if has_tag("symphony"):
        var sm: Node = get_tree().root.get_node_or_null("SigilManager")
        if sm != null:
            symphony_bonus = 1.0 + 0.03 * float(sm.owned.size())
    return damage_mult * anomaly_damage_mult * inferno_bonus * stardust_bonus * pyre_bonus * symphony_bonus

func current_attack_damage() -> float:
    # Auto-attacks: BASE + flat AD from inventory + Warrior's-Vow flat bonus,
    # then shared mults and the Anomaly's AD factor.
    return (BASE_DAMAGE + _inv_ad() + attack_power_bonus) * _base_damage_shared() * anomaly_attack_damage

func current_ability_power() -> float:
    # Abilities: shared mults × spell_power × inventory AP × Phenomenal Evil
    # × the Anomaly's AP factor. Inventory's AP is additive on top of spell
    # power (0.10 AP from items = +10% spell damage).
    var phenomenal_bonus: float = 1.0 + phenomenal_evil_stacks * 0.005
    var inv_ap_factor: float = 1.0 + _inv_ap()
    return (BASE_DAMAGE + _inv_ad()) * _base_damage_shared() * spell_power_mult * inv_ap_factor * phenomenal_bonus * anomaly_ability_power

# Back-compat alias used by older callsites — defaults to auto-attack damage.
func current_damage() -> float:
    return current_attack_damage()

func current_max_hp() -> float:
    return (MAX_HP + max_hp_bonus_from_sigils + _inv_hp()) * anomaly_max_hp_factor

func current_fire_rate() -> float:
    var frenzy_bonus: float = 1.75 if frenzy_timer > 0.0 else 1.0
    var stardust_bonus: float = 1.0 + (level - 1) * STARDUST_FIRE_RATE_PER_LEVEL
    return FIRE_RATE / (fire_rate_mult * anomaly_fire_rate_mult * frenzy_bonus * stardust_bonus)

# ── Augment helpers — also surface active anomaly tags so existing code
#    (combo_killer, jeweled_gauntlet, etc.) lights up under matching
#    anomalies (e.g. Spell Crit Rave injects jeweled_gauntlet). ──
func has_tag(t: String) -> bool:
    return augment_tags.has(t) or anomaly_tags.has(t)

func tag_count(t: String) -> int:
    return int(augment_tags.get(t, 0)) + int(anomaly_tags.get(t, 0))

func current_crit_chance() -> float:
    return CRIT_CHANCE + crit_chance_bonus + _inv_crit() + anomaly_crit_chance

func current_crit_mult() -> float:
    return 3.0 if has_tag("heavy_hitter") else CRIT_MULT

func cd_scaled(base: float) -> float:
    return base * max(0.2, 1.0 - cdr_bonus - _inv_cdr())

# Ability crit chance — without Jeweled Gauntlet, each ability uses its own
# baked-in chance. With the augment, abilities can crit at the player's full
# crit chance (or the built-in chance, whichever is higher).
func ability_crit_chance(builtin: float) -> float:
    if has_tag("jeweled_gauntlet"):
        return max(builtin, current_crit_chance())
    return builtin

func current_pickup_radius_mult() -> float:
    return pickup_radius_mult * (4.0 if magnet_timer > 0.0 else 1.0)

func _ready() -> void:
    add_to_group("player")
    _apply_character_stats()
    sprite.sprite_frames = _build_sprite_frames()
    sprite.animation = "idle"
    sprite.play()
    var mat := ShaderMaterial.new()
    mat.shader = load("res://assets/shaders/strip_cream_bg.gdshader")
    sprite.material = mat
    hp_changed.emit(hp, current_max_hp())
    xp_changed.emit(xp, xp_to_level, level)
    kill_count_changed.emit(kills)
    pyre_fuel_changed.emit(pyre_fuel_stacks)

func _apply_character_stats() -> void:
    var cd: Node = get_tree().root.get_node_or_null("CharacterData")
    if cd == null:
        return
    var c: Dictionary = cd.selected()
    damage_mult *= float(c.get("damage_mult", 1.0))
    fire_rate_mult *= float(c.get("fire_rate_mult", 1.0))
    move_speed_mult *= float(c.get("move_speed_mult", 1.0))
    max_hp_bonus_from_sigils += float(c.get("max_hp_bonus", 0.0))
    hp = current_max_hp()

func _physics_process(dt: float) -> void:
    # ── Movement (WASD relative to screen) ──
    var input_dir := Vector2(
        Input.get_action_strength("move_right") - Input.get_action_strength("move_left"),
        Input.get_action_strength("move_down") - Input.get_action_strength("move_up"),
    )
    if input_dir.length_squared() > 0.0:
        input_dir = input_dir.normalized()
    velocity = input_dir * MOVE_SPEED * move_speed_mult * anomaly_move_speed_mult
    move_and_slide()

    # ── Timers ──
    shoot_cooldown = max(0.0, shoot_cooldown - dt)
    iframes = max(0.0, iframes - dt)
    _cast_anim_remaining = max(0.0, _cast_anim_remaining - dt)
    volley_cd = max(0.0, volley_cd - dt)
    cataclysm_cd = max(0.0, cataclysm_cd - dt)
    time_since_attack += dt
    _tick_powerups(dt)
    # Eternal Flame drains 1 HP per second as the price of perma-burns.
    if has_tag("eternal_flame"):
        eternal_flame_tick += dt
        if eternal_flame_tick >= 1.0:
            eternal_flame_tick -= 1.0
            hp = max(1.0, hp - 1.0)
            hp_changed.emit(hp, current_max_hp())

    # ── Auto-attack ──
    if shoot_cooldown <= 0.0:
        _try_auto_attack()

    # ── Ability input ── (Berserker's Course anomaly locks both)
    if not has_tag("no_abilities"):
        if Input.is_action_just_pressed("ability_q") and volley_cd <= 0.0:
            if _pay_ability_blood_cost():
                _cast_q_ability()
        if Input.is_action_just_pressed("ability_e") and cataclysm_cd <= 0.0:
            if _pay_ability_blood_cost():
                _cast_e_ability()

    ability_cd_changed.emit(volley_cd, VOLLEY_CD, cataclysm_cd, CATACLYSM_CD)

    # ── Animation state ──
    _update_animation(input_dir.length_squared() > 0.0)

# Dark Pact / Hex Mirror — drain HP on ability cast. Returns false if the
# player can't afford the toll (we still let the cast through but trim HP
# to 1, never killing you with your own ability).
func _pay_ability_blood_cost() -> bool:
    var pct: float = 0.0
    if has_tag("dark_pact"): pct += 0.08
    if has_tag("hex_mirror"): pct += 0.04
    if pct <= 0.0:
        return true
    var cost: float = current_max_hp() * pct
    hp = max(1.0, hp - cost)
    hp_changed.emit(hp, current_max_hp())
    return true

func _tick_powerups(dt: float) -> void:
    var changed: bool = false
    if frenzy_timer > 0.0:
        frenzy_timer = max(0.0, frenzy_timer - dt); changed = true
    if inferno_timer > 0.0:
        inferno_timer = max(0.0, inferno_timer - dt); changed = true
    if wraith_timer > 0.0:
        wraith_timer = max(0.0, wraith_timer - dt); changed = true
    if magnet_timer > 0.0:
        magnet_timer = max(0.0, magnet_timer - dt); changed = true
    if changed:
        powerup_changed.emit({
            "frenzy": frenzy_timer, "inferno": inferno_timer,
            "wraith": wraith_timer, "magnet": magnet_timer,
        })

func apply_powerup(kind: String) -> void:
    match kind:
        "soul": add_xp(15)
        "frenzy": frenzy_timer = 8.0
        "inferno": inferno_timer = 8.0
        "wraith": wraith_timer = 6.0
        "magnet": magnet_timer = 10.0
        "heal":
            if not has_tag("no_healing"):
                hp = min(current_max_hp(), hp + 35.0)
                hp_changed.emit(hp, current_max_hp())
    powerup_changed.emit({
        "frenzy": frenzy_timer, "inferno": inferno_timer,
        "wraith": wraith_timer, "magnet": magnet_timer,
    })

func _cast_q_ability() -> void:
    var key: String = "inferno_volley"
    var cd: Node = get_tree().root.get_node_or_null("CharacterData")
    if cd != null:
        key = String(cd.selected().get("q_ability", "inferno_volley"))
    match key:
        "inferno_volley": _cast_inferno_volley()
        "holy_hammer": _cast_holy_hammer()
        "shadow_dash": _cast_shadow_dash()
        _: _cast_inferno_volley()

func _cast_e_ability() -> void:
    var key: String = "solar_cataclysm"
    var cd: Node = get_tree().root.get_node_or_null("CharacterData")
    if cd != null:
        key = String(cd.selected().get("e_ability", "solar_cataclysm"))
    match key:
        "solar_cataclysm": _cast_solar_cataclysm()
        "divine_shield": _cast_divine_shield()
        "soul_drain": _cast_soul_drain()
        _: _cast_solar_cataclysm()

func _cast_holy_hammer() -> void:
    # Smites the nearest enemy with a single huge hit. No projectile travel —
    # instant impact, big crit-friendly damage, brief stun via knock-back.
    var nearest := _find_nearest_enemy()
    if nearest == null:
        # Still consume the cooldown so it doesn't feel like input dropped.
        volley_cd = cd_scaled(VOLLEY_CD)
        return
    var is_crit: bool = randf() < ability_crit_chance(CRIT_CHANCE * 2.0)
    var dmg: float = current_ability_power() * 4.0 * (current_crit_mult() if is_crit else 1.0)
    if nearest.has_method("take_damage"):
        nearest.take_damage(dmg, self, true, is_crit)
    # Knock the enemy back a bit.
    if "velocity" in nearest:
        var dir: Vector2 = (nearest.global_position - global_position).normalized()
        nearest.velocity = dir * 320.0
    _spawn_hammer_vfx(nearest.global_position)
    volley_cd = cd_scaled(VOLLEY_CD)

func _spawn_hammer_vfx(at: Vector2) -> void:
    var fx := Node2D.new()
    fx.global_position = at
    get_parent().add_child(fx)
    var gd := GDScript.new()
    gd.source_code = """
extends Node2D
var t: float = 0.0
func _ready(): set_process(true)
func _process(dt):
    t += dt
    if t > 0.35: queue_free(); return
    queue_redraw()
func _draw():
    var a: float = 1.0 - t / 0.35
    draw_circle(Vector2.ZERO, 18 + 60 * t, Color(1.0, 0.95, 0.55, 0.45 * a))
    draw_arc(Vector2.ZERO, 18 + 60 * t, 0, TAU, 48, Color(1.0, 0.95, 0.7, a), 4.0)
"""
    gd.reload()
    fx.set_script(gd)

func _cast_divine_shield() -> void:
    # Grants wraith (dodge all hits) and full heal.
    wraith_timer = 6.0
    hp = current_max_hp()
    hp_changed.emit(hp, current_max_hp())
    powerup_changed.emit({
        "frenzy": frenzy_timer, "inferno": inferno_timer,
        "wraith": wraith_timer, "magnet": magnet_timer,
    })
    cataclysm_cd = cd_scaled(CATACLYSM_CD)

func _cast_shadow_dash() -> void:
    # Dashes 200px forward (toward movement or nearest enemy), damaging
    # everything you pass through.
    var dir: Vector2 = Vector2(
        Input.get_action_strength("move_right") - Input.get_action_strength("move_left"),
        Input.get_action_strength("move_down") - Input.get_action_strength("move_up"),
    )
    if dir.length_squared() < 0.01:
        var nearest := _find_nearest_enemy()
        if nearest != null:
            dir = (nearest.global_position - global_position).normalized()
        else:
            dir = Vector2.RIGHT
    else:
        dir = dir.normalized()
    var dash_distance: float = 220.0
    var start: Vector2 = global_position
    var end: Vector2 = start + dir * dash_distance
    global_position = end
    iframes = 0.4  # i-frames during the dash arrival
    # Hit anything in the corridor between start and end (radius 30).
    for e in _enemies():
        if e == null or not (e is Node2D): continue
        var t: float = _closest_t_on_segment(start, end, e.global_position)
        var closest: Vector2 = start.lerp(end, t)
        if (closest - e.global_position).length() <= 36.0:
            var is_crit: bool = randf() < ability_crit_chance(CRIT_CHANCE * 1.5)
            var dmg: float = current_ability_power() * 1.6 * (current_crit_mult() if is_crit else 1.0)
            if e.has_method("take_damage"):
                e.take_damage(dmg, self, true, is_crit)
    _spawn_dash_trail(start, end)
    volley_cd = cd_scaled(VOLLEY_CD)

static func _closest_t_on_segment(a: Vector2, b: Vector2, p: Vector2) -> float:
    var ab: Vector2 = b - a
    var ab_len_sq: float = ab.length_squared()
    if ab_len_sq <= 0.0001: return 0.0
    return clamp((p - a).dot(ab) / ab_len_sq, 0.0, 1.0)

func _spawn_dash_trail(start: Vector2, end: Vector2) -> void:
    var fx := Node2D.new()
    fx.global_position = (start + end) * 0.5
    fx.set_meta("a", start - fx.global_position)
    fx.set_meta("b", end - fx.global_position)
    get_parent().add_child(fx)
    var gd := GDScript.new()
    gd.source_code = """
extends Node2D
var t: float = 0.0
func _ready(): set_process(true)
func _process(dt):
    t += dt
    if t > 0.3: queue_free(); return
    queue_redraw()
func _draw():
    var a = get_meta(\"a\"); var b = get_meta(\"b\")
    var alpha = 1.0 - t / 0.3
    draw_line(a, b, Color(0.55, 0.3, 1.0, alpha), 14.0)
    draw_line(a, b, Color(0.85, 0.7, 1.0, alpha), 5.0)
"""
    gd.reload()
    fx.set_script(gd)

func _cast_soul_drain() -> void:
    # Damage every enemy within 280px and heal for 20% of total damage dealt.
    var radius: float = 280.0
    var total_dealt: float = 0.0
    var base: float = current_ability_power() * 1.5
    for e in _enemies():
        if e == null or not (e is Node2D): continue
        if (e.global_position - global_position).length() > radius: continue
        var is_crit: bool = randf() < ability_crit_chance(CRIT_CHANCE)
        var dmg: float = base * (current_crit_mult() if is_crit else 1.0)
        if e.has_method("take_damage"):
            e.take_damage(dmg, self, true, is_crit)
        total_dealt += dmg
    var heal: float = min(current_max_hp() - hp, total_dealt * 0.2)
    if heal > 0.0:
        hp += heal
        hp_changed.emit(hp, current_max_hp())
    _spawn_drain_vfx(radius)
    cataclysm_cd = cd_scaled(CATACLYSM_CD)

func _spawn_drain_vfx(radius: float) -> void:
    var fx := Node2D.new()
    fx.global_position = global_position
    fx.set_meta("r", radius)
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
    var r = get_meta(\"r\"); var alpha = 1.0 - t / 0.5
    draw_arc(Vector2.ZERO, r * (0.4 + t), 0, TAU, 48, Color(0.6, 0.25, 1.0, alpha), 6.0)
    draw_circle(Vector2.ZERO, r * 0.3, Color(0.6, 0.25, 1.0, alpha * 0.25))
"""
    gd.reload()
    fx.set_script(gd)

func _cast_inferno_volley() -> void:
    var volleys: int = 2 if has_tag("q_echo") else 1
    for _v in range(volleys):
        _spawn_inferno_volley_burst()
    volley_cd = cd_scaled(VOLLEY_CD)
    _cast_anim_remaining = FIRE_SLASH_VISUAL_TIME

func _spawn_inferno_volley_burst() -> void:
    var volley_scene: PackedScene = preload("res://scenes/inferno_volley.tscn")
    var nearest := _find_nearest_enemy()
    var base_angle: float = 0.0
    if nearest != null:
        base_angle = (nearest.global_position - global_position).angle()
    else:
        base_angle = randf() * TAU
    var ap_dmg: float = current_ability_power() * VOLLEY_DAMAGE_MULT
    var crit_chance: float = ability_crit_chance(0.12)
    var crit_mult: float = current_crit_mult()
    for i in range(VOLLEY_COUNT):
        var spread: float = (float(i) - (VOLLEY_COUNT - 1) * 0.5) * 0.22
        var p: Node2D = volley_scene.instantiate()
        p.set("direction_angle", base_angle + spread)
        p.set("damage", ap_dmg)
        p.set("burn_dps", ap_dmg * 0.30)
        p.set("crit_chance", crit_chance)
        p.set("crit_mult", crit_mult)
        p.set("source", self)
        p.global_position = global_position
        get_parent().add_child(p)

func _cast_solar_cataclysm() -> void:
    var nova_scene: PackedScene = preload("res://scenes/solar_cataclysm.tscn")
    var nova: Node2D = nova_scene.instantiate()
    nova.set("damage", current_ability_power() * CATACLYSM_DAMAGE_MULT)
    nova.set("burn_dps", current_ability_power() * 0.4)
    nova.set("crit_chance", ability_crit_chance(0.0))  # only crits with Jeweled Gauntlet
    nova.set("crit_mult", current_crit_mult())
    nova.set("source", self)
    nova.global_position = global_position
    get_parent().add_child(nova)
    cataclysm_cd = cd_scaled(CATACLYSM_CD)
    _cast_anim_remaining = FIRE_SLASH_VISUAL_TIME

# ────────────────────────────────────────────────────────────
# Auto-attack: pick nearest enemy, fire a slash in their direction
# ────────────────────────────────────────────────────────────
func _try_auto_attack() -> void:
    var nearest := _find_nearest_enemy()
    if nearest == null:
        return
    var dir: Vector2 = (nearest.global_position - global_position).normalized()
    var angle: float = atan2(dir.y, dir.x)
    _spawn_fire_slash(angle)
    _do_slash_damage(angle)
    # Cursed Blade: every swing drains 2 HP (the item gives +25 AD).
    if has_tag("cursed_drain"):
        hp = max(1.0, hp - 2.0)
        hp_changed.emit(hp, current_max_hp())
    shoot_cooldown = current_fire_rate()
    _cast_anim_remaining = FIRE_SLASH_VISUAL_TIME

func _find_nearest_enemy() -> Node2D:
    var reg: Node = get_tree().root.get_node_or_null("EnemyRegistry")
    if reg != null:
        return reg.nearest_to(global_position, FIRE_SLASH_RANGE * 2.0)
    # Fallback if registry isn't loaded yet (e.g. first frame).
    var best: Node2D = null
    var best_d_sq: float = FIRE_SLASH_RANGE * FIRE_SLASH_RANGE * 4.0
    for e in _enemies():
        if e == null or not (e is Node2D):
            continue
        var d_sq: float = (e.global_position - global_position).length_squared()
        if d_sq < best_d_sq:
            best = e
            best_d_sq = d_sq
    return best

# Returns the cached enemy array for this frame — use everywhere we'd otherwise
# call get_tree().get_nodes_in_group("enemies").
func _enemies() -> Array:
    var reg: Node = get_tree().root.get_node_or_null("EnemyRegistry")
    if reg != null:
        return reg.alive()
    return get_tree().get_nodes_in_group("enemies")

func _spawn_fire_slash(angle: float) -> void:
    var slash_scene: PackedScene = preload("res://scenes/fire_slash.tscn")
    var slash: Node2D = slash_scene.instantiate()
    slash.global_position = global_position
    slash.rotation = angle
    slash.set_meta("range", FIRE_SLASH_RANGE)
    slash.set_meta("half_angle", FIRE_SLASH_HALF_ANGLE)
    get_parent().add_child(slash)

func _do_slash_damage(angle: float) -> void:
    # Cone-shaped hit detection — every enemy in the arc + range takes damage,
    # then has a burn DoT applied. Each hit independently rolls for crit.
    var cos_half := cos(FIRE_SLASH_HALF_ANGLE)
    var forward := Vector2(cos(angle), sin(angle))
    attack_counter += 1
    # Combo Killer: every 3rd auto-attack swings for triple damage.
    var combo_bonus: float = 3.0 if (has_tag("combo_killer") and attack_counter % 3 == 0) else 1.0
    # Quickdraw: first swing after a 1.5s pause is a guaranteed crit.
    var quickdraw_active: bool = has_tag("quickdraw") and time_since_attack >= 1.5
    var base_dmg: float = current_damage() * combo_bonus
    var any_hit: bool = false
    for e in _enemies():
        if e == null or not (e is Node2D):
            continue
        var to_enemy: Vector2 = e.global_position - global_position
        var dist: float = to_enemy.length()
        if dist > FIRE_SLASH_RANGE:
            continue
        if dist <= 0.001:
            continue
        var to_enemy_norm: Vector2 = to_enemy / dist
        if forward.dot(to_enemy_norm) < cos_half:
            continue
        _deal_damage(e, base_dmg, true, quickdraw_active)
        if e.has_method("apply_burn"):
            var burn_dur: float = BURN_DURATION
            if has_tag("eternal_flame"):
                burn_dur = 9999.0  # Eternal Flame — perma-burn
            e.apply_burn(base_dmg * BURN_DPS_RATIO * anomaly_burn_mult, burn_dur)
        any_hit = true
    # Earthwake: every swing also damages enemies in a 90px aura at the player.
    if has_tag("earthwake"):
        var aoe_dmg: float = base_dmg * 0.35
        for e2 in _enemies():
            if e2 == null or not (e2 is Node2D): continue
            if (e2.global_position - global_position).length() <= 90.0:
                _deal_damage(e2, aoe_dmg, false, false)
    # Lightning Strikes: every 5th attack chains lightning to up to 2 nearby enemies.
    if has_tag("lightning_strikes") and attack_counter % 5 == 0:
        _do_lightning_chain(base_dmg)
    # Hellbore: every 10 attacks, heal 5% max HP (Abyssal Wager blocks).
    if has_tag("hellbore") and attack_counter % 10 == 0 and not has_tag("no_healing"):
        var heal: float = current_max_hp() * 0.05
        hp = min(current_max_hp(), hp + heal)
        hp_changed.emit(hp, current_max_hp())
    # Reset the post-pause counter — we just attacked.
    time_since_attack = 0.0

# Lightning Strikes — pick up to 2 nearest enemies and zap them for AoE damage.
func _do_lightning_chain(base_dmg: float) -> void:
    var pool: Array = _enemies().duplicate()
    pool.sort_custom(func(a, b):
        return (a.global_position - global_position).length_squared() < \
               (b.global_position - global_position).length_squared())
    var hit: int = 0
    for e in pool:
        if hit >= 2: break
        if e == null or not (e is Node2D): continue
        if (e.global_position - global_position).length() > 280.0: continue
        _deal_damage(e, base_dmg * 0.8, true, false)
        hit += 1

# Unified damage-dealing path so abilities + auto-attack share crit, lifesteal,
# death-mark, frostbite, and crit-cascade behavior.
func _deal_damage(target: Node2D, raw_amount: float, can_crit: bool, force_crit: bool = false) -> void:
    if target == null or not is_instance_valid(target): return
    var is_crit: bool = force_crit or (can_crit and (randf() < current_crit_chance()))
    # Death Mark: enemies already marked take +25% damage.
    var mark_mult: float = 1.0
    if has_tag("death_mark") and target.has_meta("_death_marked_until"):
        if Time.get_ticks_msec() < int(target.get_meta("_death_marked_until")):
            mark_mult = 1.25
    var dmg: float = raw_amount * mark_mult * (current_crit_mult() if is_crit else 1.0)
    if target.has_method("take_damage"):
        target.take_damage(dmg, self, true, is_crit)
    # Re-apply Death Mark for the next 4s on every hit.
    if has_tag("death_mark"):
        target.set_meta("_death_marked_until", Time.get_ticks_msec() + 4000)
    # Frostbite: 30% slow for 1s. Twin Mandibles upgrades to 50% for 0.8s.
    var has_slow: bool = has_tag("frostbite") or has_tag("twin_mandibles")
    if has_slow and "move_speed" in target:
        var slow_factor: float = 0.5 if has_tag("twin_mandibles") else 0.7
        var slow_ms: int = 800 if has_tag("twin_mandibles") else 1000
        if not target.has_meta("_orig_move_speed"):
            target.set_meta("_orig_move_speed", target.move_speed)
        target.set_meta("_frostbite_until", Time.get_ticks_msec() + slow_ms)
        target.move_speed = float(target.get_meta("_orig_move_speed")) * slow_factor
    # Lifesteal heal-on-hit (augments + inventory + anomaly stack additively).
    # Abyssal Wager (Corrupted): no_healing tag locks out all heals.
    if not has_tag("no_healing"):
        var total_lifesteal: float = lifesteal + _inv_lifesteal() + anomaly_lifesteal
        if total_lifesteal > 0.0:
            var heal: float = dmg * total_lifesteal
            hp = min(current_max_hp(), hp + heal)
            hp_changed.emit(hp, current_max_hp())
    # Crit Cascade: shave CDs on crit.
    if is_crit and has_tag("crit_cascade"):
        volley_cd = max(0.0, volley_cd - 0.5)
        cataclysm_cd = max(0.0, cataclysm_cd - 0.5)


# ────────────────────────────────────────────────────────────
# Damage in
# ────────────────────────────────────────────────────────────
func take_damage(amount: float, attacker: Node = null) -> void:
    if iframes > 0.0:
        return
    # Wraith power-up dodges every hit and refreshes iframes.
    if wraith_timer > 0.0:
        iframes = IFRAME_DURATION
        return
    # Glass Cannon anomaly: any hit drops you to 0 instantly.
    if has_tag("one_shot"):
        amount = max(amount, hp)
    # Cursed Strength / Apotheosis: take more damage as the tradeoff cost.
    if has_tag("cursed_strength"):
        amount *= 1.25
    if has_tag("fragile_god"):
        amount *= 1.5
    hp = max(0.0, hp - amount)
    iframes = IFRAME_DURATION
    hp_changed.emit(hp, current_max_hp())
    # Burning Aegis: torch the attacker right back.
    if attacker != null and is_instance_valid(attacker) and has_tag("burning_aegis"):
        if attacker.has_method("apply_burn"):
            attacker.apply_burn(current_damage() * 0.4, 5.0)
    if hp <= 0.0:
        # Phoenix Heart: revive once per run at 50% HP.
        if has_tag("phoenix_heart") and not phoenix_used:
            phoenix_used = true
            hp = current_max_hp() * 0.5
            iframes = 1.2
            hp_changed.emit(hp, current_max_hp())
            return
        died.emit()

# ────────────────────────────────────────────────────────────
# XP / level
# ────────────────────────────────────────────────────────────
func add_xp(amount: int) -> void:
    xp += int(round(float(amount) * anomaly_xp_mult))
    var did_level: bool = false
    while xp >= xp_to_level:
        xp -= xp_to_level
        level += 1
        xp_to_level = _xp_required_for(level)
        did_level = true
    xp_changed.emit(xp, xp_to_level, level)
    if did_level:
        # Stardust Surge: every 5 levels, auto-cast a free Inferno Volley.
        if has_tag("stardust_surge") and (level / 5) > (last_stardust_level / 5):
            _spawn_inferno_volley_burst()
        last_stardust_level = level
        leveled_up.emit(level)

static func _xp_required_for(lv: int) -> int:
    return int(floor(50.0 * pow(float(lv), 1.5)))

func register_kill() -> void:
    kills += 1
    kill_count_changed.emit(kills)
    # Stackasaurus Rex doubles base gain; Doomstacks anomaly adds 4 more.
    var per_kill: int = (2 if has_tag("stackasaurus") else 1) + anomaly_pyre_per_kill
    pyre_fuel_stacks += per_kill
    pyre_fuel_changed.emit(pyre_fuel_stacks)
    # Bloodbond: small heal per kill. Disabled under Abyssal Wager.
    if has_tag("bloodbond") and not has_tag("no_healing"):
        hp = min(current_max_hp(), hp + 4.0)
        hp_changed.emit(hp, current_max_hp())
    # Phenomenal Evil: each kill grants permanent +0.5% Ability Power.
    if has_tag("phenomenal_evil"):
        phenomenal_evil_stacks += 1
    # Pact of Pain: each kill burns 4 HP (the augment grants +150 max HP).
    if has_tag("pact_of_pain"):
        hp = max(1.0, hp - 4.0)
        hp_changed.emit(hp, current_max_hp())
    # Wraith Walk: each kill grants 0.4s wraith (dodge all hits).
    if has_tag("wraith_walk"):
        wraith_timer = max(wraith_timer, 0.4)

# ────────────────────────────────────────────────────────────
# Animation state machine
# ────────────────────────────────────────────────────────────
func _update_animation(is_moving: bool) -> void:
    var target: StringName = &"idle"
    if _cast_anim_remaining > 0.0:
        target = &"cast"
    elif is_moving:
        target = &"walk"
    if sprite.animation != target:
        sprite.play(target)

func _build_sprite_frames() -> SpriteFrames:
    var frames := SpriteFrames.new()
    var c: Dictionary = {}
    var cd: Node = get_tree().root.get_node_or_null("CharacterData")
    if cd != null:
        c = cd.selected()
    var cols: int = int(c.get("grid_cols", 3))
    var rows: int = int(c.get("grid_rows", 2))
    var idle_tex: Texture2D = load(c.get("idle_tex", "res://assets/characters/fire-sovereign-idle-s.png"))
    var walk_tex: Texture2D = load(c.get("walk_tex", "res://assets/characters/fire-sovereign-walk-s.png"))
    var cast_tex: Texture2D = load(c.get("cast_tex", "res://assets/characters/fire-sovereign-cast-s.png"))
    # Single-cell sheets just play one frame; multi-cell sheets play the
    # full 6-frame grid for walk/cast.
    var walk_count: int = 6 if rows >= 2 else 1
    var cast_count: int = 6 if (rows >= 2 and cast_tex != idle_tex) else 1
    _add_grid_anim(frames, "idle", idle_tex, 1, cols, 3, rows)
    _add_grid_anim(frames, "walk", walk_tex, walk_count, cols, 5, rows)
    _add_grid_anim(frames, "cast", cast_tex, cast_count, cols, 7, rows)
    return frames

func _add_grid_anim(
    frames: SpriteFrames,
    name: String,
    tex: Texture2D,
    frame_count: int,
    columns: int,
    fps: int,
    rows: int,
) -> void:
    frames.add_animation(name)
    frames.set_animation_speed(name, float(fps))
    frames.set_animation_loop(name, true)
    var w: int = tex.get_width() / columns
    var h: int = tex.get_height() / rows
    for i in range(frame_count):
        var col: int = i % columns
        var row: int = i / columns
        var atlas := AtlasTexture.new()
        atlas.atlas = tex
        atlas.region = Rect2(col * w, row * h, w, h)
        frames.add_frame(name, atlas)
