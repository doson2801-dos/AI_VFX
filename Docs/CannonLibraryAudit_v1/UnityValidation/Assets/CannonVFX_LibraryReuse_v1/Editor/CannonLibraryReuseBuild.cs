#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;

namespace CannonLibraryReuse.Editor
{
    [InitializeOnLoad]
    public static class CannonLibraryReuseBuild
    {
        const string Root="Assets/CannonVFX_LibraryReuse_v1";
        const string Sources=Root+"/Sources/VFX/Gameplay/RPG/";
        public const string Demo=Root+"/Scenes/CannonLibraryReuse_Demo.unity";
        static bool leavingPlay;
        static CannonLibraryReuseBuild() { EditorApplication.update+=CheckPlayCompletion; }
        static string Arg(string key,string fallback)
        { var a=Environment.GetCommandLineArgs();int i=Array.IndexOf(a,key);return i>=0&&i+1<a.Length?a[i+1]:fallback; }
        static string Reports { get { return Arg("-cannonReport",Path.GetFullPath("Docs/CannonLibraryAudit_v1/RuntimeValidation")); } }
        static void CheckPlayCompletion()
        {
            if(!Application.isBatchMode || !Environment.GetCommandLineArgs().Contains("-cannonValidatePlay"))return;
            if(!SessionState.GetBool("CannonPlaybackRequested",false))return;
            if(!File.Exists(Path.Combine(Reports,"PlayValidation.done")))return;
            if(EditorApplication.isPlaying) { leavingPlay=true;EditorApplication.isPlaying=false;return; }
            if(leavingPlay || !EditorApplication.isPlayingOrWillChangePlaymode) EditorApplication.Exit(0);
        }
        [Serializable] class MaterialFact { public string path,shader,shaderPath;public bool supported;public string[] keywords,errors; }
        [Serializable] class ParticleFact
        { public string prefab,hierarchy,simulationSpace;public bool active,rendererEnabled,loop,playOnAwake,emission,customData,textureSheet;public string[] streams,materials;public float duration;public int maxParticles; }
        [Serializable] class TechnicalReport
        { public string unity,pipeline;public bool completed;public List<string> errors=new List<string>();public List<MaterialFact> materials=new List<MaterialFact>();public List<ParticleFact> particles=new List<ParticleFact>(); }
        static TechnicalReport Audit()
        {
            var r=new TechnicalReport { unity=Application.unityVersion,pipeline=GraphicsSettings.currentRenderPipeline==null?"Built-in":GraphicsSettings.currentRenderPipeline.GetType().FullName };
            if(GraphicsSettings.currentRenderPipeline!=null)r.errors.Add("Expected Built-in pipeline.");
            foreach(var file in Directory.GetFiles(Root,"*",SearchOption.AllDirectories).Where(f=>f.EndsWith(".shadergraph")||f.EndsWith(".shadersubgraph")))
            {
                var text=File.ReadAllText(file).Replace("\\\"","\"");
                foreach(Match match in Regex.Matches(text,"\"(?:guid|m_Guid)\"\\s*:\\s*\"([a-f0-9]{32})\""))
                {
                    var guid=match.Groups[1].Value;
                    if(!guid.StartsWith("00000000")&&string.IsNullOrEmpty(AssetDatabase.GUIDToAssetPath(guid)))r.errors.Add("Unresolved graph dependency "+guid+" in "+file);
                }
            }
            foreach(var guid in AssetDatabase.FindAssets("t:Material",new[]{Root}))
            {
                var path=AssetDatabase.GUIDToAssetPath(guid);var m=AssetDatabase.LoadAssetAtPath<Material>(path);
                var shader=m.shader;
                var errors=shader==null?new[]{"Missing shader"}:ShaderUtil.GetShaderMessages(shader).Where(x=>x.severity==UnityEditor.Rendering.ShaderCompilerMessageSeverity.Error).Select(x=>x.message+" @ "+x.file+":"+x.line).ToArray();
                if(shader==null || shader.name=="Hidden/InternalErrorShader" || errors.Length>0)r.errors.Add("Shader failure: "+path+" / "+string.Join(";",errors));
                r.materials.Add(new MaterialFact { path=path,shader=shader==null?"MISSING":shader.name,shaderPath=shader==null?null:AssetDatabase.GetAssetPath(shader),supported=shader!=null&&shader.isSupported,keywords=m.shaderKeywords,errors=errors });
            }
            foreach(var prefabPath in new[]{Sources+"VFX_Cannon_Shoot.prefab",Sources+"VFX_Cannon_Impact_InUse.prefab"})
            {
                GameObject go=null;
                try
                {
                    go=PrefabUtility.LoadPrefabContents(prefabPath);
                    foreach(var tr in go.GetComponentsInChildren<Transform>(true))if(GameObjectUtility.GetMonoBehavioursWithMissingScriptCount(tr.gameObject)>0)r.errors.Add("Missing script: "+tr.name);
                    if(go.GetComponentsInChildren<MonoBehaviour>(true).Any(x=>x!=null))r.errors.Add("Unexpected runtime MonoBehaviour: "+prefabPath);
                    foreach(var ps in go.GetComponentsInChildren<ParticleSystem>(true))
                    {
                        var pr=ps.GetComponent<ParticleSystemRenderer>();var streams=new List<ParticleSystemVertexStream>();pr.GetActiveVertexStreams(streams);
                        var path=ps.transform.name;var parent=ps.transform.parent;while(parent!=null&&parent.IsChildOf(go.transform)){path=parent.name+"/"+path;parent=parent.parent;}
                        if(pr.sharedMaterials.Any(m=>m==null))r.errors.Add("Missing material: "+path);
                        r.particles.Add(new ParticleFact { prefab=prefabPath,hierarchy=path,active=ps.gameObject.activeInHierarchy,rendererEnabled=pr.enabled,loop=ps.main.loop,playOnAwake=ps.main.playOnAwake,duration=ps.main.duration,maxParticles=ps.main.maxParticles,simulationSpace=ps.main.simulationSpace.ToString(),emission=ps.emission.enabled,customData=ps.customData.enabled,textureSheet=ps.textureSheetAnimation.enabled,streams=streams.Select(x=>x.ToString()).ToArray(),materials=pr.sharedMaterials.Select(m=>m==null?"MISSING":m.name+" / "+m.shader.name).ToArray() });
                    }
                }
                catch(Exception ex){r.errors.Add(prefabPath+": "+ex);}
                finally{if(go!=null)PrefabUtility.UnloadPrefabContents(go);}
            }
            r.completed=r.errors.Count==0;return r;
        }
        static Bounds SampleBounds(GameObject go)
        {
            Bounds bounds=new Bounds(go.transform.position,Vector3.one*0.6f);bool found=false;
            foreach(var time in new[]{0.033f,0.10f,0.20f,0.50f,1f,2f})
            {
                foreach(var p in CannonLibraryReuseDemo.Roots(go))p.Simulate(time,true,true,false);
                foreach(var renderer in go.GetComponentsInChildren<ParticleSystemRenderer>(false))
                {
                    if(!renderer.enabled||renderer.GetComponent<ParticleSystem>().particleCount==0)continue;
                    var b=renderer.bounds;if(float.IsInfinity(b.size.x)||b.size.magnitude>1000)continue;
                    if(!found){bounds=b;found=true;}else bounds.Encapsulate(b);
                }
            }
            CannonLibraryReuseDemo.Clear(go);return bounds;
        }
        [MenuItem("Tools/Cannon Library/Build demo and validate source reuse")]
        public static void Build()
        {
            Directory.CreateDirectory(Reports);
            var catalog=PersonalVfxLibrary.Editor.VfxLibraryAudit.Run(new[]{Root+"/Sources"},Path.Combine(Reports,"UnityImportedCatalog.json"));
            if(!catalog.complete)throw new Exception("Imported source catalog incomplete; inspect errors.");
            var report=Audit();File.WriteAllText(Path.Combine(Reports,"UnityTechnicalReport.json"),JsonUtility.ToJson(report,true));
            if(!report.completed)throw new Exception("Cannon audit failed: "+string.Join("\n",report.errors));
            if(SceneManager.sceneCount>0&&Enumerable.Range(0,SceneManager.sceneCount).Any(i=>string.IsNullOrEmpty(SceneManager.GetSceneAt(i).path)))throw new InvalidOperationException("An open scene is Untitled. Save it before running the in-editor builder.");
            if(File.Exists(Demo)){Debug.Log("Cannon demo already exists; preserved. Audit updated.");return;}
            var previous=SceneManager.GetActiveScene();var scene=EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Additive);
            SceneManager.SetActiveScene(scene);
            try
            {
                var fireAnchor=new GameObject("MuzzleAnchor (demo position)");fireAnchor.transform.position=new Vector3(-2,1,0);
                var hitAnchor=new GameObject("HitAnchor (demo position)");hitAnchor.transform.position=new Vector3(2,0,0);
                var fire=(GameObject)PrefabUtility.InstantiatePrefab(AssetDatabase.LoadAssetAtPath<GameObject>(Sources+"VFX_Cannon_Shoot.prefab"),scene);fire.transform.SetParent(fireAnchor.transform,false);
                var hit=(GameObject)PrefabUtility.InstantiatePrefab(AssetDatabase.LoadAssetAtPath<GameObject>(Sources+"VFX_Cannon_Impact_InUse.prefab"),scene);hit.transform.SetParent(hitAnchor.transform,false);
                var cameraObject=new GameObject("DemoCamera");var camera=cameraObject.AddComponent<Camera>();camera.tag="MainCamera";camera.backgroundColor=new Color(0.045f,0.055f,0.075f);camera.clearFlags=CameraClearFlags.SolidColor;camera.nearClipPlane=0.05f;camera.farClipPlane=100;camera.allowHDR=true;
                var light=new GameObject("DemoLight").AddComponent<Light>();light.type=LightType.Directional;light.intensity=0.8f;light.transform.rotation=Quaternion.Euler(45,-35,0);
                var floor=GameObject.CreatePrimitive(PrimitiveType.Plane);floor.name="Neutral demo ground";floor.transform.position=new Vector3(0,-0.03f,0);floor.transform.localScale=Vector3.one*2;UnityEngine.Object.DestroyImmediate(floor.GetComponent<Collider>());
                var driver=new GameObject("DemoDriver (script outside prefabs)").AddComponent<CannonLibraryReuseDemo>();driver.muzzle=fire;driver.impact=hit;driver.demoCamera=camera;driver.muzzleBounds=SampleBounds(fire);driver.impactBounds=SampleBounds(hit);var b=driver.muzzleBounds;b.Encapsulate(driver.impactBounds);driver.SetView(b);
                Directory.CreateDirectory(Path.GetDirectoryName(Demo));EditorSceneManager.SaveScene(scene,Demo);
            }
            finally{EditorSceneManager.CloseScene(scene,true);if(previous.IsValid()&&previous.isLoaded)SceneManager.SetActiveScene(previous);}
            AssetDatabase.Refresh();Debug.Log("Cannon demo created: "+Demo);
        }
        public static void BuildBatch()
        {
            // A new batch project starts with an Untitled empty scene. Save this disposable scene only.
            if(string.IsNullOrEmpty(SceneManager.GetActiveScene().path))
            {Directory.CreateDirectory("Assets/CannonVFX_LibraryReuse_v1/Scenes");EditorSceneManager.SaveScene(SceneManager.GetActiveScene(),Root+"/Scenes/ValidationBootstrap.unity");}
            Build();
        }
        public static void PlayBatch()
        {
            Directory.CreateDirectory(Reports);var done=Path.Combine(Reports,"PlayValidation.done");if(File.Exists(done))File.Delete(done);
            SessionState.SetBool("CannonPlaybackRequested",true);
            EditorSceneManager.OpenScene(Demo,OpenSceneMode.Single);
            EditorApplication.isPlaying=true;
        }
        public static void ReframeAndPlayBatch()
        {
            var scene=EditorSceneManager.OpenScene(Demo,OpenSceneMode.Single);
            var driver=UnityEngine.Object.FindObjectOfType<CannonLibraryReuseDemo>();
            // Camera framing is independent from the broad conservative particle/mesh bounds.
            driver.muzzleBounds=new Bounds(driver.muzzle.transform.position+new Vector3(-1.2f,1.4f,0),new Vector3(6f,6f,6f));
            driver.impactBounds=new Bounds(driver.impact.transform.position+Vector3.up*0.1f,new Vector3(2.5f,2f,2.5f));
            var total=driver.muzzleBounds;total.Encapsulate(driver.impactBounds);driver.SetView(total);
            var ground=scene.GetRootGameObjects().FirstOrDefault(g=>g.name=="Neutral demo ground");
            if(ground!=null)ground.SetActive(false);
            EditorSceneManager.SaveScene(scene,Demo);
            PlayBatch();
        }
    }
}
#endif
