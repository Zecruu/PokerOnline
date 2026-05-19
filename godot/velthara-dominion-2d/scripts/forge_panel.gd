extends CanvasLayer
## Forge — between-Crucible Arena-style augment + item picker.
##
## Replaces the old buttons-row UI. Pauses the game, shows the upcoming
## Crucible name and active Anomaly, then offers two rolled selections:
##
##   AUGMENTS — 3 cards rolled by rarity weight (Silver → Corrupted).
##              Pick one; it becomes permanent for the rest of the run.
##   ITEMS    — 3 cards rolled by rarity weight from the inventory pool.
##              Pick one; it drops into your inventory.
##
## No soul cost. The player just picks like Arena augment select.

@onready var title_lbl: Label = $Center/Box/Inner/TitleLbl
@onready var anomaly_lbl: Label = $Center/Box/Inner/AnomalyLbl

@onready var augment_header: Label = $Center/Box/Inner/AugmentHeader
@onready var augment_row: HBoxContainer = $Center/Box/Inner/AugmentRow

@onready var item_header: Label = $Center/Box/Inner/ItemHeader
@onready var item_row: HBoxContainer = $Center/Box/Inner/ItemRow

@onready var continue_btn: Button = $Center/Box/Inner/ContinueBtn

var player: Node = null
var augment_offers: Array = []   # of Sigil resources
var item_offers: Array = []      # of dict templates
var picked_augment: bool = false
var picked_item: bool = false

const ITEM_RARITY_WEIGHTS: Array[float] = [60.0, 28.0, 10.0, 2.0, 1.2]  # Silver→Corrupted

func _ready() -> void:
    visible = false
    process_mode = Node.PROCESS_MODE_ALWAYS
    continue_btn.pressed.connect(close)

func open(p: Node, crucible_index: int, anomaly: Resource, _offer_panel: CanvasLayer) -> void:
    player = p
    visible = true
    get_tree().paused = true
    title_lbl.text = "FORGE — Crucible %d" % crucible_index
    if anomaly != null:
        anomaly_lbl.text = "Anomaly: %s — %s" % [String(anomaly.display_name), String(anomaly.description)]
        anomaly_lbl.add_theme_color_override("font_color", anomaly.color)
    else:
        anomaly_lbl.text = ""

    # Roll fresh offers each time the Forge opens.
    picked_augment = false
    picked_item = false
    augment_header.text = "CHOOSE AN AUGMENT"
    item_header.text = "CHOOSE AN ITEM"
    _roll_augments()
    _roll_items()

func close() -> void:
    visible = false
    get_tree().paused = false

# ── Augment offers ──────────────────────────────────────────────────────────

func _roll_augments() -> void:
    for c in augment_row.get_children():
        c.queue_free()
    var sm: Node = get_tree().root.get_node_or_null("SigilManager")
    if sm == null: return
    var count: int = 3
    var apex: bool = false
    if player != null and player.has_method("has_tag"):
        if player.has_tag("extra_offer"):
            count = 4
        if player.has_tag("apex_augments"):
            apex = true
    augment_offers = sm.roll_offers(count, apex)
    for i in range(augment_offers.size()):
        var s: Resource = augment_offers[i]
        augment_row.add_child(_make_augment_card(s, i))

func _make_augment_card(s: Resource, idx: int) -> Button:
    var b := Button.new()
    b.custom_minimum_size = Vector2(220, 200)
    b.text = "%s\n[%s]\n\n%s" % [String(s.display_name), String(s.rarity_name()), String(s.description)]
    b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
    b.add_theme_color_override("font_color", s.rarity_color())
    b.add_theme_color_override("font_outline_color", Color(0, 0, 0))
    b.add_theme_constant_override("outline_size", 4)
    b.add_theme_font_size_override("font_size", 14)
    b.add_theme_stylebox_override("normal", _rarity_card_style(s.rarity_color()))
    b.add_theme_stylebox_override("hover", _rarity_card_style(s.rarity_color(), 1.25))
    b.add_theme_stylebox_override("pressed", _rarity_card_style(s.rarity_color(), 0.85))
    b.pressed.connect(_on_augment_picked.bind(idx))
    return b

func _on_augment_picked(idx: int) -> void:
    if picked_augment: return
    if idx < 0 or idx >= augment_offers.size(): return
    var sm: Node = get_tree().root.get_node_or_null("SigilManager")
    if sm == null: return
    sm.acquire(augment_offers[idx], player)
    picked_augment = true
    augment_header.text = "AUGMENT ACQUIRED — %s" % String(augment_offers[idx].display_name)
    for child in augment_row.get_children():
        (child as Button).disabled = true

# ── Item offers ─────────────────────────────────────────────────────────────

func _roll_items() -> void:
    for c in item_row.get_children():
        c.queue_free()
    var inv: Node = get_tree().root.get_node_or_null("Inventory")
    if inv == null: return
    item_offers.clear()
    var pool: Array = inv.ITEM_TEMPLATES
    var attempts: int = 0
    while item_offers.size() < 3 and attempts < 100:
        attempts += 1
        var t: Dictionary = _weighted_item_roll(pool)
        if t.is_empty(): continue
        if not item_offers.has(t):
            item_offers.append(t)
    for i in range(item_offers.size()):
        item_row.add_child(_make_item_card(item_offers[i], i))

