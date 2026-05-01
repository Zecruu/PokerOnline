from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT_DIRS = [
    ROOT / "games-server" / "public" / "veltharas-dominion" / "characters",
    ROOT / "s3-upload" / "veltharas-dominion" / "characters",
]
PREVIEW_DIR = ROOT / "games-server" / "public" / "veltharas-dominion" / "characters" / "previews"


def px(draw, xy, fill):
    x0, y0, x1, y1 = xy
    draw.rectangle((x0, y0, x1, y1), fill=fill)


def polygon(draw, points, fill, outline=None):
    draw.polygon(points, fill=fill)
    if outline:
        draw.line(points + [points[0]], fill=outline, width=1, joint="curve")


def draw_anchor(frame=0):
    logical = 128
    img = Image.new("RGBA", (logical, logical), (0, 0, 0, 0))
    cycle = [0, -1, -1, -2, -1, 0, 1, 1, 0, 0]
    bob = cycle[frame % len(cycle)]
    wing = [0, -1, -1, -2, -1, 0, 1, 1, 0, 0][frame % 10]
    halo = [-1, -1, -2, -2, -1, 0, 0, -1, -1, -1][frame % 10]
    cloth_sway = [0, 0, 1, 1, 1, 0, -1, -1, -1, 0][frame % 10]
    glow_alpha = [64, 70, 78, 84, 78, 70, 62, 58, 60, 64][frame % 10]

    # Soft gold rim glow, separated from the body so the sprite still reads on dark menus.
    glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((48, 8 + halo, 80, 19 + halo), outline=(255, 231, 124, 180), width=3)
    gd.polygon([(23, 48 + wing), (4, 25 + wing), (33, 35 + wing), (47, 68 + wing), (28, 66 + wing)], fill=(255, 240, 179, glow_alpha))
    gd.polygon([(105, 48 + wing), (124, 25 + wing), (95, 35 + wing), (81, 68 + wing), (100, 66 + wing)], fill=(255, 240, 179, glow_alpha))
    gd.rectangle((52, 32 + bob, 76, 95 + bob), fill=(255, 220, 105, 42))
    glow = glow.filter(ImageFilter.GaussianBlur(4))
    img.alpha_composite(glow)

    d = ImageDraw.Draw(img)

    dark = (29, 33, 49, 255)
    steel = (178, 195, 210, 255)
    steel_hi = (241, 250, 255, 255)
    steel_mid = (126, 149, 171, 255)
    blue_shadow = (57, 75, 112, 255)
    gold = (236, 181, 67, 255)
    gold_hi = (255, 231, 124, 255)
    cloth = (62, 96, 176, 255)
    cloth_dark = (34, 53, 108, 255)
    wing_color = (240, 246, 250, 245)
    wing_shadow = (181, 199, 217, 235)
    outline = (20, 24, 36, 255)

    # Wings: chunky silhouette with feather rows.
    polygon(d, [(42, 40 + wing), (28, 25 + wing), (9, 26 + wing), (23, 43 + wing), (4, 48 + wing), (27, 56 + wing), (13, 66 + wing), (39, 65 + wing), (50, 78 + wing), (52, 57 + wing)], wing_color, outline)
    polygon(d, [(86, 40 + wing), (100, 25 + wing), (119, 26 + wing), (105, 43 + wing), (124, 48 + wing), (101, 56 + wing), (115, 66 + wing), (89, 65 + wing), (78, 78 + wing), (76, 57 + wing)], wing_color, outline)
    for x, y in [(28, 34), (22, 43), (30, 53), (24, 61), (100, 34), (106, 43), (98, 53), (104, 61)]:
        d.line((64, 58 + bob, x, y + wing), fill=wing_shadow, width=2)
    d.line((42, 42 + wing, 32, 29 + wing, 18, 29 + wing), fill=steel_hi, width=2)
    d.line((86, 42 + wing, 96, 29 + wing, 110, 29 + wing), fill=steel_hi, width=2)

    # Halo.
    d.ellipse((48, 8 + halo, 80, 19 + halo), outline=gold_hi, width=3)
    d.ellipse((53, 11 + halo, 75, 17 + halo), outline=(255, 248, 178, 190), width=1)

    # Sword behind the body.
    px(d, (61, 24 + bob, 66, 92 + bob), (222, 235, 245, 255))
    px(d, (63, 19 + bob, 64, 28 + bob), steel_hi)
    polygon(d, [(57, 94 + bob), (70, 94 + bob), (67, 101 + bob), (60, 101 + bob)], gold, outline)
    px(d, (53, 86 + bob, 75, 91 + bob), gold)
    px(d, (53, 90 + bob, 75, 93 + bob), outline)

    # Cape and tabard.
    polygon(d, [(47, 55 + bob), (81, 55 + bob), (86 + cloth_sway, 100), (72 + cloth_sway, 116), (64, 106), (56 + cloth_sway, 116), (42 + cloth_sway, 100)], cloth, outline)
    polygon(d, [(56, 60 + bob), (72, 60 + bob), (75 + cloth_sway, 96), (64, 108), (53 + cloth_sway, 96)], (232, 236, 226, 255), outline)
    px(d, (61, 63 + bob, 66, 96), gold)
    px(d, (58, 75 + bob, 69, 80 + bob), gold_hi)
    polygon(d, [(47, 73 + bob), (42 + cloth_sway, 100), (56 + cloth_sway, 116), (60, 88 + bob)], cloth_dark)
    polygon(d, [(81, 73 + bob), (86 + cloth_sway, 100), (72 + cloth_sway, 116), (68, 88 + bob)], cloth_dark)

    # Legs and boots.
    px(d, (51, 94, 60, 111), steel_mid)
    px(d, (68, 94, 77, 111), steel_mid)
    px(d, (47, 109, 61, 117), outline)
    px(d, (67, 109, 81, 117), outline)
    px(d, (51, 107, 60, 112), steel)
    px(d, (68, 107, 77, 112), steel)

    # Torso armor.
    polygon(d, [(44, 45 + bob), (55, 33 + bob), (73, 33 + bob), (84, 45 + bob), (79, 72 + bob), (49, 72 + bob)], steel, outline)
    polygon(d, [(50, 47 + bob), (59, 38 + bob), (64, 47 + bob), (69, 38 + bob), (78, 47 + bob), (73, 66 + bob), (55, 66 + bob)], steel_hi, None)
    polygon(d, [(44, 45 + bob), (55, 33 + bob), (64, 47 + bob), (49, 72 + bob)], blue_shadow)
    px(d, (48, 70 + bob, 80, 76 + bob), gold)
    px(d, (51, 72 + bob, 77, 78 + bob), outline)
    px(d, (56, 50 + bob, 72, 55 + bob), gold)

    # Pauldrons and arms.
    polygon(d, [(40, 46 + bob), (27, 53 + bob), (32, 65 + bob), (48, 60 + bob)], steel_hi, outline)
    polygon(d, [(88, 46 + bob), (101, 53 + bob), (96, 65 + bob), (80, 60 + bob)], steel_hi, outline)
    px(d, (28, 63 + bob, 38, 83 + bob), steel_mid)
    px(d, (90, 63 + bob, 100, 83 + bob), steel_mid)
    px(d, (26, 79 + bob, 39, 88 + bob), gold)
    px(d, (89, 79 + bob, 102, 88 + bob), gold)

    # Shield on left arm.
    polygon(d, [(24, 66 + bob), (12, 73 + bob), (15, 95 + bob), (28, 107 + bob), (41, 95 + bob), (44, 73 + bob)], (235, 241, 245, 255), outline)
    polygon(d, [(24, 71 + bob), (18, 76 + bob), (20, 92 + bob), (28, 100 + bob), (36, 92 + bob), (38, 76 + bob)], (94, 128, 203, 255), None)
    px(d, (26, 70 + bob, 30, 100 + bob), gold)
    px(d, (18, 83 + bob, 38, 87 + bob), gold_hi)

    # Head and helm.
    px(d, (53, 25 + bob, 75, 39 + bob), (216, 176, 128, 255))
    polygon(d, [(48, 29 + bob), (55, 17 + bob), (73, 17 + bob), (80, 29 + bob), (74, 38 + bob), (54, 38 + bob)], steel_hi, outline)
    polygon(d, [(55, 17 + bob), (64, 8 + bob), (73, 17 + bob)], gold_hi, outline)
    px(d, (56, 30 + bob, 61, 33 + bob), dark)
    px(d, (67, 30 + bob, 72, 33 + bob), dark)
    px(d, (62, 34 + bob, 66, 36 + bob), (145, 95, 83, 255))
    px(d, (51, 39 + bob, 77, 44 + bob), gold)
    px(d, (61, 17 + bob, 67, 38 + bob), (205, 222, 235, 255))

    # Top-left highlights and outline cleanup.
    d.line((48, 30 + bob, 56, 17 + bob, 65, 10 + bob), fill=(255, 255, 255, 180), width=1)
    d.line((31, 54 + bob, 42, 48 + bob), fill=(255, 255, 255, 150), width=1)
    d.line((96, 54 + bob, 87, 48 + bob), fill=(255, 255, 255, 115), width=1)

    # Small foot anchor pixels help alignment in future animation sheets.
    px(d, (57, 117, 70, 119), (15, 17, 26, 210))

    return img.resize((256, 256), Image.Resampling.NEAREST)


