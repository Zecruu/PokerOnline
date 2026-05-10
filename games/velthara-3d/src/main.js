import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// ─── CONSTANTS ──────────────────────────────────────────────
const ARENA_SIZE = 100;
const PLAYER_SPEED = 10.5;
const JUMP_VELOCITY = 8.5;
const GRAVITY = 24;
const ENEMY_SPEED_BASE = 1;
// 2D Fire Sovereign cadence: ~0.681 attacks/sec ("Caitlyn-style" deliberate weight)
const SHOOT_COOLDOWN = 1.468;
const FIRE_SLASH_RANGE = 5.6;
const FIRE_SLASH_HALF_ANGLE = 0.59;
const FIRE_SLASH_VISUAL_TIME = 0.38;
const FIREBALL_SPEED = 15;
const FIREBALL_TURN_RATE = 10;
const FIREBALL_LIFE = 3.2;
const PLAYER_MODEL_YAW_OFFSET = Math.PI;
const INFERNO_VOLLEY_COOLDOWN = 12;
const SOLAR_CATACLYSM_COOLDOWN = 50;
const SOLAR_CATACLYSM_RADIUS = 10.5;
const SOLAR_CATACLYSM_TIME = 0.9;
const BURN_STACK_DURATION = 4;
const MAX_BURN_STACKS = 10;
const BURN_DPS_PER_STACK = 5;
const HEAT_CONDUCTION_INTERVAL = 5;
const HEAT_CONDUCTION_RADIUS = 7.5;
const PYRE_MOMENTUM_RATE = 0.03;
const PYRE_MOMENTUM_MAX = 0.3;
// Pyre Fuel scaling per stack (matches 2D pyre_fuel: damageMult = 1 + stacks * 0.005).
const PYRE_FUEL_DMG_PER_STACK = 0.005;
// Conflagration sigil: burn spreads from max-stacked enemies every CONFLAG_INTERVAL.
const CONFLAGRATION_INTERVAL = 2;
const CONFLAGRATION_SPREAD_RADIUS = 5.5;
// Supernova sigil burning-ground: 2D values are 200 DPS for 6s.
const SUPERNOVA_GROUND_DPS = 32;
const SUPERNOVA_GROUND_DURATION = 6;
const MAX_ACTIVE_PARTICLES = 110;
const SOUL_CHEST_INTERVAL = 25;
const SOUL_CHEST_OPEN_RANGE = 2.3;
const CAMERA_DISTANCE = 6.5;
const CAMERA_HEIGHT = 2.65;
const CAMERA_LOOK_HEIGHT = 1.45;
const CAMERA_LOOK_AHEAD = 5.0;
// Reduced from 3.25: large shoulder offset made W feel like walking at a leftward angle.
const CAMERA_SHOULDER = 0.8;
const CAMERA_MIN_PITCH = -0.55;
const CAMERA_MAX_PITCH = -0.04;
// Mutable so the Settings modal can rescale it live without a reload.
let CAMERA_MOUSE_SENSITIVITY = 0.0022;

// ─── THREE.JS SETUP ────────────────────────────────────────
const scene = new THREE.Scene();

// Smouldering volcanic sky: orange-tinted ash above, charred black at the horizon.
const bgCanvas = document.createElement("canvas");
bgCanvas.width = 1;
bgCanvas.height = 512;
const bgCtx = bgCanvas.getContext("2d");
const grad = bgCtx.createLinearGradient(0, 0, 0, 512);
grad.addColorStop(0, "#3a0a04");
grad.addColorStop(0.35, "#1f0805");
grad.addColorStop(0.7, "#120402");
grad.addColorStop(1, "#070202");
bgCtx.fillStyle = grad;
bgCtx.fillRect(0, 0, 1, 512);
const bgTexture = new THREE.CanvasTexture(bgCanvas);
scene.background = bgTexture;

// Dense reddish-black ash haze
scene.fog = new THREE.FogExp2(0x1a0905, 0.020);

const camera = new THREE.PerspectiveCamera(
  58,
  window.innerWidth / window.innerHeight,
  0.1,
  200,
);
camera.position.set(0, CAMERA_HEIGHT, CAMERA_DISTANCE);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.4;
document.body.appendChild(renderer.domElement);

// ─── LIGHTING ───────────────────────────────────────────────
// Warm dim ambient — like firelight bouncing off ash.
const ambientLight = new THREE.AmbientLight(0x553318, 1.0);
scene.add(ambientLight);

// Hot orange-red sun cutting through volcanic smoke.
const mainLight = new THREE.DirectionalLight(0xff7728, 2.2);
mainLight.position.set(10, 20, 10);
mainLight.castShadow = true;
mainLight.shadow.mapSize.set(1024, 1024);
mainLight.shadow.camera.left = -45;
mainLight.shadow.camera.right = 45;
mainLight.shadow.camera.top = 45;
mainLight.shadow.camera.bottom = -45;
mainLight.shadow.camera.far = 110;
scene.add(mainLight);

// Cool counter-fill so silhouettes don't crush to pure black.
const fillLight = new THREE.DirectionalLight(0x4a2008, 0.55);
fillLight.position.set(-8, 10, -8);
scene.add(fillLight);

// Point light on player (Fire Sovereign aura)
const playerLight = new THREE.PointLight(0xff6a00, 1.85, 14);
playerLight.position.set(0, 2, 0);
scene.add(playerLight);

// ─── ARENA ──────────────────────────────────────────────────
// Ground
const groundGeo = new THREE.PlaneGeometry(
  ARENA_SIZE * 2,
  ARENA_SIZE * 2,
  70,
  70,
);
// Charred basalt floor with faint magma cracks (subtle emissive).
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x130806,
  emissive: 0x3a0c02,
  emissiveIntensity: 0.18,
  roughness: 0.95,
  metalness: 0.06,
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Faint amber gridlines like glowing seams in cooled lava.
const gridHelper = new THREE.GridHelper(ARENA_SIZE * 2, 100, 0x4a1a06, 0x2a0c04);
gridHelper.position.y = 0.01;
scene.add(gridHelper);

// Lava pools — discs of glowing emissive material scattered across the arena.
const lavaPoolMat = new THREE.MeshBasicMaterial({ color: 0xff5012 });
for (let i = 0; i < 9; i++) {
  const r = 1.6 + Math.random() * 2.4;
  const pool = new THREE.Mesh(new THREE.CircleGeometry(r, 24), lavaPoolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(randomArenaPos(6), 0.02, randomArenaPos(6));
  scene.add(pool);
  // Glowing rim light from each pool
  const poolLight = new THREE.PointLight(0xff5012, 0.55, r * 4.5);
  poolLight.position.set(pool.position.x, 0.5, pool.position.z);
  scene.add(poolLight);
  // Heat shimmer ring (slightly bigger, dimmer)
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(r * 1.02, r * 1.45, 24),
    new THREE.MeshBasicMaterial({ color: 0x9c2a04, transparent: true, opacity: 0.3, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(pool.position.x, 0.015, pool.position.z);
  scene.add(ring);
}

// Arena boundary walls — now glowing red instead of purple.
const wallMat = new THREE.MeshStandardMaterial({
  color: 0xb83612,
  transparent: true,
  opacity: 0.18,
  emissive: 0xff5a0a,
  emissiveIntensity: 0.3,
});
const wallGeo = new THREE.BoxGeometry(ARENA_SIZE * 2, 3, 0.3);
const walls = [
  new THREE.Mesh(wallGeo, wallMat),
  new THREE.Mesh(wallGeo, wallMat),
  new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, ARENA_SIZE * 2), wallMat),
  new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, ARENA_SIZE * 2), wallMat),
];
walls[0].position.set(0, 1.5, -ARENA_SIZE);
walls[1].position.set(0, 1.5, ARENA_SIZE);
walls[2].position.set(ARENA_SIZE, 1.5, 0);
walls[3].position.set(-ARENA_SIZE, 1.5, 0);
walls.forEach((w) => scene.add(w));

// ─── TERRAIN DECORATIONS ────────────────────────────────────
const decoGroup = new THREE.Group();
scene.add(decoGroup);
const terrainBlockers = [];

// Volcanic stone palette — charred basalt with faint embers in the cracks.
const stoneMat = new THREE.MeshStandardMaterial({
  color: 0x2c1410,
  emissive: 0x4a1a06,
  emissiveIntensity: 0.06,
  roughness: 0.88,
  metalness: 0.08,
});
const darkStoneMat = new THREE.MeshStandardMaterial({
  color: 0x1a0a06,
  roughness: 0.92,
  metalness: 0.05,
});
const deadWoodMat = new THREE.MeshStandardMaterial({
  color: 0x1a0c06,
  roughness: 0.95,
  metalness: 0.0,
});
const deadLeafMat = new THREE.MeshStandardMaterial({
  color: 0x2a0c04,
  emissive: 0x6a1c04,
  emissiveIntensity: 0.18,
  roughness: 0.85,
  metalness: 0.0,
});
const cliffMat = new THREE.MeshStandardMaterial({
  color: 0x231410,
  emissive: 0x3a0c02,
  emissiveIntensity: 0.05,
  roughness: 0.95,
  metalness: 0.0,
});

function randomArenaPos(margin) {
  return (Math.random() - 0.5) * (ARENA_SIZE * 2 - margin * 2);
}

// Tombstones (tall thin boxes)
const tombGeo = new THREE.BoxGeometry(0.4, 1.2, 0.15);
const tombTopGeo = new THREE.BoxGeometry(0.5, 0.15, 0.18);
for (let i = 0; i < 12; i++) {
  const tombGroup = new THREE.Group();
  const base = new THREE.Mesh(tombGeo, stoneMat);
  base.position.y = 0.6;
  base.castShadow = true;
  base.receiveShadow = true;
  tombGroup.add(base);
  const top = new THREE.Mesh(tombTopGeo, stoneMat);
  top.position.y = 1.25;
  top.castShadow = true;
  tombGroup.add(top);
  tombGroup.position.set(randomArenaPos(3), 0, randomArenaPos(3));
  tombGroup.rotation.y = Math.random() * Math.PI * 2;
  // Slight tilt for weathered look
  tombGroup.rotation.z = (Math.random() - 0.5) * 0.15;
  decoGroup.add(tombGroup);
}

// Dead trees (cylinder trunk + bare sphere canopy)
const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 3, 6);
const branchGeo = new THREE.CylinderGeometry(0.03, 0.06, 1.5, 5);
for (let i = 0; i < 8; i++) {
  const treeGroup = new THREE.Group();
  const trunk = new THREE.Mesh(trunkGeo, deadWoodMat);
  trunk.position.y = 1.5;
  trunk.castShadow = true;
  treeGroup.add(trunk);
  // Bare branches
  for (let b = 0; b < 3; b++) {
    const branch = new THREE.Mesh(branchGeo, deadWoodMat);
    branch.position.y = 2.2 + b * 0.4;
    branch.rotation.z = (Math.random() - 0.5) * 1.2;
    branch.rotation.y = Math.random() * Math.PI * 2;
    branch.castShadow = true;
    treeGroup.add(branch);
  }
  // Dark wispy canopy
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 6, 6),
    deadLeafMat,
  );
  canopy.position.y = 3.2;
  canopy.scale.y = 0.6;
  canopy.castShadow = true;
  treeGroup.add(canopy);
  treeGroup.position.set(randomArenaPos(4), 0, randomArenaPos(4));
  decoGroup.add(treeGroup);
}

// Rock clusters
const rockGeos = [
  new THREE.DodecahedronGeometry(0.4, 0),
  new THREE.DodecahedronGeometry(0.6, 0),
  new THREE.DodecahedronGeometry(0.3, 0),
];
for (let i = 0; i < 10; i++) {
  const clusterGroup = new THREE.Group();
  const count = 2 + Math.floor(Math.random() * 3);
  for (let r = 0; r < count; r++) {
    const rock = new THREE.Mesh(rockGeos[r % rockGeos.length], darkStoneMat);
    rock.position.set(
      (Math.random() - 0.5) * 1.5,
      rockGeos[r % rockGeos.length].parameters.radius * 0.5,
      (Math.random() - 0.5) * 1.5,
    );
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.scale.y = 0.5 + Math.random() * 0.5;
    rock.castShadow = true;
    rock.receiveShadow = true;
    clusterGroup.add(rock);
  }
  clusterGroup.position.set(randomArenaPos(3), 0, randomArenaPos(3));
  decoGroup.add(clusterGroup);
}

// Broken cliff shelves: readable terrain that also lightly blocks movement.
const cliffLayouts = [
  { x: -24, z: -18, w: 15, d: 5, h: 3.2 },
  { x: 25, z: -26, w: 18, d: 5, h: 4.2 },
  { x: -34, z: 25, w: 20, d: 6, h: 3.7 },
  { x: 30, z: 31, w: 16, d: 5, h: 3.1 },
  { x: 0, z: -42, w: 22, d: 5, h: 3.5 },
];
for (const c of cliffLayouts) {
  const cliff = new THREE.Mesh(new THREE.BoxGeometry(c.w, c.h, c.d), cliffMat);
  cliff.position.set(c.x, c.h * 0.5, c.z);
  // Removed yaw randomisation — keep cliffs axis-aligned so AABB collision matches the visual mesh.
  cliff.castShadow = true;
  cliff.receiveShadow = true;
  decoGroup.add(cliff);
  // AABB blocker (was a circle that overshot the short axis on elongated cliffs).
  terrainBlockers.push({
    type: "aabb",
    x: c.x,
    z: c.z,
    halfW: c.w * 0.5,
    halfD: c.d * 0.5,
  });
}

// ─── DISTANT HORIZON — ruins and mountains beyond walls ────
const horizonGroup = new THREE.Group();
scene.add(horizonGroup);
// Distant volcanic peaks — dark silhouettes with faint magma rim glow.
const ruinMat = new THREE.MeshStandardMaterial({
  color: 0x150806,
  roughness: 1,
  metalness: 0,
});
const mountainMat = new THREE.MeshStandardMaterial({
  color: 0x0a0402,
  emissive: 0x4a1004,
  emissiveIntensity: 0.04,
  roughness: 1,
  metalness: 0,
});

// Mountains (large cones/pyramids beyond arena)
for (let i = 0; i < 16; i++) {
  const angle = (i / 16) * Math.PI * 2 + Math.random() * 0.3;
  const dist = ARENA_SIZE + 15 + Math.random() * 25;
  const h = 8 + Math.random() * 15;
  const r = 5 + Math.random() * 8;
  const mtn = new THREE.Mesh(
    new THREE.ConeGeometry(r, h, 5 + Math.floor(Math.random() * 3)),
    mountainMat,
  );
  mtn.position.set(Math.cos(angle) * dist, h * 0.5, Math.sin(angle) * dist);
  mtn.rotation.y = Math.random() * Math.PI;
  horizonGroup.add(mtn);
}

// Ruined pillars beyond walls
for (let i = 0; i < 10; i++) {
  const angle = (i / 10) * Math.PI * 2 + Math.random() * 0.4;
  const dist = ARENA_SIZE + 3 + Math.random() * 8;
  const h = 2 + Math.random() * 5;
  const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.8, h, 0.8), ruinMat);
  pillar.position.set(Math.cos(angle) * dist, h * 0.5, Math.sin(angle) * dist);
  pillar.rotation.y = Math.random() * 0.5;
  // Slight lean
  pillar.rotation.z = (Math.random() - 0.5) * 0.2;
  pillar.castShadow = true;
  horizonGroup.add(pillar);
}

// ─── AMBIENT ASH/EMBERS ─────────────────────────────────────
// Continuously falling/floating embers + ash flakes for volcanic atmosphere.
const ASH_COUNT = 220;
const ashGeometry = new THREE.BufferGeometry();
const ashPositions = new Float32Array(ASH_COUNT * 3);
const ashVelocities = new Float32Array(ASH_COUNT * 3);
const ashIsEmber = new Float32Array(ASH_COUNT);
for (let i = 0; i < ASH_COUNT; i++) {
  const i3 = i * 3;
  ashPositions[i3] = (Math.random() - 0.5) * ARENA_SIZE * 2;
  ashPositions[i3 + 1] = Math.random() * 28;
  ashPositions[i3 + 2] = (Math.random() - 0.5) * ARENA_SIZE * 2;
  ashVelocities[i3] = (Math.random() - 0.5) * 0.4;
  ashVelocities[i3 + 1] = -0.5 - Math.random() * 0.6;
  ashVelocities[i3 + 2] = (Math.random() - 0.5) * 0.4;
  // 18% of particles are bright orange embers, the rest are pale ash flakes.
  ashIsEmber[i] = Math.random() < 0.18 ? 1 : 0;
}
ashGeometry.setAttribute("position", new THREE.BufferAttribute(ashPositions, 3));
const ashColors = new Float32Array(ASH_COUNT * 3);
for (let i = 0; i < ASH_COUNT; i++) {
  const i3 = i * 3;
  if (ashIsEmber[i]) {
    ashColors[i3] = 1; ashColors[i3 + 1] = 0.45; ashColors[i3 + 2] = 0.10;
  } else {
    ashColors[i3] = 0.55; ashColors[i3 + 1] = 0.42; ashColors[i3 + 2] = 0.36;
  }
}
ashGeometry.setAttribute("color", new THREE.BufferAttribute(ashColors, 3));
const ashMaterial = new THREE.PointsMaterial({
  size: 0.16,
  vertexColors: true,
  transparent: true,
  opacity: 0.7,
  sizeAttenuation: true,
});
const ashPoints = new THREE.Points(ashGeometry, ashMaterial);
scene.add(ashPoints);

function updateAshParticles(dt) {
  const pos = ashGeometry.attributes.position.array;
  for (let i = 0; i < ASH_COUNT; i++) {
    const i3 = i * 3;
    pos[i3] += ashVelocities[i3] * dt;
    pos[i3 + 1] += ashVelocities[i3 + 1] * dt;
    pos[i3 + 2] += ashVelocities[i3 + 2] * dt;
    // Recycle when it falls below ground or drifts past arena edge.
    if (
      pos[i3 + 1] < 0 ||
      Math.abs(pos[i3]) > ARENA_SIZE + 8 ||
      Math.abs(pos[i3 + 2]) > ARENA_SIZE + 8
    ) {
      pos[i3] = (Math.random() - 0.5) * ARENA_SIZE * 2;
      pos[i3 + 1] = 22 + Math.random() * 8;
      pos[i3 + 2] = (Math.random() - 0.5) * ARENA_SIZE * 2;
    }
  }
  ashGeometry.attributes.position.needsUpdate = true;
}

// ─── PLAYER ─────────────────────────────────────────────────
const playerGroup = new THREE.Group();

// Placeholder body (hooded robe shape — cone)
const bodyGeo = new THREE.ConeGeometry(0.5, 1.6, 8);
const bodyMat = new THREE.MeshStandardMaterial({
  color: 0x5a1708,
  emissive: 0xff3b00,
  emissiveIntensity: 0.28,
});
const body = new THREE.Mesh(bodyGeo, bodyMat);
body.position.y = 0.8;
body.castShadow = true;
playerGroup.add(body);

// Head (sphere)
const headGeo = new THREE.SphereGeometry(0.25, 8, 8);
const headMat = new THREE.MeshStandardMaterial({ color: 0x5a1708 });
const head = new THREE.Mesh(headGeo, headMat);
head.position.y = 1.7;
head.castShadow = true;
playerGroup.add(head);

// Eyes (glowing flame)
const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffcf70 });
const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeMat);
const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeMat);
eyeL.position.set(-0.1, 1.72, 0.2);
eyeR.position.set(0.1, 1.72, 0.2);
playerGroup.add(eyeL, eyeR);

// Staff
const staffGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6);
const staffMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a });
const staff = new THREE.Mesh(staffGeo, staffMat);
staff.position.set(0.5, 1.1, 0);
staff.rotation.z = 0.15;
playerGroup.add(staff);

// Staff orb
const orbGeo = new THREE.SphereGeometry(0.15, 8, 8);
const orbMat = new THREE.MeshBasicMaterial({ color: 0xff7a18 });
const orb = new THREE.Mesh(orbGeo, orbMat);
orb.position.set(0.55, 2.2, 0);
playerGroup.add(orb);

// Staff orb light
const orbLight = new THREE.PointLight(0xff7a18, 1.8, 7);
orbLight.position.copy(orb.position);
playerGroup.add(orbLight);

const placeholderParts = [body, head, eyeL, eyeR, staff, orb];

scene.add(playerGroup);

// ─── MODEL LOADING ──────────────────────────────────────────
const gltfLoader = new GLTFLoader();
// 8 Meshy-generated enemy keys + the player necromancer + 2 placeholder fallbacks
// in case any Meshy GLB fails to load (game falls back to createEnemyProxy).
const loadedModels = {
  necromancer: null,
  zombie: null, skeleton: null,
  poacher: null, shadow_stalker: null, bone_crawler: null, frost_wraith: null,
  magma_golem: null, crystal_sentinel: null, swamp_lurker: null, sand_burrower: null,
};
let playerModelLoaded = false;

