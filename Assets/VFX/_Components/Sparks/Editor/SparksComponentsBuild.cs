#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;
using VfxKit;
using static VfxKit.VfxBuildKit;
using static VfxEffects.ComponentKit;

namespace VfxEffects
{
    // Component 04 - Sparks. Spec: Docs/VFX/_ArtDirection/components/04_Sparks.md
    // Style A Streak + Ember add-on layer (art lead 2026-11-02).
    // Streaks: Stretched Billboard, horizontal texture with the bright head on the LEFT (= travel direction, verified 2026-10-31).
    // Textures: Docs/VFX/_ArtDirection/components/scripts/spark_sheet.py (RGB white, shape in alpha).
    public static class SparksComponentsBuild
    {
        const string Root = "Assets/VFX/_Components/Sparks";
        const string DocsRoot = "Docs/VFX/_Components/Sparks";

        enum Ctx { Air, Dir, Ground }

        [MenuItem("VFX/Components/Sparks - Build")]
        public static void Build()
        {
            if (!ConfirmSceneSwitch()) return;
            EnsureFolders(Root, "Materials", "Prefabs", "Scenes");
            string T = Root + "/Textures/";
            var mStreak = Material(Root + "/Materials/M_SPK_Streak_Add.mat", VfxBlend.Additive, ImportTexture(T + "T_SPK_Streak.png", 256));
            var mEmber = Material(Root + "/Materials/M_SPK_Ember_Add.mat", VfxBlend.Additive, ImportTexture(T + "T_SPK_Ember.png", 64));
            ImportTexture(T + "T_SPK_Toon.png", 256);   // style B, kept in the library

            var times = new[] { 0.02f, 0.05f, 0.1f, 0.16f, 0.25f, 0.36f, 0.5f, 0.75f };
            Build("SPK_Air_01", Ctx.Air, mStreak, mEmber, new Vector3(0f, 1.1f, 0f), times);
            Build("SPK_Dir_01", Ctx.Dir, mStreak, mEmber, new Vector3(0f, 1.1f, 0f), times);
            Build("SPK_Ground_01", Ctx.Ground, mStreak, mEmber, Vector3.zero, times);
            AssetDatabase.SaveAssets();
            Debug.Log("[Sparks] components built OK");
        }

