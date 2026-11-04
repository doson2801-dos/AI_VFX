#if UNITY_EDITOR
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using VfxKit;
using static VfxKit.VfxBuildKit;

namespace VfxEffects
{
    // Art-direction prototype: stylized cel smoke burst = a CLUSTER of spheres (art lead ref: asymmetric, random,
    // spreading out; L/M/S sizes), shader-driven, baked to a one-shot 4x4 = 16-frame sheet.
    // Same pipeline as FireStylized 3D (look-dev in the shader -> bake sheet for production). Notes: Docs/VFX/_ArtDirection/
    public static class SmokeStylized3DBuild
    {
        const string Effect = "SmokeStylized";
        const string Root = "Assets/VFX/" + Effect;
        const string MatPath = Root + "/Materials/M_" + Effect + "3D_Puff_Alpha.mat";
        const string MeshPath = Root + "/Meshes/SM_" + Effect + "_Cluster.asset";
        const int Seed = 7;
        const bool UseSketchLayout = true;   // art lead sketch (2026-10-22); false = random big-inside/small-outside cluster

        [MenuItem("VFX/" + Effect + "/3D - Build")]
        public static void Build()
        {
            EnsureFolders(Root, "Materials", "Textures", "Prefabs", "Meshes");
            const string noisePath = Root + "/Textures/T_Noise_Smoke.png";
            var noise = ImportTexture(noisePath, 256, clamp: false);
            var ti = (TextureImporter)AssetImporter.GetAtPath(noisePath);
            if (ti.sRGBTexture) { ti.sRGBTexture = false; ti.SaveAndReimport(); }   // data, not colour

            var mat = Material(MatPath, VfxBlend.Alpha, null, "VFX/Smoke Stylized 3D");
            mat.SetTexture("_NoiseTex", noise);
            if (mat.GetTexture("_DissolveTex") == null) mat.SetTexture("_DissolveTex", DissolveNoise("Cells"));
            // chosen dissolve (art lead, 2026-10-21): stylized "CoreOut" - by form, from the cluster core outward,
            // hard edge + dark edge line, Cells noise. (Crescent from the video ref was tried; art lead went back to this.)
            mat.SetTexture("_DissolveTex", DissolveNoise("Cells"));
            mat.SetFloat("_EraseMode", 0f);
            mat.DisableKeyword("_ERASEMODE_ON");
            mat.SetFloat("_DissolveFacing", 0.6f);
            mat.SetFloat("_RimPow", 0.8f);
            mat.SetFloat("_InsideOut", 1f);
            mat.SetFloat("_DissolveSoft", 0f);
            mat.SetFloat("_EdgeWidth", 0.03f);
            mat.SetColor("_EdgeColor", new Color(0.25f, 0.23f, 0.3f, 1f));
            mat.SetFloat("_ToneNoise", 0.35f);
            // dissolve order (art lead): small puffs first, big ones last
            mat.SetFloat("_SizeStagger", 0.4f);
            mat.SetVector("_CutRange", new Vector4(0.38f, 0.7f, 0, 0));    // visible lobes: mask ~0.4..0.65 (CoreOut)
            mat.SetFloat("_GrowLate", 0.08f);
            mat.SetFloat("_DissolveStart", 0.3f);   // peak around frame 6-7, then even loss to the last frame
            // spread out, but keep the puffs overlapping (art lead: far-apart spheres look disjointed when dissolving)
            mat.SetFloat("_SpreadEnd", 1.2f);
            mat.SetFloat("_DissolveSmallFirst", 0f);
            mat.SetFloat("_CoreFirst", 0f);
            EditorUtility.SetDirty(mat);

            var mesh = BuildClusterMesh(Seed);

            var root = new GameObject("VFX_" + Effect + "3D");
            var body = new GameObject("Puff_Cluster");
            body.transform.SetParent(root.transform, false);
            body.transform.localPosition = new Vector3(0, 0.6f, 0);
            body.AddComponent<MeshFilter>().sharedMesh = mesh;
            var r = body.AddComponent<MeshRenderer>();
            r.sharedMaterial = mat;
            r.shadowCastingMode = ShadowCastingMode.Off;
            r.receiveShadows = false;
            SavePrefab(root, Root + "/Prefabs/VFX_" + Effect + "3D.prefab");
            AssetDatabase.SaveAssets();
            Bake();
        }

