using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace SlotFive
{
    public enum Phase { Idle, Spinning, Resolving, FoeWait, Ended }
    public enum Reject { None, NotYourTurn, Busy, Ended }

    /// <summary>One projectile of the cast schedule (brief 4.10). Times are ms from the start of resolving.</summary>
    public sealed class Cast
    {
        public int ChainIndex;
        public Kind Kind;
        public int Icon;
        /// <summary>Side the projectile flies to.</summary>
        public Side Target;
        /// <summary>Mean of the chain's cell centers, game px.</summary>
        public Vector2 From;
        /// <summary>Center of the target's fighter box, game px.</summary>
        public Vector2 To;
        public int Value;
        public int LaunchMs;
        public int ImpactMs;
        public bool Launched;
        public bool Impacted;
        /// <summary>Damage casts: part taken by the displayed shield on impact (drives sf_block).</summary>
        public int Absorbed;
    }

    /// <summary>
    /// Match flow of the scene (brief 3, 4.7, 4.8, 4.10, 4.11): phases, foe turn, reel stops, cast schedule and the
    /// displayed hp/shield. Plain class driven by Tick(ms) so it runs the same in the game and in EditMode tests.
    /// It only plays back what <see cref="Battle"/> decided; it never changes rules or reads the logic RNG.
    /// </summary>
    public sealed class SlotFiveMatch
    {
        private readonly SlotFiveTuning _live;
        private SlotFiveTuning _tuning;
        private Battle _battle;
        private double _phaseStart;
        private readonly List<(int time, bool impact, int cast)> _events = new List<(int, bool, int)>();
        private int _nextEvent;

        public SlotFiveMatch(SlotFiveTuning live)
        {
            _live = live;
            StartMatch(null, null);
        }

        // ------------------------------------------------------------ state (mirrors the Phaser getState fields)

        public uint Seed { get; private set; }
        public int MatchIndex { get; private set; }
        public double Clock { get; private set; }
        public Phase Phase { get; private set; }
        public BattleState State => _battle.GetState();
        public int Element => _battle.Element;
        public int[] ActiveIcons => _battle.ActiveIcons;
        public int[][] Grid => _battle.GetGrid();
        public SlotFiveTuning MatchTuning => _tuning;

        public Side? LastSide { get; private set; }
        public BattleSpin LastSpin { get; private set; }
        public List<Chain> LastChains => LastSpin?.Chains ?? new List<Chain>();

        public int RejectedSpins { get; private set; }
        public Reject LastReject { get; private set; }

        public int ReelsStopped { get; private set; }
        public int LastSpinMs { get; private set; }
        public int LastResolveMs { get; private set; }
        public int[] LastReelStopMs { get; } = new int[SlotFiveConst.Cols];
        public int HighlightedChainCount { get; private set; }
        public int HighlightedCells { get; private set; }

        public bool LegendOpen { get; private set; }
        public bool FastMode { get; private set; }
        public double LastTimeScale { get; private set; } = 1;
        public int LastFoeDelayMs { get; private set; }
        /// <summary>Timing of the current (or last) turn, already scaled by LastTimeScale.</summary>
        public TurnTiming Timing { get; private set; }

        public List<Cast> LastCasts { get; } = new List<Cast>();
        public int CastsInFlight { get; private set; }

        private readonly int[] _displayHp = new int[2];
        private readonly int[] _displayShield = new int[2];
        public int DisplayHp(Side s) => _displayHp[(int)s];
        public int DisplayShield(Side s) => _displayShield[(int)s];

        /// <summary>Elapsed ms in the current phase.</summary>
        public double PhaseElapsed => Clock - _phaseStart;

        // ------------------------------------------------------------ events for the view

        public event Action MatchStarted;
        public event Action<Side> SpinStarted;
        public event Action<int> ReelStopped;
        public event Action ResolveStarted;
        public event Action<Cast> CastLaunched;
        /// <summary>Cast, then the change applied to the receiver: hp delta (signed) and shield delta (signed).</summary>
        public event Action<Cast, int, int> CastImpacted;
        public event Action<BattleStatus> MatchEnded;
        public event Action LegendChanged;

        // ------------------------------------------------------------ commands

        /// <summary>Player spin (Space, Enter, #sf-spin). Rejected unless idle on the player's turn.</summary>
        public bool RequestSpin()
        {
            Reject reject = Reject.None;
            if (Phase == Phase.Ended || State.Status != BattleStatus.Playing) reject = Reject.Ended;
            else if (Phase == Phase.Spinning || Phase == Phase.Resolving) reject = Reject.Busy;
            else if (State.Turn != Side.Player || Phase == Phase.FoeWait) reject = Reject.NotYourTurn;
            if (reject != Reject.None)
            {
                RejectedSpins++;
                LastReject = reject;
                return false;
            }
            // The player's turn starts on entering spinning: snapshot the time scale now (brief 4.11).
            SnapshotTimeScale();
            BeginSpinning(Clock);
            return true;
        }

        /// <summary>New match (R, #sf-new; Enter after the end). Refused while spinning.</summary>
        public bool NewMatch()
        {
            if (Phase == Phase.Spinning) return false;
            MatchIndex++;
            StartMatch(null, null);
            return true;
        }

        /// <summary>Dev/test hook: restart the current match index with an optional seed and setup (forced grids).</summary>
        public void LoadMatch(uint? seed, BattleSetup setup) => StartMatch(seed, setup);

        /// <summary>Queues a grid for the next spin of the running match.</summary>
        public void ForceNextGrid(int[][] grid) => _battle.ForceNextGrid(grid);

        /// <summary>F / #sf-fast. Never rejected; takes effect from the next turn.</summary>
        public void ToggleFast() => FastMode = !FastMode;

        public void ToggleLegend() => SetLegend(!LegendOpen);
        public void CloseLegend() => SetLegend(false);

        private void SetLegend(bool open)
        {
            if (LegendOpen == open) return;
            LegendOpen = open;
            LegendChanged?.Invoke();
        }

        // ------------------------------------------------------------ clock

        /// <summary>Advances the match by dt ms, firing every deadline in order (large steps are exact too).</summary>
        public void Tick(double dtMs)
        {
            double target = Clock + Math.Max(0, dtMs);
            while (true)
            {
                double next = NextDeadline();
                if (next > target) break;
                Clock = Math.Max(Clock, next);
                FireDeadline();
            }
            Clock = target;
        }

        private double NextDeadline()
        {
            switch (Phase)
            {
                case Phase.Spinning:
                    return _phaseStart + LastReelStopMs[ReelsStopped];
                case Phase.Resolving:
                    return _nextEvent < _events.Count ? _phaseStart + _events[_nextEvent].time : _phaseStart + LastResolveMs;
                case Phase.FoeWait:
                    return _phaseStart + LastFoeDelayMs;
                default:
                    return double.PositiveInfinity;
            }
        }

        private void FireDeadline()
        {
            switch (Phase)
            {
                case Phase.Spinning:
                    ReelsStopped++;
                    ReelStopped?.Invoke(ReelsStopped - 1);
                    if (ReelsStopped == SlotFiveConst.Cols) BeginResolving(_phaseStart + LastSpinMs);
                    break;
                case Phase.Resolving:
                    if (_nextEvent < _events.Count) FireCastEvent(_events[_nextEvent++]);
                    else EndResolving(_phaseStart + LastResolveMs);
                    break;
                case Phase.FoeWait:
                    BeginSpinning(_phaseStart + LastFoeDelayMs);
                    break;
            }
        }

        // ------------------------------------------------------------ phases

        private void StartMatch(uint? seed, BattleSetup setup)
        {
            // TUNING is snapshotted when a match starts (brief 4.8).
            _tuning = _live.Clone();
            Seed = seed ?? unchecked((uint)(_tuning.sfSeed + MatchIndex));
            _battle = new Battle(Seed, _tuning, setup);
            Phase = State.Turn == Side.Player ? Phase.Idle : Phase.FoeWait;
            _phaseStart = Clock;
            LastSide = null;
            LastSpin = null;
            LastReject = Reject.None;
            RejectedSpins = 0;
            ReelsStopped = SlotFiveConst.Cols;
            LastSpinMs = 0;
            LastResolveMs = 0;
            Array.Clear(LastReelStopMs, 0, LastReelStopMs.Length);
            HighlightedChainCount = 0;
            HighlightedCells = 0;
            LastCasts.Clear();
            CastsInFlight = 0;
            _events.Clear();
            _nextEvent = 0;
            var s = State;
            _displayHp[(int)Side.Player] = s.Player.Hp;
            _displayHp[(int)Side.Foe] = s.Foe.Hp;
            _displayShield[(int)Side.Player] = s.Player.Shield;
            _displayShield[(int)Side.Foe] = s.Foe.Shield;
            SetLegend(false);
            if (Phase == Phase.FoeWait) SnapshotTimeScale();
            else Timing = TurnTiming.From(_tuning);
            MatchStarted?.Invoke();
        }

        private void SnapshotTimeScale()
        {
            LastTimeScale = FastMode ? _tuning.sfFastFactor : 1;
            Timing = TurnTiming.From(_tuning).Scaled(LastTimeScale);
            LastFoeDelayMs = Timing.FoeDelayMs;
        }

        private void BeginSpinning(double at)
        {
            _phaseStart = at;
            Phase = Phase.Spinning;
            SetLegend(false);
            HighlightedChainCount = 0;
            HighlightedCells = 0;

            var side = State.Turn;
            // The spinner's displayed shield goes to 0 as the spin starts (brief 4.10).
            _displayShield[(int)side] = 0;
            LastSpin = _battle.Spin();
            LastSide = side;

            var t = Timing;
            for (int i = 0; i < SlotFiveConst.Cols; i++) LastReelStopMs[i] = t.SpinBaseMs + i * t.ReelStopGapMs;
            LastSpinMs = t.SpinMs;
            ReelsStopped = 0;
            BuildCasts(side);
            LastResolveMs = SlotFiveCast.ResolveMs(LastSpin.Chains, t);
            SpinStarted?.Invoke(side);
        }

        private void BuildCasts(Side side)
        {
            LastCasts.Clear();
            _events.Clear();
            _nextEvent = 0;
            CastsInFlight = 0;
            var chains = LastSpin.Chains;
            var order = SlotFiveCast.Order(chains);
            var t = Timing;
            for (int k = 0; k < order.Count; k++)
            {
                var chain = chains[order[k]];
                var from = Vector2.zero;
                foreach (var c in chain.Cells) from += SlotFiveLayout.CellCenter(c.X, c.Y);
                from /= chain.Cells.Length;
                var target = chain.Kind == Kind.Damage ? Battle.Other(side) : side;
                int launch = t.CastDelayMs + k * t.CastStaggerMs;
                LastCasts.Add(new Cast
                {
                    ChainIndex = order[k], Kind = chain.Kind, Icon = chain.Icon, Target = target,
                    From = from, To = SlotFiveLayout.Fighter(target).center, Value = chain.Value,
                    LaunchMs = launch, ImpactMs = launch + t.CastFlightMs,
                });
            }
            for (int k = 0; k < LastCasts.Count; k++)
            {
                _events.Add((LastCasts[k].LaunchMs, false, k));
                _events.Add((LastCasts[k].ImpactMs, true, k));
            }
            // Chronological; on a tie a launch (false) goes before an impact, then by cast order.
            _events.Sort((a, b) => a.time != b.time ? a.time - b.time : a.impact != b.impact ? (a.impact ? 1 : -1) : a.cast - b.cast);
        }

        private void BeginResolving(double at)
        {
            _phaseStart = at;
            Phase = Phase.Resolving;
            HighlightedChainCount = LastSpin.Chains.Count;
            HighlightedCells = LastSpin.Chains.SelectMany(c => c.Cells).Distinct().Count();
            ResolveStarted?.Invoke();
        }

        private void FireCastEvent((int time, bool impact, int cast) e)
        {
            var c = LastCasts[e.cast];
            if (!e.impact)
            {
                c.Launched = true;
                CastsInFlight++;
                CastLaunched?.Invoke(c);
                return;
            }
            c.Impacted = true;
            CastsInFlight--;
            int ti = (int)c.Target;
            int hpBefore = _displayHp[ti], shieldBefore = _displayShield[ti];
            int maxHp = c.Target == Side.Player ? State.Player.MaxHp : State.Foe.MaxHp;
            switch (c.Kind)
            {
                case Kind.Heal:
                    _displayHp[ti] += Math.Min(c.Value, maxHp - _displayHp[ti]);
                    break;
                case Kind.Shield:
                    _displayShield[ti] += c.Value;
                    break;
                case Kind.Damage:
                    c.Absorbed = Math.Min(_displayShield[ti], c.Value);
                    _displayShield[ti] -= c.Absorbed;
                    _displayHp[ti] = Math.Max(0, _displayHp[ti] - (c.Value - c.Absorbed));
                    break;
            }
            CastImpacted?.Invoke(c, _displayHp[ti] - hpBefore, _displayShield[ti] - shieldBefore);
        }

        private void EndResolving(double at)
        {
            _phaseStart = at;
            // After the last cast the display matches the logic.
            var s = State;
            _displayHp[(int)Side.Player] = s.Player.Hp;
            _displayHp[(int)Side.Foe] = s.Foe.Hp;
            _displayShield[(int)Side.Player] = s.Player.Shield;
            _displayShield[(int)Side.Foe] = s.Foe.Shield;

            if (s.Status != BattleStatus.Playing)
            {
                Phase = Phase.Ended;
                MatchEnded?.Invoke(s.Status);
            }
            else if (LastSide == Side.Player)
            {
                // The foe's turn starts on entering foeWait and keeps that scale for the whole turn.
                Phase = Phase.FoeWait;
                SnapshotTimeScale();
            }
            else
            {
                Phase = Phase.Idle;
            }
        }
    }
}
