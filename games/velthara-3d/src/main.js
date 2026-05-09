import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ─── CONSTANTS ──────────────────────────────────────────────
const ARENA_SIZE = 40;
const PLAYER_SPEED = 8;
const PROJECTILE_SPEED = 25;
const ENEMY_SPEED_BASE = 1;
const SHOOT_COOLDOWN = 0.6;
const CAMERA_DISTANCE = 8.5;
const CAMERA_HEIGHT = 2.65;
const CAMERA_LOOK_HEIGHT = 1.45;
const CAMERA_LOOK_AHEAD = 5.0;
const CAMERA_SHOULDER = 1.55;
const CAMERA_MIN_PITCH = -0.55;
const CAMERA_MAX_PITCH = -0.04;
const CAMERA_MOUSE_SENSITIVITY = 0.0022;

// ─── THREE.JS SETUP ────────────────────────────────────────
const scene = new THREE.Scene();

// Dark purple-to-black gradient background
const bgCanvas = document.createElement('canvas');
bgCanvas.width = 1;
bgCanvas.height = 512;
const bgCtx = bgCanvas.getContext('2d');
const grad = bgCtx.createLinearGradient(0, 0, 0, 512);
grad.addColorStop(0, '#1a0a30');
grad.addColorStop(0.4, '#0f0820');
grad.addColorStop(1, '#050510');
bgCtx.fillStyle = grad;
bgCtx.fillRect(0, 0, 1, 512);
const bgTexture = new THREE.CanvasTexture(bgCanvas);
scene.background = bgTexture;

scene.fog = new THREE.FogExp2(0x0a0a14, 0.015);

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 200);
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
const ambientLight = new THREE.AmbientLight(0x444466, 1.2);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0x9977dd, 2.0);
mainLight.position.set(10, 20, 10);
mainLight.castShadow = true;
mainLight.shadow.mapSize.set(1024, 1024);
mainLight.shadow.camera.left = -30;
mainLight.shadow.camera.right = 30;
mainLight.shadow.camera.top = 30;
mainLight.shadow.camera.bottom = -30;
mainLight.shadow.camera.far = 80;
scene.add(mainLight);

const fillLight = new THREE.DirectionalLight(0x4422aa, 0.4);
fillLight.position.set(-8, 10, -8);
scene.add(fillLight);

// Point light on player (necromancer aura)
const playerLight = new THREE.PointLight(0x9966ff, 1.5, 12);
playerLight.position.set(0, 2, 0);
scene.add(playerLight);

// ─── ARENA ──────────────────────────────────────────────────
// Ground
const groundGeo = new THREE.PlaneGeometry(ARENA_SIZE * 2, ARENA_SIZE * 2, 40, 40);
const groundMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a2e,
    roughness: 0.9,
    metalness: 0.1,
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Grid lines on ground
const gridHelper = new THREE.GridHelper(ARENA_SIZE * 2, 40, 0x222244, 0x16162e);
gridHelper.position.y = 0.01;
scene.add(gridHelper);

// Arena boundary walls (invisible collision + faint glow)
const wallMat = new THREE.MeshStandardMaterial({ color: 0x6633aa, transparent: true, opacity: 0.15, emissive: 0x6633aa, emissiveIntensity: 0.3 });
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
walls.forEach(w => scene.add(w));

// ─── TERRAIN DECORATIONS ────────────────────────────────────
const decoGroup = new THREE.Group();
scene.add(decoGroup);

const stoneMat = new THREE.MeshStandardMaterial({ color: 0x3a3a4e, roughness: 0.85, metalness: 0.1 });
const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3e, roughness: 0.9, metalness: 0.05 });
const deadWoodMat = new THREE.MeshStandardMaterial({ color: 0x2e2018, roughness: 0.95, metalness: 0.0 });
const deadLeafMat = new THREE.MeshStandardMaterial({ color: 0x1a0a20, roughness: 0.8, metalness: 0.0 });

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
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.8, 6, 6), deadLeafMat);
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
        rock.position.set((Math.random() - 0.5) * 1.5, rockGeos[r % rockGeos.length].parameters.radius * 0.5, (Math.random() - 0.5) * 1.5);
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        rock.scale.y = 0.5 + Math.random() * 0.5;
        rock.castShadow = true;
        rock.receiveShadow = true;
        clusterGroup.add(rock);
    }
    clusterGroup.position.set(randomArenaPos(3), 0, randomArenaPos(3));
    decoGroup.add(clusterGroup);
}

