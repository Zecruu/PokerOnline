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

FIRE_BODY = (235, 62, 18, 245)
FIRE_CORE = (255, 190, 49, 255)
FIRE_HOT = (255, 244, 139, 255)
FIRE_EDGE = (107, 18, 18, 245)
FIRE_SMOKE = (72, 37, 31, 140)

FLOWER_STEM = (28, 111, 48, 255)
FLOWER_LEAF = (58, 174, 70, 255)
FLOWER_PETAL = (176, 40, 204, 255)
FLOWER_PETAL_DARK = (82, 19, 108, 255)
FLOWER_CORE = (255, 221, 76, 255)
FLOWER_TOOTH = (244, 242, 218, 255)
FLOWER_VENOM = (77, 255, 108, 190)

WYVERN_BODY = (178, 34, 22, 255)
WYVERN_BELLY = (255, 133, 38, 255)
WYVERN_WING = (95, 20, 21, 245)
WYVERN_WING_EDGE = (245, 85, 24, 245)
WYVERN_HORN = (255, 226, 128, 255)
WYVERN_FLAME = (255, 232, 82, 220)


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


def draw_fire_blob(draw: ImageDraw.ImageDraw, frame: int, action: str):
    phase = frame / FRAMES
    pulse = sin(phase * pi * 2)
    wobble = sin(phase * pi * 4) * 1.5
    cx = 32
    cy = 35 + pulse * 1.5
    collapse = frame / (FRAMES - 1) if action == "death" else 0
    flare = sin(min(1, phase * 1.2) * pi) if action == "attack" else 0

    if action == "death":
        cy += collapse * 10
        alpha = int(245 * (1 - collapse * 0.65))
        body = (FIRE_BODY[0], FIRE_BODY[1], FIRE_BODY[2], max(70, alpha))
        core = (FIRE_CORE[0], FIRE_CORE[1], FIRE_CORE[2], max(80, alpha))
    else:
        body = FIRE_BODY
        core = FIRE_CORE

    draw.ellipse((13, 50, 51, 57), fill=(0, 0, 0, 52))

    if action == "death" and frame >= 4:
        for i in range(10):
            x = 18 + i * 3 + (i % 2) * 2
            y = 47 - (i % 3) * 3
            draw.ellipse((x - 2, y - 2, x + 2, y + 2), fill=(FIRE_CORE[0], FIRE_CORE[1], FIRE_CORE[2], 120))
        for i in range(5):
            x = 20 + i * 6
            y = 36 - i % 2 * 4
            draw.ellipse((x - 3, y - 3, x + 3, y + 3), fill=FIRE_SMOKE)
        return

    rx = 15 + abs(pulse) * 2 + flare * 4
    ry = 14 - abs(pulse) + flare * 2
    blob = [
        (cx, cy - ry - 12 - flare * 4),
        (cx + 7, cy - ry - 2),
        (cx + rx, cy - 4),
        (cx + rx - 2, cy + 11),
        (cx + 8, cy + ry),
        (cx + 2, cy + ry + 3 + wobble),
        (cx - 6, cy + ry),
        (cx - rx, cy + 9),
        (cx - rx - 1, cy - 4),
        (cx - 7, cy - ry),
    ]
    draw.polygon(blob, fill=body)
    draw.line(blob + [blob[0]], fill=FIRE_EDGE, width=2, joint="curve")

    inner = [
        (cx - 2, cy - ry - 3),
        (cx + 7, cy - 3),
        (cx + 8, cy + 8),
        (cx + 1, cy + 14),
        (cx - 8, cy + 7),
        (cx - 6, cy - 3),
    ]
    draw.polygon(inner, fill=core)
    draw.polygon([(cx - 1, cy - 5), (cx + 4, cy + 3), (cx, cy + 10), (cx - 5, cy + 2)], fill=FIRE_HOT)

    eye_y = cy - 2
    draw.rectangle((cx - 8, eye_y - 2, cx - 4, eye_y + 1), fill=(35, 9, 8, 255))
    draw.rectangle((cx + 4, eye_y - 2, cx + 8, eye_y + 1), fill=(35, 9, 8, 255))
    draw.rectangle((cx - 7, eye_y - 1, cx - 6, eye_y), fill=FIRE_HOT)
    draw.rectangle((cx + 6, eye_y - 1, cx + 7, eye_y), fill=FIRE_HOT)
    draw.arc((cx - 7, cy + 5, cx + 7, cy + 12), 205, 335, fill=FIRE_EDGE, width=2)

    if action == "attack" and 2 <= frame <= 4:
        draw.arc((8, 15, 58, 55), 210, 345, fill=(255, 166, 35, 160), width=4)
        for i in range(5):
            fx = 15 + i * 8
            fy = 48 + (i % 2) * 4
            draw.polygon([(fx, fy - 9), (fx + 4, fy), (fx, fy + 4), (fx - 4, fy)], fill=FIRE_CORE)
            draw.line([(fx, fy - 9), (fx + 4, fy), (fx, fy + 4), (fx - 4, fy), (fx, fy - 9)], fill=FIRE_EDGE, width=1)


