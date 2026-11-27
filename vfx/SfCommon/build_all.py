"""Render Slot Five VFX, make zoomed previews on the game background, publish to public/vfx and report sizes.

  .venv-vfx/Scripts/python.exe -I vfx/SfCommon/build_all.py [keys...] [--publish] [--contact]

Without keys every effect is rendered. --publish copies only T_*.png + <key>.json into public/vfx/sf-*/.
Previews (vfx/Sf*/out/<key>_zoom.png, vfx/SfCommon/out/sf_contact.png) never go to public/.
"""
import argparse
import glob
import json
import os
import shutil
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RENDER = os.path.join(ROOT, ".claude", "skills", "vfx-code", "lib", "render.py")
BG = np.array([0x14, 0x16, 0x2B]) / 255.0

# key: (folder, frames, cols)
EFFECTS = {
    "sf_proj_fire": ("SfProjFire", 8, 4),
    "sf_proj_volt": ("SfProjVolt", 8, 4),
    "sf_proj_frost": ("SfProjFrost", 8, 4),
    "sf_proj_earth": ("SfProjEarth", 8, 4),
    "sf_proj_blade": ("SfProjBlade", 8, 4),
    "sf_proj_heal": ("SfProjHeal", 8, 4),
    "sf_proj_shield": ("SfProjShield", 8, 4),
    "sf_hit_fire": ("SfHitFire", 12, 4),
    "sf_hit_volt": ("SfHitVolt", 12, 4),
    "sf_hit_frost": ("SfHitFrost", 12, 4),
    "sf_hit_earth": ("SfHitEarth", 12, 4),
    "sf_hit_blade": ("SfHitBlade", 12, 4),
    "sf_hit_heal": ("SfHitHeal", 12, 4),
    "sf_hit_shield": ("SfHitShield", 12, 4),
    "sf_block": ("SfBlock", 12, 4),
    "sf_chain_flash": ("SfChainFlash", 16, 4),
}


def load_frames(out_dir, key, tint=None):
    """Composite every frame of the sheet(s) on the game background exactly as Phaser would blend them."""
    info = json.load(open(os.path.join(out_dir, f"{key}.json"), encoding="utf-8"))
    w, h = info["size"]
    cols, n = info["cols"], info["frames"]
    sheets = [np.asarray(Image.open(os.path.join(out_dir, s)).convert("RGBA"), dtype=np.float64) / 255 for s in info["sheets"]]
    frames = []
    for i in range(n):
        r, c = divmod(i, cols)
        img = np.broadcast_to(BG, (h, w, 3)).copy()
        for j, sh in enumerate(sheets):
            cell = sh[r * h:(r + 1) * h, c * w:(c + 1) * w]
            rgb, a = cell[..., :3], cell[..., 3:4]
            if tint is not None:
                rgb = rgb * np.asarray(tint)
            if info["blend"] == "alpha" and j == 0:
                img = img * (1 - a) + rgb * a
            else:
                img = img + rgb * a
        frames.append(np.clip(img, 0, 1))
    return info, frames


def to_img(arr, zoom=1):
    im = Image.fromarray((arr * 255 + 0.5).astype(np.uint8), "RGB")
    return im.resize((im.width * zoom, im.height * zoom), Image.NEAREST) if zoom > 1 else im


def zoom_preview(out_dir, key, zoom=3):
    tint = (1.0, 0.75, 0.2) if key == "sf_chain_flash" else None
    info, frames = load_frames(out_dir, key, tint)
    w, h = info["size"]
    cols = info["cols"]
    rows = (len(frames) + cols - 1) // cols
    im = Image.new("RGB", (w * zoom * cols, h * zoom * rows), tuple(int(v * 255) for v in BG))
    dr = ImageDraw.Draw(im)
    for i, f in enumerate(frames):
        r, c = divmod(i, cols)
        im.paste(to_img(f, zoom), (c * w * zoom, r * h * zoom))
        dr.rectangle([c * w * zoom, r * h * zoom, (c + 1) * w * zoom - 1, (r + 1) * h * zoom - 1], outline=(50, 54, 80))
        dr.text((c * w * zoom + 4, r * h * zoom + 3), f"{i} {info['times'][i]:.3f}s", fill=(150, 150, 170))
    path = os.path.join(out_dir, f"{key}_zoom.png")
    im.save(path)
    return path


