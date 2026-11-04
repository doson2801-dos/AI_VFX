#if UNITY_EDITOR
using System.IO;
using UnityEditor;
using UnityEngine;

namespace VfxEffects
{
    // The environment of the showcase scene (art lead 2026-11-04: "a more realistic environment"): dusk sky, warm sun with soft shadows,
    // fog, a dirt ground, a worn stone arena floor, boulders and broken pillars around it, and a lit 2 m reference figure. Built-in pipeline
    // only, no external assets: the ground / stone / rock textures and the rock meshes are generated here (the Library has no ground
    // textures) and saved under Assets/VFX/_Showcase/Textures and /Meshes, so they can be looked at and replaced.
    public static class VfxShowcaseEnvironment
    {
        const string Dir = "Assets/VFX/_Showcase";

        public static Material ReferenceMaterial;

        public static GameObject Build(Camera cam)
        {
            Directory.CreateDirectory(Dir + "/Textures"); Directory.CreateDirectory(Dir + "/Meshes"); Directory.CreateDirectory(Dir + "/Materials");
            var root = new GameObject("Environment");

            // ---- sky, ambient light, fog
            var sky = LoadOrCreate<Material>(Dir + "/Materials/M_Showcase_Sky.mat", () => new Material(Shader.Find("Skybox/Procedural")));
            sky.SetFloat("_SunSize", 0.06f); sky.SetFloat("_SunSizeConvergence", 5f);
            sky.SetFloat("_AtmosphereThickness", 0.85f); sky.SetFloat("_Exposure", 0.8f);
            sky.SetColor("_SkyTint", new Color(0.5f, 0.52f, 0.62f)); sky.SetColor("_GroundColor", new Color(0.22f, 0.2f, 0.19f));
            EditorUtility.SetDirty(sky);
            RenderSettings.skybox = sky;
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.46f, 0.5f, 0.62f);
            RenderSettings.ambientEquatorColor = new Color(0.36f, 0.35f, 0.38f);
            RenderSettings.ambientGroundColor = new Color(0.17f, 0.15f, 0.14f);
            RenderSettings.fog = true; RenderSettings.fogMode = FogMode.ExponentialSquared;
            RenderSettings.fogDensity = 0.019f; RenderSettings.fogColor = new Color(0.52f, 0.52f, 0.58f);
            cam.clearFlags = CameraClearFlags.Skybox;

            // ---- sun (low, warm) with soft shadows
            var sun = new GameObject("Sun", typeof(Light));
            sun.transform.SetParent(root.transform, false);
            sun.transform.rotation = Quaternion.Euler(44f, -38f, 0f);
            var l = sun.GetComponent<Light>();
            l.type = LightType.Directional; l.color = new Color(1f, 0.86f, 0.68f); l.intensity = 1.15f;
            l.shadows = LightShadows.Soft; l.shadowStrength = 0.8f;
            // a cool, weak fill from the opposite side
            var fill = new GameObject("Fill", typeof(Light));
            fill.transform.SetParent(root.transform, false);
            fill.transform.rotation = Quaternion.Euler(30f, 150f, 0f);
            var fl = fill.GetComponent<Light>(); fl.type = LightType.Directional; fl.color = new Color(0.55f, 0.62f, 0.85f); fl.intensity = 0.25f; fl.shadows = LightShadows.None;

            // ---- ground and arena
            var dirtAlbedo = Tex("T_Showcase_Dirt", 512, (u, v) => DirtColor(u, v), false);
            var dirtNormal = Tex("T_Showcase_DirtN", 512, null, true, (u, v) => DirtHeight(u, v));
            var stoneAlbedo = Tex("T_Showcase_Stone", 512, (u, v) => StoneColor(u, v), false);
            var stoneNormal = Tex("T_Showcase_StoneN", 512, null, true, (u, v) => StoneHeight(u, v));
            var mDirt = Lit(Dir + "/Materials/M_Showcase_Dirt.mat", dirtAlbedo, dirtNormal, new Vector2(78f, 78f), 0.05f);
            var mStone = Lit(Dir + "/Materials/M_Showcase_Stone.mat", stoneAlbedo, stoneNormal, new Vector2(4f, 4f), 0.12f);
            var mRock = Lit(Dir + "/Materials/M_Showcase_Rock.mat", stoneAlbedo, stoneNormal, new Vector2(1.5f, 1.5f), 0.1f);
            mRock.color = new Color(0.62f, 0.6f, 0.58f);

