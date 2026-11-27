#if UNITY_EDITOR
using System;
using UnityEditor;
using UnityEngine;
using VfxKit;

namespace SFCast
{
    // Slot Five volt strike (Docs/VFX/SF_VoltStrike/Plan.md, art lead approved 2026-11-27): replaces the volt projectile.
    // A bolt charges on the volt chain (root = A), fires at 0.27 s and strikes the target fighter at 0.33 s (the cast
    // impact), then flare / flat wave / arcs / sparks at the fighter. Built in metres on the screen plane XY, bolt along
    // local +X, authored length StrikeLength. The game rotates the root toward the fighter, scales every Stretched
    // renderer's lengthScale (and _Aspect) by distance / StrikeLength, and moves the "At*" children to the fighter
    // ("AtFeet*" to its feet).
    public static class SFVoltStrikeBuild
    {
        const string Root = "Assets/VFX/SF_VoltStrike";
        const string Lib = "Assets/Library/";
        const string BoltShader = "VFX/FX/Electric Bolt", GlowShader = "VFX/FX/Glow Star";

        public const float StrikeLength = 16f;     // ~384 px: chain centre to fighter
        const float Width = 2.2f;
        const float Fire = 0.27f;                   // bolt leaves the cells
        const float Hit = 0.33f;                    // bolt reaches the fighter (game cast impact at 0.35 s)

        static readonly Color Core = new Color(1.5f, 1.45f, 1.7f, 1f);     // HDR white
        static readonly Color Rim = new Color(0.75f, 0.22f, 1.8f, 1f);     // HDR violet (volt icon)
        static readonly Color Rim2 = new Color(0.6f, 0.2f, 1.9f, 1f);
        static readonly Color Violet = new Color(0.78f, 0.45f, 1f, 1f);
        static readonly float[] Times = { 0.1f, 0.25f, 0.3f, 0.34f, 0.4f, 0.48f, 0.6f };

