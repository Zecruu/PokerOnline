extends Node
## Mirrors games/graveborn/enemies.js — keep tables in sync.

const WAVE_SECS := 20.0
const HP_GROWTH := 1.16
const DMG_GROWTH := 1.11
const SPD_GROWTH := 1.028
const SPD_CAP := 1.6
const FIRST_BOSS := 60.0
const BOSS_EVERY := 75.0

const TYPES := {
	"husk": {"id": "husk", "role": "chase", "hp": 26.0, "spd": 56.0, "dmg": 8.0, "r": 14.0, "xp": 4, "scale": 1.22, "unlock": 0.0, "pack": 1, "weight": 70.0},
	"mite": {"id": "mite", "role": "swarm", "hp": 9.0, "spd": 92.0, "dmg": 5.0, "r": 9.0, "xp": 2, "scale": 0.72, "unlock": 0.0, "pack": 4, "weight": 48.0},
	"runner": {"id": "runner", "role": "chase", "hp": 18.0, "spd": 120.0, "dmg": 7.0, "r": 12.0, "xp": 5, "scale": 1.12, "unlock": 20.0, "pack": 2, "weight": 30.0},
	"spit": {"id": "spit", "role": "ranged", "hp": 24.0, "spd": 44.0, "dmg": 10.0, "r": 13.0, "xp": 6, "scale": 1.18, "unlock": 30.0, "pack": 1, "weight": 22.0},
	"exploder": {"id": "exploder", "role": "suicide", "hp": 20.0, "spd": 98.0, "dmg": 24.0, "r": 13.0, "xp": 7, "scale": 1.18, "unlock": 45.0, "pack": 1, "weight": 16.0},
	"brute": {"id": "brute", "role": "chase", "hp": 100.0, "spd": 40.0, "dmg": 17.0, "r": 20.0, "xp": 14, "scale": 1.7, "unlock": 40.0, "pack": 1, "weight": 14.0},
	"wraith": {"id": "wraith", "role": "phase", "hp": 30.0, "spd": 84.0, "dmg": 12.0, "r": 13.0, "xp": 9, "scale": 1.28, "unlock": 70.0, "pack": 1, "weight": 12.0},
	"shaman": {"id": "shaman", "role": "support", "hp": 38.0, "spd": 38.0, "dmg": 8.0, "r": 14.0, "xp": 12, "scale": 1.3, "unlock": 80.0, "pack": 1, "weight": 8.0},
}

const BOSSES := [
	{"id": "titan", "name": "GRAVE TITAN", "role": "boss_slam", "hp": 560.0, "spd": 34.0, "dmg": 24.0, "r": 28.0, "xp": 90, "scale": 2.55},
	{"id": "sovereign", "name": "BONE SOVEREIGN", "role": "boss_summon", "hp": 480.0, "spd": 40.0, "dmg": 16.0, "r": 26.0, "xp": 80, "scale": 2.35},
	{"id": "duchess", "name": "HOWLING DUCHESS", "role": "boss_dash", "hp": 400.0, "spd": 96.0, "dmg": 18.0, "r": 22.0, "xp": 85, "scale": 2.2},
	{"id": "bishop", "name": "PLAGUE BISHOP", "role": "boss_mage", "hp": 430.0, "spd": 36.0, "dmg": 14.0, "r": 24.0, "xp": 88, "scale": 2.3},
]

func wave_from_time(t: float) -> int:
	return 1 + int(max(0.0, t) / WAVE_SECS)

func scale_stat(base: float, rate: float, wave: int, cap: float = -1.0) -> float:
	var v := base * pow(rate, max(0, wave - 1))
	if cap > 0.0:
		return min(cap, v)
	return v

func scaled(def: Dictionary, wave: int, cycle: int = 0) -> Dictionary:
	var hp_mul := pow(1.22, cycle)
	return {
		"hp": scale_stat(def.hp, HP_GROWTH, wave) * hp_mul,
		"spd": scale_stat(def.spd, SPD_GROWTH, wave, def.spd * SPD_CAP),
		"dmg": scale_stat(def.dmg, DMG_GROWTH, wave) * pow(1.1, cycle),
	}

func spawn_interval(wave: int) -> float:
	return maxf(0.11, 0.7 - float(wave) * 0.034)

func pack_bonus(wave: int) -> int:
	return mini(4, int(wave / 3.0))

func live_cap(wave: int) -> int:
	return mini(180, 48 + wave * 14)

func elite_chance(wave: int) -> float:
	if wave < 3:
		return 0.0
	return minf(0.22, 0.06 + float(wave - 3) * 0.015)

func pick_type(time_s: float) -> Dictionary:
	var unlocked: Array[Dictionary] = []
	var total := 0.0
	for id in TYPES.keys():
		var def: Dictionary = TYPES[id]
		if time_s < def.unlock:
			continue
		unlocked.append(def)
		total += def.weight
	var r := randf() * total
	for def in unlocked:
		r -= def.weight
		if r <= 0.0:
			return def
	return TYPES["husk"]

func boss_index(time_s: float) -> int:
	if time_s < FIRST_BOSS:
		return -1
	return int((time_s - FIRST_BOSS) / BOSS_EVERY)

func boss_for_index(index: int) -> Dictionary:
	if index < 0:
		return {}
	var def: Dictionary = BOSSES[index % BOSSES.size()]
	var cycle := int(index / float(BOSSES.size()))
	return {"def": def, "cycle": cycle, "wave": wave_from_time(FIRST_BOSS + index * BOSS_EVERY)}

func next_boss_at(time_s: float) -> float:
	if time_s < FIRST_BOSS:
		return FIRST_BOSS
	return FIRST_BOSS + float(boss_index(time_s) + 1) * BOSS_EVERY
