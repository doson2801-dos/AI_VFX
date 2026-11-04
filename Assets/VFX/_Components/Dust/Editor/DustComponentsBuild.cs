#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;
using VfxKit;
using static VfxKit.VfxBuildKit;
using static VfxEffects.ComponentKit;

namespace VfxEffects
{
    // Component 05 - Dust. Spec: Docs/VFX/_ArtDirection/components/05_Dust.md
    // Style A Toon puff (art lead 2026-11-02): 4x4 sequence that grows and erodes by itself
    // (T_DST_ToonPuff_4x4 = neutral copy of SmokeStylized's baked sheet, made by components/scripts/dust_sheet.py).
    // The only Alpha layer of the impact set: sorting -1, under every Add layer.
    public static class DustComponentsBuild
    {
        const string Root = "Assets/VFX/_Components/Dust";
        const string DocsRoot = "Docs/VFX/_Components/Dust";

        enum Ctx { Air, Dir, Ground }
        // Colour test (art lead 2026-11-02: "đổi màu phần khói xem có thể làm lửa từ khói không"):
        // same shape + motion, only Start Color / Color over Lifetime change. Fire = Core -> Mid -> Outer;
        // FireSmoke = fire that cools into smoke (pixelfx fireball idea).
        enum Look { Dust, Fire, FireSmoke }
        static readonly Color SmokeDark = new Color(0.29f, 0.25f, 0.23f);   // #4A403A cooled soot between fire and dust
        static Material glowMat;

        // Fire looks only: an Additive copy of the layer (same random seed and modules -> every puff matches its alpha twin)
        // that glows Core -> Mid -> Outer while hot and dies as the fire cools (art lead 2026-11-02: "thêm lớp phát sáng").
        static void AddGlow(ParticleSystem src, Look look)
        {
            if (look == Look.Dust) return;
            var go = Object.Instantiate(src.gameObject, src.transform.parent);
            go.name = src.name + "_Glow";
            var ps = go.GetComponent<ParticleSystem>();
            ps.useAutoRandomSeed = false;
            ps.randomSeed = src.randomSeed;
            go.GetComponent<ParticleSystemRenderer>().sharedMaterial = glowMat;
            bool smoke = look == Look.FireSmoke;
            var alpha = smoke
                ? new[] { new GradientAlphaKey(0.55f, 0f), new GradientAlphaKey(0.45f, 0.15f), new GradientAlphaKey(0f, 0.32f) }
                : new[] { new GradientAlphaKey(0.55f, 0f), new GradientAlphaKey(0.4f, 0.45f), new GradientAlphaKey(0f, 0.85f) };
            var cols = smoke
                ? new[] { new GradientColorKey(Core, 0f), new GradientColorKey(Mid, 0.12f), new GradientColorKey(Outer, 0.28f) }
                : new[] { new GradientColorKey(Core, 0f), new GradientColorKey(Mid, 0.3f), new GradientColorKey(Outer, 0.7f) };
            var g = new Gradient();
            g.SetKeys(cols, alpha);
            var col = ps.colorOverLifetime;
            col.enabled = true;
            col.color = new ParticleSystem.MinMaxGradient(g);
            Common(ps, -1);                                   // above the alpha puffs (-2), under Glow/Ring/Impact
        }

        [MenuItem("VFX/Components/Dust - Build")]
        public static void Build()
        {
            if (!ConfirmSceneSwitch()) return;
            EnsureFolders(Root, "Materials", "Prefabs", "Scenes");
            var mat = Material(Root + "/Materials/M_DST_ToonPuff_Alpha.mat", VfxBlend.Alpha, ImportTexture(Root + "/Textures/T_DST_ToonPuff_4x4.png", 1024));
            glowMat = Material(Root + "/Materials/M_DST_ToonPuff_Add.mat", VfxBlend.Additive, mat.mainTexture);

            var times = new[] { 0.05f, 0.12f, 0.22f, 0.35f, 0.5f, 0.7f, 0.9f, 1.15f };
            Build("DST_Ground_01", Ctx.Ground, mat, Vector3.zero, times);
            Build("DST_Air_01", Ctx.Air, mat, new Vector3(0f, 1.1f, 0f), times);
            Build("DST_Dir_01", Ctx.Dir, mat, new Vector3(0f, 1.1f, 0f), times);
            Build("DST_Fire_Ground_01", Ctx.Ground, mat, Vector3.zero, times, Look.Fire);
            Build("DST_FireSmoke_Ground_01", Ctx.Ground, mat, Vector3.zero, times, Look.FireSmoke);
            AssetDatabase.SaveAssets();
            Debug.Log("[Dust] components built OK");
        }

