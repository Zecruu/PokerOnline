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
EYE_BLUE = (110, 222, 255, 255)
OUTLINE = (30, 31, 37, 235)
METAL = (170, 184, 192, 255)
METAL_DARK = (72, 82, 91, 255)

VOID = (35, 18, 52, 255)
VOID_EDGE = (94, 43, 130, 255)
MOUTH = (10, 5, 14, 255)
GUM = (205, 47, 94, 255)
TOOTH = (238, 233, 207, 255)
EYE_WHITE = (233, 246, 255, 255)
IRIS = (255, 218, 74, 255)

GHOST_BODY = (70, 205, 235, 210)
GHOST_CORE = (176, 247, 255, 235)
GHOST_EDGE = (25, 94, 125, 220)
GHOST_DARK = (16, 24, 39, 245)
GHOST_RUNE = (255, 66, 155, 210)

ICE_BODY = (132, 226, 255, 245)
ICE_CORE = (226, 252, 255, 255)
ICE_EDGE = (31, 124, 176, 255)
ICE_SHADOW = (14, 45, 72, 230)
ICE_RUNE = (65, 255, 255, 220)


def line(draw: ImageDraw.ImageDraw, points, fill, width=2):
    draw.line(points, fill=fill, width=width, joint="curve")


def ellipse(draw: ImageDraw.ImageDraw, cx, cy, rx, ry, fill, outline=OUTLINE, width=2):
    draw.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=fill, outline=outline, width=width)


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

    draw.ellipse((18, ground - 3, 46, ground + 2), fill=(0, 0, 0, 45))

    if action == "death" and frame >= 4:
        line(draw, [(19, 48), (32, 51), (45, 47)], BONE_SHADE, 4)
        line(draw, [(22, 54), (39, 53)], BONE, 3)
        ellipse(draw, 36, 45, 7, 5, BONE)
        draw.rectangle((33, 44, 35, 46), fill=OUTLINE)
        draw.rectangle((39, 43, 41, 45), fill=OUTLINE)
        return

    left_knee = (cx - 5 - leg_swing * 0.25, hip_y + 8)
    right_knee = (cx + 5 + leg_swing * 0.25, hip_y + 8)
    left_foot = (cx - 9 + leg_swing, ground)
    right_foot = (cx + 9 - leg_swing, ground)
    line(draw, [(cx - 4, hip_y), left_knee, left_foot], OUTLINE, 5)
    line(draw, [(cx + 4, hip_y), right_knee, right_foot], OUTLINE, 5)
    line(draw, [(cx - 4, hip_y), left_knee, left_foot], BONE, 2)
    line(draw, [(cx + 4, hip_y), right_knee, right_foot], BONE, 2)

    line(draw, [(cx, hip_y), (cx, rib_y + 10), (cx, rib_y)], OUTLINE, 5)
    line(draw, [(cx, hip_y), (cx, rib_y + 10), (cx, rib_y)], BONE, 2)
    line(draw, [(cx - 8, hip_y), (cx + 8, hip_y)], BONE_SHADE, 4)
    for i, w in enumerate((13, 11, 9)):
        y = rib_y + i * 4
        line(draw, [(cx - w // 2, y), (cx + w // 2, y)], OUTLINE, 4)
        line(draw, [(cx - w // 2, y), (cx + w // 2, y)], BONE, 2)

    shoulder_y = rib_y + 2
    left_hand = (cx - 14 - arm_swing, rib_y + 15 + squash * 2)
    right_hand = (cx + 13 + sword_raise * 0.45, rib_y + 13 - sword_raise * 0.25)
    line(draw, [(cx - 8, shoulder_y), (cx - 14, rib_y + 9), left_hand], OUTLINE, 5)
    line(draw, [(cx - 8, shoulder_y), (cx - 14, rib_y + 9), left_hand], BONE, 2)
    line(draw, [(cx + 8, shoulder_y), (cx + 13, rib_y + 8), right_hand], OUTLINE, 5)
    line(draw, [(cx + 8, shoulder_y), (cx + 13, rib_y + 8), right_hand], BONE, 2)

    blade_tip = (right_hand[0] + 11 + slash * 0.25, right_hand[1] - 7 + sword_raise * 0.2)
    line(draw, [right_hand, blade_tip], METAL_DARK, 5)
    line(draw, [right_hand, blade_tip], METAL, 2)
    line(draw, [(right_hand[0] - 4, right_hand[1] + 2), (right_hand[0] + 4, right_hand[1] - 2)], (155, 107, 38, 255), 3)
    if action == "attack" and 2 <= frame <= 4:
        draw.arc((18, 12, 58, 50), start=300, end=45, fill=(170, 235, 255, 135), width=3)

    ellipse(draw, cx, head_y, 10, 9, BONE)
    draw.rectangle((cx - 5, head_y + 5, cx + 5, head_y + 10), fill=BONE, outline=OUTLINE, width=2)
    draw.rectangle((cx - 5, head_y - 1, cx - 2, head_y + 3), fill=OUTLINE)
    draw.rectangle((cx + 2, head_y - 1, cx + 5, head_y + 3), fill=OUTLINE)
    draw.rectangle((cx - 4, head_y - 1, cx - 3, head_y), fill=EYE_BLUE)
    draw.rectangle((cx + 3, head_y - 1, cx + 4, head_y), fill=EYE_BLUE)
    draw.rectangle((cx - 2, head_y + 9, cx - 1, head_y + 11), fill=OUTLINE)
    draw.rectangle((cx + 2, head_y + 9, cx + 3, head_y + 11), fill=OUTLINE)


def draw_eyes_mouth(draw: ImageDraw.ImageDraw, frame: int, action: str):
    phase = frame / FRAMES
    bob = sin(phase * pi * 2) * 3
    pulse = sin(phase * pi * 2)
    cx = 32
    cy = 31 + bob
    rx = 17 + abs(pulse) * 2
    ry = 15 - abs(pulse)

    if action == "attack":
        bite = sin(min(1, phase * 1.25) * pi)
        rx += bite * 3
        ry += bite * 2
        cy += bite * 1
    elif action == "death":
        collapse = frame / (FRAMES - 1)
        rx = max(4, 17 * (1 - collapse * 0.75))
        ry = max(3, 15 * (1 - collapse * 0.8))
        cy += collapse * 10

    draw.ellipse((16, 48, 48, 55), fill=(0, 0, 0, 48))
    if action == "death" and frame >= 4:
        for a in range(8):
            ang = a / 8 * pi * 2
            x = 32 + cos(ang) * (8 + frame)
            y = 44 + sin(ang) * (5 + frame * 0.5)
            draw.rectangle((x - 1, y - 1, x + 1, y + 1), fill=VOID_EDGE)
        return

    ellipse(draw, cx, cy, rx, ry, VOID, outline=VOID_EDGE, width=3)
    draw.arc((cx - rx - 3, cy - ry - 2, cx + rx + 3, cy + ry + 6), 205, 333, fill=(159, 74, 203, 150), width=2)

    eye_offset = 6 + pulse * 0.6
    for side in (-1, 1):
        ex = cx + side * eye_offset
        ey = cy - 5
        ellipse(draw, ex, ey, 5, 6, EYE_WHITE, outline=OUTLINE, width=1)
        draw.ellipse((ex - 2, ey - 1, ex + 2, ey + 3), fill=IRIS)
        draw.rectangle((ex - 1, ey, ex + 1, ey + 2), fill=(30, 12, 35, 255))

    mouth_open = 5 + (4 if action == "attack" and 2 <= frame <= 4 else abs(pulse) * 2)
    draw.ellipse((cx - 11, cy + 3, cx + 11, cy + 3 + mouth_open), fill=MOUTH, outline=GUM, width=2)
    for i, tx in enumerate((-7, -3, 3, 7)):
        top = cy + 4
        draw.polygon([(cx + tx - 2, top), (cx + tx + 2, top), (cx + tx, top + 5)], fill=TOOTH)
    for tx in (-5, 0, 5):
        bot = cy + 3 + mouth_open
        draw.polygon([(cx + tx - 2, bot), (cx + tx + 2, bot), (cx + tx, bot - 4)], fill=TOOTH)

    if action == "attack" and 2 <= frame <= 4:
        draw.arc((cx - 23, cy - 19, cx + 23, cy + 24), 25, 150, fill=(255, 218, 74, 130), width=3)


def draw_evil_ghost(draw: ImageDraw.ImageDraw, frame: int, action: str):
    phase = frame / FRAMES
    bob = sin(phase * pi * 2) * 4
    sway = sin(phase * pi * 2) * 3
    cx = 32 + sway * 0.45
    cy = 28 + bob
    collapse = frame / (FRAMES - 1) if action == "death" else 0
    lunge = sin(min(1, phase * 1.2) * pi) if action == "attack" else 0

    if action == "death":
        cy += collapse * 12
        alpha = int(220 * (1 - collapse * 0.75))
        body = (GHOST_BODY[0], GHOST_BODY[1], GHOST_BODY[2], max(55, alpha))
        core = (GHOST_CORE[0], GHOST_CORE[1], GHOST_CORE[2], max(70, alpha + 20))
    else:
        body = GHOST_BODY
        core = GHOST_CORE

    draw.ellipse((15, 49, 49, 56), fill=(0, 0, 0, 38))

    if action == "death" and frame >= 4:
        for i in range(9):
            ang = i / 9 * pi * 2 + phase
            x = 32 + cos(ang) * (6 + i % 3 * 3)
            y = 42 + sin(ang) * (4 + i % 2 * 2)
            draw.rectangle((x - 1, y - 1, x + 1, y + 1), fill=(GHOST_BODY[0], GHOST_BODY[1], GHOST_BODY[2], 120))
        return

    top = cy - 16
    left = cx - 16 - lunge * 2
    right = cx + 16 + lunge * 2
    bottom = cy + 18
    tail_y = cy + 24 + sin(phase * pi * 4) * 2

    outline = [
        (cx, top),
        (right - 5, cy - 10),
        (right, cy + 7),
        (cx + 10, bottom),
        (cx + 5, tail_y),
        (cx, bottom + 2),
        (cx - 6, tail_y - 1),
        (cx - 11, bottom),
        (left, cy + 7),
        (left + 5, cy - 10),
    ]
    draw.polygon(outline, fill=body)
    draw.line(outline + [outline[0]], fill=GHOST_EDGE, width=2, joint="curve")

    draw.ellipse((cx - 12, cy - 12, cx + 12, cy + 13), fill=core)

    arm_y = cy + 2
    left_hand = (cx - 22 - lunge * 5, arm_y + 8)
    right_hand = (cx + 22 + lunge * 5, arm_y + 8)
    line(draw, [(cx - 11, arm_y), (cx - 17, arm_y + 5), left_hand], GHOST_EDGE, 5)
    line(draw, [(cx - 11, arm_y), (cx - 17, arm_y + 5), left_hand], body, 3)
    line(draw, [(cx + 11, arm_y), (cx + 17, arm_y + 5), right_hand], GHOST_EDGE, 5)
    line(draw, [(cx + 11, arm_y), (cx + 17, arm_y + 5), right_hand], body, 3)

    eye_slant = 2 if action == "attack" else 0
    draw.polygon([(cx - 9, cy - 4), (cx - 3, cy - 2 - eye_slant), (cx - 5, cy + 2), (cx - 10, cy + 1)], fill=GHOST_DARK)
    draw.polygon([(cx + 9, cy - 4), (cx + 3, cy - 2 - eye_slant), (cx + 5, cy + 2), (cx + 10, cy + 1)], fill=GHOST_DARK)
    draw.rectangle((cx - 7, cy - 2, cx - 6, cy - 1), fill=GHOST_RUNE)
    draw.rectangle((cx + 6, cy - 2, cx + 7, cy - 1), fill=GHOST_RUNE)
    draw.arc((cx - 7, cy + 4, cx + 7, cy + 12), 205, 335, fill=GHOST_DARK, width=2)

    if action == "attack" and 2 <= frame <= 4:
        draw.arc((cx - 25, cy - 20, cx + 25, cy + 24), 205, 330, fill=(255, 66, 155, 150), width=3)
        for i in range(3):
            draw.line((cx - 18 + i * 18, cy + 17, cx - 23 + i * 19, cy + 25), fill=(255, 66, 155, 100), width=2)


def draw_ice_giant(draw: ImageDraw.ImageDraw, frame: int, action: str):
    phase = frame / FRAMES
    stomp = sin(phase * pi * 2)
    bob = abs(stomp) * -2
    cx = 32
    ground = 56
    collapse = frame / (FRAMES - 1) if action == "death" else 0
    slam = sin(min(1, phase * 1.18) * pi) if action == "attack" else 0

    if action == "death":
        cy_shift = collapse * 12
        alpha = int(255 * (1 - collapse * 0.55))
        body = (ICE_BODY[0], ICE_BODY[1], ICE_BODY[2], max(80, alpha))
        core = (ICE_CORE[0], ICE_CORE[1], ICE_CORE[2], max(90, alpha))
    else:
        cy_shift = bob
        body = ICE_BODY
        core = ICE_CORE

    draw.ellipse((12, ground - 5, 52, ground + 2), fill=(0, 0, 0, 50))

    if action == "death" and frame >= 4:
        shards = [(16, 50), (23, 42), (31, 53), (39, 43), (48, 51)]
        for x, y in shards:
            draw.polygon([(x, y - 7), (x + 5, y), (x, y + 5), (x - 5, y)], fill=body)
            draw.line([(x, y - 7), (x + 5, y), (x, y + 5), (x - 5, y), (x, y - 7)], fill=ICE_EDGE, width=2)
        return

    head_y = 14 + cy_shift
    torso_y = 29 + cy_shift
    hip_y = 43 + cy_shift
    left_leg = cx - 9 - stomp * 2
    right_leg = cx + 9 + stomp * 2

    # Legs and icy boots.
    draw.polygon([(left_leg - 5, hip_y), (left_leg + 4, hip_y), (left_leg + 7, ground), (left_leg - 8, ground)], fill=body)
    draw.line([(left_leg - 5, hip_y), (left_leg + 4, hip_y), (left_leg + 7, ground), (left_leg - 8, ground), (left_leg - 5, hip_y)], fill=ICE_EDGE, width=2)
    draw.polygon([(right_leg - 4, hip_y), (right_leg + 5, hip_y), (right_leg + 8, ground), (right_leg - 7, ground)], fill=body)
    draw.line([(right_leg - 4, hip_y), (right_leg + 5, hip_y), (right_leg + 8, ground), (right_leg - 7, ground), (right_leg - 4, hip_y)], fill=ICE_EDGE, width=2)

    # Torso as a heavy ice slab.
    torso = [(cx - 15, torso_y - 11), (cx + 15, torso_y - 11), (cx + 18, torso_y + 9), (cx + 8, hip_y), (cx - 8, hip_y), (cx - 18, torso_y + 9)]
    draw.polygon(torso, fill=body)
    draw.line(torso + [torso[0]], fill=ICE_EDGE, width=2, joint="curve")
    draw.polygon([(cx - 7, torso_y - 5), (cx + 6, torso_y - 2), (cx + 3, torso_y + 9), (cx - 8, torso_y + 7)], fill=core)

    # Head and crown shards.
    draw.polygon([(cx - 10, head_y - 4), (cx - 4, head_y - 12), (cx + 2, head_y - 5), (cx + 8, head_y - 11), (cx + 12, head_y - 2), (cx + 8, head_y + 8), (cx - 8, head_y + 8), (cx - 13, head_y)], fill=body)
    draw.line([(cx - 10, head_y - 4), (cx - 4, head_y - 12), (cx + 2, head_y - 5), (cx + 8, head_y - 11), (cx + 12, head_y - 2), (cx + 8, head_y + 8), (cx - 8, head_y + 8), (cx - 13, head_y), (cx - 10, head_y - 4)], fill=ICE_EDGE, width=2)
    draw.rectangle((cx - 7, head_y, cx - 4, head_y + 2), fill=ICE_SHADOW)
    draw.rectangle((cx + 4, head_y, cx + 7, head_y + 2), fill=ICE_SHADOW)
    draw.rectangle((cx - 6, head_y, cx - 5, head_y), fill=ICE_RUNE)
    draw.rectangle((cx + 5, head_y, cx + 6, head_y), fill=ICE_RUNE)

    # Arms, with a heavier slam pose during attack.
    arm_drop = 12 * slam
    left_hand = (cx - 22 - slam * 3, torso_y + 11 + arm_drop)
    right_hand = (cx + 22 + slam * 3, torso_y + 11 + arm_drop)
    line(draw, [(cx - 14, torso_y - 4), (cx - 20, torso_y + 7), left_hand], ICE_EDGE, 7)
    line(draw, [(cx - 14, torso_y - 4), (cx - 20, torso_y + 7), left_hand], body, 4)
    line(draw, [(cx + 14, torso_y - 4), (cx + 20, torso_y + 7), right_hand], ICE_EDGE, 7)
    line(draw, [(cx + 14, torso_y - 4), (cx + 20, torso_y + 7), right_hand], body, 4)

    if action == "attack" and 2 <= frame <= 4:
        draw.arc((8, 26, 56, 62), 190, 350, fill=(145, 245, 255, 155), width=4)
        for x in (18, 27, 38, 47):
            draw.polygon([(x, 55), (x + 3, 48), (x + 7, 55)], fill=ICE_CORE)
            draw.line([(x, 55), (x + 3, 48), (x + 7, 55)], fill=ICE_EDGE, width=1)


def make_sheet(draw_fn, action: str) -> Image.Image:
    sheet = Image.new("RGBA", (FRAME * FRAMES, FRAME), (0, 0, 0, 0))
    for frame in range(FRAMES):
        img = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
        draw_fn(ImageDraw.Draw(img), frame, action)
        sheet.alpha_composite(img, (frame * FRAME, 0))
    return sheet


def make_contact(sheet: Image.Image, name: str):
    scale = 3
    gap = 6
    w = FRAMES * FRAME * scale + (FRAMES - 1) * gap
    h = FRAME * scale
    contact = Image.new("RGBA", (w, h), (18, 18, 24, 255))
    for frame in range(FRAMES):
        crop = sheet.crop((frame * FRAME, 0, (frame + 1) * FRAME, FRAME)).resize((FRAME * scale, FRAME * scale), Image.Resampling.NEAREST)
        contact.alpha_composite(crop, (frame * (FRAME * scale + gap), 0))
    contact.save(PREVIEW_DIR / f"{name}-contact.png")


def make_gif(sheet: Image.Image, name: str):
    frames = []
    for frame in range(FRAMES):
        crop = sheet.crop((frame * FRAME, 0, (frame + 1) * FRAME, FRAME)).resize((FRAME * 4, FRAME * 4), Image.Resampling.NEAREST)
        bg = Image.new("RGBA", crop.size, (18, 18, 24, 255))
        bg.alpha_composite(crop)
        frames.append(bg.convert("P", palette=Image.Palette.ADAPTIVE))
    frames[0].save(PREVIEW_DIR / f"{name}-preview.gif", save_all=True, append_images=frames[1:], duration=110, loop=0, disposal=2)


def save_set(prefix: str, draw_fn):
    for action in ("walk", "attack", "death"):
        sheet = make_sheet(draw_fn, action)
        filename = f"{prefix}-{action}.png"
        for out_dir in (PUBLIC_ENEMIES, UPLOAD_ENEMIES):
            sheet.save(out_dir / filename)
        preview_name = f"{prefix}-{action}"
        make_contact(sheet, preview_name)
        make_gif(sheet, preview_name)
        print(f"{filename} {sheet.size[0]}x{sheet.size[1]} frames={FRAMES}")


def main():
    PUBLIC_ENEMIES.mkdir(parents=True, exist_ok=True)
    UPLOAD_ENEMIES.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    save_set("skeleton-swarm", draw_skeleton)
    save_set("eyes-mouth-basic", draw_eyes_mouth)
    save_set("evil-ghost-runner", draw_evil_ghost)
    save_set("ice-giant-ice", draw_ice_giant)


if __name__ == "__main__":
    main()
