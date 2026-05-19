extends Node
## Autoload — Augment registry. Owns the full augment pool, the player's
## acquired list this run, weighted offer rolls on level-up, and applying
## augment effects (stat sums + behavior tags) to the player.
##
## Design inspired by LoL Arena (Silver/Gold/Prismatic/Hex tiers). Lower
## tiers are pure stat bumps; higher tiers carry tags that hook into
## player/enemy code at specific events.

const SIGIL_SCRIPT := preload("res://scripts/sigil.gd")

# ── Augment pool ──
# Each row is a dictionary of Sigil fields. Tag strings drive behavior
# triggers in player.gd / enemy.gd — see those files for hook points.
const SIGIL_POOL: Array[Dictionary] = [
    # ── SILVER (60% weight) — pure stats ──
    {"id":"ember",   "name":"Ember Sigil",   "desc":"+8% damage",         "rarity":0, "damage_mult_add":0.08},
    {"id":"fleet",   "name":"Fleet Sigil",   "desc":"+6% move speed",     "rarity":0, "move_speed_mult_add":0.06},
    {"id":"draw",    "name":"Soul Draw",     "desc":"+15% pickup radius", "rarity":0, "pickup_radius_mult_add":0.15},
    {"id":"vigor",   "name":"Vigor Sigil",   "desc":"+20 max HP",         "rarity":0, "max_hp_bonus":20.0},
    {"id":"sharp",   "name":"Sharp Edge",    "desc":"+5% crit chance",    "rarity":0, "crit_chance_add":0.05},
    {"id":"vampbit", "name":"Vampiric Bite", "desc":"+5% lifesteal",      "rarity":0, "lifesteal_add":0.05},
    {"id":"cdcoil",  "name":"Cooldown Coil", "desc":"-8% ability cooldowns","rarity":0, "cdr_add":0.08},
    {"id":"warvow",  "name":"Warrior's Vow", "desc":"+15 Attack Damage (autos)", "rarity":0, "attack_power_add":15.0},
    {"id":"acovow",  "name":"Acolyte's Vow", "desc":"+10% Ability Power (Q/E)",  "rarity":0, "spell_power_add":0.10},
    # ARAM-style Silvers
    {"id":"quickdrw","name":"Quickdraw",     "desc":"Attacks after a 1.5s pause crit guaranteed", "rarity":0, "tags":["quickdraw"]},
    {"id":"earthwke","name":"Earthwake",     "desc":"Your auto-attacks shake the ground in a 90px aura", "rarity":0, "tags":["earthwake"]},

    # ── GOLD (28% weight) — stats + hooks ──
    {"id":"hex",     "name":"Hex Sigil",     "desc":"+7% fire rate",      "rarity":1, "fire_rate_mult_add":0.07},
    {"id":"crown",   "name":"Crown of Embers","desc":"+15% damage",       "rarity":1, "damage_mult_add":0.15},
    {"id":"combo",   "name":"Combo Killer",  "desc":"Every 3rd attack deals +200% damage", "rarity":1, "tags":["combo_killer"]},
    {"id":"deathmrk","name":"Death Mark",    "desc":"Hit enemies take +25% damage for 4s", "rarity":1, "tags":["death_mark"]},
    {"id":"bloodbnd","name":"Bloodbond",     "desc":"Heal 4 HP per kill", "rarity":1, "tags":["bloodbond"]},
    {"id":"critcasc","name":"Crit Cascade",  "desc":"Crits cut 0.5s off Q/E cooldowns",    "rarity":1, "tags":["crit_cascade"]},
    {"id":"frostbit","name":"Frostbite Glyph","desc":"Your hits slow enemies 30% for 1s",   "rarity":1, "tags":["frostbite"]},
    {"id":"magnumop","name":"Magnum Opus",   "desc":"+30 Attack Damage (autos)","rarity":1, "attack_power_add":30.0},
    {"id":"cosmiscr","name":"Cosmic Scroll", "desc":"+25% Ability Power (Q/E)","rarity":1, "spell_power_add":0.25},
    # ARAM-style Golds
    {"id":"hellbore","name":"Hellbore",      "desc":"Every 10 auto-attacks heal 5% max HP", "rarity":1, "tags":["hellbore"]},
    {"id":"lightns", "name":"Lightning Strikes","desc":"Every 5th attack chains to 2 nearby enemies", "rarity":1, "tags":["lightning_strikes"]},
    {"id":"twinmand","name":"Twin Mandibles","desc":"Auto-attacks slow enemies 50% for 0.8s", "rarity":1, "tags":["twin_mandibles"]},

    # ── PRISMATIC (10% weight) — build-changing ──
    {"id":"phoenix", "name":"Phoenix Pact",  "desc":"+25 max HP, heal to full", "rarity":2, "max_hp_bonus":25.0, "heal_on_pickup":9999.0},
    {"id":"swift",   "name":"Swift Ascent",  "desc":"+12% move, +10% fire rate","rarity":2, "move_speed_mult_add":0.12, "fire_rate_mult_add":0.10},
    {"id":"inferno", "name":"Inferno Mark",  "desc":"+25% damage",              "rarity":2, "damage_mult_add":0.25},
    {"id":"burnaeg", "name":"Burning Aegis", "desc":"Attackers burn for 5s",    "rarity":2, "tags":["burning_aegis"]},
    {"id":"sigilstk","name":"Sigil Stack",   "desc":"Offer 4 augments on level-up", "rarity":2, "tags":["extra_offer"]},
    {"id":"qecho",   "name":"Inferno Echo",  "desc":"Q ability fires twice",    "rarity":2, "tags":["q_echo"]},
    {"id":"berserk", "name":"Berserker's Pact","desc":"-30% max HP, +50% damage and fire rate", "rarity":2, "max_hp_bonus":-30.0, "damage_mult_add":0.50, "fire_rate_mult_add":0.50, "tags":["berserker"]},
    {"id":"heavyht", "name":"Heavy Hitter",  "desc":"Crits do 3× instead of 2×","rarity":2, "tags":["heavy_hitter"]},
    {"id":"stackrex","name":"Stackasaurus Rex","desc":"Pyre Fuel gains 2 stacks per kill", "rarity":2, "tags":["stackasaurus"]},
    {"id":"jewelgnt","name":"Jeweled Gauntlet","desc":"Your abilities can critically strike",            "rarity":2, "tags":["jeweled_gauntlet"]},
    # ARAM-style Prismatics
    {"id":"blacksm", "name":"Blacksmith",    "desc":"All inventory item bonuses are doubled",          "rarity":2, "tags":["blacksmith"]},
    {"id":"triptonic","name":"Triple Tonic", "desc":"Grants 3 random power-ups instantly on acquire",  "rarity":2, "tags":["triple_tonic"]},

    # ── HEX (2% weight) — legendary game-changers ──
    {"id":"sovereign","name":"Sovereign Sigil","desc":"+30% damage, +15% fire rate","rarity":3, "damage_mult_add":0.30, "fire_rate_mult_add":0.15},
    {"id":"voidheart","name":"Voidheart",    "desc":"+60 max HP, +30% pickup",  "rarity":3, "max_hp_bonus":60.0, "pickup_radius_mult_add":0.30},
    {"id":"phxheart","name":"Phoenix Heart", "desc":"Revive once at 50% HP on death", "rarity":3, "tags":["phoenix_heart"]},
    {"id":"glasscan","name":"Glass Cannon",  "desc":"-50% max HP, +100% damage","rarity":3, "max_hp_bonus":-50.0, "damage_mult_add":1.00, "tags":["glass_cannon"]},
    {"id":"stardust","name":"Stardust Surge","desc":"Every 5 levels, auto-cast a free Inferno Volley", "rarity":3, "tags":["stardust_surge"]},
    {"id":"phenmevl","name":"Phenomenal Evil","desc":"Each kill grants +0.5% Ability Power (no cap)",   "rarity":3, "tags":["phenomenal_evil"]},
    # ARAM-style Hex
    {"id":"wraithw", "name":"Wraith Walk",   "desc":"Each kill grants 0.4s of dodging all hits",      "rarity":3, "tags":["wraith_walk"]},
    {"id":"symphony","name":"Symphony of War","desc":"+3% damage per owned augment",                  "rarity":3, "tags":["symphony"]},

    # ── CORRUPTED (1.2% weight) — extreme power, explicit downside ──
    {"id":"cullmeek","name":"Cull of the Meek",
     "desc":"+200% damage, but you have -50% max HP",
     "rarity":4, "damage_mult_add":2.0, "max_hp_bonus":-50.0},
    {"id":"cursedst","name":"Cursed Strength",
     "desc":"+100 Attack Damage, but you take 25% more damage",
     "rarity":4, "attack_power_add":100.0, "tags":["cursed_strength"]},
    {"id":"pactpain","name":"Pact of Pain",
     "desc":"+150 max HP, but each kill costs 4 HP",
     "rarity":4, "max_hp_bonus":150.0, "tags":["pact_of_pain"]},
    {"id":"darkpact","name":"Dark Pact",
     "desc":"+80% Ability Power, but abilities cost 8% max HP to cast",
     "rarity":4, "spell_power_add":0.80, "tags":["dark_pact"]},
    {"id":"abyssalw","name":"Abyssal Wager",
     "desc":"+30% crit chance and +75% damage, but no lifesteal or healing",
     "rarity":4, "crit_chance_add":0.30, "damage_mult_add":0.75, "tags":["no_healing"]},
    # ARAM-style Corrupted
    {"id":"apothes", "name":"Apotheosis",
     "desc":"+200% Ability Power, but you take 50% more damage from all sources",
     "rarity":4, "spell_power_add":2.0, "tags":["fragile_god"]},
    {"id":"eternalfm","name":"Eternal Flame",
     "desc":"Your burns never expire on enemies, but you lose 1 HP per second",
     "rarity":4, "tags":["eternal_flame"]},
]

