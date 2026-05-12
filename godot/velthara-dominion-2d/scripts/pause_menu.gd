extends CanvasLayer
## Pause menu — toggled with ESC during a run (only when not game-over).
## Resumes the game, opens settings, or quits back to character select.

@onready var resume_btn: Button = $Center/Box/Inner/ResumeBtn
@onready var settings_btn: Button = $Center/Box/Inner/SettingsBtn
@onready var quit_btn: Button = $Center/Box/Inner/QuitBtn

signal closed()

func _ready() -> void:
    visible = false
    process_mode = Node.PROCESS_MODE_ALWAYS
    resume_btn.pressed.connect(close)
    settings_btn.pressed.connect(_open_settings)
    quit_btn.pressed.connect(_quit_to_menu)

func open() -> void:
    visible = true
    get_tree().paused = true

func close() -> void:
    visible = false
    get_tree().paused = false
    closed.emit()

func _open_settings() -> void:
    var hud := get_tree().get_first_node_in_group("hud")
    if hud != null and hud.has_method("_open_settings"):
        hud._open_settings()

func _quit_to_menu() -> void:
    get_tree().paused = false
    get_tree().change_scene_to_file("res://scenes/character_select.tscn")
