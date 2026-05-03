import { messages } from "@/lib/i18n";

export default function ContactRedirect() {
  return (
    <section className="container-page py-20">
      <meta httpEquiv="refresh" content="0; url=https://matejlukasik.com/contact" />
      <p className="text-sm text-ink-600">
        {messages.contact.redirecting}{" "}
        <a className="font-medium text-accent-700 hover:underline" href="https://matejlukasik.com/contact">
          matejlukasik.com/contact
        </a>
        .
      </p>
    </section>
  );
}
