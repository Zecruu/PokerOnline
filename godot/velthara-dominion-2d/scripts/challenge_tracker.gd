extends Node
## Autoload — tracks daily challenge progress. Challenges are deterministic
## per day-of-year via daily_seed. Tracks survive-to-wave / kill-count / etc.
##
## Autoload-to-autoload references go through `_save()` lookup helper because
## the GDScript parser doesn't see other autoload globals while parsing this
## script.

const CHALLENGE_TEMPLATES: Array = [
    {"id":"survive30","name":"Survive to Wave 30","metric":"wave","target":30,"reward":150},
    {"id":"kills1000","name":"1000 Kills in a run","metric":"kills","target":1000,"reward":150},
    {"id":"level20","name":"Reach Level 20","metric":"level","target":20,"reward":100},
    {"id":"pyre100","name":"Stack 100 Pyre Fuel","metric":"pyre","target":100,"reward":100},
    {"id":"survive15","name":"Survive to Wave 15","metric":"wave","target":15,"reward":75},
    {"id":"kills500","name":"500 Kills in a run","metric":"kills","target":500,"reward":75},
]

var active: Array = []  # subset of templates, 3 per day
var run_max: Dictionary = {"wave": 0, "kills": 0, "level": 1, "pyre": 0}

signal progress_changed()
signal challenge_completed(name: String, reward: int)

func _save() -> Node:
    return get_tree().root.get_node_or_null("SaveSystem")

func _ready() -> void:
    _refresh_daily()

func _refresh_daily() -> void:
    var today: int = _day_seed()
    var s: Node = _save()
    if s != null and int(s.daily_seed) == today:
        # Same day — keep prior progress, just re-pick same 3.
        seed(today)
        active = _pick_three()
        return
    seed(today)
    active = _pick_three()
    if s != null:
        s.daily_seed = today
        s.daily_progress = {}
        s.save_now()

func _day_seed() -> int:
    var d: Dictionary = Time.get_date_dict_from_system()
    return int(d["year"]) * 1000 + int(d["month"]) * 50 + int(d["day"])

func _pick_three() -> Array:
    var copy: Array = CHALLENGE_TEMPLATES.duplicate()
    copy.shuffle()
    return copy.slice(0, 3)

func reset_run() -> void:
    run_max = {"wave": 0, "kills": 0, "level": 1, "pyre": 0}

func report(metric: String, value: int) -> void:
    if not run_max.has(metric): return
    if value <= int(run_max[metric]): return
    run_max[metric] = value
    var s: Node = _save()
    for c in active:
        if c["metric"] != metric: continue
        if s != null and bool(s.daily_progress.get(c["id"], false)):
            continue
        if value >= int(c["target"]):
            if s != null:
                s.daily_progress[c["id"]] = true
                s.add_souls(int(c["reward"]))
            challenge_completed.emit(c["name"], int(c["reward"]))
    progress_changed.emit()

func is_completed(id: String) -> bool:
    var s: Node = _save()
    if s == null: return false
    return bool(s.daily_progress.get(id, false))
