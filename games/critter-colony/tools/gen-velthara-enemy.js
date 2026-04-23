#!/usr/bin/env node
/**
 * Generate a single Veltharas Dominion enemy sprite via openai/gpt-image-2.
 * Uses cinder_wretch.png as a style anchor so all regenerated enemies share one
 * demonic hellbound aesthetic: obsidian/charred flesh body, glowing orange-red
 * lava cracks or embers, dark palette that reads against the lava-castle bg.
 *
 * Usage:
 *   REPLICATE_API_TOKEN=r8_... node gen-velthara-enemy.js <name>
 *
 * Reads the subject definition from the ENEMIES map below. Output goes to
 * games-server/public/veltharas-dominion/enemies/<name>.png
 * Raw (pre-BG-strip) versions land in enemies/_raw/<name>.png for re-runs.
 */
const fs = require('fs');
const path = require('path');
const Replicate = require('replicate');

const BASE = path.resolve(__dirname, '..', '..', '..', 'games-server', 'public', 'veltharas-dominion');
const OUT_DIR = path.join(BASE, 'enemies');
const RAW_DIR = path.join(OUT_DIR, '_raw');
const REF_IMAGE = path.join(OUT_DIR, 'cinder_wretch.png');

// Shared style prefix used by every enemy prompt so we get a cohesive set.
const STYLE = `
Dark-fantasy demonic hellbound enemy sprite. Dark obsidian-black charred flesh / rock / bone body with
glowing orange-red cracks of lava or ember light breaking through. Small curling wisps of smoke. Intense
crimson or molten-orange glowing eyes. High contrast rim-lit rendering, cinematic painterly style matching
the reference image. Single creature centered in frame, full body visible, strong silhouette, ready for
gameplay at ~64px on screen. Facing the camera at a slight 3/4 angle, menacing pose. Plain flat neutral
cream-colored studio background (NOT transparent) so the creature reads clearly. No text, no watermark,
no logos, no border, no signature.
`.trim().replace(/\s+/g, ' ');

