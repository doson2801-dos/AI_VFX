import Phaser from 'phaser';
import { LEVEL, TUNING, VIEW } from '../config';
import { addPlayerKeys, approach, readPlayerInput, type InputState, type PlayerKeys } from '../game/controls';

export type GameStatus = 'playing' | 'won' | 'lost';

export interface GameState {
  status: GameStatus;
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  coins: number;
  totalCoins: number;
  elapsedMs: number;
}

type ArcadeImage = Phaser.Types.Physics.Arcade.ImageWithDynamicBody;

export class GameScene extends Phaser.Scene {
  private player!: ArcadeImage;
  private keys!: PlayerKeys;
  private hud!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;

  private status: GameStatus = 'playing';
  private coins = 0;
  private elapsedMs = 0;
  private coyoteUntil = 0;
  private bufferUntil = 0;
  private jumpWasDown = false;
  private jumpCutAvailable = false;

  constructor() {
    super('game');
  }

  create(): void {
    this.status = 'playing';
    this.coins = 0;
    this.elapsedMs = 0;
    this.coyoteUntil = 0;
    this.bufferUntil = 0;
    this.jumpWasDown = false;
    this.jumpCutAvailable = false;

    this.makeTextures();
    this.cameras.main.setBackgroundColor('#1b1f3b');
    this.physics.world.setBounds(0, 0, LEVEL.width, VIEW.height + 200);
    this.physics.world.setBoundsCollision(true, true, false, false);

    const solids = this.physics.add.staticGroup();
    for (const r of LEVEL.ground) {
      const block = solids.create(r.x, r.y, 'pixel') as Phaser.Physics.Arcade.Sprite;
      block.setDisplaySize(r.w, r.h).setTint(0x3d4a7a).refreshBody();
    }

    const oneWay = this.physics.add.staticGroup();
    for (const r of LEVEL.oneWayPlatforms) {
      const block = oneWay.create(r.x, r.y, 'pixel') as Phaser.Physics.Arcade.Sprite;
      block.setDisplaySize(r.w, r.h).setTint(0x6c7fd1).refreshBody();
      const body = block.body as Phaser.Physics.Arcade.StaticBody;
      body.checkCollision.down = false;
      body.checkCollision.left = false;
      body.checkCollision.right = false;
    }

    const spikes = this.physics.add.staticGroup();
    for (const r of LEVEL.spikes) {
      const spike = spikes.create(r.x, r.y, 'spike') as Phaser.Physics.Arcade.Sprite;
      (spike.body as Phaser.Physics.Arcade.StaticBody).setSize(r.w - 8, r.h - 6);
    }

    const coins = this.physics.add.staticGroup();
    for (const c of LEVEL.coins) coins.create(c.x, c.y, 'coin');

    const goal = this.physics.add.staticImage(LEVEL.goal.x, LEVEL.goal.y, 'flag');

    this.player = this.physics.add.image(LEVEL.spawn.x, LEVEL.spawn.y, 'player') as ArcadeImage;
    this.player.setCollideWorldBounds(true);

    this.physics.add.collider(this.player, solids);
    this.physics.add.collider(this.player, oneWay);
    this.physics.add.overlap(this.player, spikes, () => this.finish('lost'));
    this.physics.add.overlap(this.player, coins, (_player, coin) => {
      (coin as Phaser.Physics.Arcade.Sprite).disableBody(true, true);
      this.coins += 1;
      this.updateHud();
    });
    this.physics.add.overlap(this.player, goal, () => {
      if (this.coins === LEVEL.coins.length) this.finish('won');
    });

    this.cameras.main.setBounds(0, 0, LEVEL.width, VIEW.height);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.keys = addPlayerKeys(this.input.keyboard!);

    this.hud = this.add.text(16, 14, '', { fontFamily: 'system-ui, sans-serif', fontSize: '22px', color: '#ffffff' })
      .setScrollFactor(0);
    this.banner = this.add.text(VIEW.width / 2, 170, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '38px', color: '#ffffff', align: 'center',
    }).setOrigin(0.5).setScrollFactor(0);
    this.updateHud();
  }

  update(time: number, delta: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.keys.r)) {
      this.scene.restart();
      return;
    }
    if (this.status !== 'playing') {
      if (this.readInput().jump && !this.jumpWasDown) this.scene.restart();
      this.jumpWasDown = this.readInput().jump;
      return;
    }

    this.elapsedMs += delta;
    this.physics.world.gravity.y = TUNING.gravity;

    const input = this.readInput();
    const body = this.player.body;
    const grounded = body.blocked.down;
    const dt = delta / 1000;

    const direction = Number(input.right) - Number(input.left);
    const accel = TUNING.acceleration * (grounded ? 1 : TUNING.airControl);
    body.setVelocityX(approach(body.velocity.x, direction * TUNING.moveSpeed, accel * dt));

    if (grounded) {
      this.coyoteUntil = time + TUNING.coyoteMs;
      this.jumpCutAvailable = false;
    }
    if (input.jump && !this.jumpWasDown) this.bufferUntil = time + TUNING.jumpBufferMs;

    if (time <= this.bufferUntil && time <= this.coyoteUntil) {
      body.setVelocityY(-TUNING.jumpVelocity);
      this.bufferUntil = 0;
      this.coyoteUntil = 0;
      this.jumpCutAvailable = true;
    } else if (!input.jump && this.jumpCutAvailable && body.velocity.y < 0) {
      body.setVelocityY(body.velocity.y * TUNING.jumpCutMultiplier);
      this.jumpCutAvailable = false;
    }
    this.jumpWasDown = input.jump;

    if (this.player.y > VIEW.height + 60) this.finish('lost');
  }

  getState(): GameState {
    const body = this.player.body;
    return {
      status: this.status,
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
      vx: Math.round(body.velocity.x),
      vy: Math.round(body.velocity.y),
      grounded: body.blocked.down,
      coins: this.coins,
      totalCoins: LEVEL.coins.length,
      elapsedMs: Math.round(this.elapsedMs),
    };
  }

  teleport(x: number, y: number): void {
    this.player.body.reset(x, y);
  }

  private readInput(): InputState {
    return readPlayerInput(this.keys, () => this.getState());
  }

  private finish(status: 'won' | 'lost'): void {
    if (this.status !== 'playing') return;
    this.status = status;
    this.player.body.setVelocity(0, 0);
    this.player.body.setAllowGravity(false);
    this.player.setTint(status === 'won' ? 0x7dffa8 : 0xff6b6b);
    this.banner.setText(status === 'won' ? 'Hoàn thành!\nNhảy để chơi lại' : 'Thua rồi!\nNhảy để chơi lại');
  }

  private updateHud(): void {
    this.hud.setText(`Xu: ${this.coins}/${LEVEL.coins.length}`);
  }

  private makeTextures(): void {
    const make = (key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
      if (this.textures.exists(key)) return;
      const texture = this.textures.createCanvas(key, w, h)!;
      draw(texture.getContext());
      texture.refresh();
    };

    make('pixel', 4, 4, (c) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, 4, 4);
    });
    make('player', 32, 48, (c) => {
      c.fillStyle = '#ffb347';
      c.fillRect(0, 0, 32, 48);
      c.fillStyle = '#1b1f3b';
      c.fillRect(19, 12, 6, 8);
    });
    make('coin', 24, 24, (c) => {
      c.fillStyle = '#ffd93d';
      c.beginPath();
      c.arc(12, 12, 11, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#fff3b0';
      c.fillRect(10, 6, 4, 12);
    });
    make('spike', 40, 24, (c) => {
      c.fillStyle = '#ff5c7a';
      for (let i = 0; i < 2; i += 1) {
        c.beginPath();
        c.moveTo(i * 20, 24);
        c.lineTo(i * 20 + 10, 0);
        c.lineTo(i * 20 + 20, 24);
        c.fill();
      }
    });
    make('flag', 32, 100, (c) => {
      c.fillStyle = '#e8e8f0';
      c.fillRect(2, 0, 5, 100);
      c.fillStyle = '#4ade80';
      c.beginPath();
      c.moveTo(7, 3);
      c.lineTo(32, 16);
      c.lineTo(7, 30);
      c.fill();
    });
  }
}
