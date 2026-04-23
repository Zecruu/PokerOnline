#!/usr/bin/env node
/**
 * Batch-run gen-velthara-enemy.js for every enemy except the anchor (basic).
 * Runs generations in parallel (Replicate handles concurrency server-side).
 *
 * Usage: REPLICATE_API_TOKEN=r8_... node batch-velthara-enemies.js
 */
const { spawn } = require('child_process');
const path = require('path');

const SCRIPT = path.join(__dirname, 'gen-velthara-enemy.js');

// Everything except 'basic' which is already done.
const NAMES = [
    'swarm', 'runner', 'tank', 'bomber', 'splitter', 'sticky', 'poison', 'ice',
    'goblin', 'mini', 'mini-consumer', 'cinder_wretch', 'necro-sprite',
    'boss-consumer', 'the-consumer', 'demon-king', 'necromancer-enemy',
];

function runOne(name) {
    return new Promise((resolve) => {
        const t0 = Date.now();
        const child = spawn('node', [SCRIPT, name], {
            env: process.env,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stderr = '';
        child.stderr.on('data', (b) => { stderr += b.toString(); });
        child.stdout.on('data', () => {}); // suppress per-child log spam
        child.on('close', (code) => {
            const secs = ((Date.now() - t0) / 1000).toFixed(1);
            if (code === 0) {
                console.log(`  ✓ ${name.padEnd(20)}  ${secs}s`);
            } else {
                console.log(`  ✗ ${name.padEnd(20)}  FAILED (${secs}s)`);
                if (stderr) console.log(`     ${stderr.trim().split('\n').slice(-2).join(' | ')}`);
            }
            resolve({ name, code, secs });
        });
    });
}

async function main() {
    if (!process.env.REPLICATE_API_TOKEN) { console.error('set REPLICATE_API_TOKEN'); process.exit(1); }
    console.log(`Launching ${NAMES.length} parallel generations...\n`);
    const t0 = Date.now();
    const results = await Promise.all(NAMES.map(runOne));
    const fails = results.filter(r => r.code !== 0);
    const totalSecs = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`\nDone in ${totalSecs}s. ${results.length - fails.length}/${results.length} succeeded.`);
    if (fails.length) {
        console.log('Failed:', fails.map(f => f.name).join(', '));
        process.exit(1);
    }
}

main().catch((e) => { console.error(e); process.exit(1); });
