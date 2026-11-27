using UnityEngine;
using UnityEngine.UI;

namespace SlotFive
{
    /// <summary>Small uGUI builders and procedural sprites for the code-built Slot Five view (no art assets yet).</summary>
    public static class SlotFiveUi
    {
        private static Sprite _rounded;
        private static Sprite _circle;
        private static Font _font;

        public static Font Font => _font != null ? _font : (_font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf"));

        public const int RoundedSize = 64, RoundedRadius = 14, CircleSize = 64;

        /// <summary>
        /// Asset copies of the two procedural sprites (T_SF_Rounded / T_SF_Circle, written by the scene build). UI saved in
        /// the scene must reference assets: a Sprite.Create sprite would be lost when the scene is saved.
        /// </summary>
        public static void UseAssets(Sprite rounded, Sprite circle)
        {
            if (rounded != null) _rounded = rounded;
            if (circle != null) _circle = circle;
        }

        /// <summary>White rounded rectangle, 9-sliced.</summary>
        public static Sprite Rounded => _rounded != null ? _rounded : (_rounded = MakeRounded(RoundedSize, RoundedRadius));

        /// <summary>White soft-edged disc.</summary>
        public static Sprite Circle => _circle != null ? _circle : (_circle = MakeCircle(CircleSize));

        public static Texture2D RoundedTexture() => MakeRounded(RoundedSize, RoundedRadius).texture;
        public static Texture2D CircleTexture() => MakeCircle(CircleSize).texture;

        private static Sprite MakeRounded(int size, int radius)
        {
            var tex = new Texture2D(size, size, TextureFormat.RGBA32, false) { wrapMode = TextureWrapMode.Clamp, name = "SF_Rounded" };
            var px = new Color32[size * size];
            for (int y = 0; y < size; y++)
                for (int x = 0; x < size; x++)
                {
                    float cx = Mathf.Clamp(x + 0.5f, radius, size - radius);
                    float cy = Mathf.Clamp(y + 0.5f, radius, size - radius);
                    float d = Vector2.Distance(new Vector2(x + 0.5f, y + 0.5f), new Vector2(cx, cy));
                    byte a = (byte)(Mathf.Clamp01(radius - d + 0.5f) * 255);
                    px[y * size + x] = new Color32(255, 255, 255, a);
                }
            tex.SetPixels32(px);
            tex.Apply();
            return Sprite.Create(tex, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), 100, 0,
                SpriteMeshType.FullRect, new Vector4(radius, radius, radius, radius));
        }

        private static Sprite MakeCircle(int size)
        {
            var tex = new Texture2D(size, size, TextureFormat.RGBA32, false) { wrapMode = TextureWrapMode.Clamp, name = "SF_Circle" };
            var px = new Color32[size * size];
            float r = size / 2f;
            for (int y = 0; y < size; y++)
                for (int x = 0; x < size; x++)
                {
                    float d = Vector2.Distance(new Vector2(x + 0.5f, y + 0.5f), new Vector2(r, r));
                    byte a = (byte)(Mathf.Clamp01(r - d) * 255);
                    px[y * size + x] = new Color32(255, 255, 255, a);
                }
            tex.SetPixels32(px);
            tex.Apply();
            return Sprite.Create(tex, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), 100);
        }