            var ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
            ground.name = "Ground"; ground.transform.SetParent(root.transform, false);
            ground.transform.localScale = new Vector3(60f, 1f, 60f);   // 600 m: the placed effects stand in a row 16 m apart
            ground.GetComponent<Renderer>().sharedMaterial = mDirt;
            Object.DestroyImmediate(ground.GetComponent<Collider>());

            var arena = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            arena.name = "Arena"; arena.transform.SetParent(root.transform, false);
            arena.transform.localScale = new Vector3(16f, 0.04f, 16f);
            arena.transform.localPosition = new Vector3(0f, 0.02f, 0f);
            arena.GetComponent<Renderer>().sharedMaterial = mStone;
            Object.DestroyImmediate(arena.GetComponent<Collider>());
            var rim = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            rim.name = "ArenaRim"; rim.transform.SetParent(root.transform, false);
            rim.transform.localScale = new Vector3(16.8f, 0.03f, 16.8f);
            rim.transform.localPosition = new Vector3(0f, 0.01f, 0f);
            rim.GetComponent<Renderer>().sharedMaterial = mRock;
            Object.DestroyImmediate(rim.GetComponent<Collider>());

            // ---- boulders and broken pillars around the arena (deterministic)
            var rnd = new System.Random(7);
            var rocks = new[] { RockMesh("SM_Showcase_Rock_0", 1), RockMesh("SM_Showcase_Rock_1", 2), RockMesh("SM_Showcase_Rock_2", 3), RockMesh("SM_Showcase_Rock_3", 4) };
            for (int i = 0; i < 26; i++)
            {
                float a = (float)(rnd.NextDouble() * Mathf.PI * 2f);
                float r = 11f + (float)rnd.NextDouble() * 38f;
                var go = new GameObject("Rock_" + i, typeof(MeshFilter), typeof(MeshRenderer));
                go.transform.SetParent(root.transform, false);
                float s = 0.6f + (float)rnd.NextDouble() * (r > 20f ? 3.2f : 1.4f);
                go.transform.localPosition = new Vector3(Mathf.Cos(a) * r, 0f, Mathf.Sin(a) * r);
                go.transform.localRotation = Quaternion.Euler(0f, (float)rnd.NextDouble() * 360f, 0f);
                go.transform.localScale = new Vector3(s * (0.8f + (float)rnd.NextDouble() * 0.6f), s * (0.6f + (float)rnd.NextDouble() * 0.5f), s * (0.8f + (float)rnd.NextDouble() * 0.6f));
                go.GetComponent<MeshFilter>().sharedMesh = rocks[i % rocks.Length];
                go.GetComponent<MeshRenderer>().sharedMaterial = mRock;
            }
            for (int i = 0; i < 7; i++)
            {
                float a = i / 7f * Mathf.PI * 2f + 0.3f;
                float r = 10.5f + (i % 2) * 1.2f;
                var p = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                p.name = "Pillar_" + i; p.transform.SetParent(root.transform, false);
                float h = 1.4f + (float)rnd.NextDouble() * 3.2f;
                p.transform.localScale = new Vector3(0.9f, h * 0.5f, 0.9f);
                p.transform.localPosition = new Vector3(Mathf.Cos(a) * r, h * 0.5f - 0.1f, Mathf.Sin(a) * r);
                p.transform.localRotation = Quaternion.Euler((float)(rnd.NextDouble() - 0.5) * 8f, (float)rnd.NextDouble() * 360f, (float)(rnd.NextDouble() - 0.5) * 8f);
                p.GetComponent<Renderer>().sharedMaterial = mRock;
                Object.DestroyImmediate(p.GetComponent<Collider>());
                // broken top: a rock sitting on it
                var cap = new GameObject("Rubble_" + i, typeof(MeshFilter), typeof(MeshRenderer));
                cap.transform.SetParent(root.transform, false);
                cap.transform.localPosition = p.transform.localPosition + new Vector3(0f, h * 0.5f, 0f);
                cap.transform.localScale = new Vector3(0.7f, 0.35f, 0.7f);
                cap.transform.localRotation = Quaternion.Euler(0f, (float)rnd.NextDouble() * 360f, 0f);
                cap.GetComponent<MeshFilter>().sharedMesh = rocks[(i + 1) % rocks.Length];
                cap.GetComponent<MeshRenderer>().sharedMaterial = mRock;
            }

            // ---- lit 2 m reference figure material (assigned to the runtime reference object)
            ReferenceMaterial = Lit(Dir + "/Materials/M_Showcase_Reference.mat", null, null, Vector2.one, 0.35f);
            ReferenceMaterial.color = new Color(0.42f, 0.48f, 0.58f);
            EditorUtility.SetDirty(ReferenceMaterial);
            return root;
        }

