#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;
using VfxKit;
using static VfxKit.VfxBuildKit;
using static VfxEffects.ComponentKit;

namespace VfxEffects
{
    // Component 07 - Lightning (strike from the sky onto the ground). Textures: make_texture.py lightning (white on black, additive).
    //   LTN_Bolt_Ground_01 : upright bolt, Stretched Billboard (texture horizontal, head = LEFT = ground end), order 4
    //   LTN_Arcs_Ground_01 : arcs crawling over the ground, Billboard + Local (object X 90), order -7
    // Sorting: Scorch moved down to -9 / -8 so the arcs fit above it and below the Glow pool (-5); see ComponentKit table.
    public static class LightningComponentsBuild
    {
        const string Root = "Assets/VFX/_Components/Lightning";
        const string DocsRoot = "Docs/VFX/_Components/Lightning";
        const string RecipePath = "Docs/VFX/_Recipes/LightningStrike_Ground.json";

        [MenuItem("VFX/Components/Lightning - Build")]
        public static void Build()
        {
            if (!ConfirmSceneSwitch()) return;
            EnsureFolders(Root, "Materials", "Prefabs", "Scenes");
            var mBolt = Material(Root + "/Materials/M_LTN_Bolt_Add.mat", VfxBlend.Additive, ImportTexture(Root + "/Textures/T_LTN_Bolt.png", 1024));
            var mArcs = Material(Root + "/Materials/M_LTN_Arcs_Add.mat", VfxBlend.Additive, ImportTexture(Root + "/Textures/T_LTN_Arcs_2x2.png", 512));
            BuildBolt(mBolt);
            BuildArcs(mArcs);
            AssetDatabase.SaveAssets();
            Debug.Log("[Lightning] components built OK");
        }

        // One menu item for the whole effect: Scorch (new order) + Lightning + the mix recipe.
        [MenuItem("VFX/LightningStrike - Build All")]
        public static void BuildAll()
        {
            if (!ConfirmSceneSwitch()) return;
            ScorchComponentsBuild.Build();
            Build();
            MixRecipeBuild.Build(RecipePath);
        }

        static void BuildBolt(Material mat)
        {
            var root = new GameObject("CMP_LTN_Bolt_Ground_01").transform;
            var s = Particle(root, "Bolt", mat, 0.3f, 1.75f, Color.white);   // size = quad width; length = 4 x width (texture 4:1) = 7 m
            var m = s.main;
            m.duration = 0.3f;
            m.startSpeed = 0.001f;                       // only gives the stretch a direction (down)
            m.startRotation = 0f;
            m.maxParticles = 2;
            var sh = s.shape;
            sh.enabled = true; sh.shapeType = ParticleSystemShapeType.Cone; sh.angle = 0f; sh.radius = 0.001f;
            Burst(s, 1);
            // strike flickers: full flash, dip, second flash, gone
            ColorOverLifetime(s, new[] { Core, Mid, Outer }, 0f, 1f, 0.2f, 0.55f, 0.38f, 1f, 0.7f, 0.5f, 1f, 0f);
            var r = s.GetComponent<ParticleSystemRenderer>();
            r.renderMode = ParticleSystemRenderMode.Stretch;
            r.lengthScale = 4f; r.velocityScale = 0f; r.cameraVelocityScale = 0f;
            r.pivot = new Vector3(0f, -1f, 0f);         // head (ground end) on the particle, tail reaches up
            Common(s, 4, 8f);
            s.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);   // +Z (travel) -> down
            Save(root.gameObject, Root, DocsRoot, "LTN_Bolt_Ground_01", Vector3.zero, new[] { 0.01f, 0.06f, 0.12f, 0.18f, 0.24f, 0.3f },
                Load("Impact/Prefabs/CMP_IMP_Hit_Ground_01"), Load("Glow/Prefabs/CMP_GLW_Ground_01"));
        }

        static void BuildArcs(Material mat)
        {
            var root = new GameObject("CMP_LTN_Arcs_Ground_01").transform;
            var s = Particle(root, "Arcs", mat, 0.5f, 2.2f, Color.white);
            var m = s.main;
            m.duration = 0.6f;
            m.startLifetime = new ParticleSystem.MinMaxCurve(0.25f, 0.55f);
            m.startSize = new ParticleSystem.MinMaxCurve(1.6f, 2.6f);
            m.startRotation = new ParticleSystem.MinMaxCurve(0f, TwoPi);
            m.maxParticles = 12;
            Burst(s, 4, 0f); Burst(s, 3, 0.12f);
            SheetRandomFrame(s, 2, 2);
            SizeOverLifetime(s, 0f, 0.5f, 0.2f, 1f, 1f, 1f);               // crawls outward fast
            ColorOverLifetime(s, new[] { Core, Mid, Outer }, 0f, 1f, 0.35f, 0.6f, 0.5f, 1f, 1f, 0f);
            var r = s.GetComponent<ParticleSystemRenderer>();
            r.pivot = new Vector3(0.45f, 0f, 0f);                         // left end of the arc on the hit point (checked in preview)
            Common(s, -7, 4f);
            GroundFlat(s, 0.04f);
            Save(root.gameObject, Root, DocsRoot, "LTN_Arcs_Ground_01", Vector3.zero, new[] { 0.02f, 0.06f, 0.12f, 0.2f, 0.3f, 0.4f, 0.5f, 0.6f },
                Load("Impact/Prefabs/CMP_IMP_Hit_Ground_01"), Load("Glow/Prefabs/CMP_GLW_Ground_01"), Load("Ring/Prefabs/CMP_RNG_Ground_01"));
        }

        static GameObject Load(string rel) => AssetDatabase.LoadAssetAtPath<GameObject>("Assets/VFX/_Components/" + rel + ".prefab");

        public static void BuildBatch() => RunBatch(Build);
    }
}
#endif
