#!/usr/bin/env python3
"""
Build assets_manifest.json for the Digital Gate frontend.

Run this from the website folder whenever you add/remove maps or sprites:
    python build_site_manifest.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "assets_manifest.json"

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}

# Real folders you actually use.
FOLDERS = ["maps", "digivices", "tamers", "digimon"]


def collect(folder_name: str) -> list[str]:
    folder = ROOT / folder_name

    if not folder.exists():
        return []

    files: list[str] = []

    for path in sorted(folder.rglob("*"), key=lambda p: str(p).lower()):
        if (
            path.is_file()
            and path.suffix.lower() in IMAGE_EXTS
            and not path.name.startswith("._")
        ):
            files.append(path.relative_to(ROOT).as_posix())

    return files


def main() -> None:
    manifest = {folder: collect(folder) for folder in FOLDERS}

    # Keep these keys for compatibility with older app.js versions.
    # Your current Enemy menu uses digimon/, not enemies/.
    manifest["enemies"] = []
    manifest["sprites"] = []

    OUT.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print(f"Wrote {OUT}")

    for key, value in manifest.items():
        print(f"{key}: {len(value)}")


if __name__ == "__main__":
    main()