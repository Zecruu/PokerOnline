extends Node
## Autoload — Vampire-Survivors-style item evolution. Each recipe pairs
## an owned augment with an owned inventory item; combining them consumes
## both and grants a stronger evolved item.
##
## Recipe format:
##   augment_id: String  — must be in SigilManager.owned
##   item_id: String     — must be in any Inventory slot
##   evolved: Dictionary — the new item template (slotted in place)

const RECIPES: Array[Dictionary] = [
    {
        "augment_id": "inferno", "item_id": "emberwand",
        "evolved": {
            "id": "infernocrown", "name": "Inferno Crown",
            "damage": 26.0, "max_hp": 0.0, "rarity": 3, "level": 1,
        },
    },
    {
        "augment_id": "phoenix", "item_id": "phoenixcrest",
        "evolved": {
            "id": "eternalphoenix", "name": "Eternal Phoenix",
            "damage": 18.0, "max_hp": 60.0, "rarity": 3, "level": 1,
        },
    },
    {
        "augment_id": "stardust", "item_id": "sunheart",
        "evolved": {
            "id": "solarcore", "name": "Solar Core",
            "damage": 22.0, "max_hp": 40.0, "rarity": 3, "level": 1,
        },
    },
    {
        "augment_id": "burnaeg", "item_id": "firewardplate",
        "evolved": {
            "id": "pyreshroud", "name": "Pyre Shroud",
            "damage": 8.0, "max_hp": 55.0, "rarity": 3, "level": 1,
        },
    },
    {
        "augment_id": "sovereign", "item_id": "flameblade",
        "evolved": {
            "id": "sovereignblade", "name": "Sovereign Blade",
            "damage": 32.0, "max_hp": 0.0, "rarity": 3, "level": 1,
        },
    },
    {
        "augment_id": "voidheart", "item_id": "infernalcore",
        "evolved": {
            "id": "voidcore", "name": "Voidcore",
            "damage": 28.0, "max_hp": 35.0, "rarity": 3, "level": 1,
        },
    },
]

# Returns a list of available recipes: array of dicts with the recipe + the
# slot index where the source item lives. UI uses this to render buttons.
func available_for(owned_augments: Array, inventory_slots: Array) -> Array:
    var found: Array = []
    var aug_ids: Dictionary = {}
    for s in owned_augments:
        aug_ids[s.id] = true
    for r in RECIPES:
        if not aug_ids.has(r["augment_id"]):
            continue
        for i in range(inventory_slots.size()):
            var it = inventory_slots[i]
            if it == null: continue
            if String(it.get("id", "")) == String(r["item_id"]):
                found.append({"recipe": r, "slot_index": i})
                break
    return found

# Apply a recipe in-place: replace the inventory slot with the evolved item.
# Returns true on success. Does NOT remove the augment — the augment stays
# active (it's the catalyst, not the cost), VS-style.
func apply(recipe: Dictionary, slot_index: int, inventory: Node) -> bool:
    if inventory == null: return false
    if slot_index < 0 or slot_index >= inventory.slots.size(): return false
    inventory.slots[slot_index] = recipe["evolved"].duplicate()
    inventory.inventory_changed.emit(inventory.slots)
    return true
