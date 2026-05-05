import { messages } from "@/lib/i18n";
import { site } from "@/lib/site";

export default function ContactRedirect() {
  return (
    <section className="container-page py-20">
      <meta httpEquiv="refresh" content={`0; url=${site.consultant.links.contactRedirect}`} />
      <p className="text-sm text-ink-600">
        {messages.contact.redirecting}{" "}
        <a
          className="font-medium text-accent-700 hover:underline plausible-event-name=Consulting+Click plausible-event-position=contact_redirect"
          href={site.consultant.links.contactRedirect}
        >
          matejlukasik.com/contact
        </a>
        .
      </p>
    </section>
  );
}
