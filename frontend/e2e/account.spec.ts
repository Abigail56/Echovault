import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import { apiPost, PASSWORD, signUpViaApi, uniqueEmail } from "./helpers";

test("download a full data export from Settings", async ({ page }) => {
  await signUpViaApi(page);
  await apiPost(page, "/knowledge", { title: "Exported note", content: "body" });
  await apiPost(page, "/decisions", { title: "Exported decision" });

  await page.goto("/settings");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download my data" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^echovault-export-\d{4}-\d{2}-\d{2}\.json$/);
  const data = JSON.parse(await readFile((await file.path())!, "utf8"));
  expect(data.notes.map((n: { title: string }) => n.title)).toEqual(["Exported note"]);
  expect(data.decisions.map((d: { title: string }) => d.title)).toEqual(["Exported decision"]);
});

test("change the sign-in email from the profile page", async ({ page }) => {
  await signUpViaApi(page);
  const newEmail = uniqueEmail("moved");
  await page.goto("/profile");
  const form = page.locator("form").filter({ hasText: "Change email" });
  await form.getByLabel("New email").fill(newEmail);
  await form.getByLabel("Current password").fill("wrong password!");
  await form.getByRole("button", { name: "Change email" }).click();
  await expect(form.getByRole("alert")).toHaveText("Password is incorrect");

  await form.getByLabel("Current password").fill(PASSWORD);
  await form.getByRole("button", { name: "Change email" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Email address changed" })).toBeVisible();
  await expect(page.getByText(`currently ${newEmail}`)).toBeVisible();

  const login = await page.request.post("/api/v1/auth/login", { data: { email: newEmail, password: PASSWORD } });
  expect(login.status()).toBe(200);
});