function enableShadows(obj) {
  obj.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

// Player model + Meshy auto-rigged animations.
// fire_sovereign.glb is rigged in T-pose; the walking/running GLBs ship from
// Meshy as armature-only clips with the matching bone hierarchy, so we can
// retarget their AnimationClips onto the main mesh's mixer.
let playerMixer = null;
const playerActions = { walk: null, run: null };
let currentPlayerAction = null;

function loadPlayerModel(url, isFallback = false) {
  gltfLoader.load(
    url,
    (gltf) => {
      if (playerModelLoaded) return;
      const model = gltf.scene;
      model.scale.set(1.5, 1.5, 1.5);
      const box = new THREE.Box3().setFromObject(model);
      model.position.y = -box.min.y;
      enableShadows(model);
      placeholderParts.forEach((p) => playerGroup.remove(p));
      playerGroup.add(model);
      loadedModels.necromancer = model;
      playerModelLoaded = true;
      console.log(`Player model loaded: ${url}`);
      // Set up the animation mixer on the rigged mesh.
      playerMixer = new THREE.AnimationMixer(model);
      // The rigged GLB itself may also ship with built-in clips — wire those too.
      for (const clip of gltf.animations || []) {
        const lc = clip.name.toLowerCase();
        if (lc.includes("walk") && !playerActions.walk) {
          playerActions.walk = playerMixer.clipAction(clip);
        } else if (lc.includes("run") && !playerActions.run) {
          playerActions.run = playerMixer.clipAction(clip);
        }
      }
      // Async-load the auxiliary walking/running clip GLBs.
      loadAuxClip("/models/fire_sovereign_walking.glb", "walk");
      loadAuxClip("/models/fire_sovereign_running.glb", "run");
    },
    undefined,
    (err) => {
      console.warn(`Player model failed: ${url}`, err);
      if (!isFallback) loadPlayerModel("/models/necromancer.glb", true);
    },
  );
}
function loadAuxClip(url, key) {
  if (playerActions[key]) return; // already wired from main GLB
  gltfLoader.load(url, (gltf) => {
    const clip = gltf.animations?.[0];
    if (!clip || !playerMixer) return;
    playerActions[key] = playerMixer.clipAction(clip);
    console.log(`Anim clip wired: ${key} (${clip.duration.toFixed(2)}s, ${clip.tracks.length} tracks)`);
  }, undefined, (err) => console.warn(`Anim clip failed: ${url}`, err));
}
loadPlayerModel("/models/fire_sovereign.glb");

function setPlayerAnimation(name) {
  // name: 'walk' | 'run' | null (idle = stop all)
  const next = name ? playerActions[name] : null;
  if (currentPlayerAction === next) return;
  // Crossfade for smooth transitions.
  if (currentPlayerAction) currentPlayerAction.fadeOut(0.18);
  if (next) {
    next.reset().fadeIn(0.18).play();
  }
  currentPlayerAction = next;
}

// Load zombie model
gltfLoader.load(
  "/models/zombie.glb",
  (gltf) => {
    const model = gltf.scene;
    enableShadows(model);
    loadedModels.zombie = model;
    console.log("Zombie model loaded");
  },
  undefined,
  (err) => {
    console.warn("Zombie model failed to load:", err);
  },
);

// Load skeleton model
gltfLoader.load(
  "/models/skeleton.glb",
  (gltf) => {
    const model = gltf.scene;
    enableShadows(model);
    loadedModels.skeleton = model;
    console.log("Skeleton model loaded");
  },
  undefined,
  (err) => {
    console.warn("Skeleton model failed to load:", err);
  },
);

// Load 8-direction sprite billboards baked from each enemy GLB. Each enemy is
// represented at 8 angles (45° apart). Switch the sprite's texture each frame
// based on the camera-relative facing.
//
// Falls back to GLB load if sprites are missing — the prior code path still
// works since the SkinnedMesh path is unchanged.
const MESHY_ENEMY_KEYS = [
  "poacher", "shadow_stalker", "bone_crawler", "frost_wraith",
  "magma_golem", "crystal_sentinel", "swamp_lurker", "sand_burrower",
];
// Enemy sprites are now [direction][frame] for an idle-sway animation.
const enemySprites = {}; // key → [[Texture × NUM_ENEMY_FRAMES] × NUM_ENEMY_DIRS]
const NUM_ENEMY_DIRS = 8;
const NUM_ENEMY_FRAMES = 4;
const ENEMY_FRAME_DURATION = 0.18; // seconds per frame
const _texLoader = new THREE.TextureLoader();

function loadEnemySprites() {
  for (const key of MESHY_ENEMY_KEYS) {
    const dirRows = new Array(NUM_ENEMY_DIRS);
    for (let d = 0; d < NUM_ENEMY_DIRS; d++) {
      dirRows[d] = new Array(NUM_ENEMY_FRAMES).fill(null);
    }
    enemySprites[key] = dirRows;
    for (let d = 0; d < NUM_ENEMY_DIRS; d++) {
      for (let f = 0; f < NUM_ENEMY_FRAMES; f++) {
        const url = `/models/enemies/sprites/${key}_d${d}_f${f}.png`;
        _texLoader.load(
          url,
          (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.magFilter = THREE.NearestFilter;
            tex.minFilter = THREE.LinearFilter;
            enemySprites[key][d][f] = tex;
          },
          undefined,
          (err) => console.warn(`Enemy sprite failed: ${url}`, err),
        );
      }
    }
  }
}
loadEnemySprites();

// ─── CAMERA STATE ───────────────────────────────────────────
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const cameraOffset = new THREE.Vector3();
const smoothedCameraLook = new THREE.Vector3(
  0,
  CAMERA_LOOK_HEIGHT,
  -CAMERA_LOOK_AHEAD,
);
const cameraAim = new THREE.Vector3();
const cameraFlatForward = new THREE.Vector3(0, 0, -1);
const cameraRight = new THREE.Vector3(1, 0, 0);
let cameraYaw = 0;
let cameraPitch = -0.24;
let pointerLocked = false;

// ─── GAME STATE ─────────────────────────────────────────────
const state = {
  gameStarted: false,
  selectedCharacter: "fire_sovereign",
  // pyreTree (Pyre Fuel keystone) | stardustTree (Cosmic Stardust keystone)
  selectedRune: "pyreTree",
  hp: 100,
  maxHp: 100,
  hpRegen: 0,
  hpRegenCarry: 0,
  // Pre-init recompute-touched fields so the delta-pattern arithmetic
  // doesn't promote them to NaN on the first tick.
  speedBonus: 0,
  dmgBonus: 0,
  extraFireSlashes: 0,
  burnDpsMult: 1,
  xp: 0,
  xpToLevel: 50,
  level: 1,
  // 2D Fire Sovereign starts at 75 base damage.
  baseDamage: 75,
  damageMultiplier: 1,
  magePower: 1,
  critChance: 0.05,
  critMultiplier: 2,
  fireRateBonus: 0,
  damageReduction: 0,
  lifesteal: 0,
  // Pyre Fuel — permanent, infinite scaling per the 2D keystone.
  pyreFuelStacks: 0,
  // Cosmic Stardust — alternative keystone, +0.3% mage power per stack.
  stardustStacks: 0,
  stardustDamageCarry: 0,
  // Tree minor effects
  burnDurationMult: 1,
  burningFervorActive: false,
  astralDriftActive: false,
  speedBuffTimer: 0,
  speedBuffAmount: 0,
  // Sigil flags (gated effects ported from 2D sigil semantics)
  conflagrationActive: false,
  conflagrationTimer: 0,
  moltenCoreActive: false,
  eternalPyreActive: false,
  infernoSovereignActive: false,
  supernovaActive: false,
  immolationAuraActive: false,
  blazingPursuitActive: false,
  phoenixAscendancyAvailable: false,
  killNovaActive: false,
  killNovaCounter: 0,
  killNovaThreshold: 15,
  killNovaDamage: 400,
  killNovaRadius: 6,
  pyroclasmActive: false,
  pyroclasmTimer: 0,
  pyroclasmInterval: 8,
  pyroclasmDamage: 250,
  pyroclasmRadius: 12,
  earthquakeActive: false,
  earthquakeTimer: 0,
  earthquakeInterval: 6,
  earthquakeDamage: 150,
  earthquakeRadius: 4.5,
  berserkerActive: false,
  executionerActive: false,
  momentumActive: false,
  momentumBonus: 0,
  momentumTimer: 0,
  kills: 0,
  wave: 1,
  waveTimer: 5,
  waveCooldown: false,
  enemiesAlive: 0,
  enemiesToSpawn: 0,
  souls: 0,
  nextSoulChestKill: SOUL_CHEST_INTERVAL,
  soulShopOpen: false,
  shootCooldown: 0,
  qCooldown: 0,
  eCooldown: 0,
  iframes: 0,
  pyreMomentumBonus: 0,
  pyreMomentumTimer: 0,
  heatConductionTimer: 0,
  solarDoubleBurnTimer: 0,
  verticalVelocity: 0,
  grounded: true,
  mouseDown: false,
  gameOver: false,
};

const burningGrounds = [];

const keys = {};
const enemies = [];
const fireSlashes = [];
const fireballs = [];
const solarNovas = [];
const particles = [];
const xpOrbs = [];
const soulChests = [];
renderer.domElement.tabIndex = 0;

function showFrontOverlay(id) {
  for (const overlayId of ["mainMenu", "characterSelectOverlay", "runeSelectOverlay"]) {
    document.getElementById(overlayId)?.classList.toggle("hidden", overlayId !== id);
  }
  releaseGamePointer();
}

function applySelectedRune() {
  // Trees grant keystone + both minor runes (LoL rune-page style, ported from 2D TREE_DEFS).
  if (state.selectedRune === "pyreTree") {
    // Keystone: Pyre Fuel — handled dynamically in damage paths via state.pyreFuelStacks.
    // Minor: Burning Fervor — speed buff on damage dealt
    state.burningFervorActive = true;
    // Minor: Eternal Embers — burn duration +50%
    state.burnDurationMult = (state.burnDurationMult || 1) * 1.5;
  } else if (state.selectedRune === "stardustTree") {
    // Keystone: Cosmic Stardust — handled dynamically in skill casts + damage hooks.
    // Minor: Astral Drift — speed buff on cast
    state.astralDriftActive = true;
    // Minor: Voidsight — +10% crit chance permanently
    state.critChance += 0.10;
  }
}

function startRun() {
  state.gameStarted = true;
  paused = false;
  applySelectedRune();
  document.getElementById("runeSelectOverlay").classList.add("hidden");
  clearInputState();
  startWave();
}

document.getElementById("mainStartBtn")?.addEventListener("click", () => {
  showFrontOverlay("characterSelectOverlay");
});
document.getElementById("characterContinueBtn")?.addEventListener("click", () => {
  showFrontOverlay("runeSelectOverlay");
});
document.querySelectorAll(".rune-card").forEach((card) => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".rune-card").forEach((c) => c.classList.remove("selected"));
    card.classList.add("selected");
    state.selectedRune = card.dataset.rune || "pyreTree";
  });
});
document.getElementById("runeStartBtn")?.addEventListener("click", startRun);

// ─── INPUT ──────────────────────────────────────────────────
document.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  const code = e.code;
  keys[key] = true;
  keys[code] = true;
  if (
    [
      "w",
      "a",
      "s",
      "d",
      "arrowup",
      "arrowdown",
      "arrowleft",
      "arrowright",
      "p",
      "escape",
      "q",
      "e",
      "f",
      "b",
      " ",
    ].includes(key)
  ) {
    e.preventDefault();
  }
  if (key === "b" && state.soulShopOpen) {
    toggleSoulShop();
    return;
  }
  if (!paused && !state.gameOver) {
    if (key === "q") castInfernoVolley();
    if (key === "e") castSolarCataclysm();
    if (key === "f") openNearestSoulChest();
    if (key === "b") toggleSoulShop();
    if ((key === " " || code === "Space") && state.grounded) {
      state.verticalVelocity = JUMP_VELOCITY;
      state.grounded = false;
    }
  }
  if (
    (key === "p" || key === "escape") &&
    state.gameStarted &&
    !state.gameOver &&
    document.getElementById("levelUpOverlay").classList.contains("hidden")
  ) {
    window.togglePause?.();
  }
});
document.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
  keys[e.code] = false;
});
window.addEventListener("blur", () => {
  for (const key of Object.keys(keys)) keys[key] = false;
});

function clearInputState() {
  for (const key of Object.keys(keys)) keys[key] = false;
  state.mouseDown = false;
}

function releaseGamePointer() {
  clearInputState();
  renderer.domElement.blur();
  if (document.pointerLockElement === renderer.domElement) {
    document.exitPointerLock();
  }
}

window.addEventListener("mousemove", (e) => {
  if (pointerLocked) {
    cameraYaw -= e.movementX * CAMERA_MOUSE_SENSITIVITY;
    cameraPitch = Math.max(
      CAMERA_MIN_PITCH,
      Math.min(
        CAMERA_MAX_PITCH,
        cameraPitch - e.movementY * CAMERA_MOUSE_SENSITIVITY,
      ),
    );
  }
});

renderer.domElement.addEventListener("mousedown", (e) => {
  if (e.button === 0) {
    if (state.gameOver || paused) return;
    renderer.domElement.focus();
    state.mouseDown = true;
    if (!pointerLocked) renderer.domElement.requestPointerLock();
  }
});
document.addEventListener("mouseup", (e) => {
  if (e.button === 0) state.mouseDown = false;
});

document.addEventListener("pointerlockchange", () => {
  pointerLocked = document.pointerLockElement === renderer.domElement;
});

// Prevent context menu on right-click
renderer.domElement.addEventListener("contextmenu", (e) => e.preventDefault());

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── ENEMY TYPES & CREATION ─────────────────────────────────
// HP/damage values mirrored from 2D veltharas-dominion ENEMY_TYPES so the
// 3D Fire Sovereign DPS curve actually fights enemies instead of one-shotting them.
const ENEMY_TYPES = [
  {
    // ~ 2D "swarm/basic"
    name: "Poacher", color: 0x8b4513, size: 1.2,
    hp: 150, dmg: 25, speed: 90 / 32, xp: 6,
    attackCooldown: 1.5, modelKey: "poacher", modelScale: 1.6,
  },
  {
    // ~ 2D "runner"
    name: "Shadow Stalker", color: 0x462070, size: 1.1,
    hp: 200, dmg: 25, speed: 180 / 32, xp: 5,
    attackCooldown: 0.8, modelKey: "shadow_stalker", modelScale: 1.45,
  },
  {
    // ~ 2D "mini/sticky"
    name: "Bone Crawler", color: 0xd4c5a9, size: 0.9,
    hp: 125, dmg: 22, speed: 110 / 32, xp: 3,
    attackCooldown: 1.2, modelKey: "bone_crawler", modelScale: 1.7,
  },
  {
    // ~ 2D "poison"
    name: "Frost Wraith", color: 0xa0d2db, size: 1.3,
    hp: 400, dmg: 30, speed: 70 / 32, xp: 10,
    attackCooldown: 2.0, modelKey: "frost_wraith", modelScale: 1.8,
  },
  {
    // ~ 2D "tank" — heavy bullet sponge with high damage
    name: "Magma Golem", color: 0xd84315, size: 1.8,
    hp: 1750, dmg: 60, speed: 40 / 32, xp: 25,
    attackCooldown: 2.5, modelKey: "magma_golem", modelScale: 3.0,
  },
  {
    // ~ 2D "splitter"
    name: "Crystal Sentinel", color: 0x9c27b0, size: 1.4,
    hp: 750, dmg: 40, speed: 60 / 32, xp: 15,
    attackCooldown: 1.8, modelKey: "crystal_sentinel", modelScale: 2.2,
  },
  {
    // ~ 2D "ice" — bulky CC threat
    name: "Swamp Lurker", color: 0x2e4a1e, size: 1.5,
    hp: 1000, dmg: 50, speed: 50 / 32, xp: 20,
    attackCooldown: 2.0, modelKey: "swamp_lurker", modelScale: 2.0,
  },
  {
    // ~ 2D "bomber"
    name: "Sand Burrower", color: 0xc2a84d, size: 1.2,
    hp: 375, dmg: 30, speed: 130 / 32, xp: 12,
    attackCooldown: 3.0, modelKey: "sand_burrower", modelScale: 1.9,
  },
];

function cloneModel(source) {
  // Deep clone a loaded GLTF scene + clone every material so per-instance
  // hit-flashes don't bleed across spawns. We also stash the GLB-baked
  // emissive intensity on the material itself so the hit-flash can restore it.
  const clone = source.clone(true);
  clone.traverse((child) => {
    if (child.isMesh) {
      child.material = child.material.clone();
      if (child.material && "emissiveIntensity" in child.material) {
        child.material.userData = child.material.userData || {};
        child.material.userData.baseEmissiveIntensity = child.material.emissiveIntensity;
      }
      child.castShadow = false;
      child.receiveShadow = false;
    }
  });
  return clone;
}

// No-op: the Blender retexture pipeline now bakes a per-enemy emissive tint
// directly into the GLB, so overriding `emissive` here would just wipe the
// nice baked colors. Kept as a stub so spawnEnemy doesn't have to branch.
function tintModel(_model, _color) { /* intentionally empty */ }

function createEnemyProxy(color, size) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.25,
    roughness: 0.72,
    metalness: 0.05,
  });
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(size * 0.32, size * 0.42, size * 1.35, 8),
    mat,
  );
  body.position.y = size * 0.75;
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(size * 0.62, size * 0.48, size * 0.5),
    mat,
  );
  head.position.y = size * 1.58;
  head.castShadow = true;
  group.add(head);

  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(size * 0.16, size * 0.82, size * 0.16),
      mat,
    );
    arm.position.set(side * size * 0.5, size * 0.95, 0);
    arm.rotation.z = side * 0.25;
    arm.castShadow = true;
    group.add(arm);
  }
  return group;
}

// Multiply mode: scales emissive against the GLB-baked base intensity instead
// of clobbering it. value = 1 → restore baseline, value > 1 → flash brighter.
function setMeshEmissionIntensity(root, value) {
  root.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    const mats = Array.isArray(child.material)
      ? child.material
      : [child.material];
    for (const mat of mats) {
      if (!mat || !("emissiveIntensity" in mat)) continue;
      const base = mat.userData?.baseEmissiveIntensity ?? 1;
      mat.emissiveIntensity = base * value;
    }
  });
}

// Spawn at a random direction from the *player* with a guaranteed minimum
// distance, then clamp into the arena. Previously spawning from origin meant
// enemies appeared on top of the player whenever the player ran to a corner.
const ENEMY_SPAWN_MIN_DIST = 22;
const ENEMY_SPAWN_MAX_DIST = 38;
function spawnEnemy(type) {
  const t = ENEMY_TYPES[type % ENEMY_TYPES.length];
  const angle = Math.random() * Math.PI * 2;
  const dist = ENEMY_SPAWN_MIN_DIST + Math.random() * (ENEMY_SPAWN_MAX_DIST - ENEMY_SPAWN_MIN_DIST);

  let spawnX = playerGroup.position.x + Math.cos(angle) * dist;
  let spawnZ = playerGroup.position.z + Math.sin(angle) * dist;
  // Clamp inside arena. If clamping pulled the spawn within MIN_DIST of the
  // player (e.g. player is in a corner), reflect across the player to keep
  // the enemy on the far side instead.
  const margin = 2;
  spawnX = Math.max(-ARENA_SIZE + margin, Math.min(ARENA_SIZE - margin, spawnX));
  spawnZ = Math.max(-ARENA_SIZE + margin, Math.min(ARENA_SIZE - margin, spawnZ));
  const dx = spawnX - playerGroup.position.x;
  const dz = spawnZ - playerGroup.position.z;
  if (dx * dx + dz * dz < ENEMY_SPAWN_MIN_DIST * ENEMY_SPAWN_MIN_DIST) {
    spawnX = playerGroup.position.x - Math.cos(angle) * dist;
    spawnZ = playerGroup.position.z - Math.sin(angle) * dist;
    spawnX = Math.max(-ARENA_SIZE + margin, Math.min(ARENA_SIZE - margin, spawnX));
    spawnZ = Math.max(-ARENA_SIZE + margin, Math.min(ARENA_SIZE - margin, spawnZ));
  }

  let mesh;
  let isModel = false;
  let isSprite = false;
  const dirSprites = enemySprites[t.modelKey];
  // Ready if at least frame 0 of every direction is loaded; missing tail frames
  // will be swapped in lazily.
  const spritesReady = dirSprites && dirSprites.every((row) => row && row[0]);

  if (spritesReady) {
    // Megabonk-style billboard: a THREE.Sprite that always faces the camera,
    // with its texture swapped each frame to one of 8 baked angles × 4 frames
    // of an idle-sway animation.
    const mat = new THREE.SpriteMaterial({
      map: dirSprites[0][0],
      transparent: true,
      depthWrite: false,
      // alpha cutoff so we don't get a halo around the silhouette.
      alphaTest: 0.04,
    });
    mesh = new THREE.Sprite(mat);
    // Sprite size in world units. Scale roughly by enemy.size so a Magma Golem
    // is visibly bigger than a Bone Crawler. Sprite is square (256x256) but the
    // alpha cutout handles the actual silhouette.
    const spriteSize = (t.size || 1) * 2.6;
    mesh.scale.set(spriteSize, spriteSize, 1);
    // Center the sprite vertically — anchor 0,0 sits at the sprite center, so
    // we offset so the feet sit on the ground.
    mesh.center.set(0.5, 0.0); // pivot at bottom-center
    mesh.position.set(spawnX, 0, spawnZ);
    isSprite = true;
  } else {
    const sourceModel = loadedModels[t.modelKey];
    if (sourceModel) {
      mesh = cloneModel(sourceModel);
      mesh.scale.set(t.modelScale, t.modelScale, t.modelScale);
      const box = new THREE.Box3().setFromObject(mesh);
      mesh.position.set(spawnX, -box.min.y * t.modelScale, spawnZ);
      tintModel(mesh, t.color);
      isModel = true;
    } else {
      mesh = createEnemyProxy(t.color, t.size);
      mesh.position.set(spawnX, 0, spawnZ);
    }
  }

  scene.add(mesh);

  const hpScale = 1 + (state.wave - 1) * 0.15;
  enemies.push({
    mesh,
    isModel,
    isSprite,
    spriteSet: isSprite ? dirSprites : null,
    _baseY: mesh.position.y,
    _facingAngle: 0, // 0 means "facing +Z in world space"
    type: t,
    hp: Math.floor(t.hp * hpScale),
    maxHp: Math.floor(t.hp * hpScale),
    dmg: Math.floor(t.dmg * (1 + (state.wave - 1) * 0.1)),
    speed: t.speed * ENEMY_SPEED_BASE,
    xp: t.xp,
    attackCooldown: 0,
    attackRate: t.attackCooldown,
    hitFlash: 0,
  });
  state.enemiesAlive++;
}

// ─── AUTO SLASH ──────────────────────────────────────────────
// A proper crescent: a thin annular sector (RingGeometry) sweeping forward
// from the player. Looks like a curved fiery arc, not a flat box.
const FIRE_SLASH_INNER = FIRE_SLASH_RANGE * 0.55;
const FIRE_SLASH_OUTER = FIRE_SLASH_RANGE * 1.05;
const FIRE_SLASH_GEO = new THREE.RingGeometry(
  FIRE_SLASH_INNER,
  FIRE_SLASH_OUTER,
  24,
  1,
  -FIRE_SLASH_HALF_ANGLE,
  FIRE_SLASH_HALF_ANGLE * 2,
);
// Vertex colours so the inner edge is hot white-yellow and the outer edge
// fades to deep orange — gives the arc visible heat falloff.
{
  const positions = FIRE_SLASH_GEO.attributes.position.array;
  const colors = new Float32Array(positions.length);
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const z = positions[i + 1];
    const r = Math.sqrt(x * x + z * z);
    const t = (r - FIRE_SLASH_INNER) / (FIRE_SLASH_OUTER - FIRE_SLASH_INNER);
    // inner: hot yellow-white, outer: deep crimson
    const rC = 1.0;
    const gC = 0.85 - t * 0.65;
    const bC = 0.50 - t * 0.50;
    colors[i] = rC; colors[i + 1] = gC; colors[i + 2] = bC;
  }
  FIRE_SLASH_GEO.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}
