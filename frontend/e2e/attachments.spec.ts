import { expect, test } from "@playwright/test";

import { apiPost, signUpViaApi } from "./helpers";

test.describe("File and screenshot attachments", () => {
  test.beforeEach(async ({ page }) => {
    await signUpViaApi(page);
  });

  test("attach a file, read its text, add it to the note, find it in search", async ({ page }) => {
    const note = await apiPost(page, "/knowledge", { title: "Vendor research", content: "Comparing hosts." });
    await page.goto(`/vault/${note.id}`);

    await page.getByLabel("Choose files to attach").setInputFiles({
      name: "quote.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Northwind Hosting quote: 40 dollars per month"),
    });

    const item = page.getByTestId("attachment-item").filter({ hasText: "quote.txt" });
    await expect(item).toBeVisible();
    await expect(item.getByText("Text extracted")).toBeVisible({ timeout: 15_000 });

    await item.getByRole("button", { name: "View text" }).click();
    await expect(page.getByTestId("extracted-text")).toContainText("Northwind Hosting quote");
    await page.getByRole("button", { name: "Add to note" }).click();
    await expect(page.getByRole("heading", { name: "From quote.txt" })).toBeVisible();

    // The attachment text is searchable from the global search.
    await page.goto("/search?q=northwind");
    await expect(page.getByRole("link", { name: /Vendor research/ })).toBeVisible();
  });

  test("the Attach files button at the top of a note opens the file picker", async ({ page }) => {
    const note = await apiPost(page, "/knowledge", { title: "Screens", content: "" });
    await page.goto(`/vault/${note.id}`);
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Attach files" }).click();
    await (await chooser).setFiles({ name: "shot.txt", mimeType: "text/plain", buffer: Buffer.from("picked from a folder") });
    await expect(page.getByTestId("attachment-item")).toContainText("shot.txt");
    await page.screenshot({ path: "/tmp/claude-1000/-home-chinecherem-Documents-CAAPSTOON-APF-Echovault/f69ce720-952a-4ab0-8aa9-e7ebeb11bc33/scratchpad/shots/attach-button.png" });

    // The attachments box is also available while editing.
    await page.getByRole("button", { name: "Edit" }).click();
    await expect(page.getByRole("button", { name: "choose files", exact: true })).toBeVisible();
  });

  test("dangerous files are refused", async ({ page }) => {
    const note = await apiPost(page, "/knowledge", { title: "Safety", content: "" });
    await page.goto(`/vault/${note.id}`);
    await page.getByLabel("Choose files to attach").setInputFiles({
      name: "logo.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
    });
    await expect(page.getByText(/file type isn.t supported/)).toBeVisible();
    await expect(page.getByTestId("attachment-item")).toHaveCount(0);
  });

  test("delete an attachment", async ({ page }) => {
    const note = await apiPost(page, "/knowledge", { title: "Cleanup", content: "" });
    await page.goto(`/vault/${note.id}`);
    await page.getByLabel("Choose files to attach").setInputFiles({
      name: "old.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("old data"),
    });
    await expect(page.getByTestId("attachment-item")).toHaveCount(1);
    await page.getByRole("button", { name: "Delete old.txt" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByTestId("attachment-item")).toHaveCount(0);
  });

  test("import files from the vault creates one note per file", async ({ page }) => {
    // Visits two pages that the dev server may compile on first use.
    test.slow();
    await page.goto("/vault");
    await page.getByLabel("Choose files to import as notes").setInputFiles({
      name: "meeting-notes_june.md",
      mimeType: "text/markdown",
      buffer: Buffer.from("# June meeting\nAgreed to launch in July."),
    });
    await expect(page).toHaveURL(/\/vault\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 1, name: "meeting notes june" })).toBeVisible();
    await expect(page.getByTestId("attachment-item")).toContainText("meeting-notes_june.md");
  });
});
