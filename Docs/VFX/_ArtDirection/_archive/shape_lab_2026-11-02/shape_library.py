"""Shape Lab library: turn textures (single shapes or flipbook sheets) into library entries.

Layout:
  tools/shape_library/library.json          elements + shape list (metadata, editable by hand)
  tools/shape_library/<element>/<id>.png    tone mask, 8-bit grayscale (value = opacity)
  tools/shape_library/<element>/<id>_t.png  160px thumbnail of the fullest frame
  tools/shape_library.js                    generated list loaded by shape_lab.html (do not edit)

Images are loaded by relative path, so the tool must be opened over http (the artifact,
or the "shape-lab" server in .claude/launch.json), not as a file:// page.

Usage:
  python shape_library.py add <image> --element fire --name "Ngọn lửa 1" [--grid 4x4] [--binary]
  python shape_library.py import-folder <dir> --element smoke [--skip REGEX] [--grid-for NAME=CxR] [--dry-run]
  python shape_library.py import-json <ShapeLab_shape_cua_ban.json>
  python shape_library.py remove <shape_id>
  python shape_library.py list
  python shape_library.py build

Tone: the mask keeps inner light/dark layers (opacity x brightness). --binary keeps only the
silhouette. Grid: read from the file name (e.g. _4x4 = 4 columns x 4 rows), checked against the
image, otherwise detected from empty gutters between frames.
"""
import argparse
import base64
import io
import json
import re
import sys
import unicodedata
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
META = ROOT / "library.json"
OUT_JS = ROOT.parent / "shape_library.js"
CELL = 320      # max frame size stored in the library
THUMB = 160
DEFAULT_SKIP = r"(_Grayscale|_Gray|_VertexOffset|_C| 1|_Blur)$"


def slug(s):
    s = s.replace("đ", "d").replace("Đ", "D")
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+", "_", s).strip("_").lower()
    return s or "shape"


def nice_name(stem):
    s = re.sub(r"^(FX_TX_Fire_|FX_TX_|TX_VFX_|T_VFX_)", "", stem)
    s = re.sub(r"_\d+x\d+", "", s)
    s = re.sub(r"_NoBlur$", "", s)
    return s.replace("_", " ").strip()


def load_meta():
    return json.loads(META.read_text(encoding="utf-8"))


def save_meta(m):
    META.write_text(json.dumps(m, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def read_tone(img, binary=False, thr=0.5):
    """Return (tone array 0..1, channel name). Tone = opacity x normalised brightness."""
    a = np.asarray(img.convert("RGBA")).astype(np.float32) / 255
    rgb, alpha = a[..., :3], a[..., 3]
    lum = rgb @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    if (alpha < 0.98).mean() > 0.05:
        ch = "alpha"
        inside = alpha > 0.5
        hi = float(np.percentile(lum[inside], 99)) if inside.any() else 1.0
        v = alpha if binary else alpha * np.clip(lum / max(hi, 0.05), 0, 1)
    else:
        border = np.concatenate([lum[0], lum[-1], lum[:, 0], lum[:, -1]])
        ch = "dark" if border.mean() > 0.5 else "lum"
        v = 1 - lum if ch == "dark" else lum
        hi = float(np.percentile(v, 99.5))
        v = np.clip(v / max(hi, 0.05), 0, 1)
    if binary:
        v = (v > thr).astype(np.float32)
    return v, ch


def grid_score(v, c, r):
    """Mean tone on the internal cell borders (low = frames do not cross the borders)."""
    H, W = v.shape
    lines = []
    for k in range(1, c):
        x = round(k * W / c)
        lines.append(v[:, max(0, x - 2): x + 2].mean())
    for k in range(1, r):
        y = round(k * H / r)
        lines.append(v[max(0, y - 2): y + 2, :].mean())
    return max(lines) if lines else 0.0


def detect_grid(v, hint):
    mean = max(float(v.mean()), 1e-4)
    if hint:
        c, r = hint
        if grid_score(v, c, r) < 0.08 * mean:
            return c, r, "tên file"
        if grid_score(v, r, c) < 0.08 * mean:
            return r, c, "tên file (đảo)"
        # Frames that touch (tiling strips, soft blur) hide the gutters: trust the artist's name.
        return c, r, "tên file"
    best = (1, 1)
    for c in range(1, 9):
        for r in range(1, 9):
            if c * r <= best[0] * best[1]:
                continue
            if grid_score(v, c, r) < 0.02 * mean:
                # every column and row must hold something, or the grid is too fine
                H, W = v.shape
                cols = [v[:, round(k * W / c): round((k + 1) * W / c)].mean() for k in range(c)]
                rows = [v[round(k * H / r): round((k + 1) * H / r), :].mean() for k in range(r)]
                if min(cols) > 0.05 * mean and min(rows) > 0.05 * mean:
                    best = (c, r)
    return best[0], best[1], ("tự dò" if best != (1, 1) else "ảnh đơn")


def to_png_bytes(arr):
    buf = io.BytesIO()
    Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8), "L").save(buf, "PNG", optimize=True)
    return buf.getvalue()


