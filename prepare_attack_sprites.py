#!/usr/bin/env python3
"""
Convert battle/0.bmp, battle/1.bmp, ... into transparent PNG files.

Input:
  battle/0.bmp
  battle/1.bmp
  ...

Output:
  battle/attacks/0.png
  battle/attacks/1.png
  ...

Run:
  python prepare_attack_sprites.py
"""

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent
BATTLE_DIR = ROOT / "battle"
OUT_DIR = BATTLE_DIR / "attacks"

GREEN_R_MAX = 20
GREEN_G_MIN = 240
GREEN_B_MAX = 20


def is_green_pixel(r: int, g: int, b: int) -> bool:
    return r <= GREEN_R_MAX and g >= GREEN_G_MIN and b <= GREEN_B_MAX


def convert_one(src: Path, dst: Path) -> None:
    image = Image.open(src).convert("RGBA")
    pixels = image.load()

    width, height = image.size

    for y in range(height):
      for x in range(width):
          r, g, b, a = pixels[x, y]

          if is_green_pixel(r, g, b):
              pixels[x, y] = (r, g, b, 0)

    dst.parent.mkdir(parents=True, exist_ok=True)
    image.save(dst)


def main() -> None:
    if not BATTLE_DIR.exists():
        raise SystemExit("Missing battle/ folder.")

    bmp_files = sorted(
        BATTLE_DIR.glob("*.bmp"),
        key=lambda path: int(path.stem) if path.stem.isdigit() else 999999,
    )

    if not bmp_files:
        raise SystemExit("No battle/*.bmp files found.")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    converted = 0

    for src in bmp_files:
        if not src.stem.isdigit():
            continue

        dst = OUT_DIR / f"{src.stem}.png"
        convert_one(src, dst)
        converted += 1
        print(f"{src.relative_to(ROOT)} -> {dst.relative_to(ROOT)}")

    print(f"Converted {converted} attack sprite(s).")


if __name__ == "__main__":
    main()