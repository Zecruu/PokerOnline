const fs = require('fs');
const https = require('https');
const path = require('path');

const API_KEY = 'YOUR_GOOGLE_API_KEY_HERE';
const MODEL = 'gemini-2.5-flash-image';
const OUT_DIR = path.join(__dirname, 'images', 'tiles');
const BASE_STYLE = 'Generate a pixel art image: flat front-facing square card illustration, straight-on view, no angle, dark moody palette, no text, no letters, rich detailed background, board game tile style,';

const TILES = {
  'police': 'police station, red and blue lights on roof, barred windows, patrol cars parked outside, gritty urban feel',
  'underground': 'shady underground market entrance, amber lanterns, shadowy alleyway, crates and contraband, neon signs flickering, smoke wisps',
  'capital-tower': 'towering glass skyscraper with gold trim, stock ticker on facade, luxury cars below, rooftop garden, red accent color',
  'exchange-plaza': 'grand stock exchange building, neoclassical columns, bull statue in front, traders rushing, digital stock boards, red accent',
  'prestige-centre': 'luxury shopping center, glass atrium roof, designer store fronts, red carpet entrance, valet parking, chandeliers inside, red accent',
  'financial-row': 'row of bank buildings on a prestigious street, marble facades, brass doors, armored trucks, security guards, red accent',
  'skyline-drive': 'modern mid-rise apartment with city skyline view, rooftop pool, balconies with plants, warm coral accent, sunset sky in windows',
  'commerce-street': 'busy commercial street with shops, cafe awnings, delivery trucks, neon open signs, pedestrians, warm salmon accent',
  'midrise-avenue': 'mid-rise office building, modern architecture, glass and steel, small plaza with benches, food cart outside, coral accent',
  'business-lane': 'cozy business district lane, small offices, briefcase-carrying workers, brick buildings, warm lighting, coral accent',
  'grand-marina': 'luxury marina with yachts docked, waterfront restaurant, palm trees, blue water, dock lights, nautical flags, deep blue accent',
  'oceanfront-hotel': 'grand beachfront hotel, infinity pool, cabanas, ocean waves, towering palm trees, lit balconies at night, deep blue accent',
  'sunset-boardwalk': 'wooden boardwalk along the beach, carnival lights, ferris wheel in background, ice cream stands, sunset sky, deep blue accent',
  'palm-boulevard': 'palm-tree-lined boulevard, luxury condos on both sides, convertible cars, beach visible at end of road, blue accent',
  'harbour-view': 'harbor with fishing boats, lighthouse in distance, seagulls, cozy waterfront houses, lobster traps, light blue accent',
  'beachside-retreat': 'small beach cottage resort, hammocks between palm trees, surfboards leaning on wall, tiki torches, light blue accent',
  'coastal-commons': 'coastal community center, outdoor market stalls, fish vendor, benches overlooking sea, seashell decorations, light blue accent',
  'sandy-shores': 'modest beach bungalow, sand dunes, beach grass, driftwood fence, clothesline with towels, quiet beach vibes, light blue accent',
  'uptown-flats': 'trendy urban loft apartments, exposed brick, fire escapes, rooftop party lights, street art on walls, green accent',
  'central-market': 'bustling indoor market hall, fruit stalls, flower vendors, hanging lights, arched glass ceiling, shoppers with bags, green accent',
  'riverside-complex': 'apartment complex along a river, small bridge, willow trees, kayaks on water, balconies with lights, green accent',
  'metro-commons': 'metro station entrance with apartments above, subway sign, commuters, bike racks, urban trees in planters, green accent',
  'greenway-apts': 'affordable green apartment buildings, community garden in courtyard, laundry on balconies, playground nearby, mint green accent',
  'junction-square': 'small town square with a fountain, park benches, pigeons, corner shops, old clock post, mint green accent',
  'park-place': 'townhouse next to a city park, wrought iron fence, big oak tree, dog walker, park bench, mint green accent',
  'cross-street': 'quiet residential crossroads, stop sign, corner store, mailbox, picket fence, modest row houses, mint green accent',
  'maple-grove': 'suburban house with big maple tree, white picket fence, tire swing, mailbox, autumn leaves on lawn, yellow accent',
  'elmwood-estate': 'modest suburban estate, two-car garage, basketball hoop, elm trees lining driveway, sprinkler on lawn, yellow accent',
  'birchwood-lane': 'quiet suburban lane, birch trees, ranch-style houses, kids bikes on sidewalk, garden gnome, yellow accent',
  'cedar-heights': 'hillside suburban home, cedar wood siding, wrap-around porch, rocking chair, mountain view, yellow accent',
  'oak-park': 'small cottage near an oak grove, old wooden fence, bird feeder, vegetable garden, rural path, gold amber accent',
  'willow-creek': 'tiny cabin by a creek with willow trees, stepping stones across water, fishing rod leaning on porch, gold amber accent',
  'pine-ridge': 'log cabin on a pine-covered ridge, wood pile outside, smoke from chimney, dirt road, pine trees, gold amber accent',
  'meadow-view': 'small farmhouse overlooking a meadow, wildflowers, wooden fence, barn in background, windmill, gold amber accent',
  'taxi': 'taxi depot, yellow taxis lined up, dispatch booth, fare meter sign, checkered pattern on ground, urban setting',
  'tax': 'government tax office, grey brutalist building, long queue of people outside, stacks of papers visible through window',
  'bank': 'bank building, vault door visible, marble pillars, gold coin decorations, security camera, armored truck',
  'momentum': 'glowing magical portal, swirling purple and cyan energy, lightning sparks, arrows pointing forward and backward, mysterious aura',
  'cartel': 'shadowy back alley, dumpster, flickering neon sign, mysterious figure in trench coat, playing cards scattered on ground',
  'lucky': 'lucky charm scene, golden horseshoe, four-leaf clovers, pot of gold, rainbow shimmer, sparkles, bright green glow',
  'unlucky': 'unlucky cursed scene, broken mirror, black cat, cracked ground, red warning glow, storm clouds above, lightning bolt',
  'free-roam': 'open road stretching to horizon, freedom vibes, wind blowing leaves, park bench, relaxing atmosphere, soft white glow',
};