def fit_crop(cell, size, fill):
    ys, xs = np.where(cell > 0.02)
    if len(xs) == 0:
        return np.zeros((size, size), np.float32)
    crop = cell[ys.min(): ys.max() + 1, xs.min(): xs.max() + 1]
    h, w = crop.shape
    s = size * fill / max(h, w)
    nw, nh = max(1, round(w * s)), max(1, round(h * s))
    small = np.asarray(Image.fromarray((crop * 255).astype(np.uint8), "L").resize((nw, nh), Image.LANCZOS)) / 255
    out = np.zeros((size, size), np.float32)
    y0, x0 = (size - nh) // 2, (size - nw) // 2
    out[y0: y0 + nh, x0: x0 + nw] = small
    return out


def make_entry(path, element, name, meta, grid=None, binary=False, dry=False):
    img = Image.open(path)
    v, ch = read_tone(img, binary)
    hint = grid
    if hint is None:
        m = re.search(r"_(\d+)x(\d+)", Path(path).stem)
        hint = (int(m.group(1)), int(m.group(2))) if m else None
    c, r, how = detect_grid(v, hint)
    H, W = v.shape
    cw, chh = W / c, H / r
    cells = [v[round(j * chh): round((j + 1) * chh), round(i * cw): round((i + 1) * cw)] for j in range(r) for i in range(c)]
    cov = [float(x.mean()) for x in cells]
    peak = max(cov) if cov else 0
    if peak <= 0:
        print(f"  ! bỏ qua {Path(path).name}: không có shape")
        return None
    frames = max(i for i, x in enumerate(cov) if x > 0.01 * peak) + 1
    best = int(np.argmax(cov[:frames]))
    ids = {s["id"] for s in meta["shapes"]}
    base = f"{element}_{slug(name)}"
    sid, n = base, 2
    while sid in ids:
        sid, n = f"{base}_{n}", n + 1
    kind = "flipbook" if frames > 1 else "mask"
    print(f"  + {sid:45s} {kind:8s} lưới {c}x{r} ({how}), {frames} frame, kênh {ch}")
    if dry:
        return None
    s = min(1.0, CELL / max(cw, chh))
    ncw, nch = max(1, round(cw * s)), max(1, round(chh * s))
    if kind == "mask":
        sheet = fit_crop(cells[0], 512, 0.72)
    else:
        sheet = np.zeros((nch * r, ncw * c), np.float32)
        for k, cell in enumerate(cells[:frames]):
            small = np.asarray(Image.fromarray((cell * 255).astype(np.uint8), "L").resize((ncw, nch), Image.LANCZOS)) / 255
            j, i = divmod(k, c)
            sheet[j * nch: (j + 1) * nch, i * ncw: (i + 1) * ncw] = small
    (ROOT / element).mkdir(exist_ok=True)
    rel, trel = f"{element}/{sid}.png", f"{element}/{sid}_t.png"
    (ROOT / rel).write_bytes(to_png_bytes(sheet))
    (ROOT / trel).write_bytes(to_png_bytes(fit_crop(cells[best], THUMB, 0.84)))
    entry = {"id": sid, "element": element, "name": name, "kind": kind, "file": rel, "thumb": trel,
             "source": Path(path).name, "channel": ch, "params": {"smooth": 0} if not binary else {}}
    if kind == "flipbook":
        entry.update({"cols": c, "rows": r, "frames": frames, "best": best})
    meta["shapes"].append(entry)
    return entry


def check_element(meta, el):
    ids = {e["id"] for e in meta["elements"]}
    if el not in ids:
        sys.exit(f"Nguyên tố '{el}' chưa có. Có: {', '.join(sorted(ids))}")


def cmd_add(a):
    meta = load_meta()
    check_element(meta, a.element)
    grid = tuple(int(x) for x in a.grid.lower().split("x")) if a.grid else None
    make_entry(a.image, a.element, a.name, meta, grid, a.binary)
    save_meta(meta)
    cmd_build(a)


def cmd_import_folder(a):
    meta = load_meta()
    check_element(meta, a.element)
    skip = re.compile(a.skip) if a.skip else None
    grids = {}
    for g in a.grid_for or []:
        name, _, cr = g.partition("=")
        grids[name] = tuple(int(x) for x in cr.lower().split("x"))
    known = {s.get("source") for s in meta["shapes"] if s["element"] == a.element}
    files = sorted(p for p in Path(a.folder).iterdir() if p.suffix.lower() in (".png", ".jpg", ".jpeg", ".tga", ".psd"))
    for p in files:
        if skip and skip.search(p.stem):
            print(f"  - bỏ (bản trùng): {p.name}")
            continue
        if p.name in known:
            print(f"  = đã có: {p.name}")
            continue
        make_entry(p, a.element, nice_name(p.stem), meta, grid=grids.get(p.stem), binary=a.binary, dry=a.dry_run)
    if not a.dry_run:
        save_meta(meta)
        cmd_build(a)


