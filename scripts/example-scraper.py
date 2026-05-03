#!/usr/bin/env python3
"""
example-scraper.py — Agent Threat Atlas daily incident scraper.

Pipeline:
  1. Iterate every enabled source in scripts/sources.py
  2. Dispatch to the right adapter (rss / atom / nvd_json / ghsa / aid_json / html)
  3. Normalize each candidate to a uniform shape
  4. Send each new candidate to the LLM categorizer (scripts/scraper-prompt.md)
  5. Keep only items that match a known threat slug
  6. Merge with existing entries in content/incidents.ts and rewrite the file

Modes:
  python scripts/example-scraper.py            full run; needs LLM_API_KEY
  python scripts/example-scraper.py --smoke    skip LLM; print fetch counts
  python scripts/example-scraper.py --limit 5  cap LLM calls (for tuning)
  python scripts/example-scraper.py --dry      categorize but don't write file

Environment:
  NVIDIA_API_KEY     NVIDIA API key. Required for full runs (not for --smoke).
                     Get one at https://build.nvidia.com.
  NVIDIA_MODEL       Defaults to stepfun-ai/step-3.5-flash.
  SCRAPER_LIMIT      Defaults to 20 candidates per production run.
  GITHUB_TOKEN       Optional. Raises GitHub Advisory rate limit.
  USER_AGENT         Override the HTTP User-Agent.

Designed to be run on a daily cron (GitHub Actions, Vercel Cron, or VM cron).
The output is content/incidents.ts in a Next.js-compatible format.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import time
import traceback
from collections import Counter
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Optional

import feedparser  # type: ignore
import httpx
from bs4 import BeautifulSoup  # type: ignore

# Local module
sys.path.insert(0, str(Path(__file__).resolve().parent))
from sources import ALL_SOURCES, Source, enabled_sources  # noqa: E402

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

THREAT_SLUGS = [
    "prompt-injection",
    "excessive-agency",
    "data-exfiltration",
    "supply-chain",
    "identity-and-authorization",
    "hallucination-and-reliability",
    "multi-agent-coordination",
    "privacy-and-compliance",
    "denial-of-service-and-cost",
    "insecure-output-handling",
]

FALLBACK_PREVENTION_NOTES = {
    "prompt-injection": "This would have been prevented or limited by treating retrieved content as untrusted data, separating instructions from data, and restricting tool calls that can disclose or modify sensitive information.",
    "excessive-agency": "This would have been prevented or limited by least-privilege tools, explicit human approval for destructive actions, and short-lived credentials scoped to the agent's task.",
    "data-exfiltration": "This would have been prevented or limited by egress controls, data-loss prevention checks, scoped retrieval permissions, and approval gates before sensitive data leaves the trusted environment.",
    "supply-chain": "This would have been prevented or limited by dependency provenance, signed releases, isolated execution, rapid revocation paths, and monitoring for unexpected package or model behavior.",
    "identity-and-authorization": "This would have been prevented or limited by tenant-aware authorization checks, scoped OAuth grants, short-lived delegated credentials, and audit trails tied to the human principal.",
    "hallucination-and-reliability": "This would have been prevented or limited by deterministic guardrails around high-impact actions, validation against source systems, human approval, and rollback-ready execution paths.",
    "multi-agent-coordination": "This would have been prevented or limited by clear agent boundaries, shared state controls, arbitration for conflicting actions, and monitoring that detects runaway coordination loops.",
    "privacy-and-compliance": "This would have been prevented or limited by data minimization, policy-aware retrieval, residency controls, consent checks, and logging that proves compliant handling of protected data.",
    "denial-of-service-and-cost": "This would have been prevented or limited by budget caps, rate limits, bounded retries, circuit breakers, and alerts on abnormal tool or token consumption.",
    "insecure-output-handling": "This would have been prevented or limited by treating model output as untrusted, sanitizing rendered content, parameterizing downstream calls, and isolating execution from privileged systems.",
}

ROOT = Path(__file__).resolve().parent.parent
OUTPUT_FILE = ROOT / "content" / "incidents.en.ts"
REJECTED_FILE = ROOT / "content" / "rejected-candidates.json"
PROMPT_FILE = ROOT / "scripts" / "scraper-prompt.md"
NVIDIA_CHAT_COMPLETIONS_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
DEFAULT_NVIDIA_MODEL = "stepfun-ai/step-3.5-flash"

MAX_ITEMS_PER_SOURCE = 20
MAX_ITEM_AGE_DAYS = 30       # skip items older than this
DEFAULT_CANDIDATE_LIMIT = 100
MAX_CANDIDATES_PER_SOURCE = 5
THIN_SUMMARY_THRESHOLD = 200  # fetch article body when summary is shorter
ARTICLE_FETCH_CHARS = 600    # how much of the article body to use
LLM_CALL_DELAY = 0.1         # seconds between categorization calls
HTTP_TIMEOUT = 20.0
MIN_RELEVANCE_SCORE = 70
MIN_CONFIDENCE_SCORE = 65
MIN_SOURCE_QUALITY_SCORE = 45
MAX_REJECTED_RECORDS = 5000
USER_AGENT = os.environ.get(
    "USER_AGENT",
    "AgentThreatAtlas-Scraper/1.0 (+https://atlas.clawforceone.ai) Mozilla/5.0",
)


# ---------------------------------------------------------------------------
# Data shape
# ---------------------------------------------------------------------------


@dataclass
class Candidate:
    source: str
    url: str
    headline: str
    summary: str
    date: str  # YYYY-MM-DD

    def fingerprint(self) -> str:
        return hashlib.sha1(self.url.encode("utf-8")).hexdigest()


@dataclass
class Incident:
    id: str
    date: str
    source: str
    url: str
    headline: str
    summary: str
    severity: str
    threats: list[str] = field(default_factory=list)
    preventionNote: str = ""
    vendor: Optional[str] = None


@dataclass
class QualityDecision:
    accepted: bool
    relevanceScore: int
    confidenceScore: int
    sourceQualityScore: int
    reasons: list[str] = field(default_factory=list)


@dataclass
class RejectedCandidate:
    id: str
    rejectedAt: str
    date: str
    source: str
    url: str
    headline: str
    summary: str
    model: str
    reasons: list[str]
    relevanceScore: int
    confidenceScore: int
    sourceQualityScore: int
    severity: Optional[str] = None
    threats: list[str] = field(default_factory=list)
    vendor: Optional[str] = None


# ---------------------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------------------


def http_client() -> httpx.Client:
    return httpx.Client(
        headers={"User-Agent": USER_AGENT, "Accept": "*/*"},
        timeout=HTTP_TIMEOUT,
        follow_redirects=True,
    )


# ---------------------------------------------------------------------------
# Adapters — one per source.type
# ---------------------------------------------------------------------------


def fetch(source: Source) -> list[Candidate]:
    if source.type in ("rss", "atom"):
        return _fetch_feed(source)
    if source.type == "nvd_json":
        return _fetch_nvd(source)
    if source.type == "ghsa":
        return _fetch_ghsa(source)
    if source.type == "aid_json":
        return _fetch_aid(source)
    if source.type == "html":
        return _fetch_html(source)
    raise ValueError(f"unknown source type: {source.type}")


def _fetch_feed(source: Source) -> list[Candidate]:
    # feedparser handles both RSS and Atom and accepts a URL directly.
    # We pass the raw bytes via httpx so we can use our UA and timeout.
    with http_client() as c:
        r = c.get(source.url)
        r.raise_for_status()
        parsed = feedparser.parse(r.content)
    out: list[Candidate] = []
    for entry in parsed.entries[:MAX_ITEMS_PER_SOURCE]:
        out.append(
            Candidate(
                source=source.name,
                url=str(entry.get("link") or ""),
                headline=str(entry.get("title") or "").strip(),
                summary=_strip_html(str(entry.get("summary") or entry.get("description") or "")),
                date=_format_feed_date(entry),
            )
        )
    return [c for c in out if c.url and c.headline]


def _fetch_nvd(source: Source) -> list[Candidate]:
    with http_client() as c:
        r = c.get(source.url)
        r.raise_for_status()
        data = r.json()
    out: list[Candidate] = []
    # NVD 2.0 schema: { vulnerabilities: [ { cve: { id, descriptions, references, published } } ] }
    for v in data.get("vulnerabilities", [])[:MAX_ITEMS_PER_SOURCE]:
        cve = v.get("cve", {})
        cve_id = cve.get("id", "")
        descs = cve.get("descriptions", []) or []
        en = next((d.get("value", "") for d in descs if d.get("lang") == "en"), "")
        if not _looks_relevant(cve_id + " " + en):
            # Pre-filter: only keep CVEs whose text mentions LLM/agent/AI vocabulary
            continue
        refs = cve.get("references", []) or []
        url = refs[0].get("url") if refs else f"https://nvd.nist.gov/vuln/detail/{cve_id}"
        out.append(
            Candidate(
                source=source.name,
                url=url,
                headline=f"{cve_id}: {_first_sentence(en)}",
                summary=en[:1500],
                date=(cve.get("published") or "")[:10] or _today(),
            )
        )
    return out


def _fetch_ghsa(source: Source) -> list[Candidate]:
    headers = {"User-Agent": USER_AGENT, "Accept": "application/vnd.github+json"}
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    with httpx.Client(headers=headers, timeout=HTTP_TIMEOUT) as c:
        r = c.get(source.url)
        r.raise_for_status()
        items = r.json()
    out: list[Candidate] = []
    for it in items[:MAX_ITEMS_PER_SOURCE]:
        text = (it.get("summary", "") + " " + (it.get("description") or ""))[:2000]
        if not _looks_relevant(text):
            continue
        out.append(
            Candidate(
                source=source.name,
                url=it.get("html_url") or it.get("url") or "",
                headline=it.get("summary") or it.get("ghsa_id") or "GitHub advisory",
                summary=(it.get("description") or "")[:1500],
                date=(it.get("published_at") or "")[:10] or _today(),
            )
        )
    return out


def _fetch_aid(source: Source) -> list[Candidate]:
    """AI Incident Database. Endpoint shape varies — try a couple of fallbacks."""
    candidates_urls = [
        source.url,
        "https://incidentdatabase.ai/rss.xml",
    ]
    for url in candidates_urls:
        try:
            with http_client() as c:
                r = c.get(url)
                r.raise_for_status()
            if url.endswith(".xml"):
                # Fall back to RSS
                return _fetch_feed(Source(source.name, "rss", url, source.category))
            data = r.json()
            items = data.get("incidents") or data.get("data") or []
            out: list[Candidate] = []
            for it in items[:MAX_ITEMS_PER_SOURCE]:
                inc_id = it.get("incident_id") or it.get("id") or ""
                out.append(
                    Candidate(
                        source=source.name,
                        url=f"https://incidentdatabase.ai/cite/{inc_id}",
                        headline=str(it.get("title") or it.get("headline") or "")[:240],
                        summary=str(it.get("description") or "")[:1500],
                        date=str(it.get("date") or "")[:10] or _today(),
                    )
                )
            return out
        except Exception:
            continue
    return []


def _fetch_html(source: Source) -> list[Candidate]:
    if not source.selectors:
        raise ValueError(f"html source {source.name} requires selectors")
    sel = source.selectors
    with http_client() as c:
        r = c.get(source.url)
        r.raise_for_status()
        html = r.text
    soup = BeautifulSoup(html, "html.parser")
    out: list[Candidate] = []
    for el in soup.select(sel.item)[:MAX_ITEMS_PER_SOURCE]:
        headline_el = el.select_one(sel.headline) if sel.headline else el
        link_el = el.select_one(sel.link) if sel.link else el.find("a")
        date_el = el.select_one(sel.date) if sel.date else None
        summary_el = el.select_one(sel.summary) if sel.summary else None
        href = (link_el.get("href") if link_el else None) or ""
        if href and sel.link_base and href.startswith("/"):
            href = sel.link_base.rstrip("/") + href
        out.append(
            Candidate(
                source=source.name,
                url=str(href),
                headline=(headline_el.get_text(" ", strip=True) if headline_el else "")[:240],
                summary=(summary_el.get_text(" ", strip=True) if summary_el else "")[:1500],
                date=_loose_date(date_el.get_text(" ", strip=True)) if date_el else _today(),
            )
        )
    return [c for c in out if c.url and c.headline]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_RELEVANCE_PATTERN = re.compile(
    r"\b("
    # Models and products
    r"llm|llms|gpt|chatgpt|copilot|claude|gemini|bard|mistral|cohere|"
    r"chatbot|perplexity|"
    # Agent concepts
    r"agent|agentic|prompt[- ]injection|jailbreak|tool[- ]use|tool[- ]poison|"
    r"system[- ]prompt|function[- ]call|"
    # Frameworks and platforms
    r"mcp|model[- ]context|rag|retrieval[- ]augmented|"
    r"langchain|lang[- ]chain|autogen|crewai|crew[- ]ai|"
    # Vendors
    r"openai|anthropic|huggingface|hugging[- ]face|llama|replit|"
    # Supply-chain signals
    r"model[- ]weight|fine[- ]tun|"
    # High-level concepts
    r"ai[- ]assistant|ai[- ]agent|generative[- ]ai|gen[- ]ai|"
    r"ai[- ]security|ai[- ]safety"
    r")\b",
    re.IGNORECASE,
)

_SECURITY_SIGNAL_PATTERN = re.compile(
    r"\b("
    r"CVE-\d{4}-\d+|GHSA-[a-z0-9-]+|vulnerab\w*|exploit\w*|breach\w*|"
    r"leak\w*|exfiltrat\w*|unauthorized|malicious|compromis\w*|"
    r"prompt[- ]injection|jailbreak|remote code execution|RCE|SSRF|SQL injection|"
    r"XSS|bypass\w*|deleted?|destructive|advisory|patched?|zero[- ]click|"
    r"credential\w*|secret\w*|data exposure|takeover|security incident|"
    r"regulator\w*|fine\w*|ban\w*|court|tribunal"
    r")\b",
    re.IGNORECASE,
)

_NEWS_ONLY_PATTERN = re.compile(
    r"\b("
    r"announce\w*|launch\w*|release\w*|roadmap|partnership|funding|raises|"
    r"benchmark|faster|improved|new model|preview|availability"
    r")\b",
    re.IGNORECASE,
)

_SOURCE_QUALITY_OVERRIDES = {
    "github security advisory database": 95,
    "nist nvd (recent cves)": 95,
    "cisa alerts": 90,
    "bsi (germany) warnings": 90,
    "the hacker news": 82,
    "darkreading": 78,
    "ars technica security": 78,
    "the register — ai/ml": 76,
    "the guardian — technology": 74,
    "ai incident database": 72,
    "openai blog": 70,
    "google ai blog": 70,
    "google deepmind blog": 70,
    "microsoft security response center": 88,
    "microsoft security update guide (advisories)": 88,
}

CATEGORY_SCORE = {
    "vulnerability-db": 45,
    "aggregator": 40,
    "research": 35,
    "regulator": 30,
    "press": 20,
    "agent-vendor": 18,
    "cloud-vendor": 14,
    "model-vendor": 6,
    "standards": 6,
    "academic": 3,
}

CATEGORY_RESERVE_FRACTIONS = {
    "vulnerability-db": 0.25,
    "research": 0.20,
    "regulator": 0.15,
    "aggregator": 0.10,
    "agent-vendor": 0.10,
    "press": 0.10,
    "cloud-vendor": 0.05,
    "model-vendor": 0.03,
    "standards": 0.02,
    "academic": 0.02,
}

SOURCE_CATEGORY_BY_NAME = {source.name: source.category for source in ALL_SOURCES}


def _looks_relevant(text: str) -> bool:
    """Cheap pre-filter to avoid sending obviously off-topic items to the LLM."""
    return bool(_RELEVANCE_PATTERN.search(text or ""))


def _is_recent(date_str: str, max_days: int = MAX_ITEM_AGE_DAYS) -> bool:
    """Return True if date_str (YYYY-MM-DD) is within max_days of today."""
    try:
        item_date = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        return (datetime.now(timezone.utc) - item_date).days <= max_days
    except ValueError:
        return True  # unparseable date — don't drop it


def _fetch_article_body(url: str) -> str:
    """Fetch the first ARTICLE_FETCH_CHARS of article text for thin-summary enrichment."""
    try:
        with httpx.Client(
            headers={"User-Agent": USER_AGENT, "Accept": "text/html"},
            timeout=10.0,
            follow_redirects=True,
        ) as c:
            r = c.get(url)
            r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")
        for tag in soup(["script", "style", "nav", "header", "footer", "aside"]):
            tag.decompose()
        text = " ".join(
            p.get_text(" ", strip=True)
            for p in soup.find_all("p")
            if p.get_text(strip=True)
        )
        return text[:ARTICLE_FETCH_CHARS]
    except Exception:
        return ""


_CVE_RE = re.compile(r"\bCVE-\d{4}-\d+\b", re.IGNORECASE)


def _extract_cve_ids(text: str) -> set[str]:
    """Return the set of CVE IDs (uppercased) found in text."""
    return {m.upper() for m in _CVE_RE.findall(text or "")}


def _strip_html(s: str) -> str:
    return re.sub(r"<[^>]+>", "", s).strip()[:1500]


def _first_sentence(s: str) -> str:
    return (s.split(". ")[0] if s else "")[:200]


def _format_feed_date(entry) -> str:
    for key in ("published_parsed", "updated_parsed"):
        if entry.get(key):
            t = entry[key]
            return f"{t.tm_year:04d}-{t.tm_mon:02d}-{t.tm_mday:02d}"
    return _today()


def _loose_date(s: str) -> str:
    """Best-effort parse of a free-text date string."""
    if not s:
        return _today()
    s = s.strip()
    # Try ISO first
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", s)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    for fmt in ("%B %d, %Y", "%d %B %Y", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return _today()


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _fallback_prevention_note(threats: list[str]) -> str:
    for threat in threats:
        if threat in FALLBACK_PREVENTION_NOTES:
            return FALLBACK_PREVENTION_NOTES[threat]
    return "This would have been prevented or limited by least-privilege access, human approval for high-impact actions, scoped credentials, monitoring, and rollback-ready operational controls."


def assess_quality(
    candidate: Candidate,
    incident: Incident,
    existing: list[Incident],
    accepted: list[Incident],
) -> QualityDecision:
    relevance = _score_relevance(candidate, incident)
    confidence = _score_confidence(candidate, incident)
    source_quality = _source_quality_score(candidate.source)
    reasons: list[str] = []

    if relevance < MIN_RELEVANCE_SCORE:
        reasons.append("low_relevance")
    if confidence < MIN_CONFIDENCE_SCORE:
        reasons.append("low_confidence")
    if source_quality < MIN_SOURCE_QUALITY_SCORE:
        reasons.append("low_source_quality")
    if _is_vague_ai_news(candidate, incident):
        reasons.append("vague_ai_news")
    if _is_duplicate_incident(candidate, incident, existing + accepted):
        reasons.append("duplicate")

    return QualityDecision(
        accepted=not reasons,
        relevanceScore=relevance,
        confidenceScore=confidence,
        sourceQualityScore=source_quality,
        reasons=reasons,
    )


def assess_skipped_candidate(
    candidate: Candidate,
    existing: list[Incident],
    accepted: list[Incident],
) -> QualityDecision:
    relevance = _score_relevance(candidate, None)
    source_quality = _source_quality_score(candidate.source)
    reasons = ["not_confirmed_by_model"]

    if relevance < MIN_RELEVANCE_SCORE:
        reasons.append("low_relevance")
    if source_quality < MIN_SOURCE_QUALITY_SCORE:
        reasons.append("low_source_quality")
    if _is_vague_ai_news(candidate, None):
        reasons.append("vague_ai_news")
    if _is_duplicate_incident(candidate, None, existing + accepted):
        reasons.append("duplicate")

    return QualityDecision(
        accepted=False,
        relevanceScore=relevance,
        confidenceScore=0,
        sourceQualityScore=source_quality,
        reasons=reasons,
    )


def build_rejection(
    candidate: Candidate,
    incident: Optional[Incident],
    decision: QualityDecision,
) -> RejectedCandidate:
    return RejectedCandidate(
        id=f"reject-{candidate.fingerprint()[:10]}",
        rejectedAt=datetime.now(timezone.utc).isoformat(),
        date=candidate.date,
        source=candidate.source,
        url=candidate.url,
        headline=candidate.headline[:240],
        summary=((incident.summary if incident else candidate.summary) or "")[:1000],
        model=_nvidia_model(),
        reasons=decision.reasons,
        relevanceScore=decision.relevanceScore,
        confidenceScore=decision.confidenceScore,
        sourceQualityScore=decision.sourceQualityScore,
        severity=incident.severity if incident else None,
        threats=list(incident.threats) if incident else [],
        vendor=incident.vendor if incident else None,
    )


def _score_relevance(candidate: Candidate, incident: Optional[Incident]) -> int:
    text = _quality_text(candidate, incident)
    score = 0
    if _looks_relevant(text):
        score += 30
    if _SECURITY_SIGNAL_PATTERN.search(text):
        score += 35
    if _extract_cve_ids(text):
        score += 15
    if incident and incident.threats:
        score += 10
    if incident and incident.vendor:
        score += 10
    if len((incident.summary if incident else candidate.summary).strip()) >= 160:
        score += 10
    return min(score, 100)


def _score_confidence(candidate: Candidate, incident: Optional[Incident]) -> int:
    if incident is None:
        return 0

    summary_len = len((incident.summary or candidate.summary).strip())
    prevention_len = len((incident.preventionNote or "").strip())
    score = 0

    if incident.severity in {"critical", "high", "medium", "low"}:
        score += 20
    if incident.threats:
        score += 20
    if summary_len >= 80:
        score += 20
    elif summary_len >= 40:
        score += 10
    if prevention_len >= 80:
        score += 20
    elif prevention_len >= 40:
        score += 10
    if incident.vendor:
        score += 10
    if candidate.url.startswith("http"):
        score += 5
    if re.match(r"\d{4}-\d{2}-\d{2}$", candidate.date):
        score += 5

    return min(score, 100)


def _candidate_priority(candidate: Candidate) -> int:
    text = _quality_text(candidate, None)
    score = _score_relevance(candidate, None)
    score += _source_quality_score(candidate.source)
    score += CATEGORY_SCORE.get(_source_category(candidate.source), 0)

    if _SECURITY_SIGNAL_PATTERN.search(text):
        score += 25
    if _extract_cve_ids(text):
        score += 25
    if _NEWS_ONLY_PATTERN.search(text) and not _SECURITY_SIGNAL_PATTERN.search(text):
        score -= 45

    try:
        item_date = datetime.strptime(candidate.date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        age_days = max(0, (datetime.now(timezone.utc) - item_date).days)
        score += max(0, 30 - age_days)
    except ValueError:
        pass

    return score


def _source_category(source: str) -> str:
    return SOURCE_CATEGORY_BY_NAME.get(source, "")


def _source_quality_score(source: str) -> int:
    key = source.strip().lower()
    if key in _SOURCE_QUALITY_OVERRIDES:
        return _SOURCE_QUALITY_OVERRIDES[key]
    if "advisory" in key or "security" in key or "cve" in key:
        return 80
    if "blog" in key:
        return 65
    return 55


def _is_vague_ai_news(candidate: Candidate, incident: Optional[Incident]) -> bool:
    text = _quality_text(candidate, incident)
    return bool(_NEWS_ONLY_PATTERN.search(text)) and not bool(_SECURITY_SIGNAL_PATTERN.search(text))


def _is_duplicate_incident(
    candidate: Candidate,
    incident: Optional[Incident],
    incidents: list[Incident],
) -> bool:
    headline_key = _headline_key(incident.headline if incident else candidate.headline)
    cve_ids = _extract_cve_ids(_quality_text(candidate, incident))

    for existing in incidents:
        if candidate.url == existing.url:
            return True
        existing_cves = _extract_cve_ids(
            " ".join([existing.headline, existing.summary, existing.url])
        )
        if cve_ids and cve_ids & existing_cves:
            return True
        if headline_key and headline_key == _headline_key(existing.headline):
            return True
    return False


def _headline_key(headline: str) -> str:
    words = re.findall(r"[a-z0-9]+", (headline or "").lower())
    key = " ".join(words)
    return key if len(key) >= 24 else ""


def _quality_text(candidate: Candidate, incident: Optional[Incident]) -> str:
    parts = [candidate.headline, candidate.summary, candidate.source]
    if incident:
        parts.extend([incident.headline, incident.summary, incident.vendor or ""])
        parts.extend(incident.threats)
    return " ".join(parts)


# ---------------------------------------------------------------------------
# LLM categorization (NVIDIA NIM hosted endpoint)
# ---------------------------------------------------------------------------

def load_prompt() -> str:
    return PROMPT_FILE.read_text(encoding="utf-8")


def _nvidia_model() -> str:
    return os.environ.get("NVIDIA_MODEL", DEFAULT_NVIDIA_MODEL)


def _nvidia_payload(item: Candidate, prompt: str) -> dict:
    dated_prompt = f"Today's date: {_today()}\n\n{prompt}"
    return {
        "model": _nvidia_model(),
        "messages": [
            {"role": "system", "content": dated_prompt},
            {"role": "user", "content": json.dumps(asdict(item))},
        ],
        "max_tokens": 900,
        "temperature": 0,
        "top_p": 1,
        "stream": False,
    }


def _nvidia_headers() -> dict[str, str]:
    api_key = os.environ.get("NVIDIA_API_KEY")
    if not api_key:
        raise SystemExit(
            "NVIDIA_API_KEY is not set.\n"
            "Get a key at https://build.nvidia.com and either:\n"
            "  export NVIDIA_API_KEY=nvapi-...\n"
            "or copy scripts/.env.example to .env and source it.\n"
            "Use --smoke to test fetching without making LLM calls."
        )
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def _call_nvidia(item: Candidate, prompt: str) -> Optional[str]:
    try:
        with http_client() as c:
            r = c.post(
                NVIDIA_CHAT_COMPLETIONS_URL,
                headers=_nvidia_headers(),
                json=_nvidia_payload(item, prompt),
            )
            r.raise_for_status()
            data = r.json()
    except httpx.HTTPStatusError as e:
        status = e.response.status_code
        if status == 429:
            print("[rate-limit] backing off 30s; this item will be retried tomorrow", file=sys.stderr)
            time.sleep(30)
            return None
        print(f"[api-status {status}] {item.url} — {e.response.text[:200]}", file=sys.stderr)
        return None
    except httpx.HTTPError as e:
        print(f"[api-error] {item.url} — {e}", file=sys.stderr)
        return None

    if data.get("requestId") and not data.get("choices"):
        print(f"[api-pending] {item.url} — NVIDIA returned requestId {data['requestId']}", file=sys.stderr)
        return None

    choices = data.get("choices") or []
    if not choices:
        print(f"[parse-error] {item.url} — NVIDIA returned no choices", file=sys.stderr)
        return None

    message = choices[0].get("message") or {}
    content = message.get("content")
    return content.strip() if isinstance(content, str) else None


def categorize(item: Candidate, prompt: str) -> Optional[Incident]:
    """
    Classify one candidate. Returns an Incident if the model accepts it as a
    confirmed agentic-AI security incident, or None to skip.
    """
    text = _call_nvidia(item, prompt)
    if text is None:
        return None

    if not text or text.upper().startswith("SKIP"):
        return None

    try:
        data = json.loads(_extract_json(text))
    except json.JSONDecodeError:
        print(f"[parse-error] {item.url} — model returned non-JSON: {text[:120]}", file=sys.stderr)
        return None

    threats = [t for t in data.get("threats", []) if t in THREAT_SLUGS]
    if not threats:
        return None

    severity = data.get("severity", "medium")
    if severity not in {"critical", "high", "medium", "low"}:
        severity = "medium"

    prevention_note = (
        data.get("preventionNote") or _fallback_prevention_note(threats)
    ).strip()

    return Incident(
        id=f"auto-{item.fingerprint()[:10]}",
        date=item.date,
        source=item.source,
        url=item.url,
        headline=item.headline[:240],
        summary=data.get("summary") or item.summary[:400],
        severity=severity,
        threats=threats,
        preventionNote=prevention_note,
        vendor=data.get("vendor") or None,
    )


def _extract_json(text: str) -> str:
    m = re.search(r"\{.*\}", text, re.DOTALL)
    return m.group(0) if m else text


# ---------------------------------------------------------------------------
# Output: rewrite content/incidents.ts
# ---------------------------------------------------------------------------


HEADER = '''import type {{ Severity }} from "@/lib/site";

export type Incident = {{
  id: string;
  date: string;
  source: string;
  url: string;
  headline: string;
  summary: string;
  severity: Severity;
  threats: string[];
  preventionNote?: string;
  vendor?: string;
}};

// Auto-generated by scripts/example-scraper.py at {ts}.
// Curated incidents may be added manually — dedup is by URL.
export const incidents: Incident[] = [
'''

FOOTER = "];\n"


def write_output(existing: list[Incident], new: list[Incident]) -> bool:
    if not new:
        return False

    seen_urls = {i.url for i in existing}
    merged = list(existing)
    for n in new:
        if n.url not in seen_urls:
            merged.append(n)
            seen_urls.add(n.url)
    merged.sort(key=lambda i: i.date, reverse=True)

    body = ",\n".join(_format_entry(i) for i in merged)
    OUTPUT_FILE.write_text(
        HEADER.format(ts=datetime.now(timezone.utc).isoformat()) + body + "\n" + FOOTER,
        encoding="utf-8",
    )
    return True


def _format_entry(i: Incident) -> str:
    obj = asdict(i)
    if not obj.get("preventionNote"):
        obj["preventionNote"] = _fallback_prevention_note(i.threats)
    if obj.get("vendor") is None:
        obj.pop("vendor", None)
    return "  " + json.dumps(obj, ensure_ascii=False, indent=2).replace("\n", "\n  ")


def write_rejections(rejections: list[RejectedCandidate]) -> bool:
    if not rejections:
        return False

    existing = _load_rejection_records()
    seen_ids = {str(r.get("id")) for r in existing if isinstance(r, dict)}
    new_records = [
        _format_rejection(r)
        for r in rejections
        if r.id not in seen_ids
    ]
    if not new_records:
        return False

    merged = (new_records + existing)[:MAX_REJECTED_RECORDS]
    REJECTED_FILE.write_text(
        json.dumps(merged, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return True


def _load_rejection_records() -> list[dict]:
    if not REJECTED_FILE.exists():
        return []
    try:
        data = json.loads(REJECTED_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []
    return data if isinstance(data, list) else []


def _format_rejection(rejection: RejectedCandidate) -> dict:
    obj = asdict(rejection)
    if obj.get("vendor") is None:
        obj.pop("vendor", None)
    if obj.get("severity") is None:
        obj.pop("severity", None)
    if not obj.get("threats"):
        obj.pop("threats", None)
    return obj


def build_candidate_queue(
    all_candidates: list[Candidate],
    existing: list[Incident],
    limit: int,
) -> tuple[list[Candidate], int]:
    seen_urls = {i.url for i in existing}
    seen_cves: set[str] = set()
    for inc in existing:
        seen_cves |= _extract_cve_ids(
            " ".join([inc.headline, inc.summary, inc.url])
        )

    processed_records = _load_rejection_records()
    processed_urls = {
        str(r.get("url"))
        for r in processed_records
        if isinstance(r, dict) and r.get("url")
    }
    processed_cves: set[str] = set()
    for record in processed_records:
        if not isinstance(record, dict):
            continue
        processed_cves |= _extract_cve_ids(
            " ".join(
                str(record.get(key) or "")
                for key in ("headline", "summary", "url")
            )
        )

    candidates: list[Candidate] = []
    skipped_processed = 0
    for candidate in all_candidates:
        if not candidate.url or not _is_recent(candidate.date):
            continue

        candidate_cves = _extract_cve_ids(candidate.headline + " " + candidate.summary)
        if candidate.url in seen_urls or candidate_cves & seen_cves:
            continue

        if candidate.url in processed_urls or candidate_cves & processed_cves:
            skipped_processed += 1
            continue

        candidates.append(candidate)

    return _select_ranked_candidates(candidates, limit), skipped_processed


def _select_ranked_candidates(candidates: list[Candidate], limit: int) -> list[Candidate]:
    ranked = sorted(
        candidates,
        key=lambda c: (_candidate_priority(c), c.date, c.source, c.headline),
        reverse=True,
    )
    selected: list[Candidate] = []
    selected_urls: set[str] = set()
    source_counts: Counter[str] = Counter()

    def add(candidate: Candidate) -> bool:
        if len(selected) >= limit or candidate.url in selected_urls:
            return False
        if source_counts[candidate.source] >= MAX_CANDIDATES_PER_SOURCE:
            return False

        selected.append(candidate)
        selected_urls.add(candidate.url)
        source_counts[candidate.source] += 1
        return True

    present_categories = {_source_category(candidate.source) for candidate in ranked}
    reserve_order = sorted(
        (category for category in present_categories if category),
        key=lambda category: CATEGORY_RESERVE_FRACTIONS.get(category, 0),
        reverse=True,
    )
    for category in reserve_order:
        if len(selected) >= limit:
            break
        reserve = max(1, round(limit * CATEGORY_RESERVE_FRACTIONS.get(category, 0)))
        taken = 0
        for candidate in ranked:
            if taken >= reserve or len(selected) >= limit:
                break
            if _source_category(candidate.source) == category and add(candidate):
                taken += 1

    for candidate in ranked:
        if len(selected) >= limit:
            break
        add(candidate)

    return selected


def load_existing() -> list[Incident]:
    if not OUTPUT_FILE.exists():
        return []
    text = OUTPUT_FILE.read_text(encoding="utf-8")
    out: list[Incident] = []
    for chunk in re.findall(r"\{[^{}]*\}", text, re.DOTALL):
        try:
            data = json.loads(chunk)
            out.append(Incident(**data))
        except Exception:
            continue
    return out


def print_run_summary(
    total_candidates: int,
    queued_candidates: int,
    accepted_count: int,
    rejections: list[RejectedCandidate],
    failures: list[tuple[str, str]],
) -> None:
    reasons = Counter(reason for r in rejections for reason in r.reasons)

    print()
    print("Run summary")
    print(f"  Model:            {_nvidia_model()}")
    print(f"  Candidates found: {total_candidates}")
    print(f"  Candidates queued:{queued_candidates:2d}")
    print(f"  Accepted:         {accepted_count}")
    print(f"  Rejected:         {len(rejections)}")
    print(f"  Fetch failures:   {len(failures)}")
    if reasons:
        print("  Rejection reasons:")
        for reason, count in reasons.most_common():
            print(f"    {reason}: {count}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Agent Threat Atlas daily incident scraper")
    p.add_argument("--smoke", action="store_true", help="Skip LLM; print fetch counts")
    p.add_argument("--limit", type=int, default=None, help="Cap candidates classified")
    p.add_argument("--dry", action="store_true", help="Categorize but don't write the file")
    p.add_argument("--only", default=None, help="Only run sources whose name contains this string")
    return p.parse_args()


def _candidate_limit(cli_limit: Optional[int]) -> int:
    if cli_limit is not None:
        if cli_limit < 1:
            raise SystemExit("--limit must be a positive integer.")
        return cli_limit

    raw = os.environ.get("SCRAPER_LIMIT")
    if raw is None:
        return DEFAULT_CANDIDATE_LIMIT

    try:
        limit = int(raw)
    except ValueError as e:
        raise SystemExit("SCRAPER_LIMIT must be a positive integer.") from e

    if limit < 1:
        raise SystemExit("SCRAPER_LIMIT must be a positive integer.")
    return limit


def main() -> int:
    args = parse_args()
    sources = enabled_sources()
    if args.only:
        needle = args.only.lower()
        sources = [s for s in sources if needle in s.name.lower()]

    print(f"Fetching from {len(sources)} sources…\n")

    all_candidates: list[Candidate] = []
    counts: dict[str, int] = {}
    failures: list[tuple[str, str]] = []

    for s in sources:
        try:
            cands = fetch(s)
            counts[s.name] = len(cands)
            all_candidates.extend(cands)
            print(f"  {len(cands):3d}  {s.name}")
        except Exception as e:
            failures.append((s.name, str(e)))
            print(f"  ERR  {s.name} — {e}")
            if os.environ.get("DEBUG"):
                traceback.print_exc()

    print()
    print(f"Total candidates: {len(all_candidates)}")
    print(f"Failures:         {len(failures)}")
    print()

    if args.smoke:
        return 0

    existing = load_existing()
    limit = _candidate_limit(args.limit)
    queue, skipped_processed = build_candidate_queue(all_candidates, existing, limit)
    if skipped_processed:
        print(f"Skipped {skipped_processed} already processed candidates.")
        print()

    # Enrich thin summaries with a quick article body fetch before LLM calls.
    thin = [c for c in queue if len(c.summary.strip()) < THIN_SUMMARY_THRESHOLD]
    if thin:
        print(f"Enriching {len(thin)} thin summaries…")
        for c in thin:
            body = _fetch_article_body(c.url)
            if body:
                c.summary = body

    print(f"Categorizing {len(queue)} new candidates with limit {limit}…")
    prompt = load_prompt()
    new: list[Incident] = []
    rejections: list[RejectedCandidate] = []
    run_cves: set[str] = set()  # CVEs accepted in this run (cross-source dedup)

    for c in queue:
        # Skip if a different source already covered this CVE this run.
        cve_ids = _extract_cve_ids(c.headline + " " + c.summary)
        if cve_ids and cve_ids & run_cves:
            decision = QualityDecision(
                accepted=False,
                relevanceScore=_score_relevance(c, None),
                confidenceScore=0,
                sourceQualityScore=_source_quality_score(c.source),
                reasons=["duplicate"],
            )
            rejections.append(build_rejection(c, None, decision))
            continue

        try:
            inc = categorize(c, prompt)
            if inc:
                decision = assess_quality(c, inc, existing, new)
                if decision.accepted:
                    new.append(inc)
                    run_cves |= _extract_cve_ids(inc.headline + " " + inc.url)
                    print(f"  + {inc.severity:8s} {inc.headline[:80]}")
                else:
                    rejections.append(build_rejection(c, inc, decision))
                    print(f"  - {','.join(decision.reasons):30s} {c.headline[:80]}")
            else:
                decision = assess_skipped_candidate(c, existing, new)
                rejections.append(build_rejection(c, None, decision))
                print(f"  - {','.join(decision.reasons):30s} {c.headline[:80]}")
        except Exception as e:
            print(f"  ! {c.url} — {e}", file=sys.stderr)

        time.sleep(LLM_CALL_DELAY)

    print(f"\nKept {len(new)} of {len(queue)} after categorization.")
    print_run_summary(
        total_candidates=len(all_candidates),
        queued_candidates=len(queue),
        accepted_count=len(new),
        rejections=rejections,
        failures=failures,
    )

    if args.dry:
        print("--dry: not writing output or rejection files.")
        return 0

    wrote_incidents = write_output(existing, new)
    wrote_rejections = write_rejections(rejections)

    if wrote_incidents:
        print(f"Wrote {OUTPUT_FILE} with {len(existing) + len(new)} total incidents.")
    else:
        print("No new incidents after categorization.")
    if wrote_rejections:
        print(f"Wrote {REJECTED_FILE} with {len(rejections)} new rejected candidates.")
    else:
        print("No new rejected candidates to record.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