function generateTile(name, desc) {
  return new Promise((resolve) => {
    const filePath = path.join(OUT_DIR, `${name}.png`);
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1000) {
      console.log(`  SKIP ${name} (already exists)`);
      return resolve(true);
    }

    const prompt = `${BASE_STYLE} ${desc}`;
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] }
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
    const parsed = new URL(url);

    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const d = JSON.parse(data);
          if (d.error) {
            console.log(`  FAIL ${name}: ${d.error.message.split('.')[0]}`);
            return resolve(false);
          }
          const parts = d.candidates[0].content.parts;
          for (const p of parts) {
            if (p.inlineData) {
              const buf = Buffer.from(p.inlineData.data, 'base64');
              fs.writeFileSync(filePath, buf);
              console.log(`  OK   ${name} (${(buf.length/1024).toFixed(0)}KB)`);
              return resolve(true);
            }
          }
          console.log(`  FAIL ${name}: no image in response`);
          resolve(false);
        } catch(e) {
          console.log(`  FAIL ${name}: ${e.message}`);
          resolve(false);
        }
      });
    });
    req.on('error', e => { console.log(`  FAIL ${name}: ${e.message}`); resolve(false); });
    req.write(body);
    req.end();
  });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const entries = Object.entries(TILES);
  console.log(`Generating ${entries.length} tiles...\n`);

  let ok = 0, fail = 0;
  for (const [name, desc] of entries) {
    const success = await generateTile(name, desc);
    if (success) ok++; else fail++;
    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\nDone: ${ok} ok, ${fail} failed out of ${entries.length}`);
}

main();
