extends Node
## League Arena / ARAM-style augment pool. Same cards as games/graveborn/cards.js.

const RARITY_WEIGHT := {"silver": 50, "gold": 35, "prismatic": 15}
const CLASS_BIAS := {"silver": 0.15, "gold": 0.75, "prismatic": 1.0}

const CARDS: Array[Dictionary] = [
	{"id":"swift_feet","name":"Swift Feet","icon":"👟","rarity":"silver","class_id":"generic",
	 "desc":"+12% move speed.","flavor":"The grave is patient. You are not."},
	{"id":"vitality","name":"Vitality","icon":"❤️","rarity":"silver","class_id":"generic",
	 "desc":"+25 max HP and heal 25.","flavor":"Bone and blood remember."},
	{"id":"keen_eye","name":"Keen Eye","icon":"🎯","rarity":"silver","class_id":"generic",
	 "desc":"+8% crit chance.","flavor":"Find the crack in every skull."},
	{"id":"long_grasp","name":"Long Grasp","icon":"🧲","rarity":"silver","class_id":"generic",
	 "desc":"+30% gem pickup radius.","flavor":"Souls come when called."},
	{"id":"quick_hands","name":"Quick Hands","icon":"⚡","rarity":"silver","class_id":"generic",
	 "desc":"+12% auto-attack speed.","flavor":"The next bolt is already nocked."},
	{"id":"heavy_bolt","name":"Heavy Bolt","icon":"💀","rarity":"silver","class_id":"generic",
	 "desc":"+18% bone-bolt damage.","flavor":"A heavier curse, a cleaner kill."},
	{"id":"aegis","name":"Grave Aegis","icon":"🛡️","rarity":"silver","class_id":"generic",
	 "desc":"+8% damage reduction.","flavor":"Dirt is armor if you trust it."},
	{"id":"deathless_thrall","name":"Deathless Thrall","icon":"🦴","rarity":"gold","class_id":"necromancer",
	 "desc":"+2 max skeletons.","flavor":"There is always room in the procession."},
	{"id":"grave_rush","name":"Grave Rush","icon":"⏳","rarity":"gold","class_id":"necromancer",
	 "desc":"Auto-raise 30% faster.","flavor":"The dirt barely has time to settle."},
	{"id":"bone_legion","name":"Bone Legion","icon":"⚔️","rarity":"gold","class_id":"necromancer",
	 "desc":"Minions deal +30% damage.","flavor":"Each rib a blade."},
	{"id":"soul_link","name":"Soul Link","icon":"💚","rarity":"gold","class_id":"necromancer",
	 "desc":"12% of minion damage heals you.","flavor":"They eat. You live."},
	{"id":"occult_reach","name":"Occult Reach","icon":"🌀","rarity":"gold","class_id":"necromancer",
	 "desc":"+70 bone-bolt range.","flavor":"Death has a long arm."},
	{"id":"risen_plate","name":"Risen Plate","icon":"🪖","rarity":"gold","class_id":"necromancer",
	 "desc":"Each living minion grants +4% DR (max 24%).","flavor":"Stand behind your dead."},
	{"id":"plague_bolt","name":"Plague Bolt","icon":"☠️","rarity":"gold","class_id":"necromancer",
	 "desc":"Bolts poison enemies (18% bolt dmg / sec, 3s).","flavor":"The wound keeps working."},
	{"id":"twin_raise","name":"Twin Raise","icon":"👯","rarity":"gold","class_id":"necromancer",
	 "desc":"Each auto-raise pulse takes 2 corpses.","flavor":"Two graves, one word."},
	{"id":"grave_magnet","name":"Grave Magnet","icon":"📡","rarity":"gold","class_id":"necromancer",
	 "desc":"Corpses last +5s. Raise range +90.","flavor":"Nothing stays buried for long."},
	{"id":"wither_aura","name":"Withering Aura","icon":"🌑","rarity":"gold","class_id":"necromancer",
	 "desc":"Nearby enemies take 8 damage/sec.","flavor":"The air around you is a tomb."},
	{"id":"army_of_bone","name":"Army of Bone","icon":"👑","rarity":"prismatic","class_id":"necromancer",
	 "desc":"+4 max minions. Every kill auto-raises if a corpse is in range.","flavor":"You are no longer a mage. You are a census."},
	{"id":"lich_bond","name":"Lich Bond","icon":"🔮","rarity":"prismatic","class_id":"necromancer",
	 "desc":"Your bolts deal −35% damage. Minions gain +50% damage and +40% attack speed.","flavor":"Give the body. Keep the will."},
	{"id":"death_nova","name":"Death Nova","icon":"💥","rarity":"prismatic","class_id":"necromancer",
	 "desc":"When a minion dies, explode for 90 damage in 80px.","flavor":"Even their second death serves you."},
	{"id":"corpse_explosion","name":"Corpse Explosion","icon":"💣","rarity":"prismatic","class_id":"necromancer",
	 "desc":"Overflow raises (army full) detonate the corpse for 220% bolt damage.","flavor":"If they cannot serve, they can scatter."},
	{"id":"soul_harvest","name":"Soul Harvest","icon":"🌾","rarity":"prismatic","class_id":"necromancer",
	 "desc":"Each kill +2% minion & bolt damage (max 40 stacks).","flavor":"A field of last breaths."},
]

