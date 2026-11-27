using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using static SlotFive.Tests.SlotFiveFixtures;

namespace SlotFive.Tests
{
    /// <summary>Scene flow without the view: C5, C6, C7.11, C8, C11 on <see cref="SlotFiveMatch"/>.</summary>
    public class SlotFiveMatchTests
    {
        private static SlotFiveMatch NewMatch(SlotFiveTuning t = null) => new SlotFiveMatch(t ?? Brief());

        private static SlotFiveMatch Forced(BattleSetup setup, SlotFiveTuning t = null)
        {
            var m = NewMatch(t);
            m.LoadMatch(null, setup);
            return m;
        }

        /// <summary>Ticks in 1 ms steps until the predicate holds (max 60 s of game time).</summary>
        private static void Until(SlotFiveMatch m, System.Func<bool> done)
        {
            for (int i = 0; i < 60000 && !done(); i++) m.Tick(1);
            Assert.IsTrue(done(), "condition never reached");
        }

        [Test]
        public void C5_PlayerSpinThenFoeThenIdle()
        {
            var m = NewMatch();
            Assert.AreEqual(Phase.Idle, m.Phase);
            Assert.IsTrue(m.RequestSpin());
            Assert.AreEqual(Phase.Spinning, m.Phase);
            Until(m, () => m.Phase == Phase.FoeWait || m.Phase == Phase.Ended);
            if (m.Phase == Phase.Ended) return;
            Assert.IsFalse(m.RequestSpin());
            Assert.AreEqual(Reject.NotYourTurn, m.LastReject);
            Until(m, () => m.Phase == Phase.Idle || m.Phase == Phase.Ended);
            Assert.AreEqual(2, m.State.SpinIndex);
        }

        [Test]
        public void C5_5_TenTurnsMatchBattle()
        {
            var t = Brief();
            var m = NewMatch(t);
            var battle = new Battle((uint)t.sfSeed, t);
            for (int turn = 0; turn < 10 && m.Phase != Phase.Ended; turn++)
            {
                if (m.Phase == Phase.Idle) m.RequestSpin();
                Until(m, () => m.Phase == Phase.Spinning);
                var expected = battle.Spin();
                for (int y = 0; y < 4; y++) CollectionAssert.AreEqual(expected.Grid[y], m.LastSpin.Grid[y]);
                Until(m, () => m.Phase != Phase.Spinning && m.Phase != Phase.Resolving);
            }
        }

        [Test]
        public void C5_6_NewMatchSeedFollowsIndex()
        {
            var t = Brief();
            var m = NewMatch(t);
            Assert.AreEqual((uint)t.sfSeed, m.Seed);
            Assert.IsTrue(m.NewMatch());
            Assert.AreEqual((uint)(t.sfSeed + 1), m.Seed);
            Assert.AreEqual(Phase.Idle, m.Phase);
            m.RequestSpin();
            Assert.IsFalse(m.NewMatch(), "R is refused while spinning");
        }

        [Test]
        public void C6_1_C6_2_C6_3_SpinTiming()
        {
            var m = NewMatch();
            var t = m.Timing;
            m.RequestSpin();
            Assert.AreEqual(0, m.ReelsStopped);
            Assert.IsNotNull(m.LastSpin);
            CollectionAssert.AreEqual(new[] { t.SpinBaseMs, t.SpinBaseMs + t.ReelStopGapMs, t.SpinBaseMs + 2 * t.ReelStopGapMs, t.SpinBaseMs + 3 * t.ReelStopGapMs }, m.LastReelStopMs);
            m.Tick(t.SpinBaseMs - 1);
            Assert.AreEqual(0, m.ReelsStopped);
            m.Tick(1);
            Assert.AreEqual(1, m.ReelsStopped);
            Assert.IsFalse(m.RequestSpin());
            Assert.AreEqual(Reject.Busy, m.LastReject);
            m.Tick(3 * t.ReelStopGapMs);
            Assert.AreEqual(Phase.Resolving, m.Phase);
            Assert.IsFalse(m.RequestSpin());
            Assert.AreEqual(Reject.Busy, m.LastReject);
        }

        [Test]
        public void C6_4_Highlights()
        {
            var m = Forced(new BattleSetup { Grids = new List<int[][]> { Get("F7") } });
            m.RequestSpin();
            m.Tick(m.LastSpinMs);
            Assert.AreEqual(2, m.HighlightedChainCount);
            Assert.AreEqual(5, m.HighlightedCells);

            m = Forced(new BattleSetup { Grids = new List<int[][]> { Get("F0") } });
            m.RequestSpin();
            m.Tick(m.LastSpinMs);
            Assert.AreEqual(0, m.HighlightedCells);
        }

