"""Render a codefx effect to Unity flipbooks + preview + checks.

  python -I render.py fx/impact/hit_star.py --out <dir> [--frames 16] [--cols 4] [--res 2] [--opts '{"seed":3}'] [--gif] [--check]

Writes (name = META name, grid = cols x rows):
  blend "add":   T_<name>_<grid>.png                     one additive sheet (Mobile/Particles/Additive)
  blend "alpha": T_<name>_Body_<grid>.png + T_<name>_Light_<grid>.png   (Alpha Blended body + Additive light layer)
  <name>_preview.png   composite on dark background, frame times printed
  <name>.gif           (--gif) every 30 fps frame, for motion
  <name>.json          duration, loop, fps, frame times, pivot (origin in 0..1 of the cell) for the Unity build
Frames are spread evenly over the duration, so in Unity: Texture Sheet Animation, Frame over Time 0 -> 1, Start Lifetime = duration.
"""
import argparse
import importlib.util
import json
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import codefx as cf  # noqa: E402


def load(path):
    spec = importlib.util.spec_from_file_location("fx_" + os.path.splitext(os.path.basename(path))[0], path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def png(arr, path):
    a = (np.clip(arr, 0, 1) * 255 + 0.5).astype(np.uint8)
    Image.fromarray(a, "RGBA" if a.shape[2] == 4 else "RGB").save(path, optimize=True)


def main():
    for s in (sys.stdout, sys.stderr):
        s.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("effect")
    ap.add_argument("--out", required=True)
    ap.add_argument("--frames", type=int, default=16)
    ap.add_argument("--cols", type=int, default=4)
    ap.add_argument("--res", type=float, default=2.0)
    ap.add_argument("--opts", default="{}")
    ap.add_argument("--opts-file", help="JSON file with options (avoids shell quoting, used by Unity MixRecipeBuild)")
    ap.add_argument("--like", help="component json written by an earlier render: reuse its options + res, then apply --opts on top (palette re-render)")
    ap.add_argument("--gif", action="store_true")
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()
    mod = load(a.effect)
    M = mod.META
    sp_issues = cf.check_space(M)
    if sp_issues:
        print("CHƯA ĐỦ THÔNG TIN KHÔNG GIAN — hỏi người dùng trước khi làm tiếp:\n  - " + "\n  - ".join(sp_issues))
        sys.exit(2)
    opts = json.loads(open(a.opts_file, encoding='utf-8').read()) if a.opts_file else json.loads(a.opts)
    if a.like:
        base = json.load(open(a.like, encoding="utf-8"))
        opts = {**{k: v for k, v in base.get("options", {}).items() if v is not None}, **opts}
        if "--res" not in sys.argv:
            a.res = float(base.get("res", a.res))
    os.makedirs(a.out, exist_ok=True)
    name = M["name"]
    rows = int(math.ceil(a.frames / a.cols))
    grid = f"{a.cols}x{rows}"
    times = cf.sample_times(M, a.frames)
    frames = cf.render(mod, opts, times, a.res)

    if M["blend"] == "add":
        png(cf.sheet([cf.to_add_rgba(f) for f in frames], a.cols), os.path.join(a.out, f"T_{name}_{grid}.png"))
    else:
        png(cf.sheet([cf.to_alpha_rgba(f) for f in frames], a.cols), os.path.join(a.out, f"T_{name}_Body_{grid}.png"))
        if any(f.light.max() > 0.01 for f in frames):
            png(cf.sheet([cf.to_light_rgba(f) for f in frames], a.cols), os.path.join(a.out, f"T_{name}_Light_{grid}.png"))

    prev = cf.sheet([cf.composite(f) for f in frames], a.cols)
    im = Image.fromarray((prev * 255).astype(np.uint8), "RGB")
    dr = ImageDraw.Draw(im)
    W, H = frames[0].W, frames[0].H
    for i, t in enumerate(times):
        r, c = divmod(i, a.cols)
        dr.text((c * W + 4, r * H + 3), f"{i} · {t:.3f}s", fill=(150, 150, 160))
        ox, oy = M["origin"]
        px, py = c * W + ox * a.res, r * H + oy * a.res
        dr.line([(px - 3, py), (px + 3, py)], fill=(200, 40, 40))
        dr.line([(px, py - 3), (px, py + 3)], fill=(200, 40, 40))
    im.save(os.path.join(a.out, f"{name}_preview.png"))

    if a.gif:
        fps = M.get("fps", 30)
        n = int(round(M["duration"] * fps)) + (0 if M.get("loop") else 6)
        ts = [i / fps for i in range(n)]
        fr = cf.render(mod, opts, ts, a.res)
        ims = [Image.fromarray((cf.composite(f) * 255).astype(np.uint8), "RGB") for f in fr]
        loops = 2 if M.get("loop") else 1
        ims = ims * loops
        ims[0].save(os.path.join(a.out, f"{name}.gif"), save_all=True, append_images=ims[1:], duration=int(1000 / fps), loop=0)

    info = dict(source=os.path.abspath(a.effect).replace('\\', '/'), name=name, blend=M["blend"], duration=M["duration"], loop=M.get("loop", False), fps=M.get("fps", 30),
                frames=a.frames, cols=a.cols, rows=rows, times=[round(t, 4) for t in times],
                size=M["size"], res=a.res, space=M["space"], pivot=[M["origin"][0] / M["size"][0], M["origin"][1] / M["size"][1]],
                options={**M.get("options", {}), **opts})
    with open(os.path.join(a.out, f"{name}.json"), "w", encoding="utf-8") as f:
        json.dump(info, f, ensure_ascii=False, indent=1, default=str)
    print(f"{name}: {a.frames} frame {grid}, {W}x{H}/ô, blend {M['blend']} -> {a.out}")

    if a.check:
        issues = cf.check(mod, opts)
        print("check: sạch" if not issues else "check:\n  - " + "\n  - ".join(issues))
        if issues:
            sys.exit(1)


if __name__ == "__main__":
    main()