        // ---------------------------------------------------------------- materials / textures
        static Material Lit(string path, Texture2D albedo, Texture2D normal, Vector2 tiling, float smoothness)
        {
            var m = LoadOrCreate<Material>(path, () => new Material(Shader.Find("Standard")));
            m.shader = Shader.Find("Standard");
            if (albedo != null) { m.SetTexture("_MainTex", albedo); m.SetTextureScale("_MainTex", tiling); }
            if (normal != null) { m.SetTexture("_BumpMap", normal); m.SetTextureScale("_BumpMap", tiling); m.EnableKeyword("_NORMALMAP"); m.SetFloat("_BumpScale", 1.1f); }
            m.SetFloat("_Glossiness", smoothness); m.SetFloat("_Metallic", 0f);
            EditorUtility.SetDirty(m);
            return m;
        }

        static T LoadOrCreate<T>(string path, System.Func<T> make) where T : Object
        {
            var a = AssetDatabase.LoadAssetAtPath<T>(path);
            if (a != null) return a;
            a = make();
            AssetDatabase.CreateAsset(a, path);
            return a;
        }

        delegate Color ColorFn(float u, float v);
        delegate float HeightFn(float u, float v);

        // generated once and then kept (delete the PNG to regenerate)
        static Texture2D Tex(string name, int n, ColorFn color, bool normalMap, HeightFn height = null)
        {
            string path = Dir + "/Textures/" + name + ".png";
            if (!File.Exists(path))
            {
                var t = new Texture2D(n, n, TextureFormat.RGB24, false);
                for (int y = 0; y < n; y++)
                    for (int x = 0; x < n; x++)
                    {
                        float u = x / (float)n, v = y / (float)n;
                        if (!normalMap) t.SetPixel(x, y, color(u, v));
                        else
                        {
                            float e = 1f / n, k = 6f;
                            float dx = (height(u + e, v) - height(u - e, v)) * k, dy = (height(u, v + e) - height(u, v - e)) * k;
                            var nrm = new Vector3(-dx, -dy, 1f).normalized;
                            t.SetPixel(x, y, new Color(nrm.x * 0.5f + 0.5f, nrm.y * 0.5f + 0.5f, nrm.z * 0.5f + 0.5f));
                        }
                    }
                t.Apply();
                File.WriteAllBytes(path, t.EncodeToPNG());
                Object.DestroyImmediate(t);
                AssetDatabase.ImportAsset(path);
            }
            var imp = (TextureImporter)AssetImporter.GetAtPath(path);
            if (imp != null)
            {
                bool want = normalMap;
                if ((imp.textureType == TextureImporterType.NormalMap) != want || imp.wrapMode != TextureWrapMode.Repeat || imp.anisoLevel < 4)
                {
                    imp.textureType = want ? TextureImporterType.NormalMap : TextureImporterType.Default;
                    imp.wrapMode = TextureWrapMode.Repeat; imp.anisoLevel = 8; imp.mipmapEnabled = true;
                    imp.SaveAndReimport();
                }
            }
            return AssetDatabase.LoadAssetAtPath<Texture2D>(path);
        }

        // ---------------------------------------------------------------- tileable noise
        static float Hash(int x, int y, int seed)
        {
            unchecked
            {
                int h = x * 374761393 + y * 668265263 + seed * 1442695041;
                h = (h ^ (h >> 13)) * 1274126177;
                return ((h ^ (h >> 16)) & 0xffff) / 65535f;
            }
        }

        // value noise that repeats every `freq` cells in u and v (so the texture tiles)
        static float Noise(float u, float v, int freq, int seed)
        {
            float x = u * freq, y = v * freq;
            int x0 = Mathf.FloorToInt(x), y0 = Mathf.FloorToInt(y);
            float fx = x - x0, fy = y - y0;
            fx = fx * fx * (3f - 2f * fx); fy = fy * fy * (3f - 2f * fy);
            int xa = ((x0 % freq) + freq) % freq, xb = (xa + 1) % freq, ya = ((y0 % freq) + freq) % freq, yb = (ya + 1) % freq;
            float a = Mathf.Lerp(Hash(xa, ya, seed), Hash(xb, ya, seed), fx), b = Mathf.Lerp(Hash(xa, yb, seed), Hash(xb, yb, seed), fx);
            return Mathf.Lerp(a, b, fy);
        }

