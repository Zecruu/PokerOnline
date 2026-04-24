# Velthara's Dominion — Unity Build Prompt

You are building a 3D vampire-survivors-style game called **Velthara's Dominion** in Unity using C#. The player controls a Fire God character in a **third-person 3D arena**, fighting endless waves of enemies that scale in difficulty. Enemies use **sprite-frame animation** (billboarded quads cycling through sprite sheets). The camera is a **third-person over-the-shoulder camera**. The game is singleplayer.

## PROJECT SETUP

Create a Unity project (Unity 6.3 / URP) called `VeltharaDominion`. Use Universal Render Pipeline for good performance with visual quality. Set up the following folder structure:

```
Assets/
├── Scripts/
│   ├── Core/               - GameManager, GameState, InputManager, EventBus
│   ├── Player/             - PlayerController, PlayerStats, PlayerCamera, Abilities
│   ├── Enemies/            - EnemyBase, EnemyPool, SpriteAnimator, EnemyTypes, BossBase
│   ├── Combat/             - ProjectilePool, DamageSystem, StatusEffects, SpatialHash
│   ├── Items/              - XPOrbPool, PowerUps, StackingItems
│   ├── Systems/            - WaveManager, SigilSystem, ObjectPool<T>, AudioManager
│   ├── UI/                 - HUDController, SigilMenu, BossHPBar, DamageIndicator, GameOverScreen
│   └── Data/               - ScriptableObjects (EnemyData, SigilData, WaveData, BossData)
├── ScriptableObjects/      - SO asset instances
├── Prefabs/
│   ├── Player/
│   ├── Enemies/            - Billboarded sprite quad prefab per enemy type
│   ├── Projectiles/
│   ├── Effects/            - Particle systems, fire zones, explosions
│   └── Pickups/            - XP orbs, power-up pickups
├── Sprites/
│   ├── Enemies/            - Sprite sheet PNGs per enemy type
│   ├── Bosses/             - Boss sprite sheets
│   ├── Effects/            - Fire, explosion, poison sprite textures
│   └── UI/                 - Icons, sigil art, ability icons
├── Materials/
│   ├── SpriteBillboard.mat - Shared billboard material (GPU instanced)
│   ├── Ground.mat
│   ├── Effects/
│   └── Player/
├── Shaders/
│   └── SpriteBillboard.shader - Custom billboard + sprite sheet UV offset shader
├── Audio/
│   ├── Music/
│   └── SFX/
├── Models/
│   └── Player/             - Player character model (FBX) + animations
├── Animations/
│   └── Player/             - Animator controller, animation clips
├── Scenes/
│   ├── MainMenu.unity
│   └── Arena.unity
└── Resources/              - Runtime-loaded assets if needed
```

### Unity Settings
- **Render Pipeline**: URP (Universal Render Pipeline)
- **Target Platform**: PC (Windows/Mac/Linux standalone)
- **Target FPS**: 60
- **Physics**: Minimal — use custom spatial hash, not Unity physics for enemy collision
- **Input**: New Input System (`UnityEngine.InputSystem`)
- **Scripting Backend**: IL2CPP for release builds

---

## SPRITE-FRAME ANIMATION SYSTEM

Enemies are **billboarded quads** that cycle through sprite sheet frames. This is the core rendering technique for all non-boss enemies.

### How It Works
1. Each enemy type has a **sprite sheet** (PNG atlas) with animation frames in a grid
2. Each enemy is a **Quad mesh** with the sprite sheet as its material texture
3. The quad always faces the camera (**billboard script** or shader-based billboarding)
4. Animation is done by **offsetting UV coordinates** to show the current frame
5. Frames cycle at a fixed rate (8-12 FPS sprite animation, independent of game framerate)

### Sprite Sheet Format
```
Each enemy sprite sheet is a grid:
- Row 0: Walk cycle (8 frames)
- Row 1: Attack (4 frames)
- Row 2: Death (4 frames)
- Row 3: Idle (2 frames)

Frame size: 64x64 or 128x128 pixels per frame
Sheet size: 512x256 or 1024x512 depending on enemy
```

### GPU Instancing (CRITICAL for performance)
- Use `Graphics.DrawMeshInstanced` or `Graphics.RenderMeshInstanced` to batch all enemies of the same type into a single draw call
- Per-instance data via `MaterialPropertyBlock`:
  - `_UVOffset` (Vector4): current frame UV offset (x, y, width, height)
  - `_HitFlash` (float): 0-1 white flash on damage
  - `_Scale` (float): per-enemy size
