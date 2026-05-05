import assert from "node:assert/strict";
import { chromium } from "playwright";

const enBase = cleanBase(process.env.SMOKE_BASE_EN ?? "https://atlas.matejlukasik.com");
const skBase = cleanBase(process.env.SMOKE_BASE_SK ?? "https://atlas.matejlukasik.sk");
const legacyBase = cleanBase(process.env.SMOKE_BASE_LEGACY ?? "https://atlas.clawforceone.ai");
const timeout = Number(process.env.SMOKE_TIMEOUT_MS ?? 30_000);

const atlasUtm = {
  utm_source: "agent_threat_atlas",
  utm_medium: "referral",
  utm_campaign: "atlas_funnel",
  utm_content: "nav",
};

const checks = [
  {
    locale: "en",
    base: enBase,
    otherBase: skBase,
    switchName: "Switch to Slovak",
    switchLabel: "SK",
    navName: "Consulting",
    consultingHost: "matejlukasik.com",
    threatCta: "Open threat detail",
  },
  {
    locale: "sk",
    base: skBase,
    otherBase: enBase,
    switchName: "Prepnúť do angličtiny",
    switchLabel: "EN",
    navName: "Konzultácie",
    consultingHost: "matejlukasik.sk",
    threatCta: "Otvoriť detail hrozby",
  },
];

const browser = await chromium.launch({ headless: true });

try {
  for (const check of checks) {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });

    await assertOk(page, `${check.base}/`);
    await settle(page);
    await assertLanguageSwitcher(page, check, "/");
    await assertConsultingNav(page, check);

    await assertOk(page, `${check.base}/incidents`);
    await assertOk(page, `${check.base}/threats`);
    await settle(page);
    await assertLanguageSwitcher(page, check, "/threats");
    await assertThreatIndex(page, check);

    await page.close();
    console.log(`ok ${check.locale}`);
  }

  const legacyPage = await browser.newPage();
  await assertOk(legacyPage, `${legacyBase}/incidents`);
  await legacyPage.close();
  console.log("ok legacy alias");
} finally {
  await browser.close();
}

function cleanBase(url) {
  return url.replace(/\/+$/, "");
}

async function assertOk(page, url) {
  const response = await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout,
  });

  assert(response, `${url} did not return a response`);
  assert(
    response.status() >= 200 && response.status() < 400,
    `${url} returned HTTP ${response.status()}`,
  );
}

async function settle(page) {
  await page.waitForLoadState("load", { timeout });
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(250);
}

async function assertLanguageSwitcher(page, check, path) {
  const switcher = page.getByRole("link", { name: check.switchName });
  await assertCount(switcher, 1, `${check.locale} language switcher`);

  const text = (await switcher.textContent())?.trim();
  assert.equal(text, check.switchLabel);
  assert.equal(await switcher.getAttribute("href"), `${check.otherBase}${path}`);
}

async function assertConsultingNav(page, check) {
  const consultingLink = page.locator("header nav").getByRole("link", {
    name: check.navName,
  });
  await assertCount(consultingLink, 1, `${check.locale} consulting nav link`);

  const href = await consultingLink.getAttribute("href");
  assert(href, `${check.locale} consulting nav link has no href`);
  const url = new URL(href);

  assert.equal(url.hostname, check.consultingHost);
  assert.equal(url.pathname, "/");
  assertNoHash(url, `${check.locale} consulting nav link`);

  for (const [key, value] of Object.entries(atlasUtm)) {
    assert.equal(url.searchParams.get(key), value);
  }
}

async function assertThreatIndex(page, check) {
  assert.equal(await page.locator("table").count(), 0);

  const threatCards = page.locator(`a[aria-label^="${check.threatCta}:"]`);
  const cardCount = await threatCards.count();
  assert(cardCount >= 10, `${check.locale} threat index has ${cardCount} threat cards`);

  const ctaCount = await page.getByText(check.threatCta, { exact: false }).count();
  assert(ctaCount >= 10, `${check.locale} threat index has ${ctaCount} visible CTAs`);

  const firstHref = await threatCards.first().getAttribute("href");
  assert(firstHref?.startsWith("/threats/"), `${check.locale} first threat card has bad href`);
  await assertOk(page, `${check.base}${firstHref}`);
}

async function assertCount(locator, expected, label) {
  const count = await locator.count();
  assert.equal(count, expected, `${label} count`);
}

function assertNoHash(url, label) {
  assert.equal(url.hash, "", `${label} should not include a hash anchor`);
}
