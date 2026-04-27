import type { Metadata } from "next";
import { incidents } from "@/content/incidents";
import { threats } from "@/content/threats";
import IncidentExplorer from "./IncidentExplorer";

export const metadata: Metadata = {
  title: "Incident feed",
  description:
    "A daily-updated feed of public agentic AI incidents, categorized by threat and linked to mitigation playbooks.",
};

export default function IncidentsPage() {
  // Sort newest first server-side
  const sorted = [...incidents].sort((a, b) => b.date.localeCompare(a.date));

  // Build threat lookup table for the client
  const threatMap = Object.fromEntries(
    threats.map((t) => [t.slug, { title: t.title, short: t.short }]),
  );

  return (
    <>
      <header className="border-b border-ink-100">
        <div className="container-page py-14">
          <div className="eyebrow">Incident feed · updated daily</div>
          <h1 className="h-display mt-4">What broke this week.</h1>
          <p className="lede mt-5 max-w-3xl">
            A curated, categorized log of public agentic AI incidents from
            vendor disclosures, security research, regulators, and the press.
            Each item is mapped to the threat category it exemplifies and a
            playbook that would have prevented it.
          </p>
          <div className="mt-6 rounded-lg border border-warn-500/20 bg-warn-50 px-4 py-3 text-xs text-warn-700">
            <strong>Demo data.</strong> The feed shipped with this site is a
            curated set of well-known incidents. The README documents how to
            wire up the daily scraper that auto-populates this page.
          </div>
        </div>
      </header>

      <IncidentExplorer incidents={sorted} threatMap={threatMap} />
    </>
  );
}
