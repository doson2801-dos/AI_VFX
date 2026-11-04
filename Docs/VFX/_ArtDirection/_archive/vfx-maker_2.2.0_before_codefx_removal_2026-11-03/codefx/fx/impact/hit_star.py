"""Toon hit star (Impact, Air). Additive, 0.5 s.

Phases (pixelfx "choreography"): white hero frame -> overshoot 1.3x -> settle thin, colour steps down -> breaks
by 0.13 s; broken ring spreads; speed-stretched sparks with a light on each head; late twinkles (the "hold");
a light pop that flares and falls away. Every timing key sits on a 30 fps frame.
"""
import math

import codefx as cf

META = dict(
    name="CFX_HitStar", size=(128, 128), origin=(64, 64), duration=0.5, loop=False, fps=30, blend="add",
    space=dict(context="air", plane="billboard", camera="3/4 40", width_m=3.0, anchor="world point (hit point)", background="dark"),
    options=dict(palette=None, seed=3, spikes=7, sparks=14, twinkles=4, scale=1.0),
)

F = 1 / 30
# t, scale, thickness, alpha, heat (1 = white-hot)       — step keys: hold until the next key
KEYS = [(0 * F, 1.00, 1.00, 1.0, 1.00),
        (1 * F, 1.30, 0.70, 1.0, 0.86),
        (2 * F, 1.05, 0.42, 0.95, 0.70),
        (3 * F, 0.92, 0.22, 0.75, 0.55),
        (4 * F, 0.0, 0.0, 0.0, 0.0)]


def key_at(t):
    k = KEYS[0]
    for kk in KEYS:
        if t >= kk[0] - 1e-6:
            k = kk
    return k


def create(o):
    R = cf.Rng(o["seed"])
    ramp = cf.ramp(o["palette"])
    S = o["scale"]
    n = o["spikes"]
    lengths = [34 * S * R.range(0.55, 1.0) for _ in range(n)]
    for i in sorted(range(n), key=lambda i: -lengths[i])[:2]:
        lengths[i] *= 1.25                       # 2 longest spikes x1.25: lopsided, not a regular star
    rot = R.range(0, cf.TAU)
    ps = cf.Particles(seed=o["seed"], scale=S)
    for _ in range(o["sparks"]):
        a, sp = R.range(0, cf.TAU), R.range(110, 210) * S
        ps.spawn("spark", 0, 0, math.cos(a) * sp, math.sin(a) * sp, R.range(0.16, 0.34), size=R.range(0.7, 1.3))
    for _ in range(o["twinkles"]):
        a, d = R.range(0, cf.TAU), R.range(14, 34) * S
        ps.spawn("twinkle", math.cos(a) * d, math.sin(a) * d, 0, 0, 0.16, size=R.range(6, 10) * S, delay=R.range(0.08, 0.3))
    ring_seed = R.int(1, 999)

    class St:
        t = 0.0

        def update(self, dt):
            self.t += dt
            ps.update(dt)

        def draw(self, cv):
            t = self.t
            light_c = cf.blend(ramp, 0.85)
            # light pop: flare then fall away
            cv.glow(0, 0, 56 * S, light_c, 0.9 * math.exp(-t / 0.05))
            cv.glow(0, 0, 34 * S, cf.blend(ramp, 1.0), 0.6 * max(0.0, 1 - t / 0.2) ** 2)

            # broken ring
            u = (t - 0.02) / 0.3
            if 0 <= u < 1:
                r = 10 * S + 40 * S * float(cf.ease.out_cubic(u))
                w = (2.6 * (1 - u) ** 1.2 + 0.5) * S
                brk = float(cf.smooth(0.15, 0.75, u))
                keep = lambda ang: (cf.noise1((ang + math.pi) / cf.TAU * 9, ring_seed) > brk * 0.95).astype(float)
                cv.ellipse_ring(0, 0, r, w, cf.at(ramp, 0.72 - 0.5 * u), 1.0, keep=keep)
                cv.glow_ring(0, 0, r, 6 * S, light_c, 0.35 * (1 - u))

            # hero star (step keys)
            _, sc, th, al, heat = key_at(t)
            if sc > 0:
                L = [l * sc for l in lengths]
                inner = (9 * th + 2) * S * sc
                col = (lambda q: cf.at(ramp, heat - q * 0.45)) if t >= KEYS[1][0] - 1e-6 else (1.0, 1.0, 1.0)
                cv.star(0, 0, L, inner, rot, col, al)
                cv.disc(0, 0, (10 * th + 2) * S, (1.0, 1.0, 1.0), al)

            # sparks: head = particle, tail trails behind along velocity; hot head, cooler tail
            for p in ps.live():
                k = p.life / p.max
                if p.k == "spark":
                    sp = math.hypot(p.vx, p.vy)
                    ln = min(22 * S, 4 * S + sp * 0.07)
                    ux, uy = p.vx / (sp + 1e-6), p.vy / (sp + 1e-6)
                    h = 0.35 + 0.65 * k
                    cv.streak(p.x, p.y, p.x - ux * ln, p.y - uy * ln, (1.6 * k + 0.5) * p.size * S, 0.25 * S,
                              lambda q, h=h: cf.at(ramp, h - q * 0.5))
                    cv.glow(p.x, p.y, 7 * S, light_c, 0.3 * k)
                elif p.k == "twinkle":
                    b = float(cf.bump(0, 1, 1 - k))
                    if b > 0.02:
                        s = p.size * b
                        cv.star(p.x, p.y, [s, s * 0.5, s, s * 0.5], s * 0.16, math.pi / 4 * 0, (1.0, 1.0, 1.0), 1.0)
                        cv.glow(p.x, p.y, s * 1.8, light_c, 0.35 * b)

    return St()
