extends Node2D
## Graveborn — Godot 4.6 port of the HTML5 necro survivor.

const WORLD := 2400.0
const TILE := 64.0
const MAX_ENEMIES := 80
const MAX_MINIONS := 16
const MAX_CORPSES := 50
const MAX_BOLTS := 40
const MAX_GEMS := 80

var p: Dictionary = {}
var time_s := 0.0
var wave := 1
var spawn_acc := 0.0
var raise_acc := 0.0
var aura_acc := 0.0
var kills := 0
var over := false
var drafting := false
var running := false
var minion_count := 0
var draft_queue := 0
var offers: Array[Dictionary] = []
var banner_t := 0.0

var enemies: Array[Dictionary] = []
var minions: Array[Dictionary] = []
var corpses: Array[Dictionary] = []
var bolts: Array[Dictionary] = []
var gems: Array[Dictionary] = []

var joy := Vector2.ZERO
var joy_origin := Vector2.ZERO
var joy_active := false

@onready var world: Node2D = $World
@onready var cam: Camera2D = $World/Camera2D
@onready var title: Control = $UI/Title
@onready var draft: Control = $UI/Draft
@onready var over_ui: Control = $UI/Over
@onready var hud: Control = $UI/Hud
@onready var banner: Label = $UI/Banner
@onready var card_row: HBoxContainer = $UI/Draft/Center/VBox/CardRow
@onready var draft_level: Label = $UI/Draft/Center/VBox/Sub
@onready var hp_bar: ProgressBar = $UI/Hud/VBox/Hp
@onready var xp_bar: ProgressBar = $UI/Hud/VBox/Xp
@onready var meta: Label = $UI/Hud/VBox/Meta
@onready var over_stats: Label = $UI/Over/Center/Panel/Stats

func _ready() -> void:
	_init_pools()
	title.visible = true
	draft.visible = false
	over_ui.visible = false
	hud.visible = false
	$UI/Title/Center/Panel/Play.pressed.connect(start_run)
	$UI/Over/Center/Panel/Again.pressed.connect(start_run)
	$UI/Title/Center/Panel/How.pressed.connect(func() -> void:
		$UI/Title/Center/Panel/HowText.visible = not $UI/Title/Center/Panel/HowText.visible
	)

func _init_pools() -> void:
	enemies = _pool(MAX_ENEMIES, "husk", 1.25)
	minions = _pool(MAX_MINIONS, "skeleton", 1.15)
	corpses = _pool(MAX_CORPSES, "corpse", 1.1)
	gems = _pool(MAX_GEMS, "gem", 0.7)
	bolts = []
	for i in range(MAX_BOLTS):
		var spr := Sprite2D.new()
		spr.visible = false
		var img := Image.create(8, 8, false, Image.FORMAT_RGBA8)
		img.fill(Color.html("#d4b8ff"))
		spr.texture = ImageTexture.create_from_image(img)
		world.add_child(spr)
		bolts.append({"alive": false, "pos": Vector2.ZERO, "vel": Vector2.ZERO, "dmg": 0.0, "life": 0.0, "poison": false, "spr": spr})

func _pool(n: int, sheet: String, scale: float) -> Array[Dictionary]:
	var arr: Array[Dictionary] = []
	for i in range(n):
		var spr := Sprite2D.new()
		spr.visible = false
		spr.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		spr.scale = Vector2(scale, scale)
		world.add_child(spr)
		arr.append({"alive": false, "pos": Vector2.ZERO, "spr": spr, "sheet": sheet, "frame": 0.0, "hp": 0.0, "max_hp": 0.0, "speed": 0.0, "dmg": 0.0, "r": 14.0, "type": sheet, "xp": 4, "hit": 0.0, "poison": 0.0, "poison_dps": 0.0, "atk_cd": 0.0, "life": 0.0, "facing": 1.0, "val": 4})
	return arr

