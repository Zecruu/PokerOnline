extends CanvasLayer
## HUD: HP bar, XP bar, level, wave, kills, alive counter, wave-flash banner,
## game-over overlay.

@onready var hp_bar: ProgressBar = $Stats/HpBar
@onready var hp_label: Label = $Stats/HpLabel
@onready var xp_bar: ProgressBar = $Stats/XpBar
@onready var level_label: Label = $Stats/LevelLabel
@onready var pyre_fuel_label: Label = $Stats/PyreFuelLabel
@onready var wave_label: Label = $TopBar/WaveLabel
@onready var kills_label: Label = $TopBar/KillsLabel
@onready var alive_label: Label = $TopBar/AliveLabel
@onready var flash_label: Label = $FlashLabel
@onready var game_over_panel: Panel = $GameOverPanel
@onready var game_over_text: Label = $GameOverPanel/Label
@onready var q_cd_label: Label = $AbilityBar/QSlot/QCdLabel
@onready var e_cd_label: Label = $AbilityBar/ESlot/ECdLabel
@onready var powerup_bar: HBoxContainer = $PowerupBar
@onready var souls_label: Label = $TopBar/SoulsLabel
@onready var best_label: Label = $TopBar/BestLabel
@onready var challenges_box: VBoxContainer = $ChallengesBox
@onready var settings_btn: Button = $SettingsBtn
@onready var ad_label: Label = $Stats/AdLabel
@onready var ap_label: Label = $Stats/ApLabel
@onready var anomaly_banner: PanelContainer = $AnomalyBanner
@onready var anomaly_name_lbl: Label = $AnomalyBanner/AnomalyBox/AnomalyName
@onready var anomaly_desc_lbl: Label = $AnomalyBanner/AnomalyBox/AnomalyDesc

var settings_panel: CanvasLayer = null

func _ready() -> void:
    add_to_group("hud")
    flash_label.modulate.a = 0.0
    game_over_panel.visible = false
    settings_btn.pressed.connect(_open_settings)
    _apply_character_ability_names()
    var sp_scene := load("res://ui/settings_panel.tscn") as PackedScene
    if sp_scene != null:
        settings_panel = sp_scene.instantiate()
        add_child(settings_panel)

func _open_settings() -> void:
    if settings_panel != null and settings_panel.has_method("toggle"):
        settings_panel.toggle()

func _apply_character_ability_names() -> void:
    # Append a small ability-name tooltip under each Q/E slot.
    var cd: Node = get_tree().root.get_node_or_null("CharacterData")
    if cd == null:
        return
    var c: Dictionary = cd.selected()
    var q_name: String = String(c.get("q_name", ""))
    var e_name: String = String(c.get("e_name", ""))
    var q_slot: Panel = $AbilityBar/QSlot
    var e_slot: Panel = $AbilityBar/ESlot
    var q_lbl := Label.new()
    q_lbl.text = q_name
    q_lbl.add_theme_color_override("font_color", Color(0.9, 0.85, 0.7))
    q_lbl.add_theme_color_override("font_outline_color", Color(0, 0, 0))
    q_lbl.add_theme_constant_override("outline_size", 3)
    q_lbl.add_theme_font_size_override("font_size", 11)
    q_lbl.anchor_left = 0.0; q_lbl.anchor_right = 1.0
    q_lbl.anchor_top = 1.0;  q_lbl.anchor_bottom = 1.0
    q_lbl.offset_top = 0.0;  q_lbl.offset_bottom = 16.0
    q_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    q_slot.add_child(q_lbl)
    var e_lbl := Label.new()
    e_lbl.text = e_name
    e_lbl.add_theme_color_override("font_color", Color(0.9, 0.85, 0.7))
    e_lbl.add_theme_color_override("font_outline_color", Color(0, 0, 0))
    e_lbl.add_theme_constant_override("outline_size", 3)
    e_lbl.add_theme_font_size_override("font_size", 11)
    e_lbl.anchor_left = 0.0; e_lbl.anchor_right = 1.0
    e_lbl.anchor_top = 1.0;  e_lbl.anchor_bottom = 1.0
    e_lbl.offset_top = 0.0;  e_lbl.offset_bottom = 16.0
    e_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    e_slot.add_child(e_lbl)

func set_hp(current: float, max_v: float) -> void:
    hp_bar.max_value = max_v
    hp_bar.value = current
    hp_label.text = "%d / %d" % [int(current), int(max_v)]

