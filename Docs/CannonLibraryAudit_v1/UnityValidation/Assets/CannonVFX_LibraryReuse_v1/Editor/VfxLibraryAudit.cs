#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;

namespace PersonalVfxLibrary.Editor
{
    [Serializable] public class Catalog
    {
        public int schemaVersion = 1;
        public string unityVersion, pipeline, generatedUtc, project;
        public string[] roots;
        public bool complete;
        public int scannedPaths;
        public List<AssetEntry> assets = new List<AssetEntry>();
        public List<string> errors = new List<string>();
    }
    [Serializable] public class AssetEntry
    {
        public string guid, path, type, dependencyHash;
        public string[] dependencies;
        public List<string> facts = new List<string>();
        public List<string> candidateTags = new List<string>();
        public List<ComponentEntry> components = new List<ComponentEntry>();
    }
    [Serializable] public class ComponentEntry
    {
        public string hierarchy, type, serializedData;
        public List<string> facts = new List<string>();
    }

    public static class VfxLibraryAudit
    {
        [MenuItem("Tools/VFX Library/Audit selected folders (or Assets)")]
        static void MenuAudit()
        {
            var roots = Selection.objects.Select(AssetDatabase.GetAssetPath)
                .Where(AssetDatabase.IsValidFolder).Distinct().ToArray();
            if (roots.Length == 0) roots = new[] { "Assets" };
            string output = EditorUtility.SaveFilePanel("Save catalog", "", "VfxCatalog.json", "json");
            if (!string.IsNullOrEmpty(output)) Run(roots, output, true);
        }

        // CLI: -executeMethod PersonalVfxLibrary.Editor.VfxLibraryAudit.Batch
        // -vfxRoots Assets/Library;Packages/com.vendor.vfx -vfxCatalog <absolute path>
        public static void Batch()
        {
            var roots = Arg("-vfxRoots", "Assets").Split(';');
            var catalog = Run(roots, Arg("-vfxCatalog", "Library/VfxCatalog.json"), false);
            if (!catalog.complete) throw new InvalidOperationException("Audit incomplete; inspect catalog errors.");
        }

        public static string Arg(string key, string fallback)
        {
            var args = Environment.GetCommandLineArgs();
            int i = Array.IndexOf(args, key);
            return i >= 0 && i + 1 < args.Length ? args[i + 1] : fallback;
        }

        public static Catalog Run(string[] roots, string output, bool progress = false)
        {
            roots = roots.Select(x => x.Replace('\\', '/').TrimEnd('/')).Distinct().ToArray();
            if (roots.Length == 0 || roots.Any(x => !AssetDatabase.IsValidFolder(x)))
                throw new ArgumentException("All audit roots must be existing Unity asset folders.");
            var catalog = new Catalog {
                roots = roots, unityVersion = Application.unityVersion,
                project = Application.dataPath,
                pipeline = GraphicsSettings.currentRenderPipeline == null ? "Built-in" : GraphicsSettings.currentRenderPipeline.GetType().FullName,
                generatedUtc = DateTime.UtcNow.ToString("o")
            };
            // GetAllAssetPaths includes Graph/ShaderGraph and mesh subassets in model files.
            var paths = AssetDatabase.GetAllAssetPaths().Where(p => roots.Any(r => p.StartsWith(r + "/", StringComparison.Ordinal)))
                .Where(p => !AssetDatabase.IsValidFolder(p)).OrderBy(p => p, StringComparer.Ordinal).ToArray();
            bool cancelled = false;
            try
            {
                for (int i = 0; i < paths.Length; i++)
                {
                    string path = paths[i];
                    if (progress && EditorUtility.DisplayCancelableProgressBar("Audit VFX", path, (float)i / Math.Max(paths.Length, 1)))
                    { cancelled = true; break; }
                    catalog.scannedPaths++;
                    try
                    {
                        var entry = Inspect(path);
                        catalog.assets.Add(entry);
                    }
                    catch (Exception ex) { catalog.errors.Add(path + ": " + ex.GetType().Name + " " + ex.Message); }
                }
            }
            finally { if (progress) EditorUtility.ClearProgressBar(); }
            if (cancelled) catalog.errors.Add("Cancelled by user; catalog is partial.");
            catalog.complete = !cancelled && catalog.errors.Count == 0 && catalog.scannedPaths == paths.Length;
            string full = Path.GetFullPath(output);
            Directory.CreateDirectory(Path.GetDirectoryName(full));
            File.WriteAllText(full, JsonUtility.ToJson(catalog, true));
            Debug.Log("VFX catalog: " + full + "; complete=" + catalog.complete + "; assets=" + catalog.assets.Count);
            return catalog;
        }

