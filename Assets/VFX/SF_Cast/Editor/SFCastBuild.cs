#if UNITY_EDITOR
using System;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using VfxKit;

namespace SFCast
{
    // Slot Five cast VFX (Docs/VFX/SF_Cast/Plan.md, brief 4.12): projectiles + hits for volt, blade, heal, shield,
    // shield block and chain flash. Built in metres on the screen plane XY (camera looks down +Z), 48 px = 2 m;
    // the game parents them under a 24 px/m group in front of its Screen Space Camera canvas.
    // Projectiles fly along local +X (the game rotates the root about Z) and loop until the game destroys them.
    public static class SFCastBuild
    {
        const string Root = "Assets/VFX/SF_Cast";
        const string Lib = "Assets/Library/";
        const string Coloso = "VFXLib/ColosoShaderAdditive_Optimized";
        const string SlashMesh = "Assets/VFX/_Imported/Mesh/SM_VFX_Slash_Thin_180.fbx";

        static readonly Vector3 Cam = new Vector3(0f, 0f, -8f);
        static readonly Vector3 Look = Vector3.zero;
        // Projectile preview: flies left to right across the frame in 0.35 s.
        static readonly Func<float, Vector3> Fly = t => new Vector3(-3f + 17f * t, 0f, 0f);
        static readonly float[] ProjTimes = { 0.05f, 0.12f, 0.19f, 0.26f, 0.33f };
        static readonly float[] HitTimes = { 0.02f, 0.06f, 0.1f, 0.15f, 0.2f, 0.24f };
        static readonly float[] FlashTimes = { 0.03f, 0.1f, 0.18f, 0.26f, 0.34f, 0.44f };

        static readonly Color Volt = new Color(1f, 0.9f, 0.4f);
        static readonly Color Steel = new Color(0.9f, 0.95f, 1f);
        static readonly Color Heal = new Color(0.4f, 1f, 0.5f);
        static readonly Color Shield = new Color(0.4f, 0.68f, 1f);

        [MenuItem("VFX/SF_Cast/Build All")]
        public static void BuildAll()
        {
            if (!VfxBuildKit.ConfirmSceneSwitch()) return;
            VfxBuildKit.StrictRules = true;
            VfxBuildKit.EnsureFolders(Root, "Materials", "Prefabs", "Scenes", "Textures");
            ProjVolt(); HitVolt();
            ProjBlade(); HitBlade();
            ProjHeal(); HitHeal();
            ProjShield(); HitShield();
            Block(); ChainFlash();
            VoltLink();
            // Art lead hand-edits VFX_SF_MatchPop since 2026-11-27 (added Impact, swapped Burst / Chips materials):
            // never overwrite it from code. Delete the prefab to rebuild the original from this script.
            if (AssetDatabase.LoadAssetAtPath<GameObject>(Root + "/Prefabs/VFX_SF_MatchPop.prefab") == null) MatchPop();
            else Debug.Log("[SF_Cast] VFX_SF_MatchPop kept (hand-edited by the art lead); not rebuilt");
            AssetDatabase.SaveAssets();
            Debug.Log("[SF_Cast] all 12 prefabs built OK");
        }

        public static void BuildBatch() => VfxBuildKit.RunBatch(BuildAll);

        // ------------------------------------------------------------ volt

        static void ProjVolt()
        {
            var root = new GameObject("VFX_SF_ProjVolt");
            var core = Layer(root, Mat("ProjVolt_Core", VfxBlend.Additive, Lib + "glow/soft_round/glow_soft_round_005.png"), 0.12f, 1.6f, Volt, 22);
            Loop(core, 30, 5);
            VfxBuildKit.SizeOverLifetime(core, 0f, 1f, 1f, 0.8f);
            VfxBuildKit.AlphaOverLifetime(core, 0f, 1f, 1f, 0.5f);

            var arcs = Child(root, "Arcs", Mat("ProjVolt_Arcs", VfxBlend.Additive, Lib + "lightning/arc_sheet/lightning_arc_sheet_006.png"), 0.07f, 1.8f, new Color(Volt.r, Volt.g, Volt.b, 0.85f), 23);
            Loop(arcs, 34, 4);
            Sheet(arcs, 4, 4);

            var sparks = Child(root, "Sparks", Mat("ProjVolt_Sparks", VfxBlend.Additive, Lib + "spark/star/spark_star_002.png"), 0.15f, 0.5f, Volt, 21);
            Trail(sparks, 2f, 11);
            Finish(root, "ProjVolt", ProjTimes, Fly);
        }