def draw_evil_flower(draw: ImageDraw.ImageDraw, frame: int, action: str):
    phase = frame / FRAMES
    sway = sin(phase * pi * 2) * 3
    bite = sin(min(1, phase * 1.2) * pi) if action == "attack" else 0
    collapse = frame / (FRAMES - 1) if action == "death" else 0
    cx = 32 + sway * 0.4
    cy = 29 + sin(phase * pi * 2) * 1.5 + collapse * 13
    ground = 56

    draw.ellipse((15, ground - 4, 49, ground + 2), fill=(0, 0, 0, 42))

    if action == "death" and frame >= 4:
        line(draw, [(30, 55), (32, 48), (35, 55)], FLOWER_STEM, 4)
        for i in range(8):
            x = 17 + i * 4
            y = 43 + (i % 3) * 3
            draw.ellipse((x - 3, y - 2, x + 3, y + 2), fill=(FLOWER_PETAL[0], FLOWER_PETAL[1], FLOWER_PETAL[2], 150))
        return

    # Root and stem.
    line(draw, [(cx, cy + 13), (32 + sway * 0.15, 45), (29, ground)], FLOWER_STEM, 7)
    line(draw, [(cx, cy + 13), (32 + sway * 0.15, 45), (29, ground)], (105, 224, 84, 255), 3)
    draw.ellipse((18, 45, 32, 54), fill=FLOWER_LEAF, outline=FLOWER_STEM, width=2)
    draw.ellipse((33, 44, 48, 54), fill=FLOWER_LEAF, outline=FLOWER_STEM, width=2)

    # Petal mouth around a snapping core.
    petal_r = 10 + bite * 3
    for i in range(8):
        a = i / 8 * pi * 2 + phase * 0.2
        px = cx + cos(a) * (10 + bite * 2)
        py = cy + sin(a) * (9 + bite * 2)
        rx = 7 if i % 2 == 0 else 6
        ry = 10 if i % 2 == 0 else 8
        draw.ellipse((px - rx, py - ry, px + rx, py + ry), fill=FLOWER_PETAL, outline=FLOWER_PETAL_DARK, width=2)

    draw.ellipse((cx - petal_r, cy - petal_r, cx + petal_r, cy + petal_r), fill=FLOWER_PETAL_DARK, outline=OUTLINE, width=2)
    mouth_open = 5 + bite * 8
    draw.ellipse((cx - 8, cy - 2, cx + 8, cy + mouth_open), fill=(21, 8, 24, 255), outline=(255, 68, 180, 255), width=2)
    for tx in (-5, 0, 5):
        draw.polygon([(cx + tx - 2, cy), (cx + tx + 2, cy), (cx + tx, cy + 5 + bite * 2)], fill=FLOWER_TOOTH)
    for tx in (-4, 3):
        draw.polygon([(cx + tx - 2, cy + mouth_open), (cx + tx + 2, cy + mouth_open), (cx + tx, cy + mouth_open - 4)], fill=FLOWER_TOOTH)
    draw.ellipse((cx - 3, cy - 9, cx + 3, cy - 3), fill=FLOWER_CORE, outline=FLOWER_PETAL_DARK, width=1)

    if action == "attack" and 2 <= frame <= 4:
        draw.arc((8, 9, 58, 55), 205, 335, fill=FLOWER_VENOM, width=3)
        for i in range(5):
            x = 18 + i * 7
            y = 48 + (i % 2) * 3
            draw.ellipse((x - 2, y - 2, x + 2, y + 2), fill=FLOWER_VENOM)


