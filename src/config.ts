/** Every gameplay number lives here so designers can tune without touching logic. */
export const TUNING = {
  moveSpeed: 260,
  acceleration: 2400,
  airControl: 0.7,
  gravity: 1400,
  jumpVelocity: 620,
  jumpCutMultiplier: 0.5,
  coyoteMs: 90,
  jumpBufferMs: 110,
  arcRadius: 220,
  arcSpeed: 1400,
  arcExitJumpVelocity: 520,
  arcTimeLimitMs: 25000,
  arcRestartLockMs: 400,
  gfBoardSize: 7,
  gfInitialPieces: 24,
  gfWaveSize: 4,
  gfVentTiltCost: 2,
  gfL1Seed: 101,
  gfL2Seed: 202,
  gfL3Seed: 303,
  gfL1Colors: 4,
  gfL2Colors: 4,
  gfL3Colors: 6,
  gfL1TiltLimit: 26,
  gfL2TiltLimit: 26,
  gfL3TiltLimit: 32,
  gfL1GoalColors: 2,
  gfL2GoalColors: 3,
  gfL3GoalColors: 3,
  gfL1GoalCount: 24,
  gfL2GoalCount: 24,
  gfL3GoalCount: 16,
  gfSlideMsPerCell: 45,
  gfSlideMaxMs: 220,
  gfEnterMs: 120,
  gfClearPrepMs: 60,
  gfClearMs: 180,
  gfChainPauseMs: 80,
  gfVentMs: 300,
  gfRejectShakeMs: 80,
  gfSwipeMinPx: 28,
  gfSwipeAxisRatio: 1.2,
  gfEndLockMs: 300,
  // Slot Five (brief v4, 4x4 grid). Weights are integers; sfB* is the base value of a 3-chain.
  sfWFire: 8,
  sfWVolt: 6,
  sfWFrost: 6,
  sfWEarth: 8,
  sfWBlade: 40,
  sfWHeal: 13,
  sfWShield: 13,
  sfWLucky: 6,
  sfBFire: 10,
  sfBVolt: 15,
  sfBFrost: 15,
  sfBEarth: 10,
  sfBBlade: 5,
  sfBHeal: 20,
  sfBShield: 20,
  sfLen4Mult: 2,
  sfPlayerMaxHp: 450,
  sfFoeMaxHp: 450,
  sfSeed: 777,
  sfSpinBaseMs: 700,
  sfReelStopGapMs: 180,
  sfStopBounceMs: 120,
  sfReelSpeed: 2.4,
  sfResolveMs: 900,
  sfBlankResolveMs: 300,
  sfFoeDelayMs: 500,
  // Slot Five cast (brief v3, 4.10): display only, never touches rules or the sim outcome.
  sfCastDelayMs: 150,
  sfCastStaggerMs: 120,
  sfCastFlightMs: 350,
  sfCastTailMs: 250,
};

/** Slider ranges for the in-game tuning panel: [min, max, step]. */
export const TUNING_RANGES: Record<keyof typeof TUNING, [number, number, number]> = {
  moveSpeed: [80, 600, 5],
  acceleration: [200, 6000, 50],
  airControl: [0, 1, 0.05],
  gravity: [200, 3000, 25],
  jumpVelocity: [200, 1200, 10],
  jumpCutMultiplier: [0.1, 1, 0.05],
  coyoteMs: [0, 250, 5],
  jumpBufferMs: [0, 250, 5],
  arcRadius: [160, 300, 10],
  arcSpeed: [800, 2400, 50],
  arcExitJumpVelocity: [300, 700, 10],
  arcTimeLimitMs: [15000, 55000, 1000],
  arcRestartLockMs: [0, 1000, 50],
  gfBoardSize: [6, 8, 1],
  gfInitialPieces: [16, 34, 1],
  gfWaveSize: [2, 5, 1],
  gfVentTiltCost: [1, 4, 1],
  gfL1Seed: [1, 999, 1],
  gfL2Seed: [1, 999, 1],
  gfL3Seed: [1, 999, 1],
  gfL1Colors: [3, 6, 1],
  gfL2Colors: [3, 6, 1],
  gfL3Colors: [3, 6, 1],
  gfL1TiltLimit: [12, 32, 1],
  gfL2TiltLimit: [12, 32, 1],
  gfL3TiltLimit: [12, 32, 1],
  gfL1GoalColors: [1, 3, 1],
  gfL2GoalColors: [1, 3, 1],
  gfL3GoalColors: [1, 3, 1],
  gfL1GoalCount: [4, 24, 1],
  gfL2GoalCount: [4, 24, 1],
  gfL3GoalCount: [4, 24, 1],
  gfSlideMsPerCell: [20, 90, 5],
  gfSlideMaxMs: [120, 400, 10],
  gfEnterMs: [60, 240, 10],
  gfClearPrepMs: [0, 120, 10],
  gfClearMs: [100, 300, 10],
  gfChainPauseMs: [0, 160, 10],
  gfVentMs: [150, 600, 10],
  gfRejectShakeMs: [0, 200, 10],
  gfSwipeMinPx: [12, 64, 2],
  gfSwipeAxisRatio: [1, 2, 0.1],
  gfEndLockMs: [0, 800, 50],
  // Slot Five
  sfWFire: [1, 60, 1],
  sfWVolt: [1, 60, 1],
  sfWFrost: [1, 60, 1],
  sfWEarth: [1, 60, 1],
  sfWBlade: [1, 60, 1],
  sfWHeal: [1, 60, 1],
  sfWShield: [1, 60, 1],
  sfWLucky: [1, 60, 1],
  sfBFire: [1, 120, 1],
  sfBVolt: [1, 120, 1],
  sfBFrost: [1, 120, 1],
  sfBEarth: [1, 120, 1],
  sfBBlade: [1, 120, 1],
  sfBHeal: [1, 120, 1],
  sfBShield: [1, 120, 1],
  sfLen4Mult: [1, 6, 1],
  sfPlayerMaxHp: [40, 2000, 10],
  sfFoeMaxHp: [40, 2000, 10],
  sfSeed: [1, 999, 1],
  sfSpinBaseMs: [300, 1500, 50],
  sfReelStopGapMs: [80, 400, 10],
  sfStopBounceMs: [0, 250, 10],
  sfReelSpeed: [1, 5, 0.1],
  sfResolveMs: [300, 2000, 100],
  sfBlankResolveMs: [0, 800, 50],
  sfFoeDelayMs: [0, 1500, 50],
  sfCastDelayMs: [0, 400, 10],
  sfCastStaggerMs: [0, 300, 10],
  sfCastFlightMs: [150, 800, 10],
  sfCastTailMs: [0, 600, 10],
};

