#if UNITY_EDITOR
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using VfxKit;
using static VfxKit.VfxBuildKit;

namespace VfxEffects
{
    // Component 01 - Impact (hit flash). Spec: Docs/VFX/_ArtDirection/components/01_Impact.md
    // Builds 3 component prefabs (Air / Dir / Ground) + standard previews into Docs/VFX/_Components/Impact/<ID>/.
    // Rule (art lead 2026-10-31): never Horizontal/Vertical Billboard. Upright = Stretched Billboard, ground = Billboard + alignment Local/World.
    public static class ImpactComponentsBuild
    {
        const string Root = "Assets/VFX/_Components/Impact";
        const string DocsRoot = "Docs/VFX/_Components/Impact";
        const float TwoPi = Mathf.PI * 2f;

        // Shared color slots (standard default palette: fire orange)
        static readonly Color Core = ComponentKit.Core;
        static readonly Color Mid = ComponentKit.Mid;

        [MenuItem("VFX/Components/Impact - Build")]
        public static void Build()
        {
            if (!ConfirmSceneSwitch()) return;
            EnsureFolders(Root, "Materials", "Prefabs", "Scenes");
            string T = Root + "/Textures/", M = Root + "/Materials/M_IMP_";

            var mStar = Material(M + "HitStar_Add.mat", VfxBlend.Additive, ImportTexture(T + "T_IMP_HitStar_2x2.png", 512));
            var mCore = Material(M + "CoreStar4_Add.mat", VfxBlend.Additive, ImportTexture(T + "T_IMP_CoreStar4.png", 256));
            var mDir = Material(M + "HitDir_Add.mat", VfxBlend.Additive, ImportTexture(T + "T_IMP_HitDir_2x2.png", 512));
            var mSplash = Material(M + "GroundSplash_Add.mat", VfxBlend.Additive, ImportTexture(T + "T_IMP_GroundSplash_2x4.png", 512));
            var mRing = Material(M + "GroundRing_Add.mat", VfxBlend.Additive, ImportTexture(T + "T_IMP_GroundRing.png", 512));
            ImportTexture(T + "T_IMP_GroundBurst.png", 512);   // even 16-spike ring, kept in the library (not requested for Hit Ground)
            ImportTexture(T + "T_IMP_Star7.png", 512);
            ImportTexture(T + "T_IMP_HitDirSpike.png", 512);
            ImportTexture(T + "T_IMP_Line.png", 256);   // kept in the library; no longer used by Hit Dir

            BuildAir(mStar, mCore);
            BuildDir(mDir);
            BuildGround(mSplash, mRing);
            AssetDatabase.SaveAssets();
            Debug.Log("[Impact] components built OK");
        }

        // ---------------------------------------------------------------- 2a Air
        static void BuildAir(Material mStar, Material mCore)
        {
            const string id = "IMP_Hit_Air_01";
            var root = new GameObject("CMP_" + id).transform;

            var star = Particle(root, "Star", mStar, 0.18f, 1.8f, Core);
            var m = star.main;
            m.duration = 0.3f;
            m.startLifetime = new ParticleSystem.MinMaxCurve(0.12f, 0.18f);
            m.startSize = new ParticleSystem.MinMaxCurve(1.6f, 2.0f);
            m.startRotation = new ParticleSystem.MinMaxCurve(0f, TwoPi);
            m.flipRotation = 0.5f;
            Burst(star, 1); m.maxParticles = 4;
            SizeOverLifetime(star, 0f, 0.6f, 0.15f, 1.05f, 0.35f, 1f, 1f, 0.7f);
            AlphaOverLifetime(star, 0f, 1f, 0.6f, 1f, 1f, 0f);
            SheetRandomFrame(star, 2, 2);   // 4 cells = 4 star variants, one per particle
            Common(star, 5);

            var core = Particle(root, "Core", mCore, 0.08f, 0.8f, Color.white);
            Burst(core, 1);
            SizeOverLifetime(core, 0f, 0.7f, 0.3f, 1f, 1f, 0.6f);
            AlphaOverLifetime(core, 0f, 1f, 0.5f, 1f, 1f, 0f);
            Common(core, 6);

            Save(root.gameObject, id, new Vector3(0f, 1.1f, 0f), new[] { 0.01f, 0.025f, 0.04f, 0.06f, 0.09f, 0.12f, 0.15f, 0.18f });
        }

