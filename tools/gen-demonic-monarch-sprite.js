#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const POWERSHELL_CMD = process.platform === 'win32' ? 'powershell.exe' : 'powershell';

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

const OUT_FILE = path.resolve(__dirname, '..', 'games-server', 'public', 'veltharas-dominion', 'characters', 'demonic-monarch-lv1.png');
const RAW_FILE = path.resolve(__dirname, '..', 'games-server', 'public', 'veltharas-dominion', 'characters', '_raw', 'demonic-monarch-lv1.png');
const REF_IMAGE = path.resolve(__dirname, '..', 'games-server', 'public', 'veltharas-dominion', 'characters', 'shadow-monarch-lv21.png');

const PROMPT = `
A single game-ready 2D hero sprite for Velthara's Dominion.
Subject: Demonic Monarch, an original dark fantasy ruler inspired by power-fantasy shadow-army heroes, not a copy of any existing character.
Silhouette: tall armored monarch, horned crown, tattered royal cloak, one raised command hand, crimson-black demonic aura, glowing red eyes, sharp readable shape.
Style: painterly action-RPG browser-game sprite, high contrast, crisp edges, chunky readable details, dramatic but clean.
Composition: full body centered, facing slightly toward camera in top-down 3/4 perspective, enough padding for game UI cropping.
Background: flat neutral cream-colored studio background, not transparent.
No text, no watermark, no logos, no border, no signature.
`.trim().replace(/\s+/g, ' ');

async function main() {
    const token = getReplicateToken();
    if (!token) {
        throw new Error('Set REPLICATE_API_TOKEN before running this generator.');
    }

    const replicate = new Replicate({ auth: token });
    const input = {
        prompt: PROMPT,
        aspect_ratio: '1:1',
        quality: 'high',
        number_of_images: 1,
        output_format: 'png',
        background: 'opaque',
        moderation: 'auto',
    };

    if (fs.existsSync(REF_IMAGE)) {
        const buf = fs.readFileSync(REF_IMAGE);
        input.input_images = [`data:image/png;base64,${buf.toString('base64')}`];
    }

    const output = await replicate.run('openai/gpt-image-2', { input });
    const url = Array.isArray(output)
        ? (typeof output[0] === 'string' ? output[0] : output[0].url())
        : output;
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    fs.mkdirSync(path.dirname(RAW_FILE), { recursive: true });
    fs.writeFileSync(RAW_FILE, buf);

    const { removeBackground } = globalRequire('@imgly/background-removal-node');
    const bgRemovalRoot = getGlobalPackageRoot('@imgly/background-removal-node').replace(/\\/g, '/');
    const blob = new Blob([buf], { type: 'image/png' });
    const stripped = await removeBackground(blob, {
        publicPath: `file:///${bgRemovalRoot}/dist/`,
        output: { format: 'image/png', quality: 1 },
    });
    const outBuf = Buffer.from(await stripped.arrayBuffer());

    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(OUT_FILE, outBuf);
    console.log(`Saved ${OUT_FILE}`);
    console.log(`Raw source saved ${RAW_FILE}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
