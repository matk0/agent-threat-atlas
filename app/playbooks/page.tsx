import Link from "next/link";
import type { Metadata } from "next";
import Section from "@/components/Section";
import { playbooks } from "@/content/playbooks";
import { Pill } from "@/components/Pill";
import { messages } from "@/lib/i18n";

export const metadata: Metadata = {
  title: messages.playbooks.title,
  description: messages.playbooks.description,
};

export default function PlaybooksIndex() {
  return (
    <>
      <header className="border-b border-ink-100">
        <div className="container-page py-16">
          <div className="eyebrow">{messages.playbooks.title}</div>
          <h1 className="h-display mt-4">{messages.playbooks.heading}</h1>
          <p className="lede mt-5 max-w-3xl">
            {messages.playbooks.intro}
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
                {messages.playbooks.open} →
              </div>
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}
