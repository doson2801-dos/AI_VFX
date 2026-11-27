"""Slot Five: Heal hit. One shot 0.24 s, 12 frames (4x3), 112x96, additive, on the spinning side's fighter.
Beat: soft green bloom -> motes and little plus signs rise up through the fighter, a thin ring opens at the
base -> they fade near the top. Ends empty.
"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "SfCommon"))
import sf_common as sf  # noqa: E402

FRAMES = 12
DURATION = 0.24
META = sf.meta("sf_hit_heal", (112, 96), (56, 48), DURATION, FRAMES, False, "add",
               "spinning side fighter center", seed=71, motes=12, pluses=5)


def plus(cv, x, y, s, c, k):
    w = max(0.6, s * 0.32)
    cv.streak(x - s, y, x + s, y, w, w, c, k)
    cv.streak(x, y - s, x, y + s, w, w, c, k)


def draw(cv, t, o):
    D = DURATION
    if t >= D - 1e-6:
        return
    u = t / D
    rng = np.random.RandomState(o["seed"])
    G = sf.HEAL
    cv.glow(0, 4, 40, G[2], 0.5 * math.exp(-t / 0.06))
    ring = 10 + 32 * sf.drag(u, 4)                              # base ring, flattened (reads as floor level)
    cv.glow_ring(0, 26, ring, 3, G[1], 0.55 * (1 - u) ** 1.5, sy=0.32)
    cv.ellipse_ring(0, 26, ring, 1.2, G[1], a=(1 - u) ** 1.5, sy=0.32)

    def riser(n, kind):
        xs = rng.uniform(-34, 34, n)
        y0 = rng.uniform(4, 28, n)
        rise = rng.uniform(40, 60, n)
        dl = rng.uniform(0.0, 0.3, n)
        sz = rng.uniform(0.8, 1.2, n)
        for i in range(n):
            w = (u - dl[i]) / (1 - dl[i])
            if w <= 0:
                continue
            y = y0[i] - rise[i] * sf.drag(w, 3)
            x = xs[i] * (1 - 0.25 * w) + math.sin(w * 6 + i) * 2
            if y < -42:
                continue
            k = min(1.0, w * 6) * (1 - sf.smooth(0.55, 1.0, w))
            if kind == "mote":
                cv.glow(x, y, 6 * sz[i], G[2], 0.4 * k)
                cv.disc(x, y, 1.6 * sz[i], G[0], k)
            else:
                cv.glow(x, y, 8, G[2], 0.35 * k)
                plus(cv, x, y, 4.2 * sz[i], G[1], k)
                plus(cv, x, y, 2.6 * sz[i], G[0], k)

    riser(o["motes"], "mote")
    riser(o["pluses"], "plus")
    if t < 0.03:
        k = 1 - t / 0.03
        cv.disc(0, 4, 9 * k + 3, G[1], 0.9)
        plus(cv, 0, 4, 7 * k + 3, G[0], 1.0)
    sf.edge_fade(cv)