        static void HitVolt()
        {
            var root = new GameObject("VFX_SF_HitVolt");
            var flash = Layer(root, Mat("HitVolt_Flash", VfxBlend.Additive, Lib + "impact/flash_spiky/impact_flash_spiky_014.png"), 0.18f, 4f, Volt, 32);
            VfxBuildKit.SizeOverLifetime(flash, 0f, 0.3f, 0.35f, 1f, 1f, 1.05f);
            VfxBuildKit.AlphaOverLifetime(flash, 0f, 1f, 0.5f, 0.8f, 1f, 0f);

            var arcs = Child(root, "Arcs", Mat("HitVolt_Arcs", VfxBlend.Additive, Lib + "lightning/arc_sheet/lightning_arc_sheet_006.png"), 0.12f, 2.6f, Color.Lerp(Volt, Color.white, 0.4f), 33);
            VfxBuildKit.Burst(arcs, 3);
            Circle(arcs, 0.6f);
            Sheet(arcs, 4, 4);
            VfxBuildKit.AlphaOverLifetime(arcs, 0f, 1f, 0.6f, 1f, 1f, 0f);

            var sparks = Child(root, "Sparks", Mat("HitVolt_Sparks", VfxBlend.Additive, Lib + "spark/star/spark_star_002.png"), 0.2f, 0.6f, Volt, 31);
            VfxBuildKit.Burst(sparks, 8);
            Circle(sparks, 0.2f);
            var main = sparks.main;
            main.startSpeed = new ParticleSystem.MinMaxCurve(5f, 8f);
            main.startSize = new ParticleSystem.MinMaxCurve(0.4f, 0.7f);
            VfxBuildKit.SizeOverLifetime(sparks, 0f, 1f, 1f, 0f);
            Finish(root, "HitVolt", HitTimes, null);
        }

        // ------------------------------------------------------------ blade

        static void ProjBlade()
        {
            var root = new GameObject("VFX_SF_ProjBlade");
            // Root: small steel glints left behind (tail); no soft halo (it read as a flat grey disc on the dark UI).
            var wake = Layer(root, Mat("ProjBlade_Wake", VfxBlend.Additive, Lib + "spark/star/spark_star_002.png"), 0.15f, 0.45f, Steel, 22);
            Trail(wake, 1.6f, 10);

            // The mesh arc lies on its XZ plane (radius 1.28, u along the arc): rotate X -90 so it lies on the screen
            // plane with its Y axis toward the camera, then spin about that Y axis.
            var bladeGo = new GameObject("Blade");
            bladeGo.transform.SetParent(root.transform, false);
            bladeGo.transform.localRotation = Quaternion.Euler(-90f, 0f, 0f);
            var blade = VfxBuildKit.ParticleOn(bladeGo, BladeMaterial(), 1f, 1f, new Color(0.55f, 0.7f, 0.95f, 0.6f));   // steel blue, below white saturation
            Loop(blade, 0, 1);
            VfxBuildKit.Burst(blade, 1);
            var main = blade.main;
            main.loop = true;
            main.duration = 1f;
            var rot = blade.rotationOverLifetime;
            rot.enabled = true;
            rot.separateAxes = true;
            rot.x = 0f;
            rot.y = 1080f * Mathf.Deg2Rad;
            rot.z = 0f;
            var r = blade.GetComponent<ParticleSystemRenderer>();
            r.renderMode = ParticleSystemRenderMode.Mesh;
            r.mesh = LoadMesh(SlashMesh);
            r.alignment = ParticleSystemRenderSpace.Local;
            r.sortingOrder = 24;
            r.SetActiveVertexStreams(new System.Collections.Generic.List<ParticleSystemVertexStream>
            {
                ParticleSystemVertexStream.Position, ParticleSystemVertexStream.Color,
                ParticleSystemVertexStream.UV, ParticleSystemVertexStream.Custom1XYZW,
            });
            var cd = blade.customData;
            cd.enabled = true;
            cd.SetMode(ParticleSystemCustomData.Custom1, ParticleSystemCustomDataMode.Vector);
            cd.SetVectorComponentCount(ParticleSystemCustomData.Custom1, 4);
            cd.SetVector(ParticleSystemCustomData.Custom1, 0, new ParticleSystem.MinMaxCurve(1f)); // fully visible
            cd.SetVector(ParticleSystemCustomData.Custom1, 1, new ParticleSystem.MinMaxCurve(0f));
            cd.SetVector(ParticleSystemCustomData.Custom1, 2, new ParticleSystem.MinMaxCurve(0f));
            cd.SetVector(ParticleSystemCustomData.Custom1, 3, new ParticleSystem.MinMaxCurve(0f));
            Finish(root, "ProjBlade", ProjTimes, Fly);
        }

