# Graveborn

First playable prototype of the 2D necromancer survivor (iOS-bound, sprite sheets, procedural).

## Loop

- **Auto-attack** — bone bolts at the nearest enemy
- **Auto-raise** — corpses on the ground become skeletons on a timer
- **Hard army cap** (starts at 6) — overflow detonates the corpse
- **ARAM / Arena cards** on level-up: 3 tall cards, `1`/`2`/`3` or tap
  - Silver = generic stats
  - Gold / Prismatic = **Necromancer** class upgrades

## Run

Open `index.html` locally or via any static server:

```bash
python3 -m http.server 8765 --directory games/graveborn
```

Then visit `http://localhost:8765`.

WASD or hold the left half of the screen to move.

## Next (Godot / App Store)

Port the same systems onto `godot/velthara-dominion-2d` (already has a Necromancer + skeleton minion). This HTML5 slice exists so we can feel the loop without Xcode.
