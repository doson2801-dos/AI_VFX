using System;
using System.Collections.Generic;
using System.Linq;

// Slot Five pure logic, ported 1:1 from the Phaser reference (Docs/SlotFive/reference/slotFiveLogic.ts.txt):
// seeded RNG, grid generation (C1, C13), chains (C2), cast timing (C8, C11), battle (C3) and balance sim (C10, C14).
// No MonoBehaviour, no UnityEngine. The same seed and tuning give the same grids and results as the Phaser build.
namespace SlotFive
{
    public enum Side { Player, Foe }
    public enum BattleStatus { Playing, Won, Lost }
    public enum Dir { H, V, DR, UR }
    public enum Kind { Damage, Heal, Shield, None }

    public readonly struct Cell : IEquatable<Cell>
    {
        public readonly int X;
        public readonly int Y;
        public Cell(int x, int y) { X = x; Y = y; }
        public bool Equals(Cell o) => X == o.X && Y == o.Y;
        public override bool Equals(object obj) => obj is Cell c && Equals(c);
        public override int GetHashCode() => X * 31 + Y;
        public override string ToString() => $"({X},{Y})";
    }

    public static class SlotFiveConst
    {
        public const int Cols = 4;
        public const int Rows = 4;
        public const int IconCount = 8;
        public const int LuckyIcon = 7;
        /// <summary>Icons 0..3 are the elements; one per match fills the element slot (brief v5 4.1.1).</summary>
        public const int ElementCount = 4;
        public const uint StreamInit = 0;
        public const uint StreamSpin = 1;

        public static readonly string[] IconKeys = { "fire", "volt", "frost", "earth", "blade", "heal", "shield", "lucky" };
        public static readonly string[] IconNames = { "Lửa", "Sét", "Băng", "Đất", "Kiếm", "Hồi máu", "Khiên", "May mắn" };
        public static readonly Kind[] IconKinds =
            { Kind.Damage, Kind.Damage, Kind.Damage, Kind.Damage, Kind.Damage, Kind.Heal, Kind.Shield, Kind.None };
        /// <summary>Icons always on the grid besides the element: blade, heal, shield, lucky.</summary>
        public static readonly int[] CommonIcons = { 4, 5, 6, 7 };
    }

    // ------------------------------------------------------------------ RNG

    /// <summary>mulberry32 with a uint32 state; identical bit for bit to the JS version.</summary>
    public sealed class Rng
    {
        private uint _state;

        public Rng(uint seed) { _state = seed; }

        /// <summary>Uniform in [0, 1).</summary>
        public double Next()
        {
            unchecked
            {
                _state += 0x6D2B79F5u;
                uint t = _state;
                t = (t ^ (t >> 15)) * (t | 1u);
                t ^= t + (t ^ (t >> 7)) * (t | 61u);
                return (t ^ (t >> 14)) / 4294967296.0;
            }
        }

        /// <summary>floor(Next() * n).</summary>
        public int Int(int n) => (int)Math.Floor(Next() * n);

        /// <summary>Seed of stream k: (seed + imul(k + 1, 0x9E3779B9)) mod 2^32.</summary>
        public static uint StreamSeed(uint seed, uint stream) => unchecked(seed + (stream + 1u) * 0x9E3779B9u);
    }

    // ------------------------------------------------------------------ C1 / C13: grid

    /// <summary>Snapshot of the weights one match or sim uses.</summary>
    public sealed class GridConfig
    {
        /// <summary>Element of the match, 0..3 (sfElement).</summary>
        public readonly int Element;
        /// <summary>[element, 4, 5, 6, 7]: the only icons the RNG can draw, ascending.</summary>
        public readonly int[] ActiveIcons;
        /// <summary>Weight per icon index; 0 for every icon outside ActiveIcons.</summary>
        public readonly int[] Weights;
        public readonly int TotalWeight;