        static Material BladeMaterial()
        {
            var tex = Load(Lib + "Slash/Main_tex(Uvmesh)/Slash_Main_tex_Uvmesh_019.png");
            var m = VfxBuildKit.Material(Root + "/Materials/M_SF_Cast_ProjBlade_Blade.mat", VfxBlend.Additive, tex, Coloso);
            m.SetTextureScale("_MainTex", Vector2.one);
            m.SetTextureOffset("_MainTex", Vector2.zero);
            m.SetTexture("_MaskTex", Load(Root + "/Textures/T_VFX_Gradient_01.png"));
            m.SetColor("_MainColor", new Color(1f, 1f, 1.05f, 1f));
            m.SetFloat("_OpacityStrength", 1f);
            m.SetFloat("_OpacityPower", 1f);
            m.SetFloat("_TextureIntensity", 1f);
            m.SetFloat("_CullMode", 0f);                 // flat single-face band
            m.SetFloat("_ZwriteMode", 0f);
            m.SetFloat("_FD", 0f); m.SetFloat("_CDF", 0f); m.SetFloat("_CDFOffset", 0f); m.SetFloat("_CameraOffset", 0f);
            m.SetFloat("_MainUVSwitch", 0f);
            m.SetFloat("_UseMainUVCustom1ZW", 0f);       // static blade along the arc, the particle spins
            m.SetFloat("_MainClampX", 1f); m.SetFloat("_MainClampY", 1f);
            m.SetFloat("_MainRIsAlpha", 0f);             // shape in alpha
            if (m.HasProperty("_MainRBGOffset")) { m.SetFloat("_MainRBGOffset", 0f); m.DisableKeyword("_MAINRBGOFFSET_ON"); }
            m.SetFloat("_UseManual_DebugDissolve", 0f);
            m.SetFloat("_ManualDissolve", 1f);
            m.SetFloat("_MainTexRDissolve", 0f);
            m.SetFloat("_SmoothDissolve", 7f);
            m.SetFloat("_Color90degreeUVFlip", 0f);
            m.SetFloat("_ColorIntensity", 1f);           // no ramp: colour from the particle
            m.SetFloat("_ColorPower", 1f);
            m.SetFloat("_Desaturate", 0f);
            EditorUtility.SetDirty(m);
            return m;
        }

        static void HitBlade()
        {
            var root = new GameObject("VFX_SF_HitBlade");
            var flash = Layer(root, Mat("HitBlade_Flash", VfxBlend.Additive, Lib + "glow/soft_round/glow_soft_round_013.png"), 0.1f, 2f, Color.white, 32);
            VfxBuildKit.SizeOverLifetime(flash, 0f, 0.3f, 1f, 1f);
            VfxBuildKit.AlphaOverLifetime(flash, 0f, 0.9f, 1f, 0f);

            var cut = Child(root, "Cut", Mat("HitBlade_Cut", VfxBlend.Additive, Lib + "Slash/Onhit/Slash_Onhit_015.png"), 0.2f, 1f, Steel, 33);
            var cm = cut.main;
            cm.startSize3D = true;
            cm.startSizeX = 1.05f;                    // texture is 128 x 512: keep its 1:4 aspect
            cm.startSizeY = 4.2f;
            cm.startSizeZ = 1f;
            cm.startRotation = 30f * Mathf.Deg2Rad;   // one diagonal cut, fixed on purpose
            VfxBuildKit.SizeOverLifetime(cut, 0f, 0.6f, 0.3f, 1f, 1f, 1.05f);
            VfxBuildKit.AlphaOverLifetime(cut, 0f, 1f, 0.6f, 1f, 1f, 0f);
            Finish(root, "HitBlade", HitTimes, null);
        }

        // ------------------------------------------------------------ heal

        static void ProjHeal()
        {
            var root = new GameObject("VFX_SF_ProjHeal");
            var core = Layer(root, Mat("ProjHeal_Core", VfxBlend.Additive, Lib + "glow/soft_round/glow_soft_round_013.png"), 0.12f, 1.0f, new Color(Heal.r, Heal.g, Heal.b, 0.4f), 22);
            Loop(core, 15, 2);

            var halo = Child(root, "Halo", Mat("ProjHeal_Halo", VfxBlend.Additive, Lib + "ring/thin/ring_thin_005.png"), 0.2f, 2.2f, new Color(Heal.r, Heal.g, Heal.b, 0.7f), 23);
            Loop(halo, 12, 3);
            VfxBuildKit.SizeOverLifetime(halo, 0f, 0.85f, 1f, 1.1f);
            VfxBuildKit.AlphaOverLifetime(halo, 0f, 0.8f, 1f, 0f);

            var sparkle = Child(root, "Sparkle", Mat("ProjHeal_Sparkle", VfxBlend.Additive, Lib + "spark/star/spark_star_003.png"), 0.25f, 0.45f, Color.Lerp(Heal, Color.white, 0.4f), 21);
            Trail(sparkle, 1.6f, 10);
            Finish(root, "ProjHeal", ProjTimes, Fly);
        }

