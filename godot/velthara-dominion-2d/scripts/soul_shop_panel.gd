extends CanvasLayer
## Treasury — B to toggle. Read-only display of your current run loadout:
## acquired augments (with rarity coloring) and inventory items.
##
## The old soul-currency "shop" was replaced with the Arena-style Forge
## interlude where augments + items are picked free (no purchase cost).
## This screen now exists only to remind the player what they're carrying.

@onready var rows: VBoxContainer = $Center/Box/Inner/Scroll/Rows
@onready var soul_label: Label = $Center/Box/Inner/Header/SoulLabel
@onready var close_btn: Button = $Center/Box/Inner/Header/CloseBtn

var player: Node = null

const RARITY_NAMES: Array[String] = ["Silver", "Gold", "Prismatic", "Hex", "Corrupted"]
const RARITY_COLORS: Array[Color] = [
    Color(0.85, 0.85, 0.85),
    Color(0.45, 0.7, 1.0),
    Color(0.78, 0.42, 1.0),
    Color(1.0, 0.55, 0.18),
    Color(0.85, 0.18, 0.22),
]

func _ready() -> void:
    visible = false
    process_mode = Node.PROCESS_MODE_ALWAYS
    close_btn.pressed.connect(_close)
    close_btn.text = "Close"
    soul_label.text = "TREASURY"

func toggle_for(p: Node) -> void:
    player = p
    if visible:
        _close()
    else:
        _open()

func _open() -> void:
    visible = true
    get_tree().paused = true
    _rebuild_rows()

func _close() -> void:
    visible = false
    get_tree().paused = false

func _rebuild_rows() -> void:
    for c in rows.get_children():
        c.queue_free()

    var aug_hdr := _section_label("AUGMENTS")
    rows.add_child(aug_hdr)
    var sm: Node = get_tree().root.get_node_or_null("SigilManager")
    if sm == null or sm.owned.is_empty():
        rows.add_child(_dim_label("— none —"))
    else:
        for s in sm.owned:
            rows.add_child(_owned_aug_row(s))

    rows.add_child(_section_label("INVENTORY"))
    var inv: Node = get_tree().root.get_node_or_null("Inventory")
    if inv == null:
        rows.add_child(_dim_label("— none —"))
        return
    var any_item: bool = false
    var kills: int = int(player.kills) if (player != null and "kills" in player) else 0
    for it in inv.slots:
        if it == null: continue
        rows.add_child(_owned_item_row(it, kills))
        any_item = true
    if not any_item:
        rows.add_child(_dim_label("— none —"))

func _section_label(text: String) -> Label:
    var lbl := Label.new()
    lbl.text = text
    lbl.add_theme_color_override("font_color", Color(1, 0.83, 0.27, 1))
    lbl.add_theme_font_size_override("font_size", 20)
    return lbl

func _dim_label(text: String) -> Label:
    var lbl := Label.new()
    lbl.text = text
    lbl.add_theme_color_override("font_color", Color(0.6, 0.6, 0.6))
    lbl.add_theme_font_size_override("font_size", 14)
    return lbl

func _owned_aug_row(s: Resource) -> Label:
    var lbl := Label.new()
    lbl.text = "• %s  [%s]  %s" % [s.display_name, s.rarity_name(), s.description]
    lbl.add_theme_color_override("font_color", s.rarity_color())
    lbl.add_theme_font_size_override("font_size", 14)
    return lbl

func _owned_item_row(it: Dictionary, kills: int) -> Label:
    var lbl := Label.new()
    var rarity_idx: int = clamp(int(it.get("rarity", 0)), 0, 4)
    var lvl: int = int(it.get("level", 1))
    lbl.text = "• %s Lv.%d  [%s]  %s" % [
        String(it.get("name", "?")), lvl, RARITY_NAMES[rarity_idx], _item_identity(it, kills),
    ]
    lbl.add_theme_color_override("font_color", RARITY_COLORS[rarity_idx])
    lbl.add_theme_font_size_override("font_size", 14)
    return lbl

func _item_identity(it: Dictionary, kills: int) -> String:
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