        public GridConfig(SlotFiveTuning t)
        {
            if (t.sfElement < 0 || t.sfElement >= SlotFiveConst.ElementCount)
                throw new ArgumentException($"Slot Five: sfElement must be in [0, {SlotFiveConst.ElementCount - 1}]");
            Element = t.sfElement;
            // The element sorts first because its index (0..3) is below the common icons (4..7).
            ActiveIcons = new[] { Element }.Concat(SlotFiveConst.CommonIcons).ToArray();
            Weights = new int[SlotFiveConst.IconCount];
            foreach (int icon in ActiveIcons) Weights[icon] = Math.Max(0, t.WeightOf(icon));
            TotalWeight = ActiveIcons.Sum(i => Weights[i]);
        }
    }

    public static class SlotFiveGrid
    {
        /// <summary>Draws one icon from ActiveIcons: r = int(total), first icon whose running sum exceeds r.</summary>
        private static int DrawIcon(Rng rng, GridConfig config)
        {
            int r = rng.Int(config.TotalWeight);
            int sum = 0;
            foreach (int icon in config.ActiveIcons)
            {
                sum += config.Weights[icon];
                if (sum > r) return icon;
            }
            throw new InvalidOperationException("Slot Five: icon draw fell through the weight table");
        }

        /// <summary>Draws all 16 cells column-first (x, then y). Always consumes exactly 16 numbers.</summary>
        public static int[][] Draw(Rng rng, GridConfig config)
        {
            if (config.TotalWeight <= 0) throw new InvalidOperationException("Slot Five: total icon weight must be positive");
            var grid = NewGrid();
            for (int x = 0; x < SlotFiveConst.Cols; x++)
                for (int y = 0; y < SlotFiveConst.Rows; y++)
                    grid[y][x] = DrawIcon(rng, config);
            return grid;
        }

        /// <summary>The grid shown when a match opens, drawn from the init stream. Not a spin.</summary>
        public static int[][] Initial(uint seed, GridConfig config) =>
            Draw(new Rng(Rng.StreamSeed(seed, SlotFiveConst.StreamInit)), config);

        public static int[][] NewGrid()
        {
            var g = new int[SlotFiveConst.Rows][];
            for (int y = 0; y < SlotFiveConst.Rows; y++) g[y] = new int[SlotFiveConst.Cols];
            return g;
        }

        public static int[][] Copy(int[][] grid) => grid.Select(row => (int[])row.Clone()).ToArray();

        /// <summary>Throws unless grid is 4 rows x 4 columns of icons in [0, 8). Returns a copy.</summary>
        public static int[][] Validate(int[][] grid)
        {
            bool ok = grid != null && grid.Length == SlotFiveConst.Rows && grid.All(row =>
                row != null && row.Length == SlotFiveConst.Cols && row.All(v => v >= 0 && v < SlotFiveConst.IconCount));
            if (!ok) throw new ArgumentException("Slot Five: grid must be 4 rows x 4 columns of icons 0..7");
            return Copy(grid);
        }

        public static bool SameGrid(int[][] a, int[][] b)
        {
            for (int y = 0; y < SlotFiveConst.Rows; y++)
                for (int x = 0; x < SlotFiveConst.Cols; x++)
                    if (a[y][x] != b[y][x]) return false;
            return true;
        }
    }

    public readonly struct GridSpin
    {
        public readonly int SpinIndex;
        public readonly int[][] Grid;
        public GridSpin(int spinIndex, int[][] grid) { SpinIndex = spinIndex; Grid = grid; }
    }

    /// <summary>
    /// Spin-stream grid source for one match. Both sides share it: spin n takes the n-th grid,
    /// so the grid depends only on seed, weights and n.
    /// </summary>
    public sealed class GridStream
    {
        private readonly Rng _rng;
        private readonly GridConfig _config;
        private readonly Queue<int[][]> _forced = new Queue<int[][]>();

        public GridStream(uint seed, GridConfig config)
        {
            _config = config;
            _rng = new Rng(Rng.StreamSeed(seed, SlotFiveConst.StreamSpin));
        }

        /// <summary>Spins taken so far, which is also the index of the next spin.</summary>
        public int SpinIndex { get; private set; }

        /// <summary>Queues a grid for the next spin. The spin still draws and discards its 16 numbers.</summary>
        public void ForceNext(int[][] grid) => _forced.Enqueue(SlotFiveGrid.Validate(grid));