        static AssetEntry Inspect(string path)
        {
            var type = AssetDatabase.GetMainAssetTypeAtPath(path);
            var e = new AssetEntry { path = path, guid = AssetDatabase.AssetPathToGUID(path),
                type = type == null ? "Unknown" : type.FullName,
                dependencyHash = AssetDatabase.GetAssetDependencyHash(path).ToString(),
                dependencies = AssetDatabase.GetDependencies(path, false).Where(x => x != path).ToArray() };
            string lower = Path.GetFileNameWithoutExtension(path).ToLowerInvariant();
            foreach (string tag in new[] { "fire", "smoke", "spark", "explosion", "impact", "trail", "slash", "lightning", "muzzle", "glow", "dust" })
                if (lower.Contains(tag)) e.candidateTags.Add(tag + " (filename only; unverified)");
            var obj = AssetDatabase.LoadMainAssetAtPath(path);
            if (obj == null) { e.facts.Add("Main asset unavailable; inspect importer/source manually."); return e; }
            var mat = obj as Material;
            if (mat != null)
            {
                e.facts.Add("shader=" + (mat.shader == null ? "MISSING" : mat.shader.name));
                e.facts.Add("shaderPath=" + AssetDatabase.GetAssetPath(mat.shader));
                e.facts.Add("keywords=" + string.Join(",", mat.shaderKeywords));
                e.facts.Add("renderQueue=" + mat.renderQueue + "; instancing=" + mat.enableInstancing);
                if (mat.shader != null) ReadProperties(mat.shader, mat, e.facts);
                e.facts.Add("Property values/keywords do not prove shader branch execution or opacity channel.");
            }
            var shader = obj as Shader;
            if (shader != null)
            {
                e.facts.Add("supportedInCurrentEditor=" + shader.isSupported);
                ReadProperties(shader, null, e.facts);
                e.facts.Add("Source/graph and target-player variants require separate inspection.");
            }
            var tex = obj as Texture;
            if (tex != null)
            {
                e.facts.Add("size=" + tex.width + "x" + tex.height + "; dimension=" + tex.dimension);
                var ti = AssetImporter.GetAtPath(path) as TextureImporter;
                if (ti != null)
                {
                    e.facts.Add("sRGB=" + ti.sRGBTexture + "; alphaSource=" + ti.alphaSource + "; alphaIsTransparency=" + ti.alphaIsTransparency);
                    e.facts.Add("sourceHasAlpha=" + ti.DoesSourceTextureHaveAlpha() + "; readable=" + ti.isReadable);
                    e.facts.Add("compression=" + ti.textureCompression + "; maxSize=" + ti.maxTextureSize + "; mipmap=" + ti.mipmapEnabled);
                    e.facts.Add("Importer settings do not prove pixel-channel usefulness or shader channel selection.");
                }
            }
            foreach (var mesh in AssetDatabase.LoadAllAssetsAtPath(path).OfType<Mesh>())
                e.facts.Add("mesh=" + mesh.name + "; vertices=" + mesh.vertexCount + "; submeshes=" + mesh.subMeshCount + "; bounds=" + mesh.bounds);
            if (path.EndsWith(".prefab", StringComparison.OrdinalIgnoreCase)) ReadPrefab(path, e);
            if (path.EndsWith(".vfx", StringComparison.OrdinalIgnoreCase) || path.EndsWith(".shadergraph", StringComparison.OrdinalIgnoreCase))
                e.facts.Add("Graph asset identified; dependencies recorded; graph internals/compiled behavior NOT audited.");
            return e;
        }

        static void ReadProperties(Shader shader, Material mat, List<string> facts)
        {
            for (int i = 0; i < ShaderUtil.GetPropertyCount(shader); i++)
            {
                string name = ShaderUtil.GetPropertyName(shader, i);
                var type = ShaderUtil.GetPropertyType(shader, i);
                string value = "";
                if (mat != null)
                {
                    if (type == ShaderUtil.ShaderPropertyType.TexEnv)
                        value = AssetDatabase.GetAssetPath(mat.GetTexture(name)) + "; scale=" + mat.GetTextureScale(name) + "; offset=" + mat.GetTextureOffset(name);
                    else if (type == ShaderUtil.ShaderPropertyType.Color) value = mat.GetColor(name).ToString();
                    else if (type == ShaderUtil.ShaderPropertyType.Vector) value = mat.GetVector(name).ToString();
                    else value = mat.GetFloat(name).ToString(System.Globalization.CultureInfo.InvariantCulture);
                }
                facts.Add("property=" + name + "; type=" + type + "; value=" + value);
            }
        }

