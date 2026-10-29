import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmailLink } from "@/components/ui/EmailLink";

describe("EmailLink", () => {
  it("links a configured address with a subject", () => {
    render(<EmailLink address="help@example.com" subject="Privacy request" />);
    expect(screen.getByRole("link", { name: "help@example.com" })).toHaveAttribute("href", "mailto:help@example.com?subject=Privacy%20request");
  });

  it("never turns a placeholder into a broken link", () => {
    render(<EmailLink address="[Contact email address]" />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("[Contact email address]")).toBeInTheDocument();
  });
});