        public GridSpin Next()
        {
            int index = SpinIndex;
            var drawn = SlotFiveGrid.Draw(_rng, _config);
            var grid = _forced.Count > 0 ? _forced.Dequeue() : drawn;
            SpinIndex++;
            return new GridSpin(index, grid);
        }
    }

    /// <summary>createSlotFiveSim: grid-only spin stream (tuning snapshotted at construction).</summary>
    public sealed class GridSim
    {
        private readonly GridStream _stream;
        public readonly GridConfig Config;
        public GridSim(uint seed, SlotFiveTuning tuning)
        {
            Config = new GridConfig(tuning);
            _stream = new GridStream(seed, Config);
        }
        public GridSpin Spin() => _stream.Next();
    }

    // ------------------------------------------------------------------ C2: chains and effects

    public sealed class Chain
    {
        public int Icon;
        public Dir Dir;
        public int Length;
        /// <summary>Listed along the line's step.</summary>
        public Cell[] Cells;
        public Kind Kind;
        public int Value;

        public Chain Clone() => new Chain { Icon = Icon, Dir = Dir, Length = Length, Cells = (Cell[])Cells.Clone(), Kind = Kind, Value = Value };
    }

    public struct Effects
    {
        public int Damage;
        public int Heal;
        public int Shield;

        public void Add(Kind kind, int value)
        {
            if (kind == Kind.Damage) Damage += value;
            else if (kind == Kind.Heal) Heal += value;
            else if (kind == Kind.Shield) Shield += value;
        }
    }

    public struct AnalyticEffects
    {
        public double Damage;
        public double Heal;
        public double Shield;
    }

    public sealed class Evaluation
    {
        public List<Chain> Chains;
        public Effects Effects;
    }

    /// <summary>Snapshot of the chain values one match or evaluation uses.</summary>
    public sealed class EffectConfig
    {
        /// <summary>Base value of a 3-chain per icon. Lucky has no effect, so 0.</summary>
        public readonly int[] Base;
        public readonly int Len4Mult;

        public EffectConfig(SlotFiveTuning t)
        {
            Base = new int[SlotFiveConst.IconCount];
            for (int i = 0; i < Base.Length; i++) Base[i] = SlotFiveConst.IconKinds[i] == Kind.None ? 0 : t.BaseOf(i);
            Len4Mult = t.sfLen4Mult;
        }

        /// <summary>mult(3) = 1, mult(4) = sfLen4Mult. A 4x4 grid has no longer chain.</summary>
        public int LengthMult(int length) => length >= 4 ? Len4Mult : 1;
    }

    public static class SlotFiveChains
    {
        private static readonly Dir[] DirOrder = { Dir.H, Dir.V, Dir.DR, Dir.UR };

        private static (int dx, int dy) Step(Dir d)
        {
            switch (d)
            {
                case Dir.H: return (1, 0);
                case Dir.V: return (0, 1);
                case Dir.DR: return (1, 1);
                default: return (1, -1);
            }
        }

        /// <summary>Every straight line of 3+ cells, grouped by direction. 14 lines on 4x4.</summary>
        public static readonly Dictionary<Dir, List<Cell[]>> Lines = BuildLines();

        private static bool Inside(int x, int y) => x >= 0 && x < SlotFiveConst.Cols && y >= 0 && y < SlotFiveConst.Rows;

        private static Dictionary<Dir, List<Cell[]>> BuildLines()
        {
            var output = new Dictionary<Dir, List<Cell[]>>();
            foreach (var dir in DirOrder)
            {
                var (dx, dy) = Step(dir);
                var list = new List<Cell[]>();
                for (int y = 0; y < SlotFiveConst.Rows; y++)
                    for (int x = 0; x < SlotFiveConst.Cols; x++)
                    {
                        // A line starts at a cell whose previous cell along the step is outside the grid.
                        if (Inside(x - dx, y - dy)) continue;
                        var cells = new List<Cell>();
                        for (int cx = x, cy = y; Inside(cx, cy); cx += dx, cy += dy) cells.Add(new Cell(cx, cy));
                        if (cells.Count >= 3) list.Add(cells.ToArray());
                    }
                output[dir] = list;
            }
            return output;
        }

