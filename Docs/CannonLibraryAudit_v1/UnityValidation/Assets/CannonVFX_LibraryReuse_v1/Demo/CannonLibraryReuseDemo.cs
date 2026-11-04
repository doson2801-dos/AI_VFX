using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine;

namespace CannonLibraryReuse
{
    public sealed class CannonLibraryReuseDemo : MonoBehaviour
    {
        public GameObject muzzle, impact;
        public Camera demoCamera;
        public Bounds muzzleBounds, impactBounds;
        [Tooltip("Demo offset only. Not projectile travel time or gameplay timing.")]
        public float demoHitDelay = 0.7f;
        public bool loop;
        string state = "Stopped";
        Coroutine sequence;

        public static ParticleSystem[] Roots(GameObject go)
        {
            var all = go.GetComponentsInChildren<ParticleSystem>(true);
            return all.Where(p => !all.Any(a => a != p && p.transform.IsChildOf(a.transform))).ToArray();
        }
        public static void Emit(GameObject go) { foreach (var p in Roots(go)) p.Play(true); }
        public static void Clear(GameObject go) { foreach (var p in Roots(go)) p.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear); }
        public static bool Alive(GameObject go) { return Roots(go).Any(p => p.IsAlive(true)); }
        public static int Count(GameObject go) { return go.GetComponentsInChildren<ParticleSystem>(true).Sum(p => p.particleCount); }
        void Start()
        {
            if (Application.isBatchMode && Environment.GetCommandLineArgs().Contains("-cannonValidatePlay")) StartCoroutine(ValidatePlay());
            else PlaySequence();
        }
        public void Stop()
        {
            if (sequence != null) StopCoroutine(sequence);
            sequence = null; Clear(muzzle); Clear(impact); state = "Stopped / cleared";
        }
        public void PlaySequence() { Stop(); sequence = StartCoroutine(Sequence()); }
        IEnumerator Sequence()
        {
            do
            {
                state = "Muzzle"; Emit(muzzle);
                yield return new WaitForSeconds(demoHitDelay);
                state = "Impact (demo delay)"; Emit(impact);
                while (Alive(muzzle) || Alive(impact)) yield return null;
                state = "Finished naturally";
                if (loop) yield return new WaitForSeconds(0.6f);
            } while (loop);
            sequence = null;
        }
        public void PlayLayer(bool fire)
        {
            Stop(); state = fire ? "Muzzle only" : "Impact only"; Emit(fire ? muzzle : impact);
        }
        public void SetView(Bounds b)
        {
            demoCamera.orthographic = true;
            var direction = new Vector3(6, 4, -8).normalized;
            demoCamera.transform.position = b.center + direction * 18;
            demoCamera.transform.LookAt(b.center);
            var right = demoCamera.transform.right; var up = demoCamera.transform.up;
            var e = b.extents;
            float width = Mathf.Abs(right.x)*e.x+Mathf.Abs(right.y)*e.y+Mathf.Abs(right.z)*e.z;
            float height = Mathf.Abs(up.x)*e.x+Mathf.Abs(up.y)*e.y+Mathf.Abs(up.z)*e.z;
            demoCamera.orthographicSize = Mathf.Max(0.7f, Mathf.Max(height, width / Mathf.Max(0.1f, demoCamera.aspect)) * 1.3f);
        }
        void OnGUI()
        {
            if (Application.isBatchMode) return;
            GUILayout.BeginArea(new Rect(15,15,460,170), GUI.skin.box);
            GUILayout.Label("Cannon library reuse / Built-in / source timing");
            GUILayout.Label(state + " | Hit offset: " + demoHitDelay + "s (demo only)");
            GUILayout.BeginHorizontal();
            if (GUILayout.Button("Sequence / Replay")) { var b=muzzleBounds; b.Encapsulate(impactBounds); SetView(b); PlaySequence(); }
            if (GUILayout.Button("Stop / clear")) Stop();
            loop = GUILayout.Toggle(loop,"Loop demo");
            GUILayout.EndHorizontal(); GUILayout.BeginHorizontal();
            if (GUILayout.Button("Muzzle only")) { SetView(muzzleBounds); PlayLayer(true); }
            if (GUILayout.Button("Impact only")) { SetView(impactBounds); PlayLayer(false); }
            GUILayout.EndHorizontal();
            GUILayout.Label("No cannon model supplied. Anchors are demo positions.");
            GUILayout.EndArea();
        }