func set_xp(current: int, to_level: int, level: int) -> void:
    xp_bar.max_value = to_level
    xp_bar.value = current
    level_label.text = "Lv.%d" % level

func set_wave(wave: int) -> void:
    wave_label.text = "Wave %d" % wave

func set_kills(kills: int) -> void:
    kills_label.text = "Kills: %d" % kills

func set_pyre_fuel(stacks: int) -> void:
    pyre_fuel_label.text = "Pyre Fuel x%d" % stacks

func set_scaling(ad: float, ap_mult: float) -> void:
    ad_label.text = "AD %d" % int(round(ad))
    ap_label.text = "AP x%.2f" % ap_mult

func show_anomaly(anomaly: Resource) -> void:
    if anomaly == null:
        anomaly_banner.visible = false
        return
    anomaly_name_lbl.text = "ANOMALY: %s" % String(anomaly.display_name)
    anomaly_name_lbl.add_theme_color_override("font_color", anomaly.color)
    anomaly_desc_lbl.text = String(anomaly.description)
    anomaly_banner.visible = true
    # Pulse so the player notices the round just rotated.
    anomaly_banner.modulate = Color(1.5, 1.5, 1.5, 1.0)
    var tw := anomaly_banner.create_tween()
    tw.tween_property(anomaly_banner, "modulate", Color(1, 1, 1, 1), 0.6)

func set_alive(count: int) -> void:
    alive_label.text = "Enemies: %d" % count

func flash_text(text: String) -> void:
    flash_label.text = text
    flash_label.modulate.a = 1.0
    var tw := create_tween()
    tw.tween_property(flash_label, "modulate:a", 0.0, 1.4)

func show_game_over(kills: int, wave: int) -> void:
    game_over_text.text = "YOUR DOMINION HAS FALLEN\nKills: %d   ·   Wave: %d\n\nPress ESC to restart" % [kills, wave]
    game_over_panel.visible = true

func set_ability_cooldowns(q_cd: float, _q_max: float, e_cd: float, _e_max: float) -> void:
    q_cd_label.text = ("%.1f" % q_cd) if q_cd > 0.0 else ""
    e_cd_label.text = ("%.1f" % e_cd) if e_cd > 0.0 else ""

func set_souls(amount: int) -> void:
    souls_label.text = "Souls: %d" % amount

func set_best(wave: int, kills: int, level: int) -> void:
    best_label.text = "Best: W%d K%d L%d" % [wave, kills, level]

func set_challenges(active: Array) -> void:
    for c in challenges_box.get_children():
        c.queue_free()
    var title := Label.new()
    title.text = "Daily Challenges"
    title.add_theme_color_override("font_color", Color(0.95, 0.75, 1, 1))
    title.add_theme_font_size_override("font_size", 14)
    challenges_box.add_child(title)
    var ct: Node = get_tree().root.get_node_or_null("ChallengeTracker")
    for ch in active:
        var lbl := Label.new()
        var done: bool = false
        if ct != null:
            done = bool(ct.is_completed(ch.get("id", "")))
        var prefix: String = "✓ " if done else "○ "
        lbl.text = "%s%s (+%d)" % [prefix, ch.get("name", "?"), int(ch.get("reward", 0))]
        lbl.add_theme_color_override("font_color", Color(0.6, 0.95, 0.6) if done else Color(0.85, 0.85, 0.85))
        lbl.add_theme_font_size_override("font_size", 13)
        challenges_box.add_child(lbl)

func set_powerups(active: Dictionary) -> void:
    for child in powerup_bar.get_children():
        child.queue_free()
    var colors := {
        "frenzy": Color(1.0, 0.7, 0.2),
        "inferno": Color(1.0, 0.35, 0.18),
        "wraith": Color(0.55, 0.45, 1.0),
        "magnet": Color(0.4, 0.85, 1.0),
    }
    for kind in ["frenzy", "inferno", "wraith", "magnet"]:
        var t: float = active.get(kind, 0.0)
        if t <= 0.0: continue
        var lbl := Label.new()
        lbl.text = "%s %.1fs" % [kind.capitalize(), t]
        lbl.add_theme_color_override("font_color", colors[kind])
        lbl.add_theme_font_size_override("font_size", 16)
        powerup_bar.add_child(lbl)
