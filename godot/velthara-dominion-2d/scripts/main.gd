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
