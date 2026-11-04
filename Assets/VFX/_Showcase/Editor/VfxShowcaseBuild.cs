#if UNITY_EDITOR
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using VfxKit;

namespace VfxEffects
{
    // Builds the one shared scene for every effect: Assets/VFX/_Showcase/Scenes/VFX_Showcase.unity.
    // Run again whenever an effect is added or rebuilt (menu VFX / Showcase / Build Scene); the list is generated from
    // the effects in Included (prefabs Assets/VFX/<Effect>/Prefabs/VFX_*.prefab).
    public static class VfxShowcaseBuild
    {
        const string SceneDir = "Assets/VFX/_Showcase/Scenes";
        const string ScenePath = SceneDir + "/VFX_Showcase.unity";
        const string IceSpikePrefab = "Assets/VFX/IceSpike/Prefabs/VFX_IceSpikeFan_Ice.prefab";

        // Only the effects listed here go in the scene (art lead, 2026-11-03: the other effects are not tried yet).
        // To add an effect: add its prefab-name prefix to Included. Order of the list = order of the categories in the UI.
        static readonly string[] Included = { "VFX_Slash360_", "VFX_IceSpikeFan_", "VFX_HealCircle", "VFX_LightningStrike", "VFX_BossRaid_Knight_Thunder", "VFX_ThunderSpear", "VFX_LightningTrail", "VFX_AuraGauntlet" };
        static readonly string[] CategoryOrder = { "Slash360", "IceSpike", "HealCircle", "LightningStrike", "ThunderSpear", "LightningTrail", "AuraGauntlet", "_Imported" };

        [MenuItem("VFX/Showcase/Build Scene")]
        public static void BuildMenu()
        {
            if (EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) Build();
        }

        public static void BuildBatch() => VfxBuildKit.RunBatch(() => Build());

        public static void Build()
        {
            // the ice spike prefab is built from its own script; make sure it exists so it is in the list
            if (!File.Exists(IceSpikePrefab)) IceSpikeBuild.Build();

            Directory.CreateDirectory(SceneDir);
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            var camGo = new GameObject("Main Camera", typeof(Camera), typeof(AudioListener));
            camGo.tag = "MainCamera";
            var cam = camGo.GetComponent<Camera>();
            cam.backgroundColor = new Color(0.07f, 0.08f, 0.1f);
            cam.fieldOfView = 40f;
            cam.allowHDR = true;
            cam.nearClipPlane = 0.1f; cam.farClipPlane = 200f;
            camGo.transform.position = new Vector3(0f, 8.8f, -3.6f);
            camGo.transform.LookAt(new Vector3(0f, 1.1f, 0f));

            // realistic environment (sky, sun, fog, ground, arena, rocks, pillars): VfxShowcaseEnvironment
            VfxShowcaseEnvironment.Build(cam);

            var go = new GameObject("VFX_Showcase");
            var show = go.AddComponent<VfxShowcase>();
            show.cam = cam;
            show.referenceMaterial = VfxShowcaseEnvironment.ReferenceMaterial;
            show.entries = Collect();

            // every effect is placed in the Hierarchy under VFX_Instances (one prefab instance each, in a row 16 m apart) so the positions can be
            // arranged by hand; the runtime switcher plays the selected one and switches the others off
            var holder = new GameObject("VFX_Instances");
            float x = 0f;
            foreach (var en in show.entries)
            {
                if (en.prefab == null) continue;
                var inst = (GameObject)PrefabUtility.InstantiatePrefab(en.prefab, holder.transform);
                inst.transform.position = new Vector3(x, 0f, 0f);
                en.instance = inst;
                var tag = inst.AddComponent<VfxShowcaseTag>(); tag.category = en.category; tag.displayName = en.name;   // keeps the group / name when the list is rebuilt from the Hierarchy
                x += 16f;
            }

            EditorSceneManager.SaveScene(scene, ScenePath);

            // keep the scene in Build Settings so it also runs in a player build
            var list = EditorBuildSettings.scenes.ToList();
            if (!list.Any(s => s.path == ScenePath))
            {
                list.Add(new EditorBuildSettingsScene(ScenePath, true));
                EditorBuildSettings.scenes = list.ToArray();
            }
            AssetDatabase.SaveAssets();
            Debug.Log("[Showcase] " + ScenePath + " with " + show.entries.Count + " effects");
        }

        static List<VfxShowcase.Entry> Collect()
        {
            var result = new List<VfxShowcase.Entry>();
            foreach (var guid in AssetDatabase.FindAssets("t:Prefab", new[] { "Assets/VFX" }))
            {
                string path = AssetDatabase.GUIDToAssetPath(guid);
                string file = Path.GetFileNameWithoutExtension(path);
                if (!Included.Any(p => file.StartsWith(p)) || !path.Contains("/Prefabs/") || path.Contains("/_Components/") || path.Contains("/_Showcase/")) continue;
                var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(path);
                if (prefab == null || prefab.GetComponentInChildren<ParticleSystem>(true) == null) continue;
                // category = folder directly under Assets/VFX ("Mixes/Name/Prefabs" -> Mixes)
                string[] parts = path.Substring("Assets/VFX/".Length).Split('/');
                result.Add(new VfxShowcase.Entry { name = file.Substring(4).Replace('_', ' '), category = parts[0], prefab = prefab });
            }
            return result
                .OrderBy(e => { int i = System.Array.IndexOf(CategoryOrder, e.category); return i < 0 ? 99 : i; })
                .ThenBy(e => e.category).ThenBy(e => e.name).ToList();
        }

        /// <summary>Batch check without Play mode: builds the scene, then writes a still of a few effects with the UI drawn on a camera canvas.</summary>
        public static void CaptureCheck()
        {
            Build();
            var show = Object.FindObjectOfType<VfxShowcase>();
            var cam = show.cam;
            show.Build();
            var canvas = show.EditorCanvas;
            canvas.renderMode = RenderMode.ScreenSpaceCamera;
            canvas.worldCamera = cam; canvas.planeDistance = 1f;
            Directory.CreateDirectory("Docs/VFX/_Showcase");
            var picks = new[] { 1, 5, show.entries.Count - 1 };
            foreach (int i in picks)
            {
                if (i < 0 || i >= show.entries.Count) continue;
                show.EditorSelect(i, 0.14f);
                show.EditorSnapCamera();
                var rt = new RenderTexture(1280, 720, 24);
                cam.targetTexture = rt;
                cam.Render();
                RenderTexture.active = rt;
                var tex = new Texture2D(1280, 720, TextureFormat.RGB24, false);
                tex.ReadPixels(new Rect(0, 0, 1280, 720), 0, 0); tex.Apply();
                File.WriteAllBytes("Docs/VFX/_Showcase/Showcase_" + i + ".png", tex.EncodeToPNG());
                RenderTexture.active = null; cam.targetTexture = null;
                Object.DestroyImmediate(tex); rt.Release();
            }
        }
    }
}
#endif
