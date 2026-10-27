import { expect, test } from "@playwright/test";

import { signUpViaApi } from "./helpers";

test.beforeEach(async ({ page }) => {
  await signUpViaApi(page);
});

test("create a project, link a note to it and change its status", async ({ page }) => {
  await page.goto("/projects/new");
  await page.getByLabel("Name").fill("Portfolio website");
  await page.getByLabel("Description").fill("A site to show my work.");
  await page.getByRole("button", { name: "Create project" }).click();

  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/);
  const projectUrl = page.url();
  await expect(page.getByRole("heading", { level: 1, name: "Portfolio website" })).toBeVisible();

  // "Add" from the project page pre-selects the project on the new note.
  await page.getByRole("region", { name: /^Knowledge/ }).getByRole("link", { name: "Add" }).click();
  await expect(page.getByRole("combobox", { name: /^Project/ })).toHaveValue(projectUrl.split("/").pop()!);
  await page.getByLabel("Title").fill("Hosting options");
  await page.getByRole("button", { name: "Save to vault" }).click();
  await expect(page.getByRole("link", { name: "Portfolio website" })).toBeVisible();

  await page.goto(projectUrl);
  await expect(page.getByRole("region", { name: "Knowledge (1)" }).getByRole("link", { name: "Hosting options" })).toBeVisible();

  await page.getByLabel("Change status").selectOption("on_hold");
  await expect(page.getByRole("status").filter({ hasText: "Status updated" })).toBeVisible();
  await page.goto("/projects?status=on_hold");
  await expect(page.getByRole("link", { name: "Portfolio website" })).toBeVisible();
  await page.goto("/projects?status=completed");
  await expect(page.getByRole("heading", { name: "No matching projects" })).toBeVisible();
});

test("record a decision and review its outcome later", async ({ page }) => {
  await page.goto("/decisions/new");
  await page.getByLabel("Title").fill("Use PostgreSQL");
  await page.getByRole("textbox", { name: /^Context/ }).fill("We need full-text search.");
  await page.getByRole("textbox", { name: /^Decision/ }).fill("Adopt PostgreSQL 17.");
  await page.getByRole("textbox", { name: /^Reasoning/ }).fill("Mature and free.");
  await page.getByRole("button", { name: "Save decision" }).click();

  await expect(page).toHaveURL(/\/decisions\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("region", { name: "Reasoning" })).toContainText("Mature and free.");
  await expect(page.getByRole("region", { name: "Actual outcome / review notes" })).toContainText("Not reviewed yet");

  await page.getByRole("button", { name: "Add review notes" }).click();
  await page.getByRole("textbox", { name: /^Actual outcome/ }).fill("Worked well; search is fast.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Decision updated" })).toBeVisible();

  await page.goto("/decisions");
  const card = page.getByRole("article").filter({ hasText: "Use PostgreSQL" });
  await expect(card.getByText("Reviewed")).toBeVisible();
});