var owned: Array = []         # this-run augments (Sigil resources)
var _all_sigils: Array = []   # full pool as Sigil resources

signal sigils_changed(owned: Array)

func _ready() -> void:
    for d in SIGIL_POOL:
        var s: Resource = SIGIL_SCRIPT.new()
        s.id = d.get("id", "")
        s.display_name = d.get("name", "")
        s.description = d.get("desc", "")
        s.rarity = d.get("rarity", 0)
        s.damage_mult_add = d.get("damage_mult_add", 0.0)
        s.fire_rate_mult_add = d.get("fire_rate_mult_add", 0.0)
        s.pickup_radius_mult_add = d.get("pickup_radius_mult_add", 0.0)
        s.move_speed_mult_add = d.get("move_speed_mult_add", 0.0)
        s.max_hp_bonus = d.get("max_hp_bonus", 0.0)
        s.heal_on_pickup = d.get("heal_on_pickup", 0.0)
        s.crit_chance_add = d.get("crit_chance_add", 0.0)
        s.lifesteal_add = d.get("lifesteal_add", 0.0)
        s.cdr_add = d.get("cdr_add", 0.0)
        s.attack_power_add = d.get("attack_power_add", 0.0)
        s.spell_power_add = d.get("spell_power_add", 0.0)
        var tag_array: Array[String] = []
        for t in d.get("tags", []):
            tag_array.append(String(t))
        s.tags = tag_array
        _all_sigils.append(s)

