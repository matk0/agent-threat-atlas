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

    def test_uses_anthropic_by_default_and_keeps_nvidia_available(self) -> None:
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(scraper_mod._llm_provider(), "anthropic")
            self.assertEqual(scraper_mod._llm_model(), scraper_mod.DEFAULT_ANTHROPIC_MODEL)
            self.assertEqual(scraper_mod.DEFAULT_ANTHROPIC_MODEL, "claude-3-5-haiku-20241022")

        self.assertEqual(
            scraper_mod.ANTHROPIC_MESSAGES_URL,
            "https://api.anthropic.com/v1/messages",
        )
        self.assertEqual(scraper_mod.ANTHROPIC_VERSION, "2023-06-01")
        self.assertEqual(scraper_mod.DEFAULT_NVIDIA_MODEL, "stepfun-ai/step-3.5-flash")
        self.assertEqual(
            scraper_mod.NVIDIA_CHAT_COMPLETIONS_URL,
            "https://integrate.api.nvidia.com/v1/chat/completions",
        )

    def test_llm_provider_rejects_unknown_provider(self) -> None:
        with patch.dict(os.environ, {"LLM_PROVIDER": "unknown"}):
            with self.assertRaises(SystemExit):
                scraper_mod._llm_provider()

    def test_anthropic_payload_uses_structured_outputs(self) -> None:
        candidate = scraper_mod.Candidate(
            source="Unit test",
            url="https://example.com/incident",
            headline="Agentic AI incident",
            summary="A named agent took a risky autonomous action.",
            date="2026-05-02",
        )

        payload = scraper_mod._anthropic_payload(candidate, "System prompt")

        self.assertEqual(payload["model"], scraper_mod.DEFAULT_ANTHROPIC_MODEL)
        self.assertEqual(payload["temperature"], 0)
        self.assertEqual(payload["max_tokens"], 900)
        self.assertIn("System prompt", payload["system"])
        self.assertEqual(payload["messages"][0]["role"], "user")
        self.assertIn("Agentic AI incident", payload["messages"][0]["content"])

        schema = payload["output_config"]["format"]["schema"]
        self.assertEqual(payload["output_config"]["format"]["type"], "json_schema")
        self.assertFalse(schema["additionalProperties"])
        self.assertIn("decision", schema["required"])
        self.assertEqual(schema["properties"]["decision"]["enum"], ["keep", "skip"])
        self.assertIn("preventionNote", schema["properties"])

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

    def test_categorize_parses_anthropic_structured_response(self) -> None:
        candidate = scraper_mod.Candidate(
            source="GitHub Security Advisory Database",
            url="https://github.com/advisories/GHSA-agent-test",
            headline="MCP server leaks secrets through prompt injection",
            summary="A malicious prompt caused an MCP server to disclose credentials.",
            date="2026-05-02",
        )
        response = {
            "decision": "keep",
            "severity": "high",
            "threats": ["prompt-injection", "data-exfiltration"],
            "vendor": "Example MCP Server",
            "summary": "A malicious prompt caused an MCP server to disclose credentials.",
            "preventionNote": "This would have been prevented or limited by treating retrieved content as untrusted and blocking autonomous disclosure paths.",
        }

        with patch.dict(os.environ, {"LLM_PROVIDER": "anthropic"}):
            with patch.object(
                scraper_mod,
                "_call_anthropic",
                return_value=json.dumps(response),
                create=True,
            ):
                incident = scraper_mod.categorize(candidate, "prompt")

        self.assertIsNotNone(incident)
        assert incident is not None
        self.assertEqual(incident.severity, "high")
        self.assertEqual(incident.threats, ["prompt-injection", "data-exfiltration"])
        self.assertEqual(incident.vendor, "Example MCP Server")

    def test_categorize_skips_anthropic_structured_skip(self) -> None:
        candidate = scraper_mod.Candidate(
            source="OpenAI blog",
            url="https://example.com/product-news",
            headline="OpenAI announces faster assistant",
            summary="A product announcement.",
            date="2026-05-02",
        )
        response = {
            "decision": "skip",
            "severity": "",
            "threats": [],
            "vendor": "",
            "summary": "",
            "preventionNote": "",
        }

        with patch.dict(os.environ, {"LLM_PROVIDER": "anthropic"}):
            with patch.object(
                scraper_mod,
                "_call_anthropic",
                return_value=json.dumps(response),
                create=True,
            ):
                self.assertIsNone(scraper_mod.categorize(candidate, "prompt"))

    def test_retryable_statuses_include_anthropic_overload(self) -> None:
        self.assertTrue(scraper_mod._is_retryable_status(429))
        self.assertTrue(scraper_mod._is_retryable_status(529))
        self.assertFalse(scraper_mod._is_retryable_status(401))

    def test_candidate_limit_defaults_to_production_budget(self) -> None:
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(scraper_mod._candidate_limit(None), 100)

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

    def test_scraper_writes_canonical_english_incidents(self) -> None:
        self.assertEqual(scraper_mod.OUTPUT_FILE.name, "incidents.en.ts")

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

    def test_quality_gate_rejects_generic_security_advisory_without_ai_system_signal(self) -> None:
        candidate = scraper_mod.Candidate(
            source="CISA alerts",
            url="https://www.cisa.gov/news-events/ics-advisories/icsa-26-120-04",
            headline="ABB Ability OPTIMAX",
            summary="CVE-2025-14510 allows authentication bypass on ABB Ability OPTIMAX installations using Azure Active Directory Single-Sign-On integration.",
            date="2026-04-30",
        )
        incident = scraper_mod.Incident(
            id="auto-generic-cisa",
            date=candidate.date,
            source=candidate.source,
            url=candidate.url,
            headline=candidate.headline,
            summary=candidate.summary,
            severity="high",
            threats=["identity-and-authorization"],
            preventionNote="This would have been prevented or limited by authorization controls.",
            vendor="ABB Ability OPTIMAX",
        )

        decision = scraper_mod.assess_quality(candidate, incident, [], [])

        self.assertFalse(decision.accepted)
        self.assertIn("low_relevance", decision.reasons)

    def test_quality_gate_rejects_non_ai_agent_advisory(self) -> None:
        candidate = scraper_mod.Candidate(
            source="GitHub Security Advisory Database",
            url="https://github.com/advisories/GHSA-rh99-wc69-c255",
            headline="Contras Affected by CopyFile Policy Subversion via Symlinks",
            summary="A policy verification flaw in Contrast's Kata agent allowed arbitrary writes to the guest filesystem via CopyFile requests.",
            date="2026-04-30",
        )
        incident = scraper_mod.Incident(
            id="auto-kata-agent",
            date=candidate.date,
            source=candidate.source,
            url=candidate.url,
            headline=candidate.headline,
            summary=candidate.summary,
            severity="critical",
            threats=["excessive-agency", "insecure-output-handling"],
            preventionNote="This would have been prevented or limited by least-privilege tools.",
            vendor="Contrast",
        )

        decision = scraper_mod.assess_quality(candidate, incident, [], [])

        self.assertFalse(decision.accepted)
        self.assertIn("low_relevance", decision.reasons)

    def test_quality_gate_accepts_agentic_ide_advisory(self) -> None:
        candidate = scraper_mod.Candidate(
            source="AWS security bulletins",
            url="https://aws.amazon.com/security/security-bulletins/rss/2026-009-aws/",
            headline="Arbitrary code execution via crafted project files in Kiro IDE",
            summary="Kiro is an AI-powered IDE for agentic software development. CVE-2026-4295 allowed arbitrary code execution when a user opened a malicious project directory.",
            date="2026-03-17",
        )
        incident = scraper_mod.Incident(
            id="auto-kiro",
            date=candidate.date,
            source=candidate.source,
            url=candidate.url,
            headline="Kiro IDE allowed arbitrary code execution via crafted project files",
            summary=candidate.summary,
            severity="critical",
            threats=["supply-chain", "insecure-output-handling", "excessive-agency"],
            preventionNote="This would have been prevented or limited by sandboxing project files and requiring explicit approval before trusted tool execution.",
            vendor="AWS Kiro",
        )

        decision = scraper_mod.assess_quality(candidate, incident, [], [])

        self.assertTrue(decision.accepted)
        self.assertEqual(decision.reasons, [])

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

    def test_candidate_queue_skips_previously_rejected_urls_and_cves(self) -> None:
        original_rejected = scraper_mod.REJECTED_FILE
        with tempfile.TemporaryDirectory() as tmp:
            rejected_file = Path(tmp) / "rejected-candidates.json"
            rejected_file.write_text(
                json.dumps(
                    [
                        {
                            "id": "reject-url",
                            "url": "https://example.com/rejected-url",
                            "headline": "OpenAI announces a faster assistant",
                            "summary": "A product announcement.",
                        },
                        {
                            "id": "reject-cve",
                            "url": "https://example.com/old-cve-story",
                            "headline": "CVE-2026-12345: Agent tool issue",
                            "summary": "A rejected advisory about CVE-2026-12345.",
                        },
                    ]
                ),
                encoding="utf-8",
            )
            scraper_mod.REJECTED_FILE = rejected_file
            try:
                candidates = [
                    scraper_mod.Candidate(
                        source="OpenAI blog",
                        url="https://example.com/rejected-url",
                        headline="OpenAI announces a faster assistant",
                        summary="A product announcement.",
                        date="2026-05-02",
                    ),
                    scraper_mod.Candidate(
                        source="GitHub Security Advisory Database",
                        url="https://example.com/new-cve-story",
                        headline="CVE-2026-12345: Agent tool issue",
                        summary="A duplicate candidate for CVE-2026-12345.",
                        date="2026-05-02",
                    ),
                    scraper_mod.Candidate(
                        source="GitHub Security Advisory Database",
                        url="https://example.com/new-agent-incident",
                        headline="CVE-2026-54321: Agent tool leaks secrets",
                        summary="A new candidate for CVE-2026-54321.",
                        date="2026-05-02",
                    ),
                ]

                with patch.object(scraper_mod, "_is_recent", return_value=True):
                    queue, skipped_processed = scraper_mod.build_candidate_queue(
                        candidates,
                        existing=[],
                        limit=10,
                    )

                self.assertEqual([c.url for c in queue], ["https://example.com/new-agent-incident"])
                self.assertEqual(skipped_processed, 2)
            finally:
                scraper_mod.REJECTED_FILE = original_rejected

    def test_candidate_queue_retries_transient_records_but_skips_review_records(self) -> None:
        original_rejected = scraper_mod.REJECTED_FILE
        with tempfile.TemporaryDirectory() as tmp:
            rejected_file = Path(tmp) / "rejected-candidates.json"
            rejected_file.write_text(
                json.dumps(
                    [
                        {
                            "id": "retryable",
                            "status": "transient_error",
                            "url": "https://example.com/retryable-agent",
                            "headline": "Claude Code MCP runner timed out",
                            "summary": "A classifier timeout happened.",
                        },
                        {
                            "id": "review",
                            "status": "needs_review",
                            "url": "https://example.com/manual-review-agent",
                            "headline": "Yuma AI leaked customer order data",
                            "summary": "A high-signal candidate awaits manual review.",
                        },
                    ]
                ),
                encoding="utf-8",
            )
            scraper_mod.REJECTED_FILE = rejected_file
            candidates = [
                scraper_mod.Candidate(
                    source="Tenable Security Research",
                    url="https://example.com/retryable-agent",
                    headline="Claude Code MCP runner timed out",
                    summary="A classifier timeout happened.",
                    date="2026-05-02",
                ),
                scraper_mod.Candidate(
                    source="Tenable Security Research",
                    url="https://example.com/manual-review-agent",
                    headline="Yuma AI leaked customer order data",
                    summary="A high-signal candidate awaits manual review.",
                    date="2026-05-02",
                ),
            ]

            try:
                with patch.object(scraper_mod, "_is_recent", return_value=True):
                    queue, skipped_processed = scraper_mod.build_candidate_queue(
                        candidates,
                        existing=[],
                        limit=10,
                    )

                self.assertEqual([c.url for c in queue], ["https://example.com/retryable-agent"])
                self.assertEqual(skipped_processed, 1)
            finally:
                scraper_mod.REJECTED_FILE = original_rejected

    def test_candidate_queue_backfill_only_allows_trusted_incident_sources(self) -> None:
        original_rejected = scraper_mod.REJECTED_FILE
        with tempfile.TemporaryDirectory() as tmp:
            scraper_mod.REJECTED_FILE = Path(tmp) / "rejected-candidates.json"
            candidates = [
                scraper_mod.Candidate(
                    source="AgentSecDB",
                    url="https://agentsecdb.com/incidents/claude-code-project-load-api-key-exfiltration/",
                    headline="Claude Code project-load API key exfiltration",
                    summary="Repository-controlled project loading exposed Anthropic API keys.",
                    date="2026-01-21",
                ),
                scraper_mod.Candidate(
                    source="OpenAI blog",
                    url="https://example.com/old-product-news",
                    headline="OpenAI announces an old agent launch",
                    summary="A product announcement about AI agents.",
                    date="2026-01-21",
                ),
            ]

            def fake_recent(_date: str, max_days: int = scraper_mod.MAX_ITEM_AGE_DAYS) -> bool:
                return max_days == 365

            try:
                with patch.object(scraper_mod, "_is_recent", side_effect=fake_recent):
                    queue, skipped_processed = scraper_mod.build_candidate_queue(
                        candidates,
                        existing=[],
                        limit=10,
                        backfill_days=365,
                    )

                self.assertEqual(skipped_processed, 0)
                self.assertEqual(
                    [candidate.url for candidate in queue],
                    ["https://agentsecdb.com/incidents/claude-code-project-load-api-key-exfiltration/"],
                )
            finally:
                scraper_mod.REJECTED_FILE = original_rejected

    def test_classification_retryable_error_is_deferred_not_rejected(self) -> None:
        candidate = scraper_mod.Candidate(
            source="Tenable Security Research",
            url="https://example.com/claude-code-action-runner",
            headline="Anthropic Claude Code Action Runner Arbitrary Code Execution via Malicious MCP Server Configuration",
            summary="A malicious MCP configuration can execute commands in a GitHub Actions runner.",
            date="2026-05-02",
        )

        with patch.object(
            scraper_mod,
            "categorize",
            side_effect=scraper_mod.RetryableClassificationError("read operation timed out"),
        ):
            with patch.object(scraper_mod.time, "sleep"):
                new, rejections, deferred = scraper_mod.classify_queue([candidate], [], "prompt")

        self.assertEqual(new, [])
        self.assertEqual(rejections, [])
        self.assertEqual(deferred, [candidate])

    def test_high_signal_model_skip_is_marked_needs_review(self) -> None:
        candidate = scraper_mod.Candidate(
            source="Tenable Security Research",
            url="https://www.tenable.com/security/research/tra-2026-35",
            headline="Yuma AI - Unauthenticated personal data and order information disclosure",
            summary="A chatbot integrated into e-commerce websites allowed unauthenticated users to retrieve customer order information and shipping addresses.",
            date="2026-04-23",
        )

        with patch.object(scraper_mod, "categorize", return_value=None):
            with patch.object(scraper_mod.time, "sleep"):
                new, rejections, deferred = scraper_mod.classify_queue([candidate], [], "prompt")

        self.assertEqual(new, [])
        self.assertEqual(deferred, [])
        self.assertEqual(len(rejections), 1)
        self.assertEqual(rejections[0].status, "needs_review")
        self.assertIn("not_confirmed_by_model", rejections[0].reasons)

    def test_candidate_queue_ranks_security_advisories_before_vendor_news(self) -> None:
        original_rejected = scraper_mod.REJECTED_FILE
        with tempfile.TemporaryDirectory() as tmp:
            scraper_mod.REJECTED_FILE = Path(tmp) / "rejected-candidates.json"
            candidates = [
                scraper_mod.Candidate(
                    source="OpenAI blog",
                    url=f"https://example.com/product-news-{i}",
                    headline=f"OpenAI announces faster agent platform {i}",
                    summary="A product announcement about improved AI assistant availability.",
                    date="2026-05-02",
                )
                for i in range(5)
            ]
            candidates.append(
                scraper_mod.Candidate(
                    source="GitHub Security Advisory Database",
                    url="https://github.com/advisories/GHSA-agent-critical",
                    headline="CVE-2026-7777: Agent MCP tool leaks secrets",
                    summary="A confirmed vulnerability in an AI agent MCP tool allowed prompt injection and credential exfiltration.",
                    date="2026-05-02",
                )
            )

            try:
                with patch.object(scraper_mod, "_is_recent", return_value=True):
                    queue, skipped_processed = scraper_mod.build_candidate_queue(
                        candidates,
                        existing=[],
                        limit=2,
                    )

                self.assertEqual(skipped_processed, 0)
                self.assertEqual(queue[0].source, "GitHub Security Advisory Database")
                self.assertIn("GHSA-agent-critical", queue[0].url)
            finally:
                scraper_mod.REJECTED_FILE = original_rejected

    def test_candidate_queue_limits_source_dominance(self) -> None:
        original_rejected = scraper_mod.REJECTED_FILE
        with tempfile.TemporaryDirectory() as tmp:
            scraper_mod.REJECTED_FILE = Path(tmp) / "rejected-candidates.json"
            candidates = [
                scraper_mod.Candidate(
                    source="GitHub Security Advisory Database",
                    url=f"https://github.com/advisories/GHSA-agent-{i}",
                    headline=f"CVE-2026-88{i:02d}: Agent tool leaks secrets",
                    summary="A confirmed vulnerability in an AI agent tool allowed credential exfiltration.",
                    date="2026-05-02",
                )
                for i in range(10)
            ]
            candidates.append(
                scraper_mod.Candidate(
                    source="AI Incident Database",
                    url="https://incidentdatabase.ai/cite/agent-incident",
                    headline="AI agent deleted production database during autonomous run",
                    summary="A confirmed AI agent incident caused destructive production data loss.",
                    date="2026-05-02",
                )
            )

            try:
                with patch.object(scraper_mod, "_is_recent", return_value=True):
                    queue, skipped_processed = scraper_mod.build_candidate_queue(
                        candidates,
                        existing=[],
                        limit=6,
                    )

                self.assertEqual(skipped_processed, 0)
                self.assertLessEqual(
                    sum(1 for candidate in queue if candidate.source == "GitHub Security Advisory Database"),
                    scraper_mod.MAX_CANDIDATES_PER_SOURCE,
                )
                self.assertIn("AI Incident Database", {candidate.source for candidate in queue})
            finally:
                scraper_mod.REJECTED_FILE = original_rejected

    def test_relative_html_links_are_resolved_against_source_base(self) -> None:
        self.assertEqual(
            scraper_mod._resolve_link(
                "incidents/claude-code-source-map-leak/index.html",
                "https://agentsecdb.com",
            ),
            "https://agentsecdb.com/incidents/claude-code-source-map-leak/index.html",
        )
        self.assertEqual(
            scraper_mod._resolve_link("/database/AVID-2026-R0001", "https://avidml.org"),
            "https://avidml.org/database/AVID-2026-R0001",
        )
        self.assertEqual(
            scraper_mod._resolve_link("https://example.com/item", "https://avidml.org"),
            "https://example.com/item",
        )

    def test_osv_package_source_builds_candidates_from_package_query(self) -> None:
        class FakeResponse:
            def __init__(self, data: dict) -> None:
                self._data = data

            def raise_for_status(self) -> None:
                return None

            def json(self) -> dict:
                return self._data

        class FakeClient:
            def __enter__(self) -> "FakeClient":
                return self

            def __exit__(self, *_args: object) -> None:
                return None

            def post(self, _url: str, json: dict) -> FakeResponse:
                self.query_payload = json
                return FakeResponse(
                    {
                        "results": [
                            {
                                "vulns": [
                                    {
                                        "id": "GHSA-agent-test",
                                        "modified": "2026-05-02T00:00:00Z",
                                    }
                                ]
                            }
                        ]
                    }
                )

            def get(self, url: str) -> FakeResponse:
                self.detail_url = url
                return FakeResponse(
                    {
                        "id": "GHSA-agent-test",
                        "aliases": ["CVE-2026-1234"],
                        "summary": "LangChain agent tool leaks secrets",
                        "details": "A LangChain AI agent tool could expose credentials through prompt injection.",
                        "published": "2026-05-01T00:00:00Z",
                        "affected": [
                            {"package": {"ecosystem": "PyPI", "name": "langchain"}}
                        ],
                    }
                )

        source = scraper_mod.Source(
            name="OSV.dev AI package vulnerabilities",
            type="osv_package",
            url="https://api.osv.dev/v1/querybatch?package=PyPI:langchain",
            category="vulnerability-db",
        )

        with patch.object(scraper_mod.httpx, "Client", return_value=FakeClient(), create=True):
            candidates = scraper_mod._fetch_osv_packages(source)

        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0].url, "https://osv.dev/vulnerability/GHSA-agent-test")
        self.assertIn("LangChain agent tool leaks secrets", candidates[0].headline)
        self.assertEqual(candidates[0].date, "2026-05-01")

    def test_source_registry_includes_high_signal_incident_sources(self) -> None:
        source_names = {source.name for source in scraper_mod.ALL_SOURCES}

        self.assertIn("AgentSecDB", source_names)
        self.assertIn("AVID database", source_names)
        self.assertIn("OSV.dev AI package vulnerabilities", source_names)
        self.assertIn("Aikido Security blog", source_names)
        self.assertIn("Tenable Security Research", source_names)

    def test_github_runner_blocked_sources_are_disabled(self) -> None:
        sources = {source.name: source for source in scraper_mod.ALL_SOURCES}

        self.assertFalse(sources["PromptArmor"].enabled)

    def test_source_health_report_summarizes_statuses(self) -> None:
        original_json = scraper_mod.SOURCE_HEALTH_JSON
        original_markdown = scraper_mod.SOURCE_HEALTH_MARKDOWN
        checked_at = "2026-05-03T10:00:00+00:00"

        with tempfile.TemporaryDirectory() as tmp:
            scraper_mod.SOURCE_HEALTH_JSON = Path(tmp) / "source-health.json"
            scraper_mod.SOURCE_HEALTH_MARKDOWN = Path(tmp) / "source-health.md"
            records = [
                scraper_mod.build_source_health_record(
                    scraper_mod.Source("Working feed", "rss", "https://example.com/feed", "press"),
                    checked_at,
                    elapsed_ms=120,
                    candidates=[
                        scraper_mod.Candidate(
                            source="Working feed",
                            url="https://example.com/item",
                            headline="Agent incident",
                            summary="A confirmed incident.",
                            date="2026-05-03",
                        )
                    ],
                ),
                scraper_mod.build_source_health_record(
                    scraper_mod.Source("Empty feed", "rss", "https://example.com/empty", "press"),
                    checked_at,
                    elapsed_ms=90,
                    candidates=[],
                ),
                scraper_mod.build_source_health_record(
                    scraper_mod.Source("Broken feed", "rss", "https://example.com/broken", "press"),
                    checked_at,
                    elapsed_ms=30,
                    error="timeout",
                ),
            ]

            try:
                scraper_mod.write_source_health(records)
                report = json.loads(scraper_mod.SOURCE_HEALTH_JSON.read_text(encoding="utf-8"))
                markdown = scraper_mod.SOURCE_HEALTH_MARKDOWN.read_text(encoding="utf-8")

                self.assertEqual(report["summary"]["ok"], 1)
                self.assertEqual(report["summary"]["empty"], 1)
                self.assertEqual(report["summary"]["failed"], 1)
                self.assertEqual(report["summary"]["candidateCount"], 1)
                self.assertIn("Broken feed", markdown)
                self.assertIn("timeout", markdown)
            finally:
                scraper_mod.SOURCE_HEALTH_JSON = original_json
                scraper_mod.SOURCE_HEALTH_MARKDOWN = original_markdown

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

        with patch.dict(os.environ, {"ANTHROPIC_MODEL": "test-model"}, clear=True):
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
