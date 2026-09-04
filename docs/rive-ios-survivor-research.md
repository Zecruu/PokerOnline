# Rive (rive.app) for an iOS Vampire Survivors / Megabonk game

Research date: 2026-09-04  
Product: [rive.app](https://rive.app) — “The interactive experience engine”  
Goal: evaluate Rive as the engine (or a layer) for a horde-survivor we can ship to the iOS App Store.

**Verdict:** Rive is real, iOS-capable, and worth a time-boxed spike for art, HUD, and VFX. It is **not** a drop-in replacement for Unity or Godot for a horde game. GPU Canvas is the interesting new piece (Metal on iOS), but it is a low-level GPU API, not a finished 3D/horde engine. Ship the commercial game on Godot or Unity; use Rive where it is strongest.

---

## 1. What Rive actually is

Rive is an editor + open-source C++ runtime, not a traditional scene-tree game engine.

| Layer | What it does |
| --- | --- |
| **Editor** (browser or desktop) | Vector/raster design, timelines, state machines, data binding, Luau scripting, AI agent |
| **`.riv` file** | Packed artboards, animations, scripts, fonts, audio, optional shaders |
| **Runtimes** | Play that file in Apple, Android, Flutter, Web, React Native, Unity, Unreal |
| **GPU Canvas** | Optional low-level GPU surface for 3D, WGSL shaders, custom pipelines (~25 KB extra) |

Official pitch: design, animate, and code in one place, then ship everywhere. Scripting (Luau) went live in January 2026. Rive now markets itself as an “experience engine” that can host full games, not only UI animation.

That is different from Unity/Godot:

- Unity/Godot give you scenes, physics, collision, pooling, cameras, input maps, and export pipelines out of the box.
- Rive gives you a very fast interactive graphics runtime, a game-adjacent scripting environment, and (now) a WebGPU-style GPU layer. You write combat, spawning, spatial queries, and horde rendering yourself.

The older **Rive GameKit for Flutter** (private technical preview, tilemaps, 120 fps vector scenes) is not the current product. The public use-case page 404s. The renderer work landed in the public `rive` / `rive_native` Flutter packages and the native Apple runtime.

---

## 2. GPU Canvas (the pinned “now live” feature)

Rive’s public positioning (including the @rive_app pinned post): GPU Canvas is a low-level GPU layer for 3D, shaders, and custom effects. Write WGSL once; Rive compiles to Metal, Vulkan, Direct3D, WebGPU, and WebGL.

Documented capabilities:

- Custom WGSL vertex/fragment programs
- Off-screen `GPUCanvas` render targets, composited back into a 2D artboard
- Build your own pipelines, buffers, bind groups, MSAA, post-process
- Embed 3D geometry in a 2D artboard, or draw 2D Rive as a texture in a 3D pass
- “Write a GLTF importer” is listed as something *you* can build, not a shipped loader

Apple runtime (required for iOS 3D):

```swift
let worker = try await Worker(
    configuration: .init(enableGPUCanvas: true)
)
let file = try await File(
    source: .local("my_file", Bundle.main),
    worker: worker
)
```

GPU Canvas is **off by default**. The worker setting is fixed for the worker’s lifetime. Share one GPU Canvas worker across views.

Honesty check on maturity:

| Claim | Current state |
| --- | --- |
| “Now live for everyone” (marketing) | Editor GPU Canvas is out of the earliest private gate |
| WGSL docs | Still say shaders are Early Access; some runtimes experimental |
| Official 3D libraries | Rive staff: public libraries for model loading / lighting / render styles were a **production blocker** |
| Runtime surface | Apple has a first-class `enableGPUCanvas` flag. Other runtimes lag or are experimental |

For a Megabonk-style 3D horde, GPU Canvas is a **renderer kit**, not Unity DOTS. You would implement instancing, lighting, and model loading yourself (or wait for Rive’s official libraries).

---

## 3. Scripting and “can it be a game?”

Scripts are Luau, typed against generated APIs, with protocols that constrain what a script may touch:

- **Node** — draw / advance a scene-graph node (this is the game-loop hook)
- **Layout, Converter, PathEffect, Test** — UI, data, strokes, harnesses
- Later GPU scripts drive `context:gpuCanvas()` and `GPUPipeline`

Node scripts have a documented **fixed-timestep `advance(seconds)`** pattern. That is enough to write movement, spawners, and simple physics (gravity, springs, follow chains) in Luau.

Rive’s own examples of “physics” and “particles” are **scripted behaviors**, not Box2D/Jolt. Hit testing is AABB-then-path for pointer/UI, not thousands of combat colliders per frame.

You *can* write a combat sim in Luau. You do *not* get:

- ECS / jobs / Burst
- `MultiMesh` / GPU instancing for 1,000 identical enemies
- PhysicsServer-style cheap bodies
- Built-in object pooling
- A camera/world larger than an artboard unless you build it

---

## 4. iOS App Store path (Rive-native)

This is the cleanest Rive → store route. Do **not** wrap the existing HTML5 games in WKWebView (Apple 4.2 / 4.7).

### Host app

1. Enroll in the [Apple Developer Program](https://developer.apple.com/programs/) ($99/year).
2. Build on **macOS with Xcode**. As of 2026-04-28, App Store Connect uploads must be built with **Xcode 26 + iOS 26 SDK**. Minimum *device* OS can stay lower.
3. Create a SwiftUI (or UIKit) app.
4. Add [`rive-ios`](https://github.com/rive-app/rive-ios) via Swift Package Manager (`RiveRuntime`, current docs cite `from: "6.24.0"`).
5. Runtime supports **iOS 14+**, iPadOS, tvOS 16+, visionOS, macOS 13.1+, Mac Catalyst.
6. Load `.riv` files from the bundle (or URL/data). Enable GPU Canvas only if the file uses 3D/shaders.
7. Drive HUD / run state through **data binding** (`viewModelInstance`), not by tearing the file apart each frame.
8. `flutter build ipa` is the Flutter variant; native Swift is simpler if Rive is the whole visual layer.

### Store checklist (engine-agnostic)

- Bundle ID, signing, App Store Connect record
- Privacy Nutrition Labels + Privacy Manifest (RiveRuntime ships `PrivacyInfo.xcprivacy`)
- Age rating, screenshots (6.7" and 6.3"/5.5" as required that year), App Preview optional
- Game Center entitlement **only if** you actually configure Game Center
- IAP must use StoreKit if you sell coins/characters (Apple 3.1.1)
- TestFlight on a **physical iPhone** before review — Simulator is not a horde-performance test
- Guideline 4.2: must be a real app, not a thin website

### Rive commercial cost

| Plan | Price | Notes |
| --- | --- | --- |
| Free | $0 | Learning; 3 collaborative files |
| Cadet | $17/seat/mo or $108/year | **Runtime exports**, unlimited files — this is the shipping floor |
| Voyager | $39/seat/mo | Libraries, CDN hosting, agent credits |
| Enterprise | $1,440/seat/year | Custom runtime support, SSO |

Editor work can start on Free. A store build that embeds exported `.riv` files wants **Cadet+**.

---

## 5. Fit for Vampire Survivors / Megabonk

Genre requirements vs Rive:

| System | Need | Rive today |
| --- | --- | --- |
| Auto-attack + many weapons | Yes | Write in Luau or host engine |
| 200–2,000 enemies on a phone | Yes | No instancing/pooling; each component is expensive |
| XP gems, chests, draft upgrades | Yes | Data binding + lists help UI; sim is on you |
| Virtual joystick | Yes | Pointer events + state machines are good |
| Character/VFX animation | High bar | **Best feature** — bones, joysticks, solos, feathering |
| HUD / menus / meta | High bar | **Best feature** — layouts, text, data binding |
| 2D top-down (Vampire Survivors) | Possible | Vector tilemaps were GameKit-era; now you’d script a world |
| 3D (Megabonk) | Unity did this | GPU Canvas only; you write the 3D stack |
| iOS export | Required | Native runtime is production-quality for **graphics** |

Megabonk shipped on **Unity**. This repo already has a Godot 4.6 2D survivor prototype at `godot/velthara-dominion-2d` (player, 3 enemy types, XP, waves, HUD). That is a closer starting point for a store build than a greenfield Rive game.

Rive’s own performance guide warns that thousands of vector vertices, large rasters, clipped artboards, and many simultaneously playing state machines hurt mobile. A horde of fully-rigged Rive characters is the opposite of that advice. A horde of **instanced meshes** (Godot MultiMesh / Unity DOTS) is the industry pattern.

---

## 6. Three ways to use Rive

### A. Rive as the whole engine (highest risk)

Swift host app + one or more `.riv` files. Game sim in Luau `advance()`. GPU Canvas if 3D.

- Pros: one art/code tool; smallest team for a *visual* prototype; native App Store binary.
- Cons: you invent horde tech; GPU Canvas 3D is unfinished; few survivor-scale references; hard to hire.

Use only for a **spike**, not the ship vehicle, until a 200-enemy iPhone test holds 30+ fps.

### B. Hybrid (recommended if we love Rive art)

Godot 4.6 or Unity plays the game. Rive draws the player, bosses, HUD, and menus.

- Godot: community Rive bindings; official path is less mature than Unity/Flutter/Apple.
- Unity: official Rive package — same engine Megabonk used.
- Native Swift + SpriteKit/Metal for sim, Rive for presentation — possible, more custom.

### C. Host engine only, skip Rive (fastest ship)

Continue `godot/velthara-dominion-2d`, add touch controls, export an Xcode project, TestFlight. Use sprite sheets we already generate. Add Rive later for a signature character if the look needs it.

---

## 7. How to test Rive (time-boxed spike)

We cannot archive an IPA from this Linux environment (no Xcode). Test in this order:

### Spike 1 — Editor + web runtime (1–2 days, no Mac)

1. Create a Rive account; start on Free.
2. One artboard: player, virtual stick, 20–50 enemy component instances, a kill counter via data binding.
3. Node script: move player, spawn enemies, simple circle overlap, XP on death, fixed timestep.
4. Preview in the editor, then a local web page with `@rive-app/webgl2`.
5. **Kill test:** clone enemies to 50 / 150 / 300. Record fps and CPU.

If 150 animated enemies already stutter on a laptop, stop. Do not take this to iOS as the engine.

### Spike 2 — Native iOS (needs a Mac + device)

1. Clone [rive-ios Example-iOS](https://github.com/rive-app/rive-ios), scheme `Preview (iOS)`.
2. New SwiftUI app, SPM `RiveRuntime`, load the spike `.riv`.
3. `Worker(configuration: .init(enableGPUCanvas: true))` only if the file uses 3D/shaders.
4. Run **release** on a physical iPhone. Cap with `.frameRate(.range(minimum: 30, maximum: 60))`.
5. Repeat the 50 / 150 / 300 enemy counts. Use Instruments (Metal System Trace).

Pass: 150 enemies + player + HUD at ≥30 fps on a 3-year-old iPhone, thermal OK after 10 minutes.

### Spike 3 — GPU Canvas 3D (only if we want Megabonk-like)

1. Enable shader targets: **Metal** (required for iOS), plus SPIR-V/HLSL if we also ship elsewhere.
2. One WGSL fullscreen or simple mesh pass; composite into the artboard.
3. Confirm it runs in the Apple example with `enableGPUCanvas: true`.
4. Do **not** start a GLTF/lighting stack until Rive ships public 3D libraries — that is the production hole they called out.

### Spike 4 — Hybrid smoke (if Spike 1/2 fail as engine)

Keep Godot as sim. Use Rive only for the player + HUD. Measure draw-call cost of one Rive view vs sprites.

---

## 8. Comparison for *this* project

| | Rive-as-engine | Godot 4.6 (in repo) | Unity |
| --- | --- | --- | --- |
| Horde tools | DIY | MultiMesh, PhysicsServer, pooling | DOTS / jobs, huge mobile precedent |
| Animation/UI | Best | Good 2D | Good; Rive can plug in |
| iOS store path | Native Swift runtime | Export → Xcode | Official iOS export |
| 3D survivor | GPU Canvas DIY | Viable; more work | What Megabonk used |
| License / cost | Cadet+ for exports | MIT, $0 | Unity Runtime fee after threshold |
| Existing work | None | Velthara 2D prototype | None |
| Risk to ship date | High | Medium | Medium (familiar, heavier) |

---

## 9. Recommendation

1. **Treat Rive as an experience/animation engine**, not the horde simulator.
2. **Run Spike 1** in the Rive editor so we have numbers, not vibes. If it holds, do Spike 2 on a Mac.
3. **Ship the App Store game from Godot** (or Unity if we go 3D like Megabonk). Reuse `godot/velthara-dominion-2d`.
4. **Budget Cadet** if we keep Rive in production.
5. **Budget a Mac + Apple Developer Program + TestFlight** regardless of engine. iOS cannot be signed from Linux.
6. **Ignore Rive GameKit** as a dependency. Use current Apple / Flutter / web runtimes.

### Suggested next build (if we proceed)

- Godot: touch joystick, pause, one iOS export preset, ASTC textures, Mobile/Compatibility renderer.
- Rive: player + HUD `.riv` only, data-bound HP/XP/level, dropped into the host later.

---

## 10. Decision: 2D necromancer/mage survivor (not 3D)

**Ship it in 2D.** Top-down, sprite-sheet characters, procedurally assembled arenas. Godot 4.6, Compatibility or Mobile renderer, MultiMesh + pooling for the horde.

This is not a taste call. The constraints already pick the dimension.

| Constraint | What it implies |
| --- | --- |
| Art is **sprite sheets** | That is a 2D pipeline. In 3D those sheets become billboards (flat cards that always face the camera). You pay 3D cost and still look 2D. |
| World is **procedural** | 2D chunked tilemaps are cheap to generate, stream, and cull on a phone. 3D procgen needs meshes, collision, lighting, and pathfinding on height. |
| Must stay smooth on **iOS** | Vampire Survivors-likes live or die at 400–2,000 entities. 2D instancing + an atlas is the proven mobile pattern. 3D horde (Megabonk-style) is a Unity desktop game, not an iPhone thermal budget. |
| Fantasy is **necromancer / mage** | Orbiting skulls, summon rings, bone walls, auras, and corpse explosions read instantly from above. A 3D camera hides the army you are proud of. |
| Must be **addicting** | Addiction is the run loop, not the camera. 3D does not make drafts, summons, or “one more run” better. |

Megabonk is the wrong reference for *this* asset plan. It is Unity 3D with meshes. Our existing work is already the right reference: Velthara’s Dominion (mage path, skulls, wolves, imps, fire aura) and `godot/velthara-dominion-2d` (sprite-sheet player + 3 enemy types + waves).

### Why 2.5D / fake-3D is a trap

Y-sorted 2D with chunky shadows (Hades, Dead Cells, Brotato) is fine and still 2D. A real 3D camera with sprite-sheet characters is the expensive way to get a worse silhouette on a 6-inch screen, plus more draw calls, more heat, and a harder App Store performance review.

Use a slight isometric or “3/4 view” **sprite** if you want depth. Do not put a perspective camera on a sprite horde.

### What actually makes the mage/necro loop addicting

Keep runs at 8–15 minutes. The player is not a gun — they are a **growing army**.

1. **Corpses are currency.** Kills leave bodies. Spend them: raise a skeleton, detonate a bone bomb, feed a skull, or freeze a bone wall. Every pack on the ground is a decision, not litter.
2. **The army is the scoreboard.** Caps stay hard for iOS (for example 12 skeletons, 6 skulls, 3 elites). Overflow becomes damage / size / on-death nova so power fantasy continues without spawning entity 200.
3. **Spell draft, not bullet stats.** Level-up cards change *shape*: orbit, nova, chain, summon, curse aura. Three cards, pick one, no pausing longer than a breath on mobile (or a big Pause button).
4. **One signature feel per run.** Start as glass mage. By minute 6 you are a moving graveyard. Visual noise must stay readable: recolor via sheet variants, not extra particles per minion.
5. **Short meta.** Unlock one new starting grimoire or minion type per successful run. Daily seed for the procedural map.

That is the Vampire Survivors dopamine loop with a necromancer skin. It does not need 3D.

### iOS performance budget (2D, sprite sheets)

Target: **30 fps minimum, 60 fps on A15+**, 10-minute run without thermal collapse, on a 3-year-old iPhone.

| Rule | Why |
| --- | --- |
| One texture atlas per “family” (player, undead, demons, pickups) | Draw calls kill iOS more than poly count. Sheets already want an atlas. |
| ASTC (or ETC2) import, no uncompressed PNG at runtime | VRAM and memory warnings on 3 GB phones. |
| Pool every enemy, gem, projectile, corpse | `new`/`free` mid-horde = frame spikes. |
| Far entities: 2-frame walk cycle, no shadows, no AI tick every frame | LOD by distance. Necro army behind the camera-follow radius can be dumb. |
| Combat overlap, not physics bodies, for the horde | Circle vs circle in a grid/hash. `CharacterBody2D` per skeleton will not survive 800 units. |
| Cap on-screen FX | One blood/bone burst type, pooled. No per-minion particle system. |
| Procedural map in chunks, recycle off-screen tiles | Infinite graveyard without an infinite node tree. |
| Godot Compatibility renderer for 2D, or Mobile if we add a few 3D FX later | Do not use Forward+. |
| Virtual joystick + auto-aim; thumbs never cover the army | Mobile-first. Keyboard is a debug device. |

Minion fantasy vs performance: **simulate cheap, render cheaper.** A raised skeleton can be a MultiMesh instance with a facing bit and a frame index, not a full scene node.

### Engine for this decision

- **Godot 4.6 2D** — already in repo, MIT, iOS Xcode export, sprite + tilemap + MultiMesh2D.
- **Rive** — optional later for the player cast/HUD only. Not the horde.
- **Unity 3D** — only if we throw away sprite sheets and build Megabonk. That is a different game.

### Do not do

- Sprite-sheet characters in a 3D world “so it looks like Megabonk.”
- One unique `.riv` / full skeleton rig per trash mob.
- Uncapped summons (“infinite army”) on iOS.
- HTML5 wrap of the current Velthara JS for App Store (Apple 4.2 / 4.7).

---

## Sources

- [Rive docs index](https://rive.app/docs/llms.txt)
- [Apple runtime](https://rive.app/docs/runtimes/apple/apple.md) and [GPU Canvas (Apple)](https://rive.app/docs/runtimes/apple/gpu-canvas.md)
- [WGSL shaders](https://rive.app/docs/scripting/wgsl-shaders)
- [GPUCanvas API](https://rive.app/docs/scripting/api-reference/gpu/gpu-canvas)
- [Scripting is live](https://rive.app/blog/scripting-is-live-in-rive) (2026-01-13)
- [Node scripts / fixed timestep](https://rive.app/docs/scripting/protocols/node-scripts)
- [Best practices](https://rive.app/docs/getting-started/best-practices.md)
- [Pricing](https://rive.app/docs/account-admin/pricing.md)
- [GPU Canvas community announcement](https://community.rive.app/c/announcements/gpu-canvas-rive-s-new-gpu-layer-for-3d-shaders-and-custom-effects)
- [rive-ios](https://github.com/rive-app/rive-ios), [rive-gamekit-examples](https://github.com/rive-app/rive-gamekit-examples)
- [Flutter iOS deploy](https://docs.flutter.dev/deployment/ios)
- [App Store submitting / 2026 SDK rules](https://developer.apple.com/app-store/submitting/)
- Megabonk: Unity, Windows/Linux, 2025 (not an iOS reference build)
