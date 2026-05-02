import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { threats, threatBySlug } from "@/content/threats";
import { incidents } from "@/content/incidents";
import { SeverityPill, Pill } from "@/components/Pill";
import { formatDate } from "@/lib/format";

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  return threats.map((threat) => ({ slug: threat.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const threat = threatBySlug(params.slug);
  if (!threat) return {};
  return { title: threat.title, description: threat.summary };
}

export default function ThreatDetail({ params }: { params: Params }) {
  const threat = threatBySlug(params.slug);
  if (!threat) return notFound();

  const related = incidents
    .filter((incident) => incident.threats.includes(threat.slug))
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <header className="border-b border-ink-100 bg-ink-50/35">
        <div className="container-page py-10 sm:py-12">
          <Link href="/threats" className="text-sm text-ink-500 hover:text-ink-900">
            ← Threat categories
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <SeverityPill severity={threat.severity} />
            <Pill tone="ink">{related.length} linked incidents</Pill>
          </div>
          <h1 className="mt-4 max-w-4xl text-3xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
            {threat.title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-ink-600 sm:text-lg">
            {threat.summary}
          </p>
        </div>
      </header>

      <article className="container-page grid gap-8 py-10 lg:grid-cols-12">
        <div className="space-y-10 lg:col-span-8">
          <Block heading="How to minimize it">
            <ol className="space-y-3">
              {threat.mitigations.map((mitigation, index) => (
                <li
                  key={mitigation.title}
                  className="rounded-xl border border-ink-100 bg-white p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-50 text-xs font-semibold text-accent-700">
                      {index + 1}
                    </div>
                    <div>
                      <h2 className="font-semibold text-ink-900">
                        {mitigation.title}
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-ink-700">
                        {mitigation.body}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Block>

          <Block heading="How it appears in systems">
            <div className="grid gap-3 sm:grid-cols-2">
              {threat.howItHappens.slice(0, 4).map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-ink-100 bg-white p-5"
                >
                  <h2 className="font-semibold text-ink-900">{item.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-ink-700">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </Block>

          {related.length > 0 && (
            <Block heading="Recent incidents">
              <ul className="divide-y divide-ink-100 overflow-hidden rounded-xl border border-ink-100 bg-white">
                {related.slice(0, 8).map((incident) => (
                  <li key={incident.id} className="p-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
                      <SeverityPill severity={incident.severity} />
                      <time>{formatDate(incident.date)}</time>
                      <span>/</span>
                      <span>{incident.source}</span>
                    </div>
                    <a
                      href={incident.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 block text-sm font-semibold leading-6 text-ink-900 hover:text-accent-700"
                    >
                      {incident.headline}
                    </a>
                  </li>
                ))}
              </ul>
            </Block>
          )}
        </div>

        <aside className="lg:col-span-4">
          <div className="sticky top-24 space-y-5">
            <SidebarCard title="Why this matters">
              <p className="text-sm leading-6 text-ink-700">
                {threat.whatItIs[0]}
              </p>
            </SidebarCard>

            <SidebarCard title="Framework mapping">
              <ul className="space-y-3">
                {threat.frameworks.map((framework) => (
                  <li key={framework.name} className="text-sm">
                    <div className="font-medium text-ink-900">
                      {framework.name}
                    </div>
                    <div className="mt-0.5 text-xs uppercase tracking-wider text-ink-500">
                      {framework.ref}
                    </div>
                  </li>
                ))}
              </ul>
            </SidebarCard>

            {threat.realWorld.length > 0 && (
              <SidebarCard title="Known examples">
                <ul className="space-y-3">
                  {threat.realWorld.slice(0, 3).map((example) => (
                    <li key={example.name} className="text-sm">
                      <div className="font-medium text-ink-900">
                        {example.name}
                      </div>
                      <div className="text-xs text-ink-500">{example.year}</div>
                    </li>
                  ))}
                </ul>
              </SidebarCard>
            )}
          </div>
        </aside>
      </article>
    </>
  );
}

function Block({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-600">
        {heading}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SidebarCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-5">
      <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">
        {title}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