        static void HitHeal()
        {
            var root = new GameObject("VFX_SF_HitHeal");
            var ring = Layer(root, Mat("HitHeal_Ring", VfxBlend.Additive, Lib + "ring/thin/ring_thin_002.png"), 0.25f, 4f, Heal, 30);
            VfxBuildKit.SizeOverLifetime(ring, 0f, 0.25f, 1f, 1f);
            VfxBuildKit.AlphaOverLifetime(ring, 0f, 1f, 1f, 0f);

            var rise = Child(root, "Rise", Mat("HitHeal_Rise", VfxBlend.Additive, Lib + "spark/star/spark_star_009.png"), 0.25f, 0.55f, Color.Lerp(Heal, Color.white, 0.3f), 32);
            VfxBuildKit.Burst(rise, 7);
            Circle(rise, 0.6f);
            var main = rise.main;
            main.startSpeed = 0f;
            main.startSize = new ParticleSystem.MinMaxCurve(0.4f, 0.7f);
            var vel = rise.velocityOverLifetime;
            vel.enabled = true;
            vel.space = ParticleSystemSimulationSpace.Local;
            vel.x = new ParticleSystem.MinMaxCurve(0f, 0f);
            vel.y = new ParticleSystem.MinMaxCurve(2f, 3.5f);
            vel.z = new ParticleSystem.MinMaxCurve(0f, 0f);
            VfxBuildKit.AlphaOverLifetime(rise, 0f, 1f, 0.7f, 1f, 1f, 0f);

            var glow = Child(root, "Glow", Mat("HitHeal_Glow", VfxBlend.Additive, Lib + "glow/soft_round/glow_soft_round_013.png"), 0.2f, 3f, new Color(Heal.r, Heal.g, Heal.b, 0.6f), 31);
            VfxBuildKit.AlphaOverLifetime(glow, 0f, 1f, 1f, 0f);
            Finish(root, "HitHeal", HitTimes, null);
        }

        // ------------------------------------------------------------ shield

        static void ProjShield()
        {
            var root = new GameObject("VFX_SF_ProjShield");
            var bubble = Layer(root, Mat("ProjShield_Bubble", VfxBlend.Additive, Lib + "ring/thin/ring_thin_010.png"), 0.2f, 2.4f, Shield, 22);
            Loop(bubble, 12, 3);
            VfxBuildKit.SizeOverLifetime(bubble, 0f, 0.9f, 1f, 1.08f);
            VfxBuildKit.AlphaOverLifetime(bubble, 0f, 1f, 1f, 0.2f);

            var core = Child(root, "Core", Mat("ProjShield_Core", VfxBlend.Additive, Lib + "glow/soft_round/glow_soft_round_005.png"), 0.12f, 1f, Color.Lerp(Shield, Color.white, 0.5f), 23);
            Loop(core, 25, 4);

            var bubbles = Child(root, "Bubbles", Mat("ProjShield_Bubbles", VfxBlend.Additive, Lib + "ring/thin/ring_thin_010.png"), 0.22f, 0.6f, new Color(Shield.r, Shield.g, Shield.b, 0.8f), 21);
            Trail(bubbles, 1.4f, 8);
            Finish(root, "ProjShield", ProjTimes, Fly);
        }

        static void HitShield()
        {
            var root = new GameObject("VFX_SF_HitShield");
            // A bubble pops up around the fighter: scale overshoots then settles, rim stays bright, sparkles on the rim.
            var bubble = Layer(root, Mat("HitShield_Bubble", VfxBlend.Additive, Lib + "shield/fill/shield_fill_001.png"), 0.25f, 3.4f, new Color(Shield.r, Shield.g, Shield.b, 0.55f), 30);
            VfxBuildKit.SizeOverLifetime(bubble, 0f, 0.5f, 0.35f, 1.12f, 0.6f, 0.98f, 1f, 1f);
            VfxBuildKit.AlphaOverLifetime(bubble, 0f, 0.6f, 0.2f, 1f, 1f, 0f);

            var rim = Child(root, "Rim", Mat("HitShield_Rim", VfxBlend.Additive, Lib + "ring/thin/ring_thin_010.png"), 0.25f, 3.6f, Color.Lerp(Shield, Color.white, 0.35f), 31);
            VfxBuildKit.SizeOverLifetime(rim, 0f, 0.5f, 0.35f, 1.12f, 0.6f, 0.98f, 1f, 1f);
            VfxBuildKit.AlphaOverLifetime(rim, 0f, 1f, 0.7f, 1f, 1f, 0f);

            var sparkle = Child(root, "Sparkle", Mat("HitShield_Sparkle", VfxBlend.Additive, Lib + "spark/star/spark_star_003.png"), 0.22f, 0.6f, Color.Lerp(Shield, Color.white, 0.5f), 32);
            VfxBuildKit.Burst(sparkle, 6, 0.04f);    // after the bubble has popped out to its rim
            Circle(sparkle, 1.8f);
            var sm = sparkle.shape;
            sm.radiusThickness = 0f;                  // on the rim only
            VfxBuildKit.SizeOverLifetime(sparkle, 0f, 0.4f, 0.3f, 1f, 1f, 0f);
            Finish(root, "HitShield", HitTimes, null);
        }

