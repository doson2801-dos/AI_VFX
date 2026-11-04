#if UNITY_EDITOR
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEngine;
using VfxKit;
using static VfxKit.VfxBuildKit;
using static VfxEffects.ComponentKit;

namespace VfxEffects
{
    // Realtime toon smoke mass (fire colouring removed 2026-11-03) (art lead 2026-11-03: "put the shader straight into Unity, no baked sheet").
    //   Mesh   : Blender metaball mass, exported by codefx/mesh/blender_passes.py (CFX_EXPORT) to
    //            Docs/VFX/SmokeMesh/mesh/SmokeMesh_mesh.json — camera-space verts (x right, y up, z away), pivot = ground point,
    //            uv0 = (ao, region noise), uv1 = (detail noise, 0), thr = 5-point dissolve threshold curve.
    //   Shader : VFX/FX/Smoke Mesh (Assets/VFX/_Shared/Shaders/SH_VFX_SmokeMesh.shader), driven by the particle AgePercent.
    //   Particle: one Mesh particle, Render Alignment View (the mass was designed for the 3/4 camera), size over life =
    //            Blender grow (out_back) x swell.
    public static class SmokeMeshBuild
    {
        const string Root = "Assets/VFX/_Components/CodeFX";
        const string DocsRoot = "Docs/VFX/_Components/CodeFX";
        const string MeshJson = "Docs/VFX/SmokeMesh/mesh/SmokeMesh_mesh.json";
        const string Id = "SMK_Mesh_Ground_01";
        const float Duration = 1.2f;

        [System.Serializable]
        class MeshData { public float[] verts; public float[] normals; public float[] uv0; public float[] uv1; public int[] tris; public float[] thr; }

        [MenuItem("VFX/Components/CodeFX - Build Smoke Mesh (realtime)")]
        public static void Build()
        {
            if (!ConfirmSceneSwitch()) return;
            EnsureFolders(Root, "Materials", "Prefabs", "Scenes", "Meshes");
            var data = JsonUtility.FromJson<MeshData>(File.ReadAllText(MeshJson));
            var mesh = MakeMesh(data, Root + "/Meshes/ME_SmokeMesh.asset");

            var mat = Material(Root + "/Materials/M_SmokeMesh.mat", VfxBlend.Alpha, null, "VFX/FX/Smoke Mesh");
            // dissolve threshold curve: area quantiles of the field on the camera-facing surface, for THIS material's
            // Region vs Detail weight (a fixed curve went out of pace when the weight was changed)
            var thr = Thresholds(data, mat.GetFloat("_RegionWeight"));
            mat.SetVector("_Thr", new Vector4(thr[0], thr[1], thr[2], thr[3]));
            mat.SetFloat("_Thr4", thr[4]);
            mat.SetFloat("_PreviewOverride", 0f);
            mat.SetFloat("_UseParticle", 1f);
            mat.EnableKeyword("_USE_PARTICLE_DATA");
            EditorUtility.SetDirty(mat);

            var root = new GameObject("CMP_" + Id).transform;
            var size = SizeCurve(out float maxSize);
            // smoke colour lives in the particle (art lead 2026-11-03): Start Color = the lit smoke tone; the shader only
            // darkens the shadow side (_ShadowDarkness 0.6 = the old shadow / lit ratio)
            var ps = Particle(root, "Body", mat, Duration, maxSize, new Color(0.482f, 0.431f, 0.431f, 1f));
            Burst(ps, 1);
            var sol = ps.sizeOverLifetime;
            sol.enabled = true;
            sol.size = new ParticleSystem.MinMaxCurve(1f, size);

            var r = ps.GetComponent<ParticleSystemRenderer>();
            r.renderMode = ParticleSystemRenderMode.Mesh;
            r.mesh = mesh;
            r.alignment = ParticleSystemRenderSpace.View;
            r.sortMode = ParticleSystemSortMode.Distance;   // several particles: far first, so soft edges blend over the ones behind
            r.SetActiveVertexStreams(new List<ParticleSystemVertexStream>
            {
                ParticleSystemVertexStream.Position, ParticleSystemVertexStream.Normal,
                ParticleSystemVertexStream.Color,                                                 // tint + fade
                ParticleSystemVertexStream.UV, ParticleSystemVertexStream.UV2,                    // TEXCOORD0 = (ao, region, detail, -)
                ParticleSystemVertexStream.Custom1X, ParticleSystemVertexStream.Center            // TEXCOORD1 = (dissolve, centre)
            });
            DissolveCurve(ps);
            ColorOverLifetime(ps, new[] { Color.white }, 0f, 1f, 1f, 1f);      // x Start Color: colour / fade over life
            Rise(ps, 0.75f);
            Common(ps, 0, 3f);

            Save(root.gameObject, Root, DocsRoot, Id, Vector3.zero, Times(Duration));
            AssetDatabase.SaveAssets();
            Debug.Log("[CodeFX] smoke mesh (realtime) built OK: " + mesh.vertexCount + " verts");
        }

