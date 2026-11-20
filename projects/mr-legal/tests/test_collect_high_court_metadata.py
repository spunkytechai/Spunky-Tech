import importlib.util
import unittest
from pathlib import Path

SCRIPT = Path(__file__).parents[1] / "scripts" / "collect-high-court-metadata.py"
spec = importlib.util.spec_from_file_location("collect_high_court_metadata", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class HighCourtCollectorTests(unittest.TestCase):
    def test_builds_selective_year_and_court_sync_command(self):
        command = module.build_sync_command(2024, "27_1", Path("data/raw/high-courts"))
        self.assertEqual(command[0:3], ["aws", "s3", "sync"])
        self.assertIn("s3://indian-high-court-judgments/metadata/parquet/year=2024/", command)
        self.assertIn("court=27_1/bench=*/metadata.parquet", command)
        self.assertIn("--no-sign-request", command)

    def test_defaults_to_all_courts_for_selected_year(self):
        command = module.build_sync_command(2025, None, Path("out"))
        self.assertIn("court=*/bench=*/metadata.parquet", command)

    def test_rejects_invalid_year(self):
        with self.assertRaises(ValueError):
            module.build_sync_command(1949, None, Path("out"))

    def test_rejects_malformed_court_code(self):
        with self.assertRaises(ValueError):
            module.build_sync_command(2025, "27/1", Path("out"))


if __name__ == "__main__":
    unittest.main()