        // ---------------------------------------------------------------- 2b Dir (force toward +X, set by `rotation`)
        static void BuildDir(Material mDir)
        {
            const string id = "IMP_Hit_Dir_01";
            const float rotation = 0f;  // hit direction in degrees (0 = toward +X on screen)
            var root = new GameObject("CMP_" + id).transform;

            var spike = Particle(root, "Spike", mDir, 0.2f, 1f, Core);
            var m = spike.main;
            m.startLifetime = new ParticleSystem.MinMaxCurve(0.15f, 0.2f);
            m.startSize3D = true;
            m.startSizeX = 2.2f; m.startSizeY = 1.3f; m.startSizeZ = 1f;
            m.startRotation = new ParticleSystem.MinMaxCurve((rotation - 10f) * Mathf.Deg2Rad, (rotation + 10f) * Mathf.Deg2Rad);
            Burst(spike, 1); m.maxParticles = 3;
            var sol = spike.sizeOverLifetime;
            sol.enabled = true; sol.separateAxes = true;
            sol.x = Curve(0f, 0.5f, 0.2f, 1.1f, 1f, 1.2f);
            sol.y = Curve(0f, 1f, 1f, 0.5f);
            sol.z = new ParticleSystem.MinMaxCurve(1f);
            AlphaOverLifetime(spike, 0f, 1f, 0.5f, 1f, 1f, 0f);
            SheetSequence(spike, 2, 2);
            // base of the spike sits on the hit point, tip reaches forward along the force
            spike.GetComponent<ParticleSystemRenderer>().pivot = new Vector3(DirPivotX, 0f, 0f);
            Common(spike, 5);
            // No accent line: art lead removed it (2026-10-31), the spike alone carries the direction.

            Save(root.gameObject, id, new Vector3(0f, 1.1f, 0f), new[] { 0.01f, 0.03f, 0.05f, 0.08f, 0.11f, 0.14f, 0.17f, 0.2f });
        }

        // Unity pivot is in particle-size units along the quad's local X. Sign verified by the origin marker in the preview.
        const float DirPivotX = 0.3f;
        // Stretched Billboard (verified 2026-10-31): the particle sits at the texture's LEFT edge (= travel direction) and the quad trails behind.
        // Pivot X moves the quad sideways; pivot Y moves it along the travel direction by Y * length. Y = 1 puts the trailing end (texture right = base) on the ground.
        static readonly Vector3 SplashPivot = new Vector3(0f, 1f, 0f);

        // ---------------------------------------------------------------- 2c Ground
        static void BuildGround(Material mSplash, Material mRing)
        {
            const string id = "IMP_Hit_Ground_01";
            var root = new GameObject("CMP_" + id).transform;

            // Upright splash: Stretched Billboard, texture horizontal (tip on the LEFT = travel direction), shot straight up
            var splash = Particle(root, "Splash", mSplash, 0.4f, 1.2f * 1.2f, Core);   // width; height = width * lengthScale (cell 2:1)
            var m = splash.main;
            m.startSpeed = 0.05f;
            Burst(splash, 1); m.maxParticles = 2;
            var sh = splash.shape;
            sh.enabled = true;
            sh.shapeType = ParticleSystemShapeType.Cone;
            sh.angle = 0f; sh.radius = 0.0001f;
            sh.rotation = new Vector3(-90f, 0f, 0f);   // cone axis +Z -> +Y
            SizeOverLifetime(splash, 0f, 0.8f, 0.2f, 1f, 1f, 1.05f);
            AlphaOverLifetime(splash, 0f, 1f, 0.8f, 1f, 1f, 0f);
            SheetSequence(splash, 2, 4);
            var sr = splash.GetComponent<ParticleSystemRenderer>();
            sr.renderMode = ParticleSystemRenderMode.Stretch;
            sr.velocityScale = 0f; sr.lengthScale = 2f; sr.cameraVelocityScale = 0f;
            sr.freeformStretching = false;
            sr.pivot = SplashPivot;
            sr.flip = new Vector3(0f, 0.5f, 0f);   // random left/right mirror
            Common(splash, 5);

            // Flat ring on the ground: Billboard + Render Alignment Local, GameObject rotated X 90
            var flat = Particle(root, "Flat", mRing, 0.22f, 3f, Core);
            flat.transform.localPosition = new Vector3(0f, 0.02f, 0f);
            flat.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
            var fm = flat.main;
            fm.startRotation = new ParticleSystem.MinMaxCurve(0f, TwoPi);
            Burst(flat, 1); fm.maxParticles = 2;
            SizeOverLifetime(flat, 0f, 0.4f, 0.3f, 1f, 1f, 1.15f);
            AlphaOverLifetime(flat, 0f, 1f, 0.4f, 1f, 1f, 0f);
            flat.GetComponent<ParticleSystemRenderer>().alignment = ParticleSystemRenderSpace.Local;
            Common(flat, -4);   // ground plane: under the smoke

            Save(root.gameObject, id, Vector3.zero, new[] { 0.02f, 0.05f, 0.09f, 0.14f, 0.2f, 0.26f, 0.33f, 0.4f });
        }

