extends Node2D
## Fire Slash visual — a fiery crescent that fades over FIRE_SLASH_VISUAL_TIME.
## Damage application happens in player.gd; this node is pure VFX.

var life: float = 0.38
var max_life: float = 0.38
var slash_range: float = 200.0
var half_angle: float = 0.59

func _ready() -> void:
    if has_meta("range"):
        slash_range = float(get_meta("range"))
        max_life = 0.38
    if has_meta("half_angle"):
        half_angle = float(get_meta("half_angle"))
    life = max_life

func _process(dt: float) -> void:
    life -= dt
    if life <= 0.0:
        queue_free()
        return
    queue_redraw()

func _draw() -> void:
    # Annular sector — inner radius 55% of range to outer 105%.
    var t: float = clamp(1.0 - life / max_life, 0.0, 1.0)
    var ease: float = 1.0 - pow(1.0 - t, 3.0) # ease-out cubic
    var scale_mult: float = 1.0 + ease * 0.18
    var alpha: float = (1.0 - ease * ease) * 0.95

    var inner: float = slash_range * 0.55 * scale_mult
    var outer: float = slash_range * 1.05 * scale_mult
    var segments: int = 24
    var step: float = (half_angle * 2.0) / segments
    var pts := PackedVector2Array()
    var cols := PackedColorArray()

    # Sweep along the outer arc.
    for i in range(segments + 1):
        var a: float = -half_angle + step * i
        var d := Vector2(cos(a), sin(a))
        # Color: inner cell white-yellow, outer cell deep crimson.
        pts.append(d * inner)
        cols.append(Color(1.0, 0.85, 0.5, alpha))
        pts.append(d * outer)
        cols.append(Color(1.0, 0.25, 0.05, alpha * 0.85))

    # Build a triangle strip.
    var indices := PackedInt32Array()
    for i in range(segments):
        var b: int = i * 2
        indices.append(b)
        indices.append(b + 1)
        indices.append(b + 2)
        indices.append(b + 1)
        indices.append(b + 3)
        indices.append(b + 2)

    var ci_arr := PackedColorArray()
    for c in cols:
        ci_arr.append(c)
    var arr := PackedVector2Array(pts)
    # draw_polygon supports color per vertex.
    var rendered_pts := PackedVector2Array()
    var rendered_cols := PackedColorArray()
    for idx in indices:
        rendered_pts.append(arr[idx])
        rendered_cols.append(ci_arr[idx])
    draw_polygon(rendered_pts, rendered_cols)
