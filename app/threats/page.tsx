import Link from "next/link";
import type { Metadata } from "next";
import Section from "@/components/Section";
import { SeverityPill } from "@/components/Pill";
import { threats } from "@/content/threats";
import { incidents } from "@/content/incidents";
import { messages } from "@/lib/i18n";

export const metadata: Metadata = {
  title: messages.threats.indexTitle,
  description: messages.threats.indexDescription,
};

export default function ThreatsIndex() {
  const counts = new Map<string, number>();
  for (const i of incidents) {
    for (const t of i.threats) counts.set(t, (counts.get(t) ?? 0) + 1);
  }

  const ordered = [...threats].sort((a, b) => sevRank(a.severity) - sevRank(b.severity));

  return (
    <>
      <Section
        eyebrow={messages.threats.eyebrow}
        title={messages.threats.heading}
        intro={messages.threats.intro}
      >
        <ul className="grid gap-3">
          {ordered.map((t) => (
            <li key={t.slug}>
              <Link
                href={`/threats/${t.slug}`}
                aria-label={`${messages.threats.openThreatDetail}: ${t.title}`}
                className="group block rounded-lg border border-ink-100 bg-white p-5 shadow-card transition hover:border-accent-500 hover:bg-accent-50/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h2 className="text-base font-semibold leading-6 text-ink-900 transition group-hover:text-accent-700 sm:text-lg">
                        {t.title}
                      </h2>
                      <span
                        aria-hidden
                        className="text-sm font-semibold text-accent-600 opacity-70 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                      >
                        →
                      </span>
                    </div>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-600">
                      {t.summary}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-accent-700">
                    {messages.threats.openThreatDetail}
                    <span aria-hidden>→</span>
                  </span>
                </div>

                <dl className="mt-4 grid gap-3 border-t border-ink-100 pt-4 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                      {messages.threats.severity}
                    </dt>
                    <dd className="mt-2">
                      <SeverityPill severity={t.severity} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                      {messages.threats.recentIncidents}
                    </dt>
                    <dd className="mt-2 font-semibold text-ink-900">
                      {counts.get(t.slug) ?? 0}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                      {messages.threats.frameworks}
                    </dt>
                    <dd className="mt-2 font-semibold text-ink-900">
                      {t.frameworks.length} {messages.threats.refs}
                    </dd>
                  </div>
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}

function sevRank(s: string) {
  return s === "critical" ? 0 : s === "high" ? 1 : s === "medium" ? 2 : 3;
}
