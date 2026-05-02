"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Incident } from "@/content/incidents";
import type { Severity } from "@/lib/site";
import { SeverityPill, Pill } from "@/components/Pill";
import { formatDate } from "@/lib/format";

type ThreatMap = Record<
  string,
  { title: string; short: string; mitigation: string }
>;

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
    for (const incident of incidents) {
      for (const threat of incident.threats) {
        counts.set(threat, (counts.get(threat) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [incidents]);

  const filtered = useMemo(() => {
    return incidents.filter((incident) => {
      if (activeThreat !== "all" && !incident.threats.includes(activeThreat)) {
        return false;
      }
      if (activeSeverity !== "all" && incident.severity !== activeSeverity) {
        return false;
      }
      if (query) {
        const needle = query.toLowerCase();
        const haystack = [
          incident.headline,
          incident.summary,
          incident.vendor,
          incident.source,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [incidents, activeThreat, activeSeverity, query]);

  return (
    <div className="container-page grid gap-8 py-8 lg:grid-cols-12 lg:py-10">
      <aside className="lg:col-span-3">
        <div className="sticky top-24 space-y-5">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-500">
              Search
            </label>
            <input
              type="search"
              placeholder="Vendor, source, keyword"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="mt-2 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder-ink-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
            />
          </div>

          <FilterGroup title="Severity">
            <div className="flex flex-wrap gap-2">
              <FilterChip
                active={activeSeverity === "all"}
                onClick={() => setActiveSeverity("all")}
              >
                All
              </FilterChip>
              {SEVERITIES.map((severity) => (
                <FilterChip
                  key={severity}
                  active={activeSeverity === severity}
                  onClick={() => setActiveSeverity(severity)}
                >
                  {severity}
                </FilterChip>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup title="Threat category">
            <div className="flex flex-col gap-1">
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
          </FilterGroup>
        </div>
      </aside>

      <section className="lg:col-span-9">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-500">
          <span>
            Showing {filtered.length} of {incidents.length}
          </span>
          <Link href="/threats" className="font-medium text-accent-700 hover:underline">
            Threat categories →
          </Link>
        </div>

        <ul className="divide-y divide-ink-100 overflow-hidden rounded-xl border border-ink-100 bg-white">
          {filtered.map((incident) => (
            <IncidentRow
              key={incident.id}
              incident={incident}
              threatMap={threatMap}
            />
          ))}
          {filtered.length === 0 && (
            <li className="p-10 text-center text-sm text-ink-500">
              No incidents match these filters.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}

function IncidentRow({
  incident,
  threatMap,
}: {
  incident: Incident;
  threatMap: ThreatMap;
}) {
  const primaryThreat = incident.threats[0];
  const preventionNote =
    incident.preventionNote || threatMap[primaryThreat]?.mitigation;

  return (
    <li className="p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <SeverityPill severity={incident.severity} />
        <time className="text-ink-500">{formatDate(incident.date)}</time>
        <span className="text-ink-300">/</span>
        <span className="text-ink-500">{incident.source}</span>
        {incident.vendor && (
          <>
            <span className="text-ink-300">/</span>
            <span className="font-medium text-ink-700">{incident.vendor}</span>
          </>
        )}
      </div>

      <h2 className="mt-2 text-base font-semibold leading-6 text-ink-900 sm:text-lg">
        {incident.headline}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-600">
        {incident.summary}
      </p>

      {preventionNote && (
        <p className="mt-3 max-w-3xl rounded-lg bg-ink-50 px-3 py-2 text-sm leading-6 text-ink-700">
          <span className="font-semibold text-ink-900">Prevention: </span>
          {preventionNote}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a
          href={incident.url}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-accent-700 hover:underline"
        >
          Source ↗
        </a>
        <div className="flex flex-wrap gap-2">
          {incident.threats.map((slug) => (
            <Link
              key={slug}
              href={`/threats/${slug}`}
              className="text-xs"
              title={threatMap[slug]?.title ?? slug}
            >
              <Pill tone="accent">{threatMap[slug]?.short ?? slug}</Pill>
            </Link>
          ))}
        </div>
      </div>
    </li>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">
        {title}
      </div>
      <div className="mt-2">{children}</div>
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
