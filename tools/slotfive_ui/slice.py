"""Cut the Slot Five UI sheet into sprites. usage: slice.py <sheet.webp> <outdir> <previewdir>"""
import sys, os
from PIL import Image
import numpy as np
src, out, prev = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(out, exist_ok=True); os.makedirs(prev, exist_ok=True)
sheet = Image.open(src).convert('RGBA')
A = np.asarray(sheet).copy()

BOX = {  # name: (x0, y0, x1, y1) in sheet px, generous; tightened to alpha>0 below
    'T_SF_StageBg':     (18, 7, 446, 761),
    'T_SF_ReelPanel':   (455, 10, 1024, 674),
    'T_SF_Icon_Volt':   (1054, 12, 1173, 139),
    'T_SF_Icon_Blade':  (1054, 139, 1172, 258),
    'T_SF_Icon_Lucky':  (1054, 258, 1172, 375),
    'T_SF_Icon_Shield': (1054, 375, 1172, 494),
    'T_SF_Icon_Heal':   (1054, 494, 1172, 620),
    'T_SF_HeroPlayer':  (470, 652, 670, 836),
    'T_SF_HeroFoe':     (770, 652, 975, 836),
    'T_SF_Vs':          (683, 784, 768, 880),
    'T_SF_Banner':      (462, 910, 954, 976),
    'T_SF_BtnSpin':     (584, 977, 826, 1104),
    'T_SF_BtnHelp':     (396, 992, 478, 1080),
    'T_SF_BtnFast':     (479, 990, 582, 1080),
    'T_SF_BtnNew':      (828, 990, 1012, 1080),
    'T_SF_PanelBottom': (20, 1104, 624, 1276),
    'T_SF_PanelLegend': (30, 912, 378, 1090),
    'T_SF_HpFill':      (640, 1158, 858, 1207),
    'T_SF_HpTrack':     (860, 1158, 997, 1206),
    'T_SF_TagPlayer':   (639, 1209, 762, 1270),
    'T_SF_TagFoe':      (762, 1206, 880, 1271),
}

def erase_text(img):
    """Banner: paint over the baked caption by interpolating each row between the colours left/right of it."""
    a = np.asarray(img).astype(float)
    h, w = a.shape[:2]
    bright = (a[..., :3].min(axis=2) > 170) & (a[..., 3] > 250)
    ys, xs = np.nonzero(bright[int(h*0.2):int(h*0.8), int(w*0.15):int(w*0.85)])
    y0, y1 = ys.min() + int(h*0.2) - 3, ys.max() + int(h*0.2) + 4
    x0, x1 = xs.min() + int(w*0.15) - 6, xs.max() + int(w*0.15) + 7
    for y in range(y0, y1):
        L, R = a[y, x0 - 1].copy(), a[y, x1].copy()
        for x in range(x0, x1):
            t = (x - x0) / max(1, x1 - x0)
            a[y, x] = L * (1 - t) + R * t
    print('  banner text erased x', x0, x1, 'y', y0, y1)
    return Image.fromarray(a.clip(0, 255).astype(np.uint8))

# The sheet has a faint dark haze (alpha ~40-60) around every piece; a box crop cuts it into a visible rectangle.
# Keep alpha only near the solid art: full within 2 px of alpha>200, fading to 0 at 9 px.
DEHAZE = {'T_SF_BtnSpin', 'T_SF_BtnHelp', 'T_SF_BtnFast', 'T_SF_BtnNew', 'T_SF_Vs', 'T_SF_Banner', 'T_SF_TagPlayer',
          'T_SF_TagFoe', 'T_SF_HpTrack', 'T_SF_PanelBottom', 'T_SF_PanelLegend', 'T_SF_Icon_Volt', 'T_SF_Icon_Blade',
          'T_SF_Icon_Lucky', 'T_SF_Icon_Shield', 'T_SF_Icon_Heal'}
def dehaze(img, near=2.0, far=9.0):
    from scipy import ndimage
    a = np.asarray(img).astype(float)
    dist = ndimage.distance_transform_edt(a[..., 3] <= 200)
    keep = np.clip((far - dist) / (far - near), 0, 1)
    a[..., 3] *= keep
    return Image.fromarray(a.astype(np.uint8))

info = {}
for name, (x0, y0, x1, y1) in BOX.items():
    crop = sheet.crop((x0, y0, x1, y1))
    if name == 'T_SF_ReelPanel':
        # the heroes' hair pokes into the bottom rows; keep only the centre diamond there
        m = np.asarray(crop).copy()
        cy, cx0, cx1 = 652 - y0, 690 - x0, 790 - x0
        m[cy:, :cx0, 3] = 0; m[cy:, cx1:, 3] = 0
        crop = Image.fromarray(m)
    bb = crop.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    crop = crop.crop(bb)
    if name == 'T_SF_Banner': crop = erase_text(crop)
    if name in DEHAZE:
        crop = dehaze(crop)
        bb2 = crop.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
        crop = crop.crop(bb2)
    if name == 'T_SF_StageBg': crop = crop.crop((1, 1, crop.width - 1, crop.height - 1))
    crop.save(os.path.join(out, name + '.png'))
    info[name] = (x0 + bb[0], y0 + bb[1], crop.size)
    print(name, 'at', x0 + bb[0], y0 + bb[1], 'size', crop.size)

# contact sheet on dark bg for checking
cells = [Image.open(os.path.join(out, n + '.png')) for n in BOX]
W = 1300; x = y = rowh = 0; pos = []
for c in cells:
    if x + c.width > W: x = 0; y += rowh + 10; rowh = 0
    pos.append((x, y)); x += c.width + 10; rowh = max(rowh, c.height)
cs = Image.new('RGBA', (W, y + rowh), (40, 40, 48, 255))
for c, p in zip(cells, pos): cs.alpha_composite(c, p)
cs.convert('RGB').save(os.path.join(prev, 'contact.png'))