        static void Build(string id, Ctx ctx, Material mat, Vector3 previewPos, float[] times, Look look = Look.Dust)
        {
            var root = new GameObject("CMP_" + id).transform;
            var startCol = look == Look.Dust ? Dust : Color.white;      // fire looks: colour comes from the gradient
            var d = Particle(root, "Puffs", mat, 1.2f, 1.5f, startCol);
            var m = d.main;
            m.duration = 1.2f;
            m.startDelay = ctx == Ctx.Dir ? 0.02f : 0.03f;
            m.startLifetime = ctx == Ctx.Ground ? new ParticleSystem.MinMaxCurve(0.8f, 1.2f)
                            : ctx == Ctx.Air ? new ParticleSystem.MinMaxCurve(0.8f, 1.1f) : new ParticleSystem.MinMaxCurve(0.7f, 1.0f);
            m.startSpeed = ctx == Ctx.Air ? new ParticleSystem.MinMaxCurve(1.2f, 2.5f) : new ParticleSystem.MinMaxCurve(2.5f, 4.5f);
            m.startSize = ctx == Ctx.Ground ? new ParticleSystem.MinMaxCurve(1.2f, 1.8f)
                        : ctx == Ctx.Air ? new ParticleSystem.MinMaxCurve(1.0f, 1.6f) : new ParticleSystem.MinMaxCurve(1.0f, 1.5f);
            m.startRotation = new ParticleSystem.MinMaxCurve(0f, TwoPi);
            m.simulationSpace = ParticleSystemSimulationSpace.World;

            // 2 bursts so the puffs do not all pop on the same frame
            int a = ctx == Ctx.Ground ? 8 : 6, b = ctx == Ctx.Ground ? 4 : 3;
            var em = d.emission;
            em.SetBursts(new[] { new ParticleSystem.Burst(0f, (short)a), new ParticleSystem.Burst(0.06f, (short)b) });
            m.maxParticles = a + b;

            var sh = d.shape;
            sh.enabled = true;
            if (ctx == Ctx.Ground)
            {
                // flat circle on the ground, puffs pushed out radially = rolling dust ring
                sh.shapeType = ParticleSystemShapeType.Circle; sh.radius = 0.15f; sh.radiusThickness = 0f;
                sh.rotation = new Vector3(90f, 0f, 0f);
                sh.position = new Vector3(0f, 0.15f, 0f);
            }
            else if (ctx == Ctx.Air) { sh.shapeType = ParticleSystemShapeType.Sphere; sh.radius = 0.2f; }
            else
            {
                sh.shapeType = ParticleSystemShapeType.Cone; sh.angle = 35f; sh.radius = 0.1f;
                sh.rotation = new Vector3(0f, 90f, 0f);     // cone axis +Z -> +X (hit direction)
            }

            var lv = d.limitVelocityOverLifetime;           // shoot out fast, then nearly stop
            lv.enabled = true; lv.limit = 100f; lv.dampen = 0f; lv.drag = 3f;
            lv.multiplyDragByParticleSize = false; lv.multiplyDragByParticleVelocity = false;

            var vol = d.velocityOverLifetime;               // slow rise
            vol.enabled = true; vol.space = ParticleSystemSimulationSpace.World;
            vol.x = new ParticleSystem.MinMaxCurve(0f);
            vol.y = new ParticleSystem.MinMaxCurve(ctx == Ctx.Dir ? 0.3f : ctx == Ctx.Air ? 0.4f : 0.35f);
            vol.z = new ParticleSystem.MinMaxCurve(0f);

            var rol = d.rotationOverLifetime;               // gentle roll
            rol.enabled = true;
            rol.z = new ParticleSystem.MinMaxCurve(-20f * Mathf.Deg2Rad, 20f * Mathf.Deg2Rad);

            SizeOverLifetime(d, 0f, 0.9f, 1f, 1.05f);        // the sheet does the growth
            SheetFromFrame4(d);
            FadeOut(d, look);
            Common(d, -2);
            AddGlow(d, look);

            // Ground: 2 slow core puffs at the centre so the first frames read as ONE mass that then opens into a ring
            // (art lead 2026-11-02: puffs must not look separated at the start)
            if (ctx == Ctx.Ground)
            {
                var c = Particle(root, "Core", mat, 1.1f, 1.8f, startCol);
                var cm = c.main;
                cm.duration = 1.2f;
                cm.startDelay = 0.03f;
                cm.startLifetime = new ParticleSystem.MinMaxCurve(0.9f, 1.1f);
                cm.startSpeed = new ParticleSystem.MinMaxCurve(0.3f, 0.8f);
                cm.startSize = new ParticleSystem.MinMaxCurve(1.6f, 2.0f);
                cm.startRotation = new ParticleSystem.MinMaxCurve(0f, TwoPi);
                cm.simulationSpace = ParticleSystemSimulationSpace.World;
                Burst(c, 2);
                var cs = c.shape; cs.enabled = true;
                cs.shapeType = ParticleSystemShapeType.Hemisphere; cs.radius = 0.1f;
                cs.rotation = new Vector3(-90f, 0f, 0f); cs.position = new Vector3(0f, 0.2f, 0f);
                var cv = c.velocityOverLifetime; cv.enabled = true; cv.space = ParticleSystemSimulationSpace.World;
                cv.x = new ParticleSystem.MinMaxCurve(0f); cv.y = new ParticleSystem.MinMaxCurve(0.35f); cv.z = new ParticleSystem.MinMaxCurve(0f);
                var cr = c.rotationOverLifetime; cr.enabled = true;
                cr.z = new ParticleSystem.MinMaxCurve(-20f * Mathf.Deg2Rad, 20f * Mathf.Deg2Rad);
                SizeOverLifetime(c, 0f, 0.9f, 1f, 1.05f);
                SheetFromFrame4(c);
                FadeOut(c, look);
                Common(c, -2);
                AddGlow(c, look);
            }

            Save(root.gameObject, Root, DocsRoot, id, previewPos, times,
                Load("Impact/Prefabs/CMP_IMP_Hit_" + ctx + "_01"), Load("Glow/Prefabs/CMP_GLW_" + ctx + "_01"),
                Load("Ring/Prefabs/CMP_RNG_" + ctx + "_01"), Load("Sparks/Prefabs/CMP_SPK_" + ctx + "_01"));
        }

