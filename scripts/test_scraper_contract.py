#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import io
import json
import os
import sys
import tempfile
import types
import unittest
from contextlib import redirect_stdout
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

    def test_quality_gate_accepts_specific_agent_security_incident(self) -> None:
        candidate = scraper_mod.Candidate(
            source="GitHub Security Advisory Database",
            url="https://github.com/advisories/GHSA-test-agent",
            headline="CVE-2026-9999: Agent tool leaks secrets through prompt injection",
            summary="A confirmed vulnerability in a named AI agent allowed attackers to exfiltrate secrets through an indirect prompt injection and tool call.",
            date="2026-05-02",
        )
        incident = scraper_mod.Incident(
            id="auto-quality",
            date=candidate.date,
            source=candidate.source,
            url=candidate.url,
            headline=candidate.headline,
            summary=candidate.summary,
            severity="critical",
            threats=["prompt-injection", "data-exfiltration"],
            preventionNote="This would have been prevented or limited by treating retrieved content as untrusted input and blocking autonomous outbound disclosure paths.",
            vendor="Example Agent",
        )

        decision = scraper_mod.assess_quality(candidate, incident, [], [])

        self.assertTrue(decision.accepted)
        self.assertEqual(decision.reasons, [])
        self.assertGreaterEqual(decision.relevanceScore, 70)
        self.assertGreaterEqual(decision.confidenceScore, 65)
        self.assertGreaterEqual(decision.sourceQualityScore, 45)

    def test_quality_gate_rejects_vague_ai_news(self) -> None:
        candidate = scraper_mod.Candidate(
            source="OpenAI blog",
            url="https://example.com/new-assistant",
            headline="OpenAI announces a faster AI assistant for enterprises",
            summary="The company introduced a faster assistant with improved reasoning and a broader product roadmap.",
            date="2026-05-02",
        )
        incident = scraper_mod.Incident(
            id="auto-vague",
            date=candidate.date,
            source=candidate.source,
            url=candidate.url,
            headline=candidate.headline,
            summary=candidate.summary,
            severity="low",
            threats=["hallucination-and-reliability"],
            preventionNote="This would have been prevented or limited by validation controls.",
            vendor="OpenAI",
        )

        decision = scraper_mod.assess_quality(candidate, incident, [], [])

        self.assertFalse(decision.accepted)
        self.assertIn("vague_ai_news", decision.reasons)
        self.assertIn("low_relevance", decision.reasons)

    def test_quality_gate_rejects_duplicate_headline(self) -> None:
        candidate = scraper_mod.Candidate(
            source="The Hacker News",
            url="https://example.com/duplicate-story",
            headline="Agent deleted production database during autonomous run",
            summary="A named AI agent deleted a production database during an autonomous run.",
            date="2026-05-02",
        )
        incident = scraper_mod.Incident(
            id="auto-duplicate",
            date=candidate.date,
            source=candidate.source,
            url=candidate.url,
            headline=candidate.headline,
            summary=candidate.summary,
            severity="critical",
            threats=["excessive-agency"],
            preventionNote="This would have been prevented or limited by human approval for destructive database operations.",
            vendor="Example Agent",
        )
        existing = [
            scraper_mod.Incident(
                id="auto-existing",
                date="2026-05-01",
                source="Another source",
                url="https://example.com/original-story",
                headline="Agent deleted production database during autonomous run",
                summary="A named AI agent deleted a production database during an autonomous run.",
                severity="critical",
                threats=["excessive-agency"],
                preventionNote="This would have been prevented or limited by human approval for destructive database operations.",
                vendor="Example Agent",
            )
        ]

        decision = scraper_mod.assess_quality(candidate, incident, existing, [])

        self.assertFalse(decision.accepted)
        self.assertIn("duplicate", decision.reasons)

    def test_write_rejections_records_separate_json_file(self) -> None:
        original_rejected = scraper_mod.REJECTED_FILE
        with tempfile.TemporaryDirectory() as tmp:
            rejected_file = Path(tmp) / "rejected-candidates.json"
            scraper_mod.REJECTED_FILE = rejected_file
            try:
                rejection = scraper_mod.RejectedCandidate(
                    id="reject-test",
                    rejectedAt="2026-05-02T00:00:00+00:00",
                    date="2026-05-02",
                    source="OpenAI blog",
                    url="https://example.com/new-assistant",
                    headline="OpenAI announces a faster AI assistant",
                    summary="A product announcement.",
                    model="stepfun-ai/step-3.5-flash",
                    reasons=["vague_ai_news"],
                    relevanceScore=20,
                    confidenceScore=50,
                    sourceQualityScore=70,
                    severity="low",
                    threats=["hallucination-and-reliability"],
                    vendor="OpenAI",
                )

                self.assertTrue(scraper_mod.write_rejections([rejection]))
                records = json.loads(rejected_file.read_text(encoding="utf-8"))

                self.assertEqual(records[0]["url"], "https://example.com/new-assistant")
                self.assertEqual(records[0]["reasons"], ["vague_ai_news"])
                self.assertEqual(records[0]["model"], "stepfun-ai/step-3.5-flash")
            finally:
                scraper_mod.REJECTED_FILE = original_rejected

    def test_run_summary_reports_model_and_rejection_reasons(self) -> None:
        rejection = scraper_mod.RejectedCandidate(
            id="reject-test",
            rejectedAt="2026-05-02T00:00:00+00:00",
            date="2026-05-02",
            source="OpenAI blog",
            url="https://example.com/new-assistant",
            headline="OpenAI announces a faster AI assistant",
            summary="A product announcement.",
            model="test-model",
            reasons=["vague_ai_news", "low_relevance"],
            relevanceScore=20,
            confidenceScore=50,
            sourceQualityScore=70,
            severity="low",
            threats=["hallucination-and-reliability"],
            vendor="OpenAI",
        )
        out = io.StringIO()

        with patch.dict(os.environ, {"NVIDIA_MODEL": "test-model"}):
            with redirect_stdout(out):
                scraper_mod.print_run_summary(
                    total_candidates=12,
                    queued_candidates=4,
                    accepted_count=1,
                    rejections=[rejection],
                    failures=[("Example feed", "timeout")],
                )

        text = out.getvalue()
        self.assertIn("Run summary", text)
        self.assertIn("Model:            test-model", text)
        self.assertIn("Accepted:         1", text)
        self.assertIn("Rejected:         1", text)
        self.assertIn("vague_ai_news: 1", text)


if __name__ == "__main__":
    unittest.main()
