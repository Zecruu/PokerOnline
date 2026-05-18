extends Node2D
## Main game scene controller — wires player, wave manager, HUD, camera,
## sigil-offer modal, soul shop, inventory, daily challenges, leaderboard.

@onready var player: CharacterBody2D = $Player
@onready var wave_manager: Node = $WaveManager
@onready var hud: CanvasLayer = $Hud
@onready var camera: Camera2D = $Player/Camera2D
@onready var background: TextureRect = $Background
@onready var sigil_offer: CanvasLayer = $SigilOfferPanel
@onready var soul_shop: CanvasLayer = $SoulShopPanel
@onready var inventory_panel: CanvasLayer = $InventoryPanel
@onready var pause_menu: CanvasLayer = $PauseMenu
@onready var run_summary: CanvasLayer = $RunSummary
@onready var forge_panel: CanvasLayer = $ForgePanel
@onready var event_manager: Node = $WaveManager

var game_over: bool = false

func _ready() -> void:
    # New run — reset session state.
    SigilManager.reset_run()
    ChallengeTracker.reset_run()
    Inventory.clear()

    # Wire signals → HUD updates.
    player.hp_changed.connect(_on_hp_changed)
    player.xp_changed.connect(_on_xp_changed)
    player.kill_count_changed.connect(_on_kills_changed)
    player.pyre_fuel_changed.connect(_on_pyre_fuel_changed)
    player.ability_cd_changed.connect(hud.set_ability_cooldowns)
    player.powerup_changed.connect(hud.set_powerups)
    player.leveled_up.connect(_on_leveled_up)
    player.died.connect(_on_player_died)
    wave_manager.wave_advanced.connect(_on_wave_advanced)
    wave_manager.alive_count_changed.connect(_on_alive_changed)
    ChallengeTracker.challenge_completed.connect(_on_challenge_completed)
    _on_wave_advanced(wave_manager.wave)
    _setup_background_tile()
    hud.set_souls(SaveSystem.souls)
    SaveSystem.souls_changed.connect(hud.set_souls)
    hud.set_best(SaveSystem.best_wave, SaveSystem.best_kills, SaveSystem.best_level)
    hud.set_challenges(ChallengeTracker.active)

func _setup_background_tile() -> void:
    # Stretch the hell-floor tile across a large bounded area centered on origin.
    if background == null: return
    var tex := load("res://assets/bg/hell-floor.png") as Texture2D
    if tex == null: return
    background.texture = tex
    background.stretch_mode = TextureRect.STRETCH_TILE
    background.size = Vector2(4000, 4000)
    background.position = Vector2(-2000, -2000)
    background.modulate = Color(0.55, 0.35, 0.30)

func _process(_dt: float) -> void:
    # Live-refresh the AD/AP readouts so the player can see how augments,
    # Pyre Fuel stacks, and Stardust per-level scaling shape their build.
    if player != null and is_instance_valid(player):
        hud.set_scaling(player.current_attack_damage(), player.current_ability_power() / max(0.01, player.BASE_DAMAGE))

func _on_hp_changed(current: float, max_v: float) -> void:
    hud.set_hp(current, max_v)

func _on_xp_changed(current: int, to_level: int, level: int) -> void:
    hud.set_xp(current, to_level, level)
    ChallengeTracker.report("level", level)

func _on_kills_changed(kills: int) -> void:
    hud.set_kills(kills)
    ChallengeTracker.report("kills", kills)

func _on_pyre_fuel_changed(stacks: int) -> void:
    hud.set_pyre_fuel(stacks)
    ChallengeTracker.report("pyre", stacks)

func _on_wave_advanced(wave: int) -> void:
    hud.set_wave(wave)
    hud.flash_text("Wave %d" % wave)
    ChallengeTracker.report("wave", wave)
    # Crucible substitute: every 5 waves, a new Anomaly rolls. Once the
    # full Crucible state machine lands this moves into CrucibleManager.
    var am: Node = get_tree().root.get_node_or_null("AnomalyManager")
    if am == null:
        return
    if wave == 1 or wave % 5 == 0:
        var a: Resource = am.roll_random()
        if a != null:
            am.activate(a, player)
            hud.show_anomaly(a)
            hud.flash_text("ANOMALY: %s" % String(a.display_name))
            _apply_anomaly_world_effects(a)
            # Open the Forge interlude (skip the very first wave so the
            # player isn't blocked the instant the scene loads).
            if wave > 1:
                var crucible_index: int = (wave / 5) + 1
                forge_panel.open(player, crucible_index, a, sigil_offer)

func _apply_anomaly_world_effects(a: Resource) -> void:
    # Drop any prior turret + reset camera zoom before applying the new round.
    for child in get_children():
        if child.has_meta("anomaly_owned"):
            child.queue_free()
    var cam: Camera2D = player.get_node_or_null("Camera2D")
    if cam != null:
        cam.zoom = Vector2(1, 1)
    if a == null: return
    # Castle: drop a turret next to the player.
    if "castle" in a.tags:
        var turret_script := preload("res://scripts/castle_turret.gd")
        var turret: Node2D = Node2D.new()
        turret.set_script(turret_script)
        turret.global_position = player.global_position + Vector2(60, 0)
        turret.set_meta("anomaly_owned", true)
        add_child(turret)
    # Lights Out / vision_halved: zoom in 2x so player sees half the world.
    if "vision_halved" in a.tags and cam != null:
        cam.zoom = Vector2(2, 2)

func _on_alive_changed(count: int) -> void:
    hud.set_alive(count)

func _on_leveled_up(new_level: int) -> void:
    AudioBus.play_levelup()
    sigil_offer.show_for(player)

func _on_challenge_completed(name: String, reward: int) -> void:
    hud.flash_text("Challenge! +%d souls\n%s" % [reward, name])

func _on_player_died() -> void:
    if game_over: return
    game_over = true
    var souls_before: int = SaveSystem.souls
    SaveSystem.record_run(player.kills, wave_manager.wave, player.level)
    var souls_gained: int = SaveSystem.souls - souls_before
    hud.set_best(SaveSystem.best_wave, SaveSystem.best_kills, SaveSystem.best_level)
    Leaderboard.submit_score(player.kills, wave_manager.wave, player.level)
    run_summary.show_summary(player.kills, wave_manager.wave, player.level, souls_gained)

func _input(event: InputEvent) -> void:
    if event.is_action_pressed("pause"):
        if game_over:
            return  # run summary owns the input
        if pause_menu.visible:
            pause_menu.close()
        else:
            pause_menu.open()
    elif event.is_action_pressed("toggle_inventory") and not game_over:
        inventory_panel.toggle_for(player)
    elif event.is_action_pressed("toggle_shop") and not game_over:
        soul_shop.toggle_for(player)
