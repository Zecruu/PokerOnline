extends Resource
## Anomaly — a chaotic per-Crucible rule modifier. Inspired by LoL Arena
## Mayhem's anomalies. One is active at a time; activating a new anomaly
## reverts the previous one's effects cleanly.
##
## Stat fields are multiplicative factors applied on top of the player's
## permanent augment-derived multipliers. Tags drive special behaviors
## (vision halved, one-shot dies, slow-immunity, etc.) checked in player
## and enemy hot paths.

@export var id: String = ""
@export var display_name: String = ""
@export var description: String = ""
@export var color: Color = Color(1.0, 0.4, 0.4)

# Multiplicative stat factors (1.0 = no change).
@export var damage_mult_factor: float = 1.0
@export var ability_power_factor: float = 1.0     # multiplied into current_ability_power
@export var attack_damage_factor: float = 1.0     # multiplied into current_attack_damage
@export var fire_rate_mult_factor: float = 1.0
@export var move_speed_mult_factor: float = 1.0
@export var max_hp_factor: float = 1.0
@export var burn_damage_mult: float = 1.0
@export var xp_mult: float = 1.0

# Additive fields.
@export var crit_chance_add: float = 0.0
@export var lifesteal_add: float = 0.0
@export var pyre_per_kill_bonus: int = 0

# Tags drive special behaviors. See player.gd / enemy.gd hooks.
@export var tags: Array[String] = []