- Custom shader handles UV offset and billboarding in the vertex shader:

```hlsl
// SpriteBillboard.shader (URP compatible)
Shader "Custom/SpriteBillboard"
{
    Properties
    {
        _MainTex ("Sprite Sheet", 2D) = "white" {}
        _UVOffset ("UV Offset", Vector) = (0, 0, 0.125, 0.25)
        _HitFlash ("Hit Flash", Float) = 0
    }
    SubShader
    {
        Tags { "RenderType"="TransparentCutout" "Queue"="AlphaTest" "RenderPipeline"="UniversalPipeline" }

        Pass
        {
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile_instancing

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            UNITY_INSTANCING_BUFFER_START(Props)
                UNITY_DEFINE_INSTANCED_PROP(float4, _UVOffset)
                UNITY_DEFINE_INSTANCED_PROP(float, _HitFlash)
            UNITY_INSTANCING_BUFFER_END(Props)

            struct appdata { float4 vertex : POSITION; float2 uv : TEXCOORD0; UNITY_VERTEX_INPUT_INSTANCE_ID };
            struct v2f { float4 pos : SV_POSITION; float2 uv : TEXCOORD0; float hitFlash : TEXCOORD1; UNITY_VERTEX_INPUT_INSTANCE_ID };

            sampler2D _MainTex;

            v2f vert(appdata v)
            {
                v2f o;
                UNITY_SETUP_INSTANCE_ID(v);
                UNITY_TRANSFER_INSTANCE_ID(v, o);

                // Billboard: face camera
                float3 worldPos = unity_ObjectToWorld._m03_m13_m23;
                float3 camRight = UNITY_MATRIX_V[0].xyz;
                float3 camUp = UNITY_MATRIX_V[1].xyz;
                float3 billboardPos = worldPos + camRight * v.vertex.x + camUp * v.vertex.y;
                o.pos = mul(UNITY_MATRIX_VP, float4(billboardPos, 1.0));

                // UV offset for sprite frame
                float4 uvOff = UNITY_ACCESS_INSTANCED_PROP(Props, _UVOffset);
                o.uv = v.uv * uvOff.zw + uvOff.xy;
                o.hitFlash = UNITY_ACCESS_INSTANCED_PROP(Props, _HitFlash);
                return o;
            }

            half4 frag(v2f i) : SV_Target
            {
                half4 col = tex2D(_MainTex, i.uv);
                clip(col.a - 0.5); // alpha cutoff
                col.rgb = lerp(col.rgb, half3(1,1,1), i.hitFlash); // hit flash
                return col;
            }
            ENDHLSL
        }
    }
}
```

### SpriteAnimator.cs
- Tracks current animation state (Walk, Attack, Death, Idle) and frame index per enemy
- Advances frame on a timer (e.g., every 83ms for 12 FPS)
- Calculates UV offset: `new Vector4(frameX * frameWidth, frameY * frameHeight, frameWidth, frameHeight)`
- Sets `_UVOffset` per instance via `MaterialPropertyBlock`
- On death: switch to Death animation row, play through frames, then deactivate

---

## CAMERA SYSTEM (Third-Person)

Use Cinemachine (included in Unity 6) for the camera rig.

- **Cinemachine FreeLook Camera** or **CinemachineCamera + ThirdPersonFollow**
- Follow target: Player transform
- Look at target: Player transform (offset slightly above center)
- Camera distance: 5 units behind, 2 units above, 1 unit right (over-the-shoulder)
- Damping: Body damping 0.3, Aim damping 0.1 (responsive but smooth)
- Mouse controls camera orbit. Use New Input System mouse delta for rotation.
- Player character faces camera forward when moving (orient to camera)
- **Combat zoom-out**: When `EnemyPool.GetNearbyCount(playerPos, 10f) > 15`, lerp camera distance to 8 units
- **Boss intro**: On boss spawn, blend to a Cinemachine virtual camera that orbits the boss (2s), then blend back
- **Sensitivity**: Expose X/Y sensitivity in a settings menu

---

## CORE GAME LOOP

### GameManager.cs (Singleton)
Manages game state: `Menu`, `Playing`, `Paused`, `LevelUp`, `BossCinematic`, `GameOver`

