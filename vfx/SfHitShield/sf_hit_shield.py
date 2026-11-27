"""Slot Five: Shield hit. One shot 0.24 s, 12 frames (4x3), 112x96, additive, on the spinning side's fighter.
Beat: a blue bubble pops up around the fighter with an overshoot -> settles, highlight on the top-left ->
the rim breaks into arcs and sparkles that drift outward. Ends empty.
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
META = sf.meta("sf_hit_shield", (112, 96), (56, 48), DURATION, FRAMES, False, "add",
               "spinning side fighter center", seed=81, radius=38.0, sparkles=10)


def draw(cv, t, o):
    D = DURATION
    if t >= D - 1e-6:
        return
    u = t / D
    S = np.array(sf.SHIELD)
    rng = np.random.RandomState(o["seed"])
    grow = sf.out_back(0.25 + t / 0.07 * 0.75, 2.2) if t < 0.07 else 1.0
    R = o["radius"] * grow + 5 * sf.smooth(0.5, 1.0, u)
    brk = sf.smooth(0.45, 0.95, u)                               # rim breaks into arcs
    fade = 1 - sf.smooth(0.7, 1.0, u)
    flash = math.exp(-t / 0.035)

    def fn(X, Y):
        Yq = Y / 0.92
        r = np.hypot(X, Yq)
        ang = np.arctan2(Yq, X)
        n = fx.perlin2(np.cos(ang) * 2 + 4, np.sin(ang) * 2 + 4, o["seed"]) * 0.5 + 0.5
        keep = fx.smoothstep(brk - 0.05, brk + 0.05, n)
        rim_w = 3.2 * (1 - 0.5 * brk)
        rim = fx.cov(np.abs(r - R) - rim_w / 2) * keep
        film = fx.cov(r - R) * (0.14 + 0.36 * flash) * (1 - brk)
        hl = fx.cov(np.abs(r - R * 0.72) - 1.6) * fx.sat(1 - np.abs(ang + 2.25) / 0.45) * (1 - brk)
        col = np.where((rim > 0.01)[..., None], S[1], S[3])
        col = np.where((hl > 0.01)[..., None], S[0], col)
        a = np.maximum(np.maximum(rim, film), hl) * fade
        return col, a, None

    cv.glow_ring(0, 0, R, 7, S[2], 0.45 * fade, sy=0.92)
    cv.shade(-R - 6, -R - 6, R + 6, R + 6, fn)
    for i in range(o["sparkles"]):
        a = rng.uniform(0, sf.TAU)
        w = (u - 0.45) / 0.55
        if w <= 0:
            continue
        d = R + 8 * sf.drag(w, 3)
        x, y = math.cos(a) * d, math.sin(a) * d * 0.92
        k = 1 - sf.smooth(0.5, 1.0, w)
        if abs(y) < 44 and abs(x) < 52:
            cv.disc(x, y, 1.4 * k + 0.2, S[0], k)
            cv.glow(x, y, 5, S[1], 0.4 * k)
    sf.edge_fade(cv)
