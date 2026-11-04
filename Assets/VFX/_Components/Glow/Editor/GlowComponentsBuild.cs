#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;
using VfxKit;
using static VfxKit.VfxBuildKit;
using static VfxEffects.ComponentKit;

namespace VfxEffects
{
    // Component 02 - Glow (soft halo behind the hit). Spec: Docs/VFX/_ArtDirection/components/02_Glow.md
    // Default style: A Soft (art lead 2026-10-31) -> layers end with a fade, not a shrink.
    // Two layers for color: Outer (Mid, big, alpha <= 0.6) + Inner (Core, ~40 %). Sorting under Impact (Impact uses 2-3).
    public static class GlowComponentsBuild
    {
        const string Root = "Assets/VFX/_Components/Glow";
        const string DocsRoot = "Docs/VFX/_Components/Glow";
        const string ImpactPrefabs = "Assets/VFX/_Components/Impact/Prefabs/CMP_";
        const float GlowScreenMax = 2f;   // big additive quads: cap screen size (overdraw)

        [MenuItem("VFX/Components/Glow - Build")]
        public static void Build()
        {
            if (!ConfirmSceneSwitch()) return;
            EnsureFolders(Root, "Materials", "Prefabs", "Scenes");
            var tex = ImportTexture(Root + "/Textures/T_GLW_Soft.png", 256);
            var mat = Material(Root + "/Materials/M_GLW_Soft_Add.mat", VfxBlend.Additive, tex);

            BuildAir(mat);
            BuildDir(mat);
            BuildGround(mat);
            AssetDatabase.SaveAssets();
            Debug.Log("[Glow] components built OK");
        }

        static GameObject Impact(string id) => AssetDatabase.LoadAssetAtPath<GameObject>(ImpactPrefabs + id + ".prefab");

        // Outer: Mid, alpha 0.6, pops in fast, keeps growing, fades out
        static ParticleSystem Outer(Transform root, Material mat, float life, float size)
        {
            var ps = Particle(root, "Outer", mat, life, size, WithAlpha(Mid, 0.6f));
            var m = ps.main;
            m.startRotation = new ParticleSystem.MinMaxCurve(0f, TwoPi);
            Burst(ps, 1);
            SizeOverLifetime(ps, 0f, 0.5f, 0.15f, 1f, 1f, 1.15f);
            AlphaOverLifetime(ps, 0f, 0f, 0.05f, 1f, 0.3f, 0.8f, 1f, 0f);
            Common(ps, 0, GlowScreenMax);
            return ps;
        }

        // Inner: Core, smaller and shorter
        static ParticleSystem Inner(Transform root, Material mat, float life, float size)
        {
            var ps = Particle(root, "Inner", mat, life, size, Core);
            var m = ps.main;
            m.startRotation = new ParticleSystem.MinMaxCurve(0f, TwoPi);
            Burst(ps, 1);
            SizeOverLifetime(ps, 0f, 0.6f, 0.15f, 1f, 1f, 1.05f);
            AlphaOverLifetime(ps, 0f, 0f, 0.05f, 1f, 0.5f, 0.8f, 1f, 0f);
            Common(ps, 1, GlowScreenMax);
            return ps;
        }

        // ---------------------------------------------------------------- 4a Air
        static void BuildAir(Material mat)
        {
            const string id = "GLW_Air_01";
            var root = new GameObject("CMP_" + id).transform;
            Outer(root, mat, 0.35f, 3.5f);
            Inner(root, mat, 0.2f, 1.4f);
            Save(root.gameObject, Root, DocsRoot, id, new Vector3(0f, 1.1f, 0f),
                new[] { 0.01f, 0.03f, 0.06f, 0.1f, 0.15f, 0.22f, 0.3f, 0.36f }, Impact("IMP_Hit_Air_01"));
        }

        // ---------------------------------------------------------------- 4b Dir (force toward +X, same `rotation` as Impact Dir)
        static void BuildDir(Material mat)
        {
            const string id = "GLW_Dir_01";
            const float rotation = 0f;
            var root = new GameObject("CMP_" + id).transform;
            foreach (var (ps, x, y) in new[] { (Outer(root, mat, 0.35f, 1f), 4.0f, 2.4f), (Inner(root, mat, 0.2f, 1f), 1.8f, 1.1f) })
            {
                var m = ps.main;
                m.startSize3D = true;
                m.startSizeX = x; m.startSizeY = y; m.startSizeZ = 1f;
                m.startRotation = rotation * Mathf.Deg2Rad;
                ps.GetComponent<ParticleSystemRenderer>().pivot = new Vector3(0.15f, 0f, 0f);   // lean forward, same side as the Impact spike
            }
            Save(root.gameObject, Root, DocsRoot, id, new Vector3(0f, 1.1f, 0f),
                new[] { 0.01f, 0.03f, 0.06f, 0.1f, 0.15f, 0.22f, 0.3f, 0.36f }, Impact("IMP_Hit_Dir_01"));
        }

        // ---------------------------------------------------------------- 4c Ground
        static void BuildGround(Material mat)
        {
            const string id = "GLW_Ground_01";
            var root = new GameObject("CMP_" + id).transform;

            // Pool: light spilled on the ground, Billboard + Render Alignment Local
            var pool = Particle(root, "Pool", mat, 0.5f, 4f, WithAlpha(Mid, 0.5f));
            var pm = pool.main;
            pm.startRotation = new ParticleSystem.MinMaxCurve(0f, TwoPi);
            Burst(pool, 1);
            SizeOverLifetime(pool, 0f, 0.4f, 0.15f, 1f, 1f, 1.1f);
            AlphaOverLifetime(pool, 0f, 0f, 0.05f, 0.8f, 0.4f, 0.5f, 1f, 0f);
            GroundFlat(pool);
            Common(pool, -5, GlowScreenMax);   // ground plane: under the smoke

            // Halo: small upright glow at the foot of the splash
            var halo = Particle(root, "Halo", mat, 0.25f, 2f, WithAlpha(Mid, 0.5f));
            halo.transform.localPosition = new Vector3(0f, 0.5f, 0f);
            var hm = halo.main;
            hm.startRotation = new ParticleSystem.MinMaxCurve(0f, TwoPi);
            Burst(halo, 1);
            SizeOverLifetime(halo, 0f, 0.6f, 0.15f, 1f, 1f, 1.05f);
            AlphaOverLifetime(halo, 0f, 0f, 0.05f, 1f, 0.7f, 1f, 1f, 0f);
            Common(halo, 0, GlowScreenMax);

            Save(root.gameObject, Root, DocsRoot, id, Vector3.zero,
                new[] { 0.02f, 0.06f, 0.12f, 0.2f, 0.28f, 0.36f, 0.44f, 0.5f }, Impact("IMP_Hit_Ground_01"));
        }

        public static void BuildBatch() => RunBatch(Build);
    }
}
#endif