        [Serializable] class PlayReport
        {
            public string unity, pipeline="Built-in", validation="Actual Play mode; fixed capture timestep 1/30s";
            public bool completed, stopClears, muzzleEnds, impactEnds, replayEmits, loopRepeats;
            public int muzzlePeak, impactPeak, framesPerClip=120, framesPerSecond=30;
            public float demoHitDelay;
            public List<string> errors=new List<string>();
        }
        string ReportRoot()
        {
            var args=Environment.GetCommandLineArgs(); int i=Array.IndexOf(args,"-cannonReport");
            return i>=0 && i+1<args.Length ? args[i+1] : Path.GetFullPath("Library/CannonValidation");
        }
        void Capture(string folder, int frame)
        {
            var old=RenderTexture.active; var oldTarget=demoCamera.targetTexture;
            var rt=RenderTexture.GetTemporary(384,384,24,RenderTextureFormat.ARGB32);
            var tex=new Texture2D(384,384,TextureFormat.RGB24,false);
            try
            {
                demoCamera.targetTexture=rt; demoCamera.Render(); RenderTexture.active=rt;
                tex.ReadPixels(new Rect(0,0,384,384),0,0); tex.Apply();
                File.WriteAllBytes(Path.Combine(folder,frame.ToString("D3")+".png"),tex.EncodeToPNG());
            }
            finally { demoCamera.targetTexture=oldTarget; RenderTexture.active=old; RenderTexture.ReleaseTemporary(rt); Destroy(tex); }
        }
        IEnumerator ValidatePlay()
        {
            var dir=ReportRoot(); Directory.CreateDirectory(dir);
            var report=new PlayReport { unity=Application.unityVersion, demoHitDelay=demoHitDelay };
            Time.captureFramerate=30; Clear(muzzle); Clear(impact);
            for (int clip=0;clip<3;clip++)
            {
                Clear(muzzle); Clear(impact);
                var b=clip==0?muzzleBounds:impactBounds;
                if(clip==2) { b=muzzleBounds; b.Encapsulate(impactBounds); }
                SetView(b);
                string frames=Path.Combine(dir,new[]{"Muzzle","Impact","Sequence"}[clip]); Directory.CreateDirectory(frames);
                if(clip==1) Emit(impact); else Emit(muzzle);
                for(int frame=0;frame<120;frame++)
                {
                    if(clip==2 && frame==Mathf.RoundToInt(demoHitDelay*30)) Emit(impact);
                    yield return null;
                    report.muzzlePeak=Mathf.Max(report.muzzlePeak,Count(muzzle));
                    report.impactPeak=Mathf.Max(report.impactPeak,Count(impact));
                    Capture(frames,frame);
                }
            }
            Clear(muzzle); Clear(impact); Emit(muzzle); Emit(impact);
            for(int f=0;f<6;f++) yield return null;
            report.replayEmits=Count(muzzle)>0 && Count(impact)>0;
            Clear(muzzle); Clear(impact); report.stopClears=Count(muzzle)==0 && Count(impact)==0 && !Alive(muzzle) && !Alive(impact);
            for(int cycle=0;cycle<2;cycle++)
            {
                Emit(muzzle); Emit(impact);
                for(int f=0;f<6;f++) yield return null;
                bool emitted=Count(muzzle)>0 && Count(impact)>0;
                if(!emitted) report.errors.Add("Loop cycle "+cycle+" failed to emit.");
                int elapsed=0;
                while((Alive(muzzle)||Alive(impact)) && elapsed++<900) yield return null;
                report.muzzleEnds=!Alive(muzzle); report.impactEnds=!Alive(impact);
                if(!report.muzzleEnds || !report.impactEnds) { report.errors.Add("Native tail exceeded 30s."); break; }
                yield return null;
            }
            report.loopRepeats=report.errors.Count==0 && report.replayEmits;
            report.completed=true;
            File.WriteAllText(Path.Combine(dir,"PlayReport.json"),JsonUtility.ToJson(report,true));
            Time.captureFramerate=0;
            File.WriteAllText(Path.Combine(dir,"PlayValidation.done"),"done");
        }
    }
}
