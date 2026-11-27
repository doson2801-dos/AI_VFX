"""Slot Five: Fire hit. One shot 0.24 s, 12 frames (4x3), 112x96, additive, centred on the target fighter.
Beat: white-hot pop (frame 0) -> lumpy fireball swells and cools to orange/red -> burns away into embers.
Sparks fly out and fall a little. Ends empty.
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
META = sf.meta("sf_hit_fire", (112, 96), (56, 48), DURATION, FRAMES, False, "add",
               "target fighter center", seed=12, puffs=7, sparks=10)


def draw(cv, t, o):
    D = DURATION
    if t >= D - 1e-6:
        return
    u = t / D
    rng = np.random.RandomState(o["seed"])
    F = np.array(sf.FIRE)
    n = o["puffs"]
    angs = np.arange(n) / n * sf.TAU + rng.uniform(-0.35, 0.35, n)
    dist = rng.uniform(12, 21, n)
    rad = rng.uniform(10, 14, n)
    temp = rng.uniform(0.55, 0.85, n)
    spk_a = (np.arange(o["sparks"]) + rng.uniform(-0.3, 0.3, o["sparks"])) / o["sparks"] * sf.TAU
    spk_v = rng.uniform(0.75, 1.0, o["sparks"])
    eq = fx.fbm_equalizer(o["seed"], 3)

    e = sf.drag(u, 7)
    cool = 1 - 0.85 * u
    puffs = [(0.0, -2 * e, 12 + 10 * e, 1.3, 1.0)]
    for i in range(n):
        d = dist[i] * e
        puffs.append((math.cos(angs[i]) * d * 1.15, math.sin(angs[i]) * d * 0.95 - 4 * u, rad[i] * (0.6 + 0.6 * e), 1.0, temp[i]))

    def fn(X, Y):
        E, heat = st.puff_cluster(X, Y, puffs, thr=0.25)
        nz = eq(fx.fbm(X / 13, Y / 13, o["seed"] + 3, 3))
        E = st.carve(E, nz - 0.4, 0.35)
        burn = sf.smooth(0.3, 0.88, u) * 1.35                  # noise erosion eats the ball late
        E = E - np.maximum(burn - nz * 0.9, 0) * 1.6
        h = heat * cool + 0.25 * (nz - 0.5)
        a = fx.cov_field(-E)
        idx = np.select([h > 0.78, h > 0.55, h > 0.34, h > 0.16], [0, 1, 2, 3], 4)
        return F[idx], a, None

    cv.shade(-50, -44, 50, 42, fn)
    for i in range(o["sparks"]):                               # sparks: out fast, brake, sag
        d = 46 * spk_v[i] * sf.drag(u, 5)
        x, y = math.cos(spk_a[i]) * d * 1.05, math.sin(spk_a[i]) * d * 0.8 + 30 * u * u
        tail = 7 * (1 - u)
        k = 1 - sf.smooth(0.55, 1.0, u)
        if k > 0 and u > 0.04:
            cv.streak(x, y, x - math.cos(spk_a[i]) * tail, y - math.sin(spk_a[i]) * tail, 1.3, 0.3, F[1], k)
    cv.glow(0, 0, 44, F[2], 0.55 * math.exp(-t / 0.05))
    if t < 0.03:                                                # hero pop: frame 0 only
        k = 1 - t / 0.03
        cv.star(0, 0, [26 * k + 4, 14 * k + 3] * 4, 7 * k + 3, rot=0.3, c=F[0])
    sf.edge_fade(cv)
