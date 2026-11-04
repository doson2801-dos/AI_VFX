"""Blender (headless) -> per-frame passes for a 3D smoke mass, read by codefx.

Run:  blender.exe -b --factory-startup --python blender_passes.py -- <out_dir> [res_scale]
Out:  <out_dir>/passes.npz  P[F, H, W, 5] float16 = (ao added as channel 4; normal.x, normal.y as 0..1 = n*0.5+0.5, noise, alpha), camera space, straight alpha
      <out_dir>/passes.json (fps, frames, size, origin)

Shape = the project's smoke shape in 3D: one big body + lobes hugging it, big inside / small outside, round bottom
touching the ground. Metaballs give the smooth union (lobes melt into each other, no hard seams).
Noise = 3D noise in the space of an empty that grows / rises with the mass, so it sticks to the surface
(dissolve holes and hot patches travel with the smoke, they do not slide over it).
"""
import json
import math
import os
import sys

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector
import numpy as np

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0] if argv else os.path.join(os.getcwd(), "passes")
RS = float(argv[1]) if len(argv) > 1 else 2.0
os.makedirs(OUT, exist_ok=True)

FPS, DUR = 30, 1.2
NF = int(round(FPS * DUR)) + 1
CELL = (176, 128)            # codefx units, 1 unit = WIDTH_M / 176 m
ORIGIN = (88, 112)           # feet / ground point in the cell
WIDTH_M = 4.4
SEED = 5

rng = np.random.default_rng(SEED)

# ---------------------------------------------------------------- scene
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.fps = FPS
sc.frame_start, sc.frame_end = 0, NF - 1
try:
    sc.render.engine = "CYCLES"
except TypeError as e:
    print("engine", e)
sc.cycles.samples = 12
sc.cycles.use_denoising = False
sc.cycles.device = "CPU"
sc.render.film_transparent = True
sc.render.resolution_x = int(CELL[0] * RS)
sc.render.resolution_y = int(CELL[1] * RS)
sc.render.resolution_percentage = 100
sc.view_settings.view_transform = "Standard"
sc.view_settings.look = "None"
sc.view_settings.exposure = 0
sc.view_settings.gamma = 1
sc.render.image_settings.file_format = "OPEN_EXR"
sc.render.image_settings.color_depth = "32"
sc.render.image_settings.color_mode = "RGBA"

# camera: 3/4, looking down 40 deg, orthographic, cell width = WIDTH_M
pitch = math.radians(40)
cam_d = bpy.data.cameras.new("Cam")
cam_d.type = "ORTHO"
cam_d.ortho_scale = WIDTH_M
cam = bpy.data.objects.new("Cam", cam_d)
sc.collection.objects.link(cam)
sc.camera = cam
fwd = np.array([0.0, math.cos(pitch), -math.sin(pitch)])
up = np.array([0.0, math.sin(pitch), math.cos(pitch)])
m_per_u = WIDTH_M / CELL[0]
below = (ORIGIN[1] - CELL[1] / 2) * m_per_u           # ground point sits this far below the image centre
target = up * below
cam.location = tuple(target - fwd * 20)
cam.rotation_euler = (math.pi / 2 - pitch, 0, 0)

# ---------------------------------------------------------------- noise space + material
ns = bpy.data.objects.new("NoiseSpace", None)
sc.collection.objects.link(ns)

mat = bpy.data.materials.new("Pass")
mat.use_nodes = True
nt = mat.node_tree
for n in list(nt.nodes):
    nt.nodes.remove(n)
N = nt.nodes.new
out = N("ShaderNodeOutputMaterial")
emi = N("ShaderNodeEmission")
geo = N("ShaderNodeNewGeometry")
vt = N("ShaderNodeVectorTransform")
vt.vector_type, vt.convert_from, vt.convert_to = "NORMAL", "WORLD", "CAMERA"
sep = N("ShaderNodeSeparateXYZ")
comb = N("ShaderNodeCombineXYZ")
tc = N("ShaderNodeTexCoord")
tc.object = ns
noise = N("ShaderNodeTexNoise")
noise.noise_dimensions = "4D"
noise.inputs["Scale"].default_value = 1.9
noise.inputs["Detail"].default_value = 2.0
noise.inputs["Roughness"].default_value = 0.55
noise.inputs["Distortion"].default_value = 0.6
L = nt.links.new
ma = N("ShaderNodeVectorMath")
ma.operation = "MULTIPLY_ADD"                     # encode -1..1 as 0..1 (emission must stay positive)
ma.inputs[1].default_value = (0.5, 0.5, 0.5)
ma.inputs[2].default_value = (0.5, 0.5, 0.5)
L(geo.outputs["Normal"], vt.inputs["Vector"])
L(vt.outputs["Vector"], ma.inputs[0])
L(ma.outputs["Vector"], sep.inputs["Vector"])
L(sep.outputs["X"], comb.inputs["X"])
L(sep.outputs["Y"], comb.inputs["Y"])
L(tc.outputs["Object"], noise.inputs["Vector"])
L(noise.outputs["Fac"], comb.inputs["Z"])
L(comb.outputs["Vector"], emi.inputs["Color"])
L(emi.outputs["Emission"], out.inputs["Surface"])
w_input = noise.inputs["W"]
# second render per frame: ambient occlusion (dark creases between lobes -> the lobes read inside the mass)
ao = N("ShaderNodeAmbientOcclusion")
ao.samples = 16
ao.inputs["Distance"].default_value = 0.45
sc.cycles.samples = 16


