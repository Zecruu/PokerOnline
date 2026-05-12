extends CanvasLayer
## Soul Shop — B to toggle. Spend persistent Souls (currency banked between
## runs) on items that drop into inventory, or pacts that buff the next run.

@onready var rows: VBoxContainer = $Center/Box/Inner/Scroll/Rows
@onready var soul_label: Label = $Center/Box/Inner/Header/SoulLabel
@onready var close_btn: Button = $Center/Box/Inner/Header/CloseBtn

var player: Node = null

func _ready() -> void:
    visible = false
    process_mode = Node.PROCESS_MODE_ALWAYS
    close_btn.pressed.connect(_close)
    SaveSystem.souls_changed.connect(_refresh_souls)

func toggle_for(p: Node) -> void:
    player = p
    if visible:
        _close()
    else:
        _open()

func _open() -> void:
    visible = true
    get_tree().paused = true
    _refresh_souls(SaveSystem.souls)
    _rebuild_rows()

func _close() -> void:
    visible = false
    get_tree().paused = false

func _refresh_souls(amount: int) -> void:
    soul_label.text = "Souls: %d" % amount

func _rebuild_rows() -> void:
    for c in rows.get_children():
        c.queue_free()
    for t in Inventory.ITEM_TEMPLATES:
        var row := HBoxContainer.new()
        rows.add_child(row)
        var name := Label.new()
        name.text = "%s  +%ddmg  +%dhp" % [t["name"], int(t["damage"]), int(t["max_hp"])]
        name.add_theme_font_size_override("font_size", 16)
        name.custom_minimum_size = Vector2(280, 30)
        row.add_child(name)
        var buy := Button.new()
        buy.text = "Buy %d" % int(t["cost"])
        buy.custom_minimum_size = Vector2(140, 30)
        buy.pressed.connect(_buy.bind(t))
        row.add_child(buy)
    # Pact (one-run buff)
    var pact_row := HBoxContainer.new()
    rows.add_child(pact_row)
    var pact_lbl := Label.new()
    pact_lbl.text = "Pact: Start with Phoenix Pact (legendary sigil)"
    pact_lbl.add_theme_color_override("font_color", Color(1, 0.75, 0.2))
    pact_lbl.add_theme_font_size_override("font_size", 16)
    pact_lbl.custom_minimum_size = Vector2(280, 30)
    pact_row.add_child(pact_lbl)
    var pact_btn := Button.new()
    pact_btn.text = "Invoke 250"
    pact_btn.custom_minimum_size = Vector2(140, 30)
    pact_btn.pressed.connect(_invoke_phoenix_pact)
    pact_row.add_child(pact_btn)

func _buy(template: Dictionary) -> void:
    var cost: int = int(template.get("cost", 99))
    if SaveSystem.spend_souls(cost):
        Inventory.add_item(Inventory.instance_from_template(template))

func _invoke_phoenix_pact() -> void:
    if not SaveSystem.spend_souls(250): return
    for s in SigilManager._all_sigils:
        if s.id == "phoenix":
            SigilManager.acquire(s, player)
            return
