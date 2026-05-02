import Link from "next/link";
import { site } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-ink-100 bg-ink-50/35">
      <div className="container-page flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-semibold text-ink-900">{site.name}</div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-600">
            {site.tagline}
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-600">
          <Link href="/" className="hover:text-ink-900">
            Live Atlas
          </Link>
          <Link href="/threats" className="hover:text-ink-900">
            Threat Categories
          </Link>
          <a
            href="https://matejlukasik.com/contact"
            className="hover:text-ink-900"
          >
            Contact
          </a>
        </nav>
      </div>
    </footer>
  );
}
