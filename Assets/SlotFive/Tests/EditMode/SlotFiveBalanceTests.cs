using System.Diagnostics;
using NUnit.Framework;

namespace SlotFive.Tests
{
    /// <summary>
    /// C14: balance of the demo icon set, on the live tuning (SlotFiveTuning defaults = start point of C14, brief 5.6).
    /// Acceptance seeds 9001..11000. C14.2–C14.7 are tuning targets: they are expected to fail until C14 is tuned.
    /// </summary>
    public class SlotFiveBalanceTests
    {
        private static MatchReport _report;
        private static long _ms;

        private static MatchReport Report()
        {
            if (_report != null) return _report;
            var sw = Stopwatch.StartNew();
            _report = SlotFiveSim.Simulate(SlotFiveSim.SeedRange(9001, 11000), new SlotFiveTuning());
            _ms = sw.ElapsedMilliseconds;
            TestContext.Progress.WriteLine($"[SlotFive C14] {_report} ({_ms} ms)");
            return _report;
        }

        [Test]
        public void C14_1_MeanDamageMatchesAnalytic()
        {
            var r = Report();
            var t = new SlotFiveTuning();
            var a = SlotFiveChains.Analytic(new GridConfig(t), new EffectConfig(t));
            Assert.That(System.Math.Abs(r.MeanDamage - a.Damage), Is.LessThanOrEqualTo(3 * r.MeanDamageStdErr));
        }

        [Test]
        public void C14_8_FinishedAndDeterministic()
        {
            var r = Report();
            Assert.AreEqual(0, r.Unfinished);
            var again = SlotFiveSim.Simulate(SlotFiveSim.SeedRange(9001, 11000), new SlotFiveTuning());
            Assert.AreEqual(r.ToString(), again.ToString());
        }

        [Test]
        public void C14_9_RunsUnder15Seconds()
        {
            Report();
            Assert.Less(_ms, 15000);
        }

        [Test]
        public void C14_5b_InactiveIconsNeverChain()
        {
            var r = Report();
            foreach (int icon in new[] { 0, 2, 3 }) Assert.AreEqual(0, r.ChainTurnRateByIcon[icon]);
        }

        [Test, Category("BalanceTarget")]
        public void C14_2_MatchLength()
        {
            Assert.That(Report().EstMatchMsMedian, Is.InRange(300000L, 420000L), "estMatchMsMedian");
            Assert.That(Report().EstMatchMsP90, Is.LessThanOrEqualTo(540000L), "estMatchMsP90");
        }

        [Test, Category("BalanceTarget")]
        public void C14_3_Turns()
        {
            Assert.That(Report().TurnsMedian, Is.InRange(110, 160), "turnsMedian");
            Assert.That(Report().TurnsP90, Is.LessThanOrEqualTo(225), "turnsP90");
        }

        [Test, Category("BalanceTarget")]
        public void C14_4_AttackTurnRate() => Assert.That(Report().AttackTurnRate, Is.GreaterThanOrEqualTo(0.60));

        [Test, Category("BalanceTarget")]
        public void C14_5_VoltChainTurnRate() => Assert.That(Report().ChainTurnRateByIcon[1], Is.GreaterThanOrEqualTo(0.15));

        [Test, Category("BalanceTarget")]
        public void C14_6_PlayerWinRate() => Assert.That(Report().PlayerWinRate, Is.InRange(0.50, 0.60));

        [Test, Category("BalanceTarget")]
        public void C14_7_ComebackRate() => Assert.That(Report().ComebackRate, Is.InRange(0.15, 0.40));

        [Test]
        public void C14_10_RecordFoeFirst()
        {
            var foeFirst = SlotFiveSim.Simulate(SlotFiveSim.SeedRange(9001, 11000), new SlotFiveTuning(), new BattleSetup { Turn = Side.Foe });
            TestContext.Progress.WriteLine($"[SlotFive C14 foe first] win {foeFirst.PlayerWinRate:F4}");
            Assert.Pass();
        }
    }
}
