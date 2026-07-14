#!/usr/bin/env python3
"""
Create doubled-column attack sprites.

Input:
    battle/attacks/81.png
    battle/attacks/82.png
    ...
    battle/attacks/145.png

Output:
    battle/attacks/146.png = 81.png stacked twice vertically
    battle/attacks/147.png = 82.png stacked twice vertically
    ...
    battle/attacks/210.png = 145.png stacked twice vertically
"""

from pathlib import Path
from PIL import Image


INPUT_START = 81
INPUT_END = 145

OUTPUT_START = 146

EXPECTED_WIDTH = 34
EXPECTED_HEIGHT = 44


def make_double_column(input_path: Path, output_path: Path) -> None:
    with Image.open(input_path) as img:
        img = img.convert("RGBA")

        if img.size != (EXPECTED_WIDTH, EXPECTED_HEIGHT):
            print(
                f"Warning: {input_path.name} is {img.size}, "
                f"expected {(EXPECTED_WIDTH, EXPECTED_HEIGHT)}"
            )

        output = Image.new(
            "RGBA",
            (img.width, img.height * 2),
            (0, 0, 0, 0),
        )

        output.paste(img, (0, 0))
        output.paste(img, (0, img.height))

        output.save(output_path)


def main() -> None:
    attacks_dir = Path("battle/attacks")

    if not attacks_dir.exists():
        raise FileNotFoundError(f"Folder not found: {attacks_dir}")

    for input_index in range(INPUT_START, INPUT_END + 1):
        output_index = OUTPUT_START + (input_index - INPUT_START)

        input_path = attacks_dir / f"{input_index}.png"
        output_path = attacks_dir / f"{output_index}.png"

        if not input_path.exists():
            print(f"Skipping missing file: {input_path}")
            continue

        make_double_column(input_path, output_path)
        print(f"Created {output_path.name} from {input_path.name}")

    print("Done.")


if __name__ == "__main__":
    main()