"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Incident } from "@/content/incidents";
import type { Severity } from "@/lib/site";
import { SeverityPill, Pill } from "@/components/Pill";
import { formatDate } from "@/lib/format";

type ThreatMap = Record<string, { title: string; short: string }>;

const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];

export default function IncidentExplorer({
  incidents,
  threatMap,
}: {
  incidents: Incident[];
  threatMap: ThreatMap;
}) {
  const [activeThreat, setActiveThreat] = useState<string | "all">("all");
  const [activeSeverity, setActiveSeverity] = useState<Severity | "all">("all");
  const [query, setQuery] = useState("");

  const threatOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const i of incidents)
      for (const t of i.threats) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [incidents]);

  const filtered = useMemo(() => {
    return incidents.filter((i) => {
      if (activeThreat !== "all" && !i.threats.includes(activeThreat))
        return false;
      if (activeSeverity !== "all" && i.severity !== activeSeverity)
        return false;
      if (query) {
        const q = query.toLowerCase();
        const hay = (i.headline + " " + i.summary + " " + (i.vendor ?? "")).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [incidents, activeThreat, activeSeverity, query]);

  return (
    <div className="container-page grid gap-10 py-14 lg:grid-cols-12">
      <aside className="lg:col-span-3">
        <div className="sticky top-24 space-y-6">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-500">
              Search
            </label>
            <input
              type="search"
              placeholder="Vendor, headline…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="mt-2 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder-ink-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
            />
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">
              Severity
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <FilterChip
                active={activeSeverity === "all"}
                onClick={() => setActiveSeverity("all")}
              >
                All
              </FilterChip>
              {SEVERITIES.map((s) => (
                <FilterChip
                  key={s}
                  active={activeSeverity === s}
                  onClick={() => setActiveSeverity(s)}
                >
                  {s}
                </FilterChip>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">
              Threat category
            </div>
            <div className="mt-2 flex flex-col gap-1">
              <FilterRow
                active={activeThreat === "all"}
                onClick={() => setActiveThreat("all")}
                count={incidents.length}
                label="All categories"
              />
              {threatOptions.map(([slug, count]) => (
                <FilterRow
                  key={slug}
                  active={activeThreat === slug}
                  onClick={() => setActiveThreat(slug)}
                  count={count}
                  label={threatMap[slug]?.short ?? slug}
                />
              ))}
            </div>
          </div>
        </div>
      </aside>

      <section className="lg:col-span-9">
        <div className="mb-4 text-sm text-ink-500">
          Showing {filtered.length} of {incidents.length} incidents
        </div>
        <ul className="space-y-4">
          {filtered.map((i) => (
            <li
              key={i.id}
              className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card"
            >
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <SeverityPill severity={i.severity} />
                <time className="text-ink-500">{formatDate(i.date)}</time>
                <span className="text-ink-400">·</span>
                <span className="text-ink-500">{i.source}</span>
                {i.vendor && (
                  <>
                    <span className="text-ink-400">·</span>
                    <span className="text-ink-700">{i.vendor}</span>
                  </>
                )}
              </div>
              <h2 className="mt-2 text-lg font-semibold text-ink-900">
                {i.headline}
              </h2>
              <p className="mt-2 text-ink-700">{i.summary}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <a
                  href={i.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-accent-700 hover:underline"
                >
                  Read source ↗
                </a>
                <span className="text-ink-300">|</span>
                <div className="flex flex-wrap gap-2">
                  {i.threats.map((slug) => (
                    <Link
                      key={slug}
                      href={`/threats/${slug}`}
                      className="text-xs"
                      title={`Open mitigation: ${threatMap[slug]?.title ?? slug}`}
                    >
                      <Pill tone="accent">
                        {threatMap[slug]?.short ?? slug} → mitigation
                      </Pill>
                    </Link>
                  ))}
                </div>
              </div>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="rounded-2xl border border-ink-100 bg-white p-12 text-center text-ink-500">
              No incidents match these filters.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full px-3 py-1 text-xs font-medium capitalize transition " +
        (active
          ? "bg-ink-900 text-white"
          : "bg-ink-50 text-ink-700 hover:bg-ink-100")
      }
    >
      {children}
    </button>
  );
}

function FilterRow({
  active,
  onClick,
  count,
  label,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex items-center justify-between rounded-md px-3 py-2 text-left text-sm transition " +
        (active ? "bg-accent-50 text-accent-700" : "text-ink-700 hover:bg-ink-50")
      }
    >
      <span className="capitalize">{label}</span>
      <span className="text-xs text-ink-400">{count}</span>
    </button>
  );
}