const FIRE_SLASH_MAT = new THREE.MeshBasicMaterial({
  vertexColors: true,
  transparent: true,
  opacity: 0.95,
  side: THREE.DoubleSide,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const FIREBALL_GEO = new THREE.SphereGeometry(0.34, 12, 12);
const FIREBALL_MAT = new THREE.MeshBasicMaterial({ color: 0xff4a00 });
const SOLAR_RING_GEO = new THREE.RingGeometry(0.92, 1, 64);
const SOLAR_RING_MAT = new THREE.MeshBasicMaterial({
  color: 0xffcf70,
  transparent: true,
  opacity: 0.8,
  side: THREE.DoubleSide,
});

function killEnemyAt(index) {
  const e = enemies[index];
  spawnParticles(e.mesh.position, e.type.color, 5);
  spawnXpOrb(e.mesh.position, Math.floor(e.xp * (state.xpMult || 1)));
  if (e.burnIcon) clearBurnIcon(e);
  scene.remove(e.mesh);
  enemies.splice(index, 1);
  state.enemiesAlive--;
  state.kills++;
  // Pyre Fuel keystone: every kill = +1 stack, permanent and infinite (no cap, no decay).
  if (state.selectedRune === "pyreTree") {
    state.pyreFuelStacks += 1;
  }
  // Souls economy: 1 soul per non-boss kill (matches 2D baseline).
  state.souls += 1;
  // Collector Contract pact: while soulBountyKills > 0, every kill gets +1 extra.
  if ((state.soulBountyKills || 0) > 0) {
    state.souls += 1;
    state.soulBountyKills -= 1;
  }
  document.getElementById("soulCount").textContent = state.souls;
  // Killnova sigil: every Nth kill releases an AoE nova.
  if (state.killNovaActive) {
    state.killNovaCounter++;
    if (state.killNovaCounter >= state.killNovaThreshold) {
      state.killNovaCounter = 0;
      detonateAoE(playerGroup.position, state.killNovaRadius, state.killNovaDamage, 0xfff0a3, 2);
    }
  }
  document.getElementById("killCount").textContent = `Kills: ${state.kills}`;
}

function detonateAoE(origin, radius, damage, color = 0xff7a18, burnStacks = 0) {
  const ring = new THREE.Mesh(SOLAR_RING_GEO, SOLAR_RING_MAT.clone());
  ring.material.color.setHex(color);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(origin.x, 0.06, origin.z);
  scene.add(ring);
  solarNovas.push({ mesh: ring, life: 0.45, maxLife: 0.45, radius, visualOnly: true });
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (e.mesh.position.distanceTo(origin) > radius + e.type.size) continue;
    damageEnemy(i, damage, color, burnStacks);
  }
}

function applySovereignBurn(enemy, stacks = 1) {
  if (!enemy.sovereignBurn) {
    enemy.sovereignBurn = { stacks: 0, timer: 0, tickCarry: 0 };
  }
  enemy.sovereignBurn.stacks = Math.min(
    state.maxBurnStacks || MAX_BURN_STACKS,
    enemy.sovereignBurn.stacks + stacks,
  );
  enemy.sovereignBurn.timer = BURN_STACK_DURATION * (state.burnDurationMult || 1);
}

function damageEnemy(index, amount, color = 0xff6622, burnStacks = 1) {
  const e = enemies[index];
  const stacks = e.sovereignBurn?.stacks || 0;
  // Living Flame: +1%/stack initial-hit damage, capped at +12% (or +24% w/ Inferno Sovereign).
  const livingFlamePerStack = state.infernoSovereignActive ? 0.02 : 0.01;
  const livingFlameCap = state.infernoSovereignActive ? 0.24 : 0.12;
  const livingFlame = Math.min(livingFlameCap, stacks * livingFlamePerStack);
  // Berserker passive: +1% damage per 1% HP missing.
  const berserkerBonus = state.berserkerActive
    ? Math.max(0, 1 - state.hp / Math.max(1, state.maxHp))
    : 0;
  // Executioner passive: enemies <20% HP take 2x damage.
  const executeMult = state.executionerActive && e.hp / Math.max(1, e.maxHp) <= 0.20 ? 2 : 1;
  let damage = Math.floor(
    amount *
      state.damageMultiplier *
      (1 + (state.dmgBonus || 0)) *
      (1 + livingFlame) *
      (1 + state.pyreFuelStacks * PYRE_FUEL_DMG_PER_STACK) *
      (1 + berserkerBonus) *
      (1 + state.momentumBonus) *
      executeMult,
  );
  if (Math.random() < state.critChance) {
    damage = Math.floor(damage * state.critMultiplier);
    color = 0xfff0a3;
  }
  e.hp -= damage;
  e.hitFlash = 0.14;
  spawnParticles(e.mesh.position, color, 3);
  // Floating number above the hit. Crit color (#fff0a3) was assigned just above
  // when the crit roll fired; we mirror it as a CSS hex for the canvas fill.
  const wasCrit = color === 0xfff0a3;
  showDamageNumber(damage, e.mesh.position, wasCrit ? "#fff0a3" : "#ff7733");
  if (burnStacks > 0) applySovereignBurn(e, burnStacks);
  // Cosmic Stardust: gain 1 stack per 200 damage dealt.
  if (state.selectedRune === "stardustTree") {
    state.stardustDamageCarry += damage;
    while (state.stardustDamageCarry >= 200) {
      state.stardustDamageCarry -= 200;
      state.stardustStacks += 1;
    }
  }
  // Burning Fervor: dealing damage grants brief burst MS.
  if (state.burningFervorActive) {
    state.speedBuffTimer = Math.max(state.speedBuffTimer, 1.5);
    state.speedBuffAmount = Math.max(state.speedBuffAmount, 0.30);
  }
  // Lifesteal heals on damage dealt. Radiant Aegis (item) increases heal received.
  if (state.lifesteal > 0 && state.hp < state.maxHp) {
    const healMult = 1 + (state._itemHealRecvPct || 0);
    state.hp = Math.min(state.maxHp, state.hp + damage * state.lifesteal * healMult);
  }
  if (e.hp <= 0) killEnemyAt(index);
  return damage;
}

function nearestEnemy(maxRange = Infinity) {
  let best = null;
  let bestIndex = -1;
  let bestDistSq = maxRange * maxRange;
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    const dx = e.mesh.position.x - playerGroup.position.x;
    const dz = e.mesh.position.z - playerGroup.position.z;
    const dSq = dx * dx + dz * dz;
    if (dSq < bestDistSq) {
      best = e;
      bestIndex = i;
      bestDistSq = dSq;
    }
  }
  return { enemy: best, index: bestIndex, distSq: bestDistSq };
}

function spawnFireSlashEffect(angle) {
  // Crescent ring is centred on the player, lying flat above the ground,
  // facing the slash direction. The arc itself was authored facing -Z (the
  // ring uses its local +X / +Z plane), so we rotate so the arc points at the
  // requested angle.
  const mesh = new THREE.Mesh(FIRE_SLASH_GEO, FIRE_SLASH_MAT.clone());
  mesh.position.copy(playerGroup.position);
  mesh.position.y = 1.05;
  mesh.rotation.x = -Math.PI / 2;
  // RingGeometry's thetaStart is measured from +X, our slash angle is from
  // +Z (atan2(dx, dz)), so subtract a quarter turn to align them, then point
  // the arc forward.
  mesh.rotation.z = angle - Math.PI / 2;
  scene.add(mesh);

  // Trailing ember spray along the slash arc — small bright particles that
  // the renderer doesn't pool, but which read as "this swing was hot".
  const dir = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
  const spread = FIRE_SLASH_HALF_ANGLE;
  for (let i = 0; i < 6; i++) {
    const a = angle + (Math.random() - 0.5) * spread * 1.6;
    const r = FIRE_SLASH_INNER + Math.random() * (FIRE_SLASH_OUTER - FIRE_SLASH_INNER);
    const ex = playerGroup.position.x + Math.sin(a) * r;
    const ez = playerGroup.position.z + Math.cos(a) * r;
    spawnParticles(new THREE.Vector3(ex, 1.0, ez), i % 2 === 0 ? 0xffd36a : 0xff5a0a, 1);
  }

  fireSlashes.push({
    mesh,
    life: FIRE_SLASH_VISUAL_TIME,
    angle,
    // Cache forward direction for animation pulse.
    dir,
  });
}

function autoFireSlash() {
  if (state.shootCooldown > 0) return;
  const slashRange = FIRE_SLASH_RANGE * (state.fireRangeMult || 1);
  const target = nearestEnemy(slashRange + 2);
  if (!target.enemy) return;

  const dx = target.enemy.mesh.position.x - playerGroup.position.x;
  const dz = target.enemy.mesh.position.z - playerGroup.position.z;
  const baseAngle = Math.atan2(dx, dz);

  const slashCount = 1 + (state.extraFireSlashes || 0);
  const spread = (Math.PI * 2) / slashCount;
  let totalHits = 0;
  const baseDamage = state.baseDamage;

  for (let s = 0; s < slashCount; s++) {
    const angle = baseAngle + s * spread;
    const dir = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
    spawnFireSlashEffect(angle);

    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      const toEnemy = new THREE.Vector3().subVectors(
        e.mesh.position,
        playerGroup.position,
      );
      toEnemy.y = 0;
      const dist = toEnemy.length();
      if (dist > slashRange + e.type.size || dist <= 0.001) continue;
      if (dir.dot(toEnemy.normalize()) < Math.cos(FIRE_SLASH_HALF_ANGLE)) {
        continue;
      }
      damageEnemy(j, baseDamage, 0xff6622, 1);
      totalHits++;
    }
  }

  if (totalHits > 0) {
  const pyreMult = 1 / (1 + state.pyreMomentumBonus + state.fireRateBonus);
    state.shootCooldown = SHOOT_COOLDOWN * (state.cooldownMult || 1) * pyreMult;
  }
}

function spawnFireball(target, damage, options = {}) {
  const mesh = new THREE.Mesh(FIREBALL_GEO, FIREBALL_MAT.clone());
  mesh.position.copy(playerGroup.position);
  mesh.position.y = 1.2;
  scene.add(mesh);
  const angle =
    Math.atan2(
      target.mesh.position.x - playerGroup.position.x,
      target.mesh.position.z - playerGroup.position.z,
    ) + (options.angleOffset || 0);
  fireballs.push({
    mesh,
    target,
    vel: new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)).multiplyScalar(
      FIREBALL_SPEED * (options.speedMult || 1),
    ),
    damage,
    burnStacks: options.burnStacks || 1,
    pierce: options.pierce || 0,
    life: FIREBALL_LIFE,
    hitEnemies: new Set(),
  });
}

function castInfernoVolley() {
  if (state.qCooldown > 0) return;
  const live = enemies.filter((e) => e.hp > 0);
  if (live.length === 0) return;
  live.sort((a, b) => {
    const da = a.mesh.position.distanceToSquared(playerGroup.position);
    const db = b.mesh.position.distanceToSquared(playerGroup.position);
    return da - db;
  });
  // Immolation Aura sigil: +3 fireballs and +2 burn stacks on hit.
  const immoExtra = state.immolationAuraActive ? 3 : 0;
  const count = 5 + (state.infernoVolleyBonusCount || 0) + immoExtra;
  const burn = (state.immolationAuraActive ? 2 : (state.infernoVolleyBurnStacks || 1));
  // Blazing Pursuit sigil: +40% projectile speed, +1 pierce.
  const speedMult = 1.2 * (state.blazingPursuitActive ? 1.4 : 1);
  const pierce = 1 + (state.blazingPursuitActive ? 1 : 0);
  const damage = Math.floor(state.baseDamage * 1.5);
  for (let i = 0; i < count; i++) {
    spawnFireball(live[i % live.length], damage, {
      speedMult,
      angleOffset: (i - Math.floor(count / 2)) * 0.09,
      pierce,
      burnStacks: burn,
    });
  }
  spawnParticles(playerGroup.position, 0xff4400, 8);
  state.qCooldown = INFERNO_VOLLEY_COOLDOWN;
  onSkillCast();
}

// Pillars and shockwaves are tracked separately from solarNovas so the damage
// ring's hit logic stays simple. Pillars rise + fade; shockwaves expand + fade.
const solarPillars = [];
const solarShockwaves = [];

function castSolarCataclysm() {
  if (state.eCooldown > 0) return;

  // ── 1) Damage ring (existing): expands from 0 → SOLAR_CATACLYSM_RADIUS, hits enemies.
  const mesh = new THREE.Mesh(SOLAR_RING_GEO, SOLAR_RING_MAT.clone());
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.copy(playerGroup.position);
  mesh.position.y = 0.08;
  scene.add(mesh);
  solarNovas.push({
    mesh,
    life: SOLAR_CATACLYSM_TIME,
    maxLife: SOLAR_CATACLYSM_TIME,
    radius: 0,
    hitEnemies: new Set(),
  });

  // ── 2) Outer shockwave: bigger, slower, dimmer — sells the scale.
  const shockMesh = new THREE.Mesh(
    SOLAR_RING_GEO,
    new THREE.MeshBasicMaterial({
      color: 0xff7a18,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  shockMesh.rotation.x = -Math.PI / 2;
  shockMesh.position.copy(playerGroup.position);
  shockMesh.position.y = 0.06;
  scene.add(shockMesh);
  solarShockwaves.push({
    mesh: shockMesh,
    life: 1.4,
    maxLife: 1.4,
    radiusMax: SOLAR_CATACLYSM_RADIUS * (state.solarRadiusMult || 1) * 1.45,
  });

  // ── 3) Inner flash ring: tiny, snaps in fast, bright white-yellow.
  const innerMesh = new THREE.Mesh(
    SOLAR_RING_GEO,
    new THREE.MeshBasicMaterial({
      color: 0xfff0c0,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  innerMesh.rotation.x = -Math.PI / 2;
  innerMesh.position.copy(playerGroup.position);
  innerMesh.position.y = 0.10;
  scene.add(innerMesh);
  solarShockwaves.push({
    mesh: innerMesh,
    life: 0.40,
    maxLife: 0.40,
    radiusMax: SOLAR_CATACLYSM_RADIUS * 0.55,
  });

  // ── 4) Central pillar: tall fiery column that rises and fades.
  const pillarHeight = 14;
  const pillarGeo = new THREE.CylinderGeometry(1.2, 0.6, pillarHeight, 16, 1, true);
  const pillarMat = new THREE.MeshBasicMaterial({
    color: 0xffb84d,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const pillar = new THREE.Mesh(pillarGeo, pillarMat);
  pillar.position.set(playerGroup.position.x, pillarHeight * 0.5, playerGroup.position.z);
  scene.add(pillar);

  // Inner core: thinner, hotter, behind the outer column.
  const coreGeo = new THREE.CylinderGeometry(0.45, 0.18, pillarHeight * 0.95, 12, 1, true);
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xfff0c0,
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.position.copy(pillar.position);
  scene.add(core);

  solarPillars.push({
    pillar, core,
    life: 1.2,
    maxLife: 1.2,
    rotSpeed: 1.4,
  });

  // ── 5) Screen flash: brief tone-mapping exposure spike for that nuke punch.
  state._solarFlashTimer = 0.35;

  // ── 6) Heavy particle burst — three colors, layered.
  spawnParticles(playerGroup.position, 0xfff0c0, 14);
  spawnParticles(playerGroup.position, 0xffcf70, 16);
  spawnParticles(playerGroup.position, 0xff4400, 14);

  state.solarDoubleBurnTimer = 5;
  state.eCooldown = SOLAR_CATACLYSM_COOLDOWN * (state.solarCooldownMult || 1);

  // Supernova sigil: leave burning ground at the cast site.
  if (state.supernovaActive) spawnBurningGround(playerGroup.position);
  onSkillCast();
}

function updateSolarVisuals(dt) {
  // Shockwaves
  for (let i = solarShockwaves.length - 1; i >= 0; i--) {
    const s = solarShockwaves[i];
    s.life -= dt;
    const t = 1 - Math.max(0, s.life / s.maxLife);
    const eased = 1 - Math.pow(1 - t, 2.5); // ease-out
    s.mesh.scale.setScalar(Math.max(0.08, s.radiusMax * eased));
    s.mesh.material.opacity = (s.life / s.maxLife) * 0.85;
    if (s.life <= 0) {
      scene.remove(s.mesh);
      s.mesh.material.dispose();
      solarShockwaves.splice(i, 1);
    }
  }
  // Pillars
  for (let i = solarPillars.length - 1; i >= 0; i--) {
    const p = solarPillars[i];
    p.life -= dt;
    const t = 1 - Math.max(0, p.life / p.maxLife);
    p.pillar.rotation.y += p.rotSpeed * dt;
    p.core.rotation.y -= p.rotSpeed * 1.6 * dt;
    // Pillar swells up over the first 30%, then shrinks/fades out.
    const swell = t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.7;
    p.pillar.scale.set(1 + swell * 0.25, 1, 1 + swell * 0.25);
    p.core.scale.set(1 + swell * 0.6, 1, 1 + swell * 0.6);
    p.pillar.material.opacity = Math.max(0, p.life / p.maxLife) * 0.8;
    p.core.material.opacity = Math.max(0, p.life / p.maxLife);
    if (p.life <= 0) {
      scene.remove(p.pillar);
      scene.remove(p.core);
      p.pillar.geometry.dispose();
      p.pillar.material.dispose();
      p.core.geometry.dispose();
      p.core.material.dispose();
      solarPillars.splice(i, 1);
    }
  }
  // Screen flash via tone-mapping exposure.
  if (state._solarFlashTimer > 0) {
    state._solarFlashTimer -= dt;
    const flashT = Math.max(0, state._solarFlashTimer / 0.35);
    renderer.toneMappingExposure = 1.4 + flashT * 1.1;
  } else if (renderer.toneMappingExposure !== 1.4) {
    renderer.toneMappingExposure = 1.4;
  }
}

function spawnBurningGround(origin) {
  // Disc of burn DPS — radius matches Supernova's enlarged Solar Cataclysm.
  const baseRadius = SOLAR_CATACLYSM_RADIUS * (state.solarRadiusMult || 1);
  const geo = new THREE.RingGeometry(baseRadius * 0.05, baseRadius, 64);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xff5a16,
    transparent: true,
    opacity: 0.32,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(origin.x, 0.05, origin.z);
  scene.add(mesh);
  burningGrounds.push({
    mesh,
    radius: baseRadius,
    life: SUPERNOVA_GROUND_DURATION,
    maxLife: SUPERNOVA_GROUND_DURATION,
    dps: SUPERNOVA_GROUND_DPS,
    tickCarry: 0,
    pos: origin.clone(),
  });
}

function onSkillCast() {
  // Cosmic Stardust: skill casts grant a stack.
  if (state.selectedRune === "stardustTree") state.stardustStacks += 1;
  // Astral Drift minor: brief MS buff on cast.
  if (state.astralDriftActive) {
    state.speedBuffTimer = Math.max(state.speedBuffTimer, 2.0);
    state.speedBuffAmount = Math.max(state.speedBuffAmount, 0.40);
  }
}

function updateSovereignBurns(dt) {
  const burnMult = state.solarDoubleBurnTimer > 0 ? 2 : 1;
  // Cosmic Stardust scales mage power: +0.3% per stack (matches 2D).
  const stardustMagePower = 1 + state.stardustStacks * 0.003;
  // Conflagration: spread burn from max-stack enemies on a fixed cadence.
  let runConflagration = false;
  if (state.conflagrationActive) {
    state.conflagrationTimer -= dt;
    if (state.conflagrationTimer <= 0) {
      state.conflagrationTimer = CONFLAGRATION_INTERVAL;
      runConflagration = true;
    }
  }
  const cap = state.maxBurnStacks || MAX_BURN_STACKS;
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    const burn = e.sovereignBurn;
    if (!burn || burn.stacks <= 0) continue;
    burn.timer -= dt;
    // Eternal Pyre: stacks never decay even when timer expires.
    if (burn.timer <= 0 && !state.eternalPyreActive) {
      burn.stacks = 0;
      continue;
    }
    if (burn.timer <= 0 && state.eternalPyreActive) {
      // Refresh timer to sustain the eternal stacks.
      burn.timer = BURN_STACK_DURATION * (state.burnDurationMult || 1);
    }
    const damage =
      burn.stacks *
      BURN_DPS_PER_STACK *
      burnMult *
      state.magePower *
      stardustMagePower *
      (state.burnDpsMult || 1) *
      (1 + state.pyreFuelStacks * PYRE_FUEL_DMG_PER_STACK) *
      dt;
    burn.tickCarry += damage;
    if (burn.tickCarry >= 1) {
      const chunk = Math.floor(burn.tickCarry);
      burn.tickCarry -= chunk;
      e.hp -= chunk;
      e.hitFlash = Math.max(e.hitFlash, 0.06);
      if (particles.length < MAX_ACTIVE_PARTICLES && Math.random() < 0.18) {
        spawnParticles(e.mesh.position, 0xff4400, 1);
      }
      if (e.hp <= 0) {
        killEnemyAt(i);
        continue;
      }
    }
    // Conflagration spread — applies after damage so removed corpses don't seed spreads.
    if (runConflagration && burn.stacks >= cap) {
      for (const other of enemies) {
        if (other === e) continue;
        if (other.mesh.position.distanceTo(e.mesh.position) > CONFLAGRATION_SPREAD_RADIUS) continue;
        applySovereignBurn(other, 1);
      }
    }
  }
}

function updateHeatConduction(dt) {
  state.heatConductionTimer += dt;
  const interval =
    HEAT_CONDUCTION_INTERVAL * (state.pyreFuelStacks >= 25 ? 0.7 : 1);
  if (state.heatConductionTimer < interval) return;
  state.heatConductionTimer = 0;
  const pulse = new THREE.Mesh(SOLAR_RING_GEO, SOLAR_RING_MAT.clone());
  pulse.rotation.x = -Math.PI / 2;
  pulse.position.copy(playerGroup.position);
  pulse.position.y = 0.06;
  scene.add(pulse);
  solarNovas.push({
    mesh: pulse,
    life: 0.55,
    maxLife: 0.55,
    radius: HEAT_CONDUCTION_RADIUS,
    visualOnly: true,
  });
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (e.mesh.position.distanceTo(playerGroup.position) > HEAT_CONDUCTION_RADIUS) continue;
    applySovereignBurn(e, 1);
    e.hitFlash = Math.max(e.hitFlash, 0.1);
    // Molten Core sigil: HC pulse deals 30% of one second's burn DPS as instant damage.
    if (state.moltenCoreActive) {
      const stacks = e.sovereignBurn?.stacks || 0;
      const moltenDmg = Math.floor(
        stacks * BURN_DPS_PER_STACK * state.magePower *
          (state.burnDpsMult || 1) * 0.30,
      );
      if (moltenDmg > 0) damageEnemy(i, moltenDmg, 0xffd36a, 0);
    }
  }
}

function updatePyreMomentum(dt) {
  // Pyre Fuel is now permanent and infinite — no decay logic. Stacks accumulate per kill.
  state.pyreMomentumTimer += dt;
  if (state.pyreMomentumTimer >= 1) {
    state.pyreMomentumTimer -= 1;
    state.pyreMomentumBonus = Math.min(
      PYRE_MOMENTUM_MAX,
      state.pyreMomentumBonus + PYRE_MOMENTUM_RATE,
    );
  }
}

function updateBurningGrounds(dt) {
  for (let i = burningGrounds.length - 1; i >= 0; i--) {
    const g = burningGrounds[i];
    g.life -= dt;
    g.tickCarry += g.dps * dt;
    if (g.tickCarry >= 1) {
      const chunk = Math.floor(g.tickCarry);
      g.tickCarry -= chunk;
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        const dx = e.mesh.position.x - g.pos.x;
        const dz = e.mesh.position.z - g.pos.z;
        if (dx * dx + dz * dz > g.radius * g.radius) continue;
        damageEnemy(j, chunk, 0xff5a16, 0);
      }
    }
    g.mesh.material.opacity = Math.max(0, (g.life / g.maxLife) * 0.32);
    if (g.life <= 0) {
      scene.remove(g.mesh);
      g.mesh.geometry.dispose();
      g.mesh.material.dispose();
      burningGrounds.splice(i, 1);
    }
  }
}

// ─── WAVE SYSTEM (port of 2D veltharas-dominion) ─────────────
// Time-based wave progression (20s per wave), wave-gated enemy pool, themed
// horde events every 5 waves. Each enemy index in ENEMY_TYPES is mapped here:
//   0 Poacher  1 ShadowStalker  2 BoneCrawler  3 FrostWraith
//   4 MagmaGolem  5 CrystalSentinel  6 SwampLurker  7 SandBurrower
const WAVE_DURATION = 20;          // seconds per wave (2D = 20000ms)
const WAVE_BASE_SPAWN = 1.0;       // seconds between spawns at wave 1
state.waveTimer = 0;
state.lastHordeWave = 0;
state.hordeQueue = [];             // pending horde enemies to drip in
state.hordeSpawnTimer = 0;
state._waveSpawnTimer = 0.5;       // first wave needs a moment to populate

// Returns the eligible ENEMY_TYPES indices weighted for the current wave.
// Earlier waves restrict the pool; later waves unlock heavy/elite enemies.
function getWaveEnemyPool(wave) {
  // [enemyIndex, weight]
  if (wave <= 2) return [[0, 6], [2, 3]];
  if (wave <= 4) return [[0, 5], [2, 3], [1, 2]];
  if (wave <= 6) return [[0, 4], [2, 3], [1, 3], [3, 2], [7, 1]];
  if (wave <= 9) return [[0, 4], [2, 2], [1, 4], [3, 3], [7, 2], [5, 1]];
  if (wave <= 14) return [[0, 3], [1, 3], [2, 2], [3, 3], [5, 2], [6, 2], [7, 2], [4, 1]];
  // Wave 15+: full pool, tank-class enemies weighted heavier.
  return [[0, 2], [1, 3], [2, 2], [3, 2], [4, 3], [5, 3], [6, 3], [7, 2]];
}

function pickEnemyFromPool(pool) {
  const total = pool.reduce((a, p) => a + p[1], 0);
  let roll = Math.random() * total;
  for (const [idx, w] of pool) {
    roll -= w;
    if (roll <= 0) return idx;
  }
  return pool[0][0];
}

// Spawn rate accelerates over time.
function getWaveSpawnInterval(wave) {
  if (wave <= 5) return WAVE_BASE_SPAWN * 0.95;
  if (wave <= 15) return WAVE_BASE_SPAWN * 0.75;
  if (wave <= 20) return WAVE_BASE_SPAWN * 0.55;
  if (wave <= 25) return WAVE_BASE_SPAWN * 0.40;
  return WAVE_BASE_SPAWN * 0.28;
}

// How many enemies can be alive at once.
function getWaveMaxAlive(wave) {
  if (wave <= 5) return 22;
  if (wave <= 10) return 32;
  if (wave <= 15) return 42;
  if (wave <= 20) return 60;
  if (wave <= 25) return 85;
  return 120;
}

// Horde theme by wave milestone. Each fires at wave % 5 === 0.
function getHordeTheme(wave) {
  if (wave >= 30) return { name: "Elite Horde",  pool: [[1, 2], [4, 2], [5, 2], [6, 2]], count: 30 + wave };
  if (wave >= 25) return { name: "Goblin Horde", pool: [[2, 4], [1, 3], [0, 2]],         count: 30 + wave };
  if (wave >= 20) return { name: "Frost Horde",  pool: [[3, 4], [4, 2], [0, 2]],         count: 28 + wave };
  if (wave >= 15) return { name: "Plague Horde", pool: [[3, 5], [0, 2], [2, 2]],         count: 26 + wave };
  if (wave >= 10) return { name: "Blood Horde",  pool: [[0, 3], [1, 3], [4, 2]],         count: 24 + wave };
  return                  { name: "Rabble Horde", pool: [[0, 4], [1, 3], [2, 2]],          count: 18 + wave };
}

// Stepped HP/dmg scaling so wave 5 isn't suddenly impossible.
function getWaveScaling(wave) {
  if (wave <= 9) return 1 + (wave - 1) * 0.05;
  if (wave <= 15) return 1.45 + (wave - 9) * 0.20;
  return 2.65 + (wave - 15) * 0.30;
}

// Re-write spawnEnemy's HP/dmg multipliers to use the new curve. We don't
// rewrite spawnEnemy itself — instead we gate scaling at construction time.
const _origSpawnEnemy = spawnEnemy;
spawnEnemy = function (type, opts = {}) {
  // Save the old per-spawn scaling so we can patch it after _origSpawnEnemy
  // creates the enemy. opts.isHorde marks horde members for a small HP buff.
  _origSpawnEnemy(type);
  const e = enemies[enemies.length - 1];
  if (!e) return;
  const scale = getWaveScaling(state.wave);
  const hordeMult = opts.isHorde ? 1.4 : 1;
  e.maxHp = Math.floor(e.type.hp * scale * hordeMult);
  e.hp = e.maxHp;
  e.dmg = Math.floor(e.type.dmg * Math.min(2.5, scale * 0.85));
  if (opts.isHorde) e.speed *= 0.7; // hordes are tankier and slower
};

function flashWaveBanner(text, color = "#ce93d8") {
  const el = document.getElementById("waveNotify");
  el.textContent = text;
  el.style.color = color;
  el.classList.add("show");
  setTimeout(() => { el.classList.remove("show"); el.style.color = ""; }, 2200);
}

function startHorde(wave) {
  const theme = getHordeTheme(wave);
  const queue = [];
  for (let i = 0; i < theme.count; i++) {
    queue.push(pickEnemyFromPool(theme.pool));
  }
  state.hordeQueue = queue;
  state.hordeSpawnTimer = 0;
  flashWaveBanner(`⚔ ${theme.name.toUpperCase()} INCOMING ⚔`, "#ff7733");
}

function updateWaveSystem(dt) {
  state.waveTimer += dt;
  if (state.waveTimer >= WAVE_DURATION) {
    state.waveTimer -= WAVE_DURATION;
    state.wave += 1;
    document.getElementById("waveLabel").textContent = `Wave ${state.wave}`;
    flashWaveBanner(`Wave ${state.wave}`);
    if (state.wave % 5 === 0 && state.wave !== state.lastHordeWave) {
      state.lastHordeWave = state.wave;
      startHorde(state.wave);
    }
  }

  // Drip horde enemies into the arena over time so they don't all spawn at once.
  if (state.hordeQueue.length > 0) {
    state.hordeSpawnTimer -= dt;
    if (state.hordeSpawnTimer <= 0) {
      const idx = state.hordeQueue.shift();
      spawnEnemy(idx, { isHorde: true });
      state.hordeSpawnTimer = 0.12;
    }
  }

  // Regular wave-driven spawning, capped by wave's max-alive.
  state._waveSpawnTimer -= dt;
  const maxAlive = getWaveMaxAlive(state.wave);
  if (state._waveSpawnTimer <= 0 && state.enemiesAlive < maxAlive) {
    const pool = getWaveEnemyPool(state.wave);
    // Burst size scales with wave so late game feels swarmy.
    const burstCap = Math.min(maxAlive - state.enemiesAlive, 1 + Math.floor(state.wave / 4));
    for (let b = 0; b < burstCap; b++) {
      spawnEnemy(pickEnemyFromPool(pool));
    }
    state._waveSpawnTimer = getWaveSpawnInterval(state.wave) + Math.random() * 0.2;
  }
}

function updatePeriodicSigils(dt) {
  if (state.pyroclasmActive) {
    state.pyroclasmTimer -= dt;
    if (state.pyroclasmTimer <= 0) {
      state.pyroclasmTimer = state.pyroclasmInterval;
      detonateAoE(playerGroup.position, state.pyroclasmRadius, state.pyroclasmDamage, 0xff7a18, 1);
    }
  }
  if (state.earthquakeActive) {
    state.earthquakeTimer -= dt;
    if (state.earthquakeTimer <= 0) {
      state.earthquakeTimer = state.earthquakeInterval;
      detonateAoE(playerGroup.position, state.earthquakeRadius, state.earthquakeDamage, 0x9c6033, 0);
    }
  }
}

// ─── PARTICLES (POOLED) ─────────────────────────────────────
const PART_GEO = new THREE.SphereGeometry(0.06, 4, 4);
const particleMatCache = {};
const particlePool = [];

function getParticleMat(color) {
  if (!particleMatCache[color]) {
    particleMatCache[color] = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
    });
  }
  return particleMatCache[color];
}

function spawnParticles(pos, color, count = 5) {
  const available = Math.max(0, MAX_ACTIVE_PARTICLES - particles.length);
  const spawnCount = Math.min(count, available);
  for (let i = 0; i < spawnCount; i++) {
    let p = particlePool.pop();
    if (!p) {
      const mesh = new THREE.Mesh(PART_GEO, getParticleMat(color));
      scene.add(mesh);
      p = { mesh };
    }
    p.mesh.material = getParticleMat(color);
    p.mesh.visible = true;
    p.mesh.material.opacity = 1;
    p.mesh.position.copy(pos);
    p.vel = new THREE.Vector3(
      (Math.random() - 0.5) * 6,
      Math.random() * 4,
      (Math.random() - 0.5) * 6,
    );
    p.life = 0.4 + Math.random() * 0.3;
    particles.push(p);
  }
}

// ─── XP ORBS ────────────────────────────────────────────────
const XP_GEO = new THREE.SphereGeometry(0.12, 6, 6);
const XP_MAT = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });

function spawnXpOrb(pos, amount) {
  const mesh = new THREE.Mesh(XP_GEO, XP_MAT);
  mesh.position.copy(pos);
  mesh.position.y = 0.5;
  scene.add(mesh);
  xpOrbs.push({ mesh, amount, life: 10 });
}

// Soul chests and shop: a light 3D version of Velthara's soul economy loop.
const chestMat = new THREE.MeshStandardMaterial({
  color: 0x7c3f12,
  emissive: 0xffb02e,
  emissiveIntensity: 0.18,
  roughness: 0.65,
});
const chestTrimMat = new THREE.MeshStandardMaterial({
  color: 0xffd36a,
  emissive: 0xffb02e,
  emissiveIntensity: 0.28,
  roughness: 0.5,
});

// Sigils now come exclusively through the Soul Shop. The shop rolls 3 fresh
// random sigil offers every chest-open, priced by rarity. The pacts below
// remain as always-available one-shot purchases.
const SIGIL_COSTS = { common: 4, rare: 10, epic: 22, legendary: 45 };
state.shopSigilOffers = []; // [{ name, icon, desc, rarity, effect, cost, taken? }]

function rollShopSigilOffers() {
  // Combine FIRE_SIGILS (one-shots, can't be re-offered after taken) with
  // SCALING_SIGILS (always re-offerable since stats stack).
  const fire = FIRE_SIGILS.filter((s) => !_takenSigilNames.has(s.name));
  const all = [...fire, ...SCALING_SIGILS];
  // Shuffle + take 3.
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  const picks = all.slice(0, 3);
  state.shopSigilOffers = picks.map((s) => ({
    sigil: s,
    cost: SIGIL_COSTS[s.rarity] || 8,
    bought: false,
  }));
}

const SOUL_SHOP_ITEMS = [
  // ── Soul Market Pacts (ported from 2D veltharas-dominion lines 167-198) ──
  {
    id: "pact_collector",
    name: "Collector Contract",
    desc: "Next 60 kills grant +1 bonus soul",
    baseCost: 8, oneShot: true,
    buy: () => { state.soulBountyKills = (state.soulBountyKills || 0) + 60; },
  },
  {
    id: "pact_grave_interest",
    name: "Grave Interest",
    desc: "+12% of held souls each shop visit (compounds)",
    baseCost: 10, oneShot: true,
    buy: () => { state.graveInterest = (state.graveInterest || 0) + 0.12; },
  },
  {
    id: "pact_furnace",
    name: "Soul Furnace",
    desc: "Burn 20% of held souls → +2 damage per burned soul",
    baseCost: 5, oneShot: false,
    buy: () => {
      const burn = Math.floor((state.souls + 5) * 0.20); // +5 we already deducted
      const gained = burn * 2;
      state.souls = Math.max(0, state.souls - burn);
      state.baseDamage += gained;
      flashWaveText?.(`🔥 Soul Furnace: -${burn} souls → +${gained} damage`);
    },
  },
  {
    id: "pact_insurance",
    name: "Death Insurance",
    desc: "Auto-revive at 50% HP once per game (huge cost)",
    baseCost: 60, oneShot: true,
    buy: () => { state.deathInsurance = true; },
  },
  // Curses — buy to GAIN souls in exchange for a permanent drawback.
  {
    id: "curse_blood_loan",
    name: "Blood Loan (curse)",
    desc: "Gain 12 souls. -12% max HP forever.",
    baseCost: -12, oneShot: true, isCurse: true,
    buy: () => {
      const cut = Math.floor(state.maxHp * 0.12);
      state.maxHp = Math.max(20, state.maxHp - cut);
      state.hp = Math.min(state.hp, state.maxHp);
    },
  },
  {
    id: "curse_glass_crown",
    name: "Glass Crown (curse)",
    desc: "Gain 10 souls. +30% damage, -25 max HP forever.",
    baseCost: -10, oneShot: true, isCurse: true,
    buy: () => {
      state.dmgBonus = (state.dmgBonus || 0) + 0.30;
      state.maxHp = Math.max(20, state.maxHp - 25);
      state.hp = Math.min(state.hp, state.maxHp);
    },
  },
];

function createSoulChestMesh() {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.65, 0.75), chestMat);
  base.position.y = 0.35;
  base.castShadow = true;
  group.add(base);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.82), chestTrimMat);
  lid.position.y = 0.78;
  lid.castShadow = true;
  group.add(lid);
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.85 }),
  );
  glow.position.y = 1.05;
  group.add(glow);
  group.userData.glow = glow;
  return group;
}

