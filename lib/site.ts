// Central site configuration.
export const site = {
  name: "Agent Threat Atlas",
  shortName: "Atlas",
  tagline:
    "A live atlas of agentic AI breaches and the controls that prevent them.",
  description:
    "Agent Threat Atlas is a live, public reference of agentic AI security incidents — each one mapped to the threat category it exemplifies and the controls that would have prevented it. Maintained by Matej Lukasik / Clawforce One.",
  domain: "atlas.clawforceone.ai",
  email: "matej@clawforceone.ai",
  consultant: {
    name: "Matej Lukasik",
    org: "Clawforce One",
    orgUrl: "https://clawforceone.ai",
    role: "Agentic AI Security Consultant",
    pitch:
      "I help engineering teams design, audit, and harden production agent systems before they get into trouble.",
    calendly: "https://calendly.com/matejlukasik/intro",
  },
  nav: [
    { href: "/threats", label: "Threats" },
    { href: "/surfaces", label: "Attack Surfaces" },
    { href: "/playbooks", label: "Playbooks" },
    { href: "/incidents", label: "Incident Feed" },
    { href: "/resources", label: "Resources" },
    { href: "/about", label: "About" },
  ],
};

export type Severity = "critical" | "high" | "medium" | "low";

export const severityMeta: Record<
  Severity,
  { label: string; tone: string; ring: string }
> = {
  critical: {
    label: "Critical",
    tone: "bg-crit-50 text-crit-700",
    ring: "ring-crit-500/30",
  },
  high: {
    label: "High",
    tone: "bg-warn-50 text-warn-700",
    ring: "ring-warn-500/30",
  },
  medium: {
    label: "Medium",
    tone: "bg-accent-50 text-accent-700",
    ring: "ring-accent-500/30",
  },
  low: {
    label: "Low",
    tone: "bg-ink-50 text-ink-600",
    ring: "ring-ink-300/40",
  },
};
