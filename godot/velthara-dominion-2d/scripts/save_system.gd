extends Node
## Autoload — persistent save data: souls (currency), best run stats, settings.
## Backed by ConfigFile in user://velthara.cfg.

const SAVE_PATH := "user://velthara.cfg"

var souls: int = 0
var best_wave: int = 0
var best_kills: int = 0
var best_level: int = 0
var music_enabled: bool = true
var sfx_enabled: bool = true
var daily_seed: int = 0
var daily_progress: Dictionary = {}

signal souls_changed(amount: int)

func _ready() -> void:
    load_now()
    # Autoload-to-autoload references must use indirect lookup, since the
    # GDScript parser doesn't know about other autoload globals while
    # parsing this autoload script.
    var audio: Node = get_tree().root.get_node_or_null("AudioBus")
    if audio != null:
        audio.music_enabled = music_enabled
        audio.sfx_enabled = sfx_enabled

func add_souls(amount: int) -> void:
    souls += amount
    souls_changed.emit(souls)
    save_now()

func spend_souls(amount: int) -> bool:
    if souls < amount: return false
    souls -= amount
    souls_changed.emit(souls)
    save_now()
    return true

func record_run(kills: int, wave: int, level: int) -> void:
    if wave > best_wave: best_wave = wave
    if kills > best_kills: best_kills = kills
    if level > best_level: best_level = level
    add_souls(kills + wave * 10)

func save_now() -> void:
    var cfg := ConfigFile.new()
    cfg.set_value("currency", "souls", souls)
    cfg.set_value("best", "wave", best_wave)
    cfg.set_value("best", "kills", best_kills)
    cfg.set_value("best", "level", best_level)
    cfg.set_value("settings", "music", music_enabled)
    cfg.set_value("settings", "sfx", sfx_enabled)
    cfg.set_value("daily", "seed", daily_seed)
    cfg.set_value("daily", "progress", daily_progress)
    cfg.save(SAVE_PATH)

func load_now() -> void:
    var cfg := ConfigFile.new()
    if cfg.load(SAVE_PATH) != OK:
        return
    souls = int(cfg.get_value("currency", "souls", 0))
    best_wave = int(cfg.get_value("best", "wave", 0))
    best_kills = int(cfg.get_value("best", "kills", 0))
    best_level = int(cfg.get_value("best", "level", 0))
    music_enabled = bool(cfg.get_value("settings", "music", true))
    sfx_enabled = bool(cfg.get_value("settings", "sfx", true))
    daily_seed = int(cfg.get_value("daily", "seed", 0))
    daily_progress = cfg.get_value("daily", "progress", {})
