extends Node
## Procedural 32×32 sprite sheets — same idea as games/graveborn/sprites.js.

const SIZE := 32
var frames: Dictionary = {}  # name -> Array[Texture2D] of 4 frames

func _ready() -> void:
	frames["necro"] = _sheet(_necro)
	frames["skeleton"] = _sheet(_skel)
	frames["husk"] = _sheet(_husk)
	frames["mite"] = _sheet(_mite)
	frames["runner"] = _sheet(_runner)
	frames["spit"] = _sheet(_spit)
	frames["exploder"] = _sheet(_exploder)
	frames["brute"] = _sheet(_brute)
	frames["wraith"] = _sheet(_wraith)
	frames["shaman"] = _sheet(_shaman)
	frames["titan"] = _sheet(_titan)
	frames["sovereign"] = _sheet(_sovereign)
	frames["duchess"] = _sheet(_duchess)
	frames["bishop"] = _sheet(_bishop)
	frames["corpse"] = _sheet(_corpse)
	frames["gem"] = _sheet(_gem)

func frame(name: String, i: int) -> Texture2D:
	var arr: Array = frames.get(name, [])
	if arr.is_empty():
		return null
	return arr[i % arr.size()]

func _sheet(drawer: Callable) -> Array[Texture2D]:
	var out: Array[Texture2D] = []
	for i in range(4):
		var img := Image.create(SIZE, SIZE, false, Image.FORMAT_RGBA8)
		img.fill(Color(0, 0, 0, 0))
		drawer.call(img, i)
		out.append(ImageTexture.create_from_image(img))
	return out

func px(img: Image, x: int, y: int, w: int, h: int, c: Color) -> void:
	for yy in range(y, y + h):
		for xx in range(x, x + w):
			if xx >= 0 and yy >= 0 and xx < SIZE and yy < SIZE:
				img.set_pixel(xx, yy, c)

func _necro(img: Image, i: int) -> void:
	var bob := 1 if (i == 1 or i == 3) else 0
	var swing := 1 if i % 2 == 0 else 0
	px(img, 10, 10 + bob, 12, 16, Color.html("#2a1840"))
	px(img, 9, 14 + bob, 14, 12, Color.html("#1a0f28"))
	px(img, 11, 6 + bob, 10, 8, Color.html("#3d2458"))
	px(img, 13, 8 + bob, 6, 5, Color.html("#c8b8a0"))
	px(img, 14, 9 + bob, 2, 2, Color.html("#1a1020"))
	px(img, 17, 9 + bob, 2, 2, Color.html("#1a1020"))
	px(img, 22 + swing, 4 + bob, 2, 22, Color.html("#6b5344"))
	px(img, 21 + swing, 3 + bob, 4, 4, Color.html("#7d3cff"))
	px(img, 22 + swing, 4 + bob, 2, 2, Color.html("#d4b8ff"))
	px(img, 11, 26 + bob, 4, 3, Color.html("#3a2a20"))
	px(img, 17, 26 + (1 - bob), 4, 3, Color.html("#3a2a20"))

func _skel(img: Image, i: int) -> void:
	var bob := i % 2
	px(img, 12, 8 + bob, 8, 6, Color.html("#e8e0d0"))
	px(img, 13, 10 + bob, 2, 2, Color.html("#1a1020"))
	px(img, 17, 10 + bob, 2, 2, Color.html("#1a1020"))
	px(img, 13, 14 + bob, 6, 10, Color.html("#d4cbb8"))
	px(img, 11, 16 + bob, 3, 8, Color.html("#c8bfaa"))
	px(img, 18, 16 + bob, 3, 8, Color.html("#c8bfaa"))
	px(img, 12, 24 + bob, 3, 5, Color.html("#d4cbb8"))
	px(img, 17, 24 + (1 - bob), 3, 5, Color.html("#d4cbb8"))
	px(img, 14, 17 + bob, 4, 2, Color.html("#6dff8a"))

func _husk(img: Image, i: int) -> void:
	var bob := i % 2
	px(img, 11, 8 + bob, 10, 8, Color.html("#4a3a28"))
	px(img, 13, 10 + bob, 2, 2, Color.html("#ff3344"))
	px(img, 17, 10 + bob, 2, 2, Color.html("#ff3344"))
	px(img, 12, 16 + bob, 8, 10, Color.html("#3a2c1e"))
	px(img, 10, 18 + bob, 3, 7, Color.html("#2e2218"))
	px(img, 19, 18 + bob, 3, 7, Color.html("#2e2218"))
	px(img, 12, 26 + bob, 3, 4, Color.html("#2a2018"))
	px(img, 17, 26 + (1 - bob), 3, 4, Color.html("#2a2018"))

func _runner(img: Image, i: int) -> void:
	var lean := 2 if (i == 1 or i == 2) else 0
	px(img, 10 + lean, 7, 10, 7, Color.html("#5a2040"))
	px(img, 12 + lean, 9, 2, 2, Color.html("#ffe066"))
	px(img, 16 + lean, 9, 2, 2, Color.html("#ffe066"))
	px(img, 11 + lean, 14, 8, 9, Color.html("#4a1834"))
	px(img, 8 + lean, 16, 4, 6, Color.html("#3a1228"))
	px(img, 18 + lean, 16, 4, 6, Color.html("#3a1228"))
	px(img, 11 + lean, 23, 3, 6, Color.html("#2a0e1c"))
	px(img, 16 + lean, 23, 3, 6, Color.html("#2a0e1c"))