```
Update Loop (while Playing):
1. InputManager reads inputs
2. PlayerController processes movement + abilities
3. WaveManager checks spawn timers
4. EnemyPool updates all active enemies (movement, AI, sprite frames)
5. ProjectilePool updates all active projectiles (movement, homing)
6. DamageSystem resolves hits via SpatialHash
7. StatusEffects tick burn/DOT
8. XPOrbPool updates magnet movement
9. UI updates (HUD refresh)
```

### Game Flow
1. Player spawns at arena center (0, 0, 0)
2. Enemies spawn at edges as billboarded sprites, walk toward player
3. Player aims with camera, fireballs auto-target nearest enemy in 30-degree aim cone
4. Killed enemies play death sprite frames, drop XP orbs
5. XP magnetizes toward player within pickup radius
6. Level up → `GameState = LevelUp`, pause `Time.timeScale = 0`, show sigil menu
7. Pick sigil → resume `Time.timeScale = 1`
8. Every 20 seconds wave increments, enemies scale
9. Bosses at waves 10, 15, 20, 25, 30, 35
10. HP reaches 0 → `GameState = GameOver`, show stats screen

---

## PLAYER CHARACTER: FIRE SOVEREIGN

### PlayerController.cs
- Uses New Input System for all input
- Movement: WASD relative to camera forward (camera-relative movement)
- `CharacterController` component for movement (no Rigidbody — simpler, faster)
- Movement speed: 8 units/s
- Character model rotates to face movement direction (`Quaternion.Slerp`, 720 deg/s)
- When firing: upper body aims toward crosshair via Animation Rigging or Aim IK

### Movement Abilities
- **Dodge Roll**: Spacebar. 0.4s duration, move 6 units in input direction, invincible for 0.25s, 1.5s cooldown. Trigger dodge animation via Animator.
- **Sprint**: Hold Shift. +50% speed. Disables auto-fire while held.

### Base Stats
| Stat | Value |
|------|-------|
| Max HP | 100 |
| Move Speed | 8 units/s |
| Base Damage | 15 |
| Fire Rate | 1.67 shots/sec (600ms) |
| Crit Chance | 5% |
| Crit Multiplier | 2.0x |
| XP Pickup Radius | 4 units |
| XP Multiplier | 1.2x |

### Weapons
- **Homing Fireballs**: Fire toward screen center raycast hit point. Auto-target nearest enemy within 30-degree cone, 30 unit range. If no target, fly straight. Speed: 15 units/s. Pierce 1 by default. Visual: orange emissive sphere + trail particle system.

### Abilities
- **Q — Inferno Volley**: 5 enhanced fireballs in spread toward aim point. 12s cooldown. Trigger cast animation.
- **E — Solar Cataclysm**: Fire nova at player position (18 unit radius). 300% weapon damage. 30s cooldown. Visual: expanding ring particle effect + `Cinemachine ImpulseSource` for screen shake.

### Passive: Sovereign Flame
- **Living Flame**: +1% damage per burn stack on enemies (max 10 stacks/enemy, 3s each)
- **Pyre Momentum**: +3% fire rate per second not hit (max +30%). Resets on damage.

### Player Visual
- 3D model (humanoid FBX) with Animator
- Fire particle systems on hands/shoulders (children of hand bones)
- Flame intensity scales with Pyre Momentum (particle emission rate + emissive material value)
- 5 visual tiers by level — swap material or mesh at level thresholds:
  - Lv1: dark robes, Lv6: flame armor, Lv11: blazing sovereign, Lv16: inferno lord, Lv21: god of fire

### Animator Setup
- **Animator Controller** with layers:
  - Base Layer: Locomotion blend tree (Idle → Walk → Run → Sprint, driven by speed float)
  - Upper Body Layer (Avatar Mask): Aim + Fire animations, layered over locomotion
  - Action Layer: Dodge roll, ability casts (plays via AnimatorOverrideController or trigger params)
- **Blend Tree**: 2D Freeform Directional for locomotion (forward, backward, strafe left/right)
- **Aim**: Animation Rigging package — Multi-Aim Constraint on spine/chest bones pointing at aim target
- **Montage-style**: Abilities use Animator triggers (`TriggerInfernoVolley`, `TriggerSolarCataclysm`)

---

## ENEMY SYSTEM