def make_idle_sheet(frames):
    sheet = Image.new("RGBA", (256 * 5, 256 * 2), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        x = (i % 5) * 256
        y = (i // 5) * 256
        sheet.alpha_composite(frame, (x, y))
    return sheet


def make_contact_sheet(frames):
    bg = Image.new("RGBA", (256 * 5, 256 * 2), (31, 35, 50, 255))
    checker = Image.new("RGBA", bg.size, (0, 0, 0, 0))
    cd = ImageDraw.Draw(checker)
    for y in range(0, bg.height, 16):
        for x in range(0, bg.width, 16):
            if (x // 16 + y // 16) % 2 == 0:
                cd.rectangle((x, y, x + 15, y + 15), fill=(42, 47, 66, 255))
    bg.alpha_composite(checker)
    for i, frame in enumerate(frames):
        x = (i % 5) * 256
        y = (i // 5) * 256
        bg.alpha_composite(frame, (x, y))
    return bg


def main():
    out = draw_anchor(0)
    frames = [draw_anchor(i) for i in range(10)]
    idle_sheet = make_idle_sheet(frames)
    contact_sheet = make_contact_sheet(frames)
    gif_frames = [frame.convert("P", palette=Image.Palette.ADAPTIVE, colors=255) for frame in frames]

    for out_dir in OUT_DIRS:
        out_dir.mkdir(parents=True, exist_ok=True)
        out.save(out_dir / "angelic-knight-select.png")
        idle_sheet.save(out_dir / "angelic-knight-idle-s.png")

    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    contact_sheet.save(PREVIEW_DIR / "angelic-knight-idle-s-contact.png")
    gif_frames[0].save(
        PREVIEW_DIR / "angelic-knight-idle-s-preview.gif",
        save_all=True,
        append_images=gif_frames[1:],
        duration=120,
        loop=0,
        transparency=0,
        disposal=2,
    )


if __name__ == "__main__":
    main()
