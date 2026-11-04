"""Fire -> smoke mass from a 3D mesh + noise dissolve (TOTK bomb reference, video gQ_1K61VTvo 4.5-6.0 s). Alpha + Light.

Observed in the reference:
  4.7-5.2 s  billowy mass (lobes melted together), flat orange with blobby yellow hot patches, red-dark underside
  5.3-5.6 s  cools to dark; the yellow stays only in the creases between lobes (not veins over the surface)
  5.6-6.0 s  holes open and the mass tears into ragged dark shreds, hot edges on the tears while still warm, then grey
One 3D noise stuck on the surface drives everything:
  heat  = global temperature(t) + noise  -> hard toon steps of the fire ramp (blobby patches, then crease fire)
  alpha = noise > threshold(t)           -> dissolve holes; the band just above the threshold = burning edge
The mass comes from Blender, headless (metaballs, skill codefx/mesh/blender_passes.py -> passes/passes.npz = normal + noise + alpha).
"""
import json
import math
import os

import numpy as np

import codefx as cf
from smoke import blur

HERE = os.path.dirname(os.path.abspath(__file__))
FIRE = ["#2E1A16", "#6A2A1A", "#A82A14", "#E8561A", "#FF8F1F", "#FFC93C", "#FFF1A8"]
SMOKE = ["#4A3F44", "#7B6E6E"]                     # shadow / lit: 2 big smooth tones (art lead 2026-11-03: mid frames read as rock)

META = dict(
    name="CFX_SmokeMesh", size=(176, 128), origin=(88, 112), duration=1.2, loop=False, fps=30, blend="alpha",
    space=dict(context="ground", plane="billboard", camera="3/4 40", width_m=4.4, anchor="world point (ground)", background="mixed"),
    options=dict(passes=os.path.join(HERE, "passes", "passes.npz"), palette=None, smoke=None,
                 hot_end=0.8, dis_start=0.3, contrast=2.6,
                 soft=0.12, dis_blur=0.035, crease_end=0.85, seed=3, arcs=3.2, edge_px=1.6),   # soft: eaten-edge band, as a share of the field range
)

_cache = {}


def _passes(path):
    if path not in _cache:
        z = np.load(path)
        info = json.load(open(os.path.join(os.path.dirname(path), "passes.json")))
        info["B"] = z["B"].astype(np.float32) if "B" in z.files else None       # ball centres / radii in pass px
        _cache[path] = (z["P"].astype(np.float32), info)
    return _cache[path]


