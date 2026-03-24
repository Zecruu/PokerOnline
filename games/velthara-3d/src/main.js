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
scene.background = new THREE.Color(0x0a0a14);
scene.fog = new THREE.Fog(0x0a0a14, 30, 60);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 18, 12);
camera.lookAt(0, 0, 0);

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
mainLight.shadow.camera.left = -25;
mainLight.shadow.camera.right = 25;
mainLight.shadow.camera.top = 25;
mainLight.shadow.camera.bottom = -25;
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
    new THREE.Mesh(wallGeo, wallMat), // north
    new THREE.Mesh(wallGeo, wallMat), // south
    new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, ARENA_SIZE * 2), wallMat), // east
    new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, ARENA_SIZE * 2), wallMat), // west
];
walls[0].position.set(0, 1.5, -ARENA_SIZE);
walls[1].position.set(0, 1.5, ARENA_SIZE);
walls[2].position.set(ARENA_SIZE, 1.5, 0);
walls[3].position.set(-ARENA_SIZE, 1.5, 0);
walls.forEach(w => scene.add(w));

// ─── PLAYER ─────────────────────────────────────────────────
const playerGroup = new THREE.Group();

// Body (hooded robe shape — cone)
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

scene.add(playerGroup);

// Load necromancer GLB model (replaces placeholder)
const gltfLoader = new GLTFLoader();
gltfLoader.load('/models/necromancer.glb', (gltf) => {
    const model = gltf.scene;
    model.scale.set(1.5, 1.5, 1.5);
    model.position.y = 0;
    model.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    // Remove placeholder geometry
    playerGroup.remove(body, head, eyeL, eyeR, staff, orb);
    playerGroup.add(model);
    console.log('Necromancer model loaded!');
}, (progress) => {
    console.log(`Loading model: ${((progress.loaded / progress.total) * 100).toFixed(0)}%`);
}, (err) => {
    console.warn('Model failed to load, using placeholder:', err);
});

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
});
window.addEventListener('mousedown', () => state.mouseDown = true);
window.addEventListener('mouseup', () => state.mouseDown = false);
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── RAYCASTER FOR MOUSE AIM ────────────────────────────────
const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const mouseWorldPos = new THREE.Vector3();

function getMouseWorldPos() {
    raycaster.setFromCamera(new THREE.Vector2(state.mouseX, state.mouseY), camera);
    raycaster.ray.intersectPlane(groundPlane, mouseWorldPos);
    return mouseWorldPos;
}

// ─── ENEMY CREATION ─────────────────────────────────────────
const ENEMY_TYPES = [
    { name: 'Swarm', color: 0x66bb6a, size: 0.3, hp: 15, dmg: 5, speed: 1.0, xp: 5 },
    { name: 'Runner', color: 0xffd54f, size: 0.25, hp: 10, dmg: 3, speed: 1.8, xp: 8 },
    { name: 'Tank', color: 0x90a4ae, size: 0.6, hp: 50, dmg: 10, speed: 0.6, xp: 15 },
    { name: 'Bomber', color: 0xff7043, size: 0.4, hp: 20, dmg: 15, speed: 0.9, xp: 12 },
    { name: 'Shadow', color: 0x7e57c2, size: 0.35, hp: 25, dmg: 8, speed: 1.3, xp: 10 },
];

