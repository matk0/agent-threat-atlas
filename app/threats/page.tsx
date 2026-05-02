import Link from "next/link";
import type { Metadata } from "next";
import Section from "@/components/Section";
import { SeverityPill, Pill } from "@/components/Pill";
import { threats } from "@/content/threats";
import { incidents } from "@/content/incidents";

export const metadata: Metadata = {
  title: "Threat catalog",
  description:
    "Agentic AI threat categories with practical controls and related incidents.",
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
        eyebrow="The catalog"
        title="Threat categories and controls."
        intro="Each category links real incidents to practical ways to reduce exposure."
      >
        <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
          <table className="w-full text-left">
            <thead className="bg-ink-50/60 text-xs uppercase tracking-wider text-ink-500">
              <tr>
                <th className="px-6 py-3">Threat</th>
                <th className="px-6 py-3">Severity</th>
                <th className="px-6 py-3">Recent incidents</th>
                <th className="px-6 py-3">Frameworks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {ordered.map((t) => (
                <tr key={t.slug} className="hover:bg-ink-50/40">
                  <td className="px-6 py-4 align-top">
                    <Link
                      href={`/threats/${t.slug}`}
                      className="font-semibold text-ink-900 hover:text-accent-700"
                    >
                      {t.title}
                    </Link>
                    <p className="mt-1 max-w-xl text-sm text-ink-600">{t.summary}</p>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <SeverityPill severity={t.severity} />
                  </td>
                  <td className="px-6 py-4 align-top text-sm text-ink-700">
                    {counts.get(t.slug) ?? 0}
                  </td>
                  <td className="px-6 py-4 align-top text-xs text-ink-500">
                    {t.frameworks.length} refs
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}

function sevRank(s: string) {
  return s === "critical" ? 0 : s === "high" ? 1 : s === "medium" ? 2 : 3;
}