### EnemyData.cs (ScriptableObject)
```csharp
[CreateAssetMenu(fileName = "NewEnemy", menuName = "Velthara/EnemyData")]
public class EnemyData : ScriptableObject
{
    public string enemyName;
    public float radius;
    public float speed;
    public float maxHP;
    public float damage;
    public float xpValue;
    public float attackCooldown;
    public Texture2D spriteSheet;
    public int framesPerRow;
    public int totalRows;
    public int walkFrames, attackFrames, deathFrames, idleFrames;
    public float spriteScale;
    public EnemyBehavior specialBehavior;
}

public enum EnemyBehavior { None, Splitter, Bomber, XPStealer, Necromancer, Wraith, FireTrail, Leech }
```

### Enemy Types (ScriptableObject instances)

| Type | Radius | Speed | HP | Damage | XP | Behavior |
|------|--------|-------|----|--------|-----|----------|
| Swarm | 0.8 | 2.5 | 100 | 25 | 2 | None |
| Basic | 0.7 | 2.2 | 150 | 35 | 6 | None |
| Runner | 0.8 | 4.0 | 200 | 25 | 5 | None |
| Tank | 1.2 | 2.0 | 1750 | 60 | 25 | None (show HP bar) |
| Splitter | 0.9 | 2.8 | 750 | 40 | 15 | Splitter |
| Bomber | 0.8 | 3.5 | 375 | 30 | 12 | Bomber |
| Mini | 0.5 | 4.7 | 125 | 22 | 3 | None |
| Goblin | 1.0 | 3.8 | 200 | 20 | 0 | XPStealer |
| Necromancer | 0.9 | 1.3 | 600 | 25 | 20 | Necromancer |
| Wraith | 0.9 | 3.3 | 450 | 40 | 15 | Wraith |
| Magma Crawler | 1.3 | 1.3 | 2500 | 80 | 30 | FireTrail |
| Leech | 0.8 | 2.3 | 800 | 15 | 20 | Leech |

### EnemyPool.cs — Object Pool
```csharp
public class EnemyPool : MonoBehaviour
{
    // Pre-instantiate enemy quads at startup. Keep them disabled.
    // "Spawn": enable quad, set position, reset HP, set sprite sheet, mark active
    // "Death": play death frames, disable quad, mark inactive
    // NEVER use Instantiate/Destroy during gameplay

    // Pool sizes:
    // Swarm: 200, Basic: 100, Runner: 80, all others: 40 each

    // Use Graphics.DrawMeshInstanced for rendering — skip individual GameObjects
    // OR use GameObjects with MeshRenderer + GPU instancing enabled on material
}
```

### Enemy Movement
- Every active enemy: `direction = (playerPos - enemyPos).normalized`
- `enemyPos += direction * speed * Time.deltaTime`
- No NavMesh, no Rigidbody, no Unity physics. Pure transform movement.
- On reaching player (distance < sum of radii): deal damage per attack cooldown timer

### Special Behaviors
- **Splitter**: On death, spawn 3 minis at death position
- **Bomber**: On death, `SpatialHash.QueryRadius(deathPos, 5f)` → damage player if in range. Spawn explosion particle.
- **Goblin**: Move toward nearest XP orb (query from XPOrbPool) within 2 units. Steal on contact.
- **Necromancer**: Every 3s, activate 1-2 ghost enemies from pool at necromancer position
- **Wraith**: Toggle visibility every 2.5s. When invisible: set alpha to 0.15, set invulnerable flag.
- **Magma Crawler**: Every 0.5s, place fire zone at position (pool of ground decal objects, 1.5 radius, 12 DPS, 4s lifetime)
- **Leech**: On contact, parent to player transform, drain HP continuously

### Hit Flash
- On damage: set `_HitFlash` property to 1.0, lerp back to 0 over 0.1s

### Enemy Wave Gating
- Waves 1-2: swarm only
- Wave 3+: basic, runner
- Wave 4+: bomber
- Wave 5+: goblin, necromancer, splitter OR tank (random per run)
- Wave 6+: cinder_wretch
- Wave 8+: wraith
- Wave 10+: magma_crawler, leech

### Stat Scaling Per Wave
```
WaveMultiplier:
  Waves 1-9:   1.0 + (wave-1) * 0.05
  Waves 10-15: 1.45 + (wave-9) * 0.16
  Waves 16+:   2.41 + (wave-15) * 0.24

DifficultyTier:
  Waves 1-5:   HP x0.60, DMG x0.55
  Waves 6-10:  HP x0.90, DMG x0.90
  Waves 11-15: HP x1.25, DMG x1.20
  Waves 16+:   HP x1.85, DMG x1.80

FinalHP  = BaseHP  * WaveMultiplier * DifficultyTier.HP * 0.35
FinalDMG = BaseDMG * WaveMultiplier * DifficultyTier.DMG
FinalSpeed = BaseSpeed * 1.5
```