func reset_run() -> void:
    owned.clear()
    sigils_changed.emit(owned)

func roll_offers(count: int, apex_only: bool = false) -> Array:
    # apex_only restricts the offer pool to Prismatic + Hex tiers (rarity
    # >= 2). Used by the Apex Augments anomaly so the next offer is all
    # build-changing instead of stat fillers.
    var pool: Array = _all_sigils
    if apex_only:
        pool = []
        for s in _all_sigils:
            if int(s.rarity) >= 2:
                pool.append(s)
        if pool.is_empty():
            pool = _all_sigils
    var total_w: float = 0.0
    for s in pool:
        total_w += s.rarity_weight()
    var result: Array = []
    var attempts: int = 0
    while result.size() < count and attempts < 200:
        attempts += 1
        var pick: float = randf() * total_w
        var picked: Resource = null
        for s in pool:
            pick -= s.rarity_weight()
            if pick <= 0.0:
                picked = s
                break
        if picked == null:
            picked = pool[randi() % pool.size()]
        if not result.has(picked) and not owned.has(picked):
            result.append(picked)
    return result

func acquire(s: Resource, player: Node) -> void:
    owned.append(s)
    sigils_changed.emit(owned)
    _reapply_to_player(player)
    if s.heal_on_pickup > 0.0 and player != null:
        player.hp = min(player.current_max_hp(), player.hp + s.heal_on_pickup)
        if player.has_signal("hp_changed"):
            player.hp_changed.emit(player.hp, player.current_max_hp())
    # Triple Tonic — instantly grants 3 random power-ups on acquire.
    if player != null and "triple_tonic" in s.tags:
        var kinds := ["frenzy", "inferno", "wraith", "magnet", "heal", "soul"]
        for _i in range(3):
            if player.has_method("apply_powerup"):
                player.apply_powerup(kinds[randi() % kinds.size()])

