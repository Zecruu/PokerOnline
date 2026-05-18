extends Node
## Autoload — owns the anomaly pool, rolls one at the start of each Crucible,
## and applies/reverts the stat factors + tags onto the player.

const ANOMALY_SCRIPT := preload("res://scripts/anomaly.gd")

# (id, name, desc, color, stat factors, additives, tags)
# Color is just a banner tint hint.
const ANOMALY_POOL: Array[Dictionary] = [
    {"id":"bloodthirst","name":"BLOODTHIRSTY",
     "desc":"Heal 5% of damage dealt back as HP",
     "color":Color(0.95,0.2,0.25), "lifesteal_add":0.05},
    {"id":"ad_surge","name":"WARRIOR'S RAGE",
     "desc":"Auto-attacks +100% damage, abilities -50%",
     "color":Color(1.0,0.55,0.2), "attack_damage_factor":2.0, "ability_power_factor":0.5},
    {"id":"ap_surge","name":"ARCANE OVERFLOW",
     "desc":"Abilities +100% damage, autos -50%",
     "color":Color(0.45,0.7,1.0), "ability_power_factor":2.0, "attack_damage_factor":0.5},
    {"id":"inferno_hr","name":"INFERNO HOUR",
     "desc":"Burn DoT doubled",
     "color":Color(1.0,0.5,0.15), "burn_damage_mult":2.0},
    {"id":"featherweight","name":"FEATHERWEIGHT",
     "desc":"+50% move speed, -30% max HP",
     "color":Color(0.55,0.95,0.65), "move_speed_mult_factor":1.5, "max_hp_factor":0.7},
    {"id":"doomstacks","name":"DOOMSTACKS",
     "desc":"Pyre Fuel gains 5 stacks per kill this round",
     "color":Color(1.0,0.7,0.2), "pyre_per_kill_bonus":4},  # +4 on top of the baseline 1
    {"id":"spellcrit","name":"SPELL CRIT RAVE",
     "desc":"+50% crit chance on every ability",
     "color":Color(1.0,0.4,0.95), "crit_chance_add":0.5, "tags":["jeweled_gauntlet"]},
    {"id":"glass_cannon","name":"GLASS CANNON",
     "desc":"Triple damage but one hit and you die",
     "color":Color(1.0,0.25,0.25), "damage_mult_factor":3.0, "tags":["one_shot"]},
    {"id":"frenzy","name":"FRENZY",
     "desc":"+100% fire rate",
     "color":Color(1.0,0.75,0.2), "fire_rate_mult_factor":2.0},
    {"id":"xp_surge","name":"SOUL HARVEST",
     "desc":"Kills grant 2× XP",
     "color":Color(0.5,0.85,1.0), "xp_mult":2.0},
    {"id":"lights_out","name":"LIGHTS OUT",
     "desc":"Vision halved, kills grant 3× XP",
     "color":Color(0.4,0.35,0.7), "xp_mult":3.0, "tags":["vision_halved"]},
    {"id":"endless_mvmt","name":"ENDLESS MOVEMENT",
     "desc":"+25% move speed; nothing can slow you",
     "color":Color(0.85,0.95,1.0), "move_speed_mult_factor":1.25, "tags":["slow_immune"]},
    {"id":"castle","name":"CASTLE",
     "desc":"A turret auto-fires at the nearest enemy",
     "color":Color(0.85,0.8,0.6), "tags":["castle"]},
    {"id":"apex_aug","name":"APEX AUGMENTS",
     "desc":"Next level-up offers all Prismatic-tier augments",
     "color":Color(0.78,0.42,1.0), "tags":["apex_augments"]},
    {"id":"berserker","name":"BERSERKER'S COURSE",
     "desc":"+25% damage and fire rate, but no abilities",
     "color":Color(0.95,0.3,0.3), "damage_mult_factor":1.25, "fire_rate_mult_factor":1.25, "tags":["no_abilities"]},
    {"id":"vampaura","name":"VAMPIRIC AURA",
     "desc":"25% lifesteal on all damage",
     "color":Color(0.7,0.15,0.4), "lifesteal_add":0.25},
]

