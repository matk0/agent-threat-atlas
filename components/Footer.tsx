import Link from "next/link";
import { site } from "@/lib/site";
import { messages } from "@/lib/i18n";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-ink-100 bg-ink-50/35">
      <div className="container-page flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-semibold text-ink-900">{site.name}</div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-600">
            {site.tagline}
          </p>
          <p className="mt-2 text-sm leading-6 text-ink-600">
            {messages.about.builtBy}{" "}
            <a
              href={site.consultant.links.footer}
              className="font-medium text-ink-900 underline-offset-4 hover:underline plausible-event-name=Consulting+Click plausible-event-position=footer"
            >
              {site.consultant.name}
            </a>
            , {site.consultant.role}.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-600">
          <Link href="/" className="hover:text-ink-900">
            {messages.nav.liveAtlas}
          </Link>
          <Link href="/threats" className="hover:text-ink-900">
            {messages.nav.threatCategories}
          </Link>
          <a
            href={site.consultant.links.navContact}
            className="hover:text-ink-900 plausible-event-name=Consulting+Click plausible-event-position=footer_nav"
          >
            {messages.nav.contact}
          </a>
        </nav>
      </div>
    </footer>
  );
}