function spawnSoulChest() {
  const mesh = createSoulChestMesh();
  const angle = Math.random() * Math.PI * 2;
  const dist = 12 + Math.random() * 25;
  const x = Math.max(-ARENA_SIZE + 8, Math.min(ARENA_SIZE - 8, playerGroup.position.x + Math.cos(angle) * dist));
  const z = Math.max(-ARENA_SIZE + 8, Math.min(ARENA_SIZE - 8, playerGroup.position.z + Math.sin(angle) * dist));
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  soulChests.push({ mesh, opened: false });
  const el = document.getElementById("waveNotify");
  el.textContent = "Soul Chest Spawned";
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 1600);
}

function openNearestSoulChest() {
  let best = null;
  let bestDist = SOUL_CHEST_OPEN_RANGE;
  for (const chest of soulChests) {
    if (chest.opened) continue;
    const dist = chest.mesh.position.distanceTo(playerGroup.position);
    if (dist < bestDist) {
      best = chest;
      bestDist = dist;
    }
  }
  if (!best) return;
  best.opened = true;
  state.souls += 3 + Math.floor(state.wave / 2);
  document.getElementById("soulCount").textContent = state.souls;
  spawnParticles(best.mesh.position, 0xffd36a, 18);
  scene.remove(best.mesh);
  renderSoulShop();
  document.getElementById("soulShopOverlay").classList.remove("hidden");
  state.soulShopOpen = true;
  paused = true;
  releaseGamePointer();
}

function toggleSoulShop() {
  state.soulShopOpen = !state.soulShopOpen;
  paused = state.soulShopOpen;
  if (state.soulShopOpen) {
    releaseGamePointer();
    // First B-shop open of the run won't have offers yet (offers are normally
    // rolled on chest-open). Seed with an initial roll so the shop isn't empty.
    if (!state.shopSigilOffers || state.shopSigilOffers.length === 0) {
      rollShopSigilOffers();
    }
  }
  renderSoulShop();
  document
    .getElementById("soulShopOverlay")
    .classList.toggle("hidden", !state.soulShopOpen);
}

function renderSoulShop() {
  const container = document.getElementById("soulShopCards");
  if (!container) return;
  container.innerHTML = "";

  // ── Sigil offers (top section) ──
  for (const offer of state.shopSigilOffers || []) {
    const sig = offer.sigil;
    const cost = offer.cost;
    const purchased = offer.bought;
    const canAfford = state.souls >= cost;
    const card = document.createElement("div");
    card.className = `shop-card ${canAfford && !purchased ? "" : "disabled"}`;
    const rarityColor = sig.rarity === "legendary" ? "#ff9800"
      : sig.rarity === "epic" ? "#9c27b0"
      : sig.rarity === "rare" ? "#ffc107" : "#aaa";
    card.style.borderColor = rarityColor;
    card.innerHTML = `
      <div class="shop-name" style="color:${rarityColor}">${sig.icon} ${sig.name}</div>
      <div style="font-size:0.6rem; color:${rarityColor}; text-transform:uppercase; letter-spacing:1px; margin-top:-4px;">${sig.rarity} sigil</div>
      <div class="shop-desc">${sig.desc}</div>
      <div class="shop-cost">${purchased ? "PURCHASED" : `${cost} souls`}</div>
    `;
    card.onclick = () => {
      if (purchased || state.souls < cost) return;
      state.souls -= cost;
      sig.effect();
      if (FIRE_SIGILS.includes(sig)) _takenSigilNames.add(sig.name);
      offer.bought = true;
      document.getElementById("soulCount").textContent = state.souls;
      renderSoulShop();
    };
    container.appendChild(card);
  }

  // ── Pacts (always available) ──
  for (const item of SOUL_SHOP_ITEMS) {
    const level = state[item.id] || 0;
    // One-shot pacts: fixed cost, can only be bought once. Stackable: cost grows.
    const cost = item.oneShot ? item.baseCost : item.baseCost + level * 2;
    const purchased = item.oneShot && level >= 1;
    // Curses use a negative cost — they GIVE the player souls.
    const isCurse = item.isCurse;
    const canAfford = isCurse || state.souls >= cost;
    const card = document.createElement("div");
    card.className = `shop-card ${canAfford && !purchased ? "" : "disabled"}`;
    if (isCurse) card.style.borderColor = "rgba(220,38,38,0.6)";
    const costLabel = purchased
      ? "PURCHASED"
      : isCurse
        ? `+${Math.abs(cost)} souls`
        : `${cost} souls${item.oneShot ? "" : ` · Lv.${level}`}`;
    card.innerHTML = `
      <div class="shop-name">${item.name}</div>
      <div class="shop-desc">${item.desc}</div>
      <div class="shop-cost">${costLabel}</div>
    `;
    card.onclick = () => {
      if (purchased) return;
      if (!isCurse && state.souls < cost) return;
      // Negative cost = grant souls; positive = deduct.
      state.souls -= cost;
      state[item.id] = level + 1;
      item.buy();
      document.getElementById("soulCount").textContent = state.souls;
      renderSoulShop();
    };
    container.appendChild(card);
  }
}

function playerXpForLevel(level) {
  return Math.floor(50 * Math.pow(level, 1.5));
}

function showGameOver() {
  state.gameOver = true;
  paused = true;
  state.mouseDown = false;
  if (document.pointerLockElement === renderer.domElement)
    document.exitPointerLock();
  document.getElementById("pauseOverlay").classList.add("hidden");
  document.getElementById("gameOverKills").textContent = `${state.kills}`;
  document.getElementById("gameOverWave").textContent = `${state.wave}`;
  document.getElementById("gameOverOverlay").classList.remove("hidden");
}

// ─── WAVE SYSTEM ────────────────────────────────────────────
function startWave() {
  state.waveCooldown = false;
  const count = 5 + state.wave * 3;
  state.enemiesToSpawn = count;

  const el = document.getElementById("waveNotify");
  el.textContent = `Wave ${state.wave}`;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2000);
}

// ─── UPDATE ─────────────────────────────────────────────────
const clock = new THREE.Clock();
const _tmpVec3 = new THREE.Vector3();

function collidesWithTerrain(x, z, radius = 0.75) {
  for (const blocker of terrainBlockers) {
    if (blocker.type === "aabb") {
      // Closest-point-on-AABB to circle test: clamp the circle centre into
      // the AABB and measure distance to that clamped point.
      const cx = Math.max(blocker.x - blocker.halfW, Math.min(blocker.x + blocker.halfW, x));
      const cz = Math.max(blocker.z - blocker.halfD, Math.min(blocker.z + blocker.halfD, z));
      const dx = x - cx;
      const dz = z - cz;
      if (dx * dx + dz * dz < radius * radius) return true;
    } else {
      const dx = x - blocker.x;
      const dz = z - blocker.z;
      if (dx * dx + dz * dz < (blocker.radius + radius) ** 2) return true;
    }
  }
  return false;
}

