import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("root renders the live incident atlas", () => {
  const page = read("app/page.tsx");

  assert.match(page, /IncidentExplorer/);
  assert.match(page, /updated daily/i);
  assert.doesNotMatch(page, /function Hero/);
  assert.doesNotMatch(page, /RecentIncidents/);
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
  assert.match(site, /label: "Live Atlas"/);
  assert.match(site, /href: "\/threats"/);
  assert.match(site, /href: "https:\/\/matejlukasik\.com\/contact"/);
  assert.doesNotMatch(site, /Attack Surfaces/);
  assert.doesNotMatch(site, /Playbooks/);
  assert.doesNotMatch(site, /Resources/);
  assert.doesNotMatch(site, /About/);
  assert.match(contactPage, /httpEquiv="refresh"/);
  assert.match(contactPage, /https:\/\/matejlukasik\.com\/contact/);
  assert.match(wrangler, /"main": "\.\/worker\.js"/);
  assert.match(wrangler, /"binding": "ASSETS"/);
  assert.match(wrangler, /"run_worker_first": \["\/contact\*"\]/);
  assert.match(worker, /Response\.redirect\("https:\/\/matejlukasik\.com\/contact", 302\)/);
});

test("threat detail pages explain the category end to end", () => {
  const threatPage = read("app/threats/[slug]/page.tsx");

  assert.match(threatPage, /heading="What it is"/);
  assert.match(threatPage, /heading="How attacks happen"/);
  assert.match(threatPage, /heading="How to prevent it"/);
  assert.match(threatPage, /heading="Best practices"/);
  assert.match(threatPage, /heading="Known examples"/);
  assert.match(threatPage, /heading="Framework mapping"/);
  assert.match(threatPage, /heading="Related incidents"/);
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
  assert.doesNotMatch(workflow, /actions\/setup-python@v5/);
  assert.doesNotMatch(workflow, /actions\/setup-node@v4/);
  assert.doesNotMatch(workflow, /cloudflare\/wrangler-action/);
  assert.doesNotMatch(workflow, /FORCE_JAVASCRIPT_ACTIONS_TO_NODE24/);
});
