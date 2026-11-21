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
};

export const VIEW = { width: 960, height: 540 };

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
