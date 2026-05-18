extends CanvasLayer
## Forge interlude — opens at the start of each Crucible (every 5 waves
## as a substitute for the full CrucibleManager). Shows the upcoming
## Crucible name, the active Anomaly, and offers three actions:
##
##   1. Pick an Augment      — opens the existing sigil offer modal
##   2. Forge an Evolution   — lists VS-style item evolutions
##   3. Continue             — close the Forge and resume waves
##
## Pauses the game while open.

@onready var title_lbl: Label = $Center/Box/Inner/TitleLbl
@onready var anomaly_lbl: Label = $Center/Box/Inner/AnomalyLbl
@onready var actions_box: VBoxContainer = $Center/Box/Inner/ActionsBox
@onready var augment_btn: Button = $Center/Box/Inner/ActionsBox/AugmentBtn
@onready var continue_btn: Button = $Center/Box/Inner/ActionsBox/ContinueBtn
@onready var evolutions_box: VBoxContainer = $Center/Box/Inner/EvolutionsBox

var player: Node = null
var sigil_offer: CanvasLayer = null   # injected by main.gd

func _ready() -> void:
    visible = false
    process_mode = Node.PROCESS_MODE_ALWAYS
    augment_btn.pressed.connect(_on_augment_pressed)
    continue_btn.pressed.connect(close)

func open(p: Node, crucible_index: int, anomaly: Resource, offer: CanvasLayer) -> void:
    player = p
    sigil_offer = offer
    visible = true
    get_tree().paused = true
    title_lbl.text = "FORGE — Before Crucible %d" % crucible_index
    if anomaly != null:
        anomaly_lbl.text = "Active Anomaly: %s\n%s" % [
            String(anomaly.display_name), String(anomaly.description),
        ]
        anomaly_lbl.add_theme_color_override("font_color", anomaly.color)
    else:
        anomaly_lbl.text = "—"
    _build_evolutions()

func close() -> void:
    visible = false
    get_tree().paused = false

func _on_augment_pressed() -> void:
    if sigil_offer == null or not sigil_offer.has_method("show_for"):
        return
    # Hide the Forge while the player picks; reopen after.
    visible = false
    sigil_offer.show_for(player)
    # The sigil_offer pauses the tree itself; when it closes, the tree
    # is unpaused. Re-show the Forge by re-pausing here on next visible.
    await sigil_offer.visibility_changed
    if sigil_offer.visible == false:
        visible = true
        get_tree().paused = true

func _build_evolutions() -> void:
    for c in evolutions_box.get_children():
        c.queue_free()
    var sm: Node = get_tree().root.get_node_or_null("SigilManager")
    var inv: Node = get_tree().root.get_node_or_null("Inventory")
    var er: Node = get_tree().root.get_node_or_null("EvolutionRegistry")
    if sm == null or inv == null or er == null:
        return
    var avail: Array = er.available_for(sm.owned, inv.slots)
    if avail.is_empty():
        var none := Label.new()
        none.text = "(no evolutions available yet)"
        none.add_theme_color_override("font_color", Color(0.7, 0.7, 0.7))
        none.add_theme_font_size_override("font_size", 13)
        evolutions_box.add_child(none)
        return
    var hdr := Label.new()
    hdr.text = "Forgable Evolutions"
    hdr.add_theme_color_override("font_color", Color(1, 0.83, 0.27, 1))
    hdr.add_theme_font_size_override("font_size", 14)
    evolutions_box.add_child(hdr)
    for entry in avail:
        var r: Dictionary = entry["recipe"]
        var btn := Button.new()
        btn.text = "Forge: %s" % String(r["evolved"]["name"])
        btn.add_theme_font_size_override("font_size", 14)
        btn.pressed.connect(_on_evolution_pressed.bind(entry))
        evolutions_box.add_child(btn)

func _on_evolution_pressed(entry: Dictionary) -> void:
    var inv: Node = get_tree().root.get_node_or_null("Inventory")
    var er: Node = get_tree().root.get_node_or_null("EvolutionRegistry")
    if inv == null or er == null: return
    if er.apply(entry["recipe"], int(entry["slot_index"]), inv):
        _build_evolutions()
