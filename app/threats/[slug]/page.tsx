import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { threats, threatBySlug } from "@/content/threats";
import { incidents } from "@/content/incidents";
import { playbooks } from "@/content/playbooks";
import { surfaces } from "@/content/surfaces";
import { SeverityPill, Pill } from "@/components/Pill";
import CTA from "@/components/CTA";
import { formatDate } from "@/lib/format";

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  return threats.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const t = threatBySlug(params.slug);
  if (!t) return {};
  return { title: t.title, description: t.summary };
}

export default function ThreatDetail({ params }: { params: Params }) {
  const t = threatBySlug(params.slug);
  if (!t) return notFound();

  const related = incidents.filter((i) => i.threats.includes(t.slug));
  const relatedPlaybooks = playbooks.filter((p) =>
    p.relatedThreats.includes(t.slug),
  );
  const relatedSurfaces = surfaces.filter((s) => t.surfaces.includes(s.id));

  return (
    <>
      <header className="border-b border-ink-100 bg-ink-50/40">
        <div className="container-page py-14">
          <Link href="/threats" className="text-sm text-ink-500 hover:text-ink-900">
            ← Threat catalog
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <SeverityPill severity={t.severity} />
            {t.frameworks.slice(0, 1).map((f) => (
              <Pill key={f.name} tone="ink">
                {f.ref}
              </Pill>
            ))}
          </div>
          <h1 className="h-display mt-5">{t.title}</h1>
          <p className="lede mt-5 max-w-3xl">{t.summary}</p>
        </div>
      </header>

      <article className="container-page grid gap-12 py-16 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Block heading="What it is">
            {t.whatItIs.map((p, idx) => (
              <p key={idx} className="text-ink-700 leading-relaxed">
                {p}
              </p>
            ))}
          </Block>

          <Block heading="How it happens">
            <ul className="space-y-5">
              {t.howItHappens.map((h) => (
                <li key={h.title} className="rounded-xl border border-ink-100 bg-white p-5">
                  <div className="font-semibold text-ink-900">{h.title}</div>
                  <p className="mt-1 text-ink-700">{h.body}</p>
                </li>
              ))}
            </ul>
          </Block>

          <Block heading="Real-world examples">
            <ul className="space-y-4">
              {t.realWorld.map((r) => (
                <li key={r.name} className="rounded-xl border border-ink-100 bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="font-semibold text-ink-900">{r.name}</div>
                    <span className="text-xs text-ink-500">{r.year}</span>
                  </div>
                  <p className="mt-1 text-ink-700">{r.note}</p>
                </li>
              ))}
            </ul>
          </Block>

          <Block heading="How to eliminate it">
            <ol className="space-y-5">
              {t.mitigations.map((m, idx) => (
                <li key={m.title} className="rounded-xl border border-ink-100 bg-white p-5">
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-50 text-xs font-semibold text-accent-700">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-ink-900">{m.title}</div>
                      <p className="mt-1 text-ink-700">{m.body}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Block>

          <Block heading="Framework references">
            <ul className="grid gap-3 sm:grid-cols-2">
              {t.frameworks.map((f) => (
                <li
                  key={f.name}
                  className="rounded-xl border border-ink-100 bg-white p-4 text-sm"
                >
                  <div className="font-semibold text-ink-900">{f.name}</div>
                  <div className="mt-1 text-xs uppercase tracking-wider text-ink-500">
                    {f.ref}
                  </div>
                </li>
              ))}
            </ul>
          </Block>
        </div>

        <aside className="lg:col-span-4">
          <div className="sticky top-24 space-y-6">
            <SidebarCard title="Affected components">
              <ul className="space-y-2 text-sm">
                {relatedSurfaces.map((s) => (
                  <li key={s.id} className="flex items-center justify-between">
                    <span className="text-ink-800">{s.title}</span>
                    <Link
                      href="/surfaces"
                      className="text-xs text-accent-700 hover:underline"
                    >
                      View →
                    </Link>
                  </li>
                ))}
              </ul>
            </SidebarCard>

            {relatedPlaybooks.length > 0 && (
              <SidebarCard title="Apply a playbook">
                <ul className="space-y-3 text-sm">
                  {relatedPlaybooks.map((p) => (
                    <li key={p.slug}>
                      <Link
                        href={`/playbooks/${p.slug}`}
                        className="font-medium text-ink-900 hover:text-accent-700"
                      >
                        {p.title}
                      </Link>
                      <p className="text-xs text-ink-500">{p.audience}</p>
                    </li>
                  ))}
                </ul>
              </SidebarCard>
            )}

            {related.length > 0 && (
              <SidebarCard title="Recent incidents">
                <ul className="space-y-3 text-sm">
                  {related.slice(0, 5).map((i) => (
                    <li key={i.id}>
                      <a
                        href={i.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-ink-900 hover:text-accent-700"
                      >
                        {i.headline}
                      </a>
                      <p className="text-xs text-ink-500">
                        {formatDate(i.date)} · {i.source}
                      </p>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/incidents"
                  className="mt-4 inline-block text-xs font-medium text-accent-700 hover:underline"
                >
                  See all incidents →
                </Link>
              </SidebarCard>
            )}
          </div>
        </aside>
      </article>

      <CTA />
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
    <section className="mb-12">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-600">
        {heading}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
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
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
      <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">
        {title}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