        // The source sheet's first frames are tiny (frame 0 fills ~16 % of the cell), which made the first frames read as
        // separate small balls. Start at frame 4 (~65 % of the cell) so neighbouring puffs overlap from the start.
        // Color over Lifetime: opacity holds, then falls to 0 (art lead 2026-11-02: "giảm opacity dần về 0").
        // Runs together with the sheet's own erosion, so the puffs thin out instead of only getting holes.
        static void FadeOut(ParticleSystem ps, Look look)
        {
            var alpha = new[] { new GradientAlphaKey(1f, 0f), new GradientAlphaKey(1f, 0.45f), new GradientAlphaKey(0.45f, 0.8f), new GradientAlphaKey(0f, 1f) };
            GradientColorKey[] cols;
            if (look == Look.Fire)            // stays fire: hot core -> mid -> outer red
                cols = new[] { new GradientColorKey(Core, 0f), new GradientColorKey(Mid, 0.25f), new GradientColorKey(Outer, 0.6f) };
            else if (look == Look.FireSmoke)  // fire cools into smoke
                cols = new[] { new GradientColorKey(Core, 0f), new GradientColorKey(Mid, 0.12f), new GradientColorKey(Outer, 0.28f),
                               new GradientColorKey(SmokeDark, 0.45f), new GradientColorKey(Dust, 0.7f) };
            else
                cols = new[] { new GradientColorKey(Color.white, 0f) };
            var g = new Gradient();
            g.SetKeys(cols, alpha);
            var col = ps.colorOverLifetime;
            col.enabled = true;
            col.color = new ParticleSystem.MinMaxGradient(g);
        }

        static void SheetFromFrame4(ParticleSystem ps)
        {
            SheetSequence(ps, 4, 4);
            var t = ps.textureSheetAnimation;
            t.frameOverTime = LinearFrames(0.25f, 0.999f);
        }

        static GameObject Load(string rel) => AssetDatabase.LoadAssetAtPath<GameObject>("Assets/VFX/_Components/" + rel + ".prefab");

        public static void BuildBatch() => RunBatch(Build);
    }
}
#endif
