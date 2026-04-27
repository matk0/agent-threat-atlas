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
  ANTHROPIC_API_KEY  Anthropic API key. Required for full runs (not for --smoke).
                     Get one at https://console.anthropic.com.
  ANTHROPIC_MODEL    Defaults to claude-haiku-4-5-20251001.
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

# The Anthropic SDK is imported lazily inside categorize() so that --smoke
# runs don't require it to be installed.

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

ROOT = Path(__file__).resolve().parent.parent
OUTPUT_FILE = ROOT / "content" / "incidents.ts"
PROMPT_FILE = ROOT / "scripts" / "scraper-prompt.md"

MAX_ITEMS_PER_SOURCE = 20
MAX_ITEM_AGE_DAYS = 30       # skip items older than this
THIN_SUMMARY_THRESHOLD = 200  # fetch article body when summary is shorter
ARTICLE_FETCH_CHARS = 600    # how much of the article body to use
LLM_CALL_DELAY = 0.1         # seconds between categorization calls
HTTP_TIMEOUT = 20.0
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


# ---------------------------------------------------------------------------
# LLM categorization (official Anthropic SDK)
# ---------------------------------------------------------------------------

_anthropic_client = None  # lazily initialized


def load_prompt() -> str:
    return PROMPT_FILE.read_text(encoding="utf-8")


def _get_client():
    """Lazy-initialize the Anthropic client.

    The SDK reads ANTHROPIC_API_KEY from the environment automatically.
    `max_retries=3` covers transient 5xx and rate-limit responses with
    exponential backoff so individual blips don't kill the whole run.
    """
    global _anthropic_client
    if _anthropic_client is None:
        try:
            from anthropic import Anthropic
        except ImportError as e:
            raise SystemExit(
                "The 'anthropic' package is required. Run:\n"
                "  pip install -r scripts/requirements.txt"
            ) from e
        if not os.environ.get("ANTHROPIC_API_KEY"):
            raise SystemExit(
                "ANTHROPIC_API_KEY is not set.\n"
                "Get a key at https://console.anthropic.com and either:\n"
                "  export ANTHROPIC_API_KEY=sk-ant-...\n"
                "or copy scripts/.env.example to .env and source it.\n"
                "Use --smoke to test fetching without making LLM calls."
            )
        _anthropic_client = Anthropic(max_retries=3, timeout=30.0)
    return _anthropic_client


def categorize(item: Candidate, prompt: str) -> Optional[Incident]:
    """
    Classify one candidate. Returns an Incident if the model accepts it as a
    confirmed agentic-AI security incident, or None to skip.
    """
    from anthropic import APIError, RateLimitError, APIStatusError

    client = _get_client()
    model = os.environ.get("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")

    dated_prompt = f"Today's date: {_today()}\n\n{prompt}"
    try:
        message = client.messages.create(
            model=model,
            max_tokens=600,
            system=dated_prompt,
            messages=[
                {"role": "user", "content": json.dumps(asdict(item))},
            ],
        )
    except RateLimitError:
        # SDK already retried; if we're still rate-limited, sleep & give up on this item.
        print("[rate-limit] backing off 30s; this item will be retried tomorrow", file=sys.stderr)
        time.sleep(30)
        return None
    except APIStatusError as e:
        print(f"[api-status {e.status_code}] {item.url} — {e.message}", file=sys.stderr)
        return None
    except APIError as e:
        print(f"[api-error] {item.url} — {e}", file=sys.stderr)
        return None

    # Extract the model's text content.
    text = "".join(
        block.text for block in message.content if getattr(block, "type", "") == "text"
    ).strip()

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

    return Incident(
        id=f"auto-{item.fingerprint()[:10]}",
        date=item.date,
        source=item.source,
        url=item.url,
        headline=item.headline[:240],
        summary=data.get("summary") or item.summary[:400],
        severity=severity,
        threats=threats,
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
  vendor?: string;
}};

// Auto-generated by scripts/example-scraper.py at {ts}.
// Curated incidents may be added manually — dedup is by URL.
export const incidents: Incident[] = [
'''

FOOTER = "];\n"


def write_output(existing: list[Incident], new: list[Incident]) -> None:
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


def _format_entry(i: Incident) -> str:
    obj = asdict(i)
    if obj.get("vendor") is None:
        obj.pop("vendor", None)
    return "  " + json.dumps(obj, ensure_ascii=False, indent=2).replace("\n", "\n  ")


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
    seen_urls = {i.url for i in existing}

    # Build CVE dedup set from existing incidents so we don't re-categorize
    # the same CVE that's already in the file under a different source URL.
    seen_cves: set[str] = set()
    for inc in existing:
        seen_cves |= _extract_cve_ids(inc.headline + " " + inc.url)

    # URL dedup + age gate
    queue = [
        c for c in all_candidates
        if c.url and c.url not in seen_urls and _is_recent(c.date)
    ]

    # CVE dedup against existing incidents
    queue = [
        c for c in queue
        if not (_extract_cve_ids(c.headline + " " + c.summary) & seen_cves)
    ]

    if args.limit:
        queue = queue[: args.limit]

    # Enrich thin summaries with a quick article body fetch before LLM calls.
    thin = [c for c in queue if len(c.summary.strip()) < THIN_SUMMARY_THRESHOLD]
    if thin:
        print(f"Enriching {len(thin)} thin summaries…")
        for c in thin:
            body = _fetch_article_body(c.url)
            if body:
                c.summary = body

    print(f"Categorizing {len(queue)} new candidates…")
    prompt = load_prompt()
    new: list[Incident] = []
    run_cves: set[str] = set()  # CVEs accepted in this run (cross-source dedup)

    for c in queue:
        # Skip if a different source already covered this CVE this run.
        cve_ids = _extract_cve_ids(c.headline + " " + c.summary)
        if cve_ids and cve_ids & run_cves:
            continue

        try:
            inc = categorize(c, prompt)
            if inc:
                new.append(inc)
                run_cves |= _extract_cve_ids(inc.headline + " " + inc.url)
                print(f"  + {inc.severity:8s} {inc.headline[:80]}")
        except Exception as e:
            print(f"  ! {c.url} — {e}", file=sys.stderr)

        time.sleep(LLM_CALL_DELAY)

    print(f"\nKept {len(new)} of {len(queue)} after categorization.")

    if args.dry:
        print("--dry: not writing output file.")
        return 0

    write_output(existing, new)
    print(f"Wrote {OUTPUT_FILE} with {len(existing) + len(new)} total incidents.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