        /// <summary>Batchmode entry: -executeMethod VfxEffects.SmokeStylized3DBuild.BuildBatch (needs graphics, no -nographics).</summary>
        public static void BuildBatch() => RunBatch(Build);

        [MenuItem("VFX/" + Effect + "/3D - Bake Sheet From Material")]
        public static void Bake()
        {
            var mat = AssetDatabase.LoadAssetAtPath<Material>(MatPath);
            var mesh = AssetDatabase.LoadAssetAtPath<Mesh>(MeshPath);
            if (mat == null || mesh == null) { Debug.LogError("[VfxKit] Run VFX/" + Effect + "/3D - Build first."); return; }
            AssetDatabase.SaveAssets();
            // one-shot: frame 0 = birth, last frame = almost gone
            System.Action<Material, int, int> life = (m, i, n) => m.SetFloat("_Life", Mathf.Lerp(0.05f, 1f, i / (float)(n - 1)));
            ShaderSheetBaker.Bake(mat, mesh, life, Root + "/Textures/T_" + Effect + "3D_Puff_4x4.png",
                                  "Docs/VFX/" + Effect + "/Puff3D_sheet.png", 12f, 4, 4);
            ShaderSheetBaker.Bake(mat, mesh, life, null, "Docs/VFX/" + Effect + "/Puff3D_view60.png", 60f, 4, 4);
            Debug.Log("[VfxKit] " + Effect + " 3D sheet baked.");
        }

        static Texture2D DissolveNoise(string name)
        {
            string path = Root + "/Textures/T_Noise_Dissolve_" + name + ".png";
            var tex = ImportTexture(path, 256, clamp: false);
            var ti = (TextureImporter)AssetImporter.GetAtPath(path);
            if (ti.sRGBTexture) { ti.sRGBTexture = false; ti.SaveAndReimport(); }
            return tex;
        }

        // stylized dissolve looks to compare: (name, noise, rim weight, rim power, edge width, edge colour)
        static readonly (string name, string noise, float facing, float rimPow, float edge, Color edgeCol, float insideOut)[] Looks =
        {
            ("CoreOutCells", "Cells",   0.6f, 0.8f, 0.05f, new Color(0.25f, 0.23f, 0.3f, 1f), 1f),   // art lead: by form, inside -> out (cluster core first)
            ("CoreOutBlobs", "Chunks",  0.5f, 1.2f, 0.08f, new Color(0.45f, 0.43f, 0.5f, 1f), 1f),
            ("RimBite", "Cells",  0.6f, 0.8f, 0.05f, new Color(0.25f, 0.23f, 0.3f, 1f), 0f),   // shrinks from each puff's rim in round bites, dark line
            ("HoleLine", "Cells", 0.2f, 0.8f, 0.06f, new Color(1f, 1f, 1f, 1f), 0f),           // clean round holes with a bright line around them
            ("Blobs", "Chunks",   0.45f, 1.2f, 0.08f, new Color(0.45f, 0.43f, 0.5f, 1f), 0f),  // breaks into rounded blobs with an inner-shadow band
        };

