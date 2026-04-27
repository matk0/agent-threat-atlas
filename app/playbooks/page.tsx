import Link from "next/link";
import type { Metadata } from "next";
import Section from "@/components/Section";
import { playbooks } from "@/content/playbooks";
import { Pill } from "@/components/Pill";

export const metadata: Metadata = {
  title: "Playbooks",
  description:
    "Actionable, copy-and-adapt playbooks for designing, evaluating, and operating secure AI agents.",
};

export default function PlaybooksIndex() {
  return (
    <>
      <header className="border-b border-ink-100">
        <div className="container-page py-16">
          <div className="eyebrow">Playbooks</div>
          <h1 className="h-display mt-4">Hands-on guides for the team that ships.</h1>
          <p className="lede mt-5 max-w-3xl">
            Each playbook is a structured checklist you can drop into a Notion
            doc, RFC, or runbook tomorrow. Built around the threats in the
            catalog and the failure modes from the incident feed.
          </p>
        </div>
      </header>

      <Section>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {playbooks.map((p) => (
            <Link
              key={p.slug}
              href={`/playbooks/${p.slug}`}
              className="card group flex h-full flex-col"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="accent">{p.short}</Pill>
                <span className="text-xs text-ink-500">{p.audience}</span>
              </div>
              <h2 className="mt-4 text-xl font-semibold text-ink-900 group-hover:text-accent-700">
                {p.title}
              </h2>
              <p className="mt-2 text-ink-600">{p.summary}</p>
              <div className="mt-auto pt-5 text-sm font-medium text-accent-700">
                Open the playbook →
              </div>
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}
