extends CanvasLayer
## Megabonk-style stat-pick modal — opens on every level-up BEFORE the augment
## offer panel. Three cards, pure stat boosts, infinite stacking. Pauses the
## tree while open; on pick, chains to the augment offer panel so the player
## still sees their augment choice on each level-up.

@onready var cards_box: HBoxContainer = $Center/Cards
@onready var title_lbl: Label = $Center/Title
@onready var subtitle_lbl: Label = $Center/Subtitle

var card_buttons: Array[Button] = []
var player: Node = null
var offers: Array = []
var next_panel: Node = null  # the augment SigilOfferPanel to open after picking

func _ready() -> void:
    visible = false
    process_mode = Node.PROCESS_MODE_ALWAYS
    card_buttons = []
    for child in cards_box.get_children():
        if child is Button:
            card_buttons.append(child)
    for i in range(card_buttons.size()):
        card_buttons[i].pressed.connect(_on_card_pressed.bind(i))

func show_for(p: Node, chain_next: Node = null) -> void:
    player = p
    next_panel = chain_next
    var spm: Node = get_tree().root.get_node_or_null("StatPickManager")
    if spm == null:
        # No stat-pick autoload — skip straight to the augment offer.
        _chain_to_next()
        return
    offers = spm.roll_offers(card_buttons.size())
    if offers.is_empty():
        _chain_to_next()
        return
    if title_lbl != null:
        title_lbl.text = "CHOOSE A STAT"
    if subtitle_lbl != null:
        subtitle_lbl.text = "Picks taken this run: %d" % int(spm.picks_taken)
    for i in range(card_buttons.size()):
        var btn: Button = card_buttons[i]
        if i < offers.size():
            _format_card(btn, offers[i])
            btn.visible = true
            btn.disabled = false
        else:
            btn.visible = false
    visible = true
    get_tree().paused = true

func _format_card(btn: Button, pick: Dictionary) -> void:
    btn.text = "%s\n%s" % [String(pick.get("name", "?")), String(pick.get("desc", ""))]
    var color: Color = pick.get("color", Color(0.9, 0.9, 0.9))
    btn.add_theme_color_override("font_color", color)
    btn.add_theme_font_size_override("font_size", 18)

func _on_card_pressed(idx: int) -> void:
    if idx < 0 or idx >= offers.size(): return
    var spm: Node = get_tree().root.get_node_or_null("StatPickManager")
    if spm != null:
        spm.acquire(offers[idx], player)
    visible = false
    get_tree().paused = false
    _chain_to_next()

func _chain_to_next() -> void:
    if next_panel != null and next_panel.has_method("show_for") and player != null:
        next_panel.show_for(player)
