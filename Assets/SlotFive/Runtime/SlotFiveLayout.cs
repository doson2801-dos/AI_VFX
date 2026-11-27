using UnityEngine;

namespace SlotFive
{
    /// <summary>
    /// Portrait layout of brief 4.9 (v4.1), in game pixels with the origin at the top left of a 540x960 stage.
    /// Rect.x/y is the top-left corner, y grows downwards.
    /// </summary>
    public static class SlotFiveLayout
    {
        public const float Width = 540;
        public const float Height = 960;

        // Layout v6 (2026-11-27, UI sheet + demo mock-up): castle background over the whole stage, reel panel
        // T_SF_ReelPanel (569 x 664, gold border + 16 empty slots) at ReelArtScale, heroes under it with VS between,
        // HP pills, bottom panel with the turn banner and the button row.
        // v6.2 (2026-11-27): the reel panel is T_SF_ReelGridSq (564 x 564, dark violet, 16 square slots drawn in)
        // with the square icons T_SF_IconSq_* (128 x 128); sample: Docs/SlotFive/art_ref/reel_grid_sq_sample.png.
        /// <summary>Reel panel art (T_SF_ReelGridSq, 564 x 564).</summary>
        public static readonly Rect ReelFrame = new Rect(60, 64, 420, 420);
        /// <summary>Game px per art px of the reel panel (420 / 564).</summary>
        public const float ReelArtScale = 420f / 564f;
        public static readonly Rect PlayerFloat = new Rect(18, 536, 160, 70);
        public static readonly Rect FoeFloat = new Rect(362, 536, 160, 70);
        public static readonly Rect PlayerFighter = new Rect(14, 546, 168, 151);
        public static readonly Rect FoeFighter = new Rect(358, 546, 168, 151);
        public static readonly Rect Vs = new Rect(235, 600, 70, 79);
        /// <summary>HP track (the tag pill overlaps its outer end).</summary>
        public static readonly Rect PlayerHud = new Rect(58, 708, 176, 28);
        public static readonly Rect FoeHud = new Rect(306, 708, 176, 28);
        public static readonly Rect PlayerTag = new Rect(12, 704, 66, 36);
        public static readonly Rect FoeTag = new Rect(462, 704, 66, 36);
        public static readonly Rect Panel = new Rect(0, 744, 540, 216);
        public static readonly Rect TurnBanner = new Rect(110, 760, 320, 43);
        public static readonly Rect HelpBtn = new Rect(22, 838, 56, 60);
        public static readonly Rect FastBtn = new Rect(86, 837, 70, 61);
        public static readonly Rect SpinBtn = new Rect(166, 814, 206, 108);
        public static readonly Rect NewBtn = new Rect(384, 835, 134, 66);
        public static readonly Rect Legend = ReelFrame;

        // Measured on T_SF_ReelGridSq (art px): square slots 132 x 132 (outline to outline), first at (12, 12), step 136.
        public const float CellWidth = 132f * ReelArtScale;     // 98.3
        public const float CellHeight = 132f * ReelArtScale;    // 98.3
        public const float PitchX = 136f * ReelArtScale;        // 101.3
        public const float PitchY = 136f * ReelArtScale;        // 101.3
        /// <summary>Top-left of cell (0, 0) relative to ReelFrame.</summary>
        public static Vector2 CellOrigin => new Vector2(12f, 12f) * ReelArtScale;
        /// <summary>Gap between the slot outline and the icon: the sample draws the 128 px icon in the 132 px slot.</summary>
        public const float IconInset = 2f * ReelArtScale;

        /// <summary>Cell (x, y) center: about (117.1 + 101.3x, 121.1 + 101.3y).</summary>
        public static Vector2 CellCenter(int x, int y) =>
            new Vector2(ReelFrame.x + CellOrigin.x + CellWidth / 2 + PitchX * x,
                        ReelFrame.y + CellOrigin.y + CellHeight / 2 + PitchY * y);

        public static Rect Fighter(Side side) => side == Side.Player ? PlayerFighter : FoeFighter;
        public static Rect Float(Side side) => side == Side.Player ? PlayerFloat : FoeFloat;
        public static Rect Hud(Side side) => side == Side.Player ? PlayerHud : FoeHud;
        public static Rect Tag(Side side) => side == Side.Player ? PlayerTag : FoeTag;

        /// <summary>Cast gap from the bottom of the reel panel to the top of the fighters.</summary>
        public static float CastGapTop => ReelFrame.yMax;
        public static float CastGapBottom => PlayerFighter.y;
    }
}
