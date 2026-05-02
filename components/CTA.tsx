import Link from "next/link";
import { site } from "@/lib/site";

export default function CTA() {
  return (
    <section className="border-t border-ink-100 bg-ink-50/40">
      <div className="container-page py-12">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">
              About this entry
            </div>
            <p className="mt-2 max-w-2xl text-sm text-ink-700">
              The Atlas is maintained by{" "}
              <a
                href={site.consultant.orgUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-ink-900 hover:underline"
              >
                {site.consultant.name} / {site.consultant.org}
              </a>{" "}
              as an open reference. If your team is wrestling with a specific
              version of this problem, get in touch.
            </p>
          </div>
          <a
            href="https://matejlukasik.com/contact"
            className="btn-secondary whitespace-nowrap"
          >
            Contact Matej →
          </a>
        </div>
      </div>
    </section>
  );
}