        static void Build(string id, Ctx ctx, Material mStreak, Material mEmber, Vector3 previewPos, float[] times)
        {
            var root = new GameObject("CMP_" + id).transform;

            // ---- Streaks
            int min = ctx == Ctx.Air ? 18 : ctx == Ctx.Dir ? 14 : 16;
            int max = min + 8;
            var s = Particle(root, "Streaks", mStreak, 0.6f, 0.13f, Color.white);
            var m = s.main;
            m.duration = 0.6f;
            m.startLifetime = ctx == Ctx.Dir ? new ParticleSystem.MinMaxCurve(0.3f, 0.5f)
                            : ctx == Ctx.Air ? new ParticleSystem.MinMaxCurve(0.35f, 0.6f) : new ParticleSystem.MinMaxCurve(0.4f, 0.6f);
            m.startSpeed = ctx == Ctx.Dir ? new ParticleSystem.MinMaxCurve(6f, 13f) : new ParticleSystem.MinMaxCurve(3f, 9f);
            // Size spread (art lead 2026-11-02: "size random chưa đủ rõ"): mostly thin sparks + a few big accents.
            // Start Size stays small; Size by Speed makes the fastest sparks up to 1.6x thicker, so big = fast = longest.
            m.startSize = new ParticleSystem.MinMaxCurve(0.05f, 0.13f);
            var sbs = s.sizeBySpeed;
            sbs.enabled = true;
            sbs.range = new Vector2(3f, ctx == Ctx.Dir ? 13f : 9f);
            sbs.size = Curve(0f, 0.7f, 0.6f, 1f, 1f, 1.6f);
            m.gravityModifier = ctx == Ctx.Ground ? 1.2f : ctx == Ctx.Dir ? 0.15f : 0.1f;
            m.simulationSpace = ParticleSystemSimulationSpace.World;   // sparks do not follow the hit target
            Bursts(s, min, max);
            Emit(s, ctx);
            Drag(s, 1.6f);
            SizeOverLifetime(s, 0f, 1f, 1f, 0f);                                   // end: shrink
            ColorOverLifetime(s, new[] { Core, Mid, Outer }, 0f, 1f, 0.6f, 1f, 1f, 0f);
            var r = s.GetComponent<ParticleSystemRenderer>();
            r.renderMode = ParticleSystemRenderMode.Stretch;
            r.lengthScale = 2f;                 // texture is 4:1; base length = 2 x width, the rest comes from speed
            r.velocityScale = 0.045f;           // long while fast, shorter as drag slows it
            r.cameraVelocityScale = 0f;
            // Pivot Y = 1 shifts the quad forward by one length: the TAIL sits on the particle and the head reaches ahead.
            // With pivot 0 the particle is the head and the tail (0.5-0.8 m at launch speed) poked back through the hit point.
            r.pivot = new Vector3(0f, 1f, 0f);
            Common(s, 3);

            // ---- Ember add-on: slow round embers that drift and outlive the streaks
            var e = Particle(root, "Ember", mEmber, 1.2f, 0.22f, Color.white);
            var em = e.main;
            em.duration = 0.6f;
            em.startLifetime = new ParticleSystem.MinMaxCurve(0.6f, 1.2f);
            em.startSpeed = ctx == Ctx.Dir ? new ParticleSystem.MinMaxCurve(4f, 7f) : new ParticleSystem.MinMaxCurve(2.4f, 4.8f);
            em.startSize = new ParticleSystem.MinMaxCurve(0.08f, 0.3f);
            em.gravityModifier = ctx == Ctx.Ground ? 0.2f : 0f;
            em.simulationSpace = ParticleSystemSimulationSpace.World;
            Bursts(e, 6, 8);
            Emit(e, ctx);
            Drag(e, 2.5f);
            var n = e.noise;
            n.enabled = true; n.strength = 0.5f; n.frequency = 1.5f; n.quality = ParticleSystemNoiseQuality.Low;
            SizeOverLifetime(e, 0f, 1f, 0.6f, 0.8f, 1f, 0f);
            ColorOverLifetime(e, new[] { Core, Mid, Outer }, 0f, 1f, 0.5f, 1f, 1f, 0f);
            Common(e, 3);

            Save(root.gameObject, Root, DocsRoot, id, previewPos, times,
                Load("Impact/Prefabs/CMP_IMP_Hit_" + ctx + "_01"), Load("Glow/Prefabs/CMP_GLW_" + ctx + "_01"), Load("Ring/Prefabs/CMP_RNG_" + ctx + "_01"));
        }

        static void Bursts(ParticleSystem ps, int min, int max)
        {
            var em = ps.emission;
            em.SetBursts(new[] { new ParticleSystem.Burst(0f, (short)min, (short)max) });
            var m = ps.main; m.maxParticles = max;
        }

        // Air: sphere. Dir: narrow cone along the hit (+X in the preview). Ground: wide cone pointing up.
        static void Emit(ParticleSystem ps, Ctx ctx)
        {
            var sh = ps.shape;
            sh.enabled = true;
            if (ctx == Ctx.Air) { sh.shapeType = ParticleSystemShapeType.Sphere; sh.radius = 0.1f; }
            else if (ctx == Ctx.Dir)
            {
                sh.shapeType = ParticleSystemShapeType.Cone; sh.angle = 28f; sh.radius = 0.05f;
                sh.rotation = new Vector3(0f, 90f, 0f);    // cone axis +Z -> +X (hit direction)
            }
            else
            {
                sh.shapeType = ParticleSystemShapeType.Cone; sh.angle = 70f; sh.radius = 0.2f;
                sh.rotation = new Vector3(-90f, 0f, 0f);   // cone axis +Z -> +Y
                sh.position = new Vector3(0f, 0.05f, 0f);
            }
        }

        static void Drag(ParticleSystem ps, float drag)
        {
            var lv = ps.limitVelocityOverLifetime;
            lv.enabled = true;
            lv.limit = 100f;            // no speed cap, drag only
            lv.dampen = 0f;
            lv.drag = drag;
            lv.multiplyDragByParticleSize = false;
            lv.multiplyDragByParticleVelocity = false;
        }

        static GameObject Load(string rel) => AssetDatabase.LoadAssetAtPath<GameObject>("Assets/VFX/_Components/" + rel + ".prefab");

        public static void BuildBatch() => RunBatch(Build);
    }
}
#endif
