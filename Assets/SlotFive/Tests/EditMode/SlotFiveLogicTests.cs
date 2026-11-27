using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using NUnit.Framework;
using static SlotFive.Tests.SlotFiveFixtures;

namespace SlotFive.Tests
{
    /// <summary>EditMode port of the Phaser Playwright logic tests: brief section 8, C1, C2, C3, C8, C11, C13.</summary>
    public class SlotFiveLogicTests
    {
        // ------------------------------------------------------------ RNG parity

        [Test]
        public void Rng_MatchesMulberry32Golden()
        {
            // Values from an independent Python port of the JS createRng / streamSeed.
            var r = new Rng(777);
            Assert.That(r.Next(), Is.EqualTo(0.686378717888).Within(1e-12));
            Assert.That(r.Next(), Is.EqualTo(0.034451418323).Within(1e-12));
            Assert.That(r.Next(), Is.EqualTo(0.192387329647).Within(1e-12));
            Assert.AreEqual(2654436546u, Rng.StreamSeed(777, 0));
            Assert.AreEqual(1013905019u, Rng.StreamSeed(777, 1));
        }

        [Test]
        public void Grid_MatchesGoldenForSeed777()
        {
            var cfg = new GridConfig(Brief());
            AssertGrid(new[] { new[] { 1, 4, 6, 4 }, new[] { 4, 4, 4, 4 }, new[] { 4, 1, 6, 1 }, new[] { 4, 6, 4, 5 } },
                SlotFiveGrid.Initial(777, cfg));
            var sim = new GridSim(777, Brief());
            AssertGrid(new[] { new[] { 7, 6, 4, 4 }, new[] { 4, 7, 4, 4 }, new[] { 4, 7, 6, 1 }, new[] { 4, 5, 1, 6 } }, sim.Spin().Grid);
            AssertGrid(new[] { new[] { 4, 7, 1, 1 }, new[] { 6, 4, 1, 6 }, new[] { 5, 1, 5, 4 }, new[] { 1, 5, 4, 6 } }, sim.Spin().Grid);
            AssertGrid(new[] { new[] { 4, 4, 1, 4 }, new[] { 5, 7, 1, 7 }, new[] { 7, 6, 7, 1 }, new[] { 4, 5, 1, 1 } }, sim.Spin().Grid);
        }

        // ------------------------------------------------------------ C1: seeded grid core

        [Test]
        public void C1_3_SameSeedSameGrids()
        {
            for (uint seed = 1; seed <= 50; seed++)
            {
                var a = new GridSim(seed, Brief());
                var b = new GridSim(seed, Brief());
                for (int i = 0; i < 1000; i++)
                    Assert.IsTrue(SlotFiveGrid.SameGrid(a.Spin().Grid, b.Spin().Grid), $"seed {seed} spin {i}");
            }
        }

        [Test]
        public void C1_5_DifferentSeedsDiffer()
        {
            var a = new GridSim(1, Brief());
            var b = new GridSim(2, Brief());
            int diff = 0;
            for (int i = 0; i < 1000; i++) if (!SlotFiveGrid.SameGrid(a.Spin().Grid, b.Spin().Grid)) diff++;
            Assert.GreaterOrEqual(diff, 990);
        }

        [Test]
        public void C1_6_IconFrequenciesMatchWeights()
        {
            var t = Brief();
            var cfg = new GridConfig(t);
            var counts = new long[SlotFiveConst.IconCount];
            long cells = 0;
            for (uint seed = 9001; seed <= 9010; seed++)
            {
                var sim = new GridSim(seed, t);
                for (int i = 0; i < 10000; i++)
                    foreach (var row in sim.Spin().Grid)
                        foreach (int v in row) { counts[v]++; cells++; }
            }
            for (int icon = 0; icon < SlotFiveConst.IconCount; icon++)
            {
                double rate = (double)counts[icon] / cells;
                if (cfg.ActiveIcons.Contains(icon))
                    Assert.That(rate, Is.EqualTo((double)cfg.Weights[icon] / cfg.TotalWeight).Within(0.003), $"icon {icon}");
                else
                    Assert.AreEqual(0, counts[icon], $"inactive icon {icon}");
            }
        }