def contact(keys):
    """One row per key: every frame at 1x (game size) then the same frames at 2x."""
    rows = []
    for key in keys:
        folder = EFFECTS[key][0]
        out_dir = os.path.join(ROOT, "vfx", folder, "out")
        tint = (1.0, 0.75, 0.2) if key == "sf_chain_flash" else None
        info, frames = load_frames(out_dir, key, tint)
        w, h = info["size"]
        strip1 = np.hstack(frames)
        strip2 = np.hstack([np.repeat(np.repeat(f, 2, 0), 2, 1) for f in frames])
        rows.append((key, info, to_img(strip1), to_img(strip2)))
    W = max(r[2].width + 8 + r[3].width for r in rows) + 150
    H = sum(r[3].height + 10 for r in rows)
    im = Image.new("RGB", (W, H), tuple(int(v * 255) for v in BG))
    dr = ImageDraw.Draw(im)
    y = 0
    for key, info, s1, s2 in rows:
        dr.text((4, y + 4), key, fill=(220, 220, 235))
        dr.text((4, y + 18), f"{info['frames']}f {info['fps']:.1f}fps", fill=(150, 150, 170))
        dr.text((4, y + 32), "loop" if info["loop"] else "once", fill=(150, 150, 170))
        im.paste(s1, (150, y))
        im.paste(s2, (150 + s1.width + 8, y))
        y += s2.height + 10
    os.makedirs(os.path.join(ROOT, "vfx", "SfCommon", "out"), exist_ok=True)
    path = os.path.join(ROOT, "vfx", "SfCommon", "out", "sf_contact.png")
    im.save(path)
    return path


def lineup():
    """All 7 projectiles and 7 hits side by side at game size, mid frame, plus a 2x copy: tells types apart?"""
    tiles = []
    for group in ("proj", "hit"):
        row = []
        for el in ("fire", "earth", "volt", "frost", "blade", "heal", "shield"):
            key = f"sf_{group}_{el}"
            info, frames = load_frames(os.path.join(ROOT, "vfx", EFFECTS[key][0], "out"), key)
            row.append(frames[len(frames) // (2 if group == "proj" else 3)])
        hh = max(f.shape[0] for f in row)
        row = [np.vstack([f, np.broadcast_to(BG, (hh - f.shape[0], f.shape[1], 3))]) for f in row]
        tiles.append(np.hstack(row))
    ww = max(t.shape[1] for t in tiles)
    tiles = [np.hstack([t, np.broadcast_to(BG, (t.shape[0], ww - t.shape[1], 3))]) for t in tiles]
    img = np.vstack(tiles)
    a = to_img(img)
    b = to_img(img, 2)
    im = Image.new("RGB", (a.width + b.width + 8, b.height), tuple(int(v * 255) for v in BG))
    im.paste(a, (0, 0))
    im.paste(b, (a.width + 8, 0))
    path = os.path.join(ROOT, "vfx", "SfCommon", "out", "sf_lineup.png")
    im.save(path)
    return path


def publish(key):
    folder = EFFECTS[key][0]
    out_dir = os.path.join(ROOT, "vfx", folder, "out")
    dst = os.path.join(ROOT, "public", "vfx", key.replace("_", "-"))
    os.makedirs(dst, exist_ok=True)
    for old in glob.glob(os.path.join(dst, "*")):
        os.remove(old)
    info = json.load(open(os.path.join(out_dir, f"{key}.json"), encoding="utf-8"))
    info["source"] = f"vfx/{folder}/{key}.py"
    with open(os.path.join(dst, f"{key}.json"), "w", encoding="utf-8") as f:
        json.dump(info, f, ensure_ascii=False, indent=1)
    for s in info["sheets"]:
        shutil.copyfile(os.path.join(out_dir, s), os.path.join(dst, s))
    return [os.path.join(dst, f"{key}.json")] + [os.path.join(dst, s) for s in info["sheets"]]


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("keys", nargs="*")
    ap.add_argument("--publish", action="store_true")
    ap.add_argument("--contact", action="store_true")
    ap.add_argument("--no-render", action="store_true")
    a = ap.parse_args()
    keys = a.keys or list(EFFECTS)
    bad = []
    for key in keys:
        folder, frames, cols = EFFECTS[key]
        out_dir = os.path.join(ROOT, "vfx", folder, "out")
        if not a.no_render:
            for old in glob.glob(os.path.join(out_dir, "T_*.png")):
                os.remove(old)
            r = subprocess.run([sys.executable, "-I", RENDER, os.path.join(ROOT, "vfx", folder, f"{key}.py"), "--out", out_dir,
                                "--gif", "--check", "--res", "1", "--frames", str(frames), "--cols", str(cols)],
                               capture_output=True, text=True, encoding="utf-8")
            print(r.stdout.strip() or r.stderr.strip())
            if r.returncode != 0:
                bad.append(key)
                if r.stderr.strip():
                    print(r.stderr.strip())
        print("  zoom:", zoom_preview(out_dir, key))
    if a.contact:
        print("contact:", contact(list(EFFECTS)))
        print("lineup:", lineup())
    if a.publish:
        total = 0
        for key in EFFECTS:
            for p in publish(key):
                sz = os.path.getsize(p)
                total += sz
                if p.endswith(".png"):
                    w, h = Image.open(p).size
                    print(f"  {os.path.relpath(p, ROOT)}  {w}x{h}  {sz} B")
                else:
                    print(f"  {os.path.relpath(p, ROOT)}  {sz} B")
        print(f"TOTAL {total} B (limit 1572864)")
    if bad:
        print("CHECK FAILED:", ", ".join(bad))
        sys.exit(1)


if __name__ == "__main__":
    main()
