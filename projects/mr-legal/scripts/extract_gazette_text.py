#!/usr/bin/env python3
"""Extract searchable text from captured Gazette PDFs without asserting legal effect."""
import argparse
import hashlib
import json
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path


def run_command(command):
    return subprocess.run(command, check=True, capture_output=True, text=True)


def extract_one(pdf_path: Path, output_dir: Path, ocr: str = "auto", language: str = "eng", min_chars: int = 80, max_pages: int = 100):
    raw = pdf_path.read_bytes()
    if not raw.startswith(b"%PDF-"):
        raise ValueError(f"Not a PDF file: {pdf_path.name}")
    digest = hashlib.sha256(raw).hexdigest()
    output_dir.mkdir(parents=True, exist_ok=True)
    text_path = output_dir / f"{pdf_path.stem}.txt"
    metadata_path = output_dir / f"{pdf_path.stem}.extraction.json"
    text, method, status, errors = "", "none", "tool_missing", []

    if ocr != "always" and shutil.which("pdftotext"):
        try:
            text = run_command(["pdftotext", "-layout", "-enc", "UTF-8", str(pdf_path), "-"]).stdout
            if len(text.strip()) >= min_chars:
                method, status = "pdftotext", "text_extracted_pending_review"
            else:
                status = "scanned_or_sparse_text_review_required"
        except (subprocess.CalledProcessError, OSError) as exc:
            errors.append(f"pdftotext: {exc}")
            status = "extraction_error"
    elif ocr != "always":
        errors.append("pdftotext executable not found")

    needs_ocr = ocr == "always" or (ocr == "auto" and len(text.strip()) < min_chars)
    if needs_ocr and all(shutil.which(tool) for tool in ("pdfinfo", "pdftoppm", "tesseract")):
        try:
            with tempfile.TemporaryDirectory(prefix="mrlegal-ocr-") as temp_dir:
                info = run_command(["pdfinfo", str(pdf_path)]).stdout
                page_count = next((int(line.split(":", 1)[1].strip()) for line in info.splitlines() if line.startswith("Pages:")), None)
                if page_count is None:
                    raise ValueError("pdfinfo did not report a page count; refusing partial OCR")
                if page_count > max_pages:
                    raise ValueError(f"PDF has {page_count} pages; configured OCR limit is {max_pages}")
                pages = []
                for page in range(1, page_count + 1):
                    prefix = Path(temp_dir) / f"page-{page:04d}"
                    run_command(["pdftoppm", "-f", str(page), "-l", str(page), "-r", "200", "-png", "-singlefile", str(pdf_path), str(prefix)])
                    pages.append(run_command(["tesseract", str(prefix.with_suffix('.png')), "stdout", "-l", language]).stdout)
                text = "\n\n".join(pages)
                method, status = "tesseract_ocr", "ocr_text_extracted_pending_review"
        except (subprocess.CalledProcessError, OSError, ValueError) as exc:
            errors.append(f"ocr: {exc}")
            status = "ocr_error"
    elif needs_ocr:
        errors.append("OCR requires pdfinfo, pdftoppm and tesseract executables")
        if status != "extraction_error":
            status = "ocr_tools_missing"

    text_path.write_text(text, encoding="utf-8")
    metadata = {
        "source_pdf": pdf_path.name, "source_sha256": digest, "text_file": text_path.name,
        "text_sha256": hashlib.sha256(text.encode("utf-8")).hexdigest(), "character_count": len(text),
        "extraction_method": method, "extraction_status": status,
        "captured_at": datetime.now(timezone.utc).isoformat(), "legal_effect_verified": False,
        "legal_review_required": True, "errors": errors,
    }
    metadata_path.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    return metadata


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-dir", required=True, type=Path)
    parser.add_argument("--output-dir", default=Path("data/processed/state-gazettes"), type=Path)
    parser.add_argument("--ocr", choices=("auto", "never", "always"), default="auto")
    parser.add_argument("--language", default="eng", help="Tesseract language code, e.g. eng or eng+hin")
    parser.add_argument("--min-chars", type=int, default=80)
    parser.add_argument("--max-pages", type=int, default=100)
    args = parser.parse_args()
    if args.min_chars < 1 or args.max_pages < 1:
        parser.error("--min-chars and --max-pages must be positive")
    pdfs = sorted(args.input_dir.glob("*.pdf"))
    results = [extract_one(path, args.output_dir, args.ocr, args.language, args.min_chars, args.max_pages) for path in pdfs]
    print(json.dumps({"processed_count": len(results), "text_extracted_count": sum(item["character_count"] > 0 for item in results), "results": results}, indent=2))


if __name__ == "__main__":
    main()
