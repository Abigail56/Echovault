import { expect, test } from "@playwright/test";

import { signUpViaApi } from "./helpers";

test.beforeEach(async ({ page }) => {
  await signUpViaApi(page);
});

test("create, view, edit and delete a knowledge item", async ({ page }) => {
  await page.goto("/vault");
  await expect(page.getByRole("heading", { name: "Your vault is empty" })).toBeVisible();
  await page.getByRole("link", { name: "New item" }).click();

  await page.getByRole("button", { name: "Save to vault" }).click();
  await expect(page.getByText("Give it a title")).toBeVisible();

  await page.getByLabel("Title").fill("Docker volumes");
  await page.getByLabel("Content").fill("## Named volumes\n\nThey **persist** data across container restarts.");
  const tags = page.getByLabel("Tags");
  await tags.fill("docker");
  await tags.press("Enter");
  await tags.fill("Ops");
  await tags.press("Enter");
  await page.getByRole("button", { name: "Save to vault" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Saved to your vault" })).toBeVisible();
  await expect(page).toHaveURL(/\/vault\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1, name: "Docker volumes" })).toBeVisible();
  // Markdown is rendered (heading + bold), tags are normalised.
  await expect(page.getByRole("heading", { level: 2, name: "Named volumes" })).toBeVisible();
  await expect(page.locator("strong", { hasText: "persist" })).toBeVisible();
  await expect(page.getByRole("link", { name: "ops" })).toBeVisible();

  // Survives a full page reload (stored in PostgreSQL, not the browser).
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Docker volumes" })).toBeVisible();

  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Title").fill("Docker named volumes");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Changes saved" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Docker named volumes" })).toBeVisible();

  await page.getByRole("button", { name: "Delete" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete this knowledge item?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Delete" }).click();
  await dialog.getByRole("button", { name: "Delete" }).click();

  await expect(page).toHaveURL(/\/vault$/);
  await expect(page.getByRole("heading", { name: "Your vault is empty" })).toBeVisible();
});

test("warns before leaving a form with unsaved changes", async ({ page }) => {
  await page.goto("/vault/new");
  await page.getByLabel("Title").fill("Half-written idea");

  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Projects" }).click();
  await expect(page).toHaveURL(/\/vault\/new$/);
  await expect(page.getByLabel("Title")).toHaveValue("Half-written idea");
});

test("filters the vault by search text and tag, kept in the URL", async ({ page }) => {
  await page.goto("/vault/new");
  await page.getByLabel("Title").fill("Postgres indexing");
  await page.getByLabel("Content").fill("GIN indexes speed up full-text search.");
  await page.getByLabel("Tags").fill("postgres");
  await page.getByLabel("Tags").press("Enter");
  await page.getByRole("button", { name: "Save to vault" }).click();
  await expect(page).toHaveURL(/\/vault\/[0-9a-f-]{36}$/);

  await page.goto("/vault/new");
  await page.getByLabel("Title").fill("React hooks");
  await page.getByRole("button", { name: "Save to vault" }).click();
  await expect(page).toHaveURL(/\/vault\/[0-9a-f-]{36}$/);

  await page.goto("/vault");
  await page.getByLabel("Search the vault").fill("index");
  await expect(page).toHaveURL(/q=index/);
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Postgres indexing" })).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Search the vault")).toHaveValue("index");
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(page.getByRole("article")).toHaveCount(2);

  await page.getByLabel("Filter by tag").selectOption("postgres");
  await expect(page.getByRole("article")).toHaveCount(1);
});
