/**
 * Kingdom Conquest — Pre-generate card pool with art
 * Run: node games/kingdom-conquest/card-gen/generate-pool.js
 *
 * Generates card text via Gemini text API, then art via Gemini image API.
 * Saves card data as JSON + images to disk.
 * Upload images to S3 separately.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const KEY = process.env.GEMINI_KEY || 'YOUR_KEY_HERE';
const OUT_DIR = path.join(__dirname, '..', 'images', 'cards');
const POOL_FILE = path.join(__dirname, 'card-pool.json');
fs.mkdirSync(OUT_DIR, { recursive: true });

const RARITY_POWER = { common: 1, uncommon: 1.5, rare: 2.2, legendary: 3.5 };
const AGE_TAGS = ['Dark Ages', 'Feudal Era', 'Crusade Age', 'Renaissance', 'Imperial Dominion'];

// Card definitions to generate
const CARD_TEMPLATES = [
    // UNITS — Common
    { type: 'unit', rarity: 'common', age: 1, hint: 'peasant militia with pitchforks' },
    { type: 'unit', rarity: 'common', age: 1, hint: 'village watchman with spear' },
    { type: 'unit', rarity: 'common', age: 1, hint: 'mounted scout on a horse' },
    { type: 'unit', rarity: 'common', age: 1, hint: 'archer with a longbow' },
    { type: 'unit', rarity: 'common', age: 1, hint: 'shield bearer with wooden shield' },
    // UNITS — Uncommon
    { type: 'unit', rarity: 'uncommon', age: 2, hint: 'armored knight on horseback' },
    { type: 'unit', rarity: 'uncommon', age: 2, hint: 'crossbow squad in formation' },
    { type: 'unit', rarity: 'uncommon', age: 2, hint: 'war monk with mace' },
    { type: 'unit', rarity: 'uncommon', age: 2, hint: 'siege engineer with battering ram' },
    // UNITS — Rare
    { type: 'unit', rarity: 'rare', age: 3, hint: 'holy crusader paladin in shining armor' },
    { type: 'unit', rarity: 'rare', age: 3, hint: 'dragon rider soaring through storm' },
    { type: 'unit', rarity: 'rare', age: 3, hint: 'elite royal guard with golden armor' },
    // UNITS — Legendary
    { type: 'unit', rarity: 'legendary', age: 5, hint: 'ancient lich king on a bone throne' },
    { type: 'unit', rarity: 'legendary', age: 5, hint: 'divine archangel with flaming sword' },

    // SPELLS
    { type: 'spell', rarity: 'common', age: 1, hint: 'flaming arrows raining from sky' },
    { type: 'spell', rarity: 'uncommon', age: 2, hint: 'lightning bolt striking castle wall' },
    { type: 'spell', rarity: 'rare', age: 3, hint: 'holy smite divine beam from heaven' },
    { type: 'spell', rarity: 'legendary', age: 5, hint: 'apocalyptic meteor shower destroying fortress' },

    // EVENTS
    { type: 'event', rarity: 'common', age: 1, hint: 'bountiful harvest moon over fields' },
    { type: 'event', rarity: 'common', age: 1, hint: 'traveling merchant caravan' },
    { type: 'event', rarity: 'uncommon', age: 2, hint: 'plague rats in medieval city' },
    { type: 'event', rarity: 'rare', age: 3, hint: 'solar eclipse omen' },

    // RELICS
    { type: 'relic', rarity: 'uncommon', age: 2, hint: 'ancient crown of the first king' },
    { type: 'relic', rarity: 'rare', age: 3, hint: 'holy grail glowing with divine light' },
    { type: 'relic', rarity: 'legendary', age: 5, hint: 'dragon tooth amulet wreathed in fire' },

    // BUILDINGS
    { type: 'building', rarity: 'common', age: 1, hint: 'mystical well in village square' },
    { type: 'building', rarity: 'uncommon', age: 2, hint: 'enchanted watchtower on hill' },
    { type: 'building', rarity: 'rare', age: 3, hint: 'ancient library of forbidden knowledge' },
];

function geminiText(prompt) {
    return new Promise((resolve) => {
        const body = JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.9 }
        });
        const url = new URL(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${KEY}`);
        const req = https.request({ hostname: url.hostname, path: url.pathname + url.search, method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
            let data = ''; res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    const d = JSON.parse(data);
                    if (d.error) { resolve(null); return; }
                    const text = d.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
                    resolve(JSON.parse(text));
                } catch (e) { resolve(null); }
            });
        });
        req.on('error', () => resolve(null));
        req.write(body); req.end();
    });
}

function geminiImage(prompt, filePath) {
    return new Promise((resolve) => {
        const body = JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseModalities: ['IMAGE', 'TEXT'] }
        });
        const url = new URL(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${KEY}`);
        const req = https.request({ hostname: url.hostname, path: url.pathname + url.search, method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
            let data = ''; res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    const d = JSON.parse(data);
                    if (d.error) { console.log('  IMG FAIL:', d.error.message.split('.')[0]); resolve(false); return; }
                    for (const p of d.candidates[0].content.parts) {
                        if (p.inlineData) {
                            fs.writeFileSync(filePath, Buffer.from(p.inlineData.data, 'base64'));
                            resolve(true); return;
                        }
                    }
                    resolve(false);
                } catch (e) { resolve(false); }
            });
        });
        req.on('error', () => resolve(false));
        req.write(body); req.end();
    });
}

async function generateCard(template, index) {
    const { type, rarity, age, hint } = template;
    const power = RARITY_POWER[rarity];
    const ageName = AGE_TAGS[age - 1];

    let statsPrompt = '';
    if (type === 'unit') statsPrompt = `"atk": number (${Math.floor(10*power)}-${Math.floor(35*power)}), "def": number (${Math.floor(8*power)}-${Math.floor(25*power)}), "speed": number (1-5), "upkeepFood": number (2-8)`;
    else if (type === 'spell') statsPrompt = `"wallDamage": number (20-${Math.floor(80*power)}), "atkBonus": number (0-${Math.floor(30*power)})`;
    else if (type === 'event') statsPrompt = `"effectValue": number (10-${Math.floor(40*power)}), "durationTicks": number (3-10), "targetResource": one of "gold","food","wood","stone","faith","manpower", "isPositive": boolean`;
    else if (type === 'relic') statsPrompt = `"passiveBonus": "string like +15% gold income"`;
    else if (type === 'building') statsPrompt = `"primaryResource": one of "gold","food","wood","stone","faith","manpower", "outputPerTick": number (${Math.floor(50*power)}-${Math.floor(200*power)})`;

    const textPrompt = `Generate a ${rarity} ${type} card for a medieval conquest game. Theme: ${hint}. Set in ${ageName}.
RETURN ONLY VALID JSON:
{
  "name": "2-4 word medieval name",
  "lore": "exactly 2 sentences of dark poetic flavor",
  "stats": { ${statsPrompt} }
}`;

    console.log(`[${index}] Generating ${rarity} ${type}: ${hint}...`);

    // Generate text
    const cardData = await geminiText(textPrompt);
    if (!cardData) {
        console.log(`  TEXT FAIL — skipping`);
        return null;
    }
    console.log(`  Name: ${cardData.name}`);

    // Generate art
    const artPrompt = `Medieval fantasy card art, dark oil painting style, dramatic lighting, detailed illustration, ${hint}, ${ageName} era, no text, no borders, portrait orientation, white background`;
    const imgPath = path.join(OUT_DIR, `card-${index}.png`);
    const imgOk = await geminiImage(artPrompt, imgPath);
    console.log(`  Art: ${imgOk ? 'OK' : 'FAIL'}`);

    return {
        id: `pool_${index}`,
        cardType: type,
        rarity,
        age,
        name: cardData.name,
        lore: cardData.lore || '',
        stats: cardData.stats || {},
        imageFile: imgOk ? `card-${index}.png` : null,
        hint,
    };
}

async function main() {
    console.log(`Generating ${CARD_TEMPLATES.length} cards...\n`);
    const pool = [];

    for (let i = 0; i < CARD_TEMPLATES.length; i++) {
        const card = await generateCard(CARD_TEMPLATES[i], i);
        if (card) pool.push(card);
        await new Promise(r => setTimeout(r, 3000)); // rate limit
    }

    fs.writeFileSync(POOL_FILE, JSON.stringify(pool, null, 2));
    console.log(`\nDone! ${pool.length}/${CARD_TEMPLATES.length} cards generated.`);
    console.log(`Pool saved to: ${POOL_FILE}`);
    console.log(`Images saved to: ${OUT_DIR}`);
}

main();
