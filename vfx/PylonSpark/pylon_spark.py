"""Arc Relay: spark burst when a pylon lights. One shot, 16 frames (4x4), radiating from the anchor.
The white flash leaves the center within about 60 ms so the character bouncing off stays visible.
"""
import fxlib as fx
import numpy as np
import particles as px

META = dict(name="pylon_spark", size=(96, 96), origin=(48, 48), duration=0.36, loop=False, fps=16 / 0.36,
            blend="add",
            space=dict(context="air", plane="billboard", camera="side 2D", width_m=4.0,
                       anchor="pylon anchor", background="dark"),
            options=dict(seed=5, long_n=7, short_n=11,
                         ramp=[(1, 1, 1), (1, 0.9, 0.48), (0.45, 0.74, 1), (0.16, 0.34, 1)]))


def create(o):
    ramp = np.array(o["ramp"])
    long_sparks = px.System(o["seed"], [px.drag(4.5), px.gravity(0, 120)])
    long_sparks.burst(o["long_n"], angle=(0, 360), even=True, speed=(185, 250), life=(0.27, 0.33), size=(1.3, 1.9))
    short_sparks = px.System(o["seed"] + 1, [px.drag(7.0), px.gravity(0, 80)])
    short_sparks.burst(o["short_n"], angle=(0, 360), speed=(90, 220), life=(0.12, 0.25), size=(0.8, 1.3))
    shrink = fx.Curve([(0, 1), (0.6, 0.8), (1, 0)])

    class St:
        t = 0.0

        def update(self, dt):
            self.t += dt
            long_sparks.update(dt)
            short_sparks.update(dt)

        def draw(self, cv):
            t = self.t
            long_sparks.draw(cv, mode="streak", ramp=ramp, heat_curve=lambda u: u, size_curve=shrink,
                             length_scale=2.2, speed_scale=0.04, glow=(2.4, 0.28))
            short_sparks.draw(cv, mode="streak", ramp=ramp, heat_curve=lambda u: 0.15 + u * 0.85, size_curve=shrink,
                              length_scale=1.8, speed_scale=0.025, glow=(1.6, 0.18))
            h = np.clip((t - 0.05) / 0.12, 0, 1)           # opens after the sparks have left the center
            hole = 12.0 * h * h * (3 - 2 * h)              # keeps the character readable at the anchor
            if hole > 0:
                ys, xs = np.mgrid[0:cv.H, 0:cv.W]
                r = np.hypot(xs + 0.5 - cv.ox, ys + 0.5 - cv.oy)
                m = np.clip((r - hole + 3) / 5, 0, 1)
                cv.alpha *= m
                cv.col *= m[..., None]
                cv.light *= m[..., None]
            cv.glow(0, 0, 22, ramp[1], 0.65 * np.exp(-t / 0.03))
            if t < 0.05:
                k = 1 - t / 0.05
                cv.star(0, 0, [11 * k + 2, 5 * k + 1, 9 * k + 2, 5 * k + 1], 1.6 * k + 0.6, rot=0.35, c=ramp[0])

    return St()
