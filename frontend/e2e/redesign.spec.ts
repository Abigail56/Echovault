import { expect, test } from "@playwright/test";

import { apiPost, PASSWORD, signUpViaApi } from "./helpers";

test("legal pages are reachable from the footer and the sign-up form", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  for (const [link, heading] of [
    ["Privacy Policy", "Privacy Policy"],
    ["Terms and Conditions", "Terms and Conditions"],
    ["Acceptable Use Policy", "Acceptable Use Policy"],
    ["Cookie Policy", "Cookie Policy"],
    ["Contact", "Get in touch"],
  ]) {
    await footer.getByRole("link", { name: link, exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await page.goBack();
  }
  await page.goto("/register");
  await expect(page.getByRole("link", { name: "Terms and Conditions" })).toHaveAttribute("href", "/terms");
  await expect(page.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
});

test("landing page sections and calls to action work", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Your knowledge, connected to every decision." })).toBeVisible();
  await page.getByRole("link", { name: "Explore the workspace" }).click();
  await expect(page).toHaveURL(/#workspace$/);
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "How it works" }).click();
  await expect(page.getByRole("heading", { name: "Knowledge that stays connected" })).toBeInViewport();
  await page.getByRole("link", { name: "Create your vault" }).first().click();
  await expect(page).toHaveURL(/\/register$/);
});

test("archive, restore and link related notes", async ({ page }) => {
  await signUpViaApi(page);
  const other = await apiPost(page, "/knowledge", { title: "Connection pooling basics" });
  const note = await apiPost(page, "/knowledge", { title: "PgBouncer setup" });

  await page.goto(`/vault/${note.id}`);
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Related notes").fill("pool");
  await page.getByRole("button", { name: "Connection pooling basics" }).click();
  await expect(page.getByText("Unsaved changes")).toBeVisible();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Changes saved" })).toBeVisible();

  // Shown on both notes, including in the connection map.
  const connections = page.getByRole("figure", { name: /Connections of PgBouncer setup/ });
  await expect(connections.getByRole("link", { name: "Connection pooling basics" })).toBeVisible();
  await page.goto(`/vault/${other.id}`);
  await expect(page.getByRole("complementary").getByRole("link", { name: "PgBouncer setup" })).toBeVisible();

  await page.getByRole("button", { name: "Archive" }).click();
  await expect(page.getByText(/^Archived on/)).toBeVisible();
  await page.goto("/vault");
  await expect(page.getByRole("link", { name: "Connection pooling basics" })).toHaveCount(0);
  await page.getByRole("tab", { name: /^Archived/ }).click();
  await expect(page.getByRole("link", { name: "Connection pooling basics" })).toBeVisible();
  await page.getByRole("link", { name: "Connection pooling basics" }).click();
  await page.getByRole("button", { name: "Restore" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Note restored" })).toBeVisible();
});

test("delete account removes access permanently", async ({ page }) => {
  const { email } = await signUpViaApi(page);
  await page.goto("/settings");
  await expect(page.getByText(/You accepted the Terms and Conditions/)).toBeVisible();
  await page.getByRole("button", { name: "Delete my account" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete your account permanently?" });
  const confirm = dialog.getByRole("button", { name: "Delete account" });
  await dialog.getByLabel("Your password").fill(PASSWORD);
  await expect(confirm).toBeDisabled(); // must also type DELETE
  await dialog.getByLabel(/Type DELETE/).fill("DELETE");
  await confirm.click();

  await expect(page).toHaveURL(/account=deleted/);
  await expect(page.getByText("Your account and all its data have been deleted.")).toBeVisible();
  const login = await page.request.post("/api/v1/auth/login", { data: { email, password: PASSWORD } });
  expect(login.status()).toBe(401);
});

test("overview shows real counts and recent activity", async ({ page }) => {
  await signUpViaApi(page);
  await apiPost(page, "/projects", { name: "Thesis" });
  await apiPost(page, "/knowledge", { title: "Literature review" });
  await apiPost(page, "/decisions", { title: "Use LaTeX" });
  await page.goto("/dashboard");
  const activity = page.getByRole("region", { name: "Recent activity" });
  for (const title of ["Thesis", "Literature review", "Use LaTeX"]) {
    await expect(activity.getByRole("link", { name: new RegExp(title) })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: /^1\s*Notes/ })).toBeVisible();
});
