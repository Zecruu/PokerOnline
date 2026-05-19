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
    # Inferno Mark (AP augment) + Emberwand (AD item) → AD+AP hybrid.
    {
        "augment_id": "inferno", "item_id": "emberwand",
        "evolved": {
            "id": "infernocrown", "name": "Inferno Crown",
            "attack_damage": 22.0, "ability_power": 0.12,
            "rarity": 3, "level": 1,
        },
    },
    # Phoenix Pact (HP/revive augment) + Phoenix Crest (hybrid) → big sustain.
    {
        "augment_id": "phoenix", "item_id": "phoenixcrest",
        "evolved": {
            "id": "eternalphoenix", "name": "Eternal Phoenix",
            "attack_damage": 18.0, "max_hp": 60.0, "lifesteal": 0.05,
            "rarity": 3, "level": 1,
        },
    },
    # Stardust Surge (AP scaling) + Sunheart (hybrid) → AP-scaling core.
    {
        "augment_id": "stardust", "item_id": "sunheart",
        "evolved": {
            "id": "solarcore", "name": "Solar Core",
            "attack_damage": 14.0, "max_hp": 40.0, "ability_power": 0.20,
            "rarity": 3, "level": 1,
        },
    },
    # Burning Aegis (defensive aura) + Fireward Plate (HP) → defender.
    {
        "augment_id": "burnaeg", "item_id": "firewardplate",
        "evolved": {
            "id": "pyreshroud", "name": "Pyre Shroud",
            "attack_damage": 8.0, "max_hp": 70.0,
            "rarity": 3, "level": 1,
        },
    },
    # Sovereign Sigil (universal damage) + Flameblade (AD) → pure AD greatsword.
    {
        "augment_id": "sovereign", "item_id": "flameblade",
        "evolved": {
            "id": "sovereignblade", "name": "Sovereign Blade",
            "attack_damage": 32.0, "crit_chance": 0.08,
            "rarity": 3, "level": 1,
        },
    },
    # Voidheart (max HP + pickup) + Infernal Core (AD) → AD/HP carry.
    {
        "augment_id": "voidheart", "item_id": "infernalcore",
        "evolved": {
            "id": "voidcore", "name": "Voidcore",
            "attack_damage": 28.0, "max_hp": 35.0, "lifesteal": 0.08,
            "rarity": 3, "level": 1,
        },
    },
    # Phenomenal Evil + Soulstealer's Pendant → MEGA-STACK AP item.
    # 0.006% per kill — AP is a multiplier so this still compounds heavily
    # past 1000 kills without instantly snowballing the game.
    {
        "augment_id": "phenmevl", "item_id": "mejais",
        "evolved": {
            "id": "phenomenalstacker", "name": "Phenomenal Tyrant",
            "ability_power": 0.10, "stack_metric": "kills", "stack_value_ap": 0.00006,
            "rarity": 3, "level": 1,
        },
    },
    # Stackasaurus Rex + Pyre Tally → MEGA-STACK AD item.
    {
        "augment_id": "stackrex", "item_id": "pyretally",
        "evolved": {
            "id": "stackasaurusprime", "name": "Stackasaurus Prime",
            "attack_damage": 8.0, "stack_metric": "kills", "stack_value_ad": 0.6,
            "rarity": 3, "level": 1,
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
