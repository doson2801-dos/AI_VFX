"""Slot Five: Fire projectile. Loop, 8 frames (4x2), 64x64.
Drawn flying RIGHT: round hot head at the pivot, flame tail licking back to the left.
Game rotates the sprite to the flight angle. Flames scroll backward with periodic noise, so the loop is seamless.
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
META = sf.meta("sf_proj_fire", (64, 64), (40, 32), DURATION, FRAMES, True, "add",
               "projectile center, rotate to flight angle", seed=3, head=12.5, tail=34.0)


def draw(cv, t, o):
    ph = (t % DURATION) / DURATION
    R, L = o["head"], o["tail"]
    ramp = np.array(sf.FIRE)

    def fn(X, Y):
        back = np.clip(-X / L, 0, 1)                        # 0 at head .. 1 at tail end
        sx = np.where(X > 0, X / R, X / (R + L * 0.95))
        sy = Y / (R * (1 - 0.55 * back))
        r = np.hypot(sx, sy)
        u = X / 12.0 + ph * 4
        n = fx.fbm(u, Y / 9.0, o["seed"], 3, z=np.full(X.shape, ph * 2), period=(4, 16, 2))
        heat = 1.1 - r + n * (0.22 + 0.95 * back)
        heat -= 0.15 * back ** 2
        a = fx.sat(heat / 0.06)
        idx = np.select([heat > 0.86, heat > 0.62, heat > 0.36, heat > 0.14], [0, 1, 2, 3], 4)
        col = ramp[idx]
        return col, a, None

    cv.shade(-40, -32, 24, 32, fn)
    cv.glow(1, 0, 20, sf.FIRE[2], 0.42)
    cv.glow(1, 0, 9, sf.FIRE[1], 0.35)
    for i in range(3):                                       # embers drifting back along the tail
        f = (ph + i / 3) % 1
        x = -10 - 26 * f
        y = math.sin((f + i * 0.37) * sf.TAU) * 5
        k = math.sin(math.pi * f)
        cv.disc(x, y, 1.3 * k + 0.2, sf.FIRE[1], k)
        cv.glow(x, y, 4, sf.FIRE[2], 0.3 * k)
    sf.edge_fade(cv)
