"""Slot Five: Volt hit. One shot 0.24 s, 12 frames (4x3), 112x96, additive, stepped (shape held 2 frames).
Beat: white flash -> jagged bolts burst out from the target and crackle round it -> thin out and blink off.
"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "SfCommon"))
import fxlib as fx  # noqa: E402
import sf_common as sf  # noqa: E402

FRAMES = 12
DURATION = 0.24
META = sf.meta("sf_hit_volt", (112, 96), (56, 48), DURATION, FRAMES, False, "add",
               "target fighter center", stepped=True, seed=31, hold=2, bolts=6)


def draw(cv, t, o):
    D = DURATION
    if t >= D - 1e-6:
        return
    f = int(math.floor(t / D * FRAMES + 1e-6))
    u = f / (FRAMES - 1)
    step = f // o["hold"]
    rng = np.random.RandomState(o["seed"] * 131 + step)
    V = sf.VOLT
    energy = (1 - u) ** 1.2
    reach = 0.55 + 0.45 * sf.out_expo(min(1.0, (f + 1) / 3))
    paths = []
    base = rng.uniform(0, sf.TAU)
    nb = o["bolts"] - (1 if f >= 8 else 0) - (1 if f >= 10 else 0)
    for i in range(nb):
        a = base + i * sf.TAU / o["bolts"] + rng.uniform(-0.3, 0.3)
        r = rng.uniform(34, 44) * reach
        end = (math.cos(a) * r * 1.1, math.sin(a) * r * 0.86)
        start = (math.cos(a) * 5, math.sin(a) * 5)
        segs = fx.bolt(*start, *end, seed=rng.randint(1 << 30), depth=4, offset=0.2, branch_p=0.0)
        pts = [(s_[0], s_[1]) for s_ in segs] + [(segs[-1][2], segs[-1][3])]
        paths.append((pts, 1.0))
        if rng.rand() < 0.7:
            j = rng.randint(2, len(pts) - 1)
            x, y = pts[j]
            fa = math.atan2(y, x) + rng.choice([-1, 1]) * rng.uniform(0.5, 1.0)
            fl = rng.uniform(8, 13) * reach
            fork = sf.zigzag(rng.randint(1 << 30), (x, y), (x + math.cos(fa) * fl, y + math.sin(fa) * fl), 2, 2.5)
            paths.append((fork, 0.6))
    if f < 8:                                                    # crackle ring hugging the target
        n = 14
        rr = 20 + 3 * u
        ring = []
        for k in range(n + 1):
            a = base + sf.TAU * k / n
            q = rr + rng.uniform(-3.5, 3.5)
            ring.append((math.cos(a) * q * 1.1, math.sin(a) * q * 0.9))
        keep = rng.rand(n) < 0.65
        for k in range(n):
            if keep[k]:
                paths.append(([ring[k], ring[k + 1]], 0.55))

    cv.glow(0, 0, 40, V[2], 0.5 * energy)
    for pts, w in paths:
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            cv.glow_line(x0, y0, x1, y1, 5, V[2], 0.3 * w * energy)
    for pts, w in paths:
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            cv.streak(x0, y0, x1, y1, 1.6 * w * (0.5 + 0.5 * energy), 1.2 * w * (0.5 + 0.5 * energy), V[1],
                      min(1.0, 0.3 + energy))
    for pts, w in paths:
        if w < 0.9 or energy < 0.15:
            continue
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            cv.streak(x0, y0, x1, y1, 0.6, 0.6, V[0], min(1.0, energy * 1.4))
    if f == 0:
        cv.star(0, 0, [16, 8] * 4, 5, rot=0.4, c=V[0])
        cv.glow(0, 0, 30, V[0], 0.5)
    elif f < 4:
        cv.disc(0, 0, 7 - f, V[1], energy)
    sf.edge_fade(cv)
