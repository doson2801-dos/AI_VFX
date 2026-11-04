#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;
using VfxKit;
using static VfxKit.VfxBuildKit;
using static VfxEffects.ComponentKit;

namespace VfxEffects
{
    // Component 03 - Ring (shockwave). Spec: Docs/VFX/_ArtDirection/components/03_Ring.md
    // Style B shockwave (art lead 2026-11-02). Growth comes from the 4x2 flipbook inside a fixed quad
    // (sheet: Docs/VFX/_ArtDirection/components/scripts/ring_sheet.py), so the line does not thicken as the ring grows.
    public static class RingComponentsBuild
    {
        const string Root = "Assets/VFX/_Components/Ring";
        const string DocsRoot = "Docs/VFX/_Components/Ring";

        [MenuItem("VFX/Components/Ring - Build")]
        public static void Build()
        {
            if (!ConfirmSceneSwitch()) return;
            EnsureFolders(Root, "Materials", "Prefabs", "Scenes");
            var mShock = Material(Root + "/Materials/M_RNG_Shock_Add.mat", VfxBlend.Additive, ImportTexture(Root + "/Textures/T_RNG_Shock_4x2.png", 1024));
            var mThick = Material(Root + "/Materials/M_RNG_ShockThick_Add.mat", VfxBlend.Additive, ImportTexture(Root + "/Textures/T_RNG_ShockThick_4x2.png", 1024));

            Build("RNG_Ground_01", mShock, 0.45f, 4.5f, Vector3.zero, Plane.Ground,
                new[] { 0.03f, 0.08f, 0.14f, 0.2f, 0.27f, 0.34f, 0.41f, 0.47f }, "Ground");
            Build("RNG_Air_01", mShock, 0.3f, 3.5f, new Vector3(0f, 1.1f, 0f), Plane.Camera,
                new[] { 0.03f, 0.06f, 0.1f, 0.14f, 0.18f, 0.23f, 0.27f, 0.32f }, "Air");
            Build("RNG_Dir_01", mThick, 0.25f, 2.5f, new Vector3(0f, 1.1f, 0f), Plane.FacingHit,
                new[] { 0.01f, 0.03f, 0.06f, 0.09f, 0.12f, 0.16f, 0.2f, 0.25f }, "Dir");
            AssetDatabase.SaveAssets();
            Debug.Log("[Ring] components built OK");
        }

        enum Plane { Ground, Camera, FacingHit }
        const float DirYaw = 50f;   // 90 = exactly perpendicular to the hit (edge-on from the 3/4 camera)

        static void Build(string id, Material mat, float life, float size, Vector3 previewPos, Plane plane, float[] times, string ctx)
        {
            var root = new GameObject("CMP_" + id).transform;
            var ring = Particle(root, "Ring", mat, life, size, Mid);
            var m = ring.main;
            m.startDelay = plane == Plane.FacingHit ? 0f : 0.02f;
            m.duration = life + 0.1f;
            m.startRotation = new ParticleSystem.MinMaxCurve(0f, TwoPi);
            Burst(ring, 1); m.maxParticles = 2;
            SizeOverLifetime(ring, 0f, 0.9f, 1f, 1f);           // the sheet does the growth
            AlphaOverLifetime(ring, 0f, 1f, 0.75f, 1f, 1f, 0f);
            SheetSequence(ring, 4, 2);
            Common(ring, plane == Plane.Ground ? -3 : 2);   // a ring lying on the ground stays under the smoke

            if (plane == Plane.Ground) GroundFlat(ring, 0.03f);
            else if (plane == Plane.FacingHit)
            {
                // hit direction +X, ring pushed 0.3 m forward. A ring exactly perpendicular to a sideways hit is seen edge-on
                // by the game camera (reads as a vertical line), so the plane is turned to DirYaw (instead of 90) so it opens toward the camera.
                ring.transform.localPosition = new Vector3(0.3f, 0f, 0f);
                ring.transform.localRotation = Quaternion.Euler(0f, DirYaw, 0f);
                ring.GetComponent<ParticleSystemRenderer>().alignment = ParticleSystemRenderSpace.Local;
            }

            Save(root.gameObject, Root, DocsRoot, id, previewPos, times,
                Load("Impact/Prefabs/CMP_IMP_Hit_" + ctx + "_01"), Load("Glow/Prefabs/CMP_GLW_" + ctx + "_01"));
        }

        static GameObject Load(string rel) => AssetDatabase.LoadAssetAtPath<GameObject>("Assets/VFX/_Components/" + rel + ".prefab");

        public static void BuildBatch() => RunBatch(Build);
    }
}
#endif
