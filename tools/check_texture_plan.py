"""Check that every Assets/Library texture used by a builder is written down in the effect's plan (art lead rule 2026-11-13:
"mỗi texture trong builder phải có một dòng trong plan: thành phần -> thư mục -> ảnh chốt + ảnh loại").

For each builder (Assets/VFX/<Effect>/Editor/*.cs) it collects the Library paths used (`Lib + "x/y/z.png"` or "Assets/Library/x/y/z.png"),
then looks for each image name in Docs/VFX/<Effect>*/ *.md (+ Docs/VFX/_Anatomy/*.md is NOT counted: the plan must say why).
An image counts as mentioned if the plan text has its stem (ring_thin_003) or the stem without the group prefix (arc_sheet_006).

usage: python -I tools/check_texture_plan.py [--changed] [--builder PATH ...] [--root .]
  --changed   only builders that git reports as new / modified
  --builder   only these .cs files (repeatable; also checks legacy ones)
  --all       also check builders listed in tools/texture_plan_legacy.txt (old ones, skipped by default)
exit code 1 if any texture is missing from its plan, or the Library file does not exist.
"""
import argparse, os, re, subprocess, sys

LIB_RE = re.compile(r'(?:Lib\s*\+\s*|"Assets/Library/\s*\+?\s*)?"([A-Za-z0-9_\-./()]+\.(?:png|jpg|jpeg|psd|tga))"')


def lib_paths(src):
    """Library-relative paths in a builder: Lib + "a/b/c.png" and "Assets/Library/a/b/c.png"."""
    out = set()
    for m in re.finditer(r'Lib\s*\+\s*"([^"]+\.(?:png|jpg|jpeg|psd|tga))"', src):
        out.add(m.group(1))
    for m in re.finditer(r'"Assets/Library/([^"]+\.(?:png|jpg|jpeg|psd|tga))"', src):
        out.add(m.group(1))
    return out


def stems(path):
    stem = os.path.splitext(os.path.basename(path))[0]
    parts = stem.split("_")
    short = "_".join(parts[1:]) if len(parts) > 2 else stem
    return stem, short


def plan_text(root, effect_dir):
    """All .md under Docs/VFX/<effect_dir>*/ (e.g. VioletThunder, VioletThunder_Toxic)."""
    docs = os.path.join(root, "Docs", "VFX")
    text = []
    if not os.path.isdir(docs):
        return ""
    for d in os.listdir(docs):
        if d == effect_dir or d.startswith(effect_dir + "_"):
            for dp, _, fs in os.walk(os.path.join(docs, d)):
                for f in fs:
                    if f.lower().endswith(".md"):
                        try:
                            text.append(open(os.path.join(dp, f), encoding="utf-8", errors="ignore").read())
                        except OSError:
                            pass
    return "\n".join(text)


def changed_files(root):
    r = subprocess.run(["git", "status", "--porcelain", "--", "Assets/VFX"], cwd=root, capture_output=True, text=True)
    files = set()
    for line in r.stdout.splitlines():
        if line[:2].strip() in ("D", "AD"):
            continue
        p = line[3:].strip().strip('"')
        if p.endswith(".cs"):
            files.add(os.path.normpath(os.path.join(root, p)))
    return files


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".")
    ap.add_argument("--changed", action="store_true")
    ap.add_argument("--builder", action="append")
    ap.add_argument("--all", action="store_true", help="cũng kiểm các builder trong tools/texture_plan_legacy.txt")
    a = ap.parse_args()
    root = os.path.abspath(a.root)

    builders = []
    if a.builder:
        builders = [os.path.abspath(b) for b in a.builder]
    else:
        base = os.path.join(root, "Assets", "VFX")
        for dp, dn, fs in os.walk(base):
            dn[:] = [d for d in dn if not d.startswith("_") or d in ("_Components",)]
            if os.path.basename(dp) != "Editor":
                continue
            builders += [os.path.join(dp, f) for f in fs if f.endswith("Build.cs")]
        if a.changed:
            ch = changed_files(root)
            builders = [b for b in builders if os.path.normpath(b) in ch]

    legacy = set()
    lp = os.path.join(root, "tools", "texture_plan_legacy.txt")
    if os.path.isfile(lp) and not a.all and not a.builder:
        legacy = {l.strip() for l in open(lp, encoding="utf-8") if l.strip() and not l.startswith("#")}
    skipped = 0
    bad = 0
    for b in sorted(builders):
        if os.path.relpath(b, root).replace("\\", "/") in legacy:
            skipped += 1
            continue
        rel = os.path.relpath(b, root).replace("\\", "/")
        parts = rel.split("/")
        effect = parts[2] if len(parts) > 3 else ""
        src = open(b, encoding="utf-8", errors="ignore").read()
        paths = lib_paths(src)
        if not paths:
            continue
        plan = plan_text(root, effect)
        problems = []
        for p in sorted(paths):
            if not os.path.isfile(os.path.join(root, "Assets", "Library", p)):
                problems.append(f"  KHÔNG TỒN TẠI trong Library: {p}")
                continue
            stem, short = stems(p)
            if stem not in plan and short not in plan:
                problems.append(f"  thiếu trong plan: {p}")
        if not plan:
            problems.insert(0, f"  không có plan (Docs/VFX/{effect}*/*.md)")
        if problems:
            bad += 1
            print(f"[X] {rel}")
            print("\n".join(problems))
        else:
            print(f"[ok] {rel} ({len(paths)} ảnh Library)")
    print(f"\n{len(builders) - skipped} builder kiểm, {skipped} builder cũ bỏ qua, {bad} có vấn đề")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
