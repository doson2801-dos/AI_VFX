"""Slot Five: Earth hit. One shot 0.24 s, 12 frames (4x3), 112x96, alpha blend (Body only, no glow: earth is matte).
Beat: rock chunks burst out of the target and arc down -> a brown dust cloud rolls outward and upward ->
dust thins from the edges in and is gone. Ends empty.
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
META = sf.meta("sf_hit_earth", (112, 96), (56, 48), DURATION, FRAMES, False, "alpha",
               "target fighter center", seed=51, puffs=8, rocks=7)

OUTLINE = (0.14, 0.09, 0.05)
DUST = [(0.70, 0.55, 0.37), (0.55, 0.41, 0.26), (0.40, 0.29, 0.18)]


def draw(cv, t, o):
    D = DURATION
    if t >= D - 1e-6:
        return
    u = t / D
    rng = np.random.RandomState(o["seed"])
    E = sf.EARTH
    n = o["puffs"]
    pa = (np.arange(n) + rng.uniform(-0.3, 0.3, n)) / n * sf.TAU
    pd = rng.uniform(14, 21, n)
    pr = rng.uniform(8, 12, n)
    nr = o["rocks"]
    ra = -math.pi / 2 + (np.arange(nr) - (nr - 1) / 2) / nr * 4.2 + rng.uniform(-0.2, 0.2, nr)
    rv = rng.uniform(0.8, 1.0, nr)
    rs = rng.uniform(3.5, 5.5, nr)
    rspin = rng.uniform(-14, 14, nr)
    rshape = [rng.uniform(0.7, 1.0, 6) for _ in range(nr)]
    eq = fx.fbm_equalizer(o["seed"], 3)

    # dust cloud
    e = sf.drag(u, 6)
    puffs = [(0.0, 2 - 6 * e, 9 + 10 * e, 1.2, 1.0)]
    for i in range(n):
        d = pd[i] * e
        puffs.append((math.cos(pa[i]) * d * 1.2, math.sin(pa[i]) * d * 0.7 - 8 * e, pr[i] * (0.5 + 0.6 * e), 1.0, 0.7))
    thin = sf.smooth(0.25, 0.95, u)

    def dust(X, Y):
        Ed, heat = st.puff_cluster(X, Y, puffs, thr=0.25)
        nz = eq(fx.fbm(X / 11, Y / 11, o["seed"] + 5, 3))
        Ed = st.carve(Ed, nz - 0.45, 0.3)
        Ed = Ed - np.maximum(thin * 1.3 - nz * 0.8, 0) * 1.5
        a = fx.cov_field(-Ed) * (1 - sf.smooth(0.85, 1.0, u))
        shade = Y + (nz - 0.5) * 10                                # top lit, bottom in shadow
        idx = np.select([shade < -8, shade < 6], [0, 1], 2)
        return np.array(DUST)[idx], a, None

    cv.shade(-54, -46, 54, 44, dust)

    # rock chunks: ballistic, dark outline, two-tone
    for i in range(nr):
        d = 48 * rv[i] * sf.drag(u, 4)
        x = math.cos(ra[i]) * d * 1.05
        y = math.sin(ra[i]) * d * 0.8 + 34 * u * u
        s = rs[i] * (1 - sf.smooth(0.6, 1.0, u))
        if s < 0.6:
            continue
        a0 = rspin[i] * t
        pts = [(math.cos(a0 + j * sf.TAU / 6) * s * rshape[i][j], math.sin(a0 + j * sf.TAU / 6) * s * rshape[i][j])
               for j in range(6)]
        big = [(px * (s + 1.3) / s, py * (s + 1.3) / s) for px, py in pts]
        cv.poly(x, y, big, OUTLINE)
        cv.poly(x, y, pts, E[1])
        cv.poly(x - s * 0.18, y - s * 0.18, [(px * 0.55, py * 0.55) for px, py in pts], E[0])
    if t < 0.03:                                                   # dull impact pop, no glow
        k = 1 - t / 0.03
        cv.star(0, 0, [20 * k + 6, 12 * k + 4] * 4, 6 * k + 3, rot=0.4, c=DUST[0])
    sf.edge_fade(cv)
