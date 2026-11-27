"""Slot Five: Chain flash. One shot 0.48 s, 16 frames (4x4), 96x96, additive, WHITE: the game tints it with
the icon colour of the cell (sprite.setTint). Covers exactly one 96x96 cell, centre = cell centre.
Beat: rim lights up and the cell blinks (0-60 ms) -> a diagonal light band sweeps top-left to bottom-right
(40-320 ms) -> rim glows and fades out (to 480 ms). Ends empty.
"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "SfCommon"))
import fxlib as fx  # noqa: E402
import sf_common as sf  # noqa: E402

FRAMES = 16
DURATION = 0.48
META = sf.meta("sf_chain_flash", (96, 96), (48, 48), DURATION, FRAMES, False, "add",
               "cell center, tint = icon colour", half=41.0, corner=11.0, band=13.0)

WHITE = np.array([1.0, 1.0, 1.0])


def rbox(X, Y, h, r):
    qx, qy = np.abs(X) - h + r, np.abs(Y) - h + r
    return np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - r


def draw(cv, t, o):
    D = DURATION
    if t >= D - 1e-6:
        return
    u = t / D
    h, c = o["half"], o["corner"]
    blink = math.exp(-t / 0.05)
    rim_k = (0.55 + 0.45 * blink) * (1 - sf.smooth(0.55, 1.0, u))
    sw = (t - 0.04) / 0.28                                      # sweep progress over 40-320 ms
    pos = -100 + 200 * sf.smooth(0.0, 1.0, sw) if 0 < sw < 1 else None

    def fn(X, Y):
        d = rbox(X, Y, h, c)
        inside = fx.cov(d)
        rim = fx.cov(np.abs(d + 1.4) - 1.4)
        a = rim * rim_k
        a = np.maximum(a, inside * 0.32 * blink)
        if pos is not None:
            diag = (X + Y) * 0.7071
            band = fx.sat(1 - np.abs(diag - pos * 0.7071 * 0.9) / o["band"])
            band = band ** 1.5 * 0.62 * inside
            core = fx.sat(1 - np.abs(diag - pos * 0.7071 * 0.9) / 3.0) * 0.3 * inside
            a = np.maximum(a, band + core)
        return np.broadcast_to(WHITE, X.shape + (3,)), fx.sat(a), None

    cv.shade(-46, -46, 46, 46, fn)
    def glow_rim(X, Y):
        d = rbox(X, Y, h, c)
        g = fx.sat(1 - np.abs(d) / 4.0) ** 2 * 0.35 * rim_k
        return np.zeros(X.shape + (3,)), np.zeros(X.shape), WHITE * g[..., None]
    cv.shade(-46, -46, 46, 46, glow_rim)
    sf.edge_fade(cv, 2)