def draw_fire_wyvern(draw: ImageDraw.ImageDraw, frame: int, action: str):
    phase = frame / FRAMES
    wing = sin(phase * pi * 2)
    flap = abs(wing)
    bob = sin(phase * pi * 2) * 3
    collapse = frame / (FRAMES - 1) if action == "death" else 0
    lunge = sin(min(1, phase * 1.2) * pi) if action == "attack" else 0
    cx = 31 + lunge * 3
    cy = 31 + bob - lunge + collapse * 13

    draw.ellipse((15, 50, 49, 57), fill=(0, 0, 0, 42))

    if action == "death" and frame >= 4:
        for i in range(10):
            ang = i / 10 * pi * 2 + phase
            x = 32 + cos(ang) * (7 + i % 3 * 3)
            y = 43 + sin(ang) * (5 + i % 2 * 3)
            fill = WYVERN_FLAME if i % 2 else WYVERN_WING_EDGE
            draw.polygon([(x, y - 3), (x - 2, y + 2), (x + 2, y + 2)], fill=fill)
        return

    wing_top = cy - 15 - flap * 5 + collapse * 6
    wing_low = cy + 6 + collapse * 8
    left_wing = [(cx - 5, cy - 4), (cx - 24, wing_top), (cx - 20, wing_low), (cx - 10, cy + 8)]
    right_wing = [(cx + 5, cy - 4), (cx + 24, wing_top), (cx + 20, wing_low), (cx + 10, cy + 8)]
    draw.polygon(left_wing, fill=WYVERN_WING, outline=OUTLINE)
    draw.polygon(right_wing, fill=WYVERN_WING, outline=OUTLINE)
    line(draw, [(cx - 5, cy - 4), (cx - 20, wing_low)], WYVERN_WING_EDGE, 2)
    line(draw, [(cx + 5, cy - 4), (cx + 20, wing_low)], WYVERN_WING_EDGE, 2)
    line(draw, [(cx - 9, cy - 1), (cx - 24, wing_top)], WYVERN_WING_EDGE, 2)
    line(draw, [(cx + 9, cy - 1), (cx + 24, wing_top)], WYVERN_WING_EDGE, 2)

    tail = [(cx - 9, cy + 10), (cx - 19, cy + 16 + wing * 2), (cx - 25, cy + 12 - wing)]
    line(draw, tail, OUTLINE, 6)
    line(draw, tail, WYVERN_BODY, 3)
    draw.polygon([(cx - 27, cy + 12 - wing), (cx - 22, cy + 7 - wing), (cx - 21, cy + 16 - wing)], fill=WYVERN_WING_EDGE, outline=OUTLINE)

    ellipse(draw, cx, cy + 4, 12, 13, WYVERN_BODY, outline=OUTLINE, width=2)
    draw.ellipse((cx - 5, cy - 3, cx + 5, cy + 13), fill=WYVERN_BELLY)
    line(draw, [(cx - 3, cy), (cx + 3, cy + 10)], (255, 199, 83, 210), 1)

    head_x = cx + 11 + lunge * 2
    head_y = cy - 7 + collapse * 3
    ellipse(draw, head_x, head_y, 9, 8, WYVERN_BODY, outline=OUTLINE, width=2)
    draw.polygon([(head_x - 5, head_y - 7), (head_x - 7, head_y - 15), (head_x - 1, head_y - 9)], fill=WYVERN_HORN, outline=OUTLINE)
    draw.polygon([(head_x + 3, head_y - 7), (head_x + 5, head_y - 15), (head_x + 8, head_y - 7)], fill=WYVERN_HORN, outline=OUTLINE)
    draw.polygon([(head_x + 7, head_y - 1), (head_x + 15 + lunge * 2, head_y + 2), (head_x + 7, head_y + 5)], fill=WYVERN_BODY, outline=OUTLINE)
    draw.rectangle((head_x + 2, head_y - 3, head_x + 5, head_y), fill=WYVERN_FLAME)
    draw.rectangle((head_x + 3, head_y - 2, head_x + 5, head_y), fill=(55, 7, 8, 255))
    draw.arc((head_x + 3, head_y + 1, head_x + 13, head_y + 9), 10, 170, fill=(35, 5, 7, 255), width=2)

    for side in (-1, 1):
        foot_x = cx + side * (6 + wing)
        foot_y = cy + 16 - collapse * 2
        line(draw, [(cx + side * 5, cy + 12), (foot_x, foot_y)], OUTLINE, 4)
        line(draw, [(cx + side * 5, cy + 12), (foot_x, foot_y)], WYVERN_HORN, 2)
        draw.polygon([(foot_x, foot_y), (foot_x + side * 4, foot_y + 2), (foot_x + side, foot_y - 2)], fill=WYVERN_HORN)

    if action == "attack" and 2 <= frame <= 4:
        flame_x = head_x + 17 + lunge * 2
        draw.polygon([(head_x + 12, head_y + 2), (flame_x + 12, head_y - 5), (flame_x + 9, head_y + 3), (flame_x + 15, head_y + 9)], fill=(255, 86, 18, 160))
        draw.polygon([(head_x + 13, head_y + 2), (flame_x + 8, head_y - 1), (flame_x + 5, head_y + 5)], fill=WYVERN_FLAME)


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
    save_set("fire-blob-cinder-wretch", draw_fire_blob)
    save_set("evil-flower-poison", draw_evil_flower)
    save_set("fire-wyvern-heads", draw_fire_wyvern)


if __name__ == "__main__":
    main()
