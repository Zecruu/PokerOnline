extends Node
## Autoload — snapshots the enemy group once per physics frame and exposes
## fast neighbor queries. Replaces a half-dozen `get_tree().get_nodes_in_group`
## calls per frame (player auto-attack, slash damage, abilities, events) with
## a single Array iteration.
##
## Usage:
##   for e in EnemyRegistry.alive():            # cached array
##   var nearest := EnemyRegistry.nearest_to(p) # squared-distance scan

var _cache: Array = []
var _cache_frame: int = -1

func _ready() -> void:
    # Run after most physics updates but before regular _process consumers.
    process_priority = -100

func _physics_process(_dt: float) -> void:
    _refresh()

func _refresh() -> void:
    _cache = get_tree().get_nodes_in_group("enemies")
    _cache_frame = Engine.get_physics_frames()

func alive() -> Array:
    # If a query lands mid-frame before _physics_process ran, refresh on demand.
    if _cache_frame != Engine.get_physics_frames():
        _refresh()
    return _cache

func nearest_to(p: Vector2, max_range: float = INF) -> Node2D:
    var best: Node2D = null
    var best_d_sq: float = max_range * max_range
    for e in alive():
        if e == null or not (e is Node2D): continue
        var d_sq: float = (e.global_position - p).length_squared()
        if d_sq < best_d_sq:
            best = e
            best_d_sq = d_sq
    return best

func count() -> int:
    return alive().size()