        [Test]
        public void C6_5_C6_6_DisplayHpAndFoeDelay()
        {
            var m = Forced(new BattleSetup { Grids = new List<int[][]> { Get("F1") } });
            int before = m.DisplayHp(Side.Foe);
            m.RequestSpin();
            m.Tick(m.LastSpinMs - 1);
            Assert.AreEqual(before, m.DisplayHp(Side.Foe));
            m.Tick(1 + m.LastResolveMs);
            Assert.AreEqual(m.State.Foe.Hp, m.DisplayHp(Side.Foe));
            Assert.AreEqual(Phase.FoeWait, m.Phase);
            m.Tick(m.LastFoeDelayMs - 1);
            Assert.AreEqual(Phase.FoeWait, m.Phase);
            m.Tick(1);
            Assert.AreEqual(Phase.Spinning, m.Phase);
            Assert.AreEqual(Side.Foe, m.LastSide);
        }

        [Test]
        public void C7_11_LegendClosesOnSpin()
        {
            var m = NewMatch();
            m.ToggleLegend();
            Assert.IsTrue(m.LegendOpen);
            Assert.IsTrue(m.RequestSpin());
            Assert.IsFalse(m.LegendOpen);
            CollectionAssert.AreEqual(new[] { 1, 4, 5, 6, 7 }, m.ActiveIcons);
        }

        [Test]
        public void C8_1_C8_2_C8_4_C8_5_CastSchedule()
        {
            var m = Forced(new BattleSetup { Grids = new List<int[][]> { Get("F12"), Get("F12") } });
            m.RequestSpin();
            var casts = m.LastCasts;
            Assert.AreEqual(3, casts.Count);
            CollectionAssert.AreEqual(new[] { Kind.Heal, Kind.Shield, Kind.Damage }, casts.Select(c => c.Kind));
            foreach (var c in casts) Assert.AreEqual(c.Kind, m.LastSpin.Chains[c.ChainIndex].Kind);
            Assert.AreEqual(Side.Player, casts[0].Target);
            Assert.AreEqual(Side.Player, casts[1].Target);
            Assert.AreEqual(Side.Foe, casts[2].Target);
            Assert.That(Vector2.Distance(casts[2].To, SlotFiveLayout.FoeFighter.center), Is.LessThan(1));
            var t = m.Timing;
            for (int k = 0; k < 3; k++)
            {
                Assert.AreEqual(t.CastDelayMs + k * t.CastStaggerMs, casts[k].LaunchMs);
                Assert.AreEqual(casts[k].LaunchMs + t.CastFlightMs, casts[k].ImpactMs);
            }
            Until(m, () => m.Phase == Phase.Spinning && m.LastSide == Side.Foe);
            Assert.AreEqual(Side.Foe, m.LastCasts[0].Target);
            Assert.AreEqual(Side.Player, m.LastCasts[2].Target);

            m = Forced(new BattleSetup { Grids = new List<int[][]> { Get("F7") } });
            m.RequestSpin();
            Assert.AreEqual(2, m.LastCasts.Count);
            var row = SlotFiveLayout.CellCenter(1, 1);
            Assert.That(Vector2.Distance(m.LastCasts[0].From, row), Is.LessThan(1));
            Assert.That(Vector2.Distance(m.LastCasts[1].From, row), Is.LessThan(1));
            // Layout v6.2: centres follow the square slots of T_SF_ReelGridSq (art px x ReelArtScale).
            float s = SlotFiveLayout.ReelArtScale;
            var expected = new Vector2(60f + (12f + 66f + 136f * 3) * s, 64f + (12f + 66f + 136f * 2) * s);
            Assert.That(Vector2.Distance(SlotFiveLayout.CellCenter(3, 2), expected), Is.LessThan(0.01f));
        }

        [Test]
        public void C8_3_ResolveLengths()
        {
            var m = Forced(new BattleSetup { Grids = new List<int[][]> { Get("F4") } });
            m.RequestSpin();
            Assert.AreEqual(0, m.LastCasts.Count);
            Assert.AreEqual(m.Timing.ResolveMs, m.LastResolveMs);
            m = Forced(new BattleSetup { Grids = new List<int[][]> { Get("F0") } });
            m.RequestSpin();
            Assert.AreEqual(m.Timing.BlankResolveMs, m.LastResolveMs);
        }