# region noise: very large, smooth, in the same surface-stuck space -> which areas dissolve first
noise_r = N("ShaderNodeTexNoise")
noise_r.noise_dimensions = "3D"
noise_r.inputs["Scale"].default_value = 0.6
noise_r.inputs["Detail"].default_value = 0.5
noise_r.inputs["Distortion"].default_value = 0.3
L(tc.outputs["Object"], noise_r.inputs["Vector"])
comb2 = N("ShaderNodeCombineXYZ")
L(ao.outputs["AO"], comb2.inputs["X"])
L(noise_r.outputs["Fac"], comb2.inputs["Y"])


def emit(src):
    for lk in list(emi.inputs["Color"].links):
        nt.links.remove(lk)
    L(src, emi.inputs["Color"])

# ---------------------------------------------------------------- mass: metaballs (soft necks) or spheres (hard union)
MODE = os.environ.get("CFX_MODE", "meta")
if MODE == "meta":
    mb = bpy.data.metaballs.new("Smoke")
    mb.resolution = 0.06
    mb.render_resolution = 0.025
    mb.threshold = 0.6
    mbo = bpy.data.objects.new("Smoke", mb)
    sc.collection.objects.link(mbo)
    mbo.data.materials.append(mat)

# Shape = art lead sketch (Docs/VFX/_ArtDirection/art/smoke_shape_sketch_v1.png): ONE compact round mass, 5-6 BIG lobes
# around the outline (big at the top, smaller at the bottom), SHARP notches between lobes. Laid out in the picture plane
# (camera right / up) so the outline reads; lobes sit a little behind the body (body in front).
# Rejected 2026-11-03: many small bumps + soft metaball necks = lumpy worms; bumps far out = detached "mouse ears".
BODY_R = float(os.environ.get("CFX_BODY_R", 0.66))
STIFF = float(os.environ.get("CFX_STIFF", 10.0))
RSCALE = float(os.environ.get("CFX_RSCALE", 0.82))  # metaball radius multiplier (high stiffness + smaller radius = sharper notches)
R0 = float(os.environ.get("CFX_R0", 0.72))          # lobe size vs body (sketch: big lobes, shallow notches)
D0 = float(os.environ.get("CFX_D0", 0.5))           # lobe distance vs body
# STIFF (metaball only): 7 = notches; 10 = melts into one round ball; 2 = lobes detach
right = np.array([1.0, 0.0, 0.0])
upv = np.array([0.0, math.sin(pitch), math.cos(pitch)])
LOBE_ANG = [-150, -95, -38, 22, 82, 140]              # degrees from screen-up, clockwise (sketch layout)

balls = [dict(off=np.zeros(3), r=BODY_R, delay=0.0, ph=0.0, spin=0.0)]
for i, a_deg in enumerate(LOBE_ANG):
    a = math.radians(a_deg + rng.uniform(-10, 10))
    r = BODY_R * (R0 + 0.14 * math.cos(a)) * rng.uniform(0.92, 1.08)   # big at the top, smaller at the bottom
    d = BODY_R * D0 + r * 0.25
    off = (math.sin(a) * right * 1.08 + math.cos(a) * upv) * d + fwd * BODY_R * 0.3
    balls.append(dict(off=off, r=r, delay=rng.uniform(0.0, 0.05), ph=rng.uniform(0, 6.28), spin=-math.copysign(1, math.sin(a))))
