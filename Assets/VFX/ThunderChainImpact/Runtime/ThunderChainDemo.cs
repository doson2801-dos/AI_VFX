using UnityEngine;

namespace ThunderChain
{
    // Scene-only presentation. Neither impact prefab contains a controller.
    public class ThunderChainDemo : MonoBehaviour
    {
        public Transform origin;
        public Transform[] targets;
        public ParticleSystem strike;
        public ParticleSystem[] hits;
        public Material lineMaterial;
        public float interval = 2.8f;
        LineRenderer[,] lines;
        Renderer[] targetRenderers;
        MaterialPropertyBlock block;
        float elapsed;
        int lastCycle = -1;

        public void Prepare()
        {
            if (lines != null) return;
            lines = new LineRenderer[targets.Length,3];
            targetRenderers = new Renderer[targets.Length];
            block = new MaterialPropertyBlock();
            for(int i=0;i<targets.Length;i++)
            {
                targetRenderers[i]=targets[i].GetComponent<Renderer>();
                for(int j=0;j<3;j++)
                {
                    var go=new GameObject("Link_"+(i+1)+"_"+new[]{"Halo","Core","Branch"}[j]);
                    go.transform.SetParent(transform,false);
                    var lr=go.AddComponent<LineRenderer>(); lines[i,j]=lr;
                    lr.sharedMaterial=lineMaterial; lr.useWorldSpace=true;
                    lr.alignment=LineAlignment.View; lr.textureMode=LineTextureMode.Stretch;
                    lr.numCornerVertices=2; lr.numCapVertices=2;
                    lr.shadowCastingMode=UnityEngine.Rendering.ShadowCastingMode.Off;
                    lr.receiveShadows=false; lr.sortingOrder=10+j;
                    lr.widthCurve=new AnimationCurve(new Keyframe(0,.8f),new Keyframe(.3f,1),new Keyframe(.68f,.55f),new Keyframe(1,.15f));
                }
            }
        }

        void Start() { Prepare(); }
        void Update()
        {
            elapsed+=Time.deltaTime;
            if(Input.GetKeyDown(KeyCode.Space)){elapsed=0;lastCycle=-1;}
            int cycle=Mathf.FloorToInt(elapsed/interval);
            if(cycle!=lastCycle){lastCycle=cycle;strike.Stop(true,ParticleSystemStopBehavior.StopEmittingAndClear);strike.Play(true);}
            float t=elapsed%interval;
            for(int i=0;i<hits.Length;i++)
            {
                float arrival=.24f+i*.18f;
                if(t>=arrival && t-Time.deltaTime<arrival){hits[i].Stop(true,ParticleSystemStopBehavior.StopEmittingAndClear);hits[i].Play(true);}
            }
            Draw(t);
        }

        public void Sample(float t)
        {
            Prepare(); strike.Simulate(t,true,true,false);
            for(int i=0;i<hits.Length;i++)
            {
                float age=t-(.24f+i*.18f);
                hits[i].Stop(true,ParticleSystemStopBehavior.StopEmittingAndClear);
                if(age>=0) hits[i].Simulate(age,true,true,false);
            }
            Draw(t);
        }

        void Draw(float t)
        {
            for(int i=0;i<targets.Length;i++)
            {
                float age=t-(.12f+i*.18f);
                bool active=age>=0 && age<.64f;
                for(int j=0;j<3;j++) lines[i,j].enabled=active;
                float glow=Mathf.Clamp01(1-(t-(.24f+i*.18f))/.55f);
                if(t<.24f+i*.18f)glow=0;
                block.SetColor("_Color",Color.Lerp(new Color(.13f,.2f,.28f),new Color(1,.8f,.22f),glow));
                block.SetColor("_EmissionColor",new Color(1,.55f,.04f)*glow*.6f);
                targetRenderers[i].SetPropertyBlock(block);
                if(!active)continue;
                Vector3 a=i==0 ? origin.position+Vector3.up*.45f : targets[i-1].position+Vector3.up*.55f;
                Vector3 b=targets[i].position+Vector3.up*.55f;
                float progress=Mathf.Clamp01(age/.12f);
                Vector3 end=Vector3.Lerp(a,b,progress);
                Vector3 side=Vector3.Cross((b-a).normalized,Vector3.up).normalized;
                int seed=7919+i*97+Mathf.FloorToInt(age*24)*13;
                var rng=new System.Random(seed);
                var points=new Vector3[17];
                for(int k=0;k<points.Length;k++)
                {
                    float u=k/(float)(points.Length-1);
                    float envelope=Mathf.Sin(u*Mathf.PI);
                    points[k]=Vector3.Lerp(a,end,u)+side*((float)rng.NextDouble()-.5f)*.48f*envelope+Vector3.up*((float)rng.NextDouble()-.5f)*.18f*envelope;
                }
                float fade=Mathf.Clamp01((.64f-age)/.3f);
                float flicker=(Mathf.FloorToInt(age*30)%3==1)?.55f:1;
                SetLine(lines[i,0],points,.14f,new Color(1,.52f,.025f,.35f*fade*flicker));
                SetLine(lines[i,1],points,.038f,new Color(1,.98f,.76f,fade*flicker));
                Vector3 p=points[7];
                var branch=new[]{p,p+side*.18f+Vector3.up*.06f,p+side*.32f-Vector3.up*.1f,p+side*.5f-Vector3.up*.18f};
                SetLine(lines[i,2],branch,.019f,new Color(1,.75f,.16f,.65f*fade));
            }
        }
        static void SetLine(LineRenderer lr,Vector3[] points,float width,Color c)
        {
            lr.positionCount=points.Length;lr.SetPositions(points);lr.widthMultiplier=width;lr.startColor=c;lr.endColor=c;
        }
        void OnGUI()
        {
            GUI.color=new Color(1,.88f,.5f); GUI.Label(new Rect(24,18,500,30),"THUNDER CHAIN  /  3 TARGETS");
            GUI.color=Color.white; GUI.Label(new Rect(24,46,500,25),"Space: replay  |  Automatic loop 2.8s");
        }
    }
}