        /// <summary>
        /// Every maximal run of 3+ equal icons on each line. Chains count on their own even when they share cells.
        /// Order: dir h, v, dr, ur; within a dir by the chain's first cell in scan order (y, then x).
        /// </summary>
        public static Evaluation Evaluate(int[][] grid, EffectConfig config)
        {
            var chains = new List<Chain>();
            var effects = new Effects();
            foreach (var dir in DirOrder)
            {
                var found = new List<Chain>();
                foreach (var line in Lines[dir])
                {
                    int start = 0;
                    while (start < line.Length)
                    {
                        int icon = grid[line[start].Y][line[start].X];
                        int end = start + 1;
                        while (end < line.Length && grid[line[end].Y][line[end].X] == icon) end++;
                        int length = end - start;
                        if (length >= 3)
                        {
                            var kind = SlotFiveConst.IconKinds[icon];
                            int value = kind == Kind.None ? 0 : config.Base[icon] * config.LengthMult(length);
                            found.Add(new Chain
                            {
                                Icon = icon, Dir = dir, Length = length, Kind = kind, Value = value,
                                Cells = line.Skip(start).Take(length).ToArray(),
                            });
                            effects.Add(kind, value);
                        }
                        start = end;
                    }
                }
                // Lines of one direction never share a cell, so no two chains tie on their first cell.
                found.Sort((a, b) => a.Cells[0].Y != b.Cells[0].Y ? a.Cells[0].Y - b.Cells[0].Y : a.Cells[0].X - b.Cells[0].X);
                chains.AddRange(found);
            }
            return new Evaluation { Chains = chains, Effects = effects };
        }

        /// <summary>Expected maximal runs of exactly k equal icons on a line of len cells, each the icon with prob p.</summary>
        private static double ExpectedRuns(int len, int k, double p)
        {
            double q = 1 - p, sum = 0;
            for (int start = 0; start + k <= len; start++)
            {
                double before = start > 0 ? q : 1;
                double after = start + k < len ? q : 1;
                sum += Math.Pow(p, k) * before * after;
            }
            return sum;
        }

        /// <summary>Exact expected effects per spin over the active icons (brief 4.6, 4.6.1).</summary>
        public static AnalyticEffects Analytic(GridConfig grid, EffectConfig effect)
        {
            if (grid.TotalWeight <= 0) throw new InvalidOperationException("Slot Five: total icon weight must be positive");
            var output = new AnalyticEffects();
            var lineLengths = DirOrder.SelectMany(d => Lines[d].Select(l => l.Length)).ToArray();
            foreach (int icon in grid.ActiveIcons)
            {
                var kind = SlotFiveConst.IconKinds[icon];
                if (kind == Kind.None) continue;
                double p = (double)grid.Weights[icon] / grid.TotalWeight;
                double expected = 0;
                foreach (int len in lineLengths)
                    for (int k = 3; k <= len; k++) expected += ExpectedRuns(len, k, p) * effect.LengthMult(k);
                double v = effect.Base[icon] * expected;
                if (kind == Kind.Damage) output.Damage += v;
                else if (kind == Kind.Heal) output.Heal += v;
                else output.Shield += v;
            }
            return output;
        }
    }

    // ------------------------------------------------------------------ C8 / C11: cast order and timing (display only)

    /// <summary>Every timing a turn uses, as plain numbers so a whole set can be scaled at once.</summary>
    public struct TurnTiming
    {
        public int ResolveMs, BlankResolveMs, CastDelayMs, CastStaggerMs, CastFlightMs, CastTailMs;
        public int SpinBaseMs, ReelStopGapMs, StopBounceMs, FoeDelayMs;

        public static TurnTiming From(SlotFiveTuning t) => new TurnTiming
        {
            ResolveMs = t.sfResolveMs,
            BlankResolveMs = t.sfBlankResolveMs,
            CastDelayMs = t.sfCastDelayMs,
            CastStaggerMs = t.sfCastStaggerMs,
            CastFlightMs = t.sfCastFlightMs,
            CastTailMs = t.sfCastTailMs,
            SpinBaseMs = t.sfSpinBaseMs,
            ReelStopGapMs = t.sfReelStopGapMs,
            StopBounceMs = t.sfStopBounceMs,
            FoeDelayMs = t.sfFoeDelayMs,
        };