// Per-enemy subject description. The style anchor + palette come from STYLE + reference image.
const ENEMIES = {
    'basic': {
        quality: 'high', // anchor sprite — will be reused as reference for others
        subject: 'A squat humanoid demon minion about the size of a goblin, hunched over, with arms longer than its legs. Skin like cracked obsidian with glowing lava veins running along its limbs. Small pointed horns on its head. Small bat-like wings folded at its back. Jagged claws on its hands. Snarling teeth, two glowing orange-red eyes.',
    },
    'swarm': {
        quality: 'high',
        subject: 'A tiny skittering hellish imp, about half the size of a normal demon, scurrying on four limbs. Cracked obsidian-black body with thin lava veins, bat ears, beady glowing eyes, sharp little teeth, jagged claws. Lithe and fast-looking.',
    },
    'runner': {
        quality: 'high',
        subject: 'A lean agile demonic hound creature on four legs, wolf-like but hellish. Charred black skin stretched over bone, glowing orange cracks along the spine, smoking wisps rising from its back. Short horns, glowing eyes, exposed fangs. Built for speed.',
    },
    'tank': {
        quality: 'high',
        subject: 'A massive bulky demon brute, broad shoulders hunched low, thick arms dragging. Body like solidified lava rock, with glowing orange-red cracks running down its chest and arms. Enormous jagged obsidian spikes erupting from shoulders and back. Small head sunk into shoulders, two tiny glowing eyes, jaw full of crooked teeth. Heavy and slow-looking.',
    },
    'bomber': {
        quality: 'high',
        subject: 'A rotund demonic creature with a bloated glowing belly like a molten lava bomb, held in both clawed hands. Obsidian-black skin cracked with orange-red lava veins concentrated in the belly area, smoke rising from the seams. Stubby legs, wicked grin, glowing eyes. Looks like it is about to explode.',
    },
    'splitter': {
        quality: 'high',
        subject: 'A medium-size amorphous demonic slime-creature made of molten magma held together by cracking obsidian crust. Parts of its body have already split off as smaller drooping globs. Glowing lava interior shows through fissures all over its surface. No clear face, just two glowing orange eye-holes.',
    },
    'sticky': {
        quality: 'high',
        subject: 'A low-slung demonic crawler resembling a tar-covered toad or leech hybrid. Glossy black charred hide coated in dripping molten pitch that glows orange-red underneath. Wide suction-cup mouth full of small teeth, four stubby legs, glowing eyes on short stalks. Looks like it would latch onto prey.',
    },
    'poison': {
        quality: 'high',
        subject: 'A gangly hunched demon spewing a sickly green-yellow venomous smoke from its open mouth. Blackened-obsidian body with faint orange lava cracks but the venom aura dominates. Bony limbs, distended belly, dripping fanged mouth, glowing green eyes (contrasting the red theme for toxicity). Other palette details still match the demonic set.',
    },
    'ice': {
        quality: 'high',
        subject: 'A frost-corrupted demon. Lower half cracked obsidian-black but upper body is coated in jagged pale-blue ice spikes; orange lava glow inside the body fights against the encasing ice. Contrast: icy pale blue vs demonic orange-red. Sharp frozen claws, glowing pale-blue eyes, breath of visible cold mist.',
    },
    'goblin': {
        quality: 'high',
        subject: 'A wiry hellish goblin with long pointed ears, hunched on clawed feet. Charred black leathery skin with faint orange lava veins in the cheeks and chest. Wicked grin full of crooked teeth, glowing red eyes. Tattered red/black rags for clothing, gripping a rusted crude jagged blade in one claw.',
    },
    'mini': {
        quality: 'high',
        subject: 'A small minion demon, half the size of the tank but built like it: stocky body of cracked obsidian with glowing lava veins, tiny horns, a single glowing orange eye, four short arms ending in claws. Foot soldier impression.',
    },
    'mini-consumer': {
        quality: 'high',
        subject: 'A miniature version of a gaping demonic maw creature. Body is mostly a huge circular jagged-toothed mouth surrounded by cracked obsidian flesh, glowing orange throat visible inside. Two small tendril-arms extending from its sides, tiny legs below. Single glowing orange eye above the mouth.',
    },
    'cinder_wretch': {
        quality: 'high',
        subject: 'A mid-size humanoid elemental made entirely of cracked obsidian chunks held together by intense orange-red lava light breaking through every seam. Hunched stance, massive stone fists, two glowing orange pinpoints for eyes, smoke curling from the shoulders.',
    },
    'boss-consumer': {
        quality: 'high',
        subject: 'A colossal demonic maw boss creature, dominating the frame. Huge circular jagged-toothed mouth taking up most of its body, the throat inside glowing with bright molten orange-yellow lava. Surrounded by cracked obsidian-black flesh and jagged rib-like bone protrusions. Massive clawed tendril-arms splayed outward, tiny legs below the body. Eyes like burning embers. Imposing and predatory.',
    },
    'the-consumer': {
        quality: 'high',
        subject: 'The Consumer — an apex demonic devourer boss. Massive humanoid torso fused with a gaping ringed mouth in its center that glows with molten lava. Long clawed arms, spiked obsidian shoulders, a crown of horns. Smoke pours from cracks all over its body. Utterly menacing, center-framed, lit from within by lava glow.',
    },
    'demon-king': {
        quality: 'high',
        subject: 'The Demon King — regal armored demon monarch in ornate spiked obsidian plate armor with glowing orange-red lava runes etched into the steel. Massive horned helm, crimson cape. In one gauntleted hand a long burning flame-sword. Kingly stance, one fist clenched, glowing eyes beneath the helm. Imposing boss silhouette.',
    },
    'necromancer-enemy': {
        quality: 'high',
        subject: 'A demonic necromancer wearing dark tattered robes over charred skeletal frame. Cracked obsidian-black skin showing through torn robe sleeves, faint orange lava glow. Hood low over the face, only two glowing red points visible. Bony clawed hands holding a bleached skull that glows faintly orange from within. Smoke wisps rise from the shoulders.',
    },
    'necro-sprite': {
        quality: 'high',
        subject: 'A floating demonic soul-wisp conjured by a necromancer. Small spectral skull-and-spine form wreathed in swirling orange-red ember flames. Hollow glowing eye sockets, pale cracked bone, tendrils of dark smoke trailing behind as it floats.',
    },
};

async function main() {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) { console.error('ERROR: set REPLICATE_API_TOKEN'); process.exit(1); }

    const name = process.argv[2];
    if (!name || !ENEMIES[name]) {
        console.error('Usage: node gen-velthara-enemy.js <name>');
        console.error('Known names:', Object.keys(ENEMIES).join(', '));
        process.exit(1);
    }
    const enemy = ENEMIES[name];

    fs.mkdirSync(RAW_DIR, { recursive: true });

    const replicate = new Replicate({ auth: token });
    const prompt = `${STYLE}\n\nSubject: ${enemy.subject}`;

    const input = {
        prompt,
        aspect_ratio: '1:1',
        quality: enemy.quality,
        number_of_images: 1,
        output_format: 'png',
        background: 'opaque',
        moderation: 'auto',
    };

    if (fs.existsSync(REF_IMAGE)) {
        const buf = fs.readFileSync(REF_IMAGE);
        input.input_images = [`data:image/png;base64,${buf.toString('base64')}`];
        console.log(`Style reference: ${REF_IMAGE}`);
    }

    console.log(`Generating "${name}" (quality: ${enemy.quality}) via gpt-image-2...`);
    const output = await replicate.run('openai/gpt-image-2', { input });
    const urls = Array.isArray(output) ? output : [output];
    const u = urls[0];
    const url = typeof u === 'string' ? u : (u.url ? u.url() : u);
    const res = await fetch(url);
    const buf = Buffer.from(await res.arrayBuffer());

    const rawPath = path.join(RAW_DIR, `${name}.png`);
    fs.writeFileSync(rawPath, buf);
    console.log(`Saved raw: ${rawPath} (${(buf.length / 1024).toFixed(1)} KB)`);
    console.log(`Next: run strip-bg-enemies.js to background-strip and move to enemies/${name}.png`);
}

main().catch((err) => { console.error('Generation failed:', err); process.exit(1); });
