#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;

namespace StrongExplosionV1
{
    public static class StrongExplosionBuild
    {
        const string Root = "Assets/StrongExplosion_v1";
        const string Report = "Docs/StrongExplosion/Validation";
        static readonly Vector3 View = new Vector3(5, 4.1f, -7).normalized;
        static readonly Color Orange = new Color(1f, .28f, .025f, 1);
        static readonly Color Yellow = new Color(1f, .79f, .27f, 1);
        static Material smoke, body, tip, core, halo, debris, crackDark, crackHot;

        [MenuItem("VFX/Strong Explosion/Build approved v1")]
        public static void Build()
        {
            foreach (string folder in new[] {"Materials", "Meshes", "Prefabs", "Scenes"}) Directory.CreateDirectory(Root + "/" + folder);
            Directory.CreateDirectory(Report);
            AssetDatabase.Refresh();
            Import("T_SmokePuff", 512); Import("T_CenterFlash", 256);
            Import("T_ImpactBody_2Variants", 1024); Import("T_ImpactTip_2Variants", 1024); Import("T_CrackBranch", 512);
            smoke = Mat("M_Smoke", "Particles/Standard Unlit", "T_SmokePuff", false);
            body = Mat("M_ImpactBody", "Mobile/Particles/Additive", "T_ImpactBody_2Variants", true);
            tip = Mat("M_ImpactTip", "Mobile/Particles/Additive", "T_ImpactTip_2Variants", true);
            core = Mat("M_CenterCore", "Mobile/Particles/Additive", "T_CenterFlash", true);
            halo = Mat("M_CenterHalo", "Mobile/Particles/Additive", "T_CenterFlash", true);
            debris = Mat("M_Debris", "Particles/Standard Unlit", null, false);
            crackDark = Mat("M_CrackDark", "Particles/Standard Unlit", "T_CrackBranch", false);
            crackHot = Mat("M_CrackHot", "Mobile/Particles/Additive", "T_CrackBranch", true);
            Mesh rockA = Rock("M_Debris_A", false), rockB = Rock("M_Debris_B", true);
            var root = new GameObject("VFX_StrongExplosion");
            try
            {
                Smoke(Group(root, "Smoke")); Impact(Group(root, "Impact")); Center(Group(root, "Center"));
                Debris(Group(root, "Debris"), rockA, rockB); Cracks(Group(root, "Cracks"));
                PrefabUtility.SaveAsPrefabAsset(root, Root + "/Prefabs/VFX_StrongExplosion.prefab");
            }
            finally { UnityEngine.Object.DestroyImmediate(root); }
            CreateScene(); AssetDatabase.SaveAssets();
            Debug.Log("StrongExplosion v1 built with approved assets only.");
        }

        public static void BuildAndValidate()
        {
            try { Build(); EditorSceneManager.OpenScene(Root + "/Scenes/StrongExplosion_Demo.unity"); EditorApplication.isPlaying = true; }
            catch (Exception e) { Debug.LogException(e); File.WriteAllText(Report + "/BuildFailure.txt", e.ToString()); EditorApplication.Exit(1); }
        }

        static void Import(string name, int size)
        {
            var path = Root + "/Textures/" + name + ".png";
            var importer = AssetImporter.GetAtPath(path) as TextureImporter;
            if (importer == null) throw new FileNotFoundException(path);
            importer.textureType = TextureImporterType.Default;
            importer.alphaSource = TextureImporterAlphaSource.FromInput; importer.alphaIsTransparency = true;
            importer.sRGBTexture = true; importer.mipmapEnabled = true; importer.wrapMode = TextureWrapMode.Clamp;
            importer.filterMode = FilterMode.Bilinear; importer.npotScale = TextureImporterNPOTScale.ToNearest;
            importer.maxTextureSize = size; importer.textureCompression = TextureImporterCompression.Uncompressed;
            importer.isReadable = false; importer.SaveAndReimport();
        }