        // ---------------------------------------------------------------- helpers (shared: ComponentKit)
        static void Common(ParticleSystem ps, int order) => ComponentKit.Common(ps, order);
        static void SheetSequence(ParticleSystem ps, int cols, int rows) => ComponentKit.SheetSequence(ps, cols, rows);
        static void SheetRandomFrame(ParticleSystem ps, int cols, int rows) => ComponentKit.SheetRandomFrame(ps, cols, rows);
        static Material Unlit(Color c) => ComponentKit.Unlit(c);
        static void Save(GameObject go, string id, Vector3 previewPos, float[] times) => ComponentKit.Save(go, Root, DocsRoot, id, previewPos, times);

        public static void BuildBatch() => RunBatch(Build);

        // Diagnostic: how Unity maps a horizontal texture onto a Stretched Billboard shot upward, for 4 pivots.
        public static void StretchTestBatch() => RunBatch(StretchTest);
        static void StretchTest()
        {
            var mat = AssetDatabase.LoadAssetAtPath<Material>(Root + "/Materials/M_IMP_GroundSplash_Add.mat");
            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var cam = new GameObject("Cam").AddComponent<Camera>();
            cam.transform.position = new Vector3(0f, 1f, -11f); cam.transform.LookAt(new Vector3(0f, 1f, 0f));
            cam.clearFlags = CameraClearFlags.SolidColor; cam.backgroundColor = new Color(0.08f, 0.085f, 0.1f); cam.fieldOfView = 40f;
            var pivots = new[] { new Vector3(0, 0, 0), new Vector3(0.5f, 0, 0), new Vector3(-0.5f, 0, 0), new Vector3(0, 0.5f, 0), new Vector3(0, -0.5f, 0) };
            var red = Unlit(Color.red); var gray = Unlit(new Color(0.3f, 0.3f, 0.35f));
            var ground = GameObject.CreatePrimitive(PrimitiveType.Cube); ground.GetComponent<Renderer>().sharedMaterial = gray;
            ground.transform.localScale = new Vector3(14f, 0.01f, 0.01f);
            var all = new List<ParticleSystem>();
            for (int i = 0; i < pivots.Length; i++)
            {
                var holder = new GameObject("T" + i).transform; holder.position = new Vector3(-5f + i * 2.5f, 0f, 0f);
                var mk = GameObject.CreatePrimitive(PrimitiveType.Sphere); mk.GetComponent<Renderer>().sharedMaterial = red;
                mk.transform.position = holder.position; mk.transform.localScale = Vector3.one * 0.1f;
                var ps = Particle(holder, "S", mat, 5f, 1f, Color.white);
                var m = ps.main; m.startSpeed = 0.05f;
                var sh = ps.shape; sh.enabled = true; sh.shapeType = ParticleSystemShapeType.Cone; sh.angle = 0f; sh.radius = 0.0001f; sh.rotation = new Vector3(-90f, 0f, 0f);
                var t = ps.textureSheetAnimation; t.enabled = true; t.numTilesX = 2; t.numTilesY = 4; t.frameOverTime = new ParticleSystem.MinMaxCurve(0.2f);   // frame 1 (tall)
                var r = ps.GetComponent<ParticleSystemRenderer>();
                r.renderMode = ParticleSystemRenderMode.Stretch; r.velocityScale = 0f; r.lengthScale = 2f; r.cameraVelocityScale = 0f; r.pivot = pivots[i];
                all.Add(ps);
            }
            int w = 1600, h = 500;
            var rt = new RenderTexture(w, h, 24); cam.targetTexture = rt; cam.aspect = (float)w / h;
            foreach (var p in all) p.Simulate(0.2f, false, true, false);
            cam.Render(); RenderTexture.active = rt;
            var tex = new Texture2D(w, h, TextureFormat.RGB24, false); tex.ReadPixels(new Rect(0, 0, w, h), 0, 0); tex.Apply();
            File.WriteAllBytes("Docs/VFX/_ArtDirection/components/stretch_test.png", tex.EncodeToPNG());
            RenderTexture.active = null;
        }
    }
}
#endif
