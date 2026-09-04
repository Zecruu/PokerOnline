# Graveborn (Godot 4.6)

Engine source of truth for the necromancer survivor. Same loop as the HTML5 / Vercel build in `games/graveborn`.

## Why there is also an HTML5 copy

The first slice shipped as canvas JS so we could playtest and host on Vercel from this Linux agent (no Godot binary at the time, and Vercel serves web — not `.pck` / iOS IPA). This Godot project is the iOS / desktop path.

## Run

1. Install Godot **4.6.x**.
2. Import `godot/graveborn/project.godot`.
3. Press F5.

WASD or hold the left side of the window. Auto-attack, auto-raise, ARAM cards on level-up.

## iOS later

Export → iOS from a Mac with Xcode 26 + Apple Developer Program. Use the Compatibility renderer (already set).
