import { expect, type Page } from "@playwright/test";

import { TERMS_VERSION } from "../src/lib/legal";

export const PASSWORD = "e2e test password";

let counter = 0;
export function uniqueEmail(prefix = "user"): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}@example.com`;
}

/**
 * Create an account through the API (faster than the UI). page.request shares
 * cookies with the browser, so the page is signed in afterwards.
 */
export async function signUpViaApi(page: Page, name = "Ada Lovelace", email = uniqueEmail()) {
  const response = await page.request.post("/api/v1/auth/register", {
    data: { email, password: PASSWORD, full_name: name, accept_terms: true, terms_version: TERMS_VERSION },
  });
  expect(response.status(), await response.text()).toBe(201);
  return { email, name };
}

async function csrfHeader(page: Page) {
  const cookie = (await page.context().cookies()).find((c) => c.name === "ev_csrf");
  if (!cookie) throw new Error("Not signed in: no ev_csrf cookie");
  return { "X-CSRF-Token": cookie.value };
}

/** POST to the API as the signed-in user (used to set up test data quickly). */
export async function apiPost<T = { id: string }>(page: Page, path: string, data: unknown): Promise<T> {
  const response = await page.request.post(`/api/v1${path}`, { data, headers: await csrfHeader(page) });
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()) as T;
}