        [Test]
        public void C1_7_ZeroWeightNeverDrawn()
        {
            var t = Brief();
            t.sfWShield = 0;
            var sim = new GridSim(1, t);
            for (int i = 0; i < 10000; i++)
                Assert.IsFalse(sim.Spin().Grid.Any(row => row.Contains(6)));
        }

        [Test]
        public void C1_8_ForcedGridKeepsStreamAligned()
        {
            var battle = new Battle(5, Brief());
            battle.ForceNextGrid(Get("F1"));
            var first = battle.Spin();
            AssertGrid(Get("F1"), first.Grid);
            var sim = new GridSim(5, Brief());
            sim.Spin();
            AssertGrid(sim.Spin().Grid, battle.Spin().Grid);
        }

        [Test]
        public void ValidateRejectsBadGrids()
        {
            Assert.Throws<ArgumentException>(() => SlotFiveGrid.Validate(new int[3][]));
            var g = B();
            g[0][0] = 8;
            Assert.Throws<ArgumentException>(() => SlotFiveGrid.Validate(g));
        }

        // ------------------------------------------------------------ C2: chains and effects

        private static Evaluation Eval(string id) => SlotFiveChains.Evaluate(Get(id), new EffectConfig(Brief()));

        private static void AssertChain(Chain c, int icon, Dir dir, int length, Kind kind, int value)
        {
            Assert.AreEqual(icon, c.Icon, "icon");
            Assert.AreEqual(dir, c.Dir, "dir");
            Assert.AreEqual(length, c.Length, "length");
            Assert.AreEqual(length, c.Cells.Length, "cells");
            Assert.AreEqual(kind, c.Kind, "kind");
            Assert.AreEqual(value, c.Value, "value");
        }

        private static void AssertEffects(Evaluation e, int damage, int heal, int shield)
        {
            Assert.AreEqual(damage, e.Effects.Damage, "damage");
            Assert.AreEqual(heal, e.Effects.Heal, "heal");
            Assert.AreEqual(shield, e.Effects.Shield, "shield");
        }

        [Test]
        public void C2_1_Fixtures()
        {
            var t = Brief();
            int m = t.sfLen4Mult;

            var e = Eval("F0");
            Assert.AreEqual(0, e.Chains.Count);
            AssertEffects(e, 0, 0, 0);

            e = Eval("F1");
            Assert.AreEqual(1, e.Chains.Count);
            AssertChain(e.Chains[0], 4, Dir.H, 3, Kind.Damage, t.sfBBlade);
            AssertEffects(e, t.sfBBlade, 0, 0);

            e = Eval("F2");
            Assert.AreEqual(1, e.Chains.Count);
            AssertChain(e.Chains[0], 5, Dir.H, 4, Kind.Heal, t.sfBHeal * m);
            AssertEffects(e, 0, t.sfBHeal * m, 0);

            e = Eval("F3");
            Assert.AreEqual(1, e.Chains.Count);
            AssertChain(e.Chains[0], 6, Dir.H, 3, Kind.Shield, t.sfBShield);
            AssertEffects(e, 0, 0, t.sfBShield);

            e = Eval("F4");
            Assert.AreEqual(1, e.Chains.Count);
            AssertChain(e.Chains[0], 7, Dir.V, 4, Kind.None, 0);
            AssertEffects(e, 0, 0, 0);

            e = Eval("F5");
            Assert.AreEqual(1, e.Chains.Count);
            AssertChain(e.Chains[0], 4, Dir.DR, 4, Kind.Damage, t.sfBBlade * m);

            e = Eval("F6");
            Assert.AreEqual(1, e.Chains.Count);
            AssertChain(e.Chains[0], 5, Dir.UR, 3, Kind.Heal, t.sfBHeal);
            CollectionAssert.AreEqual(new[] { new Cell(0, 3), new Cell(1, 2), new Cell(2, 1) }, e.Chains[0].Cells);

            e = Eval("F7");
            Assert.AreEqual(2, e.Chains.Count);
            AssertChain(e.Chains[0], 6, Dir.H, 3, Kind.Shield, t.sfBShield);
            AssertChain(e.Chains[1], 6, Dir.V, 3, Kind.Shield, t.sfBShield);
            Assert.Contains(new Cell(1, 1), e.Chains[0].Cells);
            Assert.Contains(new Cell(1, 1), e.Chains[1].Cells);
            Assert.AreEqual(5, e.Chains.SelectMany(c => c.Cells).Distinct().Count());
            AssertEffects(e, 0, 0, 2 * t.sfBShield);

            Assert.AreEqual(0, Eval("F8").Chains.Count);
            Assert.AreEqual(0, Eval("F9").Chains.Count);

            e = Eval("F10");
            Assert.AreEqual(1, e.Chains.Count);
            AssertChain(e.Chains[0], 0, Dir.H, 3, Kind.Damage, t.sfBFire);

            e = Eval("F11");
            Assert.AreEqual(2, e.Chains.Count);
            AssertChain(e.Chains[0], 1, Dir.H, 3, Kind.Damage, t.sfBVolt);
            AssertChain(e.Chains[1], 3, Dir.H, 4, Kind.Damage, t.sfBEarth * m);
            AssertEffects(e, t.sfBVolt + t.sfBEarth * m, 0, 0);

            e = Eval("F12");
            Assert.AreEqual(3, e.Chains.Count);
            AssertEffects(e, t.sfBBlade, t.sfBHeal, t.sfBShield);

            e = Eval("F13");
            Assert.AreEqual(1, e.Chains.Count);
            AssertChain(e.Chains[0], 2, Dir.H, 3, Kind.Damage, t.sfBFrost);
        }