export const VIEW = { width: 960, height: 540 };

/** Slot Five (brief v3, 4.9) is a portrait game; the other games keep VIEW. */
export const SLOT_FIVE_VIEW = { width: 540, height: 960 };

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** x and y are the center of each object. */
export const LEVEL = {
  width: 1600,
  spawn: { x: 80, y: 470 },
  ground: [
    { x: 310, y: 520, w: 620, h: 40 },
    { x: 1160, y: 520, w: 880, h: 40 },
  ] as Rect[],
  oneWayPlatforms: [{ x: 1280, y: 400, w: 160, h: 20 }] as Rect[],
  spikes: [{ x: 920, y: 488, w: 40, h: 24 }] as Rect[],
  coins: [
    { x: 300, y: 455 },
    { x: 670, y: 380 },
    { x: 1280, y: 350 },
  ],
  goal: { x: 1500, y: 450, w: 32, h: 100 },
};

/** Slot Five balance-sim assumptions from brief C4 and 5.3. Measurement rules, not tuning values. */
export const SLOT_FIVE_SIM = {
  /** Assumed time a player takes to press spin, added once per player turn to the match-length estimate. */
  playerPressMs: 600,
  /** A simulated match still playing after this many spins is cut and counted as unfinished. */
  maxTurns: 2000,
  /** COMEBACK_GAP: the eventual winner must have trailed by at least this many percentage points of hp ratio. */
  comebackGapPct: 20,
};

/** Arc Relay engine limits, not design values, so they are not in the tuning panel. */
export const ARC_RUNTIME = {
  /** Longest real time one frame may add to the clock, so a hidden tab does not burn the timer. */
  maxClockStepMs: 250,
  /** How far below the view the player must fall to count as lost in a pit. */
  pitFallMargin: 60,
};

/** Arc Relay flipbooks, copied from each sheet's json in `public/vfx/`. Paths are relative to the app base. */
export const ARC_VFX = {
  'arc-bolt': {
    path: 'vfx/arc-bolt/T_arc_bolt_4x2.png',
    frameWidth: 192,
    frameHeight: 48,
    frames: 8,
    durationMs: 240,
    originX: 0.03125,
    originY: 0.5,
    /** Bolt length drawn in the sheet, used to stretch it to the real arc distance. */
    lengthPx: 172,
  },
  'pylon-spark': {
    path: 'vfx/pylon-spark/T_pylon_spark_4x4.png',
    frameWidth: 96,
    frameHeight: 96,
    frames: 16,
    durationMs: 360,
    originX: 0.5,
    originY: 0.5,
  },
};

/** A stalled VFX request must not hold the game on its loading step. */
export const ARC_VFX_LOAD_TIMEOUT_MS = 3000;

/** Arc Relay level. x and y are the center of each object. */
export const ARC_LEVEL = {
  width: 2400,
  spawn: { x: 80, y: 470 },
  ground: [
    { x: 210, y: 520, w: 420, h: 40 },
    { x: 940, y: 520, w: 360, h: 40 },
    { x: 1610, y: 520, w: 300, h: 40 },
    { x: 2270, y: 520, w: 260, h: 40 },
  ] as Rect[],
  pits: [
    { from: 420, to: 760 },
    { from: 1120, to: 1460 },
    { from: 1760, to: 2140 },
  ],
  traps: [
    { x: 940, y: 488, w: 40, h: 24 },
    { x: 1610, y: 488, w: 40, h: 24 },
  ] as Rect[],
  pylons: [
    { id: 0, x: 590, y: 330 },
    { id: 1, x: 940, y: 300 },
    { id: 2, x: 1290, y: 320 },
    { id: 3, x: 1610, y: 300 },
    { id: 4, x: 1950, y: 330 },
  ],
};
