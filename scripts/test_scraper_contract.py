#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import sys
import types
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

for module_name in ("feedparser", "httpx"):
    if module_name not in sys.modules:
        sys.modules[module_name] = types.ModuleType(module_name)

if "bs4" not in sys.modules:
    bs4 = types.ModuleType("bs4")
    bs4.BeautifulSoup = object
    sys.modules["bs4"] = bs4

_spec = importlib.util.spec_from_file_location("scraper_mod", HERE / "example-scraper.py")
assert _spec and _spec.loader
scraper_mod = importlib.util.module_from_spec(_spec)
sys.modules["scraper_mod"] = scraper_mod
_spec.loader.exec_module(scraper_mod)  # type: ignore


class ScraperContractTest(unittest.TestCase):
    def test_prompt_requests_prevention_note(self) -> None:
        prompt = scraper_mod.load_prompt()

        self.assertIn("preventionNote", prompt)
        self.assertIn("would have prevented or limited", prompt)

    def test_output_includes_prevention_note(self) -> None:
        incident = scraper_mod.Incident(
            id="auto-test",
            date="2026-05-02",
            source="Unit test",
            url="https://example.com/incident",
            headline="Agent deleted production data",
            summary="A test agent deleted production data.",
            severity="critical",
            threats=["excessive-agency"],
        )

        entry = scraper_mod._format_entry(incident)

        self.assertIn('"preventionNote"', entry)
        self.assertIn("human approval", entry.lower())
        self.assertNotIn('"vendor": null', entry)


if __name__ == "__main__":
    unittest.main()
