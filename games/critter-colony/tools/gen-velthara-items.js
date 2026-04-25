#!/usr/bin/env node
/**
 * Generate Veltharas Dominion inventory item icons + stat-panel icons.
 * Two 3x3 sprite-sheet calls (one per group), sliced into individual 1024/3 PNGs.
 *
 * Usage: REPLICATE_API_TOKEN=r8_... node gen-velthara-items.js
 */
const fs = require('fs');
const path = require('path');
const Replicate = require('replicate');
const sharp = require('sharp');

const BASE = path.resolve(__dirname, '..', '..', '..', 'games-server', 'public', 'veltharas-dominion');
const OUT_ITEMS = path.join(BASE, 'items');
const OUT_STATS = path.join(BASE, 'stat-icons');

const SHARED_STYLE = `
Game UI item-icon set, Path-of-Exile / Diablo-style. Each cell is one square
icon centered in its cell, framed with a small dark inner border. Style:
heavy painterly detail, dramatic chiaroscuro lighting, top-down or 3/4
view, slight wear and grime, gritty dark-fantasy palette. Each icon sits
on a flat dark slate-grey background with a subtle vignette so the subject
pops. NO numbers, NO labels, NO text, NO watermarks, NO grid lines between
cells. Clean small gap of background between cells.
`.trim().replace(/\s+/g, ' ');

const ITEMS_GRID = {
    cols: 3, rows: 3, aspect: '1:1',
    out: OUT_ITEMS,
    names: ['rusty_sword', 'cracked_lens', 'worn_gloves', 'tattered_boots', 'bent_coin', 'smudged_tome', 'frayed_talisman', 'multiplier', 'filler'],
    prompt: `${SHARED_STYLE}
Single image with a 3-column by 3-row grid of 9 individual item icons.
Read left-to-right, top-to-bottom:
- Cell 1: a rusty pitted iron sword, jagged edge, leather-wrapped grip,
  blade dotted with rust spots and old dried blood — "Rusty Sword".
- Cell 2: a cracked round magnifying lens in a tarnished brass frame,
  visible spider-web crack across the glass — "Cracked Lens".
- Cell 3: a pair of worn leather gloves with frayed cuffs and exposed
  knuckle stitching — "Worn Gloves".
- Cell 4: a battered pair of leather boots, scuffed and muddy, mismatched
  laces, soles peeling slightly — "Tattered Boots".
- Cell 5: a single bent gold coin, clearly warped and tarnished, with
  faded engraving on its face — "Bent Coin".
- Cell 6: a smudged old leather-bound spell tome, smoke or soot stains on
  the cover, gold filigree partially scratched off — "Smudged Tome".
- Cell 7: a frayed talisman: small bone pendant on a knotted cord,
  glowing faintly with a sickly green inner light — "Frayed Talisman".
- Cell 8: a glowing rune symbol shaped like a four-pointed star or sword
  cross, suspended midair, embers radiating outward — "Multiplier".
- Cell 9: an empty placeholder with just the dark slate background.
Each icon clearly distinct and instantly recognizable as a game inventory
item. Same scale and framing across all 9 cells.`.trim().replace(/\s+/g, ' '),
};

const STATS_GRID = {
    cols: 3, rows: 3, aspect: '1:1',
    out: OUT_STATS,
    names: ['damage', 'attack_speed', 'move_speed', 'crit', 'mage_power', 'fortune', 'max_hp', 'slashes', 'regen'],
    prompt: `${SHARED_STYLE}
Single image with a 3-column by 3-row grid of 9 stylized STAT-INDICATOR
icons (small, simple, symbolic — like RPG HUD glyphs, not full items).
Each is a single bold emblem on the dark slate background, glowing faintly
in a stat-appropriate color. Read left-to-right, top-to-bottom:
- Cell 1: crossed swords emblem in red — "Damage".
- Cell 2: lightning bolt emblem in yellow — "Attack Speed".
- Cell 3: winged boot emblem in cyan — "Move Speed".
- Cell 4: bullseye target emblem in orange — "Crit Chance".
- Cell 5: stylized flame above an open book emblem in deep orange — "Mage Power".
- Cell 6: gold coin with a shimmering star emblem in gold — "Fortune".
- Cell 7: red heart emblem with a small upward arrow — "Max HP".
- Cell 8: four-pointed slash-mark emblem in white-orange — "Slashes / Multiplier".
- Cell 9: green cross-plus medical emblem — "Regen".
Bold, readable at small sizes. No text, no numbers.`.trim().replace(/\s+/g, ' '),
};

async function generateGrid(replicate, grid, label) {
    fs.mkdirSync(grid.out, { recursive: true });
    console.log(`[${label}] generating ${grid.cols}x${grid.rows} grid...`);
    const output = await replicate.run('openai/gpt-image-2', {
        input: {
            prompt: grid.prompt,
            aspect_ratio: grid.aspect,
            quality: 'high',
            number_of_images: 1,
            output_format: 'png',
            background: 'opaque',
            moderation: 'auto',
        },
    });
    const urls = Array.isArray(output) ? output : [output];
    const u = urls[0];
    const url = typeof u === 'string' ? u : (u.url ? u.url() : u);
    const res = await fetch(url);
    const buf = Buffer.from(await res.arrayBuffer());

    fs.writeFileSync(path.join(grid.out, 'sheet-raw.png'), buf);
    const meta = await sharp(buf).metadata();
    const cellW = Math.floor(meta.width / grid.cols);
    const cellH = Math.floor(meta.height / grid.rows);
    console.log(`[${label}] sheet ${meta.width}x${meta.height}, cells ${cellW}x${cellH}`);

    for (let i = 0; i < grid.cols * grid.rows && i < grid.names.length; i++) {
        const col = i % grid.cols;
        const row = Math.floor(i / grid.cols);
        const name = grid.names[i];
        await sharp(buf).extract({ left: col * cellW, top: row * cellH, width: cellW, height: cellH })
            .toFile(path.join(grid.out, `${name}.png`));
        console.log(`  ${name}.png`);
    }
}

async function main() {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) { console.error('set REPLICATE_API_TOKEN'); process.exit(1); }
    const replicate = new Replicate({ auth: token });
    await generateGrid(replicate, ITEMS_GRID, 'items');
    await generateGrid(replicate, STATS_GRID, 'stats');
    console.log('\nDone. Background-strip not needed — slate background reads as opaque card.');
}

main().catch((e) => { console.error(e); process.exit(1); });