        static void Block()
        {
            var root = new GameObject("VFX_SF_Block");
            // The single impact flash: a bright shield-blue glow that peaks in the first ~40 ms, then fades.
            var face = Layer(root, Mat("Block_Face", VfxBlend.Additive, Lib + "glow/soft_round/glow_soft_round_013.png"), 0.2f, 3.4f, Color.Lerp(Shield, Color.white, 0.55f), 34);
            VfxBuildKit.SizeOverLifetime(face, 0f, 1.15f, 0.2f, 1f, 1f, 0.95f);
            VfxBuildKit.AlphaOverLifetime(face, 0f, 1f, 0.2f, 0.35f, 1f, 0f);

            var crack = Child(root, "Crack", Mat("Block_Crack", VfxBlend.Additive, Lib + "shield/crack/shield_crack_002.png"), 0.2f, 3.6f, Color.Lerp(Shield, Color.white, 0.5f), 35);
            VfxBuildKit.AlphaOverLifetime(crack, 0f, 0f, 0.15f, 0.8f, 0.6f, 0.8f, 1f, 0f);
            Finish(root, "Block", HitTimes, null);
        }

        // ------------------------------------------------------------ chain flash

        static void ChainFlash()
        {
            var root = new GameObject("VFX_SF_ChainFlash");
            // Tinted by the game per icon (main.startColor); white here.
            var glow = Layer(root, Mat("ChainFlash_Glow", VfxBlend.Additive, Lib + "glow/soft_round/glow_soft_round_013.png"), 0.45f, 4f, new Color(1f, 1f, 1f, 0.7f), 26);
            VfxBuildKit.SizeOverLifetime(glow, 0f, 0.8f, 0.3f, 1.05f, 1f, 1f);
            VfxBuildKit.AlphaOverLifetime(glow, 0f, 0f, 0.15f, 0.9f, 1f, 0f);

            // One streak sweeping diagonally (top-left to bottom-right) across the 4 m cell, rotated on purpose to that line.
            var sweep = Child(root, "Sweep", Mat("ChainFlash_Sweep", VfxBlend.Additive, Lib + "Slash/Onhit/Slash_Onhit_006.png"), 0.3f, 2.4f, Color.white, 27);
            sweep.transform.localPosition = new Vector3(-0.9f, 0.9f, 0f);
            var main = sweep.main;
            main.startRotation = 45f * Mathf.Deg2Rad;
            var vel = sweep.velocityOverLifetime;
            vel.enabled = true;
            vel.space = ParticleSystemSimulationSpace.Local;
            vel.x = new ParticleSystem.MinMaxCurve(6f, 6f);
            vel.y = new ParticleSystem.MinMaxCurve(-6f, -6f);
            vel.z = new ParticleSystem.MinMaxCurve(0f, 0f);
            VfxBuildKit.AlphaOverLifetime(sweep, 0f, 0f, 0.2f, 1f, 0.7f, 1f, 1f, 0f);
            Finish(root, "ChainFlash", FlashTimes, null);
        }

        // ------------------------------------------------------------ match pop (puzzle-style impact on a matched cell)

        // Plays on each matched cell as resolving starts. White here; the game tints every layer toward the icon colour
        // (Flash stays mostly white). The card punch and white card flash are UI code in SlotFiveGame.
        static readonly float[] PopTimes = { 0.02f, 0.06f, 0.1f, 0.16f, 0.24f, 0.34f };