        /// <summary>JS Math.round: halves round toward +infinity.</summary>
        public static int JsRound(double v) => (int)Math.Floor(v + 0.5);

        /// <summary>eff(k) = round(k * timeScale) for every key (brief 4.11). Scale 1 returns the same values.</summary>
        public TurnTiming Scaled(double timeScale)
        {
            int Eff(int k) => JsRound(k * timeScale);
            return new TurnTiming
            {
                ResolveMs = Eff(ResolveMs),
                BlankResolveMs = Eff(BlankResolveMs),
                CastDelayMs = Eff(CastDelayMs),
                CastStaggerMs = Eff(CastStaggerMs),
                CastFlightMs = Eff(CastFlightMs),
                CastTailMs = Eff(CastTailMs),
                SpinBaseMs = Eff(SpinBaseMs),
                ReelStopGapMs = Eff(ReelStopGapMs),
                StopBounceMs = Eff(StopBounceMs),
                FoeDelayMs = Eff(FoeDelayMs),
            };
        }

        /// <summary>lastSpinMs: the first column stops at SpinBaseMs, then one gap per further column (brief 4.7).</summary>
        public int SpinMs => SpinBaseMs + (SlotFiveConst.Cols - 1) * ReelStopGapMs;
    }

    public static class SlotFiveCast
    {
        private static readonly Kind[] CastKindOrder = { Kind.Heal, Kind.Shield, Kind.Damage };

        /// <summary>
        /// Indexes into chains of the chains that fire, in firing order: heal, shield, damage, keeping chain order
        /// within a kind (brief 4.10). Lucky chains never fire.
        /// </summary>
        public static List<int> Order(IReadOnlyList<Chain> chains)
        {
            var order = new List<int>();
            foreach (var kind in CastKindOrder)
                for (int i = 0; i < chains.Count; i++)
                    if (chains[i].Kind == kind) order.Add(i);
            return order;
        }

        /// <summary>Length of resolving for a turn with these chains (brief 4.10).</summary>
        public static int ResolveMs(IReadOnlyList<Chain> chains, in TurnTiming t)
        {
            if (chains.Count == 0) return t.BlankResolveMs;
            int n = Order(chains).Count;
            if (n == 0) return t.ResolveMs;
            return Math.Max(t.ResolveMs, t.CastDelayMs + (n - 1) * t.CastStaggerMs + t.CastFlightMs + t.CastTailMs);
        }
    }

    // ------------------------------------------------------------------ C3: alternating battle, hp and shield

    public sealed class Fighter
    {
        public int Hp;
        public int MaxHp;
        public int Shield;
        public Fighter Clone() => new Fighter { Hp = Hp, MaxHp = MaxHp, Shield = Shield };
    }

    /// <summary>Optional overrides of one fighter's starting values.</summary>
    public sealed class FighterSetup
    {
        public int? Hp;
        public int? MaxHp;
        public int? Shield;
    }

    public sealed class BattleSetup
    {
        public FighterSetup Player;
        public FighterSetup Foe;
        /// <summary>Defaults to Player.</summary>
        public Side? Turn;
        /// <summary>Grids forced on the first spins, in order. Each forced spin still draws 16 RNG numbers.</summary>
        public List<int[][]> Grids;
    }

    public sealed class BattleState
    {
        public BattleStatus Status;
        public Side Turn;
        public int SpinIndex;
        public Fighter Player;
        public Fighter Foe;
    }

    public sealed class BattleSpin
    {
        public bool Accepted;
        public Side Side;
        public int[][] Grid;
        public List<Chain> Chains;
        public Effects Effects;
        public int Absorbed;
        public int HpLoss;
        public int Healed;
    }

    /// <summary>
    /// One match. Both sides share the spin stream: spin n takes grid n whoever spins.
    /// Tuning (weights, values, max hp) is snapshotted when the battle is created.
    /// </summary>
    public sealed class Battle
    {
        public readonly uint Seed;
        public readonly int Element;
        public readonly int[] ActiveIcons;