### Spawn System (WaveManager.cs)
- Base interval: 500ms
- Spawn rate multiplier by wave:
  - Wave 1: 0.60 (300ms = 3.3/sec)
  - Waves 2-3: 0.50 (4/sec)
  - Waves 4-6: 0.40 (5/sec)
  - Waves 7-9: 0.32 (6.25/sec)
  - Waves 10-12: 0.26 (7.7/sec)
  - Waves 13-15: 0.22 (9/sec)
  - Waves 16+: 0.18 (11.1/sec)

- Max alive enemies (non-boss):
  - Waves 1-3: 60, Waves 4-6: 100, Waves 7-9: 160
  - Waves 10-12: 250, Waves 13-15: 350, Waves 16-20: 450, Waves 21+: 500

- Spawn distance: 20-30 units from player (swarm: 15-22)
- Random angle, **biased 70% behind/sides, 30% in front** of player facing direction
- Enemies spawning behind the player create tension with the limited third-person FOV

### SpatialHash.cs (CRITICAL for performance)
```csharp
public class SpatialHash
{
    private float cellSize = 5f;
    private Dictionary<int, List<int>> grid; // cell hash → list of enemy indices

    public void Clear() { /* clear all cells */ }
    public void Insert(int enemyIndex, Vector3 position) { /* hash position to cell, add */ }
    public List<int> QueryRadius(Vector3 center, float radius) { /* check cells in radius, return nearby */ }

    // Used by: homing projectiles, AOE damage, XP magnet, damage indicators
}
```

---

## BOSS SYSTEM

Bosses are standalone GameObjects (not instanced sprites). They can be larger sprites or simple 3D meshes for more visual impact.

### BossBase.cs
```csharp
public abstract class BossBase : MonoBehaviour
{
    public float maxHP, currentHP, damage, speed, radius;
    public float survivalTimer;
    public float critResistance = 0.825f; // 82.5% crit resistance

    // Boss does NOT count toward enemy cap
    // Show BossHPBar UI when active
    // Play boss music via AudioManager
    // Boss intro: Cinemachine blend to boss cam for 2s
    // On death: drop stacking item + sigil, play death VFX
    // On timer expire: despawn with VFX

    protected abstract void BossUpdate(); // Per-boss AI
}
```

### Boss 1: PLAGUE WEAVER (Wave 10)
- HP: 80,000 | Damage: 100 | Speed: 1.3 | Radius: 3 | Timer: 75s
- **Toxic Zones**: Up to 6 green ground decals (DOT, 3 unit radius, 25 DPS)
- **Tentacles**: 3 sweeping arcs, red warning lines 1s before
- **Spore Burst**: Every 8s, 8 poison projectiles outward
- Phases: Normal → Corruption → Pandemic

### Boss 2: THE CONSUMER (Wave 15)
- HP: 175,000 | Damage: 300 | Speed: 1.0 | Radius: 4 | Timer: 90s
- **Consume**: Absorbs non-boss enemies within 8 units, grows larger
- **Pull Aura**: Pulls enemies within 12 units toward itself
- **Shockwave**: Every 6s, AOE if player within 7 units
- **Void Bolt**: Every 4s, homing projectile at player
- Enrages at 50% HP

### Boss 3: RIFT LORD (Wave 20)
- HP: 200,000 | Damage: 150 | Speed: 0 (teleports) | Radius: 2.5 | Timer: 90s
- **Teleport**: Every 8s + explosion at old position
- **Pillars**: Up to 4 energy pillars with beam walls (LineRenderer + damage trigger)
- **Portals**: Spawn elite enemies
- **Void Slam**: Every 12s, expanding ring damage
- **Shield**: Every 20s, temporary damage absorption

### Boss 4: BROOD QUEEN (Wave 25)
- HP: 300,000 | Damage: 120 | Speed: 1.7 | Radius: 2.5 | Timer: 90s
- **Eggs**: Lays eggs (500 HP, 5s hatch) that spawn swarms
- **Dash**: Charges at player at 13 units/s
- **Acid Rain**: Every 12s, DOT zones under player
- **Mini-Queens**: Phase 3, spawns 2 smaller copies

