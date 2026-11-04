"""Toon dust/smoke burst on the ground. Alpha + small light. 1.2 s.

SHAPE = the project's smoke shape (Shape Lab smokeGeom: one body + lobes hugging it, big inside / small outside,
compact). RENDER = the project's own shading (whole-cluster crescent) + CoreOut dissolve.
The pixelfx per-ball sphere render ("lobe" style) was DROPPED by the art lead on 2026-11-03 (stiff plastic balls).
Smoke rendering is being redone (soft mass); this sample is a placeholder until then.

  - one main cluster (body + 7 lobes, big inside / small outside, round bottom touching the ground); option side=True
    adds 2 small side clusters kicked out with drag, all ONE silhouette (union) so the shading wraps the whole mass
  - pop-in 0 -> 0.2 s (out_back), then a slow swell and rise
  - whole-cluster shadow crescents, light 60 deg top-right, 2 tones; hot while young (shadow side takes the fire ramp)
  - CoreOut dissolve paced by area from 0.25 s to the end, dark rim on the eaten front, small lobes first; ends empty
"""
import math

import codefx as cf
from smoke import Smoke

META = dict(
    name="CFX_PuffBurst", size=(176, 128), origin=(88, 112), duration=1.2, loop=False, fps=30, blend="alpha",
    space=dict(context="ground", plane="billboard", camera="3/4 40", width_m=4.4, anchor="world point (ground)", background="mixed"),
    options=dict(palette=None, smoke=None, seed=5, scale=1.0, hot=1.0, side=None, look="smoke"),
)
# look: "smoke" (dust tones) · "fire" (same shape, fire ramp: shadow Outer, mid Mid, lit Core + glow)
#       "fire2smoke" (starts as fire, cools into smoke - pixelfx fireball idea: heat -> ramp step, cools with age)


def create(o):
    R = cf.Rng(o["seed"])
    S = o["scale"]
    fire = cf.ramp(o["palette"])
    tones = cf.ramp_smoke(o["smoke"] or cf.DUST)
    seeds = [R.int(1, 9999) for _ in range(3)]
    side_rot = [R.range(10, 30), -R.range(10, 30)]

    class St:
        t = 0.0

        def update(self, dt):
            self.t += dt

        def draw(self, cv):
            t, D = self.t, META["duration"]
            if t >= D:
                return
            grow = 0.4 + 0.6 * float(cf.ease.out_back(cf.seg(0.0, 0.2, t), 1.2))
            swell = 1 + 0.12 * float(cf.seg(0.2, D, t))
            rise = -8 * S * float(cf.ease.out_cubic(cf.seg(0.15, D, t)))
            hot = o["hot"] * max(0.0, 1 - t / 0.25)
            if t < 0.1:                                                  # flash of heat only while the puff is tiny
                cv.glow(0, -12 * S, 30 * S, cf.blend(fire, 0.75), 0.4 * (1 - t / 0.1))
            sm = Smoke(cv)
            ex = 0.0                                                     # lobes stay hugging the body (far lobes were rejected)
            sm.add(0, rise, 56 * S * grow * swell, seeds[0], expand=ex, flat=0)   # art lead: no cut bottom
            if o["side"]:
                f = 1 - math.exp(-6 * t)                                # drag: shoot out, then stop
                for i, sd in enumerate((-1, 1)):
                    g2 = 0.4 + 0.6 * float(cf.ease.out_back(cf.seg(0.03, 0.23, t), 1.2))
                    sm.add(sd * (20 + 14 * f) * S, rise * 0.6, 28 * S * g2 * swell, seeds[1 + i],      # stay overlapped: compact, never a long band
                           lobes=5, arc=220, rot=side_rot[i], expand=ex)
            look = o["look"]
            ramp5 = tones
            if look in ("fire", "fire2smoke"):
                # 5 steps like ramp_smoke: draw() picks lit = [3], shadow = [1]
                fire5 = cf.np.array([fire[1], fire[2], fire[3], fire[4], fire[5]])
                cool = float(cf.smooth(0.12, 0.55, t / D)) if look == "fire2smoke" else 0.0
                ramp5 = fire5 * (1 - cool) + tones * cool
                hotness = (1 - cool) * (1 - float(cf.smooth(0.4, 0.97, t / D)))   # glow also dies with the erosion
                if hotness > 0.02:                                       # fire glows (light layer), fades as it cools
                    cv.glow(0, rise - 30 * S * grow, 62 * S * grow, cf.blend(fire, 0.8), 0.55 * hotness)
                hot = 0.0
            prog = float(cf.seg(0.25, D * 0.97, t))                     # area-even CoreOut dissolve
            sm.draw(ramp5, prog, seeds[0], hot=hot, hot_col=fire[1])

    return St()