// ─── DISTANT HORIZON — ruins and mountains beyond walls ────
const horizonGroup = new THREE.Group();
scene.add(horizonGroup);
const ruinMat = new THREE.MeshStandardMaterial({ color: 0x15101e, roughness: 1, metalness: 0 });
const mountainMat = new THREE.MeshStandardMaterial({ color: 0x0d0a15, roughness: 1, metalness: 0 });

// Mountains (large cones/pyramids beyond arena)
for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2 + Math.random() * 0.3;
    const dist = ARENA_SIZE + 15 + Math.random() * 25;
    const h = 8 + Math.random() * 15;
    const r = 5 + Math.random() * 8;
    const mtn = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5 + Math.floor(Math.random() * 3)), mountainMat);
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

// ─── PLAYER ─────────────────────────────────────────────────
const playerGroup = new THREE.Group();

// Placeholder body (hooded robe shape — cone)
const bodyGeo = new THREE.ConeGeometry(0.5, 1.6, 8);
const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2d1b4e, emissive: 0x1a0a30, emissiveIntensity: 0.3 });
const body = new THREE.Mesh(bodyGeo, bodyMat);
body.position.y = 0.8;
body.castShadow = true;
playerGroup.add(body);

// Head (sphere)
const headGeo = new THREE.SphereGeometry(0.25, 8, 8);
const headMat = new THREE.MeshStandardMaterial({ color: 0x2d1b4e });
const head = new THREE.Mesh(headGeo, headMat);
head.position.y = 1.7;
head.castShadow = true;
playerGroup.add(head);

// Eyes (glowing purple)
const eyeMat = new THREE.MeshBasicMaterial({ color: 0xbb66ff });
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
const orbMat = new THREE.MeshBasicMaterial({ color: 0xaa55ff });
const orb = new THREE.Mesh(orbGeo, orbMat);
orb.position.set(0.55, 2.2, 0);
playerGroup.add(orb);

// Staff orb light
const orbLight = new THREE.PointLight(0xaa55ff, 1, 5);
orbLight.position.copy(orb.position);
playerGroup.add(orbLight);

const placeholderParts = [body, head, eyeL, eyeR, staff, orb];

scene.add(playerGroup);

// ─── MODEL LOADING ──────────────────────────────────────────
const gltfLoader = new GLTFLoader();
const loadedModels = { necromancer: null, zombie: null, skeleton: null };
let playerModelLoaded = false;

function enableShadows(obj) {
    obj.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
}

// Load necromancer model
gltfLoader.load('/models/necromancer.glb', (gltf) => {
    const model = gltf.scene;
    model.scale.set(1.5, 1.5, 1.5);
    // Compute bounding box to place feet on ground
    const box = new THREE.Box3().setFromObject(model);
    model.position.y = -box.min.y;
    enableShadows(model);
    // Remove placeholder geometry
    placeholderParts.forEach(p => playerGroup.remove(p));
    playerGroup.add(model);
    loadedModels.necromancer = model;
    playerModelLoaded = true;
    console.log('Necromancer model loaded');
}, undefined, (err) => {
    console.warn('Necromancer model failed to load, using placeholder:', err);
});

// Load zombie model
gltfLoader.load('/models/zombie.glb', (gltf) => {
    const model = gltf.scene;
    enableShadows(model);
    loadedModels.zombie = model;
    console.log('Zombie model loaded');
}, undefined, (err) => {
    console.warn('Zombie model failed to load:', err);
});

// Load skeleton model
gltfLoader.load('/models/skeleton.glb', (gltf) => {
    const model = gltf.scene;
    enableShadows(model);
    loadedModels.skeleton = model;
    console.log('Skeleton model loaded');
}, undefined, (err) => {
    console.warn('Skeleton model failed to load:', err);
});

// ─── CAMERA STATE ───────────────────────────────────────────
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const cameraOffset = new THREE.Vector3();
const smoothedCameraLook = new THREE.Vector3(0, CAMERA_LOOK_HEIGHT, -CAMERA_LOOK_AHEAD);
const cameraAim = new THREE.Vector3();
const cameraFlatForward = new THREE.Vector3(0, 0, -1);
const cameraRight = new THREE.Vector3(1, 0, 0);
let cameraYaw = 0;
let cameraPitch = -0.24;
let pointerLocked = false;

