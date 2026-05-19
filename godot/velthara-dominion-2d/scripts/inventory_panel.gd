extends CanvasLayer
## Inventory — I to toggle. 8 slots, click to upgrade (consumes 25 souls per
## level). Each slot displays the item's identity (AD/AP/HP/etc.) and, for
## stacking items, the current stack count derived from player.kills.

@onready var grid: GridContainer = $Center/Box/Inner/Grid
@onready var close_btn: Button = $Center/Box/Inner/Header/CloseBtn
@onready var summary: Label = $Center/Box/Inner/Summary

var player: Node = null
var slot_buttons: Array[Button] = []

const RARITY_COLORS: Array[Color] = [
    Color(0.85, 0.85, 0.85),
    Color(0.45, 0.7, 1.0),
    Color(0.78, 0.42, 1.0),
    Color(1.0, 0.55, 0.18),
]

func _ready() -> void:
    visible = false
    process_mode = Node.PROCESS_MODE_ALWAYS
    close_btn.pressed.connect(_close)
    var inv: Node = get_tree().root.get_node_or_null("Inventory")
    if inv != null:
        inv.inventory_changed.connect(_on_inventory_changed)
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

func _build_grid() -> void:
    for c in grid.get_children():
        c.queue_free()
    slot_buttons.clear()
    var inv: Node = get_tree().root.get_node_or_null("Inventory")
    var count: int = inv.SLOT_COUNT if inv != null else 8
    for i in range(count):
        var b := Button.new()
        b.custom_minimum_size = Vector2(140, 110)
        b.pressed.connect(_on_slot_pressed.bind(i))
        b.add_theme_font_size_override("font_size", 12)
        grid.add_child(b)
        slot_buttons.append(b)

func _on_inventory_changed(_slots: Array) -> void:
    if visible: _refresh()

func _identity_for(it: Dictionary, kills: int) -> String:
    var lvl: int = int(it.get("level", 1))
    var bits: Array = []
    var ad: float = float(it.get("attack_damage", 0.0)) * lvl
    var ap: float = float(it.get("ability_power", 0.0)) * lvl
    var hp: float = float(it.get("max_hp", 0.0)) * lvl
    if String(it.get("stack_metric", "")) == "kills":
        ad += float(it.get("stack_value_ad", 0.0)) * kills
        ap += float(it.get("stack_value_ap", 0.0)) * kills
        hp += float(it.get("stack_value_hp", 0.0)) * kills
    if ad >= 0.5: bits.append("+%d AD" % int(round(ad)))
    if ap >= 0.005: bits.append("+%d%% AP" % int(round(ap * 100.0)))
    if hp >= 0.5: bits.append("+%d HP" % int(round(hp)))
    return " ".join(bits)

func _refresh() -> void:
    var inv: Node = get_tree().root.get_node_or_null("Inventory")
    if inv == null: return
    var kills: int = int(player.kills) if (player != null and "kills" in player) else 0
    for i in range(inv.SLOT_COUNT):
        var b: Button = slot_buttons[i]
        var item = inv.slots[i]
        if item == null:
            b.text = "—"
            b.disabled = true
            b.add_theme_color_override("font_color", Color(0.6, 0.6, 0.6))
        else:
            var rarity: int = int(item.get("rarity", 0))
            var stack_suffix: String = ""
            if String(item.get("stack_metric", "")) == "kills":
                stack_suffix = "\nstacks: %d" % kills
            b.text = "%s\nLv.%d\n%s%s" % [
                String(item.get("name", "?")), int(item.get("level", 1)),
                _identity_for(item, kills), stack_suffix,
            ]
            b.add_theme_color_override("font_color", RARITY_COLORS[clamp(rarity, 0, 3)])
            b.disabled = false
    summary.text = "Inventory totals: +%d AD · +%d%% AP · +%d HP · +%d%% Crit\nClick a slot to upgrade" % [
        int(round(inv.total_ad_bonus())),
        int(round(inv.total_ap_bonus() * 100.0)),
        int(round(inv.total_hp_bonus())),
        int(round(inv.total_crit_chance() * 100.0)),
    ]

func _on_slot_pressed(idx: int) -> void:
    # Upgrades are now free — selection-driven economy like Arena augments.
    # Players still upgrade by clicking; the cost gate is gone.
    var inv: Node = get_tree().root.get_node_or_null("Inventory")
    if inv == null: return
    if inv.slots[idx] == null: return
    inv.upgrade_at(idx)
