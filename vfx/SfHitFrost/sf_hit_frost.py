"""Slot Five: Frost hit. One shot 0.24 s, 12 frames (4x3), 112x96, alpha blend: Body (solid ice) + Light (cold flash).
Beat: a spiky ice crystal snaps shut on the target (frames 0-1) -> shatters into faceted shards that fly out,
spin and shrink -> a few chips and a thin frost ring are the last thing to go. Ends empty.
"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "SfCommon"))
import sf_common as sf  # noqa: E402

FRAMES = 12
DURATION = 0.24
META = sf.meta("sf_hit_frost", (112, 96), (56, 48), DURATION, FRAMES, False, "alpha",
               "target fighter center", seed=41, shards=9, chips=8)

OUTLINE = (0.16, 0.36, 0.70)


def facet_shard(cv, x, y, L, W, ang, k):
    """Two-tone shard (light upper facet, darker lower) with a blue outline, pointing along `ang`."""
    F = sf.FROST
    o = sf.shard(L + 2.2, W + 2.2)
    cv.poly(x, y, sf.rot(o, ang), OUTLINE, k)
    full = sf.shard(L, W)
    cv.poly(x, y, sf.rot(full, ang), F[2], k)
    top = [full[0], full[1], full[2]]
    cv.poly(x, y, sf.rot(top, ang), F[1], k)
    cv.streak(*_rp(x, y, full[0][0] * 0.8, -0.4, ang), *_rp(x, y, full[2][0] * 0.4, -0.4, ang), 0.55, 0.4, F[0], k)


def _rp(x, y, px, py, a):
    c, s = math.cos(a), math.sin(a)
    return x + px * c - py * s, y + px * s + py * c


def draw(cv, t, o):
    D = DURATION
    if t >= D - 1e-6:
        return
    u = t / D
    rng = np.random.RandomState(o["seed"])
    F = sf.FROST
    n = o["shards"]
    angs = (np.arange(n) + rng.uniform(-0.3, 0.3, n)) / n * sf.TAU
    sp = rng.uniform(14, 40, n)
    ln = rng.uniform(11, 17, n)
    spin = rng.uniform(-2.0, 2.0, n)

    if t < 0.04:                                                 # crystal snaps closed, then breaks
        k = sf.out_back(0.5 + t / 0.02 * 0.5) if t < 0.02 else 1.0
        lens = [(22 if i % 2 == 0 else 14) * k for i in range(10)]
        cv.star(0, 0, [L + 2 for L in lens], 7 * k + 2, rot=0.2, c=OUTLINE)
        cv.star(0, 0, lens, 7 * k, rot=0.2, c=F[1])
        cv.star(-1, -1, [L * 0.55 for L in lens], 4 * k, rot=0.2, c=F[0])
        cv.glow(0, 0, 40, F[1], 0.55)
        sf.edge_fade(cv)
        return

    v = (t - 0.04) / (D - 0.04)
    e = sf.drag(v, 5)
    size = 1 - sf.smooth(0.55, 1.0, v)
    fade = 1 - sf.smooth(0.75, 1.0, v)
    ring_r = 16 + 30 * sf.drag(v, 4)                              # thin frost ring (light only)
    cv.glow_ring(0, 0, ring_r, 3, F[1], 0.35 * (1 - v) ** 2, sy=0.85)
    cv.glow(0, 0, 30, F[1], 0.4 * math.exp(-(t - 0.04) / 0.03))
    for i in range(o["chips"]):                                   # small chips, faster, die early
        a = rng.uniform(0, sf.TAU)
        d = rng.uniform(36, 46) * sf.drag(v, 6)
        s = 2.4 * (1 - sf.smooth(0.3, 0.8, v))
        if s > 0.1:
            x, y = math.cos(a) * d * 1.1, math.sin(a) * d * 0.85 + 10 * v * v
            cv.poly(x, y, sf.rot([(s, 0), (0, -s * 0.7), (-s, 0), (0, s * 0.7)], a + v * 4), F[0], fade)
    for i in range(n):
        d = sp[i] * e + 4
        x, y = math.cos(angs[i]) * d * 1.1, math.sin(angs[i]) * d * 0.85 + 34 * v * v
        L = ln[i] * (0.35 + 0.65 * size)
        if L > 2.5:
            facet_shard(cv, x, y, L, L * 0.42, angs[i] + spin[i] * v, fade)
    sf.edge_fade(cv)