function spawnEnemy(type) {
    const t = ENEMY_TYPES[type % ENEMY_TYPES.length];
    const angle = Math.random() * Math.PI * 2;
    const dist = ARENA_SIZE * 0.9;

    const geo = new THREE.SphereGeometry(t.size, 8, 8);
    const mat = new THREE.MeshStandardMaterial({
        color: t.color,
        emissive: t.color,
        emissiveIntensity: 0.3,
        roughness: 0.6,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(Math.cos(angle) * dist, t.size + 0.1, Math.sin(angle) * dist);
    mesh.castShadow = true;
    scene.add(mesh);

    const hpScale = 1 + (state.wave - 1) * 0.15;
    enemies.push({
        mesh,
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

// ─── PROJECTILE ─────────────────────────────────────────────
function shoot() {
    if (state.shootCooldown > 0) return;
    state.shootCooldown = SHOOT_COOLDOWN;

    const target = getMouseWorldPos();
    const dir = new THREE.Vector3().subVectors(target, playerGroup.position).normalize();
    dir.y = 0;

    const geo = new THREE.SphereGeometry(0.12, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0xbb66ff });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(playerGroup.position);
    mesh.position.y = 1.2;

    // Trail light
    const light = new THREE.PointLight(0xbb66ff, 0.8, 4);
    mesh.add(light);

    scene.add(mesh);
    projectiles.push({ mesh, dir, speed: PROJECTILE_SPEED, lifetime: 2, damage: 15 + state.level * 2 });
}

// ─── PARTICLES ──────────────────────────────────────────────
function spawnParticles(pos, color, count = 5) {
    for (let i = 0; i < count; i++) {
        const geo = new THREE.SphereGeometry(0.06, 4, 4);
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        scene.add(mesh);
        particles.push({
            mesh,
            vel: new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 4, (Math.random() - 0.5) * 6),
            life: 0.4 + Math.random() * 0.3,
        });
    }
}

// ─── XP ORBS ────────────────────────────────────────────────
function spawnXpOrb(pos, amount) {
    const geo = new THREE.SphereGeometry(0.1, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.position.y = 0.5;

    const light = new THREE.PointLight(0xfbbf24, 0.5, 3);
    mesh.add(light);
    scene.add(mesh);
    xpOrbs.push({ mesh, amount, life: 10 });
}

// ─── WAVE SYSTEM ────────────────────────────────────────────
function startWave() {
    state.waveCooldown = false;
    const count = 5 + state.wave * 3;
    state.enemiesToSpawn = count;

    // Show notification
    const el = document.getElementById('waveNotify');
    el.textContent = `Wave ${state.wave}`;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2000);
}

// ─── UPDATE ─────────────────────────────────────────────────
const clock = new THREE.Clock();

function update() {
    const dt = Math.min(clock.getDelta(), 0.1);

    // ── Player movement
    let dx = 0, dz = 0;
    if (keys['w'] || keys['arrowup']) dz -= 1;
    if (keys['s'] || keys['arrowdown']) dz += 1;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;
    if (dx || dz) {
        const len = Math.sqrt(dx * dx + dz * dz);
        dx /= len; dz /= len;
        playerGroup.position.x = Math.max(-ARENA_SIZE + 1, Math.min(ARENA_SIZE - 1, playerGroup.position.x + dx * PLAYER_SPEED * dt));
        playerGroup.position.z = Math.max(-ARENA_SIZE + 1, Math.min(ARENA_SIZE - 1, playerGroup.position.z + dz * PLAYER_SPEED * dt));
    }

    // Face mouse
    const target = getMouseWorldPos();
    if (target) {
        const angle = Math.atan2(target.x - playerGroup.position.x, target.z - playerGroup.position.z);
        playerGroup.rotation.y = angle;
    }

    // Camera follow
    camera.position.x += (playerGroup.position.x - camera.position.x) * 0.05;
    camera.position.z += (playerGroup.position.z + 12 - camera.position.z) * 0.05;
    camera.lookAt(playerGroup.position.x, 0, playerGroup.position.z);

    // Player light follow
    playerLight.position.set(playerGroup.position.x, 2, playerGroup.position.z);

    // Orb glow pulse
    const pulse = 0.8 + Math.sin(clock.elapsedTime * 3) * 0.4;
    orbLight.intensity = pulse;
    orbMat.color.setHex(pulse > 1 ? 0xcc77ff : 0xaa55ff);

    // ── Shooting
    state.shootCooldown -= dt;
    if (state.mouseDown) shoot();

    // ── Projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.mesh.position.addScaledVector(p.dir, p.speed * dt);
        p.lifetime -= dt;

        // Check hit enemies
        let hit = false;
        for (let j = enemies.length - 1; j >= 0; j--) {
            const e = enemies[j];
            const dist = p.mesh.position.distanceTo(e.mesh.position);
            if (dist < e.type.size + 0.2) {
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
            scene.remove(p.mesh);
            projectiles.splice(i, 1);
        }
    }

    // ── Enemies
    for (const e of enemies) {
        // Move toward player
        const dir = new THREE.Vector3().subVectors(playerGroup.position, e.mesh.position).normalize();
        dir.y = 0;
        e.mesh.position.addScaledVector(dir, e.speed * dt);
        e.mesh.position.y = e.type.size + 0.1 + Math.sin(clock.elapsedTime * 3 + e.mesh.id) * 0.05;

        // Attack player
        e.attackCooldown -= dt;
        const distToPlayer = e.mesh.position.distanceTo(playerGroup.position);
        if (distToPlayer < e.type.size + 0.8 && e.attackCooldown <= 0) {
            state.hp -= e.dmg;
            e.attackCooldown = 1.0;
            spawnParticles(playerGroup.position, 0xf87171, 3);
            if (state.hp <= 0) state.hp = 0;
        }

        // Hit flash
        if (e.hitFlash > 0) {
            e.hitFlash -= dt;
            e.mesh.material.emissiveIntensity = 1;
        } else {
            e.mesh.material.emissiveIntensity = 0.3;
        }
    }

    // ── Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.mesh.position.addScaledVector(p.vel, dt);
        p.vel.y -= 10 * dt; // gravity
        p.life -= dt;
        p.mesh.material.opacity = Math.max(0, p.life / 0.5);
        if (p.life <= 0) {
            scene.remove(p.mesh);
            particles.splice(i, 1);
        }
    }

    // ── XP Orbs — float toward player when close
    for (let i = xpOrbs.length - 1; i >= 0; i--) {
        const o = xpOrbs[i];
        o.life -= dt;
        o.mesh.position.y = 0.5 + Math.sin(clock.elapsedTime * 4 + i) * 0.15;

        const dist = o.mesh.position.distanceTo(playerGroup.position);
        if (dist < 3) {
            // Magnetic pull
            const dir = new THREE.Vector3().subVectors(playerGroup.position, o.mesh.position).normalize();
            o.mesh.position.addScaledVector(dir, 10 * dt);
        }
        if (dist < 0.8 || o.life <= 0) {
            if (dist < 0.8) {
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