function update() {
  const dt = Math.min(clock.getDelta(), 0.1);
  if (!state.gameStarted) return;
  if (paused) {
    if (state.soulShopOpen) renderSoulShop();
    return;
  }

  // ── Camera orbit from mouse movement
  // Always rotate camera orbit when pointer is locked, or use raw movementX

  // ── Camera-relative directions
  const forward = new THREE.Vector3(
    -Math.sin(cameraYaw),
    0,
    -Math.cos(cameraYaw),
  );
  const right = new THREE.Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));

  // ── Player movement (WASD relative to camera)
  let moveDir = new THREE.Vector3(0, 0, 0);
  if (keys["w"] || keys["KeyW"] || keys["arrowup"] || keys["ArrowUp"])
    moveDir.add(forward);
  if (keys["s"] || keys["KeyS"] || keys["arrowdown"] || keys["ArrowDown"])
    moveDir.sub(forward);
  if (keys["d"] || keys["KeyD"] || keys["arrowright"] || keys["ArrowRight"])
    moveDir.add(right);
  if (keys["a"] || keys["KeyA"] || keys["arrowleft"] || keys["ArrowLeft"])
    moveDir.sub(right);

  // Speed buff timers (Burning Fervor, Astral Drift)
  if (state.speedBuffTimer > 0) {
    state.speedBuffTimer -= dt;
    if (state.speedBuffTimer <= 0) state.speedBuffAmount = 0;
  }

  let isMoving = false;
  if (moveDir.lengthSq() > 0) {
    moveDir.normalize();
    isMoving = true;
    const spd =
      PLAYER_SPEED *
      (1 + (state.speedBonus || 0)) *
      (1 + state.speedBuffAmount);
    const nextX = Math.max(
      -ARENA_SIZE + 1,
      Math.min(ARENA_SIZE - 1, playerGroup.position.x + moveDir.x * spd * dt),
    );
    const nextZ = Math.max(
      -ARENA_SIZE + 1,
      Math.min(ARENA_SIZE - 1, playerGroup.position.z + moveDir.z * spd * dt),
    );
    if (!collidesWithTerrain(nextX, playerGroup.position.z)) {
      playerGroup.position.x = nextX;
    }
    if (!collidesWithTerrain(playerGroup.position.x, nextZ)) {
      playerGroup.position.z = nextZ;
    }
  }
  // Drive player animation from movement state.
  if (playerMixer) {
    if (isMoving) {
      // Use 'run' if any speed buff or sigil/item bumped speed enough; otherwise 'walk'.
      const totalSpeedBonus = (state.speedBonus || 0) + (state.speedBuffAmount || 0);
      setPlayerAnimation(totalSpeedBonus >= 0.20 && playerActions.run ? "run" : "walk");
    } else {
      setPlayerAnimation(null);
    }
    playerMixer.update(dt);
  }

  // Momentum sigil: +1% damage per second moving (max 50%).
  if (state.momentumActive) {
    if (isMoving) {
      state.momentumTimer += dt;
      state.momentumBonus = Math.min(0.50, state.momentumTimer * 0.01);
    } else {
      state.momentumTimer = 0;
      state.momentumBonus = 0;
    }
  }

  if (!state.grounded || state.verticalVelocity > 0) {
    state.verticalVelocity -= GRAVITY * dt;
    playerGroup.position.y += state.verticalVelocity * dt;
    if (playerGroup.position.y <= 0) {
      playerGroup.position.y = 0;
      state.verticalVelocity = 0;
      state.grounded = true;
    }
  }

  playerGroup.rotation.y = cameraYaw + PLAYER_MODEL_YAW_OFFSET;

  // ── Camera follow (over-the-shoulder, orbiting around player)
  cameraAim
    .set(
      -Math.sin(cameraYaw) * Math.cos(cameraPitch),
      Math.sin(cameraPitch),
      -Math.cos(cameraYaw) * Math.cos(cameraPitch),
    )
    .normalize();
  cameraFlatForward.set(cameraAim.x, 0, cameraAim.z).normalize();
  cameraRight.crossVectors(cameraFlatForward, WORLD_UP).normalize();
  cameraOffset
    .copy(cameraAim)
    .multiplyScalar(-CAMERA_DISTANCE)
    .addScaledVector(WORLD_UP, CAMERA_HEIGHT)
    .addScaledVector(cameraRight, CAMERA_SHOULDER);
  const desiredCamPos = playerGroup.position
    .clone()
    .add(new THREE.Vector3(0, CAMERA_LOOK_HEIGHT, 0))
    .add(cameraOffset);
  const desiredLookAt = playerGroup.position
    .clone()
    .add(new THREE.Vector3(0, CAMERA_LOOK_HEIGHT, 0))
    .addScaledVector(cameraAim, CAMERA_LOOK_AHEAD);
  // Camera "sticks" to the player rather than smoothly trailing.
  // The lerp was visibly lagging during forward motion — snap position, smooth look-at only.
  camera.position.copy(desiredCamPos);
  const lookAlpha = 1 - Math.exp(-dt * 18);
  smoothedCameraLook.lerp(desiredLookAt, lookAlpha);
  camera.lookAt(smoothedCameraLook);

  // Player light follow
  playerLight.position.set(playerGroup.position.x, 2, playerGroup.position.z);

  // Orb glow pulse (only if placeholder still active)
  if (!playerModelLoaded) {
    const pulse = 0.8 + Math.sin(clock.elapsedTime * 3) * 0.4;
    orbLight.intensity = pulse;
    orbMat.color.setHex(pulse > 1 ? 0xffcf70 : 0xff7a18);
  }

  // ── Shooting
  state.shootCooldown -= dt;
  state.qCooldown = Math.max(0, state.qCooldown - dt);
  state.eCooldown = Math.max(0, state.eCooldown - dt);
  state.iframes = Math.max(0, state.iframes - dt);
  state.solarDoubleBurnTimer = Math.max(0, state.solarDoubleBurnTimer - dt);
  updateAshParticles(dt);
  updatePyreMomentum(dt);
  updateHeatConduction(dt);
  updateSovereignBurns(dt);
  updateBurningGrounds(dt);
  updateSolarVisuals(dt);
  updatePeriodicSigils(dt);
  updateControlPoints(dt);
  updateDamageNumbers(dt);
  updateBurnIcons();
  autoFireSlash();

  // ── Slash effects: punchy expand + ease-out fade.
  for (let i = fireSlashes.length - 1; i >= 0; i--) {
    const s = fireSlashes[i];
    s.life -= dt;
    const t = 1 - Math.max(0, s.life / FIRE_SLASH_VISUAL_TIME); // 0 → 1
    // Ease-out cubic
    const ease = 1 - Math.pow(1 - t, 3);
    // Crescent grows ~12% over its lifetime — feels like a real swing.
    const scale = 1 + ease * 0.18;
    s.mesh.scale.set(scale, scale, scale);
    // Fade with quadratic so the arc punches in fully then drops off.
    s.mesh.material.opacity = (1 - ease * ease) * 0.95;
    // Re-anchor to the player so a moving caster's slash sweeps with them.
    s.mesh.position.x = playerGroup.position.x;
    s.mesh.position.z = playerGroup.position.z;
    if (s.life <= 0) {
      scene.remove(s.mesh);
      // Geometry is shared (FIRE_SLASH_GEO) — only dispose the per-slash material clone.
      s.mesh.material.dispose();
      fireSlashes.splice(i, 1);
    }
  }

  // ── Enemies
  for (let i = fireballs.length - 1; i >= 0; i--) {
    const f = fireballs[i];
    f.life -= dt;
    if (f.target && enemies.includes(f.target)) {
      const desired = new THREE.Vector3()
        .subVectors(f.target.mesh.position, f.mesh.position)
        .setY(0)
        .normalize()
        .multiplyScalar(FIREBALL_SPEED);
      f.vel.lerp(desired, Math.min(1, FIREBALL_TURN_RATE * dt));
    }
    f.mesh.position.addScaledVector(f.vel, dt);
    f.mesh.rotation.y += dt * 10;
    f.trailTimer = (f.trailTimer || 0) - dt;
    if (f.trailTimer <= 0) {
      f.trailTimer = 0.08;
      spawnParticles(f.mesh.position, 0xff7a18, 1);
    }

    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (f.hitEnemies.has(e)) continue;
      if (f.mesh.position.distanceTo(e.mesh.position) > e.type.size + 0.65) {
        continue;
      }
      f.hitEnemies.add(e);
      damageEnemy(j, f.damage, 0xff4400, f.burnStacks);
      if (f.pierce <= 0) {
        f.life = 0;
        break;
      }
      f.pierce--;
    }

    if (f.life <= 0) {
      scene.remove(f.mesh);
      f.mesh.geometry.dispose();
      f.mesh.material.dispose();
      fireballs.splice(i, 1);
    }
  }

  for (let i = solarNovas.length - 1; i >= 0; i--) {
    const n = solarNovas[i];
    n.life -= dt;
    const progress = 1 - n.life / n.maxLife;
    const radius = n.visualOnly
      ? n.radius * progress
      : SOLAR_CATACLYSM_RADIUS * (state.solarRadiusMult || 1) * progress;
    n.mesh.scale.setScalar(Math.max(0.1, radius));
    n.mesh.material.opacity = Math.max(0, n.life / n.maxLife) * 0.82;
    if (!n.visualOnly) {
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if (n.hitEnemies.has(e)) continue;
        if (
          e.mesh.position.distanceTo(playerGroup.position) >
          radius + e.type.size
        ) {
          continue;
        }
        n.hitEnemies.add(e);
        damageEnemy(j, state.baseDamage * 4.5 * (state.solarDamageMult || 1), 0xffcf70, 3);
      }
    }
    if (n.life <= 0) {
      scene.remove(n.mesh);
      n.mesh.geometry.dispose();
      n.mesh.material.dispose();
      solarNovas.splice(i, 1);
    }
  }

  for (const e of enemies) {
    // Move toward player, respecting terrain blockers (axis-separated like the player).
    // Stop when within attack range so enemies don't clip through the player —
    // both for gameplay readability and so sprite-direction always shows their
    // FRONT (they stay on the far side of the player from the camera).
    const toPlayerX = playerGroup.position.x - e.mesh.position.x;
    const toPlayerZ = playerGroup.position.z - e.mesh.position.z;
    const distToPlayerSq = toPlayerX * toPlayerX + toPlayerZ * toPlayerZ;
    const stopRange = e.type.size + 0.9;
    const stopRangeSq = stopRange * stopRange;
    if (distToPlayerSq > stopRangeSq) {
      const distToPlayer = Math.sqrt(distToPlayerSq);
      const dirX = toPlayerX / distToPlayer;
      const dirZ = toPlayerZ / distToPlayer;
      const stepX = dirX * e.speed * dt;
      const stepZ = dirZ * e.speed * dt;
      const enemyRadius = (e.type.size || 1) * 0.55;
      const candX = e.mesh.position.x + stepX;
      const candZ = e.mesh.position.z + stepZ;
      if (!collidesWithTerrain(candX, e.mesh.position.z, enemyRadius)) {
        e.mesh.position.x = candX;
      }
      if (!collidesWithTerrain(e.mesh.position.x, candZ, enemyRadius)) {
        e.mesh.position.z = candZ;
      }
    }

    if (!e.isModel && !e.isSprite) {
      // Sphere fallback: bobbing
      e.mesh.position.y =
        e.type.size + 0.1 + Math.sin(clock.elapsedTime * 3 + e.mesh.id) * 0.05;
    }

    // Face the player (used for both rotation-based meshes and sprite-direction selection).
    const faceAngle = Math.atan2(
      playerGroup.position.x - e.mesh.position.x,
      playerGroup.position.z - e.mesh.position.z,
    );
    e._facingAngle = faceAngle;

    if (e.isSprite) {
      // Megabonk-style 8-direction sprite swap. d0 was rendered with the
      // camera at -Y in Blender world (south of the model) — i.e. directly
      // facing the model's front. As `i` increases, camera orbits CCW (S → SE
      // → E → NE → N → NW → W → SW), so from the camera's POV the model
      // appears to rotate CW.
      //
      // In game we compute the model's facing direction relative to the
      // camera-to-enemy direction, then map that to the matching sprite.
      const camToEnemyX = e.mesh.position.x - camera.position.x;
      const camToEnemyZ = e.mesh.position.z - camera.position.z;
      const enemyToPlayerX = playerGroup.position.x - e.mesh.position.x;
      const enemyToPlayerZ = playerGroup.position.z - e.mesh.position.z;
      // Use the angle between (camera→enemy) and (enemy→player) measured
      // such that "facing camera" → π and "facing away" → 0.
      // dot/cross gives a signed angle in [-π, π].
      const dot = camToEnemyX * enemyToPlayerX + camToEnemyZ * enemyToPlayerZ;
      const cross = camToEnemyX * enemyToPlayerZ - camToEnemyZ * enemyToPlayerX;
      const localAngle = Math.atan2(cross, dot); // ±π means facing camera
      // Map: facing camera (|localAngle| = π) → d0,
      //      facing away (localAngle = 0)     → d4.
      // dirIndex grows as model rotates CW from camera POV (matches Blender's
      // CCW camera orbit).
      let dirF = ((Math.PI - localAngle) / (Math.PI * 2)) * NUM_ENEMY_DIRS;
      dirF = ((dirF % NUM_ENEMY_DIRS) + NUM_ENEMY_DIRS) % NUM_ENEMY_DIRS;
      const dirIndex = Math.floor(dirF + 0.5) % NUM_ENEMY_DIRS;

      // Advance the per-enemy idle animation timer.
      e._frameTimer = (e._frameTimer || 0) + dt;
      while (e._frameTimer >= ENEMY_FRAME_DURATION) {
        e._frameTimer -= ENEMY_FRAME_DURATION;
        e._frameIndex = ((e._frameIndex || 0) + 1) % NUM_ENEMY_FRAMES;
      }
      const frameIdx = e._frameIndex || 0;
      const row = e.spriteSet[dirIndex];
      const tex = row && (row[frameIdx] || row[0]);
      if (tex && e.mesh.material.map !== tex) {
        e.mesh.material.map = tex;
        e.mesh.material.needsUpdate = true;
      }
      // Ground bob. With pivot at bottom (sprite.center.y = 0), Y position is
      // the enemy's feet on the ground.
      e.mesh.position.y = Math.abs(Math.sin(clock.elapsedTime * 7 + e.mesh.id)) * 0.12;
    } else {
      e.mesh.rotation.y = faceAngle;
      // Walk animation — rock side to side while moving (skinned-mesh path only)
      const walkCycle = Math.sin(clock.elapsedTime * 6 + e.mesh.id * 2);
      e.mesh.rotation.z = walkCycle * 0.08;
      if (e.isModel) {
        const baseY = e._baseY || 0;
        e.mesh.position.y =
          baseY + Math.abs(Math.sin(clock.elapsedTime * 8 + e.mesh.id)) * 0.15;
      }
    }

    // Attack player
    e.attackCooldown -= dt;
    const distToPlayer = new THREE.Vector2(
      e.mesh.position.x - playerGroup.position.x,
      e.mesh.position.z - playerGroup.position.z,
    ).length();
    if (distToPlayer < e.type.size + 1.2 && e.attackCooldown <= 0) {
      e.attackCooldown = e.attackRate || 1.5;
      e._lungeTimer = 0.3;
      // I-frames: 0.4s of invulnerability after a hit so a stack of enemies
      // can't burst-kill the player in one frame at 2D damage values.
      if (state.iframes <= 0) {
        const incoming = e.dmg * (1 - state.damageReduction);
        state.hp -= incoming;
        state.iframes = 0.4;
        state.pyreMomentumBonus = 0;
        state.pyreMomentumTimer = 0;
        spawnParticles(playerGroup.position, 0xf87171, 3);
        if (state.hp <= 0) state.hp = 0;
      }
    }

    // Lunge tilt — kept only for the SkinnedMesh fallback path. Sprites
    // intentionally have no lunge: the user reported the close-range bob
    // was confusing the read of the swap, so we just let the sprite stay
    // anchored. Animation cells (Pass B) carry the visual "alive" feel.
    if (!e.isSprite) {
      if (e._lungeTimer > 0) {
        e._lungeTimer -= dt;
        e.mesh.rotation.x = -0.4 * (e._lungeTimer / 0.3);
      } else {
        e.mesh.rotation.x = 0;
      }
    }

    // Hit flash. Sprites use SpriteMaterial.color tint instead of emissive.
    if (e.isSprite) {
      const flash = e.hitFlash > 0 ? Math.min(1, e.hitFlash * 7) : 0;
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      const r = 1 + flash * 0.6;
      const g = 1 + flash * 0.2;
      const b = 1 + flash * 0.2;
      e.mesh.material.color.setRGB(Math.min(2, r), Math.min(2, g), Math.min(2, b));
    } else {
      if (e.hitFlash > 0) {
        e.hitFlash -= dt;
        setMeshEmissionIntensity(e.mesh, 4.0);
      } else {
        setMeshEmissionIntensity(e.mesh, 1.0);
      }
    }
  }

  // ── Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.mesh.position.addScaledVector(p.vel, dt);
    p.vel.y -= 10 * dt;
    p.life -= dt;
    p.mesh.material.opacity = Math.max(0, p.life / 0.5);
    if (p.life <= 0) {
      p.mesh.visible = false;
      particlePool.push(p);
      particles.splice(i, 1);
    }
  }

  // ── XP Orbs — float toward player when close
  // Magnet power-up extends pull range (state._puMagnet adds ~6 units per stack).
  const orbPullRange = 3 + (state._puMagnet || 0);
  const orbPullSpeed = 10 + (state._puMagnet || 0) * 2;
  for (let i = xpOrbs.length - 1; i >= 0; i--) {
    const o = xpOrbs[i];
    o.life -= dt;
    o.mesh.position.y = 0.5 + Math.sin(clock.elapsedTime * 4 + i) * 0.15;

    const orbDist = new THREE.Vector2(
      o.mesh.position.x - playerGroup.position.x,
      o.mesh.position.z - playerGroup.position.z,
    ).length();
    if (orbDist < orbPullRange) {
      const pullDir = new THREE.Vector3()
        .subVectors(playerGroup.position, o.mesh.position)
        .normalize();
      o.mesh.position.addScaledVector(pullDir, orbPullSpeed * dt);
    }
    if (orbDist < 0.8 || o.life <= 0) {
      if (orbDist < 0.8) {
        // Bent Coin item adds an XP multiplier on top of the sigil XP mult.
        const xpMult = (state.xpMult || 1) * (1 + (state._itemXpMultPct || 0));
        state.xp += Math.floor(o.amount * xpMult);
        while (state.xp >= state.xpToLevel) {
          state.xp -= state.xpToLevel;
          state.level++;
          state.maxHp += 5;
          state.baseDamage += 1;
          state.hp = state.maxHp;
          state.xpToLevel = playerXpForLevel(state.level);
          document.getElementById("levelLabel").textContent =
            `Lv.${state.level}`;
          showLevelUp();
        }
      }
      scene.remove(o.mesh);
      xpOrbs.splice(i, 1);
    }
  }

  // ── WAVE SYSTEM (ported from 2D) ──
  updateWaveSystem(dt);

  if (state.kills >= state.nextSoulChestKill) {
    spawnSoulChest();
    state.nextSoulChestKill += SOUL_CHEST_INTERVAL;
  }

  let chestNearby = false;
  for (const chest of soulChests) {
    if (chest.opened) continue;
    chest.mesh.rotation.y += dt * 0.9;
    if (chest.mesh.userData.glow) {
      chest.mesh.userData.glow.position.y =
        1.05 + Math.sin(clock.elapsedTime * 4) * 0.12;
    }
    if (
      chest.mesh.position.distanceTo(playerGroup.position) <=
      SOUL_CHEST_OPEN_RANGE
    ) {
      chestNearby = true;
    }
  }
  document
    .getElementById("interactPrompt")
    .classList.toggle("hidden", !chestNearby);

  // ── HP Regen
  if (state.hpRegen > 0 && state.hp > 0 && state.hp < state.maxHp) {
    state.hpRegenCarry += state.hpRegen * dt;
    if (state.hpRegenCarry >= 1) {
      const heal = Math.floor(state.hpRegenCarry);
      state.hpRegenCarry -= heal;
      state.hp = Math.min(state.maxHp, state.hp + heal);
    }
  }

  // ── Death: pacts/passives fire in priority order before game over.
  if (state.hp <= 0) {
    // Death Insurance pact — auto-revive at 50% HP. One-time.
    if (state.deathInsurance) {
      state.deathInsurance = false;
      state.hp = Math.floor(state.maxHp * 0.50);
      flashWaveText("⚰ DEATH INSURANCE ⚰", "#ffd36a");
      for (const e of enemies) e.attackCooldown = Math.max(e.attackCooldown, 1.5);
    }
  }
  if (state.hp <= 0) {
    if (state.phoenixAscendancyAvailable) {
      state.phoenixAscendancyAvailable = false;
      state.hp = Math.floor(state.maxHp * 0.30);
      // Trigger a free Solar Cataclysm to clear the pile-up that killed us.
      const eCdSnapshot = state.eCooldown;
      state.eCooldown = 0;
      castSolarCataclysm();
      state.eCooldown = Math.max(eCdSnapshot, state.eCooldown);
      // Also briefly grant invulnerability (i-frames) by clearing nearby enemy attack cds upward.
      for (const e of enemies) e.attackCooldown = Math.max(e.attackCooldown, 1.5);
      // Visual notify
      const el = document.getElementById("waveNotify");
      el.textContent = "PHOENIX RISES";
      el.classList.add("show");
      setTimeout(() => el.classList.remove("show"), 1800);
    } else {
      state.hp = 0;
      showGameOver();
    }
  }

  // ── HUD
  document.getElementById("hpBar").style.width =
    `${(state.hp / state.maxHp) * 100}%`;
  document.getElementById("xpBar").style.width =
    `${(state.xp / state.xpToLevel) * 100}%`;
  // Show whichever keystone the player picked + the universal Pyre Momentum bonus.
  const keystoneLabel = state.selectedRune === "stardustTree"
    ? `Stardust ${state.stardustStacks}`
    : `Pyre Fuel ${Math.floor(state.pyreFuelStacks)}`;
  document.getElementById("passiveMeta").textContent =
    `${keystoneLabel} · Momentum ${Math.round(state.pyreMomentumBonus * 100)}%`;
  // Note: #statsHud is owned by renderStatsPanel() (called on a 180ms cadence).
  // Don't write to it here or the brief 2-line string will flash between full updates.
  document.getElementById("qCooldown").style.height =
    `${(state.qCooldown / INFERNO_VOLLEY_COOLDOWN) * 100}%`;
  document.getElementById("eCooldown").style.height =
    `${(state.eCooldown / SOLAR_CATACLYSM_COOLDOWN) * 100}%`;
  document.getElementById("qSlot").classList.toggle("ready", state.qCooldown <= 0);
  document.getElementById("eSlot").classList.toggle("ready", state.eCooldown <= 0);
}

// ─── GAME LOOP ──────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  update();
  renderer.render(scene, camera);
}

// ─── PAUSE SYSTEM ───────────────────────────────────────────
let paused = false;
window.togglePause = function () {
  if (state.gameOver) return;
  paused = !paused;
  if (paused) releaseGamePointer();
  document.getElementById("pauseOverlay").classList.toggle("hidden", !paused);
};

// ─── SIGIL SYSTEM ───────────────────────────────────────────
const SIGILS = [
  {
    name: "Soul Drain",
    icon: "💀",
    desc: "+5% lifesteal on slash hits",
    rarity: "common",
    effect: () => {
      state.lifesteal = (state.lifesteal || 0) + 0.05;
    },
  },
  {
    name: "Arcane Surge",
    icon: "⚡",
    desc: "+20% slash damage",
    rarity: "common",
    effect: () => {
      state.dmgBonus = (state.dmgBonus || 0) + 0.2;
    },
  },
  {
    name: "Dark Vitality",
    icon: "❤️",
    desc: "+25 max HP, heal to full",
    rarity: "common",
    effect: () => {
      state.maxHp += 25;
      state.hp = state.maxHp;
    },
  },
  {
    name: "Swift Shadow",
    icon: "👟",
    desc: "+15% movement speed",
    rarity: "common",
    effect: () => {
      state.speedBonus = (state.speedBonus || 0) + 0.15;
    },
  },
  {
    name: "Rapid Fire",
    icon: "🔥",
    desc: "-30% shoot cooldown",
    rarity: "rare",
    effect: () => {
      state.cooldownMult = (state.cooldownMult || 1) * 0.7;
    },
  },
  {
    name: "Wider Cleave",
    icon: "🗡️",
    desc: "Slash hits 1 extra enemy",
    rarity: "rare",
    effect: () => {
      state.pierce = (state.pierce || 0) + 1;
    },
  },
  {
    name: "XP Feast",
    icon: "✨",
    desc: "+50% XP from kills",
    rarity: "rare",
    effect: () => {
      state.xpMult = (state.xpMult || 1) + 0.5;
    },
  },
  {
    name: "Death Nova",
    icon: "💥",
    desc: "Enemies explode on death, dealing AOE",
    rarity: "epic",
    effect: () => {
      state.deathNova = true;
    },
  },
  {
    name: "Necro Shield",
    icon: "🛡️",
    desc: "Block 1 hit every 10 seconds",
    rarity: "epic",
    effect: () => {
      state.shieldInterval = 10;
      state.shieldTimer = 0;
    },
  },
  {
    name: "Bone Army",
    icon: "💀",
    desc: "Summon 2 skeleton minions",
    rarity: "epic",
    effect: () => {
      state.minions = (state.minions || 0) + 2;
    },
  },
  {
    name: "Void Embrace",
    icon: "🌀",
    desc: "+100% damage, -20% max HP",
    rarity: "legendary",
    effect: () => {
      state.dmgBonus = (state.dmgBonus || 0) + 1.0;
      state.maxHp = Math.floor(state.maxHp * 0.8);
      state.hp = Math.min(state.hp, state.maxHp);
    },
  },
  {
    name: "Eternal Hunger",
    icon: "🩸",
    desc: "+15% lifesteal, +30% damage",
    rarity: "legendary",
    effect: () => {
      state.lifesteal = (state.lifesteal || 0) + 0.15;
      state.dmgBonus = (state.dmgBonus || 0) + 0.3;
    },
  },
];

// Fire Sovereign class sigils — semantics ported from 2D veltharas-dominion.js.
// Each rarity tier mirrors the 2D Faded/Runed/Empowered/Ascendant categories, but
// the effects are gated to Fire Sovereign's burn-and-stack identity.
const FIRE_SIGILS = [
  // ── Faded (common) ──
  {
    name: "Ember Touch", icon: "🔥", desc: "+15% burn DPS", rarity: "common",
    effect: () => { state.burnDpsMult = (state.burnDpsMult || 1) * 1.15; },
  },
  {
    name: "Kindling", icon: "🪵", desc: "+1 max burn stack", rarity: "common",
    effect: () => { state.maxBurnStacks = (state.maxBurnStacks || MAX_BURN_STACKS) + 1; },
  },
  {
    name: "Flame Reach", icon: "🎯", desc: "+20% fire slash range", rarity: "common",
    effect: () => { state.fireRangeMult = (state.fireRangeMult || 1) * 1.2; },
  },
  // ── Runed (rare) ──
  {
    name: "Conflagration", icon: "💥",
    desc: "Max-stacked enemies spread 1 burn to nearby foes every 2s",
    rarity: "rare",
    effect: () => {
      state.conflagrationActive = true;
      state.conflagrationTimer = CONFLAGRATION_INTERVAL;
    },
  },
  {
    name: "Molten Core", icon: "🌋",
    desc: "Heat Conduction pulse deals 30% of burn DPS as instant damage",
    rarity: "rare",
    effect: () => { state.moltenCoreActive = true; },
  },
  {
    name: "Blazing Pursuit", icon: "💨",
    desc: "Inferno Volley: +40% fireball speed and +1 pierce",
    rarity: "rare",
    effect: () => { state.blazingPursuitActive = true; },
  },
  // ── Empowered (epic) ──
  {
    name: "Immolation Aura", icon: "🔥",
    desc: "Inferno Volley +3 fireballs and +2 burn stacks per hit",
    rarity: "epic",
    effect: () => { state.immolationAuraActive = true; },
  },
  {
    name: "Inferno Sovereign", icon: "👑",
    desc: "+2 max burn stacks, Living Flame doubled (max +24%)",
    rarity: "epic",
    effect: () => {
      state.maxBurnStacks = (state.maxBurnStacks || MAX_BURN_STACKS) + 2;
      state.infernoSovereignActive = true;
    },
  },
  // ── Ascendant (legendary) ──
  {
    name: "Supernova", icon: "☀️",
    desc: "Solar Cataclysm radius +60%, leaves burning ground for 6s",
    rarity: "legendary",
    effect: () => {
      state.solarRadiusMult = (state.solarRadiusMult || 1) * 1.6;
      state.supernovaActive = true;
    },
  },
  {
    name: "Eternal Pyre", icon: "♾️",
    desc: "Burn stacks never decay, +25% burn DPS",
    rarity: "legendary",
    effect: () => {
      state.eternalPyreActive = true;
      state.burnDpsMult = (state.burnDpsMult || 1) * 1.25;
    },
  },
  {
    name: "Phoenix Ascendancy", icon: "🦅",
    desc: "On lethal damage, revive at 30% HP and trigger Solar Cataclysm (once per run)",
    rarity: "legendary",
    effect: () => { state.phoenixAscendancyAvailable = true; },
  },
];

