"""
RealtyRush Tile Art Generator — Google Antigravity / Gemini API
Run this in Google's Antigravity IDE to generate all tile images.

Prerequisites:
  pip install google-genai Pillow

Usage:
  python generate-tiles.py
  # Images saved to ./generated-tiles/
"""

import os
from google import genai
from google.genai import types
from PIL import Image
from io import BytesIO

# ─── CONFIG ─────────────────────────────────────────────────
OUTPUT_DIR = "./generated-tiles"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Initialize client (uses GOOGLE_API_KEY env var or set explicitly)
client = genai.Client()

# Base style applied to every prompt
BASE_STYLE = (
    "Pixel art flat front-facing square card illustration, "
    "straight-on view, no angle, no tilt, dark moody palette, "
    "no text, no letters, no words, rich detailed background matching the scene, "
    "128x128 board game tile"
)

# ─── TILE DEFINITIONS ──────────────────────────────────────
# (filename, description)
TILES = {
    # ═══ CORNERS ═══
    "hq": "grand corporate headquarters building, gold and teal accents, marble lobby visible, helipad on roof, fountains in front",
    "cityhall": "ornate city hall building, purple and gold dome, stone columns, clock tower, government flags, grand staircase",
    "police": "police station, red and blue lights on roof, barred windows, patrol cars parked outside, wanted posters, gritty urban feel",
    "underground": "shady underground market entrance, amber lanterns, shadowy alleyway, crates and contraband, neon signs flickering, smoke wisps",

    # ═══ FINANCIAL DISTRICT (A1) ═══
    "capital-tower": "towering glass skyscraper with gold trim, stock ticker on facade, luxury cars below, rooftop garden, red accent color",
    "exchange-plaza": "grand stock exchange building, neoclassical columns, bull statue in front, traders rushing, digital stock boards, red accent",
    "prestige-centre": "luxury shopping center, glass atrium roof, designer store fronts, red carpet entrance, valet parking, chandeliers inside, red accent",
    "financial-row": "row of bank buildings on a prestigious street, marble facades, brass doors, armored trucks, security guards, red accent",

    # ═══ COMMERCE ROW (A2) ═══
    "skyline-drive": "modern mid-rise apartment with city skyline view, rooftop pool, balconies with plants, warm coral accent, sunset sky in windows",
    "commerce-street": "busy commercial street with shops, cafe awnings, delivery trucks, neon open signs, pedestrians, warm salmon accent",
    "midrise-avenue": "mid-rise office building, modern architecture, glass and steel, small plaza with benches, food cart outside, coral accent",
    "business-lane": "cozy business district lane, small offices, briefcase-carrying workers, brick buildings, warm lighting, coral accent",

    # ═══ OCEANFRONT (B1) ═══
    "grand-marina": "luxury marina with yachts docked, waterfront restaurant, palm trees, blue water, dock lights, nautical flags, deep blue accent",
    "oceanfront-hotel": "grand beachfront hotel, infinity pool, cabanas, ocean waves, towering palm trees, lit balconies at night, deep blue accent",
    "sunset-boardwalk": "wooden boardwalk along the beach, carnival lights, ferris wheel in background, ice cream stands, sunset sky, deep blue accent",
    "palm-boulevard": "palm-tree-lined boulevard, luxury condos on both sides, convertible cars, beach visible at end of road, blue accent",

    # ═══ COASTAL (B2) ═══
    "harbour-view": "harbor with fishing boats, lighthouse in distance, seagulls, cozy waterfront houses, lobster traps, light blue accent",
    "beachside-retreat": "small beach cottage resort, hammocks between palm trees, surfboards leaning on wall, tiki torches, light blue accent",
    "coastal-commons": "coastal community center, outdoor market stalls, fish vendor, benches overlooking sea, seashell decorations, light blue accent",
    "sandy-shores": "modest beach bungalow, sand dunes, beach grass, driftwood fence, clothesline with towels, quiet beach vibes, light blue accent",

    # ═══ UPTOWN (C1) ═══
    "uptown-flats": "trendy urban loft apartments, exposed brick, fire escapes, rooftop party lights, street art on walls, green accent",
    "central-market": "bustling indoor market hall, fruit stalls, flower vendors, hanging lights, arched glass ceiling, shoppers with bags, green accent",
    "riverside-complex": "apartment complex along a river, small bridge, willow trees, kayaks on water, balconies with lights, green accent",
    "metro-commons": "metro station entrance with apartments above, subway sign, commuters, bike racks, urban trees in planters, green accent",

    # ═══ GREENWAY (C2) ═══
    "greenway-apts": "affordable green apartment buildings, community garden in courtyard, laundry on balconies, playground nearby, mint green accent",
    "junction-square": "small town square with a fountain, park benches, pigeons, corner shops, old clock post, mint green accent",
    "park-place": "townhouse next to a city park, wrought iron fence, big oak tree, dog walker, park bench, mint green accent",
    "cross-street": "quiet residential crossroads, stop sign, corner store, mailbox, picket fence, modest row houses, mint green accent",

    # ═══ OAKWOOD (D1) ═══
    "maple-grove": "suburban house with big maple tree, white picket fence, tire swing, mailbox, autumn leaves on lawn, yellow accent",
    "elmwood-estate": "modest suburban estate, two-car garage, basketball hoop, elm trees lining driveway, sprinkler on lawn, yellow accent",
    "birchwood-lane": "quiet suburban lane, birch trees, ranch-style houses, kids bikes on sidewalk, garden gnome, yellow accent",
    "cedar-heights": "hillside suburban home, cedar wood siding, wrap-around porch, rocking chair, mountain view, yellow accent",

    # ═══ PINEWOOD (D2) ═══
    "oak-park": "small cottage near an oak grove, old wooden fence, bird feeder, vegetable garden, rural path, gold amber accent",
    "willow-creek": "tiny cabin by a creek with willow trees, stepping stones across water, fishing rod leaning on porch, gold amber accent",
    "pine-ridge": "log cabin on a pine-covered ridge, wood pile outside, smoke from chimney, dirt road, pine trees, gold amber accent",
    "meadow-view": "small farmhouse overlooking a meadow, wildflowers, wooden fence, barn in background, windmill, gold amber accent",

    # ═══ SPECIAL TILES ═══
    "taxi": "taxi depot, yellow taxis lined up, dispatch booth, fare meter sign, checkered pattern on ground, urban setting",
    "tax": "government tax office, grey brutalist building, long queue of people outside, stacks of papers visible through window",
    "bank": "bank building, vault door visible, marble pillars, gold coin decorations, security camera, armored truck",
    "momentum": "glowing magical portal, swirling purple and cyan energy, lightning sparks, arrows pointing forward and backward, mysterious aura",
    "cartel": "shadowy back alley, dumpster, flickering neon sign, mysterious figure in trench coat, playing cards scattered on ground",
    "lucky": "lucky charm scene, golden horseshoe, four-leaf clovers, pot of gold, rainbow shimmer, sparkles, bright green glow",
    "unlucky": "unlucky cursed scene, broken mirror, black cat, cracked ground, red warning glow, storm clouds above, lightning bolt",
    "free-roam": "open road stretching to horizon, freedom vibes, wind blowing leaves, park bench, relaxing atmosphere, soft white glow",
}

