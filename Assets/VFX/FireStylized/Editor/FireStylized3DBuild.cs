#if UNITY_EDITOR
using System.IO;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using VfxKit;
using static VfxKit.VfxBuildKit;

namespace VfxEffects
{
    // Art-direction prototype: 3D-looking stylized fire (shader on a sphere mesh) + baked 4x4 loop sheet.
    // Draft notes: Docs/VFX/_ArtDirection/fire_WIP.md (look-dev iterations via Temp/FireStylized3D.set)
    public static class FireStylized3DBuild
    {
        const string Effect = "FireStylized";
        const string Root = "Assets/VFX/" + Effect;
        const string MatPath = Root + "/Materials/M_" + Effect + "3D_Flame_Alpha.mat";
        const float LoopSeconds = 2f;
        const int Cell = 256, Grid = 4;

        [MenuItem("VFX/" + Effect + "/3D - Build")]
        public static void Build()
        {
            EnsureFolders(Root, "Materials", "Textures", "Prefabs");
            var noise = ImportTexture(Root + "/Textures/T_Noise_Fire.png", 256, clamp: false);
            // noise is data, not colour: read raw values in Linear projects
            var ti = (TextureImporter)AssetImporter.GetAtPath(Root + "/Textures/T_Noise_Fire.png");
            if (ti.sRGBTexture) { ti.sRGBTexture = false; ti.SaveAndReimport(); }
            var mat = Material(MatPath, VfxBlend.Alpha, null, "VFX/Fire Stylized 3D");
            mat.SetTexture("_NoiseTex", noise);
            EditorUtility.SetDirty(mat);

            var root = new GameObject("VFX_" + Effect + "3D");
            var body = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            Object.DestroyImmediate(body.GetComponent<Collider>());
            body.name = "Flame_Body";
            body.transform.SetParent(root.transform, false);
            body.transform.localPosition = new Vector3(0, 0.5f, 0);
            var r = body.GetComponent<MeshRenderer>();
            r.sharedMaterial = mat;
            r.shadowCastingMode = ShadowCastingMode.Off;
            r.receiveShadows = false;
            SavePrefab(root, Root + "/Prefabs/VFX_" + Effect + "3D.prefab");
            AssetDatabase.SaveAssets();
            Bake();
        }

        [MenuItem("VFX/" + Effect + "/3D - Bake Sheet From Material")]
        public static void Bake()
        {
            var mat = AssetDatabase.LoadAssetAtPath<Material>(MatPath);
            if (mat == null) { Debug.LogError("[VfxKit] Run VFX/" + Effect + "/3D - Build first."); return; }
            AssetDatabase.SaveAssets();
            string asset = Root + "/Textures/T_" + Effect + "3D_Loop_4x2.png";
            var sphere = Resources.GetBuiltinResource<Mesh>("New-Sphere.fbx");
            System.Action<Material, int, int> loop = (m, i, n) => m.SetFloat("_TimeOffset", LoopSeconds * i / n);
            ShaderSheetBaker.Bake(mat, sphere, loop, asset, "Docs/VFX/" + Effect + "/Loop3D_sheet.png", 12f, 4, 2);
            // view checks for top-down games (docs only)
            ShaderSheetBaker.Bake(mat, sphere, loop, null, "Docs/VFX/" + Effect + "/Loop3D_view60.png", 60f, 4, 2);
            ShaderSheetBaker.Bake(mat, sphere, loop, null, "Docs/VFX/" + Effect + "/Loop3D_view90.png", 89f, 4, 2);
            Debug.Log("[VfxKit] " + Effect + " 3D sheet baked.");
        }

        /// <summary>Renders the mesh with the material (hidden, isolated layer, works in Edit and Play mode), 16 frames over one loop.</summary>
        static void BakeMesh(Material source, Mesh mesh, string assetPng, string docsPng, float pitch)
        {
            const int layer = 31;
            var origin = new Vector3(0, -10000, 0);
            var bake = new Material(source);
            bake.SetFloat("_SrcBlend", (float)BlendMode.One);
            bake.SetFloat("_DstBlend", (float)BlendMode.Zero);
            bake.SetFloat("_TimeScale", 0f);

            var go = new GameObject("BakeMesh") { hideFlags = HideFlags.HideAndDontSave, layer = layer };
            go.transform.position = origin;
            go.AddComponent<MeshFilter>().sharedMesh = mesh;
            go.AddComponent<MeshRenderer>().sharedMaterial = bake;

            // frame the stretched flame: object y from HeightRange.x to HeightRange.y + Stretch * range
            var hr = source.GetVector("_HeightRange");
            float top = hr.y + (source.GetFloat("_Stretch") + source.GetFloat("_TongueLength")) * (hr.y - hr.x);
            float half = (top - hr.x) * 0.5f * 1.12f;
            var center = origin + new Vector3(0, (hr.x + top) * 0.5f, 0);

            var cam = new GameObject("BakeCamera") { hideFlags = HideFlags.HideAndDontSave }.AddComponent<Camera>();
            cam.enabled = false;
            cam.cullingMask = 1 << layer;
            cam.orthographic = true;
            cam.orthographicSize = half;
            cam.transform.position = center + Quaternion.Euler(pitch, 0, 0) * new Vector3(0, 0, -5);
            cam.transform.LookAt(center);
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0, 0, 0, 0);
            cam.allowHDR = false;
            cam.allowMSAA = false;

            var rt = new RenderTexture(Cell, Cell, 24, RenderTextureFormat.ARGB32, RenderTextureReadWrite.sRGB);
            var frame = new Texture2D(Cell, Cell, TextureFormat.RGBA32, false);
            var sheet = new Texture2D(Cell * Grid, Cell * Grid, TextureFormat.RGBA32, false);
            cam.targetTexture = rt;
            try
            {
                for (int i = 0; i < Grid * Grid; i++)
                {
                    bake.SetFloat("_TimeOffset", LoopSeconds * i / (Grid * Grid));
                    cam.Render();
                    RenderTexture.active = rt;
                    frame.ReadPixels(new Rect(0, 0, Cell, Cell), 0, 0);
                    frame.Apply();
                    int col = i % Grid, row = Grid - 1 - i / Grid;
                    sheet.SetPixels(col * Cell, row * Cell, Cell, Cell, frame.GetPixels());
                }
                sheet.Apply();
                var png = sheet.EncodeToPNG();
                Directory.CreateDirectory(Path.GetDirectoryName(docsPng));
                File.WriteAllBytes(docsPng, png);
                if (assetPng != null) File.WriteAllBytes(assetPng, png);
            }
            finally
            {
                RenderTexture.active = null;
                cam.targetTexture = null;
                rt.Release();
                Object.DestroyImmediate(rt);
                Object.DestroyImmediate(frame);
                Object.DestroyImmediate(sheet);
                Object.DestroyImmediate(bake);
                Object.DestroyImmediate(go);
                Object.DestroyImmediate(cam.gameObject);
            }
            if (assetPng == null) return;
            AssetDatabase.ImportAsset(assetPng);
            ImportTexture(assetPng, 1024);
        }

        // One-shot triggers after a recompile: Temp/FireStylized3D.build -> Build, Temp/FireStylized3D.set -> set props + Bake.
        [InitializeOnLoadMethod]
        static void Triggers()
        {
            const string build = "Temp/FireStylized3D.build", set = "Temp/FireStylized3D.set";
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
// iter 1792569880
// iter 1792570012
// iter 1792570047
// iter 1792571888