func _fresh_player() -> Dictionary:
	return {
		"pos": Vector2(WORLD * 0.5, WORLD * 0.5),
		"r": 16.0, "hp": 100.0, "max_hp": 100.0, "speed": 210.0,
		"move_mult": 1.0, "atk_cd": 0.0, "atk_interval": 0.62, "atk_speed_mult": 1.0,
		"atk_dmg": 22.0, "atk_dmg_mult": 1.0, "atk_range": 240.0, "crit": 0.08,
		"dr": 0.0, "magnet": 70.0, "magnet_mult": 1.0, "max_minions": 6,
		"raise_interval": 2.1, "raise_range": 220.0, "raise_count": 1,
		"corpse_life": 10.0, "minion_dmg_mult": 1.0, "minion_atk_speed_mult": 1.0,
		"minion_lifesteal": 0.0, "dr_per_minion": 0.0, "poison_bolts": false,
		"raise_on_kill": false, "death_nova": false, "corpse_explode": true,
		"explode_mult": 1.15, "aura_dps": 0.0, "aura_radius": 0.0,
		"soul_harvest": false, "soul_stacks": 0, "facing": 1.0, "frame": 0.0,
		"iframe": 0.0, "xp": 0, "level": 1, "need": 28,
	}

func start_run() -> void:
	p = _fresh_player()
	time_s = 0.0
	wave = 1
	spawn_acc = 0.0
	raise_acc = 0.0
	aura_acc = 0.0
	kills = 0
	over = false
	drafting = false
	running = true
	draft_queue = 0
	minion_count = 0
	for arr in [enemies, minions, corpses, gems, bolts]:
		for e in arr:
			e.alive = false
			e.spr.visible = false
	$World/Player.position = p.pos
	cam.position = p.pos
	title.visible = false
	draft.visible = false
	over_ui.visible = false
	hud.visible = true
	_show_banner("Raise the dead")
	for i in range(10):
		_spawn_enemy()

func _process(dt: float) -> void:
	if banner_t > 0.0:
		banner_t -= dt
		if banner_t <= 0.0:
			banner.visible = false
	if not running or over or drafting:
		return
	time_s += dt
	wave = 1 + int(time_s / 22.0)
	p.iframe = max(0.0, p.iframe - dt)
	p.atk_cd = max(0.0, p.atk_cd - dt)
	raise_acc += dt
	aura_acc += dt

	var dir := _input_dir()
	p.pos.x = clampf(p.pos.x + dir.x * p.speed * p.move_mult * dt, 24.0, WORLD - 24.0)
	p.pos.y = clampf(p.pos.y + dir.y * p.speed * p.move_mult * dt, 24.0, WORLD - 24.0)
	if dir.x != 0.0:
		p.facing = -1.0 if dir.x < 0.0 else 1.0
	p.frame += dt * (10.0 if dir.length() > 0.1 else 4.0)
	$World/Player.position = p.pos
	$World/Player.texture = SpriteBaker.frame("necro", int(p.frame))
	$World/Player.flip_h = p.facing < 0.0
	$World/Player.modulate.a = 0.55 if p.iframe > 0.0 else 1.0
	cam.position = cam.position.lerp(p.pos as Vector2, minf(1.0, dt * 8.0))

	var spawn_every: float = maxf(0.28, 1.05 - float(wave) * 0.07)
	spawn_acc += dt
	while spawn_acc >= spawn_every:
		spawn_acc -= spawn_every
		_spawn_enemy()

	var target := _nearest_enemy(p.pos as Vector2, float(p.atk_range))
	if target.size() > 0 and float(p.atk_cd) <= 0.0:
		_fire_bolt(target.pos as Vector2)
		p.atk_cd = p.atk_interval / p.atk_speed_mult

	if raise_acc >= p.raise_interval:
		raise_acc = 0.0
		_try_raise(p.pos, p.raise_count)

	if p.aura_dps > 0.0 and aura_acc >= 0.4:
		aura_acc = 0.0
		for e in enemies:
			if e.alive and e.pos.distance_to(p.pos) <= p.aura_radius:
				_damage_enemy(e, p.aura_dps * 0.4, false)

	_update_bolts(dt)
	_update_enemies(dt)
	_update_minions(dt)
	_update_corpses_gems(dt)
	_sync_hud()

func _input_dir() -> Vector2:
	var v := Vector2(
		Input.get_axis("move_left", "move_right"),
		Input.get_axis("move_up", "move_down")
	)
	if joy_active:
		v += joy
	if v.length() < 0.15:
		return Vector2.ZERO
	return v.normalized()

