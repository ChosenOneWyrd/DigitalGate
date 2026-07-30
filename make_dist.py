#!/usr/bin/env python3
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"

PUBLIC_ITEMS = [
    "battle",
    "digimon",
    "digivices",
    "js",
    "maps",
    "sounds",
    "tamers",
    "analyzer1.mp4",
    "assets_manifest.json",
    "digimon_digital_gate.mp4",
    "digimon_digital_gate.png",
    "index.html",
    "style.css",
    "_headers",
    "_redirects",
    "sitemap.xml",
    "robots.txt",
]

def copy_item(name: str) -> None:
    src = ROOT / name
    dst = DIST / name

    if not src.exists():
        print(f"Skipping missing: {name}")
        return

    if src.is_dir():
        shutil.copytree(src, dst, dirs_exist_ok=True)
    else:
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)

def main() -> None:
    if DIST.exists():
        shutil.rmtree(DIST)

    DIST.mkdir(parents=True, exist_ok=True)

    for item in PUBLIC_ITEMS:
        copy_item(item)

    print(f"Built {DIST}")

if __name__ == "__main__":
    main()