        [MenuItem("VFX/SF_VoltStrike/Build")]
        public static void Build()
        {
            if (!VfxBuildKit.ConfirmSceneSwitch()) return;
            VfxBuildKit.StrictRules = true;
            VfxBuildKit.EnsureFolders(Root, "Materials", "Prefabs", "Scenes");

            var root = new GameObject("VFX_SF_VoltStrike");

            // T1 Charge (root, at A): violet star swelling on the chain until the bolt fires.
            var charge = VfxBuildKit.ParticleOn(root, GlowMat("Charge", 0.1f, 0.22f, 0.45f), Fire + 0.03f, 3f, Color.white);
            One(charge, 36);
            VfxBuildKit.SizeOverLifetime(charge, 0f, 0.2f, 0.85f, 1f, 1f, 0.3f);
            VfxBuildKit.AlphaOverLifetime(charge, 0f, 0f, 0.2f, 0.8f, 0.45f, 0.55f, 0.7f, 1f, 0.9f, 1f, 1f, 0f);

            // T2-T4 Bolt + two branches (Electric Bolt shader, no texture).
            Bolt(root, "Bolt", BoltMat("Bolt", Rim, 1f, segments: 9, amp: 0.32f, detail: 0.45f, pin: 14, core: 0.05f, rim: 0.15f, strand: 0.6f, glow: 0.35f, fps: 14),
                0f, 1f, Fire, 0.3f, Width, 40);
            Bolt(root, "Branch1", BoltMat("Branch1", Rim2, 0.6f, segments: 6, amp: 0.4f, detail: 0.55f, pin: 10, core: 0.025f, rim: 0.08f, strand: 0f, glow: 0.12f, fps: 18),
                6f, 0.6f, Fire + 0.03f, 0.22f, Width * 0.6f, 39);
            Bolt(root, "Branch2", BoltMat("Branch2", Rim2, 0.45f, segments: 5, amp: 0.45f, detail: 0.6f, pin: 8, core: 0.02f, rim: 0.07f, strand: 0f, glow: 0.1f, fps: 20),
                -8f, 0.45f, Fire + 0.06f, 0.18f, Width * 0.5f, 38);

            var b = new Vector3(StrikeLength, 0f, 0f);

            // T5 Flare (at B): the one impact flash, fast up, slow shrink.
            var flare = Child(root, "AtFlare", GlowMat("Flare", 0.06f, 0.13f, 0.3f), 0.2f, 6.5f, Color.white, 44, b, Hit);
            VfxBuildKit.SizeOverLifetime(flare, 0f, 0.3f, 0.15f, 1f, 1f, 0.6f);
            VfxBuildKit.AlphaOverLifetime(flare, 0f, 1f, 0.4f, 0.9f, 1f, 0f);

            // T6 Wave (at the feet): flat 3:1 ring on the screen plane, 1.4 -> 9 m. Ground layer: drawn under the bolt (37).
            var wave = Child(root, "AtFeetWave", Mat("Wave", Lib + "ring/thin/ring_thin_002.png"), 0.32f, 9f, Color.Lerp(Violet, Color.white, 0.5f), 37, b + new Vector3(0f, -2.6f, 0f), Hit + 0.01f);
            var wm = wave.main;
            wm.startSize3D = true;
            wm.startSizeX = 9f; wm.startSizeY = 3f; wm.startSizeZ = 1f;
            VfxBuildKit.SizeOverLifetime(wave, 0f, 0.15f, 1f, 1f);
            VfxBuildKit.AlphaOverLifetime(wave, 0f, 1f, 0.6f, 0.85f, 1f, 0f);

            // T7 Arcs (at B): 3 electric arcs around the hit point once the bolt has joined B, random still frames, never rotated.
            var arcs = Child(root, "AtArcs", Mat("Arcs", Lib + "lightning/arc_sheet/lightning_arc_sheet_006.png"), 0.15f, 3f, Color.Lerp(Violet, Color.white, 0.45f), 43, b, Hit + 0.03f);
            VfxBuildKit.Burst(arcs, 3);
            Circle(arcs, 0.8f);
            Sheet(arcs, 4, 4);
            VfxBuildKit.AlphaOverLifetime(arcs, 0f, 1f, 0.6f, 1f, 1f, 0f);

            // T8 Sparks (at B): 10 stars thrown out.
            var sparks = Child(root, "AtSparks", Mat("Sparks", Lib + "spark/star/spark_star_009.png"), 0.25f, 0.6f, Violet, 42, b, Hit);
            VfxBuildKit.Burst(sparks, 10);
            Circle(sparks, 0.3f);
            var sm = sparks.main;
            sm.startSpeed = new ParticleSystem.MinMaxCurve(6f, 10f);
            sm.startSize = new ParticleSystem.MinMaxCurve(0.4f, 0.7f);
            VfxBuildKit.SizeOverLifetime(sparks, 0f, 1f, 1f, 0f);

            var prefab = VfxBuildKit.SavePrefab(root, Root + "/Prefabs/VFX_SF_VoltStrike.prefab");
            var mid = new Vector3(StrikeLength / 2f, -1f, 0f);
            VfxBuildKit.Finish(prefab, Root, "SF_VoltStrike", Times, mid + new Vector3(0f, 0f, -26f), mid, null);
            AssetDatabase.SaveAssets();
            Debug.Log("[SF_VoltStrike] built OK");
        }

        public static void BuildBatch() => VfxBuildKit.RunBatch(Build);

        // ------------------------------------------------------------ layers

        /// <summary>Bolt quad from A along +X (rotated by angle about Z), lengthRatio of StrikeLength, reaching its end in 0.06 s.</summary>
        static void Bolt(GameObject root, string name, Material m, float angle, float lengthRatio, float delay, float life, float width, int order)
        {
            var go = new GameObject(name);
            go.transform.SetParent(root.transform, false);
            go.transform.localRotation = Quaternion.Euler(0f, 0f, angle);
            var ps = VfxBuildKit.ParticleOn(go, m, life, width, Color.white);
            var main = ps.main;
            main.maxParticles = 1;
            main.startDelay = delay;
            main.duration = Mathf.Max(0.1f, life);
            main.startSpeed = 0.01f;
            main.startRotation = 0f;                      // never random on a bolt
            var s = ps.shape;
            s.enabled = true;
            s.shapeType = ParticleSystemShapeType.Cone;
            s.angle = 0f;
            s.radius = 0.0001f;
            s.rotation = new Vector3(0f, -90f, 0f);       // cone +Z -> -X: the Stretched quad trails toward +X
            var cd = ps.customData;
            cd.enabled = true;
            cd.SetMode(ParticleSystemCustomData.Custom1, ParticleSystemCustomDataMode.Vector);
            cd.SetVectorComponentCount(ParticleSystemCustomData.Custom1, 3);
            // x: holds (readable >= 0.2 s on the main bolt), then thins and breaks; y: seed; z: reach 0 -> 1 in 0.06 s
            cd.SetVector(ParticleSystemCustomData.Custom1, 0, new ParticleSystem.MinMaxCurve(1f, new AnimationCurve(
                new Keyframe(0f, 0f), new Keyframe(0.7f, 0.05f), new Keyframe(0.88f, 0.55f), new Keyframe(1f, 1f))));
            cd.SetVector(ParticleSystemCustomData.Custom1, 1, new ParticleSystem.MinMaxCurve(0f, 1f));
            float reach = Mathf.Clamp01(0.06f / life);
            cd.SetVector(ParticleSystemCustomData.Custom1, 2, new ParticleSystem.MinMaxCurve(1f,
                new AnimationCurve(new Keyframe(0f, 0f, 0f, 1f / reach), new Keyframe(reach, 1f, 1f / reach, 0f), new Keyframe(1f, 1f))));
            var r = ps.GetComponent<ParticleSystemRenderer>();
            r.SetActiveVertexStreams(new System.Collections.Generic.List<ParticleSystemVertexStream>
            {
                ParticleSystemVertexStream.Position, ParticleSystemVertexStream.Color,
                ParticleSystemVertexStream.UV, ParticleSystemVertexStream.Custom1XYZ,
            });
            r.renderMode = ParticleSystemRenderMode.Stretch;
            r.lengthScale = StrikeLength * lengthRatio / width;
            r.velocityScale = 0f;
            r.cameraVelocityScale = 0f;
            r.pivot = Vector3.zero;
            r.maxParticleSize = 50f;
            r.sortingOrder = order;
            m.SetFloat("_Aspect", r.lengthScale);
        }