func _reapply_to_player(player: Node) -> void:
    if player == null: return
    var dm: float = 1.0
    var fr: float = 1.0
    var pr: float = 1.0
    var ms: float = 1.0
    var hp_bonus: float = 0.0
    var crit_add: float = 0.0
    var life_add: float = 0.0
    var cdr: float = 0.0
    var ad_flat: float = 0.0
    var sp_add: float = 0.0
    var tags: Dictionary = {}
    for s in owned:
        dm += s.damage_mult_add
        fr += s.fire_rate_mult_add
        pr += s.pickup_radius_mult_add
        ms += s.move_speed_mult_add
        hp_bonus += s.max_hp_bonus
        crit_add += s.crit_chance_add
        life_add += s.lifesteal_add
        cdr += s.cdr_add
        ad_flat += s.attack_power_add
        sp_add += s.spell_power_add
        for t in s.tags:
            tags[t] = int(tags.get(t, 0)) + 1
    player.set("damage_mult", dm)
    player.set("fire_rate_mult", fr)
    player.set("pickup_radius_mult", pr)
    player.set("move_speed_mult", ms)
    if "max_hp_bonus_from_sigils" in player:
        player.max_hp_bonus_from_sigils = hp_bonus
    if "crit_chance_bonus" in player:
        player.crit_chance_bonus = crit_add
    if "lifesteal" in player:
        player.lifesteal = life_add
    if "cdr_bonus" in player:
        player.cdr_bonus = cdr
    if "attack_power_bonus" in player:
        player.attack_power_bonus = ad_flat
    if "spell_power_mult" in player:
        player.spell_power_mult = 1.0 + sp_add
    if "augment_tags" in player:
        player.augment_tags = tags
    # Clamp HP to new max (esp. for negative max_hp_bonus from Berserker/Glass Cannon).
    if "hp" in player and "MAX_HP" in player:
        var max_hp: float = player.current_max_hp() if player.has_method("current_max_hp") else (player.MAX_HP + hp_bonus)
        player.hp = min(player.hp, max_hp)
        if player.has_signal("hp_changed"):
            player.hp_changed.emit(player.hp, max_hp)
