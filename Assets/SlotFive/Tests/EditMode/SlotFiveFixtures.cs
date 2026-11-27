using System.Collections.Generic;

namespace SlotFive.Tests
{
    /// <summary>BRIEF_TUNING and the shared grid fixtures of brief section 8 (v4 grid, v5 icon set).</summary>
    public static class SlotFiveFixtures
    {
        /// <summary>
        /// BRIEF_TUNING v5: v4 base values, len mult and hp (tables 5.1, 5.2), plus the v5 weights of 5.6.
        /// Fixture numbers in the brief are computed from this, not from the live (tuned) defaults.
        /// </summary>
        public static SlotFiveTuning Brief() => new SlotFiveTuning
        {
            sfElement = 1, sfWElement = 22, sfWBlade = 36, sfWHeal = 15, sfWShield = 15, sfWLucky = 12,
            sfBFire = 10, sfBVolt = 15, sfBFrost = 15, sfBEarth = 10, sfBBlade = 5, sfBHeal = 20, sfBShield = 20,
            sfLen4Mult = 2, sfPlayerMaxHp = 450, sfFoeMaxHp = 450, sfSeed = 777,
        };

        /// <summary>B: grid[y][x] = (x + 2y) % 4, icons 0..3, no chain.</summary>
        public static int[][] B() => Base(0);

        /// <summary>C: grid[y][x] = 4 + (x + 2y) % 4, icons 4..7, no chain.</summary>
        public static int[][] C() => Base(4);

        private static int[][] Base(int offset)
        {
            var g = SlotFiveGrid.NewGrid();
            for (int y = 0; y < 4; y++)
                for (int x = 0; x < 4; x++)
                    g[y][x] = offset + (x + 2 * y) % 4;
            return g;
        }

        private static int[][] With(int[][] g, int icon, params (int x, int y)[] cells)
        {
            foreach (var (x, y) in cells) g[y][x] = icon;
            return g;
        }

        public static readonly Dictionary<string, System.Func<int[][]>> All = new Dictionary<string, System.Func<int[][]>>
        {
            ["F0"] = () => B(),
            ["F1"] = () => With(B(), 4, (0, 0), (1, 0), (2, 0)),
            ["F2"] = () => With(B(), 5, (0, 2), (1, 2), (2, 2), (3, 2)),
            ["F3"] = () => With(B(), 6, (1, 1), (2, 1), (3, 1)),
            ["F4"] = () => With(B(), 7, (2, 0), (2, 1), (2, 2), (2, 3)),
            ["F5"] = () => With(B(), 4, (0, 0), (1, 1), (2, 2), (3, 3)),
            ["F6"] = () => With(B(), 5, (0, 3), (1, 2), (2, 1)),
            ["F7"] = () => With(B(), 6, (0, 1), (1, 1), (2, 1), (1, 0), (1, 2)),
            ["F8"] = () => With(B(), 4, (0, 0), (1, 0)),
            ["F9"] = () => With(B(), 4, (0, 3), (1, 3), (3, 3)),
            ["F10"] = () => With(C(), 0, (0, 0), (1, 0), (2, 0)),
            ["F11"] = () => With(With(C(), 1, (0, 0), (1, 0), (2, 0)), 3, (0, 3), (1, 3), (2, 3), (3, 3)),
            ["F12"] = () => With(With(With(B(), 4, (0, 0), (1, 0), (2, 0)), 5, (1, 3), (2, 3), (3, 3)), 6, (3, 0), (3, 1), (3, 2)),
            ["F13"] = () => With(C(), 2, (0, 0), (1, 0), (2, 0)),
        };

        public static int[][] Get(string id) => All[id]();
    }
}
