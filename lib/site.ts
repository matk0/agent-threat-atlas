import { config, messages } from "./i18n";

const consultantBaseUrl = "https://matejlukasik.com";
const consultantSkUrl = "https://matejlukasik.sk";
const atlasUtm =
  "utm_source=agent_threat_atlas&utm_medium=referral&utm_campaign=atlas_funnel";
const consultantRootBaseUrl =
  config.htmlLang === "sk" ? consultantSkUrl : consultantBaseUrl;
const consultantLandingAnchor =
  config.htmlLang === "sk" ? "bezpecnost-agentickej-ai" : "agentic-ai-security";
const consultantRootUrl = `${consultantRootBaseUrl}/#${consultantLandingAnchor}`;

function withAtlasUtm(url: string, content: string) {
  const [base, hash] = url.split("#");
  return hash ? `${base}?${atlasUtm}&utm_content=${content}#${hash}` : `${base}?${atlasUtm}&utm_content=${content}`;
}

const consultantLinks = {
  home: withAtlasUtm(consultantRootUrl, "consultant_byline"),
  navConsulting: withAtlasUtm(consultantRootUrl, "nav"),
  footer: withAtlasUtm(consultantRootUrl, "footer"),
  sectionCta: withAtlasUtm(consultantRootUrl, "section_cta"),
  contactRedirect: `${consultantBaseUrl}/contact?${atlasUtm}&utm_content=contact_redirect`,
};

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
    org: "MatejLukasik.com",
    orgUrl: consultantLinks.home,
    role: messages.site.consultantRole,
    pitch: messages.site.consultantPitch,
    links: consultantLinks,
    calendly: "https://calendly.com/matejlukasik/intro",
  },
  nav: [
    { href: "/", label: messages.nav.liveAtlas },
    { href: "/threats", label: messages.nav.threatCategories },
    { href: consultantLinks.navConsulting, label: messages.nav.contact, external: true },
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
