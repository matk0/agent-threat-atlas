import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

async function importTs(path) {
  const source = read(path);
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const encoded = Buffer.from(outputText).toString("base64");
  return import(`data:text/javascript;base64,${encoded}`);
}

test("root renders the live incident atlas", () => {
  const page = read("app/page.tsx");

  assert.match(page, /IncidentExplorer/);
  assert.match(page, /messages\.home\.eyebrow/);
  assert.doesNotMatch(page, /function Hero/);
  assert.doesNotMatch(page, /RecentIncidents/);
});

test("home page reports days since the last incident", async () => {
  const page = read("app/page.tsx");
  const i18n = read("lib/i18n.ts");
  const { daysSinceDate } = await importTs("lib/format.ts");

  assert.equal(daysSinceDate("2026-04-30", new Date("2026-05-03T07:34:00Z")), 3);
  assert.equal(daysSinceDate("2026-05-03", new Date("2026-05-03T23:59:00Z")), 0);
  assert.match(page, /daysSinceDate\(latest\)/);
  assert.match(page, /label=\{messages\.home\.daysSinceLastIncident\}/);
  assert.match(page, /String\(daysSinceLatest\)/);
  assert.doesNotMatch(page, /messages\.home\.latest/);
  assert.doesNotMatch(page, /daysSinceAgenticAiIncident/);
  assert.match(i18n, /Days since last incident/);
  assert.match(i18n, /Dní od posledného incidentu/);
});

test("/incidents aliases the root atlas", () => {
  const incidentsPage = read("app/incidents/page.tsx");

  assert.match(incidentsPage, /export \{ default, metadata \} from "\.\.\/page"/);
});

test("navigation is focused and sends contact off-site", () => {
  const site = read("lib/site.ts");
  const contactPage = read("app/contact/page.tsx");
  const wrangler = read("wrangler.jsonc");
  const worker = read("worker.js");

  assert.match(site, /href: "\/"/);
  assert.match(site, /label: messages\.nav\.liveAtlas/);
  assert.match(site, /href: "\/threats"/);
  assert.match(site, /label: messages\.nav\.contact/);
  assert.match(site, /navConsulting/);
  assert.match(site, /const consultantSkUrl = "https:\/\/matejlukasik\.sk"/);
  assert.match(site, /config\.htmlLang === "sk" \? consultantSkUrl : consultantBaseUrl/);
  assert.match(site, /consultantLandingAnchor/);
  assert.match(site, /config\.htmlLang === "sk" \? "bezpecnost-agentickej-ai" : "agentic-ai-security"/);
  assert.match(site, /hash \? `\$\{base\}\?\$\{atlasUtm\}&utm_content=\$\{content\}#\$\{hash\}`/);
  assert.match(site, /utm_source=agent_threat_atlas/);
  assert.match(site, /utm_campaign=atlas_funnel/);
  assert.doesNotMatch(site, /Attack Surfaces/);
  assert.doesNotMatch(site, /Playbooks/);
  assert.doesNotMatch(site, /Resources/);
  assert.doesNotMatch(site, /About/);
  assert.match(contactPage, /httpEquiv="refresh"/);
  assert.match(contactPage, /site\.consultant\.links\.contactRedirect/);
  assert.match(worker, /utm_content=contact_redirect/);
  assert.match(wrangler, /"main": "\.\/worker\.js"/);
  assert.match(wrangler, /"directory": "\.\/dist"/);
  assert.match(wrangler, /"binding": "ASSETS"/);
  assert.match(wrangler, /"run_worker_first": \["\/contact\*"\]/);
  assert.match(worker, /Response\.redirect\(CONTACT_REDIRECT_URL, 302\)/);
});