// ─── GAME STATE ─────────────────────────────────────────────
const state = {
    hp: 100, maxHp: 100,
    xp: 0, xpToLevel: 50, level: 1,
    baseDamage: 10,
    kills: 0,
    wave: 1, waveTimer: 5, waveCooldown: false,
    enemiesAlive: 0, enemiesToSpawn: 0,
    shootCooldown: 0,
    mouseX: 0, mouseY: 0,
    mouseDown: false,
    gameOver: false,
};

const keys = {};
const enemies = [];
const projectiles = [];
const particles = [];
const xpOrbs = [];

// ─── INPUT ──────────────────────────────────────────────────
window.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    keys[key] = true;
    if ((key === 'p' || key === 'escape') && !state.gameOver && document.getElementById('levelUpOverlay').classList.contains('hidden')) {
        e.preventDefault();
        window.togglePause?.();
    }
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

window.addEventListener('mousemove', e => {
    state.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    state.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    if (pointerLocked) {
        cameraYaw -= e.movementX * CAMERA_MOUSE_SENSITIVITY;
        cameraPitch = Math.max(CAMERA_MIN_PITCH, Math.min(CAMERA_MAX_PITCH, cameraPitch - e.movementY * CAMERA_MOUSE_SENSITIVITY));
    }
});

window.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
        state.mouseDown = true;
        if (!pointerLocked) renderer.domElement.requestPointerLock();
    }
});
window.addEventListener('mouseup', (e) => {
    if (e.button === 0) state.mouseDown = false;
});

document.addEventListener('pointerlockchange', () => {
    pointerLocked = document.pointerLockElement === renderer.domElement;
});

// Prevent context menu on right-click
renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── RAYCASTER FOR SHOOTING AIM ─────────────────────────────
const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const mouseWorldPos = new THREE.Vector3();

function getMouseWorldPos() {
    const aimPoint = pointerLocked ? new THREE.Vector2(0, 0) : new THREE.Vector2(state.mouseX, state.mouseY);
    raycaster.setFromCamera(aimPoint, camera);
    return raycaster.ray.intersectPlane(groundPlane, mouseWorldPos);
}

// ─── ENEMY TYPES & CREATION ─────────────────────────────────
const ENEMY_TYPES = [
    { name: 'Poacher',          color: 0x8b4513, size: 1.2, hp: 60,  dmg: 8,  speed: 90 / 32,  xp: 9,  attackCooldown: 1.5, modelKey: 'zombie',   modelScale: 1.6 },
    { name: 'Shadow Stalker',   color: 0x462070, size: 1.1, hp: 40,  dmg: 14, speed: 180 / 32, xp: 11, attackCooldown: 0.8, modelKey: 'zombie',   modelScale: 1.45 },
    { name: 'Bone Crawler',     color: 0xd4c5a9, size: 0.9, hp: 50,  dmg: 6,  speed: 110 / 32, xp: 8,  attackCooldown: 1.2, modelKey: 'skeleton', modelScale: 1.7 },
    { name: 'Frost Wraith',     color: 0xa0d2db, size: 1.3, hp: 35,  dmg: 10, speed: 70 / 32,  xp: 10, attackCooldown: 2.0, modelKey: 'zombie',   modelScale: 1.8 },
    { name: 'Magma Golem',      color: 0xd84315, size: 1.8, hp: 200, dmg: 20, speed: 40 / 32,  xp: 22, attackCooldown: 2.5, modelKey: 'skeleton', modelScale: 3.0 },
    { name: 'Crystal Sentinel', color: 0x9c27b0, size: 1.4, hp: 80,  dmg: 12, speed: 60 / 32,  xp: 14, attackCooldown: 1.8, modelKey: 'skeleton', modelScale: 2.2 },
    { name: 'Swamp Lurker',     color: 0x2e4a1e, size: 1.5, hp: 70,  dmg: 15, speed: 50 / 32,  xp: 13, attackCooldown: 2.0, modelKey: 'zombie',   modelScale: 2.0 },
    { name: 'Sand Burrower',    color: 0xc2a84d, size: 1.2, hp: 55,  dmg: 18, speed: 130 / 32, xp: 12, attackCooldown: 3.0, modelKey: 'skeleton', modelScale: 1.9 },
];

