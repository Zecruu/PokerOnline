extends Node
## Autoload — recycled floating damage numbers. Solar Cataclysm + Inferno
## Volley can spawn 30+ labels per cast; allocating + tweening + freeing
## thrashes the GC and the tween system. We keep a pool of ready Labels
## that fade out and return themselves.
##
## Usage: DamageNumberPool.spawn(parent, world_pos, "12", color, is_crit)
##   parent: the Node2D the number should follow (an enemy or world anchor)
##   world_pos: where to place it (a local offset above the parent)

const POOL_SIZE: int = 96
const LIFETIME: float = 0.65
const RISE: float = 28.0

var _free: Array[Label] = []
var _container: CanvasLayer

func _ready() -> void:
    process_priority = -50
    _container = CanvasLayer.new()
    _container.layer = 5
    add_child(_container)
    for _i in range(POOL_SIZE):
        var lbl := Label.new()
        lbl.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.85))
        lbl.add_theme_constant_override("outline_size", 4)
        lbl.modulate.a = 0.0
        lbl.visible = false
        _container.add_child(lbl)
        _free.append(lbl)

# Attach a floating number at an enemy's world position. Returns true on hit,
# false if the pool ran dry (caller can fall back to silent damage).
func spawn(anchor: Node2D, text: String, color: Color, is_crit: bool = false) -> bool:
    if _free.is_empty():
        return false
    if anchor == null or not is_instance_valid(anchor):
        return false
    var lbl: Label = _free.pop_back()
    lbl.text = text
    lbl.add_theme_font_size_override("font_size", 20 if is_crit else 14)
    lbl.add_theme_color_override("font_color", color)
    lbl.visible = true
    lbl.modulate.a = 1.0
    # Place above the anchor — CanvasLayer means we render in screen-space
    # so we sample the anchor's screen position via its viewport transform.
    var cam: Camera2D = anchor.get_viewport().get_camera_2d() if anchor.get_viewport() else null
    var world: Vector2 = anchor.global_position + Vector2(randf_range(-12, 12), -40)
    var screen: Vector2 = _world_to_screen(world, cam)
    lbl.position = screen
    # Tween rise + fade, then return to pool.
    var tw := lbl.create_tween()
    tw.set_parallel(true)
    tw.tween_property(lbl, "position:y", screen.y - RISE, LIFETIME)
    tw.tween_property(lbl, "modulate:a", 0.0, LIFETIME)
    tw.chain().tween_callback(_recycle.bind(lbl))
    return true

func _recycle(lbl: Label) -> void:
    lbl.visible = false
    _free.append(lbl)

func _world_to_screen(world: Vector2, cam: Camera2D) -> Vector2:
    if cam == null:
        return world
    var vp_size: Vector2 = cam.get_viewport_rect().size
    var offset: Vector2 = world - cam.get_screen_center_position()
    return vp_size * 0.5 + offset * cam.zoom
