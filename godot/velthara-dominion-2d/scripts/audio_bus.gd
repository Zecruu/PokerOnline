extends Node
## Autoload — owns the BGM AudioStreamPlayer + provides one-shot SFX playback.
## Survives scene reloads so music doesn't restart on respawn.

const BGM_VOLUME_DB: float = -10.0
const SFX_VOLUME_DB: float = -4.0

var bgm_player: AudioStreamPlayer
var sfx_player: AudioStreamPlayer
var levelup_stream: AudioStream

# User-tweakable
var music_enabled: bool = true:
    set(v): music_enabled = v; _apply_music_volume()
var sfx_enabled: bool = true

func _ready() -> void:
    bgm_player = AudioStreamPlayer.new()
    bgm_player.bus = "Master"
    bgm_player.volume_db = BGM_VOLUME_DB
    add_child(bgm_player)
    sfx_player = AudioStreamPlayer.new()
    sfx_player.bus = "Master"
    sfx_player.volume_db = SFX_VOLUME_DB
    add_child(sfx_player)
    levelup_stream = load("res://assets/audio/levelup-sound.mp3") as AudioStream
    var bgm: AudioStream = load("res://assets/audio/game-music.mp3") as AudioStream
    if bgm != null:
        bgm_player.stream = bgm
        if bgm is AudioStreamMP3:
            (bgm as AudioStreamMP3).loop = true
        bgm_player.play()
    _apply_music_volume()

func _apply_music_volume() -> void:
    if bgm_player == null: return
    bgm_player.volume_db = BGM_VOLUME_DB if music_enabled else -80.0

func play_levelup() -> void:
    if not sfx_enabled or levelup_stream == null: return
    sfx_player.stream = levelup_stream
    sfx_player.play()
