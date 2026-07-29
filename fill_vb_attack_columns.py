#!/usr/bin/env python3
"""
Fill vb_data.csv col12/col13 using attack1 values from d3c_data.csv and dvc_data.csv.

Rules:
  - d3c_data.csv and dvc_data.csv use column: link
  - vb_data.csv uses matching column: col1
  - For matching VB rows:
      col12 = attack1 + 81
      col13 = attack1 + 146

By default, a VB row is updated when col1 matches a link in either d3c_data.csv or dvc_data.csv.
Use --require-both if you only want to update links that exist in both D3C and DVC.

Usage examples:
  # If this script is inside the same folder as the CSV files:
  python fill_vb_attack_columns.py

  # If your CSV files are inside a folder called battle:
  python fill_vb_attack_columns.py battle

  # Only update links that appear in both d3c_data.csv and dvc_data.csv:
  python fill_vb_attack_columns.py battle --require-both

  # Overwrite vb_data.csv directly instead of creating vb_data_updated.csv:
  python fill_vb_attack_columns.py battle --in-place
"""

from __future__ import annotations

import argparse
import csv
import shutil
from pathlib import Path
from typing import Dict, Iterable, Tuple


COL12_OFFSET = 81
COL13_OFFSET = 146


def read_csv_rows(path: Path) -> Tuple[list[str], list[dict[str, str]]]:
    """Read a CSV as dictionaries while preserving column order."""
    with path.open("r", newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            raise ValueError(f"{path} has no header row.")
        return list(reader.fieldnames), list(reader)


def require_columns(path: Path, fieldnames: Iterable[str], required: Iterable[str]) -> None:
    missing = [name for name in required if name not in fieldnames]
    if missing:
        raise ValueError(f"{path} is missing required column(s): {', '.join(missing)}")


def read_attack_map(path: Path) -> Dict[str, int]:
    """Read one source CSV as link -> attack1."""
    fieldnames, rows = read_csv_rows(path)
    require_columns(path, fieldnames, ["link", "attack1"])

    result: Dict[str, int] = {}

    for line_number, row in enumerate(rows, start=2):
        link = (row.get("link") or "").strip()
        attack1_text = (row.get("attack1") or "").strip()

        if not link:
            continue

        try:
            attack1 = int(attack1_text)
        except ValueError as exc:
            raise ValueError(
                f"{path}:{line_number} has a non-numeric attack1 value: {attack1_text!r}"
            ) from exc

        if link in result and result[link] != attack1:
            raise ValueError(
                f"Conflicting attack1 values inside {path} for link {link!r}: "
                f"existing={result[link]}, new={attack1} at line {line_number}"
            )

        result[link] = attack1

    return result


def build_attack_lookup(d3c_path: Path, dvc_path: Path, require_both: bool) -> Dict[str, int]:
    """
    Build link -> attack1 lookup from D3C and DVC.

    If a link appears in both files, the attack1 value must match.
    """
    d3c_map = read_attack_map(d3c_path)
    dvc_map = read_attack_map(dvc_path)

    if require_both:
        links = set(d3c_map) & set(dvc_map)
    else:
        links = set(d3c_map) | set(dvc_map)

    lookup: Dict[str, int] = {}

    for link in sorted(links):
        d3c_attack = d3c_map.get(link)
        dvc_attack = dvc_map.get(link)

        if d3c_attack is not None and dvc_attack is not None and d3c_attack != dvc_attack:
            raise ValueError(
                f"Conflicting attack1 values for link {link!r}: "
                f"d3c_data.csv={d3c_attack}, dvc_data.csv={dvc_attack}"
            )

        lookup[link] = d3c_attack if d3c_attack is not None else dvc_attack  # type: ignore[assignment]

    return lookup


def update_vb_data(vb_path: Path, output_path: Path, lookup: Dict[str, int]) -> int:
    """Update col12 and col13 in vb_data.csv and write the result."""
    fieldnames, rows = read_csv_rows(vb_path)
    require_columns(vb_path, fieldnames, ["col1", "col12", "col13"])

    updated_count = 0

    for row in rows:
        link = (row.get("col1") or "").strip()
        if link not in lookup:
            continue

        attack1 = lookup[link]
        row["col12"] = str(attack1 + COL12_OFFSET)
        row["col13"] = str(attack1 + COL12_OFFSET)
        updated_count += 1

    with output_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    return updated_count


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Fill vb_data.csv col12/col13 from d3c_data.csv and dvc_data.csv attack1 values."
    )
    parser.add_argument(
        "folder",
        nargs="?",
        default=".",
        help="Folder containing d3c_data.csv, dvc_data.csv, and vb_data.csv. Default: current folder.",
    )
    parser.add_argument(
        "--vb",
        default="vb_data.csv",
        help="VB CSV filename inside the folder. Default: vb_data.csv",
    )
    parser.add_argument(
        "--d3c",
        default="d3c_data.csv",
        help="D3C CSV filename inside the folder. Default: d3c_data.csv",
    )
    parser.add_argument(
        "--dvc",
        default="dvc_data.csv",
        help="DVC CSV filename inside the folder. Default: dvc_data.csv",
    )
    parser.add_argument(
        "-o",
        "--output",
        default="vb_data_updated.csv",
        help="Output filename inside the folder. Default: vb_data_updated.csv",
    )
    parser.add_argument(
        "--require-both",
        action="store_true",
        help="Only update VB rows whose col1 link exists in both d3c_data.csv and dvc_data.csv.",
    )
    parser.add_argument(
        "--in-place",
        action="store_true",
        help="Overwrite vb_data.csv directly. A .bak backup is created first.",
    )

    args = parser.parse_args()

    folder = Path(args.folder)
    d3c_path = folder / args.d3c
    dvc_path = folder / args.dvc
    vb_path = folder / args.vb

    for path in [d3c_path, dvc_path, vb_path]:
        if not path.exists():
            raise FileNotFoundError(f"Could not find: {path}")

    lookup = build_attack_lookup(d3c_path, dvc_path, args.require_both)

    if args.in_place:
        backup_path = vb_path.with_suffix(vb_path.suffix + ".bak")
        shutil.copy2(vb_path, backup_path)
        output_path = vb_path
    else:
        output_path = folder / args.output

    updated_count = update_vb_data(vb_path, output_path, lookup)

    mode = "links found in both D3C and DVC" if args.require_both else "links found in either D3C or DVC"
    print(f"Loaded {len(lookup)} {mode}.")
    print(f"Updated {updated_count} rows in {vb_path.name}.")
    print(f"Wrote: {output_path}")
    if args.in_place:
        print(f"Backup: {backup_path}")


if __name__ == "__main__":
    main()