        static void MatchPop()
        {
            var root = new GameObject("VFX_SF_MatchPop");
            var flash = Layer(root, Mat("MatchPop_Flash", VfxBlend.Additive, Lib + "glow/soft_round/glow_soft_round_013.png"), 0.15f, 3.6f, new Color(1f, 1f, 1f, 0.8f), 40);
            VfxBuildKit.SizeOverLifetime(flash, 0f, 0.4f, 0.35f, 1f, 1f, 1.05f);
            VfxBuildKit.AlphaOverLifetime(flash, 0f, 1f, 0.3f, 0.8f, 1f, 0f);

            var ring = Child(root, "Ring", Mat("MatchPop_Ring", VfxBlend.Additive, Lib + "ring/thin/ring_thin_002.png"), 0.25f, 5f, Color.white, 41);
            VfxBuildKit.SizeOverLifetime(ring, 0f, 0.33f, 1f, 1f);
            VfxBuildKit.AlphaOverLifetime(ring, 0f, 1f, 0.5f, 0.7f, 1f, 0f);

            // Star burst thrown outward, slowing down (speed modifier), shrinking out.
            var burst = Child(root, "Burst", Mat("MatchPop_Burst", VfxBlend.Additive, Lib + "spark/star/spark_star_009.png"), 0.35f, 0.7f, Color.white, 42);
            VfxBuildKit.Burst(burst, 10);
            Circle(burst, 0.4f);
            var bm = burst.main;
            bm.startSpeed = new ParticleSystem.MinMaxCurve(9f, 14f);
            bm.startSize = new ParticleSystem.MinMaxCurve(0.5f, 0.9f);
            bm.startLifetime = new ParticleSystem.MinMaxCurve(0.28f, 0.35f);
            var bv = burst.velocityOverLifetime;
            bv.enabled = true;
            bv.speedModifier = new ParticleSystem.MinMaxCurve(1f, VfxBuildKit.AnimCurve(0f, 1f, 0.5f, 0.3f, 1f, 0.1f));
            VfxBuildKit.SizeOverLifetime(burst, 0f, 1f, 0.6f, 0.8f, 1f, 0f);

            // Chips: a few shards flung out then falling (local force), stretched along their velocity, one still frame each.
            var chips = Child(root, "Chips", Mat("MatchPop_Chips", VfxBlend.Additive, Lib + "spark/shard/spark_shard_002.png"), 0.4f, 0.55f, Color.white, 43);
            VfxBuildKit.Burst(chips, 6);
            Circle(chips, 0.5f);
            var cm = chips.main;
            cm.startSpeed = new ParticleSystem.MinMaxCurve(5f, 8f);
            cm.startLifetime = new ParticleSystem.MinMaxCurve(0.32f, 0.4f);
            var cf = chips.forceOverLifetime;
            cf.enabled = true;
            cf.space = ParticleSystemSimulationSpace.Local;
            cf.x = new ParticleSystem.MinMaxCurve(0f);
            cf.y = new ParticleSystem.MinMaxCurve(-18f);
            cf.z = new ParticleSystem.MinMaxCurve(0f);
            Sheet(chips, 2, 4);
            VfxBuildKit.AlphaOverLifetime(chips, 0f, 1f, 0.7f, 1f, 1f, 0f);
            var cr = chips.GetComponent<ParticleSystemRenderer>();
            cr.renderMode = ParticleSystemRenderMode.Stretch;   // texture is horizontal; aligned to its velocity, never random
            cr.lengthScale = 1.8f;
            cr.velocityScale = 0f;
            cr.cameraVelocityScale = 0f;

            var prefab = VfxBuildKit.SavePrefab(root, Root + "/Prefabs/VFX_SF_MatchPop.prefab");
            VfxBuildKit.Finish(prefab, Root, "SF_Cast_MatchPop", PopTimes, Cam, Look, null);
        }

        // ------------------------------------------------------------ volt link (match VFX of a volt chain)

        // One bolt from cell A (the root) to the next cell B on local +X, drawn by the approved Electric Bolt shader
        // (no texture). Authored for neighbouring cells on a row / column: 102 px = 4.25 m. For a diagonal (144 px) the
        // game sets the renderer lengthScale and the material _Aspect (property block) and moves Tip to B.
        public const float LinkLength = 4.25f;
        public const float LinkWidth = 1.3f;
        const string BoltShader = "VFX/FX/Electric Bolt", GlowShader = "VFX/FX/Glow Star";
        static readonly Color BoltCore = new Color(1.4f, 1.5f, 1.6f, 1f);   // HDR white
        static readonly Color BoltRim = new Color(0.12f, 0.38f, 1.7f, 1f);  // deeper HDR blue: keeps its edge on the bright yellow volt tiles
        static readonly Color BoltRim2 = new Color(0.1f, 0.3f, 1.8f, 1f);
        static readonly float[] LinkTimes = { 0.02f, 0.06f, 0.12f, 0.2f, 0.28f, 0.34f };

        static void VoltLink()
        {
            var mBolt = BoltMat("VoltLink_Bolt", BoltRim, segments: 5, amp: 0.3f, detail: 0.4f, pin: 10, core: 0.035f, rim: 0.13f, strand: 0.5f, glow: 0.3f, fps: 12);
            var mBolt2 = BoltMat("VoltLink_Bolt2", BoltRim2, segments: 7, amp: 0.26f, detail: 0.5f, pin: 9, core: 0.02f, rim: 0.07f, strand: 0f, glow: 0.1f, fps: 15);
            var mTip = GlowMat("VoltLink_Tip", coreR: 0.06f, rimR: 0.12f, glow: 0.2f);

            var root = new GameObject("VFX_SF_VoltLink");
            var bolt = VfxBuildKit.ParticleOn(root, mBolt, 0.36f, LinkWidth, Color.white);
            BoltLayer(bolt, 0f, 0.36f, 30);
            var b2go = new GameObject("Bolt2");
            b2go.transform.SetParent(root.transform, false);
            var bolt2 = VfxBuildKit.ParticleOn(b2go, mBolt2, 0.24f, LinkWidth, new Color(1f, 1f, 1f, 0.85f));
            BoltLayer(bolt2, 0.06f, 0.24f, 29);

            // Small star at B the moment the bolt arrives (the bolt reaches B in 0.05 s).
            var tip = Child(root, "Tip", mTip, 0.15f, 1.2f, Color.white, 31);
            tip.transform.localPosition = new Vector3(LinkLength, 0f, 0f);
            var tm = tip.main;
            tm.startDelay = 0.08f;                    // after the bolt has fully reached B
            VfxBuildKit.SizeOverLifetime(tip, 0f, 0.5f, 0.3f, 1.1f, 1f, 0.7f);
            VfxBuildKit.AlphaOverLifetime(tip, 0f, 1f, 0.5f, 0.8f, 1f, 0f);

            var prefab = VfxBuildKit.SavePrefab(root, Root + "/Prefabs/VFX_SF_VoltLink.prefab");
            var mid = new Vector3(LinkLength / 2f, 0f, 0f);
            VfxBuildKit.Finish(prefab, Root, "SF_Cast_VoltLink", LinkTimes, mid + new Vector3(0f, 0f, -8f), mid, null);
        }

