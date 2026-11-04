#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;
using VfxKit;
using static VfxKit.VfxBuildKit;
using static VfxEffects.ComponentKit;

namespace VfxEffects
{
    // Zelda TOTK-style bomb explosion, shader-only (variant B). Every layer is a particle carrier, Custom1.x = progress, Custom1.y = seed.
    // Layers: Blast (flash + eroding fireball) / Ring / Smoke / Sparks / Dust / Scorch. Ground layers use Billboard + Local alignment (never Horizontal Billboard).
    // Rebuilt from this script: edit here, not in the Inspector.
    public static class BombBlastShaderBuild
    {
        const string Effect = "BombBlast_Shader";
        const string Root = "Assets/VFX/" + Effect;
        const string NoiseTex = "Assets/VFX/_Shared/Textures/Noise/T_Noise_Smooth.png";

        static Color Hdr(float r, float g, float b, float k) => new Color(r, g, b) * k;

        [MenuItem("VFX/BombBlast_Shader/Build")]
        public static void Build()
        {
            if (!ConfirmSceneSwitch()) return;
            EnsureFolders(Root, "Materials", "Prefabs", "Scenes");
            var noise = MeteorBuild.ImportNoise(NoiseTex);
            string M(string layer, string blend) => Root + "/Materials/M_" + Effect + "_" + layer + "_" + blend + ".mat";
            void UseParticle(Material m) { m.SetTexture("_NoiseTex", noise); m.EnableKeyword("_USE_PARTICLE_DATA"); m.SetFloat("_UseParticle", 1); }

            // palette: yellow core -> orange -> red -> purple edge
            var fireOuter = Hdr(0.32f, 0.03f, 0.12f, 1.1f);
            var fireMid = Hdr(1f, 0.3f, 0.04f, 2f);
            var fireCore = Hdr(1f, 0.78f, 0.3f, 2f);

            var matBlast = Material(M("Blast", "Add"), VfxBlend.Additive, null, "VFX/FX/Blast");
            UseParticle(matBlast);
            matBlast.EnableKeyword("_NO_RING"); matBlast.SetFloat("_NoRing", 1);
            matBlast.SetFloat("_Erosion", 0.4f); matBlast.SetFloat("_Band1", 0.28f); matBlast.SetFloat("_Band2", 0.82f);
            matBlast.SetColor("_ColorOuter", fireOuter); matBlast.SetColor("_ColorMid", fireMid); matBlast.SetColor("_ColorCore", fireCore);

            var matRing = Material(M("Ring", "Add"), VfxBlend.Additive, null, "VFX/FX/Blast");
            UseParticle(matRing);
            matRing.EnableKeyword("_RING_ONLY"); matRing.SetFloat("_RingOnly", 1);
            matRing.SetFloat("_RingRadius", 0.95f); matRing.SetFloat("_RingWidth", 0.07f);
            matRing.SetColor("_ColorOuter", Hdr(0.9f, 0.3f, 0.2f, 3f)); matRing.SetColor("_ColorMid", Hdr(1f, 0.6f, 0.15f, 3.5f)); matRing.SetColor("_ColorCore", Hdr(1f, 0.95f, 0.7f, 4f));
            matRing.SetFloat("_Band1", 0.2f);

            var matSmoke = Material(M("Smoke", "Alpha"), VfxBlend.Alpha, null, "VFX/FX/Smoke");
            UseParticle(matSmoke);
            matSmoke.SetColor("_ColorLight", new Color(0.66f, 0.58f, 0.62f));
            matSmoke.SetColor("_ColorDark", new Color(0.26f, 0.2f, 0.26f));

            var matDust = Material(M("Dust", "Alpha"), VfxBlend.Alpha, null, "VFX/FX/Smoke");
            UseParticle(matDust);
            matDust.SetColor("_ColorLight", new Color(0.8f, 0.73f, 0.65f));
            matDust.SetColor("_ColorDark", new Color(0.45f, 0.38f, 0.36f));
            matDust.SetFloat("_Opacity", 0.9f);

            var matScorch = Material(M("Scorch", "Alpha"), VfxBlend.Alpha, null, "VFX/FX/Smoke");
            UseParticle(matScorch);
            matScorch.SetColor("_ColorLight", new Color(0.45f, 0.14f, 0.04f));
            matScorch.SetColor("_ColorDark", new Color(0.03f, 0.02f, 0.02f));
            matScorch.SetFloat("_Erosion", 0.4f); matScorch.SetFloat("_Grow", 0.35f); matScorch.SetFloat("_Opacity", 0.95f);
            matScorch.SetVector("_LightDir", new Vector4(0f, 0f, 0f, 0f));

            var matSpark = Material(M("Spark", "Add"), VfxBlend.Additive, null, "VFX/FX/Spark");
            matSpark.EnableKeyword("_USE_PARTICLE_DATA"); matSpark.SetFloat("_UseParticle", 1);
            matSpark.SetColor("_ColorTail", Hdr(1f, 0.3f, 0.04f, 2f)); matSpark.SetColor("_ColorHead", Hdr(1f, 0.9f, 0.55f, 3f));

            var root = new GameObject("VFX_" + Effect);
            var lin = Curve(0f, 0f, 1f, 1f);

            // L1 flash + eroding fireball (upright)
            var l1 = Particle(root.transform, "L1_Blast", matBlast, lifetime: 0.9f, size: 6.5f);
            l1.transform.localPosition = new Vector3(0f, 1.4f, 0f);
            MeteorBuild.FxProgress(l1, lin);
            Common(l1, 0);

            // L2 shockwave ring (on the ground)
            var l2 = Particle(root.transform, "L2_Ring", matRing, lifetime: 0.55f, size: 7f);
            GroundFlat(l2, 0.03f);
            MeteorBuild.FxProgress(l2, lin);
            Common(l2, -3);

            // L3 smoke puffs rising (after the fireball peaks, so they do not cover the flash)
            var l3 = Particle(root.transform, "L3_Smoke", matSmoke, lifetime: 0.9f, size: 2.4f);
            l3.transform.localPosition = new Vector3(0f, 0.8f, 0f);
            Burst(l3, 4);
            var m3 = l3.main;
            m3.startDelay = 0.25f;
            m3.startSize = new ParticleSystem.MinMaxCurve(2f, 3f);
            m3.startRotation = new ParticleSystem.MinMaxCurve(0f, 6.28f);
            var s3 = l3.shape; s3.enabled = true; s3.shapeType = ParticleSystemShapeType.Sphere; s3.radius = 0.9f;
            var v3 = l3.velocityOverLifetime; v3.enabled = true; v3.space = ParticleSystemSimulationSpace.Local;
            v3.x = 0f; v3.y = new ParticleSystem.MinMaxCurve(1.2f, 2f); v3.z = 0f;
            MeteorBuild.FxProgress(l3, lin);
            Common(l3, -2);

            // L4 sparks (stretched billboards flying out)
            var l4 = Particle(root.transform, "L4_Sparks", matSpark, lifetime: 0.6f, size: 0.14f);
            l4.transform.localPosition = new Vector3(0f, 0.5f, 0f);
            Burst(l4, 18);
            var m4 = l4.main;
            m4.startLifetime = new ParticleSystem.MinMaxCurve(0.4f, 0.8f);
            m4.startSpeed = new ParticleSystem.MinMaxCurve(4f, 10f);
            m4.startSize = new ParticleSystem.MinMaxCurve(0.1f, 0.2f);
            m4.gravityModifier = 1.2f;
            var s4 = l4.shape; s4.enabled = true; s4.shapeType = ParticleSystemShapeType.Hemisphere; s4.radius = 0.2f;
            s4.rotation = new Vector3(-90f, 0f, 0f);
            var r4 = l4.GetComponent<ParticleSystemRenderer>();
            r4.renderMode = ParticleSystemRenderMode.Stretch; r4.velocityScale = 0.05f; r4.lengthScale = 2.5f;
            MeteorBuild.FxProgress(l4, lin);
            Common(l4, 3);

            // L5 dust ring on the ground
            var l5 = Particle(root.transform, "L5_Dust", matDust, lifetime: 1.0f, size: 3.2f);
            GroundFlat(l5, 0.02f);
            Burst(l5, 5);
            var m5 = l5.main;
            m5.startDelay = 0.05f;
            m5.startSize = new ParticleSystem.MinMaxCurve(2.4f, 3.6f);
            m5.startRotation = new ParticleSystem.MinMaxCurve(0f, 6.28f);
            var s5 = l5.shape; s5.enabled = true; s5.shapeType = ParticleSystemShapeType.Circle; s5.radius = 1.4f;
            MeteorBuild.FxProgress(l5, lin);
            Common(l5, -5);

            // L6 scorch mark (on the ground)
            var l6 = Particle(root.transform, "L6_Scorch", matScorch, lifetime: 1.4f, size: 3.4f);
            GroundFlat(l6, 0.01f);
            var m6 = l6.main; m6.startDelay = 0.1f;
            MeteorBuild.FxProgress(l6, lin);
            Common(l6, -7);

            var prefab = SavePrefab(root, Root + "/Prefabs/VFX_" + Effect + ".prefab");
            Finish(prefab, Root, Effect, new[] { 0.05f, 0.2f, 0.4f, 0.6f, 0.8f, 1.0f, 1.2f, 1.45f },
                new Vector3(0f, 5.4f, -6.8f), new Vector3(0f, 1.0f, 0f));
        }

        public static void BuildBatch() => RunBatch(Build);
    }
}
#endif
