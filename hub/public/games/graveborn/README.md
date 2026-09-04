# Graveborn

First playable prototype of the 2D necromancer survivor (iOS-bound, sprite sheets, procedural).

## Loop

- **Auto-attack** — bone bolts at the nearest enemy
- **Auto-raise** — corpses on the ground become skeletons on a timer
- **Hard army cap** (starts at 6) — overflow detonates the corpse
- **ARAM / Arena cards** on level-up: 3 tall cards, `1`/`2`/`3` or tap
  - Silver = generic stats
  - Gold / Prismatic = **Necromancer** class upgrades

## Live host (Zecru Games)

Same pattern as Velthara's Dominion. Production files live in `games-server/public/graveborn/` and ship with the games-server Railway service.

- Play: https://games.zecrugames.com/graveborn/
- Hub card / store / sidebar: https://www.zecrugames.com

Goes live when this lands on `master`. Keep `games/graveborn`, `hub/public/games/graveborn`, and `games-server/public/graveborn` in sync.

## Run locally

Open `index.html` locally or via any static server:

```bash
python3 -m http.server 8765 --directory games/graveborn
```

Then visit `http://localhost:8765`.

WASD on desktop. On a phone, drag the MOVE stick or anywhere on the field.

## Godot

Engine project: `godot/graveborn`. This folder is the **web** build served from `games.zecrugames.com/graveborn/`. Keep card data in sync with `godot/graveborn/scripts/card_db.gd`.

## Next (App Store)

Export `godot/graveborn` to iOS from a Mac (Xcode 26, Apple Developer Program).
