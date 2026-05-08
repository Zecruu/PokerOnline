extends Node3D

const ARENA_RADIUS := 42.0
const PLAYER_SPEED := 13.0
const PLAYER_RADIUS := 0.8
const PROJECTILE_SPEED := 34.0
const FIREBALL_SPEED := 17.0
const FIRE_ZONE_DURATION := 4.0

var player: Node3D
var camera: Camera3D
var hud: Label
var pause_button: Button
var pause_overlay: Label
var paused := false
var hp := 180.0
var max_hp := 180.0
var level := 1
var xp := 0
var xp_next := 12
var wave := 1
var wave_clock := 0.0
var spawn_clock := 0.0
var auto_clock := 0.0

var enemies: Array[Dictionary] = []
var projectiles: Array[Dictionary] = []
var enemy_fireballs: Array[Dictionary] = []
var fire_zones: Array[Dictionary] = []
var xp_orbs: Array[Dictionary] = []

var mat_cache := {}
var rng := RandomNumberGenerator.new()


func _ready() -> void:
	rng.randomize()
	_build_world()
	_build_player()
	_build_camera()
	_build_hud()


func _physics_process(delta: float) -> void:
	if Input.is_key_pressed(KEY_ESCAPE) or Input.is_key_pressed(KEY_P):
		_set_paused(not paused)
		await get_tree().create_timer(0.18).timeout

	if paused:
		_update_hud()
		return

	wave_clock += delta
	if wave_clock >= 20.0:
		wave_clock = 0.0
		wave += 1

	if Input.is_key_pressed(KEY_F7):
		wave = max(wave, 7)

	_update_player(delta)
	_update_spawning(delta)
	_update_auto_attack(delta)
	_update_projectiles(delta)
	_update_enemy_fireballs(delta)
	_update_fire_zones(delta)
	_update_enemies(delta)
	_update_xp_orbs(delta)
	_update_camera(delta)
	_update_hud()


func _build_world() -> void:
	var world := WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0.025, 0.02, 0.045)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.45, 0.38, 0.58)
	env.ambient_light_energy = 0.5
	world.environment = env
	add_child(world)

	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-55, -30, 0)
	sun.light_energy = 1.7
	add_child(sun)

	var floor := MeshInstance3D.new()
	var floor_mesh := CylinderMesh.new()
	floor_mesh.top_radius = ARENA_RADIUS
	floor_mesh.bottom_radius = ARENA_RADIUS
	floor_mesh.height = 0.12
	floor_mesh.radial_segments = 96
	floor.mesh = floor_mesh
	floor.position.y = -0.08
	floor.material_override = _mat("arena", Color(0.09, 0.065, 0.14), Color(0.5, 0.18, 0.9), 0.0)
	add_child(floor)

	for i in range(24):
		var angle := TAU * float(i) / 24.0
		var obelisk := MeshInstance3D.new()
		var box := BoxMesh.new()
		box.size = Vector3(0.4, 2.4 + float(i % 3) * 0.35, 0.4)
		obelisk.mesh = box
		obelisk.position = Vector3(cos(angle) * (ARENA_RADIUS + 1.4), box.size.y * 0.5, sin(angle) * (ARENA_RADIUS + 1.4))
		obelisk.rotation.y = -angle
		obelisk.material_override = _mat("obelisk", Color(0.19, 0.11, 0.28), Color(1.0, 0.22, 0.08), 0.25)
		add_child(obelisk)


func _build_player() -> void:
	player = Node3D.new()
	player.name = "FireMage"
	add_child(player)

	var fire_mage_scene := load("res://scenes/characters/fire_mage.tscn") as PackedScene
	if fire_mage_scene:
		var model := fire_mage_scene.instantiate()
		model.name = "FireMageModel"
		model.position.y = 0.02
		player.add_child(model)
	else:
		var body := MeshInstance3D.new()
		var capsule := CapsuleMesh.new()
		capsule.radius = 0.55
		capsule.height = 1.8
		body.mesh = capsule
		body.position.y = 1.0
		body.material_override = _mat("player_body", Color(0.88, 0.2, 0.08), Color(1.0, 0.35, 0.08), 0.7)
		player.add_child(body)


