#!/usr/bin/env node
// Generate the Fire Sovereign player model via Meshy:
//   1. text-to-3d preview  → base low-poly mesh
//   2. text-to-3d refine   → bakes proper PBR textures
//   3. rigging             → auto-rig humanoid bones + skinning
//
// The script is defensive about the rigging step: not every Meshy plan exposes
// it. If the call fails we still keep the refined GLB and report it.
//
// Output: games/velthara-3d/public/models/fire_sovereign.glb

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const OUT = path.join(REPO_ROOT, "games", "velthara-3d", "public", "models", "fire_sovereign.glb");

async function loadEnvLocal() {
  try {
    const txt = await fs.readFile(path.join(REPO_ROOT, ".env.local"), "utf8");
    for (const line of txt.split(/\r?\n/)) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch (_) {}
}

const PROMPT =
  "A regal Fire Sovereign mage, full-body humanoid character, dark purple and black robed wizard with silver and violet trim, hooded face shadowed beneath a horned ember crown wreathed in purple flame, glowing violet magma cracks running through obsidian armor plates, billowing tattered black robe with purple ember motes drifting, holding a tall ornate staff topped with a violet flaming orb, T-pose, single character, stylized game character, dark fantasy";

const NEGATIVE =
  "weapons drawn, multiple characters, multiple heads, gore, modern clothing, low quality, blurry";

const API_V2 = "https://api.meshy.ai/openapi/v2/text-to-3d";
const API_RIG = "https://api.meshy.ai/openapi/v1/rigging";

async function postJson(url, body, apiKey) {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${url} → ${res.status} ${await res.text()}`);
  return res.json();
}

async function getJson(url, apiKey) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status} ${await res.text()}`);
  return res.json();
}

async function pollTask(baseUrl, taskId, apiKey, label) {
  while (true) {
    const data = await getJson(`${baseUrl}/${taskId}`, apiKey);
    const status = data.status;
    if (status === "SUCCEEDED") return data;
    if (status === "FAILED" || status === "EXPIRED" || status === "CANCELED") {
      throw new Error(`[${label}] ${taskId} ${status}: ${data.task_error || JSON.stringify(data)}`);
    }
    process.stdout.write(`  [${label}] ${status} ${data.progress || 0}%\r`);
    await new Promise((r) => setTimeout(r, 5000));
  }
}

async function downloadTo(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${url} → ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(dest, buf);
  return buf.length;
}

async function main() {
  await loadEnvLocal();
  const apiKey = process.env.MESHY_API_KEY;
  if (!apiKey) {
    console.error("Missing MESHY_API_KEY (set env var or add to .env.local at repo root).");
    process.exit(1);
  }

  await fs.mkdir(path.dirname(OUT), { recursive: true });

  // ── 1) Preview ────────────────────────────────────────────
  console.log("→ preview");
  const previewStart = await postJson(API_V2, {
    mode: "preview",
    prompt: PROMPT,
    negative_prompt: NEGATIVE,
    art_style: "realistic",
    should_remesh: true,
  }, apiKey);
  const previewId = previewStart.result;
  console.log(`  task ${previewId}`);
  await pollTask(API_V2, previewId, apiKey, "preview");

  // ── 2) Refine ─────────────────────────────────────────────
  console.log("→ refine");
  const refineStart = await postJson(API_V2, {
    mode: "refine",
    preview_task_id: previewId,
  }, apiKey);
  const refineId = refineStart.result;
  console.log(`  task ${refineId}`);
  const refined = await pollTask(API_V2, refineId, apiKey, "refine");
  const refinedGlb = refined.model_urls?.glb;
  if (!refinedGlb) throw new Error("refine SUCCEEDED but no GLB URL returned");
  console.log(`  refined GLB ready: ${refinedGlb.slice(0, 80)}...`);

  // ── 3) Rigging (best-effort) ──────────────────────────────
  // Meshy's rigging response uses a different shape than text-to-3d:
  //   result.rigged_character_glb_url        — character mesh + bones, T-pose
  //   result.basic_animations.walking_armature_glb_url
  //   result.basic_animations.running_armature_glb_url
  //   result.basic_animations.{walking,running}_glb_url     — also includes mesh
  let finalGlbUrl = refinedGlb;
  let walkClipUrl = null;
  let runClipUrl = null;
  try {
    console.log("→ rigging");
    const rigStart = await postJson(API_RIG, { input_task_id: refineId }, apiKey);
    const rigId = rigStart.result;
    console.log(`  task ${rigId}`);
    const rigged = await pollTask(API_RIG, rigId, apiKey, "rigging");
    const r = rigged.result || rigged;
    if (r.rigged_character_glb_url) {
      finalGlbUrl = r.rigged_character_glb_url;
      console.log("  rigged GLB ready");
    }
    walkClipUrl = r.basic_animations?.walking_armature_glb_url || null;
    runClipUrl = r.basic_animations?.running_armature_glb_url || null;
  } catch (err) {
    console.warn(`  rigging step failed: ${err.message}`);
    console.warn("  → keeping refined (un-rigged) GLB.");
  }

  const bytes = await downloadTo(finalGlbUrl, OUT);
  console.log(`✓ wrote ${(bytes / 1024).toFixed(0)} KB → ${path.relative(REPO_ROOT, OUT)}`);
  if (walkClipUrl) {
    const dst = OUT.replace(/\.glb$/, "_walking.glb");
    const n = await downloadTo(walkClipUrl, dst);
    console.log(`✓ wrote ${(n / 1024).toFixed(0)} KB → ${path.relative(REPO_ROOT, dst)}`);
  }
  if (runClipUrl) {
    const dst = OUT.replace(/\.glb$/, "_running.glb");
    const n = await downloadTo(runClipUrl, dst);
    console.log(`✓ wrote ${(n / 1024).toFixed(0)} KB → ${path.relative(REPO_ROOT, dst)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
