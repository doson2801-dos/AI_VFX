#if UNITY_EDITOR
using System;
using System.IO;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using Object = UnityEngine.Object;

namespace VfxEffects
{
    /// <summary>
    /// Bakes a shader-driven mesh effect into a flipbook sheet (straight alpha, frame 0 top-left).
    /// Pass 1 renders every frame wide to measure the real silhouette (shaders deform on the GPU, so mesh bounds
    /// are useless); pass 2 renders tightly framed with a margin. Works in Edit and Play mode (hidden objects on
    /// an isolated layer, far away). Art-direction prototype - not part of the kit yet.
    /// </summary>
    public static class ShaderSheetBaker
    {
        const int Layer = 31;
        static readonly Vector3 Origin = new Vector3(0, -10000, 0);

        /// <param name="setFrame">Sets the material for frame i of n (e.g. _TimeOffset or _Life).</param>
        /// <param name="pitch">Camera pitch in degrees (0 = side, 90 = top-down).</param>
        public static void Bake(Material source, Mesh mesh, Action<Material, int, int> setFrame, string assetPng, string docsPng,
                                float pitch = 12f, int cols = 4, int rows = 4, int cell = 256, float margin = 0.06f)
        {
            int n = cols * rows;   // art lead: loop 8 frames (4x2), one-shot 16 frames (4x4)
            var bake = new Material(source);
            // composite overlapping faces like the game does: rgb premultiplied, alpha 'over' (shader: Blend ..., One OneMinusSrcAlpha)
            bake.SetFloat("_SrcBlend", (float)BlendMode.SrcAlpha);
            bake.SetFloat("_DstBlend", (float)BlendMode.OneMinusSrcAlpha);
            if (bake.HasProperty("_TimeScale")) bake.SetFloat("_TimeScale", 0f);

            var go = new GameObject("SheetBakeMesh") { hideFlags = HideFlags.HideAndDontSave, layer = Layer };
            go.transform.position = Origin;
            go.AddComponent<MeshFilter>().sharedMesh = mesh;
            go.AddComponent<MeshRenderer>().sharedMaterial = bake;

            var cam = new GameObject("SheetBakeCamera") { hideFlags = HideFlags.HideAndDontSave }.AddComponent<Camera>();
            cam.enabled = false;
            cam.cullingMask = 1 << Layer;
            cam.orthographic = true;
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0, 0, 0, 0);
            cam.allowHDR = false;
            cam.allowMSAA = false;
            cam.nearClipPlane = 0.01f;
            cam.farClipPlane = 100f;
            var rot = Quaternion.Euler(pitch, 0, 0);

            try
            {
                // pass 1: wide, low-res, union of alpha bounds in camera-plane units
                const int probe = 128;
                float wide = 4f;
                Vector3 center = Origin + new Vector3(0, 1f, 0);
                float xMin = float.MaxValue, xMax = float.MinValue, yMin = float.MaxValue, yMax = float.MinValue;
                foreach (var px in Render(cam, bake, setFrame, n, probe, center, rot, wide))
                {
                    if (px.w < 0) continue;
                    xMin = Mathf.Min(xMin, px.x); xMax = Mathf.Max(xMax, px.y);
                    yMin = Mathf.Min(yMin, px.z); yMax = Mathf.Max(yMax, px.w);
                }
                if (xMin > xMax) throw new InvalidOperationException("Nothing visible to bake (all frames transparent).");
                // pixel bounds -> camera plane offsets
                Func<float, float> toUnits = p => (p / probe - 0.5f) * 2f * wide;
                float cx = (toUnits(xMin) + toUnits(xMax + 1)) * 0.5f, cy = (toUnits(yMin) + toUnits(yMax + 1)) * 0.5f;
                float half = Mathf.Max(toUnits(xMax + 1) - toUnits(xMin), toUnits(yMax + 1) - toUnits(yMin)) * 0.5f * (1f + 2f * margin);
                center += rot * new Vector3(cx, cy, 0);

                // pass 2: tight frame, full res, write sheet
                var sheet = new Texture2D(cell * cols, cell * rows, TextureFormat.RGBA32, false);
                int i = 0;
                foreach (var frame in RenderFrames(cam, bake, setFrame, n, cell, center, rot, half))
                {
                    int col = i % cols, row = rows - 1 - i / cols;
                    sheet.SetPixels(col * cell, row * cell, cell, cell, frame);
                    i++;
                }
                sheet.Apply();
                var png = sheet.EncodeToPNG();
                Object.DestroyImmediate(sheet);
                Directory.CreateDirectory(Path.GetDirectoryName(docsPng));
                File.WriteAllBytes(docsPng, png);
                if (assetPng != null)
                {
                    File.WriteAllBytes(assetPng, png);
                    AssetDatabase.ImportAsset(assetPng);
                    VfxKit.VfxBuildKit.ImportTexture(assetPng, cell * Mathf.Max(cols, rows));
                }
            }
            finally
            {
                Object.DestroyImmediate(bake);
                Object.DestroyImmediate(go);
                Object.DestroyImmediate(cam.gameObject);
            }
        }

        // per frame: (xMin, xMax, yMin, yMax) of pixels with alpha > 0.02, or w = -1 when empty
        static System.Collections.Generic.IEnumerable<Vector4> Render(Camera cam, Material m, Action<Material, int, int> setFrame,
                                                                       int n, int res, Vector3 center, Quaternion rot, float half)
        {
            foreach (var px in RenderFrames(cam, m, setFrame, n, res, center, rot, half))
            {
                int x0 = res, x1 = -1, y0 = res, y1 = -1;
                for (int y = 0; y < res; y++)
                    for (int x = 0; x < res; x++)
                        if (px[y * res + x].a > 0.02f)
                        {
                            if (x < x0) x0 = x; if (x > x1) x1 = x;
                            if (y < y0) y0 = y; if (y > y1) y1 = y;
                        }
                yield return x1 < 0 ? new Vector4(0, 0, 0, -1) : new Vector4(x0, x1, y0, y1);
            }
        }

        static System.Collections.Generic.IEnumerable<Color[]> RenderFrames(Camera cam, Material m, Action<Material, int, int> setFrame,
                                                                           int n, int res, Vector3 center, Quaternion rot, float half)
        {
            cam.orthographicSize = half;
            cam.transform.rotation = rot;
            cam.transform.position = center - rot * Vector3.forward * 10f;
            var rt = new RenderTexture(res, res, 24, RenderTextureFormat.ARGB32, RenderTextureReadWrite.sRGB);
            var tex = new Texture2D(res, res, TextureFormat.RGBA32, false);
            cam.targetTexture = rt;
            try
            {
                for (int i = 0; i < n; i++)
                {
                    setFrame(m, i, n);
                    cam.Render();
                    RenderTexture.active = rt;
                    tex.ReadPixels(new Rect(0, 0, res, res), 0, 0);
                    tex.Apply();
                    var px = tex.GetPixels();
                    for (int k = 0; k < px.Length; k++)   // back to straight alpha
                        if (px[k].a > 0.004f) { float a = px[k].a; px[k] = new Color(px[k].r / a, px[k].g / a, px[k].b / a, a); }
                    yield return px;
                }
            }
            finally
            {
                RenderTexture.active = null;
                cam.targetTexture = null;
                rt.Release();
                Object.DestroyImmediate(rt);
                Object.DestroyImmediate(tex);
            }
        }
    }
}
#endif
