using System;
using UnityEngine;

namespace SlotFive
{
    /// <summary>Inspector range of one tuning key: [min, max] with a step (brief section 5, TUNING_RANGES).</summary>
    [AttributeUsage(AttributeTargets.Field)]
    public sealed class TuneAttribute : PropertyAttribute
    {
        public readonly float Min;
        public readonly float Max;
        public readonly float Step;

        public TuneAttribute(float min, float max, float step)
        {
            Min = min;
            Max = max;
            Step = step;
        }
    }

    /// <summary>
    /// Every Slot Five gameplay number (the sf* keys of the Phaser TUNING). Plain class so the pure logic and
    /// EditMode tests can use it without an asset; <see cref="SlotFiveTuningAsset"/> holds one for the game.
    /// Defaults are the values running at the start of C14 (brief 5.6).
    /// </summary>
    [Serializable]
    public sealed class SlotFiveTuning
    {
        // Icon set (brief v5 4.1.1). sfElement: 0 fire, 1 volt (Sét), 2 frost, 3 earth.
        [Tune(0, 3, 1)] public int sfElement = 1;
        [Tune(1, 60, 1)] public int sfWElement = 22;
        [Tune(1, 60, 1)] public int sfWBlade = 36;
        [Tune(1, 60, 1)] public int sfWHeal = 15;
        [Tune(1, 60, 1)] public int sfWShield = 15;
        [Tune(1, 60, 1)] public int sfWLucky = 12;

        // Base value of a 3-chain.
        [Tune(1, 120, 1)] public int sfBFire = 10;
        [Tune(1, 120, 1)] public int sfBVolt = 15;
        [Tune(1, 120, 1)] public int sfBFrost = 15;
        [Tune(1, 120, 1)] public int sfBEarth = 10;
        [Tune(1, 120, 1)] public int sfBBlade = 5;
        [Tune(1, 120, 1)] public int sfBHeal = 50;
        [Tune(1, 120, 1)] public int sfBShield = 20;
        [Tune(1, 6, 1)] public int sfLen4Mult = 2;

        // Fighters and match.
        [Tune(40, 2000, 10)] public int sfPlayerMaxHp = 450;
        [Tune(40, 2000, 10)] public int sfFoeMaxHp = 440;
        [Tune(1, 999, 1)] public int sfSeed = 777;

        // Timing (display only, brief 5.3).
        [Tune(300, 1500, 50)] public int sfSpinBaseMs = 700;
        [Tune(80, 400, 10)] public int sfReelStopGapMs = 180;
        [Tune(0, 250, 10)] public int sfStopBounceMs = 120;
        [Tune(1, 5, 0.1f)] public float sfReelSpeed = 2.4f;
        [Tune(300, 2000, 100)] public int sfResolveMs = 900;
        [Tune(0, 800, 50)] public int sfBlankResolveMs = 300;
        [Tune(0, 1500, 50)] public int sfFoeDelayMs = 500;

        // Cast (brief 4.10): display only, never touches rules or the sim outcome.
        [Tune(0, 400, 10)] public int sfCastDelayMs = 150;
        [Tune(0, 300, 10)] public int sfCastStaggerMs = 120;
        [Tune(150, 800, 10)] public int sfCastFlightMs = 350;
        [Tune(0, 600, 10)] public int sfCastTailMs = 250;

        // Fast mode (brief 4.11): every timing key k becomes round(k * sfFastFactor).
        [Tune(0.1f, 1, 0.05f)] public float sfFastFactor = 0.35f;

        public SlotFiveTuning Clone() => (SlotFiveTuning)MemberwiseClone();

        /// <summary>Weight key of an icon (sfW*), or sfWElement for the match element.</summary>
        public int WeightOf(int icon)
        {
            switch (icon)
            {
                case 4: return sfWBlade;
                case 5: return sfWHeal;
                case 6: return sfWShield;
                case 7: return sfWLucky;
                default: return icon == sfElement ? sfWElement : 0;
            }
        }

        /// <summary>Base value of a 3-chain per icon (sfB*); lucky has none.</summary>
        public int BaseOf(int icon)
        {
            switch (icon)
            {
                case 0: return sfBFire;
                case 1: return sfBVolt;
                case 2: return sfBFrost;
                case 3: return sfBEarth;
                case 4: return sfBBlade;
                case 5: return sfBHeal;
                case 6: return sfBShield;
                default: return 0;
            }
        }
    }

    /// <summary>Measurement rules of the balance sim (brief C4, C10, 5.3), not tuning values.</summary>
    public static class SlotFiveSimRules
    {
        /// <summary>Assumed time a player takes to press spin, added once per player turn.</summary>
        public const int PlayerPressMs = 600;
        /// <summary>A simulated match still playing after this many spins is cut and counted as unfinished.</summary>
        public const int MaxTurns = 2000;
        /// <summary>COMEBACK_GAP in percentage points of hp ratio.</summary>
        public const int ComebackGapPct = 20;
    }
}
