import Phaser from 'phaser';
import { ARC_VFX, ARC_VFX_LOAD_TIMEOUT_MS } from '../config';

export type ArcVfxKey = keyof typeof ARC_VFX;

export const ARC_DEPTH = { vfx: 1, player: 2, ui: 3 };

const VFX_KEYS = Object.keys(ARC_VFX) as ArcVfxKey[];

/** Plays the Arc Relay flipbooks. Purely visual: a missing asset only means nothing is drawn. */
export class ArcVfx {
  private scene!: Phaser.Scene;
  private loadRequested = false;
  private plays: Record<ArcVfxKey, number> = { 'arc-bolt': 0, 'pylon-spark': 0 };

  /** Requests the sheets once per page, so a failed asset does not delay every restart. */
  preload(scene: Phaser.Scene): void {
    if (this.loadRequested) return;
    this.loadRequested = true;
    scene.load.maxRetries = 0;
    // Must be set per file: each File has its own `timeout: 0`, which overrides `load.xhr.timeout`.
    const xhrSettings = { timeout: ARC_VFX_LOAD_TIMEOUT_MS } as Phaser.Types.Loader.XHRSettingsObject;
    for (const key of VFX_KEYS) {
      const { path, frameWidth, frameHeight, frames } = ARC_VFX[key];
      scene.load.spritesheet(key, `${import.meta.env.BASE_URL}${path}`, {
        frameWidth,
        frameHeight,
        endFrame: frames - 1,
      }, xhrSettings);
    }
  }

  /** Call from `create()`. Sprites of the previous round are destroyed with the scene. */
  setup(scene: Phaser.Scene): void {
    this.scene = scene;
    this.plays = { 'arc-bolt': 0, 'pylon-spark': 0 };
    for (const key of VFX_KEYS) {
      if (scene.anims.exists(key) || !scene.textures.exists(key)) continue;
      const { frames, durationMs } = ARC_VFX[key];
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers(key, { start: 0, end: frames - 1 }),
        frameRate: (frames * 1000) / durationMs,
        repeat: 0,
      });
    }
  }

  registeredKeys(): string[] {
    return VFX_KEYS.filter((key) => this.scene.anims.exists(key));
  }

  playCounts(): Record<ArcVfxKey, number> {
    return { ...this.plays };
  }

  /** The bolt stays where it was fired and does not follow the player. */
  playBolt(from: Phaser.Types.Math.Vector2Like, to: Phaser.Types.Math.Vector2Like): void {
    const sprite = this.spawn('arc-bolt', from.x!, from.y!);
    if (!sprite) return;
    sprite.setRotation(Phaser.Math.Angle.BetweenPoints(from, to));
    sprite.setScale(Phaser.Math.Distance.BetweenPoints(from, to) / ARC_VFX['arc-bolt'].lengthPx, 1);
  }

  playSpark(x: number, y: number): void {
    this.spawn('pylon-spark', x, y);
  }

  private spawn(key: ArcVfxKey, x: number, y: number): Phaser.GameObjects.Sprite | null {
    if (!this.scene.anims.exists(key)) return null;
    const { originX, originY } = ARC_VFX[key];
    const sprite = this.scene.add.sprite(x, y, key)
      .setOrigin(originX, originY)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(ARC_DEPTH.vfx);
    // The last frame of arc-bolt still has an image, so the sprite must go when the clip ends.
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sprite.destroy());
    sprite.play(key);
    this.plays[key] += 1;
    return sprite;
  }
}
