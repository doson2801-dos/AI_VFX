#!/usr/bin/env python3
"""Build one VFX effect with Unity batchmode, on any machine (Linux / Windows / macOS).

usage:  python3 -I tools/unity_build.py <Class> --effect <Effect> [--method BuildBatch] [--clone auto|always|never]
                                         [--copyback PATH ...] [--warmup] [--timeout SEC] [--dry-run]

  <Class>     builder class, "VfxEffects.FireBreathBuild" or just "FireBreathBuild" (VfxEffects. is added)
  --effect    effect folder name: Assets/VFX/<Effect>/ and Docs/VFX/<Effect>/ (what is copied back in clone mode)
  --clone     auto (default): if the Unity editor already has this project open (one instance per project), build in a copy
              under /tmp (Assets, Packages, ProjectSettings, Library are rsync'ed), then copy the effect back with its .meta.
  --copyback  extra project-relative paths to copy back from the clone (e.g. Assets/VFX/_Shared/Shaders/SH_VFX_X.shader)
  --warmup    run one empty batch first so changed / new scripts get their MonoScript (otherwise prefabs can save m_Script Missing)

What it does for you (lessons from the order logs):
  - waits for a lock (work/vfx_orders/.unity.lock) so parallel workers take turns;
  - never passes -nographics (the preview sheet needs graphics; with it Unity crashes while rendering);
  - without DISPLAY on Linux it uses the desktop X server (/tmp/.X11-unix) or else xvfb-run;
  - prints the errors / "built OK" lines and where BuildReport.txt + Preview_sheet.png are; exit code 0 only on "built OK".
Not tested against a real Unity run by the author of this file; read the log path it prints if something looks off.
"""
import argparse, glob, os, platform, re, shutil, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOCK_PATH = os.path.join(ROOT, "work", "vfx_orders", ".unity.lock")


def unity_version():
    with open(os.path.join(ROOT, "ProjectSettings", "ProjectVersion.txt"), encoding="utf-8") as f:
        m = re.search(r"m_EditorVersion:\s*(\S+)", f.read())
    return m.group(1)


def find_unity(ver):
    env = os.environ.get("UNITY_EDITOR")
    if env and os.path.exists(env):
        return env
    home = os.path.expanduser("~")
    cands = {
        "Linux": [f"{home}/Unity/Hub/Editor/{ver}/Editor/Unity"],
        "Windows": [f"C:/Program Files/Unity/Hub/Editor/{ver}/Editor/Unity.exe"],
        "Darwin": [f"/Applications/Unity/Hub/Editor/{ver}/Unity.app/Contents/MacOS/Unity"],
    }.get(platform.system(), [])
    for c in cands:
        if os.path.exists(c):
            return c
    sys.exit(f"Unity {ver} not found. Set UNITY_EDITOR=<path to the editor binary>.")


def editor_open_on(project):
    """True if a Unity editor has this project open (Temp/UnityLockfile + a live process)."""
    if not os.path.exists(os.path.join(project, "Temp", "UnityLockfile")):
        return False
    if platform.system() == "Windows":
        return True  # cannot cheaply tell a stale lockfile apart; building in a clone is always safe
    try:
        out = subprocess.run(["pgrep", "-af", "Unity"], capture_output=True, text=True).stdout
    except FileNotFoundError:
        return True
    return any(("-projectpath" in l.lower() or "-projectPath" in l) and project in l for l in out.splitlines())


class Lock:
    """Turn-taking between parallel workers: flock on posix, mkdir spin on Windows."""
    def __init__(self, wait=3600):
        self.wait = wait
        self.fh = None

    def __enter__(self):
        os.makedirs(os.path.dirname(LOCK_PATH), exist_ok=True)
        t0 = time.time()
        try:
            import fcntl
        except ImportError:
            fcntl = None
        if fcntl:
            # the same path workers use with `flock work/vfx_orders/.unity.lock <cmd>` (file or directory both work)
            self.fh = os.fdopen(os.open(LOCK_PATH, os.O_RDONLY), "r") if os.path.isdir(LOCK_PATH) else open(LOCK_PATH, "a")
            while True:
                try:
                    fcntl.flock(self.fh, fcntl.LOCK_EX | fcntl.LOCK_NB)
                    return self
                except OSError:
                    if time.time() - t0 > self.wait:
                        sys.exit("waited too long for work/vfx_orders/.unity.lock")
                    time.sleep(5)
        d = LOCK_PATH + ".d"
        while True:
            try:
                os.mkdir(d)
                self.fh = d
                return self
            except FileExistsError:
                if time.time() - t0 > self.wait:
                    sys.exit("waited too long for the unity lock")
                time.sleep(5)

    def __exit__(self, *a):
        if isinstance(self.fh, str):
            shutil.rmtree(self.fh, ignore_errors=True)
        elif self.fh:
            self.fh.close()


def sync_clone(clone):
    os.makedirs(clone, exist_ok=True)
    if not shutil.which("rsync"):
        sys.exit("clone mode needs rsync")
    for d in ("Assets", "Packages", "ProjectSettings", "Library"):
        if os.path.isdir(os.path.join(ROOT, d)):
            subprocess.run(["rsync", "-a", "--delete", f"{ROOT}/{d}/", f"{clone}/{d}/"], check=True)
    os.makedirs(os.path.join(clone, "Docs", "VFX"), exist_ok=True)


