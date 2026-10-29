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