// Universal scaling sigils — ported from 2D's FADED/RUNED/EMPOWERED/ASCENDANT pools.
// Tuned for 3D's units (HP regen in HP/sec, speed as multiplier offset, damage flat).
const SCALING_SIGILS = [
  // ── Faded (common) ──
  { name: "Faded Sigil of Vitality",  icon: "❤️", desc: "+30 Max HP",         rarity: "common", effect: () => { state.maxHp += 30; state.hp += 30; } },
  { name: "Faded Sigil of Might",     icon: "⚔️", desc: "+15 Damage",         rarity: "common", effect: () => { state.baseDamage += 15; } },
  { name: "Faded Sigil of Swiftness", icon: "💨", desc: "+10% Movement Speed",rarity: "common", effect: () => { state.speedBonus = (state.speedBonus || 0) + 0.10; } },
  { name: "Faded Sigil of Recovery",  icon: "💚", desc: "+0.4 HP / sec",      rarity: "common", effect: () => { state.hpRegen += 0.4; } },
  { name: "Faded Sigil of Precision", icon: "🎯", desc: "+3% Crit Chance",    rarity: "common", effect: () => { state.critChance += 0.03; } },
  { name: "Faded Sigil of Endurance", icon: "🛡️", desc: "+20 HP, +6% Speed",  rarity: "common", effect: () => { state.maxHp += 20; state.hp += 20; state.speedBonus = (state.speedBonus || 0) + 0.06; } },
  { name: "Faded Sigil of Haste",     icon: "⚡", desc: "+7% Fire Rate",      rarity: "common", effect: () => { state.fireRateBonus += 0.07; } },
  // ── Runed (rare) ──
  { name: "Runed Sigil of Vitality",   icon: "❤️‍🔥", desc: "+60 Max HP",          rarity: "rare", effect: () => { state.maxHp += 60; state.hp += 60; } },
  { name: "Runed Sigil of Might",      icon: "🗡️", desc: "+28 Damage",            rarity: "rare", effect: () => { state.baseDamage += 28; } },
  { name: "Runed Sigil of Swiftness",  icon: "🌪️", desc: "+18% Movement Speed",   rarity: "rare", effect: () => { state.speedBonus = (state.speedBonus || 0) + 0.18; } },
  { name: "Runed Sigil of Recovery",   icon: "💖", desc: "+0.8 HP / sec",         rarity: "rare", effect: () => { state.hpRegen += 0.8; } },
  { name: "Runed Sigil of Ferocity",   icon: "🔥", desc: "+12% Fire Rate",        rarity: "rare", effect: () => { state.fireRateBonus += 0.12; } },
  { name: "Runed Sigil of Fortitude",  icon: "🏰", desc: "+45 HP, +12 Damage",    rarity: "rare", effect: () => { state.maxHp += 45; state.hp += 45; state.baseDamage += 12; } },
  { name: "Runed Sigil of Agility",    icon: "⚡", desc: "+12% Speed, +4% Crit",  rarity: "rare", effect: () => { state.speedBonus = (state.speedBonus || 0) + 0.12; state.critChance += 0.04; } },
  { name: "Runed Sigil of Fury",       icon: "💢", desc: "+18 Damage, +8% Rate",  rarity: "rare", effect: () => { state.baseDamage += 18; state.fireRateBonus += 0.08; } },
  { name: "Runed Sigil of Tenacity",   icon: "🛡️", desc: "-15% Damage Taken, +45 HP", rarity: "rare", effect: () => { state.damageReduction = Math.min(0.75, state.damageReduction + 0.15); state.maxHp += 45; state.hp += 45; } },
  // ── Empowered (epic) ──
  { name: "Empowered Sigil of Vitality",   icon: "💗", desc: "+120 Max HP",                   rarity: "epic", effect: () => { state.maxHp += 120; state.hp += 120; } },
  { name: "Empowered Sigil of Might",      icon: "⚔️", desc: "+35 Damage",                    rarity: "epic", effect: () => { state.baseDamage += 35; } },
  { name: "Empowered Sigil of Swiftness",  icon: "🌀", desc: "+30% Movement Speed",           rarity: "epic", effect: () => { state.speedBonus = (state.speedBonus || 0) + 0.30; } },
  { name: "Empowered Sigil of Recovery",   icon: "✨", desc: "+1.6 HP / sec",                 rarity: "epic", effect: () => { state.hpRegen += 1.6; } },
  { name: "Empowered Sigil of Devastation",icon: "💥", desc: "+25 Damage, +10% Fire Rate",    rarity: "epic", effect: () => { state.baseDamage += 25; state.fireRateBonus += 0.10; } },
  { name: "Empowered Sigil of Juggernaut", icon: "🦾", desc: "+90 HP, +12 Damage, +8% Speed", rarity: "epic", effect: () => { state.maxHp += 90; state.hp += 90; state.baseDamage += 12; state.speedBonus = (state.speedBonus || 0) + 0.08; } },
  { name: "Empowered Sigil of Assassin",   icon: "🗡️", desc: "+25% Crit Damage, +7% Crit Chance", rarity: "epic", effect: () => { state.critMultiplier += 0.25; state.critChance += 0.07; } },
  { name: "Empowered Sigil of Pyroclasm",  icon: "🌋", desc: "Every 8s: AoE explosion (250 dmg, 12u radius)", rarity: "epic",
    effect: () => { state.pyroclasmActive = true; state.pyroclasmTimer = state.pyroclasmInterval; } },
  { name: "Empowered Sigil of Supernova",  icon: "💫", desc: "+20 Damage. Every 15 kills: 6u nova (400 dmg)", rarity: "epic",
    effect: () => { state.baseDamage += 20; state.killNovaActive = true; state.killNovaCounter = 0; } },
  { name: "Empowered Sigil of Tremors",    icon: "🌊", desc: "+60 HP, +12% Speed. Every 6s: stomp 150 dmg", rarity: "epic",
    effect: () => { state.maxHp += 60; state.hp += 60; state.speedBonus = (state.speedBonus || 0) + 0.12; state.earthquakeActive = true; state.earthquakeTimer = state.earthquakeInterval; } },
  // ── Ascendant (legendary) ──
  { name: "Ascendant: Berserker's Fury",  icon: "😤", desc: "+180 HP, +40 Damage. +1% damage per 1% HP missing", rarity: "legendary",
    effect: () => { state.maxHp += 180; state.hp += 180; state.baseDamage += 40; state.berserkerActive = true; } },
  { name: "Ascendant: Titan's Resolve",   icon: "🗿", desc: "+300 HP, +20 Damage. -15% Damage Taken", rarity: "legendary",
    effect: () => { state.maxHp += 300; state.hp += 300; state.baseDamage += 20; state.damageReduction = Math.min(0.75, state.damageReduction + 0.15); } },
  { name: "Ascendant: Executioner's Call",icon: "⚰️", desc: "+50 Damage, +50% Crit Damage. Enemies <20% HP take 2x", rarity: "legendary",
    effect: () => { state.baseDamage += 50; state.critMultiplier += 0.50; state.executionerActive = true; } },
  { name: "Ascendant: Vampire's Embrace", icon: "🧛", desc: "+120 HP, +30 Damage. 5% lifesteal", rarity: "legendary",
    effect: () => { state.maxHp += 120; state.hp += 120; state.baseDamage += 30; state.lifesteal += 0.05; } },
  { name: "Ascendant: Momentum's Edge",   icon: "🏃", desc: "+20% Speed, +25 Damage. +1% damage per second moving (max 50%)", rarity: "legendary",
    effect: () => { state.speedBonus = (state.speedBonus || 0) + 0.20; state.baseDamage += 25; state.momentumActive = true; } },
];

let levelUpPending = false;

// Rarity weights match 2D drop curve: common 60% / rare 25% / epic 12% / legendary 3%.
const RARITY_WEIGHTS = { common: 60, rare: 25, epic: 12, legendary: 3 };
const _takenSigilNames = new Set();

function rollRarity() {
  const total = RARITY_WEIGHTS.common + RARITY_WEIGHTS.rare + RARITY_WEIGHTS.epic + RARITY_WEIGHTS.legendary;
  let roll = Math.random() * total;
  if ((roll -= RARITY_WEIGHTS.common) < 0) return "common";
  if ((roll -= RARITY_WEIGHTS.rare) < 0) return "rare";
  if ((roll -= RARITY_WEIGHTS.epic) < 0) return "epic";
  return "legendary";
}

function pickRandomSigilOfRarity(rarity) {
  const fire = FIRE_SIGILS.filter((s) => s.rarity === rarity && !_takenSigilNames.has(s.name));
  // Scaling sigils can repeat (stat stacks), so don't gate by taken set for them.
  const scaling = SCALING_SIGILS.filter((s) => s.rarity === rarity);
  // Class sigils get a 50% bias when available — keeps Fire Sovereign identity readable.
  if (fire.length > 0 && Math.random() < 0.5) {
    return fire[Math.floor(Math.random() * fire.length)];
  }
  const pool = scaling.length > 0 ? scaling : fire;
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function showLevelUp() {
  levelUpPending = true;
  paused = true;
  releaseGamePointer();
  const overlay = document.getElementById("levelUpOverlay");
  const container = document.getElementById("sigilCards");
  overlay.classList.remove("hidden");

  // Build a candidate pool. Items already in inventory are always offered (a
  // pick = level them up). New items are only offered if there's a free slot.
  const inventoryFull = inventory.length >= INVENTORY_SLOTS;
  const candidates = [];
  for (const [defKey, def] of Object.entries(ITEM_DEFS)) {
    const existing = inventory.find((it) => it.defKey === defKey);
    if (existing || !inventoryFull) {
      candidates.push({ defKey, def, currentLevel: existing ? existing.level : 0 });
    }
  }
  // Shuffle and take 3 distinct items.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const picks = candidates.slice(0, 3);

  container.innerHTML = "";
  for (const c of picks) {
    const isLevelUp = c.currentLevel > 0;
    const titleSuffix = isLevelUp ? ` Lv${c.currentLevel} → Lv${c.currentLevel + 1}` : " (NEW)";
    const card = document.createElement("div");
    // Items use rarity-style colour; level-up = rare, new = common.
    const rarityClass = isLevelUp ? "rare" : "common";
    card.className = `lu-card ${rarityClass}`;
    card.style.borderColor = c.def.color;
    card.innerHTML = `
            <div class="lu-card-rarity" style="color:${c.def.color}">${isLevelUp ? "LEVEL UP" : "NEW ITEM"}</div>
            <div class="lu-card-icon">${c.def.icon}</div>
            <div class="lu-card-name">${c.def.name}${titleSuffix}</div>
            <div class="lu-card-desc">${c.def.desc}</div>
        `;
    card.onclick = () => {
      pickItem(c.defKey);
      overlay.classList.add("hidden");
      paused = false;
      clearInputState();
      levelUpPending = false;
      renderer.domElement.focus();
      if (!pointerLocked) {
        try { renderer.domElement.requestPointerLock(); } catch (_) {}
      }
    };
    container.appendChild(card);
  }
  // Edge case: if inventory is full and the 3 picks include nothing the player
  // already owns (so they're stuck), fall through with a "Skip" message.
  if (picks.length === 0) {
    const card = document.createElement("div");
    card.className = "lu-card common";
    card.innerHTML = `
            <div class="lu-card-rarity">FULL INVENTORY</div>
            <div class="lu-card-icon">🛑</div>
            <div class="lu-card-name">No items available</div>
            <div class="lu-card-desc">Press to continue.</div>
        `;
    card.onclick = () => {
      overlay.classList.add("hidden");
      paused = false;
      clearInputState();
      levelUpPending = false;
      renderer.domElement.focus();
      if (!pointerLocked) try { renderer.domElement.requestPointerLock(); } catch (_) {}
    };
    container.appendChild(card);
  }
}

// ─── INVENTORY (8-slot, leveled stacks, ported from 2D applyItemEffects) ─────
const INVENTORY_SLOTS = 8;
const inventory = []; // entries: { defKey, level }

const ITEM_DEFS = {
  rusty_sword: {
    name: "Rusty Sword", icon: "🗡", color: "#ff6b6b",
    desc: "+8 damage per level",
    statsAt: (lv) => ({ dmgFlat: 8 * lv }),
  },
  cracked_lens: {
    name: "Cracked Lens", icon: "🔮", color: "#a855f7",
    desc: "+3% crit chance / level",
    statsAt: (lv) => ({ critFlat: 0.03 * lv }),
  },
  worn_gloves: {
    name: "Worn Gloves", icon: "🧤", color: "#fbbf24",
    desc: "+5% fire rate / level",
    statsAt: (lv) => ({ atkSpdPct: 0.05 * lv }),
  },
  tattered_boots: {
    name: "Tattered Boots", icon: "👢", color: "#22d3ee",
    desc: "+8% movement speed / level",
    statsAt: (lv) => ({ moveSpdPct: 0.08 * lv }),
  },
  smudged_tome: {
    name: "Smudged Tome", icon: "📕", color: "#f472b6",
    desc: "+12% mage power (burn) / level",
    statsAt: (lv) => ({ magePowerPct: 0.12 * lv }),
  },
  multiplier_charm: {
    name: "Multiplier", icon: "✖", color: "#60a5fa",
    desc: "+1 extra Fire Slash arc / 2 levels",
    statsAt: (lv) => ({ slashFlat: Math.floor(lv / 2) }),
  },
  ember_amulet: {
    name: "Ember Amulet", icon: "🔥", color: "#fb923c",
    desc: "+15% burn DPS / level",
    statsAt: (lv) => ({ burnDpsPct: 0.15 * lv }),
  },
  iron_charm: {
    name: "Iron Charm", icon: "⛓", color: "#94a3b8",
    desc: "-4% damage taken / level (cap 60%)",
    statsAt: (lv) => ({ drFlat: 0.04 * lv }),
  },
  // ── Three more items ported from 2D (lines 121-132 of veltharas-dominion).
  bent_coin: {
    name: "Bent Coin", icon: "🪙", color: "#facc15",
    desc: "+8% XP gain per level",
    statsAt: (lv) => ({ xpMultPct: 0.08 * lv }),
  },
  healing_aura: {
    name: "Healing Aura", icon: "✚", color: "#86efac",
    desc: "+0.6 HP regen + 3% max HP per level",
    statsAt: (lv) => ({ hpRegenFlat: 0.6 * lv, maxHpPct: 0.03 * lv }),
  },
  radiant_aegis: {
    name: "Radiant Aegis", icon: "🛡✨", color: "#fde68a",
    desc: "+5% healing received per level (also +5 max HP/level)",
    statsAt: (lv) => ({ maxHpFlat: 5 * lv, healRecvPct: 0.05 * lv }),
  },
};

// Re-applied each frame: zero-out then sum item contributions into the
// _item* shadow stats so multiple items stack predictably.
function applyItemEffects() {
  let dmgFlat = 0;
  let critFlat = 0;
  let atkSpdPct = 0;
  let moveSpdPct = 0;
  let magePowerPct = 0;
  let slashFlat = 0;
  let burnDpsPct = 0;
  let drFlat = 0;
  let xpMultPct = 0;
  let hpRegenFlat = 0;
  let maxHpPct = 0;
  let maxHpFlat = 0;
  let healRecvPct = 0;
  for (const item of inventory) {
    const def = ITEM_DEFS[item.defKey];
    if (!def) continue;
    const s = def.statsAt(item.level);
    dmgFlat += s.dmgFlat || 0;
    critFlat += s.critFlat || 0;
    atkSpdPct += s.atkSpdPct || 0;
    moveSpdPct += s.moveSpdPct || 0;
    magePowerPct += s.magePowerPct || 0;
    slashFlat += s.slashFlat || 0;
    burnDpsPct += s.burnDpsPct || 0;
    drFlat += s.drFlat || 0;
    xpMultPct += s.xpMultPct || 0;
    hpRegenFlat += s.hpRegenFlat || 0;
    maxHpPct += s.maxHpPct || 0;
    maxHpFlat += s.maxHpFlat || 0;
    healRecvPct += s.healRecvPct || 0;
  }
  state._itemDmgFlat = dmgFlat;
  state._itemCritFlat = critFlat;
  state._itemAtkSpdPct = atkSpdPct;
  state._itemMoveSpdPct = moveSpdPct;
  state._itemMagePowerPct = magePowerPct;
  state._itemSlashFlat = slashFlat;
  state._itemBurnDpsPct = burnDpsPct;
  state._itemDrFlat = Math.min(0.60, drFlat);
  state._itemXpMultPct = xpMultPct;
  state._itemHpRegenFlat = hpRegenFlat;
  state._itemMaxHpPct = maxHpPct;
  state._itemMaxHpFlat = maxHpFlat;
  state._itemHealRecvPct = healRecvPct;
}

function applyItemMaxHpDelta(defKey, fromLevel, toLevel) {
  // Apply the max-HP bonus difference between two item levels.
  // (One-shot at pickup/levelup so it doesn't drift with delta recompute.)
  const def = ITEM_DEFS[defKey];
  if (!def) return;
  const before = def.statsAt(fromLevel);
  const after = def.statsAt(toLevel);
  const dPct = (after.maxHpPct || 0) - (before.maxHpPct || 0);
  const dFlat = (after.maxHpFlat || 0) - (before.maxHpFlat || 0);
  if (dPct === 0 && dFlat === 0) return;
  const oldMax = state.maxHp;
  state.maxHp = Math.floor(oldMax * (1 + dPct) + dFlat);
  // Keep the player's current HP proportional so a pickup feels like a buff.
  state.hp = Math.min(state.maxHp, state.hp + (state.maxHp - oldMax));
}

function pickItem(defKey) {
  const existing = inventory.find((it) => it.defKey === defKey);
  if (existing) {
    existing.level += 1;
    applyItemMaxHpDelta(defKey, existing.level - 1, existing.level);
    renderInventoryBar();
    return;
  }
  if (inventory.length >= INVENTORY_SLOTS) return; // full inventory drops the pickup
  inventory.push({ defKey, level: 1 });
  applyItemMaxHpDelta(defKey, 0, 1);
  renderInventoryBar();
}

function rollItemDrop() {
  const keys = Object.keys(ITEM_DEFS);
  return keys[Math.floor(Math.random() * keys.length)];
}

function renderInventoryBar() {
  const bar = document.getElementById("invBar");
  if (!bar) return;
  bar.innerHTML = "";
  for (let i = 0; i < INVENTORY_SLOTS; i++) {
    const slot = document.createElement("div");
    slot.className = "inv-slot";
    const item = inventory[i];
    if (item) {
      const def = ITEM_DEFS[item.defKey];
      slot.classList.add("filled");
      slot.style.borderColor = def.color;
      slot.title = `${def.name} Lv.${item.level} — ${def.desc}`;
      slot.innerHTML = `<div class="inv-icon">${def.icon}</div><div class="inv-level">${item.level}</div>`;
    }
    bar.appendChild(slot);
  }
}
renderInventoryBar();

// ─── POWER-UP PICKUPS ────────────────────────────────────────
const POWER_UP_TYPES = {
  soul: {
    name: "Soul Surge", icon: "👻", color: 0xc77dff, drop: 0.08,
    instant: true,
    apply: () => {
      state.souls += 5;
      document.getElementById("soulCount").textContent = state.souls;
    },
  },
  frenzy: {
    name: "Frenzy", icon: "⚔", color: 0xff5a16, duration: 8,
    apply: () => {},
    onTick: () => {},
    onApply: () => { state._puFireRate = (state._puFireRate || 0) + 0.40; },
    onExpire: () => { state._puFireRate -= 0.40; },
  },
  inferno: {
    name: "Inferno", icon: "🔥", color: 0xff7728, duration: 10,
    onApply: () => { state._puDmg = (state._puDmg || 0) + 0.40; },
    onExpire: () => { state._puDmg -= 0.40; },
  },
  wraith: {
    name: "Wraith Step", icon: "💨", color: 0x60a5fa, duration: 6,
    onApply: () => { state._puSpeed = (state._puSpeed || 0) + 0.50; },
    onExpire: () => { state._puSpeed -= 0.50; },
  },
  magnet: {
    name: "Magnet", icon: "🧲", color: 0xfbbf24, duration: 12,
    onApply: () => { state._puMagnet = (state._puMagnet || 0) + 6; },
    onExpire: () => { state._puMagnet -= 6; },
  },
  heal: {
    name: "Phoenix Tear", icon: "❤️", color: 0xf87171, drop: 0.04,
    instant: true,
    apply: () => { state.hp = Math.min(state.maxHp, state.hp + Math.floor(state.maxHp * 0.30)); },
  },
};

const pickups = [];
const PICKUP_GEO = new THREE.SphereGeometry(0.32, 10, 10);

function spawnPickup(typeKey, pos) {
  const type = POWER_UP_TYPES[typeKey];
  if (!type) return;
  const mesh = new THREE.Mesh(PICKUP_GEO, new THREE.MeshBasicMaterial({ color: type.color }));
  mesh.position.set(pos.x, 0.6, pos.z);
  scene.add(mesh);
  // No more PointLight — too expensive when many drop simultaneously
  // (each light multiplies forward-renderer cost across every visible mesh).
  // Visual readability comes from the additive "halo" billboard below instead.
  const haloGeo = new THREE.PlaneGeometry(1.2, 1.2);
  const haloMat = new THREE.MeshBasicMaterial({
    color: type.color,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.position.set(pos.x, 0.6, pos.z);
  scene.add(halo);
  pickups.push({ mesh, halo, typeKey, life: 25, baseY: 0.6 });
}

function maybeDropPickupAt(pos) {
  // ~4% chance of any drop on a kill, weighted across power-up types.
  if (Math.random() > 0.04) return;
  // Also small chance to drop an inventory item instead (~25% of drops).
  if (Math.random() < 0.25) {
    spawnItemPickup(pos);
    return;
  }
  // Pick a power-up by relative drop weights (default 0.16 each).
  const entries = Object.entries(POWER_UP_TYPES);
  const totalWeight = entries.reduce((acc, [, t]) => acc + (t.drop || 0.16), 0);
  let roll = Math.random() * totalWeight;
  for (const [key, t] of entries) {
    roll -= t.drop || 0.16;
    if (roll <= 0) {
      spawnPickup(key, pos);
      return;
    }
  }
}

const itemPickups = []; // separate from power-up pickups (different on-pickup behaviour)
const ITEM_PICKUP_GEO = new THREE.OctahedronGeometry(0.36, 0);
function spawnItemPickup(pos) {
  const defKey = rollItemDrop();
  const def = ITEM_DEFS[defKey];
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(def.color) });
  const mesh = new THREE.Mesh(ITEM_PICKUP_GEO, mat);
  mesh.position.set(pos.x, 0.7, pos.z);
  scene.add(mesh);
  // Billboard halo instead of PointLight (see spawnPickup for the perf reasoning).
  const haloMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(def.color),
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), haloMat);
  halo.position.set(pos.x, 0.7, pos.z);
  scene.add(halo);
  itemPickups.push({ mesh, halo, defKey, life: 30, baseY: 0.7 });
}

function activatePowerUp(typeKey) {
  const type = POWER_UP_TYPES[typeKey];
  if (!type) return;
  if (type.instant) {
    type.apply();
    flashWaveText(`${type.icon} ${type.name}`);
    return;
  }
  // Stackable timed buff: extend duration if already active.
  if (!state._activePU) state._activePU = {};
  if (state._activePU[typeKey]) {
    state._activePU[typeKey].timer += type.duration;
  } else {
    state._activePU[typeKey] = { timer: type.duration, type };
    type.onApply?.();
  }
  flashWaveText(`${type.icon} ${type.name}`);
  renderPowerUpBanner();
}

function flashWaveText(text, ms = 1100) {
  const el = document.getElementById("waveNotify");
  el.textContent = text;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), ms);
}

function renderPowerUpBanner() {
  const banner = document.getElementById("powerUpBanner");
  if (!banner) return;
  banner.innerHTML = "";
  if (!state._activePU) return;
  for (const [key, entry] of Object.entries(state._activePU)) {
    const chip = document.createElement("div");
    chip.className = "pu-chip";
    chip.innerHTML = `<span>${entry.type.icon}</span><span>${entry.type.name}</span><span class="pu-time">${Math.ceil(entry.timer)}s</span>`;
    banner.appendChild(chip);
  }
}

function updatePickups(dt) {
  // Magnet pull radius — base 1.8 + power-up bonus + Magnet item pull (none yet).
  const pullRange = 1.8 + (state._puMagnet || 0);
  const magnetRange = 4 + (state._puMagnet || 0);
  // Power-up pickups
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    p.life -= dt;
    p.mesh.position.y = p.baseY + Math.sin(clock.elapsedTime * 3 + i) * 0.18;
    p.mesh.rotation.y += dt * 2.4;
    p.halo.position.copy(p.mesh.position);
    const d = p.mesh.position.distanceTo(playerGroup.position);
    if (d < magnetRange) {
      const dir = new THREE.Vector3().subVectors(playerGroup.position, p.mesh.position).normalize();
      p.mesh.position.addScaledVector(dir, 8 * dt);
    }
    if (d < pullRange || p.life <= 0) {
      if (d < pullRange) activatePowerUp(p.typeKey);
      scene.remove(p.mesh);
      scene.remove(p.halo);
      p.mesh.material.dispose();
      pickups.splice(i, 1);
    }
  }
  // Item pickups (longer life, smaller pickup radius)
  for (let i = itemPickups.length - 1; i >= 0; i--) {
    const p = itemPickups[i];
    p.life -= dt;
    p.mesh.position.y = p.baseY + Math.sin(clock.elapsedTime * 3 + i + 1.5) * 0.14;
    p.mesh.rotation.y += dt * 3;
    p.halo.position.copy(p.mesh.position);
    const d = p.mesh.position.distanceTo(playerGroup.position);
    if (d < magnetRange) {
      const dir = new THREE.Vector3().subVectors(playerGroup.position, p.mesh.position).normalize();
      p.mesh.position.addScaledVector(dir, 8 * dt);
    }
    if (d < pullRange || p.life <= 0) {
      if (d < pullRange) {
        pickItem(p.defKey);
        flashWaveText(`+ ${ITEM_DEFS[p.defKey].name}`);
      }
      scene.remove(p.mesh);
      scene.remove(p.halo);
      p.mesh.material.dispose();
      itemPickups.splice(i, 1);
    }
  }
}