        static void ReadPrefab(string path, AssetEntry e)
        {
            GameObject root = null;
            try
            {
                root = PrefabUtility.LoadPrefabContents(path);
                foreach (var tr in root.GetComponentsInChildren<Transform>(true))
                {
                    int missing = GameObjectUtility.GetMonoBehavioursWithMissingScriptCount(tr.gameObject);
                    if (missing > 0) e.facts.Add("MISSING_SCRIPTS=" + missing + " at " + Hierarchy(tr, root.transform));
                    foreach (var c in tr.GetComponents<Component>())
                    {
                        if (c == null || c is Transform) continue;
                        var ce = new ComponentEntry { hierarchy = Hierarchy(tr, root.transform), type = c.GetType().FullName };
                        ce.facts.Add("activeSelf=" + tr.gameObject.activeSelf + "; activeInHierarchy=" + tr.gameObject.activeInHierarchy);
                        var behaviour = c as Behaviour;
                        if (behaviour != null) ce.facts.Add("enabled=" + behaviour.enabled);
                        var ps = c as ParticleSystem;
                        if (ps != null)
                        {
                            ce.serializedData = EditorJsonUtility.ToJson(ps, false);
                            ce.facts.Add("duration=" + ps.main.duration + "; loop=" + ps.main.loop + "; maxParticles=" + ps.main.maxParticles + "; simulationSpace=" + ps.main.simulationSpace);
                            ce.facts.Add("emission=" + ps.emission.enabled + "; shape=" + ps.shape.enabled + "; noise=" + ps.noise.enabled + "; textureSheet=" + ps.textureSheetAnimation.enabled + "; customData=" + ps.customData.enabled);
                            for (int i = 0; i < ps.subEmitters.subEmittersCount; i++)
                                ce.facts.Add("subEmitter=" + i + "; type=" + ps.subEmitters.GetSubEmitterType(i) + "; target=" + (ps.subEmitters.GetSubEmitterSystem(i) == null ? "MISSING" : Hierarchy(ps.subEmitters.GetSubEmitterSystem(i).transform, root.transform)));
                        }
                        var renderer = c as Renderer;
                        if (renderer != null)
                        {
                            ce.facts.Add("materials=" + string.Join(";", renderer.sharedMaterials.Select(AssetDatabase.GetAssetPath)));
                            ce.facts.Add("enabled=" + renderer.enabled + "; bounds=" + renderer.bounds);
                            var pr = renderer as ParticleSystemRenderer;
                            if (pr != null)
                            {
                                var streams = new List<ParticleSystemVertexStream>();
                                pr.GetActiveVertexStreams(streams);
                                ce.facts.Add("vertexStreams=" + string.Join(",", streams));
                                ce.facts.Add("renderMode=" + pr.renderMode + "; mesh=" + AssetDatabase.GetAssetPath(pr.mesh));
                            }
                        }
                        // No compile-time dependency on Visual Effect Graph packages.
                        if (c.GetType().FullName == "UnityEngine.VFX.VisualEffect")
                        {
                            var prop = c.GetType().GetProperty("visualEffectAsset");
                            var graph = prop == null ? null : prop.GetValue(c, null) as UnityEngine.Object;
                            ce.facts.Add("visualEffectAsset=" + AssetDatabase.GetAssetPath(graph));
                            ce.serializedData = EditorJsonUtility.ToJson(c, false);
                            ce.facts.Add("Graph internals, exposed overrides and runtime behavior require package-specific inspection.");
                        }
                        if (c is MonoBehaviour) ce.facts.Add("SOURCE_SCRIPT_REQUIRES_REVIEW");
                        e.components.Add(ce);
                    }
                }
                e.facts.Add("Serialized particle data is evidence only within this project; object instance IDs are not portable GUIDs.");
            }
            finally { if (root != null) PrefabUtility.UnloadPrefabContents(root); }
        }

        static string Hierarchy(Transform tr, Transform root)
        {
            string result = tr.name;
            while (tr != root && tr.parent != null) { tr = tr.parent; result = tr.name + "/" + result; }
            return result;
        }
    }
}
#endif