test("atlas is wired as a tracked consulting funnel", () => {
  const layout = read("app/layout.tsx");
  const page = read("app/page.tsx");
  const header = read("components/Header.tsx");
  const cta = read("components/CTA.tsx");
  const footer = read("components/Footer.tsx");
  const site = read("lib/site.ts");
  const i18n = read("lib/i18n.ts");

  assert.match(layout, /next\/script/);
  assert.match(layout, /script\.outbound-links\.tagged-events\.js/);
  assert.match(layout, /data-domain=\{site\.domain\}/);

  assert.doesNotMatch(page, /ConsultantAttribution/);
  assert.doesNotMatch(page, /messages\.home\.consultantPrefix/);
  assert.doesNotMatch(page, /plausible-event-position=hero_byline/);
  assert.doesNotMatch(page, /site\.consultant\.links\.heroContact/);
  assert.doesNotMatch(page, /rounded-lg border border-ink-100 bg-white\/75 px-4 py-3/);
  assert.doesNotMatch(page, /plausible-event-position=hero"/);
  assert.match(page, /<CTA \/>/);

  assert.match(header, /plausible-event-position=nav/);
  assert.match(cta, /site\.consultant\.links\.sectionCta/);
  assert.match(cta, /plausible-event-position=section_cta/);
  assert.match(footer, /site\.consultant\.links\.footer/);
  assert.match(footer, /plausible-event-position=footer/);
  assert.match(footer, /site\.consultant\.links\.navConsulting/);

  assert.match(site, /matejlukasik\.com/);
  assert.match(site, /consultantRootUrl/);
  assert.match(site, /navConsulting/);
  assert.match(site, /sectionCta/);
  assert.match(i18n, /Agentic AI consultant/);
  assert.match(i18n, /Konzultant pre agentickú AI/);
  assert.match(i18n, /Work with me/);
  assert.match(i18n, /Spolupracovať/);
});

test("site builds separate English and Slovak static outputs", () => {
  const packageJson = read("package.json");
  const buildScript = read("scripts/build-locales.mjs");
  const i18n = read("lib/i18n.ts");
  const site = read("lib/site.ts");
  const worker = read("worker.js");
  const workflow = read(".github/workflows/scraper.yml");

  assert.match(packageJson, /"build": "node scripts\/build-locales\.mjs"/);
  assert.match(buildScript, /SITE_LOCALE: "en"/);
  assert.match(buildScript, /SITE_LOCALE: "sk"/);
  assert.match(buildScript, /dist\/en/);
  assert.match(buildScript, /dist\/sk/);
  assert.match(i18n, /export type Locale = "en" \| "sk"/);
  assert.match(site, /atlas\.matejlukasik\.com/);
  assert.match(site, /atlas\.matejlukasik\.sk/);
  assert.match(i18n, /Živý atlas bezpečnostných incidentov agentickej AI/);
  assert.match(worker, /atlas\.matejlukasik\.sk/);
  assert.match(worker, /\/sk\//);
  assert.match(worker, /\/en\//);
  assert.match(workflow, /https:\/\/atlas\.matejlukasik\.sk\/incidents/);
});

test("Slovak locale has translated static content and incident news", () => {
  const incidents = read("content/incidents.sk.ts");
  const threats = read("content/threats.sk.ts");
  const playbooks = read("content/playbooks.sk.ts");
  const surfaces = read("content/surfaces.sk.ts");
  const localizedIncidents = read("content/incidents.ts");
  const localizedThreats = read("content/threats.ts");

  assert.match(incidents, /export const incidents/);
  assert.match(incidents, /Prevencia/);
  assert.match(threats, /export const threats/);
  assert.match(playbooks, /export const playbooks/);
  assert.match(surfaces, /export const surfaces/);
  assert.match(localizedIncidents, /incidentsSk/);
  assert.match(localizedThreats, /threatsSk/);
});

test("accepted incident feed excludes generic security and duplicate campaign items", () => {
  const incidents = read("content/incidents.en.ts");

  assert.match(incidents, /Yuma AI exposed e-commerce customer order data/);
  assert.match(incidents, /Claude Code Action Runner allowed RCE/);
  assert.doesNotMatch(incidents, /ABB Ability OPTIMAX/);
  assert.doesNotMatch(incidents, /Contras Affected by CopyFile Policy Subversion/);
  assert.doesNotMatch(incidents, /Sean Plankey withdraws CISA nomination/);
  assert.doesNotMatch(incidents, /Bitwarden CLI Compromised in Ongoing Checkmarx/);
  assert.doesNotMatch(incidents, /Vercel Finds More Compromised Accounts/);
});

test("threat detail pages explain the category end to end", () => {
  const threatPage = read("app/threats/[slug]/page.tsx");

  assert.match(threatPage, /heading=\{messages\.threats\.whatItIs\}/);
  assert.match(threatPage, /heading=\{messages\.threats\.howAttacksHappen\}/);
  assert.match(threatPage, /heading=\{messages\.threats\.howToPrevent\}/);
  assert.match(threatPage, /heading=\{messages\.threats\.bestPractices\}/);
  assert.match(threatPage, /heading=\{messages\.threats\.knownExamples\}/);
  assert.match(threatPage, /heading=\{messages\.threats\.frameworkMapping\}/);
  assert.match(threatPage, /heading=\{messages\.threats\.relatedIncidents\}/);
  assert.match(threatPage, /threat\.whatItIs\.map/);
  assert.match(threatPage, /threat\.howItHappens\.map/);
  assert.match(threatPage, /bestPracticesFor\(threat\)/);
});

test("workflow avoids Node 20 actions runtime", () => {
  const workflow = read(".github/workflows/scraper.yml");

  assert.match(workflow, /actions\/setup-python@v6/);
  assert.match(workflow, /actions\/setup-node@v6/);
  assert.match(workflow, /npx -y wrangler@4\.87\.0 deploy/);
  assert.match(workflow, /content\/rejected-candidates\.json/);
  assert.match(workflow, /scripts\/example-scraper\.py/);
  assert.match(workflow, /scripts\/sources\.py/);
  assert.match(workflow, /scripts\/test_scraper_contract\.py/);
  assert.match(workflow, /scripts\/requirements\.txt/);
  assert.match(workflow, /source-health\.md/);
  assert.match(workflow, /GITHUB_STEP_SUMMARY/);
  assert.match(workflow, /timeout-minutes: 60/);
  assert.match(workflow, /default: '100'/);
  assert.doesNotMatch(workflow, /actions\/setup-python@v5/);
  assert.doesNotMatch(workflow, /actions\/setup-node@v4/);
  assert.doesNotMatch(workflow, /cloudflare\/wrangler-action/);
  assert.doesNotMatch(workflow, /FORCE_JAVASCRIPT_ACTIONS_TO_NODE24/);
});
