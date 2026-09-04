extends Node2D

const TILE := 64.0

func _process(_dt: float) -> void:
	queue_redraw()

func _draw() -> void:
	var cam := get_parent().get_node_or_null("Camera2D") as Camera2D
	var center := cam.position if cam else Vector2.ZERO
	var x0 := int((center.x - 900.0) / TILE) - 1
	var y0 := int((center.y - 600.0) / TILE) - 1
	for ty in range(y0, y0 + 24):
		for tx in range(x0, x0 + 32):
			var shade := Color("14121c") if ((tx + ty) & 1) else Color("101018")
			draw_rect(Rect2(tx * TILE, ty * TILE, TILE - 1.0, TILE - 1.0), shade)
	var game := get_parent().get_parent()
	if game != null and game.get("running") and game.get("p") is Dictionary:
		var pl: Dictionary = game.p
		var ar := float(pl.get("aura_radius", 0.0))
		if ar > 0.0:
			draw_arc(pl.pos, ar, 0.0, TAU, 48, Color(0.43, 1.0, 0.54, 0.25), 2.0)
