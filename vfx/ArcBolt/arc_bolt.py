"""Arc Relay: lightning bolt played when a dash starts. One shot, 8 frames (4x2).
Drawn pointing right. x = 0 is the character and x = length is the pylon anchor, so code can
rotate around the pivot and set scaleX = distance / length.
"""
import math

import numpy as np

FRAMES = 8
DURATION = 0.24

META = dict(name="arc_bolt", size=(192, 48), origin=(6, 24), duration=DURATION, loop=False, fps=FRAMES / DURATION,
            blend="add", stepped=True,
            space=dict(context="dir", plane="stretch", camera="side 2D", width_m=8.0,
                       anchor="character to pylon anchor", background="dark"),
            options=dict(seed=11, length=172, hold=2, nodes=8, amp=11.0, core=(1.0, 1.0, 1.0),
                         mid=(0.42, 0.72, 1.0), outer=(0.16, 0.34, 1.0)))


def edge_mask(cv):
    """Fade the last pixels of the cell so a stretched sprite never shows a hard cut."""
    h, w = cv.alpha.shape
    mx = np.clip((np.minimum(np.arange(w), w - 1 - np.arange(w)) - 1) / 3, 0, 1)
    my = np.clip((np.minimum(np.arange(h), h - 1 - np.arange(h)) - 1) / 3, 0, 1)
    m = my[:, None] * mx[None, :]
    cv.alpha *= m
    cv.col *= m[..., None]
    cv.light *= m[..., None]


def jagged(seed, L, n, amp):
    """Sharp zigzag pinned at both ends, with one or two short forks."""
    rng = np.random.RandomState(seed)
    xs = np.linspace(0, L, n) + np.r_[0, rng.uniform(-L / n * 0.32, L / n * 0.32, n - 2), 0]
    sign = rng.choice([-1, 1])
    ys = [0.0]
    for i in range(1, n - 1):
        env = math.sin(math.pi * i / (n - 1)) ** 0.55
        ys.append(sign * env * amp * rng.uniform(0.35, 1.0))
        sign = -sign
    ys.append(0.0)
    coarse = list(zip(xs, ys))
    main = [coarse[0]]
    for (x0, y0), (x1, y1) in zip(coarse, coarse[1:]):     # small kink on each leg breaks the even W rhythm
        k = rng.uniform(0.3, 0.7)
        main.append((x0 + (x1 - x0) * k, y0 + (y1 - y0) * k + rng.uniform(-3.2, 3.2)))
        main.append((x1, y1))
    n = len(main)
    forks = []
    for i in rng.choice(np.arange(2, n - 2), 2, replace=False):
        x, y = main[i]
        d = 1 if y >= 0 else -1
        a = d * rng.uniform(0.45, 0.85)
        l = rng.uniform(16, 28)
        mx, my = x + math.cos(a) * l * 0.55, y + math.sin(a) * l * 0.55
        ex, ey = x + math.cos(a * 0.7) * l, y + math.sin(a * 0.7) * l
        forks.append([(x, y), (mx, np.clip(my + rng.uniform(-2, 2), -17, 17)), (ex, np.clip(ey, -18, 18))])
    return main, forks


def draw(cv, t, o):
    if t >= DURATION - 1e-6:
        return
    f = int(math.floor(t / DURATION * FRAMES + 1e-6))
    u = f / (FRAMES - 1)
    energy = (1 - u) ** 1.35
    L = o["length"]
    main, forks = jagged(o["seed"] * 101 + f // o["hold"], L, o["nodes"], o["amp"])
    cut = max(0.0, (u - 0.28) / 0.72) * L          # burns away from the character toward the pylon
    pairs = [(a, b) for a, b in zip(main, main[1:]) if b[0] >= cut]
    fork_pairs = [(a, b) for fk in forks for a, b in zip(fk, fk[1:]) if a[0] >= cut] if f < 5 else []

    for a, b in pairs:
        cv.glow_line(a[0], a[1], b[0], b[1], 7, o["outer"], 0.48 * energy)
    for a, b in fork_pairs:
        cv.glow_line(a[0], a[1], b[0], b[1], 3, o["outer"], 0.22 * energy)
    for a, b in fork_pairs:
        cv.streak(a[0], a[1], b[0], b[1], 0.9, 0.45, o["mid"], min(1.0, 0.2 + energy))
    for a, b in pairs:
        r0 = 0.9 + 1.5 * math.sin(math.pi * min(1, a[0] / L)) ** 0.7
        r1 = 0.9 + 1.5 * math.sin(math.pi * min(1, b[0] / L)) ** 0.7
        k = 0.45 + 0.55 * energy
        cv.streak(a[0], a[1], b[0], b[1], r0 * k, r1 * k, o["mid"], min(1.0, 0.25 + energy))
    if energy > 0.1:
        for a, b in pairs:
            cv.streak(a[0], a[1], b[0], b[1], 0.7, 0.7, o["core"], min(1.0, energy * 1.35))
    if f <= 1:
        cv.glow(L, 0, 11, o["mid"], 0.8 * energy)
        cv.glow(0, 0, 5, o["core"], 0.5 * energy)
    edge_mask(cv)
