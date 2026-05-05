"use client";

import { usePathname } from "next/navigation";
import { site } from "@/lib/site";
import { messages } from "@/lib/i18n";

export default function LanguageSwitcher() {
  const pathname = usePathname();
  const href = `https://${site.language.targetDomain}${pathname ?? "/"}`;

  return (
    <a
      href={href}
      aria-label={messages.nav.switchLanguage}
      className="rounded-md border border-ink-200 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink-700 transition hover:border-accent-500 hover:text-accent-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
    >
      {site.language.targetLabel}
    </a>
  );
}
