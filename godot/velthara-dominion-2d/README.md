# Velthara Dominion — Godot 2D Prototype

A minimum-viable port of the HTML5 Velthara Dominion (~24k LOC JS) into Godot 4.6.
This is a **prototype**, not the full game — see "What's in" / "What's not in" below.

## Run it

1. Install **Godot 4.6.x** (free, from https://godotengine.org/download).
2. Open Godot, click "Import", point at `godot/velthara-dominion-2d/project.godot`.
3. Wait ~30s for first-time texture import.
4. Press **F5** (or the Play button) to run.

If it prompts you to pick a main scene, select `scenes/main.tscn`.

## Controls

- **WASD / Arrow keys** — move
- **ESC** — restart (only after game over for now)

Auto-attack is automatic — your Fire Slash arc fires at the nearest enemy
every 1.47s (matching the HTML5 cadence).

## What's in (prototype scope)

| System | Status |
|---|---|
| Player movement (WASD) | ✅ |
| Fire Sovereign with idle/walk/cast animations | ✅ (using the sprite sheets we generated) |
| Auto-attack: Fire Slash cone with damage | ✅ |
| 3 enemy types (swarm, runner, tank) with walk/attack/death anims | ✅ |
| Enemy AI: chase player, attack on contact, die on HP 0 | ✅ |
| XP orbs drop from enemies, fly to player, level up | ✅ |
| HP / XP / level / kills / wave / enemies-alive HUD | ✅ |
| Wave system: timer-based escalation, ring spawn | ✅ |
| Damage i-frames (0.4s) | ✅ |
| Game over + restart | ✅ |
| Volcanic hell-floor tiled background | ✅ |
| Smooth follow camera | ✅ |

## What's NOT in (intentionally — these are the systems that took the JS version 24k LOC)

- Sigils, items, soul shop, inventory
- Daily challenges + leaderboard
- Multiple characters (only Fire Sovereign here; Demonic Monarch and Angelic Knight not ported)
- Q/E abilities (Inferno Volley, Solar Cataclysm)
- Pyre Fuel passive / Stardust passive
- Bosses (Plague Weaver, Consumer, etc.)
- Horde events
- Sound mixer + background music wiring (assets are copied; not yet wired)
- Save/load between runs
- Pause menu, settings, mute toggle
- Account auth, multiplayer
- 9 of the 12 enemy types (only 3 wired here; the rest of the sprite sheets exist
  in the HTML5 build but I didn't copy them all — extending is just a few lines
  in `wave_manager.gd`'s ENEMY_TYPES table)

## Architecture

```
project.godot           # Godot 4.6 config, input map, layer names
scripts/
├── player.gd           # CharacterBody2D — WASD, auto-attack, anim state machine
├── enemy.gd            # CharacterBody2D — chase player, attack, die, drop XP
├── fire_slash.gd       # Node2D — animated crescent VFX
├── xp_orb.gd           # Area2D — float toward player, give XP on contact
├── wave_manager.gd     # Node — spawn ring, escalating difficulty
├── main.gd             # Top-level controller, signal wiring
└── hud.gd              # CanvasLayer — HP/XP/level/wave/kills/flash banner
scenes/
├── main.tscn           # Entry scene
├── player.tscn
├── enemy.tscn
├── fire_slash.tscn
└── xp_orb.tscn
ui/
└── hud.tscn
assets/
├── characters/         # FS idle/walk/cast 768×512 sheets (from the HTML5 build)
├── enemies/            # walk/attack/death strips for swarm/runner/tank
├── bg/                 # hell-floor tile
└── audio/              # game music, level-up sound (not wired yet)
```

All sprite-sheet slicing is done **programmatically** in scripts via
`AtlasTexture` regions on a single `SpriteFrames` resource — no manual
frame setup in the editor.

## Adding more enemies

In `scripts/wave_manager.gd`, extend `ENEMY_TYPES`:

```gdscript
const ENEMY_TYPES := [
    ["swarm",   "skeleton-swarm",    150.0,  25.0,  90.0,  6],
    ["runner",  "evil-ghost-runner", 100.0,  22.0, 140.0,  5],
    ["tank",    "plate-corpse-tank", 750.0,  60.0,  55.0, 25],
    # add: ["bomber", "chained-husk-bomber", 375.0, 30.0, 130.0, 12],
]
```

…and copy the matching `<prefix>-walk.png` / `<prefix>-attack.png` /
`<prefix>-death.png` into `assets/enemies/`. The strip format is
6 frames horizontal, 64×64 each (384×64 total).

## Performance notes

Where this prototype wins vs the HTML5 version (the reason for the port):

- **No GC stutter** — Godot pools transforms, particles, audio internally.
- **GPU sprite batching** — all enemies of the same type rendered as one
  draw call when they share an AtlasTexture base.
- **CharacterBody2D physics is native C++** — collision queries don't pay
  the JS object-property-access cost.
- **AnimatedSprite2D advances frames via timeline**, not by re-calculating
  modulo math every frame in script.

You should easily hit hundreds of enemies at 60fps where the HTML5 build
chugs at ~150.

## Next steps when you commit to the port

1. Port one full ability (Inferno Volley) to validate the projectile +
   homing pattern works in Godot.
2. Port the sigil rarity system — `Resource` files (`.tres`) for each sigil
   give you the editor-driven balancing the HTML5 version lacks.
3. Wire the soul shop UI as a `Control` node tree.
4. Build the save system on top of `ConfigFile` (Godot's built-in INI-like
   format) or JSON via `FileAccess`.
5. Export to Windows / macOS / Linux from Project → Export.

Each of those is ~half a day to a day of work. Full feature parity with
the HTML5 build is 3-6 months as discussed.
