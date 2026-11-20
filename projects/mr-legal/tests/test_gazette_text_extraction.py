import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts.extract_gazette_text import extract_one


class GazetteTextExtractionTests(unittest.TestCase):
    def test_rejects_non_pdf_input(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / 'bad.pdf'
            source.write_bytes(b'<html>not a pdf</html>')
            with self.assertRaisesRegex(ValueError, 'Not a PDF'):
                extract_one(source, Path(temp) / 'out')

    def test_records_missing_tools_without_claiming_legal_verification(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / 'issue.pdf'
            source.write_bytes(b'%PDF-1.7\\nminimal fixture')
            with patch('scripts.extract_gazette_text.shutil.which', return_value=None):
                result = extract_one(source, Path(temp) / 'out', ocr='auto')
            self.assertEqual(result['extraction_status'], 'ocr_tools_missing')
            self.assertFalse(result['legal_effect_verified'])
            self.assertTrue(result['legal_review_required'])
            saved = json.loads((Path(temp) / 'out' / 'issue.extraction.json').read_text())
            self.assertEqual(saved['source_sha256'], result['source_sha256'])

    def test_extracts_text_layer_and_writes_checksum_metadata(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / 'issue.pdf'
            source.write_bytes(b'%PDF-1.7\\nminimal fixture')
            class Completed:
                stdout = 'Official Gazette text ' * 10
            with patch('scripts.extract_gazette_text.shutil.which', side_effect=lambda name: '/usr/bin/pdftotext' if name == 'pdftotext' else None), patch('scripts.extract_gazette_text.run_command', return_value=Completed()):
                result = extract_one(source, Path(temp) / 'out', ocr='never')
            self.assertEqual(result['extraction_method'], 'pdftotext')
            self.assertEqual(result['extraction_status'], 'text_extracted_pending_review')
            self.assertGreater(result['character_count'], 80)
            self.assertFalse(result['legal_effect_verified'])


if __name__ == '__main__':
    unittest.main()
