using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine;

namespace StrongExplosionV1
{
    public sealed class StrongExplosionDemo : MonoBehaviour
    {
        public GameObject effect;
        public Camera demoCamera;
        public bool loop;
        Coroutine running;
        ParticleSystem[] Systems => effect.GetComponentsInChildren<ParticleSystem>(true);
        public void Clear() { foreach(var p in Systems)p.Stop(false,ParticleSystemStopBehavior.StopEmittingAndClear); }
        public void Play() { Clear(); foreach(var p in Systems)p.Play(false); }
        void OnDisable() { if(effect) Clear(); }
        void Start()
        {
            var floor=GameObject.Find("Neutral flat ground");
            if(floor) {var block=new MaterialPropertyBlock();block.SetColor("_Color",new Color(.28f,.3f,.34f));floor.GetComponent<Renderer>().SetPropertyBlock(block);}
            if(Application.isBatchMode && Environment.GetCommandLineArgs().Contains("-strongValidate")) running=StartCoroutine(Validate());
            else running=StartCoroutine(DemoLoop());
        }
        IEnumerator DemoLoop() { do {Play();yield return new WaitForSeconds(3.5f);} while(loop);running=null; }
        void OnGUI()
        {
            if(Application.isBatchMode)return;
            GUILayout.BeginArea(new Rect(16,16,350,110),GUI.skin.box);GUILayout.Label("Strong Explosion v1 / Built-in");
            if(GUILayout.Button("Replay")) {if(running!=null)StopCoroutine(running);Play();}
            if(GUILayout.Button("Stop / clear")) {if(running!=null)StopCoroutine(running);Clear();}
            GUILayout.EndArea();
        }
        [Serializable] sealed class Report
        {
            public string unity, pipeline="Built-in", method="Actual Play Mode; camera render; captureFramerate=60";
            public bool completed, naturalEnd, stopClears, lateStopClears, replayEmits, disableClears, poolReplay, worldSpace, pauseStable;
            public int peakParticles, rendererCount, materialCount;
            public List<string> samples=new List<string>(),errors=new List<string>();
        }
        void Capture(string path)
        {
            var previous=RenderTexture.active;var target=demoCamera.targetTexture;
            var rt=RenderTexture.GetTemporary(960,640,24);var image=new Texture2D(960,640,TextureFormat.RGB24,false);
            try {demoCamera.targetTexture=rt;demoCamera.Render();RenderTexture.active=rt;image.ReadPixels(new Rect(0,0,960,640),0,0);image.Apply();File.WriteAllBytes(path,image.EncodeToPNG());}
            finally{demoCamera.targetTexture=target;RenderTexture.active=previous;RenderTexture.ReleaseTemporary(rt);Destroy(image);}
        }
        IEnumerator Validate()
        {
            const string dir="Docs/StrongExplosion/Validation";Directory.CreateDirectory(dir+"/Frames");
            var report=new Report{unity=Application.unityVersion}; Time.captureFramerate=60;
            Application.logMessageReceived+=(message,trace,type)=>{if(type==LogType.Error||type==LogType.Exception)report.errors.Add(message);};
            report.rendererCount=Systems.Length;report.materialCount=Systems.Select(p=>p.GetComponent<ParticleSystemRenderer>().sharedMaterial).Distinct().Count();
            Play();
            for(int frame=0;frame<=192;frame++)
            {
                yield return null;int count=Systems.Sum(p=>p.particleCount);report.peakParticles=Mathf.Max(count,report.peakParticles);
                if(frame%2==0)Capture(dir+"/Frames/"+frame.ToString("D3")+".png");
                if(new[]{3,6,18,27,48,96,144,180,192}.Contains(frame))report.samples.Add((frame/60f).ToString("F3")+"s: "+count+" particles; "+string.Join(", ",effect.transform.Cast<Transform>().Select(g=>g.name+"="+g.GetComponentsInChildren<ParticleSystem>().Sum(p=>p.particleCount))));
            }
            report.naturalEnd=Systems.All(p=>p.particleCount==0&&!p.IsAlive(false));
            Clear();foreach(var p in effect.transform.Find("Debris").GetComponentsInChildren<ParticleSystem>())p.Play(false);
            yield return new WaitForSeconds(.3f);Capture(dir+"/DebrisOnly.png");Clear();
            Play();yield return new WaitForSeconds(.1f);Clear();report.stopClears=Systems.All(p=>p.particleCount==0);
            Play();yield return new WaitForSeconds(.8f);Clear();report.lateStopClears=Systems.All(p=>p.particleCount==0);
            Play();yield return new WaitForSeconds(.12f);report.replayEmits=Systems.Sum(p=>p.particleCount)>0;
            effect.SetActive(false);yield return null;report.disableClears=Systems.All(p=>p.particleCount==0);effect.SetActive(true);
            Play();yield return new WaitForSeconds(.12f);report.poolReplay=Systems.Sum(p=>p.particleCount)>0;
            var puff=Systems.First(p=>p.name=="Puff_0");var particles=new ParticleSystem.Particle[64];int n=puff.GetParticles(particles);
            Vector3 position=n>0?particles[0].position:Vector3.zero;effect.transform.position=Vector3.right*5;
            puff.GetParticles(particles);report.worldSpace=n>0&&Vector3.Distance(position,particles[0].position)<.001f;effect.transform.position=Vector3.zero;
            Time.timeScale=0;yield return null;float age=puff.time;yield return null;yield return null;report.pauseStable=Mathf.Abs(puff.time-age)<.001f;Time.timeScale=1;
            Clear();
            report.completed=report.naturalEnd&&report.stopClears&&report.lateStopClears&&report.replayEmits&&report.disableClears&&report.poolReplay&&report.worldSpace&&report.pauseStable&&report.errors.Count==0;
            File.WriteAllText(dir+"/PlayReport.json",JsonUtility.ToJson(report,true));Time.captureFramerate=0;
            #if UNITY_EDITOR
            UnityEditor.EditorApplication.Exit(report.completed?0:2);
            #endif
        }
    }
}