### Boss 5: THE ARCHITECT (Wave 30)
- HP: 250,000 | Damage: 0 | Speed: 0 (teleports) | Timer: 90s
- **Traps**: Floor traps activate on player proximity
- **Cages**: Energy cages trap player (breakable, 300-500 HP)
- **Maze Walls**: Temporary wall segments
- **Arena Shift**: Shrinks boundary temporarily

### Boss 6: LEVIATHAN (Wave 35)
- HP: 400,000 | Damage: 150 | Speed: 2.7 | Timer: 100s
- **Segmented Body**: 12 segments. Head normal, middle weak point 3x, tail 0.5x
- **Beam Attack**: 3s beam with warning telegraph
- **Tail Shock**: Tail slam shockwave
- **Split**: At 40% HP, spawns clone with 30% max HP

---

## SIGIL SYSTEM (Level-Up Rewards)

### SigilData.cs (ScriptableObject)
```csharp
[CreateAssetMenu(fileName = "NewSigil", menuName = "Velthara/SigilData")]
public class SigilData : ScriptableObject
{
    public string sigilName;
    public string description;
    public SigilTier tier;
    public Sprite icon;
    public StatModifier[] modifiers;
    public bool isClassSpecific;
}

public enum SigilTier { Faded, Runed, Empowered, Ascendant, Mythic }
```

On level up: `Time.timeScale = 0`, show UI Canvas with 3 sigil cards. Player clicks one. Apply stat modifiers. `Time.timeScale = 1`.

### Sigil Tiers
| Tier | Color | Weight | Stat Ranges |
|------|-------|--------|-------------|
| Faded (Common) | Gray | 55% | Low |
| Runed (Uncommon) | Blue | 30% | Medium |
| Empowered (Rare) | Purple | 12% | High |
| Ascendant (Epic) | Gold | 2.5% | Very high |
| Mythic (Legendary) | Red | 0.5% | Extreme |

### Stat Ranges Per Tier
```
FADED:     DMG +5-15,   FireRate +3-8%,   Speed +5-12%,  HP +20-60,    Crit +1-3%
RUNED:     DMG +18-40,  FireRate +10-18%,  Speed +12-20%, HP +80-180,   Crit +4-8%
EMPOWERED: DMG +65-130, FireRate +22-35%,  Speed +22-35%, HP +300-500,  Crit +9-15%
ASCENDANT: DMG +150-250,FireRate +35-50%,  Speed +35-50%, HP +600-1000, Crit +15-22%
MYTHIC:    DMG +300-500,FireRate +50-80%,  Speed +50-80%, HP +1200-2000,Crit +25-35%
```

### Tier Wave Restrictions
- Waves 1-9: Faded only
- Waves 10-19: Faded + Runed
- Waves 20+: All tiers

### Class-Specific Sigils (Fire Sovereign)

**Faded:** Ember Touch (+15% burn DPS), Kindling (+1 burn stack), Flame Reach (+20% homing range)

**Runed:** Conflagration (burn spreads from max-stacked), Molten Core (30% burn as instant), Blazing Pursuit (+40% fireball speed +1 pierce)

**Empowered:** Phoenix Ascendancy (revive once at 30% HP + Solar Cataclysm), Eternal Pyre (burn never expires +25% burn DPS)

**Ascendant:** Supernova (Solar Cataclysm +60% radius + burning ground 6s), Immolation Aura (Inferno Volley +3 fireballs +2 burn stacks each)

Every 10 waves, guarantee 1 class-specific sigil in choices.

---

## STACKING ITEMS (Boss Drops)

| Item | Stack Source | Base Effect | Evolve At | Evolved Effect |
|------|-------------|-------------|-----------|----------------|
| Crit Blade | Damage dealt | +0.001% crit dmg/stack | 50K | 3x crit + doubled scaling |
| Ring of XP | Kills | +0.05% XP/stack | 3K | +150% XP, double orbs |
| Boots of Swiftness | Distance moved | +0.01% speed/stack (cap +50%) | 50K | +50% speed + dash |
| Heart of Vitality | Kills | +1 max HP/stack | Infinite | +2 HP/stack + 0.5% regen/5s |
| Blood Soaker | Damage dealt | Blood shield (1% dmg, cap 250-1000) | 150K | Shield explodes + heals 10% |

