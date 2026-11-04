using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;

public static class StylizedSlashBuilder
{
    private const string Folder = "Assets/VFX/StylizedSlash/";

    [MenuItem("VFX/Build Stylized Slash Demo")]
    private static void BuildFromMenu()
    {
        if (EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo())
            Build();
    }

    public static void Build()
    {
        var shader = Shader.Find("VFX/UV Sweep");
        var noise = AssetDatabase.LoadAssetAtPath<Texture2D>("Assets/VFX/_Shared/Textures/Noise/T_Noise_Smooth.png");
        var sparks = AssetDatabase.LoadAssetAtPath<Material>("Assets/VFX/_Components/Sparks/Materials/M_SPK_Streak_Add.mat");
        if (shader == null || !shader.isSupported || noise == null || sparks == null)
            throw new System.InvalidOperationException("Slash shader or shared dependencies are missing.");

        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        var root = new GameObject("VFX_StylizedSlash");
        var mesh = CreateArc();
        CreateEdgeMask();
        CreateRibbon(root.transform, mesh, CreateMaterial(shader, noise, "Body", BlendMode.OneMinusSrcAlpha, new Color(0.73f, 0.83f, 1f, 0.91f)), "Body", 0);
        CreateRibbon(root.transform, mesh, CreateMaterial(shader, noise, "Edge", BlendMode.One, new Color(1, 1, 1, 0.82f)), "Edge", 1);
        var tip = CreateParticles(root.transform, "Tip Sparks", 0.16f, 0.22f, 7);
        tip.transform.localPosition = ArcPoint(0.91f, 1.32f);
        tip.transform.localRotation = Quaternion.LookRotation((ArcPoint(0.94f, 1.32f) - tip.transform.localPosition).normalized);
        var main = tip.main;
        main.startSpeed = new ParticleSystem.MinMaxCurve(0.7f, 1.7f);
        main.startSize = new ParticleSystem.MinMaxCurve(0.026f, 0.057f);
        var shape = tip.shape;
        shape.enabled = true;
        shape.shapeType = ParticleSystemShapeType.Cone;
        shape.angle = 21;
        shape.radius = 0.035f;
        var fade = tip.colorOverLifetime;
        fade.enabled = true;
        var gradient = new Gradient();
        gradient.SetKeys(new[] { new GradientColorKey(Color.white, 0), new GradientColorKey(Color.white, 1) },
            new[] { new GradientAlphaKey(1, 0), new GradientAlphaKey(0, 1) });
        fade.color = gradient;
        var tipRenderer = tip.GetComponent<ParticleSystemRenderer>();
        tipRenderer.renderMode = ParticleSystemRenderMode.Stretch;
        tipRenderer.lengthScale = 2.2f;
        tipRenderer.sharedMaterial = sparks;

        var prefab = PrefabUtility.SaveAsPrefabAsset(root, Folder + "VFX_StylizedSlash.prefab");
        Object.DestroyImmediate(root);
        var instance = (GameObject)PrefabUtility.InstantiatePrefab(prefab);
        foreach (var system in instance.GetComponentsInChildren<ParticleSystem>())
        {
            var demoMain = system.main;
            demoMain.loop = true;
            PrefabUtility.RecordPrefabInstancePropertyModifications(system);
        }

        var camera = new GameObject("Demo Camera", typeof(Camera)).GetComponent<Camera>();
        camera.transform.position = new Vector3(0.2f, 0.85f, -6);
        camera.clearFlags = CameraClearFlags.SolidColor;
        camera.backgroundColor = new Color(0.045f, 0.06f, 0.085f);
        camera.orthographic = true;
        camera.orthographicSize = 1.45f;
        if (!EditorSceneManager.SaveScene(scene, Folder + "StylizedSlash_Demo.unity"))
            throw new System.InvalidOperationException("Could not save slash demo.");
        AssetDatabase.SaveAssets();
        Debug.Log("Stylized slash prefab and demo saved.");
    }

    private static Material CreateMaterial(Shader shader, Texture2D noise, string name, BlendMode blend, Color tint)
    {
        string maskPath = Folder + "T_Slash_" + name + ".png";
        var importer = (TextureImporter)AssetImporter.GetAtPath(maskPath);
        importer.sRGBTexture = false;
        importer.wrapMode = TextureWrapMode.Clamp;
        importer.mipmapEnabled = false;
        importer.maxTextureSize = 512;
        importer.SaveAndReimport();
        string materialPath = Folder + "M_Slash_" + name + ".mat";
        var material = AssetDatabase.LoadAssetAtPath<Material>(materialPath);
        if (material == null)
        {
            material = new Material(shader);
            AssetDatabase.CreateAsset(material, materialPath);
        }
        material.SetTexture("_MainTex", AssetDatabase.LoadAssetAtPath<Texture2D>(maskPath));
        material.SetTexture("_NoiseTex", noise);
        material.SetColor("_Tint", tint);
        material.SetFloat("_Distortion", name == "Edge" ? 0.008f : 0.025f);
        material.SetFloat("_DstBlend", (float)blend);
        EditorUtility.SetDirty(material);
        return material;
    }

