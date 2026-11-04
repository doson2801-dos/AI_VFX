#if UNITY_EDITOR
using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;
using VfxKit;
using static VfxKit.VfxBuildKit;
using Object = UnityEngine.Object;

namespace VfxEffects
{
    public static class ThunderImpactBuild
    {
        const string Root = "Assets/VFX/ThunderImpact";
        const string Docs = "Docs/VFX/ThunderImpact";
        static Texture2D Tex(string path) => AssetDatabase.LoadAssetAtPath<Texture2D>(path) ?? throw new Exception("Missing texture: " + path);
        static string Mat(string id) => Root + "/Materials/M_ThunderImpact_" + id + ".mat";
        static readonly Color Gold = new Color(1f, .78f, .12f);
        static readonly Vector3 Look = new Vector3(0, 2, 0);
        static readonly Vector3 CameraPosition = Look + new Vector3(0, 8.660254f, -5);

        [MenuItem("VFX/ThunderImpact/Build")]
        public static void Build()
        {
            if (!ConfirmSceneSwitch()) return;
            EnsureFolders(Root, "Materials", "Prefabs", "Scenes");
            Directory.CreateDirectory(Docs);
            var boltMat = VfxLightningKit.LightningMaterial(Mat("L1_Bolt"),
                Tex("Assets/Library/Lightnings_Electrics/Lightnings_Electrics_007.png"),
                Tex("Assets/VFX/_Imported/RpgGame/Lightning/Textures/Gradient_lightning.png"),
                new Color(2f, 1.8f, 1.15f, 1), 1f, .15f, 0f, 1f, 1f);
            var flashMat = Material(Mat("L2_Flash"), VfxBlend.Additive, Tex("Assets/Library/glow/glow_004.png"));
            var waveMat = Material(Mat("L3_Wave"), VfxBlend.Additive, Tex("Assets/Library/wave/wave_009.png"));
            var groundMat = Material(Mat("L4_GroundElectric"), VfxBlend.Additive, Tex("Assets/Library/Lightnings_Electrics/Lightnings_Electrics_008.png"));
            var root = new GameObject("VFX_ThunderImpact");
            var flash = ParticleOn(root, flashMat, .12f, 1.25f, new Color(1,.93f,.65f));
            Setup(flash, 2, 3); Beats(flash, 1);
            AlphaOverLifetime(flash, 0,1, .2f,1, 1,0);
            SizeOverLifetime(flash, 0,.55f, .2f,1, 1,.7f);

            var bolt = Particle(root.transform, "L1_Bolt", boltMat, .15f, 1, Color.white);
            Setup(bolt, 1, 2); Beats(bolt, 1);
            var bm = bolt.main; bm.startSpeed = .001f;
            bm.startSize3D = true; bm.startSizeX = .85f; bm.startSizeY = 2.5f; bm.startSizeZ = 1;
            VfxLightningKit.ConeUp(bolt, Vector3.zero);
            VfxLightningKit.Stretch(bolt, 2, 0, new Vector3(0,1,0), 5, 2);
            VfxLightningKit.LightningStreams(bolt);
            VfxLightningKit.LightningCustomData(bolt, 0,.12f, .55f,.18f, 1,1.01f);

            var wave = Particle(root.transform, "L3_Wave", waveMat, .38f, 3, Gold);
            Setup(wave, 3, 1); Ground(wave); Beats(wave, 1);
            SizeOverLifetime(wave, 0,.12f, .3f,.55f, 1,1);
            AlphaOverLifetime(wave, 0,.8f, .25f,.65f, 1,0);

            var ground = Particle(root.transform, "L4_GroundElectric", groundMat, .48f, 1, new Color(1,.9f,.4f));
            Setup(ground, 24, 0); Ground(ground); Beats(ground, 6);
            var gm = ground.main; gm.startSize = new ParticleSystem.MinMaxCurve(.65f,1.15f);
            gm.startRotation = new ParticleSystem.MinMaxCurve(0,Mathf.PI*2);
            var shape = ground.shape; shape.enabled = true; shape.shapeType = ParticleSystemShapeType.Circle; shape.radius = .15f;
            var velocity = ground.velocityOverLifetime; velocity.enabled = true;
            velocity.space = ParticleSystemSimulationSpace.Local; velocity.radial = 2.2f;
            VfxLightningKit.Sheet(ground,3,3,true,false);
            AlphaOverLifetime(ground, 0,0, .08f,1, .28f,.65f, .40f,1, .6f,.25f, .7f,.6f, 1,0);
            SizeOverLifetime(ground, 0,.5f, .25f,1, 1,.65f);
            var prefab = SavePrefab(root, Root + "/Prefabs/VFX_ThunderImpact.prefab");
            Finish(prefab, Root, "ThunderImpact", new[]{.04f,.12f,.19f,.26f,.34f,.41f,.48f,.56f,.72f,.95f,1.1f}, CameraPosition, Look);
            // Native simulation frames provide a playback artifact without a runtime controller.
            CaptureSheet(prefab, Enumerable.Range(1,36).Select(i=>i/30f).ToArray(), Docs+"/Playback_sheet.png",256,CameraPosition,Look);
            var messages = prefab.GetComponentsInChildren<ParticleSystemRenderer>().Select(r=>r.sharedMaterial.shader).Distinct()
                .SelectMany(s=>ShaderUtil.GetShaderMessages(s).Select(m=>s.name+": "+m.severity+" "+m.message)).ToArray();
            File.WriteAllLines(Docs+"/ShaderMessages.txt", messages.Length == 0 ? new[]{"No shader messages after render."} : messages);
            var probe = Object.Instantiate(prefab);
            var ps = probe.GetComponent<ParticleSystem>(); ps.Simulate(1.2f,true,true,true);
            if (probe.GetComponentsInChildren<ParticleSystem>().Any(p=>p.particleCount!=0)) throw new Exception("Particles remain at 1.2s");
            Object.DestroyImmediate(probe);
            AssetDatabase.SaveAssets();
        }
        public static void BuildBatch() => RunBatch(Build);
        static void Setup(ParticleSystem ps,int max,int order)
        {
            var m=ps.main; m.duration=1.05f; m.maxParticles=max; m.scalingMode=ParticleSystemScalingMode.Hierarchy;
            ps.randomSeed=1729;
            var r=ps.GetComponent<ParticleSystemRenderer>(); r.sortingOrder=order; r.maxParticleSize=5;
        }
        static void Beats(ParticleSystem ps,int count) => VfxLightningKit.Bursts(ps,0,count,.22f,count,.44f,count);
        static void Ground(ParticleSystem ps)
        {
            ps.transform.localRotation=Quaternion.Euler(90,0,0); ps.transform.localPosition=new Vector3(0,.025f,0);
            ps.GetComponent<ParticleSystemRenderer>().alignment=ParticleSystemRenderSpace.Local;
        }
    }
}
#endif
