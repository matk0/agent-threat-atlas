import type { Metadata } from "next";
import Section from "@/components/Section";

export const metadata: Metadata = {
  title: "Resources",
  description:
    "Curated external resources for agentic AI security: standards, papers, and recurring sources we monitor.",
};

const groups: {
  title: string;
  intro: string;
  items: { name: string; org: string; url: string; note: string }[];
}[] = [
  {
    title: "Frameworks & standards",
    intro:
      "If you only read four documents this quarter, read these. They form the spine of every serious agent-security program.",
    items: [
      {
        name: "OWASP Top 10 for LLM Applications (2025)",
        org: "OWASP",
        url: "https://genai.owasp.org/llm-top-10/",
        note: "The canonical taxonomy of LLM/agent risks. Updated annually with a community process.",
      },
      {
        name: "NIST AI Risk Management Framework + GenAI Profile",
        org: "NIST",
        url: "https://www.nist.gov/itl/ai-risk-management-framework",
        note: "Govern / Map / Measure / Manage. The GenAI Profile (NIST AI 600-1) maps the framework to GenAI-specific risks.",
      },
      {
        name: "MITRE ATLAS",
        org: "MITRE",
        url: "https://atlas.mitre.org/",
        note: "ATT&CK-style adversarial TTPs for AI/ML systems. Useful for red-team scope and detection engineering.",
      },
      {
        name: "ISO/IEC 42001 — AI Management System",
        org: "ISO/IEC",
        url: "https://www.iso.org/standard/81230.html",
        note: "Management-system standard for AI; the 'ISO 27001 for AI'. Increasingly cited in enterprise procurement.",
      },
      {
        name: "EU AI Act",
        org: "European Union",
        url: "https://artificialintelligenceact.eu/",
        note: "Risk-tiered regulation with phased application from 2025–2027. Key for any product touching EU users.",
      },
    ],
  },
  {
    title: "Research & writing we trust",
    intro:
      "A short, opinionated reading list. Each of these has changed how we approach agent security.",
    items: [
      {
        name: "Simon Willison's prompt-injection archive",
        org: "Simon Willison",
        url: "https://simonwillison.net/tags/prompt-injection/",
        note: "The longest-running, most accessible reporting on prompt injection in production systems.",
      },
      {
        name: "Embrace The Red — Johann Rehberger",
        org: "Johann Rehberger",
        url: "https://embracethered.com/blog/",
        note: "Steady stream of high-quality exfiltration / agent-injection POCs. Required reading for red-teamers.",
      },
      {
        name: "Google DeepMind — CaMeL paper",
        org: "Google DeepMind",
        url: "https://arxiv.org/abs/2503.18813",
        note: "Capability-based dual-LLM architecture for defending against prompt injection in tool-using agents.",
      },
      {
        name: "Anthropic & OpenAI agentic safety reports",
        org: "Anthropic / OpenAI",
        url: "https://www.anthropic.com/research",
        note: "Vendor-published guidance on tool-use safety, jailbreak resistance, and agent identity patterns.",
      },
      {
        name: "Invariant Labs blog",
        org: "Invariant Labs",
        url: "https://invariantlabs.ai/blog",
        note: "Practical, research-grade analyses of MCP and agent vulnerabilities.",
      },
    ],
  },
  {
    title: "Sources we monitor for the incident feed",
    intro:
      "Our daily scraper polls these for new incidents. Each is independently worth subscribing to.",
    items: [
      {
        name: "NIST National Vulnerability Database",
        org: "NIST",
        url: "https://nvd.nist.gov/",
        note: "Authoritative CVE feed. We watch tags relevant to AI/ML and agent platforms.",
      },
      {
        name: "OWASP GenAI Security Project announcements",
        org: "OWASP",
        url: "https://genai.owasp.org/",
        note: "Working-group disclosures and reference advisories.",
      },
      {
        name: "Vendor security advisories (OpenAI, Anthropic, Google, Microsoft)",
        org: "Vendors",
        url: "https://msrc.microsoft.com/",
        note: "Subscribe to vendor security RSS for first-party fixes affecting your stack.",
      },
      {
        name: "AI Incident Database",
        org: "Responsible AI Collaborative",
        url: "https://incidentdatabase.ai/",
        note: "Community-curated incident catalog covering broader AI harms beyond pure security.",
      },
    ],
  },
];

export default function ResourcesPage() {
  return (
    <>
      <header className="border-b border-ink-100">
        <div className="container-page py-16">
          <div className="eyebrow">Resources</div>
          <h1 className="h-display mt-4">A short, opinionated reading list.</h1>
          <p className="lede mt-5 max-w-3xl">
            We&rsquo;d rather link you to ten things that matter than fifty
            that don&rsquo;t. Below: the standards we map to, the research
            that&rsquo;s shaping the field, and the sources our daily incident
            feed monitors.
          </p>
        </div>
      </header>

      {groups.map((g) => (
        <Section key={g.title} eyebrow={g.title} title={g.intro} bordered>
          <ul className="divide-y divide-ink-100 rounded-2xl border border-ink-100 bg-white">
            {g.items.map((item) => (
              <li key={item.name} className="px-6 py-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-base font-semibold text-ink-900 hover:text-accent-700"
                  >
                    {item.name} ↗
                  </a>
                  <span className="text-xs uppercase tracking-wider text-ink-500">
                    {item.org}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-600">{item.note}</p>
              </li>
            ))}
          </ul>
        </Section>
      ))}
    </>
  );
}