        static void One(ParticleSystem ps, int order)
        {
            var main = ps.main;
            main.maxParticles = 1;
            ps.GetComponent<ParticleSystemRenderer>().sortingOrder = order;
        }

        static ParticleSystem Child(GameObject root, string name, Material m, float life, float size, Color color, int order, Vector3 at, float delay)
        {
            var ps = VfxBuildKit.Particle(root.transform, name, m, life, size, color);
            ps.transform.localPosition = at;
            var main = ps.main;
            main.maxParticles = 1;
            main.startDelay = delay;
            ps.GetComponent<ParticleSystemRenderer>().sortingOrder = order;
            return ps;
        }

        static void Circle(ParticleSystem ps, float radius)
        {
            var s = ps.shape;
            s.enabled = true;
            s.shapeType = ParticleSystemShapeType.Circle;
            s.radius = radius;
            s.radiusThickness = 1f;
            s.arc = 360f;
        }

        /// <summary>Flipbook used as a set of stills: one random frame per particle (no Frame over Time curve).</summary>
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

        // ------------------------------------------------------------ materials

        static Texture2D Load(string path)
        {
            var t = AssetDatabase.LoadAssetAtPath<Texture2D>(path);
            if (t == null) throw new InvalidOperationException("Texture not found: " + path);
            return t;
        }

        /// <summary>Stock additive material; shared Library textures are only loaded, never re-imported.</summary>
        static Material Mat(string name, string texturePath) =>
            VfxBuildKit.Material(Root + "/Materials/M_SF_VoltStrike_" + name + ".mat", VfxBlend.Additive, Load(texturePath));

        static Material BoltMat(string name, Color rimColor, float lengthRatio, float segments, float amp, float detail, float pin,
            float core, float rim, float strand, float glow, float fps)
        {
            var m = VfxBuildKit.Material(Root + "/Materials/M_SF_VoltStrike_" + name + ".mat", VfxBlend.Additive, null, BoltShader);
            m.SetFloat("_SrcBlend", 1f); m.SetFloat("_DstBlend", 1f);   // One One: colour premultiplied in the shader
            m.SetColor("_ColorCore", Core); m.SetColor("_ColorRim", rimColor);
            m.SetFloat("_Segments", segments); m.SetFloat("_Amp", amp);
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
            var m = VfxBuildKit.Material(Root + "/Materials/M_SF_VoltStrike_" + name + ".mat", VfxBlend.Additive, null, GlowShader);
            m.SetFloat("_SrcBlend", 1f); m.SetFloat("_DstBlend", 1f);
            m.SetColor("_ColorCore", Core); m.SetColor("_ColorRim", Rim);
            m.SetFloat("_CoreRadius", coreR); m.SetFloat("_RimRadius", rimR); m.SetFloat("_Glow", glow);
            m.SetFloat("_Star", 1f); m.EnableKeyword("_STAR");
            m.SetFloat("_SpikeSharp", 20f); m.SetFloat("_Diagonal", 0.45f);
            EditorUtility.SetDirty(m);
            return m;
        }
    }
}
#endif
