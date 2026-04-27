import type { Metadata } from "next";
import Link from "next/link";
import Section from "@/components/Section";
import { site } from "@/lib/site";
import { threats } from "@/content/threats";
import { incidents } from "@/content/incidents";
import { playbooks } from "@/content/playbooks";

export const metadata: Metadata = {
  title: "About",
  description: `What ${site.name} is, who maintains it, and how to use it.`,
};

export default function AboutPage() {
  return (
    <>
      <header className="border-b border-ink-100">
        <div className="container-page py-16">
          <div className="eyebrow">About</div>
          <h1 className="h-display mt-4">A working reference, kept current.</h1>
          <p className="lede mt-5 max-w-3xl">{site.tagline}</p>
        </div>
      </header>

      <Section>
        <div className="grid gap-12 lg:grid-cols-12">
          <article className="prose-body lg:col-span-8">
            <h2 className="text-xl font-semibold tracking-tight text-ink-900">
              What this site is
            </h2>
            <p className="mt-3 text-ink-700 leading-relaxed">
              {site.name} is a public, evolving reference for engineering and
              security teams adopting agentic AI. Three things, in one place:
              a catalog of the threats specific to agentic systems, a daily
              feed of real incidents from the field, and the controls that
              would have prevented each one. Every incident links to the
              threat category that explains it and to a playbook for closing
              the gap.
            </p>
            <p className="mt-3 text-ink-700 leading-relaxed">
              The Atlas exists because most agent breaches trace to a small
              set of well-understood failures — prompt injection, over-scoped
              tools, unsafe output handling, weak identity. Calling them out
              by name makes them addressable. The site is intentionally
              boring: no exhortation, no countdown timers, no sales theater.
              Just the catalog, the incidents, and the controls.
            </p>

            <h2 className="mt-10 text-xl font-semibold tracking-tight text-ink-900">
              How to use it
            </h2>
            <p className="mt-3 text-ink-700 leading-relaxed">
              If you&rsquo;re evaluating an agent feature or vendor, start at
              the <Link href="/threats" className="link-quiet">threat catalog</Link>{" "}
              and skim the categories that apply. If you&rsquo;re hardening a
              live system, the{" "}
              <Link href="/playbooks" className="link-quiet">playbooks</Link>{" "}
              are checklist-shaped and copy-paste-friendly. The{" "}
              <Link href="/incidents" className="link-quiet">incident feed</Link>{" "}
              is worth scanning weekly — it&rsquo;s how you keep your mental
              model current as the field moves.
            </p>

            <h2 className="mt-10 text-xl font-semibold tracking-tight text-ink-900">
              How it&rsquo;s built
            </h2>
            <p className="mt-3 text-ink-700 leading-relaxed">
              The threat catalog and playbooks are hand-written. The incident
              feed is automated: a daily scraper polls roughly seventy
              sources — CVE feeds, vendor advisories, regulators, security
              research blogs, trade press — and an LLM categorizer applies a
              strict &ldquo;confirmed incidents only&rdquo; filter before
              anything reaches the site. Open source on{" "}
              <a
                className="link-quiet"
                href={`${site.consultant.orgUrl}`}
                target="_blank"
                rel="noreferrer"
              >
                request
              </a>
              . Mapping is to OWASP LLM Top 10, NIST AI RMF, MITRE ATLAS, ISO/IEC 42001, and the EU AI Act.
            </p>

            <h2 className="mt-10 text-xl font-semibold tracking-tight text-ink-900">
              Who maintains it
            </h2>
            <p className="mt-3 text-ink-700 leading-relaxed">
              The Atlas is maintained by{" "}
              <strong className="text-ink-900">{site.consultant.name}</strong>,{" "}
              {site.consultant.role.toLowerCase()} at{" "}
              <a
                className="link-quiet"
                href={site.consultant.orgUrl}
                target="_blank"
                rel="noreferrer"
              >
                {site.consultant.org}
              </a>
              . {site.consultant.pitch} If you&rsquo;d like to talk about a
              specific agent system, the consultancy is the right door.
            </p>
            <p className="mt-3 text-ink-700 leading-relaxed">
              Spotted an incident or category that&rsquo;s missing? An
              incorrect mitigation? A source we should be polling? Email{" "}
              <a className="link-quiet" href={`mailto:${site.email}`}>
                {site.email}
              </a>
              .
            </p>
          </article>

          <aside className="lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              <Stat label="Threat categories" value={threats.length} />
              <Stat label="Incidents indexed" value={incidents.length} />
              <Stat label="Playbooks" value={playbooks.length} />

              <div className="rounded-2xl border border-ink-100 bg-ink-900 p-5 text-white">
                <div className="text-xs font-semibold uppercase tracking-wider text-accent-100/80">
                  Built by
                </div>
                <p className="mt-2 text-lg font-semibold">
                  {site.consultant.org}
                </p>
                <p className="mt-1 text-sm text-ink-100/80">
                  {site.consultant.name} — {site.consultant.role}
                </p>
                <a
                  href={site.consultant.orgUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-xs font-semibold text-ink-900 hover:bg-ink-50"
                >
                  Visit {site.consultant.org} →
                </a>
              </div>
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5">
      <div className="text-3xl font-semibold text-ink-900">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wider text-ink-500">
        {label}
      </div>
    </div>
  );
}
