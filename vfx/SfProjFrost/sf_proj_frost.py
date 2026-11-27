"""Slot Five: Frost projectile. Loop, 8 frames (4x2), 64x64, alpha blend (solid ice body, no light sheet).
Drawn flying RIGHT: a long faceted ice shard, tip to the right. Game rotates the sprite to the flight angle.
A white glint slides along the shard once per loop; cold mist and ice chips trail behind.
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
META = sf.meta("sf_proj_frost", (64, 64), (34, 32), DURATION, FRAMES, True, "alpha",
               "projectile center, rotate to flight angle", seed=8, length=46.0, width=15.0)

OUTLINE = (0.16, 0.36, 0.70)


def draw(cv, t, o):
    ph = (t % DURATION) / DURATION
    F = np.array(sf.FROST)
    L, W = o["length"], o["width"]
    tip, tail = L * 0.6, -L * 0.4

    # cold mist trail (thin, semi-transparent body)
    def mist(X, Y):
        back = fx.sat((tail + 6 - X) / 24)
        w = 4.5 * (1 - back) + 0.5
        n = fx.perlin2(X / 8 + ph * 4, Y / 6, o["seed"], period=(4, 16))
        a = fx.sat((w - np.abs(Y)) / 2) * fx.sat(1 - back) * (0.35 + 0.25 * n) * fx.sat((tail + 8 - X) / 4)
        return np.broadcast_to(F[2], X.shape + (3,)), fx.sat(a), None
    cv.shade(-32, -8, tail + 10, 8, mist)

    for i in range(4):                                       # ice chips drifting back
        f = (ph + i / 4) % 1
        x = tail + 2 - 18 * f
        y = (-1) ** i * (3 + 5 * f)
        s = 2.2 * (1 - f) + 0.3
        cv.poly(x, y, sf.rot([(s, 0), (0, -s * 0.7), (-s, 0), (0, s * 0.7)], f * 3 + i), F[1], 1 - f ** 2)

    # shard: outline, dark lower facet, light upper facet, white ridge
    def shard_sd(X, Y, grow=0.0):
        # diamond |x|/a + |y|/b <= 1 with different a front / back
        a = np.where(X > 0, tip, -tail) + grow
        b = W / 2 + grow
        return (np.abs(X) / a + np.abs(Y) / b - 1) * min(a.min(), b) * 0.45

    def body(X, Y):
        d_out = shard_sd(X, Y, 1.3)
        d_in = shard_sd(X, Y)
        a = fx.cov(d_out)
        inner = fx.cov(d_in)
        col = np.where((Y < 0)[..., None], F[1], F[2])
        col = np.where(((Y < 0) & (X > tail * 0.1) & (Y > -W * 0.18 * (1 - X / tip)))[..., None], F[0], col)
        ridge = np.abs(Y + 0.6) < 0.8
        col = np.where(ridge[..., None], F[0], col)
        gx = tail - 8 + (tip - tail + 20) * ph                 # glint sweeps tail -> tip
        glint = (np.abs((X - gx) + Y * 0.6) < 1.2) & (inner > 0.5)
        col = np.where(glint[..., None], np.array([1.0, 1.0, 1.0]), col)
        col = col * inner[..., None] + np.array(OUTLINE) * (1 - inner[..., None])
        return col, a, None
    cv.shade(tail - 3, -W / 2 - 3, tip + 3, W / 2 + 3, body)
    sf.edge_fade(cv)
