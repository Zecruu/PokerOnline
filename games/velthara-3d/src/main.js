import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ─── CONSTANTS ──────────────────────────────────────────────
const ARENA_SIZE = 40;
const PLAYER_SPEED = 8;
const PROJECTILE_SPEED = 25;
const ENEMY_SPEED_BASE = 3;
const SHOOT_COOLDOWN = 0.15;

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

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 6, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8;
document.body.appendChild(renderer.domElement);

// ─── LIGHTING ───────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0x222244, 0.6);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0x8866cc, 1.2);
mainLight.position.set(10, 20, 10);
mainLight.castShadow = true;
mainLight.shadow.mapSize.set(2048, 2048);
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
const cameraOffset = new THREE.Vector3(0, 6, 8);
let cameraAngle = 0;
let mouseMovementX = 0;
let pointerLocked = false;

// ─── GAME STATE ─────────────────────────────────────────────
const state = {
    hp: 100, maxHp: 100,
    xp: 0, xpToLevel: 50, level: 1,
    kills: 0,
    wave: 1, waveTimer: 5, waveCooldown: false,
    enemiesAlive: 0, enemiesToSpawn: 0,
    shootCooldown: 0,
    mouseX: 0, mouseY: 0,
    mouseDown: false,
};

const keys = {};
const enemies = [];
const projectiles = [];
const particles = [];
const xpOrbs = [];

// ─── INPUT ──────────────────────────────────────────────────
window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

window.addEventListener('mousemove', e => {
    state.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    state.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    // Camera orbit from mouse movement
    mouseMovementX = e.movementX || 0;
});

window.addEventListener('mousedown', (e) => {
    state.mouseDown = true;
    // Request pointer lock on right-click for camera control
    if (e.button === 2) {
        renderer.domElement.requestPointerLock();
    }
});
window.addEventListener('mouseup', () => state.mouseDown = false);

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
    raycaster.setFromCamera(new THREE.Vector2(state.mouseX, state.mouseY), camera);
    raycaster.ray.intersectPlane(groundPlane, mouseWorldPos);
    return mouseWorldPos;
}

// ─── ENEMY TYPES & CREATION ─────────────────────────────────
const ENEMY_TYPES = [
    { name: 'Swarm',  color: 0x66bb6a, size: 0.3,  hp: 15, dmg: 5,  speed: 1.0, xp: 5,  modelKey: 'zombie',   modelScale: 0.6 },
    { name: 'Runner', color: 0xffd54f, size: 0.25, hp: 10, dmg: 3,  speed: 1.8, xp: 8,  modelKey: 'zombie',   modelScale: 0.5 },
    { name: 'Tank',   color: 0x90a4ae, size: 0.6,  hp: 50, dmg: 10, speed: 0.6, xp: 15, modelKey: 'skeleton', modelScale: 1.0 },
    { name: 'Bomber', color: 0xff7043, size: 0.4,  hp: 20, dmg: 15, speed: 0.9, xp: 12, modelKey: 'skeleton', modelScale: 0.8 },
    { name: 'Shadow', color: 0x7e57c2, size: 0.35, hp: 25, dmg: 8,  speed: 1.3, xp: 10, modelKey: 'zombie',   modelScale: 0.7 },
];

