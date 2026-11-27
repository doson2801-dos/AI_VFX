"""Slot Five VFX: shared palette, META builder and small drawing helpers.

Effects live in vfx/Sf*/sf_*.py and import this module by path. Space rules (brief 4.12):
side 2D, billboard, dark background #14162b, 48 px = 2 m (character is 88 px, about 3.7 m).
"""
import math

import numpy as np

TAU = math.tau
BG = (0x14 / 255, 0x16 / 255, 0x2B / 255)

# Toon ramps, hottest / brightest first. Colours follow the in-game icons.
FIRE = [(1.0, 0.96, 0.72), (1.0, 0.74, 0.22), (1.0, 0.44, 0.10), (0.86, 0.17, 0.07), (0.45, 0.07, 0.05)]
VOLT = [(1.0, 1.0, 0.92), (1.0, 0.93, 0.30), (1.0, 0.78, 0.08), (0.70, 0.48, 0.02)]
FROST = [(0.96, 1.0, 1.0), (0.74, 0.93, 1.0), (0.48, 0.78, 0.98), (0.26, 0.52, 0.86)]
EARTH = [(0.74, 0.58, 0.38), (0.56, 0.40, 0.24), (0.38, 0.26, 0.15), (0.20, 0.13, 0.08)]
BLADE = [(1.0, 1.0, 1.0), (0.84, 0.87, 0.93), (0.62, 0.66, 0.74), (0.40, 0.43, 0.52)]
HEAL = [(0.92, 1.0, 0.90), (0.55, 1.0, 0.55), (0.25, 0.86, 0.36), (0.10, 0.55, 0.22)]
SHIELD = [(0.90, 0.97, 1.0), (0.50, 0.78, 1.0), (0.24, 0.52, 1.0), (0.10, 0.26, 0.80)]


def meta(name, size, origin, duration, frames, loop, blend, anchor, stepped=False, **options):
    """META in the project format. width_m follows 48 px = 2 m (phaser-vfx skill)."""
    return dict(name=name, size=size, origin=origin, duration=duration, loop=loop, fps=frames / duration,
                blend=blend, stepped=stepped,
                space=dict(context="air", plane="billboard", camera="side 2D", width_m=round(size[0] / 24, 2),
                           anchor=anchor, background="dark"),
                options=dict(options))


def edge_fade(cv, px=4):
    """Fade the outer `px` pixels so nothing is ever cut by the cell border."""
    h, w = cv.alpha.shape
    mx = np.clip((np.minimum(np.arange(w), w - 1 - np.arange(w)) - 1.5) / px, 0, 1)
    my = np.clip((np.minimum(np.arange(h), h - 1 - np.arange(h)) - 1.5) / px, 0, 1)
    m = my[:, None] * mx[None, :]
    cv.alpha *= m
    cv.col *= m[..., None]
    cv.light *= m[..., None]


def scale_all(cv, k):
    """Global fade of everything already drawn (k 0..1)."""
    cv.alpha *= k
    cv.col *= k
    cv.light *= k


def smooth(a, b, x):
    t = min(max((x - a) / (b - a), 0.0), 1.0)
    return t * t * (3 - 2 * t)


def out_expo(u):
    u = min(max(u, 0.0), 1.0)
    return 1.0 if u >= 1 else 1 - 2 ** (-10 * u)


def out_back(u, s=1.9):
    u = min(max(u, 0.0), 1.0) - 1
    return 1 + (s + 1) * u ** 3 + s * u * u


def drag(u, k=6.0):
    """0 -> 1, fast start then brake, exactly 1 at u = 1."""
    u = min(max(u, 0.0), 1.0)
    return (1 - math.exp(-k * u)) / (1 - math.exp(-k))


def rot(pts, a):
    c, s = math.cos(a), math.sin(a)
    return [(x * c - y * s, x * s + y * c) for x, y in pts]


def shard(length, width, tail=0.45):
    """Ice shard pointing right: tip at +length*(1-tail), tail at -length*tail."""
    return [(length * (1 - tail), 0.0), (0.0, -width / 2), (-length * tail, 0.0), (0.0, width / 2)]


def zigzag(pts_seed, a, b, n, amp):
    """Jagged line from a to b, pinned at both ends. Returns list of points."""
    rng = np.random.RandomState(pts_seed & 0x7FFFFFFF)
    ax, ay = a
    bx, by = b
    dx, dy = bx - ax, by - ay
    L = math.hypot(dx, dy) + 1e-9
    nx, ny = -dy / L, dx / L
    out = [a]
    sign = rng.choice([-1, 1])
    for i in range(1, n):
        k = i / n + rng.uniform(-0.25, 0.25) / n
        off = sign * amp * rng.uniform(0.4, 1.0) * math.sin(math.pi * i / n) ** 0.5
        out.append((ax + dx * k + nx * off, ay + dy * k + ny * off))
        sign = -sign
    out.append(b)
    return out