        /// <summary>Same material, several stylized dissolve looks -> Docs sheets to compare (the material is not changed).</summary>
        [MenuItem("VFX/" + Effect + "/3D - Bake Dissolve Variants")]
        public static void BakeDissolveVariants()
        {
            var mat = AssetDatabase.LoadAssetAtPath<Material>(MatPath);
            var mesh = AssetDatabase.LoadAssetAtPath<Mesh>(MeshPath);
            if (mat == null || mesh == null) { Debug.LogError("[VfxKit] Run VFX/" + Effect + "/3D - Build first."); return; }
            System.Action<Material, int, int> life = (m, i, n) => m.SetFloat("_Life", Mathf.Lerp(0.05f, 1f, i / (float)(n - 1)));
            foreach (var look in Looks)
                if (look.insideOut > 0)
            {
                var variant = new Material(mat);
                variant.SetTexture("_DissolveTex", DissolveNoise(look.noise));
                variant.SetFloat("_DissolveFacing", look.facing);
                variant.SetFloat("_RimPow", look.rimPow);
                variant.SetFloat("_EdgeWidth", look.edge);
                variant.SetColor("_EdgeColor", look.edgeCol);
                variant.SetFloat("_InsideOut", look.insideOut);
                variant.SetFloat("_DissolveSoft", 0f);
                try { ShaderSheetBaker.Bake(variant, mesh, life, null, "Docs/VFX/" + Effect + "/Puff3D_style" + look.name + ".png", 12f, 4, 4); }
                finally { Object.DestroyImmediate(variant); }
            }
            // crescent erase (art lead video ref): no noise, growing circles sweep across the cluster
            var cres = new Material(mat);
            cres.SetFloat("_EraseMode", 1f);
            cres.EnableKeyword("_ERASEMODE_ON");
            cres.SetFloat("_EdgeWidth", 0.04f);
            cres.SetColor("_EdgeColor", new Color(0.25f, 0.23f, 0.3f, 1f));
            cres.SetFloat("_DissolveStart", 0.35f);
            try { ShaderSheetBaker.Bake(cres, mesh, life, null, "Docs/VFX/" + Effect + "/Puff3D_styleCrescent.png", 12f, 4, 4); }
            finally { Object.DestroyImmediate(cres); }
            Debug.Log("[VfxKit] " + Effect + " dissolve variants baked.");
        }

        // ------------------------------------------------------------------ cluster

        struct Puff { public Vector3 c; public float r; public int size; public float delay; }