---

## POWER-UPS (Rare Enemy Drops)

0.5% drop chance per kill. Floating spinning pickup (pooled). Despawn after 15s.

| Power-Up | Duration | Effect |
|----------|----------|--------|
| Berserker Rage | 15s | +100% damage, +30% attack speed, +25% damage taken |
| Chain Lightning | 12s | Hits chain to 3 nearby enemies for 50% damage |
| Piercing Rounds | 10s | Projectiles pierce infinitely |
| XP Feast | 15s | 3x XP gain, 3x magnet range |
| Speed Demon | 12s | +80% speed, fire trail (30% weapon damage) |
| Magnet | 10s | Infinite pickup range, vacuum all XP |

---

## XP AND LEVELING

- Starting XP to level: 50
- Level 1-19: next = current * 1.15
- Level 20-59: next = current * 1.10
- Level 60+: next = current * 1.30
- XP orbs: pooled small emissive gold spheres (GPU instanced). Magnetize toward player at 7 units/s within pickup radius.
- Enemy XP scaled by wave multiplier

---

## ARENA

- Flat ground plane: 90x90 units
- Ground: Dark cracked texture with subtle red emissive cracks (URP Lit shader with emission map)
- `RenderSettings.fog = true` — dark red exponential fog
- Ember particles: ParticleSystem with small orange sprites drifting upward across the arena
- Faint grid lines on ground (texture overlay or decals)
- Boundary: invisible collider at edges + red pulsing post-processing vignette when near edge
- Scattered environmental meshes (no colliders): broken pillars, ember braziers (point lights with flicker script), cracked platforms
- **Lighting**: Directional light (low angle, warm orange), ambient light (dim red-purple), player has a point light child (orange, follows character)
- **Post-Processing**: URP Volume — bloom (for fire effects), vignette (for boundary warning), color grading (dark warm tones)

---

## UI REQUIREMENTS (Unity UI Toolkit or Canvas)

Use **Unity UI Toolkit** (preferred for Unity 6) or **Canvas + TextMeshPro** for all UI.

### HUD (Always Visible)
- **Top center**: Wave number, timer (MM:SS), difficulty tier name
- **Top left**: HP bar (red gradient), XP bar (gold gradient) with level number
- **Top right**: Stats panel — DMG, ATK SPD, SPEED, CRIT, HP, REGEN, CC RES, LUCK
- **Bottom center**: Ability cooldown icons (Q and E) with radial fill cooldown overlay
- **Center screen**: Crosshair (small dot, semi-transparent)
- **Screen edges**: Directional damage indicators — red chevron UI elements rotated to point toward damage source (use `Mathf.Atan2` from screen-space damage direction)
- **Bottom left**: Radial enemy proximity indicator (small dots on a mini-circle)
- **Top right corner**: Kill counter

### Level-Up Sigil Menu (Pauses Game)
- 3 sigil cards side by side, centered
- Colored border per tier, sigil name, icon, stat description
- Button click to select → `EventBus.Publish(new SigilSelectedEvent(sigil))`
- Semi-transparent dark overlay behind cards

### Boss HP Bar
- Full-width bar at top during boss fights
- Boss name, HP %, survival timer countdown

### Game Over Screen
- Dark overlay, centered panel
- Stats: kills, wave reached, time survived, sigils collected, items

---

## PERFORMANCE TARGETS

- **60 FPS with 500 sprite enemies** on mid-range PC
- GPU instancing on ALL enemy sprites — one draw call per enemy type
- GPU instancing on XP orbs — one draw call
- GPU instancing on fireballs — one draw call
- **SpatialHash** for all proximity queries (cell size 5 units)
- **Object pooling** for ALL runtime objects: enemies, projectiles, XP orbs, fire zones, particles
- ZERO `Instantiate`/`Destroy` during gameplay
- Particle systems: use ParticleSystem pooling or sub-emitters, cap max particles
- **Frustum culling**: Unity handles this, but manually skip sprite frame updates for enemies outside camera view frustum
- Target draw calls: < 30
- Target SetPass calls: < 15
- Use Unity Profiler to verify. If dropping below 60 FPS with 300+ enemies, check batching first.

---

## BUILD ORDER (Implement in this order)