        /// <summary>Bolt quad A -> +X: emitted at A with a tiny -X velocity so the Stretched quad trails toward B.</summary>
        static void BoltLayer(ParticleSystem ps, float delay, float life, int order)
        {
            var m = ps.main;
            m.maxParticles = 1;
            m.startDelay = delay;
            m.duration = Mathf.Max(0.1f, delay + life);
            m.startSpeed = 0.01f;
            m.startRotation = 0f;                         // never random on a bolt
            var s = ps.shape;
            s.enabled = true;
            s.shapeType = ParticleSystemShapeType.Cone;
            s.angle = 0f;
            s.radius = 0.0001f;
            s.rotation = new Vector3(0f, -90f, 0f);       // cone +Z -> -X
            var cd = ps.customData;
            cd.enabled = true;
            cd.SetMode(ParticleSystemCustomData.Custom1, ParticleSystemCustomDataMode.Vector);
            cd.SetVectorComponentCount(ParticleSystemCustomData.Custom1, 3);
            // x: holds, then thins and breaks into pieces; y: seed; z: reach 0 -> 1 in 0.05 s
            cd.SetVector(ParticleSystemCustomData.Custom1, 0, new ParticleSystem.MinMaxCurve(1f, new AnimationCurve(
                new Keyframe(0f, 0f), new Keyframe(0.55f, 0.05f), new Keyframe(0.85f, 0.55f), new Keyframe(1f, 1f))));
            cd.SetVector(ParticleSystemCustomData.Custom1, 1, new ParticleSystem.MinMaxCurve(0f, 1f));
            float reach = 0.05f / life;
            cd.SetVector(ParticleSystemCustomData.Custom1, 2, new ParticleSystem.MinMaxCurve(1f,
                new AnimationCurve(new Keyframe(0f, 0f, 0f, 1f / reach), new Keyframe(reach, 1f, 1f / reach, 0f), new Keyframe(1f, 1f))));
            var r = ps.GetComponent<ParticleSystemRenderer>();
            r.SetActiveVertexStreams(new System.Collections.Generic.List<ParticleSystemVertexStream>
            {
                ParticleSystemVertexStream.Position, ParticleSystemVertexStream.Color,
                ParticleSystemVertexStream.UV, ParticleSystemVertexStream.Custom1XYZ,
            });
            r.renderMode = ParticleSystemRenderMode.Stretch;
            r.lengthScale = LinkLength / LinkWidth;
            r.velocityScale = 0f;
            r.cameraVelocityScale = 0f;
            r.pivot = Vector3.zero;
            r.maxParticleSize = 5f;
            r.sortingOrder = order;
        }

        static Material BoltMat(string name, Color rimColor, float segments, float amp, float detail, float pin,
            float core, float rim, float strand, float glow, float fps)
        {
            var m = VfxBuildKit.Material(Root + "/Materials/M_SF_Cast_" + name + ".mat", VfxBlend.Additive, null, BoltShader);
            m.SetFloat("_SrcBlend", 1f); m.SetFloat("_DstBlend", 1f);   // One One: colour premultiplied in the shader
            m.SetColor("_ColorCore", BoltCore); m.SetColor("_ColorRim", rimColor);
            m.SetFloat("_Aspect", LinkLength / LinkWidth); m.SetFloat("_Segments", segments); m.SetFloat("_Amp", amp);
            m.SetFloat("_Detail", detail); m.SetFloat("_Pin", pin);
            m.SetFloat("_CoreWidth", core); m.SetFloat("_RimWidth", rim);
            m.SetFloat("_Strand", strand); m.SetFloat("_Glow", glow); m.SetFloat("_Fps", fps);
            m.SetFloat("_Flip", 0f);
            m.SetFloat("_UseParticle", 1f); m.EnableKeyword("_USE_PARTICLE_DATA");
            EditorUtility.SetDirty(m);
            return m;
        }