        /// <summary>
        /// Random asymmetric cluster: one large puff off-centre, puffs attached to existing ones (overlapping ~30%),
        /// sizes Large / Medium / Small with no two same-size puffs touching. Vertex data per puff:
        /// POSITION = unit-sphere point * 0.5 (local), UV0 = (centre.xyz, radius), UV1 = (seed, delay, 0, 0).
        /// </summary>
        static Mesh BuildClusterMesh(int seed)
        {
            var rnd = new System.Random(seed);
            System.Func<float, float, float> R = (a, b) => a + (float)rnd.NextDouble() * (b - a);
            List<Puff> puffs;
            if (UseSketchLayout)
            {
                // Layout from the art lead's sketch (Docs/VFX/_ArtDirection/art/smoke_shape_sketch_v1.png): one big body,
                // ~7 big round lobes around it (top, right, bottom-right, bottom-middle, bottom-left, upper-left, small
                // left bump), crisp notches between lobes, round overall. Pixel circles fitted on the sketch -> units.
                const float px0 = 436f, py0 = 390f, k = 1.1f / 340f;
                var fit = new (float x, float y, float r, float z)[]
                {
                    (440, 390, 200, -0.15f),   // body (first: the puff everything blooms from)
                    (505, 232, 150, 0.08f),    // top
                    (612, 330, 162, 0.05f),    // right
                    (300, 465, 160, 0.06f),    // bottom-left
                    (455, 560, 140, 0.12f),    // bottom-middle
                    (662, 555, 110, 0.1f),     // bottom-right
                    (240, 300, 110, 0.1f),     // upper-left
                    (150, 312, 52, 0.05f),     // small left bump
                };
                puffs = new List<Puff>();
                foreach (var f in fit)
                {
                    float r = f.r * k * R(0.96f, 1.04f);
                    var c = new Vector3((f.x - px0) * k + R(-0.02f, 0.02f), -(f.y - py0) * k + R(-0.02f, 0.02f), f.z);
                    puffs.Add(new Puff { c = c, r = r, size = r > 0.5f ? 0 : r > 0.3f ? 1 : 2 });
                }
            }
            else
            {
                // Layout (art lead, 2026-10-21): big puffs inside, medium around them, small ones on the outside.
                // Still attached and asymmetric, spread in the screen plane (no forced round mass - that was rejected).
                float[][] sizes = { new[] { 0.58f, 0.7f }, new[] { 0.36f, 0.46f }, new[] { 0.2f, 0.28f } };   // L, M, S radii
                int[] plan = { 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2 };   // big first, then medium, then small
                float[] want = { 0.18f, 0.55f, 0.88f };                       // preferred distance from the cluster centre per class

                puffs = new List<Puff> { new Puff { c = new Vector3(-0.15f, -0.05f, 0.05f), r = R(sizes[0][0], sizes[0][1]), size = 0 } };
                for (int i = 1; i < plan.Length; i++)
                {
                    int size = plan[i];
                    float r = R(sizes[size][0], sizes[size][1]);
                    var centroid = Vector3.zero;
                    foreach (var p in puffs) centroid += p.c;
                    centroid /= puffs.Count;
                    Puff best = default; float bestScore = float.MaxValue;
                    for (int tries = 0; tries < 300; tries++)
                    {
                        var host = puffs[rnd.Next(puffs.Count)];
                        if (host.size > size) continue;                          // grow outward: attach to a same-or-bigger puff
                        var dir = new Vector3(R(-1, 1), R(-1, 1), R(-0.3f, 0.3f)).normalized;      // any direction in the screen plane
                        var c = host.c + dir * (host.r + r) * R(0.46f, 0.58f);   // close together (art lead): heavy overlap, no gaps when dissolving
                        float score = Mathf.Abs(Vector3.Distance(c, centroid) - want[size]) * 1.5f;
                        // round overall shape (art lead): keep width ~ height of the whole cluster
                        float x0 = c.x - r, x1 = c.x + r, y0 = c.y - r, y1 = c.y + r;
                        foreach (var p in puffs) { x0 = Mathf.Min(x0, p.c.x - p.r); x1 = Mathf.Max(x1, p.c.x + p.r); y0 = Mathf.Min(y0, p.c.y - p.r); y1 = Mathf.Max(y1, p.c.y + p.r); }
                        score += 2.5f * Mathf.Abs((x1 - x0) - (y1 - y0)) / ((x1 - x0) + (y1 - y0));
                        // ...and prefer the side around the centre that is still empty
                        float ang = Mathf.Atan2(c.y - centroid.y, c.x - centroid.x);
                        foreach (var p in puffs)
                        {
                            if (p.size == 0) continue;
                            float pa = Mathf.Atan2(p.c.y - centroid.y, p.c.x - centroid.x);
                            float da = Mathf.Abs(Mathf.DeltaAngle(ang * Mathf.Rad2Deg, pa * Mathf.Rad2Deg));
                            if (da < 40f) score += 0.35f * (1f - da / 40f);
                        }
                        bool sameSizeTouch = false;
                        foreach (var p in puffs)
                        {
                            float d = Vector3.Distance(c, p.c), touch = p.r + r;
                            if (d < touch * 0.5f) score += 10;                     // too much overlap
                            if (d + Mathf.Min(p.r, r) < Mathf.Max(p.r, r) * 1.05f) score += 100;   // swallowed inside another puff
                            if (p.size == size && size != 0 && d < touch * 1.02f) sameSizeTouch = true;
                        }
                        if (sameSizeTouch) score += 3;
                        score += R(0f, 0.5f);                                       // randomness / asymmetry
                        if (score < bestScore) { bestScore = score; best = new Puff { c = c, r = r, size = size }; }
                    }
                    puffs.Add(best);
                }

            }

            // centre the cluster (keeps the asymmetry), then delays: puffs bloom from the first (big) one outward
            var mean = Vector3.zero;
            foreach (var p in puffs) mean += p.c;
            mean /= puffs.Count;
            float maxD = 0.001f;
            foreach (var p in puffs) maxD = Mathf.Max(maxD, Vector3.Distance(p.c, puffs[0].c));
            for (int i = 0; i < puffs.Count; i++)
            {
                var p = puffs[i];
                p.delay = 0.22f * Vector3.Distance(p.c, puffs[0].c) / maxD + R(0f, 0.04f);
                p.c -= mean;
                puffs[i] = p;
            }

            var sphere = Resources.GetBuiltinResource<Mesh>("New-Sphere.fbx");
            var sv = sphere.vertices; var sn = sphere.normals; var st = sphere.triangles;
            var verts = new List<Vector3>(); var norms = new List<Vector3>();
            var uv0 = new List<Vector4>(); var uv1 = new List<Vector4>(); var tris = new List<int>();
            // big puffs first in the index buffer (drawn first) - with ZWrite on, small front puffs still win by depth
            puffs.Sort((a, b) => b.r.CompareTo(a.r));
            for (int i = 0; i < puffs.Count; i++)
            {
                int baseIndex = verts.Count;
                var p = puffs[i];
                float s = (float)rnd.NextDouble();
                for (int v = 0; v < sv.Length; v++)
                {
                    verts.Add(sv[v]);
                    norms.Add(sn[v]);
                    uv0.Add(new Vector4(p.c.x, p.c.y, p.c.z, p.r));
                    uv1.Add(new Vector4(s, p.delay, 0, 0));
                }
                foreach (var t in st) tris.Add(baseIndex + t);
            }
            var mesh = new Mesh { name = "SM_" + Effect + "_Cluster" };
            mesh.indexFormat = IndexFormat.UInt32;
            mesh.SetVertices(verts);
            mesh.SetNormals(norms);
            mesh.SetUVs(0, uv0);
            mesh.SetUVs(1, uv1);
            mesh.SetTriangles(tris, 0);
            mesh.bounds = new Bounds(Vector3.zero, Vector3.one * 6f);   // shader moves vertices a lot

            // recreate (CopySerialized into an existing mesh asset does not refresh its GPU data); the prefab is rebuilt right after
            AssetDatabase.DeleteAsset(MeshPath);
            AssetDatabase.CreateAsset(mesh, MeshPath);
            return mesh;
        }