func _build_camera() -> void:
	camera = Camera3D.new()
	camera.fov = 54
	add_child(camera)
	_update_camera(1.0)


func _build_hud() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)

	pause_button = Button.new()
	pause_button.text = "Pause"
	pause_button.position = Vector2(1160, 14)
	pause_button.size = Vector2(92, 36)
	pause_button.process_mode = Node.PROCESS_MODE_ALWAYS
	pause_button.pressed.connect(func(): _set_paused(not paused))
	layer.add_child(pause_button)

	pause_overlay = Label.new()
	pause_overlay.text = "PAUSED"
	pause_overlay.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	pause_overlay.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	pause_overlay.position = Vector2(0, 300)
	pause_overlay.size = Vector2(1280, 80)
	pause_overlay.visible = false
	pause_overlay.process_mode = Node.PROCESS_MODE_ALWAYS
	pause_overlay.add_theme_font_size_override("font_size", 46)
	pause_overlay.add_theme_color_override("font_color", Color(1.0, 0.86, 0.3))
	layer.add_child(pause_overlay)

	hud = Label.new()
	hud.position = Vector2(18, 14)
	hud.add_theme_font_size_override("font_size", 18)
	hud.add_theme_color_override("font_color", Color(1.0, 0.92, 0.72))
	layer.add_child(hud)


func _set_paused(value: bool) -> void:
	paused = value
	if pause_button:
		pause_button.text = "Resume" if paused else "Pause"
	if pause_overlay:
		pause_overlay.visible = paused


func _update_player(delta: float) -> void:
	var move := Vector3.ZERO
	if Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP):
		move.z -= 1.0
	if Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN):
		move.z += 1.0
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT):
		move.x -= 1.0
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT):
		move.x += 1.0
	if move.length_squared() > 0.0:
		move = move.normalized()
		player.position += move * PLAYER_SPEED * delta
		player.rotation.y = lerp_angle(player.rotation.y, atan2(move.x, move.z), 12.0 * delta)

	if Vector2(player.position.x, player.position.z).length() > ARENA_RADIUS - 1.0:
		var clamped := Vector2(player.position.x, player.position.z).normalized() * (ARENA_RADIUS - 1.0)
		player.position.x = clamped.x
		player.position.z = clamped.y


func _update_spawning(delta: float) -> void:
	spawn_clock -= delta
	if spawn_clock > 0.0:
		return
	spawn_clock = max(0.22, 1.0 - float(wave) * 0.045)
	var type := _pick_enemy_type()
	_spawn_enemy(type)
	if wave >= 7 and rng.randf() < 0.35:
		_spawn_enemy("fire_wyvern")


func _pick_enemy_type() -> String:
	var pool := ["skeleton", "skeleton", "skeleton"]
	if wave >= 3:
		pool.append_array(["evil_flower", "skeleton"])
	if wave >= 7:
		pool.append_array(["fire_wyvern", "fire_wyvern", "evil_flower"])
	return pool[rng.randi_range(0, pool.size() - 1)]


