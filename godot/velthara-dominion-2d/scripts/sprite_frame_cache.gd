extends Node
## Autoload — caches SpriteFrames per enemy sprite-prefix so every spawn
## doesn't rebuild 18 AtlasTexture sub-resources. With 50+ enemies of the
## same prefix on screen, this drops _ready cost by ~95% and lets Godot's
## 2D batcher merge draw calls for shared textures.
##
## Keyed by sprite prefix (e.g. "skeleton-swarm"). All AnimatedSprite2D
## instances of that prefix share the same SpriteFrames pointer.

const ENEMY_DIR := "res://assets/enemies/"
const WALK_FPS: int = 9
const ATTACK_FPS: int = 11
const DEATH_FPS: int = 12

var _cache: Dictionary = {}  # prefix → SpriteFrames

func for_prefix(prefix: String) -> SpriteFrames:
    if _cache.has(prefix):
        return _cache[prefix]
    var sf := SpriteFrames.new()
    var walk: Texture2D = load("%s%s-walk.png" % [ENEMY_DIR, prefix]) as Texture2D
    var attack: Texture2D = load("%s%s-attack.png" % [ENEMY_DIR, prefix]) as Texture2D
    var death: Texture2D = load("%s%s-death.png" % [ENEMY_DIR, prefix]) as Texture2D
    if walk != null:
        _add_strip(sf, "walk", walk, WALK_FPS, true)
    if attack != null:
        _add_strip(sf, "attack", attack, ATTACK_FPS, true)
    if death != null:
        _add_strip(sf, "death", death, DEATH_FPS, false)
    _cache[prefix] = sf
    return sf

func _add_strip(sf: SpriteFrames, anim_name: String, tex: Texture2D, fps: int, loop: bool) -> void:
    sf.add_animation(anim_name)
    sf.set_animation_speed(anim_name, float(fps))
    sf.set_animation_loop(anim_name, loop)
    var h: int = tex.get_height()
    var w: int = tex.get_width() / 6
    for i in range(6):
        var atlas := AtlasTexture.new()
        atlas.atlas = tex
        atlas.region = Rect2(i * w, 0, w, h)
        sf.add_frame(anim_name, atlas)
