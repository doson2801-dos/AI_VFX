#if UNITY_EDITOR
using System;
using System.IO;
using System.Linq;
using UnityEngine;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine.Rendering;
using Object=UnityEngine.Object;

namespace ThunderChain
{
    public static class ThunderChainImpactBuild
    {
        const string Root="Assets/VFX/ThunderChainImpact";
        const string Docs="Docs/VFX/ThunderChainImpact";
        static Material flash,ring,bolt,arcs,spark;
        static readonly Color Yellow=new Color(1,.77f,.14f);
        [MenuItem("VFX/ThunderChainImpact/Build Demo")]
        public static void Build()
        {
            if(!Application.isBatchMode&&!EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo())return;
            foreach(string sub in new[]{"Materials","Prefabs","Scenes"})Directory.CreateDirectory(Root+"/"+sub);
            Directory.CreateDirectory(Docs);AssetDatabase.Refresh();
            flash=Mat("Flash","Mobile/Particles/Additive","Assets/Library/glow/glow_004.png");
            ring=Mat("Ring","Mobile/Particles/Additive","Assets/Library/wave/wave_009.png");
            bolt=Mat("Bolt","Mobile/Particles/Additive","Assets/Library/Lightnings_Electrics/Lightnings_Electrics_025.png");
            arcs=Mat("Arcs","Mobile/Particles/Additive","Assets/Library/Lightnings_Electrics/Lightnings_Electrics_008.png");
            spark=Mat("Chain","Mobile/Particles/Additive",null);
            var primary=MakeImpact(true);var hit=MakeImpact(false);
            var scene=EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
            var cam=new GameObject("DemoCamera").AddComponent<Camera>();cam.tag="MainCamera";
            Vector3 look=new Vector3(0,1,0);cam.transform.position=look+new Vector3(0,12.124f,-7);cam.transform.LookAt(look);
            cam.orthographic=true;cam.orthographicSize=5.6f;cam.clearFlags=CameraClearFlags.SolidColor;cam.backgroundColor=new Color(.035f,.045f,.065f);
            var light=new GameObject("KeyLight").AddComponent<Light>();light.type=LightType.Directional;light.intensity=1.2f;light.transform.rotation=Quaternion.Euler(48,-30,0);
            RenderSettings.ambientLight=new Color(.32f,.36f,.44f);
            var floorMat=Mat("Floor","Standard",null);floorMat.color=new Color(.085f,.11f,.15f);floorMat.SetFloat("_Glossiness",.15f);
            var targetMat=Mat("Target","Standard",null);targetMat.color=new Color(.13f,.2f,.28f);targetMat.EnableKeyword("_EMISSION");targetMat.SetFloat("_Glossiness",.35f);
            var floor=GameObject.CreatePrimitive(PrimitiveType.Plane);floor.name="DemoFloor";floor.transform.localScale=Vector3.one*2;floor.GetComponent<Renderer>().sharedMaterial=floorMat;
            var demo=new GameObject("ThunderChainDemo").AddComponent<ThunderChainDemo>();demo.lineMaterial=spark;
            var origin=new GameObject("StrikePoint").transform;origin.position=new Vector3(-3.3f,.03f,-1.2f);demo.origin=origin;
            demo.strike=((GameObject)PrefabUtility.InstantiatePrefab(primary)).GetComponent<ParticleSystem>();demo.strike.transform.position=origin.position;
            Vector3[] positions={new Vector3(-1.4f,.8f,.1f),new Vector3(.9f,.8f,1.5f),new Vector3(3.2f,.8f,-.3f)};
            demo.targets=new Transform[3];demo.hits=new ParticleSystem[3];
            for(int i=0;i<3;i++)
            {
                var target=GameObject.CreatePrimitive(PrimitiveType.Capsule);target.name="Target_"+(i+1);target.transform.position=positions[i];target.transform.localScale=new Vector3(.65f,.8f,.65f);target.GetComponent<Renderer>().sharedMaterial=targetMat;demo.targets[i]=target.transform;
                var instance=(GameObject)PrefabUtility.InstantiatePrefab(hit);instance.name="Hit_Target_"+(i+1);instance.transform.position=new Vector3(positions[i].x,.04f,positions[i].z);demo.hits[i]=instance.GetComponent<ParticleSystem>();
                foreach(var p in instance.GetComponentsInChildren<ParticleSystem>()){var m=p.main;m.playOnAwake=false;}
                var label=new GameObject("Label_"+(i+1)).AddComponent<TextMesh>();label.text="0"+(i+1);label.fontSize=60;label.characterSize=.16f;label.anchor=TextAnchor.MiddleCenter;label.color=new Color(.8f,.87f,1);label.transform.position=positions[i]+new Vector3(0,1.35f,0);label.transform.rotation=cam.transform.rotation;
            }
            AssetDatabase.SaveAssets();EditorSceneManager.SaveScene(scene,Root+"/Scenes/ThunderChainImpact_Demo.unity");
            Capture(demo,cam);
            var errors=new[]{flash,ring,bolt,arcs,spark}.SelectMany(m=>ShaderUtil.GetShaderMessages(m.shader)).Where(m=>m.severity.ToString()=="Error").ToArray();
            demo.Sample(1.8f);
            bool residual=Object.FindObjectsOfType<ParticleSystem>().Any(p=>p.particleCount>0)||Object.FindObjectsOfType<LineRenderer>().Any(l=>l.enabled);
            File.WriteAllText(Docs+"/BuildReport.txt","Unity "+Application.unityVersion+" Built-in\nShader errors: "+errors.Length+"\nResidual at 1.8s: "+residual+"\nTargets: 3; links: 3; endpoint-following scene controller.\nPrimary prefab: 5 native systems; receiver prefab: 4.\nPreview: Unity sampled at 30 fps. Mobile not profiled.\n");
            if(errors.Length>0||residual)throw new Exception("QA failed; see BuildReport");
            Debug.Log("ThunderChainImpact build and capture OK");
        }
        public static void BuildBatch(){try{Build();EditorApplication.Exit(0);}catch(Exception e){Debug.LogException(e);EditorApplication.Exit(1);}}
        static Material Mat(string name,string shader,string texture)
        {
            string path=Root+"/Materials/M_ThunderChain_"+name+".mat";
            var m=AssetDatabase.LoadAssetAtPath<Material>(path);if(m==null){m=new Material(Shader.Find(shader));AssetDatabase.CreateAsset(m,path);}
            if(texture!=null)m.mainTexture=AssetDatabase.LoadAssetAtPath<Texture2D>(texture);
            EditorUtility.SetDirty(m);return m;
        }
        static GameObject MakeImpact(bool primary)
        {
            var root=new GameObject(primary?"VFX_ThunderChainImpact":"VFX_ThunderChainHit");
            var f=System(root,flash,.16f,primary?1.7f:1.1f,Color.white,5);Beats(f,primary,1);Fade(f,1,.1f);
            var w=Child(root,"GroundWave",ring,.42f,primary?3.2f:1.7f,Yellow,1);Ground(w);Beats(w,primary,1);Fade(w,.85f,0);
            var sz=w.sizeOverLifetime;sz.enabled=true;sz.size=new ParticleSystem.MinMaxCurve(1,AnimationCurve.Linear(0,.05f,1,1));
            var a=Child(root,"GroundArcs",arcs,.42f,primary?1.1f:.75f,Yellow,2);Ground(a);Beats(a,primary,5);Fade(a,1,0);
            var am=a.main;am.startRotation=new ParticleSystem.MinMaxCurve(0,6.283f);
            var sh=a.shape;sh.enabled=true;sh.shapeType=ParticleSystemShapeType.Circle;sh.radius=primary?.75f:.45f;
            var ts=a.textureSheetAnimation;ts.enabled=true;ts.numTilesX=3;ts.numTilesY=3;ts.frameOverTime=0;ts.startFrame=new ParticleSystem.MinMaxCurve(0,.999f);
            var s=Child(root,"ElectricSparks",flash,.3f,.065f,new Color(1,.92f,.5f),4);Beats(s,primary,9);Fade(s,1,0);
            var sm=s.main;sm.startSpeed=new ParticleSystem.MinMaxCurve(2,4);sm.startLifetime=new ParticleSystem.MinMaxCurve(.18f,.32f);
            var ss=s.shape;ss.enabled=true;ss.shapeType=ParticleSystemShapeType.Hemisphere;ss.radius=.05f;ss.rotation=new Vector3(-90,0,0);
            var sr=s.GetComponent<ParticleSystemRenderer>();sr.renderMode=ParticleSystemRenderMode.Stretch;sr.lengthScale=2;sr.velocityScale=.05f;sr.pivot=new Vector3(0,1,0);
            if(primary)
            {
                var b=Child(root,"ForkedSkyBolt",bolt,.15f,1,new Color(1,.9f,.48f),3);Beats(b,true,1);Fade(b,1,0);
                b.transform.localPosition=Vector3.up*2.5f;
                var bm=b.main;bm.startSize3D=true;bm.startSizeX=1.6f;bm.startSizeY=5;bm.startSizeZ=1;
                b.GetComponent<ParticleSystemRenderer>().alignment=ParticleSystemRenderSpace.Local;
            }
            var prefab=PrefabUtility.SaveAsPrefabAsset(root,Root+"/Prefabs/"+root.name+".prefab");Object.DestroyImmediate(root);return prefab;
        }
        static ParticleSystem Child(GameObject parent,string name,Material m,float life,float size,Color c,int order){var go=new GameObject(name);go.transform.SetParent(parent.transform,false);return System(go,m,life,size,c,order);}
        static ParticleSystem System(GameObject go,Material mat,float life,float size,Color c,int order)
        {
            var p=go.AddComponent<ParticleSystem>();p.Stop(true,ParticleSystemStopBehavior.StopEmittingAndClear);p.useAutoRandomSeed=false;p.randomSeed=923;
            var m=p.main;m.duration=1;m.loop=false;m.startLifetime=life;m.startSpeed=0;m.startSize=size;m.startColor=c;m.maxParticles=32;m.scalingMode=ParticleSystemScalingMode.Hierarchy;
            var e=p.emission;e.rateOverTime=0;var s=p.shape;s.enabled=false;
            var r=p.GetComponent<ParticleSystemRenderer>();r.sharedMaterial=mat;r.sortingOrder=order;r.maxParticleSize=5;r.shadowCastingMode=ShadowCastingMode.Off;r.receiveShadows=false;return p;
        }
        static void Beats(ParticleSystem p,bool three,int count){var e=p.emission;e.SetBursts(three?new[]{new ParticleSystem.Burst(0,(short)count),new ParticleSystem.Burst(.22f,(short)count),new ParticleSystem.Burst(.44f,(short)count)}:new[]{new ParticleSystem.Burst(0,(short)count)});}
        static void Fade(ParticleSystem p,float start,float end){var g=new Gradient();g.SetKeys(new[]{new GradientColorKey(Color.white,0),new GradientColorKey(Color.white,1)},new[]{new GradientAlphaKey(start,0),new GradientAlphaKey(start,.18f),new GradientAlphaKey(end,1)});var c=p.colorOverLifetime;c.enabled=true;c.color=g;}
        static void Ground(ParticleSystem p){p.transform.localRotation=Quaternion.Euler(90,0,0);p.transform.localPosition=Vector3.up*.03f;p.GetComponent<ParticleSystemRenderer>().alignment=ParticleSystemRenderSpace.Local;}
        static void Capture(ThunderChainDemo demo,Camera cam)
        {
            Directory.CreateDirectory(Docs+"/Frames");var rt=new RenderTexture(960,720,24);cam.targetTexture=rt;var image=new Texture2D(960,720,TextureFormat.RGB24,false);
            try{for(int i=0;i<54;i++){demo.Sample(i/30f);cam.Render();RenderTexture.active=rt;image.ReadPixels(new Rect(0,0,960,720),0,0);image.Apply();File.WriteAllBytes(Docs+"/Frames/"+i.ToString("D3")+".png",image.EncodeToPNG());}}
            finally{cam.targetTexture=null;RenderTexture.active=null;rt.Release();Object.DestroyImmediate(rt);Object.DestroyImmediate(image);}
        }
    }
}
#endif
