extends Node
## Autoload — Megabonk-style stat-pick registry. On every level-up, the player
## is offered 3 random stat-pick "potions" from this pool. Picks have no rarity
## tier and no per-run cap — pure additive stat boosts that compound across the
## run. Augments (SigilManager) continue to drive their own offer flow at Forge
## interludes; stat-picks live alongside, tracked here for HUD-side visibility.
##
## Player.gd reads the resulting bonuses through its `stat_pick_*` fields, which
## are re-pushed by _apply_to_player() after every acquire. Mirrors how
## SigilManager._reapply_to_player threads augment state into the player.

const STAT_PICKS: Array[Dictionary] = [
    {"id":"sp_damage",   "name":"Ember Draught",
     "desc":"+5% damage",                  "color":Color(1.00, 0.55, 0.22),
     "category":"offense", "damage_mult_add":0.05},
    {"id":"sp_firerate", "name":"Quickening Vial",
     "desc":"+5% fire rate",               "color":Color(1.00, 0.78, 0.30),
     "category":"offense", "fire_rate_mult_add":0.05},
    {"id":"sp_hp",       "name":"Wardstone Brew",
     "desc":"+15 max HP",                  "color":Color(0.50, 0.95, 0.55),
     "category":"defense", "max_hp_bonus_add":15.0},
    {"id":"sp_crit",     "name":"Edgekeeper Tonic",
     "desc":"+3% crit chance",             "color":Color(1.00, 0.95, 0.45),
     "category":"offense", "crit_chance_add":0.03},
    {"id":"sp_lifesteal","name":"Sanguine Sip",
     "desc":"+3% lifesteal",               "color":Color(0.90, 0.30, 0.45),
     "category":"defense", "lifesteal_add":0.03},
    {"id":"sp_speed",    "name":"Fleet Elixir",
     "desc":"+4% move speed",              "color":Color(0.55, 0.90, 1.00),
     "category":"utility", "move_speed_mult_add":0.04},
    {"id":"sp_cdr",      "name":"Cooldown Cordial",
     "desc":"-3% ability cooldowns",       "color":Color(0.65, 0.75, 1.00),
     "category":"utility", "cdr_add":0.03},
    {"id":"sp_ap",       "name":"Spellbinder Phial",
     "desc":"+5% ability power",           "color":Color(0.55, 0.65, 1.00),
     "category":"offense", "spell_power_mult_add":0.05},
    {"id":"sp_ad",       "name":"Warbrute Draught",
     "desc":"+5 attack damage",            "color":Color(1.00, 0.65, 0.45),
     "category":"offense", "attack_power_add":5.0},
    {"id":"sp_pickup",   "name":"Magpie Mixture",
     "desc":"+10% pickup radius",          "color":Color(0.85, 0.85, 1.00),
     "category":"utility", "pickup_radius_mult_add":0.10},
    {"id":"sp_pyre",     "name":"Pyre Ferment",
     "desc":"+1 Pyre Fuel stack per kill", "color":Color(1.00, 0.45, 0.20),
     "category":"utility", "pyre_per_kill_add":1},
    {"id":"sp_phenom",   "name":"Phenom Distillate",
     "desc":"+0.5% Ability Power per kill","color":Color(0.85, 0.35, 1.00),
     "category":"offense", "phenomenal_per_kill_add":1},
]

# Run-scoped accumulators. reset_run() zeroes them at the start of each run.
var picks_taken: int = 0
var damage_mult: float = 1.0
var fire_rate_mult: float = 1.0
var max_hp_bonus: float = 0.0
var crit_chance: float = 0.0
var lifesteal: float = 0.0
var move_speed_mult: float = 1.0
var cdr: float = 0.0
var spell_power_mult: float = 1.0
var attack_power_bonus: float = 0.0
var pickup_radius_mult: float = 1.0
var pyre_per_kill: int = 0
var phenomenal_per_kill: int = 0

signal picks_changed(taken: int)

