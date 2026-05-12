extends CanvasLayer
## Settings modal — toggle music, sfx; shows best-run summary.

@onready var music_check: CheckBox = $Center/Box/Inner/MusicCheck
@onready var sfx_check: CheckBox = $Center/Box/Inner/SfxCheck
@onready var best_label: Label = $Center/Box/Inner/BestLabel
@onready var close_btn: Button = $Center/Box/Inner/CloseBtn

func _ready() -> void:
    visible = false
    process_mode = Node.PROCESS_MODE_ALWAYS
    music_check.button_pressed = SaveSystem.music_enabled
    sfx_check.button_pressed = SaveSystem.sfx_enabled
    music_check.toggled.connect(_on_music_toggled)
    sfx_check.toggled.connect(_on_sfx_toggled)
    close_btn.pressed.connect(toggle)
    _refresh_best()

func toggle() -> void:
    if visible:
        visible = false
        get_tree().paused = false
    else:
        _refresh_best()
        visible = true
        get_tree().paused = true

func _refresh_best() -> void:
    best_label.text = "Best Run\nWave %d   Kills %d   Level %d   Souls %d" % [
        SaveSystem.best_wave, SaveSystem.best_kills, SaveSystem.best_level, SaveSystem.souls,
    ]

func _on_music_toggled(on: bool) -> void:
    SaveSystem.music_enabled = on
    AudioBus.music_enabled = on
    SaveSystem.save_now()

func _on_sfx_toggled(on: bool) -> void:
    SaveSystem.sfx_enabled = on
    AudioBus.sfx_enabled = on
    SaveSystem.save_now()
