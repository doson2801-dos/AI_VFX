"""Slot Five: Heal projectile. Loop, 8 frames (4x2), 64x64, additive, no flight direction.
A soft green orb with a white plus at its heart, a breathing halo and three motes circling it (120 deg per loop).
"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "SfCommon"))
import sf_common as sf  # noqa: E402

FRAMES = 8
DURATION = 0.4
META = sf.meta("sf_proj_heal", (64, 64), (32, 32), DURATION, FRAMES, True, "add",
               "projectile center, no rotation", radius=9.0, orbit=15.0)


def draw(cv, t, o):
    ph = (t % DURATION) / DURATION
    G = np.array(sf.HEAL)
    breathe = 0.5 + 0.5 * math.cos(sf.TAU * ph)
    R = o["radius"] * (1 + 0.06 * breathe)
    cv.glow(0, 0, 24 + 3 * breathe, G[2], 0.32 + 0.12 * breathe)
    cv.disc(0, 0, R + 2, G[3], 0.7)
    cv.disc(0, 0, R, lambda u: G[np.clip((u * 2.6).astype(int), 0, 3)])
    s = 5.2
    cv.streak(-s, 0, s, 0, 1.7, 1.7, G[0])                    # plus
    cv.streak(0, -s, 0, s, 1.7, 1.7, G[0])
    for i in range(3):
        a = sf.TAU * (i / 3 + ph / 3) - math.pi / 2
        x, y = math.cos(a) * o["orbit"], math.sin(a) * o["orbit"] * 0.85
        cv.glow(x, y, 6, G[1], 0.45)
        cv.disc(x, y, 1.7, G[0])
    sf.edge_fade(cv)
