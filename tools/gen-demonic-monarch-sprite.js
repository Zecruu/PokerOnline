#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const POWERSHELL_CMD = process.platform === 'win32' ? 'powershell.exe' : 'powershell';
const CHAR_DIR = path.resolve(__dirname, '..', 'games-server', 'public', 'veltharas-dominion', 'characters');
const RAW_DIR = path.join(CHAR_DIR, '_raw');

function getGlobalNpmRoot() {
    if (process.platform === 'win32') {
        return execFileSync('cmd.exe', ['/d', '/s', '/c', 'npm root -g'], { encoding: 'utf8' }).trim();
    }
    return execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
}

function globalRequire(packageName) {
    try {
        return require(packageName);
    } catch (error) {
        return require(path.join(getGlobalNpmRoot(), packageName));
    }
}

function getReplicateToken() {
    if (process.env.REPLICATE_API_TOKEN) return process.env.REPLICATE_API_TOKEN;
    if (process.platform !== 'win32') return '';
    return execFileSync(POWERSHELL_CMD, [
        '-NoProfile',
        '-Command',
        "[Environment]::GetEnvironmentVariable('REPLICATE_API_TOKEN','User')"
    ], { encoding: 'utf8' }).trim();
}

function getGlobalPackageRoot(packageName) {
    return path.join(getGlobalNpmRoot(), packageName);
}

const Replicate = globalRequire('replicate');

const LEVELS = {
    1: {
        file: 'demonic-monarch-lv1.png',
        prompt: 'early ascended demon monarch, tall black armor, horned crown, tattered royal cloak, one raised command hand, crimson-black aura, glowing red eyes, sharp readable silhouette'
    },
    6: {
        file: 'demonic-monarch-lv6.png',
        prompt: 'stronger demon monarch evolution, heavier blackened armor, larger horned crown, wider crimson cloak, purple-black demonic slash energy curling from one hand, more regal and dangerous than level 1'
    },
    11: {
        file: 'demonic-monarch-lv11.png',
        prompt: 'mid evolution demon monarch warlord, ornate obsidian armor with crimson runes, spiked pauldrons, shadow wings hinted by torn cloak, twin red eye glow, commanding abyssal aura'
    },
    16: {
        file: 'demonic-monarch-lv16.png',
        prompt: 'late evolution demonic emperor, massive jagged crown, layered infernal plate armor, long shredded cape like black fire, purple-black decay magic orbiting the body, imposing raid-boss silhouette'
    },
    21: {
        file: 'demonic-monarch-lv21.png',
        prompt: 'final form true demonic monarch, supreme abyss king, towering ornate horned crown, majestic black and crimson armor, vast cloak of living shadow flame, red jewels and glowing eyes, ultimate readable boss-hero silhouette'
    }
};

function buildPrompt(level) {
    return `
A single game-ready 2D hero sprite for Velthara's Dominion.
Subject: Demonic Monarch level ${level}, an original dark fantasy ruler inspired by power-fantasy shadow-army heroes, not a copy of any existing character.
Evolution details: ${LEVELS[level].prompt}.
Style: painterly action-RPG browser-game sprite, high contrast, crisp edges, chunky readable details, dramatic but clean, matching the existing Velthara's Dominion character sprite style.
Composition: full body centered, facing slightly toward camera in top-down 3/4 perspective, enough padding for game UI cropping, same scale and pose language as the reference image.
Background: flat neutral cream-colored studio background, not transparent.
No text, no watermark, no logos, no border, no signature.
`.trim().replace(/\s+/g, ' ');
}

function encodeImage(file) {
    const buf = fs.readFileSync(file);
    return `data:image/png;base64,${buf.toString('base64')}`;
}

async function generateLevel(replicate, removeBackground, bgRemovalRoot, level) {
    const outFile = path.join(CHAR_DIR, LEVELS[level].file);
    const rawFile = path.join(RAW_DIR, LEVELS[level].file);
    const refs = [];
    const level1 = path.join(CHAR_DIR, LEVELS[1].file);
    const level1Raw = path.join(RAW_DIR, LEVELS[1].file);
    const shadowRef = path.join(CHAR_DIR, 'shadow-monarch-lv21.png');

    if (level !== 1 && fs.existsSync(level1)) refs.push(encodeImage(level1));
    if (level !== 1 && fs.existsSync(level1Raw)) refs.push(encodeImage(level1Raw));
    if (fs.existsSync(shadowRef)) refs.push(encodeImage(shadowRef));

    const input = {
        prompt: buildPrompt(level),
        aspect_ratio: '1:1',
        quality: 'high',
        number_of_images: 1,
        output_format: 'png',
        background: 'opaque',
        moderation: 'auto',
    };
    if (refs.length) input.input_images = refs.slice(0, 3);

    console.log(`Generating level ${level}...`);
    const output = await replicate.run('openai/gpt-image-2', { input });
    const url = Array.isArray(output)
        ? (typeof output[0] === 'string' ? output[0] : output[0].url())
        : output;
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());

    fs.mkdirSync(path.dirname(rawFile), { recursive: true });
    fs.writeFileSync(rawFile, buf);

    const blob = new Blob([buf], { type: 'image/png' });
    const stripped = await removeBackground(blob, {
        publicPath: `file:///${bgRemovalRoot}/dist/`,
        output: { format: 'image/png', quality: 1 },
    });
    const outBuf = Buffer.from(await stripped.arrayBuffer());

    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, outBuf);
    console.log(`Saved ${outFile}`);
    console.log(`Raw source saved ${rawFile}`);
}

async function main() {
    const token = getReplicateToken();
    if (!token) throw new Error('Set REPLICATE_API_TOKEN before running this generator.');

    const requested = process.argv.slice(2);
    const levels = requested.length
        ? requested.map(Number).filter(level => LEVELS[level])
        : Object.keys(LEVELS).map(Number);
    if (!levels.length) throw new Error(`No valid levels requested. Valid levels: ${Object.keys(LEVELS).join(', ')}`);

    const replicate = new Replicate({ auth: token });
    const { removeBackground } = globalRequire('@imgly/background-removal-node');
    const bgRemovalRoot = getGlobalPackageRoot('@imgly/background-removal-node').replace(/\\/g, '/');

    for (const level of levels) {
        await generateLevel(replicate, removeBackground, bgRemovalRoot, level);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