        // One-shot triggers after a recompile: Temp/SmokeStylized3D.build -> Build, Temp/SmokeStylized3D.set -> set props + Bake.
        [InitializeOnLoadMethod]
        static void Triggers()
        {
            const string build = "Temp/SmokeStylized3D.build", set = "Temp/SmokeStylized3D.set", variants = "Temp/SmokeStylized3D.variants";
            if (File.Exists(variants))
            {
                File.Delete(variants);
                EditorApplication.delayCall += () => { try { BakeDissolveVariants(); } catch (System.Exception e) { Debug.LogException(e); } };
            }
            if (File.Exists(build))
            {
                File.Delete(build);
                EditorApplication.delayCall += () => { try { Build(); } catch (System.Exception e) { Debug.LogException(e); } };
            }
            if (File.Exists(set))
            {
                var lines = File.ReadAllLines(set);
                File.Delete(set);
                EditorApplication.delayCall += () =>
                {
                    try
                    {
                        var mat = AssetDatabase.LoadAssetAtPath<Material>(MatPath);
                        foreach (var line in lines)
                        {
                            var kv = line.Split('=');
                            if (kv.Length != 2) continue;
                            var v = System.Array.ConvertAll(kv[1].Split(','), x => float.Parse(x.Trim(), System.Globalization.CultureInfo.InvariantCulture));
                            if (v.Length == 4) mat.SetVector(kv[0].Trim(), new Vector4(v[0], v[1], v[2], v[3]));
                            else mat.SetFloat(kv[0].Trim(), v[0]);
                        }
                        EditorUtility.SetDirty(mat);
                        Bake();
                    }
                    catch (System.Exception e) { Debug.LogException(e); }
                };
            }
        }
    }
}
#endif
// iter 1792573816
// iter 1792573961
// iter 1792573982
