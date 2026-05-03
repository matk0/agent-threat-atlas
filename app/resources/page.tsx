import type { Metadata } from "next";
import Section from "@/components/Section";
import { resourceGroups } from "@/content/resources";
import { messages } from "@/lib/i18n";

export const metadata: Metadata = {
  title: messages.resources.title,
  description: messages.resources.description,
};

export default function ResourcesPage() {
  return (
    <>
      <header className="border-b border-ink-100">
        <div className="container-page py-16">
          <div className="eyebrow">{messages.resources.eyebrow}</div>
          <h1 className="h-display mt-4">{messages.resources.heading}</h1>
          <p className="lede mt-5 max-w-3xl">
            {messages.resources.intro}
          </p>
        </div>
      </header>

      {resourceGroups.map((g) => (
        <Section key={g.title} eyebrow={g.title} title={g.intro} bordered>
          <ul className="divide-y divide-ink-100 rounded-2xl border border-ink-100 bg-white">
            {g.items.map((item) => (
              <li key={item.name} className="px-6 py-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-base font-semibold text-ink-900 hover:text-accent-700"
                  >
                    {item.name} ↗
                  </a>
                  <span className="text-xs uppercase tracking-wider text-ink-500">
                    {item.org}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-600">{item.note}</p>
              </li>
            ))}
          </ul>
        </Section>
      ))}
    </>
  );
}
