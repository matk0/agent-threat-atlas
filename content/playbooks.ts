export type PlaybookSection = {
  title: string;
  intro?: string;
  items: string[];
};

export type Playbook = {
  slug: string;
  title: string;
  short: string;
  audience: string;
  summary: string;
  sections: PlaybookSection[];
  relatedThreats: string[];
};

export const playbooks: Playbook[] = [
  {
    slug: "secure-by-design",
    title: "Secure-by-Design Agent Architecture",
    short: "Architecture checklist",
    audience: "Engineering leads & architects shipping a new agent",
    summary:
      "A pre-build checklist for designing an agent that won't make tomorrow's headlines. Use it before you write the system prompt.",
    sections: [
      {
        title: "Define the trust boundary",
        intro:
          "Before anything else, write down what is trusted and what is not. Almost every agent breach traces to an implicit assumption that something untrusted was actually trusted.",
        items: [
          "List every input source: user prompts, retrieved docs, tool responses, memory, other agents. Mark each as trusted or untrusted.",
          "Default everything to untrusted. The only trusted source should be your hardened system prompt.",
          "Decide whether the agent runs per-user, per-tenant, or shared. Document data isolation expectations.",
          "Identify which actions are reversible vs irreversible. The latter become human-in-the-loop gates.",
        ],
      },
      {
        title: "Scope the toolset to the task",
        items: [
          "Replace any 'run_sql', 'shell_exec', or 'send_email(any)' tool with narrow, single-purpose functions.",
          "For each tool, document: who can invoke it, with what scope, against what data, with what side effects.",
          "Mint short-lived per-run credentials with the smallest possible scope. No long-lived keys.",
          "Cap quotas: max calls per tool per run, max total tokens, max cost per user per day.",
        ],
      },
      {
        title: "Apply structural separation",
        items: [
          "Quarantine untrusted content from the planning context. Consider dual-LLM or CaMeL-style architectures.",
          "Tag every chunk in the context with its provenance and sensitivity level.",
          "Refuse to combine high-sensitivity data with outbound tools in the same turn.",
        ],
      },
      {
        title: "Make destructive actions unmissable",
        items: [
          "Define the list of 'requires approval' actions and enforce it at the orchestrator, not the prompt.",
          "Surface a structured plan with a diff before executing. Approvals expire.",
          "For autonomous loops, set hard step / depth / time / cost limits. Fail closed when exceeded.",
        ],
      },
      {
        title: "Plan for incident response from day one",
        items: [
          "Every tool call gets a structured audit log: actor identity, scope, inputs, outputs, originating message id.",
          "Define how you'll disable a tool, revoke a credential, or kill a run within minutes.",
          "Run a tabletop: 'a malicious doc was retrieved at 14:03 — what do we do?'",
        ],
      },
    ],
    relatedThreats: [
      "prompt-injection",
      "excessive-agency",
      "data-exfiltration",
      "identity-and-authorization",
    ],
  },
  {
    slug: "vendor-mcp-evaluation",
    title: "Vendor & MCP Server Evaluation",
    short: "Evaluation framework",
    audience: "Procurement, security review, and engineering leads",
    summary:
      "A structured questionnaire for vetting any new model vendor, agent platform, or MCP server before letting it near production data.",
    sections: [
      {
        title: "Data handling",
        items: [
          "Where is data processed and stored geographically? Can residency be enforced contractually?",
          "What's the default retention? Is true zero-retention available and how is it verified?",
          "Will my data be used for training? How is that opt-out enforced and audited?",
          "What sub-processors are involved? Are they listed and updated?",
        ],
      },
      {
        title: "Identity & access",
        items: [
          "What OAuth scopes does the integration request? Are they justified by the use case?",
          "Are credentials short-lived? Can scopes be elevated per-action?",
          "Can the system carry user identity through tool calls (token exchange, signed delegation)?",
        ],
      },
      {
        title: "MCP-specific checks",
        items: [
          "Pin the MCP server version. Review tool descriptions exactly as the model sees them.",
          "Run the server in a sandbox with restricted egress. Reject ones that need broad host access.",
          "Set up alerts for upstream changes; block silent updates.",
          "Ban tools whose descriptions contain imperative instructions referencing other tools or data.",
        ],
      },
      {
        title: "Model integrity",
        items: [
          "For open-weight models, prefer safetensors; verify cryptographic signatures.",
          "Maintain an ML-BOM (CycloneDX) entry for every model in production.",
          "Subscribe to vendor and CVE feeds for your model family.",
        ],
      },
      {
        title: "Operational maturity",
        items: [
          "Does the vendor publish a security policy, vulnerability disclosure program, and SOC 2 / ISO 27001 / ISO 42001 reports?",
          "How are prompt-injection and jailbreak findings triaged and disclosed?",
          "What is the SLA for security patches?",
        ],
      },
    ],
    relatedThreats: ["supply-chain", "privacy-and-compliance", "identity-and-authorization"],
  },
  {
    slug: "pre-prod-red-team",
    title: "Pre-Production Agent Red Team",
    short: "Red team checklist",
    audience: "Security engineers and ML evaluators",
    summary:
      "A reproducible red-team protocol to run before any agent feature reaches production. Designed to be embedded in CI.",
    sections: [
      {
        title: "Direct prompt injection",
        items: [
          "Test the canonical 'ignore previous instructions' families against every entry point.",
          "Test multilingual and obfuscated injection (base64, leetspeak, role-playing).",
          "Verify refusals are grounded in capability limits, not in detected bad words.",
        ],
      },
      {
        title: "Indirect prompt injection",
        items: [
          "Inject into every retrievable surface: docs, emails, tickets, web pages, MCP tool responses.",
          "Test cross-user injection in shared memory and shared summaries.",
          "Test 'split payload' attacks where the instruction spans multiple retrieved chunks.",
        ],
      },
      {
        title: "Tool abuse",
        items: [
          "Try to invoke tools the user shouldn't have access to.",
          "Try to escalate scope mid-run by chaining benign tools.",
          "Try to provoke phantom-tool / phantom-parameter behaviour.",
          "Try cost-based DoS: force long generations, deep recursion, expensive fan-outs.",
        ],
      },
      {
        title: "Exfiltration",
        items: [
          "Force markdown image rendering of attacker-controlled URLs containing private data.",
          "Force outbound tool calls (email, webhook, commit, ticket) to attacker-controlled targets.",
          "Try DNS / HTTPS Host-header smuggling from the code-exec sandbox.",
          "Test whether retrieved memory can leak across tenants or sessions.",
        ],
      },
      {
        title: "Output handling",
        items: [
          "Cause the model to emit XSS payloads, malicious markdown, and crafted SQL.",
          "Verify every renderer / interpreter downstream of the model is hardened.",
        ],
      },
      {
        title: "Reliability evals",
        items: [
          "Curate a corpus of unknown IDs, conflicting context, edge-case schemas.",
          "Run the suite each release; track pass rates as a product metric.",
          "Block release on regressions in critical-path scenarios.",
        ],
      },
    ],
    relatedThreats: [
      "prompt-injection",
      "excessive-agency",
      "data-exfiltration",
      "insecure-output-handling",
      "hallucination-and-reliability",
      "denial-of-service-and-cost",
    ],
  },
  {
    slug: "runtime-monitoring",
    title: "Runtime Monitoring & Guardrails",
    short: "Runtime guardrails",
    audience: "SRE, platform, and security operations",
    summary:
      "What to instrument and what to enforce in production so a rogue agent surfaces in minutes, not weeks.",
    sections: [
      {
        title: "Telemetry",
        items: [
          "Trace every run end-to-end: prompts, tool calls, tool responses, memory reads/writes, final outputs.",
          "Tag every event with run id, agent id, user id, tenant, model, version, scope.",
          "Stream cost (tokens × price) alongside traces for real-time spend visibility.",
        ],
      },
      {
        title: "Real-time guardrails",
        items: [
          "Egress allow-lists: code-execution / fetch tools can only reach pre-approved hosts.",
          "DLP on outbound text: block when secrets, PII, or proprietary IP appear.",
          "Anomaly detection on cost-per-run, depth, tool-call patterns; auto-pause on spikes.",
          "Per-tenant rate limits and budgets; fail closed.",
        ],
      },
      {
        title: "Independent monitor agent",
        items: [
          "Run a read-only observer that watches the live trace for goal drift, runaway loops, exfil patterns.",
          "Empower it to pull a kill switch without human approval for clear violations.",
          "Periodically test the kill switch with chaos drills.",
        ],
      },
      {
        title: "Logging & retention",
        items: [
          "Redact PII before logs hit storage. Restrict raw-trace access to a small auditor group.",
          "Set retention to the minimum required; encrypt at rest with customer-managed keys for regulated data.",
        ],
      },
    ],
    relatedThreats: [
      "data-exfiltration",
      "excessive-agency",
      "denial-of-service-and-cost",
      "privacy-and-compliance",
    ],
  },
  {
    slug: "incident-response",
    title: "Incident Response for Agent Compromises",
    short: "Incident response",
    audience: "Security leadership, on-call engineers",
    summary:
      "When you discover an agent did something it shouldn't have, the next thirty minutes matter. Here's the playbook.",
    sections: [
      {
        title: "Contain (0–15 minutes)",
        items: [
          "Disable the affected tool(s) at the platform layer; flip a feature flag rather than waiting on a deploy.",
          "Revoke per-run credentials and short-lived tokens for the impacted scope.",
          "Pause the affected agent fleet; route requests to a static fallback or maintenance message.",
          "If a third-party MCP server or model is implicated, disconnect it from all runtimes.",
        ],
      },
      {
        title: "Triage (15 minutes – 2 hours)",
        items: [
          "Pull the full trace for the offending run(s). Identify the originating message and propagation path.",
          "Determine the trust boundary that was crossed: was it an injection? a misconfigured scope? a hallucinated action?",
          "Quantify blast radius: which users, which tenants, which data, which downstream systems?",
        ],
      },
      {
        title: "Eradicate (2 – 24 hours)",
        items: [
          "Patch the trust-boundary failure, not just the symptom. If a tool was over-scoped, narrow it; don't just block one prompt.",
          "If memory was poisoned, purge affected entries and re-evaluate dependent runs.",
          "If credentials leaked, rotate everything in that scope, not only the obvious one.",
        ],
      },
      {
        title: "Communicate",
        items: [
          "Notify affected customers within the contractual / regulatory window. For EU subjects, GDPR Art. 33 can be 72 hours.",
          "Brief executive stakeholders with a one-page narrative + cost estimate.",
          "If the root cause is upstream (vendor, model, MCP server), coordinate disclosure responsibly.",
        ],
      },
      {
        title: "Learn",
        items: [
          "Post-mortem within five business days. Add the failure mode to the red-team suite so it can never silently regress.",
          "Update the threat catalog and playbooks. Share learnings publicly when appropriate.",
        ],
      },
    ],
    relatedThreats: [
      "excessive-agency",
      "data-exfiltration",
      "supply-chain",
      "hallucination-and-reliability",
    ],
  },
];

export const playbookBySlug = (slug: string) =>
  playbooks.find((p) => p.slug === slug);