func _unhandled_input(event: InputEvent) -> void:
	if drafting and event is InputEventKey and event.pressed:
		var n := -1
		if event.keycode == KEY_1: n = 0
		elif event.keycode == KEY_2: n = 1
		elif event.keycode == KEY_3: n = 2
		if n >= 0 and n < offers.size():
			_pick_card(offers[n])
	if event is InputEventScreenTouch or event is InputEventMouseButton:
		var pressed := false
		var pos := Vector2.ZERO
		if event is InputEventScreenTouch:
			pressed = event.pressed
			pos = event.position
		else:
			if event.button_index != MOUSE_BUTTON_LEFT:
				return
			pressed = event.pressed
			pos = event.position
		if pressed and pos.x < get_viewport_rect().size.x * 0.62:
			joy_active = true
			joy_origin = pos
			joy = Vector2.ZERO
		else:
			joy_active = false
			joy = Vector2.ZERO
	if joy_active and (event is InputEventScreenDrag or event is InputEventMouseMotion):
		var pos: Vector2 = event.position
		var delta := pos - joy_origin
		if delta.length() > 48.0:
			delta = delta.normalized() * 48.0
		joy = delta / 48.0

func _spawn_enemy() -> void:
	var e := _acquire(enemies)
	if e.is_empty():
		return
	var ang := randf() * TAU
	var dist := 420.0 + randf() * 180.0
	var roll := randf()
	var typ := "husk"
	var hp := 28.0 + wave * 6.0
	var speed := 58.0 + wave * 1.4
	var dmg := 8.0 + wave * 0.8
	var r := 14.0
	var xp := 5
	if time_s > 25.0 and roll > 0.72:
		typ = "runner"
		hp = 20.0 + wave * 4.0
		speed = 110.0 + wave * 2.0
		dmg = 7.0 + wave * 0.6
		r = 12.0
		xp = 6
	if time_s > 45.0 and roll > 0.9:
		typ = "brute"
		hp = 90.0 + wave * 14.0
		speed = 42.0
		dmg = 16.0 + wave * 1.2
		r = 20.0
		xp = 14
	e.alive = true
	e.pos = Vector2(clampf(p.pos.x + cos(ang) * dist, 40.0, WORLD - 40.0), clampf(p.pos.y + sin(ang) * dist, 40.0, WORLD - 40.0))
	e.hp = hp
	e.max_hp = hp
	e.speed = speed
	e.dmg = dmg
	e.type = typ
	e.sheet = typ
	e.xp = xp
	e.r = r
	e.frame = randf() * 4.0
	e.hit = 0.0
	e.poison = 0.0
	e.atk_cd = 0.0
	e.spr.visible = true
	e.spr.position = e.pos
	e.spr.scale = Vector2(1.6, 1.6) if typ == "brute" else Vector2(1.25, 1.25)

func _acquire(arr: Array[Dictionary]) -> Dictionary:
	for e in arr:
		if not e.alive:
			return e
	return {}

func _nearest_enemy(from: Vector2, rng: float) -> Dictionary:
	var best: Dictionary = {}
	var best_d := rng * rng
	for e in enemies:
		if not e.alive:
			continue
		var d := from.distance_squared_to(e.pos)
		if d < best_d:
			best_d = d
			best = e
	return best

func _nearest_corpse(from: Vector2, rng: float) -> Dictionary:
	var best: Dictionary = {}
	var best_d := rng * rng
	for c in corpses:
		if not c.alive:
			continue
		var d := from.distance_squared_to(c.pos)
		if d < best_d:
			best_d = d
			best = c
	return best

func harvest_mult() -> float:
	return 1.0 + float(p.soul_stacks) * 0.02

func bolt_damage() -> float:
	return p.atk_dmg * p.atk_dmg_mult * harvest_mult()

func minion_damage() -> float:
	return 14.0 * p.minion_dmg_mult * harvest_mult()

func player_dr() -> float:
	return min(0.65, p.dr + min(0.24, minion_count * p.dr_per_minion))

func _count_minions() -> int:
	var n := 0
	for m in minions:
		if m.alive:
			n += 1
	minion_count = n
	return n

func _drop_corpse(pos: Vector2) -> void:
	var c := _acquire(corpses)
	if c.is_empty():
		return
	c.alive = true
	c.pos = pos
	c.life = p.corpse_life
	c.spr.visible = true
	c.spr.position = pos
	c.spr.texture = SpriteBaker.frame("corpse", 0)

func _drop_gem(pos: Vector2, val: int) -> void:
	var g := _acquire(gems)
	if g.is_empty():
		return
	g.alive = true
	g.pos = pos + Vector2(randf() - 0.5, randf() - 0.5) * 10.0
	g.val = val
	g.life = 16.0
	g.spr.visible = true
	g.spr.position = g.pos
	g.spr.texture = SpriteBaker.frame("gem", 0)

