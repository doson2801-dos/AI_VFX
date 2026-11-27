using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace SlotFive
{
    /// <summary>
    /// Slot Five scene view: builds a portrait 540x960 uGUI stage in code (letterboxed on any aspect), feeds keys and
    /// buttons into <see cref="SlotFiveMatch"/>, and draws reels, highlights, casts, floats and HUD from its state.
    /// Placeholder shapes only; flipbook / prefab VFX come later through /vfx-shader or /vfx-code.
    /// </summary>
    public sealed class SlotFiveGame : MonoBehaviour
    {
        public SlotFiveTuningAsset tuningAsset;

        [Tooltip("Icon art per icon index (fire, volt, frost, earth, blade, heal, shield, lucky); empty = coloured placeholder tile.")]
        public Sprite[] iconSprites = new Sprite[SlotFiveConst.IconCount];
        [Tooltip("Grid background with the 16 slots (drawn under the cells).")]
        public Sprite reelBgSprite;
        [Tooltip("Optional overlay drawn over the reel panel (unused since layout v5.3: the border is in reelBgSprite).")]
        public Sprite reelFrameSprite;

        [Tooltip("Slot art drawn behind the icon in every cell (scrolls with it while spinning).")]
        public Sprite cellSprite;

        [Header("UI sheet art (layout v6); empty = placeholder shapes")]
        public Sprite stageBgSprite;
        public Sprite panelSprite;
        public Sprite bannerSprite;
        public Sprite legendSprite;
        [Tooltip("Hero art: player, foe.")]
        public Sprite[] fighterSprites = new Sprite[2];
        public Sprite vsSprite;
        [Tooltip("HP pill track, bar, low-HP bar and shield bar.")]
        public Sprite hpTrackSprite, hpBarSprite, hpBarLowSprite, shieldBarSprite;
        [Tooltip("Name tags: player (BẠN), foe (ĐỊCH).")]
        public Sprite[] tagSprites = new Sprite[2];
        [Tooltip("Buttons with their caption drawn in the art.")]
        public Sprite helpBtnSprite, fastBtnSprite, spinBtnSprite, newBtnSprite;
        [Tooltip("Asset copies of the procedural rounded box / disc (written by Slot Five → Build Scene).")]
        public Sprite roundedSprite, circleSprite;

        [Header("Background (chỉnh được cả lúc đang Play)")]
        [Tooltip("Dịch ảnh nền, đơn vị px của khung 540x960 (x sang phải, y lên trên).")]
        public Vector2 stageBgOffset = Vector2.zero;
        [Tooltip("Phóng ảnh nền quanh tâm khung. 1 = vừa khung 540x960.")]
        [Range(0.5f, 3f)] public float stageBgScale = 1f;
        [Tooltip("Nhân màu ảnh nền: trắng = giữ nguyên, xám = tối hơn, alpha thấp = mờ dần về màu Bg.")]
        public Color stageBgTint = Color.white;
        [Tooltip("Cắt phần ảnh nền tràn ra ngoài khung 540x960 (tắt để nền phủ cả vùng letterbox).")]
        public bool stageBgClip = true;

        [Header("Cast VFX (brief 4.12); empty slots fall back to placeholder shapes")]
        [Tooltip("Projectile prefab per icon index (fire, volt, frost, earth, blade, heal, shield, lucky).")]
        public GameObject[] projectilePrefabs = new GameObject[SlotFiveConst.IconCount];
        [Tooltip("Hit prefab per icon index.")]
        public GameObject[] hitPrefabs = new GameObject[SlotFiveConst.IconCount];
        public GameObject blockPrefab;
        public GameObject chainFlashPrefab;
        [Tooltip("Puzzle-style pop on every matched cell (replaces chainFlashPrefab when set).")]
        public GameObject matchPopPrefab;
        [Tooltip("Runtime size multiplier of the match pop (the art-lead edited prefab is not touched).")]
        [Range(0.5f, 2.5f)] public float matchPopScale = 1.4f;
        [Tooltip("Runtime brightness of the match pop: multiplies each layer's alpha and adds white to its colour.")]
        [Range(0.5f, 2.5f)] public float matchPopBrightness = 1.6f;
        [Tooltip("Volt (Sét) cast: bolt from the chain to the target fighter, replaces the volt projectile and hit. " +
                 "Root at the chain, bolt on local +X; children At* go to the fighter, AtFeet* to its feet.")]
        public GameObject voltStrikePrefab;
        [Tooltip("Bolt length (m) and the prefab time (s) at which it reaches the fighter, as authored by SFVoltStrikeBuild.")]
        public float voltStrikeLength = 16f, voltStrikeHitTime = 0.33f;
        [Tooltip("Bolt from one cell to the next of a volt (Sét) chain; root at A, B on local +X.")]
        public GameObject voltLinkPrefab;
        [Tooltip("Length (m) and width (m) the volt link prefab is authored for.")]
        public float voltLinkLength = 4.25f, voltLinkWidth = 1.3f;
        [Tooltip("Delay between consecutive links of one chain (ms, scaled by fast mode).")]
        public float voltLinkStaggerMs = 60f;
        /// <summary>Game px per VFX metre (48 px = 2 m).</summary>
        public float pxPerMetre = 24f;

        public SlotFiveMatch Match { get; private set; }
        public RectTransform Stage { get; private set; }

        private SlotFiveTuning _fallbackTuning;
        private Camera _camera;
        private readonly System.Random _decor = new System.Random(12345); // decoration only, never the logic RNG

        // view
        private Text _banner;
        private readonly CellView[,] _cells = new CellView[SlotFiveConst.Cols, 5];
        private readonly float[] _reelOffset = new float[SlotFiveConst.Cols];
        private readonly RectMask2D[] _reelMasks = new RectMask2D[SlotFiveConst.Cols];
        private readonly double[] _reelStoppedAt = new double[SlotFiveConst.Cols];
        private readonly Image[] _fighters = new Image[2];
        private readonly Image[] _hpFill = new Image[2];
        private readonly Image[] _shieldFill = new Image[2];
        private readonly Text[] _hpText = new Text[2];
        private readonly float[] _shake = new float[2];
        private Image _spinImg, _newImg, _fastImg;
        private Text _fastLabel, _newLabel;
        private RectTransform _legend;
        private RectTransform _fxLayer;
        private readonly List<Image> _projectiles = new List<Image>();
        private readonly List<Fx> _fx = new List<Fx>();
        private readonly List<FloatText> _floats = new List<FloatText>();
        private Transform _vfxLayer;
        private readonly Dictionary<Cast, GameObject> _liveProjectiles = new Dictionary<Cast, GameObject>();
        private bool _highlightOn;
        private readonly HashSet<Cell> _highlight = new HashSet<Cell>();

        private sealed class CellView
        {
            public RectTransform Root;
            public Image Slot;                        // cell art behind the card (null without cellSprite)
            public Image Bg;
            public Image Glow;
            public Text Glyph;
            public Image Flash;                       // white copy of the card, for the match flash
            public double PopStart = double.NegativeInfinity;
            public int Icon = -1;
        }

        private sealed class Fx
        {
            public Image Img;
            public double Start;
            public double Duration;
            public float From, To;
        }

        private sealed class FloatText
        {
            public Text Text;
            public Side Side;
            public double Start;
            public double Duration;
            public float X;
        }

        private float TimeScale => (float)Match.LastTimeScale;

        // ------------------------------------------------------------ lifecycle

        private void Awake()
        {
            var tuning = tuningAsset != null ? tuningAsset.tuning : (_fallbackTuning = new SlotFiveTuning());
            Match = new SlotFiveMatch(tuning);
            SlotFiveUi.UseAssets(roundedSprite, circleSprite);
            // Layout v7: the UI lives in the scene (built by Slot Five → Build Scene, editable in the Hierarchy).
            // Only a scene without it (old scene, test) builds it here.
            if (transform.Find(CanvasName) == null) BuildHierarchy();
            else SetupCamera();
            Bind();
            Match.MatchStarted += OnMatchStarted;
            Match.SpinStarted += OnSpinStarted;
            Match.ReelStopped += OnReelStopped;
            Match.ResolveStarted += OnResolveStarted;
            Match.CastLaunched += OnCastLaunched;
            Match.CastImpacted += OnCastImpacted;
            Match.LegendChanged += () => _legend.gameObject.SetActive(Match.LegendOpen);
            OnMatchStarted();
        }

        private float _dtMs;
        private Image _stageBg;
        private RectMask2D _stageBgClip;

        /// <summary>Applies the Background inspector values (called every frame so sliders work in Play).</summary>
        private void ApplyBackground()
        {
            if (_stageBg == null) return;
            var rt = _stageBg.rectTransform;
            rt.sizeDelta = new Vector2(SlotFiveLayout.Width, SlotFiveLayout.Height) * Mathf.Max(0.01f, stageBgScale);
            rt.anchoredPosition = stageBgOffset;
            _stageBg.color = stageBgTint;
            if (_stageBgClip != null) _stageBgClip.enabled = stageBgClip;
        }

#if UNITY_EDITOR
        /// <summary>Edit mode: the Background sliders move the saved Background object right away.</summary>
        private void OnValidate()
        {
            if (Application.isPlaying) return;
            UnityEditor.EditorApplication.delayCall += () =>
            {
                if (this == null) return;
                var bg = transform.Find(CanvasName + "/Stage/BackgroundClip/Background");
                if (bg == null) return;
                _stageBg = bg.GetComponent<Image>();
                _stageBgClip = bg.parent.GetComponent<RectMask2D>();
                ApplyBackground();
            };
        }
#endif

        private void Update()
        {
            ApplyBackground();
            HandleKeys();
            Step(Time.deltaTime * 1000f);
        }

        /// <summary>Advances the match and the view by dtMs. Update calls it each frame; tools and tests can too.</summary>
        public void Step(float dtMs)
        {
            _dtMs = dtMs;
            Match.Tick(dtMs);
            Render();
        }

        // ------------------------------------------------------------ input (brief 3)

        private void HandleKeys()
        {
            // GetKeyDown fires once per press, so held keys and OS auto-repeat never repeat a command.
            bool enter = Input.GetKeyDown(KeyCode.Return) || Input.GetKeyDown(KeyCode.KeypadEnter);
            if (Input.GetKeyDown(KeyCode.Space) || enter)
            {
                if (enter && Match.Phase == Phase.Ended) Match.NewMatch();
                else Match.RequestSpin();
            }
            if (Input.GetKeyDown(KeyCode.R)) Match.NewMatch();
            if (Input.GetKeyDown(KeyCode.F)) Match.ToggleFast();
            if (Input.GetKeyDown(KeyCode.H) || Input.inputString.Contains("?")) Match.ToggleLegend();
            if (Input.GetKeyDown(KeyCode.Escape)) Match.CloseLegend();
        }

        // ------------------------------------------------------------ build

        public const string CanvasName = "SlotFiveCanvas";

        private void SetupCamera()
        {
            _camera = Camera.main;
            if (_camera == null)
            {
                var camGo = new GameObject("Main Camera", typeof(Camera));
                camGo.tag = "MainCamera";
                _camera = camGo.GetComponent<Camera>();
            }
            _camera.clearFlags = CameraClearFlags.SolidColor;
            _camera.backgroundColor = SlotFiveColors.Letterbox;
            _camera.orthographic = true;
            var canvas = transform.Find(CanvasName);
            if (canvas != null) canvas.GetComponent<Canvas>().worldCamera = _camera;
        }

        /// <summary>
        /// Creates the whole UI as GameObjects under this object (no match needed, so the editor can call it).
        /// Button listeners and references are wired by <see cref="Bind"/>, which finds everything by name.
        /// </summary>
        public void BuildHierarchy()
        {
            SlotFiveUi.UseAssets(roundedSprite, circleSprite);
            _camera = Camera.main;
            if (_camera == null)
            {
                var camGo = new GameObject("Main Camera", typeof(Camera));
                camGo.tag = "MainCamera";
                _camera = camGo.GetComponent<Camera>();
            }
            _camera.clearFlags = CameraClearFlags.SolidColor;
            _camera.backgroundColor = SlotFiveColors.Letterbox;
            _camera.orthographic = true;

            var canvasGo = new GameObject(CanvasName, typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            canvasGo.transform.SetParent(transform, false);
            var canvas = canvasGo.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceCamera;
            canvas.worldCamera = _camera;
            canvas.planeDistance = 1;
            var scaler = canvasGo.GetComponent<CanvasScaler>();
            // Phaser Scale.FIT: the whole 540x960 stage always fits, the rest is letterbox.
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(SlotFiveLayout.Width, SlotFiveLayout.Height);
            scaler.screenMatchMode = CanvasScaler.ScreenMatchMode.Expand;

            if (FindObjectOfType<UnityEngine.EventSystems.EventSystem>() == null)
                new GameObject("EventSystem", typeof(UnityEngine.EventSystems.EventSystem), typeof(UnityEngine.EventSystems.StandaloneInputModule));

            var stageImg = SlotFiveUi.Node("Stage", canvasGo.transform).gameObject.AddComponent<Image>();
            Stage = stageImg.rectTransform;
            Stage.anchorMin = Stage.anchorMax = Stage.pivot = new Vector2(0.5f, 0.5f);
            Stage.sizeDelta = new Vector2(SlotFiveLayout.Width, SlotFiveLayout.Height);
            stageImg.color = SlotFiveColors.Bg;
            stageImg.raycastTarget = false;
            if (stageBgSprite != null)
            {
                // Background art on its own child so offset / scale / tint never move the rest of the stage.
                var clip = SlotFiveUi.Node("BackgroundClip", Stage);
                SlotFiveUi.Fill(clip);
                _stageBgClip = clip.gameObject.AddComponent<RectMask2D>();
                _stageBg = SlotFiveUi.Node("Background", clip).gameObject.AddComponent<Image>();
                _stageBg.sprite = stageBgSprite;
                _stageBg.raycastTarget = false;
                _stageBg.rectTransform.anchorMin = _stageBg.rectTransform.anchorMax = _stageBg.rectTransform.pivot = new Vector2(0.5f, 0.5f);
                ApplyBackground();
            }

            BuildReels();
            BuildFighters();
            BuildPanel();

            // turn banner (on top of the bottom panel since layout v5.2)
            var bannerBox = SlotFiveUi.Box("TurnBanner", Stage, SlotFiveLayout.TurnBanner, SlotFiveColors.Frame, SlotFiveUi.Rounded);
            Skin(bannerBox, bannerSprite);
            _banner = SlotFiveUi.Label("Text", bannerBox.transform, "", 24, SlotFiveColors.Text);
            if (bannerSprite != null) AddOutline(_banner, 1.2f);

            BuildLegend();

            _fxLayer = SlotFiveUi.Node("Fx", Stage);
            SlotFiveUi.Fill(_fxLayer);

            // Particle VFX in metres: origin at the stage centre, y up, drawn over the canvas by sortingOrder.
            _vfxLayer = new GameObject("VfxLayer").transform;
            _vfxLayer.SetParent(Stage, false);
            _vfxLayer.localScale = Vector3.one * pxPerMetre;

            PreviewHierarchy();
        }

        /// <summary>Edit-time look of the saved UI: icons in the cells, full HP bars, idle banner (play overwrites it all).</summary>
        private void PreviewHierarchy()
        {
            var icons = new List<int>();
            for (int i = 0; i < SlotFiveConst.IconCount; i++) if (IconSprite(i) != null) icons.Add(i);
            if (icons.Count == 0) icons.Add(0);
            for (int x = 0; x < SlotFiveConst.Cols; x++)
            {
                _cells[x, 0].Root.gameObject.SetActive(false);
                for (int j = 0; j < 5; j++)
                {
                    var v = _cells[x, j];
                    SlotFiveUi.Place(v.Root, new Rect(0, (j - 1) * SlotFiveLayout.PitchY, SlotFiveLayout.CellWidth, SlotFiveLayout.CellHeight));
                    SetCell(v, icons[(x * 3 + j) % icons.Count]);
                    v.Glow.color = new Color(1, 1, 1, 0);
                    v.Flash.color = new Color(1, 1, 1, 0);
                }
            }
            foreach (var side in new[] { Side.Player, Side.Foe })
            {
                int i = (int)side;
                var hud = (RectTransform)_hpFill[i].transform.parent;
                if (hpBarSprite != null)
                {
                    var inner = new Rect(4, 4, hud.rect.width - 8, hud.rect.height - 8);
                    SetBar(_hpFill[i], hpBarSprite, inner, 1f, side);
                    SetBar(_shieldFill[i], shieldBarSprite != null ? shieldBarSprite : hpBarSprite, new Rect(inner.x, inner.yMax - 6, inner.width, 6), 0f, side);
                }
                _shieldFill[i].gameObject.SetActive(false);
                _hpText[i].text = "450/450";
            }
            _banner.text = "Lượt của bạn";
        }

        private void BuildReels()
        {
            var frame = SlotFiveUi.Box("ReelFrame", Stage, SlotFiveLayout.ReelFrame, SlotFiveColors.Frame, SlotFiveUi.Rounded);
            if (reelBgSprite != null)
            {
                frame.sprite = reelBgSprite;
                frame.type = Image.Type.Simple;
                frame.color = Color.white;
            }
            float stepX = SlotFiveLayout.PitchX;
            float colH = (SlotFiveConst.Rows - 1) * SlotFiveLayout.PitchY + SlotFiveLayout.CellHeight;
            var origin = SlotFiveLayout.CellOrigin;
            for (int x = 0; x < SlotFiveConst.Cols; x++)
            {
                var col = SlotFiveUi.Node($"Reel{x}", frame.transform);
                SlotFiveUi.Place(col, new Rect(origin.x + stepX * x, origin.y, SlotFiveLayout.CellWidth, colH));
                _reelMasks[x] = col.gameObject.AddComponent<RectMask2D>();
                for (int j = 0; j < 5; j++)
                {
                    var v = new CellView();
                    v.Root = SlotFiveUi.Node($"Cell{j}", col);
                    if (cellSprite != null)
                    {
                        v.Slot = SlotFiveUi.Box("Slot", v.Root, new Rect(0, 0, 0, 0), Color.white, cellSprite);
                        v.Slot.type = Image.Type.Simple;
                        SlotFiveUi.Fill(v.Slot.rectTransform);
                    }
                    v.Glow = SlotFiveUi.Box("Glow", v.Root, new Rect(0, 0, 0, 0), Color.white, SlotFiveUi.Rounded);
                    v.Glow.rectTransform.pivot = new Vector2(0.5f, 0.5f);   // scales (punch) around the card centre
                    SlotFiveUi.Fill(v.Glow.rectTransform);
                    v.Bg = SlotFiveUi.Box("Tile", v.Root, new Rect(0, 0, 0, 0), Color.white, SlotFiveUi.Rounded);
                    SlotFiveUi.Fill(v.Bg.rectTransform);
                    v.Bg.rectTransform.pivot = new Vector2(0.5f, 0.5f);   // preserveAspect centres the card art on the pivot
                    v.Bg.rectTransform.offsetMin = new Vector2(Inset, Inset);
                    v.Bg.rectTransform.offsetMax = new Vector2(-Inset, -Inset);
                    v.Glyph = SlotFiveUi.Label("Glyph", v.Bg.transform, "", 22, Color.black);
                    v.Flash = SlotFiveUi.Box("Flash", v.Bg.transform, new Rect(0, 0, 0, 0), new Color(1, 1, 1, 0), SlotFiveUi.Rounded);
                    SlotFiveUi.Fill(v.Flash.rectTransform);
                    _cells[x, j] = v;
                }
            }
            if (reelFrameSprite != null)
            {
                // Gold frame over the grid edge; the cells' highlight and the particle VFX still draw above it.
                var gold = SlotFiveUi.Box("GridFrame", Stage, SlotFiveLayout.ReelFrame, Color.white, reelFrameSprite);
                gold.type = Image.Type.Simple;
            }
        }

        private void BuildFighters()
        {
            foreach (var side in new[] { Side.Player, Side.Foe })
            {
                int i = (int)side;
                var r = SlotFiveLayout.Fighter(side);
                var f = SlotFiveUi.Box(side == Side.Player ? "PlayerFighter" : "FoeFighter", Stage, r,
                    side == Side.Player ? SlotFiveColors.Player : SlotFiveColors.Foe, SlotFiveUi.Rounded);
                var heroArt = FighterSprite(side);
                if (heroArt != null)
                {
                    Skin(f, heroArt);
                    f.preserveAspect = true;
                }
                else SlotFiveUi.Label("Name", f.transform, side == Side.Player ? "BẠN" : "ĐỊCH", 17, SlotFiveColors.Text);
                _fighters[i] = f;

                var hud = SlotFiveUi.Box(side == Side.Player ? "PlayerHud" : "FoeHud", Stage, SlotFiveLayout.Hud(side),
                    SlotFiveColors.Hex(0x0B0E18), SlotFiveUi.Rounded);
                Skin(hud, hpTrackSprite);
                _hpFill[i] = SlotFiveUi.Box("Hp", hud.transform, new Rect(0, 0, 0, 0), SlotFiveColors.Hp, SlotFiveUi.Rounded);
                Skin(_hpFill[i], hpBarSprite);
                _shieldFill[i] = SlotFiveUi.Box("Shield", hud.transform, new Rect(0, 0, 0, 0), SlotFiveColors.ShieldBar, SlotFiveUi.Rounded);
                Skin(_shieldFill[i], shieldBarSprite);
                _hpText[i] = SlotFiveUi.Label("Text", hud.transform, "", 20, SlotFiveColors.Text);
                AddOutline(_hpText[i], 1.5f);

                var tagArt = tagSprites != null && tagSprites.Length > i ? tagSprites[i] : null;
                if (tagArt != null)
                {
                    var tag = SlotFiveUi.Box(side == Side.Player ? "PlayerTag" : "FoeTag", Stage, SlotFiveLayout.Tag(side), Color.white, tagArt);
                    Skin(tag, tagArt);
                    AddOutline(SlotFiveUi.Label("Text", tag.transform, side == Side.Player ? "BẠN" : "ĐỊCH", 19, SlotFiveColors.Text), 1.2f);
                }
            }

            if (vsSprite != null)
            {
                var vs = SlotFiveUi.Box("Vs", Stage, SlotFiveLayout.Vs, Color.white, vsSprite);
                vs.type = Image.Type.Simple;
                vs.preserveAspect = true;
            }
        }

        /// <summary>Card inset inside a cell (layout v6.2: the icon nearly fills the square slot).</summary>
        private static float Inset => SlotFiveLayout.IconInset;

        private Sprite FighterSprite(Side side) =>
            fighterSprites != null && fighterSprites.Length > (int)side ? fighterSprites[(int)side] : null;

        /// <summary>Puts UI sheet art on a placeholder box: white tint, 9-sliced when the sprite has a border.</summary>
        private static void Skin(Image img, Sprite art)
        {
            if (art == null) return;
            img.sprite = art;
            img.color = Color.white;
            bool sliced = art.border != Vector4.zero;
            img.type = sliced ? Image.Type.Sliced : Image.Type.Simple;
            if (sliced)
            {
                // Shrink the caps so top + bottom border always fit the rect height.
                var size = img.rectTransform.sizeDelta;
                float need = Mathf.Max((art.border.y + art.border.w) / Mathf.Max(1f, size.y),
                                       (art.border.x + art.border.z) / Mathf.Max(1f, size.x));
                img.pixelsPerUnitMultiplier = Mathf.Max(1f, need * 1.05f);
            }
        }

        private static void AddOutline(Text t, float d)
        {
            var outline = t.gameObject.AddComponent<Outline>();
            outline.effectColor = new Color(0.05f, 0, 0.12f, 0.9f);
            outline.effectDistance = new Vector2(d, -d);
        }

        /// <summary>Button art already carries its caption, so the code label is hidden.</summary>
        private static void SkinButton(Image img, Text label, Sprite art)
        {
            if (art == null) return;
            img.sprite = art;
            img.type = Image.Type.Simple;
            img.preserveAspect = true;
            img.color = Color.white;
            if (label != null) label.text = "";
        }

        private void BuildPanel()
        {
            var panel = SlotFiveUi.Box("Panel", Stage, SlotFiveLayout.Panel, SlotFiveColors.PanelBg);
            Skin(panel, panelSprite);
            // Listeners are added in Bind (the buttons are saved in the scene, the match only exists in play).
            SlotFiveUi.Button("sf-help", Stage, SlotFiveLayout.HelpBtn, "?", 34, SlotFiveColors.Button, SlotFiveColors.Text, out var helpLabel, out var helpImg);
            SkinButton(helpImg, helpLabel, helpBtnSprite);
            SlotFiveUi.Button("sf-fast", Stage, SlotFiveLayout.FastBtn, "Nhanh", 17, SlotFiveColors.Button, SlotFiveColors.Text, out _fastLabel, out _fastImg);
            SkinButton(_fastImg, _fastLabel, fastBtnSprite);
            SlotFiveUi.Button("sf-spin", Stage, SlotFiveLayout.SpinBtn, "QUAY", 36, SlotFiveColors.Spin, SlotFiveColors.SpinText, out var spinLabel, out _spinImg);
            // Oval spin button.
            _spinImg.sprite = SlotFiveUi.Circle;
            _spinImg.type = Image.Type.Simple;
            SkinButton(_spinImg, spinLabel, spinBtnSprite);
            SlotFiveUi.Button("sf-new", Stage, SlotFiveLayout.NewBtn, "Trận mới", 18, SlotFiveColors.Button, SlotFiveColors.Text, out _newLabel, out _newImg);
            SkinButton(_newImg, _newLabel, newBtnSprite);
        }

        private void BuildLegend()
        {
            var bg = SlotFiveUi.Box("Legend", Stage, SlotFiveLayout.Legend, SlotFiveColors.Hex(0x0E1222), SlotFiveUi.Rounded);
            bg.raycastTarget = true;
            Skin(bg, legendSprite);
            _legend = bg.rectTransform;
            var title = SlotFiveUi.Label("Title", _legend, "Chú giải", 26, SlotFiveColors.Text, TextAnchor.UpperLeft);
            title.rectTransform.offsetMin = new Vector2(20, 0);
            title.rectTransform.offsetMax = new Vector2(0, -20);
            SlotFiveUi.Button("sf-help-close", _legend, new Rect(SlotFiveLayout.Legend.width - 64, 0, 64, 64), "X", 28,
                SlotFiveColors.Button, SlotFiveColors.Text, out _, out _);
            _legend.gameObject.SetActive(false);
        }

        // ------------------------------------------------------------ bind (scene UI → fields)

        private readonly RectTransform[] _hud = new RectTransform[2];
        private readonly Vector2[] _fighterBase = new Vector2[2];

        private static T Need<T>(Transform parent, string path) where T : Component
        {
            var t = parent != null ? parent.Find(path) : null;
            var c = t != null ? t.GetComponent<T>() : null;
            if (c == null)
                Debug.LogError($"[SlotFive] UI thiếu '{path}' ({typeof(T).Name}) dưới '{(parent != null ? parent.name : "?")}'. " +
                               "Đổi tên lại cho đúng hoặc chạy menu Slot Five → Rebuild UI.");
            return c;
        }

        private static string FighterName(Side side) => side == Side.Player ? "PlayerFighter" : "FoeFighter";
        private static string HudName(Side side) => side == Side.Player ? "PlayerHud" : "FoeHud";

        /// <summary>Finds the scene UI by name and wires references and button listeners. Positions stay as authored.</summary>
        private void Bind()
        {
            var canvas = transform.Find(CanvasName);
            Stage = Need<RectTransform>(canvas, "Stage");

            var bg = Stage.Find("BackgroundClip/Background");
            _stageBg = bg != null ? bg.GetComponent<Image>() : null;
            _stageBgClip = bg != null ? bg.parent.GetComponent<RectMask2D>() : null;

            var frame = Stage.Find("ReelFrame");
            for (int x = 0; x < SlotFiveConst.Cols; x++)
            {
                var col = Need<RectTransform>(frame, $"Reel{x}");
                _reelMasks[x] = col.GetComponent<RectMask2D>();
                for (int j = 0; j < 5; j++)
                {
                    var root = Need<RectTransform>(col, $"Cell{j}");
                    var slot = root.Find("Slot");
                    var v = new CellView
                    {
                        Root = root,
                        Slot = slot != null ? slot.GetComponent<Image>() : null,
                        Glow = Need<Image>(root, "Glow"),
                        Bg = Need<Image>(root, "Tile"),
                        Glyph = Need<Text>(root, "Tile/Glyph"),
                        Flash = Need<Image>(root, "Tile/Flash"),
                    };
                    _cells[x, j] = v;
                }
            }

            foreach (var side in new[] { Side.Player, Side.Foe })
            {
                int i = (int)side;
                _fighters[i] = Need<Image>(Stage, FighterName(side));
                _fighterBase[i] = _fighters[i].rectTransform.anchoredPosition;
                _hud[i] = Need<RectTransform>(Stage, HudName(side));
                _hpFill[i] = Need<Image>(_hud[i], "Hp");
                _shieldFill[i] = Need<Image>(_hud[i], "Shield");
                _hpText[i] = Need<Text>(_hud[i], "Text");
            }

            _banner = Need<Text>(Stage, "TurnBanner/Text");

            Need<Button>(Stage, "sf-help").onClick.AddListener(() => Match.ToggleLegend());
            Need<Button>(Stage, "sf-fast").onClick.AddListener(() => Match.ToggleFast());
            Need<Button>(Stage, "sf-spin").onClick.AddListener(() => Match.RequestSpin());
            Need<Button>(Stage, "sf-new").onClick.AddListener(() => Match.NewMatch());
            _fastImg = Need<Image>(Stage, "sf-fast");
            _fastLabel = Need<Text>(Stage, "sf-fast/Label");
            _spinImg = Need<Image>(Stage, "sf-spin");
            _newImg = Need<Image>(Stage, "sf-new");
            _newLabel = Need<Text>(Stage, "sf-new/Label");

            _legend = Need<RectTransform>(Stage, "Legend");
            Need<Button>(_legend, "sf-help-close").onClick.AddListener(() => Match.CloseLegend());
            _legend.gameObject.SetActive(false);

            _fxLayer = Need<RectTransform>(Stage, "Fx");
            _vfxLayer = Stage.Find("VfxLayer");
            if (_vfxLayer == null)
            {
                _vfxLayer = new GameObject("VfxLayer").transform;
                _vfxLayer.SetParent(Stage, false);
            }
            _vfxLayer.localScale = Vector3.one * pxPerMetre;

            // Fresh cell state: SetCell must repaint every card on the first match.
            for (int x = 0; x < SlotFiveConst.Cols; x++) for (int j = 0; j < 5; j++) _cells[x, j].Icon = -1;
            ApplyBackground();
        }

        // ------------------------------------------------------------ positions from the scene UI

        /// <summary>World rect of rt in stage px (top-left origin, y down), so moved / scaled UI still lines up.</summary>
        private Rect StageRect(RectTransform rt)
        {
            var c = new Vector3[4];
            rt.GetWorldCorners(c);
            Vector2 a = Stage.InverseTransformPoint(c[0]), b = Stage.InverseTransformPoint(c[2]);
            var s = Stage.rect;
            return Rect.MinMaxRect(a.x - s.xMin, s.yMax - b.y, b.x - s.xMin, s.yMax - a.y);
        }

        /// <summary>Centre of grid cell (x, y) where it sits in the scene (row y is cell view y + 1).</summary>
        private Vector2 CellCenterPx(int x, int y) => StageRect(_cells[x, y + 1].Root).center;

        /// <summary>Fighter rect at rest (without the hit shake).</summary>
        private Rect FighterPx(Side side)
        {
            var r = StageRect(_fighters[(int)side].rectTransform);
            var shake = _fighters[(int)side].rectTransform.anchoredPosition - _fighterBase[(int)side];
            r.x -= shake.x;
            return r;
        }

        private Vector2 CastFrom(Cast c)
        {
            var chains = Match.LastSpin.Chains;
            if (c.ChainIndex < 0 || c.ChainIndex >= chains.Count) return c.From;
            var cells = chains[c.ChainIndex].Cells;
            var sum = Vector2.zero;
            foreach (var cell in cells) sum += CellCenterPx(cell.X, cell.Y);
            return sum / Mathf.Max(1, cells.Length);
        }

        private Vector2 CastTo(Cast c) => FighterPx(c.Target).center;

        /// <summary>Float text box of a side, kept at the same place relative to its fighter as in the layout.</summary>
        private Rect FloatBox(Side side)
        {
            var box = SlotFiveLayout.Float(side);
            var moved = FighterPx(side).position - SlotFiveLayout.Fighter(side).position;
            box.position += moved;
            return box;
        }

        private void FillLegend()
        {
            for (int i = _legend.childCount - 1; i >= 0; i--)
                if (_legend.GetChild(i).name.StartsWith("Row")) Destroy(_legend.GetChild(i).gameObject);
            var t = Match.MatchTuning;
            float y = 76;
            foreach (int icon in Match.ActiveIcons)
            {
                var row = SlotFiveUi.Node($"Row{icon}", _legend);
                SlotFiveUi.Place(row, new Rect(20, y, _legend.rect.width - 40, 60));
                var art = IconSprite(icon);
                var tile = SlotFiveUi.Box("Tile", row, new Rect(0, 4, 52, 52), CellColor(icon), art != null ? art : SlotFiveUi.Rounded);
                tile.preserveAspect = art != null;
                if (art == null) SlotFiveUi.Label("Glyph", tile.transform, SlotFiveColors.Glyph[icon], 13, SlotFiveColors.GlyphColor(icon));
                var kind = SlotFiveConst.IconKinds[icon];
                string what = kind == Kind.Damage ? $"sát thương {t.BaseOf(icon)}"
                    : kind == Kind.Heal ? $"hồi máu {t.BaseOf(icon)}"
                    : kind == Kind.Shield ? $"khiên {t.BaseOf(icon)}" : "chưa có tác dụng";
                var text = SlotFiveUi.Label("Text", row, $"{SlotFiveConst.IconNames[icon]}: {what}", 20, SlotFiveColors.Text, TextAnchor.MiddleLeft, FontStyle.Normal);
                text.rectTransform.offsetMin = new Vector2(68, 0);
                y += 64;
            }
            var note = SlotFiveUi.Node("RowNote", _legend);
            SlotFiveUi.Place(note, new Rect(20, y + 4, _legend.rect.width - 40, 26));
            SlotFiveUi.Label("Text", note, $"3 ô liền nhau: x1, 4 ô: x{t.sfLen4Mult}", 17, SlotFiveColors.Muted, TextAnchor.MiddleLeft, FontStyle.Normal);
        }

        // ------------------------------------------------------------ events

        private void OnMatchStarted()
        {
            var grid = Match.Grid;
            for (int x = 0; x < SlotFiveConst.Cols; x++)
            {
                _reelOffset[x] = 0;
                _reelStoppedAt[x] = double.NegativeInfinity;
                SetCell(_cells[x, 0], RandomActive());
                for (int y = 0; y < SlotFiveConst.Rows; y++) SetCell(_cells[x, y + 1], grid[y][x]);
            }
            _highlightOn = false;
            _highlight.Clear();
            foreach (var f in _fx) Destroy(f.Img.gameObject);
            _fx.Clear();
            foreach (var f in _floats) Destroy(f.Text.gameObject);
            _floats.Clear();
            foreach (var p in _liveProjectiles.Values) if (p != null) Destroy(p);
            _liveProjectiles.Clear();
            if (_vfxLayer != null) for (int i = _vfxLayer.childCount - 1; i >= 0; i--) Destroy(_vfxLayer.GetChild(i).gameObject);
            FillLegend();
        }

        private void OnSpinStarted(Side side)
        {
            _highlightOn = false;
            _highlight.Clear();
        }

        private void OnReelStopped(int col)
        {
            var grid = Match.Grid;
            _reelOffset[col] = 0;
            _reelStoppedAt[col] = Match.Clock;
            SetCell(_cells[col, 0], RandomActive());
            for (int y = 0; y < SlotFiveConst.Rows; y++) SetCell(_cells[col, y + 1], grid[y][col]);
        }

        private void OnResolveStarted()
        {
            _highlightOn = true;
            foreach (var c in Match.LastChains) foreach (var cell in c.Cells) _highlight.Add(cell);
            // Chain flash: one per distinct cell, at most eff(castDelay + castFlight) long.
            double flash = Match.Timing.CastDelayMs + Match.Timing.CastFlightMs;
            foreach (var cell in _highlight)
            {
                int icon = Match.Grid[cell.Y][cell.X];
                var c = SlotFiveColors.Icon[icon];
                var at = CellCenterPx(cell.X, cell.Y);
                // Volt cells glow softer so the blue-white bolts keep their contrast on top.
                float glowAlpha = icon == 1 && voltLinkPrefab != null ? 0.4f : 0.7f;
                _cells[cell.X, cell.Y + 1].PopStart = Match.Clock;
                if (matchPopPrefab != null)
                {
                    var pop = SpawnVfx(matchPopPrefab, at, 0f, 0.5, null);
                    pop.transform.localScale = Vector3.one * matchPopScale;   // particles use Scaling Mode Hierarchy
                    TintPop(pop, SlotFiveColors.Accent[icon], matchPopBrightness);
                }
                else if (chainFlashPrefab != null) SpawnVfx(chainFlashPrefab, at, 0f, flash / 1000.0 + 0.1, new Color(c.r, c.g, c.b, glowAlpha));
                else SpawnFx(SlotFiveUi.Rounded, at, 96, 120, new Color(c.r, c.g, c.b, 0.85f), flash);
            }
            // Volt chains: a bolt jumps from each cell to the next one along the chain.
            if (voltLinkPrefab != null)
                foreach (var chain in Match.LastChains)
                    if (chain.Icon == 1)
                        for (int k = 0; k + 1 < chain.Cells.Length; k++)
                            SpawnVoltLink(chain.Cells[k], chain.Cells[k + 1], k * voltLinkStaggerMs / 1000f);
        }

        private void OnCastImpacted(Cast c, int hpDelta, int shieldDelta)
        {
            double tail = Mathf.Max(1, Match.Timing.CastTailMs);
            var color = SlotFiveColors.Icon[c.Icon];
            // The projectile is destroyed exactly when its hit starts.
            if (_liveProjectiles.TryGetValue(c, out var proj)) { if (proj != null) Destroy(proj); _liveProjectiles.Remove(c); }
            var to = CastTo(c);
            var hit = hitPrefabs != null && c.Icon < hitPrefabs.Length ? hitPrefabs[c.Icon] : null;
            if (IsStrike(c)) { }   // the strike prefab carries its own impact (one impact flash)
            else if (hit != null) SpawnVfx(hit, to, 0f, tail / 1000.0 + 0.1, null);
            else SpawnFx(SlotFiveUi.Circle, to, 40, 104, color, tail);
            if (c.Kind == Kind.Damage)
            {
                if (c.Absorbed > 0)
                {
                    if (blockPrefab != null) SpawnVfx(blockPrefab, to, 0f, tail / 1000.0 + 0.1, null);
                    else SpawnFx(SlotFiveUi.Rounded, to, 70, 96, SlotFiveColors.ShieldBar, tail);
                }
                _shake[(int)c.Target] = 1;
                if (hpDelta < 0) SpawnFloat(c.Target, $"-{-hpDelta}", SlotFiveColors.HpLow);
                if (c.Absorbed > 0) SpawnFloat(c.Target, $"Chặn {c.Absorbed}", SlotFiveColors.ShieldBar);
                if (hpDelta == 0 && c.Absorbed == 0) SpawnFloat(c.Target, "0", SlotFiveColors.Muted);
            }
            else if (c.Kind == Kind.Heal) SpawnFloat(c.Target, $"+{hpDelta}", SlotFiveColors.Hp);
            else SpawnFloat(c.Target, $"Khiên +{shieldDelta}", SlotFiveColors.ShieldBar);
        }

        private bool IsStrike(Cast c) => c.Icon == 1 && voltStrikePrefab != null;

        /// <summary>
        /// Volt strike: spawned at launch on the chain, aimed and stretched to the fighter, played at a speed that lands the
        /// bolt (prefab time voltStrikeHitTime) right on the cast impact.
        /// </summary>
        private void SpawnStrike(Cast c)
        {
            var from = CastFrom(c);
            var to = CastTo(c);
            var d = to - from;
            float angle = Mathf.Atan2(-d.y, d.x) * Mathf.Rad2Deg;
            float ratio = d.magnitude / pxPerMetre / Mathf.Max(0.01f, voltStrikeLength);

            var go = Instantiate(voltStrikePrefab, _vfxLayer, false);
            go.transform.localPosition = ToVfx(from);
            go.transform.localRotation = Quaternion.Euler(0f, 0f, angle);

            double flightSec = (c.ImpactMs - c.LaunchMs) / 1000.0 - 0.02 * TimeScale;
            float speed = voltStrikeHitTime / Mathf.Max(0.05f, (float)flightSec);
            var block = new MaterialPropertyBlock();
            var feet = FighterPx(c.Target);
            var feetPx = new Vector2(feet.center.x, feet.yMax - feet.height * 0.08f);
            foreach (var ps in go.GetComponentsInChildren<ParticleSystem>(true))
            {
                var main = ps.main;
                main.simulationSpeed = speed;
                var r = ps.GetComponent<ParticleSystemRenderer>();
                if (r.renderMode == ParticleSystemRenderMode.Stretch)
                {
                    r.lengthScale *= ratio;
                    r.GetPropertyBlock(block);
                    block.SetFloat("_Aspect", r.lengthScale);
                    r.SetPropertyBlock(block);
                }
                if (ps.name.StartsWith("AtFeet")) ps.transform.position = _vfxLayer.TransformPoint(ToVfx(feetPx));
                else if (ps.name.StartsWith("At")) ps.transform.position = _vfxLayer.TransformPoint(ToVfx(to));
            }
            foreach (var ps in go.GetComponentsInChildren<ParticleSystem>(true)) { ps.Clear(true); ps.Play(true); }
            Destroy(go, 0.75f / Mathf.Max(0.01f, speed) + 0.05f);
        }

        private void OnCastLaunched(Cast c)
        {
            if (IsStrike(c)) { SpawnStrike(c); return; }
            var prefab = projectilePrefabs != null && c.Icon < projectilePrefabs.Length ? projectilePrefabs[c.Icon] : null;
            if (prefab == null) return;
            // Prefabs fly along local +X: turn the root toward the target (stage y is up, game y is down).
            var from = CastFrom(c);
            var d = CastTo(c) - from;
            float angle = Mathf.Atan2(-d.y, d.x) * Mathf.Rad2Deg;
            _liveProjectiles[c] = SpawnVfx(prefab, from, angle, -1, null);
        }

        /// <summary>
        /// Tints every layer of the (art-lead edited) match pop with the icon's dominant colour; only the root flash keeps
        /// a little white so its core still reads hot. Runtime only: the prefab itself is never modified.
        /// </summary>
        private static void TintPop(GameObject go, Color icon, float brightness)
        {
            // Additive layers: brighter = more alpha (capped at 1) plus a little extra white on top of the icon colour.
            float extraWhite = Mathf.Clamp01((brightness - 1f) * 0.25f);
            foreach (var ps in go.GetComponentsInChildren<ParticleSystem>(true))
            {
                float white = ps.transform == go.transform ? 0.3f : ps.name == "Burst" ? 0.15f : 0f;
                var main = ps.main;
                var col = Color.Lerp(icon, Color.white, Mathf.Clamp01(white + extraWhite));
                col.a = Mathf.Clamp01(main.startColor.color.a * brightness);   // authored alpha, boosted
                main.startColor = col;
            }
        }

        /// <summary>Card punch (brief "puzzle" pop): 1 -> 1.18 ease-out in 80 ms, then settles back with a small undershoot by 220 ms.</summary>
        private static float PunchScale(float ms)
        {
            if (ms < 0f || ms >= 220f) return 1f;
            if (ms < 80f) { float t = ms / 80f; return 1f + 0.18f * (1f - (1f - t) * (1f - t)); }
            float u = (ms - 80f) / 140f;
            return 1f + 0.18f * Mathf.Cos(u * Mathf.PI * 1.5f) * (1f - u);
        }

        private void SpawnVoltLink(Cell a, Cell b, float delaySeconds)
        {
            var pa = CellCenterPx(a.X, a.Y);
            var pb = CellCenterPx(b.X, b.Y);
            var d = pb - pa;
            float metres = d.magnitude / pxPerMetre;
            float angle = Mathf.Atan2(-d.y, d.x) * Mathf.Rad2Deg;
            var go = SpawnVfx(voltLinkPrefab, pa, angle, delaySeconds + 0.5, null);
            float aspect = metres / Mathf.Max(0.01f, voltLinkWidth);
            var block = new MaterialPropertyBlock();
            foreach (var ps in go.GetComponentsInChildren<ParticleSystem>(true))
            {
                var main = ps.main;
                main.startDelay = main.startDelay.constant + delaySeconds;
                var r = ps.GetComponent<ParticleSystemRenderer>();
                if (r.renderMode == ParticleSystemRenderMode.Stretch)
                {
                    // Diagonal neighbours are farther apart: stretch the bolt and keep its zigzag proportions.
                    r.lengthScale = aspect;
                    r.GetPropertyBlock(block);
                    block.SetFloat("_Aspect", aspect);
                    r.SetPropertyBlock(block);
                }
                else if (ps.transform != go.transform)
                {
                    ps.transform.localPosition = new Vector3(metres, 0f, 0f);   // the tip star sits on B
                }
            }
            foreach (var ps in go.GetComponentsInChildren<ParticleSystem>(true)) { ps.Clear(true); ps.Play(true); }
        }

        /// <summary>Game px (top-left origin, y down) to VFX-layer metres (stage centre origin, y up).</summary>
        private Vector3 ToVfx(Vector2 gamePx) =>
            new Vector3((gamePx.x - SlotFiveLayout.Width / 2) / pxPerMetre, (SlotFiveLayout.Height / 2 - gamePx.y) / pxPerMetre, 0f);

        /// <summary>Instantiates a particle prefab on the VFX layer, scaled to the turn's speed. lifeSeconds &lt; 0 keeps it.</summary>
        private GameObject SpawnVfx(GameObject prefab, Vector2 atGamePx, float angleDeg, double lifeSeconds, Color? tint)
        {
            var go = Instantiate(prefab, _vfxLayer, false);
            go.transform.localPosition = ToVfx(atGamePx);
            go.transform.localRotation = Quaternion.Euler(0f, 0f, angleDeg);
            float speed = 1f / Mathf.Max(0.01f, TimeScale);
            foreach (var ps in go.GetComponentsInChildren<ParticleSystem>(true))
            {
                var main = ps.main;
                main.simulationSpeed = speed;
            }
            if (tint.HasValue)
            {
                var root = go.GetComponent<ParticleSystem>();
                if (root != null) { var main = root.main; main.startColor = tint.Value; }
            }
            if (lifeSeconds >= 0) Destroy(go, (float)(lifeSeconds * TimeScale) + 0.05f);
            return go;
        }

        private void SpawnFx(Sprite sprite, Vector2 at, float from, float to, Color color, double durationMs)
        {
            var img = SlotFiveUi.Node("Fx", _fxLayer).gameObject.AddComponent<Image>();
            img.sprite = sprite;
            img.type = Image.Type.Simple;
            img.color = color;
            img.raycastTarget = false;
            SlotFiveUi.Center(img.rectTransform, at, new Vector2(from, from));
            _fx.Add(new Fx { Img = img, Start = Match.Clock, Duration = durationMs, From = from, To = to });
        }

        private void SpawnFloat(Side side, string text, Color color)
        {
            var box = FloatBox(side);
            var t = SlotFiveUi.Label("Float", _fxLayer, text, 24, color);
            t.rectTransform.anchorMin = t.rectTransform.anchorMax = new Vector2(0, 1);
            t.rectTransform.pivot = new Vector2(0.5f, 0.5f);
            t.rectTransform.sizeDelta = new Vector2(box.width, 30);
            t.horizontalOverflow = HorizontalWrapMode.Wrap;
            var o = t.gameObject.AddComponent<Outline>();
            o.effectColor = new Color(0, 0, 0, 0.9f);
            _floats.Add(new FloatText
            {
                Text = t, Side = side, Start = Match.Clock, Duration = 800 * TimeScale,
                X = box.center.x,
            });
        }

        // ------------------------------------------------------------ render

        private void Render()
        {
            var m = Match;
            var s = m.State;
            double now = m.Clock;

            // banner
            string banner;
            switch (m.Phase)
            {
                case Phase.Ended: banner = s.Status == BattleStatus.Won ? "Bạn thắng!" : "Bạn thua!"; break;
                case Phase.FoeWait: banner = "Đối thủ chuẩn bị..."; break;
                default: banner = m.LastSide == Side.Foe && m.Phase != Phase.Idle ? "Lượt đối thủ" : (m.Phase == Phase.Idle ? "Lượt của bạn" : "Bạn đang quay"); break;
            }
            _banner.text = banner;
            _banner.color = m.Phase == Phase.Ended ? SlotFiveColors.Spin : SlotFiveColors.Text;

            RenderReels(now);
            RenderCasts();
            RenderHud();
            RenderFx(now);

            bool canSpin = m.Phase == Phase.Idle && s.Turn == Side.Player && s.Status == BattleStatus.Playing;
            if (spinBtnSprite != null) _spinImg.color = canSpin ? Color.white : new Color(0.6f, 0.6f, 0.6f, 0.6f);
            else _spinImg.color = canSpin ? SlotFiveColors.Spin : new Color(SlotFiveColors.Spin.r, SlotFiveColors.Spin.g, SlotFiveColors.Spin.b, 0.35f);
            if (newBtnSprite != null) _newImg.color = m.Phase == Phase.Ended ? new Color(1f, 0.85f, 0.35f) : Color.white;
            else _newImg.color = m.Phase == Phase.Ended ? SlotFiveColors.Spin : SlotFiveColors.Button;
            _newLabel.color = m.Phase == Phase.Ended ? SlotFiveColors.SpinText : SlotFiveColors.Text;
            if (fastBtnSprite != null) _fastImg.color = m.FastMode ? new Color(0.45f, 1f, 0.85f) : Color.white;
            else _fastImg.color = m.FastMode ? SlotFiveColors.FastOn : SlotFiveColors.Button;
            _fastLabel.color = m.FastMode ? SlotFiveColors.SpinText : SlotFiveColors.Text;
        }

        private void RenderReels(double now)
        {
            var m = Match;
            float step = SlotFiveLayout.PitchY;
            float speed = m.MatchTuning.sfReelSpeed / Mathf.Max(0.01f, TimeScale); // px per ms
            float dt = _dtMs;
            double bounceMs = Mathf.Max(1, m.Timing.StopBounceMs);
            for (int x = 0; x < SlotFiveConst.Cols; x++)
            {
                bool spinning = m.Phase == Phase.Spinning && x >= m.ReelsStopped;
                // Clip only while the column scrolls, so a stopped column's punch (scale 1.18) is never cut off.
                _reelMasks[x].enabled = spinning;
                _cells[x, 0].Root.gameObject.SetActive(spinning);   // the spare cell above the column only shows while scrolling
                float offset;
                if (spinning)
                {
                    // Decorative scroll: random icons, never the logic RNG.
                    _reelOffset[x] += speed * dt;
                    while (_reelOffset[x] >= step)
                    {
                        _reelOffset[x] -= step;
                        for (int j = 4; j > 0; j--) SetCell(_cells[x, j], _cells[x, j - 1].Icon);
                        SetCell(_cells[x, 0], RandomActive());
                    }
                    offset = _reelOffset[x];
                }
                else
                {
                    double p = (now - _reelStoppedAt[x]) / bounceMs;
                    offset = p >= 0 && p < 1 ? (float)(14 * System.Math.Sin(p * System.Math.PI) * (1 - p)) : 0;
                }
                for (int j = 0; j < 5; j++)
                {
                    var v = _cells[x, j];
                    SlotFiveUi.Place(v.Root, new Rect(0, (j - 1) * step + offset, SlotFiveLayout.CellWidth, SlotFiveLayout.CellHeight));
                    bool lit = !spinning && _highlightOn && j > 0 && _highlight.Contains(new Cell(x, j - 1));
                    v.Glow.color = lit ? Color.white : new Color(1, 1, 1, 0);
                    float popMs = (float)((now - v.PopStart) / Mathf.Max(0.01f, TimeScale));
                    float punch = spinning || j == 0 ? 1f : PunchScale(popMs);
                    v.Bg.rectTransform.localScale = new Vector3(punch, punch, 1f);
                    v.Glow.rectTransform.localScale = v.Bg.rectTransform.localScale;
                    float flashA = spinning || j == 0 || popMs < 0f || popMs > 150f ? 0f : 0.85f * (1f - popMs / 150f);
                    v.Flash.color = new Color(1f, 1f, 1f, flashA);
                    var baseColor = CellColor(v.Icon);
                    v.Bg.color = spinning ? Color.Lerp(baseColor, SlotFiveColors.Frame, 0.25f)
                        : (_highlightOn && !lit && m.HighlightedCells > 0 ? Color.Lerp(baseColor, SlotFiveColors.Frame, 0.55f) : baseColor);
                }
            }
        }

        private void RenderCasts()
        {
            var m = Match;
            int n = 0;
            if (m.Phase == Phase.Resolving)
            {
                foreach (var c in m.LastCasts)
                {
                    if (!c.Launched || c.Impacted || IsStrike(c)) continue;
                    float p = Mathf.Clamp01((float)((m.PhaseElapsed - c.LaunchMs) / Mathf.Max(1, c.ImpactMs - c.LaunchMs)));
                    var at = Vector2.Lerp(CastFrom(c), CastTo(c), p);
                    if (_liveProjectiles.TryGetValue(c, out var vfx) && vfx != null)
                    {
                        vfx.transform.localPosition = ToVfx(at);
                        continue;
                    }
                    var img = Projectile(n++);
                    img.color = SlotFiveColors.Icon[c.Icon];
                    SlotFiveUi.Center(img.rectTransform, at, new Vector2(40, 40));
                    img.gameObject.SetActive(true);
                }
            }
            for (int i = n; i < _projectiles.Count; i++) _projectiles[i].gameObject.SetActive(false);
        }

        private Image Projectile(int i)
        {
            while (_projectiles.Count <= i)
            {
                var img = SlotFiveUi.Node("Projectile", _fxLayer).gameObject.AddComponent<Image>();
                img.sprite = SlotFiveUi.Circle;
                img.raycastTarget = false;
                var glow = SlotFiveUi.Node("Core", img.transform).gameObject.AddComponent<Image>();
                glow.sprite = SlotFiveUi.Circle;
                glow.color = new Color(1, 1, 1, 0.85f);
                glow.raycastTarget = false;
                SlotFiveUi.Fill(glow.rectTransform);
                glow.rectTransform.offsetMin = new Vector2(11, 11);
                glow.rectTransform.offsetMax = new Vector2(-11, -11);
                _projectiles.Add(img);
            }
            return _projectiles[i];
        }

        private void RenderHud()
        {
            var s = Match.State;
            foreach (var side in new[] { Side.Player, Side.Foe })
            {
                int i = (int)side;
                int max = side == Side.Player ? s.Player.MaxHp : s.Foe.MaxHp;
                int hp = Match.DisplayHp(side), sh = Match.DisplayShield(side);
                float w = _hud[i].rect.width, hh = _hud[i].rect.height;
                float hpRatio = Mathf.Clamp01((float)hp / Mathf.Max(1, max));
                float shRatio = Mathf.Clamp01((float)sh / Mathf.Max(1, max));
                bool low = hp * 4 <= max;
                if (hpBarSprite != null)
                {
                    // Art bars: full inner rect of the track, cut by fillAmount (player drains to the left, foe to the right).
                    var inner = new Rect(4, 4, w - 8, hh - 8);
                    SetBar(_hpFill[i], low && hpBarLowSprite != null ? hpBarLowSprite : hpBarSprite, inner, hpRatio, side);
                    SetBar(_shieldFill[i], shieldBarSprite != null ? shieldBarSprite : hpBarSprite,
                        new Rect(inner.x, inner.yMax - 6, inner.width, 6), shRatio, side);
                }
                else
                {
                    var hpRt = _hpFill[i].rectTransform;
                    SlotFiveUi.Place(hpRt, new Rect(0, 0, w * hpRatio, hh));
                    _hpFill[i].color = low ? SlotFiveColors.HpLow : SlotFiveColors.Hp;
                    SlotFiveUi.Place(_shieldFill[i].rectTransform, new Rect(0, hh - 8, w * shRatio, 8));
                }
                _hpFill[i].gameObject.SetActive(hp > 0);
                _shieldFill[i].gameObject.SetActive(sh > 0);
                _hpText[i].text = sh > 0 ? $"{hp}/{max} <size=17>khiên {sh}</size>" : $"{hp}/{max}";

                // hit shake on the fighter
                _shake[i] = Mathf.Max(0, _shake[i] - _dtMs / Mathf.Max(1, 220 * TimeScale));
                float dx = _shake[i] > 0 ? Mathf.Sin(_shake[i] * 40) * 6 * _shake[i] : 0;
                _fighters[i].rectTransform.anchoredPosition = _fighterBase[i] + new Vector2(dx, 0f);   // authored spot + shake
                if (FighterSprite(side) != null)
                {
                    // Hero art: red flash on hit, greyed out when defeated.
                    _fighters[i].color = Color.Lerp(Color.white, new Color(1f, 0.45f, 0.45f), _shake[i]);
                    if (Match.Phase == Phase.Ended && hp == 0) _fighters[i].color = new Color(0.35f, 0.35f, 0.4f, 0.85f);
                }
                else
                {
                    var baseColor = side == Side.Player ? SlotFiveColors.Player : SlotFiveColors.Foe;
                    _fighters[i].color = Color.Lerp(baseColor, Color.white, _shake[i] * 0.6f);
                    if (Match.Phase == Phase.Ended && hp == 0) _fighters[i].color = Color.Lerp(baseColor, Color.black, 0.6f);
                }
            }
        }

        private static void SetBar(Image img, Sprite art, Rect r, float ratio, Side side)
        {
            if (img.sprite != art) img.sprite = art;
            img.type = Image.Type.Filled;
            img.fillMethod = Image.FillMethod.Horizontal;
            img.fillOrigin = side == Side.Player ? (int)Image.OriginHorizontal.Left : (int)Image.OriginHorizontal.Right;
            img.fillAmount = ratio;
            img.color = Color.white;
            SlotFiveUi.Place(img.rectTransform, r);
        }

        private void RenderFx(double now)
        {
            for (int i = _fx.Count - 1; i >= 0; i--)
            {
                var f = _fx[i];
                float p = (float)((now - f.Start) / f.Duration);
                if (p >= 1) { Destroy(f.Img.gameObject); _fx.RemoveAt(i); continue; }
                float size = Mathf.Lerp(f.From, f.To, Mathf.Sqrt(p));
                f.Img.rectTransform.sizeDelta = new Vector2(size, size);
                var c = f.Img.color;
                c.a = (1 - p) * 0.9f;
                f.Img.color = c;
            }
            // Newest first: each float rises from the bottom to the top of its *Float box; an older float of the
            // same side is pushed up to stay one line above the newer one, clamped inside the box.
            float[] ceiling = { float.MaxValue, float.MaxValue };
            for (int i = _floats.Count - 1; i >= 0; i--)
            {
                var f = _floats[i];
                float p = (float)((now - f.Start) / Mathf.Max(1, (float)f.Duration));
                if (p >= 1) { Destroy(f.Text.gameObject); _floats.RemoveAt(i); continue; }
                var box = FloatBox(f.Side);
                float y = Mathf.Lerp(box.yMax - 15, box.y + 15, p);
                y = Mathf.Max(box.y + 15, Mathf.Min(y, ceiling[(int)f.Side] - 26));
                ceiling[(int)f.Side] = y;
                f.Text.rectTransform.anchoredPosition = new Vector2(f.X, -y);
                var c = f.Text.color;
                c.a = p < 0.7f ? 1 : 1 - (p - 0.7f) / 0.3f;
                f.Text.color = c;
            }
        }

        // ------------------------------------------------------------ helpers

        private int RandomActive()
        {
            var a = Match.ActiveIcons;
            return a[_decor.Next(a.Length)];
        }

        private Sprite IconSprite(int icon) =>
            iconSprites != null && icon >= 0 && icon < iconSprites.Length ? iconSprites[icon] : null;

        /// <summary>Base tint of a cell: white over icon art, the icon colour on a placeholder tile.</summary>
        private Color CellColor(int icon) => IconSprite(icon) != null ? Color.white : SlotFiveColors.Icon[icon];

        private void SetCell(CellView v, int icon)
        {
            if (v.Icon == icon) return;
            v.Icon = icon;
            var art = IconSprite(icon);
            v.Bg.sprite = art != null ? art : SlotFiveUi.Rounded;
            v.Bg.type = art != null ? Image.Type.Simple : Image.Type.Sliced;
            v.Bg.preserveAspect = art != null;
            v.Bg.color = CellColor(icon);
            v.Flash.sprite = v.Bg.sprite;
            v.Flash.type = v.Bg.type;
            v.Flash.preserveAspect = v.Bg.preserveAspect;
            // The highlight frame hugs the card art (portrait) instead of the whole square cell.
            if (art != null)
            {
                // Card drawn inside the cell minus the inset, keeping its aspect; the frame sits 3 px outside it.
                float boxW = SlotFiveLayout.CellWidth - 2f * Inset, boxH = SlotFiveLayout.CellHeight - 2f * Inset;
                float aspect = art.rect.width / Mathf.Max(1f, art.rect.height);
                float w = Mathf.Min(boxW, boxH * aspect), h = w / Mathf.Max(0.01f, aspect);
                float sideX = Mathf.Max(0f, (SlotFiveLayout.CellWidth - w) / 2f - 3f);
                float sideY = Mathf.Max(0f, (SlotFiveLayout.CellHeight - h) / 2f - 3f);
                v.Glow.rectTransform.offsetMin = new Vector2(sideX, sideY);
                v.Glow.rectTransform.offsetMax = new Vector2(-sideX, -sideY);
            }
            else
            {
                v.Glow.rectTransform.offsetMin = Vector2.zero;
                v.Glow.rectTransform.offsetMax = Vector2.zero;
            }
            v.Glyph.text = art != null ? "" : SlotFiveColors.Glyph[icon];
            v.Glyph.color = SlotFiveColors.GlyphColor(icon);
        }

        private void OnDestroy()
        {
            if (Match == null) return;
            Match.MatchStarted -= OnMatchStarted;
            Match.SpinStarted -= OnSpinStarted;
            Match.ReelStopped -= OnReelStopped;
            Match.ResolveStarted -= OnResolveStarted;
            Match.CastLaunched -= OnCastLaunched;
            Match.CastImpacted -= OnCastImpacted;
        }
    }
}
