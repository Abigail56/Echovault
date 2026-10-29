import { expect, test } from "@playwright/test";

import { apiPost, signUpViaApi } from "./helpers";

test("global search from the header finds and opens a note", async ({ page }) => {
  await signUpViaApi(page);
  const note = await apiPost(page, "/knowledge", { title: "Kubernetes rollout plan", content: "Canary deployments first." });
  await apiPost(page, "/decisions", { title: "Adopt Kubernetes", reasoning: "Autoscaling" });

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /, Ada$/ })).toBeVisible();
  await page.keyboard.press("/"); // keyboard shortcut focuses the header search
  await expect(page.getByLabel("Search your workspace")).toBeFocused();
  await page.keyboard.type("kubern");
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/search\?q=kubern/);
  await expect(page.getByRole("region", { name: "Decisions" }).getByRole("link", { name: /Adopt Kubernetes/ })).toBeVisible();
  await page.getByRole("tab", { name: /^Notes/ }).click();
  await expect(page).toHaveURL(/type=knowledge/);
  await expect(page.getByRole("region", { name: "Decisions" })).toHaveCount(0);
  await page.getByRole("region", { name: "Notes" }).getByRole("link", { name: /Kubernetes rollout plan/ }).click();
  await expect(page).toHaveURL(new RegExp(`/vault/${note.id}$`));

  await page.goto("/search?q=zebra");
  await expect(page.getByRole("heading", { name: /No results/ })).toBeVisible();
});

test("one user cannot see another user's records", async ({ page, browser }) => {
  await signUpViaApi(page, "Ada Lovelace");
  const secret = await apiPost(page, "/knowledge", { title: "Ada's private diary", content: "secret plans" });

  const otherContext = await browser.newContext();
  const other = await otherContext.newPage();
  await signUpViaApi(other, "Grace Hopper");

  await other.goto(`/vault/${secret.id}`);
  await expect(other.getByRole("heading", { name: "Not found" })).toBeVisible();
  await expect(other.getByText("secret plans")).toHaveCount(0);

  await other.goto("/search?q=diary");
  await expect(other.getByRole("heading", { name: /No results/ })).toBeVisible();
  await otherContext.close();
});

test("the assistant says plainly when no AI provider is configured", async ({ page }) => {
  await signUpViaApi(page);
  await page.goto("/assistant");
  await expect(page.getByRole("heading", { name: "The assistant isn't set up yet" })).toBeVisible();
  await expect(page.getByLabel("Your question")).toHaveCount(0);
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("navigation works and pages fit the screen", async ({ page }) => {
    await signUpViaApi(page);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /, Ada$/ })).toBeVisible();

    await page.getByRole("button", { name: "Open navigation" }).click();
    const nav = page.getByRole("dialog", { name: "Navigation" });
    await nav.getByRole("link", { name: "Decisions" }).click();
    await expect(page).toHaveURL(/\/decisions$/);
    await expect(nav).toBeHidden();

  });
});

test("no horizontal overflow from 320px to 1440px", async ({ page }) => {
  test.setTimeout(600_000); // ~130 page loads
  await signUpViaApi(page);
  const note = await apiPost(page, "/knowledge", {
    title: "An unusually long note title that should wrap gracefully on very small phone screens",
    content: "# Heading\n\nA `code` span and a long URL https://example.com/a/very/long/path/that/must/not/overflow/the/layout",
    tags: ["responsive", "layout"],
  });
  const decision = await apiPost(page, "/decisions", { title: "Choose the layout system", decision: "CSS grid", alternatives: "Flexbox only" });
  const project = await apiPost(page, "/projects", { name: "Responsive audit", description: "Check every page" });
  const pages = [
    "/", "/login", "/register", "/terms", "/privacy", "/contact",
    "/dashboard", "/vault", `/vault/${note.id}`, "/vault/new", "/projects", `/projects/${project.id}`,
    "/decisions", `/decisions/${decision.id}`, "/decisions/new", "/search?q=layout", "/assistant", "/settings", "/profile",
  ];
  const problems: string[] = [];
  for (const width of [320, 375, 430, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of pages) {
      await page.goto(path);
      // Let the page's data load; don't wait forever on dev-server websockets.
      await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => undefined);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 0) problems.push(`${width}px ${path} overflows by ${overflow}px`);
    }
  }
  expect(problems).toEqual([]);
});

test.describe("phone sanity", () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  test("header search works without a keyboard shortcut", async ({ page }) => {
    await signUpViaApi(page);
    await apiPost(page, "/knowledge", { title: "Pocket note" });
    await page.goto("/dashboard");
    await page.getByLabel("Search your workspace").fill("pocket");
    await page.getByLabel("Search your workspace").press("Enter");
    await expect(page.getByRole("region", { name: "Notes" }).getByRole("link", { name: /Pocket note/ })).toBeVisible();
  });
});