        public static RectTransform Node(string name, Transform parent)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.layer = parent.gameObject.layer;
            var rt = (RectTransform)go.transform;
            rt.SetParent(parent, false);
            return rt;
        }

        /// <summary>Places rt at a game-px rect (top-left origin, y down) inside a parent that uses the same space.</summary>
        public static RectTransform Place(RectTransform rt, Rect r)
        {
            rt.anchorMin = rt.anchorMax = new Vector2(0, 1);
            rt.pivot = new Vector2(0, 1);
            rt.anchoredPosition = new Vector2(r.x, -r.y);
            rt.sizeDelta = new Vector2(r.width, r.height);
            return rt;
        }

        /// <summary>Centers rt on a game-px point.</summary>
        public static void Center(RectTransform rt, Vector2 p, Vector2 size)
        {
            rt.anchorMin = rt.anchorMax = new Vector2(0, 1);
            rt.pivot = new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = new Vector2(p.x, -p.y);
            rt.sizeDelta = size;
        }

        public static void Fill(RectTransform rt)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = rt.offsetMax = Vector2.zero;
        }

        public static Image Box(string name, Transform parent, Rect r, Color color, Sprite sprite = null)
        {
            var img = Node(name, parent).gameObject.AddComponent<Image>();
            Place(img.rectTransform, r);
            img.sprite = sprite;
            img.type = sprite != null && sprite.border != Vector4.zero ? Image.Type.Sliced : Image.Type.Simple;
            img.color = color;
            img.raycastTarget = false;
            return img;
        }

        public static Text Label(string name, Transform parent, string text, int size, Color color,
            TextAnchor anchor = TextAnchor.MiddleCenter, FontStyle style = FontStyle.Bold)
        {
            var t = Node(name, parent).gameObject.AddComponent<Text>();
            t.font = Font;
            t.text = text;
            t.fontSize = size;
            t.fontStyle = style;
            t.color = color;
            t.alignment = anchor;
            t.horizontalOverflow = HorizontalWrapMode.Overflow;
            t.verticalOverflow = VerticalWrapMode.Overflow;
            t.raycastTarget = false;
            Fill(t.rectTransform);
            return t;
        }

        public static Button Button(string name, Transform parent, Rect r, string text, int fontSize, Color bg, Color fg,
            out Text label, out Image image)
        {
            image = Box(name, parent, r, bg, Rounded);
            image.raycastTarget = true;
            var b = image.gameObject.AddComponent<Button>();
            b.targetGraphic = image;
            var colors = b.colors;
            colors.highlightedColor = new Color(1, 1, 1, 0.92f);
            colors.pressedColor = new Color(0.8f, 0.8f, 0.8f, 1);
            colors.disabledColor = new Color(1, 1, 1, 0.4f);
            b.colors = colors;
            label = Label("Label", image.transform, text, fontSize, fg);
            return b;
        }
    }

    /// <summary>Placeholder palette per icon until the Unity VFX / icon art exists.</summary>
    public static class SlotFiveColors
    {
        public static readonly Color Bg = Hex(0x100120);   // matches the corners of the reel panel art (layout v5.3)
        public static readonly Color Letterbox = Hex(0x07080D);
        public static readonly Color Frame = Hex(0x232A40);
        public static readonly Color PanelBg = Hex(0x1B2033);
        public static readonly Color Text = Hex(0xF2F4FA);
        public static readonly Color Muted = Hex(0xB8C0D8);
        public static readonly Color Hp = Hex(0x3DDC84);
        public static readonly Color HpLow = Hex(0xFF5A5A);
        public static readonly Color ShieldBar = Hex(0x5AA8FF);
        public static readonly Color Spin = Hex(0xFFC43D);
        public static readonly Color SpinText = Hex(0x1A1300);
        public static readonly Color Button = Hex(0x39415E);
        public static readonly Color FastOn = Hex(0x2BC4A8);
        public static readonly Color Player = Hex(0x4E8CFF);
        public static readonly Color Foe = Hex(0xE5534B);

        /// <summary>fire, volt, frost, earth, blade, heal, shield, lucky.</summary>
        public static readonly Color[] Icon =
        {
            Hex(0xFF6A2B), Hex(0xA86BFF), Hex(0x6FE3FF), Hex(0xA77B4F),   // volt purple to match its card art
            Hex(0xC9CED9), Hex(0x4CD964), Hex(0x4F8DFF), Hex(0xB86BFF),
        };

        /// <summary>
        /// Dominant colour of each icon's art (largest colour cluster of the fantasy-slot-assets icons, brightened for
        /// additive VFX). Drives the match pop tint. Fire / frost / earth have no art yet: same as Icon.
        /// </summary>
        public static readonly Color[] Accent =
        {
            Hex(0xFF6A2B), Hex(0x9C4DE0), Hex(0x6FE3FF), Hex(0xA77B4F),   // fire, volt (violet), frost, earth
            Hex(0x3A86FF), Hex(0x6EDC2A), Hex(0xF0A020), Hex(0xFFD84A),   // blade (blue), heal (green), shield (amber), lucky (star gold)
        };

        /// <summary>Short glyph text on each icon tile.</summary>
        public static readonly string[] Glyph = { "LỬA", "SÉT", "BĂNG", "ĐẤT", "KIẾM", "HỒI", "KHIÊN", "MAY" };

        public static Color Hex(int rgb) => new Color(((rgb >> 16) & 255) / 255f, ((rgb >> 8) & 255) / 255f, (rgb & 255) / 255f, 1);

        /// <summary>Dark text on light icons, light on dark (WCAG contrast of the glyph on its tile).</summary>
        public static Color GlyphColor(int icon) => icon == 3 || icon == 6 || icon == 7 ? Text : Hex(0x10131C);
    }
}
