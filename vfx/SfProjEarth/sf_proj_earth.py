"""Slot Five: Earth projectile. Loop, 8 frames (4x2), 64x64, alpha blend (solid rock body, no light sheet).
A chunky brown boulder with bevelled faces, spinning slowly (90 deg per loop; the rock has 4-fold symmetry so
the loop is seamless). Light is fixed from the top-left, so faces change shade as it turns. No flight direction.
"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "SfCommon"))
import fxlib as fx  # noqa: E402
import sf_common as sf  # noqa: E402

FRAMES = 8
DURATION = 0.48
META = sf.meta("sf_proj_earth", (64, 64), (32, 32), DURATION, FRAMES, True, "alpha",
               "projectile center, no rotation", seed=4, radius=19.0)

QUARTER = [(0.00, 1.00), (0.38, 0.86), (0.80, 0.95), (1.18, 0.84)]   # (angle, radius) inside one 90 deg sector
OUTLINE = (0.14, 0.09, 0.05)
LIGHT = np.array([-0.62, -0.78])


def rock_poly(R, spin):
    pts = []
    for q in range(4):
        for a, r in QUARTER:
            ang = spin + q * math.pi / 2 + a
            pts.append((math.cos(ang) * R * r, math.sin(ang) * R * r))
    return np.array(pts)


def draw(cv, t, o):
    ph = (t % DURATION) / DURATION
    spin = ph * math.pi / 2
    R = o["radius"]
    E = np.array(sf.EARTH)
    outer = rock_poly(R, spin)
    inner = rock_poly(R * 0.58, spin + 0.12) + np.array([-1.5, -1.5])
    n = len(outer)

    def fn(X, Y):
        H = X.shape
        col = np.zeros(H + (3,))
        a = np.zeros(H)

        def inside(P, X, Y):
            ins = np.zeros(H, bool)
            d = np.full(H, 1e9)
            for i in range(len(P)):
                ax, ay = P[i]
                bx, by = P[(i + 1) % len(P)]
                ex, ey = bx - ax, by - ay
                wx, wy = X - ax, Y - ay
                tt = np.clip((wx * ex + wy * ey) / (ex * ex + ey * ey), 0, 1)
                d = np.minimum(d, np.hypot(wx - ex * tt, wy - ey * tt))
                c = ((ay <= Y) & (by > Y)) | ((by <= Y) & (ay > Y))
                ins ^= c & (X < ax + (Y - ay) * ex / (ey + 1e-12))
            return np.where(ins, -d, d)

        d_out = inside(outer, X, Y)
        d_in = inside(inner, X, Y)
        # bevel face index = which outer edge the pixel's angle falls on
        ang = np.arctan2(Y, X)
        face = np.zeros(H, int)
        best = np.full(H, 1e9)
        for i in range(n):
            ax, ay = outer[i]
            bx, by = outer[(i + 1) % n]
            mx, my = (ax + bx) / 2, (ay + by) / 2
            ma = math.atan2(my, mx)
            dd = np.abs((ang - ma + math.pi) % sf.TAU - math.pi)
            better = dd < best
            face = np.where(better, i, face)
            best = np.where(better, dd, best)
        shade_lv = np.zeros(n)
        for i in range(n):
            ax, ay = outer[i]
            bx, by = outer[(i + 1) % n]
            nx, ny = by - ay, -(bx - ax)
            L = math.hypot(nx, ny)
            shade_lv[i] = (nx * LIGHT[0] + ny * LIGHT[1]) / L      # >0 faces the light
        lv = shade_lv[face]
        bevel = np.select([lv < -0.35, lv < 0.25, lv < 0.75], [3, 2, 1], 0)
        idx = np.where(d_in < 0, np.where(X + Y < -R * 0.25, 0, 1), bevel)
        # speckles folded into one sector so they keep the 4-fold symmetry
        q = np.floor(((ang - spin) % sf.TAU) / (math.pi / 2))
        ca, sa = np.cos(-spin - q * math.pi / 2), np.sin(-spin - q * math.pi / 2)
        u, v = X * ca - Y * sa, X * sa + Y * ca
        nz = fx.perlin2(u / 3.2, v / 3.2, o["seed"])
        idx = np.where((nz > 0.6) & (d_out < -2.5), np.minimum(idx + 1, 3), idx)
        col = E[idx]
        rim = fx.sat(0.5 - (d_out + 0.6))                      # dark outline, about 1.5 px
        col = col * rim[..., None] + np.array(OUTLINE) * (1 - rim[..., None])
        a = fx.cov(d_out - 0.9)
        return col, a, None

    cv.shade(-R - 4, -R - 4, R + 4, R + 4, fn)
    sf.edge_fade(cv)
