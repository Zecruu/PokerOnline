extends CanvasLayer
## Inventory — I to toggle. 8 slots, click to upgrade (consumes 25 souls per
## level), right-click handled as another button to drop.

@onready var grid: GridContainer = $Center/Box/Inner/Grid
@onready var close_btn: Button = $Center/Box/Inner/Header/CloseBtn
@onready var summary: Label = $Center/Box/Inner/Summary

var player: Node = null
var slot_buttons: Array[Button] = []

func _ready() -> void:
    visible = false
    process_mode = Node.PROCESS_MODE_ALWAYS
    close_btn.pressed.connect(_close)
    Inventory.inventory_changed.connect(_on_inventory_changed)
    _build_grid()

func toggle_for(p: Node) -> void:
    player = p
    if visible:
        _close()
    else:
        _open()

func _open() -> void:
    visible = true
    get_tree().paused = true
    _refresh()

func _close() -> void:
    visible = false
    get_tree().paused = false
    _apply_to_player()

func _build_grid() -> void:
    for c in grid.get_children():
        c.queue_free()
    slot_buttons.clear()
    for i in range(Inventory.SLOT_COUNT):
        var b := Button.new()
        b.custom_minimum_size = Vector2(110, 80)
        b.pressed.connect(_on_slot_pressed.bind(i))
        grid.add_child(b)
        slot_buttons.append(b)

func _on_inventory_changed(_slots: Array) -> void:
    if visible: _refresh()

func _refresh() -> void:
    for i in range(Inventory.SLOT_COUNT):
        var b: Button = slot_buttons[i]
        var item = Inventory.slots[i]
        if item == null:
            b.text = "—"
            b.disabled = true
        else:
            b.text = "%s\nLv.%d\n+%ddmg +%dhp" % [
                item.get("name", "?"), int(item.get("level", 1)),
                int(item.get("damage", 0)) * int(item.get("level", 1)),
                int(item.get("max_hp", 0)) * int(item.get("level", 1)),
            ]
            b.disabled = false
    summary.text = "Total bonuses from inventory: +%d dmg, +%d hp\nClick a slot to upgrade (25 souls)" % [
        int(Inventory.total_damage_bonus()), int(Inventory.total_hp_bonus())
    ]

func _on_slot_pressed(idx: int) -> void:
    if Inventory.slots[idx] == null: return
    if SaveSystem.spend_souls(25):
        Inventory.upgrade_at(idx)

func _apply_to_player() -> void:
    if player == null: return
    var dmg_bonus: float = Inventory.total_damage_bonus()
    var hp_bonus: float = Inventory.total_hp_bonus()
    if "inventory_damage_bonus" in player:
        player.inventory_damage_bonus = dmg_bonus
    if "inventory_hp_bonus" in player:
        player.inventory_hp_bonus = hp_bonus
        if player.has_signal("hp_changed"):
            player.hp_changed.emit(player.hp, player.MAX_HP + player.max_hp_bonus_from_sigils + hp_bonus)