class Sph:
    """Sphere object with the metaball element interface (co, radius)."""

    def __init__(self):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, radius=1.0)
        self.o = bpy.context.active_object
        bpy.ops.object.shade_smooth()
        self.o.data.materials.append(mat)

    def __setattr__(self, k, v):
        if k == "co":
            self.o.location = v
        elif k == "radius":
            self.o.scale = (v, v, v)
        else:
            object.__setattr__(self, k, v)


els = []
for b in balls:
    if MODE == "meta":
        e = mb.elements.new()
        e.type = "BALL"
        e.stiffness = STIFF
    else:
        e = Sph()
    els.append(e)
BOTTOM = min(b["off"][2] - b["r"] for b in balls)    # lowest point of the full-size mass (z), to sit it on the ground


def ease_out_back(x, s=1.4):
    x = min(max(x, 0.0), 1.0) - 1
    return x * x * ((s + 1) * x + s) + 1


def seg(a, b, t):
    return min(max((t - a) / (b - a), 0.0), 1.0)


def pose(t):
    # smoke never holds still (art lead 2026-11-03: a still mass reads as rock): keeps swelling, rising, rolling
    swell = 1 + 0.42 * (1 - math.exp(-1.6 * max(t - 0.12, 0)))
    rise = 0.75 * seg(0.12, DUR, t) ** 1.2
    roll = math.radians(28) * seg(0.1, DUR, t)                              # lobes roll up and around the body
    g0 = 0.35 + 0.65 * ease_out_back(seg(0.0, 0.2, t))
    cz = -BOTTOM * g0 * swell + rise                                        # round bottom touches the ground
    for b, e in zip(balls, els):
        g = 0.35 + 0.65 * ease_out_back(seg(b["delay"], b["delay"] + 0.2, t))
        wob = 1 + 0.07 * math.sin(t * 6.0 + b["ph"])                       # lobes breathe out of phase
        out_ = 1 + 0.16 * (1 - math.exp(-3 * max(t - 0.1, 0)))            # lobes roll outward, with drag
        o_ = b["off"]
        c, s_ = math.cos(roll * b["spin"]), math.sin(roll * b["spin"])
        o_ = np.array([o_[0] * c - o_[2] * s_ * 0.6, o_[1], o_[0] * s_ * 0.6 + o_[2] * c])   # turn in the screen plane
        p = o_ * out_ * swell * g
        e.co = (p[0], p[1], cz + p[2])
        e.radius = b["r"] * g * swell * wob * (RSCALE if MODE == "meta" else 1.0)
    s = swell * (0.6 + 0.4 * min(1, t / 0.2))
    ns.scale = (s, s, s * 1.15)
    # noise is FIXED on the surface (no flow, no W change): it drives the dissolve, and a noise that changes over
    # time made later frames refill holes that earlier frames had opened (art lead 2026-11-03)
    ns.location = (0, 0, cz)
    w_input.default_value = 0.0


