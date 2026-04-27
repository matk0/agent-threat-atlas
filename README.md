# Agent Threat Atlas

A live, public reference of agentic AI security incidents — each mapped to the threat category it exemplifies and the controls that would have prevented it. Built and maintained by [Matej Lukasik](https://matejlukasik.com) / [Clawforce One](https://clawforceone.ai) as an asset to send to clients before security conversations.

The site does three things:

1. **Catalogs** the threats specific to agentic AI, with substantive write-ups for each.
2. **Maps** real public incidents to those categories and to the controls that would have prevented them.
3. **Stays current** via a daily scraper that pulls from ~70 sources (CVE feeds, vendor advisories, regulators, security research, trade press) and writes back to `content/incidents.ts`.

Hosted at `atlas.clawforceone.ai`. All editorial content lives in `content/*.ts` and the brand lives in `lib/site.ts`.

---

## Quick start

```bash
npm install
npm run dev
# open http://localhost:3000
```

```bash
npm run build      # production build
npm start          # serve the production build
```

Requires Node.js 18.17+ (Next.js 14 minimum).

---

## What's in here

```
app/
  page.tsx                  Home
  threats/
    page.tsx                Catalog index
    [slug]/page.tsx         Threat detail
  surfaces/page.tsx         Component-by-component attack surfaces
  playbooks/
    page.tsx                Playbook index
    [slug]/page.tsx         Playbook detail
  incidents/
    page.tsx                Daily incident feed (server-rendered)
    IncidentExplorer.tsx    Client-side filters
  services/page.tsx         Consulting offerings
  resources/page.tsx        Curated external resources
  contact/page.tsx          Lead-capture form
  not-found.tsx             404
  layout.tsx                Root layout (header, footer, metadata)
  globals.css               Tailwind + design tokens

components/
  Header.tsx, Footer.tsx, Logo.tsx
  Section.tsx, CTA.tsx, Pill.tsx

content/                    All editorial content lives here
  threats.ts                10 threat categories (the intellectual core)
  incidents.ts              Curated sample incidents (replaced daily by scraper)
  playbooks.ts              5 production-ready playbooks
  surfaces.ts               9 agent components

lib/
  site.ts                   Brand, nav, severity meta
  format.ts                 Date helpers

scripts/
  example-scraper.py        Reference implementation of the daily news scraper
  scraper-prompt.md         The LLM categorization prompt
```

---

## Editing content

### Add a new threat

Open `content/threats.ts` and add an entry. The page picks it up at the next build / dev reload — no code changes needed elsewhere.

### Add a new incident

Open `content/incidents.ts` and append. Make sure `threats: [...]` references slugs that exist in `threats.ts`. The home page's "Recent incidents" and the `/incidents` feed will reflect the new entry automatically.

### Add a new playbook

Open `content/playbooks.ts`. Use `relatedThreats` to wire it back into threat detail pages.

### Update the brand

Edit `lib/site.ts`. The favicon / logo lives in `components/Logo.tsx` (inline SVG).

---

## The daily incident scraper

The site ships with a curated set of demo incidents. Wire up real automation any of these ways.

### Architecture (recommended)

```
┌────────────────┐   RSS / Atom    ┌──────────────────┐   JSON entries   ┌─────────────────┐
│  Source feeds  │ ──────────────► │  Scraper (cron)  │ ───────────────► │  GitHub commit  │
│  (CVE, OWASP,  │                 │  Python or Node  │                  │  to incidents.  │
│  vendor blogs, │                 │  + LLM categorizer│                 │  ts on main     │
│  ATLAS, etc.)  │                 └──────────────────┘                  └────────┬────────┘
└────────────────┘                                                                 │
                                                                                   ▼
                                                                          ┌────────────────┐
                                                                          │ Vercel rebuild │
                                                                          │   on push       │
                                                                          └────────────────┘
```

Why this shape:

- The site stays a static Next.js build — fast, cheap, and SEO-friendly.
- The scraper is a cron job (GitHub Actions, Vercel Cron, or a small VM) that
  rewrites `content/incidents.ts` and opens a PR or commits to main.
- The site rebuilds on each push, so the feed updates daily.

### Sources to monitor

Sources live in `scripts/sources.py`. ~70 feeds across nine categories — edit the file to add, disable, or change a source. Run `python3 scripts/smoke_test.py` after every change.

The categories shipped today:

- **Vulnerability databases** — NIST NVD, GitHub Advisory Database, huntr.com (AI/ML bug bounty).
- **Model vendors** — OpenAI, Anthropic, Google AI, Google DeepMind, Meta AI, Mistral, Cohere, AI21.
- **Cloud / infra vendors** — Microsoft MSRC, Microsoft Update Guide, Google Cloud Security, Project Zero, AWS security bulletins + blog, Cloudflare, GitHub security blog, Hugging Face, Databricks, Snowflake, Vercel.
- **Agent / framework vendors** — LangChain, LlamaIndex, Pinecone, Weaviate, Replit, Cursor.
- **AI-security research firms** — Embrace The Red, Simon Willison, Invariant Labs, Lakera, HiddenLayer, Protect AI, PromptArmor, Trail of Bits, NCC Group, Bishop Fox, Mithril Security, Adversa AI, WithSecure, Aim Labs, JFrog Security Research.
- **Standards & community** — OWASP GenAI Security, MITRE ATLAS, NIST AIRC, AI Incident Database.
- **Regulators** — ICO (UK), CNIL (France), Garante (Italy), EDPB, ENISA, BSI (Germany), FTC, CISA, UK AISI, EU Commission AI press.
- **Trade press** — The Register AI/ML, The Record, BleepingComputer, The Hacker News, DarkReading, SecurityWeek, KrebsOnSecurity, Risky Business, Wired security, Reuters tech, Guardian tech, Ars Technica security, 404 Media, Platformer.
- **Academic** — arXiv cs.CR (categorizer filters down to agent/LLM-relevant items).

Adapter types supported: `rss`, `atom` (feedparser); `nvd_json` (NIST CVE API); `ghsa` (GitHub REST advisory API); `aid_json` (AI Incident Database); `html` (BeautifulSoup with CSS selectors). To add a new HTML source, write a `Source(..., type="html", selectors=HtmlSelectors(item="...", headline="...", link="...", date="...", summary="..."))` entry — see existing entries in `sources.py` for examples.

URLs marked `# verify` in `sources.py` were not hand-confirmed at authoring time. The smoke test will tell you which respond and which 404; flip `enabled=False` on broken ones until you can fix the URL.

### Categorization

For each new candidate the scraper:

1. Pre-filters: items must mention LLM/agent/vendor vocabulary in their text.
2. Sends the candidate to the LLM with the prompt in `scripts/scraper-prompt.md`. The prompt enforces a **strict** "confirmed incidents only" rule: named system, dated event, evidence (CVE / vendor advisory / regulator / public POC / court ruling). Anything else returns `SKIP`.
3. The model returns either `SKIP` or:
   - `severity`: critical / high / medium / low
   - `threats`: a subset of the slugs in `content/threats.ts`
   - `vendor`: the affected product
   - `summary`: 1–3 sentence neutral summary
4. Items with no threat slug match are dropped.
5. URLs are deduped against `content/incidents.ts`.

The categorizer uses the **official Anthropic Python SDK** (`anthropic`) — no hand-rolled HTTP. The SDK handles retries with backoff, structured errors, and rate-limit handling automatically. Default model: `claude-haiku-4-5-20251001`. Override with `ANTHROPIC_MODEL`. Costs roughly $0.10–$0.20/day at full source coverage.

### Setup

```bash
# Install Python dependencies
pip install -r scripts/requirements.txt

# Configure your API key (one-time)
cp scripts/.env.example scripts/.env
# Edit scripts/.env to add your ANTHROPIC_API_KEY
# Get a key at https://console.anthropic.com
```

### Running the scraper

```bash
# Smoke-test sources (no LLM key needed) — confirms which feeds are reachable
python3 scripts/smoke_test.py

# Inspect the source registry
python3 scripts/sources.py

# Real run (set the env var, or `source scripts/.env`)
export ANTHROPIC_API_KEY=sk-ant-...
python3 scripts/example-scraper.py

# Dry run — categorize but don't write the file
python3 scripts/example-scraper.py --dry --limit 10

# Run a single source (substring match)
python3 scripts/example-scraper.py --only "Embrace The Red"
```

### Deployment options (pick one)

**A. GitHub Actions (recommended)**

Workflow on schedule (`cron: '0 7 * * *'`) installs deps, runs `python3 scripts/example-scraper.py`, and commits the updated `content/incidents.ts` to `main`. Add `ANTHROPIC_API_KEY` (and optionally `GITHUB_TOKEN`) as repository secrets. Vercel/Netlify rebuilds on push.

**B. Vercel Cron**

Add a `vercel.json` cron entry pointing to a serverless route that runs the scraper, writes via the GitHub API, and triggers a redeploy. Requires the same secret in Vercel project env vars.

**C. Self-hosted VM with cron**

Run `python3 scripts/example-scraper.py` daily on a small VM; commit and push. Same secret model.

### Secrets

The scraper needs `ANTHROPIC_API_KEY`. Store it as a repository / project secret in your CI provider; never commit `.env`. The example file (`scripts/.env.example`) is safe to commit and documents the full env-var contract.

---

## Wiring up the contact form

The form in `app/contact/ContactForm.tsx` is a client component that currently no-ops on submit. To make it real, swap the `onSubmit` handler for one of:

- **Formspree / Plain / Tally / etc.** — set the `action` to your endpoint and remove the `preventDefault`.
- **Your own API route** — add `app/api/contact/route.ts` that accepts the payload, sends an email (via Resend / Postmark), and writes to your CRM.
- **Plain `mailto:`** — point the action at `mailto:hello@yourdomain.com` for the lowest-tech option.

---

## Deploying

### Vercel (one-click)

```bash
npm i -g vercel
vercel
```

Set `NODE_VERSION=18` if needed. The site has no environment variables required for the static frontend; add `LLM_API_KEY` only if you also deploy the scraper to Vercel.

### Anywhere else

```bash
npm run build
# Upload the .next/ output and run `npm start` behind a reverse proxy.
```

For a fully static export (no server-rendered features), set `output: 'export'` in `next.config.mjs` and run `npm run build`. All current pages are static-friendly.

---

## Customizing the look

All design tokens live in two files:

- `tailwind.config.ts` — palette (`ink`, `accent`, `warn`, `crit`, `ok`).
- `app/globals.css` — typographic and component utilities (`.h-display`, `.card`, `.btn-primary`, ...).

The aesthetic is deliberately restrained: enterprise navy, lots of whitespace, no emoji. Buyers reading the site are weighing risk, not browsing a launch page.

---

## License & content

The starter content (threats, incidents, playbooks) is for your use. Verify any specific incident detail against the linked source before quoting it externally. Nothing on the site is legal advice.
