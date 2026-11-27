"""Slot Five: Blade projectile. Loop, 8 frames (4x2), 64x64, additive, no flight direction.
A silver crescent blade spinning one full turn per loop (clockwise). Three fading after-images fill the
45 deg jump between frames so the spin reads as motion, not as a flicker.
"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "SfCommon"))
import fxlib as fx  # noqa: E402
import sf_common as sf  # noqa: E402

FRAMES = 8
DURATION = 0.32
META = sf.meta("sf_proj_blade", (64, 64), (32, 32), DURATION, FRAMES, True, "add",
               "projectile center, no rotation", radius=20.0, bite=18.0, offset=7.0,
               ghosts=[(0.22, 0.5), (0.44, 0.28), (0.66, 0.13)])


def crescent(X, Y, ang, o):
    """SDF of a crescent: disc minus an offset disc. ang = direction the crescent's belly faces."""
    ox, oy = math.cos(ang) * -o["offset"], math.sin(ang) * -o["offset"]
    d1 = fx.sd_circle(X, Y, o["radius"])
    d2 = fx.sd_circle(X - ox, Y - oy, o["bite"])
    return np.maximum(d1, -d2), d2


def draw(cv, t, o):
    ph = (t % DURATION) / DURATION
    base = ph * sf.TAU                                          # y down: increasing angle = clockwise on screen
    B = np.array(sf.BLADE)

    def fn(X, Y):
        rgb = np.zeros(X.shape + (3,))
        a = np.zeros(X.shape)
        for lag, k in o["ghosts"][::-1]:
            d, _ = crescent(X, Y, base - lag, o)
            g = fx.cov(d) * k
            rgb = rgb * (1 - g[..., None]) + B[3] * g[..., None]
            a = a + g * (1 - a)
        d, d2 = crescent(X, Y, base, o)
        c = fx.cov(d)
        edge = fx.sat(1 - (-d) / 1.6)                            # bright cutting rim on the outer edge
        outer = np.hypot(X, Y) > o["radius"] - 2.2
        col = np.where(outer[..., None], B[0], B[1])
        col = np.where(((~outer) & (d2 < 2.0))[..., None], B[2], col)
        col = col * (0.75 + 0.25 * edge[..., None])
        rgb = rgb * (1 - c[..., None]) + col * c[..., None]
        a = a + c * (1 - a)
        return rgb, a, None

    cv.shade(-26, -26, 26, 26, fn)
    cv.glow(math.cos(base) * 20, math.sin(base) * 20, 12, B[1], 0.25)   # sheen on the belly of the blade
    sf.edge_fade(cv)
