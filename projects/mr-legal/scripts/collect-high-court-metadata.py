#!/usr/bin/env python3
"""Selectively sync structured High Court judgment metadata from AWS Open Data.

Only Parquet metadata is collected. Judgment PDFs and raw per-record JSON are not
mirrored. The dataset registry reports CC BY 4.0; retain attribution and verify
current terms before redistribution.
"""
import argparse
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

BUCKET = "s3://indian-high-court-judgments"
SOURCE = "https://github.com/vanga/indian-high-court-judgments"
REGISTRY = "https://registry.opendata.aws/indian-high-court-judgments/"


def build_sync_command(year: int, court: str | None, out: Path) -> list[str]:
    if year < 1950 or year > datetime.now().year:
        raise ValueError(f"Unsupported year: {year}")
    if court is not None and not re.fullmatch(r"\d+_\d+", court):
        raise ValueError("Court code must use STATE_COURT format, e.g. 27_1")

    pattern = f"court={court}/bench=*/metadata.parquet" if court else "court=*/bench=*/metadata.parquet"
    destination = out / f"year={year}"
    return [
        "aws", "s3", "sync",
        f"{BUCKET}/metadata/parquet/year={year}/",
        str(destination),
        "--exclude", "*",
        "--include", pattern,
        "--no-sign-request",
    ]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--year", type=int, action="append", help="Year to collect; repeatable. Defaults to 2025.")
    parser.add_argument("--court", help="Optional court code in STATE_COURT format, e.g. 27_1 (Bombay)")
    parser.add_argument("--out", default="data/raw/high-courts")
    parser.add_argument("--dry-run", action="store_true", help="Print planned AWS CLI commands without running them")
    args = parser.parse_args()

    years = sorted(set(args.year or [2025]))
    out = Path(args.out)
    manifest = {
        "dataset": "Indian High Court Judgments",
        "source": SOURCE,
        "registry": REGISTRY,
        "license_reported": "CC-BY-4.0",
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "scope": "structured_parquet_metadata_only",
        "court_filter": args.court,
        "years": [],
        "execution": "dry_run" if args.dry_run else "sync_requested",
    }

    for year in years:
        command = build_sync_command(year, args.court, out)
        item = {"year": year, "destination": str(out / f"year={year}"), "command": command}
        if not args.dry_run:
            subprocess.run(command, check=True)
            destination = Path(item["destination"])
            item["parquet_files"] = sorted(str(path) for path in destination.rglob("*.parquet")) if destination.exists() else []
            item["file_count"] = len(item["parquet_files"])
        manifest["years"].append(item)

    out.mkdir(parents=True, exist_ok=True)
    manifest_path = out / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
