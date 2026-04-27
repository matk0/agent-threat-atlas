import Link from "next/link";
import type { Metadata } from "next";
import Section from "@/components/Section";
import { surfaces } from "@/content/surfaces";
import { threats, threatBySlug } from "@/content/threats";
import { SeverityPill } from "@/components/Pill";
import CTA from "@/components/CTA";

export const metadata: Metadata = {
  title: "Attack surfaces",
  description:
    "A component-by-component view of the agentic AI attack surface, from the model to the output handler.",
};

export default function SurfacesPage() {
  return (
    <>
      <header className="border-b border-ink-100">
        <div className="container-page py-16">
          <div className="eyebrow">Attack surfaces</div>
          <h1 className="h-display mt-4">Where agents get attacked.</h1>
          <p className="lede mt-5 max-w-3xl">
            Threats don&rsquo;t live in the abstract — they live in components.
            This is the reverse view of the catalog: walk the agent stack and
            see, for each surface, what attackers target and what controls
            close it down.
          </p>
        </div>
      </header>

      <Section>
        <Diagram />
      </Section>

      <Section bordered>
        <div className="space-y-6">
          {surfaces.map((s) => (
            <div
              key={s.id}
              id={s.id}
              className="grid gap-6 rounded-2xl border border-ink-100 bg-white p-6 lg:grid-cols-12 lg:p-8"
            >
              <div className="lg:col-span-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-accent-600">
                  Surface
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink-900">
                  {s.title}
                </h2>
                <p className="mt-3 text-ink-700">{s.role}</p>
              </div>

              <div className="lg:col-span-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                  Applicable threats
                </div>
                <ul className="mt-3 space-y-2">
                  {s.threats.map((slug) => {
                    const t = threatBySlug(slug);
                    if (!t) return null;
                    return (
                      <li key={slug} className="flex items-center justify-between gap-3 text-sm">
                        <Link
                          href={`/threats/${slug}`}
                          className="font-medium text-ink-900 hover:text-accent-700"
                        >
                          {t.short}
                        </Link>
                        <SeverityPill severity={t.severity} />
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="lg:col-span-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                  Controls
                </div>
                <ul className="mt-3 space-y-2 text-sm text-ink-700">
                  {s.mitigations.map((m, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <CTA />
    </>
  );
}

function Diagram() {
  // Compact, text-first system diagram. Uses CSS grid + arrows in pseudo-elements.
  const layers = [
    { id: "user", label: "User / Caller", tone: "ink" },
    { id: "identity", label: "Identity & Authz", tone: "accent" },
    { id: "orchestrator", label: "Orchestrator / Planner", tone: "accent" },
    { id: "llm", label: "Model", tone: "accent" },
    { id: "memory", label: "Memory", tone: "accent" },
    { id: "retrieval", label: "Retrieval / RAG", tone: "accent" },
    { id: "tools", label: "Tools / MCP", tone: "accent" },
    { id: "output", label: "Output Handler", tone: "accent" },
    { id: "world", label: "External world", tone: "ink" },
  ];
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-6 sm:p-10">
      <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">
        Reference architecture
      </div>
      <p className="mt-3 max-w-2xl text-ink-700">
        A typical agent passes data across nine surfaces. Every arrow is a
        trust boundary. Click any node to jump to its detail.
      </p>
      <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-9">
        {layers.map((l) => {
          const interactive = l.id !== "user" && l.id !== "world";
          const cls =
            "flex h-20 items-center justify-center rounded-lg border text-center text-xs font-medium px-2 " +
            (l.tone === "accent"
              ? "border-accent-100 bg-accent-50 text-accent-700"
              : "border-ink-200 bg-ink-50 text-ink-700");
          return interactive ? (
            <a key={l.id} href={`#${l.id}`} className={cls + " hover:border-accent-500 transition"}>
              {l.label}
            </a>
          ) : (
            <div key={l.id} className={cls}>
              {l.label}
            </div>
          );
        })}
      </div>
      <p className="mt-6 text-xs text-ink-500">
        Trust boundaries: every input from a less-trusted layer must be
        treated as adversarial. The two most-violated boundaries are
        Retrieval → Model and Tools → Model.
      </p>
    </div>
  );
}
