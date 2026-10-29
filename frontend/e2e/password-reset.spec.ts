import { expect, test } from "@playwright/test";

import { PASSWORD, signUpViaApi } from "./helpers";

// Needs a Mailpit inbox (started by ./dev.sh locally, and a service in CI):
//   E2E_SMTP_HOST=127.0.0.1 MAILPIT_API=http://127.0.0.1:8025/api/v1 npm run test:e2e
const MAILPIT = process.env.MAILPIT_API;

interface MailSummary {
  ID: string;
  To: { Address: string }[];
  Subject: string;
}

test.skip(!MAILPIT, "Set MAILPIT_API (and E2E_SMTP_HOST) to run email tests");

test("reset a forgotten password using the link from the email", async ({ page, request, browser }) => {
  const { email } = await signUpViaApi(page);
  const anonymous = await browser.newContext();
  const visitor = await anonymous.newPage();

  await visitor.goto("/forgot-password");
  await visitor.getByLabel("Email").fill(email);
  await visitor.getByRole("button", { name: "Send reset link" }).click();
  await expect(visitor.getByText(/If an account exists for that email/)).toBeVisible();

  // Read the email from the Mailpit inbox.
  let message: MailSummary | undefined;
  await expect
    .poll(async () => {
      const list = await (await request.get(`${MAILPIT}/messages`)).json();
      message = (list.messages as MailSummary[]).find((m) => m.To[0]?.Address === email);
      return Boolean(message);
    })
    .toBe(true);
  expect(message!.Subject).toBe("Reset your EchoVault Nexus password");
  const text: string = (await (await request.get(`${MAILPIT}/message/${message!.ID}`)).json()).Text;
  const link = new URL(text.match(/https?:\/\/\S+/)![0]);

  // Open the link (on the test server) and choose a new password.
  await visitor.goto(`${link.pathname}${link.search}`);
  await visitor.getByLabel("New password", { exact: true }).fill("a fresh new password");
  await visitor.getByLabel("Confirm new password").fill("a fresh new password");
  await visitor.getByRole("button", { name: "Set new password" }).click();
  await expect(visitor.getByText(/Your password has been changed/)).toBeVisible();

  const oldLogin = await request.post("/api/v1/auth/login", { data: { email, password: PASSWORD } });
  expect(oldLogin.status()).toBe(401);
  const newLogin = await request.post("/api/v1/auth/login", { data: { email, password: "a fresh new password" } });
  expect(newLogin.status()).toBe(200);
  await anonymous.close();
});
