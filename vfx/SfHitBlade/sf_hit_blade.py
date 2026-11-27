"""Slot Five: Blade hit. One shot 0.24 s, 12 frames (4x3), 112x96, additive.
Beat: one fast silver slash cuts diagonally through the target (head out_cubic, tail chases) -> a white
flash and a few silver sparks kick off at the cut point -> the stroke thins from the tail and is gone.
"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "SfCommon"))
import fxlib as fx  # noqa: E402
import sf_common as sf  # noqa: E402
import stylize as st  # noqa: E402

FRAMES = 12
DURATION = 0.24
META = sf.meta("sf_hit_blade", (112, 96), (56, 48), DURATION, FRAMES, False, "add",
               "target fighter center", seed=61, radius=70.0, width=5.5, center=(-42.0, 56.0),
               a0=-1.6, a1=-0.27, sparks=7)


def draw(cv, t, o):
    D = DURATION
    if t >= D - 1e-6:
        return
    u = t / D
    B = np.array(sf.BLADE)
    cx, cy = o["center"]
    R, W = o["radius"], o["width"]
    k_slash = min(1.0, 0.1 + u / 0.85)

    def fn(X, Y):
        d, v, s = st.slash_arc(X - cx, Y - cy, R, W, o["a0"], o["a1"], k_slash, head_end=0.3, tail_start=0.15,
                               taper=0.35)
        a = fx.cov(d)
        idx = np.select([(v > 0.55) & (s > 0.35), s > 0.5, s > 0.2], [0, 1, 2], 3)
        return B[idx], a, B[1] * (fx.sat(1 - np.abs(d) / 6) * 0.15 * (1 - u))[..., None]

    cv.shade(-54, -46, 54, 46, fn)
    if 0.04 < u < 0.6:                                          # white cut flash where the blade crosses the target
        k = 1 - (u - 0.04) / 0.56
        cv.glow(0, 0, 26, B[1], 0.6 * k)
        cv.star(0, 0, [16 * k + 2, 5 * k + 1, 16 * k + 2, 5 * k + 1], 1.6 * k + 0.5, rot=0.85, c=B[0], a=min(1, k * 1.5))
    rng = np.random.RandomState(o["seed"])
    for i in range(o["sparks"]):
        a = -0.75 + math.pi / 2 * rng.choice([-1, 1]) + rng.uniform(-0.5, 0.5)
        v0 = rng.uniform(0.7, 1.0)
        w = (u - 0.08) / 0.92
        if w <= 0:
            continue
        d = 40 * v0 * sf.drag(w, 5)
        x, y = math.cos(a) * d, math.sin(a) * d + 12 * w * w
        L = 10 * (1 - w) + 2
        k = 1 - sf.smooth(0.5, 1.0, w)
        if k > 0:
            cv.streak(x, y, x - math.cos(a) * L, y - math.sin(a) * L, 0.8, 0.15, B[0], k)
    sf.edge_fade(cv)
