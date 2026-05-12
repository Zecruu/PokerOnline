extends Node
## Autoload — submits run scores to the existing Express/Mongo backend at
## /api/velthara/scores. Reads the player's display name from save settings
## or asks once on first run.
##
## The endpoint matches the JS client expectation: POST JSON with
## { name, kills, wave, level }. We don't block gameplay if it fails.

const SCORE_URL := "https://games.zecrugames.com/api/velthara/scores"
const LIST_URL := "https://games.zecrugames.com/api/velthara/scores?limit=20"
const TIMEOUT_SEC := 4.0

var http: HTTPRequest
var player_name: String = ""

signal scores_fetched(rows: Array)

func _ready() -> void:
    http = HTTPRequest.new()
    http.timeout = TIMEOUT_SEC
    add_child(http)
    var s: Node = get_tree().root.get_node_or_null("SaveSystem")
    if s != null and "player_name" in s:
        player_name = str(s.get("player_name"))
    if player_name == "":
        player_name = "Sovereign"

func submit_score(kills: int, wave: int, level: int) -> void:
    var body := {
        "name": player_name, "kills": kills,
        "wave": wave, "level": level,
    }
    var json := JSON.stringify(body)
    var headers: PackedStringArray = ["Content-Type: application/json"]
    var err := http.request(SCORE_URL, headers, HTTPClient.METHOD_POST, json)
    if err != OK:
        push_warning("Leaderboard submit failed: %d" % err)

func fetch_top() -> void:
    var fetch := HTTPRequest.new()
    fetch.timeout = TIMEOUT_SEC
    add_child(fetch)
    fetch.request_completed.connect(_on_fetch_done.bind(fetch))
    var err := fetch.request(LIST_URL)
    if err != OK:
        scores_fetched.emit([])

func _on_fetch_done(_result: int, code: int, _headers: PackedStringArray, body: PackedByteArray, fetch: HTTPRequest) -> void:
    fetch.queue_free()
    if code < 200 or code >= 300:
        scores_fetched.emit([])
        return
    var parsed = JSON.parse_string(body.get_string_from_utf8())
    if parsed is Array:
        scores_fetched.emit(parsed)
    elif parsed is Dictionary and parsed.has("scores"):
        scores_fetched.emit(parsed["scores"])
    else:
        scores_fetched.emit([])
