"""From T_SF_HpFill (green bar inside a dark track) cut the bare green bar, plus red (low HP) and blue (shield) hue copies."""
import sys, os, colorsys
from PIL import Image
import numpy as np
d = sys.argv[1]
a = np.asarray(Image.open(os.path.join(d, 'T_SF_HpFill.png')).convert('RGBA')).astype(float)
r, g, b, al = a[...,0], a[...,1], a[...,2], a[...,3]
green = (g > r + 40) & (g > b + 40) & (al > 200)
ys, xs = np.nonzero(green)
y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
print('green bbox', x0, y0, x1, y1)
bar = a[y0:y1, x0:x1].copy()
m = green[y0:y1, x0:x1]
# soft edge: keep green-ish pixels, fade the rest by how green they are
gr = np.clip((bar[...,1] - np.maximum(bar[...,0], bar[...,2])) / 40.0, 0, 1)
bar[...,3] = np.where(m, bar[...,3], bar[...,3] * gr)
Image.fromarray(bar.astype(np.uint8)).save(os.path.join(d, 'T_SF_HpBar.png'))
def hue(img, shift, sat=1.0):
    out = img.copy()
    rgb = out[...,:3] / 255.0
    flat = rgb.reshape(-1, 3)
    res = np.array([colorsys.hsv_to_rgb(((h + shift) % 1.0), min(1, s * sat), v) for h, s, v in (colorsys.rgb_to_hsv(*p) for p in flat)])
    out[...,:3] = (res.reshape(rgb.shape) * 255)
    return out
Image.fromarray(hue(bar, -0.33).astype(np.uint8)).save(os.path.join(d, 'T_SF_HpBarLow.png'))
Image.fromarray(hue(bar, 0.28).astype(np.uint8)).save(os.path.join(d, 'T_SF_ShieldBar.png'))
print('bar size', bar.shape[1], bar.shape[0])