        static Material Mat(string name, string shaderName, string texture, bool additive)
        {
            Shader shader = Shader.Find(shaderName);
            if (!shader || !shader.isSupported) throw new InvalidOperationException("Unavailable shader: " + shaderName);
            string path = Root + "/Materials/" + name + ".mat";
            var material = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (!material) { material = new Material(shader); AssetDatabase.CreateAsset(material, path); }
            material.shader = shader; material.shaderKeywords = Array.Empty<string>();
            material.mainTexture = texture == null ? null : AssetDatabase.LoadAssetAtPath<Texture2D>(Root + "/Textures/" + texture + ".png");
            if (material.HasProperty("_TintColor")) material.SetColor("_TintColor", Color.white);
            if (material.HasProperty("_Color")) material.SetColor("_Color", Color.white);
            if (!additive)
            {
                material.SetFloat("_Mode", 2); material.SetInt("_SrcBlend", (int)BlendMode.SrcAlpha);
                material.SetInt("_DstBlend", (int)BlendMode.OneMinusSrcAlpha); material.SetInt("_ZWrite", 0);
                material.SetInt("_BlendOp", (int)BlendOp.Add); material.EnableKeyword("_ALPHABLEND_ON");
                material.SetFloat("_ColorMode", 0); material.SetFloat("_LightingEnabled", 0);
                material.SetOverrideTag("RenderType", "Transparent");
            }
            material.renderQueue = name.StartsWith("M_Crack") ? 2980 : 3000;
            EditorUtility.SetDirty(material); return material;
        }