        private readonly GridStream _stream;
        private readonly EffectConfig _effectConfig;
        private readonly Fighter _player;
        private readonly Fighter _foe;
        private BattleStatus _status = BattleStatus.Playing;
        private Side _turn;
        private int[][] _grid;

        public Battle(uint seed, SlotFiveTuning tuning, BattleSetup setup = null)
        {
            setup = setup ?? new BattleSetup();
            Seed = seed;
            var gridConfig = new GridConfig(tuning);
            Element = gridConfig.Element;
            ActiveIcons = (int[])gridConfig.ActiveIcons.Clone();
            _effectConfig = new EffectConfig(tuning);
            _stream = new GridStream(seed, gridConfig);
            _grid = SlotFiveGrid.Initial(seed, gridConfig);
            _player = MakeFighter(tuning.sfPlayerMaxHp, setup.Player, "player");
            _foe = MakeFighter(tuning.sfFoeMaxHp, setup.Foe, "foe");
            _turn = setup.Turn ?? Side.Player;
            if (setup.Grids != null) foreach (var g in setup.Grids) _stream.ForceNext(g);
        }

        private static Fighter MakeFighter(int defaultMaxHp, FighterSetup over, string label)
        {
            int maxHp = over?.MaxHp ?? defaultMaxHp;
            var f = new Fighter { MaxHp = maxHp, Hp = over?.Hp ?? maxHp, Shield = over?.Shield ?? 0 };
            if (f.MaxHp < 1) throw new ArgumentException($"Slot Five: {label}.maxHp must be a positive integer");
            if (f.Hp < 1 || f.Hp > f.MaxHp) throw new ArgumentException($"Slot Five: {label}.hp must be in [1, maxHp]");
            if (f.Shield < 0) throw new ArgumentException($"Slot Five: {label}.shield must be non-negative");
            return f;
        }

        public static Side Other(Side s) => s == Side.Player ? Side.Foe : Side.Player;

        public BattleState GetState() => new BattleState
        {
            Status = _status, Turn = _turn, SpinIndex = _stream.SpinIndex,
            Player = _player.Clone(), Foe = _foe.Clone(),
        };

        /// <summary>Copy of the last spin's grid, or the opening grid.</summary>
        public int[][] GetGrid() => SlotFiveGrid.Copy(_grid);

        /// <summary>Queues a grid for the next spin, after any grids still queued.</summary>
        public void ForceNextGrid(int[][] grid) => _stream.ForceNext(grid);

        /// <summary>Spins for the side whose turn it is, following brief 4.5 step by step.</summary>
        public BattleSpin Spin()
        {
            var side = _turn;
            // 1. A finished match rejects without touching the RNG.
            if (_status != BattleStatus.Playing)
                return new BattleSpin { Accepted = false, Side = side, Grid = GetGrid(), Chains = new List<Chain>() };

            var a = side == Side.Player ? _player : _foe;
            var b = side == Side.Player ? _foe : _player;
            // 2. The spinner's old shield has already covered the other side's last attack.
            a.Shield = 0;
            // 3. Draw and evaluate. The stream advances SpinIndex.
            _grid = _stream.Next().Grid;
            var ev = SlotFiveChains.Evaluate(_grid, _effectConfig);
            var fx = ev.Effects;
            // 4. Heal, capped at maxHp.
            int healed = Math.Min(a.MaxHp - a.Hp, fx.Heal);
            a.Hp += healed;
            // 5. New shield replaces, never stacks.
            a.Shield = fx.Shield;
            // 6. Damage hits the other side's shield first.
            int absorbed = Math.Min(b.Shield, fx.Damage);
            b.Shield -= absorbed;
            int hpLoss = Math.Min(b.Hp, fx.Damage - absorbed);
            b.Hp -= hpLoss;
            // 7. End of turn.
            if (b.Hp == 0) _status = side == Side.Player ? BattleStatus.Won : BattleStatus.Lost;
            else _turn = Other(side);

            return new BattleSpin
            {
                Accepted = true, Side = side, Grid = GetGrid(), Chains = ev.Chains.Select(c => c.Clone()).ToList(),
                Effects = fx, Absorbed = absorbed, HpLoss = hpLoss, Healed = healed,
            };
        }
    }

    // ------------------------------------------------------------------ C10 / C14: balance simulation