        public static void BuildBatch() => RunBatch(Build);

        // ---- time lives in the particle system, kept minimal (art lead 2026-11-03), filled with the approved timing
        // (codefx smoke_mesh.py): Custom1.x = Dissolve only. Smoke only (fire colouring removed, art lead 2026-11-03).
        static float Smooth(float a, float b, float t) { float x = Mathf.Clamp01((t - a) / (b - a)); return x * x * (3f - 2f * x); }
        static float Seg(float a, float b, float t) => Mathf.Clamp01((t - a) / (b - a));

        const float DisStart = 0.3f;

        static void DissolveCurve(ParticleSystem ps)
        {
            var cd = ps.customData;
            cd.enabled = true;
            cd.SetMode(ParticleSystemCustomData.Custom1, ParticleSystemCustomDataMode.Vector);
            cd.SetVectorComponentCount(ParticleSystemCustomData.Custom1, 1);
            cd.SetVector(ParticleSystemCustomData.Custom1, 0,
                new ParticleSystem.MinMaxCurve(1f, Sample(t => Mathf.Pow(Seg(DisStart, Duration * 0.97f, t), 1.2f))));
        }

        // rise: height(t) = h * seg(0.12, D, t)^1.2  ->  Velocity over Lifetime Y = d height / dt
        static void Rise(ParticleSystem ps, float h)
        {
            var vel = ps.velocityOverLifetime;
            vel.enabled = true;
            vel.space = ParticleSystemSimulationSpace.Local;
            System.Func<float, float> height = t => h * Mathf.Pow(Seg(0.12f, Duration, t), 1.2f);
            const float dt = 0.01f;
            vel.x = new ParticleSystem.MinMaxCurve(1f, AnimationCurve.Constant(0f, 1f, 0f));
            vel.z = new ParticleSystem.MinMaxCurve(1f, AnimationCurve.Constant(0f, 1f, 0f));
            vel.y = new ParticleSystem.MinMaxCurve(1f, Sample(t => (height(Mathf.Min(t + dt, Duration)) - height(Mathf.Max(t - dt, 0f))) / (2f * dt)));
        }

        /// <summary>Curve over normalised life 0..1 from a function of seconds, linear tangents (no S-curve stalls).</summary>
        static AnimationCurve Sample(System.Func<float, float> f, int n = 24)
        {
            var c = new AnimationCurve();
            for (int i = 0; i <= n; i++) c.AddKey(i / (float)n, f(Duration * i / n));
            for (int i = 0; i < c.length; i++)
            {
                AnimationUtility.SetKeyLeftTangentMode(c, i, AnimationUtility.TangentMode.Linear);
                AnimationUtility.SetKeyRightTangentMode(c, i, AnimationUtility.TangentMode.Linear);
            }
            return c;
        }

        static float[] Thresholds(MeshData d, float w)
        {
            int n = d.verts.Length / 3;
            var f = new List<float>();
            for (int i = 0; i < n; i++)
                if (-d.normals[3 * i + 2] > 0.15f)                       // faces the camera
                    f.Add(d.uv0[2 * i + 1] * w + d.uv1[2 * i] * (1f - w));
            f.Sort();
            float Q(float p) => f[Mathf.Clamp(Mathf.RoundToInt(p * (f.Count - 1)), 0, f.Count - 1)];
            return new[] { Q(0.005f), Q(0.25f), Q(0.5f), Q(0.75f), Q(0.998f) };
        }

