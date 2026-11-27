"""Đo thuộc tính khách quan của mọi ảnh trong Assets/Library -> Docs/VFX/_Library/library_props.csv
và (tuỳ chọn) dựng contact sheet để xem cả thư mục một lần.

  python -I tools/library_props.py                      # ghi library_props.csv
  python -I tools/library_props.py --contact glow/flare # contact sheet -> Docs/VFX/_Library/_contact/glow_flare.png

Cột CSV: file, direction (omni = không hướng, spam được | dir = có hướng, không spam | na = chạy UV / noise / mask), sheet (1 = sheet nhiều khung), w, h, aspect, kind (alpha|black_bg|opaque), color (gray|tinted|color),
mean_lum, coverage (tỉ lệ pixel sáng), edge_touch (ảnh chạm mép = hay bị cắt vuông), warn.
Chỉ đọc Library, không sửa gì.
"""
import argparse, csv, math, os, sys
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
LIB = os.path.join(ROOT, "Assets", "Library")
OUT = os.path.join(ROOT, "Docs", "VFX", "_Library")
EXT = {".png", ".tga", ".jpg", ".jpeg", ".psd"}


def files(sub=""):
    base = os.path.join(LIB, sub)
    for d, ds, fs in os.walk(base):
        ds[:] = [x for x in ds if not x.startswith("_")]
        for f in sorted(fs):
            if os.path.splitext(f)[1].lower() in EXT:
                yield os.path.join(d, f)


def load(p):
    im = Image.open(p)
    im.load()
    return im.convert("RGBA")


def measure(p):
    im = load(p)
    a = np.asarray(im).astype(np.float32) / 255.0
    rgb, al = a[..., :3], a[..., 3]
    w, h = im.size
    lum = rgb.mean(axis=2)
    if al.min() < 0.98 and (al < 0.5).mean() > 0.02:
        kind = "alpha"
        vis = al
        lum_eff = lum * al
    elif (lum < 0.08).mean() > 0.25:
        kind = "black_bg"
        vis = lum
        lum_eff = lum
    else:
        kind = "opaque"
        vis = lum
        lum_eff = lum
    sat = (rgb.max(axis=2) - rgb.min(axis=2))
    ms = float(sat[vis > 0.1].mean()) if (vis > 0.1).any() else 0.0
    color = "gray" if ms < 0.05 else "tinted" if ms < 0.25 else "color"
    cov = float((vis > 0.3).mean())
    m = 0.04
    edge = max(float(vis[0, :].max()), float(vis[-1, :].max()), float(vis[:, 0].max()), float(vis[:, -1].max()))
    edge_touch = edge > 0.25
    # direction: how much the silhouette survives a 90 degree turn (1 = looks the same, 0 = totally different)
    v = Image.fromarray((np.clip(vis, 0, 1) * 255).astype(np.uint8)).resize((96, 96))
    g = np.asarray(v).astype(np.float32); g -= g.mean()
    r90 = np.rot90(g)
    den = float(np.sqrt((g * g).sum() * (r90 * r90).sum())) or 1.0
    rot_corr = float((g * r90).sum() / den)
    warn = []
    if edge_touch:
        warn.append("chạm mép (có thể cắt vuông)")
    if kind == "opaque":
        warn.append("không alpha, không nền đen")
    if max(w, h) < 128:
        warn.append("nhỏ <128")
    if w & (w - 1) or h & (h - 1):
        warn.append("không POT")
    return dict(w=w, h=h, aspect=round(w / h, 2), kind=kind, color=color,
                mean_lum=round(float(lum_eff.mean()), 3), coverage=round(cov, 3), rot_corr=round(rot_corr, 2),
                edge_touch=int(edge_touch), warn="; ".join(warn))


def props():
    # nhan thu cong (huong / sheet) nam o library_direction.csv: ghi vao day, khong bi script ghi de
    dpath = os.path.join(OUT, "library_direction.csv")
    lab = {}
    if os.path.exists(dpath):
        for r in csv.DictReader(open(dpath, encoding="utf-8-sig")):
            lab[r["file"]] = r
    rows = []
    for p in files():
        rel = os.path.relpath(p, LIB).replace("\\", "/")
        try:
            r = measure(p)
        except Exception as e:  # noqa
            r = dict(w=0, h=0, aspect=0, kind="error", color="", mean_lum=0, coverage=0, rot_corr=0, edge_touch=0, warn=str(e)[:60])
        l = lab.get(rel, {})
        rc = float(r.get("rot_corr", 0))
        nhap = "omni" if rc >= 0.75 else "dir" if rc < 0.45 else "xem"   # nháp từ độ giống sau khi xoay 90°; ảnh mới phải xem tay rồi ghi vào library_direction.csv
        rows.append(dict(file=rel, direction=l.get("direction", "chua_xet"), direction_nhap=nhap, sheet=l.get("sheet", ""), **r))
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, "library_props.csv")
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        wr = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        wr.writeheader()
        wr.writerows(rows)
    print(f"{len(rows)} ảnh -> {path}")
    bad = [r for r in rows if r["warn"]]
    print(f"{len(bad)} ảnh có cảnh báo")
    new = [r["file"] for r in rows if r["direction"] == "chua_xet"]
    if new:
        print(f"{len(new)} ảnh MỚI chưa gán nhãn hướng (xem contact sheet rồi ghi vào library_direction.csv):")
        for f in new[:30]: print("  ", f)


def contact(sub, cell=256, cols=6):
    fs = list(files(sub))
    if not fs:
        sys.exit("không có ảnh trong " + sub)
    rows = math.ceil(len(fs) / cols)
    sheet = Image.new("RGB", (cols * cell, rows * (cell + 18)), (40, 40, 40))
    d = ImageDraw.Draw(sheet)
    for i, p in enumerate(fs):
        im = load(p)
        # nền caro xám để thấy alpha thật; ảnh nền đen không alpha vẫn thấy nền đen
        tile = Image.new("RGB", (cell, cell), (90, 90, 90))
        td = ImageDraw.Draw(tile)
        for y in range(0, cell, 16):
            for x in range(0, cell, 16):
                if (x // 16 + y // 16) % 2:
                    td.rectangle([x, y, x + 15, y + 15], fill=(120, 120, 120))
        im.thumbnail((cell - 4, cell - 4))
        tile.paste(im, ((cell - im.width) // 2, (cell - im.height) // 2), im)
        x, y = (i % cols) * cell, (i // cols) * (cell + 18)
        sheet.paste(tile, (x, y))
        d.text((x + 3, y + cell + 3), os.path.splitext(os.path.basename(p))[0][-18:], fill=(230, 230, 230))
    out = os.path.join(OUT, "_contact")
    os.makedirs(out, exist_ok=True)
    path = os.path.join(out, sub.replace("/", "_").replace("\\", "_") + ".png")
    sheet.save(path)
    print(len(fs), "ảnh ->", path)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser()
    ap.add_argument("--contact", help="thư mục con của Assets/Library, ví dụ glow/flare")
    a = ap.parse_args()
    contact(a.contact) if a.contact else props()
