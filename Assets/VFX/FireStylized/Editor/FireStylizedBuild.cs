#if UNITY_EDITOR
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using VfxKit;
using static VfxKit.VfxBuildKit;

namespace VfxEffects
{
    // Art-direction prototype (fire mode 2 via shader; palette in sRGB, converted in-shader for Linear projects). Draft: Docs/VFX/_ArtDirection/fire_WIP.md
    // Builds: material + prefab (live shader on a quad) and bakes a seamless 4x4 = 16-frame loop sheet (RGBA)
    // so the same look can also run as a flipbook on particles.
    public static class FireStylizedBuild
    {
        const string Effect = "FireStylized";
        const string Root = "Assets/VFX/" + Effect;
        const float LoopSeconds = 2f;   // shader defaults repeat every 2 s
        const int Cell = 256, Grid = 4;

        [MenuItem("VFX/" + Effect + "/Build")]
        public static void Build()
        {
            if (!ConfirmSceneSwitch()) return;
            EnsureFolders(Root, "Materials", "Textures", "Prefabs", "Scenes");

            var noise = ImportTexture(Root + "/Textures/T_Noise_Fire.png", 256, clamp: false);
            var mat = Material(Root + "/Materials/M_" + Effect + "_Flame_Alpha.mat", VfxBlend.Alpha, null, "VFX/Fire Stylized");
            mat.SetTexture("_NoiseTex", noise);
            EditorUtility.SetDirty(mat);

            var root = new GameObject("VFX_" + Effect);
            var quad = GameObject.CreatePrimitive(PrimitiveType.Quad);
            Object.DestroyImmediate(quad.GetComponent<Collider>());
            quad.name = "Flame_Quad";
            quad.transform.SetParent(root.transform, false);
            quad.transform.localPosition = new Vector3(0, 1f, 0);
            quad.transform.localScale = new Vector3(2f, 2f, 1f);
            var r = quad.GetComponent<MeshRenderer>();
            r.sharedMaterial = mat;
            r.shadowCastingMode = ShadowCastingMode.Off;
            r.receiveShadows = false;

            var prefab = SavePrefab(root, Root + "/Prefabs/VFX_" + Effect + ".prefab");
            var errors = Validate(Root, prefab);
            if (errors.Count > 0) throw new System.InvalidOperationException(string.Join("\n", errors));

            BakeLoopSheet(mat, Root + "/Textures/T_" + Effect + "_Loop_4x4.png", "Docs/VFX/" + Effect + "/Loop_sheet.png");
            DemoScene(prefab, Root + "/Scenes/" + Effect + "_Demo.unity", new Vector3(0, 1.2f, -4f), new Vector3(0, 1f, 0));
            AssetDatabase.SaveAssets();
            Debug.Log("[VfxKit] " + Effect + " built OK. Sheet: Docs/VFX/" + Effect + "/Loop_sheet.png");
        }

        public static void BuildBatch() => RunBatch(Build);

        /// <summary>Look v2 (2026-10-21): wider body, split tongues, smaller core, margin inside the cell.</summary>
        [MenuItem("VFX/" + Effect + "/Apply Look v2 + Bake")]
        public static void ApplyV2AndBake()
        {
            var mat = AssetDatabase.LoadAssetAtPath<Material>(Root + "/Materials/M_" + Effect + "_Flame_Alpha.mat");
            if (mat == null) { Debug.LogError("[VfxKit] Run VFX/" + Effect + "/Build first."); return; }
            mat.SetVector("_NoiseScaleA", new Vector4(2.0f, 0.6f, 0, 0));
            mat.SetVector("_NoiseScaleB", new Vector4(3.0f, 1.2f, 0, 0));
            mat.SetVector("_FlameY", new Vector4(0.05f, 0.9f, 0, 0));
            mat.SetFloat("_SpeedA", 0.5f); mat.SetFloat("_SpeedB", 1.0f); mat.SetFloat("_SwaySpeed", Mathf.PI);
            mat.SetFloat("_Distortion", 0.3f); mat.SetFloat("_BaseWidth", 0.45f); mat.SetFloat("_Taper", 1.3f);
            mat.SetFloat("_Sway", 0.07f); mat.SetFloat("_NoiseAmount", 1.15f); mat.SetFloat("_EdgeSoft", 0.015f);
            mat.SetFloat("_Band1", 0.11f); mat.SetFloat("_Band2", 0.28f); mat.SetFloat("_Band3", 0.5f);
            mat.SetFloat("_TimeScale", 1f); mat.SetFloat("_TimeOffset", 0f);
            EditorUtility.SetDirty(mat);
            AssetDatabase.SaveAssets();
            BakeFromMaterial();
        }

