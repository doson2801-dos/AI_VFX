#!/usr/bin/env python3
"""Mirror each frame slot of a horizontal strip in place, preserving frame order."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageOps


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--frames", required=True, type=int)
    args = parser.parse_args()
    if args.frames < 1:
        raise SystemExit("--frames must be at least 1")

    with Image.open(args.input) as opened:
        strip = opened.convert("RGBA")

    output = Image.new("RGBA", strip.size)
    slot_width = strip.width / args.frames
    for index in range(args.frames):
        left = round(index * slot_width)
        right = round((index + 1) * slot_width)
        slot = strip.crop((left, 0, right, strip.height))
        output.paste(ImageOps.mirror(slot), (left, 0))

    target = Path(args.output)
    target.parent.mkdir(parents=True, exist_ok=True)
    output.save(target)


if __name__ == "__main__":
    main()
