extends Node
## Autoload — 8-slot inventory of leveled items.
##
## Items align with the player's AD/AP scaling system:
##   - attack_damage   : flat AD added to BASE_DAMAGE (autos)
##   - ability_power   : additive AP %, 0.10 = +10% spell power
##   - max_hp          : flat HP
##   - crit_chance     : additive crit chance, 0.05 = +5%
##   - lifesteal       : additive lifesteal %
##   - cdr             : additive cooldown reduction
##
## Stacking items (Mejai's / Tear / Mejai's analog) gain stats per kill.
## Stacks read player.kills live in the total_*_bonus() calls so they
## scale infinitely without per-frame caching.
##   - stack_metric        : "kills" (more metrics later: "hits", "level")
##   - stack_value_ad      : AD added per stack
##   - stack_value_ap      : AP % added per stack
##   - stack_value_hp      : HP added per stack
##
## All stat bonuses are level-scaled: item_value * item.level. Stacks
## scale with the metric, not the level.
##
## Slots store a dict that's the template merged with {level: int}.

const SLOT_COUNT: int = 8

var slots: Array = []  # length=8, null or dict

signal inventory_changed(slots: Array)

func _ready() -> void:
    clear()

func clear() -> void:
    slots = []
    for i in range(SLOT_COUNT):
        slots.append(null)
    inventory_changed.emit(slots)

func add_item(item: Dictionary) -> bool:
    for i in range(SLOT_COUNT):
        if slots[i] == null:
            slots[i] = item
            inventory_changed.emit(slots)
            return true
    return false  # full

func upgrade_at(index: int) -> bool:
    if index < 0 or index >= SLOT_COUNT or slots[index] == null:
        return false
    slots[index]["level"] = int(slots[index].get("level", 1)) + 1
    inventory_changed.emit(slots)
    return true

func remove_at(index: int) -> void:
    if index < 0 or index >= SLOT_COUNT: return
    slots[index] = null
    inventory_changed.emit(slots)

# ── Total bonus accessors. Each iterates 8 slots once — cheap enough
#    to call on every damage tick, and stacks stay live-correct. ──
func _player_kills() -> int:
    var ps := get_tree().get_nodes_in_group("player")
    if ps.is_empty(): return 0
    var p: Node = ps[0]
    if "kills" in p:
        return int(p.kills)
    return 0

func total_ad_bonus() -> float:
    var kills: int = _player_kills()
    var total: float = 0.0
    for it in slots:
        if it == null: continue
        var lvl: int = int(it.get("level", 1))
        total += float(it.get("attack_damage", 0.0)) * float(lvl)
        if String(it.get("stack_metric", "")) == "kills":
            total += float(it.get("stack_value_ad", 0.0)) * float(kills)
    return total

func total_ap_bonus() -> float:
    # Returns additive +% AP (0.25 = +25%), summed across slots and stacks.
    var kills: int = _player_kills()
    var total: float = 0.0
    for it in slots:
        if it == null: continue
        var lvl: int = int(it.get("level", 1))
        total += float(it.get("ability_power", 0.0)) * float(lvl)
        if String(it.get("stack_metric", "")) == "kills":
            total += float(it.get("stack_value_ap", 0.0)) * float(kills)
    return total

func total_hp_bonus() -> float:
    var kills: int = _player_kills()
    var total: float = 0.0
    for it in slots:
        if it == null: continue
        var lvl: int = int(it.get("level", 1))
        total += float(it.get("max_hp", 0.0)) * float(lvl)
        if String(it.get("stack_metric", "")) == "kills":
            total += float(it.get("stack_value_hp", 0.0)) * float(kills)
    return total

func total_crit_chance() -> float:
    var total: float = 0.0
    for it in slots:
        if it == null: continue
        var lvl: int = int(it.get("level", 1))
        total += float(it.get("crit_chance", 0.0)) * float(lvl)
    return total

func total_lifesteal() -> float:
    var total: float = 0.0
    for it in slots:
        if it == null: continue
        var lvl: int = int(it.get("level", 1))
        total += float(it.get("lifesteal", 0.0)) * float(lvl)
    return total

func total_cdr() -> float:
    var total: float = 0.0
    for it in slots:
        if it == null: continue
        var lvl: int = int(it.get("level", 1))
        total += float(it.get("cdr", 0.0)) * float(lvl)
    return total

# Legacy alias kept so older callers (inventory_panel) keep working.
func total_damage_bonus() -> float:
    return total_ad_bonus()