        static float Fbm(float u, float v, int baseFreq, int octaves, int seed)
        {
            float sum = 0f, amp = 0.5f, norm = 0f;
            for (int o = 0; o < octaves; o++) { sum += Noise(u, v, baseFreq << o, seed + o * 17) * amp; norm += amp; amp *= 0.5f; }
            return sum / norm;
        }

        static float DirtHeight(float u, float v) => Fbm(u, v, 6, 5, 3) * 0.8f + (Noise(u, v, 96, 9) > 0.86f ? 0.25f : 0f);

        static Color DirtColor(float u, float v)
        {
            float broad = Fbm(u, v, 3, 4, 11), fine = Fbm(u, v, 24, 3, 21);
            var dark = new Color(0.17f, 0.145f, 0.12f); var mid = new Color(0.33f, 0.28f, 0.22f); var light = new Color(0.44f, 0.4f, 0.34f);
            var c = Color.Lerp(Color.Lerp(dark, mid, broad * 1.6f), light, Mathf.Clamp01((fine - 0.5f) * 2.4f) * 0.7f);
            if (Noise(u, v, 96, 9) > 0.86f) c = Color.Lerp(c, new Color(0.42f, 0.4f, 0.37f), 0.45f);   // pebbles
            return c;
        }

        static float StoneTile(float u, float v, out float edge)
        {
            const int tiles = 4;
            float x = u * tiles, y = v * tiles;
            float fx = x - Mathf.Floor(x), fy = y - Mathf.Floor(y);
            edge = Mathf.Min(Mathf.Min(fx, 1f - fx), Mathf.Min(fy, 1f - fy));
            return Hash(Mathf.FloorToInt(x) % tiles, Mathf.FloorToInt(y) % tiles, 5);
        }

        static float StoneHeight(float u, float v)
        {
            float edge; StoneTile(u, v, out edge);
            float groove = Mathf.SmoothStep(0f, 1f, Mathf.Clamp01(edge / 0.035f));
            return groove * 0.6f + Fbm(u, v, 10, 4, 31) * 0.4f;
        }

        static Color StoneColor(float u, float v)
        {
            float edge; float tone = StoneTile(u, v, out edge);
            float wear = Fbm(u, v, 8, 5, 41), grain = Fbm(u, v, 64, 2, 51);
            var baseC = Color.Lerp(new Color(0.2f, 0.2f, 0.215f), new Color(0.34f, 0.33f, 0.34f), wear * 0.8f + tone * 0.3f);
            baseC *= 0.85f + grain * 0.3f;
            float groove = 1f - Mathf.SmoothStep(0f, 1f, Mathf.Clamp01(edge / 0.03f));
            return Color.Lerp(baseC, new Color(0.05f, 0.05f, 0.06f), groove * 0.9f);
        }

        // ---------------------------------------------------------------- rock mesh: a squashed sphere with noisy, faceted surface
        static Mesh RockMesh(string name, int seed)
        {
            string path = Dir + "/Meshes/" + name + ".asset";
            var src = Resources.GetBuiltinResource<Mesh>("Sphere.fbx");
            var verts = src.vertices; var uvs = src.uv; var tris = src.triangles;
            var rnd = new System.Random(seed);
            float ox = (float)rnd.NextDouble() * 10f, oy = (float)rnd.NextDouble() * 10f, oz = (float)rnd.NextDouble() * 10f;
            for (int i = 0; i < verts.Length; i++)
            {
                var p = verts[i].normalized;
                float n = Mathf.PerlinNoise(p.x * 1.8f + ox, p.y * 1.8f + oy) * 0.5f + Mathf.PerlinNoise(p.z * 1.8f + oz, p.x * 3.1f + oy) * 0.3f + Mathf.PerlinNoise(p.y * 4.5f + ox, p.z * 4.5f + oz) * 0.2f;
                float r = 0.42f + n * 0.5f;
                var q = p * r;
                if (q.y < -0.18f) q.y = -0.18f;   // flat bottom: it sits on the ground
                verts[i] = q;
            }
            var mesh = AssetDatabase.LoadAssetAtPath<Mesh>(path);
            if (mesh == null) { mesh = new Mesh { name = name }; AssetDatabase.CreateAsset(mesh, path); }
            mesh.Clear();
            mesh.vertices = verts; mesh.uv = uvs; mesh.triangles = tris;
            mesh.RecalculateNormals(); mesh.RecalculateBounds();
            EditorUtility.SetDirty(mesh);
            return mesh;
        }
    }
}
#endif