func reset_run() -> void:
    picks_taken = 0
    damage_mult = 1.0
    fire_rate_mult = 1.0
    max_hp_bonus = 0.0
    crit_chance = 0.0
    lifesteal = 0.0
    move_speed_mult = 1.0
    cdr = 0.0
    spell_power_mult = 1.0
    attack_power_bonus = 0.0
    pickup_radius_mult = 1.0
    pyre_per_kill = 0
    phenomenal_per_kill = 0
    picks_changed.emit(0)

func roll_offers(count: int = 3) -> Array:
    # Picks can repeat across level-ups (that's the whole stacking point) but a
    # single offer screen should never show the same pick twice in three slots.
    var pool: Array = STAT_PICKS.duplicate()
    pool.shuffle()
    var result: Array = []
    for p in pool:
        if result.size() >= count: break
        result.append(p)
    return result

func acquire(pick: Dictionary, player: Node) -> void:
    damage_mult         += float(pick.get("damage_mult_add", 0.0))
    fire_rate_mult      += float(pick.get("fire_rate_mult_add", 0.0))
    max_hp_bonus        += float(pick.get("max_hp_bonus_add", 0.0))
    crit_chance         += float(pick.get("crit_chance_add", 0.0))
    lifesteal           += float(pick.get("lifesteal_add", 0.0))
    move_speed_mult     += float(pick.get("move_speed_mult_add", 0.0))
    cdr                 += float(pick.get("cdr_add", 0.0))
    spell_power_mult    += float(pick.get("spell_power_mult_add", 0.0))
    attack_power_bonus  += float(pick.get("attack_power_add", 0.0))
    pickup_radius_mult  += float(pick.get("pickup_radius_mult_add", 0.0))
    pyre_per_kill       += int(pick.get("pyre_per_kill_add", 0))
    phenomenal_per_kill += int(pick.get("phenomenal_per_kill_add", 0))
    picks_taken += 1
    _apply_to_player(player)
    picks_changed.emit(picks_taken)

func _apply_to_player(player: Node) -> void:
    if player == null: return
    # Push the totals into the dedicated stat_pick_* fields on player.gd so
    # SigilManager's _reapply_to_player (which overwrites damage_mult, fire_rate_mult,
    # etc.) doesn't clobber stat-pick contributions on the next augment acquire.
    if "stat_pick_damage_mult" in player:           player.stat_pick_damage_mult = damage_mult
    if "stat_pick_fire_rate_mult" in player:        player.stat_pick_fire_rate_mult = fire_rate_mult
    if "stat_pick_max_hp_bonus" in player:          player.stat_pick_max_hp_bonus = max_hp_bonus
    if "stat_pick_crit_chance" in player:           player.stat_pick_crit_chance = crit_chance
    if "stat_pick_lifesteal" in player:             player.stat_pick_lifesteal = lifesteal
    if "stat_pick_move_speed_mult" in player:       player.stat_pick_move_speed_mult = move_speed_mult
    if "stat_pick_cdr" in player:                   player.stat_pick_cdr = cdr
    if "stat_pick_spell_power_mult" in player:      player.stat_pick_spell_power_mult = spell_power_mult
    if "stat_pick_attack_power_bonus" in player:    player.stat_pick_attack_power_bonus = attack_power_bonus
    if "stat_pick_pickup_radius_mult" in player:    player.stat_pick_pickup_radius_mult = pickup_radius_mult
    if "stat_pick_pyre_per_kill" in player:         player.stat_pick_pyre_per_kill = pyre_per_kill
    if "stat_pick_phenomenal_per_kill" in player:   player.stat_pick_phenomenal_per_kill = phenomenal_per_kill
    # Health pots actually heal — refresh current HP if max_hp went up.
    if player.has_method("current_max_hp"):
        var new_max: float = player.current_max_hp()
        if "hp" in player and float(player.hp) > new_max:
            player.hp = new_max
        if player.has_signal("hp_changed"):
            player.hp_changed.emit(player.hp, new_max)