function updateActivePowerUps(dt) {
  if (!state._activePU) return;
  let dirty = false;
  for (const [key, entry] of Object.entries(state._activePU)) {
    entry.timer -= dt;
    if (entry.timer <= 0) {
      entry.type.onExpire?.();
      delete state._activePU[key];
      dirty = true;
    }
  }
  if (dirty) renderPowerUpBanner();
  else if (Math.random() < 0.05) renderPowerUpBanner(); // periodic timer refresh
}

// ─── GAMBA SOUL CHEST ────────────────────────────────────────
// Replaces the old Soul Shop. Opening a chest reveals a single
// random reward weighted by current wave, drawn from the universal
// scaling sigil pool (shared with the level-up draw).
function buildChestLootTable() {
  const wave = state.wave;
  const pool = [];
  for (const sig of SCALING_SIGILS) {
    let weight = 0;
    if (sig.rarity === "common") weight = wave < 5 ? 60 : 25;
    else if (sig.rarity === "rare") weight = wave < 5 ? 25 : wave < 10 ? 50 : 30;
    else if (sig.rarity === "epic") weight = wave < 10 ? 12 : 30;
    else if (sig.rarity === "legendary") weight = wave < 15 ? 3 : wave < 20 ? 12 : 25;
    if (weight > 0) pool.push({ sig, weight });
  }
  // Always-available fillers
  pool.push({ kind: "souls", weight: 35, payout: 4 + Math.floor(wave / 2), name: "Soul Hoard", icon: "👻", rarity: "common", desc: "Bonus souls" });
  pool.push({ kind: "heal", weight: 20, name: "Full Restoration", icon: "💚", rarity: "rare", desc: "Heal to full HP" });
  pool.push({ kind: "wave_bonus", weight: 15, name: "Power Surge", icon: "⚡", rarity: "epic",
    desc: `+${Math.floor(wave * 1.5)} damage, +${Math.floor(wave * 5)} HP`,
    payoutDmg: Math.floor(wave * 1.5), payoutHp: Math.floor(wave * 5) });
  return pool;
}

function rollChestReward() {
  const pool = buildChestLootTable();
  const total = pool.reduce((acc, p) => acc + p.weight, 0);
  let roll = Math.random() * total;
  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }
  return pool[0];
}

function showGambaReward(entry) {
  const overlay = document.getElementById("gambaOverlay");
  const card = document.getElementById("gambaCard");
  const rarity = entry.sig?.rarity || entry.rarity || "common";
  card.className = `gamba-card ${rarity}`;
  card.querySelector(".gc-rarity").textContent = rarity;
  card.querySelector(".gc-rarity").style.color = rarity === "legendary" ? "#ff9800"
    : rarity === "epic" ? "#9c27b0"
    : rarity === "rare" ? "#ffc107" : "#aaa";
  card.querySelector(".gc-icon").textContent = entry.sig?.icon || entry.icon || "🎲";
  card.querySelector(".gc-name").textContent = entry.sig?.name || entry.name || "???";
  card.querySelector(".gc-desc").textContent = entry.sig?.desc || entry.desc || "";
  // Re-trigger reveal animation
  card.style.animation = "none";
  void card.offsetWidth;
  card.style.animation = "";
  overlay.classList.remove("hidden");
  paused = true;
  releaseGamePointer();
  document.getElementById("gambaClaimBtn").onclick = () => {
    applyChestReward(entry);
    overlay.classList.add("hidden");
    paused = false;
    clearInputState();
    // Re-acquire pointer lock so the player isn't stuck with a free cursor
    // after closing the chest. Pointer-lock requests must originate from a
    // user gesture — the button click counts.
    renderer.domElement.focus();
    if (!pointerLocked) {
      try { renderer.domElement.requestPointerLock(); } catch (_) {}
    }
  };
}

function applyChestReward(entry) {
  if (entry.sig) {
    entry.sig.effect();
    return;
  }
  if (entry.kind === "souls") {
    state.souls += entry.payout;
    document.getElementById("soulCount").textContent = state.souls;
  } else if (entry.kind === "heal") {
    state.hp = state.maxHp;
  } else if (entry.kind === "wave_bonus") {
    state.baseDamage += entry.payoutDmg;
    state.maxHp += entry.payoutHp;
    state.hp = Math.min(state.maxHp, state.hp + entry.payoutHp);
  }
}

// Replace the deterministic shop-on-chest with the gamba reveal.
// Function declarations are reassignable in module scope, so the existing
// keydown handler that calls `openNearestSoulChest()` will resolve to this
// new version at call time.
openNearestSoulChest = function () {
  let best = null;
  let bestDist = SOUL_CHEST_OPEN_RANGE;
  for (const chest of soulChests) {
    if (chest.opened) continue;
    const dist = chest.mesh.position.distanceTo(playerGroup.position);
    if (dist < bestDist) {
      best = chest;
      bestDist = dist;
    }
  }
  if (!best) return;
  best.opened = true;
  spawnParticles(best.mesh.position, 0xffd36a, 18);
  scene.remove(best.mesh);
  // Grave Interest pact: pay out a percentage of held souls each shop visit.
  if ((state.graveInterest || 0) > 0 && state.souls > 0) {
    const interest = Math.max(1, Math.floor(state.souls * state.graveInterest));
    state.souls += interest;
    document.getElementById("soulCount").textContent = state.souls;
    flashWaveText(`🪙 Grave Interest: +${interest} souls`, "#ffd36a");
  }
  // Refresh the shop's sigil offers each time a new chest opens.
  rollShopSigilOffers();
  showGambaReward(rollChestReward());
};

// ─── PER-FRAME EFFECT WIRING ─────────────────────────────────
// Items + active power-ups contribute additive deltas on top of whatever
// sigils have already written to the same state fields. We store the prior
// frame's contribution and apply only the diff so sigil values are preserved.
function _applyDelta(field, prev, next, mode = "add") {
  if (mode === "mul") {
    const prevMul = 1 + prev;
    const nextMul = 1 + next;
    state[field] *= nextMul / prevMul;
  } else {
    state[field] += next - prev;
  }
}

function recomputePerFrameStats() {
  applyItemEffects();
  if (!state._lastContrib) state._lastContrib = {};
  const c = state._lastContrib;
  const itemDmgFlat = state._itemDmgFlat || 0;
  const itemSlash = state._itemSlashFlat || 0;
  // Damage flat goes through extraFireSlashes/baseDamageBonus shadows that
  // damageEnemy/autoFireSlash already read separately, so just pass through.
  _applyDelta("baseDamage", c.itemDmgFlat || 0, itemDmgFlat);
  _applyDelta("critChance", c.itemCritFlat || 0, state._itemCritFlat || 0);
  _applyDelta("fireRateBonus",
    (c.itemAtk || 0) + (c.puFireRate || 0),
    (state._itemAtkSpdPct || 0) + (state._puFireRate || 0));
  _applyDelta("speedBonus",
    (c.itemSpd || 0) + (c.puSpeed || 0),
    (state._itemMoveSpdPct || 0) + (state._puSpeed || 0));
  _applyDelta("damageReduction",
    c.itemDr || 0, state._itemDrFlat || 0);
  _applyDelta("magePower",
    c.itemMage || 0, state._itemMagePowerPct || 0, "mul");
  _applyDelta("burnDpsMult",
    c.itemBurn || 0, state._itemBurnDpsPct || 0, "mul");
  // damageMultiplier delta from "Inferno" power-up (multiplicative).
  _applyDelta("damageMultiplier",
    c.puDmg || 0, state._puDmg || 0, "mul");
  // Cache extraFireSlashes from items (additive).
  state.extraFireSlashes =
    (state.extraFireSlashes || 0) - (c.itemSlash || 0) + itemSlash;

  c.itemDmgFlat = itemDmgFlat;
  c.itemCritFlat = state._itemCritFlat || 0;
  c.itemAtk = state._itemAtkSpdPct || 0;
  c.puFireRate = state._puFireRate || 0;
  c.itemSpd = state._itemMoveSpdPct || 0;
  c.puSpeed = state._puSpeed || 0;
  c.itemDr = state._itemDrFlat || 0;
  c.itemMage = state._itemMagePowerPct || 0;
  c.itemBurn = state._itemBurnDpsPct || 0;
  c.puDmg = state._puDmg || 0;
  c.itemSlash = itemSlash;

  // Item-only stats with no sigil counterpart — write straight into state.
  // xpMult: combine sigil base (1 + sigilXpBonus) × (1 + itemXp%) on read in killEnemyAt path.
  // hpRegen: sum sigil regen + item regen. Sigils write to state.hpRegen directly,
  //   so we track an item delta the same way as fireRateBonus.
  _applyDelta("hpRegen", c.itemHpRegen || 0, state._itemHpRegenFlat || 0);
  c.itemHpRegen = state._itemHpRegenFlat || 0;
  // maxHp: items grant a percentage + flat bonus to maxHp. We treat this as
  // a one-shot at item-pickup time (handled in pickItem) so we don't drift.
}

// Initialise burnDpsMult so the multiplicative delta has a sane base.
if (state.burnDpsMult === undefined) state.burnDpsMult = 1;

// ─── STATS PANEL UPDATE ──────────────────────────────────────
function renderStatsPanel() {
  const fmtPct = (v) => `${Math.round(v * 100)}%`;
  const lines = [];
  lines.push(`<div class="stat-section">OFFENSE</div>`);
  lines.push(`<div class="stat-row"><span>Damage</span><span>${Math.round((state.baseDamage + (state._itemDmgFlat || 0)) * state.damageMultiplier)}</span></div>`);
  lines.push(`<div class="stat-row"><span>Fire Rate</span><span>+${Math.round((state.pyreMomentumBonus + state.fireRateBonus) * 100)}%</span></div>`);
  lines.push(`<div class="stat-row"><span>Crit / Mult</span><span>${fmtPct(state.critChance)} · x${state.critMultiplier.toFixed(2)}</span></div>`);
  lines.push(`<div class="stat-row"><span>Mage Power</span><span>${Math.round(state.magePower * 100)}%</span></div>`);
  lines.push(`<div class="stat-row"><span>Burn DPS Mult</span><span>${(state.burnDpsMult || 1).toFixed(2)}x</span></div>`);
  lines.push(`<div class="stat-row"><span>Lifesteal</span><span>${fmtPct(state.lifesteal)}</span></div>`);
  lines.push(`<div class="stat-section">DEFENSE</div>`);
  lines.push(`<div class="stat-row"><span>HP</span><span>${Math.round(state.hp)} / ${state.maxHp}</span></div>`);
  lines.push(`<div class="stat-row"><span>HP Regen</span><span>${state.hpRegen.toFixed(1)} / s</span></div>`);
  lines.push(`<div class="stat-row"><span>Damage Reduction</span><span>${fmtPct(state.damageReduction)}</span></div>`);
  lines.push(`<div class="stat-section">UTILITY</div>`);
  lines.push(`<div class="stat-row"><span>Move Speed</span><span>+${fmtPct(state.speedBonus)}</span></div>`);
  if (state.selectedRune === "stardustTree") {
    lines.push(`<div class="stat-row"><span>Stardust</span><span>${state.stardustStacks} (+${(state.stardustStacks * 0.3).toFixed(1)}% Mage)</span></div>`);
  } else {
    lines.push(`<div class="stat-row"><span>Pyre Fuel</span><span>${Math.floor(state.pyreFuelStacks)} (+${(state.pyreFuelStacks * 0.5).toFixed(1)}% Dmg)</span></div>`);
  }
  document.getElementById("statsHud").innerHTML = lines.join("");
}

// Hook into the existing update loop via a periodic ticker.
let _statsTickAcc = 0;
function statsLoopTick(dt) {
  recomputePerFrameStats();
  _statsTickAcc += dt;
  if (_statsTickAcc > 0.18) {
    _statsTickAcc = 0;
    renderStatsPanel();
  }
}

// Splice into the per-frame work via wrapping update().
const _origUpdate = update;
update = function () {
  _origUpdate();
  if (!state.gameStarted) return;
  if (paused) return;
  // Use a small fixed dt approximation since we can't peek at the inner clock easily.
  const dt = 1 / 60;
  updatePickups(dt);
  updateActivePowerUps(dt);
  statsLoopTick(dt);
};

// Hook gamba pickup drops into kills.
const _origKill = killEnemyAt;
killEnemyAt = function (index) {
  const e = enemies[index];
  const pos = e ? e.mesh.position.clone() : null;
  _origKill(index);
  if (pos) maybeDropPickupAt(pos);
};

// ─── BEST RUN TRACKER ────────────────────────────────────────
const BEST_RUN_KEY = "velthara3d.bestRun";

function loadBestRun() {
  try {
    const raw = localStorage.getItem(BEST_RUN_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) { return null; }
}

function saveBestRunIfBetter(snapshot) {
  // Score by wave first, then kills, then level — same priority as 2D's run-end summary.
  const prev = loadBestRun();
  const better = !prev
    || snapshot.wave > prev.wave
    || (snapshot.wave === prev.wave && snapshot.kills > prev.kills)
    || (snapshot.wave === prev.wave && snapshot.kills === prev.kills && snapshot.level > prev.level);
  if (better) {
    try { localStorage.setItem(BEST_RUN_KEY, JSON.stringify(snapshot)); } catch (_) {}
    return true;
  }
  return false;
}

function refreshBestRunPanel() {
  const el = document.getElementById("bestRunStats");
  if (!el) return;
  const best = loadBestRun();
  if (!best) {
    el.textContent = "No runs yet — fight first.";
    return;
  }
  el.innerHTML = `Wave <b style="color:#ff7a18">${best.wave}</b> · Kills <b style="color:#ff7a18">${best.kills}</b> · Lv <b style="color:#ff7a18">${best.level}</b>`;
}
refreshBestRunPanel();

// ─── SOUND SYSTEM ────────────────────────────────────────────
const sfx = {
  enabled: true,
  audioCtx: null,
  menuMusic: null,
  gameMusic: null,
  levelupSound: null,
  _hitCooldown: 0,
};

function initAudioSystem() {
  if (sfx.audioCtx) return;
  try {
    sfx.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (_) { return; }
  // HTMLAudioElement-based BGM streams (better autoplay survivability than buffer source).
  sfx.menuMusic = new Audio("/audio/menu-music.mp3");
  sfx.menuMusic.loop = true;
  sfx.menuMusic.volume = 0.18;
  sfx.gameMusic = new Audio("/audio/game-music.mp3");
  sfx.gameMusic.loop = true;
  sfx.gameMusic.volume = 0.18;
  sfx.levelupSound = new Audio("/audio/levelup-sound.mp3");
  sfx.levelupSound.volume = 0.45;
}

// Procedural hitmarker — sawtooth at 200Hz, ported from 2D playSound('hit').
// Throttled to once per 60ms so spammed hits don't blow the audio graph.
function playHitmarker() {
  if (!sfx.enabled || !sfx.audioCtx) return;
  const now = performance.now();
  if (now - sfx._hitCooldown < 60) return;
  sfx._hitCooldown = now;
  const t0 = sfx.audioCtx.currentTime;
  const osc = sfx.audioCtx.createOscillator();
  const gain = sfx.audioCtx.createGain();
  osc.type = "sawtooth";
  osc.frequency.value = 200;
  gain.gain.value = 0.10;
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.15);
  osc.connect(gain).connect(sfx.audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.15);
}

function playLevelUp() {
  if (!sfx.enabled || !sfx.levelupSound) return;
  try { sfx.levelupSound.currentTime = 0; sfx.levelupSound.play().catch(() => {}); } catch (_) {}
}

function playMenuMusic() {
  if (!sfx.enabled || !sfx.menuMusic) return;
  try { sfx.gameMusic && sfx.gameMusic.pause(); } catch (_) {}
  try { sfx.menuMusic.play().catch(() => {}); } catch (_) {}
}

function playGameMusic() {
  if (!sfx.enabled || !sfx.gameMusic) return;
  try { sfx.menuMusic && sfx.menuMusic.pause(); } catch (_) {}
  try { sfx.gameMusic.currentTime = 0; sfx.gameMusic.play().catch(() => {}); } catch (_) {}
}

function stopAllMusic() {
  try { sfx.menuMusic && sfx.menuMusic.pause(); } catch (_) {}
  try { sfx.gameMusic && sfx.gameMusic.pause(); } catch (_) {}
}

function setSoundEnabled(on) {
  sfx.enabled = on;
  const btn = document.getElementById("muteBtn");
  if (btn) btn.textContent = on ? "🔊 Sound" : "🔈 Muted";
  if (!on) stopAllMusic();
}

// Browser autoplay policy: BGM only allowed after a user gesture. Wait for the
// first click/key, init the audio context, then start menu music.
let _audioBootstrapped = false;
function bootstrapAudioOnGesture() {
  if (_audioBootstrapped) return;
  _audioBootstrapped = true;
  initAudioSystem();
  // Resume context (some browsers create it suspended).
  if (sfx.audioCtx && sfx.audioCtx.state === "suspended") {
    sfx.audioCtx.resume().catch(() => {});
  }
  playMenuMusic();
}
window.addEventListener("pointerdown", bootstrapAudioOnGesture, { once: false });
window.addEventListener("keydown", bootstrapAudioOnGesture, { once: false });

document.getElementById("muteBtn")?.addEventListener("click", (e) => {
  e.stopPropagation();
  setSoundEnabled(!sfx.enabled);
  // If they unmuted while menu is showing, resume menu music.
  if (sfx.enabled && document.getElementById("mainMenu") && !document.getElementById("mainMenu").classList.contains("hidden")) {
    playMenuMusic();
  }
});

// ─── HOOKS: MUSIC TRANSITIONS + HITMARKER + LEVEL-UP SOUND ───
const _origStartRun = startRun;
startRun = function () {
  _origStartRun();
  playGameMusic();
};

// Wrap damageEnemy to play hitmarker on each successful hit.
const _origDamageEnemy = damageEnemy;
damageEnemy = function (index, amount, color, burnStacks) {
  const result = _origDamageEnemy(index, amount, color, burnStacks);
  playHitmarker();
  return result;
};

// Wrap showLevelUp to play the level-up sting.
const _origShowLevelUp = showLevelUp;
showLevelUp = function () {
  _origShowLevelUp();
  playLevelUp();
};

// ─── PAUSE → RETURN TO MAIN MENU ─────────────────────────────
function returnToMainMenu() {
  // No mid-run state-snapshot/save — Velthara doesn't have a save slot, and the
  // simplest reset (and the one that guarantees no leftover entities) is a reload.
  stopAllMusic();
  location.reload();
}
document.getElementById("pauseToMenuBtn")?.addEventListener("click", returnToMainMenu);
document.getElementById("gameOverToMenuBtn")?.addEventListener("click", returnToMainMenu);

// ─── BEST RUN: SAVE ON GAME OVER ─────────────────────────────
const _origShowGameOver = showGameOver;
showGameOver = function () {
  _origShowGameOver();
  // Capture and persist the run.
  const snapshot = { wave: state.wave, kills: state.kills, level: state.level };
  const isNew = saveBestRunIfBetter(snapshot);
  document.getElementById("gameOverLevel").textContent = `${state.level}`;
  const bestEl = document.getElementById("gameOverBest");
  const best = loadBestRun();
  if (isNew) {
    bestEl.textContent = `🏆 NEW BEST! Wave ${best.wave} · Kills ${best.kills} · Lv ${best.level}`;
  } else if (best) {
    bestEl.textContent = `Best: Wave ${best.wave} · Kills ${best.kills} · Lv ${best.level}`;
  }
  refreshBestRunPanel();
  stopAllMusic();
};

// ─── ARENA EVENTS (poison ring, entrapment cube, soul press, ash storm) ────
// One event runs at a time. Scheduler picks a random event every EVENT_INTERVAL
// seconds after the first INITIAL_DELAY. Mirrors the 2D 30s hazard cadence.
const EVENT_INTERVAL = 35;
const EVENT_INITIAL_DELAY = 30;
state.eventTimer = EVENT_INITIAL_DELAY;
state.activeEvent = null;

function flashEventBanner(text, color = "#ff7a18") {
  const el = document.getElementById("waveNotify");
  el.textContent = text;
  el.style.color = color;
  el.classList.add("show");
  setTimeout(() => {
    el.classList.remove("show");
    el.style.color = "";
  }, 1800);
}

// ── 1) POISON RING ────────────────────────────────────────────
// Static green ring around player at spawn. Leaving it deals % max-HP DoT.
const POISON_RING_RADIUS = 18;
const POISON_RING_DURATION = 12;
const POISON_RING_DPS_PCT = 0.025; // 2.5% max-HP per second while outside (was 6%, killed too fast)
const POISON_RING_GRACE = 1.0; // seconds outside before damage starts
function startPoisonRing() {
  const cx = playerGroup.position.x;
  const cz = playerGroup.position.z;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(POISON_RING_RADIUS - 0.6, POISON_RING_RADIUS, 64),
    new THREE.MeshBasicMaterial({
      color: 0x33ff66,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(cx, 0.07, cz);
  scene.add(ring);
  // Inner translucent disc so the safe area reads at a glance.
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(POISON_RING_RADIUS - 0.6, 64),
    new THREE.MeshBasicMaterial({
      color: 0x33ff66,
      transparent: true,
      opacity: 0.06,
      side: THREE.DoubleSide,
    }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.set(cx, 0.04, cz);
  scene.add(disc);
  state.activeEvent = {
    kind: "poison_ring",
    life: POISON_RING_DURATION,
    cx, cz,
    ring, disc,
    tickCarry: 0,
    outsideTimer: 0,
  };
  flashEventBanner("☠ STAY INSIDE THE POISON RING ☠", "#33ff66");
}
function updatePoisonRing(dt, ev) {
  ev.life -= dt;
  // Pulse opacity so it reads as "active hazard."
  const pulse = 0.5 + Math.sin(clock.elapsedTime * 6) * 0.25;
  ev.ring.material.opacity = pulse;
  // Damage if outside, after a short grace period to give the player time to react.
  const dx = playerGroup.position.x - ev.cx;
  const dz = playerGroup.position.z - ev.cz;
  const outside = dx * dx + dz * dz > POISON_RING_RADIUS * POISON_RING_RADIUS;
  if (outside) {
    ev.outsideTimer += dt;
    if (ev.outsideTimer >= POISON_RING_GRACE) {
      ev.tickCarry += POISON_RING_DPS_PCT * state.maxHp * dt;
      if (ev.tickCarry >= 1) {
        const chunk = Math.floor(ev.tickCarry);
        ev.tickCarry -= chunk;
        state.hp = Math.max(1, state.hp - chunk);
        spawnParticles(playerGroup.position, 0x33ff66, 2);
      }
    }
  } else {
    ev.outsideTimer = 0;
    ev.tickCarry = 0;
  }
  if (ev.life <= 0) {
    scene.remove(ev.ring); scene.remove(ev.disc);
    ev.ring.geometry.dispose(); ev.ring.material.dispose();
    ev.disc.geometry.dispose(); ev.disc.material.dispose();
    state.activeEvent = null;
  }
}

// ── 2) ENTRAPMENT CUBE ────────────────────────────────────────
// Purple cage around player at spawn. 3s, no damage, restricts movement.
const CUBE_HALF = 8;
const CUBE_DURATION = 3.5;
function startEntrapmentCube() {
  const cx = playerGroup.position.x;
  const cz = playerGroup.position.z;
  const wallH = 4;
  const wallT = 0.4;
  const wallMat = new THREE.MeshBasicMaterial({
    color: 0x9b6cff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  });
  // 4 walls (N/S/E/W).
  const walls = [];
  const mkWall = (w, d, x, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallMat.clone());
    m.position.set(cx + x, wallH / 2, cz + z);
    scene.add(m);
    walls.push(m);
  };
  mkWall(CUBE_HALF * 2 + wallT, wallT, 0, -CUBE_HALF);
  mkWall(CUBE_HALF * 2 + wallT, wallT, 0, CUBE_HALF);
  mkWall(wallT, CUBE_HALF * 2 + wallT, -CUBE_HALF, 0);
  mkWall(wallT, CUBE_HALF * 2 + wallT, CUBE_HALF, 0);
  // Vertical bar accents for cage feel.
  const bars = [];
  for (let i = -CUBE_HALF + 2; i <= CUBE_HALF - 2; i += 4) {
    for (const side of [-1, 1]) {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, wallH, 0.18),
        new THREE.MeshBasicMaterial({ color: 0xb39bff, transparent: true, opacity: 0.85 }),
      );
      bar.position.set(cx + i, wallH / 2, cz + side * CUBE_HALF);
      scene.add(bar);
      bars.push(bar);
      const bar2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, wallH, 0.18),
        new THREE.MeshBasicMaterial({ color: 0xb39bff, transparent: true, opacity: 0.85 }),
      );
      bar2.position.set(cx + side * CUBE_HALF, wallH / 2, cz + i);
      scene.add(bar2);
      bars.push(bar2);
    }
  }
  // Register an AABB blocker so collidesWithTerrain corrals the player.
  const blocker = { type: "aabb_inverted", x: cx, z: cz, halfW: CUBE_HALF, halfD: CUBE_HALF };
  state.activeEvent = {
    kind: "entrapment_cube",
    life: CUBE_DURATION,
    cx, cz, walls, bars, blocker,
  };
  flashEventBanner("⛓ ENTRAPPED ⛓", "#b39bff");
}
function updateEntrapmentCube(dt, ev) {
  ev.life -= dt;
  // Clamp player inside the cube each frame (inverted AABB).
  const minX = ev.cx - CUBE_HALF + 0.6;
  const maxX = ev.cx + CUBE_HALF - 0.6;
  const minZ = ev.cz - CUBE_HALF + 0.6;
  const maxZ = ev.cz + CUBE_HALF - 0.6;
  playerGroup.position.x = Math.max(minX, Math.min(maxX, playerGroup.position.x));
  playerGroup.position.z = Math.max(minZ, Math.min(maxZ, playerGroup.position.z));
  if (ev.life <= 0) {
    for (const w of ev.walls) {
      scene.remove(w); w.geometry.dispose(); w.material.dispose();
    }
    for (const b of ev.bars) {
      scene.remove(b); b.geometry.dispose(); b.material.dispose();
    }
    state.activeEvent = null;
  }
}