func _spawn_enemy(type: String) -> void:
	var angle := rng.randf_range(0.0, TAU)
	var pos := Vector3(cos(angle) * ARENA_RADIUS * 0.92, 0.0, sin(angle) * ARENA_RADIUS * 0.92)
	var node := Node3D.new()
	add_child(node)
	node.position = pos

	var stats: Dictionary = {
		"skeleton": {"hp": 55.0 + wave * 8.0, "speed": 5.2, "damage": 10.0, "radius": 0.75, "xp": 2},
		"evil_flower": {"hp": 90.0 + wave * 10.0, "speed": 3.7, "damage": 14.0, "radius": 0.9, "xp": 4},
		"fire_wyvern": {"hp": 155.0 + wave * 15.0, "speed": 4.8, "damage": 16.0, "radius": 1.05, "xp": 7},
	}[type]
	_build_enemy_mesh(node, type)
	enemies.append({
		"node": node,
		"type": type,
		"hp": stats["hp"],
		"max_hp": stats["hp"],
		"speed": stats["speed"],
		"damage": stats["damage"],
		"radius": stats["radius"],
		"xp": stats["xp"],
		"cooldown": rng.randf_range(0.5, 1.5)
	})


func _build_enemy_mesh(node: Node3D, type: String) -> void:
	if type == "fire_wyvern":
		var body := MeshInstance3D.new()
		var body_mesh := SphereMesh.new()
		body_mesh.radius = 0.72
		body_mesh.height = 1.2
		body.mesh = body_mesh
		body.position.y = 1.25
		body.scale = Vector3(1.25, 0.75, 1.0)
		body.material_override = _mat("wyvern_body", Color(0.72, 0.13, 0.07), Color(1.0, 0.32, 0.06), 0.45)
		node.add_child(body)
		for side in [-1, 1]:
			var wing := MeshInstance3D.new()
			var mesh := BoxMesh.new()
			mesh.size = Vector3(1.5, 0.08, 0.78)
			wing.mesh = mesh
			wing.position = Vector3(float(side) * 1.0, 1.35, 0.05)
			wing.rotation_degrees.z = float(side) * 18.0
			wing.material_override = _mat("wyvern_wing", Color(0.32, 0.04, 0.04), Color(1.0, 0.24, 0.04), 0.25)
			node.add_child(wing)
		var head := MeshInstance3D.new()
		var head_mesh := SphereMesh.new()
		head_mesh.radius = 0.45
		head_mesh.height = 0.7
		head.mesh = head_mesh
		head.position = Vector3(0, 1.38, -0.92)
		head.material_override = body.material_override
		node.add_child(head)
	elif type == "evil_flower":
		var stem := MeshInstance3D.new()
		var stem_mesh := CylinderMesh.new()
		stem_mesh.top_radius = 0.16
		stem_mesh.bottom_radius = 0.22
		stem_mesh.height = 1.15
		stem.mesh = stem_mesh
		stem.position.y = 0.58
		stem.material_override = _mat("flower_stem", Color(0.08, 0.45, 0.14), Color(0.2, 1.0, 0.2), 0.0)
		node.add_child(stem)
		var bloom := MeshInstance3D.new()
		var bloom_mesh := SphereMesh.new()
		bloom_mesh.radius = 0.68
		bloom_mesh.height = 0.8
		bloom.mesh = bloom_mesh
		bloom.position.y = 1.35
		bloom.scale = Vector3(1.2, 0.8, 1.2)
		bloom.material_override = _mat("flower_bloom", Color(0.48, 0.06, 0.62), Color(0.25, 1.0, 0.25), 0.15)
		node.add_child(bloom)
	else:
		var body := MeshInstance3D.new()
		var body_mesh := CapsuleMesh.new()
		body_mesh.radius = 0.4
		body_mesh.height = 1.45
		body.mesh = body_mesh
		body.position.y = 0.78
		body.material_override = _mat("skeleton", Color(0.8, 0.76, 0.62), Color(0.3, 0.75, 1.0), 0.1)
		node.add_child(body)


