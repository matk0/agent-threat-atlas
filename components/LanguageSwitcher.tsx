"use client";

import { usePathname } from "next/navigation";

export default function LanguageSwitcher({
  targetDomain,
  targetLabel,
  label,
}: {
  targetDomain: string;
  targetLabel: string;
  label: string;
}) {
  const pathname = usePathname();
  const href = `https://${targetDomain}${pathname ?? "/"}`;

  return (
    <a
      href={href}
      aria-label={label}
      className="rounded-md border border-ink-200 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink-700 transition hover:border-accent-500 hover:text-accent-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
    >
      {targetLabel}
    </a>
  );
}
