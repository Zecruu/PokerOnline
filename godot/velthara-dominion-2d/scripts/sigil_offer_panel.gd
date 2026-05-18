extends CanvasLayer
## Augment offer modal — shown on level-up. Pauses gameplay, presents 3
## random augments (4 with the Sigil Stack tag), resumes when one is chosen.

@onready var cards_box: HBoxContainer = $Center/Cards
@onready var title_lbl: Label = $Center/Title

var card_buttons: Array[Button] = []
var player: Node = null
var offers: Array = []  # of Sigil resources

func _ready() -> void:
    visible = false
    process_mode = Node.PROCESS_MODE_ALWAYS  # function while tree is paused
    card_buttons = []
    for child in cards_box.get_children():
        if child is Button:
            card_buttons.append(child)
    for i in range(card_buttons.size()):
        card_buttons[i].pressed.connect(_on_card_pressed.bind(i))

func show_for(p: Node) -> void:
    player = p
    var sm: Node = get_tree().root.get_node_or_null("SigilManager")
    if sm == null: return
    var count: int = 3
    var apex: bool = false
    if p != null and p.has_method("has_tag"):
        if p.has_tag("extra_offer"):
            count = 4
        if p.has_tag("apex_augments"):
            apex = true
    offers = sm.roll_offers(count, apex)
    if offers.is_empty():
        return
    if title_lbl != null:
        title_lbl.text = "CHOOSE AN AUGMENT"
    # Hide any spare buttons we don't have offers for.
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

func _format_card(btn: Button, s: Resource) -> void:
    btn.text = "%s\n[%s]\n%s" % [s.display_name, s.rarity_name(), s.description]
    btn.add_theme_color_override("font_color", s.rarity_color())
    btn.add_theme_font_size_override("font_size", 16)

func _on_card_pressed(idx: int) -> void:
    if idx < 0 or idx >= offers.size(): return
    var sm: Node = get_tree().root.get_node_or_null("SigilManager")
    if sm != null:
        sm.acquire(offers[idx], player)
    visible = false
    get_tree().paused = false
