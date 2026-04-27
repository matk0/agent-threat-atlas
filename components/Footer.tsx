import Link from "next/link";
import { site } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="border-t border-ink-100 bg-ink-50/40 mt-24">
      <div className="container-page grid grid-cols-1 gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="font-semibold text-ink-900">{site.name}</div>
          <p className="mt-3 text-sm text-ink-600 max-w-xs">
            {site.tagline}
          </p>
        </div>
        <FooterCol
          title="Learn"
          links={[
            { href: "/threats", label: "Threat catalog" },
            { href: "/surfaces", label: "Attack surfaces" },
            { href: "/playbooks", label: "Playbooks" },
            { href: "/resources", label: "Resources" },
          ]}
        />
        <FooterCol
          title="Stay current"
          links={[
            { href: "/incidents", label: "Incident feed" },
            { href: "/about", label: "About this site" },
          ]}
        />
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">
            Built by
          </div>
          <p className="mt-4 text-sm text-ink-700">
            <a
              className="font-semibold text-ink-900 hover:underline"
              href={site.consultant.orgUrl}
              target="_blank"
              rel="noreferrer"
            >
              {site.consultant.org}
            </a>
            <span className="block text-ink-500">
              {site.consultant.name}, {site.consultant.role}
            </span>
          </p>
          <a
            href={site.consultant.orgUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-xs font-medium text-accent-700 hover:underline"
          >
            Work with Clawforce One →
          </a>
        </div>
      </div>
      <div className="border-t border-ink-100">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.name}. Built as an educational
            resource. Nothing here is legal advice.
          </p>
          <p>
            Frameworks referenced: OWASP LLM Top 10 · NIST AI RMF · MITRE ATLAS
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">
        {title}
      </div>
      <ul className="mt-4 space-y-2">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link
              href={l.href}
              className="text-sm text-ink-700 transition hover:text-ink-900"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
