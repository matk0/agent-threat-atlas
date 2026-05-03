export const bestPractices: Record<string, string[]> = {
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
