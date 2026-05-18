extends CanvasLayer
## Run summary — shown when the player dies. Lists run stats, sigils
## acquired, souls earned, and offers restart / quit-to-menu.

@onready var stats_label: Label = $Center/Box/Inner/StatsLabel
@onready var sigils_box: VBoxContainer = $Center/Box/Inner/SigilsBox
@onready var souls_label: Label = $Center/Box/Inner/SoulsLabel
@onready var restart_btn: Button = $Center/Box/Inner/Buttons/RestartBtn
@onready var menu_btn: Button = $Center/Box/Inner/Buttons/MenuBtn

func _ready() -> void:
    visible = false
    process_mode = Node.PROCESS_MODE_ALWAYS
    restart_btn.pressed.connect(_restart)
    menu_btn.pressed.connect(_to_menu)

func show_summary(kills: int, wave: int, level: int, souls_gained: int) -> void:
    stats_label.text = "YOUR DOMINION HAS FALLEN\n\nWave %d   ·   Kills %d   ·   Level %d" % [wave, kills, level]
    souls_label.text = "Souls earned: +%d   (total %d)" % [souls_gained, SaveSystem.souls]
    for c in sigils_box.get_children():
        c.queue_free()
    var title := Label.new()
    title.text = "Augments acquired"
    title.add_theme_color_override("font_color", Color(0.95, 0.75, 1, 1))
    title.add_theme_font_size_override("font_size", 16)
    sigils_box.add_child(title)
    if SigilManager.owned.is_empty():
        var none := Label.new()
        none.text = "— none —"
        none.add_theme_color_override("font_color", Color(0.6, 0.6, 0.6))
        sigils_box.add_child(none)
    else:
        for s in SigilManager.owned:
            var lbl := Label.new()
            lbl.text = "• %s  (%s)  %s" % [s.display_name, s.rarity_name(), s.description]
            lbl.add_theme_color_override("font_color", s.rarity_color())
            lbl.add_theme_font_size_override("font_size", 13)
            sigils_box.add_child(lbl)
    visible = true
    get_tree().paused = true

func _restart() -> void:
    get_tree().paused = false
    get_tree().reload_current_scene()

func _to_menu() -> void:
    get_tree().paused = false
    get_tree().change_scene_to_file("res://scenes/character_select.tscn")
