# Stick Royale motion + VFX bake

Clips and VFX live in `games/stick-royale/motion/clips.json` and `games/stick-royale/vfx/presets.json`.

The cloud agent **could not clone** `https://github.com/Zecruu/zecrurigger` (private repo, GitHub 404 with the agent token). Committed files are **authored-fallback** in the same schema ZecruRigger output would use.

## Re-bake on Michael's machine

```bash
git clone https://github.com/Zecruu/zecrurigger.git
cd zecrurigger
# follow README: npm install / npm run build; Playwright/Chromium if the CLI needs it
node agent/cli.mjs catalog human

# from the PokerOnline repo
node tools/bake-stick-motion.mjs --zecrurigger /path/to/zecrurigger
node tools/bake-stick-vfx.mjs --zecrurigger /path/to/zecrurigger
```

Copy the written JSON into both `games/stick-royale/` and `hub/public/games/stick-royale/`.

Do **not** modify the zecrurigger repo. The bakers only read `catalog human`, `run` / `library.inspect`, `docs/vfx.md`, and `docs/surface-aura.md`.