function cloneModel(source) {
    // Deep clone a loaded GLTF scene
    const clone = source.clone(true);
    // Clone materials so we can tint individually
    clone.traverse(child => {
        if (child.isMesh) {
            child.material = child.material.clone();
            child.castShadow = false; // perf: enemies don't cast shadows
            child.receiveShadow = false;
        }
    });
    return clone;
}

function tintModel(model, color) {
    const c = new THREE.Color(color);
    model.traverse(child => {
        if (child.isMesh && child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            for (const mat of mats) {
                if (mat.color) mat.color.copy(c);
                if (mat.emissive) {
                    mat.emissive.copy(c);
                    mat.emissiveIntensity = 0.35;
                }
                if ('roughness' in mat) mat.roughness = 0.72;
                if ('metalness' in mat) mat.metalness = 0.05;
                mat.needsUpdate = true;
            }
        }
    });
}

function createEnemyProxy(color, size) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.25,
        roughness: 0.72,
        metalness: 0.05,
    });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.32, size * 0.42, size * 1.35, 8), mat);
    body.position.y = size * 0.75;
    body.castShadow = true;
    group.add(body);

    const head = new THREE.Mesh(new THREE.BoxGeometry(size * 0.62, size * 0.48, size * 0.5), mat);
    head.position.y = size * 1.58;
    head.castShadow = true;
    group.add(head);

    for (const side of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(size * 0.16, size * 0.82, size * 0.16), mat);
        arm.position.set(side * size * 0.5, size * 0.95, 0);
        arm.rotation.z = side * 0.25;
        arm.castShadow = true;
        group.add(arm);
    }
    return group;
}

