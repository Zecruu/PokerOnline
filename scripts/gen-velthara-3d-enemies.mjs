#!/usr/bin/env node
// Generate enemy GLBs for games/velthara-3d via the Meshy text-to-3d API.
//
// Usage:
//   MESHY_API_KEY=msy_... node scripts/gen-velthara-3d-enemies.mjs
//   # Or rely on .env.local at the repo root.
//
// Each enemy is generated in PREVIEW mode (cheaper, faster). The script
// writes GLBs to games/velthara-3d/public/models/enemies/<key>.glb.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(REPO_ROOT, "games", "velthara-3d", "public", "models", "enemies");

// Lazy .env.local loader — no dotenv dependency.
async function loadEnvLocal() {
  try {
    const txt = await fs.readFile(path.join(REPO_ROOT, ".env.local"), "utf8");
    for (const line of txt.split(/\r?\n/)) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch (_) {}
}

const ENEMIES = [
  {
    key: "poacher",
    prompt: "A ragged hooded human cultist enemy, holding a hooked staff, dark torn robes, low-poly stylized game character, full body, T-pose, neutral pose, no weapon glow, dark fantasy",
    negative: "weapon glow, fire, magic effects, multiple characters",
  },
  {
    key: "shadow_stalker",
    prompt: "A lithe purple wraith assassin with elongated limbs and a torn cloak, gaunt face, glowing white eyes, low-poly stylized full-body game character, T-pose, dark fantasy",
    negative: "wings, weapons, multiple characters",
  },
  {
    key: "bone_crawler",
    prompt: "A small skittering bone arachnid creature with four bony legs and a cracked skull body, low-poly stylized game enemy, full body, neutral pose, beige bone color",
    negative: "humanoid, weapons, multiple characters",
  },
  {
    key: "frost_wraith",
    prompt: "A pale spectral robed wraith floating, frost-blue tattered robes, hood casting shadow over hollow face, low-poly stylized full-body game character, dark fantasy",
    negative: "fire, lava, multiple characters, weapons",
  },
  {
    key: "magma_golem",
    prompt: "A hulking lava-cracked stone giant with glowing orange magma seams running across its arms and chest, heavy basalt armor plating, low-poly stylized full-body boss enemy, T-pose, dark fantasy",
    negative: "weapons, multiple characters, ice, water",
  },
  {
    key: "crystal_sentinel",
    prompt: "A tall crystalline humanoid figure with sharp prismatic purple plates protruding from shoulders and back, glowing crystal core in chest, low-poly stylized full-body game enemy, T-pose, dark fantasy",
    negative: "weapons, multiple characters, organic skin",
  },
  {
    key: "swamp_lurker",
    prompt: "A hunched bog ogre creature with mossy green hide, dripping muck, drooping arms, large hunched back, low-poly stylized full-body game enemy, neutral pose, dark fantasy",
    negative: "weapons, multiple characters, fire",
  },
  {
    key: "sand_burrower",
    prompt: "A scuttling armored beetle creature with chitinous plated body and a glowing red explosive thorax, six segmented legs, low-poly stylized full-body game enemy, neutral pose, dark fantasy",
    negative: "humanoid, multiple characters, weapons",
  },
];

const API = "https://api.meshy.ai/openapi/v2/text-to-3d";

async function startPreview(apiKey, enemy) {
  const res = await fetch(API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mode: "preview",
      prompt: enemy.prompt,
      negative_prompt: enemy.negative,
      art_style: "realistic",
      should_remesh: true,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`startPreview ${enemy.key} failed: ${res.status} ${txt}`);
  }
  const data = await res.json();
  return data.result;
}

async function pollTask(apiKey, taskId) {
  while (true) {
    const res = await fetch(`${API}/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`poll ${taskId} failed: ${res.status} ${txt}`);
    }
    const data = await res.json();
    const status = data.status;
    if (status === "SUCCEEDED") return data;
    if (status === "FAILED" || status === "EXPIRED" || status === "CANCELED") {
      throw new Error(`task ${taskId} ${status}: ${data.task_error || ""}`);
    }
    process.stdout.write(`  [${taskId.slice(0, 8)}] ${status} ${data.progress || 0}%\r`);
    await new Promise((r) => setTimeout(r, 5000));
  }
}

async function downloadTo(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(destPath, buf);
  return buf.length;
}

async function main() {
  await loadEnvLocal();
  const apiKey = process.env.MESHY_API_KEY;
  if (!apiKey) {
    console.error("Missing MESHY_API_KEY (set env var or add to .env.local at repo root).");
    process.exit(1);
  }

  await fs.mkdir(OUT_DIR, { recursive: true });

  // Allow re-runs to skip already-generated files.
  const skipExisting = !process.argv.includes("--force");

  console.log(`Generating ${ENEMIES.length} preview models → ${OUT_DIR}`);
  console.log("Estimated cost: ~$0.80 total. ~1-2 min per model.\n");

  // Kick all off in parallel — Meshy queue handles concurrency.
  const tasks = await Promise.all(
    ENEMIES.map(async (enemy) => {
      const out = path.join(OUT_DIR, `${enemy.key}.glb`);
      if (skipExisting) {
        try {
          await fs.access(out);
          console.log(`✓ ${enemy.key} (already exists, skipping)`);
          return { enemy, skipped: true };
        } catch (_) {}
      }
      const id = await startPreview(apiKey, enemy);
      console.log(`→ ${enemy.key}  task=${id}`);
      return { enemy, id, skipped: false };
    }),
  );

  for (const t of tasks) {
    if (t.skipped) continue;
    console.log(`\nWaiting on ${t.enemy.key} (${t.id}) ...`);
    const result = await pollTask(apiKey, t.id);
    const glbUrl = result.model_urls?.glb;
    if (!glbUrl) {
      console.error(`  no GLB url returned: ${JSON.stringify(result.model_urls)}`);
      continue;
    }
    const out = path.join(OUT_DIR, `${t.enemy.key}.glb`);
    const bytes = await downloadTo(glbUrl, out);
    console.log(`  ✓ ${t.enemy.key} ${(bytes / 1024).toFixed(0)} KB → ${path.relative(REPO_ROOT, out)}`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