function cloneModel(source) {
    // Deep clone a loaded GLTF scene
    const clone = source.clone(true);
    // Clone materials so we can tint individually
    clone.traverse(child => {
        if (child.isMesh) {
            child.material = child.material.clone();
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    return clone;
}

function tintModel(model, color) {
    const c = new THREE.Color(color);
    model.traverse(child => {
        if (child.isMesh && child.material) {
            child.material.emissive = c;
            child.material.emissiveIntensity = 0.35;
        }
    });
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
        // Shadow enemies get extra purple tint
        if (t.name === 'Shadow') {
            tintModel(mesh, 0x9933ff);
        }
        isModel = true;
    } else {
        // Fallback sphere
        const geo = new THREE.SphereGeometry(t.size, 8, 8);
        const mat = new THREE.MeshStandardMaterial({
            color: t.color,
            emissive: t.color,
            emissiveIntensity: 0.3,
            roughness: 0.6,
        });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(spawnX, t.size + 0.1, spawnZ);
        mesh.castShadow = true;
    }

    scene.add(mesh);

    const hpScale = 1 + (state.wave - 1) * 0.15;
    enemies.push({
        mesh,
        isModel,
        type: t,
        hp: Math.floor(t.hp * hpScale),
        maxHp: Math.floor(t.hp * hpScale),
        dmg: Math.floor(t.dmg * (1 + (state.wave - 1) * 0.1)),
        speed: t.speed * ENEMY_SPEED_BASE,
        xp: t.xp,
        attackCooldown: 0,
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
    state.shootCooldown = SHOOT_COOLDOWN;

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
    p.damage = 15 + state.level * 2;
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

    // ── Camera orbit from mouse movement
    // Always rotate camera orbit when pointer is locked, or use raw movementX
    cameraAngle -= mouseMovementX * 0.003;
    mouseMovementX = 0; // consume

    // ── Camera-relative directions
    const forward = new THREE.Vector3(-Math.sin(cameraAngle), 0, -Math.cos(cameraAngle));
    const right = new THREE.Vector3(Math.cos(cameraAngle), 0, -Math.sin(cameraAngle));

    // ── Player movement (WASD relative to camera)
    let moveDir = new THREE.Vector3(0, 0, 0);
    if (keys['w'] || keys['arrowup'])    moveDir.add(forward);
    if (keys['s'] || keys['arrowdown'])  moveDir.sub(forward);
    if (keys['d'] || keys['arrowright']) moveDir.add(right);
    if (keys['a'] || keys['arrowleft']) moveDir.sub(right);

    if (moveDir.lengthSq() > 0) {
        moveDir.normalize();
        playerGroup.position.x = Math.max(-ARENA_SIZE + 1, Math.min(ARENA_SIZE - 1, playerGroup.position.x + moveDir.x * PLAYER_SPEED * dt));
        playerGroup.position.z = Math.max(-ARENA_SIZE + 1, Math.min(ARENA_SIZE - 1, playerGroup.position.z + moveDir.z * PLAYER_SPEED * dt));
        // Player faces movement direction
        const targetAngle = Math.atan2(moveDir.x, moveDir.z);
        // Smooth rotation
        let angleDiff = targetAngle - playerGroup.rotation.y;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        playerGroup.rotation.y += angleDiff * 0.15;
    }

    // ── Camera follow (over-the-shoulder, orbiting around player)
    const rotatedOffset = cameraOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraAngle);
    const desiredCamPos = playerGroup.position.clone().add(rotatedOffset);
    camera.position.lerp(desiredCamPos, 0.1);
    camera.lookAt(playerGroup.position.x, 1.5, playerGroup.position.z);

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
                    spawnXpOrb(e.mesh.position, e.xp);
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

        // Attack player
        e.attackCooldown -= dt;
        const distToPlayer = new THREE.Vector2(
            e.mesh.position.x - playerGroup.position.x,
            e.mesh.position.z - playerGroup.position.z
        ).length();
        if (distToPlayer < e.type.size + 0.8 && e.attackCooldown <= 0) {
            state.hp -= e.dmg;
            e.attackCooldown = 1.0;
            spawnParticles(playerGroup.position, 0xf87171, 3);
            if (state.hp <= 0) state.hp = 0;
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
                if (state.xp >= state.xpToLevel) {
                    state.xp -= state.xpToLevel;
                    state.level++;
                    state.xpToLevel = Math.floor(state.xpToLevel * 1.3);
                    state.maxHp += 10;
                    state.hp = state.maxHp;
                    document.getElementById('levelLabel').textContent = `Lv.${state.level}`;
                }
            }
            scene.remove(o.mesh);
            xpOrbs.splice(i, 1);
        }
    }

    // ── Wave system
    if (state.waveCooldown) {
        state.waveTimer -= dt;
        if (state.waveTimer <= 0) startWave();
    } else {
        // Spawn enemies gradually
        if (state.enemiesToSpawn > 0) {
            if (!state._spawnTimer) state._spawnTimer = 0;
            state._spawnTimer -= dt;
            if (state._spawnTimer <= 0) {
                const type = Math.floor(Math.random() * Math.min(ENEMY_TYPES.length, 1 + Math.floor(state.wave / 3)));
                spawnEnemy(type);
                state.enemiesToSpawn--;
                state._spawnTimer = 0.3;
            }
        }

        // Wave complete
        if (state.enemiesToSpawn <= 0 && state.enemiesAlive <= 0) {
            state.wave++;
            document.getElementById('waveLabel').textContent = `Wave ${state.wave}`;
            state.waveCooldown = true;
            state.waveTimer = 3;
        }
    }

    // ── Respawn
    if (state.hp <= 0) {
        state.hp = state.maxHp;
        playerGroup.position.set(0, 0, 0);
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

startWave();
animate();