    private static void CreateEdgeMask()
    {
        const int width = 512, height = 128;
        var texture = new Texture2D(width, height, TextureFormat.RGB24, false, true);
        var pixels = new Color32[width * height];
        for (int x = 0; x < width; x++)
        {
            float u = (float)x / (width - 1);
            float envelope = Mathf.SmoothStep(0, 1, Mathf.InverseLerp(0.08f, 0.45f, u))
                * Mathf.SmoothStep(0, 1, Mathf.InverseLerp(0.94f, 0.70f, u));
            float center = 0.52f + 0.14f * envelope;
            float halfWidth = 0.012f + 0.038f * envelope;
            for (int y = 0; y < height; y++)
            {
                float distance = Mathf.Abs((float)y / (height - 1) - center);
                byte value = (byte)(255 * envelope * Mathf.SmoothStep(1, 0, distance / halfWidth));
                pixels[y * width + x] = new Color32(value, value, value, 255);
            }
        }
        texture.SetPixels32(pixels);
        texture.Apply();
        string path = Folder + "T_Slash_Edge.png";
        File.WriteAllBytes(path, texture.EncodeToPNG());
        Object.DestroyImmediate(texture);
        AssetDatabase.ImportAsset(path, ImportAssetOptions.ForceSynchronousImport);
    }

    private static Vector3 ArcPoint(float u, float radius)
    {
        float angle = Mathf.Lerp(-1.22f, 1.22f, u);
        return new Vector3(Mathf.Sin(angle) * radius, Mathf.Cos(angle) * radius, 0);
    }

    private static Mesh CreateArc()
    {
        const int segments = 40;
        var vertices = new Vector3[(segments + 1) * 2];
        var uv = new Vector2[vertices.Length];
        var indices = new int[segments * 6];
        for (int i = 0; i <= segments; i++)
        {
            float u = (float)i / segments;
            int v = i * 2;
            vertices[v] = ArcPoint(u, 0.79f);
            vertices[v + 1] = ArcPoint(u, 1.65f);
            uv[v] = new Vector2(u, 0);
            uv[v + 1] = new Vector2(u, 1);
            if (i == segments) break;
            int t = i * 6;
            indices[t] = v;
            indices[t + 1] = v + 1;
            indices[t + 2] = v + 2;
            indices[t + 3] = v + 2;
            indices[t + 4] = v + 1;
            indices[t + 5] = v + 3;
        }
        string path = Folder + "SlashArc.asset";
        var mesh = AssetDatabase.LoadAssetAtPath<Mesh>(path);
        if (mesh == null)
        {
            mesh = new Mesh { name = "SlashArc" };
            AssetDatabase.CreateAsset(mesh, path);
        }
        mesh.Clear();
        mesh.vertices = vertices;
        mesh.uv = uv;
        mesh.triangles = indices;
        mesh.RecalculateBounds();
        EditorUtility.SetDirty(mesh);
        return mesh;
    }

    private static void CreateRibbon(Transform root, Mesh mesh, Material material, string name, int order)
    {
        var system = CreateParticles(root, name, 0, 0.42f, 1);
        var custom = system.customData;
        custom.enabled = true;
        custom.SetMode(ParticleSystemCustomData.Custom1, ParticleSystemCustomDataMode.Vector);
        custom.SetVectorComponentCount(ParticleSystemCustomData.Custom1, 1);
        custom.SetVector(ParticleSystemCustomData.Custom1, 0, new ParticleSystem.MinMaxCurve(1, AnimationCurve.Linear(0, 0, 1, 1)));
        var renderer = system.GetComponent<ParticleSystemRenderer>();
        renderer.renderMode = ParticleSystemRenderMode.Mesh;
        renderer.alignment = ParticleSystemRenderSpace.Local;
        renderer.mesh = mesh;
        renderer.sharedMaterial = material;
        renderer.sortingOrder = order;
        renderer.enableGPUInstancing = false;
        renderer.SetActiveVertexStreams(new List<ParticleSystemVertexStream> {
            ParticleSystemVertexStream.Position, ParticleSystemVertexStream.Color,
            ParticleSystemVertexStream.UV, ParticleSystemVertexStream.Custom1X
        });
    }

    private static ParticleSystem CreateParticles(Transform root, string name, float delay, float lifetime, short count)
    {
        var child = new GameObject(name);
        child.transform.SetParent(root, false);
        var system = child.AddComponent<ParticleSystem>();
        system.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
        var main = system.main;
        main.duration = 1.4f;
        main.loop = false;
        main.startLifetime = lifetime;
        main.startSpeed = 0;
        main.startSize = 1;
        main.maxParticles = count;
        main.playOnAwake = true;
        var shape = system.shape;
        shape.enabled = false;
        var emission = system.emission;
        emission.rateOverTime = 0;
        emission.SetBursts(new[] { new ParticleSystem.Burst(delay, count) });
        return system;
    }
}