        static Transform Group(GameObject root, string name) { var g = new GameObject(name); g.transform.SetParent(root.transform, false); return g.transform; }
        static AnimationCurve Curve(params float[] points)
        {
            var keys = new Keyframe[points.Length / 2];
            for (int i=0; i<keys.Length; i++) keys[i] = new Keyframe(points[2*i], points[2*i+1]);
            return new AnimationCurve(keys);
        }
        static Gradient Gradient(Color start, Color end, params float[] alpha)
        {
            var g = new Gradient(); var a = new GradientAlphaKey[alpha.Length / 2];
            for (int i=0; i<a.Length; i++) a[i] = new GradientAlphaKey(alpha[2*i+1], alpha[2*i]);
            g.SetKeys(new[] {new GradientColorKey(start, 0), new GradientColorKey(end, 1)}, a); return g;
        }
        static ParticleSystem Particle(Transform parent, string name, Material material, float delay, float lifetime, float width, float height, Color color, uint seed)
        {
            var g = new GameObject(name); g.transform.SetParent(parent, false); var p = g.AddComponent<ParticleSystem>(); p.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
            var main = p.main; main.loop=false; main.playOnAwake=false; main.duration=Mathf.Max(.05f,lifetime); main.startDelay=delay;
            main.startLifetime=lifetime; main.startSpeed=0; main.startSize3D=true; main.startSizeX=width; main.startSizeY=height; main.startSizeZ=1;
            main.startColor=color; main.maxParticles=64; main.simulationSpace=ParticleSystemSimulationSpace.World;
            main.cullingMode=ParticleSystemCullingMode.AlwaysSimulate; main.stopAction=ParticleSystemStopAction.None;
            p.useAutoRandomSeed=false; p.randomSeed=seed;
            var emission=p.emission; emission.rateOverTime=0; emission.SetBursts(new[]{new ParticleSystem.Burst(0,1)});
            var shape=p.shape; shape.enabled=false;
            var renderer=p.GetComponent<ParticleSystemRenderer>(); renderer.sharedMaterial=material;
            renderer.renderMode=ParticleSystemRenderMode.Billboard; renderer.alignment=ParticleSystemRenderSpace.View;
            renderer.maxParticleSize=10; renderer.minParticleSize=0; renderer.sortMode=ParticleSystemSortMode.Distance;
            renderer.shadowCastingMode=ShadowCastingMode.Off; renderer.receiveShadows=false;
            renderer.SetActiveVertexStreams(new List<ParticleSystemVertexStream>{ParticleSystemVertexStream.Position,ParticleSystemVertexStream.Color,ParticleSystemVertexStream.UV});
            return p;
        }
        static void Fade(ParticleSystem p, Gradient gradient) { var c=p.colorOverLifetime; c.enabled=true; c.color=gradient; }
        static void Size(ParticleSystem p, AnimationCurve curve) { var s=p.sizeOverLifetime; s.enabled=true; s.size=new ParticleSystem.MinMaxCurve(1,curve); }
        static void Velocity(ParticleSystem p, Vector3 vector)
        {
            var v=p.velocityOverLifetime; v.enabled=true; v.space=ParticleSystemSimulationSpace.World;
            var slow=Curve(0,1,.06f,.4f,.15f,.03f,1,0); v.x=new ParticleSystem.MinMaxCurve(vector.x,slow); v.y=new ParticleSystem.MinMaxCurve(vector.y,slow); v.z=new ParticleSystem.MinMaxCurve(vector.z,slow);
        }
        static void Atlas(ParticleSystem p, int variant)
        {
            var sheet=p.textureSheetAnimation; sheet.enabled=true; sheet.numTilesX=2; sheet.numTilesY=1;
            sheet.animation=ParticleSystemAnimationType.WholeSheet; sheet.frameOverTime=0; sheet.startFrame=variant*.5f; sheet.cycleCount=1;
        }
        static void Smoke(Transform group)
        {
            for (int i=0;i<14;i++)
            {
                float angle=i*2.399963f; bool outer=i<9;
                var radial=new Vector3(Mathf.Cos(angle),0,Mathf.Sin(angle));
                bool lowCenter=i==13;
                float r=lowCenter?0:outer?.24f:.12f; float y=lowCenter?.3f:outer?.14f:.3f;
                float w=lowCenter?1.7f:outer?1.42f:1.62f; float h=lowCenter?1.3f:outer?1.14f:1.35f;
                var p=Particle(group,"Puff_"+i,smoke,.03f,2.97f,w,h,Color.white,(uint)(510+i));
                p.transform.localPosition=radial*r+Vector3.up*y+(lowCenter?Vector3.forward*.25f:Vector3.zero);
                bool front=Vector3.Dot(radial,View)>.25f;
                Color warm=front?new Color(.83f,.27f,.055f):new Color(.32f,.19f,.13f);
                var gradient=new Gradient();
                gradient.SetKeys(new[]{new GradientColorKey(warm,0),new GradientColorKey(new Color(.19f,.105f,.075f),.25f),new GradientColorKey(new Color(.10f,.095f,.10f),.55f),new GradientColorKey(new Color(.12f,.12f,.13f),1)},new[]{new GradientAlphaKey(.02f,0),new GradientAlphaKey(.94f,.035f),new GradientAlphaKey(.94f,.62f),new GradientAlphaKey(0,1)});
                Fade(p,gradient); Size(p,Curve(0,.22f,.07f,.72f,.14f,1,.65f,1.07f,1,1.14f));
                Velocity(p,lowCenter?Vector3.up*.7f:radial*(outer?4f:1.3f)+Vector3.up*(outer?1.1f:3.5f));
                var rotation=p.rotationOverLifetime; rotation.enabled=true; rotation.z=(i%2==0?1:-1)*.12f;
                var main=p.main;main.startRotation=(i%5-2)*.12f;
            }
        }
        static void Impact(Transform group)
        {
            for(int i=0;i<9;i++)
            {
                float a=i*2.399963f;
                Vector3 dir=new Vector3(Mathf.Cos(a),.42f+(i%3)*.42f,Mathf.Sin(a)).normalized;
                float length=1.9f+(i%4)*.19f, width=i%2==0?.76f:.52f;
                var anchor=Vector3.up*.15f;
                for(int pass=0;pass<2;pass++)
                {
                    var p=Particle(group,(pass==0?"Body_":"Tip_")+i,pass==0?body:tip,0,.45f,width,length,pass==0?Orange:Yellow,(uint)(700+i));
                    p.transform.localPosition=anchor;
                    Vector3 normal=(View-Vector3.Dot(View,dir)*dir).normalized;
                    p.transform.rotation=Quaternion.LookRotation(normal,dir);
                    var renderer=p.GetComponent<ParticleSystemRenderer>();renderer.alignment=ParticleSystemRenderSpace.Local;
                    renderer.pivot=new Vector3(0,.4f,0); renderer.sortingFudge=pass==0?-.05f:-.06f;
                    Atlas(p,i%2);Size(p,Curve(0,.08f,.18f,.93f,.32f,1,.7f,1.08f,1,1.12f));
                    Fade(p,Gradient(Color.white,Color.white,0,0,.04f,1,.4f,.95f,.75f,.3f,1,0));
                    Velocity(p,dir*.55f);
                }
            }
        }
        static void Center(Transform group)
        {
            var c=Particle(group,"Core",core,0,.12f,1.05f,.8f,new Color(1,.92f,.65f),11); c.transform.localPosition=Vector3.up*.28f;
            Size(c,Curve(0,.3f,.12f,1,.6f,1.1f,1,.9f));Fade(c,Gradient(Color.white,Color.white,0,.5f,.08f,1,.5f,.7f,1,0));
            var h=Particle(group,"Halo",halo,0,.12f,2.2f,1.5f,new Color(1,.25f,.015f,.6f),12);h.transform.localPosition=Vector3.up*.23f;
            Size(h,Curve(0,.3f,.2f,1,1,1.15f));Fade(h,Gradient(Color.white,Color.white,0,0,.12f,.7f,1,0));
        }
        static Mesh Rock(string name, bool alternate)
        {
            string path=Root+"/Meshes/"+name+".asset"; var old=AssetDatabase.LoadAssetAtPath<Mesh>(path);
            Vector3[] points={new Vector3(0, .65f,0),new Vector3(0,-.45f,0),new Vector3(-.5f,0,0),new Vector3(.65f,.05f,0),new Vector3(0,.1f,.45f),new Vector3(.08f,-.1f,-.42f)};
            int[] triangles={0,4,3,0,2,4,0,5,2,0,3,5,1,3,4,1,4,2,1,2,5,1,5,3};
            var vertices=new Vector3[24]; var indices=new int[24];var colors=new Color[24];
            for(int i=0;i<24;i+=3)
            {
                for(int j=0;j<3;j++){Vector3 pt=points[triangles[i+j]];if(alternate)pt=Vector3.Scale(pt,new Vector3(.8f,1.25f,.7f))+new Vector3(pt.y*.18f,0,0);vertices[i+j]=pt;indices[i+j]=i+j;}
                var n=Vector3.Cross(vertices[i+1]-vertices[i],vertices[i+2]-vertices[i]).normalized;
                float light=.32f+.45f*Mathf.Max(0,Vector3.Dot(n,View));var shade=new Color(light*.85f,light*.72f,light*.58f);
                for(int j=0;j<3;j++)colors[i+j]=shade;
            }
            // Use packed colors for the native mesh-particle color stream.
            var mesh=old?old:new Mesh();mesh.Clear();mesh.name=name;mesh.vertices=vertices;mesh.triangles=indices;
            mesh.colors32=colors.Select(c=>(Color32)c).ToArray();mesh.uv=new Vector2[24];mesh.RecalculateNormals();mesh.RecalculateBounds();
            if(!old)AssetDatabase.CreateAsset(mesh,path);else EditorUtility.SetDirty(mesh);return mesh;
        }
        static void Debris(Transform group,Mesh a,Mesh b)
        {
            for(int i=0;i<2;i++)
            {
                var p=Particle(group,"Stones_"+i,debris,0,1.6f,.21f,.21f,Color.white,(uint)(900+i));
                var main=p.main;main.startColor=new Color(.48f,.36f,.24f);main.startSize3D=false;main.startSize=new ParticleSystem.MinMaxCurve(.18f,.34f);main.startSpeed=new ParticleSystem.MinMaxCurve(2.3f,4.2f);main.gravityModifier=.7f;
                main.startRotation3D=true;main.startRotationX=new ParticleSystem.MinMaxCurve(-3,3);main.startRotationY=new ParticleSystem.MinMaxCurve(-3,3);
                var shape=p.shape;shape.enabled=true;shape.shapeType=ParticleSystemShapeType.Cone;shape.angle=68;shape.radius=.18f;
                p.transform.localPosition=Vector3.up*.2f;p.transform.localRotation=Quaternion.Euler(-90,0,0);
                var e=p.emission;e.SetBursts(new[]{new ParticleSystem.Burst(0,7)});
                var r=p.GetComponent<ParticleSystemRenderer>();r.renderMode=ParticleSystemRenderMode.Mesh;r.mesh=i==0?a:b;r.enableGPUInstancing=false;
                r.SetActiveVertexStreams(new List<ParticleSystemVertexStream>{ParticleSystemVertexStream.Position,ParticleSystemVertexStream.Color,ParticleSystemVertexStream.UV});
                var rotation=p.rotationOverLifetime;rotation.enabled=true;rotation.separateAxes=true;rotation.x=1.8f;rotation.y=2.3f;rotation.z=1.2f;
                Fade(p,Gradient(Color.white,Color.white,0,1,.68f,1,1,0));
            }
        }
        static void Cracks(Transform group)
        {
            for(int i=0;i<7;i++)
            {
                float a=i*2.399963f;float length=2.6f+(i%3)*.13f;
                for(int pass=0;pass<2;pass++)
                {
                    float delay=i*.012f, life=pass==0?2.4f-delay:.68f-delay;
                    var p=Particle(group,(pass==0?"Dark_":"Hot_")+i,pass==0?crackDark:crackHot,delay,life,length,.75f,pass==0?new Color(.045f,.03f,.025f,.84f):new Color(1,.22f,.01f,.62f),(uint)(1100+i));
                    p.transform.localPosition=Vector3.up*(pass==0?.012f:.014f);
                    Vector3 outward=new Vector3(Mathf.Cos(a),0,Mathf.Sin(a));
                    p.transform.rotation=Quaternion.LookRotation(Vector3.up,Vector3.Cross(Vector3.up,outward));
                    var r=p.GetComponent<ParticleSystemRenderer>();r.alignment=ParticleSystemRenderSpace.Local;r.pivot=new Vector3(.42f,0,0);
                    var size=p.sizeOverLifetime;size.enabled=true;size.separateAxes=true;
                    float opening=Mathf.Clamp01((.18f-delay)/life);size.x=new ParticleSystem.MinMaxCurve(1,Curve(0,.02f,opening,1,1,1));size.y=1;size.z=1;
                    Fade(p,Gradient(Color.white,Color.white,0,0,.025f,1,pass==0?.72f:.25f,1,1,0));
                }
            }
        }
        static void CreateScene()
        {
            var scene=EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
            var instance=(GameObject)PrefabUtility.InstantiatePrefab(AssetDatabase.LoadAssetAtPath<GameObject>(Root+"/Prefabs/VFX_StrongExplosion.prefab"));
            var camera=new GameObject("DemoCamera").AddComponent<Camera>();camera.tag="MainCamera";camera.orthographic=true;camera.orthographicSize=2.9f;
            camera.transform.position=new Vector3(6,5,-8);camera.transform.LookAt(new Vector3(0,.65f,0));camera.clearFlags=CameraClearFlags.SolidColor;
            camera.backgroundColor=new Color(.075f,.085f,.105f);camera.nearClipPlane=.05f;camera.farClipPlane=100;camera.allowHDR=false;
            var floor=GameObject.CreatePrimitive(PrimitiveType.Plane);floor.name="Neutral flat ground";floor.transform.localScale=Vector3.one*2;
            UnityEngine.Object.DestroyImmediate(floor.GetComponent<Collider>());
            // The opaque built-in floor stays before transparent cracks; no ninth material asset is created.
            floor.GetComponent<Renderer>().sharedMaterial=AssetDatabase.GetBuiltinExtraResource<Material>("Default-Material.mat");
            var floorBlock=new MaterialPropertyBlock();floorBlock.SetColor("_Color",new Color(.28f,.3f,.34f));floor.GetComponent<Renderer>().SetPropertyBlock(floorBlock);
            var light=new GameObject("DemoDirectionalLight").AddComponent<Light>();light.type=LightType.Directional;light.intensity=.38f;light.transform.rotation=Quaternion.Euler(55,-25,0);
            RenderSettings.ambientLight=new Color(.18f,.19f,.22f);
            var driver=new GameObject("DemoDriver (outside prefab)").AddComponent<StrongExplosionDemo>();driver.effect=instance;driver.demoCamera=camera;
            EditorSceneManager.SaveScene(scene,Root+"/Scenes/StrongExplosion_Demo.unity");
        }
    }
}
#endif