    public sealed class MatchReport
    {
        public int Matches;
        public double PlayerWinRate;
        public int TurnsMedian, TurnsP10, TurnsP90, TurnsMax;
        public double ComebackRate;
        public double ComebackRatePlayer, ComebackRateFoe;
        public double BlankTurnRate;
        public double AttackTurnRate;
        public double[] ChainTurnRateByIcon;
        public double MeanDamage, MeanDamageStdErr, MeanHeal, MeanShield, MeanAbsorbed;
        public long EstMatchMsMedian, EstMatchMsP90, EstMatchMsMedianFast, EstMatchMsP90Fast;
        public double MeanTurnMs;
        public int Unfinished;

        public override string ToString() =>
            $"matches {Matches}, win {PlayerWinRate:F4}, turns med/p10/p90/max {TurnsMedian}/{TurnsP10}/{TurnsP90}/{TurnsMax}, " +
            $"comeback {ComebackRate:F4} (p {ComebackRatePlayer:F4}, f {ComebackRateFoe:F4}), blank {BlankTurnRate:F4}, " +
            $"attack {AttackTurnRate:F4}, chainByIcon [{string.Join(", ", ChainTurnRateByIcon.Select(v => v.ToString("F4")))}], " +
            $"dmg {MeanDamage:F3}±{MeanDamageStdErr:F3}, heal {MeanHeal:F3}, shield {MeanShield:F3}, absorbed {MeanAbsorbed:F3}, " +
            $"estMs med/p90 {EstMatchMsMedian}/{EstMatchMsP90}, fast {EstMatchMsMedianFast}/{EstMatchMsP90Fast}, " +
            $"turnMs {MeanTurnMs:F1}, unfinished {Unfinished}";
    }

    public static class SlotFiveSim
    {
        /// <summary>Nearest-rank percentile of an ascending list: element ceil(k/100 * n) - 1.</summary>
        public static T Percentile<T>(List<T> sorted, int k)
        {
            if (sorted.Count == 0) return default;
            int rank = Math.Max(1, (int)Math.Ceiling(k / 100.0 * sorted.Count));
            return sorted[rank - 1];
        }

        private static long TurnMs(in TurnTiming t, List<Chain> chains, Side side) =>
            t.SpinMs + SlotFiveCast.ResolveMs(chains, t) + (side == Side.Foe ? t.FoeDelayMs : SlotFiveSimRules.PlayerPressMs);