function spawnEnemy(type) {
    const t = ENEMY_TYPES[type % ENEMY_TYPES.length];
    const angle = Math.random() * Math.PI * 2;
    const dist = ARENA_SIZE * 0.9;

    const spawnX = Math.cos(angle) * dist;
    const spawnZ = Math.sin(angle) * dist;

    let mesh;
    let isModel = false;
    const sourceModel = loadedModels[t.modelKey];

    if (sourceModel) {
        // Use 3D model
        mesh = cloneModel(sourceModel);
        mesh.scale.set(t.modelScale, t.modelScale, t.modelScale);
        // Place feet on ground
        const box = new THREE.Box3().setFromObject(mesh);
        mesh.position.set(spawnX, -box.min.y * t.modelScale, spawnZ);
        // Tint by enemy type color
        tintModel(mesh, t.color);
        isModel = true;
    } else {
        mesh = createEnemyProxy(t.color, t.size);
        mesh.position.set(spawnX, 0, spawnZ);
    }

    scene.add(mesh);

    const hpScale = 1 + (state.wave - 1) * 0.15;
    enemies.push({
        mesh,
        isModel,
        _baseY: mesh.position.y,
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

// ─── PROJECTILE (POOLED) ────────────────────────────────────
const PROJ_GEO = new THREE.SphereGeometry(0.12, 6, 6);
const PROJ_MAT = new THREE.MeshBasicMaterial({ color: 0xbb66ff });
const projectilePool = [];

function getProjectile() {
    let p = projectilePool.pop();
    if (!p) {
        const mesh = new THREE.Mesh(PROJ_GEO, PROJ_MAT);
        scene.add(mesh);
        p = { mesh };
    }
    p.mesh.visible = true;
    return p;
}

function releaseProjectile(p) {
    p.mesh.visible = false;
    projectilePool.push(p);
}

function shoot() {
    if (state.shootCooldown > 0) return;
    state.shootCooldown = SHOOT_COOLDOWN * (state.cooldownMult || 1);

    // Fire toward where the camera is looking through the mouse cursor
    const target = getMouseWorldPos();
    if (!target) return;
    const dir = new THREE.Vector3().subVectors(target, playerGroup.position).normalize();
    dir.y = 0;

    const p = getProjectile();
    p.mesh.position.copy(playerGroup.position);
    p.mesh.position.y = 1.0;
    p.dir = dir;
    p.speed = PROJECTILE_SPEED;
    p.lifetime = 2;
    p.damage = Math.floor(state.baseDamage * (1 + (state.dmgBonus || 0)));
    projectiles.push(p);
}

// ─── PARTICLES (POOLED) ─────────────────────────────────────
const PART_GEO = new THREE.SphereGeometry(0.06, 4, 4);
const particleMatCache = {};
const particlePool = [];

function getParticleMat(color) {
    if (!particleMatCache[color]) {
        particleMatCache[color] = new THREE.MeshBasicMaterial({ color, transparent: true });
    }
    return particleMatCache[color];
}

function spawnParticles(pos, color, count = 5) {
    for (let i = 0; i < count; i++) {
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
        p.vel = new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 4, (Math.random() - 0.5) * 6);
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

function playerXpForLevel(level) {
    return Math.floor(50 * Math.pow(level, 1.5));
}

function showGameOver() {
    state.gameOver = true;
    paused = true;
    state.mouseDown = false;
    if (document.pointerLockElement === renderer.domElement) document.exitPointerLock();
    document.getElementById('pauseOverlay').classList.add('hidden');
    document.getElementById('gameOverKills').textContent = `${state.kills}`;
    document.getElementById('gameOverWave').textContent = `${state.wave}`;
    document.getElementById('gameOverOverlay').classList.remove('hidden');
}

// ─── WAVE SYSTEM ────────────────────────────────────────────
function startWave() {
    state.waveCooldown = false;
    const count = 5 + state.wave * 3;
    state.enemiesToSpawn = count;

    const el = document.getElementById('waveNotify');
    el.textContent = `Wave ${state.wave}`;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2000);
}

// ─── UPDATE ─────────────────────────────────────────────────
const clock = new THREE.Clock();
const _tmpVec3 = new THREE.Vector3();

function update() {
    const dt = Math.min(clock.getDelta(), 0.1);
    if (paused) return;

    // ── Camera orbit from mouse movement
    // Always rotate camera orbit when pointer is locked, or use raw movementX

    // ── Camera-relative directions
    const forward = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
    const right = new THREE.Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));

    // ── Player movement (WASD relative to camera)
    let moveDir = new THREE.Vector3(0, 0, 0);
    if (keys['w'] || keys['arrowup'])    moveDir.add(forward);
    if (keys['s'] || keys['arrowdown'])  moveDir.sub(forward);
    if (keys['d'] || keys['arrowright']) moveDir.add(right);
    if (keys['a'] || keys['arrowleft']) moveDir.sub(right);

    if (moveDir.lengthSq() > 0) {
        moveDir.normalize();
        const spd = PLAYER_SPEED * (1 + (state.speedBonus || 0));
        playerGroup.position.x = Math.max(-ARENA_SIZE + 1, Math.min(ARENA_SIZE - 1, playerGroup.position.x + moveDir.x * spd * dt));
        playerGroup.position.z = Math.max(-ARENA_SIZE + 1, Math.min(ARENA_SIZE - 1, playerGroup.position.z + moveDir.z * spd * dt));
    }

    // Player always faces mouse cursor (not movement direction)
    const cursorWorld = getMouseWorldPos();
    if (cursorWorld) {
        const targetAngle = Math.atan2(
            cursorWorld.x - playerGroup.position.x,
            cursorWorld.z - playerGroup.position.z
        );
        let angleDiff = targetAngle - playerGroup.rotation.y;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        playerGroup.rotation.y += angleDiff * 0.2;
    }

    // ── Camera follow (over-the-shoulder, orbiting around player)
    cameraAim.set(
        -Math.sin(cameraYaw) * Math.cos(cameraPitch),
        Math.sin(cameraPitch),
        -Math.cos(cameraYaw) * Math.cos(cameraPitch)
    ).normalize();
    cameraFlatForward.set(cameraAim.x, 0, cameraAim.z).normalize();
    cameraRight.crossVectors(cameraFlatForward, WORLD_UP).normalize();
    cameraOffset.copy(cameraAim).multiplyScalar(-CAMERA_DISTANCE)
        .addScaledVector(WORLD_UP, CAMERA_HEIGHT)
        .addScaledVector(cameraRight, CAMERA_SHOULDER);
    const desiredCamPos = playerGroup.position.clone()
        .add(new THREE.Vector3(0, CAMERA_LOOK_HEIGHT, 0))
        .add(cameraOffset);
    const desiredLookAt = playerGroup.position.clone()
        .add(new THREE.Vector3(0, CAMERA_LOOK_HEIGHT, 0))
        .addScaledVector(cameraAim, CAMERA_LOOK_AHEAD);
    const cameraAlpha = 1 - Math.exp(-dt * 8);
    camera.position.lerp(desiredCamPos, cameraAlpha);
    smoothedCameraLook.lerp(desiredLookAt, cameraAlpha);
    camera.lookAt(smoothedCameraLook);

    // Player light follow
    playerLight.position.set(playerGroup.position.x, 2, playerGroup.position.z);

    // Orb glow pulse (only if placeholder still active)
    if (!playerModelLoaded) {
        const pulse = 0.8 + Math.sin(clock.elapsedTime * 3) * 0.4;
        orbLight.intensity = pulse;
        orbMat.color.setHex(pulse > 1 ? 0xcc77ff : 0xaa55ff);
    }

    // ── Shooting
    state.shootCooldown -= dt;
    if (state.mouseDown) shoot();

    // ── Projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.mesh.position.addScaledVector(p.dir, p.speed * dt);
        p.lifetime -= dt;

        // Check hit enemies (XZ distance only)
        let hit = false;
        for (let j = enemies.length - 1; j >= 0; j--) {
            const e = enemies[j];
            const edx = p.mesh.position.x - e.mesh.position.x;
            const edz = p.mesh.position.z - e.mesh.position.z;
            const eDist = Math.sqrt(edx * edx + edz * edz);
            if (eDist < e.type.size + 0.5) {
                e.hp -= p.damage;
                e.hitFlash = 0.1;
                spawnParticles(e.mesh.position, 0xbb66ff, 3);

                if (e.hp <= 0) {
                    spawnParticles(e.mesh.position, e.type.color, 8);
                    spawnXpOrb(e.mesh.position, Math.floor(e.xp * (state.xpMult || 1)));
                    scene.remove(e.mesh);
                    enemies.splice(j, 1);
                    state.enemiesAlive--;
                    state.kills++;
                    document.getElementById('killCount').textContent = `Kills: ${state.kills}`;
                }
                hit = true;
                break;
            }
        }

        if (hit || p.lifetime <= 0 || Math.abs(p.mesh.position.x) > ARENA_SIZE || Math.abs(p.mesh.position.z) > ARENA_SIZE) {
            releaseProjectile(p);
            projectiles.splice(i, 1);
        }
    }

    // ── Enemies
    for (const e of enemies) {
        // Move toward player
        const dir = new THREE.Vector3().subVectors(playerGroup.position, e.mesh.position).normalize();
        dir.y = 0;
        e.mesh.position.addScaledVector(dir, e.speed * dt);

        if (!e.isModel) {
            // Sphere fallback: bobbing
            e.mesh.position.y = e.type.size + 0.1 + Math.sin(clock.elapsedTime * 3 + e.mesh.id) * 0.05;
        }

        // Face the player
        const faceAngle = Math.atan2(
            playerGroup.position.x - e.mesh.position.x,
            playerGroup.position.z - e.mesh.position.z
        );
        e.mesh.rotation.y = faceAngle;

        // Walk animation — rock side to side while moving
        const walkCycle = Math.sin(clock.elapsedTime * 6 + e.mesh.id * 2);
        e.mesh.rotation.z = walkCycle * 0.08; // slight body rock
        if (e.isModel) {
            // Bounce up/down while walking
            const baseY = e._baseY || 0;
            e.mesh.position.y = baseY + Math.abs(Math.sin(clock.elapsedTime * 8 + e.mesh.id)) * 0.15;
        }

        // Attack player
        e.attackCooldown -= dt;
        const distToPlayer = new THREE.Vector2(
            e.mesh.position.x - playerGroup.position.x,
            e.mesh.position.z - playerGroup.position.z
        ).length();
        if (distToPlayer < e.type.size + 1.2 && e.attackCooldown <= 0) {
            state.hp -= e.dmg;
            e.attackCooldown = e.attackRate || 1.5;
            spawnParticles(playerGroup.position, 0xf87171, 3);
            if (state.hp <= 0) state.hp = 0;
            // Lunge animation — tilt forward on attack
            e._lungeTimer = 0.3;
        }

        // Lunge tilt
        if (e._lungeTimer > 0) {
            e._lungeTimer -= dt;
            e.mesh.rotation.x = -0.4 * (e._lungeTimer / 0.3); // tilt forward
        } else {
            e.mesh.rotation.x = 0;
        }

        // Hit flash
        if (e.hitFlash > 0) {
            e.hitFlash -= dt;
            if (e.isModel) {
                e.mesh.traverse(child => {
                    if (child.isMesh && child.material) {
                        child.material.emissiveIntensity = 1.0;
                    }
                });
            } else {
                e.mesh.material.emissiveIntensity = 1;
            }
        } else {
            if (e.isModel) {
                e.mesh.traverse(child => {
                    if (child.isMesh && child.material) {
                        child.material.emissiveIntensity = 0.35;
                    }
                });
            } else {
                e.mesh.material.emissiveIntensity = 0.3;
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
    for (let i = xpOrbs.length - 1; i >= 0; i--) {
        const o = xpOrbs[i];
        o.life -= dt;
        o.mesh.position.y = 0.5 + Math.sin(clock.elapsedTime * 4 + i) * 0.15;

        const orbDist = new THREE.Vector2(
            o.mesh.position.x - playerGroup.position.x,
            o.mesh.position.z - playerGroup.position.z
        ).length();
        if (orbDist < 3) {
            const pullDir = new THREE.Vector3().subVectors(playerGroup.position, o.mesh.position).normalize();
            o.mesh.position.addScaledVector(pullDir, 10 * dt);
        }
        if (orbDist < 0.8 || o.life <= 0) {
            if (orbDist < 0.8) {
                state.xp += o.amount;
                while (state.xp >= state.xpToLevel) {
                    state.xp -= state.xpToLevel;
                    state.level++;
                    state.maxHp += 5;
                    state.baseDamage += 1;
                    state.hp = state.maxHp;
                    state.xpToLevel = playerXpForLevel(state.level);
                    document.getElementById('levelLabel').textContent = `Lv.${state.level}`;
                    showLevelUp();
                }
            }
            scene.remove(o.mesh);
            xpOrbs.splice(i, 1);
        }
    }

    // ── CONSTANT PRESSURE SPAWN SYSTEM ──
    // Always spawning. Wave number increases over time = harder enemies.
    // No downtime. Enemies come in bursts with small gaps.
    if (!state._spawnTimer) state._spawnTimer = 0;
    state._spawnTimer -= dt;

    // 2D Velthara hostile cap: keep pressure readable instead of flooding.
    const maxAlive = 15;

    if (state._spawnTimer <= 0 && state.enemiesAlive < maxAlive) {
        const burst = Math.min(3, maxAlive - state.enemiesAlive);
        for (let b = 0; b < burst && state.enemiesAlive < maxAlive; b++) {
            const type = Math.floor(Math.random() * Math.min(ENEMY_TYPES.length, 2 + Math.floor(state.wave / 2)));
            spawnEnemy(type);
        }
        const baseInterval = Math.max(4.0, 8.0 - state.wave * 0.35);
        state._spawnTimer = baseInterval + Math.random() * 0.5;
    }

    // Wave increases every 30 kills
    const waveFromKills = 1 + Math.floor(state.kills / 30);
    if (waveFromKills > state.wave) {
        state.wave = waveFromKills;
        document.getElementById('waveLabel').textContent = `Wave ${state.wave}`;
        // Flash wave notification
        const el = document.getElementById('waveNotify');
        el.textContent = `Wave ${state.wave}`;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 2000);
    }

    // ── Respawn
    if (state.hp <= 0) {
        state.hp = 0;
        showGameOver();
    }

    // ── HUD
    document.getElementById('hpBar').style.width = `${(state.hp / state.maxHp) * 100}%`;
    document.getElementById('xpBar').style.width = `${(state.xp / state.xpToLevel) * 100}%`;
}

// ─── GAME LOOP ──────────────────────────────────────────────
function animate() {
    requestAnimationFrame(animate);
    update();
    renderer.render(scene, camera);
}

// ─── PAUSE SYSTEM ───────────────────────────────────────────
let paused = false;
window.togglePause = function() {
    if (state.gameOver) return;
    paused = !paused;
    state.mouseDown = false;
    if (paused && document.pointerLockElement === renderer.domElement) document.exitPointerLock();
    document.getElementById('pauseOverlay').classList.toggle('hidden', !paused);
};

// ─── SIGIL SYSTEM ───────────────────────────────────────────
const SIGILS = [
    { name: 'Soul Drain',       icon: '💀', desc: '+5% lifesteal on projectile hits', rarity: 'common',    effect: () => { state.lifesteal = (state.lifesteal || 0) + 0.05; } },
    { name: 'Arcane Surge',     icon: '⚡', desc: '+20% projectile damage',           rarity: 'common',    effect: () => { state.dmgBonus = (state.dmgBonus || 0) + 0.2; } },
    { name: 'Dark Vitality',    icon: '❤️', desc: '+25 max HP, heal to full',          rarity: 'common',    effect: () => { state.maxHp += 25; state.hp = state.maxHp; } },
    { name: 'Swift Shadow',     icon: '👟', desc: '+15% movement speed',               rarity: 'common',    effect: () => { state.speedBonus = (state.speedBonus || 0) + 0.15; } },
    { name: 'Rapid Fire',       icon: '🔥', desc: '-30% shoot cooldown',               rarity: 'rare',      effect: () => { state.cooldownMult = (state.cooldownMult || 1) * 0.7; } },
    { name: 'Piercing Bolt',    icon: '🗡️', desc: 'Projectiles pierce 1 extra enemy',  rarity: 'rare',      effect: () => { state.pierce = (state.pierce || 0) + 1; } },
    { name: 'XP Feast',         icon: '✨', desc: '+50% XP from kills',                rarity: 'rare',      effect: () => { state.xpMult = (state.xpMult || 1) + 0.5; } },
    { name: 'Death Nova',       icon: '💥', desc: 'Enemies explode on death, dealing AOE', rarity: 'epic',  effect: () => { state.deathNova = true; } },
    { name: 'Necro Shield',     icon: '🛡️', desc: 'Block 1 hit every 10 seconds',      rarity: 'epic',      effect: () => { state.shieldInterval = 10; state.shieldTimer = 0; } },
    { name: 'Bone Army',        icon: '💀', desc: 'Summon 2 skeleton minions',          rarity: 'epic',      effect: () => { state.minions = (state.minions || 0) + 2; } },
    { name: 'Void Embrace',     icon: '🌀', desc: '+100% damage, -20% max HP',         rarity: 'legendary', effect: () => { state.dmgBonus = (state.dmgBonus || 0) + 1.0; state.maxHp = Math.floor(state.maxHp * 0.8); state.hp = Math.min(state.hp, state.maxHp); } },
    { name: 'Eternal Hunger',   icon: '🩸', desc: '+15% lifesteal, +30% damage',       rarity: 'legendary', effect: () => { state.lifesteal = (state.lifesteal || 0) + 0.15; state.dmgBonus = (state.dmgBonus || 0) + 0.3; } },
];

let levelUpPending = false;

function showLevelUp() {
    levelUpPending = true;
    paused = true;
    const overlay = document.getElementById('levelUpOverlay');
    const container = document.getElementById('sigilCards');
    overlay.classList.remove('hidden');

    // Pick 3 random sigils
    const picks = [];
    const pool = [...SIGILS];
    for (let i = 0; i < 3 && pool.length > 0; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        picks.push(pool.splice(idx, 1)[0]);
    }

    container.innerHTML = '';
    for (const sigil of picks) {
        const card = document.createElement('div');
        card.className = `lu-card ${sigil.rarity}`;
        card.innerHTML = `
            <div class="lu-card-rarity" style="color:${sigil.rarity === 'legendary' ? '#ff9800' : sigil.rarity === 'epic' ? '#9c27b0' : sigil.rarity === 'rare' ? '#ffc107' : '#aaa'}">${sigil.rarity}</div>
            <div class="lu-card-icon">${sigil.icon}</div>
            <div class="lu-card-name">${sigil.name}</div>
            <div class="lu-card-desc">${sigil.desc}</div>
        `;
        card.onclick = () => {
            sigil.effect();
            overlay.classList.add('hidden');
            paused = false;
            levelUpPending = false;
        };
        container.appendChild(card);
    }
}

startWave();
animate();
