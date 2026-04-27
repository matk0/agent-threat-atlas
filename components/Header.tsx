import Link from "next/link";
import { site } from "@/lib/site";
import Logo from "./Logo";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/85 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight text-ink-900"
        >
          <Logo className="h-6 w-6 text-accent-600" />
          <span>{site.name}</span>
        </Link>
        <nav
          aria-label="Primary"
          className="hidden items-center gap-7 text-sm text-ink-600 md:flex"
        >
          {site.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition hover:text-ink-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <a
          href={site.consultant.orgUrl}
          target="_blank"
          rel="noreferrer"
          className="hidden text-xs text-ink-500 hover:text-ink-900 md:inline-flex md:items-center md:gap-1.5"
        >
          <span>by</span>
          <span className="font-semibold text-ink-700">{site.consultant.org}</span>
          <span aria-hidden>↗</span>
        </a>
      </div>
    </header>
  );
}
