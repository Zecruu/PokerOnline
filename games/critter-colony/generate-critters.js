// Generate critter sprites via Gemini API
// Run: node generate-critters.js

const fs = require('fs');
const path = require('path');

const API_KEY = 'AIzaSyCGZQG32r1_DzhGaAt1qcUQhJBC20Bl0QQ';
const OUTPUT_DIR = path.join(__dirname, 'images', 'critters');

const CRITTERS = [
    {
        name: 'thornback',
        prompt: 'A cute fantasy hedgehog creature with thorny green spikes on its back, round body, small legs, big dark eyes, forest creature, game sprite style, solid colored background, front-facing, chibi proportions, vibrant colors, clean lines, digital art'
    },
    {
        name: 'emberfox',
        prompt: 'A cute fantasy fox creature with flames on its tail and ears, orange-red fur, glowing ember eyes, small and round body, game sprite style, solid colored background, front-facing, chibi proportions, vibrant warm colors, clean digital art'
    },
    {
        name: 'crystalhorn',
        prompt: 'A cute fantasy beetle creature with a large crystal horn on its head, shiny blue-purple crystalline shell, small round body, big eyes, gem-like appearance, game sprite style, solid colored background, front-facing, chibi proportions, clean digital art'
    },
    {
        name: 'stormwing',
        prompt: 'A cute fantasy electric bird creature with lightning bolt shaped wings, bright yellow and blue feathers, crackling electricity around it, small round body, big eyes, game sprite style, solid colored background, front-facing, chibi proportions, vibrant colors, clean digital art'
    },
    {
        name: 'ironshell',
        prompt: 'A cute fantasy armored turtle creature with heavy iron plated shell, dark metallic grey body, glowing orange eyes, sturdy and round, game sprite style, solid colored background, front-facing, chibi proportions, clean digital art'
    },
    {
        name: 'venomaw',
        prompt: 'A cute fantasy poison frog creature with bright purple and green toxic patterns, large mouth, round body, dripping venom drops, dangerous but adorable, game sprite style, solid colored background, front-facing, chibi proportions, clean digital art'
    },
    {
        name: 'shadowfang',
        prompt: 'A fearsome fantasy dark wolf creature with glowing red eyes, shadowy dark purple-black fur, sharp fangs, wispy shadow aura around it, larger and more menacing, game sprite style, solid colored background, front-facing, semi-chibi, clean digital art, legendary creature'
    },
    {
        name: 'celestine',
        prompt: 'A majestic fantasy celestial deer creature with glowing golden antlers, ethereal white-blue body, floating star particles around it, divine radiant aura, large and elegant, game sprite style, solid colored background, front-facing, semi-chibi, clean digital art, legendary creature'
    },
];

async function generateImage(critter) {
    console.log(`Generating ${critter.name}...`);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${API_KEY}`;

    const body = {
        contents: [{
            parts: [{ text: `Generate an image: ${critter.prompt}` }]
        }],
        generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error(`  Error for ${critter.name}:`, data.error?.message || response.status);
            return false;
        }

        // Find image part in response
        const candidates = data.candidates || [];
        for (const candidate of candidates) {
            const parts = candidate.content?.parts || [];
            for (const part of parts) {
                if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
                    const buffer = Buffer.from(part.inlineData.data, 'base64');
                    const ext = part.inlineData.mimeType === 'image/png' ? 'png' : 'png';
                    const outPath = path.join(OUTPUT_DIR, `${critter.name}.${ext}`);
                    fs.writeFileSync(outPath, buffer);
                    console.log(`  Saved ${outPath} (${(buffer.length / 1024).toFixed(0)}KB)`);
                    return true;
                }
            }
        }

        console.error(`  No image in response for ${critter.name}`);
        console.log('  Response:', JSON.stringify(data).substring(0, 500));
        return false;
    } catch (e) {
        console.error(`  Fetch error for ${critter.name}:`, e.message);
        return false;
    }
}

async function main() {
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    let success = 0, fail = 0;
    for (const critter of CRITTERS) {
        const ok = await generateImage(critter);
        if (ok) success++;
        else fail++;
        // Rate limit delay
        await new Promise(r => setTimeout(r, 2000));
    }
    console.log(`\nDone: ${success} generated, ${fail} failed`);
}

main();
