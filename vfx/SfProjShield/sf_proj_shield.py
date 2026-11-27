"""Slot Five: Shield projectile. Loop, 8 frames (4x2), 64x64, additive, no flight direction.
A hollow blue ring of light with a faint inner film; a bright highlight runs once around the ring per loop.
"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "SfCommon"))
import fxlib as fx  # noqa: E402
import sf_common as sf  # noqa: E402

FRAMES = 8
DURATION = 0.4
META = sf.meta("sf_proj_shield", (64, 64), (32, 32), DURATION, FRAMES, True, "add",
               "projectile center, no rotation", radius=15.0, width=3.6)


def draw(cv, t, o):
    ph = (t % DURATION) / DURATION
    S = np.array(sf.SHIELD)
    R, W = o["radius"], o["width"]
    head = ph * sf.TAU - math.pi / 2

    def fn(X, Y):
        r = np.hypot(X, Y)
        ang = np.arctan2(Y, X)
        lag = (head - ang) % sf.TAU                              # 0 at the highlight, grows behind it
        hi = np.exp(-lag / 1.1)
        film = fx.cov(r - R) * 0.28
        ring = fx.cov(np.abs(r - R) - W / 2)
        col = np.where((hi > 0.45)[..., None], S[0], np.where((hi > 0.12)[..., None], S[1], S[2]))
        col = np.where((ring > 0)[..., None], col, S[3])
        a = np.maximum(ring, film)
        return col, a, None

    cv.glow_ring(0, 0, R, 7, S[2], 0.4)
    cv.shade(-R - 4, -R - 4, R + 4, R + 4, fn)
    cv.glow(math.cos(head) * R, math.sin(head) * R, 7, S[0], 0.45)
    sf.edge_fade(cv)