// ── 3) SOUL PRESS ─────────────────────────────────────────────
// Floor-spanning translucent layer of glowing souls. Player movement is slowed
// while it's active. Visualised as a tiled spectral white-blue overlay.
const SOUL_PRESS_DURATION = 14;
const SOUL_PRESS_SPEED_MULT = 0.55; // multiplicative slow
function startSoulPress() {
  // Scrolling overlay disc on the ground.
  const layer = new THREE.Mesh(
    new THREE.CircleGeometry(ARENA_SIZE * 1.2, 64),
    new THREE.MeshBasicMaterial({
      color: 0x9bf0ff, transparent: true, opacity: 0.18, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  layer.rotation.x = -Math.PI / 2;
  layer.position.y = 0.04;
  scene.add(layer);
  // Floating soul wisps as a Points cloud rising slowly.
  const wispCount = 320;
  const wispGeo = new THREE.BufferGeometry();
  const wispPos = new Float32Array(wispCount * 3);
  const wispVel = new Float32Array(wispCount * 3);
  for (let i = 0; i < wispCount; i++) {
    const i3 = i * 3;
    wispPos[i3] = (Math.random() - 0.5) * ARENA_SIZE * 2;
    wispPos[i3 + 1] = Math.random() * 2;
    wispPos[i3 + 2] = (Math.random() - 0.5) * ARENA_SIZE * 2;
    wispVel[i3] = (Math.random() - 0.5) * 0.4;
    wispVel[i3 + 1] = 0.3 + Math.random() * 0.6;
    wispVel[i3 + 2] = (Math.random() - 0.5) * 0.4;
  }
  wispGeo.setAttribute("position", new THREE.BufferAttribute(wispPos, 3));
  const wispMat = new THREE.PointsMaterial({
    color: 0xc7e8ff, size: 0.28, transparent: true, opacity: 0.85, sizeAttenuation: true, blending: THREE.AdditiveBlending,
  });
  const wisps = new THREE.Points(wispGeo, wispMat);
  scene.add(wisps);
  state.activeEvent = {
    kind: "soul_press",
    life: SOUL_PRESS_DURATION,
    layer, wisps, wispVel, wispCount,
  };
  // Apply the slow as a delta to speedBonus.
  state._soulPressApplied = SOUL_PRESS_SPEED_MULT - 1; // negative number
  state.speedBonus += state._soulPressApplied;
  flashEventBanner("👻 SOUL PRESS — the dead rise underfoot 👻", "#9bf0ff");
}
function updateSoulPress(dt, ev) {
  ev.life -= dt;
  // Rise + recycle wisps.
  const pos = ev.wisps.geometry.attributes.position.array;
  for (let i = 0; i < ev.wispCount; i++) {
    const i3 = i * 3;
    pos[i3] += ev.wispVel[i3] * dt;
    pos[i3 + 1] += ev.wispVel[i3 + 1] * dt;
    pos[i3 + 2] += ev.wispVel[i3 + 2] * dt;
    if (pos[i3 + 1] > 4) {
      pos[i3] = (Math.random() - 0.5) * ARENA_SIZE * 2;
      pos[i3 + 1] = 0;
      pos[i3 + 2] = (Math.random() - 0.5) * ARENA_SIZE * 2;
    }
  }
  ev.wisps.geometry.attributes.position.needsUpdate = true;
  ev.layer.material.opacity = 0.12 + Math.sin(clock.elapsedTime * 2) * 0.05;
  if (ev.life <= 0) {
    scene.remove(ev.layer); scene.remove(ev.wisps);
    ev.layer.geometry.dispose(); ev.layer.material.dispose();
    ev.wisps.geometry.dispose(); ev.wisps.material.dispose();
    // Remove the slow we applied.
    if (state._soulPressApplied !== undefined) {
      state.speedBonus -= state._soulPressApplied;
      state._soulPressApplied = undefined;
    }
    state.activeEvent = null;
  }
}

// ── 4) ASH STORM (rain analogue, but volcanic) ────────────────
// Diagonal embers + ash sheets sweep across the arena. Cosmetic + adds grit.
const ASH_STORM_DURATION = 18;
const ASH_STORM_PARTICLES = 800;
function startAshStorm() {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(ASH_STORM_PARTICLES * 3);
  const vel = new Float32Array(ASH_STORM_PARTICLES * 3);
  const col = new Float32Array(ASH_STORM_PARTICLES * 3);
  for (let i = 0; i < ASH_STORM_PARTICLES; i++) {
    const i3 = i * 3;
    pos[i3] = (Math.random() - 0.5) * ARENA_SIZE * 2.4;
    pos[i3 + 1] = Math.random() * 30;
    pos[i3 + 2] = (Math.random() - 0.5) * ARENA_SIZE * 2.4;
    vel[i3] = -8 + (Math.random() - 0.5) * 2; // strong sideways gust
    vel[i3 + 1] = -3 - Math.random() * 1.5;
    vel[i3 + 2] = -2 + (Math.random() - 0.5) * 1;
    if (Math.random() < 0.3) {
      col[i3] = 1; col[i3 + 1] = 0.55; col[i3 + 2] = 0.18;
    } else {
      col[i3] = 0.45; col[i3 + 1] = 0.36; col[i3 + 2] = 0.32;
    }
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.22, vertexColors: true, transparent: true, opacity: 0.85, sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);
  state.activeEvent = {
    kind: "ash_storm",
    life: ASH_STORM_DURATION,
    points, vel,
  };
  flashEventBanner("🌫 ASH STORM 🌫", "#d8a070");
}
function updateAshStorm(dt, ev) {
  ev.life -= dt;
  const pos = ev.points.geometry.attributes.position.array;
  for (let i = 0; i < ASH_STORM_PARTICLES; i++) {
    const i3 = i * 3;
    pos[i3] += ev.vel[i3] * dt;
    pos[i3 + 1] += ev.vel[i3 + 1] * dt;
    pos[i3 + 2] += ev.vel[i3 + 2] * dt;
    if (pos[i3 + 1] < 0 || pos[i3] < -ARENA_SIZE - 5 || pos[i3 + 2] < -ARENA_SIZE - 5) {
      pos[i3] = ARENA_SIZE + Math.random() * 10;
      pos[i3 + 1] = 20 + Math.random() * 10;
      pos[i3 + 2] = ARENA_SIZE * (Math.random() - 0.2);
    }
  }
  ev.points.geometry.attributes.position.needsUpdate = true;
  if (ev.life <= 0) {
    scene.remove(ev.points);
    ev.points.geometry.dispose();
    ev.points.material.dispose();
    state.activeEvent = null;
  }
}

const EVENT_KINDS = ["poison_ring", "entrapment_cube", "soul_press", "ash_storm"];

function pickAndStartEvent() {
  const kind = EVENT_KINDS[Math.floor(Math.random() * EVENT_KINDS.length)];
  if (kind === "poison_ring") startPoisonRing();
  else if (kind === "entrapment_cube") startEntrapmentCube();
  else if (kind === "soul_press") startSoulPress();
  else if (kind === "ash_storm") startAshStorm();
}

function updateArenaEvents(dt) {
  if (state.activeEvent) {
    const k = state.activeEvent.kind;
    if (k === "poison_ring") updatePoisonRing(dt, state.activeEvent);
    else if (k === "entrapment_cube") updateEntrapmentCube(dt, state.activeEvent);
    else if (k === "soul_press") updateSoulPress(dt, state.activeEvent);
    else if (k === "ash_storm") updateAshStorm(dt, state.activeEvent);
  } else {
    state.eventTimer -= dt;
    if (state.eventTimer <= 0) {
      state.eventTimer = EVENT_INTERVAL;
      pickAndStartEvent();
    }
  }
}

// Wire into the shared game loop via the existing wrapped update.
const _origUpdate2 = update;
update = function () {
  _origUpdate2();
  if (!state.gameStarted || paused) return;
  updateArenaEvents(1 / 60);
};

// ─── FLOATING DAMAGE NUMBERS + BURN ICONS ────────────────────
// Cheap canvas-texture sprites pooled per slot. Two types:
//   showDamageNumber(value, pos, color?) — short-lived, rises and fades.
//   ensureBurnIcon(enemy) / clearBurnIcon(enemy) — long-lived 🔥 icon while
//                                                  the enemy's burn stacks > 0.
const _dmgNumPool = [];
const _activeDmgNums = [];

function _allocDmgNumSlot() {
  const canvas = document.createElement("canvas");
  canvas.width = 128; canvas.height = 40;
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.6, 0.82, 1);
  return { canvas, tex, mat, sprite };
}

function showDamageNumber(value, worldPos, color = "#ff7733") {
  const slot = _dmgNumPool.pop() || _allocDmgNumSlot();
  const ctx = slot.canvas.getContext("2d");
  ctx.clearRect(0, 0, slot.canvas.width, slot.canvas.height);
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeStyle = "rgba(0,0,0,0.85)";
  ctx.lineWidth = 5;
  ctx.fillStyle = color;
  const txt = String(value);
  const cx = slot.canvas.width / 2;
  const cy = slot.canvas.height / 2;
  ctx.strokeText(txt, cx, cy);
  ctx.fillText(txt, cx, cy);
  slot.tex.needsUpdate = true;
  slot.sprite.position.set(worldPos.x, worldPos.y + 1.6, worldPos.z);
  slot.mat.opacity = 1;
  scene.add(slot.sprite);
  _activeDmgNums.push({
    slot,
    life: 0.85,
    maxLife: 0.85,
    vy: 1.8,
    // Slight horizontal drift so simultaneous hits don't perfectly overlap.
    vx: (Math.random() - 0.5) * 0.6,
    vz: (Math.random() - 0.5) * 0.6,
  });
}

function updateDamageNumbers(dt) {
  for (let i = _activeDmgNums.length - 1; i >= 0; i--) {
    const d = _activeDmgNums[i];
    d.life -= dt;
    d.slot.sprite.position.x += d.vx * dt;
    d.slot.sprite.position.y += d.vy * dt;
    d.slot.sprite.position.z += d.vz * dt;
    d.slot.mat.opacity = Math.max(0, d.life / d.maxLife);
    if (d.life <= 0) {
      scene.remove(d.slot.sprite);
      _dmgNumPool.push(d.slot);
      _activeDmgNums.splice(i, 1);
    }
  }
}

const _burnIconCanvas = (() => {
  const c = document.createElement("canvas");
  c.width = 64; c.height = 64;
  const ctx = c.getContext("2d");
  ctx.font = "52px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🔥", 32, 36);
  return c;
})();
const _burnIconTex = new THREE.CanvasTexture(_burnIconCanvas);

function ensureBurnIcon(enemy) {
  if (enemy.burnIcon) return enemy.burnIcon;
  const mat = new THREE.SpriteMaterial({ map: _burnIconTex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.9, 0.9, 1);
  scene.add(sprite);
  enemy.burnIcon = sprite;
  return sprite;
}

function clearBurnIcon(enemy) {
  if (!enemy.burnIcon) return;
  scene.remove(enemy.burnIcon);
  if (enemy.burnIcon.material) enemy.burnIcon.material.dispose();
  enemy.burnIcon = null;
}

function updateBurnIcons() {
  for (const e of enemies) {
    const stacks = e.sovereignBurn?.stacks || 0;
    if (stacks > 0) {
      const icon = ensureBurnIcon(e);
      // Park the icon above the enemy. Use mesh world position + a small offset
      // scaled by the enemy's bounding-box height proxy.
      const yOffset = (e.type.size || 1) * 1.6 + 0.6;
      icon.position.set(
        e.mesh.position.x,
        e.mesh.position.y + yOffset,
        e.mesh.position.z,
      );
      // Brief pulse so it reads as "active DoT".
      const pulse = 0.85 + Math.sin(clock.elapsedTime * 6) * 0.12;
      icon.scale.set(0.9 * pulse, 0.9 * pulse, 1);
    } else if (e.burnIcon) {
      clearBurnIcon(e);
    }
  }
}

// ─── CONTROL POINTS + MINI-BOSSES (Megabonk-style) ───────────
// Periodically a glowing pillar appears in the arena. The player must stand
// inside its capture ring for ~6s to claim it. On capture a mini-boss spawns
// with the player as its target; killing the mini-boss drops a Soul Chest.
const CONTROL_POINT_RADIUS = 4.5;
const CONTROL_POINT_CAPTURE_TIME = 6.0;
const CONTROL_POINT_SPAWN_INTERVAL = 60; // first spawn at 30s, then every 60s
state.controlPoint = null;
state.controlPointTimer = 30;
state.miniBoss = null;

function spawnControlPoint() {
  // Pick a position not too close to the player, but inside arena bounds.
  let pos = null;
  for (let attempt = 0; attempt < 12; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 18 + Math.random() * 28;
    const cand = new THREE.Vector3(
      playerGroup.position.x + Math.cos(angle) * dist,
      0.05,
      playerGroup.position.z + Math.sin(angle) * dist,
    );
    if (Math.abs(cand.x) > ARENA_SIZE - 4 || Math.abs(cand.z) > ARENA_SIZE - 4) continue;
    if (collidesWithTerrain(cand.x, cand.z, 2)) continue;
    pos = cand;
    break;
  }
  if (!pos) {
    // Fallback to origin region.
    pos = new THREE.Vector3(0, 0.05, 0);
  }

  const group = new THREE.Group();
  group.position.copy(pos);

  // Capture ring (flat disc on the ground).
  const ringGeo = new THREE.RingGeometry(CONTROL_POINT_RADIUS - 0.4, CONTROL_POINT_RADIUS, 64);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffd36a, transparent: true, opacity: 0.6,
    side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  group.add(ring);

  // Inner translucent disc (capture-progress fill — recoloured each frame).
  const fillGeo = new THREE.CircleGeometry(CONTROL_POINT_RADIUS - 0.4, 48);
  const fillMat = new THREE.MeshBasicMaterial({
    color: 0xffb84d, transparent: true, opacity: 0.18, side: THREE.DoubleSide,
  });
  const fill = new THREE.Mesh(fillGeo, fillMat);
  fill.rotation.x = -Math.PI / 2;
  fill.position.y = 0.04;
  group.add(fill);

  // Vertical pillar so the point is visible from across the map.
  const pillarMat = new THREE.MeshBasicMaterial({
    color: 0xffe18f, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.5, 12, 12, 1, true), pillarMat);
  pillar.position.y = 6;
  group.add(pillar);

  // Glowing crown on top.
  const crownMat = new THREE.MeshBasicMaterial({ color: 0xffe18f });
  const crown = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), crownMat);
  crown.position.y = 12.5;
  group.add(crown);

  scene.add(group);

  state.controlPoint = {
    pos: pos.clone(),
    group, ring, fill, pillar, crown,
    progress: 0,
    captured: false,
  };
  flashWaveBanner("⚑ CONTROL POINT — STAND IN THE RING ⚑", "#ffd36a");
}

function clearControlPoint() {
  if (!state.controlPoint) return;
  scene.remove(state.controlPoint.group);
  state.controlPoint.ring.geometry.dispose();
  state.controlPoint.ring.material.dispose();
  state.controlPoint.fill.geometry.dispose();
  state.controlPoint.fill.material.dispose();
  state.controlPoint.pillar.geometry.dispose();
  state.controlPoint.pillar.material.dispose();
  state.controlPoint.crown.geometry.dispose();
  state.controlPoint.crown.material.dispose();
  state.controlPoint = null;
}

function spawnMiniBossAt(pos) {
  // Mini-boss = a Magma Golem (heaviest enemy archetype) but buffed.
  spawnEnemy(4); // 4 = Magma Golem
  const boss = enemies[enemies.length - 1];
  if (!boss) return;
  // Reposition to the control point and pump stats.
  boss.mesh.position.set(pos.x, boss.mesh.position.y, pos.z);
  boss.maxHp = boss.maxHp * 3.5;
  boss.hp = boss.maxHp;
  boss.dmg = Math.floor(boss.dmg * 1.6);
  boss.speed = boss.speed * 0.85;
  boss.isMiniBoss = true;
  boss.xp = boss.xp * 4;
  // Visually scale them up + give them a strong purple glow.
  boss.mesh.scale.multiplyScalar(1.45);
  boss.mesh.traverse((c) => {
    if (c.isMesh && c.material && c.material.emissive) {
      c.material.emissive.setHex(0xb39bff);
      if ("emissiveIntensity" in c.material) c.material.emissiveIntensity = 0.9;
      if (c.material.userData) c.material.userData.baseEmissiveIntensity = 0.9;
    }
  });
  state.miniBoss = boss;
  flashWaveBanner("👑 MINI-BOSS SPAWNED 👑", "#b39bff");
}

function onMiniBossKilled(pos) {
  // Reward: drop a Soul Chest at the boss's death location.
  const mesh = createSoulChestMesh();
  // Slightly fancier chest (bigger glow) so the reward reads.
  if (mesh.userData.glow) {
    mesh.userData.glow.scale.setScalar(1.6);
    mesh.userData.glow.material.color.setHex(0xb39bff);
  }
  mesh.position.set(pos.x, 0, pos.z);
  scene.add(mesh);
  soulChests.push({ mesh, opened: false });
  flashWaveBanner("⚱ Reward Chest dropped — press F", "#ffd36a");
  state.miniBoss = null;
}

function updateControlPoints(dt) {
  // Detect mini-boss death (mini-boss reference vanishing from enemies list).
  if (state.miniBoss && !enemies.includes(state.miniBoss)) {
    onMiniBossKilled(state.miniBoss.mesh.position);
  }

  // Tick the spawn timer when no point exists and no mini-boss is active.
  if (!state.controlPoint && !state.miniBoss) {
    state.controlPointTimer -= dt;
    if (state.controlPointTimer <= 0) {
      state.controlPointTimer = CONTROL_POINT_SPAWN_INTERVAL;
      spawnControlPoint();
    }
  }

  if (!state.controlPoint || state.controlPoint.captured) return;
  const cp = state.controlPoint;

  // Progress fills while the player stands in the ring.
  const dx = playerGroup.position.x - cp.pos.x;
  const dz = playerGroup.position.z - cp.pos.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const inside = dist <= CONTROL_POINT_RADIUS;
  cp.progress = Math.max(0, Math.min(CONTROL_POINT_CAPTURE_TIME,
    cp.progress + (inside ? dt : -dt * 0.6),
  ));

  // Visual feedback: fill opacity + pillar pulse based on progress.
  const t = cp.progress / CONTROL_POINT_CAPTURE_TIME;
  cp.fill.material.opacity = 0.18 + t * 0.55;
  cp.fill.material.color.lerpColors(
    new THREE.Color(0xffb84d),
    new THREE.Color(0xb39bff),
    t,
  );
  cp.ring.material.opacity = 0.5 + Math.sin(clock.elapsedTime * 5) * 0.2;
  cp.crown.rotation.y += dt * 1.5;
  cp.crown.position.y = 12.5 + Math.sin(clock.elapsedTime * 2) * 0.4;

  if (cp.progress >= CONTROL_POINT_CAPTURE_TIME) {
    cp.captured = true;
    spawnMiniBossAt(cp.pos);
    clearControlPoint();
  }
}

// ─── SETTINGS MODAL ──────────────────────────────────────────
// Persisted via localStorage so they survive reloads.
const SETTINGS_KEY = "velthara3d.settings";
const SETTINGS_BASE_SENSITIVITY = 0.0022;
const settings = (function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return Object.assign({ sensPct: 100, musicPct: 18, sfxOn: true }, JSON.parse(raw));
  } catch (_) {}
  return { sensPct: 100, musicPct: 18, sfxOn: true };
})();

function persistSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (_) {}
}

function applySettings() {
  // Sensitivity: percent slider 20..300 maps to a multiplier on the base value.
  CAMERA_MOUSE_SENSITIVITY = SETTINGS_BASE_SENSITIVITY * (settings.sensPct / 100);
  // Music volume: scale both BGM tracks if loaded.
  const v = settings.musicPct / 100;
  if (sfx.menuMusic) sfx.menuMusic.volume = v;
  if (sfx.gameMusic) sfx.gameMusic.volume = v;
  // SFX on/off — reuse the existing master sfx.enabled toggle.
  setSoundEnabled(settings.sfxOn);
}
applySettings();

function refreshSettingsModal() {
  document.getElementById("sensSlider").value = String(settings.sensPct);
  document.getElementById("sensValue").textContent = `${settings.sensPct}%`;
  document.getElementById("musicSlider").value = String(settings.musicPct);
  document.getElementById("musicValue").textContent = `${settings.musicPct}%`;
  const sfxBtn = document.getElementById("settingsSfxBtn");
  sfxBtn.textContent = settings.sfxOn ? "ENABLED" : "MUTED";
  sfxBtn.classList.toggle("on", settings.sfxOn);
}

let _settingsReturnFocus = null; // 'menu' | 'pause' | null
function openSettings(from) {
  _settingsReturnFocus = from || null;
  refreshSettingsModal();
  document.getElementById("settingsOverlay").classList.remove("hidden");
}
function closeSettings() {
  document.getElementById("settingsOverlay").classList.add("hidden");
  _settingsReturnFocus = null;
}

document.getElementById("settingsBtn")?.addEventListener("click", (e) => {
  e.stopPropagation();
  openSettings("menu");
});
document.getElementById("pauseSettingsBtn")?.addEventListener("click", (e) => {
  e.stopPropagation();
  openSettings("pause");
});
document.getElementById("settingsCloseBtn")?.addEventListener("click", closeSettings);

document.getElementById("sensSlider")?.addEventListener("input", (e) => {
  settings.sensPct = parseInt(e.target.value, 10);
  document.getElementById("sensValue").textContent = `${settings.sensPct}%`;
  applySettings();
  persistSettings();
});
document.getElementById("musicSlider")?.addEventListener("input", (e) => {
  settings.musicPct = parseInt(e.target.value, 10);
  document.getElementById("musicValue").textContent = `${settings.musicPct}%`;
  applySettings();
  persistSettings();
});
document.getElementById("settingsSfxBtn")?.addEventListener("click", () => {
  settings.sfxOn = !settings.sfxOn;
  refreshSettingsModal();
  applySettings();
  persistSettings();
});

animate();