def copy_back(clone, rel):
    src = os.path.join(clone, rel)
    if not os.path.exists(src):
        return False
    dst = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if os.path.isdir(src):
        subprocess.run(["rsync", "-a", src.rstrip("/") + "/", dst.rstrip("/") + "/"], check=True)
    else:
        shutil.copy2(src, dst)
    meta = src + ".meta"
    if os.path.exists(meta):
        shutil.copy2(meta, dst + ".meta")
    return True


def run_unity(unity, project, log, method=None, timeout=1800):
    cmd = [unity, "-batchmode", "-quit", "-projectPath", project, "-logFile", log]
    if method:
        cmd += ["-executeMethod", method]
    env = os.environ.copy()
    if platform.system() == "Linux" and not env.get("DISPLAY"):
        # Unity needs a display even in batchmode (graphics on, for the preview sheet): use the desktop's X server if there is one, else xvfb
        socks = sorted(glob.glob("/tmp/.X11-unix/X*"))
        if socks:
            env["DISPLAY"] = ":" + socks[0].rsplit("X", 1)[1]
            xauth = os.path.expanduser("~/.Xauthority")
            if os.path.exists(xauth) and not env.get("XAUTHORITY"):
                env["XAUTHORITY"] = xauth
        elif shutil.which("xvfb-run"):
            cmd = ["xvfb-run", "-a"] + cmd
        else:
            sys.exit("No display: Unity batch needs one. Set DISPLAY, or install xvfb (xvfb-run).")
    print("$", " ".join(cmd), "  [DISPLAY=%s]" % env.get("DISPLAY"), flush=True)
    return subprocess.run(cmd, timeout=timeout, env=env).returncode


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cls")
    ap.add_argument("--effect", required=True)
    ap.add_argument("--method", default="BuildBatch")
    ap.add_argument("--clone", choices=("auto", "always", "never"), default="auto")
    ap.add_argument("--copyback", action="append", default=[])
    ap.add_argument("--warmup", action="store_true")
    ap.add_argument("--no-lock", action="store_true", help="the caller already holds work/vfx_orders/.unity.lock (e.g. wrapped in flock): do not lock again, that would deadlock")
    ap.add_argument("--timeout", type=int, default=1800)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    cls = a.cls if "." in a.cls else "VfxEffects." + a.cls
    ver = unity_version()
    unity = find_unity(ver) if not a.dry_run else (os.environ.get("UNITY_EDITOR") or f"<unity {ver}>")
    is_open = editor_open_on(ROOT)
    use_clone = a.clone == "always" or (a.clone == "auto" and is_open)
    clone = os.path.join("/tmp" if platform.system() != "Windows" else os.environ.get("TEMP", "C:/Temp"),
                         os.path.basename(ROOT).lower() + "_clone")
    project = clone if use_clone else ROOT
    os.makedirs(os.path.join(ROOT, "Logs"), exist_ok=True)
    log = os.path.join(ROOT, "Logs", f"build_{a.effect}.log")
    clone_log = os.path.join(project, "Logs", f"build_{a.effect}.log") if use_clone else log
    method = f"{cls}.{a.method}"

    print(f"Unity {ver}; editor open on project: {is_open}; mode: {'CLONE ' + clone if use_clone else 'in place'}; method: {method}")
    if a.dry_run:
        print("dry-run: nothing executed.")
        return 0

    import contextlib
    with (contextlib.nullcontext() if a.no_lock else Lock()):
        if use_clone:
            os.makedirs(os.path.join(clone, "Logs"), exist_ok=True)
            sync_clone(clone)
        if a.warmup:
            run_unity(unity, project, clone_log + ".warmup", None, a.timeout)
        rc = run_unity(unity, project, clone_log, method, a.timeout)
        if use_clone:
            shutil.copy2(clone_log, log) if os.path.exists(clone_log) else None
            for rel in [f"Assets/VFX/{a.effect}", f"Docs/VFX/{a.effect}"] + a.copyback:
                print(("copied back: " if copy_back(clone, rel) else "not found in clone: ") + rel)
            # the effect folder's own .meta (sits next to the folder)
            copy_back(clone, f"Assets/VFX/{a.effect}.meta")

    text = open(log, encoding="utf-8", errors="replace").read() if os.path.exists(log) else ""
    lines = text.splitlines()
    bad = [l for l in lines if re.search(r"error CS\d+|Exception|Shader error|Missing", l)][:10]
    ok = any("built OK" in l for l in lines)
    print(f"\nUnity exit code: {rc}; 'built OK': {ok}; log: {log}")
    for l in bad:
        print("  !", l.strip()[:200])
    print("BuildReport:", f"Docs/VFX/{a.effect}/BuildReport.txt", "| Preview:", f"Docs/VFX/{a.effect}/Preview_sheet.png")
    return 0 if ok and rc == 0 and not any("error CS" in l for l in bad) else 1


if __name__ == "__main__":
    sys.exit(main())