        [Test]
        public void C2_1_FixtureNumbersMatchBrief()
        {
            // The numbers in brackets in the brief's fixture table.
            Assert.AreEqual(5, Eval("F1").Effects.Damage);
            Assert.AreEqual(40, Eval("F2").Effects.Heal);
            Assert.AreEqual(20, Eval("F3").Effects.Shield);
            Assert.AreEqual(10, Eval("F5").Effects.Damage);
            Assert.AreEqual(20, Eval("F6").Effects.Heal);
            Assert.AreEqual(40, Eval("F7").Effects.Shield);
            Assert.AreEqual(10, Eval("F10").Effects.Damage);
            Assert.AreEqual(35, Eval("F11").Effects.Damage);
            Assert.AreEqual(15, Eval("F13").Effects.Damage);
        }

        [Test]
        public void C2_2_AllBladeGrid()
        {
            var g = SlotFiveGrid.NewGrid();
            foreach (var row in g) for (int x = 0; x < 4; x++) row[x] = 4;
            var t = Brief();
            var e = SlotFiveChains.Evaluate(g, new EffectConfig(t));
            Assert.AreEqual(14, e.Chains.Count);
            var dirs = e.Chains.Select(c => c.Dir).ToArray();
            CollectionAssert.AreEqual(
                Enumerable.Repeat(Dir.H, 4).Concat(Enumerable.Repeat(Dir.V, 4)).Concat(Enumerable.Repeat(Dir.DR, 3)).Concat(Enumerable.Repeat(Dir.UR, 3)),
                dirs);
            Assert.IsTrue(e.Chains.Take(8).All(c => c.Length == 4));
            CollectionAssert.AreEqual(new[] { 4, 3, 3 }, e.Chains.Skip(8).Take(3).Select(c => c.Length));
            CollectionAssert.AreEqual(new[] { new Cell(0, 0), new Cell(1, 0), new Cell(0, 1) }, e.Chains.Skip(8).Take(3).Select(c => c.Cells[0]));
            CollectionAssert.AreEqual(new[] { 3, 4, 3 }, e.Chains.Skip(11).Select(c => c.Length));
            CollectionAssert.AreEqual(new[] { new Cell(0, 2), new Cell(0, 3), new Cell(1, 3) }, e.Chains.Skip(11).Select(c => c.Cells[0]));
            Assert.AreEqual(t.sfBBlade * (10 * t.sfLen4Mult + 4), e.Effects.Damage);
            Assert.AreEqual(120, e.Effects.Damage);
        }