# ---------------------------------------------------------------- realtime export (CFX_EXPORT=<file.json>)
# Art lead 2026-11-03: "put the shader straight into Unity, no baked sheet". Exports the full-size mass as a mesh in
# CAMERA space (Unity: x right, y up, z away from the camera; pivot = ground point) for a View-aligned mesh particle,
# with the noises baked per vertex (same nodes as the passes): uv0 = (ao, region), uv1 = (detail, 0).
EXPORT = os.environ.get("CFX_EXPORT")
if EXPORT:
    mb.resolution = float(os.environ.get("CFX_MESH_RES", 0.035))
    cz = -BOTTOM
    for b, e in zip(balls, els):
        e.co = (b["off"][0], b["off"][1], cz + b["off"][2])
        e.radius = b["r"] * RSCALE
    ns.location = (0, 0, cz)
    ns.scale = (1, 1, 1.15)
    w_input.default_value = 0.0
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(mbo.evaluated_get(dg))
    ob = bpy.data.objects.new("SmokeMesh", me)
    sc.collection.objects.link(ob)
    if not me.materials:
        me.materials.append(mat)
    mbo.hide_render = True
    mbo.hide_viewport = True
    attr = me.color_attributes.new("Bake", "FLOAT_COLOR", "POINT")
    me.color_attributes.active_color = attr
    comb3 = N("ShaderNodeCombineXYZ")
    L(ao.outputs["AO"], comb3.inputs["X"])
    L(noise_r.outputs["Fac"], comb3.inputs["Y"])
    L(noise.outputs["Fac"], comb3.inputs["Z"])
    emit(comb3.outputs["Vector"])
    for o_ in list(bpy.context.view_layer.objects):
        o_.select_set(False)
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    sc.render.bake.target = "VERTEX_COLORS"
    sc.cycles.samples = 64
    bpy.ops.object.bake(type="EMIT")
    col = np.array([d.color[:3] for d in attr.data], dtype=np.float64)
    P_ = np.array([v.co[:] for v in me.vertices], dtype=np.float64)
    Nn = np.array([v.normal[:] for v in me.vertices], dtype=np.float64)
    M_ = np.stack([right, upv, fwd])                     # rows: Unity x, y, z
    Pu, Nu = P_ @ M_.T, Nn @ M_.T
    me.calc_loop_triangles()
    tris = []
    for tri in me.loop_triangles:
        a_, b_, c_ = tri.vertices
        tris += [a_, c_, b_]                             # the basis change mirrors -> flip the winding
    region = (col[:, 1] - 0.5) * 2.8 + 0.5
    detail = (col[:, 2] - 0.5) * 2.6 + 0.5
    field = region * 0.5 + detail * 0.5
    front = -Nu[:, 2] > 0.15                             # faces the camera (Unity camera looks along +z)
    thr = [float(x) for x in np.percentile(field[front], [0.5, 25, 50, 75, 99.8])]
    r4 = lambda a: [round(float(x), 4) for x in np.asarray(a).ravel()]
    out = dict(name="SmokeMesh", verts=r4(Pu), normals=r4(Nu), uv0=r4(np.stack([col[:, 0], region], 1)),
               uv1=r4(np.stack([detail, np.zeros(len(detail))], 1)), tris=tris, thr=thr,
               bounds=dict(min=r4(Pu.min(0)), max=r4(Pu.max(0))), width_m=WIDTH_M,
               note="camera-space mesh (x right, y up, z away), pivot = ground point; uv0=(ao, region), uv1=(detail, 0)")
    json.dump(out, open(EXPORT, "w"))
    print("exported", EXPORT, "verts", len(Pu), "tris", len(tris) // 3, "thr", [round(x, 3) for x in thr],
          "ao", round(col[:, 0].min(), 3), round(col[:, 0].max(), 3), "bounds", r4(Pu.min(0)), r4(Pu.max(0)))
    sys.exit(0)

frames = []
balls_px = []                                                                # per frame: (x, y, r) of every ball in image px
tmp = os.path.join(OUT, "_f.exr")
for f in range(NF):
    t = f / FPS
    pose(t)
    sc.frame_set(f)
    sc.render.filepath = tmp
    layers = []
    for src in (comb.outputs["Vector"], comb2.outputs["Vector"]):
        emit(src)
        bpy.ops.render.render(write_still=True)
        img = bpy.data.images.load(tmp, check_existing=False)
        W, H = img.size
        px = np.array(img.pixels[:], dtype=np.float32).reshape(H, W, 4)[::-1]   # top row first
        bpy.data.images.remove(img)
        layers.append(px)
    a = layers[0][..., 3:4]
    rgb = layers[0][..., :3] / np.maximum(a, 1e-4)                           # un-premultiply
    occ = layers[1][..., :2] / np.maximum(a, 1e-4)                           # ao, region noise
    frames.append(np.dstack([rgb, a, occ]).astype(np.float16))
    bp = []
    for b, e in zip(balls, els):
        co = Vector(tuple(e.o.location)) if MODE != "meta" else Vector(tuple(e.co))
        rad = (e.o.scale[0] if MODE != "meta" else e.radius) * (0.92 if MODE == "meta" else 1.0)
        c = world_to_camera_view(sc, cam, co)
        c2 = world_to_camera_view(sc, cam, co + Vector(tuple(right)) * rad)
        bp.append((c.x * W, (1 - c.y) * H, abs(c2.x - c.x) * W))
    balls_px.append(bp)
    print(f"frame {f}/{NF - 1}", flush=True)

os.remove(tmp)
# B[F, N, 3]: ball centre x, y and radius in pass pixels (ball 0 = body). Lets the effect know which lobe owns a pixel.
np.savez_compressed(os.path.join(OUT, "passes.npz"), P=np.stack(frames), B=np.array(balls_px, dtype=np.float32),
                    lobe_ang=np.array([0.0] + LOBE_ANG, dtype=np.float32))
json.dump(dict(fps=FPS, frames=NF, duration=DUR, cell=CELL, origin=ORIGIN, width_m=WIDTH_M, res=RS,
               channels=["nx", "ny", "noise", "alpha", "ao", "region"], mode=MODE), open(os.path.join(OUT, "passes.json"), "w"), indent=1)
print("done", OUT)
