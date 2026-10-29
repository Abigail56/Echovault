import { expect, type Page, test } from "@playwright/test";

import { signUpViaApi } from "./helpers";

const text = (name: string, body = "hello") => ({ name, mimeType: "text/plain", buffer: Buffer.from(body) });
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==",
  "base64",
);

async function chooseFiles(page: Page, files: Parameters<Page["setInputFiles"]>[1]) {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Choose Files", exact: true }).click();
  await (await chooser).setFiles(files);
}

test.describe("Attachments on the New note page", () => {
  test.beforeEach(async ({ page }) => {
    await signUpViaApi(page);
    await page.goto("/vault/new");
  });

  test("pick, drop, remove and validate files before saving", async ({ page }) => {
    const staged = page.getByTestId("staged-file");

    // Choose Files opens the real file picker; several files at once.
    await chooseFiles(page, [text("agenda.md", "# Agenda"), { name: "shot.png", mimeType: "image/png", buffer: PNG }]);
    await expect(staged).toHaveCount(2);
    await expect(staged.filter({ hasText: "agenda.md" })).toContainText("MD");
    await expect(staged.filter({ hasText: "shot.png" }).locator("img")).toBeVisible(); // thumbnail

    // Choosing more keeps the earlier files; the same file twice is refused.
    await chooseFiles(page, [text("agenda.md", "# Agenda"), text("budget.csv", "a,b")]);
    await expect(staged).toHaveCount(3);
    await expect(page.getByRole("alert").filter({ hasText: "wasn't added" })).toContainText("agenda.md: Already added.");

    // Unsupported and oversized files are explained.
    await chooseFiles(page, [
      { name: "logo.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") },
      { name: "huge.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(10_000_001, 1) },
    ]);
    const alert = page.getByRole("alert").filter({ hasText: "weren't added" });
    await expect(alert).toContainText("logo.svg: This file type isn't supported.");
    await expect(alert).toContainText("huge.pdf: Too large");
    await expect(staged).toHaveCount(3);

    // Drag and drop from the computer.
    const dataTransfer = await page.evaluateHandle(() => {
      const dt = new DataTransfer();
      dt.items.add(new File(["dropped notes"], "dropped.txt", { type: "text/plain" }));
      return dt;
    });
    const zone = page.getByTestId("attachment-picker");
    await zone.dispatchEvent("dragenter", { dataTransfer });
    await expect(zone).toContainText("Drop to add these files");
    await zone.dispatchEvent("drop", { dataTransfer });
    await expect(staged).toHaveCount(4);

    // Remove one before saving.
    await page.getByRole("button", { name: "Remove budget.csv" }).click();
    await expect(staged).toHaveCount(3);
    await expect(staged.filter({ hasText: "budget.csv" })).toHaveCount(0);
  });

  test("save a note with attachments; they are still there after a refresh", async ({ page }) => {
    await page.getByLabel("Title").fill("Kickoff meeting");
    await page.locator("#knowledge-content").fill("Notes from the kickoff.");
    await chooseFiles(page, [text("minutes.txt", "Decided to launch in July"), text("actions.md", "- Book venue")]);
    await page.getByRole("button", { name: "Save to vault" }).click();

    await expect(page).toHaveURL(/\/vault\/[0-9a-f-]{36}$/);
    await expect(page.getByText("Saved to your vault with 2 attachments")).toBeVisible();
    await page.reload();
    const items = page.getByTestId("attachment-item");
    await expect(items).toHaveCount(2);
    await expect(items.filter({ hasText: "minutes.txt" }).getByText("Text extracted")).toBeVisible({ timeout: 15_000 });
  });

  test("text read from the files is put into the note automatically", async ({ page }) => {
    await page.getByLabel("Title").fill("Invoice");
    await page.locator("#knowledge-content").fill("Hosting invoice below.");
    await chooseFiles(page, [text("invoice.txt", "Northwind Hosting: 40 dollars per month")]);
    await expect(page.getByTestId("staged-file")).toContainText("Not uploaded yet");
    await expect(page.getByLabel(/Put the text from these files into the note/)).toBeChecked();
    await page.getByRole("button", { name: "Save to vault" }).click();

    await expect(page).toHaveURL(/\/vault\/[0-9a-f-]{36}/);
    const article = page.locator("article");
    await expect(article.getByRole("heading", { name: "From invoice.txt" })).toBeVisible({ timeout: 20_000 });
    await expect(article).toContainText("Northwind Hosting: 40 dollars per month");
    await expect(article).toContainText("Hosting invoice below.");
    await expect(page).toHaveURL(/\/vault\/[0-9a-f-]{36}$/); // the one-time instruction is removed
    // Refreshing doesn't add it twice.
    await page.reload();
    await expect(article.getByRole("heading", { name: "From invoice.txt" })).toHaveCount(1);
  });

  test("a failed upload keeps everything and retries without a duplicate note", async ({ page }) => {
    let failNext = true;
    await page.route("**/api/v1/knowledge/*/attachments", async (route) => {
      if (route.request().method() === "POST" && failNext) {
        failNext = false;
        return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Storage is busy" }) });
      }
      return route.continue();
    });

    await page.getByLabel("Title").fill("Retry test");
    await page.locator("#knowledge-content").fill("Keep me");
    await chooseFiles(page, [text("report.txt", "quarterly")]);
    await page.getByRole("button", { name: "Save to vault" }).click();

    await expect(page.getByText(/Your note was saved, but 1 file couldn't be uploaded/)).toBeVisible();
    await expect(page.getByTestId("staged-file")).toContainText("Storage is busy");
    await expect(page.getByLabel("Title")).toHaveValue("Retry test"); // nothing lost
    await expect(page.locator("#knowledge-content")).toHaveValue("Keep me");

    await page.getByRole("button", { name: "Retry upload" }).click();
    await expect(page).toHaveURL(/\/vault\/[0-9a-f-]{36}$/);
    await expect(page.getByTestId("attachment-item")).toContainText("report.txt");

    // Only one note was created.
    const list = await (await page.request.get("/api/v1/knowledge?q=Retry")).json();
    expect(list.total).toBe(1);
  });

  test("works on a phone without sideways scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.reload();
    await chooseFiles(page, [text(`${"a-very-long-file-name-".repeat(6)}.txt`)]);
    await expect(page.getByTestId("staged-file")).toHaveCount(1);
    const button = await page.getByRole("button", { name: "Choose Files", exact: true }).boundingBox();
    expect(button!.height).toBeGreaterThanOrEqual(44); // easy to tap
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
