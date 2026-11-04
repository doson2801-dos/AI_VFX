"""codefx smoke: the project's own smoke method (not pixelfx's).

Art lead 2026-11-03: the pixelfx per-ball sphere shading (draw_lobes: 3 hard tones per ball, rim erosion into
scattered bits) is DROPPED - it reads as stiff plastic balls. Backup: Docs/VFX/_ArtDirection/_archive/codefx_lobe_smoke_2026-11-03/.

Ported from Shape Lab (tools/shape_lab.html: smokeGeom, shadeField, renderField dissolve) and SmokeStylized3D:
  - silhouette = ONE big body + lobes hugging it, "big inside, small outside" (art lead sketch art/smoke_shape_sketch_v1.png),
    compact cluster, flat bottom. Rejected before: round/elliptic blob, long cluster, lobes far apart, per-lobe ring dissolve.
  - shading = whole-cluster toon trick: sample the silhouette a little AWAY from the light; where that point is outside,
    the pixel is on the far side of a lobe -> a shadow crescent hugging each lobe. 2 tones (Smoke05), light 60 deg top-right.
  - dissolve = CoreOut: block-wise from the cluster core outwards, sharp edge with a dark rim, small lobes first,
    paced by AREA (progress 0.3 removes 30 % of the area -> frames lose area evenly; frame 1 = 100 %, last = 0 %).
"""
import math

import numpy as np

import codefx as cf

SMOKE_DEF = dict(body=0.5, lobes=7, spread=0.8, arc=290.0, rot=0.0, flat=0.25, rMax=0.34, rMin=0.14, order=0.75, jitter=0.3)
SHADE_DEF = dict(angle=60.0, size=0.16, bump=0.3, scale=5.0, bands=2, thresh=0.5, soft=0.02, shadow=0.68)
DISSOLVE_DEF = dict(noise=0.55, scale=3.2, edge=0.02, stagger=0.4, rim=0.022)


def cells(x, y, seed=0):
    """Voronoi 'Cells' noise: one random value per cell, so whole blocks vanish together (SmokeStylized Cells)."""
    ix, iy = np.floor(x).astype(np.int64), np.floor(y).astype(np.int64)
    best = np.full(x.shape, 1e9)
    val = np.zeros(x.shape)
    for oy in (-1, 0, 1):
        for ox in (-1, 0, 1):
            cx, cy = ix + ox, iy + oy
            px = cx + cf._hash2(cx, cy, seed)
            py = cy + cf._hash2(cx, cy, seed + 7)
            d = (x - px) ** 2 + (y - py) ** 2
            m = d < best
            best = np.where(m, d, best)
            val = np.where(m, cf._hash2(cx, cy, seed + 13), val)
    return val


def _mulberry32(a):
    a &= 0xFFFFFFFF

    def r():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = a
        t = ((t ^ (t >> 15)) * (1 | t)) & 0xFFFFFFFF
        t = ((t + (((t ^ (t >> 7)) * (61 | t)) & 0xFFFFFFFF)) ^ t) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return r


def smoke_geom(seed=7, **kw):
    """Shape Lab smokeGeom (y UP, body radius 0.5). Returns circles [(x, y, r, is_body)] and cut (y-up) or None."""
    p = dict(SMOKE_DEF)
    p.update(kw)
    rnd = _mulberry32(int(seed) * 104729 + 7)
    n = int(round(p["lobes"]))
    rot, arc = math.radians(p["rot"]), math.radians(p["arc"])
    full = p["arc"] >= 355
    rnd()
    circles = [(0.0, 0.0, p["body"], True)]
    for i in range(n):
        u = i / n if full else (0.5 if n == 1 else i / (n - 1))
        ja = (rnd() - 0.5) * p["jitter"] * (arc / max(n, 1))
        ang = math.pi / 2 + rot + (u - 0.5) * arc + ja
        rr_rand = p["rMin"] + (p["rMax"] - p["rMin"]) * rnd()
        ordv = p["rMin"] + (p["rMax"] - p["rMin"]) * (1 - abs(u - 0.5) * 2) ** 0.8
        rr = rr_rand * (1 - p["order"]) + ordv * p["order"]
        rnd()
        d = p["body"] * (0.55 + 0.5 * p["spread"]) + rr * (p["spread"] - 0.5) * 0.6 + (rnd() - 0.5) * p["jitter"] * 0.2 * p["body"]
        rnd()
        circles.append((math.cos(ang) * d, math.sin(ang) * d, max(0.01, rr), False))
    cut = None
    if p["flat"] > 0.001:
        miny = min(y - r for _, y, r, _ in circles)
        cut = miny + p["flat"] * (-miny) * 0.6
    return circles, cut


