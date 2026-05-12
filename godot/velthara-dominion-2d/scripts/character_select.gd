extends Control
## Character select — entry scene. Lets the player browse the roster
## and start a run with the chosen Sovereign.

@onready var cards_box: HBoxContainer = $Layout/Cards
@onready var play_btn: Button = $Layout/Footer/PlayBtn
@onready var settings_btn: Button = $Layout/Footer/SettingsBtn
@onready var shop_btn: Button = $Layout/Footer/ShopBtn
@onready var title_label: Label = $Layout/Title

const RUN_SCENE := "res://scenes/main.tscn"

var settings_panel: CanvasLayer = null
var shop_panel: CanvasLayer = null

func _ready() -> void:
    _build_cards()
    play_btn.pressed.connect(_start_run)
    settings_btn.pressed.connect(_open_settings)
    shop_btn.pressed.connect(_open_shop)
    title_label.text = "VELTHARA DOMINION"
    var sp := load("res://ui/settings_panel.tscn") as PackedScene
    if sp != null:
        settings_panel = sp.instantiate()
        add_child(settings_panel)
    var sh := load("res://ui/soul_shop_panel.tscn") as PackedScene
    if sh != null:
        shop_panel = sh.instantiate()
        add_child(shop_panel)

func _build_cards() -> void:
    for child in cards_box.get_children():
        child.queue_free()
    for i in range(CharacterData.CHARS.size()):
        var c: Dictionary = CharacterData.CHARS[i]
        var btn := Button.new()
        btn.custom_minimum_size = Vector2(260, 360)
        btn.text = "%s\n\n%s\n\nDmg ×%.2f\nFire ×%.2f\nMove ×%.2f\nHP %+d" % [
            c["name"], c["desc"],
            float(c.get("damage_mult", 1.0)), float(c.get("fire_rate_mult", 1.0)),
            float(c.get("move_speed_mult", 1.0)), int(c.get("max_hp_bonus", 0.0)),
        ]
        btn.add_theme_color_override("font_color", c["color"])
        btn.add_theme_font_size_override("font_size", 15)
        btn.toggle_mode = true
        btn.button_pressed = (i == CharacterData.selected_index)
        btn.pressed.connect(_pick.bind(i))
        cards_box.add_child(btn)

func _pick(idx: int) -> void:
    CharacterData.select(idx)
    _build_cards()

func _start_run() -> void:
    get_tree().change_scene_to_file(RUN_SCENE)

func _open_settings() -> void:
    if settings_panel != null and settings_panel.has_method("toggle"):
        settings_panel.toggle()

func _open_shop() -> void:
    if shop_panel != null and shop_panel.has_method("toggle_for"):
        shop_panel.toggle_for(null)
