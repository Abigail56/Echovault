import { expect, test } from "@playwright/test";

import { PASSWORD, signUpViaApi, uniqueEmail } from "./helpers";

test("register through the form and land on the dashboard", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Grace Hopper");
  await page.getByLabel("Email").fill(uniqueEmail("register"));
  await page.getByLabel("Password").fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Use at least 10 characters")).toBeVisible();

  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: /, Grace$/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Getting started" })).toBeVisible();
});

test("protected pages redirect to sign-in and return afterwards", async ({ page, browser }) => {
  const { email } = await signUpViaApi(page);

  const anonymous = await browser.newContext();
  const anonPage = await anonymous.newPage();
  await anonPage.goto("/vault");
  await expect(anonPage).toHaveURL(/\/login\?next=%2Fvault/);

  await anonPage.getByLabel("Email").fill(email);
  await anonPage.getByLabel("Password").fill("wrong password!");
  await anonPage.getByRole("button", { name: "Sign in" }).click();
  // (Next.js has its own hidden role="alert" route announcer, so filter by text.)
  await expect(anonPage.getByRole("alert").filter({ hasText: "Invalid email or password" })).toBeVisible();

  await anonPage.getByLabel("Password").fill(PASSWORD);
  await anonPage.getByRole("button", { name: "Sign in" }).click();
  await expect(anonPage).toHaveURL(/\/vault$/);
  await expect(anonPage.getByRole("heading", { name: "Knowledge Vault" })).toBeVisible();
  await anonymous.close();
});

test("signing out ends the session on the server", async ({ page }) => {
  await signUpViaApi(page);
  await page.goto("/dashboard");
  const sessionCookies = (await page.context().cookies()).filter((c) => c.name.startsWith("ev_"));

  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);

  // Even replaying the old cookies doesn't work: the session was revoked.
  await page.context().addCookies(sessionCookies);
  const me = await page.request.get("/api/v1/auth/me");
  expect(me.status()).toBe(401);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("expired session sends the user back to sign-in", async ({ page }) => {
  await signUpViaApi(page);
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /, Ada$/ })).toBeVisible();
  await page.context().clearCookies();
  await page.goto("/projects");
  await expect(page).toHaveURL(/\/login\?next=%2Fprojects/);
});
