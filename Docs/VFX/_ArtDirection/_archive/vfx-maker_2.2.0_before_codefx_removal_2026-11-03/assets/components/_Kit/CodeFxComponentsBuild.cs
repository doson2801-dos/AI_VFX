#if UNITY_EDITOR
using System.IO;
using UnityEditor;
using UnityEngine;
using VfxKit;
using static VfxKit.VfxBuildKit;
using static VfxEffects.ComponentKit;

namespace VfxEffects
{
    // Components made entirely by code (codefx = /vfx-maker mode C, D:/Game_prj/VFX_LIb/.claude/skills/vfx-maker/codefx/). render.py writes for each effect:
    //   Textures/T_<name>_<grid>.png (add)  or  T_<name>_Body_<grid>.png + T_<name>_Light_<grid>.png (alpha)
    //   Textures/<name>.json  {name, blend, duration, cols, rows, size, pivot}
    // One particle = the whole effect as a flipbook: Start Lifetime = duration, Frame over Time 0 -> 1.
    public static class CodeFxComponentsBuild
    {
        const string Root = "Assets/VFX/_Components/CodeFX";
        const string DocsRoot = "Docs/VFX/_Components/CodeFX";

        [System.Serializable]
        class Space { public string context; public string plane; public string camera; public float width_m; public string anchor; public string background; }
        [System.Serializable]
        class Info { public string name; public string blend; public float duration; public int cols; public int rows; public float[] size; public float[] pivot; public Space space; }

        [MenuItem("VFX/Components/CodeFX - Build")]
        public static void Build()
        {
            if (!ConfirmSceneSwitch()) return;
            EnsureFolders(Root, "Materials", "Prefabs", "Scenes");
            // size, plane and preview height come from the effect's META.space (written by render.py into <name>.json)
            Make("IMP_Code_Air_01", "CFX_HitStar", 5,
                Load("Glow/Prefabs/CMP_GLW_Air_01"));
            Make("DST_Code_Ground_01", "CFX_PuffBurst", -2,
                Load("Impact/Prefabs/CMP_IMP_Hit_Ground_01"), Load("Glow/Prefabs/CMP_GLW_Ground_01"), Load("Ring/Prefabs/CMP_RNG_Ground_01"));
            AssetDatabase.SaveAssets();
            Debug.Log("[CodeFX] components built OK");
        }

        [MenuItem("VFX/Components/CodeFX - Build Bomb Fire")]
        public static void BuildBomb()
        {
            if (!ConfirmSceneSwitch()) return;
            EnsureFolders(Root, "Materials", "Prefabs", "Scenes");
            Make("FIR_Bomb_Ground_01", "CFX_BombFire", 0);
            AssetDatabase.SaveAssets();
            Debug.Log("[CodeFX] bomb fire built OK");
        }

        public static void BuildBombBatch() => RunBatch(BuildBomb);

        static void Make(string id, string fx, int order, params GameObject[] companions) =>
            MakeFlipbook(Root, DocsRoot, id, fx, order, companions);

        /// <summary>Shared by every component group that uses codefx sheets (CodeFX, Scorch...):
        /// reads root/Textures/&lt;fx&gt;.json + sheets, builds CMP_&lt;id&gt; with Body (+Light) or Fx layer, saves previews to docsRoot/id.</summary>
        public static void MakeFlipbook(string Root, string DocsRoot, string id, string fx, int order, params GameObject[] companions)
        {
            EnsureFolders(Root, "Materials", "Prefabs", "Scenes");
            var info = JsonUtility.FromJson<Info>(File.ReadAllText(Root + "/Textures/" + fx + ".json"));
            if (info.space == null || info.space.width_m <= 0f || string.IsNullOrEmpty(info.space.plane))
                throw new System.InvalidOperationException(fx + ": thiếu META.space (context/plane/width_m) — xác định không gian trước (vfx-maker mục 1a, codefx README §0)");
            float widthM = info.space.width_m;
            // air / dir float at chest height in the preview; ground sits on the floor
            var previewPos = info.space.context == "ground" ? Vector3.zero : new Vector3(0f, 1.1f, 0f);
            string grid = info.cols + "x" + info.rows;
            float aspect = info.size[1] / info.size[0];
            var root = new GameObject("CMP_" + id).transform;
            if (info.blend == "add")
            {
                var mat = Material(Root + "/Materials/M_" + fx + "_Add.mat", VfxBlend.Additive, ImportTexture(Root + "/Textures/T_" + fx + "_" + grid + ".png", 1024));
                Layer(root, "Fx", mat, info, widthM, aspect, order);
            }
            else
            {
                var body = Material(Root + "/Materials/M_" + fx + "_Body_Alpha.mat", VfxBlend.Alpha, ImportTexture(Root + "/Textures/T_" + fx + "_Body_" + grid + ".png", 1024));
                Layer(root, "Body", body, info, widthM, aspect, order);
                string lp = Root + "/Textures/T_" + fx + "_Light_" + grid + ".png";
                if (File.Exists(lp))
                {
                    var light = Material(Root + "/Materials/M_" + fx + "_Light_Add.mat", VfxBlend.Additive, ImportTexture(lp, 1024));
                    Layer(root, "Light", light, info, widthM, aspect, order + 1);
                }
            }
            Save(root.gameObject, Root, DocsRoot, id, previewPos, Times(info.duration), companions);
        }

        static void Layer(Transform root, string name, Material mat, Info info, float widthM, float aspect, int order)
        {
            var ps = Particle(root, name, mat, info.duration, widthM, Color.white);
            var m = ps.main;
            m.duration = info.duration;
            m.startSize3D = true;
            m.startSizeX = widthM; m.startSizeY = widthM * aspect; m.startSizeZ = 1f;
            Burst(ps, 1);
            SheetSequence(ps, info.cols, info.rows);
            var r = ps.GetComponent<ParticleSystemRenderer>();
            // codefx origin (hit point) -> particle position. pivot is in particle-size units, +y = up; image y runs down.
            r.pivot = new Vector3(0.5f - info.pivot[0], info.pivot[1] - 0.5f, 0f);
            // plane: "billboard" = faces the camera; "ground" = lies on the floor (Billboard + Render Alignment Local, X 90).
            // "stretch" flipbooks are not supported here yet (they need a velocity). Never Horizontal/Vertical Billboard.
            if (info.space.plane == "ground") GroundFlat(ps, 0.02f);
            else if (info.space.plane == "stretch") throw new System.NotSupportedException(info.name + ": plane stretch chưa hỗ trợ cho flipbook codefx");
            Common(ps, order, 3f);
        }

        static float[] Times(float d)
        {
            var t = new float[8];
            for (int i = 0; i < 8; i++) t[i] = Mathf.Max(0.01f, d * i / 8f);
            return t;
        }

        static GameObject Load(string rel) => AssetDatabase.LoadAssetAtPath<GameObject>("Assets/VFX/_Components/" + rel + ".prefab");

        public static void BuildBatch() => RunBatch(Build);
    }
}
#endif
