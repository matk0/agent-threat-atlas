import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { threats, threatBySlug, type Threat } from "@/content/threats";
import { incidents } from "@/content/incidents";
import { SeverityPill, Pill } from "@/components/Pill";
import { formatDate } from "@/lib/format";

type Params = { slug: string };

const BEST_PRACTICES: Record<string, string[]> = {
  "prompt-injection": [
    "Keep privileged instructions separate from retrieved content, emails, webpages, tickets, and tool output.",
    "Default-deny tool calls triggered by untrusted content; require structured plans for any external send or write.",
    "Tag context by source and trust level so reviewers can see what influenced the action.",
    "Test with indirect prompt-injection fixtures before every production release.",
  ],
  "excessive-agency": [
    "Replace broad tools with narrow, task-specific tools that encode business rules in code.",
    "Require human approval for delete, deploy, transfer, external-send, and permission-change actions.",
    "Mint short-lived credentials per run instead of letting agents inherit broad user scopes.",
    "Log every tool call with actor, scope, input, output, and originating message.",
  ],
  "data-exfiltration": [
    "Block unapproved outbound destinations from agent runtimes and code sandboxes.",
    "Disable automatic rendering or fetching of attacker-controlled URLs in model output.",
    "Run DLP checks before content reaches email, webhook, browser, ticket, or messaging tools.",
    "Partition memory and retrieval by tenant, user, data label, and current task.",
  ],
  "supply-chain": [
    "Pin agent frameworks, MCP servers, prompts, and model versions; review changes before rollout.",
    "Run third-party tools in isolated environments with minimal filesystem and network access.",
    "Verify package provenance, signatures, owners, and release history before adoption.",
    "Monitor tool descriptions and responses for unexpected instruction changes.",
  ],
  "identity-and-authorization": [
    "Authorize every tool call against the current user, tenant, task, and requested action.",
    "Use scoped delegated tokens instead of shared service accounts for user-facing agents.",
    "Make sensitive scopes step-up privileges, not one-time blanket grants.",
    "Test cross-tenant, confused-deputy, and stale-session cases as first-class security tests.",
  ],
  "hallucination-and-reliability": [
    "Validate high-impact facts against source systems before the agent can act on them.",
    "Use schemas, invariants, and deterministic checks around tool inputs and outputs.",
    "Keep rollback paths ready for every write action the agent can perform.",
    "Prefer smaller verifiable steps over long autonomous chains.",
  ],
  "multi-agent-coordination": [
    "Treat messages from other agents as untrusted input unless provenance and permissions are explicit.",
    "Define clear ownership of state, tools, and final decisions across agent roles.",
    "Add arbitration and circuit breakers for conflicting or repetitive agent actions.",
    "Trace cross-agent handoffs so failures can be reconstructed.",
  ],
  "privacy-and-compliance": [
    "Minimize personal data before it reaches the model or long-term memory.",
    "Enforce residency, retention, consent, and purpose limits at retrieval time.",
    "Redact or tokenize sensitive fields by default; reveal only when the task requires it.",
    "Keep audit records that show what data was processed, why, and by which agent path.",
  ],
  "denial-of-service-and-cost": [
    "Set hard budgets for tokens, tool calls, retries, browser actions, and infrastructure spend.",
    "Use circuit breakers for loops, repeated failures, and unexpected fan-out.",
    "Queue expensive actions behind rate limits and anomaly alerts.",
    "Fail closed when limits are reached instead of asking the model to self-regulate.",
  ],
  "insecure-output-handling": [
    "Treat model output like user input: escape, sanitize, validate, and parameterize it.",
    "Never execute generated code, SQL, shell, HTML, or markdown in a privileged context without controls.",
    "Render untrusted output in isolated contexts with strict content security policy.",
    "Test downstream parsers and renderers with malicious model-output fixtures.",
  ],
};

