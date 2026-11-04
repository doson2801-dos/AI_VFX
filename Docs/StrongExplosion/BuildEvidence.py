"""Package actual Unity capture frames; does not generate or edit runtime textures."""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent / 'Validation'
paths = sorted((root / 'Frames').glob('*.png'))
frames = []
for index, path in enumerate(paths):
    # Select 15 frames per second from the 30 fps capture sequence.
    if index % 2:
        continue
    frame = Image.open(path).convert('RGB')
    frame.thumbnail((720, 480))
    frames.append(frame)
if not frames:
    raise RuntimeError('No actual Unity frames were found')
frames[0].save(root / 'StrongExplosion_Playback.gif', save_all=True,
               append_images=frames[1:], duration=67, loop=0, optimize=False)
samples = [2, 6, 18, 48, 96, 144]
board = Image.new('RGB', (960, 680), (24, 26, 31))
draw = ImageDraw.Draw(board)
for cell, number in enumerate(samples):
    frame = Image.open(root / 'Frames' / f'{number:03d}.png').convert('RGB')
    frame.thumbnail((480, 320))
    x, y = (cell % 2) * 480, (cell // 2) * 226
    frame.thumbnail((480, 206))
    board.paste(frame, (x + (480-frame.width)//2, y))
    draw.text((x+12, y+207), f'Capture tick {number}/60 s (nominal)', fill=(235,235,235))
board.save(root / 'StrongExplosion_ContactSheet.png')
print(f'{len(paths)} Unity frames, {len(frames)} playback frames')