# ── Item templates. rarity: 0=Silver, 1=Gold, 2=Prismatic, 3=Hex.
#    cost: soul-shop price.
const ITEM_TEMPLATES: Array = [
    # Silver — basic stat sticks
    {"id":"emberwand",       "name":"Emberwand",        "attack_damage":4.0,                                 "rarity":0, "cost":15},
    {"id":"acolytetome",     "name":"Acolyte's Tome",   "ability_power":0.05,                                "rarity":0, "cost":18},
    {"id":"firewardplate",   "name":"Fireward Plate",   "max_hp":18.0,                                       "rarity":0, "cost":20},
    {"id":"sharpedge_dagger","name":"Sharpedge Dagger", "attack_damage":2.0, "crit_chance":0.03,             "rarity":0, "cost":22},

    # Gold — better flats + small synergies
    {"id":"flameblade",      "name":"Flameblade",       "attack_damage":8.0,                                 "rarity":1, "cost":40},
    {"id":"hexcodex",        "name":"Hex Codex",        "ability_power":0.10,                                "rarity":1, "cost":45},
    {"id":"phoenixcrest",    "name":"Phoenix Crest",    "attack_damage":6.0, "max_hp":12.0,                  "rarity":1, "cost":55},
    {"id":"bloodfang",       "name":"Bloodfang",        "attack_damage":4.0, "lifesteal":0.05,               "rarity":1, "cost":50},
    {"id":"glasswarden",     "name":"Glasswarden",      "max_hp":10.0, "ability_power":0.06,                 "rarity":1, "cost":48},

    # ── STACKING ITEMS (Mejai's / Tear / Senna analogs). Stacks read
    #     player.kills live, scale infinitely. AP-per-kill is intentionally
    #     tiny (0.006%-0.02%) because AP is a MULTIPLIER — even a small
    #     value compounds aggressively over 500+ kills. Flat AD-per-kill
    #     can be larger because it adds linearly. ──
    {"id":"mejais",          "name":"Soulstealer's Pendant","ability_power":0.05, "stack_metric":"kills", "stack_value_ap":0.00006, "rarity":1, "cost":60},
    {"id":"pyretally",       "name":"Pyre Tally",       "attack_damage":3.0, "stack_metric":"kills", "stack_value_ad":0.2,       "rarity":1, "cost":55},

    # Prismatic — heavy hitters + scaling stacks
    {"id":"infernalcore",    "name":"Infernal Core",    "attack_damage":14.0,                                "rarity":2, "cost":90},
    {"id":"pyregrimoire",    "name":"Pyre Grimoire",    "ability_power":0.18,                                "rarity":2, "cost":95},
    {"id":"sunheart",        "name":"Sunheart",         "attack_damage":12.0, "max_hp":20.0,                 "rarity":2, "cost":120},
    {"id":"tearofsovereign", "name":"Tear of the Sovereign","max_hp":15.0, "stack_metric":"kills", "stack_value_hp":1.0,        "rarity":2, "cost":110},
    {"id":"endlessembers",   "name":"Endless Embers",   "attack_damage":4.0, "ability_power":0.05, "stack_metric":"kills", "stack_value_ad":0.3, "stack_value_ap":0.00006, "rarity":2, "cost":140},
    {"id":"witchhunter",     "name":"Witchhunter",      "attack_damage":8.0, "crit_chance":0.10,             "rarity":2, "cost":100},

    # Hex — game-defining legendary items (also targets for evolution recipes)
    {"id":"stacksofeternity","name":"Stacks of Eternity","attack_damage":6.0, "ability_power":0.08, "stack_metric":"kills", "stack_value_ad":1.0, "stack_value_ap":0.0002, "rarity":3, "cost":280},

    # ── CORRUPTED (rarest) — extreme power, hidden cost. Cost is 0 because
    #     in the new Forge-pick flow nothing is purchased; rarity gates
    #     drop frequency. ──
    {"id":"cursedblade",  "name":"Cursed Blade",
     "attack_damage":25.0, "tags":["cursed_drain"], "rarity":4, "cost":0},
    {"id":"hexmirror",    "name":"Hex Mirror",
     "ability_power":0.30, "tags":["hex_mirror"], "rarity":4, "cost":0},
    {"id":"doomstack",    "name":"Doomstack",
     "attack_damage":80.0, "stack_metric":"kills", "stack_value_ad":0.4, "tags":["doomstack"], "rarity":4, "cost":0},
]

func template_by_id(id: String) -> Dictionary:
    for t in ITEM_TEMPLATES:
        if t["id"] == id: return t
    return {}

func instance_from_template(template: Dictionary) -> Dictionary:
    var inst: Dictionary = template.duplicate(true)
    inst["level"] = 1
    return inst