func _update_auto_attack(delta: float) -> void:
	auto_clock -= delta
	if auto_clock > 0.0:
		return
	var target := _nearest_enemy(24.0)
	if target.is_empty():
		return
	auto_clock = max(0.14, 0.44 - level * 0.01)
	var target_pos: Vector3 = target["node"].position
	var dir: Vector3 = (target_pos - player.position).normalized()
	var orb := _sphere(0.16, _mat("holy_projectile", Color(0.9, 0.96, 1.0), Color(0.7, 0.93, 1.0), 1.2))
	orb.position = player.position + Vector3(0, 1.0, 0) + dir * 0.8
	add_child(orb)
	projectiles.append({"node": orb, "vel": dir * PROJECTILE_SPEED, "damage": 28.0 + level * 4.0, "life": 1.4, "radius": 0.25})


func _nearest_enemy(max_range: float) -> Dictionary:
	var best := {}
	var best_d := max_range * max_range
	for enemy in enemies:
		var d := player.position.distance_squared_to(enemy["node"].position)
		if d < best_d:
			best_d = d
			best = enemy
	return best


func _update_projectiles(delta: float) -> void:
	for i in range(projectiles.size() - 1, -1, -1):
		var p := projectiles[i]
		p["life"] -= delta
		p["node"].position += p["vel"] * delta
		var removed: bool = p["life"] <= 0.0
		if not removed:
			for j in range(enemies.size() - 1, -1, -1):
				var e := enemies[j]
				if p["node"].position.distance_to(e["node"].position + Vector3.UP) <= p["radius"] + e["radius"]:
					e["hp"] -= p["damage"]
					removed = true
					if e["hp"] <= 0.0:
						_kill_enemy(j)
					break
		if removed:
			p["node"].queue_free()
			projectiles.remove_at(i)


func _update_enemies(delta: float) -> void:
	for i in range(enemies.size() - 1, -1, -1):
		if i >= enemies.size():
			continue
		var e := enemies[i]
		var node: Node3D = e["node"]
		var to_player: Vector3 = player.position - node.position
		to_player.y = 0
		var dist: float = max(0.001, to_player.length())
		var dir: Vector3 = to_player / dist

		if e["type"] == "fire_wyvern":
			e["cooldown"] -= delta
			if dist > 14.0:
				node.position += dir * e["speed"] * delta
			elif dist < 8.0:
				node.position -= dir * e["speed"] * 0.65 * delta
			else:
				node.position += Vector3(-dir.z, 0, dir.x) * e["speed"] * 0.35 * delta
			if e["cooldown"] <= 0.0 and dist < 20.0:
				e["cooldown"] = rng.randf_range(1.8, 2.8)
				_spawn_enemy_fireball(node.position + Vector3(0, 1.2, 0), dir, e["damage"])
		else:
			node.position += dir * e["speed"] * delta

		if dist <= PLAYER_RADIUS + e["radius"]:
			hp -= e["damage"] * delta
			if hp <= 0.0:
				hp = max_hp
				level = 1
				xp = 0
				wave = 1
				_clear_enemies()
				return


func _spawn_enemy_fireball(origin: Vector3, dir: Vector3, damage: float) -> void:
	var ball := _sphere(0.24, _mat("enemy_fireball", Color(1.0, 0.72, 0.18), Color(1.0, 0.18, 0.02), 1.6))
	ball.position = origin
	add_child(ball)
	enemy_fireballs.append({"node": ball, "vel": dir * FIREBALL_SPEED, "damage": damage, "life": 2.1, "radius": 0.38})


func _update_enemy_fireballs(delta: float) -> void:
	for i in range(enemy_fireballs.size() - 1, -1, -1):
		var f := enemy_fireballs[i]
		f["life"] -= delta
		f["node"].position += f["vel"] * delta
		var impact: bool = f["life"] <= 0.0 or f["node"].position.distance_to(player.position + Vector3.UP) <= f["radius"] + PLAYER_RADIUS
		if impact:
			if f["node"].position.distance_to(player.position + Vector3.UP) <= f["radius"] + PLAYER_RADIUS:
				hp -= f["damage"]
			_spawn_fire_zone(Vector3(f["node"].position.x, 0.03, f["node"].position.z))
			f["node"].queue_free()
			enemy_fireballs.remove_at(i)


