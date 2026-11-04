import bpy, bmesh, math, numpy as np
from mathutils import Vector, Matrix

bpy.ops.wm.read_factory_settings(use_empty=True)
OUT = r"D:\Game_prj\VFX_LIb\Docs\Models"

# ---- path: rising helix that tapers, ends in a curl ----
pts = []  # (Vector, radius)
N = 28          # helix segments (tuned to ~380 tris total)
H = 4.0
turns = 2.0
for i in range(N + 1):
    t = i / N
    R = 0.55 * (1 - 0.55 * t)
    a = 2 * math.pi * turns * t
    pts.append((Vector((R * math.cos(a), R * math.sin(a), H * t)),
                0.16 * (1 - t) + 0.035))
end, _ = pts[-1]
tan = (pts[-1][0] - pts[-2][0]).normalized()
out = Vector((end.x, end.y, 0)).normalized()
M = 0           # no tip curl
rc = 0.35
center = end + out * rc
for j in range(1, M + 1):
    u = j / M
    ang = 2 * math.pi * 1.3 * u
    r = rc * (1 - 0.8 * u)
    p = center + (-out * math.cos(ang) + tan * math.sin(ang)) * r
    pts.append((p, 0.035 * (1 - 0.7 * u) + 0.01))

# ---- curve with bevel ----
cu = bpy.data.curves.new("VineCurve", 'CURVE')
cu.dimensions = '3D'
cu.resolution_u = 1
cu.bevel_depth = 1.0
cu.bevel_resolution = 1
cu.use_fill_caps = True
sp = cu.splines.new('POLY')
sp.points.add(len(pts) - 1)
for p, (v, r) in zip(sp.points, pts):
    p.co = (v.x, v.y, v.z, 1)
    p.radius = r
obj = bpy.data.objects.new("Vine", cu)
bpy.context.scene.collection.objects.link(obj)
bpy.context.view_layer.objects.active = obj
obj.select_set(True)
bpy.ops.object.convert(target='MESH')
vine = bpy.context.active_object
bpy.ops.object.shade_smooth()
n_body = len(vine.data.polygons)

# ---- thorns (no material yet) ----
thorns = []
main = pts[:N + 1]
for k, i in enumerate(np.linspace(2, N - 1, 9).round().astype(int)):
    v, r = main[i]
    tangent = (main[i + 1][0] - main[i - 1][0]).normalized()
    radial = Vector((v.x, v.y, 0)).normalized()
    d = (radial if k % 2 == 0 else -radial) * 0.8 + tangent * 0.5
    d.normalize()
    length = (0.42 * (1 - 0.55 * i / N) + 0.08) * 0.5
    base = r * 1.3 * 0.5
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=base, radius2=0, end_fill_type='NOTHING',
                                    depth=length, location=(0, 0, 0))
    c = bpy.context.active_object
    c.data.transform(Matrix.Translation((0, 0, length / 2)))
    c.rotation_mode = 'QUATERNION'
    c.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d)
    c.location = v + d * (r * 0.5)
    bpy.ops.object.shade_smooth()
    thorns.append(c)

bpy.ops.object.select_all(action='DESELECT')
for o in [vine] + thorns:
    o.select_set(True)
bpy.context.view_layer.objects.active = vine
bpy.ops.object.join()
vine.name = "ThornVine"
vine.data.name = "ThornVine"
me = vine.data

# ---- palette texture: left half green (body), right half white (thorns) ----
TEX = OUT + r"\VinePalette.png"
im = bpy.data.images.new("VinePalette", 256, 128, alpha=False)
px = np.ones((128, 256, 4))
px[:, :128, :3] = (0.35, 0.75, 0.12)
px[:, 128:, :3] = (0.88, 0.92, 0.90)
im.pixels = px.flatten().tolist()
im.filepath_raw = TEX
im.file_format = 'PNG'
im.save()

# ---- single material / single submesh ----
m = bpy.data.materials.new("Vine_Mat")
m.use_nodes = True
nt = m.node_tree
tx = nt.nodes.new("ShaderNodeTexImage")
tx.image = im
tx.interpolation = 'Closest'
bsdf = nt.nodes["Principled BSDF"]
bsdf.inputs["Roughness"].default_value = 0.5
nt.links.new(tx.outputs["Color"], bsdf.inputs["Base Color"])
me.materials.clear()
me.materials.append(m)

# ---- UV: body keeps its tube unwrap, thorns get their own smart-project unwrap ----
bpy.ops.object.mode_set(mode='EDIT')
bm = bmesh.from_edit_mesh(me)
bm.faces.ensure_lookup_table()
bpy.ops.mesh.select_all(action='DESELECT')
for f in bm.faces:
    f.select = f.index >= n_body
bmesh.update_edit_mesh(me)
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.02)
bpy.ops.object.mode_set(mode='OBJECT')

uv = me.uv_layers.active.data
for poly in me.polygons:
    body = poly.index < n_body
    for li in poly.loop_indices:
        u, v = uv[li].uv
        u = min(max(u, 0.0), 1.0)
        v = min(max(v, 0.0), 1.0)
        # keep islands well inside their half so nothing bleeds into the other colour
        uv[li].uv = ((u * 0.9 + 0.05) * 0.5 + (0.0 if body else 0.5), v * 0.9 + 0.05)

bpy.ops.wm.save_as_mainfile(filepath=OUT + r"\ThornVine.blend")
bpy.ops.object.select_all(action='DESELECT')
vine.select_set(True)
bpy.ops.export_scene.fbx(filepath=OUT + r"\ThornVine.fbx", use_selection=True,
                         apply_scale_options='FBX_SCALE_ALL',
                         path_mode='COPY', embed_textures=True)

# ---- preview render ----
sc = bpy.context.scene
sc.render.engine = 'BLENDER_WORKBENCH'
sc.display.shading.light = 'STUDIO'
sc.display.shading.color_type = 'TEXTURE'
sc.render.resolution_x, sc.render.resolution_y = 600, 800
cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam"))
sc.collection.objects.link(cam)
cam.location = (5.2, -5.2, 3.0)
cam.rotation_euler = (Vector((0, 0, 2.2)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
sc.camera = cam
sc.world = bpy.data.worlds.new("W")
sc.world.color = (0.2, 0.2, 0.2)
sc.render.filepath = OUT + r"\preview.png"
bpy.ops.render.render(write_still=True)

tri = lambda ps: sum(len(p.vertices) - 2 for p in ps)
print("MATERIALS:", len(me.materials), "TRIS body/thorn/total:", tri(me.polygons[:n_body]),
      tri(me.polygons[n_body:]), tri(me.polygons))
