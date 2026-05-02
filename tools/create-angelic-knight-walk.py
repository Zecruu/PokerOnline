from pathlib import Path
import math

from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
CHAR_DIR = ROOT / "games-server" / "public" / "veltharas-dominion" / "characters"
S3_DIR = ROOT / "s3-upload" / "veltharas-dominion" / "characters"
PREVIEW_DIR = CHAR_DIR / "previews"
FRAME_SIZE = 256
FRAME_COUNT = 10
COLUMNS = 5


def alpha_bbox(img):
    return img.getchannel("A").getbbox()


def crop_layer(img, box):
    return img.crop(box)


def paste_centered(dst, layer, cx, foot_y):
    box = alpha_bbox(layer)
    if not box:
        return
    cropped = crop_layer(layer, box)
    x = round(cx - cropped.width / 2)
    y = round(foot_y - cropped.height)
    dst.alpha_composite(cropped, (x, y))


def transform_region(base, box, dx=0, dy=0, shear=0.0):
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    region = base.crop(box)
    if shear:
        w, h = region.size
        region = region.transform(
            (w + abs(int(shear * h)) + 4, h),
            Image.Transform.AFFINE,
            (1, shear, 0 if shear < 0 else -shear * h, 0, 1, 0),
            resample=Image.Resampling.BICUBIC,
        )
    layer.alpha_composite(region, (box[0] + dx, box[1] + dy))
    return layer


def make_frame(anchor, i):
    phase = math.sin(i / FRAME_COUNT * math.pi * 2)
    phase2 = math.sin(i / FRAME_COUNT * math.pi * 4)
    bob = round(-3 * abs(phase))
    sway = round(3 * phase)
    leg = round(7 * phase)
    arm = round(5 * phase)
    wing = round(2 * phase)

    frame = Image.new("RGBA", anchor.size, (0, 0, 0, 0))

    shadow = Image.new("RGBA", anchor.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.ellipse((82, 221, 174, 239), fill=(0, 0, 0, 58))
    shadow = shadow.filter(ImageFilter.GaussianBlur(5))
    frame.alpha_composite(shadow)

    # Split the anchor into broad body bands. This keeps the generated walk
    # loop deterministic while adding readable step, cape, shield, and wing motion.
    wings = transform_region(anchor, (0, 0, 256, 154), dx=sway, dy=bob + wing, shear=phase * 0.015)
    legs_l = transform_region(anchor, (86, 166, 128, 238), dx=-leg, dy=abs(leg) // 3, shear=-phase * 0.05)
    legs_r = transform_region(anchor, (128, 166, 170, 238), dx=leg, dy=abs(leg) // 3, shear=phase * 0.05)
    cape = transform_region(anchor, (76, 112, 180, 238), dx=sway, dy=bob, shear=phase * 0.035)
    torso = transform_region(anchor, (62, 34, 194, 184), dx=sway // 2, dy=bob, shear=phase2 * 0.01)
    shield = transform_region(anchor, (20, 116, 94, 222), dx=-arm, dy=bob + abs(arm) // 3, shear=-phase * 0.02)
    sword = transform_region(anchor, (102, 34, 152, 210), dx=sway // 2, dy=bob, shear=phase * 0.01)
    head = transform_region(anchor, (86, 0, 170, 92), dx=sway // 2, dy=bob + round(phase2), shear=0)

    for layer in (wings, sword, cape, legs_l, legs_r, torso, shield, head):
        frame.alpha_composite(layer)

    # Motion glints and foot sparks give the walk a readable runtime state at
    # small display sizes without becoming an attack effect.
    fx = Image.new("RGBA", anchor.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(fx)
    sparkle_x = 102 if phase > 0 else 154
    sparkle_y = 219 - abs(leg) // 2
    d.line((sparkle_x - 7, sparkle_y, sparkle_x + 7, sparkle_y), fill=(255, 238, 160, 130), width=2)
    d.line((sparkle_x, sparkle_y - 5, sparkle_x, sparkle_y + 5), fill=(255, 255, 255, 115), width=1)
    if abs(phase) > 0.72:
        d.arc((70, 202, 186, 246), 200 if phase > 0 else 20, 260 if phase > 0 else 80, fill=(255, 242, 174, 75), width=2)
    frame.alpha_composite(fx)

    # Re-align alpha content to a stable center and foot baseline.
    out = Image.new("RGBA", anchor.size, (0, 0, 0, 0))
    paste_centered(out, frame, FRAME_SIZE / 2, 238)
    return out


def make_sheet(frames):
    sheet = Image.new("RGBA", (FRAME_SIZE * COLUMNS, FRAME_SIZE * 2), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        sheet.alpha_composite(frame, ((i % COLUMNS) * FRAME_SIZE, (i // COLUMNS) * FRAME_SIZE))
    return sheet


def make_contact(frames):
    bg = Image.new("RGBA", (FRAME_SIZE * COLUMNS, FRAME_SIZE * 2), (31, 35, 50, 255))
    d = ImageDraw.Draw(bg)
    for y in range(0, bg.height, 16):
        for x in range(0, bg.width, 16):
            if (x // 16 + y // 16) % 2 == 0:
                d.rectangle((x, y, x + 15, y + 15), fill=(42, 47, 66, 255))
    for i, frame in enumerate(frames):
        bg.alpha_composite(frame, ((i % COLUMNS) * FRAME_SIZE, (i // COLUMNS) * FRAME_SIZE))
    return bg


def main():
    anchor = Image.open(CHAR_DIR / "angelic-knight-select.png").convert("RGBA")
    frames = [make_frame(anchor, i) for i in range(FRAME_COUNT)]
    sheet = make_sheet(frames)
    contact = make_contact(frames)
    gif_frames = [frame.convert("P", palette=Image.Palette.ADAPTIVE, colors=255) for frame in frames]

    for out_dir in (CHAR_DIR, S3_DIR):
        out_dir.mkdir(parents=True, exist_ok=True)
        sheet.save(out_dir / "angelic-knight-walk-s.png")

    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    contact.save(PREVIEW_DIR / "angelic-knight-walk-s-contact.png")
    gif_frames[0].save(
        PREVIEW_DIR / "angelic-knight-walk-s-preview.gif",
        save_all=True,
        append_images=gif_frames[1:],
        duration=90,
        loop=0,
        transparency=0,
        disposal=2,
    )

    print("wrote angelic-knight-walk-s.png")


if __name__ == "__main__":
    main()
