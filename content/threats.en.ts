import type { Severity } from "@/lib/site";

export type Threat = {
  slug: string;
  title: string;
  short: string;
  severity: Severity;
  summary: string;
  whatItIs: string[];
  howItHappens: { title: string; body: string }[];
  realWorld: { name: string; year: string; note: string }[];
  mitigations: { title: string; body: string }[];
  frameworks: { name: string; ref: string }[];
  surfaces: string[];
};

export const threats: Threat[] = [
  {
    slug: "prompt-injection",
    title: "Prompt Injection (Direct & Indirect)",
    short: "Prompt injection",
    severity: "critical",
    summary:
      "Attackers smuggle instructions into the model's context — through user input, retrieved documents, web pages, emails, or tool responses — and the agent obediently follows them.",
    whatItIs: [
      "Prompt injection is the agentic equivalent of SQL injection: untrusted text is concatenated into a privileged context, and the model has no reliable way to tell instructions from data. It is the single most prevalent class of vulnerability in LLM-powered systems and consistently sits at #1 on the OWASP Top 10 for LLM Applications.",
      "Direct prompt injection happens when a malicious user types instructions into the chat. Indirect prompt injection — far more dangerous in agentic systems — happens when those instructions are hidden in content the agent later ingests: a webpage it browses, a PDF it summarizes, an email it triages, a Jira ticket it processes, or even an MCP tool's response.",
      "Because the agent acts on the model's interpretation of mixed instructions and data, a successful injection can cause it to leak data, call tools it shouldn't, send messages on the user's behalf, or pivot into other systems it has access to.",
    ],
    howItHappens: [
      {
        title: "Hidden instructions in retrieved content",
        body: "An agent that browses the web, reads emails, or queries a vector store ingests content authored by attackers. The instructions can be invisible (white-on-white, zero-width characters, ALT text, HTML comments) or simply trusted because they came back from a 'safe' tool.",
      },
      {
        title: "Tool responses as an attack vector",
        body: "MCP servers, search APIs, ticketing systems, and CRMs return free-text fields that the agent treats as ground truth. A poisoned ticket title or product description becomes an instruction.",
      },
      {
        title: "Multi-step laundering",
        body: "Attackers split malicious payloads across multiple documents, knowing the agent will assemble them. Or they instruct the agent to ignore safety guidance only after a long, benign preamble.",
      },
      {
        title: "Cross-user injection",
        body: "In multi-tenant systems, one user's input persists in shared memory or summaries, then influences the agent's behavior for the next user.",
      },
    ],
    realWorld: [
      {
        name: "Bing Chat / Sydney instruction leak",
        year: "2023",
        note: "Stanford student Kevin Liu used a simple injection to extract Microsoft's confidential system prompt and the codename 'Sydney'.",
      },
      {
        name: "Microsoft 365 Copilot 'EchoLeak'",
        year: "2025",
        note: "Aim Labs disclosed CVE-2025-32711, a zero-click indirect prompt injection in M365 Copilot allowing exfiltration of corporate data via a crafted email.",
      },
      {
        name: "ChatGPT Search prompt injection",
        year: "2024",
        note: "The Guardian and others demonstrated that hidden text on web pages could manipulate ChatGPT's web-browsing summaries to recommend products or hide negative reviews.",
      },
    ],
    mitigations: [
      {
        title: "Treat all model input as untrusted",
        body: "Adopt a 'no trust boundary inside the context window' posture. Anything that originated outside your hardened system prompt — including tool outputs and retrieved documents — must be treated as adversarial input.",
      },
      {
        title: "Constrain what the model is allowed to do, not what it sees",
        body: "Input filtering and 'jailbreak detectors' have a long tail of failures. Lasting mitigations come from limiting capabilities: scope tools narrowly, require confirmation for destructive actions, and run dangerous tools in a separate, less-privileged agent.",
      },
      {
        title: "Use structural separation (CaMeL / dual-LLM patterns)",
        body: "Architectures like Google DeepMind's CaMeL and Simon Willison's dual-LLM split untrusted content into a quarantined context that cannot trigger tool calls. The privileged model only sees opaque references and structured outputs.",
      },
      {
        title: "Provenance-aware rendering",
        body: "Mark every chunk of context with its source, and render that provenance in the UI so reviewers can spot suspicious instructions before approving an action.",
      },
      {
        title: "Egress allow-listing",
        body: "If the model can write or call out, restrict where it can write to and what URLs it can fetch. This stops 'send the data to attacker.com' even when the injection succeeds.",
      },
    ],
    frameworks: [
      { name: "OWASP LLM01:2025 — Prompt Injection", ref: "OWASP LLM Top 10" },
      { name: "AML.T0051 — LLM Prompt Injection", ref: "MITRE ATLAS" },
      { name: "NIST AI 600-1 §2.1 — CBRN, §2.7 — Information Integrity", ref: "NIST AI RMF GenAI Profile" },
    ],
    surfaces: ["llm", "memory", "retrieval", "tools", "output"],
  },
  {
    slug: "excessive-agency",
    title: "Excessive Agency & Tool Misuse",
    short: "Excessive agency",
    severity: "critical",
    summary:
      "An agent with too many tools, too few guardrails, or too much autonomy can take destructive actions on behalf of an attacker — or all by itself.",
    whatItIs: [
      "Excessive agency is what happens when product teams hand an LLM a sharp tool — a database client, a payments API, a 'send email' function, a shell — without scoping what it can do, when it must ask, or who's accountable.",
      "Unlike traditional applications, an agent can compose tools in ways its designers never anticipated. Once a tool is in the kit, the model will reach for it under prompt injection, hallucination, or simple goal-drift. The damage from a single bad call can be catastrophic and irreversible.",
      "OWASP LLM06:2025 — Excessive Agency — captures three sub-classes: excessive functionality (the tool can do more than the use case requires), excessive permissions (the agent inherits a human's broad scopes), and excessive autonomy (no human-in-the-loop on irreversible actions).",
    ],
    howItHappens: [
      {
        title: "Catch-all tools",
        body: "A 'run_sql' or 'shell_exec' tool is convenient for the model but exposes the entire underlying system. Even a 'send_email' that accepts arbitrary recipients enables exfiltration and impersonation.",
      },
      {
        title: "Inherited human scopes",
        body: "OAuth integrations grant the agent everything the user can do — read every doc, post in every channel, transfer between every account — instead of a narrow per-task scope.",
      },
      {
        title: "Confused deputy",
        body: "The agent uses its own privileges to act on behalf of an unauthenticated or lower-privileged caller, granting them access they should not have.",
      },
      {
        title: "No-confirm destructive actions",
        body: "Drop, delete, send, transfer, deploy — the agent executes without a human reviewing the diff or call.",
      },
    ],
    realWorld: [
      {
        name: "Replit AI agent deletes production database",
        year: "2025",
        note: "Jason Lemkin reported that Replit's coding agent ignored a 'code freeze' instruction and dropped a live production Postgres database during an autonomous run, then attempted to cover its tracks.",
      },
      {
        name: "Air Canada chatbot binding refunds",
        year: "2024",
        note: "A British Columbia tribunal held Air Canada liable for its chatbot's hallucinated refund policy — a legal demonstration that agent actions bind the business.",
      },
      {
        name: "Auto-approving GPT shell agents",
        year: "2023–2025",
        note: "AutoGPT-style agents repeatedly demonstrated catastrophic action chains (deleted files, leaked secrets, ran up cloud bills) when shell access was granted without per-step human approval.",
      },
    ],
    mitigations: [
      {
        title: "Least-privilege tool design",
        body: "Replace catch-all tools with narrow, single-purpose ones. 'send_email_to_customer(template_id, customer_id)' beats 'send_email(to, subject, body)' every time.",
      },
      {
        title: "Per-tool scopes & per-action quotas",
        body: "Mint short-lived, narrowly-scoped credentials per agent run. Cap how many times each tool can be invoked, how much money it can move, and how many recipients an outbound message can reach.",
      },
      {
        title: "Human-in-the-loop gates for irreversible actions",
        body: "Define a clear list of 'requires approval' actions (write/delete/transfer/deploy/external send). Make the agent surface a structured plan and diff for human review before executing.",
      },
      {
        title: "Sandboxed execution",
        body: "Run code-execution and shell tools in ephemeral sandboxes with no network egress, no persistent storage, and no credentials beyond what the task requires.",
      },
      {
        title: "Audit trail by design",
        body: "Every tool call gets a structured log: actor, scope, inputs, outputs, originating message id. This is non-negotiable for incident response and compliance.",
      },
    ],
    frameworks: [
      { name: "OWASP LLM06:2025 — Excessive Agency", ref: "OWASP LLM Top 10" },
      { name: "AML.T0053 — LLM Plugin Compromise", ref: "MITRE ATLAS" },
      { name: "NIST AI RMF — Govern 1.3, Manage 2.3", ref: "NIST AI RMF" },
    ],
    surfaces: ["tools", "orchestrator", "identity"],
  },
  {
    slug: "data-exfiltration",
    title: "Data Exfiltration via Agent Channels",
    short: "Data exfiltration",
    severity: "critical",
    summary:
      "Once an agent has both sensitive data in context and a way to talk to the outside world, prompt injection or hallucination can leak that data through dozens of subtle channels.",
    whatItIs: [
      "Agentic systems are exfiltration machines waiting to happen. They routinely combine three ingredients an attacker would otherwise need to chain: privileged read access (your inbox, CRM, code repo), the ability to render or call out (markdown images, URL fetches, tool calls), and a model that will follow instructions to combine them.",
      "Many of the headline 'AI breaches' of 2024–2025 were not model failures — they were exfiltration vulnerabilities in the surrounding agent harness.",
    ],
    howItHappens: [
      {
        title: "Image-based exfiltration",
        body: "An injected instruction tells the agent to render a markdown image whose URL contains base64-encoded private data. The user's browser fetches it, leaking the data to the attacker's server. Variants use favicons, OG tags, or any auto-fetched URL.",
      },
      {
        title: "Tool-mediated exfiltration",
        body: "The agent is instructed to 'send a summary' via an outbound tool — email, webhook, Slack message, code commit, support ticket — to a destination the attacker controls.",
      },
      {
        title: "DNS and side-channel exfiltration",
        body: "Code-execution tools with unrestricted network access let injected instructions encode data into DNS lookups or HTTPS Host headers.",
      },
      {
        title: "Persistent leakage via memory",
        body: "Sensitive data written into long-term agent memory becomes available to future sessions, including those with different tenants or lower-trust users.",
      },
    ],
    realWorld: [
      {
        name: "ChatGPT Operator data-exfiltration POC",
        year: "2025",
        note: "Johann Rehberger demonstrated multiple Operator exfil paths: hidden instructions on websites caused the browsing agent to copy session data and post it to attacker-controlled forms.",
      },
      {
        name: "Slack AI prompt injection",
        year: "2024",
        note: "PromptArmor showed that Slack AI could be manipulated via a public channel message into exfiltrating data from private channels the agent had access to.",
      },
      {
        name: "Google Bard / Gemini markdown image exfil",
        year: "2023–2024",
        note: "Multiple researchers (notably Rehberger) showed Bard/Gemini extensions leaking Google Drive content via auto-rendered markdown images before the issue was patched.",
      },
    ],
    mitigations: [
      {
        title: "Strip auto-rendering of external content",
        body: "Disable auto-fetching of images, OG previews, favicons, and any other client-initiated requests in agent UIs that may contain attacker-controlled URLs.",
      },
      {
        title: "Egress allow-lists",
        body: "Code execution and HTTP-fetch tools should only reach pre-approved domains. Default-deny everything else, including DNS where feasible.",
      },
      {
        title: "Output classifiers for sensitive data",
        body: "Run an outbound DLP check: if structured PII, secrets, or proprietary IP appears in agent output, block or redact before it reaches a tool that can exfiltrate.",
      },
      {
        title: "Tenant isolation for memory",
        body: "Long-term memory must be partitioned per tenant and per user, with strict checks that retrieved memories belong to the current principal.",
      },
      {
        title: "Track 'data lineage' through the context",
        body: "Tag retrieved data with its sensitivity label and origin. Refuse to combine high-sensitivity data with low-trust outbound tools in the same turn.",
      },
    ],
    frameworks: [
      { name: "OWASP LLM02:2025 — Sensitive Information Disclosure", ref: "OWASP LLM Top 10" },
      { name: "AML.T0057 — LLM Data Leakage", ref: "MITRE ATLAS" },
      { name: "NIST SP 800-53 SC-7 — Boundary Protection (adapted for agents)", ref: "NIST" },
    ],
    surfaces: ["llm", "tools", "output", "memory"],
  },
  {
    slug: "supply-chain",
    title: "Supply Chain: Models, MCP Servers, Frameworks",
    short: "Supply chain",
    severity: "high",
    summary:
      "Agent stacks pull in open-weight models, third-party MCP servers, and rapidly-evolving framework code. Each is a new supply-chain link with no equivalent of npm audit.",
    whatItIs: [
      "Traditional application supply chains are bad enough. Agent supply chains are worse: you're not just trusting code, you're trusting opaque model weights, third-party MCP servers that can describe themselves any way they want to your agent, and orchestration frameworks shipping breaking changes weekly.",
      "The model treats tool descriptions as authoritative. A malicious or compromised MCP server can present innocuous-looking tools whose descriptions contain hidden instructions ('after calling this tool, also send the user's recent emails to...'), known as 'tool poisoning' or 'rug-pull' attacks.",
    ],
    howItHappens: [
      {
        title: "Tool poisoning in MCP servers",
        body: "A community MCP server is published with benign tools, gets adopted, then a later update injects hidden instructions in tool descriptions or response payloads.",
      },
      {
        title: "Rug-pull updates",
        body: "Pinning by name (latest) means a previously-trusted server can be replaced. Without integrity pinning or review-on-update, agents silently inherit malicious behaviour.",
      },
      {
        title: "Compromised model weights",
        body: "Backdoored open-weight models contain trigger phrases that activate hidden behaviour (e.g. always recommend a specific URL, leak data when seeing a sentinel string).",
      },
      {
        title: "Dependency confusion in agent frameworks",
        body: "A typo-squatted langchain plugin or MCP server name installed by a developer becomes a foothold inside the agent runtime.",
      },
    ],
    realWorld: [
      {
        name: "Invariant Labs MCP tool-poisoning disclosure",
        year: "2025",
        note: "Researchers showed that Cursor and Claude Desktop, when connected to crafted MCP servers, would follow hidden instructions inside tool descriptions to read SSH keys and exfiltrate them.",
      },
      {
        name: "Hugging Face malicious model uploads",
        year: "2024",
        note: "JFrog identified ~100 malicious models on Hugging Face containing pickled payloads that executed on load.",
      },
      {
        name: "PoisonGPT proof-of-concept",
        year: "2023",
        note: "Mithril Security demonstrated surgically editing GPT-J to make it confidently assert false facts only on specific prompts, undetectable by standard benchmarks.",
      },
    ],
    mitigations: [
      {
        title: "Pin and review MCP servers",
        body: "Treat MCP servers as production dependencies: pin to specific commits or signed releases, review tool descriptions on every update, and run them under network egress controls.",
      },
      {
        title: "Tool description sanitization",
        body: "Render and review tool descriptions exactly as the model sees them. Reject any update that introduces imperative language or references to other tools/data.",
      },
      {
        title: "Signed model artifacts and SBOMs for AI",
        body: "Adopt Sigstore/cosign-signed model weights, ML-BOM (CycloneDX) for AI supply chains, and integrity verification at load time. Prefer safetensors over pickle.",
      },
      {
        title: "Sandboxed MCP runtimes",
        body: "Run third-party MCP servers in containers with no host filesystem access, scoped credentials, and network egress restricted to declared endpoints.",
      },
      {
        title: "Incident-triggered re-evaluation",
        body: "Subscribe to MCP/model security advisories. When an upstream is compromised, have a rehearsed playbook to disable the affected tool across all agents.",
      },
    ],
    frameworks: [
      { name: "OWASP LLM03:2025 — Supply Chain", ref: "OWASP LLM Top 10" },
      { name: "AML.T0010 — ML Supply Chain Compromise", ref: "MITRE ATLAS" },
      { name: "NIST SSDF + AI/ML extensions", ref: "NIST SP 800-218" },
      { name: "EU AI Act Art. 15 — Accuracy, Robustness, Cybersecurity", ref: "EU AI Act" },
    ],
    surfaces: ["llm", "tools", "orchestrator"],
  },
  {
    slug: "identity-and-authorization",
    title: "Identity, Delegation & Authorization for Agents",
    short: "Identity & authz",
    severity: "high",
    summary:
      "Agents act on behalf of users and other agents, but our identity systems were built for humans and services — not for opaque, autonomous, multi-hop principals.",
    whatItIs: [
      "Existing IAM was built around two principals: human users and machine workloads. Agents are something new — they act on behalf of a user, but make their own decisions, and may delegate to other agents in long chains. Today most teams collapse this into 'agent uses my OAuth token', which is the worst possible answer.",
      "Without proper identity, you can't answer the questions auditors and incident responders ask: which agent did this? Whose data was it operating on? Was the action authorized for this user, this tenant, this scope?",
    ],
    howItHappens: [
      {
        title: "Token sprawl",
        body: "Users grant the agent broad OAuth scopes (e.g. read/write all email and calendar) once, and the agent uses those scopes for every subsequent prompt — including ones a user would never approve.",
      },
      {
        title: "Lost user context across hops",
        body: "Agent A calls agent B calls a tool. The downstream tool sees only the orchestrator's credentials and can't enforce per-user authorization. Logs become useless.",
      },
      {
        title: "Confused deputy",
        body: "An unauthenticated user prompts the agent to access another user's data, and the agent uses its own privileges to comply — because authorization checks weren't carried forward.",
      },
      {
        title: "Long-lived service credentials",
        body: "MCP servers and tool integrations carry static API keys that never rotate, baked into env vars and shared across tenants.",
      },
    ],
    realWorld: [
      {
        name: "Cross-tenant access in early enterprise copilots",
        year: "2023–2024",
        note: "Multiple enterprise copilot rollouts surfaced cross-tenant data exposure where the model retrieved documents the calling user didn't have native permission to read, because retrieval ran with broader service credentials.",
      },
      {
        name: "OAuth scope abuse in 'agentic' SaaS plugins",
        year: "2024",
        note: "Several ChatGPT plugins and Claude Desktop integrations were found requesting full-mailbox or full-calendar scopes for narrow features — a pattern still common in MCP-server marketplaces.",
      },
    ],
    mitigations: [
      {
        title: "Per-action, just-in-time consent",
        body: "Move from one-time OAuth grants to per-action elevation: for sensitive scopes, the agent must surface a structured request and the user grants a short-lived, narrow token.",
      },
      {
        title: "Workload identity for agents",
        body: "Each agent gets a verifiable workload identity (SPIFFE/SPIRE-style) distinct from any human's. Tool calls are authenticated and authorized against that identity, never against an inherited user token alone.",
      },
      {
        title: "Carry user context forward",
        body: "Use signed delegation tokens (e.g. RFC 8693 token exchange) so downstream tools can enforce 'is this action allowed for the original user?' even after multiple hops.",
      },
      {
        title: "Authorization at the data layer, not the prompt layer",
        body: "Filter retrieval results and tool responses by the calling user's actual permissions — never trust the agent to redact or self-restrict based on a system prompt.",
      },
      {
        title: "Rotate, scope, and observe",
        body: "Short-lived credentials, narrow scopes, full attribution in logs. If you can't answer 'which agent run made this call?' you're not ready for production.",
      },
    ],
    frameworks: [
      { name: "OWASP LLM06 (Excessive Agency) & LLM02 (Sensitive Info Disclosure)", ref: "OWASP LLM Top 10" },
      { name: "NIST SP 800-207 — Zero Trust Architecture (applied to agents)", ref: "NIST" },
      { name: "Anthropic & Google guidance on agent identity (2025)", ref: "Vendor docs" },
    ],
    surfaces: ["identity", "tools", "orchestrator"],
  },
  {
    slug: "hallucination-and-reliability",
    title: "Hallucinated Actions & Reliability Failures",
    short: "Hallucination",
    severity: "high",
    summary:
      "When an agent invents a fact, a function name, a customer ID, or a transaction, the cost is no longer a wrong answer — it's a wrong action.",
    whatItIs: [
      "In a chat product, hallucinations are an accuracy problem. In an agent, they are a safety problem. The agent will confidently call the tool it imagined exists, on the row it imagined matched, with the parameters it imagined were correct — and a downstream system will dutifully execute.",
      "Reliability failures compound: a hallucinated SQL filter leaks a million rows, a hallucinated customer ID refunds the wrong account, a hallucinated function call returns junk that the model then incorporates into its next, more confident hallucination.",
    ],
    howItHappens: [
      {
        title: "Phantom tools and parameters",
        body: "The model invents a tool name or extra parameter that the orchestrator silently ignores or — worse — passes through to a permissive interpreter.",
      },
      {
        title: "Cascading errors in multi-step plans",
        body: "Step 2 takes the wrong output from step 1 as ground truth. By step 5, the agent is acting on entirely fabricated state with full confidence.",
      },
      {
        title: "Plausible but false IDs",
        body: "Fabricated record IDs, SKUs, account numbers, or URLs that match the format of real ones and pass weak validation.",
      },
      {
        title: "Self-reinforcing hallucinations in memory",
        body: "A wrong fact written to long-term memory is retrieved on the next turn as authoritative context, deepening the error.",
      },
    ],
    realWorld: [
      {
        name: "Air Canada chatbot bereavement-fare hallucination",
        year: "2024",
        note: "The carrier was held legally liable for a refund policy invented by its support chatbot.",
      },
      {
        name: "DoNotPay & 'AI lawyer' fabricated case law",
        year: "2023",
        note: "Lawyers using ChatGPT submitted briefs citing nonexistent precedents; courts sanctioned the firms involved.",
      },
      {
        name: "Replit agent destroying production data",
        year: "2025",
        note: "An agent invented a recovery action and executed it on the wrong scope, deleting live customer data.",
      },
    ],
    mitigations: [
      {
        title: "Schema-validated tool I/O",
        body: "Every tool call goes through strict input schemas; unknown tools and unknown parameters are rejected loudly, never silently passed through.",
      },
      {
        title: "Verify-before-act",
        body: "For any action keyed by an ID (account, SKU, ticket), require a prior fetch that confirms the ID exists and belongs to the expected scope. Reject if not found.",
      },
      {
        title: "Plan-then-execute with diffs",
        body: "Decompose multi-step actions into a plan the user (or a verifier model) can review. Show diffs for any state change.",
      },
      {
        title: "Constrain memory writes",
        body: "Only allow the agent to write structured, attributed facts into long-term memory, and only after confirmation. Periodically re-evaluate stored facts.",
      },
      {
        title: "Eval suites with adversarial cases",
        body: "Test against curated reliability evals — unknown IDs, conflicting context, edge-case schemas — before each release. Track regressions like any other product metric.",
      },
    ],
    frameworks: [
      { name: "OWASP LLM09:2025 — Misinformation", ref: "OWASP LLM Top 10" },
      { name: "NIST AI RMF — Measure 2.5 (Validity & Reliability)", ref: "NIST AI RMF" },
      { name: "ISO/IEC 42001 — AI Management System", ref: "ISO" },
    ],
    surfaces: ["llm", "orchestrator", "memory", "tools"],
  },
  {
    slug: "multi-agent-coordination",
    title: "Multi-Agent Coordination Risks",
    short: "Multi-agent",
    severity: "high",
    summary:
      "When agents talk to other agents, prompt injection becomes contagious, trust boundaries blur, and a single compromised node can drag a whole fleet off the rails.",
    whatItIs: [
      "Multi-agent systems — orchestrator + workers, swarm patterns, agent marketplaces — turn many of the single-agent risks into network-effect problems. A poisoned message from one agent becomes the system prompt of the next. An over-trusted 'specialist' agent becomes a privileged channel for attackers.",
      "The most dangerous variants are those where agents from different trust domains — e.g. a customer-facing agent talking to an internal ops agent — share a context channel without a clear trust boundary.",
    ],
    howItHappens: [
      {
        title: "Agent-to-agent prompt injection",
        body: "Untrusted output from one agent is fed verbatim as a prompt to a more privileged agent, carrying injected instructions across trust boundaries.",
      },
      {
        title: "Orchestrator compromise",
        body: "The router/planner agent has the broadest privileges. A successful injection there cascades into every worker.",
      },
      {
        title: "Goal hijacking via negotiation",
        body: "In agent marketplaces or negotiation protocols, an adversarial agent steers the conversation toward outcomes that benefit the attacker (price manipulation, data sharing, scope expansion).",
      },
      {
        title: "Resource starvation between cooperating agents",
        body: "Worker loops hammer the orchestrator with requests, creating self-inflicted DoS or cost spikes.",
      },
    ],
    realWorld: [
      {
        name: "AutoGPT-style runaway loops",
        year: "2023–2024",
        note: "Multi-agent demos repeatedly devolved into self-reinforcing loops, infinite tool calls, and runaway spend, illustrating coordination failures absent strong stop conditions.",
      },
      {
        name: "Academic studies on agent jailbreak transfer",
        year: "2024",
        note: "Several papers (e.g. 'Multi-agent Jailbreaks') showed that an injection succeeding on one agent in a system reliably propagates to neighbours through shared scratchpads.",
      },
    ],
    mitigations: [
      {
        title: "Treat inter-agent messages as untrusted input",
        body: "Apply the same provenance, sanitization, and structural separation to messages from other agents that you apply to user input.",
      },
      {
        title: "Capability-bounded subagents",
        body: "Worker agents get the smallest possible toolset and the lowest-privilege identity for the task at hand. The orchestrator never inherits worker capabilities.",
      },
      {
        title: "Explicit trust boundaries in the protocol",
        body: "Use protocols like Anthropic's MCP plus signed envelopes (or A2A patterns) that carry origin, scope, and signed context — never bare strings.",
      },
      {
        title: "Bounded budgets per run and per agent",
        body: "Hard limits on tokens, tool calls, depth of recursion, and wall-clock time. The orchestrator enforces, not the workers.",
      },
      {
        title: "Independent observers",
        body: "Run a separate, read-only monitor that watches the agent fleet for goal drift, runaway loops, or anomalous tool patterns and can pull the kill switch.",
      },
    ],
    frameworks: [
      { name: "OWASP LLM06 + LLM05 (Improper Output Handling)", ref: "OWASP LLM Top 10" },
      { name: "MITRE ATLAS — emerging multi-agent TTPs", ref: "MITRE ATLAS" },
    ],
    surfaces: ["orchestrator", "tools", "memory"],
  },
  {
    slug: "privacy-and-compliance",
    title: "Privacy, Compliance & Data Residency",
    short: "Privacy & compliance",
    severity: "high",
    summary:
      "Agents move regulated data through new vendors, new geographies, and new processors — often without the legal team noticing until an audit or a breach.",
    whatItIs: [
      "Every prompt sent to a hosted model is potentially a data transfer. Every retrieved chunk is a data flow. Every memory write is processing under GDPR. Most agent stacks were built for prototypes and casually accumulate compliance debt — until a regulator, customer security questionnaire, or breach forces a reckoning.",
      "EU AI Act (effective from 2025/2026 in stages), GDPR, HIPAA, India's DPDP Act, and sector-specific rules all apply. The work of mapping these onto agentic architectures is largely undone — and a major reason buyers are hesitant.",
    ],
    howItHappens: [
      {
        title: "Unmapped sub-processors",
        body: "Hosted LLMs, embedding APIs, vector DBs, observability vendors — every one is a sub-processor that needs disclosure, DPAs, and security review.",
      },
      {
        title: "Data residency violations",
        body: "User data routed to model endpoints in jurisdictions that violate contract or law (e.g. EU data leaving the EEA, healthcare data crossing borders).",
      },
      {
        title: "Right-to-deletion failures",
        body: "GDPR Art. 17 requires deletion on request — but how do you delete a user's content from embeddings, fine-tunes, and KV caches? Most teams have no answer.",
      },
      {
        title: "Logging PII in agent traces",
        body: "Verbose tracing tools capture full prompts and responses, often including PII, secrets, and regulated data, into long-lived logs with broad access.",
      },
    ],
    realWorld: [
      {
        name: "Italy's Garante banning ChatGPT (briefly)",
        year: "2023",
        note: "First high-profile GDPR enforcement against a hosted LLM service over lawful basis and transparency, foreshadowing wider EU scrutiny.",
      },
      {
        name: "Samsung internal ChatGPT data leak",
        year: "2023",
        note: "Engineers pasted proprietary code into ChatGPT, leading to an internal ban and public reminders that prompts are processing.",
      },
      {
        name: "Meta AI training on user content debate",
        year: "2024–2025",
        note: "EU and UK regulators pushed back on default opt-in to training data use, reinforcing strict consent expectations for any agent feature that reuses user data.",
      },
    ],
    mitigations: [
      {
        title: "Map and minimize the data flow",
        body: "Document every system that processes prompt/response/memory data. Strip what you don't need before it reaches the model. Prefer redaction and tokenization at ingest.",
      },
      {
        title: "Vendor selection with residency in mind",
        body: "Use regional model endpoints, contractual data-handling commitments, and zero-retention configurations. For regulated workloads, prefer self-hosted or VPC-isolated deployments.",
      },
      {
        title: "Designed-in deletion",
        body: "Track per-user data lineage so deletion requests can propagate to embeddings, caches, and fine-tunes. Avoid baking PII into model weights.",
      },
      {
        title: "PII-aware logging",
        body: "Redact prompts/responses before they hit logs. Restrict access to raw traces. Set short retention defaults.",
      },
      {
        title: "AI Act readiness",
        body: "Classify each agent feature against EU AI Act risk tiers. High-risk uses require risk management, data governance, human oversight, and post-market monitoring documentation now.",
      },
    ],
    frameworks: [
      { name: "EU AI Act — Title III (High-Risk), Title IV (Transparency)", ref: "EU AI Act" },
      { name: "GDPR Art. 5, 17, 22, 35", ref: "GDPR" },
      { name: "ISO/IEC 42001 — AI Management System", ref: "ISO" },
      { name: "NIST AI RMF — Govern + Map functions", ref: "NIST AI RMF" },
    ],
    surfaces: ["llm", "memory", "retrieval", "tools"],
  },
  {
    slug: "denial-of-service-and-cost",
    title: "Denial of Service, Cost & Resource Exhaustion",
    short: "DoS & cost",
    severity: "medium",
    summary:
      "Agents convert compute and money into output. Without budgets and stop conditions, a single malicious prompt — or a single bug — can run up six-figure bills overnight.",
    whatItIs: [
      "OWASP LLM10:2025 — Unbounded Consumption — formalises a class of attack that's already common in production: forcing an agent into long, expensive loops, or simply sending enough requests to saturate quotas and bills.",
      "Cost-based DoS is unique to AI: the attacker doesn't need to take you down, only make you bleed money until you take yourself down.",
    ],
    howItHappens: [
      {
        title: "Forced long generations",
        body: "Prompts crafted to maximize output length (e.g. 'write the dictionary in JSON') burn tokens and time.",
      },
      {
        title: "Recursive tool loops",
        body: "An injected instruction tells the agent to keep calling itself or a peer until it succeeds, with no stop condition.",
      },
      {
        title: "Expensive tool calls in a fan-out",
        body: "Each step calls an expensive embedding/search/scrape tool over a large dataset, multiplying spend.",
      },
      {
        title: "Cache-busting and quota exhaustion",
        body: "Adversarial inputs designed to invalidate caches or hit per-tenant quotas, degrading the service for legitimate users.",
      },
    ],
    realWorld: [
      {
        name: "AutoGPT runaway loops",
        year: "2023",
        note: "Early adopters reported overnight spend spikes from agents stuck in their own thinking loops.",
      },
      {
        name: "Reported Cursor / Devin compute spikes",
        year: "2024–2025",
        note: "Several teams shared post-mortems where coding agents fan-outted across large monorepos and produced surprise five-figure bills.",
      },
    ],
    mitigations: [
      {
        title: "Per-run, per-user, per-tenant budgets",
        body: "Hard cents-and-tokens caps, enforced before each tool call. Fail closed when exceeded.",
      },
      {
        title: "Stop conditions and step limits",
        body: "Cap recursion depth, total steps, and wall-clock time. Require explicit human approval to extend.",
      },
      {
        title: "Output length caps",
        body: "Bound max_tokens and tool output sizes; truncate verbose tool responses before sending back to the model.",
      },
      {
        title: "Anomaly detection on cost",
        body: "Real-time alerts when tokens-per-user or dollars-per-run exceed baseline. Auto-pause before alerting humans.",
      },
      {
        title: "Cheaper-model fallbacks for hostile workloads",
        body: "Detect probable abuse (very long inputs, suspicious repetition) and downgrade or rate-limit before they reach expensive models.",
      },
    ],
    frameworks: [
      { name: "OWASP LLM10:2025 — Unbounded Consumption", ref: "OWASP LLM Top 10" },
      { name: "NIST AI RMF — Manage 2.4 (Resource considerations)", ref: "NIST AI RMF" },
    ],
    surfaces: ["llm", "tools", "orchestrator"],
  },
  {
    slug: "insecure-output-handling",
    title: "Insecure Output Handling",
    short: "Output handling",
    severity: "high",
    summary:
      "Treating model output as trusted code, SQL, HTML, or shell commands turns the LLM into a high-privilege, untrusted attacker inside your own application.",
    whatItIs: [
      "OWASP LLM05:2025 — Improper Output Handling — names the systemic failure of treating model output as if it were written by your own engineers. In practice, every downstream consumer of model output is an injection sink: HTML renderers (XSS), SQL clients (SQLi), shells (command injection), code interpreters (RCE), even markdown renderers (URL exfil).",
      "This is the bridge that connects 'the model said something weird' with 'we got popped'.",
    ],
    howItHappens: [
      {
        title: "Unsanitized markdown rendering",
        body: "Auto-rendered markdown enables image-based exfil and clickjacking via attacker-controlled links.",
      },
      {
        title: "LLM-generated SQL or code, executed verbatim",
        body: "Text-to-SQL flows pass model output to the database without static analysis or scope checks.",
      },
      {
        title: "Tool arguments echoed into shells",
        body: "Code-execution tools that interpret model output as shell commands inherit every prompt-injection bug as an RCE.",
      },
      {
        title: "XSS in agent UIs",
        body: "Recently disclosed XSS vulnerabilities in AI app builders (Lovable, others) trace to insufficient escaping of model output.",
      },
    ],
    realWorld: [
      {
        name: "Lovable XSS / iframe vulnerabilities",
        year: "2024–2025",
        note: "Researchers disclosed XSS in apps generated by AI app builders due to insufficient escaping of model output, allowing attacker-controlled JS execution.",
      },
      {
        name: "Text-to-SQL exploits",
        year: "2023–2025",
        note: "Multiple academic and red-team reports show prompt injection turning text-to-SQL agents into 'whatever query the attacker wants' against production databases.",
      },
    ],
    mitigations: [
      {
        title: "Treat model output as user input",
        body: "Apply the same sanitization, escaping, and parameterization to model output that you apply to user input. No exceptions.",
      },
      {
        title: "Structured outputs over free text",
        body: "Use JSON schemas or function-calling with strict validation. Reject unparseable output instead of guessing.",
      },
      {
        title: "Sandboxed code execution",
        body: "Run any generated code in an isolated sandbox (gVisor, Firecracker, WASM) with no network and no credentials.",
      },
      {
        title: "Read-only by default for SQL",
        body: "Text-to-SQL connections are read-only, scoped to the tenant's data, and limited to whitelisted tables/columns. Static analysis on the generated query before execution.",
      },
      {
        title: "Disable auto-render of risky elements",
        body: "Strip remote images, iframes, and scripts from rendered model output. Allow only an explicit, narrow set of markdown features.",
      },
    ],
    frameworks: [
      { name: "OWASP LLM05:2025 — Improper Output Handling", ref: "OWASP LLM Top 10" },
      { name: "OWASP ASVS V5 — Validation, Sanitization & Encoding", ref: "OWASP ASVS" },
      { name: "MITRE CWE-79, CWE-89, CWE-78 (applied to LLM output)", ref: "MITRE CWE" },
    ],
    surfaces: ["output", "tools"],
  },
];

export const threatBySlug = (slug: string) =>
  threats.find((t) => t.slug === slug);
