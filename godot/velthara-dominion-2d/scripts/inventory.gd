extends Node
## Autoload — 8-slot inventory of leveled items. Items are dicts:
## {id: str, name: str, level: int, rarity: int}
## Items provide flat damage / hp bonuses scaled by level; rarity is cosmetic.

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

func total_damage_bonus() -> float:
    var total: float = 0.0
    for it in slots:
        if it == null: continue
        total += float(it.get("damage", 0.0)) * float(it.get("level", 1))
    return total

func total_hp_bonus() -> float:
    var total: float = 0.0
    for it in slots:
        if it == null: continue
        total += float(it.get("max_hp", 0.0)) * float(it.get("level", 1))
    return total

const ITEM_TEMPLATES: Array = [
    {"id":"emberwand","name":"Emberwand","damage":4.0,"max_hp":0.0,"rarity":0,"cost":15},
    {"id":"flameblade","name":"Flameblade","damage":8.0,"max_hp":0.0,"rarity":1,"cost":35},
    {"id":"infernalcore","name":"Infernal Core","damage":14.0,"max_hp":0.0,"rarity":2,"cost":75},
    {"id":"firewardplate","name":"Fireward Plate","damage":0.0,"max_hp":18.0,"rarity":1,"cost":30},
    {"id":"phoenixcrest","name":"Phoenix Crest","damage":6.0,"max_hp":12.0,"rarity":2,"cost":60},
    {"id":"sunheart","name":"Sunheart","damage":12.0,"max_hp":20.0,"rarity":3,"cost":140},
]

func template_by_id(id: String) -> Dictionary:
    for t in ITEM_TEMPLATES:
        if t["id"] == id: return t
    return {}

func instance_from_template(template: Dictionary) -> Dictionary:
    return {
        "id": template["id"], "name": template["name"],
        "damage": template["damage"], "max_hp": template["max_hp"],
        "rarity": template["rarity"], "level": 1,
    }