        static Mesh MakeMesh(MeshData d, string path)
        {
            int n = d.verts.Length / 3;
            // pivot under the CENTRE of the mass (x, z), feet on the ground (y = 0). The export put the mass ~0.37 m
            // toward the camera from the pivot: invisible from the 3/4 game camera, off-centre from any other view.
            float minX = float.MaxValue, maxX = float.MinValue, minZ = float.MaxValue, maxZ = float.MinValue;
            for (int i = 0; i < n; i++)
            {
                minX = Mathf.Min(minX, d.verts[3 * i]); maxX = Mathf.Max(maxX, d.verts[3 * i]);
                minZ = Mathf.Min(minZ, d.verts[3 * i + 2]); maxZ = Mathf.Max(maxZ, d.verts[3 * i + 2]);
            }
            float cx = (minX + maxX) * 0.5f, cz = (minZ + maxZ) * 0.5f;
            var v = new Vector3[n]; var nr = new Vector3[n]; var u0 = new Vector2[n]; var u1 = new Vector2[n];
            for (int i = 0; i < n; i++)
            {
                v[i] = new Vector3(d.verts[3 * i] - cx, d.verts[3 * i + 1], d.verts[3 * i + 2] - cz);
                nr[i] = new Vector3(d.normals[3 * i], d.normals[3 * i + 1], d.normals[3 * i + 2]);
                u0[i] = new Vector2(d.uv0[2 * i], d.uv0[2 * i + 1]);
                u1[i] = new Vector2(d.uv1[2 * i], d.uv1[2 * i + 1]);
            }
            var mesh = AssetDatabase.LoadAssetAtPath<Mesh>(path);
            bool isNew = mesh == null;
            if (isNew) mesh = new Mesh();
            mesh.Clear();
            mesh.name = "ME_SmokeMesh";
            mesh.indexFormat = n > 65000 ? UnityEngine.Rendering.IndexFormat.UInt32 : UnityEngine.Rendering.IndexFormat.UInt16;
            mesh.vertices = v; mesh.normals = nr; mesh.uv = u0; mesh.uv2 = u1;
            mesh.triangles = d.tris;
            mesh.RecalculateBounds();
            if (isNew) AssetDatabase.CreateAsset(mesh, path);
            EditorUtility.SetDirty(mesh);
            return mesh;
        }

        // Blender pose: grow = 0.35 + 0.65 * out_back(seg(0, 0.2, t)), swell = 1 + 0.42 * (1 - exp(-1.6 * (t - 0.12)))
        static AnimationCurve SizeCurve(out float max)
        {
            const int N = 24;
            var vals = new float[N + 1];
            max = 0f;
            for (int i = 0; i <= N; i++)
            {
                float t = Duration * i / N;
                float x = Mathf.Clamp01(t / 0.2f) - 1f, s = 1.4f;
                float grow = 0.35f + 0.65f * (x * x * ((s + 1f) * x + s) + 1f);
                float swell = 1f + 0.42f * (1f - Mathf.Exp(-1.6f * Mathf.Max(t - 0.12f, 0f)));
                vals[i] = grow * swell;
                max = Mathf.Max(max, vals[i]);
            }
            var c = new AnimationCurve();
            for (int i = 0; i <= N; i++) c.AddKey(i / (float)N, vals[i] / max);
            for (int i = 0; i < c.length; i++) AnimationUtility.SetKeyLeftTangentMode(c, i, AnimationUtility.TangentMode.Linear);
            for (int i = 0; i < c.length; i++) AnimationUtility.SetKeyRightTangentMode(c, i, AnimationUtility.TangentMode.Linear);
            return c;
        }

        static float[] Times(float d)
        {
            var t = new float[8];
            for (int i = 0; i < 8; i++) t[i] = Mathf.Max(0.01f, d * i / 8f);
            return t;
        }
    }
}
#endif