func rarity_label(r: String) -> String:
	return r.to_upper()

func apply(card: Dictionary, p: Dictionary) -> void:
	match String(card.get("id", "")):
		"swift_feet": p.move_mult *= 1.12
		"vitality":
			p.max_hp += 25.0
			p.hp = min(p.max_hp, p.hp + 25.0)
		"keen_eye": p.crit += 0.08
		"long_grasp": p.magnet_mult *= 1.3
		"quick_hands": p.atk_speed_mult *= 1.12
		"heavy_bolt": p.atk_dmg_mult *= 1.18
		"aegis": p.dr = min(0.6, p.dr + 0.08)
		"deathless_thrall": p.max_minions += 2
		"grave_rush": p.raise_interval *= 0.7
		"bone_legion": p.minion_dmg_mult *= 1.3
		"soul_link": p.minion_lifesteal += 0.12
		"occult_reach": p.atk_range += 70.0
		"risen_plate": p.dr_per_minion += 0.04
		"plague_bolt": p.poison_bolts = true
		"twin_raise": p.raise_count += 1
		"grave_magnet":
			p.corpse_life += 5.0
			p.raise_range += 90.0
		"wither_aura":
			p.aura_dps += 8.0
			p.aura_radius = max(p.aura_radius, 110.0)
		"army_of_bone":
			p.max_minions += 4
			p.raise_on_kill = true
		"lich_bond":
			p.atk_dmg_mult *= 0.65
			p.minion_dmg_mult *= 1.5
			p.minion_atk_speed_mult *= 1.4
		"death_nova": p.death_nova = true
		"corpse_explosion":
			p.corpse_explode = true
			p.explode_mult = 2.2
		"soul_harvest": p.soul_harvest = true

func roll_offers(count: int) -> Array[Dictionary]:
	var taken: Dictionary = {}
	var offers: Array[Dictionary] = []
	var class_ok := false
	for i in range(count):
		var rarity := _weighted_rarity()
		var want_class := randf() < float(CLASS_BIAS[rarity]) or (not class_ok and i == count - 1)
		var pool: Array[Dictionary] = []
		for c in CARDS:
			if taken.has(c.id): continue
			if String(c.rarity) != rarity: continue
			if want_class and String(c.class_id) != "necromancer" and rarity != "silver":
				continue
			pool.append(c)
		var card: Dictionary = {}
		if pool.is_empty():
			for c in CARDS:
				if not taken.has(c.id):
					pool.append(c)
		if pool.is_empty():
			break
		card = pool[randi() % pool.size()]
		taken[card.id] = true
		offers.append(card)
		if String(card.class_id) == "necromancer":
			class_ok = true
	return offers

func _weighted_rarity() -> String:
	var roll := randf() * 100.0
	if roll < float(RARITY_WEIGHT.prismatic):
		return "prismatic"
	if roll < float(RARITY_WEIGHT.prismatic) + float(RARITY_WEIGHT.gold):
		return "gold"
	return "silver"
