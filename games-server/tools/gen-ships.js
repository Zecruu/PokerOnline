#!/usr/bin/env node
/**
 * Generate the 5 Tactical Waters ship sprites via gpt-image-2.
 *
 * Each ship is generated separately (different naval classes — no shared animation),
 * but all share style anchors so the fleet feels cohesive.
 *
 * Output: games-server/public/battleship/ships/<id>.png  (PURE WHITE background)
 * Post:   run `node strip-bg-ships.js` to convert white → alpha.
 *
 * Usage: REPLICATE_API_TOKEN=r8_... node gen-ships.js
 *        or  node gen-ships.js carrier            (single ship)
 *        or  node gen-ships.js carrier battleship (a few)
 */
const fs = require('fs');
const path = require('path');
const Replicate = require('replicate');

const OUT_DIR = path.resolve(__dirname, '..', 'public', 'battleship', 'ships');

// Shared style block — appended to every per-ship prompt for fleet consistency.
const STYLE = `
Render style: top-down aerial photographic realism with painterly polish. Cool naval-gray
hull palette with subtle weathering streaks. Crisp edges, readable silhouette, moderate
deck-level detail (turrets, masts, markings) visible. Subtle bow wave and stern wake in
soft white foam.

Background MUST be pure flat white #FFFFFF — completely solid, no shadow, no gradient,
no texture, no border (this image will be alpha-keyed in post-processing, so the
background MUST be uniform white and the ship MUST NOT cast any shadow onto it).

Composition: ship centered in canvas, bow (front) pointing to the RIGHT side of the
image, stern pointing LEFT. Ship occupies roughly 85% of the canvas width with a
small margin of pure white on all sides.

NO text. NO numbers. NO labels. NO logos. NO watermarks. NO borders. NO frames.
`.trim().replace(/\s+/g, ' ');

const SHIPS = {
    carrier: {
        size: 5,
        name: 'Aircraft Carrier',
        prompt: `
A modern Nimitz-class US aircraft carrier viewed from directly above (top-down aerial
shot), bow pointing right. Long flat flight deck dominates the silhouette, with a clearly
visible angled landing strip painted with yellow centerline stripes and white aircraft
markings. Catapult tracks run forward along the deck. The island superstructure is on the
starboard side (visually the top of the image), bristling with radar arrays, antennas,
and the bridge tower. Several parked carrier-based jets dot the deck. Hull is cool naval
gray; deck is slightly darker non-skid gray.
`.trim(),
    },
    battleship: {
        size: 4,
        name: 'Battleship',
        prompt: `
A modern Iowa-class battleship viewed from directly above (top-down aerial shot), bow
pointing right. Three massive triple 16-inch main gun turrets are the unmistakable
feature — two clustered forward of the superstructure, one aft. Tall command tower and
two stacks sit amidships, surrounded by 5-inch dual gun mounts and anti-aircraft
positions along the sides. Hull is cool naval gray with darker non-skid deck surfaces.
Heavy, armored, broad-beamed silhouette.
`.trim(),
    },
    cruiser: {
        size: 3,
        name: 'Guided Missile Cruiser',
        prompt: `
A Ticonderoga-class guided missile cruiser viewed from directly above (top-down aerial
shot), bow pointing right. Sharp forward bow with a 5-inch deck gun, followed by a
grid of vertical launch system (VLS) missile cells visible as a dense pattern of square
hatches on the deck. The boxy superstructure amidships features the four flat octagonal
SPY-1 phased-array radar panels on its sides. A small helipad and hangar at the stern,
with another aft 5-inch gun. Cool naval gray hull.
`.trim(),
    },
    submarine: {
        size: 3,
        name: 'Attack Submarine',
        prompt: `
A surfaced Virginia-class nuclear attack submarine viewed from directly above (top-down
aerial shot), bow pointing right. Smooth, dark-gray cigar-shaped hull with a rounded
bullet bow and tapered stern. The black sail (conning tower) sits about a third of the
way back from the bow, with periscope and antenna masts extending upward. The deck is
smooth and featureless — no exposed weapons, no turrets. A faint bow wave breaks white
around the bow, with a long V-shaped wake trailing behind the stern. Hull is much darker
than the surface ships — almost slate gray.
`.trim(),
    },
    destroyer: {
        size: 2,
        name: 'Destroyer',
        prompt: `
An Arleigh Burke-class guided missile destroyer viewed from directly above (top-down
aerial shot), bow pointing right. Sleek, sharp clipper bow with a single forward 5-inch
deck gun followed by a forward block of VLS missile cells. The angular superstructure is
compact, featuring the flat octagonal SPY-1 phased-array radar panels on its sides, and
twin angled funnels. Aft VLS block and a small helipad at the stern. Cool naval gray
hull with a tight, fast silhouette — narrower and shorter than a cruiser.
`.trim(),
    },
};

async function generate(replicate, id, spec) {
    const fullPrompt = `${spec.prompt} ${STYLE}`.replace(/\s+/g, ' ').trim();

    const input = {
        prompt: fullPrompt,
        aspect_ratio: '3:2',     // long horizontal ship in landscape canvas
        quality: 'high',
        number_of_images: 1,
        output_format: 'png',
        background: 'opaque',
        moderation: 'auto',
    };

    console.log(`\n[${id}] generating ${spec.name} (${spec.size}-cell)...`);
    const t0 = Date.now();
    const output = await replicate.run('openai/gpt-image-2', { input });
    const urls = Array.isArray(output) ? output : [output];
    const url = typeof urls[0] === 'string' ? urls[0] : urls[0].url();
    const res = await fetch(url);
    const buf = Buffer.from(await res.arrayBuffer());

    fs.mkdirSync(OUT_DIR, { recursive: true });
    const outPath = path.join(OUT_DIR, `${id}.png`);
    fs.writeFileSync(outPath, buf);
    console.log(`  [${id}] saved ${outPath} (${(buf.length / 1024).toFixed(1)} KB, ${((Date.now() - t0)/1000).toFixed(1)}s)`);
}

async function main() {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) { console.error('ERROR: set REPLICATE_API_TOKEN'); process.exit(1); }

    const args = process.argv.slice(2);
    const ids = args.length ? args : Object.keys(SHIPS);
    for (const id of ids) {
        if (!SHIPS[id]) { console.warn(`unknown ship: ${id} — skipping`); continue; }
    }

    const replicate = new Replicate({ auth: token });
    for (const id of ids) {
        if (!SHIPS[id]) continue;
        try {
            await generate(replicate, id, SHIPS[id]);
        } catch (e) {
            console.error(`  [${id}] FAILED: ${e.message}`);
        }
    }

    console.log(`\nAll done. Next: node strip-bg-ships.js  (converts white background → alpha)`);
}

main().catch(e => { console.error(e); process.exit(1); });
