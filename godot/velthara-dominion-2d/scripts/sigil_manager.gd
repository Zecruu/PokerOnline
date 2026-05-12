extends Node
## Autoload — central registry of all sigils, current run inventory,
## offer rolls on level-up, and applying their effects to the player.

const SIGIL_POOL: Array[Dictionary] = [
    {"id":"ember","name":"Ember Sigil","desc":"+8% damage","rarity":0,"damage_mult_add":0.08},
    {"id":"fleet","name":"Fleet Sigil","desc":"+6% move speed","rarity":0,"move_speed_mult_add":0.06},
    {"id":"draw","name":"Soul Draw","desc":"+15% pickup radius","rarity":0,"pickup_radius_mult_add":0.15},
    {"id":"vigor","name":"Vigor Sigil","desc":"+20 max HP","rarity":0,"max_hp_bonus":20.0},
    {"id":"hex","name":"Hex Sigil","desc":"+7% fire rate","rarity":1,"fire_rate_mult_add":0.07},
    {"id":"crown","name":"Crown of Embers","desc":"+15% damage","rarity":1,"damage_mult_add":0.15},
    {"id":"phoenix","name":"Phoenix Pact","desc":"+25 max HP, heal full","rarity":2,"max_hp_bonus":25.0,"heal_on_pickup":9999.0},
    {"id":"swift","name":"Swift Ascent","desc":"+12% move, +10% fire rate","rarity":2,"move_speed_mult_add":0.12,"fire_rate_mult_add":0.10},
    {"id":"inferno","name":"Inferno Mark","desc":"+25% damage","rarity":2,"damage_mult_add":0.25},
    {"id":"sovereign","name":"Sovereign Sigil","desc":"+30% damage, +15% fire rate","rarity":3,"damage_mult_add":0.30,"fire_rate_mult_add":0.15},
    {"id":"voidheart","name":"Voidheart","desc":"+60 max HP, +30% pickup","rarity":3,"max_hp_bonus":60.0,"pickup_radius_mult_add":0.30},
]

const SIGIL_SCRIPT := preload("res://scripts/sigil.gd")

var owned: Array = []        # this-run sigils (Sigil resources)
var _all_sigils: Array = []  # full pool as Sigil resources

signal sigils_changed(owned: Array)

func _ready() -> void:
    for d in SIGIL_POOL:
        var s: Resource = SIGIL_SCRIPT.new()
        s.id = d.get("id", "")
        s.display_name = d.get("name", "")
        s.description = d.get("desc", "")
        s.rarity = d.get("rarity", 0)
        s.damage_mult_add = d.get("damage_mult_add", 0.0)
        s.fire_rate_mult_add = d.get("fire_rate_mult_add", 0.0)
        s.pickup_radius_mult_add = d.get("pickup_radius_mult_add", 0.0)
        s.move_speed_mult_add = d.get("move_speed_mult_add", 0.0)
        s.max_hp_bonus = d.get("max_hp_bonus", 0.0)
        s.heal_on_pickup = d.get("heal_on_pickup", 0.0)
        _all_sigils.append(s)

func reset_run() -> void:
    owned.clear()
    sigils_changed.emit(owned)

func roll_offers(count: int) -> Array:
    var total_w: float = 0.0
    for s in _all_sigils:
        total_w += s.rarity_weight()
    var result: Array = []
    var attempts: int = 0
    while result.size() < count and attempts < 100:
        attempts += 1
        var pick: float = randf() * total_w
        var picked: Resource = null
        for s in _all_sigils:
            pick -= s.rarity_weight()
            if pick <= 0.0:
                picked = s
                break
        if picked == null:
            picked = _all_sigils[randi() % _all_sigils.size()]
        if not result.has(picked):
            result.append(picked)
    return result

func acquire(s: Resource, player: Node) -> void:
    owned.append(s)
    sigils_changed.emit(owned)
    _reapply_to_player(player)
    if s.heal_on_pickup > 0.0 and player != null and "hp" in player and "MAX_HP" in player:
        player.hp = min(player.MAX_HP + player.max_hp_bonus_from_sigils, player.hp + s.heal_on_pickup)
        if player.has_signal("hp_changed"):
            player.hp_changed.emit(player.hp, player.MAX_HP + player.max_hp_bonus_from_sigils)

func _reapply_to_player(player: Node) -> void:
    if player == null: return
    var dm: float = 1.0
    var fr: float = 1.0
    var pr: float = 1.0
    var ms: float = 1.0
    var hp_bonus: float = 0.0
    for s in owned:
        dm += s.damage_mult_add
        fr += s.fire_rate_mult_add
        pr += s.pickup_radius_mult_add
        ms += s.move_speed_mult_add
        hp_bonus += s.max_hp_bonus
    player.set("damage_mult", dm)
    player.set("fire_rate_mult", fr)
    player.set("pickup_radius_mult", pr)
    player.set("move_speed_mult", ms)
    if "max_hp_bonus_from_sigils" in player:
        player.max_hp_bonus_from_sigils = hp_bonus
        if player.has_signal("hp_changed"):
            player.hp_changed.emit(player.hp, player.MAX_HP + hp_bonus)
