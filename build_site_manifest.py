#!/usr/bin/env python3
"""
Build assets_manifest.json for the Digital Gate frontend.

Run this from the website folder whenever you add/remove maps, sprites, or BGM:
    python build_site_manifest.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "assets_manifest.json"

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
AUDIO_EXTS = {".wav", ".mp3", ".ogg", ".m4a", ".aac", ".webm", ".wavm"}

FOLDERS = ["maps", "digivices", "tamers", "digimon"]


def collect_images(folder_name: str) -> list[str]:
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


def collect_music() -> list[str]:
    folder = ROOT / "sounds"

    if not folder.exists():
        return []

    files: list[str] = []

    for path in sorted(folder.rglob("*"), key=lambda p: str(p).lower()):
        if (
            path.is_file()
            and path.suffix.lower() in AUDIO_EXTS
            and path.name.lower().startswith("bgm_")
            and not path.name.startswith("._")
        ):
            files.append(path.relative_to(ROOT).as_posix())

    return files


def main() -> None:
    manifest = {folder: collect_images(folder) for folder in FOLDERS}

    manifest["enemies"] = []
    manifest["sprites"] = []
    manifest["music"] = collect_music()

    OUT.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print(f"Wrote {OUT}")

    for key, value in manifest.items():
        print(f"{key}: {len(value)}")


if __name__ == "__main__":
    main()