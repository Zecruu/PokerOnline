from __future__ import annotations

from pathlib import Path
from math import sin, cos, pi

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_ENEMIES = ROOT / "games-server" / "public" / "veltharas-dominion" / "enemies"
UPLOAD_ENEMIES = ROOT / "s3-upload" / "veltharas-dominion" / "enemies"
PREVIEW_DIR = PUBLIC_ENEMIES / "previews"

FRAME = 64
FRAMES = 6

BONE = (224, 218, 192, 255)
BONE_SHADE = (151, 145, 124, 255)
EYE = (110, 222, 255, 255)
OUTLINE = (30, 31, 37, 235)
METAL = (170, 184, 192, 255)
METAL_DARK = (72, 82, 91, 255)


def line(draw: ImageDraw.ImageDraw, points, fill, width=2):
    draw.line(points, fill=fill, width=width, joint="curve")


def ellipse(draw: ImageDraw.ImageDraw, cx, cy, rx, ry, fill, outline=OUTLINE, width=2):
    draw.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=fill, outline=outline, width=width)


def polygon(draw: ImageDraw.ImageDraw, points, fill, outline=OUTLINE):
    draw.polygon(points, fill=fill)
    draw.line(points + [points[0]], fill=outline, width=2)


def draw_skeleton(draw: ImageDraw.ImageDraw, frame: int, action: str):
    phase = frame / FRAMES
    bob = sin(phase * pi * 2) * 2
    stride = sin(phase * pi * 2)
    squash = abs(stride)
    cx = 32
    ground = 55
    hip_y = 39 + bob * 0.35
    rib_y = 28 + bob
    head_y = 16 + bob

    arm_swing = stride * 4
    leg_swing = stride * 5
    sword_raise = 0
    slash = 0
    collapse = 0

    if action == "attack":
        attack_curve = sin(min(1, phase * 1.15) * pi)
        wind = -8 if frame <= 1 else 0
        slash = 12 * attack_curve
        sword_raise = wind + slash
        arm_swing *= 0.25
        leg_swing *= 0.15
    elif action == "death":
        collapse = frame / (FRAMES - 1)
        head_y += collapse * 17
        rib_y += collapse * 14
        hip_y += collapse * 12
        cx += sin(collapse * pi) * 5
        arm_swing = 8 - collapse * 18
        leg_swing = 4 - collapse * 14

    # Soft contact shadow.
    draw.ellipse((18, ground - 3, 46, ground + 2), fill=(0, 0, 0, 45))

    if action == "death" and frame >= 4:
        # Final collapsed bone pile keeps the death readable at small size.
        line(draw, [(19, 48), (32, 51), (45, 47)], BONE_SHADE, 4)
        line(draw, [(22, 54), (39, 53)], BONE, 3)
        ellipse(draw, 36, 45, 7, 5, BONE)
        draw.rectangle((33, 44, 35, 46), fill=OUTLINE)
        draw.rectangle((39, 43, 41, 45), fill=OUTLINE)
        return

    # Legs.
    left_knee = (cx - 5 - leg_swing * 0.25, hip_y + 8)
    right_knee = (cx + 5 + leg_swing * 0.25, hip_y + 8)
    left_foot = (cx - 9 + leg_swing, ground)
    right_foot = (cx + 9 - leg_swing, ground)
    line(draw, [(cx - 4, hip_y), left_knee, left_foot], OUTLINE, 5)
    line(draw, [(cx + 4, hip_y), right_knee, right_foot], OUTLINE, 5)
    line(draw, [(cx - 4, hip_y), left_knee, left_foot], BONE, 2)
    line(draw, [(cx + 4, hip_y), right_knee, right_foot], BONE, 2)

    # Spine, pelvis, ribs.
    line(draw, [(cx, hip_y), (cx, rib_y + 10), (cx, rib_y)], OUTLINE, 5)
    line(draw, [(cx, hip_y), (cx, rib_y + 10), (cx, rib_y)], BONE, 2)
    line(draw, [(cx - 8, hip_y), (cx + 8, hip_y)], BONE_SHADE, 4)
    for i, w in enumerate((13, 11, 9)):
        y = rib_y + i * 4
        line(draw, [(cx - w // 2, y), (cx + w // 2, y)], OUTLINE, 4)
        line(draw, [(cx - w // 2, y), (cx + w // 2, y)], BONE, 2)

    # Arms.
    shoulder_y = rib_y + 2
    left_hand = (cx - 14 - arm_swing, rib_y + 15 + squash * 2)
    right_hand = (cx + 13 + sword_raise * 0.45, rib_y + 13 - sword_raise * 0.25)
    line(draw, [(cx - 8, shoulder_y), (cx - 14, rib_y + 9), left_hand], OUTLINE, 5)
    line(draw, [(cx - 8, shoulder_y), (cx - 14, rib_y + 9), left_hand], BONE, 2)
    line(draw, [(cx + 8, shoulder_y), (cx + 13, rib_y + 8), right_hand], OUTLINE, 5)
    line(draw, [(cx + 8, shoulder_y), (cx + 13, rib_y + 8), right_hand], BONE, 2)

    # Short rusty sword/cleaver.
    blade_tip = (right_hand[0] + 11 + slash * 0.25, right_hand[1] - 7 + sword_raise * 0.2)
    line(draw, [right_hand, blade_tip], METAL_DARK, 5)
    line(draw, [right_hand, blade_tip], METAL, 2)
    line(draw, [(right_hand[0] - 4, right_hand[1] + 2), (right_hand[0] + 4, right_hand[1] - 2)], (155, 107, 38, 255), 3)
    if action == "attack" and 2 <= frame <= 4:
        draw.arc((18, 12, 58, 50), start=300, end=45, fill=(170, 235, 255, 135), width=3)

    # Skull.
    ellipse(draw, cx, head_y, 10, 9, BONE)
    draw.rectangle((cx - 5, head_y + 5, cx + 5, head_y + 10), fill=BONE, outline=OUTLINE, width=2)
    draw.rectangle((cx - 5, head_y - 1, cx - 2, head_y + 3), fill=OUTLINE)
    draw.rectangle((cx + 2, head_y - 1, cx + 5, head_y + 3), fill=OUTLINE)
    draw.rectangle((cx - 4, head_y - 1, cx - 3, head_y), fill=EYE)
    draw.rectangle((cx + 3, head_y - 1, cx + 4, head_y), fill=EYE)
    draw.rectangle((cx - 2, head_y + 9, cx - 1, head_y + 11), fill=OUTLINE)
    draw.rectangle((cx + 2, head_y + 9, cx + 3, head_y + 11), fill=OUTLINE)


def make_sheet(action: str) -> Image.Image:
    sheet = Image.new("RGBA", (FRAME * FRAMES, FRAME), (0, 0, 0, 0))
    for frame in range(FRAMES):
        img = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        draw_skeleton(draw, frame, action)
        sheet.alpha_composite(img, (frame * FRAME, 0))
    return sheet


def make_contact(sheet: Image.Image, action: str):
    scale = 3
    gap = 6
    w = FRAMES * FRAME * scale + (FRAMES - 1) * gap
    h = FRAME * scale
    contact = Image.new("RGBA", (w, h), (18, 18, 24, 255))
    for frame in range(FRAMES):
        crop = sheet.crop((frame * FRAME, 0, (frame + 1) * FRAME, FRAME)).resize((FRAME * scale, FRAME * scale), Image.Resampling.NEAREST)
        contact.alpha_composite(crop, (frame * (FRAME * scale + gap), 0))
    contact.save(PREVIEW_DIR / f"skeleton-basic-{action}-contact.png")


def make_gif(sheet: Image.Image, action: str):
    frames = []
    for frame in range(FRAMES):
        crop = sheet.crop((frame * FRAME, 0, (frame + 1) * FRAME, FRAME)).resize((FRAME * 4, FRAME * 4), Image.Resampling.NEAREST)
        bg = Image.new("RGBA", crop.size, (18, 18, 24, 255))
        bg.alpha_composite(crop)
        frames.append(bg.convert("P", palette=Image.Palette.ADAPTIVE))
    frames[0].save(PREVIEW_DIR / f"skeleton-basic-{action}-preview.gif", save_all=True, append_images=frames[1:], duration=110, loop=0, disposal=2)


def main():
    PUBLIC_ENEMIES.mkdir(parents=True, exist_ok=True)
    UPLOAD_ENEMIES.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    for action in ("walk", "attack", "death"):
        sheet = make_sheet(action)
        for out_dir in (PUBLIC_ENEMIES, UPLOAD_ENEMIES):
            sheet.save(out_dir / f"skeleton-basic-{action}.png")
        make_contact(sheet, action)
        make_gif(sheet, action)
        print(f"skeleton-basic-{action}.png {sheet.size[0]}x{sheet.size[1]} frames={FRAMES}")


if __name__ == "__main__":
    main()