        /// <summary>Brute-force reference: every cell segment of 3+ equal icons that cannot be extended either way.</summary>
        private static List<(int icon, Dir dir, Cell first, int length)> BruteChains(int[][] g)
        {
            var output = new List<(int, Dir, Cell, int)>();
            var steps = new[] { (Dir.H, 1, 0), (Dir.V, 0, 1), (Dir.DR, 1, 1), (Dir.UR, 1, -1) };
            bool In(int x, int y) => x >= 0 && x < 4 && y >= 0 && y < 4;
            foreach (var (dir, dx, dy) in steps)
                for (int y = 0; y < 4; y++)
                    for (int x = 0; x < 4; x++)
                    {
                        int icon = g[y][x];
                        if (In(x - dx, y - dy) && g[y - dy][x - dx] == icon) continue;
                        int len = 0;
                        for (int cx = x, cy = y; In(cx, cy) && g[cy][cx] == icon; cx += dx, cy += dy) len++;
                        if (len >= 3) output.Add((icon, dir, new Cell(x, y), len));
                    }
            return output;
        }

        [Test]
        public void C2_3_C2_4_MatchesBruteForce()
        {
            var t = Brief();
            var ec = new EffectConfig(t);
            var sim = new GridSim(1, t);
            for (int i = 0; i < 10000; i++)
            {
                var g = sim.Spin().Grid;
                var e = SlotFiveChains.Evaluate(g, ec);
                var brute = BruteChains(g);
                var got = e.Chains.Select(c => (c.Icon, c.Dir, c.Cells[0], c.Length)).ToList();
                CollectionAssert.AreEquivalent(brute, got, $"spin {i}");
                var sum = new Effects();
                foreach (var c in e.Chains)
                {
                    Assert.That(c.Length, Is.EqualTo(3).Or.EqualTo(4));
                    Assert.GreaterOrEqual(c.Value, 0);
                    if (c.Icon == SlotFiveConst.LuckyIcon) { Assert.AreEqual(Kind.None, c.Kind); Assert.AreEqual(0, c.Value); }
                    sum.Add(c.Kind, c.Value);
                }
                Assert.AreEqual(sum.Damage, e.Effects.Damage);
                Assert.AreEqual(sum.Heal, e.Effects.Heal);
                Assert.AreEqual(sum.Shield, e.Effects.Shield);
            }
        }

        [Test]
        public void C2_5_AnalyticEffectsV5()
        {
            var t = Brief();
            var a = SlotFiveChains.Analytic(new GridConfig(t), new EffectConfig(t));
            Assert.That(a.Damage, Is.InRange(9.38, 9.48));
            Assert.That(a.Heal, Is.InRange(1.57, 1.67));
            Assert.That(a.Shield, Is.InRange(1.57, 1.67));
        }

        // ------------------------------------------------------------ C3: battle

        private static Battle Fight(BattleSetup setup = null) => new Battle(42, Brief(), setup);

        [Test]
        public void C3_1_StartState()
        {
            var s = Fight().GetState();
            Assert.AreEqual(BattleStatus.Playing, s.Status);
            Assert.AreEqual(Side.Player, s.Turn);
            Assert.AreEqual(s.Player.MaxHp, s.Player.Hp);
            Assert.AreEqual(s.Foe.MaxHp, s.Foe.Hp);
            Assert.AreEqual(0, s.Player.Shield);
            Assert.AreEqual(0, s.Foe.Shield);
        }

        [Test]
        public void C3_2_AlternatingSidesShareStream()
        {
            var b = Fight();
            var sim = new GridSim(42, Brief());
            for (int n = 0; n < 40 && b.GetState().Status == BattleStatus.Playing; n++)
            {
                var r = b.Spin();
                Assert.AreEqual(n % 2 == 0 ? Side.Player : Side.Foe, r.Side);
                AssertGrid(sim.Spin().Grid, r.Grid);
            }
        }

