using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace SlotFive.Editor
{
    /// <summary>
    /// Menu Slot Five → Build Scene: creates or updates the portrait game scene and the tuning asset.
    /// Layout v7 (2026-11-27): the UI is saved in the scene under SlotFive/SlotFiveCanvas, so it can be edited in the
    /// Hierarchy. Build Scene keeps an existing scene and its UI (only the art / VFX fields of SlotFiveGame are
    /// re-assigned); Rebuild UI throws the UI away and builds it again from SlotFiveLayout, after a backup.
    /// </summary>
    public static class SlotFiveSceneBuild
    {
        public const string Root = "Assets/SlotFive";
        public const string ScenePath = Root + "/Scenes/SlotFive.unity";
        public const string BackupDir = Root + "/Scenes/_Backup";
        public const string TuningPath = Root + "/SlotFiveTuning.asset";
        public const string GeneratedRoot = Root + "/Art/Generated";

        [MenuItem("Slot Five/Build Scene")]
        public static void Build() => BuildInternal(rebuildUi: false);

        [MenuItem("Slot Five/Rebuild UI (ghi đè chỉnh tay)")]
        public static void RebuildUi()
        {
            if (!Application.isBatchMode && !EditorUtility.DisplayDialog("Slot Five",
                    "Xoá UI đang có trong scene SlotFive (kể cả chỉnh tay trong Hierarchy) và dựng lại từ SlotFiveLayout?\n\n" +
                    "Scene hiện tại được sao lưu vào " + BackupDir + " trước.", "Dựng lại", "Huỷ"))
                return;
            BuildInternal(rebuildUi: true);
        }

        private static void BuildInternal(bool rebuildUi)
        {
            if (EditorApplication.isPlaying) { Debug.LogWarning("[SlotFive] Thoát Play trước khi build scene."); return; }
            if (!AssetDatabase.IsValidFolder(Root + "/Scenes")) AssetDatabase.CreateFolder(Root, "Scenes");

            var tuning = AssetDatabase.LoadAssetAtPath<SlotFiveTuningAsset>(TuningPath);
            if (tuning == null)
            {
                tuning = ScriptableObject.CreateInstance<SlotFiveTuningAsset>();
                AssetDatabase.CreateAsset(tuning, TuningPath);
            }

            bool exists = AssetDatabase.LoadAssetAtPath<SceneAsset>(ScenePath) != null;
            if (exists && !EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) return;
            var scene = exists
                ? EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Single)
                : EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            if (Camera.main == null)
            {
                var camGo = new GameObject("Main Camera", typeof(Camera), typeof(AudioListener)) { tag = "MainCamera" };
                var cam = camGo.GetComponent<Camera>();
                cam.orthographic = true;
                cam.clearFlags = CameraClearFlags.SolidColor;
                cam.backgroundColor = SlotFiveColors.Letterbox;
                camGo.transform.position = new Vector3(0, 0, -10);
            }
            if (Object.FindObjectOfType<UnityEngine.EventSystems.EventSystem>() == null)
                new GameObject("EventSystem", typeof(UnityEngine.EventSystems.EventSystem), typeof(UnityEngine.EventSystems.StandaloneInputModule));

            var game = Object.FindObjectOfType<SlotFiveGame>();
            if (game == null) game = new GameObject("SlotFive").AddComponent<SlotFiveGame>();
            game.tuningAsset = tuning;
            AssignVfx(game);
            AssignUiSheet(game);
            AssignGenerated(game);

            var canvas = game.transform.Find(SlotFiveGame.CanvasName);
            string what;
            if (canvas != null && rebuildUi)
            {
                Backup();
                Object.DestroyImmediate(canvas.gameObject);
                canvas = null;
                what = "UI dựng lại từ đầu (bản cũ đã sao lưu)";
            }
            else what = canvas != null ? "giữ UI có sẵn trong Hierarchy" : "dựng UI mới";
            if (canvas == null) game.BuildHierarchy();

            EditorUtility.SetDirty(game);
            EditorSceneManager.MarkSceneDirty(scene);
            EditorSceneManager.SaveScene(scene, ScenePath);
            AddToBuildSettings();
            AssetDatabase.SaveAssets();
            Debug.Log($"[SlotFive] Scene built: {ScenePath} ({what})");
        }

        private static void Backup()
        {
            if (!AssetDatabase.IsValidFolder(BackupDir)) AssetDatabase.CreateFolder(Root + "/Scenes", "_Backup");
            string dst = $"{BackupDir}/SlotFive_{System.DateTime.Now:yyyyMMdd_HHmmss}.unity";
            AssetDatabase.CopyAsset(ScenePath, dst);
            // Keep the 5 newest backups.
            var old = System.IO.Directory.GetFiles(BackupDir, "SlotFive_*.unity");
            System.Array.Sort(old);
            for (int i = 0; i < old.Length - 5; i++) AssetDatabase.DeleteAsset(old[i].Replace('\\', '/'));
            Debug.Log("[SlotFive] Backup: " + dst);
        }

        /// <summary>
        /// Writes the procedural rounded box / disc as PNG assets (once) so UI saved in the scene can reference them.
        /// </summary>
        public static void AssignGenerated(SlotFiveGame game)
        {
            if (!AssetDatabase.IsValidFolder(GeneratedRoot)) AssetDatabase.CreateFolder(Root + "/Art", "Generated");
            game.roundedSprite = WritePng(GeneratedRoot + "/T_SF_Rounded.png", SlotFiveUi.RoundedTexture(),
                Vector4.one * SlotFiveUi.RoundedRadius);
            game.circleSprite = WritePng(GeneratedRoot + "/T_SF_Circle.png", SlotFiveUi.CircleTexture(), Vector4.zero);
            SlotFiveUi.UseAssets(game.roundedSprite, game.circleSprite);
        }

        private static Sprite WritePng(string path, Texture2D tex, Vector4 border)
        {
            if (!System.IO.File.Exists(path))
            {
                System.IO.File.WriteAllBytes(path, tex.EncodeToPNG());
                AssetDatabase.ImportAsset(path);
            }
            var importer = (TextureImporter)AssetImporter.GetAtPath(path);
            if (importer.textureType != TextureImporterType.Sprite || importer.spriteBorder != border || importer.mipmapEnabled
                || importer.filterMode != FilterMode.Bilinear)
            {
                importer.textureType = TextureImporterType.Sprite;
                importer.spriteImportMode = SpriteImportMode.Single;
                importer.alphaIsTransparency = true;
                importer.mipmapEnabled = false;
                importer.wrapMode = TextureWrapMode.Clamp;
                importer.filterMode = FilterMode.Bilinear;
                importer.spritePixelsPerUnit = 100;
                importer.spriteBorder = border;
                importer.SaveAndReimport();
            }
            return AssetDatabase.LoadAssetAtPath<Sprite>(path);
        }

        public const string VfxRoot = "Assets/VFX/SF_Cast/Prefabs/";

        /// <summary>Hooks the SF_Cast prefabs (demo set: volt, blade, heal, shield) into the game view.</summary>
        public static void AssignVfx(SlotFiveGame game)
        {
            GameObject P(string n) => AssetDatabase.LoadAssetAtPath<GameObject>(VfxRoot + "VFX_SF_" + n + ".prefab");
            var keys = new[] { null, "Volt", null, null, "Blade", "Heal", "Shield", null };
            game.projectilePrefabs = new GameObject[keys.Length];
            game.hitPrefabs = new GameObject[keys.Length];
            for (int i = 0; i < keys.Length; i++)
            {
                if (keys[i] == null) continue;
                game.projectilePrefabs[i] = P("Proj" + keys[i]);
                game.hitPrefabs[i] = P("Hit" + keys[i]);
            }
            game.blockPrefab = P("Block");
            game.chainFlashPrefab = P("ChainFlash");
            game.voltLinkPrefab = P("VoltLink");
            game.matchPopPrefab = P("MatchPop");
            // Volt cast = bolt strike from the chain (Docs/VFX/SF_VoltStrike/Plan.md); replaces ProjVolt / HitVolt in play.
            game.voltStrikePrefab = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/VFX/SF_VoltStrike/Prefabs/VFX_SF_VoltStrike.prefab");
        }

        public const string IconRoot = "Assets/SlotFive/Art/Icons/";

        /// <summary>Icon art (art lead's fantasy-slot-assets pack, 2026-11-27, 256 x 320): volt, blade, heal, shield, lucky star.</summary>
        public static void AssignIcons(SlotFiveGame game)
        {
            var keys = new[] { null, "Volt", null, null, "Blade", "Heal", "Shield", "Lucky" };
            game.iconSprites = new Sprite[keys.Length];
            for (int i = 0; i < keys.Length; i++)
            {
                if (keys[i] == null) continue;
                string path = IconRoot + "T_SF_Icon_" + keys[i] + ".png";
                var importer = AssetImporter.GetAtPath(path) as TextureImporter;
                if (importer == null) { Debug.LogWarning("[SlotFive] missing icon " + path); continue; }
                if (importer.textureType != TextureImporterType.Sprite || importer.mipmapEnabled || importer.maxTextureSize != 512)
                {
                    importer.textureType = TextureImporterType.Sprite;
                    importer.spriteImportMode = SpriteImportMode.Single;
                    importer.alphaIsTransparency = true;
                    importer.mipmapEnabled = false;
                    importer.maxTextureSize = 512;
                    importer.SaveAndReimport();
                }
                game.iconSprites[i] = AssetDatabase.LoadAssetAtPath<Sprite>(path);
            }
        }

        public const string SheetRoot = "Assets/SlotFive/Art/UISheet/";

        /// <summary>
        /// Layout v6 (2026-11-27): every piece of the art lead's UI sheet + demo mock-up, cut by
        /// tools/slotfive_ui/slice.py into Art/UISheet. Icons: volt, blade, heal, shield, lucky star.
        /// </summary>
        public static void AssignUiSheet(SlotFiveGame game)
        {
            Sprite S(string n, Vector4 border = default) => LoadSprite(SheetRoot + "T_SF_" + n + ".png", 1024, border);

            var keys = new[] { null, "Volt", null, null, "Blade", "Heal", "Shield", "Lucky" };
            game.iconSprites = new Sprite[keys.Length];
            for (int i = 0; i < keys.Length; i++)
                if (keys[i] != null) game.iconSprites[i] = S("IconSq_" + keys[i]);

            // v6.2: square grid with the slots drawn in, so no separate cell art (T_SF_ReelGrid / T_SF_Cell of v6.1
            // and the sheet icons T_SF_Icon_* stay in the folder, unused).
            game.reelBgSprite = S("ReelGridSq");
            game.cellSprite = null;
            game.reelFrameSprite = null;
            game.stageBgSprite = S("StageBg");
            game.panelSprite = S("PanelBottom", new Vector4(44, 44, 44, 44));
            game.legendSprite = S("PanelLegend", new Vector4(44, 44, 44, 44));
            game.bannerSprite = S("Banner");
            game.fighterSprites = new[] { S("HeroPlayer"), S("HeroFoe") };
            game.vsSprite = S("Vs");
            game.hpTrackSprite = S("HpTrack", new Vector4(22, 22, 22, 22));
            game.hpBarSprite = S("HpBar");
            game.hpBarLowSprite = S("HpBarLow");
            game.shieldBarSprite = S("ShieldBar");
            game.tagSprites = new[] { S("TagPlayer"), S("TagFoe") };
            game.helpBtnSprite = S("BtnHelp");
            game.fastBtnSprite = S("BtnFast");
            game.spinBtnSprite = S("BtnSpin");
            game.newBtnSprite = S("BtnNew");
        }

        /// <summary>Imports a UI texture as a single Sprite (no mipmaps, optional 9-slice border) and loads it.</summary>
        public static Sprite LoadSprite(string path, int maxSize, Vector4 border = default)
        {
            var importer = AssetImporter.GetAtPath(path) as TextureImporter;
            if (importer == null) { Debug.LogWarning("[SlotFive] missing " + path); return null; }
            if (importer.textureType != TextureImporterType.Sprite || importer.mipmapEnabled
                || importer.maxTextureSize != maxSize || importer.spriteBorder != border)
            {
                importer.textureType = TextureImporterType.Sprite;
                importer.spriteImportMode = SpriteImportMode.Single;
                importer.alphaIsTransparency = true;
                importer.mipmapEnabled = false;
                importer.maxTextureSize = maxSize;
                importer.spriteBorder = border;
                importer.SaveAndReimport();
            }
            return AssetDatabase.LoadAssetAtPath<Sprite>(path);
        }

        private static void AddToBuildSettings()
        {
            var scenes = new System.Collections.Generic.List<EditorBuildSettingsScene>(EditorBuildSettings.scenes);
            if (scenes.Exists(s => s.path == ScenePath)) return;
            scenes.Insert(0, new EditorBuildSettingsScene(ScenePath, true));
            EditorBuildSettings.scenes = scenes.ToArray();
        }

        /// <summary>Batch entry: Unity -batchmode -executeMethod SlotFive.Editor.SlotFiveSceneBuild.BuildBatch -quit</summary>
        public static void BuildBatch() => Build();
    }
}