# Map filenames to tile indices for cdn-assets.js output
TILE_INDEX_MAP = {
    "hq": "corner_hq",
    "cityhall": "corner_cityhall",
    "police": "corner_police",
    "underground": "corner_underground",
    "capital-tower": "tile_1",
    "exchange-plaza": "tile_2",
    "prestige-centre": "tile_4",
    "financial-row": "tile_5",
    "skyline-drive": "tile_7",
    "commerce-street": "tile_8",
    "midrise-avenue": "tile_10",
    "business-lane": "tile_12",
    "grand-marina": "tile_15",
    "oceanfront-hotel": "tile_16",
    "sunset-boardwalk": "tile_18",
    "palm-boulevard": "tile_19",
    "harbour-view": "tile_21",
    "beachside-retreat": "tile_22",
    "coastal-commons": "tile_24",
    "sandy-shores": "tile_25",
    "uptown-flats": "tile_29",
    "central-market": "tile_30",
    "riverside-complex": "tile_32",
    "metro-commons": "tile_33",
    "greenway-apts": "tile_35",
    "junction-square": "tile_36",
    "park-place": "tile_38",
    "cross-street": "tile_39",
    "maple-grove": "tile_43",
    "elmwood-estate": "tile_44",
    "birchwood-lane": "tile_46",
    "cedar-heights": "tile_47",
    "oak-park": "tile_49",
    "willow-creek": "tile_50",
    "pine-ridge": "tile_52",
    "meadow-view": "tile_53",
    # Special tiles (shared across multiple board positions)
    "taxi": "special_taxi",
    "tax": "special_tax",
    "bank": "special_bank",
    "momentum": "special_momentum",
    "cartel": "special_cartel",
    "lucky": "special_lucky",
    "unlucky": "special_unlucky",
    "free-roam": "special_free",
}


def generate_tile(name, description):
    """Generate a single tile image using Gemini."""
    prompt = f"{BASE_STYLE}, {description}"
    print(f"  Generating: {name}...")

    try:
        response = client.models.generate_images(
            model="imagen-3.0-generate-002",
            prompt=prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio="1:1",
            ),
        )

        if response.generated_images:
            img_bytes = response.generated_images[0].image.image_bytes
            img = Image.open(BytesIO(img_bytes))
            path = os.path.join(OUTPUT_DIR, f"{name}.png")
            img.save(path)
            print(f"  ✓ Saved: {path}")
            return True
        else:
            print(f"  ✗ No image generated for {name}")
            if hasattr(response, 'filtered_reason'):
                print(f"    Reason: {response.filtered_reason}")
            return False
    except Exception as e:
        print(f"  ✗ Error generating {name}: {e}")
        return False


def generate_all():
    """Generate all tile images."""
    print(f"Generating {len(TILES)} tile images...\n")

    success = 0
    failed = []

    for name, desc in TILES.items():
        if generate_tile(name, desc):
            success += 1
        else:
            failed.append(name)

    print(f"\n{'='*50}")
    print(f"Done! {success}/{len(TILES)} tiles generated.")
    if failed:
        print(f"Failed: {', '.join(failed)}")

    # Print cdn-assets.js snippet
    print(f"\n{'='*50}")
    print("Copy this into TILE_ASSETS in cdn-assets.js:\n")
    print("const TILE_ASSETS = {")
    for name in TILES:
        key = TILE_INDEX_MAP.get(name, name)
        print(f"    {key}: 'tiles/{name}.png',")
    print("};")


def generate_single(name):
    """Generate a single tile by name."""
    if name not in TILES:
        print(f"Unknown tile: {name}")
        print(f"Available: {', '.join(TILES.keys())}")
        return
    generate_tile(name, TILES[name])


# ─── MAIN ───────────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        # Generate specific tile(s)
        for name in sys.argv[1:]:
            generate_single(name)
    else:
        # Generate all
        generate_all()
