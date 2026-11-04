"""codefx: frame coherence check. Usage: python -I mesh/coherence.py <effect.py>
Frame coherence: inside the mass, pixels that were eaten at frame f but solid again at f+1 (30 fps)."""
import sys, importlib.util, numpy as np
sys.path.insert(0, r'D:/Game_prj/VFX_LIb/.claude/skills/vfx-maker/codefx')
import codefx as cf
from smoke import blur
spec = importlib.util.spec_from_file_location('fx', sys.argv[1]); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
M = m.META; o = dict(M['options'])
D = M['duration']; ts = [i / 30 for i in range(int(D * 30))]
fr = cf.render(m, None, ts, 1.0)
worst = 0
for i in range(len(fr) - 1):
    A0, A1 = fr[i].alpha, fr[i + 1].alpha
    solid0 = blur((A0 > 0.01).astype(float), 3) > 0.99            # well inside the silhouette (motion at the rim ignored)
    hole0 = (A0 < 0.1) & (blur((A0 > 0.5).astype(float), 4) > 0.5)  # an eaten hole surrounded by smoke
    back = hole0 & (A1 > 0.6)
    n = int(back.sum()); worst = max(worst, n)
    if n > 3: print(f"t={ts[i]:.3f}->{ts[i+1]:.3f}: {n} px refilled")
print("worst refill px per step:", worst)
