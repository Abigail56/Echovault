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
  await page.getByRole("region", { name: "Knowledge" }).getByRole("link", { name: /Kubernetes rollout plan/ }).click();
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

    for (const path of ["/dashboard", "/vault/new", "/decisions/new", "/settings"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(0);
    }
  });
});
