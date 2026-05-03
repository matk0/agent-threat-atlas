export type Surface = {
  id: string;
  title: string;
  short: string;
  role: string;
  threats: string[]; // threat slugs
  mitigations: string[];
};

export const surfaces: Surface[] = [
  {
    id: "llm",
    title: "The Model",
    short: "Model",
    role: "Interprets context, decides which tools to call, generates output.",
    threats: [
      "prompt-injection",
      "hallucination-and-reliability",
      "supply-chain",
      "privacy-and-compliance",
    ],
    mitigations: [
      "Use a model with strong instruction-following and a published security posture.",
      "Constrain output via JSON schemas and function-calling.",
      "Verify model integrity (signatures, safetensors) for self-hosted weights.",
      "Treat the model as a powerful but untrusted contractor — never as your own engineer.",
    ],
  },
  {
    id: "system-prompt",
    title: "System Prompt & Policy",
    short: "Policy",
    role: "Encodes the rules, persona, and forbidden actions of the agent.",
    threats: ["prompt-injection", "excessive-agency"],
    mitigations: [
      "Keep the policy short, declarative, and version-controlled.",
      "Don't rely on the policy alone to prevent dangerous tool calls — enforce in code.",
      "Audit-test the policy against your red-team suite each release.",
    ],
  },
  {
    id: "memory",
    title: "Memory & Long-Term State",
    short: "Memory",
    role: "Persists facts, preferences, and prior outputs across runs.",
    threats: ["prompt-injection", "data-exfiltration", "privacy-and-compliance"],
    mitigations: [
      "Partition memory per-user and per-tenant; never share across trust boundaries.",
      "Only persist structured, attributed facts — not free-text dumps.",
      "Plan for deletion: track lineage so right-to-be-forgotten requests propagate.",
      "Treat retrieved memory as untrusted input on every read.",
    ],
  },
  {
    id: "retrieval",
    title: "Retrieval & RAG",
    short: "Retrieval",
    role: "Pulls documents, web pages, and vectors into the context window.",
    threats: ["prompt-injection", "data-exfiltration", "privacy-and-compliance"],
    mitigations: [
      "Tag every chunk with provenance and sensitivity; show provenance in the UI.",
      "Apply user-level access controls in the retriever, not in the prompt.",
      "Sanitize HTML, strip hidden text, and reject obviously adversarial chunks.",
    ],
  },
  {
    id: "tools",
    title: "Tools & MCP Servers",
    short: "Tools",
    role: "External capabilities — APIs, databases, code interpreters, search.",
    threats: [
      "excessive-agency",
      "supply-chain",
      "data-exfiltration",
      "denial-of-service-and-cost",
      "insecure-output-handling",
    ],
    mitigations: [
      "Single-purpose, narrow tools. No catch-alls.",
      "Per-run, short-lived credentials. Egress allow-lists.",
      "Sandbox third-party MCP servers; pin and review every update.",
      "Quotas and budgets enforced at the orchestrator.",
    ],
  },
  {
    id: "orchestrator",
    title: "Orchestrator / Planner",
    short: "Orchestrator",
    role: "Coordinates steps, calls tools, manages state across the run.",
    threats: [
      "excessive-agency",
      "multi-agent-coordination",
      "hallucination-and-reliability",
      "denial-of-service-and-cost",
    ],
    mitigations: [
      "Hard limits: depth, steps, time, cost. Enforce in code.",
      "Plan-then-execute pattern with diffs for human approval on irreversible actions.",
      "Schema-validate every tool call; reject phantom tools/parameters.",
    ],
  },
  {
    id: "identity",
    title: "Identity, Authn & Authz",
    short: "Identity",
    role: "Determines who the agent is acting as, and what they can do.",
    threats: ["identity-and-authorization", "excessive-agency", "privacy-and-compliance"],
    mitigations: [
      "Distinct workload identity for the agent (SPIFFE-style); never inherit user tokens for service traffic.",
      "Per-action just-in-time consent for sensitive scopes.",
      "Carry user context end-to-end via signed delegation (RFC 8693).",
    ],
  },
  {
    id: "output",
    title: "Output Handler / Renderer",
    short: "Output",
    role: "Renders, executes, or transmits whatever the model produces.",
    threats: ["insecure-output-handling", "data-exfiltration"],
    mitigations: [
      "Treat model output as user input. Escape, validate, parameterize.",
      "Disable auto-fetch of remote images, iframes, scripts in chat UIs.",
      "Sandbox any code execution; default-deny network egress.",
    ],
  },
];
