import Phaser from 'phaser';
import { ARC_LEVEL, ARC_RUNTIME, TUNING, VIEW } from '../config';
import { ARC_DEPTH, ArcVfx } from '../game/arcVfx';
import {
  addPlayerKeys, approach, consumeTouchJumpPress, hasBot, hasInputOverride, onFreshKeyDown, readPlayerInput,
  type InputState, type PlayerKeys,
} from '../game/controls';
import type { GameStatus } from './GameScene';

export interface ArcPylonState {
  id: number;
  x: number;
  y: number;
  lit: boolean;
}

export type ArcLoseReason = 'pit' | 'trap' | 'timeout';

export interface ArcRelayState {
  gameId: 'arc-relay';
  status: GameStatus;
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  elapsedMs: number;
  timeLimitMs: number;
  timeLeftMs: number;
  pylonsLit: number;
  pylonsTotal: number;
  pylons: ArcPylonState[];
  arcTargetableId: number | null;
  arcing: boolean;
  arcTargetId: number | null;
  arcCount: number;
  loseReason: ArcLoseReason | null;
  restartLockLeftMs: number;
  vfxKeys: string[];
  vfxPlays: { 'arc-bolt': number; 'pylon-spark': number };
}

type ArcadeImage = Phaser.Types.Physics.Arcade.ImageWithDynamicBody;

const PYLON_TINT = { idle: 0x8892b0, targetable: 0xffe066, lit: 0x7df9ff };
const LOSE_TEXT: Record<ArcLoseReason, string> = {
  pit: 'Rơi xuống hố!',
  trap: 'Chạm bẫy!',
  timeout: 'Hết giờ!',
};

export class ArcRelayScene extends Phaser.Scene {
  private player!: ArcadeImage;
  private keys!: PlayerKeys;
  private hud!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private pylonImages: Phaser.GameObjects.Image[] = [];
  private readonly vfx = new ArcVfx();

  private status: GameStatus = 'playing';
  private loseReason: ArcLoseReason | null = null;
  private restartLockLeftMs = 0;
  private elapsedMs = 0;
  private coyoteLeftMs = 0;
  private bufferLeftMs = 0;
  private jumpWasDown = false;
  private jumpKeyPressed = false;
  private restartKeyPressed = false;
  private jumpCutAvailable = false;
  private litIds = new Set<number>();
  private arcTargetId: number | null = null;
  private arcVx = 0;
  private arcVy = 0;
  private arcDirectionX = 0;
  private arcCount = 0;

  constructor() {
    // Shares the key with GameScene: only one of them is registered per page load.
    super('game');
  }

  preload(): void {
    this.vfx.preload(this);
  }