def blur(img, sigma):
    """Gaussian-ish blur, 3 box passes (Shape Lab gauss)."""
    if sigma < 0.35:
        return img
    R = max(1, int(round((math.sqrt(4 * sigma * sigma + 1) - 1) / 2)))
    a = img.astype(np.float64)
    for _ in range(3):
        c = np.cumsum(np.pad(a, ((R + 1, R), (0, 0)), mode="edge"), axis=0)
        a = (c[2 * R + 1:] - c[:-2 * R - 1]) / (2 * R + 1)
        c = np.cumsum(np.pad(a, ((0, 0), (R + 1, R)), mode="edge"), axis=1)
        a = (c[:, 2 * R + 1:] - c[:, :-2 * R - 1]) / (2 * R + 1)
    return a


class Smoke:
    """Union of smoke clusters painted as ONE toon silhouette over the whole canvas.
    add(cx, cy, size, seed, **geom): cluster whose flat bottom sits on cy (canvas y DOWN); size = body diameter x2 roughly."""

    def __init__(self, cv):
        self.cv = cv
        self.sl, self.X, self.Y = cv._box(-cv.ox, -cv.oy, cv.w - cv.ox, cv.h - cv.oy, pad=0)
        self.A0 = np.zeros(self.X.shape)
        self.lobe = np.ones(self.X.shape)       # size (0..1 of the cluster's biggest lobe) of the lobe owning the pixel
        self.S = 1.0

    def add(self, cx, cy, size, seed=7, expand=0.0, **kw):
        """expand: pushes lobes away from the body (0 = Shape Lab layout), for a cluster that opens up over time."""
        circles, cut = smoke_geom(seed, **kw)
        # flat > 0: flat bottom on cy. flat = 0: round bottom, the lowest point of the cluster sits on cy
        base = cut if cut is not None else min(y - r for _, y, r, _ in circles)
        rmax = max(r for _, _, r, b in circles if not b) if len(circles) > 1 else 1
        best = np.zeros(self.X.shape)
        for i, (x, y, r, body) in enumerate(circles):
            if not body and expand:
                x, y = x * (1 + expand), y + (y - base) * expand * 0.5
            px, py, pr = cx + x * size, cy - (y - base) * size, r * size
            cov = self.cv._cov(np.hypot(self.X - px, self.Y - py) - pr)
            own = cov > best
            self.lobe = np.where(own & (cov > 0.5), 1.0 if body else r / rmax, self.lobe)
            best = np.maximum(best, cov)
        if cut is not None:
            best = best * self.cv._cov(self.Y - cy)
        self.A0 = np.maximum(self.A0, best)
        self.S = max(self.S, size)

    def shade(self, seed=1, **kw):
        """Shape Lab shadeField, 'light' mode -> tone 0 (shadow) .. 1 (lit), with hard toon bands."""
        p = dict(SHADE_DEF)
        p.update(kw)
        Spx = self.S * self.cv.res
        off = max(1.0, p["size"] * Spx)
        H = blur(self.A0, max(0.8, off * 0.45))
        an = math.radians(p["angle"])
        lx, ly = math.cos(an), -math.sin(an)
        h, w = self.A0.shape
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float64)
        sx, sy = xx - lx * off, yy - ly * off
        if p["bump"] > 0:
            ns, wb = p["scale"] / Spx, p["bump"] * off
            sx = sx + wb * (cf.fbm2(xx * ns, yy * ns, seed) - 0.5) * 2
            sy = sy + wb * (cf.fbm2(xx * ns + 57, yy * ns + 91, seed + 3) - 0.5) * 2
        sx, sy = np.clip(sx, 0, w - 1.001), np.clip(sy, 0, h - 1.001)
        ix, iy = sx.astype(int), sy.astype(int)
        ax, ay = sx - ix, sy - iy
        T = H[iy, ix] * (1 - ax) * (1 - ay) + H[iy, ix + 1] * ax * (1 - ay) + H[iy + 1, ix] * (1 - ax) * ay + H[iy + 1, ix + 1] * ax * ay
        u = cf.clamp(T + 0.5 - p["thresh"])
        n, sf = int(p["bands"]), max(1e-3, p["soft"])
        if n < 2:
            return u
        q = np.zeros_like(u)
        for j in range(1, n):
            k2 = cf.clamp((u - (j / n - sf)) / (2 * sf))
            q += k2 * k2 * (3 - 2 * k2)
        return q / (n - 1)

    def dissolve(self, prog, seed=1, **kw):
        """CoreOut by area quantile. Returns (alpha, rim) - rim = dark band along the eaten front."""
        p = dict(DISSOLVE_DEF)
        p.update(kw)
        A0 = self.A0
        inside = A0 > 0.5
        z = np.zeros_like(A0)
        if prog <= 0.001 or not inside.any():
            return A0, z
        if prog >= 0.999:
            return z, z
        Spx = self.S * self.cv.res
        Bd = blur(A0, 0.12 * Spx)
        f = 1 - Bd / max(float(Bd[inside].max()), 1e-6)            # cluster core goes first
        f = f - p["stagger"] * 0.5 * (1 - self.lobe)               # small lobes go earlier (SmokeStylized _SizeStagger)
        h, w = A0.shape
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float64)
        ns = p["scale"] / Spx
        # Cells (blocks) + a little value noise to wobble the block borders
        wx = xx * ns + 0.35 * (cf.noise2(xx * ns * 2.3, yy * ns * 2.3, seed + 5) - 0.5)
        wy = yy * ns + 0.35 * (cf.noise2(xx * ns * 2.3 + 31, yy * ns * 2.3 + 17, seed + 6) - 0.5)
        nz = cells(wx, wy, seed)
        F = f * (1 - p["noise"]) + nz * p["noise"]
        F = blur(F, 0.035 * Spx)                                    # round the block borders (no glass-shard edges)
        vals = np.sort(F[inside])
        thr = vals[min(len(vals) - 1, int(prog * len(vals)))]
        # sharp eaten front: 1 px anti-aliased edge whatever the slope of F (SmokeStylized: "mép sắc")
        gy, gx = np.gradient(F)
        k = cf.clamp(0.5 + (F - thr) / (np.sqrt(gx * gx + gy * gy) + 1e-6))
        A = A0 * k
        # dark rim: a thin band just inside the eaten front only (not along the original outline)
        w = max(1.0, p["rim"] * Spx)
        near_hole = blur((A0 - A).clip(0, 1), w * 0.6) > 0.08
        rim = ((A > 0.5) & near_hole & (blur(A0, w) > 0.97)).astype(np.float64)
        return A, rim

    def draw(self, ramp, prog=0.0, seed=1, hot=0.0, hot_col=None, shade=None, dis=None):
        """Paint the union: lit / shadow tones from `ramp` (dark -> bright), dark rim on the dissolve front."""
        q = self.shade(seed, **(shade or {}))[..., None]
        A, rim = self.dissolve(prog, seed, **(dis or {}))
        n = len(ramp)                                   # ramp_smoke: 5 steps -> lit = base, shadow = 2 steps down
        lit, shd, dark = ramp[max(0, n - 2)], ramp[max(0, n - 4)], ramp[0]
        col = shd * (1 - q) + lit * q
        if hot > 0 and hot_col is not None:
            col = np.where(q < 0.5, cf.mix(col, hot_col, 0.6 * hot), col)
        col = np.where(rim[..., None] > 0, cf.mix(shd, dark, 0.7), col)
        self.cv.put(self.sl, 1.0, col, A)
        return A
