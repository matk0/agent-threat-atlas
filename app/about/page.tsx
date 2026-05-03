import type { Metadata } from "next";
import Link from "next/link";
import Section from "@/components/Section";
import { site } from "@/lib/site";
import { threats } from "@/content/threats";
import { incidents } from "@/content/incidents";
import { playbooks } from "@/content/playbooks";
import { messages } from "@/lib/i18n";

export const metadata: Metadata = {
  title: messages.about.title,
  description: messages.about.description,
};

export default function AboutPage() {
  return (
    <>
      <header className="border-b border-ink-100">
        <div className="container-page py-16">
          <div className="eyebrow">{messages.about.eyebrow}</div>
          <h1 className="h-display mt-4">{messages.about.heading}</h1>
          <p className="lede mt-5 max-w-3xl">{site.tagline}</p>
        </div>
      </header>

      <Section>
        <div className="grid gap-12 lg:grid-cols-12">
          <article className="prose-body lg:col-span-8">
            <h2 className="text-xl font-semibold tracking-tight text-ink-900">
              {messages.about.whatTitle}
            </h2>
            <p className="mt-3 text-ink-700 leading-relaxed">
              {messages.about.whatBody}
            </p>
            <p className="mt-3 text-ink-700 leading-relaxed">
              {messages.about.whyBody}
            </p>

            <h2 className="mt-10 text-xl font-semibold tracking-tight text-ink-900">
              {messages.about.useTitle}
            </h2>
            <p className="mt-3 text-ink-700 leading-relaxed">
              {messages.about.usePrefix}{" "}
              <Link href="/threats" className="link-quiet">
                {messages.nav.threatCategories.toLowerCase()}
              </Link>{" "}
              {messages.about.useMiddle}{" "}
              <Link href="/playbooks" className="link-quiet">
                {messages.about.playbooks.toLowerCase()}
              </Link>{" "}
              {messages.about.useSuffix}
              <Link href="/incidents" className="link-quiet">
                {messages.nav.liveAtlas.toLowerCase()}
              </Link>{" "}
              {messages.about.useEnd}
            </p>

            <h2 className="mt-10 text-xl font-semibold tracking-tight text-ink-900">
              {messages.about.builtTitle}
            </h2>
            <p className="mt-3 text-ink-700 leading-relaxed">
              {messages.about.builtBody} {messages.about.openSourceOn}{" "}
              <a
                className="link-quiet"
                href={`${site.consultant.orgUrl}`}
                target="_blank"
                rel="noreferrer"
              >
                {messages.about.request}
              </a>
              . {messages.about.builtMapping}
            </p>

            <h2 className="mt-10 text-xl font-semibold tracking-tight text-ink-900">
              {messages.about.maintainerTitle}
            </h2>
            <p className="mt-3 text-ink-700 leading-relaxed">
              {messages.about.maintainerBody}{" "}
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
              . {site.consultant.pitch} {messages.about.maintainerSuffix}
            </p>
            <p className="mt-3 text-ink-700 leading-relaxed">
              {messages.about.missing}{" "}
              <a className="link-quiet" href={`mailto:${site.email}`}>
                {site.email}
              </a>
              .
            </p>
          </article>

          <aside className="lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              <Stat label={messages.about.threatCategories} value={threats.length} />
              <Stat label={messages.about.incidentsIndexed} value={incidents.length} />
              <Stat label={messages.about.playbooks} value={playbooks.length} />

              <div className="rounded-2xl border border-ink-100 bg-ink-900 p-5 text-white">
                <div className="text-xs font-semibold uppercase tracking-wider text-accent-100/80">
                  {messages.about.builtBy}
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
                  {messages.about.visit} {site.consultant.org} →
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