        static Material GlowMat(string name, float coreR, float rimR, float glow)
        {
            var m = VfxBuildKit.Material(Root + "/Materials/M_SF_Cast_" + name + ".mat", VfxBlend.Additive, null, GlowShader);
            m.SetFloat("_SrcBlend", 1f); m.SetFloat("_DstBlend", 1f);
            m.SetColor("_ColorCore", BoltCore); m.SetColor("_ColorRim", BoltRim);
            m.SetFloat("_CoreRadius", coreR); m.SetFloat("_RimRadius", rimR); m.SetFloat("_Glow", glow);
            m.SetFloat("_Star", 1f); m.EnableKeyword("_STAR");
            m.SetFloat("_SpikeSharp", 20f); m.SetFloat("_Diagonal", 0.45f);
            EditorUtility.SetDirty(m);
            return m;
        }

        // ------------------------------------------------------------ helpers

        static Texture2D Load(string path)
        {
            var t = AssetDatabase.LoadAssetAtPath<Texture2D>(path);
            if (t == null) throw new InvalidOperationException("Texture not found: " + path);
            return t;
        }

        static Mesh LoadMesh(string path)
        {
            foreach (var o in AssetDatabase.LoadAllAssetsAtPath(path))
                if (o is Mesh m) return m;
            throw new InvalidOperationException("Mesh not found: " + path);
        }

        /// <summary>Stock particle material; shared Library textures are only loaded, never re-imported.</summary>
        static Material Mat(string name, VfxBlend blend, string texturePath) =>
            VfxBuildKit.Material(Root + "/Materials/M_SF_Cast_" + name + ".mat", blend, Load(texturePath));

        /// <summary>The prefab root is itself a Particle System (art lead rule).</summary>
        static ParticleSystem Layer(GameObject root, Material m, float life, float size, Color color, int order)
        {
            var ps = VfxBuildKit.ParticleOn(root, m, life, size, color);
            var main = ps.main;
            main.maxParticles = 1;
            ps.GetComponent<ParticleSystemRenderer>().sortingOrder = order;
            return ps;
        }

        static ParticleSystem Child(GameObject root, string name, Material m, float life, float size, Color color, int order)
        {
            var ps = VfxBuildKit.Particle(root.transform, name, m, life, size, color);
            var main = ps.main;
            main.maxParticles = 1;
            ps.GetComponent<ParticleSystemRenderer>().sortingOrder = order;
            return ps;
        }

        /// <summary>Looping layer: rate per second, local space, until the game destroys the projectile.</summary>
        static void Loop(ParticleSystem ps, float rate, int max)
        {
            var main = ps.main;
            main.loop = true;
            main.duration = 1f;
            main.maxParticles = Mathf.Max(1, max);
            var e = ps.emission;
            // One particle at t = 0 so the projectile is visible on its first frame.
            e.SetBursts(rate > 0 ? new[] { new ParticleSystem.Burst(0f, 1) } : new ParticleSystem.Burst[0]);
            e.rateOverTime = rate;
        }

        /// <summary>Embers left behind in world space as the projectile moves.</summary>
        static void Trail(ParticleSystem ps, float perMetre, int max)
        {
            var main = ps.main;
            main.loop = true;
            main.duration = 1f;
            main.maxParticles = max;
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            main.startSpeed = new ParticleSystem.MinMaxCurve(0.2f, 0.8f);
            main.startSize = new ParticleSystem.MinMaxCurve(main.startSize.constant * 0.7f, main.startSize.constant * 1.2f);
            var e = ps.emission;
            e.SetBursts(new ParticleSystem.Burst[0]);
            e.rateOverTime = 0f;
            e.rateOverDistance = perMetre;
            Circle(ps, 0.3f);
            VfxBuildKit.SizeOverLifetime(ps, 0f, 1f, 1f, 0f);
        }

        /// <summary>Emit from a circle on the screen plane (XY).</summary>
        static void Circle(ParticleSystem ps, float radius)
        {
            var s = ps.shape;
            s.enabled = true;
            s.shapeType = ParticleSystemShapeType.Circle;
            s.radius = radius;
            s.radiusThickness = 1f;
            s.arc = 360f;
        }

        /// <summary>Flipbook used as a set of stills: one random frame per particle, no animation (no Frame over Time curve).</summary>
        static void Sheet(ParticleSystem ps, int x, int y)
        {
            var t = ps.textureSheetAnimation;
            t.enabled = true;
            t.mode = ParticleSystemAnimationMode.Grid;
            t.numTilesX = x;
            t.numTilesY = y;
            t.frameOverTime = new ParticleSystem.MinMaxCurve(0f);
            t.startFrame = new ParticleSystem.MinMaxCurve(0f, x * y - 1);
        }

        static void Finish(GameObject root, string name, float[] times, Func<float, Vector3> motion)
        {
            var prefab = VfxBuildKit.SavePrefab(root, Root + "/Prefabs/VFX_SF_" + name + ".prefab");
            VfxBuildKit.Finish(prefab, Root, "SF_Cast_" + name, times, Cam, Look, motion);
        }
    }
}
#endif