        /// <summary>
        /// Plays one battle per seed to the end (or the turn cap). Turn means one spin of either side.
        /// Effects means are raw per-turn evaluate output.
        /// </summary>
        public static MatchReport Simulate(IEnumerable<uint> seeds, SlotFiveTuning tuning, BattleSetup setup = null)
        {
            var normal = TurnTiming.From(tuning);
            var fast = normal.Scaled(tuning.sfFastFactor);
            var turnsList = new List<int>();
            var estList = new List<long>();
            var estFastList = new List<long>();
            int playerWins = 0, foeWins = 0, comebacks = 0, cbPlayer = 0, cbFoe = 0, unfinished = 0;
            long totalTurns = 0, blankTurns = 0, attackTurns = 0, totalEstMs = 0;
            var chainTurnsByIcon = new long[SlotFiveConst.IconCount];
            double sumDamage = 0, sumDamageSq = 0, sumHeal = 0, sumShield = 0, sumAbsorbed = 0;
            var iconSeen = new bool[SlotFiveConst.IconCount];
            var history = new List<(int spin, int ph, int pm, int fh, int fm)>();
            int matches = 0;

            foreach (uint seed in seeds)
            {
                matches++;
                var battle = new Battle(seed, tuning, setup);
                history.Clear();
                int turns = 0;
                long estMs = 0, estMsFast = 0;
                while (battle.GetState().Status == BattleStatus.Playing && turns < SlotFiveSimRules.MaxTurns)
                {
                    var r = battle.Spin();
                    turns++;
                    var fx = r.Effects;
                    if (r.Chains.Count == 0) blankTurns++;
                    if (fx.Damage > 0) attackTurns++;
                    Array.Clear(iconSeen, 0, iconSeen.Length);
                    foreach (var c in r.Chains) iconSeen[c.Icon] = true;
                    for (int i = 0; i < iconSeen.Length; i++) if (iconSeen[i]) chainTurnsByIcon[i]++;
                    sumDamage += fx.Damage;
                    sumDamageSq += (double)fx.Damage * fx.Damage;
                    sumHeal += fx.Heal;
                    sumShield += fx.Shield;
                    sumAbsorbed += r.Absorbed;
                    estMs += TurnMs(normal, r.Chains, r.Side);
                    estMsFast += TurnMs(fast, r.Chains, r.Side);
                    var s = battle.GetState();
                    history.Add((s.SpinIndex, s.Player.Hp, s.Player.MaxHp, s.Foe.Hp, s.Foe.MaxHp));
                }
                totalTurns += turns;
                turnsList.Add(turns);
                estList.Add(estMs);
                estFastList.Add(estMsFast);
                totalEstMs += estMs;

                var status = battle.GetState().Status;
                if (status == BattleStatus.Playing) { unfinished++; continue; }
                bool playerWon = status == BattleStatus.Won;
                if (playerWon) playerWins++; else foeWins++;

                // Comeback: after some turn with spinIndex >= 2, the winner W trailed the loser L by at least
                // COMEBACK_GAP points of hp ratio, compared in integers by cross-multiplying.
                long gap = SlotFiveSimRules.ComebackGapPct;
                bool trailed = history.Any(h =>
                {
                    if (h.spin < 2) return false;
                    long wh, wm, lh, lm;
                    if (playerWon) { wh = h.ph; wm = h.pm; lh = h.fh; lm = h.fm; }
                    else { wh = h.fh; wm = h.fm; lh = h.ph; lm = h.pm; }
                    return 100 * (lh * wm - wh * lm) >= gap * wm * lm;
                });
                if (trailed)
                {
                    comebacks++;
                    if (playerWon) cbPlayer++; else cbFoe++;
                }
            }

            turnsList.Sort();
            estList.Sort();
            estFastList.Sort();
            double meanDamage = totalTurns > 0 ? sumDamage / totalTurns : 0;
            double variance = totalTurns > 1
                ? Math.Max(0, (sumDamageSq - totalTurns * meanDamage * meanDamage) / (totalTurns - 1))
                : 0;
            double PerTurn(double v) => totalTurns > 0 ? v / totalTurns : 0;

            return new MatchReport
            {
                Matches = matches,
                PlayerWinRate = matches > 0 ? (double)playerWins / matches : 0,
                TurnsMedian = Percentile(turnsList, 50),
                TurnsP10 = Percentile(turnsList, 10),
                TurnsP90 = Percentile(turnsList, 90),
                TurnsMax = turnsList.Count > 0 ? turnsList[turnsList.Count - 1] : 0,
                ComebackRate = matches > 0 ? (double)comebacks / matches : 0,
                ComebackRatePlayer = playerWins > 0 ? (double)cbPlayer / playerWins : 0,
                ComebackRateFoe = foeWins > 0 ? (double)cbFoe / foeWins : 0,
                BlankTurnRate = PerTurn(blankTurns),
                AttackTurnRate = PerTurn(attackTurns),
                ChainTurnRateByIcon = chainTurnsByIcon.Select(n => PerTurn(n)).ToArray(),
                MeanDamage = meanDamage,
                MeanDamageStdErr = totalTurns > 0 ? Math.Sqrt(variance / totalTurns) : 0,
                MeanHeal = PerTurn(sumHeal),
                MeanShield = PerTurn(sumShield),
                MeanAbsorbed = PerTurn(sumAbsorbed),
                EstMatchMsMedian = Percentile(estList, 50),
                EstMatchMsP90 = Percentile(estList, 90),
                EstMatchMsMedianFast = Percentile(estFastList, 50),
                EstMatchMsP90Fast = Percentile(estFastList, 90),
                MeanTurnMs = PerTurn(totalEstMs),
                Unfinished = unfinished,
            };
        }

        public static IEnumerable<uint> SeedRange(uint from, uint toInclusive)
        {
            for (uint s = from; s <= toInclusive; s++) yield return s;
        }
    }
}