### Phase 1: Foundation
1. Unity project setup — URP template, folder structure, packages (Cinemachine, Input System, Animation Rigging)
2. Arena scene — ground plane, lighting, fog, boundary colliders, post-processing volume
3. Third-person camera — Cinemachine FreeLook or ThirdPersonFollow, mouse orbit, pointer lock via `Cursor.lockState`
4. Player character — CharacterController, WASD camera-relative movement, placeholder capsule
5. Crosshair UI + aim raycast (`Camera.main.ScreenPointToRay` from screen center)

### Phase 2: Sprite Enemies + Combat
6. SpriteBillboard shader (billboard + UV offset + instancing + hit flash)
7. SpriteAnimator — frame cycling logic, UV offset calculation
8. EnemyPool — pooled billboard quads, GPU instanced rendering, spawn/despawn
9. Enemy movement toward player (direct transform movement, no NavMesh)
10. SpatialHash for proximity queries
11. ProjectilePool — pooled fireball spheres, homing toward aim cone target
12. DamageSystem — hit detection via SpatialHash, hit flash, death animation
13. XP orb pool — instanced gold spheres, magnet pickup

### Phase 3: Progression + UI
14. HUD — HP bar, XP bar, wave counter, stats panel, crosshair, kill counter
15. Level-up system with XP curve
16. Sigil selection menu — 3 cards, click to select, apply stat modifiers
17. WaveManager — 20s waves, scaling formulas, enemy type gating
18. Directional damage indicators + enemy proximity radar

### Phase 4: Player Content
19. Dodge roll with i-frames + animation
20. Sprint
21. Q ability (Inferno Volley) + E ability (Solar Cataclysm) + screen shake via Cinemachine Impulse
22. Burn/status effect system (StatusEffects.cs)
23. Passives (Living Flame, Pyre Momentum)
24. All enemy types with special behaviors
25. Class-specific sigils
26. Player animator — locomotion blend tree, aim offset, ability triggers

### Phase 5: Bosses
27. BossBase — HP bar UI, crit resistance, survival timer, Cinemachine intro blend
28. Plague Weaver
29. The Consumer
30. Rift Lord
31. Brood Queen
32. The Architect
33. Leviathan

### Phase 6: Items + Polish
34. Stacking items system
35. Power-up drops
36. Game over screen with stats
37. Audio — AudioManager with pooled AudioSources, music crossfade
38. Particle effects polish — fire trails, explosions, embers
39. Visual tier swaps for player character at level thresholds
40. Performance profiling + optimization pass (Unity Profiler, Frame Debugger)

---

## KEY ARCHITECTURE DECISIONS

- **ScriptableObjects for all data** — enemy types, sigils, wave configs, boss data. Editable in Unity Inspector.
- **No Unity physics for enemies** — custom SpatialHash + transform movement. Physics is overkill for 500 enemies moving in a straight line.
- **GPU instancing everything** — enemies, orbs, projectiles. Material must have "Enable GPU Instancing" checked.
- **Object pool for everything** — generic `ObjectPool<T>` class reused across all pooled systems.
- **EventBus pattern** — static event system for decoupled communication: `OnEnemyDeath`, `OnLevelUp`, `OnWaveChange`, `OnBossSpawn`. No `FindObjectOfType` or tight coupling.
- **CharacterController for player** — not Rigidbody. Simpler, no physics jitter, manual gravity.
- **Cinemachine for camera** — don't write custom camera code. Cinemachine handles follow, orbit, damping, impulse, blending.
- **New Input System** — action maps for gameplay vs UI. Rebindable. Controller support easy to add later.
- **Sprite billboard shader** is the performance backbone — custom URP-compatible shader with instanced properties.

---

## IMPORTANT NOTES

- This is a **SINGLEPLAYER** game. No networking, no Netcode.
- Game feel: Vampire Survivors meets God of War. Non-stop action, constant progression, visceral third-person combat.
- **Sprite-frame enemies are the key** — 500 billboarded quads with GPU instancing is trivial for Unity. Don't overcomplicate with skeletal meshes.
- Third-person camera makes spatial awareness a core skill — enemies from behind are threatening.
- Start with **colored placeholder quads** for enemies and a **capsule** for the player. Get the gameplay loop working first.
- Test with 300+ enemies early. Open the Unity Profiler. If batching isn't working, check material GPU instancing settings.
- `Cursor.lockState = CursorLockMode.Locked` on game start for mouse camera control.
- **Animation Rigging** package for upper body aim. Don't try to manually rotate bones.
- PC only. Keyboard + mouse. No mobile.
