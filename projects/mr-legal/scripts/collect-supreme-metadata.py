#!/usr/bin/env python3
"""Download selected years of public Supreme Court metadata Parquet from AWS Open Data.
Requires AWS CLI v2. Metadata only; this does not download the judgment PDF archive.
"""
import argparse
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

BUCKET = "s3://indian-supreme-court-judgments"
SOURCE = "https://github.com/vanga/indian-supreme-court-judgments"

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", type=int, action="append", help="Year to collect; repeatable. Defaults to 2025.")
    parser.add_argument("--out", default="data/raw/supreme-court")
    args = parser.parse_args()
    years = args.year or [2025]
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    manifest = {"dataset": "Indian Supreme Court Judgments", "source": SOURCE,
                "license_reported": "CC-BY-4.0", "captured_at": datetime.now(timezone.utc).isoformat(),
                "years": [], "scope": "metadata_parquet_only"}
    for year in sorted(set(years)):
        if year < 1950 or year > datetime.now().year:
            raise SystemExit(f"Unsupported year: {year}")
        key = f"metadata/parquet/year={year}/metadata.parquet"
        destination = out / f"year={year}" / "metadata.parquet"
        destination.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(["aws", "s3", "cp", f"{BUCKET}/{key}", str(destination), "--no-sign-request"], check=True)
        manifest["years"].append({"year": year, "file": str(destination), "bytes": destination.stat().st_size})
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))

if __name__ == "__main__":
    main()