func _kill_enemy(e: Dictionary) -> void:
	e.alive = false
	e.spr.visible = false
	kills += 1
	if p.soul_harvest and p.soul_stacks < 40:
		p.soul_stacks += 1
	_drop_corpse(e.pos)
	_drop_gem(e.pos, int(e.xp))
	if p.raise_on_kill:
		_try_raise(e.pos, 1)

func _damage_enemy(e: Dictionary, dmg: float, from_minion: bool) -> void:
	e.hp -= dmg
	e.hit = 0.12
	if from_minion and p.minion_lifesteal > 0.0:
		p.hp = min(p.max_hp, p.hp + dmg * p.minion_lifesteal)
	if e.hp <= 0.0:
		_kill_enemy(e)

func _explode(pos: Vector2, radius: float, dmg: float) -> void:
	for e in enemies:
		if e.alive and e.pos.distance_to(pos) <= radius:
			_damage_enemy(e, dmg, false)

func _spawn_minion(pos: Vector2) -> bool:
	var m := _acquire(minions)
	if m.is_empty():
		return false
	m.alive = true
	m.pos = pos
	m.max_hp = 46.0
	m.hp = 46.0
	m.dmg = minion_damage()
	m.atk_cd = 0.0
	m.life = 16.0
	m.frame = 0.0
	m.spr.visible = true
	m.spr.position = pos
	return true

func _try_raise(from: Vector2, count: int) -> void:
	for n in range(count):
		var corpse := _nearest_corpse(from, p.raise_range)
		if corpse.is_empty():
			return
		corpse.alive = false
		corpse.spr.visible = false
		if _count_minions() >= p.max_minions:
			if p.corpse_explode:
				_explode(corpse.pos, 86.0, bolt_damage() * p.explode_mult)
			continue
		_spawn_minion(corpse.pos)
	_count_minions()

func _fire_bolt(target: Vector2) -> void:
	var b := _acquire(bolts)
	if b.is_empty():
		return
	var origin: Vector2 = p.pos
	var d: Vector2 = (target - origin).normalized()
	b.alive = true
	b.pos = origin
	b.vel = d * 520.0
	b.dmg = bolt_damage() * (2.0 if randf() < p.crit else 1.0)
	b.life = p.atk_range / 520.0
	b.poison = p.poison_bolts
	b.spr.visible = true
	b.spr.position = p.pos
	p.facing = -1.0 if d.x < 0.0 else 1.0

func _update_bolts(dt: float) -> void:
	for b in bolts:
		if not b.alive:
			continue
		b.pos += b.vel * dt
		b.life -= dt
		b.spr.position = b.pos
		if b.life <= 0.0:
			b.alive = false
			b.spr.visible = false
			continue
		var hit := _nearest_enemy(b.pos, 16.0)
		if hit.size() > 0:
			_damage_enemy(hit, b.dmg, false)
			if b.poison:
				hit.poison = 3.0
				hit.poison_dps = b.dmg * 0.18
			b.alive = false
			b.spr.visible = false

func _update_enemies(dt: float) -> void:
	for e in enemies:
		if not e.alive:
			continue
		e.frame += dt * 8.0
		e.hit = max(0.0, e.hit - dt)
		if e.poison > 0.0:
			e.poison -= dt
			_damage_enemy(e, e.poison_dps * dt, false)
			if not e.alive:
				continue
		var to: Vector2 = (p.pos as Vector2) - (e.pos as Vector2)
		if to.length() > 0.001:
			to = to.normalized()
		e.pos = (e.pos as Vector2) + to * float(e.speed) * dt
		e.atk_cd = max(0.0, e.atk_cd - dt)
		e.spr.position = e.pos
		e.spr.texture = SpriteBaker.frame(e.sheet, int(e.frame))
		e.spr.flip_h = e.pos.x < p.pos.x
		e.spr.modulate = Color(2, 2, 2) if e.hit > 0.0 else Color.WHITE
		if e.pos.distance_to(p.pos) < e.r + p.r and e.atk_cd <= 0.0:
			_hurt_player(e.dmg)
			e.atk_cd = 0.9