func _weighted_item_roll(pool: Array) -> Dictionary:
    var total_w: float = 0.0
    for t in pool:
        var r: int = clamp(int(t.get("rarity", 0)), 0, ITEM_RARITY_WEIGHTS.size() - 1)
        total_w += ITEM_RARITY_WEIGHTS[r]
    var pick: float = randf() * total_w
    for t in pool:
        var r2: int = clamp(int(t.get("rarity", 0)), 0, ITEM_RARITY_WEIGHTS.size() - 1)
        pick -= ITEM_RARITY_WEIGHTS[r2]
        if pick <= 0.0:
            return t
    return pool[randi() % pool.size()] if pool.size() > 0 else {}

func _make_item_card(t: Dictionary, idx: int) -> Button:
    var b := Button.new()
    b.custom_minimum_size = Vector2(220, 200)
    var rarity_idx: int = clamp(int(t.get("rarity", 0)), 0, 4)
    var rarity_names: Array[String] = ["Silver", "Gold", "Prismatic", "Hex", "Corrupted"]
    var rarity_colors: Array[Color] = [
        Color(0.85, 0.85, 0.85), Color(0.45, 0.7, 1.0),
        Color(0.78, 0.42, 1.0),  Color(1.0, 0.55, 0.18),
        Color(0.85, 0.18, 0.22),
    ]
    var color: Color = rarity_colors[rarity_idx]
    b.text = "%s\n[%s]\n\n%s" % [String(t["name"]), rarity_names[rarity_idx], _item_identity(t)]
    b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
    b.add_theme_color_override("font_color", color)
    b.add_theme_color_override("font_outline_color", Color(0, 0, 0))
    b.add_theme_constant_override("outline_size", 4)
    b.add_theme_font_size_override("font_size", 14)
    b.add_theme_stylebox_override("normal", _rarity_card_style(color))
    b.add_theme_stylebox_override("hover", _rarity_card_style(color, 1.25))
    b.add_theme_stylebox_override("pressed", _rarity_card_style(color, 0.85))
    b.pressed.connect(_on_item_picked.bind(idx))
    return b

func _on_item_picked(idx: int) -> void:
    if picked_item: return
    if idx < 0 or idx >= item_offers.size(): return
    var inv: Node = get_tree().root.get_node_or_null("Inventory")
    if inv == null: return
    var instance: Dictionary = inv.instance_from_template(item_offers[idx])
    inv.add_item(instance)
    picked_item = true
    item_header.text = "ITEM ACQUIRED — %s" % String(item_offers[idx].get("name", ""))
    for child in item_row.get_children():
        (child as Button).disabled = true

func _item_identity(t: Dictionary) -> String:
    var bits: Array = []
    var ad: float = float(t.get("attack_damage", 0.0))
    var ap: float = float(t.get("ability_power", 0.0))
    var hp: float = float(t.get("max_hp", 0.0))
    var crit: float = float(t.get("crit_chance", 0.0))
    var life: float = float(t.get("lifesteal", 0.0))
    if ad > 0.0: bits.append("+%d AD" % int(round(ad)))
    if ap > 0.0: bits.append("+%d%% AP" % int(round(ap * 100.0)))
    if hp > 0.0: bits.append("+%d HP" % int(round(hp)))
    if crit > 0.0: bits.append("+%d%% Crit" % int(round(crit * 100.0)))
    if life > 0.0: bits.append("+%d%% Lifesteal" % int(round(life * 100.0)))
    if String(t.get("stack_metric", "")) == "kills":
        var sad: float = float(t.get("stack_value_ad", 0.0))
        var sap: float = float(t.get("stack_value_ap", 0.0))
        var shp: float = float(t.get("stack_value_hp", 0.0))
        var stack_bits: Array = []
        if sad > 0.0: stack_bits.append("+%.1f AD" % sad)
        if sap > 0.0: stack_bits.append("+%.3f%% AP" % (sap * 100.0))
        if shp > 0.0: stack_bits.append("+%d HP" % int(shp))
        if stack_bits.size() > 0:
            bits.append("\nstacks: %s per kill" % " · ".join(stack_bits))
    # Corrupted items carry a flavor tag the player should know about.
    if int(t.get("rarity", 0)) == 4:
        var tags: Array = t.get("tags", [])
        for tag in tags:
            match String(tag):
                "cursed_drain": bits.append("\nDRAINS 2 HP per attack")
                "hex_mirror": bits.append("\nAbilities cost 4% HP")
                "doomstack": bits.append("\nFlat AD scales with kills")
    return "\n".join(bits)

# ── Card style helper ──────────────────────────────────────────────────────

func _rarity_card_style(border_color: Color, intensity: float = 1.0) -> StyleBoxFlat:
    var sb := StyleBoxFlat.new()
    sb.bg_color = Color(0.08 * intensity, 0.06 * intensity, 0.08 * intensity, 0.92)
    sb.border_color = Color(border_color.r * intensity, border_color.g * intensity, border_color.b * intensity, 1.0)
    sb.border_width_left = 3
    sb.border_width_top = 3
    sb.border_width_right = 3
    sb.border_width_bottom = 3
    sb.corner_radius_top_left = 8
    sb.corner_radius_top_right = 8
    sb.corner_radius_bottom_left = 8
    sb.corner_radius_bottom_right = 8
    sb.content_margin_left = 12
    sb.content_margin_right = 12
    sb.content_margin_top = 12
    sb.content_margin_bottom = 12
    return sb