        [Test]
        public void C3_3_ShieldAbsorbsPart()
        {
            var b = Fight(new BattleSetup { Foe = new FighterSetup { Shield = 3 } });
            b.ForceNextGrid(Get("F1"));
            var r = b.Spin();
            Assert.AreEqual(3, r.Absorbed);
            Assert.AreEqual(2, r.HpLoss);
            Assert.AreEqual(0, b.GetState().Foe.Shield);
        }

        [Test]
        public void C3_4_ShieldAbsorbsAllThenResets()
        {
            var b = Fight(new BattleSetup { Foe = new FighterSetup { Shield = 50 }, Grids = new List<int[][]> { Get("F1"), Get("F0") } });
            int hp = b.GetState().Foe.Hp;
            b.Spin();
            Assert.AreEqual(hp, b.GetState().Foe.Hp);
            Assert.AreEqual(45, b.GetState().Foe.Shield);
            b.Spin();
            Assert.AreEqual(0, b.GetState().Foe.Shield);
        }

        [Test]
        public void C3_5_HealCapsAndShieldReplaces()
        {
            var t = Brief();
            var b = Fight(new BattleSetup
            {
                Player = new FighterSetup { Hp = t.sfPlayerMaxHp - 10, Shield = 25 },
                Grids = new List<int[][]> { Get("F12") },
            });
            int foeHp = b.GetState().Foe.Hp;
            var r = b.Spin();
            var s = b.GetState();
            Assert.AreEqual(t.sfPlayerMaxHp, s.Player.Hp);
            Assert.AreEqual(10, r.Healed);
            Assert.AreEqual(20, s.Player.Shield);
            Assert.AreEqual(foeHp - 5, s.Foe.Hp);
        }

        [Test]
        public void C3_6_ShieldBlocksNextAttack()
        {
            var b = Fight(new BattleSetup { Grids = new List<int[][]> { Get("F3"), Get("F5") } });
            int hp = b.GetState().Player.Hp;
            b.Spin();
            var r = b.Spin();
            Assert.AreEqual(10, r.Absorbed);
            Assert.AreEqual(hp, b.GetState().Player.Hp);
            Assert.AreEqual(10, b.GetState().Player.Shield);
        }

        [Test]
        public void C3_7_WinAndRejectWithoutRng()
        {
            var b = Fight(new BattleSetup { Foe = new FighterSetup { Hp = 5 }, Grids = new List<int[][]> { Get("F1") } });
            b.Spin();
            var s = b.GetState();
            Assert.AreEqual(BattleStatus.Won, s.Status);
            Assert.AreEqual(0, s.Foe.Hp);
            var r = b.Spin();
            Assert.IsFalse(r.Accepted);
            Assert.AreEqual(s.SpinIndex, b.GetState().SpinIndex);
        }

        [Test]
        public void C3_8_WinningTurnStillHealsAndShields()
        {
            var b = Fight(new BattleSetup
            {
                Foe = new FighterSetup { Hp = 3 }, Player = new FighterSetup { Hp = 100 },
                Grids = new List<int[][]> { Get("F12") },
            });
            b.Spin();
            var s = b.GetState();
            Assert.AreEqual(BattleStatus.Won, s.Status);
            Assert.AreEqual(120, s.Player.Hp);
            Assert.AreEqual(20, s.Player.Shield);
        }

        [Test]
        public void C3_9_FoeWins()
        {
            var b = Fight(new BattleSetup
            {
                Player = new FighterSetup { Hp = 4, Shield = 0 }, Turn = Side.Foe,
                Grids = new List<int[][]> { Get("F1") },
            });
            b.Spin();
            var s = b.GetState();
            Assert.AreEqual(BattleStatus.Lost, s.Status);
            Assert.AreEqual(0, s.Player.Hp);
        }

        [Test]
        public void C3_10_SimMatchesEndAndKeepInvariants()
        {
            var t = Brief();
            for (uint seed = 1; seed <= 2000; seed++)
            {
                var b = new Battle(seed, t);
                int turns = 0;
                while (b.GetState().Status == BattleStatus.Playing && turns < SlotFiveSimRules.MaxTurns)
                {
                    b.Spin();
                    turns++;
                    var s = b.GetState();
                    foreach (var f in new[] { s.Player, s.Foe })
                    {
                        Assert.That(f.Hp, Is.InRange(0, f.MaxHp));
                        Assert.GreaterOrEqual(f.Shield, 0);
                    }
                }
                var end = b.GetState();
                Assert.AreNotEqual(BattleStatus.Playing, end.Status, $"seed {seed} unfinished");
                Assert.AreEqual(1, (end.Player.Hp == 0 ? 1 : 0) + (end.Foe.Hp == 0 ? 1 : 0), $"seed {seed}");
            }
        }

