# Graveborn

First playable prototype of the 2D necromancer survivor (iOS-bound, sprite sheets, procedural).

## Loop

- **Auto-attack** — bone bolts at the nearest enemy
- **Auto-raise** — corpses on the ground become skeletons on a timer
- **Hard army cap** (starts at 6) — overflow detonates the corpse
- **ARAM / Arena cards** on level-up: 3 tall cards, `1`/`2`/`3` or tap
  - Silver = generic stats
  - Gold / Prismatic = **Necromancer** class upgrades

## Vercel

Anonymous preview (claim to keep — expires in ~60 minutes if unclaimed):

- Play: https://temporary-turbo-magenta-wn9vad5.vercel.app
- Claim: https://vercel.com/claim-deployment?code=2d03f695-17a6-44b5-bd78-d287d458cc91

After claiming, connect this folder (`games/graveborn`) or the repo root with Root Directory `games/graveborn` for permanent deploys.

## Run locally

Open `index.html` locally or via any static server:

```bash
python3 -m http.server 8765 --directory games/graveborn
```

Then visit `http://localhost:8765`.

WASD or hold the left half of the screen to move.

## Godot

Engine project: `godot/graveborn`. This folder is the **web / Vercel** build (Vercel cannot host a Godot editor project). Keep card data in sync with `godot/graveborn/scripts/card_db.gd`.

## Next (App Store)

Export `godot/graveborn` to iOS from a Mac (Xcode 26, Apple Developer Program).