def _resize(img, H, W):
    """Bilinear resize (H0, W0, C) -> (H, W, C)."""
    H0, W0 = img.shape[:2]
    if (H0, W0) == (H, W):
        return img
    y = (np.arange(H) + 0.5) * H0 / H - 0.5
    x = (np.arange(W) + 0.5) * W0 / W - 0.5
    y0 = np.clip(np.floor(y).astype(int), 0, H0 - 2)
    x0 = np.clip(np.floor(x).astype(int), 0, W0 - 2)
    fy = np.clip(y - y0, 0, 1)[:, None, None]
    fx = np.clip(x - x0, 0, 1)[None, :, None]
    a, b = img[y0][:, x0], img[y0][:, x0 + 1]
    c, d = img[y0 + 1][:, x0], img[y0 + 1][:, x0 + 1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def _frame(P, info, t):
    # nearest frame: blending two frames ghosts the edges (a lobe popping in shows twice)
    return P[int(round(min(max(t * info["fps"], 0), P.shape[0] - 1)))]


def _sample(img, X, Y):
    """Bilinear sample img (H, W, C) at float pixel coords X, Y (outside = 0)."""
    H, W = img.shape[:2]
    x, y = X - 0.5, Y - 0.5
    x0, y0 = np.floor(x).astype(int), np.floor(y).astype(int)
    fx, fy = (x - x0)[..., None], (y - y0)[..., None]
    out = np.zeros(X.shape + img.shape[2:])
    for oy, wy in ((0, 1 - fy), (1, fy)):
        for ox, wx in ((0, 1 - fx), (1, fx)):
            xi, yi = x0 + ox, y0 + oy
            ok = (xi >= 0) & (xi < W) & (yi >= 0) & (yi < H)
            v = img[np.clip(yi, 0, H - 1), np.clip(xi, 0, W - 1)] * ok[..., None]
            out = out + v * wx * wy
    return out


def _edge(field, thr):
    """field > thr with a 1 px anti-aliased edge, whatever the slope of the field."""
    gy, gx = np.gradient(field)
    return cf.clamp(0.5 + (field - thr) / (np.sqrt(gx * gx + gy * gy) + 1e-6))


def draw(cv, t, o):
    D = META["duration"]
    if t >= D:
        return
    P, info = _passes(o["passes"])
    fi = int(round(min(max(t * info["fps"], 0), P.shape[0] - 1)))
    p = _resize(P[fi], cv.H, cv.W)
    a0 = cf.clamp(p[..., 3])
    if a0.max() < 0.01:
        return
    nx, ny = p[..., 0] * 2 - 1, p[..., 1] * 2 - 1
    nz = np.sqrt(np.clip(1 - nx * nx - ny * ny, 0, 1))
    n = cf.clamp((p[..., 2] - 0.5) * o["contrast"] + 0.5)          # stretch the noise to 0..1

    fire = cf.ramp(o["palette"] or FIRE)
    smoke = cf.ramp(o["smoke"] or SMOKE)
    # light from the top-left-front (camera space: x right, y up, z to the viewer)
    Ld = np.array([-0.45, 0.7, 0.55])
    Ld /= np.linalg.norm(Ld)
    lam = np.clip(nx * Ld[0] + ny * Ld[1] + nz * Ld[2], 0, 1)
    if p.shape[2] > 4:                                              # AO pass: creases between lobes go to shadow
        lam = lam * cf.clamp(p[..., 4]) ** 2

    # ---- temperature: white flash -> hot orange -> cool. Heat patches follow the noise, lit side a bit hotter
    # smooth (blurred) noise for everything big: heat patches, smoke tone border, holes. Fine noise = rock texture.
    nd = blur(n, o["dis_blur"] * cv.H)
    nd = cf.clamp((nd - 0.5) * 1.6 + 0.5)
    T = 1.05 - 0.3 * float(cf.seg(0.0, 0.15, t)) ** 0.6 - 1.0 * float(cf.smooth(0.15, o["hot_end"], t))
    # fire retreats into the core (rim cools first): reads as fire inside smoke, not a crust of lava
    heat = T + (nd - 0.5) * 1.0 + (lam - 0.5) * 0.25 - (1 - nz) * 0.35 * float(cf.smooth(0.12, 0.4, t))
    # the whole mass is fire at first (no grey rim around a fire sticker), then smoke creeps in from the rim
    heat = np.maximum(heat, 0.3 * (1 - float(cf.smooth(0.08, 0.3, t))))
    # fire in the CREASES only (art lead 2026-11-03, reference 5.0-5.4 s: yellow shows in the gaps between lobes, not
    # as veins all over the surface). Crease mask = the AO pass, widened a little, broken up by the smooth noise.
    if p.shape[2] > 4:
        crease = cf.clamp((0.975 - p[..., 4]) / 0.07)                  # thin lines along the seams between lobes
        crease = blur(crease, 0.004 * cv.H)                            # just enough to keep the line smooth
        crease = crease * cf.smooth(0.3, 0.5, nd)                      # gaps in the glow: only some stretches burn
        crease_k = 1 - float(cf.smooth(0.35, o["crease_end"], t))
        heat = np.maximum(heat, crease * (0.35 + 0.6 * crease_k) * (crease_k > 0.02))

    # ---- dissolve, read from the reference (5.4-6.1 s), art lead 2026-11-03 "the dissolve feels too even":
    #  - CORE OUT per lobe: the middle of each lobe empties first (where the fire was), its rim survives longest,
    #    so what is left are curved strands following the lobe outlines (torn-paper crescents), not round holes
    #  - lobes go in TURNS: the body (fire core) first, then the lobes one by one in a random order
    #  - strands: noise stretched ALONG the rim of each lobe (slow around, fast across)
    #  - paced by area (threshold = quantile of the field), so frames lose area evenly from start to end
    field = nd - (1 - nz) * 0.22
    Bp = info.get("B")
    if Bp is not None:
        k = cv.W / P.shape[2]
        bx, by, br = Bp[fi, :, 0] * k, Bp[fi, :, 1] * k, np.maximum(Bp[fi, :, 2] * k, 1.0)
        yy, xx = np.mgrid[0:cv.H, 0:cv.W].astype(np.float64)
        q_all = np.hypot(xx[None] - bx[:, None, None], yy[None] - by[:, None, None]) / br[:, None, None]
        # SOFT ownership (smooth-min over the balls): no straight cut lines where two lobes meet
        kq = 9.0
        w = np.exp(-kq * (q_all - q_all.min(axis=0)[None]))
        w = w / w.sum(axis=0)[None]
        q = q_all.min(axis=0)
        R = cf.Rng(o["seed"])
        order = np.array([-0.25] + [R.range(0.0, 0.28) for _ in range(len(bx) - 1)])   # body first, lobes in turns (small spread: a late lobe left as one solid blob = wrong)
        strand = np.zeros_like(q)
        for i in range(len(bx)):
            if w[i].max() < 0.01:
                continue
            ang = np.arctan2(yy - by[i], xx - bx[i])
            qi = q_all[i]
            # ARCS (art lead 2026-11-03, annotated reference): the smoke tears into stacked arcs parallel to each lobe's
            # outline, like contour lines. Bands in q (distance to the lobe centre / radius), gently warped so they are not
            # perfect circles, and broken along their length so each arc is a tapered crescent.
            ca, sa = np.cos(ang), np.sin(ang)
            warp = cf.fbm2(ca * 0.8 + i * 11.3, sa * 0.8 + i * 5.7, o["seed"], 2)
            # each lobe its own arc count / phase, so the lobes do not repeat the same rings
            # UNEVEN arcs (art lead 2026-11-03: "arcs yes, but not that even"): value noise along q instead of cos(), so the
            # spacing, thickness and strength of the arcs vary; the slow angular coordinate lets an arc drift / fade along
            # its length; a stronger warp bends them.
            arcs_i = o["arcs"] * (0.8 + 0.4 * cf.hash01(i, o["seed"], 1))
            warp2 = cf.fbm2(ca * 1.5 + i * 4.1 + 50, sa * 1.5 + i * 2.9 + 50, o["seed"] + 3, 2)
            # keep cos() bands (pure noise lost the arcs) but make them uneven:
            #  - spacing: q is bent per lobe (arcs bunch up toward the rim on some lobes, toward the centre on others)
            #  - shape: stronger angular warp, so an arc bends and drifts in and out
            #  - thickness: a slow noise along the arc shifts the band level -> arcs thicken, thin out and vanish
            gam = 0.7 + 0.7 * cf.hash01(i, o["seed"], 4)
            qa = (np.clip(qi, 0, 1.5) ** gam) * arcs_i + (warp - 0.5) * 1.4 + (warp2 - 0.5) * 0.7
            band = 0.5 + 0.5 * np.cos(cf.TAU * (qa + cf.hash01(i, o["seed"], 2)))
            thick = cf.fbm2(ca * 1.1 + i * 6.3 + 80, sa * 1.1 + i * 3.3 + 80, o["seed"] + 6, 2)
            band = cf.clamp(band + (thick - 0.5) * 0.9)
            brk = cf.fbm2(ca * 2.0 + 31 + i * 3.1, sa * 2.0 + 17 + i * 2.3, o["seed"] + 1, 2)
            brk = cf.clamp((brk - 0.5) * 2.2 + 0.5)                     # sharper breaks: short crescents, not closed rings
            # arcs sit on the TOP / outer side of a lobe, bowed upward (reference); none on the body (it burns out first)
            # arcs face the lobe's OUTER side (away from the body), tilted up: left lobe -> arcs on its left
            # (annotated reference), top lobes -> on top. Pure "up" for every lobe made the top lobes mirror each other.
            ox_, oy_ = bx[i] - bx[0], by[i] - by[0]
            ln = math.hypot(ox_, oy_) + 1e-6
            fx_, fy_ = ox_ / ln, oy_ / ln - 0.7
            lf = math.hypot(fx_, fy_) + 1e-6
            top = cf.smooth(-0.35, 0.45, ca * fx_ / lf + sa * fy_ / lf) * (0.0 if i == 0 else 1.0)
            si = 0.5 + ((band - 0.5) * 1.0 * top + (brk - 0.5) * 0.4)
            strand += w[i] * si
        strand_k = cf.smooth(0.15, 0.6, q)                          # no strand noise near a lobe centre (star artefacts)
        # near a lobe centre the surface noise shapes the first hole (ragged, not a round "bullet hole")
        # the outer shell must tear too (a whole hollow shell left at the end = wrong): strong strand noise at the rim
        ns_ = blur(n, 0.008 * cv.H)                                     # surface noise without its finest grain (speckle holes)
        field = (np.clip(q, 0, 1.15) * 0.55 + (strand - 0.5) * 1.9 * strand_k + (ns_ - 0.5) * (0.1 + 0.45 * (1 - strand_k))
                 + (w * order[:, None, None]).sum(axis=0))
        # the OUTER outline tears too: near the silhouette, low-strand stretches are cut deep, high ones stay as strands
        field = field - (1 - nz) ** 2 * (1 - strand) * 1.1
        field = blur(field, 0.005 * cv.H)                              # no 1-2 px islands / pin holes
    inside = a0 > 0.5
    prog = float(cf.ease.in_quad(cf.seg(o["dis_start"], D * 0.97, t)))
    vals = np.sort(field[inside]) if inside.any() else np.array([0.0, 1.0])
    span = max(float(vals[int(len(vals) * 0.95)] - vals[int(len(vals) * 0.05)]), 1e-3)
    soft = o["soft"] * span
    if prog <= 0:
        thr = vals[0] - soft * 2
    elif prog >= 1:
        thr = vals[-1] + soft * 2
    else:
        thr = vals[min(len(vals) - 1, int(prog * len(vals)))] - soft * 0.5
    # soft eaten edge of an EVEN width in pixels (art lead: not hard / sharp). A band in field units blurred wide
    # wherever the field is flat -> round blurry holes.
    gy, gx = np.gradient(field)
    g = np.sqrt(gx * gx + gy * gy) + 1e-6
    alive = cf.smooth(0.0, 1.0, 0.5 + (field - thr) / (g * o["edge_px"] * cv.res))
    burn = (1 - cf.smooth(thr, thr + soft * 1.6, field)) * (field > thr)   # glow band along the eaten edge
    burn_k = 1 - float(cf.smooth(0.3, o["hot_end"], t))                # burning edges only while there is fire

    # ---- colour: fire steps where hot, smoke tones (lit / mid / shadow) where cool
    nf = len(fire)
    fire_col = cf.at(fire, cf.clamp(heat))
    # 2 tones: big lit area, shadow on the underside and in the creases; border only gently wobbled
    lit = (lam + (nd - 0.5) * 0.15) > 0.33
    smoke_col = np.where(lit[..., None], smoke[-1], smoke[0])
    cool = heat < 0.24                                                 # skip the 2 darkest fire steps: they drew a hard dark ring
    col = np.where(cool[..., None], smoke_col, fire_col)
    # warm eaten edge blends toward the fire colour (no hard dark rim)
    if burn_k > 0.05:
        col = cf.mix(col, fire[nf - 3], (burn * burn_k * 0.8)[..., None])

    A = a0 * alive

    # ---- light layer: glow on hot areas and burning edges
    hot_glow = cf.clamp((heat - 0.45) * 1.6) * A
    lt = cf.blend(fire, cf.clamp(heat)) * hot_glow[..., None] * 0.35
    if burn_k > 0.05:
        lt = lt + fire[nf - 3] * (burn * A * burn_k * 0.35)[..., None]

    # ---- drift while dissolving (reference 5.6-6.1 s): what is left spreads out, curls up at the sides and rises
    e = float(cf.smooth(o["dis_start"] + 0.15, D, t))
    if e > 0 and Bp is not None:
        cx, cy = bx[0], by[0]
        Rm = br[0] * 2.2
        yy, xx = np.mgrid[0:cv.H, 0:cv.W].astype(np.float64)
        dx, dy = xx - cx, yy - (cy - 0.03 * cv.H * e)
        r = np.hypot(dx, dy)
        side = np.tanh(dx / (0.35 * Rm))                               # smooth left/right (a hard sign() tore a seam down the middle)
        th = -0.4 * e * np.clip(r / Rm, 0, 1) * side                   # sides curl upward (screen y is down)
        s_ = 1 + 0.12 * e
        c_, sn = np.cos(-th), np.sin(-th)
        sx_ = cx + (dx * c_ - dy * sn) / s_
        sy_ = cy + (dx * sn + dy * c_) / s_
        col, A, lt = _sample(col, sx_, sy_), _sample(A[..., None], sx_, sy_)[..., 0], _sample(lt, sx_, sy_)

    cv.put((slice(0, cv.H), slice(0, cv.W)), 1.0, col, A)
    if t < 0.12:                                                        # flash
        k = 1 - t / 0.12
        cv.glow(0, -38, 52, fire[nf - 1], 0.8 * k)
    cv.light += lt