var _all: Array = []   # all Anomaly resources
var active: Resource = null

signal anomaly_changed(anomaly: Resource)

func _ready() -> void:
    for d in ANOMALY_POOL:
        var a: Resource = ANOMALY_SCRIPT.new()
        a.id = d.get("id", "")
        a.display_name = d.get("name", "")
        a.description = d.get("desc", "")
        a.color = d.get("color", Color(1, 0.4, 0.4))
        a.damage_mult_factor = d.get("damage_mult_factor", 1.0)
        a.ability_power_factor = d.get("ability_power_factor", 1.0)
        a.attack_damage_factor = d.get("attack_damage_factor", 1.0)
        a.fire_rate_mult_factor = d.get("fire_rate_mult_factor", 1.0)
        a.move_speed_mult_factor = d.get("move_speed_mult_factor", 1.0)
        a.max_hp_factor = d.get("max_hp_factor", 1.0)
        a.burn_damage_mult = d.get("burn_damage_mult", 1.0)
        a.xp_mult = d.get("xp_mult", 1.0)
        a.crit_chance_add = d.get("crit_chance_add", 0.0)
        a.lifesteal_add = d.get("lifesteal_add", 0.0)
        a.pyre_per_kill_bonus = d.get("pyre_per_kill_bonus", 0)
        var tag_array: Array[String] = []
        for t in d.get("tags", []):
            tag_array.append(String(t))
        a.tags = tag_array
        _all.append(a)

func roll_random() -> Resource:
    if _all.is_empty(): return null
    return _all[randi() % _all.size()]

func activate(anomaly: Resource, player: Node) -> void:
    if player != null:
        # Apply stat factors. Player exposes anomaly_* fields the
        # formulas reference; deactivating just resets them to defaults.
        player.set("anomaly_damage_mult", anomaly.damage_mult_factor)
        player.set("anomaly_attack_damage", anomaly.attack_damage_factor)
        player.set("anomaly_ability_power", anomaly.ability_power_factor)
        player.set("anomaly_fire_rate_mult", anomaly.fire_rate_mult_factor)
        player.set("anomaly_move_speed_mult", anomaly.move_speed_mult_factor)
        player.set("anomaly_max_hp_factor", anomaly.max_hp_factor)
        player.set("anomaly_burn_mult", anomaly.burn_damage_mult)
        player.set("anomaly_xp_mult", anomaly.xp_mult)
        player.set("anomaly_crit_chance", anomaly.crit_chance_add)
        player.set("anomaly_lifesteal", anomaly.lifesteal_add)
        player.set("anomaly_pyre_per_kill", anomaly.pyre_per_kill_bonus)
        var tag_dict: Dictionary = {}
        for t in anomaly.tags:
            tag_dict[t] = 1
        player.set("anomaly_tags", tag_dict)
        # Re-emit hp_changed so the bar reflects the new max.
        if "hp" in player and player.has_method("current_max_hp"):
            player.hp = min(player.hp, player.current_max_hp())
            if player.has_signal("hp_changed"):
                player.hp_changed.emit(player.hp, player.current_max_hp())
    active = anomaly
    anomaly_changed.emit(anomaly)

func deactivate(player: Node) -> void:
    if player != null:
        player.set("anomaly_damage_mult", 1.0)
        player.set("anomaly_attack_damage", 1.0)
        player.set("anomaly_ability_power", 1.0)
        player.set("anomaly_fire_rate_mult", 1.0)
        player.set("anomaly_move_speed_mult", 1.0)
        player.set("anomaly_max_hp_factor", 1.0)
        player.set("anomaly_burn_mult", 1.0)
        player.set("anomaly_xp_mult", 1.0)
        player.set("anomaly_crit_chance", 0.0)
        player.set("anomaly_lifesteal", 0.0)
        player.set("anomaly_pyre_per_kill", 0)
        player.set("anomaly_tags", {})
    active = null
    anomaly_changed.emit(null)