export async function generateStaticParams(): Promise<Params[]> {
  return threats.map((threat) => ({ slug: threat.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const threat = threatBySlug(params.slug);
  if (!threat) return {};
  return { title: threat.title, description: threat.summary };
}

export default function ThreatDetail({ params }: { params: Params }) {
  const threat = threatBySlug(params.slug);
  if (!threat) return notFound();

  const related = incidents
    .filter((incident) => incident.threats.includes(threat.slug))
    .sort((a, b) => b.date.localeCompare(a.date));
  const bestPractices = bestPracticesFor(threat);

  return (
    <>
      <header className="border-b border-ink-100 bg-ink-50/35">
        <div className="container-page py-10 sm:py-12">
          <Link href="/threats" className="text-sm text-ink-500 hover:text-ink-900">
            ← Threat categories
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <SeverityPill severity={threat.severity} />
            <Pill tone="ink">{related.length} linked incidents</Pill>
          </div>
          <h1 className="mt-4 max-w-4xl text-3xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
            {threat.title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-ink-600 sm:text-lg">
            {threat.summary}
          </p>
        </div>
      </header>

      <article className="container-page grid gap-8 py-10 lg:grid-cols-12">
        <div className="space-y-12 lg:col-span-8">
          <Block heading="What it is">
            <div className="space-y-4 text-base leading-7 text-ink-700">
              {threat.whatItIs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </Block>

          <Block heading="How attacks happen">
            <div className="grid gap-3 sm:grid-cols-2">
              {threat.howItHappens.map((item) => (
                <ExplainerCard key={item.title} title={item.title}>
                  {item.body}
                </ExplainerCard>
              ))}
            </div>
          </Block>

          <Block heading="How to prevent it">
            <ol className="space-y-3">
              {threat.mitigations.map((mitigation, index) => (
                <li
                  key={mitigation.title}
                  className="rounded-xl border border-ink-100 bg-white p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-50 text-xs font-semibold text-accent-700">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold text-ink-900">
                        {mitigation.title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-ink-700">
                        {mitigation.body}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Block>

          <Block heading="Best practices">
            <ul className="grid gap-3 sm:grid-cols-2">
              {bestPractices.map((practice) => (
                <li
                  key={practice}
                  className="rounded-xl border border-ink-100 bg-white p-4 text-sm leading-6 text-ink-700"
                >
                  <span className="mr-2 font-semibold text-accent-700">•</span>
                  {practice}
                </li>
              ))}
            </ul>
          </Block>

          {threat.realWorld.length > 0 && (
            <Block heading="Known examples">
              <div className="space-y-3">
                {threat.realWorld.map((example) => (
                  <div
                    key={example.name}
                    className="rounded-xl border border-ink-100 bg-white p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-ink-900">
                        {example.name}
                      </h3>
                      <span className="text-xs font-medium text-ink-500">
                        {example.year}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-ink-700">
                      {example.note}
                    </p>
                  </div>
                ))}
              </div>
            </Block>
          )}

          <Block heading="Framework mapping">
            <div className="grid gap-3 sm:grid-cols-2">
              {threat.frameworks.map((framework) => (
                <div
                  key={framework.name}
                  className="rounded-xl border border-ink-100 bg-white p-5"
                >
                  <h3 className="text-sm font-semibold leading-6 text-ink-900">
                    {framework.name}
                  </h3>
                  <p className="mt-1 text-xs uppercase tracking-wider text-ink-500">
                    {framework.ref}
                  </p>
                </div>
              ))}
            </div>
          </Block>

          {related.length > 0 && (
            <Block heading="Related incidents">
              <ul className="divide-y divide-ink-100 overflow-hidden rounded-xl border border-ink-100 bg-white">
                {related.slice(0, 8).map((incident) => (
                  <li key={incident.id} className="p-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
                      <SeverityPill severity={incident.severity} />
                      <time>{formatDate(incident.date)}</time>
                      <span>/</span>
                      <span>{incident.source}</span>
                    </div>
                    <a
                      href={incident.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 block text-sm font-semibold leading-6 text-ink-900 hover:text-accent-700"
                    >
                      {incident.headline}
                    </a>
                    {(incident.preventionNote || threat.mitigations[0]) && (
                      <p className="mt-2 text-sm leading-6 text-ink-600">
                        <span className="font-semibold text-ink-900">
                          Prevention:{" "}
                        </span>
                        {incident.preventionNote ?? threat.mitigations[0].body}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </Block>
          )}
        </div>

        <aside className="lg:col-span-4">
          <div className="sticky top-24 space-y-5">
            <SidebarCard title="Category snapshot">
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wider text-ink-500">
                    Severity
                  </dt>
                  <dd className="mt-1">
                    <SeverityPill severity={threat.severity} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-ink-500">
                    Linked incidents
                  </dt>
                  <dd className="mt-1 font-semibold text-ink-900">
                    {related.length}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-ink-500">
                    Affected surfaces
                  </dt>
                  <dd className="mt-2 flex flex-wrap gap-2">
                    {threat.surfaces.map((surface) => (
                      <Pill key={surface} tone="ink">
                        {surface}
                      </Pill>
                    ))}
                  </dd>
                </div>
              </dl>
            </SidebarCard>

            <SidebarCard title="Implementation focus">
              <ul className="space-y-2 text-sm leading-6 text-ink-700">
                {bestPractices.slice(0, 3).map((practice) => (
                  <li key={practice}>{practice}</li>
                ))}
              </ul>
            </SidebarCard>
          </div>
        </aside>
      </article>
    </>
  );
}

function bestPracticesFor(threat: Threat) {
  return BEST_PRACTICES[threat.slug] ?? threat.mitigations.map((item) => item.body);
}

function Block({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-600">
        {heading}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ExplainerCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-5">
      <h3 className="font-semibold text-ink-900">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-ink-700">{children}</p>
    </div>
  );
}

function SidebarCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-5">
      <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">
        {title}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