def cmd_import_json(a):
    """Fold shapes saved in the browser (Thư viện > Xuất shape của bạn) into the built-in library."""
    meta = load_meta()
    elements = {e["id"] for e in meta["elements"]}
    data = json.loads(Path(a.json_file).read_text(encoding="utf-8"))
    for s in data.get("shapes", []):
        if s.get("element") not in elements or not s.get("name"):
            continue
        if s.get("kind") == "param" and s.get("shape") in ("fire", "smoke"):
            ids = {x["id"] for x in meta["shapes"]}
            sid, n = f"{s['element']}_{slug(s['name'])}", 2
            while sid in ids:
                sid, n = f"{s['element']}_{slug(s['name'])}_{n}", n + 1
            meta["shapes"].append({"id": sid, "element": s["element"], "name": s["name"], "kind": "param",
                                   "shape": s["shape"], "params": s.get("params", {}), "palette": s.get("palette")})
            print(f"  + {sid} (thông số)")
        elif s.get("kind") == "mask" and str(s.get("mask", "")).startswith("data:image/png;base64,"):
            img = Image.open(io.BytesIO(base64.b64decode(s["mask"].split(",", 1)[1])))
            tmp = ROOT / "_import_tmp.png"
            img.save(tmp)
            e = make_entry(tmp, s["element"], s["name"], meta)
            tmp.unlink(missing_ok=True)
            if e:
                e["params"] = s.get("params", {})
                if s.get("palette"):
                    e["palette"] = s["palette"]
    save_meta(meta)
    cmd_build(a)


def cmd_remove(a):
    meta = load_meta()
    gone = [s for s in meta["shapes"] if s["id"] == a.shape_id]
    if not gone:
        sys.exit(f"Không có shape '{a.shape_id}'.")
    for k in ("file", "thumb"):
        if gone[0].get(k):
            (ROOT / gone[0][k]).unlink(missing_ok=True)
    meta["shapes"] = [s for s in meta["shapes"] if s["id"] != a.shape_id]
    save_meta(meta)
    print(f"Đã xoá {a.shape_id}")
    cmd_build(a)


def cmd_list(_a):
    meta = load_meta()
    for e in meta["elements"]:
        items = [s for s in meta["shapes"] if s["element"] == e["id"]]
        print(f"{e['name']} ({e['id']}): {len(items)}")
        for s in items:
            extra = f" {s['cols']}x{s['rows']}·{s['frames']}f" if s["kind"] == "flipbook" else ""
            print(f"   - {s['id']}  [{s['kind']}{extra}]  {s['name']}")


def cmd_build(_a):
    meta = load_meta()
    shapes = []
    total = 0
    for s in meta["shapes"]:
        s = dict(s)
        for k in ("file", "thumb"):
            if s.get(k):
                total += (ROOT / s[k]).stat().st_size
                s[k] = "shape_library/" + s[k]
        shapes.append(s)
    lib = {"version": 2, "elements": meta["elements"], "shapes": shapes}
    OUT_JS.write_text("/* Generated by shape_library.py build. Do not edit by hand. */\n"
                      # ASCII-only output: Vietnamese text survives any server/browser charset guess.
                      "window.SHAPE_LIBRARY = " + json.dumps(lib, ensure_ascii=True) + ";\n", encoding="utf-8")
    print(f"Đã build {OUT_JS.name}: {len(shapes)} shape, ảnh tổng {total // 1024} KB")


def main():
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")
        except AttributeError:
            pass
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    pa = sub.add_parser("add")
    pa.add_argument("image")
    pa.add_argument("--element", required=True)
    pa.add_argument("--name", required=True)
    pa.add_argument("--grid", help="CxR, vd 4x4 (mặc định đọc từ tên file hoặc tự dò)")
    pa.add_argument("--binary", action="store_true", help="chỉ lấy silhouette, bỏ lớp sáng tối")
    pa.set_defaults(func=cmd_add)
    pf = sub.add_parser("import-folder")
    pf.add_argument("folder")
    pf.add_argument("--element", required=True)
    pf.add_argument("--skip", default=DEFAULT_SKIP, help="regex trên tên file (không đuôi) để bỏ qua bản trùng")
    pf.add_argument("--binary", action="store_true")
    pf.add_argument("--grid-for", action="append", metavar="TEN_FILE=CxR", help="ép lưới cho một file, vd TX_VFX_Biting=2x1")
    pf.add_argument("--dry-run", action="store_true")
    pf.set_defaults(func=cmd_import_folder)
    pj = sub.add_parser("import-json")
    pj.add_argument("json_file")
    pj.set_defaults(func=cmd_import_json)
    pr = sub.add_parser("remove")
    pr.add_argument("shape_id")
    pr.set_defaults(func=cmd_remove)
    sub.add_parser("list").set_defaults(func=cmd_list)
    sub.add_parser("build").set_defaults(func=cmd_build)
    a = p.parse_args()
    a.func(a)


if __name__ == "__main__":
    main()