  create(): void {
    this.vfx.setup(this);
    this.status = 'playing';
    this.loseReason = null;
    this.restartLockLeftMs = 0;
    this.elapsedMs = 0;
    this.coyoteLeftMs = 0;
    this.bufferLeftMs = 0;
    this.jumpCutAvailable = false;
    this.litIds = new Set();
    this.arcTargetId = null;
    this.arcVx = 0;
    this.arcVy = 0;
    this.arcDirectionX = 0;
    this.arcCount = 0;

    this.makeTextures();
    this.cameras.main.setBackgroundColor('#101529');
    this.physics.world.setBounds(0, 0, ARC_LEVEL.width, VIEW.height + 200);
    this.physics.world.setBoundsCollision(true, true, false, false);
    this.physics.world.gravity.y = TUNING.gravity;

    const solids = this.physics.add.staticGroup();
    for (const r of ARC_LEVEL.ground) {
      const block = solids.create(r.x, r.y, 'arc-pixel') as Phaser.Physics.Arcade.Sprite;
      block.setDisplaySize(r.w, r.h).setTint(0x34406e).refreshBody();
    }

    const traps = this.physics.add.staticGroup();
    for (const r of ARC_LEVEL.traps) traps.create(r.x, r.y, 'arc-trap');

    this.pylonImages = ARC_LEVEL.pylons.map((p) => {
      this.add.image(p.x, (p.y + VIEW.height) / 2, 'arc-pixel')
        .setDisplaySize(4, VIEW.height - p.y)
        .setTint(0x3a4470);
      return this.add.image(p.x, p.y, 'arc-pylon').setTint(PYLON_TINT.idle);
    });

    this.player = this.physics.add.image(ARC_LEVEL.spawn.x, ARC_LEVEL.spawn.y, 'arc-player') as ArcadeImage;
    this.player.setCollideWorldBounds(true).setDepth(ARC_DEPTH.player);
    this.physics.add.collider(this.player, solids);
    this.physics.add.overlap(this.player, traps, () => this.finish('lost', 'trap'));

    this.cameras.main.setBounds(0, 0, ARC_LEVEL.width, VIEW.height);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.keys = addPlayerKeys(this.input.keyboard!);
    this.jumpKeyPressed = false;
    this.restartKeyPressed = false;
    for (const key of [this.keys.up, this.keys.w, this.keys.space]) {
      onFreshKeyDown(key, () => {
        this.jumpKeyPressed = true;
      });
    }
    onFreshKeyDown(this.keys.r, () => {
      this.restartKeyPressed = true;
    });

    this.hud = this.add.text(16, 14, '', { fontFamily: 'system-ui, sans-serif', fontSize: '22px', color: '#ffffff' })
      .setScrollFactor(0).setDepth(ARC_DEPTH.ui);
    this.banner = this.add.text(VIEW.width / 2, 170, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '38px', color: '#ffffff', align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(ARC_DEPTH.ui);
    this.refreshView();

    // A jump held through a restart must not count as a new press.
    consumeTouchJumpPress();
    this.jumpWasDown = this.readInput().jump;
  }

  update(_time: number, delta: number): void {
    if (this.restartKeyPressed) {
      this.scene.restart();
      return;
    }
    // Phaser clamps `delta` to 16.6 ms for the first 120 frames after boot or refocus, so the
    // clock reads the unsmoothed frame time. Movement stays on `delta` to match Arcade physics.
    const clockStepMs = Math.min(this.game.loop.rawDelta, ARC_RUNTIME.maxClockStepMs);
    if (this.status !== 'playing') {
      this.stepEnded(clockStepMs);
      return;
    }

    this.elapsedMs += clockStepMs;
    this.physics.world.gravity.y = TUNING.gravity;

    const input = this.readInput();
    const pressed = this.readJumpPress(input);

    if (this.arcTargetId !== null) this.stepArc(delta);
    else this.stepMovement(input, pressed, delta);

    // Checked after the arc step so a pylon reached on the last frame is lit first.
    if (this.arcTargetId === null && this.player.y > VIEW.height + ARC_RUNTIME.pitFallMargin) {
      this.finish('lost', 'pit');
    }
    if (this.elapsedMs >= TUNING.arcTimeLimitMs) this.finish('lost', 'timeout');

    this.refreshView();
  }

  getState(): ArcRelayState {
    const body = this.player.body;
    const arcing = this.arcTargetId !== null;
    const elapsedMs = Math.round(this.elapsedMs);
    const timeLimitMs = TUNING.arcTimeLimitMs;
    return {
      gameId: 'arc-relay',
      status: this.status,
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
      vx: Math.round(arcing ? this.arcVx : body.velocity.x),
      vy: Math.round(arcing ? this.arcVy : body.velocity.y),
      grounded: !arcing && body.blocked.down,
      elapsedMs,
      timeLimitMs,
      timeLeftMs: Math.max(0, timeLimitMs - elapsedMs),
      pylonsLit: this.litIds.size,
      pylonsTotal: ARC_LEVEL.pylons.length,
      pylons: ARC_LEVEL.pylons.map((p) => ({ id: p.id, x: p.x, y: p.y, lit: this.litIds.has(p.id) })),
      arcTargetableId: this.findArcTarget(),
      arcing,
      arcTargetId: this.arcTargetId,
      arcCount: this.arcCount,
      loseReason: this.loseReason,
      // Rounded up so 0 always means the jump button can restart now.
      restartLockLeftMs: Math.ceil(this.restartLockLeftMs),
      vfxKeys: this.vfx.registeredKeys(),
      vfxPlays: this.vfx.playCounts(),
    };
  }

  teleport(x: number, y: number): void {
    const body = this.player.body;
    this.arcTargetId = null;
    this.arcVx = 0;
    this.arcVy = 0;
    this.coyoteLeftMs = 0;
    this.bufferLeftMs = 0;
    this.jumpCutAvailable = false;
    body.enable = true;
    body.reset(x, y);
    body.blocked.down = false;
  }

  private stepEnded(clockStepMs: number): void {
    this.restartLockLeftMs = Math.max(0, this.restartLockLeftMs - clockStepMs);

    // A bot plays one round: it is not polled after the end, so it can never skip the result.
    if (hasBot()) {
      this.readJumpPress({ left: false, right: false, jump: true });
      return;
    }
    if (this.readJumpPress(this.readInput()) && this.restartLockLeftMs === 0) this.scene.restart();
  }

  /** Overrides report a held state, so their press is an edge. Keys and touch report discrete presses. */
  private readJumpPress(input: InputState): boolean {
    const touchPressed = consumeTouchJumpPress();
    const realPress = this.jumpKeyPressed || touchPressed;
    this.jumpKeyPressed = false;
    const pressed = hasInputOverride() ? input.jump && !this.jumpWasDown : realPress;
    this.jumpWasDown = input.jump;
    return pressed;
  }

  private stepMovement(input: InputState, pressed: boolean, delta: number): void {
    const body = this.player.body;
    const grounded = body.blocked.down;
    const dt = delta / 1000;

    const direction = Number(input.right) - Number(input.left);
    const accel = TUNING.acceleration * (grounded ? 1 : TUNING.airControl);
    body.setVelocityX(approach(body.velocity.x, direction * TUNING.moveSpeed, accel * dt));

    this.coyoteLeftMs = grounded ? TUNING.coyoteMs : Math.max(0, this.coyoteLeftMs - delta);
    this.bufferLeftMs = pressed ? TUNING.jumpBufferMs : Math.max(0, this.bufferLeftMs - delta);
    if (grounded) this.jumpCutAvailable = false;

    if (this.bufferLeftMs > 0) {
      if (this.coyoteLeftMs > 0) {
        body.setVelocityY(-TUNING.jumpVelocity);
        this.bufferLeftMs = 0;
        this.coyoteLeftMs = 0;
        this.jumpCutAvailable = true;
        return;
      }
      const targetId = this.findArcTarget();
      if (targetId !== null) {
        this.startArc(targetId);
        return;
      }
    }

    if (!input.jump && this.jumpCutAvailable && body.velocity.y < 0) {
      body.setVelocityY(body.velocity.y * TUNING.jumpCutMultiplier);
      this.jumpCutAvailable = false;
    }
  }

  /** Nearest unlit pylon a jump press would arc to right now, or null. Ties go to the lower id. */
  private findArcTarget(): number | null {
    if (this.status !== 'playing' || this.arcTargetId !== null) return null;
    if (this.player.body.blocked.down || this.coyoteLeftMs > 0) return null;

    const maxDistanceSq = TUNING.arcRadius * TUNING.arcRadius;
    let bestId: number | null = null;
    let bestDistanceSq = Infinity;
    for (const p of ARC_LEVEL.pylons) {
      if (this.litIds.has(p.id)) continue;
      const distanceSq = Phaser.Math.Distance.BetweenPointsSquared(this.player, p);
      if (distanceSq > maxDistanceSq) continue;
      if (distanceSq < bestDistanceSq || (distanceSq === bestDistanceSq && p.id < bestId!)) {
        bestId = p.id;
        bestDistanceSq = distanceSq;
      }
    }
    return bestId;
  }

  private startArc(targetId: number): void {
    const target = ARC_LEVEL.pylons[targetId];
    const angle = Phaser.Math.Angle.BetweenPoints(this.player, target);
    this.arcTargetId = targetId;
    // Taken from the raw offset: cos(angle) is not exactly 0 for a vertical arc.
    this.arcDirectionX = Math.sign(target.x - this.player.x);
    this.arcVx = Math.cos(angle) * TUNING.arcSpeed;
    this.arcVy = Math.sin(angle) * TUNING.arcSpeed;
    this.arcCount += 1;
    this.vfx.playBolt(this.player, target);
    this.bufferLeftMs = 0;
    this.coyoteLeftMs = 0;
    this.jumpCutAvailable = false;
    // A disabled body ignores gravity, ground and traps while the scene moves the player directly.
    this.player.body.setVelocity(0, 0);
    this.player.body.enable = false;
  }

  private stepArc(delta: number): void {
    const target = ARC_LEVEL.pylons[this.arcTargetId!];
    const step = (TUNING.arcSpeed * delta) / 1000;
    const distance = Phaser.Math.Distance.BetweenPoints(this.player, target);

    if (distance > step) {
      const ratio = step / distance;
      this.player.setPosition(
        this.player.x + (target.x - this.player.x) * ratio,
        this.player.y + (target.y - this.player.y) * ratio,
      );
      return;
    }

    this.litIds.add(target.id);
    this.vfx.playSpark(target.x, target.y);
    this.arcTargetId = null;
    this.arcVx = 0;
    this.arcVy = 0;
    this.bufferLeftMs = 0;
    this.coyoteLeftMs = 0;
    this.jumpCutAvailable = false;
    const body = this.player.body;
    body.enable = true;
    body.reset(target.x, target.y);
    body.blocked.down = false;
    if (this.litIds.size === ARC_LEVEL.pylons.length) {
      this.finish('won', null);
      return;
    }
    body.setVelocity(this.arcDirectionX * TUNING.moveSpeed, -TUNING.arcExitJumpVelocity);
  }

  /** The only way a round ends, so the result is decided exactly once. */
  private finish(status: 'won' | 'lost', reason: ArcLoseReason | null): void {
    if (this.status !== 'playing') return;
    this.status = status;
    this.loseReason = reason;
    this.restartLockLeftMs = TUNING.arcRestartLockMs;

    const body = this.player.body;
    if (this.arcTargetId !== null) {
      this.arcTargetId = null;
      this.arcVx = 0;
      this.arcVy = 0;
      body.enable = true;
      body.reset(this.player.x, this.player.y);
    }
    body.setVelocity(0, 0);
    body.setAllowGravity(false);
    this.player.setTint(status === 'won' ? 0x7dffa8 : 0xff6b6b);

    const timeLeftMs = Math.max(0, TUNING.arcTimeLimitMs - this.elapsedMs);
    const result = reason ? LOSE_TEXT[reason] : `Hoàn thành! Còn ${(timeLeftMs / 1000).toFixed(1)}s`;
    this.banner.setText(`${result}\nNhảy để chơi lại`);
    this.refreshView();
  }

  private readInput(): InputState {
    return readPlayerInput(this.keys, () => this.getState());
  }

  private refreshView(): void {
    const targetableId = this.findArcTarget();
    ARC_LEVEL.pylons.forEach((p, index) => {
      const tint = this.litIds.has(p.id)
        ? PYLON_TINT.lit
        : p.id === targetableId ? PYLON_TINT.targetable : PYLON_TINT.idle;
      this.pylonImages[index].setTint(tint);
    });
    const timeLeftMs = Math.max(0, TUNING.arcTimeLimitMs - this.elapsedMs);
    this.hud.setText(`Cột: ${this.litIds.size}/${ARC_LEVEL.pylons.length}   Thời gian: ${(timeLeftMs / 1000).toFixed(1)}s`);
  }

  private makeTextures(): void {
    const make = (key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
      if (this.textures.exists(key)) return;
      const texture = this.textures.createCanvas(key, w, h)!;
      draw(texture.getContext());
      texture.refresh();
    };

    make('arc-pixel', 4, 4, (c) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, 4, 4);
    });
    make('arc-player', 28, 44, (c) => {
      c.fillStyle = '#7df9ff';
      c.beginPath();
      c.moveTo(17, 0);
      c.lineTo(3, 25);
      c.lineTo(13, 25);
      c.lineTo(9, 44);
      c.lineTo(26, 17);
      c.lineTo(15, 17);
      c.closePath();
      c.fill();
    });
    make('arc-pylon', 36, 36, (c) => {
      c.strokeStyle = '#ffffff';
      c.lineWidth = 4;
      c.beginPath();
      c.arc(18, 18, 15, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(18, 18, 7, 0, Math.PI * 2);
      c.fill();
    });
    make('arc-trap', 40, 24, (c) => {
      c.fillStyle = '#ff5c7a';
      for (let i = 0; i < 2; i += 1) {
        c.beginPath();
        c.moveTo(i * 20, 24);
        c.lineTo(i * 20 + 10, 0);
        c.lineTo(i * 20 + 20, 24);
        c.fill();
      }
    });
  }
}
