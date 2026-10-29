import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { screenshotName } from "@/components/attachments/AttachmentPanel";
import { ExtractionBadge } from "@/components/attachments/ExtractionBadge";
import { titleFromFilename } from "@/components/attachments/ImportFilesButton";
import { formatBytes } from "@/lib/format";

describe("attachment helpers", () => {
  it("names pasted screenshots with the date and time", () => {
    const pasted = new File(["x"], "image.png", { type: "image/png" });
    expect(screenshotName(pasted, new Date(2026, 9, 29, 14, 5))).toBe("screenshot-2026-10-29-1405.png");
    const named = new File(["x"], "diagram.jpg", { type: "image/jpeg" });
    expect(screenshotName(named)).toBe("diagram.jpg");
  });

  it("turns file names into note titles", () => {
    expect(titleFromFilename("Q3-budget_final.pdf")).toBe("Q3 budget final");
    expect(titleFromFilename(".pdf")).toBe("Imported file");
  });

  it("formats sizes", () => {
    expect(formatBytes(820)).toBe("820 B");
    expect(formatBytes(14_200)).toBe("14 KB");
    expect(formatBytes(3_210_000)).toBe("3.2 MB");
    expect(formatBytes(200_000_000)).toBe("200 MB");
  });

  it("is honest about extraction status", () => {
    const { rerender } = render(<ExtractionBadge status="done" chars={0} />);
    expect(screen.getByText("No text found")).toBeInTheDocument();
    rerender(<ExtractionBadge status="done" chars={12} />);
    expect(screen.getByText("Text extracted")).toBeInTheDocument();
    rerender(<ExtractionBadge status="unavailable" chars={0} />);
    expect(screen.getByText("OCR not installed")).toBeInTheDocument();
    rerender(<ExtractionBadge status="pending" chars={0} />);
    expect(screen.getByText(/Reading text/)).toBeInTheDocument();
  });
});

describe("file rules", () => {
  const file = (name: string, size = 10) => new File([new Uint8Array(size)], name, { lastModified: 1 });

  it("accepts the supported formats", async () => {
    const { ACCEPT, validateFile } = await import("@/lib/attachments");
    for (const name of ["a.pdf", "a.DOCX", "a.doc", "a.txt", "a.md", "a.rtf", "a.csv", "a.xls", "a.xlsx", "a.ppt", "a.pptx", "a.png", "a.JPG", "a.jpeg", "a.webp", "a.gif"]) {
      expect(validateFile(file(name), 1000), name).toBeNull();
    }
    expect(ACCEPT).toContain(".pptx");
  });

  it("explains why a file is refused", async () => {
    const { validateFile } = await import("@/lib/attachments");
    expect(validateFile(file("logo.svg"), 1000)).toMatch(/isn't supported/);
    expect(validateFile(file("tool.exe"), 1000)).toMatch(/isn't supported/);
    expect(validateFile(file("noextension"), 1000)).toMatch(/isn't supported/);
    expect(validateFile(file("empty.pdf", 0), 1000)).toMatch(/empty/);
    expect(validateFile(file("big.pdf", 2_000_000), 1_000_000)).toBe("Too large (2.0 MB). The limit is 1.0 MB.");
  });

  it("groups files by family for icons and spots duplicates", async () => {
    const { familyOf, fileKey } = await import("@/lib/attachments");
    expect(familyOf("Budget.XLSX")).toBe("spreadsheet");
    expect(familyOf("deck.ppt")).toBe("presentation");
    expect(familyOf("shot.webp")).toBe("image");
    expect(familyOf("letter.rtf")).toBe("document");
    expect(fileKey(file("a.pdf"))).toBe(fileKey(file("a.pdf")));
    expect(fileKey(file("a.pdf"))).not.toBe(fileKey(file("a.pdf", 11)));
  });

  it("shows the unsupported status honestly", () => {
    render(<ExtractionBadge status="unsupported" chars={0} />);
    expect(screen.getByText("Stored (text not read)")).toBeInTheDocument();
  });
});
