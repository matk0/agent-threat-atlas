"""
sources.py — registry of feeds the Agent Threat Atlas scraper monitors.

Edit freely. Each source is a Source dataclass with:
  name      Human label (shown in incidents.ts as the source attribution)
  type      Adapter type (rss | atom | nvd_json | aid_json | ghsa | osv_package | avid_html | html)
  url       Feed / API / page URL
  selectors For type='html': dict of CSS selectors describing how to extract
            entries from the page (see HtmlSelectors docstring).
  enabled   Skip without removing — useful when a source temporarily breaks.
  category  Reporting / filtering only.

Run `python scripts/smoke_test.py` to verify each source is reachable and
parses to at least one candidate.

URLs marked with a `# verify` comment have not been hand-confirmed at file
authoring time and may need adjustment after the first smoke test.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class HtmlSelectors:
    """
    CSS selectors for the HTML adapter. The adapter loads `url`, finds every
    element matching `item`, and extracts:
        headline     element matching `headline` (or text of item itself)
        link         href of element matching `link` (or first <a>)
        date         text of element matching `date` (parsed loosely)
        summary      text of element matching `summary` (truncated to 1500 chars)
    Missing fields are filled with sensible defaults.
    """

    item: str
    headline: Optional[str] = None
    link: Optional[str] = None
    date: Optional[str] = None
    summary: Optional[str] = None
    # If links are relative, prefix with this base URL.
    link_base: Optional[str] = None


@dataclass
class Source:
    name: str
    type: str  # rss | atom | nvd_json | aid_json | ghsa | html
    url: str
    category: str
    selectors: Optional[HtmlSelectors] = None
    enabled: bool = True


# ---------------------------------------------------------------------------
# Vulnerability databases
# ---------------------------------------------------------------------------

VULN_DBS: list[Source] = [
    Source(
        name="NIST NVD (recent CVEs)",
        type="nvd_json",
        url="https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=50",
        category="vulnerability-db",
    ),
    Source(
        name="GitHub Security Advisory Database",
        type="ghsa",
        url="https://api.github.com/advisories?per_page=50&sort=published",
        category="vulnerability-db",
    ),
    Source(
        name="OSV.dev AI package vulnerabilities",
        type="osv_package",
        url=(
            "https://api.osv.dev/v1/querybatch"
            "?package=PyPI:langchain"
            "&package=PyPI:langflow"
            "&package=PyPI:llama-index"
            "&package=PyPI:gradio"
            "&package=PyPI:mlflow"
            "&package=PyPI:open-webui"
            "&package=npm:langchain"
            "&package=npm:%40langchain%2Fcore"
            "&package=npm:%40modelcontextprotocol%2Fsdk"
        ),
        category="vulnerability-db",
    ),
    Source(
        name="AVID database",
        type="avid_html",
        url="https://avidml.org/database/",
        category="vulnerability-db",
    ),
    Source(
        name="huntr.com (AI/ML bug bounty)",
        type="rss",
        url="https://blog.huntr.com/rss/",
        category="vulnerability-db",
    ),
]


# ---------------------------------------------------------------------------
# Model providers
# ---------------------------------------------------------------------------

MODEL_VENDORS: list[Source] = [
    Source(
        name="OpenAI blog",
        type="rss",
        url="https://openai.com/blog/rss.xml",
        category="model-vendor",
    ),
    Source(
        name="Anthropic news",
        type="rss",
        url="https://www.anthropic.com/news/feed.xml",
        category="model-vendor",
        enabled=False,  # no RSS feed on anthropic.com as of 2026-04; newsletter only
    ),
    Source(
        name="Google AI blog",
        type="atom",
        url="https://blog.google/technology/ai/rss/",
        category="model-vendor",
    ),
    Source(
        name="Google DeepMind blog",
        type="rss",
        url="https://deepmind.google/blog/rss.xml",
        category="model-vendor",
    ),
    Source(
        name="Meta AI blog",
        type="rss",
        url="https://ai.meta.com/blog/rss/",
        category="model-vendor",
        enabled=False,  # no RSS feed on ai.meta.com as of 2026-04; newsletter only
    ),
    Source(
        name="Mistral AI news",
        type="rss",
        url="https://mistral.ai/news/feed.xml",
        category="model-vendor",
        enabled=False,  # no RSS feed on mistral.ai as of 2026-04; social/email only
    ),
    Source(
        name="Cohere blog",
        type="rss",
        url="https://cohere.com/blog/rss.xml",  # verify
        category="model-vendor",
    ),
    Source(
        name="AI21 Labs blog",
        type="rss",
        url="https://www.ai21.com/blog/feed",  # verify
        category="model-vendor",
        enabled=False,  # AI21 frequently changes blog URLs
    ),
]


# ---------------------------------------------------------------------------
# Cloud / infra security
# ---------------------------------------------------------------------------

CLOUD_VENDORS: list[Source] = [
    Source(
        name="Microsoft Security Response Center",
        type="rss",
        url="https://msrc.microsoft.com/blog/feed/",
        category="cloud-vendor",
    ),
    Source(
        name="Microsoft Security Update Guide (advisories)",
        type="rss",
        url="https://api.msrc.microsoft.com/update-guide/rss",
        category="cloud-vendor",
    ),
    Source(
        name="Google Cloud security blog",
        type="atom",
        url="https://cloud.google.com/blog/products/identity-security/rss",  # verify
        category="cloud-vendor",
    ),
    Source(
        name="Project Zero",
        type="atom",
        url="https://googleprojectzero.blogspot.com/feeds/posts/default",
        category="cloud-vendor",
    ),
    Source(
        name="AWS security bulletins",
        type="rss",
        url="https://aws.amazon.com/security/security-bulletins/feed/",
        category="cloud-vendor",
    ),
    Source(
        name="AWS security blog",
        type="rss",
        url="https://aws.amazon.com/blogs/security/feed/",
        category="cloud-vendor",
    ),
    Source(
        name="Cloudflare blog",
        type="rss",
        url="https://blog.cloudflare.com/rss/",
        category="cloud-vendor",
    ),
    Source(
        name="GitHub security blog",
        type="rss",
        url="https://github.blog/category/security/feed/",
        category="cloud-vendor",
    ),
    Source(
        name="Hugging Face blog",
        type="rss",
        url="https://huggingface.co/blog/feed.xml",
        category="cloud-vendor",
    ),
    Source(
        name="Vercel security",
        type="rss",
        url="https://vercel.com/security/feed.xml",  # verify; may need HTML adapter
        category="cloud-vendor",
        enabled=False,
    ),
    Source(
        name="Databricks blog",
        type="rss",
        url="https://databricks.com/feed",
        category="cloud-vendor",
    ),
    Source(
        name="Snowflake blog",
        type="rss",
        url="https://www.snowflake.com/blog/feed/",
        category="cloud-vendor",
        enabled=False,  # blog moved to snowflake.com/en/blog; no RSS feed found as of 2026-04
    ),
]


# ---------------------------------------------------------------------------
# Agent / framework vendors
# ---------------------------------------------------------------------------

AGENT_VENDORS: list[Source] = [
    Source(
        name="LangChain blog",
        type="rss",
        url="https://blog.langchain.dev/rss/",
        category="agent-vendor",
    ),
    Source(
        name="LlamaIndex blog",
        type="html",
        url="https://www.llamaindex.ai/blog",
        category="agent-vendor",
        selectors=HtmlSelectors(
            item="div.Post",
            headline="p.PostTitle",
            link="a",
            date="p.PostDate",
            summary="p.PostText",
            link_base="https://www.llamaindex.ai",
        ),
    ),
    Source(
        name="Pinecone blog",
        type="rss",
        url="https://www.pinecone.io/blog/rss.xml",
        category="agent-vendor",
        enabled=False,  # no RSS feed on pinecone.io as of 2026-04; newsletter only
    ),
    Source(
        name="Weaviate blog",
        type="rss",
        url="https://weaviate.io/blog/rss.xml",
        category="agent-vendor",
    ),
    Source(
        name="Replit blog",
        type="rss",
        url="https://blog.replit.com/feed.xml",
        category="agent-vendor",
    ),
    Source(
        name="Cursor changelog",
        type="rss",
        url="https://www.cursor.com/changelog/rss",  # verify; may need HTML
        category="agent-vendor",
        enabled=False,
    ),
]


# ---------------------------------------------------------------------------
# AI-security research firms
# ---------------------------------------------------------------------------

RESEARCH: list[Source] = [
    Source(
        name="Embrace The Red (Johann Rehberger)",
        type="atom",
        url="https://embracethered.com/blog/index.xml",
        category="research",
    ),
    Source(
        name="Simon Willison",
        type="atom",
        url="https://simonwillison.net/atom/everything/",
        category="research",
    ),
    Source(
        name="Invariant Labs",
        type="rss",
        url="https://invariantlabs.ai/blog/feed.xml",  # verify
        category="research",
    ),
    Source(
        name="AgentSecDB",
        type="html",
        url="https://agentsecdb.com/",
        category="aggregator",
        selectors=HtmlSelectors(
            item="article.incident-card",
            headline="h3",
            link="h3 a",
            date=".incident-meta",
            summary="p",
            link_base="https://agentsecdb.com",
        ),
    ),
    Source(
        name="Lakera blog",
        type="rss",
        url="https://www.lakera.ai/blog/rss.xml",
        category="research",
        enabled=False,  # no RSS feed on lakera.ai as of 2026-04
    ),
    Source(
        name="HiddenLayer research",
        type="rss",
        url="https://hiddenlayer.com/research/feed/",
        category="research",
        enabled=False,  # no RSS feed on hiddenlayer.com as of 2026-04
    ),
    Source(
        name="Protect AI blog",
        type="rss",
        url="https://protectai.com/blog/rss.xml",
        category="research",
    ),
    Source(
        name="PromptArmor",
        type="rss",
        url="https://promptarmor.substack.com/feed",
        category="research",
    ),
    Source(
        name="Trail of Bits blog",
        type="rss",
        url="https://blog.trailofbits.com/feed/",
        category="research",
    ),
    Source(
        name="NCC Group research",
        type="rss",
        url="https://research.nccgroup.com/feed/",
        category="research",
    ),
    Source(
        name="Bishop Fox blog",
        type="rss",
        url="https://bishopfox.com/blog/rss.xml",
        category="research",
    ),
    Source(
        name="Mithril Security",
        type="rss",
        url="https://blog.mithrilsecurity.io/rss/",
        category="research",
    ),
    Source(
        name="Adversa AI",
        type="rss",
        url="https://adversa.ai/feed/",
        category="research",
        enabled=False,  # 406 blocked by WAF (rejects non-browser user-agents) as of 2026-04
    ),
    Source(
        name="WithSecure Labs",
        type="rss",
        url="https://labs.withsecure.com/rss.xml",  # verify
        category="research",
    ),
    Source(
        name="Aim Labs",
        type="rss",
        url="https://www.aim.security/blog/rss.xml",  # verify
        category="research",
        enabled=False,  # 403 blocked by WAF as of 2026-05
    ),
    Source(
        name="JFrog Security Research",
        type="rss",
        url="https://jfrog.com/blog/category/security-research/feed/",  # verify
        category="research",
    ),
    Source(
        name="Aikido Security blog",
        type="rss",
        url="https://www.aikido.dev/blog/rss.xml",
        category="research",
    ),
    Source(
        name="Tenable Security Research",
        type="rss",
        url="https://www.tenable.com/security/research/feed",
        category="research",
    ),
]


# ---------------------------------------------------------------------------
# Standards bodies & community
# ---------------------------------------------------------------------------

STANDARDS: list[Source] = [
    Source(
        name="OWASP GenAI Security Project",
        type="rss",
        url="https://genai.owasp.org/feed/",
        category="standards",
    ),
    Source(
        name="MITRE ATLAS updates",
        type="html",
        url="https://atlas.mitre.org/news",
        category="standards",
        selectors=HtmlSelectors(
            item="article, .news-item, li.update",
            headline="h2, h3, .title",
            link="a",
            date="time, .date",
            summary=".summary, p",
            link_base="https://atlas.mitre.org",
        ),
        enabled=False,  # ATLAS doesn't have a stable news feed; revisit
    ),
    Source(
        name="NIST AI Resource Center news",
        type="html",
        url="https://airc.nist.gov/home",
        category="standards",
        selectors=HtmlSelectors(
            item=".views-row, .news-item, article",
            headline="h2, h3 a",
            link="a",
            date=".date-display-single, time",
            summary=".field-content, p",
            link_base="https://airc.nist.gov",
        ),
        enabled=False,  # site structure changes; enable after smoke test
    ),
    Source(
        # AID has a GraphQL API but their RSS feed is the most stable path.
        name="AI Incident Database",
        type="rss",
        url="https://incidentdatabase.ai/rss.xml",
        category="aggregator",
    ),
]


# ---------------------------------------------------------------------------
# Regulators / enforcement (UK / EU / US)
# ---------------------------------------------------------------------------

REGULATORS: list[Source] = [
    Source(
        name="ICO (UK) news",
        type="rss",
        url="https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/feed/",
        category="regulator",
        enabled=False,  # ICO removed news RSS after 2024 site redesign; no replacement as of 2026-04
    ),
    Source(
        name="CNIL (France) actualités",
        type="rss",
        url="https://www.cnil.fr/fr/actualites/feed",
        category="regulator",
        enabled=False,  # CNIL discontinued RSS; newsletter only as of 2026-04
    ),
    Source(
        name="Garante (Italy) - newsletter",
        type="html",
        url="https://www.garanteprivacy.it/web/guest/home/docweb",
        category="regulator",
        selectors=HtmlSelectors(
            item=".risultato, .doc-result, article",
            headline="h2, h3, .title",
            link="a",
            date=".date, time",
            summary="p",
            link_base="https://www.garanteprivacy.it",
        ),
        enabled=False,  # JS-heavy site; needs Playwright eventually
    ),
    Source(
        name="EDPB news",
        type="rss",
        url="https://edpb.europa.eu/feed/news_en",
        category="regulator",
    ),
    Source(
        name="ENISA news",
        type="rss",
        url="https://www.enisa.europa.eu/news/RSS",
        category="regulator",
        enabled=False,  # ENISA discontinued RSS with 2024 site redesign; email alerts only as of 2026-04
    ),
    Source(
        name="BSI (Germany) warnings",
        type="rss",
        url="https://wid.cert-bund.de/content/public/securityAdvisory/rss",
        category="regulator",
    ),
    Source(
        name="FTC press releases",
        type="rss",
        url="https://www.ftc.gov/feeds/press-release.xml",
        category="regulator",
    ),
    Source(
        name="CISA alerts",
        type="rss",
        url="https://www.cisa.gov/cybersecurity-advisories/all.xml",
        category="regulator",
    ),
    Source(
        name="UK AI Safety Institute",
        type="rss",
        url="https://www.aisi.gov.uk/feed.xml",
        category="regulator",
        enabled=False,  # no RSS feed on aisi.gov.uk as of 2026-04
    ),
    Source(
        name="EU Commission AI press",
        type="rss",
        url="https://digital-strategy.ec.europa.eu/en/news.rss",  # verify
        category="regulator",
    ),
]


# ---------------------------------------------------------------------------
# Trade press & general infosec
# ---------------------------------------------------------------------------

PRESS: list[Source] = [
    Source(
        name="The Register — AI/ML",
        type="rss",
        url="https://www.theregister.com/software/ai_ml/headlines.atom",
        category="press",
    ),
    Source(
        name="The Record",
        type="rss",
        url="https://therecord.media/feed",
        category="press",
    ),
    Source(
        name="BleepingComputer",
        type="rss",
        url="https://www.bleepingcomputer.com/feed/",
        category="press",
    ),
    Source(
        name="The Hacker News",
        type="rss",
        url="https://feeds.feedburner.com/TheHackersNews",
        category="press",
    ),
    Source(
        name="DarkReading",
        type="rss",
        url="https://www.darkreading.com/rss.xml",
        category="press",
    ),
    Source(
        name="SecurityWeek",
        type="rss",
        url="https://www.securityweek.com/feed/",
        category="press",
    ),
    Source(
        name="KrebsOnSecurity",
        type="rss",
        url="https://krebsonsecurity.com/feed/",
        category="press",
    ),
    Source(
        name="Risky Business news",
        type="rss",
        url="https://risky.biz/feeds/risky-business-news/",
        category="press",
    ),
    Source(
        name="Wired security",
        type="rss",
        url="https://www.wired.com/feed/category/security/latest/rss",
        category="press",
    ),
    Source(
        name="Reuters technology",
        type="rss",
        url="https://www.reuters.com/arc/outboundfeeds/v3/category/technology/?outputType=xml",  # verify
        category="press",
        enabled=False,  # Reuters often blocks scrapers
    ),
    Source(
        name="The Guardian — Technology",
        type="rss",
        url="https://www.theguardian.com/technology/rss",
        category="press",
    ),
    Source(
        name="Ars Technica security",
        type="rss",
        url="https://arstechnica.com/security/feed/",
        category="press",
    ),
    Source(
        name="404 Media",
        type="rss",
        url="https://www.404media.co/rss/",
        category="press",
    ),
    Source(
        name="Platformer (Casey Newton)",
        type="rss",
        url="https://www.platformer.news/feed",
        category="press",
    ),
]


# ---------------------------------------------------------------------------
# Academic
# ---------------------------------------------------------------------------

ACADEMIC: list[Source] = [
    Source(
        name="arXiv cs.CR (filtered downstream by categorizer)",
        type="rss",
        url="http://export.arxiv.org/rss/cs.CR",
        category="academic",
    ),
]


# ---------------------------------------------------------------------------
# Aggregate
# ---------------------------------------------------------------------------

ALL_SOURCES: list[Source] = (
    VULN_DBS
    + MODEL_VENDORS
    + CLOUD_VENDORS
    + AGENT_VENDORS
    + RESEARCH
    + STANDARDS
    + REGULATORS
    + PRESS
    + ACADEMIC
)


def enabled_sources() -> list[Source]:
    return [s for s in ALL_SOURCES if s.enabled]


def by_category() -> dict[str, list[Source]]:
    out: dict[str, list[Source]] = {}
    for s in ALL_SOURCES:
        out.setdefault(s.category, []).append(s)
    return out


if __name__ == "__main__":
    # Quick CLI to inspect the registry
    cats = by_category()
    print(f"{len(ALL_SOURCES)} sources total ({len(enabled_sources())} enabled)\n")
    for cat, items in cats.items():
        on = sum(1 for s in items if s.enabled)
        print(f"  {cat:20s}  {on}/{len(items)} enabled")
    print()
    for s in ALL_SOURCES:
        flag = " " if s.enabled else "x"
        print(f"  [{flag}] {s.category:18s} {s.type:9s} {s.name}")
