// Ghép CFX_Lightning_Strike (đứng) + CFX_Lightning_Impact (nằm đất) thành một prefab + scene demo.
// Chạy sau khi VfxCodeBuild đã dựng 2 prefab. Menu VFX/Lightning/Combine hoặc batch: -executeMethod LightningCombine.Run
#if UNITY_EDITOR
using System;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

public static class LightningCombine
{
    const string STRIKE = "Assets/VFX/Lightning_Strike/Prefabs/VFX_Lightning_Strike.prefab";
    const string IMPACT = "Assets/VFX/Lightning_Impact/Prefabs/VFX_Lightning_Impact.prefab";
    const string COMBO = "Assets/VFX/Lightning_Strike/Prefabs/VFX_Lightning_Combined.prefab";
    const string SCENE = "Assets/VFX/Lightning_Strike/Scenes/Lightning_Combined_Demo.unity";

    static Material Mat(string n, Color c)
    {
        string p = "Assets/VFX/_VfxCode/Demo/" + n + ".mat";
        var m = AssetDatabase.LoadAssetAtPath<Material>(p);
        if (m == null) { m = new Material(Shader.Find("Standard")); AssetDatabase.CreateAsset(m, p); }
        m.color = c; EditorUtility.SetDirty(m); return m;
    }

    [MenuItem("VFX/Lightning/Combine")]
    public static void Run()
    {
        try
        {
            var s = AssetDatabase.LoadAssetAtPath<GameObject>(STRIKE);
            var i = AssetDatabase.LoadAssetAtPath<GameObject>(IMPACT);
            if (s == null || i == null) throw new Exception("thiếu prefab Strike / Impact");
            var root = new GameObject("VFX_Lightning_Combined");
            ((GameObject)PrefabUtility.InstantiatePrefab(s, root.transform)).transform.localPosition = Vector3.zero;
            ((GameObject)PrefabUtility.InstantiatePrefab(i, root.transform)).transform.localPosition = new Vector3(0f, 0.03f, 0f);   // nhấc 3 cm khỏi mặt đất, tránh z-fight với Ground
            PrefabUtility.SaveAsPrefabAsset(root, COMBO);
            UnityEngine.Object.DestroyImmediate(root);

            // scene demo (cùng chuẩn với VfxCodeBuild: camera 3/4 nhìn xuống 40°, nền tối, người 2 m, Space = phát lại)
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var tone = new Color(0.10f, 0.10f, 0.12f);
            var ground = GameObject.CreatePrimitive(PrimitiveType.Plane); ground.name = "Ground";
            ground.transform.localScale = Vector3.one * 2.4f;
            ground.GetComponent<Renderer>().sharedMaterial = Mat("M_Lightning_Ground", tone);
            var human = GameObject.CreatePrimitive(PrimitiveType.Capsule); human.name = "Ref_Human_2m";
            human.transform.position = new Vector3(-2.8f, 1f, 0.3f); human.transform.localScale = new Vector3(0.6f, 1f, 0.6f);
            human.GetComponent<Renderer>().sharedMaterial = Mat("M_Lightning_Human", new Color(0.45f, 0.5f, 0.6f));
            var sun = new GameObject("Directional Light").AddComponent<Light>();
            sun.type = LightType.Directional; sun.transform.rotation = Quaternion.Euler(50f, -30f, 0f);
            var demo = new GameObject("Demo_Lightning_Combined");
            demo.AddComponent<VfxCode.VfxCodeReplay>().interval = 1.2f;
            var inst = (GameObject)PrefabUtility.InstantiatePrefab(AssetDatabase.LoadAssetAtPath<GameObject>(COMBO), scene);
            inst.transform.SetParent(demo.transform, false);
            var cam = new GameObject("Main Camera").AddComponent<Camera>();
            cam.tag = "MainCamera"; cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = tone * 0.8f; cam.fieldOfView = 30f;
            cam.transform.rotation = Quaternion.Euler(40f, 0f, 0f);
            cam.transform.position = new Vector3(-0.4f, 2.2f, 0f) - cam.transform.forward * 16f;
            System.IO.Directory.CreateDirectory("Assets/VFX/Lightning_Strike/Scenes");
            EditorSceneManager.SaveScene(scene, SCENE);
            Debug.Log("[lightning] Combine xong: " + COMBO + " + " + SCENE);
            if (Application.isBatchMode) EditorApplication.Exit(0);
        }
        catch (Exception e) { Debug.LogException(e); if (Application.isBatchMode) EditorApplication.Exit(1); }
    }
}
#endif