func _brute(img: Image, i: int) -> void:
	var bob := 1 if i % 2 else 0
	px(img, 8, 6 + bob, 16, 10, Color.html("#3d2a18"))
	px(img, 12, 9 + bob, 3, 3, Color.html("#ff6644"))
	px(img, 18, 9 + bob, 3, 3, Color.html("#ff6644"))
	px(img, 9, 16 + bob, 14, 12, Color.html("#2e1e10"))
	px(img, 6, 16 + bob, 4, 10, Color.html("#24180c"))
	px(img, 22, 16 + bob, 4, 10, Color.html("#24180c"))
	px(img, 10, 26 + bob, 5, 5, Color.html("#1a1208"))
	px(img, 17, 26 + (1 - bob), 5, 5, Color.html("#1a1208"))

func _mite(img: Image, i: int) -> void:
	var hop := i % 2
	px(img, 12, 14 + hop, 8, 6, Color.html("#6a3a18"))
	px(img, 13, 16 + hop, 2, 2, Color.html("#ffaa33"))
	px(img, 17, 16 + hop, 2, 2, Color.html("#ffaa33"))
	px(img, 10, 20 + hop, 3, 3, Color.html("#4a2810"))
	px(img, 19, 20 + hop, 3, 3, Color.html("#4a2810"))

func _spit(img: Image, i: int) -> void:
	var bob := i % 2
	px(img, 11, 8 + bob, 10, 8, Color.html("#2a4030"))
	px(img, 13, 10 + bob, 2, 2, Color.html("#66ff99"))
	px(img, 17, 10 + bob, 2, 2, Color.html("#66ff99"))
	px(img, 12, 16 + bob, 8, 10, Color.html("#1e3024"))
	px(img, 20, 12 + bob, 6, 4, Color.html("#3d5a40"))

func _exploder(img: Image, i: int) -> void:
	var pulse := i % 2
	px(img, 11, 8 + pulse, 10, 8, Color.html("#5a1818"))
	px(img, 13, 10 + pulse, 2, 2, Color.html("#ffee66"))
	px(img, 17, 10 + pulse, 2, 2, Color.html("#ffee66"))
	px(img, 12, 16, 8, 10, Color.html("#3a1010"))
	px(img, 14, 18 + pulse, 4, 4, Color.html("#ff6644"))

func _wraith(img: Image, i: int) -> void:
	var drift := 1 if i % 2 else 0
	px(img, 11 + drift, 6, 10, 18, Color.html("#3a2a68"))
	px(img, 13 + drift, 8, 6, 5, Color.html("#c8c0ff"))
	px(img, 14 + drift, 9, 2, 2, Color.html("#7d3cff"))
	px(img, 17 + drift, 9, 2, 2, Color.html("#7d3cff"))

func _shaman(img: Image, i: int) -> void:
	var bob := i % 2
	px(img, 11, 8 + bob, 10, 8, Color.html("#204050"))
	px(img, 13, 10 + bob, 2, 2, Color.html("#66e0ff"))
	px(img, 17, 10 + bob, 2, 2, Color.html("#66e0ff"))
	px(img, 12, 16 + bob, 8, 10, Color.html("#183038"))
	px(img, 10, 6 + bob, 3, 8, Color.html("#7d3cff"))
	px(img, 20, 6 + bob, 3, 8, Color.html("#7d3cff"))

func _titan(img: Image, i: int) -> void:
	_brute(img, i)
	px(img, 10, 3, 12, 4, Color.html("#8a6a30"))
	px(img, 14, 1, 4, 3, Color.html("#f0c75e"))

func _sovereign(img: Image, i: int) -> void:
	_skel(img, i)
	px(img, 11, 4, 10, 3, Color.html("#7d3cff"))
	px(img, 14, 2, 4, 3, Color.html("#f0c75e"))

func _duchess(img: Image, i: int) -> void:
	_runner(img, i)
	px(img, 10, 4, 12, 3, Color.html("#ffe066"))

func _bishop(img: Image, i: int) -> void:
	_shaman(img, i)
	px(img, 10, 3, 12, 4, Color.html("#1a4030"))
	px(img, 14, 1, 4, 3, Color.html("#6dff8a"))

func _corpse(img: Image, _i: int) -> void:
	px(img, 8, 18, 16, 8, Color.html("#2a2018"))
	px(img, 10, 16, 8, 6, Color.html("#3a2c1e"))
	px(img, 18, 17, 6, 5, Color.html("#4a3a28"))
	px(img, 12, 20, 4, 2, Color.html("#6dff8a"))

func _gem(img: Image, _i: int) -> void:
	px(img, 13, 10, 6, 10, Color.html("#7d3cff"))
	px(img, 14, 12, 4, 6, Color.html("#d4b8ff"))
	px(img, 15, 8, 2, 3, Color.html("#f0e6ff"))
