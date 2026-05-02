#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import os
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch

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

    def test_uses_nvidia_nim_by_default(self) -> None:
        self.assertEqual(scraper_mod.DEFAULT_NVIDIA_MODEL, "stepfun-ai/step-3.5-flash")
        self.assertEqual(
            scraper_mod.NVIDIA_CHAT_COMPLETIONS_URL,
            "https://integrate.api.nvidia.com/v1/chat/completions",
        )

    def test_nvidia_payload_is_openai_compatible(self) -> None:
        candidate = scraper_mod.Candidate(
            source="Unit test",
            url="https://example.com/incident",
            headline="Agentic AI incident",
            summary="A named agent took a risky autonomous action.",
            date="2026-05-02",
        )

        payload = scraper_mod._nvidia_payload(candidate, "System prompt")

        self.assertEqual(payload["model"], "stepfun-ai/step-3.5-flash")
        self.assertEqual(payload["temperature"], 0)
        self.assertEqual(payload["max_tokens"], 900)
        self.assertEqual(payload["messages"][0]["role"], "system")
        self.assertEqual(payload["messages"][1]["role"], "user")
        self.assertIn("Agentic AI incident", payload["messages"][1]["content"])

    def test_candidate_limit_defaults_to_production_budget(self) -> None:
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(scraper_mod._candidate_limit(None), 20)

    def test_candidate_limit_prefers_cli_over_environment(self) -> None:
        with patch.dict(os.environ, {"SCRAPER_LIMIT": "40"}):
            self.assertEqual(scraper_mod._candidate_limit(12), 12)

    def test_candidate_limit_uses_environment_override(self) -> None:
        with patch.dict(os.environ, {"SCRAPER_LIMIT": "35"}):
            self.assertEqual(scraper_mod._candidate_limit(None), 35)

    def test_candidate_limit_rejects_invalid_environment_override(self) -> None:
        with patch.dict(os.environ, {"SCRAPER_LIMIT": "zero"}):
            with self.assertRaises(SystemExit):
                scraper_mod._candidate_limit(None)

    def test_write_output_skips_file_when_no_new_incidents(self) -> None:
        original_output = scraper_mod.OUTPUT_FILE
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "incidents.ts"
            output.write_text("original", encoding="utf-8")
            scraper_mod.OUTPUT_FILE = output
            try:
                self.assertFalse(scraper_mod.write_output([], []))
                self.assertEqual(output.read_text(encoding="utf-8"), "original")
            finally:
                scraper_mod.OUTPUT_FILE = original_output


if __name__ == "__main__":
    unittest.main()
