"""Slot Five: Block. One shot 0.24 s, 12 frames (4x3), 96x96, additive, over the sf_hit_* of a damage cast
that the shield absorbed. A hexagonal shield face flares white, cracks race out from the impact point,
then the plate fades and the cracks are the last to go. Ends empty.
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
META = sf.meta("sf_block", (96, 96), (48, 48), DURATION, FRAMES, False, "add",
               "target fighter center, on top of sf_hit_*", seed=91, radius=38.0, cracks=6)

PLATE = (0.55, 0.80, 1.0)


def hex_sd(X, Y, r):
    q = np.abs(X), np.abs(Y)
    # pointy-top hexagon
    return np.maximum(q[0] * 0.8660254 + q[1] * 0.5, q[1]) - r


def draw(cv, t, o):
    D = DURATION
    if t >= D - 1e-6:
        return
    u = t / D
    S = np.array(sf.SHIELD)
    R = o["radius"] * (1 + 0.06 * math.exp(-t / 0.03))           # small recoil pop
    flare = math.exp(-t / 0.04)
    plate_k = 1 - sf.smooth(0.3, 0.8, u)
    crack_k = 1 - sf.smooth(0.6, 1.0, u)

    def fn(X, Y):
        d = hex_sd(X, Y, R)
        body = fx.cov(d)
        rim = fx.cov(np.abs(d + 1.5) - 1.5)
        inner = fx.cov(np.abs(d + 7) - 0.7)
        a = np.maximum(rim * (0.5 + 0.5 * plate_k), body * (0.18 + 0.6 * flare) * plate_k)
        a = np.maximum(a, inner * 0.5 * plate_k)
        col = np.where((rim > 0.01)[..., None], S[1], np.broadcast_to(np.array(PLATE) * (0.6 + 0.4 * flare), X.shape + (3,)))
        return col, a * crack_k, None

    cv.glow(0, 0, R + 6, S[2], 0.4 * plate_k * crack_k)
    cv.shade(-R - 3, -R - 3, R + 3, R + 3, fn)

    rng = np.random.RandomState(o["seed"])
    grow = sf.out_expo(min(1.0, (t + 0.01) / 0.07))
    base = rng.uniform(0, sf.TAU)
    for i in range(o["cracks"]):
        a = base + i * sf.TAU / o["cracks"] + rng.uniform(-0.35, 0.35)
        L = rng.uniform(0.75, 0.95) * R
        pts = sf.zigzag(rng.randint(1 << 30), (0, 0), (math.cos(a) * L, math.sin(a) * L), 4, 4.0)
        fork = None
        if rng.rand() < 0.7:
            j = rng.randint(1, 4)
            x, y = pts[j]
            fa = a + rng.choice([-1, 1]) * rng.uniform(0.5, 0.9)
            fl = rng.uniform(7, 12)
            fork = [(x, y), (x + math.cos(fa) * fl, y + math.sin(fa) * fl)]
        segs = list(zip(pts, pts[1:]))
        show = grow * len(segs)
        for k, (p0, p1) in enumerate(segs):
            if k >= show:
                break
            f = min(1.0, show - k)
            p1 = (p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f)
            cv.glow_line(*p0, *p1, 3, S[1], 0.35 * crack_k)
            cv.streak(*p0, *p1, 1.1, 0.8, S[0], crack_k)
        if fork and grow > 0.6:
            cv.streak(*fork[0], *fork[1], 0.8, 0.4, S[0], crack_k * min(1, (grow - 0.6) / 0.3))
    if t < 0.05:
        k = 1 - t / 0.05
        cv.star(0, 0, [20 * k + 4, 8 * k + 2] * 4, 4 * k + 2, rot=0.0, c=S[0])
        cv.glow(0, 0, 28, S[0], 0.6 * k)
    sf.edge_fade(cv)