        [Test]
        public void C3_11_Deterministic()
        {
            var setup = new BattleSetup { Turn = Side.Foe, Foe = new FighterSetup { Shield = 7 } };
            var a = new Battle(99, Brief(), setup);
            var b = new Battle(99, Brief(), setup);
            for (int i = 0; i < 300 && a.GetState().Status == BattleStatus.Playing; i++)
            {
                var ra = a.Spin();
                var rb = b.Spin();
                AssertGrid(ra.Grid, rb.Grid);
                Assert.AreEqual(ra.HpLoss, rb.HpLoss);
                Assert.AreEqual(ra.Absorbed, rb.Absorbed);
                Assert.AreEqual(ra.Healed, rb.Healed);
            }
            Assert.AreEqual(a.GetState().Player.Hp, b.GetState().Player.Hp);
            Assert.AreEqual(a.GetState().Foe.Hp, b.GetState().Foe.Hp);
        }

        // ------------------------------------------------------------ C8 / C11: cast order and timing

        [Test]
        public void C8_1_C8_3_CastOrderAndResolve()
        {
            var timing = TurnTiming.From(Brief());
            var f12 = Eval("F12").Chains;
            var order = SlotFiveCast.Order(f12);
            Assert.AreEqual(3, order.Count);
            CollectionAssert.AreEqual(new[] { Kind.Heal, Kind.Shield, Kind.Damage }, order.Select(i => f12[i].Kind));

            var f4 = Eval("F4").Chains;
            Assert.AreEqual(0, SlotFiveCast.Order(f4).Count);
            Assert.AreEqual(timing.ResolveMs, SlotFiveCast.ResolveMs(f4, timing));
            Assert.AreEqual(timing.BlankResolveMs, SlotFiveCast.ResolveMs(Eval("F0").Chains, timing));

            int expected = Math.Max(timing.ResolveMs, timing.CastDelayMs + 2 * timing.CastStaggerMs + timing.CastFlightMs + timing.CastTailMs);
            Assert.AreEqual(expected, SlotFiveCast.ResolveMs(f12, timing));
        }

        [Test]
        public void C11_FastScaleRoundsEveryKey()
        {
            var t = Brief();
            var normal = TurnTiming.From(t);
            var fast = normal.Scaled(t.sfFastFactor);
            Assert.AreEqual(TurnTiming.JsRound(t.sfSpinBaseMs * (double)t.sfFastFactor), fast.SpinBaseMs);
            Assert.AreEqual(TurnTiming.JsRound(t.sfFoeDelayMs * (double)t.sfFastFactor), fast.FoeDelayMs);
            Assert.AreEqual(normal.SpinMs, normal.Scaled(1).SpinMs);
            Assert.AreEqual(700 + 3 * 180, normal.SpinMs);
            Assert.AreEqual(3, TurnTiming.JsRound(2.5));
            Assert.AreEqual(-2, TurnTiming.JsRound(-2.5));
        }

        // ------------------------------------------------------------ C13: icon set by element

        [Test]
        public void C13_1_EveryTuningKeyHasARange()
        {
            var fields = typeof(SlotFiveTuning).GetFields(BindingFlags.Public | BindingFlags.Instance);
            foreach (var f in fields)
                Assert.IsNotNull(f.GetCustomAttribute<TuneAttribute>(), $"{f.Name} has no [Tune] range");
            var names = fields.Select(f => f.Name).ToArray();
            foreach (var gone in new[] { "sfWFire", "sfWVolt", "sfWFrost", "sfWEarth" }) CollectionAssert.DoesNotContain(names, gone);
            foreach (var kept in new[] { "sfElement", "sfWElement", "sfBFire", "sfBVolt", "sfBFrost", "sfBEarth" }) CollectionAssert.Contains(names, kept);
            var el = typeof(SlotFiveTuning).GetField("sfElement").GetCustomAttribute<TuneAttribute>();
            Assert.AreEqual((0f, 3f, 1f), (el.Min, el.Max, el.Step));
            var live = new SlotFiveTuning();
            Assert.AreEqual(1, live.sfElement);
            Assert.AreEqual(22, live.sfWElement);
        }

