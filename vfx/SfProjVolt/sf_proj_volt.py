"""Slot Five: Volt projectile. Loop, 8 frames (4x2), 64x64, round, no flight direction.
Yellow-white charged ball; short jagged arcs snap around it, shape held 2 frames (stepped, anime "on 2s").
"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "SfCommon"))
import sf_common as sf  # noqa: E402

FRAMES = 8
DURATION = 0.4
META = sf.meta("sf_proj_volt", (64, 64), (32, 32), DURATION, FRAMES, True, "add",
               "projectile center, no rotation", stepped=True, seed=21, hold=2, arcs=4)


def draw(cv, t, o):
    f = int(math.floor((t % DURATION) / DURATION * FRAMES + 1e-6)) % FRAMES
    step = f // o["hold"]
    rng = np.random.RandomState(o["seed"] * 97 + step)
    V = sf.VOLT
    pulse = 1.0 + 0.08 * math.cos(sf.TAU * f / FRAMES)
    cv.glow(0, 0, 24, V[2], 0.38)
    cv.disc(0, 0, 9.5 * pulse, lambda u: np.array(V)[np.clip((u * 3.2).astype(int), 0, 3)])
    cv.disc(-2, -2, 3.2, V[0])
    base = rng.uniform(0, sf.TAU)
    bolts = []
    for i in range(o["arcs"]):                                # short crackles leaving the surface
        a = base + i * sf.TAU / o["arcs"] + rng.uniform(-0.5, 0.5)
        r1 = rng.uniform(19, 24)
        a1 = a + rng.uniform(-0.45, 0.45)
        pts = sf.zigzag(rng.randint(1 << 30), (math.cos(a) * 8, math.sin(a) * 8),
                        (math.cos(a1) * r1, math.sin(a1) * r1), 4, 3.2)
        bolts.append((pts, 1.0))
        if rng.rand() < 0.6:                                    # small fork
            j = rng.randint(1, len(pts) - 1)
            fx_, fy_ = pts[j]
            fa = math.atan2(fy_, fx_) + rng.choice([-1, 1]) * rng.uniform(0.5, 0.9)
            fl = rng.uniform(5, 8)
            bolts.append(([(fx_, fy_), (fx_ + math.cos(fa) * fl, fy_ + math.sin(fa) * fl)], 0.7))
    for pts, w in bolts:
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            cv.glow_line(x0, y0, x1, y1, 4, V[2], 0.32 * w)
    for pts, w in bolts:
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            cv.streak(x0, y0, x1, y1, 1.2 * w, 1.0 * w, V[1])
    for pts, w in bolts:
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            cv.streak(x0, y0, x1, y1, 0.5, 0.5, V[0])
    for _ in range(3):                                         # loose sparks
        a = rng.uniform(0, sf.TAU)
        rr = rng.uniform(16, 24)
        cv.disc(math.cos(a) * rr, math.sin(a) * rr, 1.0, V[1])
    sf.edge_fade(cv)
