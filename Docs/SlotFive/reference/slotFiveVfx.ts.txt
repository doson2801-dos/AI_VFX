/**
 * Slot Five VFX (brief v4.2, 4.12): the one manifest and its loader. Display only; the logic module never imports this.
 *
 * Every sheet is reached through SF_VFX_MANIFEST (key -> json path relative to the app base). Each json names its own
 * sheet files in `sheets`, so no file name is guessed. The single-file pack tool (tools/pack-single.mjs) reads this
 * manifest and provides every json and PNG inline through `globalThis.SF_VFX_EMBED`, keyed by the same paths.
 */
import Phaser from 'phaser';

export const SF_VFX_MANIFEST = {
  "sf_proj_fire": "vfx/sf-proj-fire/sf_proj_fire.json",
  "sf_proj_volt": "vfx/sf-proj-volt/sf_proj_volt.json",
  "sf_proj_frost": "vfx/sf-proj-frost/sf_proj_frost.json",
  "sf_proj_earth": "vfx/sf-proj-earth/sf_proj_earth.json",
  "sf_proj_blade": "vfx/sf-proj-blade/sf_proj_blade.json",
  "sf_proj_heal": "vfx/sf-proj-heal/sf_proj_heal.json",
  "sf_proj_shield": "vfx/sf-proj-shield/sf_proj_shield.json",
  "sf_hit_fire": "vfx/sf-hit-fire/sf_hit_fire.json",
  "sf_hit_volt": "vfx/sf-hit-volt/sf_hit_volt.json",
  "sf_hit_frost": "vfx/sf-hit-frost/sf_hit_frost.json",
  "sf_hit_earth": "vfx/sf-hit-earth/sf_hit_earth.json",
  "sf_hit_blade": "vfx/sf-hit-blade/sf_hit_blade.json",
  "sf_hit_heal": "vfx/sf-hit-heal/sf_hit_heal.json",
  "sf_hit_shield": "vfx/sf-hit-shield/sf_hit_shield.json",
  "sf_block": "vfx/sf-block/sf_block.json",
  "sf_chain_flash": "vfx/sf-chain-flash/sf_chain_flash.json",
} as const;

export type SfVfxKey = keyof typeof SF_VFX_MANIFEST;
export const SF_VFX_KEYS = Object.keys(SF_VFX_MANIFEST) as SfVfxKey[];

/** The fields of an artist json that playback needs. */
export interface SfVfxMeta {
  name: string;
  blend: 'add' | 'alpha';
  loop: boolean;
  fps: number;
  frames: number;
  cols: number;
  rows: number;
  size: [number, number];
  pivot: [number, number];
  sheets: string[];
}

/** One drawn layer of a key: a spritesheet texture, its animation and blend mode. */
export interface SfVfxLayer { texture: string; anim: string; blend: Phaser.BlendModes }
export interface LoadedSfVfx { key: SfVfxKey; meta: SfVfxMeta; layers: SfVfxLayer[] }

interface SfVfxEmbed { json: Record<string, SfVfxMeta>; images: Record<string, string> }
const embed = (globalThis as { SF_VFX_EMBED?: SfVfxEmbed }).SF_VFX_EMBED;

/** Textures and animations are game-wide, so what loaded once stays loaded across scene restarts. */
const loaded = new Map<SfVfxKey, LoadedSfVfx>();
let loading: Promise<void> | null = null;

const dirOf = (path: string) => path.slice(0, path.lastIndexOf('/') + 1);
const urlOf = (path: string) => embed?.images[path] ?? `${import.meta.env.BASE_URL}${path}`;

async function readMeta(path: string): Promise<SfVfxMeta> {
  const inline = embed?.json[path];
  if (inline) return inline;
  const response = await fetch(`${import.meta.env.BASE_URL}${path}`);
  if (!response.ok) throw new Error(`Slot Five VFX: ${path} answered ${response.status}`);
  return (await response.json()) as SfVfxMeta;
}

function readImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Slot Five VFX: image failed to load`));
    image.src = url;
  });
}

async function loadKey(game: Phaser.Game, key: SfVfxKey): Promise<void> {
  const jsonPath = SF_VFX_MANIFEST[key];
  const meta = await readMeta(jsonPath);
  const layers: SfVfxLayer[] = [];
  for (const [i, sheet] of meta.sheets.entries()) {
    const texture = i === 0 ? key : `${key}__${i}`;
    if (!game.textures.exists(texture)) {
      const image = await readImage(urlOf(`${dirOf(jsonPath)}${sheet}`));
      game.textures.addSpriteSheet(texture, image, {
        frameWidth: image.width / meta.cols,
        frameHeight: image.height / meta.rows,
        endFrame: meta.frames - 1,
      });
    }
    if (!game.anims.exists(texture)) {
      game.anims.create({
        key: texture,
        frames: game.anims.generateFrameNumbers(texture, { start: 0, end: meta.frames - 1 }),
        frameRate: meta.fps,
        repeat: meta.loop ? -1 : 0,
      });
    }
    // The first sheet uses the json blend ("alpha" is normal blending); extra sheets are light passes added on top.
    const additive = i === 0 ? meta.blend === 'add' : true;
    layers.push({ texture, anim: texture, blend: additive ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL });
  }
  loaded.set(key, { key, meta, layers });
}

/**
 * Loads every key once per page, in the background: the game never waits on it. A key that fails stays unloaded
 * and is simply not drawn.
 */
export function loadSlotFiveVfx(game: Phaser.Game): Promise<void> {
  loading ??= Promise.all(SF_VFX_KEYS.map((key) => loadKey(game, key).catch(() => undefined))).then(() => undefined);
  return loading;
}

export function getSlotFiveVfx(key: SfVfxKey): LoadedSfVfx | undefined {
  return loaded.get(key);
}

/** Loaded keys, sorted alphabetically (brief C12 vfxLoaded). */
export function loadedSlotFiveVfxKeys(): string[] {
  return [...loaded.keys()].sort();
}
