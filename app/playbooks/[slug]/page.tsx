import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { playbooks, playbookBySlug } from "@/content/playbooks";
import { threats, threatBySlug } from "@/content/threats";
import { Pill, SeverityPill } from "@/components/Pill";
import CTA from "@/components/CTA";

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  return playbooks.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const p = playbookBySlug(params.slug);
  if (!p) return {};
  return { title: p.title, description: p.summary };
}

export default function PlaybookDetail({ params }: { params: Params }) {
  const p = playbookBySlug(params.slug);
  if (!p) return notFound();

  const related = p.relatedThreats
    .map((s) => threatBySlug(s))
    .filter(Boolean) as NonNullable<ReturnType<typeof threatBySlug>>[];

  return (
    <>
      <header className="border-b border-ink-100 bg-ink-50/40">
        <div className="container-page py-14">
          <Link href="/playbooks" className="text-sm text-ink-500 hover:text-ink-900">
            ← Playbooks
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Pill tone="accent">{p.short}</Pill>
            <span className="text-xs text-ink-500">{p.audience}</span>
          </div>
          <h1 className="h-display mt-5">{p.title}</h1>
          <p className="lede mt-5 max-w-3xl">{p.summary}</p>
        </div>
      </header>

      <article className="container-page grid gap-12 py-16 lg:grid-cols-12">
        <div className="lg:col-span-8">
          {p.sections.map((s) => (
            <section key={s.title} className="mb-10">
              <h2 className="text-xl font-semibold tracking-tight text-ink-900">
                {s.title}
              </h2>
              {s.intro && (
                <p className="mt-2 text-ink-700 leading-relaxed">{s.intro}</p>
              )}
              <ul className="mt-4 space-y-3">
                {s.items.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex gap-3 rounded-lg border border-ink-100 bg-white p-4"
                  >
                    <Checkbox />
                    <span className="text-ink-800">{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <aside className="lg:col-span-4">
          <div className="sticky top-24 space-y-6">
            <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                Maps to threats
              </div>
              <ul className="mt-3 space-y-3 text-sm">
                {related.map((t) => (
                  <li key={t.slug} className="flex items-start justify-between gap-3">
                    <Link
                      href={`/threats/${t.slug}`}
                      className="font-medium text-ink-900 hover:text-accent-700"
                    >
                      {t.short}
                    </Link>
                    <SeverityPill severity={t.severity} />
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-ink-100 bg-ink-900 p-5 text-white">
              <div className="text-xs font-semibold uppercase tracking-wider text-accent-100/80">
                Need help applying this?
              </div>
              <p className="mt-2 text-sm text-ink-100/90">
                We run two-week engagements that turn playbooks like this into
                shipped controls — code, configs, and dashboards your team can
                own.
              </p>
              <Link
                href="/contact"
                className="mt-4 inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-xs font-semibold text-ink-900 hover:bg-ink-50"
              >
                Book an intro call
              </Link>
            </div>
          </div>
        </aside>
      </article>

      <CTA />
    </>
  );
}

function Checkbox() {
  return (
    <span
      aria-hidden
      className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border border-ink-200 bg-white"
    >
      <svg
        viewBox="0 0 16 16"
        className="h-3 w-3 text-accent-600"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 8.5 6.5 12 13 4.5" />
      </svg>
    </span>
  );
}