        [Test]
        public void C13_2_C13_5_OnlyActiveIconsOnTheGrid()
        {
            var t = Brief();
            var active = new[] { 1, 4, 5, 6, 7 };
            CollectionAssert.AreEqual(active, new GridConfig(t).ActiveIcons);
            for (uint seed = 9001; seed <= 9010; seed++)
            {
                var sim = new GridSim(seed, t);
                for (int i = 0; i < 10000; i++)
                    Assert.IsTrue(sim.Spin().Grid.All(row => row.All(v => active.Contains(v))));
            }
            for (uint seed = 1; seed <= 2000; seed++)
            {
                var b = new Battle(seed, t);
                Assert.IsTrue(b.GetGrid().All(row => row.All(v => active.Contains(v))), "init grid");
                CollectionAssert.AreEqual(active, b.ActiveIcons);
                int turns = 0;
                while (b.GetState().Status == BattleStatus.Playing && turns++ < SlotFiveSimRules.MaxTurns)
                {
                    var r = b.Spin();
                    Assert.IsTrue(r.Grid.All(row => row.All(v => active.Contains(v))));
                    Assert.IsFalse(r.Chains.Any(c => c.Icon == 0 || c.Icon == 2 || c.Icon == 3));
                }
            }
        }

        [Test]
        public void C13_3_ChangingElementOnlySwapsTheElementCell()
        {
            var demo = Brief();
            foreach (int element in new[] { 0, 2, 3 })
            {
                var other = Brief();
                other.sfElement = element;
                CollectionAssert.AreEqual(new[] { element, 4, 5, 6, 7 }, new GridConfig(other).ActiveIcons);
                var a = new GridSim(321, demo);
                var b = new GridSim(321, other);
                for (int i = 0; i < 1000; i++)
                {
                    var ga = a.Spin().Grid;
                    var gb = b.Spin().Grid;
                    for (int y = 0; y < 4; y++)
                        for (int x = 0; x < 4; x++)
                            Assert.AreEqual(ga[y][x] == 1 ? element : ga[y][x], gb[y][x]);
                }
            }
        }

        [Test]
        public void C13_4_BattleSnapshotsElement()
        {
            var t = Brief();
            var b = new Battle(1, t);
            t.sfElement = 0;
            Assert.AreEqual(1, b.Element);
            Assert.AreEqual(0, new Battle(1, t).Element);
        }

        [Test]
        public void C13_8_AnalyticUsesElementBase()
        {
            var demo = Brief();
            var fire = Brief();
            fire.sfElement = 0;
            var a = SlotFiveChains.Analytic(new GridConfig(demo), new EffectConfig(demo));
            var b = SlotFiveChains.Analytic(new GridConfig(fire), new EffectConfig(fire));
            // Same p for the element cell, only the base changes: volt 15 -> fire 10.
            var bladeOnly = Brief();
            bladeOnly.sfBVolt = 0;
            var c = SlotFiveChains.Analytic(new GridConfig(bladeOnly), new EffectConfig(bladeOnly));
            double perPoint = (a.Damage - c.Damage) / demo.sfBVolt;
            Assert.That(b.Damage, Is.EqualTo(c.Damage + perPoint * fire.sfBFire).Within(1e-9));
            Assert.That(b.Heal, Is.EqualTo(a.Heal).Within(1e-12));
        }

        // ------------------------------------------------------------ helpers

        private static void AssertGrid(int[][] expected, int[][] actual)
        {
            for (int y = 0; y < 4; y++) CollectionAssert.AreEqual(expected[y], actual[y], $"row {y}");
        }
    }
}
