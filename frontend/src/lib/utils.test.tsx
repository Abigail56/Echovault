import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { Highlight } from "@/components/ui/Highlight";
import { TagInput } from "@/components/ui/TagInput";
import { isUuid, timeAgo } from "@/lib/format";
import { safeNextPath } from "@/lib/forms";

describe("safeNextPath", () => {
  it("allows internal paths only", () => {
    expect(safeNextPath("/vault?tag=x")).toBe("/vault?tag=x");
    expect(safeNextPath("https://evil.example")).toBe("/dashboard");
    expect(safeNextPath("//evil.example")).toBe("/dashboard");
    expect(safeNextPath("/\\evil.example")).toBe("/dashboard");
    expect(safeNextPath(undefined)).toBe("/dashboard");
  });
});

describe("format helpers", () => {
  it("formats relative times", () => {
    const now = new Date("2026-01-10T12:00:00Z");
    expect(timeAgo("2026-01-10T11:59:30Z", now)).toBe("just now");
    expect(timeAgo("2026-01-10T11:00:00Z", now)).toMatch(/1 hour ago/);
  });
  it("validates UUIDs", () => {
    expect(isUuid("76d8b552-33f0-44b0-9c28-93e6a1f479d9")).toBe(true);
    expect(isUuid("../etc")).toBe(false);
  });
});

describe("Highlight", () => {
  it("marks matching words without injecting HTML", () => {
    const { container } = render(<Highlight text="Use <b>GIN</b> indexes" query="gin" />);
    expect(container.querySelector("mark")?.textContent).toBe("GIN");
    expect(container.querySelector("b")).toBeNull();
    expect(container.textContent).toBe("Use <b>GIN</b> indexes");
  });
});

function TagHarness() {
  const [tags, setTags] = useState<string[]>(["existing"]);
  return (
    <>
      <TagInput value={tags} onChange={setTags} aria-describedby={undefined} />
      <output data-testid="tags">{tags.join(",")}</output>
    </>
  );
}

describe("TagInput", () => {
  it("adds normalised tags with Enter and comma, ignores duplicates, removes with Backspace", async () => {
    const user = userEvent.setup();
    render(<TagHarness />);
    const input = screen.getByPlaceholderText(/add a tag/i);
    await user.type(input, "  React {Enter}");
    await user.type(input, "react,");
    await user.type(input, "api,");
    expect(screen.getByTestId("tags")).toHaveTextContent("existing,react,api");
    await user.type(input, "{Backspace}");
    expect(screen.getByTestId("tags")).toHaveTextContent("existing,react");
    await user.click(screen.getByRole("button", { name: "Remove tag existing" }));
    expect(screen.getByTestId("tags")).toHaveTextContent(/^react$/);
  });
});
