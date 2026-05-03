import type { Metadata } from "next";
import { incidents } from "@/content/incidents";
import { threats } from "@/content/threats";
import { daysSinceDate } from "@/lib/format";
import { locale, messages } from "@/lib/i18n";
import IncidentExplorer from "./incidents/IncidentExplorer";

export const metadata: Metadata = {
  title: messages.home.title,
  description: messages.home.description,
};

export default function HomePage() {
  const sorted = [...incidents].sort((a, b) => b.date.localeCompare(a.date));
  const threatMap = Object.fromEntries(
    threats.map((t) => [
      t.slug,
      {
        title: t.title,
        short: t.short,
        mitigation: t.mitigations[0]?.body ?? t.summary,
      },
    ]),
  );
  const latest = sorted[0]?.date;
  const daysSinceLatest = latest ? daysSinceDate(latest) : undefined;

  return (
    <>
      <header className="border-b border-ink-100 bg-ink-50/35">
        <div className="container-page py-10 sm:py-12">
          <div className="eyebrow">{messages.home.eyebrow}</div>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
                {messages.home.heading}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-ink-600 sm:text-lg">
                {messages.home.intro}
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-3 text-right sm:min-w-80">
              <Stat label={messages.home.incidents} value={String(sorted.length)} />
              <Stat label={messages.home.categories} value={String(threats.length)} />
              <Stat
                label={messages.home.daysSinceLastIncident}
                value={
                  daysSinceLatest === undefined
                    ? messages.home.notAvailable
                    : String(daysSinceLatest)
                }
              />
            </dl>
          </div>
        </div>
      </header>

      <IncidentExplorer
        incidents={sorted}
        threatMap={threatMap}
        locale={locale}
        labels={messages.incidents}
      />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink-100 bg-white px-3 py-3">
      <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-ink-900 sm:text-base">
        {value}
      </dd>
    </div>
  );
}
