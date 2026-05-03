import { config, messages } from "./i18n";

// Central site configuration.
export const site = {
  name: "Agent Threat Atlas",
  shortName: "Atlas",
  tagline: messages.site.tagline,
  description: messages.site.description,
  domain: config.domain,
  domains: {
    en: "atlas.matejlukasik.com",
    sk: "atlas.matejlukasik.sk",
  },
  email: "matej@clawforceone.ai",
  consultant: {
    name: "Matej Lukasik",
    org: "Clawforce One",
    orgUrl: "https://clawforceone.ai",
    role: messages.site.consultantRole,
    pitch: messages.site.consultantPitch,
    calendly: "https://calendly.com/matejlukasik/intro",
  },
  nav: [
    { href: "/", label: messages.nav.liveAtlas },
    { href: "/threats", label: messages.nav.threatCategories },
    { href: "https://matejlukasik.com/contact", label: messages.nav.contact, external: true },
  ],
};

export type Severity = "critical" | "high" | "medium" | "low";

export const severityMeta: Record<
  Severity,
  { label: string; tone: string; ring: string }
> = {
  critical: {
    label: messages.severity.critical,
    tone: "bg-crit-50 text-crit-700",
    ring: "ring-crit-500/30",
  },
  high: {
    label: messages.severity.high,
    tone: "bg-warn-50 text-warn-700",
    ring: "ring-warn-500/30",
  },
  medium: {
    label: messages.severity.medium,
    tone: "bg-accent-50 text-accent-700",
    ring: "ring-accent-500/30",
  },
  low: {
    label: messages.severity.low,
    tone: "bg-ink-50 text-ink-600",
    ring: "ring-ink-300/40",
  },
};
