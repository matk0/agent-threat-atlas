import Link from "next/link";
import Section from "@/components/Section";
import CTA from "@/components/CTA";
import { Pill, SeverityPill } from "@/components/Pill";
import { threats } from "@/content/threats";
import { incidents } from "@/content/incidents";
import { formatDate } from "@/lib/format";

export default function HomePage() {
  const recent = [...incidents]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);

  return (
    <>
      <Hero />
      <FrameworkStrip />
      <ThreatGrid />
      <RecentIncidents recent={recent} />
      <Pillars />
      <CTA />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-ink-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 0%, #1F6FEB 0, transparent 35%), radial-gradient(circle at 100% 30%, #0A1A2F 0, transparent 35%)",
        }}
      />
      <div className="container-page relative grid gap-12 py-20 sm:py-28 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="eyebrow">Agent Threat Atlas</div>
          <h1 className="h-display mt-4">
            A live atlas of agentic AI breaches and the controls that prevent them.
          </h1>
          <p className="lede mt-6 max-w-xl">
            Every public agentic AI security incident, categorized and mapped
            to the threat it exemplifies and the playbook that would have
            prevented it. Updated daily from CVE feeds, vendor advisories,
            regulators, and security research.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/threats" className="btn-primary">
              Explore the threat catalog
            </Link>
            <Link href="/incidents" className="btn-secondary">
              See today&rsquo;s incidents
            </Link>
          </div>
          <p className="mt-6 text-sm text-ink-500">
            Aligned with OWASP LLM Top 10, NIST AI RMF, MITRE ATLAS, ISO/IEC
            42001, and the EU AI Act.
          </p>
        </div>
        <div className="lg:col-span-5">
          <ReferenceCard />
        </div>
      </div>
    </section>
  );
}

function ReferenceCard() {
  const stats = [
    { kpi: "10", label: "Threat categories" },
    { kpi: "15+", label: "Indexed incidents" },
    { kpi: "5", label: "Playbooks" },
  ];
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
      <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">
        How to read this site
      </div>
      <p className="mt-3 text-ink-800">
        Most agent breaches are not exotic. They trace to a small set of
        well-understood failures: prompt injection, over-scoped tools, weak
        identity, unsafe output handling. The Atlas catalogs them and links
        each real-world incident to the controls that would have stopped it.
      </p>
      <dl className="mt-6 grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label}>
            <dt className="text-2xl font-semibold text-ink-900">{s.kpi}</dt>
            <dd className="mt-1 text-xs text-ink-500">{s.label}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6 rounded-lg bg-ink-50/70 p-4 text-xs text-ink-600">
        Bookmark and return weekly. New incidents land in the feed every day.
      </div>
    </div>
  );
}

function FrameworkStrip() {
  const items = [
    "OWASP LLM Top 10 (2025)",
    "NIST AI RMF + GenAI Profile",
    "MITRE ATLAS",
    "ISO/IEC 42001",
    "EU AI Act",
  ];
  return (
    <div className="border-b border-ink-100 bg-ink-50/50">
      <div className="container-page flex flex-wrap items-center justify-between gap-x-8 gap-y-3 py-5 text-xs text-ink-600">
        <span className="font-semibold uppercase tracking-wider text-ink-500">
          Mapped to
        </span>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {items.map((i) => (
            <span key={i} className="font-medium text-ink-700">
              {i}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ThreatGrid() {
  const top = threats.slice(0, 6);
  return (
    <Section
      eyebrow="The catalog"
      title="The threats your agents face — and what to do about each."
      intro="Ten categories, written for engineering teams who actually ship. Each entry has a what-it-is, real-world examples, and a concrete mitigation list."
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {top.map((t) => (
          <Link
            key={t.slug}
            href={`/threats/${t.slug}`}
            className="card group flex h-full flex-col"
          >
            <div className="flex items-center justify-between">
              <SeverityPill severity={t.severity} />
              <span className="text-xs text-ink-400">
                {t.frameworks.length} framework refs
              </span>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-ink-900 group-hover:text-accent-700">
              {t.title}
            </h3>
            <p className="mt-2 text-sm text-ink-600">{t.summary}</p>
            <div className="mt-auto pt-5 text-sm font-medium text-accent-700">
              Read the full entry →
            </div>
          </Link>
        ))}
      </div>
      <div className="mt-10">
        <Link href="/threats" className="link-quiet text-sm">
          See all 10 categories
        </Link>
      </div>
    </Section>
  );
}

function RecentIncidents({ recent }: { recent: typeof incidents }) {
  return (
    <Section
      eyebrow="Updated daily"
      title="Recent incidents from the field."
      intro="Each item is mapped to the threat category it exemplifies and the playbook that would have prevented it. The full feed updates daily from public sources."
      bordered
    >
      <ul className="divide-y divide-ink-100 rounded-2xl border border-ink-100 bg-white">
        {recent.map((i) => (
          <li key={i.id} className="px-6 py-5">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <SeverityPill severity={i.severity} />
              <time className="text-ink-500">{formatDate(i.date)}</time>
              <span className="text-ink-400">·</span>
              <span className="text-ink-500">{i.source}</span>
            </div>
            <h3 className="mt-2 text-base font-semibold text-ink-900">
              {i.headline}
            </h3>
            <p className="mt-1 text-sm text-ink-600">{i.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {i.threats.map((slug) => (
                <Link
                  key={slug}
                  href={`/threats/${slug}`}
                  className="text-xs"
                >
                  <Pill tone="accent">how this is prevented →</Pill>
                </Link>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-8">
        <Link href="/incidents" className="btn-secondary">
          Open the full incident feed
        </Link>
      </div>
    </Section>
  );
}

function Pillars() {
  const pillars = [
    {
      title: "Educate",
      body: "Plain-English deep dives on each threat, written for the buyer who needs to understand the risk before they sign anything.",
      href: "/threats",
      cta: "Threat catalog",
    },
    {
      title: "Eliminate",
      body: "Per-component attack surfaces and copy-paste playbooks for hardening agents in design, build, and runtime.",
      href: "/playbooks",
      cta: "Playbooks",
    },
    {
      title: "Stay current",
      body: "A daily-scraped, categorized feed of real incidents — so your team learns from the field, not from your own outage.",
      href: "/incidents",
      cta: "Incident feed",
    },
  ];
  return (
    <Section
      eyebrow="How this site is organized"
      title="Three jobs, done in one place."
      bordered
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {pillars.map((p) => (
          <div key={p.title} className="card flex flex-col">
            <div className="text-xs font-semibold uppercase tracking-wider text-accent-600">
              {p.title}
            </div>
            <p className="mt-3 text-ink-700">{p.body}</p>
            <Link
              href={p.href}
              className="mt-6 text-sm font-medium text-ink-900 underline decoration-ink-200 underline-offset-4 hover:decoration-ink-900"
            >
              {p.cta} →
            </Link>
          </div>
        ))}
      </div>
    </Section>
  );
}

