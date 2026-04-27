import { Severity, severityMeta } from "@/lib/site";

export function SeverityPill({ severity }: { severity: Severity }) {
  const meta = severityMeta[severity];
  return (
    <span className={`pill ${meta.tone} ${meta.ring}`}>
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full bg-current opacity-70"
      />
      {meta.label}
    </span>
  );
}

export function Pill({
  children,
  tone = "ink",
}: {
  children: React.ReactNode;
  tone?: "ink" | "accent" | "warn" | "crit" | "ok";
}) {
  const map = {
    ink: "bg-ink-50 text-ink-700 ring-ink-200",
    accent: "bg-accent-50 text-accent-700 ring-accent-100",
    warn: "bg-warn-50 text-warn-700 ring-warn-500/20",
    crit: "bg-crit-50 text-crit-700 ring-crit-500/20",
    ok: "bg-ok-50 text-ok-700 ring-ok-500/20",
  } as const;
  return <span className={`pill ${map[tone]}`}>{children}</span>;
}
