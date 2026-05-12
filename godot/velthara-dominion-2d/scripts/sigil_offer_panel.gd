extends CanvasLayer
## Modal shown on level-up. Pauses gameplay, presents 3 sigil offers,
## resumes when one is chosen.

@onready var card_a: Button = $Center/Cards/CardA
@onready var card_b: Button = $Center/Cards/CardB
@onready var card_c: Button = $Center/Cards/CardC

var player: Node = null
var offers: Array = []  # of Sigil resources

func _ready() -> void:
    visible = false
    process_mode = Node.PROCESS_MODE_ALWAYS  # function while tree is paused
    card_a.pressed.connect(_on_card_pressed.bind(0))
    card_b.pressed.connect(_on_card_pressed.bind(1))
    card_c.pressed.connect(_on_card_pressed.bind(2))

func show_for(p: Node) -> void:
    player = p
    offers = SigilManager.roll_offers(3)
    if offers.size() < 3:
        # Fallback: silently skip if pool ran out (shouldn't happen).
        return
    _format_card(card_a, offers[0])
    _format_card(card_b, offers[1])
    _format_card(card_c, offers[2])
    visible = true
    get_tree().paused = true

func _format_card(btn: Button, s: Resource) -> void:
    btn.text = "%s\n[%s]\n%s" % [s.display_name, s.rarity_name(), s.description]
    btn.add_theme_color_override("font_color", s.rarity_color())
    btn.add_theme_font_size_override("font_size", 16)

func _on_card_pressed(idx: int) -> void:
    if idx < 0 or idx >= offers.size(): return
    SigilManager.acquire(offers[idx], player)
    visible = false
    get_tree().paused = false