        [Test]
        public void C8_7_DisplayChangesOnlyOnImpact()
        {
            var m = Forced(new BattleSetup { Player = new FighterSetup { Hp = 80 }, Grids = new List<int[][]> { Get("F12") } });
            m.RequestSpin();
            m.Tick(m.LastSpinMs);
            var casts = m.LastCasts;
            m.Tick(casts[0].ImpactMs - 1);
            Assert.AreEqual(80, m.DisplayHp(Side.Player));
            m.Tick(1);
            Assert.AreEqual(100, m.DisplayHp(Side.Player));
            Assert.AreEqual(0, m.DisplayShield(Side.Player));
            m.Tick(casts[1].ImpactMs - casts[0].ImpactMs);
            Assert.AreEqual(20, m.DisplayShield(Side.Player));
            int foe = m.DisplayHp(Side.Foe);
            m.Tick(casts[2].ImpactMs - casts[1].ImpactMs);
            Assert.AreEqual(foe - 5, m.DisplayHp(Side.Foe));
            Assert.AreEqual(m.State.Player.Hp, m.DisplayHp(Side.Player));
            Assert.AreEqual(m.State.Foe.Hp, m.DisplayHp(Side.Foe));
        }

        [Test]
        public void C8_8_ShieldAbsorbsPerProjectile()
        {
            var m = Forced(new BattleSetup { Foe = new FighterSetup { Shield = 20 }, Grids = new List<int[][]> { Get("F11") } });
            int hp = m.DisplayHp(Side.Foe);
            m.RequestSpin();
            m.Tick(m.LastSpinMs);
            var c = m.LastCasts;
            m.Tick(c[0].ImpactMs);
            Assert.AreEqual(5, m.DisplayShield(Side.Foe));
            Assert.AreEqual(hp, m.DisplayHp(Side.Foe));
            Assert.AreEqual(15, c[0].Absorbed);
            m.Tick(c[1].ImpactMs - c[0].ImpactMs);
            Assert.AreEqual(0, m.DisplayShield(Side.Foe));
            Assert.AreEqual(hp - 15, m.DisplayHp(Side.Foe));
            Assert.AreEqual(m.State.Foe.Hp, m.DisplayHp(Side.Foe));
        }

        [Test]
        public void C8_9_FullMatchCastsLand()
        {
            var m = NewMatch();
            int guard = 0;
            while (m.Phase != Phase.Ended && guard++ < 5000)
            {
                if (m.Phase == Phase.Idle) m.RequestSpin();
                m.Tick(50);
                if (m.Phase != Phase.Resolving && m.LastCasts.Count > 0)
                    Assert.IsTrue(m.LastCasts.All(c => c.Impacted) || m.Phase == Phase.Spinning);
                Assert.GreaterOrEqual(m.CastsInFlight, 0);
            }
            Assert.AreEqual(Phase.Ended, m.Phase);
            Assert.AreEqual(0, m.CastsInFlight);
            Assert.AreEqual(m.LastSpin.Chains.Count(c => c.Kind != Kind.None), m.LastCasts.Count);
        }

        [Test]
        public void C11_FastModeSnapshotsPerTurn()
        {
            var t = Brief();
            var m = NewMatch(t);
            m.ToggleFast();
            m.RequestSpin();
            Assert.AreEqual(t.sfFastFactor, m.LastTimeScale, 1e-6);
            Assert.AreEqual(TurnTiming.JsRound(t.sfSpinBaseMs * (double)t.sfFastFactor) + 3 * TurnTiming.JsRound(t.sfReelStopGapMs * (double)t.sfFastFactor), m.LastSpinMs);
            m.ToggleFast(); // mid-turn: only the flag changes
            Assert.AreEqual(t.sfFastFactor, m.LastTimeScale, 1e-6);
            Until(m, () => m.Phase == Phase.FoeWait || m.Phase == Phase.Ended);
            if (m.Phase == Phase.FoeWait)
            {
                Assert.AreEqual(1, m.LastTimeScale, 1e-9);
                Assert.AreEqual(t.sfFoeDelayMs, m.LastFoeDelayMs);
            }
        }

        [Test]
        public void LargeTickEqualsSmallTicks()
        {
            var a = NewMatch();
            var b = NewMatch();
            a.RequestSpin();
            b.RequestSpin();
            a.Tick(10000);
            for (int i = 0; i < 10000; i++) b.Tick(1);
            Assert.AreEqual(a.Phase, b.Phase);
            Assert.AreEqual(a.State.SpinIndex, b.State.SpinIndex);
            Assert.AreEqual(a.DisplayHp(Side.Foe), b.DisplayHp(Side.Foe));
        }
    }
}