func _spawn_fire_zone(pos: Vector3) -> void:
	var zone := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.top_radius = 2.2
	mesh.bottom_radius = 2.2
	mesh.height = 0.08
	mesh.radial_segments = 40
	zone.mesh = mesh
	zone.position = pos
	zone.material_override = _mat("fire_zone", Color(1.0, 0.2, 0.02, 0.55), Color(1.0, 0.42, 0.03), 0.9)
	add_child(zone)
	fire_zones.append({"node": zone, "life": FIRE_ZONE_DURATION, "radius": 2.2, "tick": 0.0})


func _update_fire_zones(delta: float) -> void:
	for i in range(fire_zones.size() - 1, -1, -1):
		var z := fire_zones[i]
		z["life"] -= delta
		z["tick"] += delta
		z["node"].scale = Vector3.ONE * (1.0 + sin(Time.get_ticks_msec() * 0.01) * 0.04)
		if z["node"].position.distance_to(player.position) <= z["radius"] and z["tick"] >= 0.5:
			z["tick"] = 0.0
			hp -= 8.0
		if z["life"] <= 0.0:
			z["node"].queue_free()
			fire_zones.remove_at(i)


func _kill_enemy(index: int) -> void:
	var e := enemies[index]
	_spawn_xp(e["node"].position, e["xp"])
	e["node"].queue_free()
	enemies.remove_at(index)


func _spawn_xp(pos: Vector3, value: int) -> void:
	var orb := _sphere(0.18, _mat("xp", Color(0.24, 1.0, 0.7), Color(0.25, 1.0, 0.85), 1.0))
	orb.position = pos + Vector3(0, 0.25, 0)
	add_child(orb)
	xp_orbs.append({"node": orb, "value": value})


func _update_xp_orbs(delta: float) -> void:
	for i in range(xp_orbs.size() - 1, -1, -1):
		var orb := xp_orbs[i]
		var to_player: Vector3 = player.position + Vector3.UP * 0.7 - orb["node"].position
		if to_player.length() < 7.0:
			orb["node"].position += to_player.normalized() * 18.0 * delta
		if to_player.length() < 0.8:
			xp += orb["value"]
			if xp >= xp_next:
				xp -= xp_next
				level += 1
				xp_next = int(float(xp_next) * 1.25 + 5.0)
				max_hp += 12.0
				hp = min(max_hp, hp + 30.0)
			orb["node"].queue_free()
			xp_orbs.remove_at(i)


func _update_camera(delta: float) -> void:
	var target := player.position + Vector3(0, 18, 18)
	camera.position = camera.position.lerp(target, min(1.0, 8.0 * delta))
	camera.look_at(player.position + Vector3(0, 0.8, 0), Vector3.UP)


func _update_hud() -> void:
	hud.text = "HP %d/%d   LV %d   XP %d/%d   WAVE %d   ENEMIES %d   FPS %d" % [
		int(hp), int(max_hp), level, xp, xp_next, wave, enemies.size(), Engine.get_frames_per_second()
	]


func _clear_enemies() -> void:
	for list in [enemies, projectiles, enemy_fireballs, fire_zones, xp_orbs]:
		for item in list:
			if item.has("node"):
				item["node"].queue_free()
		list.clear()


func _sphere(radius: float, mat: Material) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	var mesh := SphereMesh.new()
	mesh.radius = radius
	mesh.height = radius * 2.0
	node.mesh = mesh
	node.material_override = mat
	return node


func _mat(key: String, color: Color, emission: Color = Color.BLACK, emission_energy: float = 0.0) -> StandardMaterial3D:
	if mat_cache.has(key):
		return mat_cache[key]
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.emission_enabled = emission_energy > 0.0
	mat.emission = emission
	mat.emission_energy_multiplier = emission_energy
	mat.roughness = 0.72
	mat_cache[key] = mat
	return mat