func _update_minions(dt: float) -> void:
	for m in minions:
		if not m.alive:
			continue
		m.life -= dt
		m.frame += dt * 9.0
		m.atk_cd = max(0.0, m.atk_cd - dt)
		if m.life <= 0.0 or m.hp <= 0.0:
			m.alive = false
			m.spr.visible = false
			if p.death_nova:
				_explode(m.pos, 80.0, 90.0)
			continue
		var prey := _nearest_enemy(m.pos, 340.0)
		if prey.size() > 0:
			var delta: Vector2 = prey.pos - m.pos
			var dist := delta.length()
			m.facing = -1.0 if delta.x < 0.0 else 1.0
			if dist > 22.0:
				m.pos += delta / dist * 150.0 * dt
			elif m.atk_cd <= 0.0:
				_damage_enemy(prey, minion_damage(), true)
				m.atk_cd = 0.7 / p.minion_atk_speed_mult
		m.spr.position = m.pos
		m.spr.texture = SpriteBaker.frame("skeleton", int(m.frame))
		m.spr.flip_h = m.facing < 0.0
	_count_minions()

func _update_corpses_gems(dt: float) -> void:
	var mag: float = p.magnet * p.magnet_mult
	for c in corpses:
		if not c.alive:
			continue
		c.life -= dt
		if c.life <= 0.0:
			c.alive = false
			c.spr.visible = false
	for g in gems:
		if not g.alive:
			continue
		g.life -= dt
		var d: float = (p.pos as Vector2).distance_to(g.pos as Vector2)
		if d < mag:
			g.pos = (g.pos as Vector2) + ((p.pos as Vector2) - (g.pos as Vector2)).normalized() * 320.0 * dt
		g.spr.position = g.pos
		if d < 22.0:
			g.alive = false
			g.spr.visible = false
			_gain_xp(int(g.val))
		elif g.life <= 0.0:
			g.alive = false
			g.spr.visible = false

func _gain_xp(amount: int) -> void:
	p.xp += amount
	while p.xp >= p.need:
		p.xp -= p.need
		p.level += 1
		p.need = 18 + p.level * 10
		p.hp = min(p.max_hp, p.hp + 8.0)
		draft_queue += 1
	if draft_queue > 0 and not drafting:
		_open_draft()

func _open_draft() -> void:
	if drafting:
		return
	draft_queue = max(0, draft_queue - 1)
	drafting = true
	offers = CardDB.roll_offers(3)
	draft_level.text = "LEVEL %d  ·  NECROMANCER" % p.level
	for child in card_row.get_children():
		child.queue_free()
	for i in range(offers.size()):
		var card := offers[i]
		var btn := Button.new()
		btn.custom_minimum_size = Vector2(220, 340)
		var cls := "NECROMANCER" if String(card.class_id) == "necromancer" else "GENERAL"
		btn.text = "%s\n%s\n\n%s\n\n%s\n\n%s" % [
			CardDB.rarity_label(card.rarity), cls, card.name, card.desc, card.flavor
		]
		btn.add_theme_font_size_override("font_size", 16)
		match String(card.rarity):
			"gold": btn.add_theme_color_override("font_color", Color("f0c75e"))
			"prismatic": btn.add_theme_color_override("font_color", Color("c4b0ff"))
			_: btn.add_theme_color_override("font_color", Color("c5d0dc"))
		btn.pressed.connect(_pick_card.bind(card))
		card_row.add_child(btn)
	draft.visible = true
	_show_banner("LEVEL %d" % p.level)

func _pick_card(card: Dictionary) -> void:
	if not drafting:
		return
	CardDB.apply(card, p)
	drafting = false
	draft.visible = false
	_show_banner(String(card.name))
	if draft_queue > 0:
		_open_draft()

func _hurt_player(dmg: float) -> void:
	if p.iframe > 0.0 or over:
		return
	p.hp -= dmg * (1.0 - player_dr())
	p.iframe = 0.45
	if p.hp <= 0.0:
		p.hp = 0.0
		over = true
		running = false
		over_stats.text = "Survived %s  ·  %d kills  ·  Level %d" % [_fmt_time(time_s), kills, p.level]
		over_ui.visible = true

func _show_banner(text: String) -> void:
	banner.text = text
	banner.visible = true
	banner_t = 1.4

func _fmt_time(t: float) -> String:
	return "%d:%02d" % [int(t) / 60, int(t) % 60]

func _sync_hud() -> void:
	hp_bar.max_value = p.max_hp
	hp_bar.value = p.hp
	xp_bar.max_value = p.need
	xp_bar.value = p.xp
	meta.text = "%d / %d    Lv %d    Army %d / %d    Kills %d    %s" % [
		int(ceil(p.hp)), int(p.max_hp), p.level, minion_count, p.max_minions, kills, _fmt_time(time_s)
	]