        // Look-dev loop: tune M_FireStylized_Flame_Alpha in the Inspector (live shader), then bake the
        // 4x4 sheet for production from exactly those values. The material itself is not changed.
        [MenuItem("VFX/" + Effect + "/Bake Sheet From Material")]
        public static void BakeFromMaterial()
        {
            var mat = AssetDatabase.LoadAssetAtPath<Material>(Root + "/Materials/M_" + Effect + "_Flame_Alpha.mat");
            if (mat == null) { Debug.LogError("[VfxKit] Run VFX/" + Effect + "/Build first."); return; }
            AssetDatabase.SaveAssets();
            BakeLoopSheet(mat, Root + "/Textures/T_" + Effect + "_Loop_4x4.png", "Docs/VFX/" + Effect + "/Loop_sheet.png");
            Debug.Log("[VfxKit] " + Effect + " sheet baked: Docs/VFX/" + Effect + "/Loop_sheet.png");
        }

        // One-shot trigger: if Temp/FireStylized.autobuild exists after a recompile, build once and delete it.
        [InitializeOnLoadMethod]
        static void AutoBuildOnce()
        {
            const string flag = "Temp/FireStylized.autobuild";
            const string flagV2 = "Temp/FireStylized.applyv2";
            // Temp/FireStylized.set: lines "_Prop=r,g,b,a" (colour) or "_Prop=x" (float) applied to the material, then bake.
            const string flagSet = "Temp/FireStylized.set";
            if (File.Exists(flagSet))
            {
                var lines = File.ReadAllLines(flagSet);
                File.Delete(flagSet);
                EditorApplication.delayCall += () =>
                {
                    try
                    {
                        var mat = AssetDatabase.LoadAssetAtPath<Material>(Root + "/Materials/M_" + Effect + "_Flame_Alpha.mat");
                        foreach (var line in lines)
                        {
                            var kv = line.Split('=');
                            if (kv.Length != 2) continue;
                            var v = System.Array.ConvertAll(kv[1].Split(','), x => float.Parse(x.Trim(), System.Globalization.CultureInfo.InvariantCulture));
                            if (v.Length == 4) mat.SetColor(kv[0].Trim(), new Color(v[0], v[1], v[2], v[3]));
                            else mat.SetFloat(kv[0].Trim(), v[0]);
                        }
                        EditorUtility.SetDirty(mat);
                        BakeFromMaterial();
                    }
                    catch (System.Exception e) { Debug.LogException(e); }
                };
            }
            const string flagBake = "Temp/FireStylized.bake";
            if (File.Exists(flagBake))
            {
                File.Delete(flagBake);
                EditorApplication.delayCall += () => { try { BakeFromMaterial(); } catch (System.Exception e) { Debug.LogException(e); } };
            }
            if (File.Exists(flagV2))
            {
                File.Delete(flagV2);
                EditorApplication.delayCall += () => { try { ApplyV2AndBake(); } catch (System.Exception e) { Debug.LogException(e); } };
            }
            if (!File.Exists(flag)) return;
            File.Delete(flag);
            EditorApplication.delayCall += () => { try { Build(); } catch (System.Exception e) { Debug.LogException(e); } };
        }

        /// <summary>Renders 16 frames over one loop period with straight (non-premultiplied) alpha.</summary>
        static void BakeLoopSheet(Material source, string assetPng, string docsPng)
        {
            // Renders in the open scene (works in Edit and Play mode): hidden objects far away on an isolated layer.
            const int layer = 31;
            var origin = new Vector3(0, -10000, 0);
            var bake = new Material(source);
            bake.SetFloat("_SrcBlend", (float)BlendMode.One);
            bake.SetFloat("_DstBlend", (float)BlendMode.Zero);
            bake.SetFloat("_TimeScale", 0f);

            var quad = GameObject.CreatePrimitive(PrimitiveType.Quad);
            Object.DestroyImmediate(quad.GetComponent<Collider>());
            quad.hideFlags = HideFlags.HideAndDontSave;
            quad.layer = layer;
            quad.transform.position = origin;
            quad.GetComponent<MeshRenderer>().sharedMaterial = bake;
            var cam = new GameObject("BakeCamera").AddComponent<Camera>();
            cam.gameObject.hideFlags = HideFlags.HideAndDontSave;
            cam.enabled = false;
            cam.cullingMask = 1 << layer;
            cam.transform.position = origin + new Vector3(0, 0, -2);
            cam.orthographic = true;
            cam.orthographicSize = 0.5f;
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
                    int col = i % Grid, row = Grid - 1 - i / Grid;   // frame 0 top-left (Unity flipbook order)
                    sheet.SetPixels(col * Cell, row * Cell, Cell, Cell, frame.GetPixels());
                }
                sheet.Apply();
                var png = sheet.EncodeToPNG();
                Directory.CreateDirectory(Path.GetDirectoryName(docsPng));
                File.WriteAllBytes(docsPng, png);
                File.WriteAllBytes(assetPng, png);
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
                Object.DestroyImmediate(quad);
                Object.DestroyImmediate(cam.gameObject);
            }
            AssetDatabase.ImportAsset(assetPng);
            ImportTexture(assetPng, 1024);
        }
    }
}
#endif
